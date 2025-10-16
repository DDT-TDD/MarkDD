/**
 * LaTeX.js Fallback Implementation
 * Provides basic LaTeX document rendering when the main LaTeX.js library fails to load
 */

(function() {
    'use strict';

    console.log('[LaTeX-Fallback] Loading minimal LaTeX fallback implementation...');

    // Simple LaTeX document renderer
    class LaTeXFallback {
        constructor() {
            this.processedElements = new Set();
        }

        // Main processing function for LaTeX documents
        renderDocument(latexCode) {
            try {
                // Parse basic LaTeX structure
                const parsed = this.parseLatex(latexCode);
                return this.generateHTML(parsed);
            } catch (error) {
                return `<div class="latex-fallback-error">
                    <strong>LaTeX Fallback Error:</strong> ${error.message}
                    <details><summary>Show LaTeX Code</summary><pre><code>${latexCode}</code></pre></details>
                </div>`;
            }
        }

        // Parse basic LaTeX commands
        parseLatex(code) {
            const doc = {
                title: '',
                author: '',
                sections: [],
                content: []
            };

            // Extract title
            const titleMatch = code.match(/\\title\{([^}]+)\}/);
            if (titleMatch) {
                doc.title = titleMatch[1];
            }

            // Extract author
            const authorMatch = code.match(/\\author\{([^}]+)\}/);
            if (authorMatch) {
                doc.author = authorMatch[1];
            }

            // Extract sections
            const sectionRegex = /\\section\{([^}]+)\}/g;
            let match;
            while ((match = sectionRegex.exec(code)) !== null) {
                doc.sections.push({
                    title: match[1],
                    position: match.index
                });
            }

            // Extract basic content (simplified)
            const beginDocMatch = code.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
            if (beginDocMatch) {
                doc.content = this.parseContent(beginDocMatch[1]);
            }

            return doc;
        }

        // Parse content within document environment
        parseContent(content) {
            const elements = [];
            
            // Remove common LaTeX commands and keep text
            let processed = content
                .replace(/\\maketitle/g, '')
                .replace(/\\section\{([^}]+)\}/g, '<h2>$1</h2>')
                .replace(/\\subsection\{([^}]+)\}/g, '<h3>$1</h3>')
                .replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
                .replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>')
                .replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, (match, items) => {
                    const listItems = items.replace(/\\item\s*/g, '<li>').replace(/\n\s*$/g, '</li>');
                    return `<ul>${listItems}</ul>`;
                })
                .replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$$1$</div>')
                .replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>')
                .replace(/\n\s*\n/g, '</p><p>')
                .trim();

            if (processed) {
                processed = '<p>' + processed + '</p>';
            }

            return processed;
        }

        // Generate HTML from parsed LaTeX
        generateHTML(doc) {
            let html = '<div class="latex-document-fallback">';
            
            // Header
            html += '<div class="latex-header">';
            html += '<div class="diagram-type">LaTeX Document (Fallback)</div>';
            html += '<small>Basic rendering - install LaTeX.js for full features</small>';
            html += '</div>';
            
            // Document content
            html += '<div class="latex-content">';
            
            if (doc.title) {
                html += `<h1 class="latex-title">${doc.title}</h1>`;
            }
            
            if (doc.author) {
                html += `<p class="latex-author">by ${doc.author}</p>`;
            }
            
            if (doc.content) {
                html += doc.content;
            }
            
            html += '</div>';
            html += '</div>';
            
            return html;
        }
    }

    // Create global LaTeX interface
    const latexFallback = new LaTeXFallback();
    
    // Expose LaTeX function
    window.LaTeX = function(latexCode) {
        return {
            parse: () => latexFallback.parseLatex(latexCode),
            render: () => latexFallback.renderDocument(latexCode)
        };
    };
    
    // Also expose as latex for compatibility
    window.latex = window.LaTeX;
    
    // Mark that fallback is loaded to prevent loading failures
    window.LaTeXFallbackLoaded = true;

    console.log('[LaTeX-Fallback] Fallback implementation loaded successfully');
})();
