---
theme: berkeley
title: MarkDD Presentation Demo
author: MarkDD Team
date: November 8, 2025
---

# Welcome to MarkDD Presentations

Create beautiful Beamer-style presentations in Markdown

---

## Key Features

- **28 Professional Themes** - Classic Beamer styles plus modern variants
- **Live Preview** - See your slides in real-time
- **Multiple Exports** - HTML and PDF output
- **Easy Syntax** - Just write Markdown

---

## Creating Slides

Slides are separated by three dashes: `---`

Each slide can contain:
- Headers (`#`, `##`, `###`)
- Lists (bullets and numbered)
- Code blocks
- Images
- Math equations

---

## Mathematical Content

Inline math: $E = mc^2$

Display math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

Complex equations:
$$
\nabla \times \vec{E} = -\frac{\partial \vec{B}}{\partial t}
$$

---

## Code Examples

Python code with syntax highlighting:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

---

## Available Themes

### Classic Beamer Themes
berkeley, berlin, copenhagen, darmstadt, warsaw, madrid, annarbor, cambridgeus, pittsburgh, rochester, boadilla, antibes, juanlespins, montpellier, malmoe, singapore, szeged, hannover, marburg, goettingen

### Color Variants
berkeley-dark, berlin-light, copenhagen-blue, madrid-green

### Modern Themes
simple-light, simple-dark, minimal-gray, corporate-blue

---

## How to Use

1. **Create** - `Presentation → New Presentation` (Ctrl+Shift+N)
2. **Edit** - Write your content in Markdown
3. **Preview** - `Presentation → Preview Slides` (Ctrl+Shift+V)
4. **Theme** - `Presentation → Choose Theme → [Select]`
5. **Export** - `Presentation → Export as HTML/PDF`

---

## Speaker Notes

You can add notes that won't appear in the presentation:

<!-- Speaker notes: Remember to emphasize the easy-to-use interface -->

These notes are only visible in the markdown source, not in the rendered slides.

---

## Lists and Structure

**Bullet Lists:**
- First point
- Second point
  - Sub-point A
  - Sub-point B
- Third point

**Numbered Lists:**
1. Step one
2. Step two
3. Step three

---

## Images

You can include images in your slides:

```markdown
![Alt text](path/to/image.png)
```

Images will be automatically sized to fit the slide.

---

## Tables

| Feature | Status |
|---------|--------|
| 28 Themes | ✅ |
| Live Preview | ✅ |
| HTML Export | ✅ |
| PDF Export | ✅ |
| Math Support | ✅ |

---

## Export Options

### HTML Export
- **Standalone file** - All CSS/JS embedded
- **Offline-ready** - No internet required
- **Shareable** - Send to anyone

### PDF Export
- **Print-quality** - High resolution
- **One slide per page** - Professional layout
- **Preserves styling** - Theme colors maintained

---

## Best Practices

1. **Keep slides simple** - One main idea per slide
2. **Use visuals** - Images, diagrams, and code
3. **Consistent style** - Stick to one theme
4. **Practice timing** - Preview before presenting
5. **Use speaker notes** - Remember key points

---

## Tips & Tricks

- Use `#` for slide titles (large headers)
- Use `##` for section headers (medium headers)
- Use `###` for sub-sections (smaller headers)
- Keep bullet points concise (3-7 words max)
- Use math for equations ($...$  or $$...$$)
- Add speaker notes with `<!-- ... -->`

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| New Presentation | Ctrl+Shift+N |
| Preview Slides | Ctrl+Shift+V |
| Save | Ctrl+S |
| Save As | Ctrl+Shift+S |
| Close Tab | Ctrl+W |

---

## Advanced Features

### Front Matter Configuration

```yaml
---
theme: madrid
title: My Talk
author: John Doe
date: 2025-11-08
---
```

All fields are optional. Default theme is `berkeley`.

---

## Theme Showcase

Try different themes to find your favorite:

- **Academic:** berkeley, cambridge, copenhagen
- **Professional:** corporate-blue, minimal-gray, simple-light
- **Colorful:** madrid, pittsburgh, rochester
- **Dark:** berkeley-dark, simple-dark
- **Modern:** berlin-light, minimal-gray

Change theme from menu: `Presentation → Choose Theme`

---

## Integration with MarkDD

Presentations integrate seamlessly with:
- **Tab system** - Multiple presentations in tabs
- **File management** - Save/open like regular files
- **Export system** - Same export menu structure
- **Preview system** - Live preview while editing

---

## Technical Details

### Under the Hood
- **Markdown parser:** Marked.js
- **Theme system:** CSS-based with Beamer colors
- **Export engine:** Electron's PDF renderer
- **Preview:** Separate BrowserWindow

### File Format
Standard Markdown files (.md) with YAML front-matter. Compatible with any Markdown editor.

---

## Getting Help

- **Documentation:** Check README.md
- **Changelog:** See CHANGELOG-PRESENTATION-v1.2.0.md
- **Issues:** Report on GitHub
- **Examples:** This file!

---

## Conclusion

### What We Covered
✅ How to create presentations  
✅ 28 available themes  
✅ Math and code support  
✅ Export options  
✅ Best practices  

### Next Steps
🎯 Try creating your own presentation  
🎯 Experiment with different themes  
🎯 Export to HTML and PDF  

---

# Thank You!

## Questions?

**MarkDD Editor v1.2.0**  
Presentation System

<!-- Speaker notes: End with confidence, offer to demonstrate features -->
