const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(full));
    } else {
      if (file.endsWith('-test.md')) results.push(full);
    }
  });
  return results;
}

(async function() {
  const cwd = path.resolve(__dirname, '..');
  const files = walk(cwd);
  const results = [];
  for (const f of files) {
    console.log('Running:', f);
    const start = Date.now();
    const proc = spawnSync(process.execPath, [path.join(cwd, 'test', 'render_test.js'), f], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const duration = Date.now() - start;
    results.push({ file: f, status: proc.status, signal: proc.signal, durationMs: duration, stdout: proc.stdout, stderr: proc.stderr });
    // Small delay to avoid any race with temp files
    await new Promise(r => setTimeout(r, 50));
  }
  const outPath = path.join(cwd, 'test', 'run_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('Done. Results written to', outPath);
})();
