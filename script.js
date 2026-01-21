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
let currentProgress = 0;
// AUTO_HIDE_DELAY removed

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

    // Prevent re-creating elements if they already exist
    if (document.getElementById('progress-path')) return;

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
// ========== Show/Hide Widget ==========
// ========== Show/Hide Widget ==========
function showWidget() {
    widgetWrapper.classList.remove('hiding');
    widgetWrapper.classList.add('visible');
    setTimeout(setupProgressRing, 100);
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
                try {
                    updateContent(data);
                } catch (e) {
                    console.error("Error in updateContent during animation:", e);
                }

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

                        // Re-check overflow once visible/expanded
                        try {
                            // Trigger a re-measure of text widths now that we are visible
                            const evt = new CustomEvent('visibility-changed');
                            window.dispatchEvent(evt); // or direct call if simple

                            // Manual simple re-check
                            if (titleMarquee.scrollWidth > titleContainer.clientWidth) titleMarquee.classList.add('scrolling'); /* title uses 'scrolling'? check CSS */
                            /* Title CSS uses animation directly on #title-marquee w/ padding-left. NO specific class? 
                               Wait, Title logic in updateContent uses 'scrolling' class remove? 
                               Line 351: titleMarquee.classList.remove('scrolling');
                               But CSS has '#title-marquee' animation by default?
                               Let's check Title logic in a moment.
                            */
                        } catch (e) { }

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
const autoHideDuration = 30000; // 30 Seconds

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
        // Only update if src changed to avoid unnecessary re-loading/flickering
        if (coverImg.src !== data.cover) {
            coverImg.crossOrigin = "Anonymous"; // Allow canvas access
            coverImg.src = data.cover;
            coverImg.style.display = 'block';
            coverPlaceholder.style.display = 'none';

            // Extract color when image loads
            coverImg.onload = function () {
                try {
                    const dominantColor = getAverageColor(coverImg);
                    // Apply to pills with transparency
                    const leftPill = document.getElementById('left-pill');
                    const rightPill = document.getElementById('right-pill');

                    // 0.65 opacity for Gel Glass (vibrant color visibility)
                    const bgColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.65)`;

                    leftPill.style.backgroundColor = bgColor;
                    rightPill.style.backgroundColor = bgColor;

                    // Calculate Complementary Color using HSL
                    const hsl = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);

                    // Rotate Hue by 180 degrees for complementary color
                    const compHue = (hsl.h + 180) % 360;

                    // Boost Saturation/Lightness for readability/vibes
                    // 100% Saturation, 70% Lightness usually pops well on dark/colored backgrounds
                    const compColor = `hsl(${compHue}, 100%, 75%)`;

                    // Apply Complementary Color
                    // 1. Playtime Text
                    if (playtimeEl) playtimeEl.style.color = compColor;

                    // 2. Progress Bar (Stroke)
                    const progressPath = document.getElementById('progress-path');
                    if (progressPath) progressPath.style.stroke = compColor;

                    // 3. Progress Dot
                    const progressDot = document.getElementById('progress-dot');
                    if (progressDot) {
                        progressDot.style.fill = compColor;
                        // Glow matching the complementary color
                        progressDot.style.filter = `drop-shadow(0 0 8px ${compColor})`;
                    }
                } catch (e) {
                    console.warn("Color extraction failed (CORS?):", e);
                    // Fallback to default
                    resetPillColors();
                }
            };

            coverImg.onerror = function () {
                resetPillColors();
            }
        }
    } else {
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
        resetPillColors();
    }

    // Titel
    const newTitle = data.title || 'Unknown Title';
    titleMarquee.classList.remove('scrolling');
    titleMarquee.innerHTML = `<span id="title">${newTitle}</span>`;
    setTimeout(checkMarquee, 300);

    // Artist
    const newArtist = data.artist || 'Unknown Artist';
    if (artistEl.textContent !== newArtist) {
        artistEl.textContent = newArtist;
        // Overflow check handled by checkOverflows()
    }

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

    // ... existing paused/playing logic ...

    // Check overflows immediately if not animating (visible)
    // If animating, checkOverflows() is called by updateWidget AFTER expansion
    if (!isAnimating) {
        setTimeout(checkOverflows, 50);
    }
}

// ========== Overflow Checking Helper ==========
function checkOverflows() {
    // Title
    try {
        if (titleMarquee && titleContainer) {
            // Logic for title (CSS based on ID?)
            // The previous logic for Title was doing custom stuff. 
            // We'll stick to class toggling 'scroll' matching Artist approach for consistency if CSS supports it
            // NOTE: CSS for #title-marquee uses animation by default. 
            // We need to verify if we want to toggle it.
            // Current Title CSS: #title-marquee.no-scroll { padding-left: 0; animation: none; }
            // So default IS scrolling. We add 'no-scroll' if it fits.

            titleMarquee.classList.remove('no-scroll');
            void titleMarquee.offsetWidth;
            if (titleMarquee.scrollWidth <= titleContainer.clientWidth) {
                titleMarquee.classList.add('no-scroll');
            }
        }
    } catch (e) { console.error("checkOverflows Title Error:", e); }

    // Artist
    try {
        const artistMarquee = document.getElementById('artist-marquee');
        const artistContainer = document.getElementById('artist-container');
        if (artistMarquee && artistContainer) {
            artistMarquee.classList.remove('scroll');
            void artistMarquee.offsetWidth;

            // Allow measuring only if visible
            if (artistContainer.clientWidth > 0) {
                if (artistMarquee.scrollWidth > artistContainer.clientWidth) {
                    artistMarquee.classList.add('scroll');
                }
            }
        }
    } catch (e) { console.error("checkOverflows Artist Error:", e); }

    // Album
    try {
        const albumMarquee = document.getElementById('album-marquee');
        const albumContainer = document.getElementById('album-container');
        if (albumMarquee && albumContainer) {
            albumMarquee.classList.remove('scroll');
            void albumMarquee.offsetWidth;
            if (albumContainer.clientWidth > 0) {
                if (albumMarquee.scrollWidth > albumContainer.clientWidth) {
                    albumMarquee.classList.add('scroll');
                } else {
                    // Ensure right alignment if not scrolling
                    // CSS handles this via text-align: right on #album-marquee
                }
            }
        }
    } catch (e) { }
}
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
        // ========== Color Extraction ==========
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

// ========== Color Extraction Helper Functions (Global Scope) ==========
function getAverageColor(imgEl) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const height = canvas.height = imgEl.naturalHeight || imgEl.height;
    const width = canvas.width = imgEl.naturalWidth || imgEl.width;

    context.drawImage(imgEl, 0, 0);

    // Sample data (not every pixel for performance)
    const data = context.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4 * 10) { // Sample every 10th pixel
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }

    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    return { r, g, b };
}

function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, l: l * 100 };
}

function resetPillColors() {
    const leftPill = document.getElementById('left-pill');
    const rightPill = document.getElementById('right-pill');
    // Default dark semi-transparent
    const defaultColor = 'rgba(0, 0, 0, 0.65)';
    if (leftPill) leftPill.style.backgroundColor = defaultColor;
    if (rightPill) rightPill.style.backgroundColor = defaultColor;

    // Reset to defaults
    const playtimeEl = document.getElementById('playtime');
    if (playtimeEl) playtimeEl.style.color = '#3b82f6'; // Default Blue

    const progressPath = document.getElementById('progress-path');
    if (progressPath) progressPath.style.stroke = '#3b82f6';

    const progressDot = document.getElementById('progress-dot');
    if (progressDot) {
        progressDot.style.fill = 'white';
        progressDot.style.filter = ''; // Reset to CSS default
    }
}
