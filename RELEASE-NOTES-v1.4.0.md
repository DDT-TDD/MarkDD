# MarkDD Editor v1.4.0 Release Notes

**Release Date:** January 19, 2026

---

## Bug Fixes

### Recent Files Links Not Clickable/Opening ✅

**Issue:** Recent file items in the File menu ("Open Recent" submenu) and the sidebar Files panel were not clickable or failed to open files when clicked.

**Root Cause:** 
- Dynamically created menu buttons weren't receiving click events because they were created after the menu system initialized
- The `setupMenuHandlers()` event listeners only attached to static HTML elements present at startup
- The recent file buttons inside `#menu-recent-files-items` are created dynamically when hovering over "Open Recent", so they missed the initial event binding

**Resolution:**
- Implemented **event delegation** on `#menu-recent-files-items` container to handle clicks on dynamically created buttons
- Replaced innerHTML template generation with DOM `createElement` methods for proper attribute handling
- Added explicit `button type="button"` to prevent form submission behavior
- Used `data-path` attribute with proper DOM methods for reliable file path storage
- Normalized legacy recent file storage formats (string paths, different key names like `filePath`, `file`, `title`)
- Added sorting by timestamp for consistent ordering
- Styled missing files in red with one-click removal functionality

**Files Modified:**
- `src/renderer/js/app.js`
- `src/renderer/js/file-browser.js`
- `src/renderer/styles/main.css`

---

## Upgrade Instructions

No special upgrade steps required. Simply replace the application files or run the new installer.

---

## Known Issues

None at this time.
