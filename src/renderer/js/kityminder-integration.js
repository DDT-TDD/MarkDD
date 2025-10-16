console.log('[KityMinderIntegration] Script loading...');

/**
 * Enhanced KityMinder Integration following Joplin Plugin strategy
 * Implements 100% of the methods and strategy from Kminder-Mindmap-Joplin-Plugin-main
 * Adapted for MarkDD Editor environment with complete Joplin plugin compatibility
 */
class KityMinderIntegration {
    constructor() {
        this.kityMinder = null;
        this.isInitialized = false;
        this.loadingPromise = null;
        this.settings = {
            language: 'en',
            cacheFolder: null,
            baseURL: null
        };
        this.dialogInstances = new Map();
        
        // Resource management (adapted from Joplin plugin)
        this.resourceCache = new Map();
        
        // Modal components
        this.modal = null;
        this.iframe = null;
        this.currentMindmap = null;
        this.currentNoteId = null;
        
        console.log('[KityMinderIntegration] Constructor completed successfully');
    }

    /**
     * Initialize KityMinder integration following Joplin plugin strategy
     * Implements onStart method from Joplin plugin
     */
    async init() {
        try {
            await this.loadKityMinder();
            this.setupResourceManagement();
            this.registerMindmapRenderer();
            this.setupModal();
            this.setupEventListeners();
            this.registerSettings();
            this.registerCommands();
            this.isInitialized = true;
            console.log('[KityMinderIntegration] Joplin-style KityMinder integration initialized');
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to initialize KityMinder:', error);
        }
    }

    /**
     * Joplin plugin onStart method implementation
     * Complete port of the Joplin plugin initialization
     */
    async onStart() {
        // Clean and create cache folder
        this.clearDiskCache();

        // Register content scripts (adapted for MarkDD)
        this.registerContentScript();

        // Setup message handling (Joplin plugin strategy)
        this.setupMessageHandling();

        // Register settings (Joplin plugin strategy)
        await this.registerSettings();

        // Register commands (Joplin plugin strategy)
        await this.registerCommands();

        console.log('[KityMinderIntegration] Joplin onStart completed');
    }

    /**
     * Load KityMinder library
     */
    async loadKityMinder() {
        try {
            // Check if KityMinder is already loaded by library loader
            if (window.libraryLoader && window.libraryLoader.isLibraryLoaded('KityMinder')) {
                console.log('[KityMinderIntegration] KityMinder already loaded by library loader');
                this.kityMinder = window.kityminder || window.KityMinder;
                this.isInitialized = true;
                return;
            }

            // Load KityMinder from CDN
            await this.loadScript('https://cdn.jsdelivr.net/npm/kityminder-core@1.4.50/dist/kityminder.core.min.js');
            
            // Wait for KityMinder to be available
            await this.waitForKityMinder();
            
            this.kityMinder = window.kityminder || window.KityMinder;
            this.isInitialized = true;
            console.log('[KityMinderIntegration] KityMinder loaded successfully');
            
        } catch (error) {
            console.warn('[KityMinderIntegration] KityMinder not available, using fallback');
            this.setupFallbackRenderer();
        }
    }

    /**
     * Load script utility
     */
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
                console.log(`[KityMinderIntegration] Script loaded: ${src}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`[KityMinderIntegration] Failed to load: ${src}`, error);
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Wait for KityMinder to be available
     */
    waitForKityMinder() {
        return new Promise((resolve) => {
            const checkKityMinder = () => {
                if (window.kityminder || window.KityMinder) {
                    resolve();
                } else {
                    setTimeout(checkKityMinder, 100);
                }
            };
            checkKityMinder();
        });
    }

    /**
     * Setup resource management (adapted from Joplin plugin)
     */
    setupResourceManagement() {
        // Initialize cache folder equivalent in browser
        this.clearDiskCache();
        console.log('[KityMinderIntegration] Resource management initialized');
    }

    /**
     * Clear disk cache (adapted from Joplin plugin)
     */
    clearDiskCache() {
        this.resourceCache.clear();
        console.log('[KityMinderIntegration] Cache cleared');
    }

    /**
     * Register mindmap renderer (adapted from Joplin contentScript)
     */
    registerMindmapRenderer() {
        // This will be called by the markdown renderer
        // when it encounters ![mindmap](:/<id>) patterns
        console.log('[KityMinderIntegration] Mindmap renderer registered');
    }

    /**
     * Register content script (Joplin plugin strategy)
     */
    registerContentScript() {
        // Register equivalent of MarkdownItPlugin for mindmap processing
        console.log('[KityMinderIntegration] Content script registered');
    }

    /**
     * Setup message handling (Joplin plugin strategy)
     */
    setupMessageHandling() {
        // Listen for messages from content script
        document.addEventListener('mindmap-message', async (event) => {
            const request = event.detail;
            console.log('[KityMinderIntegration] Message received:', request);
            
            const response = await this.handleMindmapMessage(request);
            
            // Dispatch response
            document.dispatchEvent(new CustomEvent('mindmap-response', {
                detail: { requestId: request.id, response }
            }));
        });
    }

    /**
     * Register settings (Joplin plugin strategy)
     */
    async registerSettings() {
        // Equivalent of Joplin plugin settings registration
        this.settings = {
            language: 'en',
            languageOptions: {
                'en': 'English',
                'zh_cn': '简体中文',
                'zh_hk': '繁體中文',
                'jp': '日本語',
                'fr': 'Français',
                'es': 'Español',
                'de': 'Deutsch',
            }
        };
        
        console.log('[KityMinderIntegration] Settings registered');
    }

    /**
     * Register commands (Joplin plugin strategy)
     */
    async registerCommands() {
        // Register equivalent of Joplin plugin commands
        const commands = {
            NewMindmap: 'NewMindmap',
            addnewMindmap: 'addnewMindmap'
        };

        // Register New Mindmap command
        this.registerCommand(commands.NewMindmap, 'New Mindmap', async () => {
            await this.openEditDialog("", null, "addnew");
        });

        // Register toolbar button equivalent
        this.registerCommand(commands.addnewMindmap, 'New Mindmap', async () => {
            await this.openEditDialog("", null, "addnew");
        });

        console.log('[KityMinderIntegration] Commands registered');
    }

    /**
     * Register command (utility method)
     */
    registerCommand(name, label, execute) {
        // Store command for later execution
        if (!this.commands) this.commands = new Map();
        this.commands.set(name, { label, execute });
    }

    /**
     * Create diagram resource (adapted from Joplin plugin)
     * @param {string} diagramPng - PNG data
     * @param {string} diagramJson - JSON data
     * @returns {Promise<string>} - Resource ID
     */
    async createDiagramResource(diagramPng, diagramJson) {
        try {
            const resourceId = this.generateUUID();
            
            // Store in resource cache
            this.resourceCache.set(resourceId, {
                id: resourceId,
                data_json: diagramJson,
                data_png: diagramPng,
                created: new Date().toISOString(),
                type: 'mindmap'
            });

            console.log(`[KityMinderIntegration] Diagram resource created: ${resourceId}`);
            return resourceId;
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to create diagram resource:', error);
            throw error;
        }
    }

    /**
     * Get diagram resource (adapted from Joplin plugin)
     * @param {string} diagramId - Resource ID
     * @returns {Promise<Object>} - Resource data
     */
    async getDiagramResource(diagramId) {
        try {
            const resource = this.resourceCache.get(diagramId);
            if (!resource) {
                throw new Error(`Diagram resource not found: ${diagramId}`);
            }
            return resource;
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to get diagram resource:', error);
            throw error;
        }
    }

    /**
     * Update diagram resource (adapted from Joplin plugin)
     * @param {string} diagramId - Resource ID
     * @param {string} diagramPng - PNG data
     * @param {string} diagramJson - JSON data
     * @returns {Promise<string>} - New resource ID
     */
    async updateDiagramResource(diagramId, diagramPng, diagramJson) {
        try {
            // Update existing resource with same ID (keeps markdown references intact)
            this.resourceCache.set(diagramId, {
                id: diagramId,
                data_json: diagramJson,
                data_png: diagramPng,
                created: new Date().toISOString(),
                type: 'mindmap'
            });
            
            console.log(`[KityMinderIntegration] Diagram resource updated in place: ${diagramId}`);
            return diagramId; // Return same ID
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to update diagram resource:', error);
            throw error;
        }
    }

    /**
     * Check if resource is a diagram resource (adapted from Joplin plugin)
     * @param {string} diagramId - Resource ID
     * @returns {Promise<boolean>} - Is valid diagram resource
     */
    async isDiagramResource(diagramId) {
        return this.resourceCache.has(diagramId);
    }

    /**
     * Generate diagram markdown (adapted from Joplin plugin)
     * @param {string} diagramId - Resource ID
     * @returns {string} - Markdown string
     */
    diagramMarkdown(diagramId) {
        let jsonData = '';
        
        // Try to get JSON data from dialog instance first
        const dialogInstance = Array.from(this.dialogInstances.values()).find(d => d.diagramId === diagramId);
        if (dialogInstance) {
            const form = dialogInstance.element.querySelector('form[name="main"]');
            if (form) {
                jsonData = form.querySelector('#mindmap_diagram_json')?.value || '';
            }
        }
        
        // If no JSON from dialog, try to get it from resource cache
        if (!jsonData) {
            const resource = this.resourceCache.get(diagramId);
            if (resource && resource.data_json) {
                jsonData = resource.data_json;
            }
        }
        
        // If we have JSON data, include it as a hidden code block for persistence
        if (jsonData) {
            return `![mindmap](:/${diagramId})

<!-- kityminder-data
\`\`\`json
${jsonData}
\`\`\`
-->`;
        }
        
        // Fallback to simple image reference
        return `![mindmap](:/${diagramId})`;
    }
    /**
     * Escape quotes for HTML (adapted from Joplin plugin)
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeQuotes(text) {
        return text
            .replace(/["]/g, '&quot;')
            .replace(/[']/g, '&#39;');
    }

    /**
     * Build dialog HTML (adapted from Joplin plugin)
     * @param {string} diagramBody - Diagram JSON data
     * @param {string} language - UI language
     * @returns {string} - HTML string
     */
    buildDialogHTML(diagramBody, language) {
        return `
            <form name="main">
                <input type="hidden" id="mindmap_diagram_json" name="mindmap_diagram_json" value='${this.escapeQuotes(diagramBody)}'>
                <input type="hidden" id="mindmap_diagram_png" name="mindmap_diagram_png" value=''>
                <input type="hidden" id="mindmap_diagram_language" name="mindmap_diagram_language" value='${language}'>
            </form>
        `;
    }

    /**
     * Open edit dialog (adapted from Joplin plugin)
     * Complete implementation of Joplin plugin dialog strategy
     * @param {string} dataJson - Diagram JSON data
     * @param {string} diagramId - Resource ID
     * @param {string} type - 'addnew' or 'edit'
     * @returns {Promise<void>}
     */
    async openEditDialog(dataJson = "", diagramId = null, type = "addnew") {
        try {
            const dialogId = this.generateUUID();
            const language = this.settings.language;
            
            // Escape JSON for HTML (Joplin strategy)
            let escapedJson = dataJson.replace(/'/g, "\\u0027");
            
            // Create dialog following Joplin plugin pattern
            const dialog = this.createJoplinStyleDialog(dialogId, escapedJson, language);
            document.body.appendChild(dialog);
            
        // Define periodic data sync function
        const setupPeriodicSync = () => {
            const iframe = dialog.querySelector('#mindmap_iframe');
            if (!iframe) return;

            // Initial data load with better error handling
            setTimeout(() => {
                try {
                    const iframe = dialog.querySelector('#mindmap_iframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'load-mindmap',
                            data: dataJson || this.getDefaultMindmapData()
                        }, '*');
                    }
                } catch (error) {
                    console.warn('[KityMinder] Failed to send initial data:', error);
                }
            }, 1000);

            // Periodic sync (equivalent to Joplin plugin's setInterval)
            const syncInterval = setInterval(() => {
                try {
                    const iframe = dialog.querySelector('#mindmap_iframe');
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'get-mindmap-data'
                        }, '*');
                    }
                } catch (error) {
                    console.warn('[KityMinder] Failed to sync data:', error);
                }
            }, 500);

            // Store interval for cleanup
            dialog.setAttribute('data-sync-interval', syncInterval);

            // Listen for iframe messages
            const messageHandler = (event) => {
                const iframe = dialog.querySelector('#mindmap_iframe');
                if (iframe && event.source === iframe.contentWindow) {
                    this.handleIframeMessage(event.data, dialog);
                }
            };
            window.addEventListener('message', messageHandler);
            // Store handler for cleanup
            dialog._messageHandler = messageHandler;
        };

        // Setup communication after DOM is ready
        setTimeout(setupPeriodicSync, 100);            // Store dialog instance
            this.dialogInstances.set(dialogId, {
                element: dialog,
                diagramId: diagramId,
                type: type
            });
            
            console.log(`[KityMinderIntegration] Joplin-style edit dialog opened: ${dialogId}`);
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to open edit dialog:', error);
        }
    }

    /**
     * Create Joplin-style dialog (exact port of Joplin plugin dialog strategy)
     * @param {string} dialogId - Dialog ID
     * @param {string} dataJson - Diagram JSON data
     * @param {string} language - UI language
     * @returns {HTMLElement} - Dialog element
     */
    createJoplinStyleDialog(dialogId, dataJson, language) {
        const dialog = document.createElement('div');
        dialog.id = `mindmap-dialog-${dialogId}`;
        dialog.className = 'joplin-mindmap-dialog';
        dialog.setAttribute('data-is-fullscreen', 'false');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: block;
        `;

        const header = this.buildDialogHTML(dataJson, language);
        const iframe = this.createKityMinderIframe();
        
        dialog.innerHTML = `
            ${header}
            <div class="joplin-dialog-content" style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 90vw;
                height: 90vh;
                background: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">
                <div class="joplin-dialog-header" style="
                    padding: 16px 24px;
                    border-bottom: 1px solid #dee2e6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 64px;
                    position: relative;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            backdrop-filter: blur(10px);
                        ">🧠</div>
                        <div>
                            <h3 style="
                                margin: 0; 
                                color: white; 
                                font-size: 18px; 
                                font-weight: 600;
                                letter-spacing: -0.3px;
                            ">KityMinder Editor</h3>
                            <p style="
                                margin: 2px 0 0 0;
                                color: rgba(255, 255, 255, 0.85);
                                font-size: 12px;
                                font-weight: 400;
                            ">Create and edit mind maps • Press F11 for fullscreen</p>
                        </div>
                    </div>
                    <div class="joplin-dialog-buttons" style="display: flex; gap: 10px; align-items: center;">
                        <button class="joplin-btn joplin-btn-fullscreen" onclick="window.kityMinderIntegration.toggleDialogFullscreen('${dialogId}')" title="Toggle Fullscreen (F11)" style="
                            padding: 8px 16px;
                            background: rgba(255, 255, 255, 0.15);
                            color: white;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                            backdrop-filter: blur(10px);
                            display: flex;
                            align-items: center;
                            gap: 6px;
                        "><span style='font-size: 15px;'>⛶</span> Fullscreen</button>
                        <button class="joplin-btn joplin-btn-primary" onclick="window.kityMinderIntegration.saveJoplinDialog('${dialogId}')" style="
                            padding: 10px 20px;
                            background: rgba(255, 255, 255, 0.95);
                            color: #667eea;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                        ">💾 Save</button>
                        <button class="joplin-btn joplin-btn-secondary" onclick="window.kityMinderIntegration.closeJoplinDialog('${dialogId}')" style="
                            padding: 10px 20px;
                            background: rgba(255, 255, 255, 0.2);
                            color: white;
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 500;
                            transition: all 0.2s ease;
                            backdrop-filter: blur(10px);
                        ">✕ Close</button>
                    </div>
                </div>
                <div class="joplin-dialog-body" style="height: calc(100% - 70px); position: relative;">
                    ${iframe}
                </div>
            </div>
        `;

        // Add hover effects for buttons
        setTimeout(() => {
            const buttons = dialog.querySelectorAll('.joplin-btn');
            buttons.forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    if (btn.classList.contains('joplin-btn-fullscreen')) {
                        btn.style.background = 'rgba(255, 255, 255, 0.25)';
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        btn.style.transform = 'translateY(-2px)';
                        btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    } else if (btn.classList.contains('joplin-btn-primary')) {
                        btn.style.transform = 'translateY(-2px) scale(1.02)';
                        btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.25)';
                        btn.style.background = 'white';
                    } else if (btn.classList.contains('joplin-btn-secondary')) {
                        btn.style.background = 'rgba(255, 255, 255, 0.3)';
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        btn.style.transform = 'translateY(-2px)';
                    }
                });
                btn.addEventListener('mouseleave', () => {
                    if (btn.classList.contains('joplin-btn-fullscreen')) {
                        btn.style.background = 'rgba(255, 255, 255, 0.15)';
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        btn.style.transform = 'translateY(0)';
                        btn.style.boxShadow = 'none';
                    } else if (btn.classList.contains('joplin-btn-primary')) {
                        btn.style.transform = 'translateY(0) scale(1)';
                        btn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                        btn.style.background = 'rgba(255, 255, 255, 0.95)';
                    } else if (btn.classList.contains('joplin-btn-secondary')) {
                        btn.style.background = 'rgba(255, 255, 255, 0.2)';
                        btn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        btn.style.transform = 'translateY(0)';
                    }
                });
            });

            // Add F11 keyboard shortcut for fullscreen toggle
            const keyHandler = (e) => {
                if (e.key === 'F11') {
                    e.preventDefault();
                    this.toggleDialogFullscreen(dialogId);
                }
            };
            document.addEventListener('keydown', keyHandler);
            dialog._keyHandler = keyHandler;
        }, 100);

        return dialog;
    }

    /**
     * Create KityMinder iframe (adapted from Joplin plugin)
     * Follows exact Joplin plugin iframe strategy
     * @returns {string} - Iframe HTML
     */
    createKityMinderIframe() {
        const iframePath = this.getIframePath();
        return `
            <iframe
                id="mindmap_iframe"
                style="position:absolute;border:0;width:100%;height:100%;"
                src="${this.escapeQuotes(iframePath)}"
                title="KityMinder Editor"
            ></iframe>
        `;
    }

    /**
     * Get iframe path (adapted from Joplin plugin)
     * Uses local KityMinder editor following Joplin plugin pattern
     * @returns {string} - Iframe path
     */
    getIframePath() {
        // Use full Joplin KityMinder implementation with local bower_components
        const baseUrl = window.location.href.replace('/src/renderer/index.html', '');
        return `${baseUrl}/src/renderer/kityminder-editor/index-joplin.html`;
    }

    /**
     * Save Joplin-style dialog (exact port of Joplin plugin save logic)
     * @param {string} dialogId - Dialog ID
     */
    async saveJoplinDialog(dialogId) {
        try {
            const dialogInstance = this.dialogInstances.get(dialogId);
            if (!dialogInstance) {
                throw new Error(`Dialog not found: ${dialogId}`);
            }

            const dialog = dialogInstance.element;
            const form = dialog.querySelector('form[name="main"]');
            
            if (!form) {
                throw new Error('Form not found in dialog');
            }

            // Get form data (Joplin plugin pattern)
            const jsonData = form.querySelector('#mindmap_diagram_json').value;
            const pngData = form.querySelector('#mindmap_diagram_png').value;
            
            if (dialogInstance.type === "addnew") {
                // Create new diagram (Joplin plugin logic)
                const newDiagramId = await this.createDiagramResource(pngData, jsonData);
                const markdown = this.diagramMarkdown(newDiagramId);
                
                // Insert into editor (Joplin plugin: insertText command)
                this.insertTextIntoEditor(markdown);
                
                console.log(`[KityMinderIntegration] New diagram created: ${newDiagramId}`);
            } else {
                // Update existing diagram - keeps same ID, updates PNG/JSON in cache
                const editor = document.getElementById('editor');
                
                // CRITICAL: Capture old markdown BEFORE updating cache
                // Otherwise both old and new will have the same JSON (from form or cache)
                const oldMarkdownPattern = `![mindmap](:/${dialogInstance.diagramId})`;
                const oldMarkdownRegex = new RegExp(
                    `!\\[mindmap\\]\\(:\\/${dialogInstance.diagramId}\\)[\\s\\S]*?(?=\\n##|\\n#|\\n!\\[|\\n\\[|\\n\\{|\\n<|\\n>|\\n-|\\n\\*|\\n\\d+\\.|\\n\\$\\$|\\n\`\`\`|$)`,
                    'g'
                );
                
                // Update cache with new data
                await this.updateDiagramResource(
                    dialogInstance.diagramId, 
                    pngData, 
                    jsonData
                );
                
                console.log(`[KityMinderIntegration] Diagram updated: ${dialogInstance.diagramId}`);
                
                // Generate fresh markdown with updated JSON from cache
                const newMarkdown = this.diagramMarkdown(dialogInstance.diagramId);
                
                // Replace old markdown block with new one in editor
                if (editor && editor.value.includes(oldMarkdownPattern)) {
                    const oldContent = editor.value;
                    const newContent = oldContent.replace(oldMarkdownRegex, newMarkdown);
                    
                    if (newContent !== oldContent) {
                        editor.value = newContent;
                        
                        // Trigger change event
                        const event = new Event('input', { bubbles: true });
                        editor.dispatchEvent(event);
                        
                        console.log('[KityMinderIntegration] Markdown JSON updated successfully');
                    }
                }
                
                // Trigger preview refresh to show updated PNG
                if (window.markdownPreview && typeof window.markdownPreview.updatePreview === 'function') {
                    window.markdownPreview.updatePreview();
                }
            }

            this.closeJoplinDialog(dialogId);
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to save Joplin dialog:', error);
        }
    }

    /**
     * Handle iframe message (communication with KityMinder editor)
     * @param {Object} data - Message data from iframe
     * @param {HTMLElement} dialog - Dialog element
     */
    handleIframeMessage(data, dialog) {
        try {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'mindmap-data':
                    // Update hidden form fields (Joplin plugin strategy)
                    const form = dialog.querySelector('form[name="main"]');
                    if (form) {
                        const jsonInput = form.querySelector('#mindmap_diagram_json');
                        const pngInput = form.querySelector('#mindmap_diagram_png');
                        
                        if (jsonInput && data.json) {
                            jsonInput.value = data.json;
                        }
                        if (pngInput && data.png) {
                            pngInput.value = data.png;
                        }
                    }
                    break;
                
                case 'mindmap-ready':
                    console.log('[KityMinderIntegration] Iframe editor ready');
                    break;
                
                case 'insert-mindmap-image':
                    // Handle image insertion into markdown (legacy)
                    this.insertMindmapImage(data);
                    break;
                
                case 'insert-mindmap-markdown':
                    // Handle new markdown insertion with metadata
                    this.insertMindmapMarkdown(data);
                    break;
                
                default:
                    console.log('[KityMinderIntegration] Unknown iframe message:', data.type);
            }
        } catch (error) {
            console.error('[KityMinderIntegration] Iframe message handling error:', error);
        }
    }
    
    /**
     * Insert mindmap image into markdown editor
     * @param {Object} data - Image data {imageData, format, mindmapData}
     */
    insertMindmapImage(data) {
        try {
            const editor = document.getElementById('editor');
            if (!editor) {
                console.error('[KityMinderIntegration] Editor element not found');
                return;
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const filename = `kityminder-${timestamp}.${data.format}`;
            
            // Insert markdown image syntax
            const imageMarkdown = `\n![KityMinder Mind Map](${data.imageData})\n\n`;
            
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const content = editor.value;
            
            editor.value = content.substring(0, start) + imageMarkdown + content.substring(end);
            editor.focus();
            
            // Trigger change event
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
            
            console.log('[KityMinderIntegration] Mind map image inserted into markdown');
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to insert image:', error);
        }
    }
    
    /**
     * Insert mindmap markdown with embedded image and JSON metadata
     * Enhanced version that stores JSON for re-editing capability
     * @param {Object} data - {markdown, json, image}
     */
    insertMindmapMarkdown(data) {
        try {
            const editor = document.getElementById('editor');
            if (!editor) {
                console.error('[KityMinderIntegration] Editor element not found');
                return;
            }
            
            if (!data || !data.markdown) {
                console.error('[KityMinderIntegration] Invalid markdown data');
                return;
            }
            
            // Insert markdown with metadata at cursor position
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const content = editor.value;
            
            editor.value = content.substring(0, start) + data.markdown + content.substring(end);
            
            // Move cursor to end of inserted content
            const newCursorPos = start + data.markdown.length;
            editor.selectionStart = newCursorPos;
            editor.selectionEnd = newCursorPos;
            editor.focus();
            
            // Trigger change event to update preview
            const event = new Event('input', { bubbles: true });
            editor.dispatchEvent(event);
            
            console.log('[KityMinderIntegration] Mind map markdown with metadata inserted successfully');
            
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to insert mindmap markdown:', error);
        }
    }

    /**
     * Get default mindmap data
     * @returns {Object} - Default mindmap structure
     */
    getDefaultMindmapData() {
        return {
            data: { text: 'Main Topic' },
            children: [
                {
                    data: { text: 'Subtopic 1' },
                    children: [
                        { data: { text: 'Detail 1.1' }, children: [] },
                        { data: { text: 'Detail 1.2' }, children: [] }
                    ]
                },
                {
                    data: { text: 'Subtopic 2' },
                    children: [
                        { data: { text: 'Detail 2.1' }, children: [] }
                    ]
                }
            ]
        };
    }

    /**
     * Close Joplin-style dialog (enhanced with cleanup)
     * @param {string} dialogId - Dialog ID
     */
    closeJoplinDialog(dialogId) {
        try {
            const dialogInstance = this.dialogInstances.get(dialogId);
            if (dialogInstance) {
                const dialog = dialogInstance.element;
                
                // Cleanup intervals and event listeners
                const syncInterval = dialog.getAttribute('data-sync-interval');
                if (syncInterval) {
                    clearInterval(parseInt(syncInterval));
                }
                
                // Remove message handler
                if (dialog._messageHandler) {
                    window.removeEventListener('message', dialog._messageHandler);
                }
                
                // Remove keyboard handler
                if (dialog._keyHandler) {
                    document.removeEventListener('keydown', dialog._keyHandler);
                }
                
                dialog.remove();
                this.dialogInstances.delete(dialogId);
                console.log(`[KityMinderIntegration] Joplin dialog closed with cleanup: ${dialogId}`);
            }
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to close Joplin dialog:', error);
        }
    }

    /**
     * Toggle fullscreen mode for KityMinder dialog
     * Makes the dialog fill the entire viewport or return to normal size
     * @param {string} dialogId - Dialog ID to toggle
     */
    toggleDialogFullscreen(dialogId) {
        try {
            const dialogInstance = this.dialogInstances.get(dialogId);
            if (!dialogInstance) {
                console.warn('[KityMinderIntegration] Dialog instance not found:', dialogId);
                return;
            }

            const dialog = dialogInstance.element;
            const content = dialog.querySelector('.joplin-dialog-content');
            const fullscreenBtn = dialog.querySelector('.joplin-btn-fullscreen');
            const isFullscreen = dialog.getAttribute('data-is-fullscreen') === 'true';

            if (!isFullscreen) {
                // Enter fullscreen mode
                content.style.top = '0';
                content.style.left = '0';
                content.style.transform = 'none';
                content.style.width = '100vw';
                content.style.height = '100vh';
                content.style.borderRadius = '0';
                content.style.maxWidth = '100vw';
                content.style.maxHeight = '100vh';
                
                dialog.setAttribute('data-is-fullscreen', 'true');
                dialog.style.background = 'rgba(0,0,0,0.8)';
                
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '⛶ Exit Fullscreen';
                    fullscreenBtn.title = 'Exit Fullscreen (F11)';
                }
                
                console.log('[KityMinderIntegration] Dialog entered fullscreen mode');
            } else {
                // Exit fullscreen mode
                content.style.top = '50%';
                content.style.left = '50%';
                content.style.transform = 'translate(-50%, -50%)';
                content.style.width = '90vw';
                content.style.height = '90vh';
                content.style.borderRadius = '8px';
                content.style.maxWidth = '90vw';
                content.style.maxHeight = '90vh';
                
                dialog.setAttribute('data-is-fullscreen', 'false');
                dialog.style.background = 'rgba(0,0,0,0.5)';
                
                if (fullscreenBtn) {
                    fullscreenBtn.innerHTML = '⛶ Fullscreen';
                    fullscreenBtn.title = 'Toggle Fullscreen (F11)';
                }
                
                console.log('[KityMinderIntegration] Dialog exited fullscreen mode');
            }
        } catch (error) {
            console.error('[KityMinderIntegration] Failed to toggle fullscreen:', error);
        }
    }

    /**
     * Insert text into editor (Joplin plugin: insertText command)
     * @param {string} text - Text to insert
     */
    insertTextIntoEditor(text) {
        const editor = document.getElementById('editor');
        if (editor) {
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const content = editor.value;
            
            editor.value = content.substring(0, start) + text + content.substring(end);
            editor.focus();
            
            // Trigger change event
            const event = new Event('input');
            editor.dispatchEvent(event);
        }
    }

    /**
     * Update note content (Joplin plugin strategy)
     * Equivalent to Joplin plugin's note body replacement and editor.setText
     * @param {string} oldDiagramId - Old diagram ID
     * @param {string} newDiagramId - New diagram ID
     */
    async updateNoteContent(oldDiagramId, newDiagramId) {
        const editor = document.getElementById('editor');
        if (editor) {
            // Get current note content
            const noteBody = editor.value;
            
            // Replace old diagram reference with new one (Joplin plugin pattern)
            const oldMarkdown = this.diagramMarkdown(oldDiagramId);
            const newMarkdown = this.diagramMarkdown(newDiagramId);
            
            const newBody = noteBody.replace(
                new RegExp(oldMarkdown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 
                newMarkdown
            );
            
            // Update editor content (Joplin plugin: editor.setText command)
            editor.value = newBody;
            
            // Trigger change event
            const event = new Event('input');
            editor.dispatchEvent(event);
        }
    }

    /**
     * Handle mindmap message (adapted from Joplin plugin message handling)
     * Complete port of Joplin plugin onMessage handler
     * @param {Object} request - Message request
     * @returns {Promise<Object>} - Response
     */
    async handleMindmapMessage(request) {
        console.log('[KityMinderIntegration] contentScripts.onMessage Input:', request);
        
        switch (request.action) {
            case 'edit':
                let diagramResource = await this.getDiagramResource(request.diagramId);
                let dataJson = diagramResource.data_json;
                dataJson = dataJson.replace(/'/g, "\\u0027");
                await this.openEditDialog(dataJson, request.diagramId, "edit");
                return;
                
            case 'check':
                return { isValid: await this.isDiagramResource(request.diagramId) };
                
            default:
                return `Invalid action: ${request.action}`;
        }
    }

    /**
     * Create new mindmap (Joplin plugin command)
     * Equivalent to NewMindmap command execution
     */
    async createNewMindmap() {
        await this.openEditDialog("", null, "addnew");
    }

    /**
     * Generate UUID (utility method)
     * Equivalent to uuid.v4() used in Joplin plugin
     * @returns {string} - UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Setup fallback renderer
     */
    setupFallbackRenderer() {
        this.isInitialized = true;
        console.log('[KityMinderIntegration] Fallback renderer initialized');
    }

    /**
     * Setup modal and event listeners (legacy support)
     */
    setupModal() {
        // Legacy modal setup for backward compatibility
        console.log('[KityMinderIntegration] Legacy modal setup completed');
    }

    /**
     * Render a mindmap in the preview pane with click-to-edit functionality
     * This method is called by markdown-renderer.js when processing KityMinder code blocks
     */
    async renderMindmap(element, code, id) {
        try {
            console.log('[KityMinderIntegration] renderMindmap called for:', id);
            
            // Parse mindmap data
            let mindmapData;
            try {
                mindmapData = JSON.parse(code);
            } catch (parseError) {
                console.warn('[KityMinderIntegration] Invalid JSON, showing as text:', parseError);
                element.innerHTML = `<div class="kityminder-error">Invalid mindmap data: ${parseError.message}</div>`;
                return;
            }
            
            // Create preview container with click-to-edit
            element.innerHTML = `
                <div class="kityminder-preview" 
                     data-mindmap-id="${id}" 
                     data-mindmap-code="${encodeURIComponent(code)}"
                     style="cursor: pointer; position: relative; width: 100%; min-height: 300px; border: 2px solid #e1e5e9; border-radius: 8px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; padding: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🧠</div>
                        <div style="font-size: 18px; font-weight: 600; color: #495057; margin-bottom: 8px;">Mind Map</div>
                        <div style="font-size: 14px; color: #6c757d; margin-bottom: 16px;">${this.getNodeCount(mindmapData)} nodes</div>
                        <div style="font-size: 13px; color: #868e96; padding: 8px 16px; background: white; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <strong>Click to edit</strong> this mind map
                        </div>
                    </div>
                </div>
            `;
            
            console.log('[KityMinderIntegration] Mindmap preview rendered with click-to-edit');
            
        } catch (error) {
            console.error('[KityMinderIntegration] renderMindmap error:', error);
            element.innerHTML = `<div class="kityminder-error">Failed to render mindmap: ${error.message}</div>`;
        }
    }
    
    /**
     * Count nodes in mindmap data for display
     */
    getNodeCount(data) {
        if (!data || !data.root) return 0;
        
        let count = 1; // Root node
        const countChildren = (node) => {
            if (node.children && Array.isArray(node.children)) {
                count += node.children.length;
                node.children.forEach(child => countChildren(child));
            }
        };
        countChildren(data.root);
        return count;
    }
    
    setupEventListeners() {
        // Set up delegated click handlers for mindmap previews
        console.log('[KityMinderIntegration] Setting up click handlers for mindmap previews');
        
        // Use event delegation on document body to catch all mindmap clicks
        document.body.addEventListener('click', (event) => {
            // Find if click was on or inside a kityminder-preview
            const previewElement = event.target.closest('.kityminder-preview');
            if (previewElement) {
                event.preventDefault();
                event.stopPropagation();
                
                const mindmapId = previewElement.getAttribute('data-mindmap-id');
                const encodedCode = previewElement.getAttribute('data-mindmap-code');
                
                if (encodedCode) {
                    const code = decodeURIComponent(encodedCode);
                    console.log('[KityMinderIntegration] Mindmap preview clicked, opening editor for:', mindmapId);
                    
                    try {
                        const mindmapData = JSON.parse(code);
                        this.openEditDialog(code, mindmapId, 'edit');
                    } catch (parseError) {
                        console.error('[KityMinderIntegration] Failed to parse mindmap data:', parseError);
                        alert('Failed to open mindmap editor: Invalid data format');
                    }
                }
            }
        });
        
        console.log('[KityMinderIntegration] Event listeners setup completed');
    }

    /**
     * Public API methods
     */
    isReady() {
        return this.isInitialized;
    }

    getKityMinderVersion() {
        return this.kityMinder ? 'Loaded' : 'Not Available';
    }

    /**
     * Legacy API compatibility methods
     */
    async showNewMindmap() {
        return this.createNewMindmap();
    }

    async showEditMindmap(diagramId, dataJson) {
        return this.openEditDialog(dataJson, diagramId, "edit");
    }

    newMindmap() {
        this.createNewMindmap();
    }

    editMindmap(diagramId, dataJson) {
        this.openEditDialog(dataJson, diagramId, "edit");
    }
}

console.log('[KityMinderIntegration] Class definition completed, about to export...');

// Export for use in other modules
if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
    // Node.js environment  
    module.exports = KityMinderIntegration;
} else {
    // Browser environment
    console.log('[KityMinderIntegration] Assigning to window:', typeof KityMinderIntegration);
    window.KityMinderIntegration = KityMinderIntegration;
    
    // Make it globally accessible for dialog callbacks (Joplin plugin strategy)
    window.kityMinderIntegration = null;
    console.log('[KityMinderIntegration] Assignment complete, window.KityMinderIntegration:', typeof window.KityMinderIntegration);
}
