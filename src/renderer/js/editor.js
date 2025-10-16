console.log('🔥🔥🔥 EDITOR.JS SCRIPT IS LOADING! 🔥🔥🔥');

class Editor {
    // --- In-Editor Search & Replace ---
    // All legacy search bar code removed. Only SearchReplaceModal is used.
    // Toggle spellcheck on the editor textarea
    static setSpellcheck(enabled) {
        const textarea = document.getElementById('editor');
        if (textarea) textarea.spellcheck = !!enabled;
    }
    constructor(editorElement) {
        console.log('[Editor] ⚡ CONSTRUCTOR STARTED with element:', editorElement);
        this.element = editorElement;
        this.content = '';
        this.currentFile = null;
        this.isModified = false;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 100;
        
        // Autosave configuration (default OFF, read from localStorage)
        this.autosaveEnabled = localStorage.getItem('autosave-enabled') === 'true';
        this.autosaveInterval = 30000; // 30 seconds
        this.autosaveTimer = null;
        
        // Content change debouncing
        this.contentChangeTimeout = null;
        
        console.log('[Editor] About to call init()...');
        this.init();
        console.log('[Editor] Constructor completed');
    }

    init() {
        console.log('[Editor] ⚡ INIT() FUNCTION STARTED');
        
        // Ensure the editor element is properly configured
        this.element.removeAttribute('readonly');
        this.element.removeAttribute('disabled');
        this.element.style.pointerEvents = 'auto';
        this.element.style.userSelect = 'text';
        this.element.focus();
        
        this.setupEventListeners();
        this.setupShortcuts();
        this.updateStatus();
        
        // Initialize professional search/replace modal
        this.searchReplaceModal = new SearchReplaceModal();

        // Always load the actual showcase file from disk, don't use hardcoded content
        console.log('[Editor] Forcing load of actual COMPREHENSIVE-FEATURES-SHOWCASE.md file...');
        this.loadComprehensiveShowcase();
    }

    setupEventListeners() {
        // Content change tracking with debouncing
        let debounceTimeout = null;
        
        this.element.addEventListener('input', (e) => {
            this.content = e.target.value;
            this.setModified(true);
            this.saveToHistory();
            this.updateStatus();
            
            // Debounce content change events to prevent excessive refreshes
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            
            // PERFORMANCE FIX: Reduced debounce for faster live preview
            debounceTimeout = setTimeout(() => {
                this.triggerContentChange();
                this.scheduleAutosave(); // Schedule autosave when content changes
            }, 100); // Reduced from 250ms to 100ms for faster updates
        });

        // --- FIX: Additional event listeners to catch ALL content changes ---
        // Handle paste operations
        this.element.addEventListener('paste', (e) => {
            setTimeout(() => {
                this.content = this.element.value;
                this.setModified(true);
                this.saveToHistory();
                this.updateStatus();
                this.triggerContentChange();
            }, 10); // Small delay to ensure paste content is processed
        });

        // Handle cut operations
        this.element.addEventListener('cut', (e) => {
            setTimeout(() => {
                this.content = this.element.value;
                this.setModified(true);
                this.saveToHistory();
                this.updateStatus();
                this.triggerContentChange();
            }, 10); // Small delay to ensure cut content is processed
        });

        // Handle delete and backspace explicitly
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                setTimeout(() => {
                    const newContent = this.element.value;
                    if (newContent !== this.content) {
                        this.content = newContent;
                        this.setModified(true);
                        this.saveToHistory();
                        this.updateStatus();
                        this.triggerContentChange();
                    }
                }, 10); // Small delay to ensure delete/backspace content is processed
            }
        });

        // Selection tracking for cursor position
        this.element.addEventListener('selectionchange', () => {
            this.updateCursorPosition();
        });

        // Click and focus events
        this.element.addEventListener('click', () => {
            this.updateCursorPosition();
        });

        this.element.addEventListener('focus', () => {
            this.updateCursorPosition();
        });

        // Tab handling
        this.element.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    setupShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 's':
                        e.preventDefault();
                        this.save();
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.redo();
                        } else {
                            e.preventDefault();
                            this.undo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.redo();
                        break;
                    case 'b':
                        e.preventDefault();
                        this.toggleBold();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.toggleItalic();
                        break;
                    case 'u':
                        e.preventDefault();
                        this.toggleHighlight();
                        break;
                    case 's':
                        if (e.altKey) {
                            e.preventDefault();
                            this.toggleStrikethrough();
                        } else {
                            // Don't prevent default for Ctrl+S (save)
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        if (this.searchReplaceModal) {
                            this.searchReplaceModal.show('find');
                        } else {
                            this.showSearchBar(false);
                        }
                        break;
                    case 'h':
                        e.preventDefault();
                        if (this.searchReplaceModal) {
                            this.searchReplaceModal.show('replace');
                        } else {
                            this.showSearchBar(true);
                        }
                        break;
                }
            }
        });
    }

    handleKeyDown(e) {
        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                this.insertTab();
                break;
            case 'Enter':
                this.handleEnter(e);
                break;
        }
    }

    insertTab() {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        
        // If text is selected, indent each line
        if (start !== end) {
            const selectedText = this.content.substring(start, end);
            const lines = selectedText.split('\n');
            const indentedLines = lines.map(line => '    ' + line);
            const indentedText = indentedLines.join('\n');
            
            this.replaceSelection(indentedText);
        } else {
            // Insert 4 spaces at cursor
            this.insertText('    ');
        }
    }

    handleEnter(e) {
        const start = this.element.selectionStart;
        const lineStart = this.content.lastIndexOf('\n', start - 1) + 1;
        const currentLine = this.content.substring(lineStart, start);
        
        // Auto-indent: preserve leading whitespace
        const indentMatch = currentLine.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        
        // Handle list continuation
        const listMatch = currentLine.match(/^(\s*)([*+-]|\d+\.)\s/);
        if (listMatch) {
            e.preventDefault();
            const [, leadingSpace, marker] = listMatch;
            
            // If current line is empty list item, remove it
            if (currentLine.trim() === marker) {
                const lineEnd = this.content.indexOf('\n', start);
                this.element.selectionStart = lineStart;
                this.element.selectionEnd = lineEnd === -1 ? this.content.length : lineEnd;
                this.replaceSelection('\n');
                return;
            }
            
            // Continue numbered list
            if (marker.includes('.')) {
                const num = parseInt(marker) + 1;
                this.insertText(`\n${leadingSpace}${num}. `);
            } else {
                // Continue bullet list
                this.insertText(`\n${leadingSpace}${marker} `);
            }
        } else if (indent) {
            // Just preserve indentation
            e.preventDefault();
            this.insertText('\n' + indent);
        }
    }

    insertText(text) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        
        this.element.setRangeText(text);
        this.element.selectionStart = this.element.selectionEnd = start + text.length;
        
        this.content = this.element.value;
        this.setModified(true);
        this.saveToHistory();
        this.triggerContentChange();
    }

    replaceSelection(text) {
        const start = this.element.selectionStart;
        this.element.setRangeText(text);
        this.element.selectionStart = start;
        this.element.selectionEnd = start + text.length;
        
        this.content = this.element.value;
        this.setModified(true);
        this.saveToHistory();
        this.triggerContentChange();
    }

    getSelectedText() {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        return this.content.substring(start, end);
    }

    // Formatting methods
    toggleBold() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('**') && selectedText.endsWith('**')) {
                // Remove bold
                const unboldText = selectedText.slice(2, -2);
                this.replaceSelection(unboldText);
            } else {
                // Add bold
                this.replaceSelection(`**${selectedText}**`);
            }
        } else {
            this.insertText('**bold text**');
        }
    }

    toggleItalic() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('*') && selectedText.endsWith('*') && 
                !selectedText.startsWith('**')) {
                // Remove italic
                const unitalicText = selectedText.slice(1, -1);
                this.replaceSelection(unitalicText);
            } else {
                // Add italic
                this.replaceSelection(`*${selectedText}*`);
            }
        } else {
            this.insertText('*italic text*');
        }
    }

    toggleHighlight() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('==') && selectedText.endsWith('==')) {
                // Remove highlight
                const unhighlightedText = selectedText.slice(2, -2);
                this.replaceSelection(unhighlightedText);
            } else {
                // Add highlight
                this.replaceSelection(`==${selectedText}==`);
            }
        } else {
            this.insertText('==highlighted text==');
        }
    }

    toggleStrikethrough() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('~~') && selectedText.endsWith('~~')) {
                // Remove strikethrough
                const unstrikeText = selectedText.slice(2, -2);
                this.replaceSelection(unstrikeText);
            } else {
                // Add strikethrough
                this.replaceSelection(`~~${selectedText}~~`);
            }
        } else {
            this.insertText('~~strikethrough text~~');
        }
    }

    toggleSuperscript() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('^') && selectedText.endsWith('^')) {
                // Remove superscript
                const unsuperText = selectedText.slice(1, -1);
                this.replaceSelection(unsuperText);
            } else {
                // Add superscript
                this.replaceSelection(`^${selectedText}^`);
            }
        } else {
            this.insertText('^superscript^');
        }
    }

    toggleSubscript() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            if (selectedText.startsWith('~') && selectedText.endsWith('~') && 
                !selectedText.startsWith('~~')) {
                // Remove subscript
                const unsubText = selectedText.slice(1, -1);
                this.replaceSelection(unsubText);
            } else {
                // Add subscript
                this.replaceSelection(`~${selectedText}~`);
            }
        } else {
            this.insertText('~subscript~');
        }
    }

    insertKeyboardShortcut() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`[[${selectedText}]]`);
        } else {
            this.insertText('[[Ctrl+Key]]');
        }
    }

    insertInlineCode() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`\`${selectedText}\``);
        } else {
            this.insertText('`code`');
        }
    }

    insertHeading(level = 1) {
        const prefix = '#'.repeat(level) + ' ';
        const selectedText = this.getSelectedText();
        
        if (selectedText) {
            this.replaceSelection(`${prefix}${selectedText}`);
        } else {
            this.insertText(`${prefix}Heading ${level}`);
        }
    }

    insertLink(url = '', title = '') {
        const selectedText = this.getSelectedText();
        const linkText = selectedText || title || 'link text';
        const linkUrl = url || 'https://example.com';
        
        this.replaceSelection(`[${linkText}](${linkUrl})`);
    }

    insertImage(url = '', alt = '') {
        const altText = alt || 'image description';
        const imageUrl = url || 'https://example.com/image.jpg';
        
        this.insertText(`![${altText}](${imageUrl})`);
    }

    insertTable(rows = 3, cols = 3) {
        let table = '\n';
        
        // Header row
        table += '| ' + Array(cols).fill('Header').map((h, i) => `${h} ${i + 1}`).join(' | ') + ' |\n';
        
        // Separator row
        table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
        
        // Data rows
        for (let i = 0; i < rows - 1; i++) {
            table += '| ' + Array(cols).fill('Cell').map((c, j) => `${c} ${i + 1}.${j + 1}`).join(' | ') + ' |\n';
        }
        
        table += '\n';
        this.insertText(table);
    }

    insertMath() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`$${selectedText}$`);
        } else {
            this.insertText('$E = mc^2$');
        }
    }

    insertMermaidDiagram() {
        const mermaidTemplate = `\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`\n`;
        this.insertText(mermaidTemplate);
    }

    insertTikZDiagram() {
        const tikzTemplate = `\`\`\`tikz
\\draw (0,0) circle (1cm);
\\draw (-1,0) -- (1,0);
\\draw (0,-1) -- (0,1);
\`\`\`\n`;
        this.insertText(tikzTemplate);
    }

    insertPlantUMLDiagram() {
        const diagram = `\`\`\`plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
\`\`\``;
        this.insertText('\n' + diagram + '\n');
        this.element.focus();
    }

    insertVegaChart() {
        const chart = `\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "data": {"values": [{"a": "A", "b": 28}, {"a": "B", "b": 55}]},
  "mark": "bar",
  "encoding": {
    "x": {"field": "a", "type": "nominal"},
    "y": {"field": "b", "type": "quantitative"}
  }
}
\`\`\``;
        this.insertText('\n' + chart + '\n');
        this.element.focus();
    }

    insertLaTeX() {
        const latex = `\`\`\`latex
\\documentclass{article}
\\begin{document}
Hello LaTeX!
\\end{document}
\`\`\``;
        this.insertText('\n' + latex + '\n');
        this.element.focus();
    }

    // History management
    saveToHistory() {
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }
        
        this.history.push({
            content: this.content,
            selectionStart: this.element.selectionStart,
            selectionEnd: this.element.selectionEnd,
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const state = this.history[this.historyIndex];
            this.restoreState(state);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const state = this.history[this.historyIndex];
            this.restoreState(state);
        }
    }

    restoreState(state) {
        this.element.value = state.content;
        this.element.selectionStart = state.selectionStart;
        this.element.selectionEnd = state.selectionEnd;
        this.content = state.content;
        this.triggerContentChange();
        this.updateStatus();
    }

    // File operations
    newFile() {
        this.content = '';
        this.element.value = '';
        this.currentFile = null;
        this.setModified(false);
        this.clearHistory();
        this.clearAutosaveTimer(); // Clear autosave when creating new file
        this.updateStatus();
        this.triggerContentChange();
    }

    openFile(filePath, content) {
        this.content = content;
        this.element.value = content;
        this.currentFile = filePath;
        this.setModified(false);
        this.clearHistory();
        this.saveToHistory();
        this.clearAutosaveTimer(); // Clear any existing autosave timer
        this.updateStatus();
        this.triggerContentChange();
    }

    async save() {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-file', {
                filePath: this.currentFile,
                content: this.content
            });
            
            if (result.success) {
                this.currentFile = result.filePath;
                this.setModified(false);
                this.updateStatus();
                this.clearAutosaveTimer(); // Clear autosave timer since file is saved
                return true;
            } else {
                console.error('Save failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Save error:', error);
            return false;
        }
    }

    // Autosave functionality
    scheduleAutosave() {
        if (!this.autosaveEnabled || !this.currentFile || !this.isModified) {
            return;
        }
        
        this.clearAutosaveTimer();
        this.autosaveTimer = setTimeout(() => {
            this.performAutosave();
        }, this.autosaveInterval);
    }

    async performAutosave() {
        if (!this.currentFile || !this.isModified) {
            return;
        }
        
        try {
            console.log('[Editor] Performing autosave...');
            const success = await this.save();
            if (success) {
                console.log('[Editor] Autosave completed successfully');
                // Show subtle notification
                this.showNotification('Autosaved', 'success', 2000);
            } else {
                console.warn('[Editor] Autosave failed');
                // Reschedule autosave on failure
                this.scheduleAutosave();
            }
        } catch (error) {
            console.error('[Editor] Autosave error:', error);
            this.scheduleAutosave(); // Retry
        }
    }

    clearAutosaveTimer() {
        if (this.autosaveTimer) {
            clearTimeout(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    setAutosaveEnabled(enabled) {
        this.autosaveEnabled = enabled;
        if (enabled && this.currentFile && this.isModified) {
            this.scheduleAutosave();
        } else {
            this.clearAutosaveTimer();
        }
    }

    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
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
                           type === 'error' ? '#f44336' : '#2196F3',
            color: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        // Remove after duration
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // Status and UI updates
    updateStatus() {
        const statusElements = {
            wordCount: document.getElementById('word-count'),
            charCount: document.getElementById('char-count'),
            editorStatus: document.getElementById('editor-status'),
            filePathDisplay: document.getElementById('file-path-display')
        };

        // Update bottom status bar with file path
        if (statusElements.filePathDisplay) {
            if (this.currentFile) {
                statusElements.filePathDisplay.textContent = this.currentFile;
                statusElements.filePathDisplay.title = this.currentFile;
            } else {
                statusElements.filePathDisplay.textContent = 'No file opened - use Ctrl+S to save';
                statusElements.filePathDisplay.title = 'No file opened';
            }
        }

        if (statusElements.wordCount) {
            const wordCount = this.getWordCount();
            statusElements.wordCount.textContent = `${wordCount} words`;
        }

        if (statusElements.charCount) {
            const charCount = this.content.length;
            statusElements.charCount.textContent = `${charCount} characters`;
        }

        if (statusElements.editorStatus) {
            statusElements.editorStatus.textContent = this.isModified ? 'Modified' : 'Saved';
        }
    }

    updateCursorPosition() {
        const position = this.getCursorPosition();
        const positionElement = document.getElementById('cursor-position');
        if (positionElement) {
            positionElement.textContent = `Ln ${position.line}, Col ${position.column}`;
        }
    }

    getCursorPosition() {
        const pos = this.element.selectionStart;
        const textBeforeCursor = this.content.substring(0, pos);
        const lines = textBeforeCursor.split('\n');
        
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    }

    getWordCount() {
        return this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    setModified(modified) {
        this.isModified = modified;
        
        // Update window title
        if (typeof require !== 'undefined') {
            const { remote } = require('electron');
            if (remote && remote.getCurrentWindow) {
                const window = remote.getCurrentWindow();
                const title = this.currentFile ? 
                    `${this.currentFile.split(/[/\\]/).pop()}${modified ? ' •' : ''} - MarkDD Editor` :
                    `Untitled${modified ? ' •' : ''} - MarkDD Editor`;
                window.setTitle(title);
            }
        }
        
        // Handle autosave scheduling
        if (modified && this.currentFile) {
            this.scheduleAutosave();
        } else if (!modified) {
            this.clearAutosaveTimer();
        }
    }

    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
    }

    triggerContentChange() {
        // PERFORMANCE FIX: Reduced debounce for faster live preview
        if (this.contentChangeTimeout) {
            clearTimeout(this.contentChangeTimeout);
        }
        
        this.contentChangeTimeout = setTimeout(() => {
            // Dispatch custom event for other components to listen to
            const event = new CustomEvent('editor-content-changed', {
                detail: {
                    content: this.content,
                    isModified: this.isModified,
                    currentFile: this.currentFile
                }
            });
            document.dispatchEvent(event);
        }, 50); // Reduced from 150ms to 50ms for faster updates
    }

    // Public API
    getContent() {
        return this.content;
    }

    setContent(content) {
        this.content = content;
        this.element.value = content;
        this.setModified(false);
        this.saveToHistory();
        this.updateStatus();
        this.triggerContentChange();
    }

    // Alias for setContent() - used by tab switching system
    setValue(content) {
        this.setContent(content);
    }

    // Alias for getContent() - for API consistency
    getValue() {
        return this.getContent();
    }

    focus() {
        this.element.focus();
    }

    getCurrentFile() {
        return this.currentFile;
    }

    isFileModified() {
        return this.isModified;
    }

    getComprehensiveExample() {
        return `# MarkDD Editor - Complete Feature Showcase

Welcome to **MarkDD Editor**, a fully-featured Markdown editor with advanced rendering capabilities inspired by MarkText, VS Code MPE, and modern diagram tools.

## 🧮 Math Testing (Display Math)

Simple display math test:
$$\\int_{-\\infty}^{\\infty} e^{-\\frac{x^2}{2}} dx = \\sqrt{2\\pi}$$

Another display math:
$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

Quadratic formula with complex expressions:
$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\quad \\text{where } a \\neq 0$$

### Advanced LaTeX Environments

Maxwell's equations with proper curl notation:
$$\\begin{align}
\\nabla \\times \\vec{F} &= \\left(\\frac{\\partial F_z}{\\partial y} - \\frac{\\partial F_y}{\\partial z}\\right)\\hat{x} \\\\
&+ \\left(\\frac{\\partial F_x}{\\partial z} - \\frac{\\partial F_z}{\\partial x}\\right)\\hat{y} \\\\
&+ \\left(\\frac{\\partial F_y}{\\partial x} - \\frac{\\partial F_x}{\\partial y}\\right)\\hat{z}
\\end{align}$$

System of equations:
$$\\begin{equation}
\\begin{cases}
x + y = 5 \\\\
2x - y = 1
\\end{cases}
\\end{equation}$$

Matrix multiplication example:
$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix} \\begin{pmatrix}
x \\\\
y
\\end{pmatrix} = \\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

### Inline Math Examples

The famous equation $E = mc^2$ demonstrates mass-energy equivalence. Complex expressions like $\\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$ and $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$ work perfectly.

---

## 📝 Basic Markdown Features

### Text Formatting

This paragraph demonstrates various **bold text**, *italic text*, and ***bold italic text*** formatting options. You can also use ~~strikethrough~~ text and \`inline code\` formatting.

### Lists

#### Unordered Lists
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

#### Ordered Lists
1. First ordered item
2. Second ordered item
   1. Nested ordered item
   2. Another nested item
3. Third ordered item

### Blockquotes

> This is a blockquote example.
> It can span multiple lines and provide emphasis.
> 
> > Nested blockquotes are also supported.

---

## 🔢 Mathematical Expressions

### Inline Math

The famous equation $E = mc^2$ demonstrates mass-energy equivalence. You can also write complex expressions like $\\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$.

### Display Math

$$\\int_{-\\infty}^{\\infty} e^{-\\frac{x^2}{2}} dx = \\sqrt{2\\pi}$$

### LaTeX Environments

Maxwell's equations:

$$\\begin{align}
\\nabla \\times \\vec{F} &= \\left(\\frac{\\partial F_z}{\\partial y} - \\frac{\\partial F_y}{\\partial z}\\right)\\hat{x} \\\\
&+ \\left(\\frac{\\partial F_x}{\\partial z} - \\frac{\\partial F_z}{\\partial x}\\right)\\hat{y} \\\\
&+ \\left(\\frac{\\partial F_y}{\\partial x} - \\frac{\\partial F_x}{\\partial y}\\right)\\hat{z}
\\end{align}$$

System of equations:

$$\\begin{equation}
\\begin{cases}
x + y = 5 \\\\
2x - y = 1
\\end{cases}
\\end{equation}$$

Matrix examples:

$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix} \\begin{pmatrix}
x \\\\
y
\\end{pmatrix} = \\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

---

## � Diagrams and Visualizations

### Mermaid Diagrams

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
    C --> E[End]
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant User
    participant MarkDD
    participant Renderer
    
    User->>MarkDD: Type markdown
    MarkDD->>Renderer: Process content
    Renderer-->>MarkDD: Return HTML
    MarkDD-->>User: Display preview
\`\`\`

### TikZ Diagrams (Obsidian-style)

\`\`\`tikz
\\begin{tikzpicture}[circuit ee IEC]
  \\draw (0,0) to [resistor] (2,0)
          to [capacitor] (2,2)
          to [inductor] (0,2)
          to [voltage source] (0,0);
  \\draw (2,0) to [ammeter] (4,0);
\\end{tikzpicture}
\`\`\`

---

## �💻 Code Highlighting

### JavaScript Example

\`\`\`javascript
// Enhanced markdown renderer with KaTeX support
class MarkdownRenderer {
    constructor(options = {}) {
        this.marked = options.marked || window.marked;
        this.katex = options.katex || window.katex;
    }
    
    render(markdown) {
        return this.marked.parse(markdown);
    }
}
\`\`\`

### Python Example

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt

def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    
    return fib
\`\`\`

---

## 📋 Tables

| Feature | Status | Notes |
|---------|--------|--------|
| Math Rendering | ✅ Complete | KaTeX v0.16.22 |
| Mermaid Diagrams | ✅ Complete | v11.4.1 |
| TikZ Support | ✅ Complete | TikZJax integration |
| Code Highlighting | ✅ Complete | Highlight.js v11.8.0 |
| Export Functions | ✅ Complete | HTML, PDF support |

---

## ✅ Task Lists

- [x] Implement basic markdown rendering
- [x] Add mathematical expression support
- [x] Integrate diagram rendering
- [ ] Add collaboration features
- [ ] Implement plugin system
- [x] Create export functionality

---

## 🎯 Getting Started

1. **Installation**: Download and install MarkDD Editor
2. **Create New File**: Use Ctrl+N or click the New File button
3. **Start Writing**: Begin typing your markdown content
4. **Live Preview**: See your content rendered in real-time
5. **Export**: Save as HTML or PDF when finished

This comprehensive showcase demonstrates the full power of MarkDD Editor. Every feature is designed to enhance your markdown writing experience with professional-grade rendering and export capabilities.

**Try editing this content to see all features in action!** The live preview will update automatically as you type, making it easy to see exactly how your content will look.

---

## 🎨 Advanced Diagram Examples

### CircuiTikZ Circuit

\`\`\`circuitikz
\\draw (0,0) to[battery, l=$V$] (0,2)
      to[resistor, l=$R$] (2,2)
      to[capacitor, l=$C$] (2,0)
      to[short] (0,0);
\`\`\`

### Graphviz Diagrams

\`\`\`graphviz
digraph G {
    rankdir=LR;
    node [shape=box, style=filled, fillcolor=lightblue];
    
    MarkDD -> Renderer;
    Renderer -> KaTeX;
    Renderer -> Mermaid;
    Renderer -> TikZ;
    Renderer -> Graphviz;
    KaTeX -> Preview;
    Mermaid -> Preview;
    TikZ -> Preview;
    Graphviz -> Preview;
}
\`\`\`

### PlantUML Diagrams

\`\`\`plantuml
@startuml
participant User
participant MarkDD
participant Renderer
participant Libraries

User -> MarkDD: Type markdown
activate MarkDD

MarkDD -> Renderer: Parse content
activate Renderer

Renderer -> Libraries: Process diagrams
activate Libraries
Libraries --> Renderer: Rendered HTML
deactivate Libraries

Renderer --> MarkDD: Processed HTML
deactivate Renderer

MarkDD --> User: Live preview
deactivate MarkDD
@enduml
\`\`\`

### Vega-Lite Charts

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Sample Bar Chart",
  "data": {
    "values": [
      {"category": "Math", "value": 98},
      {"category": "Diagrams", "value": 95},
      {"category": "Code", "value": 92},
      {"category": "Export", "value": 90}
    ]
  },
  "mark": {"type": "bar", "color": "#4285f4"},
  "encoding": {
    "x": {"field": "category", "type": "nominal", "title": "Features"},
    "y": {"field": "value", "type": "quantitative", "title": "Completion %"}
  }
}
\`\`\`

### ABC Music Notation

\`\`\`abc
X: 1
T: Twinkle, Twinkle, Little Star
K: C
CCGGAAG2|FFEEDDC2|
GGFFEED2|GGFFEED2|
CCGGAAG2|FFEEDDC2|
\`\`\`

---

## 📋 Enhanced Features Table

| Feature | Technology | Status | Performance | Notes |
|---------|------------|--------|-------------|--------|
| Math Rendering | KaTeX v0.16.22 | ✅ Complete | Excellent | Real-time LaTeX processing |
| Mermaid Diagrams | Mermaid v11.4.1 | ✅ Complete | Very Good | Flowcharts, sequences, gantt |
| TikZ Support | TikZJax | ✅ Complete | Good | Obsidian-style integration |
| Graphviz | Viz.js | ✅ Complete | Good | DOT language support |
| Vega Charts | Vega-Lite v5 | ✅ Complete | Excellent | Interactive visualizations |
| Code Highlighting | Highlight.js v11.8.0 | ✅ Complete | Excellent | 180+ languages supported |
| ABC Music | ABCJS | ✅ Complete | Good | Music notation rendering |
| PlantUML | PlantUML Server | ✅ Complete | Good | UML diagram support |
| Export Functions | Custom Implementation | ✅ Complete | Very Good | HTML, PDF formats |
| Mind Mapping | Markmap Integration | ✅ Complete | Excellent | Interactive mind maps |

---

## 🗺️ Mind Mapping (Markmap)

Click the **Markmap** button in the toolbar to visualize this document structure as an interactive mind map!

### Document Structure Overview
- MarkDD Editor Features
  - Basic Markdown
    - Text Formatting
    - Lists and Tables
    - Links and Images
  - Mathematical Expressions
    - Inline Math
    - Display Math  
    - LaTeX Environments
  - Diagram Support
    - Mermaid Diagrams
    - TikZ/CircuiTikZ
    - Graphviz
    - PlantUML
    - Vega-Lite Charts
  - Advanced Features
    - Code Highlighting
    - Export Options
    - Mind Mapping
    - Interactive Elements

---

## 📊 Advanced Data Visualization

### Multi-Series Vega Chart

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Quarterly Sales and Profit Trends",
  "data": {
    "values": [
      {"quarter": "Q1", "metric": "Sales", "value": 120},
      {"quarter": "Q2", "metric": "Sales", "value": 135},
      {"quarter": "Q3", "metric": "Sales", "value": 150},
      {"quarter": "Q4", "metric": "Sales", "value": 165},
      {"quarter": "Q1", "metric": "Profit", "value": 25},
      {"quarter": "Q2", "metric": "Profit", "value": 30},
      {"quarter": "Q3", "metric": "Profit", "value": 35},
      {"quarter": "Q4", "metric": "Profit", "value": 40}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "quarter", "type": "ordinal", "title": "Quarter"},
    "y": {"field": "value", "type": "quantitative", "title": "Amount ($K)"},
    "color": {"field": "metric", "type": "nominal", "title": "Metric"}
  }
}
\`\`\`

---

## 📚 References & API Documentation

### Core Technologies & APIs

#### LaTeX.js - Advanced LaTeX Rendering
- **API Documentation**: [https://latex.js.org/api.html#parser](https://latex.js.org/api.html#parser)
- **Usage**: Full LaTeX document rendering with proper parser support
- **Features**: Complete equation environments, custom macros, bibliography support

#### Mathematical Rendering Stack
- **KaTeX**: Fast math rendering engine - [katex.org](https://katex.org)
- **MathJax**: Comprehensive math display - [mathjax.org](https://www.mathjax.org)
- **LaTeX.js**: Full LaTeX document support - [latex.js.org](https://latex.js.org)

#### Diagram & Visualization Libraries
- **Mermaid**: Flowcharts & diagrams - [mermaid.js.org](https://mermaid.js.org)
- **Markmap**: Mind mapping - [markmap.js.org](https://markmap.js.org)
- **TikZ**: Scientific diagrams - [tikz.dev](https://tikz.dev)
- **GraphViz**: Graph visualization - [graphviz.org](https://graphviz.org)
- **Vega-Lite**: Grammar of graphics - [vega.github.io](https://vega.github.io/vega-lite)
- **PlantUML**: UML diagrams - [plantuml.com](https://plantuml.com)

#### Advanced Features
- **Code Highlighting**: highlight.js - [highlightjs.org](https://highlightjs.org)
- **ABC Notation**: Music notation - [abcnotation.com](https://abcnotation.com)
- **WaveDrom**: Digital timing diagrams - [wavedrom.com](https://wavedrom.com)

### Implementation References
All source implementations are available in the \`References/\` directory:
- **markmap-master/**: Complete Markmap library source
- **vscode-markdown-preview-enhanced-develop/**: Advanced preview engine
- **mermaid-develop/**: Mermaid diagram engine
- **carta-master/**: Modern markdown editor framework
- **marktext-develop/**: Professional markdown editor

### Best Practices
1. Use proper code fencing for syntax highlighting
2. Include language specifiers for all code blocks
3. Test mathematical expressions in both inline and block modes
4. Validate diagram syntax before rendering
5. Leverage export functionality for sharing visualizations

---

*MarkDD Editor - Powered by modern web technologies and open source libraries*`;
    }

    async loadComprehensiveShowcase() {
        console.log('[Editor] ⚡ loadComprehensiveShowcase() STARTED');
        try {
            // First try to load the actual file from disk
            const fs = require('fs');
            const path = require('path');
            
            // Try multiple possible locations for the showcase file
            const possiblePaths = [
                path.join(process.cwd(), 'COMPREHENSIVE-FEATURES-SHOWCASE.md'),
                path.join(__dirname, '..', '..', '..', 'COMPREHENSIVE-FEATURES-SHOWCASE.md'),
                path.join(process.env.INIT_CWD || process.cwd(), 'COMPREHENSIVE-FEATURES-SHOWCASE.md'),
                'C:\\Users\\DD\\Desktop\\MARKDD\\WP\\COMPREHENSIVE-FEATURES-SHOWCASE.md'
            ];
            
            console.log('[Editor] Current working directory:', process.cwd());
            console.log('[Editor] __dirname:', __dirname);
            console.log('[Editor] process.env.INIT_CWD:', process.env.INIT_CWD);
            console.log('[Editor] Trying showcase file paths:', possiblePaths);
            
            for (let i = 0; i < possiblePaths.length; i++) {
                const showcaseFilePath = possiblePaths[i];
                console.log(`[Editor] Checking path ${i + 1}/${possiblePaths.length}: ${showcaseFilePath}`);
                console.log(`[Editor] Path exists: ${fs.existsSync(showcaseFilePath)}`);
                
                if (fs.existsSync(showcaseFilePath)) {
                    console.log(`[Editor] ✅ FOUND file at: ${showcaseFilePath}`);
                    const content = fs.readFileSync(showcaseFilePath, 'utf8');
                    console.log(`[Editor] Read content length: ${content.length} characters`);
                    console.log(`[Editor] Content preview (first 200 chars): ${content.substring(0, 200)}`);
                    
                    this.currentFile = showcaseFilePath;
                    this.setContent(content);
                    this.isModified = false;
                    this.updateStatus();
                    this.setupAutosave();
                    
                    // Force immediate preview update with actual content
                    console.log('🔥🔥🔥 [Editor] FORCING IMMEDIATE PREVIEW UPDATE with actual file content');
                    console.log('🔥🔥🔥 [Editor] Content preview (first 200 chars):', content.substring(0, 200));
                    setTimeout(() => {
                        this.triggerContentChange();
                    }, 100); // Give a moment for everything to initialize
                    
                    console.log('✅ [Editor] Successfully loaded actual showcase file from disk:', showcaseFilePath);
                    return;
                }
            }
            
            console.log('[Editor] ❌ Showcase file not found in any location, creating it...');
            await this.createShowcaseFile();
            
        } catch (error) {
            console.error('[Editor] ❌ ERROR in loadComprehensiveShowcase:', error);
            // Fallback to hardcoded content
            this.setContent(this.getCleanComprehensiveExample());
            console.log('[Editor] Using clean hardcoded comprehensive example');
        }
    }

    async createShowcaseFile() {
        try {
            const fs = require('fs');
            const path = require('path');
            const showcaseContent = this.getCleanComprehensiveExample();
            const showcaseFilePath = path.join(process.cwd(), 'COMPREHENSIVE-FEATURES-SHOWCASE.md');
            
            fs.writeFileSync(showcaseFilePath, showcaseContent, 'utf8');
            
            this.currentFile = showcaseFilePath;
            this.setContent(showcaseContent);
            this.isModified = false;
            this.updateStatus();
            this.setupAutosave();
            
            console.log('✅ Created and loaded new showcase file:', showcaseFilePath);
        } catch (error) {
            console.error('❌ Failed to create showcase file:', error);
            // Fallback to memory-only content
            this.setContent(this.getCleanComprehensiveExample());
        }
    }

    getCleanComprehensiveExample() {
        return `# MarkDD Editor - Complete Feature Showcase

Welcome to **MarkDD Editor**, a fully-featured Markdown editor with advanced rendering capabilities inspired by MarkText, VS Code MPE, and modern diagram tools.

## 🧮 Math Testing (Display Math)

Simple display math test:
$$\\int_{-\\infty}^{\\infty} e^{-\\frac{x^2}{2}} dx = \\sqrt{2\\pi}$$

Another display math:
$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$

Quadratic formula with complex expressions:
$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a} \\quad \\text{where } a \\neq 0$$

### Advanced LaTeX Environments

Maxwell's equations with proper curl notation:
$$\\begin{align}
\\nabla \\times \\vec{F} &= \\left(\\frac{\\partial F_z}{\\partial y} - \\frac{\\partial F_y}{\\partial z}\\right)\\hat{x} \\\\
&+ \\left(\\frac{\\partial F_x}{\\partial z} - \\frac{\\partial F_z}{\\partial x}\\right)\\hat{y} \\\\
&+ \\left(\\frac{\\partial F_y}{\\partial x} - \\frac{\\partial F_x}{\\partial y}\\right)\\hat{z}
\\end{align}$$

System of equations:
$$\\begin{equation}
\\begin{cases}
x + y = 5 \\\\
2x - y = 1
\\end{cases}
\\end{equation}$$

Matrix multiplication example:
$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix} \\begin{pmatrix}
x \\\\
y
\\end{pmatrix} = \\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}$$

### Inline Math Examples

The famous equation $E = mc^2$ demonstrates mass-energy equivalence. Complex expressions like $\\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$ and $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$ work perfectly.

---

## 📝 Basic Markdown Features

### Text Formatting

This paragraph demonstrates various **bold text**, *italic text*, and ***bold italic text*** formatting options. You can also use ~~strikethrough~~ text and \`inline code\` formatting.

### Lists

#### Unordered Lists
- First item
- Second item
  - Nested item
  - Another nested item
    - Deep nested item
- Third item

#### Ordered Lists
1. First ordered item
2. Second ordered item
   1. Nested ordered item
   2. Another nested item
3. Third ordered item

### Task Lists
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task
- [ ] Task with **formatting** and \`code\`

### Blockquotes

> This is a blockquote example.
> It can span multiple lines and provide emphasis.
> 
> > Nested blockquotes are also supported.
> > > Even deeper nesting works!

---

## 📊 Diagrams and Visualizations

### Mermaid Diagrams

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> A
    C --> E[End]
\`\`\`

#### Sequence Diagram
\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob, how are you?
    B-->>A: Great thanks!
    A->>B: See you later!
\`\`\`

### GraphViz Diagrams

\`\`\`dot
digraph G {
    A -> B;
    B -> C;
    C -> D;
    D -> A;
    B -> D;
}
\`\`\`

### TikZ Diagrams (Obsidian Style)

\`\`\`tikz
\\begin{tikzpicture}
\\draw (0,0) circle (1cm);
\\draw (-1,0) -- (1,0);
\\draw (0,-1) -- (0,1);
\\node at (0,1.5) {TikZ Circle};
\\end{tikzpicture}
\`\`\`

### PlantUML Diagrams

\`\`\`plantuml
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response
@enduml
\`\`\`

---

## 💻 Code Examples

### JavaScript
\`\`\`javascript
function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10)); // 55
\`\`\`

### Python
\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)

print(quicksort([3,6,8,10,1,2,1]))
\`\`\`

---

## 📋 Tables

| Feature | Status | Priority |
|---------|--------|----------|
| Math Rendering | ✅ Complete | High |
| Mermaid Diagrams | ✅ Complete | High |
| GraphViz | ✅ Complete | High |
| TikZ Support | ✅ Complete | Medium |
| Export PDF | ✅ Complete | Medium |

---

## 🎨 Advanced Features

### Custom Containers

:::warning Custom Warning
This is a custom warning container that can contain **formatted** text and \`code\`.
:::

:::info Information
This is an information container with important details.
:::

### Footnotes

Here's a sentence with a footnote[^1]. And another one[^2].

[^1]: This is the first footnote.
[^2]: This is the second footnote with **formatting**.

### Keyboard Shortcuts

Press [[Ctrl+S]] to save, [[Ctrl+O]] to open, and [[Ctrl+N]] to create a new file.

### Emoji Support

🚀 Rocket launch! 📊 Charts and graphs! 🧮 Mathematics!

---

*This showcase demonstrates the comprehensive capabilities of MarkDD Editor. Every feature shown here is fully functional and ready to use!*

**Version**: 1.0.0  
**Last Updated**: September 12, 2025  
**License**: MIT`;
    }

    setupAutosave() {
        // Simple autosave functionality - can be enhanced later
        console.log('[Editor] Autosave setup completed');
        // For now, just log that it's set up - no actual autosave logic needed
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
} else {
    window.Editor = Editor;
}
