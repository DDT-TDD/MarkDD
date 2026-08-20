// Platform-agnostic bridge for MarkDD Editor (Electron / Tauri 2.0 / Web)
// Provides a unified interface for IPC, fs, and path across all runtimes.
(() => {
    const isElectron = (
        typeof require !== 'undefined' &&
        typeof process !== 'undefined' &&
        process.versions &&
        !!process.versions.electron
    );
    // Tauri 2 exposes __TAURI_INTERNALS__ before __TAURI__ is fully ready
    const isTauri = !!(window.__TAURI__ || window.__TAURI_INTERNALS__);

    console.log(`[Bridge] Initializing. Electron: ${!!isElectron}, Tauri: ${!!isTauri}`);

    // ─── path mock (Node.js-compatible, browser-safe) ────────────────────────
    const pathMock = {
        sep: '/',
        join: (...args) => {
            const joined = args.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
            return joined || '.';
        },
        resolve: (...args) => {
            const joined = args.filter(Boolean).join('/').replace(/\\/g, '/').replace(/\/+/g, '/');
            return joined || '.';
        },
        dirname: (p) => {
            if (!p) return '.';
            const normalized = p.replace(/\\/g, '/');
            const idx = normalized.lastIndexOf('/');
            if (idx === -1) return '.';
            if (idx === 2 && normalized[1] === ':') return normalized.substring(0, 3);
            return normalized.substring(0, idx) || '/';
        },
        basename: (p, ext) => {
            if (!p) return '';
            const normalized = p.replace(/\\/g, '/');
            const idx = normalized.lastIndexOf('/');
            let base = idx === -1 ? normalized : normalized.substring(idx + 1);
            if (ext && base.endsWith(ext)) {
                base = base.substring(0, base.length - ext.length);
            }
            return base;
        },
        extname: (p) => {
            if (!p) return '';
            const base = p.substring(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1);
            const idx = base.lastIndexOf('.');
            if (idx <= 0) return '';
            return base.substring(idx);
        },
        relative: (from, to) => {
            // Simple relative path — good enough for the renderer's needs
            const f = (from || '').replace(/\\/g, '/').replace(/\/$/, '');
            const t = (to   || '').replace(/\\/g, '/');
            if (t.startsWith(f + '/')) return t.slice(f.length + 1);
            return t;
        },
        isAbsolute: (p) => {
            return /^([A-Za-z]:[/\\]|[/\\])/.test(p || '');
        }
    };

    // ─── Tauri 2 dialog helpers ───────────────────────────────────────────────
    // Tauri 2 exposes dialogs via @tauri-apps/api/dialog (loaded at build time)
    // OR via window.__TAURI__.dialog (runtime inject). We try both.
    async function tauriOpenDialog(opts) {
        if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.dialog.open) {
            return window.__TAURI__.dialog.open(opts);
        }
        // Tauri 2 plugin-dialog also available on __TAURI_PLUGIN_DIALOG__
        if (window.__TAURI_PLUGIN_DIALOG__ && window.__TAURI_PLUGIN_DIALOG__.open) {
            return window.__TAURI_PLUGIN_DIALOG__.open(opts);
        }
        return null;
    }
    async function tauriSaveDialog(opts) {
        if (window.__TAURI__ && window.__TAURI__.dialog && window.__TAURI__.dialog.save) {
            return window.__TAURI__.dialog.save(opts);
        }
        if (window.__TAURI_PLUGIN_DIALOG__ && window.__TAURI_PLUGIN_DIALOG__.save) {
            return window.__TAURI_PLUGIN_DIALOG__.save(opts);
        }
        return null;
    }

    // ─── Tauri 2 window helpers ───────────────────────────────────────────────
    async function getTauriWindowByLabel(label) {
        try {
            if (window.__TAURI__ && window.__TAURI__.webviewWindow && window.__TAURI__.webviewWindow.WebviewWindow) {
                return window.__TAURI__.webviewWindow.WebviewWindow.getByLabel(label);
            }
            if (window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.WebviewWindow) {
                return window.__TAURI__.window.WebviewWindow.getByLabel(label);
            }
        } catch (_) { /* ignore */ }
        return null;
    }
    async function createTauriWindow(label, opts) {
        try {
            if (window.__TAURI__ && window.__TAURI__.webviewWindow && window.__TAURI__.webviewWindow.WebviewWindow) {
                return new window.__TAURI__.webviewWindow.WebviewWindow(label, opts);
            }
            if (window.__TAURI__ && window.__TAURI__.window && window.__TAURI__.window.WebviewWindow) {
                return new window.__TAURI__.window.WebviewWindow(label, opts);
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    // ─── fs mock — synchronous (XHR) + async (fetch) ─────────────────────────
    const BASE = 'http://localhost:3001';

    // Track backend readiness — resolves when Node server responds
    let _backendReady = false;
    let _backendReadyCallbacks = [];
    function _onBackendReady(fn) {
        if (_backendReady) { fn(); } else { _backendReadyCallbacks.push(fn); }
    }
    function _markBackendReady() {
        if (_backendReady) return;
        _backendReady = true;
        console.log('[Bridge] Backend confirmed ready.');
        _backendReadyCallbacks.forEach(fn => { try { fn(); } catch (_) {} });
        _backendReadyCallbacks = [];
    }
    // Expose globally so renderer can await backend startup
    window.MarkDDBackendReady = new Promise(resolve => _onBackendReady(resolve));

    // Poll /health in Tauri/Web mode until the Node backend is up
    if (!isElectron) {
        (function pollHealth() {
            fetch(`${BASE}/health`, { method: 'GET' })
                .then(r => r.ok ? _markBackendReady() : setTimeout(pollHealth, 250))
                .catch(() => setTimeout(pollHealth, 250));
        })();
    } else {
        _markBackendReady(); // Electron: backend is always ready
    }

    const fsMock = {
        // ── sync ──────────────────────────────────────────────────────────────
        existsSync: (filePath) => {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `${BASE}/fs/exists?path=${encodeURIComponent(filePath)}`, false);
                xhr.send();
                if (xhr.status === 200) return JSON.parse(xhr.responseText).exists;
            } catch (e) {
                console.warn('[Bridge fs] existsSync failed:', e);
            }
            return false;
        },

        readFileSync: (filePath, encoding) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${BASE}/fs/read?path=${encodeURIComponent(filePath)}`, false);
            if (!encoding || encoding === 'binary') {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
            }
            xhr.send();
            if (xhr.status !== 200) {
                throw new Error(`Failed to read file ${filePath}: ${xhr.statusText}`);
            }
            if (encoding === 'utf-8' || encoding === 'utf8') return xhr.responseText;
            if (encoding === 'base64') {
                let binary = '';
                for (let i = 0; i < xhr.responseText.length; i++) {
                    binary += String.fromCharCode(xhr.responseText.charCodeAt(i) & 0xff);
                }
                return btoa(binary);
            }
            // Default: Uint8Array
            const len = xhr.responseText.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = xhr.responseText.charCodeAt(i) & 0xff;
            return bytes;
        },

        writeFileSync: (filePath, content) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${BASE}/fs/write?path=${encodeURIComponent(filePath)}`, false);
            xhr.setRequestHeader('Content-Type', 'text/plain; charset=utf-8');
            xhr.send(content);
            if (xhr.status !== 200) {
                throw new Error(`Failed to write file ${filePath}: ${xhr.statusText}`);
            }
        },

        readdirSync: (filePath) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${BASE}/fs/readdir?path=${encodeURIComponent(filePath)}`, false);
            xhr.send();
            if (xhr.status !== 200) {
                throw new Error(`Failed to read directory ${filePath}: ${xhr.statusText}`);
            }
            return JSON.parse(xhr.responseText);
        },

        mkdirSync: (dirPath, opts) => {
            // Handled server-side via /fs/mkdir
            const xhr = new XMLHttpRequest();
            const recursive = (opts && opts.recursive) ? 'true' : 'false';
            xhr.open('POST', `${BASE}/fs/mkdir?path=${encodeURIComponent(dirPath)}&recursive=${recursive}`, false);
            xhr.send();
            // Ignore errors for now (directory may already exist)
        },

        statSync: (filePath) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${BASE}/fs/stat?path=${encodeURIComponent(filePath)}`, false);
            xhr.send();
            if (xhr.status !== 200) throw new Error(`stat failed for ${filePath}`);
            const info = JSON.parse(xhr.responseText);
            return {
                isFile: () => info.isFile,
                isDirectory: () => info.isDirectory,
                size: info.size || 0,
                mtime: info.mtime ? new Date(info.mtime) : null
            };
        },

        // ── async (promises) ──────────────────────────────────────────────────
        promises: {
            readFile: async (filePath, encoding) => {
                const enc = (encoding && typeof encoding === 'object') ? encoding.encoding : encoding;
                const res = await fetch(`${BASE}/fs/read?path=${encodeURIComponent(filePath)}`);
                if (!res.ok) throw new Error(`Failed to read file ${filePath}: ${res.status}`);
                if (enc === 'utf-8' || enc === 'utf8') return res.text();
                const buf = await res.arrayBuffer();
                return new Uint8Array(buf);
            },

            writeFile: async (filePath, content) => {
                const body = (content instanceof Uint8Array)
                    ? content
                    : (typeof content === 'string' ? content : JSON.stringify(content));
                const res = await fetch(`${BASE}/fs/write?path=${encodeURIComponent(filePath)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                    body
                });
                if (!res.ok) throw new Error(`Failed to write file ${filePath}: ${res.status}`);
            },

            readdir: async (dirPath, opts) => {
                const res = await fetch(`${BASE}/fs/readdir?path=${encodeURIComponent(dirPath)}`);
                if (!res.ok) throw new Error(`Failed to readdir ${dirPath}: ${res.status}`);
                const names = await res.json();
                if (opts && opts.withFileTypes) {
                    // Return Dirent-like objects — use stat for each (best-effort)
                    return names.map(name => ({
                        name,
                        isDirectory: () => fsMock.existsSync(dirPath + '/' + name) &&
                            (() => { try { return fsMock.statSync(dirPath + '/' + name).isDirectory(); } catch(_){ return false; } })(),
                        isFile: () => true
                    }));
                }
                return names;
            },

            mkdir: async (dirPath, opts) => {
                const recursive = (opts && opts.recursive) ? 'true' : 'false';
                const res = await fetch(`${BASE}/fs/mkdir?path=${encodeURIComponent(dirPath)}&recursive=${recursive}`, {
                    method: 'POST'
                });
                // Ignore 409/already-exists
                if (!res.ok && res.status !== 409) {
                    throw new Error(`Failed to mkdir ${dirPath}: ${res.status}`);
                }
            },

            access: async (filePath) => {
                const res = await fetch(`${BASE}/fs/exists?path=${encodeURIComponent(filePath)}`);
                if (!res.ok) throw new Error(`access denied for ${filePath}`);
                const { exists } = await res.json();
                if (!exists) throw new Error(`ENOENT: no such file or directory '${filePath}'`);
            },

            unlink: async (filePath) => {
                const res = await fetch(`${BASE}/fs/unlink?path=${encodeURIComponent(filePath)}`, {
                    method: 'DELETE'
                });
                if (!res.ok) throw new Error(`Failed to unlink ${filePath}: ${res.status}`);
            },

            stat: async (filePath) => {
                const res = await fetch(`${BASE}/fs/stat?path=${encodeURIComponent(filePath)}`);
                if (!res.ok) throw new Error(`stat failed for ${filePath}: ${res.status}`);
                const info = await res.json();
                return {
                    isFile: () => info.isFile,
                    isDirectory: () => info.isDirectory,
                    size: info.size || 0,
                    mtime: info.mtime ? new Date(info.mtime) : null
                };
            }
        }
    };

    // ─── Main MarkDDBridge object ─────────────────────────────────────────────
    window.MarkDDBridge = {
        isElectron,
        isTauri,

        /**
         * Convert an absolute local file path to a URL that the webview can load.
         * In Tauri mode: uses the /fs/serve-image HTTP endpoint.
         * In Electron: returns a file:// URL.
         */
        getImageUrl: (absolutePath) => {
            if (!absolutePath) return '';
            if (isElectron) {
                return 'file://' + absolutePath.replace(/\\/g, '/');
            }
            return `${BASE}/fs/serve-image?path=${encodeURIComponent(absolutePath)}`;
        },

        /** Async version that also fetches via IPC for data-URI embedding */
        serveLocalImage: async (absolutePath) => {
            try {
                return await window.MarkDDBridge.invoke('serve-local-image', { filePath: absolutePath });
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        invoke: async (channel, payload = {}) => {
            // ── Electron: native IPC ──────────────────────────────────────────
            if (isElectron) {
                const { ipcRenderer } = require('electron');
                return ipcRenderer.invoke(channel, payload);
            }

            // ── Tauri: intercept dialog channels ─────────────────────────────
            if (isTauri) {
                if (channel === 'open-file-dialog') {
                    const file = await tauriOpenDialog({
                        multiple: false,
                        filters: [
                            { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });
                    if (file) {
                        try {
                            const content = fsMock.readFileSync(file, 'utf-8');
                            return { filePath: file, content: content };
                        } catch (err) {
                            console.error('[Bridge] Failed to read file during open-file-dialog:', err);
                            return null;
                        }
                    }
                    return null;
                }
                if (channel === 'open-folder-dialog' || channel === 'book-select-directory') {
                    const folder = await tauriOpenDialog({ directory: true, multiple: false });
                    return folder
                        ? { canceled: false, path: folder, filePaths: [folder] }
                        : { canceled: true };
                }
                if (channel === 'show-open-pptx-dialog') {
                    const file = await tauriOpenDialog({
                        filters: [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }]
                    });
                    return file ? { canceled: false, filePath: file } : { canceled: true };
                }
                if (channel === 'show-save-pptx-dialog') {
                    const file = await tauriSaveDialog({
                        defaultPath: (typeof payload === 'string' ? payload : undefined),
                        filters: [{ name: 'PowerPoint Presentation', extensions: ['pptx'] }]
                    });
                    return file ? { canceled: false, filePath: file } : { canceled: true };
                }
                if (channel === 'book-save-dialog') {
                    const file = await tauriSaveDialog({
                        defaultPath: payload.defaultPath || payload.defaultName,
                        filters: payload.filters || []
                    });
                    return file ? { canceled: false, filePath: file } : { canceled: true };
                }
                if (channel === 'select-cv-photo-dialog') {
                    const file = await tauriOpenDialog({
                        filters: [
                            { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });
                    return file ? { filePath: file } : { canceled: true };
                }
                if (channel === 'save-file') {
                    if (!payload.filePath) {
                        const file = await tauriSaveDialog({
                            filters: [
                                { name: 'Markdown Files', extensions: ['md'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        if (!file) return { success: false, canceled: true };
                        payload.filePath = file;
                    }
                }
                if (channel === 'export-html') {
                    const file = await tauriSaveDialog({
                        defaultPath: payload.fileName || 'export.html',
                        filters: [
                            { name: 'HTML Files', extensions: ['html'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'export-pdf') {
                    const file = await tauriSaveDialog({
                        defaultPath: payload.fileName || 'export.pdf',
                        filters: [
                            { name: 'PDF Files', extensions: ['pdf'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'export-cv-pdf') {
                    const file = await tauriSaveDialog({
                        defaultPath: (payload.title ? payload.title + '.pdf' : 'cv.pdf'),
                        filters: [
                            { name: 'PDF Files', extensions: ['pdf'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'save-cv-html') {
                    const file = await tauriSaveDialog({
                        defaultPath: (payload.title ? payload.title + '.html' : 'cv.html'),
                        filters: [
                            { name: 'HTML Files', extensions: ['html'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'export-presentation-pdf') {
                    const file = await tauriSaveDialog({
                        defaultPath: (payload.title ? payload.title + '.pdf' : 'presentation.pdf'),
                        filters: [
                            { name: 'PDF Files', extensions: ['pdf'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'save-presentation-html') {
                    const file = await tauriSaveDialog({
                        defaultPath: (payload.title ? payload.title + '.html' : 'presentation.html'),
                        filters: [
                            { name: 'HTML Files', extensions: ['html'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }
                if (channel === 'export-mindmap-pdf') {
                    const file = await tauriSaveDialog({
                        defaultPath: payload.fileName || 'mindmap.pdf',
                        filters: [
                            { name: 'PDF Files', extensions: ['pdf'] }
                        ]
                    });
                    if (!file) return { success: false, canceled: true };
                    payload.filePath = file;
                }


                // ── Window-open status checks ─────────────────────────────────
                if (channel === 'is-cv-preview-open') {
                    try {
                        const win = await getTauriWindowByLabel('cv-preview');
                        return !!(win && await win.isVisible());
                    } catch (_) { return false; }
                }
                if (channel === 'is-presentation-preview-open') {
                    try {
                        const win = await getTauriWindowByLabel('presentation-preview');
                        return !!(win && await win.isVisible());
                    } catch (_) { return false; }
                }

                // ── Fullscreen / window controls (no-op in Tauri, window manages itself) ─
                if (channel === 'toggle-fullscreen' || channel === 'get-fullscreen-state') {
                    // Tauri handles fullscreen via window API; signal no-op to app
                    return { success: true, isFullscreen: false };
                }
                if (channel === 'app-quit') {
                    if (window.__TAURI__ && window.__TAURI__.process && window.__TAURI__.process.exit) {
                        await window.__TAURI__.process.exit(0);
                    }
                    return { success: true };
                }
                if (channel === 'open-external') {
                    const url = (typeof payload === 'string') ? payload : (payload.url || payload);
                    if (window.__TAURI__ && window.__TAURI__.shell && window.__TAURI__.shell.open) {
                        await window.__TAURI__.shell.open(url);
                    } else {
                        window.open(url, '_blank', 'noopener');
                    }
                    return { success: true };
                }
            }

            // ── Tauri + Node backend: all remaining channels via HTTP ─────────
            try {
                const res = await fetch(`${BASE}/ipc/${channel}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                // Handle secondary preview windows in Tauri mode
                if (isTauri && data && data.success && data.filePath) {
                    const previewUrl = `${BASE}/fs/read?path=${encodeURIComponent(data.filePath)}`;

                    if (channel === 'preview-cv') {
                        try {
                            let win = await getTauriWindowByLabel('cv-preview');
                            if (win) {
                                if (typeof win.eval === 'function') {
                                    const bustedUrl = previewUrl + (previewUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                                    await win.eval('window.location.replace(' + JSON.stringify(bustedUrl) + ');');
                                }
                                await win.show();
                                await win.setFocus();
                            } else {
                                await createTauriWindow('cv-preview', {
                                    url: previewUrl,
                                    title: 'CV Live Preview',
                                    width: 950,
                                    height: 900,
                                    resizable: true
                                });
                            }
                        } catch (e) {
                            console.warn('[Bridge] cv-preview window failed:', e);
                        }
                    } else if (channel === 'preview-presentation') {
                        try {
                            let win = await getTauriWindowByLabel('presentation-preview');
                            if (win) {
                                if (typeof win.eval === 'function') {
                                    const bustedUrl = previewUrl + (previewUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                                    await win.eval('window.location.replace(' + JSON.stringify(bustedUrl) + ');');
                                }
                                await win.show();
                                await win.setFocus();
                            } else {
                                const created = await createTauriWindow('presentation-preview', {
                                    url: previewUrl,
                                    title: 'Presentation Slides',
                                    width: 1120,
                                    height: 780,
                                    resizable: true
                                });
                                if (!created) {
                                    if (!window._presentationPreviewWindow || window._presentationPreviewWindow.closed) {
                                        window._presentationPreviewWindow = window.open(previewUrl, 'presentation-preview', 'width=1120,height=780,resizable=yes,scrollbars=yes');
                                    } else {
                                        window._presentationPreviewWindow.focus();
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[Bridge] presentation-preview window failed, opening fallback:', e);
                            try {
                                if (!window._presentationPreviewWindow || window._presentationPreviewWindow.closed) {
                                    window._presentationPreviewWindow = window.open(previewUrl, 'presentation-preview', 'width=1120,height=780,resizable=yes,scrollbars=yes');
                                } else {
                                    window._presentationPreviewWindow.focus();
                                }
                            } catch (_) {}
                        }
                    }
                }

                // Handle secondary preview windows in web mode (non-Electron, non-Tauri)
                // The SSE script injected by the server handles auto-reload;
                // here we open/focus the window the first time.
                if (!isTauri && !isElectron && data && data.success && data.filePath) {
                    const previewUrl = `${BASE}/fs/read?path=${encodeURIComponent(data.filePath)}`;

                    if (channel === 'preview-cv') {
                        try {
                            if (!window._cvPreviewWindow || window._cvPreviewWindow.closed) {
                                window._cvPreviewWindow = window.open(previewUrl, 'cv-preview',
                                    'width=950,height=900,resizable=yes,scrollbars=yes');
                            } else {
                                // Window already open — SSE will trigger reload; just focus it
                                window._cvPreviewWindow.focus();
                            }
                        } catch (e) {
                            console.warn('[Bridge] cv-preview window (web mode) failed:', e);
                        }
                    } else if (channel === 'preview-presentation') {
                        try {
                            if (!window._presentationPreviewWindow || window._presentationPreviewWindow.closed) {
                                window._presentationPreviewWindow = window.open(previewUrl, 'presentation-preview',
                                    'width=1120,height=780,resizable=yes,scrollbars=yes');
                            } else {
                                // Window already open — SSE will trigger reload; just focus it
                                window._presentationPreviewWindow.focus();
                            }
                        } catch (e) {
                            console.warn('[Bridge] presentation-preview window (web mode) failed:', e);
                        }
                    }
                }

                return data;

            } catch (err) {
                console.error(`[Bridge] IPC channel '${channel}' failed:`, err);
                if (channel === 'get-package-data') return { success: false, data: { name: 'MarkDD Editor', version: '2.1.0', description: '', author: 'MarkDD Team' } };
                return { success: false, error: err.message };
            }
        },

        // ── ipcRenderer shim: allows renderer code written for Electron to work unchanged ──
        ipcRenderer: {
            on: (channel, callback) => {
                if (isElectron) {
                    require('electron').ipcRenderer.on(channel, callback);
                } else if (isTauri && window.__TAURI__ && window.__TAURI__.event) {
                    window.__TAURI__.event.listen(channel, (event) => {
                        callback(null, event.payload);
                    });
                }
                // In Tauri mode most push-channels (menu-*, check-unsaved-tabs, etc.) are unused
                // because the Node backend doesn't push events — they're driven by the HTML UI.
            },
            send: (channel, data) => {
                if (isElectron) {
                    require('electron').ipcRenderer.send(channel, data);
                } else if (isTauri && window.__TAURI__ && window.__TAURI__.event) {
                    window.__TAURI__.event.emit(channel, data);
                }
            },
            invoke: async (channel, payload) => {
                return window.MarkDDBridge.invoke(channel, payload);
            },
            removeAllListeners: (channel) => {
                if (isElectron) {
                    require('electron').ipcRenderer.removeAllListeners(channel);
                }
                // In Tauri/Web there is nothing to remove — listeners were never registered
            }
        }
    };

    // ─── Global require() shim for Tauri / Web context ───────────────────────
    // Only installed when the native Node require is absent (i.e. in Tauri/WebView).
    // Electron already has a real require, so we must not override it there.
    if (!isElectron && typeof window.require === 'undefined') {
        window.require = (moduleName) => {
            switch (moduleName) {
                case 'electron':
                    return {
                        ipcRenderer: window.MarkDDBridge.ipcRenderer,
                        shell: {
                            openExternal: (url) => window.MarkDDBridge.invoke('open-external', url)
                        }
                    };
                case 'fs':
                    return fsMock;
                case 'path':
                    return pathMock;
                case 'js-yaml':
                    return window.jsyaml;
                case 'jszip':
                    return window.JSZip;
                case './js/pptx-importer.js':
                case 'js/pptx-importer.js':
                case './pptx-importer.js':
                case 'pptx-importer':
                    return window.PPTXImporter;
                case './js/pptx-exporter.js':
                case 'js/pptx-exporter.js':
                case './pptx-exporter.js':
                case 'pptx-exporter':
                    return window.PPTXExporter;
                case './presentation.js':
                case 'presentation.js':
                    return window.PresentationManager;
                case 'pptxgenjs':
                    return window.PptxGenJS || null;
                default:
                    console.warn(`[Bridge] require('${moduleName}') called in Tauri/Web context — returning window fallback`);
                    return window[moduleName] || null;
            }
        };
    }
})();
