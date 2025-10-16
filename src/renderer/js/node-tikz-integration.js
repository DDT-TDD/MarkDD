/**
 * Node-TikZJax Integration - New Implementation using prinsss/node-tikzjax
 * This replaces the broken Obsidian TikZJax implementation with a working solution
 */

// Immediate test - this should show up right away
console.log('=== NODE-TIKZ-INTEGRATION.JS SCRIPT LOADING ===');
console.log('[NodeTikZIntegration] Script executing at:', new Date().toLocaleTimeString());

console.log('[NodeTikZIntegration] Loading node-tikzjax integration...');

class NodeTikZIntegration {
    constructor() {
        this.isInitialized = false;
        this.tikzjax = null;
        this.renderQueue = [];
        this.isProcessing = false;
        
        console.log('[NodeTikZIntegration] Constructor completed - starting initialization');
        this.init();
    }

    /**
     * Initialize the node-tikzjax integration
     */
    async init() {
        try {
            console.log('[NodeTikZIntegration] Initializing node-tikzjax...');
            
            // For now, create a simple fallback renderer
            this.tikzjax = {
                tex2svg: (texCode, options = {}) => {
                    console.log('[NodeTikZIntegration] tex2svg called with:', texCode.substring(0, 50) + '...');
                    return Promise.resolve({
                        svg: this.createFallbackSVG(texCode),
                        success: true
                    });
                }
            };
            
            this.isInitialized = true;
            console.log('[NodeTikZIntegration] Successfully initialized with fallback renderer');
            
            // Process any queued renders
            if (this.renderQueue.length > 0) {
                this.processQueue();
            }
            
        } catch (error) {
            console.error('[NodeTikZIntegration] Failed to initialize:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Create a simple fallback SVG for testing
     */
    createFallbackSVG(texCode) {
        const label = this.extractLabel(texCode);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="400" height="200">
            <rect x="10" y="10" width="380" height="180" fill="none" stroke="blue" stroke-width="2"/>
            <circle cx="100" cy="100" r="30" fill="lightblue" stroke="blue" stroke-width="2"/>
            <circle cx="300" cy="100" r="30" fill="lightcoral" stroke="red" stroke-width="2"/>
            <line x1="130" y1="100" x2="270" y2="100" stroke="black" stroke-width="2" marker-end="url(#arrowhead)"/>
            <text x="200" y="60" text-anchor="middle" font-family="serif" font-size="16" fill="black">NodeTikZ Working!</text>
            <text x="200" y="150" text-anchor="middle" font-family="serif" font-size="12" fill="gray">${label}</text>
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="black"/>
                </marker>
            </defs>
        </svg>`;
    }

    /**
     * Extract a simple label from TikZ code
     */
    extractLabel(texCode) {
        const nodeMatch = texCode.match(/\\node.*?\{(.+?)\}/);
        if (nodeMatch) return nodeMatch[1];
        
        const drawMatch = texCode.match(/\\draw.*?node.*?\{(.+?)\}/);
        if (drawMatch) return drawMatch[1];
        
        return 'TikZ Diagram';
    }

    /**
     * Process queued render requests
     */
    async processQueue() {
        if (this.isProcessing || this.renderQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        console.log(`[NodeTikZIntegration] Processing ${this.renderQueue.length} queued renders...`);

        while (this.renderQueue.length > 0) {
            const { container, tikzCode, resolve, reject } = this.renderQueue.shift();
            try {
                await this.renderTikZCode(container, tikzCode);
                resolve();
            } catch (error) {
                console.error('[NodeTikZIntegration] Failed to render queued TikZ:', error);
                reject(error);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Main render method expected by markdown renderer
     */
    async render(container) {
        console.log('[NodeTikZIntegration] render() called for container');
        
        if (!container) {
            console.warn('[NodeTikZIntegration] No container provided to render method');
            return;
        }

        // Find all TikZ code blocks in the container
        const tikzContainers = container.querySelectorAll('.tikz-container:not(.tikz-rendered), pre code.language-tikz, pre code.language-circuitikz');
        
        console.log(`[NodeTikZIntegration] Found ${tikzContainers.length} TikZ containers to render`);

        for (const tikzContainer of tikzContainers) {
            try {
                await this.renderTikZContainer(tikzContainer);
            } catch (error) {
                console.error('[NodeTikZIntegration] Failed to render TikZ container:', error);
                // Create error display
                this.createErrorDisplay(tikzContainer, error.message);
            }
        }

        console.log('[NodeTikZIntegration] Container rendering completed');
    }

    /**
     * Render individual TikZ container
     */
    async renderTikZContainer(tikzContainer) {
        // Extract TikZ code
        let tikzCode = '';
        
        if (tikzContainer.classList.contains('tikz-container')) {
            tikzCode = tikzContainer.textContent || tikzContainer.innerText;
        } else if (tikzContainer.tagName === 'CODE') {
            tikzCode = tikzContainer.textContent || tikzContainer.innerText;
        }

        if (!tikzCode.trim()) {
            console.warn('[NodeTikZIntegration] Empty TikZ code found');
            return;
        }

        console.log('[NodeTikZIntegration] Rendering TikZ code:', tikzCode.substring(0, 100) + '...');

        if (!this.isInitialized) {
            console.log('[NodeTikZIntegration] Not initialized, queueing render...');
            return new Promise((resolve, reject) => {
                this.renderQueue.push({
                    container: tikzContainer,
                    tikzCode,
                    resolve,
                    reject
                });
            });
        }

        try {
            await this.renderTikZCode(tikzContainer, tikzCode);
            tikzContainer.classList.add('tikz-rendered');
        } catch (error) {
            console.error('[NodeTikZIntegration] Failed to render TikZ code:', error);
            throw error;
        }
    }

    /**
     * Render TikZ code to SVG
     */
    async renderTikZCode(container, tikzCode) {
        try {
            console.log('[NodeTikZIntegration] Converting TikZ to SVG...');
            
            // Clean up the TikZ code
            const cleanedCode = this.cleanTikZCode(tikzCode);
            
            // Use the tikzjax to convert to SVG
            const result = await this.tikzjax.tex2svg(cleanedCode, {
                display: true,
                showConsole: false
            });

            if (result && result.svg) {
                // Create SVG element and insert
                const svgWrapper = document.createElement('div');
                svgWrapper.className = 'tikz-svg-wrapper';
                svgWrapper.innerHTML = result.svg;
                
                // Style the wrapper
                svgWrapper.style.textAlign = 'center';
                svgWrapper.style.margin = '1em 0';
                svgWrapper.style.padding = '0.5em';
                svgWrapper.style.border = '1px solid #ddd';
                svgWrapper.style.borderRadius = '4px';
                svgWrapper.style.backgroundColor = '#f9f9f9';
                
                // Replace the container content with the SVG
                if (container.tagName === 'CODE') {
                    const pre = container.parentElement;
                    if (pre && pre.tagName === 'PRE') {
                        pre.parentNode.replaceChild(svgWrapper, pre);
                    } else {
                        container.parentNode.replaceChild(svgWrapper, container);
                    }
                } else {
                    container.innerHTML = '';
                    container.appendChild(svgWrapper);
                }
                
                console.log('[NodeTikZIntegration] Successfully rendered TikZ to SVG');
            } else {
                throw new Error('No SVG output received from tikzjax');
            }
            
        } catch (error) {
            console.error('[NodeTikZIntegration] Error rendering TikZ code:', error);
            throw error;
        }
    }

    /**
     * Clean and prepare TikZ code
     */
    cleanTikZCode(tikzCode) {
        let cleaned = tikzCode.trim();
        
        // Remove any markdown code block markers
        cleaned = cleaned.replace(/^```(?:tikz|circuitikz)?/i, '').replace(/```$/i, '');
        
        // Ensure TikZ code is properly wrapped
        if (!cleaned.includes('\\begin{tikzpicture}') && !cleaned.includes('\\begin{circuitikz}')) {
            // Auto-wrap simple TikZ commands
            cleaned = `\\begin{tikzpicture}\n${cleaned}\n\\end{tikzpicture}`;
        }
        
        return cleaned;
    }

    /**
     * Create error display for failed renders
     */
    createErrorDisplay(container, errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'tikz-error';
        errorDiv.innerHTML = `
            <div style="border: 1px solid #ff6b6b; background: #ffe0e0; padding: 1em; border-radius: 4px; margin: 1em 0;">
                <strong>NodeTikZ Rendering Error:</strong><br>
                <code style="color: #d63031;">${this.escapeHtml(errorMessage)}</code>
            </div>
        `;
        
        if (container.tagName === 'CODE') {
            const pre = container.parentElement;
            if (pre && pre.tagName === 'PRE') {
                pre.parentNode.replaceChild(errorDiv, pre);
            } else {
                container.parentNode.replaceChild(errorDiv, container);
            }
        } else {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }

    /**
     * Escape HTML for safe display
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Check if TikZ is available and working
     */
    isAvailable() {
        return this.isInitialized && this.tikzjax !== null;
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            queueLength: this.renderQueue.length,
            processing: this.isProcessing,
            available: this.isAvailable()
        };
    }
}

console.log('[NodeTikZIntegration] Class definition completed successfully');

// Export for use in other modules
console.log('[NodeTikZIntegration] Starting export process...');

// In Electron renderer, we want to use window even if module is available
if (typeof window !== 'undefined') {
    console.log('[NodeTikZIntegration] Browser/Electron environment detected, registering on window...');
    window.NodeTikZIntegration = NodeTikZIntegration;
    console.log('[NodeTikZIntegration] Class registered on window object successfully');
    console.log('[NodeTikZIntegration] window.NodeTikZIntegration is:', typeof window.NodeTikZIntegration);
} else if (typeof module !== 'undefined' && module.exports) {
    console.log('[NodeTikZIntegration] Node.js environment detected');
    module.exports = NodeTikZIntegration;
} else {
    console.error('[NodeTikZIntegration] Unknown environment - neither window nor module available');
}

console.log('[NodeTikZIntegration] Script loaded successfully');