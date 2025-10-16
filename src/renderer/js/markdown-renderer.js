// --- Remark integration ---
let remark = null;
let remarkPlugins = [];

// Global function for registering remark plugins
window.markddRegisterRemarkPlugin = function(plugin) {
    if (typeof plugin === 'function') {
        remarkPlugins.push(plugin);
        console.log('[MarkdownRenderer] Plugin registered:', plugin.name || 'anonymous');
    } else {
        console.warn('[MarkdownRenderer] Invalid plugin:', plugin);
    }
};

// Example: Register a remark plugin for custom blocks (requires remark/unified to be loaded)
// Note: This is a placeholder - remark/unified are not currently loaded in the application
// Custom blocks can be implemented using marked extensions instead (see marked.use() below)
// Uncomment and configure when remark ecosystem is added to dependencies
/*
window.markddRegisterRemarkPlugin(function remarkAlertPlugin() {
    // This plugin would require: npm install unified remark-parse unist-util-visit
    return (tree) => {
        // Example implementation would go here
        return tree;
    };
});
*/

window.markddClearRemarkPlugins = function() {
    remarkPlugins = [];
};

async function ensureRemarkLoaded() {
    // Only use remark/unified if present on window (never try to load from CDN)
    if (remark) return remark;
    if (window.unified && window.remarkParse) {
        remark = window.unified().use(window.remarkParse);
        return remark;
    }
    // If not available, skip remark pipeline
    return null;
}

// --- Markdown Preview Enhanced-style Plugin System ---
let markddPlugins = [];
let disabledPlugins = [];
window.markddRegisterPlugin = function(plugin) {
    if (typeof plugin === 'function' && !markddPlugins.includes(plugin)) markddPlugins.push(plugin);
};
window.markddClearPlugins = function() {
    markddPlugins = [];
    disabledPlugins = [];
};
window.markddDisablePlugin = function(name) {
    if (!disabledPlugins.includes(name)) disabledPlugins.push(name);
};
window.markddEnablePlugin = function(name) {
    const idx = disabledPlugins.indexOf(name);
    if (idx !== -1) disabledPlugins.splice(idx, 1);
};
window.markddListPlugins = function() {
    return markddPlugins.map(fn => {
        const pname = fn.pluginName || fn.name || 'anonymous';
        return {
            name: pname,
            enabled: !disabledPlugins.includes(pname),
            type: fn.type || 'normal',
            fn: fn
        };
    });
};

class MarkdownRenderer {
    renderKityMinder(code) {
        if (!window.kityminder) {
            return `<div class="diagram-error">KityMinder library not loaded. Please check your internet connection or library loader settings.</div>`;
        }
        const id = `kityminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="kityminder-container" data-kityminder-id="${id}" data-kityminder-code="${encodeURIComponent(code)}">
            <div class="kityminder-loading">Loading KityMinder mind map...</div>
        </div>`;
    }

    async processKityMinderDiagrams(container) {
        const minderElements = container.querySelectorAll('.kityminder-container');
        for (const element of minderElements) {
            const id = element.getAttribute('data-kityminder-id');
            const code = decodeURIComponent(element.getAttribute('data-kityminder-code'));
            try {
                // Check if KityMinder integration is available
                if (window.KityMinderIntegration && window.KityMinderIntegration.isInitialized) {
                    // Use the integration to render the mindmap
                    await window.KityMinderIntegration.renderMindmap(element, code, id);
                    element.classList.add('kityminder-rendered');
                } else if (window.kityminder) {
                    // Fallback: Try direct kityminder API
                    try {
                        element.innerHTML = `
                            <div class="kityminder-diagram" id="${id}" data-mindmap-json="${encodeURIComponent(code)}">
                                <div class="diagram-header">
                                    <span class="diagram-type">KityMinder Mind Map</span>
                                    <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                                    <pre class="diagram-source hidden"><code>${code.substring(0, 500)}${code.length > 500 ? '...' : ''}</code></pre>
                                    <button class="diagram-view-json-btn" onclick="window.markdownRenderer.viewKityMinderJSON('${id}')" style="margin-left: 8px; padding: 4px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">👁️ View JSON</button>
                                    <button class="diagram-edit-btn" onclick="window.markdownRenderer.editKityMinder('${id}')" style="margin-left: 8px; padding: 4px 12px; background: #0969da; color: white; border: none; border-radius: 4px; cursor: pointer;">✏️ Edit</button>
                                </div>
                                <div class="diagram-content" id="${id}-mindmap" style="width: 100%; height: 400px; border: 1px solid #e1e5e9;"></div>
                            </div>
                        `;
                        
                        // Initialize KityMinder instance
                        const contentDiv = element.querySelector(`#${id}-mindmap`);
                        if (contentDiv && window.kityminder.Minder) {
                            const minder = new window.kityminder.Minder({
                                renderTo: contentDiv,
                                theme: 'default'
                            });
                            
                            // Parse the mindmap data
                            let mindmapData;
                            try {
                                mindmapData = JSON.parse(code);
                            } catch (parseError) {
                                // If not JSON, try to convert markdown to mindmap format
                                mindmapData = this.convertMarkdownToMindmap(code);
                            }
                            
                            minder.importData(mindmapData);
                            element.classList.add('kityminder-rendered');
                        }
                    } catch (directError) {
                        throw new Error(`Direct KityMinder rendering failed: ${directError.message}`);
                    }
                } else {
                    // Fallback: Show a structured text representation
                    element.innerHTML = `
                        <div class="diagram-fallback kityminder-fallback">
                            <div class="fallback-header">
                                <span class="diagram-type">KityMinder Mind Map - Library Loading</span>
                                <button class="fallback-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                                <pre class="fallback-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="fallback-content">
                                <p>🧠 KityMinder mind map would render here</p>
                                <p><small>KityMinder library is still loading or not available</small></p>
                                ${this.createTextBasedMindmapFromCode(code)}
                            </div>
                        </div>
                    `;
                    element.classList.add('kityminder-fallback');
                }
            } catch (error) {
                console.error('[MarkdownRenderer] KityMinder rendering error:', error);
                element.innerHTML = `
                    <div class="diagram-error">
                        <h4>KityMinder Error</h4>
                        <p>${error.message}</p>
                        <details>
                            <summary>Source Code</summary>
                            <pre><code>${code}</code></pre>
                        </details>
                    </div>
                `;
                element.classList.add('kityminder-error');
            }
        }
    }
    
    /**
     * Edit an existing KityMinder mindmap
     * Opens the KityMinder dialog with the saved JSON data for re-editing
     * @param {string} diagramId - The ID of the diagram element containing the mindmap data
     */
    editKityMinder(diagramId) {
        try {
            console.log('[MarkdownRenderer] Edit KityMinder called for:', diagramId);
            
            // Find the diagram element
            const diagramElement = document.getElementById(diagramId);
            if (!diagramElement) {
                console.error('[MarkdownRenderer] Diagram element not found:', diagramId);
                alert('Mindmap not found. Please try again.');
                return;
            }
            
            // Get the stored JSON data
            const encodedJson = diagramElement.getAttribute('data-mindmap-json');
            if (!encodedJson) {
                console.error('[MarkdownRenderer] No mindmap data found for:', diagramId);
                alert('Mindmap data not found. This mindmap may have been created in an older version.');
                return;
            }
            
            // Decode and parse the JSON
            const jsonData = decodeURIComponent(encodedJson);
            console.log('[MarkdownRenderer] Retrieved mindmap data:', jsonData.substring(0, 200));
            
            // Check if KityMinderIntegration instance is available (lowercase = instance, uppercase = class)
            if (window.kityMinderIntegration && typeof window.kityMinderIntegration.openEditDialog === 'function') {
                // Open the KityMinder editor dialog with the existing data for editing
                window.kityMinderIntegration.openEditDialog(jsonData, diagramId, "edit");
                console.log('[MarkdownRenderer] Opened KityMinder editor for editing existing mindmap');
            } else {
                console.error('[MarkdownRenderer] KityMinder integration instance not available');
                console.error('[MarkdownRenderer] window.kityMinderIntegration:', window.kityMinderIntegration);
                alert('KityMinder editor is not available. Please ensure the library is loaded.');
            }
            
        } catch (error) {
            console.error('[MarkdownRenderer] Failed to edit KityMinder:', error);
            alert(`Failed to open editor: ${error.message}`);
        }
    }
    
    /**
     * View KityMinder JSON in a modal dialog
     * Shows the raw JSON data for inspection, copying, or manual editing
     * @param {string} diagramId - The ID of the diagram element containing the mindmap data
     */
    viewKityMinderJSON(diagramId) {
        try {
            console.log('[MarkdownRenderer] View KityMinder JSON called for:', diagramId);
            
            // Find the diagram element
            const diagramElement = document.getElementById(diagramId);
            if (!diagramElement) {
                console.error('[MarkdownRenderer] Diagram element not found:', diagramId);
                alert('Mindmap not found.');
                return;
            }
            
            // Get the stored JSON data
            const encodedJson = diagramElement.getAttribute('data-mindmap-json');
            if (!encodedJson) {
                console.error('[MarkdownRenderer] No mindmap data found for:', diagramId);
                alert('Mindmap data not found.');
                return;
            }
            
            // Decode the JSON
            const jsonData = decodeURIComponent(encodedJson);
            
            // Create modal dialog
            const modal = document.createElement('div');
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = 'background: white; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';
            
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 2px solid #e1e5e9; padding-bottom: 12px;';
            header.innerHTML = `
                <h3 style="margin: 0; color: #24292f;">KityMinder JSON Data</h3>
                <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d; padding: 0 8px;">×</button>
            `;
            
            const textarea = document.createElement('textarea');
            textarea.value = jsonData;
            textarea.style.cssText = 'width: 100%; min-height: 400px; font-family: "Consolas", "Monaco", monospace; font-size: 13px; padding: 12px; border: 1px solid #d1d5da; border-radius: 4px; resize: vertical;';
            textarea.readOnly = false;
            textarea.spellcheck = false;
            
            const footer = document.createElement('div');
            footer.style.cssText = 'margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;';
            footer.innerHTML = `
                <button onclick="navigator.clipboard.writeText(this.parentElement.previousElementSibling.value).then(() => alert('JSON copied to clipboard!'))" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">📋 Copy</button>
                <button onclick="this.closest('[style*=fixed]').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">Close</button>
            `;
            
            modalContent.appendChild(header);
            modalContent.appendChild(textarea);
            modalContent.appendChild(footer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
            console.log('[MarkdownRenderer] JSON viewer modal opened');
            
        } catch (error) {
            console.error('[MarkdownRenderer] Failed to view KityMinder JSON:', error);
            alert(`Failed to view JSON: ${error.message}`);
        }
    }
    
    convertMarkdownToMindmap(markdown) {
        // Convert markdown headers to KityMinder format
        const lines = markdown.split('\n');
        const root = { data: { text: 'Root' }, children: [] };
        const stack = [root];
        
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) {
                const level = match[1].length;
                const text = match[2].trim();
                
                // Adjust stack to current level
                while (stack.length > level) {
                    stack.pop();
                }
                
                const node = { data: { text }, children: [] };
                const parent = stack[stack.length - 1];
                if (!parent.children) parent.children = [];
                parent.children.push(node);
                stack.push(node);
            }
        }
        
        return root.children.length > 0 ? root.children[0] : { data: { text: 'Empty' }, children: [] };
    }
    
    createTextBasedMindmapFromCode(code) {
        try {
            // Try to parse as JSON first
            let data;
            try {
                data = JSON.parse(code);
                return this.renderMindmapAsText(data);
            } catch (jsonError) {
                // Try to parse as markdown
                return this.createTextBasedMindmap(code);
            }
        } catch (error) {
            return '<p>Unable to create text representation</p>';
        }
    }
    
    renderMindmapAsText(node, level = 0) {
        const indent = '  '.repeat(level);
        let result = `${indent}<div class="mindmap-node level-${level}">${node.data ? node.data.text || 'Node' : 'Node'}</div>\n`;
        
        if (node.children && node.children.length > 0) {
            result += '<div class="mindmap-children">\n';
            for (const child of node.children) {
                result += this.renderMindmapAsText(child, level + 1);
            }
            result += '</div>\n';
        }
        
        return result;
    }
    constructor() {
        this.marked = null;
        this.markedParse = null; // unified parse function reference
        this.hljs = null;
        this.katex = null;
        this.mathjax = null;
        this.mermaid = null;
        this.mathEngine = 'mathjax'; // Default to MathJax as primary
        this.isInitialized = false;
        // Unified MathJax readiness handling
        this._mathJaxReadyPromise = null; // promise resolving true when ready (tex2svg available) else false after timeout
        this._mathJaxReadyState = 'unknown'; // unknown | pending | ready | timeout
        this._mathJaxReadyTimeoutMs = 3000; // Reduced from 8000ms to 3000ms for faster fallback // tight timeout to avoid long UI stalls
        this._mathFallbacksUsed = []; // track placeholders rendered via fallback for optional later re-render
        
        // Initialize TikZ integration with priority to NodeTikZIntegration
        this.nodeTikzIntegration = null;
        this.obsidianTikZJax = null;
        this.tikzIntegration = null;
        
        console.log('[MarkdownRenderer] TikZ integration detection - Available classes:');
        console.log('  - window.NodeTikZIntegration:', !!window.NodeTikZIntegration);
        console.log('  - window.ObsidianTikZJaxEnhanced:', !!window.ObsidianTikZJaxEnhanced);
        console.log('  - window.TikZIntegration:', !!window.TikZIntegration);
        
        if (window.NodeTikZIntegration) {
            // Use the new node-tikzjax integration (preferred)
            try {
                this.nodeTikzIntegration = new window.NodeTikZIntegration();
                console.log('[MarkdownRenderer] NodeTikZIntegration instance created');
                
                // Initialize the NodeTikZIntegration immediately
                if (typeof this.nodeTikzIntegration.init === 'function') {
                    this.nodeTikzIntegration.init().then(() => {
                        console.log('[MarkdownRenderer] NodeTikZIntegration initialized successfully');
                    }).catch(error => {
                        console.error('[MarkdownRenderer] NodeTikZIntegration initialization failed:', error);
                        this.nodeTikzIntegration = null; // Fallback to other integrations
                    });
                }
                
                console.log('[MarkdownRenderer] Using NodeTikZIntegration (node-tikzjax)');
            } catch (error) {
                console.error('[MarkdownRenderer] Failed to create NodeTikZIntegration instance:', error);
                this.nodeTikzIntegration = null;
            }
        } else if (window.ObsidianTikZJaxEnhanced) {
            this.obsidianTikZJax = new window.ObsidianTikZJaxEnhanced();
            console.log('[MarkdownRenderer] Using ObsidianTikZJaxEnhanced');
        } else if (window.TikZIntegration) {
            // Fallback to TikZ integration
            this.tikzIntegration = new window.TikZIntegration();
            console.log('[MarkdownRenderer] Using TikZIntegration fallback');
        } else {
            console.warn('[MarkdownRenderer] No TikZ integration available');
        }
    }

    async init() {
        console.log('⚡⚡⚡ [MarkdownRenderer] Starting initialization...');
        
        // Libraries should already be loaded by LibraryLoader
        console.log('⚡⚡⚡ [MarkdownRenderer] Assigning libraries from window...');
        this.marked = window.marked;
        this.hljs = window.hljs;
        this.katex = window.katex;
        this.mathjax = window.MathJax;
        this.mermaid = window.mermaid;
        
        console.log('⚡⚡⚡ [MarkdownRenderer] Libraries assigned:', {
            marked: typeof this.marked,
            hljs: typeof this.hljs,
            katex: typeof this.katex,
            mermaid: typeof this.mermaid
        });

        // Validate critical dependencies (support both legacy function and modern object API with parse())
        // Normalize Marked API: support function export, object with .parse(), or object with .marked()
        this.markedParse = null;
        if (this.marked) {
            if (typeof this.marked === 'function') {
                this.markedParse = this.marked; // legacy function form
            } else if (typeof this.marked.parse === 'function') {
                this.markedParse = (src, opts) => this.marked.parse(src, opts);
            } else if (typeof this.marked.marked === 'function') { // some bundles expose { marked, ... }
                this.markedParse = (src, opts) => this.marked.marked(src, opts);
            }
        }

        if (!this.markedParse) {
            console.error('[MarkdownRenderer] Marked normalization failed:', {
                typeofMarked: typeof this.marked,
                keys: this.marked ? Object.keys(this.marked) : null
            });
            throw new Error(`Marked library is not available. Please check your internet connection and refresh the page.`);
        }
        
        if (typeof this.katex !== 'object' || this.katex === null) {
            throw new Error(`KaTeX library is not available. Please check your internet connection and refresh the page.`);
        }
        
        console.log('⚡⚡⚡ [MarkdownRenderer] About to call initializeMarked()');
        this.initializeMarked();
        console.log('⚡⚡⚡ [MarkdownRenderer] initializeMarked() completed');
        
        console.log('⚡⚡⚡ [MarkdownRenderer] About to call initializeMermaid()');
        this.initializeMermaid();
        console.log('⚡⚡⚡ [MarkdownRenderer] initializeMermaid() completed');
        
        console.log('⚡⚡⚡ [MarkdownRenderer] About to call initializeKaTeX()');
        this.initializeKaTeX();
        console.log('⚡⚡⚡ [MarkdownRenderer] initializeKaTeX() completed');
        
        console.log('⚡⚡⚡ [MarkdownRenderer] About to call initializeMathJax()');
        this.initializeMathJax();
        console.log('⚡⚡⚡ [MarkdownRenderer] initializeMathJax() completed');
        
        this.isInitialized = true;
        console.log('[MarkdownRenderer] Initialization completed successfully');
        
        // Setup global debug method for testing
        if (typeof window !== 'undefined') {
            window.debugMathJax = () => this.debugMathJaxState();
        }
        
        console.log('[MarkdownRenderer] Type "debugMathJax()" in console to check MathJax state.');
    }

    initializeMarked() {
        if (!this.marked) {
            console.error('Marked library not available');
            return;
        }
        
        // Configure marked with custom renderer
        const renderer = new this.marked.Renderer();
        
        // Custom code block rendering
        renderer.code = (codeParam, langParam, escaped) => {
            // CRITICAL FIX: Marked.js v5+ passes token object as first parameter
            // Support both old (string, string) and new ({text, lang, ...}) APIs
            let code, lang;
            
            if (typeof codeParam === 'object' && codeParam !== null) {
                // New Marked.js v5+ API: token object
                code = codeParam.text || codeParam.raw || '';
                lang = codeParam.lang || '';
            } else {
                // Old API: separate parameters
                code = codeParam || '';
                lang = langParam || '';
            }
            
            // Ensure code is a string
            if (typeof code !== 'string') {
                code = String(code);
            }
            
            // KityMinder mind map
            if (lang === 'kityminder') {
                return this.renderKityMinder(code);
            }
            
            const validLang = lang && this.hljs && this.hljs.getLanguage && this.hljs.getLanguage(lang) ? lang : 'plaintext';
            
            // Handle special diagram types
            if (lang === 'mermaid') {
                return this.renderMermaid(code);
            }
            
            if (lang === 'tikz' || lang === 'circuitikz') {
                return this.renderTikZ(code, lang);
            }
            
            if (lang === 'markmap') {
                return this.renderMarkmap(code);
            }

            if (lang === 'plantuml') {
                return this.renderPlantUML(code);
            }

            if (lang === 'vega' || lang === 'vega-lite') {
                return this.renderVegaLite(code);
            }

            // Handle special code blocks with additional features
            if (lang === 'math') {
                return this.renderMathBlock(code);
            }

            // LaTeX document rendering DISABLED - use TikZ for diagrams, MathJax/KaTeX for equations
            // Full LaTeX.js support removed as per user request
            if (lang === 'latex') {
                return '<div class="diagram-info">' +
                    '<div class="info-header">LaTeX Document Rendering Disabled</div>' +
                    '<div class="info-content">' +
                        '<p>Full LaTeX document rendering has been disabled.</p>' +
                        '<p>For diagrams: Use <code>tikz</code> or <code>circuitikz</code> code blocks</p>' +
                        '<p>For equations: Use <code>$...$</code> (inline) or <code>$$...$$</code> (display)</p>' +
                    '</div>' +
                '</div>';
            }

            // GraphViz diagram types
            if (lang === 'graphviz' || lang === 'dot') {
                return this.renderGraphviz(code, 'dot');
            }
            
            if (lang === 'neato') {
                return this.renderGraphviz(code, 'neato');
            }
            
            if (lang === 'fdp') {
                return this.renderGraphviz(code, 'fdp');
            }
            
            if (lang === 'sfdp') {
                return this.renderGraphviz(code, 'sfdp');
            }
            
            if (lang === 'twopi') {
                return this.renderGraphviz(code, 'twopi');
            }
            
            if (lang === 'circo') {
                return this.renderGraphviz(code, 'circo');
            }

            // ABC music notation
            if (lang === 'abc') {
                return this.renderAbcMusic(code);
            }

            // Wavedrom timing diagrams
            if (lang === 'wavedrom') {
                return this.renderWavedrom(code);
            }
            
            // ENHANCED: Regular code highlighting with proper line formatting and export support
            if (this.hljs && this.hljs.highlight) {
                const highlighted = this.hljs.highlight(code, { language: validLang }).value;
                const lineNumbers = this.generateLineNumbers(code);
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                // CRITICAL FIX: Preserve original code formatting for HTML export
                const escapedCode = code
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                
                return `<div class="code-block-container" data-language="${validLang}">
                    <div class="code-block-header">
                        <span class="code-language">${lang || 'text'}</span>
                        <button class="copy-code-btn" data-target="${codeId}" title="Copy code">
                            <i class="icon-copy"></i> Copy
                        </button>
                    </div>
                    <div class="code-block-content">
                        <div class="line-numbers">${lineNumbers}</div>
                        <pre class="code-pre"><code id="${codeId}" class="hljs ${validLang}">${highlighted}</code></pre>
                        <!-- EXPORT FALLBACK: Hidden plain text version for export -->
                        <pre class="code-export-fallback" style="display:none;"><code>${escapedCode}</code></pre>
                    </div>
                </div>`;
            } else {
                // Fallback when hljs is not available
                const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const lineNumbers = this.generateLineNumbers(code);
                const escapedCode = code
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                    
                return `<div class="code-block-container" data-language="${validLang}">
                    <div class="code-block-header">
                        <span class="code-language">${lang || 'text'}</span>
                        <button class="copy-code-btn" data-target="${codeId}" title="Copy code">
                            <i class="icon-copy"></i> Copy
                        </button>
                    </div>
                    <div class="code-block-content">
                        <div class="line-numbers">${lineNumbers}</div>
                        <pre class="code-pre"><code id="${codeId}">${escapedCode}</code></pre>
                    </div>
                </div>`;
            }
        };
        
        // Custom heading renderer with anchors (defensive: coerce non-string text)
        renderer.heading = function(textParam, levelParam, raw) {
            // CRITICAL FIX: Marked.js v5+ passes token object as first parameter
            let text, level;
            
            if (typeof textParam === 'object' && textParam !== null) {
                // New Marked.js v5+ API: token object {type, text, depth, tokens, raw}
                text = textParam.text || textParam.raw || '';
                level = textParam.depth || 2;
            } else {
                // Old API: separate parameters
                text = textParam || '';
                level = levelParam || 2;
            }
            
            // Ensure text is a string
            if (typeof text !== 'string') {
                text = String(text);
            }
            
            // Ensure level is a number
            if (typeof level !== 'number' || isNaN(level) || level < 1 || level > 6) {
                level = 2;
            }

            const escapedText = (text || '').toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${escapedText}">${text}</h${level}>`;
        };
        
        // Custom table rendering with classes
        renderer.table = (header, body) => {
            return `<table class="table table-striped">${header}${body}</table>`;
        };
        
        // Custom image renderer to handle KityMinder resource references (![mindmap](:/<id>))
        renderer.image = (hrefParam, titleParam, textParam) => {
            // CRITICAL FIX: Marked.js v5+ passes token object as first parameter
            let href, title, text;
            
            if (typeof hrefParam === 'object' && hrefParam !== null) {
                // New Marked.js v5+ API: token object {type, href, title, text}
                href = hrefParam.href || '';
                title = hrefParam.title || '';
                text = hrefParam.text || '';
            } else {
                // Old API: separate parameters
                href = hrefParam || '';
                title = titleParam || '';
                text = textParam || '';
            }
            
            // Ensure all are strings
            if (typeof href !== 'string') href = String(href);
            if (typeof title !== 'string') title = '';
            if (typeof text !== 'string') text = '';
            
            // Check if this is a KityMinder resource reference (:/<id>)
            if (href && href.startsWith(':/')) {
                const resourceId = href.substring(2); // Remove ':/'
                
                // Check if we have extracted JSON data for this mindmap
                const jsonData = this.currentMindmapDataMap ? this.currentMindmapDataMap.get(resourceId) : null;
                
                // Try to get the resource from KityMinder integration
                if (window.kityMinderIntegration && window.kityMinderIntegration.resourceCache) {
                    const resource = window.kityMinderIntegration.resourceCache.get(resourceId);
                    
                    if (resource && resource.data_png) {
                        // Render the PNG image with JSON data attribute for editing
                        const altText = text || title || 'mindmap';
                        const titleAttr = title ? ` title="${title}"` : '';
                        const jsonDataAttr = jsonData ? ` data-mindmap-json="${encodeURIComponent(jsonData)}"` : '';
                        
                        return `<div class="kityminder-diagram" id="${resourceId}"${jsonDataAttr}>
                            <div class="diagram-header" style="background: #f8f9fa; padding: 8px 12px; border-bottom: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between;">
                                <span class="diagram-type" style="font-weight: 600; color: #495057;">KityMinder Mind Map</span>
                                <div style="display: flex; gap: 8px;">
                                    <button class="diagram-view-json-btn" onclick="window.markdownRenderer.viewKityMinderJSON('${resourceId}')" style="padding: 4px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">👁️ View JSON</button>
                                    <button class="diagram-edit-btn" onclick="window.markdownRenderer.editKityMinder('${resourceId}')" style="padding: 4px 12px; background: #0969da; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">✏️ Edit</button>
                                </div>
                            </div>
                            <img src="${resource.data_png}" alt="${altText}"${titleAttr} class="mindmap-image" data-resource-id="${resourceId}" style="display: block; max-width: 100%; height: auto; border: 1px solid #dee2e6;" />
                        </div>`;
                    }
                }
                
                // Fallback: show placeholder if resource not found, but include JSON if available
                const jsonDataAttr = jsonData ? ` data-mindmap-json="${encodeURIComponent(jsonData)}"` : '';
                return `<div class="mindmap-placeholder kityminder-diagram" id="${resourceId}" data-resource-id="${resourceId}"${jsonDataAttr}>
                    <div class="diagram-header" style="background: #f8f9fa; padding: 8px 12px; border-bottom: 1px solid #dee2e6;">
                        <span class="diagram-type" style="font-weight: 600; color: #495057;">KityMinder Mind Map</span>
                        ${jsonData ? `<button class="diagram-view-json-btn" onclick="window.markdownRenderer.viewKityMinderJSON('${resourceId}')" style="margin-left: 8px; padding: 4px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">�️ View JSON</button>` : ''}
                        ${jsonData ? `<button class="diagram-edit-btn" onclick="window.markdownRenderer.editKityMinder('${resourceId}')" style="margin-left: 8px; padding: 4px 12px; background: #0969da; color: white; border: none; border-radius: 4px; cursor: pointer;">✏️ Edit</button>` : ''}
                    </div>
                    <p style="padding: 40px; text-align: center;">�🗺️ Mind Map (loading...)</p>
                    <p style="text-align: center; color: #6c757d;"><small>Resource ID: ${resourceId}</small></p>
                </div>`;
            }
            
            // Regular image rendering
            const altText = text || '';
            const titleAttr = title ? ` title="${title}"` : '';
            return `<img src="${href}" alt="${altText}"${titleAttr} />`;
        };
        
        // Configure marked options (updated for v5 compatibility)
        this.marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true,
            headerIds: false,  // Disabled to avoid deprecation warning
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,  // Disabled to avoid deprecation warning
            xhtml: false
        });
        
        // Add custom block support using marked extensions (GitHub-style alerts/admonitions)
        this.marked.use({
            extensions: [{
                name: 'alert',
                level: 'block',
                start(src) {
                    const match = src.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                    return match ? match.index : undefined;
                },
                tokenizer(src) {
                    const rule = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n([\s\S]*?)(?=\n\n|\n\[!|$)/i;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'alert',
                            raw: match[0],
                            alertType: match[1].toLowerCase(),
                            text: match[2].trim()
                        };
                    }
                },
                renderer(token) {
                    const icons = {
                        note: '📘',
                        tip: '💡',
                        important: '❗',
                        warning: '⚠️',
                        caution: '🚫'
                    };
                    const colors = {
                        note: '#0969da',
                        tip: '#1a7f37',
                        important: '#8250df',
                        warning: '#bf8700',
                        caution: '#d1242f'
                    };
                    const icon = icons[token.alertType] || '📘';
                    const color = colors[token.alertType] || '#0969da';
                    return `<div class="markdown-alert markdown-alert-${token.alertType}" style="border-left: 4px solid ${color}; background-color: ${color}10; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 20px; margin-right: 8px;">${icon}</span>
                            <strong style="text-transform: uppercase; color: ${color};">${token.alertType}</strong>
                        </div>
                        <div>${this.parser.parseInline(token.text)}</div>
                    </div>`;
                }
            }, {
                name: 'container',
                level: 'block',
                start(src) {
                    const match = src.match(/^:::(info|warning|error|success|tip|danger)/i);
                    return match ? match.index : undefined;
                },
                tokenizer(src) {
                    // Match container blocks with optional title
                    const rule = /^:::(info|warning|error|success|tip|danger)(?:\s+(.*?))?\n([\s\S]*?)^:::$/im;
                    const match = rule.exec(src);
                    if (match) {
                        return {
                            type: 'container',
                            raw: match[0],
                            containerType: match[1].toLowerCase(),
                            title: match[2] ? match[2].trim() : '',
                            text: match[3].trim()
                        };
                    }
                },
                renderer(token) {
                    const icons = {
                        info: 'ℹ️',
                        warning: '⚠️',
                        error: '❌',
                        success: '✅',
                        tip: '💡',
                        danger: '🚫'
                    };
                    const colors = {
                        info: '#0969da',
                        warning: '#bf8700',
                        error: '#d1242f',
                        success: '#1a7f37',
                        tip: '#8250df',
                        danger: '#d1242f'
                    };
                    const icon = icons[token.containerType] || 'ℹ️';
                    const color = colors[token.containerType] || '#0969da';
                    
                    // Parse the inner content as markdown using the parser's parseInline method
                    const parsedContent = this.parser.parseInline(token.text);
                    
                    return `<div class="custom-container custom-container-${token.containerType}" style="border: 1px solid ${color}; border-left: 4px solid ${color}; background-color: ${color}08; padding: 16px; margin: 16px 0; border-radius: 6px;">
                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 24px; margin-right: 10px;">${icon}</span>
                            <strong style="font-size: 16px; color: ${color}; text-transform: uppercase;">${token.title || token.containerType}</strong>
                        </div>
                        <div class="custom-container-content">${parsedContent}</div>
                    </div>`;
                }
            }]
        });
    }

    initializeMermaid() {
        this.mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            sequence: {
                useMaxWidth: true,
                wrap: true
            },
            gantt: {
                useMaxWidth: true
            }
        });
    }

    initializeKaTeX() {
        // Ensure KaTeX is properly loaded
        if (!this.katex || typeof this.katex.renderToString !== 'function') {
            console.error('[MarkdownRenderer] KaTeX library not properly loaded');
            return;
        }
        
        // KaTeX is already loaded, just configure it
        this.katexOptions = {
            throwOnError: false,
            errorColor: '#cc0000',
            displayMode: false,
            strict: false,
            trust: false,
            macros: {
                "\\RR": "\\mathbb{R}",
                "\\CC": "\\mathbb{C}",
                "\\NN": "\\mathbb{N}",
                "\\ZZ": "\\mathbb{Z}",
                "\\QQ": "\\mathbb{Q}",
                "\\FF": "\\mathbb{F}",
                "\\d": "\\mathrm{d}",
                "\\e": "\\mathrm{e}",
                "\\i": "\\mathrm{i}",
                "\\Re": "\\operatorname{Re}",
                "\\Im": "\\operatorname{Im}"
            }
        };
        
        console.log('[MarkdownRenderer] KaTeX initialized successfully');
    }

    initializeMathJax() {
        if (!window.MathJax) {
            console.warn('[MarkdownRenderer] MathJax not available during initialization');
            return;
        }
        
        // MathJax should already be configured by library-loader
        console.log('[MarkdownRenderer] MathJax initialization check:', {
            exists: !!window.MathJax,
            tex2svg: typeof window.MathJax.tex2svg,
            startup: !!window.MathJax.startup,
            startupPromise: !!window.MathJax.startup?.promise,
            ready: this.isMathJaxReadySync()
        });

        // Establish single readiness promise if not already set
        if (!this._mathJaxReadyPromise) {
            this._mathJaxReadyState = 'pending';
            
            // Use MathJax's own startup promise as the authoritative source
            const startupPromise = window.MathJax.startup && window.MathJax.startup.promise 
                ? window.MathJax.startup.promise 
                : Promise.resolve();
                
            this._mathJaxReadyPromise = Promise.race([
                startupPromise.then(() => {
                    // After startup promise resolves, tex2svg should be available
                    const isReady = window.MathJax && typeof window.MathJax.tex2svg === 'function';
                    console.log(`[MarkdownRenderer] ✅ MathJax startup promise resolved, tex2svg available: ${isReady}`);
                    return isReady;
                }),
                // Also check immediately and periodically for faster detection
                new Promise(resolve => {
                    const checkInterval = 100; // Check every 100ms
                    let checks = 0;
                    const maxChecks = this._mathJaxReadyTimeoutMs / checkInterval;
                    
                    const intervalCheck = () => {
                        checks++;
                        const isReady = window.MathJax && typeof window.MathJax.tex2svg === 'function';
                        
                        if (isReady) {
                            console.log(`[MarkdownRenderer] ⚡ MathJax ready detected via polling (${checks * checkInterval}ms)`);
                            resolve(true);
                        } else if (checks >= maxChecks) {
                            console.warn(`[MarkdownRenderer] ⏰ MathJax polling timeout after ${this._mathJaxReadyTimeoutMs}ms`);
                            resolve(false);
                        } else {
                            setTimeout(intervalCheck, checkInterval);
                        }
                    };
                    
                    // Start checking immediately
                    intervalCheck();
                })
            ]).then(ready => {
                if (ready) {
                    this._mathJaxReadyState = 'ready';
                    console.log('[MarkdownRenderer] MathJax unified readiness: READY');
                } else {
                    this._mathJaxReadyState = 'timeout';
                    console.warn('[MarkdownRenderer] MathJax unified readiness: TIMEOUT (will use fallback)');
                }
                return ready;
            });
        }
    }

    setMathEngine(engine) {
        if (engine === 'mathjax' || engine === 'katex') {
            this.mathEngine = engine;
            console.log(`[MarkdownRenderer] Math engine set to: ${engine}`);
        } else {
            console.warn(`[MarkdownRenderer] Invalid math engine: ${engine}`);
        }
    }

    // Check if MathJax is fully ready and operational (synchronous version)
    isMathJaxReadySync() {
        if (!window.MathJax) {
            console.log('[MarkdownRenderer] 🔍 MathJax readiness check: window.MathJax not found');
            return false;
        }
        
        console.log('[MarkdownRenderer] 🔍 MathJax readiness check: window.MathJax exists');
        
        // Check if tex2svg function is available (primary check)
        if (typeof window.MathJax.tex2svg !== 'function') {
            console.log('[MarkdownRenderer] 🔍 MathJax readiness check: tex2svg not available yet');
            
            // If MathJax exists but tex2svg isn't ready, try to create it manually
            if (window.MathJax.startup && window.MathJax.startup.document) {
                try {
                    const adaptor = window.MathJax.startup.adaptor;
                    const mathDocument = window.MathJax.startup.document;
                    
                    if (adaptor && mathDocument) {
                        window.MathJax.tex2svg = (tex, options = {}) => {
                            const node = mathDocument.convert(tex, options);
                            // Return an object that has outerHTML property, not just the string
                            return {
                                outerHTML: adaptor.outerHTML(node),
                                node: node
                            };
                        };
                        console.log('[MarkdownRenderer] 🔧 Manually created tex2svg function in readiness check');
                        return true;
                    }
                } catch (error) {
                    console.warn('[MarkdownRenderer] ❌ Failed to manually create tex2svg:', error.message);
                }
            }
            
            return false;
        }
        
        console.log('[MarkdownRenderer] 🔍 MathJax readiness check: tex2svg function available');
        
        // Test MathJax functionality with a simple expression
        try {
            console.log('[MarkdownRenderer] 🔍 Testing MathJax with simple expression...');
            const testNode = window.MathJax.tex2svg('x', {display: false});
            console.log('[MarkdownRenderer] 🔍 Test result type:', typeof testNode);
            console.log('[MarkdownRenderer] 🔍 Test result:', testNode);
            console.log('[MarkdownRenderer] 🔍 Test result outerHTML:', testNode ? testNode.outerHTML : 'null outerHTML');
            
            if (testNode && testNode.outerHTML) {
                console.log('[MarkdownRenderer] ✅ MathJax test successful - ready for use');
                
                // Also test chemistry support
                try {
                    const testChemistry = window.MathJax.tex2svg('\\ce{H2O}', {display: false});
                    if (testChemistry && testChemistry.outerHTML) {
                        console.log('[MarkdownRenderer] 🧪 Chemistry test successful - mhchem is working');
                    }
                } catch (chemError) {
                    console.warn('[MarkdownRenderer] ⚠️ Chemistry test failed - mhchem may not be loaded:', chemError.message);
                }
                
                return true;
            } else {
                console.log('[MarkdownRenderer] ❌ MathJax test failed - no valid output');
                return false;
            }
        } catch (error) {
            console.warn('[MarkdownRenderer] ❌ MathJax test error:', error.message);
            
            // For chemistry support, check if mhchem is available
            if (window.MathJax.loader && window.MathJax.loader.load) {
                try {
                    // Try to ensure mhchem is loaded for chemistry support
                    console.log('[MarkdownRenderer] 🧪 Checking mhchem availability...');
                    if (window.MathJax.config && window.MathJax.config.tex && window.MathJax.config.tex.packages) {
                        const packages = window.MathJax.config.tex.packages;
                        if (packages.includes && packages.includes('mhchem')) {
                            console.log('[MarkdownRenderer] ✅ mhchem package is configured');
                        } else {
                            console.log('[MarkdownRenderer] ⚠️ mhchem package not found in config');
                        }
                    }
                } catch (chemError) {
                    console.warn('[MarkdownRenderer] Chemistry check error:', chemError.message);
                }
            }
            
            return false;
        }
    }

    // Check if MathJax is fully ready and operational (async version for future use)
    async isMathJaxReady() {
        if (!window.MathJax) {
            return false;
        }
        
        try {
            // Wait for MathJax startup to complete if startup promise exists
            if (window.MathJax.startup && window.MathJax.startup.promise) {
                await window.MathJax.startup.promise;
            }
            
            // Check if tex2svg function is available
            return typeof window.MathJax.tex2svg === 'function';
        } catch (error) {
            console.warn('[MarkdownRenderer] MathJax startup check failed:', error);
            return false;
        }
    }

    // Debug method to check MathJax state and force re-render
    debugMathJaxState() {
        console.log('[MarkdownRenderer] 🔍 DEBUG: MathJax State Check');
        console.log('[MarkdownRenderer] 🔍 window.MathJax exists:', !!window.MathJax);
        
        if (window.MathJax) {
            console.log('[MarkdownRenderer] 🔍 MathJax.tex2svg exists:', typeof window.MathJax.tex2svg === 'function');
            console.log('[MarkdownRenderer] 🔍 MathJax.startup exists:', !!window.MathJax.startup);
            console.log('[MarkdownRenderer] 🔍 MathJax.startup.document exists:', !!(window.MathJax.startup && window.MathJax.startup.document));
            
            // Check configuration
            if (window.MathJax.config) {
                console.log('[MarkdownRenderer] 🔍 MathJax.config.tex exists:', !!window.MathJax.config.tex);
                if (window.MathJax.config.tex && window.MathJax.config.tex.packages) {
                    console.log('[MarkdownRenderer] 🔍 MathJax packages:', window.MathJax.config.tex.packages);
                    console.log('[MarkdownRenderer] 🔍 mhchem in packages:', window.MathJax.config.tex.packages.includes && window.MathJax.config.tex.packages.includes('mhchem'));
                }
            }
            
            // Test MathJax functionality
            if (typeof window.MathJax.tex2svg === 'function') {
                try {
                    console.log('[MarkdownRenderer] 🔍 Testing simple math...');
                    const testMath = window.MathJax.tex2svg('x^2');
                    console.log('[MarkdownRenderer] ✅ Simple math test successful');
                    
                    console.log('[MarkdownRenderer] 🔍 Testing chemistry...');
                    const testChem = window.MathJax.tex2svg('\\ce{H2O}');
                    console.log('[MarkdownRenderer] ✅ Chemistry test successful');
                } catch (error) {
                    console.error('[MarkdownRenderer] ❌ MathJax test failed:', error.message);
                }
            }
        }
        
        // Test readiness function
        const isReady = this.isMathJaxReadySync();
        console.log('[MarkdownRenderer] 🔍 isMathJaxReadySync() result:', isReady);
        
        return {
            exists: !!window.MathJax,
            tex2svg: !!(window.MathJax && typeof window.MathJax.tex2svg === 'function'),
            startup: !!(window.MathJax && window.MathJax.startup),
            isReady: isReady
        };
    }

    // Normalize LaTeX content before passing to KaTeX.
    // This decodes common HTML entities, removes accidental HTML tags,
    // converts <br> to LaTeX line breaks, and trims extra whitespace.
    cleanLatexForKaTeX(content) {
        if (!content || typeof content !== 'string') return '';
        return content
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // Replace HTML line breaks with LaTeX linebreaks
            .replace(/<br\s*\/?>(?:\s*)/gi, ' \\\\ ')
            // Remove any remaining tags
            .replace(/<[^>]*>/g, '')
            // Collapse multiple spaces but keep single spaces
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Sanitize MathJax SVG output to fix dimension calculation bugs (NaNex values)
    sanitizeMathJaxSVG(svgString) {
        if (!svgString || typeof svgString !== 'string') return svgString;
        
        // Fix NaNex values in width, height, and viewBox attributes
        return svgString
            .replace(/width="[^"]*NaN[^"]*"/g, 'width="100%"')
            .replace(/height="[^"]*NaN[^"]*"/g, 'height="auto"')
            .replace(/viewBox="([^"]*NaN[^"]*)"/g, (match, viewBox) => {
                // Try to extract valid numbers from viewBox
                const parts = viewBox.split(/\s+/);
                const validParts = parts.filter(part => !isNaN(parseFloat(part)) && isFinite(parseFloat(part)));
                if (validParts.length >= 4) {
                    return `viewBox="${validParts.slice(0, 4).join(' ')}"`;
                } else {
                    // Fallback to a reasonable default viewBox
                    return 'viewBox="0 0 100 50"';
                }
            })
            // Also fix any other NaN values in attributes
            .replace(/="[^"]*NaN[^"]*"/g, '="auto"');
    }

    // DOM-level sanitizer to fix MathJax-produced SVG attributes after typesetting
    sanitizeMathJaxDOM(container) {
        if (!container || !container.querySelectorAll) return;
        try {
            const svgs = container.querySelectorAll('svg');
            svgs.forEach(svg => {
                try {
                    // Fix width/height attributes containing NaN or invalid units
                    const width = svg.getAttribute('width');
                    const height = svg.getAttribute('height');
                    if (width && /NaN/i.test(width)) {
                        svg.setAttribute('width', '100%');
                    }
                    if (height && /NaN/i.test(height)) {
                        svg.setAttribute('height', 'auto');
                    }

                    // Normalize viewBox if it contains NaN
                    const viewBox = svg.getAttribute('viewBox');
                    if (viewBox && /NaN/i.test(viewBox)) {
                        const parts = viewBox.split(/\s+/).map(p => parseFloat(p));
                        const nums = parts.filter(n => !isNaN(n) && isFinite(n));
                        if (nums.length >= 4) {
                            svg.setAttribute('viewBox', `${nums[0]} ${nums[1]} ${nums[2]} ${nums[3]}`);
                        } else {
                            svg.setAttribute('viewBox', '0 0 100 50');
                        }
                    }

                    // Remove any width/height attributes that are invalid (non-length values)
                    ['width','height'].forEach(attr => {
                        const v = svg.getAttribute(attr);
                        if (v && /[a-zA-Z]{2,}$/.test(v) && /NaN/i.test(v)) {
                            if (attr === 'width') svg.setAttribute('width','100%');
                            if (attr === 'height') svg.setAttribute('height','auto');
                        }
                    });
                } catch (inner) {
                    // Swallow individual svg fixes to avoid aborting the whole sanitization
                    console.warn('[MarkdownRenderer] sanitizeMathJaxDOM: svg fix failed', inner && inner.message ? inner.message : inner);
                }
            });
        } catch (e) {
            console.warn('[MarkdownRenderer] sanitizeMathJaxDOM error:', e && e.message ? e.message : e);
        }
    }

    /**
     * Extract KityMinder JSON data from HTML comments in markdown
     * Looks for patterns like:
     * ![mindmap](:/<id>)
     * 
     * <!-- kityminder-data
     * ```json
     * {...}
     * ```
     * -->
     * 
     * @param {string} markdown - The markdown content
     * @returns {Object} - { content: markdown without comments, mindmapDataMap: Map of id -> json }
     */
    extractKityMinderJson(markdown) {
        const mindmapDataMap = new Map();
        
        // Regex to match: ![mindmap](:/<id>) followed by HTML comment with JSON
        const pattern = /!\[mindmap\]\(:\/([^)]+)\)\s*\n\s*<!--\s*kityminder-data\s*\n```json\s*\n([\s\S]*?)\n```\s*\n-->/g;
        
        let match;
        let content = markdown;
        
        while ((match = pattern.exec(markdown)) !== null) {
            const mindmapId = match[1]; // The ID after :/
            const jsonData = match[2].trim(); // The JSON content
            
            console.log('[MarkdownRenderer] Found KityMinder JSON for ID:', mindmapId, 'length:', jsonData.length);
            
            // Store the JSON data
            mindmapDataMap.set(mindmapId, jsonData);
            
            // Remove the HTML comment from the content (keep the image reference)
            const commentPart = match[0].substring(match[0].indexOf('\n'));
            content = content.replace(commentPart, '');
        }
        
        return { content, mindmapDataMap };
    }

    async render(markdown, options = {}) {
        if (!markdown || typeof markdown !== 'string') {
            return '<div class="preview-placeholder"><p>Start typing to see preview...</p></div>';
        }

        // Ensure renderer is initialized FIRST
        if (!this.isInitialized || !this.marked) {
            try {
                await this.init();
                if (!this.marked) {
                    return '<div class="error">Failed to initialize markdown renderer. Please refresh the page.</div>';
                }
            } catch (error) {
                console.error('[MarkdownRenderer] Initialization error:', error);
                return `<div class="error">Initialization Error: ${error.message}</div>`;
            }
        }

        // CRITICAL FIX: Protect ALL math IMMEDIATELY, before ANY other processing
        console.log('[MarkdownRenderer] ORIGINAL input content sample:', markdown.substring(0, 500));
        const initialMathCheck = markdown.match(/\$\$[\s\S]*?\$\$/g);
        console.log('[MarkdownRenderer] Initial display math found:', initialMathCheck ? initialMathCheck.length : 0);
        if (initialMathCheck) {
            console.log('[MarkdownRenderer] Initial math examples:', initialMathCheck.slice(0, 2));
        }
        
        // Protect math IMMEDIATELY before ANY processing
        console.error('🔥🔥🔥 RENDER DEBUG: About to call protectLaTeXEnvironments 🔥🔥🔥');
        const { protectedContent: earlyProtectedMarkdown, latexPlaceholders: earlyLatexPlaceholders } = this.protectLaTeXEnvironments(markdown);
        console.error('🔥🔥🔥 RENDER DEBUG: protectLaTeXEnvironments completed 🔥🔥🔥');
        let processedMarkdown = earlyProtectedMarkdown;

        // --- MPE-STYLE PLUGIN PREPROCESSING ---
        let pluginsToUse = markddPlugins;
        if (options.onlyEnabledPlugins) {
            pluginsToUse = markddPlugins.filter(fn => {
                const pname = fn.pluginName || fn.name || 'anonymous';
                return !disabledPlugins.includes(pname);
            });
        }

        for (const plugin of pluginsToUse) {
            const pname = plugin.pluginName || plugin.name || 'anonymous';
            if (typeof plugin === 'function' && plugin.type === 'pre' && (!options.onlyEnabledPlugins ? !disabledPlugins.includes(pname) : true)) {
                try {
                    processedMarkdown = plugin(processedMarkdown) || processedMarkdown;
                } catch (e) {
                    console.warn('[MarkDD Plugin] Preprocessing error:', e);
                }
            }
        }

        try {
            // Step 1: Process YAML frontmatter
            const { content, frontmatter } = this.processYAMLFrontmatter(processedMarkdown);
            processedMarkdown = content;

            // Step 2: Insert TOC if [TOC] present
            if (processedMarkdown.includes('[TOC]')) {
                const tocHtml = this.generateTOC(processedMarkdown);
                processedMarkdown = processedMarkdown.replace(/\[TOC\]/gi, tocHtml);
            }

            // Step 3: Process custom markdown content extensions
            processedMarkdown = this.processMarkdownContent(processedMarkdown);

        // Step 4: Process custom blocks and containers (math already protected)
        console.log('[MarkdownRenderer] BEFORE processCustomBlocks - found placeholders:', processedMarkdown.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g) ? processedMarkdown.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g).length : 0);
        processedMarkdown = this.processCustomBlocks(processedMarkdown);
        console.log('[MarkdownRenderer] AFTER processCustomBlocks - found placeholders:', processedMarkdown.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g) ? processedMarkdown.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g).length : 0);

        // Step 5: Use already protected content and placeholders
        console.log('[MarkdownRenderer] Using early math protection - skipping duplicate protection');
        const protectedContent = processedMarkdown;
        const latexPlaceholders = earlyLatexPlaceholders;
        // Store placeholders as instance variable for TikZ code restoration
        this.currentLatexPlaceholders = latexPlaceholders;
        console.log('[MarkdownRenderer] Stored', latexPlaceholders.size, 'math placeholders for TikZ code restoration');        // DEBUG: Check placeholders before marked processing
        const beforeMarked = protectedContent.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g);
        console.log('[MarkdownRenderer] Placeholders before marked:', beforeMarked ? beforeMarked.length : 0);
        if (beforeMarked) {
            console.log('[MarkdownRenderer] Placeholder examples:', beforeMarked.slice(0, 3));
        }

        // Step 5.5: Extract KityMinder JSON from HTML comments for persistence
        const { content: contentWithExtractedJson, mindmapDataMap } = this.extractKityMinderJson(protectedContent);
        this.currentMindmapDataMap = mindmapDataMap; // Store for use in image renderer
        console.log('[MarkdownRenderer] Extracted', mindmapDataMap.size, 'KityMinder JSON data blocks');

        // Step 6: Render with marked (with protected LaTeX, JSON extracted)
        let html = this.markedParse(contentWithExtractedJson);

        // DEBUG: Check placeholders after marked processing
        const afterMarked = html.match(/MATH_(?:BLOCK|INLINE)_PLACEHOLDER_\d+|LATEX_ENV_PLACEHOLDER_\d+/g);
        console.log('[MarkdownRenderer] Placeholders after marked:', afterMarked ? afterMarked.length : 0);
        if (!afterMarked && beforeMarked) {
            console.log('[MarkdownRenderer] CRITICAL: Marked processing destroyed placeholders!');
            console.log('[MarkdownRenderer] HTML sample:', html.substring(0, 200));
        }

        // Step 7: Create container for post-processing
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Step 8: Restore LaTeX environments and process with KaTeX
        this.restoreLaTeXEnvironments(tempDiv, latexPlaceholders);

        // Step 9: Post-process remaining math expressions using KaTeX directly
        this.processKaTeXMath(tempDiv);

        // Recovery pass: if any stray TeX sequences remain in the HTML (e.g. due to
        // markdown transformations that removed placeholders), attempt to find
        // and replace raw TeX directly in the DOM so exported HTML matches preview.
        try {
            this.recoverMathFromHTML(tempDiv);
        } catch (e) {
            console.warn('[MarkdownRenderer] recoverMathFromHTML failed:', e && e.message ? e.message : e);
        }

        // Progressive MathJax re-render: if some placeholders used fallback while MathJax still pending
        if (this._mathFallbacksUsed.length && this._mathJaxReadyState === 'pending' && this._mathJaxReadyPromise) {
            const pendingUpgrades = [...this._mathFallbacksUsed];
            console.log(`[MarkdownRenderer] Scheduling progressive MathJax upgrade for ${pendingUpgrades.length} math blocks`);
            this._mathJaxReadyPromise.then(ready => {
                if (!ready) return; // timeout, do nothing
                // Re-render only the fallback blocks inside current container (if still present)
                pendingUpgrades.forEach(up => {
                    try {
                        // Find rendered element corresponding to pattern content (heuristic: search by original TeX text comment marker could be added; using text for now minimal risk)
                        const selector = up.display ? '.math-display' : '.math-inline';
                        const candidates = tempDiv.querySelectorAll(selector);
                        for (const el of candidates) {
                            if (el.textContent && el.textContent.replace(/\s+/g,'').includes(up.content.replace(/\s+/g,''))) {
                                const node = window.MathJax.tex2svg(up.content, { display: up.display });
                                if (node && node.outerHTML) {
                                    el.innerHTML = node.outerHTML;
                                    el.setAttribute('data-upgraded-mathjax','true');
                                }
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn('[MarkdownRenderer] Progressive MathJax upgrade failed for block:', e);
                    }
                });
                console.log('[MarkdownRenderer] Progressive MathJax upgrade complete');
            });
        }

        // Step 10: Post-process diagrams and special content
        console.log('[MarkdownRenderer] About to call postProcess...');
        html = await this.postProcess(tempDiv.innerHTML);
        console.log('[MarkdownRenderer] postProcess completed, continuing...');
        tempDiv.innerHTML = html;

        // Step 11: Process multimedia embeds
        console.log('[MarkdownRenderer] Processing multimedia embeds...');
        if (typeof this.processMultimediaEmbeds === 'function') {
            this.processMultimediaEmbeds(tempDiv);
            console.log('[MarkdownRenderer] Multimedia embeds completed');
        } else {
            console.log('[MarkdownRenderer] processMultimediaEmbeds method not available');
        }

        // Step 12: Process enhanced task lists
        console.log('[MarkdownRenderer] Processing task lists...');
        if (typeof this.processTaskLists === 'function') {
            this.processTaskLists(tempDiv);
            console.log('[MarkdownRenderer] Task lists completed');
        } else {
            console.log('[MarkdownRenderer] processTaskLists method not available');
        }

        // Step 13: Process data tables with sorting
        console.log('[MarkdownRenderer] Processing data tables...');
        if (typeof this.processDataTables === 'function') {
            this.processDataTables(tempDiv);
            console.log('[MarkdownRenderer] Data tables completed');
        } else {
            console.log('[MarkdownRenderer] processDataTables method not available');
        }

            // Step 12: Process footnotes
            console.log('[MarkdownRenderer] Processing footnotes...');
            if (typeof this.processFootnotes === 'function') {
                this.processFootnotes(tempDiv);
                console.log('[MarkdownRenderer] Footnotes completed');
            } else {
                console.log('[MarkdownRenderer] processFootnotes method not available');
            }

            // Step 13: Add copy functionality to code blocks
            console.log('[MarkdownRenderer] Adding copy code functionality...');
            if (typeof this.addCopyCodeFunctionality === 'function') {
                this.addCopyCodeFunctionality(tempDiv);
                console.log('[MarkdownRenderer] Copy code functionality completed');
            } else {
                console.log('[MarkdownRenderer] addCopyCodeFunctionality method not available');
            }

            // Step 14: Get final HTML
            html = tempDiv.innerHTML;

            // --- MPE-STYLE PLUGIN POSTPROCESSING ---
            console.log('[MarkdownRenderer] Starting MPE-style plugin postprocessing...');
            for (const plugin of pluginsToUse) {
                const pname = plugin.pluginName || plugin.name || 'anonymous';
                if (typeof plugin === 'function' && plugin.type === 'post' && (!options.onlyEnabledPlugins ? !disabledPlugins.includes(pname) : true)) {
                    try {
                        console.log(`[MarkdownRenderer] Processing plugin: ${pname}`);
                        html = plugin(html) || html;
                        console.log(`[MarkdownRenderer] Plugin ${pname} completed`);
                    } catch (e) {
                        console.warn('[MarkDD Plugin] Postprocessing error:', e);
                    }
                }
            }
            console.log('[MarkdownRenderer] MPE-style plugin postprocessing completed');

            console.log('[MarkdownRenderer] Render method completing successfully');
            return html;
        } catch (error) {
            console.error('[MarkdownRenderer] Render error:', error);
            return `<div class="error">Render Error: ${error.message}</div>`;
        }
    }

    renderMermaid(code) {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="mermaid-container" data-mermaid-id="${id}" data-mermaid-code="${encodeURIComponent(code)}">
            <div class="mermaid-loading">Loading diagram...</div>
        </div>`;
    }

    renderTikZ(code, lang) {
        // CRITICAL DEBUG: Log language parameter immediately
        console.error('🔥🔥🔥 [CRITICAL] renderTikZ() CALLED with lang =', lang, '🔥🔥🔥');
        
        // Check for NodeTikZIntegration first, then fallback to other integrations
        const nodeTikzIntegration = this.nodeTikzIntegration || (window.NodeTikZIntegration ? new window.NodeTikZIntegration() : null);
        const tikzIntegration = nodeTikzIntegration || this.obsidianTikZJax || this.tikzIntegration;
        
        console.error('[DEBUG] renderTikZ called with:', { code: code ? code.substring(0, 100) : 'null/undefined', lang });
        
        if (tikzIntegration) {
            if (tikzIntegration.isInitialized === false) {
                // Initialization failed
                return `<div class="diagram-error">TikZ library failed to load. Please check your configuration.</div>`;
            } else if (!tikzIntegration.isInitialized && !nodeTikzIntegration) {
                // Still initializing (NodeTikZIntegration doesn't have isInitialized)
                return `<div class="tikz-loading">Loading TikZ library...</div>`;
            }
        } else if (!window.tikzjax && !window.TikZJax && !window.TikZJaxLoader && !window.NodeTikZIntegration) {
            // No integration and no global
            return `<div class="diagram-error">TikZ library not loaded. Please check your configuration.</div>`;
        }
        
        // CRITICAL FIX: Restore math expressions BEFORE encoding
        // TikZ code may contain HTML math placeholders like <span class="math-placeholder">...
        // These must be converted back to original LaTeX math ($x$, $y$, etc.) before sending to LaTeX engine
        console.log('[MarkdownRenderer] TikZ: Restoring math in code before encoding...');
        const cleanCode = this.restoreMathInTikZCode(code);
        if (cleanCode !== code) {
            console.log('[MarkdownRenderer] TikZ: Successfully restored math expressions');
            console.log('[MarkdownRenderer] TikZ: Original code sample:', code.substring(0, 200));
            console.log('[MarkdownRenderer] TikZ: Clean code sample:', cleanCode.substring(0, 200));
        }

        const id = `tikz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const isCircuit = lang === 'circuitikz';
        console.error('[DEBUG] renderTikZ: lang parameter =', lang, ', isCircuit =', isCircuit);
        const encodedCode = encodeURIComponent(cleanCode);
        console.error('[DEBUG] renderTikZ encoding:', { lang, isCircuit, originalCode: cleanCode.substring(0, 100), encodedCode: encodedCode.substring(0, 100) });
        
        return `<div class="tikz-container" data-tikz-id="${id}" data-tikz-code="${encodedCode}" data-is-circuit="${isCircuit}">
            <div class="tikz-loading">Loading ${isCircuit ? 'CircuiTikZ' : 'TikZ'} diagram...</div>
        </div>`;
    }

    renderMarkmap(code) {
        // Robustly check for Markmap globals
        if (!window.markmap || typeof window.markmap.transform !== 'function' || typeof window.markmap.Markmap !== 'function') {
            return `<div class="diagram-error">Markmap library not loaded or incomplete. Please check your internet connection or library loader settings.</div>`;
        }
        const id = `markmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="markmap-inline-container" data-markmap-id="${id}" data-markmap-code="${encodeURIComponent(code)}">
            <div class="markmap-loading">Loading mind map...</div>
        </div>`;
    }

    renderGraphviz(code, engine = 'dot') {
        // Always create a container - let the post-processing handle library loading and error display
        const id = `graphviz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="graphviz-container" data-graphviz-id="${id}" data-graphviz-code="${encodeURIComponent(code)}" data-graphviz-engine="${engine}">
            <div class="graphviz-loading">Loading GraphViz diagram (${engine})...</div>
        </div>`;
    }

    renderAbcMusic(code) {
        const id = `abc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="abc-container" data-abc-id="${id}" data-abc-code="${encodeURIComponent(code)}">
            <div class="abc-loading">Loading music notation...</div>
        </div>`;
    }

    renderWavedrom(code) {
        const id = `wavedrom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="wavedrom-container" data-wavedrom-id="${id}" data-wavedrom-code="${encodeURIComponent(code)}">
            <div class="wavedrom-loading">Loading timing diagram...</div>
        </div>`;
    }

    renderPlantUML(code) {
        if (!window.plantumlEncoder) {
            return `<div class="diagram-error">PlantUML encoder library not loaded. Please check your internet connection or library loader settings.</div>`;
        }
        const id = `plantuml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="plantuml-container" data-plantuml-id="${id}" data-plantuml-code="${encodeURIComponent(code)}">
            <div class="plantuml-loading">Loading PlantUML diagram...</div>
        </div>`;
    }

    renderVegaLite(code) {
        if (!window.vegaEmbed) {
            return `<div class="diagram-error">Vega/Vega-Lite (vega-embed) library not loaded. Please check your internet connection or library loader settings.</div>`;
        }
        const id = `vega-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="vega-lite-container" data-vega-id="${id}" data-vega-code="${encodeURIComponent(code)}">
            <div class="vega-loading">Loading Vega-Lite visualization...</div>
        </div>`;
    }

    processKaTeXMath(container) {
        // This method now handles remaining math with MathJax as primary, KaTeX as fallback
        const hasKaTeX = !!(this.katex && typeof this.katex.renderToString === 'function');
        const hasMathJax = !!(window.MathJax && typeof window.MathJax.tex2svg === 'function');

        if (!hasMathJax && !hasKaTeX) {
            console.warn('[MarkdownRenderer] Neither MathJax nor KaTeX available for math rendering');
            return;
        }

        console.log(`[MarkdownRenderer] Math rendering availability - MathJax: ${hasMathJax}, KaTeX: ${hasKaTeX}. Preferring MathJax when available.`);

        // Clean content for math processing
        const cleanLatexContent = (content) => {
            return content
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&nbsp;/g, ' ')
                .replace(/<br\s*\/?>/gi, ' \\\\ ')
                .replace(/<[^>]*>/g, '')
                .replace(/[ \t]+/g, ' ')
                .replace(/\\\\\s*\\\\/g, '\\\\')
                .trim();
        };

        // Math expression renderer - MathJax primary, KaTeX fallback
        const renderMathExpression = (content, displayMode = false) => {
            const cleanedContent = cleanLatexContent(content);

            // Try MathJax first (preferred) then KaTeX as a robust fallback
            if (hasMathJax) {
                try {
                    const node = window.MathJax.tex2svg(cleanedContent, { display: displayMode });
                    let htmlOutput;
                    if (typeof node === 'string') htmlOutput = node;
                    else if (node && typeof node.outerHTML === 'string') htmlOutput = node.outerHTML;
                    else if (node && node.node && window.MathJax.startup && window.MathJax.startup.adaptor) htmlOutput = window.MathJax.startup.adaptor.outerHTML(node.node);
                    if (htmlOutput) {
                        htmlOutput = this.sanitizeMathJaxSVG(htmlOutput);

                        // If MathJax produced an explicit merror subtree (e.g. Unknown environment),
                        // prefer KaTeX fallback and ensure any merror fragments are not exported.
                        if (/\<merror|Unknown environment/i.test(htmlOutput) && hasKaTeX) {
                            console.warn('[MarkdownRenderer] MathJax produced <merror> content; using KaTeX fallback and stripping merror fragments');
                            try {
                                let katexHtml = this.katex.renderToString(cleanedContent, {
                                    displayMode: displayMode,
                                    throwOnError: false,
                                    errorColor: '#cc0000',
                                    strict: false,
                                    trust: false,
                                    macros: this.katexOptions && this.katexOptions.macros ? this.katexOptions.macros : {}
                                });
                                // Sanitize katexHtml by removing any MathJax remnants if present
                                if (typeof document !== 'undefined') {
                                    try {
                                        const tmp = document.createElement('div');
                                        tmp.innerHTML = katexHtml;
                                        // remove any mjx-container or merror nodes
                                        const mjx = tmp.querySelectorAll('mjx-container, merror, [data-mml-node="merror"], .MathJax');
                                        mjx.forEach(n => n.remove());
                                        katexHtml = tmp.innerHTML;
                                    } catch (stripErr) {
                                        console.warn('[MarkdownRenderer] Failed to strip MathJax remnants from KaTeX output:', stripErr);
                                    }
                                }
                                return `<span class="math-${displayMode ? 'display' : 'inline'}" data-engine="katex">${katexHtml}</span>`;
                            } catch (kfErr) {
                                console.warn('[MarkdownRenderer] KaTeX fallback after MathJax merror failed:', kfErr && kfErr.message ? kfErr.message : kfErr);
                                // Fall back to returning the MathJax output (sanitized) to avoid total failure
                                return `<span class="math-${displayMode ? 'display' : 'inline'}" data-engine="mathjax">${htmlOutput.replace(/<merror[\s\S]*?<\/merror>/gi, '')}</span>`;
                            }
                        }

                        return `<span class="math-${displayMode ? 'display' : 'inline'}" data-engine="mathjax">${htmlOutput}</span>`;
                    }
                } catch (mjErr) {
                    console.warn('[MarkdownRenderer] MathJax render failed, will try KaTeX fallback:', mjErr && mjErr.message ? mjErr.message : mjErr);
                }
            }

            if (hasKaTeX) {
                try {
                    let result = this.katex.renderToString(cleanedContent, {
                        displayMode: displayMode,
                        throwOnError: false,
                        errorColor: '#cc0000',
                        strict: false,
                        trust: false,
                        macros: this.katexOptions && this.katexOptions.macros ? this.katexOptions.macros : {}
                    });
                    // Defensive: remove any accidental MathJax fragments in KaTeX output
                    if (typeof document !== 'undefined') {
                        try {
                            const tmp2 = document.createElement('div');
                            tmp2.innerHTML = result;
                            const stray = tmp2.querySelectorAll('mjx-container, merror, [data-mml-node="merror"], .MathJax');
                            stray.forEach(n => n.remove());
                            result = tmp2.innerHTML;
                        } catch (stripErr2) {
                            console.warn('[MarkdownRenderer] Failed to remove stray MathJax fragments from KaTeX output:', stripErr2);
                        }
                    }
                    return `<span class="math-${displayMode ? 'display' : 'inline'}" data-engine="katex">${result}</span>`;
                } catch (kErr) {
                    console.warn('[MarkdownRenderer] KaTeX fallback render failed:', kErr && kErr.message ? kErr.message : kErr);
                    return `<span class="math-error">Math Error: ${kErr && kErr.message ? kErr.message : 'render failed'}</span>`;
                }
            }

            return `<span class="math-error">Math Error: No renderer available</span>`;
        };

        // Only process any stray LaTeX environments that weren't caught by protection
        const latexEnvironments = [
            'align', 'align*', 'equation', 'equation*', 'gather', 'gather*',
            'multline', 'multline*', 'split', 'eqnarray', 'eqnarray*',
            'cases', 'matrix', 'pmatrix', 'bmatrix', 'vmatrix', 'Vmatrix',
            'array', 'alignat', 'alignat*', 'flalign', 'flalign*'
        ];

        let envProcessed = 0;
        latexEnvironments.forEach(env => {
            const escapedEnv = env.replace('*', '\\*');
            const envPattern = new RegExp(`\\\\begin\\{${escapedEnv}\\}([\\s\\S]*?)\\\\end\\{${escapedEnv}\\}`, 'gi');
            
            // Find all matches first to avoid modifying DOM while iterating
            const matches = [];
            let match;
            const textContent = container.textContent || container.innerText || '';
            while ((match = envPattern.exec(textContent)) !== null) {
                matches.push(match);
            }
            
            // Process each match using DOM-based replacement
            matches.forEach(match => {
                envProcessed++;
                const fullMathContent = match[0];
                console.log(`[MarkdownRenderer] Processing remaining LaTeX environment ${env}`);
                const rendered = renderMathExpression(fullMathContent, true);
                const wrapper = document.createElement('div');
                wrapper.className = 'math-environment';
                wrapper.innerHTML = rendered;
                this.replacePlaceholderInDOM(container, fullMathContent, wrapper);
            });
        });

        // Legacy processing is disabled - focused protection system handles all math rendering
        
        // Legacy processing is disabled - focused protection system handles all math rendering

        // Trigger MathJax re-render if needed (only if MathJax was the primary renderer)
        // NOTE: Use a safe presence check for MathJax instead of the undefined `useMathJax` flag.
        if (this.mathEngine === 'mathjax' && this.mathjax && window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([container])
                .then(() => {
                    try {
                        this.sanitizeMathJaxDOM(container);
                    } catch (e) {
                        console.warn('[MarkdownRenderer] sanitizeMathJaxDOM after typeset failed:', e);
                    }
                })
                .catch((err) => {
                    console.warn('[MarkdownRenderer] MathJax typeset error:', err);
                });
        }

        console.log('[MarkdownRenderer] COMPREHENSIVE MATH PROCESSING COMPLETED');
    }

    protectLaTeXEnvironments(content) {
        console.error('🔥🔥🔥 CRITICAL DEBUG: protectLaTeXEnvironments EXECUTING 🔥🔥🔥');
        console.log('===== FOCUSED FIX DEBUG: protectLaTeXEnvironments called =====');
        console.log('[MarkdownRenderer] Protecting LaTeX environments before Marked processing');
        console.log('[MarkdownRenderer] Input content sample:', content.substring(0, 500));

        const placeholders = new Map();
        let placeholderIndex = 0;

        let protectedContent = content;

        // CRITICAL FIX: Validate display math blocks before processing
        function validateDisplayMathBlocks(text) {
            const dollarsMatches = text.match(/\$\$\$/g);
            const dollarsCount = dollarsMatches ? dollarsMatches.length : 0;

            console.log('[MarkdownRenderer] Found $ occurrences:', dollarsCount);

            if (dollarsCount % 2 !== 0) {
                console.error('[MarkdownRenderer] CRITICAL: Unclosed display math block detected! Found', dollarsCount, '$ delimiters');

                // More conservative fix: only add closing $ if the last unclosed block is clearly math
                const lastDollarIndex = text.lastIndexOf('$');
                if (lastDollarIndex !== -1) {
                    const afterLastDollar = text.substring(lastDollarIndex + 2);

                    // Only fix if content after last $ looks like math (contains LaTeX commands or math symbols)
                    const looksLikeMath = /\\[a-zA-Z]+|[a-zA-Z]_\{|[a-zA-Z]\^|\\frac|\\begin|\\end|\{.*\}/.test(afterLastDollar);
                    const hasMarkdown = /#+\s|^\s*[-*]\s|\[.*\]\(^---/m.test(afterLastDollar);

                    if (looksLikeMath && !hasMarkdown && afterLastDollar.trim().length > 5 && afterLastDollar.trim().length < 500) {
                        console.log('[MarkdownRenderer] Attempting to fix unclosed $ - content looks like math');
                        text = text + '\n$';
                    } else {
                        console.warn('[MarkdownRenderer] Not fixing unclosed $ - content does not look like math or is too long');
                    }
                }
            }

            // Additional validation: Check specific math blocks for markdown contamination
            const potentialMathBlocks = text.match(/\$\$[[\s\S]*?\]\$\$/g);
            if (potentialMathBlocks) {
                potentialMathBlocks.forEach((block, index) => {
                    const content = block.slice(2, -2).trim(); // Remove $ delimiters

                    // Check for obvious markdown patterns that should not be in math
                    const hasMarkdownContamination = (
                        content.includes('**') || content.includes('##') ||
                        content.includes('- ') || content.includes('* ') ||
                        content.includes('[!') || content.includes('](') ||
                        /\n\s*#+\s/.test(content) || // headers
                        /\n\s*[-*]\s/.test(content) || // lists
                        content.includes('```') // code blocks
                    );

                    if (hasMarkdownContamination) {
                        console.error(`[MarkdownRenderer] CRITICAL: Math block ${index + 1} contains markdown syntax:`, content.substring(0, 100));
                    }
                });
            }

            return text;
        }

        // Validate and fix unclosed blocks
        protectedContent = validateDisplayMathBlocks(protectedContent);

        // --- Display Math with Bracket Delimiters \[...\] Protection ---
        // MUST come BEFORE $$...$$ to handle \[...\] first
        const bracketDisplayMathRegex = /\\\[([\s\S]*?)\\\]/g;
        const bracketDisplayMatches = [];
        let bracketMatch;
        while ((bracketMatch = bracketDisplayMathRegex.exec(protectedContent)) !== null) {
            const fullMatch = bracketMatch[0];
            const innerContent = bracketMatch[1].trim();

            if (!fullMatch.includes('PLACEHOLDER_') && innerContent.length > 0) {
                bracketDisplayMatches.push({
                    fullMatch: fullMatch,
                    innerContent: innerContent,
                    index: bracketMatch.index
                });
            }
        }

        // Replace from end to start to avoid index shifting
        bracketDisplayMatches.sort((a, b) => b.index - a.index);

        bracketDisplayMatches.forEach((matchData) => {
            const placeholderKey = `MATH_DISPLAY_${placeholderIndex}`;
            const innerContent = matchData.innerContent;

            placeholders.set(placeholderKey, {
                type: 'display-math',
                content: innerContent,
                originalMatch: matchData.fullMatch,
                index: placeholderIndex,
                leadingMarkdown: '',
                trailingMarkdown: ''
            });

            const hiddenMarker = `\u200C[${placeholderKey}]`;
            const spanPlaceholder = `<span class="math-placeholder" data-math-placeholder="${placeholderKey}">${hiddenMarker}</span>`;
            
            const replacement = spanPlaceholder;

            protectedContent = protectedContent.substring(0, matchData.index) +
                               replacement +
                               protectedContent.substring(matchData.index + matchData.fullMatch.length);

            placeholderIndex++;
        });

        // --- AsciiMath Backtick Protection ---
        // MUST come AFTER \[...\] and BEFORE inline math to avoid conflicts with code blocks
        // Protect backtick-delimited AsciiMath: `x = (-b +- sqrt(b^2 - 4ac))/(2a)`
        const backtickMathRegex = /`([^`\n\r]+?)`/g;
        const backtickMatches = [];
        let backtickMatch;
        
        while ((backtickMatch = backtickMathRegex.exec(protectedContent)) !== null) {
            const fullMatch = backtickMatch[0];
            const innerContent = backtickMatch[1].trim();
            
            // Validate it's math-like content (AsciiMath uses operators like +-, sqrt, /, *, ^, etc.)
            const isMathLike = (
                innerContent.length > 0 &&
                !fullMatch.includes('PLACEHOLDER_') &&
                // AsciiMath typically has math operators or functions
                /[+\-*/^=<>]|sqrt|frac|sum|int|lim|sin|cos|tan|log|exp|alpha|beta|gamma|theta|pi/.test(innerContent) &&
                // Not a code snippet (no common code keywords)
                !/function|const|let|var|return|if|for|while|class|import|export/.test(innerContent)
            );
            
            if (isMathLike) {
                backtickMatches.push({
                    fullMatch: fullMatch,
                    innerContent: innerContent,
                    index: backtickMatch.index
                });
            }
        }

        // Replace from end to start
        backtickMatches.sort((a, b) => b.index - a.index);

        backtickMatches.forEach(matchData => {
            const { fullMatch, innerContent } = matchData;
            const placeholderKey = `MATH_ASCIIMATH_${placeholderIndex}`;

            placeholders.set(placeholderKey, {
                type: 'asciimath',
                content: innerContent,
                originalMatch: fullMatch,
                index: placeholderIndex
            });

            const asciiHidden = `\u200C[${placeholderKey}]`;
            const replacement = `<span class="math-placeholder" data-math-placeholder="${placeholderKey}">${asciiHidden}</span>`;

            protectedContent = protectedContent.substring(0, matchData.index) +
                               replacement +
                               protectedContent.substring(matchData.index + fullMatch.length);

            placeholderIndex++;
        });

        // --- Display Math Protection ---
    // Capture optional following newline so we can preserve spacing when
    // a header follows immediately after a display math block.
    const displayMathRegex = /(?:^|\s)\$\$((?:[^$]|\$(?!\$))*?)\$\$(\r?\n)?(?=\s|$)/gm;
        const displayMatches = [];
        let match;
        while ((match = displayMathRegex.exec(protectedContent)) !== null) {
            const fullMatch = match[0];
            const innerContent = match[1].trim();
            const capturedNewline = match[2] || '';

            if (!fullMatch.includes('PLACEHOLDER_') && innerContent.length > 0) {
                displayMatches.push({
                    fullMatch: fullMatch,
                    innerContent: innerContent,
                    index: match.index,
                    newlineSuffix: capturedNewline
                });
            }
        }

        // Replace from end to start to avoid index shifting issues
        displayMatches.sort((a, b) => b.index - a.index);

        displayMatches.forEach((matchData) => {
            const placeholderKey = `MATH_DISPLAY_${placeholderIndex}`;
            const rawInner = matchData.innerContent;
            let innerContent = rawInner;
            let leadingMarkdown = '';
            let trailingMarkdown = '';

            const isEnvironment = /\\begin\{[^}]+\}/.test(innerContent);

            if (isEnvironment) {
                // If there's text before the \begin{...}, keep it outside the math placeholder
                const beginMatch = innerContent.match(/\\begin\{/);
                if (beginMatch && beginMatch.index > 0) {
                    leadingMarkdown = innerContent.slice(0, beginMatch.index).trim();
                    innerContent = innerContent.slice(beginMatch.index).trim();
                }

                // If there's text after the last \end{...}, keep it outside the placeholder
                const endMatch = innerContent.match(/\\end\{[^}]+\}/g);
                if (endMatch) {
                    const lastEnd = endMatch[endMatch.length - 1];
                    const lastEndIdx = innerContent.lastIndexOf(lastEnd) + lastEnd.length;
                    if (lastEndIdx < innerContent.length) {
                        trailingMarkdown = innerContent.slice(lastEndIdx).trim();
                        innerContent = innerContent.slice(0, lastEndIdx).trim();
                    }
                }
            }

            placeholders.set(placeholderKey, {
                type: isEnvironment ? 'latex-environment' : 'display-math',
                content: innerContent,
                originalMatch: matchData.fullMatch,
                index: placeholderIndex,
                leadingMarkdown: leadingMarkdown,
                trailingMarkdown: trailingMarkdown
            });

            const hiddenMarker = `\u200C[${placeholderKey}]`;
            const spanPlaceholder = `<span class="math-placeholder" data-math-placeholder="${placeholderKey}">${hiddenMarker}</span>`;
            
            const beforeWhitespace = matchData.fullMatch.match(/^(\s*)/)[1];
            const afterWhitespace = matchData.fullMatch.match(/(\s*)$/)[1];
            // Preserve a single newline after the placeholder if the original
            // match included one (helps keep headers separated).
            const newlineSuffix = matchData.newlineSuffix || (matchData.fullMatch.endsWith('\n') || matchData.fullMatch.endsWith('\r\n') ? '\n' : '');

            // IMPORTANT: Do NOT insert leading/trailing markdown back into the raw
            // markdown (it will be processed by marked and may generate HTML that
            // corrupts math placeholders). Keep leading/trailing text in the
            // placeholder data and reinsert into the DOM after marked renders.
            const replacement = `${beforeWhitespace}${spanPlaceholder}${afterWhitespace}${newlineSuffix}`;

            protectedContent = protectedContent.substring(0, matchData.index) +
                               replacement +
                               protectedContent.substring(matchData.index + matchData.fullMatch.length);

            placeholderIndex++;
        });

        // --- Inline Math with Parenthesis Delimiters \(...\) Protection ---
        // MUST come BEFORE $...$ to handle \(...\) first
        // Use non-greedy match that handles nested parentheses by matching everything until \)
        const parenInlineMathRegex = /\\\(((?:[^\\\r\n]|\\(?!\)))+?)\\\)/g;
        const parenInlineMatches = [];
        let parenMatch;
        
        let tempContentForParenRegex = protectedContent;
        while ((parenMatch = parenInlineMathRegex.exec(tempContentForParenRegex)) !== null) {
            const fullMatch = parenMatch[0];
            const innerContent = parenMatch[1].trim();
            
            // Validate it's actual math content
            if (innerContent.length > 0 && !fullMatch.includes('PLACEHOLDER_')) {
                parenInlineMatches.push({
                    fullMatch: fullMatch,
                    innerContent: innerContent,
                    index: parenMatch.index
                });
            }
        }

        // Replace from end to start
        parenInlineMatches.sort((a, b) => b.index - a.index);

        parenInlineMatches.forEach(matchData => {
            const { fullMatch, innerContent } = matchData;
            const placeholderKey = `MATH_INLINE_${placeholderIndex}`;

            placeholders.set(placeholderKey, {
                type: 'inline-math',
                content: innerContent,
                originalMatch: fullMatch,
                index: placeholderIndex
            });

            const inlineHidden = `\u200C[${placeholderKey}]`;
            const replacement = `<span class="math-placeholder" data-math-placeholder="${placeholderKey}">${inlineHidden}</span>`;

            protectedContent = protectedContent.substring(0, matchData.index) +
                               replacement +
                               protectedContent.substring(matchData.index + fullMatch.length);

            placeholderIndex++;
        });

        // --- Inline Math Protection ---
    // Match $...$ without consuming trailing whitespace so spacing after math is preserved.
    // Allow backslash-letter sequences (e.g. \Gamma) including capital Greek names.
    const inlineMathRegex = /(?<![\\$])\$([^$\n\r]+?)\$(?![\\$])/g;
        const inlineMatches = [];
        let inlineMatch;
        
        // Execute regex on a temporary string to avoid state issues with `protectedContent`
        let tempContentForRegex = protectedContent;
        while ((inlineMatch = inlineMathRegex.exec(tempContentForRegex)) !== null) {
            inlineMatches.push({
                fullMatch: inlineMatch[0],
                innerContent: inlineMatch[1],
                index: inlineMatch.index
            });
        }

        // Replace from end to start
        inlineMatches.sort((a, b) => b.index - a.index);

        inlineMatches.forEach(matchData => {
            const { fullMatch, innerContent } = matchData;

            // Improved validation for what constitutes actual math
            const isActualMath = (
                innerContent.trim().length > 0 &&
                !/\s{2,}/.test(innerContent) && // No multiple spaces
                !innerContent.includes('http') && // Not a URL
                !/^[\s.,!?;:()-]+$/.test(innerContent) && // Not just punctuation
                // Exclude function calls (identifier followed by parentheses) and method calls (with dots)
                !/^[a-zA-Z_][a-zA-Z0-9_.]*\s*\(.*\)$/.test(innerContent) && // Not function calls like showMarkmapCreationDialog() or Math.sqrt(4)
                // It's math if it has letters, commands, or structure chars.
                // This avoids matching prices like $10.99 but allows $10^2$.
                /[a-zA-Z\\{}^_]/.test(innerContent)
            );

            if (isActualMath && !fullMatch.includes('PLACEHOLDER_') && !innerContent.includes('**') && !innerContent.includes('`')) {
                const placeholderKey = `MATH_INLINE_${placeholderIndex}`;

                placeholders.set(placeholderKey, {
                    type: 'inline-math',
                    content: innerContent,
                    originalMatch: fullMatch,
                    index: placeholderIndex
                });

                const inlineHidden = `\u200C[${placeholderKey}]`;
                const replacement = `<span class="math-placeholder" data-math-placeholder="${placeholderKey}">${inlineHidden}</span>`;

                protectedContent = protectedContent.substring(0, matchData.index) +
                                   replacement +
                                   protectedContent.substring(matchData.index + fullMatch.length);

                placeholderIndex++;
            }
        });

        console.log('[MarkdownRenderer] FOCUSED: Math protection completed');
        return { protectedContent, latexPlaceholders: placeholders };
    }


    /**
     * Restore math expressions in TikZ code strings
     * Replaces HTML placeholder spans with original LaTeX math ($x$, $$...$$, etc.)
     * CRITICAL: Must be called BEFORE encoding TikZ code for LaTeX engine
     */
    restoreMathInTikZCode(code) {
        if (!code || typeof code !== 'string') return code;
        if (!this.currentLatexPlaceholders || this.currentLatexPlaceholders.size === 0) {
            return code; // No placeholders to restore
        }

        let cleanCode = code;
        
        // Pattern matches: <span class="math-placeholder" data-math-placeholder="MATH_INLINE_X">‌[MATH_INLINE_X]</span>
        // Also handle variations with/without zero-width character and bracket notation
        const placeholderPattern = /<span class="math-placeholder" data-math-placeholder="([^"]+)">[^<]*<\/span>/g;
        
        cleanCode = cleanCode.replace(placeholderPattern, (match, placeholderKey) => {
            const placeholderData = this.currentLatexPlaceholders.get(placeholderKey);
            if (!placeholderData) {
                console.warn('[MarkdownRenderer] TikZ: Could not find placeholder data for', placeholderKey);
                return match; // Keep original if not found
            }
            
            // Reconstruct original LaTeX syntax based on type
            const content = placeholderData.content;
            let originalMath = '';
            
            if (placeholderData.type === 'display-math') {
                // Display math: $$...$$ or \[...\]
                if (placeholderData.originalMatch && placeholderData.originalMatch.startsWith('\\[')) {
                    originalMath = `\\[${content}\\]`;
                } else {
                    originalMath = `$$${content}$$`;
                }
            } else if (placeholderData.type === 'inline-math') {
                // Inline math: $...$
                originalMath = `$${content}$`;
            } else if (placeholderData.type === 'asciimath') {
                // AsciiMath: `...`
                originalMath = `\`${content}\``;
            } else if (placeholderData.type === 'latex-environment') {
                // LaTeX environment: \begin{...}...\end{...}
                originalMath = placeholderData.originalMatch || `\\begin{align}${content}\\end{align}`;
            } else {
                console.warn('[MarkdownRenderer] TikZ: Unknown placeholder type', placeholderData.type);
                originalMath = content; // Fallback to just content
            }
            
            console.log('[MarkdownRenderer] TikZ: Restored', placeholderKey, '->', originalMath);
            return originalMath;
        });
        
        return cleanCode;
    }

    restoreLaTeXEnvironments(container, placeholders) {
        console.log('[MarkdownRenderer] Restoring and rendering LaTeX environments');
        console.log('[MarkdownRenderer] Found placeholders to restore:', placeholders.size);
        
        // Process each placeholder and replace using the resilient span
        // placeholders inserted during protection. We no longer rely on
        // HTML comment placeholders because many markdown parsers strip them.
        placeholders.forEach((placeholderData, placeholderKey) => {
            const isDisplayMode = placeholderData.type === 'display-math' || placeholderData.type === 'latex-environment';
            const spanSel = `[data-math-placeholder="${placeholderKey}"]`;
            const spanEl = container.querySelector(spanSel);
            if (spanEl) {
                // Replace directly in the DOM using the element reference
                this.replaceMathPlaceholder(container, spanEl, placeholderData, isDisplayMode);
            } else {
                // Instrumentation: record diagnostics for missing placeholders so we can reproduce
                try {
                    if (!window._mathPlaceholderDiagnostics) window._mathPlaceholderDiagnostics = [];
                    const surroundingHtml = (container && container.innerHTML) ? container.innerHTML.substring(0, 2000) : null;
                    // Attempt to find nearest text node or parent snapshot
                    const nearest = Array.from(container.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes(placeholderKey));
                    const parentSnapshot = nearest && nearest.parentNode && nearest.parentNode.outerHTML ? nearest.parentNode.outerHTML.substring(0, 1000) : null;
                    const contextSnippet = nearest && nearest.textContent ? nearest.textContent.substring(0, 500) : null;

                    const diag = {
                        placeholderKey,
                        placeholderType: placeholderData && placeholderData.type,
                        foundSpan: false,
                        timestamp: Date.now(),
                        surroundingHtml,
                        parentSnapshot,
                        contextSnippet,
                        containerTag: container && container.tagName ? container.tagName : null
                    };
                    window._mathPlaceholderDiagnostics.push(diag);
                    console.warn(`[MarkdownRenderer] Span placeholder for ${placeholderKey} not found - recorded diagnostic (entry #${window._mathPlaceholderDiagnostics.length})`);
                } catch (diagErr) {
                    console.warn('[MarkdownRenderer] Failed to record placeholder diagnostic:', diagErr && diagErr.message ? diagErr.message : diagErr);
                }

                // If the exact span wasn't found, try a more lenient search for text markers and reconstruct
                const textMarker = placeholderKey;
                const textNode = Array.from(container.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes(textMarker));
                if (textNode) {
                    // Wrap the found text node occurrence in a temporary span and attempt replacement
                    try {
                        const walker = document.createTreeWalker(textNode, NodeFilter.SHOW_TEXT, null, false);
                        let tnode;
                        while ((tnode = walker.nextNode())) {
                            if (tnode.nodeValue && tnode.nodeValue.includes(textMarker)) {
                                const parts = tnode.nodeValue.split(textMarker);
                                const before = parts.shift();
                                const after = parts.join(textMarker);
                                const beforeNode = document.createTextNode(before);
                                const placeholderSpan = document.createElement('span');
                                placeholderSpan.className = 'math-placeholder-recovered';
                                placeholderSpan.setAttribute('data-math-placeholder', placeholderKey);
                                placeholderSpan.textContent = '';
                                const afterNode = document.createTextNode(after);
                                const parent = tnode.parentNode;
                                parent.insertBefore(beforeNode, tnode);
                                parent.insertBefore(placeholderSpan, tnode);
                                parent.insertBefore(afterNode, tnode);
                                parent.removeChild(tnode);
                                // Attempt replacement on the newly created placeholder
                                this.replaceMathPlaceholder(container, placeholderSpan, placeholderData, isDisplayMode);
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn(`[MarkdownRenderer] Failed to reconstruct placeholder for ${placeholderKey}:`, e && e.message ? e.message : e);
                    }
                } else {
                    // Nothing to do; diagnostic already recorded
                }
            }
        });
    }
    
    replaceMathPlaceholder(container, spanElement, placeholderData, isDisplayMode) {
        // Operate directly on the DOM element (spanElement) rather than string replacement
        try {
            if (!spanElement || !spanElement.parentNode) {
                console.warn('[MarkdownRenderer] replaceMathPlaceholder: invalid span element');
                return;
            }
            // Skip replacing placeholders that live inside code/pre or code-block containers
            try {
                if (spanElement.closest && spanElement.closest('code, pre, .code-pre, .code-export-fallback, .code-block-content, .code-block-container')) {
                    console.log('[MarkdownRenderer] Skipping math replacement inside code/pre block for placeholder', spanElement.getAttribute('data-math-placeholder'));
                    return;
                }
            } catch (e) {
                // ignore any errors from closest checks
            }
            this.doMathReplacement(container, spanElement, placeholderData, isDisplayMode);
        } catch (e) {
            console.warn('[MarkdownRenderer] replaceMathPlaceholder error:', e && e.message ? e.message : e);
        }
    }
    
    doMathReplacement(container, spanElement, placeholderData, isDisplayMode) {
        const targetDesc = spanElement && spanElement.getAttribute ? spanElement.getAttribute('data-math-placeholder') || '[span]' : '[unknown]';
        console.log(`[MarkdownRenderer] Restoring placeholder ${targetDesc}: ${placeholderData.type}, content sample: ${String(placeholderData.content || '').substring(0, 100)}`);

            try {
            let mathContent = placeholderData.content || '';

            // DEFINITIVE FIX: Ensure $ delimiters are completely removed from display math content
            if (isDisplayMode) {
                console.log('[MarkdownRenderer] DEFINITIVE: Removing any remaining $ delimiters from display math content');
                // Remove any opening and closing $ delimiters if present (multiple passes for safety)
                mathContent = mathContent.replace(/^\$+\s*/, '').replace(/\s*\$+$/, '');
                // Extra safety: remove any internal $ that might have been captured
                mathContent = mathContent.replace(/\$\$+/g, '');
                console.log(`[MarkdownRenderer] DEFINITIVE: Content after delimiter removal: ${mathContent.substring(0, 100)}`);
            }

            // For complex LaTeX environments (e.g. \begin{align}...\end{align}) preserve newlines
            // and avoid collapsing whitespace which can break environment structure.
            if (isDisplayMode && /\\begin\{[^}]+\}/.test(mathContent)) {
                // Minimal cleaning: decode common HTML entities and convert <br> to \\\\ while
                // preserving original newlines and spacing inside the environment.
                mathContent = String(mathContent)
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/&nbsp;/g, ' ')
                    .replace(/<br\s*\/?>/gi, ' \\\\ ')
                    // Remove any remaining HTML tags but keep line breaks
                    .replace(/<[^>]*>/g, '')
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .trim();
            } else {
                // For inline or simple display math use the normal cleaner that collapses
                // superfluous whitespace to keep inline rendering tidy.
                mathContent = this.cleanLatexForKaTeX(mathContent);
            }

            // Check if this is AsciiMath notation
            const isAsciiMath = placeholderData.type === 'asciimath';
            
            // Check if content contains chemistry formulas that require MathJax with mhchem
            const hasChemistry = /\\ce\{/.test(mathContent);
            
            // Check if content contains complex LaTeX environments that need MathJax
            const hasComplexEnvironment = /\\begin\{(align\*?|equation\*?|gather\*?|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|array|cases|alignat\*?|flalign\*?)\}/.test(mathContent);
            
            console.log(`[MarkdownRenderer] AsciiMath: ${isAsciiMath}, Chemistry detected: ${hasChemistry}, complex environment: ${hasComplexEnvironment}, engine: ${this.mathEngine}`);

            // If the placeholder content contains obvious markdown (headers/lists/code fences),
            // do not attempt to render as math: restore as preformatted text to avoid corruption.
            const containsMarkdownLike = /(^|\n)\s*#{1,6}\s+|(^|\n)\s*[-*+]\s+|```/.test(mathContent);
            if (containsMarkdownLike) {
                const pre = document.createElement('pre');
                pre.className = 'restored-markdown-placeholder';
                pre.textContent = placeholderData.originalMatch || mathContent;
                try {
                    spanElement.parentNode.replaceChild(pre, spanElement);
                } catch (err) {
                    // Fallback: safe innerHTML replace
                    container.innerHTML = container.innerHTML.replace(spanElement.outerHTML, pre.outerHTML);
                }
                console.log('[MarkdownRenderer] Restored placeholder as preformatted text due to markdown-like content');
                return;
            }

            // If the placeholder content looks like an HTML fragment, escaped HTML,
            // or already contains katex-error markers, avoid rendering it as LaTeX.
            const containsHtmlLike = /<[^>]+>|&lt;[^&]+&gt;|<!--\s*MATH_|class=("|')?katex-error/.test(mathContent);
            if (containsHtmlLike) {
                const pre = document.createElement('pre');
                pre.className = 'restored-html-placeholder';
                pre.textContent = placeholderData.originalMatch || mathContent;
                try {
                    spanElement.parentNode.replaceChild(pre, spanElement);
                } catch (err) {
                    container.innerHTML = container.innerHTML.replace(spanElement.outerHTML, pre.outerHTML);
                }
                console.log('[MarkdownRenderer] Restored placeholder as preformatted text due to HTML-like content');
                return;
            }

            // Use MathJax as primary, KaTeX as fallback (force MathJax for chemistry, complex environments, and AsciiMath)
            let rendered;
            let engineUsed = 'none';
            if (this.mathjax && (this.mathEngine === 'mathjax' || hasChemistry || hasComplexEnvironment || isAsciiMath)) {
                const readySync = this.isMathJaxReadySync();
                if (readySync) {
                    try {
                        // For AsciiMath, use asciimath2svg; for LaTeX, use tex2svg
                        let node;
                        if (isAsciiMath && window.MathJax.asciimath2svg) {
                            node = window.MathJax.asciimath2svg(mathContent, {display: isDisplayMode});
                        } else if (isAsciiMath) {
                            // Fallback: if asciimath2svg not available, try tex2svg (MathJax 4 might auto-convert)
                            console.warn('[MarkdownRenderer] asciimath2svg not available, using tex2svg fallback');
                            node = window.MathJax.tex2svg(mathContent, {display: isDisplayMode});
                        } else {
                            node = window.MathJax.tex2svg(mathContent, {display: isDisplayMode});
                        }
                        // Accept object with outerHTML/node or a string
                        if (typeof node === 'string') {
                            rendered = node;
                        } else if (node && typeof node.outerHTML === 'string') {
                            rendered = node.outerHTML;
                        } else if (node && node.node && window.MathJax.startup && window.MathJax.startup.adaptor) {
                            rendered = window.MathJax.startup.adaptor.outerHTML(node.node);
                        } else {
                            throw new Error('tex2svg returned unexpected format');
                        }

                        // *** FIX FOR HTML EXPORT: Embed SVG defs to make SVGs self-contained ***
                        if (typeof document !== 'undefined' && rendered && rendered.includes('<svg')) {
                            const defsNode = document.getElementById('MJX-SVG-global-defs');
                            if (defsNode) {
                                const defsContent = defsNode.innerHTML;
                                if (defsContent && !rendered.includes('<defs>')) { // Avoid double injection
                                    rendered = rendered.replace(/<svg([^>]*)>/, `<svg$1><defs>${defsContent}</defs>`);
                                }
                            }
                        }

                        // Fix MathJax SVG dimension calculation bugs (NaNex values)
                        rendered = this.sanitizeMathJaxSVG(rendered);

                        // Detect MathJax error output (merror / Unknown environment) and if present,
                        // prefer KaTeX fallback to avoid exporting raw error messages or merror tags.
                        const mjErrorDetected = /<merror|Unknown environment/i.test(rendered);
                        if (mjErrorDetected && this.katex) {
                            console.warn('[MarkdownRenderer] MathJax produced merror output; using KaTeX fallback for safety');
                            try {
                                rendered = this.katex.renderToString(mathContent, {
                                    displayMode: isDisplayMode,
                                    throwOnError: false,
                                    errorColor: '#cc0000',
                                    strict: false,
                                    trust: false,
                                    macros: {
                                        "\\RR": "\\mathbb{R}",
                                        "\\CC": "\\mathbb{C}",
                                        "\\NN": "\\mathbb{N}",
                                        "\\ZZ": "\\mathbb{Z}",
                                        "\\QQ": "\\mathbb{Q}",
                                        "\\FF": "\\mathbb{F}",
                                        "\\d": "\\mathrm{d}",
                                        "\\e": "\\mathrm{e}",
                                        "\\i": "\\mathrm{i}",
                                        "\\Re": "\\operatorname{Re}",
                                        "\\Im": "\\operatorname{Im}"
                                    }
                                });
                                engineUsed = 'katex-fallback';
                            } catch (kfErr) {
                                console.warn('[MarkdownRenderer] KaTeX fallback also failed after MathJax merror:', kfErr && kfErr.message ? kfErr.message : kfErr);
                            }
                        } else {
                            engineUsed = 'mathjax';
                        }
                    } catch (e) {
                        console.warn('[MarkdownRenderer] MathJax tex2svg threw unexpectedly after ready; falling back:', e);
                    }
                }
                if (!rendered) {
                    // Not ready or failed – fallback (do not log success as MathJax)
                    if (this.katex) {
                        rendered = this.katex.renderToString(mathContent, {
                            displayMode: isDisplayMode,
                            throwOnError: false,
                            errorColor: '#cc0000',
                            strict: false,
                            trust: false,
                            macros: {
                                "\\RR": "\\mathbb{R}",
                                "\\CC": "\\mathbb{C}",
                                "\\NN": "\\mathbb{N}",
                                "\\ZZ": "\\mathbb{Z}",
                                "\\QQ": "\\mathbb{Q}",
                                "\\FF": "\\mathbb{F}",
                                "\\d": "\\mathrm{d}",
                                "\\e": "\\mathrm{e}",
                                "\\i": "\\mathrm{i}",
                                "\\Re": "\\operatorname{Re}",
                                "\\Im": "\\operatorname{Im}"
                            }
                        });
                        engineUsed = 'katex-fallback';
                        if (this._mathJaxReadyState === 'pending') {
                            // Avoid referencing targetPattern here because in DOM-based
                            // replacement flows it may be undefined. Store only the
                            // minimal information needed to retry progressive upgrades.
                            this._mathFallbacksUsed.push({ content: mathContent, display: isDisplayMode });
                        }
                    } else {
                        throw new Error('No math engine available');
                    }
                }
            } else if (this.katex) {
                console.log('[MarkdownRenderer] Using KaTeX to render math');
                // Use KaTeX (either as primary choice or fallback)
                rendered = this.katex.renderToString(mathContent, {
                    displayMode: isDisplayMode,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false,
                    trust: false,
                    macros: {
                        "\\RR": "\\mathbb{R}",
                        "\\CC": "\\mathbb{C}",
                        "\\NN": "\\mathbb{N}",
                        "\\ZZ": "\\mathbb{Z}",
                        "\\QQ": "\\mathbb{Q}",
                        "\\FF": "\\mathbb{F}",
                        "\\d": "\\mathrm{d}",
                        "\\e": "\\mathrm{e}",
                        "\\i": "\\mathrm{i}",
                        "\\Re": "\\operatorname{Re}",
                        "\\Im": "\\operatorname{Im}"
                    }
                });
                engineUsed = 'katex';
            } else {
                console.error('[MarkdownRenderer] No math rendering engine available');
                const noEngineWrapper = document.createElement('div');
                noEngineWrapper.className = 'math-error';
                noEngineWrapper.textContent = 'No math rendering engine available';
                
                // CRITICAL FIX: Use simple innerHTML replacement for HTML comment placeholders
                const errorHTML = noEngineWrapper.outerHTML;
                container.innerHTML = container.innerHTML.replace(targetPattern, errorHTML);
                return;
            }

                const cssClass = isDisplayMode ? 'math-display' : 'math-inline';
                const tag = isDisplayMode ? 'div' : 'span';

                // Create wrapper element and insert the rendered content directly into DOM
                const wrapper = document.createElement(tag);
                wrapper.className = cssClass;
                wrapper.setAttribute('data-engine', engineUsed);
                // Preserve a marker for potential progressive upgrade
                try {
                    wrapper.setAttribute('data-original-math', encodeURIComponent(mathContent));
                } catch (e) {
                    // ignore attribute set errors
                }
                // If KaTeX was used as a fallback, ensure any residual MathJax error
                // subtrees (e.g. <mjx-container> containing <merror/Unknown environment>)
                // are removed from the produced HTML to avoid exporting raw error
                // markup alongside the KaTeX rendering.
                if (engineUsed === 'katex-fallback' && typeof rendered === 'string' && typeof document !== 'undefined') {
                    try {
                        const tmp = document.createElement('div');
                        tmp.innerHTML = rendered;
                        // Remove explicit MathJax merror nodes and their containers
                        // 1) Remove any element that declares a MathML merror
                        const merrorEls = tmp.querySelectorAll('[data-mml-node="merror"], merror');
                        for (const el of merrorEls) {
                            el.remove();
                        }
                        // 2) Remove any mjx-container that contains error text
                        const mjxContainers = tmp.querySelectorAll('mjx-container, .MathJax');
                        for (const c of mjxContainers) {
                            const txt = (c.textContent || '').trim();
                            if (/merror|Unknown environment/i.test(txt) || /Unknown environment/i.test(c.innerHTML)) {
                                c.remove();
                            }
                        }
                        // 3) Remove any parent '.math-environment' containers left empty or containing only whitespace
                        const mathEnvs = tmp.querySelectorAll('.math-environment');
                        for (const me of mathEnvs) {
                            if (!me.textContent || /merror|Unknown environment/i.test(me.textContent)) {
                                me.remove();
                            }
                        }
                        rendered = tmp.innerHTML;
                    } catch (stripErr) {
                        console.warn('[MarkdownRenderer] Failed to strip MathJax merror subtree from KaTeX output:', stripErr);
                    }
                }
                wrapper.innerHTML = rendered;

                // Replace the placeholder element directly in the DOM
                try {
                    // If there was leading/trailing markdown captured during protection,
                    // reinsert them as text nodes here so they are not processed by marked.
                    const parent = spanElement.parentNode;
                    const leadText = placeholderData.leadingMarkdown || '';
                    const trailText = placeholderData.trailingMarkdown || '';

                    if (leadText) {
                        const leadNode = document.createTextNode(leadText + ' ');
                        parent.insertBefore(leadNode, spanElement);
                    }

                    parent.replaceChild(wrapper, spanElement);

                    if (trailText) {
                        const trailNode = document.createTextNode(' ' + trailText);
                        parent.insertBefore(trailNode, wrapper.nextSibling);
                    }
                } catch (err) {
                    // Fallback: use innerHTML replacement if direct DOM replace fails
                    try {
                        const html = wrapper.outerHTML;
                        container.innerHTML = container.innerHTML.replace(spanElement.outerHTML, html);
                    } catch (innerErr) {
                        console.warn('[MarkdownRenderer] Fallback replacement failed:', innerErr);
                    }
                }

                const envType = placeholderData.environment || placeholderData.type;
                console.log(`[MarkdownRenderer] Rendered ${envType} via ${engineUsed}`);
        } catch (error) {
            const envType = placeholderData.environment || placeholderData.type;
            console.warn(`[MarkdownRenderer] ${envType} error:`, error);
            
            // Create error wrapper and use simple innerHTML replacement
            const errorWrapper = document.createElement('div');
            errorWrapper.className = 'math-error';
            errorWrapper.innerHTML = `Math Error (${envType}): ${error.message}<br><small>Content: ${placeholderData.content.substring(0, 100)}...</small>`;
            
                // Replace element in DOM if possible
                try {
                    spanElement.parentNode.replaceChild(errorWrapper, spanElement);
                } catch (err) {
                    const errorHTML = errorWrapper.outerHTML;
                    container.innerHTML = container.innerHTML.replace(spanElement.outerHTML, errorHTML);
                }
        }
    }

    // Render a TeX string to an HTML element string using MathJax (preferred) or KaTeX fallback.
    // Returns an HTML string suitable for insertion into the DOM.
    renderMathString(texString, displayMode = false) {
        const hasMathJax = !!(window.MathJax && typeof window.MathJax.tex2svg === 'function');
        const hasKaTeX = !!(this.katex && typeof this.katex.renderToString === 'function');

        const cleaned = this.cleanLatexForKaTeX(String(texString));

        if (hasMathJax) {
            try {
                const node = window.MathJax.tex2svg(cleaned, { display: displayMode });
                if (node && typeof node.outerHTML === 'string') {
                    return this.sanitizeMathJaxSVG(node.outerHTML);
                } else if (typeof node === 'string') {
                    return this.sanitizeMathJaxSVG(node);
                }
            } catch (e) {
                console.warn('[MarkdownRenderer] MathJax render failed in renderMathString:', e && e.message ? e.message : e);
            }
        }

        if (hasKaTeX) {
            try {
                return this.katex.renderToString(cleaned, { displayMode: displayMode, throwOnError: false, strict: false });
            } catch (e) {
                console.warn('[MarkdownRenderer] KaTeX render failed in renderMathString:', e && e.message ? e.message : e);
            }
        }

        return `<span class="math-error">No math engine available</span>`;
    }

    // Walk the DOM text nodes and replace raw TeX patterns ($...$, $$...$$, \(...\), \[...\])
    // with rendered math so the export matches preview. This implementation is
    // more robust: it attempts to match patterns that may span adjacent text
    // nodes by scanning small windows of consecutive text nodes and performing
    // replacements in-place. It still avoids code/pre blocks and existing math containers.
    recoverMathFromHTML(container) {
        if (!container || !container.querySelectorAll) return;

        // Only process display math for export: \[...\] and $$...$$
        const patterns = [
            { regex: /\\\[([\s\S]*?)\\\]/g, display: true }, // \[ ... \]
            { regex: /\$\$([\s\S]*?)\$\$/g, display: true }    // $$ ... $$
        ];

        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            const parent = node.parentElement || node.parentNode;
            if (parent && parent.closest && parent.closest('code, pre, .code-pre, .math-inline, .math-display, mjx-container, .katex, .katex-display')) continue;
            // Include nodes that contain common TeX/math markers: $ , \begin{...}, or backslash delimiters (\( or \[)
            if (node.nodeValue && /\\begin\{|\\end\{|\$|\\\(|\\\[/.test(node.nodeValue)) textNodes.push(node);
        }

        // Sliding window across adjacent text nodes to catch matches that cross node boundaries
        const maxWindow = 4;
        for (let i = 0; i < textNodes.length; i++) {
            // Build window
            let windowText = '';
            const windowNodes = [];
            let domChanged = false;
            for (let w = 0; w < maxWindow && (i + w) < textNodes.length; w++) {
                const tn = textNodes[i + w];
                windowNodes.push(tn);
                windowText += tn.nodeValue || '';

                // Try each pattern on concatenated text
                for (const pat of patterns) {
                    const localRegex = new RegExp(pat.regex.source, 'g');
                    let match;
                    while ((match = localRegex.exec(windowText)) !== null) {
                        const fullMatch = match[0];
                        const inner = match[1];
                        if (!inner || !inner.trim()) continue;

                        const matchStart = match.index;
                        const matchEnd = match.index + fullMatch.length;

                        // Map char offsets back to node indices and offsets
                        let charCount = 0;
                        let startNodeIdx = -1, endNodeIdx = -1, startOffset = 0, endOffset = 0;
                        for (let n = 0; n < windowNodes.length; n++) {
                            const nv = windowNodes[n].nodeValue || '';
                            const nextCount = charCount + nv.length;
                            if (startNodeIdx === -1 && matchStart < nextCount) {
                                startNodeIdx = n;
                                startOffset = matchStart - charCount;
                            }
                            if (matchEnd <= nextCount) {
                                endNodeIdx = n;
                                endOffset = matchEnd - charCount;
                                break;
                            }
                            charCount = nextCount;
                        }

                        if (startNodeIdx === -1 || endNodeIdx === -1) continue;

                        // Prepare rendered HTML and wrapper
                        const rendered = this.renderMathString(inner, pat.display);
                        const wrapped = pat.display ? `<div class="math-display" data-engine="mathjax">${rendered}</div>` : `<span class="math-inline" data-engine="mathjax">${rendered}</span>`;

                        const startNode = windowNodes[startNodeIdx];
                        const endNode = windowNodes[endNodeIdx];

                        const beforeText = startNode.nodeValue.slice(0, startOffset);
                        const afterText = endNode.nodeValue.slice(endOffset);

                        const frag = document.createDocumentFragment();
                        if (beforeText) frag.appendChild(document.createTextNode(beforeText));
                        const holder = document.createElement('span');
                        holder.innerHTML = wrapped;
                        frag.appendChild(holder);
                        if (afterText) frag.appendChild(document.createTextNode(afterText));

                        const parentNode = startNode.parentNode;
                        parentNode.insertBefore(frag, startNode);

                        // Remove original covered nodes
                        for (let rem = startNodeIdx; rem <= endNodeIdx; rem++) {
                            const rn = windowNodes[rem];
                            try { if (rn.parentNode) rn.parentNode.removeChild(rn); } catch (e) {}
                        }

                        domChanged = true;
                        // Advance outer index to skip nodes already processed
                        i = i + Math.max(0, (endNodeIdx));
                        break;
                    }
                    if (domChanged) break;
                }
                if (domChanged) break;
            }
        }
    }

    replacePlaceholderInDOM(container, targetPattern, replacementElement) {
        // Walk through all text nodes in the container and replace the pattern
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        for (const textNode of textNodes) {
            // Skip text nodes that are inside already-rendered math or annotation sections
            const parentElem = textNode.parentElement || textNode.parentNode;
            if (parentElem && parentElem.closest) {
                const skip = parentElem.closest('.katex, .katex-display, .math-environment, mjx-container, annotation, .math-placeholder, .math-placeholder-recovered, .math-inline, .math-display, code, pre, .code-pre, .code-export-fallback, .code-block-content, .code-block-container');
                if (skip) continue;
            }

            if (textNode.textContent.includes(targetPattern)) {
                const parts = textNode.textContent.split(targetPattern);
                if (parts.length > 1) {
                    // Replace the first occurrence only
                    const beforeText = parts[0];
                    const afterText = parts.slice(1).join(targetPattern);
                    
                    const parent = textNode.parentNode;
                    
                    // Insert before text if it exists
                    if (beforeText) {
                        const beforeNode = document.createTextNode(beforeText);
                        parent.insertBefore(beforeNode, textNode);
                    }
                    
                    // Insert the replacement element
                    parent.insertBefore(replacementElement, textNode);
                    
                    // Update the original text node with after text
                    if (afterText) {
                        textNode.textContent = afterText;
                    } else {
                        parent.removeChild(textNode);
                    }
                    break; // Only replace first occurrence
                }
            }
        }
    }

    renderMathBlock(code) {
        try {
            // Defensive check: if the code looks like an HTML fragment or
            // contains escaped HTML placeholders, avoid passing it to
            // MathJax/KaTeX which will attempt to parse it as LaTeX and
            // produce katex-error nodes. Instead, return a safe escaped
            // preformatted block so the original content is visible.
            const codeStr = (code == null) ? '' : String(code);
            const trimmed = codeStr.trim();
            const looksLikeHtml = /<[^>]+>/.test(trimmed) || /&lt;[^&]+&gt;/.test(trimmed) || /<!--\s*MATH_/.test(trimmed) || /class=("|')?katex-error/.test(trimmed);
            if (looksLikeHtml) {
                const esc = trimmed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<pre class="math-raw">${esc}</pre>`;
            }
            // Use MathJax as primary, KaTeX as fallback
            if (this.mathjax && this.mathEngine === 'mathjax') {
                try {
                    // Use MathJax as primary - MathJax 3.x API with robust readiness check
                    if (this.isMathJaxReadySync()) {
                        const node = window.MathJax.tex2svg(code.trim(), {display: true});
                        // MathJax v4 tex2svg returns a string directly, not an object with outerHTML property
                        let htmlOutput;
                        if (typeof node === 'string') {
                            htmlOutput = node;
                        } else if (node && typeof node.outerHTML === 'string') {
                            // Fallback for MathJax v3 compatibility
                            htmlOutput = node.outerHTML;
                        } else if (node && node.node && window.MathJax.startup && window.MathJax.startup.adaptor) {
                            // Fallback: use adaptor to get HTML from node
                            htmlOutput = window.MathJax.startup.adaptor.outerHTML(node.node);
                        } else {
                            throw new Error('tex2svg returned unexpected format');
                        }
                        
                        // Fix MathJax 4 SVG dimension calculation bugs (NaNex values)
                        htmlOutput = this.sanitizeMathJaxSVG(htmlOutput);
                        
                        // Create wrapper element to avoid HTML corruption
                        const wrapper = document.createElement('div');
                        wrapper.className = 'math-block';
                        wrapper.innerHTML = htmlOutput;
                        return wrapper.outerHTML;
                    } else {
                        console.warn('[MarkdownRenderer] MathJax not ready in renderMathBlock, falling back to KaTeX');
                        throw new Error('MathJax not ready');
                    }
                } catch (mathjaxError) {
                    console.warn('[MarkdownRenderer] MathJax failed in renderMathBlock, trying KaTeX:', mathjaxError);
                    if (this.katex) {
                        const rendered = this.katex.renderToString(code.trim(), {
                            ...this.katexOptions,
                            displayMode: true
                        });
                        return `<div class="math-block">${rendered}</div>`;
                    }
                    throw mathjaxError;
                }
            } else if (this.katex) {
                const rendered = this.katex.renderToString(code.trim(), {
                    ...this.katexOptions,
                    displayMode: true
                });
                return `<div class="math-block">${rendered}</div>`;
            } else {
                return `<div class="math-error">No math rendering engine available</div>`;
            }
        } catch (e) {
            return `<div class="math-error">Math Error: ${e.message}</div>`;
        }
    }

    renderLatexDocument(code) {
        // Check for enhanced LaTeX integration first
        if (window.LaTeXIntegration && window.app && window.app.latexIntegration) {
            try {
                console.log('[MarkdownRenderer] Using enhanced LaTeX integration');
                const id = `latex-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return `<div class="latex-enhanced-container" data-latex-id="${id}" data-latex-code="${encodeURIComponent(code)}">
                    <div class="latex-loading-enhanced">
                        <div>📄</div>
                        <p>Rendering enhanced LaTeX document...</p>
                        <small>Using LaTeX.js with advanced features</small>
                    </div>
                </div>`;
            } catch (error) {
                console.warn('[MarkdownRenderer] Enhanced LaTeX failed, falling back to standard:', error);
            }
        }

        // Fallback to original implementation
        if (!window.LaTeX || window.LaTeXLoadFailed) {
            let msg = 'LaTeX.js library not loaded. Please check your internet connection or library loader settings.';
            if (window.LaTeXLoadFailed) {
                msg += ' (LaTeX.js failed to load)';
            }
            return `<div class="diagram-error">${msg}</div>`;
        }

        try {
            const id = `latex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return `<div class="latex-container" data-latex-id="${id}" data-latex-code="${encodeURIComponent(code)}">
                <div class="latex-loading">Rendering LaTeX document...</div>
            </div>`;
        } catch (error) {
            return `<div class="diagram-error">LaTeX rendering failed: ${error.message}</div>`;
        }
    }

    generateLineNumbers(code) {
        const lines = code.split('\n');
        return lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('');
    }

    async postProcess(html) {
        console.log('[MarkdownRenderer] Starting postProcess with full diagram processing enabled');
        
        // Create a temporary DOM to work with
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.querySelector('div');

        // Process safe synchronous features first
        try {
            if (typeof this.addCopyButtons === 'function') {
                this.addCopyButtons(container);
                console.log('[MarkdownRenderer] Copy buttons added');
            }
            if (typeof this.processTooltips === 'function') {
                this.processTooltips(container);
                console.log('[MarkdownRenderer] Tooltips processed');
            }
            if (typeof this.processFootnoteLinks === 'function') {
                this.processFootnoteLinks(container);
                console.log('[MarkdownRenderer] Footnote links processed');
            }
            if (typeof this.processCheckboxes === 'function') {
                this.processCheckboxes(container);
                console.log('[MarkdownRenderer] Checkboxes processed');
            }
        } catch (error) {
            console.warn('[MarkdownRenderer] Safe processing error:', error);
        }

        // Process diagrams with timeout protection and defensive programming
        const diagramProcessors = [
            { name: 'Mermaid', method: 'processMermaidDiagrams' },
            { name: 'Markmap', method: 'processInlineMarkmaps' },
            { name: 'GraphViz', method: 'processGraphvizDiagrams' },
            { name: 'PlantUML', method: 'processPlantUMLDiagrams' },
            { name: 'ABC Music', method: 'processAbcMusic' },
            { name: 'VegaLite', method: 'processVegaLiteDiagrams' },
            { name: 'TikZ', method: 'processTikZDiagrams' },
            { name: 'KityMinder', method: 'processKityMinderDiagrams' },
            { name: 'Wavedrom', method: 'processWavedromDiagrams' }
        ];

        for (const processor of diagramProcessors) {
            try {
                if (typeof this[processor.method] === 'function') {
                    console.log(`[MarkdownRenderer] Processing ${processor.name} diagrams...`);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`${processor.name} processing timeout`)), 10000)
                    );
                    await Promise.race([
                        this[processor.method](container),
                        timeoutPromise
                    ]);
                    console.log(`[MarkdownRenderer] ${processor.name} diagrams processed successfully`);
                } else {
                    console.warn(`[MarkdownRenderer] ${processor.method} method not available, skipping ${processor.name}`);
                }
            } catch (error) {
                console.warn(`[MarkdownRenderer] ${processor.name} processing error:`, error);
                // Continue with other processors - don't let one failure stop everything
            }
        }

        // Process multimedia embeds
        try {
            if (typeof this.processMultimediaEmbeds === 'function') {
                this.processMultimediaEmbeds(container);
                console.log('[MarkdownRenderer] Multimedia embeds processed');
            }
        } catch (error) {
            console.warn('[MarkdownRenderer] Multimedia processing error:', error);
        }

        console.log('[MarkdownRenderer] PostProcess completed successfully with full diagram support');
        return container.innerHTML;
    }

    async processMermaidDiagrams(container) {
        const mermaidElements = container.querySelectorAll('.mermaid-container');
        
        for (const element of mermaidElements) {
            const id = element.getAttribute('data-mermaid-id');
            const code = decodeURIComponent(element.getAttribute('data-mermaid-code'));
            try {
                const { svg } = await this.mermaid.render(id, code);
                element.innerHTML = svg;
                element.classList.add('mermaid-rendered');
            } catch (error) {
                element.innerHTML = `<div class="mermaid-error"><b>Mermaid Diagram Error</b><br>${error.message}<br><small>Check your diagram syntax or see <a href='https://mermaid-js.github.io/mermaid/#/syntax' target='_blank'>Mermaid Syntax Guide</a>.</small><details><summary>Show code</summary><pre><code>${code}</code></pre></details></div>`;
                element.classList.add('mermaid-error');
            }
        }
    }


    async processInlineMarkmaps(container) {
        const markmapElements = container.querySelectorAll('.markmap-inline-container');
        
        for (const element of markmapElements) {
            const id = element.getAttribute('data-markmap-id');
            const code = decodeURIComponent(element.getAttribute('data-markmap-code'));
            try {
                // Use enhanced markmap integration if available
                if (window.app && window.app.markmapIntegration && window.app.markmapIntegration.renderInlineMarkmap) {
                    await window.app.markmapIntegration.renderInlineMarkmap(element, code);
                    element.classList.add('markmap-rendered');
                    continue;
                }
                
                // Fallback to direct window.markmap if enhanced integration not available
                element.innerHTML = `<svg id="${id}" width="400" height="300"></svg>`;
                if (window.markmap && typeof window.markmap.transform === 'function' && typeof window.markmap.Markmap === 'function') {
                    const { root } = window.markmap.transform(code);
                    const svg = d3.select(`#${id}`);
                    // Use constructor instead of deprecated create method
                    const mm = new window.markmap.Markmap(svg.node(), null);
                    if (mm.setData && typeof mm.setData === 'function') {
                        mm.setData(root);
                    }
                } else {
                    element.innerHTML = `<div class="markmap-error"><b>Markmap Mindmap Error</b><br>Markmap library not loaded or incomplete.<br><small>Check your internet connection or see <a href='https://markmap.js.org/' target='_blank'>Markmap Docs</a>.</small></div>`;
                }
                element.classList.add('markmap-rendered');
            } catch (error) {
                console.error('[MarkdownRenderer] Markmap error:', error);
                element.innerHTML = `<div class="markmap-error"><b>Markmap Mindmap Error</b><br>${error.message}<br><small>Check your markdown structure or see <a href='https://markmap.js.org/' target='_blank'>Markmap Docs</a>.</small><details><summary>Show code</summary><pre><code>${code}</code></pre></details></div>`;
                element.classList.add('markmap-error');
            }
        }
    }

    async processGraphvizDiagrams(container) {
        const graphvizElements = container.querySelectorAll('.graphviz-container:not(.graphviz-processed)');
        
        for (const element of graphvizElements) {
            const id = element.getAttribute('data-graphviz-id');
            const code = decodeURIComponent(element.getAttribute('data-graphviz-code'));
            const engine = element.getAttribute('data-graphviz-engine') || 'dot';
            
            // Mark as processed to prevent re-processing
            element.classList.add('graphviz-processed');
            
            try {
                // Show loading indicator
                element.innerHTML = `
                    <div class="diagram-loading">
                        <div class="loading-spinner"></div>
                        <p>Loading GraphViz diagram (${engine})...</p>
                    </div>
                `;
                
                // Check if Viz.js or local GraphViz is available - if not, load it dynamically
                if (!window.Viz && (!window.localGraphViz || !(await window.localGraphViz.isAvailable()))) {
                    console.log('[GraphViz] Neither Viz.js nor local GraphViz available, attempting dynamic load...');
                    await this.loadVizJsDynamically();
                }
                
                // Validate we have at least one GraphViz method available
                const hasVizJs = !!window.Viz;
                const hasLocalGraphViz = window.localGraphViz && (await window.localGraphViz.isAvailable());
                
                if (!hasVizJs && !hasLocalGraphViz) {
                    throw new Error('GraphViz rendering not available. Neither Viz.js library nor local GraphViz could be loaded.');
                }
                
                // Use v3.x standalone API - multiple approaches to handle different versions
                console.log('[GraphViz] Using v3.x standalone API');
                let svg;
                
                // Method 1: Try synchronous function call (v3.x standalone)
                if (typeof window.Viz === 'function' && !window.Viz.prototype) {
                    try {
                        console.log('[GraphViz] Attempting direct function call');
                        const svgText = window.Viz(code, { format: 'svg', engine });
                        if (svgText && svgText.includes('<svg')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(svgText, 'image/svg+xml');
                            svg = doc.documentElement;
                            console.log('[GraphViz] Direct function call successful');
                        }
                    } catch (directError) {
                        console.log('[GraphViz] Direct function call failed:', directError.message);
                    }
                }
                
                // Method 2: Try instance creation (some v3.x versions)
                if (!svg && typeof window.Viz === 'function' && window.Viz.prototype) {
                    try {
                        console.log('[GraphViz] Attempting constructor method');
                        const viz = new window.Viz();
                        // v3.x uses renderSVGElement or render method, not renderString
                        if (typeof viz.renderSVGElement === 'function') {
                            svg = await viz.renderSVGElement(code, { engine });
                            console.log('[GraphViz] Constructor renderSVGElement successful');
                        } else if (typeof viz.render === 'function') {
                            const svgText = await viz.render(code, { format: 'svg', engine });
                            if (svgText && svgText.includes('<svg')) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                                svg = doc.documentElement;
                                console.log('[GraphViz] Constructor render successful');
                            }
                        }
                    } catch (constructorError) {
                        console.log('[GraphViz] Constructor method failed:', constructorError.message);
                    }
                }
                
                // Method 3: Try static instance method
                if (!svg && window.Viz && window.Viz.instance && typeof window.Viz.instance === 'function') {
                    try {
                        console.log('[GraphViz] Attempting static instance method');
                        const viz = window.Viz.instance();
                        // v3.x uses renderSVGElement or render method, not renderString
                        if (typeof viz.renderSVGElement === 'function') {
                            svg = await viz.renderSVGElement(code, { engine });
                            console.log('[GraphViz] Static instance renderSVGElement successful');
                        } else if (typeof viz.render === 'function') {
                            const svgText = await viz.render(code, { format: 'svg', engine });
                            if (svgText && svgText.includes('<svg')) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                                svg = doc.documentElement;
                                console.log('[GraphViz] Static instance render successful');
                            }
                        }
                    } catch (instanceError) {
                        console.log('[GraphViz] Static instance method failed:', instanceError.message);
                    }
                }
                
                // Method 4: Try direct async call on Viz function (some v3.x patterns)
                if (!svg && typeof window.Viz === 'function') {
                    try {
                        console.log('[GraphViz] Attempting direct async method');
                        const result = await window.Viz(code, { format: 'svg', engine });
                        if (result && typeof result === 'string' && result.includes('<svg')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(result, 'image/svg+xml');
                            svg = doc.documentElement;
                            console.log('[GraphViz] Direct async method successful');
                        } else if (result && result.svg) {
                            // Some versions return an object with svg property
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(result.svg, 'image/svg+xml');
                            svg = doc.documentElement;
                            console.log('[GraphViz] Direct async method (object) successful');
                        }
                    } catch (asyncError) {
                        console.log('[GraphViz] Direct async method failed:', asyncError.message);
                    }
                }
                
                // Method 5: Try Local GraphViz as fallback
                if (!svg && window.localGraphViz) {
                    try {
                        console.log('[GraphViz] Attempting local GraphViz renderer');
                        const isLocalAvailable = await window.localGraphViz.isAvailable();
                        if (isLocalAvailable) {
                            svg = await window.localGraphViz.renderSVGElement(code, { engine });
                            console.log('[GraphViz] Local GraphViz rendering successful');
                        } else {
                            console.log('[GraphViz] Local GraphViz not available (dot.exe not found)');
                        }
                    } catch (localError) {
                        console.log('[GraphViz] Local GraphViz method failed:', localError.message);
                    }
                }
                
                if (!svg) {
                    throw new Error('Could not render GraphViz diagram with any available API method');
                }
                
                console.log('[GraphViz] v3.x rendering successful');
                
                // Success: display the rendered SVG
                element.innerHTML = `
                    <div class="graphviz-diagram" id="${id}">
                        <div class="diagram-header">
                            <span class="diagram-type">GraphViz (${engine}) Diagram</span>
                            <button class="diagram-toggle" onclick="toggleGraphvizSource(this)">Show Source</button>
                        </div>
                        <div class="diagram-content"></div>
                        <pre class="diagram-source hidden"><code>${code}</code></pre>
                    </div>
                `;
                
                // Append the SVG element
                const contentDiv = element.querySelector('.diagram-content');
                if (svg && contentDiv) {
                    // Ensure SVG is properly sized
                    svg.style.maxWidth = '100%';
                    svg.style.height = 'auto';
                    contentDiv.appendChild(svg);
                }
                
                element.classList.add('graphviz-rendered');
                element.classList.remove('graphviz-loading');
                
            } catch (error) {
                console.error('[MarkdownRenderer] GraphViz error:', error);
                
                // Show error with fallback
                element.innerHTML = `
                    <div class="graphviz-error">
                        <div class="diagram-header">
                            <span class="diagram-type">GraphViz (${engine}) Diagram</span>
                            <span class="diagram-error">Failed to Load</span>
                        </div>
                        <div class="error-message">
                            <p><strong>GraphViz Diagrams</strong></p>
                            <p>GraphViz (Viz.js) library not loaded. Please check your internet connection or library loader settings. (${error.message})</p>
                            <p>Failed to load from 3 sources</p>
                            <details>
                                <summary>View Raw Code</summary>
                                <pre><code>${code}</code></pre>
                            </details>
                        </div>
                    </div>
                `;
                
                element.classList.add('graphviz-error');
                element.classList.remove('graphviz-loading');
            }
        }
    }

    // Dynamic Viz.js loader as fallback
    async loadVizJsDynamically() {
        // First, try to load local GraphViz renderer
        try {
            if (!window.LocalGraphVizRenderer) {
                console.log('[GraphViz] Loading local GraphViz renderer...');
                await this.loadScript('js/local-graphviz.js');
                if (window.LocalGraphVizRenderer && window.localGraphViz) {
                    console.log('[GraphViz] Local GraphViz renderer loaded successfully');
                    // Check if local GraphViz is actually available
                    const isAvailable = await window.localGraphViz.isAvailable();
                    if (isAvailable) {
                        console.log('[GraphViz] Local GraphViz is available and ready');
                        return; // Local GraphViz is ready, no need to load CDN
                    }
                }
            }
        } catch (error) {
            console.log('[GraphViz] Failed to load local GraphViz renderer:', error.message);
        }

        // Fallback to CDN if local GraphViz is not available
        const urls = [
            'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js',
            'https://unpkg.com/@viz-js/viz@3.4.0/lib/viz-standalone.js',
            'https://cdn.skypack.dev/@viz-js/viz@3.4.0/lib/viz-standalone.js'
        ];

        for (const url of urls) {
            try {
                console.log(`[GraphViz] Attempting to load from: ${url}`);
                await this.loadScript(url);
                if (window.Viz) {
                    console.log(`[GraphViz] Successfully loaded Viz.js from: ${url}`);
                    return;
                }
            } catch (error) {
                console.log(`[GraphViz] Failed to load from ${url}:`, error.message);
            }
        }
    }

    // Helper to load script dynamically
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script from ${url}`));
            document.head.appendChild(script);
        });
    }

    async processPlantUMLDiagrams(container) {
        const plantumlElements = container.querySelectorAll('.plantuml-container');
        
        for (const element of plantumlElements) {
            const code = decodeURIComponent(element.getAttribute('data-plantuml-code'));
            const id = element.getAttribute('data-plantuml-id');
            
            try {
                // ENHANCED: Use PlantUML server for rendering with proper HTML export support
                const server = 'https://www.plantuml.com/plantuml/svg/';
                const encoded = this.encodePlantUML(code);
                
                // CRITICAL FIX: Create export-friendly HTML with embedded SVG
                const svgUrl = `${server}${encoded}`;
                
                element.innerHTML = `<div class="plantuml-diagram" id="${id}">
                    <div class="diagram-header">
                        <span class="diagram-type">PlantUML Diagram</span>
                        <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                        <pre class="diagram-source hidden"><code>${code}</code></pre>
                    </div>
                    <div class="diagram-content">
                        <img src="${svgUrl}" alt="PlantUML Diagram" 
                             style="max-width: 100%; height: auto; display: block;" 
                             onload="this.style.display='block'; this.parentElement.classList.add('diagram-loaded');" 
                             onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=&quot;diagram-error&quot;>Failed to render PlantUML diagram from server</div>'">
                        <!-- EXPORT ENHANCEMENT: Static SVG embed for export -->
                        <noscript>
                            <img src="${svgUrl}" alt="PlantUML Diagram" style="max-width: 100%; height: auto;">
                        </noscript>
                    </div>
                </div>`;
                element.classList.add('plantuml-rendered');
            } catch (error) {
                console.error('[MarkdownRenderer] PlantUML error:', error);
                element.innerHTML = `<div class="plantuml-error">
                    <h4>PlantUML Error</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Source Code</summary>
                        <pre><code>${code}</code></pre>
                    </details>
                </div>`;
                element.classList.add('plantuml-error');
            }
        }
    }

    async processVegaLiteDiagrams(container) {
        const vegaElements = container.querySelectorAll('.vega-lite-container');
        
        for (const element of vegaElements) {
            const code = decodeURIComponent(element.getAttribute('data-vega-code'));
            const id = element.getAttribute('data-vega-id');
            try {
                // Parse JSON/YAML spec
                let spec;
                try {
                    spec = JSON.parse(code);
                } catch (jsonError) {
                    throw new Error('Vega-Lite spec must be valid JSON. Parse error: ' + jsonError.message);
                }
                
                // ENHANCED: Create export-friendly structure
                element.innerHTML = `
                    <div class="vega-lite-diagram" id="${id}">
                        <div class="diagram-header">
                            <span class="diagram-type">Vega-Lite Visualization</span>
                            <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Spec</button>
                            <pre class="diagram-source hidden"><code>${JSON.stringify(spec, null, 2)}</code></pre>
                        </div>
                        <div class="diagram-content" id="${id}-chart"></div>
                        <!-- EXPORT ENHANCEMENT: Static representation for export -->
                        <div class="vega-export-fallback" style="display:none;">
                            <div class="diagram-summary">
                                <h4>📊 Vega-Lite Visualization</h4>
                                <p><strong>Mark Type:</strong> ${spec.mark ? (typeof spec.mark === 'string' ? spec.mark : spec.mark.type || 'unknown') : 'Not specified'}</p>
                                <p><strong>Data Source:</strong> ${spec.data ? (spec.data.url ? spec.data.url : 'Inline data') : 'No data specified'}</p>
                                ${spec.encoding ? `<p><strong>Encodings:</strong> ${Object.keys(spec.encoding).join(', ')}</p>` : ''}
                                <details>
                                    <summary>Full Specification</summary>
                                    <pre><code>${JSON.stringify(spec, null, 2)}</code></pre>
                                </details>
                            </div>
                        </div>
                    </div>
                `;
                
                // Ensure the chart container exists before calling vegaEmbed
                await new Promise(r => setTimeout(r, 0));
                const chartEl = document.getElementById(`${id}-chart`);
                
                if (window.vegaEmbed && typeof window.vegaEmbed === 'function' && chartEl) {
                    try {
                        const result = await window.vegaEmbed(chartEl, spec, {
                            actions: false,
                            renderer: 'svg',
                            theme: 'default'
                        });
                        
                        // EXPORT FIX: Extract SVG for export compatibility
                        if (result && result.view) {
                            const svgString = await result.view.toSVG();
                            // Store SVG in data attribute for export
                            chartEl.setAttribute('data-vega-svg', svgString);
                        }
                        
                        element.classList.add('vega-rendered');
                    } catch (embedError) {
                        throw new Error('Vega-Embed rendering failed: ' + embedError.message);
                    }
                } else {
                    // ENHANCED: Better fallback when vega-embed is not available
                    if (chartEl) {
                        chartEl.innerHTML = `
                            <div class="diagram-fallback vega-fallback">
                                <div class="fallback-content">
                                    <h4>📊 Vega-Lite Visualization</h4>
                                    <p><strong>Mark Type:</strong> ${spec.mark ? (typeof spec.mark === 'string' ? spec.mark : spec.mark.type || 'unknown') : 'Not specified'}</p>
                                    <p><strong>Data Source:</strong> ${spec.data ? (spec.data.url ? spec.data.url : 'Inline data') : 'No data specified'}</p>
                                    ${spec.encoding ? `<p><strong>Encodings:</strong> ${Object.keys(spec.encoding).join(', ')}</p>` : ''}
                                    <p><small>Requires vega-embed library for interactive visualization</small></p>
                                </div>
                            </div>
                        `;
                    }
                    element.classList.add('vega-fallback');
                }
            } catch (error) {
                console.error('[MarkdownRenderer] Vega-Lite error:', error);
                element.innerHTML = `
                    <div class="diagram-error">
                        <strong>Vega-Lite Error:</strong> ${error.message}
                        <details><summary>Show code</summary><pre><code>${code}</code></pre></details>
                    </div>
                `;
                element.classList.add('vega-error');
            }
        }
    }

    async processAbcMusic(container) {
        const abcElements = container.querySelectorAll('.abc-container');
        
        for (const element of abcElements) {
            const id = element.getAttribute('data-abc-id');
            const code = decodeURIComponent(element.getAttribute('data-abc-code'));
            
            try {
                if (window.ABCJS) {
                    const renderDiv = document.createElement('div');
                    renderDiv.id = id;
                    element.innerHTML = '';
                    element.appendChild(renderDiv);
                    
                    window.ABCJS.renderAbc(renderDiv, code, {
                        responsive: 'resize',
                        clickListener: (abcElem, tuneNumber, classes) => {
                            console.log('ABC note clicked:', abcElem);
                        }
                    });
                    
                    element.classList.add('abc-rendered');
                } else {
                    element.innerHTML = `<div class="diagram-error">ABC.js library not loaded. Music notation cannot be displayed.</div>`;
                }
            } catch (error) {
                console.error('[MarkdownRenderer] ABC Music error:', error);
                element.innerHTML = `<div class="diagram-error">ABC Music Error: ${error.message}</div>`;
                element.classList.add('abc-error');
            }
        }
    }

    async processWavedromDiagrams(container) {
        const wavedromElements = container.querySelectorAll('.wavedrom-container');
        
        for (const element of wavedromElements) {
            const id = element.getAttribute('data-wavedrom-id');
            const code = decodeURIComponent(element.getAttribute('data-wavedrom-code'));
            
            try {
                // For now, show placeholder since Wavedrom requires additional setup
                element.innerHTML = `<div class="wavedrom-placeholder">
                    <h4>Wavedrom Timing Diagram</h4>
                    <pre><code>${code}</code></pre>
                    <p><em>Wavedrom rendering would appear here with proper library integration</em></p>
                </div>`;
                element.classList.add('wavedrom-placeholder');
            } catch (error) {
                console.error('[MarkdownRenderer] Wavedrom error:', error);
                element.innerHTML = `<div class="diagram-error">Wavedrom Error: ${error.message}</div>`;
                element.classList.add('wavedrom-error');
            }
        }
    }

    async processTikZDiagrams(container) {
        console.log('[MarkdownRenderer] Processing TikZ diagrams...');
        
        try {
            // Priority 1: Use NodeTikZIntegration (node-tikzjax based, most robust)
            if (this.nodeTikzIntegration && this.nodeTikzIntegration.isInitialized) {
                console.log('[MarkdownRenderer] Using NodeTikZIntegration for TikZ processing');
                
                // Find all TikZ containers and process them individually
                const tikzElements = container.querySelectorAll('.tikz-container:not(.tikz-rendered)');
                console.log(`[MarkdownRenderer] Found ${tikzElements.length} TikZ elements to process`);
                
                for (const tikzElement of tikzElements) {
                    try {
                        await this.nodeTikzIntegration.render(tikzElement);
                        console.log('[MarkdownRenderer] Successfully processed TikZ element');
                    } catch (elementError) {
                        console.error('[MarkdownRenderer] Error processing individual TikZ element:', elementError);
                        // Continue processing other elements
                    }
                }
                return;
            }
            
            // Priority 2: Use ObsidianTikZJaxEnhanced (Obsidian proven patterns)
            if (this.obsidianTikZJax) {
                console.log('[MarkdownRenderer] Using ObsidianTikZJaxEnhanced for TikZ processing');
                if (!this.obsidianTikZJax.isReady()) {
                    console.log('[MarkdownRenderer] Initializing ObsidianTikZJaxEnhanced...');
                    await this.obsidianTikZJax.onload();
                }
                await this.obsidianTikZJax.processTikZContainers(container);
                return;
            }
            
            // Priority 3: Use existing TikZIntegration (legacy fallback)
            if (this.tikzIntegration) {
                console.log('[MarkdownRenderer] Using TikZIntegration fallback for TikZ processing');
                await this.tikzIntegration.render(container);
                return;
            }
            
            // Priority 4: Try global classes if instance not available
            if (window.NodeTikZIntegration) {
                console.log('[MarkdownRenderer] Using global NodeTikZIntegration');
                const nodeTikzProcessor = new window.NodeTikZIntegration();
                if (nodeTikzProcessor.init) {
                    await nodeTikzProcessor.init();
                }
                
                // Find all TikZ containers and process them individually
                const tikzElements = container.querySelectorAll('.tikz-container:not(.tikz-rendered)');
                console.log(`[MarkdownRenderer] Found ${tikzElements.length} TikZ elements to process with global NodeTikZIntegration`);
                
                for (const tikzElement of tikzElements) {
                    try {
                        await nodeTikzProcessor.render(tikzElement);
                        console.log('[MarkdownRenderer] Successfully processed TikZ element with global NodeTikZIntegration');
                    } catch (elementError) {
                        console.error('[MarkdownRenderer] Error processing individual TikZ element with global NodeTikZIntegration:', elementError);
                        // Continue processing other elements
                    }
                }
                return;
            }
            
            if (window.ObsidianTikZJaxEnhanced) {
                console.log('[MarkdownRenderer] Using global ObsidianTikZJaxEnhanced');
                const obsidianProcessor = new window.ObsidianTikZJaxEnhanced();
                await obsidianProcessor.onload();
                await obsidianProcessor.processTikZContainers(container);
                return;
            }
            
            if (window.TikZIntegration) {
                console.log('[MarkdownRenderer] Using global TikZIntegration');
                const tikzProcessor = new window.TikZIntegration();
                await tikzProcessor.init();
                await tikzProcessor.render(container);
                return;
            }
            
            // Final fallback: Manual processing with error handling
            console.warn('[MarkdownRenderer] No TikZ integration available, using manual fallback');
            await this.processLegacyTikZFallback(container);
            
        } catch (error) {
            console.error('[MarkdownRenderer] TikZ processing failed:', error);
            this.showTikZProcessingError(container, error);
        }
    }

    /**
     * Legacy TikZ fallback processing when no integration is available
     */
    async processLegacyTikZFallback(container) {
        const tikzElements = container.querySelectorAll('.tikz-container:not(.tikz-rendered)');
        console.log(`[MarkdownRenderer] Processing ${tikzElements.length} TikZ elements with legacy fallback`);
        
        for (const element of tikzElements) {
            const id = element.getAttribute('data-tikz-id');
            const code = decodeURIComponent(element.getAttribute('data-tikz-code'));
            const isCircuit = element.getAttribute('data-is-circuit') === 'true';
            
            try {
                // Check if TikZJax is available
                if (window.tikzjax && window.tikzjax.process) {
                    // Create script element for TikZJax processing
                    const script = document.createElement('script');
                    script.type = 'text/tikz';
                    script.setAttribute('data-show-console', 'false');
                    
                    // Wrap TikZ code properly
                    if (isCircuit) {
                        script.textContent = `\\begin{circuitikz}\n${code}\n\\end{circuitikz}`;
                    } else {
                        script.textContent = `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
                    }
                    
                    element.innerHTML = `
                        <div class="tikz-diagram" id="${id}">
                            <div class="diagram-header">
                                <span class="diagram-type">${isCircuit ? 'CircuiTikZ' : 'TikZ'} Diagram</span>
                                <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                                <pre class="diagram-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="diagram-content"></div>
                        </div>
                    `;
                    
                    element.querySelector('.diagram-content').appendChild(script);
                    
                    // Process with TikZJax
                    setTimeout(() => {
                        window.tikzjax.process();
                    }, 100);
                    
                    element.classList.add('tikz-rendered');
                } else {
                    // Show informative fallback for TikZ
                    element.innerHTML = `
                        <div class="diagram-fallback tikz-fallback">
                            <div class="fallback-header">
                                <span class="diagram-type">${isCircuit ? 'CircuiTikZ' : 'TikZ'} Diagram - Not Available</span>
                                <button class="fallback-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Source</button>
                                <pre class="fallback-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="fallback-content">
                                <div class="fallback-placeholder">
                                    <svg width="300" height="200" viewBox="0 0 300 200" class="tikz-placeholder">
                                        <rect width="100%" height="100%" fill="var(--bg-secondary)" stroke="var(--border-color)" stroke-width="2" rx="8"/>
                                        <text x="150" y="90" text-anchor="middle" font-family="sans-serif" font-size="14" fill="var(--text-primary)">
                                            📐 ${isCircuit ? 'CircuiTikZ Circuit' : 'TikZ Diagram'}
                                        </text>
                                        <text x="150" y="110" text-anchor="middle" font-family="monospace" font-size="10" fill="var(--text-secondary)">
                                            TikZJax not available
                                        </text>
                                        <text x="150" y="125" text-anchor="middle" font-family="monospace" font-size="9" fill="var(--text-muted)">
                                            View source code above
                                        </text>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    `;
                    element.classList.add('tikz-fallback');
                }
            } catch (tikzError) {
                console.error('[MarkdownRenderer] Individual TikZ rendering error:', tikzError);
                element.innerHTML = `
                    <div class="diagram-error">
                        <div class="error-header">
                            <h4>${isCircuit ? 'CircuiTikZ' : 'TikZ'} Processing Error</h4>
                        </div>
                        <div class="error-content">
                            <p><strong>Error:</strong> ${tikzError.message}</p>
                            <details>
                                <summary>Show Source Code</summary>
                                <pre><code>${code}</code></pre>
                            </details>
                        </div>
                    </div>
                `;
                element.classList.add('tikz-error');
            }
        }
    }

    /**
     * Show TikZ processing error in container
     */
    showTikZProcessingError(container, error) {
        const tikzElements = container.querySelectorAll('.tikz-container:not(.tikz-rendered)');
        
        for (const element of tikzElements) {
            const id = element.getAttribute('data-tikz-id');
            const code = decodeURIComponent(element.getAttribute('data-tikz-code') || '');
            const isCircuit = element.getAttribute('data-is-circuit') === 'true';
            
            element.innerHTML = `
                <div class="diagram-error">
                    <div class="error-header">
                        <h4>${isCircuit ? 'CircuiTikZ' : 'TikZ'} System Error</h4>
                    </div>
                    <div class="error-content">
                        <p><strong>TikZ processing system failed:</strong> ${error.message}</p>
                        <details>
                            <summary>Show Source Code</summary>
                            <pre><code>${code}</code></pre>
                        </details>
                        <details>
                            <summary>Technical Details</summary>
                            <pre><code>${error.stack || 'No stack trace available'}</code></pre>
                        </details>
                    </div>
                </div>
            `;
            element.classList.add('tikz-system-error');
        }
    }


    processMultimediaEmbeds(container) {
        // Process image embeds with advanced features
        const images = container.querySelectorAll('img');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
            img.classList.add('responsive-image');
            // Immediately wrap in figure/figcaption if alt text exists and not already wrapped
            if (img.alt && img.alt.trim() && !img.closest('figure')) {
                const figure = document.createElement('figure');
                const figcaption = document.createElement('figcaption');
                figcaption.textContent = img.alt;
                img.parentNode.insertBefore(figure, img);
                figure.appendChild(img);
                figure.appendChild(figcaption);
                img.setAttribute('aria-describedby', 'figcaption');
            }
            // Fallback: if image loads after DOM insertion, ensure wrapping (for late loads)
            if (img.alt && img.alt.trim()) {
                img.addEventListener('load', function onLoad() {
                    if (!img.closest('figure')) {
                        const figure = document.createElement('figure');
                        const figcaption = document.createElement('figcaption');
                        figcaption.textContent = img.alt;
                        img.parentNode.insertBefore(figure, img);
                        figure.appendChild(img);
                        figure.appendChild(figcaption);
                        img.setAttribute('aria-describedby', 'figcaption');
                    }
                    img.removeEventListener('load', onLoad);
                });
            }
        });

        // Process YouTube embeds
        const links = container.querySelectorAll('a');
        
        links.forEach(link => {
            const youtubeMatch = link.href.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            if (youtubeMatch) {
                const videoId = youtubeMatch[1];
                const embed = document.createElement('div');
                embed.className = 'youtube-embed';
                embed.innerHTML = `
                    <iframe 
                        width="560" 
                        height="315" 
                        src="https://www.youtube.com/embed/${videoId}" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                        loading="lazy">
                    </iframe>
                `;
                link.parentNode.replaceChild(embed, link);
            }
        });
    }

    async processLatexDocuments(container) {
        // Process enhanced LaTeX containers first
        const enhancedLatexElements = container.querySelectorAll('.latex-enhanced-container');
        
        for (const element of enhancedLatexElements) {
            const code = decodeURIComponent(element.getAttribute('data-latex-code'));
            const id = element.getAttribute('data-latex-id');
            
            try {
                if (window.app && window.app.latexIntegration && window.app.latexIntegration.isReady()) {
                    console.log('[MarkdownRenderer] Processing enhanced LaTeX document');
                    await window.app.latexIntegration.processLaTeXElement(element, code);
                } else {
                    console.warn('[MarkdownRenderer] Enhanced LaTeX integration not ready, using fallback');
                    element.innerHTML = `<div class="diagram-error">Enhanced LaTeX integration not available. Please wait for initialization.</div>`;
                }
            } catch (error) {
                console.error('[MarkdownRenderer] Enhanced LaTeX error:', error);
                element.innerHTML = `<div class="diagram-error">Enhanced LaTeX Error: ${error.message}</div>`;
                element.classList.add('latex-enhanced-error');
            }
        }

        // Process standard LaTeX containers
        const latexElements = container.querySelectorAll('.latex-container');
        
        for (const element of latexElements) {
            const code = decodeURIComponent(element.getAttribute('data-latex-code'));
            const id = element.getAttribute('data-latex-id');
            
            try {
                if (window.LaTeX) {
                    // Use LaTeX.js to render the document
                    const latexDiv = document.createElement('div');
                    latexDiv.id = id;
                    const generator = new window.LaTeX.HtmlGenerator({
                        hyphenate: false,
                        macros: {}
                    });
                    const doc = window.LaTeX.parse(code, {
                        generator: generator
                    });
                    latexDiv.appendChild(doc.documentElement);
                    
                    element.innerHTML = `
                        <div class="latex-document">
                            <div class="diagram-header">
                                <span class="diagram-type">LaTeX Document</span>
                                <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Source</button>
                                <pre class="diagram-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="latex-content"></div>
                        </div>
                    `;
                    element.querySelector('.latex-content').appendChild(latexDiv);
                    element.classList.add('latex-rendered');
                } else {
                    element.innerHTML = `<div class="diagram-error">LaTeX.js library not loaded. Please check your internet connection.</div>`;
                }
            } catch (error) {
                console.error('[MarkdownRenderer] LaTeX error:', error);
                element.innerHTML = `<div class="diagram-error">LaTeX Error: ${error.message}</div>`;
                element.classList.add('latex-error');
            }
        }
    }

    encodePlantUML(text) {
        // Proper PlantUML encoding for server URL
        // Add PlantUML delimiters if not present
        let uml = text.trim();
        if (!uml.startsWith('@startuml')) {
            uml = '@startuml\n' + uml + '\n@enduml';
        }
        
        try {
            // Try plantuml-encoder library first if available
            if (window.plantumlEncoder && typeof window.plantumlEncoder.encode === 'function') {
                return window.plantumlEncoder.encode(uml);
            }
            // Try alternative global names
            else if (window.plantuml && typeof window.plantuml.encode === 'function') {
                return window.plantuml.encode(uml);
            }
            // Try direct encode function
            else if (typeof window.encode === 'function') {
                return window.encode(uml);
            }
        } catch (e) {
            console.warn('[MarkdownRenderer] plantumlEncoder failed, falling back:', e);
        }

        // Fallback: proper UTF-8 base64 encoding
        try {
            // Encode to UTF-8 bytes and then to Base64
            const utf8Bytes = new TextEncoder().encode(uml);
            const base64 = btoa(String.fromCharCode(...utf8Bytes));
            
            // PlantUML server expects URL-safe base64
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (error) {
            console.warn('PlantUML encoding error:', error);
            // Final fallback to URL encoding
            return encodeURIComponent(uml);
        }
    }

    // Utility methods
    extractMarkdownStructure(markdown) {
        const lines = markdown.split('\n');
        const structure = [];
        
        lines.forEach((line, index) => {
            const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
            if (headingMatch) {
                structure.push({
                    level: headingMatch[1].length,
                    text: headingMatch[2],
                    line: index + 1
                });
            }
        });
        
        return structure;
    }

    addCopyCodeFunctionality(container) {
        const copyButtons = container.querySelectorAll('.copy-code-btn');
        
        copyButtons.forEach(button => {
            // Add click handler for copy functionality
            button.setAttribute('onclick', `
                const targetId = this.dataset.target;
                const codeElement = document.getElementById(targetId);
                if (codeElement) {
                    navigator.clipboard.writeText(codeElement.textContent).then(() => {
                        this.textContent = 'Copied!';
                        setTimeout(() => {
                            this.innerHTML = '<i class="icon-copy"></i> Copy';
                        }, 2000);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                        this.textContent = 'Failed';
                        setTimeout(() => {
                            this.innerHTML = '<i class="icon-copy"></i> Copy';
                        }, 2000);
                    });
                }
            `);
        });
    }

    processFootnotes(container) {
        // Process footnote references [^1]
        const footnoteRefs = container.querySelectorAll('p');
        const footnotes = new Map();
        
        footnoteRefs.forEach(p => {
            const text = p.innerHTML;
            
            // Find footnote definitions [^1]: content
            const footnoteDefRegex = /\[\^([^\]]+)\]:\s*(.+)/g;
            let match;
            const defsToRemove = [];
            
            while ((match = footnoteDefRegex.exec(text)) !== null) {
                footnotes.set(match[1], match[2]);
                // Collect footnote definitions for removal
                defsToRemove.push(match[0]);
            }
            
            // Remove footnote definitions using DOM-based approach
            defsToRemove.forEach(defText => {
                replacePlaceholderInDOM(p, defText, '');
            });
            
            // Process footnote references using DOM-based approach
            const footnoteRefRegex = /\[\^([^\]]+)\]/g;
            const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                textNodes.push(node);
            }
            
            textNodes.forEach(textNode => {
                const matches = [];
                let match;
                footnoteRefRegex.lastIndex = 0;
                while ((match = footnoteRefRegex.exec(textNode.textContent)) !== null) {
                    matches.push({
                        match: match[0],
                        id: match[1]
                    });
                }
                
                matches.forEach(matchInfo => {
                    if (footnotes.has(matchInfo.id)) {
                        const replacement = `<sup><a href="#footnote-${matchInfo.id}" class="footnote-ref" id="ref-${matchInfo.id}">[${matchInfo.id}]</a></sup>`;
                        replacePlaceholderInDOM(p, matchInfo.match, replacement);
                    }
                });
            });
        });

        // Add footnotes section if any footnotes exist
        if (footnotes.size > 0) {
            let footnotesHtml = '<div class="footnotes"><hr><ol>';
            
            footnotes.forEach((content, id) => {
                footnotesHtml += `<li id="footnote-${id}">${content} <a href="#ref-${id}" class="footnote-backref">↩</a></li>`;
            });
            
            footnotesHtml += '</ol></div>';
            container.innerHTML += footnotesHtml;
        }
    }

    generateTOC(markdown) {
        const structure = this.extractMarkdownStructure(markdown);
        if (structure.length === 0) return '';
        
        let toc = '<div class="table-of-contents">\n<h3>Table of Contents</h3>\n<ul>\n';
        
        structure.forEach(heading => {
            const anchor = heading.text.toLowerCase().replace(/[^\w]+/g, '-');
            const indent = '  '.repeat(heading.level - 1);
            toc += `${indent}<li><a href="#${anchor}">${heading.text}</a></li>\n`;
        });
        
        toc += '</ul>\n</div>\n';
        return toc;
    }

    async renderTikZToSVG(code, isCircuit = false) {
        // This is a placeholder for TikZ integration
        // In a real implementation, this would use TikZJax or similar
        try {
            // Simulate TikZ rendering
            const wrapper = isCircuit ? 
                `\\begin{circuitikz}\n${code}\n\\end{circuitikz}` :
                `\\begin{tikzpicture}\n${code}\n\\end{tikzpicture}`;
            
            // This would typically make a call to a TikZ rendering service
            // For now, return a placeholder
            return `<div class="tikz-placeholder">
                <p>TikZ Diagram</p>
                <pre><code>${code}</code></pre>
                <p><em>TikZ rendering would appear here</em></p>
            </div>`;
        } catch (error) {
            throw new Error(`TikZ rendering failed: ${error.message}`);
        }
    }

    renderMathBlock(code) {
        try {
            const rendered = this.katex.renderToString(code.trim(), {
                ...this.katexOptions,
                displayMode: true
            });
            return `<div class="math-block">${rendered}</div>`;
        } catch (e) {
            return `<div class="math-error">Math Error: ${e.message}</div>`;
        }
    }

    generateLineNumbers(code) {
        const lines = code.split('\n');
        return lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('');
    }

    processMarkdownContent(content) {
        // Process custom extensions and enhanced markdown features
        let processed = content;
        
        // Process task lists (GitHub style)
        processed = processed.replace(/^(\s*)-\s+\[([ x])\]\s+(.+)$/gm, (match, indent, checked, text) => {
            const isChecked = checked === 'x';
            return `${indent}- <input type="checkbox" ${isChecked ? 'checked' : ''} disabled> ${text}`;
        });
        
        // Process admonitions/callouts
        processed = processed.replace(/^>\s*\[!(\w+)\](.*)$/gm, (match, type, title) => {
            const typeClass = type.toLowerCase();
            const titleText = title.trim() || type;
            return `> <div class="admonition admonition-${typeClass}"><div class="admonition-title">${titleText}</div>`;
        });
        
        // Process definition lists
        processed = processed.replace(/^([^:\n]+)\n:\s+(.+)$/gm, (match, term, definition) => {
            return `<dl><dt>${term.trim()}</dt><dd>${definition.trim()}</dd></dl>`;
        });
        
        // Process abbreviations
        processed = processed.replace(/\*\[([^\]]+)\]:\s*(.+)$/gm, (match, abbr, definition) => {
            return `<abbr title="${definition}">${abbr}</abbr>`;
        });
        
        return processed;
    }

    processCustomBlocks(content) {
        // Process custom blocks safely - math protection is handled by protectLaTeXEnvironments later
        let processed = content;
        
        // DEBUG: Check for display math before processing
        const beforeMatches = content.match(/\$\$[\s\S]*?\$\$/g);
        console.log('[MarkdownRenderer] BEFORE processCustomBlocks - found display math:', beforeMatches ? beforeMatches.length : 0);
        
        // Process custom blocks (math will be protected later by protectLaTeXEnvironments)
        
        // Process containers (:::warning, :::info, etc.)
        processed = processed.replace(/^:::(\w+)(?:\s+(.+))?\n([\s\S]*?)\n:::$/gm, (match, type, title, content) => {
            const titleHtml = title ? `<div class="custom-block-title">${title}</div>` : '';
            return `<div class="custom-block custom-block-${type}">
                ${titleHtml}
                <div class="custom-block-content">${content}</div>
            </div>`;
        });
        
        // Process spoilers
        processed = processed.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler">$1</span>');
        
        // Process subscript and superscript - be careful with LaTeX math that will be protected later  
        processed = processed.replace(/~([^~$]+)~/g, (match, content) => {
            // Skip if this looks like it's inside math placeholders
            if (match.includes('MATH_') || match.includes('LATEX_') || match.includes('PLACEHOLDER')) {
                return match;
            }
            return `<sub>${content}</sub>`;
        });
        // More careful superscript processing - avoid LaTeX and math placeholders
        processed = processed.replace(/\^([^^$]+)\^/g, (match, content) => {
            // Skip if this contains math indicators or is inside placeholders
            if (content.includes('\\') || content.includes('{') || content.includes('}') || 
                match.includes('MATH_') || match.includes('LATEX_') || match.includes('PLACEHOLDER')) {
                return match;
            }
            return `<sup>${content}</sup>`;
        });
        
        // Process highlight/mark text
        processed = processed.replace(/==([^=]+)==/g, '<mark>$1</mark>');
        
        // Process strikethrough text  
        processed = processed.replace(/~~([^~]+)~~/g, '<del>$1</del>');
        
        // Process keyboard keys
        processed = processed.replace(/\[\[([^\]]+)\]\]/g, '<kbd>$1</kbd>');
        
        // DEBUG: Check for display math after processing
        const afterMatches = processed.match(/\$\$[\s\S]*?\$\$/g);
        console.log('[MarkdownRenderer] AFTER processCustomBlocks - found display math:', afterMatches ? afterMatches.length : 0);
        
        return processed;
    }

    processTaskLists(container) {
        // Enhanced task list processing with interactions
        const taskLists = container.querySelectorAll('input[type="checkbox"]');
        
        taskLists.forEach((checkbox, index) => {
            checkbox.id = `task-${index}`;
            checkbox.disabled = false; // Enable interaction in preview mode
            
            checkbox.addEventListener('change', (e) => {
                // Update the corresponding markdown content
                const checked = e.target.checked;
                const listItem = e.target.closest('li');
                
                if (listItem) {
                    listItem.classList.toggle('task-completed', checked);
                }
            });
        });
    }

    processDataTables(container) {
        // Enhanced table processing with sorting and filtering
        const tables = container.querySelectorAll('table');
        
        tables.forEach((table, index) => {
            table.id = `data-table-${index}`;
            table.classList.add('data-table');
            
            // Add table wrapper for responsive design
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
            
            // Add sorting functionality to headers
            const headers = table.querySelectorAll('th');
            headers.forEach((header, colIndex) => {
                header.style.cursor = 'pointer';
                header.title = 'Click to sort';
                
                header.addEventListener('click', () => {
                    this.sortTable(table, colIndex);
                });
            });
        });
    }

    sortTable(table, columnIndex) {
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        const sortedRows = rows.sort((a, b) => {
            const aText = a.cells[columnIndex]?.textContent.trim() || '';
            const bText = b.cells[columnIndex]?.textContent.trim() || '';
            
            // Try to parse as numbers first
            const aNum = parseFloat(aText);
            const bNum = parseFloat(bText);
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return aNum - bNum;
            }
            
            // Fall back to string comparison
            return aText.localeCompare(bText);
        });
        
        // Clear tbody and append sorted rows
        tbody.innerHTML = '';
        sortedRows.forEach(row => tbody.appendChild(row));
    }

    processYAMLFrontmatter(content) {
        // Extract and process YAML frontmatter
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
        const match = content.match(frontmatterRegex);
        
        if (!match) {
            return { content, frontmatter: null };
        }
        
        try {
            const yamlContent = match[1];
            const frontmatter = this.parseSimpleYAML(yamlContent);
            const cleanContent = content.replace(frontmatterRegex, '');
            
            return { content: cleanContent, frontmatter };
        } catch (error) {
            console.warn('Failed to parse YAML frontmatter:', error);
            return { content, frontmatter: null };
        }
    }

    parseSimpleYAML(yamlString) {
        // Simple YAML parser for basic key-value pairs
        const result = {};
        const lines = yamlString.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const colonIndex = trimmed.indexOf(':');
                if (colonIndex > 0) {
                    const key = trimmed.substring(0, colonIndex).trim();
                    const value = trimmed.substring(colonIndex + 1).trim();
                    
                    // Remove quotes if present
                    const cleanValue = value.replace(/^["'](.*)["']$/, '$1');
                    result[key] = cleanValue;
                }
            }
        });
        
        return result;
    }

    getWordCount(markdown) {
        return markdown.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    getCharCount(markdown) {
        return markdown.length;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownRenderer;
} else {
    window.MarkdownRenderer = MarkdownRenderer;
}
