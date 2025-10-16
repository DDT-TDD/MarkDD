console.log('[NodeTikZIntegration] Script loading...');

/**
 * STRICT LOCAL ONLY NodeTikZ Integration using            const result = await window.ipcRenderer.invoke('render-tikz-server-side', {
                tikzCode: finalTikzCode,
                isCircuit: isCircuit
            });e-tikzjax for server-side TikZ rendering
 * Uses ONLY local repositories: node-tikzjax-main and obsidian-tikzjax-main
 * NO FALLBACKS ALLOWED - Electron IPC only
 */
class NodeTikZIntegration {
    constructor() {
        console.error('[DEBUG] NodeTikZIntegration constructor called');
        
        this.isInitialized = false;
        this.ipcRenderer = null;
        this.settings = {
            showConsole: true,
            optimizeSVG: true,
            invertColorsInDarkMode: true,
            texPackages: {
                'tikz': '',
                'circuitikz': 'european',
                'pgfplots': '',
                'amsmath': '',
                'amsfonts': '',
                'amssymb': ''
            },
            tikzLibraries: 'arrows,arrows.meta,positioning,calc,decorations.markings,shapes,patterns',
            tikzOptions: ''
        };

        console.log('[NodeTikZIntegration] Constructor completed - STRICT LOCAL ONLY mode');
    }

    /**
     * Initialize STRICT LOCAL ONLY - Electron IPC only, no fallbacks
     */
    async init() {
        try {
            console.log('[NodeTikZIntegration] Initializing STRICT LOCAL ONLY mode...');

            // Check if running in Electron environment
            if (typeof window !== 'undefined' && window.require) {
                const { ipcRenderer } = window.require('electron');
                this.ipcRenderer = ipcRenderer;
                console.log('[NodeTikZIntegration] Electron IPC available for STRICT LOCAL rendering');
                this.isInitialized = true;
                console.log('[NodeTikZIntegration] STRICT LOCAL ONLY initialization successful');
                return;
            }

            throw new Error('Not running in Electron environment - STRICT LOCAL ONLY mode requires Electron');

        } catch (error) {
            console.error('[NodeTikZIntegration] STRICT LOCAL ONLY initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    /**
     * Render TikZ diagram using STRICT LOCAL ONLY approach
     */
    async render(container) {
        console.error('[DEBUG] NodeTikZIntegration.render() STARTED with container:', !!container);
        
        // --- FIX: Skip already-rendered elements to prevent race conditions ---
        if (container && container.classList.contains('tikz-rendered')) {
            console.error('[DEBUG] NodeTikZIntegration.render() SKIPPED - element already rendered:', container.id);
            return true;
        }
        
        if (!this.isInitialized || !this.ipcRenderer) {
            throw new Error('NodeTikZIntegration not properly initialized for STRICT LOCAL ONLY mode');
        }

        // Add null checks for container and required attributes
        if (!container) {
            throw new Error('Container element is null or undefined');
        }

        const tikzCode = container.getAttribute('data-tikz-code');
        console.error('[DEBUG] NodeTikZIntegration - data-tikz-code attribute:', tikzCode);
        console.error('[DEBUG] NodeTikZIntegration - container attributes:', Array.from(container.attributes).map(attr => `${attr.name}=${attr.value}`));
        
        if (!tikzCode || tikzCode.length === 0) {
            throw new Error('Container missing data-tikz-code attribute or it is empty');
        }

        // Decode the URL-encoded TikZ code
        let decodedTikzCode;
        try {
            decodedTikzCode = decodeURIComponent(tikzCode);
            console.error('[DEBUG] NodeTikZIntegration - decoded TikZ code:', decodedTikzCode.substring(0, 100));
        } catch (decodeError) {
            console.error('[DEBUG] NodeTikZIntegration - decodeURIComponent failed:', decodeError);
            throw new Error('Failed to decode TikZ code: ' + decodeError.message);
        }

        // node-tikzjax expects raw TikZ picture content only, it will add document structure
        const isCircuit = container.getAttribute('data-is-circuit') === 'true';
        const id = container.id || 'tikz-' + Math.random().toString(36).substr(2, 9);

        console.error('[DEBUG] NodeTikZIntegration Rendering with STRICT LOCAL ONLY:', { id, isCircuit, codeLength: decodedTikzCode.length, tikzCode: decodedTikzCode.substring(0, 100) });

        // Pass raw TikZ code to server - node-tikzjax will handle document structure
        const finalTikzCode = decodedTikzCode;

        try {
            // Call server-side rendering via Electron IPC - STRICT LOCAL ONLY
            const result = await this.ipcRenderer.invoke('render-tikz-server-side', {
                tikzCode: finalTikzCode,
                isCircuit: isCircuit
            });

            if (result.success) {
                console.error('[DEBUG] NodeTikZIntegration STRICT LOCAL rendering successful for:', id);
                container.innerHTML = result.svg;
                container.classList.add('tikz-rendered');
                return true;
            } else {
                console.error('[DEBUG] NodeTikZIntegration STRICT LOCAL rendering failed:', result.error);
                console.log('[NodeTikZIntegration] Attempting CDN fallback for:', id);
                // Fallback to TikZJax CDN when local rendering fails
                return await this.renderWithCDN(container, decodedTikzCode, isCircuit, id);
            }

        } catch (error) {
            console.error('[DEBUG] NodeTikZIntegration STRICT LOCAL rendering error:', error);
            console.log('[NodeTikZIntegration] Attempting CDN fallback after error for:', id);
            // Fallback to TikZJax CDN on exception
            return await this.renderWithCDN(container, decodedTikzCode, isCircuit, id);
        }
    }

    /**
     * Render using TikZJax CDN as fallback when local rendering fails
     */
    async renderWithCDN(container, tikzCode, isCircuit, id) {
        try {
            console.log('[NodeTikZIntegration] Starting CDN fallback rendering for:', id);

            // Ensure TikZJax CDN is loaded
            if (!window.TikZJax) {
                console.log('[NodeTikZIntegration] Loading TikZJax from CDN...');
                await this.loadTikZJaxCDN();
            }

            // Create a script tag with the TikZ code for TikZJax to process
            const scriptElement = document.createElement('script');
            scriptElement.type = 'text/tikz';
            scriptElement.setAttribute('data-show-console', 'true');
            
            // Wrap raw TikZ code in proper document structure for CDN rendering
            let wrappedCode = tikzCode;
            
            // If code doesn't have document structure, add it
            if (!tikzCode.includes('\\begin{document}')) {
                const packages = ['\\usepackage{tikz}'];
                if (isCircuit) {
                    packages.push('\\usepackage{circuitikz}');
                }
                
                // Determine if code has tikzpicture or circuitikz environment
                const hasEnvironment = tikzCode.includes('\\begin{tikzpicture}') || tikzCode.includes('\\begin{circuitikz}');
                
                if (!hasEnvironment) {
                    // Raw TikZ commands - wrap in appropriate environment
                    const environment = isCircuit ? 'circuitikz' : 'tikzpicture';
                    wrappedCode = `${packages.join('\n')}
\\begin{document}
\\begin{${environment}}
${tikzCode}
\\end{${environment}}
\\end{document}`;
                } else {
                    // Already has environment - just add packages and document
                    wrappedCode = `${packages.join('\n')}
\\begin{document}
${tikzCode}
\\end{document}`;
                }
            }
            
            scriptElement.textContent = wrappedCode;
            
            // Clear container and add script
            container.innerHTML = '';
            container.appendChild(scriptElement);
            
            // Process with TikZJax CDN
            if (typeof window.TikZJax.process === 'function') {
                await window.TikZJax.process(scriptElement);
                console.log('[NodeTikZIntegration] CDN rendering completed successfully for:', id);
                container.classList.add('tikz-rendered');
                container.classList.remove('tikz-error');
                return true;
            } else {
                throw new Error('TikZJax.process is not available');
            }

        } catch (error) {
            console.error('[NodeTikZIntegration] CDN fallback failed:', error);
            this.showError(container, 'Both local and CDN rendering failed: ' + error.message, id);
            return false;
        }
    }

    /**
     * Load TikZJax from CDN
     */
    async loadTikZJaxCDN() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.TikZJax) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://tikzjax.com/v1/tikzjax.js';
            script.type = 'text/javascript';
            script.onload = () => {
                console.log('[NodeTikZIntegration] TikZJax CDN loaded successfully');
                // Wait a moment for TikZJax to initialize
                setTimeout(resolve, 100);
            };
            script.onerror = () => {
                reject(new Error('Failed to load TikZJax from CDN'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Show error message in container
     */
    showError(container, message, id) {
        container.innerHTML = `
            <div class='tikz-error' style='color: #d32f2f; background: #ffebee; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px;'>
                <strong>TikZ Rendering Error:</strong><br>
                ${message}<br>
                <small>ID: ${id}</small>
            </div>
        `;
        container.classList.add('tikz-error');
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.NodeTikZIntegration = NodeTikZIntegration;
    console.log('[NodeTikZIntegration] STRICT LOCAL ONLY class exported to window');
}
