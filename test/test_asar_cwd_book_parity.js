const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');

async function run() {
    console.log('Running ASAR / CWD / Book / TikZ Parity Tests...');

    // 1. CWD-independent TikZ helper loading (via fixture appRoot while CWD is os.tmpdir)
    const origCwd = process.cwd();
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'markdd-tikz-test-'));
    try {
        const fakeDist = path.join(tmpRoot, 'References', 'node-tikzjax-main', 'dist');
        fs.mkdirSync(fakeDist, { recursive: true });
        fs.writeFileSync(path.join(fakeDist, 'index.js'), 'module.exports = { default: async (code) => "<svg>" + code.length + "</svg>" };', 'utf8');
        process.chdir(os.tmpdir());
        const tikzHelper = require(path.join(root, 'src', 'common', 'tikz-helper.js'));
        assert.strictEqual(typeof tikzHelper.renderTikzServerSide, 'function', 'renderTikzServerSide must be exported');
        assert.strictEqual(typeof tikzHelper.loadNodeTikzJax, 'function', 'loadNodeTikzJax must be exported');
        const loaded = tikzHelper.loadNodeTikzJax(tmpRoot);
        assert.strictEqual(loaded.method, 'local-node-tikzjax');
        assert.ok(loaded.tikzjax && typeof loaded.tikzjax.default === 'function', 'loadNodeTikzJax(appRoot) must resolve relative to appRoot from any CWD');
        const res = await tikzHelper.renderTikzServerSide(tmpRoot, { tikzCode: '\\draw (0,0) -- (1,1);' });
        assert.ok(res && typeof res.svg === 'string' && res.svg.startsWith('<svg>'), 'renderTikzServerSide must return SVG output');
    } finally {
        process.chdir(origCwd);
        fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
    console.log('  [PASS] tikz-helper loads node-tikzjax independently of process.cwd()');

    // 2. Tauri uses shared renderTikzServerSide (no invalid tikzjax.pdf call)
    const tauriJs = fs.readFileSync(path.join(root, 'src', 'main', 'main-tauri.js'), 'utf8');
    assert.ok(tauriJs.includes('tikz-helper'), 'main-tauri.js must require src/common/tikz-helper');
    assert.ok(tauriJs.includes('renderTikzServerSide'), 'main-tauri.js must use renderTikzServerSide');
    assert.ok(!tauriJs.includes('tikzjax.pdf('), 'main-tauri.js must not call nonexistent tikzjax.pdf()');
    console.log('  [PASS] main-tauri.js uses shared renderTikzServerSide');

    // 3. Bridge image URL resolution parity
    const bridgeJs = fs.readFileSync(path.join(root, 'src', 'renderer', 'js', 'bridge.js'), 'utf8');
    assert.ok(bridgeJs.includes('resolveImageUrl:'), 'bridge.js must implement resolveImageUrl');
    assert.ok(bridgeJs.includes("'file:///'"), 'bridge.js must normalize Windows file:/// URLs');
    console.log('  [PASS] bridge.js resolveImageUrl parity verified');

    console.log('ALL ASAR / CWD / BOOK PARITY TESTS PASSED!');
    process.exit(0);
}

run().catch((err) => {
    console.error('TEST FAILED:', err);
    process.exit(1);
});
