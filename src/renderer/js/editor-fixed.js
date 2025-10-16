class Editor {
    constructor() {
        this.element = document.getElementById('editor');
        this.content = '';
        this.isModified = false;
        this.currentFilePath = null;
        this.currentFileName = 'Untitled';
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoStack = 100;
        
        this.init();
        
        // Search and replace functionality
        this.searchReplaceModal = window.SearchReplaceModal ? new SearchReplaceModal(this) : null;
        
        // Initialize with comprehensive sample content if empty
        if (!this.content.trim()) {
            this.setContent(this.getComprehensiveExample());
        }
    }

    init() {
        this.setupEventListeners();
        this.setupShortcuts();
        this.updateStatus();
    }

    setupEventListeners() {
        // Content change events
        this.element.addEventListener('input', (e) => {
            this.content = this.element.value;
            this.setModified(true);
            this.updateWordCount();
            this.updateCursorPosition();
            this.saveToUndoStack();
            
            // Trigger preview update via proper event dispatch
            this.triggerContentChange();
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
        const cursorPosition = this.element.selectionStart;
        const currentLine = this.getCurrentLine(cursorPosition);
        
        // Auto-continue lists
        const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s/);
        if (listMatch) {
            e.preventDefault();
            const indent = listMatch[1];
            const listMarker = listMatch[2];
            
            // If line is empty list item, remove it
            if (currentLine.trim() === listMarker) {
                this.removeCurrentListItem();
            } else {
                // Continue the list
                const nextMarker = this.getNextListMarker(listMarker);
                this.insertText(`\n${indent}${nextMarker} `);
            }
        }
    }

    getCurrentLine(position) {
        const lines = this.content.substring(0, position).split('\n');
        return lines[lines.length - 1];
    }

    getNextListMarker(marker) {
        if (/\d+/.test(marker)) {
            const num = parseInt(marker);
            return `${num + 1}.`;
        }
        return marker;
    }

    removeCurrentListItem() {
        const cursorPosition = this.element.selectionStart;
        const lines = this.content.split('\n');
        const lineIndex = this.content.substring(0, cursorPosition).split('\n').length - 1;
        
        lines[lineIndex] = '';
        this.setContent(lines.join('\n'));
        
        // Position cursor at beginning of now-empty line
        const newPosition = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
        this.element.setSelectionRange(newPosition, newPosition);
    }

    // Text manipulation methods
    insertText(text) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        
        this.element.setRangeText(text, start, end, 'end');
        this.content = this.element.value;
        this.setModified(true);
        this.updateWordCount();
        
        // Trigger preview update via event system
        this.triggerContentChange();
    }

    replaceSelection(text) {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        
        this.element.setRangeText(text, start, end, 'select');
        this.content = this.element.value;
        this.setModified(true);
        this.updateWordCount();
    }

    getSelectedText() {
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        return this.content.substring(start, end);
    }

    // Formatting methods
    toggleBold() {
        this.wrapSelection('**', '**');
    }

    toggleItalic() {
        this.wrapSelection('*', '*');
    }

    toggleCode() {
        this.wrapSelection('`', '`');
    }

    wrapSelection(before, after) {
        const selectedText = this.getSelectedText();
        const start = this.element.selectionStart;
        const end = this.element.selectionEnd;
        
        if (selectedText) {
            // Check if already wrapped
            const beforeStart = Math.max(0, start - before.length);
            const afterEnd = Math.min(this.content.length, end + after.length);
            
            const textBefore = this.content.substring(beforeStart, start);
            const textAfter = this.content.substring(end, afterEnd);
            
            if (textBefore === before && textAfter === after) {
                // Remove wrapping
                this.element.setRangeText(selectedText, beforeStart, afterEnd, 'end');
            } else {
                // Add wrapping
                this.replaceSelection(`${before}${selectedText}${after}`);
            }
        } else {
            // Insert wrapping with cursor in middle
            this.insertText(`${before}${after}`);
            const newPosition = this.element.selectionStart - after.length;
            this.element.setSelectionRange(newPosition, newPosition);
        }
        
        this.element.focus();
    }

    // Insert methods for toolbar
    insertHeading() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`# ${selectedText}`);
        } else {
            this.insertText('# Heading');
            // Select the word "Heading"
            const start = this.element.selectionStart - 7;
            const end = this.element.selectionStart;
            this.element.setSelectionRange(start, end);
        }
        this.element.focus();
    }

    insertLink() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`[${selectedText}](url)`);
            // Select "url"
            const start = this.element.selectionStart - 4;
            const end = this.element.selectionStart - 1;
            this.element.setSelectionRange(start, end);
        } else {
            this.insertText('[link text](url)');
            // Select "link text"
            const start = this.element.selectionStart - 15;
            const end = this.element.selectionStart - 6;
            this.element.setSelectionRange(start, end);
        }
        this.element.focus();
    }

    insertImage() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`![${selectedText}](image-url)`);
        } else {
            this.insertText('![alt text](image-url)');
            // Select "alt text"
            const start = this.element.selectionStart - 21;
            const end = this.element.selectionStart - 12;
            this.element.setSelectionRange(start, end);
        }
        this.element.focus();
    }

    insertTable() {
        const table = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
        
        this.insertText('\n' + table + '\n');
        this.element.focus();
    }

    insertMath() {
        const selectedText = this.getSelectedText();
        if (selectedText) {
            this.replaceSelection(`$${selectedText}$`);
        } else {
            this.insertText('$E = mc^2$');
            // Select the math content
            const start = this.element.selectionStart - 8;
            const end = this.element.selectionStart - 1;
            this.element.setSelectionRange(start, end);
        }
        this.element.focus();
    }

    insertMermaidDiagram() {
        const diagram = `\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> D
\`\`\``;
        this.insertText('\n' + diagram + '\n');
        this.element.focus();
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

    insertTikZ() {
        const tikz = `\`\`\`tikz
\\draw (0,0) -- (2,0) -- (2,1) -- (0,1) -- cycle;
\\draw (1,0.5) circle (0.3);
\`\`\``;
        this.insertText('\n' + tikz + '\n');
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

    // File operations
    newFile() {
        if (this.isModified) {
            const save = confirm('Save changes before creating new file?');
            if (save) {
                this.save();
            }
        }
        
        this.content = '';
        this.element.value = '';
        this.currentFilePath = null;
        this.currentFileName = 'Untitled';
        this.setModified(false);
        this.updateStatus();
        this.updateWordCount();
        
        // Load comprehensive example for new files
        this.setContent(this.getComprehensiveExample());
    }

    async openFile() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'Markdown files', extensions: ['md', 'markdown'] },
                    { name: 'Text files', extensions: ['txt'] },
                    { name: 'All files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const content = await window.electronAPI.readFile(filePath);
                
                this.setContent(content);
                this.currentFilePath = filePath;
                this.currentFileName = filePath.split(/[/\\]/).pop();
                this.setModified(false);
                this.updateStatus();
            }
        } catch (error) {
            console.error('Error opening file:', error);
            alert('Error opening file: ' + error.message);
        }
    }

    async save() {
        if (this.currentFilePath) {
            await this.saveToFile(this.currentFilePath);
        } else {
            await this.saveAs();
        }
    }

    async saveAs() {
        try {
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: this.currentFileName,
                filters: [
                    { name: 'Markdown files', extensions: ['md'] },
                    { name: 'Text files', extensions: ['txt'] },
                    { name: 'All files', extensions: ['*'] }
                ]
            });

            if (!result.canceled) {
                await this.saveToFile(result.filePath);
                this.currentFilePath = result.filePath;
                this.currentFileName = result.filePath.split(/[/\\]/).pop();
                this.updateStatus();
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file: ' + error.message);
        }
    }

    async saveToFile(filePath) {
        try {
            await window.electronAPI.writeFile(filePath, this.content);
            this.setModified(false);
            console.log('File saved successfully:', filePath);
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    }

    // Undo/Redo functionality
    saveToUndoStack() {
        // Debounce to avoid too many undo states
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }
        
        this.undoTimeout = setTimeout(() => {
            if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== this.content) {
                this.undoStack.push(this.content);
                if (this.undoStack.length > this.maxUndoStack) {
                    this.undoStack.shift();
                }
                this.redoStack = []; // Clear redo stack when new action is performed
            }
        }, 1000);
    }

    undo() {
        if (this.undoStack.length > 0) {
            this.redoStack.push(this.content);
            const previousContent = this.undoStack.pop();
            this.setContent(previousContent, false); // Don't save to undo stack
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            this.undoStack.push(this.content);
            const nextContent = this.redoStack.pop();
            this.setContent(nextContent, false); // Don't save to undo stack
        }
    }

    // Search functionality
    showSearchBar(replace = false) {
        const searchBar = document.getElementById('editor-search-bar');
        const replaceInput = document.getElementById('editor-replace-input');
        const replaceBtn = document.getElementById('editor-replace-btn');
        const replaceAllBtn = document.getElementById('editor-replace-all-btn');
        
        searchBar.style.display = 'flex';
        
        if (replace) {
            replaceInput.style.display = 'block';
            replaceBtn.style.display = 'block';
            replaceAllBtn.style.display = 'block';
        } else {
            replaceInput.style.display = 'none';
            replaceBtn.style.display = 'none';
            replaceAllBtn.style.display = 'none';
        }
        
        document.getElementById('editor-search-input').focus();
    }

    hideSearchBar() {
        document.getElementById('editor-search-bar').style.display = 'none';
    }

    // Content management
    setContent(content, saveToUndo = true) {
        this.content = content;
        this.element.value = content;
        this.updateWordCount();
        this.updateCursorPosition();
        
        if (saveToUndo) {
            this.saveToUndoStack();
        }
        
        // Trigger preview update via event system
        this.triggerContentChange();
    }

    getContent() {
        return this.content;
    }

    setModified(modified) {
        this.isModified = modified;
        this.updateStatus();
    }

    updateStatus() {
        const fileStatus = document.getElementById('file-status');
        const currentFileDisplay = document.getElementById('currentFileDisplay');
        
        if (fileStatus) {
            const status = this.currentFilePath ? this.currentFileName : 'Untitled';
            const modified = this.isModified ? ' •' : '';
            fileStatus.textContent = status + modified;
        }
        
        if (currentFileDisplay) {
            const displayName = this.currentFilePath ? this.currentFileName : 'No file opened';
            const modified = this.isModified ? ' (modified)' : '';
            currentFileDisplay.textContent = displayName + modified;
        }
    }

    updateWordCount() {
        const words = this.content.trim() ? this.content.trim().split(/\s+/).length : 0;
        const chars = this.content.length;
        
        const wordCountEl = document.getElementById('word-count');
        const charCountEl = document.getElementById('char-count');
        
        if (wordCountEl) wordCountEl.textContent = `${words} words`;
        if (charCountEl) charCountEl.textContent = `${chars} characters`;
    }

    updateCursorPosition() {
        const position = this.element.selectionStart;
        const lines = this.content.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        
        const cursorPosEl = document.getElementById('cursor-position');
        if (cursorPosEl) {
            cursorPosEl.textContent = `Ln ${line}, Col ${column}`;
        }
    }

    isFileModified() {
        return this.isModified;
    }

    getComprehensiveExample() {
        return `# MarkDD Editor - Complete Feature Showcase

Welcome to **MarkDD Editor**, a fully-featured Markdown editor with advanced rendering capabilities inspired by MarkText, VS Code MPE, and modern diagram tools.

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

## 🔢 Mathematical Expressions (KaTeX)

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

## 🔬 Diagrams and Visualizations

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

## 💻 Enhanced Code Examples

### JavaScript with Advanced Features

\`\`\`javascript
// Enhanced markdown renderer with full feature support
class MarkdownRenderer {
    constructor(options = {}) {
        this.marked = options.marked || window.marked;
        this.katex = options.katex || window.katex;
        this.mermaid = options.mermaid || window.mermaid;
        this.viz = options.viz || window.Viz;
    }
    
    async render(markdown) {
        const html = this.marked.parse(markdown);
        await this.processDiagrams(html);
        return html;
    }
    
    async processDiagrams(container) {
        // Process all diagram types
        await this.processMermaidDiagrams(container);
        await this.processTikZDiagrams(container);
        await this.processVegaDiagrams(container);
        await this.processGraphvizDiagrams(container);
        this.processKaTeXMath(container);
    }
}
\`\`\`

### Python with Data Science

\`\`\`python
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import pandas as pd

def create_sample_data():
    """Generate sample data for demonstration."""
    np.random.seed(42)
    x = np.linspace(0, 10, 100)
    y = 2 * x + 1 + np.random.normal(0, 1, 100)
    return x.reshape(-1, 1), y

def analyze_data(X, y):
    """Perform comprehensive data analysis."""
    model = LinearRegression()
    model.fit(X, y)
    
    # Create DataFrame for analysis
    df = pd.DataFrame({
        'x': X.flatten(),
        'y': y,
        'predicted': model.predict(X)
    })
    
    return model, df

# Generate data and analyze
X, y = create_sample_data()
model, df = analyze_data(X, y)
print(f"Slope: {model.coef_[0]:.2f}, Intercept: {model.intercept_:.2f}")
print(f"R² Score: {model.score(X, y):.3f}")
\`\`\`

---

## 📋 Advanced Tables with All Features

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

## ✅ Interactive Task Lists

### Core Features
- [x] Implement basic markdown rendering with Marked.js
- [x] Add mathematical expression support with KaTeX
- [x] Integrate Mermaid diagram rendering
- [x] Add TikZ/CircuiTikZ support (Obsidian-style)
- [x] Implement Graphviz diagram support
- [x] Add Vega-Lite chart visualization
- [x] Include PlantUML diagram support
- [x] Add ABC music notation rendering
- [x] Create comprehensive export functionality
- [x] Implement live preview with scroll synchronization

### Advanced Features
- [x] Add mind mapping with Markmap integration
- [x] Implement file browser and management
- [x] Create toolbar with quick insert buttons
- [x] Add search and replace functionality
- [x] Implement theme switching (light/dark)
- [x] Add status bar with word/character count
- [ ] Implement collaborative editing features
- [ ] Add plugin marketplace integration
- [ ] Create mobile companion app

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

## 📊 Data Visualization Gallery

### Vega-Lite Multi-Series Chart

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Quarterly Performance Trends",
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

## 🎯 Getting Started Guide

### Basic Workflow

1. **Create New File**: Use Ctrl+N or click the New File button in the toolbar
2. **Start Writing**: Begin typing your markdown content in the left editor pane
3. **Live Preview**: Watch your content render in real-time in the right preview pane
4. **Add Elements**: Use toolbar buttons for quick insertion of various elements
5. **Insert Math**: Use $ for inline math and $$ for display math with LaTeX syntax
6. **Add Diagrams**: Use code blocks with language specifiers (mermaid, tikz, vega-lite, etc.)
7. **Save Work**: Save your document with Ctrl+S
8. **Export**: Export to HTML or PDF using the export buttons

### Essential Keyboard Shortcuts

| Action | Windows/Linux | Description |
|--------|---------------|-------------|
| New File | Ctrl+N | Create a new markdown document |
| Open File | Ctrl+O | Open an existing file |
| Save | Ctrl+S | Save the current document |
| Bold | Ctrl+B | Make selected text bold |
| Italic | Ctrl+I | Make selected text italic |
| Find | Ctrl+F | Open find dialog |
| Replace | Ctrl+H | Open find and replace dialog |

---

## 🌟 Advanced Features

### Custom Blocks and Admonitions

> [!NOTE] Information Block
> This is an informational note that provides helpful context.

> [!WARNING] Important Warning
> This is a warning that highlights important considerations.

> [!TIP] Professional Tip
> Use the markmap feature to visualize document structure!

### Footnotes and References

This text has a footnote[^1]. You can also reference multiple footnotes[^2] in the same document.

[^1]: This is the first footnote with additional information.
[^2]: This is the second footnote explaining more details.

### Definition Lists

Markdown
: A lightweight markup language with plain text formatting syntax.

MarkDD Editor  
: A full-featured markdown editor with advanced rendering capabilities.
: Supports mathematical expressions, diagrams, and multiple export formats.

---

This comprehensive showcase demonstrates the full power of MarkDD Editor. Every feature is designed to enhance your markdown writing experience with professional-grade rendering and export capabilities.

**Try editing this content to see all features in action!** The live preview will update automatically as you type, making it easy to see exactly how your content will look.`;
    }

    triggerContentChange() {
        // Dispatch custom event for other components to listen to
        const event = new CustomEvent('editor-content-changed', {
            detail: {
                content: this.content,
                isModified: this.isModified,
                currentFile: this.currentFile
            }
        });
        document.dispatchEvent(event);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
} else {
    window.Editor = Editor;
}
