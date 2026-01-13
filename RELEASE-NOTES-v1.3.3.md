# MarkDD Editor v1.3.3 Release Notes

**Release Date:** January 13, 2026

---

## 🎯 Summary

This release fixes GitHub-Flavored Markdown (GFM) task list rendering across all modes (Editor, Presentation, Book) to properly display checkboxes without bullet points, matching the expected GitHub style.

---

## 🐛 Bug Fixes

### 1. Task List Rendering (GFM Checkboxes) - Editor Mode
- **Before:** Task list items (`- [ ]` and `- [x]`) displayed with both bullet points AND checkboxes
- **After:** Task lists now render correctly without bullet markers, matching GitHub's native styling
- Checkboxes are properly aligned with task text
- Completed tasks (`- [x]`) show strikethrough styling
- Nested task lists maintain proper indentation

### 2. Task List Detection Improvement
- **Before:** Post-processing relied on `li.task-list-item` class that marked library wasn't generating
- **After:** Task items are now detected by checkbox presence within list items, ensuring consistent behavior regardless of markdown parser output

### 3. Task Lists in Presentation Mode
- **Before:** Checkboxes not rendered in presentation slides
- **After:** Full GFM task list support in presentations with proper styling for slides
- Added task list CSS to presentation theme styles

### 4. Task Lists in Book Mode
- **Before:** Book exports used markdown-it without task list support
- **After:** Added custom task list rendering to markdown-it in BookEngine
- Book PDF/HTML exports now include proper task list styling

### 5. Export Task List Styling
- **Before:** Exported HTML files lacked task list CSS, showing bullets in exports
- **After:** Export templates now include complete GitHub-style task list CSS

---

## 🔧 Technical Changes

- Removed pre-markdown regex that interfered with marked's native GFM task list parsing
- Enhanced `processTaskLists()` to detect task items by checkbox presence rather than class name
- Added `.task-list`, `.task-list-item`, `.contains-task-list`, and `.task-completed` CSS classes
- Added `processTaskListsForExport()` to presentation.js for proper class assignment
- Added `addTaskListSupport()` to book-engine.js with custom markdown-it renderer rules
- Updated all export HTML templates with task list styling for consistent appearance

---

## 📋 Files Modified

- `src/renderer/js/markdown-renderer.js` – Task list detection and processing
- `src/renderer/styles/main.css` – Task list styling
- `src/renderer/js/preview.js` – Export template with task list CSS
- `src/renderer/js/presentation.js` – Task list support in slides
- `src/common/book-engine.js` – Task list support in book exports

---

## ⬆️ Upgrade Notes

This is a minor bugfix release. No breaking changes or migration steps required.

---

## 📦 Download

- **Windows:** MarkDD Editor Setup 1.3.3.exe
- **macOS:** MarkDD Editor-1.3.3.dmg
- **Linux:** MarkDD-Editor-1.3.3.AppImage
