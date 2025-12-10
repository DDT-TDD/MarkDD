(function () {
    var html = '';
    html += '<a class="diy export" data-type="json">' + _lang_pack[_lang_default]['panels']['export'] + 'Json</a>',
        html += '<a class="diy export" data-type="md">' + _lang_pack[_lang_default]['panels']['export'] + 'MD</a>',
        html += '<a class="diy export" data-type="png">' + _lang_pack[_lang_default]['panels']['export'] + 'PNG</a>',
        //html += '<a class="diy export" data-type="svg">' + _lang_pack[_lang_default]['panels']['export'] + 'SVG</a>',
        html += '<button class="diy input">' + _lang_pack[_lang_default]['panels']['import'] + '<input type="file" id="fileImport" accept=".json,.md,.xmind,.mmap,.mm"></button>';
    
    $('.editor-title').append(html);

    $('.diy').css({
        'margin-top': '0px',
        'float': 'left',
        'background-color': '#fff',
        'min-width': '62px',
        'text-decoration': 'none',
        'text-align': 'center',
        'color': '#666',
        'padding': '0 0 0 0',
        'border': 'none',
        'border-right': '1px solid #ccc',
        'border-top': '1px solid #ccc',
    });
    $('.diy').on('mouseover', function () {
        $(this).css('cursor', 'pointer');
    });
    $('#fileImport').on('mouseover', function () {
        $(this).css('cursor', 'pointer');
    });
    $('.input').css({
        'overflow': 'hidden',
        'position': 'relative',
    }).find('input').css({
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'inline-block',
        opacity: 0
    });

    //mouseover event load mindmap content as file to prepare for downloading
    $('.export').on('mouseover', function (event) {
        let $this = $(this),
            type = $this.data('type'),
            exportType, blob;
        $this.css('cursor', 'pointer');

        if (type === 'md')
            exportType = 'markdown';
        else
            exportType = type;

        editor.minder.exportData(exportType).then(function (content) {

            if (exportType === 'png') {
                //write mindmap data to PNG file
                let arr = content.split(','), mime = arr[0].match(/:(.*?);/)[1],
                    bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                blob = new Blob([u8arr], { type: mime });
            }
            else
                blob = new Blob([content], { type: 'application/' + type });

            let url = URL.createObjectURL(blob);
            let aLink = $this[0];
            aLink.href = url;
            aLink.download = $('#node_text1').text() + '.' + type;
        });
    });

    //read mindmap data from import json or md file
    $('#fileImport').on('change', function () {
        let file = fileImport.files[0],
            importType = file.name.substr(file.name.lastIndexOf('.') + 1);
        //console.log(file);
        switch (importType) {
            case 'md':
                importType = 'markdown';
                readContent(importType, file);
                break;
            case 'json':
                readContent(importType, file);
                break;
            case 'mmap':
                importType = 'mindmanager';
                editor.minder.importData(importType, file,0).then(function (data) {
                    $(fileImport).val('');
                });
                break;
            case 'xmind':
                editor.minder.importData(importType, file,0).then(function (data) {
                    $(fileImport).val('');
                });
                break;
            case 'mm':
                // FreeMind/Freeplane format - read as XML text and convert
                importFreeMindFile(file);
                break;
            default:
                console.log("File not supported!");
                alert('Supported formats: Markdown (.md), JSON (.json), XMind (.xmind), MindManager (.mmap), FreeMind (.mm)');
                return;
        }
        function readContent(importType, file) {
            let reader = new FileReader();
            reader.onload = function (e) {
                let content = reader.result;
                editor.minder.importData(importType, content).then(function (data) {
                    $(fileImport).val('');
                });
            }
            reader.readAsText(file);
        }
    });
    
    // FreeMind (.mm) file import handler
    function importFreeMindFile(file) {
        let reader = new FileReader();
        reader.onload = function(e) {
            try {
                let content = reader.result;
                let parser = new DOMParser();
                let xmlDoc = parser.parseFromString(content, 'text/xml');
                
                // Check for parse errors
                let parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    throw new Error('Invalid XML format');
                }
                
                // Convert FreeMind XML to KityMinder JSON format
                let kityMinderData = convertFreeMindToKityMinder(xmlDoc);
                
                // Import the converted data
                editor.minder.importJson(kityMinderData);
                $(fileImport).val('');
                console.log('[KityMinder] FreeMind file imported successfully');
            } catch (error) {
                console.error('[KityMinder] FreeMind import error:', error);
                alert('Failed to import FreeMind file: ' + error.message);
                $(fileImport).val('');
            }
        };
        reader.readAsText(file);
    }
    
    // Convert FreeMind XML to KityMinder format
    function convertFreeMindToKityMinder(xmlDoc) {
        let mapEl = xmlDoc.querySelector('map');
        if (!mapEl) {
            throw new Error('Invalid FreeMind file: No map element found');
        }
        
        let rootNode = mapEl.querySelector('node');
        if (!rootNode) {
            throw new Error('Invalid FreeMind file: No root node found');
        }
        
        function convertNode(nodeElement) {
            let text = nodeElement.getAttribute('TEXT') || 
                       nodeElement.getAttribute('text') || 
                       'Untitled';
            
            let nodeData = {
                data: { 
                    text: text,
                    id: 'fm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
                },
                children: []
            };
            
            // Get link/hyperlink
            let link = nodeElement.getAttribute('LINK') || nodeElement.getAttribute('link');
            if (link) {
                nodeData.data.hyperlink = link;
            }
            
            // Get note (richcontent with TYPE="NOTE")
            let noteEl = nodeElement.querySelector('richcontent[TYPE="NOTE"]');
            if (noteEl) {
                nodeData.data.note = noteEl.textContent.trim();
            }
            
            // Get icons for priority/progress
            let icons = nodeElement.querySelectorAll('icon');
            icons.forEach(function(icon) {
                let builtin = icon.getAttribute('BUILTIN') || icon.getAttribute('builtin');
                if (builtin && builtin.includes('full-')) {
                    nodeData.data.priority = parseInt(builtin.replace(/\D/g, '')) || 1;
                }
            });
            
            // Get children nodes (direct children only)
            let childNodes = nodeElement.querySelectorAll(':scope > node');
            childNodes.forEach(function(child) {
                nodeData.children.push(convertNode(child));
            });
            
            return nodeData;
        }
        
        return {
            root: convertNode(rootNode),
            template: 'default',
            theme: 'fresh-blue',
            version: '1.4.50'
        };
    }
    
    // Global flag for text centering
    var textCenteringEnabled = true;
    
    // Keyboard shortcut for text centering: Ctrl+Shift+C
    $(document).on('keydown', function(e) {
        // Ctrl+Shift+C to toggle text centering
        if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
            e.preventDefault();
            textCenteringEnabled = !textCenteringEnabled;
            applyTextCenteringToAllNodes();
            
            // Show visual feedback
            showCenteringToast(textCenteringEnabled ? 'Text Centering: ON' : 'Text Centering: OFF');
            console.log('[KityMinder] Text centering:', textCenteringEnabled ? 'enabled' : 'disabled');
        }
    });
    
    // Show a brief toast notification
    function showCenteringToast(message) {
        var existingToast = document.getElementById('centering-toast');
        if (existingToast) existingToast.remove();
        
        var toast = document.createElement('div');
        toast.id = 'centering-toast';
        toast.textContent = message;
        toast.style.cssText = 'position: fixed; top: 60px; left: 50%; transform: translateX(-50%); ' +
            'background: rgba(0,0,0,0.8); color: white; padding: 8px 16px; border-radius: 4px; ' +
            'font-size: 13px; z-index: 10000; transition: opacity 0.3s;';
        document.body.appendChild(toast);
        
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
        }, 1500);
    }
    
    // Apply text centering to all nodes in the mind map
    function applyTextCenteringToAllNodes() {
        if (!editor || !editor.minder) {
            console.log('[KityMinder] Editor not ready for text centering');
            return;
        }
        
        try {
            // Find the SVG paper element - it's inside .minder-editor
            var paper = document.querySelector('.minder-editor svg');
            if (!paper) {
                paper = document.querySelector('svg.kity-paper');
            }
            if (!paper) {
                console.log('[KityMinder] SVG paper not found');
                return;
            }
            
            // Find all text groups (groups with id starting with "node_text")
            var textGroups = paper.querySelectorAll('g[id^="node_text"]');
            console.log('[KityMinder] Found', textGroups.length, 'text groups');
            
            textGroups.forEach(function(textGroup) {
                var textElements = textGroup.querySelectorAll('text');
                // Only center if there are multiple lines (more than 1 text element)
                if (textElements.length > 1) {
                    centerTextElements(textElements, textCenteringEnabled);
                }
            });
            
            console.log('[KityMinder] Text centering applied:', textCenteringEnabled ? 'ON' : 'OFF');
        } catch (e) {
            console.log('[KityMinder] Text centering error:', e);
        }
    }
    
    // Center text elements within a text group
    function centerTextElements(textElements, shouldCenter) {
        if (!textElements || textElements.length === 0) return;
        
        // Calculate the max width among all text lines
        var maxWidth = 0;
        var widths = [];
        textElements.forEach(function(textEl) {
            try {
                var bbox = textEl.getBBox();
                widths.push(bbox.width);
                if (bbox.width > maxWidth) maxWidth = bbox.width;
            } catch (e) {
                widths.push(0);
            }
        });
        
        // Apply centering to each text element
        textElements.forEach(function(textEl, index) {
            try {
                var bbox = textEl.getBBox();
                if (shouldCenter) {
                    // Center: set x to center position with text-anchor middle
                    var centerX = maxWidth / 2;
                    textEl.setAttribute('x', centerX);
                    textEl.setAttribute('text-anchor', 'middle');
                } else {
                    // Left align: set x to 0 with text-anchor start
                    textEl.setAttribute('x', '0');
                    textEl.setAttribute('text-anchor', 'start');
                }
            } catch (e) {}
        });
    }
    
    // Hook into minder events to maintain text centering after renders
    function setupTextCenteringHook() {
        if (!editor || !editor.minder) {
            setTimeout(setupTextCenteringHook, 500);
            return;
        }
        
        // Listen for render events and re-apply centering
        editor.minder.on('contentchange layoutfinish noderender', function() {
            if (textCenteringEnabled) {
                setTimeout(applyTextCenteringToAllNodes, 100);
            }
        });
        
        // Apply initial centering
        setTimeout(applyTextCenteringToAllNodes, 200);
    }

    window.onload = function () {
        // init loading mindmap diagram and the existed mindmap data or create new default mindmap json data
        let parent = window.parent.document.getElementById('mindmap_diagram_json');
        let data_json, maintopic = _lang_pack[_lang_default]['maintopic'];
        let init_data_json = `{"root":{"data":{"id":"cmhllt94xb40","created":1661683403686,"text":"${maintopic}"},"children":[{"data":{"id":"cybyhdvw3qg0","created":1704984272746,"text":"Topic1"},"children":[]},{"data":{"id":"cybyhfxtzd40","created":1704984277217,"text":"Topic2"},"children":[]},{"data":{"id":"cybyhhzf1ew0","created":1704984281667,"text":"Topic3"},"children":[]},{"data":{"id":"cybyhjs9st40","created":1704984285588,"text":"Topic4"},"children":[]}]},"template":"default","theme":"fresh-purple","version":"1.4.50"}`;

        if (parent != null && parent.value != "")
            data_json = parent.value;
        else
            data_json = init_data_json;

        //loading mindmap data in diagram
        editor.minder.importData('json', data_json).then(function (data) {
            //console.log(data);
            $(data_json).val('');
            
            // Setup text centering hook after data is loaded
            setupTextCenteringHook();
        });

        //set a timmer to sync mindmap data to parent diagram to save data per 1s
        if (parent != null)
            setInterval(function () {
                editor.minder.exportData('json').then(function (jsoncontent) {
                    //json and png data not to save until changing
                    if (jsoncontent != init_data_json && parent.value != jsoncontent) {
                        parent.value = jsoncontent;
                        editor.minder.exportData('png').then(function (pngcontent) {
                            let parent_png = window.parent.document.getElementById('mindmap_diagram_png');
                            if (parent_png.value != pngcontent)
                                parent_png.value = pngcontent;
                        });
                    }
                });
            }, 1000);

        // setInterval(function () {
        // 	editor.minder.exportData('json').then(function (jsoncontent) {
        // 		//json and png data not to save until changing
        // 		if (jsoncontent != init_data_json && mindmap_diagram_json != jsoncontent) {
        // 			mindmap_diagram_json = jsoncontent;
        // 			editor.minder.exportData('png').then(function (pngcontent) {
        // 				if (mindmap_diagram_png != pngcontent)
        // 					mindmap_diagram_png = pngcontent;
        // 			});
        // 		}
        // 	});

        // }, 1000);

        // mousewheel scroll zoom in/out
        $(".minder-editor").on('mousewheel DOMMouseScroll', function (event) {
            if (event.ctrlKey == true) {
                event.preventDefault();
                if (event.originalEvent.wheelDelta > 0) {
                    //console.log('Down');
                    editor.minder.execCommand('zoomIn');
                } else {
                    //console.log('Up');
                    editor.minder.execCommand('zoomOut');
                }
            }
        });
    }
})();
