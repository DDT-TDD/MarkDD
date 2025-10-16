// --- Remark integration ---
let remark = null;
let remarkPlugins = [];
window.markddRegisterRemarkPlugin = function(plugin) {
    if (!remarkPlugins.includes(plugin)) remarkPlugins.push(plugin);
};
window.markddClearRemarkPlugins = function() {
    remarkPlugins = [];
};

async function ensureRemarkLoaded() {
    if (remark) return remark;
    // Try to load remark from CDN if not present
    if (!window.unified) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/remark-parse@11.0.0/dist/remark-parse.umd.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    if (window.unified && window.remarkParse) {
        remark = window.unified().use(window.remarkParse);
        return remark;
    }
    return null;
}

class MarkdownRenderer {
    constructor() {
        this.marked = null;
        this.markedParse = null; // unified parse function reference
        this.hljs = null;
        this.katex = null;
        this.mermaid = null;
        this.isInitialized = false;
        // Initialize TikZJax loader
        this.tikzLoader = new TikZJaxLoader();
    }

    async init() {
        console.log('[MarkdownRenderer] Starting initialization...');
        
        // Libraries should already be loaded by LibraryLoader
        this.marked = window.marked;
        this.hljs = window.hljs;
        this.katex = window.katex;
        this.mermaid = window.mermaid;
        
        console.log('[MarkdownRenderer] Libraries assigned:', {
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
        
        this.initializeMarked();
        this.initializeMermaid();
        this.initializeKaTeX();
        
        this.isInitialized = true;
        console.log('[MarkdownRenderer] Initialization completed successfully');
    }

    initializeMarked() {
        if (!this.marked) {
            console.error('Marked library not available');
            return;
        }
        
        // Configure marked with custom renderer
        const renderer = new this.marked.Renderer();
        
        // Custom code block rendering
        renderer.code = (code, lang, escaped) => {
            const validLang = lang && this.hljs.getLanguage(lang) ? lang : 'plaintext';
            
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
            if (lang === 'math' || lang === 'latex') {
                return this.renderMathBlock(code);
            }

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
            
            // Regular code highlighting with line numbers and copy button
            const highlighted = this.hljs.highlight(code, { language: validLang }).value;
            const lineNumbers = this.generateLineNumbers(code);
            const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            
            return `<div class="code-block-container" data-language="${validLang}">
                <div class="code-block-header">
                    <span class="code-language">${lang || 'text'}</span>
                    <button class="copy-code-btn" data-target="${codeId}" title="Copy code">
                        <i class="icon-copy"></i> Copy
                    </button>
                </div>
                <div class="code-block-content">
                    <div class="line-numbers">${lineNumbers}</div>
                    <pre><code id="${codeId}" class="hljs ${validLang}">${highlighted}</code></pre>
                </div>
        };
        
        // Custom math rendering
        renderer.codespan = (text) => {
            // Check for inline math
            if (text.startsWith('$') && text.endsWith('$') && text.length > 2) {
                const math = text.slice(1, -1);
                try {
                    // Add safety check for katex availability
                    if (this.katex && this.katex.renderToString) {
                        return this.katex.renderToString(math, { throwOnError: false });
                    } else {
                        return `<code class="math-inline">${math}</code>`;
                    }
                } catch (e) {
                    return `<code class="error">Math Error: ${e.message}</code>`;
                }
            }
            return `<code>${text}</code>`;
        };
        
        // Custom heading renderer with anchors
        renderer.heading = (text, level) => {
            const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
            return `<h${level} id="${escapedText}">${text}</h${level}>`;
        };
        
        // Custom table rendering with classes
        renderer.table = (header, body) => {
            return `<table class="table table-striped">${header}${body}</table>`;
        };
        
        // Configure marked options
        this.marked.setOptions({
            renderer: renderer,
            breaks: true,
            gfm: true,
            headerIds: true,
            mangle: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
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
        // KaTeX is already loaded, just configure it
        this.katexOptions = {
            throwOnError: false,
            errorColor: '#cc0000',
            displayMode: false
        };
    }

    async render(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return '<div class="preview-placeholder"><p>Start typing to see preview...</p></div>';
        }

        // Enhanced initialization check with detailed debugging
        console.log('[MarkdownRenderer] Render called with:', {
            markdown: markdown.substring(0, 50) + '...',
            isInitialized: this.isInitialized,
            hasMarked: !!this.marked,
            windowMarked: !!window.marked,
            markedType: typeof this.marked
        });

        // Ensure renderer is initialized with retry mechanism
        if (!this.isInitialized || !this.marked) {
            console.log('[MarkdownRenderer] Re-initializing...');
            try {
                await this.init();
                if (!this.marked) {
                    console.error('[MarkdownRenderer] Failed to initialize marked after retry');
                    return '<div class="error">Failed to initialize markdown renderer. Please refresh the page.</div>';
                }
            } catch (error) {
                console.error('[MarkdownRenderer] Initialization error:', error);
                return `<div class="error">Initialization Error: ${error.message}</div>`;
            }
        }

        // Additional safety check supporting object API
    const hasParser = !!this.markedParse;
    if (!hasParser) {
            console.error('[MarkdownRenderer] Marked parser not available:', {
                type: typeof this.marked,
        hasParse: this.marked && typeof this.marked.parse === 'function',
        hasMarkedFn: this.marked && typeof this.marked.marked === 'function'
            });
            return '<div class="error">Markdown renderer is not properly initialized. Please check console for details.</div>';
        }

        try {
            console.log('[MarkdownRenderer] Starting render process...');
            
            // Process math blocks first
            let processed = this.processMathBlocks(markdown);
            
            // Render with marked (support function or object API)
            let html;
            try {
                html = this.markedParse(processed);
            } catch (e) {
                console.error('[MarkdownRenderer] Marked parsing failure:', e);
                return `<div class="error">Markdown parsing failed: ${e.message}</div>`;
            }
            
            // Post-process for special content
            html = await this.postProcess(html);
            
            console.log('[MarkdownRenderer] Render completed successfully');
            return html;
        } catch (error) {
            console.error('[MarkdownRenderer] Rendering error:', error);
            console.error('[MarkdownRenderer] Error stack:', error.stack);
            return `<div class="error">Rendering Error: ${error.message}<br><small>Check console for details</small></div>`;
        }
    }

    processMathBlocks(markdown) {
        if (!this.katex) {
            return markdown; // Return unchanged if KaTeX not available
        }
        
        // Handle display math blocks ($$...$$)
        return markdown.replace(/\$\$([^$]+?)\$\$/g, (match, math) => {
            try {
                const rendered = this.katex.renderToString(math.trim(), {
                    ...this.katexOptions,
                    displayMode: true
                });
                return `<div class="math-display">${rendered}</div>`;
            } catch (e) {
                return `<div class="math-error">Math Error: ${e.message}</div>`;
            }
        });
    }

    renderMermaid(code) {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="mermaid-container" data-mermaid-id="${id}" data-mermaid-code="${encodeURIComponent(code)}">
            <div class="mermaid-loading">Loading diagram...</div>
        </div>`;
    }

    renderTikZ(code, lang) {
        const id = `tikz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const isCircuit = lang === 'circuitikz';
        
        return `<div class="tikz-container" data-tikz-id="${id}" data-tikz-code="${encodeURIComponent(code)}" data-is-circuit="${isCircuit}">
            <div class="tikz-loading">Loading ${isCircuit ? 'CircuiTikZ' : 'TikZ'} diagram...</div>
        </div>`;
    }

    renderMarkmap(code) {
        const id = `markmap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="markmap-inline-container" data-markmap-id="${id}" data-markmap-code="${encodeURIComponent(code)}">
            <div class="markmap-loading">Loading mind map...</div>
        </div>`;
    }

    renderGraphviz(code, engine = 'dot') {
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

    async postProcess(html) {
        // Create a temporary DOM to work with
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
        const container = doc.querySelector('div');

        // Process Mermaid diagrams
        await this.processMermaidDiagrams(container);
        
        // Process TikZ diagrams
        await this.processTikZDiagrams(container);
        
        // Process inline Markmaps
        await this.processInlineMarkmaps(container);

        // Process GraphViz diagrams
        await this.processGraphvizDiagrams(container);

        // Process ABC music notation
        await this.processAbcMusic(container);

        // Process Wavedrom diagrams
        await this.processWavedromDiagrams(container);

        // Process other special diagrams
        await this.processSpecialDiagrams(container);

        // Add copy functionality to code blocks
        this.addCopyCodeFunctionality(container);

        // Process footnotes
        this.processFootnotes(container);

        // Process multimedia embedding
        this.processMultimediaEmbeds(container);
        
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
                element.innerHTML = `<div class="mermaid-error">Mermaid Error: ${error.message}</div>`;
                element.classList.add('mermaid-error');
            }
        }
    }

    async processTikZDiagrams(container) {
        const tikzElements = container.querySelectorAll('.tikz-container');
        
        for (const element of tikzElements) {
            const id = element.getAttribute('data-tikz-id');
            const code = decodeURIComponent(element.getAttribute('data-tikz-code'));
            const isCircuit = element.getAttribute('data-is-circuit') === 'true';
            
            try {
                // Use TikZJax loader for proper rendering
                const tikzScript = this.tikzLoader.createTikZScript(code, isCircuit);
                const tempContainer = document.createElement('div');
                tempContainer.appendChild(tikzScript);
                
                // Process the TikZ script
                await this.tikzLoader.processTikZScripts(tempContainer);
                
                // Get the rendered result
                element.innerHTML = tempContainer.innerHTML;
                element.classList.add('tikz-rendered');
            } catch (error) {
                console.error('TikZ rendering error:', error);
                element.innerHTML = `<div class="tikz-error">
                    <h4>TikZ Rendering Error</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Show TikZ Code</summary>
                        <pre><code>${code}</code></pre>
                    </details>
                </div>`;
                element.classList.add('tikz-error');
            }
        }
    }

    async processInlineMarkmaps(container) {
        const markmapElements = container.querySelectorAll('.markmap-inline-container');
        
        for (const element of markmapElements) {
            const id = element.getAttribute('data-markmap-id');
            const code = decodeURIComponent(element.getAttribute('data-markmap-code'));
            
            try {
                // Create a smaller inline markmap
                element.innerHTML = `<svg id="${id}" width="400" height="300"></svg>`;
                
                // This would integrate with markmap
                if (window.markmap) {
                    const { root } = window.markmap.transform(code);
                    const svg = d3.select(`#${id}`);
                    window.markmap.Markmap.create(svg.node(), null, root);
                }
                
                element.classList.add('markmap-rendered');
            } catch (error) {
                element.innerHTML = `<div class="markmap-error">Markmap Error: ${error.message}</div>`;
                element.classList.add('markmap-error');
            }
        }
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

    renderGraphviz(code) {
        const id = `graphviz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="graphviz-container" data-graphviz-id="${id}" data-graphviz-code="${encodeURIComponent(code)}">
            <div class="graphviz-loading">Loading Graphviz diagram...</div>
        </div>`;
    }

    renderPlantUML(code) {
        const id = `plantuml-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="plantuml-container" data-plantuml-id="${id}" data-plantuml-code="${encodeURIComponent(code)}">
            <div class="plantuml-loading">Loading PlantUML diagram...</div>
        </div>`;
    }

    renderVegaLite(code) {
        const id = `vega-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return `<div class="vega-lite-container" data-vega-id="${id}" data-vega-code="${encodeURIComponent(code)}">
            <div class="vega-loading">Loading Vega-Lite visualization...</div>
        </div>`;
    }

    generateLineNumbers(code) {
        const lines = code.split('\n');
        return lines.map((_, index) => `<span class="line-number">${index + 1}</span>`).join('');
    }

    // Enhanced processing for various diagram types
    async processSpecialDiagrams(container) {
        await this.processGraphvizDiagrams(container);
        await this.processPlantUMLDiagrams(container);
        await this.processVegaLiteDiagrams(container);
    }

    async processGraphvizDiagrams(container) {
        const graphvizElements = container.querySelectorAll('.graphviz-container');
        
        for (const element of graphvizElements) {
            const code = decodeURIComponent(element.getAttribute('data-graphviz-code'));
            
            try {
                // Placeholder for Graphviz integration
                element.innerHTML = `<div class="graphviz-placeholder">
                    <p>Graphviz Diagram</p>
                    <pre><code>${code}</code></pre>
                    <p><em>Graphviz rendering would appear here</em></p>
                </div>`;
                element.classList.add('graphviz-rendered');
            } catch (error) {
                element.innerHTML = `<div class="graphviz-error">Graphviz Error: ${error.message}</div>`;
                element.classList.add('graphviz-error');
            }
        }
    }

    async processPlantUMLDiagrams(container) {
        const plantumlElements = container.querySelectorAll('.plantuml-container');
        
        for (const element of plantumlElements) {
            const code = decodeURIComponent(element.getAttribute('data-plantuml-code'));
            const id = element.getAttribute('data-plantuml-id');
            
            try {
                // Use PlantUML server for rendering
                const server = 'http://www.plantuml.com/plantuml/svg/';
                const encoded = this.encodePlantUML(code);
                
                element.innerHTML = `<div class="plantuml-diagram">
                    <div class="diagram-header">
                        <span class="diagram-type">PlantUML Diagram</span>
                        <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                        <pre class="diagram-source hidden"><code>${code}</code></pre>
                    </div>
                    <div class="diagram-content">
                        <img src="${server}${encoded}" alt="PlantUML Diagram" onerror="this.parentElement.innerHTML='<p class=\\\"diagram-error\\\">Failed to render PlantUML diagram</p>'">
                    </div>
                </div>`;
                element.classList.add('plantuml-rendered');
            } catch (error) {
                element.innerHTML = `<div class="plantuml-error">PlantUML Error: ${error.message}</div>`;
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
                } catch (e) {
                    // Try YAML parsing if JSON fails
                    throw new Error('Vega-Lite spec must be valid JSON');
                }
                
                element.innerHTML = `<div class="vega-lite-diagram" id="${id}">
                    <div class="diagram-header">
                        <span class="diagram-type">Vega-Lite Visualization</span>
                        <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Spec</button>
                        <pre class="diagram-source hidden"><code>${JSON.stringify(spec, null, 2)}</code></pre>
                    </div>
                    <div class="diagram-content" id="${id}-chart"></div>
                </div>`;
                
                // Render with Vega-Embed if available
                if (window.vegaEmbed) {
                    await window.vegaEmbed(`#${id}-chart`, spec, {
                        actions: false,
                        renderer: 'svg'
                    });
                } else {
                    // Fallback display
                    document.getElementById(`${id}-chart`).innerHTML = `
                        <div class="vega-placeholder">
                            <p>Vega-Lite visualization would render here</p>
                            <p><small>Requires vega-embed library</small></p>
                        </div>`;
                }
                
                element.classList.add('vega-rendered');
            } catch (error) {
                element.innerHTML = `<div class="vega-error">Vega-Lite Error: ${error.message}</div>`;
                element.classList.add('vega-error');
            }
        }
    }

    encodePlantUML(text) {
        // Simple base64-like encoding for PlantUML server
        // This is a simplified version - in production, use proper PlantUML encoding
        const utf8 = unescape(encodeURIComponent(text));
        return btoa(utf8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
            
            while ((match = footnoteDefRegex.exec(text)) !== null) {
                footnotes.set(match[1], match[2]);
                // Remove the footnote definition from the text
                p.innerHTML = p.innerHTML.replace(match[0], '');
            }
            
            // Process footnote references
            const footnoteRefRegex = /\[\^([^\]]+)\]/g;
            p.innerHTML = p.innerHTML.replace(footnoteRefRegex, (match, id) => {
                if (footnotes.has(id)) {
                    return `<sup><a href="#footnote-${id}" class="footnote-ref" id="ref-${id}">[${id}]</a></sup>`;
                }
                return match;
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

    processMultimediaEmbeds(container) {
        // Process image embeds with advanced features
        const images = container.querySelectorAll('img');
        
        images.forEach(img => {
            // Add lazy loading and responsive attributes
            img.setAttribute('loading', 'lazy');
            img.classList.add('responsive-image');
            
            // Wrap images in figure elements if they have alt text
            if (img.alt) {
                const figure = document.createElement('figure');
                const figcaption = document.createElement('figcaption');
                figcaption.textContent = img.alt;
                
                img.parentNode.insertBefore(figure, img);
                figure.appendChild(img);
                figure.appendChild(figcaption);
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

    async processGraphvizDiagrams(container) {
        const graphvizElements = container.querySelectorAll('.graphviz-container');
        
        for (const element of graphvizElements) {
            const id = element.getAttribute('data-graphviz-id');
            const code = decodeURIComponent(element.getAttribute('data-graphviz-code'));
            const engine = element.getAttribute('data-graphviz-engine') || 'dot';
            
            try {
                if (window.Viz) {
                    const viz = new window.Viz();
                    const svg = await viz.renderSVGElement(code, { engine });
                    element.innerHTML = '';
                    element.appendChild(svg);
                    element.classList.add('graphviz-rendered');
                } else {
                    element.innerHTML = `<div class="diagram-error">GraphViz library not loaded. Please check your internet connection.</div>`;
                }
            } catch (error) {
                console.error('[MarkdownRenderer] GraphViz error:', error);
                element.innerHTML = `<div class="diagram-error">GraphViz Error: ${error.message}</div>`;
                element.classList.add('graphviz-error');
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
