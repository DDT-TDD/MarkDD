const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

async function run() {
    console.log('Running Preview Performance & Offline Assets Tests...');

    // 1. Offline CDN & picsum.photos check
    const filesToCheck = [
        'src/renderer/js/presentation.js',
        'src/renderer/js/cv.js',
        'src/renderer/js/preview.js',
        'src/common/book-engine.js',
        'src/renderer/js/app.js'
    ];
    const forbiddenUrls = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'picsum.photos'];
    for (const rel of filesToCheck) {
        const content = fs.readFileSync(path.join(root, rel), 'utf8');
        for (const host of forbiddenUrls) {
            assert.ok(!content.includes(host), `${rel} must not contain external URL host: ${host}`);
        }
    }
    console.log('  [PASS] Zero external CDN / picsum URLs in preview/book/CV files');

    // 2. Local vendor assets exist
    const requiredVendors = [
        'highlight-github.min.css',
        'highlight-github-dark.min.css',
        'lunr.min.js',
        'mathjax-tex-svg.js',
        'markmap-lib.min.js',
        'markmap-view.min.js',
        'purify.min.js',
        'katex.min.css',
        'katex.min.js',
        'auto-render.min.js',
        'mermaid.min.js'
    ];
    for (const v of requiredVendors) {
        const vp = path.join(root, 'src', 'renderer', 'vendor', v);
        assert.ok(fs.existsSync(vp) && fs.statSync(vp).size > 0, `Missing or empty vendor file: ${v}`);
    }
    console.log('  [PASS] All required offline vendor assets present');

    // 3. index.html lazy TikZ + synchronous DOMPurify check
    const indexHtml = fs.readFileSync(path.join(root, 'src', 'renderer', 'index.html'), 'utf8');
    assert.ok(!indexHtml.includes('<script src="js/obsidian-tikzjax.js"></script>'), 'index.html must not synchronously load obsidian-tikzjax.js');
    assert.ok(indexHtml.includes('vendor/purify.min.js'), 'index.html must load vendor/purify.min.js');
    console.log('  [PASS] index.html loads DOMPurify synchronously and defers TikZ');

    // 4. Incremental presentation update hook
    const presJs = fs.readFileSync(path.join(root, 'src', 'renderer', 'js', 'presentation.js'), 'utf8');
    const mainJs = fs.readFileSync(path.join(root, 'src', 'main', 'main.js'), 'utf8');
    assert.ok(presJs.includes('window.__markddUpdatePresentation'), 'presentation.js must define window.__markddUpdatePresentation');
    assert.ok(mainJs.includes('__markddUpdatePresentation'), 'main.js must use incremental __markddUpdatePresentation');
    console.log('  [PASS] Incremental presentation update hook present');

    // 5. MarkdownRenderer.init() speed without window.katex (< 500ms)
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    dom.window.marked = require(path.join(root, 'src', 'renderer', 'vendor', 'marked.min.js'));
    const mrCode = fs.readFileSync(path.join(root, 'src', 'renderer', 'js', 'markdown-renderer.js'), 'utf8');
    dom.window.eval(mrCode);
    const renderer = new dom.window.MarkdownRenderer();
    const t0 = Date.now();
    await renderer.init();
    const elapsed = Date.now() - t0;
    dom.window.close();
    assert.ok(elapsed < 500, `MarkdownRenderer.init() took ${elapsed}ms, expected < 500ms`);
    console.log(`  [PASS] MarkdownRenderer.init() without katex completed in ${elapsed}ms (< 500ms)`);

    // 6. Render examples/COMPREHENSIVE-FEATURES-SHOWCASE.md (YouTube, Chemistry, MathJax/KaTeX, Mermaid)
    const showDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    showDom.window.marked = require(path.join(root, 'src', 'renderer', 'vendor', 'marked.min.js'));
    // Load KaTeX + mhchem into showDom
    const katexCode = fs.readFileSync(path.join(root, 'src', 'renderer', 'vendor', 'katex.min.js'), 'utf8');
    showDom.window.eval(katexCode);
    const mhchemCode = fs.readFileSync(path.join(root, 'src', 'renderer', 'vendor', 'mhchem.min.js'), 'utf8');
    showDom.window.eval(mhchemCode);
    // Simulate MathJax v4 tex2svg returning valid SVG path, plus Mermaid returning foreignObject node labels
    showDom.window.MathJax = {
        startup: { promise: Promise.resolve(), document: {} },
        tex2svg: (tex) => {
            if (/\\(ce|pu)\b/.test(tex)) {
                return '<mjx-container class="MathJax" jax="SVG"><svg><g data-mml-node="merror"></g></svg></mjx-container>';
            }
            return '<mjx-container class="MathJax" jax="SVG"><svg viewBox="0 0 100 100"><defs><path id="MJX-T" d="M0 0L10 10"></path></defs><g><use xlink:href="#MJX-T"></use></g></svg></mjx-container>';
        }
    };
    showDom.window.mermaid = {
        initialize: () => {},
        render: async (_id, code) => ({
            svg: `<svg viewBox="0 0 200 100"><path d="M10 10L50 50"></path><foreignObject width="120" height="40"><div xmlns="http://www.w3.org/1999/xhtml"><span class="nodeLabel">${code.slice(0, 20)}</span></div></foreignObject></svg>`
        })
    };
    showDom.window.eval(mrCode);
    const showRenderer = new showDom.window.MarkdownRenderer();
    await showRenderer.init();
    const showcaseMd = fs.readFileSync(path.join(root, 'examples', 'COMPREHENSIVE-FEATURES-SHOWCASE.md'), 'utf8');
    const renderedShowcase = await showRenderer.render(showcaseMd);
    showDom.window.close();

    assert.ok(renderedShowcase.includes('<iframe') && renderedShowcase.includes('youtube-nocookie.com/embed/5Peo-ivmupE'), 'Showcase must render YouTube embed iframe');
    assert.ok(renderedShowcase.includes('d="M0 0L10 10"') && renderedShowcase.includes('xlink:href="#MJX-T"'), 'Showcase must preserve MathJax SVG paths and xlink:href');
    assert.ok(!renderedShowcase.includes('data-mml-node="merror"'), 'Chemistry must fall back to KaTeX+mhchem instead of leaving MathJax merror');
    assert.ok(renderedShowcase.includes('katex-html') && renderedShowcase.includes('NH'), 'Chemistry formulas must render non-empty KaTeX+mhchem output');
    assert.ok(!renderedShowcase.includes('katex-error'), 'Showcase chemistry/math must have zero katex-error elements');
    assert.ok(renderedShowcase.includes('<foreignObject') && renderedShowcase.includes('nodeLabel'), 'Showcase Mermaid diagrams must preserve foreignObject text labels');
    console.log('  [PASS] COMPREHENSIVE-FEATURES-SHOWCASE.md rendered YouTube, Math, Chemistry, and Mermaid with zero regressions');

    console.log('ALL PREVIEW PERFORMANCE & OFFLINE TESTS PASSED!');
    process.exit(0);
}

run().catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
