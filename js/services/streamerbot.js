// Streamerbot WebSocket Connector
// Connects to: ws://127.0.0.1:8080/
// Depends on: config.js

const StreamerbotConnector = {
    ws: null,
    callback: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    // Prüfe ob Streamerbot WebSocket Server läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            const testWs = new WebSocket(STREAMERBOT_WS_URL);
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
        console.log('[Streamerbot] Connecting to Streamerbot WebSocket...');

        this.updateStatus('Verbinde mit Streamer.bot...');
        this.createWebSocket();
    },

    // WebSocket erstellen
    createWebSocket: function () {
        if (this.ws) {
            this.ws.close();
        }

        this.ws = new WebSocket(STREAMERBOT_WS_URL);

        this.ws.onopen = () => {
            console.log('[Streamerbot] Connected');
            this.reconnectAttempts = 0;
            this.updateStatus('Mit Streamer.bot verbunden');

            // Subscribe to events
            this.ws.send(JSON.stringify({
                request: 'Subscribe',
                events: {
                    General: ['Custom', 'Raw'],
                    Raw: ['Action', 'SubAction', 'ActionCode', 'General']
                },
                id: 'MusicOverlaySub'
            }));
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
            console.error('[Streamerbot] WebSocket error:', error);
            this.updateStatus('Verbindungsfehler');
        };

        this.ws.onclose = () => {
            console.log('[Streamerbot] WebSocket closed');
            this.handleDisconnect();
        };
    },

    // Nachricht verarbeiten
    handleMessage: function (rawData) {
        try {
            const data = JSON.parse(rawData);

            let musicData = null;

            // Direktes MusicUpdate Event
            if (data.name === 'MusicUpdate' || data.event === 'MusicUpdate') {
                musicData = data;
            }
            // Custom Event mit MusicUpdate
            else if (data.event && data.event.source === 'Custom' && data.data) {
                const customData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                if (customData.name === 'MusicUpdate' || customData.event === 'MusicUpdate') {
                    musicData = customData;
                }
            }
            // Nested data
            else if (data.data && (data.data.name === 'MusicUpdate' || data.data.event === 'MusicUpdate')) {
                musicData = data.data;
            }

            if (musicData) {
                // Konvertiere zu einheitlichem Format
                const normalizedData = {
                    name: 'MusicUpdate',
                    source: 'streamerbot',
                    trigger: musicData.trigger || null,
                    title: musicData.title || 'Kein Titel',
                    artist: musicData.artist || 'Unbekannt',
                    album: musicData.album || '',
                    cover: musicData.cover || '',
                    positionMs: musicData.positionMs || musicData.position || 0,
                    durationMs: musicData.durationMs || musicData.duration || 0,
                    isPlaying: musicData.isPlaying !== false && musicData.isPaused !== true
                };

                if (this.callback) {
                    this.callback(normalizedData);
                }
            }

        } catch (e) {
            console.error('[Streamerbot] Error parsing message:', e, rawData);
        }
    },

    // Disconnect handling
    handleDisconnect: function () {
        this.updateStatus('Verbindung getrennt');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Streamerbot] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.createWebSocket(), RECONNECT_DELAY);
        } else {
            console.log('[Streamerbot] Max reconnect attempts reached');
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('streamerbot');
            }
        }
    },

    // Status-Update für UI
    updateStatus: function (message) {
        if (typeof titleEl !== 'undefined' && titleEl) {
            titleEl.textContent = message;
        }
        if (typeof artistEl !== 'undefined' && artistEl) {
            artistEl.textContent = 'Streamer.bot';
        }
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        console.log('[Streamerbot] Disconnected');
    }
};

// Legacy support: Die alte connectWebsocket Funktion
function connectWebsocket() {
    console.log('[Legacy] connectWebsocket called - redirecting to SourceManager');
    // Diese Funktion wird durch SourceManager ersetzt
    // Behalte für Rückwärtskompatibilität
    if (typeof SourceManager !== 'undefined') {
        SourceManager.init();
    }
}
