# MarkDD Editor - Advanced Markdown Editor

This workspace contains a fully-featured Markdown editor built with Electron, incorporating advanced features from:
- MarkText editing capabilities
- VS Code Markdown Preview Enhanced features  
- Markmap mind mapping integration
- TikZ/CircuiTikZ diagram rendering (Obsidian-style)

## Project Status: ✅ COMPLETE

### Completed Features:
- [x] **Electron Application Framework** - Cross-platform desktop app with main/renderer processes
- [x] **Advanced Markdown Editor** - Real-time editing with syntax highlighting and toolbar
- [x] **Live Preview System** - Synchronized preview with mathematical expressions and diagrams
- [x] **Mathematical Rendering** - KaTeX integration for LaTeX math expressions
- [x] **TikZ/CircuiTikZ Support** - Full LaTeX diagram rendering with TikZJax
- [x] **Mermaid Diagrams** - Flowcharts, sequence diagrams, and more
- [x] **Markmap Integration** - Mind mapping from markdown headers
- [x] **Code Highlighting** - Advanced code blocks with line numbers and copy functionality
- [x] **Export System** - HTML, PDF, and markdown export capabilities
- [x] **Cross-Platform Building** - Windows, macOS, and Linux executable generation
- [x] **Dark Mode Support** - Elegant dark theme with responsive design
- [x] **File Management** - Complete file operations with recent files tracking

### Architecture:
```
src/
├── main/main.js           # Electron main process & application lifecycle
├── renderer/
│   ├── index.html         # Main UI with split-pane editor/preview
│   ├── styles/main.css    # Enhanced styling with dark mode
│   └── js/                # Modular JavaScript components
│       ├── app.js         # Application controller
│       ├── editor.js      # Editor functionality  
│       ├── preview.js     # Preview rendering
│       ├── markdown-renderer.js    # Enhanced markdown processing
│       ├── tikzjax-loader.js       # TikZ integration
│       ├── tikz-integration.js     # TikZ rendering layer
│       └── markmap-integration.js  # Mind mapping features
```

### Key Technologies:
- **Electron 38.0.0** - Desktop application framework
- **Marked** - Fast markdown parsing with extensions
- **KaTeX 0.16.22** - Mathematical expression rendering
- **TikZJax** - LaTeX TikZ diagram support
- **Mermaid 11.4.1** - Diagram generation
- **Markmap** - Mind mapping visualization
- **Highlight.js 11.8.0** - Code syntax highlighting
- **D3.js** - Data visualization foundation

### Development Commands:
```bash
npm install     # Install all dependencies
npm run dev     # Launch in development mode
npm run build   # Build production executables
```

## User Requirements Fulfilled:
✅ "Fully featured Markdown app with MarkText features"
✅ "VS Code Markdown Preview Enhanced integration" 
✅ "Create and visualise markmaps"
✅ "Visualise TikZ and CircuiTikZ like Obsidian TikZJax"
✅ "Beautiful, fully featured, and robust"
✅ "Advanced editing and export capabilities"
✅ "Generate executable for different OSes"

The application is now complete and ready for distribution across Windows, macOS, and Linux platforms.
