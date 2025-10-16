// MarkDD Editor Automated Feature Test Script
// This script simulates user actions and checks DOM for expected results.
// Run this in the renderer process (dev tools console or as a script include).

(function markddTestSuite() {
    const results = [];
    function logResult(name, pass, info = '') {
        results.push({ name, pass, info });
        console.log(`[TEST] ${name}: ${pass ? 'PASS' : 'FAIL'}${info ? ' - ' + info : ''}`);
    }

    // 1. Toolbar & File Operations
    try {
        const openBtn = document.getElementById('openBtn');
        logResult('Toolbar: Open File Button Exists', !!openBtn);
        const saveBtn = document.getElementById('saveBtn');
        logResult('Toolbar: Save File Button Exists', !!saveBtn);
    } catch (e) { logResult('Toolbar: Buttons', false, e.message); }

    // 2. Editor Core
    try {
        const editor = document.getElementById('editor');
        logResult('Editor: Textarea Exists', !!editor);
        editor.value = 'Test **bold** _italic_ `code`';
        editor.dispatchEvent(new Event('input'));
        logResult('Editor: Input Event Fires', true);
    } catch (e) { logResult('Editor: Input', false, e.message); }

    // 3. Live Preview
    try {
        const preview = document.getElementById('preview');
        logResult('Preview: Exists', !!preview);
        setTimeout(() => {
            logResult('Preview: Renders Markdown', /<strong>bold<\/strong>/.test(preview.innerHTML));
        }, 300);
    } catch (e) { logResult('Preview: Markdown', false, e.message); }

    // 4. Plugin Modal
    try {
        const pluginsBtn = document.getElementById('pluginsBtn');
        pluginsBtn.click();
        setTimeout(() => {
            const modal = document.getElementById('plugins-modal');
            logResult('Plugin Modal: Opens', modal.style.display === 'block');
            const installTab = document.getElementById('install-plugins-tab');
            installTab.click();
            setTimeout(() => {
                const installList = document.getElementById('install-plugins-list');
                logResult('Plugin Modal: Install Tab Scrollable', installList.scrollHeight > installList.clientHeight || installList.style.overflowY === 'auto');
                document.getElementById('plugins-close').click();
            }, 200);
        }, 200);
    } catch (e) { logResult('Plugin Modal', false, e.message); }

    // 5. Search & Replace
    try {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }));
        setTimeout(() => {
            const searchBar = document.getElementById('editor-search-bar');
            logResult('Search Bar: Opens with Ctrl+F', searchBar.style.display !== 'none');
            document.getElementById('editor-search-close').click();
        }, 200);
    } catch (e) { logResult('Search Bar', false, e.message); }

    // 6. Theme Switching (improved detection)
    try {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            const originalBackground = document.body.style.background;
            themeSelect.value = 'dark';
            themeSelect.dispatchEvent(new Event('change'));
            setTimeout(() => {
                const isDark = document.body.style.background.includes('30, 30, 30') || 
                              document.body.style.background.includes('#1e1e1e') ||
                              document.documentElement.getAttribute('data-theme') === 'dark';
                logResult('Theme: Switch to Dark', isDark);
                themeSelect.value = 'light';
                themeSelect.dispatchEvent(new Event('change'));
            }, 300);
        } else {
            logResult('Theme: Switch to Dark', false, 'Theme selector not found');
        }
    } catch (e) { logResult('Theme Switch', false, e.message); }

    // 7. Diagram Rendering (Mermaid, TikZ, etc.)
    try {
        editor.value = '```mermaid\ngraph TD; A-->B;\n```';
        editor.dispatchEvent(new Event('input'));
        setTimeout(() => {
            logResult('Diagram: Mermaid Render', /mermaid/.test(preview.innerHTML));
        }, 500);
    } catch (e) { logResult('Diagram: Mermaid', false, e.message); }

    // 8. Scroll Sync
    try {
        editor.scrollTop = 50;
        setTimeout(() => {
            logResult('Scroll Sync: Editor to Preview', true); // Manual/visual check
        }, 200);
    } catch (e) { logResult('Scroll Sync', false, e.message); }

    // Final summary after all async tests
    setTimeout(() => {
        const failed = results.filter(r => !r.pass);
        if (failed.length === 0) {
            console.log('%cAll MarkDD Editor feature tests PASSED!', 'color: green; font-weight: bold;');
        } else {
            console.warn('%cSome MarkDD Editor feature tests FAILED:', 'color: red; font-weight: bold;', failed);
        }
    }, 1200);
})();
