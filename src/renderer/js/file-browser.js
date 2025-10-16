class FileBrowser {
    // Open file dialog for menu/toolbar integration
    async openFileDialog() {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                // Ask main process to open file dialog and return file path/content
                const result = await ipcRenderer.invoke('open-file-dialog');
                if (result && result.filePath && result.content) {
                    // Open file in app (creates tab with filename)
                    if (window.markddApp) {
                        window.markddApp.openFile(result.filePath, result.content);
                    }
                }
                return result; // Return result for proper promise handling
            } catch (error) {
                console.error('Failed to open file:', error);
                throw error; // Re-throw for proper error handling
            }
        }
    }
    
    constructor() {
        this.currentPath = null;
        this.fileTree = null;
        this.isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        this.currentPanel = localStorage.getItem('sidebar-panel') || 'files';
        this.sidebarWidth = parseInt(localStorage.getItem('sidebar-width') || '280');
        
        this.init();
    }

    init() {
        this.setupElements();
        this.setupEventListeners();
        this.setupSplitter();
        this.applySidebarState();
        this.showPanel(this.currentPanel);
        this.updateAppVersion();
    }

    setupElements() {
        this.sidebar = document.getElementById('sidebar');
        this.sidebarSplitter = document.getElementById('sidebar-splitter');
        this.fileTreeElement = document.getElementById('file-tree');
        this.leftColumnIcons = document.querySelectorAll('.sidebar-icon[data-panel]');
        this.toggleButton = document.querySelector('.sidebar-toggle');
        this.newFileBtn = document.getElementById('newFileBtn');
        this.newFolderBtn = document.getElementById('newFolderBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.openFolderBtn = document.getElementById('openFolderBtn');
        this.addBookmarkBtn = document.getElementById('addBookmarkBtn');
        this.clearBookmarksBtn = document.getElementById('clearBookmarksBtn');

        // Settings panel elements
        this.themeSelect = document.getElementById('theme-select');
        this.fontSizeSlider = document.getElementById('font-size-slider');
        this.fontSizeDisplay = document.getElementById('font-size-display');

        console.log('[FileBrowser] Elements setup - Found', this.leftColumnIcons.length, 'sidebar icons');
        console.log('[FileBrowser] Sidebar element:', !!this.sidebar);
        console.log('[FileBrowser] Toggle button:', !!this.toggleButton);

        // Add test right-click functionality to sidebar icons for debugging
        this.leftColumnIcons.forEach((icon, index) => {
            const panel = icon.getAttribute('data-panel');
            console.log(`[FileBrowser] Icon ${index + 1}: ${panel} (${icon.title || 'no title'})`);
            
            // Add right-click test
            icon.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                console.log(`[FileBrowser] RIGHT-CLICK TEST: ${panel} icon`);
                this.showPanel(panel);
            });
        });
    }

    setupEventListeners() {
        // Left column icons - improved event handling
        this.leftColumnIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Get data-panel from the clicked element or its parent
                let panel = e.target.getAttribute('data-panel');
                if (!panel && e.target.parentElement) {
                    panel = e.target.parentElement.getAttribute('data-panel');
                }
                
                if (panel) {
                    console.log('[FileBrowser] Switching to panel:', panel);
                    this.showPanel(panel);
                } else {
                    console.warn('[FileBrowser] No panel data found for clicked element:', e.target);
                }
            });
        });

        // Toggle button
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Button events
        if (this.newFileBtn) {
            this.newFileBtn.addEventListener('click', () => this.createNewFile());
        }
        if (this.newFolderBtn) {
            this.newFolderBtn.addEventListener('click', () => this.createNewFolder());
        }
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.refreshFileTree());
        }
        if (this.openFolderBtn) {
            this.openFolderBtn.addEventListener('click', () => this.openFolder());
        }

        // Bookmark buttons
        if (this.addBookmarkBtn) {
            this.addBookmarkBtn.addEventListener('click', () => this.addCurrentFileBookmark());
        }
        if (this.clearBookmarksBtn) {
            this.clearBookmarksBtn.addEventListener('click', () => this.clearAllBookmarks());
        }

        // Settings panel events
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
        }

        // Math engine setting
        const mathEngineSelect = document.getElementById('math-engine-select');
        if (mathEngineSelect) {
            mathEngineSelect.addEventListener('change', (e) => {
                this.changeMathEngine(e.target.value);
            });
        }

        if (this.fontSizeSlider) {
            this.fontSizeSlider.addEventListener('input', (e) => {
                this.changeFontSize(e.target.value);
            });
        }

        // Autosave setting
        const autosaveCheckbox = document.getElementById('autosave-enabled');
        if (autosaveCheckbox) {
            autosaveCheckbox.addEventListener('change', (e) => {
                this.toggleAutosave(e.target.checked);
            });
        }

        // Spellcheck setting
        const spellcheckCheckbox = document.getElementById('spellcheck-enabled');
        if (spellcheckCheckbox) {
            spellcheckCheckbox.addEventListener('change', (e) => {
                this.toggleSpellcheck(e.target.checked);
            });
        }

        // Live preview setting
        const livePreviewCheckbox = document.getElementById('live-preview-enabled');
        if (livePreviewCheckbox) {
            livePreviewCheckbox.addEventListener('change', (e) => {
                this.toggleLivePreview(e.target.checked);
            });
        }

        // Scroll sync setting
        const syncScrollCheckbox = document.getElementById('sync-scroll-enabled');
        if (syncScrollCheckbox) {
            syncScrollCheckbox.addEventListener('change', (e) => {
                this.toggleSyncScroll(e.target.checked);
            });
        }

        // Word wrap setting
        const wordWrapCheckbox = document.getElementById('word-wrap-enabled');
        if (wordWrapCheckbox) {
            wordWrapCheckbox.addEventListener('change', (e) => {
                this.toggleWordWrap(e.target.checked);
            });
        }

        // File tree interactions
        this.fileTreeElement.addEventListener('click', (e) => {
            if (e.target.matches('.file-item') || e.target.closest('.file-item')) {
                const fileItem = e.target.matches('.file-item') ? e.target : e.target.closest('.file-item');
                this.selectFile(fileItem);
            }
        });

        this.fileTreeElement.addEventListener('dblclick', (e) => {
            if (e.target.matches('.file-item') || e.target.closest('.file-item')) {
                const fileItem = e.target.matches('.file-item') ? e.target : e.target.closest('.file-item');
                this.openFile(fileItem);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.toggleSidebar();
                        break;
                    case 'n':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.createNewFolder();
                        }
                        break;
                    case '1':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showPanel('files');
                        }
                        break;
                    case '2':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showPanel('search');
                        }
                        break;
                    case '3':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showPanel('toc');
                        }
                        break;
                    case '4':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showPanel('bookmarks');
                        }
                        break;
                    case '5':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.showPanel('settings');
                        }
                        break;
                }
            }
        });

        // Listen for editor content changes to update TOC
        document.addEventListener('editor-content-changed', () => {
            if (this.currentPanel === 'toc') {
                this.updateTableOfContents();
            }
        });

        // Search input with debouncing
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });
        }
    }

    setupSplitter() {
        if (!this.sidebarSplitter) return;

        let isResizing = false;
        const minSidebarWidth = 200;
        const maxSidebarWidth = 400;

        this.sidebarSplitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isResizing || this.isCollapsed) return;
            
            const newWidth = e.clientX;
            
            if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
                this.sidebarWidth = newWidth;
                this.sidebar.style.width = `${newWidth}px`;
                document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
                localStorage.setItem('sidebar-width', newWidth.toString());
            }
        };

        const handleMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    applySidebarState() {
        if (this.isCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.sidebarSplitter.style.display = 'none';
            if (this.toggleButton) {
                const icon = this.toggleButton.querySelector('.icon');
                if (icon) icon.textContent = '▶';
                this.toggleButton.title = 'Expand Sidebar';
            }
            
            // Force the sidebar to collapsed width and update CSS variables
            this.sidebar.style.width = 'var(--left-column-width)';
            document.documentElement.style.setProperty('--current-sidebar-width', 'var(--left-column-width)');
        } else {
            this.sidebar.classList.remove('collapsed');
            if (this.sidebarSplitter) this.sidebarSplitter.style.display = 'block';
            if (this.toggleButton) {
                const icon = this.toggleButton.querySelector('.icon');
                if (icon) icon.textContent = '◀';
                this.toggleButton.title = 'Collapse Sidebar';
            }
            
            // Apply saved width
            const savedWidth = localStorage.getItem('sidebar-width') || '280';
            this.sidebar.style.width = `${savedWidth}px`;
            document.documentElement.style.setProperty('--sidebar-width', `${savedWidth}px`);
            document.documentElement.style.setProperty('--current-sidebar-width', `${savedWidth}px`);
        }
        
        // Force layout recalculation
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
            mainContent.offsetHeight; // Trigger reflow
            mainContent.style.display = 'flex';
        }
    }

    showPanel(panelName) {
        if (!panelName) {
            console.warn('[FileBrowser] showPanel called with empty panelName');
            return;
        }

        console.log('[FileBrowser] Switching to panel:', panelName);
        this.currentPanel = panelName;
        localStorage.setItem('sidebar-panel', panelName);

        // Update left column icons
        this.leftColumnIcons.forEach(icon => {
            icon.classList.remove('active');
            const iconPanel = icon.getAttribute('data-panel');
            if (iconPanel === panelName) {
                icon.classList.add('active');
                console.log('[FileBrowser] Activated icon for panel:', panelName);
            }
        });

        // Show/hide panels using proper CSS classes
        const panels = document.querySelectorAll('.sidebar-panel');
        console.log('[FileBrowser] Found', panels.length, 'panels');
        
        panels.forEach(panel => {
            if (panel.id === `${panelName}-panel`) {
                panel.classList.add('active');
                console.log('[FileBrowser] Activated panel:', panel.id);
            } else {
                panel.classList.remove('active');
            }
        });

        // Expand sidebar if collapsed when switching panels
        if (this.isCollapsed) {
            console.log('[FileBrowser] Expanding collapsed sidebar');
            this.toggleSidebar();
        }

        // Initialize panel-specific content
        this.initializePanel(panelName);
    }

    initializePanel(panelName) {
        console.log('[FileBrowser] Initializing panel:', panelName);
        
        switch (panelName) {
            case 'files':
                this.loadFileTree();
                break;
            case 'search':
                this.initializeSearch();
                break;
            case 'toc':
                // Wait a bit for editor to be ready, then update TOC
                setTimeout(() => this.updateTableOfContents(), 100);
                break;
            case 'bookmarks':
                this.loadBookmarks();
                break;
            case 'settings':
                this.loadSettings();
                break;
            default:
                console.warn('[FileBrowser] Unknown panel:', panelName);
        }
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());
        this.applySidebarState();
    }

    // File operations
    async createNewFile() {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('create-new-file');
                if (result && result.success) {
                    // Open the new file in editor
                    const editor = window.markddApp?.getEditor();
                    if (editor) {
                        editor.openFile(result.filePath, '# New Document\n\nStart writing here...');
                    }
                    this.refreshFileTree();
                }
            } catch (error) {
                console.error('Failed to create new file:', error);
            }
        } else {
            // Fallback for browser mode
            const editor = window.markddApp?.getEditor();
            if (editor) {
                editor.createNewFile();
            }
        }
    }

    async createNewFolder() {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('create-new-folder');
                if (result && result.success) {
                    this.refreshFileTree();
                }
            } catch (error) {
                console.error('Failed to create new folder:', error);
            }
        }
    }

    refreshFileTree() {
        this.loadFileTree();
        // Also refresh recent files
        this.loadRecentFiles();
    }

    async openFolder() {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('open-folder-dialog');
                if (result && result.folderPath) {
                    this.currentPath = result.folderPath;
                    localStorage.setItem('last-opened-folder', this.currentPath);
                    this.loadFileTree();
                }
            } catch (error) {
                console.error('Failed to open folder:', error);
            }
        }
    }

    selectFile(fileItem) {
        // Remove previous selection
        this.fileTreeElement.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        fileItem.classList.add('selected');
    }

    async openFile(fileItem) {
        const filePath = fileItem.getAttribute('data-path') || fileItem.getAttribute('data-file-path');
        const fileName = fileItem.textContent.trim();
        
        if (typeof require !== 'undefined' && filePath) {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('read-file', filePath);
                if (result && result.success) {
                    const editor = window.markddApp?.getEditor();
                    if (editor) {
                        editor.openFile(filePath, result.content);
                        this.addToRecentFiles(filePath, fileName);
                    }
                }
            } catch (error) {
                console.error('Failed to open file:', error);
            }
        } else {
            console.log('Opening file:', fileName);
        }
    }

    // Recent files functionality
    addToRecentFiles(filePath, fileName) {
        let recentFiles = JSON.parse(localStorage.getItem('recent-files') || '[]');
        
        // Remove existing entry if present
        recentFiles = recentFiles.filter(file => file.path !== filePath);
        
        // Add to beginning
        recentFiles.unshift({
            path: filePath,
            name: fileName,
            timestamp: Date.now()
        });
        
        // Keep only last 10 files
        recentFiles = recentFiles.slice(0, 10);
        
        localStorage.setItem('recent-files', JSON.stringify(recentFiles));
        
        // Update recent files display if visible
        if (this.currentPanel === 'files') {
            this.loadRecentFiles();
        }
    }

    loadRecentFiles() {
        const recentFiles = JSON.parse(localStorage.getItem('recent-files') || '[]');
        const recentFilesContainer = document.getElementById('recent-files');
        
        if (!recentFilesContainer) return;
        
        if (recentFiles.length === 0) {
            recentFilesContainer.innerHTML = '<p class="recent-placeholder">No recent files</p>';
            return;
        }
        
        const html = recentFiles.map(file => `
            <div class="recent-file-item" data-path="${file.path}">
                <span class="file-icon">📄</span>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-path">${file.path}</div>
                </div>
            </div>
        `).join('');
        
        recentFilesContainer.innerHTML = html;
        
        // Add click handlers
        recentFilesContainer.querySelectorAll('.recent-file-item').forEach(item => {
            item.addEventListener('click', () => {
                const filePath = item.getAttribute('data-path');
                this.openRecentFile(filePath);
            });
        });
    }

    async openRecentFile(filePath) {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('read-file', filePath);
                if (result && result.success) {
                    const editor = window.markddApp?.getEditor();
                    if (editor) {
                        editor.openFile(filePath, result.content);
                    }
                } else {
                    // File might have been moved/deleted, remove from recent files
                    this.removeFromRecentFiles(filePath);
                }
            } catch (error) {
                console.error('Failed to open recent file:', error);
                this.removeFromRecentFiles(filePath);
            }
        }
    }

    removeFromRecentFiles(filePath) {
        let recentFiles = JSON.parse(localStorage.getItem('recent-files') || '[]');
        recentFiles = recentFiles.filter(file => file.path !== filePath);
        localStorage.setItem('recent-files', JSON.stringify(recentFiles));
        this.loadRecentFiles();
    }

    // Panel content loaders
    async loadFileTree() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;
        
        // Always load recent files first
        this.loadRecentFiles();
        
        // If we have a current path, load the file tree
        if (this.currentPath) {
            this.loadFolderContents();
        } else {
            // Try to restore last opened folder
            const lastFolder = localStorage.getItem('last-opened-folder');
            if (lastFolder) {
                this.currentPath = lastFolder;
                this.loadFolderContents();
            } else {
                fileTree.innerHTML = `
                    <div class="file-tree-section">
                        <h4>Recent Files</h4>
                        <div id="recent-files" class="recent-files"></div>
                    </div>
                    <div class="file-tree-empty">
                        <p>Open a folder to browse files</p>
                        <button id="openFolderBtn" class="open-folder-btn">Open Folder</button>
                    </div>
                `;
                
                // Re-attach event listener for the new button
                const openFolderBtn = fileTree.querySelector('#openFolderBtn');
                if (openFolderBtn) {
                    openFolderBtn.addEventListener('click', () => this.openFolder());
                }
                
                this.loadRecentFiles();
            }
        }
    }

    async loadFolderContents() {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree || !this.currentPath) return;
        
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('read-directory', this.currentPath);
                if (result && result.success) {
                    this.renderFileTree(result.files);
                } else {
                    fileTree.innerHTML = '<p class="file-placeholder">Failed to load folder contents</p>';
                }
            } catch (error) {
                console.error('Failed to load folder contents:', error);
                fileTree.innerHTML = '<p class="file-placeholder">Error loading folder</p>';
            }
        } else {
            // Fallback for browser mode
            fileTree.innerHTML = `
                <div class="file-tree-section">
                    <h4>Recent Files</h4>
                    <div id="recent-files" class="recent-files"></div>
                </div>
                <p class="file-placeholder">File system access not available in browser mode</p>
            `;
            this.loadRecentFiles();
        }
    }

    renderFileTree(files) {
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;
        
        const foldersHtml = files
            .filter(file => file.isDirectory)
            .map(folder => `
                <div class="file-item folder-item" data-path="${folder.path}">
                    <span class="file-icon">📁</span>
                    <span class="file-name">${folder.name}</span>
                </div>
            `).join('');
            
        const filesHtml = files
            .filter(file => !file.isDirectory && this.isMarkdownFile(file.name))
            .map(file => `
                <div class="file-item" data-path="${file.path}">
                    <span class="file-icon">📄</span>
                    <span class="file-name">${file.name}</span>
                </div>
            `).join('');
        
        fileTree.innerHTML = `
            <div class="file-tree-section">
                <h4>Recent Files</h4>
                <div id="recent-files" class="recent-files"></div>
            </div>
            <div class="file-tree-section">
                <h4>Current Folder: ${this.getBaseName(this.currentPath)}</h4>
                <div class="file-tree-contents">
                    ${foldersHtml}
                    ${filesHtml}
                </div>
            </div>
        `;
        
        // Load recent files
        this.loadRecentFiles();
        
        // Add click handlers for folders and files
        fileTree.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('dblclick', () => {
                const folderPath = item.getAttribute('data-path');
                this.currentPath = folderPath;
                localStorage.setItem('last-opened-folder', this.currentPath);
                this.loadFolderContents();
            });
        });
        
        fileTree.querySelectorAll('.file-item:not(.folder-item)').forEach(item => {
            item.addEventListener('click', () => this.selectFile(item));
            item.addEventListener('dblclick', () => this.openFile(item));
        });
    }

    isMarkdownFile(fileName) {
        const extensions = ['.md', '.markdown', '.txt', '.text'];
        return extensions.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    getBaseName(filePath) {
        if (!filePath) return '';
        return filePath.split(/[/\\]/).pop() || filePath;
    }

    initializeSearch() {
        const searchInput = document.getElementById('search-input');
        const searchResults = document.getElementById('search-results');
        
        if (searchInput && searchResults) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    }

    performSearch(query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        if (!query.trim()) {
            searchResults.innerHTML = '<p class="search-placeholder">Enter text to search</p>';
            return;
        }

        // Search in current editor content
        const editor = document.getElementById('editor');
        if (editor && editor.value) {
            const results = this.searchInContent(editor.value, query);
            this.displaySearchResults(results, query);
        } else {
            searchResults.innerHTML = '<p class="search-placeholder">No content to search</p>';
        }
    }

    searchInContent(content, query) {
        const lines = content.split('\n');
        const results = [];
        const queryLower = query.toLowerCase();

        lines.forEach((line, index) => {
            const lineLower = line.toLowerCase();
            const matchIndex = lineLower.indexOf(queryLower);
            
            if (matchIndex !== -1) {
                results.push({
                    lineNumber: index + 1,
                    line: line,
                    matchIndex: matchIndex,
                    matchLength: query.length
                });
            }
        });

        return results;
    }

    displaySearchResults(results, query) {
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = `<p class="search-placeholder">No matches found for "${query}"</p>`;
            return;
        }

        const resultsHtml = results.map(result => {
            // Highlight the match in the line
            const beforeMatch = result.line.substring(0, result.matchIndex);
            const match = result.line.substring(result.matchIndex, result.matchIndex + result.matchLength);
            const afterMatch = result.line.substring(result.matchIndex + result.matchLength);
            
            return `
                <div class="search-result-item" data-line="${result.lineNumber}">
                    <div class="search-result-line">Line ${result.lineNumber}</div>
                    <div class="search-result-content">
                        ${beforeMatch}<mark>${match}</mark>${afterMatch}
                    </div>
                </div>
            `;
        }).join('');

        searchResults.innerHTML = `
            <div class="search-results-header">
                ${results.length} match${results.length === 1 ? '' : 'es'} found
            </div>
            ${resultsHtml}
        `;

        // Add click handlers to jump to results
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const line = parseInt(item.getAttribute('data-line'));
                this.scrollToLine(line);
            });
        });

        console.log('[FileBrowser] Search completed:', results.length, 'matches found');
    }

    loadSearchResults() {
        // Implementation for loading search results
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = '<p class="search-placeholder">Search functionality coming soon...</p>';
    }

    updateTableOfContents() {
        const tocContent = document.getElementById('toc-content');
        const editor = document.getElementById('editor');
        if (!tocContent || !editor) return;

        const content = editor.value || '';
        const headings = this.extractHeadings(content);

        if (headings.length === 0) {
            tocContent.innerHTML = '<p class="toc-placeholder">No headings found</p>';
            return;
        }

        const tocHtml = headings.map(heading => 
            `<a href="#" class="toc-item level-${heading.level}" data-line="${heading.line}">
                ${'&nbsp;&nbsp;'.repeat(heading.level - 1)}${heading.text}
            </a>`
        ).join('');

        tocContent.innerHTML = tocHtml;

        // Add click handlers
        tocContent.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const line = parseInt(item.getAttribute('data-line'));
                this.scrollToLine(line);
            });
        });

        console.log('[FileBrowser] Table of Contents updated with', headings.length, 'headings');
    }

    extractHeadings(content) {
        const lines = content.split('\n');
        const headings = [];
        
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: index + 1
                });
            }
        });
        
        return headings;
    }

    scrollToLine(lineNumber) {
        const editor = document.getElementById('editor');
        if (!editor) return;

        // Calculate approximate position
        const lines = editor.value.split('\n');
        const totalLines = lines.length;
        const position = (lineNumber / totalLines) * editor.scrollHeight;
        
        editor.scrollTop = Math.max(0, position - editor.clientHeight / 2);
        
        // Focus editor and try to set cursor position
        editor.focus();
        const textBeforeLine = lines.slice(0, lineNumber - 1).join('\n');
        const cursorPosition = textBeforeLine.length + (lineNumber > 1 ? 1 : 0);
        editor.setSelectionRange(cursorPosition, cursorPosition);
    }

    loadTableOfContents() {
        // Implementation for loading table of contents
        const tocContent = document.getElementById('toc-content');
        if (!tocContent) return;
        
        this.updateTableOfContents();
    }

    loadSettings() {
        const themeSelect = document.getElementById('theme-select');
        const fontSizeSlider = document.getElementById('font-size-slider');
        const autosaveCheckbox = document.getElementById('autosave-enabled');
        const spellcheckCheckbox = document.getElementById('spellcheck-enabled');
        const livePreviewCheckbox = document.getElementById('live-preview-enabled');
        const syncScrollCheckbox = document.getElementById('sync-scroll-enabled');
        const wordWrapCheckbox = document.getElementById('word-wrap-enabled');
        const mathEngineSelect = document.getElementById('math-engine-select');
        
        if (themeSelect) {
            themeSelect.value = localStorage.getItem('theme') || 'auto';
        }
        
        if (mathEngineSelect) {
            const savedMathEngine = localStorage.getItem('math-engine') || 'mathjax';
            mathEngineSelect.value = savedMathEngine;
            // Apply to markdown renderer if available
            if (window.markddApp && window.markddApp.markdownRenderer) {
                window.markddApp.markdownRenderer.setMathEngine(savedMathEngine);
            }
        }
        
        if (fontSizeSlider) {
            const fontSize = localStorage.getItem('font-size') || '14';
            fontSizeSlider.value = fontSize;
            this.updateFontSizeDisplay(fontSize);
        }
        
        if (autosaveCheckbox) {
            const autosaveEnabled = localStorage.getItem('autosave-enabled') !== 'false'; // Default to true
            autosaveCheckbox.checked = autosaveEnabled;
            // Also apply to editor if available
            if (window.markddApp && window.markddApp.editor) {
                window.markddApp.editor.setAutosaveEnabled(autosaveEnabled);
            }
        }

        if (spellcheckCheckbox) {
            const spellcheckEnabled = localStorage.getItem('spellcheck-enabled') !== 'false'; // Default to true
            spellcheckCheckbox.checked = spellcheckEnabled;
            // Apply to editor
            if (window.Editor && window.Editor.setSpellcheck) {
                window.Editor.setSpellcheck(spellcheckEnabled);
            }
        }

        if (livePreviewCheckbox) {
            const livePreviewEnabled = localStorage.getItem('live-preview-enabled') !== 'false'; // Default to true
            livePreviewCheckbox.checked = livePreviewEnabled;
            // Apply to app
            if (window.markddApp) {
                window.markddApp.isLivePreview = livePreviewEnabled;
                if (window.markddApp.preview) {
                    window.markddApp.preview.setLivePreview(livePreviewEnabled);
                }
            }
        }

        if (syncScrollCheckbox) {
            const syncScrollEnabled = localStorage.getItem('sync-scroll-enabled') !== 'false'; // Default to true
            syncScrollCheckbox.checked = syncScrollEnabled;
            // Apply to app
            if (window.markddApp) {
                window.markddApp.syncScroll = syncScrollEnabled;
                if (window.markddApp.preview) {
                    window.markddApp.preview.setSyncScroll(syncScrollEnabled);
                }
            }
        }

        if (wordWrapCheckbox) {
            const wordWrapEnabled = localStorage.getItem('word-wrap-enabled') === 'true'; // Default to false
            wordWrapCheckbox.checked = wordWrapEnabled;
            // Apply to editor
            this.applyWordWrap(wordWrapEnabled);
        }
    }

    changeTheme(theme) {
        localStorage.setItem('theme', theme);
        
        // Apply theme using the main app's theme system
        if (window.markddApp && typeof window.markddApp.setTheme === 'function') {
            window.markddApp.setTheme(theme);
        } else {
            // Fallback theme application
            document.body.className = theme === 'dark' ? 'dark-theme' : '';
            document.documentElement.setAttribute('data-theme', theme);
        }
        
        console.log('[FileBrowser] Theme changed to:', theme);
    }

    changeMathEngine(engine) {
        localStorage.setItem('math-engine', engine);
        
        // Apply math engine to markdown renderer
        if (window.markddApp && window.markddApp.markdownRenderer) {
            window.markddApp.markdownRenderer.setMathEngine(engine);
            console.log('[FileBrowser] Math engine changed to:', engine);
            
            // Refresh preview if content exists
            if (window.markddApp.preview && window.markddApp.editor) {
                const content = window.markddApp.editor.getValue();
                if (content.trim()) {
                    window.markddApp.preview.updatePreview(content);
                }
            }
        }
    }

    changeFontSize(size) {
        localStorage.setItem('font-size', size);
        this.updateFontSizeDisplay(size);
        
        // Apply font size to editor
        const editor = document.getElementById('editor');
        if (editor) {
            editor.style.fontSize = `${size}px`;
        }
    }

    toggleAutosave(enabled) {
        localStorage.setItem('autosave-enabled', enabled.toString());
        
        // Apply to editor if available
        if (window.markddApp && window.markddApp.editor) {
            window.markddApp.editor.setAutosaveEnabled(enabled);
        }
        
        console.log('Autosave:', enabled ? 'enabled' : 'disabled');
    }

    toggleSpellcheck(enabled) {
        localStorage.setItem('spellcheck-enabled', enabled.toString());
        
        // Apply to editor
        if (window.Editor && window.Editor.setSpellcheck) {
            window.Editor.setSpellcheck(enabled);
        }
        
        console.log('Spellcheck:', enabled ? 'enabled' : 'disabled');
    }

    toggleLivePreview(enabled) {
        localStorage.setItem('live-preview-enabled', enabled.toString());
        
        // Apply to app
        if (window.markddApp) {
            window.markddApp.isLivePreview = enabled;
            if (window.markddApp.preview) {
                window.markddApp.preview.setLivePreview(enabled);
            }
            window.markddApp.updateToolbarStates();
        }
        
        console.log('Live Preview:', enabled ? 'enabled' : 'disabled');
    }

    toggleSyncScroll(enabled) {
        localStorage.setItem('sync-scroll-enabled', enabled.toString());
        
        // Apply to app
        if (window.markddApp) {
            window.markddApp.syncScroll = enabled;
            if (window.markddApp.preview) {
                window.markddApp.preview.setSyncScroll(enabled);
            }
            window.markddApp.updateToolbarStates();
        }
        
        console.log('Scroll Sync:', enabled ? 'enabled' : 'disabled');
    }

    toggleWordWrap(enabled) {
        localStorage.setItem('word-wrap-enabled', enabled.toString());
        
        // Apply word wrap
        this.applyWordWrap(enabled);
        
        console.log('Word Wrap:', enabled ? 'enabled' : 'disabled');
    }

    applyWordWrap(enabled) {
        const editor = document.getElementById('editor');
        if (editor) {
            if (enabled) {
                editor.style.whiteSpace = 'pre-wrap';
                editor.style.wordWrap = 'break-word';
                editor.style.overflowWrap = 'break-word';
            } else {
                editor.style.whiteSpace = 'pre';
                editor.style.wordWrap = 'normal';
                editor.style.overflowWrap = 'normal';
            }
        }
    }

    updateFontSizeDisplay(size) {
        if (this.fontSizeDisplay) {
            this.fontSizeDisplay.textContent = `${size}px`;
        }
    }

    updateAppVersion() {
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            // This should be dynamically populated
            versionElement.textContent = 'v1.1.0';
        }
    }

    // Bookmark Management
    addCurrentFileBookmark() {
        const editor = window.markddApp?.getEditor();
        if (!editor || !editor.getCurrentFile()) {
            this.showToast('No file is currently open', 'warning');
            return;
        }

        const filePath = editor.getCurrentFile();
        const fileName = this.getBaseName(filePath);
        
        let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        
        // Check if already bookmarked
        if (bookmarks.find(bookmark => bookmark.path === filePath)) {
            this.showToast('File is already bookmarked', 'info');
            return;
        }
        
        // Add bookmark
        bookmarks.unshift({
            path: filePath,
            name: fileName,
            timestamp: Date.now()
        });
        
        // Keep only last 20 bookmarks
        bookmarks = bookmarks.slice(0, 20);
        
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        
        // Update display if visible
        if (this.currentPanel === 'bookmarks') {
            this.loadBookmarks();
        }
        
        this.showToast('File bookmarked successfully', 'success');
        console.log('[FileBrowser] Bookmark added:', fileName);
    }

    loadBookmarks() {
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const bookmarksContent = document.getElementById('bookmarks-content');
        
        if (!bookmarksContent) return;
        
        if (bookmarks.length === 0) {
            bookmarksContent.innerHTML = '<p class="bookmarks-placeholder">No bookmarks saved</p>';
            return;
        }
        
        const html = bookmarks.map(bookmark => `
            <div class="bookmark-item" data-path="${bookmark.path}">
                <span class="file-icon">⭐</span>
                <div class="bookmark-info">
                    <div class="bookmark-name">${bookmark.name}</div>
                    <div class="bookmark-path">${bookmark.path}</div>
                </div>
                <button class="bookmark-remove" data-path="${bookmark.path}" title="Remove bookmark">×</button>
            </div>
        `).join('');
        
        bookmarksContent.innerHTML = html;
        
        // Add click handlers
        bookmarksContent.querySelectorAll('.bookmark-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('bookmark-remove')) {
                    const filePath = item.getAttribute('data-path');
                    this.openBookmarkedFile(filePath);
                }
            });
        });
        
        // Add remove handlers
        bookmarksContent.querySelectorAll('.bookmark-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const filePath = btn.getAttribute('data-path');
                this.removeBookmark(filePath);
            });
        });
        
        console.log('[FileBrowser] Bookmarks loaded:', bookmarks.length, 'items');
    }

    async openBookmarkedFile(filePath) {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                const result = await ipcRenderer.invoke('read-file', filePath);
                if (result && result.success) {
                    const editor = window.markddApp?.getEditor();
                    if (editor) {
                        editor.openFile(filePath, result.content);
                    }
                } else {
                    // File might have been moved/deleted, remove from bookmarks
                    this.removeBookmark(filePath);
                    this.showToast('File not found, bookmark removed', 'warning');
                }
            } catch (error) {
                console.error('Failed to open bookmarked file:', error);
                this.removeBookmark(filePath);
                this.showToast('Failed to open file, bookmark removed', 'error');
            }
        }
    }

    removeBookmark(filePath) {
        let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        bookmarks = bookmarks.filter(bookmark => bookmark.path !== filePath);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        this.loadBookmarks();
    }

    clearAllBookmarks() {
        if (confirm('Are you sure you want to clear all bookmarks?')) {
            localStorage.removeItem('bookmarks');
            this.loadBookmarks();
            this.showToast('All bookmarks cleared', 'info');
        }
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '8px 16px',
            borderRadius: '4px',
            zIndex: '10000',
            fontSize: '13px',
            fontWeight: '500',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            backgroundColor: type === 'success' ? '#4CAF50' : 
                           type === 'error' ? '#f44336' : 
                           type === 'warning' ? '#FF9800' : '#2196F3',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        });
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Public API methods
    getCurrentPath() {
        return this.currentPath;
    }

    isExpanded() {
        return !this.isCollapsed;
    }

    expand() {
        if (this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    collapse() {
        if (!this.isCollapsed) {
            this.toggleSidebar();
        }
    }

    // Debugging and Testing Methods
    debugSidebar() {
        console.log('=== FileBrowser Debug Info ===');
        console.log('Current panel:', this.currentPanel);
        console.log('Is collapsed:', this.isCollapsed);
        console.log('Sidebar width:', this.sidebarWidth);
        console.log('Elements found:');
        console.log('  - Sidebar:', !!this.sidebar);
        console.log('  - Icons:', this.leftColumnIcons.length);
        console.log('  - Toggle button:', !!this.toggleButton);
        
        const panels = document.querySelectorAll('.sidebar-panel');
        console.log('Panels found:', panels.length);
        panels.forEach(panel => {
            console.log(`  - ${panel.id}: active=${panel.classList.contains('active')}`);
        });
        
        // Test panel switching
        console.log('Testing panel switching...');
        this.showPanel('search');
        setTimeout(() => this.showPanel('toc'), 500);
        setTimeout(() => this.showPanel('bookmarks'), 1000);
        setTimeout(() => this.showPanel('files'), 1500);
    }

    // Manual testing methods accessible from console
    testPanelSwitch(panelName) {
        console.log(`[FileBrowser] Manual test: switching to ${panelName}`);
        this.showPanel(panelName);
    }

    testSidebarToggle() {
        console.log('[FileBrowser] Manual test: toggling sidebar');
        this.toggleSidebar();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileBrowser;
} else {
    window.FileBrowser = FileBrowser;
}

// Global debugging function accessible from console
window.debugSidebar = function() {
    if (window.markddApp && window.markddApp.fileBrowser) {
        window.markddApp.fileBrowser.debugSidebar();
    } else {
        console.error('FileBrowser not found. Is the app initialized?');
    }
};

window.testSidebarPanel = function(panelName) {
    if (window.markddApp && window.markddApp.fileBrowser) {
        window.markddApp.fileBrowser.testPanelSwitch(panelName);
    } else {
        console.error('FileBrowser not found. Is the app initialized?');
    }
};

window.testSidebarToggle = function() {
    if (window.markddApp && window.markddApp.fileBrowser) {
        window.markddApp.fileBrowser.testSidebarToggle();
    } else {
        console.error('FileBrowser not found. Is the app initialized?');
    }
};