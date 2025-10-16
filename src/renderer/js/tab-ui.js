console.log('[TabUI] Script loading...');

/**
 * TabUI - Manages the visual representation of tabs in the UI
 * Works in conjunction with TabManager to provide the tab bar interface
 */
class TabUI {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.tabListElement = document.getElementById('tab-list');
        this.newTabBtn = document.getElementById('new-tab-btn');
        
        if (!this.tabListElement || !this.newTabBtn) {
            console.error('[TabUI] Required tab elements not found in DOM');
            return;
        }

        this.setupEventListeners();
        this.setupTabManagerListeners();
        
        console.log('[TabUI] Initialized');
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // New tab button
        this.newTabBtn.addEventListener('click', () => {
            this.handleNewTabClick();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+T: New tab
            if ((e.ctrlKey || e.metaKey) && e.key === 't') {
                e.preventDefault();
                this.handleNewTabClick();
            }

            // Ctrl+W: Close current tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                const activeTab = this.tabManager.getActiveTab();
                if (activeTab) {
                    this.tabManager.closeTab(activeTab.id);
                }
            }

            // Ctrl+Tab: Next tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const nextTabId = this.tabManager.getNextTabId();
                if (nextTabId) {
                    this.tabManager.switchTab(nextTabId);
                }
            }

            // Ctrl+Shift+Tab: Previous tab
            if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const prevTabId = this.tabManager.getPreviousTabId();
                if (prevTabId) {
                    this.tabManager.switchTab(prevTabId);
                }
            }
        });
    }

    /**
     * Setup listeners for TabManager events
     */
    setupTabManagerListeners() {
        this.tabManager.on('tab-created', (event) => {
            this.renderTab(event.tabData);
        });

        this.tabManager.on('tab-switched', (event) => {
            this.updateActiveTab(event.tabId);
        });

        this.tabManager.on('tab-closed', (event) => {
            this.removeTab(event.tabId);
        });

        this.tabManager.on('tab-updated', (event) => {
            this.updateTab(event.tabData);
        });

        this.tabManager.on('tab-title-changed', (event) => {
            this.updateTabTitle(event.tabId, event.title);
        });
    }

    /**
     * Handle new tab button click
     */
    handleNewTabClick() {
        try {
            this.tabManager.createTab({
                title: `Untitled-${this.tabManager.getTabCount() + 1}`,
                content: '',
                switchTo: true
            });
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Render a tab element
     * @param {Object} tabData - Tab data
     */
    renderTab(tabData) {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab-item';
        tabElement.id = `tab-ui-${tabData.id}`;
        tabElement.dataset.tabId = tabData.id;

        // Tab icon
        const icon = document.createElement('span');
        icon.className = 'tab-icon';
        icon.textContent = '📄';
        tabElement.appendChild(icon);

        // Tab title
        const title = document.createElement('span');
        title.className = 'tab-title';
        title.textContent = tabData.title;
        title.title = tabData.filepath || tabData.title;
        tabElement.appendChild(title);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'tab-close';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.tabManager.closeTab(tabData.id);
        });
        tabElement.appendChild(closeBtn);

        // Click to switch tab
        tabElement.addEventListener('click', () => {
            this.tabManager.switchTab(tabData.id);
        });

        // Add dirty class if needed
        if (tabData.isDirty) {
            tabElement.classList.add('dirty');
        }

        // Add to tab list
        this.tabListElement.appendChild(tabElement);

        // Scroll to show new tab
        this.scrollToTab(tabData.id);

        console.log(`[TabUI] Rendered tab: ${tabData.id}`);
    }

    /**
     * Update active tab styling
     * @param {string} tabId - Tab ID to mark as active
     */
    updateActiveTab(tabId) {
        // Remove active class from all tabs
        const allTabs = this.tabListElement.querySelectorAll('.tab-item');
        allTabs.forEach(tab => tab.classList.remove('active'));

        // Add active class to selected tab
        const tabElement = document.getElementById(`tab-ui-${tabId}`);
        if (tabElement) {
            tabElement.classList.add('active');
            this.scrollToTab(tabId);
        }
    }

    /**
     * Remove tab element from DOM
     * @param {string} tabId - Tab ID to remove
     */
    removeTab(tabId) {
        const tabElement = document.getElementById(`tab-ui-${tabId}`);
        if (tabElement) {
            tabElement.remove();
            console.log(`[TabUI] Removed tab: ${tabId}`);
        }
    }

    /**
     * Update tab element
     * @param {Object} tabData - Tab data
     */
    updateTab(tabData) {
        const tabElement = document.getElementById(`tab-ui-${tabData.id}`);
        if (!tabElement) return;

        // Update dirty state
        if (tabData.isDirty) {
            tabElement.classList.add('dirty');
        } else {
            tabElement.classList.remove('dirty');
        }

        // Update title
        const titleElement = tabElement.querySelector('.tab-title');
        if (titleElement && titleElement.textContent !== tabData.title) {
            titleElement.textContent = tabData.title;
            titleElement.title = tabData.filepath || tabData.title;
        }
    }

    /**
     * Update tab title
     * @param {string} tabId - Tab ID
     * @param {string} title - New title
     */
    updateTabTitle(tabId, title) {
        const tabElement = document.getElementById(`tab-ui-${tabId}`);
        if (!tabElement) return;

        const titleElement = tabElement.querySelector('.tab-title');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Scroll to show tab
     * @param {string} tabId - Tab ID to scroll to
     */
    scrollToTab(tabId) {
        const tabElement = document.getElementById(`tab-ui-${tabId}`);
        if (!tabElement) return;

        // Scroll the tab list to show the tab
        const tabList = this.tabListElement;
        const tabRect = tabElement.getBoundingClientRect();
        const listRect = tabList.getBoundingClientRect();

        if (tabRect.left < listRect.left) {
            // Tab is to the left of visible area
            tabList.scrollLeft += (tabRect.left - listRect.left - 20);
        } else if (tabRect.right > listRect.right) {
            // Tab is to the right of visible area
            tabList.scrollLeft += (tabRect.right - listRect.right + 20);
        }
    }

    /**
     * Render all tabs (for initial load or refresh)
     */
    renderAllTabs() {
        this.tabListElement.innerHTML = '';
        
        const tabs = this.tabManager.getAllTabs();
        tabs.forEach(tabData => {
            this.renderTab(tabData);
        });

        const activeTab = this.tabManager.getActiveTab();
        if (activeTab) {
            this.updateActiveTab(activeTab.id);
        }

        console.log(`[TabUI] Rendered ${tabs.length} tabs`);
    }
}

// Export for use in other modules
// Always export to window in browser/Electron renderer context
window.TabUI = TabUI;

console.log('[TabUI] Exported to window.TabUI successfully');
