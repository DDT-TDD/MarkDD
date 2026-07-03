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
