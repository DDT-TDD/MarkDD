const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const JSZip = require('jszip');

async function run() {
    console.log('Starting PPTX Exporter unit test...');

    // 1. Initialize JSDOM window stub for global APIs
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const window = dom.window;
    
    global.window = window;
    global.document = window.document;
    global.DOMParser = window.DOMParser;
    global.Node = window.Node;
    global.NodeFilter = window.NodeFilter;

    // Load PresentationManager and mock window.markddApp
    const PresentationManager = require(path.join(__dirname, '../src/renderer/js/presentation.js'));
    const pm = new PresentationManager();
    window.markddApp = {
        presentationManager: pm
    };

    // 2. Load PPTXExporter
    const PPTXExporter = require(path.join(__dirname, '../src/renderer/js/pptx-exporter.js'));

    // 3. Define Markdown presentation content
    const markdown = `---
presentation: true
theme: simple-light
colors:
  background: "#1E1E1E"
  text: "#E0E0E0"
  primary: "#FF4C4C"
  secondary: "#A0A0A0"
---

# Title Slide Welcome

Subtitle of first slide

---

## Slide 2 Header

- Level 0 Bullet Point
  - Level 1 Bullet Point
Some regular paragraph text.
`;

    // 4. Test Exporting
    const tempOutputPath = path.join(__dirname, 'temp_exported_presentation.pptx');
    
    try {
        console.log('Testing PPTXExporter.exportCurrent()...');
        await PPTXExporter.exportCurrent(markdown, tempOutputPath, __dirname);

        // Verification checks
        if (!fs.existsSync(tempOutputPath)) {
            throw new Error('Exported PPTX file was not created');
        }

        const stats = fs.statSync(tempOutputPath);
        if (stats.size === 0) {
            throw new Error('Exported PPTX file is empty (0 bytes)');
        }

        console.log(`Successfully generated PPTX file: ${stats.size} bytes`);

        // Load the generated PPTX to verify its zip content structure
        const buffer = fs.readFileSync(tempOutputPath);
        const zip = await JSZip.loadAsync(buffer);

        // Verify key PPTX components exist
        const requiredFiles = [
            '[Content_Types].xml',
            'ppt/presentation.xml',
            'ppt/slides/slide1.xml',
            'ppt/slides/slide2.xml'
        ];

        for (const file of requiredFiles) {
            if (!zip.file(file)) {
                throw new Error(`Generated PPTX is missing required file: ${file}`);
            }
        }

        // Verify Slide 1 contents
        const slide1Xml = await zip.file('ppt/slides/slide1.xml').async('text');
        if (!slide1Xml.includes('Title Slide Welcome')) {
            throw new Error('Slide 1 is missing the title text');
        }

        // Verify Slide 2 contents
        const slide2Xml = await zip.file('ppt/slides/slide2.xml').async('text');
        if (!slide2Xml.includes('Slide 2 Header') || !slide2Xml.includes('Level 0 Bullet Point')) {
            throw new Error('Slide 2 is missing slide headers or bullet texts');
        }

        console.log('SUCCESS: PPTX Exporter unit test passed successfully!');
    } finally {
        // Clean up temp file
        if (fs.existsSync(tempOutputPath)) {
            fs.unlinkSync(tempOutputPath);
        }
    }
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
