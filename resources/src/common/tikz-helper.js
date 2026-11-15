const fs = require('fs');
const path = require('path');

/**
 * Load node-tikzjax from appRoot/References/node-tikzjax-main or node_modules.
 * Never relies on process.cwd() so packaged ASAR and file-associated launches work.
 */
function loadNodeTikzJax(appRoot) {
  const localTikZJaxPath = path.join(appRoot, 'References', 'node-tikzjax-main', 'dist', 'index.js');
  if (fs.existsSync(localTikZJaxPath)) {
    return { tikzjax: require(localTikZJaxPath), method: 'local-node-tikzjax', path: localTikZJaxPath };
  }
  const tikzjax = require('node-tikzjax');
  return { tikzjax, method: 'node-modules-tikzjax', path: 'node-tikzjax' };
}

function tidyTikzSource(code) {
  return String(code || '').split('\n').map(line => line.trimEnd()).join('\n');
}

function wrapTikzSource(tikzCode, isCircuit = false) {
  const finalCode = tidyTikzSource(tikzCode);
  if (finalCode.includes('\\begin{document}')) {
    if (finalCode.includes('\\documentclass')) {
      return finalCode.replace(/\\documentclass(\[.*?\])?\{.*?\}\s*/g, '');
    }
    return finalCode;
  }

  const packages = isCircuit
    ? '\\usepackage{tikz}\n\\usepackage{circuitikz}'
    : '\\usepackage{tikz}';

  if (finalCode.trim().startsWith('\\begin{tikzpicture}') ||
      finalCode.trim().startsWith('\\begin{circuitikz}')) {
    return `${packages}\n\\begin{document}\n${finalCode}\n\\end{document}`;
  }

  const environment = isCircuit ? 'circuitikz' : 'tikzpicture';
  return `${packages}\n\\begin{document}\n\\begin{${environment}}\n${finalCode}\n\\end{${environment}}\n\\end{document}`;
}

async function renderTikzServerSide(appRoot, { tikzCode, isCircuit = false }) {
  const { tikzjax, method } = loadNodeTikzJax(appRoot);
  const wrappedCode = wrapTikzSource(tikzCode, isCircuit);
  const options = { showConsole: true };

  if (typeof tikzjax.default === 'function') {
    const svg = await tikzjax.default(wrappedCode, options);
    return { success: true, svg, method };
  }
  if (typeof tikzjax === 'function') {
    const svg = await tikzjax(wrappedCode, options);
    return { success: true, svg, method };
  }
  throw new Error('Loaded node-tikzjax does not expose a callable default render function');
}

module.exports = {
  loadNodeTikzJax,
  tidyTikzSource,
  wrapTikzSource,
  renderTikzServerSide
};
