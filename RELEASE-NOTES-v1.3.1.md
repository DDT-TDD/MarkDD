# MarkDD Editor v1.3.1 Release Notes

**Release Date:** December 7, 2025

This is a maintenance release focusing on stability improvements and bug fixes discovered after the v1.3.0 Book Module release.

---

## 🐛 Bug Fixes

### Critical: Application Closing Delay/Failure
- **Issue:** The application would sometimes fail to close or experience significant delays when the user clicked the close button or used File → Exit
- **Root Cause:** An infinite loop in the `before-quit` event handler. When checking for unsaved changes, calling `app.quit()` would trigger another `before-quit` event, creating a recursive loop that only resolved via timeout
- **Solution:** Added an `isQuitting` flag that tracks when the user has already confirmed exit, preventing the handler from re-executing

### Help Menu Examples Not Working in Packaged Builds
- **Issue:** The Help menu options "Open Showcase" and "Open Presentation" failed to find example files in packaged/installed versions of the application
- **Root Cause:** The code used `process.cwd()` to locate files, which works in development but not in packaged Electron apps where the working directory varies
- **Solution:** 
  - Created a dedicated `examples/` folder containing showcase files
  - Added new `get-examples-path` IPC handler that checks multiple locations (packaged resources, relative paths, CWD fallback)
  - Updated build configuration to copy examples to `resources/examples/` in packaged builds

### Critical: Double-Click Opens Second Instance Instead of New Tab
- **Issue:** Double-clicking a .md file while MarkDD Editor was already running opened a completely new application instance
- **Root Cause:** Missing single-instance lock - Electron allows multiple instances by default
- **Solution:** Implemented `requestSingleInstanceLock()` with `second-instance` event handler to focus the existing window and open the file as a new tab

### Critical: Slow Tab UI Initialization (~30 second delay)
- **Issue:** After opening MarkDD Editor, the tab bar wouldn't appear for up to 30 seconds, showing just the empty editor
- **Root Cause:** The app initialization was blocking on library loading (10 second timeout) and integration class waits (2+ seconds) BEFORE creating the UI
- **Solution:** 
  - Reversed initialization order - app and tabs now load immediately
  - Libraries load in background (non-blocking)
  - Optional integrations (Markmap, TikZ, KityMinder) initialize without blocking
  - Reduced library timeout from 10s to 5s

### Spellcheck Context Menu Missing Corrections
- **Issue:** Misspelled words were underlined (spellcheck was active) but right-clicking showed no spelling suggestions
- **Root Cause:** Electron's spellcheck was enabled but no context menu handler was implemented to display the suggestions
- **Solution:** 
  - Added `context-menu` event handler to the main process
  - Context menu now shows all spelling suggestions from `dictionarySuggestions`
  - Added "Add to Dictionary" option for custom words
  - Menu only appears when there are actual suggestions to display

---

## ⚡ Performance Improvements

### Instant Startup
- Application window and tabs now appear **instantly** instead of waiting 10-30 seconds
- Libraries and integrations load in the background without blocking the UI
- Diagram rendering (Mermaid, TikZ, PlantUML) may take a moment to initialize but editor is immediately usable

### Single Instance
- Only one instance of MarkDD Editor runs at a time
- Opening files from Explorer adds them as tabs in the existing window
- Focus is restored to the existing window when a second instance is attempted

---

## 📁 New Structure

### Examples Folder
A new `examples/` directory has been added containing:
- `COMPREHENSIVE-FEATURES-SHOWCASE.md` - Complete demonstration of all MarkDD features
- `SAMPLE-PRESENTATION.md` - Example Beamer-style presentation

These files are now properly included in packaged builds and accessible via the Help menu.

---

## 🔧 Technical Changes

### Files Modified
| File | Change |
|------|--------|
| `package.json` | Version bump to 1.3.1, updated `extraFiles` to copy `examples/` folder |
| `src/main/main.js` | Added `isQuitting` flag, single-instance lock, `get-examples-path` IPC handler, spellcheck context menu |
| `src/renderer/index.html` | Reordered initialization - app loads first, libraries in background |
| `src/renderer/js/app.js` | Non-blocking integration initialization, updated help functions |
| `README.md` | Updated version badge |
| `CHANGELOG.md` | Added v1.3.1 entry |

### New: Single Instance Lock
```javascript
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit(); // Another instance is already running
} else {
  app.on('second-instance', (event, commandLine) => {
    // Focus existing window and open file from commandLine
  });
}
```

### New IPC Handler
```javascript
ipcMain.handle('get-examples-path', async () => {
  // Checks: process.resourcesPath/examples, __dirname relative, project root, CWD
  // Returns first existing path found
});
```

---

## ⬆️ Upgrade Instructions

### From v1.3.0
1. Replace application files (or reinstall)
2. No configuration changes required
3. All existing documents and settings are preserved

### From v1.2.x or earlier
1. Review [v1.3.0 Release Notes](RELEASE-NOTES-v1.3.0.md) for Book Module features
2. Install v1.3.1

---

## 🧪 Testing Recommendations

After upgrading, verify:

1. **Instant Startup** - Open the app - tabs should appear immediately (< 1 second)
2. **Single Instance** - With app open, double-click another .md file - should open as new tab, not new window
3. **Application Closing** - Open the app, make changes, click X button - should prompt once and close cleanly
4. **Help Menu** - Test Help → Open Showcase and Help → Open Sample Presentation
5. **Existing Features** - Verify presentations, book mode, and math rendering still work correctly

---

## 📋 Known Issues

No known issues in this release.

---

## 🙏 Acknowledgments

Thanks to all users who reported issues with the v1.3.0 release.

---

**Full Changelog:** [v1.3.0...v1.3.1](https://github.com/DDT-TDD/MarkDD/compare/v1.3.0...v1.3.1)
