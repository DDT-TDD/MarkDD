const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
    console.log('Starting CV photo unit test...');

    // 1. Initialize a JSDOM window
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const window = dom.window;
    const document = window.document;

    global.window = window;
    global.document = document;
    global.NodeFilter = window.NodeFilter;
    global.DOMParser = window.DOMParser;
    global.TextEncoder = window.TextEncoder;

    // Stub markdownRenderer
    window.markdownRenderer = {
        render: async (md) => {
            return `<h2>Education</h2><p>Test school</p><h2>Skills</h2><ul><li>JS</li><li>Python</li></ul>`;
        }
    };

    // 2. Load CVManager
    const CVManager = require(path.join(__dirname, '../src/renderer/js/cv.js'));
    const cv = new CVManager();

    // 3. Test case with photo
    const markdown = `---
cv: true
theme: modern-sidebar
name: John Smith
photo: "assets/profile.jpg"
---
## Skills
- Python
- Javascript
`;

    console.log('Testing modern-sidebar theme with relative photo path...');
    const currentFilePath = path.join(__dirname, 'mock_cv.md');
    const html = await cv.generateHTML({
        markdown: markdown,
        theme: 'modern-sidebar',
        currentFilePath: currentFilePath
    });

    console.log('Checking generated HTML output...');
    
    // Verify path resolution
    const expectedPath = path.resolve(__dirname, 'assets/profile.jpg').replace(/\\/g, '/');
    const expectedUrl = 'file:///' + expectedPath;
    console.log(`Expected resolved URL: ${expectedUrl}`);
    
    if (html.includes(expectedUrl)) {
        console.log('SUCCESS: Relative photo path resolved and embedded correctly!');
    } else {
        console.error('FAILURE: Expected resolved url not found in generated HTML.');
        console.error(html);
        process.exit(1);
    }

    if (html.includes('class="cv-sidebar-photo"')) {
        console.log('SUCCESS: cv-sidebar-photo div was generated!');
    } else {
        console.error('FAILURE: cv-sidebar-photo div missing in modern-sidebar output.');
        process.exit(1);
    }

    // 4. Test case without photo (should not contain photo div)
    console.log('Testing case without photo...');
    const markdownNoPhoto = `---
cv: true
theme: modern-sidebar
name: John Smith
---
## Skills
- Python
`;
    const htmlNoPhoto = await cv.generateHTML({
        markdown: markdownNoPhoto,
        theme: 'modern-sidebar',
        currentFilePath: currentFilePath
    });

    console.log('htmlNoPhoto contains cv-sidebar-photo div:', htmlNoPhoto.includes('<div class="cv-sidebar-photo">'));
    console.log('htmlNoPhoto contains img tag:', htmlNoPhoto.includes('<img'));
    if (htmlNoPhoto.includes('<div class="cv-sidebar-photo">') || htmlNoPhoto.includes('<img')) {
        console.error('FAILURE: Photo div/image generated when photo was not defined.');
        process.exit(1);
    } else {
        console.log('SUCCESS: No photo div/image generated when photo is omitted.');
    }

    // 5. Test moderncv-casual centered layout
    console.log('Testing moderncv-casual casual layout with photo...');
    const htmlCasual = await cv.generateHTML({
        markdown: markdown,
        theme: 'moderncv-casual',
        currentFilePath: currentFilePath
    });

    if (htmlCasual.includes('class="cv-header has-photo-casual"')) {
        console.log('SUCCESS: cv-header has-photo-casual layout was generated!');
    } else {
        console.error('FAILURE: cv-header has-photo-casual layout missing in moderncv-casual.');
        process.exit(1);
    }

    // 6. Test moderncv-classic header layout
    console.log('Testing moderncv-classic layout with photo...');
    const htmlClassic = await cv.generateHTML({
        markdown: markdown,
        theme: 'moderncv-classic',
        currentFilePath: currentFilePath
    });

    if (htmlClassic.includes('class="cv-header has-photo"')) {
        console.log('SUCCESS: cv-header has-photo layout was generated!');
    } else {
        console.error('FAILURE: cv-header has-photo layout missing in moderncv-classic.');
        process.exit(1);
    }

    console.log('All tests passed successfully!');
}

run().catch(err => {
    console.error('Unhandled exception:', err);
    process.exit(1);
});
