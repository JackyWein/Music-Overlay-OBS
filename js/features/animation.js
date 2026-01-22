// Animation Logic (Full Effects: Particle Collision + Supernova + Auto-Hide)
// Depends on: dom.js, state.js, helpers.js

// ========== ANIMATION STATE HELPERS ==========
function animStart() {
    if (coverWrapper) coverWrapper.classList.add('is-animating');
}

function animEnd() {
    if (coverWrapper) coverWrapper.classList.remove('is-animating');
}

// ========== Progress Ring ==========
function setupProgressRing() {
    // Config Check
    if (typeof SHOW_PROGRESS_RING !== 'undefined' && SHOW_PROGRESS_RING === false) {
        if (progressRing) progressRing.style.display = 'none';
        const container = document.getElementById('progress-ring-container');
        if (container) container.style.display = 'none';
        return;
    } else {
        if (progressRing) progressRing.style.display = ''; // Reset
        const container = document.getElementById('progress-ring-container');
        if (container) container.style.display = '';
    }

    const size = 140;
    const center = size / 2;
    const radius = 46;
    const circumference = 2 * Math.PI * radius;

    progressRing.setAttribute('viewBox', `0 0 ${size} ${size}`);

    if (document.getElementById('progress-path')) return;

    progressRing.innerHTML = `
        <circle class="progress-track" cx="${center}" cy="${center}" r="${radius}" />
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

    updateProgressRing(state.currentProgress);
}

function updateProgressRing(progress) {
    if (typeof SHOW_PROGRESS_RING !== 'undefined' && SHOW_PROGRESS_RING === false) return;

    // Last.fm Fix: Hide ring if we have no duration data
    if (!state.currentDurationMs || state.currentDurationMs <= 0) {
        if (progressRing) progressRing.style.display = 'none';
        return;
    } else {
        if (progressRing) progressRing.style.display = '';
    }

    const progressPath = document.getElementById('progress-path');
    const progressDot = document.getElementById('progress-dot');
    if (!progressPath) return;

    // Safety check for NaN
    if (isNaN(progress)) progress = 0;

    const radius = 46;
    const center = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    progressPath.style.strokeDashoffset = offset;

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

// ========== Local Timer ==========
function startLocalTimer() {
    if (state.localTimerInterval) clearInterval(state.localTimerInterval);

    state.localTimerInterval = setInterval(() => {
        // ONLY increment if playing
        if (!state.isPlaying || state.currentDurationMs <= 0) return;

        state.currentPositionMs += 1000;
        if (state.currentPositionMs > state.currentDurationMs) {
            state.currentPositionMs = state.currentDurationMs;
        }
        updateTimeDisplay();

        if (state.currentDurationMs > 0) {
            state.currentProgress = state.currentPositionMs / state.currentDurationMs;
            updateProgressRing(state.currentProgress);
        }
    }, 1000);
}

function stopLocalTimer() {
    if (state.localTimerInterval) {
        clearInterval(state.localTimerInterval);
        state.localTimerInterval = null;
    }
}

function updateTimeDisplay() {
    if (playtimeEl) {
        if (!state.currentDurationMs || state.currentDurationMs <= 0) {
            playtimeEl.style.display = 'none';
        } else {
            playtimeEl.style.display = '';
            playtimeEl.textContent = `${formatTime(state.currentPositionMs)} / ${formatTime(state.currentDurationMs)}`;
        }
    }
}

// ========== Auto-Hide on Pause ==========
// Diese Werte werden jetzt aus config.js gelesen:
// - HIDE_ON_STOP: true/false - Widget komplett verstecken bei Stop/Pause
// - HIDE_ON_STOP_DELAY: Zeit in ms bis zum Verstecken

function startPauseHideTimer() {
    // Nur verstecken wenn HIDE_ON_STOP aktiviert ist
    if (typeof HIDE_ON_STOP === 'undefined' || HIDE_ON_STOP !== true) {
        return; // Nicht verstecken - Standard-Verhalten
    }

    if (state.pauseHideTimeout) clearTimeout(state.pauseHideTimeout);

    const delay = (typeof HIDE_ON_STOP_DELAY !== 'undefined') ? HIDE_ON_STOP_DELAY : 10000;

    state.pauseStartTime = Date.now();
    state.pauseHideTimeout = setTimeout(() => {
        hideWidget();
    }, delay);
}

function cancelPauseHideTimer() {
    if (state.pauseHideTimeout) {
        clearTimeout(state.pauseHideTimeout);
        state.pauseHideTimeout = null;
    }
    state.pauseStartTime = null;
}

function hideWidget() {
    if (state.isWidgetHidden) return;
    state.isWidgetHidden = true;

    // Trigger exit animation based on current state
    if (widgetWrapper) {
        widgetWrapper.classList.add('hidden');
    }
    console.log("Widget hidden due to pause timeout");
}

function showWidgetWithEntry() {
    if (!state.isWidgetHidden) return;
    state.isWidgetHidden = false;

    if (widgetWrapper) {
        widgetWrapper.classList.remove('hidden');
    }

    // Trigger full entry animation
    triggerPhysicsEntry(() => {
        console.log("Widget re-shown with entry animation");

        // Ensure Progress Ring is setup
        if (typeof setupProgressRing === 'function') setupProgressRing();

        // Show pills again after animation
        setTimeout(() => {
            if (leftPill) leftPill.classList.remove('retracted');
            if (rightPill) rightPill.classList.remove('retracted');

            // Fix: Ensure cover exits compact mode
            const centerCover = document.getElementById('center-cover');
            if (centerCover) centerCover.classList.remove('compact');

            resetPillAutoHide();
        }, 500);
    });
}
// ========== ENTRY ANIMATION SYSTEM ==========
const ALL_ENTRY_CLASSES = [
    'entry-supernova', 'entry-disc-swap', 'entry-liquid', 'entry-flip', 'entry-glitch', 'entry-portal',
    'entry-cyber', 'entry-nebula', 'entry-crystal', 'entry-spin',
    'exit-supernova', 'exit-disc-up', 'exit-liquid', 'exit-flip', 'exit-glitch', 'exit-portal',
    'exit-cyber', 'exit-nebula', 'exit-crystal', 'exit-spin'
];

// Animation Configuration: Connects IDs to Exit logic
const ANIMATION_CONFIG = {
    'Supernova': { exitClass: 'exit-supernova', duration: 500 },
    'Disc Swap': { exitClass: 'exit-disc-up', duration: 600 },
    'Liquid Morph': { exitClass: 'exit-liquid', duration: 700 }, // Approximate duration
    '3D Flip': { exitClass: 'exit-flip', duration: 500 },
    'Hologram Glitch': { exitClass: 'exit-glitch', duration: 400 },
    'Portal Zoom': { exitClass: 'exit-portal', duration: 500 },
    'Cyber Construct': { exitClass: 'exit-cyber', duration: 800 },
    'Nebula Implosion': { exitClass: 'exit-nebula', duration: 1000 },
    'Crystal Shatter': { exitClass: 'exit-crystal', duration: 600 },
    'Spin Swap': { exitClass: 'exit-spin', duration: 600 }
};

let lastAnimationName = 'Supernova'; // Default assume last was Supernova for first run or random
let repeatCount = 0;

// Get album colors for animations
function getAnimationColors() {
    let albumColor = '#3b82f6';
    let compColor = '#f97316';

    if (coverImg && coverImg.complete && coverImg.naturalWidth > 0) {
        try {
            const avgColor = getAverageColor(coverImg);
            albumColor = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
            const hsl = rgbToHsl(avgColor.r, avgColor.g, avgColor.b);
            const compHue = (hsl.h + 180) % 360;
            compColor = `hsl(${compHue}, 80%, 50%)`;
        } catch (e) { /* defaults */ }
    }

    return { albumColor, compColor };
}

// Clear all entry animation classes
function clearEntryClasses() {
    if (coverWrapper) {
        ALL_ENTRY_CLASSES.forEach(cls => coverWrapper.classList.remove(cls));
    }
}

// ========== GENERIC EXIT ORCHESTRATOR ==========
function playExitAnimation(lastAnimName, callback) {
    animStart(); // Flag start
    clearEntryClasses(); // Ensure clean slate for exit class

    // Find config for previous animation
    const config = ANIMATION_CONFIG[lastAnimName] || ANIMATION_CONFIG['Supernova']; // Fallback
    const exitClass = config.exitClass;
    const duration = config.duration;

    console.log(`Performing Exit: ${lastAnimName} (${exitClass})`);

    if (coverWrapper) {
        // Ensure transition enabled if needed
        coverWrapper.classList.add(exitClass);
    }

    // Wait for exit to complete before calling back (Entry)
    setTimeout(() => {
        if (callback) callback();
    }, duration);
}

// ========== PURE ENTRY FUNCTIONS (No Exit Logic) ==========

// 1: SUPERNOVA (Particles -> Reform)
function triggerEntrySuperNova(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Start immediately (Stage is cleared by Exit)

    // Phase 1: Particles
    if (particleLeft && particleRight) {
        particleLeft.style.display = 'block';
        particleRight.style.display = 'block';
        particleLeft.style.opacity = '1';
        particleRight.style.opacity = '1';
        particleLeft.style.background = albumColor;
        particleLeft.style.boxShadow = `0 0 15px ${albumColor}, 0 0 30px ${albumColor}`;
        particleRight.style.background = compColor;
        particleRight.style.boxShadow = `0 0 15px ${compColor}, 0 0 30px ${compColor}`;

        particleLeft.classList.remove('shoot-left');
        particleRight.classList.remove('shoot-right');
        void particleLeft.offsetWidth;
        particleLeft.classList.add('shoot-left');
        particleRight.classList.add('shoot-right');
    }

    // Phase 2: Reform (Delay match particle travel ~450ms)
    setTimeout(() => {
        // Hide particles
        if (particleLeft) { particleLeft.style.display = 'none'; particleLeft.classList.remove('shoot-left'); }
        if (particleRight) { particleRight.style.display = 'none'; particleRight.classList.remove('shoot-right'); }

        // Invert ring
        if (musicWidget) {
            const invertRing = document.createElement('div');
            invertRing.classList.add('invert-ring');
            musicWidget.appendChild(invertRing);
            requestAnimationFrame(() => invertRing.classList.add('active'));
            setTimeout(() => invertRing.remove(), 1100);
        }

        // Music note explosion
        spawnMusicNotes(albumColor, compColor);

        // Entry Class
        clearEntryClasses();
        if (coverWrapper) {
            void coverWrapper.offsetWidth;
            coverWrapper.classList.add('entry-supernova');
        }

        animEnd();
        if (callback) callback();
    }, 450);
}

// 2: DISC SWAP
function triggerEntryDiscSwap(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Start immediately
    if (musicWidget) {
        const trail = document.createElement('div');
        trail.classList.add('disc-glow-trail');
        trail.style.background = `radial-gradient(circle, ${albumColor}80 0%, transparent 70%)`;
        musicWidget.appendChild(trail);
        requestAnimationFrame(() => trail.classList.add('active'));
        setTimeout(() => trail.remove(), 1000);
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-disc-swap');
    }

    animEnd();
    if (callback) callback();
}

// 3: LIQUID MORPH
function triggerEntryLiquid(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Start immediately
    if (musicWidget) {
        for (let i = 0; i < 3; i++) {
            const ripple = document.createElement('div');
            ripple.classList.add('liquid-ripple');
            ripple.style.borderColor = i % 2 === 0 ? albumColor : compColor;
            ripple.style.animationDelay = `${i * 150}ms`;
            musicWidget.appendChild(ripple);
            requestAnimationFrame(() => ripple.classList.add('active'));
            setTimeout(() => ripple.remove(), 1200);
        }
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-liquid');
    }

    animEnd();
    if (callback) callback();
}

// 4: 3D FLIP
function triggerEntryFlip(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Start immediately
    if (musicWidget) {
        const reflection = document.createElement('div');
        reflection.classList.add('flip-reflection');
        reflection.style.background = `linear-gradient(135deg, ${albumColor}60 0%, transparent 50%)`;
        musicWidget.appendChild(reflection);
        requestAnimationFrame(() => reflection.classList.add('active'));
        setTimeout(() => reflection.remove(), 1000);
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-flip');
    }

    animEnd();
    if (callback) callback();
}

// 5: HOLOGRAM GLITCH
function triggerEntryGlitch(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();

    // Start immediately
    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-glitch');
    }
    animEnd();
    if (callback) callback();
}

// 6: PORTAL ZOOM
function triggerEntryPortal(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();

    // Start immediately
    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-portal');
    }
    animEnd();
    if (callback) callback();
}

// 7: CYBER CONSTRUCT
function triggerEntryCyber(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Grid Effect
    if (musicWidget) {
        const grid = document.createElement('div');
        grid.classList.add('cyber-grid');
        musicWidget.appendChild(grid);
        requestAnimationFrame(() => grid.classList.add('active'));
        setTimeout(() => grid.remove(), 1200);
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-cyber');
    }
    animEnd();
    if (callback) callback();
}

// 8: NEBULA IMPLOSION
function triggerEntryNebula(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Nebula Clouds
    if (musicWidget) {
        for (let i = 0; i < 5; i++) {
            const cloud = document.createElement('div');
            cloud.classList.add('nebula-cloud');
            // Random sizes and positions
            const size = 150 + Math.random() * 100;
            cloud.style.width = `${size}px`;
            cloud.style.height = `${size}px`;
            cloud.style.background = `radial-gradient(circle, ${i % 2 === 0 ? albumColor : compColor} 0%, transparent 70%)`;
            cloud.style.left = '50%';
            cloud.style.top = '50%';
            cloud.style.animationDelay = `${i * 100}ms`;

            musicWidget.appendChild(cloud);
            requestAnimationFrame(() => cloud.classList.add('active'));
            setTimeout(() => cloud.remove(), 1500);
        }
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-nebula');
    }
    animEnd();
    if (callback) callback();
}

// 9: CRYSTAL SHATTER
function triggerEntryCrystal(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();
    const musicWidget = document.getElementById('music-widget');

    // Crystal Shards
    if (musicWidget) {
        for (let i = 0; i < 8; i++) {
            const shard = document.createElement('div');
            shard.classList.add('crystal-shard');

            // Random fly-in origin
            const angle = Math.random() * Math.PI * 2;
            const dist = 150;
            shard.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
            shard.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
            shard.style.setProperty('--rot', `${Math.random() * 360}deg`);

            shard.style.top = 'calc(50% - 20px)';
            shard.style.left = 'calc(50% - 10px)';

            // Tint shards slightly
            shard.style.background = `linear-gradient(135deg, rgba(255,255,255,0.9) 0%, ${albumColor}AA 100%)`;
            shard.style.animationDelay = `${i * 50}ms`;

            musicWidget.appendChild(shard);
            requestAnimationFrame(() => shard.classList.add('active'));
            setTimeout(() => shard.remove(), 1000);
        }
    }

    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-crystal');
    }
    animEnd();
    if (callback) callback();
}

// 10: SPIN SWAP
function triggerEntrySpin(callback) {
    animStart();
    const { albumColor, compColor } = getAnimationColors();

    // Start immediately
    clearEntryClasses();
    if (coverWrapper) {
        void coverWrapper.offsetWidth;
        coverWrapper.classList.add('entry-spin');
    }
    animEnd();
    if (callback) callback();
}

// ========== MUSIC NOTES HELPER ==========
function spawnMusicNotes(albumColor, compColor) {
    const musicWidget = document.getElementById('music-widget');
    if (!musicWidget) return;

    const symbols = ['♪', '♫', '♬', '♩', '🎵', '🎶', '✦', '✧', '★'];
    const count = 50;

    for (let i = 0; i < count; i++) {
        const note = document.createElement('div');
        note.classList.add('music-note-particle');
        note.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        note.style.position = 'absolute';
        note.style.top = '50%';  // Center of widget
        note.style.left = '50%'; // Center of widget
        note.style.fontSize = `${12 + Math.random() * 16}px`;
        note.style.pointerEvents = 'none';
        note.style.zIndex = '200';

        const baseAngle = (i / count) * Math.PI * 4;
        const angle = baseAngle + (Math.random() - 0.5) * 0.5;
        const distance = 80 + (i / count) * 300 + Math.random() * 50;

        const colorChoice = Math.random();
        if (colorChoice > 0.6) note.style.color = albumColor;
        else if (colorChoice > 0.3) note.style.color = compColor;
        else note.style.color = 'white';

        note.style.textShadow = `0 0 10px ${note.style.color}, 0 0 20px ${note.style.color}`;
        note.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        note.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        note.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
        note.style.animationDuration = `${1 + Math.random() * 1.5}s`;
        note.style.animationDelay = `${i * 15}ms`;

        // Append to music widget, not particle container
        musicWidget.appendChild(note);
        requestAnimationFrame(() => note.classList.add('spiral-fly'));
        setTimeout(() => note.remove(), 3000);
    }
}

// ========== RANDOM ENTRY SELECTOR ==========
const ENTRY_ANIMATIONS = [
    { name: 'Supernova', fn: triggerEntrySuperNova },
    { name: 'Disc Swap', fn: triggerEntryDiscSwap },
    { name: 'Liquid Morph', fn: triggerEntryLiquid },
    { name: '3D Flip', fn: triggerEntryFlip },
    { name: 'Hologram Glitch', fn: triggerEntryGlitch },
    { name: 'Portal Zoom', fn: triggerEntryPortal },
    { name: 'Cyber Construct', fn: triggerEntryCyber },
    { name: 'Nebula Implosion', fn: triggerEntryNebula },
    { name: 'Crystal Shatter', fn: triggerEntryCrystal },
    { name: 'Spin Swap', fn: triggerEntrySpin }
];

function triggerRandomEntry(callback) {
    let choices = ENTRY_ANIMATIONS;

    // Filter by User Config (ALLOWED_ANIMATIONS) if setup
    if (typeof ALLOWED_ANIMATIONS !== 'undefined' && Array.isArray(ALLOWED_ANIMATIONS) && ALLOWED_ANIMATIONS.length > 0) {
        // Filter whitelist
        const allowed = ENTRY_ANIMATIONS.filter(anim => ALLOWED_ANIMATIONS.includes(anim.name));
        if (allowed.length > 0) {
            choices = allowed;
        } else {
            console.warn("ALLOWED_ANIMATIONS defined but no matches found. Using all animations.");
        }
    }

    // Filter repeat logic (max 2 same)
    if (repeatCount >= 2 && choices.length > 1) {
        choices = choices.filter(a => a.name !== lastAnimationName);
    }

    const random = choices[Math.floor(Math.random() * choices.length)];

    console.log(`Transition: Exit(${lastAnimationName}) -> Entry(${random.name})`);

    // 1. Play Exit of LAST animation
    playExitAnimation(lastAnimationName, () => {

        // 2. Play Entry of NEW animation
        random.fn(callback);

        // Update tracking AFTER new animation starts
        if (random.name === lastAnimationName) {
            repeatCount++;
        } else {
            repeatCount = 1;
            lastAnimationName = random.name;
        }
    });
}


// Legacy alias for backward compatibility
function triggerPhysicsEntry(callback) {
    triggerRandomEntry(callback);
}
