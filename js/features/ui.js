// UI Logic
// Depends on: dom.js, state.js, config.js, utils/*, animation.js

function showWidget() {
    // Check if widget should be force hidden
    if (typeof FORCE_HIDDEN !== 'undefined' && FORCE_HIDDEN === true) {
        widgetWrapper.classList.add('hiding');
        widgetWrapper.classList.remove('visible');
        return;
    }

    widgetWrapper.classList.remove('hiding');
    widgetWrapper.classList.add('visible');

    // Force exit compact mode when reappearing
    if (leftPill) leftPill.classList.remove('retracted');
    if (rightPill) rightPill.classList.remove('retracted');
    const centerCover = document.getElementById('center-cover');
    if (centerCover) centerCover.classList.remove('compact');

    resetPillAutoHide(); // Restart hide timer

    setTimeout(setupProgressRing, 100);
    // Re-check overflow in case it was hidden during layout
    setTimeout(checkOverflows, 200);
}

function resetPillAutoHide() {
    // console.log("resetPillAutoHide called"); 
    if (state.pillHideTimer) clearTimeout(state.pillHideTimer);
    if (state.fullHideTimer) clearTimeout(state.fullHideTimer);

    state.pillHideTimer = setTimeout(() => {
        if (leftPill && rightPill) {
            leftPill.classList.add('retracted');
            rightPill.classList.add('retracted');

            // Enable compact mode
            const centerCover = document.getElementById('center-cover');
            if (centerCover) {
                centerCover.classList.add('compact');

                // Set album glow color from cover
                if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
                    try {
                        const avgColor = getAverageColor(coverImg);
                        const glowColor = `rgba(${avgColor.r}, ${avgColor.g}, ${avgColor.b}, 0.6)`;
                        centerCover.style.setProperty('--album-glow-color', glowColor);
                    } catch (e) { /* Use default */ }
                }
            }

            // Start full hide timer if AUTO_HIDE_WHILE_PLAYING is enabled
            if (typeof AUTO_HIDE_WHILE_PLAYING !== 'undefined' && AUTO_HIDE_WHILE_PLAYING === true) {
                startFullHideWhilePlayingTimer();
            }
        }
    }, AUTO_HIDE_DURATION);
}

// Timer für komplettes Verstecken während Musik läuft
function startFullHideWhilePlayingTimer() {
    if (state.fullHideTimer) clearTimeout(state.fullHideTimer);

    const delay = (typeof AUTO_HIDE_WHILE_PLAYING_DELAY !== 'undefined')
        ? AUTO_HIDE_WHILE_PLAYING_DELAY
        : 60000;

    state.fullHideTimer = setTimeout(() => {
        if (state.isPlaying) {  // Nur verstecken wenn noch am Abspielen
            hideWidget();
            console.log("Widget hidden while playing (AUTO_HIDE_WHILE_PLAYING)");
        }
    }, delay);
}

// Timer abbrechen
function cancelFullHideWhilePlayingTimer() {
    if (state.fullHideTimer) {
        clearTimeout(state.fullHideTimer);
        state.fullHideTimer = null;
    }
}

function updateWidget(data) {
    // DEBUG: Check incoming data
    // console.log("Received Data:", JSON.stringify(data)); 

    const newTitle = data.title || 'Unknown Title';
    const newArtist = data.artist || 'Unknown Artist';

    // Handle !song command -> Force Wake Up
    if (data.trigger === 'command') {
        if (leftPill) leftPill.classList.remove('retracted');
        if (rightPill) rightPill.classList.remove('retracted');
        const centerCover = document.getElementById('center-cover');
        if (centerCover) centerCover.classList.remove('compact');

        // Reset hiding timers so it stays visible for a while
        if (typeof resetPillAutoHide === 'function') resetPillAutoHide();
        if (state.pauseHideTimeout) {
            clearTimeout(state.pauseHideTimeout);
            state.pauseHideTimeout = null;
        }
    }

    const currentSongId = newTitle + newArtist;

    const isSongChanged = currentSongId !== state.lastSongId;
    const isFirstLoad = !state.lastSongId && currentSongId !== "Unknown TitleUnknown Artist";



    // Reset Auto-Hide Timer ONLY on Song Change or First Load
    // We intentionally DO NOT reset on Resume (Pause -> Play), so the user can keep the compact view if they want.
    if (isSongChanged || isFirstLoad) {
        console.log('Resetting AutoHide: Song Changed or First Load', { isSongChanged, isFirstLoad });
        resetPillAutoHide();
        // Ensure un-pause visual state
        if (coverWrapper) coverWrapper.classList.remove('paused');
        const centerCover = document.getElementById('center-cover');
        if (centerCover) centerCover.classList.remove('paused');
    }

    if ((isSongChanged || isFirstLoad) && !state.isAnimating) {
        state.isAnimating = true;

        const safteyTimer = setTimeout(() => {
            if (state.isAnimating) {
                console.warn("Animation stuck? Forcing reset.");
                state.isAnimating = false;
            }
        }, 5000);

        try {
            if (leftPill) leftPill.classList.add('retracted');
            if (rightPill) rightPill.classList.add('retracted');
            if (coverWrapper) coverWrapper.classList.remove('spinning');

            const startEntrySequence = () => {
                // Ensure widget is visible if currently hidden (e.g. from Auto-Hide)
                if (state.isWidgetHidden) {
                    state.isWidgetHidden = false;
                    if (typeof widgetWrapper !== 'undefined') widgetWrapper.classList.remove('hidden');
                    console.log("Widget unhidden for song change entry");
                }

                clearTimeout(safteyTimer);

                if (USE_PHYSICS_ANIMATION) {
                    coverWrapper.classList.add('exit-up');
                    setTimeout(async () => {
                        try { await updateContent(data); } catch (e) { console.error(e); }
                        state.lastSongId = currentSongId;
                        state.isAnimating = true;

                        coverWrapper.classList.remove('exit-up');
                        coverWrapper.classList.remove('enter-bottom');
                        coverWrapper.style.transform = 'scale(0)';
                        coverWrapper.style.opacity = '0';

                        triggerPhysicsEntry(() => {
                            coverWrapper.classList.add('reverse-snap');
                            coverWrapper.style.opacity = '1';
                            coverWrapper.style.transform = 'scale(1)';

                            // direct text assignment - no scramble
                            if (titleEl) titleEl.textContent = titleEl.getAttribute('data-full-text') || titleEl.textContent;
                            if (artistEl) artistEl.textContent = artistEl.textContent;

                            setTimeout(() => {
                                leftPill.classList.remove('retracted');
                                rightPill.classList.remove('retracted');

                                // Exit compact mode
                                const centerCover = document.getElementById('center-cover');
                                if (centerCover) centerCover.classList.remove('compact');

                                resetPillAutoHide();

                                // Check overflows AFTER expansion animation (600ms)
                                setTimeout(() => {
                                    try { checkOverflows(); } catch (e) { }
                                }, 700);

                                setTimeout(() => {
                                    coverWrapper.classList.remove('reverse-snap');
                                    if (state.isPlaying) coverWrapper.classList.add('spinning');
                                    state.isAnimating = false;
                                }, 1500);
                            }, 500);
                        });
                    }, 500);

                } else {
                    // Standard fallback
                    try { updateContent(data); } catch (e) { }
                    state.lastSongId = currentSongId;
                    state.isAnimating = false;
                }
            };
            setTimeout(startEntrySequence, 500);
        } catch (e) {
            console.error(e);
            state.isAnimating = false;
        }
    }
    else if (!state.isAnimating) {
        updateContent(data);
        if (!state.lastSongId) state.lastSongId = currentSongId;
    }
}

function updateContent(data) {
    let imageLoadPromise = Promise.resolve();

    // Cover
    if (data.cover && data.cover.startsWith('http')) {
        if (coverImg.src !== data.cover) {
            imageLoadPromise = new Promise((resolve) => {
                coverImg.crossOrigin = "Anonymous";
                coverImg.onload = function () {
                    try {
                        const dominantColor = getAverageColor(coverImg);
                        const bgColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.65)`;
                        if (leftPill) leftPill.style.backgroundColor = bgColor;
                        if (rightPill) rightPill.style.backgroundColor = bgColor;

                        // Set global glow color variable
                        const glowColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.7)`;
                        const centerCover = document.getElementById('center-cover');
                        if (centerCover) centerCover.style.setProperty('--album-glow-color', glowColor);

                        const hsl = rgbToHsl(dominantColor.r, dominantColor.g, dominantColor.b);
                        const compHue = (hsl.h + 180) % 360;
                        const compColor = `hsl(${compHue}, 100%, 75%)`;

                        if (playtimeEl) playtimeEl.style.color = compColor;
                        const progressPath = document.getElementById('progress-path');
                        if (progressPath) progressPath.style.stroke = compColor;
                        const progressDot = document.getElementById('progress-dot');
                        if (progressDot) {
                            progressDot.style.fill = compColor;
                            progressDot.style.filter = `drop-shadow(0 0 8px ${compColor})`;
                        }

                        // Color the Equalizer Bars (Album Color)
                        const eqColor = `rgb(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b})`;
                        const eqBars = document.querySelectorAll('.eq-bar');
                        eqBars.forEach(bar => {
                            bar.style.backgroundColor = eqColor;
                            bar.style.boxShadow = `0 0 5px ${eqColor}`;
                        });
                    } catch (e) { resetPillColors(); }
                    resolve();
                };
                coverImg.onerror = function () {
                    resetPillColors();
                    resolve();
                };
                // Set src trigger load
                coverImg.src = data.cover;
                coverImg.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            });
        }
    } else {
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'block';
        resetPillColors();
    }

    // Title
    const newTitle = data.title || 'Unknown Title';
    const liveTitleEl = document.getElementById('title'); // Get fresh reference
    const currentTitleText = liveTitleEl ? liveTitleEl.textContent : '';

    if (currentTitleText !== newTitle) {
        // Update text content only - protect DOM element identity
        if (liveTitleEl) {
            liveTitleEl.textContent = newTitle;
            liveTitleEl.setAttribute('data-full-text', newTitle);
        } else {
            // Fallback if missing
            titleMarquee.innerHTML = `<span id="title" data-full-text="${newTitle}">${newTitle}</span>`;
        }

        // Trigger marquee check logic
        if (!state.isAnimating) setTimeout(checkOverflows, 50);
    }

    // Artist
    const newArtist = data.artist || 'Unknown Artist';
    if (artistEl.textContent !== newArtist) {
        artistEl.textContent = newArtist;
        if (!state.isAnimating) setTimeout(checkOverflows, 50);
    }

    // Album
    // Fallback for debugging - helps user see if data is missing or UI is broken
    const newAlbum = data.album || 'Unknown Album';
    if (albumEl.textContent !== newAlbum) {
        albumEl.textContent = newAlbum;
        if (!state.isAnimating) setTimeout(checkOverflows, 50);
    }

    // Position / Duration
    let position = data.positionMs || data.position || 0;
    let duration = data.durationMs || data.duration || 0;

    if (data.currentTime && data.totalTime) {
        const parseTime = (str) => {
            const parts = str.split(':').map(p => parseInt(p));
            if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
            return (parts[0] * 60 + parts[1]) * 1000;
        };
        position = parseTime(data.currentTime);
        duration = parseTime(data.totalTime);
    }

    state.currentPositionMs = position;
    state.currentDurationMs = duration;

    // Progress
    if (data.progress !== undefined) {
        state.currentProgress = data.progress;
        state.currentPositionMs = state.currentProgress * duration;
    } else if (duration > 0) {
        state.currentProgress = position / duration;
    }

    updateTimeDisplay();

    // Ensure Progress Ring exists
    if (typeof setupProgressRing === 'function') setupProgressRing();
    updateProgressRing(state.currentProgress);

    // Play State - Only pause if isPaused is EXPLICITLY true
    // If isPaused is not in the data at all, assume playing
    const isPausedExplicit =
        data.isPaused === true || data.isPaused === 'true' || data.isPaused === 1;

    const wasPlaying = state.isPlaying;

    // Only update isPlaying if isPaused was explicitly provided
    if (data.hasOwnProperty('isPaused') || data.hasOwnProperty('paused') ||
        data.hasOwnProperty('isPlaying') || data.hasOwnProperty('playing')) {
        const isPausedValue =
            data.isPaused === true || data.isPaused === 'true' || data.isPaused === 1 ||
            data.paused === true || data.paused === 'true' || data.paused === 1 ||
            data.isPlaying === false || data.isPlaying === 'false' || data.isPlaying === 0 ||
            data.playing === false || data.playing === 'false' || data.playing === 0;
        state.isPlaying = !isPausedValue;
    }

    // OVERRIDE: If Title is invalid or default, force STOP/PAUSE
    // This handles the case where "Stop" clears the title but leaves status as Playing
    if (newTitle === 'Kein Titel' || newTitle === 'Unknown Title' || newTitle === '') {
        state.isPlaying = false;
        console.log("Forcing STOP/PAUSE due to empty title");
    }

    // Check if status changed from Pause to Play (Resume)
    const isResuming = state.isPlaying && !wasPlaying;

    // Handle pause state changes (State-Based, not just Transition)
    if (coverWrapper) {
        const centerCover = document.getElementById('center-cover');

        if (!state.isPlaying) {
            // PAUSED
            coverImg.classList.add('paused');
            if (centerCover) centerCover.classList.add('paused');

            // Stop timer if running
            stopLocalTimer();
            // Start hide timer if not running
            if (!state.pauseHideTimeout) startPauseHideTimer();

            if (wasPlaying) console.log("Music PAUSED State Enforced");
        } else {
            // PLAYING
            coverImg.classList.remove('paused');
            if (centerCover) centerCover.classList.remove('paused');

            // Start timer if not running
            if (!state.localTimerInterval) {
                startLocalTimer();
                console.log("Music PLAYING State Enforced - Timer Started");
            }

            cancelPauseHideTimer();

            // WICHTIGER FIX: Nur aufwecken wenn:
            // 1. Wir kommen aus einer Pause (Resume) UND das Widget war versteckt
            // 2. ODER es ist ein Command (z.B. Twitch !song)
            const isCommand = data.trigger === 'command';

            if (state.isWidgetHidden) {
                if (isResuming || isCommand) {
                    showWidgetWithEntry();
                    console.log("Widget waking up (Resume or Command)");
                }
            }
        }
    }

    // Only check overflows if specifically needed - NO unconditional checks to avoid resetting animation
    // if (!state.isAnimating) {
    //    setTimeout(checkOverflows, 50);
    // }

    return imageLoadPromise;
}
