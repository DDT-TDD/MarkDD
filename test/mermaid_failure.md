# Markdown callout and Mermaid rendering investigation

## Request and scope

Investigate the reported Markdown rendering differences in the Electron editor and presentation views, specifically:

- The final words of the supplied `:::warning Common Industry Pain Points` block appear outside the visible frame.
- A Mermaid diagram appears much smaller or missing in a presentation, although it renders correctly in normal preview.
- Produce an implementation plan for a separate AI; do not modify repository files.

Cover the editor preview, presentation preview, standalone presentation HTML, and presentation PDF. Audit PowerPoint export as a separate path because it does not use the same diagram-rendering pipeline. Keep this plan limited to the reported presentation/layout defect; do not redesign Markdown syntax or unrelated export behavior.

## Findings and likely causes

1. **The editor and presentation use different Mermaid paths.**
   - The editor renderer emits `.mermaid-container` placeholders and `Preview.processMermaidDiagrams()` delegates rendering to `MarkdownRenderer.processMermaidDiagrams()`. The editor inserts Mermaid SVG inside `.diagram-content`.
   - `PresentationManager.generateSlideHTML()` parses slide Markdown and calls `cleanHTMLForExport()`, which replaces `.mermaid-container` placeholders with plain `.mermaid` source blocks. The generated presentation then loads Mermaid separately and runs it against those blocks.
   - The normal preview has a concrete responsive rule for `.diagram-content svg` (`max-width: 100%; height: auto`). The presentation CSS centers `.slide .mermaid svg`, but does not provide equivalent responsive sizing. Presentation slides also use a flex column, `justify-content: center`, fixed viewport dimensions, and their own overflow/print rules. These differences plausibly explain inconsistent size and clipping.

2. **Presentation completion does not currently wait for Mermaid.**
   - In the generated presentation's `initializeRendering()`, Mermaid's `run()`/`init()` is called without awaiting or adding its returned promise to `renderingPromises`.
   - The presentation marks `presentation-render-complete` after the tracked promises complete. PDF export waits for that event, and print scaling measures `slide.scrollHeight`. Both can therefore proceed before Mermaid has added its SVG and final layout height. This is a strong candidate for absent/tiny diagrams and for print-layout overflow, but should be verified in a browser reproduction.

3. **The callout syntax is recognized, but its presentation layout is not specifically protected.**
   - The Marked `container` extension recognizes `:::warning ... :::` and emits a `.custom-container` with an inline title row and a `.custom-container-content` div. Presentation generation uses the same global Marked instance when available.
   - The callout content is parsed inline, rather than into a paragraph. The presentation's general `.slide p` typography therefore does not control that content. Neither the generated presentation CSS nor the app stylesheet provides a dedicated wrapping/width rule for `.custom-container-content`.
   - The syntax itself is therefore less likely to be the root cause than slide sizing/alignment/overflow. The exact supplied block was not found in the repository, and no source presentation or screenshot was supplied, so the precise clipping direction and affected output cannot yet be confirmed.

4. **There are multiple output paths to keep distinct.**
   - Presentation preview, standalone HTML, and PDF all use `PresentationManager.generateHTML()`. PDF adds `print-layout pdf-export` and a fixed landscape page size/overflow policy.
   - PPTX export uses `PPTXExporter`'s own HTML parsing and Mermaid-code extraction; it is not the SVG rendering path used by the preview or PDF. Verify whether the reported defect reproduces there before changing that implementation. Do not introduce any new transmission of document or diagram content to an external service.

5. **Current evidence and validation baseline.**
   - The Electron build's main entry is `src/main/main.js`, and its packaged file list includes `src`; treat `src/` as the implementation source. The corresponding selected `resources/src/` renderer copies currently hash-identically, but package configuration does not include that tree as the application source. Only synchronize it if the actual resource-preparation/release workflow requires it.
   - `node test/test_presentation.js` passes. It currently checks highlighting, skills-list markup, and theme CSS, but not admonition layout, Mermaid rendering, render completion, or slide overflow. The package has `jsdom` and Puppeteer dependencies; there is no `test` script in the package scripts.
   - The worktree already has an unrelated modification to `RELEASE-NOTES-v2.4.2.md`; leave it untouched.

## Recommended implementation plan for the next AI

1. **Create a focused reproducer before changing layout.**
   - Add the exact supplied warning text and a small representative Mermaid diagram to a presentation fixture, on the same slide and with realistic surrounding content.
   - Render the same source through normal editor preview and through `PresentationManager.generateHTML()`.
   - Capture the browser viewport and inspect the callout's last text range, the slide bounds/scroll dimensions, the Mermaid SVG's rendered bounds/viewBox, and whether those bounds intersect the visible slide. Record Mermaid's loaded version and the active CSS rules in each mode.
   - Include at least the 1120×780 Electron presentation window size and one narrower viewport. This distinguishes horizontal clipping, vertical overflow, flex-centering behavior, and SVG scaling rather than assuming which occurred.

2. **Make Mermaid initialization and completion deterministic.**
   - Keep `startOnLoad: false`, but align presentation Mermaid initialization/configuration with the normal renderer's supported version and relevant sizing options. Avoid a silent difference between the app's loaded Mermaid and the generated presentation's CDN-loaded Mermaid; preserve the intended offline behavior where feasible.
   - Await the Promise returned by `mermaid.run()` (or the supported version's equivalent) and include it in presentation render completion. Ensure `presentation-render-complete` is not dispatched until Mermaid SVG generation and the resulting layout have settled.
   - Preserve visible error reporting for diagram failures and ensure one failed diagram does not leave PDF export waiting indefinitely.

3. **Make slide diagrams responsive without shrinking them unnecessarily.**
   - Give presentation Mermaid SVGs responsive width/height constraints equivalent to the normal preview (`max-width: 100%`, automatic height, and an appropriate contained layout); constrain by slide space only when necessary and preserve SVG aspect ratio.
   - Apply the sizing to the presentation's actual `.mermaid` output and check interactions with flex children, slide padding, and theme CSS. Do not force a fixed tiny width/height or hide overflow as a workaround.

4. **Prevent callout text and overfull slides from being clipped.**
   - Ensure `.custom-container` and `.custom-container-content` can shrink within the slide and wrap long text; preserve the inline markup, visual styling, and normal-preview behavior.
   - Make slide alignment safe when content exceeds the viewport (for example, avoid centering that makes overflow inaccessible). Preserve existing centered composition for slides that fit.
   - In print/PDF mode, run slide-fit measurement only after diagram rendering has completed. Re-check the fit logic for both height and width and ensure a full callout sentence remains visible; do not let an overflow-hidden print rule cut it off.

5. **Verify each actual output path and add regression coverage.**
   - Add an automated browser-level regression using the existing Puppeteer dependency (or an existing equivalent harness), since `jsdom` cannot prove visual geometry. Assert that the complete callout text is within the visible slide and Mermaid has a non-zero, suitably sized SVG contained by the slide after the render-complete signal.
   - Exercise normal preview, presentation preview, standalone HTML, and PDF/print layout. Include a fit-content slide and an overfull slide, and verify render completion waits for Mermaid. Keep checks based on measured containment/visibility, not a fragile hard-coded pixel size.
   - Audit PPTX separately through `PPTXExporter` and preserve its existing privacy behavior. Add a PPTX regression only if the same symptom is reproducible in that path.
   - Run `node test/test_presentation.js` plus the new focused regression and the repository's applicable lint/build checks. Do not run or change unrelated release notes.

## Expected outcome

The same Markdown source renders fully in normal preview and every in-scope presentation output: the warning content is readable and within the slide/page, Mermaid is visibly sized to the available slide area, and export completion cannot race diagram generation. No Markdown syntax change or unrelated behavior change is intended.