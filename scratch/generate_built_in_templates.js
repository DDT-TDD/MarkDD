const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', 'src', 'templates', 'thesis');

const universities = [
    { id: 'standard', name: 'Standard Academic Template' },
    { id: 'mit', name: 'Massachusetts Institute of Technology (MIT)' },
    { id: 'harvard', name: 'Harvard University' },
    { id: 'stanford', name: 'Stanford University' },
    { id: 'oxford', name: 'University of Oxford' },
    { id: 'cambridge', name: 'University of Cambridge' },
    { id: 'uio', name: 'University of Oslo (UiO)' },
    { id: 'unibo', name: 'Università di Bologna (UniBo)' },
    { id: 'polimi', name: 'Politecnico di Milano (PoliMi)' },
    { id: 'eth', name: 'ETH Zurich' },
    { id: 'imperial', name: 'Imperial College London' }
];

const DEFAULT_CHAPTERS = {
    'chapter-01.md': `# Chapter 1: Introduction\n\n## 1.1 Motivation and Context\nWrite the motivation and background context for your research here.\n\n## 1.2 Research Objectives\n- Objective 1\n- Objective 2\n- Objective 3\n\n## 1.3 Thesis Outline\nDescribe the structure of this thesis.\n`,
    'chapter-02.md': `# Chapter 2: Literature Review\n\n## 2.1 Background\nSurvey the relevant literature here. Use inline math like $E = mc^2$ and display math:\n\n$$\\mathcal{L}(\\theta) = \\mathcal{L}_{data}(\\theta) + \\lambda\\mathcal{L}_{physics}(\\theta)$$\n\n## 2.2 Related Work\nDiscuss related work and how your research fits in.\n`,
    'chapter-03.md': `# Chapter 3: Methodology\n\n## 3.1 Framework Overview\nDescribe your methodology here.\n\n## 3.2 Mathematical Formulation\nPresent the key equations:\n\n$$\\nabla^2 \\phi = \\frac{\\partial^2 \\phi}{\\partial t^2}$$\n`,
    'chapter-04.md': `# Chapter 4: Results & Analysis\n\n## 4.1 Experimental Setup\nDescribe the experimental setup.\n\n## 4.2 Results\nPresent your results. Example table:\n\n| Method | Accuracy | Time (s) |\n|:-------|:--------:|:--------:|\n| Baseline | 85.2% | 120 |\n| Proposed | 94.7% | 15 |\n`,
    'chapter-05.md': `# Chapter 5: Discussion\n\n## 5.1 Interpretation of Results\nDiscuss the implications of your results.\n\n## 5.2 Limitations\nAcknowledge limitations of your study.\n\n## 5.3 Future Work\nSuggest future research directions.\n`,
    'chapter-06.md': `# Chapter 6: Conclusion\n\nSummarise the contributions of this thesis and the key findings.\n`
};

const SUMMARY_TEMPLATE = `# Summary\n\n- [Title Page](title.md)\n- [Abstract](abstract.md)\n- [Declaration](declaration.md)\n- [Table of Contents](front/table-of-contents.md)\n- [List of Figures](front/lof.md)\n- [List of Tables](front/lot.md)\n\n## Introduction\n- [Chapter 1: Introduction](chapters/chapter-01.md)\n\n## Core Content\n- [Chapter 2: Literature Review](chapters/chapter-02.md)\n- [Chapter 3: Methodology](chapters/chapter-03.md)\n- [Chapter 4: Results & Analysis](chapters/chapter-04.md)\n\n## Discussion\n- [Chapter 5: Discussion](chapters/chapter-05.md)\n- [Chapter 6: Conclusion](chapters/chapter-06.md)\n\n## References\n- [Bibliography](bibliography.md)\n\n## Appendices\n- [Appendix A: Additional Derivations](appendices/appendix-01.md)\n`;

const TITLE_CONTENT = `# Title Page\n\nThis file contains guidelines for the thesis cover and title page. The actual cover page will be dynamically rendered when compiling to PDF or previewing the project, using the selected university stylesheet.\n`;

const BIBLIOGRAPHY_CONTENT = `# Bibliography\n\nUse this list to define references for your academic thesis. The citations will be automatically mapped to keys throughout the text.\n\n- [@raissi2019] Raissi, M., Perdikaris, P., & Karniadakis, G. E. (2019). Physics-informed neural networks: A deep learning framework for solving forward and inverse problems involving nonlinear partial differential equations. Journal of Computational Physics, 378, 686-707.\n`;

for (const uni of universities) {
    const uniDir = path.join(baseDir, uni.id);
    fs.mkdirSync(uniDir, { recursive: true });

    // template.json
    fs.writeFileSync(
        path.join(uniDir, 'template.json'),
        JSON.stringify({ name: uni.name, university: uni.id }, null, 2),
        'utf-8'
    );

    // SUMMARY.md
    fs.writeFileSync(path.join(uniDir, 'SUMMARY.md'), SUMMARY_TEMPLATE, 'utf-8');

    // title.md, abstract.md, declaration.md, bibliography.md
    fs.writeFileSync(path.join(uniDir, 'title.md'), TITLE_CONTENT, 'utf-8');
    fs.writeFileSync(
        path.join(uniDir, 'abstract.md'),
        `# Abstract\n\nProvide a concise summary of your thesis for ${uni.name} here.\n`,
        'utf-8'
    );
    fs.writeFileSync(
        path.join(uniDir, 'declaration.md'),
        `# Declaration\n\nI hereby declare that this thesis is my own original work and has not been submitted for any other degree.\n`,
        'utf-8'
    );
    fs.writeFileSync(path.join(uniDir, 'bibliography.md'), BIBLIOGRAPHY_CONTENT, 'utf-8');

    // chapters/
    const chapDir = path.join(uniDir, 'chapters');
    fs.mkdirSync(chapDir, { recursive: true });
    for (const [file, content] of Object.entries(DEFAULT_CHAPTERS)) {
        fs.writeFileSync(path.join(chapDir, file), content, 'utf-8');
    }

    // appendices/
    const appDir = path.join(uniDir, 'appendices');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
        path.join(appDir, 'appendix-01.md'),
        `# Appendix A: Additional Derivations\n\nProvide supplementary derivations, data, or code here.\n`,
        'utf-8'
    );

    // custom.css
    let cssContent = `/* ${uni.name} Custom Styles */\n`;
    if (uni.id === 'mit') {
        cssContent += `:root { --accent: #A31F34; --book-font: 'Crimson Text', 'Georgia', serif; }\n`;
    } else if (uni.id === 'harvard') {
        cssContent += `:root { --accent: #A51C30; --book-font: 'EB Garamond', 'Garamond', serif; }\n`;
    } else if (uni.id === 'stanford') {
        cssContent += `:root { --accent: #8C1515; --book-font: 'Libre Baskerville', serif; }\n`;
    } else if (uni.id === 'oxford') {
        cssContent += `:root { --accent: #002147; --book-font: 'Playfair Display', serif; }\n`;
    } else if (uni.id === 'cambridge') {
        cssContent += `:root { --accent: #003B5C; --book-font: 'Cormorant Garamond', serif; }\n`;
    } else if (uni.id === 'uio') {
        cssContent += `:root { --accent: #D81E05; --book-font: 'Georgia', serif; }\n`;
    } else if (uni.id === 'unibo') {
        cssContent += `:root { --accent: #9E1B26; --book-font: 'Garamond', serif; }\n`;
    } else if (uni.id === 'polimi') {
        cssContent += `:root { --accent: #004B87; --book-font: 'Inter', sans-serif; }\n`;
    } else if (uni.id === 'eth') {
        cssContent += `:root { --accent: #000000; --book-font: 'Helvetica Neue', Arial, sans-serif; }\n`;
    } else if (uni.id === 'imperial') {
        cssContent += `:root { --accent: #003D7C; --book-font: 'Georgia', serif; }\n`;
    } else {
        cssContent += `:root { --accent: #000000; --book-font: 'Times New Roman', serif; }\n`;
    }
    fs.writeFileSync(path.join(uniDir, 'custom.css'), cssContent, 'utf-8');
}

console.log('Successfully generated all built-in university templates!');
