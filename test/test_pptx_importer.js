const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const JSZip = require('jszip');

async function run() {
    console.log('Starting PPTX Importer unit test...');

    // 1. Initialize a JSDOM window
    const dom = new JSDOM('<!doctype html><html><body></body></html>');
    const window = dom.window;
    
    global.window = window;
    global.document = window.document;
    global.DOMParser = window.DOMParser;

    // 2. Load PPTXImporter
    const PPTXImporter = require(path.join(__dirname, '../src/renderer/js/pptx-importer.js'));

    // 3. Create mock PPTX ZIP in memory
    const zip = new JSZip();
    
    // Theme XML
    const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
        <a:themeElements>
            <a:clrScheme name="Office">
                <a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>
                <a:lt1><a:sysClr val="window" lastClr="EEEEEE"/></a:lt1>
                <a:dk2><a:srgbClr val="222222"/></a:dk2>
                <a:lt2><a:srgbClr val="DDDDDD"/></a:lt2>
                <a:accent1><a:srgbClr val="FF0000"/></a:accent1>
                <a:accent2><a:srgbClr val="00FF00"/></a:accent2>
            </a:clrScheme>
        </a:themeElements>
    </a:theme>`;
    zip.file('ppt/theme/theme1.xml', themeXml);

    // Presentation XML
    const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:sldIdLst>
            <p:sldId id="256" r:id="rId2"/>
        </p:sldIdLst>
    </p:presentation>`;
    zip.file('ppt/presentation.xml', presXml);

    // Presentation Rels XML
    const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
    </Relationships>`;
    zip.file('ppt/_rels/presentation.xml.rels', presRelsXml);

    // Slide 1 XML
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
            <p:spTree>
                <!-- Title shape -->
                <p:sp>
                    <p:nvSpPr>
                        <p:cNvSpPr txBox="1"/>
                        <p:nvPr>
                            <p:ph type="title"/>
                        </p:nvPr>
                    </p:nvSpPr>
                    <p:txBody>
                        <a:p>
                            <a:r>
                                <a:t>Mock Slide Title</a:t>
                            </a:r>
                        </a:p>
                    </p:txBody>
                </p:sp>
                <!-- Content shape -->
                <p:sp>
                    <p:nvSpPr>
                        <p:cNvSpPr txBox="1"/>
                        <p:nvPr>
                            <p:ph type="body"/>
                        </p:nvPr>
                    </p:nvSpPr>
                    <p:txBody>
                        <a:p>
                            <a:pPr lvl="0"/>
                            <a:r><a:t>Bullet Level 0</a:t></a:r>
                        </a:p>
                        <a:p>
                            <a:pPr lvl="1"/>
                            <a:r><a:t>Bullet Level 1</a:t></a:r>
                        </a:p>
                    </p:txBody>
                </p:sp>
            </p:spTree>
        </p:cSld>
    </p:sld>`;
    zip.file('ppt/slides/slide1.xml', slide1Xml);

    // 4. Write zip file to a temp path
    const tempFilePath = path.join(__dirname, 'temp_mock_presentation.pptx');
    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(tempFilePath, content);

    try {
        // 5. Test importing
        console.log('Testing PPTXImporter.importFile()...');
        const md = await PPTXImporter.importFile(tempFilePath, 'both');
        
        console.log('Generated Markdown Output:');
        console.log(md);

        // Verification checks
        if (!md.includes('presentation: true')) {
            throw new Error('Missing presentation: true in front-matter');
        }
        
        if (!md.includes('background: "#EEEEEE"') || !md.includes('primary: "#FF0000"')) {
            throw new Error('Theme colors not extracted correctly');
        }

        if (!md.includes('# Mock Slide Title')) {
            throw new Error('Title shape text not parsed or formatted correctly');
        }

        if (!md.includes('- Bullet Level 0') || !md.includes('  - Bullet Level 1')) {
            throw new Error('List levels or bullets not parsed correctly');
        }

        console.log('SUCCESS: PPTX Importer unit test passed successfully!');
    } finally {
        // Clean up temp file and media directory
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
        const tempMediaDir = path.join(__dirname, 'temp_mock_presentation_media');
        if (fs.existsSync(tempMediaDir)) {
            fs.rmSync(tempMediaDir, { recursive: true, force: true });
        }
    }
}

run().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
