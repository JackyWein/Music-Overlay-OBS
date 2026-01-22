// ============================================
// MUSIK-QUELLE AUSWAHL
// ============================================
// 'youtube-thch' - th-ch YouTube Music App (github.com/th-ch/youtube-music) [EMPFOHLEN]
// 'youtube'      - YouTube Music Desktop App (ytmdesktop.app)
// 'spotify'      - Native Spotify Integration (via setup.html)
// 'lastfm'       - Last.fm Scrobble Integration Extension
// 'vlc'          - VLC Media Player (HTTP Interface)
// 'foobar'       - foobar2000 (Beefweb Plugin)
// 'streamerbot'  - Streamerbot WebSocket Server
// 'auto'         - Automatische Erkennung (probiert alle Quellen)
const MUSIC_SOURCE = 'auto';

// ============================================
// TWITCH CHAT INTEGRATION
// ============================================
// Dein Twitch Kanal-Name (ohne #) für !song Befehl
// Leer lassen = Twitch Chat deaktiviert
const TWITCH_CHANNEL = '';  // z.B. 'dein_username'

// Befehle die das Widget aufwecken (case-insensitive)
// Standard: !song, !music, !np, !nowplaying
const TWITCH_COMMANDS = ['!song', '!music', '!np', '!nowplaying'];

// ============================================
// VERBINDUNGS-EINSTELLUNGEN
// ============================================
// YouTube Music Apps
const YOUTUBE_MUSIC_THCH_URL = 'http://localhost:26538'; // th-ch/youtube-music
const YOUTUBE_MUSIC_URL = 'http://localhost:9863';       // ytmdesktop.app

// Spotify (Spicetify WebNowPlaying)
const SPOTIFY_WS_URL = 'ws://localhost:8974/';

// VLC Media Player (HTTP Web Interface)
const VLC_URL = 'http://localhost:8080';
const VLC_PASSWORD = '';  // Das Passwort das du in VLC gesetzt hast

// foobar2000 (Beefweb Plugin)
const FOOBAR_URL = 'http://localhost:8880';

// Cider (Apple Music Client)
const CIDER_URL = 'http://localhost:10767';
const CIDER_API_TOKEN = '';  // Optional, leer lassen wenn Token deaktiviert

// Streamerbot
const STREAMERBOT_WS_URL = 'ws://127.0.0.1:8080/';

// ============================================
// POLLING INTERVALLE (in ms)
// ============================================
const YOUTUBE_POLL_INTERVAL = 1000;
const VLC_POLL_INTERVAL = 1000;
const FOOBAR_POLL_INTERVAL = 1000;
const CIDER_POLL_INTERVAL = 1000;

// Reconnect-Verzögerung bei Verbindungsverlust (in ms)
const RECONNECT_DELAY = 5000;

// ============================================
// OVERLAY-VERHALTEN
// ============================================
// Zeit bis die Pills sich verstecken (in ms) - Compact-Modus
const AUTO_HIDE_DURATION = 30000;

// Widget komplett verstecken wenn Musik stoppt/pausiert
const HIDE_ON_STOP = true;

// Zeit bis das Widget nach Pause/Stop komplett verschwindet (in ms)
const HIDE_ON_STOP_DELAY = 30000;

// Widget auch verstecken während Musik läuft (erscheint wieder bei !song)
// Wenn true: Widget verschwindet komplett nach AUTO_HIDE_WHILE_PLAYING_DELAY
// Wenn false: Widget bleibt sichtbar (im Compact-Modus) solange Musik läuft
const AUTO_HIDE_WHILE_PLAYING = false;

// Zeit bis das Widget bei laufender Musik komplett verschwindet (in ms)
const AUTO_HIDE_WHILE_PLAYING_DELAY = 60000;  // 60 Sekunden

// Widget komplett verstecken (manueller Override)
// Setzt auf true um das Overlay komplett auszublenden, auch wenn Musik läuft
const FORCE_HIDDEN = false;

// Physik-basierte Animationen aktivieren
const USE_PHYSICS_ANIMATION = true;

// Erlaubte Animationen (Liste der Effekte die zufällig ausgewählt werden)
// Verfügbar: 'Supernova', 'Disc Swap', 'Liquid Morph', '3D Flip', 'Hologram Glitch', 
//            'Portal Zoom', 'Cyber Construct', 'Nebula Implosion', 'Crystal Shatter', 'Spin Swap'
// Setze auf [] oder null für ALLE Animationen (Standard)
const ALLOWED_ANIMATIONS = [
    // 'Supernova', 
    // 'Disc Swap',
    // ... hier deine Favoriten eintragen
];

// ============================================
// ANPASSUNG & PERSONALISIERUNG
// ============================================
// Geschwindigkeit der Text-Laufschrift (in Sekunden)
// Kleinerer Wert = Schneller, Größerer Wert = Langsamer
const SCROLL_SPEED_TITLE = 12;
const SCROLL_SPEED_ARTIST = 15;
const SCROLL_SPEED_ALBUM = 10;

// Standard-Text wenn keine Musik läuft oder keine Infos da sind
const DEFAULT_TITLE = 'Warte auf Musik...';
const DEFAULT_ARTIST = '';
const DEFAULT_ALBUM = '';

// Cover-Bild im "Pause"-Modus grau anzeigen?
// true = Cover wird grau und dunkel (Standard)
// false = Cover bleibt farbig (nur Animation stoppt)
const GRAYSCALE_ON_PAUSE = true;

// Leucht-Effekte (Glow) aktivieren?
// Deaktivieren für mehr Performance auf langsamen PCs
const ENABLE_GLOW_EFFECTS = true;

// ============================================
// LAYOUT & SICHTBARKEIT
// ============================================
// Album-Cover (in der Mitte) anzeigen?
// true = Cover wird angezeigt (Standard)
// false = Cover ausgeblendet (Pillen rücken zusammen)
const SHOW_COVER = true;

// Linke Pille (Zeit / Album) anzeigen?
const SHOW_LEFT_PILL = true;

// Rechte Pille (Titel / Artist) anzeigen?
const SHOW_RIGHT_PILL = true;

// ============================================
// FORTSCHRITTS-ANZEIGE
// ============================================
// Progress Bar (Ring um das Cover) anzeigen?
const SHOW_PROGRESS_RING = true;

// Zeitleiste (z.B. 1:23 / 3:45) anzeigen?
const SHOW_TIME_DISPLAY = true;

// ============================================
// DEBUG-MODUS
// ============================================
// Zeigt zusätzliche Informationen in der Konsole
const DEBUG_MODE = false;
