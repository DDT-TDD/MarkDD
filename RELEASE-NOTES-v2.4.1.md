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
