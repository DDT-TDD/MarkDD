/**
 * Enhanced TikZJax Integration - Obsidian-style Implementation
 * Based on obsidian-tikzjax-main patterns with MarkDD enhancements
 */
class ObsidianTikZJaxEnhanced {
    constructor() {
        this.isLoaded = false;
        this.loadingPromise = null;
        this.settings = {
            invertColorsInDarkMode: true,
            showConsole: false,
            optimizeSVG: true
        };
        
        // Bind methods for event handling
        this.postProcessSvg = this.postProcessSvg.bind(this);
        
        console.log('[ObsidianTikZJaxEnhanced] Constructor completed');
    }

    /**
     * Obsidian onload() equivalent - Initialize TikZJax for all windows
     */
    async onload() {
        try {
            // Load TikZJax for all windows (Obsidian pattern)
            this.loadTikZJaxAllWindows();
            
            // Register TikZ code block processor
            this.registerTikzCodeBlock();
            
            // Add syntax highlighting support
            this.addSyntaxHighlighting();
            
            console.log('[ObsidianTikZJaxEnhanced] Onload completed successfully');
        } catch (error) {
            console.error('[ObsidianTikZJaxEnhanced] Onload failed:', error);
        }
    }

    /**
     * Obsidian onunload() equivalent - Clean up TikZJax
     */
    onunload() {
        this.unloadTikZJaxAllWindows();
        this.removeSyntaxHighlighting();
    }

    /**
     * Load TikZJax script (Obsidian inline strategy)
     */
    loadTikZJax(doc = document) {
        // Check if already loaded
        if (doc.getElementById('tikzjax')) {
            console.log('[ObsidianTikZJaxEnhanced] TikZJax already loaded for this document');
            return;
        }

        try {
            // Create script element with TikZJax (Obsidian inline pattern)
            const script = doc.createElement('script');
            script.id = 'tikzjax';
            script.type = 'text/javascript';
            
            // Try to use CDN TikZJax or fallback
            if (window.TikZJax || window.tikzjax) {
                // Already loaded globally
                console.log('[ObsidianTikZJaxEnhanced] Using existing TikZJax instance');
            } else {
                // Load from CDN
                script.src = 'https://tikzjax.com/v1/tikzjax.js';
                script.onload = () => {
                    console.log('[ObsidianTikZJaxEnhanced] TikZJax loaded from CDN');
                    this.isLoaded = true;
                };
                script.onerror = () => {
                    console.warn('[ObsidianTikZJaxEnhanced] TikZJax CDN failed, using fallback');
                    this.setupFallbackRenderer();
                };
            }

            doc.head.appendChild(script);

            // Add event listener for processing (Obsidian pattern)
            doc.addEventListener('tikzjax-load-finished', this.postProcessSvg);

            console.log('[ObsidianTikZJaxEnhanced] TikZJax script added to document');

        } catch (error) {
            console.error('[ObsidianTikZJaxEnhanced] Failed to load TikZJax script:', error);
            this.setupFallbackRenderer();
        }
    }

    /**
     * Unload TikZJax from document (Obsidian pattern)
     */
    unloadTikZJax(doc = document) {
        const script = doc.getElementById('tikzjax');
        if (script) {
            script.remove();
        }

        doc.removeEventListener('tikzjax-load-finished', this.postProcessSvg);
    }

    /**
     * Load TikZJax for all windows (Obsidian multi-window support)
     */
    loadTikZJaxAllWindows() {
        // Load for main window
        this.loadTikZJax(window.document);
        
        // Note: In Electron, we typically have one window, but keeping Obsidian pattern
        console.log('[ObsidianTikZJaxEnhanced] TikZJax loaded for all windows');
    }

    /**
     * Unload TikZJax from all windows
     */
    unloadTikZJaxAllWindows() {
        this.unloadTikZJax(window.document);
    }

    /**
     * Register TikZ code block processor (Obsidian pattern)
     */
    registerTikzCodeBlock() {
        // This would be called by the markdown renderer when processing TikZ blocks
        console.log('[ObsidianTikZJaxEnhanced] TikZ code block processor registered');
    }

    /**
     * Add syntax highlighting (Obsidian pattern adapted for MarkDD)
     */
    addSyntaxHighlighting() {
        try {
            // Add TikZ syntax highlighting if highlight.js is available
            if (window.hljs && window.hljs.registerLanguage) {
                // Register TikZ as LaTeX variant
                window.hljs.registerLanguage('tikz', function() {
                    return window.hljs.getLanguage('latex') || window.hljs.getLanguage('tex');
                });
                console.log('[ObsidianTikZJaxEnhanced] TikZ syntax highlighting added');
            }
        } catch (error) {
            console.warn('[ObsidianTikZJaxEnhanced] Could not add syntax highlighting:', error);
        }
    }

    /**
     * Remove syntax highlighting
     */
    removeSyntaxHighlighting() {
        // Note: highlight.js doesn't have a built-in unregister, so we just log
        console.log('[ObsidianTikZJaxEnhanced] TikZ syntax highlighting removed');
    }

    /**
     * Tidy TikZ source (Obsidian method)
     */
    tidyTikzSource(tikzSource) {
        // Remove non-breaking space characters, otherwise we get errors
        tikzSource = tikzSource.replaceAll('&nbsp;', '');

        let lines = tikzSource.split('\n');

        // Trim whitespace that is inserted when pasting in code
        lines = lines.map(line => line.trim());

        // Remove empty lines
        lines = lines.filter(line => line);

        return lines.join('\n');
    }

    /**
     * Color SVG for dark mode (Obsidian method)
     */
    colorSVGinDarkMode(svg) {
        // Replace the color "black" with currentColor (the current text color)
        // so that diagram axes, etc are visible in dark mode
        // And replace "white" with the background color
        svg = svg.replaceAll(/("#000"|"black")/g, '"currentColor"')
                .replaceAll(/("#fff"|"white")/g, '"var(--background-primary)"');

        return svg;
    }

    /**
     * Post-process SVG (Obsidian event handler)
     */
    postProcessSvg(event) {
        try {
            const svgEl = event.target;
            if (!svgEl || svgEl.tagName !== 'SVG') return;

            let svg = svgEl.outerHTML;

            // Apply dark mode colors if enabled
            if (this.settings.invertColorsInDarkMode) {
                svg = this.colorSVGinDarkMode(svg);
            }

            // Apply optimizations if enabled
            if (this.settings.optimizeSVG) {
                svg = this.optimizeSVG(svg);
            }

            // Replace the SVG element
            svgEl.outerHTML = svg;

            console.log('[ObsidianTikZJaxEnhanced] SVG post-processed successfully');

        } catch (error) {
            console.error('[ObsidianTikZJaxEnhanced] SVG post-processing failed:', error);
        }
    }

    /**
     * Optimize SVG (simplified version of Obsidian SVGO integration)
     */
    optimizeSVG(svg) {
        try {
            // Basic SVG optimization without SVGO dependency
            // Remove unnecessary whitespace and comments
            svg = svg.replace(/>\s+</g, '><')
                    .replace(/<!--[\s\S]*?-->/g, '')
                    .trim();

            return svg;
        } catch (error) {
            console.warn('[ObsidianTikZJaxEnhanced] SVG optimization failed:', error);
            return svg;
        }
    }

    /**
     * Setup fallback renderer when TikZJax is not available
     */
    setupFallbackRenderer() {
        console.log('[ObsidianTikZJaxEnhanced] Setting up fallback renderer');
        
        // Create a basic fallback for TikZ rendering
        if (!window.TikZJax) {
            window.TikZJax = {
                process: (element) => {
                    this.processTikZFallback(element);
                }
            };
        }
    }

    /**
     * Fallback TikZ processing
     */
    processTikZFallback(element) {
        try {
            const code = element.textContent || element.innerText;
            const isCircuit = element.dataset.isCircuit === 'true';
            
            const fallbackSVG = this.createFallbackSVG(code, isCircuit);
            element.outerHTML = fallbackSVG;

        } catch (error) {
            console.error('[ObsidianTikZJaxEnhanced] Fallback processing failed:', error);
            element.outerHTML = '<div class="tikz-error">TikZ rendering failed</div>';
        }
    }

    /**
     * Create fallback SVG when TikZJax is not available
     */
    createFallbackSVG(tikzCode, isCircuit = false) {
        const diagramType = isCircuit ? 'CircuiTikZ' : 'TikZ';
        
        return `
            <div class="tikz-fallback-container">
                <div class="tikz-fallback-header">
                    <span class="tikz-type">${diagramType} Diagram</span>
                    <span class="tikz-status">Fallback Mode</span>
                </div>
                <div class="tikz-fallback-preview">
                    <svg width="300" height="200" viewBox="0 0 300 200" class="tikz-placeholder-svg">
                        <rect width="100%" height="100%" fill="var(--bg-secondary)" stroke="var(--border-color)" stroke-width="2" rx="8"/>
                        <text x="150" y="90" text-anchor="middle" font-family="sans-serif" font-size="14" fill="var(--text-primary)">
                            ${diagramType} Diagram
                        </text>
                        <text x="150" y="110" text-anchor="middle" font-family="monospace" font-size="10" fill="var(--text-secondary)">
                            TikZJax not available
                        </text>
                        <text x="150" y="125" text-anchor="middle" font-family="monospace" font-size="9" fill="var(--text-muted)">
                            Showing source code below
                        </text>
                    </svg>
                </div>
                <div class="tikz-fallback-controls">
                    <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Source</button>
                    <pre class="diagram-source hidden"><code>${tikzCode}</code></pre>
                </div>
            </div>
        `;
    }

    /**
     * Process TikZ scripts in a container (MarkDD integration method)
     */
    async processTikZScripts(container) {
        try {
            if (!this.isLoaded && !this.loadingPromise) {
                this.loadingPromise = this.onload();
                await this.loadingPromise;
            }

            const tikzScripts = container.querySelectorAll('script[type="text/tikz"]');
            
            for (const script of tikzScripts) {
                const tikzCode = this.tidyTikzSource(script.textContent);
                const isCircuit = script.dataset.isCircuit === 'true';
                
                // Set processed attributes
                script.setAttribute('data-show-console', this.settings.showConsole ? 'true' : 'false');
                script.textContent = tikzCode;

                // Process with TikZJax if available
                if (window.TikZJax && typeof window.TikZJax.process === 'function') {
                    window.TikZJax.process(script);
                } else {
                    // Use fallback
                    this.processTikZFallback(script);
                }
            }

            console.log(`[ObsidianTikZJaxEnhanced] Processed ${tikzScripts.length} TikZ scripts`);

        } catch (error) {
            console.error('[ObsidianTikZJaxEnhanced] TikZ processing failed:', error);
        }
    }

    /**
     * Create TikZ script element (utility method)
     */
    createTikZScript(code, isCircuit = false) {
        const script = document.createElement('script');
        script.type = 'text/tikz';
        script.dataset.showConsole = this.settings.showConsole ? 'true' : 'false';
        if (isCircuit) {
            script.dataset.isCircuit = 'true';
        }
        script.textContent = this.tidyTikzSource(code);
        return script;
    }

    /**
     * Check if TikZJax is properly initialized
     */
    get isInitialized() {
        return this.isLoaded || !!(window.TikZJax || window.tikzjax);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ObsidianTikZJaxEnhanced;
} else {
    window.ObsidianTikZJaxEnhanced = ObsidianTikZJaxEnhanced;
}

console.log('[ObsidianTikZJaxEnhanced] Class definition completed');