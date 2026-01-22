// Last.fm Connector
// Uses the user.getRecentTracks API to check for currently playing music
// Requires LASTFM_API_KEY and LASTFM_USER in localStorage

const LastFmConnector = {
    apiKey: null,
    username: null,
    pollInterval: null,
    callback: null,
    checkInterval: 3000, // 3s polling for reasonable "live" feel

    init: function () {
        this.apiKey = localStorage.getItem('lastfm_api_key');
        this.username = localStorage.getItem('lastfm_username');
    },

    checkAvailability: function () {
        this.init();
        // Available if config is present
        return Promise.resolve(!!(this.apiKey && this.username));
    },

    connect: function (callback) {
        this.callback = callback;
        this.init(); // Reload config just in case

        if (!this.apiKey || !this.username) {
            console.error('[Last.fm] Missing credentials');
            this.updateStatus('Setup Required (Last.fm)');
            return;
        }

        console.log(`[Last.fm] Connecting for user: ${this.username}`);
        this.updateStatus('Connecting to Last.fm...');

        this.startPolling();
    },

    startPolling: function () {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.fetchTrack();
        this.pollInterval = setInterval(() => this.fetchTrack(), this.checkInterval);
    },

    fetchTrack: async function () {
        try {
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${this.username}&api_key=${this.apiKey}&format=json&limit=1`;

            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 403) {
                    console.error('[Last.fm] Invalid API Key');
                    this.updateStatus('Last.fm Error: Invalid Key');
                    this.disconnect();
                    return;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.handleData(data);
        } catch (e) {
            console.error('[Last.fm] Poll Error:', e);
            // Don't spam status with transient network errors
        }
    },

    handleData: function (data) {
        if (!data || !data.recenttracks || !data.recenttracks.track || data.recenttracks.track.length === 0) {
            return;
        }

        const track = data.recenttracks.track[0];

        // Check if "now playing" attribute exists and is true
        // Last.fm returns "@attr": { "nowplaying": "true" } for current songs
        const isNowPlaying = track['@attr'] && track['@attr'].nowplaying === 'true';

        // Get largest image
        const image = track.image.find(i => i.size === 'extralarge') || track.image.find(i => i.size === 'large') || track.image[0];

        const musicData = {
            name: 'MusicUpdate',
            source: 'lastfm',
            title: track.name,
            artist: track.artist['#text'],
            album: track.album['#text'],
            cover: image ? image['#text'] : '',
            // Last.fm doesn't provide live position/duration via this API
            // We simulate it or set to 0. 
            // Setting position to 0 and duration to 0 hides the progress bar usually, which is correct for Last.fm
            positionMs: 0,
            durationMs: 0,
            isPlaying: isNowPlaying
        };

        if (this.callback) this.callback(musicData);
    },

    updateStatus: function (msg) {
        if (typeof titleEl !== 'undefined') titleEl.textContent = msg;
    },

    disconnect: function () {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }
};
