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
