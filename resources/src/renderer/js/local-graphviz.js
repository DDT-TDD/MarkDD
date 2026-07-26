/**
 * Local GraphViz Renderer using the local dot.exe executable
 * Fallback for when Viz.js CDN is unavailable
 */

// Prevent duplicate class declaration
if (typeof window === 'undefined' || !window.LocalGraphVizRenderer) {

class LocalGraphVizRenderer {
    constructor() {
        this.dotExecutablePath = null;
        this.initialized = false;
        this.setupPaths();
    }

    setupPaths() {
        // Local GraphViz installation paths
        const possiblePaths = [
            '../../References/Graphviz-13.1.2-win64/bin/dot.exe',
            '../../../References/Graphviz-13.1.2-win64/bin/dot.exe',
            'References/Graphviz-13.1.2-win64/bin/dot.exe'
        ];
        
        // Use the first available path (we'll check existence when needed)
        this.dotExecutablePath = possiblePaths[0];
        console.log('[LocalGraphViz] Initialized with dot path:', this.dotExecutablePath);
    }

    async isAvailable() {
        // Check if we're in an Electron environment with access to Node.js APIs
        if (typeof window !== 'undefined' && window.require) {
            try {
                const fs = window.require('fs');
                const path = window.require('path');
                
                // Resolve the absolute path
                const absolutePath = path.resolve(__dirname, this.dotExecutablePath);
                
                // Check if the dot.exe file exists
                return fs.existsSync(absolutePath);
            } catch (error) {
                console.log('[LocalGraphViz] Node.js APIs not available:', error.message);
                return false;
            }
        }
        return false;
    }

    async renderSVG(dotSource, engine = 'dot') {
        if (!await this.isAvailable()) {
            throw new Error('Local GraphViz not available');
        }

        try {
            const { spawn } = window.require('child_process');
            const path = window.require('path');
            
            // Resolve absolute path to dot.exe
            const absoluteDotPath = path.resolve(__dirname, this.dotExecutablePath);
            
            return new Promise((resolve, reject) => {
                // Spawn the dot process
                const dotProcess = spawn(absoluteDotPath, ['-T', 'svg', '-K', engine], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let svgOutput = '';
                let errorOutput = '';

                // Collect stdout (SVG output)
                dotProcess.stdout.on('data', (data) => {
                    svgOutput += data.toString();
                });

                // Collect stderr (error output)
                dotProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                // Handle process completion
                dotProcess.on('close', (code) => {
                    if (code === 0 && svgOutput.includes('<svg')) {
                        console.log('[LocalGraphViz] Successfully rendered SVG using local dot.exe');
                        resolve(svgOutput);
                    } else {
                        const error = errorOutput || `dot.exe exited with code ${code}`;
                        console.error('[LocalGraphViz] Error from dot.exe:', error);
                        reject(new Error(`GraphViz rendering failed: ${error}`));
                    }
                });

                // Handle process errors
                dotProcess.on('error', (error) => {
                    console.error('[LocalGraphViz] Failed to spawn dot.exe:', error);
                    reject(new Error(`Failed to execute local GraphViz: ${error.message}`));
                });

                // Send the DOT source to the process
                dotProcess.stdin.write(dotSource);
                dotProcess.stdin.end();
            });

        } catch (error) {
            console.error('[LocalGraphViz] Error setting up local GraphViz:', error);
            throw new Error(`Local GraphViz setup failed: ${error.message}`);
        }
    }

    async renderSVGElement(dotSource, options = {}) {
        const engine = options.engine || 'dot';
        
        try {
            const svgString = await this.renderSVG(dotSource, engine);
            
            // Parse SVG string into DOM element
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const svgElement = doc.documentElement;
            
            if (svgElement.tagName === 'svg') {
                return svgElement;
            } else {
                throw new Error('Invalid SVG output from local GraphViz');
            }
        } catch (error) {
            console.error('[LocalGraphViz] Failed to render SVG element:', error);
            throw error;
        }
    }
}

// Global instance - prevent redeclaration
if (typeof window !== 'undefined' && !window.LocalGraphVizRenderer) {
    window.LocalGraphVizRenderer = LocalGraphVizRenderer;
    window.localGraphViz = new LocalGraphVizRenderer();
    console.log('[LocalGraphViz] Global instance created');
} else if (typeof window !== 'undefined') {
    console.log('[LocalGraphViz] Already initialized, skipping redeclaration');
}

} // End of protection block

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalGraphVizRenderer;
}