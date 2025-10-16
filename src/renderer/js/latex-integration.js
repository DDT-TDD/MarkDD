/**
 * Enhanced LaTeX.js Integration for MarkDD Editor
 * Provides comprehensive LaTeX document rendering with advanced features
 * Based on LaTeX.js library patterns and Reference folder implementations
 */

console.log('[LaTeXIntegration] Loading enhanced LaTeX.js integration...');

class LaTeXIntegration {
    constructor() {
        this.isInitialized = false;
        this.latex = null;
        this.loadingPromise = null;
        this.processedElements = new Set();
        
        // Enhanced LaTeX configuration
        this.config = {
            // Generator options
            generator: {
                hyphenate: false,
                baseURL: '',
                documentClass: 'article',
                packages: ['amsmath', 'amssymb', 'amsfonts', 'amsthm'],
                macros: {},
                customCommands: {}
            },
            
            // Parser options
            parser: {
                strict: false,
                errorRecovery: true,
                extensions: ['math', 'theorem', 'bibliography']
            },
            
            // Display options
            display: {
                showSource: true,
                showLineNumbers: false,
                enableInteraction: true,
                enableExport: true,
                theme: 'default'
            }
        };
        
        // Custom macros and commands
        this.customMacros = {
            '\\RR': '\\mathbb{R}',
            '\\CC': '\\mathbb{C}',
            '\\NN': '\\mathbb{N}',
            '\\ZZ': '\\mathbb{Z}',
            '\\QQ': '\\mathbb{Q}',
            '\\implies': '\\Rightarrow',
            '\\iff': '\\Leftrightarrow',
            '\\eps': '\\varepsilon',
            '\\abs': '\\left| #1 \\right|',
            '\\norm': '\\left\\| #1 \\right\\|'
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('[LaTeXIntegration] Initializing enhanced LaTeX.js integration...');
            
            // Load LaTeX.js library
            await this.loadLaTeXLibrary();
            
            // Setup enhanced features
            this.setupEnhancedFeatures();
            
            // Register event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('[LaTeXIntegration] Enhanced LaTeX.js integration initialized successfully');
            
        } catch (error) {
            console.error('[LaTeXIntegration] Failed to initialize LaTeX integration:', error);
            this.setupFallback();
        }
    }

    /**
     * Load LaTeX.js library with proper error handling
     */
    async loadLaTeXLibrary() {
        // Check if LaTeX.js is already loaded
        if (window.LaTeX) {
            console.log('[LaTeXIntegration] LaTeX.js already available');
            this.latex = window.LaTeX;
            return;
        }

        // Prevent multiple loading attempts
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.performLibraryLoad();
        return this.loadingPromise;
    }

    async performLibraryLoad() {
        try {
            console.log('[LaTeXIntegration] Loading LaTeX.js library...');
            
            // Load LaTeX.js from CDN
            await this.loadScript('https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js');
            
            // Wait for LaTeX to be available
            await this.waitForLaTeX();
            
            this.latex = window.LaTeX;
            console.log('[LaTeXIntegration] LaTeX.js loaded successfully');
            
        } catch (error) {
            console.warn('[LaTeXIntegration] Failed to load LaTeX.js, setting up fallback');
            window.LaTeXLoadFailed = true;
            throw error;
        }
    }

    /**
     * Setup enhanced features and configurations
     */
    setupEnhancedFeatures() {
        if (!this.latex) return;

        try {
            // Extend LaTeX parser with custom macros
            this.extendParser();
            
            // Setup document templates
            this.setupDocumentTemplates();
            
            // Configure enhanced generator
            this.setupEnhancedGenerator();
            
            console.log('[LaTeXIntegration] Enhanced features configured');
            
        } catch (error) {
            console.warn('[LaTeXIntegration] Failed to setup enhanced features:', error);
        }
    }

    /**
     * Extend LaTeX parser with custom macros and commands
     */
    extendParser() {
        if (!this.latex || !this.latex.macros) return;

        // Add custom macros
        Object.assign(this.latex.macros, this.customMacros);
        
        // Add theorem environments
        this.latex.macros['\\newtheorem'] = (name, displayName) => {
            this.latex.macros[`\\begin{${name}}`] = `<div class="theorem theorem-${name}"><strong>${displayName}:</strong> `;
            this.latex.macros[`\\end{${name}}`] = '</div>';
        };
        
        console.log('[LaTeXIntegration] Parser extended with custom macros');
    }

    /**
     * Setup document templates for common LaTeX document types
     */
    setupDocumentTemplates() {
        this.templates = {
            article: {
                class: 'article',
                packages: ['amsmath', 'amssymb', 'amsfonts'],
                geometry: 'margin=1in'
            },
            report: {
                class: 'report',
                packages: ['amsmath', 'amssymb', 'amsfonts', 'graphicx'],
                geometry: 'margin=1.25in'
            },
            letter: {
                class: 'letter',
                packages: ['geometry'],
                geometry: 'margin=1in'
            },
            beamer: {
                class: 'beamer',
                packages: ['amsmath', 'amssymb'],
                theme: 'default'
            }
        };
    }

    /**
     * Setup enhanced HTML generator with better styling
     */
    setupEnhancedGenerator() {
        if (!this.latex.HtmlGenerator) return;

        // Create custom CSS for LaTeX documents
        this.addLaTeXStyles();
        
        console.log('[LaTeXIntegration] Enhanced generator configured');
    }

    /**
     * Add comprehensive CSS styling for LaTeX documents
     */
    addLaTeXStyles() {
        const styleId = 'latex-enhanced-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            .latex-document-enhanced {
                max-width: 800px;
                margin: 20px auto;
                padding: 30px;
                background: #fff;
                border: 1px solid #e1e5e9;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                font-family: 'Computer Modern', 'Latin Modern Roman', serif;
                line-height: 1.6;
                color: #333;
            }
            
            .latex-document-enhanced h1 {
                text-align: center;
                font-size: 1.8em;
                margin-bottom: 10px;
                color: #2c3e50;
            }
            
            .latex-document-enhanced .author {
                text-align: center;
                font-style: italic;
                margin-bottom: 20px;
                color: #666;
            }
            
            .latex-document-enhanced .date {
                text-align: center;
                margin-bottom: 30px;
                color: #666;
            }
            
            .latex-document-enhanced h2 {
                font-size: 1.4em;
                margin-top: 30px;
                margin-bottom: 15px;
                color: #2c3e50;
                border-bottom: 1px solid #eee;
                padding-bottom: 5px;
            }
            
            .latex-document-enhanced h3 {
                font-size: 1.2em;
                margin-top: 25px;
                margin-bottom: 12px;
                color: #34495e;
            }
            
            .latex-document-enhanced .theorem {
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 4px 4px 0;
            }
            
            .latex-document-enhanced .theorem strong {
                color: #007bff;
            }
            
            .latex-document-enhanced .proof {
                margin: 15px 0;
                font-style: italic;
            }
            
            .latex-document-enhanced .proof::before {
                content: "Proof: ";
                font-weight: bold;
                font-style: normal;
            }
            
            .latex-document-enhanced .proof::after {
                content: "□";
                float: right;
                font-weight: bold;
            }
            
            .latex-document-enhanced .abstract {
                background: #f8f9fa;
                padding: 20px;
                margin: 25px 0;
                border-radius: 4px;
                font-style: italic;
            }
            
            .latex-document-enhanced .abstract::before {
                content: "Abstract";
                display: block;
                font-weight: bold;
                font-style: normal;
                margin-bottom: 10px;
                text-align: center;
            }
            
            .latex-document-enhanced .bibliography {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #eee;
            }
            
            .latex-document-enhanced .bibliography h2 {
                border-bottom: none;
                margin-bottom: 20px;
            }
            
            .latex-document-enhanced .bibliography ol {
                padding-left: 20px;
            }
            
            .latex-document-enhanced .bibliography li {
                margin-bottom: 10px;
                line-height: 1.5;
            }
            
            .latex-toolbar {
                position: absolute;
                top: 10px;
                right: 10px;
                display: flex;
                gap: 8px;
                z-index: 100;
            }
            
            .latex-toolbar button {
                padding: 6px 12px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background-color 0.2s;
            }
            
            .latex-toolbar button:hover {
                background: #0056b3;
            }
            
            .latex-source-toggle {
                margin-top: 20px;
                text-align: center;
            }
            
            .latex-source {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 15px;
                margin-top: 15px;
                font-family: 'Courier New', monospace;
                font-size: 0.9em;
                line-height: 1.4;
                overflow-x: auto;
            }
            
            .latex-error-enhanced {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .latex-error-enhanced h4 {
                margin-top: 0;
                color: #721c24;
            }
            
            .latex-loading-enhanced {
                text-align: center;
                padding: 40px;
                color: #666;
            }
            
            .latex-loading-enhanced::before {
                content: "📄";
                font-size: 48px;
                display: block;
                margin-bottom: 15px;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Enhanced LaTeX document rendering
     */
    async renderDocument(code, options = {}) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.latex) {
                return this.renderFallback(code);
            }

            const config = { ...this.config, ...options };
            
            // Parse the LaTeX document
            const generator = new this.latex.HtmlGenerator({
                ...config.generator,
                baseURL: config.generator.baseURL || '',
                macros: { ...this.customMacros, ...config.generator.macros }
            });

            console.log('[LaTeXIntegration] Parsing LaTeX document...');
            const doc = this.latex.parse(code, { generator });
            
            // Create enhanced container
            const container = document.createElement('div');
            container.className = 'latex-document-enhanced';
            
            // Add toolbar
            if (config.display.enableInteraction) {
                container.appendChild(this.createToolbar(code));
            }
            
            // Add document content
            const content = document.createElement('div');
            content.className = 'latex-content';
            content.appendChild(doc.documentElement);
            container.appendChild(content);
            
            // Add source toggle if enabled
            if (config.display.showSource) {
                container.appendChild(this.createSourceToggle(code));
            }
            
            console.log('[LaTeXIntegration] LaTeX document rendered successfully');
            return container.outerHTML;
            
        } catch (error) {
            console.error('[LaTeXIntegration] LaTeX rendering error:', error);
            return this.renderError(error, code);
        }
    }

    /**
     * Create interactive toolbar for LaTeX documents
     */
    createToolbar(code) {
        const toolbar = document.createElement('div');
        toolbar.className = 'latex-toolbar';
        
        // Export PDF button (placeholder)
        const pdfBtn = document.createElement('button');
        pdfBtn.textContent = 'Export PDF';
        pdfBtn.title = 'Export as PDF (requires server)';
        pdfBtn.onclick = () => this.exportPDF(code);
        toolbar.appendChild(pdfBtn);
        
        // Copy LaTeX button
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy LaTeX';
        copyBtn.title = 'Copy LaTeX source to clipboard';
        copyBtn.onclick = () => this.copyToClipboard(code);
        toolbar.appendChild(copyBtn);
        
        // Full screen button
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.textContent = 'Fullscreen';
        fullscreenBtn.title = 'View in fullscreen';
        fullscreenBtn.onclick = () => this.showFullscreen(code);
        toolbar.appendChild(fullscreenBtn);
        
        return toolbar;
    }

    /**
     * Create source code toggle
     */
    createSourceToggle(code) {
        const container = document.createElement('div');
        container.className = 'latex-source-toggle';
        
        const button = document.createElement('button');
        button.textContent = 'Show LaTeX Source';
        button.className = 'btn btn-outline-secondary btn-sm';
        button.onclick = () => {
            const sourceDiv = container.querySelector('.latex-source');
            if (sourceDiv.style.display === 'none') {
                sourceDiv.style.display = 'block';
                button.textContent = 'Hide LaTeX Source';
            } else {
                sourceDiv.style.display = 'none';
                button.textContent = 'Show LaTeX Source';
            }
        };
        
        const sourceDiv = document.createElement('div');
        sourceDiv.className = 'latex-source';
        sourceDiv.style.display = 'none';
        sourceDiv.innerHTML = `<pre><code>${this.escapeHtml(code)}</code></pre>`;
        
        container.appendChild(button);
        container.appendChild(sourceDiv);
        
        return container;
    }

    /**
     * Render fallback when LaTeX.js is not available
     */
    renderFallback(code) {
        console.log('[LaTeXIntegration] Using enhanced fallback renderer');
        
        // Use the enhanced fallback from latex-fallback.js
        if (window.LaTeX && typeof window.LaTeX === 'function') {
            try {
                const latexObj = window.LaTeX(code);
                return latexObj.render();
            } catch (error) {
                console.warn('[LaTeXIntegration] Fallback render failed:', error);
            }
        }
        
        // Basic fallback
        return `
            <div class="latex-document-enhanced">
                <div class="latex-error-enhanced">
                    <h4>LaTeX.js Not Available</h4>
                    <p>LaTeX.js library could not be loaded. Basic fallback rendering is not sufficient for this document.</p>
                    <details>
                        <summary>Show LaTeX Source</summary>
                        <div class="latex-source">
                            <pre><code>${this.escapeHtml(code)}</code></pre>
                        </div>
                    </details>
                    <p><small>
                        <strong>Troubleshooting:</strong><br>
                        • Check your internet connection<br>
                        • Refresh the page to retry loading<br>
                        • Use simplified LaTeX syntax for better compatibility
                    </small></p>
                </div>
            </div>
        `;
    }

    /**
     * Render error with enhanced styling
     */
    renderError(error, code) {
        return `
            <div class="latex-document-enhanced">
                <div class="latex-error-enhanced">
                    <h4>LaTeX Rendering Error</h4>
                    <p><strong>Error:</strong> ${this.escapeHtml(error.message)}</p>
                    <details>
                        <summary>Show LaTeX Source</summary>
                        <div class="latex-source">
                            <pre><code>${this.escapeHtml(code)}</code></pre>
                        </div>
                    </details>
                    <p><small>
                        <strong>Common Issues:</strong><br>
                        • Check for missing braces or environments<br>
                        • Verify command syntax and package requirements<br>
                        • Ensure proper document structure
                    </small></p>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for enhanced features
     */
    setupEventListeners() {
        // Listen for LaTeX document processing requests
        document.addEventListener('latex-process', (event) => {
            if (event.detail && event.detail.code) {
                this.renderDocument(event.detail.code, event.detail.options);
            }
        });
    }

    /**
     * Setup fallback when LaTeX.js fails to load
     */
    setupFallback() {
        console.log('[LaTeXIntegration] Setting up enhanced fallback mode');
        this.isInitialized = true; // Allow fallback operations
        
        // Ensure fallback script is loaded
        if (!window.LaTeXFallbackLoaded) {
            this.loadScript('./src/renderer/js/latex-fallback.js');
        }
    }

    // Utility methods
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('[LaTeXIntegration] LaTeX source copied to clipboard');
        } catch (error) {
            console.warn('[LaTeXIntegration] Failed to copy to clipboard:', error);
        }
    }

    exportPDF(code) {
        console.log('[LaTeXIntegration] PDF export requested (requires server implementation)');
        // This would require a server-side LaTeX compiler
        alert('PDF export requires server-side LaTeX compilation. Feature not implemented yet.');
    }

    showFullscreen(code) {
        console.log('[LaTeXIntegration] Fullscreen view requested');
        // This could open the LaTeX document in a modal or new window
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>LaTeX Document</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: serif; }
                    ${document.getElementById('latex-enhanced-styles')?.textContent || ''}
                </style>
            </head>
            <body>
                ${this.renderDocument(code)}
            </body>
            </html>
        `);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.type = 'text/javascript';
            script.async = true;
            
            script.onload = () => {
                console.log(`[LaTeXIntegration] Script loaded: ${src}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[LaTeXIntegration] Failed to load: ${src}`, error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    waitForLaTeX() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds timeout
            
            const checkLaTeX = () => {
                attempts++;
                
                if (window.LaTeX && window.LaTeX.parse && window.LaTeX.HtmlGenerator) {
                    console.log('[LaTeXIntegration] LaTeX.js available after', attempts, 'attempts');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('[LaTeXIntegration] Timeout waiting for LaTeX.js');
                    reject(new Error('Timeout waiting for LaTeX.js'));
                } else {
                    setTimeout(checkLaTeX, 100);
                }
            };
            
            checkLaTeX();
        });
    }

    // Public API
    isReady() {
        return this.isInitialized;
    }

    getLaTeXVersion() {
        return this.latex ? 'Loaded' : 'Not Available';
    }

    async processLaTeXElement(element, code) {
        try {
            const html = await this.renderDocument(code);
            element.innerHTML = html;
            element.classList.add('latex-enhanced-processed');
            this.processedElements.add(element);
        } catch (error) {
            console.error('[LaTeXIntegration] Failed to process element:', error);
            element.innerHTML = this.renderError(error, code);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LaTeXIntegration;
} else {
    window.LaTeXIntegration = LaTeXIntegration;
}

// Immediately expose the class
window.LaTeXIntegration = LaTeXIntegration;

console.log('[LaTeXIntegration] Enhanced LaTeX.js integration module loaded and exported to window');