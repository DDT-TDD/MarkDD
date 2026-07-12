const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { JSDOM } = require('jsdom');

async function run() {
    console.log('Starting Academic Thesis Mode unit test suite...\n');

    // Setup DOM context for renderer modules
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    global.window = dom.window;
    global.document = dom.window.document;
    global.Event = dom.window.Event;
    global.CustomEvent = dom.window.CustomEvent;

    global.MarkdownRenderer = class {};
    global.PreviewManager = class {};
    global.Editor = class {};
    global.Renderer = class {};
    global.localStorage = {
        _store: {},
        getItem(key) { return this._store[key] || null; },
        setItem(key, value) { this._store[key] = String(value); },
        removeItem(key) { delete this._store[key]; },
        clear() { this._store = {}; }
    };

    const rootDir = path.resolve(__dirname, '..');
    const { BookEngine } = require(path.join(rootDir, 'src/common/book-engine.js'));
    const bookEngine = new BookEngine();

    // Setup temporary test directories
    const testProjectDir = path.join(__dirname, 'temp_thesis_project');
    const testTemplateDir = path.join(__dirname, 'temp_templates', 'thesis', 'temp_custom_template');
    const customProjectDir = path.join(__dirname, 'temp_custom_project');

    if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testProjectDir, { recursive: true });

    try {
        // ==========================================
        // TEST 1: Initialize Standard Thesis Project
        // ==========================================
        console.log('TEST 1: Initializing a standard thesis project...');
        const initResult = await bookEngine.initProject(testProjectDir, {
            type: 'thesis',
            title: 'Quantum Fields and Neural Networks',
            author: 'Jane Doe',
            supervisor: 'Prof. Alan Turing',
            department: 'Department of Computing'
        });

        assert.ok(initResult.configPath, 'Config path should be returned');
        assert.ok(initResult.summaryPath, 'Summary path should be returned');
        
        // Verify files exist
        assert.ok(fs.existsSync(initResult.configPath), 'book.config.json should be created');
        assert.ok(fs.existsSync(initResult.summaryPath), 'SUMMARY.md should be created');
        
        const configJson = JSON.parse(fs.readFileSync(initResult.configPath, 'utf-8'));
        assert.strictEqual(configJson.type, 'thesis', 'Project type should be thesis');
        assert.strictEqual(configJson.university, 'standard', 'Default university should be standard');
        assert.strictEqual(configJson.supervisor, 'Prof. Alan Turing', 'Supervisor should be saved in config');

        const summaryContent = fs.readFileSync(initResult.summaryPath, 'utf-8');
        assert.ok(summaryContent.includes('Abstract'), 'Summary should contain Abstract');
        assert.ok(summaryContent.includes('Declaration of Authorship'), 'Summary should contain Declaration');
        assert.ok(summaryContent.includes('Chapter 1: Introduction'), 'Summary should contain Introduction');
        assert.ok(summaryContent.includes('Bibliography'), 'Summary should contain Bibliography');

        const chaptersDir = path.join(testProjectDir, 'chapters');
        assert.ok(fs.existsSync(path.join(chaptersDir, 'abstract.md')), 'abstract.md should exist');
        assert.ok(fs.existsSync(path.join(chaptersDir, 'declaration.md')), 'declaration.md should exist');
        // Chapters are now named chapter-01.md ... chapter-06.md (default 6 when no count specified)
        assert.ok(fs.existsSync(path.join(chaptersDir, 'chapter-01.md')), 'chapter-01.md (Introduction) should exist');
        assert.ok(fs.existsSync(path.join(chaptersDir, 'chapter-02.md')), 'chapter-02.md (Literature Review) should exist');
        assert.ok(fs.existsSync(path.join(chaptersDir, 'bibliography.md')), 'bibliography.md should exist');

        console.log('✓ TEST 1 Passed.\n');


        // ==========================================
        // TEST 2: Custom University Template Copying
        // ==========================================
        console.log('TEST 2: Initializing from custom university template path...');
        // Already declared testTemplateDir
        if (fs.existsSync(testTemplateDir)) {
            fs.rmSync(testTemplateDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testTemplateDir, { recursive: true });
        fs.mkdirSync(path.join(testTemplateDir, 'chapters'), { recursive: true });

        // Write custom template files
        fs.writeFileSync(path.join(testTemplateDir, 'SUMMARY.md'), '# Custom Outline\n- [Intro](chapters/intro.md)', 'utf-8');
        fs.writeFileSync(path.join(testTemplateDir, 'chapters/intro.md'), '# Custom Introduction', 'utf-8');
        fs.writeFileSync(path.join(testTemplateDir, 'custom.css'), ':root { --accent: #ff00ff; }', 'utf-8');
        fs.writeFileSync(path.join(testTemplateDir, 'template.json'), JSON.stringify({ name: 'My Custom Uni' }), 'utf-8');

        // Already declared customProjectDir
        if (fs.existsSync(customProjectDir)) {
            fs.rmSync(customProjectDir, { recursive: true, force: true });
        }

        await bookEngine.initProject(customProjectDir, {
            type: 'thesis',
            title: 'Custom Sim',
            author: 'Jane Doe',
            customTemplatePath: testTemplateDir
        });

        assert.ok(fs.existsSync(path.join(customProjectDir, 'SUMMARY.md')), 'Custom SUMMARY.md should be copied');
        assert.ok(fs.existsSync(path.join(customProjectDir, 'chapters/intro.md')), 'Custom chapter should be copied');
        assert.ok(fs.existsSync(path.join(customProjectDir, 'custom.css')), 'Custom CSS should be copied');
        
        const copiedSummary = fs.readFileSync(path.join(customProjectDir, 'SUMMARY.md'), 'utf-8');
        assert.ok(copiedSummary.includes('Custom Outline'), 'Summary content should match template');

        console.log('✓ TEST 2 Passed.\n');

        // ==========================================
        // TEST 3: University Title Page Generation
        // ==========================================
        console.log('TEST 3: Verifying cover layouts for universities...');
        const testMetadata = {
            title: 'Deep Learning Simulation',
            author: 'Jane Doe',
            degree: 'Doctor of Philosophy',
            department: 'Department of Computing',
            supervisor: 'Prof. Alan Turing',
            year: '2026',
            month: 'October',
            type: 'thesis'
        };

        const universities = ['mit', 'harvard', 'stanford', 'oxford', 'cambridge', 'uio', 'unibo', 'polimi', 'eth', 'imperial', 'standard'];
        for (const uni of universities) {
            const html = bookEngine.renderThesisTitlePage({ ...testMetadata, university: uni });
            assert.ok(html, `Title page HTML for ${uni} should be generated`);
            assert.ok(html.includes('Deep Learning Simulation'), `${uni} cover should contain title`);
            assert.ok(html.includes('Jane Doe'), `${uni} cover should contain author`);
            
            if (uni === 'mit') {
                assert.ok(html.includes('MASSACHUSETTS INSTITUTE OF TECHNOLOGY'), 'MIT cover should contain MIT text');
                assert.ok(html.includes('Certified by'), 'MIT cover should contain certifications');
            } else if (uni === 'stanford') {
                assert.ok(html.includes('STANFORD UNIVERSITY'), 'Stanford cover should contain Stanford text');
                assert.ok(html.includes('Approved for the Department'), 'Stanford cover should contain signatures');
            } else if (uni === 'oxford') {
                assert.ok(html.includes('University of Oxford'), 'Oxford cover should contain Oxford text');
                assert.ok(html.includes('Dominus'), 'Oxford cover should contain Oxford motto');
            } else if (uni === 'unibo') {
                assert.ok(html.includes('ALMA MATER STUDIORUM'), 'Bologna cover should contain Bologna text');
                assert.ok(html.includes('Relatore:'), 'Bologna cover should contain Relatore label');
            } else if (uni === 'polimi') {
                assert.ok(html.includes('POLITECNICO DI MILANO'), 'PoliMi cover should contain PoliMi text');
                assert.ok(html.includes('Advisor:'), 'PoliMi cover should contain Advisor label');
            } else if (uni === 'eth') {
                assert.ok(html.includes('ETH Zürich'), 'ETH cover should contain ETH text');
            }
        }

        // Verify supervisor prefixing logic and double prefix prevention
        const doubleProfTest = bookEngine.renderThesisTitlePage({
            ...testMetadata,
            university: 'standard',
            supervisor: 'Prof. Alan Turing',
            coSupervisor: 'Dr. John von Neumann'
        });
        assert.ok(!doubleProfTest.includes('Prof. Prof.'), 'Should not contain double Prof. prefix');
        assert.ok(!doubleProfTest.includes('Dr. Dr.'), 'Should not contain double Dr. prefix');
        assert.ok(doubleProfTest.includes('Supervisor: Prof. Alan Turing'), 'Should format supervisor correctly');
        assert.ok(doubleProfTest.includes('Co-Supervisor: Dr. John von Neumann'), 'Should format co-supervisor correctly');
        
        const noPrefixTest = bookEngine.renderThesisTitlePage({
            ...testMetadata,
            university: 'standard',
            supervisor: 'Alan Turing',
            coSupervisor: 'John von Neumann'
        });
        assert.ok(noPrefixTest.includes('Supervisor: Prof. Alan Turing'), 'Should add Prof. prefix when missing');
        assert.ok(noPrefixTest.includes('Co-Supervisor: Dr. John von Neumann'), 'Should add Dr. prefix when missing');

        console.log('✓ TEST 3 Passed.\n');

        // ==========================================
        // TEST 4: composeDocument Renderer Integration
        // ==========================================
        console.log('TEST 4: Verifying BookManager composeDocument method...');
        
        // Mock BookManager dependencies
        require(path.join(rootDir, 'src/renderer/js/book.js'));
        const BookManagerClass = window.BookManager;
        const bookManager = new BookManagerClass();
        bookManager.sanitize = (html) => html;

        const mockBook = {
            metadata: {
                title: 'Quantum Field AI',
                authors: ['Jane Doe'],
                description: 'Thesis test description'
            },
            config: {
                type: 'thesis',
                bookStyle: 'oxford'
            },
            chapters: [
                { title: 'Chapter 1', html: '<p>Intro content</p>' }
            ],
            toc: [
                { title: 'Chapter 1', id: 'chapter-1', level: 1 }
            ]
        };

        const compiledHtml = bookManager.composeDocument(mockBook, { pdf: true });
        assert.ok(compiledHtml, 'composeDocument should compile and output HTML');
        assert.ok(compiledHtml.includes('Quantum Field AI'), 'Output should contain title');
        assert.ok(compiledHtml.includes('Jane Doe'), 'Output should contain author');
        assert.ok(compiledHtml.includes('Intro content'), 'Output should contain chapter content');
        assert.ok(compiledHtml.includes('Table of Contents'), 'Output should contain TOC block');
        assert.ok(compiledHtml.includes('@media print'), 'Output should contain print-specific styles');
        assert.ok(compiledHtml.includes('style-oxford'), 'Output should contain style class decoration');

        console.log('✓ TEST 4 Passed.\n');

        // ==========================================
        // TEST 5: Academic Preprocessor & LOF/LOT Generator
        // ==========================================
        console.log('TEST 5: Verifying Academic Preprocessor and List of Figures/Tables Generator...');
        
        // Setup a mock thesis folder
        const academicTestDir = path.join(__dirname, 'temp_academic_project');
        if (fs.existsSync(academicTestDir)) {
            fs.rmSync(academicTestDir, { recursive: true, force: true });
        }
        fs.mkdirSync(academicTestDir);
        fs.mkdirSync(path.join(academicTestDir, 'chapters'));

        // Write a mock chapter containing images, tables, citations, and bibliography
        const mockIntro = `
# Chapter 1: Intro

See citations here [@raissi2019] and [@albergo2019].
Here is a figure:
![Quantum Neural Net Diagram](assets/diagram.png)

Here is a table:
| Grid | Time |
| :--- | :---: |
| 8x8  | 0.15s |

*Table 1.1: Convergence Speeds*
`;
        fs.writeFileSync(path.join(academicTestDir, 'chapters', 'introduction.md'), mockIntro, 'utf-8');

        // Create empty lof.md and lot.md files to trigger generator
        fs.writeFileSync(path.join(academicTestDir, 'chapters', 'lof.md'), '# List of Figures\n', 'utf-8');
        fs.writeFileSync(path.join(academicTestDir, 'chapters', 'lot.md'), '# List of Tables\n', 'utf-8');
        fs.writeFileSync(path.join(academicTestDir, 'chapters', 'bibliography.md'), '# Bibliography\n- [@raissi2019] Raissi et al\n- [@albergo2019] Albergo et al\n', 'utf-8');

        const mockConfig = {
            type: 'thesis',
            title: 'Test Academic Book',
            contentDir: 'chapters'
        };

        const mockNodes = [
            { path: 'chapters/introduction.md', filePath: path.join(academicTestDir, 'chapters', 'introduction.md'), title: 'Introduction' },
            { path: 'chapters/lof.md', filePath: path.join(academicTestDir, 'chapters', 'lof.md'), title: 'List of Figures' },
            { path: 'chapters/lot.md', filePath: path.join(academicTestDir, 'chapters', 'lot.md'), title: 'List of Tables' },
            { path: 'chapters/bibliography.md', filePath: path.join(academicTestDir, 'chapters', 'bibliography.md'), title: 'Bibliography' }
        ];

        // 1. Run LOF/LOT generation
        await bookEngine.autoGenerateLofAndLot(academicTestDir, mockConfig, mockNodes);

        // Verify LOF has figure entry
        const lofContent = fs.readFileSync(path.join(academicTestDir, 'chapters', 'lof.md'), 'utf-8');
        assert.ok(lofContent.includes('Figure: Quantum Neural Net Diagram'), 'LOF should contain generated figure link');
        assert.ok(lofContent.includes('introduction.md#fig-quantum-neural-net-diagram'), 'LOF should point to correct anchor');

        // Verify LOT has table entry
        const lotContent = fs.readFileSync(path.join(academicTestDir, 'chapters', 'lot.md'), 'utf-8');
        assert.ok(lotContent.includes('Table: Table 1.1: Convergence Speeds'), 'LOT should contain table link');
        assert.ok(lotContent.includes('introduction.md#tab-table-1-1-convergence-speeds'), 'LOT should point to correct table anchor');

        // 2. Preprocess markdown for introduction.md and bibliography.md
        const originalIntro = fs.readFileSync(path.join(academicTestDir, 'chapters', 'introduction.md'), 'utf-8');
        const preprocessedIntro = bookEngine.preprocessMarkdownForAcademicFeatures(originalIntro, 'chapters/introduction.md', mockConfig, false);

        assert.ok(preprocessedIntro.includes('id="fig-quantum-neural-net-diagram"'), 'Preprocessed intro should contain figure anchor div');
        assert.ok(preprocessedIntro.includes('id="tab-table-1-1-convergence-speeds"'), 'Preprocessed intro should contain table anchor div');
        assert.ok(preprocessedIntro.includes('<a href="bibliography.html#ref-raissi2019"'), 'Preprocessed intro should contain citation link');

        const originalBib = fs.readFileSync(path.join(academicTestDir, 'chapters', 'bibliography.md'), 'utf-8');
        const preprocessedBib = bookEngine.preprocessMarkdownForAcademicFeatures(originalBib, 'chapters/bibliography.md', mockConfig, false);
        assert.ok(preprocessedBib.includes('id="ref-raissi2019"'), 'Preprocessed bibliography should contain ref anchors');

        // Cleanup academic test dir
        fs.rmSync(academicTestDir, { recursive: true, force: true });

        console.log('✓ TEST 5 Passed.\n');

        // ==========================================
        // TEST 6: Verifying mathEngine and custom.css stylesheet bundling
        // ==========================================
        console.log('TEST 6: Verifying mathEngine and custom.css stylesheet bundling...');
        const test6Dir = path.join(__dirname, 'temp_test6_project');
        fs.mkdirSync(test6Dir, { recursive: true });
        
        // Write custom.css
        fs.writeFileSync(path.join(test6Dir, 'custom.css'), 'body { background-color: purple !important; }', 'utf-8');
        
        // Write config with mathEngine: 'mathjax'
        const test6Config = {
            ...bookEngine.defaultConfig,
            title: 'MathJax and Custom CSS test',
            type: 'thesis',
            mathEngine: 'mathjax',
            bookStyle: 'standard'
        };
        fs.writeFileSync(path.join(test6Dir, 'book.config.json'), JSON.stringify(test6Config), 'utf-8');
        
        // Write summary
        fs.writeFileSync(path.join(test6Dir, 'SUMMARY.md'), '# Summary\n\n- [Ch1](chapters/chapter-01.md)\n', 'utf-8');
        fs.mkdirSync(path.join(test6Dir, 'chapters'), { recursive: true });
        fs.writeFileSync(path.join(test6Dir, 'chapters', 'chapter-01.md'), '# Chapter 1\n\n$$\\sin^2(x) + \\cos^2(x) = 1$$\n', 'utf-8');

        // Build
        const build6Result = await bookEngine.build(test6Dir);
        
        // Verify custom.css was appended to book.css
        const compiledCss = fs.readFileSync(path.join(build6Result.outputDir, 'assets', 'book.css'), 'utf-8');
        assert.ok(compiledCss.includes('purple !important'), 'Compiled stylesheet should include custom.css content');

        // Verify HTML loads MathJax and math delimiters are preserved
        const indexHtml = fs.readFileSync(path.join(build6Result.outputDir, 'index.html'), 'utf-8');
        assert.ok(indexHtml.includes('tex-svg.js'), 'Compiled HTML should load MathJax CDN script');
        assert.ok(!indexHtml.includes('katex.min.css'), 'Compiled HTML should not load KaTeX in MathJax mode');
        
        const ch1Html = fs.readFileSync(path.join(build6Result.outputDir, '01-ch1.html'), 'utf-8');
        assert.ok(ch1Html.includes('\\[\\sin^2(x) + \\cos^2(x) = 1\\]'), 'Delimiters should be preserved in HTML output for MathJax');

        // Cleanup
        fs.rmSync(test6Dir, { recursive: true, force: true });
        console.log('✓ TEST 6 Passed.\n');

        // ==========================================
        // TEST 7: University Template with Custom Chapter/Appendix Counts
        // ==========================================
        console.log('TEST 7: Verifying custom chapter/appendix counts with built-in university preset templates...');
        const test7Dir = path.join(__dirname, 'temp_thesis_test7');
        if (fs.existsSync(test7Dir)) {
            fs.rmSync(test7Dir, { recursive: true, force: true });
        }

        const builtinCambridgePath = path.join(rootDir, 'src/templates/thesis/cambridge');

        await bookEngine.initProject(test7Dir, {
            type: 'thesis',
            title: 'Custom Counts Sim',
            author: 'Jane Doe',
            chapterCount: 7,
            appendixCount: 3,
            university: 'cambridge',
            customTemplatePath: builtinCambridgePath
        });

        // Verify counts
        assert.ok(fs.existsSync(path.join(test7Dir, 'SUMMARY.md')), 'SUMMARY.md should exist');
        assert.ok(fs.existsSync(path.join(test7Dir, 'chapters', 'chapter-07.md')), 'chapter-07.md should be created');
        assert.ok(fs.existsSync(path.join(test7Dir, 'appendices', 'appendix-03.md')), 'appendix-03.md should be created');

        const summaryContent7 = fs.readFileSync(path.join(test7Dir, 'SUMMARY.md'), 'utf-8');
        assert.ok(summaryContent7.includes('chapters/chapter-07.md'), 'SUMMARY.md should reference chapter-07.md');
        assert.ok(summaryContent7.includes('appendices/appendix-03.md'), 'SUMMARY.md should reference appendix-03.md');
        assert.ok(summaryContent7.includes('Appendix C:'), 'SUMMARY.md should reference Appendix C');

        // Cleanup
        fs.rmSync(test7Dir, { recursive: true, force: true });
        console.log('✓ TEST 7 Passed.\n');

    } catch (err) {
        console.error('❌ Unit test suite failed with error:', err);
        process.exit(1);
    } finally {
        // Clean up temporary project directories
        const tempAcademicDir = path.join(__dirname, 'temp_academic_project');
        if (fs.existsSync(tempAcademicDir)) {
            fs.rmSync(tempAcademicDir, { recursive: true, force: true });
        }
        if (fs.existsSync(testProjectDir)) {
            fs.rmSync(testProjectDir, { recursive: true, force: true });
        }
        if (fs.existsSync(testTemplateDir)) {
            fs.rmSync(testTemplateDir, { recursive: true, force: true });
        }
        const tempTemplatesDir = path.join(__dirname, 'temp_templates');
        if (fs.existsSync(tempTemplatesDir)) {
            fs.rmSync(tempTemplatesDir, { recursive: true, force: true });
        }
        if (fs.existsSync(customProjectDir)) {
            fs.rmSync(customProjectDir, { recursive: true, force: true });
        }
    }

    console.log('All Academic Thesis Mode unit tests completed successfully!');
}

run();
