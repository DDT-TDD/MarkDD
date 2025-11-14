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
        this._restoredTabsCleared = false; // Track if we've already cleared restored tabs
        this._appInitializing = true; // Track if app is still initializing (skip animation delays)
        
        this.viewMode = 'split'; // 'split', 'editor', 'preview'
        this.isLivePreview = localStorage.getItem('live-preview-enabled') !== 'false'; // Default to true
        this.syncScroll = localStorage.getItem('sync-scroll-enabled') !== 'false'; // Default to true
        
        // Guard flags to prevent duplicate dialogs
        this._openingFile = false;
        this._exportingHTML = false;
        this._exportingPDF = false;
    this._lastNavigationPosition = null;
        
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

        // Track pointer type for touch vs mouse handling
        let lastPointerType = 'mouse';
        const rememberPointerType = (event) => {
            if (event.pointerType) {
                lastPointerType = event.pointerType;
            }
        };

        menuBar.addEventListener('pointerdown', rememberPointerType, true);
        menuBar.addEventListener('pointermove', rememberPointerType, true);

        // Get all menu items and submenus
        const menuItems = Array.from(menuBar.querySelectorAll('.menu-item'));
        const submenus = Array.from(menuBar.querySelectorAll('.menu-submenu'));
        const dropdowns = Array.from(menuBar.querySelectorAll('.menu-dropdown'));

        const menuCloseTimers = new WeakMap();
        const submenuCloseTimers = new WeakMap();
        const MENU_CLOSE_DELAY = 220;
        const SUBMENU_CLOSE_DELAY = 160;

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

        // Helper functions
        const getMenuLabel = (item) => item.querySelector('.menu-label');

        const resetDropdownPosition = (dropdown) => {
            if (!dropdown) return;
            dropdown.style.left = '';
            dropdown.style.right = '';
            dropdown.style.maxHeight = '';
        };

        const adjustDropdownPosition = (dropdown) => {
            if (!dropdown) return;
            dropdown.style.left = '';
            dropdown.style.right = '';
            dropdown.style.maxHeight = '';

            const rect = dropdown.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportPadding = 8;
            const availableHeight = Math.max(220, window.innerHeight - rect.top - viewportPadding);

            if (rect.right > viewportWidth - viewportPadding) {
                dropdown.style.left = 'auto';
                dropdown.style.right = '0';
            }

            dropdown.style.maxHeight = `${Math.min(520, availableHeight)}px`;
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

            const viewportPadding = 8;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let rect = nested.getBoundingClientRect();
            if (rect.right > viewportWidth - viewportPadding) {
                nested.classList.add('align-left');
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
            // Get direct child buttons and submenu triggers, excluding nested dropdown buttons
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

        // Setup main menu items
        menuItems.forEach(item => {
            const label = getMenuLabel(item);
            const dropdown = item.querySelector('.menu-dropdown');
            if (!label || !dropdown) return;

            label.setAttribute('role', 'menuitem');
            label.setAttribute('tabindex', '0');
            label.setAttribute('aria-haspopup', 'true');
            label.setAttribute('aria-expanded', 'false');
            dropdown.setAttribute('role', 'menu');

            // Click handler for menu label
            label.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleMenu(item);
            });

            // Keyboard navigation for menu labels
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

            // Mouse hover for menu items
            item.addEventListener('mouseenter', () => {
                cancelPendingClose(menuCloseTimers, item);
                if (lastPointerType !== 'touch') {
                    // Only auto-open if another menu is already open
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

            // Keyboard navigation within dropdown
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
                        // Check if current element is a submenu trigger
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

        // Helper functions for submenus
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
            
            // Close sibling submenus
            closeSiblingSubmenus(submenu);
            
            // Open this submenu
            submenu.classList.add('open');
            cancelPendingClose(submenuCloseTimers, submenu);
            adjustNestedPosition(submenu);
            const trigger = submenu.querySelector(':scope > .menu-option');
            if (trigger) {
                trigger.setAttribute('aria-expanded', 'true');
            }
            
            // Focus first option if requested
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

        // Setup submenus
        submenus.forEach(submenu => {
            const trigger = submenu.querySelector(':scope > .menu-option');
            const nested = submenu.querySelector('.menu-dropdown-nested');
            
            if (!trigger || !nested) {
                console.warn('[Menu] Submenu missing trigger or nested dropdown:', submenu);
                return;
            }

            // Set ARIA attributes
            trigger.setAttribute('role', 'menuitem');
            trigger.setAttribute('tabindex', '-1');
            trigger.setAttribute('aria-haspopup', 'true');
            trigger.setAttribute('aria-expanded', 'false');
            nested.setAttribute('role', 'menu');

            // Click handler for submenu trigger
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleSubmenu(submenu);
            });

            // Keyboard navigation for submenu triggers
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

            // Mouse hover for submenu
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

            // Keyboard navigation within nested dropdown
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

        // Close menus on outside click
        const closeOnOutsideClick = (event) => {
            if (!menuBar.contains(event.target)) {
                closeAllMenus();
            }
        };

        // Close menus on Escape key
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                closeAllMenus();
            }
        };

        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keydown', closeOnEscape);

        // Close menus when clicking regular menu options (not submenu triggers)
        menuBar.querySelectorAll('.menu-dropdown > button.menu-option').forEach(button => {
            // Only add to direct children, not submenu triggers
            if (!button.parentElement.classList.contains('menu-submenu')) {
                button.addEventListener('click', () => {
                    window.requestAnimationFrame(() => closeAllMenus());
                });
            }
        });

        // Also handle nested dropdown option clicks
        menuBar.querySelectorAll('.menu-dropdown-nested > button.menu-option').forEach(button => {
            button.addEventListener('click', () => {
                window.requestAnimationFrame(() => closeAllMenus());
            });
        });

        // Cleanup function
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
        
        // Color customization handlers
        this.bindButton('menu-presentation-customize-colors', () => this.customizePresentationColors());
        this.bindButton('menu-color-preset-blue', () => this.applyColorPreset('blue'));
        this.bindButton('menu-color-preset-red', () => this.applyColorPreset('red'));
        this.bindButton('menu-color-preset-green', () => this.applyColorPreset('green'));
        this.bindButton('menu-color-preset-purple', () => this.applyColorPreset('purple'));
        this.bindButton('menu-color-preset-orange', () => this.applyColorPreset('orange'));
    this.bindButton('menu-color-preset-dark', () => this.applyColorPreset('dark'));
    this.bindButton('menu-color-preset-crimson-horizon', () => this.applyColorPreset('crimsonHorizon'));
        
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
        
        // Help menu handlers
        this.bindButton('menu-help-showcase', () => this.openHelpShowcase());
        this.bindButton('menu-help-presentation', () => this.openHelpPresentation());
        this.bindButton('menu-about', () => this.showAboutDialog());

        // Ensure Markdown menu toggles reflect current front-matter state
        this.refreshMarkdownMenuStates();

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
        const cursor = this.editor.getCursor();
        const tocMarker = '\n[TOC]\n\n';
        this.editor.insertText(tocMarker, cursor);
        this.showMessage('Table of Contents marker inserted. It will generate TOC from your headings.');
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
            this.showMessage(`Presentation theme set to: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`);
            
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
            }
        } else {
            this.showError(`Invalid theme: ${theme}`);
        }
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
        
        if (this.presentationManager && this.previewPanel) {
            this.updatePreview();
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
        if (this.presentationManager && this.previewPanel) {
            this.updatePreview();
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
        if (this.presentationManager && this.previewPanel) {
            this.updatePreview();
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
        if (this.presentationManager && this.previewPanel) {
            this.updatePreview();
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
        cancelLabel = 'Cancel'
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

                const input = field.type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
                input.name = field.id;
                if (field.type && field.type !== 'textarea') {
                    input.type = field.type;
                }
                input.placeholder = field.placeholder || '';
                if (field.defaultValue !== undefined) {
                    input.value = field.defaultValue;
                }
                if (field.required) {
                    input.required = true;
                }
                input.style.padding = '10px';
                input.style.border = '1px solid #d0d0d0';
                input.style.borderRadius = '4px';
                input.style.fontSize = '13px';
                input.style.resize = field.type === 'textarea' ? 'vertical' : 'none';
                input.style.minHeight = field.type === 'textarea' ? '120px' : 'auto';

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

            const firstField = fields.length > 0 ? inputs[fields[0].id] : null;
            if (firstField) {
                requestAnimationFrame(() => firstField.focus());
            }
        });
    }

    showMessage(message) {
        console.log(message);
        // Could show toast notification
    }

    showError(message) {
        console.error(message);
        // Could show error notification
    }

    getRecentFiles() {
        try {
            const raw = localStorage.getItem('recent-files');
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
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

        recentFiles.forEach(file => {
            const button = document.createElement('button');
            button.className = 'menu-option recent-file-option';
            button.textContent = file.name || this.getFileNameFromPath(file.path);
            button.title = file.path;
            button.dataset.path = file.path;
            button.addEventListener('click', () => this.openRecentFileFromMenu(file.path));
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
        const showcasePath = 'COMPREHENSIVE-FEATURES-SHOWCASE.md';
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const path = require('path');
            try {
                // Get current working directory and construct full path
                const cwd = await ipcRenderer.invoke('get-cwd');
                const fullPath = path.join(cwd, showcasePath);
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
        const presentationPath = 'COMPREHENSIVE-PRESENTATION-TEST.md';
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const path = require('path');
            try {
                // Get current working directory and construct full path
                const cwd = await ipcRenderer.invoke('get-cwd');
                const fullPath = path.join(cwd, presentationPath);
                const result = await ipcRenderer.invoke('read-file', fullPath);
                const content = typeof result === 'string' ? result : (result && result.content ? result.content : null);
                
                if (typeof content === 'string') {
                    await this.openFile(fullPath, content);
                    this.showMessage('Opened Comprehensive Presentation Test');
                } else {
                    this.showError('Could not read presentation test file');
                }
            } catch (error) {
                console.error('[App] Failed to open presentation test:', error);
                this.showError('Failed to open presentation test file: ' + error.message);
            }
        }
    }

    async showAboutDialog() {
        // Get package data dynamically from main process
        let packageData = {
            name: 'MarkDD Editor',
            version: '1.2.0', // Fallback, will be replaced by main process
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
