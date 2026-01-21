// VLC Media Player Connector
// Connects via VLC's HTTP Web Interface
// Enable in VLC: Tools > Preferences > All > Interface > Main interfaces > Web
// Set password in: Interface > Main interfaces > Lua > Lua HTTP
// Depends on: config.js

const VLCConnector = {
    pollInterval: null,
    callback: null,
    lastState: null,

    // Prüfe ob VLC Web Interface läuft
    checkAvailability: function () {
        return new Promise((resolve) => {
            // VLC benötigt Basic Auth
            const headers = new Headers();
            headers.set('Authorization', 'Basic ' + btoa(':' + VLC_PASSWORD));

            fetch(`${VLC_URL}/requests/status.xml`, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(2000)
            })
                .then(response => {
                    resolve(response.ok);
                })
                .catch(() => {
                    resolve(false);
                });
        });
    },

    // Verbindung starten
    connect: function (callback) {
        this.callback = callback;
        console.log('[VLC] Connecting to VLC HTTP Interface...');
        this.startPolling();
    },

    // Polling starten
    startPolling: function () {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.fetchState();
        this.pollInterval = setInterval(() => this.fetchState(), VLC_POLL_INTERVAL || 1000);
    },

    // Status abrufen
    fetchState: async function () {
        try {
            const headers = new Headers();
            headers.set('Authorization', 'Basic ' + btoa(':' + VLC_PASSWORD));

            const response = await fetch(`${VLC_URL}/requests/status.xml`, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(3000)
            });

            if (!response.ok) throw new Error('VLC not available');

            const text = await response.text();
            this.parseStatusXML(text);

        } catch (error) {
            console.error('[VLC] Fetch error:', error.message);
            this.disconnect();
            if (typeof SourceManager !== 'undefined') {
                SourceManager.handleDisconnect('vlc');
            }
        }
    },

    // XML Status parsen
    parseStatusXML: function (xmlText) {
        try {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xmlText, 'text/xml');

            const state = xml.querySelector('state')?.textContent || 'stopped';
            const time = parseInt(xml.querySelector('time')?.textContent || '0');
            const length = parseInt(xml.querySelector('length')?.textContent || '0');

            // Meta-Informationen extrahieren
            let title = 'VLC';
            let artist = '';
            let album = '';
            let artworkUrl = '';

            const infoElements = xml.querySelectorAll('info');
            infoElements.forEach(info => {
                const name = info.getAttribute('name')?.toLowerCase();
                const value = info.textContent;

                if (name === 'title' || name === 'filename') title = value || title;
                if (name === 'artist') artist = value;
                if (name === 'album') album = value;
                if (name === 'artwork_url') artworkUrl = value;
            });

            // Fallback: Dateiname als Titel
            const filename = xml.querySelector('info[name="filename"]')?.textContent;
            if (!title || title === 'VLC') {
                title = filename || 'Unknown Track';
            }

            const musicData = {
                name: 'MusicUpdate',
                source: 'vlc',
                title: title,
                artist: artist || 'VLC Media Player',
                album: album,
                cover: artworkUrl,
                positionMs: time * 1000,
                durationMs: length * 1000,
                isPlaying: state === 'playing'
            };

            if (this.hasChanged(musicData)) {
                this.lastState = musicData;
                if (this.callback) {
                    this.callback(musicData);
                }
            }

        } catch (e) {
            console.error('[VLC] Parse error:', e);
        }
    },

    // Prüfe ob sich State geändert hat
    hasChanged: function (newData) {
        if (!this.lastState) return true;
        return (
            this.lastState.title !== newData.title ||
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
        console.log('[VLC] Disconnected');
    }
};
