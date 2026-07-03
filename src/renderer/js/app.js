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
        this.presentationManager = null;
        this.bookManager = null;
        this.cvManager = null;
        
        // Tab system
        this.tabManager = null;
        this.tabUI = null;
        this._restoredTabsCleared = false; // Track if we've already cleared restored tabs
        this._appInitializing = true; // Track if app is still initializing (skip animation delays)
        
        this.viewMode = 'split'; // 'split', 'editor', 'preview'
        this.isLivePreview = localStorage.getItem('live-preview-enabled') !== 'false'; // Default to true
        this.syncScroll = localStorage.getItem('sync-scroll-enabled') !== 'false'; // Default to true
        
        // Guard flags to prevent duplicate dialogs
        this._openingFile = false;
        this._exportingHTML = false;
        this._exportingPDF = false;
        this._exportingBookHTML = false;
        this._exportingBookPDF = false;
        this._lastNavigationPosition = null;

        this.bookStyleOptions = [
            { value: 'dark', label: 'Midnight (Dark Mode)' },
            { value: 'classic', label: 'Classic Print' },
            { value: 'wiki', label: 'Knowledge Base (Wiki)' },
            { value: 'helpdesk', label: 'Help Center (CHM)' },
            { value: 'technical', label: 'Professional Document' }
        ];
        this.bookStyleSelect = null;
        
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
        
        // Mark initialization as complete - allow animation delays for future operations
        this._appInitializing = false;
        
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
                        // This is from system event, treat as startup file
                        await this.openFile(filePath, content, true);
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
                    console.log('[App] checkStartupFile: File found, opening immediately:', result.filePath);
                    try {
                        // Read the file content using Node.js fs module
                        const fs = require('fs');
                        const content = fs.readFileSync(result.filePath, 'utf-8');
                        console.log('[App] File read successfully, length:', content.length);
                        // This is the startup file from Electron, pass isStartupFile=true
                        await this.openFile(result.filePath, content, true);
                    } catch (error) {
                        console.error('[App] Error reading startup file:', error);
                        this.showError('Failed to open startup file: ' + error.message);
                    }
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
            this.logInfo('App', 'LibraryLoader not available yet - will retry after libraries load');
            return; // Don't throw - libraries may still be loading
        }

        const loadedLibraries = window.libraryLoader.getLoadedLibraries();
        
        this.logInfo('App', `Libraries loaded: ${loadedLibraries.join(', ')}`);

        // Check for minimum required libraries
        const requiredLibraries = ['Marked', 'KaTeX'];
        const missingRequired = requiredLibraries.filter(lib => !loadedLibraries.includes(lib));
        
        if (missingRequired.length > 0) {
            // Don't throw - wait for libraries to load in background
            this.logInfo('App', `Waiting for libraries: ${missingRequired.join(', ')}`);
            
            // Start a background task to wait for required libraries
            this.waitForRequiredLibraries(requiredLibraries);
            return;
        }
        
        this.logInfo('App', 'All required dependencies are available');
    }
    
    /**
     * Wait for required libraries to load in background
     * This allows the UI to appear immediately while heavy libraries load
     */
    async waitForRequiredLibraries(requiredLibraries) {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds total
        
        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (window.libraryLoader) {
                const loadedLibraries = window.libraryLoader.getLoadedLibraries();
                const stillMissing = requiredLibraries.filter(lib => !loadedLibraries.includes(lib));
                
                if (stillMissing.length === 0) {
                    this.logInfo('App', 'Required libraries now available - updating preview');
                    // Trigger a preview refresh now that libraries are ready
                    if (this.preview && this.editor) {
                        const content = this.editor.getContent();
                        if (content) {
                            this.preview.updatePreview(content);
                        }
                    }
                    return;
                }
            }
        }
        
        this.logInfo('App', 'Warning: Some libraries may not have loaded - math rendering may be limited');
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
            
            this.logInfo('Components', 'Initializing integrations (non-blocking)...');
            
            // FAST STARTUP: Initialize integrations without blocking
            // If classes aren't ready yet, use stubs - they'll be available for later operations
            this.initializeIntegrationsNonBlocking();
            
            this.logInfo('Components', 'Core components initialized');
            
        } catch (error) {
            this.logError('Components', error);
            throw error;
        }
    }
    
    /**
     * Initialize integrations without blocking the main initialization
     * This allows the UI to appear immediately while heavy integrations load in background
     */
    initializeIntegrationsNonBlocking() {
        // Prefer enhanced markmap implementation if available
        if (window.EnhancedMarkmapIntegration) {
            this.markmapIntegration = new EnhancedMarkmapIntegration();
            this.logInfo('Components', 'Using enhanced Markmap integration');
            // Initialize markmap integration in background
            this.markmapIntegration.init().catch(err => {
                console.warn('[App] Markmap init warning:', err.message);
            });
        } else if (window.MarkmapIntegration) {
            this.markmapIntegration = new MarkmapIntegration();
            this.logInfo('Components', 'Using standard Markmap integration');
        } else {
            this.logInfo('Components', 'Markmap integration will load later');
            this.markmapIntegration = {
                showMarkmapFromEditor: () => console.warn('Markmap integration loading...')
            };
            // Retry later when class becomes available
            this.retryMarkmapInit();
        }
        
        if (window.TikZIntegration) {
            this.tikzIntegration = new TikZIntegration();
            this.logInfo('Components', 'TikZ integration loaded');
        } else {
            this.logInfo('Components', 'TikZ integration will load later');
            this.tikzIntegration = {
                insertTikZTemplate: () => console.warn('TikZ integration loading...'),
                isReady: () => false
            };
        }
        
        // Initialize KityMinder integration
        if (window.KityMinderIntegration) {
            this.kityMinderIntegration = new KityMinderIntegration();
            window.kityMinderIntegration = this.kityMinderIntegration;
            this.kityMinderIntegration.init().catch(err => {
                console.warn('[App] KityMinder init warning:', err.message);
            });
            this.logInfo('Components', 'KityMinder integration initialized');
        } else {
            this.logInfo('Components', 'KityMinder integration will load later');
            this.kityMinderIntegration = {
                newMindmap: () => console.warn('KityMinder integration loading...'),
                isReady: () => false
            };
        }

        // Initialize enhanced LaTeX integration
        if (window.LaTeXIntegration) {
            this.latexIntegration = new LaTeXIntegration();
            this.latexIntegration.init().catch(err => {
                console.warn('[App] LaTeX init warning:', err.message);
            });
            this.logInfo('Components', 'Enhanced LaTeX integration initialized');
        } else {
            this.logInfo('Components', 'LaTeX integration will load later');
            this.latexIntegration = {
                renderDocument: () => '<div class="latex-info">LaTeX integration loading...</div>',
                isReady: () => false
            };
        }
    }
    
    /**
     * Retry Markmap initialization after a delay if it wasn't available initially
     */
    retryMarkmapInit() {
        setTimeout(() => {
            if (window.EnhancedMarkmapIntegration && !this.markmapIntegration.showMarkmapFromEditor.toString().includes('loading')) {
                return; // Already initialized
            }
            if (window.EnhancedMarkmapIntegration) {
                this.markmapIntegration = new EnhancedMarkmapIntegration();
                this.markmapIntegration.init().catch(() => {});
                this.logInfo('Components', 'Markmap integration initialized (delayed)');
            } else if (window.MarkmapIntegration) {
                this.markmapIntegration = new MarkmapIntegration();
                this.logInfo('Components', 'Markmap integration initialized (delayed)');
            }
        }, 2000);
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
            
            // Always start with a clean slate; session restore is handled manually via Open Recent
            if (typeof this.tabManager.clearPersistedState === 'function') {
                this.tabManager.clearPersistedState();
            }
            if (this.tabManager.getAllTabs().length === 0) {
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

        // Ensure the recent files submenu reflects the latest state when the menu initializes
        this.updateRecentFilesMenu();
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
            const result = this.getUnsavedTabsInfo();
            ipcRenderer.send('unsaved-tabs-response', result);
        });
        
        // Handle request to check for unsaved tabs when closing window
        ipcRenderer.on('check-unsaved-tabs-for-close', () => {
            const result = this.getUnsavedTabsInfo();
            ipcRenderer.send('unsaved-tabs-close-response', result);
        });
        
        // Handle save all tabs then quit
        ipcRenderer.on('save-all-tabs-then-quit', async () => {
            const result = await this.saveAllUnsavedTabs();
            ipcRenderer.send('save-all-complete', result);
        });
        
        // Handle save all tabs then close window
        ipcRenderer.on('save-all-tabs-then-close', async () => {
            const result = await this.saveAllUnsavedTabs();
            ipcRenderer.send('save-all-complete-close', result);
        });
    }
    
    /**
     * Get information about unsaved tabs
     * @returns {Object} - { hasUnsaved, count, tabs }
     */
    getUnsavedTabsInfo() {
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
        
        return {
            hasUnsaved: unsavedTabs.length > 0,
            count: unsavedTabs.length,
            tabs: unsavedTabs.map(t => ({ title: t.title, filepath: t.filepath }))
        };
    }
    
    /**
     * Save all unsaved tabs
     * @returns {Promise<Object>} - { success, error }
     */
    async saveAllUnsavedTabs() {
        try {
            if (this.tabManager) {
                const allTabs = this.tabManager.getAllTabs();
                const unsavedTabs = allTabs.filter(t => t.isDirty);
                
                for (const tabData of unsavedTabs) {
                    // Switch to tab and save
                    this.tabManager.switchTab(tabData.id);
                    
                    // Small delay to allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Save the file
                    const saved = await this.saveFile();
                    if (!saved) {
                        // User cancelled save dialog for new file - offer to skip or cancel all
                        const skipOrCancel = confirm(
                            `Could not save "${tabData.title}". Continue saving other files?`
                        );
                        if (!skipOrCancel) {
                            return { success: false, error: `User cancelled while saving ${tabData.title}` };
                        }
                    }
                }
            } else if (this.editor && this.editor.isFileModified()) {
                // Single editor mode
                const saved = await this.saveFile();
                if (!saved) {
                    return { success: false, error: 'User cancelled save' };
                }
            }
            
            return { success: true };
        } catch (error) {
            console.error('[App] Error saving all tabs:', error);
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    setupMenuHandlers() {
        if (this._menuHandlersInitialized) {
            return;
        }
        this._menuHandlersInitialized = true;

        const menuBar = document.getElementById('menu-bar');
        if (!menuBar) {
            console.warn('[App] Menu bar not found - skipping handler setup');
            return;
        }

        console.log('[Menu] Initializing comprehensive menu system');

        let lastPointerType = 'mouse';
        const rememberPointerType = (event) => {
            if (event.pointerType) {
                lastPointerType = event.pointerType;
            }
        };

        menuBar.addEventListener('pointerdown', rememberPointerType, true);
        menuBar.addEventListener('pointermove', rememberPointerType, true);

        const menuItems = Array.from(menuBar.querySelectorAll('.menu-item'));
        const submenus = Array.from(menuBar.querySelectorAll('.menu-submenu'));
        const dropdowns = Array.from(menuBar.querySelectorAll('.menu-dropdown'));

        const menuCloseTimers = new WeakMap();
        const submenuCloseTimers = new WeakMap();
        const MENU_CLOSE_DELAY = 300;
        const SUBMENU_CLOSE_DELAY = 280;

        const cancelPendingClose = (store, target) => {
            if (!target) return;
            const timerId = store.get(target);
            if (timerId) {
                clearTimeout(timerId);
                store.delete(target);
            }
        };

        const schedulePendingClose = (store, target, callback, delay) => {
            if (!target) return;
            cancelPendingClose(store, target);
            const timerId = window.setTimeout(() => {
                store.delete(target);
                callback();
            }, delay);
            store.set(target, timerId);
        };

        dropdowns.forEach(dropdown => {
            if (dropdown.querySelector('.menu-submenu')) {
                dropdown.classList.add('has-submenus');
            }
        });

        console.log(`[Menu] Found ${menuItems.length} menu items and ${submenus.length} submenus`);

        const getMenuLabel = (item) => item.querySelector('.menu-label');

        const resetDropdownPosition = (dropdown) => {
            if (!dropdown) return;
            dropdown.style.left = '';
            dropdown.style.right = '';
            dropdown.style.maxHeight = '';
            dropdown.classList.remove('align-left');
        };

        const adjustDropdownPosition = (dropdown) => {
            if (!dropdown) return;
            dropdown.style.left = '';
            dropdown.style.right = '';
            dropdown.style.maxHeight = '';
            dropdown.classList.remove('align-left');

            const rect = dropdown.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportPadding = 8;
            const availableHeight = Math.max(220, window.innerHeight - rect.top - viewportPadding);

            if (rect.right > viewportWidth - viewportPadding) {
                dropdown.style.left = 'auto';
                dropdown.style.right = '0';
            }

            if (!dropdown.classList.contains('has-submenus')) {
                dropdown.style.maxHeight = `${Math.min(520, availableHeight)}px`;
            }
        };

        const resetNestedPosition = (submenu) => {
            const nested = submenu.querySelector('.menu-dropdown-nested');
            if (!nested) return;
            nested.classList.remove('align-left');
            nested.style.top = '';
            nested.style.maxHeight = '';
        };

        const adjustNestedPosition = (submenu) => {
            const nested = submenu.querySelector('.menu-dropdown-nested');
            if (!nested) return;

            nested.classList.remove('align-left');
            nested.style.top = '';
            nested.style.maxHeight = '';

            const dropdown = submenu.closest('.menu-dropdown');
            if (dropdown) {
                dropdown.classList.remove('align-left');
            }

            const viewportPadding = 8;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let rect = nested.getBoundingClientRect();
            if (rect.right > viewportWidth - viewportPadding) {
                nested.classList.add('align-left');
                if (dropdown) {
                    dropdown.classList.add('align-left');
                }
                rect = nested.getBoundingClientRect();
            }

            const constrainedHeight = Math.min(480, Math.max(220, viewportHeight - (2 * viewportPadding)));
            nested.style.maxHeight = `${constrainedHeight}px`;

            rect = nested.getBoundingClientRect();
            let offset = 0;

            if (rect.bottom > viewportHeight - viewportPadding) {
                offset -= rect.bottom - (viewportHeight - viewportPadding);
            }

            if (rect.top + offset < viewportPadding) {
                offset += viewportPadding - (rect.top + offset);
            }

            nested.style.top = offset ? `${offset}px` : '';
        };

        const setExpanded = (item, expanded) => {
            const label = getMenuLabel(item);
            if (label) {
                label.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            }
        };

        const closeSubmenu = (submenu) => {
            if (!submenu) return;
            cancelPendingClose(submenuCloseTimers, submenu);
            submenu.classList.remove('open');
            const trigger = submenu.querySelector(':scope > .menu-option');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'false');
            }
            resetNestedPosition(submenu);
        };

        const closeSubmenus = (container) => {
            if (!container) return;
            const openSubmenus = container.querySelectorAll('.menu-submenu.open');
            openSubmenus.forEach(opened => closeSubmenu(opened));
        };

        const closeMenu = (item) => {
            if (!item) return;
            cancelPendingClose(menuCloseTimers, item);
            item.classList.remove('active');
            setExpanded(item, false);
            closeSubmenus(item);
            const dropdown = item.querySelector('.menu-dropdown');
            resetDropdownPosition(dropdown);
        };

        const closeAllMenus = (excludeItem = null) => {
            menuItems.forEach(menuItem => {
                if (menuItem !== excludeItem) {
                    closeMenu(menuItem);
                }
            });
        };
        this.closeAllMenus = closeAllMenus;

        const focusMenuLabel = (item) => {
            const label = getMenuLabel(item);
            if (label) {
                label.focus({ preventScroll: true });
            }
        };

        const focusAdjacentMenuItem = (currentItem, offset) => {
            const index = menuItems.indexOf(currentItem);
            if (index === -1) return;
            const nextIndex = (index + offset + menuItems.length) % menuItems.length;
            focusMenuLabel(menuItems[nextIndex]);
        };

        const getFocusableOptions = (dropdown) => {
            if (!dropdown) return [];
            const directButtons = Array.from(dropdown.querySelectorAll(':scope > button.menu-option:not([disabled])'));
            const submenuTriggers = Array.from(dropdown.querySelectorAll(':scope > .menu-submenu > .menu-option:not([disabled])'));
            return [...directButtons, ...submenuTriggers];
        };

        const openMenu = (item, options = {}) => {
            if (!item) return;
            const { focusFirstOption = false } = options;
            if (!item.classList.contains('active')) {
                closeAllMenus(item);
                item.classList.add('active');
                setExpanded(item, true);
            }
            cancelPendingClose(menuCloseTimers, item);
            const dropdown = item.querySelector('.menu-dropdown');
            adjustDropdownPosition(dropdown);
            if (focusFirstOption) {
                const focusable = getFocusableOptions(dropdown);
                if (focusable.length > 0) {
                    focusable[0].focus({ preventScroll: true });
                }
            }
        };

        const toggleMenu = (item, options = {}) => {
            if (item.classList.contains('active')) {
                closeMenu(item);
            } else {
                openMenu(item, options);
            }
        };

        menuItems.forEach(item => {
            const label = getMenuLabel(item);
            const dropdown = item.querySelector('.menu-dropdown');
            if (!label || !dropdown) return;

            label.setAttribute('role', 'menuitem');
            label.setAttribute('tabindex', '0');
            label.setAttribute('aria-haspopup', 'true');
            label.setAttribute('aria-expanded', 'false');
            dropdown.setAttribute('role', 'menu');

            label.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleMenu(item);
            });

            label.addEventListener('keydown', (event) => {
                switch (event.key) {
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        toggleMenu(item, { focusFirstOption: true });
                        break;
                    case 'ArrowDown':
                        event.preventDefault();
                        openMenu(item, { focusFirstOption: true });
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        focusAdjacentMenuItem(item, 1);
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        focusAdjacentMenuItem(item, -1);
                        break;
                    case 'Escape':
                        closeAllMenus();
                        break;
                    default:
                        break;
                }
            });

            item.addEventListener('mouseenter', () => {
                cancelPendingClose(menuCloseTimers, item);
                if (lastPointerType !== 'touch') {
                    const anyMenuOpen = menuItems.some(mi => mi.classList.contains('active'));
                    if (anyMenuOpen) {
                        openMenu(item);
                    }
                }
            });

            item.addEventListener('mouseleave', (event) => {
                if (lastPointerType !== 'touch' && !item.contains(event.relatedTarget)) {
                    schedulePendingClose(menuCloseTimers, item, () => closeMenu(item), MENU_CLOSE_DELAY);
                }
            });

            dropdown.addEventListener('mouseenter', () => {
                cancelPendingClose(menuCloseTimers, item);
            });

            dropdown.addEventListener('mouseleave', (event) => {
                if (lastPointerType !== 'touch' && !item.contains(event.relatedTarget)) {
                    schedulePendingClose(menuCloseTimers, item, () => closeMenu(item), MENU_CLOSE_DELAY);
                }
            });

            dropdown.addEventListener('keydown', (event) => {
                const focusable = getFocusableOptions(dropdown);
                if (!focusable.length) return;
                const currentIndex = focusable.indexOf(document.activeElement);

                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        if (currentIndex >= 0) {
                            focusable[(currentIndex + 1) % focusable.length].focus({ preventScroll: true });
                        } else {
                            focusable[0].focus({ preventScroll: true });
                        }
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        if (currentIndex >= 0) {
                            focusable[(currentIndex - 1 + focusable.length) % focusable.length].focus({ preventScroll: true });
                        } else {
                            focusable[focusable.length - 1].focus({ preventScroll: true });
                        }
                        break;
                    case 'Home':
                        event.preventDefault();
                        focusable[0].focus({ preventScroll: true });
                        break;
                    case 'End':
                        event.preventDefault();
                        focusable[focusable.length - 1].focus({ preventScroll: true });
                        break;
                    case 'Escape':
                        event.preventDefault();
                        closeMenu(item);
                        focusMenuLabel(item);
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        closeMenu(item);
                        focusAdjacentMenuItem(item, -1);
                        break;
                    case 'ArrowRight':
                        const currentElement = document.activeElement;
                        const parentSubmenu = currentElement ? currentElement.closest('.menu-submenu') : null;
                        if (parentSubmenu) {
                            event.preventDefault();
                            openSubmenu(parentSubmenu, { focusFirstOption: true });
                        }
                        break;
                    default:
                        break;
                }
            });
        });

        const closeSiblingSubmenus = (submenu) => {
            if (!submenu || !submenu.parentElement) return;
            const siblings = submenu.parentElement.querySelectorAll('.menu-submenu.open');
            siblings.forEach(opened => {
                if (opened !== submenu) {
                    closeSubmenu(opened);
                }
            });
        };

        const openSubmenu = (submenu, options = {}) => {
            if (!submenu) return;
            const { focusFirstOption = false } = options;

            closeSiblingSubmenus(submenu);

            submenu.classList.add('open');
            cancelPendingClose(submenuCloseTimers, submenu);
            adjustNestedPosition(submenu);
            const trigger = submenu.querySelector(':scope > .menu-option');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'true');
            }

            if (focusFirstOption) {
                const nested = submenu.querySelector('.menu-dropdown-nested');
                const focusable = getFocusableOptions(nested);
                if (focusable.length > 0) {
                    focusable[0].focus({ preventScroll: true });
                }
            }
        };

        const toggleSubmenu = (submenu) => {
            if (!submenu) return;
            if (submenu.classList.contains('open')) {
                closeSubmenu(submenu);
            } else {
                openSubmenu(submenu);
            }
        };

        submenus.forEach(submenu => {
            const trigger = submenu.querySelector(':scope > .menu-option');
            const nested = submenu.querySelector('.menu-dropdown-nested');

            if (!trigger || !nested) {
                console.warn('[Menu] Submenu missing trigger or nested dropdown:', submenu);
                return;
            }

            trigger.setAttribute('role', 'menuitem');
            trigger.setAttribute('tabindex', '-1');
            trigger.setAttribute('aria-haspopup', 'true');
            trigger.setAttribute('aria-expanded', 'false');
            nested.setAttribute('role', 'menu');

            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleSubmenu(submenu);
            });

            trigger.addEventListener('keydown', (event) => {
                switch (event.key) {
                    case 'Enter':
                    case ' ':
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSubmenu(submenu);
                        break;
                    case 'ArrowRight':
                        event.preventDefault();
                        event.stopPropagation();
                        openSubmenu(submenu, { focusFirstOption: true });
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        event.stopPropagation();
                        closeSubmenu(submenu);
                        trigger.focus({ preventScroll: true });
                        break;
                    case 'Escape':
                        event.preventDefault();
                        event.stopPropagation();
                        closeSubmenu(submenu);
                        trigger.focus({ preventScroll: true });
                        break;
                    default:
                        break;
                }
            });

            submenu.addEventListener('mouseenter', () => {
                cancelPendingClose(submenuCloseTimers, submenu);
                if (lastPointerType !== 'touch') {
                    openSubmenu(submenu);
                }
            });

            submenu.addEventListener('mouseleave', (event) => {
                if (lastPointerType !== 'touch' && !submenu.contains(event.relatedTarget)) {
                    schedulePendingClose(submenuCloseTimers, submenu, () => closeSubmenu(submenu), SUBMENU_CLOSE_DELAY);
                }
            });

            nested.addEventListener('keydown', (event) => {
                const focusable = getFocusableOptions(nested);
                if (!focusable.length) return;
                const currentIndex = focusable.indexOf(document.activeElement);

                switch (event.key) {
                    case 'ArrowDown':
                        event.preventDefault();
                        event.stopPropagation();
                        if (currentIndex >= 0) {
                            focusable[(currentIndex + 1) % focusable.length].focus({ preventScroll: true });
                        } else {
                            focusable[0].focus({ preventScroll: true });
                        }
                        break;
                    case 'ArrowUp':
                        event.preventDefault();
                        event.stopPropagation();
                        if (currentIndex >= 0) {
                            focusable[(currentIndex - 1 + focusable.length) % focusable.length].focus({ preventScroll: true });
                        } else {
                            focusable[focusable.length - 1].focus({ preventScroll: true });
                        }
                        break;
                    case 'ArrowLeft':
                        event.preventDefault();
                        event.stopPropagation();
                        closeSubmenu(submenu);
                        trigger.focus({ preventScroll: true });
                        break;
                    case 'Escape':
                        event.preventDefault();
                        event.stopPropagation();
                        closeSubmenu(submenu);
                        trigger.focus({ preventScroll: true });
                        break;
                    case 'Home':
                        event.preventDefault();
                        focusable[0].focus({ preventScroll: true });
                        break;
                    case 'End':
                        event.preventDefault();
                        focusable[focusable.length - 1].focus({ preventScroll: true });
                        break;
                    default:
                        break;
                }
            });
        });

        const closeOnOutsideClick = (event) => {
            if (!menuBar.contains(event.target)) {
                closeAllMenus();
            }
        };

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                closeAllMenus();
            }
        };

        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        menuBar.querySelectorAll('.menu-dropdown > button.menu-option').forEach(button => {
            if (!button.parentElement.classList.contains('menu-submenu')) {
                button.addEventListener('click', () => {
                    window.requestAnimationFrame(() => closeAllMenus());
                });
            }
        });

        menuBar.querySelectorAll('.menu-dropdown-nested > button.menu-option').forEach(button => {
            button.addEventListener('click', () => {
                window.requestAnimationFrame(() => closeAllMenus());
            });
        });

        this._menuCleanup = () => {
            document.removeEventListener('click', closeOnOutsideClick);
            document.removeEventListener('keydown', closeOnEscape);
        };

        console.log('[Menu] Menu system initialization complete');
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
        this.bindButton('tocBtn', () => this.insertTOC());
        this.bindButton('footnoteBtn', () => this.insertFootnote());
        this.bindButton('emojiBtn', () => this.showEmojiPicker());
        
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

    isPromptOverlayActive() {
        if (typeof document === 'undefined' || !document.body) {
            return false;
        }
        return document.body.classList.contains('prompt-active');
    }

    getBookManagerInstance(createIfMissing = true) {
        if (this.bookManager) {
            return this.bookManager;
        }
        if (!createIfMissing) {
            return null;
        }
        if (typeof BookManager === 'undefined') {
            console.warn('[App] BookManager script not loaded');
            return null;
        }
        this.bookManager = new BookManager({
            createExportDocument: (content, title) => {
                if (this.preview && typeof this.preview.createExportDocument === 'function') {
                    return this.preview.createExportDocument(content, title);
                }
                return null;
            },
            sanitizeExport: (html) => {
                if (this.preview && typeof this.preview.sanitizeExport === 'function') {
                    return this.preview.sanitizeExport(html);
                }
                return html;
            },
            app: this
        });
        if (typeof this.bookManager.setApp === 'function') {
            this.bookManager.setApp(this);
        }
        return this.bookManager;
    }

    invokeBookManager(methodName) {
        const manager = this.getBookManagerInstance();
        if (!manager) {
            this.showError('Book module unavailable.');
            return;
        }
        const fn = manager[methodName];
        if (typeof fn === 'function') {
            try {
                const result = fn.call(manager);
                return result;
            } catch (error) {
                this.showError(`Book action failed: ${error.message || error}`);
            }
        } else {
            console.warn('[App] BookManager missing method:', methodName);
        }
    }

    // ========== BOOK MODE UI METHODS ==========

    setupBookModeUI() {
        // Book Mode close button
        this.bindButton('book-mode-close', () => this.toggleBookMode(false));

        // Book Mode navigation controls
        this.bindButton('book-nav-refresh', () => this.refreshBookStructure());
        this.bindButton('book-nav-add-chapter', () => this.addBookChapter());

        // Book Mode action buttons
        this.bindButton('book-action-build-all', () => this.buildBookAll());
        this.bindButton('book-action-preview', () => this.invokeBookManager('serveBook'));
        this.bindButton('book-action-export-pdf', () => this.invokeBookManager('exportBookPdf'));

        // Book editor controls
        this.bindButton('book-editor-save', () => this.saveCurrentBookChapter());
        this.bindButton('book-editor-preview-toggle', (event) => {
            const target = event?.currentTarget || event?.target;
            if (target && target.classList) {
                target.classList.toggle('active');
            }
            this.toggleBookPreview();
        });
        this.bindButton('book-title-edit', () => this.editBookTitle());

        // Book search
        const bookSearchInput = document.getElementById('book-search-input');
        if (bookSearchInput) {
            let searchTimeout;
            bookSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performBookSearch(e.target.value);
                }, 300);
            });
        }

        // Initialize book editor with live preview
        const bookEditor = document.getElementById('book-chapter-editor');
        if (bookEditor) {
            bookEditor.addEventListener('input', () => {
                this.updateBookChapterPreview();
            });
        }

        this.setupBookStyleControls();
    }

    setupBookStyleControls() {
        const select = document.getElementById('book-style-select');
        if (!select) {
            return;
        }
        this.bookStyleSelect = select;
        const placeholder = '<option value="" disabled selected>Select HTML style...</option>';
        const optionsMarkup = this.bookStyleOptions
            .map(option => `<option value="${option.value}">${option.label}</option>`)
            .join('');
        select.innerHTML = placeholder + optionsMarkup;
        select.disabled = true;
        select.addEventListener('change', (event) => {
            this.handleBookStyleChange(event.target.value);
        });
    }

    getBookStyleLabel(styleKey) {
        const match = this.bookStyleOptions.find(option => option.value === styleKey);
        return match ? match.label : (styleKey || 'Custom');
    }

    syncBookStyleSelectWithConfig(config) {
        const select = this.bookStyleSelect || document.getElementById('book-style-select');
        if (!select) {
            return;
        }
        if (!config) {
            select.value = '';
            select.disabled = true;
            return;
        }
        const targetStyle = config.bookStyle || this.resolveBookStyleForType(config.type);
        const validStyle = this.bookStyleOptions.some(option => option.value === targetStyle) ? targetStyle : 'dark';
        select.disabled = false;
        select.value = validStyle;
    }

    resolveBookStyleForType(type) {
        const normalized = (type || '').toLowerCase();
        if (normalized === 'classical') return 'classic';
        if (normalized === 'wiki') return 'wiki';
        if (normalized === 'help') return 'helpdesk';
        if (normalized === 'technical') return 'technical';
        return 'dark';
    }

    async handleBookStyleChange(newStyle) {
        if (!newStyle) {
            return;
        }
        const manager = this.getBookManagerInstance();
        if (!manager) {
            this.showError('Book module unavailable.');
            return;
        }
        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) {
            this.showMessage('Open a book project first to change HTML style.');
            this.syncBookStyleSelectWithConfig(this.currentBookData?.config || null);
            return;
        }
        const pathModule = manager.getPathModule();
        const fs = manager.getFsModule();
        if (!pathModule || !fs) {
            this.showError('File system access unavailable');
            this.syncBookStyleSelectWithConfig(this.currentBookData?.config || null);
            return;
        }

        const configPath = pathModule.join(rootDir, 'book.config.json');
        try {
            const raw = await fs.promises.readFile(configPath, 'utf-8');
            const config = JSON.parse(raw);
            if (config.bookStyle === newStyle) {
                this.showMessage('HTML style already applied.');
                return;
            }
            config.bookStyle = newStyle;
            await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
            if (this.currentBookData && this.currentBookData.config) {
                this.currentBookData.config.bookStyle = newStyle;
            }
            this.showMessage(`HTML style updated to ${this.getBookStyleLabel(newStyle)}.`);
        } catch (error) {
            console.error('[App] Failed to update book style:', error);
            this.showError(`Failed to update book style: ${error.message || error}`);
            this.syncBookStyleSelectWithConfig(this.currentBookData?.config || null);
        }
    }

    toggleBookMode(enabled) {
        const bookModePanel = document.getElementById('book-mode-panel');
        const mainContent = document.getElementById('main-content');
        const menuToggle = document.getElementById('menu-book-mode-enabled');

        if (!bookModePanel) return;

        if (enabled) {
            // Enter Book Mode
            bookModePanel.style.display = 'block';
            mainContent.style.display = 'none';
            if (menuToggle) menuToggle.checked = true;
            
            // Load current book project if available
            this.loadBookProject();
            this.showMessage('Book Mode activated');
        } else {
            // Exit Book Mode
            bookModePanel.style.display = 'none';
            mainContent.style.display = 'flex';
            if (menuToggle) menuToggle.checked = false;
            this.syncBookStyleSelectWithConfig(null);
            this.showMessage('Book Mode deactivated');
        }
    }

    async newBookProject(type = 'classical') {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const typeNames = {
            'classical': 'Classical Book',
            'wiki': 'Wiki Documentation',
            'help': 'Help Documentation',
            'technical': 'Technical Documentation'
        };

        // Collect all book details in a single dialog
        const details = await this.showBookCreationDialog(type);
        if (!details) return;
        const { title, author, description, sections, chapterCount, appendixCount, showChapterNumbers, technicalStyle } = details;
        const defaultBookStyle = this.resolveBookStyleForType(type);

        // Select directory
        const rootDir = await manager.promptForDirectory(`Select folder for ${typeNames[type]}`);
        if (!rootDir) return;

        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('book-init-project', {
                targetDir: rootDir,
                config: {
                    type,
                    title,
                    author,
                    description: description || `A ${typeNames[type].toLowerCase()} created with MarkDD`,
                    sections: sections && sections.length ? sections : null,
                    minimal: true, // Flag to create minimal content, not full examples
                    chapterCount: chapterCount || 3,
                    appendixCount: appendixCount || 0,
                    showChapterNumbers: showChapterNumbers !== false,
                    bookStyle: defaultBookStyle,
                    ...(type === 'technical' ? { technicalStyle: technicalStyle || 'report' } : {})
                }
            });

            if (!result || !result.success) {
                this.showError(result?.error || 'Failed to create book project');
                return;
            }

            manager.rememberBookRoot(rootDir);
            
            // Success message with clear next steps
            const message = `✓ ${typeNames[type]} created: "${title}"\n\n` +
                `Empty book structure is ready.\n\n` +
                `Next steps:\n` +
                `1. Book Mode is now active\n` +
                `2. Click chapters in Table of Contents to edit\n` +
                `3. Replace placeholder text with your content\n` +
                `4. Use "Build All" when ready to export`;
            
            alert(message);
            
            // Auto-enable Book Mode and load the structure
            this.toggleBookMode(true);
            await this.loadBookProject();
        } catch (error) {
            this.showError(`Failed to create book: ${error.message || error}`);
        }
    }

    async openBookProject() {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = await manager.promptForDirectory('Select Book Project Folder');
        if (!rootDir) return;

        manager.rememberBookRoot(rootDir);
        this.toggleBookMode(true);
        await this.loadBookProject();
    }

    async showBookExample(type = 'classical') {
        // Load embedded example book and create it as a temporary filesystem project
        // so all export/build features work properly
        if (typeof window.BookExamples === 'undefined') {
            this.showError('Book examples not loaded. Please refresh the application.');
            return;
        }

        const example = window.BookExamples.getExample(type);
        if (!example) {
            this.showError(`Example for type "${type}" not found.`);
            return;
        }

        try {
            const { ipcRenderer } = require('electron');
            const manager = this.getBookManagerInstance();
            if (!manager) return;

            // Create example project in a temporary directory
            const tempResult = await ipcRenderer.invoke('book-create-temp-example', {
                type,
                config: example.config,
                chapters: example.chapters,
                structure: example.structure
            });

            if (!tempResult || !tempResult.success) {
                this.showError(tempResult?.error || 'Failed to create example project');
                return;
            }

            const tempDir = tempResult.tempDir;
            
            // Store this as a temporary book project
            manager.rememberBookRoot(tempDir);
            this.currentBookData = null; // Clear to force fresh load
            this.tempExampleDir = tempDir; // Track for potential cleanup

            // Enable Book Mode and load the structure
            this.toggleBookMode(true);
            await this.loadBookProject();

            // Update project title to indicate it's an example
            const titleEl = document.getElementById('book-project-title');
            if (titleEl && example.config) {
                titleEl.textContent = `${example.config.title} (Example)`;
            }

            this.showMessage(`Loaded ${example.config.title} example - Full-featured demonstration with export capability`);
        } catch (error) {
            this.showError(`Failed to load example: ${error.message || error}`);
        }
    }

    async loadBookProject() {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) {
            this.showMessage('No book project loaded. Create or open a book project first.');
            this.syncBookStyleSelectWithConfig(null);
            return;
        }

        try {
            // Load book structure via IPC
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('book-load-structure', { rootDir });
            
            if (!result || !result.success) {
                this.showError(result?.error || 'Failed to load book structure');
                return;
            }

            const bookData = {
                ...(result.data || {}),
                rootDir
            };

            const filesystemStructure = await this.buildStructureFromFilesystem(rootDir, bookData.config || {});
            const summaryNodes = this.normalizeBookStructure(bookData.structure);
            let appendedUnlisted = false;

            if ((!summaryNodes.length) && filesystemStructure.length) {
                bookData.structure = { root: filesystemStructure };
            } else if (summaryNodes.length && filesystemStructure.length) {
                const knownLinks = new Set();
                this.collectBookLinks(summaryNodes, knownLinks);
                const missingNodes = this.extractMissingFilesystemNodes(filesystemStructure, knownLinks);
                if (missingNodes.length) {
                    appendedUnlisted = true;
                    const nextSequence = this.getNextSequenceValue(summaryNodes);
                    summaryNodes.push({
                        title: 'Unlisted Chapters',
                        id: this.createBookNodeId('unlisted-chapters'),
                        link: '',
                        sequence: nextSequence,
                        children: missingNodes
                    });
                    bookData.structure = { root: summaryNodes };
                }
            }

            if (bookData.structure?.root?.length) {
                this.sortBookNodes(bookData.structure.root);
            }

            this.currentBookData = bookData;
            this.renderBookStructure(bookData);
            this.syncBookStyleSelectWithConfig(bookData.config);
            
            // Update project title
            const titleEl = document.getElementById('book-project-title');
            if (titleEl && bookData.config) {
                titleEl.textContent = bookData.config.title || 'Book Project';
            }

            if (appendedUnlisted) {
                this.showMessage('Loaded with unlisted chapters appended. Update SUMMARY.md to reorganize them.');
            } else {
                this.showMessage(`Loaded: ${bookData.config?.title || 'Book Project'}`);
            }
        } catch (error) {
            this.showError(`Failed to load book: ${error.message || error}`);
            this.syncBookStyleSelectWithConfig(null);
        }
    }

    renderBookStructure(bookData) {
        const tocTree = document.getElementById('book-toc-tree');
        if (!tocTree) return;

        const structureNodes = this.sortBookNodes(this.normalizeBookStructure(bookData?.structure));

        if (!structureNodes.length) {
            tocTree.innerHTML = '<p class="book-toc-placeholder">No chapters found</p>';
            return;
        }

        const formatNumbering = (segments = []) => segments.filter(Boolean).join('.');

        const renderNode = (node, level = 0, segments = []) => {
            const isChapter = node.link && !node.children?.length;
            const hasChildren = Array.isArray(node.children) && node.children.length > 0;
            const displayNumber = formatNumbering(segments);
            const shouldShowOrder = displayNumber && node.title !== 'Unlisted Chapters';
            const classes = ['book-toc-link'];
            if (shouldShowOrder) {
                classes.push('has-order');
            }

            let html = '';
            if (node.title) {
                html += `<div class="book-toc-item" style="padding-left: ${level * 16}px;">`;
                html += `<a href="#" class="${classes.join(' ')}" data-file="${node.link || ''}" data-id="${node.id || ''}">`;
                html += `<span class="book-toc-order">${shouldShowOrder ? displayNumber : ''}</span>`;
                html += `<span class="book-toc-icon">${isChapter ? '📄' : '📁'}</span>`;
                html += `<span>${this.escapeHtml(node.title)}</span>`;
                html += `</a>`;
                html += `</div>`;
            }

            if (hasChildren) {
                node.children.forEach((child, idx) => {
                    html += renderNode(child, level + 1, [...segments, idx + 1]);
                });
            }

            return html;
        };

        let html = '';
        structureNodes.forEach((node, index) => {
            html += renderNode(node, 0, [index + 1]);
        });
        
        tocTree.innerHTML = html;

        // Attach click handlers
        const links = tocTree.querySelectorAll('.book-toc-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const file = link.getAttribute('data-file');
                if (file) {
                    this.loadBookChapter(file);
                }
                // Update active state
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    normalizeBookStructure(structure) {
        if (!structure) {
            return [];
        }
        if (Array.isArray(structure)) {
            return structure;
        }
        if (Array.isArray(structure.root)) {
            return structure.root;
        }
        if (Array.isArray(structure.children)) {
            return structure.children;
        }
        return [];
    }

    collectBookLinks(nodes, linkSet) {
        if (!Array.isArray(nodes) || !linkSet) {
            return;
        }
        nodes.forEach((node) => {
            if (node && node.link) {
                linkSet.add(this.normalizeBookLink(node.link));
            }
            if (node && Array.isArray(node.children) && node.children.length) {
                this.collectBookLinks(node.children, linkSet);
            }
        });
    }

    extractMissingFilesystemNodes(nodes, existingLinks) {
        if (!Array.isArray(nodes) || !existingLinks) {
            return [];
        }
        const missing = [];
        nodes.forEach((node) => {
            if (!node) {
                return;
            }
            const normalizedLink = this.normalizeBookLink(node.link);
            const childMissing = this.extractMissingFilesystemNodes(node.children || [], existingLinks);
            const selfMissing = normalizedLink && !existingLinks.has(normalizedLink);
            if (selfMissing) {
                existingLinks.add(normalizedLink);
            }
            if (selfMissing || childMissing.length) {
                const clone = { ...node };
                clone.children = childMissing;
                missing.push(clone);
            }
        });
        return missing;
    }

    normalizeBookLink(link) {
        if (!link || typeof link !== 'string') {
            return '';
        }
        return link.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
    }

    createBookNodeId(source) {
        if (!source) {
            return 'book-node';
        }
        return String(source)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || 'book-node';
    }

    formatBookNodeTitle(rawName) {
        if (!rawName) {
            return 'Untitled';
        }
        const base = rawName
            .replace(/\\/g, '/')
            .split('/')
            .pop()
            .replace(/\.md$/i, '');
        const cleaned = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        return cleaned.replace(/\b\w/g, (char) => char.toUpperCase()) || 'Untitled';
    }

    getNextSequenceValue(nodes) {
        let max = 0;
        const traverse = (items = []) => {
            items.forEach((node) => {
                if (!node) {
                    return;
                }
                if (typeof node.sequence === 'number') {
                    max = Math.max(max, node.sequence);
                }
                if (Array.isArray(node.children) && node.children.length) {
                    traverse(node.children);
                }
            });
        };
        traverse(nodes || []);
        return max + 1;
    }

    assignSequenceNumbers(nodes, start = 1) {
        let counter = start;
        const traverse = (items = []) => {
            items.forEach((node) => {
                if (!node) {
                    return;
                }
                node.sequence = counter++;
                if (Array.isArray(node.children) && node.children.length) {
                    traverse(node.children);
                }
            });
        };
        traverse(nodes || []);
        return counter;
    }

    sortBookNodes(nodes) {
        if (!Array.isArray(nodes)) {
            return [];
        }
        nodes.sort((a, b) => {
            const seqA = typeof a?.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER;
            const seqB = typeof b?.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER;
            if (seqA !== seqB) {
                return seqA - seqB;
            }
            const titleA = (a?.title || '').toLowerCase();
            const titleB = (b?.title || '').toLowerCase();
            return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
        });
        nodes.forEach((node) => {
            if (node && Array.isArray(node.children) && node.children.length) {
                this.sortBookNodes(node.children);
            }
        });
        return nodes;
    }

    async buildStructureFromFilesystem(rootDir, config = {}) {
        const manager = this.getBookManagerInstance(false);
        if (!manager || !rootDir) {
            return [];
        }
        const fs = manager.getFsModule();
        const pathModule = manager.getPathModule();
        if (!fs || !pathModule) {
            return [];
        }
        const contentDirName = config.contentDir || 'chapters';
        const contentDir = pathModule.join(rootDir, contentDirName);
        if (!fs.existsSync(contentDir)) {
            return [];
        }

        const normalizeRelative = (targetPath) => {
            const relativePath = pathModule.relative(rootDir, targetPath) || '';
            return relativePath.split(pathModule.sep).join('/');
        };

        const isMarkdown = (name) => /\.md$/i.test(name);
        const primaryCandidates = ['readme.md', 'index.md'];

        const walk = async (absDir, relativeDir = '', skipNames = new Set()) => {
            let entries;
            try {
                entries = await fs.promises.readdir(absDir, { withFileTypes: true });
            } catch (error) {
                console.warn('[App] Failed to scan directory:', absDir, error.message || error);
                return [];
            }
            const lowerSkip = new Set(Array.from(skipNames).map((name) => name.toLowerCase()));
            entries = entries.filter((entry) => !lowerSkip.has(entry.name.toLowerCase()));
            entries.sort((a, b) => {
                if (a.isDirectory() && !b.isDirectory()) return -1;
                if (!a.isDirectory() && b.isDirectory()) return 1;
                return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
            });

            const nodes = [];

            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const subPath = pathModule.join(absDir, entry.name);
                const subRelative = relativeDir ? pathModule.join(relativeDir, entry.name) : entry.name;
                let primaryFileName = null;
                try {
                    const childEntries = await fs.promises.readdir(subPath, { withFileTypes: true });
                    for (const candidate of primaryCandidates) {
                        const match = childEntries.find((child) => child.isFile() && child.name.toLowerCase() === candidate);
                        if (match) {
                            primaryFileName = match.name;
                            break;
                        }
                    }
                } catch (error) {
                    primaryFileName = null;
                }
                const nextSkip = new Set();
                if (primaryFileName) {
                    nextSkip.add(primaryFileName.toLowerCase());
                }
                const children = await walk(subPath, subRelative, nextSkip);
                nodes.push({
                    title: this.formatBookNodeTitle(entry.name),
                    id: this.createBookNodeId(subRelative),
                    link: primaryFileName ? normalizeRelative(pathModule.join(subPath, primaryFileName)) : '',
                    children
                });
            }

            for (const entry of entries) {
                if (entry.isDirectory() || !isMarkdown(entry.name)) {
                    continue;
                }
                const relativeFile = relativeDir ? pathModule.join(relativeDir, entry.name) : entry.name;
                const normalized = normalizeRelative(pathModule.join(absDir, entry.name));
                nodes.push({
                    title: this.formatBookNodeTitle(entry.name),
                    id: this.createBookNodeId(relativeFile),
                    link: normalized,
                    children: []
                });
            }

            return nodes;
        };

        const relativeRoot = pathModule.relative(rootDir, contentDir) || contentDirName;
        const nodes = await walk(contentDir, relativeRoot, new Set());
        this.assignSequenceNumbers(nodes, 1);
        return nodes;
    }

    async loadBookChapter(relativePath) {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) {
            this.showError('No book project loaded');
            return;
        }

        try {
            const pathModule = manager.getPathModule();
            const fs = manager.getFsModule();
            if (!pathModule || !fs) return;

            const hashIndex = typeof relativePath === 'string' ? relativePath.indexOf('#') : -1;
            const cleanRelativePath = hashIndex >= 0 ? relativePath.slice(0, hashIndex) : relativePath;
            const anchorFragment = hashIndex >= 0 ? relativePath.slice(hashIndex) : '';

            const fullPath = pathModule.join(rootDir, cleanRelativePath);
            const content = await fs.promises.readFile(fullPath, 'utf-8');

            // Update editor
            const editor = document.getElementById('book-chapter-editor');
            const currentChapter = document.getElementById('book-current-chapter');
            
            if (editor) {
                editor.value = content;
                editor.dataset.currentFile = fullPath;
                editor.dataset.anchorFragment = anchorFragment; // Store for preview scrolling
                editor.readOnly = false; // Always editable now (examples are real temp projects)
                editor.style.opacity = '1';
                editor.style.cursor = 'text';
            }
            
            if (currentChapter) {
                currentChapter.textContent = anchorFragment ? `${cleanRelativePath}${anchorFragment}` : cleanRelativePath;
            }

            // Update preview
            this.updateBookChapterPreview();
        } catch (error) {
            this.showError(`Failed to load chapter: ${error.message || error}`);
        }
    }

    async updateBookChapterPreview() {
        const editor = document.getElementById('book-chapter-editor');
        const preview = document.getElementById('book-chapter-preview');
        
        if (!editor || !preview) return;

        const content = editor.value;
        if (!content || !content.trim()) {
            preview.innerHTML = '<div class="book-preview-placeholder"><p>No content to preview</p></div>';
            return;
        }

        try {
            // Use the main renderer for consistency
            if (this.renderer) {
                const html = await this.renderer.render(content);
                preview.innerHTML = html;
                
                // Handle anchor scrolling for technical documents
                const anchorFragment = editor.dataset.anchorFragment;
                if (anchorFragment && anchorFragment.startsWith('#')) {
                    const targetId = anchorFragment.substring(1);
                    const targetElement = preview.querySelector(`#${targetId}`);
                    
                    if (targetElement) {
                        // Remove any previous highlights
                        preview.querySelectorAll('.book-section-highlight').forEach(el => {
                            el.classList.remove('book-section-highlight');
                        });
                        
                        // Scroll to section
                        setTimeout(() => {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Highlight the section
                            targetElement.classList.add('book-section-highlight');
                        }, 100);
                    }
                }
            }
        } catch (error) {
            console.error('[App] Book preview render failed:', error);
            preview.innerHTML = `<div class="book-preview-placeholder"><p>Preview error: ${error.message}</p></div>`;
        }
    }

    async saveCurrentBookChapter() {
        const editor = document.getElementById('book-chapter-editor');
        if (!editor || !editor.dataset.currentFile) {
            this.showMessage('No chapter loaded');
            return;
        }

        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const fs = manager.getFsModule();
        if (!fs) return;

        try {
            await fs.promises.writeFile(editor.dataset.currentFile, editor.value, 'utf-8');
            this.showMessage('Chapter saved');
        } catch (error) {
            this.showError(`Save failed: ${error.message || error}`);
        }
    }

    async addBookChapter() {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) {
            this.showMessage('Open a book project first');
            return;
        }

        // Ask for chapter title (user-friendly)
        const chapterTitle = await this.showPrompt('Enter chapter title:', 'New Chapter');
        if (!chapterTitle || !chapterTitle.trim()) return;

        const pathModule = manager.getPathModule();
        const fs = manager.getFsModule();
        if (!pathModule || !fs) return;

        try {
            // Auto-generate safe filename from title
            const safeFileName = this.generateChapterFileName(chapterTitle.trim());
            const chapterPath = pathModule.join(rootDir, 'chapters', safeFileName);
            
            // Check if file already exists
            try {
                await fs.promises.access(chapterPath);
                this.showError(`Chapter file already exists: ${safeFileName}`);
                return;
            } catch (accessError) {
                // File doesn't exist, good to proceed
            }
            
            const template = `# ${chapterTitle.trim()}\n\nChapter content goes here.\n`;
            
            await fs.promises.writeFile(chapterPath, template, 'utf-8');
            this.showMessage(`Chapter created: "${chapterTitle.trim()}"`);
            
            // Reload structure
            await this.refreshBookStructure();
        } catch (error) {
            console.error('[App] Failed to create chapter:', error);
            this.showError(`Failed to create chapter: ${error.message || error}`);
        }
    }

    generateChapterFileName(title) {
        // Convert title to safe filename following book naming convention
        // Example: "My Great Chapter" -> "my-great-chapter.md"
        let safe = title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-')          // Replace spaces with hyphens
            .replace(/-+/g, '-')           // Remove duplicate hyphens
            .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
        
        // Ensure filename isn't empty
        if (!safe) {
            safe = 'chapter';
        }
        
        // Add .md extension
        return `${safe}.md`;
    }

    async refreshBookStructure() {
        await this.loadBookProject();
    }

    async editBookTitle() {
        const manager = this.getBookManagerInstance();
        if (!manager) {
            return;
        }

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) {
            this.showMessage('Open a book project first');
            return;
        }

        const pathModule = manager.getPathModule();
        const fs = manager.getFsModule();
        if (!pathModule || !fs) {
            this.showError('File system access unavailable');
            return;
        }

        const configPath = pathModule.join(rootDir, 'book.config.json');
        let config;
        try {
            const raw = await fs.promises.readFile(configPath, 'utf-8');
            config = JSON.parse(raw);
        } catch (error) {
            this.showError(`Failed to read book.config.json: ${error.message || error}`);
            return;
        }

        const currentTitle = config.title || 'Book Project';
        const newTitle = await this.showPrompt('Update book title:', currentTitle);
        if (newTitle === null || typeof newTitle === 'undefined') {
            return;
        }

        const trimmed = newTitle.trim();
        if (!trimmed) {
            this.showError('Book title cannot be empty');
            return;
        }
        if (trimmed === currentTitle) {
            this.showMessage('Book title unchanged');
            return;
        }

        config.title = trimmed;

        try {
            await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
            
            // Update cached data safely
            if (this.currentBookData && this.currentBookData.config) {
                this.currentBookData.config.title = trimmed;
            }
            
            // Update UI elements safely
            try {
                const titleEl = document.getElementById('book-project-title');
                if (titleEl) {
                    titleEl.textContent = trimmed;
                }
            } catch (uiError) {
                console.warn('[App] UI update failed:', uiError);
            }
            
            this.showMessage('Book title updated successfully');
        } catch (error) {
            console.error('[App] Failed to update book title:', error);
            this.showError(`Failed to update title: ${error.message || error}`);
        }
    }

    async buildBookAll() {
        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) return;

        try {
            this.showMessage('Building HTML + PDF...');
            
            const { ipcRenderer } = require('electron');
            
            // Build HTML
            const htmlResult = await ipcRenderer.invoke('book-build', { rootDir });
            if (!htmlResult || !htmlResult.success) {
                throw new Error(htmlResult?.error || 'HTML build failed');
            }

            // Build PDF
            const pdfResult = await ipcRenderer.invoke('book-export-pdf', {
                rootDir,
                outputPath: require('path').join(htmlResult.outputDir, '../book.pdf')
            });
            if (!pdfResult || !pdfResult.success) {
                throw new Error(pdfResult?.error || 'PDF export failed');
            }

            this.showMessage('HTML & PDF built successfully!');
        } catch (error) {
            this.showError(`Build failed: ${error.message || error}`);
        }
    }

    toggleBookPreview() {
        const previewSection = document.querySelector('.book-preview-section');
        if (previewSection) {
            const isHidden = previewSection.style.display === 'none';
            previewSection.style.display = isHidden ? 'flex' : 'none';
            
            // Adjust editor width
            const editorSection = document.querySelector('.book-editor-section');
            if (editorSection) {
                editorSection.style.gridColumn = isHidden ? '1 / 2' : '1 / -1';
            }
        }
    }

    activateBookLivePreview(previewUrl) {
        const previewSection = document.querySelector('.book-preview-section');
        if (previewSection) {
            previewSection.style.display = 'flex';
        }

        const editorSection = document.querySelector('.book-editor-section');
        if (editorSection) {
            editorSection.style.gridColumn = '1 / 2';
        }

        const previewContainer = document.getElementById('book-chapter-preview');
        if (!previewContainer) {
            return;
        }

        previewContainer.innerHTML = '';

        const infoBanner = document.createElement('div');
        infoBanner.className = 'book-preview-serve-banner';

        const infoStack = document.createElement('div');
        infoStack.style.cssText = 'display:flex;flex-direction:column;gap:4px;flex:1;min-width:160px;';

        const title = document.createElement('span');
        title.textContent = 'Live preview server is running';
        title.style.cssText = 'font-weight:600;color:#fff;';

        const urlRow = document.createElement('span');
        urlRow.className = 'book-preview-url';
        urlRow.textContent = previewUrl || 'Starting server...';

        infoStack.appendChild(title);
        infoStack.appendChild(urlRow);

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'book-preview-open-btn';
        openBtn.textContent = 'Open in Browser';
        openBtn.addEventListener('click', () => {
            if (!previewUrl) {
                return;
            }
            try {
                const { shell } = require('electron');
                if (shell?.openExternal) {
                    shell.openExternal(previewUrl);
                    return;
                }
            } catch (error) {
                console.warn('[App] Unable to use shell for preview:', error.message || error);
            }
            window.open(previewUrl, '_blank', 'noopener');
        });

        infoBanner.appendChild(infoStack);
        infoBanner.appendChild(openBtn);

        const iframe = document.createElement('iframe');
        iframe.id = 'book-live-preview-frame';
        iframe.className = 'book-live-preview-frame';
        iframe.title = 'Book Live Preview';
        if (previewUrl) {
            iframe.src = previewUrl;
        }

        previewContainer.appendChild(infoBanner);
        previewContainer.appendChild(iframe);
    }

    async performBookSearch(query) {
        const resultsContainer = document.getElementById('book-search-results');
        if (!resultsContainer) return;

        if (!query || query.trim().length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        resultsContainer.style.display = 'block';

        const manager = this.getBookManagerInstance();
        if (!manager) return;

        const rootDir = manager.getStoredBookRoot();
        if (!rootDir) return;

        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('book-search', { rootDir, query });

            if (!result || !result.success || !result.results || !result.results.length) {
                resultsContainer.innerHTML = '<p class="book-search-placeholder">No results found</p>';
                return;
            }

            let html = '';
            for (const item of result.results) {
                html += `<div class="book-search-result-item" data-file="${item.file}">`;
                html += `<div class="book-search-result-title">${this.escapeHtml(item.title || item.file)}</div>`;
                html += `<div class="book-search-result-snippet">${this.highlightSearchTerm(item.snippet, query)}</div>`;
                html += `</div>`;
            }

            resultsContainer.innerHTML = html;

            // Attach click handlers
            const items = resultsContainer.querySelectorAll('.book-search-result-item');
            items.forEach(item => {
                item.addEventListener('click', () => {
                    const file = item.getAttribute('data-file');
                    if (file) this.loadBookChapter(file);
                });
            });
        } catch (error) {
            console.error('[App] Book search failed:', error);
            resultsContainer.innerHTML = '<p class="book-search-placeholder">Search error</p>';
        }
    }

    showBookSearch() {
        this.toggleBookMode(true);
        const searchInput = document.getElementById('book-search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }

    highlightSearchTerm(text, term) {
        if (!text || !term) return this.escapeHtml(text || '');
        const escaped = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        return escaped.replace(regex, '<span class="book-search-highlight">$1</span>');
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        const str = String(value);
        if (!/[&<>"']/.test(str)) {
            return str;
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return str.replace(/[&<>"']/g, (char) => map[char] || char);
    }

    // ========== HELP CONTENT METHODS ==========

    openHelpMarkDD() {
        const helpContent = `# MarkDD Editor Guide

Welcome to MarkDD - a fully-featured Markdown editor with advanced rendering capabilities.

## Quick Start

### Creating Documents

1. **New File**: Press \`Ctrl+N\` or click the New button
2. **Open File**: Press \`Ctrl+O\` to open existing markdown files
3. **Save**: Press \`Ctrl+S\` to save your work

### Editing Features

#### Basic Formatting

- **Bold**: \`**text**\` or press \`Ctrl+B\`
- **Italic**: \`*text*\` or press \`Ctrl+I\`
- **Highlight**: \`==text==\` or press \`Ctrl+U\`
- **Strikethrough**: \`~~text~~\` or press \`Ctrl+Alt+S\`
- **Code**: \`\\\`code\\\`\` 

#### Headings

\`\`\`markdown
# Heading 1
## Heading 2
### Heading 3
\`\`\`

#### Lists

**Unordered:**
\`\`\`markdown
- Item 1
- Item 2
  - Nested item
\`\`\`

**Ordered:**
\`\`\`markdown
1. First item
2. Second item
   1. Nested item
\`\`\`

**Task Lists:**
\`\`\`markdown
- [x] Completed task
- [ ] Pending task
\`\`\`

### Advanced Features

#### Mathematical Expressions

Inline math: \`$E = mc^2$\`

Display math:
\`\`\`
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
\`\`\`

#### Diagrams with Mermaid

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

#### Code Blocks with Syntax Highlighting

\`\`\`javascript
function example() {
    console.log("Hello, MarkDD!");
    return true;
}
\`\`\`

#### Tables

\`\`\`markdown
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
\`\`\`

### Section and Figure Numbering

Enable automatic numbering from the **Markdown** menu:

- **Number Headings**: Automatically numbers all headings
- **Number Figures & Tables**: Adds sequential numbering to images and tables

You can customize the starting number for each.

### Toolbar Features

- **Toggle View**: Switch between editor-only, preview-only, or split view
- **Live Preview**: Enable/disable automatic preview updates
- **Manual Refresh**: Force preview refresh
- **Scroll Sync**: Synchronize editor and preview scrolling

### Export Options

#### Export as HTML

1. Click **Export as HTML** button or use menu
2. Choose destination
3. Standalone HTML file with embedded styles is created

#### Export as PDF

1. Click **Export as PDF** button
2. High-quality PDF with proper formatting
3. Includes all diagrams, math, and syntax highlighting

### Keyboard Shortcuts

#### File Operations
- **New File**: \`Ctrl+N\`
- **Open**: \`Ctrl+O\`
- **Save**: \`Ctrl+S\`
- **Save As**: \`Ctrl+Shift+S\`
- **Exit**: \`Ctrl+Q\`

#### Editing
- **Bold**: \`Ctrl+B\`
- **Italic**: \`Ctrl+I\`
- **Highlight**: \`Ctrl+U\`
- **Find**: \`Ctrl+F\`
- **Replace**: \`Ctrl+H\`
- **Undo**: \`Ctrl+Z\`
- **Redo**: \`Ctrl+Y\`

#### View
- **Toggle Sidebar**: \`Ctrl+\\\`
- **Toggle Preview**: \`Ctrl+Shift+P\`
- **Fullscreen**: \`F11\`
- **Zoom In**: \`Ctrl++\`
- **Zoom Out**: \`Ctrl+-\`
- **Reset Zoom**: \`Ctrl+0\`

### Settings & Customization

Access settings via **Tools → Settings** or \`Ctrl+,\`

- **Theme**: Choose light, dark, or color themes
- **Font Size**: Adjust editor font size
- **Autosave**: Enable automatic saving
- **Spellcheck**: Toggle spell checking
- **Word Wrap**: Enable/disable word wrapping

### Tips & Tricks

1. **Live Preview**: Keep it enabled for real-time feedback
2. **Keyboard Shortcuts**: Learn them for faster editing
3. **Table of Contents**: Automatically generated from headings
4. **Drag & Drop**: Drop markdown or image files directly into editor
5. **Multiple Tabs**: Work on several documents simultaneously

## Need More Help?

- **Feature Showcase**: See \`Help → MarkDD Feature Showcase\` for comprehensive examples
- **Presentation Mode**: See \`Help → Presentation Mode Guide\`
- **Book Mode**: See \`Help → Book Mode Guide\`
`;

        this.openHelpDocument('MarkDD Editor Guide', helpContent);
    }

    openHelpPresentation() {
        const helpContent = `# Presentation Mode Guide

Create beautiful slide presentations using Markdown.

## Getting Started

### Create New Presentation

1. Click **Presentation → New Presentation** or press \`Ctrl+Shift+N\`
2. A template is created with sample slides
3. Edit content using Markdown

### Slide Structure

Slides are separated by \`---\` (horizontal rule):

\`\`\`markdown
---
theme: berkeley
title: My Presentation
author: Your Name
---

# Welcome Slide

First slide content

---

## Second Slide

- Point 1
- Point 2

---

# Thank You
\`\`\`

## Front Matter Configuration

Add configuration at the start:

\`\`\`yaml
---
theme: berlin
title: My Presentation  
author: John Doe
date: 2025-11-15
---
\`\`\`

### Available Themes

**Classic Beamer:**
- Berkeley, Berlin, Copenhagen, Darmstadt
- Warsaw, Madrid, AnnArbor, CambridgeUS
- Pittsburgh, Rochester, Boadilla
- Antibes, JuanLesPins, Montpellier
- Malmoe, Singapore, Szeged
- Hannover, Marburg, Goettingen

**Modern Themes:**
- Simple Light, Simple Dark
- Minimal Gray, Corporate Blue
- Aurora Forge, DDT Signature
- Strata Pulse

## Features

### Navigation Panel

Enable from **Presentation** menu:

- **Position**: Left sidebar or Top bar
- **Features**: Slide thumbnails, quick navigation
- **Delay**: Configure hover delay

### Table of Contents

Automatically generated from headings:

1. Enable: **Presentation → Enable Table of Contents**
2. Appears in navigation panel
3. Click to jump to slides

### Page Numbers

Toggle from menu to show/hide slide numbers.

### Headers & Footers

- **Set Header**: Custom header text
- **Set Footer**: Custom footer text

### Slide Transitions

Choose animation:
- None (instant)
- Fade
- Slide
- Zoom

### Custom Colors

Customize presentation colors:

1. **Presentation → Customize Colors**
2. Set primary, secondary, background colors
3. Use preset color schemes

### Save Custom Themes

Create reusable themes:

1. Configure colors and settings
2. **Presentation → Save Current Theme**
3. Name your theme
4. Appears in theme menu

## Slide Content

### All Markdown Features

Slides support:
- **Math**: \`$E=mc^2$\` and display math
- **Diagrams**: Mermaid, PlantUML
- **Code**: Syntax-highlighted code blocks
- **Images**: \`![alt](image.png)\`
- **Tables**: Full table support

### Speaker Notes

Add notes that don't appear in slides:

\`\`\`markdown
## Slide Title

Visible content

<!-- Speaker notes: These won't show in the presentation -->
\`\`\`

## Preview & Export

### Preview Slides

1. **Presentation → Preview Slides** or \`Ctrl+Shift+V\`
2. Opens in new window
3. Use arrow keys to navigate
4. Press \`Esc\` to exit fullscreen

### Export

**As HTML:**
- Standalone file
- Works offline
- Share easily

**As PDF:**
- Professional output
- Print-ready
- One slide per page

## Keyboard Shortcuts

**Editing:**
- New Presentation: \`Ctrl+Shift+N\`
- Preview: \`Ctrl+Shift+V\`

**During Presentation:**
- Next: →, Space, Page Down
- Previous: ←, Page Up
- First: Home
- Last: End
- Exit Fullscreen: Esc

## Tips

1. **Keep slides simple**: One main idea per slide
2. **Use visuals**: Diagrams and images enhance understanding
3. **Limit text**: Bullet points over paragraphs
4. **Test theme**: Preview before presenting
5. **Practice navigation**: Know your keyboard shortcuts

## Examples

See **Help → Presentation Examples** for sample presentations.
`;

        this.openHelpDocument('Presentation Mode Guide', helpContent);
    }

    openHelpPresentationShowcase() {
        const showcaseContent = `---
theme: ddt-signature
title: Presentation Features Showcase
author: MarkDD Team
date: ${new Date().toISOString().split('T')[0]}
---

# Presentation Features

A comprehensive showcase of MarkDD presentation capabilities

---

## Text Formatting

- **Bold text** for emphasis
- *Italic text* for subtle emphasis
- ***Bold and italic*** for strong emphasis
- ~~Strikethrough~~ for corrections
- ==Highlighted== text
- \`Inline code\` for technical terms

---

## Lists and Structure

### Unordered Lists

- Main point 1
- Main point 2
  - Nested point
  - Another nested point
- Main point 3

### Ordered Lists

1. First step
2. Second step
3. Third step

---

## Mathematical Expressions

### Inline Math

The equation $E = mc^2$ changed physics forever.

### Display Math

$$
\\int_0^{2\\pi} \\sin(x) dx = 0
$$

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$

---

## Code Blocks

### JavaScript

\`\`\`javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

---

## Diagrams with Mermaid

### Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Deploy]
\`\`\`

---

## Sequence Diagrams

\`\`\`mermaid
sequenceDiagram
    Client->>Server: Request
    Server->>Database: Query
    Database-->>Server: Data
    Server-->>Client: Response
\`\`\`

---

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Math    | ✓      | High     |
| Diagrams| ✓      | High     |
| Themes  | ✓      | Medium   |
| Export  | ✓      | High     |

---

## Images

![Sample Image](https://picsum.photos/200/300)

*Caption: Images scale automatically*

---

## Blockquotes

> "The best way to predict the future is to invent it."
> 
> — Alan Kay

---

## Multi-Column Layouts

<div class="columns" style="display: flex; gap: 20px;">
<div class="column" style="flex: 1;">

### Left Column

- Point 1
- Point 2
- Point 3

</div>
<div class="column" style="flex: 1;">

### Right Column

- Point A
- Point B
- Point C

</div>
</div>

---

# Thank You!

## Questions?

Explore more features in MarkDD Editor

<!-- Speaker notes: Remember to demonstrate live preview and export options -->
`;

        this.openHelpDocument('Presentation Showcase', showcaseContent);
    }

    openHelpBook() {
        const helpContent = `# Book Mode Guide

Create professional books, wikis, help documentation, and technical docs.

## Overview

Book Mode provides a complete authoring environment for long-form documentation with:

- Hierarchical chapter organization
- Live preview with all MarkDD features
- Full-text search
- Multiple export formats (HTML & PDF)
- Template-based project creation

## Book Types

### Classical Book

📚 Traditional sequential reading structure:
- Preface and introduction
- Numbered chapters organized in parts
- Appendices and references
- Linear reading flow

**Best for**: Novels, textbooks, manuals

### Wiki Documentation

🌐 Interconnected knowledge base:
- Home page and navigation
- Cross-referenced pages
- Topic-based organization
- Search-driven discovery

**Best for**: Project wikis, knowledge bases, team docs

### Help Documentation

❓ Task-oriented user assistance:
- Getting started guides
- How-to articles
- Troubleshooting sections
- Quick reference

**Best for**: User manuals, support docs, tutorials

### Technical Documentation

⚙️ API and developer documentation:
- Architecture overviews
- API references
- Development guides
- Deployment instructions

**Best for**: API docs, SDKs, developer guides

## Getting Started

### Create New Book Project

1. **Book → New Book Project** → Choose type
2. Select folder location
3. Enter book title
4. Template structure is generated automatically

### Project Structure

\`\`\`
my-book/
├── book.config.json    # Configuration
├── SUMMARY.md          # Table of contents
└── chapters/           # Content files
    ├── intro.md
    ├── chapter-01.md
    └── ...
\`\`\`

### Configuration File

\`book.config.json\`:

\`\`\`json
{
  "type": "classical",
  "title": "My Book",
  "author": "Author Name",
  "description": "Book description",
  "language": "en",
  "outputDir": "book-dist"
}
\`\`\`

### Table of Contents

\`SUMMARY.md\` defines structure:

\`\`\`markdown
# My Book

- [Introduction](chapters/intro.md)

## Part I: Basics
- [Chapter 1](chapters/chapter-01.md)
- [Chapter 2](chapters/chapter-02.md)

## Part II: Advanced
- [Chapter 3](chapters/chapter-03.md)
\`\`\`

## Using Book Mode

### Enable Book Mode

**Book → Enable Book Mode** or check the menu option

### Interface

**Left Sidebar:**
- Project title and controls
- Hierarchical ToC tree
- Search input
- Quick action buttons

**Right Panel:**
- Chapter editor (top/left)
- Live preview (bottom/right)

### Editing Chapters

1. Click chapter in ToC tree
2. Edit markdown in editor
3. See live preview
4. Save with \`💾 Save\` button

### Adding Chapters

1. Click **➕ Add Chapter** button
2. Enter chapter filename
3. New file is created
4. Update SUMMARY.md to include it

### Renaming Your Book

- Click the ✏️ button beside the book title in Book Mode
- Enter the new title (it updates \`book.config.json\`)
- The sidebar, builders, and exports use the updated title immediately

### Searching

Type in search box to find content across all chapters:
- Results show matching chapters
- Click result to jump to chapter
- Highlights search terms

## Features

### All MarkDD Rendering

Books support complete MarkDD feature set:

- **Math**: KaTeX and MathJax
- **Diagrams**: Mermaid, PlantUML, TikZ
- **Code**: Syntax highlighting with highlight.js
- **Tables**: Full GFM table support
- **Task Lists**: Interactive checkboxes

### Diagram Rendering Recipes

#### Mermaid

Use fenced code blocks with the \`mermaid\` language tag:

\`\`\`mermaid
graph TD
    Start --> Decision{Ready?}
    Decision -->|Yes| Ship[Ship Release]
    Decision -->|No| Iterate[Polish Again]
\`\`\`

#### PlantUML

Wrap PlantUML syntax with \`plantuml\` fences—MarkDD encodes and renders it automatically:

\`\`\`plantuml
@startuml
actor User
User -> System: Request export
System --> User: Deliver PDF
@enduml
\`\`\`

#### KityMinder Mind Maps

Add mind maps with the \`mindmap\` fence or paste JSON exported from KityMinder:

\`\`\`mindmap
- Launch Plan
    - Scope
        - Book Mode polish
        - Diagram docs
    - Release
        - HTML
        - PDF
\`\`\`

You can also paste a \`![mindmap](:/<id>)\` reference followed by the embedded JSON comment to preserve editor-created diagrams.

### Navigation

- Click ToC items to navigate
- Nested structure with expand/collapse
- Visual indicators (📁 folders, 📄 files)
- Active chapter highlighting

### Build & Export

#### Build HTML + PDF

**🚀 Build All** button or **Book → Build All Formats**:
- Generates static HTML site
- Creates PDF

All in one operation!

#### Individual Exports

- **Build HTML Only**: Static website
- **Export as PDF**: Single PDF file

### Local Preview

**👁️ Preview** button or **Book → Preview Book Locally**:

- Starts local HTTP server
- Opens in browser
- Test navigation and search
- Enable watch mode for auto-rebuild

### Auto-Rebuild

Enable **Auto-rebuild on Changes**:
- Watches source files
- Rebuilds on save
- Refresh browser to see changes

## CLI Access

Expert users can use CLI:

\`\`\`bash
# Initialize project
npm run book -- init ./my-book --title "My Book"

# Build HTML + PDF
npm run book -- build ./my-book

# Serve locally
npm run book -- serve ./my-book --watch --port 4500
\`\`\`

## Tips

1. **Choose right type**: Select template matching your content structure
2. **Organize SUMMARY.md**: Logical structure improves navigation
3. **Use sections**: Group related chapters
4. **Add cross-references**: Link between chapters
5. **Test exports early**: Verify formatting in target formats
6. **Use search**: Find and update content across all chapters
7. **Enable watch**: Auto-rebuild during development

## Examples

Try template examples:

- **Help → Book Templates → Classical Book Example**
- **Help → Book Templates → Wiki Example**
- **Help → Book Templates → Help Documentation Example**
- **Help → Book Templates → Technical Docs Example**

Each opens a fully populated project demonstrating best practices.

## Troubleshooting

**Q: Book Mode doesn't open?**
A: Ensure you've created or opened a book project first.

**Q: Changes not appearing?**
A: Click refresh button or save the chapter.

**Q: Export fails?**
A: Check file permissions and ensure output folder is writable.

**Q: Search returns no results?**
A: Verify files exist and contain matching text.
`;

        this.openHelpDocument('Book Mode Guide', helpContent);
    }

    async openBookExample(type) {
        const typeNames = {
            'classical': 'Classical Book',
            'wiki': 'Wiki Documentation',
            'help': 'Help Documentation',
            'technical': 'Technical Documentation'
        };

        const confirmed = confirm(`Create a ${typeNames[type]} example project?\n\nThis will generate a complete sample project demonstrating best practices.`);
        if (!confirmed) return;

        await this.newBookProject(type);
    }

    openHelpDocument(title, content) {
        // Create a new tab with help content
        if (this.tabManager && this.tabManager.createTab) {
            const tabId = this.tabManager.createTab(title + '.md', content);
            this.tabManager.switchTab(tabId);
            if (this.editor) {
                this.editor.setContent(content);
            }
            if (this.preview) {
                this.preview.updatePreview(content);
            }
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
        const clearRecentBtn = document.getElementById('menu-clear-recent');
        if (clearRecentBtn) {
            clearRecentBtn.addEventListener('click', () => this.clearRecentFiles());
        }
        const recentMenu = document.getElementById('menu-recent-files');
        if (recentMenu) {
            recentMenu.addEventListener('mouseenter', () => this.updateRecentFilesMenu());
        }
        
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
        // New Tools menu items: Insert TOC, Footnote, Emoji
        this.bindButton('menu-insert-toc', () => this.insertTOC());
        this.bindButton('menu-insert-footnote', () => this.insertFootnote());
        this.bindButton('menu-insert-emoji', () => this.showEmojiPicker());
        
        // Markdown numbering toggles
        const headingNumberToggle = document.getElementById('heading-number-toggle');
        if (headingNumberToggle) {
            headingNumberToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleHeadingNumbering(e.target.checked);
            });
        }

        const figureTableNumberToggle = document.getElementById('figure-table-number-toggle');
        if (figureTableNumberToggle) {
            figureTableNumberToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleFigureTableNumbering(e.target.checked);
            });
        }

        this.bindButton('heading-number-start-btn', () => this.setHeadingNumberStart());
        this.bindButton('figure-table-number-start-btn', () => this.setFigureTableNumberStart());

        // ========== PRESENTATION MENU HANDLERS ==========
        // Initialize presentation manager if not already initialized
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        // Presentation menu handlers
        this.bindButton('menu-presentation-new', () => this.newPresentation());
        this.bindButton('menu-presentation-preview', () => this.previewPresentation());
        this.bindButton('menu-presentation-export-html', () => this.exportPresentationHTML());
        this.bindButton('menu-presentation-export-pdf', () => this.exportPresentationPDF());
        this.bindButton('menu-presentation-import-pptx', () => this.promptImportPPTX());
        this.bindButton('menu-presentation-export-pptx', () => this.exportPresentationPPTX());
        this.bindButton('pptx-import-close', () => this.closePPTXImportModal());
        this.bindButton('pptx-import-cancel-btn', () => this.closePPTXImportModal());
        this.bindButton('pptx-import-confirm-btn', () => this.confirmImportPPTX());
        
        // Classic Beamer theme selection handlers
        this.bindButton('menu-theme-berkeley', () => this.setPresentationTheme('berkeley'));
        this.bindButton('menu-theme-berlin', () => this.setPresentationTheme('berlin'));
        this.bindButton('menu-theme-copenhagen', () => this.setPresentationTheme('copenhagen'));
        this.bindButton('menu-theme-darmstadt', () => this.setPresentationTheme('darmstadt'));
        this.bindButton('menu-theme-warsaw', () => this.setPresentationTheme('warsaw'));
        this.bindButton('menu-theme-madrid', () => this.setPresentationTheme('madrid'));
        this.bindButton('menu-theme-annarbor', () => this.setPresentationTheme('annarbor'));
        this.bindButton('menu-theme-cambridgeus', () => this.setPresentationTheme('cambridgeus'));
        this.bindButton('menu-theme-pittsburgh', () => this.setPresentationTheme('pittsburgh'));
        this.bindButton('menu-theme-rochester', () => this.setPresentationTheme('rochester'));
        this.bindButton('menu-theme-boadilla', () => this.setPresentationTheme('boadilla'));
        this.bindButton('menu-theme-antibes', () => this.setPresentationTheme('antibes'));
        this.bindButton('menu-theme-juanlespins', () => this.setPresentationTheme('juanlespins'));
        this.bindButton('menu-theme-montpellier', () => this.setPresentationTheme('montpellier'));
        this.bindButton('menu-theme-malmoe', () => this.setPresentationTheme('malmoe'));
        this.bindButton('menu-theme-singapore', () => this.setPresentationTheme('singapore'));
        this.bindButton('menu-theme-szeged', () => this.setPresentationTheme('szeged'));
        this.bindButton('menu-theme-hannover', () => this.setPresentationTheme('hannover'));
        this.bindButton('menu-theme-marburg', () => this.setPresentationTheme('marburg'));
        this.bindButton('menu-theme-goettingen', () => this.setPresentationTheme('goettingen'));
        
        // Color variant theme handlers
        this.bindButton('menu-theme-berkeley-dark', () => this.setPresentationTheme('berkeley-dark'));
        this.bindButton('menu-theme-berlin-light', () => this.setPresentationTheme('berlin-light'));
        this.bindButton('menu-theme-copenhagen-blue', () => this.setPresentationTheme('copenhagen-blue'));
        this.bindButton('menu-theme-madrid-green', () => this.setPresentationTheme('madrid-green'));
        
        // Modern theme handlers
        this.bindButton('menu-theme-simple-light', () => this.setPresentationTheme('simple-light'));
        this.bindButton('menu-theme-simple-dark', () => this.setPresentationTheme('simple-dark'));
        this.bindButton('menu-theme-minimal-gray', () => this.setPresentationTheme('minimal-gray'));
        this.bindButton('menu-theme-corporate-blue', () => this.setPresentationTheme('corporate-blue'));
        this.bindButton('menu-theme-aurora-forge', () => this.setPresentationTheme('aurora-forge'));
        this.bindButton('menu-theme-ddt-signature', () => this.setPresentationTheme('ddt-signature'));
        this.bindButton('menu-theme-strata-pulse', () => this.setPresentationTheme('strata-pulse'));

    // Populate custom themes in menu (if any stored)
    this.refreshCustomThemeMenu();
        
        // Color customization handlers
        this.bindButton('menu-presentation-customize-colors', () => this.customizePresentationColors());
    this.bindButton('menu-presentation-save-theme', () => this.saveCustomPresentationTheme());
        this.bindButton('menu-color-preset-blue', () => this.applyColorPreset('blue'));
        this.bindButton('menu-color-preset-red', () => this.applyColorPreset('red'));
        this.bindButton('menu-color-preset-green', () => this.applyColorPreset('green'));
        this.bindButton('menu-color-preset-purple', () => this.applyColorPreset('purple'));
        this.bindButton('menu-color-preset-orange', () => this.applyColorPreset('orange'));
    this.bindButton('menu-color-preset-dark', () => this.applyColorPreset('dark'));
    this.bindButton('menu-color-preset-crimson-horizon', () => this.applyColorPreset('crimsonHorizon'));

        // Book module handlers (Note: book template creation is handled by specific buttons below)
        this.bindButton('menu-book-open', () => this.openBookProject());
        this.bindButton('menu-book-open-summary', () => this.invokeBookManager('openSummaryFile'));
        this.bindButton('menu-book-open-config', () => this.invokeBookManager('openConfigFile'));
        this.bindButton('menu-book-add-chapter', () => this.addBookChapter());
        this.bindButton('menu-book-build-all', () => this.buildBookAll());
        this.bindButton('menu-book-build-html', () => this.invokeBookManager('buildStaticSite'));
        this.bindButton('menu-book-export-pdf', () => this.invokeBookManager('exportBookPdf'));
        this.bindButton('menu-book-serve', () => this.invokeBookManager('serveBook'));
        this.bindButton('menu-book-stop-serve', () => this.invokeBookManager('stopServingBook'));
        this.bindButton('menu-book-search', () => this.showBookSearch());

        // Book Mode toggle
        const bookModeToggle = document.getElementById('menu-book-mode-enabled');
        if (bookModeToggle) {
            bookModeToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleBookMode(e.target.checked);
            });
        }

        const bookWatchToggle = document.getElementById('menu-book-watch-toggle');
        if (bookWatchToggle) {
            const manager = this.getBookManagerInstance(false);
            if (manager) {
                bookWatchToggle.checked = manager.isWatchEnabled();
            }
            bookWatchToggle.addEventListener('change', () => {
                const mgr = this.getBookManagerInstance();
                if (mgr && typeof mgr.setWatchPreference === 'function') {
                    mgr.setWatchPreference(bookWatchToggle.checked);
                    this.showMessage(`Book watch ${bookWatchToggle.checked ? 'enabled' : 'disabled'}`);
                }
            });
        }
        
        // Book Mode UI handlers
        this.setupBookModeUI();
        
        // Navigation toggle handler
        const navigationToggleCheckbox = document.getElementById('navigation-toggle-checkbox');
        if (navigationToggleCheckbox) {
            navigationToggleCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.togglePresentationNavigation(e.target.checked);
            });
        }
        
        // Navigation position handlers
        this.bindButton('menu-navigation-left', () => this.setNavigationPosition('left'));
        this.bindButton('menu-navigation-top', () => this.setNavigationPosition('top'));
        this.bindButton('menu-navigation-none', () => this.setNavigationPosition('none'));
        
        // TOC toggle handler
        const tocToggleCheckbox = document.getElementById('toc-toggle-checkbox');
        if (tocToggleCheckbox) {
            tocToggleCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.togglePresentationTOC(e.target.checked);
            });
        }
        
        // Tab delay handlers
        this.bindButton('menu-tab-delay-none', () => this.setTabDelay(0));
        this.bindButton('menu-tab-delay-300', () => this.setTabDelay(300));
        this.bindButton('menu-tab-delay-500', () => this.setTabDelay(500));
        this.bindButton('menu-tab-delay-1000', () => this.setTabDelay(1000));
        
        // Header/Footer handlers
        this.bindButton('menu-presentation-set-header', () => this.setHeaderText());
        this.bindButton('menu-presentation-set-footer', () => this.setFooterText());
        
        // Insert slide separator handler
        this.bindButton('menu-presentation-insert-slide', () => this.insertSlideSeparator());
        
        // Page numbers toggle handler
        const pageNumbersToggleCheckbox = document.getElementById('page-numbers-toggle-checkbox');
        if (pageNumbersToggleCheckbox) {
            pageNumbersToggleCheckbox.addEventListener('change', (e) => {
                e.stopPropagation();
                this.togglePageNumbers(e.target.checked);
            });
        }
        
        // Transition handlers
        this.bindButton('menu-transition-none', () => this.setTransition('none'));
        this.bindButton('menu-transition-fade', () => this.setTransition('fade'));
        this.bindButton('menu-transition-slide', () => this.setTransition('slide'));
        this.bindButton('menu-transition-zoom', () => this.setTransition('zoom'));
        
        // ========== END PRESENTATION MENU HANDLERS ==========
        
        // ========== CV MENU HANDLERS ==========
        if (!this.cvManager && typeof CVManager !== 'undefined') {
            this.cvManager = new CVManager();
        }

        this.bindButton('menu-cv-new', () => this.newCV());
        this.bindButton('menu-cv-preview', () => this.previewCV());
        this.bindButton('menu-cv-export-html', () => this.exportCVHTML());
        this.bindButton('menu-cv-export-pdf', () => this.exportCVPDF());

        // Bind themes
        const cvThemes = [
            'classic-latex', 'academic', 'modern-sidebar', 'minimalist',
            'decent', 'awesome-cv', 'friggeri', 'moderncv-classic',
            'moderncv-casual', 'executive', 'forty-seconds', 'twenty-seconds',
            'hipster', 'sixty-seconds', 'entry-level'
        ];
        cvThemes.forEach(theme => {
            this.bindButton(`menu-cv-theme-${theme}`, () => this.setCVTheme(theme));
        });

        // Page size
        this.bindButton('menu-cv-size-a4', () => this.setCVPageSize('a4'));
        this.bindButton('menu-cv-size-letter', () => this.setCVPageSize('letter'));

        // Color customization
        this.bindButton('menu-cv-customize-colors', () => this.customizeCVColors());

        // Color presets
        const cvColorPresets = ['navy', 'slate', 'green', 'burgundy', 'charcoal', 'teal', 'dark', 'coffee', 'sunset', 'lavender'];
        cvColorPresets.forEach(preset => {
            this.bindButton(`menu-cv-preset-${preset}`, () => this.applyCVColorPreset(preset));
        });

        // Help guides
        this.bindButton('menu-help-cv', () => this.openHelpCV());
        this.bindButton('menu-help-main-cv', () => this.openHelpCV());
        
        // CV Examples & Templates
        const cvExamples = ['classic', 'forty', 'twenty', 'hipster', 'entry'];
        cvExamples.forEach(type => {
            this.bindButton(`menu-help-cv-${type}`, () => this.showCVExample(type));
            this.bindButton(`menu-help-cv-${type}-side`, () => this.showCVExample(type));
        });

        // Photo actions
        this.bindButton('menu-cv-set-photo', () => this.selectCVPhoto());
        this.bindButton('menu-cv-remove-photo', () => this.removeCVPhoto());
        this.bindButton('menu-cv-shape-round', () => this.setCVPhotoShape('round'));
        this.bindButton('menu-cv-shape-square', () => this.setCVPhotoShape('square'));
        this.bindButton('menu-cv-shape-rectangle', () => this.setCVPhotoShape('rectangle'));
        // ========== END CV MENU HANDLERS ==========
        
        // Help menu handlers
        this.bindButton('menu-help-markdd', () => this.openHelpMarkDD());
        this.bindButton('menu-help-showcase', () => this.openHelpShowcase());
        this.bindButton('menu-help-presentation', () => this.openHelpPresentation());
        this.bindButton('menu-help-presentation-showcase', () => this.openHelpPresentationShowcase());
        this.bindButton('menu-help-book', () => this.openHelpBook());
        this.bindButton('menu-help-book-classical', () => this.showBookExample('classical'));
        this.bindButton('menu-help-book-wiki', () => this.showBookExample('wiki'));
        this.bindButton('menu-help-book-help', () => this.showBookExample('help'));
        this.bindButton('menu-help-book-technical', () => this.showBookExample('technical'));
        this.bindButton('menu-about', () => this.showAboutDialog());

        // Book type handlers
        this.bindButton('menu-book-new-classical', () => this.newBookProject('classical'));
        this.bindButton('menu-book-new-wiki', () => this.newBookProject('wiki'));
        this.bindButton('menu-book-new-help', () => this.newBookProject('help'));
        this.bindButton('menu-book-new-technical', () => this.newBookProject('technical'));

        // Ensure Markdown menu toggles reflect current front-matter state
        this.refreshMarkdownMenuStates();

        // Global keyboard shortcuts (non-conflicting with file operations)
        document.addEventListener('keydown', (e) => {
            if (this.isPromptOverlayActive()) {
                return;
            }
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

    async openFile(filePath = null, content = null, isStartupFile = false) {
        console.log('[App] openFile called with filePath:', filePath, 'isStartupFile:', isStartupFile, 'content length:', content ? content.length : 'null');
        
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
                this.recordRecentFile(filePath);
            } else {
                if (typeof require !== 'undefined') {
                    console.log('[App] openFile: No file path provided, opening dialog...');
                }
            }
            return;
        }
        
        if (filePath && content !== null) {
            console.log('[App] openFile: tabManager available, checking for existing tab');
            const fileName = this.getFileNameFromPath(filePath);
            
            // Clear restored session tabs ONLY on startup file opens
            // This prevents delay from rendering old tabs from previous session
            // Normal file opens (dialog, drag-drop) should NOT clear tabs
            if (isStartupFile && !this._restoredTabsCleared && this.tabManager.hasRestoredTabs && this.tabManager.hasRestoredTabs()) {
                this._restoredTabsCleared = true; // Mark that we've done this
                console.log('[App] openFile: Clearing restored session tabs on startup');
                // Clear TabUI DOM elements first to prevent visual delay
                if (this.tabUI && this.tabUI.clearAllTabs) {
                    this.tabUI.clearAllTabs();
                }
                // Then clear the internal tab data
                this.tabManager.clearRestoredTabs();
                this.logInfo('App', 'Cleared restored session tabs');
            }
            
            // Check if file is already open in a tab
            const existingTab = this.tabManager.findTabByFilepath(filePath);
            if (existingTab) {
                // Switch to existing tab
                console.log('[App] openFile: File already open, switching to tab:', existingTab.id);
                this.tabManager.switchTab(existingTab.id);
                this.logInfo('App', 'Switched to existing tab for: ' + filePath);
            } else {
                // Create new tab for this file - extract clean filename
                console.log('[App] openFile: Creating new tab for file:', fileName);
                this.tabManager.createTab({
                    title: fileName,
                    content: content,
                    filepath: filePath,
                    switchTo: true
                });
                this.logInfo('App', 'Opened file in new tab: ' + fileName);
            }

            this.recordRecentFile(filePath, fileName);
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
            this.refreshCVPreview(false);
            this.refreshPresentationPreview(false);
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
    async insertLink() {
        try {
            const selection = this.editor && typeof this.editor.getSelectedText === 'function'
                ? this.editor.getSelectedText()
                : '';
            const result = await this.showFormDialog({
                title: 'Insert Link',
                message: 'Provide the target URL and optional display text.',
                fields: [
                    {
                        id: 'url',
                        label: 'URL',
                        type: 'url',
                        required: true,
                        placeholder: 'https://example.com'
                    },
                    {
                        id: 'text',
                        label: 'Link text (optional)',
                        type: 'text',
                        defaultValue: selection || ''
                    }
                ],
                confirmLabel: 'Insert'
            });

            if (!result) {
                return;
            }

            const urlValue = result.url.trim();
            const linkText = result.text ? result.text.trim() : (selection || 'link');
            this.editor.insertLink(urlValue, linkText || 'link');
        } catch (error) {
            this.showError('Failed to insert link: ' + error.message);
        }
    }

    async insertImage() {
        try {
            const result = await this.showFormDialog({
                title: 'Insert Image',
                message: 'Provide the image source URL and optional description.',
                fields: [
                    {
                        id: 'url',
                        label: 'Image URL',
                        type: 'url',
                        required: true,
                        placeholder: 'https://example.com/image.png'
                    },
                    {
                        id: 'alt',
                        label: 'Alt text (optional)',
                        type: 'text'
                    }
                ],
                confirmLabel: 'Insert'
            });

            if (!result) {
                return;
            }

            const altText = result.alt ? result.alt.trim() : 'image';
            this.editor.insertImage(result.url.trim(), altText || 'image');
        } catch (error) {
            this.showError('Failed to insert image: ' + error.message);
        }
    }

    /**
     * Insert Table of Contents marker
     */
    insertTOC() {
        const tocMarker = '\n[TOC]\n\n';
        this.editor.insertText(tocMarker);
        this.showMessage('Table of Contents marker inserted. It will generate TOC from your headings.');
    }

    /**
     * Insert Footnote reference and definition
     */
    insertFootnote() {
        // Generate a unique footnote ID
        const footnoteId = this.footnoteCounter ? ++this.footnoteCounter : (this.footnoteCounter = 1);
        
        // Insert the reference at cursor
        const reference = `[^${footnoteId}]`;
        this.editor.insertText(reference);
        
        // Get current content and append definition at the end
        const content = this.editor.getContent();
        const definition = `\n\n[^${footnoteId}]: Your footnote text here.`;
        this.editor.setContent(content + definition);
        
        this.showMessage(`Footnote [^${footnoteId}] inserted. Definition added at the end of the document.`);
    }

    /**
     * Show Emoji Picker popup
     */
    showEmojiPicker() {
        // Common emojis for quick selection
        const emojis = [
            { code: 'smile', emoji: '😄' }, { code: 'heart', emoji: '❤️' }, { code: 'thumbsup', emoji: '👍' },
            { code: 'fire', emoji: '🔥' }, { code: 'star', emoji: '⭐' }, { code: 'rocket', emoji: '🚀' },
            { code: 'check', emoji: '✅' }, { code: 'warning', emoji: '⚠️' }, { code: 'info', emoji: 'ℹ️' },
            { code: 'question', emoji: '❓' }, { code: 'bulb', emoji: '💡' }, { code: 'sparkles', emoji: '✨' },
            { code: 'tada', emoji: '🎉' }, { code: 'eyes', emoji: '👀' }, { code: 'thinking', emoji: '🤔' },
            { code: 'clap', emoji: '👏' }, { code: 'muscle', emoji: '💪' }, { code: 'wave', emoji: '👋' },
            { code: 'coffee', emoji: '☕' }, { code: 'book', emoji: '📖' }, { code: 'pencil', emoji: '✏️' },
            { code: 'computer', emoji: '💻' }, { code: 'gear', emoji: '⚙️' }, { code: 'link', emoji: '🔗' }
        ];
        
        // Create popup
        let popup = document.getElementById('emoji-picker-popup');
        if (popup) {
            popup.remove();
        }
        
        popup = document.createElement('div');
        popup.id = 'emoji-picker-popup';
        popup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-primary, #fff);
            border: 1px solid var(--border-color, #e1e5e9);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 320px;
        `;
        
        popup.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0;">Insert Emoji</h4>
                <button id="emoji-close" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;">
                ${emojis.map(e => `<button class="emoji-btn" data-code="${e.code}" style="font-size: 24px; padding: 8px; background: var(--bg-secondary, #f5f5f5); border: 1px solid var(--border-color, #ddd); border-radius: 6px; cursor: pointer;" title=":${e.code}:">${e.emoji}</button>`).join('')}
            </div>
            <div style="margin-top: 12px;">
                <input type="text" id="emoji-search" placeholder="Or type emoji code (e.g., smile)" style="width: 100%; padding: 8px; border: 1px solid var(--border-color, #ddd); border-radius: 4px; box-sizing: border-box;">
            </div>
            <p style="margin: 8px 0 0; font-size: 12px; color: #666;">Tip: Type :emoji_name: in the editor</p>
        `;
        
        document.body.appendChild(popup);
        
        // Event handlers
        popup.querySelector('#emoji-close').addEventListener('click', () => popup.remove());
        
        popup.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.getAttribute('data-code');
                this.editor.insertText(`:${code}:`);
                popup.remove();
            });
        });
        
        const searchInput = popup.querySelector('#emoji-search');
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const code = searchInput.value.trim().replace(/^:|:$/g, '');
                if (code) {
                    this.editor.insertText(`:${code}:`);
                    popup.remove();
                }
            }
        });
        
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closePopup(e) {
                if (!popup.contains(e.target) && e.target.id !== 'emojiBtn') {
                    popup.remove();
                    document.removeEventListener('click', closePopup);
                }
            });
        }, 100);
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

    // ========== PRESENTATION ADDON METHODS ==========
    
    /**
     * Create a new presentation from current markdown content
     */
    newPresentation() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        // Presentation template
        const template = `---
theme: berkeley
title: My Presentation
author: Your Name
date: ${new Date().toISOString().split('T')[0]}
---

# Welcome Slide

This is your first slide.

---

## Slide 2

- Bullet point 1
- Bullet point 2
- Bullet point 3

---

## Slide 3

Add your content here.

<!-- Speaker notes: These notes won't appear in the presentation -->

---

# Thank You

Questions?
`;
        
        // Create a new tab with presentation template (like newFile does)
        console.log('[App] Creating new presentation tab...');
        
        // Create new tab via tab manager
        const tabId = this.tabManager.createTab('Untitled Presentation.md', template);
        
        // Switch to the new tab
        this.tabManager.switchTab(tabId);
        
        // Set editor content
        this.editor.setContent(template);
        
        // Update preview
        if (this.preview) {
            this.preview.updatePreview(template);
        }
        
        this.showMessage('New presentation created. Edit and use Presentation menu to preview or export.');
    }
    
    /**
     * Open native open-file dialog to choose PPTX to import
     */
    async promptImportPPTX() {
        // Close any active menus immediately to prevent them from remaining frozen when focus shifts
        document.body.click();
        document.querySelectorAll('.menu-item.active').forEach(item => {
            item.classList.remove('active');
            const dropdown = item.querySelector('.menu-dropdown');
            if (dropdown) {
                dropdown.style.left = '';
                dropdown.style.right = '';
                dropdown.style.maxHeight = '';
            }
        });

        if (typeof require === 'undefined') {
            this.showToast('Native file operations are not supported in this environment.', 'error');
            return;
        }
        
        const { ipcRenderer } = require('electron');
        try {
            const result = await ipcRenderer.invoke('show-open-pptx-dialog');
            if (result && !result.canceled && result.filePath) {
                this._pptxImportFilePath = result.filePath;
                document.getElementById('pptx-import-modal').style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to open PPTX dialog:', error);
            this.showToast('Failed to open file dialog: ' + error.message, 'error');
        }
    }

    /**
     * Close the PPTX import options modal
     */
    closePPTXImportModal() {
        document.getElementById('pptx-import-modal').style.display = 'none';
        this._pptxImportFilePath = null;
    }

    /**
     * Process PPTX import based on user choice
     */
    async confirmImportPPTX() {
        const filePath = this._pptxImportFilePath;
        if (!filePath) {
            this.closePPTXImportModal();
            return;
        }
        
        const radioButtons = document.getElementsByName('pptx-import-option');
        let selectedOption = 'both';
        for (const radio of radioButtons) {
            if (radio.checked) {
                selectedOption = radio.value;
                break;
            }
        }
        
        document.getElementById('pptx-import-modal').style.display = 'none';
        
        try {
            this.showToast('Importing PowerPoint presentation...', 'success');
            
            const PPTXImporter = require('./js/pptx-importer.js');
            const markdown = await PPTXImporter.importFile(filePath, selectedOption);
            
            const path = require('path');
            const fileName = path.basename(filePath).replace('.pptx', '.md');
            
            const tabId = this.tabManager.createTab(fileName, markdown);
            this.tabManager.switchTab(tabId);
            this.editor.setContent(markdown);
            
            if (this.preview) {
                this.preview.updatePreview(markdown);
            }
            
            this.showToast('PowerPoint presentation successfully imported!', 'success');
        } catch (error) {
            console.error('Failed to import PPTX:', error);
            this.showToast('Failed to import PowerPoint presentation: ' + error.message, 'error');
        } finally {
            this._pptxImportFilePath = null;
        }
    }

    /**
     * Export the current presentation document to PowerPoint (.pptx)
     */
    async exportPresentationPPTX() {
        // Close any active menus immediately to prevent them from remaining frozen when focus shifts
        document.body.click();
        document.querySelectorAll('.menu-item.active').forEach(item => {
            item.classList.remove('active');
            const dropdown = item.querySelector('.menu-dropdown');
            if (dropdown) {
                dropdown.style.left = '';
                dropdown.style.right = '';
                dropdown.style.maxHeight = '';
            }
        });

        if (typeof require === 'undefined') {
            this.showToast('Native file operations are not supported in this environment.', 'error');
            return;
        }
        
        const markdown = this.editor.getContent();
        if (!markdown || !markdown.trim()) {
            this.showToast('Please open or write a presentation first.', 'error');
            return;
        }
        
        if (!markdown.includes('presentation: true')) {
            const confirmExport = confirm('This document does not contain "presentation: true" in the front-matter. Export to PowerPoint anyway?');
            if (!confirmExport) return;
        }
        
        const { ipcRenderer } = require('electron');
        const path = require('path');
        
        let defaultName = 'Presentation.pptx';
        let currentFileDir = '';
        if (this.editor.currentFile) {
            const baseName = path.basename(this.editor.currentFile, path.extname(this.editor.currentFile));
            defaultName = baseName + '.pptx';
            currentFileDir = path.dirname(this.editor.currentFile);
        }
        
        try {
            const result = await ipcRenderer.invoke('show-save-pptx-dialog', defaultName);
            if (result && !result.canceled && result.filePath) {
                this.showToast('Exporting to PowerPoint...', 'success');
                
                const exportResult = await ipcRenderer.invoke('export-presentation-pptx', {
                    markdown,
                    filePath: result.filePath,
                    currentFileDir
                });
                
                if (exportResult && exportResult.success) {
                    this.showToast(`Presentation exported to: ${result.filePath}`, 'success');
                } else {
                    throw new Error((exportResult && exportResult.error) || 'Unknown export error');
                }
            }
        } catch (error) {
            console.error('Failed to export PPTX:', error);
            this.showToast('Failed to export presentation: ' + error.message, 'error');
        }
    }

    /**
     * Preview current presentation in separate window
     */
    async previewPresentation() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        try {
            // Get current editor content
            const markdown = this.editor.getContent();
            
            // Parse markdown into slides
            const presentation = this.presentationManager.parseMarkdown(markdown);
            
            if (presentation.slides.length === 0) {
                this.showError('No slides found. Use "---" to separate slides.');
                return;
            }
            
            // Preview presentation
            const result = await this.presentationManager.previewPresentation();
            
            if (result.success) {
                this.showMessage(`Presentation preview opened (${presentation.slides.length} slides)`);
            } else if (!result.canceled) {
                this.showError('Failed to preview presentation: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Preview failed: ' + error.message);
        }
    }
    
    /**
     * Export presentation as HTML
     */
    async exportPresentationHTML() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        try {
            // Get current editor content
            const markdown = this.editor.getContent();
            
            // Parse markdown into slides
            const presentation = this.presentationManager.parseMarkdown(markdown);
            
            if (presentation.slides.length === 0) {
                this.showError('No slides found. Use "---" to separate slides.');
                return;
            }
            
            // Export as HTML
            const result = await this.presentationManager.exportHTML();
            
            if (result.success) {
                this.showMessage(`Presentation exported to: ${result.filePath}`);
            } else if (!result.canceled) {
                this.showError('Failed to export presentation: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    }
    
    /**
     * Export presentation as PDF
     */
    async exportPresentationPDF() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        try {
            // Get current editor content
            const markdown = this.editor.getContent();
            
            // Parse markdown into slides
            const presentation = this.presentationManager.parseMarkdown(markdown);
            
            if (presentation.slides.length === 0) {
                this.showError('No slides found. Use "---" to separate slides.');
                return;
            }
            
            // Export as PDF
            const result = await this.presentationManager.exportPDF();
            
            if (result.success) {
                this.showMessage(`Presentation PDF exported to: ${result.filePath}`);
            } else if (!result.canceled) {
                this.showError('Failed to export PDF: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('PDF export failed: ' + error.message);
        }
    }
    
    /**
     * Set presentation theme
     */
    setPresentationTheme(theme) {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }
        
        const success = this.presentationManager.setTheme(theme);
        
        if (success) {
            const themeName = this.presentationManager.getThemeLabel(theme);
            this.showMessage(`Presentation theme set to: ${themeName}`);
            
            // Update the front-matter in the editor if present
            const content = this.editor.getContent();
            const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(frontMatterRegex);
            
            if (match) {
                const frontMatter = match[1];
                let updatedFrontMatter = frontMatter;
                
                // Check if theme already exists in front-matter
                if (/^theme:/m.test(frontMatter)) {
                    // Replace existing theme
                    updatedFrontMatter = frontMatter.replace(/^theme:.*$/m, `theme: ${theme}`);
                } else {
                    // Add theme as first line
                    updatedFrontMatter = `theme: ${theme}\n${frontMatter}`;
                }
                
                const updatedContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---`);
                this.editor.setContent(updatedContent);
                this.refreshPresentationPreview(false);
            }
        } else {
            this.showError(`Invalid theme: ${theme}`);
        }
    }

    async saveCustomPresentationTheme() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }

        const builtInThemes = this.presentationManager.getBuiltInThemeIds();
        if (!builtInThemes.length) {
            this.showError('No built-in themes available to base a custom theme on.');
            return;
        }

        const currentTheme = this.presentationManager.currentTheme || 'berkeley';
        const currentThemeData = (this.presentationManager.customThemes || {})[currentTheme];
        const defaultBaseTheme = builtInThemes.includes(currentTheme)
            ? currentTheme
            : (currentThemeData && currentThemeData.baseTheme) ? currentThemeData.baseTheme : 'berkeley';

        const themeOptions = builtInThemes.map(themeId => ({
            value: themeId,
            label: this.presentationManager.getThemeLabel(themeId)
        }));

        // Gather existing color overrides from front matter
        const content = this.editor.getContent();
        const currentColors = this.getCurrentFrontMatterColors(content) || {};

        const hexPattern = /^#?[0-9A-Fa-f]{6}$/;
        const normalizeHex = (hex) => {
            const stripped = hex.replace(/^#/, '');
            return `#${stripped.toUpperCase()}`;
        };

        const normalizedColors = {};
        Object.entries(currentColors).forEach(([key, value]) => {
            if (typeof value !== 'string') {
                return;
            }
            const trimmed = value.trim();
            if (hexPattern.test(trimmed)) {
                normalizedColors[key] = normalizeHex(trimmed);
            }
        });

        const dialogResult = await this.showFormDialog({
            title: 'Save Custom Theme',
            message: 'Name your custom theme and choose the base theme layout. Current color overrides will be saved.',
            fields: [
                {
                    id: 'name',
                    label: 'Theme name',
                    type: 'text',
                    required: true,
                    placeholder: 'Aurora Custom'
                },
                {
                    id: 'baseTheme',
                    label: 'Base theme',
                    type: 'select',
                    options: themeOptions,
                    defaultValue: defaultBaseTheme
                }
            ],
            confirmLabel: 'Save Theme'
        });

        if (!dialogResult) {
            this.showMessage('Custom theme save canceled');
            return;
        }

        const themeName = dialogResult.name ? dialogResult.name.trim() : '';
        if (!themeName) {
            this.showError('Theme name cannot be empty');
            return;
        }

        const baseTheme = builtInThemes.includes(dialogResult.baseTheme) ? dialogResult.baseTheme : defaultBaseTheme;

        try {
            const themeId = this.presentationManager.createCustomTheme({
                name: themeName,
                baseTheme,
                colors: normalizedColors
            });

            this.refreshCustomThemeMenu();
            this.setPresentationTheme(themeId);
            this.showMessage(`Custom theme saved as: ${themeName}`);
        } catch (error) {
            this.showError(`Failed to save custom theme: ${error.message}`);
        }
    }

    refreshCustomThemeMenu() {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }

        const container = document.getElementById('custom-theme-list');
        const header = document.getElementById('custom-themes-header');

        if (!container) {
            return;
        }

        container.innerHTML = '';

        const customThemes = this.presentationManager.getCustomThemes();
        if (!customThemes.length) {
            container.style.display = 'none';
            if (header) {
                header.style.display = 'none';
            }
            return;
        }

        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '4px';

        if (header) {
            header.style.display = 'block';
        }

        customThemes
            .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id))
            .forEach((theme) => {
                const button = document.createElement('button');
                button.className = 'menu-option theme-option custom-theme-option';
                button.textContent = theme.label || this.presentationManager.getThemeLabel(theme.id);
                button.dataset.themeId = theme.id;
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.setPresentationTheme(theme.id);
                });
                container.appendChild(button);
            });
    }

    /**
     * Customize presentation colors
     */
    async customizePresentationColors() {
        const colorInputs = [
            { key: 'primary', label: 'Primary color', example: '#1976d2' },
            { key: 'secondary', label: 'Secondary color', example: '#64b5f6' },
            { key: 'background', label: 'Background color', example: '#ffffff' },
            { key: 'text', label: 'Text color', example: '#212121' }
        ];

        const hexPattern = /^#?[0-9A-Fa-f]{6}$/;

        const normalizeHex = (hex) => {
            const stripped = hex.replace(/^#/, '');
            return `#${stripped.toUpperCase()}`;
        };

        const normalizeColorMap = (map) => {
            const normalized = {};
            Object.entries(map || {}).forEach(([key, value]) => {
                if (typeof value !== 'string') {
                    return;
                }
                const trimmed = value.trim();
                if (hexPattern.test(trimmed)) {
                    normalized[key] = normalizeHex(trimmed);
                }
            });
            return normalized;
        };

        const content = this.editor.getContent();
        const currentColorsRaw = this.getCurrentFrontMatterColors(content);
        const normalizedExisting = normalizeColorMap(currentColorsRaw);
        const updatedColors = { ...normalizedExisting };

        for (const { key, label, example } of colorInputs) {
            const response = await this.promptForText({
                title: 'Customize Presentation Colors',
                message: `${label} (hex format, e.g., ${example})`,
                defaultValue: updatedColors[key] || '',
                placeholder: example,
                confirmText: 'Save',
                cancelText: 'Cancel'
            });

            if (response === null) {
                this.showMessage('Custom color update canceled');
                return;
            }

            const trimmed = response.trim();

            if (trimmed === '') {
                delete updatedColors[key];
                continue;
            }

            if (!hexPattern.test(trimmed)) {
                this.showError(`Invalid hex color format for ${key}. Please use format like ${example}`);
                return;
            }

            updatedColors[key] = normalizeHex(trimmed);
        }

        const normalizedUpdated = normalizeColorMap(updatedColors);

        const existingEntries = Object.entries(normalizedExisting).sort((a, b) => a[0].localeCompare(b[0]));
        const updatedEntries = Object.entries(normalizedUpdated).sort((a, b) => a[0].localeCompare(b[0]));

        if (JSON.stringify(existingEntries) === JSON.stringify(updatedEntries)) {
            this.showMessage('Custom colors unchanged');
            return;
        }

        this.updateFrontMatterColors(normalizedUpdated);

        if (Object.keys(normalizedUpdated).length === 0) {
            this.showMessage('Custom colors removed; theme defaults restored');
        } else {
            this.showMessage('Custom colors applied to presentation');
        }
    }

    /**
     * Apply color preset
     */
    applyColorPreset(preset) {
        const presets = {
            blue: {
                primary: '#1976d2',
                secondary: '#64b5f6',
                background: '#ffffff',
                text: '#212121'
            },
            red: {
                primary: '#d32f2f',
                secondary: '#ef5350',
                background: '#ffffff',
                text: '#212121'
            },
            green: {
                primary: '#388e3c',
                secondary: '#66bb6a',
                background: '#ffffff',
                text: '#212121'
            },
            purple: {
                primary: '#7b1fa2',
                secondary: '#ba68c8',
                background: '#ffffff',
                text: '#212121'
            },
            orange: {
                primary: '#e64a19',
                secondary: '#ff7043',
                background: '#ffffff',
                text: '#212121'
            },
            dark: {
                primary: '#90caf9',
                secondary: '#ffab91',
                background: '#212121',
                text: '#e0e0e0'
            },
            crimsonHorizon: {
                primary: '#ff1f1b',
                secondary: '#101820',
                background: '#f5f5f5',
                text: '#141414'
            }
        };
        
        const colors = presets[preset];
        if (!colors) {
            this.showError(`Unknown color preset: ${preset}`);
            return;
        }
        
        this.updateFrontMatterColors(colors);
        this.showMessage(`${preset.charAt(0).toUpperCase() + preset.slice(1)} color preset applied`);
    }

    /**
     * Update front-matter with colors
     */
    updateFrontMatterColors(colors) {
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);

        const hasColors = colors && Object.keys(colors).length > 0;
        let updatedContent = content;

        if (match) {
            let updatedFrontMatter = match[1];

            updatedFrontMatter = updatedFrontMatter.replace(/^colors:\s*\n(?:  .*\n)*/m, '').trim();

            if (hasColors) {
                const colorsLines = Object.entries(colors)
                    .map(([key, value]) => `  ${key}: ${value}`);
                const colorsBlock = ['colors:', ...colorsLines].join('\n');
                updatedFrontMatter = updatedFrontMatter ? `${updatedFrontMatter}\n${colorsBlock}` : colorsBlock;
            }

            const replacement = updatedFrontMatter ? `---\n${updatedFrontMatter}\n---` : `---\n---`;
            updatedContent = content.replace(frontMatterRegex, replacement);
        } else if (hasColors) {
            const colorsLines = Object.entries(colors)
                .map(([key, value]) => `  ${key}: ${value}`);
            const colorsBlock = ['colors:', ...colorsLines].join('\n');
            updatedContent = `---\n${colorsBlock}\n---\n\n${content}`;
        }

        this.editor.setContent(updatedContent);
        
        // Refresh preview if in presentation mode
        if (this.presentationManager && this.preview) {
            this.updatePreview();
            this.refreshPresentationPreview(false);
        }
    }

    /**
     * Toggle presentation navigation in front-matter
     */
    togglePresentationNavigation(enabled) {
        const navToggle = document.getElementById('menu-presentation-toggle-navigation');
        const content = this.editor.getContent();
        const rawValue = this.getCurrentFrontMatterValue(content, 'navigation');
        const resolvedValue = this.resolveNavigationValue(rawValue, content);

        if (!enabled) {
            if (resolvedValue === 'left' || resolvedValue === 'top') {
                this._lastNavigationPosition = resolvedValue;
            }
            this.updateFrontMatterField(content, 'navigation', 'none');
            if (navToggle) {
                navToggle.checked = false;
            }
            this.showMessage('Navigation disabled');
            return;
        }

        if (resolvedValue === 'left' || resolvedValue === 'top') {
            this._lastNavigationPosition = resolvedValue;
        }

        let targetPosition = this._lastNavigationPosition;
        if (targetPosition !== 'left' && targetPosition !== 'top') {
            targetPosition = resolvedValue;
        }
        if (targetPosition !== 'left' && targetPosition !== 'top') {
            targetPosition = this.determineDefaultNavigationPosition(content);
        }
        if (targetPosition !== 'left' && targetPosition !== 'top') {
            targetPosition = 'left';
        }

        this._lastNavigationPosition = targetPosition;
        this.updateFrontMatterField(content, 'navigation', targetPosition);
        if (navToggle) {
            navToggle.checked = true;
        }
        const label = targetPosition === 'top' ? 'top bar' : 'left sidebar';
        this.showMessage(`Navigation enabled (${label})`);
    }

    setNavigationPosition(position) {
        const normalized = typeof position === 'string' ? position.trim().toLowerCase() : 'none';
        const validPositions = ['left', 'top', 'none'];
        if (!validPositions.includes(normalized)) {
            this.showError(`Unknown navigation position: ${position}`);
            return;
        }

        const content = this.editor.getContent();
        if (normalized === 'left' || normalized === 'top') {
            this._lastNavigationPosition = normalized;
        }

        this.updateFrontMatterField(content, 'navigation', normalized);

        const navToggle = document.getElementById('menu-presentation-toggle-navigation');
        if (navToggle) {
            navToggle.checked = normalized !== 'none';
        }

        const positionName = normalized === 'none' ? 'disabled' : (normalized === 'left' ? 'left sidebar' : 'top bar');
        this.showMessage(`Navigation set to ${positionName}`);
    }

    togglePresentationTOC(enabled) {
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        let updatedContent;
        
        if (match) {
            // Front-matter exists, update it
            let frontMatter = match[1];
            
            // Remove existing toc line if present
            frontMatter = frontMatter.replace(/^toc:\s*.+$/m, '');
            
            // Add toc line
            frontMatter = frontMatter.trim() + `\ntoc: ${enabled}`;
            
            updatedContent = content.replace(frontMatterRegex, `---\n${frontMatter}\n---`);
        } else {
            // No front-matter, create it
            updatedContent = `---\ntoc: ${enabled}\n---\n\n${content}`;
        }
        
        this.editor.setContent(updatedContent);
        
        // Refresh preview
        if (this.presentationManager && this.preview) {
            this.updatePreview();
            this.refreshPresentationPreview(false);
        }
        
        this.showMessage(`Table of Contents ${enabled ? 'enabled' : 'disabled'}`);
    }

    setTabDelay(delay) {
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        let updatedContent;
        
        if (match) {
            // Front-matter exists, update it
            let frontMatter = match[1];
            
            // Remove existing tabDelay line if present
            frontMatter = frontMatter.replace(/^tabDelay:\s*.+$/m, '');
            
            // Add tabDelay line (only if not 0)
            if (delay > 0) {
                frontMatter = frontMatter.trim() + `\ntabDelay: ${delay}`;
            }
            
            updatedContent = content.replace(frontMatterRegex, `---\n${frontMatter}\n---`);
        } else {
            // No front-matter, create it (only if delay > 0)
            if (delay > 0) {
                updatedContent = `---\ntabDelay: ${delay}\n---\n\n${content}`;
            } else {
                updatedContent = content;
            }
        }
        
        this.editor.setContent(updatedContent);
        
        // Refresh preview
        if (this.presentationManager && this.preview) {
            this.updatePreview();
            this.refreshPresentationPreview(false);
        }
        
        const delayText = delay === 0 ? 'disabled' : `${delay}ms`;
        this.showMessage(`Tab reveal delay set to ${delayText}`);
    }

    promptForText(options = {}) {
        const {
            title = 'Input Required',
            message = '',
            defaultValue = '',
            placeholder = '',
            multiline = false,
            confirmText = 'Save',
            cancelText = 'Cancel'
        } = options;

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'input-dialog-overlay';
            overlay.classList.add('prompt-overlay');
            if (document.body) {
                document.body.classList.add('prompt-active');
            }
            if (typeof window !== 'undefined') {
                window.markddPromptActive = true;
            }

            const dialog = document.createElement('div');
            dialog.className = 'input-dialog';

            if (title) {
                const heading = document.createElement('h3');
                heading.textContent = title;
                dialog.appendChild(heading);
            }

            if (message) {
                const description = document.createElement('p');
                description.textContent = message;
                dialog.appendChild(description);
            }

            const input = multiline ? document.createElement('textarea') : document.createElement('input');
            if (!multiline) {
                input.type = 'text';
            }
            input.value = defaultValue || '';
            input.placeholder = placeholder || '';

            dialog.appendChild(input);

            const actions = document.createElement('div');
            actions.className = 'input-dialog-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.textContent = cancelText;

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'confirm-btn';
            confirmBtn.textContent = confirmText;

            actions.appendChild(cancelBtn);
            actions.appendChild(confirmBtn);
            dialog.appendChild(actions);

            const cleanup = (result) => {
                window.removeEventListener('keydown', handleWindowKeydown);
                input.removeEventListener('keydown', handleInputKeydown);
                overlay.remove();
                const stillOpen = document.querySelector('.prompt-overlay');
                if (!stillOpen && document.body) {
                    document.body.classList.remove('prompt-active');
                }
                if (typeof window !== 'undefined') {
                    window.markddPromptActive = !!stillOpen;
                }
                resolve(result);
            };

            const handleWindowKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };

            const handleInputKeydown = (event) => {
                if (!multiline && event.key === 'Enter') {
                    event.preventDefault();
                    cleanup(input.value);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };

            confirmBtn.addEventListener('click', () => cleanup(input.value));
            cancelBtn.addEventListener('click', () => cleanup(null));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    cleanup(null);
                }
            });

            input.addEventListener('keydown', handleInputKeydown);
            window.addEventListener('keydown', handleWindowKeydown);

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
        });
    }

    async setHeaderText() {
        const currentContent = this.editor.getContent();
        const currentHeader = this.getCurrentFrontMatterValue(currentContent, 'header');

        const headerText = await this.promptForText({
            title: 'Set Header Text',
            message: 'Enter header text (leave empty to remove):',
            defaultValue: currentHeader || '',
            placeholder: 'Presentation header'
        });

        if (headerText === null) {
            return;
        }

        const trimmed = headerText.trim();
        const latestContent = this.editor.getContent();
        this.updateFrontMatterField(latestContent, 'header', trimmed);
        this.showMessage(trimmed ? 'Header updated' : 'Header removed');
    }

    async setFooterText() {
        const currentContent = this.editor.getContent();
        const currentFooter = this.getCurrentFrontMatterValue(currentContent, 'footer');

        const footerText = await this.promptForText({
            title: 'Set Footer Text',
            message: 'Enter footer text (leave empty to remove):',
            defaultValue: currentFooter || '',
            placeholder: 'Presentation footer'
        });

        if (footerText === null) {
            return;
        }

        const trimmed = footerText.trim();
        const latestContent = this.editor.getContent();
        this.updateFrontMatterField(latestContent, 'footer', trimmed);
        this.showMessage(trimmed ? 'Footer updated' : 'Footer removed');
    }

    togglePageNumbers(enabled) {
        const content = this.editor.getContent();
        this.updateFrontMatterField(content, 'pageNumbers', enabled);
        this.showMessage(`Page numbers ${enabled ? 'enabled' : 'disabled'}`);
    }

    toggleHeadingNumbering(enabled) {
        if (!this.editor) {
            console.warn('[App] Heading numbering toggle ignored - editor not ready');
            return;
        }

        const content = this.editor.getContent();
        this.updateFrontMatterField(content, 'numberHeadings', enabled ? true : '');

        if (enabled) {
            const latestContent = this.editor.getContent();
            const rawStart = this.getCurrentFrontMatterValue(latestContent, 'headingNumberStart');
            if (this.normalizeStartNumber(rawStart) === null) {
                this.updateFrontMatterField(latestContent, 'headingNumberStart', 1);
            }
        }

        this.showMessage(enabled ? 'Heading numbering enabled' : 'Heading numbering disabled');
        this.refreshMarkdownMenuStates();
    }

    toggleFigureTableNumbering(enabled) {
        if (!this.editor) {
            console.warn('[App] Figure/Table numbering toggle ignored - editor not ready');
            return;
        }

        const content = this.editor.getContent();
        this.updateFrontMatterField(content, 'numberFiguresTables', enabled ? true : '');

        if (enabled) {
            const latestContent = this.editor.getContent();
            const rawStart = this.getCurrentFrontMatterValue(latestContent, 'figureTableNumberStart');
            if (this.normalizeStartNumber(rawStart) === null) {
                this.updateFrontMatterField(latestContent, 'figureTableNumberStart', 1);
            }
        }

        this.showMessage(enabled ? 'Figure & table numbering enabled' : 'Figure & table numbering disabled');
        this.refreshMarkdownMenuStates();
    }

    async setHeadingNumberStart() {
        if (!this.editor) {
            console.warn('[App] Heading numbering start prompt ignored - editor not ready');
            return;
        }

        const content = this.editor.getContent();
        const currentValue = this.getCurrentFrontMatterValue(content, 'headingNumberStart');
        const defaultValue = this.getStartNumberOrDefault(currentValue, 1);

        const input = await this.promptForText({
            title: 'Heading Numbering Start',
            message: 'Enter the starting value for heading numbering (must be at least 1):',
            defaultValue: String(defaultValue),
            placeholder: '1'
        });

        if (input === null) {
            return;
        }

        const parsed = this.normalizeStartNumber(input);
        if (parsed === null) {
            this.showError('Heading numbering start must be a whole number greater than 0.');
            return;
        }

        const latestContent = this.editor.getContent();
        this.updateFrontMatterField(latestContent, 'headingNumberStart', parsed);
        this.showMessage(`Heading numbering will start at ${parsed}`);
        this.refreshMarkdownMenuStates();
    }

    async setFigureTableNumberStart() {
        if (!this.editor) {
            console.warn('[App] Figure/Table numbering start prompt ignored - editor not ready');
            return;
        }

        const content = this.editor.getContent();
        const currentValue = this.getCurrentFrontMatterValue(content, 'figureTableNumberStart');
        const defaultValue = this.getStartNumberOrDefault(currentValue, 1);

        const input = await this.promptForText({
            title: 'Figure/Table Numbering Start',
            message: 'Enter the starting value for figure and table numbering (must be at least 1):',
            defaultValue: String(defaultValue),
            placeholder: '1'
        });

        if (input === null) {
            return;
        }

        const parsed = this.normalizeStartNumber(input);
        if (parsed === null) {
            this.showError('Figure/Table numbering start must be a whole number greater than 0.');
            return;
        }

        const latestContent = this.editor.getContent();
        this.updateFrontMatterField(latestContent, 'figureTableNumberStart', parsed);
        this.showMessage(`Figure and table numbering will start at ${parsed}`);
        this.refreshMarkdownMenuStates();
    }

    refreshMarkdownMenuStates() {
        if (!this.editor) {
            return;
        }

        const content = this.editor.getContent();
        const headingValue = this.getCurrentFrontMatterValue(content, 'numberHeadings');
        const figureValue = this.getCurrentFrontMatterValue(content, 'numberFiguresTables');
        const headingStartRaw = this.getCurrentFrontMatterValue(content, 'headingNumberStart');
        const figureStartRaw = this.getCurrentFrontMatterValue(content, 'figureTableNumberStart');

        const headingToggle = document.getElementById('heading-number-toggle');
        if (headingToggle) {
            headingToggle.checked = this.parseBooleanFrontMatterValue(headingValue, false);
        }

        const figureToggle = document.getElementById('figure-table-number-toggle');
        if (figureToggle) {
            figureToggle.checked = this.parseBooleanFrontMatterValue(figureValue, false);
        }

        const headingStartBtn = document.getElementById('heading-number-start-btn');
        if (headingStartBtn) {
            const headingStart = this.getStartNumberOrDefault(headingStartRaw, 1);
            const baseLabel = headingStartBtn.dataset.baseLabel || headingStartBtn.textContent.trim();
            headingStartBtn.dataset.baseLabel = baseLabel;
            headingStartBtn.textContent = `${baseLabel} (current: ${headingStart})`;
        }

        const figureStartBtn = document.getElementById('figure-table-number-start-btn');
        if (figureStartBtn) {
            const figureStart = this.getStartNumberOrDefault(figureStartRaw, 1);
            const baseLabel = figureStartBtn.dataset.baseLabel || figureStartBtn.textContent.trim();
            figureStartBtn.dataset.baseLabel = baseLabel;
            figureStartBtn.textContent = `${baseLabel} (current: ${figureStart})`;
        }
    }

    parseBooleanFrontMatterValue(value, defaultValue = false) {
        if (value === undefined || value === null || value === '') {
            return defaultValue;
        }

        if (typeof value === 'boolean') {
            return value;
        }

        const normalized = String(value).trim().toLowerCase();
        if (['true', 'yes', '1', 'on', 'enable', 'enabled'].includes(normalized)) {
            return true;
        }
        if (['false', 'no', '0', 'off', 'disable', 'disabled'].includes(normalized)) {
            return false;
        }
        return defaultValue;
    }

    getStartNumberOrDefault(value, defaultValue = 1) {
        const normalized = this.normalizeStartNumber(value);
        if (normalized === null) {
            return Math.max(1, defaultValue);
        }
        return normalized;
    }

    normalizeStartNumber(value) {
        if (value === undefined || value === null) {
            return null;
        }

        const trimmed = String(value).trim();
        if (!trimmed) {
            return null;
        }

        const parsed = parseInt(trimmed, 10);
        if (Number.isNaN(parsed) || parsed < 1) {
            return null;
        }

        return parsed;
    }

    getCurrentFrontMatterValue(content, field) {
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        if (match) {
            const fieldRegex = new RegExp(`^${field}:\\s*(.+)$`, 'm');
            const fieldMatch = match[1].match(fieldRegex);
            if (fieldMatch) {
                return fieldMatch[1].trim().replace(/^["']|["']$/g, '');
            }
        }
        return '';
    }

    getCurrentFrontMatterColors(content) {
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        const colors = {};

        if (!match) {
            return colors;
        }

        const lines = match[1].split('\n');
        let inColorsBlock = false;

        for (const rawLine of lines) {
            const line = rawLine.replace(/\s+$/, '');

            if (!inColorsBlock) {
                if (/^colors:\s*$/.test(line)) {
                    inColorsBlock = true;
                }
                continue;
            }

            if (!line.startsWith('  ')) {
                break;
            }

            const colorMatch = line.match(/^\s{2}([\w-]+):\s*["']?([^"']+)["']?\s*$/);
            if (colorMatch) {
                colors[colorMatch[1]] = colorMatch[2];
            }
        }

        return colors;
    }

    updateFrontMatterField(content, field, value) {
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        let updatedContent;
        
        // Determine if value should be written (handle boolean false explicitly)
        const shouldWrite = (value !== undefined && value !== null && value !== '');
        
        if (match) {
            // Front-matter exists, update it
            let frontMatter = match[1];
            
            // Remove existing field line if present
            const fieldRegex = new RegExp(`^${field}:\\s*.+$`, 'm');
            frontMatter = frontMatter.replace(fieldRegex, '');
            
            // Add field line - write explicit value including boolean false
            if (shouldWrite) {
                const quotedValue = typeof value === 'string' && value.includes(' ') ? `"${value}"` : value;
                frontMatter = frontMatter.trim() + `\n${field}: ${quotedValue}`;
            }
            
            updatedContent = content.replace(frontMatterRegex, `---\n${frontMatter}\n---`);
        } else {
            // No front-matter, create it with value
            if (shouldWrite) {
                const quotedValue = typeof value === 'string' && value.includes(' ') ? `"${value}"` : value;
                updatedContent = `---\n${field}: ${quotedValue}\n---\n\n${content}`;
            } else {
                updatedContent = content;
            }
        }
        
        this.editor.setContent(updatedContent);
        
        // Refresh preview
        if (this.presentationManager && this.preview) {
            this.updatePreview();
            this.refreshPresentationPreview(false);
        }
    }

    resolveNavigationValue(rawValue, content) {
        if (!rawValue && rawValue !== 0) {
            return '';
        }
        const value = String(rawValue).trim().toLowerCase();
        if (value === 'left' || value === 'top') {
            return value;
        }
        if (value === 'none') {
            return 'none';
        }
        if (['false', 'no', '0', 'off'].includes(value)) {
            return 'none';
        }
        if (['true', 'yes', '1', 'on', 'default'].includes(value)) {
            return this.determineDefaultNavigationPosition(content);
        }
        return value;
    }

    determineDefaultNavigationPosition(content) {
        if (!this.presentationManager) {
            this.presentationManager = new PresentationManager();
        }

        const manager = this.presentationManager;
        let theme = this.getCurrentFrontMatterValue(content, 'theme');
        if (!theme && manager && manager.currentTheme) {
            theme = manager.currentTheme;
        }

        let candidate = 'left';
        if (manager && typeof manager.getThemeConfig === 'function') {
            const config = manager.getThemeConfig(theme || manager.currentTheme || 'berkeley');
            if (config && config.navigation && config.navigation !== 'none') {
                candidate = config.navigation;
            }
        }

        if (candidate !== 'left' && candidate !== 'top') {
            candidate = 'left';
        }

        return candidate;
    }

    setTransition(type) {
        const content = this.editor.getContent();
        this.updateFrontMatterField(content, 'transition', type === 'none' ? '' : type);
        const displayName = type === 'none' ? 'disabled' : type;
        this.showMessage(`Slide transition set to ${displayName}`);
    }

    /**
     * Insert a slide separator at cursor position
     */
    insertSlideSeparator() {
        if (!this.editor) {
            this.showError('Editor not initialized');
            return;
        }

        // Insert slide separator with newlines
    const separator = '\n\n---\n\n';
        
    // Insert the separator at the current cursor position
    this.editor.insertText(separator);
        
        this.showMessage('Slide separator inserted');
    }
    
    // ========== END PRESENTATION ADDON METHODS ==========

    // ========== CV ADDON METHODS ==========
    
    /**
     * Create a new CV from the template
     */
    newCV() {
        if (!this.cvManager) {
            this.cvManager = new CVManager();
        }
        
        const template = `---
cv: true
theme: classic-latex
paperSize: a4
name: Jane Doe
subtitle: Senior Software Architect
# photo: "profile.jpg" # Optional: Local path, URL, or base64 profile photo
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#1b365d"
  secondary: "#475569"
  text: "#1f2937"
  background: "#ffffff"
---

## Professional Summary

A highly skilled software architect with over 10 years of experience designing and implementing distributed systems, cloud infrastructure, and modern web applications. Passionate about clean code, performance optimization, and developer productivity.

## Work Experience

### Senior Software Architect | Acme Corporation | Boston, MA | 2021 – Present
- Led the design and migration of legacy monolith applications to high-performance microservices, improving scalability by 300%.
- Designed containerized deployments using Kubernetes and Docker on AWS Cloud.
- Mentored a team of 12 engineers in best practices, design patterns, and test-driven development.

### Technical Lead | Tech Solutions Inc. | Cambridge, MA | 2017 – 2021
- Spearheaded development of a real-time analytics dashboard used by over 50 enterprise clients.
- Optimized query performance of PostgreSQL databases, reducing latency by 45%.
- Implemented continuous integration and continuous delivery (CI/CD) pipelines.

<!-- newpage -->

## Education

### Master of Science in Computer Science | Boston University | Boston, MA | 2015 – 2017
- Graduated with High Honors (GPA: 3.9/4.0).
- Thesis on distributed consensus protocols.

### Bachelor of Science in Software Engineering | Northeastern University | Boston, MA | 2011 – 2015
- Dean's List every semester.

## Key Skills

- **Languages**: JavaScript, TypeScript, Python, Go, C++, SQL
- **Frameworks & Tools**: React, Node.js, Express, Docker, Kubernetes, AWS, Git
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch
- **Methodologies**: Agile, Scrum, CI/CD, Test-Driven Development (TDD)
`;

        console.log('[App] Creating new CV tab...');
        const tabId = this.tabManager.createTab('Untitled CV.md', template);
        this.tabManager.switchTab(tabId);
        this.editor.setContent(template);
        if (this.preview) {
            this.preview.updatePreview(template);
        }
        this.showMessage('New CV template created. Edit and use CV menu to preview or export.');
    }

    /**
     * Preview current CV in separate window
     */
    async previewCV() {
        if (!this.cvManager) {
            this.cvManager = new CVManager();
        }
        
        try {
            const markdown = this.editor.getContent();
            const parsed = this.cvManager.parseMarkdown(markdown);
            
            if (!markdown.includes('cv: true')) {
                this.showError('This document is not configured as a CV. Add "cv: true" to front-matter.');
                return;
            }
            
            const result = await this.cvManager.previewCV(markdown, this.editor.currentFile);
            if (result.success) {
                this.showMessage('CV preview opened');
            } else if (!result.canceled) {
                this.showError('Failed to preview CV: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Preview failed: ' + error.message);
        }
    }

    /**
     * Export CV as HTML
     */
    async exportCVHTML() {
        if (!this.cvManager) {
            this.cvManager = new CVManager();
        }
        
        try {
            const markdown = this.editor.getContent();
            if (!markdown.includes('cv: true')) {
                this.showError('This document is not configured as a CV. Add "cv: true" to front-matter.');
                return;
            }
            
            const result = await this.cvManager.exportHTML(markdown, this.editor.currentFile);
            if (result.success) {
                this.showMessage(`CV exported to HTML: ${result.filePath}`);
            } else if (!result.canceled) {
                this.showError('Failed to export CV: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    }

    /**
     * Export CV as PDF
     */
    async exportCVPDF() {
        if (!this.cvManager) {
            this.cvManager = new CVManager();
        }
        
        try {
            const markdown = this.editor.getContent();
            if (!markdown.includes('cv: true')) {
                this.showError('This document is not configured as a CV. Add "cv: true" to front-matter.');
                return;
            }
            
            const result = await this.cvManager.exportPDF(markdown, this.editor.currentFile);
            if (result.success) {
                this.showMessage(`CV exported to PDF: ${result.filePath}`);
            } else if (!result.canceled) {
                this.showError('Failed to export PDF: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('PDF export failed: ' + error.message);
        }
    }

    /**
     * Set CV theme and update front-matter
     */
    setCVTheme(theme) {
        if (this.closeAllMenus) this.closeAllMenus();
        if (!this.cvManager) {
            this.cvManager = new CVManager();
        }
        
        const success = this.cvManager.availableThemes.includes(theme);
        if (success) {
            const themeName = this.cvManager.themeDisplayNames[theme];
            this.showMessage(`CV theme set to: ${themeName}`);
            
            const content = this.editor.getContent();
            const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(frontMatterRegex);
            
            if (match) {
                const frontMatter = match[1];
                let updatedFrontMatter = frontMatter;
                
                // If colors block exists, ask user if they want to reset to theme default
                if (/colors:\s*\n(\s{2,}.*\n?)+/m.test(frontMatter)) {
                    const resetColors = confirm(`Do you want to reset the CV colors to the default style of the new theme: "${themeName}"?\n\nClick OK to reset to defaults, or Cancel to keep your current custom color overrides.`);
                    if (resetColors) {
                        updatedFrontMatter = updatedFrontMatter.replace(/colors:\s*\n(\s{2,}.*\n?)+/m, '');
                    }
                }
                
                if (/^theme:/m.test(frontMatter)) {
                    updatedFrontMatter = updatedFrontMatter.replace(/^theme:.*$/m, `theme: ${theme}`);
                } else {
                    updatedFrontMatter = `theme: ${theme}\n${frontMatter}`;
                }
                
                const updatedContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter.trim()}\n---`);
                this.editor.setContent(updatedContent);
                this.editor.setModified(true);
                this.editor.updateStatus();
                this.refreshCVPreview(false);
            }
        } else {
            this.showError(`Invalid theme: ${theme}`);
        }
    }

    /**
     * Set CV paper size
     */
    setCVPageSize(size) {
        if (this.closeAllMenus) this.closeAllMenus();
        this.showMessage(`CV paper size set to: ${size.toUpperCase()}`);
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        if (match) {
            const frontMatter = match[1];
            let updatedFrontMatter = frontMatter;
            
            if (/^paperSize:/m.test(frontMatter)) {
                updatedFrontMatter = frontMatter.replace(/^paperSize:.*$/m, `paperSize: ${size}`);
            } else {
                updatedFrontMatter = `paperSize: ${size}\n${frontMatter}`;
            }
            
            const updatedContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---`);
            this.editor.setContent(updatedContent);
            this.editor.setModified(true);
            this.editor.updateStatus();
            this.refreshCVPreview(false);
        }
    }

    /**
     * Open CV Mode Help dialog
     */
    openHelpCV() {
        const helpContent = `
        <div style="text-align: left; max-height: 500px; overflow-y: auto; padding: 10px;">
            <h3>MarkDD CV Mode Guide</h3>
            <p>Write professional resumes using simple Markdown. The app structures dates, organization lists, page-breaks, and tag badges automatically using standard web technologies.</p>
            
            <h4>1. Front-matter settings</h4>
            <p>Ensure your document starts with the YAML front-matter block:</p>
            <pre><code class="language-yaml">---
cv: true
theme: classic-latex
name: Your Name
subtitle: Professional Title
# photo: "profile.jpg" # Optional: path to your profile photo (local file or URL)
email: name@email.com
phone: +1...
location: City, Country
website: https://...
github: username
linkedin: profile
colors:
  primary: "#1b365d"
---</code></pre>
            
            <h4>2. Profile Photo (Optional)</h4>
            <p>Add a <code>photo</code> property in the front-matter with a relative file path, absolute path, web URL, or base64 data URI. The photo will be rendered beautifully in templates designed for it (like <code>modern-sidebar</code>, <code>moderncv-classic</code>, <code>moderncv-casual</code>, <code>awesome-cv</code>, and <code>academic</code>).</p>

            <h4>3. Alignment helper (Pipes '|')</h4>
            <p>Use the pipe character in level-3 headings to auto-align details:</p>
            <pre><code>### Title | Organization | Location | Date</code></pre>
            <p>This renders the title on the left and the date on the right, with subtitles for company and location in standard academic/LaTeX formats.</p>
            
            <h4>4. Custom Spacing & Page breaks</h4>
            <p>Control print margins and page splits precisely in exports:</p>
            <ul>
                <li><code>\\newpage</code> or <code>&lt;!-- newpage --&gt;</code> - forces a page break.</li>
                <li><code>\\vspace{15px}</code> or <code>&lt;!-- vspace: 15px --&gt;</code> - inserts a custom vertical space.</li>
            </ul>

            <h4>5. Skills Badges</h4>
            <p>Any bullet list under a heading containing "Skills" automatically renders as modern rounded tag badges.</p>
        </div>`;
        
        const modal = document.createElement('div');
        modal.className = 'about-modal';
        modal.innerHTML = `<div class="about-modal-content" style="max-width: 600px; text-align: left;">
            ${helpContent}
            <br>
            <button id="about-close-btn" style="float: right; margin-top: 10px;">Close</button>
            <div style="clear: both;"></div>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('about-close-btn').onclick = () => modal.remove();
    }

    showCVExample(type) {
        let showcaseContent = '';
        let fileName = 'CV Example';

        if (type === 'classic') {
            fileName = 'Classic Resume';
            showcaseContent = `---
cv: true
theme: classic-latex
paperSize: a4
name: Jane Doe
subtitle: Senior Software Architect
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#000000"
  secondary: "#555555"
  text: "#111111"
  background: "#ffffff"
---

## Professional Summary

A highly skilled software architect with over 10 years of experience designing and implementing distributed systems, cloud infrastructure, and modern web applications. Passionate about clean code, performance optimization, and developer productivity.

## Work Experience

### Senior Software Architect | Acme Corporation | Boston, MA | 2021 – Present
- Led the design and migration of legacy monolith applications to high-performance microservices, improving scalability by 300%.
- Designed containerized deployments using Kubernetes and Docker on AWS Cloud.
- Mentored a team of 12 engineers in best practices, design patterns, and test-driven development.

### Technical Lead | Tech Solutions Inc. | Cambridge, MA | 2017 – 2021
- Spearheaded development of a real-time analytics dashboard used by over 50 enterprise clients.
- Optimized query performance of PostgreSQL databases, reducing latency by 45%.
- Implemented continuous integration and continuous delivery (CI/CD) pipelines.

<!-- newpage -->

## Education

### Master of Science in Computer Science | Massachusetts Institute of Technology | Cambridge, MA | 2015 – 2017
- Specialization in Distributed Systems and Software Engineering.
- GPA: 4.0/4.0. Thesis on high-throughput microservices.

### Bachelor of Science in Computer Engineering | Boston University | Boston, MA | 2011 – 2015
- Graduated with Honors (Magna Cum Laude).

## Technical Skills

- **Programming Languages**: JavaScript, TypeScript, Python, Go, Java, Rust
- **Frameworks & Libraries**: Node.js, React, Next.js, Express, Fastify, Django
- **DevOps & Cloud**: Docker, Kubernetes, AWS, Terraform, GitHub Actions, CI/CD
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch
`;
        } else if (type === 'forty' || type === 'forty-seconds') {
            fileName = 'Forty Seconds Resume';
            showcaseContent = `---
cv: true
theme: forty-seconds
paperSize: a4
name: Jane Doe
subtitle: Senior Software Architect
photo: "https://picsum.photos/200"
photoShape: round
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#2b3e50"
  secondary: "#7f8c8d"
  text: "#2c3e50"
  background: "#ffffff"
  sidebarBg: "#f0f2f5"
  sidebarText: "#2c3e50"
---

## Professional Summary

A highly skilled software architect with over 10 years of experience designing and implementing distributed systems, cloud infrastructure, and modern web applications. Passionate about clean code, performance optimization, and developer productivity.

## Work Experience

### Senior Software Architect | Acme Corporation | Boston, MA | 2021 – Present
- Led the design and migration of legacy monolith applications to microservices.
- Designed containerized deployments using Kubernetes and Docker on AWS.
- Mentored a team of 12 engineers in best practices and TDD.

### Technical Lead | Tech Solutions Inc. | Cambridge, MA | 2017 – 2021
- Spearheaded development of a real-time analytics dashboard used by 50+ clients.
- Optimized query performance of PostgreSQL databases, reducing latency by 45%.
- Implemented CI/CD pipelines.

## Education

### Master of Science in Computer Science | MIT | Cambridge, MA | 2015 – 2017
- Specialization in Distributed Systems and Software Engineering.

### Bachelor of Science in Computer Engineering | BU | Boston, MA | 2011 – 2015

## Technical Skills

- JavaScript | 90%
- TypeScript | 85%
- Python | 80%
- Go | 75%
- Docker | 80%
- Kubernetes | 70%
- AWS | 75%
- PostgreSQL | 80%
`;
        } else if (type === 'twenty' || type === 'twenty-seconds') {
            fileName = 'Twenty Seconds Resume';
            showcaseContent = `---
cv: true
theme: twenty-seconds
paperSize: a4
name: Jane Doe
subtitle: Senior Software Architect
photo: "https://picsum.photos/200"
photoShape: round
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#24c0d8"
  secondary: "#95a5a6"
  text: "#3d3d3d"
  background: "#ffffff"
  sidebarBg: "#3d3d3d"
  sidebarText: "#ffffff"
---

## Professional Summary

A highly skilled software architect with over 10 years of experience designing and implementing distributed systems, cloud infrastructure, and modern web applications.

## Work Experience

### Senior Software Architect | Acme Corporation | Boston, MA | 2021 – Present
- Led the design and migration of legacy monolith applications to microservices.
- Designed containerized deployments using Kubernetes and Docker on AWS.
- Mentored a team of 12 engineers in best practices and TDD.

### Technical Lead | Tech Solutions Inc. | Cambridge, MA | 2017 – 2021
- Spearheaded development of a real-time analytics dashboard used by 50+ clients.
- Optimized query performance of PostgreSQL databases, reducing latency by 45%.
- Implemented CI/CD pipelines.

## Education

### Master of Science in Computer Science | MIT | Cambridge, MA | 2015 – 2017
- Specialization in Distributed Systems and Software Engineering.

### Bachelor of Science in Computer Engineering | BU | Boston, MA | 2011 – 2015

## Technical Skills

- JavaScript | 90%
- TypeScript | 85%
- Python | 80%
- Go | 75%
- Docker | 80%
- Kubernetes | 70%
- AWS | 75%
- PostgreSQL | 80%
`;
        } else if (type === 'hipster') {
            fileName = 'Simple Hipster Resume';
            showcaseContent = `---
cv: true
theme: hipster
paperSize: a4
name: Jane Doe
subtitle: Senior Software Architect
photo: "https://picsum.photos/200"
photoShape: round
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#e05a47"
  secondary: "#7f8c8d"
  text: "#333333"
  background: "#ffffff"
  sidebarBg: "#f9f9f9"
  sidebarText: "#333333"
---

## Professional Summary

A highly skilled software architect with over 10 years of experience designing and implementing distributed systems, cloud infrastructure, and modern web applications.

## Work Experience

### Senior Software Architect | Acme Corporation | Boston, MA | 2021 – Present
- Led migration of legacy monolith applications to high-performance microservices.
- Designed containerized deployments using Kubernetes and Docker on AWS.
- Mentored a team of 12 engineers in best practices and test-driven development.

### Technical Lead | Tech Solutions Inc. | Cambridge, MA | 2017 – 2021
- Spearheaded development of a real-time analytics dashboard.
- Optimized query performance of PostgreSQL databases.

## Education

### Master of Science in Computer Science | MIT | Cambridge, MA | 2015 – 2017

### Bachelor of Science in Computer Engineering | BU | Boston, MA | 2011 – 2015

## Technical Skills

- JavaScript | 5/5
- TypeScript | 4/5
- Python | 4/5
- Go | 3.5/5
- Docker | 4/5
- Kubernetes | 3.5/5
- AWS | 4/5
- PostgreSQL | 4/5
`;
        } else if (type === 'entry') {
            fileName = 'Entry Level Resume';
            showcaseContent = `---
cv: true
theme: entry-level
paperSize: a4
name: Jane Doe
subtitle: Junior Software Engineer
email: jane.doe@email.com
phone: +1 (555) 019-2834
location: Boston, MA
website: https://janedoe.dev
github: janedoe
linkedin: janedoe-profile
colors:
  primary: "#0f172a"
  secondary: "#475569"
  text: "#334155"
  background: "#ffffff"
---

## Professional Summary

A passionate junior software engineer with solid foundations in computer science, full-stack web development, and database systems. Highly motivated to learn new technologies and contribute to high-impact development projects.

## Education

### Bachelor of Science in Computer Science | Boston University | Boston, MA | 2022 – 2026
- Graduated with Honors (Magna Cum Laude). GPA: 3.8/4.0.
- Relevant Coursework: Data Structures, Algorithms, Software Engineering, Database Systems.

## Projects

### Real-Time Chat Application | Personal Project | GitHub | 2025
- Built a secure real-time messaging platform using Node.js, Socket.io, and React.
- Integrated MongoDB for persistent message archiving and user authentication with JWT.

### Task Management Dashboard | Academic Project | GitHub | 2024
- Co-developed a team collaboration app utilizing TypeScript, Express, and PostgreSQL.
- Implemented Kanban boards and real-time email notifications for project milestones.

## Technical Skills

- **Programming Languages**: JavaScript, TypeScript, Python, Java, SQL, HTML/CSS
- **Frameworks & Libraries**: Node.js, React, Express, PostgreSQL, MongoDB
- **Tools & Platforms**: Git, GitHub, Docker, VS Code, Linux
`;
        }

        if (showcaseContent) {
            this.openHelpDocument(fileName, showcaseContent);
        }
    }

    /**
     * Customize CV theme colors using input forms
     */
    async customizeCVColors() {
        if (this.closeAllMenus) this.closeAllMenus();
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        let theme = 'classic-latex';
        let primary = '#1b365d';
        let secondary = '#475569';
        let text = '#1f2937';
        let background = '#ffffff';
        let sidebarBg = '#f3f4f6';
        let sidebarText = '#1f2937';
        let headerBg = '#f8fafc';
        let headerText = '#27272a';
        
        if (match) {
            const fm = match[1];
            const themeMatch = fm.match(/^\s*theme:\s*["']?([-\w]+)["']?$/m);
            if (themeMatch) {
                theme = themeMatch[1];
            }
            
            const colorBlockMatch = fm.match(/colors:\s*\n(\s{2,}.*\n?)+/);
            if (colorBlockMatch) {
                const cb = colorBlockMatch[0];
                const cbP = cb.match(/^\s{2,}primary:\s*["']?([#\w]+)["']?$/m);
                const cbS = cb.match(/^\s{2,}secondary:\s*["']?([#\w]+)["']?$/m);
                const cbT = cb.match(/^\s{2,}text:\s*["']?([#\w]+)["']?$/m);
                const cbB = cb.match(/^\s{2,}background:\s*["']?([#\w]+)["']?$/m);
                const cbSb = cb.match(/^\s{2,}sidebarBg:\s*["']?([#\w]+)["']?$/m);
                const cbSt = cb.match(/^\s{2,}sidebarText:\s*["']?([#\w]+)["']?$/m);
                const cbHb = cb.match(/^\s{2,}headerBg:\s*["']?([#\w]+)["']?$/m);
                const cbHt = cb.match(/^\s{2,}headerText:\s*["']?([#\w]+)["']?$/m);
                
                if (cbP) primary = cbP[1];
                if (cbS) secondary = cbS[1];
                if (cbT) text = cbT[1];
                if (cbB) background = cbB[1];
                if (cbSb) sidebarBg = cbSb[1];
                if (cbSt) sidebarText = cbSt[1];
                if (cbHb) headerBg = cbHb[1];
                if (cbHt) headerText = cbHt[1];
            } else {
                const pMatch = fm.match(/^\s*primary:\s*["']?([#\w]+)["']?$/m);
                const sMatch = fm.match(/^\s*secondary:\s*["']?([#\w]+)["']?$/m);
                const tMatch = fm.match(/^\s*text:\s*["']?([#\w]+)["']?$/m);
                if (pMatch) primary = pMatch[1];
                if (sMatch) secondary = sMatch[1];
                if (tMatch) text = tMatch[1];
            }
        }

        const fields = [
            { id: 'primaryColor', label: 'Primary Accent (headings, links)', type: 'color', value: primary },
            { id: 'secondaryColor', label: 'Secondary Accent (subtitles, dates)', type: 'color', value: secondary },
            { id: 'textColor', label: 'Body Text Color', type: 'color', value: text },
            { id: 'bgColor', label: 'Page Background Color', type: 'color', value: background }
        ];
        
        const isSidebarTheme = ['modern-sidebar', 'forty-seconds', 'twenty-seconds', 'hipster', 'sixty-seconds'].includes(theme);
        const isCasualTheme = theme === 'moderncv-casual';
        
        if (isSidebarTheme) {
            fields.push(
                { id: 'sidebarBgColor', label: 'Sidebar Background Color', type: 'color', value: sidebarBg },
                { id: 'sidebarTextColor', label: 'Sidebar Text Color', type: 'color', value: sidebarText }
            );
        } else if (isCasualTheme) {
            fields.push(
                { id: 'headerBgColor', label: 'Header Background Color', type: 'color', value: headerBg },
                { id: 'headerTextColor', label: 'Header Text Color', type: 'color', value: headerText }
            );
        }

        const dialogResult = await this.showFormDialog({
            title: 'Customize CV Colors',
            message: `Set custom color accents for your active CV theme: "${theme}".`,
            fields: fields,
            extraLabel: 'Reset to Defaults'
        });

        if (dialogResult && dialogResult.isReset) {
            const content = this.editor.getContent();
            const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(frontMatterRegex);
            if (match) {
                const fm = match[1];
                let updatedFm = fm;
                if (/colors:\s*\n(\s{2,}.*\n?)+/m.test(fm)) {
                    updatedFm = fm.replace(/colors:\s*\n(\s{2,}.*\n?)+/m, '');
                }
                const updatedContent = content.replace(frontMatterRegex, `---\n${updatedFm.trim()}\n---`);
                this.editor.setContent(updatedContent);
                this.editor.setModified(true);
                this.editor.updateStatus();
                this.showMessage('CV Colors reset to theme defaults.');
                this.refreshCVPreview(false);
            }
            return;
        }

        if (dialogResult) {
            const vals = dialogResult;
            const newColors = {
                primary: vals.primaryColor,
                secondary: vals.secondaryColor,
                text: vals.textColor,
                background: vals.bgColor
            };
            
            if (isSidebarTheme) {
                newColors.sidebarBg = vals.sidebarBgColor;
                newColors.sidebarText = vals.sidebarTextColor;
            } else if (isCasualTheme) {
                newColors.headerBg = vals.headerBgColor;
                newColors.headerText = vals.headerTextColor;
            }
            
            const updatedContent = this.updateFrontMatterColorsInEditor(
                this.editor.getContent(),
                newColors
            );
            this.editor.setContent(updatedContent);
            if (this.preview) {
                this.preview.updatePreview(updatedContent);
            }
            this.showMessage('CV Colors updated in front-matter.');
            this.refreshCVPreview(false);
        }
    }

    /**
     * Helper to write colors block in editor front-matter
     */
    updateFrontMatterColorsInEditor(content, colors) {
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        if (!match) return content;

        const fm = match[1];
        let updatedFm = fm;
        
        let colorsBlock = 'colors:\n';
        for (const [key, val] of Object.entries(colors)) {
            if (val !== undefined && val !== null) {
                colorsBlock += `  ${key}: "${val}"\n`;
            }
        }
        colorsBlock = colorsBlock.trim();
        
        // Replace existing colors block or add a new one
        if (/colors:\s*\n(\s{2,}.*\n?)+/m.test(fm)) {
            updatedFm = fm.replace(/colors:\s*\n(\s{2,}.*\n?)+/m, colorsBlock + '\n');
        } else {
            updatedFm = `${fm.trim()}\n${colorsBlock}`;
        }

        return content.replace(frontMatterRegex, `---\n${updatedFm}\n---`);
    }

    /**
     * Apply a predefined color preset to the CV front-matter
     */
    applyCVColorPreset(preset) {
        if (this.closeAllMenus) this.closeAllMenus();
        const presets = {
            navy: { primary: '#1b365d', secondary: '#5c768d', text: '#222222', background: '#ffffff', sidebarBg: '#e6f0fa', sidebarText: '#1b365d', headerBg: '#e6f0fa', headerText: '#1b365d' },
            slate: { primary: '#334155', secondary: '#64748b', text: '#1e293b', background: '#ffffff', sidebarBg: '#f1f5f9', sidebarText: '#334155', headerBg: '#f1f5f9', headerText: '#334155' },
            green: { primary: '#166534', secondary: '#15803d', text: '#111827', background: '#ffffff', sidebarBg: '#f0fdf4', sidebarText: '#166534', headerBg: '#f0fdf4', headerText: '#166534' },
            burgundy: { primary: '#800020', secondary: '#6b7280', text: '#111827', background: '#ffffff', sidebarBg: '#fdf2f8', sidebarText: '#800020', headerBg: '#fdf2f8', headerText: '#800020' },
            charcoal: { primary: '#27272a', secondary: '#71717a', text: '#09090b', background: '#ffffff', sidebarBg: '#fafafa', sidebarText: '#27272a', headerBg: '#fafafa', headerText: '#27272a' },
            teal: { primary: '#0f766e', secondary: '#565f69', text: '#111827', background: '#ffffff', sidebarBg: '#f0fdfa', sidebarText: '#0f766e', headerBg: '#f0fdfa', headerText: '#0f766e' },
            dark: { primary: '#60a5fa', secondary: '#94a3b8', text: '#f1f5f9', background: '#0f172a', sidebarBg: '#1e293b', sidebarText: '#f1f5f9', headerBg: '#1e293b', headerText: '#60a5fa' },
            coffee: { primary: '#8c6239', secondary: '#a67c52', text: '#2d241e', background: '#ffffff', sidebarBg: '#f5ebe6', sidebarText: '#5c3a21', headerBg: '#f5ebe6', headerText: '#5c3a21' },
            sunset: { primary: '#f97316', secondary: '#f43f5e', text: '#1e293b', background: '#ffffff', sidebarBg: '#fff7ed', sidebarText: '#c2410c', headerBg: '#fff7ed', headerText: '#c2410c' },
            lavender: { primary: '#7c3aed', secondary: '#a78bfa', text: '#1f2937', background: '#ffffff', sidebarBg: '#faf5ff', sidebarText: '#5b21b6', headerBg: '#faf5ff', headerText: '#5b21b6' }
        };
        
        const colors = presets[preset];
        if (!colors) {
            this.showError(`Unknown color preset: ${preset}`);
            return;
        }

        const updatedContent = this.updateFrontMatterColorsInEditor(
            this.editor.getContent(),
            colors
        );

        this.editor.setContent(updatedContent);
        this.editor.setModified(true);
        this.editor.updateStatus();
        this.showMessage(`CV color preset "${preset}" applied.`);
        this.refreshCVPreview(false);
    }

    /**
     * Open Electron open dialog to choose profile photo, resolve path relative to current CV file, and insert into front-matter
     */
    async selectCVPhoto() {
        if (this.closeAllMenus) this.closeAllMenus();
        const markdown = this.editor.getContent();
        if (!/cv:\s*true/i.test(markdown)) {
            this.showError('This document is not configured as a CV. Add "cv: true" to front-matter first.');
            return;
        }

        if (typeof require === 'undefined') {
            this.showError('Electron context required to select a file.');
            return;
        }

        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('select-cv-photo-dialog');
        
        if (result.error) {
            this.showError(`Failed to select photo: ${result.error}`);
            return;
        }
        if (result.canceled || !result.filePath) {
            return;
        }

        let photoPath = result.filePath;
        const currentFile = this.editor.currentFile;
        
        if (currentFile) {
            try {
                const path = require('path');
                const baseDir = path.dirname(currentFile);
                let relativePath = path.relative(baseDir, photoPath);
                
                // If relative path is not excessively deep (upward), use it
                if (!relativePath.startsWith('..\\..') && !relativePath.startsWith('../..') && !path.isAbsolute(relativePath)) {
                    photoPath = relativePath.replace(/\\/g, '/'); // Use forward slashes
                } else {
                    photoPath = photoPath.replace(/\\/g, '/');
                }
            } catch (e) {
                console.error('[App] Failed to calculate relative photo path:', e);
                photoPath = photoPath.replace(/\\/g, '/');
            }
        } else {
            photoPath = photoPath.replace(/\\/g, '/');
        }

        // Update front-matter with the photo path
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = markdown.match(frontMatterRegex);
        
        if (match) {
            const frontMatter = match[1];
            let updatedFrontMatter = frontMatter;
            
            if (/^\s*photo:/m.test(frontMatter)) {
                updatedFrontMatter = frontMatter.replace(/^\s*photo:.*$/m, `photo: "${photoPath}"`);
            } else {
                // Insert photo: "..." before the closing ---
                updatedFrontMatter = `${frontMatter.trim()}\nphoto: "${photoPath}"`;
            }
            
            const updatedContent = markdown.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---`);
            this.editor.setContent(updatedContent);
            this.editor.setModified(true);
            this.editor.updateStatus();
            this.showMessage('Profile photo updated in front-matter.');
            this.refreshCVPreview(false);
        } else {
            this.showError('Could not find front-matter block to insert the photo property.');
        }
    }

    /**
     * Remove the photo property from the CV front-matter
     */
    removeCVPhoto() {
        if (this.closeAllMenus) this.closeAllMenus();
        const markdown = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = markdown.match(frontMatterRegex);
        
        if (match) {
            const frontMatter = match[1];
            if (/^\s*photo:/m.test(frontMatter)) {
                const updatedFrontMatter = frontMatter.replace(/^\s*photo:\s*.*$\n?/m, '');
                const updatedContent = markdown.replace(frontMatterRegex, `---\n${updatedFrontMatter.trim()}\n---`);
                this.editor.setContent(updatedContent);
                this.editor.setModified(true);
                this.editor.updateStatus();
                this.showMessage('Profile photo removed.');
                this.refreshCVPreview(false);
            } else {
                this.showMessage('No profile photo property found in front-matter.');
            }
        } else {
            this.showError('Could not find front-matter block.');
        }
    }

    /**
     * Set CV photo shape and update front-matter
     */
    setCVPhotoShape(shape) {
        this.showMessage(`CV photo shape set to: ${shape.toUpperCase()}`);
        const content = this.editor.getContent();
        const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        if (match) {
            const frontMatter = match[1];
            let updatedFrontMatter = frontMatter;
            
            if (/^\s*photoShape:/m.test(frontMatter)) {
                updatedFrontMatter = frontMatter.replace(/^\s*photoShape:.*$/m, `photoShape: ${shape}`);
            } else {
                updatedFrontMatter = `photoShape: ${shape}\n${frontMatter}`;
            }
            
            const updatedContent = content.replace(frontMatterRegex, `---\n${updatedFrontMatter}\n---`);
            this.editor.setContent(updatedContent);
            this.editor.setModified(true);
            this.editor.updateStatus();
            this.refreshCVPreview(false);
        }
    }

    /**
     * Refresh CV preview window in the background if it is open
     */
    async refreshCVPreview(focus = false) {
        if (typeof require === 'undefined') return;
        try {
            const { ipcRenderer } = require('electron');
            const isOpen = await ipcRenderer.invoke('is-cv-preview-open');
            if (isOpen) {
                const markdown = this.editor.getContent();
                if (/cv:\s*true/i.test(markdown)) {
                    if (!this.cvManager) {
                        this.cvManager = new CVManager();
                    }
                    const html = await this.cvManager.generateHTML({
                        theme: this.cvManager.parseMarkdown(markdown).theme,
                        paperSize: this.cvManager.parseMarkdown(markdown).paperSize,
                        markdown: markdown,
                        currentFilePath: this.editor.currentFile
                    });
                    await ipcRenderer.invoke('preview-cv', { html: html, focus: focus });
                }
            }
        } catch (e) {
            console.error('[App] Failed to background refresh CV preview:', e);
        }
    }

    /**
     * Refresh Presentation preview window in the background if it is open
     */
    async refreshPresentationPreview(focus = false) {
        if (typeof require === 'undefined') return;
        try {
            const { ipcRenderer } = require('electron');
            const isOpen = await ipcRenderer.invoke('is-presentation-preview-open');
            if (isOpen) {
                const markdown = this.editor.getContent();
                if (this.presentationManager) {
                    this.presentationManager.parseMarkdown(markdown);
                    const html = await this.presentationManager.generateHTML({ theme: this.presentationManager.currentTheme });
                    await ipcRenderer.invoke('preview-presentation', { html: html, focus: focus });
                }
            }
        } catch (e) {
            console.error('[App] Failed to background refresh presentation preview:', e);
        }
    }

    // ========== END CV ADDON METHODS ==========

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
            const tab = document.getElementById('enabled-plugins-tab');
            const list = document.getElementById('plugins-list');
            if (tab) tab.classList.add('active');
            if (list) list.classList.add('active');
        }
    }

    populatePluginsModal() {
        // Features modal now shows static built-in features list (defined in HTML)
        // Just update the scroll sync status
        const scrollSyncStatus = document.getElementById('scroll-sync-status');
        if (scrollSyncStatus && typeof this.isSyncScrollEnabled === 'function') {
            scrollSyncStatus.textContent = 'Scroll Sync: ' + (this.isSyncScrollEnabled() ? 'Enabled' : 'Disabled');
            scrollSyncStatus.style.color = this.isSyncScrollEnabled() ? '#007acc' : '#d32f2f';
        }

        // Bibliography collection toggle
        const bibliographyToggle = document.getElementById('collect-bibliography-refs');
        if (bibliographyToggle) {
            // Load saved setting (default true)
            bibliographyToggle.checked = localStorage.getItem('collect-bibliography-refs') !== 'false';
            bibliographyToggle.addEventListener('change', (e) => {
                localStorage.setItem('collect-bibliography-refs', e.target.checked ? 'true' : 'false');
                // Trigger preview update
                if (this.preview && this.editor) {
                    this.updatePreview();
                }
            });
        }

        // Export with all features toggle
        const exportToggle = document.getElementById('export-enabled-plugins-only');
        if (exportToggle) {
            exportToggle.checked = window.markddExportEnabledPluginsOnly !== false;
            exportToggle.addEventListener('change', (e) => {
                window.markddExportEnabledPluginsOnly = !!e.target.checked;
            });
        }
    }

    async loadAvailablePlugins() {
        // Plugin installation disabled
    }

    async installPlugin(pluginName, buttonEl) {
        // Plugin installation disabled
    }

    async uninstallPlugin(pluginName, buttonEl) {
        // Plugin installation disabled
    }

    // Event handlers
    handleGlobalShortcuts(e) {
        if (this.isPromptOverlayActive()) {
            return;
        }
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.saveAsFile();
                    } else {
                        this.saveFile();
                    }
                    break;
                case 'o':
                    e.preventDefault();
                    this.openFileDialog();
                    break;
                case 'n':
                    e.preventDefault();
                    this.newFile();
                    break;
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

    updatePreview() {
        if (this.preview && this.editor) {
            this.preview.updatePreview(this.editor.getContent());
        }
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

    updateStatusBarFilename(filepath, title) {
        const filePathDisplay = document.getElementById('file-path-display');
        if (!filePathDisplay) return;
        
        if (filepath) {
            // Extract just the filename from the full path
            const filename = filepath.split(/[\\/]/).pop();
            filePathDisplay.textContent = filename;
            filePathDisplay.title = filepath; // Show full path on hover
        } else {
            // Untitled tab - show the tab title
            filePathDisplay.textContent = title || 'No file opened';
            filePathDisplay.title = '';
        }
    }

    handleTabSwitch(event) {
        if (!event || !event.tabData) {
            this.logError('App', 'Invalid tab switch event');
            return;
        }
        
        const tabData = event.tabData;
        const previousTabId = event.previousTabId;
        const isRestored = event.restored || false;  // Check if this is from session restoration
        this.logInfo('App', 'Switching to tab: ' + tabData.id + ' - ' + tabData.title);
        
        // Update status bar filename display
        this.updateStatusBarFilename(tabData.filepath, tabData.title);
        
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

            this.refreshMarkdownMenuStates();
        }
        
        // Force preview update after tab switch
        // For restored tabs or initial app loading, update immediately without delay to prevent visible lag
        // For normal tab switches, use requestAnimationFrame to ensure editor content is set
        if (this.preview && this.editor) {
            const self = this;
            if (isRestored || this._appInitializing) {
                // Restored tab or initial tab during app startup: update preview immediately, no animation frame delay
                self.editor.triggerContentChange();
                self.logInfo('App', 'Preview updated immediately (restored or initializing)');
            } else {
                // Normal tab switch: use requestAnimationFrame for smooth transition
                requestAnimationFrame(() => {
                    self.editor.triggerContentChange();
                    self.logInfo('App', 'Preview updated after tab switch');
                });
            }
        }
        
        this.logInfo('App', 'Tab switch completed');
    }
    
    confirmUnsavedChanges() {
        return confirm('You have unsaved changes. Do you want to continue without saving?');
    }

    showFormDialog({
        title = 'Input Required',
        message = '',
        fields = [],
        confirmLabel = 'OK',
        cancelLabel = 'Cancel',
        extraLabel = ''
    } = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'position: fixed',
                'inset: 0',
                'background: rgba(0, 0, 0, 0.45)',
                'display: flex',
                'align-items: center',
                'justify-content: center',
                'z-index: 10000'
            ].join(';');

            const dialog = document.createElement('div');
            dialog.style.cssText = [
                'background: #ffffff',
                'color: #1a1a1a',
                'min-width: 320px',
                'max-width: 480px',
                'width: 90%',
                'border-radius: 8px',
                'padding: 24px',
                'box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25)',
                'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
            ].join(';');

            const heading = document.createElement('h3');
            heading.textContent = title;
            heading.style.margin = '0 0 12px 0';
            heading.style.fontSize = '18px';

            const messageEl = document.createElement('p');
            messageEl.textContent = message;
            messageEl.style.margin = message ? '0 0 16px 0' : '0';
            messageEl.style.fontSize = '13px';
            messageEl.style.color = '#555555';

            const form = document.createElement('form');
            form.style.display = 'flex';
            form.style.flexDirection = 'column';
            form.style.gap = '12px';

            const inputs = {};

            fields.forEach((field) => {
                const wrapper = document.createElement('label');
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                wrapper.style.gap = '6px';
                wrapper.style.fontSize = '13px';
                wrapper.style.color = '#333333';

                wrapper.textContent = field.label || '';

                let input;
                if (field.type === 'textarea') {
                    input = document.createElement('textarea');
                } else if (field.type === 'select') {
                    input = document.createElement('select');
                    const options = Array.isArray(field.options) ? field.options : [];
                    options.forEach((option) => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option.value;
                        optionEl.textContent = option.label ?? option.value;
                        input.appendChild(optionEl);
                    });
                } else {
                    input = document.createElement('input');
                    if (field.type) {
                        input.type = field.type;
                    }
                }

                input.name = field.id;
                if (field.placeholder && field.type !== 'select') {
                    input.placeholder = field.placeholder;
                }
                const valToSet = field.value !== undefined ? field.value : field.defaultValue;
                if (valToSet !== undefined) {
                    input.value = valToSet;
                }
                if (field.required) {
                    input.required = true;
                }

                if (field.type === 'color') {
                    input.style.padding = '2px';
                    input.style.height = '36px';
                    input.style.cursor = 'pointer';
                } else {
                    input.style.padding = '10px';
                }
                input.style.border = '1px solid #d0d0d0';
                input.style.borderRadius = '4px';
                input.style.fontSize = '13px';
                if (field.type === 'textarea') {
                    input.style.resize = 'vertical';
                    input.style.minHeight = '120px';
                } else {
                    input.style.resize = 'none';
                }

                wrapper.appendChild(input);
                form.appendChild(wrapper);
                inputs[field.id] = input;
            });

            const buttonRow = document.createElement('div');
            buttonRow.style.display = 'flex';
            buttonRow.style.justifyContent = 'flex-end';
            buttonRow.style.gap = '10px';
            buttonRow.style.marginTop = '20px';

            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = cancelLabel;
            cancelButton.style.cssText = [
                'padding: 8px 18px',
                'border-radius: 4px',
                'border: 1px solid #c7c7c7',
                'background: #ffffff',
                'cursor: pointer'
            ].join(';');

            const submitButton = document.createElement('button');
            submitButton.type = 'submit';
            submitButton.textContent = confirmLabel;
            submitButton.style.cssText = [
                'padding: 8px 20px',
                'border-radius: 4px',
                'border: none',
                'background: #0078d4',
                'color: #ffffff',
                'cursor: pointer'
            ].join(';');

            if (extraLabel) {
                const extraButton = document.createElement('button');
                extraButton.type = 'button';
                extraButton.textContent = extraLabel;
                extraButton.style.cssText = [
                    'padding: 8px 18px',
                    'border-radius: 4px',
                    'border: 1px solid #d0d0d0',
                    'background: #f3f4f6',
                    'color: #374151',
                    'cursor: pointer',
                    'margin-right: auto'
                ].join(';');
                buttonRow.appendChild(extraButton);
                extraButton.addEventListener('click', () => cleanup({ isReset: true }));
            }

            buttonRow.appendChild(cancelButton);
            buttonRow.appendChild(submitButton);
            form.appendChild(buttonRow);

            dialog.appendChild(heading);
            if (message) {
                dialog.appendChild(messageEl);
            }
            dialog.appendChild(form);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const cleanup = (result) => {
                document.removeEventListener('keydown', keyHandler);
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                resolve(result);
            };

            const keyHandler = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };

            document.addEventListener('keydown', keyHandler);

            cancelButton.addEventListener('click', () => cleanup(null));
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    cleanup(null);
                }
            });

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const values = {};
                let invalidField = null;

                fields.forEach((field) => {
                    const input = inputs[field.id];
                    if (!input || invalidField) {
                        return;
                    }
                    const rawValue = input.value.trim();
                    if (field.required && !rawValue) {
                        invalidField = input;
                        return;
                    }
                    values[field.id] = rawValue;
                });

                if (invalidField) {
                    invalidField.focus();
                    return;
                }

                cleanup(values);
            });

            // Focus first field
            const firstField = fields.length > 0 ? inputs[fields[0].id] : null;
            if (firstField) {
                requestAnimationFrame(() => firstField.focus());
            }
        });
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `markdd-toast toast-${type}`;
        
        const isError = type === 'error';
        const bgColor = isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
        const icon = isError ? '❌ ' : '✅ ';
        
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            padding: 12px 20px;
            background: ${bgColor};
            color: #ffffff;
            border-radius: 6px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 11000;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        
        toast.textContent = icon + message;
        document.body.appendChild(toast);
        
        toast.offsetHeight; // force reflow
        
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
        
        const duration = isError ? 5000 : 3000;
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }

    showMessage(message) {
        console.log(message);
        this.showToast(message, 'success');
    }

    showError(message) {
        console.error(message);
        this.showToast(message, 'error');
    }

    // Custom prompt dialog for Electron (prompt() is not supported)
    async showPrompt(message, defaultValue = '') {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;pointer-events:auto!important;';
            overlay.classList.add('prompt-overlay');
            if (document.body) {
                document.body.classList.add('prompt-active');
            }
            if (typeof window !== 'undefined') {
                window.markddPromptActive = true;
            }
            
            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#2d2d2d;padding:20px;border-radius:8px;min-width:400px;box-shadow:0 4px 20px rgba(0,0,0,0.5);pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important;';
            
            const label = document.createElement('div');
            label.textContent = message;
            label.style.cssText = 'color:#fff;margin-bottom:12px;font-size:14px;';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = defaultValue;
            input.disabled = false;
            input.readOnly = false;
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('tabindex', '0');
            input.style.cssText = 'width:100%;padding:8px;margin-bottom:16px;background:#1e1e1e;color:#fff;border:1px solid #444;border-radius:4px;font-size:14px;box-sizing:border-box;outline:none;user-select:text!important;-webkit-user-select:text!important;pointer-events:auto!important;cursor:text!important;';
            
            // Ensure input is interactive
            input.onclick = (e) => {
                e.stopPropagation();
                input.focus();
            };
            input.onfocus = () => {
                input.style.borderColor = '#007acc';
            };
            input.onblur = () => {
                input.style.borderColor = '#444';
            };
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
            
            const okBtn = document.createElement('button');
            okBtn.textContent = 'OK';
            okBtn.style.cssText = 'padding:8px 16px;background:#007acc;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'padding:8px 16px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;';
            
            const cleanup = (result) => {
                window.removeEventListener('keydown', handleWindowKeydown);
                input.removeEventListener('keydown', handleInputKeydown);
                overlay.remove();
                const stillOpen = document.querySelector('.prompt-overlay');
                if (!stillOpen && document.body) {
                    document.body.classList.remove('prompt-active');
                }
                if (typeof window !== 'undefined') {
                    window.markddPromptActive = !!stillOpen;
                }
                resolve(result);
            };

            const handleWindowKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };

            const handleInputKeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    cleanup(input.value || null);
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };
            
            okBtn.onclick = () => cleanup(input.value || null);
            cancelBtn.onclick = () => cleanup(null);
            
            // Prevent overlay click from interfering
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup(null);
                }
            };
            dialog.onclick = (e) => {
                e.stopPropagation();
            };

            input.addEventListener('keydown', handleInputKeydown);
            window.addEventListener('keydown', handleWindowKeydown);
            
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(okBtn);
            dialog.appendChild(label);
            dialog.appendChild(input);
            dialog.appendChild(buttonContainer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            // Focus with delay to ensure DOM is ready
            setTimeout(() => {
                input.focus();
                input.select();
            }, 50);
        });
    }

    // Book section selection dialog
    getBookSectionDefinitions() {
        return {
            classical: [
                { id: 'title', name: 'Title Page', category: 'front', auto: true, checked: true },
                { id: 'copyright', name: 'Copyright Page', category: 'front', auto: true, checked: true },
                { id: 'dedication', name: 'Dedication', category: 'front', auto: false, checked: false },
                { id: 'toc', name: 'Table of Contents', category: 'front', auto: true, checked: true },
                { id: 'foreword', name: 'Foreword', category: 'front', auto: false, checked: false },
                { id: 'preface', name: 'Preface', category: 'front', auto: false, checked: true },
                { id: 'acknowledgments', name: 'Acknowledgments', category: 'front', auto: false, checked: false },
                { id: 'introduction', name: 'Introduction', category: 'body', auto: false, checked: true },
                { id: 'chapters', name: 'Main Chapters', category: 'body', auto: false, checked: true },
                { id: 'epilogue', name: 'Epilogue', category: 'body', auto: false, checked: false },
                { id: 'afterword', name: 'Afterword', category: 'back', auto: false, checked: false },
                { id: 'appendix', name: 'Appendix', category: 'back', auto: false, checked: false },
                { id: 'glossary', name: 'Glossary', category: 'back', auto: false, checked: false },
                { id: 'bibliography', name: 'Bibliography', category: 'back', auto: false, checked: false },
                { id: 'index', name: 'Index', category: 'back', auto: false, checked: false },
                { id: 'author-bio', name: 'Author Biography', category: 'back', auto: false, checked: false }
            ]
        };
    }

    async showBookCreationDialog(bookType) {
        const typeNames = {
            classical: 'Classical Book',
            wiki: 'Wiki Documentation',
            help: 'Help Documentation',
            technical: 'Technical Documentation'
        };

        const readableType = typeNames[bookType] || 'Book';
        const sectionDefinitions = this.getBookSectionDefinitions();
        const sectionList = (sectionDefinitions[bookType] || []).map(section => ({ ...section }));

        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:flex-start;justify-content:center;padding:20px;box-sizing:border-box;overflow:auto;';

            const dialog = document.createElement('div');
            dialog.style.cssText = 'background:#1f1f1f;padding:28px;border-radius:12px;width:100%;max-width:840px;color:#fff;box-shadow:0 25px 80px rgba(0,0,0,0.65);max-height:calc(100vh - 40px);overflow-y:auto;';

            const header = document.createElement('div');
            header.style.cssText = 'margin-bottom:20px;';
            header.innerHTML = `
                <h2 style="margin:0 0 6px 0;font-size:20px;font-weight:600;color:#fff;">Create ${readableType}</h2>
                <p style="margin:0;color:#aaa;font-size:13px;line-height:1.6;">
                    Fill in the details below. Everything is collected in one place for a faster start.
                </p>
            `;

            const form = document.createElement('form');
            form.style.cssText = 'display:flex;flex-direction:column;gap:20px;';

            const fieldsGrid = document.createElement('div');
            fieldsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;width:100%;';
            form.appendChild(fieldsGrid);

            const createInputField = (labelText, defaultValue = '', isTextarea = false, options = {}) => {
                const wrapper = document.createElement('label');
                wrapper.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#ddd;min-width:0;';
                if (options.fullWidth) {
                    wrapper.style.gridColumn = '1 / -1';
                }

                const label = document.createElement('span');
                label.textContent = labelText;
                const input = document.createElement(isTextarea ? 'textarea' : 'input');
                input.value = defaultValue;
                input.required = !isTextarea;
                input.style.cssText = 'padding:10px 12px;background:#2e2e2e;border:1px solid #3b3b3b;border-radius:6px;color:#fff;font-size:14px;resize:' + (isTextarea ? 'vertical' : 'none') + ';min-height:44px;';
                if (!isTextarea) {
                    input.type = 'text';
                } else {
                    input.rows = 3;
                }
                wrapper.appendChild(label);
                wrapper.appendChild(input);
                fieldsGrid.appendChild(wrapper);
                return input;
            };

            const titleInput = createInputField('Book Title', `My ${readableType}`);
            const authorInput = createInputField('Author Name', 'Author Name');
            const descriptionInput = createInputField('Short Description (optional)', `A ${readableType.toLowerCase()} created with MarkDD`, true, { fullWidth: true });

            let technicalStyleSelect = null;
            if (bookType === 'technical') {
                const styleWrapper = document.createElement('label');
                styleWrapper.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#ddd;min-width:0;grid-column:1 / -1;';
                styleWrapper.innerHTML = '<span>Technical Document Style</span>';

                const select = document.createElement('select');
                select.style.cssText = 'padding:10px 12px;background:#2e2e2e;border:1px solid #3b3b3b;border-radius:6px;color:#fff;font-size:14px;min-height:44px;';

                const styleOptions = [
                    { value: 'report', label: 'Project Report' },
                    { value: 'plan', label: 'Strategic Plan' },
                    { value: 'brochure', label: 'Product Brochure' },
                    { value: 'business-case', label: 'Business Case' },
                    { value: 'white-paper', label: 'White Paper' },
                    { value: 'case-study', label: 'Case Study' },
                    { value: 'feasibility-study', label: 'Feasibility Study' },
                    { value: 'proposal', label: 'Project Proposal' },
                    { value: 'user-manual', label: 'User Manual' },
                    { value: 'sop', label: 'Standard Operating Procedure' },
                    { value: 'rfp', label: 'Request for Proposal' },
                    { value: 'annual-report', label: 'Annual Report' },
                    { value: 'project-charter', label: 'Project Charter' }
                ];

                styleOptions.forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt.value;
                    optionEl.textContent = opt.label;
                    select.appendChild(optionEl);
                });

                styleWrapper.appendChild(select);
                fieldsGrid.appendChild(styleWrapper);
                technicalStyleSelect = select;
            }

            const structureSettings = document.createElement('div');
            structureSettings.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;padding:16px;border:1px solid #333;border-radius:10px;background:#252525;';

            const chapterCountWrapper = document.createElement('label');
            chapterCountWrapper.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#ddd;';
            chapterCountWrapper.innerHTML = '<span>How many main chapters?</span>';
            const chapterCountInput = document.createElement('input');
            chapterCountInput.type = 'number';
            chapterCountInput.min = '1';
            chapterCountInput.max = '50';
            chapterCountInput.value = '5';
            chapterCountInput.style.cssText = 'padding:10px 12px;background:#2e2e2e;border:1px solid #3b3b3b;border-radius:6px;color:#fff;font-size:14px;min-height:44px;';
            chapterCountWrapper.appendChild(chapterCountInput);

            const appendixCountWrapper = document.createElement('label');
            appendixCountWrapper.style.cssText = 'display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:#ddd;';
            appendixCountWrapper.innerHTML = '<span>How many appendices?</span>';
            const appendixCountInput = document.createElement('input');
            appendixCountInput.type = 'number';
            appendixCountInput.min = '0';
            appendixCountInput.max = '20';
            appendixCountInput.value = '0';
            appendixCountInput.style.cssText = 'padding:10px 12px;background:#2e2e2e;border:1px solid #3b3b3b;border-radius:6px;color:#fff;font-size:14px;min-height:44px;';
            appendixCountWrapper.appendChild(appendixCountInput);

            const numberingWrapper = document.createElement('div');
            numberingWrapper.style.cssText = 'display:flex;align-items:center;gap:10px;background:#1b1b1b;border:1px solid #333;border-radius:8px;padding:12px;';
            const numberingToggle = document.createElement('input');
            numberingToggle.type = 'checkbox';
            numberingToggle.id = 'book-dialog-numbering-toggle';
            numberingToggle.checked = true;
            numberingToggle.style.cssText = 'width:18px;height:18px;';
            const numberingLabel = document.createElement('label');
            numberingLabel.setAttribute('for', numberingToggle.id);
            numberingLabel.style.cssText = 'font-size:13px;font-weight:600;color:#ddd;cursor:pointer;';
            numberingLabel.textContent = 'Show chapter numbers in compiled book';
            numberingWrapper.appendChild(numberingToggle);
            numberingWrapper.appendChild(numberingLabel);

            structureSettings.appendChild(chapterCountWrapper);
            structureSettings.appendChild(appendixCountWrapper);
            structureSettings.appendChild(numberingWrapper);
            form.appendChild(structureSettings);

            let sectionsContainer = null;
            if (sectionList.length) {
                sectionsContainer = document.createElement('div');
                sectionsContainer.style.cssText = 'margin-top:4px;padding:16px;border:1px solid #333;border-radius:10px;background:#252525;display:flex;flex-direction:column;gap:16px;';

                const legend = document.createElement('div');
                legend.innerHTML = '<div style="font-size:13px;font-weight:600;margin-bottom:6px;">Sections</div><p style="margin:0;font-size:12px;color:#aaa;">Choose which sections to generate. Auto sections are always included.</p>';
                sectionsContainer.appendChild(legend);

                const sectionGrid = document.createElement('div');
                sectionGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;align-items:flex-start;';

                const frontSection = this.createSectionGroup('Front Matter', sectionList.filter(s => s.category === 'front'));
                const bodySection = this.createSectionGroup('Main Content', sectionList.filter(s => s.category === 'body'));
                const backSection = this.createSectionGroup('Back Matter', sectionList.filter(s => s.category === 'back'));

                [frontSection, bodySection, backSection].forEach(section => sectionGrid.appendChild(section));
                sectionsContainer.appendChild(sectionGrid);
                form.appendChild(sectionsContainer);
            }

            const errorText = document.createElement('div');
            errorText.style.cssText = 'color:#ff8080;font-size:12px;display:none;';
            form.appendChild(errorText);

            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:8px;';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.cssText = 'padding:10px 18px;background:#3a3a3a;color:#fff;border:none;border-radius:6px;cursor:pointer;';

            const createBtn = document.createElement('button');
            createBtn.type = 'submit';
            createBtn.textContent = 'Create Book';
            createBtn.style.cssText = 'padding:10px 18px;background:#007acc;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;';

            actions.appendChild(cancelBtn);
            actions.appendChild(createBtn);
            form.appendChild(actions);

            dialog.appendChild(header);
            dialog.appendChild(form);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const cleanup = (payload) => {
                window.removeEventListener('keydown', handleKeydown);
                overlay.remove();
                resolve(payload);
            };

            const handleKeydown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup(null);
                }
            };

            cancelBtn.onclick = () => cleanup(null);
            overlay.onclick = (event) => {
                if (event.target === overlay) {
                    cleanup(null);
                }
            };

            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const title = titleInput.value.trim();
                const author = authorInput.value.trim();
                if (!title || !author) {
                    errorText.textContent = 'Title and author are required.';
                    errorText.style.display = 'block';
                    return;
                }

                let selectedSections = null;
                if (sectionsContainer) {
                    selectedSections = [];
                    sectionsContainer.querySelectorAll('input[data-section-id]:checked').forEach(cb => {
                        selectedSections.push(cb.dataset.sectionId);
                    });
                }

                cleanup({
                    title,
                    author,
                    description: descriptionInput.value.trim(),
                    sections: selectedSections,
                    chapterCount: Math.max(1, parseInt(chapterCountInput.value, 10) || 1),
                    appendixCount: Math.max(0, parseInt(appendixCountInput.value, 10) || 0),
                    showChapterNumbers: numberingToggle.checked,
                    technicalStyle: technicalStyleSelect ? technicalStyleSelect.value : null
                });
            });

            window.addEventListener('keydown', handleKeydown);
            setTimeout(() => titleInput.focus(), 30);
        });
    }

    createSectionGroup(title, sections) {
        const group = document.createElement('div');
        group.style.cssText = 'display:flex;flex-direction:column;gap:12px;padding:12px;border:1px solid #333;border-radius:10px;background:#1b1b1b;min-height:0;';
        
        const groupTitle = document.createElement('h3');
        groupTitle.textContent = title;
        groupTitle.style.cssText = 'color:#fff;font-size:14px;font-weight:600;margin:0;';
        
        const list = document.createElement('div');
        list.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;';
        
        sections.forEach(section => {
            const item = document.createElement('label');
            item.style.cssText = 'display:flex;align-items:center;color:#ddd;font-size:13px;cursor:pointer;padding:6px 8px;border-radius:6px;transition:background 0.2s;background:#202020;gap:8px;';
            item.onmouseenter = () => item.style.background = '#3a3a3a';
            item.onmouseleave = () => item.style.background = '#202020';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = section.checked;
            checkbox.dataset.sectionId = section.id;
            checkbox.style.cssText = 'margin:0;';
            if (section.auto) {
                checkbox.disabled = true;
                checkbox.style.opacity = '0.6';
            }
            
            const name = document.createElement('span');
            name.textContent = section.name;
            name.style.cssText = 'flex:1;min-width:0;';
            
            if (section.auto) {
                const badge = document.createElement('span');
                badge.textContent = 'Auto';
                badge.style.cssText = 'background:#007acc;color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;';
                item.appendChild(checkbox);
                item.appendChild(name);
                item.appendChild(badge);
            } else {
                item.appendChild(checkbox);
                item.appendChild(name);
            }
            
            list.appendChild(item);
        });
        
        group.appendChild(groupTitle);
        group.appendChild(list);
        return group;
    }

    getRecentFiles() {
        try {
            const raw = localStorage.getItem('recent-files');
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            const normalized = [];
            const seen = new Set();

            parsed.forEach(entry => {
                let filePath = null;
                let fileName = null;
                let timestamp = null;

                if (typeof entry === 'string') {
                    filePath = entry;
                } else if (entry && typeof entry === 'object') {
                    filePath = entry.path || entry.filePath || entry.file;
                    fileName = entry.name || entry.title || entry.filename;
                    timestamp = typeof entry.timestamp === 'number' ? entry.timestamp : null;
                }

                if (!filePath || typeof filePath !== 'string') {
                    return;
                }

                if (seen.has(filePath)) {
                    return;
                }

                seen.add(filePath);
                normalized.push({
                    path: filePath,
                    name: fileName || this.getFileNameFromPath(filePath),
                    timestamp: timestamp || Date.now()
                });
            });

            const sorted = normalized.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            if (sorted.length !== parsed.length) {
                try {
                    localStorage.setItem('recent-files', JSON.stringify(sorted));
                } catch (error) {
                    console.error('[App] Failed to persist normalized recent files:', error);
                }
            }

            return sorted;
        } catch (error) {
            console.error('[App] Failed to parse recent files:', error);
            return [];
        }
    }

    getFileNameFromPath(filePath) {
        if (!filePath) {
            return 'Untitled';
        }

        let baseName = filePath.split(/[\\\/]/).pop() || filePath;

        if (typeof require !== 'undefined') {
            try {
                const path = require('path');
                baseName = path.basename(filePath);
            } catch (error) {
                console.warn('[App] Failed to resolve path module for filename extraction:', error);
            }
        }

        return baseName || 'Untitled';
    }

    recordRecentFile(filePath, fileName = null) {
        if (!filePath) {
            return;
        }

        const resolvedName = fileName || this.getFileNameFromPath(filePath);
        let recentFiles = this.getRecentFiles().filter(file => file.path !== filePath);

        recentFiles.unshift({
            path: filePath,
            name: resolvedName,
            timestamp: Date.now()
        });

        recentFiles = recentFiles.slice(0, 10);

        try {
            localStorage.setItem('recent-files', JSON.stringify(recentFiles));
        } catch (error) {
            console.error('[App] Failed to persist recent files:', error);
        }

        if (this.fileBrowser && typeof this.fileBrowser.loadRecentFiles === 'function') {
            this.fileBrowser.loadRecentFiles();
        }

        this.updateRecentFilesMenu();
    }

    removeRecentFile(filePath) {
        if (!filePath) {
            return;
        }

        const recentFiles = this.getRecentFiles().filter(file => file.path !== filePath);

        try {
            localStorage.setItem('recent-files', JSON.stringify(recentFiles));
        } catch (error) {
            console.error('[App] Failed to persist recent files after removal:', error);
        }

        if (this.fileBrowser && typeof this.fileBrowser.loadRecentFiles === 'function') {
            this.fileBrowser.loadRecentFiles();
        }

        this.updateRecentFilesMenu();
    }

    clearRecentFiles() {
        try {
            localStorage.removeItem('recent-files');
        } catch (error) {
            console.error('[App] Failed to clear recent files:', error);
        }

        if (this.fileBrowser && typeof this.fileBrowser.loadRecentFiles === 'function') {
            this.fileBrowser.loadRecentFiles();
        }

        this.updateRecentFilesMenu();
    }

    updateRecentFilesMenu() {
        const itemsContainer = document.getElementById('menu-recent-files-items');
        const clearButton = document.getElementById('menu-clear-recent');

        if (!itemsContainer) {
            return;
        }

        // Clear container
        itemsContainer.innerHTML = '';

        const recentFiles = this.getRecentFiles();

        if (recentFiles.length === 0) {
            const placeholder = document.createElement('button');
            placeholder.className = 'menu-option';
            placeholder.textContent = 'No recent files';
            placeholder.disabled = true;
            itemsContainer.appendChild(placeholder);

            if (clearButton) {
                clearButton.disabled = true;
            }
            return;
        }

        // Cache fs check results to avoid slow repeated checks
        if (!this._recentExistsCache) {
            this._recentExistsCache = new Map();
        }
        const existsCache = this._recentExistsCache;
        let fs = null;
        if (typeof require !== 'undefined') {
            try {
                fs = require('fs');
            } catch (error) {
                // fs not available
            }
        }

        const self = this;

        recentFiles.forEach((file) => {
            const button = document.createElement('button');
            button.className = 'menu-option recent-file-option';
            button.type = 'button';
            
            const fileLabel = file.name || this.getFileNameFromPath(file.path);
            
            // Cache file existence check (avoid repeated sync IO on every open)
            let isMissing = false;
            if (fs && file.path) {
                if (existsCache.has(file.path)) {
                    isMissing = !existsCache.get(file.path);
                } else {
                    let exists = false;
                    try {
                        exists = fs.existsSync(file.path);
                    } catch (error) {
                        exists = false;
                    }
                    existsCache.set(file.path, exists);
                    isMissing = !exists;
                }
            }
            
            if (isMissing) {
                button.classList.add('recent-file-missing');
                button.textContent = `Missing: ${fileLabel}`;
            } else {
                button.textContent = fileLabel;
            }
            
            button.title = file.path;
            
            // Store values in closure
            const filePath = file.path;
            const fileIsMissing = isMissing;
            
            // Use pointerdown to beat menu close/hover timers and ensure click works
            let handled = false;
            button.addEventListener('pointerdown', function(e) {
                if (e.button !== 0 || handled) {
                    return;
                }
                handled = true;
                e.preventDefault();
                e.stopPropagation();

                if (fileIsMissing) {
                    self.removeRecentFile(filePath);
                    self.showMessage('Removed missing recent file');
                    return;
                }

                self.openRecentFileFromMenu(filePath);
            });

            // Safety: prevent double-fire if click still happens
            button.addEventListener('click', function(e) {
                if (handled) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            });
            
            itemsContainer.appendChild(button);
        });

        if (clearButton) {
            clearButton.disabled = false;
        }
    }

    async openRecentFileFromMenu(filePath) {
        if (!filePath || typeof require === 'undefined') {
            return;
        }

        const { ipcRenderer } = require('electron');

        try {
            const result = await ipcRenderer.invoke('read-file', filePath);
            const content = typeof result === 'string' ? result : (result && result.content ? result.content : null);

            if (typeof content !== 'string') {
                throw new Error('File could not be read');
            }

            await this.openFile(filePath, content);
        } catch (error) {
            console.error('[App] Failed to open recent file:', error);
            this.showError('Failed to open recent file. It may have been moved or deleted.');
            this.removeRecentFile(filePath);
        }
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

    /**
     * Open comprehensive feature showcase document
     */
    async openHelpShowcase() {
        const showcaseFile = 'COMPREHENSIVE-FEATURES-SHOWCASE.md';
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const path = require('path');
            try {
                // First try examples folder (packaged builds)
                const examplesResult = await ipcRenderer.invoke('get-examples-path');
                let fullPath;
                
                if (examplesResult.success) {
                    fullPath = path.join(examplesResult.path, showcaseFile);
                } else {
                    // Fallback to current working directory (dev mode)
                    const cwd = await ipcRenderer.invoke('get-cwd');
                    fullPath = path.join(cwd, showcaseFile);
                }
                
                const result = await ipcRenderer.invoke('read-file', fullPath);
                const content = typeof result === 'string' ? result : (result && result.content ? result.content : null);
                
                if (typeof content === 'string') {
                    await this.openFile(fullPath, content);
                    this.showMessage('Opened Comprehensive Feature Showcase');
                } else {
                    this.showError('Could not read showcase file');
                }
            } catch (error) {
                console.error('[App] Failed to open showcase:', error);
                this.showError('Failed to open showcase file: ' + error.message);
            }
        }
    }

    /**
     * Open comprehensive presentation test document
     */
    async openHelpPresentation() {
        const presentationFile = 'SAMPLE-PRESENTATION.md';
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const path = require('path');
            try {
                // First try examples folder (packaged builds)
                const examplesResult = await ipcRenderer.invoke('get-examples-path');
                let fullPath;
                
                if (examplesResult.success) {
                    fullPath = path.join(examplesResult.path, presentationFile);
                } else {
                    // Fallback to current working directory (dev mode)
                    const cwd = await ipcRenderer.invoke('get-cwd');
                    fullPath = path.join(cwd, presentationFile);
                }
                
                const result = await ipcRenderer.invoke('read-file', fullPath);
                const content = typeof result === 'string' ? result : (result && result.content ? result.content : null);
                
                if (typeof content === 'string') {
                    await this.openFile(fullPath, content);
                    this.showMessage('Opened Sample Presentation');
                } else {
                    this.showError('Could not read presentation file');
                }
            } catch (error) {
                console.error('[App] Failed to open presentation:', error);
                this.showError('Failed to open presentation file: ' + error.message);
            }
        }
    }

    async showAboutDialog() {
        // Get package data dynamically from main process
        let packageData = {
            name: 'MarkDD Editor',
            version: '1.3.1', // Fallback, will be replaced by main process
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
            const res = await fetch('./about-libraries.json');
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
            <li>📚 Book Module - Multi-chapter publishing with HTML/PDF export</li>
            <li>🎪 Presentation Mode - 28 Beamer-style themes for slideshows</li>
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

    /**
     * Populate version info in the UI from package data
     * Called after app initialization to display the version dynamically
     */
    async populateVersionInfo() {
        try {
            const versionElement = document.getElementById('app-version');
            if (!versionElement) return; // Element not yet in DOM
            
            // Try to get version from main process via IPC
            if (typeof require !== 'undefined') {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('get-package-data');
                if (result.success && result.data && result.data.version) {
                    versionElement.textContent = result.data.version;
                    return;
                }
            }
            
            // Fallback: keep the "Loading..." text or set a default
            versionElement.textContent = '1.0.0';
        } catch (error) {
            console.error('Failed to populate version info:', error);
            const versionElement = document.getElementById('app-version');
            if (versionElement) {
                versionElement.textContent = '1.0.0';
            }
        }
    }
}

// If loaded after libs (index.html dynamic load), initialize immediately when script executes
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.markddApp) window.markddApp = new MarkDDApp();
        // Populate version from package data after app init
        window.markddApp.populateVersionInfo();
    });
} else {
    if (!window.markddApp) window.markddApp = new MarkDDApp();
    // Populate version from package data after app init
    window.markddApp.populateVersionInfo();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkDDApp;
} else {
    window.MarkDDApp = MarkDDApp;
}
