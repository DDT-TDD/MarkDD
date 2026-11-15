# MarkDD Editor v2.5.0 Release Notes

**Release Date:** 2026-11-15  
**Platforms:** Windows x64 — Electron Unpacked (`Electron 39.8.10`) & Tauri NSIS Setup (`Tauri 2.11.3`)

---

## Highlights

MarkDD Editor v2.5.0 delivers a comprehensive **Electron & Tauri parity**, **preview performance**, **100% offline vendor asset bundling**, and **security hardening** overhaul, resolving regressions in math, chemistry, Mermaid diagrams, YouTube embeds, and the Feature Showcase.

---

## What's New & Fixed in v2.5.0

### 1. Preview Pipeline Performance & Responsiveness
- **Eliminated Startup Stall**: Removed the `30 × 100 ms` KaTeX polling loop in `MarkdownRenderer.init()`, reducing cold initialization latency to `< 15 ms`.
- **Lazy TikZJax Loading**: Removed the synchronous `<script src="js/obsidian-tikzjax.js">` (~7 MB) from `src/renderer/index.html` and loaded it on demand only when TikZ blocks are rendered.
- **Debounced & Gated Live Previews**: Debounced `book-chapter-editor` live preview updates (`250 ms`) and gated background CV and Presentation preview refreshes on actively open preview panels (`window.__markddCVPreviewOpen` / `window.__markddPresentationPreviewOpen`).
- **Incremental Presentation Updates**: Added `window.__markddUpdatePresentation` in `presentation.js` and `main.js` so live edits update the Presentation preview DOM incrementally instead of reloading the entire window via `loadURL`.
- **Deterministic Book Export Readiness**: Replaced the fixed `3000 ms` wait in `BookEngine.exportWithElectronBrowserWindow` with `document.fonts.ready` + `MathJax.startup.promise` checks.

### 2. 100% Offline Local Vendor Assets
- Bundled `highlight-github.min.css`, `highlight-github-dark.min.css`, `lunr.min.js`, `mathjax-tex-svg.js`, `markmap-lib.min.js`, `markmap-view.min.js`, and `purify.min.js` locally in `src/renderer/vendor/` (and `assets/vendor/` for book builds).
- Removed external CDN URLs (`cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `unpkg.com`) and `picsum.photos` placeholder URLs across `presentation.js`, `cv.js`, `preview.js`, `book-engine.js`, `library-loader.js`, and `app.js`.

### 3. Math, Chemistry, Mermaid, YouTube & Feature Showcase Parity
- **Non-Destructive Sanitization**: Replaced post-process `DOMPurify` re-sanitization in `markdown-renderer.js` and `presentation.js` with a targeted XSS sanitizer that strips executable `<script>`, `<object>/<embed>/<applet>`, untrusted inline `on*=` handlers, and `javascript:`/`vbscript:`/`data:text/html` URIs while preserving MathJax `<mjx-container>` SVG `<path d="...">` / `<use xlink:href="#...">`, Mermaid `<foreignObject>` node labels, and YouTube `<iframe>` embeds.
- **MathJax v4 & Chemistry Fallback**: Updated `isMathJaxReadySync()` to accept string, DOM node, and `outerHTML` outputs from MathJax v4 `tex2svg()`, broadened `hasChemistry` detection (`/\\(ce|pu)\b/`), routed chemistry to synchronously loaded KaTeX + `mhchem.min.js` when available, and broadened MathJax `merror` fallback detection.
- **YouTube Embeds in Electron**: Added a `session.defaultSession.webRequest.onBeforeSendHeaders` hook in `src/main/main.js` to supply a `https://www.youtube-nocookie.com/` `Referer` header when missing or `file://`.
- **Feature Showcase Loading**: Updated `loadComprehensiveShowcase()` and `createShowcaseFile()` in `src/renderer/js/editor.js` to resolve `COMPREHENSIVE-FEATURES-SHOWCASE.md` via `get-examples-path` + `read-file` IPC first, with guarded fallbacks.

### 4. Electron & Tauri Cross-Platform Parity
- **Shared TikZ & Thesis Title-Page Rendering**: Created `src/common/tikz-helper.js` resolving paths relative to `appRoot` (zero `process.cwd()` dependence) and wired both `main.js` and `main-tauri.js` to share `renderTikzServerSide` and `render-thesis-title-page`.
- **Unified Image Resolution**: Added `MarkDDBridge.resolveImageUrl()` in `src/renderer/js/bridge.js` for consistent local, relative, and `file:///` image rendering across Electron and Tauri.
- **Recent Files & Tauri Single-Instance**: Consolidated recent-files initialization in `app.js` (`refreshRecentFilesWhenReady()`), removed blind `taskkill` and `reg add` hacks in `src-tauri/src/lib.rs` and `src/main/main-tauri.js`, and added dynamic backend discovery (`get_backend_config` + `MARKDD_SERVER_READY`) with ephemeral port fallback.

### 5. Security Hardening & Packaging
- **Electron Isolation**: Enabled `contextIsolation: true`, `nodeIntegration: false`, and `enableRemoteModule: false` in `src/main/main.js` via `src/main/preload.js`, serialized `Stats`/`Dirent` objects across `contextBridge`, and enforced `isSafeElectronPath()` containment on file IPC handlers. Upgraded `electron` to `39.8.10`.
- **Tauri HTTP Bridge**: Enforced per-session `SESSION_TOKEN` (`X-MarkDD-Token` / `?token=`) on all routes except `/health`, removed wildcard CORS, enforced `isSafeUserPath()`, and replaced `cmd.exe /c start` with `rundll32.exe` for external URLs.
- **Slimmer Bundles**: Excluded `.map`, `.d.ts`, and `.log` files from `package.json` `build.files` and `scripts/prepare-resources.ps1`.

---

## Verification
- **Automated Test Suite**: 11/11 test suites passing (`check_unwired_menus.js`, `book-engine-port-fallback.test.js`, `test_mermaid_callout_regression.js`, `test_tauri_runtime_parity.js`, `test_presentation.js`, `test_thesis_features.js`, `test_cv_features.js`, `test_math_rendering_audit.js`, `test_preview_performance_and_offline.js`, `test_security_hardening.js`, `test_asar_cwd_book_parity.js`).
- **Distributables**:
  - `dist-final/MarkDD Editor 2.5.0 Electron Unpacked/MarkDD Editor.exe`
  - `dist-final/MarkDD Editor_2.5.0_x64-setup.exe`

---

For previous release notes (`v1.3.1` – `v2.4.3`), see [HISTORY.md](HISTORY.md).
