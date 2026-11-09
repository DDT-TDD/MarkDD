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

        // Right-click context menu on diagrams for PNG/SVG export and clipboard actions
        this.element.addEventListener('contextmenu', (e) => {
            this.handleDiagramContextMenu(e);
        });
    }

    handleDiagramContextMenu(e) {
        // Remove existing context menu if present
        const existingMenu = document.querySelector('.diagram-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        // Find diagram target container
        const target = e.target;
        const diagramContainer = target.closest(
            '.diagram-container, .plantuml-container, .plantuml-diagram, .mermaid-diagram, ' +
            '.mermaid, .graphviz-diagram, .graphviz, .tikz-diagram, .tikz, .vegalite-diagram, ' +
            '.wavedrom-diagram, .markmap-diagram, .kityminder-diagram, .abc-diagram'
        ) || (target.tagName && target.tagName.toLowerCase() === 'svg' ? target : null)
          || (target.tagName && target.tagName.toLowerCase() === 'img' && target.classList.contains('plantuml-img') ? target : null);

        if (!diagramContainer) return;

        e.preventDefault();
        e.stopPropagation();

        const menu = document.createElement('div');
        menu.className = 'diagram-context-menu';

        const createItem = (icon, text, onClick) => {
            const item = document.createElement('div');
            item.className = 'diagram-context-menu-item';
            item.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
            item.addEventListener('click', (ev) => {
                ev.stopPropagation();
                menu.remove();
                onClick();
            });
            return item;
        };

        const createDivider = () => {
            const div = document.createElement('div');
            div.className = 'diagram-context-menu-divider';
            return div;
        };

        const renderer = window.markdownRenderer;
        if (!renderer) return;

        menu.appendChild(createItem('💾', 'Export as PNG...', () => {
            renderer.exportDiagram(diagramContainer, 'png');
        }));
        menu.appendChild(createItem('🖼️', 'Export as SVG...', () => {
            renderer.exportDiagram(diagramContainer, 'svg');
        }));
        menu.appendChild(createDivider());
        menu.appendChild(createItem('📋', 'Copy PNG to Clipboard', () => {
            renderer.copyDiagramImage(diagramContainer);
        }));
        menu.appendChild(createItem('📄', 'Copy SVG Markup', () => {
            renderer.copyDiagramSVG(diagramContainer);
        }));

        document.body.appendChild(menu);

        // Position menu safely within viewport
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const menuRect = menu.getBoundingClientRect();
        let left = mouseX;
        let top = mouseY;

        if (left + menuRect.width > window.innerWidth) {
            left = window.innerWidth - menuRect.width - 8;
        }
        if (top + menuRect.height > window.innerHeight) {
            top = window.innerHeight - menuRect.height - 8;
        }

        menu.style.left = `${Math.max(8, left)}px`;
        menu.style.top = `${Math.max(8, top)}px`;

        // Dismiss on click outside or escape key
        const dismissHandler = (event) => {
            if (!menu.contains(event.target)) {
                menu.remove();
                cleanup();
            }
        };
        const keyHandler = (event) => {
            if (event.key === 'Escape') {
                menu.remove();
                cleanup();
            }
        };
        const cleanup = () => {
            document.removeEventListener('click', dismissHandler);
            document.removeEventListener('contextmenu', dismissHandler);
            document.removeEventListener('keydown', keyHandler);
        };
        setTimeout(() => {
            document.addEventListener('click', dismissHandler);
            document.addEventListener('contextmenu', dismissHandler);
            document.addEventListener('keydown', keyHandler);
        }, 10);
    }

    initializeScrollSync() {
        this.isScrolling = false;
        this._ignorePreviewScrollUntil = 0;
        this._ignoreEditorScrollUntil = 0;
        this.scrollRatio = 0;
        this.lineElementMap = new Map();
        this.blockAnchors = [];
        this.linePixelOffsets = null;
        this.lastEditorLineCount = 0;
        this.scrollSyncEnabled = true;
        this.syncScroll = true;
        this.wysiwygEnabled = false;
        this.scrollSyncFromEditorTimeout = null;
        this.scrollSyncToEditorTimeout = null;
        this.scrollSyncDelay = 16;

        const previewContainer = this.element ? this.element.parentElement : null;
        if (previewContainer && previewContainer.id === 'preview-container') {
            previewContainer.addEventListener('scroll', () => {
                if (!this.scrollSyncEnabled) return;
                if (Date.now() < this._ignorePreviewScrollUntil) return;
                this.debouncedSyncScrollToEditor();
            }, { passive: true });
        }

        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.addEventListener('scroll', () => {
                if (!this.scrollSyncEnabled) return;
                if (Date.now() < this._ignoreEditorScrollUntil) return;
                this.debouncedSyncScrollFromEditor();
            }, { passive: true });

            editorElement.addEventListener('input', () => {
                if (this.scrollSyncEnabled) {
                    this.debouncedRebuildLineElementMap();
                }
            });

            // Sync active block highlight on cursor click or arrow key navigation
            const handleCursorActivity = () => {
                if (!this.scrollSyncEnabled) return;
                this.highlightActiveEditorLineInPreview(editorElement);
            };
            editorElement.addEventListener('click', handleCursorActivity);
            editorElement.addEventListener('keyup', (e) => {
                if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter'].includes(e.key)) {
                    handleCursorActivity();
                }
            });
        }

        // Bind WYSIWYG toggle button if present
        const wysiwygBtn = document.getElementById('wysiwygToggleBtn');
        if (wysiwygBtn) {
            wysiwygBtn.addEventListener('click', () => {
                this.toggleWysiwygMode();
            });
        }

        // Double-clicking any block in Preview jumps the Editor cursor to that exact source line
        if (this.element) {
            this.element.addEventListener('dblclick', (e) => {
                if (this.wysiwygEnabled) return; // In WYSIWYG mode, double-click selects text naturally
                const block = e.target.closest('[data-line]');
                if (block && editorElement) {
                    const lineIdx = parseInt(block.dataset.line, 10);
                    if (!isNaN(lineIdx)) {
                        this.jumpEditorCursorToLine(editorElement, lineIdx);
                    }
                }
            });
        }

        window.addEventListener('resize', () => {
            this.onLayoutResize();
        });

        setTimeout(() => {
            this.rebuildLineElementMap();
        }, 300);
    }

    onLayoutResize() {
        this.linePixelOffsets = null;
        this.rebuildLineElementMap();
        if (this.syncScroll && this.scrollSyncEnabled) {
            this.syncScrollFromEditor();
        }
    }
    debounceUpdate(content) {
        // Check if content has actually changed
        if (this.lastProcessedContent === content && !this.queuedContent) {
            return;
        }
        
        // Prevent multiple rapid updates
        if (this.isUpdating) {
            this.queuedContent = content;
            return;
        }
        
        // Clear existing timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Set new timeout - dynamic delay based on document size
        const delay = content.length > 20000 ? 250 : this.debounceDelay;
        this.debounceTimeout = setTimeout(() => {
            if (!this.isUpdating) {
                this.updatePreview(content);
            } else {
                this.queuedContent = content;
            }
        }, delay);
    }

    async updatePreview(content) {
        try {
            // Prevent concurrent updates - CRITICAL FIX
            if (this.isUpdating) {
                this.queuedContent = content;
                return;
            }
            
            this.isUpdating = true;
            this.lastProcessedContent = content;
            
            // Show loading state for long operations
            const isLongContent = content.length > 25000;
            if (isLongContent) {
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

``            // Rebuild line-element map immediately after render + postProcess so alignment is always current
            this.lastLineElementMapRebuild = 0;
            this.rebuildLineElementMap();
            if (this.wysiwygEnabled) {
                this.applyWysiwygEditableAttributes();
            }
            if (this.syncScroll && this.scrollSyncEnabled) {
                this.syncScrollFromEditor();
            }
``
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
        
        // Remove any previous warning if hljs is now available
        const existingWarning = this.element.querySelector('.highlightjs-warning');
        if (existingWarning && window.hljs) {
            existingWarning.remove();
        }
        
        if (!window.hljs) {
            // Don't show warning during initial load - hljs may still be loading
            // Only log to console, don't pollute the preview
            console.log('[Preview] highlight.js not yet available, code blocks will be highlighted when ready');
            
            // Retry after a short delay (libraries may still be loading)
            if (!this._hljsRetryScheduled) {
                this._hljsRetryScheduled = true;
                setTimeout(() => {
                    this._hljsRetryScheduled = false;
                    if (window.hljs) {
                        this.highlightCode();
                    }
                }, 1000);
            }
            return;
        }
        codeBlocks.forEach(block => {
            window.hljs.highlightElement(block);
        });
    }

    async renderMath() {
        // KaTeX math rendering is already performed inside MarkdownRenderer.render().
        // Only run KaTeX auto-render here if raw math markers still exist outside of code/pre
        if (window.renderMathInElement && this.element.textContent && (this.element.textContent.includes('$') || this.element.textContent.includes('\\(') || this.element.textContent.includes('\\['))) {
            const hasRawMath = this.element.querySelector('.raw-math, [data-latex-env], [data-math-raw]');
            if (hasRawMath) {
                window.renderMathInElement(this.element, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\[', right: '\\]', display: true },
                        { left: '\\(', right: '\\)', display: false }
                    ],
                    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'annotation', 'annotation-xml'],
                    throwOnError: false,
                    errorColor: '#cc0000'
                });
            }
        }
    }

    async processDiagrams() {
        // Fast-path: Only run processors if unrendered diagram containers actually exist
        const hasUnrendered = this.element.querySelector(
            '.mermaid-container:not(.mermaid-rendered), .tikz-container:not(.tikz-rendered), .markmap-inline-container:not(.markmap-rendered), ' +
            '.plantuml-container:not(.plantuml-rendered), .vega-lite-container:not(.vega-rendered), .graphviz-container:not(.graphviz-rendered), ' +
            '.abc-container:not(.abc-rendered), .latex-document-container:not(.latex-rendered)'
        );
        if (!hasUnrendered) return;

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
        if (mermaidElements.length === 0) return;

        // Delegate to markdownRenderer to preserve diagram action header and export buttons
        if (this.renderer && typeof this.renderer.processMermaidDiagrams === 'function') {
            await this.renderer.processMermaidDiagrams(this.element);
            return;
        }

        for (const element of mermaidElements) {
            const code = decodeURIComponent(element.getAttribute('data-mermaid-code'));
            const id = element.getAttribute('data-mermaid-id');
            
            try {
                if (window.mermaid) {
                    const renderId = `mermaid-svg-${id}-${Math.random().toString(36).substring(2, 7)}`;
                    const { svg } = await window.mermaid.render(renderId, code);
                    element.innerHTML = `
                        <div class="mermaid-diagram" id="${id}">
                            <div class="diagram-header">
                                <span class="diagram-type">Mermaid Diagram</span>
                                <div class="diagram-actions">
                                    <button class="diagram-btn diagram-export-svg-btn" onclick="window.markdownRenderer.exportDiagram('${id}', 'svg')" title="Export as SVG">SVG</button>
                                    <button class="diagram-btn diagram-export-png-btn" onclick="window.markdownRenderer.exportDiagram('${id}', 'png')" title="Export as PNG">PNG</button>
                                    <button class="diagram-btn diagram-toggle" onclick="this.closest('.mermaid-diagram').querySelector('.diagram-source').classList.toggle('hidden')">Source</button>
                                </div>
                                <pre class="diagram-source hidden"><code>${code}</code></pre>
                            </div>
                            <div class="diagram-content">
                                ${svg}
                            </div>
                        </div>`;
                    element.classList.add('mermaid-rendered');
                }
            } catch (error) {
                element.innerHTML = `<div class="diagram-error">Mermaid Error: ${error.message}</div>`;
                element.classList.add('mermaid-error', 'mermaid-rendered');
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
                
                // Load Viz.js library - try @viz-js/viz v3.x first, then fallback to v2.x
                if (!window.Viz) {
                    const cdnUrls = [
                        'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js',
                        'https://unpkg.com/@viz-js/viz@3.4.0/lib/viz-standalone.js',
                        'https://unpkg.com/viz.js@2.1.2/viz.js',
                        'https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js'
                    ];
                    
                    let loaded = false;
                    for (const url of cdnUrls) {
                        try {
                            loaded = await window.libraryLoader?.loadScript(url, 'viz.js', () => typeof window.Viz === 'function');
                            if (loaded) {
                                console.log(`[GraphViz] Loaded from: ${url}`);
                                break;
                            }
                        } catch (e) {
                            console.warn(`[GraphViz] Failed to load from ${url}:`, e);
                        }
                    }
                    
                    if (!loaded && typeof window.Viz !== 'function') {
                        throw new Error('Failed to load Viz.js library from all CDNs');
                    }
                }
                
                // Render GraphViz diagram - support both v2.x and v3.x APIs
                let svg = null;
                
                // Try @viz-js/viz v3.x API first (async, uses Viz.instance())
                if (!svg && window.Viz && typeof window.Viz.instance === 'function') {
                    try {
                        console.log('[GraphViz] Trying @viz-js/viz v3.x API');
                        const viz = await window.Viz.instance();
                        if (viz && typeof viz.renderSVGElement === 'function') {
                            svg = await viz.renderSVGElement(code, { engine });
                            console.log('[GraphViz] Rendered using v3.x renderSVGElement');
                        } else if (viz && typeof viz.renderString === 'function') {
                            const svgText = await viz.renderString(code, { format: 'svg', engine });
                            if (svgText && svgText.includes('<svg')) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(svgText, 'image/svg+xml');
                                svg = doc.documentElement;
                                console.log('[GraphViz] Rendered using v3.x renderString');
                            }
                        }
                    } catch (e) {
                        console.warn('[GraphViz] v3.x API failed:', e);
                    }
                }
                
                // Try viz.js v2.x class-based API
                if (!svg && typeof window.Viz === 'function' && window.Viz.prototype) {
                    try {
                        console.log('[GraphViz] Trying viz.js v2.x class API');
                        const viz = new window.Viz();
                        if (typeof viz.renderSVGElement === 'function') {
                            svg = await viz.renderSVGElement(code, { engine });
                            console.log('[GraphViz] Rendered using v2.x class renderSVGElement');
                        }
                    } catch (e) {
                        console.warn('[GraphViz] v2.x class API failed:', e);
                    }
                }
                
                // Try original viz.js v1.x/v2.x sync function API
                if (!svg && typeof window.Viz === 'function') {
                    try {
                        console.log('[GraphViz] Trying viz.js sync function API');
                        const svgText = window.Viz(code, { format: 'svg', engine: engine });
                        if (svgText && typeof svgText === 'string' && svgText.includes('<svg')) {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(svgText, 'image/svg+xml');
                            svg = doc.documentElement;
                            console.log('[GraphViz] Rendered using sync function API');
                        }
                    } catch (e) {
                        console.warn('[GraphViz] Sync function API failed:', e);
                    }
                }
                
                if (!svg) {
                    throw new Error('GraphViz rendering failed: No compatible Viz.js API found');
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
            const bridge = (typeof window !== 'undefined' && window.MarkDDBridge) ? window.MarkDDBridge : null;
            if (bridge) {
                bridge.invoke('open-external', href);
            } else if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.invoke('open-external', href);
            } else {
                window.open(href, '_blank');
            }
        }
        // Internal links are handled by updateInternalLinks
    }

    // =========================================================================
    // DETERMINISTIC SOURCE-LINE MAPPING, PIECEWISE-LINEAR SCROLL ALIGNMENT,
    // AND LIVE WYSIWYG EDITING ENGINE
    // =========================================================================

    /**
     * Parse Markdown source into ordered structural block anchors with exact
     * 0-based [startLine, endLine] intervals.
     */
    parseMarkdownBlockAnchors(markdown) {
        const lines = (markdown || '').split('\n');
        const totalLines = lines.length;
        const anchors = [];
        let i = 0;

        // Skip YAML frontmatter if present at line 0
        if (lines[0] && lines[0].trim() === '---') {
            let fmEnd = 1;
            while (fmEnd < totalLines && lines[fmEnd].trim() !== '---' && lines[fmEnd].trim() !== '...') {
                fmEnd++;
            }
            if (fmEnd < totalLines) {
                i = fmEnd + 1;
            }
        }

        const normalizeText = (str) => {
            return (str || '')
                .replace(/`([^`]+)`/g, '$1')
                .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                .replace(/[*_~#>|`]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();
        };

        while (i < totalLines) {
            const rawLine = lines[i];
            const trimmed = rawLine.trim();

            // Skip blank lines
            if (!trimmed) {
                i++;
                continue;
            }

            // 1. Fenced code / diagram / math blocks (``` or ~~~)
            const fenceMatch = rawLine.match(/^[ \t]*(`{3,}|~{3,})([^\r\n]*)$/);
            if (fenceMatch) {
                const fenceToken = fenceMatch[1];
                const fenceChar = fenceToken[0];
                const fenceLen = fenceToken.length;
                const info = (fenceMatch[2] || '').trim().toLowerCase();
                const startLine = i;
                i++;
                while (i < totalLines) {
                    const closeMatch = lines[i].match(new RegExp(`^[ \\t]*${fenceChar}{${fenceLen},}[ \\t]*$`));
                    if (closeMatch) {
                        i++;
                        break;
                    }
                    i++;
                }
                const endLine = Math.min(totalLines - 1, i - 1);
                const firstBodyLine = startLine + 1 <= endLine ? lines[startLine + 1].trim() : '';
                anchors.push({
                    type: 'fence',
                    lang: info,
                    startLine,
                    endLine,
                    sig: normalizeText(firstBodyLine)
                });
                continue;
            }

            // 2. Display math blocks: $$ ... $$ or \[ ... \] or \begin{...} ... \end{...}
            if (/^\$\$/.test(trimmed) || /^\\\[/.test(trimmed) || /^\\begin\{(?:align|equation|gather|multline|cases|pmatrix|bmatrix|vmatrix|Vmatrix|matrix|array|split|eqnarray|flalign|alignat)\*?\}/.test(trimmed)) {
                const startLine = i;
                const isSingleLineDollar = /^\$\$.+\$\$$/.test(trimmed) && trimmed !== '$$';
                const isSingleLineBracket = /^\\\[.+\\\]$/.test(trimmed);
                if (!isSingleLineDollar && !isSingleLineBracket) {
                    i++;
                    while (i < totalLines) {
                        const t = lines[i].trim();
                        if (t.endsWith('$$') || t.endsWith('\\]') || /\\end\{(?:align|equation|gather|multline|cases|pmatrix|bmatrix|vmatrix|Vmatrix|matrix|array|split|eqnarray|flalign|alignat)\*?\}/.test(t)) {
                            i++;
                            break;
                        }
                        i++;
                    }
                } else {
                    i++;
                }
                const endLine = Math.min(totalLines - 1, i - 1);
                anchors.push({
                    type: 'math',
                    startLine,
                    endLine,
                    sig: normalizeText(lines.slice(startLine, endLine + 1).join(' '))
                });
                continue;
            }

            // 3. Custom container: :::info ... :::
            if (/^:::(?:info|warning|error|success|tip|danger)/i.test(trimmed)) {
                const startLine = i;
                i++;
                while (i < totalLines && !/^:::\s*$/.test(lines[i].trim())) {
                    i++;
                }
                if (i < totalLines) i++;
                const endLine = Math.min(totalLines - 1, i - 1);
                anchors.push({
                    type: 'container',
                    startLine,
                    endLine,
                    sig: normalizeText(lines.slice(startLine, endLine + 1).join(' '))
                });
                continue;
            }

            // 4. ATX Heading: # ...
            const headingMatch = rawLine.match(/^[ \t]*(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                anchors.push({
                    type: 'heading',
                    level: headingMatch[1].length,
                    startLine: i,
                    endLine: i,
                    sig: normalizeText(headingMatch[2])
                });
                i++;
                continue;
            }

            // 5. Horizontal Rule
            if (/^[ \t]*(?:[-*_][ \t]*){3,}$/.test(rawLine)) {
                anchors.push({
                    type: 'hr',
                    startLine: i,
                    endLine: i,
                    sig: ''
                });
                i++;
                continue;
            }

            // 6. Table: consecutive lines starting/containing pipes |
            if (/^\|/.test(trimmed) || (trimmed.includes('|') && i + 1 < totalLines && /^\s*\|?\s*[:\-]+[\-\|:\s]+$/.test(lines[i + 1]))) {
                const startLine = i;
                while (i < totalLines && (lines[i].trim().startsWith('|') || lines[i].includes('|')) && lines[i].trim() !== '') {
                    i++;
                }
                const endLine = Math.min(totalLines - 1, i - 1);
                anchors.push({
                    type: 'table',
                    startLine,
                    endLine,
                    sig: normalizeText(lines[startLine])
                });
                continue;
            }

            // 7. Blockquote / Alert: consecutive lines starting with > or [!NOTE]
            if (/^>/.test(trimmed) || /^\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(trimmed)) {
                const startLine = i;
                while (i < totalLines && lines[i].trim() !== '' && (/^>/.test(lines[i].trim()) || !/^(?:#{1,6}\s|```|~~~|\$\$)/.test(lines[i].trim()))) {
                    if (!/^>/.test(lines[i].trim()) && i > startLine && !/^\[!/.test(lines[startLine].trim())) break;
                    i++;
                }
                const endLine = Math.min(totalLines - 1, i - 1);
                anchors.push({
                    type: 'blockquote',
                    startLine,
                    endLine,
                    sig: normalizeText(lines.slice(startLine, endLine + 1).join(' '))
                });
                continue;
            }

            // 8. List item: - / * / + / 1.
            const listMatch = rawLine.match(/^([ \t]*)(?:[-*+]|\d+\.)\s+(.*)$/);
            if (listMatch) {
                const startLine = i;
                const itemText = listMatch[2];
                i++;
                // Include continuation lines of the same list item (indented non-list lines)
                while (i < totalLines) {
                    const nextLine = lines[i];
                    const nextTrim = nextLine.trim();
                    if (!nextTrim) break;
                    if (/^[ \t]*(?:[-*+]|\d+\.)\s+/.test(nextLine)) break;
                    if (/^[ \t]*(?:#{1,6}\s|```|~~~|\$\$|>|\|)/.test(nextLine)) break;
                    if (/^[ \t]{2,}/.test(nextLine)) {
                        i++;
                    } else {
                        break;
                    }
                }
                const endLine = Math.min(totalLines - 1, i - 1);
                anchors.push({
                    type: 'listitem',
                    startLine,
                    endLine,
                    sig: normalizeText(itemText)
                });
                continue;
            }

            // 9. Regular Paragraph (consecutive non-blank, non-special lines)
            const startLine = i;
            const paraLines = [trimmed];
            i++;
            while (i < totalLines) {
                const nextLine = lines[i];
                const nextTrim = nextLine.trim();
                if (!nextTrim) break;
                if (/^[ \t]*(?:#{1,6}\s|```|~~~|\$\$|\\\[|\\begin\{|:::(?:info|warning|error|success|tip|danger)|[-*+]\s|\d+\.\s|>|\||(?:[-*_][ \t]*){3,}$)/.test(nextLine)) {
                    break;
                }
                paraLines.push(nextTrim);
                i++;
            }
            const endLine = Math.min(totalLines - 1, i - 1);
            anchors.push({
                type: 'paragraph',
                startLine,
                endLine,
                sig: normalizeText(paraLines.join(' '))
            });
        }

        return anchors;
    }

    /**
     * Collect structural preview DOM elements in document order that correspond
     * to Markdown block anchors (avoiding double-counting wrapper ul/ol/blockquote
     * when their inner li/p children are collected, or vice-versa).
     */
    collectPreviewBlockElements() {
        if (!this.element) return [];
        const candidates = Array.from(this.element.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, p, li, hr, pre, table, blockquote, ' +
            '.table-of-contents, .toc, ' +
            '.markdown-alert, .custom-container, ' +
            '.mermaid-container, .tikz-container, .markmap-inline-container, ' +
            '.math-display, .math-environment, .math-block, ' +
            '.plantuml-container, .vega-lite-container, .graphviz-container, ' +
            '.abc-container, .latex-container, .wavedrom-container, .kityminder-container'
        ));

        return candidates.filter((el) => {
            const parent = el.parentElement;
            if (!parent) return false;

            // Skip internal elements inside generated table-of-contents
            if (el.closest('.table-of-contents, .toc') && !el.classList.contains('table-of-contents') && !el.classList.contains('toc')) {
                return false;
            }

            // Do not collect inner <p> inside <li>, <blockquote>, .markdown-alert, .custom-container, or <td>/<th>
            if (el.tagName === 'P' && el.closest('li, blockquote, .markdown-alert, .custom-container, td, th, .diagram-container, .tikz-placeholder')) {
                return false;
            }
            // Do not collect <pre> that is inside a diagram container/fallback
            if (el.tagName === 'PRE' && el.closest('.mermaid-container, .tikz-container, .plantuml-container, .graphviz-container, .vega-lite-container, .abc-container, .wavedrom-container, .markmap-inline-container')) {
                return false;
            }
            // Do not collect nested .math-display inside .math-environment or vice-versa
            if ((el.classList.contains('math-display') || el.classList.contains('math-environment')) &&
                parent.closest('.math-display, .math-environment, .math-block')) {
                return false;
            }
            return true;
        });
    }

    doesAnchorMatchElement(anchor, el) {
        const tag = el.tagName.toLowerCase();
        if (anchor.type === 'heading') {
            return tag === `h${anchor.level}`;
        }
        if (anchor.type === 'hr') {
            return tag === 'hr';
        }
        if (anchor.type === 'table') {
            return tag === 'table';
        }
        if (anchor.type === 'listitem') {
            return tag === 'li';
        }
        if (anchor.type === 'blockquote') {
            return tag === 'blockquote' || el.classList.contains('markdown-alert');
        }
        if (anchor.type === 'container') {
            return el.classList.contains('custom-container');
        }
        if (anchor.type === 'math') {
            return el.classList.contains('math-display') ||
                   el.classList.contains('math-environment') ||
                   el.classList.contains('math-block') ||
                   (tag === 'p' && !!el.querySelector('.math-display, .katex-display, mjx-container'));
        }
        if (anchor.type === 'fence') {
            return tag === 'pre' ||
                   el.classList.contains('mermaid-container') ||
                   el.classList.contains('tikz-container') ||
                   el.classList.contains('markmap-inline-container') ||
                   el.classList.contains('plantuml-container') ||
                   el.classList.contains('vega-lite-container') ||
                   el.classList.contains('graphviz-container') ||
                   el.classList.contains('abc-container') ||
                   el.classList.contains('latex-container') ||
                   el.classList.contains('wavedrom-container') ||
                   el.classList.contains('kityminder-container') ||
                   el.classList.contains('math-block');
        }
        if (anchor.type === 'paragraph') {
            return tag === 'p' || tag === 'div';
        }
        return false;
    }

    rebuildLineElementMap() {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !this.element) return;

        const now = Date.now();
        if (now - this.lastLineElementMapRebuild < 60) {
            return;
        }
        this.lastLineElementMapRebuild = now;

        this.lineElementMap.clear();
        const markdown = editorElement.value || '';
        const lines = markdown.split('\n');
        const totalLines = Math.max(1, lines.length);

        const anchors = this.parseMarkdownBlockAnchors(markdown);
        const previewElements = this.collectPreviewBlockElements();

        // Clear stale dataset.line attributes
        this.element.querySelectorAll('[data-line]').forEach((el) => {
            delete el.dataset.line;
            delete el.dataset.lineEnd;
        });

        const matchedPairs = [];

        // Check if document has headings to partition into sections
        const headingAnchors = [];
        anchors.forEach((a, i) => { if (a.type === 'heading') headingAnchors.push(i); });
        const headingElements = [];
        previewElements.forEach((el, i) => { if (/^H[1-6]$/.test(el.tagName)) headingElements.push(i); });

        if (headingAnchors.length > 0 && headingAnchors.length === headingElements.length) {
            // Section-bounded matching: map headings 1-to-1 and intermediate blocks within each section
            for (let h = 0; h < headingAnchors.length; h++) {
                const aStart = headingAnchors[h];
                const aEnd = (h + 1 < headingAnchors.length) ? headingAnchors[h + 1] : anchors.length;
                const cStart = headingElements[h];
                const cEnd = (h + 1 < headingElements.length) ? headingElements[h + 1] : previewElements.length;

                // Match Heading
                const hAnchor = anchors[aStart];
                const hEl = previewElements[cStart];
                hEl.dataset.line = String(hAnchor.startLine);
                hEl.dataset.lineEnd = String(hAnchor.endLine);
                matchedPairs.push({ startLine: hAnchor.startLine, endLine: hAnchor.endLine, element: hEl, type: 'heading' });
                for (let l = hAnchor.startLine; l <= hAnchor.endLine; l++) this.lineElementMap.set(l, hEl);

                // Match intermediate blocks within this section
                const secAnchors = anchors.slice(aStart + 1, aEnd);
                const secElements = previewElements.slice(cStart + 1, cEnd);

                let cIdx = 0;
                for (let saIdx = 0; saIdx < secAnchors.length; saIdx++) {
                    const anchor = secAnchors[saIdx];
                    let matchedEl = null;

                    for (let k = cIdx; k < secElements.length; k++) {
                        if (this.doesAnchorMatchElement(anchor, secElements[k])) {
                            matchedEl = secElements[k];
                            cIdx = k + 1;
                            break;
                        }
                    }

                    if (!matchedEl && cIdx < secElements.length) {
                        matchedEl = secElements[cIdx++];
                    }

                    if (matchedEl) {
                        matchedEl.dataset.line = String(anchor.startLine);
                        matchedEl.dataset.lineEnd = String(anchor.endLine);
                        matchedPairs.push({ startLine: anchor.startLine, endLine: anchor.endLine, element: matchedEl, type: anchor.type });
                        for (let l = anchor.startLine; l <= anchor.endLine; l++) this.lineElementMap.set(l, matchedEl);
                    }
                }
            }
        } else {
            // Sequential lookahead matching fallback (for headingless or asymmetric documents)
            let elIdx = 0;
            for (let aIdx = 0; aIdx < anchors.length && elIdx < previewElements.length; aIdx++) {
                const anchor = anchors[aIdx];
                let matchedElIndex = -1;
                const maxLookahead = Math.min(previewElements.length, elIdx + 8);
                for (let k = elIdx; k < maxLookahead; k++) {
                    if (this.doesAnchorMatchElement(anchor, previewElements[k])) {
                        matchedElIndex = k;
                        break;
                    }
                }
                if (matchedElIndex === -1) matchedElIndex = elIdx;

                const matchedEl = previewElements[matchedElIndex];
                matchedEl.dataset.line = String(anchor.startLine);
                matchedEl.dataset.lineEnd = String(anchor.endLine);
                matchedPairs.push({ startLine: anchor.startLine, endLine: anchor.endLine, element: matchedEl, type: anchor.type });
                for (let line = anchor.startLine; line <= anchor.endLine; line++) {
                    this.lineElementMap.set(line, matchedEl);
                }
                elIdx = matchedElIndex + 1;
            }
        }

        // Fill gap lines
        if (matchedPairs.length > 0) {
            let currentEl = matchedPairs[0].element;
            for (let line = 0; line < totalLines; line++) {
                if (this.lineElementMap.has(line)) {
                    currentEl = this.lineElementMap.get(line);
                } else {
                    this.lineElementMap.set(line, currentEl);
                }
            }
        }

        this.blockAnchors = matchedPairs;
        this.lastEditorLineCount = totalLines;
        this.measureEditorLinePixelOffsets(editorElement, lines);
    }

    /**
     * Accurately compute the Y pixel offset of every logical line in <textarea id="editor">,
     * taking wrapped lines (word-wrap) into account via a hidden mirror div or character-wrap math.
     */
    measureEditorLinePixelOffsets(editorElement, lines) {
        if (!editorElement) return;
        const totalLines = lines.length || 1;
        const lineHeight = this.getEditorLineHeight(editorElement);
        const offsets = new Float64Array(totalLines + 1);

        // Check if word-wrap is active and editor has a real layout width
        const style = window.getComputedStyle(editorElement);
        const paddingLeft = parseFloat(style.paddingLeft) || 20;
        const paddingRight = parseFloat(style.paddingRight) || 20;
        const contentWidth = (editorElement.clientWidth || 0) - paddingLeft - paddingRight;
        const fontSize = parseFloat(style.fontSize) || 14;
        // Monospace average character width (~0.6 * fontSize)
        const charWidth = fontSize * 0.602;
        const charsPerVisualRow = contentWidth > 60 ? Math.max(10, Math.floor(contentWidth / charWidth)) : 0;
        const isWrap = style.whiteSpace !== 'pre' && style.whiteSpace !== 'nowrap' && charsPerVisualRow > 0;

        let currentY = 0;
        for (let i = 0; i < totalLines; i++) {
            offsets[i] = currentY;
            const len = lines[i].length;
            const visualRows = (isWrap && len > charsPerVisualRow)
                ? Math.ceil(len / charsPerVisualRow)
                : 1;
            currentY += visualRows * lineHeight;
        }
        offsets[totalLines] = currentY;

        // Scale offsets if the actual scrollHeight of the textarea differs from estimated total height
        const paddingTop = parseFloat(style.paddingTop) || 20;
        const paddingBottom = parseFloat(style.paddingBottom) || 20;
        const actualContentHeight = (editorElement.scrollHeight || 0) - paddingTop - paddingBottom;
        if (actualContentHeight > lineHeight && currentY > 0) {
            const scale = actualContentHeight / currentY;
            // Only apply scale if reasonably close (guards against hidden/unmounted JSDOM elements where scrollHeight === 0)
            if (scale > 0.5 && scale < 2.5) {
                for (let i = 0; i <= totalLines; i++) {
                    offsets[i] *= scale;
                }
            }
        }

        this.linePixelOffsets = offsets;
    }

    getLineTopInEditor(editorElement, lineIndex) {
        const lineHeight = this.getEditorLineHeight(editorElement);
        if (this.linePixelOffsets && lineIndex >= 0 && lineIndex < this.linePixelOffsets.length) {
            return this.linePixelOffsets[lineIndex];
        }
        return Math.max(0, lineIndex) * lineHeight;
    }

    getVisibleLineInEditor(editorElement) {
        try {
            const scrollTop = editorElement.scrollTop;
            if (this.linePixelOffsets && this.linePixelOffsets.length > 1) {
                // Binary search in this.linePixelOffsets for scrollTop
                let low = 0;
                let high = this.linePixelOffsets.length - 2;
                while (low <= high) {
                    const mid = (low + high) >>> 1;
                    const top = this.linePixelOffsets[mid];
                    const nextTop = this.linePixelOffsets[mid + 1];
                    if (scrollTop < top) {
                        high = mid - 1;
                    } else if (scrollTop >= nextTop) {
                        low = mid + 1;
                    } else {
                        return mid;
                    }
                }
                return Math.max(0, Math.min(this.linePixelOffsets.length - 2, low));
            }
            const lineHeight = this.getEditorLineHeight(editorElement);
            return Math.max(0, Math.floor(scrollTop / lineHeight));
        } catch (error) {
            return 0;
        }
    }

    getEditorLineHeight(editorElement) {
        const style = window.getComputedStyle(editorElement);
        const fontSize = parseFloat(style.fontSize) || 14;
        const lineHeight = style.lineHeight;
        if (!lineHeight || lineHeight === 'normal') {
            return fontSize * 1.6;
        } else if (lineHeight.endsWith('px')) {
            return parseFloat(lineHeight);
        } else if (!isNaN(parseFloat(lineHeight))) {
            return fontSize * parseFloat(lineHeight);
        }
        return fontSize * 1.6;
    }

    getElementOffsetInPreview(element, previewContainer) {
        if (!element || !previewContainer) return 0;
        const elRect = element.getBoundingClientRect();
        const containerRect = previewContainer.getBoundingClientRect();
        if (elRect.height > 0 || containerRect.height > 0 || elRect.top !== containerRect.top) {
            // Subtract 20px top padding so the element aligns with the 20px top padding of #editor
            return Math.max(0, previewContainer.scrollTop + (elRect.top - containerRect.top) - 20);
        }
        return Math.max(0, (element.offsetTop || 0) - 20);
    }

    /**
     * Build sorted piecewise-linear anchor points [(editorY, previewY), ...]
     * connecting every matched Markdown block's start and end positions.
     */
    buildScrollAnchorCurve(editorElement, previewContainer) {
        if (!this.blockAnchors || this.blockAnchors.length === 0) {
            this.rebuildLineElementMap();
        }

        const editorMax = Math.max(0, (editorElement.scrollHeight || 0) - (editorElement.clientHeight || 0));
        const previewMax = Math.max(0, (previewContainer.scrollHeight || 0) - (previewContainer.clientHeight || 0));

        const points = [{ editorY: 0, previewY: 0, line: 0 }];

        for (const pair of this.blockAnchors) {
            const el = pair.element;
            if (!el || !this.element.contains(el)) continue;

            const editorStartY = this.getLineTopInEditor(editorElement, pair.startLine);
            const previewStartY = this.getElementOffsetInPreview(el, previewContainer);

            const lastPt = points[points.length - 1];
            if (editorStartY >= lastPt.editorY && previewStartY >= lastPt.previewY) {
                points.push({
                    editorY: editorStartY,
                    previewY: previewStartY,
                    line: pair.startLine
                });
            }

            // For multi-line blocks (code fences, tables, math blocks, diagrams), also add the bottom of the block
            if (pair.endLine > pair.startLine) {
                const editorEndY = this.getLineTopInEditor(editorElement, pair.endLine + 1);
                const elHeight = el.getBoundingClientRect().height || el.offsetHeight || 0;
                const previewEndY = previewStartY + elHeight;
                const prevPt = points[points.length - 1];
                if (editorEndY > prevPt.editorY && previewEndY >= prevPt.previewY) {
                    points.push({
                        editorY: editorEndY,
                        previewY: previewEndY,
                        line: pair.endLine
                    });
                }
            }
        }

        if (editorMax > 0 && previewMax > 0) {
            const last = points[points.length - 1];
            if (editorMax > last.editorY || previewMax > last.previewY) {
                points.push({
                    editorY: Math.max(last.editorY, editorMax),
                    previewY: Math.max(last.previewY, previewMax),
                    line: this.lastEditorLineCount
                });
            }
        }

        return points;
    }

    /**
     * Editor -> Preview scroll synchronization using piecewise-linear interpolation
     * across matched block anchors. Top of editor (0px) maps to top of preview (0px)!
     */
    syncScrollFromEditor() {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !this.scrollSyncEnabled) return;

        const previewContainer = this.element ? this.element.parentElement : null;
        if (!previewContainer || previewContainer.id !== 'preview-container') return;

        try {
            const editorScrollTop = editorElement.scrollTop;
            const editorMaxScroll = Math.max(0, editorElement.scrollHeight - editorElement.clientHeight);
            const previewMaxScroll = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);

            if (editorScrollTop <= 1) {
                this._ignorePreviewScrollUntil = Date.now() + 80;
                previewContainer.scrollTop = 0;
                return;
            }
            if (editorMaxScroll > 0 && editorScrollTop >= editorMaxScroll - 2) {
                this._ignorePreviewScrollUntil = Date.now() + 80;
                previewContainer.scrollTop = previewMaxScroll;
                return;
            }

            const curve = this.buildScrollAnchorCurve(editorElement, previewContainer);
            let targetPreviewY = 0;

            if (curve.length >= 2) {
                // Find interval [k, k+1] containing editorScrollTop
                let k = 0;
                while (k < curve.length - 2 && curve[k + 1].editorY <= editorScrollTop) {
                    k++;
                }
                const p0 = curve[k];
                const p1 = curve[k + 1];
                const spanEditor = p1.editorY - p0.editorY;
                const t = spanEditor > 0 ? Math.max(0, Math.min(1, (editorScrollTop - p0.editorY) / spanEditor)) : 0;
                targetPreviewY = p0.previewY + t * (p1.previewY - p0.previewY);
            } else {
                const ratio = editorMaxScroll > 0 ? editorScrollTop / editorMaxScroll : 0;
                targetPreviewY = ratio * previewMaxScroll;
            }

            const clampedTop = previewMaxScroll > 0
                ? Math.max(0, Math.min(Math.round(targetPreviewY), previewMaxScroll))
                : Math.max(0, Math.round(targetPreviewY));

            this._ignorePreviewScrollUntil = Date.now() + 80;
            previewContainer.scrollTop = clampedTop;
        } catch (error) {
            console.error('[Preview] Scroll sync from editor error:', error);
        }
    }

    /**
     * Preview -> Editor scroll synchronization using the exact inverse
     * piecewise-linear interpolation across the same block anchor curve!
     */
    syncScrollToEditor() {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !this.scrollSyncEnabled) return;

        const previewContainer = this.element ? this.element.parentElement : null;
        if (!previewContainer || previewContainer.id !== 'preview-container') return;

        try {
            const previewScrollTop = previewContainer.scrollTop;
            const previewMaxScroll = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);
            const editorMaxScroll = Math.max(0, editorElement.scrollHeight - editorElement.clientHeight);

            if (previewScrollTop <= 1) {
                this._ignoreEditorScrollUntil = Date.now() + 80;
                editorElement.scrollTop = 0;
                return;
            }
            if (previewMaxScroll > 0 && previewScrollTop >= previewMaxScroll - 2) {
                this._ignoreEditorScrollUntil = Date.now() + 80;
                editorElement.scrollTop = editorMaxScroll;
                return;
            }

            const curve = this.buildScrollAnchorCurve(editorElement, previewContainer);
            let targetEditorY = 0;

            if (curve.length >= 2) {
                let k = 0;
                while (k < curve.length - 2 && curve[k + 1].previewY <= previewScrollTop) {
                    k++;
                }
                const p0 = curve[k];
                const p1 = curve[k + 1];
                const spanPreview = p1.previewY - p0.previewY;
                const t = spanPreview > 0 ? Math.max(0, Math.min(1, (previewScrollTop - p0.previewY) / spanPreview)) : 0;
                targetEditorY = p0.editorY + t * (p1.editorY - p0.editorY);
            } else {
                const ratio = previewMaxScroll > 0 ? previewScrollTop / previewMaxScroll : 0;
                targetEditorY = ratio * editorMaxScroll;
            }

            const clampedTop = editorMaxScroll > 0
                ? Math.max(0, Math.min(Math.round(targetEditorY), editorMaxScroll))
                : Math.max(0, Math.round(targetEditorY));

            this._ignoreEditorScrollUntil = Date.now() + 80;
            editorElement.scrollTop = clampedTop;
        } catch (error) {
            console.error('[Preview] Error in syncScrollToEditor:', error);
        }
    }

    findCorrespondingElement(lineIndex, editorElement) {
        if (!this.lineElementMap || this.lineElementMap.size === 0) {
            this.rebuildLineElementMap();
        }
        if (this.lineElementMap.has(lineIndex)) {
            return this.lineElementMap.get(lineIndex);
        }
        return null;
    }

    findCorrespondingLine(element, editorElement) {
        if (!element) return -1;
        const closestWithLine = element.closest ? element.closest('[data-line]') : null;
        const target = closestWithLine || element;
        if (target.dataset && target.dataset.line !== undefined) {
            const parsed = parseInt(target.dataset.line, 10);
            if (!isNaN(parsed)) return parsed;
        }
        for (const [lineIndex, mappedElement] of this.lineElementMap.entries()) {
            if (mappedElement === target) return lineIndex;
        }
        return -1;
    }

    scrollEditorToLine(editorElement, lineIndex) {
        if (!editorElement) return;
        const targetY = this.getLineTopInEditor(editorElement, lineIndex);
        const maxScrollTop = Math.max(0, editorElement.scrollHeight - editorElement.clientHeight);
        this._ignoreEditorScrollUntil = Date.now() + 80;
        editorElement.scrollTop = maxScrollTop > 0 ? Math.max(0, Math.min(targetY, maxScrollTop)) : Math.max(0, targetY);
    }

    scrollPreviewToElement(element) {
        if (!element || !this.element) return;
        const previewContainer = this.element.parentElement;
        if (!previewContainer || previewContainer.id !== 'preview-container') return;
        const targetY = this.getElementOffsetInPreview(element, previewContainer);
        const maxScrollTop = Math.max(0, previewContainer.scrollHeight - previewContainer.clientHeight);
        this._ignorePreviewScrollUntil = Date.now() + 80;
        previewContainer.scrollTop = maxScrollTop > 0 ? Math.max(0, Math.min(targetY, maxScrollTop)) : Math.max(0, targetY);
    }

    /**
     * Highlight the preview block corresponding to the current editor cursor line
     * and keep it aligned with the editor's visual line position.
     */
    highlightActiveEditorLineInPreview(editorElement) {
        if (!editorElement || !this.element) return;
        const pos = editorElement.selectionStart || 0;
        const textBefore = (editorElement.value || '').substring(0, pos);
        const cursorLine = Math.max(0, textBefore.split('\n').length - 1);

        const targetEl = this.findCorrespondingElement(cursorLine, editorElement);
        this.element.querySelectorAll('.preview-active-block').forEach((el) => {
            if (el !== targetEl) el.classList.remove('preview-active-block');
        });
        if (targetEl) {
            targetEl.classList.add('preview-active-block');
        }
    }

    jumpEditorCursorToLine(editorElement, lineIndex) {
        if (!editorElement) return;
        const lines = (editorElement.value || '').split('\n');
        const clampedLine = Math.max(0, Math.min(lineIndex, lines.length - 1));
        let charOffset = 0;
        for (let i = 0; i < clampedLine; i++) {
            charOffset += lines[i].length + 1;
        }
        editorElement.focus();
        editorElement.setSelectionRange(charOffset, charOffset + lines[clampedLine].length);
        this.scrollEditorToLine(editorElement, clampedLine);
        this.highlightActiveEditorLineInPreview(editorElement);
    }

    // =========================================================================
    // LIVE WYSIWYG EDITING MODE IN PREVIEW
    // =========================================================================

    toggleWysiwygMode(forceState) {
        this.wysiwygEnabled = typeof forceState === 'boolean' ? forceState : !this.wysiwygEnabled;
        if (this.element) {
            this.element.classList.toggle('wysiwyg-mode', this.wysiwygEnabled);
        }
        const wysiwygBtn = document.getElementById('wysiwygToggleBtn');
        if (wysiwygBtn) {
            wysiwygBtn.classList.toggle('active', this.wysiwygEnabled);
            wysiwygBtn.title = `Direct WYSIWYG Editing (${this.wysiwygEnabled ? 'On' : 'Off'})`;
        }
        if (this.wysiwygEnabled) {
            this.applyWysiwygEditableAttributes();
        } else {
            this.removeWysiwygEditableAttributes();
        }
        return this.wysiwygEnabled;
    }

    applyWysiwygEditableAttributes() {
        if (!this.element) return;
        this.rebuildLineElementMap();

        const editableBlocks = this.element.querySelectorAll('h1[data-line], h2[data-line], h3[data-line], h4[data-line], h5[data-line], h6[data-line], p[data-line], li[data-line], blockquote[data-line]');
        editableBlocks.forEach((block) => {
            // Skip blocks that contain rendered math or diagrams so complex SVG/KaTeX DOM is never corrupted
            if (block.querySelector('.katex, mjx-container, svg, .mermaid-container, .tikz-container, .plantuml-container, .graphviz-container')) {
                return;
            }
            block.setAttribute('contenteditable', 'true');
            if (!block._wysiwygBound) {
                block._wysiwygBound = true;
                block.addEventListener('input', () => {
                    this.syncWysiwygBlockToEditor(block);
                });
                block.addEventListener('blur', () => {
                    this.syncWysiwygBlockToEditor(block, true);
                });
            }
        });
    }

    removeWysiwygEditableAttributes() {
        if (!this.element) return;
        this.element.querySelectorAll('[contenteditable="true"]').forEach((el) => {
            el.removeAttribute('contenteditable');
        });
    }

    serializeInlineDomToMarkdown(node) {
        if (!node) return '';
        if (node.nodeType === 3) { // TEXT_NODE
            return node.nodeValue || '';
        }
        if (node.nodeType !== 1) return '';
        const tag = node.tagName.toLowerCase();
        if (tag === 'br') return '\n';
        const inner = Array.from(node.childNodes).map((c) => this.serializeInlineDomToMarkdown(c)).join('');
        if (tag === 'strong' || tag === 'b') return `**${inner}**`;
        if (tag === 'em' || tag === 'i') return `*${inner}*`;
        if (tag === 'del' || tag === 's') return `~~${inner}~~`;
        if (tag === 'code') return `\`${inner}\``;
        if (tag === 'a') {
            const href = node.getAttribute('href') || '';
            return `[${inner}](${href})`;
        }
        return inner;
    }

    syncWysiwygBlockToEditor(block, triggerFullRender = false) {
        const editorElement = document.getElementById('editor');
        if (!editorElement || !block || block.dataset.line === undefined) return;

        const startLine = parseInt(block.dataset.line, 10);
        const endLine = block.dataset.lineEnd !== undefined ? parseInt(block.dataset.lineEnd, 10) : startLine;
        if (isNaN(startLine) || isNaN(endLine)) return;

        const lines = (editorElement.value || '').split('\n');
        if (startLine < 0 || startLine >= lines.length) return;

        const tag = block.tagName.toLowerCase();
        const inlineMd = this.serializeInlineDomToMarkdown(block).trim();
        let newMarkdownBlock = inlineMd;

        if (/^h([1-6])$/.test(tag)) {
            const level = parseInt(tag.substring(1), 10);
            newMarkdownBlock = `${'#'.repeat(level)} ${inlineMd}`;
        } else if (tag === 'li') {
            const origLine = lines[startLine] || '';
            const prefixMatch = origLine.match(/^([ \t]*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?)/);
            const prefix = prefixMatch ? prefixMatch[1] : '- ';
            newMarkdownBlock = `${prefix}${inlineMd}`;
        } else if (tag === 'blockquote') {
            newMarkdownBlock = inlineMd.split('\n').map((l) => `> ${l}`).join('\n');
        }

        const newBlockLines = newMarkdownBlock.split('\n');
        lines.splice(startLine, endLine - startLine + 1, ...newBlockLines);
        const updatedMarkdown = lines.join('\n');

        this.lastProcessedContent = updatedMarkdown;
        editorElement.value = updatedMarkdown;
        if (window.markddApp && window.markddApp.editor) {
            window.markddApp.editor.content = updatedMarkdown;
            window.markddApp.editor.setModified(true);
            window.markddApp.editor.updateStatus();
        }

        // Update lineEnd if line count changed
        const delta = newBlockLines.length - (endLine - startLine + 1);
        if (delta !== 0 || triggerFullRender) {
            this.lastLineElementMapRebuild = 0;
            this.rebuildLineElementMap();
        }
    }

    updateScrollSync() {
        this.lastLineElementMapRebuild = 0;
        this.rebuildLineElementMap();
        if (this.syncScroll && this.scrollSyncEnabled) {
            this.syncScrollFromEditor();
        }
    }

    debouncedRebuildLineElementMap() {
        if (this.lineElementMapRebuildDebounceTimeout) {
            clearTimeout(this.lineElementMapRebuildDebounceTimeout);
        }
        this.lineElementMapRebuildDebounceTimeout = setTimeout(() => {
            if (this.syncScroll) {
                this.lastLineElementMapRebuild = 0;
                this.rebuildLineElementMap();
            }
        }, 120);
    }

    debouncedSyncScrollFromEditor() {
        if (this.scrollSyncFromEditorTimeout) {
            clearTimeout(this.scrollSyncFromEditorTimeout);
        }
        this.scrollSyncFromEditorTimeout = setTimeout(() => {
            if (this.scrollSyncEnabled && Date.now() >= this._ignoreEditorScrollUntil) {
                this.syncScrollFromEditor();
            }
        }, this.scrollSyncDelay);
    }

    debouncedSyncScrollToEditor() {
        if (this.scrollSyncToEditorTimeout) {
            clearTimeout(this.scrollSyncToEditorTimeout);
        }
        this.scrollSyncToEditorTimeout = setTimeout(() => {
            if (this.scrollSyncEnabled && Date.now() >= this._ignorePreviewScrollUntil) {
                this.syncScrollToEditor();
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
        const bridge = (typeof window !== 'undefined' && window.MarkDDBridge) ? window.MarkDDBridge : null;
        if (bridge) {
            const result = await bridge.invoke('export-html', {
                html: sanitizedDoc,
                fileName: title.replace(/\.md$/, '.html')
            });
            if (result && result.success) {
                console.log('HTML exported successfully:', result.filePath);
                return result.filePath;
            }
        } else if (typeof require !== 'undefined') {
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
        const bridge = (typeof window !== 'undefined' && window.MarkDDBridge) ? window.MarkDDBridge : null;
        if (bridge) {
            const result = await bridge.invoke('export-pdf', {
                html: sanitizedDoc,
                fileName: title.replace(/\.md$/, '.pdf')
            });
            if (result && result.success) {
                console.log('PDF exported successfully:', result.filePath);
                return result.filePath;
            } else if (result && result.error) {
                throw new Error(result.error);
            }
        } else if (typeof require !== 'undefined') {
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

        body.doc-pdf-export {
            max-width: 100%;
            width: 100%;
            margin: 0;
            padding: 32px 56px;
            background: #fff;
            box-sizing: border-box;
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
            margin: 1em auto;
            padding: 1em;
            border: 1px solid #e1e5e9;
            border-radius: 6px;
            background: #fafbfc;
        }

        .mermaid-container,
        .tikz-container {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
            overflow-x: auto;
        }

        .mermaid-container svg,
        .tikz-container svg,
        .tikz-container canvas,
        .tikz-container img {
            margin: 0 auto;
        }

        /* Ensure media fits within printable width */
        img, video, canvas, iframe {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1.25em auto;
            border-radius: 4px;
        }

        body.doc-pdf-export img,
        body.doc-pdf-export video,
        body.doc-pdf-export canvas,
        body.doc-pdf-export iframe {
            page-break-inside: avoid;
        }

        figure {
            margin: 1.25em auto;
            text-align: center;
        }

        figure img {
            margin: 0 auto;
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
        
        /* YouTube video embeds */
        .youtube-embed {
            margin: 20px 0;
            text-align: center;
        }
        
        .youtube-embed iframe {
            max-width: 100%;
            border-radius: 8px;
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
        
        /* GitHub-style task lists */
        .task-list, ul.contains-task-list {
            list-style: none;
            padding-left: 0;
            margin-left: 0;
        }
        
        .task-list .task-list {
            margin-left: 1.25em;
        }
        
        .task-list-item {
            display: flex;
            align-items: flex-start;
            gap: 0.5em;
        }
        
        .task-list-item input[type="checkbox"] {
            margin-top: 0.25em;
        }
        
        .task-completed {
            text-decoration: line-through;
            color: #6a737d;
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
            if (typeof mermaid !== 'undefined' && mermaid && typeof mermaid.initialize === 'function') {
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
                            markmap.Markmap.create(svg, null, root);
                        } catch (error) {
                            container.innerHTML = '<div class="diagram-error">Markmap Error: ' + error.message + '</div>';
                        }
                    }
                });
            }

            // Signal to the embedding process that MathJax rendering is complete
            const markMathDone = () => {
                try { window.__MATHJAX_DONE = true; } catch (_) {}
            };

            try {
                if (window.MathJax) {
                    const finalize = () => setTimeout(markMathDone, 50);
                    if (window.MathJax.startup && window.MathJax.startup.promise) {
                        window.MathJax.startup.promise
                            .then(() => {
                                if (window.MathJax.typesetPromise) {
                                    window.MathJax.typesetPromise().then(finalize).catch(finalize);
                                } else {
                                    finalize();
                                }
                            })
                            .catch(finalize);
                    } else if (window.MathJax.typesetPromise) {
                        window.MathJax.typesetPromise().then(finalize).catch(finalize);
                    } else {
                        setTimeout(finalize, 300);
                    }
                } else {
                    markMathDone();
                }
            } catch (e) {
                markMathDone();
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
            // Replace inline style occurrences of currentColor for fill/stroke/color safely
            html = html.replace(/([:;]\s*fill\s*:\s*)currentColor/gi, '$1#000');
            html = html.replace(/([:;]\s*stroke\s*:\s*)currentColor/gi, '$1#000');
            html = html.replace(/([:;]\s*color\s*:\s*)currentColor/gi, '$1#000');
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
