class SearchReplaceModal {
    constructor() {
        this.modal = null;
        this.searchInput = null;
        this.replaceInput = null;
        this.editor = null;
        this.matches = [];
        this.currentMatch = -1;
        this.searchHistory = [];
        this.replaceHistory = [];
        this.maxHistory = 20;
        
        // Search options
        this.isCaseSensitive = false;
        this.isWholeWord = false;
        this.isRegex = false;
        
        this.setupModal();
        this.loadHistory();
    }

    setupModal() {
        // Create modal HTML structure
        const modalHTML = `
            <div id="search-replace-modal" class="search-replace-modal" style="display: none;">
                <div class="search-replace-modal-content">
                    <div class="search-replace-header">
                        <h3>Find and Replace</h3>
                        <button id="search-replace-close" class="modal-close-btn">&times;</button>
                    </div>
                    
                    <div class="search-replace-body">
                        <!-- Search Input -->
                        <div class="search-input-group">
                            <div class="input-with-buttons">
                                <input type="text" id="search-replace-find-input" 
                                       placeholder="Find" 
                                       class="search-input" 
                                       autocomplete="off"
                                       spellcheck="false">
                                <div class="search-buttons">
                                    <button id="search-prev-btn" title="Previous (Shift+Enter)" class="search-btn">
                                        <span class="icon">↑</span>
                                    </button>
                                    <button id="search-next-btn" title="Next (Enter)" class="search-btn">
                                        <span class="icon">↓</span>
                                    </button>
                                </div>
                            </div>
                            <div class="search-options">
                                <button id="case-sensitive-btn" class="option-btn" title="Case Sensitive (Alt+C)">
                                    <span class="icon">Aa</span>
                                </button>
                                <button id="whole-word-btn" class="option-btn" title="Whole Word (Alt+W)">
                                    <span class="icon">Ab</span>
                                </button>
                                <button id="regex-btn" class="option-btn" title="Regular Expression (Alt+R)">
                                    <span class="icon">.*</span>
                                </button>
                            </div>
                        </div>

                        <!-- Replace Input -->
                        <div class="replace-input-group">
                            <div class="input-with-buttons">
                                <input type="text" id="search-replace-replace-input" 
                                       placeholder="Replace" 
                                       class="replace-input" 
                                       autocomplete="off"
                                       spellcheck="false">
                                <div class="replace-buttons">
                                    <button id="replace-btn" title="Replace (Ctrl+Shift+1)" class="replace-btn">
                                        Replace
                                    </button>
                                    <button id="replace-all-btn" title="Replace All (Ctrl+Alt+Enter)" class="replace-all-btn">
                                        Replace All
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Results Info -->
                        <div class="search-results-info">
                            <span id="search-results-text">No results</span>
                            <div class="search-actions">
                                <button id="select-all-matches-btn" class="action-btn" disabled>
                                    Select All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add CSS styles
        const styles = `
            <style>
                .search-replace-modal {
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    width: min(500px, 90vw);
                    max-width: 500px;
                    z-index: 10000;
                    display: none;
                }

                .search-replace-modal-content {
                    background: var(--bg-color, #ffffff);
                    border: 2px solid var(--border-color, #ddd);
                    border-radius: 8px;
                    width: 100%;
                    max-height: 500px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    animation: searchModalSlideIn 0.2s ease-out;
                }

                @keyframes searchModalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .search-replace-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border-color, #ddd);
                    background: var(--header-bg, #f8f9fa);
                    cursor: move;
                    user-select: none;
                }

                .search-replace-header:active {
                    cursor: grabbing;
                }

                .search-replace-header h3 {
                    margin: 0;
                    font-size: 14px;
                    color: var(--text-color, #333);
                    flex: 1;
                    pointer-events: none;
                }

                .modal-close-btn {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    color: var(--text-color, #666);
                    transition: all 0.15s ease;
                }

                .modal-close-btn:hover {
                    background: var(--hover-bg, #e9ecef);
                    color: var(--text-color, #333);
                }

                .search-replace-body {
                    padding: 20px;
                }

                .search-input-group, .replace-input-group {
                    margin-bottom: 16px;
                }

                .input-with-buttons {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .search-input, .replace-input {
                    flex: 1;
                    padding: 10px 12px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 4px;
                    font-size: 14px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    background: var(--input-bg, #ffffff);
                    color: var(--text-color, #333);
                    outline: none;
                    transition: border-color 0.15s ease;
                }

                .search-input:focus, .replace-input:focus {
                    border-color: var(--accent-color, #007acc);
                    box-shadow: 0 0 0 2px var(--accent-color-alpha, rgba(0, 122, 204, 0.1));
                }

                .search-buttons, .replace-buttons {
                    display: flex;
                    gap: 4px;
                }

                .search-btn, .replace-btn, .replace-all-btn {
                    padding: 8px 12px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 4px;
                    background: var(--button-bg, #ffffff);
                    color: var(--text-color, #333);
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    white-space: nowrap;
                }

                .search-btn:hover, .replace-btn:hover, .replace-all-btn:hover {
                    background: var(--hover-bg, #f0f0f0);
                    border-color: var(--accent-color, #007acc);
                }

                .search-btn .icon {
                    font-size: 14px;
                    font-weight: bold;
                }

                .replace-all-btn {
                    background: var(--primary-color, #007acc);
                    color: white;
                    border-color: var(--primary-color, #007acc);
                }

                .replace-all-btn:hover {
                    background: var(--primary-color-dark, #005a9e);
                }

                .search-options {
                    display: flex;
                    gap: 4px;
                    margin-top: 8px;
                }

                .option-btn {
                    padding: 6px 8px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 3px;
                    background: var(--button-bg, #ffffff);
                    color: var(--text-color, #666);
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    min-width: 28px;
                }

                .option-btn:hover {
                    background: var(--hover-bg, #f0f0f0);
                }

                .option-btn.active {
                    background: var(--accent-color, #007acc);
                    color: white;
                    border-color: var(--accent-color, #007acc);
                }

                .search-results-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0 0 0;
                    border-top: 1px solid var(--border-color, #eee);
                    margin-top: 16px;
                    font-size: 13px;
                    color: var(--text-muted, #666);
                }

                .search-actions {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    padding: 4px 8px;
                    border: 1px solid var(--border-color, #ddd);
                    border-radius: 3px;
                    background: var(--button-bg, #ffffff);
                    color: var(--text-color, #333);
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .action-btn:not(:disabled):hover {
                    background: var(--hover-bg, #f0f0f0);
                }

                /* Dark theme support */
                [data-theme="dark"] .search-replace-modal-content {
                    --bg-color: #2d2d30;
                    --border-color: #3e3e42;
                    --header-bg: #37373d;
                    --text-color: #cccccc;
                    --input-bg: #3c3c3c;
                    --button-bg: #0e639c;
                    --hover-bg: #094771;
                    --accent-color: #0e639c;
                    --accent-color-alpha: rgba(14, 99, 156, 0.1);
                    --primary-color: #0e639c;
                    --primary-color-dark: #1177bb;
                    --text-muted: #a6a6a6;
                }
            </style>
        `;

        // Insert styles and modal into document
        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Cache DOM elements
        this.modal = document.getElementById('search-replace-modal');
        this.searchInput = document.getElementById('search-replace-find-input');
        this.replaceInput = document.getElementById('search-replace-replace-input');
        this.resultsText = document.getElementById('search-results-text');

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal
        document.getElementById('search-replace-close').addEventListener('click', () => {
            this.hide();
        });

        // Close on Escape only (removed click outside - modal is now non-blocking)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') {
                this.hide();
            }
        });

        // Make modal draggable by header
        this.makeDraggable();

        // Search input events
        // Debounce search to prevent jumping cursor while typing
        let searchTimeout = null;
        this.searchInput.addEventListener('input', () => {
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            // Wait 300ms after user stops typing before searching
            searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Clear any pending debounce and perform search immediately with highlighting
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                }
                this.performSearch(true); // Enable auto-highlight on Enter
                if (e.shiftKey) {
                    this.findPrevious();
                } else {
                    this.findNext();
                }
            }
        });

        // Replace input events
        this.replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.replaceNext();
            }
        });

        // Button events
        document.getElementById('search-prev-btn').addEventListener('click', () => {
            this.findPrevious();
        });

        document.getElementById('search-next-btn').addEventListener('click', () => {
            this.findNext();
        });

        document.getElementById('replace-btn').addEventListener('click', () => {
            this.replaceNext();
        });

        document.getElementById('replace-all-btn').addEventListener('click', () => {
            this.replaceAll();
        });

        document.getElementById('select-all-matches-btn').addEventListener('click', () => {
            this.selectAllMatches();
        });

        // Option toggles
        document.getElementById('case-sensitive-btn').addEventListener('click', () => {
            this.toggleCaseSensitive();
        });

        document.getElementById('whole-word-btn').addEventListener('click', () => {
            this.toggleWholeWord();
        });

        document.getElementById('regex-btn').addEventListener('click', () => {
            this.toggleRegex();
        });

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.modal.style.display === 'none') return;

            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'f':
                        e.preventDefault();
                        this.searchInput.focus();
                        this.searchInput.select();
                        break;
                    case 'h':
                        e.preventDefault();
                        this.replaceInput.focus();
                        this.replaceInput.select();
                        break;
                }
            }

            if (e.altKey && !e.ctrlKey && !e.shiftKey) {
                switch (e.key.toLowerCase()) {
                    case 'c':
                        e.preventDefault();
                        this.toggleCaseSensitive();
                        break;
                    case 'w':
                        e.preventDefault();
                        this.toggleWholeWord();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.toggleRegex();
                        break;
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '1') {
                e.preventDefault();
                this.replaceNext();
            }

            if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'Enter') {
                e.preventDefault();
                this.replaceAll();
            }
        });
    }

    show(mode = 'find') {
        // Get current editor
        this.editor = document.getElementById('editor');
        if (!this.editor) {
            console.warn('Editor not found');
            return;
        }

        // Show modal (non-blocking, floating window)
        this.modal.style.display = 'block';

        // Pre-fill search with selection if any
        const selectedText = this.getSelectedText();
        if (selectedText && selectedText.length < 100) {
            this.searchInput.value = selectedText;
        }

        // Focus appropriate input
        if (mode === 'replace') {
            this.replaceInput.style.display = '';
            document.querySelector('.replace-input-group').style.display = '';
            this.replaceInput.focus();
        } else {
            this.searchInput.focus();
            this.searchInput.select();
        }

        // Perform initial search if there's a value
        if (this.searchInput.value) {
            this.performSearch();
        }

        // Add to search history
        this.addToHistory('search', this.searchInput.value);
    }

    hide() {
        this.modal.style.display = 'none';
        this.clearHighlights();
        
        // Return focus to editor
        if (this.editor) {
            this.editor.focus();
        }
        
        // Save history
        this.saveHistory();
    }

    /**
     * Make the modal draggable by its header
     */
    makeDraggable() {
        const header = document.querySelector('.search-replace-header');
        const modalContent = document.querySelector('.search-replace-modal-content');
        
        if (!header || !modalContent) return;
        
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        header.addEventListener('mousedown', (e) => {
            // Only drag if clicking on header, not buttons
            if (e.target.classList.contains('modal-close-btn')) return;
            
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            
            isDragging = true;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            xOffset = currentX;
            yOffset = currentY;
            
            // Update modal position
            this.modal.style.top = `${Math.max(0, 80 + currentY)}px`;
            this.modal.style.right = 'auto';
            this.modal.style.left = `${Math.max(0, Math.min(window.innerWidth - modalContent.offsetWidth, 20 + currentX))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    performSearch(autoHighlight = false) {
        const query = this.searchInput.value;
        if (!query || !this.editor) {
            this.clearMatches();
            return;
        }

        const content = this.editor.value;
        this.matches = [];

        try {
            let searchRegex;
            
            if (this.isRegex) {
                searchRegex = new RegExp(query, this.isCaseSensitive ? 'g' : 'gi');
            } else {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = this.isWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
                searchRegex = new RegExp(pattern, this.isCaseSensitive ? 'g' : 'gi');
            }

            let match;
            while ((match = searchRegex.exec(content)) !== null) {
                this.matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0]
                });

                // Prevent infinite loop on zero-length matches
                if (match[0].length === 0) {
                    searchRegex.lastIndex++;
                }
            }

            this.currentMatch = this.matches.length > 0 ? 0 : -1;
            this.updateResults();
            
            // CRITICAL FIX: Only highlight/scroll if explicitly requested (Enter key or Next/Prev buttons)
            // This prevents cursor jumping while typing
            if (autoHighlight && this.matches.length > 0) {
                this.highlightCurrentMatch();
            }
            
        } catch (error) {
            this.updateResults('Invalid regular expression');
        }
    }

    findNext() {
        if (this.matches.length === 0) {
            this.performSearch(true); // Enable auto-highlight when explicitly navigating
            return;
        }

        this.currentMatch = (this.currentMatch + 1) % this.matches.length;
        this.highlightCurrentMatch();
        this.updateResults();
    }

    findPrevious() {
        if (this.matches.length === 0) {
            this.performSearch(true); // Enable auto-highlight when explicitly navigating
            return;
        }

        this.currentMatch = this.currentMatch <= 0 ? this.matches.length - 1 : this.currentMatch - 1;
        this.highlightCurrentMatch();
        this.updateResults();
    }

    replaceNext() {
        if (this.currentMatch < 0 || this.matches.length === 0) {
            return;
        }

        const replacement = this.replaceInput.value;
        const match = this.matches[this.currentMatch];
        
        // Perform replacement
        const before = this.editor.value.slice(0, match.start);
        const after = this.editor.value.slice(match.end);
        this.editor.value = before + replacement + after;

        // Update content and trigger change event
        this.triggerEditorChange();

        // Add to replace history
        this.addToHistory('replace', replacement);

        // Update search after replacement
        setTimeout(() => {
            this.performSearch();
        }, 50);
    }

    replaceAll() {
        if (this.matches.length === 0) {
            return;
        }

        const replacement = this.replaceInput.value;
        const query = this.searchInput.value;
        
        if (!query) return;

        try {
            let searchRegex;
            
            if (this.isRegex) {
                searchRegex = new RegExp(query, this.isCaseSensitive ? 'g' : 'gi');
            } else {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = this.isWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
                searchRegex = new RegExp(pattern, this.isCaseSensitive ? 'g' : 'gi');
            }

            const replacedCount = this.matches.length;
            this.editor.value = this.editor.value.replace(searchRegex, replacement);

            // Update content and trigger change event
            this.triggerEditorChange();

            // Add to replace history
            this.addToHistory('replace', replacement);

            // Show result
            this.resultsText.textContent = `Replaced ${replacedCount} occurrence${replacedCount !== 1 ? 's' : ''}`;

            // Update search
            setTimeout(() => {
                this.performSearch();
            }, 50);

        } catch (error) {
            this.updateResults('Replace failed: Invalid regular expression');
        }
    }

    selectAllMatches() {
        if (this.matches.length === 0) return;

        // This would select all matches - for a simple textarea, we'll just select the first match
        // In a more advanced editor, this would select all matches simultaneously
        this.currentMatch = 0;
        this.highlightCurrentMatch();
        this.updateResults();
    }

    highlightCurrentMatch() {
        if (this.currentMatch < 0 || this.currentMatch >= this.matches.length) {
            return;
        }

        const match = this.matches[this.currentMatch];
        
        // CRITICAL: Disable scroll sync during search navigation
        if (window.markdownPreview && window.markdownPreview.isScrolling !== undefined) {
            window.markdownPreview.isScrolling = true;
            console.log('[SearchReplace] Disabling scroll sync for search scroll');
        }
        
        // First, scroll to show the match (BEFORE setting selection)
        // This ensures the textarea's scrollTop is correct before browser handles selection
        this.scrollToPosition(match.start);
        
        // Then set selection and focus
        this.editor.setSelectionRange(match.start, match.end);
        this.editor.focus();
        
        // Re-enable scroll sync after delay to prevent immediate re-sync
        setTimeout(() => {
            if (window.markdownPreview && window.markdownPreview.isScrolling !== undefined) {
                window.markdownPreview.isScrolling = false;
                console.log('[SearchReplace] Re-enabling scroll sync after search');
            }
        }, 150);
    }

    scrollToPosition(position) {
        // Guaranteed scroll to position - ensures match is visible in viewport
        if (!this.editor || position === undefined) {
            return;
        }

        try {
            // Get accurate line height from computed styles
            const styles = getComputedStyle(this.editor);
            const fontSize = parseFloat(styles.fontSize) || 16;
            const lineHeightStyle = styles.lineHeight;
            
            let lineHeight;
            if (lineHeightStyle === 'normal') {
                lineHeight = fontSize * 1.2;
            } else if (lineHeightStyle.endsWith('px')) {
                lineHeight = parseFloat(lineHeightStyle);
            } else if (!isNaN(parseFloat(lineHeightStyle))) {
                lineHeight = fontSize * parseFloat(lineHeightStyle);
            } else {
                lineHeight = fontSize * 1.2;
            }
            
            // Calculate line number where the match is
            const textBeforePosition = this.editor.value.slice(0, position);
            const lineNumber = textBeforePosition.split('\n').length - 1;
            
            // Calculate pixel position of the target line
            const targetLineY = lineNumber * lineHeight;
            
            // Get viewport dimensions
            const viewportHeight = this.editor.clientHeight;
            const currentScrollTop = this.editor.scrollTop;
            
            // Calculate visible range
            const viewportTop = currentScrollTop;
            const viewportBottom = currentScrollTop + viewportHeight;
            
            // Add padding to ensure match is comfortably visible (not at edge)
            const padding = lineHeight * 3; // 3 lines of padding for context
            
            // Check if target line is already visible with padding
            const targetWithPadding = targetLineY;
            const isAlreadyVisible = 
                (targetWithPadding >= viewportTop + padding) && 
                (targetWithPadding <= viewportBottom - padding);
            
            if (!isAlreadyVisible) {
                // Need to scroll - position line in the upper-third of viewport
                // This shows the match plus plenty of context below
                const scrollTop = targetLineY - (viewportHeight / 3);
                
                // Clamp to valid range
                const maxScrollTop = Math.max(0, this.editor.scrollHeight - viewportHeight);
                const finalScrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));
                
                // Apply scroll with instant behavior
                this.editor.scrollTop = finalScrollTop;
                
                console.log(`[SearchReplace] Scrolled to line ${lineNumber} at ${finalScrollTop}px (was ${currentScrollTop}px)`);
            } else {
                console.log(`[SearchReplace] Line ${lineNumber} already visible, no scroll needed`);
            }
            
            // Force browser reflow to ensure scroll completes
            void this.editor.offsetHeight;
            
        } catch (error) {
            console.error('[SearchReplace] Error in scrollToPosition:', error);
            // Robust fallback
            try {
                const lineHeight = 20; // Conservative estimate
                const textBeforePosition = this.editor.value.slice(0, position);
                const lineNumber = textBeforePosition.split('\n').length - 1;
                const viewportHeight = this.editor.clientHeight || 400;
                // Position in upper third
                const targetScrollTop = Math.max(0, (lineNumber * lineHeight) - (viewportHeight / 3));
                this.editor.scrollTop = targetScrollTop;
                console.log(`[SearchReplace] Fallback scroll to line ${lineNumber}`);
            } catch (fallbackError) {
                console.error('[SearchReplace] Fallback scroll also failed:', fallbackError);
            }
        }
    }

    clearMatches() {
        this.matches = [];
        this.currentMatch = -1;
        this.updateResults();
    }

    clearHighlights() {
        // Clear any visual highlights - in a basic textarea, this is handled by selection clearing
        if (this.editor) {
            this.editor.setSelectionRange(this.editor.selectionStart, this.editor.selectionStart);
        }
    }

    updateResults(error = null) {
        const selectAllBtn = document.getElementById('select-all-matches-btn');
        
        if (error) {
            this.resultsText.textContent = error;
            this.resultsText.style.color = 'var(--error-color, #d63031)';
            selectAllBtn.disabled = true;
            return;
        }

        this.resultsText.style.color = '';
        
        if (this.matches.length === 0) {
            this.resultsText.textContent = this.searchInput.value ? 'No results' : 'Enter search term';
            selectAllBtn.disabled = true;
        } else {
            this.resultsText.textContent = `${this.currentMatch + 1} of ${this.matches.length}`;
            selectAllBtn.disabled = false;
        }
    }

    getSelectedText() {
        if (!this.editor) return '';
        
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        
        if (start !== end) {
            return this.editor.value.slice(start, end);
        }
        
        return '';
    }

    triggerEditorChange() {
        // Trigger change events for the editor
        const event = new Event('input', { bubbles: true });
        this.editor.dispatchEvent(event);
    }

    // Option toggles
    toggleCaseSensitive() {
        this.isCaseSensitive = !this.isCaseSensitive;
        const btn = document.getElementById('case-sensitive-btn');
        btn.classList.toggle('active', this.isCaseSensitive);
        this.performSearch();
    }

    toggleWholeWord() {
        this.isWholeWord = !this.isWholeWord;
        const btn = document.getElementById('whole-word-btn');
        btn.classList.toggle('active', this.isWholeWord);
        this.performSearch();
    }

    toggleRegex() {
        this.isRegex = !this.isRegex;
        const btn = document.getElementById('regex-btn');
        btn.classList.toggle('active', this.isRegex);
        this.performSearch();
    }

    // History management
    addToHistory(type, value) {
        if (!value) return;
        
        const history = type === 'search' ? this.searchHistory : this.replaceHistory;
        
        // Remove if already exists
        const index = history.indexOf(value);
        if (index > -1) {
            history.splice(index, 1);
        }
        
        // Add to beginning
        history.unshift(value);
        
        // Limit size
        if (history.length > this.maxHistory) {
            history.splice(this.maxHistory);
        }
    }

    loadHistory() {
        try {
            const data = localStorage.getItem('markdd-search-history');
            if (data) {
                const parsed = JSON.parse(data);
                this.searchHistory = parsed.search || [];
                this.replaceHistory = parsed.replace || [];
            }
        } catch (error) {
            console.warn('Failed to load search history:', error);
        }
    }

    saveHistory() {
        try {
            const data = {
                search: this.searchHistory,
                replace: this.replaceHistory
            };
            localStorage.setItem('markdd-search-history', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save search history:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchReplaceModal;
} else {
    window.SearchReplaceModal = SearchReplaceModal;
}
