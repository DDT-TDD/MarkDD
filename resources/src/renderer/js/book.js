const BOOK_PREVIEW_BASE_CSS = `
:root {
    --layout-sidebar-width: 320px;
    --book-font: 'Inter', 'Segoe UI', sans-serif;
    --heading-font: 'Space Grotesk', 'Inter', sans-serif;
    --book-background: #05060c;
    --main-background: #0d0f1a;
    --book-foreground: #f7f7ff;
    --sidebar-background: #070713;
    --sidebar-border: rgba(255, 255, 255, 0.08);
    --sidebar-text: #b7bce0;
    --card-background: rgba(10,12,18,0.85);
    --card-text: #f7f7ff;
    --accent: #8f7efe;
    --link-color: #e5e7ff;
    --muted-color: rgba(255,255,255,0.75);
    --search-background: rgba(255,255,255,0.08);
    --border-radius: 24px;
}

* { box-sizing: border-box; }

body.book-export {
    margin: 0;
    min-height: 100vh;
    background: var(--book-background);
    color: var(--book-foreground);
    font-family: var(--book-font);
}

body.book-export .book-shell {
    display: grid;
    grid-template-columns: var(--layout-sidebar-width) 1fr;
}

body.book-export a { color: var(--link-color); }

.book-sidebar {
    background: var(--sidebar-background);
    padding: 32px;
    border-right: 1px solid var(--sidebar-border);
    overflow-y: auto;
    color: var(--sidebar-text);
}

.book-main {
    padding: 48px 64px;
    background: var(--main-background);
}

.book-meta-card {
    background: rgba(0, 0, 0, 0.08);
    border: 1px solid var(--sidebar-border);
    border-radius: 18px;
    padding: 32px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.1);
}

.book-tag {
    text-transform: uppercase;
    letter-spacing: 0.25em;
    font-size: 0.7rem;
    color: var(--accent);
    margin: 0 0 16px 0;
}

.book-title {
    font-size: 2rem;
    margin: 0 0 8px 0;
    color: var(--book-foreground);
}

.book-author {
    font-size: 1rem;
    margin: 0;
    color: var(--muted-color);
}

.book-description {
    margin-top: 18px;
    line-height: 1.6;
    color: var(--muted-color);
}

.book-toc {
    margin-top: 48px;
}

.book-toc h2 {
    font-size: 1rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted-color);
    margin-bottom: 16px;
}

.toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.toc-item {
    margin-bottom: 12px;
}

.toc-item > a {
    color: var(--book-foreground);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 12px;
}

.toc-number {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: rgba(255,255,255,0.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
}

.toc-sublist {
    list-style: none;
    padding-left: 36px;
    margin: 6px 0;
}

.toc-subitem {
    margin: 4px 0;
}

.toc-subitem a {
    color: var(--muted-color);
    text-decoration: none;
    font-size: 0.85rem;
}

.book-meta h1 {
    margin: 0 0 12px 0;
    font-size: 2rem;
    font-family: var(--heading-font);
}

.book-meta p { margin: 0 0 8px 0; color: var(--muted-color); }

.book-nav {
    list-style: none;
    padding-left: 0;
    margin: 24px 0 0 0;
}

.book-nav li { margin-bottom: 8px; }

.book-nav a {
    color: var(--link-color);
    text-decoration: none;
    font-weight: 500;
}

.book-nav a:hover { color: var(--accent); }

.book-search { margin-top: 24px; }

.book-search input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--sidebar-border);
    background: var(--search-background);
    color: var(--book-foreground);
}

#book-search-results { margin-top: 12px; font-size: 0.9rem; }

.book-chapter {
    background: var(--card-background);
    color: var(--card-text);
    border-radius: var(--border-radius);
    padding: 36px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.12);
}

.book-chapter-header {
    border-bottom: 1px solid rgba(0,0,0,0.08);
    margin-bottom: 32px;
    padding-bottom: 24px;
}

.chapter-index {
    text-transform: uppercase;
    letter-spacing: 0.35em;
    font-size: 0.75rem;
    color: var(--accent);
    margin: 0 0 12px 0;
}

.book-chapter-header h2 {
    font-size: 2rem;
    margin: 0;
}

.book-chapter-content {
    line-height: 1.75;
    color: var(--card-text);
}

.book-chapter-content h2,
.book-chapter-content h3,
.book-chapter-content h4 {
    color: var(--card-text);
    margin-top: 2.5em;
}

.book-chapter-content img {
    display: block;
    margin-left: auto;
    margin-right: auto;
    max-width: 100%;
    height: auto;
}

.book-chapter-content table {
    margin-left: auto !important;
    margin-right: auto !important;
    border-collapse: collapse;
    display: table;
}

.book-chapter-content table caption,
.book-chapter-content caption {
    text-align: center;
    caption-side: bottom;
    padding: 0.5em;
    font-style: italic;
    font-size: 0.9em;
}

.book-chapter-content figure { text-align: center; margin: 1.5em auto; }
.book-chapter-content figcaption { text-align: center; font-style: italic; margin-top: 0.5em; }

.book-chapter-content pre {
    background: rgba(0,0,0,0.6);
    border-radius: 12px;
    padding: 16px;
    overflow-x: auto;
}

.book-chapter-content blockquote {
    border-left: 4px solid var(--accent);
    padding-left: 18px;
    color: var(--muted-color);
    font-style: italic;
}

.chapter-card {
    background: var(--card-background);
    border: 1px solid var(--sidebar-border);
    padding: 24px;
    border-radius: 18px;
    margin-bottom: 16px;
}

.book-toc-empty {
    color: var(--muted-color);
    font-size: 0.9rem;
}

@media (max-width: 1080px) {
    body.book-export .book-shell { grid-template-columns: 1fr; }
    .book-sidebar { border-right: none; border-bottom: 1px solid var(--sidebar-border); }
    .book-main { padding: 32px 24px; }
}
`;

const BOOK_PREVIEW_STYLE_PRESETS = {
    dark: {
        key: 'dark',
        css: `
body.book-export.style-dark {
    --book-font: 'Inter', 'Segoe UI', sans-serif;
    --heading-font: 'Space Grotesk', 'Inter', sans-serif;
    --book-background: #05060c;
    --main-background: #05060c;
    --book-foreground: #f7f7ff;
    --sidebar-background: #070713;
    --sidebar-border: rgba(255,255,255,0.08);
    --sidebar-text: #b7bce0;
    --card-background: rgba(10,12,18,0.85);
    --card-text: #f7f7ff;
    --accent: #8f7efe;
    --link-color: #e5e7ff;
    --muted-color: rgba(247,247,255,0.7);
    --search-background: rgba(0,0,0,0.25);
}
        `
    },
    classic: {
        key: 'classic',
        css: `
body.book-export.style-classic {
    --layout-sidebar-width: 300px;
    --book-font: 'Literata', 'Georgia', serif;
    --heading-font: 'Playfair Display', 'Georgia', serif;
    --book-background: #f7f4ed;
    --main-background: #faf7ef;
    --book-foreground: #2a1d0f;
    --sidebar-background: #f0e8d9;
    --sidebar-border: rgba(64,40,24,0.12);
    --sidebar-text: #5c422c;
    --card-background: #ffffff;
    --card-text: #1f140b;
    --accent: #c77b30;
    --link-color: #8a4b12;
    --muted-color: rgba(47,34,24,0.85);
    --search-background: rgba(255,255,255,0.8);
    --border-radius: 18px;
}

body.book-export.style-classic .book-main {
    background-image: linear-gradient(120deg, rgba(255,255,255,0.7), rgba(255,255,255,0.2));
}

body.book-export.style-classic .book-chapter {
    border: 1px solid rgba(47,34,24,0.08);
    box-shadow: 0 24px 42px rgba(79, 63, 40, 0.16);
}

body.book-export.style-classic .book-chapter-content p:first-of-type::first-letter {
    font-size: 3.2rem;
    font-weight: 600;
    float: left;
    padding-right: 10px;
    line-height: 1;
}
        `
    },
    wiki: {
        key: 'wiki',
        css: `
body.book-export.style-wiki {
    --layout-sidebar-width: 260px;
    --book-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --heading-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --book-background: #f6f8fa;
    --main-background: #ffffff;
    --book-foreground: #1f2328;
    --sidebar-background: #f1f4f8;
    --sidebar-border: rgba(15,23,42,0.08);
    --sidebar-text: #4b5563;
    --card-background: #ffffff;
    --card-text: #111827;
    --accent: #0969da;
    --link-color: #0969da;
    --muted-color: rgba(71,85,105,0.9);
    --search-background: #ffffff;
    --border-radius: 12px;
}

body.book-export.style-wiki .book-sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    border-right: 1px solid rgba(15,23,42,0.08);
}

body.book-export.style-wiki .book-main {
    padding: 32px 48px;
}

body.book-export.style-wiki .book-chapter {
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: none;
}
        `
    },
    helpdesk: {
        key: 'helpdesk',
        css: `
body.book-export.style-helpdesk {
    --layout-sidebar-width: 280px;
    --book-font: 'Tahoma', 'Segoe UI', sans-serif;
    --heading-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --book-background: #e6edf9;
    --main-background: #ffffff;
    --book-foreground: #102a43;
    --sidebar-background: #fdfefe;
    --sidebar-border: rgba(16,42,67,0.12);
    --sidebar-text: #243b53;
    --card-background: #ffffff;
    --card-text: #102a43;
    --accent: #1b5fbf;
    --link-color: #0f62fe;
    --muted-color: rgba(16,42,67,0.7);
    --search-background: #f1f5fb;
    --border-radius: 10px;
}

body.book-export.style-helpdesk .book-sidebar {
    background: linear-gradient(180deg, #fefefe 0%, #eef3fb 100%);
}

body.book-export.style-helpdesk .book-nav {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    padding-top: 16px;
}

body.book-export.style-helpdesk .book-nav a {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
}

body.book-export.style-helpdesk .book-nav a::before {
    content: '\\25B8';
    font-size: 0.8rem;
    color: #1b5fbf;
}

body.book-export.style-helpdesk .book-main {
    padding: 32px 48px;
    background: #ffffff;
    box-shadow: inset 0 1px 0 rgba(15,23,42,0.08);
}

body.book-export.style-helpdesk .book-chapter {
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: none;
}

body.book-export.style-helpdesk .book-chapter header p {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(16,42,67,0.65);
}
        `
    },
    mit: {
        key: 'mit',
        css: `
body.book-export.style-mit {
    --book-font: 'Georgia', serif;
    --heading-font: 'Inter', 'Segoe UI', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #111111;
    --sidebar-background: #f8f9fa;
    --sidebar-border: rgba(0,0,0,0.08);
    --sidebar-text: #333333;
    --card-background: #ffffff;
    --card-text: #111111;
    --accent: #A31F34;
    --link-color: #A31F34;
    --muted-color: #555555;
    --search-background: #e9ecef;
    --border-radius: 8px;
}
body.book-export.style-mit .book-chapter-content {
    line-height: 1.6;
}
        `
    },
    harvard: {
        key: 'harvard',
        css: `
body.book-export.style-harvard {
    --book-font: 'Garamond', 'Georgia', serif;
    --heading-font: 'Georgia', serif;
    --book-background: #faf8f5;
    --main-background: #faf8f5;
    --book-foreground: #1e120c;
    --sidebar-background: #f2ede4;
    --sidebar-border: rgba(165,28,48,0.15);
    --sidebar-text: #4a2f22;
    --card-background: #ffffff;
    --card-text: #1e120c;
    --accent: #A51C30;
    --link-color: #A51C30;
    --muted-color: #5c554e;
    --search-background: #ffffff;
    --border-radius: 6px;
}
body.book-export.style-harvard .book-chapter-content {
    line-height: 1.8;
    text-align: justify;
}
        `
    },
    stanford: {
        key: 'stanford',
        css: `
body.book-export.style-stanford {
    --book-font: 'Arial', 'Helvetica Neue', sans-serif;
    --heading-font: 'Arial', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #222222;
    --sidebar-background: #f4f4f4;
    --sidebar-border: rgba(140,21,21,0.15);
    --sidebar-text: #333333;
    --card-background: #ffffff;
    --card-text: #222222;
    --accent: #8C1515;
    --link-color: #8C1515;
    --muted-color: #666666;
    --search-background: #e6e6e6;
    --border-radius: 4px;
}
body.book-export.style-stanford .book-chapter-content {
    line-height: 1.8;
}
        `
    },
    oxford: {
        key: 'oxford',
        css: `
body.book-export.style-oxford {
    --book-font: 'Times New Roman', 'Georgia', serif;
    --heading-font: 'Times New Roman', serif;
    --book-background: #fbfbfb;
    --main-background: #fbfbfb;
    --book-foreground: #0b1326;
    --sidebar-background: #f0f2f5;
    --sidebar-border: rgba(0,33,71,0.15);
    --sidebar-text: #1d2b45;
    --card-background: #ffffff;
    --card-text: #0b1326;
    --accent: #002147;
    --link-color: #002147;
    --muted-color: #555c6b;
    --search-background: #ffffff;
    --border-radius: 4px;
}
body.book-export.style-oxford .book-chapter-content {
    line-height: 2.0;
    text-align: justify;
}
        `
    },
    cambridge: {
        key: 'cambridge',
        css: `
body.book-export.style-cambridge {
    --book-font: 'Palatino Linotype', 'Book Antiqua', 'Palatino', serif;
    --heading-font: 'Palatino', serif;
    --book-background: #fafcfa;
    --main-background: #fafcfa;
    --book-foreground: #101c18;
    --sidebar-background: #ebf2ee;
    --sidebar-border: rgba(163,193,173,0.3);
    --sidebar-text: #2c3d36;
    --card-background: #ffffff;
    --card-text: #101c18;
    --accent: #00b2a9;
    --link-color: #008f87;
    --muted-color: #53635d;
    --search-background: #ffffff;
    --border-radius: 6px;
}
body.book-export.style-cambridge .book-chapter-content {
    line-height: 1.75;
    text-align: justify;
}
        `
    },
    uio: {
        key: 'uio',
        css: `
body.book-export.style-uio {
    --book-font: 'Georgia', 'Times New Roman', serif;
    --heading-font: 'Arial', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #1a1a1a;
    --sidebar-background: #f3f3f3;
    --sidebar-border: rgba(0,0,0,0.08);
    --sidebar-text: #2d2d2d;
    --card-background: #ffffff;
    --card-text: #1a1a1a;
    --accent: #D81E05;
    --link-color: #D81E05;
    --muted-color: #626262;
    --search-background: #e6e6e6;
    --border-radius: 6px;
}
body.book-export.style-uio .book-chapter-content {
    line-height: 1.6;
}
        `
    },
    unibo: {
        key: 'unibo',
        css: `
body.book-export.style-unibo {
    --book-font: 'Garamond', 'Georgia', serif;
    --heading-font: 'Garamond', serif;
    --book-background: #fdfcf7;
    --main-background: #fdfcf7;
    --book-foreground: #221111;
    --sidebar-background: #f7efe2;
    --sidebar-border: rgba(158,27,38,0.15);
    --sidebar-text: #5c3b3b;
    --card-background: #ffffff;
    --card-text: #221111;
    --accent: #9E1B26;
    --link-color: #9E1B26;
    --muted-color: #665c5c;
    --search-background: #ffffff;
    --border-radius: 4px;
}
body.book-export.style-unibo .book-chapter-content {
    line-height: 1.8;
    text-align: justify;
}
        `
    },
    polimi: {
        key: 'polimi',
        css: `
body.book-export.style-polimi {
    --book-font: 'Inter', 'Segoe UI', sans-serif;
    --heading-font: 'Inter', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #202020;
    --sidebar-background: #f0f4f8;
    --sidebar-border: rgba(0,75,135,0.12);
    --sidebar-text: #203a50;
    --card-background: #ffffff;
    --card-text: #202020;
    --accent: #004B87;
    --link-color: #004B87;
    --muted-color: #5c6c7b;
    --search-background: #e2ecf5;
    --border-radius: 6px;
}
body.book-export.style-polimi .book-chapter-content {
    line-height: 1.6;
}
        `
    },
    eth: {
        key: 'eth',
        css: `
body.book-export.style-eth {
    --book-font: 'Helvetica Neue', 'Arial', sans-serif;
    --heading-font: 'Helvetica Neue', Arial, sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #111111;
    --sidebar-background: #f9f9f9;
    --sidebar-border: rgba(0,0,0,0.1);
    --sidebar-text: #333333;
    --card-background: #ffffff;
    --card-text: #111111;
    --accent: #333333;
    --link-color: #0070babd;
    --muted-color: #666666;
    --search-background: #f0f0f0;
    --border-radius: 0px;
}
body.book-export.style-eth .book-chapter-content {
    line-height: 1.5;
}
        `
    },
    imperial: {
        key: 'imperial',
        css: `
body.book-export.style-imperial {
    --book-font: 'Georgia', serif;
    --heading-font: 'Trebuchet MS', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #111111;
    --sidebar-background: #f4f6f9;
    --sidebar-border: rgba(0,61,124,0.12);
    --sidebar-text: #1d334a;
    --card-background: #ffffff;
    --card-text: #111111;
    --accent: #003D7C;
    --link-color: #003D7C;
    --muted-color: #555555;
    --search-background: #e6ebf2;
    --border-radius: 4px;
}
body.book-export.style-imperial .book-chapter-content {
    line-height: 1.75;
}
        `
    },
    standard: {
        key: 'standard',
        css: `
body.book-export.style-standard {
    --book-font: 'Times New Roman', serif;
    --heading-font: 'Arial', sans-serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #000000;
    --sidebar-background: #f5f5f5;
    --sidebar-border: #dddddd;
    --sidebar-text: #333333;
    --card-background: #ffffff;
    --card-text: #000000;
    --accent: #333333;
    --link-color: #0000ff;
    --muted-color: #444444;
    --search-background: #eeeeee;
    --border-radius: 4px;
}
body.book-export.style-standard .book-chapter-content {
    line-height: 2.0;
}
        `
    }
};

class BookManager {
    constructor(options = {}) {
        this.renderer = new MarkdownRenderer();
        this.fs = null;
        this.path = null;
        this.yaml = null;
        this.createExportDocument = options.createExportDocument || null;
        this.sanitizeExport = options.sanitizeExport || null;
        this.defaultLanguage = 'en';
        this.app = options.app || null;
        this.ipcRenderer = null;
        this.shell = null;
        this.lastBookRoot = localStorage.getItem('markdd-book-root') || null;
        this.watchPreference = localStorage.getItem('markdd-book-watch') !== 'false';
        this.activeServe = null;
    }

    setApp(app) {
        this.app = app;
    }

    getIpc() {
        if (this.ipcRenderer || typeof require === 'undefined') {
            return this.ipcRenderer;
        }
        try {
            const electron = require('electron');
            this.ipcRenderer = electron.ipcRenderer;
            this.shell = electron.shell;
        } catch (error) {
            console.warn('[BookManager] ipcRenderer unavailable:', error.message || error);
            this.ipcRenderer = null;
        }
        return this.ipcRenderer;
    }

    notify(message) {
        if (this.app && typeof this.app.showMessage === 'function') {
            this.app.showMessage(message);
        } else {
            console.log('[BookManager]', message);
        }
    }

    notifyError(message) {
        if (this.app && typeof this.app.showError === 'function') {
            this.app.showError(message);
        } else {
            console.error('[BookManager]', message);
            alert(message);
        }
    }

    rememberBookRoot(dir) {
        if (!dir) {
            return null;
        }
        this.lastBookRoot = dir;
        try {
            localStorage.setItem('markdd-book-root', dir);
        } catch (error) {
            console.warn('[BookManager] Failed to persist book root:', error.message || error);
        }
        return dir;
    }

    getStoredBookRoot() {
        return this.lastBookRoot;
    }

    setWatchPreference(enabled) {
        this.watchPreference = !!enabled;
        try {
            localStorage.setItem('markdd-book-watch', enabled ? 'true' : 'false');
        } catch (error) {
            console.warn('[BookManager] Failed to persist watch preference:', error.message || error);
        }
    }

    isWatchEnabled() {
        return this.watchPreference;
    }

    async promptForDirectory(title, allowCreate = true) {
        const ipc = this.getIpc();
        if (!ipc) {
            this.notifyError('Electron IPC unavailable for folder selection.');
            return null;
        }
        const result = await ipc.invoke('book-select-directory', {
            title,
            allowCreate
        });
        if (result?.canceled || !result?.path) {
            return null;
        }
        return result.path;
    }

    async promptForSaveFile({ title, defaultName, filters }) {
        const ipc = this.getIpc();
        if (!ipc) {
            this.notifyError('Electron IPC unavailable for save dialog.');
            return null;
        }
        const result = await ipc.invoke('book-save-dialog', {
            title,
            defaultName,
            filters
        });
        if (result?.canceled || !result?.filePath) {
            return null;
        }
        return result.filePath;
    }

    revealPath(targetPath) {
        if (!targetPath || !this.shell) {
            return;
        }
        if (typeof this.shell.openPath === 'function') {
            this.shell.openPath(targetPath);
        } else if (typeof this.shell.showItemInFolder === 'function') {
            this.shell.showItemInFolder(targetPath);
        }
    }

    getActiveFileDirectory() {
        if (!this.app || !this.app.tabManager) {
            return null;
        }
        const activeTab = this.app.tabManager.getActiveTab ? this.app.tabManager.getActiveTab() : null;
        if (!activeTab || !activeTab.filepath) {
            return null;
        }
        const pathModule = this.getPathModule();
        return pathModule ? pathModule.dirname(activeTab.filepath) : null;
    }

    findBookRootFromDirectory(startDir) {
        const fs = this.getFsModule();
        const pathModule = this.getPathModule();
        if (!fs || !pathModule || !startDir) {
            return null;
        }
        let current = startDir;
        while (current && current !== pathModule.dirname(current)) {
            const configPath = pathModule.join(current, 'book.config.json');
            const summaryPath = pathModule.join(current, 'SUMMARY.md');
            if (fs.existsSync(configPath) || fs.existsSync(summaryPath)) {
                return current;
            }
            current = pathModule.dirname(current);
        }
        return null;
    }

    async resolveBookRoot(options = {}) {
        const fs = this.getFsModule();
        const pathModule = this.getPathModule();
        if (!fs || !pathModule) {
            this.notifyError('File system APIs unavailable for book operations.');
            return null;
        }

        if (options.rootDir) {
            return this.rememberBookRoot(options.rootDir);
        }

        const activeDir = this.getActiveFileDirectory();
        const detected = this.findBookRootFromDirectory(activeDir);
        if (detected) {
            return this.rememberBookRoot(detected);
        }

        if (this.lastBookRoot) {
            const configPath = pathModule.join(this.lastBookRoot, 'book.config.json');
            if (fs.existsSync(configPath)) {
                return this.lastBookRoot;
            }
        }

        if (options.prompt === false) {
            return null;
        }

        const selected = await this.promptForDirectory('Select Book Project Folder');
        if (!selected) {
            return null;
        }
        return this.rememberBookRoot(selected);
    }

    async openFileInEditor(filePath) {
        const fs = this.getFsModule();
        if (!fs) {
            this.notifyError('File system unavailable');
            return;
        }
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            if (this.app && typeof this.app.openFile === 'function') {
                await this.app.openFile(filePath, content, false);
                this.notify(`Opened ${filePath}`);
            } else {
                this.notify(`Loaded ${filePath}`);
            }
        } catch (error) {
            this.notifyError(`Failed to open ${filePath}: ${error.message || error}`);
        }
    }

    async newBookProject() {
        const targetDir = await this.promptForDirectory('Select folder for new book project');
        if (!targetDir) {
            this.notify('Book project creation cancelled');
            return;
        }
        const ipc = this.getIpc();
        if (!ipc) {
            return;
        }
        const result = await ipc.invoke('book-init-project', { targetDir });
        if (!result || !result.success) {
            this.notifyError(result?.error || 'Failed to initialize book project');
            return;
        }
        this.rememberBookRoot(targetDir);
        this.notify(`Book project ready at ${targetDir}`);
        if (result.data?.summaryPath) {
            await this.openFileInEditor(result.data.summaryPath);
        }
    }

    async openSummaryFile() {
        const root = await this.resolveBookRoot();
        if (!root) {
            this.notify('Select or create a book project first.');
            return;
        }
        const summaryPath = this.getPathModule().join(root, 'SUMMARY.md');
        await this.openFileInEditor(summaryPath);
    }

    async openConfigFile() {
        const root = await this.resolveBookRoot();
        if (!root) {
            this.notify('Select or create a book project first.');
            return;
        }
        const configPath = this.getPathModule().join(root, 'book.config.json');
        await this.openFileInEditor(configPath);
    }

    async buildStaticSite(options = {}) {
        const root = await this.resolveBookRoot();
        if (!root) {
            return;
        }
        const ipc = this.getIpc();
        if (!ipc) {
            return;
        }
        const mathEngine = this.app?.currentMathEngine || 'mathjax';
        const mergedOptions = { mathEngine, ...options };
        const result = await ipc.invoke('book-build', { rootDir: root, options: mergedOptions });
        if (!result || !result.success) {
            this.notifyError(result?.error || 'Failed to build book');
            return;
        }
        this.notify(`Book HTML exported to ${result.outputDir}`);
        this.revealPath(result.outputDir);
    }

    async exportBookPdf() {
        const root = await this.resolveBookRoot();
        if (!root) {
            return;
        }
        const outputPath = await this.promptForSaveFile({
            title: 'Export Book as PDF',
            defaultName: 'book.pdf',
            filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (!outputPath) {
            return;
        }
        const ipc = this.getIpc();
        const mathEngine = this.app?.currentMathEngine || 'mathjax';
        const result = await ipc.invoke('book-export-pdf', {
            rootDir: root,
            outputPath,
            options: { mathEngine }
        });
        if (!result || !result.success) {
            this.notifyError(result?.error || 'Failed to export book PDF');
            return;
        }
        this.notify(`Book PDF saved to ${outputPath}`);
        this.revealPath(outputPath);
    }

    async serveBook() {
        const root = await this.resolveBookRoot();
        if (!root) {
            return;
        }
        const ipc = this.getIpc();
        if (!ipc) {
            return;
        }
        const mathEngine = this.app?.currentMathEngine || 'mathjax';
        const result = await ipc.invoke('book-serve', {
            rootDir: root,
            watch: this.isWatchEnabled(),
            options: { mathEngine }
        });
        if (!result || !result.success) {
            this.notifyError(result?.error || 'Failed to start local book server');
            return;
        }
        const previewUrl = `http://localhost:${result.port}`;
        this.activeServe = { ...result, url: previewUrl };
        this.notify(`Serving book at ${previewUrl}`);

        if (previewUrl) {
            let opened = false;
            if (this.shell?.openExternal) {
                try {
                    this.shell.openExternal(previewUrl);
                    opened = true;
                } catch (error) {
                    console.warn('[BookManager] Failed to open preview externally:', error.message || error);
                }
            }
            if (!opened) {
                window.open(previewUrl, '_blank', 'noopener');
            }
        }

        if (this.app && typeof this.app.activateBookLivePreview === 'function') {
            this.app.activateBookLivePreview(previewUrl);
        }
    }

    async stopServingBook() {
        if (!this.activeServe) {
            this.notify('Book server is not running');
            return;
        }
        const ipc = this.getIpc();
        const result = await ipc.invoke('book-stop-server');
        if (!result || !result.success) {
            this.notifyError(result?.error || 'Failed to stop book server');
            return;
        }
        this.activeServe = null;
        this.notify('Book server stopped');
    }

    composeDocument(book, options = {}) {
        this.currentBookData = book;
        const chaptersHtml = book.chapters.map(ch => this.renderChapterBlock(ch)).join('\n');
        const tocHtml = this.renderTocList(book.toc);
        const authorVal = book.metadata.author || (book.metadata.authors && book.metadata.authors.join(', ')) || '';

        const content = `
<div class="book-shell">
    <aside class="book-sidebar">
        <div class="book-meta-card">
            <p class="book-tag">${this.escapeHtml(book.config.type || 'Book')}</p>
            <h1 class="book-title">${this.escapeHtml(book.metadata.title || 'Untitled')}</h1>
            <p class="book-author">By ${this.escapeHtml(authorVal)}</p>
            ${book.metadata.description ? `<p class="book-description">${this.escapeHtml(book.metadata.description)}</p>` : ''}
        </div>
        <nav class="book-toc">
            <h2>Table of Contents</h2>
            ${tocHtml}
        </nav>
    </aside>
    <main class="book-main">
        ${chaptersHtml}
    </main>
</div>
        `;

        const baseDoc = this.getBaseDocument(content, book.metadata.title);
        const styledDoc = this.injectBookStyles(baseDoc);

        if (options.pdf) {
            const pdfPrintStyle = `
<style>
    @media print {
        body.book-export {
            background: #ffffff !important;
            color: #000000 !important;
        }
        .book-sidebar {
            display: none !important;
        }
        body.book-export .book-shell {
            display: block !important;
            grid-template-columns: none !important;
        }
        .book-main {
            padding: 0 !important;
            background: none !important;
        }
        .book-chapter {
            page-break-after: always !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 0 2cm 0 !important;
            background: none !important;
            color: #000000 !important;
        }
    }
</style>
            `;
            if (styledDoc.includes('</head>')) {
                return styledDoc.replace('</head>', `${pdfPrintStyle}</head>`);
            }
            return `${pdfPrintStyle}${styledDoc}`;
        }

        return styledDoc;
    }

    async exportHTML({ markdown, context = {}, renderOptions = {} }) {
        const book = await this.compileBook({ markdown, context, renderOptions });
        const documentHtml = this.composeDocument(book);
        const sanitized = this.sanitize(documentHtml);

        if (typeof require === 'undefined') {
            return sanitized;
        }

        const { ipcRenderer } = require('electron');
        const fileName = this.makeFileName(book.metadata.title || context.displayName || 'book', 'html');
        const result = await ipcRenderer.invoke('export-html', {
            html: sanitized,
            fileName
        });
        return result && result.success ? result.filePath : result;
    }

    async exportPDF({ markdown, context = {}, renderOptions = {} }) {
        const book = await this.compileBook({ markdown, context, renderOptions });
        const documentHtml = this.composeDocument(book, { pdf: true });
        const sanitized = this.sanitize(documentHtml);

        if (typeof require === 'undefined') {
            return sanitized;
        }

        const { ipcRenderer } = require('electron');
        const fileName = this.makeFileName(book.metadata.title || context.displayName || 'book', 'pdf');
        const result = await ipcRenderer.invoke('export-pdf', {
            html: sanitized,
            fileName
        });
        return result && result.success ? result.filePath : result;
    }

    async compileBook({ markdown, context = {}, renderOptions = {} }) {
        if (!markdown || !markdown.trim()) {
            throw new Error('No markdown content available to compile');
        }

        const { body, frontmatter } = this.extractFrontMatter(markdown);
        const config = this.normalizeConfig(frontmatter, context);
        const baseDir = context.filePath ? this.getPathModule()?.dirname(context.filePath) : null;

        let chapterSources = [];
        if (Array.isArray(config.chapters) && config.chapters.length > 0) {
            chapterSources = await this.hydrateConfiguredChapters(config.chapters, baseDir);
        } else {
            chapterSources = this.splitMarkdownIntoChapters(body, config);
        }

        if (!chapterSources.length) {
            throw new Error('No chapters detected. Add # headings or define book.chapters in front matter.');
        }

        const compiledChapters = [];
        for (let index = 0; index < chapterSources.length; index += 1) {
            const source = chapterSources[index];
            const slug = source.id || this.slugify(source.title || `chapter-${index + 1}`, index + 1);
            const html = await this.renderer.render(source.content, renderOptions);
            const enhanced = this.injectHeadingAnchors(html, slug);
            compiledChapters.push({
                id: slug,
                number: index + 1,
                title: source.title || `Chapter ${index + 1}`,
                markdown: source.content,
                html: enhanced.html,
                subsections: enhanced.subsections
            });
        }

        const metadata = {
            title: config.title || context.displayName || 'Untitled Book',
            authors: this.normalizeAuthors(config.author || config.authors || frontmatter?.author),
            description: config.description || frontmatter?.description || '',
            language: (config.language || frontmatter?.language || this.defaultLanguage).toLowerCase(),
            keywords: Array.isArray(config.keywords) ? config.keywords : [],
            identifier: this.ensureIdentifier(config.identifier || frontmatter?.identifier),
            compiledAt: new Date().toISOString(),
            baseDir
        };

        const toc = this.buildToc(compiledChapters);

        return {
            metadata,
            config,
            chapters: compiledChapters,
            toc
        };
    }

    extractFrontMatter(markdown) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
        const match = markdown.match(frontmatterRegex);
        if (!match) {
            return { body: markdown, frontmatter: null };
        }

        const yamlSource = match[1];
        let data = null;
        try {
            const yaml = this.getYamlModule();
            if (yaml) {
                data = yaml.load(yamlSource) || null;
            } else {
                data = this.parseFallbackYaml(yamlSource);
            }
        } catch (error) {
            console.warn('[BookManager] Failed to parse YAML frontmatter:', error.message || error);
            data = this.parseFallbackYaml(yamlSource);
        }

        const body = markdown.slice(match[0].length);
        return { body, frontmatter: data };
    }

    normalizeConfig(frontmatter, context = {}) {
        const fm = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
        const bookNode = fm.book && typeof fm.book === 'object' ? fm.book : {};
        const config = { ...bookNode };

        config.title = config.title || fm.title || context.displayName || 'Untitled Book';
        config.description = config.description || fm.description || '';
        config.language = config.language || fm.language || this.defaultLanguage;
        config.identifier = config.identifier || fm.identifier || null;
        config.author = config.author || fm.author || config.authors || fm.authors || null;
        config.chapters = Array.isArray(config.chapters) ? config.chapters : [];
        config.keywords = Array.isArray(config.keywords) ? config.keywords : (Array.isArray(fm.keywords) ? fm.keywords : []);

        return config;
    }

    async hydrateConfiguredChapters(entries, baseDir) {
        const fs = this.getFsModule();
        const chapters = [];

        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index] || {};
            let content = entry.content || '';
            let resolvedPath = null;

            if (!content && entry.file && fs) {
                try {
                    const pathModule = this.getPathModule();
                    resolvedPath = baseDir ? pathModule.resolve(baseDir, entry.file) : entry.file;
                    content = await fs.promises.readFile(resolvedPath, 'utf-8');
                } catch (error) {
                    console.warn(`[BookManager] Failed to load chapter file "${entry.file}":`, error.message || error);
                }
            }

            const normalizedContent = (content || '').trim();
            if (!normalizedContent) {
                console.warn('[BookManager] Skipping empty chapter entry at index', index);
                continue;
            }

            chapters.push({
                id: entry.id || null,
                title: entry.title || this.deriveTitleFromContent(normalizedContent) || `Chapter ${index + 1}`,
                content: normalizedContent,
                source: entry.file ? { type: 'file', path: resolvedPath || entry.file } : { type: 'inline' }
            });
        }

        return chapters;
    }

    splitMarkdownIntoChapters(markdown, config = {}) {
        const lines = markdown.split(/\r?\n/);
        const chapters = [];
        let current = null;

        const pushChapter = () => {
            if (!current) {
                return;
            }
            const content = current.lines.join('\n').trim();
            if (!content) {
                current = null;
                return;
            }
            chapters.push({
                title: current.title || null,
                content,
                id: null
            });
            current = null;
        };

        lines.forEach((line) => {
            const headingMatch = line.match(/^#\s+(.+)/);
            if (headingMatch) {
                pushChapter();
                current = {
                    title: headingMatch[1].trim(),
                    lines: []
                };
            } else {
                if (!current) {
                    current = { title: null, lines: [] };
                }
                current.lines.push(line);
            }
        });

        pushChapter();

        if (!chapters.length && markdown.trim()) {
            chapters.push({
                title: config.title || 'Document',
                content: markdown.trim(),
                id: null
            });
        }

        return chapters;
    }

    deriveTitleFromContent(markdown) {
        const headingMatch = markdown.match(/^#\s+(.+)/m) || markdown.match(/^##\s+(.+)/m);
        if (headingMatch) {
            return headingMatch[1].trim();
        }
        const firstSentence = markdown.split(/\r?\n/).find(line => line.trim().length > 0);
        return firstSentence ? firstSentence.trim().slice(0, 60) : null;
    }

    injectHeadingAnchors(html, baseId) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
            const container = doc.body.firstElementChild || doc.body;
            const headings = container.querySelectorAll('h2, h3');
            const subsections = [];
            let counter = 1;

            headings.forEach((heading) => {
                const level = parseInt(heading.tagName.replace('H', ''), 10) || 2;
                const headingId = heading.getAttribute('id') || `${baseId}-section-${counter}`;
                if (!heading.getAttribute('id')) {
                    heading.id = headingId;
                }
                subsections.push({
                    id: headingId,
                    title: heading.textContent.trim(),
                    level
                });
                counter += 1;
            });

            return {
                html: container.innerHTML,
                subsections
            };
        } catch (error) {
            console.warn('[BookManager] Failed to inject heading anchors:', error.message || error);
            return { html, subsections: [] };
        }
    }

    renderChapterBlock(chapter) {
        const idAttribute = chapter.id ? ` id="${chapter.id}"` : '';
        return `<article class="book-chapter"${idAttribute}>
    <header class="book-chapter-header">
        <p class="chapter-index">Chapter ${chapter.number}</p>
        <h2>${this.escapeHtml(chapter.title)}</h2>
    </header>
    <div class="book-chapter-content">
        ${chapter.html}
    </div>
</article>`;
    }

    renderTocList(toc) {
        if (!toc || !toc.length) {
            return '<p class="book-toc-empty">No headings found. Add # Heading markers to populate the table of contents.</p>';
        }

        const items = toc.map((entry) => {
            const subsections = (entry.subsections || []).map((sub) => {
                return `<li class="toc-subitem toc-level-${sub.level}"><a href="#${sub.id}">${this.escapeHtml(sub.title)}</a></li>`;
            }).join('');

            return `
<li class="toc-item">
    <a href="#${entry.id}"><span class="toc-number">${entry.number}</span> ${this.escapeHtml(entry.title)}</a>
    ${subsections ? `<ul class="toc-sublist">${subsections}</ul>` : ''}
</li>`;
        }).join('');

        return `<ol class="toc-list">${items}</ol>`;
    }

    getBaseDocument(content, title) {
        if (typeof this.createExportDocument === 'function') {
            try {
                const doc = this.createExportDocument(content, title || 'Book Project');
                if (doc) {
                    return doc;
                }
            } catch (error) {
                console.warn('[BookManager] Failed to use preview export template:', error.message || error);
            }
        }
        return this.createFallbackDocument(content, title || 'Book Project');
    }

    createFallbackDocument(content, title) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(title)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mathjax@4/es5/tex-chtml.js" async></script>
</head>
<body>
${content}
</body>
</html>`;
    }

    injectBookStyles(documentHtml) {
        const config = this.currentBookData?.config || null;
        const styleKey = this.resolvePreviewStyleKey(config);
        const preset = BOOK_PREVIEW_STYLE_PRESETS[styleKey] || BOOK_PREVIEW_STYLE_PRESETS.dark;
        const styleTag = `<style>${BOOK_PREVIEW_BASE_CSS}\n${preset.css}</style>`;
        const htmlWithClasses = this.appendBodyClass(documentHtml, 'book-export', `style-${preset.key}`);
        if (htmlWithClasses.includes('</head>')) {
            return htmlWithClasses.replace('</head>', `${styleTag}</head>`);
        }
        return `${styleTag}${htmlWithClasses}`;
    }

    resolvePreviewStyleKey(config) {
        const direct = (config?.bookStyle || '').toLowerCase();
        if (direct && BOOK_PREVIEW_STYLE_PRESETS[direct]) {
            return direct;
        }
        const type = (config?.type || '').toLowerCase();
        if (type === 'classical') return 'classic';
        if (type === 'wiki') return 'wiki';
        if (type === 'help') return 'helpdesk';
        if (type === 'thesis') return 'standard';
        return 'dark';
    }

    appendBodyClass(documentHtml, ...classNames) {
        if (!documentHtml || !/<body[^>]*>/i.test(documentHtml)) {
            return documentHtml;
        }
        const desiredClasses = classNames.filter(Boolean);
        if (!desiredClasses.length) {
            return documentHtml;
        }
        return documentHtml.replace(/<body([^>]*)>/i, (match, attrs) => {
            const classMatch = attrs.match(/class="([^"]*)"/i);
            const existingClasses = classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [];
            desiredClasses.forEach(cls => {
                if (!existingClasses.includes(cls)) {
                    existingClasses.push(cls);
                }
            });
            const classAttr = `class="${existingClasses.join(' ')}"`;
            if (classMatch) {
                return match.replace(/class="[^"]*"/i, classAttr);
            }
            return `<body${attrs} ${classAttr}>`;
        });
    }

    sanitize(html) {
        if (typeof this.sanitizeExport === 'function') {
            try {
                return this.sanitizeExport(html);
            } catch (error) {
                console.warn('[BookManager] Failed to sanitize export:', error.message || error);
            }
        }
        return html;
    }
    makeFileName(base, extension) {
        const safe = (base || 'book').toString().trim().replace(/[^a-z0-9\-_.]+/gi, '-');
        return `${safe || 'book'}.${extension}`;
    }

    ensureIdentifier(existing) {
        if (existing) {
            return existing;
        }
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `urn:uuid:${crypto.randomUUID()}`;
        }
        return `urn:uuid:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    normalizeAuthors(authorField) {
        if (!authorField) {
            return [];
        }
        if (Array.isArray(authorField)) {
            return authorField.map(author => String(author).trim()).filter(Boolean);
        }
        return String(authorField)
            .split(',')
            .map(chunk => chunk.trim())
            .filter(Boolean);
    }

    slugify(text, fallbackIndex) {
        if (!text) {
            return `chapter-${fallbackIndex}`;
        }
        const base = text
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 64);
        return base || `chapter-${fallbackIndex}`;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) {
            return '';
        }
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    parseFallbackYaml(source) {
        if (!source) {
            return {};
        }
        const result = {};
        source.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
                return;
            }
            const [key, ...rawValue] = trimmed.split(':');
            if (!key || !rawValue.length) {
                return;
            }
            const value = rawValue.join(':').trim();
            result[key.trim()] = value.replace(/^['"]|['"]$/g, '');
        });
        return result;
    }

    getFsModule() {
        if (this.fs || typeof require === 'undefined') {
            return this.fs;
        }
        try {
            this.fs = require('fs');
        } catch (error) {
            console.warn('[BookManager] Failed to load fs module:', error.message || error);
            this.fs = null;
        }
        return this.fs;
    }

    getPathModule() {
        if (this.path || typeof require === 'undefined') {
            return this.path;
        }
        try {
            this.path = require('path');
        } catch (error) {
            console.warn('[BookManager] Failed to load path module:', error.message || error);
            this.path = null;
        }
        return this.path;
    }

    getYamlModule() {
        if (this.yaml !== null) {
            return this.yaml;
        }
        if (typeof require === 'undefined') {
            this.yaml = null;
            return this.yaml;
        }
        try {
            this.yaml = require('js-yaml');
        } catch (error) {
            console.warn('[BookManager] Failed to load js-yaml module:', error.message || error);
            this.yaml = null;
        }
        return this.yaml;
    }
}

window.BookManager = BookManager;
window.BOOK_PREVIEW_STYLE_PRESETS = BOOK_PREVIEW_STYLE_PRESETS;

