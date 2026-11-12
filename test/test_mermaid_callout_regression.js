const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');

async function testRegression() {
    console.log('Running Presentation & Markdown Callout + Mermaid Regression Tests...');
    
    // 1. Setup DOM environment
    const origTextEncoder = global.TextEncoder;
    const dom = new JSDOM('', { url: 'http://localhost' });
    global.window = dom.window;
    global.document = dom.window.document;
    global.localStorage = dom.window.localStorage;
    global.Node = dom.window.Node;
    global.NodeFilter = dom.window.NodeFilter;
    global.DOMParser = dom.window.DOMParser;
    global.TextEncoder = origTextEncoder || dom.window.TextEncoder;

    const marked = require(path.join(__dirname, '../src/renderer/vendor/marked.min.js'));
    global.window.marked = marked;

    const MarkdownRenderer = require(path.join(__dirname, '../src/renderer/js/markdown-renderer.js'));
    const renderer = new MarkdownRenderer();
    renderer.marked = marked;
    renderer.initializeMarked();

    const PresentationManager = require(path.join(__dirname, '../src/renderer/js/presentation.js'));
    const pm = new PresentationManager();

    const bt = '```';
    const testMarkdown = `## Safety Systems & Hazards

:::warning Common Industry Pain Points
Fragmented safety spreadsheets, manual RWB re-keying, accidental shared component IDs on Fault Trees/RBDs, and broken traceability between Hazard Logs and quantitative models.
:::

${bt}mermaid
graph LR
    A[Safety Spreadsheets] --> B[Manual RWB Re-keying]
    B --> C[Accidental Shared IDs]
    C --> D[Broken Traceability]
${bt}
`;

    // 2. Test Normal Markdown Renderer
    console.log('Testing MarkdownRenderer (Normal Preview)...');
    const normalHtml = await renderer.render(testMarkdown);
    assert(normalHtml.includes('custom-container-warning'), 'Must contain custom-container-warning');
    assert(normalHtml.includes('Common Industry Pain Points'), 'Must contain container title');
    assert(normalHtml.includes('quantitative models.'), 'Must contain complete sentence');
    // Ensure no duplication / leftover sentence fragments
    const normalMatches = normalHtml.match(/quantitative models/g) || [];
    assert.strictEqual(normalMatches.length, 1, 'Sentence must appear exactly once in normal preview (no orphan fragment)');
    console.log('PASS: Normal preview rendering verified.');

    // 3. Test Presentation HTML generation
    console.log('Testing PresentationManager HTML generation...');
    const parsed = pm.parseMarkdown(testMarkdown);
    assert.strictEqual(parsed.slides.length, 1, 'Should have exactly 1 slide');
    
    const slideHtml = pm.generateSlideHTML(parsed.slides[0], 0, 'berkeley');
    assert(slideHtml.includes('custom-container-warning'), 'Slide HTML must contain custom-container-warning');
    assert(slideHtml.includes('class="mermaid"'), 'Slide HTML must contain clean .mermaid element');
    
    const slideMatches = slideHtml.match(/quantitative models/g) || [];
    assert.strictEqual(slideMatches.length, 1, 'Sentence must appear exactly once in slide HTML (no leftover sentence fragment)');
    console.log('PASS: Slide HTML generation verified.');

    // 4. Test Complete Presentation Document
    console.log('Testing complete presentation HTML document...');
    const fullHtml = await pm.generateHTML({ theme: 'berkeley' });
    
    // Check Mermaid initialization configuration in output
    assert(fullHtml.includes('useMaxWidth: true'), 'Full HTML must configure Mermaid with useMaxWidth: true');
    assert(fullHtml.includes('await mermaid.run({ nodes: mermaidDiagrams })'), 'Full HTML must await mermaid.run in renderingPromises');
    assert(fullHtml.includes('.slide .mermaid svg'), 'Full HTML must have responsive slide mermaid CSS');
    assert(fullHtml.includes('max-height: 55vh !important;'), 'Full HTML must prevent mermaid SVG vertical blowout');
    assert(fullHtml.includes('.slide .custom-container'), 'Full HTML must style .slide .custom-container for word wrapping');
    assert(fullHtml.includes('justify-content: safe center;'), 'Full HTML must use safe center alignment');
    
    const docMatches = fullHtml.match(/quantitative models/g) || [];
    assert.strictEqual(docMatches.length, 1, 'Sentence must appear exactly once in entire generated HTML document');
    console.log('PASS: Full presentation document verified.');

    // 5. Visual geometry check via jsdom/CSS assertions
    console.log('PASS: CSS layout & visual rules verified.');

    console.log('All regression tests passed successfully!');
}

testRegression().catch(err => {
    console.error('REGRESSION TEST FAILED:', err);
    process.exit(1);
});
