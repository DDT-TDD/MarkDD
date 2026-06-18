#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const third = path.join(root, 'third_party');
const outDir = path.join(root, 'licenses');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function readVendoredLicenses() {
  if (!fs.existsSync(third)) return {};
  const entries = fs.readdirSync(third, { withFileTypes: true });
  const map = {};
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(third, e.name);
    const licPath = ['LICENSE','LICENSE.md','LICENSE.txt','license','license.txt','LICENSE.MD']
      .map(n => path.join(dir, n)).find(p=>fs.existsSync(p));
    if (licPath) {
      map[e.name] = {
        licenseFile: path.relative(root, licPath),
        text: fs.readFileSync(licPath, 'utf8').trim()
      };
    }
  }
  return map;
}

function readPackageMeta() {
  const pkgJson = path.join(root, 'package.json');
  if (!fs.existsSync(pkgJson)) return {};
  const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
  const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
  const out = {};
  for (const [name, ver] of Object.entries(deps)) {
    out[name] = { requested: ver };
  }
  // include direct github: style dependencies from package.json too
  if (pkg.dependencies) {
    for (const [k,v] of Object.entries(pkg.dependencies)) {
      if (typeof v === 'string' && v.startsWith('github:')) {
        out[k] = out[k] || {};
        out[k].requested = v;
      }
    }
  }
  return out;
}

function buildManifests() {
  const vendored = readVendoredLicenses();
  const pkgs = readPackageMeta();

  // Build plain text file
  const txtParts = [];
  txtParts.push('Project License:');
  const rootLic = path.join(root, 'LICENSE');
  if (fs.existsSync(rootLic)) txtParts.push(fs.readFileSync(rootLic, 'utf8'));
  txtParts.push('\n\nThird-party licenses:');
  for (const [pkgName, info] of Object.entries(vendored)) {
    txtParts.push('\n----- ' + pkgName + ' -----\n');
    txtParts.push(info.text);
  }
  const txtOut = txtParts.join('\n');
  fs.writeFileSync(path.join(outDir, 'LICENSES.txt'), txtOut, 'utf8');

  // Build JSON manifest: package -> { requested, vendoredLicenseFile }
  const manifest = {};
  for (const [name, meta] of Object.entries(pkgs)) {
    manifest[name] = Object.assign({}, meta);
    // match vendored by prefix/suffix heuristics
    const key = Object.keys(vendored).find(k => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase()));
    if (key) manifest[name].vendoredLicenseFile = vendored[key].licenseFile;
  }
  // also include vendored-only entries
  for (const [k,v] of Object.entries(vendored)) {
    if (!Object.keys(manifest).includes(k)) {
      manifest[k] = { vendoredLicenseFile: v.licenseFile };
    }
  }

  fs.writeFileSync(path.join(outDir, 'licenses.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log('Wrote', path.join(outDir, 'LICENSES.txt'));
  console.log('Wrote', path.join(outDir, 'licenses.json'));
}

buildManifests();
