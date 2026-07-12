(() => {
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

class PPTXExporter {
    /**
     * Export markdown content to a PowerPoint file (.pptx)
     * @param {string} markdown - Markdown document content
     * @param {string} outputPath - Output file path
     * @param {string} currentFileDir - Directory of the current open file (for relative image resolution)
     * @returns {Promise<void>}
     */
    static async exportCurrent(markdown, outputPath, currentFileDir = '') {
        try {
            console.log(`[PPTXExporter] Starting export to: ${outputPath}`);
            
            // Use PresentationManager to parse presentation slides
            let presentationManager = null;
            if (typeof window !== 'undefined' && window.markddApp && window.markddApp.presentationManager) {
                presentationManager = window.markddApp.presentationManager;
            } else {
                const PresentationManager = require('./presentation.js');
                presentationManager = new PresentationManager();
            }
            
            const parsed = presentationManager.parseMarkdown(markdown);
            const slidesData = parsed.slides;
            const metadata = parsed.metadata || {};
            
            // Initialize PptxGenJS
            const pptx = new pptxgen();
            pptx.layout = 'LAYOUT_16x9'; // Wide screen format
            
            // Colors resolution
            let bgColor = 'FFFFFF';
            let textColor = '333333';
            let primaryColor = '007ACC';
            let secondaryColor = '5A6268';
            
            if (metadata.colors) {
                if (metadata.colors.background) bgColor = this.cleanHex(metadata.colors.background);
                if (metadata.colors.text) textColor = this.cleanHex(metadata.colors.text);
                if (metadata.colors.primary) primaryColor = this.cleanHex(metadata.colors.primary);
                if (metadata.colors.secondary) secondaryColor = this.cleanHex(metadata.colors.secondary);
            } else if (metadata.theme) {
                // Set default colors based on dark/light themes
                if (metadata.theme.includes('dark') || metadata.theme === 'aurora-forge') {
                    bgColor = '1E1E1E';
                    textColor = 'E0E0E0';
                    primaryColor = 'FF4C4C';
                    secondaryColor = 'A0A0A0';
                }
            }
            
            // Generate slides
            slidesData.forEach((slide, idx) => {
                const pptxSlide = pptx.addSlide();
                pptxSlide.background = { fill: bgColor };
                
                // Add speaker notes if any
                if (slide.notes) {
                    pptxSlide.addNotes(slide.notes);
                }
                
                const slideLines = slide.content.split('\n');
                
                // Parse slide elements
                let slideTitle = '';
                let imagePaths = [];
                const bodyLines = [];
                
                slideLines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
                        slideTitle = trimmed.replace(/^#+\s+/, '');
                    } else if (trimmed.match(/!\[.*?\]\((.*?)\)/)) {
                        // Extract images
                        const match = trimmed.match(/!\[.*?\]\((.*?)\)/);
                        if (match && match[1]) {
                            imagePaths.push(match[1]);
                        }
                    } else if (trimmed.length > 0) {
                        bodyLines.push(line);
                    }
                });
                
                // If title slide format (first slide or large title)
                const isTitleSlide = slide.type === 'title' || (idx === 0 && slideTitle);
                
                if (isTitleSlide) {
                    // Large centered layout
                    pptxSlide.addText(slideTitle || 'Welcome', {
                        x: 0.5,
                        y: 1.5,
                        w: 9.0,
                        h: 1.5,
                        fontSize: 40,
                        fontFace: 'Arial',
                        bold: true,
                        color: primaryColor,
                        align: 'center',
                        valign: 'middle'
                    });
                    
                    // Add subtitle or description below
                    if (bodyLines.length > 0) {
                        const subText = bodyLines.join('\n').trim();
                        pptxSlide.addText(subText, {
                            x: 0.5,
                            y: 3.2,
                            w: 9.0,
                            h: 2.0,
                            fontSize: 20,
                            fontFace: 'Arial',
                            color: textColor,
                            align: 'center',
                            valign: 'top'
                        });
                    }
                } else {
                    // Standard Slide layout
                    
                    // 1. Add Slide Header
                    if (slideTitle) {
                        pptxSlide.addText(slideTitle, {
                            x: 0.5,
                            y: 0.4,
                            w: 9.0,
                            h: 0.8,
                            fontSize: 28,
                            fontFace: 'Arial',
                            bold: true,
                            color: primaryColor,
                            valign: 'middle'
                        });
                    }
                    
                    // Determine image presence for layout splitting
                    const hasImage = imagePaths.length > 0;
                    const textWidth = hasImage ? 4.8 : 9.0;
                    const textHeight = slideTitle ? 4.5 : 5.2;
                    const textY = slideTitle ? 1.4 : 0.6;
                    
                    // 2. Add Text Block
                    if (bodyLines.length > 0) {
                        const textRuns = [];
                        bodyLines.forEach(line => {
                            const trimmedLine = line.trim();
                            const isBullet = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('+ ');
                            
                            if (isBullet) {
                                const cleanText = trimmedLine.replace(/^\s*[-*+]\s+/, '');
                                const indentSpaceCount = line.match(/^\s*/)[0].length;
                                const level = Math.floor(indentSpaceCount / 2);
                                textRuns.push({
                                    text: cleanText,
                                    options: { bullet: true, indent: level, fontFace: 'Arial', color: textColor }
                                });
                            } else {
                                textRuns.push({
                                    text: trimmedLine,
                                    options: { fontFace: 'Arial', color: textColor, breakLine: true }
                                });
                            }
                        });
                        
                        pptxSlide.addText(textRuns, {
                            x: 0.5,
                            y: textY,
                            w: textWidth,
                            h: textHeight,
                            fontSize: 16,
                            valign: 'top'
                        });
                    }
                    
                    // 3. Add Image Block on the right side if present
                    if (hasImage) {
                        const imgPath = imagePaths[0];
                        const resolvedImage = this.resolveImagePath(imgPath, currentFileDir);
                        
                        if (resolvedImage) {
                            if (resolvedImage.startsWith('data:')) {
                                pptxSlide.addImage({
                                    data: resolvedImage,
                                    x: 5.5,
                                    y: 1.4,
                                    w: 4.0,
                                    h: 3.8
                                });
                            } else {
                                pptxSlide.addImage({
                                    path: resolvedImage,
                                    x: 5.5,
                                    y: 1.4,
                                    w: 4.0,
                                    h: 3.8
                                });
                            }
                        }
                    }
                }
            });
            
            // Save the PPTX document
            const buffer = await pptx.write('nodebuffer');
            fs.writeFileSync(outputPath, buffer);
            console.log('[PPTXExporter] Successfully saved PPTX presentation.');
        } catch (error) {
            console.error('[PPTXExporter] Error exporting PPTX:', error);
            throw error;
        }
    }

    /**
     * Helper to resolve local image files to base64 format or output absolute path
     */
    static resolveImagePath(imagePath, currentFileDir) {
        if (!imagePath) return null;
        
        // Remote URLs can be passed directly
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
            return imagePath;
        }
        
        try {
            let absolutePath = imagePath;
            if (imagePath.startsWith('file:///')) {
                absolutePath = imagePath.replace('file:///', '').replace(/\//g, '\\');
            } else if (!path.isAbsolute(imagePath)) {
                absolutePath = path.resolve(currentFileDir || '', imagePath);
            }
            
            if (fs.existsSync(absolutePath)) {
                const buffer = fs.readFileSync(absolutePath);
                const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
                const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
                return `data:${mimeType};base64,${buffer.toString('base64')}`;
            }
        } catch (e) {
            console.warn(`[PPTXExporter] Failed to load image: ${imagePath}`, e);
        }
        
        return null;
    }

    /**
     * Cleans color codes by removing '#'
     */
    static cleanHex(hexColor) {
        if (!hexColor) return '';
        return hexColor.replace('#', '').trim();
    }
}

// Make globally available in Electron context
if (typeof module !== 'undefined') {
    module.exports = PPTXExporter;
}
if (typeof window !== 'undefined') {
    window.PPTXExporter = PPTXExporter;
}
})();
