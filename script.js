// ========== DOM Elements ==========
const widgetWrapper = document.getElementById('widget-wrapper');
const coverWrapper = document.getElementById('cover-wrapper');
const coverImg = document.getElementById('cover');
const coverPlaceholder = document.getElementById('cover-placeholder');
const playtimeEl = document.getElementById('playtime');
const albumEl = document.getElementById('album');
const titleEl = document.getElementById('title');
const titleMarquee = document.getElementById('title-marquee');
const titleContainer = document.getElementById('title-container');
const artistEl = document.getElementById('artist');
const progressRing = document.getElementById('progress-ring');

// ========== State ==========
let hideTimer = null;
let isVisible = false;
let currentProgress = 0;
const AUTO_HIDE_DELAY = 60000; // 60 Sekunden

// Lokaler Timer für Progress-Interpolation
let localTimerInterval = null;
let currentPositionMs = 0;
let currentDurationMs = 0;
let isPlaying = true;
let lastUpdateTime = 0;

// ========== Progress Ring Setup ==========
function setupProgressRing() {
    const size = 140; // Increased to prevent clipping
    const center = size / 2;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;

    progressRing.setAttribute('viewBox', `0 0 ${size} ${size}`);
    progressRing.innerHTML = `
        <circle class="progress-track" 
            cx="${center}" cy="${center}" r="${radius}" />
        <circle id="progress-path" class="progress-bar" 
            cx="${center}" cy="${center}" r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference}"
            transform="rotate(-90 ${center} ${center})" />
        <circle id="progress-dot" class="progress-dot" 
            cx="${center}" cy="${center - radius}" r="5">
            <animate attributeName="r" values="4;6;4" dur="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0.6;1" dur="1s" repeatCount="indefinite"/>
        </circle>
    `;

    updateProgressRing(currentProgress);
}

function updateProgressRing(progress) {
    const progressPath = document.getElementById('progress-path');
    const progressDot = document.getElementById('progress-dot');
    if (!progressPath) return;

    const radius = 46;
    const center = 70; // Updated center for 140px container
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    progressPath.style.strokeDashoffset = offset;

    // Positioniere den Punkt am Ende der Progress-Linie
    if (progressDot && progress > 0.01) {
        const angleDeg = progress * 360 - 90;
        const angleRad = angleDeg * (Math.PI / 180);
        const x = center + radius * Math.cos(angleRad);
        const y = center + radius * Math.sin(angleRad);
        progressDot.setAttribute('cx', x);
        progressDot.setAttribute('cy', y);
        progressDot.style.display = 'block';
    } else if (progressDot) {
        progressDot.style.display = 'none';
    }
}

// ========== Time Formatting ==========
function formatTime(ms) {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Stunden berechnen
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}:${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ========== Lokaler Timer für flüssige Progress-Updates ==========
function startLocalTimer() {
    if (localTimerInterval) {
        clearInterval(localTimerInterval);
    }

    localTimerInterval = setInterval(() => {
        if (!isPlaying || currentDurationMs <= 0) return;

        currentPositionMs += 1000;

        if (currentPositionMs > currentDurationMs) {
            currentPositionMs = currentDurationMs;
        }

        updateTimeDisplay();
        updateProgressFromLocal();
    }, 1000);
}

function stopLocalTimer() {
    if (localTimerInterval) {
        clearInterval(localTimerInterval);
        localTimerInterval = null;
    }
}

function updateTimeDisplay() {
    playtimeEl.textContent = `${formatTime(currentPositionMs)} / ${formatTime(currentDurationMs)}`;
}

function updateProgressFromLocal() {
    if (currentDurationMs > 0) {
        currentProgress = currentPositionMs / currentDurationMs;
        updateProgressRing(currentProgress);
    }
}

// ========== Marquee Check ==========
function checkMarquee() {
    const titleSpan = titleMarquee.querySelector('#title') || titleMarquee.querySelector('span');
    if (!titleSpan) return;

    const containerWidth = titleContainer.offsetWidth;
    const textWidth = titleSpan.scrollWidth;

    if (textWidth <= containerWidth && containerWidth > 0) {
        titleMarquee.classList.add('no-scroll');
    } else {
        titleMarquee.classList.remove('no-scroll');
    }
}

// ========== Show/Hide Widget ==========
function showWidget() {
    if (!isVisible) {
        widgetWrapper.classList.remove('hiding');
        widgetWrapper.classList.add('visible');
        isVisible = true;

        setTimeout(setupProgressRing, 100);
    }

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideWidget, AUTO_HIDE_DELAY);
}

function hideWidget() {
    widgetWrapper.classList.add('hiding');
    widgetWrapper.classList.remove('visible');
    isVisible = false;
    stopLocalTimer();
}

// ========== Update Widget ==========
let lastSongId = "";
let isAnimating = false;

function updateWidget(data) {
    const newTitle = data.title || 'Unknown Title';
    const newArtist = data.artist || 'Unknown Artist';
    const currentSongId = newTitle + newArtist;

    // Check for song change
    if (lastSongId && currentSongId !== lastSongId && !isAnimating) {
        // === ANIMAITON SEQUENCE ===
        isAnimating = true;

        const leftPill = document.getElementById('left-pill');
        const rightPill = document.getElementById('right-pill');
        const coverWrapper = document.getElementById('cover-wrapper');

        // 1. Pills Retract
        leftPill.classList.add('retracted');
        rightPill.classList.add('retracted');

        // Stop spinning to allow transform transition
        coverWrapper.classList.remove('spinning');

        setTimeout(() => {
            // 2. Cover Exit Up
            coverWrapper.classList.add('exit-up');

            // Wait for exit to finish
            setTimeout(() => {
                // 3. Update Content (Hidden)
                updateContent(data);
                lastSongId = currentSongId;

                // 4. Prepare Entry (Move to bottom instantly)
                coverWrapper.classList.remove('exit-up');
                coverWrapper.classList.add('enter-bottom');

                // Force reflow
                void coverWrapper.offsetWidth;

                // 5. Cover Enter (Slide Up)
                setTimeout(() => {
                    coverWrapper.classList.remove('enter-bottom');
                    coverWrapper.classList.add('slide-in');

                    // 6. Pills Expand
                    setTimeout(() => {
                        leftPill.classList.remove('retracted');
                        rightPill.classList.remove('retracted');

                        // Start auto-hide timer after expanding
                        resetPillAutoHide();

                        // Cleanup transitions
                        setTimeout(() => {
                            coverWrapper.classList.remove('slide-in');
                            // Restore spinning if playing
                            if (isPlaying) {
                                coverWrapper.classList.add('spinning');
                            }
                            isAnimating = false;
                        }, 600);
                    }, 400); // Slight overlap with cover entry
                }, 50);

            }, 500); // Match CSS transition time
        }, 500); // Wait for pills to retract
    }
    else if (!isAnimating) {
        // Standard Update (no transition)
        updateContent(data);

        // Initial Load (First time setting song ID)
        if (!lastSongId) {
            lastSongId = currentSongId;
            // Also trigger auto hide on first load/refresh
            const leftPill = document.getElementById('left-pill');
            const rightPill = document.getElementById('right-pill');
            leftPill.classList.remove('retracted');
            rightPill.classList.remove('retracted');
            resetPillAutoHide();
        }
        else {
            lastSongId = currentSongId;
        }

        // If triggered via command (!song), show pills and restart timer
        if (data.trigger === 'command') {
            const leftPill = document.getElementById('left-pill');
            const rightPill = document.getElementById('right-pill');

            // Should be visible
            leftPill.classList.remove('retracted');
            rightPill.classList.remove('retracted');
            resetPillAutoHide();
        }
    }
}

// ========== Auto Hide Logic ==========
let pillHideTimer = null; // This is for the pill auto-hide
const autoHideDuration = 10000; // 10 Seconds

function resetPillAutoHide() {
    // Stop existing timer
    if (pillHideTimer) clearTimeout(pillHideTimer);

    // Ensure pills are visible (if not already handled by animation)
    // Note: In animation sequence, we remove 'retracted' manually.

    // Start new timer
    pillHideTimer = setTimeout(() => {
        const leftPill = document.getElementById('left-pill');
        const rightPill = document.getElementById('right-pill');

        if (leftPill && rightPill) {
            leftPill.classList.add('retracted');
            rightPill.classList.add('retracted');
        }
    }, autoHideDuration);
}

function updateContent(data) {
    // Cover
    if (data.cover && data.cover.startsWith('http')) {
        coverImg.src = data.cover;
        coverImg.style.display = 'block';
        coverPlaceholder.style.display = 'none';
        // Reset animation on new img load? Browsers handle src change efficiently
    } else {
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
    }

    // Titel
    const newTitle = data.title || 'Unknown Title';
    titleMarquee.classList.remove('scrolling');
    titleMarquee.innerHTML = `<span id="title">${newTitle}</span>`;
    setTimeout(checkMarquee, 300);

    // Artist
    artistEl.textContent = data.artist || 'Unknown Artist';

    // Album
    albumEl.textContent = data.album || data.artist || '';

    // Playtime
    let position = data.positionMs || data.position || 0;
    let duration = data.durationMs || data.duration || 0;

    if (data.currentTime && data.totalTime) {
        const parseTime = (str) => {
            const parts = str.split(':').map(p => parseInt(p));
            if (parts.length === 3) {
                // H:MM:SS
                return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            }
            // MM:SS
            return (parts[0] * 60 + parts[1]) * 1000;
        };
        position = parseTime(data.currentTime);
        duration = parseTime(data.totalTime);
    }

    currentPositionMs = position;
    currentDurationMs = duration;
    lastUpdateTime = Date.now();

    if (data.progress !== undefined) {
        currentProgress = data.progress;
        currentPositionMs = currentProgress * duration;
    } else if (duration > 0) {
        currentProgress = position / duration;
    }

    updateTimeDisplay();
    updateProgressRing(currentProgress);

    // Spinning und Timer
    const isPausedValue = data.isPaused === true || data.isPaused === 'true' || data.isPaused === 1;
    const isPlayingValue = data.isPlaying === true || data.isPlaying === 'true' || data.isPlaying === 1;

    if (isPausedValue || data.isPlaying === false) {
        coverWrapper.classList.add('paused');
        isPlaying = false;
        stopLocalTimer();
    } else if (isPlayingValue || data.isPaused === false) {
        coverWrapper.classList.remove('paused');
        isPlaying = true;
        startLocalTimer();
    } else if (!localTimerInterval) {
        isPlaying = true;
        startLocalTimer();
    }

    showWidget();
}

// ========== WebSocket Connection ==========
const ws = new WebSocket('ws://127.0.0.1:8080/');

ws.onopen = function () {
    console.log('Connected to WebSocket');

    // Feedback for the user
    showWidget();
    titleEl.textContent = "Waiting for music...";
    artistEl.textContent = "Connected to Streamer.bot";

    ws.send(JSON.stringify({
        request: 'Subscribe',
        events: { General: ['Custom'] },
        id: 'MusicOverlaySub'
    }));
};

ws.onmessage = function (event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Received:', data); // Global logging for debugging

        // Try to find music data in various formats
        let musicData = null;

        // 1. Raw JSON Broadcast (from CPH.WebsocketBroadcastJson)
        if (data.name === 'MusicUpdate') {
            musicData = data;
        }
        // 2. Standard Streamer.bot Event (Legacy/Standard)
        else if (data.event && data.event.source === 'Custom' && data.data) {
            const customData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
            if (customData.name === 'MusicUpdate') {
                musicData = customData;
            }
        }
        // 3. Nested Data structure (some versions)
        else if (data.data && data.data.name === 'MusicUpdate') {
            musicData = data.data;
        }

        if (musicData) {
            updateWidget(musicData);
        } else {
            console.log('Ignored message (not a music update):', data);
        }

    } catch (e) {
        console.error('Error parsing message:', e, event.data);
    }
};

ws.onerror = function (error) {
    console.error('WebSocket Error:', error);
    showWidget();
    titleEl.textContent = "Connection Error";
    artistEl.textContent = "Check Console/Bot";
};

ws.onclose = function () {
    console.log('WebSocket closed');
    showWidget();
    titleEl.textContent = "Disconnected";
    artistEl.textContent = "Is Streamer.bot running?";
};
