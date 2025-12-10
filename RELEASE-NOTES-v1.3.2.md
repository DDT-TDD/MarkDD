# MarkDD Editor v1.3.2 Release Notes

**Release Date:** December 9, 2025

---

## 🎯 Summary

This release focuses on bug fixes and enhanced mind mapping capabilities. Key improvements include proper unsaved file warnings, fixed GraphViz diagram rendering, and comprehensive KityMinder import format support.

---

## 🐛 Bug Fixes

### 1. Unsaved File Warning on Window Close
- **Before:** Closing the window with unsaved tabs would close without prompting (only closing individual tabs prompted)
- **After:** Window close now shows a dialog with **Save All** / **Don't Save** / **Cancel** options when there are unsaved tabs
- The dialog shows the count of unsaved tabs

### 2. GraphViz Diagrams Not Rendering
- **Before:** GraphViz code blocks showed "Viz.js function not available" error
- **After:** GraphViz diagrams now render correctly using @viz-js/viz v3.x API
- Supports all GraphViz layout engines: `dot`, `neato`, `fdp`, `sfdp`, `twopi`, `circo`
- Fixed GraphViz rendering in **Presentations** and **Book** exports

### 3. KityMinder XMind Import
- **Before:** Importing XMind files threw "zip is not defined" error
- **After:** XMind import now works correctly with proper JSZip integration

### 4. KityMinder Format Support
- Added import support for:
  - **XMind** (.xmind files)
  - **MindManager** (.mmap files)
  - **FreeMind/Freeplane** (.mm files)
  - **JSON** and **Markdown** formats

### 5. Keyboard Shortcuts Not Working
- **Before:** Core shortcuts like Ctrl+S (Save), Ctrl+O (Open), Ctrl+N (New) stopped working
- **After:** All essential keyboard shortcuts restored:
  - `Ctrl+S` – Save file
  - `Ctrl+Shift+S` – Save As
  - `Ctrl+O` – Open file
  - `Ctrl+N` – New file

---

## ✨ New Features

### Bibliography Collection
- New toggle in **Options → Markdown Features**: "Collect bibliographic references at end"
- When enabled, all `[@citation]` references are collected and displayed in a **References** section at the end of the document

### KityMinder Text Centering
- Press **Ctrl+Shift+C** to toggle text centering for multi-line nodes
- Keyboard shortcut shown in the hint bar: `Center Text: Ctrl+Shift+C`
- Toast notification shows current state (ON/OFF)

### Enhanced Window Close Handling
- Proper multi-tab unsaved warning with tab count
- Save All functionality to save all dirty tabs at once

---

## 📝 Technical Changes

### Updated Files
- `src/main/main.js` - Window close handling, save-all IPC handlers
- `src/renderer/js/app.js` - Save all tabs functionality, bibliography toggle
- `src/renderer/js/preview.js` - Multi-API Viz.js support (v2.x and v3.x)
- `src/renderer/js/markdown-renderer.js` - Bibliography collection and rendering
- `src/renderer/index.html` - Bibliography toggle checkbox in settings
- `src/renderer/styles/main.css` - Bibliography section styling
- `src/renderer/kityminder-editor/index-joplin.html` - JSZip integration
- `src/renderer/kityminder-editor/diy.js` - Import handlers, text centering

### GraphViz API Compatibility
The preview.js now supports multiple Viz.js API versions:
1. @viz-js/viz v3.x (async, `Viz.instance()`)
2. viz.js v2.x (class-based, `new Viz()`)
3. viz.js v1.x/v2.x (sync function, `Viz()`)

---

## 📦 Installation

Download the installer for your platform:
- **Windows:** `MarkDD Editor Setup 1.3.2.exe`
- **macOS:** `MarkDD Editor-1.3.2.dmg`
- **Linux:** `MarkDD Editor-1.3.2.AppImage`

---

## 🔄 Upgrade Notes

This is a minor patch release. No breaking changes. All existing documents and settings are compatible.

---

## 📋 Full Changelog

See [CHANGELOG.md](CHANGELOG.md) for the complete list of changes.
