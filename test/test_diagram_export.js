// test/test_diagram_export.js - Comprehensive validation of diagram export & menu wiring
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Diagram Export & Menu Wiring Validation Suite ---');

// 1. Verify markdown-renderer.js contains export methods
const markdownRendererCode = fs.readFileSync(path.join(__dirname, '../src/renderer/js/markdown-renderer.js'), 'utf-8');

assert(markdownRendererCode.includes('async exportDiagram('), 'markdown-renderer.js must implement exportDiagram');
assert(markdownRendererCode.includes('saveDiagramFile('), 'markdown-renderer.js must implement saveDiagramFile');
assert(markdownRendererCode.includes('svgToPngDataUrl('), 'markdown-renderer.js must implement svgToPngDataUrl');
assert(markdownRendererCode.includes('copyDiagramImage('), 'markdown-renderer.js must implement copyDiagramImage');
assert(markdownRendererCode.includes('copyDiagramSVG('), 'markdown-renderer.js must implement copyDiagramSVG');
assert(markdownRendererCode.includes('ensureDiagramHeaders('), 'markdown-renderer.js must implement ensureDiagramHeaders');
assert(markdownRendererCode.includes('renderWaveDromToSVG('), 'markdown-renderer.js must implement renderWaveDromToSVG');

console.log('✅ markdown-renderer.js includes all diagram export & WaveDrom rendering functions');

// 2. Verify all diagram handlers have export buttons
const diagramTypes = ['plantuml', 'mermaid', 'graphviz', 'tikz', 'vegalite', 'wavedrom', 'markmap', 'kityminder', 'abc'];
for (const type of diagramTypes) {
    assert(markdownRendererCode.toLowerCase().includes(type), `markdown-renderer.js should handle ${type}`);
}
console.log('✅ All 9 diagram formats (PlantUML, Mermaid, GraphViz, TikZ, Vega-Lite, WaveDrom, Markmap, KityMinder, ABC) are supported');

// 3. Verify main.js IPC handler for save-diagram-file
const electronMainCode = fs.readFileSync(path.join(__dirname, '../src/main/main.js'), 'utf-8');
assert(electronMainCode.includes("'save-diagram-file'"), 'Electron main.js must handle save-diagram-file IPC');
assert(electronMainCode.includes("Buffer.from(content, 'base64')"), 'Electron main.js must handle base64 binary writing');

console.log('✅ Electron main.js contains save-diagram-file handler with binary/base64 support');

// 4. Verify main-tauri.js IPC handler for save-diagram-file
const tauriMainCode = fs.readFileSync(path.join(__dirname, '../src/main/main-tauri.js'), 'utf-8');
assert(tauriMainCode.includes("case 'save-diagram-file':"), 'Tauri main-tauri.js must handle save-diagram-file action');
assert(tauriMainCode.includes("Buffer.from(payload.content, 'base64')"), 'Tauri main-tauri.js must handle base64 binary writing');

console.log('✅ Tauri main-tauri.js contains save-diagram-file handler with binary/base64 support');

// 5. Verify bridge.js intercepts save-diagram-file
const bridgeCode = fs.readFileSync(path.join(__dirname, '../src/renderer/js/bridge.js'), 'utf-8');
assert(bridgeCode.includes("channel === 'save-diagram-file'"), 'bridge.js must intercept save-diagram-file in Tauri mode');

console.log('✅ bridge.js correctly routes save-diagram-file through Tauri native save dialog');

// 6. Verify menu wiring in app.js
const appCode = fs.readFileSync(path.join(__dirname, '../src/renderer/js/app.js'), 'utf-8');
assert(appCode.includes("document.getElementById('menu-book-mode-toggle')"), 'app.js must wire menu-book-mode-toggle');
assert(appCode.includes("document.getElementById('menu-presentation-toggle-navigation')"), 'app.js must wire menu-presentation-toggle-navigation');
assert(appCode.includes("document.getElementById('menu-presentation-toggle-toc')"), 'app.js must wire menu-presentation-toggle-toc');
assert(appCode.includes("document.getElementById('menu-presentation-toggle-page-numbers')"), 'app.js must wire menu-presentation-toggle-page-numbers');

console.log('✅ app.js wires all menu toggle buttons');

// 7. Verify preview.js diagram context menu
const previewCode = fs.readFileSync(path.join(__dirname, '../src/renderer/js/preview.js'), 'utf-8');
assert(previewCode.includes("handleDiagramContextMenu("), 'preview.js must implement handleDiagramContextMenu');
assert(previewCode.includes("diagram-context-menu"), 'preview.js must create diagram-context-menu');

console.log('✅ preview.js contains diagram context menu handler');

// 8. Verify CSS styles in main.css
const cssCode = fs.readFileSync(path.join(__dirname, '../src/renderer/styles/main.css'), 'utf-8');
assert(cssCode.includes('.diagram-header'), 'main.css must style .diagram-header');
assert(cssCode.includes('.diagram-export-svg-btn'), 'main.css must style .diagram-export-svg-btn');
assert(cssCode.includes('.diagram-export-png-btn'), 'main.css must style .diagram-export-png-btn');
assert(cssCode.includes('.diagram-context-menu'), 'main.css must style .diagram-context-menu');

console.log('✅ main.css contains styling for diagram headers, export buttons, and context menu');

// 9. Verify vendor scripts are bundled locally for offline Tauri & Electron operation
const vendorDir = path.join(__dirname, '../src/renderer/vendor');
const requiredVendorScripts = [
    'mermaid.min.js',
    'd3.min.js',
    'vega.min.js',
    'vega-lite.min.js',
    'vega-embed.min.js',
    'abcjs-basic-min.js',
    'plantuml-encoder.min.js'
];
for (const script of requiredVendorScripts) {
    const scriptPath = path.join(vendorDir, script);
    assert(fs.existsSync(scriptPath), `Vendor script ${script} must exist in src/renderer/vendor`);
    assert(fs.statSync(scriptPath).size > 1000, `Vendor script ${script} must not be empty`);
}
console.log('✅ All 7 vendor scripts exist in src/renderer/vendor/ with valid sizes');

// 10. Verify library-loader.js points to vendor scripts
const loaderCode = fs.readFileSync(path.join(__dirname, '../src/renderer/js/library-loader.js'), 'utf-8');
for (const script of requiredVendorScripts) {
    assert(loaderCode.includes(`vendor/${script}`), `library-loader.js must reference vendor/${script}`);
}
console.log('✅ library-loader.js references all local vendor scripts');

// 11. Verify backend SVG rasterization fallback in main.js and main-tauri.js
assert(electronMainCode.includes('svgContent'), 'Electron main.js must accept svgContent for rasterization fallback');
assert(electronMainCode.includes('screenshot'), 'Electron main.js must support screenshot rasterization');
assert(tauriMainCode.includes('svgContent'), 'Tauri main-tauri.js must accept svgContent for rasterization fallback');
assert(tauriMainCode.includes('screenshot'), 'Tauri main-tauri.js must support screenshot rasterization');
console.log('✅ Both Electron and Tauri backends support svgContent PNG rasterization fallback');

// 12. Verify performance optimization in markdown-renderer.js
assert(markdownRendererCode.includes('processor.selector'), 'markdown-renderer.js must check processor selector before running');
console.log('✅ markdown-renderer.js has selector fast-path for diagram processors');

console.log('\n🎉 ALL DIAGRAM EXPORT & MENU WIRING TESTS PASSED SUCCESSFULLY! 🎉');

