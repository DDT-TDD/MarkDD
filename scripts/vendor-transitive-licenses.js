#!/usr/bin/env node
/**
 * vendor-transitive-licenses.js
 *
 * Scan package-lock.json for all dependencies, query the npm registry for each
 * package's repository field; if it points to GitHub, attempt to fetch the
 * repository's LICENSE (tries master/main and common filenames) and write it to
 * third_party/<owner>-<repo>/LICENSE.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/vnd.npm.install-v1+json, application/json' } }, res => {
      if (res.statusCode !== 200) return resolve(null);
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', err => reject(err));
  });
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return resolve(null);
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function parseRepoUrl(repo) {
  if (!repo) return null;
  if (typeof repo === 'string') repo = repo;
  let url = repo.url || repo;
  if (!url) return null;
  // Remove git+ prefix and .git suffix
  url = url.replace(/^git\+/, '').replace(/\.git$/, '');
  const m = url.match(/github\.com[:\/]+([^\/]+)\/([^\/]+)(?:$|\/)/i);
  if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  return null;
}

function collectDepsFromLock(lock) {
  const result = new Map();
  function walk(deps) {
    if (!deps || typeof deps !== 'object') return;
    for (const [name, info] of Object.entries(deps)) {
      if (!info || typeof info !== 'object') continue;
      if (info.version) {
        result.set(name + '@' + info.version, { name, version: info.version });
      }
      if (info.dependencies) walk(info.dependencies);
    }
  }
  if (lock.dependencies) walk(lock.dependencies);
  return Array.from(result.values());
}

async function tryFetchLicenseFromRepo(owner, repo) {
  const branches = ['master', 'main'];
  const names = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENSE.rst', 'license', 'COPYING'];
  for (const b of branches) {
    for (const n of names) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${n}`;
      try {
        const data = await fetchUrl(url);
        if (data) return data;
      } catch (e) {
        // ignore
      }
    }
  }
  return null;
}

function writeVendor(owner, repo, content) {
  const dir = path.join(__dirname, '..', 'third_party', `${owner}-${repo}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'LICENSE'), content, 'utf8');
}

(async function main(){
  const root = path.join(__dirname, '..');
  const lockPath = path.join(root, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    console.error('No package-lock.json found, aborting.');
    process.exit(1);
  }
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const deps = collectDepsFromLock(lock);
  console.log('Found', deps.length, 'locked dependencies. Scanning for GitHub repos...');

  const seen = new Set();
  for (const dep of deps) {
    const pkgName = dep.name;
    const version = dep.version;
    try {
      const meta = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(pkgName)}/${encodeURIComponent(version)}`);
      if (!meta) continue;
      const repo = parseRepoUrl(meta.repository || meta.repo || meta.repository && meta.repository.url);
      if (!repo) continue;
      const key = repo.owner + '/' + repo.repo;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log('Attempting license fetch for', key);
      const lic = await tryFetchLicenseFromRepo(repo.owner, repo.repo);
      if (lic) {
        writeVendor(repo.owner, repo.repo, lic);
        console.log('Vendored LICENSE for', key);
      } else {
        console.warn('No LICENSE found in repo for', key);
      }
      // Be polite
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      // ignore errors for a package and continue
    }
  }
  console.log('Done.');
})();
