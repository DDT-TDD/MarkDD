# Release Notes - MarkDD Editor v2.3.0

**Release Date:** October 6, 2026  
**Version:** 2.3.0  
**Targets:** Windows x64 (Tauri 2.0 Native NSIS Installer, Electron Native NSIS Installer)

---

## 🌟 Major Highlights

### 1. Universal Diagram PNG & SVG Export
Every diagram rendered within MarkDD Editor can now be exported directly to high-quality **PNG** and **SVG** files:
- **Supported Formats**:
  - **PlantUML** (`@startuml` / `@enduml`)
  - **Mermaid** (Flowcharts, Sequence Diagrams, State Diagrams, Gantt, Class Diagrams)
  - **GraphViz** (DOT graphs via `@aduh95/viz.js`)
  - **TikZ & CircuiTikZ** (LaTeX vector diagrams via `node-tikzjax`)
  - **Vega & Vega-Lite** (Declarative charts and statistical graphics)
  - **WaveDrom** (Digital timing diagrams)
  - **Markmap** (Interactive mindmaps)
  - **KityMinder** (Mind maps)
  - **ABC Music** (Sheet music notation & tablature)
- **Interactive UI Headers**:
  - Each diagram container features a floating header with quick **[SVG]** and **[PNG]** export buttons and a source code toggle.
- **Retina 2x Rasterization**:
  - PNG export renders vector SVGs at 2x resolution onto solid white backgrounds, guaranteeing high-DPI clarity for presentations, publications, and papers.
- **Clipboard Integration**:
  - Directly copy rendered PNG images or raw SVG markup to the system clipboard for immediate pasting into Word, PowerPoint, Photoshop, or Slack.
- **Cross-Platform IPC Handlers**:
  - Implemented `save-diagram-file` in both Electron (`main.js`) and Tauri (`main-tauri.js` & `bridge.js`) to support native OS file save dialogs with `.svg` and `.png` filters and base64 binary encoding.

### 2. Standalone WaveDrom Timing Engine
- Replaced previous placeholder timing blocks with a full, client-side WaveDrom SVG timing waveform generator.
- Generates clock signals, high/low transitions, data buses, and timing period annotations with zero external internet or server requirements.

### 3. Diagram Context Menu
- Right-clicking anywhere on a diagram in the preview pane summons an instant context menu:
  - 💾 **Export as PNG...**
  - 🖼️ **Export as SVG...**
  - 📋 **Copy PNG to Clipboard**
  - 📄 **Copy SVG Markup**

### 4. Menu Bar & Checkbox Toggle Wiring
- Fixed interaction handling on menu buttons with child checkboxes:
  - Presentation Show Navigation (`menu-presentation-toggle-navigation`)
  - Presentation Show Slide TOC (`menu-presentation-toggle-toc`)
  - Presentation Show Page Numbers (`menu-presentation-toggle-page-numbers`)
  - Book Mode Enable (`menu-book-mode-toggle`)
- Clicking either the button row itself or the checkbox now reliably toggles the state and activates the underlying feature.

### 5. Resilient Headless PowerPoint (.pptx) Exporter
- Enhanced `pptx-exporter.js` to automatically parse slide titles, subheadings, bullet lists, and paragraphs from raw Markdown whenever pre-rendered DOM elements are omitted.

### 6. Robust PNG Export & Backend Rasterization Fallback
- Resolved canvas tainting and unhandled promise rejections during client-side SVG-to-PNG rasterization caused by `URL.createObjectURL` and foreign objects.
- Added data URI encoding and safety timeout guards to canvas rasterization.
- Configured Mermaid with `htmlLabels: false` for clean vector SVG output.
- Implemented backend Puppeteer screenshot rasterization in both Electron and Tauri backends, ensuring PNG save dialogs open and produce images 100% of the time.

### 7. 100% Offline Diagram Vendor Bundles
- Pre-bundled production minified distributions for Mermaid, D3, Vega, Vega-Lite, Vega-Embed, ABCjs, and PlantUML-Encoder inside `src/renderer/vendor/`.
- Updated `library-loader.js` to load from local assets, eliminating offline 404s and CDN latency.

### 8. Rendering Pipeline Speedups & Typing Responsiveness
- Eliminated redundant double post-processing passes between MarkdownRenderer and Preview.
- Added selector-based fast paths to diagram processors to skip scanning when no relevant diagram containers exist.
- Removed synchronous verbose console logging (`🔥🔥🔥`) across the render loop, freeing the Chromium main thread.
- Fixed queued update handling in the preview debounce handler.

---

## 🛠️ Verification & Test Results
- **Tauri Runtime Parity**: 5/5 tests passed (`test_tauri_runtime_parity.js`).
- **Diagram Export Suite**: 12/12 tests passed (`test_diagram_export.js`).
- **WaveDrom SVG Generator**: Passed (`test_wavedrom_svg.js`).
- **Menu Bar Coverage**: 179/179 menu buttons verified and wired (`check_unwired_menus.js`).
- **LaTeX Math Rendering Audit**: Passed with zero regressions (`test_math_rendering_audit.js`).
- **Presentation & PPTX Exporter/Importer**: Passed (`test_presentation.js`, `test_pptx_importer.js`, `test_pptx_exporter.js`).
- **CV & Resume Studio**: Passed (`test_cv_features.js`).
- **Thesis & Academic Features**: Passed (`test_thesis_features.js`).
- **Book Publishing Engine**: Passed (`book-engine-port-fallback.test.js`).

---

## 📦 Build Artifacts
- **Tauri 2.0 Installer**: `src-tauri/target/release/bundle/nsis/MarkDD Editor_2.3.0_x64-setup.exe`
- **Electron Installer**: `dist-final/MarkDD Editor Setup 2.3.0.exe`
