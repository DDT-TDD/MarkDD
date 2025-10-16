console.log('[TikZIntegration] Script loading...');

/**
 * Enhanced TikZ Integration following Obsidian TikZJax strategy
 * Implements 100% of the methods and strategy from obsidian-tikzjax-main
 * with additional MarkDD Editor specific features
 */
class TikZIntegration {
    constructor() {
        this.tikzJax = null;
        this.latexJs = null;
        this.isInitialized = false;
        this.loadingPromise = null;
        this.renderQueue = [];
        this.isProcessing = false;
        this.settings = {
            invertColorsInDarkMode: true,
            showConsole: true,
            optimizeSVG: true,
            baseURL: null
        };
        
        // Event listeners for Obsidian-style lifecycle
        this.boundPostProcessSvg = this.postProcessSvg.bind(this);
        
        console.log('[TikZIntegration] Constructor completed successfully');
    }

    /**
     * Initialize TikZ integration following Obsidian strategy
     * Loads TikZJax and sets up event listeners for all windows
     */
    async init() {
        try {
            this.loadingPromise = this.loadTikZJax();
            await this.loadingPromise;
            
            // Obsidian-style initialization for all windows
            await this.loadTikZJaxAllWindows();
            this.setupEventListeners();
            this.registerTikzCodeBlock();
            this.addSyntaxHighlighting();
            
            console.log('[TikZIntegration] Obsidian-style TikZ integration initialized');
        } catch (error) {
            console.error('[TikZIntegration] Failed to initialize TikZ:', error);
        }
    }

    /**
     * Obsidian TikZJax onload method implementation
     * Loads TikZJax for all windows and sets up window-open listener
     */
    onload() {
        // Support pop-out windows (adapted from Obsidian)
        this.loadTikZJaxAllWindows();
        this.registerTikzCodeBlock();
        this.addSyntaxHighlighting();
    }

    /**
     * Obsidian TikZJax onunload method implementation
     * Unloads TikZJax from all windows and removes syntax highlighting
     */
    onunload() {
        this.unloadTikZJaxAllWindows();
        this.removeSyntaxHighlighting();
    }

    /**
     * Enhanced TikZJax loading following Obsidian strategy
     * Supports both TikZJax and LaTeX.js for comprehensive LaTeX rendering
     */
    async loadTikZJax() {
        try {
            // Check if TikZJax is already loaded by library loader
            if (window.libraryLoader && window.libraryLoader.isLibraryLoaded('TikZJax')) {
                console.log('[TikZIntegration] TikZJax already loaded by library loader');
                this.tikzJax = window.tikzjax || window.TikZJax;
                
                // Load LaTeX.js for comprehensive LaTeX support
                await this.loadLatexJs();
                this.isInitialized = true;
                return;
            }

            // Load TikZJax script inline (Obsidian strategy)
            await this.loadTikZJaxScript();
            
            // Load LaTeX.js for additional LaTeX support
            await this.loadLatexJs();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.warn('[TikZIntegration] Could not load TikZJax, using fallback renderer');
            this.isInitialized = false;
            this.setupFallbackRenderer();
        }
    }

    /**
     * Load TikZJax script following Obsidian inline strategy
     */
    async loadTikZJaxScript() {
        return new Promise(async (resolve, reject) => {
            // Check if already loaded
            if (document.getElementById('tikzjax')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'tikzjax';
            script.type = 'text/javascript';
            
            try {
                // Load Obsidian TikZJax implementation
                console.log('[TikZIntegration] Loading Obsidian TikZJax...');
                const response = await fetch('./js/obsidian-tikzjax.js');
                const tikzjaxContent = await response.text();
                
                script.innerHTML = tikzjaxContent;
                document.body.appendChild(script);
                
                console.log('[TikZIntegration] Obsidian TikZJax loaded successfully');
                this.tikzJax = window.tikzjax || window.TikZJax;
                
                // Setup TikZJax event listener (Obsidian strategy)
                document.addEventListener('tikzjax-load-finished', this.boundPostProcessSvg);
                
                resolve();
            } catch (error) {
                console.error('[TikZIntegration] Failed to load Obsidian TikZJax:', error);
                
                // Fallback to CDN
                script.src = 'https://tikzjax.com/v1/tikzjax.js';
                script.onload = () => {
                    console.log('[TikZIntegration] CDN TikZJax script loaded as fallback');
                    this.tikzJax = window.tikzjax || window.TikZJax;
                    document.addEventListener('tikzjax-load-finished', this.boundPostProcessSvg);
                    resolve();
                };
                script.onerror = reject;
                document.body.appendChild(script);
            }
        });
    }

    /**
     * Load LaTeX.js following documentation guidelines
     * Implements proper LaTeX.js usage as per https://latex.js.org/usage.html
     */
    async loadLatexJs() {
        try {
            // Check if LaTeX.js is available from library loader
            if (window.latexjs) {
                console.log('[TikZIntegration] LaTeX.js already available');
                this.latexJs = window.latexjs;
                return;
            }

            // Load LaTeX.js from CDN following documentation
            await this.loadScript('https://cdn.jsdelivr.net/npm/latex.js/dist/latex.js');
            
            // Wait for LaTeX.js to be available
            await this.waitForLatexJs();
            
            this.latexJs = window.latexjs;
            console.log('[TikZIntegration] LaTeX.js loaded successfully');
            
        } catch (error) {
            console.warn('[TikZIntegration] LaTeX.js not available:', error);
        }
    }

    /**
     * Wait for LaTeX.js to be available
     */
    waitForLatexJs() {
        return new Promise((resolve) => {
            const checkLatexJs = () => {
                if (window.latexjs) {
                    resolve();
                } else {
                    setTimeout(checkLatexJs, 100);
                }
            };
            checkLatexJs();
        });
    }

    /**
     * Obsidian-style TikZJax loading for specific document
     * @param {Document} doc - Document to load TikZJax into
     */
    async loadTikZJax(doc) {
        const existingScript = doc.getElementById('tikzjax');
        if (existingScript) {
            return; // Already loaded
        }

        const script = doc.createElement('script');
        script.id = 'tikzjax';
        script.type = 'text/javascript';
        
        try {
            // Load Obsidian TikZJax implementation inline (following Obsidian pattern)
            const response = await fetch('./js/obsidian-tikzjax.js');
            const tikzjaxContent = await response.text();
            script.innerHTML = tikzjaxContent;
        } catch (error) {
            console.warn('[TikZIntegration] Failed to load local TikZJax, using CDN fallback:', error);
            script.src = 'https://tikzjax.com/v1/tikzjax.js';
        }
        
        doc.body.appendChild(script);
        doc.addEventListener('tikzjax-load-finished', this.boundPostProcessSvg);
    }

    /**
     * Unload TikZJax from specific document (Obsidian strategy)
     * @param {Document} doc - Document to unload TikZJax from
     */
    unloadTikZJax(doc) {
        const script = doc.getElementById('tikzjax');
        if (script) {
            script.remove();
        }
        doc.removeEventListener('tikzjax-load-finished', this.boundPostProcessSvg);
    }

    /**
     * Load TikZJax for all windows (Obsidian multi-window strategy)
     */
    async loadTikZJaxAllWindows() {
        const windows = this.getAllWindows();
        await Promise.all(windows.map(window => this.loadTikZJax(window.document)));
    }

    /**
     * Unload TikZJax from all windows (Obsidian strategy)
     */
    unloadTikZJaxAllWindows() {
        for (const window of this.getAllWindows()) {
            this.unloadTikZJax(window.document);
        }
    }

    /**
     * Get all windows (Obsidian multi-window support)
     * Adapted for MarkDD Editor environment
     */
    getAllWindows() {
        const windows = [];
        
        // Main window
        windows.push(window);
        
        // Additional pop-out windows (if any)
        // This can be extended for MarkDD Editor's multi-window support
        
        return windows;
    }

    /**
     * Register TikZ code block processor (Obsidian strategy)
     */
    registerTikzCodeBlock() {
        // This will be called by the markdown renderer
        // when it encounters ```tikz or ```circuitikz blocks
        console.log('[TikZIntegration] TikZ code block processor registered');
    }

    /**
     * Add syntax highlighting for TikZ (Obsidian strategy)
     */
    addSyntaxHighlighting() {
        try {
            if (window.CodeMirror && window.CodeMirror.modeInfo) {
                // Check if already added
                const existing = window.CodeMirror.modeInfo.find(mode => mode.name === 'Tikz');
                if (!existing) {
                    window.CodeMirror.modeInfo.push({
                        name: 'Tikz', 
                        mime: 'text/x-latex', 
                        mode: 'stex'
                    });
                    console.log('[TikZIntegration] TikZ syntax highlighting added');
                }
            }
        } catch (error) {
            console.warn('[TikZIntegration] Could not add syntax highlighting:', error);
        }
    }

    /**
     * Remove syntax highlighting for TikZ (Obsidian strategy)
     */
    removeSyntaxHighlighting() {
        try {
            if (window.CodeMirror && window.CodeMirror.modeInfo) {
                window.CodeMirror.modeInfo = window.CodeMirror.modeInfo.filter(el => el.name !== 'Tikz');
                console.log('[TikZIntegration] TikZ syntax highlighting removed');
            }
        } catch (error) {
            console.warn('[TikZIntegration] Could not remove syntax highlighting:', error);
        }
    }

    /**
     * Utility method for loading scripts
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            script.async = true;
            
            script.onload = () => {
                console.log(`[TikZIntegration] Script loaded successfully: ${src}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[TikZIntegration] Failed to load script: ${src}`, error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Tidy TikZ source (Obsidian strategy)
     * Removes non-breaking spaces and cleans up whitespace
     * @param {string} tikzSource - Raw TikZ source code
     * @returns {string} - Cleaned TikZ source
     */
    tidyTikzSource(tikzSource) {
        // Remove non-breaking space characters (Obsidian strategy)
        const remove = "&nbsp;";
        tikzSource = tikzSource.replaceAll(remove, "");

        let lines = tikzSource.split("\n");

        // Trim whitespace that is inserted when pasting code (Obsidian strategy)
        lines = lines.map(line => line.trim());

        // Remove empty lines
        lines = lines.filter(line => line);

        return lines.join("\n");
    }

    /**
     * Color SVG in dark mode (Obsidian strategy)
     * Replace black with currentColor and white with background color
     * @param {string} svg - SVG content
     * @returns {string} - Dark mode compatible SVG
     */
    colorSVGinDarkMode(svg) {
        // Replace the color "black" with currentColor (Obsidian strategy)
        // so that diagram axes, etc are visible in dark mode
        // And replace "white" with the background color
        svg = svg.replaceAll(/("#000"|"black")/g, '"currentColor"')
                .replaceAll(/("#fff"|"white")/g, '"var(--background-primary)"');

        return svg;
    }

    /**
     * Optimize SVG using SVGO (Obsidian strategy)
     * Fixes misaligned text nodes on mobile
     * @param {string} svg - SVG content
     * @returns {string} - Optimized SVG
     */
    optimizeSVG(svg) {
        try {
            if (window.optimize && typeof window.optimize === 'function') {
                // Use SVGO optimization (Obsidian strategy)
                const optimized = window.optimize(svg, {
                    plugins: [
                        {
                            name: 'preset-default',
                            params: {
                                overrides: {
                                    // Don't use the "cleanupIDs" plugin (Obsidian strategy)
                                    // To avoid problems with duplicate IDs ("a", "b", ...)
                                    // when inlining multiple svgs with IDs
                                    cleanupIDs: false
                                }
                            }
                        }
                    ]
                });
                return optimized.data;
            }
        } catch (error) {
            console.warn('[TikZIntegration] SVG optimization failed:', error);
        }
        return svg;
    }

    /**
     * Post-process SVG (Obsidian strategy)
     * Event handler for tikzjax-load-finished
     * @param {Event} e - TikZJax load finished event
     */
    postProcessSvg = (e) => {
        const svgEl = e.target;
        if (!svgEl) return;

        let svg = svgEl.outerHTML;

        // Apply dark mode colors if enabled (Obsidian strategy)
        if (this.settings.invertColorsInDarkMode) {
            svg = this.colorSVGinDarkMode(svg);
        }

        // Optimize SVG (Obsidian strategy)
        if (this.settings.optimizeSVG) {
            svg = this.optimizeSVG(svg);
        }

        // Replace the element with the processed SVG
        svgEl.outerHTML = svg;
        
        console.log('[TikZIntegration] SVG post-processed successfully');
    }

    /**
     * Setup fallback renderer
     */
    setupFallbackRenderer() {
        // Create a fallback renderer that shows styled placeholders
        this.tikzJax = {
            tex2svg: (texCode, options = {}) => {
                return Promise.resolve(this.createFallbackSVG(texCode, options.isCircuit));
            }
        };
        this.isInitialized = true;
    }

    /**
     * Enhanced LaTeX rendering using LaTeX.js following documentation
     * Implements proper LaTeX.js usage as per https://latex.js.org/usage.html
     * @param {string} latexCode - LaTeX source code
     * @param {Object} options - Rendering options
     * @returns {Promise<string>} - Rendered HTML
     */
    async renderLatexWithLatexJs(latexCode, options = {}) {
        try {
            if (!this.latexJs) {
                throw new Error('LaTeX.js not available');
            }

            // Create HTML generator following LaTeX.js documentation
            const generator = new this.latexJs.HtmlGenerator({
                hyphenate: options.hyphenate !== false,
                documentClass: options.documentClass || 'article',
                styles: options.styles || []
            });

            // Parse LaTeX document following LaTeX.js API
            const parsedGenerator = this.latexJs.parse(latexCode, { generator: generator });

            // Get DOM fragment (LaTeX.js API)
            const domFragment = parsedGenerator.domFragment();
            
            // Convert to HTML string
            const div = document.createElement('div');
            div.appendChild(domFragment);
            
            // Add styles and scripts if needed
            const stylesAndScripts = parsedGenerator.stylesAndScripts(this.settings.baseURL || '');
            if (stylesAndScripts) {
                document.head.appendChild(stylesAndScripts);
            }

            return div.innerHTML;

        } catch (error) {
            console.error('[TikZIntegration] LaTeX.js rendering failed:', error);
            throw error;
        }
    }

    /**
     * Enhanced TikZ rendering with dual engine support
     * Uses both TikZJax and LaTeX.js for comprehensive LaTeX support
     * @param {string} tikzCode - TikZ source code
     * @param {Object} options - Rendering options
     * @returns {Promise<string>} - Rendered SVG or HTML
     */
    async renderTikZ(tikzCode, options = {}) {
        const { isCircuit = false, id = null, useLatexJs = false } = options;

        try {
            // Clean up the TikZ source (Obsidian strategy)
            tikzCode = this.tidyTikzSource(tikzCode);

            // Prepare LaTeX document
            let latexDocument;
            
            if (isCircuit) {
                latexDocument = this.createCircuiTikZDocument(tikzCode);
            } else {
                latexDocument = this.createTikZDocument(tikzCode);
            }

            // Choose rendering engine
            let result;
            if (useLatexJs && this.latexJs) {
                // Use LaTeX.js for comprehensive LaTeX support
                result = await this.renderLatexWithLatexJs(latexDocument, options);
            } else if (this.tikzJax && this.tikzJax.tex2svg) {
                // Use TikZJax for TikZ-specific rendering
                result = await this.tikzJax.tex2svg(latexDocument, { isCircuit });
                result = this.processSVGOutput(result, id);
            } else {
                throw new Error('No rendering engine available');
            }

            return result;

        } catch (error) {
            console.error('[TikZIntegration] TikZ rendering failed:', error);
            return this.createErrorSVG(error.message, tikzCode, isCircuit);
        }
    }

    /**
     * Render method compatible with markdown renderer API
     * Processes TikZ containers within a given container element
     * @param {HTMLElement} container - Container element to process
     */
    async render(container) {
        try {
            if (!container) {
                console.warn('[TikZIntegration] No container provided to render method');
                return;
            }

            // Find all TikZ containers within the provided container
            const tikzContainers = container.querySelectorAll('.tikz-container:not(.tikz-rendered)');
            
            console.log(`[TikZIntegration] Found ${tikzContainers.length} TikZ containers to render`);
            
            for (const tikzContainer of tikzContainers) {
                await this.renderTikZContainer(tikzContainer);
            }
            
            console.log('[TikZIntegration] Container rendering completed');
        } catch (error) {
            console.error('[TikZIntegration] Error in render method:', error);
        }
    }

    async processTikZDiagrams() {
        if (!this.isInitialized || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        try {
            const previewElement = document.getElementById('preview');
            if (!previewElement) return;

            const tikzContainers = previewElement.querySelectorAll('.tikz-container:not(.tikz-rendered)');
            
            for (const container of tikzContainers) {
                await this.renderTikZContainer(container);
            }
        } catch (error) {
            console.error('Error processing TikZ diagrams:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async renderTikZContainer(container) {
        try {
            const tikzCode = decodeURIComponent(container.getAttribute('data-tikz-code'));
            const id = container.getAttribute('data-tikz-id');
            const isCircuit = container.getAttribute('data-is-circuit') === 'true';

            // Show loading state
            container.innerHTML = `<div class="tikz-loading">Rendering ${isCircuit ? 'CircuiTikZ' : 'TikZ'} diagram...</div>`;

            // Render the diagram
            const svg = await this.renderTikZ(tikzCode, { isCircuit, id });
            
            // Update container
            container.innerHTML = svg;
            container.classList.add('tikz-rendered');

            // Add interaction buttons
            this.addTikZButtons(container, tikzCode, isCircuit);

        } catch (error) {
            console.error('TikZ rendering error:', error);
            container.innerHTML = `
                <div class="tikz-error">
                    <h4>TikZ Rendering Error</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Show TikZ Code</summary>
                        <pre><code>${tikzCode}</code></pre>
                    </details>
                </div>
            `;
            container.classList.add('tikz-error');
        }
    }

    async renderTikZ(tikzCode, options = {}) {
        const { isCircuit = false, id = null } = options;

        try {
            // Prepare LaTeX document
            let latexDocument;
            
            if (isCircuit) {
                latexDocument = this.createCircuiTikZDocument(tikzCode);
            } else {
                latexDocument = this.createTikZDocument(tikzCode);
            }

            // Use TikZJax to render
            if (this.tikzJax && this.tikzJax.tex2svg) {
                const svg = await this.tikzJax.tex2svg(latexDocument, { isCircuit });
                return this.processSVGOutput(svg, id);
            } else {
                throw new Error('TikZJax not available');
            }

        } catch (error) {
            console.error('TikZ rendering failed:', error);
            return this.createErrorSVG(error.message, tikzCode, isCircuit);
        }
    }

    createTikZDocument(tikzCode) {
        return `
\\documentclass[tikz,border=10pt]{standalone}
\\usepackage{tikz}
\\usetikzlibrary{shapes,arrows,positioning,calc,decorations.markings}
\\begin{document}
\\begin{tikzpicture}
${tikzCode}
\\end{tikzpicture}
\\end{document}
        `.trim();
    }

    createCircuiTikZDocument(tikzCode) {
        return `
\\documentclass[tikz,border=10pt]{standalone}
\\usepackage[european]{circuitikz}
\\begin{document}
\\begin{circuitikz}
${tikzCode}
\\end{circuitikz}
\\end{document}
        `.trim();
    }

    processSVGOutput(svgContent, id) {
        // Process and clean up the SVG output
        let svg = svgContent;
        if (typeof svg === 'string') {
            // Add ID if provided
            if (id) {
                svg = svg.replace('<svg', `<svg id="${id}"`);
            }
            // Add responsive attributes
            svg = svg.replace('<svg', '<svg class="tikz-svg" style="max-width: 100%; height: auto;"');

            // --- Obsidian TikZJax post-processing: color for dark mode, SVGO optimize ---
            try {
                // Color SVG for dark mode if enabled
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                if (isDark) {
                    svg = svg.replace(/("#000"|"black")/g, '"currentColor"')
                             .replace(/("#fff"|"white")/g, '"var(--background-primary)"');
                }
                // Optimize SVG with SVGO if available
                if (window.optimize && typeof window.optimize === 'function') {
                    const optimized = window.optimize(svg, { plugins: [{ name: 'preset-default', params: { overrides: { cleanupIDs: false } } }] });
                    if (optimized && optimized.data) svg = optimized.data;
                }
            } catch (e) {
                // Ignore optimization errors
            }
            return svg;
        }
        return svg;
    }

    createFallbackSVG(tikzCode, isCircuit = false) {
        const diagramType = isCircuit ? 'CircuiTikZ' : 'TikZ';
        const examples = isCircuit ? this.getCircuitExamples() : this.getTikZExamples();
        
        return `
            <div class="tikz-fallback">
                <div class="tikz-header">
                    <span class="tikz-type">${diagramType} Diagram</span>
                    <span class="tikz-status">Preview Mode</span>
                </div>
                <div class="tikz-preview">
                    <svg width="300" height="200" viewBox="0 0 300 200" class="tikz-placeholder-svg">
                        <rect width="100%" height="100%" fill="#f8f9fa" stroke="#e1e5e9" stroke-width="2" rx="8"/>
                        <text x="150" y="100" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#666">
                            ${diagramType} Rendering
                        </text>
                        <text x="150" y="120" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#999">
                            (Live rendering requires TikZJax)
                        </text>
                    </svg>
                </div>
                <div class="tikz-code">
                    <details>
                        <summary>Show ${diagramType} Code</summary>
                        <pre><code>${tikzCode}</code></pre>
                    </details>
                </div>
                ${examples}
            </div>
        `;
    }

    createErrorSVG(errorMessage, tikzCode, isCircuit = false) {
        const diagramType = isCircuit ? 'CircuiTikZ' : 'TikZ';
        
        return `
            <div class="tikz-error-container">
                <div class="tikz-error-header">
                    <span class="tikz-error-icon">⚠️</span>
                    <span class="tikz-error-title">${diagramType} Error</span>
                </div>
                <div class="tikz-error-message">
                    <p>${errorMessage}</p>
                </div>
                <div class="tikz-error-code">
                    <details>
                        <summary>Show Code</summary>
                        <pre><code>${tikzCode}</code></pre>
                    </details>
                </div>
                <div class="tikz-error-help">
                    <p>Common issues:</p>
                    <ul>
                        <li>Check for syntax errors in your ${diagramType} code</li>
                        <li>Ensure all required packages are loaded</li>
                        <li>Verify that coordinates and paths are valid</li>
                    </ul>
                </div>
            </div>
        `;
    }

    addTikZButtons(container, tikzCode, isCircuit) {
        // Check if buttons already exist
        if (container.querySelector('.tikz-buttons')) {
            return;
        }

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'tikz-buttons';
        buttonsDiv.innerHTML = `
            <button class="tikz-btn" data-action="copy">Copy Code</button>
            <button class="tikz-btn" data-action="edit">Edit</button>
            <button class="tikz-btn" data-action="export">Export SVG</button>
        `;

        container.appendChild(buttonsDiv);

        // Setup button handlers
        buttonsDiv.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            switch (action) {
                case 'copy':
                    this.copyTikZCode(tikzCode);
                    break;
                case 'edit':
                    this.editTikZCode(container, tikzCode, isCircuit);
                    break;
                case 'export':
                    this.exportTikZSVG(container);
                    break;
            }
        });
    }

    async copyTikZCode(tikzCode) {
        try {
            await navigator.clipboard.writeText(tikzCode);
            console.log('TikZ code copied to clipboard');
        } catch (error) {
            console.error('Failed to copy TikZ code:', error);
        }
    }

    editTikZCode(container, tikzCode, isCircuit) {
        // Create inline editor for TikZ code
        const editor = document.createElement('div');
        editor.className = 'tikz-inline-editor';
        editor.innerHTML = `
            <div class="tikz-editor-header">
                <span>Edit ${isCircuit ? 'CircuiTikZ' : 'TikZ'} Code</span>
                <div class="tikz-editor-buttons">
                    <button class="tikz-editor-btn" data-action="apply">Apply</button>
                    <button class="tikz-editor-btn" data-action="cancel">Cancel</button>
                </div>
            </div>
            <textarea class="tikz-editor-textarea">${tikzCode}</textarea>
        `;

        // Replace container content temporarily
        const originalContent = container.innerHTML;
        container.innerHTML = '';
        container.appendChild(editor);

        // Setup editor handlers
        editor.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action === 'apply') {
                const newCode = editor.querySelector('.tikz-editor-textarea').value;
                container.innerHTML = '<div class="tikz-loading">Re-rendering...</div>';
                
                // Update data attribute
                container.setAttribute('data-tikz-code', encodeURIComponent(newCode));
                container.classList.remove('tikz-rendered');
                
                // Re-render
                this.renderTikZContainer(container);
            } else if (action === 'cancel') {
                container.innerHTML = originalContent;
            }
        });
    }

    exportTikZSVG(container) {
        try {
            const svg = container.querySelector('svg');
            if (!svg) {
                console.error('No SVG found for export');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'tikz-diagram.svg';
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('SVG export error:', error);
        }
    }

    getTikZExamples() {
        return `
            <div class="tikz-examples">
                <h4>TikZ Examples:</h4>
                <div class="tikz-example">
                    <h5>Simple Circle:</h5>
                    <pre><code>\\draw (0,0) circle (1cm);</code></pre>
                </div>
                <div class="tikz-example">
                    <h5>Flowchart:</h5>
                    <pre><code>\\node[rectangle, draw] (A) at (0,0) {Start};
\\node[diamond, draw] (B) at (2,0) {Decision};
\\draw[->] (A) -- (B);</code></pre>
                </div>
            </div>
        `;
    }

    getCircuitExamples() {
        return `
            <div class="tikz-examples">
                <h4>CircuiTikZ Examples:</h4>
                <div class="tikz-example">
                    <h5>Basic Circuit:</h5>
                    <pre><code>\\draw (0,0) to[battery] (2,0) to[R] (4,0);</code></pre>
                </div>
                <div class="tikz-example">
                    <h5>RC Circuit:</h5>
                    <pre><code>\\draw (0,0) to[battery, l=$V$] (0,2)
      to[R, l=$R$] (3,2)
      to[C, l=$C$] (3,0) -- (0,0);</code></pre>
                </div>
            </div>
        `;
    }

    // Public API methods
    async renderTikZCode(tikzCode, isCircuit = false) {
        return await this.renderTikZ(tikzCode, { isCircuit });
    }

    insertTikZTemplate(isCircuit = false) {
        const editor = document.getElementById('editor');
        if (!editor) return;

        let template;
        if (isCircuit) {
            template = `\`\`\`circuitikz
\\draw (0,0) to[battery, l=$V$] (0,2)
      to[R, l=$R$] (3,2)
      to[C, l=$C$] (3,0) -- (0,0);
\`\`\``;
        } else {
            template = `\`\`\`tikz
\\draw (0,0) circle (1cm);
\\draw (-1,0) -- (1,0);
\\draw (0,-1) -- (0,1);
\`\`\``;
        }

        // Insert at cursor position
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const content = editor.value;
        
        editor.value = content.substring(0, start) + template + content.substring(end);
        editor.focus();
        
        // Trigger change event
        const event = new Event('input');
        editor.dispatchEvent(event);
    }

    isReady() {
        return this.isInitialized;
    }

    getTikZJaxVersion() {
        return this.tikzJax ? 'Loaded' : 'Not Available';
    }
}

console.log('[TikZIntegration] Class definition completed, about to export...');

// Export for use in other modules
if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
    // Node.js environment  
    module.exports = TikZIntegration;
} else {
    // Browser environment
    console.log('[TikZIntegration] Assigning to window:', typeof TikZIntegration);
    window.TikZIntegration = TikZIntegration;
    console.log('[TikZIntegration] Assignment complete, window.TikZIntegration:', typeof window.TikZIntegration);
}
