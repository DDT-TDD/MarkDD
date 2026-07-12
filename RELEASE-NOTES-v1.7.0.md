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

