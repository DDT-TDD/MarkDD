// Headless Node.js backend server for MarkDD Editor (Tauri 2.0 Mode)
const http = require('http');
const fs = require('fs');
const path = require('path');

let startupFilePath = null;
function parseCliStartupFile(argv) {
    if (!argv || argv.length <= 1) return null;
    for (let i = 1; i < argv.length; i++) {
        const arg = argv[i];
        if (arg && !arg.startsWith('--') && !arg.endsWith('.exe') && !arg.endsWith('main-tauri.js')) {
            try {
                const cleanArg = arg.trim().replace(/^["']|["']$/g, '');
                const normalized = path.normalize(cleanArg);
                if (fs.existsSync(normalized)) {
                    return normalized;
                }
            } catch (err) {
                console.warn('[Main-Tauri] Error checking CLI argument:', err);
            }
        }
    }
    return null;
}
startupFilePath = parseCliStartupFile(process.argv);
if (startupFilePath) {
    console.log('[Main-Tauri] Detected CLI startup file:', startupFilePath);
}

function getAppExecutablePath() {
    if (process.env.PORTABLE_EXECUTABLE_FILE && fs.existsSync(process.env.PORTABLE_EXECUTABLE_FILE)) {
        return process.env.PORTABLE_EXECUTABLE_FILE;
    }
    const localAppData = process.env.LOCALAPPDATA || ('C:\\Users\\' + (process.env.USERNAME || '') + '\\AppData\\Local');
    const candidates = [
        path.join(localAppData, 'Programs', 'markdd-editor', 'markdd-editor.exe'),
        path.join(localAppData, 'Programs', 'MarkDD Editor', 'markdd-editor.exe'),
        path.join(process.cwd(), 'src-tauri', 'target', 'release', 'markdd-editor.exe'),
        path.join(process.cwd(), 'markdd-editor.exe')
    ];
    for (const cand of candidates) {
        if (cand && fs.existsSync(cand)) {
            return cand;
        }
    }
    return null;
}

// Auto-register file associations on startup for Windows (only if markdd-editor.exe exists)
if (process.platform === 'win32') {
    try {
        const targetExe = getAppExecutablePath();
        if (targetExe) {
            const exec = require('child_process').exec;
            const cmd = `reg add "HKCU\\Software\\Classes\\MarkDD.MarkdownFile" /ve /d "Markdown Document" /f && ` +
                        `reg add "HKCU\\Software\\Classes\\MarkDD.MarkdownFile\\shell\\open\\command" /ve /d "\\"${targetExe}\\" \\"%1\\"" /f && ` +
                        `reg add "HKCU\\Software\\Classes\\.md" /ve /d "MarkDD.MarkdownFile" /f && ` +
                        `reg add "HKCU\\Software\\Classes\\.markdown" /ve /d "MarkDD.MarkdownFile" /f && ` +
                        `reg add "HKCU\\Software\\Classes\\.mdown" /ve /d "MarkDD.MarkdownFile" /f && ` +
                        `reg add "HKCU\\Software\\Classes\\.mdwn" /ve /d "MarkDD.MarkdownFile" /f`;
            exec(cmd, (err) => {
                if (err) console.warn('[Main-Tauri] Registry association warning:', err.message);
                else console.log('[Main-Tauri] File associations registered for:', targetExe);
            });
        }
    } catch (e) {
        console.warn('[Main-Tauri] Failed to execute registry association:', e.message);
    }
}
const url = require('url');
const { BookEngine } = require('../common/book-engine');
const { getVersion } = require('../version');

const bookEngine = new BookEngine(console);
let activeBookServe = null;

let cvPreviewWindowOpen = false;
let presentationWindowOpen = false;
// Version counters for SSE-based live reload of preview windows
let cvPreviewVersion = 0;
let presentationPreviewVersion = 0;
// SSE client lists for live-reload push
const cvSseClients = new Set();
const presentationSseClients = new Set();

function findSystemBrowser() {
    const paths = process.platform === 'win32' ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ] : process.platform === 'darwin' ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    ] : [
        '/usr/bin/google-chrome',
        '/usr/bin/chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ];
    for (const p of paths) {
        if (p && fs.existsSync(p)) return p;
    }
    return null;
}

// Parent process self-termination checker
setInterval(() => {
    try {
        process.kill(process.ppid, 0);
    } catch (e) {
        console.log('[Headless Backend] Parent process has exited. Shutting down.');
        process.exit(0);
    }
}, 1000);

// Determine app data and package paths
const packagePath = path.join(__dirname, '../../package.json');
let packageData = {};
try {
    packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
} catch (e) {
    // Fallback: version must always match package.json — update both together
    packageData = { name: "markdd-editor", version: "2.2.0" };
}

const PORT = 3001;

// Simple custom percent-decoder
function percentDecode(s) {
    let result = '';
    try {
        result = decodeURIComponent(s);
    } catch (e) {
        result = s;
    }
    return result;
}

const server = http.createServer(async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;

    // 0a. Single-instance push endpoint (handles double-clicking files when app is already running)
    if (pathname === '/open-file-instance') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                if (data && data.filePath) {
                    startupFilePath = data.filePath;
                    console.log('[Main-Tauri] Single-instance file open request:', startupFilePath);
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true }));
            } catch (e) {
                res.statusCode = 400;
                res.end(e.message);
            }
        });
        return;
    }

    // 0b. Health check endpoint
    if (pathname === '/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // 0b. SSE endpoints for live preview reload
    if (pathname === '/preview-events/cv') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write(`data: ${cvPreviewVersion}\n\n`);
        cvSseClients.add(res);
        req.on('close', () => cvSseClients.delete(res));
        return;
    }
    if (pathname === '/preview-events/presentation') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        res.write(`data: ${presentationPreviewVersion}\n\n`);
        presentationSseClients.add(res);
        req.on('close', () => presentationSseClients.delete(res));
        return;
    }
    // 0c. Preview version polling endpoints (fallback for non-SSE)
    if (pathname === '/preview-version/cv') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ version: cvPreviewVersion }));
        return;
    }
    if (pathname === '/preview-version/presentation') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ version: presentationPreviewVersion }));
        return;
    }

    // 1. Direct synchronous file system endpoints (accessed by bridge.js fsMock)
    if (pathname.startsWith('/fs/')) {
        const queryPath = percentDecode(parsedUrl.searchParams.get('path') || '');
        
        if (pathname === '/fs/exists') {
            const exists = fs.existsSync(queryPath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ exists }));
            return;
        }

        if (pathname === '/fs/read') {
            try {
                const data = fs.readFileSync(queryPath);
                res.statusCode = 200;
                let mime = 'application/octet-stream';
                const lowerPath = queryPath.toLowerCase();
                if (lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')) {
                    mime = 'text/html; charset=utf-8';
                } else if (lowerPath.endsWith('.css')) {
                    mime = 'text/css; charset=utf-8';
                } else if (lowerPath.endsWith('.js')) {
                    mime = 'application/javascript; charset=utf-8';
                }
                res.setHeader('Content-Type', mime);
                res.end(data);
            } catch (err) {
                res.statusCode = 404;
                res.end(err.message);
            }
            return;
        }

        if (pathname === '/fs/write') {
            let body = [];
            req.on('data', (chunk) => body.push(chunk));
            req.on('end', () => {
                try {
                    const data = Buffer.concat(body);
                    fs.writeFileSync(queryPath, data);
                    res.statusCode = 200;
                    res.end('ok');
                } catch (err) {
                    res.statusCode = 500;
                    res.end(err.message);
                }
            });
            return;
        }

        if (pathname === '/fs/readdir') {
            try {
                const files = fs.readdirSync(queryPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(files));
            } catch (err) {
                res.statusCode = 500;
                res.end(err.message);
            }
            return;
        }

        if (pathname === '/fs/mkdir') {
            const recursive = parsedUrl.searchParams.get('recursive') === 'true';
            try {
                fs.mkdirSync(queryPath, { recursive });
                res.statusCode = 200;
                res.end('ok');
            } catch (err) {
                if (err.code === 'EEXIST') {
                    res.statusCode = 409;
                    res.end('already exists');
                } else {
                    res.statusCode = 500;
                    res.end(err.message);
                }
            }
            return;
        }

        if (pathname === '/fs/stat') {
            try {
                const stat = fs.statSync(queryPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    isFile: stat.isFile(),
                    isDirectory: stat.isDirectory(),
                    size: stat.size,
                    mtime: stat.mtime ? stat.mtime.toISOString() : null
                }));
            } catch (err) {
                res.statusCode = 404;
                res.end(err.message);
            }
            return;
        }

        if (pathname === '/fs/unlink') {
            try {
                fs.unlinkSync(queryPath);
                res.statusCode = 200;
                res.end('ok');
            } catch (err) {
                res.statusCode = 500;
                res.end(err.message);
            }
            return;
        }

        // Serve a local image/file by absolute path with correct MIME type
        if (pathname === '/fs/serve-image') {
            try {
                if (!queryPath) { res.statusCode = 400; res.end('Missing path'); return; }
                const ext = path.extname(queryPath).toLowerCase();
                const mimes = {
                    '.png':  'image/png',
                    '.jpg':  'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif':  'image/gif',
                    '.webp': 'image/webp',
                    '.svg':  'image/svg+xml',
                    '.bmp':  'image/bmp',
                    '.ico':  'image/x-icon',
                    '.tiff': 'image/tiff',
                    '.tif':  'image/tiff'
                };
                const mime = mimes[ext] || 'application/octet-stream';
                const data = fs.readFileSync(queryPath);
                res.statusCode = 200;
                res.setHeader('Content-Type', mime);
                res.setHeader('Cache-Control', 'public, max-age=3600');
                res.end(data);
            } catch (err) {
                res.statusCode = 404;
                res.end(`Image not found: ${err.message}`);
            }
            return;
        }
    }

    // 2. Headless IPC channels (/ipc/:channel)
    if (pathname.startsWith('/ipc/')) {
        const channel = pathname.substring(5);
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', async () => {
            let payload = {};
            if (body) {
                try {
                    payload = JSON.parse(body);
                } catch (e) {}
            }

            try {
                const result = await handleIpc(channel, payload);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
            } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // 3. Static server for Book mode live previews (if serving)
    if (activeBookServe) {
        const safePath = (pathname === '/' || pathname === '') ? '/index.html' : pathname;
        const targetPath = path.join(activeBookServe, safePath);
        if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
            const ext = path.extname(targetPath).toLowerCase();
            const mimes = {
                '.html': 'text/html; charset=utf-8',
                '.css': 'text/css; charset=utf-8',
                '.js': 'application/javascript; charset=utf-8',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.json': 'application/json; charset=utf-8'
            };
            res.statusCode = 200;
            res.setHeader('Content-Type', mimes[ext] || 'application/octet-stream');
            res.end(fs.readFileSync(targetPath));
            return;
        }
    }

    res.statusCode = 404;
    res.end('Not Found');
});

// Helper to resolve User Data Directory path
function getUserDataPath() {
    const userDataPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? `${process.env.HOME}/Library/Application Support` : `${process.env.HOME}/.config`), 'markdd-editor');
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }
    return userDataPath;
}

/**
 * Inject a tiny SSE auto-reload script into preview HTML so the preview
 * window reconnects to the server and reloads whenever new content is pushed.
 * @param {string} html  Full HTML document string
 * @param {'cv'|'presentation'} type
 * @returns {string} HTML with the reload script injected before </body>
 */
function injectLiveReloadScript(html, type) {
    const sseUrl = `http://localhost:${PORT}/preview-events/${type}`;
    const script = `\n<script>
(function() {
  'use strict';
  var initialVersion = null;
  function connect() {
    try {
      var es = new EventSource('${sseUrl}');
      es.onmessage = function(e) {
        var v = parseInt(e.data, 10);
        if (initialVersion === null) { initialVersion = v; return; }
        if (v !== initialVersion) { window.location.reload(); }
      };
      es.onerror = function() {
        es.close();
        setTimeout(connect, 2000);
      };
    } catch(err) {
      // SSE not supported — fall back to polling
      setInterval(function() {
        fetch('http://localhost:${PORT}/preview-version/${type}')
          .then(function(r){ return r.json(); })
          .then(function(d) {
            if (initialVersion === null) { initialVersion = d.version; return; }
            if (d.version !== initialVersion) { window.location.reload(); }
          }).catch(function(){});
      }, 1500);
    }
  }
  connect();
})();
</script>`;
    if (html && html.includes('</body>')) {
        return html.replace('</body>', script + '\n</body>');
    }
    return html + script;
}


// IPC Request Router & Handler mapping
async function handleIpc(channel, payload) {
    console.log(`[Headless IPC] Handler: ${channel}`);

    switch (channel) {
        // Book engine channels
        case 'book-init-project':
            const info = await bookEngine.initProject(payload.targetDir, payload.config || {});
            return { success: true, data: info };

        case 'book-create-temp-example':
            const tempDir = await bookEngine.createTempExample(payload.type, payload.config, payload.chapters, payload.structure);
            return { success: true, tempDir };

        case 'book-build':
            const buildRes = await bookEngine.build(payload.rootDir, payload.options || {});
            return { success: true, outputDir: buildRes.outputDir };

        case 'book-export-pdf':
            await bookEngine.exportPdf(payload.rootDir, payload.outputPath, payload.options || {});
            return { success: true, filePath: payload.outputPath };

        case 'book-load-structure':
            try {
                const config = await bookEngine.loadConfig(payload.rootDir);
                const summary = await bookEngine.loadSummary(payload.rootDir, config);
                return {
                    success: true,
                    data: {
                        config,
                        structure: summary.tree,
                        summaryText: summary.raw,
                        rootDir: payload.rootDir
                    }
                };
            } catch (error) {
                return { success: false, error: error.message };
            }

        case 'book-add-chapter':
            const addRes = await bookEngine.addChapter(payload.rootDir, payload.title, payload.type);
            return addRes;

        case 'book-remove-chapter':
            const remRes = await bookEngine.removeChapter(payload.rootDir, payload.chapterFile);
            return remRes;

        case 'book-reorder-chapters':
            const reoRes = await bookEngine.reorderChapters(payload.rootDir, payload.chapters);
            return reoRes;

        case 'book-add-appendix':
            const addApp = await bookEngine.addAppendix(payload.rootDir, payload.title);
            return addApp;

        case 'book-remove-appendix':
            const remApp = await bookEngine.removeAppendix(payload.rootDir, payload.appendixFile);
            return remApp;

        case 'book-get-structure':
            const getStr = await bookEngine.getStructure(payload.rootDir);
            return getStr;

        case 'book-search':
            const searchRes = await bookEngine.search(payload.rootDir, payload.query);
            return searchRes;

        case 'book-serve': {
            try {
                const serveOptions = {
                    watch: payload.watch,
                    port: PORT,
                    ...(payload.options || {})
                };
                const result = await bookEngine.serve(payload.rootDir, serveOptions);
                activeBookServe = result.outputDir;
                return { success: true, port: result.port };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        case 'book-stop-server':
            try {
                await bookEngine.stopServer();
                activeBookServe = null;
                return { success: true };
            } catch (err) {
                return { success: false, error: err.message };
            }

        // File system operations
        case 'read-file': {
            try {
                let targetPath = null;
                if (typeof payload === 'string') {
                    targetPath = payload;
                } else if (payload && typeof payload === 'object') {
                    targetPath = payload.filePath || payload.path || payload.file;
                }
                if (!targetPath) {
                    return { success: false, error: 'No file path provided to read-file' };
                }
                const normalized = path.normalize(targetPath);
                if (!fs.existsSync(normalized)) {
                    return { success: false, error: `File not found: ${normalized}`, code: 'ENOENT' };
                }
                const content = fs.readFileSync(normalized, 'utf-8');
                return { success: true, content, filePath: normalized };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        case 'save-file':
            fs.writeFileSync(payload.filePath, payload.content, 'utf-8');
            return { success: true, filePath: payload.filePath };

        case 'export-html':
            fs.writeFileSync(payload.filePath, payload.html, 'utf-8');
            return { success: true, filePath: payload.filePath };

        // CV operations
        case 'preview-cv': {
            const tempCvPath = path.join(getUserDataPath(), 'temp-cv-preview.html');
            // Inject auto-reload script before writing
            const cvHtmlWithReload = injectLiveReloadScript(payload.html, 'cv');
            fs.writeFileSync(tempCvPath, cvHtmlWithReload, 'utf-8');
            cvPreviewWindowOpen = true;
            // Bump version and notify all SSE clients
            cvPreviewVersion++;
            for (const client of cvSseClients) {
                try { client.write(`data: ${cvPreviewVersion}\n\n`); } catch (_) { cvSseClients.delete(client); }
            }
            return { success: true, filePath: tempCvPath };
        }

        case 'is-cv-preview-open':
            return cvPreviewWindowOpen;

        case 'save-cv-html':
            fs.writeFileSync(payload.filePath, payload.html, 'utf-8');
            return { success: true, filePath: payload.filePath };

        case 'export-cv-pdf': {
            const puppeteerCv = require('puppeteer');
            const launchOpts = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            const sysBrowser = findSystemBrowser();
            if (sysBrowser) launchOpts.executablePath = sysBrowser;
            const browserCv = await puppeteerCv.launch(launchOpts);
            const pageCv = await browserCv.newPage();
            await pageCv.setContent(payload.html, { waitUntil: 'networkidle0' });
            const pdfCvBuffer = await pageCv.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });
            await browserCv.close();
            fs.writeFileSync(payload.filePath, pdfCvBuffer);
            return { success: true, filePath: payload.filePath };
        }

        // Presentation operations
        case 'preview-presentation': {
            const tempPresPath = path.join(getUserDataPath(), 'temp-presentation-preview.html');
            // Inject auto-reload script before writing
            const presHtmlWithReload = injectLiveReloadScript(payload.html, 'presentation');
            fs.writeFileSync(tempPresPath, presHtmlWithReload, 'utf-8');
            presentationWindowOpen = true;
            // Bump version and notify all SSE clients
            presentationPreviewVersion++;
            for (const client of presentationSseClients) {
                try { client.write(`data: ${presentationPreviewVersion}\n\n`); } catch (_) { presentationSseClients.delete(client); }
            }
            return { success: true, filePath: tempPresPath };
        }

        case 'is-presentation-preview-open':
            return presentationWindowOpen;

        case 'save-presentation-html':
            fs.writeFileSync(payload.filePath, payload.html, 'utf-8');
            return { success: true, filePath: payload.filePath };

        case 'export-presentation-pdf': {
            const puppeteerPres = require('puppeteer');
            const launchOpts = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            const sysBrowser = findSystemBrowser();
            if (sysBrowser) launchOpts.executablePath = sysBrowser;
            const browserPres = await puppeteerPres.launch(launchOpts);
            const pagePres = await browserPres.newPage();
            
            const pdfHtml = payload.html.replace(/<body([^>]*)>/i, (match, attrs) => {
                if (/class=/i.test(attrs)) {
                    return `<body${attrs.replace(/class=("|')(.*?)\1/i, (original, quote, classes) => `class=${quote}${classes} print-layout pdf-export${quote}`)}>`;
                }
                return `<body${attrs} class="print-layout pdf-export">`;
            });
            
            await pagePres.setViewport({ width: 1920, height: 1080 });
            await pagePres.setContent(pdfHtml, { waitUntil: 'networkidle0' });
            await pagePres.evaluate(() => {
                if (typeof window.enablePresentationPrintLayout === 'function') {
                    window.enablePresentationPrintLayout();
                }
            });
            const pdfPresBuffer = await pagePres.pdf({
                printBackground: true,
                landscape: true,
                preferCSSPageSize: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });
            await browserPres.close();
            fs.writeFileSync(payload.filePath, pdfPresBuffer);
            return { success: true, filePath: payload.filePath };
        }

        case 'export-presentation-pptx': {
            try {
                const PPTXExporter = require('../renderer/js/pptx-exporter.js');
                await PPTXExporter.exportCurrent(payload.markdown, payload.filePath, payload.currentFileDir, payload.renderedSlides);
                return { success: true, filePath: payload.filePath };
            } catch (err) {
                console.error('[Headless IPC] export-presentation-pptx error:', err);
                return { success: false, error: err.message };
            }
        }

        case 'associate-file-extensions': {
            if (process.platform === 'win32') {
                const targetExe = getAppExecutablePath();
                if (!targetExe) return { success: false, error: 'markdd-editor.exe not found on system' };
                const exec = require('child_process').exec;
                const cmd = `reg add "HKCU\\Software\\Classes\\MarkDD.MarkdownFile" /ve /d "Markdown Document" /f && ` +
                            `reg add "HKCU\\Software\\Classes\\MarkDD.MarkdownFile\\shell\\open\\command" /ve /d "\\"${targetExe}\\" \\"%1\\"" /f && ` +
                            `reg add "HKCU\\Software\\Classes\\.md" /ve /d "MarkDD.MarkdownFile" /f && ` +
                            `reg add "HKCU\\Software\\Classes\\.markdown" /ve /d "MarkDD.MarkdownFile" /f && ` +
                            `reg add "HKCU\\Software\\Classes\\.mdown" /ve /d "MarkDD.MarkdownFile" /f && ` +
                            `reg add "HKCU\\Software\\Classes\\.mdwn" /ve /d "MarkDD.MarkdownFile" /f`;
                exec(cmd, (err) => {
                    if (err) console.warn('[Main] Failed to associate file extensions:', err);
                    else console.log('[Main] File extensions successfully associated for:', targetExe);
                });
                return { success: true };
            }
            return { success: false, error: 'Not supported on this platform' };
        }

        // TikZJax Server-side Compilation
        case 'render-tikz-server-side':
            let tikzjax;
            try {
                tikzjax = require('node-tikzjax');
            } catch (err) {
                // Try from local References path fallback
                const localPath = path.join(process.cwd(), 'References', 'node-tikzjax-main', 'dist', 'index.js');
                if (fs.existsSync(localPath)) {
                    tikzjax = require(localPath);
                } else {
                    throw err;
                }
            }
            const svg = await tikzjax.pdf(payload.tikzCode);
            return { success: true, svg };

        // General PDF Generation via Puppeteer
        case 'export-pdf': {
            const puppeteer = require('puppeteer');
            const launchOpts = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            const sysBrowser = findSystemBrowser();
            if (sysBrowser) launchOpts.executablePath = sysBrowser;
            const browser = await puppeteer.launch(launchOpts);
            const page = await browser.newPage();
            await page.setContent(payload.html, { waitUntil: 'networkidle0' });
            
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                preferCSSPageSize: true
            });
            await browser.close();
            fs.writeFileSync(payload.filePath, pdfBuffer);
            return { success: true, filePath: payload.filePath };
        }

        case 'export-mindmap-pdf': {
            const puppeteerMm = require('puppeteer');
            const launchOpts = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            };
            const sysBrowser = findSystemBrowser();
            if (sysBrowser) launchOpts.executablePath = sysBrowser;
            const browserMm = await puppeteerMm.launch(launchOpts);
            const pageMm = await browserMm.newPage();
            const wrapperHtml = `<html><body style="margin:0;display:flex;justify-content:center;align-items:center;"><img src="${payload.imageData}" style="max-width:100%;max-height:100%;object-fit:contain;"/></body></html>`;
            await pageMm.setContent(wrapperHtml, { waitUntil: 'networkidle0' });
            const pdfMm = await pageMm.pdf({
                format: 'A4',
                printBackground: true,
                landscape: true
            });
            await browserMm.close();
            fs.writeFileSync(payload.filePath, pdfMm);
            return { success: true, filePath: payload.filePath };
        }

        // Path & Directory utilities
        case 'get-cwd':
            return { success: true, cwd: process.cwd() };

        case 'get-app-path':
            return { success: true, path: path.join(__dirname, '../..') };

        case 'get-user-data-path':
            return { success: true, path: getUserDataPath() };

        case 'get-examples-path':
            const exPath = path.join(__dirname, '../../examples');
            return { success: true, path: exPath };

        case 'get-package-data':
            return { success: true, data: packageData };

        case 'read-license':
            const lic = fs.readFileSync(path.join(__dirname, '../../LICENSE'), 'utf-8');
            return { success: true, content: lic };

        case 'read-third-party-licenses':
            const tp = fs.readFileSync(path.join(__dirname, '../../THIRD-PARTY-LICENSES.md'), 'utf-8');
            return { success: true, content: tp };

        case 'open-external':
            const exec = require('child_process').exec;
            const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
            exec(`${startCmd} "${payload}"`);
            return { success: true };

        case 'get-startup-file': {
            const fileToReturn = startupFilePath;
            startupFilePath = null;
            return { success: true, filePath: fileToReturn };
        }

        case 'serve-local-image': {
            // Returns a data-URI for a local image so the renderer can embed it
            const imgPath = payload.filePath || payload.path || payload;
            if (!imgPath) return { success: false, error: 'No path provided' };
            try {
                const ext = path.extname(imgPath).toLowerCase();
                const mimes = {
                    '.png':  'image/png',
                    '.jpg':  'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif':  'image/gif',
                    '.webp': 'image/webp',
                    '.svg':  'image/svg+xml',
                    '.bmp':  'image/bmp',
                };
                const mime = mimes[ext] || 'image/png';
                const data = fs.readFileSync(imgPath);
                const base64 = data.toString('base64');
                const dataUri = `data:${mime};base64,${base64}`;
                // Also provide the HTTP URL alternative
                const httpUrl = `http://localhost:3001/fs/serve-image?path=${encodeURIComponent(imgPath)}`;
                return { success: true, dataUri, httpUrl, mime };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        case 'app-quit':
            process.exit(0);

        default:
            throw new Error(`Unsupported IPC channel: ${channel}`);
    }
}

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        if (startupFilePath) {
            console.log('[Headless Backend] Instance already running on port 3001. Forwarding startup file:', startupFilePath);
            const reqData = JSON.stringify({ filePath: startupFilePath });
            const req = http.request({
                hostname: 'localhost',
                port: PORT,
                path: '/open-file-instance',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(reqData)
                }
            }, () => {
                process.exit(0);
            });
            req.on('error', () => process.exit(0));
            req.write(reqData);
            req.end();
        } else {
            console.log('[Headless Backend] Primary instance already running on port 3001. Exiting secondary process.');
            process.exit(0);
        }
    } else {
        console.error('[Headless Backend] Server error:', err);
    }
});

server.listen(PORT, () => {
    console.log(`[Headless Backend] Listening on http://localhost:${PORT}`);
});
