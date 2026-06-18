# MarkDD Editor v1.4.1 Release Notes

**Release Date:** June 18, 2026

---

## Summary of Changes

MarkDD Editor v1.4.1 is a patch release focusing on structural codebase sanitization, resolving critical bugs in the PDF and Beamer-style Presentation export engines, making server-side TikZ rendering more resilient, and consolidating the git repository structure to make the duplicate `Github_sync` folder obsolete.

---

## Bug Fixes & Enhancements

### 1. Robust PDF Export with Automatic Fallback ✅
* **Issue:** PDF export failed completely if Puppeteer failed to launch (common in production environments with sandboxing/security restrictions).
* **Fix:** Added a robust `try-catch` wrapper around the Puppeteer launch and print process. If Puppeteer launch fails, the app automatically falls back to an off-screen Electron `BrowserWindow` printing flow (`printToPDF`).

### 2. Relative Resource Path Resolution in PDF/Presentation Exports ✅
* **Issue:** Generating PDFs from memory using `data:` HTML URIs caused all relative resources (such as local images like `<img src="images/logo.png">`) to fail to resolve, rendering as broken links in exported PDFs.
* **Fix:** The export pipeline now writes a temporary HTML file in the output directory, loads it via a `file://` URI to ensure correct local asset resolution, and unlinks the temporary file safely in a `finally` block when complete.

### 3. Book Engine Off-Screen BrowserWindow Fallback ✅
* **Issue:** Book PDF exports failed entirely on environments where Puppeteer was missing or non-functional.
* **Fix:** Upgraded the Book Engine to dynamically load Puppeteer (preventing import failures at app startup). If Puppeteer is unavailable or fails, and the app runs in Electron, it now falls back to an off-screen Electron `BrowserWindow` rendering path using custom margins matching the A4 print profile.

### 4. Safe HTML Color Sanitization ✅
* **Issue:** Global replacement of `currentColor` with `#000` inside exported HTML strings risked corrupting embedded libraries (e.g. Highlight.js, Mermaid, MathJax) that used the variable name inside internal JavaScript or CSS scripts.
* **Fix:** Scoped color replacements strictly to inline CSS styles (`fill`, `stroke`, and `color`) and SVG attributes, leaving library scripts untouched.

### 5. Resilient TikZ Server-Side Fallback ✅
* **Issue:** Local server-side TikZ rendering was hardcoded to a sibling `References/node-tikzjax-main` folder, throwing a hard exception if the directory did not exist.
* **Fix:** Added a fallback mechanism that attempts to require `node-tikzjax` from the local `node_modules` directory if the sibling `References` path is unavailable.

---

## Repository Cleanliness & Maintenance

### Consolidating Git Control to Workspace Root ✅
* Transferred `.git` directory from the duplicate `Github_sync` folder to the main `WP` workspace root.
* Configured `.gitignore` to cleanly ignore build artifacts (`dist-final`, `release`), test outputs (`test/output-*`), diagnostics JSON logs, and backup files (`src/renderer/js/*.7z`, `src/renderer/js/*-Copy.js`).
* Safely removed the redundant `Github_sync` directory. The main folder is now clean and ready to commit/push directly to GitHub.

---

## Upgrade Instructions

No special upgrade steps are required. Simply run the setup installer or run the standalone portable executable directly.
