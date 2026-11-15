# MarkDD Editor — Release History Archive (v1.3.1 – v2.4.3)

For the latest release notes, see [RELEASE-NOTES-v2.5.0.md](RELEASE-NOTES-v2.5.0.md).

---

<!-- Archived from RELEASE-NOTES-v2.4.3.md -->

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

---

<!-- Archived from RELEASE-NOTES-v2.4.2.md -->

# Release Notes 

**Version:** 2.4.2  
**Date:** November 6, 2026  
**Type:** Feature Enhancement, Precision Alignment & Splitter Durability

---

## 🎯 Release Highlights

MarkDD Editor v2.4.2 resolves critical UI usability issues in dual-panel split mode:
1. **Indestructible Central Splitter**: Completely fixes the bug where resizing the split panel was only possible once before the resizer collapsed and disappeared.
2. **Deterministic Editor-to-Preview Alignment**: Achieves exact physical alignment between the Markdown editor and preview panel, eliminating header height offsets, first-child margin collapse, and scroll drift across long documents.
3. **Live WYSIWYG Editing**: Introduces direct on-screen editing in the Preview panel with two-way synchronization back to exact source lines in the CodeMirror editor.

---

## 🛠️ Key Improvements & Bug Fixes

### 1. Indestructible Central Split-Panel Resizer
- **Flexbox Sizing Fix**:
  - Previously, dragging the splitter set `flex: 0 0 ${leftWidth}px` and `flex: 0 0 ${rightWidth}px` on `#editor-container` and `#preview-container`. When the sidebar was open or margins applied, the sum exceeded the container width, forcing the default `flex-shrink: 1` on `#splitter` to crush its width down to `0px`.
  - Locked `#splitter` to `flex: 0 0 6px !important; flex-shrink: 0 !important; min-width: 6px;` in `src/renderer/styles/main.css`.
  - Added an invisible pseudo-element (`::after`) expanding the hit target 4px horizontally (`left: -4px; right: -4px`) for effortless grabbing.
  - Re-engineered `setupSplitter()` in `src/renderer/js/app.js` to calculate available width minus the sidebar (`containerRect.right - editorStartLeft - splitterWidth`) and apply proportional flex ratios (`flex: ${clamped} 1 0px` / `flex: ${100 - clamped} 1 0px`), ensuring unlimited continuous resizing without collapsing.
  - Added layout resize notification hooks to update math diagrams and scroll alignment dynamically during split dragging.

### 2. Precision Editor-to-Preview Vertical Alignment
- **Header Standardization**:
  - Aligned split-mode header heights so Line 1 starts at identical vertical pixel offsets in both panels (`.tab-bar` 36px + `.panel-header` 36px = 72px total header offset).
  - Enforced `.preview > :first-child { margin-top: 0 !important; }` to eliminate heading margin collapsing.
- **Section-Bounded Heading Anchoring**:
  - Replaced uniform line-division heuristics with AST source-block boundary extraction (`parseMarkdownBlockAnchors()`).
  - Implemented section-bounded element mapping in `rebuildLineElementMap()`, grouping document lines by Markdown headings (`h1`–`h6`) and isolating mapping within each section.
  - Excluded Table of Contents (`[TOC]`) DOM descendants from content element matching, preventing 40+ synthetic `<li>` elements from causing downstream cross-section drift.
- **Piecewise-Linear Interpolation**:
  - Computed wrapped-line pixel coordinates (`measureEditorLinePixelOffsets()`) and constructed anchor curves (`buildScrollAnchorCurve()`).
  - Replaced arbitrary 1/3 viewport offsets with true top-to-top (`0px -> 0px`) and bottom-to-bottom locks, ensuring silky bidirectional synchronized scrolling.

### 3. Live WYSIWYG Editing in Preview
- **WYSIWYG Toggle**:
  - Added a dedicated `#wysiwygToggleBtn` (`✏️`) in the Preview panel header.
- **Direct Block Editing**:
  - Clicking text elements (`h1`–`h6`, `p`, `li`, `blockquote`) in WYSIWYG mode makes them directly editable (`contenteditable="true"`).
  - Edits automatically synchronize back to the exact source line in the Markdown editor on `input` and `blur` events without resetting editor scroll or cursor state.
- **Math & Diagram Protection**:
  - Math blocks (KaTeX / MathJax), code blocks, and diagrams (Mermaid, TikZ, PlantUML) are shielded from direct DOM alteration to protect rendered structures against corrupting user edits.

### 4. Interactive Electron NSIS Installer & Start Menu Creation
- **Assisted Installer Configuration (`oneClick: false`)**:
  - Replaced the silent single-click install with a full interactive NSIS wizard allowing users to review installation settings, select custom installation directories, and cleanly reinstall.
  - Set distinct registry uninstaller identification (`MarkDD Editor (Electron)`) to prevent namespace collisions with the Tauri NSIS package in Windows Installed Apps.
- **Dedicated Start Menu Folder & Shortcuts**:
  - Added `scripts/installer.nsh` with custom install/uninstall hooks.
  - Automatically creates a dedicated Start Menu directory (`Start Menu\Programs\MarkDD Editor`) containing:
    - Application shortcut (`MarkDD Editor.lnk`) with high-resolution app icon and AUMI registration.
    - Dedicated Uninstaller shortcut (`Uninstall MarkDD Editor.lnk`).
  - Cleans up legacy loose shortcuts directly under `Programs\` on fresh installs.

### 5. Package Size Optimization & Redundant Payload Removal
- **ASAR Payload Deduplication**:
  - Identified that `"resources/**/*"` was erroneously included in electron-builder's `files` pattern in `package.json`.
  - When Tauri's build step (`scripts/prepare-resources.ps1`) staged the workspace dependencies inside `resources/`, electron-builder packaged that entire duplicate copy of `node_modules` (362 MB, 25,500+ files) directly into `app.asar`.
  - Excluded `!resources{,/**/*}` from electron-builder files.
  - Reduced `app.asar` from **719 MB down to 349 MB** (51.5% size cut).
  - Reduced total unpacked portable distribution from **1.07 GB down to 667 MB**.
  - Reduced the Electron Windows installer from **268.6 MB down to 187.7 MB**.

---

## 🧪 Verification & Quality Assurance

- **Verification Gate 1 (`test/test_splitter_alignment_wysiwyg.js`)**: **18 / 18 Passed (0 Failures)**
  - Confirmed `.splitter` flex-shrink is 0 and 6px width.
  - Validated splitter durability across 5 consecutive drag cycles (proportional flex preserved, splitter retained 6px width).
  - Validated Line 102 (`## Mathematical Expressions`) maps to exact `<h2>` heading element.
  - Validated Line 122 (`## Chemistry Equations`) and Line 506 map to exact headings.
  - Validated top-to-top scroll lock (`0px -> 0px`) and bidirectional scroll alignment.
  - Validated WYSIWYG mode activation, `contenteditable` toggling, and two-way sync back to Markdown source.
- **Verification Gate 2 (`test/test_math_rendering_audit.js`)**: **Passed (0 Failures, 100%)**
  - Confirmed zero leaked math placeholders and zero `.katex-error` spans across `examples/COMPREHENSIVE-FEATURES-SHOWCASE.md`.
- **Verification Gate 3 (`test/test_tauri_runtime_parity.js`)**: **5 / 5 Passed (0 Failures)**
  - Validated cross-runtime IPC, file operations, export pipelines, and version manifest consistency.

---

## 📦 Build Artifacts

- **Electron Native NSIS Installer**: `dist-final/MarkDD Editor Setup 2.4.2.exe` (187,734,862 bytes)
- **Electron Native Portable**: `dist-final/MarkDD Editor 2.4.2 portable_unpacked.zip` (248,674,888 bytes / 237 MB)
- **Tauri 2.0 Native NSIS Installer**: `src-tauri/target/release/bundle/nsis/MarkDD Editor_2.4.2_x64-setup.exe` (13,413,541 bytes)
*(Note: As per project guidelines, no portable zip is created for the Tauri build).*

---

<!-- Archived from RELEASE-NOTES-v2.4.1.md -->

# Release Notes - MarkDD Editor v2.4.1

**Version:** 2.4.1  
**Date:** November 4, 2026  
**Type:** Maintenance, Zero-Regression Math Engine Fixes & Runtime Hardening

---

## 🎯 Release Highlights

MarkDD Editor v2.4.1 resolves math rendering defects, ensures strict zero-regression parity across showcase documents, eliminates vendor script loading race conditions, and synchronizes application versioning across the entire Electron and Tauri ecosystems.

---

## 🛠️ Key Improvements & Bug Fixes

### 1. LaTeX Math Engine & Formula Protection
- **Subscript & Operator Support in Inline Math**:
  - Fixed an overly aggressive regex in `protectLaTeXEnvironments` that incorrectly treated subscripts (`_`), asterisks (`*`), and tildes (`~`) as Markdown formatting, causing formulas like `$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$` and `$\int_{a}^{b} f(x)dx$` to remain unrendered as raw text.
  - Resolved `marked` formatting conflicts where formulas containing multiple subscripts (`$\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$`) were parsed into italic HTML (`<em>`), corrupting formulas in the preview.
  - Allowed math function expressions (`$f(x)$`, `$g(x,y)$`, `$P(A|B)$`, `$O(n^2)$`) by scoping function detection to property dot-calls (`obj.method()`).
  - Added `-` (minus sign) and expanded Greek symbols to math indicator detection.

### 2. Code Block Isolation
- Pre-masked fenced code blocks (` ```...``` ` and `~~~...~~~`) and inline code spans (` `...` `) before scanning for LaTeX math.
- Code blocks containing LaTeX or Markdown examples (e.g. ```` ```latex ```` or ```` ```markdown ````) now preserve raw code without inserting or leaking `<span class="math-placeholder"...>` tags.

### 3. Chemistry & Mathematical Inequalities
- Replaced global `/<[^>]*>/g` tag strippers with strict HTML tag regex (`/<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[^>]*)?>/g`).
- Reversible reaction arrows (`\ce{N2 + 3H2 <=> 2NH3}`) and chained inequalities (`$a < b \text{ and } c > d$`) are preserved intact.

### 4. Marked Extensions Stability
- Updated `alert` (`[!NOTE]`) and `container` (`:::info`, `:::warning`) extensions to tokenize child inline tokens via `this.lexer.inline`.
- Prevents `marked` v16 from throwing `Token with "undefined" type was not found` during showcase and custom container rendering.

### 5. Instant Startup & Vendor Synchronization
- Bundled and loaded `vendor/marked.min.js`, `vendor/katex.min.js`, `vendor/mhchem.min.js`, and `vendor/auto-render.min.js` synchronously in `index.html`.
- Eliminated async script injection latency and race conditions on initial startup in both Electron and Tauri desktop modes.
- Cached MathJax readiness check in `isMathJaxReadySync()` to remove redundant SVG generation on each placeholder.
- Removed dead duplicate `renderMathBlock` and `generateLineNumbers` stub overwrites.

### 6. Version & About Parity
- Synchronized version `2.4.1` across `package.json`, `tauri.conf.json`, `Cargo.toml`, `src/version.js`, `index.html`, and `about-libraries.json`.
- Dynamic package metadata lookup in Tauri backend IPC (`get-package-data`) so the About dialog and bottom-right status indicator accurately reflect v2.4.1 in all environments.

---

## 🧪 Verification & Quality Assurance

- **Verification Gate 1 (`test/test_math_rendering_audit.js`)**: Passed (0 failures)
  - Validated inline math with subscripts, asterisks, tildes, minus signs, and functions.
  - Validated display math, equations, cases, and matrices.
  - Validated mhchem chemistry expressions and `<=>` reversible arrows.
  - Validated code blocks containing math syntax (0 leaked placeholders).
  - Validated full rendering of `examples/COMPREHENSIVE-FEATURES-SHOWCASE.md`.
  - Validated full rendering of built-in `editor.js` feature showcase.
- **Verification Gate 2 (`test/test_tauri_runtime_parity.js`)**: Passed (5/5 tests, 0 failures)
- **Verification Gate 3 (`test/render_test.js`)**: Passed (0 failures)

---

## 📦 Build Artifacts
- **Tauri 2.0 Native NSIS Installer**: `MarkDD Editor_2.4.1_x64-setup.exe`
- **Electron Native Portable**: `MarkDD Editor 2.4.1 portable_unpacked.zip`
- **Electron Native NSIS Installer**: `MarkDD Editor Setup 2.4.1.exe`

---

<!-- Archived from RELEASE-NOTES-v2.4.0.md -->

# Release Notes - MarkDD Editor v2.4.0

**Release Date:** October 26, 2026  
**Version:** 2.4.0  
**Targets:** Windows x64 (Tauri 2.0 Native NSIS Installer, Electron Native NSIS Installer, Standalone Portable Editions)

---

## 🛡️ Major Security Audit & Vulnerability Remediation

This release is a dedicated security overhaul delivering full-stack vulnerability patching, defense-in-depth mitigations against the latest Node.js security advisories, and runtime package upgrades.

### 1. Node.js October 2026 Security Release Alignment
Aligned codebase against the October 21, 2026 Node.js security releases (Node.js v24.22.1, v26.12.1, v22.23.4) and patched corresponding threat vectors:
- **NUL Character Truncation Protection (CVE-2026-105482)**:
  - Hardened file path decoding (`percentDecode`) and argument parsing (`extractFilePath`) in both Tauri and Electron main processes to reject strings with embedded NUL bytes (`\0` or `%00`), preventing silent path truncation attacks.
- **Fullwidth Unicode Hostname & IP Bypass Protection (CVE-2026-105483 & CVE-2026-106069)**:
  - Implemented strict hostname validation for external URL dispatching (`open-external`), rejecting non-standard/fullwidth characters (`[\uFF01-\uFF5E]`) that could bypass hostname allowlists or TLS validation.
- **Brotli & Keep-Alive Hardening**:
  - Validated local Node.js engine compatibility at v24.22.1 incorporating upstream Brotli memory-safety fixes (CVE-2026-111497) and keep-alive socket safeguards.

### 2. Backend & IPC Security Hardening
- **Local Loopback Interface Isolation**:
  - The headless Node.js backend (`main-tauri.js`) now binds exclusively to `127.0.0.1` instead of `0.0.0.0`, eliminating exposure of local file system APIs (`/fs/*`) and preview endpoints to the local network (LAN).
- **CORS Strict Origin Validation**:
  - Replaced wildcard `Access-Control-Allow-Origin: *` with strict origin allowlist validation (`tauri://localhost`, `http://localhost:*`, `http://127.0.0.1:*`), actively rejecting untrusted browser origins with `403 Forbidden`.
- **Command Injection Prevention**:
  - Refactored `open-external` in both Electron and Tauri backends to use parameterized `spawn`/`execFile` calls rather than string-interpolated shell commands, with strict protocol validation (`http:`, `https:`, `mailto:` only).
  - Secured `install-plugin` and `uninstall-plugin` handlers with an npm package name allowlist regex (`/^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i`) and parameterized `execFile` arguments.

### 3. Dependency Vulnerability Upgrades (Zero Production Vulnerabilities)
- **Production Audit Clean**: `npm audit --omit=dev` now reports **0 vulnerabilities** (down from 45 prior to remediation).
- **DOMPurify Upgrade**: Upgraded to `3.4.17` resolving critical DOM XSS vulnerabilities (GHSA-p98j-92pf-mc4p, GHSA-6688-9rhm-gjv2, GHSA-cg2g-xh64-v4q7, GHSA-mrv2-3pqr-j5jr, GHSA-c6gr-qvv4-5v3f).
- **Tar Hardening**: Overridden to `7.5.22` resolving multiple critical arbitrary file write and hardlink path traversal advisories (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97).
- **Vega & Visualization Ecosystem**: Upgraded to `vega@6.4.0`, `vega-lite@6.5.0`, `vega-embed@7.3.0` resolving XSS vulnerabilities in expression and function handlers.
- **KaTeX**: Upgraded to `0.19.1` resolving prototype pollution risks (GHSA-238p-pmpm-9mq7).
- **Puppeteer & FTP Utilities**: Upgraded to `puppeteer@25.16.0` and `basic-ftp@6.2.3` resolving CPU denial of service and memory exhaustion issues.
- **Markdown Pipeline**: Maintained `markdown-it@14.1.0` with `linkify-it@5.0.2` (securing ReDoS vectors while preserving full CommonJS constructor API compatibility for BookEngine and Markdown parsers).
- **Electron Builder**: Upgraded to `electron-builder@26.18.0`.

### 4. UI Consistency & Tauri Webview Parity
- **Tauri Webview2 CORS Resolution**: Enhanced CORS validation in `main-tauri.js` to recognize `http://tauri.localhost` / `https://tauri.localhost` alongside `tauri://*`, allowing seamless IPC bridge resolution under Windows WebView2.
- **Version Display & Fallbacks**: Synchronized all version badges, about modals, settings panel indicators, and package IPC handlers to display `MarkDD Editor v2.4.0` across Electron, Tauri, and Web modes.
- **Showcase & Diagram Preview Optimization**: Fixed renderer initialization safeguards so `COMPREHENSIVE-FEATURES-SHOWCASE.md` loads instantly and renders all interactive diagrams, TikZ, KaTeX, and MathJax blocks with zero delay.

---

## 🛠️ Verification & Test Results
- **Tauri Runtime Parity**: 5/5 tests passed (`test_tauri_runtime_parity.js`).
- **Math Rendering Audit**: 100% passed with zero regressions (`test_math_rendering_audit.js`).
- **Diagram Export Suite**: 12/12 tests passed (`test_diagram_export.js`).
- **WaveDrom Generator**: Passed (`test_wavedrom_svg.js`).
- **Menu Bar Coverage**: 179/179 menu buttons verified and wired (`check_unwired_menus.js`).
- **Presentation Suite**: Passed (`test_presentation.js`).
- **CV & Resume Studio**: Passed (`test_cv_features.js`).

---

## 📦 Build Artifacts

## 📦 Build Artifacts
- **Tauri 2.0 Native NSIS Installer**: `MarkDD Editor_2.4.0_x64-setup.exe`
- **Tauri 2.0 Portable Zip Archive**: `markdd-editor_2.4.0_portable_x64.zip`
- **Electron Native NSIS Installer**: `MarkDD Editor Setup 2.4.0.exe`
- **Electron Portable Unpacked Zip**: `MarkDD Editor 2.4.0 portable_unpacked.zip`

---

<!-- Archived from RELEASE-NOTES-v2.3.0.md -->

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

---

<!-- Archived from RELEASE-NOTES-v2.2.0.md -->

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

---

<!-- Archived from RELEASE-NOTES-v2.1.0.md -->

# MarkDD Editor v2.1.0 Release Notes

**Release Date**: August 20, 2026  
**License**: MIT  
**Platforms**: Windows (NSIS Installer, Portable ZIP, Electron Setup), macOS, Linux

---

## 🌟 Overview

MarkDD Editor v2.1.0 is a major security, stability, and rendering enhancement release. This release eliminates 32+ security advisories across dependencies, solves mathematical rendering false-positives (where ordinary code spans and currency sentences were mistakenly treated as math), fixes single-instance document routing on Windows, and adds a comprehensive runtime module inspector in the About dialog.

---

## 🔒 Security Vulnerability Remediation

- **Core & Transitive Package Updates**:
  - Upgraded or patched critical and high-severity dependencies across `ws` (memory disclosure & DoS), `tar` / `electron-builder` (path traversal), `vega` suite (expression injection XSS), `nanoid`, `picomatch`, `postcss`, `tmp`, `uuid`.
- **Removed Unused & Vulnerable Subsystems**:
  - Cleaned `@cartamd/plugin-tikz` (and its vulnerable transitive `vue-template-compiler` dependency).
  - Replaced legacy `viz.js@2.x` with `@aduh95/viz.js@3.7.0`.
- **IPC & Endpoint Boundary Hardening**:
  - Validated local loopback HTTP endpoints and IPC request paths against directory traversal attacks.

---

## 🧮 Markdown & Math Rendering Engine Upgrades

- **AsciiMath Backtick Isolation**:
  - Removed aggressive backtick math interception. In standard Markdown, backticks (`` `code` ``) are strictly preserved as inline code spans.
  - Eliminated false-positive math rendering on words containing math substrings (`int main()`, `console.log`, `export default`, `path/to/file`, `markdd-editor`, `id = 123`).
- **Strict Inline Math ($...$) Delimiters**:
  - Enforced TeX delimiter whitespace conventions:
    - Opening `$` must not be preceded by word characters and must not be followed by whitespace (`(?<![\w\\$])\$(?!\s)`).
    - Closing `$` must not be preceded by whitespace and must not be followed by digits or word characters (`(?<!\s)\$(?![0-9\w\$])`).
  - Currency sentences such as `The ticket is $50 and food is $100` are rendered cleanly as normal text with dollar signs, rather than broken math equations.
  - Valid LaTeX expressions (`$E = mc^2$`, `$\int_0^1 f(x)dx$`, `$$\sum_{i=1}^n i$$`) continue to render with 100% precision via KaTeX and MathJax.

---

## 🖥️ Desktop Integration & Single-Instance Multi-Tab Routing

- **Windows File Association**:
  - Fixed Windows Registry file association entries to point directly to `markdd-editor.exe "%1"`, completely eliminating extraneous Node command console windows upon double-clicking `.md` files.
- **Single-Instance Multi-Tab Support**:
  - Integrated `tauri-plugin-single-instance`. Double-clicking any `.md` file while MarkDD is already running focuses the existing window and opens the file in a new tab without creating redundant application instances.
- **Recent Files Fix**:
  - Fixed recent files list opening and payload parsing in Tauri mode, preventing false-positive file removals.

---

## 📦 Loaded Modules & Libraries (Listed in About Dialog)

| Module / Library | Version | Description |
| :--- | :--- | :--- |
| **Application Shell** | `2.1.0` | Tauri 2.0 / Electron hybrid desktop runtime |
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
| **Book Engine** | `2.1.0` | Multi-chapter book and thesis publishing pipeline |
| **Presentation Mode** | `2.1.0` | 30 Beamer-style slide themes & speaker view |
| **CV & Resume Studio**| `2.1.0` | Professional CV templates & live color customizer |

---

## 🛠️ Build Artifacts

- **Tauri Windows NSIS Setup**: `src-tauri/target/release/bundle/nsis/MarkDD Editor_2.1.0_x64-setup.exe`
- **Tauri Portable ZIP Package**: `src-tauri/target/release/bundle/portable/markdd-editor_2.1.0_portable_x64.zip`
- **Electron Windows Installer**: `dist-final/MarkDD Editor Setup 2.1.0.exe`

---

<!-- Archived from RELEASE-NOTES-v2.0.0.md -->

# Release Notes - MarkDD Editor v2.0.0

We are proud to announce the release of **MarkDD Editor v2.0.0**, marking a landmark evolution in performance, resource efficiency, and platform architecture by migrating the desktop core from **Electron to Tauri 2.0**.

---

## 🚀 Key Architectural Improvements & Performance Delta

### 1. 93% Reduction in Package Installer Size
- **v1.7.0 (Electron)**: ~150 MB binary installer package.
- **v2.0.0 (Tauri 2.0)**: **10.5 MB** installer package (`markdd-editor_2.0.0_x64-setup.exe`).
- **Memory Footprint**: Massive drop in idle RAM consumption by replacing heavy embedded Chromium instances with system-native WebViews.

### 2. Unified Native & Web Bridge (`bridge.js`)
- Authored a transparent frontend platform bridge ([bridge.js](file:///c:/Users/DD/Desktop/MARKDD/WP/src/renderer/js/bridge.js)) that intercepts Node `fs` and `path` operations.
- Intercepts synchronous disk reads/writes via a high-speed local loopback endpoint on `http://localhost:3001`, preserving 100% backward compatibility for standard DOM/JS assets without breaking frontend code conventions.

### 3. Headless Node Compiler Engine (`main-tauri.js`)
- Runs the original main backend process headlessly in Node.js ([main-tauri.js](file:///c:/Users/DD/Desktop/MARKDD/WP/src/main/main-tauri.js)), maintaining complete compatibility with:
  - MathJax & TikZJax server-side compilation
  - Puppeteer pixel-perfect PDF rendering (for Academic Thesis, CV, and Beamer Presentations)
  - Book Engine CLI & live preview static serving
- Includes automatic parent PID process monitoring to ensure clean background shutdown on application exit.

### 4. PowerPoint (.pptx) Presentation Engine
- **High-Fidelity PPTX Exports**: Overhauled `pptx-exporter.js` to render HTML slides into native PowerPoint presentations matching active slide themes (`darmstadt`, `berlin`, `madrid`, `copenhagen`, etc.).
- **High-Res TeX Math Rendering**: Display math formulas (integrals, summations, fractions) render as high-definition 300 DPI PNG equation images, while inline math uses `Cambria Math` typography.
- **Native Diagram PNG Embeds**: Converts Mermaid flowcharts and sequence diagrams into Kroki PNG images, eliminating "The picture can't be displayed" placeholders in MS PowerPoint desktop.
- **Side-by-Side Multi-Column Layouts**: Native support for `.columns > .column` layout blocks in PowerPoint slides.

### 5. Executable & System Integration
- **Binary Output**: Compiled executable binary is named **`markdd-editor.exe`**.
- **Installation Path**: Standardized Windows user installation path explicitly forced to **`C:\Users\<username>\AppData\Local\Programs\markdd-editor`** (matching legacy electron-builder locations).
- **Windows File Associations**: Double-clicking associated `.md` files opens directly inside MarkDD, utilizing single-instance loopback IPC messaging when the app is already open.
- **Single-Window Window Management**: Configured secondary webviews (`cv-preview` and `presentation-preview`) to generate on-demand dynamically, guaranteeing only 1 primary window opens on startup.

---

<!-- Archived from RELEASE-NOTES-v1.7.0.md -->

# Release Notes - MarkDD Editor v1.7.0

We are proud to introduce **MarkDD Editor v1.7.0**, bringing **Academic Thesis Mode** with 10 beautiful, LaTeX-identical university cover layouts, support for dynamic custom university templates, and critical fixes for compiler stability and GitHub Actions license generation workflows.

## What's New in v1.7.0

### 1. Academic Thesis Mode
You can now create full academic theses inside MarkDD. The new mode generates a standard thesis directory structure with:
*   Pre-populated, structured sections: `SUMMARY.md` outline, `abstract.md`, `declaration.md` (Authorship declaration), `dedication.md`, `acknowledgements.md`, `chapters/` (populated with real math and SVG diagrams), `appendix.md`, and `bibliography.md`.
*   A dedicated "University Thesis" menu button and dialog wizard to easily input Thesis Title, Degree, Department, Supervisor, and Co-Supervisor.

### 2. LaTeX-Identical University Cover Templates
We have recreated the exact title page layouts and typography rules for 10 of the most prestigious universities in the world. When exporting your thesis as a PDF or previewing it, you can select styling matching:
*   **MIT** (Massachusetts Institute of Technology)
*   **Harvard University**
*   **Stanford University**
*   **University of Oxford**
*   **University of Cambridge**
*   **University of Oslo (UiO)**
*   **Università di Bologna (UniBo)**
*   **Politecnico di Milano (PoliMi)**
*   **ETH Zurich**
*   **Imperial College London**
*   **Standard Academic Template** (classic serif layout)

### 3. Dynamic Custom University Templates
Universities can now easily release and distribute their own custom MarkDD templates:
*   Just place your template folder containing `template.json`, `SUMMARY.md`, a `chapters/` folder, and an optional `custom.css` in either the workspace `.markdd/templates/thesis/` or the global app data `templates/thesis/` folder.
*   MarkDD scans these directories on launch and dynamically displays your custom templates in the creation dropdown dialog. When selected, it automatically copies all your custom structure and stylesheets to the target directory.

### 4. Critical Fixes & Improvements
*   **NPM Transitive License Scanner**: Rewrote the license scanner script to support parsing modern npm lockfiles (`lockfileVersion: 3`), preventing GitHub Actions workflow errors.
*   **Export Document Stability**: Implemented the missing `composeDocument` method in the renderer, resolving previous export-to-PDF crashes in Book/Thesis modes.
*   **Port Cleanup**: Added will-quit socket cleanup to ensure the preview web server shuts down gracefully on application exit, avoiding TCP port conflicts.
*   **CV Preview Reliability**: Overhauled regex parsing in the CV preview dynamic update handler to match the entire body content, fixing the issue where multi-page CVs or frequent keyboard inputs crashed or repeatedly reloaded the preview window.
*   **Dynamic Chapters & Appendices Generation**: Enhanced template copying to dynamically build `SUMMARY.md` and generate missing chapter/appendix files on-the-fly according to the wizard's requested counts (e.g. 7 chapters and 3 appendices) for all built-in university presets, while safely preserving custom layouts of third-party templates.
*   **Live Preview Style Fidelity**: Updated the editor's main preview style generator to asynchronously load and append `custom.css` overrides, aligning the live HTML editor preview exactly with compiled PDF outputs.
*   **Electron ASAR Unpacked Templates**: Configured ASAR unpacking for thesis templates to prevent Node file copy operations from failing with `ENOENT` directory errors in the production build.
*   **SVG Auto-sizing Rendering**: Replaced invalid non-standard SVG `height="auto"` assignments with attribute deletion, preventing Chrome renderer crashes.

---

<!-- Archived from RELEASE-NOTES-v1.6.0.md -->

# Release Notes - MarkDD Editor v1.6.0

We are proud to introduce **MarkDD Editor v1.6.0**, bringing deep color customization support to all CV templates and an optimized, high-speed preview rendering engine.

## What's New in v1.6.0

### 1. Harmonized CV Color Customization
We have restructured the YAML `colors` front-matter block to support targeted styling of colored regions (such as sidebars, headers, and backgrounds):
*   **New Keys**: `sidebarBg`, `sidebarText`, `headerBg`, and `headerText` can now be set directly.
*   **CSS Variable Injections**: All templates have been updated to map colors dynamically via CSS variables (`--cv-sidebar-bg`, `--cv-sidebar-text`, etc.), giving you absolute control over theme aesthetics.

### 2. Contextual Color Customization Dialog
The "Customize CV Colors" color picker dialog now dynamically adapts to the template style of the file you are editing:
*   **Sidebar Layouts** (`modern-sidebar`, `twenty-seconds`, etc.) automatically show color inputs for the primary accent, secondary details, body text, page background, sidebar background, and sidebar text.
*   **Casual Layouts** (`moderncv-casual`) show color pickers for the top header background and header text.
*   **Standard Layouts** show standard page-level accent and body text inputs.

### 3. Expanded Color Presets
Three brand new color presets have been added to the CV menu:
*   **Coffee Warm**: Soft, organic earth tones (`coffee`).
*   **Sunset Orange**: Vibrant gradient vibes (`sunset`).
*   **Soft Lavender**: Creative, modern purple accent hues (`lavender`).

All existing presets (`navy`, `slate`, `green`, `burgundy`, `charcoal`, `teal`, `dark`) have been updated with coordinated sidebars and headers for readable, beautiful color schemes.

### 4. High-Speed, Offline-Ready Live Preview
The CV Preview rendering pipeline has been rewritten to eliminate lag:
*   **Dynamic DOM Injection**: When the preview window is already open, changes are dynamically pushed into the active DOM using `webContents.executeJavaScript` instead of performing a full page reload.
*   **Offline Support**: Bypasses network cache validations to the CDN libraries (KaTeX, Font Awesome, Google Fonts). Edits update instantly in milliseconds without flashing a blank page.

### 5. Robust Local File Handling
Export paths and temporary files now leverage Node's `url.pathToFileURL`, resolving previous rendering bugs if the Windows user profile path contains spaces or special characters.

---

<!-- Archived from RELEASE-NOTES-v1.5.2.md -->

# Release Notes - MarkDD Editor v1.5.2

We are excited to announce the release of **MarkDD Editor v1.5.2**, bringing PowerPoint integration directly to MarkDD's Presentation Mode. You can now import PowerPoint slides into Markdown and export your Markdown presentations into styled, native PowerPoint `.pptx` documents, all completely offline and client-side.

---

## What's New in v1.5.2

### 1. PowerPoint (.pptx) Importer
*   **100% Offline Parsing**: Powered by `JSZip` and the browser's native XML `DOMParser`.
*   **Flexible Options**:
    *   **Content & Styles**: Extracts slide titles, headers, bullet structures, and maps theme color schemes (background, text, primary, secondary) into Markdown YAML front-matter.
    *   **Content Only**: Import slide text content using default presentation styling.
    *   **Styles Only**: Initialize a blank presentation with slide front-matter matching the PowerPoint theme.
*   **Smart Dark Mode Detection**: Automatically calculates theme background brightness to configure slide templates as `simple-light` or `simple-dark`.

### 2. PowerPoint (.pptx) Exporter
*   **PowerPoint Generator**: Leverages `PptxGenJS` (MIT licensed) to generate structured wide-screen presentation decks.
*   **Accurate Formatting**: Maps Markdown YAML colors directly into PowerPoint slide backgrounds, headings, standard text runs, and multi-level list bullets.
*   **Smart Image Layouts**: Automatically detects local and remote images in slide content and arranges slides using a professional split-column layout (text on the left, images on the right).

### 3. Integrated Presentation UI
*   Added **Import PowerPoint (.pptx)...** and **Export Presentation as PowerPoint (.pptx)** options to the **Presentation** menu dropdown.
*   Added a clean PowerPoint Import Options Modal.

### 4. IPC Dialog Handlers
*   Registered native `show-open-pptx-dialog` and `show-save-pptx-dialog` IPC channels in the Electron main process, matching typical file-browser operations.

---

## Verifying the Release

All automated tests have completed with **0 failures**:
*   `test/test_pptx_importer.js` (Success): Validates theme color parsing, shape text placeholder extraction, and multi-level list formatting.
*   `test/test_pptx_exporter.js` (Success): Validates PptxGenJS slide creation, color configuration mapping, title slide formatting, and list generation.
*   `test/test_presentation.js` (Success): Validates slide inline markup and progress bars.
*   `test/test_cv_photo.js` (Success): Validates CV photo path resolution.

---

<!-- Archived from RELEASE-NOTES-v1.5.1.md -->

# MarkDD Editor v1.5.1 Release Notes

We are pleased to release **MarkDD Editor v1.5.1**! This update expands both **CV Mode** and **Presentation Mode** with beautiful new layouts, FontAwesome icons, proficiency progress bars, and important license attributions for the open-source designs that inspired these layouts.

---

## What's New in v1.5.1 📄

### 1. 5 Brand New LaTeX-Inspired CV Themes
We have added 5 new templates to the theme collection, based directly on popular styles from Overleaf and GitHub:
*   **Forty Seconds CV (`forty-seconds`)**: An elegant double-column template featuring a light, clean sidebar for contact info, skills, and progress bars.
*   **Twenty Seconds CV (`twenty-seconds`)**: A striking layout featuring a dark left sidebar housing the profile photo, contact details, and skill ratings.
*   **Simple Hipster CV (`hipster`)**: A modern, typographic layout with bold titles and a split design.
*   **Sixty Seconds CV (`sixty-seconds`)**: A multi-page friendly sidebar layout featuring clean margins, bold headers, and unified color blocks.
*   **Entry Level Resume (`entry-level`)**: An ATS-friendly, clean single-column layout optimized for readability without sidebars.

### 2. FontAwesome Contact Icons
*   Contact fields (Email, Phone, Location, Website, GitHub, LinkedIn, Twitter) now automatically render with FontAwesome 6.4.0 icons by default.
*   If you prefer the original text-only label layout, simply add `icons: false` to the YAML front-matter metadata.

### 3. Skill Progress Bars in CV & Presentation Modes
*   **CV Mode**: Under any heading containing "Skills", lists with pipe-separated ratings (e.g. `JavaScript | 90%` or `Python | 4/5`) render as beautiful visual progress bars showing your proficiency level.
*   **Presentation Mode**: The same rating lists under slide headers containing "Skills" are automatically compiled into beautifully styled CSS progress bars dynamically inheriting the theme's primary color (`--slide-primary`). Skills without ratings are styled as tag pills.
*   **Overlap Protection**: Disabled theme-specific pseudo-element bullets on skill lists to prevent horizontal overlap/line-throughs on text.

### 4. Nested Template Submenus
*   The "CV" and "Help" menus have been updated to replace the flat "CV Examples" option with nested submenus, allowing you to load each of the 5 templates directly into a new editor tab.

### 5. Third-Party License Attribution
*   Added clear open-source attributions and licensing details for FontAwesome and the original LaTeX template authors to `THIRD-PARTY-LICENSES.md` to ensure compliance and respect for the creators of our design inspirations.

### 6. Presentation Highlighting & Inline Markup Fixes
*   Fixed a regression in presentation slides where inline highlighting (`==text==`) failed to render. Highlights now display correctly using `<mark>` tags styled for light and dark slide themes.
*   Added support for spoilers (`||`), subscripts (`~`), superscripts (`^`), and keyboard keys (`[[`) in presentation slides.

---

## Upgrade Instructions 🛠️

Simply run the updated installer: **`MarkDD Editor Setup 1.5.1.exe`** to upgrade. All of your existing settings, files, and templates will remain fully intact.

---

<!-- Archived from RELEASE-NOTES-v1.5.0.md -->

# MarkDD Editor v1.5.0 Release Notes

We are thrilled to announce the release of **MarkDD Editor v1.5.0**! This version introduces the highly anticipated **CV Mode**, giving you the power to create professional, print-perfect CVs and resumes directly from simple Markdown with no LaTeX required.

---

## Major New Feature: CV Mode 📄

You can now compose resumes in Markdown and compile them using 10 embedded premium themes inspired by Overleaf's popular templates. 

### Key Capabilities:
*   **10 Premium Themes**: Toggle between templates instantly:
    1.  `classic-latex` (Classic academic serif style with solid section dividers)
    2.  `academic` (Modern, clean, sans-serif design with colored headings)
    3.  `modern-sidebar` (Double-column layout with dark sidebar and Tag Badges for skills)
    4.  `minimalist` (Grid-based layout placing dates in a dedicated left column)
    5.  `decent` (Rounded colored background bars for section titles)
    6.  `awesome-cv` (Roboto typography, bold/regular name contrast, crimson accents)
    7.  `friggeri` (Clean sans-serif layout with multi-colored titles and left dates)
    8.  `moderncv-classic` (Vertical timeline border running down the left margin)
    9.  `moderncv-casual` (Centered headers and casual rounded skill badges)
    10. `executive` (Elegant Garamond serif styling for formal corporate CVs)
*   **Margin Alignment (Pipes `|`)**: Align details easily:
    `### Senior Engineer | Google | Mountain View, CA | 2021 – Present`
    This renders the job title on the left and the date on the right.
*   **Page Breaks & Spacers**: Insert `<!-- newpage -->` / `\newpage` to force page breaks and `<!-- vspace: 12px -->` / `\vspace{12px}` for fine-grained vertical spacing.
*   **Automatic Skills Cloud**: Lists under any section heading containing the word "Skill" automatically render as modern pill badges.
*   **Optional Profile Photos**: Include a `photo` key in your front-matter to render circular profile pictures with automatic relative path resolution (supports `modern-sidebar`, `moderncv-classic`, `moderncv-casual`, `awesome-cv`, and `academic` themes).
*   **7 Predefined Color Presets**: Apply color variations instantly:
    *   Classic Navy, Slate Slate, Forest Green, Burgundy Academic, Charcoal Minimal, Teal Professional, and Dark Slate.
*   **Dedicated PDF Exporter**: Portrait printing utilizing temporary local file resolution to ensure images, fonts, and math render with 100% accuracy.

---

## Bug Fixes & Optimizations 🛠️

*   **Friggeri Layout Bug**: Fixed an issue where text summary sections written before the first `##` header were discarded.
*   **Sidebar Skills Extractor**: Enhanced the extraction logic in the sidebar theme to greedily pull all sub-content under the skills header.
*   **Version single source of truth**: Consistently loads application version dynamically from `package.json`.

---

<!-- Archived from RELEASE-NOTES-v1.4.1.md -->

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

---

<!-- Archived from RELEASE-NOTES-v1.4.0.md -->

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

---

<!-- Archived from RELEASE-NOTES-v1.3.3.md -->

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

---

<!-- Archived from RELEASE-NOTES-v1.3.2.md -->

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

---

<!-- Archived from RELEASE-NOTES-v1.3.1.md -->

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
