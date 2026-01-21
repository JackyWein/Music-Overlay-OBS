// Main Entry Point

document.addEventListener('DOMContentLoaded', () => {
    console.log("Overlay Loaded. Connecting...");
    connectWebsocket();

    // Initial scaling
    resizeWidget();

    // Responsive scaling
    window.addEventListener('resize', resizeWidget);
});
