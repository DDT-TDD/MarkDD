const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

async function run() {
    console.log('Running Security Hardening Tests...');

    // 1. Electron main.js webPreferences & path containment
    const mainJs = fs.readFileSync(path.join(root, 'src', 'main', 'main.js'), 'utf8');
    assert.ok(!mainJs.includes('nodeIntegration: true'), 'main.js must never enable nodeIntegration: true');
    assert.ok(mainJs.includes('webSecurity: false'), 'main.js must allow local file:// resource loading for data: preview windows');
    assert.ok(mainJs.includes('contextIsolation: true'), 'main.js must enable contextIsolation: true');
    assert.ok(mainJs.includes('preload.js'), 'main.js must attach preload.js');
    assert.ok(mainJs.includes('function isSafeElectronPath'), 'main.js must define isSafeElectronPath');
    assert.ok(fs.existsSync(path.join(root, 'src', 'main', 'preload.js')), 'src/main/preload.js must exist');
    console.log('  [PASS] Electron contextIsolation, preload, local resource policy, and path containment verified');

    // 2. Tauri main-tauri.js & lib.rs hardening
    const tauriJs = fs.readFileSync(path.join(root, 'src', 'main', 'main-tauri.js'), 'utf8');
    assert.ok(tauriJs.includes('SESSION_TOKEN'), 'main-tauri.js must enforce SESSION_TOKEN');
    assert.ok(tauriJs.includes('isSafeUserPath'), 'main-tauri.js must enforce isSafeUserPath');
    assert.ok(!tauriJs.includes('Access-Control-Allow-Origin\', \'*\''), 'main-tauri.js must not set wildcard CORS');
    assert.ok(!tauriJs.includes('cmd.exe'), 'main-tauri.js must not shell out to cmd.exe');
    assert.ok(!tauriJs.includes('reg add'), 'main-tauri.js must not run reg add');
    assert.ok(tauriJs.includes('rundll32.exe'), 'main-tauri.js must use rundll32.exe for external URLs');

    const libRs = fs.readFileSync(path.join(root, 'src-tauri', 'src', 'lib.rs'), 'utf8');
    assert.ok(!libRs.includes('taskkill'), 'lib.rs must not run blind taskkill');
    assert.ok(libRs.includes('get_backend_config'), 'lib.rs must expose get_backend_config');
    console.log('  [PASS] Tauri HTTP token, CORS, path safety, and Rust startup hardening verified');

    // 3. XSS sanitization preserving MathJax, Mermaid foreignObject, and YouTube iframe
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only' });
    const mrCode = fs.readFileSync(path.join(root, 'src', 'renderer', 'js', 'markdown-renderer.js'), 'utf8');
    dom.window.eval(mrCode);
    const renderer = new dom.window.MarkdownRenderer();
    const dirty = '<h1>Title</h1><script>window.__xss=1;</script><img src="x" onerror="window.__xss=2"><div class="math-display"><mjx-container class="MathJax"><svg><defs><path id="MJX-1" d="M0 0L10 10"></path></defs><g><use xlink:href="#MJX-1"></use></g></svg></mjx-container></div><svg><foreignObject width="100" height="40"><div><span>Yes / Start Node</span></div></foreignObject></svg><iframe src="https://www.youtube-nocookie.com/embed/5Peo-ivmupE"></iframe><a href="javascript:alert(1)">bad</a>';
    const clean = renderer.sanitizeHTML(dirty);
    dom.window.close();
    assert.ok(!clean.includes('<script'), 'sanitizeHTML must strip <script> tags');
    assert.ok(!clean.includes('onerror='), 'sanitizeHTML must strip onerror attributes');
    assert.ok(!clean.includes('javascript:alert(1)'), 'sanitizeHTML must strip javascript: URIs');
    assert.ok(clean.includes('<h1>Title</h1>'), 'sanitizeHTML must preserve safe headings');
    assert.ok(clean.includes('d="M0 0L10 10"') && clean.includes('xlink:href="#MJX-1"'), 'sanitizeHTML must preserve MathJax SVG paths and use xlink:href');
    assert.ok(clean.includes('<foreignObject') && clean.includes('Yes / Start Node'), 'sanitizeHTML must preserve Mermaid foreignObject labels');
    assert.ok(clean.includes('youtube-nocookie.com/embed/5Peo-ivmupE'), 'sanitizeHTML must preserve YouTube iframe embeds');
    console.log('  [PASS] sanitizeHTML strips XSS payloads while preserving MathJax, Mermaid foreignObject, and YouTube');

    console.log('ALL SECURITY HARDENING TESTS PASSED!');
    process.exit(0);
}

run().catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
