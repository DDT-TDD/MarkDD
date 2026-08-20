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
