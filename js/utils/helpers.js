// Helpers
function formatTime(ms) {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;

    if (hours > 0) {
        return `${hours}:${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}



function checkMarquee() {
    checkOverflows();
}

function checkOverflows() {
    const items = [
        { container: titleContainer, marquee: titleMarquee, name: 'Title', className: 'track-title' },
        { container: artistContainer, marquee: artistMarquee, name: 'Artist', className: 'track-artist' },
        { container: albumContainer, marquee: albumMarquee, name: 'Album', className: 'track-album' }
    ];

    items.forEach(item => {
        try {
            if (item.container && item.marquee) {
                // Reset to measure
                item.marquee.classList.remove('scrolling');
                item.marquee.classList.remove('no-scroll'); // Legacy cleanup

                // Remove existing clones to measure original content only
                const clones = item.marquee.querySelectorAll('.marquee-clone');
                clones.forEach(c => c.remove());

                void item.marquee.offsetWidth; // Force Reflow

                // Check overflow
                // We compare scrollWidth of marquee (content) vs clientWidth of container
                const contentWidth = item.marquee.scrollWidth;
                const containerWidth = item.container.clientWidth;

                if (contentWidth > containerWidth) {
                    item.marquee.classList.add('scrolling');

                    // Seamless Loop: Duplicate content
                    // CSS animates container -50% (one copy width)
                    const originalSpan = item.marquee.querySelector('.' + item.className);
                    if (originalSpan) {
                        const clone = originalSpan.cloneNode(true);
                        clone.removeAttribute('id'); // Prevent ID conflicts
                        clone.classList.add('marquee-clone');
                        // Ensure it keeps the styling class
                        clone.classList.add(item.className);
                        clone.setAttribute('aria-hidden', 'true');
                        item.marquee.appendChild(clone);
                    }

                    console.debug(`${item.name} overflows: Seamless loop enabled`);
                }
            }
        } catch (e) {
            console.error("Marquee check failed for " + item.name, e);
        }
    });
}

function resizeWidget() {
    const wrapper = document.getElementById('widget-wrapper');
    if (!wrapper) return;

    // Design resolution (reference size)
    const baseWidth = 600;
    const baseHeight = 150;

    // Viewport resolution
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Calculate scale to fit (contain)
    const scaleX = vw / baseWidth;
    const scaleY = vh / baseHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 0.9 for 90% fill (margin)

    // Apply scale centered
    wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
