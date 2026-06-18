# MarkDD Editor

MarkDD Editor is a cross-platform Electron-based Markdown editor with advanced rendering features inspired by MarkText and VS Code Markdown Preview Enhanced. It includes support for KaTeX/MathJax math, Mermaid, markmap, Graphviz/viz.js, TikZ/CircuiTikZ integrations, and export capabilities.

Quick links
- Homepage: ./ (packaged app entry)
- License: MIT (see `LICENSE`)
- Third-party licenses: `THIRD-PARTY-LICENSES.md`

Getting started (development)

1. Install dependencies:

   npm install

2. Run in development mode:

   npm run dev

3. Build distributables (electron-builder):

   npm run build

Notes for release

- The project license is MIT. A summary of third-party dependency licenses is in `THIRD-PARTY-LICENSES.md`. Please review the upstream repositories for any GitHub-only dependencies (for example, `node-tikzjax`) and include their license files if you redistribute their code.
- To prepare a minimal release bundle (only files required for the build), use the provided PowerShell helper script `scripts/prepare-release.ps1` which copies the files referenced by `build.files` in `package.json` into a `release/` directory. This is recommended before uploading to GitHub Releases.

What this repository includes

- `src/` — application source for main/renderer processes
- `assets/` — icons and static assets
- `COMPREHENSIVE-FEATURES-SHOWCASE.md` — extra resource included in packaged app
- Tests and logs (large files) are present in the repo but are excluded by the release script by default (see `RELEASE_FILES.txt`)

If you are preparing a GitHub release, confirm that:

1. `LICENSE` (MIT) is present at the repository root.
2. `THIRD-PARTY-LICENSES.md` is included and you have inspected any GitHub-only dependencies for their license obligations.
3. The `release/` folder produced by `scripts/prepare-release.ps1` contains only the files you want to upload. Do not upload `node_modules` unless required; prefer building platform-specific distributables (`dist-final` by default) and uploading installers.

Contact

Author: MarkDD Team
# MarkDD Editor

A fully-featured Markdown editor with advanced capabilities, combining the best features from MarkText, VS Code Markdown Preview Enhanced, Markmap, and obsidian-tikzjax.

![MarkDD Editor](https://img.shields.io/badge/Version-1.4.1-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Electron](https://img.shields.io/badge/Electron-38.0.0-blue)

## 🚀 Features

### Core Markdown Editing
- **WYSIWYG-style editing** with real-time preview
- **Syntax highlighting** with Highlight.js
- **Live scroll sync** between editor and preview
- **Multiple export formats** (HTML, PDF)
- **Advanced theming** with light/dark mode support

### Mathematical Rendering
- **LaTeX math rendering** with KaTeX
- **Enhanced LaTeX environments** (align, equation, gather, etc.)
- **Inline math** with `$...$` syntax
- **Display math blocks** with `$$...$$` syntax
- **Robust HTML entity handling** for complex equations
- **Math/LaTeX code blocks** for complex equations

### Diagram Support
- **Mermaid diagrams** for flowcharts, sequence diagrams, and more
- **TikZ and CircuiTikZ** for precise technical diagrams
- **Markmap** for mind mapping visualization
- **GraphViz** support (placeholder for future implementation)
- **PlantUML** support (placeholder for future implementation)

### Presentation System (NEW in v1.2.0)
- **Beamer-style presentations** - Create PowerPoint/LaTeX Beamer-style slides in Markdown
- **28 professional themes** - Classic Beamer themes plus modern variants
- **Live preview** - Real-time presentation preview in separate window
- **Multiple exports** - Export to standalone HTML or PDF
- **YAML front-matter** - Configure theme, title, author, and date
- **Speaker notes** - Add notes that don't appear in slides
- **Theme categories** - Classic Beamer, Color Variants, and Modern themes

### Book Module & Publishing System (NEW in v1.3.0)
- **Complete book publishing workflow** - From manuscript to HTML/PDF with one command
- **4 book types** - Classical books, wiki documentation, help systems, technical documents
- **SUMMARY.md manifest system** - GitBook-style table of contents with nested chapters
- **book.config.json** - Centralized configuration for metadata, paths, and build options
- **13 technical document templates** - Reports, plans, brochures, business cases, white papers, case studies, feasibility studies, proposals, user manuals, SOPs, RFPs, annual reports, project charters
- **5 professional HTML themes** - Dark mode, Classic print, Wiki, Help Center, Professional Document
- **Static site builder** - Generate complete HTML sites with navigation and search
- **Lunr.js full-text search** - Client-side search with zero server dependencies
- **Live preview server** - Local development with auto-rebuild on changes
- **PDF export** - Puppeteer-based PDF generation with professional formatting
- **CLI tools** - Command-line interface for init, build, and serve operations
- **Comprehensive Book menu** - 15+ commands with keyboard shortcuts (Ctrl+Alt+B, Ctrl+Alt+Shift+B, Ctrl+Alt+P)
- **Split-pane editor** - Dedicated book mode with sidebar navigation and chapter management

Book menu commands handle project scaffolding, manifest/config editing, builds, exports, and live preview serving.

### Advanced Code Features
- **Syntax highlighting** for 100+ languages
- **Line numbers** in code blocks
- **Copy to clipboard** functionality
- **Language detection** and labeling

### Enhanced Content Features
- **Footnotes** with automatic numbering and back-references
- **Table of Contents** generation
- **Multimedia embedding** (images, videos, YouTube)
- **Responsive images** with lazy loading
- **Enhanced tables** with styling

### Technical Diagrams
- **TikZ diagrams** for mathematical and technical illustrations
- **CircuiTikZ** for electrical circuit diagrams
- **Fallback rendering** when TikZJax is not available
- **Interactive editing** with inline code editing

## 🛠 Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**

### Quick Start
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Build for specific platforms
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 📖 Usage

### Basic Editing
1. **Create or open** a markdown file using the toolbar buttons
2. **Type markdown** in the left editor panel
3. **View live preview** in the right panel
4. **Use toolbar buttons** for quick formatting

### Mathematical Expressions
```markdown
Inline math: $E = mc^2$

Display math block:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

### TikZ Diagrams
```markdown
\```tikz
\draw (0,0) circle (1cm);
\draw (-1,0) -- (1,0);
\draw (0,-1) -- (0,1);
\```

\```circuitikz
\draw (0,0) to[battery, l=$V$] (0,2)
      to[R, l=$R$] (3,2)
      to[C, l=$C$] (3,0) -- (0,0);
\```
```

### Mermaid Diagrams
```markdown
\```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\```
```

### Markmap Mind Maps
```markdown
\```markmap
# Central Topic
## Branch 1
### Sub-branch 1.1
### Sub-branch 1.2
## Branch 2
### Sub-branch 2.1
\```
```

### Creating Presentations (NEW in v1.2.0)
```markdown
---
theme: berkeley
title: My Presentation
author: Your Name
date: 2025-11-08
---

# Welcome Slide

This is your first slide.

---

## Slide 2

- Bullet point 1
- Bullet point 2
- Bullet point 3

---

## Conclusion

Thank you!

<!-- Speaker notes: These won't appear in the presentation -->
```

**Available Themes:**
- **Classic Beamer:** berkeley, berlin, copenhagen, darmstadt, warsaw, madrid, annarbor, cambridgeus, pittsburgh, rochester, boadilla, antibes, juanlespins, montpellier, malmoe, singapore, szeged, hannover, marburg, goettingen
- **Color Variants:** berkeley-dark, berlin-light, copenhagen-blue, madrid-green
- **Modern:** simple-light, simple-dark, minimal-gray, corporate-blue

**Presentation Controls:**
- `Ctrl+Shift+N` - New Presentation
- `Ctrl+Shift+V` - Preview Slides
- Menu: Presentation → Export Presentation as HTML/PDF
- Menu: Presentation → Choose Theme

## Architecture

### Project Structure
```
src/
├── main/           # Electron main process
│   └── main.js     # Main application window and menu
└── renderer/       # Renderer process (UI)
    ├── index.html  # Main HTML template
    ├── styles/     # CSS stylesheets
    └── js/         # JavaScript modules
        ├── app.js                    # Main application controller
        ├── editor.js                 # Editor functionality
        ├── preview.js                # Preview rendering
        ├── markdown-renderer.js      # Markdown processing
        ├── markmap-integration.js    # Mind mapping features
        └── tikz-integration.js       # TikZ/CircuiTikZ support
```

### Key Components
- **Editor**: Advanced text editing with markdown-specific features
- **MarkdownRenderer**: Processes markdown with support for math, diagrams, and special content
- **Preview**: Real-time HTML preview with synchronized scrolling
- **MarkmapIntegration**: Mind map generation and visualization
- **TikZIntegration**: LaTeX diagram rendering

## Dependencies

### Core
- **Electron**: Desktop application framework
- **marked**: Markdown parser and renderer
- **highlight.js**: Syntax highlighting
- **KaTeX**: Math rendering

### Diagrams & Visualization
- **mermaid**: Diagram generation
- **markmap**: Mind map visualization
- **d3**: Data visualization library
- **tikzjax**: TikZ rendering (optional)

### Build Tools
- **electron-builder**: Package and distribute

## Development

### Running in Development
```bash
npm run dev
```

### Adding Features
1. Create new modules in `src/renderer/js/`
2. Import and initialize in `app.js`
3. Add UI controls in `index.html`
4. Style with CSS in `src/renderer/styles/`

### Testing Builds
```bash
npm run pack  # Create unpacked build for testing
```

### Book CLI
Use the bundled CLI to scaffold, build, and serve book projects from any terminal session.

```bash
# Initialize a project (creates book.config.json, SUMMARY.md, and sample chapters)
npm run book init ./docs-book

# Build HTML/PDF outputs into the configured outputDir
npm run book build ./docs-book

# Serve locally with live rebuilds
npm run book serve ./docs-book -- --watch --port 5050
```

Commands default to the current working directory when no path is provided. Pass `--watch` during `serve` to trigger automatic rebuilds when Markdown sources change.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

This project integrates and builds upon several excellent open-source projects:
- **MarkText** - Inspiration for the editor interface
- **VS Code Markdown Preview Enhanced** - Advanced preview features
- **Markmap** - Mind mapping functionality
- **TikZJax** - LaTeX diagram rendering
- **Mermaid** - Diagram generation

## Support

For issues, feature requests, or questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include steps to reproduce any problems

---

**MarkDD Editor** - Making Markdown Magnificent ✨


