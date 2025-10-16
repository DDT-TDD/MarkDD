// Enhanced Markmap Integration - Based on markmap-vscode-master
// Provides robust Markmap rendering with proper error handling

console.log('[EnhancedMarkmapIntegration] Script loading...');

class EnhancedMarkmapIntegration {
    constructor() {
        this.markmap = null;
        this.transformer = null;
        this.modal = null;
        this.container = null;
        this.currentSvg = null;
        this.currentMarkmap = null;
        this.loadingPromise = null;
        
        // Don't initialize immediately - wait for libraries to load
        // this.init();
        console.log('[EnhancedMarkmapIntegration] Constructor completed successfully');
    }

    async init() {
        try {
            await this.loadMarkmapLibraries();
            this.setupModal();
            this.setupEventListeners();
            console.log('[EnhancedMarkmap] Markmap integration initialized');
        } catch (error) {
            console.error('[EnhancedMarkmap] Failed to initialize:', error);
        }
    }

    async loadMarkmapLibraries() {
        if (this.loadingPromise) return this.loadingPromise;
        
        this.loadingPromise = this.doLoadLibraries();
        return this.loadingPromise;
    }

    async doLoadLibraries() {
        // Check if libraries are already loaded
        if (window.markmap && window.d3) {
            this.markmap = window.markmap;
            return;
        }

        try {
            // Check if library loader has Markmap
            if (window.libraryLoader && window.libraryLoader.isLibraryLoaded('MarkmapLib') && window.libraryLoader.isLibraryLoaded('MarkmapView')) {
                console.log('[EnhancedMarkmap] Markmap already loaded by library loader');
                this.markmap = window.markmap;
                return;
            }
            
            // Load D3 first if not available
            if (!window.d3) {
                await this.loadScript('https://cdn.jsdelivr.net/npm/d3@7');
                console.log('[EnhancedMarkmap] D3 loaded');
            }

            // Load Markmap libraries
            if (!window.markmap) {
                await Promise.all([
                    this.loadScript('https://cdn.jsdelivr.net/npm/markmap-lib@0.15.3/dist/browser/index.js'),
                    this.loadScript('https://cdn.jsdelivr.net/npm/markmap-view@0.15.3/dist/browser/index.js')
                ]);
                
                // Wait for markmap to be available
                let attempts = 0;
                while (!window.markmap && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!window.markmap) {
                    throw new Error('Markmap failed to load after waiting');
                }
                
                console.log('[EnhancedMarkmap] Markmap libraries loaded');
            }

            this.markmap = window.markmap;
        } catch (error) {
            console.error('[EnhancedMarkmap] Library loading error:', error);
            throw error;
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupModal() {
        // Wait for DOM to be ready
        const waitForElements = () => {
            this.modal = document.getElementById('markmap-modal');
            this.container = document.getElementById('markmap-container');
            
            if (!this.modal || !this.container) {
                // Try again after a short delay
                setTimeout(waitForElements, 100);
                return;
            }
            
            this.setupModalHandlers();
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', waitForElements);
        } else {
            waitForElements();
        }
    }
    
    setupModalHandlers() {
        if (!this.modal || !this.container) {
            console.error('[EnhancedMarkmap] Modal elements not found');
            return;
        }

        // Setup close button
        const closeBtn = document.getElementById('markmap-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideMarkmap());
        }

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideMarkmap();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.hideMarkmap();
            }
        });
    }

    setupEventListeners() {
        // Listen for markmap button click
        const markmapBtn = document.getElementById('markmapBtn');
        if (markmapBtn) {
            markmapBtn.addEventListener('click', () => {
                this.showMarkmapFromEditor();
            });
        }

        // Listen for editor content changes to update inline markmaps
        document.addEventListener('editor-content-changed', (e) => {
            this.updateInlineMarkmaps(e.detail.content);
        });
    }

    async showMarkmapFromEditor() {
        try {
            const editorElement = document.getElementById('editor');
            if (!editorElement) return;

            const markdown = editorElement.value;
            if (!markdown.trim()) {
                this.showEmptyMarkmap();
                return;
            }

            await this.showMarkmap(markdown);
        } catch (error) {
            console.error('[EnhancedMarkmap] Error showing markmap:', error);
            this.showMarkmapError(error.message);
        }
    }

    async showMarkmap(markdown) {
        try {
            // Ensure we're initialized first
            if (!this.container) {
                await this.init();
                // Still no container after init? 
                if (!this.container) {
                    console.error('[EnhancedMarkmap] Container not available after init');
                    return;
                }
            }
            
            await this.loadMarkmapLibraries();
            
            if (!this.markmap) {
                throw new Error('Markmap library not available');
            }

            // Transform markdown using markmap-lib
            let transformer, root, features;
            
            try {
                if (this.markmap.Transformer) {
                    // Use proper markmap Transformer
                    const { Transformer } = this.markmap;
                    transformer = new Transformer();
                    ({ root, features } = transformer.transform(markdown));
                } else if (this.markmap.transform && typeof this.markmap.transform === 'function') {
                    // Use fallback transform function
                    const result = this.markmap.transform(markdown);
                    root = result.root || result;
                    features = result.features || {};
                } else {
                    throw new Error('No transformer available');
                }
            } catch (transformError) {
                console.error('[EnhancedMarkmap] Error creating markmap:', transformError);
                this.showMarkmapError(`Transform failed: ${transformError.message}`);
                return;
            }
            
            if (!root || !root.children || root.children.length === 0) {
                this.showEmptyMarkmap();
                return;
            }

            // Clear previous content
            this.container.innerHTML = '';
            
            // Create SVG element with better sizing
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.minHeight = '400px';
            this.container.appendChild(svg);

            // Create markmap instance with enhanced options
            const { Markmap } = this.markmap;
            const mm = Markmap.create(svg, {
                zoom: true,
                pan: true,
                colorFreezeLevel: 2,
                duration: 500,
                maxWidth: 300,
                spacingHorizontal: 80,
                spacingVertical: 8,
                autoFit: true,
                fitRatio: 0.9,
                paddingX: 8
            }, root);

            // Store references
            this.currentSvg = svg;
            this.currentMarkmap = mm;

            // Show modal
            this.modal.style.display = 'block';

            // Fit the markmap after modal is shown
            setTimeout(() => {
                mm.fit();
            }, 100);

            // Add export buttons
            this.addExportButtons();

        } catch (error) {
            console.error('[EnhancedMarkmap] Error creating markmap:', error);
            this.showMarkmapError(error.message);
        }
    }

    async updateInlineMarkmaps(markdown) {
        // Find inline markmap containers in the preview
        const previewElement = document.getElementById('preview');
        if (!previewElement) return;

        const inlineContainers = previewElement.querySelectorAll('.markmap-inline-container:not(.markmap-rendered)');
        
        for (const container of inlineContainers) {
            try {
                const markmapCode = decodeURIComponent(container.getAttribute('data-markmap-code'));
                const id = container.getAttribute('data-markmap-id');
                
                await this.renderInlineMarkmap(container, markmapCode, id);
            } catch (error) {
                console.error('[EnhancedMarkmap] Error rendering inline markmap:', error);
                if (container) {
                    container.innerHTML = `<div class="markmap-error">
                        <b>Markmap Error</b><br>${error.message}<br>
                        <small>Check your markdown structure or see <a href='https://markmap.js.org/' target='_blank'>Markmap Docs</a>.</small>
                        <details><summary>Show code</summary><pre><code>${markmapCode}</code></pre></details>
                    </div>`;
                    container.classList.add('markmap-error');
                } else {
                    console.error('[EnhancedMarkmap] Container not available for error display');
                }
            }
        }
    }

    async renderInlineMarkmap(container, markdown, id) {
        try {
            // Ensure container exists
            if (!container) {
                console.error('[EnhancedMarkmap] Container not available for inline markmap');
                return;
            }
            
            await this.loadMarkmapLibraries();
            
            if (!this.markmap) {
                throw new Error('Markmap library not available');
            }

            // Transform markdown with robust error handling and fallbacks
            let root;
            try {
                // Method 1: Try markmap.Transformer (most reliable)
                if (this.markmap.Transformer && typeof this.markmap.Transformer === 'function') {
                    const transformer = new this.markmap.Transformer();
                    const result = transformer.transform(markdown);
                    root = result.root;
                }
                // Method 2: Try markmap.transform function
                else if (this.markmap.transform && typeof this.markmap.transform === 'function') {
                    const result = this.markmap.transform(markdown);
                    root = result.root || result;
                }
                // Method 3: Try window.markmap globals
                else if (window.markmap && window.markmap.transform && typeof window.markmap.transform === 'function') {
                    const result = window.markmap.transform(markdown);
                    root = result.root || result;
                }
                // Method 4: Try direct global transform
                else if (window.transform && typeof window.transform === 'function') {
                    const result = window.transform(markdown);
                    root = result.root || result;
                }
                else {
                    throw new Error('No transformer available - markmap libraries may not be properly loaded');
                }
            } catch (transformError) {
                console.error('[EnhancedMarkmap] Transform error:', transformError);
                
                // Fallback: Create a simple hierarchical structure from markdown headers
                root = this.createFallbackMarkmapStructure(markdown);
                
                if (!root) {
                    throw new Error(`Transform failed: ${transformError.message}`);
                }
            }
            
            if (!root || (!root.children && !root.d) || (root.children && root.children.length === 0)) {
                if (container) {
                    container.innerHTML = '<div class="markmap-empty">No headings found for markmap</div>';
                    container.classList.add('markmap-rendered');
                }
                return;
            }

            // Create SVG element with enhanced attributes
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = id;
            svg.style.width = '100%';
            svg.style.height = '300px';
            svg.style.border = '1px solid #e1e5e9';
            svg.style.borderRadius = '4px';
            svg.style.backgroundColor = '#ffffff';
            svg.setAttribute('viewBox', '0 0 400 300');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            if (container) {
                container.innerHTML = '';
                container.appendChild(svg);
            } else {
                console.error('[EnhancedMarkmap] Container not available for SVG insertion');
                return;
            }

            // Create markmap instance with enhanced error handling using constructor
            try {
                let mm;
                
                // Method 1: Try markmap.Markmap constructor (new API)
                if (this.markmap && this.markmap.Markmap) {
                    mm = new this.markmap.Markmap(svg, {
                        zoom: false,
                        pan: false,
                        colorFreezeLevel: 3,
                        duration: 300,
                        maxWidth: 200,
                        spacingHorizontal: 40,
                        spacingVertical: 4,
                        autoFit: true,
                        fitRatio: 0.85,
                        paddingX: 8
                    });
                    // Set data after creation with new API
                    if (mm.setData && typeof mm.setData === 'function') {
                        mm.setData(root);
                    }
                }
                // Method 2: Try window.markmap.Markmap constructor
                else if (window.markmap && window.markmap.Markmap) {
                    mm = new window.markmap.Markmap(svg, {
                        zoom: false,
                        pan: false,
                        colorFreezeLevel: 3,
                        duration: 300,
                        maxWidth: 200,
                        spacingHorizontal: 40,
                        spacingVertical: 4,
                        autoFit: true,
                        fitRatio: 0.85,
                        paddingX: 8
                    });
                    // Set data after creation with new API
                    if (mm.setData && typeof mm.setData === 'function') {
                        mm.setData(root);
                    }
                }
                // Method 3: Try direct Markmap constructor
                else if (window.Markmap && typeof window.Markmap === 'function') {
                    mm = new window.Markmap(svg, {
                        zoom: false,
                        pan: false,
                        colorFreezeLevel: 3,
                        duration: 300,
                        maxWidth: 200,
                        spacingHorizontal: 40,
                        spacingVertical: 4,
                        autoFit: true,
                        fitRatio: 0.85,
                        paddingX: 8
                    });
                    if (mm.setData && typeof mm.setData === 'function') {
                        mm.setData(root);
                    }
                }
                else {
                    throw new Error('Markmap constructor not available');
                }

                // Fit the markmap after creation
                if (mm) {
                    setTimeout(() => {
                        try {
                            if (mm.fit && typeof mm.fit === 'function') {
                                mm.fit();
                            }
                        } catch (fitError) {
                            console.warn('[EnhancedMarkmap] Fit error (non-critical):', fitError);
                        }
                    }, 100);
                }
            } catch (renderError) {
                console.error('[EnhancedMarkmap] Render error:', renderError);
                
                // Fallback: Create a simple text-based representation
                if (container) {
                    container.innerHTML = `
                        <div class="markmap-fallback">
                            <div class="fallback-header">
                                <span class="diagram-type">Mind Map Structure</span>
                            </div>
                            <div class="fallback-content">
                                ${this.createTextBasedMindmap(markdown)}
                            </div>
                        </div>
                    `;
                    container.classList.add('markmap-fallback');
                }
                return;
            }

            if (container) {
                container.classList.add('markmap-rendered');
            }

        } catch (error) {
            console.error('[EnhancedMarkmap] Error in renderInlineMarkmap:', error);
            if (container) {
                container.innerHTML = `<div class="markmap-error">
                    <strong>Markmap Error:</strong> ${error.message}
                    <br><small>Check your markdown structure or see <a href='https://markmap.js.org/' target='_blank'>Markmap Docs</a>.</small>
                </div>`;
                container.classList.add('markmap-error');
            }
        }
    }

    showEmptyMarkmap() {
        this.container.innerHTML = `
            <div class="markmap-empty">
                <h3>No Content for Mind Map</h3>
                <p>Start writing markdown with headers to see your mind map visualization.</p>
                <div class="markmap-example">
                    <h4>Example:</h4>
                    <pre># Main Topic
## Subtopic 1
### Detail A
### Detail B
## Subtopic 2
### Detail C</pre>
                </div>
            </div>
        `;
        this.modal.style.display = 'block';
    }

    showMarkmapError(message) {
        // Ensure container exists before setting innerHTML
        if (!this.container) {
            console.error('[EnhancedMarkmap] Container not available for error display');
            return;
        }
        
        this.container.innerHTML = `
            <div class="markmap-error">
                <h3>Markmap Error</h3>
                <p>${message}</p>
                <p>Please check your markdown structure and try again.</p>
                <div class="error-help">
                    <h4>Common Issues:</h4>
                    <ul>
                        <li>Make sure you have at least one heading (#)</li>
                        <li>Check that headings are properly formatted</li>
                        <li>Verify that the markdown structure is valid</li>
                    </ul>
                </div>
            </div>
        `;
        
        if (this.modal) {
            this.modal.style.display = 'block';
        }
    }

    hideMarkmap() {
        this.modal.style.display = 'none';
        
        // Cleanup
        if (this.currentMarkmap && this.currentMarkmap.destroy) {
            this.currentMarkmap.destroy();
        }
        
        this.currentSvg = null;
        this.currentMarkmap = null;
    }

    addExportButtons() {
        // Check if buttons already exist
        if (this.container.querySelector('.markmap-export-buttons')) {
            return;
        }

        const exportDiv = document.createElement('div');
        exportDiv.className = 'markmap-export-buttons';
        exportDiv.innerHTML = `
            <button class="export-btn" id="export-markmap-svg">Export as SVG</button>
            <button class="export-btn" id="export-markmap-png">Export as PNG</button>
            <button class="export-btn" id="insert-markmap-markdown">Insert in Markdown</button>
        `;

        this.container.appendChild(exportDiv);

        // Setup export handlers
        document.getElementById('export-markmap-svg')?.addEventListener('click', () => {
            this.exportMarkmapAsSVG();
        });

        document.getElementById('export-markmap-png')?.addEventListener('click', () => {
            this.exportMarkmapAsPNG();
        });

        document.getElementById('insert-markmap-markdown')?.addEventListener('click', () => {
            this.insertMarkmapInMarkdown();
        });
    }

    async exportMarkmapAsSVG() {
        try {
            if (!this.currentSvg) return;

            const svgData = new XMLSerializer().serializeToString(this.currentSvg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'markmap.svg';
            link.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('[EnhancedMarkmap] SVG export error:', error);
        }
    }

    async exportMarkmapAsPNG() {
        try {
            if (!this.currentSvg) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rect = this.currentSvg.getBoundingClientRect();
            
            canvas.width = rect.width * 2; // Higher resolution
            canvas.height = rect.height * 2;
            
            const svgData = new XMLSerializer().serializeToString(this.currentSvg);
            const img = new Image();
            
            img.onload = () => {
                ctx.scale(2, 2);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'markmap.png';
                    link.click();
                    URL.revokeObjectURL(url);
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            console.error('[EnhancedMarkmap] PNG export error:', error);
        }
    }
    
    async insertMarkmapInMarkdown() {
        try {
            if (!this.currentSvg) {
                console.error('[EnhancedMarkmap] No SVG available for export');
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rect = this.currentSvg.getBoundingClientRect();
            
            canvas.width = rect.width * 2; // Higher resolution
            canvas.height = rect.height * 2;
            
            const svgData = new XMLSerializer().serializeToString(this.currentSvg);
            const img = new Image();
            
            img.onload = () => {
                ctx.scale(2, 2);
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, rect.width, rect.height);
                ctx.drawImage(img, 0, 0, rect.width, rect.height);
                
                const pngData = canvas.toDataURL('image/png');
                
                // Get editor element
                const editor = document.getElementById('editor');
                if (!editor) {
                    console.error('[EnhancedMarkmap] Editor element not found');
                    return;
                }
                
                // Generate unique filename
                const timestamp = Date.now();
                const imageMarkdown = `\n![Markmap Mind Map](${pngData})\n\n`;
                
                // Insert at cursor position
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                const content = editor.value;
                
                editor.value = content.substring(0, start) + imageMarkdown + content.substring(end);
                editor.focus();
                
                // Trigger change event
                const event = new Event('input', { bubbles: true });
                editor.dispatchEvent(event);
                
                console.log('[EnhancedMarkmap] Mind map image inserted into markdown');
                
                // Close modal after insertion
                this.hideMarkmap();
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            console.error('[EnhancedMarkmap] Failed to insert image:', error);
        }
    }

    // Public API methods
    async createMarkmapFromMarkdown(markdown) {
        return await this.showMarkmap(markdown);
    }

    toggleMarkmapModal() {
        if (this.modal.style.display === 'block') {
            this.hideMarkmap();
        } else {
            this.showMarkmapFromEditor();
        }
    }

    isMarkmapVisible() {
        return this.modal && this.modal.style.display === 'block';
    }

    // Helper methods for fallback functionality
    createFallbackMarkmapStructure(markdown) {
        try {
            const lines = markdown.split('\n');
            const headers = [];
            
            for (const line of lines) {
                const match = line.match(/^(#{1,6})\s+(.+)/);
                if (match) {
                    headers.push({
                        level: match[1].length,
                        text: match[2].trim()
                    });
                }
            }
            
            if (headers.length === 0) {
                return null;
            }
            
            // Build a simple hierarchical structure
            const root = { d: { v: 'Root' }, children: [] };
            const stack = [root];
            
            for (const header of headers) {
                // Find the appropriate parent level
                while (stack.length > header.level) {
                    stack.pop();
                }
                
                const node = { 
                    d: { v: header.text }, 
                    children: [] 
                };
                
                const parent = stack[stack.length - 1];
                if (!parent.children) {
                    parent.children = [];
                }
                parent.children.push(node);
                stack.push(node);
            }
            
            return root.children.length > 0 ? root : null;
        } catch (error) {
            console.error('[EnhancedMarkmap] Fallback structure creation failed:', error);
            return null;
        }
    }
    
    createTextBasedMindmap(markdown) {
        try {
            const lines = markdown.split('\n');
            let result = '<ul class="text-mindmap">';
            
            for (const line of lines) {
                const match = line.match(/^(#{1,6})\s+(.+)/);
                if (match) {
                    const level = match[1].length;
                    const text = match[2].trim();
                    const indent = '  '.repeat(level - 1);
                    result += `${indent}<li class="level-${level}">${text}</li>`;
                }
            }
            
            result += '</ul>';
            return result;
        } catch (error) {
            console.error('[EnhancedMarkmap] Text mindmap creation failed:', error);
            return '<p>Unable to create text-based mindmap</p>';
        }
    }

    /**
     * Show markmap creation dialog
     */
    async showMarkmapCreationDialog() {
        try {
            // Ensure libraries are loaded
            await this.loadMarkmapLibraries();
            
            // Use HTML dialog instead of prompt() (Electron doesn't support prompt)
            const markdown = await this.showHTMLInputDialog(
                'Create a new Markmap',
                'Enter markdown content with headers (#, ##, ###):',
                '# Main Topic\n## Subtopic 1\n### Detail 1\n## Subtopic 2',
                'Example:\n# Main Topic\n## Subtopic 1\n### Detail 1\n### Detail 2\n## Subtopic 2'
            );
            
            if (!markdown) {
                console.log('[EnhancedMarkmap] Markmap creation cancelled');
                return null;
            }
            
            // Show the markmap
            await this.showMarkmap(markdown);
            
            // Return the markdown for insertion into the document
            return `\`\`\`markmap\n${markdown}\n\`\`\``;
            
        } catch (error) {
            console.error('[EnhancedMarkmap] Creation dialog error:', error);
            alert('Failed to create markmap: ' + error.message);
            return null;
        }
    }

    /**
     * Show markmap editor for existing content
     */
    async showMarkmapEditDialog(currentMarkdown) {
        try {
            // Ensure libraries are loaded
            await this.loadMarkmapLibraries();
            
            // Extract markdown from code block if present
            let markdown = currentMarkdown;
            const codeBlockMatch = currentMarkdown.match(/```markmap\n([\s\S]*?)\n```/);
            if (codeBlockMatch) {
                markdown = codeBlockMatch[1];
            }
            
            // Use HTML dialog instead of prompt() (Electron doesn't support prompt)
            const newMarkdown = await this.showHTMLInputDialog(
                'Edit Markmap',
                'Update markdown content:',
                markdown
            );
            
            if (newMarkdown === null) {
                console.log('[EnhancedMarkmap] Markmap editing cancelled');
                return null;
            }
            
            // Show the updated markmap
            await this.showMarkmap(newMarkdown);
            
            // Return the updated markdown
            return `\`\`\`markmap\n${newMarkdown}\n\`\`\``;
            
        } catch (error) {
            console.error('[EnhancedMarkmap] Edit dialog error:', error);
            alert('Failed to edit markmap: ' + error.message);
            return null;
        }
    }

    /**
     * Show HTML input dialog (replacement for prompt() which doesn't work in Electron)
     */
    showHTMLInputDialog(title, label, defaultValue = '', helpText = '') {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
            `;
            
            // Create dialog
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; padding: 25px; border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 600px; width: 90%;
            `;
            
            dialog.innerHTML = `
                <h3 style="margin:0 0 15px 0; color: #333;">${title}</h3>
                ${helpText ? `<p style="margin:0 0 10px 0; color: #666; font-size: 12px;">${helpText}</p>` : ''}
                <label style="display: block; margin-bottom: 8px; color: #555;">${label}</label>
                <textarea id="dialog-input" style="width: 100%; min-height: 150px; padding: 10px; 
                    font-family: monospace; font-size: 13px; border: 1px solid #ccc; 
                    border-radius: 4px; resize: vertical;">${defaultValue}</textarea>
                <div style="margin-top: 20px; text-align: right;">
                    <button id="dialog-cancel" style="padding: 8px 20px; margin-right: 10px; 
                        background: #fff; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="dialog-ok" style="padding: 8px 20px; background: #007bff; 
                        color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
                </div>
            `;
            
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            
            const input = dialog.querySelector('#dialog-input');
            input.focus();
            input.select();
            
            // OK button
            dialog.querySelector('#dialog-ok').onclick = () => {
                const value = input.value.trim();
                document.body.removeChild(overlay);
                resolve(value || null);
            };
            
            // Cancel button
            dialog.querySelector('#dialog-cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };
            
            // ESC key
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    resolve(null);
                }
            });
        });
    }

    /**
     * Create a new markmap and insert into editor
     */
    async createNewMarkmap(editorInstance) {
        try {
            const markmapCode = await this.showMarkmapCreationDialog();
            
            if (!markmapCode || !editorInstance) {
                return;
            }
            
            // Insert into editor at cursor position
            const currentValue = editorInstance.getValue();
            const cursor = editorInstance.getCursor();
            const line = cursor.line;
            
            // Add newlines before and after
            const insertion = `\n\n${markmapCode}\n\n`;
            
            // Insert at cursor
            editorInstance.replaceRange(
                insertion,
                { line: line, ch: 0 }
            );
            
            console.log('[EnhancedMarkmap] Markmap inserted into editor');
            
            // Trigger preview update if available
            if (window.app && window.app.updatePreview) {
                window.app.updatePreview();
            }
            
        } catch (error) {
            console.error('[EnhancedMarkmap] Create and insert error:', error);
            alert('Failed to insert markmap: ' + error.message);
        }
    }
}

console.log('[EnhancedMarkmapIntegration] Class definition completed, about to export...');

// Export for use in other modules
if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = EnhancedMarkmapIntegration;
} else {
    // Browser environment
    console.log('[EnhancedMarkmapIntegration] Assigning to window:', typeof EnhancedMarkmapIntegration);
    window.EnhancedMarkmapIntegration = EnhancedMarkmapIntegration;
    console.log('[EnhancedMarkmapIntegration] Assignment complete, window.EnhancedMarkmapIntegration:', typeof window.EnhancedMarkmapIntegration);
}
