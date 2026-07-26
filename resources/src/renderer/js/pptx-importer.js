(() => {
const getFs = () => (typeof window !== 'undefined' && window.MarkDDBridge && window.MarkDDBridge.fs) ? window.MarkDDBridge.fs : (typeof require !== 'undefined' ? require('fs') : null);
const getPath = () => (typeof window !== 'undefined' && window.MarkDDBridge && window.MarkDDBridge.path) ? window.MarkDDBridge.path : (typeof require !== 'undefined' ? require('path') : null);
const getJSZip = () => (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : (typeof require !== 'undefined' ? require('jszip') : null);
const getDOMParser = () => (typeof window !== 'undefined' && window.DOMParser) ? window.DOMParser : (typeof require !== 'undefined' ? (()=>{ try { return require('@xmldom/xmldom').DOMParser; } catch(_) { return null; } })() : null);

class PPTXImporter {
    /**
     * Import a PPTX file and return Markdown string
     * @param {string} filePath - Absolute path to the PPTX file
     * @param {string} option - Import options: 'both', 'content', 'style'
     * @returns {Promise<string>} Markdown text
     */
    static async importFile(filePath, option = 'both') {
        try {
            console.log(`[PPTXImporter] Starting import of: ${filePath} with option: ${option}`);
            const fs = getFs();
            const path = getPath();
            const JSZip = getJSZip();
            
            if (!JSZip) {
                throw new Error('JSZip library is not available. Please check your connection or refresh.');
            }
            if (!fs) {
                throw new Error('File system access is not available.');
            }
            
            const buffer = fs.readFileSync(filePath);
            const zip = await JSZip.loadAsync(buffer);
            
            // 1. Resolve media directory path next to PowerPoint file
            let mediaDirPath = null;
            if (option !== 'style' && path) {
                const pptxDir = path.dirname(filePath);
                const pptxBaseName = path.basename(filePath, path.extname(filePath));
                mediaDirPath = path.join(pptxDir, `${pptxBaseName}_media`);
                if (!fs.existsSync(mediaDirPath)) {
                    fs.mkdirSync(mediaDirPath, { recursive: true });
                }
            }
            
            // 2. Parse theme colors
            const themeColors = await this.parseThemeColors(zip);
            
            // 3. Parse slides (passing zip and media directory for extraction)
            const slidesData = await this.parseSlides(zip, themeColors, option, mediaDirPath);
            
            // 4. Assemble Markdown Presentation
            return this.assembleMarkdown(slidesData, themeColors, option);
        } catch (error) {
            console.error('[PPTXImporter] Error importing PPTX:', error);
            throw error;
        }
    }

    /**
     * Parse theme1.xml to extract background, text, primary and secondary colors
     */
    static async parseThemeColors(zip) {
        const themeColors = {
            background: '#ffffff',
            text: '#000000',
            primary: '#0056b3',
            secondary: '#5a6268'
        };
        
        try {
            const themeFile = zip.file('ppt/theme/theme1.xml');
            if (!themeFile) return themeColors;
            
            const themeXml = await themeFile.async('text');
            const DOMParserClass = getDOMParser();
            if (!DOMParserClass) throw new Error('DOMParser library not available.');
            const parser = new DOMParserClass();
            const doc = parser.parseFromString(themeXml, 'application/xml');
            
            // Helper to get hex from a color node
            const getHexColor = (node) => {
                if (!node) return null;
                const srgb = node.getElementsByTagNameNS('*', 'srgbClr')[0] || node.querySelector('srgbClr');
                if (srgb && srgb.getAttribute('val')) {
                    return '#' + srgb.getAttribute('val').trim();
                }
                const sys = node.getElementsByTagNameNS('*', 'sysClr')[0] || node.querySelector('sysClr');
                if (sys && sys.getAttribute('lastClr')) {
                    return '#' + sys.getAttribute('lastClr').trim();
                }
                return null;
            };
            
            const clrScheme = doc.getElementsByTagNameNS('*', 'clrScheme')[0] || doc.querySelector('clrScheme');
            if (clrScheme) {
                // Map dk1, lt1, accent1, accent2
                const dk1Node = clrScheme.getElementsByTagNameNS('*', 'dk1')[0] || clrScheme.querySelector('dk1');
                const lt1Node = clrScheme.getElementsByTagNameNS('*', 'lt1')[0] || clrScheme.querySelector('lt1');
                const acc1Node = clrScheme.getElementsByTagNameNS('*', 'accent1')[0] || clrScheme.querySelector('accent1');
                const acc2Node = clrScheme.getElementsByTagNameNS('*', 'accent2')[0] || clrScheme.querySelector('accent2');
                
                const dk1 = getHexColor(dk1Node);
                const lt1 = getHexColor(lt1Node);
                const acc1 = getHexColor(acc1Node);
                const acc2 = getHexColor(acc2Node);
                
                if (dk1) themeColors.text = dk1;
                if (lt1) themeColors.background = lt1;
                if (acc1) themeColors.primary = acc1;
                if (acc2) themeColors.secondary = acc2;
            }
        } catch (e) {
            console.warn('[PPTXImporter] Failed to parse theme colors:', e);
        }
        
        return themeColors;
    }

    /**
     * Returns true if the background color is dark
     */
    static isDarkColor(hex) {
        if (!hex || hex.length < 7) return false;
        try {
            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);
            // Relative luminance formula
            return (r * 299 + g * 587 + b * 114) / 1000 < 128;
        } catch (e) {
            return false;
        }
    }

    /**
     * Read presentation.xml and presentation.xml.rels to parse slide order, then read slide xml files
     */
    static async parseSlides(zip, themeColors, option, mediaDirPath) {
        const slides = [];
        
        try {
            let slidePaths = [];
            const presFile = zip.file('ppt/presentation.xml');
            const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
            
            if (presFile && presRelsFile) {
                const presXml = await presFile.async('text');
                const presRelsXml = await presRelsFile.async('text');
                
                const DOMParserClass = getDOMParser();
                if (!DOMParserClass) throw new Error('DOMParser library not available.');
                const parser = new DOMParserClass();
                const presDoc = parser.parseFromString(presXml, 'application/xml');
                const relsDoc = parser.parseFromString(presRelsXml, 'application/xml');
                
                // Map relation ID -> Target file path
                const relMap = {};
                const relElements = Array.from(relsDoc.getElementsByTagName('Relationship'));
                for (const rel of relElements) {
                    const id = rel.getAttribute('Id');
                    const target = rel.getAttribute('Target');
                    relMap[id] = target;
                }
                
                // Parse slide list (sldIdLst) elements in presentation.xml
                const sldIds = Array.from(presDoc.getElementsByTagNameNS('*', 'sldId') || presDoc.getElementsByTagName('p:sldId'));
                for (const sldId of sldIds) {
                    const rId = sldId.getAttribute('r:id') || sldId.getAttribute('rid');
                    if (rId && relMap[rId]) {
                        let target = relMap[rId];
                        if (!target.startsWith('ppt/')) {
                            target = 'ppt/' + target;
                        }
                        slidePaths.push(target);
                    }
                }
            }
            
            // Fallback: If relation mapping failed, load sequential slide*.xml filenames
            if (slidePaths.length === 0) {
                console.log('[PPTXImporter] Slide relation mapping failed, scanning files sequentially.');
                const files = Object.keys(zip.files).filter(name => name.match(/^ppt\/slides\/slide\d+\.xml$/));
                files.sort((a, b) => {
                    const numA = parseInt(a.match(/slide(\d+)\.xml$/)[1]);
                    const numB = parseInt(b.match(/slide(\d+)\.xml$/)[1]);
                    return numA - numB;
                });
                slidePaths = files;
            }
            
            for (let i = 0; i < slidePaths.length; i++) {
                const slidePath = slidePaths[i];
                const slideFile = zip.file(slidePath);
                if (slideFile) {
                    const slideData = await this.parseSingleSlide(zip, slidePath, i + 1, mediaDirPath);
                    slides.push(slideData);
                }
            }
        } catch (e) {
            console.error('[PPTXImporter] Error parsing slides:', e);
        }
        
        return slides;
    }

    /**
     * Parses a single slide XML to extract titles, subtitles, lists, shapes, slide backgrounds, and pictures
     */
    static async parseSingleSlide(zip, slidePath, slideNum, mediaDirPath) {
        const fs = getFs();
        const path = getPath();
        const DOMParserClass = getDOMParser();
        if (!DOMParserClass) throw new Error('DOMParser library not available.');
        const parser = new DOMParserClass();
        let slideXml = '';
        
        try {
            slideXml = await zip.file(slidePath).async('text');
        } catch (e) {
            console.error(`[PPTXImporter] Failed to read slide zip file: ${slidePath}`, e);
            return { slideNum, title: '', subtitle: '', body: [], backgroundStyle: '' };
        }
        
        const doc = parser.parseFromString(slideXml, 'application/xml');
        
        // 1. Load slide relations
        const relsPath = slidePath.replace('slides/', 'slides/_rels/') + '.rels';
        const relsFile = zip.file(relsPath);
        const relMap = {};
        if (relsFile) {
            try {
                const relsXml = await relsFile.async('text');
                const relsDoc = parser.parseFromString(relsXml, 'application/xml');
                const rels = Array.from(relsDoc.getElementsByTagName('Relationship'));
                for (const rel of rels) {
                    relMap[rel.getAttribute('Id')] = rel.getAttribute('Target');
                }
            } catch (e) {
                console.warn(`[PPTXImporter] Failed to parse slide rels for ${slidePath}:`, e);
            }
        }
        
        // 2. Parse Slide Background Picture Fill
        let backgroundStyle = '';
        try {
            const bgNode = doc.getElementsByTagNameNS('*', 'bg')[0] || doc.querySelector('bg');
            if (bgNode) {
                const blip = bgNode.getElementsByTagNameNS('*', 'blip')[0] || bgNode.querySelector('blip');
                if (blip) {
                    const embedId = blip.getAttribute('r:embed') || blip.getAttribute('embed');
                    if (embedId && relMap[embedId]) {
                        const target = relMap[embedId];
                        // Target path resolves relative to ppt/slides/
                        const resolvedPath = path ? path.normalize(path.join('ppt/slides', target)).replace(/\\/g, '/') : ('ppt/slides/' + target);
                        const imgZipFile = zip.file(resolvedPath);
                        if (imgZipFile && mediaDirPath && fs && path) {
                            const imgData = await imgZipFile.async('uint8array');
                            const imgName = `bg_slide${slideNum}_` + path.basename(resolvedPath);
                            const outputImgPath = path.join(mediaDirPath, imgName);
                            fs.writeFileSync(outputImgPath, imgData);
                            const mdPath = `file:///${outputImgPath.replace(/\\/g, '/')}`;
                            backgroundStyle = `background: url('${mdPath}') center/cover no-repeat`;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`[PPTXImporter] Failed to parse background image for slide ${slideNum}:`, e);
        }
        
        // 3. Parse Shapes & Picture Content
        const shapes = Array.from(doc.getElementsByTagNameNS('*', 'sp') || doc.getElementsByTagName('p:sp'));
        const pics = Array.from(doc.getElementsByTagNameNS('*', 'pic') || doc.getElementsByTagName('p:pic'));
        
        let titleText = '';
        let subtitleText = '';
        const bodyBlocks = [];
        
        // Parse text shapes
        for (const shape of shapes) {
            let isTitle = false;
            let isSubTitle = false;
            let isBody = false;
            
            // Check placeholders for type definitions (title, subtitle, body)
            const ph = shape.getElementsByTagNameNS('*', 'ph')[0] || shape.querySelector('ph');
            if (ph) {
                const type = ph.getAttribute('type');
                if (type === 'title' || type === 'ctrTitle') {
                    isTitle = true;
                } else if (type === 'subTitle') {
                    isSubTitle = true;
                } else if (type === 'body' || type === 'obj') {
                    isBody = true;
                }
            }
            
            const txBody = shape.getElementsByTagNameNS('*', 'txBody')[0] || shape.querySelector('txBody');
            if (!txBody) continue;
            
            const paragraphs = Array.from(txBody.getElementsByTagNameNS('*', 'p') || txBody.getElementsByTagName('a:p'));
            const shapeTexts = [];
            
            for (const p of paragraphs) {
                const pPr = p.getElementsByTagNameNS('*', 'pPr')[0] || p.querySelector('pPr');
                let lvl = 0;
                if (pPr && pPr.getAttribute('lvl')) {
                    lvl = parseInt(pPr.getAttribute('lvl')) || 0;
                }
                
                const tNodes = Array.from(p.getElementsByTagNameNS('*', 't') || p.getElementsByTagName('a:t'));
                const pText = tNodes.map(t => t.textContent).join('').trim();
                
                if (pText) {
                    shapeTexts.push({ text: pText, lvl: lvl, isBody: isBody });
                }
            }
            
            if (shapeTexts.length === 0) continue;
            
            if (isTitle) {
                titleText = shapeTexts.map(st => st.text).join(' ').trim();
            } else if (isSubTitle) {
                subtitleText = shapeTexts.map(st => st.text).join('\n').trim();
            } else {
                bodyBlocks.push({ type: 'text', items: shapeTexts });
            }
        }
        
        // Parse slide pictures
        for (const pic of pics) {
            try {
                const blip = pic.getElementsByTagNameNS('*', 'blip')[0] || pic.querySelector('blip');
                if (blip) {
                    const embedId = blip.getAttribute('r:embed') || blip.getAttribute('embed');
                    if (embedId && relMap[embedId]) {
                        const target = relMap[embedId];
                        const resolvedPath = path ? path.normalize(path.join('ppt/slides', target)).replace(/\\/g, '/') : ('ppt/slides/' + target);
                        const imgZipFile = zip.file(resolvedPath);
                        if (imgZipFile && mediaDirPath && fs && path) {
                            const imgData = await imgZipFile.async('uint8array');
                            const imgName = path.basename(resolvedPath);
                            const outputImgPath = path.join(mediaDirPath, imgName);
                            fs.writeFileSync(outputImgPath, imgData);
                            const mdPath = `file:///${outputImgPath.replace(/\\/g, '/')}`;
                            bodyBlocks.push({
                                type: 'image',
                                path: mdPath,
                                alt: imgName
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn(`[PPTXImporter] Failed to parse picture content in slide ${slideNum}:`, e);
            }
        }
        
        return {
            slideNum,
            title: titleText,
            subtitle: subtitleText,
            body: bodyBlocks,
            backgroundStyle
        };
    }

    /**
     * Assembles slide details and styles into Markdown text
     */
    static assembleMarkdown(slidesData, themeColors, option) {
        let md = '';
        
        // 1. Write YAML metadata front-matter
        if (option === 'both' || option === 'style') {
            const isDark = this.isDarkColor(themeColors.background);
            md += `---\n`;
            md += `presentation: true\n`;
            md += `theme: ${isDark ? 'simple-dark' : 'simple-light'}\n`;
            md += `title: Imported Presentation\n`;
            md += `colors:\n`;
            md += `  background: "${themeColors.background}"\n`;
            md += `  text: "${themeColors.text}"\n`;
            md += `  primary: "${themeColors.primary}"\n`;
            md += `  secondary: "${themeColors.secondary}"\n`;
            md += `---\n\n`;
        } else {
            md += `---\n`;
            md += `presentation: true\n`;
            md += `theme: berkeley\n`;
            md += `title: Imported Presentation\n`;
            md += `---\n\n`;
        }
        
        if (option === 'style') {
            // Style-only blank presentation template
            md += `# Welcome to Your Presentation\n\n`;
            md += `- Bullet point 1\n`;
            md += `- Bullet point 2\n\n`;
            md += `---\n\n`;
            md += `## Section Header\n\n`;
            md += `Add your slide content here.\n`;
            return md;
        }
        
        // 2. Iterate and format slides in Markdown
        slidesData.forEach((slide, idx) => {
            if (idx > 0) {
                md += '\n---\n\n';
            }
            
            // Inject slide background image as custom comment directive if available
            if (slide.backgroundStyle) {
                md += `<!-- ${slide.backgroundStyle} -->\n\n`;
            }
            
            if (slide.title) {
                if (idx === 0) {
                    md += `# ${slide.title}\n\n`;
                } else {
                    md += `## ${slide.title}\n\n`;
                }
            } else if (!slide.subtitle && slide.body.length === 0) {
                md += `## Slide ${slide.slideNum}\n\n`;
            }
            
            if (slide.subtitle) {
                md += `### ${slide.subtitle}\n\n`;
            }
            
            slide.body.forEach((block) => {
                if (block.type === 'text') {
                    block.items.forEach((item) => {
                        const prefix = '  '.repeat(item.lvl) + '- ';
                        if (item.isBody || item.lvl > 0) {
                            md += `${prefix}${item.text}\n`;
                        } else {
                            md += `${item.text}\n\n`;
                        }
                    });
                } else if (block.type === 'image') {
                    md += `![${block.alt}](${block.path})\n\n`;
                }
                md += '\n';
            });
            
            md = md.trimEnd() + '\n';
        });
        
        return md;
    }
}

// Make globally available in Electron context
if (typeof module !== 'undefined') {
    module.exports = PPTXImporter;
}
if (typeof window !== 'undefined') {
    window.PPTXImporter = PPTXImporter;
}
})();

