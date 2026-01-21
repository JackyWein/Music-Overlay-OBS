// Main Entry Point
// Depends on: All other scripts loaded before this

document.addEventListener('DOMContentLoaded', () => {
    console.log("╔════════════════════════════════════════╗");
    console.log("║     Music Overlay - Multi-Source       ║");
    console.log("║  YouTube Music | Spotify | Streamerbot ║");
    console.log("╚════════════════════════════════════════╝");
    console.log("Source Mode:", MUSIC_SOURCE);

    // Initial scaling
    resizeWidget();

    // Responsive scaling
    window.addEventListener('resize', resizeWidget);

    // Starte Source Manager (ersetzt direkten WebSocket connect)
    if (typeof SourceManager !== 'undefined') {
        SourceManager.init();
    } else {
        // Fallback für alte Version
        console.warn("SourceManager not found, using legacy WebSocket");
        if (typeof connectWebsocket === 'function') {
            connectWebsocket();
        }
    }
});
