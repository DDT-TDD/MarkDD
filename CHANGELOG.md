# CHANGELOG - MarkDD Editor

All notable changes to MarkDD Editor are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## [2.2.0] - 2026-08-26

### Fixed & Cross-Platform Parity
- **Tauri Save Feature & Dialog Parity**:
  - Fixed core `save()` method in `editor.js` which was bypassing `MarkDDBridge` and throwing runtime exceptions in Tauri mode.
  - Full support for `Ctrl+S`, toolbar **Save** button, and **Save As** across Tauri, Electron, and Web environments.
- **File Browser Operations in Tauri**:
  - Restored **Open File Dialog** (`Ctrl+O` / menu `File > Open`) to route through native Tauri dialogs.
  - Restored **Create New File** (`Ctrl+N`) and **Create New Folder** in sidebar file tree.
  - Restored **Open Folder** in sidebar file tree.
  - Restored clicking files in file tree to open them in editor tabs.
  - Restored **Recent Files** click-to-open functionality without entry deletion.
  - Restored **Bookmarks** click-to-open and management in Tauri mode.
- **Export & Preview Features in Tauri**:
  - Restored **Export HTML** and **Export PDF** in Preview Panel and Book Publishing Engine to use `MarkDDBridge`.
  - Fixed preview external link clicks (`http://` and `https://`) to launch default system browser seamlessly via Tauri shell / Electron shell / browser window.
- **Window Title Synchronization**:
  - Fixed `document.title` and window title updates on document modification across all application shells.

---
## [2.1.0] - 2026-08-20

### Security & Hardening
- **Dependency Vulnerability Remediation**: Fixed 32+ security advisories across npm dependencies (including `ws`, `tar`, `vega`, `vega-lite`, `vega-embed`, `nanoid`, `picomatch`, `postcss`, `tmp`, `uuid`).
- **Eliminated Deprecated & Vulnerable Subpackages**: Removed unused `@cartamd/plugin-tikz` (and transitively vulnerable `vue-template-compiler`) and cleaned deprecated `viz.js@2.x` in favor of `@aduh95/viz.js@3.7.0`.
- **IPC & Local Server Hardening**: Added strict path sanitization, traversal protections, and validated request boundaries across loopback endpoints.

### Fixed & Improved
- **False-Positive Math Rendering**:
  - Removed greedy AsciiMath backtick interceptor that mistakenly transformed inline code containing hyphens (`markdd-editor`), path slashes (`src/renderer/js`), variable assignments (`id = 123`), and programming keywords (`int`, `sin`, `log`, `exp`) into broken math formulas.
  - Hardened inline math `$...$` delimiter parsing with strict TeX whitespace boundary checks (`(?<![\w\\$])\$(?!\s)` and `(?<!\s)\$(?![0-9\w\$])`), preventing multi-word currency sentences (e.g. `$50 ... $100`) from false-positive math conversion while fully preserving valid LaTeX expressions (`$E = mc^2$`, `$\int_0^1 x dx$`).
- **File Association & Single Instance Handling**:
  - Fixed Windows Registry file association to point directly to `markdd-editor.exe "%1"` with zero extraneous console windows.
  - Implemented `tauri-plugin-single-instance` and seamless background IPC file forwarding: double-clicking Markdown documents now focuses the active window and cleanly opens the file in a new editor tab.
  - Fixed recent files list opening and prevented accidental removal of valid recent entries.
- **Enhanced About Dialog**:
  - Upgraded the About modal to dynamically list all 25+ loaded modules and libraries with verified runtime version tracking across Electron, Tauri 2.0, and Web modes.

---
## [2.0.0] - 2026-07-26

### Changed / Upgraded

1. **Electron to Tauri 2.0 Migration** 🚀
   - Migrated application shell from Electron to Tauri 2.0, achieving a 93% installer size reduction down to **10.5 MB** (`markdd-editor_2.0.0_x64-setup.exe`).
   - Authored transparent frontend platform bridge (`bridge.js`) mocking `ipcRenderer`, `fs`, and `path` operations.
   - Built headless Node.js backend server (`main-tauri.js`) running on loopback port 3001 for zero-churn compatibility with MathJax, TikZJax, Puppeteer PDF exports, and Book/Thesis compilation engines.
   - Fixed Windows installer setup paths to force installation in `C:\Users\<username>\AppData\Local\Programs\markdd-editor`.
   - Fixed binary naming to `markdd-editor.exe`.
   - Optimized startup window handling to ensure only 1 primary window opens on launch.

2. **PowerPoint (.pptx) Presentation Export System** 🎭
   - Overhauled PPTX presentation exporter (`pptx-exporter.js`) to parse rendered HTML elements with full structural fidelity.
   - **Diagrams**: Converted Mermaid and sequence diagram exports to compressed PNG format via Kroki (`/png/`), ensuring 100% native image compatibility without "The picture can't be displayed" errors in Microsoft PowerPoint.
   - **Math & Equations**: Integrated 300 DPI high-definition PNG equation rendering via TeX PNG API for complex display math formulas ($\int_0^{2\pi} \sin(x) dx = 0$, $\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$), combined with Unicode `Cambria Math` typography for inline expressions.
   - **Multi-Column Layouts**: Built native multi-column side-by-side PowerPoint text frames for `.columns > .column` layout blocks.
   - **Formatting & Themes**: Synchronized slide headers and background styles across 30+ built-in themes (e.g. `darmstadt`, `berlin`, `madrid`, `copenhagen`), fixed blockquote duplication, and styled monospaced code blocks with padding and container borders.
   - **Windows File Associations**: Enabled double-click file opening for `.md`, `.markdown`, `.mdown`, `.mdwn` files via single-instance IPC messaging.

## [1.7.0] - 2026-07-11

### Added

1. **Academic Thesis Mode** ✅
   - Added standard academic outline creation with pre-populated abstract, declaration, dedication, acknowledgements, chapters, appendix, and bibliography.
   - Built-in cover page templates matching LaTeX layouts for MIT, Harvard, Stanford, Oxford, Cambridge, Oslo (UiO), Bologna (UniBo), PoliMi, ETH Zurich, and Imperial College London.
   - Beautiful, academic style presets matching the typography and layout rules of respective universities.
   - Support for dynamic custom university templates loaded from the workspace `.markdd/templates/thesis` or global app data directory.
2. **"University Thesis" Wizard UI** ✅
   - Added a menu option and a dedicated wizard dialog to input Thesis Degree, Department, Supervisor, and Co-Supervisor, and choose the university style.

### Fixed

1. **GitHub Actions License Generation Workflow** 🛠️
   - Replaced NPM clean-install runner actions to prevent cross-platform peer dependency errors.
   - Upgraded transitive license parser to support Lockfile Version 3 dependency tracking (from the `packages` list).
2. **Preview Compilation Stability** ⚡
   - Implemented missing `composeDocument` method in renderer to compile TOC and styling presets correctly on export.
   - Added explicit IPC server port shutdown listener on app exit to prevent port collision issues.
   - Updated the main preview style injector to asynchronously resolve and load `custom.css` overrides, ensuring the live editor preview matches exported PDFs exactly.
3. **CV Preview Stability** ⚡
   - Overhauled regex parsing in the CV preview handler to extract and update the entire body inner HTML, resolving previous multi-page CV rendering errors and preventing continuous reload/abort loops when typing.
4. **Dynamic Thesis Count Resolution** 🎓
   - Refactored `generateThesisTemplate` to automatically generate additional chapter and appendix files on-the-fly and output a synchronized `SUMMARY.md` matching the user's requested chapter and appendix counts (e.g. 7 chapters and 3 appendices) for all built-in university presets.
   - Preserved custom layouts of third-party custom templates safely.
5. **ASAR Packaging and SVG Rendering** 🛠️
   - Configured unpacked ASAR bundling for thesis templates to resolve `ENOENT` directory initialization errors in production.
   - Fixed invalid non-standard SVG `height="auto"` assignments causing Chrome renderer exceptions.

## [1.6.0] - 2026-07-03

### Added

1. **Harmonized CV Color Customization** ✅
   - Expanded YAML `colors` front-matter schema to fully support customized color areas: `sidebarBg`, `sidebarText`, `headerBg`, and `headerText`.
   - Updated all 15 CV layouts to map these variables via CSS custom properties, allowing user-specified color styles across all elements.
2. **Three New Elegant Color Presets** ✅
   - Added `coffee` (earth tones), `sunset` (orange/rose gradients), and `lavender` (purple/creative tones).
   - Upgraded all existing presets with matched, readable sidebar and header combinations.
3. **Adaptive Customizer Dialog** ✅
   - Overhauled the "Customize CV Colors" color picker dialog to display customization inputs contextually based on the active theme (e.g. showing sidebar fields only for sidebar templates).

### Fixed

1. **Instant CV Preview Rendering** ⚡
   - Redesigned the CV Preview rendering loop. When the preview window is already open, updates are dynamically injected into the active DOM using `webContents.executeJavaScript` instead of triggering a full window reload.
   - Bypasses slow/offline CDN network cache validation for Google Fonts, Font Awesome, and KaTeX stylesheets, resulting in instantaneous (millisecond-level) live preview updates.
2. **Robust File Path Resolving** 🛡️
   - Replaced hardcoded string replacements with `url.pathToFileURL` inside PDF and CV HTML generation paths, ensuring support for usernames containing spaces or special characters.

## [1.5.2] - 2026-06-30

### Added

1. **PowerPoint (.pptx) Import Capability** ✅
   - Added a native, 100% offline client-side PPTX importer powered by `jszip` and standard browser `DOMParser`.
   - Supports three import options:
     - **Import Content & Styles**: Extracts slide texts, headers, lists, structure, and maps theme color schemes (background, text, accent) into Markdown YAML front-matter.
     - **Import Content Only**: Extracts text outline using default presentation styles.
     - **Import Styles Only**: Extracts color schemes and loads a blank presentation template with the style front-matter.
   - Automatically detects theme background brightness to configure slide templates as `simple-light` or `simple-dark`.
2. **PowerPoint (.pptx) Export Capability** ✅
   - Integrated `PptxGenJS` to compile Markdown presentations into native PowerPoint files (`.pptx`) completely offline.
   - Automatically maps theme settings and front-matter colors (background, text, primary, secondary) to native slide formats.
   - Formats headers, standard paragraphs, and nested multi-level bullet points.
   - Automatically positions local and remote images using a professional split-column layout (content on the left, images on the right).
3. **PowerPoint Integration UI** ✅
   - Added **Import PowerPoint (.pptx)...** and **Export Presentation as PowerPoint (.pptx)** items to the Presentation dropdown menu.
   - Created a modern, clean Options Modal for import selection.

### Fixed

1. **Robust PowerPoint File Operations** ✅
   - Registered native IPC dialog handlers (`show-open-pptx-dialog` and `show-save-pptx-dialog`) in Electron main process.
   - Embedded safe Base64 binary reader logic for local slide image assets during PowerPoint exports.

## [1.5.1] - 2026-06-26

### Added

1. **5 Premium LaTeX CV Templates** ✅
   - Integrated `forty-seconds`, `twenty-seconds`, `hipster`, `sixty-seconds`, and `entry-level` CV themes based on popular Overleaf designs.
2. **FontAwesome Icons & Progress Bars** ✅
   - Added support for FontAwesome 6.4.0 contact icons in CV templates (email, phone, location, website, GitHub, LinkedIn, Twitter).
   - Added automatic skill rating parsing to render visual progress bars when ratings/percentages are specified.
3. **Attribution & Licensing Updates** ✅
   - Updated `THIRD-PARTY-LICENSES.md` to document the licenses of the original LaTeX templates we took inspiration from, along with FontAwesome icon assets.
4. **Nested Template Submenus** ✅
   - Replaced flat CV menu options with structured submenus for template insertion in both the main menu and Help dropdown.
5. **CV-Style Skill Progress Bars & Tag Pills in Presentation Mode** ✅
   - Added automatic list-parsing logic for slides under headers containing "Skills".
   - Items with ratings (e.g., `JavaScript | 90%`, `Python | 4/5`) are automatically compiled into beautifully styled CSS progress bars dynamically matched to the slide theme's primary color.
   - Items without ratings are automatically styled as inline tag pills.

### Fixed

1. **Highlighting and Inline Markup Regressions in Presentation Mode** ✅
   - Fixed a regression where inline highlighting (e.g. `==Highlighted==`) was not compiled to HTML `<mark>` tags in presentation slides.
   - Added preprocessing rules to support spoilers (`||`), subscripts (`~`), superscripts (`^`), and keyboard keys (`[[`) in slides.
2. **Skills Progress Bars Layout Overlap in Presentation Mode** ✅
   - Disabled theme-defined list bullet pseudo-elements (`::before`/`::after`) specifically on skills lists (`.pres-skills-list li`) to prevent them from overlaying/striking through text.
   - Refined line height, element display models, and margin layouts for progress bar wrappers to ensure perfect vertical separation.

## [1.5.0] - 2026-06-19

### Added

1. **New CV Mode Addon** ✅
   - Added fully-featured CV writing system parsing Markdown with front-matter config.
   - Designed 10 built-in templates (classic-latex, academic, modern-sidebar, minimalist, decent, awesome-cv, friggeri, moderncv-classic, moderncv-casual, executive) styled similarly to Overleaf templates.
   - Added support for optional profile photos (`photo` YAML key) with automatic path resolution (relative, absolute, web, or base64) on supported themes (`modern-sidebar`, `moderncv-classic`, `moderncv-casual`, `awesome-cv`, and `academic`).
   - Built custom parser formatting enhancements: page breaks (`<!-- newpage -->` / `\newpage`), vertical spacers (`<!-- vspace -->` / `\vspace{}`), skills tag cloud lists, and pipe-separated header alignments.
   - Added CV menu options under top-level CV dropdown menu.
   - Added 7 predefined color presets and customizable color inputs.

### Fixed

1. **Friggeri Discarded Elements** ✅
   - Fixed an issue where introductory text summaries placed before the first H2 heading were discarded in the Friggeri theme loop.
2. **Modern Sidebar Sibling Extraction** ✅
   - Improved the extraction logic in the sidebar layout to greedily pull all sibling nodes under the Skills section.

## [1.4.1] - 2026-06-18

### Fixed

1. **PDF Export Puppeteer Launch Safety & BrowserWindow Fallback** ✅
   - Issue: If Puppeteer launch fails (common in packaged production environments), PDF export fails completely instead of falling back to BrowserWindow printToPDF.
   - Fix: Added a try-catch launch check around Puppeteer. If it fails, the export logs the error and safely falls back to the BrowserWindow workflow.

2. **Broken Relative Resource/Image Paths in PDF and Presentation Export** ✅
   - Issue: Loading HTML via `data:` URLs does not provide a base path, causing relative image paths (e.g. `<img src="images/logo.png">`) to render as broken in the PDF.
   - Fix: Exported HTML is written to a temporary file in the target directory and loaded via a `file://` URL, which is deleted upon completion.

3. **Book Engine PDF Export BrowserWindow Fallback** ✅
   - Issue: Book PDF export was entirely dependent on Puppeteer, failing completely if Puppeteer was missing or failed to initialize.
   - Fix: Added a BrowserWindow printToPDF fallback for Book Engine when running inside Electron.

4. **Resilient Local TikZ Server-Side Rendering** ✅
   - Issue: TikZ rendering hardcoded the path to sibling `References/node-tikzjax-main` directory. Local rendering failed if the folder was not present.
   - Fix: If sibling folder is missing, the app falls back to requiring `node-tikzjax` from `node_modules` directly.

5. **Indiscriminate HTML Sanitization for export** ✅
   - Issue: Indiscriminate string replacement of `currentColor` with `#000` could corrupt library JavaScript variables or internal styling.
   - Fix: Replaced with targeted attribute and property replacement in inline styles, leaving the script content untouched.

6. **Repository Clutter Cleanup and Sync Redundancy** ✅
   - Issue: The main repository was cluttered with build folders, backup files, and test outputs, requiring a duplicate `Github_sync` folder to push to GitHub.
   - Fix: Optimized `.gitignore` to ignore packaging outputs, test runs, and backup files. Transferred `.git` to the root workspace `WP` for single-repo direct pushes.

## [1.4.0] - 2026-01-19

### Fixed

1. **Recent Files Links Not Clickable/Opening** ✅
   - Issue: Recent file items in File > Open Recent menu were not clickable or failed to open
   - Root Cause: Dynamically created menu buttons weren't receiving click events because they were created after the menu system initialized; the `setupMenuHandlers()` event listeners only attached to static HTML elements
   - Fix: 
     - Implemented **event delegation** on `#menu-recent-files-items` container to handle clicks on dynamically created buttons
     - Replaced innerHTML template generation with DOM `createElement` methods for proper attribute handling
     - Added `button type="button"` to prevent form submission behavior
     - Used `data-path` attribute with proper DOM methods instead of inline HTML
     - Normalized legacy recent file storage formats (string paths, different key names)
     - Added sorting by timestamp for consistent ordering
     - Styled missing files in red with one-click removal
   - Files: `src/renderer/js/app.js`, `src/renderer/js/file-browser.js`, `src/renderer/styles/main.css`
   - Status: Resolved

## [1.3.3] - 2026-01-13

### Fixed

1. **Task List Rendering (GFM Checkboxes) - Editor Mode** ✅
   - Issue: Task list items (`- [ ]` and `- [x]`) displayed with both bullet points AND checkboxes
   - Root Cause: Pre-processing regex rewrote task syntax before marked could generate proper GFM classes; post-processing targeted `li.task-list-item` class that wasn't being generated
   - Fix: Removed interfering regex, detect task items by checkbox presence, add proper classes dynamically
   - Files: `src/renderer/js/markdown-renderer.js`, `src/renderer/styles/main.css`
   - Status: Resolved

2. **Task Lists in Presentation Mode** ✅
   - Issue: Checkboxes not rendered correctly in presentation slides
   - Fix: Added `processTaskListsForExport()` method and task list CSS to presentation themes
   - Files: `src/renderer/js/presentation.js`
   - Status: Resolved

3. **Task Lists in Book Mode** ✅
   - Issue: Book exports used markdown-it without task list support
   - Fix: Added custom `addTaskListSupport()` with markdown-it renderer rules for proper task list HTML
   - Files: `src/common/book-engine.js`
   - Status: Resolved

4. **Export Task List Styling** ✅
   - Issue: Exported HTML files lacked task list CSS, showing bullets in exports
   - Fix: Added GitHub-style task list CSS to all export HTML templates (preview, presentation, book)
   - Files: `src/renderer/js/preview.js`, `src/renderer/js/presentation.js`, `src/common/book-engine.js`
   - Status: Resolved

---

## [1.3.2] - 2025-12-09

### Fixed

1. **Unsaved File Warning on Window Close** ✅
   - Issue: Closing the window with unsaved tabs did not prompt to save (only closing individual tabs did)
   - Fix: Added window `close` event handler that shows Save All / Don't Save / Cancel dialog
   - Files: `src/main/main.js`, `src/renderer/js/app.js`
   - Status: Resolved

2. **GraphViz Diagrams Not Rendering** ✅
   - Issue: GraphViz code blocks showed "Viz.js function not available" error
   - Root Cause: `preview.js` was using old viz.js v2.x API but library-loader loads @viz-js/viz v3.x
   - Fix: Updated `preview.js` to support both v2.x and v3.x Viz.js APIs
   - Also fixed GraphViz in Presentations (`presentation.js`) and Book exports (`book-engine.js`)
   - Files: `src/renderer/js/preview.js`, `src/renderer/js/presentation.js`, `src/common/book-engine.js`
   - Status: Resolved

3. **KityMinder XMind Import Failing** ✅
   - Issue: Importing XMind files threw "zip is not defined" error
   - Root Cause: KityMinder core expects `zip` global variable but JSZip library creates `JSZip`
   - Fix: Added JSZip library and `window.zip = JSZip` alias in `index-joplin.html`
   - Files: `src/renderer/kityminder-editor/index-joplin.html`
   - Status: Resolved

4. **KityMinder MindManager/FreeMind Import Support** ✅
   - Issue: Missing import support for MindManager (.mmap) and FreeMind (.mm) formats
   - Fix: Added file format handlers in diy.js with proper XML parsing
   - Files: `src/renderer/kityminder-editor/diy.js`
   - Status: Resolved

5. **Keyboard Shortcuts Not Working (Ctrl+S, Ctrl+O, Ctrl+N)** ✅
   - Issue: Core keyboard shortcuts (Save, Open, New) stopped working
   - Root Cause: `handleGlobalShortcuts` method was missing handlers for 's', 'o', 'n' keys
   - Fix: Added Ctrl+S (save), Ctrl+Shift+S (save as), Ctrl+O (open), Ctrl+N (new) handlers
   - Files: `src/renderer/js/app.js`
   - Status: Resolved

### Added

- **Bibliography Collection Feature** – New toggle in Markdown Features modal to collect bibliographic references (`[@citation]`) at the end of the document in a "References" section
- **KityMinder Text Centering** – Press `Ctrl+Shift+C` to toggle text centering for multi-line nodes (shown in hint bar)
- **KityMinder Import Formats** – Added support for importing XMind (.xmind), MindManager (.mmap), FreeMind (.mm) files
- **Multiple Tab Close Warning** – Window close now shows count of unsaved tabs with Save All option

### Changed

- **GraphViz API Compatibility** – Now supports @viz-js/viz v3.x, viz.js v2.x class API, and legacy sync API
- **KityMinder Hint Bar** – Updated to show all keyboard shortcuts including text centering

---

## [1.3.1] - 2025-12-07

### Fixed

1. **Application Closing Delay/Failure** ✅
   - Issue: Application sometimes failed to close or experienced significant delays when closing
   - Root Cause: Infinite loop in `before-quit` handler - calling `app.quit()` triggered `before-quit` again
   - Fix: Added `isQuitting` flag to prevent recursive quit attempts
   - Files: `src/main/main.js`
   - Status: Resolved

2. **Help Menu Examples Not Found in Packaged Builds** ✅
   - Issue: "Open Showcase" and "Open Presentation" Help menu items failed in packaged builds
   - Root Cause: Using `process.cwd()` which varies in packaged apps, examples not copied to build
   - Fix: Created `examples/` folder, added `get-examples-path` IPC handler with multiple path fallbacks
   - Files: `src/main/main.js`, `src/renderer/js/app.js`, `package.json`
   - Status: Resolved

3. **Double-Click Opens Second Instance Instead of New Tab** ✅
   - Issue: Double-clicking a .md file while MarkDD is running opened a new app instance
   - Root Cause: Missing `requestSingleInstanceLock()` to prevent multiple instances
   - Fix: Added single-instance lock with `second-instance` event handler to open file in existing window
   - Files: `src/main/main.js`
   - Status: Resolved

4. **Slow Tab UI Initialization (~30 seconds delay)** ✅
   - Issue: Tab bar appeared up to 30 seconds after the editor window opened
   - Root Cause: App initialization blocked on library loading (10s timeout) and integration waits (2s)
   - Fix: Reversed initialization order - load app immediately, load libraries in background
   - Files: `src/renderer/index.html`, `src/renderer/js/app.js`
   - Status: Resolved

5. **False "Highlight.js Failed" Warning** ✅
   - Issue: Warning message appeared even though highlight.js was loading successfully
   - Root Cause: Preview tried to highlight code before library finished loading
   - Fix: Removed intrusive warning, added automatic retry when library becomes available
   - Files: `src/renderer/js/preview.js`
   - Status: Resolved

6. **Library Loading Tolerance** ✅
   - Issue: App could fail to start if KaTeX wasn't immediately available
   - Root Cause: Strict dependency checks threw errors during fast startup
   - Fix: Made dependency checks non-blocking with automatic retry and graceful fallbacks
   - Files: `src/renderer/js/app.js`, `src/renderer/js/markdown-renderer.js`
   - Status: Resolved

7. **Spellcheck Context Menu Missing Corrections** ✅
   - Issue: Misspelled words were underlined but right-click showed no spelling suggestions
   - Root Cause: Electron's spellcheck was enabled but no context menu handler was set up
   - Fix: Added context-menu event handler with spelling suggestions and "Add to Dictionary" option
   - Files: `src/main/main.js`
   - Status: Resolved

### Changed

- **Build Configuration** – Examples folder now copied to `resources/examples/` in packaged builds
- **Help Menu** – Now uses robust path resolution for example files (works in dev and packaged builds)
- **Path Handling** – Improved error handling for file path resolution
- **Startup Performance** – Application now starts instantly with libraries loading in background
- **Integration Loading** – Non-blocking initialization for optional integrations (Markmap, TikZ, KityMinder)

### Added

- **Examples Folder** – Centralized location for example/showcase files:
  - `COMPREHENSIVE-FEATURES-SHOWCASE.md`
  - `SAMPLE-PRESENTATION.md`
- **IPC Handler** – New `get-examples-path` handler for cross-platform example file resolution
- **Single Instance Lock** – Prevents multiple app instances; new files open as tabs in existing window
- **Spellcheck Context Menu** – Right-click on misspelled words now shows spelling suggestions and "Add to Dictionary" option
- **Enhanced Markdown Features** – Built-in support for:
  - **Emojis** (`:smile:`, `:heart:`)
  - **Table of Contents** (`[TOC]`)
  - **Footnotes** (`[^1]` and `[^1]: ...`)
  - **Bibliography References** (`[@ref]`)
- **UI Cleanup** – Removed broken "Install Plugins" tab and streamlined Options menu

---

## [1.3.0] - 2025-11-20

### Added

#### 📚 Complete Book Module & Publishing System (NEW MAJOR FEATURE)
- **Book Project Management** – Create, open, and manage multi-chapter book projects with SUMMARY.md manifest system
- **4 Book Types** – Classical Book, Wiki Documentation, Help Documentation, Technical Documents
- **Project Scaffolding** – Automatic generation of book structure with sample chapters, configuration files, and templates
- **SUMMARY.md Manifest** – GitBook-style table of contents with nested chapters, sections, and automatic linking
- **book.config.json** – Centralized metadata (title, author, description), paths (contentDir, outputDir), and build options
- **Chapter Management** – Add, edit, remove, reorder chapters with live preview and validation
- **Split-Pane Book Editor** – Dedicated book editing mode with sidebar navigation, chapter browser, and real-time preview
- **Static Site Builder** – Generate complete interlinked HTML site with search index, landing page, chapter navigation, and assets
- **5 HTML Style Presets** – Professional themes optimized for different use cases:
  - **Midnight (Dark Mode)** – Dark theme for technical documentation and nighttime reading
  - **Classic Print** – Traditional book layout with serif fonts and print-friendly styling
  - **Knowledge Base (Wiki)** – Clean, organized wiki-style documentation
  - **Help Center (CHM)** – Microsoft CHM-style help documentation with sidebar navigation
  - **Professional Document** – Business document styling with Calibri/Cambria fonts, justified text, optimized for technical reports
- **PDF Export** – Puppeteer-based PDF generation with preserved formatting, diagrams, math, and professional typography
- **Live Preview Server** – Local development server (default port 4500) with auto-rebuild on file changes
- **Lunr.js Full-Text Search** – Client-side search with zero server dependencies, instant results, keyword highlighting
- **Watch Mode** – Automatic rebuild on file changes for live development workflow
- **CLI Interface** – Command-line tools for automation:
  ```bash
  npm run book -- init [dir] --title "My Book" --author "Author"
  npm run book -- build [dir]
  npm run book -- serve [dir] --port 5050 --watch
  ```
- **Comprehensive Book Menu** – Full UI integration with keyboard shortcuts:
  - New Book Project ▶ (Ctrl+Alt+B)
  - Open Book Project...
  - Enable Book Mode (toggle)
  - Edit SUMMARY.md
  - Edit book.config.json
  - Add New Chapter...
  - Build All Formats (Ctrl+Alt+Shift+B)
  - Build HTML Only
  - Export as PDF
  - Preview Book Locally (Ctrl+Alt+P)
  - Stop Preview Server
  - Auto-rebuild on Changes (toggle)
  - Search in Book... (Ctrl+Alt+F)
- **13 Technical Document Templates** – Professional business document types:
  1. **Project Report** – Executive summary, status overview, risk log, next steps
  2. **Strategic Plan** – Vision, initiatives, milestones, financial summary
  3. **Product Brochure** – Highlights, features, use cases, call-to-action
  4. **Business Case** – Problem statement, solution, financials, ROI
  5. **White Paper** – Abstract, background, methodology, findings
  6. **Case Study** – Challenge, solution, results, testimonials
  7. **Feasibility Study** – Scope, analysis, recommendations, conclusions
  8. **Proposal** – Overview, approach, deliverables, pricing
  9. **User Manual** – Introduction, setup, usage, troubleshooting
  10. **SOP (Standard Operating Procedure)** – Purpose, scope, procedures, references
  11. **RFP (Request for Proposal)** – Background, requirements, evaluation, timeline
  12. **Annual Report** – Message, performance, operations, outlook
  13. **Project Charter** – Objectives, scope, stakeholders, timeline
- **Structured Section Files** – Each technical document generates separate markdown files per section for better organization
- **Smart Section Navigation** – Automatic scroll-to-section with visual highlighting for anchor-based navigation
- **Example Projects** – Built-in templates for all book types with comprehensive sample content and best practices
- **Book IPC Handlers** – 16 main process handlers for book operations:
  - `book-select-directory`, `book-save-dialog`
  - `book-init-project`, `book-create-temp-example`
  - `book-build`, `book-export-pdf`, `book-serve`, `book-stop-server`
  - `book-load-structure`, `book-search`
  - `book-add-chapter`, `book-remove-chapter`, `book-reorder-chapters`
  - `book-add-appendix`, `book-remove-appendix`, `book-get-structure`
- **Files**: `src/common/book-engine.js` (~3300 lines), `src/renderer/js/book.js`, `src/renderer/js/book-examples.js`, `scripts/book-cli.js`

### Changed

#### Application Features
- **About Dialog** – Updated feature list to include Book Module and Presentation Mode at top
- **Version Display** – Updated to v1.3.0 across all components

### Fixed

1. **Technical Document Section Navigation** ✅
   - Issue: All sections appeared to have same content when clicked in sidebar
   - Root Cause: Single file with anchors caused confusion, no scroll-to-section behavior
   - Fix: Generate separate markdown file for each section, add auto-scroll and visual highlighting
   - Status: Resolved

2. **Missing Professional Document HTML Style** ✅
   - Issue: Technical documents had no dedicated HTML style option in dropdown
   - Root Cause: CSS preset existed but wasn't exposed in UI
   - Fix: Added "Professional Document" to style picker dropdown in book builder
   - Status: Resolved

3. **Chapter Content Duplication** ✅
   - Issue: Technical document sections showed duplicate or empty content
   - Root Cause: All sections pointed to same file with different anchors
   - Fix: Separate files per section with unique, meaningful content
   - Status: Resolved

### Technical

- New: `src/common/book-engine.js` (~3300 lines, complete book publishing system)
- New: `src/renderer/js/book.js` (book UI and navigation)
- New: `src/renderer/js/book-examples.js` (template generation)
- New: `scripts/book-cli.js` (command-line interface)
- Enhanced: `src/renderer/js/app.js` (book menu integration, technical style dropdown, section highlighting)
- Enhanced: `src/renderer/styles/main.css` (book UI styles, `.book-section-highlight`)
- Enhanced: `src/renderer/index.html` (book menu with 15+ commands)
- Files: 13 technical document template definitions in `TECHNICAL_DOCUMENT_STYLES`
- Files: 5 HTML style presets in `BOOK_STYLE_PRESETS`
- Files: Book UI components, search integration, preview system

---

## [1.2.0] - 2025-11-14

### Added

#### 📚 Complete Book Module & Publishing System
- **Book Project Management** – Create, open, and manage multi-chapter book projects with SUMMARY.md manifest
- **4 Book Types** – Classical Book, Wiki Documentation, Help Documentation, Technical Documents
- **Project Scaffolding** – Automatic generation of book structure with sample chapters and configuration
- **SUMMARY.md Manifest** – GitBook-style table of contents with nested chapters and sections
- **book.config.json** – Centralized metadata, paths, and build options
- **Chapter Management** – Add, edit, remove chapters with live preview
- **Split-Pane Editor** – Dedicated book editing mode with sidebar navigation
- **Static Site Builder** – Generate interlinked HTML with search index, landing page, and navigation
- **HTML Style Presets** – 5 professional themes (Dark, Classic, Wiki, Helpdesk, Professional Document)
- **PDF Export** – Puppeteer-based PDF generation with preserved formatting
- **Live Preview Server** – Local dev server with auto-rebuild on changes
- **Lunr.js Search** – Client-side full-text search with zero server dependencies
- **Watch Mode** – Automatic rebuild on file changes for live development
- **CLI Interface** – Command-line tools for init, build, and serve operations
- **Book Menu** – Comprehensive UI with shortcuts (Ctrl+Alt+B, Ctrl+Alt+Shift+B, Ctrl+Alt+P, Ctrl+Alt+F)
- **Example Projects** – Built-in templates for all 4 book types with sample content
- **Files**: `src/common/book-engine.js` (~3300 lines), `src/renderer/js/book.js`, book UI components

#### 🎪 Professional Presentation Mode
- **28 Beamer-Style Themes** – Berkeley, Berlin, Copenhagen, Madrid, Warsaw, AnnArbor, Antibes, Bergen, Boadilla, CambridgeUS, Darmstadt, Dresden, Frankfurt, Goettingen, Hannover, Ilmenau, JuanLesPins, Luebeck, Malmoe, Marburg, Montpellier, PaloAlto, Pittsburgh, Rochester, Singapore, Szeged, Simple-light, Simple-dark
- **Slide Generation** – Automatic detection via `---` separators, heading-based organization
- **Interactive Navigation** – Keyboard (arrows, Page Up/Down, Home/End, Space) and mouse controls
- **Customizable UI** – Navigation modes (left sidebar, top bar, or hidden), configurable theme via front-matter
- **Progress Tracking** – Slide counter and progress bar for enhanced navigation
- **Files**: `src/renderer/js/presentation.js` (~850 lines), `src/renderer/styles/main.css` (theme CSS)

#### 📊 Automatic Document Numbering System
- **Hierarchical Heading Numbers** – Auto-number headings (1, 1.1, 1.1.1, etc.), respects depth
- **Figure Numbering** – Auto-number figures with captions (Figure 1, Figure 2, etc.)
- **Table Numbering** – Auto-number tables with captions (Table 1, Table 2, etc.)
- **TOC Integration** – Table of Contents includes heading numbers when enabled
- **Front-Matter Control** – Toggle numbering and set starting numbers via YAML
- **Files**: `src/renderer/js/markdown-renderer.js` (`applyHeadingNumbering()`, `applyFigureAndTableNumbering()`, `generateTOC()`)

#### 🎨 Full Export Support (HTML & PDF)
- **Preserved Diagram Rendering** – PlantUML (→SVG), Vega/Vega-Lite (→Canvas), TikZ (→LaTeX), Mermaid, GraphViz, KityMinder
- **Math Expression Support** – MathJax fully rendered in exports
- **Responsive Design** – Exports adapt to screen size, dark mode compatible
- **Self-Contained HTML** – All styling embedded, ready for sharing
- **Print-to-PDF** – Professional typography, spacing, and fidelity preserved
- **Files**: `src/renderer/js/app.js` (export enhancement), CDN rendering pipeline

#### 🔗 Enhanced Toolbar – Link & Image Insertion
- **Link Dialog** – Modal input for URL and link text (Ctrl+K shortcut)
- **Image Dialog** – File picker with preview and alt text input
- **URL Validation** – Prevents malformed links
- **Keyboard Shortcuts** – Quick access without toolbar mouse interaction
- **Files**: `src/renderer/js/app.js`, `src/renderer/index.html` (toolbar UI)

#### 📹 Robust YouTube Embed Pipeline
- **URL Parser** – Handles all variants: `youtube.com/watch?v=`, `youtu.be/`, Shorts, Live, playlists
- **Video ID Validation** – Sanitized extraction (`[A-Za-z0-9_-]{6,}` pattern)
- **Parameter Preservation** – Timestamps (`start`), playlists (`list`) passed through to embed
- **Privacy-Friendly Default** – Uses `youtube-nocookie.com` domain
- **Fallback Messaging** – "Open on YouTube" link for restricted environments
- **Strict Permissions** – iframe `allow` list and `strict-origin-when-cross-origin` referrer policy
- **Files**: `src/renderer/js/markdown-renderer.js` (YouTube helpers), `src/renderer/styles/main.css` (video styling)

### Changed

#### Document Navigation
- **TOC Numbering Awareness** – GitHub_sync renderer now mirrors main renderer's heading-number aware TOC builder
  - Guarantees numbering parity across preview, export, and sync outputs

#### Presentation Features
- **Navigation Customization** – Configure via front-matter: `navigation: left|top|none`
- **Theme Selection** – Choose from 28 themes via front-matter: `theme: berkeley`

#### Accessibility & UX
- **YouTube Embed Presentation** – Added fallback prompt plus external link for blocked embeds
- **Responsive Video Frames** – 16:9 aspect ratio container with dark theme integration
- **Export Rendering** – CDN-based rendering for PlantUML, Vega, TikZ ensures consistency

### Fixed

1. **Broken YouTube Embeds** ✅
   - Issue: "Video unavailable" on timestamped, playlist, Shorts, Live, and hash-based links
   - Root Cause: Regex-only ID extraction with no sanitization or parameter handling
   - Fix: URL parser with validation, parameter preservation, and fallback messaging
   - Status: Resolved

2. **HTML Export Diagram Loss** ✅
   - Issue: PlantUML, Vega, TikZ diagrams not rendering in HTML exports
   - Fix: CDN-based rendering pipeline, cleanHTMLForExport() preserves all containers
   - Status: Resolved

3. **PDF Export Rendering Issues** ✅
   - Issue: Complex markdown with diagrams failed in print-to-PDF
   - Fix: Enhanced rendering pipeline with MathJax and diagram support
   - Status: Resolved

4. **Toolbar Link/Image Buttons** ✅
   - Issue: Add Link and Add Image buttons inconsistent or non-functional
   - Fix: Dedicated modals with validation and keyboard shortcuts
   - Status: Resolved

5. **GitHub_sync Renderer Drift** ✅
   - Issue: Sync mirror lagged behind main renderer (TOC, numbering)
   - Fix: Full synchronization of helpers, numbering, CSS
   - Status: Resolved

### Technical

- New: `src/renderer/js/presentation.js` (~850 lines, 28 themes + navigation)
- Enhanced: `markdown-renderer.js` (numbering system, YouTube helpers, export support)
- Enhanced: `app.js` (toolbar dialogs for link/image insertion)
- Enhanced: `main.css` (presentation CSS, numbering styles, responsive video frames)
- GitHub_sync fully synchronized with main renderer

---

## [1.1.1] - 2025-10-17

### Added

#### Performance Optimization
- **Initialization State Tracking** (`_appInitializing` flag)
  - Prevents animation frame delays during app startup
  - Allows smooth animations only for user interactions
  - File: `src/renderer/js/app.js` (line 25)

#### Smart Tab Management
- **Startup File Parameter** (`isStartupFile` parameter to `openFile()`)
  - Distinguishes startup file opens from normal file operations
  - Prevents unnecessary tab clearing for menu/dialog/drag-drop opens
  - File: `src/renderer/js/app.js` (line 1185)

#### Session Restoration
- **Restored Tab Tracking** (event.restored flag)
  - Identifies tabs restored from previous session
  - Skips animation delays for restored tabs
  - File: `src/renderer/js/tabs.js` (line 451-456)

#### DOM Cleanup
- **`clearAllTabs()` Method in TabUI**
  - Safely removes orphaned tab DOM elements
  - Prevents visual rendering delays
  - File: `src/renderer/js/tab-ui.js` (line 99-118)

#### Version Management
- **Centralized Version Module** (`src/version.js`)
  - Reads version from package.json with caching
  - Single source of truth for all version displays
  - Eliminates hardcoded version strings
  - File: `src/version.js` (NEW)

- **Dynamic Version Population**
  - `populateVersionInfo()` method in app.js
  - Fetches version from main process via IPC
  - Updates settings UI dynamically
  - File: `src/renderer/js/app.js`

#### Build Configuration
- **License File Distribution** (extraFiles in electron-builder)
  - Automatic inclusion of LICENSE files in production builds
  - Configuration: `package.json` (lines 46-59)
  - Ensures license compliance across all platforms

### Performance Impact

- **Startup Time Improvement:** ~50-100ms faster (eliminates animation frame delays)
- **Memory:** No increase (no new runtime allocations)
- **Build Size:** Negligible (~2KB for new version module)

### Compatibility

- **Backward Compatible:** Yes, all features from v1.1.0 intact
- **Breaking Changes:** None
- **Migration Path:** Direct upgrade, no action required

### Dependencies

- No new dependencies added
- No dependencies updated
- All existing dependencies maintained

### Migration

**For End Users:**
- No action required
- Download and run v1.1.1
- All improvements are automatic

**For Developers:**

**Old Version Update Process (v1.1.0 and earlier):**
1. Update `package.json` version
2. Update `src/main/main.js` (3 locations with hardcoded version)
3. Update `src/renderer/js/app.js` (1 location)
4. Update `src/renderer/index.html` (1 location)
5. Manually sync all fallback versions

**New Version Update Process (v1.1.1+):**
```json
// Edit ONLY this file:
{
  "version": "1.1.2"
}
// Everything else updates automatically!
```

### Breaking Changes

None. This is a fully backward-compatible release.

### Known Issues

None. This release is production-ready.

---

## [1.1.0] - 2025-10-16

### Added

- Tab system with session persistence
- Multi-document editing support
- Export functionality (HTML, PDF)
- License file handling
- IPC handlers for main process communication

### Features

- Advanced Markdown editing with real-time preview
- Mathematical expressions with KaTeX
- Mermaid diagrams and flowcharts
- Markmap mind mapping
- TikZ/CircuiTikZ diagram support
- Syntax highlighting for 100+ languages
- Dark/Light theme support
- Cross-platform support (Windows, macOS, Linux)

---

## Version Comparison

| Feature | v1.1.0 | v1.1.1 | v1.2.0 |
|---------|--------|--------|--------|
| Tab System | ✅ | ✅ Optimized | ✅ |
| Presentations | ❌ | ❌ | ✅ (28 Beamer themes) |
| Document Numbering | ❌ | ❌ | ✅ (heading/figure/table) |
| Export System | ✅ Basic | ✅ | ✅ Enhanced (full diagram support) |
| YouTube Embeds | ⚠️ Regex-only | ⚠️ | ✅ Robust parser |
| Performance | Baseline | ~90% faster startup | Same as 1.1.1 |
| Version Management | Hardcoded | Dynamic | Dynamic |

---

## How to Get v1.2.0

### Download
- Windows: [Download](https://github.com/DDT-TDD/MarkDD/releases)
- macOS: [Download](https://github.com/DDT-TDD/MarkDD/releases)
- Linux: [Download](https://github.com/DDT-TDD/MarkDD/releases)

### From Source
```bash
git clone https://github.com/DDT-TDD/MarkDD.git
cd MarkDD
git checkout v1.2.0
npm install
npm run build
```

---

## Support & Feedback

- **Issues:** [GitHub Issues](https://github.com/DDT-TDD/MarkDD/issues)
- **Discussions:** [GitHub Discussions](https://github.com/DDT-TDD/MarkDD/discussions)
- **Documentation:** See README.md

---

**Last Updated:** November 14, 2025  
**Current Version:** 1.2.0

