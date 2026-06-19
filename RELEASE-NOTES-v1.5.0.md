# MarkDD Editor v1.5.0 Release Notes

We are thrilled to announce the release of **MarkDD Editor v1.5.0**! This version introduces the highly anticipated **CV Mode**, giving you the power to create professional, print-perfect CVs and resumes directly from simple Markdown with no LaTeX required.

---

## Major New Feature: CV Mode 📄

You can now compose resumes in Markdown and compile them using 10 embedded premium themes inspired by Overleaf's popular templates. 

### Key Capabilities:
*   **10 Premium Themes**: Toggle between templates instantly:
    1.  `classic-latex` (Classic academic serif style with solid section dividers)
    2.  `academic` (Modern, clean, sans-serif design with colored headings)
    3.  `modern-sidebar` (Double-column layout with dark sidebar and Tag Badges for skills)
    4.  `minimalist` (Grid-based layout placing dates in a dedicated left column)
    5.  `decent` (Rounded colored background bars for section titles)
    6.  `awesome-cv` (Roboto typography, bold/regular name contrast, crimson accents)
    7.  `friggeri` (Clean sans-serif layout with multi-colored titles and left dates)
    8.  `moderncv-classic` (Vertical timeline border running down the left margin)
    9.  `moderncv-casual` (Centered headers and casual rounded skill badges)
    10. `executive` (Elegant Garamond serif styling for formal corporate CVs)
*   **Margin Alignment (Pipes `|`)**: Align details easily:
    `### Senior Engineer | Google | Mountain View, CA | 2021 – Present`
    This renders the job title on the left and the date on the right.
*   **Page Breaks & Spacers**: Insert `<!-- newpage -->` / `\newpage` to force page breaks and `<!-- vspace: 12px -->` / `\vspace{12px}` for fine-grained vertical spacing.
*   **Automatic Skills Cloud**: Lists under any section heading containing the word "Skill" automatically render as modern pill badges.
*   **Optional Profile Photos**: Include a `photo` key in your front-matter to render circular profile pictures with automatic relative path resolution (supports `modern-sidebar`, `moderncv-classic`, `moderncv-casual`, `awesome-cv`, and `academic` themes).
*   **7 Predefined Color Presets**: Apply color variations instantly:
    *   Classic Navy, Slate Slate, Forest Green, Burgundy Academic, Charcoal Minimal, Teal Professional, and Dark Slate.
*   **Dedicated PDF Exporter**: Portrait printing utilizing temporary local file resolution to ensure images, fonts, and math render with 100% accuracy.

---

## Bug Fixes & Optimizations 🛠️

*   **Friggeri Layout Bug**: Fixed an issue where text summary sections written before the first `##` header were discarded.
*   **Sidebar Skills Extractor**: Enhanced the extraction logic in the sidebar theme to greedily pull all sub-content under the skills header.
*   **Version single source of truth**: Consistently loads application version dynamically from `package.json`.
