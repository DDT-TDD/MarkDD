class Editor {
    // --- In-Editor Search & Replace ---
    // All legacy search bar code removed. Only SearchReplaceModal is used.
    // Toggle spellcheck on the editor textarea
    static setSpellcheck(enabled) {
        const textarea = document.getElementById('editor');
        if (textarea) textarea.spellcheck = !!enabled;
    }
    constructor(editorElement) {
        this.element = editorElement;
        this.content = '';
        this.currentFile = null;
        this.isModified = false;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 100;
        
        this.init();
    }

    init() {
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

        // Initialize with comprehensive sample content if empty
        if (!this.content) {
            this.setContent(this.getComprehensiveExample());
        }
    }

    setupEventListeners() {
        // Content change tracking
        this.element.addEventListener('input', (e) => {
            this.content = e.target.value;
            this.setModified(true);
            this.saveToHistory();
            this.updateStatus();
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

    // Status and UI updates
    updateStatus() {
        const statusElements = {
            fileStatus: document.getElementById('file-status'),
            wordCount: document.getElementById('word-count'),
            charCount: document.getElementById('char-count'),
            editorStatus: document.getElementById('editor-status'),
            currentFileDisplay: document.getElementById('currentFileDisplay')
        };

        if (statusElements.fileStatus) {
            const fileName = this.currentFile ? 
                this.currentFile.split(/[/\\]/).pop() : 
                'Untitled';
            const modified = this.isModified ? ' •' : '';
            statusElements.fileStatus.textContent = fileName + modified;
        }

        // Update toolbar file display
        if (statusElements.currentFileDisplay) {
            const fileName = this.currentFile ? 
                this.currentFile.split(/[/\\]/).pop() : 
                'No file opened';
            const modified = this.isModified ? ' •' : '';
            statusElements.currentFileDisplay.textContent = fileName + modified;
            statusElements.currentFileDisplay.title = this.currentFile || 'No file opened';
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
    }

    clearHistory() {
        this.history = [];
        this.historyIndex = -1;
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

**Try editing this content to see all features in action!** The live preview will update automatically as you type, making it easy to see exactly how your content will look.`;

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

### LaTeX Document with Math

\`\`\`latex
\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{tikz}

\\begin{document}
\\title{Advanced Mathematical Expressions in MarkDD}
\\author{MarkDD Editor Team}
\\date{\\today}
\\maketitle

\\section{Calculus and Analysis}
The fundamental theorem of calculus:
\\begin{equation}
\\int_a^b f'(x) dx = f(b) - f(a)
\\end{equation}

\\section{Linear Algebra}
For matrices $A, B \\in \\mathbb{R}^{n \\times n}$:
\\begin{align}
\\det(AB) &= \\det(A) \\det(B) \\\\
(AB)^T &= B^T A^T \\\\
\\text{tr}(AB) &= \\text{tr}(BA)
\\end{align}

\\section{Complex Analysis}
Euler's formula:
\\begin{equation}
e^{i\\theta} = \\cos\\theta + i\\sin\\theta
\\end{equation}
\\end{document}
\`\`\`

---

## 📋 Advanced Tables with Features

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

### Sales Performance Dataset

| Quarter | Sales ($K) | Profit ($K) | Growth (%) | Region |
|---------|------------|-------------|------------|---------|
| Q1 2024 | 120 | 25 | 5% | North |
| Q2 2024 | 135 | 30 | 12% | North |
| Q3 2024 | 150 | 35 | 11% | North |
| Q4 2024 | 165 | 40 | 10% | North |

### Vega-Lite Multi-Series Chart

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Quarterly Sales and Profit Trends",
  "data": {
    "values": [
      {"quarter": "Q1", "sales": 120, "profit": 25, "type": "Sales"},
      {"quarter": "Q2", "sales": 135, "profit": 30, "type": "Sales"},
      {"quarter": "Q3", "sales": 150, "profit": 35, "type": "Sales"},
      {"quarter": "Q4", "sales": 165, "profit": 40, "type": "Sales"},
      {"quarter": "Q1", "sales": 25, "profit": 25, "type": "Profit"},
      {"quarter": "Q2", "sales": 30, "profit": 30, "type": "Profit"},
      {"quarter": "Q3", "sales": 35, "profit": 35, "type": "Profit"},
      {"quarter": "Q4", "sales": 40, "profit": 40, "type": "Profit"}
    ]
  },
  "mark": "line",
  "encoding": {
    "x": {"field": "quarter", "type": "ordinal", "title": "Quarter"},
    "y": {"field": "sales", "type": "quantitative", "title": "Amount ($K)"},
    "color": {"field": "type", "type": "nominal", "title": "Metric"}
  }
}
\`\`\`

### Pie Chart Example

\`\`\`vega-lite
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "Feature Usage Distribution",
  "data": {
    "values": [
      {"feature": "Math Rendering", "usage": 35},
      {"feature": "Diagrams", "usage": 28},
      {"feature": "Code Blocks", "usage": 20},
      {"feature": "Tables", "usage": 12},
      {"feature": "Export", "usage": 5}
    ]
  },
  "mark": {"type": "arc", "innerRadius": 20},
  "encoding": {
    "theta": {"field": "usage", "type": "quantitative"},
    "color": {"field": "feature", "type": "nominal"}
  }
}
\`\`\`

---

## 🎯 Getting Started Guide

### Installation and Setup

1. **Download**: Get MarkDD Editor for your platform (Windows, macOS, Linux)
2. **Install**: Run the installer and follow the setup wizard
3. **Launch**: Open MarkDD Editor from your applications menu
4. **First Document**: Create your first document with Ctrl+N

### Basic Workflow

1. **Create New File**: Use Ctrl+N or click the New File button in the toolbar
2. **Start Writing**: Begin typing your markdown content in the left editor pane
3. **Live Preview**: Watch your content render in real-time in the right preview pane
4. **Add Elements**: Use toolbar buttons for quick insertion of various elements
5. **Insert Math**: Use \$ for inline math and \$\$ for display math with LaTeX syntax
6. **Add Diagrams**: Use code blocks with language specifiers (mermaid, tikz, vega-lite, etc.)
7. **Save Work**: Save your document with Ctrl+S
8. **Export**: Export to HTML or PDF using the export buttons

### Essential Keyboard Shortcuts

| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| New File | Ctrl+N | Cmd+N | Create a new markdown document |
| Open File | Ctrl+O | Cmd+O | Open an existing file |
| Save | Ctrl+S | Cmd+S | Save the current document |
| Save As | Ctrl+Shift+S | Cmd+Shift+S | Save with new name/location |
| Bold | Ctrl+B | Cmd+B | Make selected text bold |
| Italic | Ctrl+I | Cmd+I | Make selected text italic |
| Find | Ctrl+F | Cmd+F | Open find dialog |
| Replace | Ctrl+H | Cmd+H | Open find and replace dialog |
| Toggle Preview | Ctrl+Shift+P | Cmd+Shift+P | Show/hide preview pane |
| Export HTML | Ctrl+E | Cmd+E | Export document as HTML |

---

## 🌟 Advanced Features and Tips

### Custom Blocks and Admonitions

> [!NOTE] Information Block
> This is an informational note that provides helpful context and additional details.

> [!WARNING] Important Warning
> This is a warning that highlights important considerations or potential issues.

> [!TIP] Professional Tip
> Use the markmap feature to visualize document structure and create interactive mind maps!

> [!SUCCESS] Success Message
> Great job! You've successfully learned about MarkDD Editor's advanced features.

### Mathematical Expression Examples

#### Complex Equations

The Schrödinger equation in quantum mechanics:
$$i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)$$

#### Statistical Formulas

Sample variance calculation:
$$s^2 = \\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar{x})^2$$

### Footnotes and References

This document demonstrates advanced features[^1]. You can create multiple footnotes[^2] and even long footnotes[^3] with additional formatting.

[^1]: This is a simple footnote with basic information.
[^2]: This footnote contains **bold text** and *italic text* formatting.
[^3]: This is a longer footnote that can contain multiple paragraphs.

    It can include additional paragraphs by indenting them properly.
    
    Even code snippets: \`console.log('Hello from footnote!');\`

### Definition Lists

**Markdown**
: A lightweight markup language with plain text formatting syntax.
: Created by John Gruber in 2004.

**MarkDD Editor**  
: A full-featured markdown editor with advanced rendering capabilities.
: Supports mathematical expressions, diagrams, and multiple export formats.
: Built with modern web technologies for cross-platform compatibility.

**LaTeX**
: A document preparation system for high-quality typesetting.
: Particularly well-suited for technical and scientific documentation.

---

## 🔧 Technical Specifications

### Supported File Formats

#### Input Formats
- Markdown (.md, .markdown)
- Plain Text (.txt)
- Rich Text (.rtf)

#### Export Formats  
- HTML (.html)
- PDF (.pdf)
- Markdown (.md)

### Rendering Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Markdown Parser | Marked.js | Latest | Core markdown processing |
| Math Rendering | KaTeX | v0.16.22 | LaTeX math expressions |
| Diagrams | Mermaid | v11.4.1 | Flowcharts and sequences |
| TikZ Support | TikZJax | Latest | LaTeX diagram rendering |
| Charts | Vega-Lite | v5.x | Data visualization |
| Code Highlighting | Highlight.js | v11.8.0 | Syntax highlighting |
| Mind Maps | Markmap | Latest | Interactive mind mapping |

### System Requirements

#### Minimum Requirements
- **OS**: Windows 10, macOS 10.14, or Linux (Ubuntu 18.04+)
- **RAM**: 4 GB
- **Storage**: 500 MB available space
- **Processor**: Dual-core CPU

#### Recommended Requirements
- **OS**: Windows 11, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM**: 8 GB or more
- **Storage**: 1 GB available space  
- **Processor**: Quad-core CPU
- **Internet**: For diagram rendering and updates

---`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
} else {
    window.Editor = Editor;
}
