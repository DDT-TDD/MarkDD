const fs = require('fs');
const html = fs.readFileSync('src/renderer/index.html', 'utf8');
const appJs = fs.readFileSync('src/renderer/js/app.js', 'utf8');

const regex = /id="(menu-[a-zA-Z0-9_-]+)"/g;
let m;
const menuIds = [];
while ((m = regex.exec(html)) !== null) {
    menuIds.push(m[1]);
}
console.log('Total menu IDs found in index.html:', menuIds.length);

const unwired = [];
for (const id of menuIds) {
    let wired = appJs.includes(id);
    if (!wired) {
        // Check dynamic template patterns
        if (id.startsWith('menu-cv-theme-')) {
            const theme = id.replace('menu-cv-theme-', '');
            wired = appJs.includes(`'${theme}'`) && appJs.includes('menu-cv-theme-');
        } else if (id.startsWith('menu-cv-preset-')) {
            const preset = id.replace('menu-cv-preset-', '');
            wired = appJs.includes(`'${preset}'`) && appJs.includes('menu-cv-preset-');
        } else if (id.startsWith('menu-help-cv-') && id.endsWith('-side')) {
            const type = id.replace('menu-help-cv-', '').replace('-side', '');
            wired = appJs.includes(`'${type}'`) && appJs.includes('menu-help-cv-');
        } else if (id.startsWith('menu-help-cv-')) {
            const type = id.replace('menu-help-cv-', '');
            wired = appJs.includes(`'${type}'`) && appJs.includes('menu-help-cv-');
        }
    }
    if (!wired) {
        unwired.push(id);
    }
}
console.log('Unwired menu IDs (' + unwired.length + '):', unwired);
if (unwired.length === 0) {
    console.log('✅ All menu IDs in index.html are properly wired in app.js!');
} else {
    process.exit(1);
}
