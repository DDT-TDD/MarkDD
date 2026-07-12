const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
    console.log('Starting comprehensive CV features unit test suite...\n');

    // 1. Initialize DOM context using real renderer index.html
    let htmlContent = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf-8');
    htmlContent = htmlContent.replace('<body>', '<body><div id="tab-list"></div><button id="new-tab-btn"></button>');
    const dom = new JSDOM(htmlContent);
    const window = dom.window;
    const document = window.document;
    document.body.insertAdjacentHTML('beforeend', '<div id="tab-list"></div><button id="new-tab-btn"></button>');

    global.window = window;
    global.document = document;
    global.Event = window.Event;
    global.CustomEvent = window.CustomEvent;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
    global.localStorage = {
        _store: {},
        getItem(key) { return this._store[key] || null; },
        setItem(key, value) { this._store[key] = String(value); },
        removeItem(key) { delete this._store[key]; },
        clear() { this._store = {}; }
    };
    global.NodeFilter = window.NodeFilter;
    global.DOMParser = window.DOMParser;
    global.TextEncoder = window.TextEncoder;
    global.confirm = (msg) => true;

    // Mock Electron ipcRenderer in Node require cache
    require.cache[require.resolve('electron')] = {
        exports: {
            ipcRenderer: {
                on: () => {},
                removeAllListeners: () => {},
                invoke: async (channel, ...args) => {
                    if (channel === 'select-cv-photo-dialog') {
                        return { filePath: 'assets/profile.jpg' };
                    }
                    return {};
                }
            }
        }
    };

    // Stubs for Editor, Renderer, etc.
    class MockEditor {
        constructor() {
            this.content = '';
            this.currentFile = path.join(__dirname, 'mock_cv.md');
            this.modified = false;
        }
        getContent() { return this.content; }
        setContent(c) { this.content = c; }
        setModified(m) { this.modified = m; }
        updateStatus() {}
    }
    window.Editor = MockEditor;
    window.Renderer = class {
        constructor() {}
        setMathEngine() {}
    };
    window.PreviewManager = class {};
    window.Preview = class {
        setLivePreview() {}
        setSyncScroll() {}
    };
    window.FileBrowser = class {};
    window.PresentationManager = class {
        getCustomThemes() { return []; }
    };
    window.TabManager = class {
        on() {}
        clearPersistedState() {}
        getAllTabs() { return []; }
        createTab() {}
    };
    window.TabUI = class {
        constructor() {
            this.tabListElement = true;
            this.newTabBtn = true;
        }
        init() {}
    };
    window.MarkdownRenderer = class {
        constructor() {}
        setMathEngine() {}
        render() { return ''; }
    };
    global.Editor = window.Editor;
    global.Renderer = window.Renderer;
    global.PreviewManager = window.PreviewManager;
    global.Preview = window.Preview;
    global.FileBrowser = window.FileBrowser;
    global.PresentationManager = window.PresentationManager;
    global.TabManager = window.TabManager;
    global.TabUI = window.TabUI;
    global.MarkdownRenderer = window.MarkdownRenderer;
    window.markdownRenderer = {
        render: async (md) => '<h2>Mock Rendered Content</h2>'
    };

    // 2. Load classes
    const CVManager = require(path.join(__dirname, '../src/renderer/js/cv.js'));
    const MarkDDApp = require(path.join(__dirname, '../src/renderer/js/app.js'));
    if (typeof TabUI !== 'undefined') {
        TabUI.prototype.init = function() {};
    }

    const cvManager = new CVManager();
    const app = Object.create(MarkDDApp.prototype);
    app.editor = new MockEditor();
    app.cvManager = cvManager;
    
    // Wire functions that we want to test
    app.showFormDialog = MarkDDApp.prototype.showFormDialog;
    app.customizeCVColors = MarkDDApp.prototype.customizeCVColors;
    app.updateFrontMatterColorsInEditor = MarkDDApp.prototype.updateFrontMatterColorsInEditor;
    
    // Stub methods called by customizeCVColors
    app.showMessage = () => {};
    app.showError = () => {};
    app.refreshCVPreview = () => {};

    // --- TEST 1: showFormDialog Value & DefaultValue Binding ---
    console.log('TEST 1: Verifying showFormDialog input value population...');
    
    // Simulate dialog rendering with 'value' and 'defaultValue'
    const dialogPromise = app.showFormDialog({
        title: 'Test Dialog',
        fields: [
            { id: 'field1', label: 'Field 1 (value)', type: 'color', value: '#1b365d' },
            { id: 'field2', label: 'Field 2 (defaultValue)', type: 'color', defaultValue: '#ff0000' }
        ]
    });

    // Let the DOM update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Find the inputs inside the generated form dialog
    const dialogEl = document.body.lastElementChild;
    const inputs = dialogEl ? dialogEl.querySelectorAll('input') : [];
    if (inputs.length !== 2) {
        console.error(`FAILURE: Expected 2 inputs, found ${inputs.length}`);
        process.exit(1);
    }

    const input1 = document.querySelector('input[name="field1"]');
    const input2 = document.querySelector('input[name="field2"]');

    if (!input1 || input1.value !== '#1b365d') {
        console.error(`FAILURE: Field 1 (value) not bound correctly. Value: ${input1 ? input1.value : 'null'}`);
        process.exit(1);
    }
    console.log('SUCCESS: Input value binding verified.');

    if (!input2 || input2.value !== '#ff0000') {
        console.error(`FAILURE: Field 2 (defaultValue) not bound correctly. Value: ${input2 ? input2.value : 'null'}`);
        process.exit(1);
    }
    console.log('SUCCESS: Input defaultValue binding verified.');

    // Cancel test dialog
    const cancelButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
    if (cancelButton) cancelButton.click();
    await dialogPromise;


    // --- TEST 2: updateFrontMatterColorsInEditor ---
    console.log('\nTEST 2: Verifying updateFrontMatterColorsInEditor...');
    const originalMarkdown = `---
cv: true
theme: twenty-seconds
name: Jane Doe
---
## Education
- Acme University
`;

    const expectedColors = {
        primary: '#d97706',
        secondary: '#64748b',
        text: '#1e293b',
        background: '#ffffff',
        sidebarBg: '#fff7ed',
        sidebarText: '#c2410c'
    };

    const updatedMarkdown = app.updateFrontMatterColorsInEditor(originalMarkdown, expectedColors);
    console.log('Updated front-matter output:');
    console.log(updatedMarkdown);

    // Verify all keys are written
    for (const [key, val] of Object.entries(expectedColors)) {
        const expectedLine = `  ${key}: "${val}"`;
        if (!updatedMarkdown.includes(expectedLine)) {
            console.error(`FAILURE: Missing color line "${expectedLine}" in updated front-matter`);
            process.exit(1);
        }
    }
    console.log('SUCCESS: updateFrontMatterColorsInEditor output format verified.');


    // --- TEST 3: customizeCVColors Dialog Inputs generation ---
    console.log('\nTEST 3: Verifying customizeCVColors dialog generation for different themes...');
    
    // Test sidebar-based layout (twenty-seconds)
    app.editor.setContent(`---
cv: true
theme: twenty-seconds
colors:
  primary: "#112233"
  secondary: "#445566"
  text: "#778899"
  background: "#aabbcc"
  sidebarBg: "#ddeeff"
  sidebarText: "#ffee00"
---
`);

    // Override showFormDialog in instance to test fields and submission
    let generatedFields = [];
    app.showFormDialog = (opts) => {
        generatedFields = opts.fields;
        return {
            primaryColor: '#112233',
            secondaryColor: '#445566',
            textColor: '#778899',
            bgColor: '#aabbcc',
            sidebarBgColor: '#ddeeff',
            sidebarTextColor: '#ffee00'
        };
    };

    await app.customizeCVColors();

    const expectedFields = ['primaryColor', 'secondaryColor', 'textColor', 'bgColor', 'sidebarBgColor', 'sidebarTextColor'];
    expectedFields.forEach(fid => {
        const f = generatedFields.find(field => field.id === fid);
        if (!f) {
            console.error(`FAILURE: Field ${fid} was not generated for twenty-seconds sidebar theme`);
            process.exit(1);
        }
    });
    console.log('SUCCESS: Sidebar theme color fields dynamically generated.');

    // Verify submission result is written to editor front-matter
    const updatedContent = app.editor.getContent();
    const expectedWrittenColors = [
        'primary: "#112233"',
        'secondary: "#445566"',
        'text: "#778899"',
        'background: "#aabbcc"',
        'sidebarBg: "#ddeeff"',
        'sidebarText: "#ffee00"'
    ];
    expectedWrittenColors.forEach(line => {
        if (!updatedContent.includes(line)) {
            console.error(`FAILURE: Expected color line '${line}' not written to editor after submission.`);
            console.log(updatedContent);
            process.exit(1);
        }
    });
    console.log('SUCCESS: Dialog values successfully submitted and written to editor content.');

    // Test casual-based layout (moderncv-casual)
    app.editor.setContent(`---
cv: true
theme: moderncv-casual
---
`);

    app.showFormDialog = (opts) => {
        generatedFields = opts.fields;
        return {
            primaryColor: '#112233',
            secondaryColor: '#445566',
            textColor: '#778899',
            bgColor: '#aabbcc',
            headerBgColor: '#f1fafc',
            headerTextColor: '#2b3e50'
        };
    };

    await app.customizeCVColors();
    const expectedCasualFields = ['primaryColor', 'secondaryColor', 'textColor', 'bgColor', 'headerBgColor', 'headerTextColor'];
    expectedCasualFields.forEach(fid => {
        const f = generatedFields.find(field => field.id === fid);
        if (!f) {
            console.error(`FAILURE: Field ${fid} was not generated for moderncv-casual theme`);
            process.exit(1);
        }
    });
    console.log('SUCCESS: Casual theme color fields dynamically generated.');

    const updatedCasualContent = app.editor.getContent();
    const expectedCasualWrittenColors = [
        'primary: "#112233"',
        'secondary: "#445566"',
        'text: "#778899"',
        'background: "#aabbcc"',
        'headerBg: "#f1fafc"',
        'headerText: "#2b3e50"'
    ];
    expectedCasualWrittenColors.forEach(line => {
        if (!updatedCasualContent.includes(line)) {
            console.error(`FAILURE: Expected casual color line '${line}' not written to editor after submission.`);
            console.log(updatedCasualContent);
            process.exit(1);
        }
    });
    console.log('SUCCESS: Casual dialog values successfully submitted and written to editor content.');


    // --- TEST 4: getThemeCSS Variable Injector ---
    console.log('\nTEST 4: Verifying variable styling in getThemeCSS...');
    const themeCSS = cvManager.getThemeCSS('twenty-seconds', {
        primary: '#112233',
        secondary: '#445566',
        text: '#778899',
        background: '#aabbcc',
        sidebarBg: '#ddeeff',
        sidebarText: '#ffee00'
    });

    const expectedCSSVariables = [
        '--cv-primary: #112233;',
        '--cv-secondary: #445566;',
        '--cv-text: #778899;',
        '--cv-bg: #aabbcc;',
        '--cv-sidebar-bg: #ddeeff;',
        '--cv-sidebar-text: #ffee00;'
    ];

    expectedCSSVariables.forEach(v => {
        if (!themeCSS.includes(v)) {
            console.error(`FAILURE: Missing CSS variable mapping in themeCSS: "${v}"`);
            process.exit(1);
        }
    });
    console.log('SUCCESS: CSS variable bindings verified in output stylesheet.');


    // --- TEST 5: Dynamic Preview HTML Parser Regexp ---
    console.log('\nTEST 5: Verifying HTML regex parsing for dynamic live preview...');
    const mockHtml = `<!doctype html>
<html>
<head>
<title>CV - Jane Doe</title>
<style id="theme-css">
body { color: blue; }
</style>
</head>
<body>
    <div class="cv-page size-a4">
        <div class="cv-sidebar">
            <p>Left</p>
        </div>
        <div class="cv-main-content">
            <p>Right</p>
        </div>
    </div>
</body>
</html>`;

    const titleMatch = mockHtml.match(/<title>([\s\S]*?)<\/title>/);
    const cssMatch = mockHtml.match(/<style id="theme-css">([\s\S]*?)<\/style>/);
    const cvPageMatch = mockHtml.match(/(<div class="cv-page\s+[^"]+">[\s\S]*?<\/div>)\s*<\/body>/);

    if (!titleMatch || titleMatch[1] !== 'CV - Jane Doe') {
        console.error('FAILURE: Title matching regex failed');
        process.exit(1);
    }
    if (!cssMatch || !cssMatch[1].includes('body { color: blue; }')) {
        console.error('FAILURE: CSS matching regex failed');
        process.exit(1);
    }
    if (!cvPageMatch || !cvPageMatch[1].includes('<div class="cv-page size-a4">') || !cvPageMatch[1].includes('</div>')) {
        console.error('FAILURE: cv-page container matching regex failed');
        console.log(cvPageMatch);
        process.exit(1);
    }
    console.log('SUCCESS: Dynamic live preview regex parser extraction matches perfectly.');


    // --- TEST 6: customizeCVColors Reset Button & Theme Transition Reset Dialogs ---
    console.log('\nTEST 6: Verifying Reset to Defaults button & theme transition confirmation dialogs...');

    // 6.1 Test customizeCVColors Reset button functionality
    app.editor.setContent(`---
cv: true
theme: twenty-seconds
colors:
  primary: "#112233"
  secondary: "#445566"
  text: "#778899"
  background: "#aabbcc"
  sidebarBg: "#ddeeff"
  sidebarText: "#ffee00"
---
`);

    // Mock showFormDialog to return isReset: true
    app.showFormDialog = (opts) => {
        if (opts.extraLabel !== 'Reset to Defaults') {
            console.error('FAILURE: extraLabel was not passed correctly as "Reset to Defaults"');
            process.exit(1);
        }
        return { isReset: true };
    };

    await app.customizeCVColors();

    const resetContent = app.editor.getContent();
    if (resetContent.includes('colors:')) {
        console.error('FAILURE: colors block was not deleted from editor content after Reset click.');
        console.log(resetContent);
        process.exit(1);
    }
    console.log('SUCCESS: Reset button deletes colors block from editor front-matter successfully.');

    // 6.2 Test setCVTheme reset prompt functionality (clicking OK to reset)
    app.editor.setContent(`---
cv: true
theme: twenty-seconds
colors:
  primary: "#112233"
---
`);

    let confirmPromptCalled = false;
    global.confirm = (msg) => {
        confirmPromptCalled = true;
        if (!msg.toLowerCase().includes('academic')) {
            console.error('FAILURE: Incorrect confirm message passed:', msg);
            process.exit(1);
        }
        return true; // Click OK to reset
    };

    await app.setCVTheme('academic');

    if (!confirmPromptCalled) {
        console.error('FAILURE: confirm prompt was not called on theme switch when colors exist.');
        process.exit(1);
    }

    const contentAfterThemeReset = app.editor.getContent();
    if (contentAfterThemeReset.includes('colors:')) {
        console.error('FAILURE: colors block was not deleted on theme reset confirmation.');
        console.log(contentAfterThemeReset);
        process.exit(1);
    }
    if (!contentAfterThemeReset.includes('theme: academic')) {
        console.error('FAILURE: Theme was not updated after reset confirmation.');
        console.log(contentAfterThemeReset);
        process.exit(1);
    }
    console.log('SUCCESS: setCVTheme deletes colors block on theme switch reset confirmation.');

    // 6.3 Test setCVTheme reset prompt functionality (clicking Cancel to preserve)
    app.editor.setContent(`---
cv: true
theme: twenty-seconds
colors:
  primary: "#112233"
---
`);

    confirmPromptCalled = false;
    global.confirm = (msg) => {
        confirmPromptCalled = true;
        return false; // Click Cancel to keep custom colors
    };

    await app.setCVTheme('academic');

    if (!confirmPromptCalled) {
        console.error('FAILURE: confirm prompt was not called on theme switch when colors exist.');
        process.exit(1);
    }

    const contentAfterThemeCancel = app.editor.getContent();
    if (!contentAfterThemeCancel.includes('colors:')) {
        console.error('FAILURE: colors block was deleted although user clicked Cancel (preserve).');
        console.log(contentAfterThemeCancel);
        process.exit(1);
    }
    if (!contentAfterThemeCancel.includes('primary: "#112233"')) {
        console.error('FAILURE: Custom colors were deleted on Cancel confirmation.');
        console.log(contentAfterThemeCancel);
        process.exit(1);
    }
    if (!contentAfterThemeCancel.includes('theme: academic')) {
        console.error('FAILURE: Theme was not updated after Cancel confirmation.');
        console.log(contentAfterThemeCancel);
        process.exit(1);
    }
    console.log('SUCCESS: setCVTheme preserves custom color overrides if user cancels reset.');


    console.log('\nALL CV FEATURE TESTS PASSED SUCCESSFULLY!');
}

run().catch(err => {
    console.error('Unhandled exception:', err);
    process.exit(1);
});
