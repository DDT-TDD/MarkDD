/**
 * MarkDD Presentation Module
 * Converts markdown to presentation slides with Beamer-style themes
 * Inspired by Marp and reveal.js
 */

class PresentationManager {
    constructor() {
        this.currentPresentation = null;
        this.currentTheme = 'berkeley'; // Default theme
        // Expanded theme list with 20+ professional Beamer-style themes
        this.availableThemes = [
            // Classic Beamer themes
            'berkeley', 'berlin', 'copenhagen', 'darmstadt', 'warsaw',
            'madrid', 'annarbor', 'cambridgeus', 'pittsburgh', 'rochester',
            'boadilla', 'antibes', 'juanlespins', 'montpellier', 'malmoe',
            'singapore', 'szeged', 'hannover', 'marburg', 'goettingen',
            // Color variants
            'berkeley-dark', 'berlin-light', 'copenhagen-blue', 'madrid-green',
            'simple-light', 'simple-dark', 'minimal-gray', 'corporate-blue',
            'aurora-forge', 'ddt-signature', 'strata-pulse'
        ];
        this.customThemes = {};
        this.customThemeStorageKey = 'markdd-custom-themes';
        this.themeDisplayNames = {
            'aurora-forge': 'Aurora Black / Red',
            'ddt-signature': 'DDT Signature',
            'strata-pulse': 'Strata Pulse'
        };
        this.loadCustomThemes();
        this.slides = [];
        this.metadata = {};
    }

    /**
     * Parse markdown content into presentation slides
     * Uses --- as slide separator and YAML front-matter for config
     */
    parseMarkdown(markdown) {
        const slides = [];
        const parts = markdown.split(/^---$/gm);
        
        // Extract front-matter (first part if it starts with ---)
        let frontMatter = {};
        let slideContent = parts;
        
        if (markdown.trim().startsWith('---')) {
            const frontMatterText = parts[1];
            frontMatter = this.parseFrontMatter(frontMatterText);
            slideContent = parts.slice(2);
        } else {
            slideContent = parts;
        }
        
        // Parse each slide
        for (const slideText of slideContent) {
            if (slideText.trim()) {
                const slide = this.parseSlide(slideText);
                slides.push(slide);
            }
            
            if (typeof applyNavigationLayoutClasses === 'function') {
                applyNavigationLayoutClasses();
            }
        }
        
        this.slides = slides;
        this.metadata = frontMatter;
        if (frontMatter.theme && this.isKnownTheme(frontMatter.theme)) {
            this.currentTheme = frontMatter.theme;
        } else if (frontMatter.theme && !this.isKnownTheme(frontMatter.theme)) {
            console.warn('[Presentation] Unknown theme in front-matter, reverting to current theme:', frontMatter.theme);
        }
        
        return {
            slides: slides,
            metadata: frontMatter,
            theme: this.currentTheme
        };
    }

    /**
     * Parse YAML front-matter
     * Extracts metadata including theme, navigation, colors, title, etc.
     */
    parseFrontMatter(text) {
        const metadata = {};
        const lines = text.split('\n');
        let inColorsBlock = false;
        const colors = {};
        
        for (const line of lines) {
            // Check for colors block
            if (line.trim() === 'colors:') {
                inColorsBlock = true;
                continue;
            }
            
            // Parse color properties (indented lines under colors:)
            if (inColorsBlock) {
                const colorMatch = line.match(/^\s{2,}(\w+):\s*["']?([#\w]+)["']?$/);
                if (colorMatch) {
                    const [, colorKey, colorValue] = colorMatch;
                    colors[colorKey] = colorValue.trim();
                    continue;
                } else if (line.match(/^\w+:/)) {
                    // New top-level property, exit colors block
                    inColorsBlock = false;
                }
            }
            
            // Parse regular metadata
            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
                const [, key, value] = match;
                if (key !== 'colors') {
                    metadata[key] = value.trim();
                }
            }
        }
        
        // Store colors if found
        if (Object.keys(colors).length > 0) {
            metadata.colors = colors;
        }
        
        // DON'T parse navigation field - keep as string to support left/top/none values
        // The generateHTML method will handle string parsing
        
        return metadata;
    }

    /**
     * Parse individual slide content
     */
    parseSlide(text) {
        const trimmed = text.trim();
        const lines = trimmed.split('\n');
        
        // Extract slide notes (lines starting with <!--)
        const contentLines = [];
        const noteLines = [];
        let inNoteBlock = false;
        
        for (const line of lines) {
            if (line.trim().startsWith('<!--')) {
                inNoteBlock = true;
            }
            
            if (inNoteBlock) {
                noteLines.push(line);
                if (line.trim().includes('-->')) {
                    inNoteBlock = false;
                }
            } else {
                contentLines.push(line);
            }
        }
        
        const content = contentLines.join('\n');
        const notes = noteLines.join('\n').replace(/<!--|-->/g, '').trim();
        
        // Detect slide type based on first line
        let type = 'content';
        if (content.trim().startsWith('# ')) {
            type = 'title';
        } else if (content.trim().startsWith('## ')) {
            type = 'section';
        }
        
        return {
            content: content,
            notes: notes,
            type: type
        };
    }

    /**
     * Generate navigation HTML based on theme and slides
     * @param {string} theme - The theme name
     * @param {Array} slides - Array of slide objects
     * @param {Object} themeConfig - Theme configuration object
     * @returns {string} Navigation HTML or empty string
     */
    generateNavigation(theme, slides, themeConfig) {
        // Check if theme supports navigation
        const navigationType = themeConfig.navigation;
        
        if (!navigationType || navigationType === 'none') {
            return ''; // No navigation for this theme
        }
        
        // Extract slide sections (slides with h1 or h2 headings)
        const sections = [];
        slides.forEach((slide, index) => {
            // Extract title from slide content
            let title = `Slide ${index + 1}`;
            
            // Try to extract heading from content
            const h1Match = slide.content.match(/^#\s+(.+)$/m);
            const h2Match = slide.content.match(/^##\s+(.+)$/m);
            
            if (h1Match) {
                title = h1Match[1].trim();
                sections.push({ index, title, level: 1 });
            } else if (h2Match) {
                title = h2Match[1].trim();
                sections.push({ index, title, level: 2 });
            } else if (slide.type === 'title' || slide.type === 'section') {
                // Include title and section slides even without headings
                sections.push({ index, title, level: slide.type === 'title' ? 1 : 2 });
            }
        });
        
        // If no sections found, create basic navigation from all slides
        if (sections.length === 0) {
            slides.forEach((slide, index) => {
                sections.push({ index, title: `Slide ${index + 1}`, level: 1 });
            });
        }
        
        // Generate navigation HTML based on type
        if (navigationType === 'left') {
            return this.generateLeftNavigation(sections);
        } else if (navigationType === 'top') {
            return this.generateTopNavigation(sections);
        }
        
        return '';
    }

    /**
     * Generate left sidebar navigation HTML
     * @param {Array} sections - Array of section objects
     * @returns {string} Left navigation HTML
     */
    generateLeftNavigation(sections) {
        const navItems = sections.map((section, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            const indent = section.level === 2 ? 'style="padding-left: 20px;"' : '';
            return `        <li class="nav-item ${activeClass}" data-slide="${section.index}" ${indent}>${this.escapeHTML(section.title)}</li>`;
        }).join('\n');
        
        return `    <nav class="presentation-nav presentation-nav-left">
        <ul>
${navItems}
        </ul>
    </nav>`;
    }

    /**
     * Generate top bar navigation HTML
     * @param {Array} sections - Array of section objects
     * @returns {string} Top navigation HTML
     */
    generateTopNavigation(sections) {
        // For top navigation, only show level 1 sections to avoid crowding
        const topSections = sections.filter(s => s.level === 1);
        
        const navItems = topSections.map((section, idx) => {
            const activeClass = idx === 0 ? 'active' : '';
            return `        <li class="nav-item ${activeClass}" data-slide="${section.index}">${this.escapeHTML(section.title)}</li>`;
        }).join('\n');
        
        return `    <nav class="presentation-nav presentation-nav-top">
        <ul>
${navItems}
        </ul>
    </nav>`;
    }

    /**
     * Convert slides to HTML presentation
     */
    async generateHTML(options = {}) {
    const theme = options.theme || this.currentTheme;
    const title = this.metadata.title || 'Presentation';
    const author = this.metadata.author || '';
    const date = this.metadata.date || new Date().toISOString().split('T')[0];
        
        // Get theme CSS and configuration
    const themeCSS = await this.getThemeCSS(theme);
    const themeConfig = this.getThemeConfig(theme) || {};
    const headerBackground = themeConfig.headerBg || 'rgba(0,0,0,0.05)';
    const headerTextColor = themeConfig.headerText || '#333';
    const footerBackground = themeConfig.footerBg || 'rgba(0,0,0,0.05)';
    const footerTextColor = themeConfig.footerText || '#666';
    const accentColor = themeConfig.primary || '#ccc';
    const headerAlign = this.metadata.headerAlign || 'left';
    const footerAlign = this.metadata.footerAlign || 'center';
        
        // Prepare slides array - may include TOC slide
        let slidesToRender = [...this.slides];
        
        // Check if TOC is enabled in front-matter
        if (this.metadata.toc) {
            const tocValue = String(this.metadata.toc).toLowerCase();
            if (tocValue === 'true' || tocValue === 'yes' || tocValue === '1') {
                // Generate TOC slide from section titles
                const tocSlide = this.generateTOCSlide();
                // Insert TOC as second slide (after title slide)
                slidesToRender.splice(1, 0, tocSlide);
            }
        }
        
        // Generate slides HTML
        const slidesHTML = slidesToRender.map((slide, index) => {
            return this.generateSlideHTML(slide, index, theme);
        }).join('\n');
        
        // Generate navigation HTML if enabled in metadata
        // Support both boolean true and string "true" from YAML
        // Also support navigation type override: 'left', 'top', 'none'
        let navigationHTML = '';
        let navigationTypeToUse = 'none';
        
        // Check if navigation is specified in front-matter
        if (this.metadata.navigation) {
            const navValue = String(this.metadata.navigation).toLowerCase();
            
            // If user specified a type (left/top), use that
            if (navValue === 'left' || navValue === 'top') {
                navigationTypeToUse = navValue;
            }
            // If user said true/yes/1, use theme's default navigation
            else if (navValue === 'true' || navValue === 'yes' || navValue === '1') {
                navigationTypeToUse = (themeConfig && themeConfig.navigation) || 'none';
            }
            // If user said false/no/none, disable navigation
            else if (navValue === 'false' || navValue === 'no' || navValue === 'none' || navValue === '0') {
                navigationTypeToUse = 'none';
            }
        }
        
        // Generate navigation HTML if type is not 'none'
        if (navigationTypeToUse !== 'none') {
            navigationHTML = this.generateNavigation(theme, slidesToRender, { navigation: navigationTypeToUse });
        }
        
        // Get navigation JavaScript
        const navJS = this.getNavigationJS();

        // Create complete HTML with all required libraries
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHTML(title)}</title>
    
    <!-- MathJax v4 for mathematical expressions -->
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                packages: {'[+]': ['mhchem']}
            },
            options: {
                ignoreHtmlClass: 'tex2jax_ignore',
                processHtmlClass: 'tex2jax_process',
                renderActions: { addMenu: [] }
            },
            chtml: {
                scale: 1,
                minScale: 0.5,
                matchFontHeight: false,
                displayAlign: 'center',
                displayIndent: '0em'
            },
            svg: {
                fontCache: 'none',
                scale: 1,
                minScale: 0.5,
                displayAlign: 'center',
                displayIndent: '0em'
            },
            loader: {
                load: ['[tex]/mhchem']
            },
            startup: {
                pageReady: () => {
                    // Decode HTML entities in math nodes before MathJax processes them
                    document.querySelectorAll('[data-engine="mathjax"][data-tex]').forEach(node => {
                        const texAttr = node.getAttribute('data-tex');
                        if (texAttr && texAttr.includes('&')) {
                            const textarea = document.createElement('textarea');
                            textarea.innerHTML = texAttr;
                            const decoded = textarea.value;
                            node.setAttribute('data-tex', decoded);
                            
                            // Update text content with decoded LaTeX
                            const isDisplay = node.classList.contains('math-display');
                            if (isDisplay) {
                                node.textContent = '$$' + decoded + '$$';
                            } else {
                                node.textContent = '$' + decoded + '$';
                            }
                        }
                    });
                    
                    return MathJax.startup.defaultPageReady().then(() => {
                        console.log('[MathJax] Initial typesetting complete');
                    });
                }
            }
        };
    </script>
    <script id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@4/es5/tex-chtml.js"></script>
    
    <!-- KaTeX styles for pre-rendered math -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/mhchem.min.js"></script>

    <!-- Marked.js for markdown rendering (including tables) -->
    <script src="https://cdn.jsdelivr.net/npm/marked@16/marked.min.js"></script>
    
    <!-- Mermaid for diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <script>
        // Wait for Mermaid to load before initializing
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ 
                startOnLoad: false, // We'll manually trigger rendering
                theme: 'default',
                securityLevel: 'loose'
            });
        }
    </script>
    
    <!-- Highlight.js for code syntax highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    
    <!-- PlantUML for UML diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/plantuml-encoder@1.4.0/dist/plantuml-encoder.min.js"></script>
    
    <!-- Vega and Vega-Lite for data visualizations -->
    <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
    
    <!-- D3.js for markmap and visualizations -->
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    
    <!-- Viz.js for GraphViz diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js"></script>
    
    <!-- TikZJax for LaTeX diagrams -->
    <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
    <script src="https://tikzjax.com/v1/tikzjax.js"></script>
    
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
            background: #000;
            --presentation-left-offset: 0px;
            --presentation-top-offset: 0px;
            --presentation-header-height: 0px;
            --presentation-footer-height: 0px;
        }
        
        #presentation-container {
            width: calc(100vw - var(--presentation-left-offset));
            height: calc(100vh - (var(--presentation-top-offset) + var(--presentation-header-height) + var(--presentation-footer-height)));
            margin-left: var(--presentation-left-offset);
            margin-top: calc(var(--presentation-top-offset) + var(--presentation-header-height));
            position: relative;
            overflow: hidden;
        }
        
        .slide {
            display: flex;
            flex-direction: column;
            justify-content: center;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            padding: 60px;
            overflow: auto;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 200ms ease-in-out;
        }
        
        .slide.active {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }
        
        .slide h1 {
            font-size: 3em;
            margin-bottom: 0.5em;
        }
        
        .slide h2 {
            font-size: 2.5em;
            margin-bottom: 0.5em;
        }
        
        .slide h3 {
            font-size: 2em;
            margin-bottom: 0.5em;
        }
        
        .slide p {
            font-size: 1.5em;
            margin-bottom: 0.5em;
            line-height: 1.6;
        }
        
        .slide ul, .slide ol {
            font-size: 1.5em;
            margin-left: 1.5em;
            margin-bottom: 0.5em;
        }
        
        .slide li {
            margin-bottom: 0.3em;
            line-height: 1.4;
        }
        
        .slide code {
            background: rgba(0,0,0,0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
        
        .slide pre {
            background: rgba(0,0,0,0.1);
            padding: 1em;
            border-radius: 5px;
            overflow: auto;
            margin: 1em 0;
        }
        
        .slide pre code {
            background: none;
            padding: 0;
        }
        
        /* Math display styling */
        .slide .math-display,
        .slide .math-inline {
            color: inherit;
        }
        
        .slide mjx-container,
        .slide mjx-container svg {
            color: inherit !important;
            display: inline-block;
        }
        
        .slide mjx-container[display="true"] {
            display: block;
            margin: 0.5em 0;
            text-align: center;
        }
        
        /* Fix MathJax chemistry stroke-width issue */
        .slide mjx-container svg g[stroke-width="0"] {
            stroke-width: 1 !important;
        }
        
        .slide mjx-container svg {
            max-width: 100%;
            height: auto;
        }
        
        /* Center diagrams, tables, and visualizations */
        .slide table,
        .slide img,
        .slide figure,
        .slide .mermaid,
        .slide .mermaid-container,
        .slide .plantuml-container,
        .slide .tikz-container,
        .slide .vega-lite-container,
        .slide .vega-container,
        .slide .markmap-container,
        .slide .graphviz-container,
        .slide .kityminder-container {
            margin-left: auto;
            margin-right: auto;
            display: block;
        }

        .slide img {
            max-width: 90%;
            height: auto;
        }

        .slide figure {
            text-align: center;
            margin: 1.5em auto;
        }

        .slide figcaption {
            margin-top: 0.5em;
            font-size: 0.9em;
            font-style: italic;
            opacity: 0.8;
        }

        .slide .mermaid,
        .slide .mermaid-container,
        .slide .tikz-container {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }

        .slide .mermaid svg,
        .slide .tikz-container svg,
        .slide .tikz-container canvas,
        .slide .tikz-container img {
            margin: 0 auto;
            display: block;
        }
        
        .slide table {
            border-collapse: collapse;
            margin: 1em auto !important;
            max-width: 90%;
            display: table;
        }
        
        .slide table th,
        .slide table td {
            border: 1px solid rgba(0,0,0,0.2);
            padding: 0.5em 1em;
            text-align: left;
        }
        
        .slide table th {
            background: rgba(0,0,0,0.05);
            font-weight: bold;
        }
        
        .slide table caption,
        .slide caption {
            text-align: center;
            caption-side: bottom;
            padding: 0.5em;
            font-style: italic;
            font-size: 0.9em;
        }
        
        /* Progress bar */
        #progress-bar {
            position: fixed;
            bottom: var(--presentation-footer-height);
            left: var(--presentation-left-offset);
            height: 5px;
            background: rgba(255,255,255,0.3);
            transition: width 0.3s;
            z-index: 1000;
        }
        
        /* Slide counter */
        #slide-counter {
            position: fixed;
            bottom: calc(20px + var(--presentation-footer-height));
            right: 20px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 1000;
        }
        
        /* PDF Print Styles */
        @media print {
            body {
                background: white;
                overflow: visible;
            }
            
            #presentation-container {
                overflow: visible;
                width: 100% !important;
                height: auto;
                margin: 0 !important;
            }
            
            .slide {
                display: block !important;
                position: relative !important;
                page-break-after: always;
                page-break-inside: avoid;
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                margin: 0 !important;
                padding: 80px 60px 80px 60px !important;
                overflow: visible !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                box-sizing: border-box !important;
            }
            
            .slide:last-child {
                page-break-after: avoid;
            }
            
            ${this.metadata.header ? `/* Ensure header is visible in print */
            .presentation-header {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 50px !important;
                display: flex !important;
                align-items: center !important;
                padding: 0 40px !important;
                z-index: 1000 !important;
                background: ${headerBackground} !important;
                color: ${headerTextColor} !important;
                border-bottom: 2px solid ${accentColor} !important;
                font-size: 18px !important;
                font-weight: bold !important;
            }
            ` : ''}
            ${this.metadata.footer ? `/* Ensure footer is visible in print */
            .presentation-footer {
                position: fixed !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                height: 50px !important;
                display: flex !important;
                align-items: center !important;
                padding: 0 40px !important;
                z-index: 1000 !important;
                background: ${footerBackground} !important;
                color: ${footerTextColor} !important;
                border-top: 2px solid ${accentColor} !important;
                font-size: 18px !important;
                font-weight: bold !important;
            }
            ` : ''}
            /* Hide navigation and UI elements */
            #progress-bar,
            #slide-counter,
            .presentation-nav,
            .presentation-nav-left,
            .presentation-nav-top {
                display: none !important;
            }
            
            /* Ensure math and diagrams are visible */
            .mermaid,
            .mermaid svg,
            mjx-container,
            mjx-container svg,
            .MathJax,
            .MathJax_SVG,
            .MathJax_Display {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                page-break-inside: avoid;
            }
            
            /* Code blocks print properly */
            pre, code {
                page-break-inside: avoid;
                white-space: pre-wrap;
                word-wrap: break-word;
            }
        }
        
        /* Theme-specific styles */
        ${themeCSS}
        
        /* Dedicated print/export layout helper */
        body.print-layout {
            overflow: visible !important;
            background: #fff;
        }

        body.print-layout #presentation-container {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            overflow: visible !important;
        }

        body.print-layout .slide {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            width: 100% !important;
            height: auto !important; /* Let content determine height */
            min-height: 100vh !important; /* Match viewport height for slide ratio */
            margin: 0 !important;
            padding: 60px 60px 60px 60px !important; /* Consistent with main */
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            page-break-after: always;
            page-break-inside: avoid !important;
            overflow: visible !important; /* Don't cut content */
            box-sizing: border-box !important;
        }

        body.print-layout.pdf-export .slide {
            position: relative !important;
            display: block !important;
            width: min(100%, 960px) !important;
            max-width: 960px !important;
            height: auto !important;
            min-height: auto !important;
            margin: 0 auto !important;
            padding: 100px 70px 100px 70px !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            page-break-after: always;
            page-break-inside: avoid !important;
            transform: none !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        body.print-layout.pdf-export .slide > * {
            max-width: 100% !important;
        }

        body.print-layout.pdf-export #presentation-container {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 40px !important;
        }

        ${this.metadata.header ? `body.print-layout.pdf-export .slide {
            padding-top: 150px !important;
        }
        ` : ''}

        ${this.metadata.footer ? `body.print-layout.pdf-export .slide {
            padding-bottom: 150px !important;
        }
        ` : ''}

        body.print-layout .slide.print-scaled {
            transform-origin: top center !important;
        }

        body.print-layout .slide:last-of-type {
            page-break-after: auto;
        }

        body.print-layout .slide.print-scaled {
            margin-left: auto !important;
            margin-right: auto !important;
            width: 100% !important;
        }

        /* Ensure diagrams and content don't overflow in print */
        body.print-layout:not(.pdf-export) .slide .mermaid,
        body.print-layout:not(.pdf-export) .slide .mermaid svg,
        body.print-layout:not(.pdf-export) .slide .vega-diagram,
        body.print-layout:not(.pdf-export) .slide .plantuml-diagram,
        body.print-layout:not(.pdf-export) .slide .tikz-container {
            max-width: 90% !important;
            max-height: none !important; /* Remove height restriction */
            page-break-inside: avoid !important;
            overflow: visible !important; /* Don't cut content */
            margin: 20px auto !important;
            transform: scale(1.5) !important;
            transform-origin: center center !important;
        }

        /* Ensure math content renders properly in print */
        body.print-layout:not(.pdf-export) .slide .math-display,
        body.print-layout:not(.pdf-export) .slide mjx-container[display="true"] {
            page-break-inside: avoid !important;
            margin: 25px 0 !important;
            max-width: 100% !important;
            transform: scale(1.3) !important;
            transform-origin: left center !important;
        }

        /* Content scaling for better fit */
        body.print-layout:not(.pdf-export) .slide h1 {
            font-size: 3.5em !important;
            margin: 0 0 30px 0 !important;
            line-height: 1.2 !important;
            font-weight: bold !important;
        }
        
        body.print-layout:not(.pdf-export) .slide h2 {
            font-size: 3em !important;
            margin: 0 0 25px 0 !important;
            line-height: 1.3 !important;
            font-weight: bold !important;
        }
        
        body.print-layout:not(.pdf-export) .slide h3 {
            font-size: 2.5em !important;
            margin: 0 0 20px 0 !important;
            line-height: 1.3 !important;
            font-weight: bold !important;
        }

        body.print-layout:not(.pdf-export) .slide p,
        body.print-layout:not(.pdf-export) .slide li {
            font-size: 2em !important;
            line-height: 1.6 !important;
            margin: 0 0 15px 0 !important;
        }
        
        body.print-layout:not(.pdf-export) .slide ul,
        body.print-layout:not(.pdf-export) .slide ol {
            margin: 15px 0 20px 40px !important;
        }
        
        body.print-layout:not(.pdf-export) .slide code {
            font-size: 1.8em !important;
            padding: 3px 8px !important;
        }
        
        body.print-layout:not(.pdf-export) .slide pre {
            font-size: 1.6em !important;
            margin: 20px 0 !important;
            padding: 20px !important;
            line-height: 1.5 !important;
        }
        
        body.print-layout:not(.pdf-export) .slide table {
            font-size: 1.8em !important;
            margin: 20px 0 !important;
        }
        
        body.print-layout:not(.pdf-export) .slide table th,
        body.print-layout:not(.pdf-export) .slide table td {
            padding: 10px 15px !important;
        }
        
        body.print-layout:not(.pdf-export) .slide blockquote {
            font-size: 1.9em !important;
            margin: 20px 0 !important;
            padding: 15px 20px !important;
        }
        
        /* Scale math expressions */
        body.print-layout:not(.pdf-export) .slide .math-inline {
            font-size: 2em !important;
        }
        
        body.print-layout:not(.pdf-export) .slide .math-display {
            font-size: 2.2em !important;
            margin: 25px 0 !important;
        }
        
        /* Scale code highlighting */
        body.print-layout:not(.pdf-export) .slide .hljs {
            font-size: 1.6em !important;
            line-height: 1.6 !important;
        }

        /* Prevent headers from overlapping content in print */
        @media print {
            ${this.metadata.header ? `.presentation-header {
                position: fixed !important;
                z-index: 9999 !important;
                top: 0 !important;
                height: 50px !important;
                display: flex !important;
                align-items: center !important;
                font-size: 18px !important;
                font-weight: bold !important;
            }
            ` : ''}${this.metadata.footer ? `.presentation-footer {
                position: fixed !important;
                z-index: 9999 !important;
                bottom: 0 !important;
                height: 50px !important;
                display: flex !important;
                align-items: center !important;
                font-size: 18px !important;
                font-weight: bold !important;
            }
            ` : ''}
            body.print-layout .slide {
                margin: 0 !important;
                padding: 60px !important;
                min-height: 100vh !important;
            }
            
            /* Ensure each slide fits on one page */
            @page {
                size: A4 landscape;
                margin: 0;
            }
        }

        body.print-layout #progress-bar,
        body.print-layout #slide-counter,
        body.print-layout .presentation-nav,
        body.print-layout .presentation-nav-left,
        body.print-layout .presentation-nav-top {
            display: none !important;
        }

        /* Header and Footer styles - theme-aware */
        .presentation-header {
            position: fixed;
            top: var(--presentation-top-offset);
            left: var(--presentation-left-offset);
            right: 0;
            width: calc(100vw - var(--presentation-left-offset));
            padding: 10px 20px;
            background: ${headerBackground};
            color: ${headerTextColor};
            font-size: 0.9em;
            font-weight: 500;
            text-align: ${headerAlign};
            z-index: 1100;
            border-bottom: 2px solid ${accentColor};
        }
        .presentation-footer {
            position: fixed;
            bottom: 0;
            left: var(--presentation-left-offset);
            right: 0;
            width: calc(100vw - var(--presentation-left-offset));
            padding: 10px 20px;
            background: ${footerBackground};
            color: ${footerTextColor};
            font-size: 0.9em;
            text-align: ${footerAlign};
            z-index: 1100;
            border-top: 2px solid ${accentColor};
        }
        
        /* Page numbers visibility */
        ${this.metadata.pageNumbers === false || String(this.metadata.pageNumbers).toLowerCase() === 'false' ? '#slide-counter { display: none; }' : ''}
        
        /* Slide transitions */
        ${this.getTransitionCSS()}
    </style>
</head>
<body>
    ${this.generateHeaderFooterHTML()}
    ${navigationHTML}
    <div id="presentation-container">
        ${slidesHTML}
    </div>
    <div id="progress-bar"></div>
    <div id="slide-counter"><span id="current-slide">1</span> / <span id="total-slides">${slidesToRender.length}</span></div>
    
    <script>
        ${navJS}
        
        // Transition handling
        ${this.getTransitionJS()}
        
        // Initialize rendering libraries - wrap in function and call immediately OR on DOMContentLoaded
        function initializeRendering() {
            const renderingPromises = [];

            const waitForMathJaxReady = (timeoutMs = 12000) => new Promise((resolve) => {
                const start = Date.now();
                const checkReady = () => {
                    if (typeof MathJax !== 'undefined' && MathJax) {
                        if ((MathJax.startup && MathJax.startup.promise) || typeof MathJax.typesetPromise === 'function' || typeof MathJax.typeset === 'function') {
                            resolve(true);
                            return;
                        }
                    }
                    if (Date.now() - start > timeoutMs) {
                        resolve(false);
                        return;
                    }
                    setTimeout(checkReady, 50);
                };
                checkReady();
            });
            // Helper to decode HTML entities from attributes
            const decodeHTMLEntities = (text) => {
                if (!text || typeof text !== 'string') return text;
                const textarea = document.createElement('textarea');
                textarea.innerHTML = text;
                return textarea.value;
            };

            const renderMathWithMathJax = () => {
                if (typeof MathJax === 'undefined' || !MathJax) {
                    return Promise.resolve(false);
                }

                const mathNodes = Array.from(document.querySelectorAll('[data-engine="mathjax"]'));
                if (mathNodes.length === 0) {
                    return Promise.resolve(true);
                }

                const startupPromise = (MathJax.startup && MathJax.startup.promise && typeof MathJax.startup.promise.then === 'function')
                    ? MathJax.startup.promise
                    : Promise.resolve();

                return startupPromise.then(() => {
                    // Decode HTML entities in data-tex attributes and update node content
                    mathNodes.forEach((node) => {
                        const texAttr = node.getAttribute('data-tex');
                        if (texAttr && texAttr.includes('&')) {
                            const decoded = decodeHTMLEntities(texAttr);
                            node.setAttribute('data-tex', decoded);
                        }
                        
                        // Get the final tex content (either decoded or original)
                        const finalTex = node.getAttribute('data-tex');
                        const isDisplay = node.classList.contains('math-display');
                        
                        // Update text content for MathJax to process
                        if (isDisplay) {
                            node.textContent = '\\[' + finalTex + '\\]';
                        } else {
                            node.textContent = '\\(' + finalTex + '\\)';
                        }
                        
                        // Remove tex2jax_process class and add the process class
                        node.classList.remove('tex2jax_process');
                        node.classList.add('tex2jax_process');
                    });

                    // Use typesetPromise which properly handles all loaded packages including mhchem
                    if (typeof MathJax.typesetPromise === 'function') {
                        return MathJax.typesetPromise(mathNodes).then(() => {
                            mathNodes.forEach(node => {
                                node.setAttribute('data-mathjax-complete', 'true');
                            });
                            return true;
                        }).catch((err) => {
                            console.warn('[MathJax] typesetPromise error:', err && err.message ? err.message : err);
                            mathNodes.forEach(node => {
                                node.setAttribute('data-mathjax-complete', 'false');
                            });
                            return false;
                        });
                    }

                    // Fallback to synchronous typeset
                    if (typeof MathJax.typeset === 'function') {
                        try {
                            MathJax.typeset(mathNodes);
                            mathNodes.forEach(node => {
                                node.classList.remove('tex2jax_process');
                                node.setAttribute('data-mathjax-complete', 'true');
                            });
                            return Promise.resolve(true);
                        } catch (err) {
                            console.warn('[MathJax] typeset error:', err && err.message ? err.message : err);
                            mathNodes.forEach(node => {
                                node.setAttribute('data-mathjax-complete', 'false');
                            });
                            return Promise.resolve(false);
                        }
                    }

                    return Promise.resolve(false);
                }).then((success) => {
                    if (success && MathJax.startup && MathJax.startup.document && typeof MathJax.startup.document.updateDocument === 'function') {
                        MathJax.startup.document.updateDocument();
                    }
                    return success;
                });
            };
            // Render Mermaid diagrams - now using proper .mermaid divs
            if (typeof mermaid !== 'undefined') {
                const mermaidDiagrams = Array.from(document.querySelectorAll('.mermaid'));
                if (mermaidDiagrams.length > 0) {
                    try {
                        if (typeof mermaid.run === 'function') {
                            mermaid.run({ nodes: mermaidDiagrams });
                        } else if (typeof mermaid.init === 'function') {
                            mermaid.init(undefined, mermaidDiagrams);
                        }
                    } catch (err) {
                        console.error('Mermaid rendering error:', err);
                    }
                }
            }
            
            // Render PlantUML diagrams
            const plantumlContainers = document.querySelectorAll('.plantuml-container');
            plantumlContainers.forEach(container => {
                const code = decodeURIComponent(container.getAttribute('data-plantuml-code') || '');
                const id = container.getAttribute('data-plantuml-id');
                if (code && typeof plantumlEncoder !== 'undefined') {
                    try {
                        const encoded = plantumlEncoder.encode(code);
                        const img = document.createElement('img');
                        img.src = 'https://www.plantuml.com/plantuml/svg/' + encoded;
                        img.alt = 'PlantUML Diagram';
                        img.className = 'plantuml-diagram';
                        container.innerHTML = '';
                        container.appendChild(img);
                    } catch (err) {
                        container.innerHTML = '<div class="plantuml-error">Error rendering PlantUML: ' + err.message + '</div>';
                    }
                }
            });
            
            // Render Vega/Vega-Lite visualizations
            const vegaContainers = document.querySelectorAll('.vega-lite-container');
            vegaContainers.forEach(container => {
                const code = decodeURIComponent(container.getAttribute('data-vega-code') || '');
                const id = container.getAttribute('data-vega-id');
                if (code && typeof vegaEmbed !== 'undefined') {
                    try {
                        const spec = JSON.parse(code);
                        const vegaDiv = document.createElement('div');
                        vegaDiv.id = id;
                        vegaDiv.className = 'vega-diagram';
                        container.innerHTML = '';
                        container.appendChild(vegaDiv);
                        const embedPromise = vegaEmbed('#' + id, spec, { actions: false });
                        renderingPromises.push(embedPromise.catch(err => {
                            container.innerHTML = '<div class="vega-error">Error rendering Vega: ' + err.message + '</div>';
                            return null;
                        }));
                    } catch (err) {
                        container.innerHTML = '<div class="vega-error">Error rendering Vega: ' + err.message + '</div>';
                    }
                }
            });
            
            // Render GraphViz diagrams
            const graphvizContainers = document.querySelectorAll('.graphviz-container');
            graphvizContainers.forEach(container => {
                const code = decodeURIComponent(container.getAttribute('data-graphviz-code') || '');
                const id = container.getAttribute('data-graphviz-id');
                const engine = container.getAttribute('data-graphviz-engine') || 'dot';
                if (code && typeof Viz !== 'undefined') {
                    const graphvizPromise = (async () => {
                        try {
                            let svg = null;
                            // Try @viz-js/viz v3.x API
                            if (Viz.instance && typeof Viz.instance === 'function') {
                                const viz = await Viz.instance();
                                if (viz && typeof viz.renderSVGElement === 'function') {
                                    svg = await viz.renderSVGElement(code, { engine });
                                }
                            }
                            // Try sync function API as fallback
                            if (!svg && typeof Viz === 'function') {
                                try {
                                    const svgText = Viz(code, { format: 'svg', engine: engine });
                                    if (svgText && svgText.includes('<svg')) {
                                        const parser = new DOMParser();
                                        const doc = parser.parseFromString(svgText, 'image/svg+xml');
                                        svg = doc.documentElement;
                                    }
                                } catch (e) {}
                            }
                            if (svg) {
                                container.innerHTML = '';
                                container.appendChild(svg);
                                container.classList.add('graphviz-rendered');
                            } else {
                                throw new Error('No compatible Viz.js API found');
                            }
                        } catch (err) {
                            container.innerHTML = '<div class="graphviz-error">Error rendering GraphViz: ' + err.message + '</div>';
                        }
                    })();
                    renderingPromises.push(graphvizPromise);
                }
            });
            
            // Render TikZ diagrams with timeout protection
            const tikzContainers = document.querySelectorAll('.tikz-container');
            tikzContainers.forEach(container => {
                const code = decodeURIComponent(container.getAttribute('data-tikz-code') || '');
                const id = container.getAttribute('data-tikz-id');
                const isCircuit = container.getAttribute('data-is-circuit') === 'true';
                if (code) {
                    try {
                        const script = document.createElement('script');
                        script.type = 'text/tikz';
                        script.textContent = code;
                        container.innerHTML = '';
                        container.appendChild(script);
                    } catch (err) {
                        container.innerHTML = '<div class="tikz-error">Error rendering TikZ: ' + err.message + '</div>';
                    }
                }
            });
            
            // Render KityMinder mind maps (note: requires full KityMinder library, may not work in export)
            const kityminderContainers = document.querySelectorAll('.kityminder-container');
            kityminderContainers.forEach(container => {
                const code = decodeURIComponent(container.getAttribute('data-kityminder-code') || '');
                const id = container.getAttribute('data-kityminder-id');
                // KityMinder requires complex initialization - show placeholder in exports
                if (code) {
                    try {
                        const data = JSON.parse(code);
                        container.innerHTML = '<div class="kityminder-placeholder"><strong>Mind Map:</strong> ' + (data.root?.data?.text || 'KityMinder Diagram') + '<br><em>(Interactive view available in app)</em></div>';
                    } catch (err) {
                        container.innerHTML = '<div class="kityminder-placeholder">Mind Map (view in app)</div>';
                    }
                }
            });
            
            // Highlight code blocks - skip already highlighted blocks to avoid security warnings
            if (typeof hljs !== 'undefined') {
                document.querySelectorAll('pre code').forEach((block) => {
                    // Skip if already highlighted (has data-highlighted attribute or hljs class applied)
                    if (!block.hasAttribute('data-highlighted') && !block.classList.contains('hljs')) {
                        hljs.highlightElement(block);
                    }
                });
            }
            
            // Wait for MathJax to complete its automatic processing
            if (typeof MathJax !== 'undefined' && MathJax) {
                const mathPromise = waitForMathJaxReady().then((ready) => {
                    if (!ready) {
                        console.warn('[MathJax] Timed out waiting for MathJax to load');
                        return null;
                    }
                    // MathJax already processed via startup.pageReady, just wait for completion
                    return MathJax.startup && MathJax.startup.promise ? MathJax.startup.promise : Promise.resolve();
                }).then(() => {
                    if (typeof applyNavigationLayoutClasses === 'function') {
                        applyNavigationLayoutClasses();
                    }
                    if (typeof scaleSlidesForPrint === 'function' && document.body && document.body.classList.contains('print-layout')) {
                        scaleSlidesForPrint();
                    }
                    console.log('[MathJax] Presentation rendering complete');
                }).catch((err) => {
                    console.error('[MathJax] Error during MathJax rendering:', err);
                });
                renderingPromises.push(mathPromise);
            } else {
                renderingPromises.push(new Promise((resolve) => {
                    setTimeout(() => {
                        console.log('Presentation rendering complete (no MathJax)');
                        resolve();
                    }, 500);
                }));
            }

            if (renderingPromises.length === 0) {
                renderingPromises.push(Promise.resolve());
            }

            Promise.all(renderingPromises).then(() => {
                if (typeof applyNavigationLayoutClasses === 'function') {
                    applyNavigationLayoutClasses();
                }
                if (typeof scaleSlidesForPrint === 'function' && document.body && document.body.classList.contains('print-layout')) {
                    scaleSlidesForPrint();
                }
                markPresentationRenderComplete();
            }).catch((err) => {
                console.error('[Presentation] Rendering promise error:', err);
                if (typeof applyNavigationLayoutClasses === 'function') {
                    applyNavigationLayoutClasses();
                }
                if (typeof scaleSlidesForPrint === 'function' && document.body && document.body.classList.contains('print-layout')) {
                    scaleSlidesForPrint();
                }
                markPresentationRenderComplete();
            });
        }
        
        // Call immediately if DOM is already loaded, otherwise wait for DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeRendering);
        } else {
            // DOM is already loaded, call immediately
            initializeRendering();
        }
        
        // Progressive tab reveal feature
        const tabDelay = ${this.metadata.tabDelay || 0};
        if (tabDelay > 0) {
            // Add reveal animation class to container
            document.getElementById('presentation-container').classList.add('reveal-animation');
            
            // Add CSS for animation (will be automatically inactive if class is removed)
            const style = document.createElement('style');
            style.id = 'reveal-animation-style';
            style.textContent = \`
                .reveal-animation .slide ul li, 
                .reveal-animation .slide ol li { 
                    opacity: 0; 
                    transition: opacity 0.5s; 
                }
                .reveal-animation .slide.active ul li,
                .reveal-animation .slide.active ol li {
                    opacity: 1;
                }
            \`;
            document.head.appendChild(style);
            
            // Progressive reveal on slide change
            function revealListItems(slideElement) {
                const listItems = slideElement.querySelectorAll('ul li, ol li');
                listItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                    }, index * tabDelay);
                });
            }
            
            // Reveal items on active slide
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.classList.contains('slide') && mutation.target.classList.contains('active')) {
                        revealListItems(mutation.target);
                    }
                });
            });
            
            document.querySelectorAll('.slide').forEach(slide => {
                observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
                if (slide.classList.contains('active')) {
                    revealListItems(slide);
                }
            });
        }
    </script>
</body>
</html>`;
    return this._injectGlobalMathJaxDefs(html);
    }

    /**
     * Get transition CSS based on front-matter settings
     */
    getTransitionCSS() {
        const transition = this.metadata.transition;
        
        if (!transition || transition === 'none') {
            return '';
        }
        
        const duration = this.metadata.transitionDuration || 500;
        
        if (transition === 'fade') {
            return `
        .slide {
            opacity: 0;
            transition: opacity ${duration}ms ease-in-out;
        }
        .slide.active {
            opacity: 1;
        }`;
        }
        
        if (transition === 'slide') {
            return `
        .slide {
            transform: translateX(100%);
            transition: transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out;
        }
        .slide.active {
            transform: translateX(0);
        }
        .slide.transition-enter-left,
        .slide.transition-exit-left {
            transform: translateX(-100%);
        }
        .slide.transition-enter-right,
        .slide.transition-exit-right {
            transform: translateX(100%);
        }
        .slide.transition-enter-left,
        .slide.transition-enter-right {
            opacity: 1;
        }
        .slide.transition-exit-left,
        .slide.transition-exit-right {
            opacity: 0;
        }`;
        }
        
        if (transition === 'zoom') {
            return `
        .slide {
            transform: scale(0.8);
            opacity: 0;
            transition: transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out;
        }
        .slide.active {
            transform: scale(1);
            opacity: 1;
        }`;
        }
        
        return '';
    }

    /**
     * Get transition JavaScript for slide changes
     */
    getTransitionJS() {
        const transition = this.metadata.transition;
        
        if (!transition || transition === 'none') {
            return '';
        }
        
        // For slide transition type, we need to handle prev class
        if (transition === 'slide') {
            return `
        // Add transition class management for slide transitions
        const slideTransitionBaseShowSlide = showSlide;
        let isTransitioning = false;
        const TRANSITION_CLASSES = ['transition-enter-left', 'transition-enter-right', 'transition-exit-left', 'transition-exit-right'];
        const transitionDuration = ${this.metadata.transitionDuration || 500};

        function clearTransitionClasses(element) {
            if (!element) return;
            TRANSITION_CLASSES.forEach(cls => element.classList.remove(cls));
        }

        showSlide = function(index) {
            if (isTransitioning) return;

            const slides = document.querySelectorAll('.slide');
            const current = document.querySelector('.slide.active');
            const currentIndex = current ? Array.from(slides).indexOf(current) : -1;
            const target = slides[index];

            if (!target || index === currentIndex) {
                slideTransitionBaseShowSlide(index);
                return;
            }

            isTransitioning = true;

            const isForward = index > currentIndex;
            const enterClass = isForward ? 'transition-enter-right' : 'transition-enter-left';
            const exitClass = isForward ? 'transition-exit-left' : 'transition-exit-right';

            clearTransitionClasses(target);
            target.classList.add(enterClass);

            if (current) {
                clearTransitionClasses(current);
                current.classList.add(exitClass);
            }

            // Force reflow to ensure the browser applies the starting transform
            target.getBoundingClientRect();

            slideTransitionBaseShowSlide(index);

            requestAnimationFrame(() => {
                target.classList.remove('transition-enter-left', 'transition-enter-right');
            });

            setTimeout(() => {
                if (current) {
                    clearTransitionClasses(current);
                }
                isTransitioning = false;
            }, transitionDuration);
        };`;
        }
        
        // For other transitions, just ensure CSS is properly applied
        return `
    // Ensure transitions are applied
    const transitionBaseShowSlide = showSlide;
    const transitionDuration = ${this.metadata.transitionDuration || 500};
    let isTransitioning = false;
        
        showSlide = function(index) {
            if (isTransitioning) return;
            
            const current = document.querySelector('.slide.active');
            const currentIndex = current ? Array.from(document.querySelectorAll('.slide')).indexOf(current) : -1;
            
            if (currentIndex !== index && currentIndex >= 0) {
                isTransitioning = true;
                
                // Call original
                transitionBaseShowSlide(index);
                
                // Reset transition lock after duration
                setTimeout(() => {
                    isTransitioning = false;
                }, transitionDuration);
            } else {
                transitionBaseShowSlide(index);
            }
        };`;
    }

    /**
     * Generate header and footer HTML based on front-matter
     */
    generateHeaderFooterHTML() {
        let html = '';
        
        // Generate header if specified
        if (this.metadata.header) {
            let headerText = String(this.metadata.header).trim();
            // Remove surrounding quotes if present
            headerText = headerText.replace(/^["']|["']$/g, '');
            // Escape HTML
            headerText = this.escapeHTML(headerText);
            html += `    <div class="presentation-header">${headerText}</div>\n`;
        }
        
        // Generate footer if specified
        if (this.metadata.footer) {
            let footerText = String(this.metadata.footer).trim();
            // Remove surrounding quotes if present
            footerText = footerText.replace(/^["']|["']$/g, '');
            // Escape HTML
            footerText = this.escapeHTML(footerText);
            html += `    <div class="presentation-footer">${footerText}</div>\n`;
        }
        
    return this._injectGlobalMathJaxDefs(html);
    }

    /**
     * Generate a Table of Contents slide from section headers
     */
    generateTOCSlide() {
        // Extract section titles from slides (slides with # or ## headers)
        const sections = [];
        
        for (const slide of this.slides) {
            const content = slide.content;
            
            // Look for level 1 headers (# Title) first
            const h1Match = content.match(/^#\s+(.+)$/m);
            // Look for level 2 headers (## Title)
            const h2Match = content.match(/^##\s+(.+)$/m);
            
            if (h1Match) {
                // Level 1 header - major section
                sections.push({
                    title: h1Match[1].trim(),
                    level: 1
                });
            } else if (h2Match) {
                // Level 2 header - subsection
                sections.push({
                    title: h2Match[1].trim(),
                    level: 2
                });
            }
        }
        
        // Create TOC slide content
        let tocContent = '# Outline\n\n';
        if (sections.length > 0) {
            sections.forEach((section, index) => {
                // Indent level 2 sections
                const indent = section.level === 2 ? '  ' : '';
                const bullet = section.level === 1 ? `${sections.filter(s => s.level === 1).indexOf(section) + 1}.` : '-';
                tocContent += `${indent}${bullet} ${section.title}\n`;
            });
        } else {
            tocContent = '# Outline\n\n*No sections found. Add # or ## headers to your slides.*';
        }
        
        return {
            type: 'section',
            title: 'Outline',
            content: tocContent,
            isTOC: true
        };
    }

    /**
     * Generate HTML for a single slide
     */
    generateSlideHTML(slide, index, theme) {
        // Protect math expressions before processing with marked
        let content = slide.content;
        const mathPlaceholders = new Map();
        let placeholderIndex = 0;
        
        const normalizeTex = (tex, isDisplay) => {
            if (typeof tex !== 'string') {
                return '';
            }
            const trimmed = isDisplay ? tex.trim() : tex.trim();
            return trimmed.replace(/\r\n/g, '\n');
        };

        // Protect display math ($$...$$) - must come before inline math
        content = content.replace(/\$\$([^\$]+?)\$\$/g, (match, mathContent) => {
            const placeholder = `MATH_DISPLAY_${placeholderIndex++}`;
            const tex = normalizeTex(mathContent, true);
            mathPlaceholders.set(placeholder, {
                original: match,
                type: 'display',
                tex,
                delimiter: 'dollar-display'
            });
            return `\n${placeholder}\n`; // Add newlines to keep it as block element
        });

        // Protect display math using \[ ... \] delimiters
        content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match, mathContent) => {
            const placeholder = `MATH_DISPLAY_${placeholderIndex++}`;
            const tex = normalizeTex(mathContent, true);
            mathPlaceholders.set(placeholder, {
                original: match,
                type: 'display',
                tex,
                delimiter: 'bracket'
            });
            return `\n${placeholder}\n`;
        });
        
        // Protect inline math ($...$)
        content = content.replace(/\$([^\$\n]+?)\$/g, (match, mathContent) => {
            const placeholder = `MATH_INLINE_${placeholderIndex++}`;
            const tex = normalizeTex(mathContent, false);
            mathPlaceholders.set(placeholder, {
                original: match,
                type: 'inline',
                tex,
                delimiter: 'dollar-inline'
            });
            return placeholder;
        });
        
        // Protect inline math using \( ... \) delimiters
        content = content.replace(/\\\(([\s\S]*?)\\\)/g, (match, mathContent) => {
            const placeholder = `MATH_INLINE_${placeholderIndex++}`;
            const tex = normalizeTex(mathContent, false);
            mathPlaceholders.set(placeholder, {
                original: match,
                type: 'inline',
                tex,
                delimiter: 'paren'
            });
            return placeholder;
        });
        
        // Parse markdown content to HTML using marked if available
        let htmlContent = content;
        
        // Check for marked in window object
        if (typeof window !== 'undefined' && window.marked) {
            try {
                // Configure marked for GFM (GitHub Flavored Markdown) to support tables
                if (typeof window.marked.setOptions === 'function') {
                    window.marked.setOptions({
                        gfm: true,
                        breaks: true,
                        tables: true
                    });
                } else if (typeof window.marked.use === 'function') {
                    window.marked.use({
                        gfm: true,
                        breaks: true
                    });
                }
                
                // marked.parse returns a string in marked v12+
                if (typeof window.marked.parse === 'function') {
                    const result = window.marked.parse(content);
                    // Ensure it's a string
                    htmlContent = typeof result === 'string' ? result : String(result);
                } else if (typeof window.marked === 'function') {
                    // Legacy marked usage
                    const result = window.marked(content);
                    htmlContent = typeof result === 'string' ? result : String(result);
                } else {
                    htmlContent = this.simpleMarkdownToHTML(content);
                }
            } catch (error) {
                console.error('[Presentation] Marked parsing error:', error);
                htmlContent = this.simpleMarkdownToHTML(content);
            }
        } else {
            // Simple markdown conversion fallback
            htmlContent = this.simpleMarkdownToHTML(content);
        }
        
        // Restore math expressions with original delimiters, ensuring proper wrappers for MathJax
        const escapeForRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const CHEM_MACRO_PATTERN = /\\(ce|pu|chem[a-z]*)/i;
        const needsMhchemSupport = (tex) => {
            return typeof tex === 'string' && CHEM_MACRO_PATTERN.test(tex);
        };
        const sanitizeKatexMarkup = (markup) => {
            if (typeof markup !== 'string') {
                return '';
            }
            return markup.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '');
        };
        const ensureKatexMhchemSupport = (forceModule = false) => {
            if (typeof window === 'undefined') {
                return;
            }

            if (typeof require === 'function') {
                try {
                    const katexModule = require('katex');
                    if (katexModule && typeof katexModule.renderToString === 'function') {
                        const shouldReplace = forceModule || !window.katex || window.katex.renderToString !== katexModule.renderToString;
                        if (shouldReplace) {
                            window.katex = katexModule;
                        }
                    }
                } catch (error) {
                    if (!ensureKatexMhchemSupport._loggedKatexRequireError) {
                        console.warn('[Presentation] Failed to require KaTeX for mhchem support:', error && error.message ? error.message : error);
                        ensureKatexMhchemSupport._loggedKatexRequireError = true;
                    }
                }

                try {
                    const mhchemModule = require('katex/contrib/mhchem');
                    if (typeof mhchemModule === 'function' && window.katex) {
                        try {
                            mhchemModule(window.katex);
                        } catch (invokeError) {
                            if (!ensureKatexMhchemSupport._loggedMhchemInvokeError) {
                                console.warn('[Presentation] KaTeX mhchem module invocation warning:', invokeError && invokeError.message ? invokeError.message : invokeError);
                                ensureKatexMhchemSupport._loggedMhchemInvokeError = true;
                            }
                        }
                    }
                } catch (error) {
                    if (!ensureKatexMhchemSupport._loggedMhchemRequireError) {
                        console.warn('[Presentation] Failed to require KaTeX mhchem module:', error && error.message ? error.message : error);
                        ensureKatexMhchemSupport._loggedMhchemRequireError = true;
                    }
                }
            }
        };
        const renderWithKatex = (tex, display) => {
            if (typeof tex !== 'string') {
                return null;
            }
            const trimmedTex = tex.trim();
            if (!trimmedTex) {
                return null;
            }

            const requiresMhchem = needsMhchemSupport(trimmedTex);
            if (requiresMhchem) {
                ensureKatexMhchemSupport();
            }

            if (typeof window !== 'undefined' && window.katex && typeof window.katex.renderToString === 'function') {
                const tryRender = (forceModule = false) => {
                    try {
                        if (forceModule) {
                            ensureKatexMhchemSupport(true);
                        }

                        const rendered = window.katex.renderToString(trimmedTex, {
                            displayMode: display,
                            throwOnError: false,
                            strict: false
                        });

                        if (typeof rendered !== 'string' || rendered.includes('katex-error')) {
                            return null;
                        }

                        if (requiresMhchem) {
                            const sanitized = sanitizeKatexMarkup(rendered);
                            const hasChemTokens = CHEM_MACRO_PATTERN.test(sanitized);
                            const hasErrorColor = sanitized.toLowerCase().includes('#cc0000');

                            if (hasChemTokens || hasErrorColor) {
                                return null;
                            }
                        }

                        return rendered;
                    } catch (err) {
                        if (forceModule) {
                            console.warn('[Presentation] KaTeX render retry failed:', err && err.message ? err.message : err);
                        } else {
                            console.warn('[Presentation] KaTeX render error:', err && err.message ? err.message : err);
                        }
                        return null;
                    }
                };

                let rendered = tryRender(false);
                if (!rendered && requiresMhchem) {
                    rendered = tryRender(true);
                }

                if (rendered) {
                    return rendered;
                }

                if (requiresMhchem && !renderWithKatex._loggedChemFallback) {
                    console.warn('[Presentation] KaTeX mhchem output still contains raw chemistry markup after retry; using MathJax fallback for chemistry rendering.');
                    renderWithKatex._loggedChemFallback = true;
                }
            }
            return null;
        };

        const renderWithMathJax = (tex, display) => {
            if (typeof tex !== 'string') {
                return null;
            }
            const trimmedTex = tex.trim();
            if (!trimmedTex) {
                return null;
            }

            if (typeof window !== 'undefined' && window.MathJax && typeof window.MathJax.tex2svg === 'function') {
                try {
                    const node = window.MathJax.tex2svg(trimmedTex, {display: display});
                    let rendered = null;
                    
                    if (typeof node === 'string') {
                        rendered = node;
                    } else if (node && typeof node.outerHTML === 'string') {
                        rendered = node.outerHTML;
                    } else if (node && node.node && window.MathJax.startup && window.MathJax.startup.adaptor) {
                        rendered = window.MathJax.startup.adaptor.outerHTML(node.node);
                    }
                    
                    // Embed SVG defs for self-contained SVGs
                    if (rendered && rendered.includes('<svg')) {
                        const defsMarkup = this._getMathJaxDefsMarkup();
                        if (defsMarkup && !rendered.includes('<defs>')) {
                            rendered = rendered.replace(/<svg([^>]*)>/, `<svg$1>${defsMarkup}`);
                        }
                    }
                    
                    return rendered;
                } catch (err) {
                    console.warn('[Presentation] MathJax render error:', err && err.message ? err.message : err);
                }
            }
            return null;
        };

        const encodeAttribute = (value) => {
            if (value == null) {
                return '';
            }
            if (typeof document === 'undefined') {
                return String(value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }
            const div = document.createElement('div');
            div.textContent = value;
            return div.innerHTML;
        };

        const resolveDelimiters = (descriptor) => {
            if (!descriptor) {
                return ['$', '$'];
            }

            switch (descriptor.delimiter) {
                case 'dollar-display':
                    return ['$$', '$$'];
                case 'bracket':
                    return ['\\[', '\\]'];
                case 'dollar-inline':
                    return ['$', '$'];
                case 'paren':
                    return ['\\(', '\\)'];
                default:
                    return descriptor.type === 'display'
                        ? ['\\[', '\\]']
                        : ['\\(', '\\)'];
            }
        };

        mathPlaceholders.forEach((value, placeholder) => {
            const descriptor = value && typeof value === 'object'
                ? value
                : { original: value, type: placeholder.startsWith('MATH_DISPLAY_') ? 'display' : 'inline' };
            const { original, type } = descriptor;
            const texContent = descriptor.tex || '';
            const placeholderPattern = new RegExp(`\\b${escapeForRegex(placeholder)}\\b`, 'g');
            const encodedTexAttr = encodeAttribute(texContent);
            const [openingDelimiter, closingDelimiter] = resolveDelimiters(descriptor);
            const mathjaxSource = `${openingDelimiter}${texContent}${closingDelimiter}`;
            
            const wrapMathMarkup = (engine, markup, isDisplay, requiresMathJaxProcessing = false) => {
                const tagName = isDisplay ? 'div' : 'span';
                const className = isDisplay ? 'math-display' : 'math-inline';
                const processingClass = requiresMathJaxProcessing ? ' tex2jax_process' : '';
                return `<${tagName} class="${className}${processingClass}" data-engine="${engine}" data-tex="${encodedTexAttr}">${markup}</${tagName}>`;
            };

            const buildMathReplacement = (isDisplay) => {
                const katexMarkup = renderWithKatex(texContent, isDisplay);
                if (katexMarkup) {
                    return wrapMathMarkup('katex', katexMarkup, isDisplay);
                }

                const mathjaxMarkup = renderWithMathJax(texContent, isDisplay);
                if (mathjaxMarkup) {
                    return wrapMathMarkup('mathjax-prerendered', mathjaxMarkup, isDisplay);
                }

                return wrapMathMarkup('mathjax', mathjaxSource, isDisplay, true);
            };

            if (type === 'display') {
                const blockReplacement = buildMathReplacement(true);
                // Replace wrapped in paragraphs first
                htmlContent = htmlContent.replace(
                    new RegExp(`<p>\\s*${escapeForRegex(placeholder)}\\s*</p>`, 'g'),
                    blockReplacement
                );
                // Replace any remaining standalone placeholders
                htmlContent = htmlContent.replace(placeholderPattern, blockReplacement);
            } else {
                const inlineReplacement = buildMathReplacement(false);
                htmlContent = htmlContent.replace(placeholderPattern, inlineReplacement);
            }
        });
        
        // Clean HTML for export (remove interactive elements)
        htmlContent = this.cleanHTMLForExport(htmlContent);
        
        const activeClass = index === 0 ? 'active' : '';
        
        return `    <div class="slide ${activeClass} slide-${slide.type}" data-slide-index="${index}" data-theme="${theme}">
        ${htmlContent}
    </div>`;
    }

    /**
     * Clean HTML for export - remove copy buttons, line numbers, fix mermaid containers, remove KityMinder buttons
     */
    cleanHTMLForExport(html) {
        // Create a temporary DOM element to parse HTML
        if (typeof document === 'undefined') {
            return html; // Server-side, skip cleaning
        }
        
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Remove copy buttons from code blocks
        const copyButtons = temp.querySelectorAll('button.copy-code-button, button.copy-button');
        copyButtons.forEach(btn => btn.remove());
        
        // Remove line number containers
        const lineNumbers = temp.querySelectorAll('.line-numbers, .line-numbers-wrapper');
        lineNumbers.forEach(ln => ln.remove());
        
        // Remove KityMinder edit/view buttons (not functional in standalone HTML)
        const kityMinderHeaders = temp.querySelectorAll('.kityminder-diagram .diagram-header, .kityminder-container .diagram-header');
        kityMinderHeaders.forEach(header => header.remove());
        
        // Fix Mermaid containers: change from mermaid-container to proper mermaid div
        const mermaidContainers = temp.querySelectorAll('.mermaid-container');
        mermaidContainers.forEach(container => {
            const code = decodeURIComponent(container.getAttribute('data-mermaid-code') || '');
            if (code) {
                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.textContent = code;
                container.replaceWith(mermaidDiv);
            }
        });
        
        return temp.innerHTML;
    }

    /**
     * Simple markdown to HTML converter (fallback)
     */
    simpleMarkdownToHTML(markdown) {
        let html = markdown;
        
        // Headers
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Lists
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Paragraphs
        const lines = html.split('\n');
        html = lines.map(line => {
            if (line.trim() && !line.startsWith('<')) {
                return `<p>${line}</p>`;
            }
            return line;
        }).join('\n');
        
        return html;
    }

    /**
     * Get theme configuration object
     * @param {string} theme - Theme name
     * @returns {Object|null} Theme configuration or null if not found
     */
    getThemeConfig(theme) {
        if (this.customThemes && this.customThemes[theme]) {
            const customTheme = this.customThemes[theme];
            if (customTheme.navigation) {
                return { navigation: customTheme.navigation };
            }
            const baseConfig = this.getThemeConfig(customTheme.baseTheme || 'berkeley');
            return baseConfig || { navigation: 'none' };
        }
        
        // Theme configurations (must match getThemeCSS themes)
        const themes = {
            // Original 5 themes
            berkeley: { navigation: 'left' },
            berlin: { navigation: 'top' },
            copenhagen: { navigation: 'left' },
            darmstadt: { navigation: 'top' },
            warsaw: { navigation: 'top' },
            
            // Additional popular Beamer themes
            madrid: { navigation: 'top' },
            annarbor: { navigation: 'none' },
            cambridgeus: { navigation: 'none' },
            pittsburgh: { navigation: 'none' },
            rochester: { navigation: 'none' },
            boadilla: { navigation: 'left' },
            antibes: { navigation: 'left' },
            juanlespins: { navigation: 'left' },
            montpellier: { navigation: 'left' },
            malmoe: { navigation: 'left' },
            singapore: { navigation: 'none' },
            szeged: { navigation: 'none' },
            hannover: { navigation: 'top' },
            marburg: { navigation: 'top' },
            goettingen: { navigation: 'none' },
            
            // Color variants
            'berkeley-dark': { navigation: 'left' },
            'berlin-light': { navigation: 'top' },
            'copenhagen-blue': { navigation: 'left' },
            'madrid-green': { navigation: 'top' },
            'simple-light': { navigation: 'none' },
            'simple-dark': { navigation: 'none' },
            'minimal-gray': { navigation: 'none' },
            'corporate-blue': { navigation: 'none' },
            'aurora-forge': { navigation: 'top' },
            'ddt-signature': { navigation: 'top' },
            'strata-pulse': { navigation: 'top' }
        };
        
        return themes[theme] || null;
    }

    getBuiltInThemePalette() {
        return {
            // Original 5 themes
            berkeley: {
                primary: '#003262',
                secondary: '#FDB515',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#003262',
                headerText: '#FDB515',
                footerBg: '#f5f5f5',
                footerText: '#666666',
                navigation: 'left' // Beamer Berkeley has left sidebar
            },
            berlin: {
                primary: '#2c3e50',
                secondary: '#3498db',
                background: '#ecf0f1',
                text: '#2c3e50',
                headerBg: '#2c3e50',
                headerText: '#ecf0f1',
                footerBg: '#34495e',
                footerText: '#ecf0f1',
                navigation: 'top' // Beamer Berlin has top navigation
            },
            copenhagen: {
                primary: '#8B0000',
                secondary: '#FFD700',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#8B0000',
                headerText: '#FFD700',
                footerBg: '#f5f5f5',
                footerText: '#8B0000',
                navigation: 'left' // Beamer Copenhagen has left sidebar
            },
            darmstadt: {
                primary: '#004d99',
                secondary: '#99ccff',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#004d99',
                headerText: '#99ccff',
                footerBg: '#e6f2ff',
                footerText: '#004d99',
                navigation: 'top' // Beamer Darmstadt has top bar
            },
            warsaw: {
                primary: '#660000',
                secondary: '#cc9933',
                background: '#f9f9f9',
                text: '#333333',
                headerBg: '#660000',
                headerText: '#cc9933',
                footerBg: '#ffe6cc',
                footerText: '#660000',
                navigation: 'top' // Beamer Warsaw has top navigation
            },
            
            // Additional popular Beamer themes
            madrid: {
                primary: '#1a5490',
                secondary: '#e8ab3c',
                background: '#ffffff',
                text: '#2d2d2d',
                headerBg: '#1a5490',
                headerText: '#e8ab3c',
                footerBg: '#f0f0f0',
                footerText: '#1a5490',
                navigation: 'top' // Beamer Madrid has top tree navigation
            },
            annarbor: {
                primary: '#00274c',
                secondary: '#ffcb05',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#00274c',
                headerText: '#ffcb05',
                footerBg: '#f5f5f5',
                footerText: '#00274c',
                navigation: 'none' // Simpler theme
            },
            cambridgeus: {
                primary: '#a51c30',
                secondary: '#9c9b99',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#a51c30',
                headerText: '#f0f0f0',
                footerBg: '#f5f5f5',
                footerText: '#a51c30',
                navigation: 'none' // Simpler theme
            },
            pittsburgh: {
                primary: '#003594',
                secondary: '#ffb81c',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#003594',
                headerText: '#ffb81c',
                footerBg: '#f5f5f5',
                footerText: '#003594',
                navigation: 'none' // Simpler theme
            },
            rochester: {
                primary: '#005a8b',
                secondary: '#f2a900',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#005a8b',
                headerText: '#f2a900',
                footerBg: '#f5f5f5',
                footerText: '#005a8b',
                navigation: 'none' // Simpler theme
            },
            boadilla: {
                primary: '#003f87',
                secondary: '#ffa300',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#003f87',
                headerText: '#ffa300',
                footerBg: '#f5f5f5',
                footerText: '#003f87',
                navigation: 'left' // Beamer Boadilla has left sidebar
            },
            antibes: {
                primary: '#2e3192',
                secondary: '#00aeef',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#2e3192',
                headerText: '#00aeef',
                footerBg: '#f5f5f5',
                footerText: '#2e3192',
                navigation: 'left' // Beamer Antibes has left sidebar
            },
            juanlespins: {
                primary: '#1e3a5f',
                secondary: '#76b82a',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#1e3a5f',
                headerText: '#76b82a',
                footerBg: '#f5f5f5',
                footerText: '#1e3a5f',
                navigation: 'left' // Beamer JuanLesPins has left sidebar
            },
            montpellier: {
                primary: '#7a0019',
                secondary: '#f2a900',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#7a0019',
                headerText: '#f2a900',
                footerBg: '#f5f5f5',
                footerText: '#7a0019',
                navigation: 'left' // Beamer Montpellier has left sidebar
            },
            malmoe: {
                primary: '#004477',
                secondary: '#ffaa00',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#004477',
                headerText: '#ffaa00',
                footerBg: '#f5f5f5',
                footerText: '#004477',
                navigation: 'left' // Beamer Malmoe has left sidebar
            },
            singapore: {
                primary: '#8b0000',
                secondary: '#daa520',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#8b0000',
                headerText: '#daa520',
                footerBg: '#f5f5f5',
                footerText: '#8b0000',
                navigation: 'none' // Simpler theme
            },
            szeged: {
                primary: '#003366',
                secondary: '#99ccff',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#003366',
                headerText: '#99ccff',
                footerBg: '#f5f5f5',
                footerText: '#003366',
                navigation: 'none' // Simpler theme
            },
            hannover: {
                primary: '#006400',
                secondary: '#90ee90',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#006400',
                headerText: '#90ee90',
                footerBg: '#f5f5f5',
                footerText: '#006400',
                navigation: 'top' // Beamer Hannover has top bar
            },
            marburg: {
                primary: '#4b0082',
                secondary: '#da70d6',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#4b0082',
                headerText: '#da70d6',
                footerBg: '#f5f5f5',
                footerText: '#4b0082',
                navigation: 'top' // Beamer Marburg has top bar
            },
            goettingen: {
                primary: '#b8860b',
                secondary: '#ffd700',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#b8860b',
                headerText: '#ffd700',
                footerBg: '#f5f5f5',
                footerText: '#b8860b',
                navigation: 'none' // Simpler theme
            },
            
            // Color variants
            'berkeley-dark': {
                primary: '#FDB515',
                secondary: '#3b7ea1',
                background: '#1a1a1a',
                text: '#e0e0e0',
                headerBg: '#003262',
                headerText: '#FDB515',
                footerBg: '#2a2a2a',
                footerText: '#FDB515',
                navigation: 'left' // Inherits Berkeley navigation style
            },
            'berlin-light': {
                primary: '#3498db',
                secondary: '#e74c3c',
                background: '#ffffff',
                text: '#2c3e50',
                headerBg: '#3498db',
                headerText: '#ffffff',
                footerBg: '#f5f5f5',
                footerText: '#3498db',
                navigation: 'top' // Inherits Berlin navigation style
            },
            'copenhagen-blue': {
                primary: '#1e90ff',
                secondary: '#ffd700',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#1e90ff',
                headerText: '#ffd700',
                footerBg: '#f5f5f5',
                footerText: '#1e90ff',
                navigation: 'left' // Inherits Copenhagen navigation style
            },
            'madrid-green': {
                primary: '#2e7d32',
                secondary: '#81c784',
                background: '#ffffff',
                text: '#333333',
                headerBg: '#2e7d32',
                headerText: '#81c784',
                footerBg: '#f5f5f5',
                footerText: '#2e7d32',
                navigation: 'top' // Inherits Madrid navigation style
            },
            'simple-light': {
                primary: '#424242',
                secondary: '#2196f3',
                background: '#ffffff',
                text: '#212121',
                headerBg: '#f5f5f5',
                headerText: '#424242',
                footerBg: '#fafafa',
                footerText: '#757575',
                navigation: 'none' // Minimal theme
            },
            'simple-dark': {
                primary: '#90caf9',
                secondary: '#ffab91',
                background: '#212121',
                text: '#e0e0e0',
                headerBg: '#1a1a1a',
                headerText: '#90caf9',
                footerBg: '#2a2a2a',
                footerText: '#90caf9',
                navigation: 'none' // Minimal theme
            },
            'minimal-gray': {
                primary: '#607d8b',
                secondary: '#009688',
                background: '#fafafa',
                text: '#37474f',
                headerBg: '#eceff1',
                headerText: '#37474f',
                footerBg: '#f5f5f5',
                footerText: '#607d8b',
                navigation: 'none' // Minimal theme
            },
            'corporate-blue': {
                primary: '#0d47a1',
                secondary: '#42a5f5',
                background: '#ffffff',
                text: '#1565c0',
                headerBg: '#0d47a1',
                headerText: '#90caf9',
                footerBg: '#e3f2fd',
                footerText: '#0d47a1',
                navigation: 'none' // Corporate minimal style
            },
            'aurora-forge': {
                primary: '#ff1f1b',
                secondary: '#101820',
                background: '#ffffff',
                text: '#1f1f1f',
                headerBg: '#101820',
                headerText: '#ffffff',
                footerBg: '#f0f2f5',
                footerText: '#101820',
                navigation: 'top' // Modern consultative aesthetic
            },
            'ddt-signature': {
                primary: '#eb1c2d',
                secondary: '#1c1d26',
                background: '#ffffff',
                text: '#1a1d23',
                headerBg: '#1c1d26',
                headerText: '#ffffff',
                footerBg: '#f4f4f6',
                footerText: '#1c1d26',
                navigation: 'top' // DDT red/black brand styling
            },
            'strata-pulse': {
                primary: '#d6001c',
                secondary: '#ff6f61',
                background: '#f5f3f1',
                text: '#111111',
                headerBg: '#111111',
                headerText: '#f5f5f5',
                footerBg: '#ffffff',
                footerText: '#4a4a4a',
                navigation: 'top' // WSP-inspired high-contrast layout
            }
        };
    }

    /**
     * Get theme CSS
     * 
     * Navigation Types:
     * - 'left': Left sidebar navigation (Beamer themes: Berkeley, Copenhagen, Boadilla, Antibes, JuanLesPins, Montpellier, Malmoe)
     * - 'top': Top bar navigation (Beamer themes: Berlin, Darmstadt, Warsaw, Madrid, Hannover, Marburg)
     * - 'none': No navigation panel (Simple themes and color variants)
     */
    async getThemeCSS(theme) {
        const isCustomTheme = !!(this.customThemes && this.customThemes[theme]);
        const palette = this.getBuiltInThemePalette();
        const customDefinition = isCustomTheme ? this.customThemes[theme] : null;
        const baseTheme = isCustomTheme ? (customDefinition.baseTheme || 'berkeley') : theme;
        const baseColors = palette[baseTheme] || palette.berkeley;
        const frontMatterColors = this.metadata ? this.metadata.colors || {} : {};

        let colors = { ...baseColors };

        if (isCustomTheme) {
            colors = { ...colors, ...(customDefinition.colors || {}) };
        }

        colors = { ...colors, ...frontMatterColors };
        
        // Get theme-specific structural CSS
        const themeStructure = this.getThemeStructureCSS(theme, colors);
        
        return `
        /* ${theme.toUpperCase()} Theme */
        .slide {
            background: ${colors.background};
            color: ${colors.text};
        }
        
        .slide h1, .slide h2, .slide h3 {
            color: ${colors.primary};
        }
        
        .slide h1 {
            border-bottom: 3px solid ${colors.secondary};
            padding-bottom: 0.3em;
        }
        
        .slide a {
            color: ${colors.secondary};
            text-decoration: none;
        }
        
        .slide a:hover {
            text-decoration: underline;
        }
        
        #progress-bar {
            background: ${colors.secondary};
        }
        
        #slide-counter {
            background: ${colors.headerBg};
            color: ${colors.headerText};
        }
        
        /* Theme-Specific Structural Styles */
        ${themeStructure}
        
        /* Left Sidebar Navigation */
        .presentation-nav-left {
            position: fixed;
            left: 0;
            top: 0;
            width: 200px;
            height: 100vh;
            background: ${colors.headerBg};
            color: ${colors.headerText};
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }
        
        .presentation-nav-left ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .presentation-nav-left .nav-item {
            padding: 12px 20px;
            cursor: pointer;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            transition: background-color 0.3s ease, padding-left 0.3s ease;
            font-size: 14px;
            line-height: 1.4;
        }
        
        .presentation-nav-left .nav-item:hover {
            background: rgba(255,255,255,0.1);
            padding-left: 25px;
        }
        
        .presentation-nav-left .nav-item.active {
            background: ${colors.secondary};
            color: ${colors.background};
            font-weight: bold;
            border-left: 4px solid ${colors.primary};
        }
        
        /* Adjust slide container when left nav is present */
        body:has(.presentation-nav-left) #presentation-container {
            margin-left: var(--presentation-left-offset);
            width: calc(100vw - var(--presentation-left-offset));
        }

        body:has(.presentation-nav-left) .slide {
            padding: 60px;
        }
        
        /* Top Bar Navigation */
        .presentation-nav-top {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: ${colors.headerBg};
            color: ${colors.headerText};
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            overflow-x: auto;
        }
        
        .presentation-nav-top ul {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: row;
            align-items: center;
            width: 100%;
        }
        
        .presentation-nav-top .nav-item {
            padding: 18px 24px;
            cursor: pointer;
            transition: background-color 0.3s ease, transform 0.2s ease;
            font-size: 14px;
            white-space: nowrap;
            border-right: 1px solid rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        
        .presentation-nav-top .nav-item:hover {
            background: rgba(255,255,255,0.1);
            transform: translateY(-2px);
        }
        
        .presentation-nav-top .nav-item.active {
            background: ${colors.secondary};
            color: ${colors.background};
            font-weight: bold;
            border-bottom: 4px solid ${colors.primary};
        }
        
        /* Adjust slide container when top nav is present */
        body:has(.presentation-nav-top) #presentation-container {
            margin-top: calc(var(--presentation-top-offset) + var(--presentation-header-height));
            height: calc(100vh - (var(--presentation-top-offset) + var(--presentation-header-height)));
        }

        body:has(.presentation-nav-top) .slide {
            padding: 60px;
        }
        `;
    }

    /**
     * Get theme-specific structural CSS
     * This creates actual Beamer-style layout differences
     */
    getThemeStructureCSS(theme, colors) {
        if (this.customThemes && this.customThemes[theme]) {
            const baseTheme = this.customThemes[theme].baseTheme || 'berkeley';
            if (baseTheme !== theme) {
                return this.getThemeStructureCSS(baseTheme, colors);
            }
        }
        
        // Berkeley Style: Serif font, sidebar, rounded boxes
        if (theme === 'berkeley' || theme === 'berkeley-dark') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Georgia', 'Times New Roman', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.5em;
                font-weight: 600;
                border-bottom: 4px double ${colors.secondary};
                margin-bottom: 1em;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                background: ${colors.footerBg};
                padding: 20px 40px;
                border-radius: 8px;
                border-left: 5px solid ${colors.secondary};
            }
            [data-theme="${theme}"] blockquote {
                background: ${colors.headerBg};
                color: ${colors.headerText};
                padding: 20px;
                border-radius: 8px;
                font-style: italic;
            }
            `;
        }
        
        // Berlin Style: Sans-serif, thick header, shadow boxes
        if (theme === 'berlin' || theme === 'berlin-light') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Arial', 'Helvetica', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                font-weight: 700;
                background: linear-gradient(to right, ${colors.headerBg}, ${colors.primary});
                color: ${colors.headerText};
                padding: 20px 30px;
                margin: -60px -60px 30px -60px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.secondary};
                color: ${colors.background};
                padding: 10px 20px;
                border-radius: 4px;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                background: white;
                padding: 20px 40px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                border-radius: 4px;
            }
            `;
        }
        
        // Copenhagen Style: Minimalist, centered, elegant
        if (theme === 'copenhagen' || theme === 'copenhagen-blue') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Palatino', 'Book Antiqua', serif;
                text-align: center;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3em;
                font-weight: 300;
                border: none;
                border-top: 2px solid ${colors.secondary};
                border-bottom: 2px solid ${colors.secondary};
                padding: 30px 0;
                margin: 0 auto 40px auto;
                max-width: 80%;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                text-align: left;
                display: inline-block;
                background: transparent;
                border: 2px solid ${colors.primary};
                padding: 20px 40px;
            }
            [data-theme="${theme}"] p {
                max-width: 80%;
                margin-left: auto;
                margin-right: auto;
            }
            `;
        }
        
        // Warsaw Style: Corporate, structured, bold headers
        if (theme === 'warsaw') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Tahoma', 'Verdana', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 700;
                background: ${colors.headerBg};
                color: ${colors.headerText};
                padding: 25px 40px;
                margin: -60px -60px 30px -60px;
                border-bottom: 5px solid ${colors.secondary};
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            [data-theme="${theme}"] h2 {
                color: ${colors.headerBg};
                border-left: 8px solid ${colors.secondary};
                padding-left: 20px;
                font-weight: 700;
            }
            [data-theme="${theme}"] code, [data-theme="${theme}"] pre {
                background: ${colors.footerBg};
                border-left: 4px solid ${colors.primary};
            }
            `;
        }

        // Aurora Forge: Bold consulting style, uppercase typography, red accents
        if (theme === 'aurora-forge') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Montserrat', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                letter-spacing: 0.01em;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3em;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.18em;
                border-bottom: none;
                border-left: 10px solid ${colors.primary};
                padding: 24px 36px;
                margin: -60px -60px 40px -60px;
                background: linear-gradient(90deg, rgba(255,31,27,0.15), rgba(16,24,32,0));
                color: ${colors.primary};
            }
            [data-theme="${theme}"] h2 {
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                color: ${colors.secondary};
                border-left: 6px solid ${colors.primary};
                padding-left: 18px;
                margin-top: 32px;
            }
            [data-theme="${theme}"] h3 {
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: ${colors.secondary};
            }
            [data-theme="${theme}"] p {
                font-size: 1.08em;
                line-height: 1.7;
                color: ${colors.text};
            }
            [data-theme="${theme}"] ul {
                list-style: none;
                padding-left: 0;
                margin: 25px 0;
            }
            [data-theme="${theme}"] ul li {
                position: relative;
                padding-left: 30px;
                margin-bottom: 14px;
            }
            [data-theme="${theme}"] ul li::before {
                content: '';
                position: absolute;
                left: 0;
                top: 12px;
                width: 18px;
                height: 3px;
                background: ${colors.primary};
            }
            [data-theme="${theme}"] blockquote {
                border-left: 6px solid ${colors.primary};
                background: rgba(16,24,32,0.05);
                color: ${colors.secondary};
                font-style: normal;
                font-weight: 500;
                padding: 24px 32px;
                margin: 30px 0;
            }
            [data-theme="${theme}"] code,
            [data-theme="${theme}"] pre {
                background: rgba(16,24,32,0.92);
                color: #ffffff;
                border-radius: 6px;
                padding: 14px 18px;
            }
            [data-theme="${theme}"] strong {
                color: ${colors.primary};
                font-weight: 700;
            }
            body:has(.slide[data-theme="${theme}"]) #progress-bar {
                background: ${colors.primary};
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top {
                backdrop-filter: blur(6px);
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item {
                font-family: 'Montserrat', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 600;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item:hover {
                background: rgba(255,31,27,0.18);
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item.active {
                background: ${colors.primary};
                color: #ffffff;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-header,
            body:has(.slide[data-theme="${theme}"]) .presentation-footer {
                font-family: 'Montserrat', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                text-transform: uppercase;
                letter-spacing: 0.1em;
            }
            `;
        }

        // DDT Signature: Bold red/black corporate styling
        if (theme === 'ddt-signature') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Avenir Next', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                letter-spacing: 0.01em;
                color: ${colors.text};
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.9em;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.16em;
                margin: -60px -60px 36px -60px;
                padding: 28px 40px;
                color: #ffffff;
                background: linear-gradient(135deg, rgba(235,28,45,0.18) 0%, rgba(28,29,38,0.92) 100%);
            }
            [data-theme="${theme}"] h2 {
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                color: ${colors.secondary};
                border-left: 5px solid ${colors.primary};
                padding-left: 18px;
                margin-top: 30px;
            }
            [data-theme="${theme}"] h3 {
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                color: ${colors.secondary};
            }
            [data-theme="${theme}"] p {
                font-size: 1.06em;
                line-height: 1.7;
                color: ${colors.text};
            }
            [data-theme="${theme}"] ul {
                list-style: none;
                padding-left: 0;
                margin: 24px 0;
            }
            [data-theme="${theme}"] ul li {
                position: relative;
                padding-left: 28px;
                margin-bottom: 14px;
            }
            [data-theme="${theme}"] ul li::before {
                content: '';
                position: absolute;
                left: 0;
                top: 11px;
                width: 18px;
                height: 2px;
                background: ${colors.primary};
            }
            [data-theme="${theme}"] blockquote {
                border-left: 5px solid ${colors.primary};
                background: rgba(235,28,45,0.08);
                color: ${colors.secondary};
                padding: 24px 32px;
                margin: 30px 0;
            }
            [data-theme="${theme}"] table {
                width: 100%;
                border-collapse: collapse;
                margin: 24px 0;
                font-size: 0.98em;
            }
            [data-theme="${theme}"] table th,
            [data-theme="${theme}"] table td {
                border: 1px solid rgba(28,29,38,0.18);
                padding: 12px 16px;
                text-align: left;
            }
            body:has(.slide[data-theme="${theme}"]) #progress-bar {
                background: ${colors.primary};
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top {
                backdrop-filter: blur(5px);
                box-shadow: 0 2px 12px rgba(0,0,0,0.18);
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item {
                text-transform: uppercase;
                letter-spacing: 0.06em;
                font-weight: 600;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item.active {
                background: ${colors.primary};
                color: #ffffff;
            }
            `;
        }

        // Strata Pulse: WSP-inspired bold red gradients and angled accents
        if (theme === 'strata-pulse') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Neue Haas Grotesk Display', 'Helvetica Neue', 'Montserrat', sans-serif;
                color: ${colors.text};
            }
            [data-theme="${theme}"] .slide {
                position: relative;
                overflow: hidden;
            }
            [data-theme="${theme}"] .slide::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(125deg, ${colors.primary} 0%, transparent 55%);
                opacity: 0.08;
                pointer-events: none;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3.2em;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.22em;
                color: ${colors.headerText};
                background: linear-gradient(120deg, ${colors.primary} 0%, ${colors.secondary} 85%);
                padding: 28px 42px;
                margin: -60px -60px 40px -60px;
                position: relative;
                z-index: 2;
            }
            [data-theme="${theme}"] h1::after {
                content: '';
                position: absolute;
                right: -50px;
                bottom: -18px;
                width: 140px;
                height: 140px;
                background: rgba(0,0,0,0.06);
                transform: rotate(-8deg);
                z-index: -1;
            }
            [data-theme="${theme}"] h2 {
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: ${colors.primary};
                margin-top: 36px;
            }
            [data-theme="${theme}"] h2::before {
                content: '';
                display: inline-block;
                width: 32px;
                height: 3px;
                margin-right: 12px;
                background: ${colors.primary};
                vertical-align: middle;
            }
            [data-theme="${theme}"] h3 {
                text-transform: uppercase;
                letter-spacing: 0.12em;
                color: ${colors.secondary};
            }
            [data-theme="${theme}"] ul {
                list-style: none;
                padding-left: 0;
                margin: 24px 0;
            }
            [data-theme="${theme}"] ul li {
                padding: 14px 18px 14px 44px;
                margin-bottom: 14px;
                background: rgba(214,0,28,0.08);
                border-left: 6px solid ${colors.primary};
                position: relative;
            }
            [data-theme="${theme}"] ul li::before {
                content: '';
                position: absolute;
                left: 18px;
                top: 50%;
                width: 12px;
                height: 12px;
                border-radius: 2px;
                background: ${colors.primary};
                transform: translateY(-50%) rotate(45deg);
            }
            [data-theme="${theme}"] blockquote {
                border-left: 5px solid ${colors.primary};
                background: #ffffff;
                padding: 24px 32px;
                font-size: 1.05em;
                font-style: italic;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top {
                background: ${colors.headerBg};
                color: ${colors.headerText};
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item {
                font-weight: 600;
            }
            body:has(.slide[data-theme="${theme}"]) .presentation-nav-top .nav-item.active {
                background: ${colors.primary};
                color: #ffffff;
            }
            body:has(.slide[data-theme="${theme}"]) #progress-bar {
                background: ${colors.primary};
            }
            `;
        }

        // Madrid Style: Academic, clear structure
        if (theme === 'madrid' || theme === 'madrid-green') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Calibri', 'Candara', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.4em;
                color: ${colors.headerBg};
                border-bottom: 3px solid ${colors.secondary};
                padding-bottom: 15px;
                margin-bottom: 30px;
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.footerBg};
                padding: 12px 20px;
                border-left: 6px solid ${colors.primary};
                margin-top: 25px;
            }
            [data-theme="${theme}"] ul li::before {
                content: "▸ ";
                color: ${colors.secondary};
                font-weight: bold;
                margin-right: 5px;
            }
            [data-theme="${theme}"] ul {
                list-style: none;
            }
            `;
        }
        
        // AnnArbor Style: Tree navigation, rounded corners, serif
        if (theme === 'annarbor') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Bookman', 'Georgia', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 500;
                border: 3px solid ${colors.primary};
                border-radius: 15px;
                padding: 20px 30px;
                background: linear-gradient(135deg, ${colors.headerBg}, ${colors.footerBg});
                color: ${colors.headerText};
            }
            [data-theme="${theme}"] h2, [data-theme="${theme}"] h3 {
                border-radius: 8px;
                background: ${colors.footerBg};
                padding: 10px 20px;
                margin-top: 20px;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                border-radius: 10px;
                border: 2px dashed ${colors.secondary};
                padding: 20px 40px;
            }
            `;
        }
        
        // Antibes Style: Sidebar blocks, sans-serif, colorful
        if (theme === 'antibes') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Trebuchet MS', 'Arial', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                background: ${colors.primary};
                color: white;
                padding: 30px;
                margin: -60px -60px 30px -60px;
                box-shadow: inset 0 -5px 0 ${colors.secondary};
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.secondary};
                color: white;
                padding: 15px 25px;
                display: inline-block;
                border-radius: 0 25px 25px 0;
                margin-left: -60px;
                padding-left: 80px;
            }
            [data-theme="${theme}"] blockquote {
                background: ${colors.footerBg};
                border-left: 10px solid ${colors.primary};
                padding: 20px 30px;
                font-size: 1.1em;
            }
            `;
        }
        
        // Bergen Style: Right miniframe, minimal
        if (theme === 'bergen') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Optima', 'Candara', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.4em;
                font-weight: 300;
                color: ${colors.primary};
                text-align: right;
                border-right: 8px solid ${colors.secondary};
                padding-right: 30px;
                margin-right: 0;
            }
            [data-theme="${theme}"] h2 {
                text-align: right;
                color: ${colors.secondary};
                font-weight: 600;
                border-bottom: 2px solid ${colors.footerBg};
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                border-right: 4px solid ${colors.primary};
                padding-right: 30px;
            }
            `;
        }
        
        // Boadilla Style: Bottom navigation dots, clean minimal
        if (theme === 'boadilla') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Gill Sans', 'Calibri', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 400;
                color: ${colors.primary};
                text-align: center;
                padding-bottom: 20px;
                margin-bottom: 40px;
                position: relative;
            }
            [data-theme="${theme}"] h1::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 4px;
                background: ${colors.secondary};
                border-radius: 2px;
            }
            [data-theme="${theme}"] ul li {
                margin: 15px 0;
                padding-left: 30px;
                position: relative;
            }
            [data-theme="${theme}"] ul li::before {
                content: '●';
                position: absolute;
                left: 0;
                color: ${colors.primary};
            }
            `;
        }
        
        // CambridgeUS Style: Traditional academic, tree navigation
        if (theme === 'cambridgeus') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Crimson Text', 'Garamond', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                font-weight: 700;
                color: ${colors.headerBg};
                text-align: center;
                border-top: 5px solid ${colors.primary};
                border-bottom: 5px solid ${colors.primary};
                padding: 30px 0;
                margin: 0 0 40px 0;
                text-transform: uppercase;
                letter-spacing: 3px;
            }
            [data-theme="${theme}"] h2 {
                color: ${colors.secondary};
                font-variant: small-caps;
                font-size: 1.8em;
                border-bottom: 2px solid ${colors.footerBg};
            }
            [data-theme="${theme}"] p {
                text-align: justify;
                line-height: 1.8;
            }
            `;
        }
        
        // Darmstadt Style: Top tree navigation, structured boxes
        if (theme === 'darmstadt') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Franklin Gothic', 'Arial Narrow', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.5em;
                background: ${colors.headerBg};
                color: ${colors.headerText};
                padding: 20px 30px;
                margin: -60px -60px 30px -60px;
                border-bottom: 8px solid ${colors.secondary};
                box-shadow: 0 4px 0 ${colors.primary};
            }
            [data-theme="${theme}"] h2, [data-theme="${theme}"] h3 {
                background: ${colors.footerBg};
                padding: 12px 20px;
                margin: 20px -20px;
                border-left: 5px solid ${colors.secondary};
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                background: rgba(0,0,0,0.03);
                padding: 20px 40px;
                border: 1px solid ${colors.footerBg};
            }
            `;
        }
        
        // Dresden Style: Modern clean lines
        if (theme === 'dresden') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Segoe UI', 'Helvetica Neue', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3em;
                font-weight: 200;
                color: ${colors.primary};
                border-bottom: 1px solid ${colors.secondary};
                padding-bottom: 25px;
                margin-bottom: 40px;
            }
            [data-theme="${theme}"] h2 {
                font-weight: 300;
                color: ${colors.secondary};
                font-size: 1.8em;
                margin-top: 35px;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                line-height: 2;
            }
            [data-theme="${theme}"] code, [data-theme="${theme}"] pre {
                background: ${colors.footerBg};
                border-radius: 3px;
            }
            `;
        }
        
        // Frankfurt Style: Top navigation with subsections
        if (theme === 'frankfurt') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Verdana', 'Geneva', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.4em;
                background: linear-gradient(to bottom, ${colors.headerBg}, ${colors.footerBg});
                color: ${colors.headerText};
                padding: 25px 35px;
                margin: -60px -60px 30px -60px;
                box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.secondary};
                color: white;
                padding: 10px 25px;
                margin: 25px -30px;
                padding-left: 50px;
            }
            [data-theme="${theme}"] h3 {
                color: ${colors.primary};
                border-left: 4px solid ${colors.secondary};
                padding-left: 15px;
            }
            `;
        }
        
        // Goettingen Style: Right sidebar minimal
        if (theme === 'goettingen') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Palatino Linotype', 'Book Antiqua', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.5em;
                font-weight: 400;
                text-align: right;
                color: ${colors.primary};
                padding-right: 40px;
                border-right: 3px solid ${colors.secondary};
            }
            [data-theme="${theme}"] h2, [data-theme="${theme}"] h3 {
                text-align: right;
                color: ${colors.secondary};
                padding-right: 20px;
            }
            [data-theme="${theme}"] p, [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                text-align: left;
            }
            `;
        }
        
        // Hannover Style: Left sidebar, rounded elements
        if (theme === 'hannover') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Century Gothic', 'AppleGothic', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.7em;
                background: ${colors.primary};
                color: white;
                padding: 25px 35px;
                margin: -60px -60px 30px -60px;
                border-radius: 0 0 20px 20px;
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.footerBg};
                padding: 12px 25px;
                border-radius: 15px;
                display: inline-block;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                background: linear-gradient(to right, ${colors.footerBg}, transparent);
                padding: 20px 40px;
                border-radius: 10px;
            }
            `;
        }
        
        // Ilmenau Style: Minimal modern
        if (theme === 'ilmenau') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Roboto', 'Open Sans', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                font-weight: 100;
                color: ${colors.primary};
                margin-bottom: 50px;
                padding-bottom: 15px;
                border-bottom: 1px solid ${colors.footerBg};
            }
            [data-theme="${theme}"] h2, [data-theme="${theme}"] h3 {
                font-weight: 300;
                color: ${colors.secondary};
            }
            [data-theme="${theme}"] strong {
                color: ${colors.primary};
                font-weight: 600;
            }
            `;
        }
        
        // JuanLesPins Style: Sidebar with sections, colorful
        if (theme === 'juanlespins') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Tahoma', 'Geneva', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                background: linear-gradient(45deg, ${colors.primary}, ${colors.secondary});
                color: white;
                padding: 30px;
                margin: -60px -60px 30px -60px;
                transform: skewY(-2deg);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.secondary};
                color: white;
                padding: 12px 30px;
                margin-left: -40px;
                padding-left: 60px;
                clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%);
            }
            [data-theme="${theme}"] ul {
                border-left: 5px solid ${colors.primary};
                padding-left: 30px;
            }
            `;
        }
        
        // Luebeck Style: Minimal serif, classic
        if (theme === 'luebeck') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Garamond', 'Times', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                font-weight: 400;
                color: ${colors.primary};
                text-align: center;
                margin-bottom: 50px;
                font-variant: small-caps;
            }
            [data-theme="${theme}"] h2 {
                font-size: 1.8em;
                color: ${colors.secondary};
                font-style: italic;
                border-bottom: 1px solid ${colors.footerBg};
                padding-bottom: 10px;
            }
            [data-theme="${theme}"] p {
                line-height: 1.8;
                text-align: justify;
            }
            `;
        }
        
        // Malmoe Style: Left sidebar, bold headers
        if (theme === 'malmoe') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Impact', 'Arial Black', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3em;
                font-weight: 900;
                color: ${colors.primary};
                text-transform: uppercase;
                letter-spacing: 5px;
                border-left: 15px solid ${colors.secondary};
                padding-left: 30px;
            }
            [data-theme="${theme}"] h2 {
                font-weight: 700;
                background: ${colors.footerBg};
                padding: 15px 25px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            [data-theme="${theme}"] p, [data-theme="${theme}"] li {
                font-family: 'Arial', sans-serif;
                font-weight: normal;
            }
            `;
        }
        
        // Marburg Style: Right sidebar navigation, clean
        if (theme === 'marburg') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Lucida Sans', 'Lucida Grande', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                color: ${colors.primary};
                text-align: right;
                padding-right: 50px;
                margin-right: -20px;
                border-right: 8px solid ${colors.secondary};
            }
            [data-theme="${theme}"] h2 {
                text-align: right;
                background: ${colors.footerBg};
                padding: 12px 30px;
                margin-right: -20px;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                background: rgba(0,0,0,0.02);
                padding: 20px 40px;
                border-radius: 5px;
            }
            `;
        }
        
        // Montpellier Style: Left sidebar with subsections
        if (theme === 'montpellier') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Trebuchet MS', 'Lucida Grande', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                background: ${colors.headerBg};
                color: ${colors.headerText};
                padding: 25px 40px;
                margin: -60px -60px 30px -60px;
                border-left: 12px solid ${colors.secondary};
            }
            [data-theme="${theme}"] h2 {
                background: linear-gradient(to right, ${colors.footerBg}, transparent);
                padding: 15px 30px;
                border-left: 6px solid ${colors.primary};
                margin-left: -20px;
                padding-left: 40px;
            }
            [data-theme="${theme}"] h3 {
                color: ${colors.secondary};
                border-left: 4px solid ${colors.footerBg};
                padding-left: 20px;
            }
            `;
        }
        
        // PaloAlto Style: Footer navigation, traditional
        if (theme === 'paloalto') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Charter', 'Georgia', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.5em;
                color: ${colors.primary};
                text-align: center;
                padding: 30px 0;
                margin-bottom: 40px;
                border-top: 3px solid ${colors.secondary};
                border-bottom: 3px solid ${colors.secondary};
            }
            [data-theme="${theme}"] h2 {
                color: ${colors.secondary};
                font-size: 1.8em;
                margin-top: 30px;
            }
            [data-theme="${theme}"] ul li {
                margin: 12px 0;
            }
            `;
        }
        
        // Pittsburgh Style: Clean minimal, sans-serif
        if (theme === 'pittsburgh') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Helvetica', 'Arial', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 300;
                color: ${colors.primary};
                margin-bottom: 40px;
            }
            [data-theme="${theme}"] h2 {
                font-weight: 400;
                color: ${colors.secondary};
                margin-top: 30px;
                padding-bottom: 10px;
                border-bottom: 2px solid ${colors.footerBg};
            }
            [data-theme="${theme}"] p {
                line-height: 1.6;
            }
            `;
        }
        
        // Rochester Style: Very minimal serif, elegant
        if (theme === 'rochester') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Baskerville', 'Garamond', serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 3em;
                font-weight: 400;
                color: ${colors.primary};
                text-align: center;
                margin: 60px 0;
            }
            [data-theme="${theme}"] h2 {
                font-size: 1.8em;
                font-weight: 400;
                color: ${colors.secondary};
                margin-top: 40px;
            }
            [data-theme="${theme}"] p {
                font-size: 1.1em;
                line-height: 1.8;
            }
            `;
        }
        
        // Singapore Style: Bottom navigation, modern
        if (theme === 'singapore') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Lato', 'Segoe UI', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.8em;
                font-weight: 700;
                background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 40px;
            }
            [data-theme="${theme}"] h2 {
                background: ${colors.footerBg};
                padding: 15px 25px;
                border-radius: 8px;
                color: ${colors.headerBg};
            }
            [data-theme="${theme}"] code {
                background: ${colors.footerBg};
                padding: 3px 8px;
                border-radius: 4px;
            }
            `;
        }
        
        // Szeged Style: Footer minimal, clean
        if (theme === 'szeged') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Noto Sans', 'Arial', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.5em;
                font-weight: 400;
                color: ${colors.primary};
                padding-bottom: 20px;
                margin-bottom: 35px;
                border-bottom: 2px solid ${colors.secondary};
            }
            [data-theme="${theme}"] h2, [data-theme="${theme}"] h3 {
                color: ${colors.secondary};
                font-weight: 500;
            }
            [data-theme="${theme}"] ul, [data-theme="${theme}"] ol {
                line-height: 1.8;
            }
            `;
        }
        
        // Simple-light Style: Minimal variant, light
        if (theme === 'simple-light') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Source Sans Pro', 'Helvetica', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 300;
                color: ${colors.primary};
                margin-bottom: 40px;
            }
            [data-theme="${theme}"] h2 {
                font-weight: 400;
                color: ${colors.secondary};
                margin-top: 25px;
            }
            [data-theme="${theme}"] p {
                line-height: 1.7;
                font-size: 1.05em;
            }
            `;
        }
        
        // Simple-dark Style: Dark minimal
        if (theme === 'simple-dark') {
            return `
            [data-theme="${theme}"] {
                font-family: 'Source Sans Pro', 'Helvetica', sans-serif;
            }
            [data-theme="${theme}"] h1 {
                font-size: 2.6em;
                font-weight: 300;
                color: ${colors.primary};
                margin-bottom: 40px;
                text-shadow: 0 0 20px rgba(255,255,255,0.1);
            }
            [data-theme="${theme}"] h2 {
                font-weight: 400;
                color: ${colors.secondary};
                margin-top: 25px;
            }
            [data-theme="${theme}"] code, [data-theme="${theme}"] pre {
                background: rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.1);
            }
            `;
        }
        
        // Default minimal style for other themes (fallback)
        return `
        [data-theme="${theme}"] {
            font-family: 'Segoe UI', 'Roboto', sans-serif;
        }
        `;
    }

    getThemePalette(theme) {
        const palette = this.getBuiltInThemePalette();
        if (this.customThemes && this.customThemes[theme]) {
            const custom = this.customThemes[theme];
            const baseTheme = custom.baseTheme || 'berkeley';
            const basePalette = this.getThemePalette(baseTheme);
            return {
                ...basePalette,
                ...(custom.colors || {})
            };
        }

        const builtIn = palette[theme] || palette.berkeley;
        if (!builtIn) {
            return {};
        }

        const {
            primary,
            secondary,
            background,
            text,
            headerBg,
            headerText,
            footerBg,
            footerText
        } = builtIn;

        return {
            primary,
            secondary,
            background,
            text,
            headerBg,
            headerText,
            footerBg,
            footerText
        };
    }

    isKnownTheme(theme) {
        if (!theme) {
            return false;
        }
        return this.availableThemes.includes(theme) || (this.customThemes && !!this.customThemes[theme]);
    }

    getBuiltInThemeIds() {
        return [...this.availableThemes];
    }

    getAllThemeIds() {
        return [...this.availableThemes, ...Object.keys(this.customThemes || {})];
    }

    getCustomThemes() {
        return Object.values(this.customThemes || {}).map(theme => ({ ...theme }));
    }

    getThemeLabel(theme) {
        if (!theme) {
            return '';
        }

        if (this.customThemes && this.customThemes[theme]) {
            return this.customThemes[theme].label || this.formatThemeLabel(theme);
        }

        if (this.themeDisplayNames && this.themeDisplayNames[theme]) {
            return this.themeDisplayNames[theme];
        }

        return this.formatThemeLabel(theme);
    }

    formatThemeLabel(theme) {
        return theme
            .split('-')
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    normalizeThemeId(name) {
        if (!name) {
            return null;
        }

        const base = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');

        if (!base) {
            return null;
        }

        let candidate = `custom-${base}`;
        let suffix = 1;
        while (this.isKnownTheme(candidate)) {
            candidate = `custom-${base}-${suffix}`;
            suffix += 1;
        }
        return candidate;
    }

    loadCustomThemes() {
        this.customThemes = {};

        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            const raw = localStorage.getItem(this.customThemeStorageKey);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            const themeArray = Array.isArray(parsed) ? parsed : [];

            themeArray.forEach(theme => {
                if (!theme || typeof theme !== 'object') {
                    return;
                }
                const { id, label, baseTheme, colors, navigation } = theme;
                if (!id || !baseTheme) {
                    return;
                }
                this.customThemes[id] = {
                    id,
                    label: label || this.formatThemeLabel(id),
                    baseTheme: this.availableThemes.includes(baseTheme) ? baseTheme : 'berkeley',
                    colors: colors || {},
                    navigation: navigation || (this.getThemeConfig(baseTheme) || {}).navigation || 'none'
                };
            });
        } catch (error) {
            console.warn('[Presentation] Failed to load custom themes:', error);
            this.customThemes = {};
        }
    }

    saveCustomThemes() {
        if (typeof localStorage === 'undefined') {
            return;
        }

        try {
            const themesToPersist = Object.values(this.customThemes || {}).map(theme => ({
                id: theme.id,
                label: theme.label,
                baseTheme: theme.baseTheme,
                colors: theme.colors,
                navigation: theme.navigation
            }));

            const sorted = themesToPersist.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
            localStorage.setItem(this.customThemeStorageKey, JSON.stringify(sorted));
        } catch (error) {
            console.warn('[Presentation] Failed to save custom themes:', error);
        }
    }

    createCustomTheme({ name, baseTheme, colors }) {
        if (!name) {
            throw new Error('Theme name is required');
        }

        const sanitizedBase = this.availableThemes.includes(baseTheme) ? baseTheme : 'berkeley';
        const themeId = this.normalizeThemeId(name);

        if (!themeId) {
            throw new Error('Could not derive a valid theme identifier');
        }

        const sanitizedColors = {};
        const colorKeys = ['primary', 'secondary', 'background', 'text', 'headerBg', 'headerText', 'footerBg', 'footerText'];

        colorKeys.forEach(key => {
            const value = colors && typeof colors[key] === 'string' ? colors[key].trim() : '';
            if (value) {
                sanitizedColors[key] = value;
            }
        });

        const storedTheme = {
            id: themeId,
            label: name.trim(),
            baseTheme: sanitizedBase,
            colors: sanitizedColors,
            navigation: (this.getThemeConfig(sanitizedBase) || {}).navigation || 'none'
        };

        this.customThemes[themeId] = storedTheme;
        this.saveCustomThemes();
        return themeId;
    }

    deleteCustomTheme(themeId) {
        if (!this.customThemes || !this.customThemes[themeId]) {
            return false;
        }

        delete this.customThemes[themeId];
        this.saveCustomThemes();
        return true;
    }

    /**
     * Get navigation JavaScript
     */
    getNavigationJS() {
        return `
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        const body = document.body;

        if (typeof window !== 'undefined') {
            window.presentationRenderStatus = 'loading';
        }

        let renderCompletionSignaled = false;
        function markPresentationRenderComplete() {
            if (renderCompletionSignaled) {
                return;
            }
            renderCompletionSignaled = true;

            if (document && document.body && !document.body.classList.contains('rendering-complete')) {
                document.body.classList.add('rendering-complete');
            }

            if (typeof window !== 'undefined') {
                window.presentationRenderStatus = 'complete';
                if (typeof window.dispatchEvent === 'function') {
                    try {
                        window.dispatchEvent(new Event('presentation-render-complete'));
                    } catch (err) {
                        if (typeof document !== 'undefined' && document.createEvent) {
                            const legacyEvent = document.createEvent('Event');
                            legacyEvent.initEvent('presentation-render-complete', true, true);
                            window.dispatchEvent(legacyEvent);
                        }
                    }
                }
            }
        }

        function applyNavigationLayoutClasses() {
            const navLeft = document.querySelector('.presentation-nav-left');
            const navTop = document.querySelector('.presentation-nav-top');
            const header = document.querySelector('.presentation-header');
            const footer = document.querySelector('.presentation-footer');

            body.classList.toggle('has-nav-left', !!navLeft);
            body.classList.toggle('has-nav-top', !!navTop);

            const leftWidth = navLeft ? navLeft.offsetWidth : 0;
            const topHeight = navTop ? navTop.offsetHeight : 0;
            const headerHeight = header ? header.offsetHeight : 0;
            const footerHeight = footer ? footer.offsetHeight : 0;

            body.style.setProperty('--presentation-left-offset', leftWidth + 'px');
            body.style.setProperty('--presentation-top-offset', topHeight + 'px');
            body.style.setProperty('--presentation-header-height', headerHeight + 'px');
            body.style.setProperty('--presentation-footer-height', footerHeight + 'px');

            const safeTopMargin = Math.max(headerHeight + topHeight + 80, 120);
            const safeBottomMargin = Math.max(footerHeight + 80, 120);
            body.style.setProperty('--print-safe-top', safeTopMargin + 'px');
            body.style.setProperty('--print-safe-bottom', safeBottomMargin + 'px');

            updateProgress();
        }

        function scaleSlidesForPrint() {
            const slides = document.querySelectorAll('.slide');
            if (!slides.length) {
                return;
            }

            if (body && body.classList && body.classList.contains('pdf-export')) {
                slides.forEach((slide) => {
                    slide.classList.remove('print-scaled');
                    slide.style.removeProperty('transform');
                    slide.style.removeProperty('transform-origin');
                    slide.style.removeProperty('--print-scale');
                    slide.style.removeProperty('max-height');
                });
                return;
            }
            const computedStyles = getComputedStyle(body);
            const headerHeight = parseFloat(computedStyles.getPropertyValue('--presentation-header-height')) || 0;
            const footerHeight = parseFloat(computedStyles.getPropertyValue('--presentation-footer-height')) || 0;
            const topOffset = parseFloat(computedStyles.getPropertyValue('--presentation-top-offset')) || 0;
            const safeTopMargin = parseFloat(computedStyles.getPropertyValue('--print-safe-top')) || Math.max(headerHeight + topOffset + 80, 120);
            const safeBottomMargin = parseFloat(computedStyles.getPropertyValue('--print-safe-bottom')) || Math.max(footerHeight + 80, 120);
            const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement ? document.documentElement.clientHeight || 0 : 0);
            const availableHeight = Math.max(viewportHeight - safeTopMargin - safeBottomMargin, 320);

            slides.forEach((slide) => {
                slide.classList.remove('print-scaled');
                slide.style.removeProperty('transform');
                slide.style.removeProperty('transform-origin');
                slide.style.removeProperty('--print-scale');
                slide.style.removeProperty('max-height');

                if (!availableHeight) {
                    return;
                }

                // Wait a tick for layout to settle
                requestAnimationFrame(() => {
                    const naturalHeight = slide.scrollHeight;
                    if (naturalHeight > availableHeight) {
                        const scale = Math.min(0.95, Math.max(0.5, availableHeight / naturalHeight));
                        slide.classList.add('print-scaled');
                        slide.style.setProperty('--print-scale', scale);
                        slide.style.transform = 'scale(' + scale + ')';
                        slide.style.transformOrigin = 'top center';
                        slide.style.maxHeight = Math.ceil(availableHeight) + 'px';
                    }
                });
            });
        }

        applyNavigationLayoutClasses();
        window.addEventListener('resize', applyNavigationLayoutClasses);
        window.addEventListener('resize', () => {
            if (document && document.body && document.body.classList.contains('print-layout')) {
                scaleSlidesForPrint();
            }
        });

        function enablePresentationPrintLayout() {
            if (document && document.body) {
                document.body.classList.add('print-layout');
                if (body && body.classList && body.classList.contains('pdf-export')) {
                    let pdfPageStyle = document.getElementById('pdf-page-size-style');
                    if (!pdfPageStyle) {
                        pdfPageStyle = document.createElement('style');
                        pdfPageStyle.id = 'pdf-page-size-style';
                        pdfPageStyle.textContent = '@page { size: 1920px 1080px; margin: 0; }';
                        document.head.appendChild(pdfPageStyle);
                    }
                }
                requestAnimationFrame(() => {
                    if (typeof applyNavigationLayoutClasses === 'function') {
                        applyNavigationLayoutClasses();
                    }
                    scaleSlidesForPrint();
                });
            }
        }

        function disablePresentationPrintLayout() {
            if (document && document.body) {
                document.body.classList.remove('print-layout');
                const slides = document.querySelectorAll('.slide');
                slides.forEach((slide) => {
                    slide.classList.remove('print-scaled');
                    slide.style.removeProperty('zoom');
                    slide.style.removeProperty('transform');
                    slide.style.removeProperty('transform-origin');
                    slide.style.removeProperty('--print-scale');
                    slide.style.removeProperty('max-height');
                });
                requestAnimationFrame(() => {
                    if (typeof applyNavigationLayoutClasses === 'function') {
                        applyNavigationLayoutClasses();
                    }
                });
                if (!(body && body.classList && body.classList.contains('pdf-export'))) {
                    const pdfPageStyle = document.getElementById('pdf-page-size-style');
                    if (pdfPageStyle && pdfPageStyle.parentNode) {
                        pdfPageStyle.parentNode.removeChild(pdfPageStyle);
                    }
                }
            }
        }

        window.enablePresentationPrintLayout = enablePresentationPrintLayout;
        window.disablePresentationPrintLayout = disablePresentationPrintLayout;

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeprint', enablePresentationPrintLayout);
            window.addEventListener('afterprint', disablePresentationPrintLayout);

            if (typeof window.matchMedia === 'function') {
                const printMedia = window.matchMedia('print');
                if (printMedia) {
                    const listener = (event) => {
                        if (event.matches) {
                            enablePresentationPrintLayout();
                        } else {
                            disablePresentationPrintLayout();
                        }
                    };
                    if (typeof printMedia.addEventListener === 'function') {
                        printMedia.addEventListener('change', listener);
                    } else if (typeof printMedia.addListener === 'function') {
                        printMedia.addListener(listener);
                    }
                }
            }
        }
        
        function showSlide(index) {
            if (index < 0) index = 0;
            if (index >= totalSlides) index = totalSlides - 1;
            
            slides.forEach(slide => slide.classList.remove('active'));
            slides[index].classList.add('active');
            
            currentSlide = index;
            updateProgress();
            updateCounter();
        }
        
        // Expose navigation functions on window for transition hooks
        window.nextSlide = function nextSlide() {
            if (currentSlide < totalSlides - 1) {
                showSlide(currentSlide + 1);
            }
        };
        
        window.prevSlide = function prevSlide() {
            if (currentSlide > 0) {
                showSlide(currentSlide - 1);
            }
        };
        
        function updateProgress() {
            const progressBar = document.getElementById('progress-bar');
            if (!progressBar) return;
            const progressRatio = totalSlides > 0 ? ((currentSlide + 1) / totalSlides) : 0;
            const computedStyles = getComputedStyle(body);
            const leftOffset = parseFloat(computedStyles.getPropertyValue('--presentation-left-offset')) || 0;
            const availableWidth = Math.max(window.innerWidth - leftOffset, 0);
            progressBar.style.width = (availableWidth * progressRatio) + 'px';
        }
        
        function updateCounter() {
            document.getElementById('current-slide').textContent = currentSlide + 1;
        }
        
        // Update navigation active state
        function updateNavigation() {
            const navItems = document.querySelectorAll('.nav-item');
            if (navItems.length === 0) return;
            
            // Find which navigation item corresponds to current slide
            let activeNavIndex = -1;
            navItems.forEach((item, index) => {
                const slideIndex = parseInt(item.getAttribute('data-slide'));
                if (slideIndex <= currentSlide) {
                    activeNavIndex = index;
                }
                item.classList.remove('active');
            });
            
            // Highlight the appropriate nav item
            if (activeNavIndex >= 0 && activeNavIndex < navItems.length) {
                navItems[activeNavIndex].classList.add('active');
            }
        }
        
        // Override showSlide to update navigation
        const navigationWrappedShowSlide = showSlide;
        showSlide = function(index) {
            navigationWrappedShowSlide(index);
            updateNavigation();
        };
        
        // Navigation item click handlers
        document.addEventListener('DOMContentLoaded', () => {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent slide navigation click
                    const slideIndex = parseInt(item.getAttribute('data-slide'));
                    if (!isNaN(slideIndex)) {
                        showSlide(slideIndex);
                    }
                });
            });
            
            const navContainers = document.querySelectorAll('.presentation-nav');
            navContainers.forEach(container => {
                container.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });
            
            // Initialize navigation state
            updateNavigation();
            requestAnimationFrame(applyNavigationLayoutClasses);
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    window.nextSlide();
                    break;
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    window.prevSlide();
                    break;
                case 'Home':
                    e.preventDefault();
                    showSlide(0);
                    break;
                case 'End':
                    e.preventDefault();
                    showSlide(totalSlides - 1);
                    break;
            }
        });
        
        // Click navigation (only on slides, not on navigation panels)
        document.addEventListener('click', (e) => {
            // Ignore clicks on navigation panels
            if (e.target.closest('.presentation-nav')) {
                return;
            }
            
            const clickX = e.clientX;
            const windowWidth = window.innerWidth;
            
            if (clickX < windowWidth / 2) {
                window.prevSlide();
            } else {
                window.nextSlide();
            }
        });
        
        // Touch/swipe navigation
        let touchStartX = 0;
        let touchEndX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
        
        function handleSwipe() {
            if (touchEndX < touchStartX - 50) window.nextSlide();
            if (touchEndX > touchStartX + 50) window.prevSlide();
        }
        
        // Initialize
        updateProgress();
        updateCounter();
        `;
    }

    /**
     * Escape HTML entities
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Export presentation as standalone HTML file
     */
    async exportHTML(options = {}) {
        // Always use current theme if not specified in options
        if (!options.theme) {
            options.theme = this.currentTheme;
        }
        
        let html = await this.generateHTML(options);
        
        // Sanitize HTML to replace currentColor with explicit black color for visibility
        html = this._sanitizeExportHtmlString(html);
        
        // Use Electron dialog to save file
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-presentation-html', {
                html: html,
                title: this.metadata.title || 'Presentation'
            });
            return result;
        }
        
        return { success: false, error: 'Electron IPC not available' };
    }
    
    /**
     * Sanitize exported HTML string to replace currentColor with explicit colors
     * This ensures MathJax SVG is visible in exported HTML
     */
    _sanitizeExportHtmlString(html) {
        if (!html || typeof html !== 'string') return html;
        try {
            // Replace currentColor with black for visibility
            html = html.replace(/(fill=\")[\s]*currentColor(\")/gi, 'fill="#000"');
            html = html.replace(/(fill=\')\s*currentColor(\')/gi, "fill='#000'");
            html = html.replace(/(stroke=\")[\s]*currentColor(\")/gi, 'stroke="#000"');
            html = html.replace(/(stroke=\')\s*currentColor(\')/gi, "stroke='#000'");
            html = html.replace(/fill=\s*currentColor/gi, 'fill="#000"');
            html = html.replace(/stroke=\s*currentColor/gi, 'stroke="#000"');
            html = html.replace(/currentColor/gi, '#000');
            return html;
        } catch (e) {
            console.warn('[Presentation] _sanitizeExportHtmlString failed:', e);
            return html;
        }
    }

    /**
     * Embed MathJax's global <defs> cache near the top of the body so SVG <use> references resolve.
     * @param {string} html - Full HTML document markup.
     * @returns {string} HTML with hidden SVG defs injected.
     */
    _injectGlobalMathJaxDefs(html) {
        if (!html || typeof html !== 'string' || html.indexOf('<mjx-container') === -1) {
            return html;
        }

        if (html.indexOf('id="MJX-EXPORTED-GLOBAL-DEFS"') !== -1) {
            return html;
        }

        const defsMarkup = this._getMathJaxDefsMarkup();
        if (!defsMarkup) {
            return html;
        }

        const hiddenSvg = `\n<svg id="MJX-EXPORTED-GLOBAL-DEFS" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;" aria-hidden="true">${defsMarkup}</svg>`;

        if (/<body[^>]*>/i.test(html)) {
            return html.replace(/<body([^>]*)>/i, `<body$1>${hiddenSvg}`);
        }

        return hiddenSvg + html;
    }

    /**
     * Retrieve MathJax's global defs markup, sanitizing namespace prefixes for standalone SVG use.
     * @returns {string} A <defs>...</defs> string or empty when unavailable.
     */
    _getMathJaxDefsMarkup() {
        try {
            if (typeof window === 'undefined') {
                return '';
            }

            const mj = window.MathJax;
            if (!mj || !mj.startup) {
                return '';
            }

            const adaptor = mj.startup.adaptor;
            const outputJax = mj.startup.document && mj.startup.document.outputJax;

            let raw = '';

            if (outputJax && outputJax.defs) {
                if (adaptor && typeof adaptor.outerHTML === 'function') {
                    raw = adaptor.outerHTML(outputJax.defs);
                } else if (typeof outputJax.defs.outerHTML === 'string') {
                    raw = outputJax.defs.outerHTML;
                } else if (adaptor && typeof adaptor.innerHTML === 'function') {
                    raw = `<defs>${adaptor.innerHTML(outputJax.defs)}</defs>`;
                }
            }

            if (!raw) {
                const candidates = [
                    document.getElementById('MJX-SVG-global-defs'),
                    document.querySelector('mjx-container svg defs'),
                    document.querySelector('svg defs')
                ];
                for (const node of candidates) {
                    if (node && typeof node.outerHTML === 'string') {
                        raw = node.outerHTML;
                        break;
                    }
                }
            }

            if (!raw) {
                return '';
            }

            // Extract only the <defs>...</defs> portion if an outer wrapper is present
            const defsMatch = raw.match(/<defs[\s\S]*?<\/defs>/i);
            let working = defsMatch ? defsMatch[0] : raw;

            working = working.replace(/xmlns:mjx="[^"]*"/gi, '');
            working = working.replace(/mjx:/gi, '');
            working = working.replace(/<defs([^>]*)>/i, (match, attrs) => `<defs${attrs || ''}>`);

            return working.trim();
        } catch (error) {
            console.warn('[Presentation] _getMathJaxDefsMarkup failed:', error);
            return '';
        }
    }


    /**
     * Export presentation as PDF
     */
    async exportPDF(options = {}) {
        // Always use current theme if not specified in options
        if (!options.theme) {
            options.theme = this.currentTheme;
        }
        
        // Generate HTML first
        const html = await this.generateHTML(options);
        
        // Use Electron IPC to convert to PDF
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('export-presentation-pdf', {
                html: html,
                title: this.metadata.title || 'Presentation',
                slideCount: this.slides.length
            });
            return result;
        }
        
        return { success: false, error: 'Electron IPC not available' };
    }

    /**
     * Preview presentation in separate window
     */
    async previewPresentation() {
        // Always use current theme for preview
        const html = await this.generateHTML({ theme: this.currentTheme });
        
        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('preview-presentation', {
                html: html
            });
            return result;
        }
        
        return { success: false, error: 'Electron IPC not available' };
    }

    /**
     * Set current theme
     */
    setTheme(theme) {
        if (this.isKnownTheme(theme)) {
            this.currentTheme = theme;
            return true;
        }
        return false;
    }

    /**
     * Get available themes
     */
    getThemes() {
        const builtIn = this.availableThemes.map(theme => ({
            id: theme,
            name: this.getThemeLabel(theme)
        }));

        const customThemes = Object.values(this.customThemes || {}).map(theme => ({
            id: theme.id,
            name: theme.label || this.getThemeLabel(theme.id)
        }));

        const sortedCustom = customThemes.sort((a, b) => a.name.localeCompare(b.name));
        return [...builtIn, ...sortedCustom];
    }
}

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PresentationManager;
}
