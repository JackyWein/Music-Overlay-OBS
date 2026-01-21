// Cider (Apple Music Client) Connector
// Connects to: http://localhost:10767/api/v1/playback/now-playing
// Download: https://cider.sh/
// Depends on: config.js

const CiderConnector = {
    pollInterval: null,
    callback: null,
    lastState: null,

    // Prüfe ob Cider läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            const headers = new Headers();
            if (CIDER_API_TOKEN) {
                headers.set('apitoken', CIDER_API_TOKEN);
            }

            fetch(`${CIDER_URL}/api/v1/playback/now-playing`, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(2000)
            })
                .then(response => resolve(response.ok))
                .catch(() => resolve(false));
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[Cider] Connecting to Cider (Apple Music)...');
        this.startPolling();
    },

    // Polling starten
    startPolling: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.fetchState();
        this.pollInterval = setInterval(() => this.fetchState(), CIDER_POLL_INTERVAL || 1000);
    },

    // Status abrufen
    fetchState: async function () {
        try {
            const headers = new Headers();
            if (CIDER_API_TOKEN) {
                headers.set('apitoken', CIDER_API_TOKEN);
            }

            const response = await fetch(`${CIDER_URL}/api/v1/playback/now-playing`, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) throw new Error('Cider not available');

            const data = await response.json();
            this.handleState(data);

        } catch (error) {
            console.error('[Cider] Fetch error:', error.message);
            this.disconnect();
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('cider');
            }
        }
    },

    // State verarbeiten
    handleState: function (data) {
        // Cider gibt Apple Music API Format zurück
        // data.info enthält: name, artistName, albumName, artwork, durationInMillis
        // data.status enthält: currentPlaybackTime, isPlaying

        if (!data || !data.info) {
            return;
        }

        const info = data.info;
        const status = data.status || {};

        // Artwork URL konstruieren
        let artworkUrl = '';
        if (info.artwork && info.artwork.url) {
            // Apple Music artwork URLs haben {w} und {h} Platzhalter
            artworkUrl = info.artwork.url
                .replace('{w}', '500')
                .replace('{h}', '500');
        }

        const musicData = {
            name: 'MusicUpdate',
            source: 'cider',
            title: info.name || 'Unknown Title',
            artist: info.artistName || 'Unknown Artist',
            album: info.albumName || '',
            cover: artworkUrl,
            positionMs: Math.round((status.currentPlaybackTime || 0) * 1000),
            durationMs: info.durationInMillis || 0,
            isPlaying: status.isPlaying !== false
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
        console.log('[Cider] Disconnected');
    }
};
