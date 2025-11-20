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

Recommended release steps:

1. Include this `THIRD-PARTY-LICENSES.md` and the upstream LICENSE text for every redistributed dependency in release artifacts (the `licenses/` output generated via `npm run generate-licenses` already aggregates them).
2. Keep this file in sync whenever `package.json` changes so downstream users have clear attribution records.
