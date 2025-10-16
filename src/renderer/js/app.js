class MarkDDApp {
    constructor() {
        // SINGLETON PROTECTION: Prevent multiple instances of the app
        // This fixes the "two tabs but only one real" issue caused by duplicate initialization
        if (window.__markddAppInstance) {
            console.warn('[App] MarkDDApp instance already exists - returning existing instance');
            console.warn('[App] This prevents duplicate initialization and tab duplication');
            return window.__markddAppInstance;
        }
        
        console.log('[App] Creating new MarkDDApp instance (first/only instance)');
        window.__markddAppInstance = this;
        
        this.editor = null;
        this.renderer = null;
        this.preview = null;
        this.markmapIntegration = null;
        this.kityMinderIntegration = null;
        this.tikzIntegration = null;
        this.latexIntegration = null;
        
        // Tab system
        this.tabManager = null;
        this.tabUI = null;
        
        this.viewMode = 'split'; // 'split', 'editor', 'preview'
        this.isLivePreview = localStorage.getItem('live-preview-enabled') !== 'false'; // Default to true
        this.syncScroll = localStorage.getItem('sync-scroll-enabled') !== 'false'; // Default to true
        
        // Guard flags to prevent duplicate dialogs
        this._openingFile = false;
        this._exportingHTML = false;
        this._exportingPDF = false;
        
        // Prevent multiple initialization calls
        this.initialUpdateTriggered = false;
        
        this.init();
    }

    async init() {
        try {
            this.logInfo('App', 'Initializing MarkDD Editor...');
            
            // Initialize zoom levels first
            this.editorZoom = 1;
            this.previewZoom = 1;
            this.minZoom = 0.6;
            this.maxZoom = 2.0;
            this.zoomStep = 0.1;
            
            // Add global error handlers
            this.setupGlobalErrorHandlers();
            
            // Setup theme system first (needed for UI)
            this.setupThemeSystem();
            
            // Setup math engine system (needed before renderer initialization)
            this.setupMathEngineSystem();
            
            // Check if all required libraries are loaded
            await this.checkDependencies();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup UI
            this.setupUI();
            this.setupEventListeners();
            this.setupMenuHandlers();
            this.setupMenuBar();
            this.setupToolbar();
            this.setupZoomHandlers();
            
            // Initialize tab system AFTER UI is ready (DOM elements must exist first)
            await this.initializeTabSystem();
            
            // Setup autosave settings AFTER UI is ready (default OFF, read from localStorage)
            this.setupAutosaveSettings();
            
            // Setup drag and drop
            this.setupDragDrop();
            
        // Setup splitter
        this.setupSplitter();
        
            // Initialize fullscreen state
            await this.initializeFullscreenState();
            
            // Initial UI update
            this.updateUI();        // Trigger initial preview update to ensure content appears
        this.triggerInitialPreviewUpdate();
        
        this.logInfo('App', 'MarkDD Editor initialized successfully');
        
        // Check for startup file (from file association or command line)
        this.checkStartupFile();
            
        } catch (error) {
            this.logError('App Init', error);
            this.showError('Failed to initialize editor: ' + error.message);
        }
    }
    
    async checkStartupFile() {
        try {
            console.log('[App] checkStartupFile: Checking for startup file...');
            
            if (typeof require !== 'undefined') {
                console.log('[App] checkStartupFile: require is available');
                const { ipcRenderer } = require('electron');
                console.log('[App] checkStartupFile: ipcRenderer loaded');
                
                // Listen for file open events from system
                ipcRenderer.on('open-file-from-system', async (event, filePath) => {
                    console.log('[App] open-file-from-system event received:', filePath);
                    try {
                        // Read the file content using Node.js fs module
                        const fs = require('fs');
                        const content = fs.readFileSync(filePath, 'utf-8');
                        console.log('[App] File read successfully, length:', content.length);
                        await this.openFile(filePath, content);
                    } catch (error) {
                        console.error('[App] Error reading file:', error);
                        this.showError('Failed to open file: ' + error.message);
                    }
                });
                console.log('[App] checkStartupFile: Registered open-file-from-system listener');
                
                // Check if there's a file to open on startup
                console.log('[App] checkStartupFile: Invoking get-startup-file IPC...');
                const result = await ipcRenderer.invoke('get-startup-file');
                console.log('[App] checkStartupFile: IPC result:', result);
                
                if (result.success && result.filePath) {
                    console.log('[App] checkStartupFile: File found, will open after 500ms delay:', result.filePath);
                    setTimeout(async () => {
                        console.log('[App] checkStartupFile: Opening file now:', result.filePath);
                        try {
                            // Read the file content using Node.js fs module
                            const fs = require('fs');
                            const content = fs.readFileSync(result.filePath, 'utf-8');
                            console.log('[App] File read successfully, length:', content.length);
                            await this.openFile(result.filePath, content);
                        } catch (error) {
                            console.error('[App] Error reading startup file:', error);
                            this.showError('Failed to open startup file: ' + error.message);
                        }
                    }, 500); // Small delay to ensure UI is fully ready
                } else {
                    console.log('[App] checkStartupFile: No startup file to open');
                }
            } else {
                console.log('[App] checkStartupFile: require is not available (not in Electron context)');
            }
        } catch (error) {
            console.error('[App] checkStartupFile: Error occurred:', error);
            this.logError('CheckStartupFile', error);
        }
    }

    setupGlobalErrorHandlers() {
        // Handle uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.logError('Global Error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logError('Unhandled Rejection', event.reason);
            event.preventDefault(); // Prevent browser default behavior
        });
        
        // Add global helper functions
        this.setupGlobalHelpers();
    }

    setupGlobalHelpers() {
        // Global function for GraphViz source toggle
        window.toggleGraphvizSource = function(button) {
            const container = button.closest('.graphviz-diagram');
            if (container) {
                const sourceElement = container.querySelector('.diagram-source');
                if (sourceElement) {
                    sourceElement.classList.toggle('hidden');
                    button.textContent = sourceElement.classList.contains('hidden') ? 'Show Source' : 'Hide Source';
                }
            }
        };
    }

    async checkDependencies() {
        this.logInfo('App', 'Checking dependencies...');
        
        if (!window.libraryLoader) {
            throw new Error('LibraryLoader not available');
        }

        const loadedLibraries = window.libraryLoader.getLoadedLibraries();
        
        this.logInfo('App', `Libraries loaded: ${loadedLibraries.join(', ')}`);

        // Check for minimum required libraries
        const requiredLibraries = ['Marked', 'KaTeX'];
        const missingRequired = requiredLibraries.filter(lib => !loadedLibraries.includes(lib));
        
        if (missingRequired.length > 0) {
            throw new Error(`Missing required libraries: ${missingRequired.join(', ')}. Please check your internet connection.`);
        }
        
        this.logInfo('App', 'All required dependencies are available');
    }

    logError(context, error) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ERROR in ${context}:`, error);
        
        // Store error for debugging
        if (!window.markddErrors) window.markddErrors = [];
        window.markddErrors.push({ timestamp, context, error });
    }

    logInfo(context, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] INFO in ${context}:`, message);
    }

    async initializeComponents() {
        try {
            this.logInfo('Components', 'Initializing markdown renderer...');
            this.renderer = new MarkdownRenderer();
            
            // CRITICAL FIX: Expose renderer globally for KityMinder buttons (editKityMinder, viewKityMinderJSON)
            window.markdownRenderer = this.renderer;
            
            // Set the math engine preference if it's already been initialized
            if (this.currentMathEngine) {
                this.renderer.setMathEngine(this.currentMathEngine);
            }
            
            await this.waitForRenderer();
            console.log('⚡⚡⚡ [App] waitForRenderer() COMPLETED ⚡⚡⚡');
            this.logInfo('Components', 'Markdown renderer initialized');
            console.log('⚡⚡⚡ [App] Logged renderer initialization ⚡⚡⚡');
            
            console.log('⚡⚡⚡ [App] ABOUT TO START EDITOR INITIALIZATION ⚡⚡⚡');
            this.logInfo('Components', 'Initializing editor...');
            const editorElement = document.getElementById('editor');
            if (!editorElement) {
                throw new Error('Editor element not found');
            }
            
            // Check if Editor class is available
            if (typeof Editor === 'undefined') {
                console.error('[App] Editor class not defined - waiting for script to load...');
                // Wait for Editor to be available
                let attempts = 0;
                while (typeof Editor === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (typeof Editor === 'undefined') {
                    throw new Error('Editor class failed to load after 5 seconds');
                }
                console.log('[App] Editor class now available after waiting');
            }
            
            console.log('[App] ⚡⚡⚡ ABOUT TO CREATE NEW EDITOR INSTANCE ⚡⚡⚡');
            console.log('[App] editorElement:', editorElement);
            console.log('[App] Editor class type:', typeof Editor);
            console.log('[App] Editor constructor:', Editor);
            
            try {
                console.log('[App] 🔥🔥🔥 CALLING NEW EDITOR() NOW 🔥🔥🔥');
                this.editor = new Editor(editorElement);
                console.log('[App] 🎉🎉🎉 EDITOR CONSTRUCTOR COMPLETED 🎉🎉🎉');
            } catch (error) {
                console.error('[App] 💥💥💥 EDITOR CONSTRUCTOR FAILED:', error);
                console.error('[App] Stack trace:', error.stack);
                throw error;
            }
            
            console.log('[App] ⚡⚡⚡ EDITOR INSTANCE CREATED SUCCESSFULLY ⚡⚡⚡');
            this.logInfo('Components', 'Editor initialized');
            
            this.logInfo('Components', 'Initializing preview...');
            const previewElement = document.getElementById('preview');
            if (!previewElement) {
                throw new Error('Preview element not found');
            }
            
            // Check if Preview class is available
            if (typeof Preview === 'undefined') {
                console.error('[App] Preview class not defined - waiting for script to load...');
                // Wait for Preview to be available
                let attempts = 0;
                while (typeof Preview === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (typeof Preview === 'undefined') {
                    throw new Error('Preview class failed to load after 5 seconds');
                }
                console.log('[App] Preview class now available after waiting');
            }
            
            this.preview = new Preview(previewElement, this.renderer);
            this.logInfo('Components', 'Preview initialized');
            
            this.logInfo('Components', 'Initializing file browser...');
            
            // Check if FileBrowser class is available
            if (typeof FileBrowser === 'undefined') {
                console.error('[App] FileBrowser class not defined - waiting for script to load...');
                // Wait for FileBrowser to be available
                let attempts = 0;
                while (typeof FileBrowser === 'undefined' && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (typeof FileBrowser === 'undefined') {
                    throw new Error('FileBrowser class failed to load after 5 seconds');
                }
                console.log('[App] FileBrowser class now available after waiting');
            }
            
            this.fileBrowser = new FileBrowser();
            this.logInfo('Components', 'File browser initialized');
            
            this.logInfo('Components', 'Tab system will be initialized after UI setup');
            
            this.logInfo('Components', 'Initializing integrations...');
            
            // Wait for integration classes to be available
            await this.waitForIntegrationClasses();
            
            // Prefer enhanced markmap implementation if available
            if (window.EnhancedMarkmapIntegration) {
                this.markmapIntegration = new EnhancedMarkmapIntegration();
                this.logInfo('Components', 'Using enhanced Markmap integration');
                // Initialize markmap integration
                await this.markmapIntegration.init();
            } else if (window.MarkmapIntegration) {
                this.markmapIntegration = new MarkmapIntegration();
                this.logInfo('Components', 'Using standard Markmap integration');
                // Standard markmap integration initializes automatically in constructor
            } else {
                this.logError('Components', 'No Markmap integration class available');
                // Create a stub to prevent errors
                this.markmapIntegration = {
                    showMarkmapFromEditor: () => console.warn('Markmap integration not available')
                };
            }
            
            if (window.TikZIntegration) {
                this.tikzIntegration = new TikZIntegration();
                this.logInfo('Components', 'TikZ integration loaded');
            } else {
                this.logError('Components', 'TikZ integration not available');
                this.tikzIntegration = {
                    insertTikZTemplate: () => console.warn('TikZ integration not available'),
                    isReady: () => true
                };
            }
            
            // Initialize KityMinder integration
            if (window.KityMinderIntegration) {
                this.kityMinderIntegration = new KityMinderIntegration();
                await this.kityMinderIntegration.init();
                window.kityMinderIntegration = this.kityMinderIntegration; // For dialog callbacks
                this.logInfo('Components', 'KityMinder integration initialized');
            } else {
                this.logError('Components', 'KityMinder integration not available');
                this.kityMinderIntegration = {
                    newMindmap: () => console.warn('KityMinder integration not available'),
                    isReady: () => false
                };
            }

            // Initialize enhanced LaTeX integration
            if (window.LaTeXIntegration) {
                this.latexIntegration = new LaTeXIntegration();
                await this.latexIntegration.init();
                this.logInfo('Components', 'Enhanced LaTeX integration initialized');
            } else {
                this.logError('Components', 'LaTeX integration not available');
                this.latexIntegration = {
                    renderDocument: () => '<div class="latex-error">LaTeX integration not available</div>',
                    isReady: () => false
                };
            }
            
            await this.waitForIntegrations();
            this.logInfo('Components', 'All integrations initialized');
            
        } catch (error) {
            this.logError('Components', error);
            throw error;
        }
    }

    async waitForRenderer() {
        console.log('⚡⚡⚡ [App] waitForRenderer() STARTED ⚡⚡⚡');
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            console.log(`[App] waitForRenderer attempt ${attempts}: renderer=${!!this.renderer}`);
            if (this.renderer) {
                console.log('⚡⚡⚡ [App] waitForRenderer() COMPLETED - renderer exists (lazy initialization) ⚡⚡⚡');
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('⚡⚡⚡ [App] waitForRenderer() TIMEOUT after 5 seconds ⚡⚡⚡');
            console.warn('Renderer creation may have timed out');
        }
    }

    async waitForIntegrationClasses() {
        let attempts = 0;
        const maxAttempts = 30; // Wait up to 3 seconds
        
        while (attempts < maxAttempts) {
            const hasMarkmap = window.EnhancedMarkmapIntegration || window.MarkmapIntegration;
            const hasTikz = window.TikZIntegration;
            const hasLatex = window.LaTeXIntegration;
            const hasKityMinder = window.KityMinderIntegration;
            
            if (hasMarkmap && hasTikz && hasLatex && hasKityMinder) {
                this.logInfo('Components', 'All integration classes are available');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        this.logInfo('Components', 
            `Integration classes status after waiting: ` +
            `Markmap=${!!window.EnhancedMarkmapIntegration || !!window.MarkmapIntegration}, ` +
            `TikZ=${!!window.TikZIntegration}, ` +
            `LaTeX=${!!window.LaTeXIntegration}, ` +
            `KityMinder=${!!window.KityMinderIntegration}`
        );
    }

    async waitForIntegrations() {
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const markmapReady = window.EnhancedMarkmapIntegration || window.MarkmapIntegration;
            const tikzReady = window.TikZIntegration && this.tikzIntegration && this.tikzIntegration.isReady();
            
            if (markmapReady && tikzReady) {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('Some integrations may not be fully ready - continuing anyway');
        }
    }

    triggerInitialPreviewUpdate() {
        // Ensure preview is updated with editor content after initialization
        if (this.editor && this.preview && !this.initialUpdateTriggered) {
            this.initialUpdateTriggered = true; // Prevent multiple calls
            const content = this.editor.getContent();
            if (content && content.trim()) {
                this.logInfo('App', 'Triggering initial preview update...');
                
                // Use setTimeout to ensure all components are fully ready
                setTimeout(() => {
                    try {
                        // FIXED: Use triggerContentChange instead of direct updatePreview to avoid double update
                        this.editor.triggerContentChange();
                        this.logInfo('App', 'Initial preview update completed');
                    } catch (error) {
                        this.logError('App', 'Initial preview update failed: ' + error.message);
                    }
                }, 100);
            }
        }
    }

    setupUI() {
        // Set initial view mode
        this.setViewMode(this.viewMode);
        
        // Set initial preview state
        this.preview.setLivePreview(this.isLivePreview);
        this.preview.setSyncScroll(this.syncScroll);
        
        // Update toolbar states
        this.updateToolbarStates();
    }

    async initializeTabSystem() {
        this.logInfo('Components', 'Initializing tab system...');
        
        if (typeof TabManager !== 'undefined' && typeof TabUI !== 'undefined') {
            this.tabManager = new TabManager();
            this.tabUI = new TabUI(this.tabManager);
            
            // Verify TabUI initialized properly
            if (!this.tabUI.tabListElement) {
                this.logError('Components', 'TabUI failed to initialize - DOM elements not found');
                this.tabManager = null;
                this.tabUI = null;
                return;
            }
            
            // Restore previous session or create initial tab
            const restored = this.tabManager.restore();
            // Only create initial tab if restore failed AND no tabs exist
            if (!restored && this.tabManager.getAllTabs().length === 0) {
                this.tabManager.createTab({
                    title: 'Untitled',
                    content: '',
                    switchTo: true
                });
            }
            
            // Listen for tab switches
            this.tabManager.on('tab-switched', (event) => {
                this.handleTabSwitch(event);
            });
            
            // Listen for tab content updates
            this.tabManager.on('tab-updated', (event) => {
                // Tab UI will handle visual updates
            });
            
            this.logInfo('Components', 'Tab system initialized successfully');
        } else {
            this.logError('Components', 'TabManager or TabUI classes not available');
        }
    }

    setupEventListeners() {
        // Electron IPC listeners
        this.setupElectronListeners();
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalShortcuts(e);
        });
        
        // Editor events
        document.addEventListener('editor-content-changed', (e) => {
            this.handleContentChange(e.detail);
        });
        
        // Before unload
        window.addEventListener('beforeunload', (e) => {
            if (this.editor && this.editor.isFileModified()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupElectronListeners() {
        if (typeof require === 'undefined') return;
        
        const { ipcRenderer } = require('electron');
        
        // Clear existing listeners to prevent duplicate registrations
        ipcRenderer.removeAllListeners('menu-new-file');
        ipcRenderer.removeAllListeners('menu-open-file');
        ipcRenderer.removeAllListeners('menu-save-file');
        ipcRenderer.removeAllListeners('menu-save-as-file');
        ipcRenderer.removeAllListeners('menu-toggle-view');
        ipcRenderer.removeAllListeners('menu-toggle-preview');
        ipcRenderer.removeAllListeners('menu-show-markmap');
        ipcRenderer.removeAllListeners('menu-export-html');
        ipcRenderer.removeAllListeners('menu-export-pdf');
        ipcRenderer.removeAllListeners('file-opened');
        
        // Menu actions - single registration only
        ipcRenderer.on('menu-new-file', () => this.newFile());
        ipcRenderer.on('menu-open-file', () => this.openFileDialog());
        ipcRenderer.on('menu-save-file', () => this.saveFile());
        ipcRenderer.on('menu-save-as-file', () => this.saveAsFile());
        ipcRenderer.on('menu-toggle-view', () => this.toggleViewMode());
        ipcRenderer.on('menu-toggle-preview', () => this.toggleLivePreview());
        ipcRenderer.on('menu-show-markmap', () => this.showMarkmap());
        ipcRenderer.on('menu-export-html', () => this.exportHTML());
        ipcRenderer.on('menu-export-pdf', () => this.exportPDF());
        
        // File operations
        ipcRenderer.on('file-opened', (event, data) => {
            this.openFile(data.filePath, data.content);
        });
        
        // Fullscreen state change listener
        ipcRenderer.on('fullscreen-changed', (event, isFullscreen) => {
            console.log('[DEBUG] Received fullscreen-changed event:', isFullscreen);
            this.updateFullscreenButtonState(isFullscreen);
        });
        
        // Handle request to check for unsaved tabs (invoked by main process before-quit)
        ipcRenderer.on('check-unsaved-tabs', () => {
            const unsavedTabs = [];
            
            if (this.tabManager) {
                const allTabs = this.tabManager.getAllTabs();
                for (const tabData of allTabs) {
                    if (tabData.isDirty) {
                        unsavedTabs.push(tabData);
                    }
                }
            } else if (this.editor && this.editor.isFileModified()) {
                // Fallback for non-tab mode
                unsavedTabs.push({ title: this.editor.currentFile || 'Untitled', isDirty: true });
            }
            
            const result = {
                hasUnsaved: unsavedTabs.length > 0,
                count: unsavedTabs.length,
                tabs: unsavedTabs.map(t => ({ title: t.title, filepath: t.filepath }))
            };
            
            // Send result back to main process
            ipcRenderer.send('unsaved-tabs-response', result);
        });
    }

    setupMenuHandlers() {
        // Removed all document event listeners as they duplicate IPC menu handlers
        // IPC listeners in setupElectronListeners() handle all menu actions
        console.log('[App] Menu handlers setup - using IPC only');
    }

    setupToolbar() {
        // File operations
        this.bindButton('newBtn', () => {
            console.log('[App] ===== NEW FILE BUTTON CLICKED =====');
            console.log('[App] this.newFile exists:', typeof this.newFile);
            console.log('[App] this object:', this);
            console.log('[App] About to call this.newFile()...');
            try {
                const result = this.newFile();
                console.log('[App] newFile() returned:', result);
                console.log('[App] newFile() completed successfully - NO ERROR');
            } catch (error) {
                console.error('[App] ❌ ERROR calling newFile():', error);
                console.error('[App] ❌ Error message:', error.message);
                console.error('[App] ❌ Error stack:', error.stack);
            }
        });
        this.bindButton('openBtn', () => {
            console.log('[App] ===== OPEN FILE BUTTON CLICKED =====');
            this.openFileDialog();
        });
        this.bindButton('saveBtn', () => this.saveFile());
        
        // Formatting buttons
        this.bindButton('boldBtn', () => this.editor.toggleBold());
        this.bindButton('italicBtn', () => this.editor.toggleItalic());
        this.bindButton('highlightBtn', () => this.editor.toggleHighlight());
        this.bindButton('strikethroughBtn', () => this.editor.toggleStrikethrough());
        this.bindButton('codeBtn', () => this.editor.insertInlineCode());
        this.bindButton('headingBtn', () => this.editor.insertHeading());
        this.bindButton('linkBtn', () => this.insertLink());
        this.bindButton('imageBtn', () => this.insertImage());
        this.bindButton('tableBtn', () => this.editor.insertTable());
        
        // Special content buttons
        this.bindButton('mathBtn', () => this.editor.insertMath());
        this.bindButton('mermaidBtn', () => this.editor.insertMermaidDiagram());
        this.bindButton('plantumlBtn', () => this.insertPlantUML());
        this.bindButton('vegaBtn', () => this.insertVegaLite());
        // Markmap button disabled as per user request
        // this.bindButton('markmapBtn', () => this.showMarkmap());
        this.bindButton('kityMinderBtn', () => this.showKityMinder());
        this.bindButton('tikzBtn', () => this.insertTikZ());
        // LaTeX.js button removed - TikZ handled via node-tikzjax, math via MathJax/KaTeX
        // this.bindButton('latexBtn', () => this.insertLaTeX());
        
        // View buttons
        this.bindButton('viewToggleBtn', () => this.toggleViewMode());
        this.bindButton('previewToggleBtn', () => this.toggleLivePreview());
        this.bindButton('manualRefreshBtn', () => this.manualRefreshPreview());
        // Export buttons
        this.bindButton('exportHtmlBtn', () => this.exportHTML());
        this.bindButton('exportPdfBtn', () => this.exportPDF());

        // Plugins/Options button
        this.bindButton('pluginsBtn', () => {
            const modal = document.getElementById('plugins-modal');
            if (modal) {
                this.populatePluginsModal();
                modal.style.display = 'block';
            }
        });

        // Plugins modal tab handlers
        const enabledPluginsTab = document.getElementById('enabled-plugins-tab');
        const installPluginsTab = document.getElementById('install-plugins-tab');
        
        if (enabledPluginsTab) {
            enabledPluginsTab.addEventListener('click', () => {
                this.switchPluginTab('enabled');
            });
        }
        
        if (installPluginsTab) {
            installPluginsTab.addEventListener('click', () => {
                this.switchPluginTab('install');
            });
        }

        // Preview controls
        this.bindButton('syncScrollBtn', () => this.toggleSyncScroll());
        // Some layouts use a toolbar-level scroll sync button with a slightly different id
        // Bind the alternate id to keep both controls functional
        this.bindButton('scrollSyncBtn', () => this.toggleSyncScroll());
        this.bindButton('fullscreenPreviewBtn', () => this.toggleFullscreenPreview());

        // Plugins modal close button
        const pluginsClose = document.getElementById('plugins-close');
        if (pluginsClose) {
            pluginsClose.addEventListener('click', () => {
                const modal = document.getElementById('plugins-modal');
                if (modal) modal.style.display = 'none';
            });
        }
    }

    bindButton(id, handler) {
        const button = document.getElementById(id);
        console.log(`[DEBUG] bindButton('${id}') - button found:`, !!button);
        if (button) {
            // Remove any existing listeners to prevent duplicates
            const existingHandler = button._markddHandler;
            if (existingHandler) {
                button.removeEventListener('click', existingHandler);
            }
            
            // Add new handler and store reference for future removal
            button._markddHandler = handler;
            button.addEventListener('click', handler);
            console.log(`[DEBUG] Event listener added for button: ${id}`);
        } else {
            console.warn(`[DEBUG] Button not found: ${id}`);
        }
    }

    setupDragDrop() {
        const editorElement = document.getElementById('editor');
        
        editorElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        editorElement.addEventListener('drop', async (e) => {
            e.preventDefault();
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                const file = files[0];
                
                if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
                    // Handle markdown/text files
                    const content = await this.readFile(file);
                    this.openFile(file.path || file.name, content);
                } else if (file.type.startsWith('image/')) {
                    // Handle image files
                    this.insertImageFile(file);
                }
            }
        });
    }

    setupSplitter() {
        const splitter = document.getElementById('splitter');
        const editorPanel = document.getElementById('editor-panel');
        const previewPanel = document.getElementById('preview-panel');
        
        if (!splitter || !editorPanel || !previewPanel) return;
        
        let isResizing = false;
        
        splitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            
            const container = document.getElementById('main-content');
            if (!container || !editorPanel || !previewPanel) return;
            
            const containerRect = container.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
            
            if (newLeftWidth > 20 && newLeftWidth < 80) {
                editorPanel.style.flex = `0 0 ${newLeftWidth}%`;
                previewPanel.style.flex = `0 0 ${100 - newLeftWidth}%`;
            }
        };
        
        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    setupThemeSystem() {
        // Initialize theme system
        this.currentTheme = 'light';
        
        // Setup theme selector
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
        
        // Expose global theme customization API
        window.markddCustomize = (options = {}) => {
            if (options.theme) this.setTheme(options.theme);
            if (options.codeBlockStyle) {
                document.documentElement.style.setProperty('--code-block-style', options.codeBlockStyle);
            }
            // Extend for more customization as needed
        };
        
        // Set initial theme
        this.setTheme('light');
    }

    setupMathEngineSystem() {
        // Initialize math engine system
        this.currentMathEngine = localStorage.getItem('math-engine') || 'mathjax';
        
        // Setup math engine selector
        const mathEngineSelect = document.getElementById('math-engine-select');
        if (mathEngineSelect) {
            // Set current value
            mathEngineSelect.value = this.currentMathEngine;
            
            // Add change event listener
            mathEngineSelect.addEventListener('change', (e) => {
                this.setMathEngine(e.target.value);
            });
        }
        
        // Set initial math engine for renderer
        this.setMathEngine(this.currentMathEngine);
    }

    setupAutosaveSettings() {
        // Initialize autosave toggle from localStorage (default OFF)
        const autosaveCheckbox = document.getElementById('autosave-enabled');
        if (autosaveCheckbox) {
            // Get stored state or default to false
            const isEnabled = localStorage.getItem('autosave-enabled') === 'true';
            
            // Set checkbox state from localStorage
            autosaveCheckbox.checked = isEnabled;
            
            // Apply initial state to editor
            if (this.editor && typeof this.editor.setAutosaveEnabled === 'function') {
                this.editor.setAutosaveEnabled(isEnabled);
                console.log('[App] Autosave initialized to ' + (isEnabled ? 'enabled' : 'disabled'));
            }
            
            // Add change event listener
            autosaveCheckbox.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                localStorage.setItem('autosave-enabled', enabled.toString());
                
                // Update editor autosave setting
                if (this.editor && typeof this.editor.setAutosaveEnabled === 'function') {
                    this.editor.setAutosaveEnabled(enabled);
                    console.log('[App] Autosave ' + (enabled ? 'enabled' : 'disabled'));
                }
            });
        }
    }

    setMathEngine(engine) {
        // Validate engine
        if (!['mathjax', 'katex'].includes(engine)) {
            console.warn('[App] Invalid math engine:', engine, '- using mathjax');
            engine = 'mathjax';
        }
        
        this.currentMathEngine = engine;
        localStorage.setItem('math-engine', engine);
        
        // Update renderer if it exists
        if (this.renderer && typeof this.renderer.setMathEngine === 'function') {
            this.renderer.setMathEngine(engine);
            console.log('[App] Math engine changed to:', engine);
            
            // Trigger preview update if content exists
            if (this.editor && this.editor.getValue && this.editor.getValue().trim()) {
                this.editor.triggerContentChange();
            }
        } else {
            console.log('[App] Math engine preference saved for initialization:', engine);
        }
    }

    setupMenuBar() {
        // HTML dropdown menu button handlers (different from Electron native menus)
        // These handle the dropdown menu buttons in the HTML interface
        
        // File menu handlers
        this.bindButton('menu-new', () => this.newFile());
        this.bindButton('menu-open', () => this.openFileDialog());
        this.bindButton('menu-save', () => this.saveFile());
        this.bindButton('menu-save-as', () => this.saveAsFile());
        this.bindButton('menu-export-html', () => this.exportHTML());
        this.bindButton('menu-export-pdf', () => this.exportPDF());
        this.bindButton('menu-exit', () => {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                ipcRenderer.invoke('app-quit');
            }
        });
        
        // Edit menu handlers
        this.bindButton('menu-undo', () => this.editor && this.editor.undo());
        this.bindButton('menu-redo', () => this.editor && this.editor.redo());
        this.bindButton('menu-cut', () => document.execCommand('cut'));
        this.bindButton('menu-copy', () => document.execCommand('copy'));
        this.bindButton('menu-paste', () => document.execCommand('paste'));
        this.bindButton('menu-select-all', () => this.editor && this.editor.element.select());
        
        // Formatting menu handlers
        this.bindButton('menu-bold', () => this.editor && this.editor.toggleBold());
        this.bindButton('menu-italic', () => this.editor && this.editor.toggleItalic());
        this.bindButton('menu-highlight', () => this.editor && this.editor.toggleHighlight());
        this.bindButton('menu-strikethrough', () => this.editor && this.editor.toggleStrikethrough());
        this.bindButton('menu-superscript', () => this.editor && this.editor.toggleSuperscript());
        this.bindButton('menu-subscript', () => this.editor && this.editor.toggleSubscript());
        this.bindButton('menu-keyboard-key', () => this.editor && this.editor.insertKeyboardShortcut());
        
        // Search/Replace handlers
        this.bindButton('menu-find', () => {
            if (this.editor && this.editor.searchReplaceModal) {
                this.editor.searchReplaceModal.show('find');
            }
        });
        this.bindButton('menu-replace', () => {
            if (this.editor && this.editor.searchReplaceModal) {
                this.editor.searchReplaceModal.show('replace');
            }
        });
        this.bindButton('menu-find-next', () => {
            if (this.editor && this.editor.searchReplaceModal) {
                this.editor.searchReplaceModal.findNext();
            }
        });
        this.bindButton('menu-find-previous', () => {
            if (this.editor && this.editor.searchReplaceModal) {
                this.editor.searchReplaceModal.findPrevious();
            }
        });
        
        // View menu handlers
        this.bindButton('menu-toggle-sidebar', () => this.toggleSidebar());
        this.bindButton('menu-toggle-preview', () => this.toggleLivePreview());
        this.bindButton('menu-fullscreen-preview', () => this.toggleFullscreenPreview());
        
        // Zoom handlers
        this.bindButton('menu-zoom-in', () => this.zoomIn());
        this.bindButton('menu-zoom-out', () => this.zoomOut());
        this.bindButton('menu-zoom-reset', () => this.resetZoom());
        
        // Tools menu handlers
        const pluginsBtn = document.getElementById('menu-plugins');
        if (pluginsBtn && typeof this.showPluginsModal === 'function') {
            this.bindButton('menu-plugins', () => this.showPluginsModal());
        }
        const settingsBtn = document.getElementById('menu-settings');
        if (settingsBtn && typeof this.showSettingsModal === 'function') {
            this.bindButton('menu-settings', () => this.showSettingsModal());
        }
        
        // Help menu handlers
        this.bindButton('menu-about', () => this.showAboutDialog());

        // Global keyboard shortcuts (non-conflicting with file operations)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case '\\':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.toggleSidebar();
                        }
                        break;
                    case 'p':
                        if (e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.toggleLivePreview();
                        }
                        break;
                    case '=':
                    case '+':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.zoomIn();
                        }
                        break;
                    case '-':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.zoomOut();
                        }
                        break;
                    case '0':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.resetZoom();
                        }
                        break;
                    case ',':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.showPluginsModal();
                        }
                        break;
                    case 'r':
                        if (!e.shiftKey && !e.altKey) {
                            e.preventDefault();
                            this.manualRefreshPreview();
                        }
                        break;
                }
            } else if (e.key === 'F3') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (this.editor && this.editor.searchReplaceModal) {
                        this.editor.searchReplaceModal.findPrevious();
                    }
                } else {
                    if (this.editor && this.editor.searchReplaceModal) {
                        this.editor.searchReplaceModal.findNext();
                    }
                }
            } else if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreenPreview();
            }
        });
    }

    setTheme(theme) {
        this.currentTheme = theme;
        const root = document.documentElement;
        
        // Update theme attribute
        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            document.body.style.background = '#1e1e1e';
            document.body.style.color = '#e0e0e0';
        } else if (theme === 'blue') {
            root.setAttribute('data-theme', 'blue');
            document.body.style.background = '#f8f9fa';
            document.body.style.color = '#1e3a5f';
        } else if (theme === 'green') {
            root.setAttribute('data-theme', 'green');
            document.body.style.background = '#f1f8e9';
            document.body.style.color = '#2e4d32';
        } else if (theme === 'purple') {
            root.setAttribute('data-theme', 'purple');
            document.body.style.background = '#f3e5f5';
            document.body.style.color = '#4a148c';
        } else if (theme === 'orange') {
            root.setAttribute('data-theme', 'orange');
            document.body.style.background = '#fff3e0';
            document.body.style.color = '#bf360c';
        } else if (theme === 'monochrome') {
            root.setAttribute('data-theme', 'monochrome');
            document.body.style.background = '#ffffff';
            document.body.style.color = '#000000';
        } else if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
            document.body.style.background = '#f8f9fa';
            document.body.style.color = '#333';
        } else {
            // Auto/system theme
            root.removeAttribute('data-theme');
            document.body.style.background = '';
            document.body.style.color = '';
        }
        
        // Update Mermaid theme
        if (window.mermaid) {
            const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
            window.mermaid.initialize({ theme: mermaidTheme });
        }
        
        // Update TikZ settings
        if (window.tikzLoader && window.tikzLoader.settings) {
            window.tikzLoader.settings.invertColorsInDarkMode = theme === 'dark';
        }
        
        // Update theme selector
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect && themeSelect.value !== theme) {
            themeSelect.value = theme;
        }
        
        // Update highlight.js theme for code blocks
        if (window.libraryLoader && typeof window.libraryLoader.setHighlightTheme === 'function') {
            window.libraryLoader.setHighlightTheme(theme === 'dark');
        }
        // Notify listeners
        document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
        console.log(`Theme changed to: ${theme}`);
    }

    // File operations
    newFile() {
        try {
            console.log('[App] newFile() ENTRY - tabManager exists:', !!this.tabManager);
            
            if (!this.tabManager) {
                console.log('[App] newFile: Using fallback mode (no tab manager)');
                // Fallback to old behavior if tab system not initialized
                if (this.editor.isFileModified() && !this.confirmUnsavedChanges()) {
                    console.log('[App] newFile: User cancelled due to unsaved changes');
                    return;
                }
                this.editor.newFile();
                console.log('[App] newFile: Fallback mode completed');
                return;
            }
            
            // Create new tab with auto-numbered title
            const currentTabCount = this.tabManager.getTabCount();
            console.log('[App] newFile: Current tab count:', currentTabCount);
            const newTitle = `Untitled-${currentTabCount + 1}`;
            console.log('[App] newFile: Creating new tab with title:', newTitle);
            
            const tabId = this.tabManager.createTab({
                title: newTitle,
                content: '',
                switchTo: true
            });
            
            console.log('[App] newFile: Tab created with ID:', tabId);
            this.logInfo('App', 'Created new tab: ' + tabId);
            console.log('[App] newFile() EXIT - Success');
        } catch (error) {
            console.error('[App] newFile() EXCEPTION:', error);
            console.error('[App] Stack trace:', error.stack);
        }
    }

    async openFile(filePath = null, content = null) {
        console.log('[App] openFile called with filePath:', filePath, 'content length:', content ? content.length : 'null');
        
        if (!this.tabManager) {
            console.log('[App] openFile: tabManager not initialized, using fallback');
            // Fallback to old behavior if tab system not initialized
            if (this.editor.isFileModified() && !this.confirmUnsavedChanges()) {
                console.log('[App] openFile: User cancelled due to unsaved changes');
                return;
            }
            
            if (filePath && content !== null) {
                console.log('[App] openFile: Opening file in editor:', filePath);
                this.editor.openFile(filePath, content);
            } else {
                if (typeof require !== 'undefined') {
                    console.log('[App] openFile: No file path provided, opening dialog...');
                }
            }
            return;
        }
        
        if (filePath && content !== null) {
            console.log('[App] openFile: tabManager available, checking for existing tab');
            // Check if file is already open in a tab
            const existingTab = this.tabManager.findTabByFilepath(filePath);
            if (existingTab) {
                // Switch to existing tab
                console.log('[App] openFile: File already open, switching to tab:', existingTab.id);
                this.tabManager.switchTab(existingTab.id);
                this.logInfo('App', 'Switched to existing tab for: ' + filePath);
            } else {
                // Create new tab for this file - extract clean filename
                const fileName = filePath.split(/[\\\/]/).pop() || 'Untitled';
                console.log('[App] openFile: Creating new tab for file:', fileName);
                this.tabManager.createTab({
                    title: fileName,
                    content: content,
                    filepath: filePath,
                    switchTo: true
                });
                this.logInfo('App', 'Opened file in new tab: ' + fileName);
            }
        } else {
            console.log('[App] openFile: No file path or content provided');
            // Trigger file dialog through Electron
            if (typeof require !== 'undefined') {
                console.log('[App] openFile: Opening file dialog...');
            }
        }
    }

    async saveFile() {
        if (!this.editor) {
            return false;
        }
        
        const success = await this.editor.save();
        if (success) {
            // Mark active tab as saved if tab system is active
            if (this.tabManager) {
                const activeTab = this.tabManager.getActiveTab();
                if (activeTab) {
                    const currentFile = this.editor.getCurrentFile();
                    this.tabManager.markTabSaved(activeTab.id, currentFile);
                    
                    // Update tab title to reflect filename
                    if (currentFile) {
                        const fileName = currentFile.split(/[\\\/ ]/).pop() || 'Untitled';
                        this.tabManager.updateTabTitle(activeTab.id, fileName);
                        this.logInfo('App', 'Tab title updated to: ' + fileName);
                    }
                    
                    this.logInfo('App', 'Tab marked as saved: ' + activeTab.id);
                }
            }
            this.showMessage('File saved successfully');
        } else {
            this.showError('Failed to save file');
        }
        return success;
    }

    async saveAsFile() {
        if (this.editor) {
            // Force save as by clearing current file
            const currentFile = this.editor.getCurrentFile();
            this.editor.currentFile = null;
            
            const success = await this.editor.save();
            
            if (!success) {
                // Restore current file if save as failed
                this.editor.currentFile = currentFile;
                this.showError('Failed to save file');
            } else {
                this.showMessage('File saved successfully');
            }
            
            return success;
        }
        return false;
    }

    // Content insertion helpers
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            const title = prompt('Enter link text (optional):') || 'link';
            this.editor.insertLink(url, title);
        }
    }

    insertImage() {
        const url = prompt('Enter image URL:');
        if (url) {
            const alt = prompt('Enter alt text (optional):') || 'image';
            this.editor.insertImage(url, alt);
        }
    }

    async insertImageFile(file) {
        try {
            // Create a data URL for the image
            const dataUrl = await this.fileToDataURL(file);
            const alt = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            this.editor.insertImage(dataUrl, alt);
        } catch (error) {
            this.showError('Failed to insert image: ' + error.message);
        }
    }

    insertTikZ() {
        const choice = confirm('Insert CircuiTikZ diagram? (OK for CircuiTikZ, Cancel for regular TikZ)');
        this.tikzIntegration.insertTikZTemplate(choice);
    }

    insertLaTeX() {
        const template = `\`\`\`latex
\\documentclass{article}
\\usepackage{amsmath}

\\title{Sample LaTeX Document}
\\author{Your Name}

\\begin{document}

\\maketitle

\\section{Introduction}

This is a sample LaTeX document. You can write mathematics like this:

$$E = mc^2$$

And inline math like \\(x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\).

\\section{Lists}

\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\end{document}
\`\`\`

`;
        this.editor.insertText(template);
    }

    insertPlantUML() {
        const template = `\`\`\`plantuml
@startuml
Alice -> Bob: Hello
Bob -> Alice: Hi there
@enduml
\`\`\`

`;
        this.editor.insertText(template);
    }

    insertVegaLite() {
        const template = `\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "description": "A simple bar chart with embedded data",
  "data": {
    "values": [
      {"a": "A", "b": 28},
      {"a": "B", "b": 55},
      {"a": "C", "b": 43},
      {"a": "D", "b": 91},
      {"a": "E", "b": 81}
    ]
  },
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal"},
    "y": {"field": "b", "type": "quantitative"}
  }
}
\`\`\`

`;
        this.editor.insertText(template);
    }

    // View management
    setViewMode(mode) {
        this.viewMode = mode;
        
        const editorPanel = document.getElementById('editor-panel');
        const previewPanel = document.getElementById('preview-panel');
        const splitter = document.getElementById('splitter');
        
        // Add null checks to prevent style errors
        if (!editorPanel || !previewPanel || !splitter) {
            console.error('[App] Required panels not found for view mode change');
            return;
        }
        
        // Reset flex styles
        editorPanel.style.flex = '';
        previewPanel.style.flex = '';
        
        switch (mode) {
            case 'editor':
                editorPanel.style.display = 'flex';
                previewPanel.style.display = 'none';
                splitter.style.display = 'none';
                break;
            case 'preview':
                editorPanel.style.display = 'none';
                previewPanel.style.display = 'flex';
                splitter.style.display = 'none';
                break;
            case 'split':
            default:
                editorPanel.style.display = 'flex';
                previewPanel.style.display = 'flex';
                splitter.style.display = 'block';
                editorPanel.style.flex = '1';
                previewPanel.style.flex = '1';
                break;
        }
        
        this.updateToolbarStates();
    }

    toggleViewMode() {
        const modes = ['split', 'editor', 'preview'];
        const currentIndex = modes.indexOf(this.viewMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        this.setViewMode(nextMode);
    }

    toggleLivePreview() {
        this.isLivePreview = this.preview.toggleLivePreview();
        this.updateToolbarStates();
        
        // Save to localStorage
        localStorage.setItem('live-preview-enabled', this.isLivePreview.toString());
        
        // Update settings checkbox if present
        const livePreviewCheckbox = document.getElementById('live-preview-enabled');
        if (livePreviewCheckbox) {
            livePreviewCheckbox.checked = this.isLivePreview;
        }
        
        if (this.isLivePreview) {
            this.showMessage('Live preview enabled');
        } else {
            this.showMessage('Live preview disabled');
        }
        
        return this.isLivePreview;
    }

    /**
     * Manual refresh of preview - updates preview on demand without auto-scroll
     * Useful when live preview is disabled or to force a refresh
     */
    async manualRefreshPreview() {
        if (!this.preview) {
            this.showError('Preview not initialized');
            return;
        }
        
        try {
            this.showMessage('Refreshing preview...');
            await this.preview.refresh();
            this.showMessage('Preview refreshed');
        } catch (error) {
            console.error('[App] Manual refresh failed:', error);
            this.showError('Failed to refresh preview');
        }
    }

    toggleSyncScroll() {
        console.log('[App] toggleSyncScroll called, preview instance:', !!this.preview);
        
        if (!this.preview) {
            console.error('[App] Preview not initialized when toggleSyncScroll called');
            this.showError('Preview not ready yet. Please try again.');
            return;
        }
        
        this.syncScroll = this.preview.toggleSyncScroll();
        this.updateToolbarStates();
        
        // Save to localStorage
        localStorage.setItem('sync-scroll-enabled', this.syncScroll.toString());
        
        // Update settings checkbox if present
        const syncScrollCheckbox = document.getElementById('sync-scroll-enabled');
        if (syncScrollCheckbox) {
            syncScrollCheckbox.checked = this.syncScroll;
        }
        
        if (this.syncScroll) {
            this.showMessage('Scroll sync enabled');
        } else {
            this.showMessage('Scroll sync disabled');
        }
        
        return this.syncScroll;
    }

    toggleFullscreenPreview() {
        console.log('[DEBUG] toggleFullscreenPreview called');
        
        // Check if Electron is available
        if (typeof require === 'undefined') {
            console.error('[DEBUG] Electron not available for fullscreen');
            this.showError('Fullscreen not supported in this environment');
            return;
        }
        
        // Toggle Electron window fullscreen instead of just view mode
        const { ipcRenderer } = require('electron');
        console.log('[DEBUG] Invoking toggle-fullscreen IPC');
        ipcRenderer.invoke('toggle-fullscreen').then(result => {
            console.log('[DEBUG] toggle-fullscreen result:', result);
            if (result.success) {
                console.log('[DEBUG] Fullscreen toggled successfully, new state:', result.isFullscreen);
                this.updateFullscreenButtonState(result.isFullscreen);
            } else {
                console.error('[DEBUG] Fullscreen toggle failed:', result.error);
                this.showError('Failed to toggle fullscreen: ' + result.error);
            }
        }).catch(error => {
            console.error('[DEBUG] toggle-fullscreen IPC error:', error);
            this.showError('Failed to toggle fullscreen: ' + error.message);
        });
    }

    updateFullscreenButtonState(isFullscreen) {
        console.log('[DEBUG] updateFullscreenButtonState called with:', isFullscreen);
        const fullscreenBtn = document.getElementById('fullscreenPreviewBtn');
        if (fullscreenBtn) {
            console.log('[DEBUG] Fullscreen button found, updating state');
            fullscreenBtn.classList.toggle('active', isFullscreen);
            fullscreenBtn.title = isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';
            const icon = fullscreenBtn.querySelector('.icon');
            if (icon) {
                icon.textContent = isFullscreen ? '⛶' : '⛶'; // Keep same icon, just update title
            }
            console.log('[DEBUG] Fullscreen button state updated successfully');
        } else {
            console.warn('[DEBUG] Fullscreen button not found in DOM');
        }
    }

    async initializeFullscreenState() {
        // Get initial fullscreen state from main process
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('get-fullscreen-state');
                if (result.success) {
                    this.updateFullscreenButtonState(result.isFullscreen);
                }
            } catch (error) {
                console.warn('Failed to get initial fullscreen state:', error);
            }
        }
    }

    // Export functions
    async exportHTML() {
        // Prevent multiple simultaneous exports
        if (this._exportingHTML) {
            console.debug('[App] exportHTML suppressed (already in progress)');
            return;
        }
        
        this._exportingHTML = true;
        
        try {
            const filePath = await this.preview.exportAsHTML({
                onlyEnabledPlugins: window.markddExportEnabledPluginsOnly !== false
            });
            if (filePath) {
                this.showMessage(`HTML exported to: ${filePath}`);
            }
        } catch (error) {
            this.showError('HTML export failed: ' + error.message);
        } finally {
            this._exportingHTML = false;
        }
    }

    async exportPDF() {
        // Prevent multiple simultaneous exports
        if (this._exportingPDF) {
            console.debug('[App] exportPDF suppressed (already in progress)');
            return;
        }
        
        this._exportingPDF = true;
        
        try {
            const filePath = await this.preview.exportAsPDF({
                onlyEnabledPlugins: window.markddExportEnabledPluginsOnly !== false
            });
            if (filePath) {
                this.showMessage(`PDF exported to: ${filePath}`);
            }
        } catch (error) {
            this.showError('PDF export failed: ' + error.message);
        } finally {
            this._exportingPDF = false;
        }
    }

    // Markmap integration
    showMarkmap() {
        if (this.markmapIntegration) {
            // Check if there's selected text - if yes, show it, otherwise create new
            const selectedText = this.editor.getSelectedText();
            if (selectedText && selectedText.trim()) {
                this.markmapIntegration.showMarkmap(selectedText);
            } else {
                // Show creation dialog and insert into editor
                this.markmapIntegration.createNewMarkmap(this.editor.codeMirror);
            }
        }
    }

    // KityMinder integration
    showKityMinder() {
        if (this.kityMinderIntegration && this.kityMinderIntegration.isReady()) {
            this.kityMinderIntegration.newMindmap();
        } else {
            this.showError('KityMinder integration is not ready');
        }
    }

    // Plugin management methods
    switchPluginTab(tabName) {
        // Switch tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabName === 'enabled') {
            document.getElementById('enabled-plugins-tab').classList.add('active');
            document.getElementById('plugins-list').classList.add('active');
        } else if (tabName === 'install') {
            document.getElementById('install-plugins-tab').classList.add('active');
            document.getElementById('install-plugins-list').classList.add('active');
            this.loadAvailablePlugins();
        }
    }

    populatePluginsModal() {
        // Populate enabled plugins list
        const list = document.getElementById('plugins-list');
        if (list && window.markddListPlugins) {
            const plugins = window.markddListPlugins();
            const firstDiv = list.querySelector('div:first-child');
            
            if (plugins.length === 0) {
                list.insertAdjacentHTML('afterbegin', '<div style="color:#888;">No plugins registered.</div>');
            } else {
                let pluginsHTML = '';
                plugins.forEach(plugin => {
                    pluginsHTML += `<div class="plugin-row"><label><input type="checkbox" ${plugin.enabled ? 'checked' : ''} data-plugin="${plugin.name}"> <b>${plugin.name}</b> <span style="color:#888;font-size:0.9em;">(${plugin.type})</span></label></div>`;
                });
                list.insertAdjacentHTML('afterbegin', pluginsHTML);
                
                // Add event listeners for toggles
                list.querySelectorAll('input[type="checkbox"][data-plugin]').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const pname = e.target.getAttribute('data-plugin');
                        if (e.target.checked) {
                            window.markddEnablePlugin && window.markddEnablePlugin(pname);
                        } else {
                            window.markddDisablePlugin && window.markddDisablePlugin(pname);
                        }
                        // Optionally trigger a re-render or notify user
                        if (window.markddApp && window.markddApp.preview) {
                            window.markddApp.preview.refresh && window.markddApp.preview.refresh();
                        }
                    });
                });
            }
        }

        // Export with only enabled plugins toggle
        const exportToggle = document.getElementById('export-enabled-plugins-only');
        if (exportToggle) {
            exportToggle.checked = window.markddExportEnabledPluginsOnly !== false;
            exportToggle.addEventListener('change', (e) => {
                window.markddExportEnabledPluginsOnly = !!e.target.checked;
            });
        }
        
        // Scroll sync status
        const scrollSyncStatus = document.getElementById('scroll-sync-status');
        if (scrollSyncStatus && typeof this.isSyncScrollEnabled === 'function') {
            scrollSyncStatus.textContent = 'Scroll Sync: ' + (this.isSyncScrollEnabled() ? 'Enabled' : 'Disabled');
            scrollSyncStatus.style.color = this.isSyncScrollEnabled() ? '#007acc' : '#d32f2f';
        }
        
        // Discover plugins button
        const discoverBtn = document.getElementById('discover-plugins-btn');
        if (discoverBtn) {
            discoverBtn.onclick = () => {
                window.open('https://github.com/BearToCode/carta', '_blank');
                setTimeout(() => window.open('https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins', '_blank'), 200);
                setTimeout(() => window.open('https://github.com/remarkjs', '_blank'), 400);
            };
        }
    }

    async loadAvailablePlugins() {
        const installList = document.getElementById('install-plugins-list');
        const loading = document.getElementById('plugin-install-loading');
        
        if (!installList) return;
        
        loading.style.display = 'block';
        
        try {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                const plugins = await ipcRenderer.invoke('get-available-plugins');
                
                loading.style.display = 'none';
                
                let html = '';
                plugins.forEach(plugin => {
                    const statusClass = plugin.installed ? 'installed' : '';
                    const statusText = plugin.installed ? 'Installed' : 'Not Installed';
                    const actionButton = plugin.installed 
                        ? `<button class="uninstall-btn" data-plugin="${plugin.name}">Uninstall</button>`
                        : `<button class="install-btn" data-plugin="${plugin.name}">Install</button>`;
                    
                    html += `
                        <div class="install-plugin-item">
                            <div class="plugin-info">
                                <div class="plugin-name">${plugin.name}</div>
                                <div class="plugin-description">${plugin.description}</div>
                                <div class="plugin-meta">Type: ${plugin.type} | Version: ${plugin.version}</div>
                            </div>
                            <div class="plugin-actions">
                                <span class="plugin-status ${statusClass}">${statusText}</span>
                                ${actionButton}
                            </div>
                        </div>
                    `;
                });
                
                installList.innerHTML = html;
                
                // Add event listeners for install/uninstall buttons
                installList.querySelectorAll('.install-btn, .uninstall-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const pluginName = e.target.getAttribute('data-plugin');
                        const isInstall = e.target.classList.contains('install-btn');
                        
                        if (isInstall) {
                            this.installPlugin(pluginName, e.target);
                        } else {
                            this.uninstallPlugin(pluginName, e.target);
                        }
                    });
                });
            }
        } catch (error) {
            loading.innerHTML = `<div style="color:#d32f2f;">Error loading plugins: ${error.message}</div>`;
        }
    }

    async installPlugin(pluginName, buttonEl) {
        if (typeof require === 'undefined') return;
        
        const { ipcRenderer } = require('electron');
        
        buttonEl.disabled = true;
        buttonEl.textContent = 'Installing...';
        
        try {
            const result = await ipcRenderer.invoke('install-plugin', pluginName);
            
            if (result.success) {
                buttonEl.textContent = 'Installed';
                buttonEl.className = 'uninstall-btn';
                buttonEl.textContent = 'Uninstall';
                buttonEl.disabled = false;
                
                // Update status
                const statusEl = buttonEl.parentElement.querySelector('.plugin-status');
                if (statusEl) {
                    statusEl.textContent = 'Installed';
                    statusEl.className = 'plugin-status installed';
                }
                
                this.showMessage(`Plugin ${pluginName} installed successfully. Please restart the application to use it.`);
            } else {
                buttonEl.textContent = 'Install Failed';
                buttonEl.disabled = false;
                this.showError(`Failed to install ${pluginName}: ${result.error}`);
                setTimeout(() => {
                    buttonEl.textContent = 'Install';
                }, 3000);
            }
        } catch (error) {
            buttonEl.textContent = 'Install Failed';
            buttonEl.disabled = false;
            this.showError(`Failed to install ${pluginName}: ${error.message}`);
            setTimeout(() => {
                buttonEl.textContent = 'Install';
            }, 3000);
        }
    }

    async uninstallPlugin(pluginName, buttonEl) {
        if (typeof require === 'undefined') return;
        
        const { ipcRenderer } = require('electron');
        
        if (!confirm(`Are you sure you want to uninstall ${pluginName}?`)) return;
        
        buttonEl.disabled = true;
        buttonEl.textContent = 'Uninstalling...';
        
        try {
            const result = await ipcRenderer.invoke('uninstall-plugin', pluginName);
            
            if (result.success) {
                buttonEl.className = 'install-btn';
                buttonEl.textContent = 'Install';
                buttonEl.disabled = false;
                
                // Update status
                const statusEl = buttonEl.parentElement.querySelector('.plugin-status');
                if (statusEl) {
                    statusEl.textContent = 'Not Installed';
                    statusEl.className = 'plugin-status';
                }
                
                this.showMessage(`Plugin ${pluginName} uninstalled successfully. Please restart the application.`);
            } else {
                buttonEl.textContent = 'Uninstall Failed';
                buttonEl.disabled = false;
                this.showError(`Failed to uninstall ${pluginName}: ${result.error}`);
                setTimeout(() => {
                    buttonEl.textContent = 'Uninstall';
                }, 3000);
            }
        } catch (error) {
            buttonEl.textContent = 'Uninstall Failed';
            buttonEl.disabled = false;
            this.showError(`Failed to uninstall ${pluginName}: ${error.message}`);
            setTimeout(() => {
                buttonEl.textContent = 'Uninstall';
            }, 3000);
        }
    }

    // Event handlers
    handleGlobalShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    if (this.fileBrowser) {
                        this.fileBrowser.toggleSidebar();
                    }
                    break;
                case 'e':
                    e.preventDefault();
                    this.toggleViewMode();
                    break;
                case 'p':
                    e.preventDefault();
                    this.toggleLivePreview();
                    break;
                case 'm':
                    e.preventDefault();
                    this.showMarkmap();
                    break;
                case '0':
                    e.preventDefault();
                    // Reset zoom
                    this.editorZoom = 1;
                    this.previewZoom = 1;
                    this.applyZoom();
                    break;
            }
        }
    }

    setupZoomHandlers() {
        const editorEl = document.getElementById('editor');
        const previewEl = document.getElementById('preview');

        const clamp = (v) => Math.min(this.maxZoom, Math.max(this.minZoom, v));

        const onWheel = (e, target) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            if (target === 'editor') {
                this.editorZoom = clamp(this.editorZoom + (e.deltaY < 0 ? this.zoomStep : -this.zoomStep));
            } else if (target === 'preview') {
                this.previewZoom = clamp(this.previewZoom + (e.deltaY < 0 ? this.zoomStep : -this.zoomStep));
            }
            this.applyZoom();
        };

        if (editorEl) {
            editorEl.addEventListener('wheel', (e) => onWheel(e, 'editor'), { passive: false });
        }
        if (previewEl) {
            previewEl.addEventListener('wheel', (e) => onWheel(e, 'preview'), { passive: false });
        }
    }

    applyZoom() {
        const editorEl = document.getElementById('editor');
        const previewEl = document.getElementById('preview');
        
        if (editorEl) {
            editorEl.style.fontSize = `${14 * this.editorZoom}px`;
            editorEl.style.lineHeight = `${1.6 * this.editorZoom}`;
        }
        if (previewEl) {
            previewEl.style.transformOrigin = 'top left';
            previewEl.style.transform = `scale(${this.previewZoom})`;
            previewEl.parentElement.style.paddingRight = this.previewZoom !== 1 ? '40px' : '';
        }
    }

    handleContentChange(detail) {
        // Update active tab content if tab system is active
        if (this.tabManager && this.editor) {
            const activeTab = this.tabManager.getActiveTab();
            // Verify the active tab still exists before updating
            if (activeTab && this.tabManager.tabs && this.tabManager.tabs.has(activeTab.id)) {
                const currentContent = this.editor.getValue();
                
                // Also save current scroll position when content changes
                const editorElement = this.editor.element || document.getElementById('editor');
                const currentScrollTop = editorElement ? editorElement.scrollTop : 0;
                
                this.tabManager.updateTabContent(activeTab.id, currentContent, currentScrollTop);
            }
        }
        
        // Update UI based on content changes
        this.updateUI();
    }

    handleResize() {
        // Handle window resize
        if (this.markmapIntegration && this.markmapIntegration.currentMarkmap) {
            // Resize markmap if visible
            setTimeout(() => {
                if (this.markmapIntegration.currentMarkmap.fit) {
                    this.markmapIntegration.currentMarkmap.fit();
                }
            }, 100);
        }
    }

    // UI updates
    updateUI() {
        this.updateToolbarStates();
    }

    updateToolbarStates() {
        // Update view toggle button
        const viewToggleBtn = document.getElementById('viewToggleBtn');
        if (viewToggleBtn) {
            viewToggleBtn.title = `Toggle View Mode (Current: ${this.viewMode})`;
        }
        
        // Update preview toggle button
        const previewToggleBtn = document.getElementById('previewToggleBtn');
        if (previewToggleBtn) {
            previewToggleBtn.classList.toggle('active', this.isLivePreview);
            previewToggleBtn.title = `Toggle Live Preview (${this.isLivePreview ? 'On' : 'Off'})`;
        }
        
        // Update sync scroll button
        // Keep both possible sync-scroll controls updated if present
        const syncScrollBtn = document.getElementById('syncScrollBtn');
        const scrollSyncBtn = document.getElementById('scrollSyncBtn');
        [syncScrollBtn, scrollSyncBtn].forEach(btn => {
            if (!btn) return;
            btn.classList.toggle('active', this.syncScroll);
            btn.title = `Sync Scroll (${this.syncScroll ? 'On' : 'Off'})`;
        });
    }

    // Utility functions
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    handleTabSwitch(event) {
        if (!event || !event.tabData) {
            this.logError('App', 'Invalid tab switch event');
            return;
        }
        
        const tabData = event.tabData;
        const previousTabId = event.previousTabId;
        this.logInfo('App', 'Switching to tab: ' + tabData.id + ' - ' + tabData.title);
        
        // Save scroll position of previous tab before switching
        // Only save if the previous tab still exists (it might have been closed)
        if (previousTabId && this.tabManager && this.editor) {
            const previousTabExists = this.tabManager.tabs && this.tabManager.tabs.has(previousTabId);
            if (previousTabExists) {
                const editorElement = this.editor.element || document.getElementById('editor');
                if (editorElement) {
                    const currentScrollTop = editorElement.scrollTop;
                    this.tabManager.updateTabScrollPosition(previousTabId, currentScrollTop);
                    this.logInfo('App', 'Saved scroll position for tab ' + previousTabId + ': ' + currentScrollTop);
                }
            }
        }
        
        // Update editor content
        if (this.editor) {
            this.editor.setValue(tabData.content || '');
            
            // Update editor's internal file tracking
            if (tabData.filepath) {
                this.editor.currentFile = tabData.filepath;
                this.editor.isModified = false;
            } else {
                this.editor.currentFile = null;
            }
            
            // Restore scroll position for the new tab after DOM updates
            const savedScrollTop = tabData.scrollTop || 0;
            const editorElement = this.editor.element || document.getElementById('editor');
            if (editorElement) {
                // Use requestAnimationFrame to ensure DOM is fully updated before scrolling
                requestAnimationFrame(() => {
                    editorElement.scrollTop = savedScrollTop;
                    this.logInfo('App', 'Restored scroll position for tab ' + tabData.id + ': ' + savedScrollTop);
                });
            }
        }
        
        // Force preview update after tab switch to ensure preview renders with new content
        // This is critical even if live preview is enabled - tab switch requires explicit update
        if (this.preview && this.editor) {
            // Use a small delay to ensure editor content is fully set before preview update
            // Arrow function preserves 'this' context
            const self = this;
            requestAnimationFrame(() => {
                // Trigger content change to update preview (proper method, not updatePreview)
                self.editor.triggerContentChange();
                self.logInfo('App', 'Preview updated after tab switch');
            });
        }
        
        this.logInfo('App', 'Tab switch completed');
    }
    
    confirmUnsavedChanges() {
        return confirm('You have unsaved changes. Do you want to continue without saving?');
    }

    showMessage(message) {
        console.log(message);
        // Could show toast notification
    }

    showError(message) {
        console.error(message);
        // Could show error notification
    }

    // Menu action implementations
    // NOTE: newFile() is defined earlier in the class (around line 1148) with tab support
    // The duplicate definition here has been removed to prevent overwriting

    openFileDialog() {
        console.log('[App] openFileDialog() called');
        // Prevent multiple simultaneous dialogs
        if (this._openingFile) {
            console.debug('[App] openFileDialog suppressed (already in progress)');
            return;
        }
        
        this._openingFile = true;
        console.log('[App] openFileDialog: Opening dialog via fileBrowser');
        
        try {
            if (this.fileBrowser && typeof this.fileBrowser.openFileDialog === 'function') {
                const result = this.fileBrowser.openFileDialog();
                
                // Handle both synchronous and asynchronous results
                if (result && typeof result.then === 'function') {
                    result.finally(() => {
                        this._openingFile = false;
                    });
                } else {
                    setTimeout(() => {
                        this._openingFile = false;
                    }, 100);
                }
            } else {
                console.error('[App] fileBrowser.openFileDialog unavailable');
                this._openingFile = false;
            }
        } catch (error) {
            console.error('[App] openFileDialog error:', error);
            this._openingFile = false;
        }
    }

    save() {
        return this.saveFile();
    }

    saveAs() {
        return this.saveAsFile();
    }

    // Removed duplicate export methods to fix conflicts

    toggleSidebar() {
        if (this.fileBrowser && typeof this.fileBrowser.toggleSidebar === 'function') {
            this.fileBrowser.toggleSidebar();
        } else {
            console.warn('[App] FileBrowser not available or toggleSidebar method missing');
            
            // Fallback direct sidebar toggle
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.querySelector('.sidebar-toggle');
            if (sidebar) {
                sidebar.classList.toggle('collapsed');
                console.log('[App] Fallback sidebar toggle applied');
            }
        }
    }

    showPluginsModal() {
        const pluginsBtn = document.getElementById('pluginsBtn');
        if (pluginsBtn) {
            pluginsBtn.click();
        }
    }

    showSettingsModal() {
        // Open settings panel in sidebar
        const settingsIcon = document.querySelector('[data-panel="settings"]');
        if (settingsIcon) {
            settingsIcon.click();
        }
    }

    zoomIn() {
        if (!this.editorZoom || !this.previewZoom) {
            this.editorZoom = 1;
            this.previewZoom = 1;
        }
        
        const clamp = (v) => Math.min(this.maxZoom || 2.0, Math.max(this.minZoom || 0.6, v));
        this.editorZoom = clamp(this.editorZoom + (this.zoomStep || 0.1));
        this.previewZoom = clamp(this.previewZoom + (this.zoomStep || 0.1));
        this.applyZoom();
    }

    zoomOut() {
        if (!this.editorZoom || !this.previewZoom) {
            this.editorZoom = 1;
            this.previewZoom = 1;
        }
        
        const clamp = (v) => Math.min(this.maxZoom || 2.0, Math.max(this.minZoom || 0.6, v));
        this.editorZoom = clamp(this.editorZoom - (this.zoomStep || 0.1));
        this.previewZoom = clamp(this.previewZoom - (this.zoomStep || 0.1));
        this.applyZoom();
    }

    resetZoom() {
        this.editorZoom = 1;
        this.previewZoom = 1;
        this.applyZoom();
    }

    async showAboutDialog() {
        // Get package data dynamically from main process
        let packageData = {
            name: 'MarkDD Editor',
            version: '1.1.0',
            description: 'A fully-featured Markdown editor',
            author: 'MarkDD Team'
        };
        
        try {
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('get-package-data');
                if (result.success) {
                    packageData = result.data;
                }
            }
        } catch (e) {
            console.warn('Failed to get package data:', e);
        }

        // Try to load about-libraries.json for library versions
        let libs = [];
        try {
            const res = await fetch('./src/renderer/about-libraries.json');
            if (res.ok) {
                libs = await res.json();
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (e) {
            console.warn('Failed to load about-libraries.json:', e);
            // fallback to libraryLoader if available
            if (window.libraryLoader && typeof window.libraryLoader.getLoadedLibrariesWithVersions === 'function') {
                libs = window.libraryLoader.getLoadedLibrariesWithVersions();
            }
        }

        let html = `<h2>${packageData.name} v${packageData.version}</h2>
        <p>${packageData.description}</p>
        <p><strong>Author:</strong> ${packageData.author}</p>
        <br>
        <p><strong>Advanced Features:</strong></p>
        <ul>
            <li>🔢 Real-time Math Rendering (KaTeX & MathJax)</li>
            <li>📊 Advanced Diagram Support (Mermaid, TikZ, GraphViz)</li>
            <li>🗺️ Mind Mapping (Markmap Integration)</li>
            <li>💻 Professional Code Highlighting (180+ languages)</li>
            <li>🔍 Search & Replace with Modal Interface</li>
            <li>📑 Tab-based Multi-file Editing</li>
            <li>💾 Autosave with 30s Interval</li>
            <li>📤 Export to HTML & PDF</li>
            <li>🎨 Multiple Theme Support</li>
            <li>🔄 Live Preview with Scroll Sync</li>
            <li>🔌 Plugin System Integration</li>
            <li>📈 Vega-Lite Data Visualization</li>
            <li>🎵 ABC Music Notation Rendering</li>
            <li>🧠 KityMinder Mind Mapping Editor</li>
        </ul>
        <h3>Loaded Libraries (${libs.length})</h3>
        <table class="about-libs-table"><thead><tr><th>Library</th><th>Version</th></tr></thead><tbody>`;
        libs.forEach(lib => {
            html += `<tr><td>${lib.name}</td><td>${lib.version}</td></tr>`;
        });
        html += `</tbody></table>`;

        // Show warnings if Viz.js or LaTeX failed to load
        if (window.VizLoadFailed) {
            html += `<div class="about-warning"><b>Warning:</b> GraphViz (Viz.js) failed to load. GraphViz diagrams will not render.</div>`;
        }
        if (window.LaTeXLoadFailed) {
            html += `<div class="about-warning"><b>Warning:</b> LaTeX.js failed to load. LaTeX document rendering is unavailable.</div>`;
        }

        // Show in a modal
        const modal = document.createElement('div');
        modal.className = 'about-modal';
        modal.innerHTML = `<div class="about-modal-content">${html}<br><button id="about-close-btn">Close</button></div>`;
        document.body.appendChild(modal);
        document.getElementById('about-close-btn').onclick = () => modal.remove();
    }

    // Public API
    getEditor() {
        return this.editor;
    }

    getPreview() {
        return this.preview;
    }

    getRenderer() {
        return this.renderer;
    }

    getFileBrowser() {
        return this.fileBrowser;
    }

    getMarkmapIntegration() {
        return this.markmapIntegration;
    }

    getKityMinderIntegration() {
        return this.kityMinderIntegration;
    }

    getTikzIntegration() {
        return this.tikzIntegration;
    }

    getViewMode() {
        return this.viewMode;
    }

    isLivePreviewEnabled() {
        return this.isLivePreview;
    }

    isSyncScrollEnabled() {
        return this.preview ? this.preview.isSyncScrollEnabled() : this.syncScroll;
    }
}

// If loaded after libs (index.html dynamic load), initialize immediately when script executes
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.markddApp) window.markddApp = new MarkDDApp();
    });
} else {
    if (!window.markddApp) window.markddApp = new MarkDDApp();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkDDApp;
} else {
    window.MarkDDApp = MarkDDApp;
}
