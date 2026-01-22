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
    // Force exit compact mode when reappearing
    if (leftPill) leftPill.classList.remove('retracted');
    if (rightPill) rightPill.classList.remove('retracted');

    // Cover Visibility Logic
    if (typeof SHOW_COVER !== 'undefined' && SHOW_COVER === false) {
        if (centerCover) centerCover.style.display = 'none';
        if (widgetWrapper) widgetWrapper.classList.add('no-cover');
    } else {
        if (centerCover) {
            centerCover.style.display = '';
            centerCover.classList.remove('compact');
        }
        if (widgetWrapper) widgetWrapper.classList.remove('no-cover');
    }

    resetPillAutoHide(); // Restart hide timer

    setTimeout(setupProgressRing, 100);
    // Re-check overflow in case it was hidden during layout
    setTimeout(checkOverflows, 200);
}

function resetPillAutoHide() {
    // Falls Config sagt "Nein", gar nicht erst anzeigen
    if (typeof SHOW_LEFT_PILL !== 'undefined' && SHOW_LEFT_PILL === false) {
        if (leftPill) leftPill.style.display = 'none';
    } else {
        if (leftPill) {
            leftPill.style.display = ''; // Reset display
            leftPill.classList.remove('retracted');
        }
    }

    if (typeof SHOW_RIGHT_PILL !== 'undefined' && SHOW_RIGHT_PILL === false) {
        if (rightPill) rightPill.style.display = 'none';
    } else {
        if (rightPill) {
            rightPill.style.display = ''; // Reset display
            rightPill.classList.remove('retracted');
        }
    }

    // Clear existing timer
    if (state.pillHideTimeout) clearTimeout(state.pillHideTimeout);

    // Disable Compact Mode if Cover is hidden (User Request)
    if (typeof SHOW_COVER !== 'undefined' && SHOW_COVER === false) {
        // If we want to support AUTO_HIDE_WHILE_PLAYING without compact mode, we would trigger it here directly.
        // For now, "it should just not work anymore" implies pills stay open.
        // But we still honor AUTO_HIDE_WHILE_PLAYING if checked
        if (typeof AUTO_HIDE_WHILE_PLAYING !== 'undefined' && AUTO_HIDE_WHILE_PLAYING === true) {
            startFullHideWhilePlayingTimer();
        }
        return;
    }

    // Only set timer if at least one pill is allowed
    const leftAllowed = typeof SHOW_LEFT_PILL === 'undefined' || SHOW_LEFT_PILL === true;
    const rightAllowed = typeof SHOW_RIGHT_PILL === 'undefined' || SHOW_RIGHT_PILL === true;

    if (!leftAllowed && !rightAllowed) return; // Nothing to hide

    state.pillHideTimeout = setTimeout(() => {
        // Only retract if allowed to show
        if (leftAllowed && leftPill) leftPill.classList.add('retracted');
        if (rightAllowed && rightPill) rightPill.classList.add('retracted');

        // Compact mode for cover only if it's the only thing left
        if (centerCover) centerCover.classList.add('compact');

        // Start full hide timer if AUTO_HIDE_WHILE_PLAYING is enabled
        if (typeof AUTO_HIDE_WHILE_PLAYING !== 'undefined' && AUTO_HIDE_WHILE_PLAYING === true) {
            startFullHideWhilePlayingTimer();
        }
    }, typeof AUTO_HIDE_DURATION !== 'undefined' ? AUTO_HIDE_DURATION : 10000);

    // Ensure cover is NOT compact initially (unless forced elsewhere)
    if (centerCover) centerCover.classList.remove('compact');
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
        return; // EXIT EARLY: Don't process empty song data from command
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

    // Cover Logic with SHOW_COVER Config
    const isCoverEnabled = typeof SHOW_COVER === 'undefined' || SHOW_COVER === true;

    if (isCoverEnabled) {
        if (data.cover && data.cover.startsWith('http')) {
            if (coverImg.src !== data.cover) {
                imageLoadPromise = new Promise((resolve) => {
                    coverImg.crossOrigin = "Anonymous";
                    coverImg.onload = function () {
                        try {
                            const dominantColor = getAverageColor(coverImg);

                            // 1. Glow
                            const glowColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.6)`;
                            if (typeof ENABLE_GLOW_EFFECTS === 'undefined' || ENABLE_GLOW_EFFECTS === true) {
                                centerCover.style.setProperty('--album-glow-color', glowColor);
                            } else {
                                centerCover.style.setProperty('--album-glow-color', 'transparent');
                            }

                            // 2. Pill Backgrounds
                            const bgColor = `rgba(${dominantColor.r}, ${dominantColor.g}, ${dominantColor.b}, 0.65)`;
                            if (leftPill) leftPill.style.backgroundColor = bgColor;
                            if (rightPill) rightPill.style.backgroundColor = bgColor;

                            // 3. Text/Accents (Complementary HSL)
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

                            // 4. Equalizer
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
                    coverImg.src = data.cover;
                });
            }
            coverImg.style.display = 'block';
            coverPlaceholder.style.display = 'none';
        } else {
            // No Cover URL - Show Placeholder IF enabled
            if (typeof KEEP_LAST_COVER_ON_STOP !== 'undefined' && KEEP_LAST_COVER_ON_STOP === true && coverImg.src && coverImg.src !== '') {
                // Keep existing cover
                coverImg.style.display = 'block';
                coverPlaceholder.style.display = 'none';
            } else {
                coverImg.style.display = 'none';
                coverPlaceholder.style.display = 'block';
                resetPillColors();
            }
        }

        // Ensure container is visible
        if (centerCover) centerCover.style.display = '';
        if (widgetWrapper) widgetWrapper.classList.remove('no-cover');

    } else {
        // COVER DISABLED via Config
        coverImg.style.display = 'none';
        coverPlaceholder.style.display = 'none';
        if (centerCover) centerCover.style.display = 'none';
        if (widgetWrapper) widgetWrapper.classList.add('no-cover');
        resetPillColors();
    }

    // Title
    const newTitle = data.title || (typeof DEFAULT_TITLE !== 'undefined' ? DEFAULT_TITLE : 'Unknown Title');
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

        // Apply Configurable Scroll Speed
        if (typeof SCROLL_SPEED_TITLE !== 'undefined' && titleMarquee) {
            titleMarquee.style.animationDuration = `${SCROLL_SPEED_TITLE}s`;
        }

        // Trigger marquee check logic
        if (!state.isAnimating) setTimeout(checkOverflows, 50);
    }

    // Artist
    const newArtist = data.artist || (typeof DEFAULT_ARTIST !== 'undefined' ? DEFAULT_ARTIST : 'Unknown Artist');
    if (artistEl.textContent !== newArtist) {
        artistEl.textContent = newArtist;

        // Apply Configurable Scroll Speed
        if (typeof SCROLL_SPEED_ARTIST !== 'undefined' && artistMarquee) {
            artistMarquee.style.animationDuration = `${SCROLL_SPEED_ARTIST}s`;
        }

        if (!state.isAnimating) setTimeout(checkOverflows, 50);
    }

    // Album
    // Fallback for debugging - helps user see if data is missing or UI is broken
    const newAlbum = data.album || (typeof DEFAULT_ALBUM !== 'undefined' ? DEFAULT_ALBUM : 'Unknown Album');
    if (albumEl.textContent !== newAlbum) {
        albumEl.textContent = newAlbum;

        // Apply Configurable Scroll Speed
        if (typeof SCROLL_SPEED_ALBUM !== 'undefined' && albumMarquee) {
            albumMarquee.style.animationDuration = `${SCROLL_SPEED_ALBUM}s`;
        }

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

            // Check Config for Grayscale
            if (typeof GRAYSCALE_ON_PAUSE !== 'undefined' && GRAYSCALE_ON_PAUSE === true) {
                coverImg.classList.add('grayscale');
            } else {
                coverImg.classList.remove('grayscale');
            }

            if (centerCover) centerCover.classList.add('paused');

            // Stop timer if running
            stopLocalTimer();
            // Start hide timer if not running
            if (!state.pauseHideTimeout) startPauseHideTimer();

            if (wasPlaying) console.log("Music PAUSED State Enforced");
        } else {
            // PLAYING
            coverImg.classList.remove('paused');
            coverImg.classList.remove('grayscale');
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

            // Only interfere with visibility triggers if NOT currently animating
            if (!state.isAnimating) {
                if (isCommand) {
                    // COMMAND: Always wake up and expand
                    if (state.isWidgetHidden && !state.isForcedHidden) {
                        showWidgetWithEntry();
                        console.log("Widget waking up (Command)");
                    } else {
                        resetPillAutoHide(); // Expand pills
                        console.log("Expanding pills (Command)");
                    }
                } else if (isResuming) {
                    // RESUME: Only wake up if HIDDEN. If Compact, STAY Compact.
                    if (state.isWidgetHidden && !state.isForcedHidden) {
                        showWidgetWithEntry();
                        console.log("Widget waking up (Resume from Hidden)");
                    }
                    // Else: Do nothing (preserve compact state)
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
