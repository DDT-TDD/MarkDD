/**
 * Test & prototype of standalone WaveDrom timing diagram SVG renderer
 */
const assert = require('assert');

function renderWaveDromToSVG(sourceCode) {
    let spec;
    try {
        // Strip comments or trailing commas if any, parse JSON/JS object
        spec = JSON.parse(sourceCode);
    } catch (e) {
        // Try relaxed eval for JS-style objects
        try {
            spec = Function('"use strict"; return (' + sourceCode + ')')();
        } catch (e2) {
            throw new Error('Invalid WaveDrom JSON specification: ' + e.message);
        }
    }

    if (!spec || !spec.signal || !Array.isArray(spec.signal)) {
        throw new Error('WaveDrom spec must contain a "signal" array.');
    }

    const signals = spec.signal;
    const stepWidth = 32;
    const rowHeight = 32;
    const textWidth = 80;
    const padding = 16;

    // Find max wave length
    let maxSteps = 1;
    for (const sig of signals) {
        if (sig.wave && typeof sig.wave === 'string') {
            maxSteps = Math.max(maxSteps, sig.wave.length);
        }
    }

    const totalWidth = padding * 2 + textWidth + maxSteps * stepWidth;
    const totalHeight = padding * 2 + signals.length * rowHeight;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="${totalWidth}" height="${totalHeight}" style="background:#ffffff; font-family:system-ui,-apple-system,sans-serif; font-size:12px;">\n`;
    svg += `<defs>
        <pattern id="grid" width="${stepWidth}" height="${rowHeight}" patternUnits="userSpaceOnUse">
            <line x1="${stepWidth}" y1="0" x2="${stepWidth}" y2="${rowHeight}" stroke="#f0f0f0" stroke-width="1"/>
        </pattern>
    </defs>\n`;

    // Background grid
    svg += `<rect x="${padding + textWidth}" y="${padding}" width="${maxSteps * stepWidth}" height="${signals.length * rowHeight}" fill="url(#grid)" />\n`;

    signals.forEach((sig, rowIndex) => {
        const yTop = padding + rowIndex * rowHeight + 6;
        const yBottom = yTop + 20;
        const yMid = yTop + 10;
        const name = sig.name || '';
        const wave = sig.wave || '';
        const dataArr = sig.data ? [...sig.data] : [];

        // Label
        svg += `<text x="${padding}" y="${yMid + 4}" fill="#333333" font-weight="600">${name}</text>\n`;

        let currentX = padding + textWidth;
        let lastLevel = null;
        let pathD = '';

        for (let i = 0; i < wave.length; i++) {
            const ch = wave[i];
            const nextX = currentX + stepWidth;

            if (ch === 'p' || ch === 'P') {
                // Clock pulse
                pathD += ` M ${currentX} ${yBottom} L ${currentX} ${yTop} L ${currentX + stepWidth / 2} ${yTop} L ${currentX + stepWidth / 2} ${yBottom} L ${nextX} ${yBottom}`;
                lastLevel = '0';
            } else if (ch === 'n' || ch === 'N') {
                pathD += ` M ${currentX} ${yTop} L ${currentX} ${yBottom} L ${currentX + stepWidth / 2} ${yBottom} L ${currentX + stepWidth / 2} ${yTop} L ${nextX} ${yTop}`;
                lastLevel = '1';
            } else if (ch === '1') {
                if (lastLevel === '0' || lastLevel === null) {
                    pathD += ` M ${currentX} ${yBottom} L ${currentX} ${yTop} L ${nextX} ${yTop}`;
                } else {
                    pathD += ` L ${nextX} ${yTop}`;
                }
                lastLevel = '1';
            } else if (ch === '0') {
                if (lastLevel === '1' || lastLevel === null) {
                    pathD += ` M ${currentX} ${yTop} L ${currentX} ${yBottom} L ${nextX} ${yBottom}`;
                } else {
                    pathD += ` L ${nextX} ${yBottom}`;
                }
                lastLevel = '0';
            } else if (ch === '.') {
                const y = (lastLevel === '1') ? yTop : (lastLevel === '0') ? yBottom : yMid;
                pathD += ` L ${nextX} ${y}`;
            } else if (ch === 'z' || ch === 'Z') {
                pathD += ` M ${currentX} ${yMid} L ${nextX} ${yMid}`;
                lastLevel = 'z';
            } else if (ch === 'x' || ch === 'X' || (ch >= '2' && ch <= '9') || ch === '=') {
                // Bus / data
                const textVal = dataArr.shift() || '';
                const fillCol = (ch >= '2' && ch <= '9') ? '#e8f4fd' : '#f5f5f5';
                const strokeCol = '#0066cc';
                svg += `<polygon points="${currentX + 3},${yMid} ${currentX + 6},${yTop} ${nextX - 6},${yTop} ${nextX - 3},${yMid} ${nextX - 6},${yBottom} ${currentX + 6},${yBottom}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="1.5" />\n`;
                if (textVal) {
                    svg += `<text x="${currentX + stepWidth / 2}" y="${yMid + 4}" fill="#003366" font-size="10" text-anchor="middle">${textVal}</text>\n`;
                }
                lastLevel = 'bus';
            }

            currentX = nextX;
        }

        if (pathD) {
            svg += `<path d="${pathD}" fill="none" stroke="#0066cc" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />\n`;
        }
    });

    svg += '</svg>';
    return svg;
}

const sample = `{
  "signal": [
    { "name": "clk", "wave": "p....." },
    { "name": "req", "wave": "0.1..0" },
    { "name": "data", "wave": "x.=..x", "data": ["HEAD", "BODY", "TAIL"] }
  ]
}`;

const svgOut = renderWaveDromToSVG(sample);
assert.ok(svgOut.includes('<svg'), 'Should contain SVG root');
assert.ok(svgOut.includes('clk'), 'Should contain signal name clk');
assert.ok(svgOut.includes('HEAD'), 'Should contain data label HEAD');
console.log('✅ WaveDrom standalone SVG generator test passed!');
