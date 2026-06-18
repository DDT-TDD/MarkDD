#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'licenses');
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function htmlEscape(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let html = [];
html.push("<html><head><meta charset='utf-8'><title>Consolidated Licenses</title></head><body>");
html.push('<h1>Consolidated Licenses for MarkDD Editor</h1>');

const mainLicense = path.join(root, 'LICENSE');
if (fs.existsSync(mainLicense)) {
  const lic = fs.readFileSync(mainLicense, 'utf8');
  html.push('<h2>Project LICENSE (MIT)</h2>');
  html.push('<pre>' + htmlEscape(lic) + '</pre>');
}

const thirdMd = path.join(root, 'THIRD-PARTY-LICENSES.md');
if (fs.existsSync(thirdMd)) {
  const md = fs.readFileSync(thirdMd, 'utf8');
  html.push('<h2>THIRD-PARTY-LICENSES.md</h2>');
  html.push('<pre>' + htmlEscape(md) + '</pre>');
}

const tp = path.join(root, 'third_party');
if (fs.existsSync(tp)) {
  const entries = fs.readdirSync(tp, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const e of entries) {
    const licPath = path.join(tp, e.name, 'LICENSE');
    if (fs.existsSync(licPath)) {
      const content = fs.readFileSync(licPath, 'utf8');
      html.push('<h2>third_party/' + htmlEscape(e.name) + '/LICENSE</h2>');
      html.push('<pre>' + htmlEscape(content) + '</pre>');
    }
  }
}

html.push('</body></html>');
const outHtml = path.join(outDir, 'LICENSES.html');
fs.writeFileSync(outHtml, html.join('\n'), 'utf8');
console.log('Wrote', outHtml);

// Try to create a zip if archiver is available
try {
  const archiver = require('archiver');
  const zipPath = path.join(outDir, 'licenses.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', () => console.log('Wrote', zipPath, archive.pointer(), 'bytes'));
  archive.pipe(output);
  archive.file(outHtml, { name: 'LICENSES.html' });
  if (fs.existsSync(thirdMd)) archive.file(thirdMd, { name: 'THIRD-PARTY-LICENSES.md' });
  if (fs.existsSync(tp)) {
    const entries = fs.readdirSync(tp, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const e of entries) {
      const licPath = path.join(tp, e.name, 'LICENSE');
      if (fs.existsSync(licPath)) {
        archive.file(licPath, { name: path.join('third_party', e.name, 'LICENSE') });
      }
    }
  }
  archive.finalize();
} catch (err) {
  console.warn('archiver not installed; skipping zip creation. To create a zip install "npm i -D archiver" or run the PowerShell script.');
}
