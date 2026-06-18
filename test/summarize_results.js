const fs = require('fs');
const path = require('path');
const resultsPath = path.join(__dirname, 'run_results.json');
if (!fs.existsSync(resultsPath)) {
  console.error('run_results.json not found');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const issues = [];
for (const r of data) {
  const file = r.file;
  const status = r.status;
  const stderr = r.stderr || '';
  const stdout = r.stdout || '';
  const itemIssues = [];
  if (status !== 0) itemIssues.push(`exit code ${status}`);
  if (stderr && stderr.trim().length > 0) itemIssues.push('stderr output');
  // detect KaTeX parse errors in stdout
  if (/KaTeX parse error|katex-error|katex error|ParseError: KaTeX/i.test(stdout + '\n' + stderr)) itemIssues.push('KaTeX parse error');
  // detect missing placeholder divs when placeholders were found
  if (/Found placeholders to restore: \d+/i.test(stdout)) {
    const m1 = stdout.match(/Found placeholders to restore: (\d+)/i);
    const m2 = stdout.match(/Found placeholder divs in HTML: (\d+)/i);
    if (m1 && m2) {
      const want = parseInt(m1[1], 10);
      const got = parseInt(m2[1], 10);
      if (want !== got) itemIssues.push(`placeholder mismatch (${want}→${got})`);
    }
  }
  // detect explicit 'katex-error' marker in output
  if (/katex-error/i.test(stdout)) itemIssues.push('KaTeX error node present');

  if (itemIssues.length) issues.push({ file, issues: itemIssues, status, short: (stdout || '').split('\n').slice(0,6).join(' | ') });
}

if (issues.length === 0) {
  console.log('No issues detected: all runs exited 0, no stderr, no KaTeX parse errors, no placeholder mismatches');
  process.exit(0);
}

console.log('Summary of files with potential issues:');
for (const it of issues) {
  console.log('\n- ' + it.file);
  for (const s of it.issues) console.log('  - ' + s);
  console.log('  - snippet: ' + it.short.replace(/\s+/g,' ').substring(0,200));
}

const out = path.join(__dirname, 'run_issues.json');
fs.writeFileSync(out, JSON.stringify(issues, null, 2), 'utf8');
console.log('\nDetailed list written to', out);
process.exit(0);
