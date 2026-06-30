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
