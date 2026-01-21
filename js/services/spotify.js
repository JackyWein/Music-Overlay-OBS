// Spicetify WebNowPlaying Connector
// Connects to: ws://localhost:8974/
// Depends on: config.js

const SpotifyConnector = {
    ws: null,
    callback: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    currentTrack: {},

    // Prüfe ob Spicetify WebNowPlaying läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            const testWs = new WebSocket(SPOTIFY_WS_URL);
            const timeout = setTimeout(() => {
                testWs.close();
                resolve(false);
            }, 2000);

            testWs.onopen = () => {
                clearTimeout(timeout);
                testWs.close();
                resolve(true);
            };

            testWs.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[Spotify] Connecting to Spicetify WebNowPlaying...');

        this.updateStatus('Verbinde mit Spotify...');
        this.createWebSocket();
    },

    // WebSocket erstellen
    createWebSocket: function () {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(SPOTIFY_WS_URL);

        this.ws.onopen = () => {
            console.log('[Spotify] Connected to WebNowPlaying');
            this.reconnectAttempts = 0;
            this.updateStatus('Mit Spotify verbunden');

            // Request initial state
            this.ws.send('GETCurrentPlayer');
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
            console.error('[Spotify] WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('[Spotify] WebSocket closed');
            this.handleDisconnect();
        };
    },

    // Nachricht verarbeiten
    handleMessage: function (message) {
        // WebNowPlaying sendet Nachrichten im Format: "KEY:VALUE"
        // Beispiele:
        // TITLE:Song Name
        // ARTIST:Artist Name
        // ALBUM:Album Name
        // COVER:https://...
        // STATE:1 (playing) / 0 (paused)
        // POSITION:123 (seconds)
        // DURATION:240 (seconds)

        if (!message || typeof message !== 'string') return;

        const colonIndex = message.indexOf(':');
        if (colonIndex === -1) return;

        const key = message.substring(0, colonIndex).toUpperCase();
        const value = message.substring(colonIndex + 1);

        switch (key) {
            case 'TITLE':
                this.currentTrack.title = value;
                break;
            case 'ARTIST':
                this.currentTrack.artist = value;
                break;
            case 'ALBUM':
                this.currentTrack.album = value;
                break;
            case 'COVER':
                this.currentTrack.cover = value;
                break;
            case 'STATE':
                this.currentTrack.isPlaying = value === '1' || value === 'PLAYING';
                break;
            case 'POSITION':
                this.currentTrack.positionMs = parseFloat(value) * 1000;
                break;
            case 'DURATION':
                this.currentTrack.durationMs = parseFloat(value) * 1000;
                break;
            case 'PLAYER':
                // Vollständiger State empfangen - Update senden
                this.sendUpdate();
                return;
        }

        // Bei jedem Update den aktuellen State senden
        // (WebNowPlaying sendet Updates für jedes Feld einzeln)
        this.debounceUpdate();
    },

    // Debounced Update (sammelt Updates)
    updateTimeout: null,
    debounceUpdate: function () {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(() => {
            this.sendUpdate();
        }, 100);
    },

    // Update an Callback senden
    sendUpdate: function () {
        const musicData = {
            name: 'MusicUpdate',
            source: 'spotify',
            title: this.currentTrack.title || 'Kein Titel',
            artist: this.currentTrack.artist || 'Unbekannt',
            album: this.currentTrack.album || '',
            cover: this.currentTrack.cover || '',
            positionMs: this.currentTrack.positionMs || 0,
            durationMs: this.currentTrack.durationMs || 0,
            isPlaying: this.currentTrack.isPlaying !== false
        };

        if (this.callback) {
            this.callback(musicData);
        }
    },

    // Disconnect handling
    handleDisconnect: function () {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Spotify] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.createWebSocket(), RECONNECT_DELAY);
        } else {
            console.log('[Spotify] Max reconnect attempts reached');
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('spotify');
            }
        }
    },

    // Status-Update für UI
    updateStatus: function (message) {
        if (typeof titleEl !== 'undefined' && titleEl) {
            titleEl.textContent = message;
        }
        if (typeof artistEl !== 'undefined' && artistEl) {
            artistEl.textContent = 'Spotify';
        }
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.currentTrack = {};
        console.log('[Spotify] Disconnected');
    }
};
