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
- **Tauri 2.0 Native NSIS Installer**: `src-tauri/target/release/bundle/nsis/MarkDD Editor_2.4.0_x64-setup.exe`
- **Tauri 2.0 Native Executable**: `src-tauri/target/release/markdd-editor.exe`
- **Tauri 2.0 Portable Zip Archive**: `src-tauri/target/release/bundle/portable/markdd-editor_2.4.0_portable_x64.zip`
- **Electron Native NSIS Installer**: `dist-final/MarkDD Editor Setup 2.4.0.exe`
- **Electron Portable Unpacked Zip**: `dist-final/MarkDD Editor 2.4.0 portable_unpacked.zip`
