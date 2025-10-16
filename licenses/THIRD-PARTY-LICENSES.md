Third-party dependency licenses for MarkDD Editor

This document lists the direct dependencies and devDependencies declared in package.json and their license fields as reported by npm (as of this commit). This is for informational purposes; include the dependency packages and their own license files when shipping distributions if required by those licenses.

Project license: MIT (see LICENSE)

Direct dependencies and licenses:

- @aduh95/viz.js: MIT
- @cartamd/plugin-tikz: MIT
- abcjs: MIT
- chokidar: MIT
- codemirror: MIT
- d3: ISC
- dompurify: (MPL-2.0 OR Apache-2.0)
- electron-store: MIT
- electron-window-state: MIT
- fs-extra: MIT
- latex.js: MIT
- markdown-it: MIT
- markdown-it-anchor: Unlicense
- markdown-it-texmath: MIT
- markdown-it-toc-done-right: MIT
- markmap-lib: MIT
- markmap-view: MIT
- mathjax: Apache-2.0
- mathjax-full: Apache-2.0
- mermaid: MIT
- node-tikzjax: GitHub dependency (prinsss/node-tikzjax) — license not available via npm; consult the repository (see NOTES)
- plantuml-encoder: MIT
- puppeteer: MIT
- vega: Apache-2.0
- vega-embed: BSD-3-Clause
- vega-lite: BSD-3-Clause
- viz.js: BSD-3-Clause

Dev dependencies and licenses:

- electron: MIT
- electron-builder: MIT
- highlight.js: BSD-3-Clause
- jsdom: MIT
- katex: MIT
- marked: MIT

NOTES:
- node-tikzjax is referenced in package.json using a GitHub shortcut ("github:prinsss/node-tikzjax"). The npm registry may not provide a license field for such references. Before publishing a binary that includes or redistributes this package, inspect the upstream repository at https://github.com/prinsss/node-tikzjax and include its license file in your release if required by its license.
- Some packages (for example, packages licensed under MPL or dual-licensed) may impose additional attribution or source requirements; follow each license's obligations when redistributing.

Recommended actions for release:

1. Include this THIRD-PARTY-LICENSES.md in the repository root and include copies of any third-party LICENSE files in the distributed bundle (or a consolidated LICENSES file) when packaging the application for distribution.
2. For GitHub-only dependencies, vendor the license text (copy the LICENSE from the upstream repo) into `third_party/<package>/LICENSE` in the release bundle, or note the upstream URL and license in release notes if redistribution is not performed.
