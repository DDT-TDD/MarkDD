/**
 * TikZJax Fallback Implementation
 * Provides basic TikZ rendering when the main TikZJax library fails to load
 * This is a minimal implementation that creates fallback diagrams
 */

(function() {
    'use strict';

    console.log('[TikZJax-Fallback] Loading minimal TikZ fallback implementation...');

    // Simple TikZ-to-SVG converter for basic shapes
    class TikZFallback {
        constructor() {
            this.processedElements = new Set();
        }

        // Main processing function
        process(container) {
            if (!container) {
                container = document;
            }

            const tikzElements = container.querySelectorAll('script[type="text/tikz"]');
            
            for (const element of tikzElements) {
                if (this.processedElements.has(element)) {
                    continue;
                }
                
                this.processedElements.add(element);
                const tikzCode = element.textContent;
                const svg = this.convertToSVG(tikzCode);
                
                // Replace the script element with the SVG
                const wrapper = document.createElement('div');
                wrapper.className = 'tikz-fallback-container';
                wrapper.innerHTML = svg;
                element.parentNode.replaceChild(wrapper, element);
            }
        }

        // Convert basic TikZ commands to SVG
        convertToSVG(tikzCode) {
            try {
                // Basic SVG container
                let svg = '<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">';
                svg += '<defs><style>.tikz-fallback{font-family:Computer Modern,serif;font-size:12px}</style></defs>';
                svg += '<g class="tikz-fallback">';

                // Parse basic TikZ commands
                const commands = this.parseTikZCommands(tikzCode);
                
                for (const cmd of commands) {
                    svg += this.renderCommand(cmd);
                }

                svg += '</g></svg>';
                
                return `<div class="tikz-fallback-wrapper">
                    <div class="diagram-header">
                        <span class="diagram-type">TikZ Diagram (Fallback)</span>
                        <small>Basic rendering - install TikZJax for full features</small>
                    </div>
                    ${svg}
                </div>`;
            } catch (error) {
                return `<div class="tikz-fallback-error">
                    <strong>TikZ Fallback Error:</strong> ${error.message}
                    <details><summary>Show TikZ Code</summary><pre><code>${tikzCode}</code></pre></details>
                </div>`;
            }
        }

        // Parse TikZ commands into a simple structure
        parseTikZCommands(code) {
            const commands = [];
            
            // Basic circle detection: \draw (x,y) circle (radius);
            const circleRegex = /\\draw\s*\(([^)]+)\)\s*circle\s*\(([^)]+)\)/g;
            let match;
            while ((match = circleRegex.exec(code)) !== null) {
                const [x, y] = this.parseCoordinates(match[1]);
                const radius = this.parseRadius(match[2]);
                commands.push({
                    type: 'circle',
                    x: x * 50 + 150, // Scale and center
                    y: y * 50 + 100,
                    radius: radius * 30
                });
            }

            // Basic line detection: \draw (x1,y1) -- (x2,y2);
            const lineRegex = /\\draw\s*\(([^)]+)\)\s*--\s*\(([^)]+)\)/g;
            while ((match = lineRegex.exec(code)) !== null) {
                const [x1, y1] = this.parseCoordinates(match[1]);
                const [x2, y2] = this.parseCoordinates(match[2]);
                commands.push({
                    type: 'line',
                    x1: x1 * 50 + 150,
                    y1: y1 * 50 + 100,
                    x2: x2 * 50 + 150,
                    y2: y2 * 50 + 100
                });
            }

            // Basic rectangle detection: \draw (x1,y1) rectangle (x2,y2);
            const rectRegex = /\\draw\s*\(([^)]+)\)\s*rectangle\s*\(([^)]+)\)/g;
            while ((match = rectRegex.exec(code)) !== null) {
                const [x1, y1] = this.parseCoordinates(match[1]);
                const [x2, y2] = this.parseCoordinates(match[2]);
                commands.push({
                    type: 'rectangle',
                    x: Math.min(x1, x2) * 50 + 150,
                    y: Math.min(y1, y2) * 50 + 100,
                    width: Math.abs(x2 - x1) * 50,
                    height: Math.abs(y2 - y1) * 50
                });
            }

            // If no recognizable commands, create a placeholder
            if (commands.length === 0) {
                commands.push({
                    type: 'text',
                    x: 150,
                    y: 100,
                    text: 'TikZ Diagram'
                });
            }

            return commands;
        }

        // Parse coordinate strings like "0,0" or "1,2"
        parseCoordinates(coordStr) {
            const parts = coordStr.split(',').map(s => parseFloat(s.trim()));
            return [parts[0] || 0, parts[1] || 0];
        }

        // Parse radius strings
        parseRadius(radiusStr) {
            const match = radiusStr.match(/([0-9.]+)/);
            return match ? parseFloat(match[1]) : 1;
        }

        // Render individual commands as SVG elements
        renderCommand(cmd) {
            switch (cmd.type) {
                case 'circle':
                    return `<circle cx="${cmd.x}" cy="${cmd.y}" r="${cmd.radius}" 
                            fill="none" stroke="black" stroke-width="1"/>`;
                
                case 'line':
                    return `<line x1="${cmd.x1}" y1="${cmd.y1}" x2="${cmd.x2}" y2="${cmd.y2}" 
                            stroke="black" stroke-width="1"/>`;
                
                case 'rectangle':
                    return `<rect x="${cmd.x}" y="${cmd.y}" width="${cmd.width}" height="${cmd.height}" 
                            fill="none" stroke="black" stroke-width="1"/>`;
                
                case 'text':
                    return `<text x="${cmd.x}" y="${cmd.y}" text-anchor="middle" 
                            dominant-baseline="central" fill="gray">${cmd.text}</text>`;
                
                default:
                    return '';
            }
        }
    }

    // Create global TikZJax interface
    const tikzFallback = new TikZFallback();
    
    // Expose as both tikzjax and TikZJax for compatibility
    window.tikzjax = {
        process: (container) => tikzFallback.process(container)
    };
    
    window.TikZJax = window.tikzjax;
    
    // Auto-process on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => tikzFallback.process(), 100);
        });
    } else {
        setTimeout(() => tikzFallback.process(), 100);
    }

    console.log('[TikZJax-Fallback] Fallback implementation loaded successfully');
})();
