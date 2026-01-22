// Spotify Native Connector (Uses Setup Page Credentials)
// Manages Token Refresh & Polling via localStorage data

const SpotifyConnector = {
    clientId: null,
    clientSecret: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiration: 0,
    pollInterval: null,
    callback: null,

    init: function () {
        this.clientId = localStorage.getItem('spotify_client_id');
        this.clientSecret = localStorage.getItem('spotify_client_secret');
        this.refreshToken = localStorage.getItem('spotify_refresh_token');
    },

    checkAvailability: function () {
        this.init();
        // Available if we have tokens (Setup was run)
        return Promise.resolve(!!this.refreshToken);
    },

    connect: function (callback) {
        this.callback = callback;
        console.log('[Spotify Native] Starting...');

        if (this.refreshToken) {
            this.updateStatus('Reconnecting to Spotify...');
            this.startPolling();
        } else {
            console.warn('[Spotify Native] No tokens found. Please run setup.html');
            this.updateStatus('Setup required (run setup.html)');
        }
    },

    // --- Token Refresh ---
    getAccessToken: async function () {
        if (this.accessToken && Date.now() < this.tokenExpiration) return this.accessToken;
        if (!this.refreshToken) return null;

        try {
            const body = new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken
            });

            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            // Basic Auth (Standard Flow)
            if (this.clientSecret) {
                headers['Authorization'] = 'Basic ' + btoa(this.clientId + ':' + this.clientSecret);
            } else {
                body.append('client_id', this.clientId);
            }

            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: headers,
                body: body
            });

            const data = await response.json();

            if (data.error) {
                if (data.error === 'invalid_grant') {
                    console.error('[Spotify Native] Refresh token invalid. Please re-run setup.html');
                    this.updateStatus('Auth Expired - Run Setup');
                    localStorage.removeItem('spotify_refresh_token');
                    this.refreshToken = null;
                }
                throw new Error(data.error);
            }

            this.saveTokens(data);
            return this.accessToken;
        } catch (e) {
            console.error('[Spotify Native] Token Refresh Error:', e);
            return null;
        }
    },

    saveTokens: function (data) {
        this.accessToken = data.access_token;
        this.tokenExpiration = Date.now() + (data.expires_in * 1000) - 10000;
        if (data.refresh_token) {
            this.refreshToken = data.refresh_token;
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
        }
    },

    // --- Polling Logic ---
    startPolling: function () {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.fetchState();
        this.pollInterval = setInterval(() => this.fetchState(), 2000); // 2s polling
    },

    fetchState: async function () {
        const token = await this.getAccessToken();
        if (!token) return;

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 204) {
                this.handleState(null);
                return;
            }

            // Handle Fatal Auth Errors
            if (response.status === 403 || response.status === 401) {
                console.error('[Spotify Native] Authorization failed (403/401). Stopping service.');
                this.updateStatus('Auth Failed - Check Setup');
                this.disconnect(); // Stop polling
                localStorage.removeItem('spotify_refresh_token'); // Clear invalid token
                this.refreshToken = null;
                return;
            }

            if (response.status === 429) return; // Rate limit

            // Safe JSON parsing
            const text = await response.text();
            try {
                const data = JSON.parse(text);
                this.handleState(data);
            } catch (e) {
                console.warn('[Spotify Native] Received non-JSON response:', text);
            }
        } catch (e) {
            console.error('[Spotify Native] Fetch error:', e);
        }
    },

    handleState: function (data) {
        let musicData = { name: 'MusicUpdate', source: 'spotify', isPlaying: false };

        if (data && data.item) {
            const track = data.item;
            const image = track.album.images.find(i => i.width > 200) || track.album.images[0];
            const artistNames = track.artists.map(a => a.name).join(', ');

            musicData = {
                name: 'MusicUpdate',
                source: 'spotify',
                trigger: 'poll',
                title: track.name,
                artist: artistNames,
                album: track.album.name,
                cover: image ? image.url : '',
                positionMs: data.progress_ms,
                durationMs: track.duration_ms,
                isPlaying: data.is_playing
            };
        }

        if (this.callback) this.callback(musicData);
    },

    updateStatus: function (msg) {
        if (typeof titleEl !== 'undefined') titleEl.textContent = msg;
    },

    disconnect: function () {
        if (this.pollInterval) clearInterval(this.pollInterval);
    }
};
