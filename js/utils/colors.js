// Color Utils
function getAverageColor(imgEl) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const height = canvas.height = imgEl.naturalHeight || imgEl.height;
    const width = canvas.width = imgEl.naturalWidth || imgEl.width;

    context.drawImage(imgEl, 0, 0);

    const data = context.getImageData(0, 0, width, height).data;
    let r = 0, g = 0, b = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4 * 10) {
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
        h = s = 0;
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
    const defaultColor = 'rgba(0, 0, 0, 0.65)';
    if (leftPill) leftPill.style.backgroundColor = defaultColor;
    if (rightPill) rightPill.style.backgroundColor = defaultColor;

    if (playtimeEl) playtimeEl.style.color = '#3b82f6';

    const progressPath = document.getElementById('progress-path');
    if (progressPath) progressPath.style.stroke = '#3b82f6';

    const progressDot = document.getElementById('progress-dot');
    if (progressDot) {
        progressDot.style.fill = 'white';
        progressDot.style.filter = '';
    }
}
