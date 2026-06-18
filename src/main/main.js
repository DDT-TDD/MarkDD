const { app, BrowserWindow, dialog, ipcMain, shell, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { getVersion } = require('../version');
const { BookEngine } = require('../common/book-engine');

let mainWindow;
let currentFile = null;
const bookEngine = new BookEngine(console);
let activeBookServe = null;

const isDev = process.argv.includes('--dev');

// ============================================================================
// SINGLE INSTANCE LOCK
// Prevents multiple instances of the app when double-clicking files.
// If a second instance is launched, it sends the file path to the first instance.
// ============================================================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running - quit this one
  console.log('[Main] Another instance is already running. Quitting this instance.');
  app.quit();
} else {
  // This is the primary instance - handle second-instance events
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('[Main] Second instance detected, command line:', commandLine);
    
    // Focus the main window if it exists
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
      
      // Check if a file was passed in the command line
      for (let i = 1; i < commandLine.length; i++) {
        const arg = commandLine[i];
        if (!arg.startsWith('--') && !arg.endsWith('.exe')) {
          if (arg.endsWith('.md') || arg.endsWith('.markdown')) {
            try {
              if (fs.existsSync(arg)) {
                console.log('[Main] Opening file from second instance:', arg);
                // Send to renderer to open in a new tab
                if (mainWindow.webContents) {
                  mainWindow.webContents.send('open-file-from-system', arg);
                }
                break;
              }
            } catch (err) {
              console.log('[Main] Error checking file from second instance:', err.message);
            }
          }
        }
      }
    }
  });
}

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
      webSecurity: false,
      spellcheck: true  // Enable spellcheck for context menu corrections
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // ============================================================================
  // SPELLCHECK CONTEXT MENU
  // Shows spelling suggestions when right-clicking on misspelled words
  // ============================================================================
  mainWindow.webContents.on('context-menu', (event, params) => {
    // Build context menu with spell check suggestions
    const menuTemplate = [];
    
    // Add spelling suggestions if there are any
    if (params.misspelledWord && params.dictionarySuggestions.length > 0) {
      // Add each suggestion
      params.dictionarySuggestions.forEach(suggestion => {
        menuTemplate.push({
          label: suggestion,
          click: () => {
            mainWindow.webContents.replaceMisspelling(suggestion);
          }
        });
      });
      
      // Add separator after suggestions
      menuTemplate.push({ type: 'separator' });
      
      // Add "Add to Dictionary" option
      menuTemplate.push({
        label: 'Add to Dictionary',
        click: () => {
          mainWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord);
        }
      });
      
      menuTemplate.push({ type: 'separator' });
    }
    
    // Standard edit menu items (always shown)
    menuTemplate.push(
      { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
      { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
      { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
      { type: 'separator' },
      { label: 'Select All', role: 'selectAll' }
    );
    
    // Show the context menu
    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    contextMenu.popup();
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

  // Handle window close event - check for unsaved tabs before closing
  mainWindow.on('close', (event) => {
    // If already quitting or closing, allow it
    if (isQuitting || isClosingWindow) {
      return;
    }

    logInfo('Main', 'Window close event triggered');
    
    // Prevent default close
    event.preventDefault();
    
    // Set flag to prevent re-entry
    isClosingWindow = true;
    
    // Request unsaved tabs check from renderer
    mainWindow.webContents.send('check-unsaved-tabs-for-close');
    
    // Wait for response with a timeout
    let hasResponded = false;
    const responseTimeout = setTimeout(() => {
      if (!hasResponded) {
        logInfo('Main', 'No response to unsaved tabs check for close (timeout), allowing close');
        isClosingWindow = false;
        isQuitting = true;
        mainWindow.destroy();
      }
    }, 2000);
    
    const handleCloseResponse = async (event, result) => {
      if (hasResponded) return;
      hasResponded = true;
      clearTimeout(responseTimeout);
      ipcMain.removeListener('unsaved-tabs-close-response', handleCloseResponse);
      
      logInfo('Main', 'Unsaved tabs for close query result:', result);
      
      if (result.hasUnsaved) {
        const dialogResult = await handleUnsavedTabsDialog(result, 'close');
        
        if (dialogResult.proceed) {
          if (dialogResult.saveAll) {
            // Request renderer to save all tabs, then close
            mainWindow.webContents.send('save-all-tabs-then-close');
          } else {
            // User chose don't save, proceed with close
            isClosingWindow = false;
            isQuitting = true;
            mainWindow.destroy();
          }
        } else {
          // Cancelled - reset flag and stay open
          isClosingWindow = false;
        }
      } else {
        // No unsaved changes, proceed with close
        isClosingWindow = false;
        isQuitting = true;
        mainWindow.destroy();
      }
    };
    
    ipcMain.once('unsaved-tabs-close-response', handleCloseResponse);
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

ipcMain.handle('book-select-directory', async (event, options = {}) => {
  const dialogOptions = {
    title: options.title || 'Select Book Folder',
    defaultPath: options.defaultPath || app.getPath('documents'),
    properties: ['openDirectory']
  };
  if (options.allowCreate !== false) {
    dialogOptions.properties.push('createDirectory');
  }
  const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
  if (result.canceled || !result.filePaths || !result.filePaths.length) {
    return { canceled: true };
  }
  return { canceled: false, path: result.filePaths[0] };
});

ipcMain.handle('book-save-dialog', async (event, options = {}) => {
  const dialogOptions = {
    title: options.title || 'Save Book Output',
    defaultPath: options.defaultPath || path.join(app.getPath('documents'), options.defaultName || 'book-output'),
    filters: options.filters || []
  };
  const result = await dialog.showSaveDialog(mainWindow, dialogOptions);
  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle('book-init-project', async (event, payload = {}) => {
  try {
    const info = await bookEngine.initProject(payload.targetDir, payload.config || {});
    logInfo('BookInit', `Initialized project at ${payload.targetDir}`);
    return { success: true, data: info };
  } catch (error) {
    logError('BookInit', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-create-temp-example', async (event, payload = {}) => {
  try {
    const tempDir = await bookEngine.createTempExample(payload.type, payload.config, payload.chapters, payload.structure);
    logInfo('BookTempExample', `Created temp example at ${tempDir}`);
    return { success: true, tempDir };
  } catch (error) {
    logError('BookTempExample', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-build', async (event, payload = {}) => {
  try {
    const result = await bookEngine.build(payload.rootDir, payload.options || {});
    logInfo('BookBuild', `Book built to ${result.outputDir}`);
    return {
      success: true,
      outputDir: result.outputDir,
      metadata: result.manifest.metadata,
      chapters: result.manifest.chapters
    };
  } catch (error) {
    logError('BookBuild', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-export-pdf', async (event, payload = {}) => {
  try {
    await bookEngine.exportPdf(payload.rootDir, payload.outputPath, payload.options || {});
    logInfo('BookPDF', `PDF exported to ${payload.outputPath}`);
    return { success: true, filePath: payload.outputPath };
  } catch (error) {
    logError('BookPDF', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-serve', async (event, payload = {}) => {
  try {
    const result = await bookEngine.serve(payload.rootDir, { watch: payload.watch, port: payload.port });
    activeBookServe = { rootDir: payload.rootDir, port: result.port };
    logInfo('BookServe', `Serving book at http://localhost:${result.port}`);
    return { success: true, port: result.port };
  } catch (error) {
    logError('BookServe', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-stop-server', async () => {
  try {
    await bookEngine.stopServer();
    activeBookServe = null;
    logInfo('BookServe', 'Book server stopped');
    return { success: true };
  } catch (error) {
    logError('BookServe', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-load-structure', async (event, payload = {}) => {
  try {
    const config = await bookEngine.loadConfig(payload.rootDir);
    const summary = await bookEngine.loadSummary(payload.rootDir, config);
    logInfo('BookLoad', `Loaded structure for ${config.title}`);
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
    logError('BookLoad', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-search', async (event, payload = {}) => {
  try {
    const { rootDir, query } = payload;
    if (!query || query.trim().length < 2) {
      return { success: true, results: [] };
    }

    // Use BookEngine search method (to be implemented)
    const results = await bookEngine.searchContent(rootDir, query);
    logInfo('BookSearch', `Found ${results.length} results for "${query}"`);
    return { success: true, results };
  } catch (error) {
    logError('BookSearch', error);
    return { success: false, error: error.message };
  }
});

// Chapter Management Handlers
ipcMain.handle('book-add-chapter', async (event, payload = {}) => {
  try {
    const { rootDir, title, position } = payload;
    const result = await bookEngine.addChapter(rootDir, title, position);
    logInfo('BookAddChapter', `Added chapter "${title}"`);
    return { success: true, ...result };
  } catch (error) {
    logError('BookAddChapter', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-remove-chapter', async (event, payload = {}) => {
  try {
    const { rootDir, slug } = payload;
    const result = await bookEngine.removeChapter(rootDir, slug);
    logInfo('BookRemoveChapter', `Removed chapter "${slug}"`);
    return { success: true, ...result };
  } catch (error) {
    logError('BookRemoveChapter', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-reorder-chapters', async (event, payload = {}) => {
  try {
    const { rootDir, newOrder } = payload;
    const result = await bookEngine.reorderChapters(rootDir, newOrder);
    logInfo('BookReorderChapters', 'Reordered chapters');
    return { success: true, ...result };
  } catch (error) {
    logError('BookReorderChapters', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-add-appendix', async (event, payload = {}) => {
  try {
    const { rootDir, title } = payload;
    const result = await bookEngine.addAppendix(rootDir, title);
    logInfo('BookAddAppendix', `Added appendix "${title}"`);
    return { success: true, ...result };
  } catch (error) {
    logError('BookAddAppendix', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-remove-appendix', async (event, payload = {}) => {
  try {
    const { rootDir, slug } = payload;
    const result = await bookEngine.removeAppendix(rootDir, slug);
    logInfo('BookRemoveAppendix', `Removed appendix "${slug}"`);
    return { success: true, ...result };
  } catch (error) {
    logError('BookRemoveAppendix', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('book-get-structure', async (event, payload = {}) => {
  try {
    const { rootDir } = payload;
    const result = await bookEngine.getBookStructure(rootDir);
    return { success: true, ...result };
  } catch (error) {
    logError('BookGetStructure', error);
    return { success: false, error: error.message };
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

// Flag to prevent infinite loop in before-quit handler
let isQuitting = false;
let isClosingWindow = false;

// Helper function to handle unsaved tabs with proper dialog
async function handleUnsavedTabsDialog(unsavedResult, action = 'quit') {
  if (!unsavedResult.hasUnsaved) {
    return { proceed: true, saveAll: false };
  }

  // Build file list for display
  const fileList = unsavedResult.tabs.map(t => `• ${t.title}`).join('\n');
  const actionText = action === 'quit' ? 'exit' : 'close the window';
  
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Unsaved Changes',
    message: `You have ${unsavedResult.count} file(s) with unsaved changes:`,
    detail: `${fileList}\n\nDo you want to save your changes before you ${actionText}?`,
    buttons: ['Save All', 'Don\'t Save', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  });

  switch (result.response) {
    case 0: // Save All
      return { proceed: true, saveAll: true };
    case 1: // Don't Save
      return { proceed: true, saveAll: false };
    case 2: // Cancel
    default:
      return { proceed: false, saveAll: false };
  }
}

// Handle before-quit: check for unsaved changes
app.on('before-quit', (event) => {
  logInfo('Main', 'before-quit event triggered');
  
  // If we've already confirmed quit, allow it to proceed
  if (isQuitting) {
    logInfo('Main', 'Quit already confirmed, proceeding...');
    return;
  }
  
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
        isQuitting = true;
        app.quit();
      }
    }, 2000); // 2 second timeout
    
    // This will be called when renderer responds
    const handleResponse = async (event, result) => {
      if (hasResponded) return;
      hasResponded = true;
      clearTimeout(responseTimeout);
      ipcMain.removeListener('unsaved-tabs-response', handleResponse);
      
      logInfo('Main', 'Unsaved tabs query result:', result);
      
      if (result.hasUnsaved) {
        const dialogResult = await handleUnsavedTabsDialog(result, 'quit');
        
        if (dialogResult.proceed) {
          if (dialogResult.saveAll) {
            // Request renderer to save all tabs, then quit
            mainWindow.webContents.send('save-all-tabs-then-quit');
          } else {
            // User chose don't save, proceed with quit
            isQuitting = true;
            app.quit();
          }
        }
        // If not proceed (cancelled), do nothing - stay in app
      } else {
        // No unsaved changes, proceed with quit
        isQuitting = true;
        app.quit();
      }
    };
    
    ipcMain.on('unsaved-tabs-response', handleResponse);
  }
});

// Handle save-all-complete from renderer (for quit)
ipcMain.on('save-all-complete', (event, result) => {
  logInfo('Main', 'Save all complete:', result);
  if (result.success) {
    isQuitting = true;
    app.quit();
  } else {
    // Some saves failed, show error
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Save Failed',
      message: 'Failed to save some files. Please try saving them manually.',
      detail: result.error || 'Unknown error occurred.'
    });
  }
});

// Handle save-all-complete from renderer (for close window)
ipcMain.on('save-all-complete-close', (event, result) => {
  logInfo('Main', 'Save all complete for close:', result);
  isClosingWindow = false;
  if (result.success) {
    isQuitting = true;
    mainWindow.destroy();
  } else {
    // Some saves failed, show error
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Save Failed',
      message: 'Failed to save some files. Please try saving them manually.',
      detail: result.error || 'Unknown error occurred.'
    });
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
  const waitForMathFlagScript = `
    new Promise((resolve) => {
      const finish = () => resolve(true);
      if (window.__MATHJAX_DONE) {
        finish();
        return;
      }
      let attempts = 0;
      const maxAttempts = 60;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.__MATHJAX_DONE || attempts >= maxAttempts) {
          clearInterval(timer);
          finish();
        }
      }, 250);
      setTimeout(() => {
        clearInterval(timer);
        resolve(false);
      }, 20000);
    });
  `;

  const exportWithBrowserWindow = async (targetPath) => {
    logInfo('PDF', 'Falling back to BrowserWindow printToPDF workflow');
    const pdfWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      show: false,
      webPreferences: {
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true,
        zoomFactor: 1.0
      }
    });

    const tempHtmlPath = path.join(path.dirname(targetPath), `.temp-export-${Date.now()}.html`);

    try {
      const augmentedHtml = html.replace(/<body([^>]*)>/i, (match, attrs = '') => {
        if (/class=/i.test(attrs)) {
          return `<body${attrs.replace(/class=(["'])(.*?)\1/i, (original, quote, classes) => `class=${quote}${classes} doc-pdf-export${quote}`)}>`;
        }
        return `<body${attrs} class="doc-pdf-export">`;
      });

      await fs.promises.writeFile(tempHtmlPath, augmentedHtml, 'utf-8');
      await pdfWindow.loadURL('file:///' + tempHtmlPath.replace(/\\/g, '/'));
      await pdfWindow.webContents.executeJavaScript(waitForMathFlagScript);
      await new Promise(resolve => setTimeout(resolve, 250));

      const pdfBuffer = await pdfWindow.webContents.printToPDF({
        marginsType: 0,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        pageSize: 'A4'
      });

      await fs.promises.writeFile(targetPath, pdfBuffer);
    } finally {
      if (fs.existsSync(tempHtmlPath)) {
        try { await fs.promises.unlink(tempHtmlPath); } catch (err) {}
      }
      if (!pdfWindow.isDestroyed()) {
        pdfWindow.close();
      }
    }
  };

  let tempHtmlPathForPuppeteer = null;
  let browser = null;

  try {
    logInfo('PDF', `Starting PDF export: ${fileName}`);
    
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

    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch (requireError) {
      logInfo('PDF', `Puppeteer unavailable (${requireError.message}), will use BrowserWindow fallback`);
    }

    if (puppeteer) {
      try {
        browser = await puppeteer.launch({
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
        await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
        
        tempHtmlPathForPuppeteer = path.join(path.dirname(savePath), `.temp-export-puppeteer-${Date.now()}.html`);
        await fs.promises.writeFile(tempHtmlPathForPuppeteer, html, 'utf-8');
        await page.goto('file:///' + tempHtmlPathForPuppeteer.replace(/\\/g, '/'), { waitUntil: ['networkidle0', 'load'], timeout: 60000 });
        
        await page.evaluate(() => {
          return new Promise((resolve) => {
            if (window.MathJax && window.MathJax.typesetPromise) {
              window.MathJax.typesetPromise().then(() => setTimeout(resolve, 1000)).catch(() => setTimeout(resolve, 1000));
            } else {
              setTimeout(resolve, 2000);
            }
          });
        });
        await page.pdf({
          path: savePath,
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true,
          preferCSSPageSize: false,
          displayHeaderFooter: false
        });
      } catch (puppeteerErr) {
        logInfo('PDF', `Puppeteer run failed (${puppeteerErr.message}), falling back to BrowserWindow printToPDF`);
        if (browser) {
          await browser.close();
          browser = null;
        }
        await exportWithBrowserWindow(savePath);
      }
    } else {
      await exportWithBrowserWindow(savePath);
    }

    logInfo('PDF', `PDF exported successfully to: ${savePath}`);
    return { success: true, filePath: savePath };
    
  } catch (error) {
    logError('PDF', `PDF export failed: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (tempHtmlPathForPuppeteer && fs.existsSync(tempHtmlPathForPuppeteer)) {
      try { await fs.promises.unlink(tempHtmlPathForPuppeteer); } catch (err) {}
    }
    if (browser) {
      try { await browser.close(); } catch (err) {}
    }
  }
});

// TikZ server-side rendering handler - STRICT LOCAL ONLY
ipcMain.handle('render-tikz-server-side', async (event, { tikzCode, isCircuit = false }) => {
  try {
    logInfo('TikZ', `Rendering TikZ diagram, isCircuit: ${isCircuit}`);

    // STRICT LOCAL ONLY: Use local node-tikzjax-main repository or require from node_modules
    const localTikZJaxPath = path.join(process.cwd(), 'References', 'node-tikzjax-main', 'dist', 'index.js');
    let tikzjax = null;

    if (fs.existsSync(localTikZJaxPath)) {
      tikzjax = require(localTikZJaxPath);
      logInfo('TikZ', `Using local node-tikzjax from: ${localTikZJaxPath}`);
    } else {
      try {
        tikzjax = require('node-tikzjax');
        logInfo('TikZ', 'Using node-tikzjax from node_modules');
      } catch (requireErr) {
        logError('TikZ', `Local node-tikzjax not found at: ${localTikZJaxPath} and node_modules require failed: ${requireErr.message}`);
        return {
          success: false,
          error: `node-tikzjax could not be loaded. Local repository missing at ${localTikZJaxPath} and node_modules require failed: ${requireErr.message}`,
          method: 'local-missing'
        };
      }
    }

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

// Get current working directory
ipcMain.handle('get-cwd', async () => {
  return process.cwd();
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

// Get examples directory path (works in both dev and packaged builds)
ipcMain.handle('get-examples-path', async () => {
  // In packaged builds, resources are in resources/ folder next to the executable
  // In dev, they're in the project root
  const possiblePaths = [
    path.join(process.resourcesPath || '', 'examples'),           // Packaged: resources/examples
    path.join(__dirname, '..', '..', 'resources', 'examples'),    // Packaged alt: relative to main.js
    path.join(__dirname, '..', '..', 'examples'),                 // Dev: project root
    path.join(process.cwd(), 'examples')                          // Dev: cwd
  ];
  
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        logInfo('Main', 'Found examples directory at: ' + p);
        return { success: true, path: p };
      }
    } catch (e) {
      // Continue to next path
    }
  }
  
  logInfo('Main', 'Examples directory not found, searched: ' + possiblePaths.join(', '));
  return { success: false, error: 'Examples directory not found' };
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

// ========== PRESENTATION ADDON IPC HANDLERS ==========

let presentationWindow = null;

// Preview presentation in separate window
ipcMain.handle('preview-presentation', async (event, { html }) => {
  try {
    logInfo('Presentation', 'Preparing presentation preview window');

    const createWindowIfNeeded = () => {
      if (presentationWindow && !presentationWindow.isDestroyed()) {
        return;
      }

      presentationWindow = new BrowserWindow({
        width: 1120,
        height: 780,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#000000',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: false, // Allow loading external CDN resources
          allowRunningInsecureContent: false,
          backgroundThrottling: false
        },
        icon: path.join(__dirname, '../assets/icons/icon.png'),
        title: 'Presentation Preview'
      });

      presentationWindow.on('closed', () => {
        presentationWindow = null;
      });

      presentationWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    };

    createWindowIfNeeded();

    if (!presentationWindow) {
      throw new Error('Failed to initialise preview window');
    }

    // Stop any in-flight navigation before loading fresh content
    presentationWindow.webContents.stop();

    const base64Html = Buffer.from(html, 'utf-8').toString('base64');
    await presentationWindow.loadURL(`data:text/html;base64,${base64Html}`);

    if (!presentationWindow.isVisible()) {
      presentationWindow.show();
    }

    presentationWindow.focus();

    return { success: true };
  } catch (error) {
    logError('PreviewPresentation', error);
    return { success: false, error: error.message };
  }
});

// Save presentation as HTML
ipcMain.handle('save-presentation-html', async (event, { html, title }) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Presentation as HTML',
      defaultPath: `${title || 'presentation'}.html`,
      filters: [
        { name: 'HTML Files', extensions: ['html'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    await fs.promises.writeFile(result.filePath, html, 'utf-8');
    logInfo('Presentation', `HTML presentation saved to ${result.filePath}`);

    return { success: true, filePath: result.filePath };
  } catch (error) {
    logError('SavePresentationHTML', error);
    return { success: false, error: error.message };
  }
});

// Export presentation as PDF
ipcMain.handle('export-presentation-pdf', async (event, { html, title, slideCount }) => {
  let tempPresentationHtmlPath = null;
  let pdfWindow = null;
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Presentation as PDF',
      defaultPath: `${title || 'presentation'}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    logInfo('Presentation', `Exporting presentation to PDF: ${result.filePath}`);
    
    // Create a window that matches the content size instead of forcing A4
    pdfWindow = new BrowserWindow({
      width: 1920,  // Standard presentation width
      height: 1080, // Standard presentation height
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        zoomFactor: 1.0 // Ensure 100% zoom
      }
    });

    // Prepare HTML for PDF printing - let content determine size
    const pdfHtml = html.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/class=/i.test(attrs)) {
        return `<body${attrs.replace(/class=("|')(.*?)\1/i, (original, quote, classes) => `class=${quote}${classes} print-layout pdf-export${quote}`)}>`;
      }
      return `<body${attrs} class="print-layout pdf-export">`;
    });
    
    tempPresentationHtmlPath = path.join(path.dirname(result.filePath), `.temp-presentation-${Date.now()}.html`);
    await fs.promises.writeFile(tempPresentationHtmlPath, pdfHtml, 'utf-8');
    
    // Load the presentation HTML from the temporary file
    await pdfWindow.loadURL('file:///' + tempPresentationHtmlPath.replace(/\\/g, '/'));
    
    // Wait for rendering to finish inside the presentation (event-driven)
    try {
      await pdfWindow.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const finalize = () => resolve(true);

          if (window.presentationRenderStatus === 'complete' || document.body.classList.contains('rendering-complete')) {
            finalize();
            return;
          }

          window.addEventListener('presentation-render-complete', finalize, { once: true });
          // Fallback timeout to avoid hanging indefinitely
          setTimeout(() => resolve(false), 15000);
        });
      `);
      logInfo('Presentation', 'Rendering complete signal received');
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (waitError) {
      logError('Presentation', `Error while waiting for render completion: ${waitError.message}`);
    }

    try {
      await pdfWindow.webContents.executeJavaScript(`
        (function(){
          if (typeof window.enablePresentationPrintLayout === 'function') {
            window.enablePresentationPrintLayout();
          }
        })();
      `);
    } catch (prepError) {
      logError('Presentation', `Failed to enable print layout: ${prepError.message}`);
    }

    // Generate PDF with settings that follow HTML layout exactly
    const pdfData = await pdfWindow.webContents.printToPDF({
      marginsType: 0, // No margins - controlled by CSS
      printBackground: true,
      landscape: true,
      preferCSSPageSize: true, // Honor CSS-defined page size
      scale: 1.0, // Ensure no scaling
      displayHeaderFooter: false
    });

    // Save PDF file
    await fs.promises.writeFile(result.filePath, pdfData);

    try {
      await pdfWindow.webContents.executeJavaScript(`
        (function(){
          if (typeof window.disablePresentationPrintLayout === 'function') {
            window.disablePresentationPrintLayout();
          }
        })();
      `);
    } catch (cleanupError) {
      logError('Presentation', `Failed to disable print layout: ${cleanupError.message}`);
    }
    
    logInfo('Presentation', `PDF presentation saved to ${result.filePath}`);

    return { success: true, filePath: result.filePath };
  } catch (error) {
    logError('ExportPresentationPDF', error);
    return { success: false, error: error.message };
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) {
      pdfWindow.close();
    }
    if (tempPresentationHtmlPath && fs.existsSync(tempPresentationHtmlPath)) {
      try { await fs.promises.unlink(tempPresentationHtmlPath); } catch (err) {}
    }
  }
});

// ========== END PRESENTATION ADDON IPC HANDLERS ==========