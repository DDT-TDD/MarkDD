const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { BookEngine } = require('../src/common/book-engine');

(async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'markdd-book-'));
  const occupiedServer = http.createServer((req, res) => res.end('ok'));
  let engine;

  try {
    await new Promise((resolve, reject) => {
      occupiedServer.once('error', reject);
      occupiedServer.listen(0, '127.0.0.1', resolve);
    });

    const port = occupiedServer.address().port;
    engine = new BookEngine(console);
    engine.build = async () => ({ outputDir: tempDir, config: {} });

    const result = await engine.serve(tempDir, { port, watch: false });
    assert.notStrictEqual(result.port, port, 'expected the preview server to use a different port when the requested one is already occupied');
    console.log(`Port fallback test passed with port ${result.port}`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve) => occupiedServer.close(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    try {
      await new Promise((resolve) => {
        if (engine && typeof engine.stopServer === 'function') {
          engine.stopServer().then(() => resolve()).catch(() => resolve());
        } else {
          resolve();
        }
      });
    } catch (_) {}
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
})();
