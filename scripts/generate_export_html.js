const fs = require('fs');
const path = require('path');

(async function main(){
  try {
    const projectRoot = process.cwd();
    const mdPath = path.join(projectRoot, 'COMPREHENSIVE-FEATURES-SHOWCASE.md');
    if (!fs.existsSync(mdPath)) {
      console.error('Markdown file not found:', mdPath);
      process.exit(2);
    }

    const md = fs.readFileSync(mdPath, 'utf8');

    // Minimal conversion: preserve math delimiters ($...$, $$...$$, \(...\), \[...\])
    // Convert paragraphs (double newlines) to <p> blocks and single newlines to <br>
    function escapeHtmlKeepMath(s) {
      // Escape &, <, > but leave $ and backslashes intact
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const paragraphs = md.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    const htmlParagraphs = paragraphs.map(p => {
      const escaped = escapeHtmlKeepMath(p).replace(/\n/g, '<br>');
      return `<p>${escaped}</p>`;
    }).join('\n');

    const contentHtml = `\n<div class="export-content">\n${htmlParagraphs}\n</div>\n`;

    // Require the Preview class and reuse its template helpers
    const Preview = require(path.join(projectRoot, 'src', 'renderer', 'js', 'preview.js'));

    // createHTMLDocument and _sanitizeExportHtmlString are instance methods but do not use `this`
    const doc = Preview.prototype.createHTMLDocument.call(null, contentHtml, path.basename(mdPath));
    const sanitized = Preview.prototype._sanitizeExportHtmlString.call(null, doc);

    const outPath = path.join(projectRoot, 'exported_COMPREHENSIVE-FEATURES-SHOWCASE.html');
    fs.writeFileSync(outPath, sanitized, 'utf8');
    console.log('Exported HTML written to:', outPath);
    process.exit(0);
  } catch (err) {
    console.error('Export generation failed:', err);
    process.exit(1);
  }
})();
