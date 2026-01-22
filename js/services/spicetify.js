// Spicetify Connector (Universal)
// Supports:
// 1. WebNowPlaying (Standard) -> ws://localhost:8974/
// 2. Spotify Playback API (Marketplace) -> wss://localhost:443/ (or ws)

const SpicetifyConnector = {
    ws: null,
    callback: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    currentTrack: {},
    activePort: null,
    activeProto: 'ws',

    // Define the candidates to check
    candidates: [
        { port: 8974, proto: 'ws' },  // Standard WebNowPlaying
        { port: 443, proto: 'wss' },  // New Extension (Secure)
        { port: 443, proto: 'ws' },   // New Extension (Insecure)
        { port: 5000, proto: 'ws' },  // Alternate?
        { port: 1234, proto: 'ws' }   // Alternate?
    ],

    checkAvailability: async function () {
        console.log('[Spicetify] Scanning for extensions...');

        for (const candidate of this.candidates) {
            console.log(`[Spicetify] Testing ${candidate.proto}://localhost:${candidate.port}...`);
            const isAvailable = await this.testConnection(candidate.port, candidate.proto);
            if (isAvailable) {
                this.activePort = candidate.port;
                this.activeProto = candidate.proto;
                console.log(`[Spicetify] Found service at ${this.activeProto}://localhost:${this.activePort}`);
                return true;
            }
        }
        return false;
    },

    testConnection: function (port, proto) {
        return new Promise((resolve) => {
            const url = `${proto}://localhost:${port}/`;
            let testWs;

            try {
                testWs = new WebSocket(url);
            } catch (e) {
                resolve(false);
                return;
            }

            const timeout = setTimeout(() => {
                if (testWs.readyState !== 1) { // Not OPEN
                    testWs.close();
                    resolve(false);
                }
            }, 1000); // 1s timeout

            testWs.onopen = () => {
                clearTimeout(timeout);
                testWs.close();
                resolve(true); // Success
            };

            testWs.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    },

    connect: function (callback) {
        this.callback = callback;
        if (!this.activePort) {
            console.error('[Spicetify] No active extension found.');
            this.updateStatus('Spicetify not found');
            return;
        }

        const url = `${this.activeProto}://localhost:${this.activePort}/`;
        console.log(`[Spicetify] Connecting to ${url}...`);
        this.updateStatus('Connecting to Spicetify...');
        this.createWebSocket(url);
    },

    createWebSocket: function (url) {
        if (this.ws) this.ws.close();

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log('[Spicetify] Connected!');
            this.reconnectAttempts = 0;
            this.updateStatus('Connected (Spicetify)');
            // Send Init for WebNowPlaying (others ignore it)
            this.ws.send('GETCurrentPlayer');
        };

        this.ws.onmessage = (event) => this.handleMessage(event.data);

        this.ws.onerror = (e) => console.error('[Spicetify] Connection Error:', e);

        this.ws.onclose = () => {
            console.log('[Spicetify] Closed');
            this.handleDisconnect();
        };
    },

    handleMessage: function (message) {
        if (!message) return;

        // Uncomment for debug:
        // console.log('[Spicetify RAW]:', message);

        // 1. Try JSON (New Extensions)
        try {
            if (message.startsWith('{') || message.trim().startsWith('{')) {
                const data = JSON.parse(message);
                this.parseJsonData(data);
                return;
            }
        } catch (e) { }

        // 2. Try Legacy Format (KEY:VALUE)
        if (typeof message === 'string' && message.includes(':')) {
            this.parseLegacyData(message);
        }
    },

    parseLegacyData: function (message) {
        const colonIndex = message.indexOf(':');
        if (colonIndex === -1) return;

        const key = message.substring(0, colonIndex).toUpperCase();
        const value = message.substring(colonIndex + 1);

        switch (key) {
            case 'TITLE': this.currentTrack.title = value; break;
            case 'ARTIST': this.currentTrack.artist = value; break;
            case 'ALBUM': this.currentTrack.album = value; break;
            case 'COVER': this.currentTrack.cover = value; break;
            case 'STATE': this.currentTrack.isPlaying = value === '1' || value === 'PLAYING'; break;
            case 'POSITION': this.currentTrack.positionMs = parseFloat(value) * 1000; break;
            case 'DURATION': this.currentTrack.durationMs = parseFloat(value) * 1000; break;
            case 'PLAYER': this.sendUpdate(); return;
        }
        this.debounceUpdate();
    },

    parseJsonData: function (data) {
        if (!data) return;

        // Mappings for various extensions
        this.currentTrack.title = data.title || data.track_name || data.name || this.currentTrack.title;
        this.currentTrack.artist = data.artist || data.artist_name || this.currentTrack.artist;
        this.currentTrack.album = data.album || data.album_name || this.currentTrack.album;
        this.currentTrack.cover = data.cover || data.image_url || data.album_art || this.currentTrack.cover;

        // Playing state
        if (data.hasOwnProperty('isPlaying')) this.currentTrack.isPlaying = data.isPlaying;
        else if (data.hasOwnProperty('is_playing')) this.currentTrack.isPlaying = data.is_playing;
        else if (data.hasOwnProperty('is_paused')) this.currentTrack.isPlaying = !data.is_paused;

        // Times
        if (data.progress) this.currentTrack.positionMs = data.progress;
        if (data.duration) this.currentTrack.durationMs = data.duration;

        this.debounceUpdate();
    },

    updateTimeout: null,
    debounceUpdate: function () {
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => this.sendUpdate(), 100);
    },

    sendUpdate: function () {
        const musicData = {
            name: 'MusicUpdate',
            source: 'spotify',
            title: this.currentTrack.title || '',
            artist: this.currentTrack.artist || '',
            album: this.currentTrack.album || '',
            cover: this.currentTrack.cover || '',
            positionMs: this.currentTrack.positionMs || 0,
            durationMs: this.currentTrack.durationMs || 0,
            isPlaying: this.currentTrack.isPlaying !== false
        };

        if (this.callback) this.callback(musicData);
    },

    handleDisconnect: function () {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                if (this.activePort) {
                    const url = `${this.activeProto}://localhost:${this.activePort}/`;
                    this.createWebSocket(url);
                }
            }, 2000);
        }
    },

    updateStatus: function (msg) {
        if (typeof titleEl !== 'undefined') titleEl.textContent = msg;
    },

    disconnect: function () {
        if (this.ws) this.ws.close();
    }
};
