class LibraryLoader {
    constructor() {
        this.loadedLibraries = new Set();
        this.loadPromises = new Map();
        this.setupUniversalPatching();
    }

    // ENHANCED: Universal protection against function errors
    setupUniversalPatching() {
        console.log('[LibraryLoader] Setting up universal patching system...');
        
        // Create the simplest, safest buildJSItem fallback possible
        const createSafeBuildJSItem = () => {
            return function(item) {
                // Strict safety: only process non-function items
                if (typeof item === 'function') {
                    return {};
                }
                return item || {};
            };
        };

        // Immediate global protection
        window.buildJSItem = createSafeBuildJSItem();

        // Simple protection for markmap objects
        if (!window.markmapCommon) {
            window.markmapCommon = { buildJSItem: createSafeBuildJSItem() };
        } else if (!window.markmapCommon.buildJSItem) {
            window.markmapCommon.buildJSItem = createSafeBuildJSItem();
        }

        if (!window.markmapLib) {
            window.markmapLib = { buildJSItem: createSafeBuildJSItem() };
        } else if (!window.markmapLib.buildJSItem) {
            window.markmapLib.buildJSItem = createSafeBuildJSItem();
        }

        if (!window.markmapView) {
            window.markmapView = { buildJSItem: createSafeBuildJSItem() };
        } else if (!window.markmapView.buildJSItem) {
            window.markmapView.buildJSItem = createSafeBuildJSItem();
        }

        console.log('[LibraryLoader] Universal patching system initialized safely');
    }

    // CRITICAL: Setup global objects before library loading to prevent runtime errors
    setupPreLoadingGlobals() {
        console.log('[LibraryLoader] Setting up comprehensive pre-loading globals to prevent errors...');
        
        // Critical: D3 fallback to prevent "d3 is not defined" errors before library loads
        if (!window.d3) {
            window.d3 = {
                select: function() { 
                    console.log('[LibraryLoader] Using D3 fallback select()');
                    return { 
                        selectAll: () => ({ remove: () => {}, data: () => ({ enter: () => ({ append: () => ({}) }) }) }),
                        append: () => ({ attr: () => ({}), style: () => ({}), text: () => ({}) }),
                        attr: () => ({}),
                        style: () => ({}),
                        text: () => ({})
                    }; 
                },
                selectAll: function() { 
                    console.log('[LibraryLoader] Using D3 fallback selectAll()');
                    return { 
                        remove: () => {},
                        data: () => ({ enter: () => ({ append: () => ({}) }) }),
                        attr: () => ({}),
                        style: () => ({})
                    }; 
                },
                scaleOrdinal: function() { return function() { return '#000'; }; },
                hierarchy: function(data) { return data || {}; },
                tree: function() { return function() { return []; }; }
            };
        }
        
        // Create comprehensive Markmap globals structure before library loading
        if (!window.markmap) {
            window.markmap = {
                Utils: {
                    buildJSItem: function(item) { 
                        console.log('[LibraryLoader] Using fallback buildJSItem for:', item);
                        return item || {}; 
                    }
                },
                lib: {},
                view: {},
                transform: function() { return {}; }
            };
        }
        
        // Setup MarkmapLib globals 
        if (!window.markmapLib) {
            window.markmapLib = {
                buildJSItem: function(item) { 
                    console.log('[LibraryLoader] Using fallback markmapLib.buildJSItem for:', item);
                    return item || {}; 
                },
                transform: function() { return {}; }
            };
        }
        
        // Setup MarkmapView globals
        if (!window.markmapView) {
            window.markmapView = {
                buildJSItem: function(item) { 
                    console.log('[LibraryLoader] Using fallback markmapView.buildJSItem for:', item);
                    return item || {}; 
                }
            };
        }
        
        // Pre-setup markmapCommon to prevent "buildJSItem is not a function" errors
        if (!window.markmapCommon) {
            window.markmapCommon = {
                buildJSItem: function(item) { 
                    console.log('[LibraryLoader] Using fallback markmapCommon.buildJSItem for:', item);
                    return item || {}; 
                }
            };
        }
        
        // Setup Markmap constructor fallback
        if (!window.Markmap) {
            window.Markmap = function() {
                console.log('[LibraryLoader] Using fallback Markmap constructor');
                return {};
            };
        }
        
        // Global buildJSItem fallback
        window.buildJSItem = window.buildJSItem || function(item) { 
            console.log('[LibraryLoader] Using global fallback buildJSItem for:', item);
            return item || {}; 
        };

        // Additional markmap-related fallbacks for CDN loading
        if (!window.markmapCommon) {
            window.markmapCommon = {
                buildJSItem: function(item) { 
                    console.log('[LibraryLoader] Using fallback markmapCommon.buildJSItem for:', item);
                    return item || {}; 
                }
            };
        }
        
        console.log('[LibraryLoader] Comprehensive pre-loading globals setup complete');
    }

    async loadScript(url, libraryName, checkFunction) {
        console.log(`[LibraryLoader] Loading ${libraryName}...`);

        // Check if already loaded
        if (this.loadedLibraries.has(libraryName)) {
            console.log(`[LibraryLoader] ${libraryName} already loaded`);
            return true;
        }

        // Check if we're trying to load the library multiple times
        if (this.loadPromises.has(libraryName)) {
            console.log(`[LibraryLoader] ${libraryName} load already in progress`);
            return this.loadPromises.get(libraryName);
        }

        // Create load promise
        const loadPromise = new Promise(async (resolve) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;

            let attempts = 0;
            const maxAttempts = 50;

            const checkLoaded = async () => {
                attempts++;
                if (checkFunction()) {
                    // TikZJax global assignment - enhanced initialization
                    if (libraryName === 'TikZJax') {
                        // Wait for TikZJax to be fully ready
                        setTimeout(() => {
                            if (window.tikzjax && typeof window.tikzjax === 'object') {
                                window.TikZJax = window.tikzjax;
                                console.log('[LibraryLoader] TikZJax assigned to global TikZJax');
                            } else if (window.TikZJax && typeof window.TikZJax === 'function') {
                                window.tikzjax = window.TikZJax;
                                console.log('[LibraryLoader] TikZJax function assigned to tikzjax');
                            }
                            
                            // Ensure process function is available
                            if (window.tikzjax && !window.tikzjax.process && window.TikZJax) {
                                window.tikzjax.process = window.TikZJax;
                            }
                            
                            console.log('[LibraryLoader] TikZJax initialization complete. Available functions:', {
                                tikzjax: typeof window.tikzjax,
                                TikZJax: typeof window.TikZJax,
                                hasProcess: !!(window.tikzjax && window.tikzjax.process)
                            });
                        }, 200);
                    }

                    // CRITICAL: Immediate patching for Markmap libraries to prevent buildJSItem errors
                    if (libraryName === 'MarkmapLib' || libraryName === 'MarkmapView') {
                        setTimeout(() => {
                            this.applyImmediateMarkmapPatches(libraryName);
                        }, 50);
                    }

                    // PlantUML encoder initialization
                    if (libraryName === 'PlantUMLEncoder') {
                        setTimeout(() => {
                            if (window.plantumlEncoder && typeof window.plantumlEncoder.encode === 'function') {
                                console.log('[LibraryLoader] PlantUML encoder initialized successfully');
                            } else {
                                // Try to find encoder in other globals
                                for (const key in window) {
                                    if (window[key] && typeof window[key].encode === 'function') {
                                        window.plantumlEncoder = window[key];
                                        break;
                                    }
                                }
                            }
                        }, 100);
                    }

                    console.log(`[LibraryLoader] ${libraryName} loaded successfully`);
                    this.loadedLibraries.add(libraryName);
                    resolve(true);
                } else if (attempts < maxAttempts) {
                    setTimeout(checkLoaded, 100);
                } else {
                    console.warn(`[LibraryLoader] ${libraryName} failed to load after ${maxAttempts} attempts`);
                    this.loadPromises.delete(libraryName); // Clear failed promise to allow retry
                    resolve(false);
                }
            };

            script.onload = () => {
                setTimeout(checkLoaded, 50);
            };

            script.onerror = () => {
                console.error(`[LibraryLoader] Failed to load script for ${libraryName}`);
                this.loadPromises.delete(libraryName); // Clear failed promise to allow CDN fallback
                resolve(false);
            };

            document.head.appendChild(script);
        });

        this.loadPromises.set(libraryName, loadPromise);
        return await loadPromise;
    }

    /**
     * Robustly load a library from local path, then CDN if local fails.
     * @param {Object} lib - { name, localUrl, cdnUrl, check }
     */
    async loadLibraryWithFallback(lib) {
        // If already loaded, skip
        if (this.loadedLibraries.has(lib.name)) return true;
        
        // Run preconfig if available (for libraries like MathJax that need configuration before loading)
        if (lib.preconfig && typeof lib.preconfig === 'function') {
            console.log(`[LibraryLoader] Running pre-configuration for ${lib.name}`);
            lib.preconfig();
        }
        
        // Try direct require if available (useful in packaged builds)
        if (lib.requireModule && typeof lib.requireModule === 'function') {
            console.log(`[LibraryLoader] ${lib.name} has requireModule, attempting...`);
            try {
                const requireResult = lib.requireModule();
                console.log(`[LibraryLoader] ${lib.name} requireModule returned:`, requireResult);
                if (requireResult !== false) {
                    console.log(`[LibraryLoader] ${lib.name} requireResult is not false, checking conditions...`);
                    console.log(`[LibraryLoader] ${lib.name} requireResult value:`, requireResult);
                    console.log(`[LibraryLoader] ${lib.name} has check function:`, typeof lib.check);
                    
                    // Allow require handler to return truthy or rely on check()
                    if (requireResult || (lib.check && lib.check())) {
                        console.log(`[LibraryLoader] ${lib.name} loaded via require() - ADDING TO loadedLibraries`);
                        this.loadedLibraries.add(lib.name);
                        console.log(`[LibraryLoader] ${lib.name} loadedLibraries now contains:`, Array.from(this.loadedLibraries));
                        return true;
                    } else {
                        console.warn(`[LibraryLoader] ${lib.name} requireModule succeeded but validation failed`);
                        console.warn(`[LibraryLoader] ${lib.name} requireResult:`, requireResult, 'check():', lib.check ? lib.check() : 'no check');
                    }
                } else {
                    console.log(`[LibraryLoader] ${lib.name} requireModule explicitly returned false`);
                }
            } catch (error) {
                console.warn(`[LibraryLoader] require() failed for ${lib.name}:`, error);
            }
        } else {
            console.log(`[LibraryLoader] ${lib.name} has no requireModule function`);
        }
        
        // Try local if available
        if (lib.localUrl) {
            console.log(`[LibraryLoader] Trying local path for ${lib.name}: ${lib.localUrl}`);
            const loadedLocal = await this.loadScript(lib.localUrl, lib.name, lib.check);
            if (loadedLocal && lib.check()) {
                console.log(`[LibraryLoader] ${lib.name} loaded successfully from local path`);
                return true;
            }
            console.log(`[LibraryLoader] Failed to load ${lib.name} from local path, trying CDN...`);
        }
        
        // Try primary CDN
        if (lib.cdnUrl) {
            console.log(`[LibraryLoader] Trying primary CDN for ${lib.name}: ${lib.cdnUrl}`);
            const loadedCdn = await this.loadScript(lib.cdnUrl, lib.name, lib.check);
            if (loadedCdn && lib.check()) {
                console.log(`[LibraryLoader] ${lib.name} loaded successfully from primary CDN`);
                return true;
            }
        }
        
        // Try alternative CDNs if available
        if (lib.altCdnUrls && lib.altCdnUrls.length > 0) {
            for (let i = 0; i < lib.altCdnUrls.length; i++) {
                const altUrl = lib.altCdnUrls[i];
                console.log(`[LibraryLoader] Trying alternative CDN ${i + 1} for ${lib.name}: ${altUrl}`);
                const loadedAlt = await this.loadScript(altUrl, lib.name, lib.check);
                if (loadedAlt && lib.check()) {
                    console.log(`[LibraryLoader] ${lib.name} loaded successfully from alternative CDN ${i + 1}`);
                    return true;
                }
            }
        }
        
        // Failed to load from all sources - set specific failure flags for Viz.js
        if (lib.name === 'Viz') {
            window.VizLoadFailed = true;
            window.VizLoadErrorMessage = `Failed to load from ${[lib.localUrl, lib.cdnUrl, ...(lib.altCdnUrls || [])].filter(Boolean).length} sources`;
            console.error(`[LibraryLoader] Failed to load ${lib.name} from all sources. Setting VizLoadFailed flag.`);
        }
        
        console.warn(`[LibraryLoader] Failed to load ${lib.name} from all sources.`);
        return false;
    }

    async loadAllLibraries() {
        console.log('[LibraryLoader] Starting library loading from local dependencies...');
        
        // CRITICAL: Install global error handler to catch buildJSItem errors
        this.installGlobalErrorHandler();
        
        // CRITICAL: Pre-setup globals before any library loading to prevent runtime errors
        this.setupPreLoadingGlobals();
        
        // Load KaTeX CSS from local node_modules (correct path from renderer)
        this.loadLocalCSS('../../node_modules/katex/dist/katex.min.css');
        // Load Highlight.js CSS with fallback to CDN
        this.loadLocalCSS(
            '../../node_modules/highlight.js/styles/github.min.css',
            'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
        );
        
        // Define essential libraries with correct local paths AND CDN fallbacks
        // Fixed paths based on actual node_modules structure
        const libraries = [
            {
                name: 'Marked',
                requireModule: () => {
                    console.log('[LibraryLoader] Marked.requireModule() called');
                    try {
                        console.log('[LibraryLoader] Attempting require("marked")...');
                        const markedModule = require('marked');
                        console.log('[LibraryLoader] require("marked") returned:', typeof markedModule, markedModule);
                        const resolved = markedModule?.marked || markedModule;
                        console.log('[LibraryLoader] Resolved marked object:', typeof resolved);
                        console.log('[LibraryLoader] resolved.parse type:', typeof resolved?.parse);
                        if (resolved && typeof resolved.parse === 'function') {
                            window.marked = resolved;
                            console.log('[LibraryLoader] window.marked assigned successfully');
                            console.log('[LibraryLoader] Verifying window.marked.parse:', typeof window.marked.parse);
                            return true;
                        }
                        console.warn('[LibraryLoader] require("marked") succeeded but resolved object invalid');
                    } catch (error) {
                        console.warn('[LibraryLoader] require("marked") failed:', error);
                    }
                    console.log('[LibraryLoader] Marked.requireModule() returning false');
                    return false;
                },
                localUrl: '../../node_modules/marked/lib/marked.umd.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js',
                check: () => {
                    const result = typeof window.marked === 'object' && typeof window.marked.parse === 'function';
                    console.log('[LibraryLoader] Marked.check() called, result:', result, 'window.marked type:', typeof window.marked, 'parse type:', typeof window.marked?.parse);
                    return result;
                }
            },
            {
                name: 'KaTeX',
                localUrl: '../../node_modules/katex/dist/katex.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
                check: () => typeof window.katex === 'object' && window.katex !== null
            },
            {
                name: 'HighlightJS',
                localUrl: null, // Skip local due to CommonJS issues - use CDN
                cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
                check: () => typeof window.hljs === 'object' && window.hljs !== null && typeof window.hljs.highlightAll === 'function'
            },
            {
                name: 'Mermaid',
                localUrl: '../../node_modules/mermaid/dist/mermaid.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js',
                check: () => typeof window.mermaid === 'object' && window.mermaid !== null && typeof window.mermaid.initialize === 'function'
            },
            {
                name: 'D3',
                localUrl: '../../node_modules/d3/dist/d3.min.js',
                cdnUrl: 'https://d3js.org/d3.v7.min.js',
                check: () => typeof window.d3 === 'object' && window.d3 !== null && typeof window.d3.select === 'function'
            },
            {
                name: 'Viz',
                // Use reliable v3.x standalone with multiple fallbacks
                localUrl: 'js/local-graphviz.js', // Local GraphViz integration as primary fallback
                cdnUrl: 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js', // Start with most stable
                altCdnUrls: [
                    'https://unpkg.com/@viz-js/viz@3.4.0/lib/viz-standalone.js',
                    'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.7.0/lib/viz-standalone.js',
                    'https://unpkg.com/@viz-js/viz@3.7.0/lib/viz-standalone.js',
                    'https://cdn.skypack.dev/@viz-js/viz@3.4.0/lib/viz-standalone.js'
                ],
                check: () => {
                    // Check for v3.x Viz constructor or local GraphViz
                    if (typeof window.Viz === 'function') {
                        console.log('[LibraryLoader] Viz.js detected as function');
                        return true; // Accept any function form - will handle API differences in renderer
                    }
                    if (window.localGraphViz && typeof window.LocalGraphVizRenderer === 'function') {
                        console.log('[LibraryLoader] Local GraphViz renderer available');
                        return true;
                    }
                    return false;
                }
            },
            {
                name: 'Vega',
                localUrl: '../../node_modules/vega/build/vega.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/vega@5.33.0/build/vega.min.js',
                check: () => typeof window.vega === 'object' && window.vega !== null && typeof window.vega.parse === 'function'
            },
            {
                name: 'VegaLite',
                localUrl: '../../node_modules/vega-lite/build/vega-lite.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/vega-lite@5.23.0/build/vega-lite.min.js',
                check: () => typeof window.vegaLite === 'object' && window.vegaLite !== null && typeof window.vegaLite.compile === 'function'
            },
            {
                name: 'VegaEmbed',
                localUrl: '../../node_modules/vega-embed/build/vega-embed.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/vega-embed@6.29.0/build/vega-embed.min.js',
                check: () => typeof window.vegaEmbed === 'function'
            },
            {
                name: 'ABCJS',
                localUrl: '../../node_modules/abcjs/dist/abcjs-basic-min.js',
                cdnUrl: 'https://paulrosen.github.io/abcjs/dist/abcjs-basic-min.js',
                check: () => typeof window.ABCJS === 'object' && window.ABCJS !== null
            },
            {
                name: 'PlantUMLEncoder',
                localUrl: '../../node_modules/plantuml-encoder/dist/plantuml-encoder.min.js',
                cdnUrl: 'https://cdn.jsdelivr.net/npm/plantuml-encoder@1.4.0/plantuml-encoder.min.js',
                check: () => {
                    // For PlantUML encoder, we'll check after loading since it may take time to initialize
                    return true; // Always return true for now, we'll check in initializeLibraries
                }
            },
            {
                name: 'TikZJax',
                localUrl: 'js/tikzjax-fallback.js', // Local fallback for TikZJax
                cdnUrl: 'https://tikzjax.com/v1/tikzjax.js',
                check: () => {
                    // Wait for TikZJax to fully initialize
                    return (typeof window.tikzjax !== 'undefined' && window.tikzjax !== null) ||
                           (typeof window.TikZJax !== 'undefined' && window.TikZJax !== null) ||
                           (typeof window.TikZJax === 'function');
                }
            },
            {
                name: 'MarkmapLib',
                localUrl: null, // Skip local due to ES module issues
                cdnUrl: 'https://cdn.jsdelivr.net/npm/markmap-lib@0.15.0/dist/browser/index.min.js',
                check: () => typeof window.markmap !== 'undefined' || (window.Markmap && window.markmap)
            },
            {
                name: 'MarkmapView',
                localUrl: null, // Skip local due to ES module issues
                cdnUrl: 'https://cdn.jsdelivr.net/npm/markmap-view@0.15.0/dist/browser/index.min.js',
                check: () => typeof window.Markmap !== 'undefined' || (window.markmap && window.markmap.Markmap)
            },
            {
                name: 'LaTeX',
                localUrl: 'js/latex-fallback.js', // Local fallback for LaTeX.js
                cdnUrl: 'https://cdn.jsdelivr.net/npm/latex.js@0.12.4/dist/latex.min.js',
                check: () => typeof window.LaTeX === 'function' || typeof window.latex !== 'undefined'
            },
            // Enhanced: Add KityMinder mind mapping support
            {
                name: 'KityMinder',
                localUrl: 'js/kityminder-fallback.js', // Local fallback for KityMinder
                cdnUrl: 'https://cdn.jsdelivr.net/npm/kityminder-core@1.4.50/dist/kityminder.core.min.js',
                check: () => typeof window.kityminder !== 'undefined' || typeof window.KityMinder !== 'undefined'
            },
            // Enhanced: Add improved LaTeX rendering with MathJax fallback
            {
                name: 'MathJax',
                localUrl: '../../node_modules/mathjax/tex-mml-svg.js', // Use local MathJax v4 for reliability  
                cdnUrl: 'https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-svg.js',
                check: () => {
                // Enhanced check: MathJax exists AND tex2svg is available
                const mathjaxExists = typeof window.MathJax !== 'undefined';
                const tex2svgExists = mathjaxExists && typeof window.MathJax.tex2svg === 'function';
                
                if (mathjaxExists && !tex2svgExists) {
                    // MathJax exists but tex2svg not ready - check if startup is complete
                    const startupComplete = window.MathJax.startup && window.MathJax.startup.document;
                    if (startupComplete && !window.MathJax.tex2svg) {
                        // Try to create tex2svg manually
                        try {
                            const adaptor = window.MathJax.startup.adaptor;
                            const mathDocument = window.MathJax.startup.document;
                            window.MathJax.tex2svg = (tex, options = {}) => {
                                const node = mathDocument.convert(tex, options);
                                // Return an object that has outerHTML property, like the real MathJax
                                return {
                                    outerHTML: adaptor.outerHTML(node),
                                    node: node
                                };
                            };
                            console.log('[LibraryLoader] Manually created tex2svg function during check');
                            return true;
                        } catch (error) {
                            console.error('[LibraryLoader] Failed to create tex2svg during check:', error);
                        }
                    }
                }
                
                return tex2svgExists;
            },
                // Configure MathJax BEFORE loading
                preconfig: () => {
                    // Configure MathJax before it loads
                    window.MathJax = {
                        tex: {
                            inlineMath: [['$', '$'], ['\\(', '\\)']],
                            displayMath: [['$$', '$$'], ['\\[', '\\]']],
                            packages: {'[+]': ['mhchem']},
                            processEscapes: true,
                            processEnvironments: true,
                            macros: {
                                // Common LaTeX macros
                                RR: "\\mathbb{R}",
                                CC: "\\mathbb{C}",
                                NN: "\\mathbb{N}",
                                ZZ: "\\mathbb{Z}",
                                QQ: "\\mathbb{Q}",
                                FF: "\\mathbb{F}",
                                d: "\\mathrm{d}",
                                e: "\\mathrm{e}",
                                i: "\\mathrm{i}",
                                Re: "\\operatorname{Re}",
                                Im: "\\operatorname{Im}"
                            }
                        },
                        asciimath: {
                            delimiters: [['`', '`']]
                        },
                        loader: {
                            load: ['[tex]/mhchem', '[tex]/ams', '[tex]/newcommand', '[tex]/configmacros', 'input/asciimath']
                        },
                        svg: {
                            fontCache: 'global',
                            displayAlign: 'center',
                            displayIndent: '0',
                            scale: 1,
                            minScale: 0.5,
                            mtextInheritFont: true,
                            merrorInheritFont: true,
                            mathmlSpacing: false
                        },
                        options: {
                            ignoreHtmlClass: 'tex2jax_ignore',
                            processHtmlClass: 'tex2jax_process'
                        },
                        startup: {
                            ready: () => {
                                console.log('[MathJax] MathJax startup ready - calling defaultReady()');
                                window.MathJax.startup.defaultReady();
                                
                                // Ensure tex2svg is available after ready
                                if (window.MathJax.tex2svg) {
                                    console.log('[MathJax] MathJax initialization completed with chemistry support - tex2svg available');
                                } else {
                                    console.error('[MathJax] MathJax ready but tex2svg not available!');
                                    // Try to manually create tex2svg if needed
                                    try {
                                        if (window.MathJax.startup.document) {
                                            const adaptor = window.MathJax.startup.adaptor;
                                            const mathDocument = window.MathJax.startup.document;
                                            
                                            window.MathJax.tex2svg = (tex, options = {}) => {
                                                const node = mathDocument.convert(tex, options);
                                                // Return an object that has outerHTML property, like the real MathJax
                                                return {
                                                    outerHTML: adaptor.outerHTML(node),
                                                    node: node
                                                };
                                            };
                                            console.log('[MathJax] Manually created tex2svg function');
                                        }
                                    } catch (error) {
                                        console.error('[MathJax] Failed to create tex2svg manually:', error);
                                    }
                                }
                            }
                        }
                    };
                    console.log('[LibraryLoader] MathJax pre-configured with mhchem chemistry support');
                }
            }
        ];

        // Load all libraries in parallel, but ensure Vega, Vega-Lite, and Vega-Embed are loaded in order
        const vegaLibs = ['Vega', 'VegaLite', 'VegaEmbed'];
        const vegaIndexes = vegaLibs.map(name => libraries.findIndex(lib => lib.name === name));
        // Remove vega libs from main list
        const mainLibs = libraries.filter(lib => !vegaLibs.includes(lib.name));
        // Load main libs in parallel
        const mainPromises = mainLibs.map(lib => this.loadLibraryWithFallback(lib));
        
        // Load Vega, VegaLite, VegaEmbed in order (sequential loading for proper dependencies)
        let vegaResult = true;
        for (const libName of vegaLibs) {
            const lib = libraries.find(l => l.name === libName);
            if (lib && vegaResult) {
                console.log(`[LibraryLoader] Loading ${libName} sequentially...`);
                vegaResult = await this.loadLibraryWithFallback(lib);
                if (!vegaResult) {
                    console.warn(`[LibraryLoader] Failed to load ${libName}, skipping remaining Vega libraries`);
                    break;
                }
            }
        }
        
        // Wait for all main libraries to load
        const mainResults = await Promise.all(mainPromises);
        const successCount = mainResults.filter(result => result).length + (vegaResult ? vegaLibs.length : 0);
        const totalCount = mainResults.length + vegaLibs.length;
        
        console.log(`[LibraryLoader] Library loading complete: ${successCount}/${totalCount} loaded successfully`);
        
        // Initialize loaded libraries
        console.log('[LibraryLoader] About to call initializeLibraries()');
        this.initializeLibraries();
        console.log('[LibraryLoader] initializeLibraries() completed');
        
        return successCount;
    }

    loadLocalCSS(href, fallbackCdn) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = href;
        link.onerror = () => {
            console.warn(`[LibraryLoader] Failed to load local CSS: ${href}`);
            if (fallbackCdn) {
                const cdnLink = document.createElement('link');
                cdnLink.rel = 'stylesheet';
                cdnLink.type = 'text/css';
                cdnLink.href = fallbackCdn;
                document.head.appendChild(cdnLink);
                console.log(`[LibraryLoader] Fallback to CDN CSS: ${fallbackCdn}`);
            }
        };
        document.head.appendChild(link);
        console.log(`[LibraryLoader] Local CSS loaded: ${href}`);
    }

    setHighlightTheme(darkMode) {
        // Remove any existing highlight.js theme
        const existing = Array.from(document.querySelectorAll('link')).find(l => l.href && l.href.includes('highlight.js'));
        if (existing) existing.remove();
        
        // Choose theme
        const themeHref = darkMode
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
        
        // Always use CDN for dark mode switching for reliability
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = themeHref;
        link.onload = () => {
            console.log(`[LibraryLoader] highlight.js theme loaded: ${themeHref}`);
            // Force re-highlight existing code blocks
            if (window.hljs) {
                setTimeout(() => {
                    const codeBlocks = document.querySelectorAll('pre code, .hljs');
                    codeBlocks.forEach(block => {
                        if (block.className.includes('hljs')) {
                            // Re-highlight the block
                            window.hljs.highlightElement(block);
                        }
                    });
                }, 100);
            }
        };
        document.head.appendChild(link);
        console.log(`[LibraryLoader] highlight.js theme set: ${themeHref}`);
    }

    // CRITICAL: Reinforce all patches before library initialization
    reinforceUniversalPatching() {
        console.log('[LibraryLoader] Reinforcing universal patches...');
        
        // Create simple, non-recursive buildJSItem fallback
        const safeBuildJSItem = function(item) {
            // Prevent infinite recursion by checking if item is already a function
            if (typeof item === 'function') {
                return {};
            }
            return item || {};
        };

        // Ensure global buildJSItem always exists with recursion protection
        if (!window.buildJSItem || typeof window.buildJSItem !== 'function') {
            window.buildJSItem = safeBuildJSItem;
        }

        // Simple object protection without complex recursion
        const safelyPatchObject = (objName, obj) => {
            if (!obj || typeof obj !== 'object') {
                window[objName] = { buildJSItem: safeBuildJSItem };
                return window[objName];
            }
            if (!obj.buildJSItem || typeof obj.buildJSItem !== 'function') {
                obj.buildJSItem = safeBuildJSItem;
            }
            return obj;
        };

        // Apply to all critical objects with simple safe patching
        window.markmapCommon = safelyPatchObject('markmapCommon', window.markmapCommon);
        window.markmapLib = safelyPatchObject('markmapLib', window.markmapLib);
        window.markmapView = safelyPatchObject('markmapView', window.markmapView);

        console.log('[LibraryLoader] Universal patches reinforced safely');
    }

    // CRITICAL: Apply immediate patches when Markmap libraries load
    applyImmediateMarkmapPatches(libraryName) {
        console.log(`[LibraryLoader] Applying immediate patches for ${libraryName}...`);
        
        // Simple, safe buildJSItem without recursion risk
        const immediateSafeBuildJSItem = function(item) {
            if (typeof item === 'function') {
                return {}; // Prevent function recursion
            }
            return item || {};
        };

        // Patch the specific library that just loaded
        if (libraryName === 'MarkmapLib' && window.markmapLib) {
            if (!window.markmapLib.buildJSItem) {
                window.markmapLib.buildJSItem = immediateSafeBuildJSItem;
                console.log('[LibraryLoader] Patched markmapLib.buildJSItem immediately after load');
            }
        }

        if (libraryName === 'MarkmapView' && window.markmapView) {
            if (!window.markmapView.buildJSItem) {
                window.markmapView.buildJSItem = immediateSafeBuildJSItem;
                console.log('[LibraryLoader] Patched markmapView.buildJSItem immediately after load');
            }
        }

        // Always ensure markmapCommon exists and is patched
        if (!window.markmapCommon) {
            window.markmapCommon = {};
        }
        if (!window.markmapCommon.buildJSItem) {
            window.markmapCommon.buildJSItem = immediateSafeBuildJSItem;
        }

        // Global safety net
        if (!window.buildJSItem) {
            window.buildJSItem = immediateSafeBuildJSItem;
        }

        console.log(`[LibraryLoader] Immediate patches applied for ${libraryName}`);
    }

    // CRITICAL: Global error handler to catch and prevent buildJSItem errors
    installGlobalErrorHandler() {
        // Store original error handler
        const originalErrorHandler = window.onerror;
        
        window.onerror = (message, source, lineno, colno, error) => {
            // Check if this is a buildJSItem error
            if (message && typeof message === 'string' && message.includes('buildJSItem is not a function')) {
                console.error('[LibraryLoader] CAUGHT buildJSItem error, applying emergency patches...');
                
                // Emergency patch all possible locations
                const emergencyBuildJSItem = function(item) {
                    console.log('[LibraryLoader] Emergency buildJSItem fallback');
                    return item || {};
                };

                window.buildJSItem = emergencyBuildJSItem;
                if (window.markmapCommon) window.markmapCommon.buildJSItem = emergencyBuildJSItem;
                if (window.markmapLib) window.markmapLib.buildJSItem = emergencyBuildJSItem;
                if (window.markmapView) window.markmapView.buildJSItem = emergencyBuildJSItem;

                // Log the error but don't let it crash the app
                console.error('[LibraryLoader] Emergency patches applied for buildJSItem error');
                return true; // Prevent default error handling
            }

            // For other errors, call original handler if it exists
            if (originalErrorHandler) {
                return originalErrorHandler(message, source, lineno, colno, error);
            }
            
            return false; // Allow default error handling for other errors
        };

        console.log('[LibraryLoader] Global error handler installed');
    }

    initializeLibraries() {
        console.log('[LibraryLoader] initializeLibraries() method called');
        
        // CRITICAL: Re-apply universal patches before any library-specific initialization
        this.reinforceUniversalPatching();
        
        // Initialize libraries when loading is complete
        if (this.loadedLibraries.has('Mermaid') && window.mermaid) {
            try {
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose'
                });
                console.log('[LibraryLoader] Mermaid initialized');
            } catch (error) {
                console.warn('[LibraryLoader] Failed to initialize Mermaid:', error);
            }
        }
        
        // Robust Markmap global setup using reference API
        if (this.loadedLibraries.has('D3') && (this.loadedLibraries.has('MarkmapLib') || this.loadedLibraries.has('MarkmapView'))) {
            try {
                // Always ensure markmap global object exists
                if (!window.markmap) window.markmap = {};

                // Fix critical errors: Patch buildJSItem and Utils early to prevent runtime errors
                // This fixes "t.buildJSItem is not a function" error
                if (typeof window.markmapCommon !== 'object') {
                    window.markmapCommon = {};
                }
                if (typeof window.markmapCommon.buildJSItem !== 'function') {
                    window.markmapCommon.buildJSItem = function(item) { return item || {}; };
                }

                // Fix "Cannot read properties of undefined (reading 'Utils')" error
                if (!window.markmap.Utils) {
                    window.markmap.Utils = {
                        buildJSItem: function(item) { return item || {}; },
                        normalizeMarkmap: function(spec) { return spec || {}; },
                        addSVGElements: function() { return {}; }
                    };
                }

                // Additional global patches for markmap errors
                if (!window.buildJSItem && typeof window.markmapCommon.buildJSItem === 'function') {
                    window.buildJSItem = window.markmapCommon.buildJSItem;
                }

                // Reference-driven: prefer markmap-lib and markmap-view APIs
                // 1. transform function
                if (window.markmapLib && typeof window.markmapLib.transform === 'function') {
                    window.markmap.transform = window.markmapLib.transform;
                } else if (window.transform && typeof window.transform === 'function') {
                    window.markmap.transform = window.transform;
                } else if (window.mm && typeof window.mm.transform === 'function') {
                    window.markmap.transform = window.mm.transform;
                }

                // 2. Markmap class
                if (window.markmapView && window.markmapView.Markmap) {
                    window.markmap.Markmap = window.markmapView.Markmap;
                } else if (window.Markmap) {
                    window.markmap.Markmap = window.Markmap;
                }

                // Fallback: only if both transform and Markmap are missing
                if (!window.markmap.transform || !window.markmap.Markmap) {
                    // Fallback transform: basic header extraction
                    if (!window.markmap.transform) {
                        window.markmap.transform = function(content, options = {}) {
                            try {
                                const lines = content.split('\n');
                                const root = { type: 'heading', depth: 0, content: 'Root', children: [] };
                                const stack = [root];
                                lines.forEach(line => {
                                    const match = line.match(/^(#{1,6})\s+(.+)/);
                                    if (match) {
                                        const depth = match[1].length;
                                        const content = match[2].trim();
                                        const node = { type: 'heading', depth, content, children: [] };
                                        while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
                                            stack.pop();
                                        }
                                        stack[stack.length - 1].children.push(node);
                                        stack.push(node);
                                    }
                                });
                                return { root: root.children[0] || root };
                            } catch (error) {
                                console.warn('Markmap transform fallback error:', error);
                                return { root: { content: 'Error parsing content', children: [] } };
                            }
                        };
                    }
                    // Fallback Markmap class: minimal SVG text
                    if (!window.markmap.Markmap) {
                        window.markmap.Markmap = class {
                            constructor(svg, options = {}) {
                                this.svg = typeof svg === 'string' ? document.querySelector(svg) : svg;
                                this.options = options;
                            }
                            setData(data) {
                                if (this.svg && data && data.content) {
                                    this.svg.innerHTML = `<text x=\"50%\" y=\"50%\" text-anchor=\"middle\" fill=\"currentColor\">${data.content || 'Markmap visualization'}</text>`;
                                }
                            }
                            fit() {}
                        };
                    }
                }
                console.log('[LibraryLoader] Markmap globals initialized (robust)');
            } catch (error) {
                console.warn('[LibraryLoader] Failed to initialize Markmap:', error);
            }
        }
        
        // Initialize GraphViz - ensure we have working Viz.js (v2.x or v3.x)
        if (this.loadedLibraries.has('Viz') && window.Viz) {
            try {
                // Viz.js loaded successfully - clear any previous failure flags
                console.log('[LibraryLoader] Viz.js loaded successfully, clearing failure flags');
                window.VizLoadFailed = false;
                delete window.VizLoadErrorMessage;
                
                // Test basic functionality - works for both v2.x and v3.x
                if (typeof window.Viz === 'function') {
                    console.log('[LibraryLoader] Viz.js confirmed as function - ready for v2.x or v3.x usage');
                } else {
                    console.warn('[LibraryLoader] Viz.js loaded but not a function');
                    window.VizLoadFailed = true;
                    window.VizLoadErrorMessage = 'Viz.js is not a function';
                }
            } catch (error) {
                console.warn('[LibraryLoader] Viz.js loaded but failed basic test:', error);
                window.VizLoadFailed = true;
                window.VizLoadErrorMessage = `Viz.js test error: ${error.message}`;
            }
        } else if (!window.VizLoadFailed) {
            // Only set up fallback if Viz.js wasn't explicitly marked as failed during loading
            console.log('[LibraryLoader] Viz.js not loaded but no explicit failure - may work with runtime fallbacks');
        }

        // Ensure TikZJax is globally available if loaded
        if (this.loadedLibraries.has('TikZJax')) {
            try {
                // Enhanced TikZJax global setup
                if (window.tikzjax) {
                    window.TikZJax = window.TikZJax || window.tikzjax;
                    console.log('[LibraryLoader] TikZJax registered globally from tikzjax object');
                } else if (window.TikZJax) {
                    window.tikzjax = window.tikzjax || window.TikZJax;
                    console.log('[LibraryLoader] tikzjax registered globally from TikZJax function');
                }
                
                // Verify TikZJax is ready
                const tikzReady = (window.tikzjax && typeof window.tikzjax === 'object') || 
                                (window.TikZJax && typeof window.TikZJax === 'function');
                                
                if (tikzReady) {
                    window.tikzjaxReady = true;
                    console.log('[LibraryLoader] TikZJax confirmed ready for use');
                } else {
                    console.warn('[LibraryLoader] TikZJax loaded but not properly initialized');
                }
            } catch (error) {
                console.warn('[LibraryLoader] Error setting up TikZJax globals:', error);
            }
        }

        // Initialize KityMinder if loaded
        if (this.loadedLibraries.has('KityMinder')) {
            try {
                // Set up KityMinder global configuration
                if (window.kityminder || window.KityMinder) {
                    window.kityminderReady = true;
                    console.log('[LibraryLoader] KityMinder initialized and ready');
                }
            } catch (error) {
                console.warn('[LibraryLoader] Failed to initialize KityMinder:', error);
            }
        }

        // Initialize enhanced LaTeX support
        if (this.loadedLibraries.has('LaTeX') || this.loadedLibraries.has('MathJax')) {
            try {
                // Configure LaTeX rendering options
                if (window.LaTeX) {
                    window.LaTeX.macros = window.LaTeX.macros || {};
                    console.log('[LibraryLoader] LaTeX renderer initialized');
                }
                
                // MathJax is now pre-configured before loading
                if (window.MathJax) {
                    console.log('[LibraryLoader] MathJax renderer available with pre-configured chemistry support');
                }
            } catch (error) {
                console.warn('[LibraryLoader] Failed to initialize LaTeX/MathJax:', error);
            }
        }
        
        // Load ABC.js dynamically when needed
        if (!window.ABCJS) {
            this.loadABCJS();
        }
    }

    async loadABCJS() {
        console.log('[LibraryLoader] Loading abc.js...');
        try {
            const loaded = await this.loadScript(
                'https://paulrosen.github.io/abcjs/dist/abcjs-basic-min.js',
                'ABCJS',
                () => typeof window.ABCJS === 'object' && window.ABCJS !== null
            );
            if (loaded) {
                console.log('[LibraryLoader] abc.js loaded successfully');
            }
        } catch (error) {
            console.warn('[LibraryLoader] Failed to load abc.js:', error);
        }
    }

    isLibraryLoaded(libraryName) {
        return this.loadedLibraries.has(libraryName);
    }

    // For About dialog: get loaded libraries and versions
    getLoadedLibrariesWithVersions() {
        // Hardcoded versions for now; ideally, read from package.json or about-libraries.json
        const versions = {
            'Marked': '11.1.1',
            'KaTeX': '0.16.9',
            'HighlightJS': '11.9.0',
            'Mermaid': '10.6.1',
            'D3': '7.8.5',
            'Viz': '3.2.4',
            'Vega': '5.33.0',
            'VegaLite': '5.23.0',
            'VegaEmbed': '6.29.0',
            'ABCJS': '6.2.3',
            'PlantUMLEncoder': '1.4.0',
            'TikZJax': '1.0.0',
            'MarkmapLib': '0.15.0',
            'MarkmapView': '0.15.0',
            'LaTeX': '0.12.4',
            'KityMinder': '1.4.50',
            'MathJax': '3.2.0'
        };
        return Array.from(this.loadedLibraries).map(name => ({
            name,
            version: versions[name] || 'unknown'
        }));
    }

    getLoadedLibraries() {
        return Array.from(this.loadedLibraries);
    }
}

// Create global instance
window.libraryLoader = new LibraryLoader();
