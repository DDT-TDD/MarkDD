console.log('[TabManager] Script loading...');

/**
 * TabManager - Manages multiple file tabs in MarkDD Editor
 * Provides tab-based document management with state persistence
 */
class TabManager {
    constructor() {
        this.tabs = new Map(); // Map<tabId, TabData>
        this.activeTabId = null;
        this.nextTabId = 1;
        this.maxTabs = 50; // Maximum number of open tabs
        
        // Event listeners
        this.listeners = {
            'tab-created': [],
            'tab-switched': [],
            'tab-closed': [],
            'tab-updated': [],
            'tab-title-changed': []
        };
        
        console.log('[TabManager] Initialized');
    }

    /**
     * Create a new tab
     * @param {Object} options - Tab options
     * @param {string} options.title - Tab title (default: 'Untitled')
     * @param {string} options.content - Initial content (default: '')
     * @param {string} options.filepath - File path if opened from file
     * @param {boolean} options.switchTo - Switch to this tab immediately (default: true)
     * @returns {string} - Tab ID
     */
    createTab(options = {}) {
        const {
            title = `Untitled-${this.nextTabId}`,
            content = '',
            filepath = null,
            switchTo = true
        } = options;

        // Check max tabs limit
        if (this.tabs.size >= this.maxTabs) {
            console.warn('[TabManager] Maximum number of tabs reached');
            throw new Error(`Maximum number of tabs (${this.maxTabs}) reached. Please close some tabs.`);
        }

        const tabId = `tab-${this.nextTabId++}`;
        
        const tabData = {
            id: tabId,
            title: title,
            filepath: filepath,
            content: content,
            savedContent: filepath ? content : '', // Only mark as saved if opened from file
            isDirty: filepath ? false : true, // New tabs are dirty, opened files are clean
            created: Date.now(),
            modified: Date.now(),
            scrollTop: 0 // Store editor scroll position for restoration on tab switch
        };

        this.tabs.set(tabId, tabData);
        console.log(`[TabManager] Created tab: ${tabId} (${title})`);

        // Emit event
        this.emit('tab-created', { tabId, tabData });

        // Switch to new tab if requested
        if (switchTo) {
            this.switchTab(tabId);
        }

        // Persist to localStorage
        this.persist();

        return tabId;
    }

    /**
     * Switch to a different tab
     * @param {string} tabId - Tab ID to switch to
     * @returns {boolean} - Success status
     */
    switchTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return false;
        }

        const previousTabId = this.activeTabId;
        this.activeTabId = tabId;

        console.log(`[TabManager] Switched to tab: ${tabId}`);

        // Emit event
        this.emit('tab-switched', {
            tabId,
            previousTabId,
            tabData: this.tabs.get(tabId)
        });

        // Persist to localStorage
        this.persist();

        return true;
    }

    /**
     * Close a tab
     * @param {string} tabId - Tab ID to close
     * @param {boolean} force - Force close without checking dirty state
     * @returns {boolean} - Success status
     */
    closeTab(tabId, force = false) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return false;
        }

        const tabData = this.tabs.get(tabId);

        // Check if tab has unsaved changes
        if (!force && tabData.isDirty) {
            const confirmed = confirm(
                `"${tabData.title}" has unsaved changes. Do you want to close it anyway?`
            );
            if (!confirmed) {
                return false;
            }
        }

        // Remove tab
        this.tabs.delete(tabId);
        console.log(`[TabManager] Closed tab: ${tabId}`);

        // If this was the active tab, switch to another
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                // Switch to the last tab
                this.switchTab(remainingTabs[remainingTabs.length - 1]);
            } else {
                this.activeTabId = null;
            }
        }

        // Emit event
        this.emit('tab-closed', { tabId, tabData });

        // Persist to localStorage
        this.persist();

        return true;
    }

    /**
     * Update tab content
     * @param {string} tabId - Tab ID
     * @param {string} content - New content
     * @param {number} scrollTop - Optional scroll position to save
     */
    updateTabContent(tabId, content, scrollTop = null) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return;
        }

        const tabData = this.tabs.get(tabId);
        tabData.content = content;
        tabData.modified = Date.now();
        
        // Update scroll position if provided
        if (scrollTop !== null && typeof scrollTop === 'number') {
            tabData.scrollTop = scrollTop;
        }
        
        // Update dirty state
        tabData.isDirty = (content !== tabData.savedContent);

        console.log(`[TabManager] Updated tab content: ${tabId} (dirty: ${tabData.isDirty})`);

        // Emit event
        this.emit('tab-updated', { tabId, tabData });

        // Don't persist on every content change (performance)
        // Persistence happens on tab switch, close, or save
    }

    /**
     * Mark tab as saved
     * @param {string} tabId - Tab ID
     * @param {string} filepath - File path where content was saved
     */
    markTabSaved(tabId, filepath = null) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return;
        }

        const tabData = this.tabs.get(tabId);
        tabData.savedContent = tabData.content;
        tabData.isDirty = false;
        
        if (filepath) {
            tabData.filepath = filepath;
            
            // Update title to filename
            const filename = filepath.split(/[/\\]/).pop();
            if (filename && filename !== tabData.title) {
                tabData.title = filename;
                this.emit('tab-title-changed', { tabId, title: filename });
            }
        }

        console.log(`[TabManager] Marked tab as saved: ${tabId}`);

        // Emit event
        this.emit('tab-updated', { tabId, tabData });

        // Persist to localStorage
        this.persist();
    }

    /**
     * Update tab title
     * @param {string} tabId - Tab ID
     * @param {string} title - New title
     */
    updateTabTitle(tabId, title) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return;
        }

        const tabData = this.tabs.get(tabId);
        tabData.title = title;
        tabData.modified = Date.now();

        console.log(`[TabManager] Updated tab title: ${tabId} -> ${title}`);

        // Emit event
        this.emit('tab-title-changed', { tabId, title });

        // Persist to localStorage
        this.persist();
    }

    /**
     * Get tab data
     * @param {string} tabId - Tab ID
     * @returns {Object|null} - Tab data or null if not found
     */
    getTab(tabId) {
        return this.tabs.get(tabId) || null;
    }

    /**
     * Get active tab data
     * @returns {Object|null} - Active tab data or null if no active tab
     */
    getActiveTab() {
        if (!this.activeTabId) {
            return null;
        }
        return this.tabs.get(this.activeTabId) || null;
    }

    /**
     * Update scroll position for a tab
     * @param {string} tabId - Tab ID
     * @param {number} scrollTop - Scroll position
     */
    updateTabScrollPosition(tabId, scrollTop) {
        if (!this.tabs.has(tabId)) {
            console.error(`[TabManager] Tab not found: ${tabId}`);
            return;
        }

        const tabData = this.tabs.get(tabId);
        tabData.scrollTop = scrollTop;
        
        // Don't persist on scroll position changes (performance)
    }

    /**
     * Get scroll position for a tab
     * @param {string} tabId - Tab ID
     * @returns {number} - Scroll position (0 if not found)
     */
    getTabScrollPosition(tabId) {
        if (!this.tabs.has(tabId)) {
            return 0;
        }

        const tabData = this.tabs.get(tabId);
        return tabData.scrollTop || 0;
    }

    /**
     * Get all tabs
     * @returns {Array<Object>} - Array of tab data objects
     */
    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    /**
     * Get tab count
     * @returns {number} - Number of open tabs
     */
    getTabCount() {
        return this.tabs.size;
    }

    /**
     * Check if tab exists
     * @param {string} tabId - Tab ID
     * @returns {boolean} - True if tab exists
     */
    hasTab(tabId) {
        return this.tabs.has(tabId);
    }

    /**
     * Close all tabs
     * @param {boolean} force - Force close without checking dirty state
     * @returns {boolean} - Success status
     */
    closeAllTabs(force = false) {
        if (!force) {
            const dirtyTabs = this.getAllTabs().filter(tab => tab.isDirty);
            if (dirtyTabs.length > 0) {
                const confirmed = confirm(
                    `${dirtyTabs.length} tab(s) have unsaved changes. Close all anyway?`
                );
                if (!confirmed) {
                    return false;
                }
            }
        }

        const tabIds = Array.from(this.tabs.keys());
        tabIds.forEach(tabId => {
            this.closeTab(tabId, true);
        });

        console.log('[TabManager] Closed all tabs');
        return true;
    }

    /**
     * Register event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    /**
     * Unregister event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this.listeners[event]) {
            return;
        }
        const index = this.listeners[event].indexOf(callback);
        if (index !== -1) {
            this.listeners[event].splice(index, 1);
        }
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data) {
        if (!this.listeners[event]) {
            return;
        }
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[TabManager] Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Persist tab state to localStorage
     */
    persist() {
        try {
            const state = {
                tabs: Array.from(this.tabs.entries()),
                activeTabId: this.activeTabId,
                nextTabId: this.nextTabId,
                timestamp: Date.now()
            };

            localStorage.setItem('markdd-tab-state', JSON.stringify(state));
            console.log('[TabManager] State persisted to localStorage');
        } catch (error) {
            console.error('[TabManager] Failed to persist state:', error);
        }
    }

    /**
     * Restore tab state from localStorage
     * @returns {boolean} - Success status
     */
    restore() {
        try {
            const stateJson = localStorage.getItem('markdd-tab-state');
            if (!stateJson) {
                console.log('[TabManager] No saved state found');
                return false;
            }

            const state = JSON.parse(stateJson);
            
            // Check if state is recent (within 7 days)
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            if (Date.now() - state.timestamp > maxAge) {
                console.log('[TabManager] Saved state too old, ignoring');
                return false;
            }

            // Restore tabs
            this.tabs = new Map(state.tabs);
            this.activeTabId = state.activeTabId;
            this.nextTabId = state.nextTabId || this.tabs.size + 1;

            console.log(`[TabManager] Restored ${this.tabs.size} tabs from localStorage`);

            // Emit events for restored tabs
            this.tabs.forEach((tabData, tabId) => {
                this.emit('tab-created', { tabId, tabData, restored: true });
            });

            if (this.activeTabId) {
                this.emit('tab-switched', {
                    tabId: this.activeTabId,
                    previousTabId: null,
                    tabData: this.tabs.get(this.activeTabId),
                    restored: true
                });
            }

            return true;
        } catch (error) {
            console.error('[TabManager] Failed to restore state:', error);
            return false;
        }
    }

    /**
     * Clear persisted state
     */
    clearPersistedState() {
        try {
            localStorage.removeItem('markdd-tab-state');
            console.log('[TabManager] Cleared persisted state');
        } catch (error) {
            console.error('[TabManager] Failed to clear persisted state:', error);
        }
    }

    /**
     * Find tab by filepath
     * @param {string} filepath - File path to search for
     * @returns {string|null} - Tab ID or null if not found
     */
    findTabByFilepath(filepath) {
        if (!filepath) return null;

        for (const [tabId, tabData] of this.tabs) {
            if (tabData.filepath === filepath) {
                return tabId;
            }
        }

        return null;
    }

    /**
     * Get next tab ID (for cycling through tabs)
     * @returns {string|null} - Next tab ID or null if no tabs
     */
    getNextTabId() {
        const tabIds = Array.from(this.tabs.keys());
        if (tabIds.length === 0) return null;

        const currentIndex = tabIds.indexOf(this.activeTabId);
        const nextIndex = (currentIndex + 1) % tabIds.length;
        return tabIds[nextIndex];
    }

    /**
     * Get previous tab ID (for cycling through tabs)
     * @returns {string|null} - Previous tab ID or null if no tabs
     */
    getPreviousTabId() {
        const tabIds = Array.from(this.tabs.keys());
        if (tabIds.length === 0) return null;

        const currentIndex = tabIds.indexOf(this.activeTabId);
        const prevIndex = currentIndex === 0 ? tabIds.length - 1 : currentIndex - 1;
        return tabIds[prevIndex];
    }
}

// Export for use in other modules
// Always export to window in browser/Electron renderer context
window.TabManager = TabManager;

console.log('[TabManager] Exported to window.TabManager successfully');
