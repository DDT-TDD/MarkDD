const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const projectRoot = process.cwd();
  const inFile = path.join(projectRoot, 'exported_COMPREHENSIVE-FEATURES-SHOWCASE.html');
  const outFile = path.join(projectRoot, 'exported_COMPREHENSIVE-FEATURES-SHOWCASE.pdf');

  if (!fs.existsSync(inFile)) {
    console.error('Input HTML not found:', inFile);
    process.exit(2);
  }

  // Puppeteer options: use built-in chromium from puppeteer dependency
  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  try {
    const page = await browser.newPage();
    await page.goto('file://' + inFile, { waitUntil: 'networkidle2', timeout: 60000 });
  // Wait an additional short time to ensure MathJax finishes typesetting
  await new Promise(resolve => setTimeout(resolve, 1500));

    await page.pdf({
      path: outFile,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '12mm', bottom: '20mm', left: '12mm' }
    });

    console.log('PDF generated at:', outFile);
  } catch (err) {
    console.error('Puppeteer PDF generation failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
