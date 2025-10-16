class FileBrowser {
    // Open file dialog for menu/toolbar integration
    async openFileDialog() {
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            try {
                // Ask main process to open file dialog and return file path/content
                const result = await ipcRenderer.invoke('open-file-dialog');
                if (result && result.filePath && result.content) {
                    // Open file in editor
                    const editor = window.markddApp?.getEditor();
                    if (editor) {
                        editor.openFile(result.filePath, result.content);
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

        // Settings panel elements
        this.themeSelect = document.getElementById('theme-select');
        this.fontSizeSlider = document.getElementById('font-size-slider');
        this.fontSizeDisplay = document.getElementById('font-size-display');
    }

    setupEventListeners() {
        // Left column icons
        this.leftColumnIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                const panel = e.target.getAttribute('data-panel');
                this.showPanel(panel);
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

        // Settings panel events
        if (this.themeSelect) {
            this.themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
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
    }

    setupSplitter() {
        if (!this.sidebarSplitter) return;

        let isResizing = false;

        this.sidebarSplitter.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });

        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                this.sidebarWidth = newWidth;
                this.sidebar.style.width = `${newWidth}px`;
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
        this.sidebar.style.width = `${this.sidebarWidth}px`;
        
        if (this.isCollapsed) {
            this.sidebar.classList.add('collapsed');
        } else {
            this.sidebar.classList.remove('collapsed');
        }
    }

    showPanel(panelName) {
        this.currentPanel = panelName;
        localStorage.setItem('sidebar-panel', panelName);

        // Update left column icons
        this.leftColumnIcons.forEach(icon => {
            icon.classList.remove('active');
            if (icon.getAttribute('data-panel') === panelName) {
                icon.classList.add('active');
            }
        });

        // Show corresponding panel content
        const panels = document.querySelectorAll('.sidebar-panel');
        panels.forEach(panel => {
            panel.style.display = 'none';
        });

        const activePanel = document.getElementById(`${panelName}-panel`);
        if (activePanel) {
            activePanel.style.display = 'block';
        }

        // Load panel-specific content
        switch (panelName) {
            case 'files':
                this.loadFileTree();
                break;
            case 'search':
                this.loadSearchResults();
                break;
            case 'toc':
                this.loadTableOfContents();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    toggleSidebar() {
        this.isCollapsed = !this.isCollapsed;
        localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());
        this.applySidebarState();
    }

    // File operations
    createNewFile() {
        console.log('Creating new file...');
        // Implementation for creating new file
    }

    createNewFolder() {
        console.log('Creating new folder...');
        // Implementation for creating new folder
    }

    refreshFileTree() {
        console.log('Refreshing file tree...');
        this.loadFileTree();
    }

    openFolder() {
        console.log('Opening folder...');
        // Implementation for opening folder
    }

    selectFile(fileItem) {
        // Remove previous selection
        this.fileTreeElement.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        fileItem.classList.add('selected');
    }

    openFile(fileItem) {
        const fileName = fileItem.textContent.trim();
        console.log('Opening file:', fileName);
        // Implementation for opening file
    }

    // Panel content loaders
    loadFileTree() {
        // Implementation for loading file tree
        const fileTree = document.getElementById('file-tree');
        if (!fileTree) return;
        
        fileTree.innerHTML = '<p class="file-placeholder">Open a folder to see files...</p>';
    }

    loadSearchResults() {
        // Implementation for loading search results
        const searchResults = document.getElementById('search-results');
        if (!searchResults) return;
        
        searchResults.innerHTML = '<p class="search-placeholder">Search functionality coming soon...</p>';
    }

    loadTableOfContents() {
        // Implementation for loading table of contents
        const tocContent = document.getElementById('toc-content');
        if (!tocContent) return;
        
        tocContent.innerHTML = '<p class="toc-placeholder">Table of contents will appear here...</p>';
    }

    loadSettings() {
        const themeSelect = document.getElementById('theme-select');
        const fontSizeSlider = document.getElementById('font-size-slider');
        const autosaveCheckbox = document.getElementById('autosave-enabled');
        
        if (themeSelect) {
            themeSelect.value = localStorage.getItem('theme') || 'auto';
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
    }

    changeTheme(theme) {
        localStorage.setItem('theme', theme);
        document.body.className = theme === 'dark' ? 'dark-theme' : '';
        
        // Apply theme logic here
        console.log('Theme changed to:', theme);
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

    updateFontSizeDisplay(size) {
        if (this.fontSizeDisplay) {
            this.fontSizeDisplay.textContent = `${size}px`;
        }
    }

    updateAppVersion() {
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            // This should be dynamically populated
            versionElement.textContent = 'v1.0.0';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileBrowser;
} else {
    window.FileBrowser = FileBrowser;
}