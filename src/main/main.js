const { app, BrowserWindow, dialog, ipcMain, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { getVersion } = require('../version');

let mainWindow;
let currentFile = null;

const isDev = process.argv.includes('--dev');

// Enhanced logging for debugging
function logError(context, error) {
  console.error(`[${new Date().toISOString()}] ERROR in ${context}:`, error);
}

function logInfo(context, message) {
  if (isDev) {
    console.log(`[${new Date().toISOString()}] INFO in ${context}:`, message);
  }
}

function createWindow() {
  logInfo('Main', 'Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: false
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Enhanced error handling for renderer process
  mainWindow.webContents.on('crashed', (event) => {
    logError('Renderer', 'Renderer process crashed');
  });

  mainWindow.webContents.on('unresponsive', () => {
    logError('Renderer', 'Renderer process became unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    logInfo('Renderer', 'Renderer process became responsive again');
  });

  // Forward console messages from renderer to main process (ALWAYS enabled for debugging)
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelNames = ['VERBOSE', 'INFO', 'WARNING', 'ERROR'];
    const levelName = levelNames[level] || 'UNKNOWN';
    console.log(`[${new Date().toISOString()}] RENDERER-${levelName}: ${message}`);
  });

  // Register keyboard shortcuts for DevTools (works in both dev and production)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 or Ctrl+Shift+I to toggle DevTools
    if (input.type === 'keyDown') {
      if (input.key === 'F12' || 
          (input.control && input.shift && input.key === 'I')) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools();
        }
      }
    }
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    logInfo('Main', 'Main window is ready to show');
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
      logInfo('Main', 'DevTools opened for debugging');
    }

    // DEV-AUTORUN: If running in dev and MARKDD_DEV_AUTORUN_EXPORT is set,
    // trigger a one-time export from the renderer and save to the provided path.
    // This is strictly dev-only and gated by the isDev flag and env var.
    try {
      const autorunPath = process.env.MARKDD_DEV_AUTORUN_EXPORT;
      if (isDev && autorunPath) {
        logInfo('Main', `DEV autorun export requested: ${autorunPath}`);
        // Execute in renderer: build export HTML and call ipcRenderer.invoke('export-pdf', ...)
        const escPath = JSON.stringify(autorunPath);
        mainWindow.webContents.executeJavaScript(`(async function(){
          try{
            const preview = window.markddApp && window.markddApp.getPreview ? window.markddApp.getPreview() : null;
            if(!preview) return { success: false, error: 'Preview API not available' };
            const html = await preview.exportAsHTML({ title: preview.getCurrentFileName() });
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('export-pdf', {
              fileName: preview.getCurrentFileName().replace(/\\.md$/i, '.pdf'),
              html: html,
              devAutoSavePath: ${escPath}
            });
          }catch(e){ return { success: false, error: e && e.message ? e.message : String(e) } }
        })()`)
        .then(res => logInfo('Main', `DEV autorun export result: ${JSON.stringify(res)}`))
        .catch(err => logError('Main', `DEV autorun executeJavaScript failed: ${err && err.message ? err.message : String(err)}`));
      }
    } catch (e) {
      logError('Main', `DEV autorun scheduling failed: ${e && e.message ? e.message : String(e)}`);
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    logInfo('Main', 'Main window closed');
    mainWindow = null;
  });

  // Handle fullscreen state changes
  mainWindow.on('enter-full-screen', () => {
    logInfo('Main', 'Entered fullscreen mode');
    mainWindow.webContents.send('window-fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    logInfo('Main', 'Exited fullscreen mode');
    mainWindow.webContents.send('window-fullscreen-changed', false);
  });

  // Handle maximize/unmaximize state changes
  mainWindow.on('maximize', () => {
    logInfo('Main', 'Window maximized');
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    logInfo('Main', 'Window unmaximized');
    mainWindow.webContents.send('window-unmaximized');
  });

  // Hide/remove the default menu bar for custom HTML menu
  mainWindow.setMenuBarVisibility(false);
}

function showAboutWindow() {
  // Read package.json data dynamically
  let packageData;
  try {
    const packagePath = require('path').join(__dirname, '..', '..', 'package.json');
    packageData = JSON.parse(require('fs').readFileSync(packagePath, 'utf8'));
  } catch (error) {
    console.error('Failed to read package.json:', error);
    // Fallback data
    packageData = {
      name: 'MarkDD Editor',
      version: getVersion(),
      description: 'A fully-featured Markdown editor',
      author: 'MarkDD Team'
    };
  }

  // Create feature list from dependencies and capabilities
  const features = [
    '📝 Advanced Markdown editing with real-time preview',
    '🔢 Mathematical expressions with KaTeX',
    '📊 Mermaid diagrams and flowcharts',
    '🗺️ Markmap mind mapping',
    '⚡ TikZ/CircuiTikZ diagram support',
    '🎨 Syntax highlighting for 100+ languages',
    '📤 Export to HTML and PDF',
    '🌙 Dark/Light theme support',
    '🔄 Live sync between editor and preview'
  ];

  const aboutMessage = `${packageData.name || 'MarkDD Editor'}

Version: ${packageData.version || getVersion()}
Author: ${packageData.author || 'MarkDD Team'}

${packageData.description || 'A fully-featured Markdown editor with advanced preview and export capabilities.'}

Key Features:
${features.join('\n')}

Built with Electron ${process.versions.electron}
Node.js ${process.versions.node}
Chromium ${process.versions.chrome}

© 2024 MarkDD Team. All rights reserved.`;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: `About ${packageData.name || 'MarkDD Editor'}`,
    message: packageData.name || 'MarkDD Editor',
    detail: aboutMessage,
    buttons: ['OK'],
    defaultId: 0
  });
}

// Store file to open on startup
let fileToOpen = null;

// Handle file opening from command line or file association
function handleFileOpen(filePath) {
  console.log('[Main] handleFileOpen called with:', filePath);
  
  // Fixed condition: parentheses matter!
  if (filePath && (filePath.endsWith('.md') || filePath.endsWith('.markdown'))) {
    console.log('[Main] Valid markdown file detected, storing for startup');
    fileToOpen = filePath;
    
    if (mainWindow && mainWindow.webContents) {
      // If window is already open, send file to renderer
      console.log('[Main] Window already open, sending file to renderer');
      mainWindow.webContents.send('open-file-from-system', filePath);
    } else {
      console.log('[Main] Window not ready yet, file will be loaded on startup');
    }
  } else {
    console.log('[Main] Not a markdown file or invalid path');
  }
}

// App event handlers
app.whenReady().then(() => {
  console.log('[Main] App is ready, creating window...');
  console.log('[Main] Command line arguments:', process.argv);
  
  // Register global shortcuts for DevTools (works even if window loses focus)
  try {
    const devToolsRegistered = globalShortcut.register('F12', () => {
      if (mainWindow && mainWindow.webContents) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
          console.log('[Main] DevTools closed via F12');
        } else {
          mainWindow.webContents.openDevTools();
          console.log('[Main] DevTools opened via F12');
        }
      }
    });
    
    const devToolsAltRegistered = globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow && mainWindow.webContents) {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
          console.log('[Main] DevTools closed via Ctrl+Shift+I');
        } else {
          mainWindow.webContents.openDevTools();
          console.log('[Main] DevTools opened via Ctrl+Shift+I');
        }
      }
    });
    
    if (devToolsRegistered && devToolsAltRegistered) {
      console.log('[Main] Global shortcuts registered: F12 and Ctrl+Shift+I');
    } else {
      console.log('[Main] Warning: Some shortcuts failed to register');
    }
  } catch (err) {
    console.error('[Main] Error registering global shortcuts:', err);
  }
  
  createWindow();
  
  // Check for file passed as command line argument
  // In production, process.argv[0] is the executable path
  // The file to open (if any) comes after
  if (process.argv.length > 1) {
    console.log('[Main] Checking command line arguments for file to open...');
    
    // Check all arguments (skip the first one which is the executable)
    for (let i = 1; i < process.argv.length; i++) {
      const arg = process.argv[i];
      console.log(`[Main] Checking argument ${i}:`, arg);
      
      // Skip flags and the executable itself
      if (!arg.startsWith('--') && !arg.endsWith('.exe')) {
        try {
          if (fs.existsSync(arg)) {
            console.log('[Main] Found existing file in arguments:', arg);
            handleFileOpen(arg);
            break; // Only open the first file found
          }
        } catch (err) {
          console.log('[Main] Error checking file existence:', err.message);
        }
      }
    }
  }
});

app.on('window-all-closed', () => {
  console.log('[Main] All windows closed');
  // Unregister all shortcuts before quitting
  globalShortcut.unregisterAll();
  console.log('[Main] Global shortcuts unregistered');
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle before-quit: check for unsaved changes
app.on('before-quit', (event) => {
  logInfo('Main', 'before-quit event triggered');
  
  // Only block quit if there's an open window with unsaved changes
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Prevent quit for now
    event.preventDefault();
    
    // Request unsaved tabs check from renderer
    mainWindow.webContents.send('check-unsaved-tabs');
    
    // Wait for response with a timeout
    let hasResponded = false;
    const responseTimeout = setTimeout(() => {
      if (!hasResponded) {
        logInfo('Main', 'No response to unsaved tabs check (timeout), allowing quit');
        app.quit();
      }
    }, 2000); // 2 second timeout
    
    // This will be called when renderer responds
    const handleResponse = (event, result) => {
      if (hasResponded) return;
      hasResponded = true;
      clearTimeout(responseTimeout);
      ipcMain.removeListener('unsaved-tabs-response', handleResponse);
      
      logInfo('Main', 'Unsaved tabs query result:', result);
      
      if (result.hasUnsaved) {
        // Show confirmation dialog
        dialog.showMessageBox(mainWindow, {
          type: 'question',
          title: 'Unsaved Changes',
          message: `You have ${result.count} file(s) with unsaved changes. Do you want to exit anyway?`,
          buttons: ['Cancel', 'Exit Without Saving'],
          defaultId: 0,
          cancelId: 0
        }).then((buttonIndex) => {
          if (buttonIndex.response === 1) {
            // User chose to exit without saving
            app.quit();
          }
        });
      } else {
        // No unsaved changes, proceed with quit
        app.quit();
      }
    };
    
    ipcMain.on('unsaved-tabs-response', handleResponse);
  }
});

app.on('activate', () => {
  console.log('[Main] App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file opening on macOS (double-click .md file)
app.on('open-file', (event, filePath) => {
  console.log('[Main] open-file event triggered:', filePath);
  event.preventDefault();
  handleFileOpen(filePath);
});

// Send pending file to renderer when window is ready
ipcMain.handle('get-startup-file', async () => {
  console.log('[Main] get-startup-file IPC called, fileToOpen:', fileToOpen);
  const file = fileToOpen;
  fileToOpen = null; // Clear after sending
  console.log('[Main] Returning file to renderer:', file);
  return { success: true, filePath: file };
});

// IPC handler to toggle DevTools from renderer
ipcMain.handle('toggle-devtools', async () => {
  console.log('[Main] toggle-devtools IPC called');
  if (mainWindow && mainWindow.webContents) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      console.log('[Main] DevTools closed via IPC');
      return { success: true, opened: false };
    } else {
      mainWindow.webContents.openDevTools();
      console.log('[Main] DevTools opened via IPC');
      return { success: true, opened: true };
    }
  }
  return { success: false, error: 'No main window' };
});

// IPC handlers
ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf-8');
      currentFile = filePath;
      return { success: true, filePath };
    } else {
      const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled) {
        fs.writeFileSync(result.filePath, content, 'utf-8');
        currentFile = result.filePath;
        return { success: true, filePath: result.filePath };
      }
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-html', async (event, { html, fileName }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName || 'export.html',
      filters: [
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled) {
      fs.writeFileSync(result.filePath, html, 'utf-8');
      return { success: true, filePath: result.filePath };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-mindmap-pdf', async (event, { imageData, fileName }) => {
  try {
    logInfo('Mindmap PDF', `Starting mindmap PDF export: ${fileName}`);
    
    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Mindmap as PDF',
      defaultPath: fileName,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export cancelled by user' };
    }
    
    const savePath = result.filePath;
    logInfo('Mindmap PDF', `Target path: ${savePath}`);
    
    // Use Puppeteer to create PDF from PNG
    const puppeteer = require('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Create HTML with centered image
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            background: white;
          }
          img { 
            max-width: 100%; 
            max-height: 100vh; 
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img src="${imageData}" alt="Mind Map">
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for image to load
    await page.waitForSelector('img', { timeout: 5000 });
    await page.evaluate(() => new Promise(resolve => {
      const img = document.querySelector('img');
      if (img.complete) {
        resolve();
      } else {
        img.onload = resolve;
        img.onerror = resolve;
      }
    }));
    
    // Generate PDF
    await page.pdf({
      path: savePath,
      format: 'A4',
      landscape: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true
    });
    
    await browser.close();
    
    logInfo('Mindmap PDF', `PDF exported successfully to: ${savePath}`);
    return { success: true, filePath: savePath };
    
  } catch (error) {
    logError('Mindmap PDF', `PDF export failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pdf', async (event, { fileName, html, devAutoSavePath }) => {
  try {
    logInfo('PDF', `Starting PDF export: ${fileName}`);
    
    // Use Puppeteer for PDF generation to ensure proper rendering
    const puppeteer = require('puppeteer');
    
    // Determine save path
    let savePath;
    if (devAutoSavePath) {
      savePath = devAutoSavePath;
    } else {
      const result = await dialog.showSaveDialog({
        title: 'Export as PDF',
        defaultPath: fileName,
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled by user' };
      }
      savePath = result.filePath;
    }
    
    logInfo('PDF', `Target path: ${savePath}`);
    
    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2
    });
    
    // Load the HTML content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load'],
      timeout: 60000
    });
    
    // Wait for MathJax rendering to complete
    await page.evaluate(() => {
      return new Promise((resolve) => {
        if (window.MathJax && window.MathJax.typesetPromise) {
          window.MathJax.typesetPromise().then(() => {
            // Give extra time for SVG rendering
            setTimeout(resolve, 1000);
          }).catch(() => {
            setTimeout(resolve, 1000);
          });
        } else {
          setTimeout(resolve, 2000);
        }
      });
    });
    
    // Generate PDF with high quality settings
    await page.pdf({
      path: savePath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: false
    });
    
    await browser.close();
    
    logInfo('PDF', `PDF exported successfully to: ${savePath}`);
    return { success: true, filePath: savePath };
    
  } catch (error) {
    logError('PDF', `PDF export failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// TikZ server-side rendering handler - STRICT LOCAL ONLY
ipcMain.handle('render-tikz-server-side', async (event, { tikzCode, isCircuit = false }) => {
  try {
    logInfo('TikZ', `Rendering TikZ diagram, isCircuit: ${isCircuit}`);

    // STRICT LOCAL ONLY: Use only local node-tikzjax-main repository
    const localTikZJaxPath = path.join(process.cwd(), 'References', 'node-tikzjax-main', 'dist', 'index.js');

    if (!fs.existsSync(localTikZJaxPath)) {
      logError('TikZ', `Local node-tikzjax not found at: ${localTikZJaxPath}`);
      return {
        success: false,
        error: `Local node-tikzjax repository not found at ${localTikZJaxPath}. Please ensure the repository is properly cloned.`, 
        method: 'local-missing'
      };
    }

    const tikzjax = require(localTikZJaxPath);

    // Helper function to clean up TikZ source code (minimal processing to preserve structure)
    function tidyTikzSource(code) {
        // Only trim trailing whitespace from each line, preserve empty lines and indentation
        return code.split('\n').map(line => line.trimEnd()).join('\n');
    }

    const finalCode = tidyTikzSource(tikzCode);

    logInfo('TikZ', `Final TikZ code to render: ${finalCode.substring(0, 100)}...`);

    // CRITICAL FIX v3: node-tikzjax format requirements (see demo/input/sample*.tex)
    // 1. NO \documentclass (added internally by node-tikzjax)
    // 2. Optional \usepackage commands
    // 3. \begin{document} ... \end{document}
    // 4. NO empty lines in document structure (causes LaTeX input errors)
    let wrappedCode;
    if (finalCode.includes('\\begin{document}')) {
      // Code already has \begin{document}
      // Check if it has \documentclass - if so, remove it
      if (finalCode.includes('\\documentclass')) {
        // Remove \documentclass line (node-tikzjax adds it automatically)
        wrappedCode = finalCode.replace(/\\documentclass(\[.*?\])?\{.*?\}\s*/g, '');
        logInfo('TikZ', 'Removed \\documentclass from user input (node-tikzjax adds it automatically)');
      } else {
        wrappedCode = finalCode;
      }
    } else {
      // Wrap raw TikZ code with packages and document environment
      const packages = isCircuit ? 
        '\\usepackage{tikz}\n\\usepackage{circuitikz}' : 
        '\\usepackage{tikz}';
      
      // Detect if code is already wrapped in tikzpicture/circuitikz environment
      if (finalCode.trim().startsWith('\\begin{tikzpicture}') || 
          finalCode.trim().startsWith('\\begin{circuitikz}')) {
        wrappedCode = `${packages}\n\\begin{document}\n${finalCode}\n\\end{document}`;
      } else {
        // Raw TikZ commands - wrap in tikzpicture environment
        const environment = isCircuit ? 'circuitikz' : 'tikzpicture';
        wrappedCode = `${packages}\n\\begin{document}\n\\begin{${environment}}\n${finalCode}\n\\end{${environment}}\n\\end{document}`;
      }
    }

    logInfo('TikZ', `Wrapped LaTeX document (first 200 chars): ${wrappedCode.substring(0, 200)}...`);

    // Configure options for node-tikzjax (no texPackages needed since we handle packages manually)
    const options = {
      showConsole: true
    };

    // Render with local node-tikzjax ONLY
    const svgResult = await tikzjax.default(wrappedCode, options);

    logInfo('TikZ', 'Local node-tikzjax rendering successful');
    return {
      success: true,
      svg: svgResult,
      method: 'local-node-tikzjax'
    };

  } catch (error) {
    logError('TikZ', `Local node-tikzjax failed: ${error.message}`);
    return {
      success: false,
      error: `Local node-tikzjax rendering failed: ${error.message}`,
      method: 'local-failed'
    };
  }
});

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

// IPC handler for open-file-dialog (renderer invokes this to open a file)
ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown', 'mdown', 'mkd'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const content = fs.readFileSync(filePath, 'utf-8');
      currentFile = filePath;
      return { filePath, content };
    }
    return { canceled: true };
  } catch (error) {
    return { canceled: true, error: error.message };
  }
});

// File browser IPC handlers
ipcMain.handle('open-folder-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const folderPath = result.filePaths[0];
      mainWindow.webContents.send('folder-opened', folderPath);
      return { success: true, folderPath };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-file-tree', async (event, folderPath) => {
  try {
    return await getFileTree(folderPath);
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
});

ipcMain.handle('get-directory-children', async (event, dirPath) => {
  try {
    const children = await getDirectoryChildren(dirPath);
    return children;
  } catch (error) {
    throw new Error(`Failed to read directory children: ${error.message}`);
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('create-file', async (event, parentPath, fileName) => {
  try {
    const filePath = path.join(parentPath, fileName);
    fs.writeFileSync(filePath, '');
    return { success: true, filePath };
  } catch (error) {
    throw new Error(`Failed to create file: ${error.message}`);
  }
});

ipcMain.handle('create-folder', async (event, parentPath, folderName) => {
  try {
    const folderPath = path.join(parentPath, folderName);
    fs.mkdirSync(folderPath);
    return { success: true, folderPath };
  } catch (error) {
    throw new Error(`Failed to create folder: ${error.message}`);
  }
});

// New enhanced file operations
ipcMain.handle('read-directory', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = items.map(item => ({
      name: item.name,
      path: path.join(dirPath, item.name),
      isDirectory: item.isDirectory()
    }));
    return { success: true, files };
  } catch (error) {
    logError('IPC', `Failed to read directory: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-new-file', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Create New File',
      defaultPath: 'Untitled.md',
      filters: [
        { name: 'Markdown Files', extensions: ['md', 'markdown'] },
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, '# New Document\n\nStart writing here...');
      return { 
        success: true, 
        filePath: result.filePath,
        content: '# New Document\n\nStart writing here...'
      };
    }
    return { success: false };
  } catch (error) {
    logError('IPC', `Failed to create new file: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-new-folder', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Location for New Folder',
      properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const parentDir = result.filePaths[0];
      const folderName = 'New Folder';
      let finalPath = path.join(parentDir, folderName);
      let counter = 1;
      
      // Handle naming conflicts
      while (fs.existsSync(finalPath)) {
        finalPath = path.join(parentDir, `${folderName} ${counter}`);
        counter++;
      }
      
      fs.mkdirSync(finalPath);
      return { success: true, folderPath: finalPath };
    }
    return { success: false };
  } catch (error) {
    logError('IPC', `Failed to create new folder: ${error.message}`);
    return { success: false, error: error.message };
  }
});

// Utility functions for file tree
async function getFileTree(dirPath) {
  const stat = fs.statSync(dirPath);
  const name = path.basename(dirPath);
  
  if (stat.isDirectory()) {
    const children = await getDirectoryChildren(dirPath);
    return {
      name,
      path: dirPath,
      type: 'directory',
      expanded: false,
      children: children
    };
  } else {
    return {
      name,
      path: dirPath,
      type: 'file'
    };
  }
}

async function getDirectoryChildren(dirPath) {
  try {
    const items = fs.readdirSync(dirPath);
    const children = [];
    
    for (const item of items) {
      // Skip hidden files and node_modules
      if (item.startsWith('.') || item === 'node_modules') {
        continue;
      }
      
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        children.push({
          name: item,
          path: itemPath,
          type: 'directory',
          expanded: false,
          children: null // Load on demand
        });
      } else {
        children.push({
          name: item,
          path: itemPath,
          type: 'file'
        });
      }
    }
    
    // Sort directories first, then files, both alphabetically
    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    return children;
  } catch (error) {
    return [];
  }
}

// Get package.json data for about dialog
ipcMain.handle('get-package-data', async () => {
  try {
    const packagePath = require('path').join(__dirname, '..', '..', 'package.json');
    const packageData = JSON.parse(require('fs').readFileSync(packagePath, 'utf8'));
    return {
      success: true,
      data: {
        name: packageData.name,
        version: packageData.version,
        description: packageData.description,
        author: packageData.author
      }
    };
  } catch (error) {
    console.error('Failed to read package.json:', error);
    return {
      success: false,
      data: {
        name: 'MarkDD Editor',
        version: getVersion(),
        description: 'A fully-featured Markdown editor',
        author: 'MarkDD Team'
      }
    };
  }
});

// Read LICENSE file handler
ipcMain.handle('read-license', async () => {
  try {
    const licensePath = path.join(__dirname, '..', '..', 'LICENSE');
    const licenseContent = fs.readFileSync(licensePath, 'utf8');
    return {
      success: true,
      content: licenseContent
    };
  } catch (error) {
    console.error('Failed to read LICENSE file:', error);
    return {
      success: false,
      error: error.message,
      content: 'MIT License - See LICENSE file in application directory'
    };
  }
});

// Read third-party licenses handler
ipcMain.handle('read-third-party-licenses', async () => {
  try {
    const licensesPath = path.join(__dirname, '..', '..', 'THIRD-PARTY-LICENSES.md');
    const licensesContent = fs.readFileSync(licensesPath, 'utf8');
    return {
      success: true,
      content: licensesContent
    };
  } catch (error) {
    console.error('Failed to read THIRD-PARTY-LICENSES.md:', error);
    return {
      success: false,
      error: error.message,
      content: 'Third-party licenses information not available'
    };
  }
});

// Plugin installation handlers
ipcMain.handle('get-available-plugins', async () => {
  const { execSync } = require('child_process');
  
  // List of recommended plugins with descriptions
  const recommendedPlugins = [
    {
      name: '@cartamd/plugin-math',
      description: 'Enhanced math rendering with KaTeX',
      version: 'latest',
      type: 'carta'
    },
    {
      name: '@cartamd/plugin-code',
      description: 'Advanced code highlighting and features',
      version: 'latest',
      type: 'carta'
    },
    {
      name: '@cartamd/plugin-emoji',
      description: 'Emoji support for markdown',
      version: 'latest',
      type: 'carta'
    },
    {
      name: 'remark-gfm',
      description: 'GitHub Flavored Markdown support',
      version: 'latest',
      type: 'remark'
    },
    {
      name: 'remark-toc',
      description: 'Table of contents generation',
      version: 'latest',
      type: 'remark'
    },
    {
      name: 'remark-footnotes',
      description: 'Footnotes support',
      version: 'latest',
      type: 'remark'
    }
  ];

  try {
    // Check which plugins are already installed
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const installedDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    return recommendedPlugins.map(plugin => ({
      ...plugin,
      installed: !!installedDeps[plugin.name],
      currentVersion: installedDeps[plugin.name] || null
    }));
  } catch (error) {
    logError('Get Available Plugins', error);
    return recommendedPlugins.map(plugin => ({ ...plugin, installed: false }));
  }
});

ipcMain.handle('install-plugin', async (event, pluginName) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    logInfo('Plugin Install', `Installing ${pluginName}...`);
    
    exec(`npm install ${pluginName}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        logError('Plugin Install', error);
        resolve({
          success: false,
          error: error.message,
          stderr: stderr
        });
      } else {
        logInfo('Plugin Install', `Successfully installed ${pluginName}`);
        resolve({
          success: true,
          stdout: stdout
        });
      }
    });
  });
});

ipcMain.handle('uninstall-plugin', async (event, pluginName) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    logInfo('Plugin Uninstall', `Uninstalling ${pluginName}...`);
    
    exec(`npm uninstall ${pluginName}`, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        logError('Plugin Uninstall', error);
        resolve({
          success: false,
          error: error.message,
          stderr: stderr
        });
      } else {
        logInfo('Plugin Uninstall', `Successfully uninstalled ${pluginName}`);
        resolve({
          success: true,
          stdout: stdout
        });
      }
    });
  });
});

// App control handlers
ipcMain.handle('app-quit', async () => {
  try {
    app.quit();
    return { success: true };
  } catch (error) {
    logError('AppQuit', error);
    return { success: false, error: error.message };
  }
});

// About dialog handler
ipcMain.handle('show-about', async () => {
  try {
    showAboutWindow();
    return { success: true };
  } catch (error) {
    logError('ShowAbout', error);
    return { success: false, error: error.message };
  }
});

// Fullscreen toggle handler
ipcMain.handle('toggle-fullscreen', async () => {
  try {
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullscreen);
      return { success: true, isFullscreen: !isFullscreen };
    }
    return { success: false, error: 'Main window not available' };
  } catch (error) {
    logError('ToggleFullscreen', error);
    return { success: false, error: error.message };
  }
});

// Get fullscreen state handler
ipcMain.handle('get-fullscreen-state', async () => {
  try {
    if (mainWindow) {
      const isFullscreen = mainWindow.isFullScreen();
      return { success: true, isFullscreen };
    }
    return { success: false, error: 'Main window not available' };
  } catch (error) {
    logError('GetFullscreenState', error);
    return { success: false, error: error.message };
  }
});

// Window control handlers for KityMinder editor
ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      mainWindow.webContents.send('window-unmaximized');
    } else {
      mainWindow.maximize();
      mainWindow.webContents.send('window-maximized');
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.on('window-fullscreen', () => {
  if (mainWindow) {
    const isFullscreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullscreen);
    mainWindow.webContents.send('window-fullscreen-changed', !isFullscreen);
  }
});