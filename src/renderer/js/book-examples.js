/**
 * Embedded Book Examples for MarkDD
 * Pre-built example books to demonstrate features
 * These are read-only demos - not user projects
 */

class BookExamples {
    static getExample(type) {
        switch (type) {
            case 'classical':
                return this.getClassicalExample();
            case 'wiki':
                return this.getWikiExample();
            case 'help':
                return this.getHelpExample();
            case 'technical':
                return this.getTechnicalExample();
            default:
                return null;
        }
    }

    static getClassicalExample() {
        return {
            type: 'classical',
            config: {
                title: 'The Adventures of Pinocchio',
                author: 'Carlo Collodi',
                description: 'A classic tale of a wooden puppet who dreams of becoming a real boy',
                language: 'en',
                year: '1883'
            },
            structure: {
                root: [
                    {
                        title: 'Part I: The Making of a Marionette',
                        id: 'part-1',
                        sequence: 1,
                        children: [
                            { title: 'Chapter 1: The Talking Wood', link: 'chapter-01.md', sequence: 1, id: 'ch-01' },
                            { title: 'Chapter 2: Geppetto\'s Creation', link: 'chapter-02.md', sequence: 2, id: 'ch-02' },
                            { title: 'Chapter 3: First Pranks', link: 'chapter-03.md', sequence: 3, id: 'ch-03' }
                        ]
                    },
                    {
                        title: 'Part II: Adventures and Lessons',
                        id: 'part-2',
                        sequence: 2,
                        children: [
                            { title: 'Chapter 4: The Talking Cricket', link: 'chapter-04.md', sequence: 1, id: 'ch-04' },
                            { title: 'Chapter 5: Pinocchio is Hungry', link: 'chapter-05.md', sequence: 2, id: 'ch-05' },
                            { title: 'Chapter 6: Feet Burned Off', link: 'chapter-06.md', sequence: 3, id: 'ch-06' }
                        ]
                    },
                    {
                        title: 'Part III: Transformation',
                        id: 'part-3',
                        sequence: 3,
                        children: [
                            { title: 'Chapter 7: Geppetto Returns', link: 'chapter-07.md', sequence: 1, id: 'ch-07' }
                        ]
                    }
                ]
            },
            chapters: {
                'chapter-01.md': `# Chapter 1: The Talking Wood

_How it happened that Mastro Cherry, carpenter, found a piece of wood that wept and laughed like a child._

## The Mysterious Log

Centuries ago there lived—

"A king!" my little readers will say immediately.

No, children, you are mistaken. Once upon a time there was **a piece of wood**. It was not an expensive piece of wood. Far from it. Just a common block of firewood, one of those thick, solid logs that are put on the fire in winter to make cold rooms cozy and warm.

I do not know how this really happened, yet the fact remains that one fine day this piece of wood found itself in the shop of an old carpenter. His real name was Mastro Antonio, but everyone called him Mastro Cherry, for the tip of his nose was so round and red and shiny that it looked like a ripe cherry.

## A Strange Sound

As soon as he saw that piece of wood, Mastro Cherry was filled with joy. Rubbing his hands together happily, he mumbled half to himself:

> "This has come in the nick of time. I shall use it to make the leg of a table."

He grasped the hatchet quickly to peel off the bark and shape the wood. But as he was about to give it the first blow, he stood still with arm uplifted, for he had heard a wee, little voice say in a beseeching tone:

> "Please be careful! Do not hit me so hard!"

What a look of surprise shone on Mastro Cherry's face! His funny face became still funnier.

## The Voice

He turned frightened eyes about the room to find out where that wee, little voice had come from and he saw no one! He looked under the bench—no one! He peeped inside the closet—no one! He searched among the shavings—no one! He opened the door to look up and down the street—and still no one!

"Oh, I see!" he then said, laughing and scratching his wig. "It can easily be seen that I only thought I heard the tiny voice say the words! Well, well—to work once more."

He struck a most solemn blow upon the piece of wood.

"Oh, oh! You hurt!" cried the same far-away little voice.

Mastro Cherry grew dumb, his eyes popped out of his head, his mouth opened wide, and his tongue hung down on his chin.

---

**Continue to Chapter 2...**`,

                'chapter-02.md': `# Chapter 2: Geppetto's Creation

_Mastro Cherry gives the piece of wood to his friend Geppetto, who takes it to make himself a marionette that will dance, fence, and turn somersaults._

## An Unexpected Visitor

At that very instant, a loud knock sounded on the door.

"Come in," said the carpenter, not having an atom of strength left with which to stand up.

At the words, the door opened and a dapper little old man came in. His name was **Geppetto**, but to the boys of the neighborhood he was known as Polendina, on account of the wig he always wore which was just the color of yellow corn.

Geppetto had a very bad temper. Woe to the one who called him Polendina! He became as wild as a beast and no one could soothe him.

## Geppetto's Dream

"Good day, Mastro Antonio," said Geppetto. "What are you doing on the floor?"

"I am teaching the ants their A B C's."

"Good luck to you!"

"What brought you here, friend Geppetto?"

"My legs. And it may flatter you to know, Mastro Antonio, that I have come to you to beg for a favor."

"Here I am, at your service," answered the carpenter, raising himself on to his knees.

"This morning a fine idea came to me."

"Let's hear it."

## The Marionette Plan

"I thought of making myself a beautiful wooden marionette. It must be wonderful, one that will be able to **dance**, **fence**, and **turn somersaults**. With it I intend to go around the world, to earn my crust of bread and cup of wine. What do you think of it?"

"Bravo, Polendina!" cried the same tiny voice which came from no one knew where.

On hearing himself called Polendina, Master Geppetto turned the color of a red pepper and, facing the carpenter, said to him angrily:

"Why do you insult me?"

"Who is insulting you?"

"You called me Polendina."

"I did not."

---

**The adventure continues in Chapter 3...**`,

                'chapter-03.md': `# Chapter 3: First Pranks

_As soon as he gets home, Geppetto fashions the marionette and calls it Pinocchio. The first pranks of the marionette._

## The Creation Begins

Geppetto took the mysterious piece of wood home and set to work immediately.

"What shall I call him?" he said to himself. "I think I'll call him **PINOCCHIO**. This name will make his fortune. I knew a whole family of Pinocchios once—Pinocchio the father, Pinocchia the mother, and Pinocchi the children—and they were all lucky. The richest of them begged for his living."

## Coming to Life

After choosing the name for his marionette, Geppetto set seriously to work to make the hair, the forehead, the eyes.

Fancy his surprise when he noticed that the eyes moved and looked at him intently!

"Ugly wooden eyes, why do you stare so?" said Geppetto.

There was no answer.

After the eyes, Geppetto made the nose, which began to stretch as soon as finished. It stretched and stretched and stretched till it became so long, it seemed endless.

## Mischief Begins

Poor Geppetto kept cutting it and cutting it, but the more he cut, the longer grew that impertinent nose. In despair he let it alone.

Next he made the mouth. No sooner was it finished than it began to laugh and poke fun at him.

"Stop laughing!" said Geppetto angrily; but he might as well have spoken to the wall.

"Stop laughing, I say!" he roared in a voice of thunder.

The mouth stopped laughing, but it stuck out a long tongue.

---

**Continue to Chapter 4 to see what happens next...**`,

                'chapter-04.md': `# Chapter 4: The Talking Cricket

_The story of Pinocchio and the Talking Cricket, in which one sees that bad children do not like to be corrected by those who know more than they do._

## Wise Words Ignored

Very little time did it take to get poor old Geppetto to prison. In the meantime that rascal, Pinocchio, free now from the clutches of the carabineer, was running wildly across fields and meadows, taking one short cut after another toward home.

## A Small Voice

But his happiness lasted only a short time, for just then he heard someone saying in the room:

> "Cri-cri-cri!"

"Who is calling me?" asked Pinocchio, greatly frightened.

"I am!"

Pinocchio turned and saw a large cricket crawling slowly up the wall.

## The Cricket's Warning

"Tell me, Cricket, who are you?"

"I am the **Talking Cricket** and I have been living in this room for more than one hundred years."

"Today, however, this room is mine," said the marionette, "and if you wish to do me a favor, get out now, and don't turn around even once."

"I refuse to leave this spot," answered the Cricket, "until I have told you a great truth."

"Tell it, then, and hurry."

## The Lesson

"Woe to boys who refuse to obey their parents and run away from home! They will never be happy in this world, and when they are older they will be very sorry for it."

---

**The adventure intensifies in Chapter 5...**`,

                'chapter-05.md': `# Chapter 5: Pinocchio is Hungry

_Pinocchio is hungry and searches for something to eat._

## Hunger Strikes

Pinocchio was greatly ashamed, but he did not answer. Instead, he walked about the room, feeling the walls with his hands.

"I am hungry," said the marionette to himself. "Very, very hungry."

He went to the fireplace where the pot was boiling and was about to take off the cover to see what was in it, when—

## The Egg Mystery

Just then he saw something that made him jump back in surprise. What should he see there but an egg lying in the corner!

"Oh, joy!" cried Pinocchio. "I'll fry it and eat it!"

He broke it, but instead of the white and the yolk, a merry little chick flew out, crying:

> "A thousand thanks, friend Pinocchio, for opening my shell! Good-bye and good luck!"

And spreading its wings, it flew out the open window and disappeared from sight.

## Growing Desperation

The poor marionette stood as if turned to stone, with wide eyes, open mouth, and the empty halves of the egg-shell in his hands.

"The Talking Cricket was right," he said to himself. "If I had not run away from home and if Father were here now, I should not be dying of hunger."

---

**More adventures await in Chapter 6...**`,

                'chapter-06.md': `# Chapter 6: Feet Burned Off

_Pinocchio falls asleep with his feet on a foot warmer, and awakens the next day with his feet all burned off._

## A Dark Night

Pinocchio hated the dark street, but he was so hungry that, in spite of it, he ran out of the house. The night was pitch black. It thundered, and bright flashes of lightning now and again shot across the sky.

## The Village

The whole village was dark and deserted. The stores were closed, the doors, the windows. In the streets, not even a dog could be seen. It seemed the Village of the Dead.

Pinocchio, in desperation, ran up to a doorway, threw himself upon the bell, and pulled it wildly, saying to himself: "Someone will surely answer that!"

## Ice Water

After a minute or two, the same voice cried:

"Get under the window and hold out your hat!"

Pinocchio had no hat, but he managed to get under the window just in time to feel a shower of ice-cold water pour down on his poor wooden head, his shoulders, and over his whole body.

He returned home as wet as a rag, and tired out from weariness and hunger.

As he no longer had any strength left with which to stand, he sat down on a little stool and put his two feet on the stove to dry them.

There he fell asleep, and while he slept, his wooden feet began to burn. Slowly, very slowly, they blackened and turned to ashes.

---

**Continue to Chapter 7...**`,

                'chapter-07.md': `# Chapter 7: Geppetto Returns

_Geppetto returns home and gives his own breakfast to the marionette._

## The Reunion

The poor marionette, who was still half asleep, had not yet found out that his two feet were burned and gone. As soon as he heard his Father's voice, he jumped up from his seat to open the door, but, as he did so, he staggered and fell headlong to the floor.

In falling, he made as much noise as a sack of wood falling from the fifth story of a house.

"Open the door for me!" Geppetto shouted from the street.

"Father, dear Father, I can't," answered the marionette in despair, crying and rolling on the floor.

## Love and Forgiveness

"Why can't you?"

"Because someone has eaten my feet."

"And who has eaten them?"

"The cat," answered Pinocchio, seeing that little animal busily playing with some shavings in the corner of the room.

---

**And so the adventures continue...**

> "Remember, little children, that a lie can take you far away, but it will never bring you home."`
            }
        };
    }

    static getWikiExample() {
        return {
            type: 'wiki',
            config: {
                title: 'MarkDD Documentation Wiki',
                author: 'MarkDD Team',
                description: 'Comprehensive documentation for the MarkDD Editor',
                language: 'en'
            },
            structure: {
                root: [
                    { title: 'Home', link: 'home.md', sequence: 1, id: 'home' },
                    {
                        title: 'Getting Started',
                        id: 'getting-started-section',
                        sequence: 2,
                        children: [
                            { title: 'Installation', link: 'installation.md', sequence: 1, id: 'install' },
                            { title: 'Quick Start', link: 'quick-start.md', sequence: 2, id: 'quick' }
                        ]
                    },
                    {
                        title: 'Features',
                        id: 'features-section',
                        sequence: 3,
                        children: [
                            { title: 'Markdown Editing', link: 'markdown.md', sequence: 1, id: 'md' },
                            { title: 'Math & Diagrams', link: 'math-diagrams.md', sequence: 2, id: 'math' },
                            { title: 'Export Options', link: 'export.md', sequence: 3, id: 'export' }
                        ]
                    }
                ]
            },
            chapters: {
                'home.md': `# MarkDD Documentation Wiki

Welcome to the comprehensive documentation for **MarkDD Editor**!

## What is MarkDD?

MarkDD is a powerful Markdown editor with advanced features for creating beautiful documents, presentations, and books.

## Key Features

- ✨ **Real-time Preview** - See your changes instantly
- 📊 **Math Support** - KaTeX and MathJax rendering
- 🎨 **Diagrams** - Mermaid, TikZ, and more
- 📖 **Book Creation** - Multi-chapter book projects
- 🎬 **Presentations** - Create slideshows from Markdown
- 💾 **Multiple Exports** - HTML and PDF

## Quick Navigation

- [Installation Guide](installation.md)
- [Quick Start Tutorial](quick-start.md)
- [Feature Documentation](markdown.md)

## Getting Help

If you have questions, check the [Troubleshooting](troubleshooting.md) section or visit our GitHub repository.`,

                'installation.md': `# Installation Guide

## System Requirements

- **Windows**: Windows 10 or later
- **macOS**: macOS 10.13 or later
- **Linux**: Ubuntu 18.04+ or equivalent

## Download

Visit the [releases page](https://github.com/your-repo/releases) to download the latest version for your operating system.

## Installation Steps

### Windows
1. Download the \`.exe\` installer
2. Run the installer
3. Follow the setup wizard
4. Launch MarkDD from the Start menu

### macOS
1. Download the \`.dmg\` file
2. Open the DMG
3. Drag MarkDD to Applications
4. Launch from Applications folder

### Linux
1. Download the \`.AppImage\` or \`.deb\` file
2. Make executable: \`chmod +x MarkDD.AppImage\`
3. Run the application

## First Launch

On first launch, MarkDD will:
- Create a configuration directory
- Set up default themes
- Load example files

You're now ready to start creating!`,

                'quick-start.md': `# Quick Start Tutorial

## Creating Your First Document

1. Click **File → New** (or Ctrl+N)
2. Start typing in the editor
3. See live preview on the right

## Basic Markdown

\`\`\`markdown
# Heading 1
## Heading 2

**Bold text**
*Italic text*

- List item 1
- List item 2
\`\`\`

## Adding Math

Inline: \`$E = mc^2$\`

Display:
\`\`\`
$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
\`\`\`

## Saving Your Work

- **Save**: File → Save (Ctrl+S)
- **Save As**: File → Save As (Ctrl+Shift+S)
- **Auto-save**: Enable in settings

## Next Steps

- Explore [all Markdown features](markdown.md)
- Try [math and diagrams](math-diagrams.md)
- Learn about [exporting](export.md)`,

                'markdown.md': `# Markdown Editing Features

## Supported Syntax

MarkDD supports full GitHub-Flavored Markdown plus extensions.

### Headers

\`\`\`markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
\`\`\`

### Emphasis

- **Bold**: \`**text**\` or \`__text__\`
- *Italic*: \`*text*\` or \`_text_\`
- ~~Strikethrough~~: \`~~text~~\`

### Lists

**Unordered:**
\`\`\`markdown
- Item 1
- Item 2
  - Sub-item
\`\`\`

**Ordered:**
\`\`\`markdown
1. First
2. Second
3. Third
\`\`\`

### Code

Inline: \`\`code\`\`

Block:
\`\`\`\`markdown
\`\`\`javascript
console.log("Hello");
\`\`\`
\`\`\`\`

### Tables

\`\`\`markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
\`\`\`

### Alerts

\`\`\`markdown
> [!NOTE]
> Important information

> [!WARNING]
> Caution advised
\`\`\`

## Advanced Features

- Task lists: \`- [ ] Todo\`
- Footnotes: \`[^1]\`
- Emoji: \`:smile:\``,

                'math-diagrams.md': `# Math & Diagrams

## Mathematical Expressions

### Inline Math

Use single \`$\` delimiters:
\`\`\`
The formula $E = mc^2$ is famous.
\`\`\`

### Display Math

Use double \`$$\` delimiters:
\`\`\`
$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
\`\`\`

## Diagrams

### Mermaid

\`\`\`\`markdown
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Result 1]
    B -->|No| D[Result 2]
\`\`\`
\`\`\`\`

### TikZ

\`\`\`\`markdown
\`\`\`tikz
\\begin{tikzpicture}
  \\draw (0,0) circle (1cm);
  \\draw (0,0) -- (1,0);
\\end{tikzpicture}
\`\`\`
\`\`\`\`

## Chemistry

Use mhchem for chemical equations:
\`\`\`
$$\\ce{CO2 + H2O -> H2CO3}$$
\`\`\``,

                'export.md': `# Export Options

## Available Formats

MarkDD can export to multiple formats:

### HTML Export

- **Features**: Standalone HTML file with embedded CSS
- **Usage**: File → Export → HTML
- **Best For**: Web publishing, sharing

### PDF Export

- **Features**: High-quality PDF with proper page breaks
- **Usage**: File → Export → PDF  
- **Best For**: Print, archival

## Export Settings

Configure export options in:
- File → Preferences → Export

### Customization

- Custom CSS for HTML
- Page size for PDF

## Tips

- Preview before exporting
- Check embedded images
- Test math rendering
- Verify table formatting`
            }
        };
    }

    static getHelpExample() {
        return {
            type: 'help',
            config: {
                title: 'MarkDD Help System',
                author: 'MarkDD Team',
                description: 'Interactive help and tutorials for MarkDD Editor'
            },
            structure: {
                root: [
                    { title: 'Welcome', link: 'welcome.md', sequence: 1 },
                    { title: 'Basic Editing', link: 'basic-editing.md', sequence: 2 },
                    { title: 'Advanced Features', link: 'advanced.md', sequence: 3 },
                    { title: 'Troubleshooting', link: 'troubleshooting.md', sequence: 4 }
                ]
            },
            chapters: {
                'welcome.md': '# Welcome to MarkDD\n\nThis help system will guide you through using MarkDD Editor.\n\n## What You\'ll Learn\n\n- Creating and editing documents\n- Using advanced features\n- Exporting your work\n- Solving common problems',
                'basic-editing.md': '# Basic Editing\n\n## Creating a Document\n\n1. Click **New** or press Ctrl+N\n2. Start typing\n3. Your changes appear in real-time\n\n## Saving\n\n- **Save**: Ctrl+S\n- **Save As**: Ctrl+Shift+S',
                'advanced.md': '# Advanced Features\n\n## Math\n\nAdd equations with $ or $$:\n\n$$E = mc^2$$\n\n## Diagrams\n\nCreate flowcharts, UML, and more!',
                'troubleshooting.md': '# Troubleshooting\n\n## Common Issues\n\n### Preview Not Updating\n\n- Check if live preview is enabled\n- Try manual refresh (Ctrl+R)\n\n### Math Not Rendering\n\n- Verify delimiter syntax\n- Check KaTeX/MathJax is loaded'
            }
        };
    }

    static getTechnicalExample() {
        return {
            type: 'technical',
            config: {
                title: 'API Reference Documentation',
                author: 'Development Team',
                description: 'Technical API documentation and reference guide'
            },
            structure: {
                root: [
                    { title: 'Overview', link: 'overview.md', sequence: 1 },
                    { title: 'API Reference', link: 'api.md', sequence: 2 },
                    { title: 'Examples', link: 'examples.md', sequence: 3 }
                ]
            },
            chapters: {
                'overview.md': '# API Overview\n\n## Introduction\n\nThis document describes the public API for the MarkDD renderer.\n\n## Architecture\n\n- **Renderer**: Converts Markdown to HTML\n- **Preview**: Displays rendered content\n- **Editor**: Handles text input',
                'api.md': '# API Reference\n\n## MarkdownRenderer\n\n### render(markdown)\n\nConverts Markdown to HTML.\n\n**Parameters:**\n- `markdown` (string): Source Markdown\n\n**Returns:** (string) Rendered HTML',
                'examples.md': '# Code Examples\n\n## Basic Usage\n\n```javascript\nconst renderer = new MarkdownRenderer();\nconst html = renderer.render("# Hello");\n```'
            }
        };
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.BookExamples = BookExamples;
}
