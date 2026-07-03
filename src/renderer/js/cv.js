/**
 * MarkDD CV Module
 * Converts markdown to professional CVs with LaTeX/Overleaf-style themes
 * Supports 10 built-in themes, page breaks, vspace, and custom color accents
 */

class CVManager {
    constructor() {
        this.currentCV = null;
        this.currentTheme = 'classic-latex'; // Default theme
        this.currentPaperSize = 'a4'; // Default size
        
        // 15 built-in templates resembling Overleaf CV styles
        this.availableThemes = [
            'classic-latex',
            'academic',
            'modern-sidebar',
            'minimalist',
            'decent',
            'awesome-cv',
            'friggeri',
            'moderncv-classic',
            'moderncv-casual',
            'executive',
            'forty-seconds',
            'twenty-seconds',
            'hipster',
            'sixty-seconds',
            'entry-level'
        ];
        
        this.themeDisplayNames = {
            'classic-latex': 'Classic LaTeX (Serif)',
            'academic': 'Academic (Sans-Serif)',
            'modern-sidebar': 'Modern Sidebar (Two-Column)',
            'minimalist': 'Minimalist (Left-Aligned Columns)',
            'decent': 'Decent (Colored Header Bars)',
            'awesome-cv': 'Awesome CV (Overleaf Style)',
            'friggeri': 'Friggeri (Modern Left-Margin)',
            'moderncv-classic': 'ModernCV Classic',
            'moderncv-casual': 'ModernCV Casual',
            'executive': 'Executive (Formal Navy/Serif)',
            'forty-seconds': 'Forty Seconds CV',
            'twenty-seconds': 'Twenty Seconds CV',
            'hipster': 'Simple Hipster CV',
            'sixty-seconds': 'Sixty Seconds CV',
            'entry-level': 'Entry Level Resume'
        };
        
        this.metadata = {};
        this.contentHtml = '';
    }

    /**
     * Parse markdown content into CV fields and body
     */
    parseMarkdown(markdown) {
        const parts = markdown.split(/^---$/gm);
        let frontMatter = {};
        let cvContent = markdown;

        if (markdown.trim().startsWith('---') && parts.length > 2) {
            const frontMatterText = parts[1];
            frontMatter = this.parseFrontMatter(frontMatterText);
            // Rejoin remaining parts as body
            cvContent = parts.slice(2).join('---');
        }

        this.metadata = frontMatter;
        if (frontMatter.theme && this.availableThemes.includes(frontMatter.theme)) {
            this.currentTheme = frontMatter.theme;
        }
        if (frontMatter.paperSize) {
            this.currentPaperSize = frontMatter.paperSize.toLowerCase();
        }

        return {
            metadata: frontMatter,
            content: cvContent.trim(),
            theme: this.currentTheme,
            paperSize: this.currentPaperSize
        };
    }

    /**
     * Parse YAML front-matter line-by-line
     */
    parseFrontMatter(text) {
        const metadata = {};
        const lines = text.split('\n');
        let inColorsBlock = false;
        const colors = {};

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Check for colors block
            if (trimmed === 'colors:') {
                inColorsBlock = true;
                continue;
            }

            // Parse color properties
            if (inColorsBlock) {
                const colorMatch = line.match(/^\s{2,}(\w+):\s*["']?([#\w]+)["']?$/);
                if (colorMatch) {
                    const [, colorKey, colorValue] = colorMatch;
                    colors[colorKey] = colorValue.trim();
                    continue;
                } else if (line.match(/^\w+:/)) {
                    inColorsBlock = false; // Exit colors block on new property
                }
            }

            const match = line.match(/^(\w+):\s*(.+)$/);
            if (match) {
                const [, key, value] = match;
                if (key !== 'colors') {
                    metadata[key] = value.trim().replace(/^["']|["']$/g, '');
                }
            }
        }

        if (Object.keys(colors).length > 0) {
            metadata.colors = colors;
        }

        return metadata;
    }

    /**
     * Post-process rendered HTML to structure headings, skills, page breaks, etc.
     */
    postProcessHTML(rawHtml, theme) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        // 1. Process LaTeX helpers
        let htmlStr = tempDiv.innerHTML;
        // Replace \newpage or <!-- newpage --> or <!-- pagebreak -->
        htmlStr = htmlStr.replace(/\\newpage|<!--\s*newpage\s*-->|<!--\s*pagebreak\s*-->/gi, '<div class="cv-pagebreak"></div>');
        // Replace \vspace{10px} or <!-- vspace: 10px -->
        htmlStr = htmlStr.replace(/\\vspace\{([^}]+)\}|<!--\s*vspace:\s*([^>]+)\s*-->/gi, (match, p1, p2) => {
            const height = p1 || p2 || '10px';
            return `<div style="height: ${height};"></div>`;
        });
        tempDiv.innerHTML = htmlStr;

        // 2. Process Entry Headers containing '|' (e.g. ### Title | Org | Loc | Date)
        const headings = tempDiv.querySelectorAll('h3');
        headings.forEach(heading => {
            const text = heading.textContent;
            if (text.includes('|')) {
                const parts = text.split('|').map(p => p.trim());
                let entryHtml = '';

                if (parts.length === 2) {
                    entryHtml = `
                        <div class="cv-entry">
                            <div class="cv-entry-header">
                                <span class="cv-entry-title">${parts[0]}</span>
                                <span class="cv-entry-date">${parts[1]}</span>
                            </div>
                        </div>`;
                } else if (parts.length === 3) {
                    entryHtml = `
                        <div class="cv-entry">
                            <div class="cv-entry-header">
                                <span class="cv-entry-title">${parts[0]}</span>
                                <span class="cv-entry-date">${parts[2]}</span>
                            </div>
                            <div class="cv-entry-sub">
                                <span class="cv-entry-org">${parts[1]}</span>
                            </div>
                        </div>`;
                } else if (parts.length >= 4) {
                    entryHtml = `
                        <div class="cv-entry">
                            <div class="cv-entry-header">
                                <span class="cv-entry-title">${parts[0]}</span>
                                <span class="cv-entry-date">${parts[3]}</span>
                            </div>
                            <div class="cv-entry-sub">
                                <span class="cv-entry-org">${parts[1]}</span>
                                <span class="cv-entry-loc">${parts[2]}</span>
                            </div>
                        </div>`;
                }

                if (entryHtml) {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = entryHtml;
                    heading.parentNode.replaceChild(wrapper.firstElementChild, heading);
                }
            }
        });

        // 3. Process Skills Lists (turn lists under section title containing 'Skill' into tags or progress bars)
        let currentSectionTitle = '';
        const children = Array.from(tempDiv.children);

        children.forEach(child => {
            if (child.tagName === 'H2' || child.tagName === 'H1') {
                currentSectionTitle = child.textContent.toLowerCase();
            } else if (child.tagName === 'UL' && currentSectionTitle.includes('skill')) {
                child.classList.add('cv-skills-list');
                const items = child.querySelectorAll('li');
                items.forEach(item => {
                    const text = item.textContent;
                    if (text.includes('|')) {
                        const parts = text.split('|').map(p => p.trim());
                        if (parts.length >= 2) {
                            const name = parts[0];
                            const ratingStr = parts[1];
                            let percent = 0;
                            
                            if (ratingStr.endsWith('%')) {
                                percent = parseInt(ratingStr, 10);
                            } else if (ratingStr.includes('/')) {
                                const frac = ratingStr.split('/');
                                const val = parseFloat(frac[0]);
                                const max = parseFloat(frac[1]);
                                if (!isNaN(val) && !isNaN(max) && max > 0) {
                                    percent = Math.round((val / max) * 100);
                                }
                            } else {
                                const val = parseFloat(ratingStr);
                                if (!isNaN(val)) {
                                    if (val <= 5) percent = val * 20;
                                    else if (val <= 10) percent = val * 10;
                                }
                            }
                            
                            if (percent > 0 && percent <= 100) {
                                item.classList.add('cv-skill-progress-item');
                                item.innerHTML = `
                                    <div class="cv-skill-progress-wrapper">
                                        <span class="cv-skill-name">${name}</span>
                                        <div class="cv-skill-progress-bar-bg">
                                            <div class="cv-skill-progress-bar-fill" style="width: ${percent}%;"></div>
                                        </div>
                                    </div>`;
                                return;
                            }
                        }
                    }

                    item.classList.add('cv-skill-item');
                    const strong = item.querySelector('strong');
                    if (strong) {
                        strong.classList.add('cv-skill-label');
                    }
                });
            }
        });

        return tempDiv.innerHTML;
    }

    /**
     * Get theme color config
     */
    getThemeColors(theme) {
        const defaultPalettes = {
            'classic-latex': { primary: '#000000', secondary: '#555555', text: '#111111', background: '#ffffff', sidebarBg: '#f5f5f5' },
            'academic': { primary: '#1e3a8a', secondary: '#475569', text: '#1f2937', background: '#ffffff' },
            'modern-sidebar': { primary: '#2d3748', secondary: '#718096', text: '#2d3748', background: '#ffffff', sidebarBg: '#2d3748', sidebarText: '#ffffff' },
            'minimalist': { primary: '#2c3e50', secondary: '#7f8c8d', text: '#34495e', background: '#ffffff' },
            'decent': { primary: '#16a085', secondary: '#2c3e50', text: '#2c3e50', background: '#ffffff' },
            'awesome-cv': { primary: '#dc2626', secondary: '#4b5563', text: '#1f2937', background: '#ffffff' },
            'friggeri': { primary: '#2980b9', secondary: '#7f8c8d', text: '#2c3e50', background: '#ffffff' },
            'moderncv-classic': { primary: '#3498db', secondary: '#7f8c8d', text: '#2c3e50', background: '#ffffff' },
            'moderncv-casual': { primary: '#e67e22', secondary: '#7f8c8d', text: '#2c3e50', background: '#ffffff' },
            'executive': { primary: '#1b365d', secondary: '#5c768d', text: '#222222', background: '#ffffff' },
            'forty-seconds': { primary: '#2b3e50', secondary: '#7f8c8d', text: '#2c3e50', background: '#ffffff', sidebarBg: '#f0f2f5', sidebarText: '#2c3e50' },
            'twenty-seconds': { primary: '#24c0d8', secondary: '#95a5a6', text: '#3d3d3d', background: '#ffffff', sidebarBg: '#3d3d3d', sidebarText: '#ffffff' },
            'hipster': { primary: '#e05a47', secondary: '#7f8c8d', text: '#333333', background: '#ffffff', sidebarBg: '#f9f9f9', sidebarText: '#333333' },
            'sixty-seconds': { primary: '#1f4e5b', secondary: '#7f8c8d', text: '#2c3e50', background: '#ffffff', sidebarBg: '#e6ebed', sidebarText: '#1f4e5b' },
            'entry-level': { primary: '#0f172a', secondary: '#475569', text: '#334155', background: '#ffffff' }
        };

        const base = defaultPalettes[theme] || defaultPalettes['classic-latex'];
        const custom = this.metadata.colors || {};

        return { ...base, ...custom };
    }

    /**
     * Compile CSS rules based on selected theme and custom colors
     */
    getThemeCSS(theme, colors) {
        const photoShape = (this.metadata.photoShape || 'round').toLowerCase();
        let photoRadius = '50%';
        let sidebarPhotoWidth = '110px';
        let sidebarPhotoHeight = '110px';
        let headerPhotoWidth = '100px';
        let headerPhotoHeight = '100px';
        let casualPhotoWidth = '110px';
        let casualPhotoHeight = '110px';

        if (photoShape === 'square') {
            photoRadius = '6px';
        } else if (photoShape === 'rectangle' || photoShape === 'rect') {
            photoRadius = '6px';
            sidebarPhotoWidth = '95px';
            sidebarPhotoHeight = '125px';
            headerPhotoWidth = '90px';
            headerPhotoHeight = '120px';
            casualPhotoWidth = '95px';
            casualPhotoHeight = '125px';
        }

        // Base global styles for A4/Letter CV
        let css = `
        :root {
            --cv-primary: ${colors.primary};
            --cv-secondary: ${colors.secondary};
            --cv-text: ${colors.text};
            --cv-bg: ${colors.background};
            --cv-sidebar-bg: ${colors.sidebarBg || '#f3f4f6'};
            --cv-sidebar-text: ${colors.sidebarText || '#1f2937'};
            --cv-header-bg: ${colors.headerBg || '#f8fafc'};
            --cv-header-text: ${colors.headerText || colors.text};
        }
        
        /* Contact info styling */
        .cv-contact-info {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 9.5pt;
        }

        .cv-contact-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        .cv-contact-icon {
            color: var(--cv-primary);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 14px;
            text-align: center;
        }

        .cv-contact-value {
            color: inherit;
        }

        /* Skills progress bars */
        .cv-skill-progress-item {
            list-style: none !important;
            margin-bottom: 10px !important;
            padding: 0 !important;
            width: 100%;
        }

        .cv-skill-progress-wrapper {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .cv-skill-name {
            font-size: 9.5pt;
            font-weight: 600;
            color: inherit;
        }

        .cv-skill-progress-bar-bg {
            width: 100%;
            height: 6px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        .cv-skill-progress-bar-fill {
            height: 100%;
            background: var(--cv-primary);
            border-radius: 3px;
            transition: width 0.8s ease-in-out;
        }
        
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            background: #e5e7eb;
            font-size: 10.5pt;
            line-height: 1.5;
            color: var(--cv-text);
        }

        .cv-page {
            background: var(--cv-bg);
            margin: 20px auto;
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
        }

        /* Standardized Paper Sizes */
        .cv-page.size-a4 {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
        }
        
        .cv-page.size-letter {
            width: 8.5in;
            min-height: 11in;
            padding: 0.8in;
        }

        /* Typography & Headings */
        h1, h2, h3, h4 {
            margin-top: 0;
            color: var(--cv-primary);
        }

        a {
            color: var(--cv-primary);
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        p {
            margin: 0 0 8px 0;
        }

        ul {
            margin: 0 0 10px 0;
            padding-left: 20px;
        }

        li {
            margin-bottom: 4px;
        }

        /* Entry structure for experiences/education */
        .cv-entry {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }

        .cv-entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-weight: bold;
        }

        .cv-entry-title {
            font-size: 11pt;
            color: var(--cv-text);
        }

        .cv-entry-date {
            font-size: 10pt;
            color: var(--cv-secondary);
        }

        .cv-entry-sub {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            font-style: italic;
            font-size: 10pt;
            color: var(--cv-secondary);
            margin-bottom: 4px;
        }

        /* Skills list tags cloud */
        .cv-skills-list {
            list-style: none;
            padding: 0 !important;
            margin: 0 0 12px 0;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .cv-skill-item {
            background: #f3f4f6;
            border-left: 3px solid var(--cv-primary);
            padding: 4px 10px;
            border-radius: 2px;
            font-size: 9.5pt;
            margin: 0;
        }

        .cv-skill-label {
            color: var(--cv-primary);
            margin-right: 4px;
        }

        /* Page breaks and spacers */
        .cv-pagebreak {
            page-break-before: always;
            break-before: page;
            height: 0;
            margin: 0;
            border: none;
        }

        /* Profile Photo Styling */
        .cv-sidebar-photo {
            text-align: center;
            margin-bottom: 20px;
            width: 100%;
        }
        .cv-sidebar-photo img {
            width: ${sidebarPhotoWidth};
            height: ${sidebarPhotoHeight};
            border-radius: ${photoRadius};
            object-fit: cover;
            border: 3px solid var(--cv-primary);
            background: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .cv-header.has-photo {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 20px;
        }
        .cv-header.has-photo .cv-header-text {
            flex: 1;
        }
        .cv-header-photo {
            flex-shrink: 0;
        }
        .cv-header-photo img {
            width: ${headerPhotoWidth};
            height: ${headerPhotoHeight};
            border-radius: ${photoRadius};
            object-fit: cover;
            border: 3px solid var(--cv-primary);
            background: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .cv-header.has-photo-casual {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            background: #f8fafc;
            margin: -20mm -20mm 20mm -20mm;
            padding: 25px;
            border-bottom: 4px solid var(--cv-primary);
        }
        .cv-header.has-photo-casual .cv-header-photo {
            margin-bottom: 15px;
        }
        .cv-header.has-photo-casual .cv-header-photo img {
            width: ${casualPhotoWidth};
            height: ${casualPhotoHeight};
            border-radius: ${photoRadius};
            object-fit: cover;
            border: 3px solid var(--cv-primary);
            background: #ffffff;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        /* Print Media Overrides */
        @media print {
            body {
                background: #ffffff !important;
                color: #000000 !important;
            }
            .cv-page {
                margin: 0 !important;
                box-shadow: none !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                padding: 0 !important;
            }
            @page {
                size: A4 portrait;
                margin: 20mm;
            }
            .cv-page.size-letter {
                @page {
                    size: letter portrait;
                    margin: 0.8in;
                }
            }
            .cv-header.has-photo-casual {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
        `;

        // 1. Classic LaTeX
        if (theme === 'classic-latex') {
            css += `
            .cv-page {
                font-family: 'Computer Modern', 'Latin Modern Roman', 'Times New Roman', Georgia, serif;
                line-height: 1.4;
            }
            .cv-header {
                text-align: center;
                margin-bottom: 25px;
            }
            .cv-header h1 {
                font-size: 24pt;
                font-weight: 500;
                letter-spacing: 1px;
                margin-bottom: 5px;
                color: var(--cv-primary);
            }
            .cv-contact-info {
                font-size: 9.5pt;
                color: var(--cv-secondary);
            }
            .cv-contact-info span:not(:last-child)::after {
                content: "  •  ";
                font-weight: bold;
                color: var(--cv-secondary);
                opacity: 0.6;
            }
            h2 {
                font-size: 13pt;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 0.5px solid var(--cv-primary);
                padding-bottom: 3px;
                margin-top: 20px;
                margin-bottom: 10px;
                color: var(--cv-primary);
                letter-spacing: 0.5px;
            }
            .cv-entry-title {
                font-weight: bold;
            }
            .cv-entry-org {
                font-weight: normal;
                font-style: italic;
            }
            `;
        }

        // 2. Academic
        else if (theme === 'academic') {
            css += `
            .cv-page {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                line-height: 1.5;
            }
            .cv-header {
                border-left: 4px solid var(--cv-primary);
                padding-left: 15px;
                margin-bottom: 25px;
            }
            .cv-header h1 {
                font-size: 22pt;
                font-weight: 700;
                margin-bottom: 4px;
            }
            .cv-subtitle {
                font-size: 12pt;
                color: var(--cv-secondary);
                margin-bottom: 8px;
            }
            .cv-contact-info {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                font-size: 9.5pt;
                color: var(--cv-secondary);
            }
            h2 {
                font-size: 12pt;
                font-weight: 600;
                color: var(--cv-primary);
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 4px;
                margin-top: 22px;
                margin-bottom: 12px;
            }
            .cv-entry-title {
                color: var(--cv-primary);
            }
            `;
        }

        // 3. Modern Sidebar
        else if (theme === 'modern-sidebar') {
            css += `
            .cv-page {
                font-family: 'Inter', sans-serif;
                padding: 0 !important;
                display: flex;
                min-height: 297mm;
            }
            .cv-sidebar {
                width: 32%;
                background: var(--cv-sidebar-bg);
                color: var(--cv-sidebar-text);
                padding: 30px 20px;
                display: flex;
                flex-direction: column;
            }
            .cv-main-content {
                width: 68%;
                padding: 30px 25px;
                background: var(--cv-bg);
            }
            .cv-sidebar h1 {
                font-size: 18pt;
                color: var(--cv-sidebar-text);
                margin-bottom: 5px;
                font-weight: 700;
            }
            .cv-sidebar-subtitle {
                font-size: 10.5pt;
                color: var(--cv-sidebar-text);
                opacity: 0.8;
                margin-bottom: 20px;
                border-bottom: 1px solid color-mix(in srgb, var(--cv-sidebar-text) 20%, transparent);
                padding-bottom: 10px;
            }
            .cv-sidebar-section {
                margin-bottom: 20px;
            }
            .cv-sidebar-section h2 {
                font-size: 11pt;
                color: var(--cv-sidebar-text);
                text-transform: uppercase;
                margin-bottom: 10px;
                border-bottom: 1px solid color-mix(in srgb, var(--cv-sidebar-text) 20%, transparent);
                padding-bottom: 3px;
            }
            .cv-sidebar-info-item {
                font-size: 9pt;
                margin-bottom: 8px;
                word-break: break-all;
            }
            .cv-main-content h2 {
                font-size: 13pt;
                font-weight: 700;
                color: var(--cv-primary);
                border-bottom: 2px solid var(--cv-primary);
                padding-bottom: 3px;
                margin-top: 20px;
                margin-bottom: 12px;
            }
            .cv-skills-list {
                flex-direction: column;
                gap: 6px;
            }
            .cv-skill-item {
                background: color-mix(in srgb, var(--cv-sidebar-text) 8%, transparent);
                color: var(--cv-sidebar-text);
                border-left: 3px solid var(--cv-primary);
                padding: 3px 8px;
            }
            .cv-skill-label {
                color: var(--cv-sidebar-text);
            }
            @media print {
                .cv-page {
                    display: flex !important;
                    flex-direction: row !important;
                }
                .cv-sidebar {
                    width: 32% !important;
                    background: var(--cv-sidebar-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cv-main-content {
                    width: 68% !important;
                }
            }
            `;
        }

        // 4. Minimalist
        else if (theme === 'minimalist') {
            css += `
            .cv-page {
                font-family: Georgia, serif;
                line-height: 1.5;
            }
            .cv-header {
                margin-bottom: 30px;
            }
            .cv-header h1 {
                font-size: 26pt;
                font-weight: normal;
                margin-bottom: 5px;
                letter-spacing: 0.5px;
            }
            .cv-subtitle {
                font-size: 11pt;
                font-style: italic;
                color: var(--cv-secondary);
                margin-bottom: 10px;
            }
            .cv-contact-info {
                font-size: 9pt;
                color: var(--cv-secondary);
                font-family: sans-serif;
            }
            .cv-contact-info span:not(:last-child)::after {
                content: " | ";
                color: #ccc;
            }
            h2 {
                font-family: sans-serif;
                font-size: 11pt;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--cv-primary);
                margin-top: 25px;
                margin-bottom: 12px;
            }
            .cv-entry {
                display: grid;
                grid-template-columns: 100px 1fr;
                gap: 15px;
                margin-bottom: 10px;
            }
            .cv-entry-header {
                display: block;
            }
            .cv-entry-date {
                grid-column: 1;
                font-family: sans-serif;
                font-size: 9pt;
                color: var(--cv-secondary);
            }
            .cv-entry-details {
                grid-column: 2;
            }
            .cv-entry-title {
                display: block;
                font-weight: bold;
            }
            .cv-entry-sub {
                display: block;
                font-style: italic;
                margin-bottom: 4px;
            }
            `;
        }

        // 5. Decent
        else if (theme === 'decent') {
            css += `
            .cv-page {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .cv-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 3px double var(--cv-primary);
                padding-bottom: 15px;
                margin-bottom: 25px;
            }
            .cv-header h1 {
                font-size: 24pt;
                margin: 0;
                font-weight: 800;
            }
            .cv-contact-info {
                text-align: right;
                font-size: 9pt;
                color: var(--cv-secondary);
            }
            h2 {
                background: var(--cv-primary);
                color: var(--cv-bg);
                padding: 6px 12px;
                font-size: 11pt;
                text-transform: uppercase;
                border-radius: 2px;
                margin-top: 20px;
                margin-bottom: 12px;
            }
            .cv-entry-title {
                color: var(--cv-primary);
            }
            @media print {
                h2 {
                    background: var(--cv-primary) !important;
                    color: var(--cv-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
            `;
        }

        // 6. Awesome CV
        else if (theme === 'awesome-cv') {
            css += `
            .cv-page {
                font-family: 'Roboto', sans-serif;
                line-height: 1.4;
            }
            .cv-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-bottom: 30px;
            }
            .cv-header h1 {
                font-size: 26pt;
                margin: 0 0 5px 0;
                color: var(--cv-text);
            }
            .cv-subtitle {
                font-size: 11pt;
                color: var(--cv-primary);
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .cv-contact-info {
                text-align: right;
                font-size: 8.5pt;
                color: var(--cv-secondary);
                display: flex;
                flex-direction: column;
                gap: 3px;
            }
            h2 {
                font-size: 12pt;
                font-weight: bold;
                text-transform: uppercase;
                color: var(--cv-text);
                margin-top: 20px;
                margin-bottom: 12px;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 4px;
                position: relative;
            }
            h2::after {
                content: "";
                position: absolute;
                bottom: -1px;
                left: 0;
                width: 50px;
                height: 2px;
                background: var(--cv-primary);
            }
            .cv-entry-title {
                font-size: 11pt;
                font-weight: 700;
            }
            .cv-entry-org {
                color: var(--cv-primary);
                font-weight: 600;
            }
            `;
        }

        // 7. Friggeri
        else if (theme === 'friggeri') {
            css += `
            .cv-page {
                font-family: 'Helvetica Neue', Arial, sans-serif;
            }
            .cv-header {
                margin-bottom: 35px;
            }
            .cv-header h1 {
                font-size: 32pt;
                font-weight: 300;
                color: var(--cv-text);
                margin-bottom: 5px;
            }
            .cv-header h1 strong {
                font-weight: 800;
            }
            .cv-subtitle {
                font-size: 12pt;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--cv-primary);
                margin-bottom: 12px;
            }
            .cv-contact-info {
                font-size: 9pt;
                color: var(--cv-secondary);
                display: flex;
                gap: 15px;
            }
            .cv-section-wrapper {
                display: grid;
                grid-template-columns: 120px 1fr;
                gap: 20px;
                margin-bottom: 15px;
            }
            h2 {
                grid-column: 1;
                font-size: 11pt;
                font-weight: 800;
                text-transform: uppercase;
                color: var(--cv-primary);
                margin: 0;
            }
            .cv-section-body {
                grid-column: 2;
            }
            .cv-entry {
                display: grid;
                grid-template-columns: 90px 1fr;
                gap: 10px;
                margin-bottom: 12px;
            }
            .cv-entry-header {
                display: contents;
            }
            .cv-entry-date {
                grid-column: 1;
                font-size: 9pt;
                color: var(--cv-secondary);
                font-weight: 300;
            }
            .cv-entry-details {
                grid-column: 2;
            }
            .cv-entry-title {
                display: block;
                font-weight: 700;
            }
            .cv-entry-sub {
                display: block;
                font-size: 9pt;
                color: var(--cv-secondary);
            }
            `;
        }

        // 8. ModernCV Classic
        else if (theme === 'moderncv-classic') {
            css += `
            .cv-page {
                font-family: sans-serif;
            }
            .cv-header {
                display: flex;
                justify-content: space-between;
                border-bottom: 2px solid var(--cv-primary);
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            .cv-header h1 {
                font-size: 24pt;
                font-weight: 300;
                color: var(--cv-text);
                margin: 0;
            }
            .cv-header h1 span {
                color: var(--cv-primary);
                font-weight: bold;
            }
            .cv-contact-info {
                text-align: right;
                font-size: 8.5pt;
                color: var(--cv-secondary);
            }
            .cv-entry {
                display: grid;
                grid-template-columns: 110px 1fr;
                gap: 15px;
                margin-bottom: 10px;
                position: relative;
            }
            h2 {
                font-size: 12pt;
                text-transform: uppercase;
                color: var(--cv-primary);
                border-bottom: 1px solid var(--cv-primary);
                padding-bottom: 2px;
                margin-top: 18px;
                margin-bottom: 10px;
            }
            .cv-entry-date {
                grid-column: 1;
                font-weight: bold;
                color: var(--cv-secondary);
                text-align: right;
            }
            .cv-entry-details {
                grid-column: 2;
                border-left: 2px solid var(--cv-primary);
                padding-left: 12px;
            }
            .cv-entry-title {
                display: block;
                font-weight: bold;
            }
            .cv-entry-sub {
                display: block;
                font-style: italic;
            }
            `;
        }

        // 9. ModernCV Casual
        else if (theme === 'moderncv-casual') {
            css += `
            .cv-page {
                font-family: sans-serif;
            }
            .cv-header {
                text-align: center;
                background: var(--cv-header-bg);
                margin: -20mm -20mm 20mm -20mm;
                padding: 25px;
                border-bottom: 4px solid var(--cv-primary);
            }
            .cv-page.size-letter .cv-header {
                margin: -0.8in -0.8in 0.8in -0.8in;
            }
            .cv-header h1 {
                font-size: 26pt;
                font-weight: 300;
                color: var(--cv-header-text);
                margin-bottom: 5px;
            }
            .cv-header h1 span {
                color: var(--cv-primary);
                font-weight: bold;
            }
            .cv-subtitle {
                font-size: 11pt;
                color: var(--cv-secondary);
                margin-bottom: 10px;
            }
            .cv-contact-info {
                display: flex;
                justify-content: center;
                gap: 15px;
                font-size: 9pt;
                color: var(--cv-secondary);
            }
            h2 {
                font-size: 13pt;
                color: var(--cv-primary);
                margin-top: 20px;
                margin-bottom: 12px;
                border-bottom: 1px solid var(--cv-primary);
                padding-bottom: 3px;
            }
            .cv-entry-title {
                font-weight: bold;
            }
            .cv-skill-item {
                border-radius: 12px;
                background: #eff6ff;
                border: 1px solid var(--cv-primary);
                color: var(--cv-primary);
            }
            @media print {
                .cv-header {
                    background: #f8fafc !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
            `;
        }

        // 10. Executive
        else if (theme === 'executive') {
            css += `
            .cv-page {
                font-family: Garamond, Georgia, 'Times New Roman', serif;
                line-height: 1.45;
            }
            .cv-header {
                text-align: center;
                border-bottom: 1px solid var(--cv-primary);
                padding-bottom: 12px;
                margin-bottom: 25px;
            }
            .cv-header h1 {
                font-size: 24pt;
                font-weight: bold;
                letter-spacing: 0.5px;
                color: var(--cv-primary);
                margin-bottom: 4px;
            }
            .cv-subtitle {
                font-size: 10pt;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: var(--cv-secondary);
                margin-bottom: 8px;
            }
            .cv-contact-info {
                font-size: 9.5pt;
                color: var(--cv-secondary);
            }
            .cv-contact-info span:not(:last-child)::after {
                content: "   |   ";
                color: var(--cv-primary);
            }
            h2 {
                font-size: 12pt;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--cv-primary);
                border-bottom: 1px solid var(--cv-primary);
                border-top: 1px solid var(--cv-primary);
                padding: 4px 0;
                margin-top: 22px;
                margin-bottom: 10px;
                text-align: center;
            }
            .cv-entry-title {
                font-weight: bold;
            }
            .cv-entry-org {
                font-weight: bold;
                color: var(--cv-secondary);
            }
            `;
        }

        // 11. Forty Seconds
        else if (theme === 'forty-seconds') {
            css += `
            .cv-page {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                padding: 0 !important;
                display: flex;
                min-height: 297mm;
            }
            .cv-sidebar {
                width: 33%;
                background: var(--cv-sidebar-bg);
                color: var(--cv-sidebar-text);
                padding: 35px 20px;
                display: flex;
                flex-direction: column;
                border-right: 1px solid rgba(0,0,0,0.05);
            }
            .cv-main-content {
                width: 67%;
                padding: 35px 30px;
                background: var(--cv-bg);
            }
            .cv-sidebar h1 {
                font-size: 18pt;
                color: var(--cv-primary);
                margin: 15px 0 5px 0;
                font-weight: 700;
                text-align: center;
            }
            .cv-sidebar-subtitle {
                font-size: 10pt;
                color: var(--cv-secondary);
                margin-bottom: 25px;
                text-align: center;
            }
            .cv-sidebar-section {
                margin-bottom: 25px;
            }
            .cv-sidebar-section h2 {
                font-size: 11pt;
                color: var(--cv-primary);
                text-transform: uppercase;
                margin-bottom: 12px;
                border-bottom: 1.5px solid var(--cv-primary);
                padding-bottom: 4px;
                font-weight: 700;
            }
            .cv-sidebar-info-item {
                font-size: 9pt;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cv-sidebar-info-item .cv-contact-icon {
                color: var(--cv-primary);
                opacity: 0.8;
                font-size: 10pt;
            }
            .cv-main-content h2 {
                font-size: 13pt;
                font-weight: 700;
                color: var(--cv-primary);
                border-left: 4px solid var(--cv-primary);
                padding-left: 10px;
                margin-top: 22px;
                margin-bottom: 12px;
            }
            .cv-sidebar .cv-skills-list {
                flex-direction: column;
                gap: 8px;
            }
            .cv-sidebar .cv-skill-item {
                background: rgba(0,0,0,0.04);
                color: var(--cv-sidebar-text);
                border-left: 3px solid var(--cv-primary);
                padding: 3px 8px;
            }
            .cv-sidebar .cv-skill-label {
                color: var(--cv-primary);
            }
            @media print {
                .cv-page {
                    display: flex !important;
                    flex-direction: row !important;
                }
                .cv-sidebar {
                    width: 33% !important;
                    background: var(--cv-sidebar-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cv-main-content {
                    width: 67% !important;
                }
            }
            `;
        }

        // 12. Twenty Seconds
        else if (theme === 'twenty-seconds') {
            css += `
            .cv-page {
                font-family: 'Inter', sans-serif;
                padding: 0 !important;
                display: flex;
                min-height: 297mm;
            }
            .cv-sidebar {
                width: 30%;
                background: var(--cv-sidebar-bg);
                color: var(--cv-sidebar-text);
                padding: 35px 20px;
                display: flex;
                flex-direction: column;
            }
            .cv-main-content {
                width: 70%;
                padding: 35px 30px;
                background: var(--cv-bg);
            }
            .cv-sidebar h1 {
                font-size: 18pt;
                color: var(--cv-sidebar-text);
                margin: 15px 0 5px 0;
                font-weight: 700;
                text-align: center;
                letter-spacing: 0.5px;
            }
            .cv-sidebar-subtitle {
                font-size: 10pt;
                color: var(--cv-sidebar-text);
                opacity: 0.7;
                margin-bottom: 25px;
                text-align: center;
            }
            .cv-sidebar-section {
                margin-bottom: 25px;
            }
            .cv-sidebar-section h2 {
                font-size: 11pt;
                color: var(--cv-sidebar-text);
                text-transform: uppercase;
                margin-bottom: 12px;
                border-bottom: 1px solid color-mix(in srgb, var(--cv-sidebar-text) 20%, transparent);
                padding-bottom: 4px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .cv-sidebar-info-item {
                font-size: 9pt;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                color: var(--cv-sidebar-text);
                opacity: 0.9;
            }
            .cv-sidebar-info-item a {
                color: var(--cv-sidebar-text);
            }
            .cv-sidebar-info-item .cv-contact-icon {
                color: var(--cv-primary);
                font-size: 10pt;
            }
            .cv-main-content h2 {
                font-size: 13pt;
                font-weight: 700;
                color: var(--cv-primary);
                border-bottom: 1.5px solid var(--cv-primary);
                padding-bottom: 4px;
                margin-top: 22px;
                margin-bottom: 12px;
            }
            .cv-sidebar .cv-skills-list {
                flex-direction: column;
                gap: 8px;
            }
            .cv-sidebar .cv-skill-item {
                background: color-mix(in srgb, var(--cv-sidebar-text) 8%, transparent);
                color: var(--cv-sidebar-text);
                border-left: 3px solid var(--cv-primary);
                padding: 3px 8px;
            }
            .cv-sidebar .cv-skill-label {
                color: var(--cv-sidebar-text);
            }
            .cv-sidebar .cv-skill-progress-bar-bg {
                background: color-mix(in srgb, var(--cv-sidebar-text) 20%, transparent);
            }
            .cv-sidebar .cv-skill-progress-bar-fill {
                background: var(--cv-sidebar-text);
            }
            .cv-sidebar .cv-skill-name {
                color: var(--cv-sidebar-text);
            }
            @media print {
                .cv-page {
                    display: flex !important;
                    flex-direction: row !important;
                }
                .cv-sidebar {
                    width: 30% !important;
                    background: var(--cv-sidebar-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cv-main-content {
                    width: 70% !important;
                }
            }
            `;
        }

        // 13. Hipster
        else if (theme === 'hipster') {
            css += `
            .cv-page {
                font-family: 'Inter', sans-serif;
                padding: 0 !important;
                display: flex;
                min-height: 297mm;
            }
            .cv-sidebar {
                width: 34%;
                background: var(--cv-sidebar-bg);
                color: var(--cv-sidebar-text);
                padding: 35px 20px;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #e5e7eb;
            }
            .cv-main-content {
                width: 66%;
                padding: 35px 30px;
                background: var(--cv-bg);
            }
            .cv-sidebar-photo img {
                border: 3px solid var(--cv-primary);
                padding: 3px;
            }
            .cv-sidebar h1 {
                font-family: Georgia, serif;
                font-size: 17pt;
                color: var(--cv-primary);
                margin: 15px 0 5px 0;
                font-weight: 700;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .cv-sidebar-subtitle {
                font-size: 9.5pt;
                color: var(--cv-secondary);
                margin-bottom: 25px;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 1.5px;
            }
            .cv-sidebar-section {
                margin-bottom: 25px;
            }
            .cv-sidebar-section h2 {
                font-family: Georgia, serif;
                font-size: 11pt;
                color: var(--cv-primary);
                text-transform: uppercase;
                margin-bottom: 12px;
                border-bottom: 1.5px solid var(--cv-primary);
                padding-bottom: 4px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }
            .cv-sidebar-info-item {
                font-size: 9pt;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cv-sidebar-info-item .cv-contact-icon {
                color: var(--cv-primary);
                font-size: 10pt;
            }
            .cv-main-content h2 {
                font-family: Georgia, serif;
                font-size: 12.5pt;
                font-weight: 700;
                color: var(--cv-primary);
                text-transform: uppercase;
                border-bottom: 1.5px solid var(--cv-primary);
                padding-bottom: 4px;
                margin-top: 22px;
                margin-bottom: 12px;
                letter-spacing: 0.5px;
            }
            .cv-sidebar .cv-skills-list {
                flex-direction: column;
                gap: 8px;
            }
            .cv-sidebar .cv-skill-item {
                background: color-mix(in srgb, var(--cv-sidebar-bg) 90%, var(--cv-sidebar-text));
                color: var(--cv-sidebar-text);
                border: 1px solid #d1d5db;
                border-left: 3px solid var(--cv-primary);
                padding: 3px 8px;
            }
            @media print {
                .cv-page {
                    display: flex !important;
                    flex-direction: row !important;
                }
                .cv-sidebar {
                    width: 34% !important;
                    background: var(--cv-sidebar-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cv-main-content {
                    width: 66% !important;
                }
            }
            `;
        }

        // 14. Sixty Seconds
        else if (theme === 'sixty-seconds') {
            css += `
            .cv-page {
                font-family: 'Inter', sans-serif;
                padding: 0 !important;
                display: flex;
                min-height: 297mm;
            }
            .cv-sidebar {
                width: 30%;
                background: var(--cv-sidebar-bg);
                color: var(--cv-sidebar-text);
                padding: 35px 20px;
                display: flex;
                flex-direction: column;
                border-right: 1px solid #e2e8f0;
            }
            .cv-main-content {
                width: 70%;
                padding: 35px 30px;
                background: var(--cv-bg);
            }
            .cv-sidebar h1 {
                font-size: 18pt;
                color: var(--cv-primary);
                margin: 15px 0 5px 0;
                font-weight: 700;
                text-align: center;
            }
            .cv-sidebar-subtitle {
                font-size: 9.5pt;
                color: var(--cv-secondary);
                margin-bottom: 25px;
                text-align: center;
            }
            .cv-sidebar-section {
                margin-bottom: 25px;
            }
            .cv-sidebar-section h2 {
                font-size: 10.5pt;
                color: var(--cv-primary);
                text-transform: uppercase;
                margin-bottom: 12px;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 4px;
                font-weight: 700;
            }
            .cv-sidebar-info-item {
                font-size: 9pt;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .cv-sidebar-info-item .cv-contact-icon {
                color: var(--cv-primary);
                font-size: 10pt;
            }
            .cv-main-content h2 {
                font-size: 12pt;
                font-weight: 700;
                color: var(--cv-primary);
                border-bottom: 1px dashed var(--cv-primary);
                padding-bottom: 4px;
                margin-top: 22px;
                margin-bottom: 12px;
            }
            .cv-sidebar .cv-skills-list {
                flex-direction: column;
                gap: 8px;
            }
            .cv-sidebar .cv-skill-item {
                background: color-mix(in srgb, var(--cv-sidebar-text) 8%, transparent);
                color: var(--cv-sidebar-text);
                border: 1px solid color-mix(in srgb, var(--cv-sidebar-text) 12%, transparent);
                padding: 3px 8px;
            }
            @media print {
                .cv-page {
                    display: flex !important;
                    flex-direction: row !important;
                }
                .cv-sidebar {
                    width: 30% !important;
                    background: var(--cv-sidebar-bg) !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .cv-main-content {
                    width: 70% !important;
                }
            }
            `;
        }

        // 15. Entry Level
        else if (theme === 'entry-level') {
            css += `
            .cv-page {
                font-family: 'Inter', -apple-system, sans-serif;
                line-height: 1.45;
            }
            .cv-header {
                text-align: center;
                margin-bottom: 25px;
            }
            .cv-header h1 {
                font-size: 24pt;
                font-weight: 800;
                letter-spacing: -0.5px;
                color: var(--cv-primary);
                margin-bottom: 4px;
            }
            .cv-subtitle {
                font-size: 12pt;
                color: var(--cv-secondary);
                font-weight: 500;
                margin-bottom: 12px;
            }
            .cv-contact-info {
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
                font-size: 9.5pt;
                color: var(--cv-secondary);
            }
            .cv-contact-info .cv-contact-item {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .cv-contact-info .cv-contact-icon {
                color: var(--cv-primary);
            }
            h2 {
                font-size: 11pt;
                font-weight: 700;
                text-transform: uppercase;
                border-bottom: 1px solid var(--cv-primary);
                padding-bottom: 3px;
                margin-top: 22px;
                margin-bottom: 10px;
                color: var(--cv-primary);
                letter-spacing: 0.5px;
            }
            .cv-entry-title {
                font-weight: bold;
            }
            .cv-entry-org {
                font-weight: normal;
                color: var(--cv-secondary);
            }
            `;
        }

        return css;
    }

    /**
     * Generate standalone CV HTML
     */
    async generateHTML(options = {}) {
        if (options.markdown) {
            this.parseMarkdown(options.markdown);
        }
        const theme = options.theme || this.currentTheme;
        const paperSize = options.paperSize || this.currentPaperSize;
        const colors = this.getThemeColors(theme);
        
        // Compile CSS
        const themeCSS = this.getThemeCSS(theme, colors);

        // Header sections based on metadata
        const name = this.metadata.name || 'Your Name';
        const subtitle = this.metadata.subtitle || '';
        const email = this.metadata.email || '';
        const phone = this.metadata.phone || '';
        const location = this.metadata.location || '';
        const website = this.metadata.website || '';
        const github = this.metadata.github || '';
        const linkedin = this.metadata.linkedin || '';

        // Handle profile photo path resolution
        const currentFilePath = options.currentFilePath || null;
        let photo = this.metadata.photo || '';
        if (photo && !photo.startsWith('http://') && !photo.startsWith('https://') && !photo.startsWith('data:')) {
            if (typeof require !== 'undefined') {
                try {
                    const path = require('path');
                    // Resolve relative paths relative to current file path's directory
                    if (!path.isAbsolute(photo) && currentFilePath) {
                        const baseDir = path.dirname(currentFilePath);
                        photo = path.resolve(baseDir, photo);
                    }
                    
                    // Normalize for local file URI
                    let normalizedPhoto = photo.replace(/\\/g, '/');
                    if (!normalizedPhoto.startsWith('file:///')) {
                        if (normalizedPhoto.startsWith('/')) {
                            photo = 'file://' + normalizedPhoto;
                        } else {
                            photo = 'file:///' + normalizedPhoto;
                        }
                    } else {
                        photo = normalizedPhoto;
                    }
                } catch (e) {
                    console.error('[CVManager] Failed to resolve photo path:', e);
                }
            }
        }

        // Contact info assembly
        const useIcons = this.metadata.icons !== false && this.metadata.icons !== 'false';
        const contacts = [];
        if (email) contacts.push(this.getContactItemHtml('email', email, useIcons));
        if (phone) contacts.push(this.getContactItemHtml('phone', phone, useIcons));
        if (location) contacts.push(this.getContactItemHtml('location', location, useIcons));
        if (website) contacts.push(this.getContactItemHtml('website', website, useIcons));
        if (github) contacts.push(this.getContactItemHtml('github', github, useIcons));
        if (linkedin) contacts.push(this.getContactItemHtml('linkedin', linkedin, useIcons));
        if (this.metadata.twitter) contacts.push(this.getContactItemHtml('twitter', this.metadata.twitter, useIcons));

        // Generate Header HTML depending on layout (e.g. Modern Sidebar separates header)
        let headerHTML = '';
        if (theme !== 'modern-sidebar') {
            const hasHeaderPhoto = photo && (theme === 'moderncv-classic' || theme === 'moderncv-casual' || theme === 'awesome-cv' || theme === 'academic');
            
            let photoHTML = '';
            if (hasHeaderPhoto) {
                photoHTML = `<div class="cv-header-photo"><img src="${photo}" alt="${name}"></div>`;
            }

            if (theme === 'moderncv-casual' && hasHeaderPhoto) {
                headerHTML = `
                <div class="cv-header has-photo-casual">
                    ${photoHTML}
                    <div class="cv-header-text">
                        <h1>${name}</h1>
                        ${subtitle ? `<div class="cv-subtitle">${subtitle}</div>` : ''}
                        <div class="cv-contact-info">
                            ${contacts.join('\n')}
                        </div>
                    </div>
                </div>`;
            } else if (hasHeaderPhoto) {
                headerHTML = `
                <div class="cv-header has-photo">
                    <div class="cv-header-text">
                        <h1>${theme === 'friggeri' ? (() => {
                            const words = name.split(' ');
                            if (words.length > 1) {
                                return `${words[0]} <strong>${words.slice(1).join(' ')}</strong>`;
                            }
                            return name;
                        })() : name}</h1>
                        ${subtitle ? `<div class="cv-subtitle">${subtitle}</div>` : ''}
                        <div class="cv-contact-info">
                            ${contacts.join('\n')}
                        </div>
                    </div>
                    ${photoHTML}
                </div>`;
            } else {
                headerHTML = `
                <div class="cv-header">
                    <h1>${theme === 'friggeri' ? (() => {
                        const words = name.split(' ');
                        if (words.length > 1) {
                            return `${words[0]} <strong>${words.slice(1).join(' ')}</strong>`;
                        }
                        return name;
                    })() : name}</h1>
                    ${subtitle ? `<div class="cv-subtitle">${subtitle}</div>` : ''}
                    <div class="cv-contact-info">
                        ${contacts.join('\n')}
                    </div>
                </div>`;
            }
        }

        // Main body Markdown parsing
        let mainContentHtml = '';
        if (typeof window !== 'undefined' && window.markdownRenderer) {
            const parsed = this.parseMarkdown(options.markdown || '');
            const rawBodyHtml = await window.markdownRenderer.render(parsed.content);
            mainContentHtml = this.postProcessHTML(rawBodyHtml, theme);
        } else {
            mainContentHtml = `<div class="error">Markdown renderer not available.</div>`;
        }

        // Restructure body for specialized layouts
        let pageBodyHTML = '';
        if (['modern-sidebar', 'forty-seconds', 'twenty-seconds', 'hipster', 'sixty-seconds'].includes(theme)) {
            const sidebarContacts = contacts.map(c => `<div class="cv-sidebar-info-item">${c}</div>`).join('\n');
            // Split parsed main content to separate out skills
            const temp = document.createElement('div');
            temp.innerHTML = mainContentHtml;

            // Greedily extract all elements under the Skills header if present
            const skillsHeader = Array.from(temp.querySelectorAll('h2')).find(h => h.textContent.toLowerCase().includes('skill'));
            let skillsListHtml = '';
            if (skillsHeader) {
                let current = skillsHeader.nextElementSibling;
                while (current && current.tagName !== 'H2' && current.tagName !== 'H1') {
                    const next = current.nextElementSibling;
                    skillsListHtml += current.outerHTML;
                    current.remove();
                    current = next;
                }
                skillsHeader.remove();
            }

            pageBodyHTML = `
            <div class="cv-sidebar">
                ${photo ? `<div class="cv-sidebar-photo"><img src="${photo}" alt="${name}"></div>` : ''}
                <h1>${name}</h1>
                ${subtitle ? `<div class="cv-sidebar-subtitle">${subtitle}</div>` : ''}
                <div class="cv-sidebar-section">
                    <h2>Contact</h2>
                    ${sidebarContacts}
                </div>
                ${skillsListHtml ? `
                <div class="cv-sidebar-section">
                    <h2>Skills</h2>
                    ${skillsListHtml}
                </div>` : ''}
            </div>
            <div class="cv-main-content">
                ${temp.innerHTML}
            </div>`;
        } else if (theme === 'friggeri') {
            // Friggeri wraps sections in side-by-side grids
            const temp = document.createElement('div');
            temp.innerHTML = mainContentHtml;
            const elements = Array.from(temp.children);
            let restructured = '';
            let activeSectionContent = [];
            let activeSectionTitle = '';

            elements.forEach(el => {
                if (el.tagName === 'H2') {
                    if (activeSectionTitle) {
                        restructured += `
                        <div class="cv-section-wrapper">
                            <h2>${activeSectionTitle}</h2>
                            <div class="cv-section-body">${activeSectionContent.map(x => x.outerHTML).join('')}</div>
                        </div>`;
                    } else if (activeSectionContent.length > 0) {
                        // Output introductory details (pre-H2 content)
                        restructured += `<div class="cv-intro-block" style="margin-bottom: 20px;">${activeSectionContent.map(x => x.outerHTML).join('')}</div>`;
                    }
                    activeSectionTitle = el.textContent;
                    activeSectionContent = [];
                } else {
                    activeSectionContent.push(el);
                }
            });

            if (activeSectionTitle) {
                restructured += `
                <div class="cv-section-wrapper">
                    <h2>${activeSectionTitle}</h2>
                    <div class="cv-section-body">${activeSectionContent.map(x => x.outerHTML).join('')}</div>
                </div>`;
            } else if (activeSectionContent.length > 0) {
                // If there were no H2 elements at all, render content in an intro block
                restructured += `<div class="cv-intro-block" style="margin-bottom: 20px;">${activeSectionContent.map(x => x.outerHTML).join('')}</div>`;
            }

            pageBodyHTML = headerHTML + '\n' + restructured;
        } else {
            pageBodyHTML = headerHTML + '\n' + mainContentHtml;
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CV - ${name}</title>
    
    <!-- KaTeX for math expressions -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    
    <!-- FontAwesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- Code syntax highlighting -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    
    <style id="theme-css">
        ${themeCSS}
    </style>
</head>
<body>
    <div class="cv-page size-${paperSize}">
        ${pageBodyHTML}
    </div>
</body>
</html>`;
    }

    /**
     * Preview CV using Electron IPC
     */
    async previewCV(markdown, currentFilePath = null) {
        const parsed = this.parseMarkdown(markdown);
        const html = await this.generateHTML({
            theme: parsed.theme,
            paperSize: parsed.paperSize,
            markdown: markdown,
            currentFilePath: currentFilePath
        });

        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('preview-cv', { html: html });
        }
        return { success: false, error: 'Electron IPC not available' };
    }

    /**
     * Export standalone CV HTML
     */
    async exportHTML(markdown, currentFilePath = null) {
        const parsed = this.parseMarkdown(markdown);
        const html = await this.generateHTML({
            theme: parsed.theme,
            paperSize: parsed.paperSize,
            markdown: markdown,
            currentFilePath: currentFilePath
        });

        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('save-cv-html', {
                html: html,
                title: this.metadata.name || 'CV'
            });
        }
        return { success: false, error: 'Electron IPC not available' };
    }

    /**
     * Export CV to PDF
     */
    async exportPDF(markdown, currentFilePath = null) {
        const parsed = this.parseMarkdown(markdown);
        const html = await this.generateHTML({
            theme: parsed.theme,
            paperSize: parsed.paperSize,
            markdown: markdown,
            currentFilePath: currentFilePath
        });

        if (typeof require !== 'undefined') {
            const { ipcRenderer } = require('electron');
            return await ipcRenderer.invoke('export-cv-pdf', {
                html: html,
                title: this.metadata.name || 'CV'
            });
        }
        return { success: false, error: 'Electron IPC not available' };
    }

    /**
     * Get contact item HTML structure using FontAwesome icons or text labels
     */
    getContactItemHtml(key, value, useIcons) {
        if (!value) return '';
        const icons = {
            email: '<i class="fas fa-envelope"></i>',
            phone: '<i class="fas fa-phone"></i>',
            location: '<i class="fas fa-map-marker-alt"></i>',
            website: '<i class="fas fa-globe"></i>',
            github: '<i class="fab fa-github"></i>',
            linkedin: '<i class="fab fa-linkedin"></i>',
            twitter: '<i class="fab fa-twitter"></i>'
        };
        const labels = {
            email: 'Email',
            phone: 'Phone',
            location: 'Location',
            website: 'Web',
            github: 'GitHub',
            linkedin: 'LinkedIn',
            twitter: 'Twitter'
        };

        const iconHtml = useIcons ? `<span class="cv-contact-icon">${icons[key] || ''}</span>` : `<span class="cv-contact-label">${labels[key] || key}:</span>`;
        
        let content = value;
        if (key === 'email') {
            content = `<a href="mailto:${value}">${value}</a>`;
        } else if (key === 'website') {
            content = `<a href="${value.startsWith('http') ? value : 'https://' + value}" target="_blank">${value.replace(/^https?:\/\//, '')}</a>`;
        } else if (key === 'github') {
            content = `<a href="https://github.com/${value}" target="_blank">${value}</a>`;
        } else if (key === 'linkedin') {
            content = `<a href="https://linkedin.com/in/${value}" target="_blank">${value}</a>`;
        } else if (key === 'twitter') {
            content = `<a href="https://twitter.com/${value}" target="_blank">@${value}</a>`;
        }

        return `<span class="cv-contact-item">${iconHtml} <span class="cv-contact-value">${content}</span></span>`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CVManager;
}
