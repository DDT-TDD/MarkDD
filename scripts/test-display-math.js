const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'display-math-test.md');
const md = fs.readFileSync(file, 'utf8');

function cleanLatexForKaTeX(content) {
    if (!content || typeof content !== 'string') return '';
    return content
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/<br\s*\/?>(?:\s*)/gi, ' \\\\ ')
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const displayMathRegex = /(?:<p[^>]*>\s*)?\$\$([\s\S]*?)\$\$(?:\s*<\/p>)?/gi;

console.log('--- Raw markdown ---');
console.log(md);

const matches = [...md.matchAll(/\$\$([\s\S]*?)\$\$/g)];
console.log('\nFound $$ matches (plain):', matches.length);
for (const m of matches) {
    console.log('---- raw match ----');
    console.log(m[1]);
    console.log('---- cleaned ----');
    console.log(cleanLatexForKaTeX(m[1]));
}

// Also test the new regex as it would see HTML-wrapped content
const htmlWrapped = md.replace(/\$\$([\s\S]*?)\$\$/g, (m,p)=>`<p>$$${p}$$</p>`);
const matches2 = [...htmlWrapped.matchAll(displayMathRegex)];
console.log('\nFound matches in HTML-wrapped:', matches2.length);
for (const m of matches2) {
    console.log('---- html-wrapped raw ----');
    console.log(m[1]);
    console.log('---- html-wrapped cleaned ----');
    console.log(cleanLatexForKaTeX(m[1]));
}
