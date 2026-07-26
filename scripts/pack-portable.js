// Node.js script to create the portable ZIP package quickly using the 'archiver' library.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const workspaceRoot = path.join(__dirname, '..');
const portableParent = path.join(workspaceRoot, 'src-tauri/target/release/bundle/portable');
const portableFolder = path.join(portableParent, 'MarkDD-Editor-v2.0.0-Portable');
const zipPath = path.join(portableParent, 'markdd-editor_2.0.0_portable_x64.zip');

console.log('[pack-portable] Starting portable packaging...');
console.log('[pack-portable] Source folder:', portableFolder);
console.log('[pack-portable] Output ZIP   :', zipPath);

// Ensure portable output parent directory exists
if (!fs.existsSync(portableParent)) {
    fs.mkdirSync(portableParent, { recursive: true });
}

// Recreate portable folder structure next to binary
if (fs.existsSync(portableFolder)) {
    try {
        fs.rmSync(portableFolder, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
    } catch (_) {
        if (process.platform === 'win32') {
            try { execSync(`cmd /c rmdir /s /q "${portableFolder}"`, { stdio: 'ignore' }); } catch (__) {}
        }
    }
}
fs.mkdirSync(portableFolder, { recursive: true });

// Copy the main executable
const exeSrc = path.join(workspaceRoot, 'src-tauri/target/release/markdd-editor.exe');
const exeDst = path.join(portableFolder, 'MarkDD Editor.exe');
try {
    fs.copyFileSync(exeSrc, exeDst);
} catch (err) {
    console.warn('[pack-portable] Warning copying executable via fs, attempting PowerShell fallback:', err.message);
    if (process.platform === 'win32') {
        try { execSync(`powershell -Command "Copy-Item -Path '${exeSrc}' -Destination '${exeDst}' -Force"`, { stdio: 'ignore' }); } catch (_) {}
    }
}

// Copy prepared resources folder
const resourcesSrc = path.join(workspaceRoot, 'resources');
const resourcesDst = path.join(portableFolder, 'resources');
console.log('[pack-portable] Copying resources...');

if (process.platform === 'win32') {
    // On Windows, use robocopy which is multi-threaded and extremely fast
    try {
        console.log('[pack-portable] Executing robocopy...');
        execSync(`robocopy "${resourcesSrc}" "${resourcesDst}" /E /MT:16`, { stdio: 'ignore' });
    } catch (err) {
        // Robocopy returns exit codes < 8 on successful copies, but Node execSync throws if exit code != 0.
        // We check if the target folder actually got copied successfully.
        if (!fs.existsSync(resourcesDst)) {
            throw new Error(`Robocopy failed to copy resources: ${err.message}`);
        }
    }
} else {
    // Fallback recursive copy for other platforms
    function copyFolderSync(from, to) {
        fs.mkdirSync(to, { recursive: true });
        fs.readdirSync(from).forEach(element => {
            const stat = fs.lstatSync(path.join(from, element));
            if (stat.isFile()) {
                fs.copyFileSync(path.join(from, element), path.join(to, element));
            } else if (stat.isDirectory()) {
                copyFolderSync(path.join(from, element), path.join(to, element));
            }
        });
    }
    copyFolderSync(resourcesSrc, resourcesDst);
}

console.log('[pack-portable] Creating Portable ZIP archive (compressing)...');

// Create the ZIP archive
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', {
    zlib: { level: 4 } // Fast compression level
});

output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`[pack-portable] Successfully created portable ZIP: ${zipPath} (${sizeMB} MB)`);
});

archive.on('warning', err => {
    if (err.code === 'ENOENT') {
        console.warn('[pack-portable] Archive warning:', err);
    } else {
        throw err;
    }
});

archive.on('error', err => {
    throw err;
});

archive.pipe(output);

// Append files from the portableFolder directory
archive.directory(portableFolder, false);

archive.finalize();
