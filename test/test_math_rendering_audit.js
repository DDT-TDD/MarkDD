/**
 * Comprehensive Math & Showcase Zero-Regression Audit Suite
 * Tests:
 * 1. Inline math with subscripts (_), superscripts (^), asterisks (*), tildes (~), minus (-), and functions f(x)
 * 2. Display math ($$...$$, \[...\]) and LaTeX environments (\begin{align}, \begin{pmatrix}, \begin{cases}, \begin{equation})
 * 3. Chemistry mhchem (\ce{...}, \pu{...}) including reversible equilibrium arrows (<=>)
 * 4. Inequalities ($a < b \text{ and } c > d$) ensuring <...> is not stripped as HTML
 * 5. Fenced code blocks & inline code containing $...$ ensuring zero placeholder leakage
 * 6. Full end-to-end rendering of examples/COMPREHENSIVE-FEATURES-SHOWCASE.md
 * 7. Full end-to-end rendering of editor.js getCleanComprehensiveExample()
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runMathAudit() {
    console.log('=== Starting MarkDD Comprehensive Math & Showcase Audit ===\n');

    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="preview"></div></body></html>', {
        url: 'http://localhost',
        runScripts: 'dangerously',
        resources: 'usable'
    });

    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    global.NodeFilter = dom.window.NodeFilter;
    global.HTMLElement = dom.window.HTMLElement;
    global.DOMParser = dom.window.DOMParser;
    global.localStorage = dom.window.localStorage;
    global.sessionStorage = dom.window.sessionStorage;

    // Load Marked & DOMPurify from node_modules
    const { marked } = require('marked');
    global.marked = marked;
    window.marked = marked;

    const createDOMPurify = require('dompurify');
    const DOMPurify = createDOMPurify( dom.window );
    global.DOMPurify = DOMPurify;
    window.DOMPurify = DOMPurify;

    // Load KaTeX & mhchem from src/renderer/vendor (verifying vendor sync!)
    const vendorKatexPath = path.resolve(__dirname, '../src/renderer/vendor/katex.min.js');
    const vendorMhchemPath = path.resolve(__dirname, '../src/renderer/vendor/mhchem.min.js');
    if (!fs.existsSync(vendorKatexPath) || !fs.existsSync(vendorMhchemPath)) {
        console.error('FAIL: Missing vendor/katex.min.js or vendor/mhchem.min.js');
        process.exit(1);
    }

    const katexCode = fs.readFileSync(vendorKatexPath, 'utf-8');
    dom.window.eval(katexCode);
    global.katex = dom.window.katex;

    const mhchemCode = fs.readFileSync(vendorMhchemPath, 'utf-8');
    dom.window.eval(mhchemCode);

    // Load MarkdownRenderer
    const rendererCode = fs.readFileSync(path.resolve(__dirname, '../src/renderer/js/markdown-renderer.js'), 'utf-8');
    dom.window.eval(rendererCode);
    const MarkdownRenderer = dom.window.MarkdownRenderer;

    const renderer = new MarkdownRenderer();
    await renderer.init();

    let failures = 0;
    function assert(condition, message) {
        if (!condition) {
            console.error(`❌ FAIL: ${message}`);
            failures++;
        } else {
            console.log(`✅ PASS: ${message}`);
        }
    }

    // Helper: inspect rendered HTML for common math failures
    function inspectRenderedDOM(html, label) {
        const container = document.createElement('div');
        container.innerHTML = html;

        // 1. Check for leaked placeholders anywhere in HTML (including code blocks!)
        const hasLeakedPlaceholder = /MATH_(?:DISPLAY|INLINE|ENV)_\d+|data-math-placeholder|@@MARKDD_CODE_MASK_/.test(html);
        assert(!hasLeakedPlaceholder, `[${label}] Zero leaked math/code placeholders in output HTML`);

        // 2. Check for KaTeX or math errors
        const katexErrors = container.querySelectorAll('.katex-error, .math-error, [style*="#cc0000"]');
        if (katexErrors.length > 0) {
            katexErrors.forEach(e => console.error(`   Error node in [${label}]:`, e.outerHTML));
        }
        assert(katexErrors.length === 0, `[${label}] Zero .katex-error / .math-error elements (found ${katexErrors.length})`);

        // 3. Check for unrendered $...$ or \begin{...} in non-code text nodes
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const unrenderedNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            const p = node.parentElement;
            if (p && p.closest('code, pre, .katex, mjx-container, annotation, script, style, .tikz-container')) continue;
            const txt = (node.nodeValue || '').trim();
            if (!txt) continue;
            // Check for unrendered LaTeX math ($...$ excluding currency like $100, or raw \sum, \frac, \int, \lim)
            if (/\$[^$]+\$|\\(?:sum|frac|int|lim|sqrt|ce|pu|begin)\b/.test(txt)) {
                unrenderedNodes.push(txt);
            }
        }
        if (unrenderedNodes.length > 0) {
            console.error(`   Unrendered math text nodes in [${label}]:`, unrenderedNodes);
        }
        assert(unrenderedNodes.length === 0, `[${label}] Zero unrendered math expressions in text nodes (found ${unrenderedNodes.length})`);

        return container;
    }

    // --- TEST 1: Screenshot Regression Case (Inline math with subscripts) ---
    const t1Markdown = `Here's some inline math: $E = mc^2$ and $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$.`;
    const t1Html = await renderer.render(t1Markdown);
    const t1Dom = inspectRenderedDOM(t1Html, 'Test 1: Screenshot Inline Math');
    assert(t1Dom.querySelectorAll('.math-inline .katex').length === 2, 'Test 1: Both inline math expressions rendered via KaTeX');

    // --- TEST 2: Edge-case Inline Math (multiple subscripts, *, ~, -, f(x), inequalities) ---
    const t2Markdown = [
        'Subscripts: $\\sum_{i=1}^{n} x_i = x_1 + x_2 + ... + x_n$ and $\\lim_{x \\to \\infty} \\frac{1}{x} = 0$',
        'Asterisk & Tilde: $a * b = c$, $A^*$, and $X \\sim N(0, 1)$',
        'Minus & Functions: $a - b = c$, $2x - 1 = 0$, $f(x)$, $g(x, y)$, and $O(n^2)$',
        'Inequalities with < and >: $a < b \\text{ and } c > d$'
    ].join('\n\n');
    const t2Html = await renderer.render(t2Markdown);
    const t2Dom = inspectRenderedDOM(t2Html, 'Test 2: Edge-Case Inline Math');
    assert(t2Dom.querySelectorAll('.math-inline .katex').length === 11, `Test 2: All 11 inline math edge cases rendered (got ${t2Dom.querySelectorAll('.math-inline .katex').length})`);
    assert(!t2Html.includes('<em>i = x</em>'), 'Test 2: Subscripts were NOT mangled into <em> italics by marked');

    // --- TEST 3: Chemistry (mhchem) including reversible reaction <=> ---
    const t3Markdown = [
        'Inline chemistry: $\\ce{H2O}$, $\\ce{H2SO4}$, $\\ce{CO2 + C -> 2CO}$, and $\\pu{123 kJ*mol-1}$.',
        '$$\\ce{N2 + 3H2 <=> 2NH3}$$',
        '$$\\ce{CH4 + 2O2 -> CO2 + 2H2O}$$'
    ].join('\n\n');
    const t3Html = await renderer.render(t3Markdown);
    const t3Dom = inspectRenderedDOM(t3Html, 'Test 3: Chemistry & Reversible Arrow <=>');
    assert(t3Html.includes('2NH3') && !t3Html.includes('\\ce{N2 + 3H2 2NH3}'), 'Test 3: Reversible arrow <=> was NOT stripped from \\ce{N2 + 3H2 <=> 2NH3}');

    // --- TEST 4: Code Blocks & Inline Code with Math Must Not Be Corrupted ---
    const t4Markdown = [
        'Inline code: `$E = mc^2$` and `$\\sum_{i=1}^n i$`.',
        '```markdown',
        'Inline math: $E = mc^2$',
        'Display math:',
        '$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
        '```',
        '```latex',
        '\\begin{equation}',
        'E = mc^2',
        '\\end{equation}',
        '```'
    ].join('\n');
    const t4Html = await renderer.render(t4Markdown);
    const t4Dom = inspectRenderedDOM(t4Html, 'Test 4: Code Block Math Isolation');
    assert(t4Dom.querySelectorAll('.math-inline, .math-display').length === 0, 'Test 4: Math inside code blocks/spans was NOT rendered as math');

    // --- TEST 5: Full examples/COMPREHENSIVE-FEATURES-SHOWCASE.md ---
    const showcasePath = path.resolve(__dirname, '../examples/COMPREHENSIVE-FEATURES-SHOWCASE.md');
    const showcaseMd = fs.readFileSync(showcasePath, 'utf-8');
    const showcaseHtml = await renderer.render(showcaseMd);
    const showcaseDom = inspectRenderedDOM(showcaseHtml, 'Test 5: COMPREHENSIVE-FEATURES-SHOWCASE.md');
    const showcaseInlineCount = showcaseDom.querySelectorAll('.math-inline .katex').length;
    const showcaseDisplayCount = showcaseDom.querySelectorAll('.math-display .katex, .math-environment .katex, .math-block .katex').length;
    console.log(`   Showcase rendered ${showcaseInlineCount} inline math and ${showcaseDisplayCount} display/environment math blocks.`);
    assert(showcaseInlineCount >= 9, `Test 5: At least 9 inline math expressions rendered in showcase (got ${showcaseInlineCount})`);
    assert(showcaseDisplayCount >= 11, `Test 5: At least 11 display/environment math blocks rendered in showcase (got ${showcaseDisplayCount})`);

    // --- TEST 6: Built-in Showcase in src/renderer/js/editor.js ---
    const Editor = require('../src/renderer/js/editor.js');
    const editorShowcaseMd = Editor.prototype.getCleanComprehensiveExample();
    assert(typeof editorShowcaseMd === 'string' && editorShowcaseMd.length > 500, 'Test 6: Extracted getCleanComprehensiveExample() from editor.js');
    const editorHtml = await renderer.render(editorShowcaseMd);
    const editorDom = inspectRenderedDOM(editorHtml, 'Test 6: editor.js Built-in Showcase');
    const editorInlineCount = editorDom.querySelectorAll('.math-inline .katex').length;
    const editorDisplayCount = editorDom.querySelectorAll('.math-display .katex, .math-environment .katex, .math-block .katex').length;
    console.log(`   Editor showcase rendered ${editorInlineCount} inline math and ${editorDisplayCount} display/environment math blocks.`);
    assert(editorInlineCount >= 3, `Test 6: All inline math in editor.js showcase rendered (got ${editorInlineCount})`);
    assert(editorDisplayCount >= 6, `Test 6: All display math in editor.js showcase rendered (got ${editorDisplayCount})`);

    console.log('\n============================================================');
    if (failures > 0) {
        console.error(`AUDIT FAILED with ${failures} failed assertion(s). DO NOT PROCEED until all failures are fixed!`);
        process.exit(1);
    } else {
        console.log('🎉 ALL MATH & SHOWCASE ZERO-REGRESSION TESTS PASSED (0 FAILURES)!');
        process.exit(0);
    }
}

runMathAudit().catch(err => {
    console.error('Unhandled error in math audit:', err);
    console.error(err.stack);
    process.exit(1);
});
