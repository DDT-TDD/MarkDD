/**
 * Comprehensive Verification Suite for:
 * 1. Central Split-Panel Resizer (#splitter) multi-drag durability & non-zero width
 * 2. Physical Top-of-Panel Alignment (#editor-container vs #preview-container & first-child margin)
 * 3. Deterministic Markdown Block Line Mapping (rebuildLineElementMap) on COMPREHENSIVE-FEATURES-SHOWCASE.md
 * 4. Piecewise-Linear Bidirectional Scroll Synchronization (Editor <-> Preview)
 * 5. Live WYSIWYG Editing Mode in Preview (DOM edits syncing back to exact Markdown source lines)
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runAuditTests() {
    console.log('=== Starting Splitter, Alignment & WYSIWYG Verification Suite ===\n');

    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../src/renderer/index.html'), 'utf8');
    const mainCss = fs.readFileSync(path.resolve(__dirname, '../src/renderer/styles/main.css'), 'utf8');

    const dom = new JSDOM(indexHtml, {
        url: 'http://localhost',
        runScripts: 'outside-only'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.NodeFilter = dom.window.NodeFilter;
    global.HTMLElement = dom.window.HTMLElement;
    global.DOMParser = dom.window.DOMParser;
    global.localStorage = dom.window.localStorage;
    global.sessionStorage = dom.window.sessionStorage;

    // Inject main.css into JSDOM head so getComputedStyle works
    const styleEl = document.createElement('style');
    styleEl.textContent = mainCss;
    document.head.appendChild(styleEl);

    // Load Marked, DOMPurify, KaTeX, mhchem
    const { marked } = require('marked');
    global.marked = marked;
    window.marked = marked;
    const createDOMPurify = require('dompurify');
    global.DOMPurify = createDOMPurify(dom.window);
    window.DOMPurify = global.DOMPurify;

    dom.window.eval(fs.readFileSync(path.resolve(__dirname, '../src/renderer/vendor/katex.min.js'), 'utf8'));
    global.katex = dom.window.katex;
    dom.window.eval(fs.readFileSync(path.resolve(__dirname, '../src/renderer/vendor/mhchem.min.js'), 'utf8'));

    // Load MarkdownRenderer and Preview
    dom.window.eval(fs.readFileSync(path.resolve(__dirname, '../src/renderer/js/markdown-renderer.js'), 'utf8'));
    dom.window.eval(fs.readFileSync(path.resolve(__dirname, '../src/renderer/js/preview.js'), 'utf8'));

    let failures = 0;
    function assert(condition, msg) {
        if (!condition) {
            console.error(`❌ FAIL: ${msg}`);
            failures++;
        } else {
            console.log(`✅ PASS: ${msg}`);
        }
    }

    // -------------------------------------------------------------------------
    // TEST 1: CSS & Header Physical Alignment Parity
    // -------------------------------------------------------------------------
    const splitterEl = document.getElementById('splitter');
    const splitterStyle = window.getComputedStyle(splitterEl);
    assert(splitterStyle.flexShrink === '0', `Test 1.1: .splitter has flex-shrink: 0 (got "${splitterStyle.flexShrink}")`);
    assert(/6px/.test(splitterStyle.width) || /6px/.test(splitterStyle.minWidth), `Test 1.2: .splitter has explicit 6px width/min-width`);
    assert(mainCss.includes('.preview > :first-child') && mainCss.includes('margin-top: 0 !important'), 'Test 1.3: .preview > :first-child has margin-top: 0 !important');
    assert(!!document.getElementById('wysiwygToggleBtn'), 'Test 1.4: #wysiwygToggleBtn exists in Preview panel header');

    // -------------------------------------------------------------------------
    // TEST 2: Multi-Drag Splitter Durability (5 Consecutive Resizes)
    // -------------------------------------------------------------------------
    const mainContent = document.getElementById('main-content');
    const editorPanel = document.getElementById('editor-panel');
    const previewPanel = document.getElementById('preview-panel');

    // Extract setupSplitter from app.js and execute on mock context
    const appJsCode = fs.readFileSync(path.resolve(__dirname, '../src/renderer/js/app.js'), 'utf8');
    const setupSplitterMatch = appJsCode.match(/setupSplitter\(\)\s*\{[\s\S]*?\n    \}\r?\n\r?\n    setupThemeSystem/);
    assert(!!setupSplitterMatch, 'Test 2.1: Extracted setupSplitter() from app.js');

    // Mock bounding rects for #main-content (width 1200, sidebar 200px on left -> editor starts at x=200)
    mainContent.getBoundingClientRect = () => ({ left: 0, right: 1200, width: 1200, top: 0, bottom: 800, height: 800 });
    editorPanel.getBoundingClientRect = () => ({ left: 200, right: 700, width: 500, top: 0, bottom: 800, height: 800 });
    Object.defineProperty(splitterEl, 'offsetWidth', { value: 6, configurable: true });

    const mockApp = {
        viewMode: 'split',
        splitRatio: 50,
        preview: { onLayoutResizeCalled: 0, onLayoutResize() { this.onLayoutResizeCalled++; } }
    };
    const setupSplitterFn = new Function(setupSplitterMatch[0].replace(/^setupSplitter\(\)\s*\{/, '').replace(/\}\r?\n\r?\n    setupThemeSystem$/, ''));
    setupSplitterFn.call(mockApp);

    const testClientXs = [450, 800, 550, 900, 697]; // 5 consecutive drags
    for (let dragIdx = 0; dragIdx < testClientXs.length; dragIdx++) {
        const clientX = testClientXs[dragIdx];
        splitterEl.dispatchEvent(new dom.window.MouseEvent('mousedown', { button: 0, clientX: 600, bubbles: true }));
        document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX, bubbles: true }));
        document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX, bubbles: true }));

        assert(splitterEl.style.flex === '0 0 6px', `Test 2.2.${dragIdx + 1}: After drag #${dragIdx + 1}, splitter.style.flex remains "0 0 6px" (got "${splitterEl.style.flex}")`);
        assert(!document.body.classList.contains('is-resizing-split'), `Test 2.3.${dragIdx + 1}: Body resize lock class removed after mouseup #${dragIdx + 1}`);
        // Ensure flex-basis is 0px with proportional flex-grow, NEVER "0 0 X%" which crushes splitter!
        assert(/^\d+(\.\d+)?\s+1\s+0px$/.test(editorPanel.style.flex), `Test 2.4.${dragIdx + 1}: editorPanel uses proportional flex "${editorPanel.style.flex}"`);
        assert(/^\d+(\.\d+)?\s+1\s+0px$/.test(previewPanel.style.flex), `Test 2.5.${dragIdx + 1}: previewPanel uses proportional flex "${previewPanel.style.flex}"`);
    }
    assert(mockApp.preview.onLayoutResizeCalled === 5, `Test 2.6: preview.onLayoutResize() called on all 5 drags (got ${mockApp.preview.onLayoutResizeCalled})`);

    // -------------------------------------------------------------------------
    // TEST 3: Deterministic Block Line Mapping on COMPREHENSIVE-FEATURES-SHOWCASE.md
    // -------------------------------------------------------------------------
    const renderer = new dom.window.MarkdownRenderer();
    await renderer.init();

    const previewEl = document.getElementById('preview');
    const editorEl = document.getElementById('editor');
    const previewInstance = new dom.window.Preview(previewEl, renderer);

    const showcaseMd = fs.readFileSync(path.resolve(__dirname, '../examples/COMPREHENSIVE-FEATURES-SHOWCASE.md'), 'utf8');
    editorEl.value = showcaseMd;
    await previewInstance.updatePreview(showcaseMd);
    previewInstance.lastLineElementMapRebuild = 0;
    previewInstance.rebuildLineElementMap();

    const showcaseLines = showcaseMd.split('\n');
    // Find actual line of "## Mathematical Expressions" and "## Chemistry Equations" and last heading
    const mathHeadingLine = showcaseLines.findIndex((l) => l.trim() === '## Mathematical Expressions');
    const chemHeadingLine = showcaseLines.findIndex((l) => l.trim().startsWith('## Chemistry Equations') || l.trim().includes('Chemistry Equations'));
    const lastHeadingLine = showcaseLines.findIndex((l) => l.trim().startsWith('## ') && showcaseLines.indexOf(l) > 500);

    const mathHeadingEl = previewInstance.findCorrespondingElement(mathHeadingLine, editorEl);
    const chemHeadingEl = previewInstance.findCorrespondingElement(chemHeadingLine, editorEl);
    assert(mathHeadingEl && mathHeadingEl.tagName === 'H2' && mathHeadingEl.textContent.includes('Mathematical Expressions'),
        `Test 3.1: Line ${mathHeadingLine} ("## Mathematical Expressions") maps to exact <h2>Mathematical Expressions</h2> (got ${mathHeadingEl ? mathHeadingEl.tagName + ':' + mathHeadingEl.textContent : 'null'})`);
    assert(chemHeadingEl && chemHeadingEl.tagName === 'H2' && chemHeadingEl.textContent.includes('Chemistry Equations'),
        `Test 3.2: Line ${chemHeadingLine} ("## Chemistry Equations") maps to exact <h2>Chemistry Equations</h2> (got ${chemHeadingEl ? chemHeadingEl.tagName + ':' + chemHeadingEl.textContent : 'null'})`);

    if (lastHeadingLine > 0) {
        const lastHeadingEl = previewInstance.findCorrespondingElement(lastHeadingLine, editorEl);
        const expectedTitle = showcaseLines[lastHeadingLine].replace(/^#+\s*/, '').trim();
        assert(lastHeadingEl && lastHeadingEl.textContent.includes(expectedTitle.substring(0, 15)),
            `Test 3.3: Late-document heading at line ${lastHeadingLine} ("${expectedTitle}") maps to its exact DOM element (got "${lastHeadingEl ? lastHeadingEl.textContent.trim() : 'null'}")`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Piecewise-Linear Bidirectional Scroll Synchronization
    // -------------------------------------------------------------------------
    const previewContainer = document.getElementById('preview-container');
    Object.defineProperty(editorEl, 'scrollHeight', { value: 10000, configurable: true });
    Object.defineProperty(editorEl, 'clientHeight', { value: 800, configurable: true });
    Object.defineProperty(previewContainer, 'scrollHeight', { value: 14000, configurable: true });
    Object.defineProperty(previewContainer, 'clientHeight', { value: 800, configurable: true });

    // Assign realistic increasing offsetTop to preview elements so curve interpolation is tested
    let mockPreviewY = 20;
    previewInstance.blockAnchors.forEach((pair) => {
        const spanLines = Math.max(1, pair.endLine - pair.startLine + 1);
        const h = spanLines * 28;
        const topVal = mockPreviewY;
        pair.element.getBoundingClientRect = () => ({ top: topVal - previewContainer.scrollTop, bottom: topVal + h - previewContainer.scrollTop, height: h });
        mockPreviewY += h + 12;
    });
    previewContainer.getBoundingClientRect = () => ({ top: 0, bottom: 800, height: 800 });
    previewInstance.measureEditorLinePixelOffsets(editorEl, showcaseLines);

    // 4.1 Top alignment: editor.scrollTop = 0 -> previewContainer.scrollTop = 0
    editorEl.scrollTop = 0;
    previewInstance.syncScrollFromEditor();
    assert(previewContainer.scrollTop === 0, `Test 4.1: Editor at top (0px) aligns Preview to exact top (0px, got ${previewContainer.scrollTop}px)`);

    // 4.2 Anchor alignment: scrolling editor to the exact top of "## Mathematical Expressions" aligns preview to mathHeadingEl's top!
    const mathEditorY = previewInstance.getLineTopInEditor(editorEl, mathHeadingLine);
    const expectedMathPreviewY = previewInstance.getElementOffsetInPreview(mathHeadingEl, previewContainer);
    editorEl.scrollTop = mathEditorY;
    previewInstance.syncScrollFromEditor();
    assert(Math.abs(previewContainer.scrollTop - expectedMathPreviewY) <= 2,
        `Test 4.2: Editor at "## Mathematical Expressions" (${Math.round(mathEditorY)}px) aligns Preview to mathHeadingEl (${Math.round(expectedMathPreviewY)}px, got ${previewContainer.scrollTop}px)`);

    // 4.3 Inverse sync (Preview -> Editor): scrolling preview to expectedMathPreviewY aligns editor back to mathEditorY!
    previewContainer.scrollTop = expectedMathPreviewY;
    previewInstance.syncScrollToEditor();
    assert(Math.abs(editorEl.scrollTop - mathEditorY) <= 2,
        `Test 4.3: Preview at "## Mathematical Expressions" (${Math.round(expectedMathPreviewY)}px) aligns Editor back to line ${mathHeadingLine} (${Math.round(mathEditorY)}px, got ${editorEl.scrollTop}px)`);

    // 4.4 Bottom alignment: editor at max scroll -> preview at max scroll
    editorEl.scrollTop = 10000 - 800;
    previewInstance.syncScrollFromEditor();
    assert(previewContainer.scrollTop === 14000 - 800, `Test 4.4: Editor at bottom aligns Preview to exact bottom (${14000 - 800}px, got ${previewContainer.scrollTop}px)`);

    // -------------------------------------------------------------------------
    // TEST 5: Interactive WYSIWYG Editing Mode in Preview
    // -------------------------------------------------------------------------
    previewInstance.toggleWysiwygMode(true);
    assert(previewInstance.wysiwygEnabled === true && previewEl.classList.contains('wysiwyg-mode'), 'Test 5.1: WYSIWYG mode enabled on #preview');
    assert(mathHeadingEl.getAttribute('contenteditable') === 'true', 'Test 5.2: Heading element in Preview is contenteditable="true" in WYSIWYG mode');

    // Simulate editing the heading text directly in the Preview pane
    mathHeadingEl.innerHTML = 'Mathematical &amp; Algebraic Expressions';
    previewInstance.syncWysiwygBlockToEditor(mathHeadingEl, true);
    const updatedLines = editorEl.value.split('\n');
    assert(updatedLines[mathHeadingLine] === '## Mathematical & Algebraic Expressions',
        `Test 5.3: Editing heading in WYSIWYG Preview updated exact Markdown source line ${mathHeadingLine} (got "${updatedLines[mathHeadingLine]}")`);

    previewInstance.toggleWysiwygMode(false);
    assert(mathHeadingEl.getAttribute('contenteditable') === null, 'Test 5.4: Disabling WYSIWYG mode cleanly removes contenteditable attributes');

    console.log('\n============================================================');
    if (failures > 0) {
        console.error(`VERIFICATION FAILED with ${failures} failed assertion(s)!`);
        process.exit(1);
    } else {
        console.log('🎉 ALL SPLITTER, ALIGNMENT & WYSIWYG TESTS PASSED (0 FAILURES)!');
        process.exit(0);
    }
}

runAuditTests().catch((err) => {
    console.error('Unhandled error in verification suite:', err);
    process.exit(1);
});
