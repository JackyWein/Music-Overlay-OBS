// th-ch/youtube-music App Connector
// GitHub: https://github.com/th-ch/youtube-music
// Connects to: http://localhost:26538/api/v1/song-info (REST)
// Depends on: config.js

const YouTubeMusicThChConnector = {
    pollInterval: null,
    callback: null,
    lastState: null,

    // Prüfe ob th-ch YouTube Music App läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            // Versuche beide Endpoints (song-info und status)
            Promise.any([
                fetch(`${YOUTUBE_MUSIC_THCH_URL}/api/v1/song-info`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000)
                }).then(r => r.ok),
                fetch(`${YOUTUBE_MUSIC_THCH_URL}/api/v1/status`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000)
                }).then(r => r.ok)
            ])
                .then(() => resolve(true))
                .catch(() => resolve(false));
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[YouTube Music th-ch] Connecting...');

        this.updateStatus('Verbinde mit YouTube Music (th-ch)...');

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
            // Versuche song-info Endpoint
            let response = await fetch(`${YOUTUBE_MUSIC_THCH_URL}/api/v1/song-info`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            }).catch(() => null);

            // Fallback auf status Endpoint
            if (!response || !response.ok) {
                response = await fetch(`${YOUTUBE_MUSIC_THCH_URL}/api/v1/status`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000)
                });
            }

            if (!response || !response.ok) {
                throw new Error('API not available');
            }

            const data = await response.json();
            this.handleState(data);

        } catch (error) {
            console.error('[YouTube Music th-ch] Fetch error:', error.message);
            this.disconnect();
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('youtube-thch');
            }
        }
    },

    // State verarbeiten
    handleState: function (data) {
        // th-ch API response format kann variieren
        // Mögliche Formate:
        // { title, artist, album, imageSrc, isPaused, songDuration, elapsedSeconds }
        // oder
        // { player: { isPaused, ... }, track: { title, artist, album, thumbnail, duration } }

        let title, artist, album, cover, isPlaying, positionMs, durationMs;

        // Format 1: Direktes Format
        if (data.title !== undefined) {
            title = data.title || 'Kein Titel';
            artist = data.artist || 'Unbekannt';
            album = data.album || '';
            cover = data.imageSrc || data.thumbnail || data.cover || '';
            isPlaying = data.isPaused === false || data.isPlaying === true;
            positionMs = (data.elapsedSeconds || data.position || 0) * 1000;
            durationMs = (data.songDuration || data.duration || 0) * 1000;
        }
        // Format 2: Nested Format (player/track)
        else if (data.track) {
            const track = data.track;
            const player = data.player || {};

            title = track.title || 'Kein Titel';
            artist = track.artist || track.author || 'Unbekannt';
            album = track.album || '';
            cover = track.thumbnail || track.imageSrc || '';
            isPlaying = player.isPaused === false || player.isPlaying === true;
            positionMs = (player.elapsedSeconds || player.position || 0) * 1000;
            durationMs = (track.duration || track.songDuration || 0) * 1000;
        }
        // Format 3: Minimales Format
        else {
            title = data.name || data.videoTitle || 'Kein Titel';
            artist = data.author || data.channelName || 'Unbekannt';
            album = '';
            cover = data.thumbnail || '';
            isPlaying = !data.isPaused;
            positionMs = 0;
            durationMs = 0;
        }

        // Konvertiere zu einheitlichem Format
        const musicData = {
            name: 'MusicUpdate',
            source: 'youtube-thch',
            title: title,
            artist: artist,
            album: album,
            cover: cover,
            positionMs: Math.round(positionMs),
            durationMs: Math.round(durationMs),
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
            artistEl.textContent = 'YouTube Music (th-ch)';
        }
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.lastState = null;
        console.log('[YouTube Music th-ch] Disconnected');
    }
};
