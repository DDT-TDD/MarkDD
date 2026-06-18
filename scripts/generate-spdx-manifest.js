#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.resolve(__dirname, '..');
const lockPath = path.join(root, 'package-lock.json');
const pkgPath = path.join(root, 'package.json');
const third = path.join(root, 'third_party');
const outDir = path.join(root, 'licenses');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function simpleSpdxFromString(s) {
  if (!s) return null;
  s = String(s).toUpperCase();
  if (s.includes('MIT')) return 'MIT';
  if (s.includes('APACHE') || s.includes('APACHE-2.0') ) return 'Apache-2.0';
  if (s.includes('BSD-3') || (s.includes('BSD') && s.includes('3'))) return 'BSD-3-Clause';
  if (s.includes('BSD-2') || (s.includes('BSD') && s.includes('2'))) return 'BSD-2-Clause';
  if (s.includes('ISC')) return 'ISC';
  if (s.includes('MPL')) return 'MPL-2.0';
  if (s.includes('UNLICENSE')) return 'Unlicense';
  if (s.includes('LGPL') && s.includes('3')) return 'LGPL-3.0-only';
  if (s.includes('LGPL')) return 'LGPL-2.1-only';
  if (s.includes('GPL') && s.includes('3')) return 'GPL-3.0-only';
  if (s.includes('GPL')) return 'GPL-2.0-only';
  if (s.includes('EPL')) return 'EPL-2.0';
  return null;
}

function readLockDependencies() {
  if (!fs.existsSync(lockPath)) return {};
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const out = {};

  // support legacy 'dependencies' tree
  function walkDeps(deps) {
    if (!deps) return;
    for (const [name, info] of Object.entries(deps)) {
      if (!out[name]) {
        out[name] = { version: info.version || info.required || null, license: info.license || info.licenses || null };
      }
      walkDeps(info.dependencies);
    }
  }

  if (lock.dependencies) {
    walkDeps(lock.dependencies);
  }

  // also handle newer lockfile 'packages' mapping
  if (lock.packages) {
    for (const [pkgPathKey, pkgInfo] of Object.entries(lock.packages)) {
      if (!pkgPathKey.startsWith('node_modules/')) continue;
      const name = pkgPathKey.replace(/^node_modules\//, '');
      if (!out[name]) out[name] = { version: pkgInfo.version || null, license: pkgInfo.license || null };
    }
  }

  return out;
}

function readVendored() {
  if (!fs.existsSync(third)) return {};
  const out = {};
  for (const name of fs.readdirSync(third)) {
    const dir = path.join(third, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const candidates = ['LICENSE','LICENSE.md','LICENSE.txt','license','license.txt','COPYING'];
    const found = candidates.map(n=>path.join(dir,n)).find(p=>fs.existsSync(p));
    if (found) {
      const text = fs.readFileSync(found,'utf8');
      out[name] = { licenseFile: path.relative(root, found), text, spdx: simpleSpdxFromString(text) };
    }
  }
  return out;
}

function fetchPackageMeta(pkgName, version) {
  const encoded = encodeURIComponent(pkgName);
  const url = `https://registry.npmjs.org/${encoded}`;
  return new Promise((resolve) => {
    https.get(url, { timeout: 10000 }, res => {
      let data = '';
      res.on('data', c=>data+=c);
      res.on('end', ()=>{
        try {
          const j = JSON.parse(data);
          let ver = version;
          if (!ver) ver = j['dist-tags'] && j['dist-tags'].latest;
          let metadata = null;
          if (ver && j.versions && j.versions[ver]) metadata = j.versions[ver];
          else if (j.versions) metadata = j.versions[j['dist-tags'] && j['dist-tags'].latest];
          const license = metadata && (metadata.license || metadata.licenses) ? (metadata.license || metadata.licenses) : j.license || null;
          resolve({ ok: true, license, raw: metadata || j });
        } catch (e) { resolve({ ok: false, error: e.message }); }
      });
    }).on('error', err=>resolve({ ok: false, error: err.message }));
  });
}

async function build() {
  const lockDeps = readLockDependencies();
  const vendored = readVendored();
  const pkgJson = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath,'utf8')) : {};

  const allNames = new Set([...Object.keys(lockDeps), ...Object.keys(vendored), ...Object.keys(pkgJson.dependencies||{})]);

  const manifest = {};
  let fetched = 0;
  for (const name of Array.from(allNames).sort()) {
    const entry = { version: lockDeps[name] && lockDeps[name].version ? lockDeps[name].version : (pkgJson.dependencies && pkgJson.dependencies[name]) || null };

    // prefer license from lockfile
    let licenseInfo = lockDeps[name] && lockDeps[name].license ? lockDeps[name].license : null;
    let spdx = null;
    if (licenseInfo) spdx = simpleSpdxFromString(licenseInfo);

    if (!licenseInfo) {
      // try vendored
      if (vendored[name]) {
        licenseInfo = vendored[name].text;
        spdx = vendored[name].spdx || simpleSpdxFromString(licenseInfo);
        entry.vendored = vendored[name].licenseFile;
      }
    }

    if (!licenseInfo) {
      // fetch from registry
      const meta = await fetchPackageMeta(name, entry.version && entry.version.replace(/^~|\^/,''));
      fetched++;
      if (meta.ok) {
        licenseInfo = meta.license || (meta.raw && meta.raw.license) || null;
        spdx = spdx || simpleSpdxFromString(licenseInfo);
        entry.registry = true;
      } else {
        entry.registryError = meta.error;
      }
    }

    entry.license = licenseInfo || null;
    entry.spdx = spdx || null;
    manifest[name] = entry;
  }

  const outPath = path.join(outDir, 'licenses-spdx.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote', outPath, '(', Object.keys(manifest).length, 'entries, fetched', fetched, 'registry lookups )');
}

build().catch(e=>{ console.error('Failed:', e); process.exit(1); });
