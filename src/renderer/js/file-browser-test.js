class FileBrowser {
    constructor() {
        console.log('FileBrowser constructor called');
        this.currentPath = null;
        this.fileTree = null;
        this.isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        this.currentPanel = localStorage.getItem('sidebar-panel') || 'files';
        this.sidebarWidth = parseInt(localStorage.getItem('sidebar-width') || '280');
    }

    init() {
        console.log('FileBrowser init called');
    }

    changeFontSize(size) {
        console.log('changeFontSize called with:', size);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileBrowser;
} else {
    window.FileBrowser = FileBrowser;
}