/**
 * KityMinder Fallback Implementation
 * Provides basic mind mapping when the main KityMinder library fails to load
 */

(function() {
    'use strict';

    console.log('[KityMinder-Fallback] Loading minimal KityMinder fallback implementation...');

    // Simple mind map renderer
    class KityMinderFallback {
        constructor() {
            this.processedElements = new Set();
        }

        // Create a basic mind map from JSON data
        createMindMap(container, data) {
            try {
                const html = this.renderMindMapHTML(data);
                container.innerHTML = html;
                return true;
            } catch (error) {
                container.innerHTML = `<div class="kityminder-fallback-error">
                    <strong>KityMinder Fallback Error:</strong> ${error.message}
                    <details><summary>Show Data</summary><pre><code>${JSON.stringify(data, null, 2)}</code></pre></details>
                </div>`;
                return false;
            }
        }

        // Render mind map as nested HTML structure
        renderMindMapHTML(data) {
            let html = '<div class="kityminder-fallback-container">';
            
            // Header
            html += '<div class="kityminder-header">';
            html += '<div class="diagram-type">KityMinder Mind Map (Fallback)</div>';
            html += '<small>Basic rendering - install KityMinder for interactive features</small>';
            html += '</div>';
            
            // Mind map content
            html += '<div class="kityminder-content">';
            html += this.renderNode(data, 0);
            html += '</div>';
            
            html += '</div>';
            return html;
        }

        // Render individual nodes recursively
        renderNode(node, level) {
            if (!node) return '';
            
            const text = node.text || node.data || node.topic || 'Node';
            const className = level === 0 ? 'root-node' : `level-${Math.min(level, 4)}-node`;
            
            let html = `<div class="mind-map-node ${className}">`;
            html += `<div class="node-content">${text}</div>`;
            
            if (node.children && node.children.length > 0) {
                html += '<div class="node-children">';
                for (const child of node.children) {
                    html += this.renderNode(child, level + 1);
                }
                html += '</div>';
            }
            
            html += '</div>';
            return html;
        }

        // Parse simple text-based mind map format
        parseTextMindMap(text) {
            const lines = text.split('\n').filter(line => line.trim());
            const root = { text: 'Mind Map', children: [] };
            const stack = [{ node: root, level: -1 }];
            
            for (const line of lines) {
                const level = (line.match(/^\s*/)[0].length / 2) | 0;
                const text = line.trim().replace(/^[-*+]\s*/, '');
                
                if (!text) continue;
                
                const node = { text: text, children: [] };
                
                // Find parent
                while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                    stack.pop();
                }
                
                if (stack.length > 0) {
                    stack[stack.length - 1].node.children.push(node);
                }
                
                stack.push({ node: node, level: level });
            }
            
            return root;
        }
    }

    // Create global KityMinder interface
    const kityMinderFallback = new KityMinderFallback();
    
    // Expose KityMinder function
    window.KityMinder = function() {
        return {
            createMindMap: (container, data) => kityMinderFallback.createMindMap(container, data),
            parseText: (text) => kityMinderFallback.parseTextMindMap(text)
        };
    };
    
    // Also expose as kityminder for compatibility
    window.kityminder = {
        create: (container, data) => kityMinderFallback.createMindMap(container, data),
        KityMinder: window.KityMinder
    };
    
    // Mark that fallback is loaded
    window.KityMinderFallbackLoaded = true;

    console.log('[KityMinder-Fallback] Fallback implementation loaded successfully');
})();
