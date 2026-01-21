// YouTube Music Desktop App Connector
// Connects to: http://localhost:9863/api/v1/state (REST) or WebSocket
// Depends on: config.js

const YouTubeMusicConnector = {
    pollInterval: null,
    callback: null,
    lastState: null,

    // Prüfe ob YouTube Music Desktop App läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            fetch(`${YOUTUBE_MUSIC_URL}/api/v1/state`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            })
                .then(response => {
                    if (response.ok) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                })
                .catch(() => {
                    resolve(false);
                });
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[YouTube Music] Connecting to YouTube Music Desktop App...');

        this.updateStatus('Verbinde mit YouTube Music...');

        // Starte Polling
        this.startPolling();
    },

    // REST API Polling
    startPolling: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        // Initial fetch
        this.fetchState();

        // Regelmäßiges Polling
        this.pollInterval = setInterval(() => {
            this.fetchState();
        }, YOUTUBE_POLL_INTERVAL);
    },

    // State abrufen
    fetchState: async function () {
        try {
            const response = await fetch(`${YOUTUBE_MUSIC_URL}/api/v1/state`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) {
                throw new Error('API not available');
            }

            const data = await response.json();
            this.handleState(data);

        } catch (error) {
            console.error('[YouTube Music] Fetch error:', error.message);
            this.disconnect();
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('youtube');
            }
        }
    },

    // State verarbeiten
    handleState: function (data) {
        // YouTube Music Desktop App State Format:
        // {
        //   player: { trackState: 0/1/2, videoProgress, volume, ... },
        //   video: { title, author, thumbnail, durationSeconds, ... }
        // }

        if (!data || !data.player) {
            return;
        }

        const player = data.player;
        const video = data.video || {};

        // trackState: 0 = paused, 1 = playing, 2 = buffering
        const isPlaying = player.trackState === 1;

        // Konvertiere zu einheitlichem Format
        const musicData = {
            name: 'MusicUpdate',
            source: 'youtube',
            title: video.title || 'Kein Titel',
            artist: video.author || 'Unbekannt',
            album: video.album || '',
            cover: this.getBestThumbnail(video.thumbnails),
            positionMs: Math.round((player.videoProgress || 0) * 1000),
            durationMs: Math.round((video.durationSeconds || 0) * 1000),
            isPlaying: isPlaying
        };

        // Nur senden wenn sich etwas geändert hat
        if (this.hasChanged(musicData)) {
            this.lastState = musicData;
            if (this.callback) {
                this.callback(musicData);
            }
        }
    },

    // Beste Thumbnail-URL finden
    getBestThumbnail: function (thumbnails) {
        if (!thumbnails || !Array.isArray(thumbnails) || thumbnails.length === 0) {
            return '';
        }

        // Sortiere nach Größe (größte zuerst) und nimm die erste
        const sorted = thumbnails.sort((a, b) => {
            const sizeA = (a.width || 0) * (a.height || 0);
            const sizeB = (b.width || 0) * (b.height || 0);
            return sizeB - sizeA;
        });

        return sorted[0].url || '';
    },

    // Prüfe ob sich der State geändert hat
    hasChanged: function (newData) {
        if (!this.lastState) return true;

        return (
            this.lastState.title !== newData.title ||
            this.lastState.artist !== newData.artist ||
            this.lastState.isPlaying !== newData.isPlaying ||
            Math.abs(this.lastState.positionMs - newData.positionMs) > 2000
        );
    },

    // Status-Update für UI
    updateStatus: function (message) {
        if (typeof titleEl !== 'undefined' && titleEl) {
            titleEl.textContent = message;
        }
        if (typeof artistEl !== 'undefined' && artistEl) {
            artistEl.textContent = 'YouTube Music';
        }
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.lastState = null;
        console.log('[YouTube Music] Disconnected');
    }
};
