/**
 * PPTXExporter — MarkDD Presentation to PowerPoint exporter
 * Parses rendered HTML slides for accurate fidelity.
 * Works in Node.js (Tauri/Electron backend) and browser contexts.
 */
(() => {
'use strict';

const getFs = () => {
    if (typeof window !== 'undefined' && window.MarkDDBridge && window.MarkDDBridge.fs) return window.MarkDDBridge.fs;
    if (typeof require !== 'undefined') { try { return require('fs'); } catch(e) {} }
    return null;
};
const getPath = () => {
    if (typeof window !== 'undefined' && window.MarkDDBridge && window.MarkDDBridge.path) return window.MarkDDBridge.path;
    if (typeof require !== 'undefined') { try { return require('path'); } catch(e) {} }
    return null;
};
const getPptxGen = () => {
    if (typeof window !== 'undefined' && window.PptxGenJS) return window.PptxGenJS;
    if (typeof require !== 'undefined') { try { return require('pptxgenjs'); } catch(e) {} }
    return null;
};
const getZlib = () => {
    if (typeof require !== 'undefined') { try { return require('zlib'); } catch(e) {} }
    return null;
};

// ─── Theme palette ────────────────────────────────────────────────────────────
const THEME_PALETTE = {
    berkeley:         { primary:'#003262', secondary:'#FDB515', background:'#ffffff', text:'#333333', headerBg:'#003262', headerText:'#FDB515' },
    berlin:           { primary:'#2c3e50', secondary:'#3498db', background:'#ecf0f1', text:'#2c3e50', headerBg:'#2c3e50', headerText:'#ecf0f1' },
    copenhagen:       { primary:'#8B0000', secondary:'#FFD700', background:'#ffffff', text:'#333333', headerBg:'#8B0000', headerText:'#FFD700' },
    darmstadt:        { primary:'#004d99', secondary:'#99ccff', background:'#ffffff', text:'#333333', headerBg:'#004d99', headerText:'#99ccff' },
    warsaw:           { primary:'#660000', secondary:'#cc9933', background:'#f9f9f9', text:'#333333', headerBg:'#660000', headerText:'#cc9933' },
    madrid:           { primary:'#1a5490', secondary:'#e8ab3c', background:'#ffffff', text:'#2d2d2d', headerBg:'#1a5490', headerText:'#e8ab3c' },
    annarbor:         { primary:'#00274c', secondary:'#ffcb05', background:'#ffffff', text:'#333333', headerBg:'#00274c', headerText:'#ffcb05' },
    cambridgeus:      { primary:'#a51c30', secondary:'#9c9b99', background:'#ffffff', text:'#333333', headerBg:'#a51c30', headerText:'#f0f0f0' },
    pittsburgh:       { primary:'#003594', secondary:'#ffb81c', background:'#ffffff', text:'#333333', headerBg:'#003594', headerText:'#ffb81c' },
    rochester:        { primary:'#005a8b', secondary:'#f2a900', background:'#ffffff', text:'#333333', headerBg:'#005a8b', headerText:'#f2a900' },
    boadilla:         { primary:'#003f87', secondary:'#ffa300', background:'#ffffff', text:'#333333', headerBg:'#003f87', headerText:'#ffa300' },
    antibes:          { primary:'#2e3192', secondary:'#00aeef', background:'#ffffff', text:'#333333', headerBg:'#2e3192', headerText:'#00aeef' },
    juanlespins:      { primary:'#1e3a5f', secondary:'#76b82a', background:'#ffffff', text:'#333333', headerBg:'#1e3a5f', headerText:'#76b82a' },
    montpellier:      { primary:'#7a0019', secondary:'#f2a900', background:'#ffffff', text:'#333333', headerBg:'#7a0019', headerText:'#f2a900' },
    malmoe:           { primary:'#004477', secondary:'#ffaa00', background:'#ffffff', text:'#333333', headerBg:'#004477', headerText:'#ffaa00' },
    singapore:        { primary:'#8b0000', secondary:'#daa520', background:'#ffffff', text:'#333333', headerBg:'#8b0000', headerText:'#daa520' },
    szeged:           { primary:'#003366', secondary:'#99ccff', background:'#ffffff', text:'#333333', headerBg:'#003366', headerText:'#99ccff' },
    hannover:         { primary:'#006400', secondary:'#90ee90', background:'#ffffff', text:'#333333', headerBg:'#006400', headerText:'#90ee90' },
    marburg:          { primary:'#4b0082', secondary:'#da70d6', background:'#ffffff', text:'#333333', headerBg:'#4b0082', headerText:'#da70d6' },
    goettingen:       { primary:'#b8860b', secondary:'#ffd700', background:'#ffffff', text:'#333333', headerBg:'#b8860b', headerText:'#ffd700' },
    'berkeley-dark':  { primary:'#FDB515', secondary:'#3b7ea1', background:'#1a1a1a', text:'#e0e0e0', headerBg:'#003262', headerText:'#FDB515' },
    'berlin-light':   { primary:'#3498db', secondary:'#e74c3c', background:'#ffffff', text:'#2c3e50', headerBg:'#3498db', headerText:'#ffffff' },
    'copenhagen-blue':{ primary:'#1e90ff', secondary:'#ffd700', background:'#ffffff', text:'#333333', headerBg:'#1e90ff', headerText:'#ffd700' },
    'madrid-green':   { primary:'#2e7d32', secondary:'#81c784', background:'#ffffff', text:'#333333', headerBg:'#2e7d32', headerText:'#81c784' },
    'simple-light':   { primary:'#424242', secondary:'#2196f3', background:'#ffffff', text:'#212121', headerBg:'#f5f5f5', headerText:'#424242' },
    'simple-dark':    { primary:'#90caf9', secondary:'#ffab91', background:'#212121', text:'#e0e0e0', headerBg:'#1a1a1a', headerText:'#90caf9' },
    'minimal-gray':   { primary:'#607d8b', secondary:'#009688', background:'#fafafa', text:'#37474f', headerBg:'#eceff1', headerText:'#37474f' },
    'corporate-blue': { primary:'#0d47a1', secondary:'#42a5f5', background:'#ffffff', text:'#1565c0', headerBg:'#0d47a1', headerText:'#90caf9' },
    'aurora-forge':   { primary:'#ff1f1b', secondary:'#101820', background:'#ffffff', text:'#1f1f1f', headerBg:'#101820', headerText:'#ffffff' },
    'ddt-signature':  { primary:'#eb1c2d', secondary:'#1c1d26', background:'#ffffff', text:'#1a1d23', headerBg:'#1c1d26', headerText:'#ffffff' },
    'strata-pulse':   { primary:'#d6001c', secondary:'#ff6f61', background:'#f5f3f1', text:'#111111', headerBg:'#111111', headerText:'#f5f5f5' },
    default:          { primary:'#007ACC', secondary:'#5A6268', background:'#ffffff', text:'#333333', headerBg:'#007ACC', headerText:'#ffffff' },
};

function cleanHex(hex) { return hex ? hex.replace('#','').toUpperCase().trim() : ''; }

function getThemeColors(themeName, metadataColors) {
    const palette = THEME_PALETTE[themeName] || THEME_PALETTE.default;
    return {
        bg:         cleanHex((metadataColors && metadataColors.background) || palette.background),
        text:       cleanHex((metadataColors && metadataColors.text)        || palette.text),
        primary:    cleanHex((metadataColors && metadataColors.primary)     || palette.primary),
        secondary:  cleanHex((metadataColors && metadataColors.secondary)   || palette.secondary),
        headerBg:   cleanHex(palette.headerBg),
        headerText: cleanHex(palette.headerText),
    };
}

// ─── Kroki Deflate URL Encoder ────────────────────────────────────────────────
function encodeKrokiPayload(code) {
    if (!code) return null;
    const zlib = getZlib();
    if (zlib && typeof zlib.deflateSync === 'function') {
        const compressed = zlib.deflateSync(Buffer.from(code, 'utf8'));
        return compressed.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    }
    if (typeof window !== 'undefined' && window.pako) {
        const compressed = window.pako.deflate(code);
        let binary = '';
        for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_');
    }
    return null;
}

// ─── HTML entity decoder ───────────────────────────────────────────────────────
function decodeEntities(str) {
    if (!str) return '';
    return str
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&#x2F;/g, '/').replace(/&apos;/g, "'");
}

// ─── Strip HTML, preserving line breaks ───────────────────────────────────────
function stripHtml(html) {
    if (!html) return '';
    return decodeEntities(html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|li|tr|h[1-6]|blockquote|pre)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim());
}

// ─── Pre-process HTML: replace math containers with their LaTeX ────────────────
function preprocessHtml(html) {
    if (!html) return '';

    // 1. Replace display math containers with [MATH_DISPLAY:...]
    html = html.replace(/<div[^>]*\bclass="[^"]*\bmath-display\b[^"]*"[^>]*data-tex="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, (match, tex) => {
        return `\n[MATH_DISPLAY:${decodeEntities(tex)}]\n`;
    });

    // 2. Replace inline math containers with [MATH_INLINE:...]
    html = html.replace(/<span[^>]*\bclass="[^"]*\bmath-inline\b[^"]*"[^>]*data-tex="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, (match, tex) => {
        return ` [MATH_INLINE:${decodeEntities(tex)}] `;
    });

    // 3. Fallback for any math containers with data-tex
    html = html.replace(/<(?:span|div)[^>]*\bdata-tex="([^"]*)"[^>]*>[\s\S]*?<\/(?:span|div)>/gi, (match, tex) => {
        return ` [MATH_INLINE:${decodeEntities(tex)}] `;
    });

    // 4. Remove leftover mjx-container
    html = html.replace(/<mjx-container[\s\S]*?<\/mjx-container>/gi, '');

    // 5. Remove script/style blocks & copy buttons
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    html = html.replace(/<button[^>]*class="[^"]*copy[^"]*"[^>]*>[\s\S]*?<\/button>/gi, '');

    return html;
}

// ─── Extract all regex matches ─────────────────────────────────────────────────
function matchAll(str, regex) {
    const results = [];
    const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    let m;
    while ((m = r.exec(str)) !== null) results.push(m);
    return results;
}

// ─── Parse slide HTML into structured data ─────────────────────────────────────
function parseSlideHtml(slideHtml, rawMarkdown, slideType) {
    const processed = preprocessHtml(slideHtml || '');

    const result = {
        title: '',
        subheadings: [],
        paragraphs: [],
        bullets: [],
        codeBlocks: [],
        tables: [],
        imageSrcs: [],
        mermaidCodes: [],
        hasColumns: false,
        columns: [],
        blockquotes: [],
        displayMath: [],
    };

    // 1. Extract title: prefer h1, fall back to h2
    const h1m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(processed);
    if (h1m) {
        result.title = stripHtml(h1m[1]).replace(/\n+/g,' ').trim();
    } else {
        const h2m = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(processed);
        if (h2m) result.title = stripHtml(h2m[1]).replace(/\n+/g,' ').trim();
    }

    // 2. Sub-headings (h3 and below, excluding h1/h2 title)
    matchAll(processed, /<h([3-6])[^>]*>([\s\S]*?)<\/h[3-6]>/gi).forEach(m => {
        result.subheadings.push({ level: parseInt(m[1]), text: stripHtml(m[2]).replace(/\n+/g,' ').trim() });
    });

    // 3. Multi-column — match all div.column directly
    const colMatches = matchAll(processed, /<div[^>]*class="[^"]*\bcol(?:umn)?\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi);
    if (colMatches.length >= 2) {
        result.hasColumns = true;
        result.columns = colMatches.map(m => m[1]); // Inner HTML of each column
    }

    // 4. Mermaid code — from <div class="mermaid">raw code</div>
    matchAll(processed, /<div[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi).forEach(m => {
        const code = decodeEntities(m[1]).trim();
        if (code && !result.mermaidCodes.includes(code)) result.mermaidCodes.push(code);
    });
    if (rawMarkdown && !result.mermaidCodes.length) {
        matchAll(rawMarkdown, /```mermaid\s*\n([\s\S]*?)\n```/gi).forEach(m => {
            const code = m[1].trim();
            if (code && !result.mermaidCodes.includes(code)) result.mermaidCodes.push(code);
        });
    }

    // 5. Code blocks from <pre><code>
    matchAll(processed, /<pre[^>]*><code(?:\s[^>]*class="[^"]*language-([^"\s]*)[^"]*")?[^>]*>([\s\S]*?)<\/code><\/pre>/gi).forEach(m => {
        const lang = (m[1] || '').toLowerCase();
        if (lang === 'mermaid') return;
        const code = decodeEntities(stripHtml(m[2]));
        if (code.trim()) result.codeBlocks.push({ lang, code: code.trim() });
    });
    if (rawMarkdown && !result.codeBlocks.length) {
        matchAll(rawMarkdown, /```([a-z0-9_-]*)\s*\n([\s\S]*?)\n```/gi).forEach(m => {
            const lang = (m[1] || '').toLowerCase();
            if (lang === 'mermaid') return;
            result.codeBlocks.push({ lang, code: m[2].trim() });
        });
    }

    // 6. Tables — from <table>
    matchAll(processed, /<table[^>]*>([\s\S]*?)<\/table>/gi).forEach(tbl => {
        const rows = [];
        matchAll(tbl[1], /<tr[^>]*>([\s\S]*?)<\/tr>/gi).forEach((rowM, ri) => {
            const cells = [];
            matchAll(rowM[1], /<t([dh])[^>]*>([\s\S]*?)<\/t[dh]>/gi).forEach(cellM => {
                cells.push({ text: stripHtml(cellM[2]).replace(/\n+/g,' ').trim(), isHeader: cellM[1] === 'h' || ri === 0 });
            });
            if (cells.length) rows.push(cells);
        });
        if (rows.length >= 1) result.tables.push(rows);
    });

    // 7. Images
    matchAll(processed, /<img[^>]+src="([^"]+)"/gi).forEach(m => {
        if (m[1] && !result.imageSrcs.includes(m[1])) result.imageSrcs.push(m[1]);
    });
    if (rawMarkdown) {
        matchAll(rawMarkdown, /!\[[^\]]*\]\(([^)\s"']+)/g).forEach(m => {
            if (m[1] && !result.imageSrcs.includes(m[1])) result.imageSrcs.push(m[1]);
        });
    }

    // 8. Bullets — recursive list parsing (skip column container bullets if columns extracted)
    let bodyForLists = processed;
    if (result.hasColumns) {
        bodyForLists = bodyForLists.replace(/<div[^>]*class="[^"]*\bcolumns\b[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=\s*<\/div>|$)/gi, '');
    }

    function extractBullets(html, level, ordered) {
        matchAll(html, /<li[^>]*>([\s\S]*?)<\/li>/gi).forEach(liM => {
            let liContent = liM[1];
            const nestedUl = /<ul[^>]*>([\s\S]*?)<\/ul>/gi.exec(liContent);
            const nestedOl = /<ol[^>]*>([\s\S]*?)<\/ol>/gi.exec(liContent);
            liContent = liContent.replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, '').replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, '');
            const text = stripHtml(liContent).replace(/\n+/g,' ').trim();
            if (text) result.bullets.push({ text, level, ordered });
            if (nestedUl) extractBullets(nestedUl[1], level + 1, false);
            if (nestedOl) extractBullets(nestedOl[1], level + 1, true);
        });
    }
    matchAll(bodyForLists, /<ul[^>]*>([\s\S]*?)<\/ul>/gi).forEach(m => extractBullets(m[1], 0, false));
    matchAll(bodyForLists, /<ol[^>]*>([\s\S]*?)<\/ol>/gi).forEach(m => {
        if (!result.bullets.some(b => b.ordered)) extractBullets(m[1], 0, true);
    });

    // 9. Blockquotes — extract first, then strip from body to avoid duplication
    matchAll(processed, /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi).forEach(m => {
        const text = stripHtml(m[1]).replace(/\n+/g,' ').trim();
        if (text) result.blockquotes.push(text);
    });

    // 10. Display math blocks
    matchAll(processed, /\[MATH_DISPLAY:([^\]]+)\]/g).forEach(m => {
        result.displayMath.push(m[1].trim());
    });

    // 11. Paragraphs (strip tables, code, blockquotes, lists, headers to avoid duplication)
    let bodyForParagraphs = processed
        .replace(/<table[\s\S]*?<\/table>/gi, '')
        .replace(/<pre[\s\S]*?<\/pre>/gi, '')
        .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, '')
        .replace(/<div[^>]*class="[^"]*mermaid[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<ul[^>]*>[\s\S]*?<\/ul>/gi, '')
        .replace(/<ol[^>]*>[\s\S]*?<\/ol>/gi, '')
        .replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '');

    if (result.hasColumns) {
        bodyForParagraphs = bodyForParagraphs.replace(/<div[^>]*class="[^"]*\bcol(?:umn)?\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
    }

    matchAll(bodyForParagraphs, /<p[^>]*>([\s\S]*?)<\/p>/gi).forEach(m => {
        const text = stripHtml(m[1]).replace(/\n+/g,' ').trim();
        if (text) result.paragraphs.push(text);
    });

    return result;
}

// ─── LaTeX → readable Unicode math ────────────────────────────────────────────
function latexToUnicode(tex) {
    if (!tex) return '';

    const supMap = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','=':'⁼','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ','x':'ˣ'};
    const subMap = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','+':'₊','-':'₋','=':'₌','(':'₍',')':'₎','a':'ₐ','e':'ₑ','o':'ₒ','x':'ₓ','h':'ₕ','k':'ₖ','l':'ₗ','m':'ₘ','n':'ₙ','p':'ₚ','s':'ₛ','t':'ₜ'};

    const toSup = str => str.split('').map(c => supMap[c] || c).join('');
    const toSub = str => str.split('').map(c => subMap[c] || c).join('');

    let s = tex
        .replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, (m, sub, sup) => `∫${toSub(sub)}${toSup(sup)}`)
        .replace(/\\int_([a-z0-9]+)\^([a-z0-9]+)/g, (m, sub, sup) => `∫${toSub(sub)}${toSup(sup)}`)
        .replace(/\\int/g, '∫')
        .replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, (m, sub, sup) => `∑${toSub(sub)}${toSup(sup)}`)
        .replace(/\\sum_([a-z0-9=]+)\^([a-z0-9\infty]+)/g, (m, sub, sup) => `∑${toSub(sub)}${toSup(sup)}`)
        .replace(/\\sum/g, '∑')
        .replace(/\\prod/g, '∏')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)').replace(/\\sqrt/g, '√')
        .replace(/\\mathbf\{([^}]+)\}/g, '$1').replace(/\\mathrm\{([^}]+)\}/g, '$1')
        .replace(/\\text\{([^}]+)\}/g, '$1').replace(/\\mathit\{([^}]+)\}/g, '$1')
        .replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan')
        .replace(/\\ln/g, 'ln').replace(/\\log/g, 'log').replace(/\\lim/g, 'lim')
        .replace(/\\exp/g, 'exp').replace(/\\max/g, 'max').replace(/\\min/g, 'min')
        .replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\gamma/g, 'γ')
        .replace(/\\delta/g, 'δ').replace(/\\epsilon/g, 'ε').replace(/\\theta/g, 'θ')
        .replace(/\\lambda/g, 'λ').replace(/\\mu/g, 'μ').replace(/\\nu/g, 'ν')
        .replace(/\\pi/g, 'π').replace(/\\rho/g, 'ρ').replace(/\\sigma/g, 'σ')
        .replace(/\\tau/g, 'τ').replace(/\\phi/g, 'φ').replace(/\\omega/g, 'ω')
        .replace(/\\Gamma/g, 'Γ').replace(/\\Delta/g, 'Δ').replace(/\\Theta/g, 'Θ')
        .replace(/\\Lambda/g, 'Λ').replace(/\\Pi/g, 'Π').replace(/\\Sigma/g, 'Σ')
        .replace(/\\Phi/g, 'Φ').replace(/\\Omega/g, 'Ω')
        .replace(/\\infty/g, '∞').replace(/\\nabla/g, '∇').replace(/\\partial/g, '∂')
        .replace(/\\cdot/g, '·').replace(/\\times/g, '×').replace(/\\div/g, '÷')
        .replace(/\\leq/g, '≤').replace(/\\geq/g, '≥').replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈').replace(/\\equiv/g, '≡').replace(/\\pm/g, '±')
        .replace(/\\rightarrow/g, '→').replace(/\\leftarrow/g, '←').replace(/\\Rightarrow/g, '⇒')
        .replace(/\\forall/g, '∀').replace(/\\exists/g, '∃').replace(/\\in/g, '∈')
        .replace(/\^\{([^}]+)\}/g, (m, sup) => toSup(sup))
        .replace(/_\{([^}]+)\}/g, (m, sub) => toSub(sub))
        .replace(/\^2\b/g, '²').replace(/\^3\b/g, '³').replace(/\^n\b/g, 'ⁿ')
        .replace(/\\quad/g, '  ').replace(/\\,/g, ' ').replace(/\\\\/g, ' ')
        .replace(/\\/g, '').replace(/[{}]/g, '')
        .replace(/\s+/g, ' ').trim();

    return s;
}

// ─── Build PptxGenJS text runs ────────────────────────────────────────────────
function buildRuns(text, baseOpts) {
    if (!text) return [];

    const runs = [];
    const tok = /(\[MATH_INLINE:([^\]]+)\]|\[MATH_DISPLAY:([^\]]+)\]|\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|`[^`]+`)/g;
    let last = 0, m;
    while ((m = tok.exec(text)) !== null) {
        if (m.index > last) {
            runs.push({ text: text.slice(last, m.index), options: { ...baseOpts }});
        }
        const t = m[0];
        if (t.startsWith('[MATH_INLINE:')) {
            runs.push({ text: latexToUnicode(m[2]), options: { ...baseOpts, fontFace: 'Cambria Math', italic: true }});
        } else if (t.startsWith('[MATH_DISPLAY:')) {
            runs.push({ text: '\n' + latexToUnicode(m[3]) + '\n', options: { ...baseOpts, fontFace: 'Cambria Math', fontSize: (baseOpts.fontSize || 14) + 3, bold: true, italic: true, breakLine: true }});
        } else if (t.startsWith('***')) {
            runs.push({ text: t.slice(3, -3), options: { ...baseOpts, bold: true, italic: true }});
        } else if (t.startsWith('**')) {
            runs.push({ text: t.slice(2, -2), options: { ...baseOpts, bold: true }});
        } else if (t.startsWith('*')) {
            runs.push({ text: t.slice(1, -1), options: { ...baseOpts, italic: true }});
        } else if (t.startsWith('`')) {
            runs.push({ text: t.slice(1, -1), options: { ...baseOpts, fontFace: 'Consolas', fontSize: (baseOpts.fontSize || 14) - 2, color: 'C7254E' }});
        }
        last = m.index + t.length;
    }
    if (last < text.length) runs.push({ text: text.slice(last), options: { ...baseOpts }});
    return runs.length ? runs : [{ text, options: baseOpts }];
}

// ─── Build text runs for body block ───────────────────────────────────────────
function buildBodyRuns(parsed, colors, fontSize) {
    const runs = [];
    const fs = fontSize || 14;

    // Sub-headings (h3)
    parsed.subheadings.forEach(s => {
        runs.push({ text: s.text + '\n', options: { fontFace:'Calibri', fontSize: fs + 2, bold: true, color: colors.secondary || colors.primary, breakLine: false }});
    });

    // Paragraphs
    parsed.paragraphs.forEach(p => {
        if (!p.trim()) return;
        const hasMath = p.includes('[MATH_');
        const opts = { fontFace: hasMath ? 'Cambria Math' : 'Calibri', fontSize: fs, color: colors.text, breakLine: true };
        runs.push(...buildRuns(p, opts));
        runs.push({ text: '\n', options: { fontSize: 4, breakLine: false }});
    });

    // Bullets
    parsed.bullets.forEach(b => {
        const opts = { fontFace:'Calibri', fontSize: fs, color: colors.text, bullet: true, indentLevel: b.level, breakLine: true };
        runs.push(...buildRuns(b.text, opts));
    });

    // Blockquotes
    parsed.blockquotes.forEach(bq => {
        runs.push({ text: '❝ ' + bq + '\n', options: { fontFace:'Calibri', fontSize: fs, italic: true, color: colors.secondary || '666666', breakLine: true }});
    });

    return runs;
}

// ─── Main Exporter Class ───────────────────────────────────────────────────────
class PPTXExporter {

    static async exportCurrent(markdown, outputPath, currentFileDir = '', renderedSlides = null) {
        console.log('[PPTXExporter] Starting export:', outputPath);
        const pptxgen = getPptxGen();
        if (!pptxgen) throw new Error('PptxGenJS library is not available. Please check dependencies.');

        let slides = [];
        let metadata = {};

        try {
            if (typeof window !== 'undefined' && window.PresentationManager) {
                const pm = (window.markddApp && window.markddApp.presentationManager) || new window.PresentationManager();
                const parsed = pm.parseMarkdown(markdown);
                slides = parsed.slides || [];
                metadata = parsed.metadata || {};
            } else if (typeof require !== 'undefined') {
                let PresentationManager = null;
                try { PresentationManager = require('./presentation.js'); } catch(e) {}
                if (PresentationManager) {
                    const pm = new PresentationManager();
                    const parsed = pm.parseMarkdown(markdown);
                    slides = parsed.slides || [];
                    metadata = parsed.metadata || {};
                } else {
                    slides = markdown.split(/\n---\n/).map(c => ({ content: c.trim(), type: 'standard' }));
                }
            } else {
                slides = markdown.split(/\n---\n/).map(c => ({ content: c.trim(), type: 'standard' }));
            }
        } catch(e) {
            console.warn('[PPTXExporter] PresentationManager fallback:', e.message);
            slides = markdown.split(/\n---\n/).map(c => ({ content: c.trim(), type: 'standard' }));
        }

        const globalTheme = (metadata.theme || 'default').toLowerCase();

        const pptx = new pptxgen();
        pptx.layout  = 'LAYOUT_16x9';
        pptx.author  = metadata.author  || 'MarkDD';
        pptx.subject = metadata.title   || 'Presentation';
        pptx.title   = metadata.title   || 'Presentation';

        for (let idx = 0; idx < slides.length; idx++) {
            const slide = slides[idx];
            const renderedHtml = (renderedSlides && renderedSlides[idx])
                ? (renderedSlides[idx].html || renderedSlides[idx] || '')
                : '';

            let slideTheme = globalTheme;
            const themeM = renderedHtml.match(/data-theme="([^"]+)"/i);
            if (themeM && themeM[1]) slideTheme = themeM[1].toLowerCase();

            const colors = getThemeColors(slideTheme, metadata.colors);

            const pptxSlide = pptx.addSlide();
            pptxSlide.background = { fill: colors.bg };
            if (slide.notes) pptxSlide.addNotes(slide.notes);

            const parsed = parseSlideHtml(renderedHtml, slide.content || '', slide.type);

            const isTitleSlide = (slide.type === 'title') || (idx === 0 && !slide.type);
            const isLastSlide  = (idx === slides.length - 1 && slides.length > 1 && slide.type === 'title');

            if (isTitleSlide || isLastSlide) {
                await PPTXExporter.buildTitleSlide(pptxSlide, parsed, slide, colors, currentFileDir, metadata, idx);
            } else {
                await PPTXExporter.buildContentSlide(pptxSlide, parsed, slide, colors, currentFileDir);
            }
        }

        await PPTXExporter.save(pptx, outputPath);
        console.log('[PPTXExporter] Saved successfully:', outputPath);
    }

    // ── Title Slide ────────────────────────────────────────────────────────────
    static async buildTitleSlide(pptxSlide, parsed, slide, colors, currentFileDir, metadata, idx) {
        pptxSlide.addShape('rect', {
            x: 0, y: 5.6, w: '100%', h: 0.9,
            fill: { color: colors.headerBg }, line: { type: 'none' }
        });
        pptxSlide.addShape('rect', {
            x: 0, y: 0, w: '100%', h: 0.12,
            fill: { color: colors.primary }, line: { type: 'none' }
        });

        const title = parsed.title || (idx === 0 ? (metadata.title || 'Presentation') : 'Thank You!');
        pptxSlide.addText(title, {
            x: 0.5, y: 1.0, w: 9.0, h: 2.0,
            fontSize: 40, fontFace: 'Calibri', bold: true,
            color: colors.primary, align: 'center', valign: 'middle',
        });

        const subtitleParts = [
            idx === 0 ? (metadata.author || '') : '',
            idx === 0 ? (metadata.date   || '') : '',
            parsed.paragraphs[0] || '',
            parsed.subheadings[0]?.text || '',
        ].filter(Boolean);
        if (subtitleParts.length) {
            pptxSlide.addText(subtitleParts.join('  •  '), {
                x: 0.5, y: 3.2, w: 9.0, h: 0.8,
                fontSize: 18, fontFace: 'Calibri', color: colors.text, align: 'center',
            });
        }

        if (parsed.imageSrcs.length) {
            const resolved = await PPTXExporter.resolveImage(parsed.imageSrcs[0], currentFileDir);
            if (resolved) PPTXExporter.addImage(pptxSlide, resolved, 7.0, 0.5, 2.5, 2.5);
        }
    }

    // ── Content Slide ──────────────────────────────────────────────────────────
    static async buildContentSlide(pptxSlide, parsed, slide, colors, currentFileDir) {
        const HEADER_H  = 0.65;
        const CONTENT_Y = HEADER_H + 0.15;
        const CONTENT_H = 7.5 - CONTENT_Y - 0.15;
        const SLIDE_W   = 10.0;
        const MARGIN    = 0.25;

        // Header bar
        pptxSlide.addShape('rect', {
            x: 0, y: 0, w: '100%', h: HEADER_H,
            fill: { color: colors.headerBg }, line: { type: 'none' }
        });
        if (parsed.title) {
            pptxSlide.addText(parsed.title, {
                x: MARGIN, y: 0, w: SLIDE_W - MARGIN * 2, h: HEADER_H,
                fontSize: 20, fontFace: 'Calibri', bold: true,
                color: colors.headerText, valign: 'middle',
            });
        }

        // ── Multi-Column Layout ───────────────────────────────────────────────
        if (parsed.hasColumns && parsed.columns.length >= 2) {
            const colCount = parsed.columns.length;
            const colW = (SLIDE_W - MARGIN * 2 - (colCount - 1) * 0.25) / colCount;
            parsed.columns.forEach((colHtml, ci) => {
                const colParsed = parseSlideHtml(colHtml, '', 'standard');
                const colRuns = buildBodyRuns(colParsed, colors, 14);
                if (colRuns.length) {
                    pptxSlide.addText(colRuns, {
                        x: MARGIN + ci * (colW + 0.25), y: CONTENT_Y, w: colW, h: CONTENT_H,
                        fontSize: 14, fontFace: 'Calibri', valign: 'top', wrap: true,
                    });
                }
            });
            return;
        }

        // ── Determine Layout ─────────────────────────────────────────────────
        const hasMermaid = parsed.mermaidCodes.length > 0;
        const hasImage   = parsed.imageSrcs.length > 0;
        const hasCode    = parsed.codeBlocks.length > 0;
        const hasTable   = parsed.tables.length > 0;
        const hasMath    = parsed.displayMath.length > 0;
        const hasVisual  = hasMermaid || hasImage;

        const textW   = hasVisual ? 4.7 : (SLIDE_W - MARGIN * 2);
        const visualX = MARGIN + textW + 0.15;
        const visualW = SLIDE_W - visualX - MARGIN;

        // Text body
        if (!hasCode || (hasCode && (hasVisual || parsed.bullets.length || parsed.paragraphs.length))) {
            const runs = buildBodyRuns(parsed, colors, 14);
            if (runs.length) {
                const textH = (hasCode || hasMath) ? Math.min(CONTENT_H * 0.45, 2.3) : CONTENT_H;
                try {
                    pptxSlide.addText(runs, {
                        x: MARGIN, y: CONTENT_Y, w: textW, h: textH,
                        fontSize: 14, fontFace: 'Calibri', valign: 'top', wrap: true,
                    });
                } catch(e) {
                    console.warn('[PPTXExporter] Text error:', e.message);
                }
            }
        }

        // Display Math Equations (Rendered via CodeCogs PNG equation API)
        if (hasMath) {
            const hasText = parsed.bullets.length || parsed.paragraphs.length || parsed.subheadings.length;
            let mathY = hasText ? CONTENT_Y + Math.min(CONTENT_H * 0.45, 2.4) : CONTENT_Y;

            for (let mi = 0; mi < parsed.displayMath.length; mi++) {
                const tex = parsed.displayMath[mi];
                try {
                    const encodedTex = encodeURIComponent(tex);
                    const url = `https://latex.codecogs.com/png.latex?\\dpi{300}\\huge%20${encodedTex}`;
                    const resolvedMath = await PPTXExporter.resolveImage(url, currentFileDir);
                    if (resolvedMath) {
                        const mathW = Math.min(textW, 5.0);
                        const mathH = 0.9;
                        const mathX = MARGIN + (textW - mathW) / 2;
                        PPTXExporter.addImage(pptxSlide, resolvedMath, mathX, mathY, mathW, mathH);
                        mathY += mathH + 0.2;
                    } else {
                        // Fallback text
                        pptxSlide.addText(latexToUnicode(tex), {
                            x: MARGIN, y: mathY, w: textW, h: 0.8,
                            fontFace: 'Cambria Math', fontSize: 18, bold: true, italic: true,
                            color: colors.primary, align: 'center', valign: 'middle'
                        });
                        mathY += 0.9;
                    }
                } catch(mErr) {
                    console.warn('[PPTXExporter] Math PNG render error:', mErr.message);
                }
            }
        }

        // Code block
        if (hasCode) {
            const hasText = parsed.bullets.length || parsed.paragraphs.length || parsed.subheadings.length;
            const codeY   = hasText ? CONTENT_Y + Math.min(CONTENT_H * 0.45, 2.4) : CONTENT_Y;
            const codeH   = CONTENT_H - (hasText ? Math.min(CONTENT_H * 0.45, 2.4) : 0);
            parsed.codeBlocks.slice(0, 2).forEach((cb, ci) => {
                const perH = Math.max(1.5, codeH / Math.min(parsed.codeBlocks.length, 2) - 0.1);
                pptxSlide.addText(cb.code, {
                    x: MARGIN, y: codeY + ci * (perH + 0.1), w: textW, h: perH,
                    fontFace: 'Consolas', fontSize: 11,
                    color: '1F2328', fill: { color: 'F6F8FA' },
                    border: { type: 'solid', pt: 0.75, color: 'D1D9E0' },
                    margin: [8, 10, 8, 10],
                    valign: 'top', align: 'left', wrap: true,
                });
            });
        }

        // Table
        if (hasTable && !hasVisual) {
            const tableRows = parsed.tables[0];
            if (tableRows && tableRows.length) {
                const tableData = tableRows.map((row, ri) => row.map(cell => ({
                    text: cell.text,
                    options: {
                        fontFace: 'Calibri', fontSize: 13,
                        bold: ri === 0 || cell.isHeader,
                        color: (ri === 0 || cell.isHeader) ? 'FFFFFF' : colors.text,
                        fill: { color: (ri === 0 || cell.isHeader) ? colors.primary : colors.bg },
                        align: 'center', valign: 'middle', border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }
                    }
                })));
                const colCount = tableData[0]?.length || 1;
                const tblW = hasCode ? textW : (SLIDE_W - MARGIN * 2);
                const tblX = MARGIN;
                const tblY = hasCode ? CONTENT_Y : (CONTENT_Y + (parsed.bullets.length || parsed.paragraphs.length ? 2.0 : 0));
                try {
                    pptxSlide.addTable(tableData, {
                        x: tblX, y: tblY, w: tblW,
                        colW: Array(colCount).fill(tblW / colCount),
                        border: { type: 'solid', pt: 0.5, color: 'CCCCCC' },
                    });
                } catch(e) {
                    console.warn('[PPTXExporter] Table error:', e.message);
                }
            }
        }

        // Visuals (Kroki PNG diagrams & images)
        if (hasVisual) {
            let visualY = CONTENT_Y;
            const visualCount = parsed.mermaidCodes.length + parsed.imageSrcs.length;
            const perH = Math.min(CONTENT_H / visualCount, CONTENT_H) - 0.05;

            // Render Mermaid via Kroki PNG URL
            for (const mCode of parsed.mermaidCodes) {
                try {
                    const b64url = encodeKrokiPayload(mCode);
                    if (b64url) {
                        const url = `https://kroki.io/mermaid/png/${b64url}`;
                        const resolved = await PPTXExporter.resolveImage(url, currentFileDir);
                        if (resolved) {
                            PPTXExporter.addImage(pptxSlide, resolved, visualX, visualY, visualW, perH);
                            visualY += perH + 0.05;
                        }
                    }
                } catch(e) { console.warn('[PPTXExporter] Mermaid render failed:', e.message); }
            }

            // Regular images
            for (const src of parsed.imageSrcs) {
                const resolved = await PPTXExporter.resolveImage(src, currentFileDir);
                if (resolved) {
                    PPTXExporter.addImage(pptxSlide, resolved, visualX, visualY, visualW, perH);
                    visualY += perH + 0.05;
                }
            }
        }
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    static addImage(pptxSlide, resolved, x, y, w, h) {
        try {
            const opts = { x, y, w, h, sizing: { type: 'contain', w, h }};
            if (resolved.startsWith('data:')) {
                pptxSlide.addImage({ ...opts, data: resolved });
            } else {
                pptxSlide.addImage({ ...opts, path: resolved });
            }
        } catch(e) { console.warn('[PPTXExporter] addImage failed:', e.message); }
    }

    static async resolveImage(src, currentFileDir) {
        if (!src) return null;
        const fs   = getFs();
        const path = getPath();

        if (src.startsWith('data:')) return src;

        // Remote URL (e.g. Kroki PNG, CodeCogs PNG, or picsum photos)
        if (/^https?:\/\//.test(src)) {
            try {
                if (typeof fetch !== 'undefined') {
                    const resp = await fetch(src, { signal: AbortSignal.timeout?.(12000) });
                    if (!resp.ok) return src;
                    const ab  = await resp.arrayBuffer();
                    const ct  = resp.headers.get('content-type') || 'image/png';
                    let b64;
                    if (typeof Buffer !== 'undefined') {
                        b64 = Buffer.from(ab).toString('base64');
                    } else {
                        b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
                    }
                    return `data:${ct};base64,${b64}`;
                } else if (typeof require !== 'undefined') {
                    const httpMod = src.startsWith('https') ? require('https') : require('http');
                    const buf = await new Promise((res, rej) => {
                        const chunks = [];
                        const req = httpMod.get(src, r => {
                            if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
                                PPTXExporter.resolveImage(r.headers.location, currentFileDir).then(res).catch(rej);
                                return;
                            }
                            if (r.statusCode !== 200) { rej(new Error('HTTP ' + r.statusCode)); return; }
                            r.on('data', d => chunks.push(d));
                            r.on('end', () => res(Buffer.concat(chunks)));
                            r.on('error', rej);
                        });
                        req.on('error', rej);
                        req.setTimeout(12000, () => { req.destroy(); rej(new Error('timeout')); });
                    });
                    if (typeof buf === 'string' && buf.startsWith('data:')) return buf;
                    const mime = src.endsWith('.svg') ? 'image/svg+xml' :
                                 src.endsWith('.jpg') || src.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
                    return `data:${mime};base64,${buf.toString('base64')}`;
                }
            } catch(e) {
                console.warn('[PPTXExporter] Remote image fetch failed:', src, '-', e.message);
                return src;
            }
        }

        // Local file
        try {
            let abs = src;
            if (src.startsWith('file:')) {
                abs = decodeURIComponent(src.replace(/^file:\/\/\/?/, '').replace(/\//g, '\\'));
            } else if (path && !path.isAbsolute(src)) {
                abs = path.resolve(currentFileDir || (typeof process !== 'undefined' ? process.cwd() : ''), src);
            }
            if (fs && fs.existsSync(abs)) {
                const raw  = fs.readFileSync(abs);
                const ext  = path ? path.extname(abs).toLowerCase().slice(1) : 'png';
                const mime = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml' }[ext] || 'image/png';
                const b64  = Buffer.isBuffer(raw) ? raw.toString('base64') : Buffer.from(raw).toString('base64');
                return `data:${mime};base64,${b64}`;
            }
        } catch(e) { console.warn('[PPTXExporter] Local image failed:', src, '-', e.message); }

        return null;
    }

    static async save(pptx, outputPath) {
        const fs = getFs();
        if (!fs) throw new Error('File system not available.');
        try {
            const buf = await pptx.write('nodebuffer');
            fs.writeFileSync(outputPath, buf);
        } catch(_) {
            const b64 = await pptx.write('base64');
            fs.writeFileSync(outputPath, Buffer.from(b64, 'base64'));
        }
    }

    static cleanHex(hex) { return cleanHex(hex); }
    static parseFallbackSlides(markdown) {
        const slides = markdown.split(/\n---\n/).map(c => ({ content: c.trim(), type: 'standard' }));
        return { slides, metadata: {} };
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = PPTXExporter;
if (typeof window !== 'undefined') window.PPTXExporter = PPTXExporter;
})();
