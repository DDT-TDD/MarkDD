const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

(async function() {
    const dom = new JSDOM("<!doctype html><html><body><div id=\"container\"></div></body></html>");
    const window = dom.window;
    const document = window.document;

    global.window = window;
    global.document = document;
    global.NodeFilter = window.NodeFilter;
    global.DOMParser = window.DOMParser;
    global.TextEncoder = window.TextEncoder;
    global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
    Object.defineProperty(window, "localStorage", { value: global.localStorage, writable: true, configurable: true });

    window.katex = require("katex");
    window.marked = require("marked");
    window.hljs = require("highlight.js");
    window.mermaid = { initialize: () => {}, render: async (id, code) => ({ svg: `<svg>${code}</svg>` }) };

    const rendererPath = path.join(__dirname, "..", "src", "renderer", "js", "markdown-renderer.js");
    const src = fs.readFileSync(rendererPath, "utf8");
    const context = vm.createContext(window);
    vm.runInContext(src, context, { filename: "markdown-renderer.js" });

    const MarkdownRenderer = context.MarkdownRenderer || window.MarkdownRenderer;
    const renderer = new MarkdownRenderer();
    if (typeof renderer.init === "function") renderer.init();

    const tests = [
        {
            name: "Currency amounts ($50 and $100)",
            input: "The book costs $50 and the upgrade is $100.",
            mustNotContain: ["math-placeholder", "katex", "math-inline", "math-display"],
            mustContain: ["$50", "$100"]
        },
        {
            name: "Inline code with hyphens and slashes",
            input: "Run `npm run build:win` or check `src/renderer/js/app.js` with `markdd-editor`.",
            mustNotContain: ["math-placeholder", "katex", "math-inline", "math-display"],
            mustContain: ["<code>npm run build:win</code>", "<code>src/renderer/js/app.js</code>", "<code>markdd-editor</code>"]
        },
        {
            name: "Inline code with programming keywords (int, log, exp, sin)",
            input: "In C: `int x = 10;`, in JS: `console.log(x);`, in TS: `export const sin = 1;`.",
            mustNotContain: ["math-placeholder", "katex", "math-inline", "math-display"],
            mustContain: ["<code>int x = 10;</code>", "<code>console.log(x);</code>"]
        },
        {
            name: "Real inline LaTeX math ($E = mc^2$)",
            input: "Einstein stated that $E = mc^2$ and Euler gave $e^{i\\pi} + 1 = 0$.",
            mustContain: ["math-inline", "katex"],
            mustNotContain: ["MATH_INLINE_PLACEHOLDER"]
        },
        {
            name: "Real display LaTeX math ($$\\int_0^\\infty e^{-x} dx = 1$$)",
            input: "$$\\int_0^\\infty e^{-x} dx = 1$$",
            mustContain: ["math-display", "katex"],
            mustNotContain: ["MATH_DISPLAY_PLACEHOLDER"]
        }
    ];

    let failed = 0;
    for (const t of tests) {
        const res = await renderer.render(t.input);
        const html = typeof res === "string" ? res : (res && res.html ? res.html : String(res));
        let pass = true;
        if (t.mustContain) {
            for (const str of t.mustContain) {
                if (!html.includes(str)) {
                    console.error(`FAIL: [${t.name}] Expected to contain: "${str}"`);
                    console.error("Actual HTML:", html);
                    pass = false;
                    failed++;
                    break;
                }
            }
        }
        if (t.mustNotContain) {
            for (const str of t.mustNotContain) {
                if (html.includes(str)) {
                    console.error(`FAIL: [${t.name}] Must NOT contain: "${str}"`);
                    console.error("Actual HTML:", html);
                    pass = false;
                    failed++;
                    break;
                }
            }
        }
        if (pass) {
            console.log(`PASS: [${t.name}]`);
        }
    }

    if (failed > 0) {
        console.error(`\n${failed} test(s) failed.`);
        process.exit(1);
    } else {
        console.log("\nALL MATH RENDERING AUDIT TESTS PASSED WITH ZERO REGRESSIONS!");
    }
})();
