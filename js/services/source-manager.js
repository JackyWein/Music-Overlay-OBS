// Source Manager - Zentraler Manager für alle Musik-Quellen
// Depends on: config.js, all connector files

const SourceManager = {
    activeSource: null,
    connectors: {},
    isConnecting: false,
    connectionAttempts: 0,
    maxAttempts: 3,
    twitchConnected: false,

    // Initialisierung
    init: function () {
        console.log('[SourceManager] Initializing with source:', MUSIC_SOURCE);

        // Registriere verfügbare Music Connectors
        this.connectors = {
            'youtube-thch': YouTubeMusicThChConnector, // th-ch App (bevorzugt)
            'youtube': YouTubeMusicConnector,          // ytmdesktop.app
            'spotify': SpotifyConnector,
            'cider': CiderConnector,                   // Cider (Apple Music)
            'vlc': VLCConnector,                       // VLC Media Player
            'foobar': Foobar2000Connector,             // foobar2000
            'streamerbot': StreamerbotConnector
        };

        // Starte Musik-Verbindung
        if (MUSIC_SOURCE === 'auto') {
            this.autoConnect();
        } else {
            this.connectToSource(MUSIC_SOURCE);
        }

        // Starte Twitch Chat (parallel, unabhängig von Musikquelle)
        this.initTwitchChat();
    },

    // Twitch Chat initialisieren (separat von Musikquellen)
    initTwitchChat: function () {
        if (typeof TwitchChatConnector !== 'undefined' && TWITCH_CHANNEL && TWITCH_CHANNEL.length > 0) {
            console.log('[SourceManager] Initializing Twitch Chat for #' + TWITCH_CHANNEL);
            TwitchChatConnector.connect((data) => {
                // Twitch Commands werden separat behandelt
                if (data.name === 'TwitchCommand') {
                    console.log('[SourceManager] Twitch command received:', data.command, 'from', data.user);
                    // Widget wird vom TwitchChatConnector selbst aufgeweckt
                }
            });
            this.twitchConnected = true;
        } else if (!TWITCH_CHANNEL || TWITCH_CHANNEL.length === 0) {
            console.log('[SourceManager] Twitch Chat disabled (no channel configured)');
        }
    },

    // Auto-Discovery: Probiere alle Quellen
    autoConnect: async function () {
        if (this.isConnecting) return;
        this.isConnecting = true;

        console.log('[SourceManager] Auto-discovery mode - trying all sources...');
        this.updateStatus('Suche Musik-Quellen...');

        // Reihenfolge: Streaming-Apps zuerst, dann Media Player
        const sources = ['youtube-thch', 'youtube', 'spotify', 'cider', 'vlc', 'foobar', 'streamerbot'];

        for (const source of sources) {
            console.log(`[SourceManager] Trying ${source}...`);

            const connector = this.connectors[source];
            if (!connector) continue;

            try {
                const available = await connector.checkAvailability();
                if (available) {
                    console.log(`[SourceManager] ✓ ${source} is available!`);
                    this.activeSource = source;
                    connector.connect(this.handleMusicData.bind(this));
                    this.isConnecting = false;
                    return;
                }
            } catch (e) {
                console.log(`[SourceManager] ✗ ${source} not available:`, e.message);
            }
        }

        // Keine Quelle gefunden - Retry
        console.log('[SourceManager] No source available. Retrying in', RECONNECT_DELAY, 'ms');
        this.updateStatus('Keine Musik-App gefunden');
        this.isConnecting = false;

        setTimeout(() => this.autoConnect(), RECONNECT_DELAY);
    },

    // Verbinde mit spezifischer Quelle
    connectToSource: function (source) {
        const connector = this.connectors[source];
        if (!connector) {
            console.error('[SourceManager] Unknown source:', source);
            return;
        }

        console.log(`[SourceManager] Connecting to ${source}...`);
        this.activeSource = source;
        connector.connect(this.handleMusicData.bind(this));
    },

    // Einheitliche Datenverarbeitung
    handleMusicData: function (data) {
        if (DEBUG_MODE) {
            console.log('[SourceManager] Received data from', data.source, ':', data);
        }

        // Rufe die bestehende updateWidget Funktion auf
        if (typeof updateWidget === 'function') {
            updateWidget(data);
        }
    },

    // Verbindung verloren - Reconnect
    handleDisconnect: function (source) {
        console.log(`[SourceManager] Disconnected from ${source}`);

        if (MUSIC_SOURCE === 'auto') {
            // Im Auto-Modus: Versuche andere Quellen
            this.activeSource = null;
            setTimeout(() => this.autoConnect(), RECONNECT_DELAY);
        } else {
            // Spezifische Quelle: Reconnect
            setTimeout(() => this.connectToSource(source), RECONNECT_DELAY);
        }
    },

    // Status-Update für UI
    updateStatus: function (message) {
        if (titleEl) titleEl.textContent = message;
        if (artistEl) artistEl.textContent = '';
    },

    // Aktuelle Quelle abrufen
    getActiveSource: function () {
        return this.activeSource;
    },

    // Twitch Status
    isTwitchConnected: function () {
        return this.twitchConnected && TwitchChatConnector && TwitchChatConnector.isConnected;
    }
};
