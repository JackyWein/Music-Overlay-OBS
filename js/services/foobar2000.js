// foobar2000 Beefweb Connector
// Connects via Beefweb plugin HTTP API
// Install: foobar2000 > Preferences > Components > Install > Beefweb
// Depends on: config.js

const Foobar2000Connector = {
    pollInterval: null,
    callback: null,
    lastState: null,

    // Prüfe ob foobar2000 Beefweb läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            fetch(`${FOOBAR_URL}/api/player`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            })
                .then(response => resolve(response.ok))
                .catch(() => resolve(false));
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[foobar2000] Connecting to Beefweb API...');
        this.startPolling();
    },

    // Polling starten
    startPolling: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.fetchState();
        this.pollInterval = setInterval(() => this.fetchState(), FOOBAR_POLL_INTERVAL || 1000);
    },

    // Status abrufen
    fetchState: async function () {
        try {
            // Query player state und aktuellen Track
            const response = await fetch(
                `${FOOBAR_URL}/api/query?player=true&trcolumns=%25artist%25,%25title%25,%25album%25,%25length_seconds%25`,
                {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                }
            );

            if (!response.ok) throw new Error('Beefweb not available');

            const data = await response.json();
            this.handleState(data);

        } catch (error) {
            console.error('[foobar2000] Fetch error:', error.message);
            this.disconnect();
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('foobar');
            }
        }
    },

    // State verarbeiten
    handleState: function (data) {
        const player = data.player || {};
        const activeItem = player.activeItem || {};
        const columns = activeItem.columns || [];

        // Beefweb gibt Spalten in der Reihenfolge zurück wie angefragt
        // %artist%, %title%, %album%, %length_seconds%
        const artist = columns[0] || 'Unknown Artist';
        const title = columns[1] || 'Unknown Title';
        const album = columns[2] || '';
        const durationSeconds = parseFloat(columns[3]) || 0;

        // playbackState: "stopped", "playing", "paused"
        const isPlaying = player.playbackState === 'playing';
        const positionSeconds = player.playbackPosition || 0;

        // Artwork URL (Beefweb kann Artwork über separaten Endpoint liefern)
        let artworkUrl = '';
        if (activeItem.playlistId !== undefined && activeItem.index !== undefined) {
            artworkUrl = `${FOOBAR_URL}/api/artwork/${activeItem.playlistId}/${activeItem.index}`;
        }

        const musicData = {
            name: 'MusicUpdate',
            source: 'foobar',
            title: title,
            artist: artist,
            album: album,
            cover: artworkUrl,
            positionMs: Math.round(positionSeconds * 1000),
            durationMs: Math.round(durationSeconds * 1000),
            isPlaying: isPlaying
        };

        if (this.hasChanged(musicData)) {
            this.lastState = musicData;
            if (this.callback) {
                this.callback(musicData);
            }
        }
    },

    // Prüfe ob sich State geändert hat
    hasChanged: function (newData) {
        if (!this.lastState) return true;
        return (
            this.lastState.title !== newData.title ||
            this.lastState.artist !== newData.artist ||
            this.lastState.isPlaying !== newData.isPlaying ||
            Math.abs(this.lastState.positionMs - newData.positionMs) > 2000
        );
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.lastState = null;
        console.log('[foobar2000] Disconnected');
    }
};
