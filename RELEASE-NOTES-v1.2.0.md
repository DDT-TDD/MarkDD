# MarkDD Editor v1.2.0 – Release Notes

**Release Date:** November 14, 2025  
**Previous Version:** 1.1.1  
**Status:** Production Ready ✅

---

## Overview

MarkDD Editor v1.2.0 is a major feature release adding Beamer-style presentation mode, automated document numbering, robust export capabilities, and essential editing toolbar improvements. All changes maintain backward compatibility with v1.1.1.

---

## 🎯 Major Features

### 1. 🎪 Professional Presentation Mode
Create stunning slide presentations directly from Markdown with Beamer-style theming:

**28 Professional Themes:**
- Berkeley, Berlin, Copenhagen, Madrid, Warsaw (classic themes)
- AnnArbor, Antibes, Bergen, Boadilla, CambridgeUS (academic variants)
- Darmstadt, Dresden, Frankfurt, Goettingen, Hannover (corporate variants)
- Ilmenau, JuanLesPins, Luebeck, Malmoe, Marburg (modern variants)
- Montpellier, PaloAlto, Pittsburgh, Rochester, Singapore, Szeged (professional variants)
- Simple-light, Simple-dark (minimal variants)

**Each Theme Features:**
- Unique font families (serif, sans, monospace)
- Distinctive H1/H2/H3 styling with borders, gradients, shadows
- Custom list, code block, and blockquote rendering
- Layout philosophies: academic, modern, corporate, minimal, bold, elegant

**Slide Features:**
- YAML front-matter for title, author, date, theme selection
- Automatic slide detection via `---` separators
- Heading-based slide organization
- Keyboard navigation (arrows, Page Up/Down, Home/End, Space)
- Progress bar and slide counter
- Configurable navigation (left sidebar, top bar, or hidden)

**Files:** `src/renderer/js/presentation.js`, `Github_sync/src/renderer/js/presentation.js`

### 2. 📊 Automatic Document Numbering
Enable professional document formatting with automatic numbering systems:

**Heading Numbering:**
- Auto-number headings hierarchically (1, 1.1, 1.1.1, etc.)
- Respects heading depth
- Configurable start number via front-matter
- File: `src/renderer/js/markdown-renderer.js` (`applyHeadingNumbering()`, `computeHeadingNumberMap()`)

**Figure & Table Numbering:**
- Auto-number all figures with captions (Figure 1, Figure 2, etc.)
- Auto-number all tables with captions (Table 1, Table 2, etc.)
- Configurable start numbers
- Generated captions for figures/tables without explicit captions
- File: `src/renderer/js/markdown-renderer.js` (`applyFigureAndTableNumbering()`)

**Table of Contents Integration:**
- TOC includes heading numbers when enabled
- Dynamic generation from document structure
- Supports numbering-aware anchor links
- File: `src/renderer/js/markdown-renderer.js` (`generateTOC()`)

**Front-Matter Configuration:**
```yaml
---
numberHeadings: true
numberFiguresTables: true
headingNumberStart: 1
figureTableNumberStart: 1
---
```

### 3. 🎨 Full Export Support (HTML & PDF)
Comprehensive export capabilities with all rendering features preserved:

**HTML Export:**
- Preserves all diagrams: PlantUML, Mermaid, Vega/Vega-Lite, TikZ, GraphViz, KityMinder
- Math expressions (MathJax) fully rendered
- Responsive design and dark mode compatibility
- Self-contained exports with embedded styling

**PDF Export:**
- Print-to-PDF support for all rendered content
- Preserves diagram fidelity
- Professional typography and spacing
- Heading numbering preserved in export
- Figure/table numbering visible in output

**Rendering Features for Exports:**
- PlantUML → SVG conversion via plantuml-encoder CDN
- Vega/Vega-Lite → Canvas rendering via vega-embed
- TikZ → Native LaTeX rendering via TikZJax CDN
- Mermaid diagrams → PNG/SVG in exports
- Math expressions → MathJax render-to-string

**Files:** `src/renderer/js/app.js`, `Github_sync/src/renderer/js/app.js`

### 4. 🔗 Enhanced Toolbar – Link & Image Insertion
Improved editing toolbar with dedicated link and image insertion dialogs:

**Add Link Dialog:**
- Modal input for URL and link text
- Validation of URL format
- Keyboard shortcut support (Ctrl+K)
- Inserts markdown link syntax: `[text](url)`

**Add Image Dialog:**
- File picker for image selection
- Image preview before insertion
- Alt text input for accessibility
- Inserts markdown image syntax: `![alt](path)`

**Toolbar Integration:**
- Visual link and image buttons in the editor toolbar
- Keyboard shortcuts for quick access
- Input validation and error feedback

**Files:** `src/renderer/js/app.js`, `src/renderer/index.html` (toolbar UI)

### 5. 📹 Hardened YouTube Embed Pipeline (Bug Fix)
Fixed broken video embeds with robust URL parsing and fallback support:

**Problem Fixed:**
Regex-only ID extraction failed on timestamped links, playlists, Shorts, Live streams, and hash-based watch URLs.

**Solution:**
- URL parser detects all YouTube variants: `youtube.com/watch?v=`, `youtu.be/`, Shorts, Live, playlists
- Validates video IDs before embedding
- Preserves parameters: `start` (timestamps), `list` (playlists)
- Uses privacy-friendly `youtube-nocookie.com` domain
- Adds fallback messaging + "Open on YouTube" link
- Strict iframe permissions and referrer policy

**Files:** `src/renderer/js/markdown-renderer.js` (YouTube helpers)

---

## ✨ New & Enhanced

### Added
- **Presentation Module** (`src/renderer/js/presentation.js`)
  - 28 Beamer-style themes with unique structural CSS
  - HTML slide generation with keyboard/click navigation
  - Front-matter metadata support (title, author, date, theme, navigation)
  - Progress tracking and slide counter

- **Numbering System** (`markdown-renderer.js`)
  - `applyHeadingNumbering()` - hierarchical heading numbers
  - `applyFigureAndTableNumbering()` - auto-caption and numbering for figures/tables
  - `computeHeadingNumberMap()` - heading structure analysis
  - `generateTOC()` with numbering awareness

- **Export Enhancement**
  - PlantUML rendering via CDN encoder
  - Vega/Vega-Lite support in exports
  - TikZ rendering via TikZJax CDN
  - cleanHTMLForExport() preserves all diagram containers

- **Toolbar Dialogs**
  - Link insertion modal (Ctrl+K)
  - Image insertion file picker
  - Input validation and preview

### Fixed
1. **YouTube Video Embeds** – URL parser + sanitization + fallback messaging eliminates "Video unavailable" errors
2. **HTML Export** – All rendering features preserved (diagrams, math, code)
3. **PDF Export** – Print-to-PDF works with rendered content
4. **GitHub_sync Parity** – TOC numbering now matches main renderer

### Changed
- Tab system optimized (v1.1.1)
- Version management centralized (v1.1.1)
- About dialog now shows v1.2.0

---

## 🔍 Technical Details

### Files Modified
- `src/renderer/js/presentation.js` (~850 lines added: themes, navigation, slide rendering)
- `src/renderer/js/markdown-renderer.js` (numbering system, YouTube helpers, export support)
- `src/renderer/js/app.js` (toolbar dialogs, link/image insertion)
- `src/renderer/index.html` (toolbar UI for link/image buttons)
- `src/renderer/styles/main.css` (presentation CSS, numbering styles)
- `Github_sync/` (all files synced with main repo)

---

## ✅ Quality Assurance

### Presentation Testing
- ✅ All 28 themes render with unique styling
- ✅ Slide navigation works (keyboard + mouse)
- ✅ Progress bar updates correctly
- ✅ Front-matter metadata parsing functional
- ✅ HTML export produces valid presentations

### Numbering Testing
- ✅ Heading numbers increment hierarchically
- ✅ Figure/table numbering auto-generates
- ✅ TOC includes numbers when enabled
- ✅ Export preserves numbering

### Export Testing
- ✅ PlantUML renders to SVG in exports
- ✅ Vega/Vega-Lite render via vegaEmbed
- ✅ TikZ renders via TikZJax
- ✅ Math expressions render
- ✅ Mermaid diagrams included

### Toolbar Testing
- ✅ Link dialog inserts markdown links
- ✅ Image dialog inserts markdown images
- ✅ Keyboard shortcuts (Ctrl+K) work
- ✅ Validation feedback displays

### Regression Testing
- ✅ All existing Markdown features preserved
- ✅ Tab system unchanged
- ✅ File operations work as before
- ✅ No breaking changes

---

## 📦 Dependencies

### New Dependencies Added
- `plantuml-encoder@1.4.0` - PlantUML SVG encoding
- CDN libraries (no npm packages): PlantUML, Vega, Vega-Lite, TikZJax

### Existing Dependencies
- electron-builder (build configuration unchanged)
- marked, KaTeX, MathJax, Mermaid (versions unchanged)
- highlight.js, D3.js (already present)

---

## 🔄 Migration & Compatibility

**For End Users:**
- No action required for standard editing
- To use presentations: create markdown with `---` slide separators and front-matter
- To use numbering: add front-matter flags (optional)
- All exports work automatically

**For Developers:**
- New front-matter keys: `numberHeadings`, `numberFiguresTables`, `theme`, `navigation`
- Presentation API: `window.PresentationManager` (if presentation mode active)
- Export system unchanged for users, enhanced internally

**Breaking Changes:** None  
**Known Issues:** None  
**Backward Compatibility:** Full (1.1.1 → 1.2.0 safe upgrade)

---

## 🎓 Usage Examples

### Create a Presentation
```markdown
---
title: My Awesome Presentation
author: John Doe
date: November 2025
theme: berkeley
navigation: left
---

# Slide 1: Introduction

Content here...

---

# Slide 2: Details

More content...

---

# Slide 3: Conclusion

Final thoughts...
```

### Enable Document Numbering
```markdown
---
numberHeadings: true
numberFiguresTables: true
headingNumberStart: 1
figureTableNumberStart: 1
---

# Chapter 1

## Section 1.1

...

[Figure with caption] → becomes "Figure 1"
[Table with caption] → becomes "Table 1"
```

---

## 🚀 Build & Distribution

- **Version:** 1.2.0
- **Build Date:** November 14, 2025
- **Windows:** `MarkDD Editor Setup 1.2.0.exe` (NSIS installer)
- **Output:** `dist-final-1.2.0/`

---

## 📞 Support

For issues or questions:
- **GitHub Issues:** [MarkDD Repository](https://github.com/DDT-TDD/MarkDD)
- **Documentation:** See README.md

---

*MarkDD Editor v1.2.0 – Professional Markdown editing, powerful presentations, and comprehensive exports.*
