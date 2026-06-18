const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

async function main() {
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const window = dom.window;
    const document = window.document;

    // Attach globals that markdown-renderer expects
    global.window = window;
    global.document = document;
    global.NodeFilter = window.NodeFilter;
    global.DOMParser = window.DOMParser;
    global.TextEncoder = window.TextEncoder;
    global.localStorage = {
        getItem: function(key) { return null; },
        setItem: function(key, val) { return; },
        removeItem: function(key) { return; },
        clear: function() { return; }
    };
    Object.defineProperty(window, 'localStorage', {
        value: global.localStorage,
        writable: true,
        configurable: true
    });

    // Provide required libraries
    window.katex = require('katex');
    window.marked = require('marked');
    window.hljs = require('highlight.js');
    // Minimal mermaid stub to satisfy initialize call in renderer.init()
    window.mermaid = {
        initialize: function() { return; },
        render: async function(id, code) { return { svg: `<svg><text>${code}</text></svg>` }; }
    };

    // Read renderer source and evaluate inside the jsdom window context
    // Use the canonical source path under `src/renderer/js`
    const rendererPath = path.join(__dirname, '..', 'src', 'renderer', 'js', 'markdown-renderer.js');
    if (!fs.existsSync(rendererPath)) {
        console.error('Could not find markdown-renderer.js at', rendererPath);
        process.exit(1);
    }
    const src = fs.readFileSync(rendererPath, 'utf8');

    const context = vm.createContext(window);
    try {
        vm.runInContext(src, context, { filename: 'markdown-renderer.js' });
    } catch (e) {
        console.error('Error evaluating markdown-renderer.js:', e);
        process.exit(1);
    }

    const MarkdownRenderer = context.MarkdownRenderer || window.MarkdownRenderer;
    if (!MarkdownRenderer) {
        console.error('MarkdownRenderer class not found in evaluated context');
        process.exit(1);
    }

    const renderer = new MarkdownRenderer();
    // Attempt to load MathJax v4 (mathjax-full) into the jsdom window so
    // the renderer's MathJax-first paths are exercised. If mathjax is not
    // installed, continue without it (renderer will fall back to KaTeX).
    async function tryLoadMathJax() {
        try {
            // Load MathJax using the modular JS entry points (CommonJS-friendly)
            const {mathjax} = require('mathjax-full/js/mathjax.js');
            const {TeX} = require('mathjax-full/js/input/tex.js');
            const {SVG} = require('mathjax-full/js/output/svg.js');
            const {liteAdaptor} = require('mathjax-full/js/adaptors/liteAdaptor.js');
            const {RegisterHTMLHandler} = require('mathjax-full/js/handlers/html.js');

            const adaptor = liteAdaptor();
            RegisterHTMLHandler(adaptor);

            const tex = new TeX({packages: ['base', 'ams']});
            const svg = new SVG({fontCache: 'local'});

            // Attach a MathJax-like API expected by the renderer. We provide
            // a tex2svg function and a typesetPromise shim that does nothing
            // because we synchronously convert individual fragments here.
            window.MathJax = {
                tex2svg: (texString, options = {}) => {
                    const display = !!options.display;
                    const doc = mathjax.document('', {InputJax: tex, OutputJax: svg});
                    const node = doc.convert(texString, {display});
                    // Return an object with outerHTML and node to match renderer expectations
                    return { outerHTML: adaptor.outerHTML(node), node };
                },
                typesetPromise: async (elements) => {
                    // MathJax's real typesetPromise would process DOM elements.
                    // For our headless test harness we treat conversion as synchronous.
                    return Promise.resolve();
                },
                startup: { adaptor }
            };
            console.log('[render_test] mathjax-full loaded into jsdom window');
            return true;
        } catch (err) {
            console.warn('[render_test] mathjax-full not available; continuing without MathJax');
            window.MathJax = null;
            return false;
        }
    }

    try {
        await tryLoadMathJax();
        await renderer.init();
    } catch (e) {
        console.error('Renderer init failed:', e);
        process.exit(1);
    }

    // Choose a markdown test file from CLI arg or fallback to verification-test.md
    const cliPath = process.argv[2];
    let markdown;
    let inputPath = null;
    if (cliPath && fs.existsSync(cliPath)) {
        inputPath = cliPath;
        markdown = fs.readFileSync(cliPath, 'utf8');
    } else {
        const testMdPath = path.join(__dirname, '..', 'verification-test.md');
        if (fs.existsSync(testMdPath)) {
            inputPath = testMdPath;
            markdown = fs.readFileSync(testMdPath, 'utf8');
        } else {
            markdown = `# Test\nThis is inline math: $a^2 + b^2 = c^2$.\n\nAnd display math:\n$$\n\begin{align}\nE &= mc^2 \\ \nF &= ma\n\end{align}\n$$\n`;
        }
    }

    console.log('Rendering markdown (first 300 chars):', markdown.substring(0, 300));

    try {
        const html = await renderer.render(markdown);
        const base = inputPath ? path.basename(inputPath, path.extname(inputPath)) : 'output';
        const outPath = path.join(__dirname, `output-${base}.html`);
        fs.writeFileSync(outPath, html, 'utf8');
        console.log('Rendered HTML saved to:', outPath);
        console.log('Output snippet:\n', html.substring(0, 500));

        // Automated assertion: exported HTML must not contain MathJax error
        // fragments or unknown-environment messages. Fail fast if found.
        const lowered = html.toLowerCase();
        const hasMerror = lowered.indexOf('<merror') !== -1 || lowered.indexOf('unknown environment') !== -1;
        if (hasMerror) {
            console.error('Assertion failed: exported HTML contains MathJax merror or "Unknown environment" markers');
            console.error('Failing output file:', outPath);
            // Also write a diagnostic marker file next to output for easier discovery.
            try {
                fs.writeFileSync(path.join(__dirname, `render-failure-${base}.log`), html, 'utf8');
            } catch (e) {
                console.warn('Could not write failure log:', e);
            }
            process.exit(2);
        }

        // If the renderer recorded placeholder diagnostics (missing spans),
        // write them out for analysis so we can inspect exact contexts.
        try {
            const diagnostics = window._mathPlaceholderDiagnostics || [];
            const diagOut = path.join(__dirname, `placeholder-diagnostics-${base}.json`);
            fs.writeFileSync(diagOut, JSON.stringify(diagnostics, null, 2), 'utf8');
            console.log('Placeholder diagnostics saved to:', diagOut);
            if (diagnostics.length) console.log('Diagnostics sample:', diagnostics.slice(0, 5));
        } catch (e) {
            console.warn('Could not write placeholder diagnostics:', e);
        }
    } catch (e) {
        console.error('Render failed:', e);
        process.exit(1);
    }
}

main();
