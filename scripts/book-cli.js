#!/usr/bin/env node
const path = require('path');
const process = require('process');
const { BookEngine } = require('../src/common/book-engine');

const engine = new BookEngine(console);

function printHelp() {
    console.log(`MarkDD Book CLI\n\nUsage:\n  npm run book -- <command> [path] [options]\n\nCommands:\n  init [dir]        Initialize a book project (SUMMARY.md + samples)\n  build [dir]       Build static HTML folder and PDF output\n  serve [dir]       Serve the book locally (Ctrl+C to stop)\n\nOptions:\n  --title "My Book"   Set title on init\n  --author "Author"   Set author on init\n  --port 5050         Serve on custom port (default 4500)\n  --watch / --no-watch Toggle watch mode during serve`);
}

function parseArgs(argv) {
    const flags = {};
    const positional = [];
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith('--')) {
            positional.push(token);
            continue;
        }
        const [flag, value] = token.slice(2).split('=');
        if (value !== undefined) {
            flags[flag] = value;
            continue;
        }
        if (flag === 'watch') {
            flags.watch = true;
        } else if (flag === 'no-watch') {
            flags.watch = false;
        } else {
            const next = argv[i + 1];
            if (next && !next.startsWith('--')) {
                flags[flag] = next;
                i += 1;
            } else {
                flags[flag] = true;
            }
        }
    }
    return { flags, positional };
}

async function runInit(targetDir, flags) {
    const resolved = targetDir ? path.resolve(targetDir) : process.cwd();
    await engine.initProject(resolved, {
        title: flags.title,
        author: flags.author,
        description: flags.description
    });
    console.log(`Initialized book project at ${resolved}`);
}

async function runBuild(rootDir) {
    const resolved = rootDir ? path.resolve(rootDir) : process.cwd();
    const result = await engine.build(resolved, {});
    const metadata = result.manifest.metadata;
    const safeTitle = (metadata.title || 'book').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book';
    const pdfPath = path.join(result.outputDir, `${safeTitle}.pdf`);
    await engine.exportPdf(resolved, pdfPath, {});
    console.log(`HTML folder: ${result.outputDir}`);
    console.log(`PDF: ${pdfPath}`);
}

async function runServe(rootDir, flags) {
    const resolved = rootDir ? path.resolve(rootDir) : process.cwd();
    const serveOptions = {
        watch: flags.watch !== undefined ? flags.watch : true,
        port: flags.port ? Number(flags.port) : undefined
    };
    const result = await engine.serve(resolved, serveOptions);
    console.log(`Serving book at http://localhost:${result.port}`);
    if (serveOptions.watch) {
        console.log('Watch mode enabled. Rebuilding on changes...');
    }
    console.log('Press Ctrl+C to stop.');
    process.on('SIGINT', async () => {
        await engine.stopServer();
        console.log('\nBook server stopped.');
        process.exit(0);
    });
}

async function main() {
    const argv = process.argv.slice(2);
    if (!argv.length || argv[0] === 'help' || argv[0] === '--help') {
        printHelp();
        return;
    }
    const command = argv[0];
    const { flags, positional } = parseArgs(argv.slice(1));
    const targetPath = positional[0];

    try {
        switch (command) {
            case 'init':
                await runInit(targetPath, flags);
                break;
            case 'build':
                await runBuild(targetPath);
                break;
            case 'serve':
                await runServe(targetPath, flags);
                break;
            default:
                console.error(`Unknown command: ${command}`);
                printHelp();
                process.exitCode = 1;
        }
    } catch (error) {
        console.error(`[Book CLI] ${error.message || error}`);
        process.exitCode = 1;
    }
}

main();
