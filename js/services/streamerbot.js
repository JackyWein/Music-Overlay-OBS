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

            // --- DEBUG LOGGING ---
            // Uncomment to see every event (noisy!)
            // console.log('[Streamerbot] Raw Event:', data);

            // --- PARSING HELPER: Handle Stringified Payloads ---
            // Sometimes data.data from CPH.WebsocketBroadcastJson arrives as a string
            let payload = data;

            // If data has a 'data' property
            if (data.data) {
                // If it's a string, try to parse it
                if (typeof data.data === 'string') {
                    try {
                        payload = JSON.parse(data.data);
                    } catch (e) {
                        // If parsing fails, use original data.data (maybe it's just a string message)
                        payload = data.data;
                    }
                } else {
                    // It's already an object
                    payload = data.data;
                }
            }

            // --- CHECK FOR music_uncompact ---
            let isUncompact = false;

            // 1. Direct property
            if (data.event_name === 'music_uncompact' || data.event === 'music_uncompact') isUncompact = true;

            // 2. Property on payload object (most common for CPH Broadcasts)
            if (payload && (payload.event_name === 'music_uncompact' || payload.event === 'music_uncompact')) isUncompact = true;

            // 3. Nested in 'event' object if source is Custom (Standard SB Custom Event)
            if (data.event && data.event.source === 'Custom' && payload) {
                if (payload.event_name === 'music_uncompact' || payload.event === 'music_uncompact') isUncompact = true;
            }

            // 4. Check for 'trigger: command' in MusicUpdate (C# Broadcast)
            if (payload && payload.trigger === 'command') isUncompact = true;
            if (payload && payload.data && payload.data.trigger === 'command') isUncompact = true;

            if (isUncompact) {
                console.log('[Streamerbot] Received music_uncompact event - Waking up!');
                if (typeof wakeUpWidget === 'function') {
                    wakeUpWidget();
                } else if (typeof window.wakeUpWidget === 'function') {
                    window.wakeUpWidget();
                }
                return;
            }

            // --- MUSIC DATA PARSING ---
            let musicData = null;

            // Scenario A: Direct MusicUpdate (Legacy/Simple)
            if (data.name === 'MusicUpdate' || data.event === 'MusicUpdate') {
                musicData = data;
            }
            // Scenario B: Custom Event (Standard Streamer.bot)
            else if (data.event && data.event.source === 'Custom') {
                // Payload was already parsed above!
                if (payload && (payload.name === 'MusicUpdate' || payload.event === 'MusicUpdate')) {
                    musicData = payload;
                }
            }
            // Scenario C: Nested in data (Generic)
            else if (payload && (payload.name === 'MusicUpdate' || payload.event === 'MusicUpdate')) {
                musicData = payload;
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
