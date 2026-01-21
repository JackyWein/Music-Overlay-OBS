// Debug / Test Helper Functions
// Used for testing animations via the buttons in index.html

function testAnimation(animationFn) {
    console.log("Starting Test Animation Clean...");

    // Helper to safe get element
    const get = (id) => document.getElementById(id);

    // 0. ENSURE WIDGET VISIBLE
    const widget = get('music-widget');
    if (widget) {
        widget.classList.add('visible');
        widget.classList.remove('hiding');
        widget.style.opacity = '1';
    }

    // 1. CLEAR DYNAMIC EFFECTS
    const selectors = [
        '.music-note-particle',
        '.invert-ring',
        '.liquid-ripple',
        '.flip-reflection',
        '.shockwave',
        '.disc-glow-trail',
        '.dust-particle.exploding',
        '.gravity-particle'
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Reset shooting particles
    const pLeft = get('particle-left');
    const pRight = get('particle-right');
    if (pLeft) { pLeft.style.display = 'none'; pLeft.className = 'particle'; }
    if (pRight) { pRight.style.display = 'none'; pRight.className = 'particle'; }

    // 2. RETRACT PILLS (Simulate "Song Ending")
    const leftPill = get('left-pill');
    const rightPill = get('right-pill');
    const centerCover = get('center-cover');

    if (leftPill) leftPill.classList.add('retracted');
    if (rightPill) rightPill.classList.add('retracted');

    // Simulate 'Large' mode (Song End state)
    if (centerCover) centerCover.classList.add('compact');

    // 3. HARD RESET (Set Stage to "Song Playing" state)
    const coverWrapper = get('cover-wrapper');
    const coverImg = get('cover');

    if (coverWrapper) {
        // Clear all animation classes
        if (typeof ALL_ENTRY_CLASSES !== 'undefined') {
            coverWrapper.classList.remove(...ALL_ENTRY_CLASSES);
        }

        // Force Reset to "Visible Normal"
        coverWrapper.style.transition = 'none';
        coverWrapper.style.transform = '';
        coverWrapper.style.opacity = '1';
        coverWrapper.style.filter = '';
        void coverWrapper.offsetWidth;
        coverWrapper.style.transition = '';
    }

    if (coverImg) {
        coverImg.classList.add('spinning');
    }

    // 4. PERFORM LIFECYCLE: Exit(Last) -> Entry(Next)

    // Determine which Exit to usage
    let prevAnim = 'Supernova';
    if (typeof lastAnimationName !== 'undefined' && lastAnimationName) {
        prevAnim = lastAnimationName;
    }

    console.log("Test performing Exit of: " + prevAnim);

    if (typeof playExitAnimation === 'function') {
        playExitAnimation(prevAnim, () => {
            // Start Entry
            animationFn(() => {
                console.log('Animation Test Complete');
                // Show pills and clean up compact mode
                setTimeout(() => {
                    if (leftPill) leftPill.classList.remove('retracted');
                    if (rightPill) rightPill.classList.remove('retracted');
                    if (centerCover) centerCover.classList.remove('compact');
                }, 500);

                // Update GLOBAL lastAnimationName for next test
                if (typeof ENTRY_ANIMATIONS !== 'undefined') {
                    const match = ENTRY_ANIMATIONS.find(a => a.fn === animationFn);
                    if (match) {
                        lastAnimationName = match.name;
                    } else if (animationFn === triggerRandomEntry) {
                        // Random Entry updates lastAnimationName internally
                    }
                }
            });
        });
    } else {
        // Fallback
        animationFn(() => {
            setTimeout(() => {
                if (leftPill) leftPill.classList.remove('retracted');
                if (rightPill) rightPill.classList.remove('retracted');
                if (centerCover) centerCover.classList.remove('compact');
            }, 500);
        });
    }
}
