class Preview {
    /**
     * Re-render the preview with the current editor content.
     * Used for plugin enable/disable toggles.
     */
    async refresh() {
        const editorElement = document.getElementById('editor');
        if (!editorElement) return;
        const content = editorElement.value;
        await this.updatePreview(content);
    }
    constructor(previewElement, renderer) {
        this.element = previewElement;
        this.renderer = renderer;
        this.isLivePreview = true;
        this.syncScroll = true;
        this.debounceTimeout = null;
        this.debounceDelay = 150; // Reduced from 300ms to 150ms for faster live updates
        this.isUpdating = false;
        this.lastProcessedContent = null;  // Track last processed content to avoid redundant updates
        this.queuedContent = null;        // Queue content when updates are in progress
        this.lastLineElementMapRebuild = 0; // Track when line mapping was last rebuilt
        this.lineElementMapRebuildDebounceTimeout = null; // Debounce timeout for line mapping rebuild
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeScrollSync();
    }

    setupEventListeners() {
        // Listen for editor content changes
        document.addEventListener('editor-content-changed', (e) => {
            if (this.isLivePreview) {
                console.log('[Preview] Content change detected, triggering debounced update');
                this.debounceUpdate(e.detail.content);
            } else {
                console.log('[Preview] Live preview disabled, skipping update');
            }
        });

        // Handle link clicks
        this.element.addEventListener('click', (e) => {
            this.handleLinkClick(e);
        });

        // Handle image loading
        this.element.addEventListener('load', (e) => {
            if (e.target.tagName === 'IMG') {
                this.updateScrollSync();
            }
        }, true);
    }

    initializeScrollSync() {
        // Setup scroll synchronization between editor and preview
        this.isScrolling = false;
        this.scrollRatio = 0;
        this.lineElementMap = new Map(); // Cache for line to element mapping
        this.lastEditorLineCount = 0;
        this.scrollSyncEnabled = true; // Add explicit flag
        this.syncScroll = true; // Initialize syncScroll property for consistency
        
        // Add scroll sync debouncing properties with optimized delays
        // CRITICAL FIX: Separate timeout variables for each direction to prevent cancellation
        this.scrollSyncFromEditorTimeout = null;  // Editor → Preview timeout
        this.scrollSyncToEditorTimeout = null;    // Preview → Editor timeout
        this.scrollSyncDelay = 50; // Reduced to 50ms for more responsive sync
        
        // CRITICAL FIX: Separate throttle timestamps for each direction
        this.lastEditorScrollTime = 0;   // Editor scroll events
        this.lastPreviewScrollTime = 0;  // Preview scroll events
        this.scrollThrottleDelay = 30; // Reduced throttle for better responsiveness
        
        // Preview to Editor sync - CRITICAL FIX: Use the actual scrollable container with throttling
        const previewContainer = this.element.parentElement; // #preview-container
        if (previewContainer && previewContainer.id === 'preview-container') {
            previewContainer.addEventListener('scroll', () => {
                // PERFORMANCE FIX: Add throttling to prevent event flooding
                // Use separate timestamp for preview to avoid blocking editor events
                const now = Date.now();
                if (now - this.lastPreviewScrollTime < this.scrollThrottleDelay) {
                    return; // Skip this event if too soon after last one
                }
                this.lastPreviewScrollTime = now;
                
                // Reduce logging frequency - only log every 10th event or when scroll state changes
                const shouldLog = this.lastLoggedScrollTime === undefined || 
                                 now - this.lastLoggedScrollTime > 500 ||
                                 this.isScrolling !== this.lastLoggedScrollState;
                
                if (shouldLog) {
                    console.log('[Preview] Preview container scroll event detected - scrollSyncEnabled:', this.scrollSyncEnabled, 'isScrolling:', this.isScrolling);
                    this.lastLoggedScrollTime = now;
                    this.lastLoggedScrollState = this.isScrolling;
                }
                
                if (this.scrollSyncEnabled && !this.isScrolling) {
                    this.debouncedSyncScrollToEditor();
                }
            });
            console.log('[Preview] Scroll event listener attached to preview container:', previewContainer.id);
        } else {
            console.error('[Preview] Could not find preview-container element for scroll sync');
        }

        // Editor to Preview sync with throttling
        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.addEventListener('scroll', () => {
                // PERFORMANCE FIX: Add throttling for editor scroll events too
                // Use separate timestamp for editor to avoid blocking preview events
                const now = Date.now();
                if (now - this.lastEditorScrollTime < this.scrollThrottleDelay) {
                    return;
                }
                this.lastEditorScrollTime = now;
                
                // Debug logging for editor scroll sync
                const shouldLog = !this.lastEditorSyncLogTime || (now - this.lastEditorSyncLogTime > 1000);
                if (shouldLog) {
                    console.log('[Preview] Editor scroll event - scrollSyncEnabled:', this.scrollSyncEnabled, 'isScrolling:', this.isScrolling);
                    this.lastEditorSyncLogTime = now;
                }
                
                if (this.scrollSyncEnabled && !this.isScrolling) {
                    this.debouncedSyncScrollFromEditor();
                } else if (shouldLog) {
                    console.log('[Preview] Editor scroll BLOCKED - scrollSyncEnabled:', this.scrollSyncEnabled, 'isScrolling:', this.isScrolling);
                }
            });

            // Update line mapping when content changes with better debouncing
            editorElement.addEventListener('input', () => {
                if (this.scrollSyncEnabled) {
                    // Use longer debounce for line mapping rebuild for performance
                    this.debouncedRebuildLineElementMap();
                }
            });
        }
        
        // Initial line mapping with delay
        setTimeout(() => {
            this.debouncedRebuildLineElementMap();
        }, 1000);
    }



    updateScrollSync() {
        // Call this after content changes to recalculate scroll positions
        if (this.syncScroll) {
            this.syncScrollFromEditor();
        }
    }

    debounceUpdate(content) {
        // --- FIX: Always check if content has actually changed ---
        if (this.lastProcessedContent === content) {
            console.log('[Preview] Content unchanged, skipping update');
            return;
        }
        
        // Store the content we're about to process
        this.lastProcessedContent = content;
        
        // Prevent multiple rapid updates
        if (this.isUpdating) {
            console.log('[Preview] Update in progress, queuing new content');
            this.queuedContent = content;
            return;
        }
        
        // Clear existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Set new timeout - increased delay for stability
        this.debounceTimeout = setTimeout(() => {
            if (!this.isUpdating) {
                console.log('[Preview] Debounced update triggered for content length:', content.length);
                this.updatePreview(content);
            } else {
                console.log('[Preview] Still updating, queueing content');
                this.queuedContent = content;
            }
        }, this.debounceDelay);
    }

    async updatePreview(content) {
        try {
            // Prevent concurrent updates - CRITICAL FIX
            if (this.isUpdating) {
                console.log('[Preview] Update already in progress, skipping...');
                return;
            }
            
            this.isUpdating = true;
            console.log('[Preview] updatePreview called with content length:', content.length);
            console.log('🔍🔍🔍 [Preview] Content preview (first 300 chars):', content.substring(0, 300));
            console.log('🔍🔍🔍 [Preview] Content includes "Math Rendering Test":', content.includes('Math Rendering Test'));
            console.log('🔍🔍🔍 [Preview] Content includes "MarkDD Editor - Complete Feature Showcase":', content.includes('MarkDD Editor - Complete Feature Showcase'));
            
            // Show loading state for long operations
            const isLongContent = content.length > 10000;
            if (isLongContent) {
                console.log('[Preview] Long content detected, showing loading...');
                this.showLoading();
            }

            // Render markdown to HTML with timeout protection (30s for complex files)
            console.log('[Preview] Calling renderer.render...');
            try {
                const renderPromise = this.renderer.render(content);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Render timeout after 30 seconds')), 30000)
                );
                
                console.log('[Preview] Racing render vs timeout (30s limit)...');
                const html = await Promise.race([renderPromise, timeoutPromise]);
                console.log('[Preview] Renderer returned HTML length:', html ? html.length : 'NULL/UNDEFINED');
                console.log('[Preview] HTML preview (first 200 chars):', html ? html.substring(0, 200) : 'NULL');
                
                // Update the preview element - SINGLE UPDATE ONLY
                console.log('[Preview] Setting element.innerHTML...');
                if (this.element) {
                    this.element.innerHTML = html;
                    console.log('[Preview] Element innerHTML updated successfully');
                } else {
                    console.error('[Preview] Preview element is null/undefined!');
                    return;
                }
                
            } catch (renderError) {
                console.error('[Preview] ERROR during rendering:', renderError);
                console.error('[Preview] Error details:', renderError.stack);
                if (this.element) {
                    this.element.innerHTML = '<div class="preview-error">Rendering failed: ' + renderError.message + '</div>';
                }
                return;
            }
            
            // Post-process the rendered content - ONLY ONCE
            console.log('[Preview] Starting post-processing...');
            await this.postProcess();
            console.log('[Preview] Post-processing completed');

            // --- FIX: Use debounced line-element map rebuild for performance ---
            this.debouncedRebuildLineElementMap();

            // Dispatch update event
            this.dispatchUpdateEvent();
            console.log('[Preview] updatePreview completed successfully');

        } catch (error) {
            console.error('[Preview] ERROR in updatePreview:', error);
            console.error('[Preview] Error stack:', error.stack);
            this.showError(error.message);
        } finally {
            this.isUpdating = false;
            
            // --- FIX: Process any queued content after update completes ---
            if (this.queuedContent !== null && this.queuedContent !== this.lastProcessedContent) {
                console.log('[Preview] Processing queued content after update completion');
                const queuedContent = this.queuedContent;
                this.queuedContent = null;
                // Process queued content with a small delay to avoid immediate recursion
                setTimeout(() => {
                    this.debounceUpdate(queuedContent);
                }, 50);
            }
        }
    }

    async postProcess() {
        // Process syntax highlighting
        this.highlightCode();
        
        // Process math rendering
        await this.renderMath();
        
        // Process diagrams
        await this.processDiagrams();
        
        // Process editable mindmaps
        await this.processEditableMindmaps();
        
        // Update internal links
        this.updateInternalLinks();
        
        // Setup copy code buttons
        this.setupCodeCopyButtons();
    }

    highlightCode() {
        const codeBlocks = this.element.querySelectorAll('pre code:not(.hljs)');
        if (!window.hljs) {
            // Show a warning if highlight.js is not loaded
            if (!this.element.querySelector('.highlightjs-warning')) {
                const warning = document.createElement('div');
                warning.className = 'highlightjs-warning';
                warning.style = 'color: #b71c1c; background: #fff3f3; padding: 8px; margin: 8px 0; border-radius: 4px; font-size: 0.98em;';
                warning.innerHTML = '⚠️ Code highlighting is unavailable: highlight.js failed to load.';
                this.element.prepend(warning);
            }
            return;
        }
        codeBlocks.forEach(block => {
            window.hljs.highlightElement(block);
        });
    }

    async renderMath() {
        if (window.renderMathInElement) {
            // KaTeX auto-render
            window.renderMathInElement(this.element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false,
                errorColor: '#cc0000'
            });
        }
    }

    async processDiagrams() {
        // Process any diagrams that weren't handled during initial render
        await this.processMermaidDiagrams();
        await this.processTikZDiagrams();
        await this.processMarkmaps();
        await this.processPlantUMLDiagrams();
        await this.processVegaLiteDiagrams();
        await this.processGraphVizDiagrams();
        await this.processAbcNotation();
        await this.processLatexDocuments();
    }

    async processMermaidDiagrams() {
        const mermaidElements = this.element.querySelectorAll('.mermaid-container:not(.mermaid-rendered)');
        
        for (const element of mermaidElements) {
            const code = decodeURIComponent(element.getAttribute('data-mermaid-code'));
            const id = element.getAttribute('data-mermaid-id');
            
            try {
                if (window.mermaid) {
                    const { svg } = await window.mermaid.render(id, code);
                    element.innerHTML = svg;
                    element.classList.add('mermaid-rendered');
                }
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">Mermaid Error: ${error.message}</div>`;
                element.classList.add('mermaid-error');
            }
        }
    }

    async processTikZDiagrams() {
        console.error('[DEBUG] Preview.processTikZDiagrams() called');
        
        const tikzElements = this.element.querySelectorAll('.tikz-container:not(.tikz-rendered)');
        console.error('[DEBUG] Preview found TikZ elements:', tikzElements.length);
        
        // --- FIX: Skip if already processed by MarkdownRenderer ---
        if (tikzElements.length === 0) {
            console.error('[DEBUG] Preview: No unprocessed TikZ elements found, skipping');
            return;
        }
        
        // --- FIX: Delegate TikZ processing to MarkdownRenderer to avoid race conditions ---
        if (this.renderer) {
            console.error('[DEBUG] Preview delegating TikZ processing to MarkdownRenderer to avoid race condition');
            try {
                // Let MarkdownRenderer handle all TikZ processing to avoid duplicate IPC calls
                await this.renderer.processTikZDiagrams(this.element);
                console.error('[DEBUG] Preview TikZ delegation completed successfully');
            } catch (error) {
                console.error('[Preview] TikZ delegation error:', error);
                // Fallback: mark elements as processed with error state
                for (const element of tikzElements) {
                    element.innerHTML = `<div class="tikz-error">TikZ Error: ${error.message}</div>`;
                    element.classList.add('tikz-error', 'tikz-rendered');
                }
            }
        } else {
            console.error('[DEBUG] Preview: No renderer available for TikZ delegation');
        }
        
        // --- FIX: Use debounced line-element map rebuild for performance ---
        this.debouncedRebuildLineElementMap();
    }

    async processMarkmaps() {
        const markmapElements = this.element.querySelectorAll('.markmap-inline-container:not(.markmap-rendered)');
        
        for (const element of markmapElements) {
            const code = decodeURIComponent(element.getAttribute('data-markmap-code'));
            const id = element.getAttribute('data-markmap-id');
            
            try {
                // Create inline markmap
                element.innerHTML = `<svg id="${id}" width="100%" height="200"></svg>`;
                
                if (window.markmap && window.d3) {
                    const { root } = window.markmap.transform(code);
                    const svg = window.d3.select(`#${id}`);
                    window.markmap.Markmap.create(svg.node(), null, root);
                }
                
                element.classList.add('markmap-rendered');
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">Markmap Error: ${error.message}</div>`;
                element.classList.add('markmap-error');
            }
        }
    }

    async processPlantUMLDiagrams() {
        const plantumlElements = this.element.querySelectorAll('.plantuml-container:not(.plantuml-rendered)');
        
        for (const element of plantumlElements) {
            const code = decodeURIComponent(element.getAttribute('data-plantuml-code'));
            const id = element.getAttribute('data-plantuml-id');
            
            try {
                // Use PlantUML server for rendering
                const server = 'https://www.plantuml.com/plantuml/svg/';
                const encoded = this.encodePlantUML(code); // proper encoding applied
                
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

    async processVegaLiteDiagrams() {
        const vegaElements = this.element.querySelectorAll('.vega-lite-container:not(.vega-rendered)');
        
        for (const element of vegaElements) {
            const code = decodeURIComponent(element.getAttribute('data-vega-code'));
            const id = element.getAttribute('data-vega-id');
            
            try {
                // Show loading indicator
                element.innerHTML = this.createLoadingIndicator('Vega-Lite');
                
                // Load Vega-Embed library with proper dependencies
                if (!window.vegaEmbed || !window.vega || !window.vegaLite) {
                    // Load Vega first
                    if (!window.vega) {
                        await window.libraryLoader?.loadScript(
                            'https://cdn.jsdelivr.net/npm/vega@5.33.0/build/vega.min.js',
                            'Vega',
                            () => window.vega !== undefined && typeof window.vega.parse === 'function'
                        );
                    }
                    
                    // Load Vega-Lite with compile function
                    if (!window.vegaLite || !window.vegaLite.compile) {
                        await window.libraryLoader?.loadScript(
                            'https://cdn.jsdelivr.net/npm/vega-lite@5.23.0/build/vega-lite.min.js',
                            'VegaLite',
                            () => window.vegaLite !== undefined && typeof window.vegaLite.compile === 'function'
                        );
                    }
                    
                    // Load Vega-Embed
                    if (!window.vegaEmbed) {
                        await window.libraryLoader?.loadScript(
                            'https://cdn.jsdelivr.net/npm/vega-embed@6.29.0/build/vega-embed.min.js',
                            'VegaEmbed',
                            () => window.vegaEmbed !== undefined && typeof window.vegaEmbed === 'function'
                        );
                    }
                }
                
                // Verify all required functions are available
                if (!window.vegaEmbed || !window.vega || !window.vegaLite || !window.vegaLite.compile) {
                    throw new Error('Required Vega libraries (Vega, Vega-Lite with compile function, Vega-Embed) failed to load');
                }
                
                // Parse JSON spec
                let spec;
                try {
                    spec = JSON.parse(code);
                } catch (e) {
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
                
                // Wait for DOM update, then render with Vega-Embed
                setTimeout(async () => {
                    const chartElement = document.getElementById(`${id}-chart`);
                    if (chartElement && window.vegaEmbed) {
                        try {
                            await window.vegaEmbed(`#${id}-chart`, spec, {
                                actions: false,
                                renderer: 'svg',
                                theme: document.body.classList.contains('dark-mode') ? 'dark' : 'light'
                            });
                        } catch (embedError) {
                            chartElement.innerHTML = `<div class="diagram-error">Vega-Embed Error: ${embedError.message}</div>`;
                        }
                    } else {
                        // Fallback display
                        if (chartElement) {
                            chartElement.innerHTML = `
                                <div class="diagram-error">
                                    <h4>Vega-Embed library failed to load</h4>
                                    <p>Cannot render Vega-Lite visualization</p>
                                    <p><small>Please check your internet connection and try again</small></p>
                                </div>`;
                        }
                    }
                }, 50);
                
                element.classList.add('vega-rendered');
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">Vega-Lite Error: ${error.message}</div>`;
                element.classList.add('vega-error');
            }
        }
    }

    async processGraphVizDiagrams() {
        const graphvizElements = this.element.querySelectorAll('.graphviz-container:not(.graphviz-rendered)');
        
        for (const element of graphvizElements) {
            const code = decodeURIComponent(element.getAttribute('data-graphviz-code'));
            const id = element.getAttribute('data-graphviz-id');
            const engine = element.getAttribute('data-graphviz-engine') || 'dot';
            
            try {
                // Show loading indicator
                element.innerHTML = this.createLoadingIndicator('GraphViz');
                
                // Load Viz.js library with proper configuration for original viz.js v2.1.2
                if (!window.Viz) {
                    // Try multiple CDN sources for original viz.js
                    const cdnUrls = [
                        'https://unpkg.com/viz.js@2.1.2/viz.js',
                        'https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js'
                    ];
                    
                    let loaded = false;
                    for (const url of cdnUrls) {
                        try {
                            loaded = await window.libraryLoader?.loadScript(url, 'viz.js', () => typeof window.Viz === 'function');
                            if (loaded) break;
                        } catch (e) {
                            console.warn(`Failed to load from ${url}:`, e);
                        }
                    }
                    
                    if (!loaded) {
                        throw new Error('Failed to load Viz.js library from all CDNs');
                    }
                }
                
                // Render GraphViz diagram using sync API
                let svg;
                try {
                    // Use the synchronous Viz.js API
                    if (typeof window.Viz === 'function') {
                        console.log('[GraphViz] Using synchronous Viz.js API');
                        const svgText = window.Viz(code, { format: 'svg', engine: engine });
                        if (svgText && svgText.includes('<svg')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(svgText, 'image/svg+xml');
                            svg = doc.documentElement;
                        } else {
                            throw new Error('Viz.js returned invalid SVG output');
                        }
                    } else {
                        throw new Error('Viz.js function not available');
                    }
                } catch (vizError) {
                    console.error('[GraphViz] Viz.js rendering error:', vizError);
                    throw new Error(`GraphViz rendering failed: ${vizError.message}`);
                }
                
                element.innerHTML = `<div class="graphviz-diagram" id="${id}">
                    <div class="diagram-header">
                        <span class="diagram-type">GraphViz (${engine}) Diagram</span>
                        <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                        <pre class="diagram-source hidden"><code>${code}</code></pre>
                    </div>
                    <div class="diagram-content"></div>
                </div>`;
                
                // Append the SVG element
                const contentDiv = element.querySelector('.diagram-content');
                contentDiv.appendChild(svg);
                
                element.classList.add('graphviz-rendered');
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">
                    <h4>GraphViz Error</h4>
                    <p>${error.message}</p>
                    <p><small>Try using a simpler GraphViz diagram or check the syntax</small></p>
                    <details>
                        <summary>Source Code</summary>
                        <pre><code>${code}</code></pre>
                    </details>
                </div>`;
                element.classList.add('graphviz-error');
            }
        }
    }

    async processAbcNotation() {
        const abcElements = this.element.querySelectorAll('.abc-container:not(.abc-rendered)');
        
        for (const element of abcElements) {
            const code = decodeURIComponent(element.getAttribute('data-abc-code'));
            const id = element.getAttribute('data-abc-id');
            
            try {
                // Show loading indicator
                element.innerHTML = this.createLoadingIndicator('ABC.js Music Notation');
                
                // Load ABC.js library
                if (!window.ABCJS) {
                    const loaded = await window.libraryLoader?.loadScript(
                        'https://paulrosen.github.io/abcjs/dist/abcjs-basic-min.js',
                        'abc.js',
                        () => window.ABCJS !== undefined
                    );
                    
                    if (!loaded) {
                        throw new Error('Failed to load ABCJS library');
                    }
                }
                
                element.innerHTML = `<div class="abc-diagram" id="${id}">
                    <div class="diagram-header">
                        <span class="diagram-type">ABC Music Notation</span>
                        <button class="diagram-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Source</button>
                        <pre class="diagram-source hidden"><code>${code}</code></pre>
                    </div>
                    <div class="diagram-content" id="${id}-notation"></div>
                </div>`;
                
                // Render with ABCJS
                window.ABCJS.renderAbc(`${id}-notation`, code, {
                    responsive: 'resize',
                    scale: 1.0,
                    staffwidth: 740
                });
                
                element.classList.add('abc-rendered');
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">
                    <h4>ABC Notation Error</h4>
                    <p>${error.message}</p>
                    <details>
                        <summary>Source Code</summary>
                        <pre><code>${code}</code></pre>
                    </details>
                </div>`;
                element.classList.add('abc-error');
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
            // Encode to UTF-8 bytes and then to Base64
            const utf8Bytes = new TextEncoder().encode(uml);
            const base64 = btoa(String.fromCharCode(...utf8Bytes));
            
            // PlantUML server expects URL-safe base64
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (error) {
            console.warn('PlantUML encoding error:', error);
            // Fallback to simple base64
            return btoa(unescape(encodeURIComponent(uml)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }
    }

    async renderTikZ(code, isCircuit = false) {
        // TikZ integration placeholder
        // This would integrate with TikZJax or a server-side rendering service
        
        try {
            // For now, return a styled placeholder
            return `<div class="tikz-diagram">
                <div class="diagram-header">
                    <span class="diagram-type">${isCircuit ? 'CircuiTikZ' : 'TikZ'} Diagram</span>
                </div>
                <div class="diagram-content">
                    <pre><code>${code}</code></pre>
                </div>
                <div class="diagram-note">
                    <em>This would render as an actual ${isCircuit ? 'circuit' : 'TikZ'} diagram</em>
                </div>
            </div>`;
        } catch (error) {
            throw new Error(`TikZ rendering failed: ${error.message}`);
        }
    }

    updateInternalLinks() {
        const links = this.element.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    setupCodeCopyButtons() {
        const codeBlocks = this.element.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            const pre = block.parentElement;
            
            // Avoid duplicate buttons
            if (pre.querySelector('.copy-button')) return;
            
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '📋';
            copyButton.title = 'Copy code';
            
            copyButton.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(block.textContent);
                    copyButton.innerHTML = '✅';
                    copyButton.title = 'Copied!';
                    
                    setTimeout(() => {
                        copyButton.innerHTML = '📋';
                        copyButton.title = 'Copy code';
                    }, 2000);
                } catch (error) {
                    console.error('Copy failed:', error);
                }
            });
            
            pre.style.position = 'relative';
            pre.appendChild(copyButton);
        });
    }

    handleLinkClick(e) {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Handle external links
        if (href.startsWith('http://') || href.startsWith('https://')) {
            e.preventDefault();
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.invoke('open-external', href);
            } else {
                window.open(href, '_blank');
            }
        }
        // Internal links are handled by updateInternalLinks
    }

    // Scroll synchronization with robust line-to-element mapping
    rebuildLineElementMap() {
        const editorElement = document.getElementById('editor');
        if (!editorElement) return;
        
        // --- PERFORMANCE FIX: Debounce frequent line mapping rebuilds ---
        const now = Date.now();
        if (now - this.lastLineElementMapRebuild < 100) {
            console.log('[Preview] Skipping line-element map rebuild - too frequent');
            return;
        }
        
        this.lastLineElementMapRebuild = now;
        
        this.lineElementMap.clear();
        const lines = editorElement.value.split('\n');
        const totalLines = lines.length || 1;
        
        // Get ALL preview elements including rendered diagrams and math
        const previewElements = Array.from(this.element.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, p, ul, ol, li, blockquote, pre, table, ' +
            '.mermaid-container, .tikz-container, .markmap-inline-container, ' +
            '.math-display, .math-environment, .plantuml-container, .vega-lite-container, ' +
            '.graphviz-container, .abc-container, .latex-container, .wavedrom-container'
        ));

        console.log(`[Preview] Rebuilding line-element map: ${totalLines} lines, ${previewElements.length} elements`);

        // Create dense mapping: assign multiple lines to each element
        let currentLineIndex = 0;
        const linesPerElement = Math.max(1, Math.floor(totalLines / Math.max(1, previewElements.length)));
        
        for (let i = 0; i < previewElements.length && currentLineIndex < totalLines; i++) {
            const element = previewElements[i];
            
            // Assign this element to multiple consecutive lines for dense mapping
            for (let j = 0; j < linesPerElement && currentLineIndex < totalLines; j++) {
                if (!this.lineElementMap.has(currentLineIndex)) {
                    this.lineElementMap.set(currentLineIndex, element);
                    element.dataset.line = String(currentLineIndex);
                }
                currentLineIndex++;
            }
        }
        
        // Handle remaining lines by assigning to the last element
        if (previewElements.length > 0 && currentLineIndex < totalLines) {
            const lastElement = previewElements[previewElements.length - 1];
            for (let i = currentLineIndex; i < totalLines; i++) {
                if (!this.lineElementMap.has(i)) {
                    this.lineElementMap.set(i, lastElement);
                }
            }
        }

        // Special handling for rendered diagrams - ensure they have line mappings
        const renderedDiagrams = this.element.querySelectorAll(
            '.tikz-rendered, .mermaid-rendered, .markmap-rendered, .plantuml-rendered, ' +
            '.vega-rendered, .graphviz-rendered, .abc-rendered, .latex-rendered'
        );
        
        renderedDiagrams.forEach(diagram => {
            if (!diagram.dataset.line) {
                // Find the closest line that contains diagram-related content
                const diagramLine = this.findDiagramLine(diagram, lines);
                if (diagramLine !== -1) {
                    diagram.dataset.line = String(diagramLine);
                    // Map several lines around the diagram for better sync
                    for (let offset = -2; offset <= 2; offset++) {
                        const lineIdx = diagramLine + offset;
                        if (lineIdx >= 0 && lineIdx < totalLines && !this.lineElementMap.has(lineIdx)) {
                            this.lineElementMap.set(lineIdx, diagram);
                        }
                    }
                }
            }
        });

        this.lastEditorLineCount = totalLines;
        console.log(`[Preview] Built dense line-element map with ${this.lineElementMap.size} mappings for ${totalLines} lines`);

        // Add head/tail anchors for edge cases
        if (previewElements.length > 0) {
            const first = previewElements[0];
            const last = previewElements[previewElements.length - 1];
            
            if (first && !first.dataset.line) first.dataset.line = "0";
            if (last && !last.dataset.line) last.dataset.line = String(totalLines - 1);
            
            // Ensure first and last lines are always mapped
            if (!this.lineElementMap.has(0)) this.lineElementMap.set(0, first);
            if (!this.lineElementMap.has(totalLines - 1)) this.lineElementMap.set(totalLines - 1, last);
        }
    }

    findDiagramLine(diagram, lines) {
        // Try to find the line that contains the diagram code
        const diagramCode = diagram.getAttribute('data-tikz-code') || 
                           diagram.getAttribute('data-mermaid-code') || 
                           diagram.getAttribute('data-markmap-code') || 
                           diagram.getAttribute('data-plantuml-code') ||
                           diagram.getAttribute('data-vega-code') ||
                           diagram.getAttribute('data-graphviz-code') ||
                           diagram.getAttribute('data-abc-code') ||
                           diagram.getAttribute('data-latex-code');
        
        if (!diagramCode) return -1;
        
        const decodedCode = decodeURIComponent(diagramCode);
        const firstLine = decodedCode.split('\n')[0].trim().toLowerCase();
        
        // Search for the first line of the diagram code in the editor
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();
            if (line.includes(firstLine.substring(0, Math.min(20, firstLine.length))) || 
                firstLine.includes(line.substring(0, Math.min(20, line.length)))) {
                return i;
            }
        }
        
        return -1;
    }

    getVisibleLineInEditor(editorElement) {
        try {
            const editorRect = editorElement.getBoundingClientRect();
            const lineHeight = this.getEditorLineHeight(editorElement);
            const scrollTop = editorElement.scrollTop;
            const visibleLine = Math.floor(scrollTop / lineHeight);
            return Math.max(0, visibleLine);
        } catch (error) {
            console.warn('[Preview] Could not determine visible line:', error);
            return -1;
        }
    }

    getEditorLineHeight(editorElement) {
        // Calculate approximate line height
        const style = window.getComputedStyle(editorElement);
        const fontSize = parseFloat(style.fontSize);
        const lineHeight = style.lineHeight;
        
        if (lineHeight === 'normal') {
            return fontSize * 1.2; // Default line height multiplier
        } else if (lineHeight.endsWith('px')) {
            return parseFloat(lineHeight);
        } else if (!isNaN(parseFloat(lineHeight))) {
            return fontSize * parseFloat(lineHeight);
        } else {
            return fontSize * 1.2; // Fallback
        }
    }

    findCorrespondingLine(element, editorElement) {
        console.log('[Preview] Finding corresponding line for element:', element.tagName);
        
        // First check if we have it in our mapping
        for (const [lineIndex, mappedElement] of this.lineElementMap.entries()) {
            if (mappedElement === element) {
                console.log('[Preview] Found in line mapping:', lineIndex);
                return lineIndex;
            }
        }

        // Enhanced fallback: search by content with better matching
        const elementText = element.textContent || '';
        const cleanElementText = elementText.trim().toLowerCase();
        
        console.log('[Preview] Element text for matching:', cleanElementText.substring(0, 50));
        
        if (cleanElementText.length < 2) {
            console.log('[Preview] Element text too short for matching');
            return -1;
        }

        const lines = editorElement.value.split('\n');
        
        // Try different matching strategies
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toLowerCase();
            
            // Strategy 1: Direct substring match
            if (line.length > 2 && cleanElementText.includes(line)) {
                console.log('[Preview] Direct match found at line:', i, 'line:', line.substring(0, 30));
                return i;
            }
            
            // Strategy 2: Header matching
            if (element.tagName.match(/^H[1-6]$/)) {
                const headerMatch = line.match(/^#+\s*(.+)$/);
                if (headerMatch) {
                    const headerText = headerMatch[1].toLowerCase();
                    if (cleanElementText.includes(headerText) || headerText.includes(cleanElementText.substring(0, 20))) {
                        console.log('[Preview] Header match found at line:', i);
                        return i;
                    }
                }
            }
            
            // Strategy 3: First words matching
            const cleanLine = line.replace(/^#+\s*/, '').replace(/^[-*+\d.]\s*/, '').trim();
            if (cleanLine.length > 5) {
                const firstWords = cleanLine.substring(0, Math.min(25, cleanLine.length));
                if (cleanElementText.includes(firstWords)) {
                    console.log('[Preview] First words match found at line:', i);
                    return i;
                }
            }
        }

        console.log('[Preview] No corresponding line found');
        return -1;
    }

    findCorrespondingElement(lineIndex, editorElement) {
        // First check if we have it in our mapping
        if (this.lineElementMap.has(lineIndex)) {
            return this.lineElementMap.get(lineIndex);
        }

        // Fallback: search by content
        const lines = editorElement.value.split('\n');
        if (lineIndex >= lines.length) return null;

        const line = lines[lineIndex].trim();
        const cleanLine = line.replace(/^#+\s*/, '').replace(/^[-*+\d.]\s*/, '').trim().toLowerCase();
        
        if (cleanLine.length < 3) return null;

        const previewElements = Array.from(this.element.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, .math-display, .mermaid-container, .tikz-container'
        ));

        for (const element of previewElements) {
            const elementText = (element.textContent || '').trim().toLowerCase();
            if (elementText.includes(cleanLine.substring(0, Math.min(30, cleanLine.length)))) {
                return element;
            }
        }

        return null;
    }

    scrollEditorToLine(editorElement, lineIndex) {
        try {
            const lineHeight = this.getEditorLineHeight(editorElement);
            const targetScrollTop = lineIndex * lineHeight;
            
            // Position line in top third of viewport (not center) for better visibility
            // This shows more context below the target line
            const editorHeight = editorElement.clientHeight;
            const positionedScrollTop = targetScrollTop - (editorHeight / 3);
            
            // Clamp to valid scroll range
            const maxScrollTop = Math.max(0, editorElement.scrollHeight - editorHeight);
            const finalScrollTop = Math.max(0, Math.min(positionedScrollTop, maxScrollTop));
            
            // CRITICAL: Use instant scroll to prevent oscillation from smooth animation
            // Smooth scrolling triggers multiple events during animation, causing sync loop
            editorElement.scrollTop = finalScrollTop;
            
            // Force reflow to ensure scroll is processed
            void editorElement.offsetHeight;
            
        } catch (error) {
            console.error('[Preview] Error in scrollEditorToLine:', error);
            // Fallback to simple scroll
            const lineHeight = this.getEditorLineHeight(editorElement);
            editorElement.scrollTop = Math.max(0, lineIndex * lineHeight - editorElement.clientHeight / 3);
        }
    }

    scrollPreviewToElement(element) {
        if (!element || !this.element) {
            return;
        }
        
        // CRITICAL FIX: Scroll the preview-container, not the preview content div
        const previewContainer = this.element.parentElement;
        if (!previewContainer || previewContainer.id !== 'preview-container') {
            console.error('[Preview] Could not find preview-container for scrolling');
            return;
        }
        
        try {
            // CRITICAL: Use instant scroll instead of smooth to prevent oscillation
            // Smooth scrolling triggers multiple scroll events during animation
            // which causes the sync to fire repeatedly, creating a feedback loop
            const elementRect = element.getBoundingClientRect();
            const containerRect = previewContainer.getBoundingClientRect();
            const relativeTop = elementRect.top - containerRect.top;
            
            // Position element in top third of viewport (not center) for better visibility
            // This shows more context below the target element
            const targetScrollTop = previewContainer.scrollTop + relativeTop - (previewContainer.clientHeight / 3);
            
            // Clamp to valid range
            const maxScrollTop = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
            
            // Use instant scroll to prevent sync oscillation - scroll the CONTAINER
            previewContainer.scrollTop = finalScrollTop;
            
            // Force reflow to ensure scroll is processed
            void previewContainer.offsetHeight;
            
        } catch (error) {
            console.error('[Preview] Error in scrollPreviewToElement:', error);
            // Fallback - also use instant scroll on container with top-third positioning
            try {
                const elementRect = element.getBoundingClientRect();
                const containerRect = previewContainer.getBoundingClientRect();
                const relativeTop = elementRect.top - containerRect.top;
                const targetScrollTop = previewContainer.scrollTop + relativeTop - (previewContainer.clientHeight / 3);
                const maxScrollTop = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);
                const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
                previewContainer.scrollTop = finalScrollTop;
            } catch (fallbackError) {
                console.error('[Preview] Fallback scroll also failed:', fallbackError);
            }
        }
    }
    
    isSignificantMarkdownLine(line) {
        // Check for headers, list items, code blocks, blockquotes, etc.
        return /^#{1,6}\s/.test(line) ||           // Headers
               /^[-*+]\s/.test(line) ||           // Unordered lists
               /^\d+\.\s/.test(line) ||           // Ordered lists
               /^>\s/.test(line) ||               // Blockquotes
               /^```/.test(line) ||               // Code blocks
               /^\|/.test(line) ||                // Tables
               /^\$\$/.test(line) ||              // Math blocks
               (line.length > 10 && !/^[-*+\d\s>|#`]/.test(line)); // Regular paragraphs
    }
    
    doesLineMatchElement(line, element) {
        if (!element) return false;
        
        const elementText = element.textContent || '';
        const cleanElementText = elementText.trim().toLowerCase();
        const cleanLine = line.replace(/^#+\s*/, '').replace(/^[-*+\d.]\s*/, '').trim().toLowerCase();
        
        // For headers, check if the text matches
        if (/^#{1,6}\s/.test(line)) {
            return cleanElementText.includes(cleanLine) || cleanLine.includes(cleanElementText);
        }
        
        // For other elements, check if line content appears in element
        if (cleanLine.length > 5) {
            return cleanElementText.includes(cleanLine.substring(0, Math.min(50, cleanLine.length)));
        }
        
        return false;
    }

    syncScrollToEditor() {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !this.scrollSyncEnabled) {
            return;
        }
        
        try {
            this.isScrolling = true;
            
            // Get the actual scrollable container (not this.element which is #preview)
            const previewContainer = this.element.parentElement; // #preview-container
            if (!previewContainer || previewContainer.id !== 'preview-container') {
                console.error('[Preview] Cannot find preview-container for scroll sync');
                this.isScrolling = false;
                return;
            }
            
            // Get preview scroll position from the scrollable container
            const previewScrollTop = previewContainer.scrollTop;
            const previewScrollHeight = previewContainer.scrollHeight;
            const previewClientHeight = previewContainer.clientHeight;
            
            console.log('[Preview] Preview container scroll - top:', previewScrollTop, 'height:', previewScrollHeight, 'client:', previewClientHeight);
            
            // Find the most visible element in preview
            const previewRect = previewContainer.getBoundingClientRect();
            const visibleElements = Array.from(this.element.querySelectorAll(
                'h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, table, .math-display, .mermaid-container, .tikz-container'
            )).filter(el => {
                const rect = el.getBoundingClientRect();
                const isVisible = rect.bottom > previewRect.top && rect.top < previewRect.bottom;
                if (isVisible) {
                    console.log('[Preview] Visible element:', el.tagName, el.textContent.substring(0, 30));
                }
                return isVisible;
            });

            console.log('[Preview] Found', visibleElements.length, 'visible elements');

            if (visibleElements.length > 0) {
                // Choose element whose midpoint is closest to viewport center for stability
                const viewportMid = previewRect.top + (previewRect.height / 2);
                let best = null; let bestDist = Infinity;
                for (const el of visibleElements) {
                    const r = el.getBoundingClientRect();
                    const mid = (r.top + r.bottom) / 2;
                    const dist = Math.abs(mid - viewportMid);
                    if (dist < bestDist) { best = el; bestDist = dist; }
                }
                if (best) {
                    let lineFromDataset = -1;
                    if (best.dataset && best.dataset.line) {
                        const parsed = parseInt(best.dataset.line, 10);
                        if (!isNaN(parsed)) lineFromDataset = parsed;
                    }
                    let correspondingLine = lineFromDataset;
                    if (correspondingLine === -1) {
                        correspondingLine = this.findCorrespondingLine(best, editorElement);
                    }
                    if (correspondingLine !== -1) {
                        console.log('[Preview] Scrolling editor to line:', correspondingLine);
                        this.scrollEditorToLine(editorElement, correspondingLine);
                        // Reduced timeout for better responsiveness
                        setTimeout(() => { this.isScrolling = false; }, 50);
                        return;
                    }
                }
            }
            
            // Fallback: Use proportional scrolling
            console.log('[Preview] Using proportional scrolling fallback');
            const previewScrollRatio = previewScrollTop / Math.max(1, previewScrollHeight - previewClientHeight);
            const editorMaxScroll = Math.max(0, editorElement.scrollHeight - editorElement.clientHeight);
            const targetScrollTop = Math.round(previewScrollRatio * editorMaxScroll);
            
            console.log('[Preview] Proportional sync - ratio:', previewScrollRatio, 'target:', targetScrollTop);
            
            editorElement.scrollTop = Math.max(0, Math.min(targetScrollTop, editorMaxScroll));
            // Reduced timeout for better responsiveness
            setTimeout(() => { this.isScrolling = false; }, 50);
            
        } catch (error) {
            console.error('[Preview] Error in syncScrollToEditor:', error);
            this.isScrolling = false;
        }
    }

    syncScrollFromEditor() {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !this.scrollSyncEnabled) return;
        
        // CRITICAL FIX: Get the actual scrollable container
        const previewContainer = this.element.parentElement;
        if (!previewContainer || previewContainer.id !== 'preview-container') {
            console.error('[Preview] Cannot find preview-container for sync');
            return;
        }
        
        try {
            this.isScrolling = true;
            
            // Get current editor cursor position or visible line
            const visibleLine = this.getVisibleLineInEditor(editorElement);
            
            if (visibleLine !== -1) {
                // Only log occasionally to avoid spam
                if (this.lastLoggedLine !== visibleLine && (this.lastLoggedLine === undefined || Math.abs(this.lastLoggedLine - visibleLine) >= 10)) {
                    console.log('[Preview] Editor sync - visible line:', visibleLine);
                    this.lastLoggedLine = visibleLine;
                }
                
                // Find corresponding element in preview
                const correspondingElement = this.findCorrespondingElement(visibleLine, editorElement);
                
                if (correspondingElement) {
                    // Only log when we actually find a corresponding element
                    if (this.lastScrollLogTime === undefined || Date.now() - this.lastScrollLogTime > 1000) {
                        console.log('[Preview] Found corresponding element, scrolling preview');
                        this.lastScrollLogTime = Date.now();
                    }
                    this.scrollPreviewToElement(correspondingElement);
                } else {
                    // Fallback to proportional sync - FIXED: use previewContainer
                    const editorScrollRatio = editorElement.scrollTop / (editorElement.scrollHeight - editorElement.clientHeight || 1);
                    const previewMaxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
                    const targetScrollTop = Math.round(editorScrollRatio * previewMaxScroll);
                    previewContainer.scrollTop = Math.max(0, Math.min(targetScrollTop, previewMaxScroll));
                }
            } else {
                // Fallback to proportional sync - FIXED: use previewContainer
                const editorScrollRatio = editorElement.scrollTop / (editorElement.scrollHeight - editorElement.clientHeight || 1);
                const previewMaxScroll = previewContainer.scrollHeight - previewContainer.clientHeight;
                const targetScrollTop = Math.round(editorScrollRatio * previewMaxScroll);
                previewContainer.scrollTop = Math.max(0, Math.min(targetScrollTop, previewMaxScroll));
            }
            
            // Reduced timeout for better responsiveness (was 200ms, now 50ms)
            setTimeout(() => { this.isScrolling = false; }, 50);
        } catch (error) {
            console.error('[Preview] Scroll sync from editor error:', error);
            this.isScrolling = false;
        }
    }

    updateScrollSync() {
        // --- PERFORMANCE FIX: Debounce line-element map rebuilds ---
        this.debouncedRebuildLineElementMap();
    }
    
    debouncedRebuildLineElementMap() {
        // Clear existing timeout
        if (this.lineElementMapRebuildDebounceTimeout) {
            clearTimeout(this.lineElementMapRebuildDebounceTimeout);
        }
        
        // Set new timeout for debounced rebuild - increased delay for better performance
        this.lineElementMapRebuildDebounceTimeout = setTimeout(() => {
            if (this.syncScroll) {
                this.rebuildLineElementMap();
            }
        }, 300); // Increased from 150ms to 300ms to reduce rebuild frequency
    }

    // Debounced scroll sync methods for performance
    debouncedSyncScrollFromEditor() {
        // CRITICAL FIX: Use separate timeout variable for editor→preview direction
        if (this.scrollSyncFromEditorTimeout) {
            clearTimeout(this.scrollSyncFromEditorTimeout);
        }
        
        this.scrollSyncFromEditorTimeout = setTimeout(() => {
            if (this.scrollSyncEnabled && !this.isScrolling) {
                // Let syncScrollFromEditor handle isScrolling flag internally
                // Do NOT set it here - that creates a race condition with the internal timeout
                this.syncScrollFromEditor();
            }
        }, this.scrollSyncDelay);
    }
    
    debouncedSyncScrollToEditor() {
        // PERFORMANCE FIX: Reduce logging frequency and improve debounce logic
        const now = Date.now();
        const shouldLog = this.lastLoggedSyncTime === undefined || now - this.lastLoggedSyncTime > 1000;
        if (shouldLog) {
            console.log('[Preview] debouncedSyncScrollToEditor called');
            this.lastLoggedSyncTime = now;
        }
        
        // CRITICAL FIX: Use separate timeout variable for preview→editor direction
        if (this.scrollSyncToEditorTimeout) {
            clearTimeout(this.scrollSyncToEditorTimeout);
        }
        
        this.scrollSyncToEditorTimeout = setTimeout(() => {
            if (shouldLog) {
                console.log('[Preview] debouncedSyncScrollToEditor timeout executing');
            }
            if (this.scrollSyncEnabled && !this.isScrolling) {
                // Don't set isScrolling here - let syncScrollToEditor handle it
                this.syncScrollToEditor();
            } else if (shouldLog) {
                console.log('[Preview] debouncedSyncScrollToEditor skipped - scrollSyncEnabled:', this.scrollSyncEnabled, 'isScrolling:', this.isScrolling);
            }
        }, this.scrollSyncDelay);
    }

    // Loading and error states
    showLoading() {
        this.element.innerHTML = `
            <div class="preview-loading">
                <div class="loading-spinner"></div>
                <p>Rendering preview...</p>
            </div>
        `;
    }

    createLoadingIndicator(libraryName) {
        return `
            <div class="diagram-loading">
                <div class="loading-spinner"></div>
                <p>Loading ${libraryName}...</p>
                <p><small>This may take a moment on first use</small></p>
            </div>
        `;
    }

    showError(message) {
        this.element.innerHTML = `
            <div class="preview-error">
                <h3>Preview Error</h3>
                <p>${message}</p>
                <p>Please check your markdown syntax and try again.</p>
            </div>
        `;
    }

    dispatchUpdateEvent() {
        const event = new CustomEvent('preview-updated', {
            detail: {
                element: this.element,
                timestamp: Date.now()
            }
        });
        document.dispatchEvent(event);
    }

    // Export functionality
    async exportAsHTML(options = {}) {
        // Wait for MathJax rendering to complete before exporting
        const waitForMathJax = () => new Promise((resolve) => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(() => resolve()).catch(() => resolve());
            } else {
                resolve();
            }
        });

        await waitForMathJax();

        // Clone the preview DOM to avoid mutation
        const previewClone = this.element.cloneNode(true);

        // Remove KityMinder interactive controls from export (View JSON, Edit buttons, and diagram headers)
        const kityMinderHeaders = previewClone.querySelectorAll('.kityminder-diagram .diagram-header');
        kityMinderHeaders.forEach(header => header.remove());

        // Ensure all inline/display math is rendered as SVG (handle both $...$ and \(...\))
        const mathElements = previewClone.querySelectorAll('.math-inline, .math-display');
        for (const el of Array.from(mathElements)) {
            // If MathJax or KaTeX already rendered this element, skip re-rendering.
            try {
                if (el.querySelector('mjx-container') || el.querySelector('.katex')) {
                    continue;
                }

                const originalMath = decodeURIComponent(el.getAttribute('data-original-math') || '');
                el.innerHTML = '';

                if (window.MathJax) {
                    // Prefer synchronous helper if available, otherwise use promise-based
                    if (typeof window.MathJax.tex2svgSync === 'function') {
                        try {
                            const node = window.MathJax.tex2svgSync(originalMath, { display: el.classList.contains('math-display') });
                            el.appendChild(node);
                        } catch (e) {
                            el.textContent = originalMath;
                        }
                    } else if (typeof window.MathJax.tex2svgPromise === 'function') {
                        try {
                            const node = await window.MathJax.tex2svgPromise(originalMath, { display: el.classList.contains('math-display') });
                            el.appendChild(node);
                        } catch (e) {
                            el.textContent = originalMath;
                        }
                    } else {
                        el.textContent = originalMath;
                    }
                } else {
                    el.textContent = originalMath;
                }
            } catch (e) {
                // Defensive: if anything goes wrong for this element, fall back to text
                try { el.textContent = el.textContent || ''; } catch (_) {}
            }
        }

        // Ensure MathJax/KaTeX SVGs are explicitly visible by setting fill/stroke
        try { this._forceMathSvgBlack(previewClone); } catch (e) { console.warn('[Preview] _forceMathSvgBlack failed on clone:', e); }
        // Ensure MathJax SVG <defs> (font/glyph defs) are inlined so exported SVGs are self-contained
        try { this._inlineMathJaxSVGDefs(previewClone); } catch (e) { console.warn('[Preview] _inlineMathJaxSVGDefs failed on clone:', e); }

        // Serialize the cloned DOM to HTML and wrap in export template
        const htmlContent = previewClone.outerHTML;
        const title = options.title || this.getCurrentFileName();
        const doc = this.createHTMLDocument(htmlContent, title);

        // Sanitize final doc to remove any remaining currentColor references
        const sanitizedDoc = this._sanitizeExportHtmlString(doc);
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('export-html', {
                html: sanitizedDoc,
                fileName: title.replace(/\.md$/, '.html')
            });
            if (result && result.success) {
                console.log('HTML exported successfully:', result.filePath);
                return result.filePath;
            }
        }
        return sanitizedDoc;
    }

    async exportAsPDF(options = {}) {
        // Wait for MathJax rendering to complete before exporting
        const waitForMathJax = () => new Promise((resolve) => {
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise().then(() => resolve()).catch(() => resolve());
            } else {
                resolve();
            }
        });

        await waitForMathJax();

        // Clone the preview DOM to avoid mutation
        const previewClone = this.element.cloneNode(true);

        // Remove KityMinder interactive controls from export (View JSON, Edit buttons, and diagram headers)
        const kityMinderHeaders = previewClone.querySelectorAll('.kityminder-diagram .diagram-header');
        kityMinderHeaders.forEach(header => header.remove());

        // Ensure all inline/display math is rendered as SVG (handle both $...$ and \(...\))
        const mathElements = previewClone.querySelectorAll('.math-inline, .math-display');
        for (const el of Array.from(mathElements)) {
            // If MathJax or KaTeX already rendered this element, skip re-rendering.
            try {
                if (el.querySelector('mjx-container') || el.querySelector('.katex')) {
                    continue;
                }

                const originalMath = decodeURIComponent(el.getAttribute('data-original-math') || '');
                el.innerHTML = '';

                if (window.MathJax) {
                    if (typeof window.MathJax.tex2svgSync === 'function') {
                        try {
                            const node = window.MathJax.tex2svgSync(originalMath, { display: el.classList.contains('math-display') });
                            el.appendChild(node);
                        } catch (e) {
                            el.textContent = originalMath;
                        }
                    } else if (typeof window.MathJax.tex2svgPromise === 'function') {
                        try {
                            const node = await window.MathJax.tex2svgPromise(originalMath, { display: el.classList.contains('math-display') });
                            el.appendChild(node);
                        } catch (e) {
                            el.textContent = originalMath;
                        }
                    } else {
                        el.textContent = originalMath;
                    }
                } else {
                    el.textContent = originalMath;
                }
            } catch (e) {
                try { el.textContent = el.textContent || ''; } catch (_) {}
            }
        }

        // Ensure MathJax/KaTeX SVGs are explicitly visible by setting fill/stroke
        try { this._forceMathSvgBlack(previewClone); } catch (e) { console.warn('[Preview] _forceMathSvgBlack failed on clone:', e); }
        // Ensure MathJax SVG <defs> (font/glyph defs) are inlined so exported SVGs are self-contained
        try { this._inlineMathJaxSVGDefs(previewClone); } catch (e) { console.warn('[Preview] _inlineMathJaxSVGDefs failed on clone:', e); }

        // Serialize the cloned DOM to HTML and wrap in export template
        const htmlContent = previewClone.outerHTML;
        const title = this.getCurrentFileName();
        const doc = this.createHTMLDocument(htmlContent, title);

        // Sanitize final doc to remove any remaining currentColor references
        const sanitizedDoc = this._sanitizeExportHtmlString(doc);
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('export-pdf', {
                html: sanitizedDoc,
                fileName: title.replace(/\.md$/, '.pdf')
            });
            if (result && result.success) {
                console.log('PDF exported successfully:', result.filePath);
                return result.filePath;
            } else if (result && result.error) {
                throw new Error(result.error);
            }
        }
        return sanitizedDoc;
    }

    // debugExportSample removed - use manual exportAsHTML() or the UI export workflow

    createHTMLDocument(content, title) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
    <link rel="stylesheet" href="https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.css">
    
    <!-- MathJax Configuration and Scripts -->
    <script>
        window.MathJax = {
            tex: {
                // Export requirement: DO NOT process inline math in exported HTML.
                // Leave inlineMath empty so only display math is handled during export.
                inlineMath: [],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                packages: ['base', 'ams', 'noerrors', 'noundefined', 'mhchem']
            },
            asciimath: {
                delimiters: []  // No auto-processing in exports
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process'
            },
            chtml: {
                scale: 1.0,
                minScale: 0.5,
                matchFontHeight: false,
                displayAlign: 'center',
                displayIndent: '0em'
            },
            loader: {
                load: ['[tex]/mhchem']
            }
        };
    </script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@4/es5/tex-chtml.js"></script>
    
    <script src="https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js"></script>
    <script src="https://unpkg.com/d3@7/dist/d3.min.js"></script>
    <script src="https://unpkg.com/markmap-lib@0.15.0/dist/browser/index.min.js"></script>
    <script src="https://unpkg.com/markmap-view@0.15.0/dist/browser/index.min.js"></script>
    <script src="https://tikzjax.com/v1/tikzjax.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: #fff;
        }
        
        /* Math rendering styles */
        .math-display, .math-environment {
            margin: 1em 0;
            text-align: center;
            overflow-x: auto;
        }
        
        .math-inline {
            display: inline;
        }
        
        .math-error {
            color: #cc0000;
            background: #fff3f3;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            border: 1px solid #ffcdd2;
        }
        
        /* Diagram containers */
        .mermaid-container, .markmap-inline-container, .tikz-container,
        .plantuml-container, .vega-lite-container, .graphviz-container {
            margin: 1em 0;
            padding: 1em;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #fafbfc;
        }
        
        .diagram-error {
            color: #cc0000;
            background: #fff3f3;
            padding: 1em;
            border-radius: 4px;
            border: 1px solid #ffcdd2;
        }
        
        /* Code block improvements */
        pre {
            background: #f6f8fa;
            border-radius: 6px;
            padding: 16px;
            overflow-x: auto;
        }
        
        code {
            background: #f6f8fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
        }
        
        /* Table improvements */
        table {
            border-collapse: collapse;
            margin: 1em 0;
            width: 100%;
        }
        
        th, td {
            border: 1px solid #d0d7de;
            padding: 6px 13px;
            text-align: left;
        }
        
        th {
            background: #f6f8fa;
            font-weight: 600;
        }
        
        /* Text highlighting and formatting */
        mark {
            background: #fff3cd;
            color: #856404;
            padding: 2px 4px;
            border-radius: 3px;
            font-weight: 500;
        }
        
        del {
        }
        
        /* Hide interactive elements in export */
        .copy-button, .copy-code-btn, .diagram-toggle, 
        .fallback-toggle, .export-btn { 
            display: none !important; 
        }
        
        /* Ensure proper spacing */
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        
        h1:first-child {
            margin-top: 0;
        }
        
        p, ul, ol, blockquote {
            margin: 1em 0;
        }
        
        @media print {
            body { 
                margin: 0; 
                padding: 20px;
                font-size: 12pt;
                line-height: 1.4;
            }
            
            .math-display, .math-environment {
                break-inside: avoid;
            }
            
            pre, .diagram-container {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${content}
    
    <script>
        // Initialize rendering after page load
        document.addEventListener('DOMContentLoaded', function() {
            // Since content is already pre-rendered with MathJax, no re-processing needed
            // MathJax markup should display correctly with the loaded scripts
            
            // Initialize syntax highlighting
            if (typeof hljs !== 'undefined') {
                hljs.highlightAll();
            }
            
            // Initialize Mermaid diagrams
            if (typeof mermaid !== 'undefined') {
                mermaid.initialize({
                    startOnLoad: true,
                    theme: 'default',
                    securityLevel: 'loose'
                });
            }
            
            // Initialize TikZ diagrams
            if (typeof tikzjax !== 'undefined') {
                setTimeout(() => {
                    if (window.tikzjax && window.tikzjax.process) {
                        window.tikzjax.process();
                    }
                }, 100);
            }
            
            // Initialize Markmap diagrams
            if (typeof markmap !== 'undefined' && typeof d3 !== 'undefined') {
                const markmapContainers = document.querySelectorAll('.markmap-inline-container');
                markmapContainers.forEach(container => {
                    const code = decodeURIComponent(container.getAttribute('data-markmap-code') || '');
                    const id = container.getAttribute('data-markmap-id');
                    if (code && id) {
                        try {
                            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                            svg.id = id;
                            svg.style.width = '100%';
                            svg.style.height = '300px';
                            container.innerHTML = '';
                            container.appendChild(svg);
                            
                            const { root } = markmap.transform(code);
                        // Signal to the embedding process that MathJax has finished typesetting.
                        // This sets a deterministic global flag window.__MATHJAX_DONE = true which
                        // the main process will poll to know when it is safe to print to PDF.
                        try {
                            if (window.MathJax) {
                                const setDone = () => { try { window.__MATHJAX_DONE = true; } catch (e) {} };
                                if (window.MathJax.startup && window.MathJax.startup.promise) {
                                    window.MathJax.startup.promise.then(() => {
                                        if (window.MathJax.typesetPromise) {
                                            window.MathJax.typesetPromise().then(setDone).catch(setDone);
                                        } else {
                                            setDone();
                                        }
                                    }).catch(setDone);
                                } else if (window.MathJax.typesetPromise) {
                                    window.MathJax.typesetPromise().then(setDone).catch(setDone);
                                } else {
                                    // Fallback: set done after a short delay
                                    setTimeout(setDone, 300);
                                }
                            } else {
                                // No MathJax on the page: mark done immediately
                                window.__MATHJAX_DONE = true;
                            }
                        } catch (e) {
                            try { window.__MATHJAX_DONE = true; } catch (e) {}
                        }
                            markmap.Markmap.create(svg, null, root);
                        } catch (error) {
                            container.innerHTML = '<div class="diagram-error">Markmap Error: ' + error.message + '</div>';
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>`;
    }

    getCurrentFileName() {
        const editorStatus = document.getElementById('file-status');
        if (editorStatus) {
            const fileName = editorStatus.textContent.replace(' •', '');
            return fileName !== 'No file' ? fileName : 'Untitled.md';
        }
        return 'Untitled.md';
    }

    /*
     * Ensure MathJax/KaTeX SVGs are visible in exported HTML by setting explicit
     * fill/stroke attributes and ensuring color isn't inherited as white.
     * This operates on a DOM node (root) and is intentionally conservative.
     */
    _forceMathSvgBlack(root) {
        if (!root) return;
        // Find mjx-container and katex SVGs
        const containers = root.querySelectorAll ? Array.from(root.querySelectorAll('mjx-container, .katex')) : [];
        containers.forEach(container => {
            // Set inline style color to black to be safe
            try {
                container.style.color = '#000';
            } catch (e) {}
            // For any SVG descendants, set fill/stroke attributes directly
            const svgs = Array.from(container.querySelectorAll('svg'));
            svgs.forEach(svg => {
                // Set inline style on svg
                try { svg.style.color = '#000'; } catch (e) {}
                // For all path/text/g elements set attributes where applicable
                const elems = Array.from(svg.querySelectorAll('*'));
                elems.forEach(el => {
                    try {
                        if (el.hasAttribute && el.hasAttribute('fill') && el.getAttribute('fill') === 'currentColor') {
                            el.setAttribute('fill', '#000');
                        }
                        if (el.hasAttribute && el.hasAttribute('stroke') && el.getAttribute('stroke') === 'currentColor') {
                            el.setAttribute('stroke', '#000');
                        }
                        // Also defensively set style properties
                        if (el.style) {
                            el.style.fill = el.style.fill || '#000';
                            el.style.stroke = el.style.stroke || '#000';
                            // text elements sometimes need fill
                            if (el.tagName && el.tagName.toLowerCase() === 'text') el.style.fill = '#000';
                        }
                    } catch (e) {
                        // ignore individual element failures
                    }
                });
            });
        });
    }

    /**
     * Inline MathJax SVG <defs> (font/glyph definitions) into exported SVGs
     * so that <use xlink:href="#..."> references resolve in the exported document.
     * This is conservative: it looks for an existing <defs> in the live document
     * (under a mjx-container svg or any svg defs) and clones it into each math SVG
     * inside the export root when missing.
     */
    _inlineMathJaxSVGDefs(root) {
        if (!root || !root.querySelectorAll) return;
        try {
            const svgs = Array.from(root.querySelectorAll('mjx-container svg'));
            if (!svgs.length) return;

            // Try to find a <defs> in the live document that MathJax created
            let defsElem = document.querySelector('mjx-container svg defs') || document.querySelector('svg defs');
            if (!defsElem) {
                // No defs found in live document; try to find any defs inside an mjx-container in the preview
                const liveMjx = document.querySelector('mjx-container');
                if (liveMjx) defsElem = liveMjx.querySelector('svg defs');
            }
            if (!defsElem) return; // nothing reliable to inline

            const defsHtml = defsElem.outerHTML;

            svgs.forEach(svg => {
                if (!svg.querySelector('defs')) {
                    try { svg.insertAdjacentHTML('afterbegin', defsHtml); } catch (e) { /* ignore insert failures */ }
                }
            });
        } catch (e) {
            console.warn('[Preview] _inlineMathJaxSVGDefs error:', e);
        }
    }

    /* Sanitize exported HTML string to avoid remaining 'currentColor' references
     * This performs a conservative, focused replacement only for export output.
     */
    _sanitizeExportHtmlString(html) {
        if (!html || typeof html !== 'string') return html;
        try {
            // Replace attribute uses first (fill/currentColor, stroke/currentColor)
            html = html.replace(/(fill=\")[\s]*currentColor(\")/gi, 'fill="#000"');
            html = html.replace(/(fill=\')\s*currentColor(\')/gi, "fill='#000'");
            html = html.replace(/(stroke=\")[\s]*currentColor(\")/gi, 'stroke="#000"');
            html = html.replace(/(stroke=\')\s*currentColor(\')/gi, "stroke='#000'");
            // Replace unquoted usages (rare) and style occurrences
            html = html.replace(/fill=\s*currentColor/gi, 'fill="#000"');
            html = html.replace(/stroke=\s*currentColor/gi, 'stroke="#000"');
            // Replace inline style occurrences of currentColor
            html = html.replace(/currentColor/gi, '#000');
            return html;
        } catch (e) {
            console.warn('[Preview] _sanitizeExportHtmlString failed:', e);
            return html;
        }
    }

    // Public API
    setLivePreview(enabled) {
        this.isLivePreview = enabled;
        if (enabled) {
            // Trigger immediate update using debounced method
            const content = document.getElementById('editor').value;
            this.debounceUpdate(content);
        }
    }

    setSyncScroll(enabled) {
        console.log('[Preview] setSyncScroll called with:', enabled);
        this.syncScroll = enabled;
        this.scrollSyncEnabled = enabled;  // Fix: sync both properties
        console.log('[Preview] Scroll sync state updated - syncScroll:', this.syncScroll, 'scrollSyncEnabled:', this.scrollSyncEnabled);
    }

    toggleLivePreview() {
        this.setLivePreview(!this.isLivePreview);
        return this.isLivePreview;
    }

    toggleSyncScroll() {
        console.log('[Preview] toggleSyncScroll called - current state:', this.syncScroll);
        this.setSyncScroll(!this.syncScroll);
        console.log('[Preview] toggleSyncScroll completed - new state:', this.syncScroll);
        return this.syncScroll;
    }

    isLivePreviewEnabled() {
        return this.isLivePreview;
    }

    isSyncScrollEnabled() {
        return this.scrollSyncEnabled;  // Fix: return the property used by event listeners
    }

    async processLatexDocuments() {
        const latexElements = this.element.querySelectorAll('.latex-container:not(.latex-rendered)');
        
        for (const element of latexElements) {
            const code = decodeURIComponent(element.getAttribute('data-latex-code'));
            const id = element.getAttribute('data-latex-id');
            try {
                // Try to load LaTeX.js dynamically if missing
                if (!window.LaTeX) {
                    const loaded = await window.libraryLoader?.loadScript(
                        'https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js',
                        'LaTeX',
                        () => window.LaTeX !== undefined
                    );
                    if (!loaded) throw new Error('LaTeX.js library failed to load. Please check your internet connection or plugin settings.');
                }
                
                // FIXED: Check for correct LaTeX.js API
                if (window.LaTeX && window.LaTeX.parse && typeof window.LaTeX.parse === 'function') {
                    // Create a LaTeX document generator
                    const generator = new window.LaTeX.HtmlGenerator({ 
                        hyphenate: false,
                        width: '100%'
                    });
                    // Parse and render the LaTeX document
                    const doc = window.LaTeX.parse(code, { generator: generator });
                    const html = doc.render();
                    element.innerHTML = `<div class="latex-document">${html}</div>`;
                    element.classList.add('latex-rendered');
                } else if (window.LaTeX && window.LaTeX.render && typeof window.LaTeX.render === 'function') {
                    // Try alternative LaTeX.js API
                    const html = window.LaTeX.render(code, { display: false });
                    element.innerHTML = `<div class="latex-document">${html}</div>`;
                    element.classList.add('latex-rendered');
                } else {
                    // Fallback when LaTeX.js is not available or API is different
                    element.innerHTML = `
                        <div class="diagram-fallback latex-fallback">
                            <div class="fallback-header">
                                <span class="diagram-type">LaTeX Document</span>
                                <button class="fallback-toggle" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Source</button>
                                <pre class="fallback-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="fallback-content">
                                <p>📄 LaTeX document would render here</p>
                                <p><small>LaTeX.js library API incompatible or unavailable</small></p>
                            </div>
                        </div>
                    `;
                    element.classList.add('latex-fallback');
                }
            } catch (error) {
                console.error('[Preview] LaTeX rendering error:', error);
                element.innerHTML = `
                    <div class="diagram-error">
                        <strong>LaTeX Error:</strong> ${error.message}
                        <details>
                            <summary>Show source</summary>
                            <pre><code>${code}</code></pre>
                        </details>
                    </div>
                `;
                element.classList.add('latex-error');
            }
        }
    }
    
    /**
     * Process editable mindmap images with embedded JSON metadata
     * Adds edit button overlay on hover for mindmaps with metadata
     */
    async processEditableMindmaps() {
        console.log('[Preview] Processing editable mindmaps...');
        
        // Find all images in the preview (search for common mindmap alt text patterns)
        const images = this.element.querySelectorAll('img[alt*="Mind Map"], img[alt*="mindmap"], img[alt*="KityMinder"]');
        
        console.log(`[Preview] Found ${images.length} potential mindmap images`);
        
        if (images.length === 0) {
            console.log('[Preview] No mindmap images found');
            return;
        }
        
        images.forEach((img, index) => {
            console.log(`[Preview] Processing image ${index + 1}/${images.length}`, {
                alt: img.alt,
                src: img.src.substring(0, 50) + '...'
            });
            
            // Check if already wrapped with edit overlay
            if (img.parentElement?.classList.contains('mindmap-editable-wrapper')) {
                console.log('[Preview] Image already has edit overlay, skipping');
                return;
            }
            
            // Look for mindmap-data in the source HTML by checking the raw innerHTML
            // The comment should be present in the parent container's HTML
            let mindmapData = null;
            
            // Search through parent and sibling nodes to find the comment
            let parentContainer = img.parentElement;
            if (parentContainer) {
                // Get the raw HTML which should contain the comment
                const parentHTML = parentContainer.innerHTML;
                console.log('[Preview] Parent HTML sample:', parentHTML.substring(0, 200));
                
                // Use regex to extract mindmap-data comment
                const commentMatch = parentHTML.match(/<!--\s*mindmap-data:([^-]+)-->/);
                if (commentMatch && commentMatch[1]) {
                    try {
                        const encodedJson = commentMatch[1].trim();
                        console.log('[Preview] Found encoded JSON in comment, length:', encodedJson.length);
                        
                        // Decode base64 and URI encoding
                        const decodedJson = decodeURIComponent(escape(atob(encodedJson)));
                        console.log('[Preview] Decoded JSON length:', decodedJson.length);
                        
                        mindmapData = decodedJson;
                        console.log('[Preview] Successfully extracted mindmap metadata');
                    } catch (error) {
                        console.error('[Preview] Failed to decode mindmap data:', error);
                    }
                }
            }
            
            // Alternative: Check previous siblings more thoroughly
            if (!mindmapData) {
                let current = img.previousSibling;
                let searchDepth = 0;
                const maxSearchDepth = 10;
                
                while (current && searchDepth < maxSearchDepth) {
                    if (current.nodeType === Node.COMMENT_NODE) {
                        const commentText = current.textContent.trim();
                        console.log(`[Preview] Found comment node:`, commentText.substring(0, 50) + '...');
                        
                        if (commentText.startsWith('mindmap-data:')) {
                            try {
                                const encodedJson = commentText.substring('mindmap-data:'.length).trim();
                                const decodedJson = decodeURIComponent(escape(atob(encodedJson)));
                                mindmapData = decodedJson;
                                console.log('[Preview] Successfully extracted mindmap metadata from sibling');
                                break;
                            } catch (error) {
                                console.error('[Preview] Failed to decode mindmap data:', error);
                            }
                        }
                    }
                    current = current.previousSibling;
                    searchDepth++;
                }
            }
            
            // If mindmap data found, add edit overlay
            if (mindmapData) {
                console.log('[Preview] Adding edit overlay to mindmap image');
                this.addEditOverlayToMindmap(img, mindmapData);
            } else {
                console.log('[Preview] No mindmap metadata found for image');
            }
        });
        
        console.log('[Preview] Finished processing editable mindmaps');
    }
    
    /**
     * Add edit overlay to a mindmap image
     * @param {HTMLImageElement} img - The mindmap image element
     * @param {string} mindmapData - The JSON mindmap data
     */
    addEditOverlayToMindmap(img, mindmapData) {
        // Check if overlay already exists
        if (img.parentElement?.classList.contains('mindmap-editable-wrapper')) {
            return;
        }
        
        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'mindmap-editable-wrapper';
        wrapper.style.cssText = `
            position: relative;
            display: inline-block;
            margin: 1em 0;
            max-width: 100%;
        `;
        
        // Create edit overlay
        const overlay = document.createElement('div');
        overlay.className = 'mindmap-edit-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(37, 99, 235, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s ease;
            cursor: pointer;
            backdrop-filter: blur(1px);
            -webkit-backdrop-filter: blur(1px);
        `;
        
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'mindmap-edit-button';
        editButton.innerHTML = '✏️ Edit Mind Map';
        editButton.style.cssText = `
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
            transition: all 0.2s ease;
        `;
        
        overlay.appendChild(editButton);
        
        // Show overlay on hover
        wrapper.addEventListener('mouseenter', () => {
            overlay.style.opacity = '1';
        });
        
        wrapper.addEventListener('mouseleave', () => {
            overlay.style.opacity = '0';
        });
        
        // Handle click to open editor
        overlay.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openMindmapEditor(mindmapData);
        });
        
        // Wrap the image
        img.parentNode.insertBefore(wrapper, img);
        wrapper.appendChild(img);
        wrapper.appendChild(overlay);
        
        console.log('[Preview] Added edit overlay to mindmap');
    }
    
    /**
     * Open KityMinder editor with existing mindmap data
     * @param {string} mindmapData - The JSON mindmap data
     */
    openMindmapEditor(mindmapData) {
        console.log('[Preview] Opening mindmap editor with existing data');
        
        // Check if KityMinder integration is available
        if (!window.kityMinderIntegration) {
            console.error('[Preview] KityMinder integration not available');
            alert('KityMinder editor is not available. Please ensure the editor is properly initialized.');
            return;
        }
        
        // Check if integration is ready
        if (typeof window.kityMinderIntegration.isReady === 'function' && 
            !window.kityMinderIntegration.isReady()) {
            console.error('[Preview] KityMinder integration not ready');
            alert('KityMinder editor is not ready yet. Please wait a moment and try again.');
            return;
        }
        
        try {
            // Parse the JSON data if it's a string
            const parsedData = typeof mindmapData === 'string' ? JSON.parse(mindmapData) : mindmapData;
            
            console.log('[Preview] Parsed mindmap data:', parsedData);
            
            // Convert to JSON string for openEditDialog
            const jsonString = typeof parsedData === 'object' ? JSON.stringify(parsedData) : parsedData;
            
            // Open the editor in edit mode with the existing data
            window.kityMinderIntegration.openEditDialog(
                jsonString,
                null,
                'edit'
            );
            
            console.log('[Preview] Successfully opened mindmap editor');
        } catch (error) {
            console.error('[Preview] Failed to open mindmap editor:', error);
            alert('Failed to open mindmap editor: ' + error.message + '\n\nPlease check the console for details.');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Preview;
} else {
    window.Preview = Preview;
}
