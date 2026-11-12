# MarkDD Editor v2.4.3 Release Notes

## Bug Fixes & Improvements

- **Markdown Callout & Mermaid Presentation Rendering**:
  - Fixed the Marked `container` extension `start()` and `tokenizer()` regexes in `src/renderer/js/markdown-renderer.js` so `:::warning ... :::` and other callout blocks are not split mid-sentence, and unified `processCustomBlocks()` to emit `.custom-container` markup.
  - Added responsive `.slide .mermaid svg` (`max-width: 100%`, `height: auto`, `max-height: 55vh`) and `.slide .custom-container` / `.custom-container-content` wrapping rules, `justify-content: safe center`, and `useMaxWidth: true` / `htmlLabels: false` Mermaid initialization in `src/renderer/js/presentation.js`.
  - Awaited `mermaid.run` / `mermaid.init` in `renderingPromises` so `presentation-render-complete` waits for Mermaid diagrams to finish rendering.
- **Tauri / Rust Parity & Preview Fixes**:
  - Updated `export-presentation-pdf` in `src/main/main-tauri.js` to wait for `window.presentationRenderStatus === 'complete'` / `presentation-render-complete` before enabling print layout and printing to PDF (matching Electron).
  - Fixed Tauri `preview-cv` and `preview-presentation` window refresh/fallback handling in `src/renderer/js/bridge.js` so `win.eval` ACL errors do not abort `show()`/`setFocus()` or block `window.open` fallback.
  - Fixed `book-serve` in `src/main/main-tauri.js` so `BookEngine` does not collide with the Tauri Node sidecar HTTP port (`3001`).
- **About Dialog & Version Metadata**:
  - Updated the About dialog (`src/renderer/js/app.js` and `src/renderer/about-libraries.json`) to display the actual runtime shell versions (`Electron 38.8.6` / `Tauri 2.11.3`) instead of the MarkDD app version.
  - Bumped application version to `2.4.3` across `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src/version.js`, `README.md`, and renderer UI/manifests.
