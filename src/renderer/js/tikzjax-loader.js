// TikZJax Loader - Simplified integration for MarkDD Editor
// Based on obsidian-tikzjax-main integration

class TikZJaxLoader {
    constructor() {
        this.isLoaded = false;
        this.loadingPromise = null;
        this.settings = {
            invertColorsInDarkMode: true
        };
    }

    async load() {
        if (this.isLoaded) return;
        if (this.loadingPromise) return this.loadingPromise;

        this.loadingPromise = this.loadTikZJax();
        await this.loadingPromise;
        this.isLoaded = true;
    }

    async loadTikZJax() {
        try {
            // Check if TikZJax is already loaded
            if (window.TikZJax) {
                console.log('[TikZJaxLoader] TikZJax already loaded by library loader');
                this.isLoaded = true;
                // Add event listener for processed SVGs
                document.addEventListener('tikzjax-load-finished', this.postProcessSvg.bind(this));
                return;
            }
            
            // Try to load TikZJax from CDN first
            await this.loadScript('https://tikzjax.com/v1/tikzjax.js');
            
            // Add event listener for processed SVGs
            document.addEventListener('tikzjax-load-finished', this.postProcessSvg.bind(this));
            
            console.log('TikZJax loaded successfully from CDN');
        } catch (error) {
            console.warn('Failed to load TikZJax from CDN, using fallback:', error);
            // Fallback to local placeholder rendering
            this.setupFallbackRenderer();
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupFallbackRenderer() {
        // Create a basic fallback for when TikZJax isn't available
        window.TikZJax = {
            process: (element) => {
                const code = element.textContent || element.innerText;
                element.outerHTML = this.createFallbackSVG(code, element.dataset.isCircuit === 'true');
            }
        };
    }

    createFallbackSVG(tikzCode, isCircuit = false) {
        const diagramType = isCircuit ? 'CircuiTikZ' : 'TikZ';
        
        return `
            <div class="tikz-fallback">
                <div class="tikz-header">
                    <span class="tikz-type">${diagramType} Diagram</span>
                    <span class="tikz-status">Fallback Mode</span>
                </div>
                <div class="tikz-preview">
                    <svg width="300" height="200" viewBox="0 0 300 200" class="tikz-placeholder-svg">
                        <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e1e5e9" stroke-width="2" rx="8"/>
                        <text x="150" y="100" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">
                            ${diagramType} Diagram
                        </text>
                        <text x="150" y="120" text-anchor="middle" font-family="monospace" font-size="10" fill="#999">
                            TikZJax not available
                        </text>
                    </svg>
                </div>
                <div class="tikz-code">
                    <pre><code>${tikzCode}</code></pre>
                </div>
            </div>
        `;
    }

    tidyTikzSource(tikzSource) {
        // Remove non-breaking space characters
        tikzSource = tikzSource.replaceAll('&nbsp;', '');

        let lines = tikzSource.split('\n');

        // Trim whitespace and remove empty lines
        lines = lines.map(line => line.trim()).filter(line => line);

        return lines.join('\n');
    }

    colorSVGinDarkMode(svg) {
        // Replace colors for dark mode compatibility
        return svg.replaceAll(/("#000"|"black")/g, '"currentColor"')
                  .replaceAll(/("#fff"|"white")/g, '"var(--background-primary)"');
    }

    postProcessSvg(event) {
        const svgEl = event.target;
        let svg = svgEl.outerHTML;

        if (this.settings.invertColorsInDarkMode) {
            svg = this.colorSVGinDarkMode(svg);
        }

        svgEl.outerHTML = svg;
    }

    // Process TikZ scripts in a container
    async processTikZScripts(container) {
        await this.load();

        const tikzScripts = container.querySelectorAll('script[type="text/tikz"]');
        
        for (const script of tikzScripts) {
            const tikzCode = this.tidyTikzSource(script.textContent);
            const isCircuit = script.dataset.isCircuit === 'true';
            
            script.setAttribute('data-show-console', 'false');
            script.textContent = tikzCode;

            // If TikZJax is available, let it process the script
            if (window.TikZJax && window.TikZJax.process) {
                window.TikZJax.process(script);
            } else {
                // Use fallback rendering
                script.outerHTML = this.createFallbackSVG(tikzCode, isCircuit);
            }
        }
    }

    // Create a TikZ script element
    createTikZScript(code, isCircuit = false) {
        const script = document.createElement('script');
        script.type = 'text/tikz';
        script.dataset.showConsole = 'false';
        if (isCircuit) {
            script.dataset.isCircuit = 'true';
        }
        script.textContent = this.tidyTikzSource(code);
        return script;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TikZJaxLoader;
} else {
    window.TikZJaxLoader = TikZJaxLoader;
}