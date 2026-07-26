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
