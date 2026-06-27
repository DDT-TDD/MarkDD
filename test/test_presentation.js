const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const marked = require('marked');

async function run() {
    console.log('Starting Presentation unit test...');

    // 1. Initialize a JSDOM window
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const window = dom.window;
    const document = window.document;

    global.window = window;
    global.document = document;
    global.Node = window.Node;
    global.NodeFilter = window.NodeFilter;
    global.DOMParser = window.DOMParser;
    global.TextEncoder = window.TextEncoder;
    window.marked = marked;

    // 2. Load PresentationManager
    const PresentationManager = require(path.join(__dirname, '../src/renderer/js/presentation.js'));
    const pm = new PresentationManager();

    // 3. Test Highlighting (==text==)
    console.log('Testing text highlight rendering...');
    const highlightMd = `## Slide 1
This is ==highlighted== text and this is regular.`;
    
    const parsedHighlight = pm.parseMarkdown(highlightMd);
    const htmlHighlight = pm.generateSlideHTML(parsedHighlight.slides[0], 0, 'berkeley');
    
    if (htmlHighlight.includes('<mark>highlighted</mark>')) {
        console.log('SUCCESS: Highlighting parsed and rendered correctly into <mark> tags!');
    } else {
        console.error('FAILURE: Highlight tags missing from output HTML.');
        console.error(htmlHighlight);
        process.exit(1);
    }

    // 4. Test Skills Lists (progress bars and tags)
    console.log('Testing skills progress bars and tag items...');
    const skillsMd = `## Technical Skills
- JavaScript | 90%
- Python | 4/5
- CSS | 8/10
- Git | 3
- Linux
`;

    const parsedSkills = pm.parseMarkdown(skillsMd);
    const htmlSkills = pm.generateSlideHTML(parsedSkills.slides[0], 0, 'berkeley');

    // Verify progress bars are generated
    const hasJSProgress = htmlSkills.includes('pres-skill-progress-item') && 
                          htmlSkills.includes('width: 90%;') && 
                          htmlSkills.includes('JavaScript');
    
    const hasPythonProgress = htmlSkills.includes('width: 80%;') && 
                            htmlSkills.includes('Python');
                            
    const hasCSSProgress = htmlSkills.includes('width: 80%;') && 
                          htmlSkills.includes('CSS');
                          
    const hasGitProgress = htmlSkills.includes('width: 60%;') && 
                          htmlSkills.includes('Git');

    const hasLinuxTag = htmlSkills.includes('class="pres-skill-item"') && 
                        htmlSkills.includes('Linux');

    if (hasJSProgress && hasPythonProgress && hasCSSProgress && hasGitProgress) {
        console.log('SUCCESS: Skill progress bars generated with correct percentages!');
    } else {
        console.error('FAILURE: Skill progress bars missing or incorrect percentages.');
        console.error(htmlSkills);
        process.exit(1);
    }

    if (hasLinuxTag) {
        console.log('SUCCESS: Tag pills rendered for skills without a rating!');
    } else {
        console.error('FAILURE: Tag pill missing for basic skill.');
        console.error(htmlSkills);
        process.exit(1);
    }

    // 5. Test Theme CSS Variable Injection
    console.log('Testing CSS variable injection in getThemeCSS...');
    const themeCSS = await pm.getThemeCSS('berkeley');
    if (themeCSS.includes('--slide-primary:') && themeCSS.includes('--slide-secondary:')) {
        console.log('SUCCESS: Dynamic color CSS variables injected correctly!');
    } else {
        console.error('FAILURE: CSS variables missing in getThemeCSS output.');
        console.error(themeCSS);
        process.exit(1);
    }

    console.log('All Presentation tests passed successfully!');
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
