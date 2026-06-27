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
