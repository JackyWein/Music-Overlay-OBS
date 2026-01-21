// Twitch Chat Connector
// Listens for !song command to trigger widget expansion
// Uses tmi.js for anonymous connection (no OAuth needed)
// Depends on: config.js

const TwitchChatConnector = {
    client: null,
    isConnected: false,

    // Prüfe ob Twitch Kanal konfiguriert ist
    checkAvailability: function () {
        return new Promise((resolve) => {
            // Twitch ist verfügbar wenn ein Kanal konfiguriert ist
            if (TWITCH_CHANNEL && TWITCH_CHANNEL.length > 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    },

    // Verbindung starten
    connect: function (callback) {
        console.log('[Twitch Chat] Connecting to channel:', TWITCH_CHANNEL);

        // Lade tmi.js dynamisch wenn nicht vorhanden
        if (typeof tmi === 'undefined') {
            this.loadTmiJs().then(() => {
                this.createClient(callback);
            }).catch(err => {
                console.error('[Twitch Chat] Failed to load tmi.js:', err);
            });
        } else {
            this.createClient(callback);
        }
    },

    // tmi.js laden
    loadTmiJs: function () {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/tmi.js@1.8.5/dist/tmi.min.js';
            script.onload = () => {
                console.log('[Twitch Chat] tmi.js loaded');
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // TMI Client erstellen
    createClient: function (callback) {
        // Anonyme Verbindung (nur lesen, kein OAuth nötig)
        this.client = new tmi.Client({
            connection: {
                secure: true,
                reconnect: true
            },
            channels: [TWITCH_CHANNEL]
        });

        this.client.on('connected', () => {
            console.log('[Twitch Chat] Connected to #' + TWITCH_CHANNEL);
            this.isConnected = true;
        });

        this.client.on('message', (channel, tags, message, self) => {
            this.handleMessage(channel, tags, message, callback);
        });

        this.client.on('disconnected', () => {
            console.log('[Twitch Chat] Disconnected');
            this.isConnected = false;
        });

        this.client.connect().catch(err => {
            console.error('[Twitch Chat] Connection error:', err);
        });
    },

    // Chat-Nachricht verarbeiten
    handleMessage: function (channel, tags, message, callback) {
        const msg = message.toLowerCase().trim();

        // !song Befehl erkennen
        if (msg === '!song' || msg === '!music' || msg === '!np' || msg === '!nowplaying') {
            console.log('[Twitch Chat] !song command from', tags['display-name']);

            // Trigger das Widget zum Aufwachen
            if (callback) {
                callback({
                    name: 'TwitchCommand',
                    trigger: 'command',
                    command: msg,
                    user: tags['display-name'] || tags.username,
                    channel: channel
                });
            }

            // Widget aufwecken (Pills zeigen)
            this.wakeUpWidget();
        }
    },

    // Widget aufwecken
    wakeUpWidget: function () {
        // Pills zeigen
        const leftPill = document.getElementById('left-pill');
        const rightPill = document.getElementById('right-pill');
        const centerCover = document.getElementById('center-cover');

        if (leftPill) leftPill.classList.remove('retracted');
        if (rightPill) rightPill.classList.remove('retracted');
        if (centerCover) centerCover.classList.remove('compact');

        // Auto-hide Timer zurücksetzen
        if (typeof resetPillAutoHide === 'function') {
            resetPillAutoHide();
        }

        console.log('[Twitch Chat] Widget woken up by chat command');
    },

    // Verbindung trennen
    disconnect: function () {
        if (this.client) {
            this.client.disconnect();
            this.client = null;
        }
        this.isConnected = false;
        console.log('[Twitch Chat] Disconnected');
    }
};
