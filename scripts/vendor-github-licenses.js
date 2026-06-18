#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

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

function parseGitSpec(spec) {
  // formats: github:owner/repo, git+https://github.com/owner/repo.git, git+ssh://git@github.com/owner/repo.git
  if (!spec) return null;
  if (spec.startsWith('github:')) {
    const parts = spec.slice('github:'.length).split('/');
    return { owner: parts[0], repo: parts[1] };
  }
  const m = spec.match(/github.com[:\/]+([^\/]+)\/([^.\/]+)(?:\.git)?/i);
  if (m) return { owner: m[1], repo: m[2] };
  return null;
}

function addVendor(owner, repo, content) {
  const dir = path.join(__dirname, '..', 'third_party', `${owner}-${repo}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'LICENSE'), content, 'utf8');
  console.log('Wrote', path.join(dir, 'LICENSE'));
}

async function tryFetchLicense(owner, repo) {
  const branches = ['master', 'main'];
  const names = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'LICENSE.rst'];
  for (const b of branches) {
    for (const n of names) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${n}`;
      try {
        const data = await fetchUrl(url);
        if (data) return data;
      } catch (e) {
        // continue
      }
    }
  }
  return null;
}

function gatherSpecs() {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const specs = new Set();
  ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].forEach(k => {
    if (pkg[k]) Object.values(pkg[k]).forEach(v => specs.add(v));
  });
  const lockPath = path.join(root, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      const traverse = obj => {
        if (!obj || typeof obj !== 'object') return;
        if (obj.version && typeof obj.version === 'string' && (obj.version.startsWith('git+') || obj.version.includes('github.com') || obj.version.startsWith('github:'))) specs.add(obj.version);
        Object.values(obj).forEach(traverse);
      };
      traverse(lock);
    } catch (e) { /* ignore */ }
  }
  return Array.from(specs);
}

(async function main(){
  const specs = gatherSpecs();
  const repos = new Map();
  specs.forEach(s => {
    const p = parseGitSpec(s);
    if (p) repos.set(`${p.owner}/${p.repo}`, p);
  });
  if (repos.size === 0) { console.log('No GitHub-hosted deps detected.'); return; }
  for (const [k, {owner, repo}] of repos.entries()) {
    console.log('Fetching license for', owner + '/' + repo);
    try {
      const data = await tryFetchLicense(owner, repo);
      if (data) {
        addVendor(owner, repo, data);
      } else {
        console.warn('Could not find LICENSE for', owner + '/' + repo);
      }
    } catch (e) {
      console.error('Error fetching', owner + '/' + repo, e.message || e);
    }
  }
})();
