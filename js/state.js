// Shared State management
const state = {
    isPlaying: true,
    currentProgress: 0,
    currentPositionMs: 0,
    currentDurationMs: 0,
    lastUpdateTime: 0,
    lastSongId: "",
    isAnimating: false,
    localTimerInterval: null,
    pillHideTimer: null,
    fullHideTimer: null,  // Timer für AUTO_HIDE_WHILE_PLAYING
    // Pause tracking for auto-hide
    pauseStartTime: null,
    isWidgetHidden: false,
    pauseHideTimeout: null
};
