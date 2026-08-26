# MarkDD Editor v2.2.0 Release Notes

**Release Date**: August 26, 2026  
**License**: MIT  
**Platforms**: Windows (NSIS Installer, Portable ZIP, Electron Setup), macOS, Linux

---

## 🌟 Overview

MarkDD Editor v2.2.0 is a dedicated stability and cross-platform runtime parity release. This version resolves critical regression issues in the **Tauri 2.0 runtime environment** where direct `require('electron')` calls broke core workflows including **File Save**, **Open File / Open Folder Dialogs**, **Sidebar File Tree Management**, **Book Publishing Engine Exports**, and **Preview Panel HTML/PDF Exports**. All subsystems now leverage the unified `MarkDDBridge` across Tauri, Electron, and Web environments.

---

## 🛠️ Cross-Platform Parity & Tauri Compatibility Fixes

### 1. 💾 Save & Save As System
- **Core Editor Save Parity**:
  - Fixed `editor.js` `save()` method which previously invoked `require('electron')` directly, causing runtime exceptions and silent save failures on Tauri.
  - Full support for `Ctrl+S`, toolbar **Save** button, and **Save As** workflow across Tauri, Electron, and Web environments.
- **Window Title & Document Modified Indicator**:
  - Fixed `setModified()` in `editor.js` to update `document.title` across all runtimes without requiring Electron remote module access.

### 2. 📂 File Browser & Sidebar Operations
- **Native Open Dialogs**:
  - `openFileDialog()` (`Ctrl+O` / menu `File > Open`) now properly invokes native Tauri / Electron dialogs and loads files into active editor tabs.
- **File & Folder Creation**:
  - Restored `createNewFile()` (`Ctrl+N`) and `createNewFolder()` in the sidebar file tree.
- **Folder Navigation**:
  - Restored `openFolder()` and folder tree recursive reading (`read-directory`) in Tauri mode.
- **Recent Files & Bookmarks**:
  - Fixed `openRecentFile()` and `openBookmarkedFile()` to correctly read file content via `MarkDDBridge.invoke('read-file')` without accidentally clearing valid bookmarks or recent items.

### 3. 📚 Book Publishing Engine & Preview Panel
- **Book Engine HTML & PDF Export**:
  - Updated `exportHTML()` and `exportPDF()` in `book.js` to route through `MarkDDBridge.invoke()`.
  - Configured `getIpc()` in `book.js` to dynamically bind to `MarkDDBridge.ipcRenderer` when native Electron is absent.
- **Preview Panel Exports & External Links**:
  - Updated `exportAsHTML()` and `exportAsPDF()` in `preview.js` to use `MarkDDBridge.invoke()`.
  - Fixed external link clicks (`http://` and `https://`) in preview to trigger `open-external` via native desktop shell or browser window.

---

## 📦 Loaded Modules & Libraries (Listed in About Dialog)

| Module / Library | Version | Description |
| :--- | :--- | :--- |
| **Application Shell** | `2.2.0` | Tauri 2.0 / Electron hybrid desktop runtime |
| **Marked** | `16.3.0` | High-speed compliant Markdown parser |
| **KaTeX** | `0.16.22` | Ultra-fast client-side LaTeX math engine |
| **MathJax** | `4.0.0` | Advanced TeX/LaTeX & AMS mathematical typesetting |
| **Mermaid** | `11.4.1` | Flowcharts, sequence diagrams, and class diagrams |
| **GraphViz** | `3.7.0` | `@aduh95/viz.js` WebAssembly GraphViz renderer |
| **node-tikzjax** | `1.0.1` | TikZ & CircuiTikZ vector graphics compilation |
| **Markmap** | `0.15.0` | Interactive D3-powered Markdown mindmaps |
| **KityMinder Core** | `1.4.50` | Visual mind mapping editor integration |
| **Vega & Vega-Lite** | `5.33.0 / 5.23.0` | Declarative statistical data visualization |
| **Highlight.js** | `11.11.1` | Code syntax highlighting across 180+ languages |
| **CodeMirror** | `5.65.2` | Advanced multi-mode source code editor |
| **DOMPurify** | `3.2.6` | Strict XSS sanitization for all rendered HTML |
| **ABCJS** | `6.5.2` | Sheet music & tablature rendering |
| **PlantUML** | `1.4.0` | UML diagram encoding and Kroki rendering |
| **PptxGenJS** | `4.0.1` | Native PowerPoint (.pptx) presentation export |
| **Puppeteer** | `24.19.0` | High-DPI headless PDF & vector document generation |
| **Book Engine** | `2.2.0` | Multi-chapter book and thesis publishing pipeline |
| **Presentation Mode** | `2.2.0` | 30 Beamer-style slide themes & speaker view |
| **CV & Resume Studio**| `2.2.0` | Professional CV templates & live color customizer |
| **Markdown-It** | `13.0.1` | Markdown-It parser for Book engine pipeline |

---

## 🛠️ Build Artifacts

- **Tauri Windows NSIS Setup**: `src-tauri/target/release/bundle/nsis/MarkDD Editor_2.2.0_x64-setup.exe`
- **Tauri Portable ZIP Package**: `src-tauri/target/release/bundle/portable/markdd-editor_2.2.0_portable_x64.zip`
- **Electron Windows Installer**: `dist-final/MarkDD Editor Setup 2.2.0.exe`
