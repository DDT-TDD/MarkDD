Third-party dependency licenses for MarkDD Editor

This document lists the direct dependencies and devDependencies declared in `package.json` and the license strings they report via npm at the time of writing. Always consult each upstream project for the authoritative license text.

Project license: MIT (see `LICENSE`).

Direct dependencies (runtime) and reported licenses:

- @aduh95/viz.js — MIT
- @cartamd/plugin-tikz — MIT
- abcjs — MIT
- chokidar — MIT
- codemirror — MIT
- d3 — ISC
- dompurify — MPL-2.0 OR Apache-2.0
- electron-store — MIT
- electron-window-state — MIT
- fs-extra — MIT
- highlight.js — BSD-3-Clause
- js-yaml — MIT
- jszip — MIT OR GPL-3.0-or-later
- latex.js — MIT
- lunr — MIT
- markdown-it — MIT
- markdown-it-anchor — Unlicense
- markdown-it-attrs — MIT
- markdown-it-texmath — MIT
- markdown-it-toc-done-right — MIT
- markmap-lib — MIT
- markmap-view — MIT
- mathjax — Apache-2.0
- mathjax-full — Apache-2.0
- mermaid — MIT
- node-tikzjax — LPPL-1.3c
- plantuml-encoder — MIT
- pptxgenjs — MIT
- puppeteer — Apache-2.0
- vega — BSD-3-Clause
- vega-embed — BSD-3-Clause
- vega-lite — BSD-3-Clause
- viz.js — BSD-3-Clause

Dev dependencies (build/test tooling) and reported licenses:

- archiver — MIT
- electron — MIT
- electron-builder — MIT
- jsdom — MIT
- katex — MIT
- marked — MIT

NOTES:

- `node-tikzjax` is consumed from GitHub (prinsss/node-tikzjax) and declares the LPPL-1.3c license. Ensure the upstream LICENSE file ships with any binary distribution.
- Dependencies with dual licenses (for example, `dompurify` and `jszip`) may impose additional obligations when redistributed; follow the terms that apply to your usage scenario.

CV TEMPLATE INSPIRATIONS & ATTRIBUTION:

The CV Mode templates are inspired by popular LaTeX and Overleaf designs. In accordance with their respective open-source licensing, the source attributions are as follows:

1. Twenty Seconds Curriculum Vitae (MIT License)
   - Original design by Carmine Spagnuolo
   - Source: https://github.com/spagnuolocarmine/TwentySecondsCurriculumVitae-LaTex

2. Forty Seconds CV (BSD 3-Clause License)
   - Original design by René Wirnata
   - Source: https://github.com/PandaScience/FortySecondsCV

3. Simple Hipster CV (CC BY 4.0 / MIT License)
   - Original design by latex-ninja
   - Source: https://github.com/latex-ninja/simple-hipstercv

4. Sixty Seconds CV (BSD 3-Clause License)
   - Original design by LaGuer (based on Forty Seconds CV)
   - Source: https://github.com/LaGuer/SixtySecondsCV

5. Entry Level Resume Template (LaTeX) (MIT License / CC BY 4.0)
   - Community-sourced layout on Overleaf

6. Awesome CV (LPPL v1.3c License)
   - Original design by Byungjin Park (posquit0)
   - Source: https://github.com/posquit0/Awesome-CV

7. Friggeri CV (MIT License / CC BY 4.0)
   - Original design by Adrien Friggeri
   - Source: https://github.com/afriggeri/CV

8. ModernCV Classic & Casual (LPPL v1.3c License)
   - Original design by Xavier Danaux
   - Source: https://github.com/moderncv/moderncv

Integrated Third-Party Assets:
- FontAwesome Free 6.4.0 (Icons): SIL OFL 1.1 (fonts) / MIT License (code). Loaded dynamically in HTML previews/exports via cdnjs.

Recommended release steps:

1. Include this `THIRD-PARTY-LICENSES.md` and the upstream LICENSE text for every redistributed dependency in release artifacts (the `licenses/` output generated via `npm run generate-licenses` already aggregates them).
2. Keep this file in sync whenever `package.json` changes so downstream users have clear attribution records.
