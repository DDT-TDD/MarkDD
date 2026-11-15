const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

function isAllowedAppPath(targetPath) {
  const resolved = path.resolve(targetPath).toLowerCase().replace(/\\/g, '/');
  const roots = [path.resolve(__dirname, '..', '..'), process.resourcesPath]
    .filter(Boolean)
    .map(r => path.resolve(r).toLowerCase().replace(/\\/g, '/'));
  return roots.some(root => resolved === root || resolved.startsWith(root + '/'));
}

function isSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.includes('\0')) return false;
  if (isAllowedAppPath(targetPath)) return true;
  const lower = path.resolve(targetPath).toLowerCase().replace(/\\/g, '/');
  const blocked = ['c:/windows/', 'c:/program files/', 'c:/program files (x86)/', '/.ssh/', '/.gnupg/', '/.aws/'];
  return !blocked.some(b => lower.includes(b));
}

function assertSafePath(targetPath) {
  if (!isSafePath(targetPath)) {
    throw new Error('Access denied: unsafe or restricted path');
  }
}

function serializeStat(s) {
  const isDir = typeof s.isDirectory === 'function' ? s.isDirectory() : false;
  const isFile = typeof s.isFile === 'function' ? s.isFile() : false;
  return {
    isDirectory: () => isDir,
    isFile: () => isFile,
    size: s.size,
    mtime: s.mtime,
    mtimeMs: s.mtimeMs
  };
}

function mapDirents(entries, opts) {
  if (opts && opts.withFileTypes && Array.isArray(entries)) {
    return entries.map(d => {
      if (d && typeof d === 'object' && typeof d.name === 'string') {
        const isDir = typeof d.isDirectory === 'function' ? d.isDirectory() : false;
        const isFile = typeof d.isFile === 'function' ? d.isFile() : false;
        return { name: d.name, isDirectory: () => isDir, isFile: () => isFile };
      }
      return d;
    });
  }
  return entries;
}

const listenerMap = new Map();

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  cwd: () => process.cwd(),
  versions: process.versions,
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, func) => {
      if (typeof func !== 'function') return;
      const wrapped = (_event, ...args) => func({}, ...args);
      if (!listenerMap.has(channel)) listenerMap.set(channel, []);
      listenerMap.get(channel).push({ orig: func, wrapped });
      ipcRenderer.on(channel, wrapped);
    },
    removeAllListeners: (channel) => {
      listenerMap.delete(channel);
      ipcRenderer.removeAllListeners(channel);
    }
  },
  fs: {
    existsSync: (p) => { try { return isSafePath(p) && fs.existsSync(p); } catch (_) { return false; } },
    readFileSync: (p, opts) => { assertSafePath(p); return fs.readFileSync(p, opts); },
    writeFileSync: (p, data, opts) => { assertSafePath(p); return fs.writeFileSync(p, data, opts); },
    readdirSync: (p, opts) => { assertSafePath(p); return mapDirents(fs.readdirSync(p, opts), opts); },
    mkdirSync: (p, opts) => { assertSafePath(p); return fs.mkdirSync(p, opts); },
    unlinkSync: (p) => { assertSafePath(p); return fs.unlinkSync(p); },
    statSync: (p) => { assertSafePath(p); return serializeStat(fs.statSync(p)); },
    promises: {
      readFile: (p, opts) => { assertSafePath(p); return fs.promises.readFile(p, opts); },
      writeFile: (p, data, opts) => { assertSafePath(p); return fs.promises.writeFile(p, data, opts); },
      mkdir: (p, opts) => { assertSafePath(p); return fs.promises.mkdir(p, opts); },
      readdir: async (p, opts) => { assertSafePath(p); return mapDirents(await fs.promises.readdir(p, opts), opts); },
      stat: async (p) => { assertSafePath(p); return serializeStat(await fs.promises.stat(p)); },
      access: (p, mode) => { assertSafePath(p); return fs.promises.access(p, mode); },
      unlink: (p) => { assertSafePath(p); return fs.promises.unlink(p); }
    }
  },
  path: {
    sep: path.sep,
    join: (...args) => path.join(...args),
    resolve: (...args) => path.resolve(...args),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p),
    relative: (from, to) => path.relative(from, to),
    isAbsolute: (p) => path.isAbsolute(p)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
  }
});
