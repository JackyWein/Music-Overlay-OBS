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
    // NEW: Pause tracking for auto-hide
    pauseStartTime: null,
    isWidgetHidden: false,
    pauseHideTimeout: null
};
