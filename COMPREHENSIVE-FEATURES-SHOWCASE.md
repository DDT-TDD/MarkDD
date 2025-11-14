# MarkDD Editor v1.2 - Complete Feature Showcase

**Version 1.2.0** - Advanced Markdown Editor with Presentation System

This document demonstrates all features available in MarkDD Editor v1.2.

## Table of Contents
[TOC]

---

## ✨ What's New in Version 1.2

### Major Features (v1.2.0)
- 🎭 **Beamer-Style Presentations** - Create professional presentations in Markdown with 28 themes
  - Live preview in separate window
  - Export to standalone HTML and PDF
  - YAML front-matter for theme, title, author, date
  - Slide transitions (fade, slide, zoom)
  - Table of contents and navigation (left, top, none)
  - Headers, footers, progress bars, slide counters
  - Full math, diagram, and code support in slides
- 🧪 **Chemistry Equations** - Full mhchem support for chemical formulas and reactions
- ⚡ **Performance Optimizations** - Faster tab rendering and startup (v1.1.1)

### Core Features (v1.1)
- ✅ **Custom Container Blocks** - Full support for `:::info`, `:::warning`, `:::danger`, `:::tip`, `:::note` blocks with optional titles
- ✅ **Draggable Search & Replace** - Non-blocking, movable find & replace window (Ctrl+F) that doesn't gray out the editor
- ✅ **Manual Refresh Control** - Toggle live preview on/off with dedicated manual refresh button (Ctrl+R) when live preview is disabled
- ✅ **KityMinder Editing** - Full editing capability restored for saved mind maps (click ✏️ Edit button)
- ✅ **Clean Exports** - HTML and PDF exports no longer include interactive buttons or "View JSON" / "Edit" controls
- ✅ **Image Plugin** - Automatic responsive images with lazy loading and figure captions
- ✅ **Video Plugin** - YouTube links automatically convert to embedded videos (see example in the video section)

---

## 🎨 Custom Container Blocks

Create beautifully styled information blocks:

:::info Important Information
This is an informational block with a custom title. Perfect for highlighting key points!
:::

:::warning Watch Out
Warning blocks help alert users to potential issues.
:::

:::danger Critical
Danger blocks indicate critical warnings that need immediate attention.
:::

:::tip Pro Tip
Share helpful hints and best practices with your readers.
:::

:::note Additional Context
Notes provide supplementary information without disrupting flow.
:::

---

## 🔍 Enhanced Search & Replace
Press **Ctrl+F** to open the search modal:
- **Draggable Window** - Click and drag the header to reposition anywhere on screen
- **Non-Blocking** - Editor stays fully visible and editable while searching
- **Full Features** - Find, Replace, Replace All with case-sensitive and regex options
- **Live Highlighting** - Search results highlight as you type

---

## 🖼️ Image & Video Plugins

### Images with Lazy Loading
Images are automatically optimized:

![Sample Image](https://picsum.photos/200/300)

Features:
- Automatic `loading="lazy"` attribute
- Responsive sizing with `max-width: 100%`
- Figure captions from alt text
- Proper semantic HTML structure

### YouTube Video Embedding
Paste any YouTube link and it auto-embeds:

**Example:**

https://youtu.be/5Peo-ivmupE?si=TlIfjpTxXMlWq8wv

The video appears as a fully functional embedded player with all YouTube controls.

---

## Mathematical Expressions

### Inline Math
Here's some inline math: $E = mc^2$ and $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$.

### Display Math Blocks
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### Math Code Blocks
```math
\begin{align}
\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &= \frac{4\pi}{c}\vec{\mathbf{j}} \\
\nabla \cdot \vec{\mathbf{E}} &= 4 \pi \rho \\
\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} &= \vec{\mathbf{0}} \\
\nabla \cdot \vec{\mathbf{B}} &= 0
\end{align}
```

## Chemistry Equations (mhchem)

MarkDD Editor supports chemistry equations using the mhchem package.

### Chemical Formulas
Inline chemistry: $\ce{H2O}$, $\ce{CO2}$, $\ce{NH3}$

Display chemistry:
$$\ce{C6H12O6}$$

### Chemical Reactions
Simple reaction:
$$\ce{2H2 + O2 -> 2H2O}$$

Complex reaction with states:
$$\ce{2Na(s) + 2H2O(l) -> 2NaOH(aq) + H2(g) ^}$$

### Chemical Equations
Balanced equation:
$$\ce{CO2 + C -> 2CO}$$

Acid-base reaction:
$$\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}$$

### Advanced Chemistry
Equilibrium:
$$\ce{N2 + 3H2 <=> 2NH3}$$

With quantities:
$$\ce{\pu{2 mol} H2 + \pu{1 mol} O2 -> \pu{2 mol} H2O}$$

Oxidation states:
$$\ce{Fe^{II}Fe^{III}2O4}$$

---

## LaTeX Document Rendering

### Simple LaTeX Document
```latex
\documentclass{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath}

\title{LaTeX Document in MarkDD}
\author{MarkDD Editor}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}

This is a complete LaTeX document rendered using LaTeX.js within the MarkDD Editor. It demonstrates the ability to render full LaTeX documents, not just mathematical expressions.

\section{Mathematical Examples}

The quadratic formula is given by:
\begin{equation}
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\end{equation}

We can also display matrices:
\begin{equation}
\mathbf{A} = \begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
\end{equation}

\section{Lists and Formatting}

\subsection{Enumerated List}
\begin{enumerate}
    \item First item
    \item Second item with \textbf{bold} text
    \item Third item with \textit{italic} text
    \item Fourth item with \texttt{monospace} text
\end{enumerate}

\subsection{Itemized List}
\begin{itemize}
    \item Bullet point one
    \item Bullet point two
    \item Bullet point three
\end{itemize}

\section{Tables}

\begin{table}[h]
\centering
\begin{tabular}{|c|c|c|}
\hline
Column 1 & Column 2 & Column 3 \\
\hline
A & B & C \\
D & E & F \\
G & H & I \\
\hline
\end{tabular}
\caption{Example Table}
\end{table}

\section{Conclusion}

This demonstrates the power of integrating LaTeX.js into MarkDD Editor, allowing for complete LaTeX document rendering alongside markdown content.

\end{document}
```

### Advanced LaTeX with Custom Commands
```latex
\documentclass{article}
\usepackage{amsmath}
\usepackage{amssymb}

% Custom commands
\newcommand{\R}{\mathbb{R}}
\newcommand{\C}{\mathbb{C}}
\newcommand{\norm}[1]{\left\lVert#1\right\rVert}

\begin{document}

\title{Advanced LaTeX Features}
\maketitle

\section{Custom Commands}

Let $f: \R \to \C$ be a function. We can define the norm as $\norm{f}$.

\section{Complex Equations}

The Cauchy-Schwarz inequality:
\begin{equation}
\left| \sum_{i=1}^n x_i y_i \right|^2 \leq \left( \sum_{i=1}^n x_i^2 \right) \left( \sum_{i=1}^n y_i^2 \right)
\end{equation}

\section{Theorem Environment}

\textbf{Theorem 1.} For any real numbers $a$ and $b$:
\begin{equation}
(a + b)^2 = a^2 + 2ab + b^2
\end{equation}

\textbf{Proof.} This follows directly from algebraic expansion.

\end{document}
```

## Mermaid Diagrams

### Flowchart
```mermaid
graph TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>+B: Hello Bob, how are you?
    B-->>-A: Great!
    A-)B: See you later!
```

### Class Diagram
```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +String breed
        +bark()
    }
    class Cat {
        +String color
        +meow()
    }
    Animal <|-- Dog
    Animal <|-- Cat
```

## TikZ and CircuiTikZ Diagrams

### Basic TikZ
```tikz
\begin{tikzpicture}
\draw[thick,->] (0,0) -- (4.5,0) node[anchor=north west] {x axis};
\draw[thick,->] (0,0) -- (0,4.5) node[anchor=south east] {y axis};
\foreach \x in {0,1,2,3,4}
   \draw (\x cm,1pt) -- (\x cm,-1pt) node[anchor=north] {$\x$};
\foreach \y in {0,1,2,3,4}
    \draw (1pt,\y cm) -- (-1pt,\y cm) node[anchor=east] {$\y$};
\draw[blue] plot[smooth] coordinates {(0,0) (1,1) (2,4) (3,2) (4,3)};
\end{tikzpicture}
```

### CircuiTikZ Circuit
```circuitikz
\begin{circuitikz}
\draw (0,0) to[battery1, l=$V_s$] (0,3)
      to[R, l=$R_1$] (3,3)
      to[L, l=$L$] (3,0)
      to[short] (0,0);
\draw (3,3) to[C, l=$C$] (6,3)
      to[R, l=$R_2$] (6,0)
      to[short] (3,0);
\end{circuitikz}
```

## Code Blocks with Syntax Highlighting

### Python
```python
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    fib_sequence = [0, 1]
    for i in range(2, n):
        fib_sequence.append(fib_sequence[i-1] + fib_sequence[i-2])
    
    return fib_sequence

# Example usage
print(fibonacci(10))
```

### JavaScript
```javascript
class MarkdownEditor {
    constructor(container) {
        this.container = container;
        this.plugins = new Map();
    }
    
    registerPlugin(name, plugin) {
        this.plugins.set(name, plugin);
        console.log(`Plugin ${name} registered`);
    }
    
    render(markdown) {
        let html = this.parseMarkdown(markdown);
        
        // Apply plugins
        for (const [name, plugin] of this.plugins) {
            html = plugin.process(html);
        }
        
        return html;
    }
}
```

### TypeScript
```typescript
interface Plugin {
    name: string;
    version: string;
    process(content: string): string;
}

class PluginManager {
    private plugins: Map<string, Plugin> = new Map();
    
    public install(plugin: Plugin): boolean {
        try {
            this.plugins.set(plugin.name, plugin);
            return true;
        } catch (error) {
            console.error(`Failed to install plugin ${plugin.name}:`, error);
            return false;
        }
    }
    
    public getPlugin(name: string): Plugin | undefined {
        return this.plugins.get(name);
    }
}
```


## Tables

### Simple Table
| Feature | Status | Description |
|---------|--------|-------------|
| Markdown Editing | ✅ Complete | Full-featured editor |
| Live Preview | ✅ Complete | Real-time rendering |
| LaTeX.js | ✅ Complete | Full document support |
| Plugin System | ✅ Complete | Extensible architecture |
| Export | ✅ Complete | Multiple formats |

### Advanced Table with Math
| Formula | Name | Application |
|---------|------|-------------|
| $E = mc^2$ | Mass-Energy Equivalence | Relativity |
| $F = ma$ | Newton's Second Law | Mechanics |
| $V = IR$ | Ohm's Law | Electronics |
| $\int_{a}^{b} f(x)dx$ | Definite Integral | Calculus |

## Task Lists

### Basic Tasks
- [x] Implement LaTeX.js integration
- [x] Add plugin installation system
- [x] Create comprehensive test file
- [ ] Add more diagram types
- [ ] Implement collaborative editing

### Advanced Tasks
- [x] **Core Features**
  - [x] Markdown editing
  - [x] Live preview
  - [x] Syntax highlighting
- [x] **Diagram Support**
  - [x] Mermaid diagrams
  - [x] TikZ/CircuiTikZ
  - [x] Mathematical expressions
  - [x] LaTeX documents
- [ ] **Future Enhancements**
  - [ ] Real-time collaboration
  - [ ] Cloud synchronization
  - [ ] Mobile app

## Custom Blocks

:::info Information Block
This is an information block that provides additional context or details about the content.
:::

:::warning Warning Block
This is a warning block that alerts users to important considerations or potential issues.
:::

:::error Error Block
This is an error block that indicates critical problems or failures that need attention.
:::

:::success Success Block
This is a success block that confirms successful operations or positive outcomes.
:::

## Advanced Markdown Features

### Abbreviations
*[HTML]: Hyper Text Markup Language
*[W3C]: World Wide Web Consortium

The HTML specification is maintained by the W3C.

### Footnotes
This text has a footnote[^1]. Here's another one[^2].

[^1]: This is the first footnote.
[^2]: This is the second footnote with more details.

### Keyboard Keys
Press [[Ctrl]]+[[C]] to copy and [[Ctrl]]+[[V]] to paste.

### Subscript and Superscript
H~2~O is water, and E = mc^2^ is Einstein's formula.

### Spoilers
This contains a spoiler: ||The butler did it||.


## Mathematical Proofs and Formal Documents

### Example Proof in LaTeX
```latex
\documentclass{article}
\usepackage{amsmath}
\usepackage{amsthm}

\newtheorem{theorem}{Theorem}
\newtheorem{proof}{Proof}

\begin{document}

\begin{theorem}
The sum of the first $n$ positive integers is $\frac{n(n+1)}{2}$.
\end{theorem}

\begin{proof}
We prove this by mathematical induction.

\textbf{Base case:} For $n = 1$, we have $1 = \frac{1(1+1)}{2} = 1$. ✓

\textbf{Inductive step:} Assume the formula holds for some $k \geq 1$:
$$\sum_{i=1}^{k} i = \frac{k(k+1)}{2}$$

We need to show it holds for $k+1$:
\begin{align}
\sum_{i=1}^{k+1} i &= \sum_{i=1}^{k} i + (k+1) \\
&= \frac{k(k+1)}{2} + (k+1) \\
&= \frac{k(k+1) + 2(k+1)}{2} \\
&= \frac{(k+1)(k+2)}{2}
\end{align}

Therefore, by mathematical induction, the formula holds for all positive integers $n$.
\end{proof}

\end{document}
```

## Feature Highlights

MarkDD Editor provides a comprehensive markdown editing experience with:

### Core Capabilities
- 📝 **Advanced Markdown Editing** - Full-featured editor with syntax highlighting
- 👁️ **Live Preview** - Real-time rendering with manual refresh option
- 🎨 **Custom Container Blocks** - Info, warning, danger, tip, note blocks
- 🔍 **Draggable Search & Replace** - Non-blocking find/replace window
- 📊 **Multiple Export Formats** - HTML, PDF with clean output

### Mathematical & Scientific
- 🧮 **LaTeX Math** - Inline and display math with KaTeX/MathJax
- 🧪 **Chemistry Equations** - Full mhchem support for chemical formulas
- 📐 **LaTeX Documents** - Complete LaTeX.js document rendering
- 📈 **TikZ/CircuiTikZ** - Vector graphics and circuit diagrams

### Diagrams & Visualizations
- 🌊 **Mermaid** - Flowcharts, sequence, class diagrams
- 🗺️ **Mind Maps** - Markmap and KityMinder integration
- 📉 **Data Visualization** - Vega/Vega-Lite charts
- 🏗️ **PlantUML** - UML diagrams

### Presentation System
- 🎭 **Beamer Presentations** - 28 professional themes
- 📽️ **Live Preview** - Real-time slide preview
- 📤 **Multiple Exports** - HTML and PDF presentation formats
- 🎬 **Transitions & Navigation** - Fade, slide, zoom effects

### Media & Content
- 🖼️ **Images** - Lazy loading, responsive, figure captions
- 🎥 **Video Embeds** - YouTube auto-embedding
- 💻 **Code Highlighting** - 100+ languages with Highlight.js
- 📋 **Tables** - GitHub-flavored markdown tables

Access features through the menu bar or keyboard shortcuts!

---

## 🎭 Beamer-Style Presentations

MarkDD Editor v1.2 introduces a complete presentation system inspired by LaTeX Beamer.

### Creating a Presentation

1. Go to **Presentation > New Presentation** (Ctrl+Shift+N)
2. Edit the YAML front-matter to set theme and metadata
3. Separate slides with `---`
4. Preview with **Presentation > Preview Slides** (Ctrl+Shift+V)
5. Export as HTML or PDF

### Example Presentation

```markdown
---
theme: berkeley
title: My Amazing Presentation
author: Your Name
date: 2025-11-10
transition: fade
navigation: left
toc: true
---

# Welcome Slide

This is the first slide of your presentation.

---

## Slide with Math

The quadratic formula:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

---

## Slide with Code

```python
def hello_world():
    print("Hello from MarkDD!")
```

---

## Slide with Chemistry

Chemical reaction:
$$\ce{2H2 + O2 -> 2H2O}$$

---

## Thank You!

Questions?
```

### Available Themes (28 total)

#### Classic Beamer Themes
- **berkeley** (default) - UC Berkeley blue/gold
- **berlin** - Modern dark blue/light blue
- **copenhagen** - Academic dark red/gold
- **darmstadt** - Professional navy/light blue
- **warsaw** - Traditional maroon/tan
- **madrid** - Blue/gold academic
- **annarbor** - Michigan maize/blue
- **cambridgeus** - Harvard crimson/gray
- And 20 more classic themes!

#### Modern Themes
- **simple-light** - Clean light gray/blue
- **simple-dark** - Modern dark mode
- **minimal-gray** - Professional gray/teal
- **corporate-blue** - Corporate navy/light blue

### Presentation Features

- ✅ **28 Professional Themes** - Classic Beamer and modern styles
- ✅ **Live Preview** - Real-time preview in separate window
- ✅ **Table of Contents** - Auto-generated from slide headers
- ✅ **Navigation** - Left sidebar, top bar, or none
- ✅ **Transitions** - Fade, slide, zoom effects
- ✅ **Headers/Footers** - Customizable with alignment options
- ✅ **Progress Bar** - Visual progress indicator
- ✅ **Slide Counter** - Current/total slide numbers
- ✅ **Math Support** - Full LaTeX math in slides
- ✅ **Diagrams** - Mermaid, TikZ, PlantUML in slides
- ✅ **Code Highlighting** - Syntax-highlighted code blocks
- ✅ **Chemistry** - Chemical equations with mhchem
- ✅ **PDF Export** - Print-ready PDF with proper pagination
- ✅ **HTML Export** - Standalone HTML with all dependencies

### YAML Front-Matter Options

```yaml
---
theme: berkeley              # Theme name (28 options)
title: Presentation Title    # Presentation title
author: Author Name          # Author name
date: 2025-11-10            # Date
transition: fade             # fade, slide, zoom, or none
navigation: left             # left, top, or none
toc: true                    # Show table of contents
header: Presentation Title   # Custom header text
footer: Author Name          # Custom footer text
headerAlign: center          # left, center, right
footerAlign: center          # left, center, right
progressBar: true            # Show progress bar
pageNumbers: true            # Show slide counter
---
```

---

## Performance and Rendering Test

This document tests various rendering performance aspects:

- **Large documents** with multiple diagram types
- **Complex mathematical expressions** with nested formulas
- **Mixed content types** (markdown + LaTeX + diagrams)
- **Responsive design** across different screen sizes
- **Export compatibility** for various output formats

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+N** | New file |
| **Ctrl+O** | Open file |
| **Ctrl+S** | Save file |
| **Ctrl+Shift+S** | Save as |
| **Ctrl+F** | Find & replace |
| **Ctrl+R** | Manual refresh preview |
| **Ctrl+Shift+N** | New presentation |
| **Ctrl+Shift+V** | Preview presentation |

### Menu Organization

- **File** - New, Open, Save, Recent Files
- **Edit** - Undo, Redo, Find & Replace
- **View** - Toggle Sidebar, Live Preview, Manual Refresh
- **Export** - HTML, PDF
- **Presentation** - New, Preview, Export, Themes
- **Help** - Feature Showcase, Presentation Guide

### Supported Formats

**Input:**
- Markdown (.md, .markdown)
- Text files (.txt)

**Output:**
- HTML (standalone with embedded styles)
- PDF (via Electron's print engine)
- Presentation HTML (with navigation and themes)
- Presentation PDF (print-ready slides)

### Version Information

**Current Version:** 1.2.0  
**Release Date:** November 2025  
**Major Features:** Beamer Presentations, Chemistry Equations, Performance Optimizations

---

**End of Feature Showcase** - Thank you for using MarkDD Editor!
