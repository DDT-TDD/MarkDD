/**
 * Enhanced Markmap Integration following markmap-vscode patterns
 * Implements modern markmap-lib and markmap-view integration
 * Based on markmap-master and markmap-vscode-master Reference implementations
 */
class MarkmapIntegration {
    constructor() {
        this.markmap = null;
        this.transformer = null;
        this.markmapInstance = null;
        this.modal = null;
        this.container = null;
        this.currentSvg = null;
        this.isInitialized = false;
        
        // Modern markmap configuration from VSCode extension
        this.globalOptions = {
            autoFit: true,
            duration: 500,
            embedAssets: false,
            maxWidth: 0,
            pan: true,
            zoom: true,
            color: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'],
            colorFreezeLevel: 2
        };
        
        this.init();
    }

    async init() {
        try {
            // Load modern markmap libraries using VSCode extension pattern
            await this.loadMarkmapLibraries();
            
            // Initialize transformer with built-in plugins
            this.setupTransformer();
            
            // Setup UI components
            this.setupModal();
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('[MarkmapIntegration] Modern markmap integration initialized');
        } catch (error) {
            console.error('[MarkmapIntegration] Failed to initialize Markmap:', error);
            this.setupFallback();
        }
    }

    /**
     * Load markmap libraries using modern ESM/UMD pattern from markmap-vscode
     */
    async loadMarkmapLibraries() {
        // Check if libraries are already loaded
        if (window.markmap) {
            console.log('[MarkmapIntegration] Libraries already available');
            this.setupMarkmapGlobals();
            return;
        }

        // Load D3 v7 (required for modern markmap)
        if (!window.d3) {
            console.log('[MarkmapIntegration] Loading D3 v7...');
            await this.loadScript('https://d3js.org/d3.v7.min.js');
            if (!window.d3) {
                throw new Error('Failed to load D3 library');
            }
        }

        try {
            // Modern approach: Load markmap libraries separately (VSCode extension pattern)
            console.log('[MarkmapIntegration] Loading markmap-lib...');
            await this.loadScript('https://cdn.jsdelivr.net/npm/markmap-lib@0.15.3/dist/index.min.js');
            
            console.log('[MarkmapIntegration] Loading markmap-view...');
            await this.loadScript('https://cdn.jsdelivr.net/npm/markmap-view@0.15.3/dist/index.min.js');
            
            console.log('[MarkmapIntegration] Loading markmap-toolbar...');
            await this.loadScript('https://cdn.jsdelivr.net/npm/markmap-toolbar@0.15.3/dist/index.min.js');
            
            await this.waitForMarkmap();
            
        } catch (error) {
            console.warn('[MarkmapIntegration] Modern libraries failed, trying legacy approach...');
            
            // Fallback to autoloader
            await this.loadScript('https://cdn.jsdelivr.net/npm/markmap-autoloader@0.15.3');
            await this.waitForMarkmap();
        }

        this.setupMarkmapGlobals();
    }

    /**
     * Setup transformer with built-in plugins (VSCode extension pattern)
     */
    setupTransformer() {
        if (!window.markmap || !window.markmap.Transformer) {
            console.warn('[MarkmapIntegration] Transformer not available, using fallback');
            return;
        }

        try {
            // Initialize transformer with built-in plugins (VSCode extension pattern)
            const plugins = [];
            
            // Add built-in plugins if available
            if (window.markmap.builtInPlugins) {
                plugins.push(...window.markmap.builtInPlugins);
            }
            
            this.transformer = new window.markmap.Transformer(plugins);
            console.log('[MarkmapIntegration] Transformer initialized with plugins:', plugins.length);
            
        } catch (error) {
            console.warn('[MarkmapIntegration] Failed to setup transformer:', error);
            // Create basic transformer
            this.transformer = {
                transform: (markdown) => this.basicTransform(markdown)
            };
        }
    }

    /**
     * Basic markdown transform fallback
     */
    basicTransform(markdown) {
        const lines = markdown.split('\n');
        const root = { depth: 0, content: 'Root', children: [] };
        const stack = [root];
        
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) {
                const depth = match[1].length;
                const content = match[2].trim();
                
                // Adjust stack to current depth
                while (stack.length > depth) {
                    stack.pop();
                }
                
                const node = { depth, content, children: [] };
                const parent = stack[stack.length - 1];
                parent.children.push(node);
                stack.push(node);
            }
        }
        
        return {
            root: root.children.length > 0 ? root.children[0] : root,
            features: [],
            frontmatter: {}
        };
    }

    setupMarkmapGlobals() {
        // Ensure consistent markmap global object (VSCode extension pattern)
        if (!window.markmap) {
            window.markmap = {};
        }
        
        // Map modern markmap structure
        if (window.markmapLib) {
            window.markmap.Transformer = window.markmapLib.Transformer;
            window.markmap.builtInPlugins = window.markmapLib.builtInPlugins;
            window.markmap.transform = window.markmapLib.transform;
        }
        
        if (window.markmapView) {
            window.markmap.Markmap = window.markmapView.Markmap;
        }
        
        if (window.markmapToolbar) {
            window.markmap.Toolbar = window.markmapToolbar.Toolbar;
        }
        
        this.markmap = window.markmap;
        console.log('[MarkmapIntegration] Modern global setup complete:', {
            hasMarkmap: !!window.markmap,
            hasTransformer: !!(window.markmap && window.markmap.Transformer),
            hasMarkmapClass: !!(window.markmap && window.markmap.Markmap),
            hasToolbar: !!(window.markmap && window.markmap.Toolbar),
            hasD3: !!window.d3
        });
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    waitForMarkmap() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds timeout
            
            const checkMarkmap = () => {
                attempts++;
                
                if (window.markmap || window.Markmap || window.transform || (window.markmapLib && window.markmapView)) {
                    console.log('[Markmap] Libraries detected after', attempts, 'attempts');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('[Markmap] Timeout waiting for libraries');
                    reject(new Error('Timeout waiting for markmap libraries'));
                } else {
                    setTimeout(checkMarkmap, 100);
                }
            };
            
            checkMarkmap();
        });
    }

    setupModal() {
        this.modal = document.getElementById('markmap-modal');
        this.container = document.getElementById('markmap-container');
        
        if (!this.modal || !this.container) {
            console.error('Markmap modal elements not found');
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

        // Listen for menu events
        document.addEventListener('menu-show-markmap', () => {
            this.showMarkmapFromEditor();
        });

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
            console.error('Error showing markmap from editor:', error);
            this.showMarkmapError(error.message);
        }
    }

    /**
     * Enhanced markmap rendering using VSCode extension patterns
     */
    async showMarkmap(markdown) {
        try {
            if (!this.isInitialized) {
                throw new Error('Markmap integration not initialized');
            }

            // Transform markdown using modern transformer (VSCode extension pattern)
            let transformResult;
            if (this.transformer && this.transformer.transform) {
                transformResult = this.transformer.transform(markdown);
            } else if (this.markmap && this.markmap.transform) {
                transformResult = this.markmap.transform(markdown);
            } else {
                transformResult = this.basicTransform(markdown);
            }
            
            const { root, features, frontmatter } = transformResult;
            
            if (!root || (!root.children && !root.content)) {
                this.showEmptyMarkmap();
                return;
            }

            // Merge options with frontmatter (VSCode extension pattern)
            const jsonOptions = {
                ...this.globalOptions,
                ...(frontmatter?.markmap || {})
            };

            // Show modal and render
            this.modal.style.display = 'block';
            this.clearContainer();
            
            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.width = '100%';
            svg.style.height = '100%';
            this.container.appendChild(svg);
            
            // Initialize Markmap instance (VSCode extension pattern)
            if (this.markmap && this.markmap.Markmap) {
                this.markmapInstance = window.markmap.Markmap.create(svg, jsonOptions, root);
                
                // Add toolbar if available (VSCode extension pattern)
                this.addToolbar();
                
                console.log('[MarkmapIntegration] Modern markmap rendered successfully');
            } else {
                // Fallback to D3-based rendering
                this.renderWithD3(svg, root, jsonOptions);
            }
            
            this.currentSvg = svg;
            
        } catch (error) {
            console.error('[MarkmapIntegration] Error showing markmap:', error);
            this.showMarkmapError(error.message);
        }
    }

    /**
     * Add toolbar following VSCode extension pattern
     */
    addToolbar() {
        try {
            if (!this.markmap.Toolbar || !this.markmapInstance) return;
            
            // Remove existing toolbar
            const existingToolbar = this.container.querySelector('.mm-toolbar');
            if (existingToolbar) {
                existingToolbar.remove();
            }
            
            // Create toolbar (VSCode extension pattern)
            const { el } = this.markmap.Toolbar.create(this.markmapInstance);
            el.setAttribute('style', 'position:absolute;bottom:20px;right:20px;z-index:1000;');
            el.className = 'mm-toolbar';
            this.container.appendChild(el);
            
            console.log('[MarkmapIntegration] Toolbar added');
            
        } catch (error) {
            console.warn('[MarkmapIntegration] Failed to add toolbar:', error);
        }
    }

    /**
     * Enhanced D3 fallback rendering
     */
    renderWithD3(svg, root, options) {
        try {
            const d3Svg = window.d3.select(svg);
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            
            d3Svg.attr('viewBox', `0 0 ${width} ${height}`);
            
            // Create zoom behavior
            const zoom = window.d3.zoom()
                .scaleExtent([0.1, 3])
                .on('zoom', (event) => {
                    mainGroup.attr('transform', event.transform);
                });
            
            d3Svg.call(zoom);
            
            const mainGroup = d3Svg.append('g').attr('class', 'mm-main');
            
            // Create tree layout
            const treeLayout = window.d3.tree().size([height - 100, width - 200]);
            const hierarchy = window.d3.hierarchy(root);
            treeLayout(hierarchy);
            
            // Render links
            const linkGenerator = window.d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x);
            
            mainGroup.selectAll('.mm-link')
                .data(hierarchy.links())
                .enter()
                .append('path')
                .attr('class', 'mm-link')
                .attr('d', linkGenerator)
                .attr('fill', 'none')
                .attr('stroke', '#ccc')
                .attr('stroke-width', 2);
            
            // Render nodes
            const nodes = mainGroup.selectAll('.mm-node')
                .data(hierarchy.descendants())
                .enter()
                .append('g')
                .attr('class', 'mm-node')
                .attr('transform', d => `translate(${d.y + 100},${d.x + 50})`);
            
            // Add node circles with colors
            nodes.append('circle')
                .attr('r', 8)
                .attr('fill', (d, i) => options.color[i % options.color.length])
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
            
            // Add node labels
            nodes.append('text')
                .attr('dy', '0.31em')
                .attr('x', d => d.children ? -12 : 12)
                .attr('text-anchor', d => d.children ? 'end' : 'start')
                .text(d => d.data.content || d.data.v || 'Node')
                .style('font-size', '12px')
                .style('fill', '#333')
                .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
            
            // Initial transform to center
            const initialTransform = window.d3.zoomIdentity
                .translate(50, height / 2)
                .scale(0.8);
            
            d3Svg.call(zoom.transform, initialTransform);
            
            console.log('[MarkmapIntegration] D3 fallback rendered successfully');
            
        } catch (error) {
            console.error('[MarkmapIntegration] D3 rendering error:', error);
            throw error;
        }
    }

    /**
     * Update inline markmaps in preview (following VSCode extension pattern)
     */
    async updateInlineMarkmaps(content) {
        if (!this.isInitialized) return;
        
        try {
            // Find all markmap elements in preview
            const previewContainer = document.getElementById('preview');
            if (!previewContainer) return;
            
            const markmapElements = previewContainer.querySelectorAll('[data-markmap-content]');
            
            for (const element of markmapElements) {
                const markdown = element.getAttribute('data-markmap-content');
                if (!markdown) continue;
                
                try {
                    const { root } = this.transformer ? 
                        this.transformer.transform(markdown) : 
                        this.basicTransform(markdown);
                    
                    // Clear and recreate SVG
                    element.innerHTML = '';
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.style.width = '100%';
                    svg.style.height = '400px';
                    svg.style.border = '1px solid #e1e5e9';
                    element.appendChild(svg);
                    
                    // Render inline markmap
                    if (this.markmap && this.markmap.Markmap) {
                        window.markmap.Markmap.create(svg, this.globalOptions, root);
                    } else {
                        this.renderWithD3(svg, root, this.globalOptions);
                    }
                    
                } catch (error) {
                    console.warn('[MarkmapIntegration] Error updating inline markmap:', error);
                    element.innerHTML = `<div class="markmap-error">Error rendering markmap: ${error.message}</div>`;
                }
            }
            
        } catch (error) {
            console.error('[MarkmapIntegration] Error updating inline markmaps:', error);
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
        this.container.innerHTML = `
            <div class="markmap-error">
                <h3>Markmap Error</h3>
                <p>${message}</p>
                <p>Please check your markdown structure and try again.</p>
            </div>
        `;
        this.modal.style.display = 'block';
    }

    hideMarkmap() {
        this.modal.style.display = 'none';
        
        // Cleanup
        if (this.markmapInstance && this.markmapInstance.destroy) {
            this.markmapInstance.destroy();
        }
        
        this.currentSvg = null;
        this.markmapInstance = null;
    }

    addExportButtons() {
        // Check if buttons already exist
        if (this.container.querySelector('.markmap-export-buttons')) {
            return;
        }

        const exportDiv = document.createElement('div');
        exportDiv.className = 'markmap-export-buttons';
        exportDiv.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 1000;';
        exportDiv.innerHTML = `
            <button class="export-btn" id="export-markmap-svg">Export SVG</button>
            <button class="export-btn" id="export-markmap-png">Export PNG</button>
        `;

        this.container.appendChild(exportDiv);

        // Setup export handlers
        const svgBtn = document.getElementById('export-markmap-svg');
        const pngBtn = document.getElementById('export-markmap-png');

        if (svgBtn) {
            svgBtn.addEventListener('click', () => this.exportMarkmapAsSVG());
        }
        if (pngBtn) {
            pngBtn.addEventListener('click', () => this.exportMarkmapAsPNG());
        }
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
            console.error('SVG export error:', error);
        }
    }

    async exportMarkmapAsPNG() {
        try {
            if (!this.currentSvg) return;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const svgData = new XMLSerializer().serializeToString(this.currentSvg);
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'markmap.png';
                    link.click();
                    URL.revokeObjectURL(url);
                });
            };
            
            img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
        } catch (error) {
            console.error('PNG export error:', error);
        }
    }

    async renderInlineMarkmap(container, markdown, id) {
        try {
            if (!this.isInitialized) {
                throw new Error('Markmap library not loaded');
            }

            // Transform markdown using transformer
            let transformResult;
            if (this.transformer && this.transformer.transform) {
                transformResult = this.transformer.transform(markdown);
            } else if (this.markmap && this.markmap.transform) {
                transformResult = this.markmap.transform(markdown);
            } else {
                transformResult = this.basicTransform(markdown);
            }
            
            const { root } = transformResult;
            
            if (!root || (!root.children && !root.content)) {
                container.innerHTML = '<div class="markmap-empty">No content for markmap</div>';
                return;
            }

            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = id;
            svg.style.width = '100%';
            svg.style.height = '300px';
            svg.style.border = '1px solid #e1e5e9';
            svg.style.borderRadius = '4px';

            container.innerHTML = '';
            container.appendChild(svg);

            // Create markmap instance
            if (this.markmap && this.markmap.Markmap) {
                const mm = this.markmap.Markmap.create(svg, {
                    zoom: false,
                    pan: false,
                    colorFreezeLevel: 2,
                    duration: 300,
                    maxWidth: 200,
                    spacingHorizontal: 40,
                    spacingVertical: 3,
                    autoFit: true,
                    fitRatio: 0.9
                }, root);

                // Fit the markmap
                setTimeout(() => {
                    mm.fit();
                }, 100);
            } else {
                // Fallback to D3 rendering
                this.renderWithD3(svg, root, this.globalOptions);
            }

            container.classList.add('markmap-rendered');

        } catch (error) {
            throw new Error(`Failed to render inline markmap: ${error.message}`);
        }
    }

    // Public API methods
    createMarkmapFromMarkdown(markdown) {
        return this.showMarkmap(markdown);
    }

    toggleMarkmapModal() {
        if (this.modal && this.modal.style.display === 'block') {
            this.hideMarkmap();
        } else {
            this.showMarkmapFromEditor();
        }
    }

    isMarkmapVisible() {
        return this.modal && this.modal.style.display === 'block';
    }

    setupFallback() {
        console.warn('[MarkmapIntegration] Setting up fallback mode');
        this.isInitialized = true; // Allow basic functionality
    }

    clearContainer() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Utility methods
    extractHeadings(markdown) {
        const lines = markdown.split('\n');
        const headings = [];
        
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2],
                    line: index + 1
                });
            }
        });
        
        return headings;
    }

    generateMarkmapMarkdown(headings) {
        if (!headings || headings.length === 0) {
            return '# No Headings Found\n\nAdd some headings to your markdown to create a mind map.';
        }

        return headings.map(heading => {
            const prefix = '#'.repeat(heading.level);
            return `${prefix} ${heading.text}`;
        }).join('\n');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkmapIntegration;
} else {
    window.MarkmapIntegration = MarkmapIntegration;
}
