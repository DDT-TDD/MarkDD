const fs = require('fs');
const path = require('path');
const fse = require('fs-extra');
const chokidar = require('chokidar');
const http = require('http');
const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
let markdownItAttrs = null;
try {
    markdownItAttrs = require('markdown-it-attrs');
} catch (error) {
    console.warn('[BookEngine] Optional dependency "markdown-it-attrs" missing. Continuing without attribute support.');
}
const lunr = require('lunr');
const hljs = require('highlight.js');
const { promisify } = require('util');
const crypto = require('crypto');
let puppeteer = null;
try {
    puppeteer = require('puppeteer');
} catch (err) {
    // Puppeteer is optional - will use Electron fallback if available
}

const AUTO_SECTION_IDS = ['title', 'copyright', 'toc'];
const DEFAULT_SECTIONS_BY_TYPE = {
    classical: ['title', 'copyright', 'toc', 'preface', 'introduction', 'chapters'],
    wiki: ['title', 'copyright', 'toc', 'introduction', 'chapters'],
    help: ['title', 'copyright', 'toc', 'introduction', 'chapters'],
    technical: ['title', 'copyright', 'toc', 'introduction', 'chapters']
};

const TECHNICAL_DOCUMENT_STYLES = {
    report: {
        menuLabel: 'Project Report',
        file: 'project-report.md',
        summarySections: [
            { label: 'Executive Summary', anchor: 'executive-summary' },
            { label: 'Status Overview', anchor: 'status-overview' },
            { label: 'Risks', anchor: 'risk-log' },
            { label: 'Next Steps', anchor: 'next-steps' }
        ],
        content: (meta) => `# ${meta.title || 'Project Report'}

**Prepared by:** ${meta.author || 'Project Team'}  
**Date:** ${meta.generatedOn}

## Executive Summary {#executive-summary}
Summarize the project objectives, current health, and highlight the most important achievements for this reporting period.

## Objectives
- Objective 1
- Objective 2
- Objective 3

## Status Overview {#status-overview}
| Workstream | Owner | Progress | Notes |
| --- | --- | --- | --- |
| | | | |

## Metrics
| KPI | Target | Actual | Trend |
| --- | --- | --- | --- |
| | | | |

## Risk Log {#risk-log}
| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| | | | |

## Next Steps {#next-steps}
1. 
2. 
3. 
`
    },
    plan: {
        menuLabel: 'Strategic Plan',
        file: 'strategic-plan.md',
        summarySections: [
            { label: 'Vision', anchor: 'vision' },
            { label: 'Initiatives', anchor: 'initiatives' },
            { label: 'Milestones', anchor: 'milestones' },
            { label: 'Financials', anchor: 'financial-summary' }
        ],
        content: (meta) => `# ${meta.title || 'Strategic Plan'}

**Organization:** ${meta.organization || 'Organization'}  
**Author:** ${meta.author || 'Planning Team'}  
**Date:** ${meta.generatedOn}

## Vision {#vision}
Describe the desired future state, guiding principles, and the value this plan unlocks.

## Strategic Objectives
1. Objective
2. Objective
3. Objective

## Key Initiatives {#initiatives}
| Initiative | Owner | Start | Finish | Success Criteria |
| --- | --- | --- | --- | --- |
| | | | | |

## Milestones {#milestones}
- Milestone 1
- Milestone 2
- Milestone 3

## Resource & Capacity Planning
- Team availability summary
- Partner or vendor support needs

## Financial Summary {#financial-summary}
| Category | Budget | Forecast | Actual |
| --- | --- | --- | --- |
| | | | |

## Risks & Dependencies
List major assumptions, dependencies, and response strategies.
`
    },
    brochure: {
        menuLabel: 'Product Brochure',
        file: 'product-brochure.md',
        summarySections: [
            { label: 'Highlights', anchor: 'highlights' },
            { label: 'Features', anchor: 'features' },
            { label: 'Use Cases', anchor: 'use-cases' },
            { label: 'CTA', anchor: 'call-to-action' }
        ],
        content: (meta) => `# ${meta.title || 'Product Brochure'}

## Headline Statement
Deliver a crisp value proposition that speaks to the customer pain you solve.

## Highlights {#highlights}
- Key differentiator 1
- Key differentiator 2
- Key differentiator 3

## Features {#features}
| Feature | Benefit |
| --- | --- |
| | |

## Use Cases {#use-cases}
1. Scenario and outcome
2. Scenario and outcome

## Social Proof
> Quote from a customer or analyst validating your claims.

## Call to Action {#call-to-action}
Include next-step instructions, contact info, and a link or QR code.
`
    },
    'business-case': {
        menuLabel: 'Business Case',
        file: 'business-case.md',
        summarySections: [
            { label: 'Problem Statement', anchor: 'problem-statement' },
            { label: 'Options', anchor: 'solution-options' },
            { label: 'Benefits', anchor: 'benefit-analysis' },
            { label: 'Recommendation', anchor: 'recommendation' }
        ],
        content: (meta) => `# ${meta.title || 'Business Case'}

## Problem Statement {#problem-statement}
Describe the business pain, who is impacted, and the opportunity window.

## Strategic Alignment
Explain how this initiative supports corporate goals, OKRs, or portfolio themes.

## Solution Options {#solution-options}
| Option | Description | Cost | Benefit | Considerations |
| --- | --- | --- | --- | --- |
| | | | | |

## Benefit Analysis {#benefit-analysis}
- Financial benefits (savings, revenue)
- Operational benefits (efficiency, quality)
- Intangible benefits (brand, compliance)

## Cost Summary
| Category | One-Time | Recurring |
| --- | --- | --- |
| | | |

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| | | |

## Recommendation {#recommendation}
State the preferred option, implementation timeline, and approval needed.
`
    },
    'white-paper': {
        menuLabel: 'White Paper',
        file: 'white-paper.md',
        summarySections: [
            { label: 'Abstract', anchor: 'abstract' },
            { label: 'Problem Landscape', anchor: 'problem-landscape' },
            { label: 'Proposed Approach', anchor: 'proposed-approach' },
            { label: 'Evidence', anchor: 'evidence' }
        ],
        content: (meta) => `# ${meta.title || 'White Paper'}

## Abstract {#abstract}
Summarize the thesis, why the topic matters, and who should read this paper.

## Problem Landscape {#problem-landscape}
Describe the market context, pain points, and forces driving change.

## Proposed Approach {#proposed-approach}
Outline your point of view, architecture, or methodology.

## Reference Architecture
Provide diagrams or bullet points that illustrate how the approach works.

## Evidence & Proof Points {#evidence}
- Data set or benchmark results
- Customer references
- Analyst or third-party validation

## Call to Action
Offer a next step such as booking a briefing, trial, or workshop.
`
    },
    'case-study': {
        menuLabel: 'Case Study',
        file: 'case-study.md',
        summarySections: [
            { label: 'Client Profile', anchor: 'client-profile' },
            { label: 'Challenge', anchor: 'challenge' },
            { label: 'Solution', anchor: 'solution' },
            { label: 'Results', anchor: 'results' }
        ],
        content: (meta) => `# ${meta.title || 'Case Study'}

## Client Profile {#client-profile}
Industry, size, and strategic priorities.

## Challenge {#challenge}
Explain the business or technical barrier the client faced.

## Solution {#solution}
Detail the implementation, timeline, and stakeholders involved.

## Results {#results}
| Metric | Before | After | Impact |
| --- | --- | --- | --- |
| | | | |

## Lessons Learned
Capture insights, accelerators, and reusable assets.

## Testimonial
> Add a quote from the client sponsor or champion.
`
    },
    'feasibility-study': {
        menuLabel: 'Feasibility Study',
        file: 'feasibility-study.md',
        summarySections: [
            { label: 'Opportunity', anchor: 'opportunity' },
            { label: 'Technical Feasibility', anchor: 'technical-feasibility' },
            { label: 'Financial Analysis', anchor: 'financial-analysis' },
            { label: 'Recommendation', anchor: 'study-recommendation' }
        ],
        content: (meta) => `# ${meta.title || 'Feasibility Study'}

## Opportunity {#opportunity}
Describe the business driver, desired capabilities, and timing pressures.

## Technical Feasibility {#technical-feasibility}
- Current state assessment
- Proposed architecture or vendor assessment
- Integration considerations

## Operational Feasibility
Assess process readiness, staffing, and change impact.

## Financial Analysis {#financial-analysis}
| Scenario | Investment | Benefit | Payback |
| --- | --- | --- | --- |
| | | | |

## Risk Assessment
List critical risks, constraints, and mitigation tactics.

## Recommendation {#study-recommendation}
Summarize go/no-go decision, prerequisites, and next milestones.
`
    },
    proposal: {
        menuLabel: 'Project Proposal',
        file: 'project-proposal.md',
        summarySections: [
            { label: 'Summary', anchor: 'proposal-summary' },
            { label: 'Scope', anchor: 'scope-of-work' },
            { label: 'Schedule', anchor: 'schedule' },
            { label: 'Investment', anchor: 'investment' }
        ],
        content: (meta) => `# ${meta.title || 'Project Proposal'}

## Cover Letter {#proposal-summary}
Address the client, restate objectives, and reference prior discussions.

## Scope of Work {#scope-of-work}
Describe deliverables, in-scope activities, and explicit exclusions.

## Approach
Break down phases, methodologies, and collaboration model.

## Schedule {#schedule}
| Phase | Duration | Dates | Milestones |
| --- | --- | --- | --- |
| | | | |

## Investment {#investment}
| Item | Quantity | Rate | Amount |
| --- | --- | --- | --- |
| | | | |

## Assumptions & Dependencies
List what must remain true for the proposal to hold.

## Acceptance
Provide signature blocks or instructions for approvals.
`
    },
    'user-manual': {
        menuLabel: 'User Manual',
        file: 'user-manual.md',
        summarySections: [
            { label: 'Getting Started', anchor: 'getting-started' },
            { label: 'Operations', anchor: 'operations' },
            { label: 'Troubleshooting', anchor: 'troubleshooting' },
            { label: 'Support', anchor: 'support' }
        ],
        content: (meta) => `# ${meta.title || 'User Manual'}

## About This Product
Describe the purpose, supported environments, and key terms.

## Getting Started {#getting-started}
1. Unboxing or installation
2. First-time configuration
3. Verification steps

## Operations {#operations}
- Routine task 1
- Routine task 2
- Best practices and automation ideas

## Troubleshooting {#troubleshooting}
| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| | | |

## Maintenance
Include schedules, required tools, and checklists.

## Support {#support}
Contact channels, SLA expectations, and escalation path.
`
    },
    sop: {
        menuLabel: 'Standard Operating Procedure',
        file: 'standard-operating-procedure.md',
        summarySections: [
            { label: 'Purpose', anchor: 'purpose' },
            { label: 'Responsibilities', anchor: 'responsibilities' },
            { label: 'Procedure', anchor: 'procedure' },
            { label: 'Safety', anchor: 'safety' }
        ],
        content: (meta) => `# ${meta.title || 'Standard Operating Procedure'}

## Purpose {#purpose}
Explain why the procedure exists and when it must be invoked.

## Scope
Define systems, teams, and geographies covered by this SOP.

## Responsibilities {#responsibilities}
- Role 1: Duties
- Role 2: Duties

## Procedure {#procedure}
1. Step with detailed instructions
2. Step with checks or screenshots
3. Step with expected outcomes

## Safety & Compliance {#safety}
List PPE, legal references, and quality gates that must be respected.

## Records
Describe how to capture evidence, where to store it, and retention rules.
`
    },
    rfp: {
        menuLabel: 'Request for Proposal',
        file: 'request-for-proposal.md',
        summarySections: [
            { label: 'Background', anchor: 'background' },
            { label: 'Scope', anchor: 'rfp-scope' },
            { label: 'Instructions', anchor: 'submission-instructions' },
            { label: 'Timeline', anchor: 'timeline' }
        ],
        content: (meta) => `# ${meta.title || 'Request for Proposal'}

## Background {#background}
Summarize the organization, drivers, and expected outcomes.

## Project Goals
List critical success metrics and constraints vendors must respect.

## Scope of Services {#rfp-scope}
Enumerate required capabilities, integrations, or deliverables.

## Submission Instructions {#submission-instructions}
- Proposal format and length
- Questions deadline
- Required documents

## Evaluation Criteria
| Criterion | Weight |
| --- | --- |
| | |

## Timeline {#timeline}
| Milestone | Date |
| --- | --- |
| RFP release | ${meta.generatedOn} |
| Questions due | |
| Vendor demos | |
| Award date | |

## Terms & Conditions
Detail contractual expectations, confidentiality, and compliance clauses.
`
    },
    'annual-report': {
        menuLabel: 'Annual Report',
        file: 'annual-report.md',
        summarySections: [
            { label: 'Letter to Stakeholders', anchor: 'letter-to-stakeholders' },
            { label: 'Highlights', anchor: 'year-in-review' },
            { label: 'Financials', anchor: 'financial-performance' },
            { label: 'Outlook', anchor: 'outlook' }
        ],
        content: (meta) => `# ${meta.title || 'Annual Report'}

## Letter to Stakeholders {#letter-to-stakeholders}
Provide a narrative from leadership on achievements and future direction.

## Year in Review {#year-in-review}
- Highlight 1
- Highlight 2
- Highlight 3

## Financial Performance {#financial-performance}
| Metric | Current Year | Prior Year | Change |
| --- | --- | --- | --- |
| Revenue | | | |
| EBITDA | | | |
| Cash | | | |

## ESG & People
- Environmental initiatives
- Social impact
- Governance updates

## Outlook {#outlook}
Map key priorities, investments, and market signals for next year.
`
    },
    'project-charter': {
        menuLabel: 'Project Charter',
        file: 'project-charter.md',
        summarySections: [
            { label: 'Purpose', anchor: 'project-purpose' },
            { label: 'Objectives', anchor: 'project-objectives' },
            { label: 'Timeline', anchor: 'timeline' },
            { label: 'Stakeholders', anchor: 'stakeholders' }
        ],
        content: (meta) => `# ${meta.title || 'Project Charter'}

## Project Purpose {#project-purpose}
Describe the need, opportunity, or mandate that triggers this project.

## Objectives {#project-objectives}
- Objective 1
- Objective 2
- Objective 3

## Scope
List major deliverables, boundaries, and constraints.

## Timeline {#timeline}
| Phase | Start | Finish |
| --- | --- | --- |
| | | |

## Stakeholders {#stakeholders}
- Sponsor
- Steering committee
- Core team

## Success Criteria
Define measurable outcomes, acceptance criteria, and KPIs.

## Approvals
Provide signature blocks or references to approval systems.
`
    }
};

const SECTION_BLUEPRINTS = {
    title: {
        id: 'title',
        title: 'Title Page',
        category: 'front',
        file: 'front/title-page.md',
        template: '# Title Page\n\nWrite the official title, subtitle, and edition details for your book.\n'
    },
    copyright: {
        id: 'copyright',
        title: 'Copyright Page',
        category: 'front',
        file: 'front/copyright.md',
        template: '# Copyright Page\n\nProvide ownership information, publication year, and licensing terms.\n'
    },
    dedication: {
        id: 'dedication',
        title: 'Dedication',
        category: 'front',
        file: 'front/dedication.md',
        template: '# Dedication\n\n_Write your dedication here..._\n'
    },
    toc: {
        id: 'toc',
        title: 'Table of Contents',
        category: 'front',
        file: 'front/table-of-contents.md',
        template: '# Table of Contents\n\n<!-- AUTO-GENERATED: This will be populated automatically during compilation -->\n<!-- You can use the "Generate TOC" command to preview the table of contents -->\n\nThis file will be automatically filled with chapter titles and page numbers when you compile your book.\n'
    },
    foreword: {
        id: 'foreword',
        title: 'Foreword',
        category: 'front',
        file: 'front/foreword.md',
        template: '# Foreword\n\nInvite a guest author to introduce your work.\n'
    },
    preface: {
        id: 'preface',
        title: 'Preface',
        category: 'front',
        file: 'front/preface.md',
        template: '# Preface\n\nExplain the origin and goals of this book.\n'
    },
    acknowledgments: {
        id: 'acknowledgments',
        title: 'Acknowledgments',
        category: 'front',
        file: 'front/acknowledgments.md',
        template: '# Acknowledgments\n\nThank the people and organizations that supported this project.\n'
    },
    introduction: {
        id: 'introduction',
        title: 'Introduction',
        category: 'body',
        file: 'main/introduction.md',
        template: '# Introduction\n\nSet the stage for your readers with context and goals.\n'
    },
    epilogue: {
        id: 'epilogue',
        title: 'Epilogue',
        category: 'body',
        file: 'main/epilogue.md',
        template: '# Epilogue\n\nWrap up your narrative with closing thoughts.\n'
    },
    afterword: {
        id: 'afterword',
        title: 'Afterword',
        category: 'back',
        file: 'back/afterword.md',
        template: '# Afterword\n\nShare reflections written after the main manuscript was completed.\n'
    },
    appendix: {
        id: 'appendix',
        title: 'Appendix',
        category: 'back',
        file: 'back/appendix.md',
        template: '# Appendix\n\nAdd supplemental material, data tables, or references here.\n'
    },
    glossary: {
        id: 'glossary',
        title: 'Glossary',
        category: 'back',
        file: 'back/glossary.md',
        template: '# Glossary\n\nDefine essential terms for quick reference.\n'
    },
    bibliography: {
        id: 'bibliography',
        title: 'Bibliography',
        category: 'back',
        file: 'back/bibliography.md',
        template: '# Bibliography\n\n<!-- You can use the "Generate Bibliography" command to extract citations from your content -->\n\n## Primary Sources\n\n1. \n\n## Secondary Sources\n\n1. \n\n## Online Resources\n\n1. \n'
    },
    index: {
        id: 'index',
        title: 'Index',
        category: 'back',
        file: 'back/index.md',
        template: '# Index\n\n<!-- AUTO-GENERATED: Keywords will be indexed automatically during compilation -->\n<!-- You can use the "Generate Index" command to create keyword references -->\n\nThis file will be automatically populated with keywords and page references when you compile your book.\n'
    },
    'author-bio': {
        id: 'author-bio',
        title: 'About the Author',
        category: 'back',
        file: 'back/author-bio.md',
        template: '# About the Author\n\nIntroduce yourself to the reader.\n'
    }
};

const readFileAsync = promisify(fs.readFile);

const BASE_BOOK_CSS = `
:root {
    --layout-sidebar-width: 320px;
    --book-font: 'Inter', 'Segoe UI', sans-serif;
    --heading-font: 'Space Grotesk', 'Inter', sans-serif;
    --book-background: #05060c;
    --main-background: #0d0f1a;
    --book-foreground: #f7f7ff;
    --sidebar-background: #070713;
    --sidebar-border: rgba(255, 255, 255, 0.08);
    --sidebar-text: #b7bce0;
    --card-background: rgba(10,12,18,0.85);
    --card-text: #f7f7ff;
    --accent: #8f7efe;
    --link-color: #e5e7ff;
    --muted-color: rgba(255,255,255,0.75);
    --search-background: rgba(255,255,255,0.08);
    --border-radius: 24px;
}

* { box-sizing: border-box; }

body.book-shell {
    display: grid;
    grid-template-columns: var(--layout-sidebar-width) 1fr;
    margin: 0;
    min-height: 100vh;
    background: var(--book-background);
    color: var(--book-foreground);
    font-family: var(--book-font);
}

body.book-shell a { color: var(--link-color); }

.book-sidebar {
    background: var(--sidebar-background);
    padding: 32px;
    border-right: 1px solid var(--sidebar-border);
    overflow-y: auto;
    color: var(--sidebar-text);
}

.book-main {
    padding: 48px 64px;
    background: var(--main-background);
}

.book-meta h1 {
    margin: 0 0 12px 0;
    font-size: 2rem;
    font-family: var(--heading-font);
}

.book-meta p { margin: 0 0 8px 0; color: var(--muted-color); }

.book-nav {
    list-style: none;
    padding-left: 0;
    margin: 24px 0 0 0;
}

.book-nav li { margin-bottom: 8px; }

.book-nav a {
    color: var(--link-color);
    text-decoration: none;
    font-weight: 500;
}

.book-nav a:hover { color: var(--accent); }

.book-search { margin-top: 24px; }

.book-search input {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--sidebar-border);
    background: var(--search-background);
    color: var(--book-foreground);
}

#book-search-results { margin-top: 12px; font-size: 0.9rem; }

.book-chapter {
    background: var(--card-background);
    color: var(--card-text);
    border-radius: var(--border-radius);
    padding: 36px;
    box-shadow: 0 24px 48px rgba(0,0,0,0.12);
}

.book-chapter-content img {
    display: block;
    margin-left: auto;
    margin-right: auto;
    max-width: 100%;
    height: auto;
}

.book-chapter-content table {
    margin-left: auto !important;
    margin-right: auto !important;
    border-collapse: collapse;
    display: table;
}

.book-chapter-content table caption,
.book-chapter-content caption {
    text-align: center;
    caption-side: bottom;
    padding: 0.5em;
    font-style: italic;
    font-size: 0.9em;
}

.book-chapter-content figure { text-align: center; margin: 1.5em auto; }
.book-chapter-content figcaption { text-align: center; font-style: italic; margin-top: 0.5em; }

.book-chapter-content pre {
    background: rgba(0,0,0,0.6);
    border-radius: 12px;
    padding: 16px;
    overflow-x: auto;
}

.chapter-card {
    background: var(--card-background);
    border: 1px solid var(--sidebar-border);
    padding: 24px;
    border-radius: 18px;
    margin-bottom: 16px;
}

@media (max-width: 1080px) {
    body.book-shell { grid-template-columns: 1fr; }
    .book-sidebar { border-right: none; border-bottom: 1px solid var(--sidebar-border); }
    .book-main { padding: 32px 24px; }
}
`;

const BOOK_STYLE_PRESETS = {
    dark: {
        key: 'dark',
        label: 'Midnight',
        highlightTheme: 'github-dark',
        mermaidTheme: 'dark',
        css: `
body.book-shell.style-dark {
    --book-font: 'Inter', 'Segoe UI', sans-serif;
    --heading-font: 'Space Grotesk', 'Inter', sans-serif;
    --book-background: #05060c;
    --main-background: #05060c;
    --book-foreground: #f7f7ff;
    --sidebar-background: #070713;
    --sidebar-border: rgba(255,255,255,0.08);
    --sidebar-text: #b7bce0;
    --card-background: rgba(10,12,18,0.85);
    --card-text: #f7f7ff;
    --accent: #8f7efe;
    --link-color: #e5e7ff;
    --muted-color: rgba(247,247,255,0.7);
    --search-background: rgba(0,0,0,0.25);
}

body.book-shell.style-dark .book-chapter {
    box-shadow: 0 18px 48px rgba(0,0,0,0.5);
}

body.book-shell.style-dark .book-nav a:hover { color: #ffffff; }
        `
    },
    classic: {
        key: 'classic',
        label: 'Classic Print',
        highlightTheme: 'github',
        mermaidTheme: 'forest',
        css: `
body.book-shell.style-classic {
    --layout-sidebar-width: 300px;
    --book-font: 'Literata', 'Georgia', serif;
    --heading-font: 'Playfair Display', 'Georgia', serif;
    --book-background: #f7f4ed;
    --main-background: #faf7ef;
    --book-foreground: #2a1d0f;
    --sidebar-background: #f0e8d9;
    --sidebar-border: rgba(64,40,24,0.12);
    --sidebar-text: #5c422c;
    --card-background: #ffffff;
    --card-text: #1f140b;
    --accent: #c77b30;
    --link-color: #8a4b12;
    --muted-color: rgba(47,34,24,0.85);
    --search-background: rgba(255,255,255,0.8);
    --border-radius: 18px;
}

body.book-shell.style-classic .book-main {
    background-image: linear-gradient(120deg, rgba(255,255,255,0.7), rgba(255,255,255,0.2));
}

body.book-shell.style-classic .book-chapter {
    border: 1px solid rgba(47,34,24,0.08);
    box-shadow: 0 24px 42px rgba(79, 63, 40, 0.16);
}

body.book-shell.style-classic .book-meta h1 {
    letter-spacing: 1px;
}

body.book-shell.style-classic .book-chapter-content p:first-of-type::first-letter {
    font-size: 3.2rem;
    font-weight: 600;
    float: left;
    padding-right: 10px;
    line-height: 1;
}
        `
    },
    wiki: {
        key: 'wiki',
        label: 'Knowledge Base',
        highlightTheme: 'atom-one-light',
        mermaidTheme: 'neutral',
        css: `
body.book-shell.style-wiki {
    --layout-sidebar-width: 260px;
    --book-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --heading-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --book-background: #f6f8fa;
    --main-background: #ffffff;
    --book-foreground: #1f2328;
    --sidebar-background: #f1f4f8;
    --sidebar-border: rgba(15,23,42,0.08);
    --sidebar-text: #4b5563;
    --card-background: #ffffff;
    --card-text: #111827;
    --accent: #0969da;
    --link-color: #0969da;
    --muted-color: rgba(71,85,105,0.9);
    --search-background: #ffffff;
    --border-radius: 12px;
}

body.book-shell.style-wiki {
    grid-template-columns: minmax(220px, var(--layout-sidebar-width)) 1fr;
}

body.book-shell.style-wiki .book-sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    border-right: 1px solid rgba(15,23,42,0.08);
}

body.book-shell.style-wiki .book-main {
    padding: 32px 48px;
}

body.book-shell.style-wiki .book-chapter {
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: none;
}

body.book-shell.style-wiki .book-nav li {
    margin-bottom: 4px;
}

body.book-shell.style-wiki .book-nav a {
    font-weight: 600;
}

body.book-shell.style-wiki .book-meta h1 {
    font-size: 1.5rem;
}

body.book-shell.style-wiki .book-chapter-content pre {
    background: #0f172a;
    color: #f8fafc;
}
        `
    },
    helpdesk: {
        key: 'helpdesk',
        label: 'Help Center',
        highlightTheme: 'stackoverflow-light',
        mermaidTheme: 'neutral',
        css: `
body.book-shell.style-helpdesk {
    --layout-sidebar-width: 280px;
    --book-font: 'Tahoma', 'Segoe UI', sans-serif;
    --heading-font: 'Segoe UI', 'Helvetica Neue', sans-serif;
    --book-background: #e6edf9;
    --main-background: #ffffff;
    --book-foreground: #102a43;
    --sidebar-background: #fdfefe;
    --sidebar-border: rgba(16,42,67,0.12);
    --sidebar-text: #243b53;
    --card-background: #ffffff;
    --card-text: #102a43;
    --accent: #1b5fbf;
    --link-color: #0f62fe;
    --muted-color: rgba(16,42,67,0.7);
    --search-background: #f1f5fb;
    --border-radius: 10px;
}

body.book-shell.style-helpdesk .book-sidebar {
    background: linear-gradient(180deg, #fefefe 0%, #eef3fb 100%);
}

body.book-shell.style-helpdesk .book-nav {
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    padding-top: 16px;
}

body.book-shell.style-helpdesk .book-nav a {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
}

body.book-shell.style-helpdesk .book-nav a::before {
    content: '▸';
    font-size: 0.8rem;
    color: #1b5fbf;
}

body.book-shell.style-helpdesk .book-main {
    padding: 32px 48px;
    background: #ffffff;
    box-shadow: inset 0 1px 0 rgba(15,23,42,0.08);
}

body.book-shell.style-helpdesk .book-chapter {
    border: 1px solid rgba(15,23,42,0.08);
    box-shadow: none;
}

body.book-shell.style-helpdesk .book-chapter header p {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: rgba(16,42,67,0.65);
}
        `
    },
    technical: {
        key: 'technical',
        label: 'Professional Document',
        highlightTheme: 'github',
        mermaidTheme: 'default',
        css: `
body.book-shell.style-technical {
    --layout-sidebar-width: 300px;
    --book-font: 'Calibri', 'Arial', sans-serif;
    --heading-font: 'Cambria', 'Georgia', serif;
    --book-background: #ffffff;
    --main-background: #ffffff;
    --book-foreground: #000000;
    --sidebar-background: #f8f9fa;
    --sidebar-border: rgba(0,0,0,0.1);
    --sidebar-text: #212529;
    --card-background: #ffffff;
    --card-text: #000000;
    --accent: #0066cc;
    --link-color: #0066cc;
    --muted-color: rgba(0,0,0,0.6);
    --search-background: #ffffff;
    --border-radius: 4px;
}

body.book-shell.style-technical {
    font-size: 11pt;
    line-height: 1.5;
}

body.book-shell.style-technical .book-sidebar {
    border-right: 1px solid #dee2e6;
    padding: 24px;
}

body.book-shell.style-technical .book-main {
    padding: 48px 72px;
    max-width: 1200px;
    margin: 0 auto;
}

body.book-shell.style-technical .book-meta h1 {
    font-size: 28pt;
    font-weight: 700;
    color: #000000;
    margin-bottom: 8px;
    text-align: left;
}

body.book-shell.style-technical .book-meta p {
    font-size: 11pt;
    color: #495057;
    margin-bottom: 4px;
}

body.book-shell.style-technical .book-chapter {
    border: 1px solid #dee2e6;
    border-radius: 0;
    padding: 48px;
    box-shadow: none;
    background: #ffffff;
}

body.book-shell.style-technical .book-chapter-content h1 {
    font-size: 20pt;
    font-weight: 700;
    color: #000000;
    margin-top: 24px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #0066cc;
}

body.book-shell.style-technical .book-chapter-content h2 {
    font-size: 16pt;
    font-weight: 700;
    color: #000000;
    margin-top: 18px;
    margin-bottom: 10px;
}

body.book-shell.style-technical .book-chapter-content h3 {
    font-size: 14pt;
    font-weight: 600;
    color: #212529;
    margin-top: 14px;
    margin-bottom: 8px;
}

body.book-shell.style-technical .book-chapter-content p {
    margin-bottom: 12px;
    text-align: justify;
}

body.book-shell.style-technical .book-chapter-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
}

body.book-shell.style-technical .book-chapter-content table th {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    padding: 8px 12px;
    text-align: left;
    font-weight: 700;
}

body.book-shell.style-technical .book-chapter-content table td {
    border: 1px solid #dee2e6;
    padding: 8px 12px;
}

body.book-shell.style-technical .book-chapter-content blockquote {
    border-left: 4px solid #0066cc;
    margin: 16px 0;
    padding: 12px 20px;
    background: #f8f9fa;
    font-style: italic;
}

body.book-shell.style-technical .book-chapter-content ul,
body.book-shell.style-technical .book-chapter-content ol {
    margin-left: 24px;
    margin-bottom: 12px;
}

body.book-shell.style-technical .book-chapter-content li {
    margin-bottom: 6px;
}

body.book-shell.style-technical .book-nav a {
    font-weight: 500;
    font-size: 10pt;
}

body.book-shell.style-technical .book-nav li {
    margin-bottom: 6px;
}

body.book-shell.style-technical .book-chapter-content pre {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 12px;
    font-size: 9pt;
}

@media print {
    body.book-shell.style-technical .book-sidebar {
        display: none;
    }
    body.book-shell.style-technical {
        grid-template-columns: 1fr;
    }
    body.book-shell.style-technical .book-main {
        padding: 0;
        max-width: 100%;
    }
    body.book-shell.style-technical .book-chapter {
        border: none;
        box-shadow: none;
        padding: 0;
    }
}
        `
    }
};

class BookEngine {
    constructor(logger = console) {
        this.logger = logger;
        this.defaultConfig = {
            title: 'Untitled Book',
            description: '',
            author: 'Anonymous',
            language: 'en',
            summary: 'SUMMARY.md',
            outputDir: 'book-dist',
            cover: null,
            customStylesheet: null,
            bookStyle: 'dark',
            watch: {
                enabled: true,
                delay: 300
            }
        };
        this.server = null;
        this.watcher = null;
        this.lastBuildResult = null;
        this.markdown = this.createMarkdownInstance();
    }

    createMarkdownInstance() {
        const md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true,
            highlight(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return `<pre class="hljs"><code>${hljs.highlight(code, { language: lang }).value}</code></pre>`;
                    } catch (error) {
                        console.warn('[BookEngine] highlight.js failed:', error.message);
                    }
                }
                return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
            }
        });

        md.use(markdownItAnchor, {
            slugify: (str) => this.slugify(str),
            permalink: markdownItAnchor.permalink.headerLink()
        });
        if (markdownItAttrs) {
            md.use(markdownItAttrs);
        }
        
        // Add task list support (GitHub-style checkboxes)
        this.addTaskListSupport(md);
        
        return md;
    }
    
    /**
     * Add GitHub-style task list support to markdown-it
     * Converts `- [ ]` and `- [x]` to proper checkbox list items
     */
    addTaskListSupport(md) {
        // Override the core rule to process task list markers in list items
        md.core.ruler.after('inline', 'task-lists', function(state) {
            const tokens = state.tokens;
            
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].type !== 'inline') continue;
                
                // Check if parent is a list_item
                let isListItem = false;
                for (let j = i - 1; j >= 0; j--) {
                    if (tokens[j].type === 'list_item_open') {
                        isListItem = true;
                        // Mark the list item token for task list styling
                        const content = tokens[i].content;
                        const taskMatch = content.match(/^\[([ xX])\]\s*/);
                        
                        if (taskMatch) {
                            const isChecked = taskMatch[1].toLowerCase() === 'x';
                            
                            // Add classes to the list_item_open token
                            tokens[j].attrJoin('class', 'task-list-item');
                            if (isChecked) {
                                tokens[j].attrJoin('class', 'task-completed');
                            }
                            
                            // Modify the content to include checkbox
                            const checkedAttr = isChecked ? ' checked' : '';
                            const remainingContent = content.substring(taskMatch[0].length);
                            
                            // Create new inline content with checkbox
                            tokens[i].content = remainingContent;
                            
                            // Update children tokens
                            if (tokens[i].children && tokens[i].children.length > 0) {
                                const checkboxToken = new state.Token('html_inline', '', 0);
                                checkboxToken.content = `<input type="checkbox"${checkedAttr} disabled> `;
                                
                                // Remove task marker from first text child
                                if (tokens[i].children[0] && tokens[i].children[0].type === 'text') {
                                    tokens[i].children[0].content = tokens[i].children[0].content.replace(/^\[([ xX])\]\s*/, '');
                                }
                                
                                // Insert checkbox at the beginning
                                tokens[i].children.unshift(checkboxToken);
                            }
                            
                            // Mark parent bullet_list for styling
                            for (let k = j - 1; k >= 0; k--) {
                                if (tokens[k].type === 'bullet_list_open') {
                                    tokens[k].attrJoin('class', 'task-list');
                                    tokens[k].attrJoin('class', 'contains-task-list');
                                    break;
                                }
                                if (tokens[k].type === 'bullet_list_close') break;
                            }
                        }
                        break;
                    }
                    if (tokens[j].type === 'list_item_close') break;
                }
            }
        });
    }

    async initProject(targetDir, options = {}) {
        if (!targetDir) {
            throw new Error('A target directory is required to initialize a book project.');
        }

        const resolvedDir = path.resolve(targetDir);
        const configPath = path.join(resolvedDir, 'book.config.json');
        const summaryPath = path.join(resolvedDir, 'SUMMARY.md');
        const chaptersDir = path.join(resolvedDir, 'chapters');

        await fse.ensureDir(resolvedDir);
        await fse.ensureDir(chaptersDir);

        const bookType = options.type || 'classical';
        const sections = this.resolveSectionSelectionForType(bookType, options.sections);
        const minimal = Boolean(options.minimal);
        const chapterCount = this.normalizeChapterCount(options.chapterCount);
        const appendixCount = Math.max(0, parseInt(options.appendixCount, 10) || 0);
        const showChapterNumbers = options.showChapterNumbers !== false;

        const config = {
            ...this.defaultConfig,
            type: bookType,
            title: options.title || this.defaultConfig.title,
            author: options.author || this.defaultConfig.author,
            description: options.description || this.defaultConfig.description,
            summary: 'SUMMARY.md',
            contentDir: 'chapters',
            outputDir: 'book-dist',
            minimal,
            sections,
            chapterCount,
            appendixCount,
            chapterOptions: {
                count: chapterCount,
                showNumbers: showChapterNumbers,
                naming: 'chapter-##'
            },
            appendixOptions: {
                count: appendixCount,
                naming: 'appendix-##'
            },
            metadata: {
                language: options.language || 'en',
                edition: '1.0',
                keywords: options.keywords || [],
                showChapterNumbers
            }
        };

        await fse.writeJson(configPath, config, { spaces: 2 });

        await this.generateBookTemplate(bookType, resolvedDir, chaptersDir, summaryPath, config);

        return { configPath, summaryPath, sampleDir: chaptersDir, type: bookType };
    }

    async createTempExample(type, exampleConfig, chapters, structure) {
        // Create example project in system temp directory
        const os = require('os');
        const tempBase = path.join(os.tmpdir(), 'markdd-examples');
        await fse.ensureDir(tempBase);
        
        // Create unique temp directory for this example
        const timestamp = Date.now();
        const tempDir = path.join(tempBase, `${type}-example-${timestamp}`);
        await fse.ensureDir(tempDir);

        const chaptersDir = path.join(tempDir, 'chapters');
        await fse.ensureDir(chaptersDir);

        // Write config file
        const configPath = path.join(tempDir, 'book.config.json');
        const config = {
            ...this.defaultConfig,
            ...exampleConfig,
            summary: 'SUMMARY.md',
            contentDir: 'chapters',
            outputDir: 'book-dist'
        };
        await fse.writeJson(configPath, config, { spaces: 2 });

        // Write all chapter files
        for (const [relativePath, content] of Object.entries(chapters)) {
            const filePath = path.join(tempDir, relativePath);
            await fse.ensureDir(path.dirname(filePath));
            await fse.writeFile(filePath, content, 'utf-8');
        }

        // Generate SUMMARY.md from structure
        const summaryPath = path.join(tempDir, 'SUMMARY.md');
        const summaryContent = this.generateSummaryFromStructure(config.title, structure);
        await fse.writeFile(summaryPath, summaryContent, 'utf-8');

        this.logger.info(`[BookEngine] Created temp example at: ${tempDir}`);
        return tempDir;
    }

    generateSummaryFromStructure(title, structure) {
        let summary = `# ${title}\n\n`;
        
        if (structure && structure.root) {
            const renderNode = (node, indent = '') => {
                let output = '';
                if (node.title && node.link) {
                    output += `${indent}- [${node.title}](${node.link})\n`;
                } else if (node.title) {
                    output += `${indent}## ${node.title}\n`;
                }
                
                if (node.children && Array.isArray(node.children)) {
                    for (const child of node.children) {
                        output += renderNode(child, indent + '  ');
                    }
                }
                
                return output;
            };
            
            for (const node of structure.root) {
                summary += renderNode(node);
            }
        }
        
        return summary;
    }

    async generateBookTemplate(type, rootDir, chaptersDir, summaryPath, config) {
        switch (type) {
            case 'wiki':
                await this.generateWikiTemplate(rootDir, chaptersDir, summaryPath, config);
                break;
            case 'help':
                await this.generateHelpTemplate(rootDir, chaptersDir, summaryPath, config);
                break;
            case 'technical':
                await this.generateTechnicalTemplate(rootDir, chaptersDir, summaryPath, config);
                break;
            case 'classical':
            default:
                await this.generateClassicalTemplate(rootDir, chaptersDir, summaryPath, config);
                break;
        }
    }

    async generateClassicalTemplate(rootDir, chaptersDir, summaryPath, config) {
        const sections = config.sections || ['title', 'copyright', 'toc', 'preface', 'introduction', 'chapters', 'epilogue'];
        if (config.minimal === true) {
            await this.generateStructuredMinimalTemplate(chaptersDir, summaryPath, { ...config, sections });
            return;
        }
        const hasDedication = sections.includes('dedication');
        const hasForeword = sections.includes('foreword');
        const hasPreface = sections.includes('preface');
        const hasAcknowledgments = sections.includes('acknowledgments');
        const hasIntroduction = sections.includes('introduction');
        const hasEpilogue = sections.includes('epilogue');
        const hasAfterword = sections.includes('afterword');
        const hasAppendix = sections.includes('appendix');
        const hasGlossary = sections.includes('glossary');
        const hasBibliography = sections.includes('bibliography');
        const hasIndex = sections.includes('index');
        const hasAuthorBio = sections.includes('author-bio');

        if (!fs.existsSync(summaryPath)) {
            // Build summary dynamically based on selected sections
            let summaryTemplate = `# ${config.title}\n\n`;
            
            // Front matter
            if (hasDedication) summaryTemplate += `- [Dedication](chapters/dedication.md)\n`;
            if (hasForeword) summaryTemplate += `- [Foreword](chapters/foreword.md)\n`;
            if (hasPreface) summaryTemplate += `- [Preface](chapters/preface.md)\n`;
            if (hasAcknowledgments) summaryTemplate += `- [Acknowledgments](chapters/acknowledgments.md)\n`;
            if (hasIntroduction) summaryTemplate += `- [Introduction](chapters/introduction.md)\n\n`;
            
            // Main content - simple structure for user books
            summaryTemplate += `## Part I\n`;
            summaryTemplate += `- [Chapter 1](chapters/chapter-01.md)\n`;
            summaryTemplate += `- [Chapter 2](chapters/chapter-02.md)\n`;
            summaryTemplate += `- [Chapter 3](chapters/chapter-03.md)\n\n`;
            
            // Back matter
            if (hasEpilogue) summaryTemplate += `- [Epilogue](chapters/epilogue.md)\n\n`;
            if (hasAfterword) summaryTemplate += `- [Afterword](chapters/afterword.md)\n`;
            if (hasAppendix) summaryTemplate += `\n## Appendices\n- [Appendix](chapters/appendix.md)\n`;
            if (hasGlossary) summaryTemplate += `- [Glossary](chapters/glossary.md)\n`;
            if (hasBibliography) summaryTemplate += `- [Bibliography](chapters/bibliography.md)\n`;
            if (hasIndex) summaryTemplate += `- [Index](chapters/index.md)\n`;
            if (hasAuthorBio) summaryTemplate += `- [About the Author](chapters/author-bio.md)\n`;
            
            await fse.writeFile(summaryPath, summaryTemplate, 'utf-8');
        }

        // Create chapter files - sample rich content for compatibility
        const chapters = [];

        // FULL EXAMPLE MODE: Rich Pinocchio-based content (kept for backward compatibility)

        // Front matter
        if (hasDedication) {
            chapters.push({
                file: 'dedication.md',
                title: 'Dedication',
                content: `# Dedication\n\n_To all those who believe in the magic of stories_\n\n_and the power of transformation._\n\n---\n\n> "A lie keeps growing and growing until it's as plain as the nose on your face."\n> — Pinocchio\n`
            });
        
        }
        
        if (hasForeword) {
            chapters.push({
                file: 'foreword.md',
                title: 'Foreword',
                content: `# Foreword\n\nThis timeless tale has enchanted readers for generations. Within these pages lies a story of adventure, growth, and the transformative power of love and honesty.\n\n## About This Edition\n\nThis edition presents the classic story with modern formatting while preserving the original charm and moral lessons that have made it a beloved classic.\n\n## Historical Context\n\nFirst published in ${config.year || '1883'}, this story has been translated into hundreds of languages and adapted countless times for stage and screen.\n\n---\n\n_Editorial Team_  \n_${new Date().getFullYear()}_\n`
            });
        }
        
        if (hasPreface) {
            chapters.push({
                file: 'preface.md',
                title: 'Preface',
                content: `# Preface\n\nDear Reader,\n\nWhat you hold in your hands is more than a simple children's story. It is a tale of transformation, of the journey from puppet to person, from selfishness to selflessness.\n\n## The Story's Origins\n\nInspired by the classic tale of Carlo Collodi's masterpiece, this book explores themes of:\n\n- **Honesty** - The consequences of lying\n- **Responsibility** - Learning to make wise choices  \n- **Love** - The bond between parent and child\n- **Growth** - The journey to becoming who we're meant to be\n\n## How to Read This Book\n\nWhile written for young readers, the lessons within speak to all ages. Read it aloud, read it alone, but most importantly, read it with an open heart.\n\nMay you find joy and wisdom in these pages.\n\n---\n\n_The Author_\n`
            });
        }
        
        if (hasAcknowledgments) {
            chapters.push({
                file: 'acknowledgments.md',
                title: 'Acknowledgments',
                content: `# Acknowledgments\n\nThis work would not have been possible without the contributions of many individuals:\n\n## Special Thanks\n\n- To Carlo Collodi, for creating the original timeless tale\n- To all the translators who have brought this story to readers worldwide\n- To the editors and illustrators who have kept this story alive through the generations\n\n## Dedication to Readers\n\nMost importantly, thank you to the readers—young and old—who continue to find magic and meaning in the adventures of a wooden puppet who dreamed of being real.\n\nYour imagination and love for stories keep these characters alive.\n`
            });
        }
        
        if (hasIntroduction) {
            chapters.push({
                file: 'introduction.md',
                title: 'Introduction',
                content: `# Introduction\n\n## A Tale as Old as Time\n\nCenturies ago, in the small workshop of a humble carpenter, a piece of wood began to speak. This was no ordinary piece of wood—it was magical, full of life and mischief.\n\n## What You Will Find\n\nThis book tells the story of Pinocchio, a wooden marionette who longed to become a real boy. Through his adventures, he learns valuable lessons about:\n\n- The importance of telling the truth\n- Listening to good advice\n- Working hard and helping others\n- The unconditional love of family\n\n## Characters You'll Meet\n\n**Pinocchio** - A wooden puppet with big dreams and an even bigger nose when he lies\n\n**Geppetto** - A kind carpenter who creates Pinocchio and loves him as a son\n\n**The Talking Cricket** - A wise cricket who tries to guide Pinocchio\n\n**The Blue Fairy** - A magical being who helps Pinocchio on his journey\n\nAnd many more colorful characters who help—or hinder—our hero on his path to becoming real.\n\n## Begin the Adventure\n\nTurn the page and step into a world where toys come to life, where lies make noses grow, and where love and honesty can work miracles.\n\nThe adventure begins now...\n`
            });
        }

        // Main chapters with Pinocchio content
        chapters.push(
            {
                file: 'chapter-01.md',
                title: 'Chapter 1: The Talking Wood',
                content: `# Chapter 1: The Talking Wood\n\n_How it happened that Master Cherry, the carpenter, found a piece of wood that wept and laughed like a child._\n\n## The Mysterious Log\n\nCenturies ago there lived—\n\n"A king!" my little readers will say immediately.\n\nNo, children, you are mistaken. Once upon a time there was **a piece of wood**. It was not an expensive piece of wood. Far from it. Just a common block of firewood, one of those thick, solid logs that are put on the fire in winter to make cold rooms cozy and warm.\n\nI do not know how this really happened, yet the fact remains that one fine day this piece of wood found itself in the shop of an old carpenter. His real name was Master Antonio, but everyone called him Master Cherry, for the tip of his nose was so round and red and shiny that it looked like a ripe cherry.\n\n## A Strange Sound\n\nAs soon as he saw that piece of wood, Master Cherry was filled with joy. Rubbing his hands together happily, he mumbled half to himself:\n\n> "This has come in the nick of time. I shall use it to make the leg of a table."\n\nHe grasped the hatchet quickly to peel off the bark and shape the wood. But as he was about to give it the first blow, he stood still with arm uplifted, for he had heard a wee, little voice say in a beseeching tone:\n\n> "Please be careful! Do not hit me so hard!"\n\nWhat a look of surprise shone on Master Cherry's face! His funny face became still funnier.\n\n## The Voice\n\nHe turned frightened eyes about the room to find out where that wee, little voice had come from and he saw no one! He looked under the bench—no one! He peeped inside the closet—no one! He searched among the shavings—no one! He opened the door to look up and down the street—and still no one!\n\n"Oh, I see!" he then said, laughing and scratching his wig. "It can easily be seen that I only thought I heard the tiny voice say the words! Well, well—to work once more."\n\nHe struck a most solemn blow upon the piece of wood.\n\n"Oh, oh! You hurt!" cried the same far-away little voice.\n\nMaster Cherry grew dumb, his eyes popped out of his head, his mouth opened wide, and his tongue hung down on his chin.\n\n---\n\n**To be continued in Chapter 2...**\n`
            },
            {
                file: 'chapter-02.md',
                title: 'Chapter 2: Geppetto\'s Creation',
                content: `# Chapter 2: Geppetto's Creation\n\n_Master Cherry gives the piece of wood to his friend Geppetto, who takes it to make himself a marionette that will dance, fence, and turn somersaults._\n\n## An Unexpected Visitor\n\nAt that very instant, a loud knock sounded on the door.\n\n"Come in," said the carpenter, not having an atom of strength left with which to stand up.\n\nAt the words, the door opened and a dapper little old man came in. His name was **Geppetto**, but to the boys of the neighborhood he was known as Polendina, on account of the wig he always wore which was just the color of yellow corn.\n\nGeppetto had a very bad temper. Woe to the one who called him Polendina! He became as wild as a beast and no one could soothe him.\n\n## Geppetto's Dream\n\n"Good day, Master Antonio," said Geppetto. "What are you doing on the floor?"\n\n"I am teaching the ants their A B C's."\n\n"Good luck to you!"\n\n"What brought you here, friend Geppetto?"\n\n"My legs. And it may flatter you to know, Master Antonio, that I have come to you to beg for a favor."\n\n"Here I am, at your service," answered the carpenter, raising himself on to his knees.\n\n"This morning a fine idea came to me."\n\n"Let's hear it."\n\n## The Marionette Plan\n\n"I thought of making myself a beautiful wooden marionette. It must be wonderful, one that will be able to **dance**, **fence**, and **turn somersaults**. With it I intend to go around the world, to earn my crust of bread and cup of wine. What do you think of it?"\n\n"Bravo, Polendina!" cried the same tiny voice which came from no one knew where.\n\nOn hearing himself called Polendina, Master Geppetto turned the color of a red pepper and, facing the carpenter, said to him angrily:\n\n"Why do you insult me?"\n\n"Who is insulting you?"\n\n"You called me Polendina."\n\n"I did not."\n\n"I suppose you think I did! Yet I KNOW it was you."\n\n---\n\n**The adventure continues in Chapter 3...**\n`
            },
            {
                file: 'chapter-03.md',
                title: 'Chapter 3: First Steps',
                content: `# Chapter 3: First Steps\n\n_Geppetto creates the marionette and names him Pinocchio. First pranks of the marionette._\n\n## The Creation Begins\n\nGeppetto took the mysterious piece of wood home and set to work immediately.\n\n"What shall I call him?" he said to himself. "I think I'll call him **PINOCCHIO**. This name will make his fortune. I knew a whole family of Pinocchios once—Pinocchio the father, Pinocchia the mother, and Pinocchi the children—and they were all lucky. The richest of them begged for his living."\n\n## Coming to Life\n\nAfter choosing the name for his marionette, Geppetto set seriously to work to make the hair, the forehead, the eyes.\n\nFancy his surprise when he noticed that the eyes moved and looked at him intently!\n\n"Ugly wooden eyes, why do you stare so?" said Geppetto.\n\nThere was no answer.\n\nAfter the eyes, Geppetto made the nose, which began to stretch as soon as finished. It stretched and stretched and stretched till it became so long, it seemed endless.\n\n## Mischief Begins\n\nPoor Geppetto kept cutting it and cutting it, but the more he cut, the longer grew that impertinent nose. In despair he let it alone.\n\nNext he made the mouth. No sooner was it finished than it began to laugh and poke fun at him.\n\n"Stop laughing!" said Geppetto angrily; but he might as well have spoken to the wall.\n\n"Stop laughing, I say!" he roared in a voice of thunder.\n\nThe mouth stopped laughing, but it stuck out a long tongue.\n\n## The First Trouble\n\nGeppetto pretended not to see and continued his work. After the mouth, he made the chin, then the neck, the shoulders, the stomach, the arms, and the hands.\n\nAs he was about to put the last touches on the finger tips, Geppetto felt his wig being pulled off. He looked up and what did he see? His yellow wig was in the marionette's hand!\n\n"Pinocchio, give me my wig!"\n\nBut instead of giving it back, Pinocchio put it on his own head, half swallowed by it.\n\nAt that unexpected trick, Geppetto became very sad and downcast, more so than he had ever been before.\n\n---\n\n**Continue to Chapter 4 to see what happens next...**\n`
            },
            {
                file: 'chapter-04.md',
                title: 'Chapter 4: The Talking Cricket',
                content: `# Chapter 4: The Talking Cricket\n\n_The story of Pinocchio and the Talking Cricket, in which one sees that bad children do not like to be corrected by those who know more than they do._\n\n## Wise Words Ignored\n\nVery little time did it take to get poor old Geppetto to prison. In the meantime that rascal, Pinocchio, free now from the clutches of the carabineer, was running wildly across fields and meadows, taking one short cut after another toward home.\n\nHe finally reached the house, and finding the door ajar, he slipped into the room, locked the door, and threw himself on the floor, happy at his escape.\n\n## A Small Voice\n\nBut his happiness lasted only a short time, for just then he heard someone saying in the room:\n\n> "Cri-cri-cri!"\n\n"Who is calling me?" asked Pinocchio, greatly frightened.\n\n"I am!"\n\nPinocchio turned and saw a large cricket crawling slowly up the wall.\n\n## The Cricket's Warning\n\n"Tell me, Cricket, who are you?"\n\n"I am the **Talking Cricket** and I have been living in this room for more than one hundred years."\n\n"Today, however, this room is mine," said the marionette, "and if you wish to do me a favor, get out now, and don't turn around even once."\n\n"I refuse to leave this spot," answered the Cricket, "until I have told you a great truth."\n\n"Tell it, then, and hurry."\n\n## The Lesson\n\n"Woe to boys who refuse to obey their parents and run away from home! They will never be happy in this world, and when they are older they will be very sorry for it."\n\n"Sing away, Cricket mine, as you please. What I know is, that tomorrow, at dawn, I leave this place forever. If I stay here the same thing will happen to me which happens to all other boys and girls. They are sent to school, and whether they want to or not, they must study."\n\n---\n\n**The adventure intensifies in Chapter 5...**\n`
            },
            {
                file: 'chapter-05.md',
                title: 'Chapter 5: School Days',
                content: `# Chapter 5: School Days\n\n_Pinocchio is hungry and searches for something to eat, but finds nothing. In the meantime, he falls asleep with his feet on a brazier and wakes up with his feet burned off._\n\n## Hunger Strikes\n\nPinocchio was greatly ashamed, but he did not answer. Instead, he walked about the room, feeling the walls with his hands.\n\n"I am hungry," said the marionette to himself. "Very, very hungry."\n\nHe went to the fireplace where the pot was boiling and was about to take off the cover to see what was in it, when—\n\n## The Egg Mystery\n\nJust then he saw something that made him jump back in surprise. What should he see there but an egg lying in the corner!\n\n"Oh, joy!" cried Pinocchio. "I'll fry it and eat it!"\n\nHe broke it, but instead of the white and the yolk, a merry little chick flew out, crying:\n\n> "A thousand thanks, friend Pinocchio, for opening my shell! Good-bye and good luck!"\n\nAnd spreading its wings, it flew out the open window and disappeared from sight.\n\n## Growing Desperation\n\nThe poor marionette stood as if turned to stone, with wide eyes, open mouth, and the empty halves of the egg-shell in his hands.\n\n"The Talking Cricket was right," he said to himself. "If I had not run away from home and if Father were here now, I should not be dying of hunger."\n\n---\n\n**More adventures await in Chapter 6...**\n`
            },
            {
                file: 'chapter-06.md',
                title: 'Chapter 6: The Land of Toys',
                content: `# Chapter 6: The Land of Toys\n\n_Pinocchio goes to the seashore with his friends to see the Terrible Shark._\n\n## The Temptation\n\nAfter five months in the Land of Toys, Pinocchio woke up one fine morning and found a great surprise awaiting him.\n\nWhat was this surprise? I shall tell you, my dear little readers. The surprise was that Pinocchio, on awakening, happened to put his hand up to his head and there he found—\n\n## The Transformation\n\nGuess!\n\nHe found that, during the night, his ears had grown to be **as long as a donkey's**!\n\nYou must know that the marionette, even from his birth, had very small ears, so small indeed that to the naked eye they could hardly be seen. Fancy how he felt when he discovered that overnight his ears had become so long!\n\n## The Truth Revealed\n\nHe went in search of a mirror, but not finding any, he just filled a basin with water and looked at himself. There he saw what he never could have wished to see.\n\nHis manly figure was adorned and enriched by a beautiful pair of donkey's ears.\n\n---\n\n**The journey continues in Chapter 7...**\n`
            },
            {
                file: 'chapter-07.md',
                title: 'Chapter 7: The Great Whale',
                content: `# Chapter 7: The Great Whale\n\n_Pinocchio finds the Shark and, in the Shark's body, whom does he find? Read this chapter and you will know._\n\n## Into the Depths\n\nAs soon as Pinocchio had said good-bye to his good friend, the Tunny, he dived into the sea and started to swim toward shore.\n\nIn a few minutes he came to a cave, so dark and deep that at first he could see nothing. But as he ventured farther in, he began to see a faint light in the distance.\n\n## The Reunion\n\nAs he swam toward it, what do you think he saw?\n\nI give you a thousand guesses, my dear little readers! He saw a little table set for dinner and lighted by a candle stuck in a glass bottle; and near the table sat a little old man, white as snow, eating live fish.\n\nAt that sight, the poor marionette was filled with such great and sudden happiness that he almost dropped in a faint.\n\n> "Father! Dear Father! Have I found you at last?"\n\n## Father and Son\n\n"Pinocchio! Is it really you?" cried old Geppetto, rubbing his eyes. "Are you my own dear Pinocchio?"\n\n"Yes, yes, yes! It is I! Look at me! And you have forgiven me, haven't you? Oh, my dear Father, how good you are! And to think that I—"\n\n"The love I have for you, Pinocchio," interrupted Geppetto, "is my reward for all I have suffered!"\n\n---\n\n**The final transformation awaits in Chapter 8...**\n`
            },
            {
                file: 'chapter-08.md',
                title: 'Chapter 8: Becoming Real',
                content: `# Chapter 8: Becoming Real\n\n_Finally Pinocchio becomes a real boy._\n\n## The Hard Work\n\nFrom that day on, for more than five months, Pinocchio got up every morning just as dawn was breaking and went to the farm to draw water.\n\nAnd every day he was given a glass of warm milk for his poor old father, who grew stronger and better day by day. But he was not satisfied with this.\n\n## Dedication and Love\n\nHe learned to make baskets of reeds and sold them. With the money he received, he and his father were able to keep from starving.\n\nAmong other things, he built a rolling chair, strong and comfortable, to take his old father out for an airing on bright, sunny days.\n\n## The Miracle\n\nOne night, after a particularly hard day's work, Pinocchio went to bed exhausted. As he slept, he had a wonderful dream.\n\nIn his dream, he saw the beautiful Blue Fairy standing beside his bed.\n\n> "Bravo, Pinocchio! In return for your kind heart, I forgive you for all your past mischief. Boys who love and care for their parents when they are old and sick deserve praise, even though they may not be perfect. Go on doing so well, and you will be happy."\n\n## The Transformation\n\nWhat was Pinocchio's surprise and joy when, on awakening, he discovered that he was no longer a marionette, but a **real live boy**!\n\nHe looked all about him and instead of the usual walls covered with straw, he found himself in a beautifully furnished room.\n\nJumping out of bed, he found a new suit of clothes, a new hat, and a pair of leather shoes that fitted him perfectly.\n\n## A New Beginning\n\nAs soon as he was dressed, he put his hands in his pockets and found a little leather purse.\n\nOn it was written: "The Fairy with Azure Hair returns the forty pennies to her dear Pinocchio with many thanks for his kind heart."\n\n"And where is Father?" cried Pinocchio.\n\nGoing into the next room, he found old Geppetto well and strong and in good humor, just as he had been in the old days.\n\n> "Tell me, Father, what is the meaning of all these wonderful things?"\n\n"The meaning of it all," answered Geppetto, "is that one good deed deserves another. You have had a kind heart, my boy, and now you are rewarded for it."\n\n## The Lesson Learned\n\n"And where is the old Pinocchio of wood?"\n\n"There he is," answered Geppetto, pointing to a large marionette leaning against a chair.\n\nPinocchio turned and looked at it for a long time.\n\n> "How ridiculous I was as a marionette! And how happy I am, now that I have become a real boy!"\n\n---\n\n**THE END**\n\n_May all children learn, as Pinocchio did, that honesty, hard work, and love can work miracles._\n`
            }
        );
        
        // Back matter
        if (hasEpilogue) {
            chapters.push({
                file: 'epilogue.md',
                title: 'Epilogue',
                content: `# Epilogue\n\n## The Legacy of a Wooden Boy\n\nYears passed, and Pinocchio grew to be a fine young man. He never forgot the lessons he learned on his journey from puppet to boy.\n\n### What Became of Them\n\n**Geppetto** lived many happy years with his son, proud of the person Pinocchio had become.\n\n**The Talking Cricket** continued to offer wisdom to those who would listen, though few were as grateful as Pinocchio eventually became.\n\n**The Blue Fairy** watched over them all, pleased that her faith in Pinocchio had been rewarded.\n\n## A Message for Readers\n\nPinocchio's story reminds us that:\n\n- We all make mistakes, but we can learn from them\n- Honesty is more valuable than any treasure\n- Hard work and dedication bring rewards\n- Love and family are what truly make us "real"\n\n> "Remember, little children, that a lie can take you far away, but it will never bring you home."\n\n---\n\n_And they all lived happily ever after._\n`
            });
        }
        
        if (hasAfterword) {
            chapters.push({
                file: 'afterword.md',
                content: `# Afterword\n\n## Reflections on a Classic Tale\n\nThe story of Pinocchio has touched hearts for generations. What began as a wooden puppet's quest to become a real boy has evolved into a universal tale about growing up and discovering what it means to be human.\n\n## Timeless Themes\n\nThis story continues to resonate because it addresses fundamental questions:\n\n- What does it mean to be "real"?\n- How do our choices shape who we become?\n- What is the value of honesty and hard work?\n- How does love transform us?\n\n## Cultural Impact\n\nSince its first publication, this tale has been:\n\n- Translated into over 260 languages\n- Adapted for stage, screen, and countless other media\n- Studied in schools around the world\n- Beloved by children and adults alike\n\n## For Modern Readers\n\nWhile the world has changed dramatically since Pinocchio's first adventure, the core truths remain constant. We all face temptations, make mistakes, and have the opportunity to learn and grow from them.\n\nMay this story inspire you, as it has inspired millions, to be honest, kind, and true to yourself and those you love.\n\n---\n\n_The Editor_  \n_${new Date().getFullYear()}_\n`
            });
        }
        
        if (hasAppendix) {
            chapters.push({
                file: 'appendix-a.md',
                content: `# Appendix A: Character Guide\n\n## Main Characters\n\n### Pinocchio\n**Role**: Protagonist  \n**Description**: A wooden marionette who dreams of becoming a real boy  \n**Characteristics**: Mischievous, curious, learns through experience  \n**Arc**: Transforms from selfish puppet to caring, responsible boy\n\n### Geppetto\n**Role**: Father figure  \n**Description**: Kind carpenter who creates and loves Pinocchio  \n**Characteristics**: Patient, loving, forgiving  \n**Significance**: Represents unconditional parental love\n\n### The Talking Cricket\n**Role**: Conscience/Advisor  \n**Description**: Wise cricket who tries to guide Pinocchio  \n**Characteristics**: Patient, persistent, truthful  \n**Lesson**: The importance of listening to good advice\n\n### The Blue Fairy\n**Role**: Supernatural helper  \n**Description**: Magical being who aids Pinocchio  \n**Characteristics**: Kind but firm, rewards good behavior  \n**Power**: Can make Pinocchio real when he proves worthy\n\n## Supporting Characters\n\n### Master Cherry (Master Antonio)\n**Role**: Discovers the magical wood  \n**Significance**: Sets the story in motion\n\n### The Fox and the Cat\n**Role**: Tricksters  \n**Lesson**: Not everyone who seems friendly has your best interests at heart\n\n### Lamp-Wick\n**Role**: Bad influence  \n**Lesson**: The consequences of choosing the wrong friends\n\n### The Great Shark\n**Role**: Obstacle/Trial  \n**Significance**: The ultimate test of Pinocchio's courage and love\n\n## Places\n\n**Geppetto's Workshop**: Where it all begins  \n**The Land of Toys**: Temptation and its consequences  \n**The Whale's Belly**: The dark night before the dawn  \n\n---\n\n_For more character analysis, see the full study guide._\n`
            });
        }
        
        if (hasGlossary) {
            chapters.push({
                file: 'glossary.md',
                content: `# Glossary\n\n## Story-Specific Terms\n\n**Marionette**  \n_noun_: A puppet controlled by strings or wires, moved from above\n\n**Cricket**  \n_noun_: A small jumping insect known for its chirping sound; in this story, represents conscience\n\n**Brazier**  \n_noun_: A portable heater consisting of a pan or stand for holding burning coals\n\n**Carabineer**  \n_noun_: A soldier or police officer (Italian term)\n\n**Polendina**  \n_noun_: Italian term for cornmeal mush; used as a teasing nickname\n\n## Moral and Thematic Terms\n\n**Conscience**  \n_noun_: The inner voice that tells us right from wrong\n\n**Honesty**  \n_noun_: The quality of being truthful and sincere\n\n**Transformation**  \n_noun_: A thorough or dramatic change in form or appearance\n\n**Redemption**  \n_noun_: The action of saving or being saved from error or evil\n\n**Perseverance**  \n_noun_: Continued effort to do or achieve something despite difficulties\n\n## Italian Cultural References\n\n**Geppetto**  \nCommon Italian name, diminutive of Giuseppe (Joseph)\n\n**Pinocchio**  \nFrom "pinolo" (pine nut) and "occhio" (eye), suggesting a wooden figure\n\n**Tuscany**  \nRegion in central Italy where the story is set\n\n---\n\n_For additional context, see the Bibliography._\n`
            });
        }
        
        if (hasBibliography) {
            chapters.push({
                file: 'bibliography.md',
                content: `# Bibliography\n\n## Primary Source\n\nCollodi, Carlo. _The Adventures of Pinocchio_. 1883. Multiple translations available.\n\n## Translations\n\n- Della Chiesa, Carol. _The Adventures of Pinocchio_. Classic English translation.\n- Murray, M.A. _Pinocchio: The Story of a Puppet_. Modern translation.\n\n## Critical Studies\n\nWunderlich, Richard and Thomas J. Morrissey. _Pinocchio Goes Postmodern_. Routledge, 2002.\n\nPerella, Nicolas J. "An Essay on Pinocchio." _Italica_, vol. 63, no. 1, 1986, pp. 1-47.\n\nWest, Rebecca. "The Meaning of Pinocchio." _The New York Review of Books_, 1991.\n\n## Cultural Analysis\n\nZipes, Jack. _Fairy Tales and the Art of Subversion_. Routledge, 2006.\n\nHeuscher, Julius E. _A Psychiatric Study of Myths and Fairy Tales_. Thomas, 1974.\n\n## Adaptations\n\n_The Adventures of Pinocchio_ (1972) - Italian TV miniseries\n\n_Pinocchio_ (1940) - Walt Disney animated film\n\n_Pinocchio_ (2002) - Roberto Benigni film\n\n## Online Resources\n\nProject Gutenberg - Free digital editions in multiple languages\n\nThe Pinocchio Society - Academic research and cultural studies\n\n## Related Works\n\nBarrie, J.M. _Peter Pan_. 1911. (Theme of childhood and transformation)\n\nBaum, L. Frank. _The Wonderful Wizard of Oz_. 1900. (Journey of self-discovery)\n\nCarroll, Lewis. _Alice's Adventures in Wonderland_. 1865. (Fantasy and moral lessons)\n\n---\n\n_Last updated: ${new Date().toISOString().split('T')[0]}_\n`
            });
        }
        
        if (hasIndex) {
            chapters.push({
                file: 'index.md',
                content: `# Index\n\n## A\n\nAdventure, 1, 15, 23, 45\nAntonio, Master Cherry, 1\n\n## B\n\nBlue Fairy, 18, 34, 52\nBrazier incident, 21\n\n## C\n\nCat (trickster), 25, 29\nCherry, Master Antonio, 1\nConscience, 14, 32, 47\nCricket, Talking, 14, 32, 54\n\n## D\n\nDonkey ears, 38\n\n## F\n\nFairy, Blue, 18, 34, 52\nFox (trickster), 25, 29\n\n## G\n\nGeppetto, 2, 7, 42, 51\nGlossary, 57\n\n## H\n\nHonesty, theme of, 16, 28, 46\n\n## L\n\nLamp-Wick, 37, 41\nLand of Toys, 36-40\nLies, consequences of, 17, 28\nLove, parental, 8, 51\n\n## M\n\nMarionette, creation of, 2-6\nMaster Antonio (Cherry), 1\n\n## N\n\nNose growing, 17, 28\n\n## P\n\nPerseverance, 44, 49\nPinocchio\n  - becomes real, 52\n  - creation of, 2\n  - first steps, 7\n  - name origin, 3\nPolendina (nickname), 2\n\n## R\n\nRedemption, 48-52\nResponsibility, learning, 44\n\n## S\n\nSchool, 22\nShark, Great, 42-45\n\n## T\n\nTalking Cricket, 14, 32, 54\nTransformation, 52\nToys, Land of, 36-40\nTricksters (Fox and Cat), 25\nTruth, importance of, 28\nTunny (fish), 43\n\n## W\n\nWhale (Great Shark), 42-45\nWood, talking, 1\nWork, value of, 44, 49\n\n---\n\n_Page numbers refer to section markers in the digital edition._\n`
            });
        }
        
        if (hasAuthorBio) {
            chapters.push({
                file: 'author-bio.md',
                content: `# About the Author\n\n## Carlo Collodi (1826-1890)\n\n**Carlo Lorenzini**, better known by his pen name **Carlo Collodi**, was an Italian author and journalist best known for creating the beloved character Pinocchio.\n\n### Early Life\n\nBorn in Florence, Italy, Collodi grew up during a time of great political change. His experiences shaped his writing and his commitment to Italian independence.\n\n### Literary Career\n\nCollodi began his career as a journalist and satirist, writing for various Italian publications. He later turned to children's literature, initially translating French fairy tales.\n\n### Creating Pinocchio\n\nIn 1881, Collodi began writing _The Adventures of Pinocchio_ as a serial story for a children's magazine. The story was an immediate success and was published as a complete book in 1883.\n\nWhat started as a simple tale became one of the most translated and adapted works in world literature.\n\n### Legacy\n\n- Created one of the most iconic characters in children's literature\n- Pioneered Italian children's fiction\n- Influenced countless authors and storytellers\n- His work has been translated into over 260 languages\n- Adapted into numerous films, plays, and other media\n\n### Other Works\n\nWhile Pinocchio remains his masterpiece, Collodi wrote several other children's books and worked extensively as a translator and journalist.\n\n### Philosophy\n\nCollodi believed in the power of stories to teach moral lessons while entertaining. His work often combined humor with serious themes about growing up, responsibility, and the consequences of one's choices.\n\n> "A lie keeps growing and growing until it's as plain as the nose on your face."\n> — Carlo Collodi, _The Adventures of Pinocchio_\n\n---\n\n_Carlo Collodi passed away in Florence in 1890, but his creation lives on, touching the hearts of children and adults around the world._\n`
            });
        }

        // Write all chapter files
        for (const chapter of chapters) {
            const filePath = path.join(chaptersDir, chapter.file);
            if (!fs.existsSync(filePath)) {
                await fse.writeFile(filePath, chapter.content, 'utf-8');
            }
        }
    }

    async generateStructuredMinimalTemplate(chaptersDir, summaryPath, config) {
        const plan = this.buildMinimalSectionPlan(config);
        await fse.ensureDir(chaptersDir);
        await this.writeSectionFiles(chaptersDir, plan.sections);
        if (plan.chapterFiles.length) {
            await this.writeChapterPlaceholders(chaptersDir, plan.chapterFiles);
        }
        if (plan.appendixFiles && plan.appendixFiles.length) {
            await this.writeChapterPlaceholders(chaptersDir, plan.appendixFiles);
        }
        await this.writeMinimalSummary(summaryPath, plan);
    }

    buildMinimalSectionPlan(config) {
        const sections = Array.isArray(config.sections) ? config.sections : [];
        const normalizedSections = [];
        for (const sectionId of sections) {
            if (sectionId === 'chapters') continue;
            const blueprint = SECTION_BLUEPRINTS[sectionId];
            if (!blueprint) continue;
            const relativeProjectPath = path.posix.join('chapters', blueprint.file.replace(/\\/g, '/'));
            normalizedSections.push({
                ...blueprint,
                relativeProjectPath
            });
        }

        const rawChapterCount = config.chapterOptions?.count ?? config.chapterCount;
        const rawAppendixCount = config.appendixOptions?.count ?? config.appendixCount ?? 0;
        const showChapterNumbers = config.chapterOptions?.showNumbers !== false;
        const includeChapters = sections.includes('chapters');
        const chapterFiles = includeChapters
            ? this.generateChapterFileMetadata(rawChapterCount, showChapterNumbers)
            : [];
        
        const appendixFiles = rawAppendixCount > 0
            ? this.generateAppendixFileMetadata(rawAppendixCount)
            : [];

        return {
            title: config.title || 'Untitled Book',
            sections: normalizedSections,
            includeChapters,
            chapterFiles,
            appendixFiles,
            showChapterNumbers
        };
    }

    generateChapterFileMetadata(count, showChapterNumbers) {
        const total = this.normalizeChapterCount(count);
        const chapters = [];
        for (let index = 1; index <= total; index += 1) {
            const slug = this.formatChapterSlug(index);
            const relativeToChapters = path.posix.join('main', `chapter-${slug}.md`);
            const projectPath = path.posix.join('chapters', relativeToChapters);
            const headingTitle = showChapterNumbers ? `Chapter ${slug}` : `New Chapter ${index}`;
            chapters.push({
                index,
                slug,
                relativeToChapters,
                projectPath,
                summaryTitle: headingTitle,
                template: `# ${showChapterNumbers ? `Chapter ${slug} — Your Title Here` : `New Chapter ${index}`}` +
                    `\n\nOutline the purpose of this chapter and begin drafting your content here.\n`
            });
        }
        return chapters;
    }

    generateAppendixFileMetadata(count) {
        const total = Math.max(0, Math.min(20, Math.floor(count)));
        const appendices = [];
        for (let index = 1; index <= total; index += 1) {
            const letter = String.fromCharCode(64 + index); // A, B, C...
            const slug = this.formatChapterSlug(index);
            const relativeToChapters = path.posix.join('appendices', `appendix-${slug}.md`);
            const projectPath = path.posix.join('chapters', relativeToChapters);
            appendices.push({
                index,
                letter,
                slug,
                relativeToChapters,
                projectPath,
                summaryTitle: `Appendix ${letter}`,
                template: `# Appendix ${letter} — Your Title Here\n\nProvide supplementary material, reference data, or additional details here.\n`
            });
        }
        return appendices;
    }

    async writeSectionFiles(chaptersDir, sections) {
        for (const section of sections) {
            const targetPath = path.join(chaptersDir, section.file);
            await fse.ensureDir(path.dirname(targetPath));
            if (!fs.existsSync(targetPath)) {
                await fse.writeFile(targetPath, section.template, 'utf-8');
            }
        }
    }

    async writeChapterPlaceholders(chaptersDir, chapterFiles) {
        for (const chapter of chapterFiles) {
            if (!chapter.relativeToChapters) {
                this.logger.warn('[BookEngine] Chapter missing relativeToChapters property, skipping:', chapter);
                continue;
            }
            const normalizedRelative = chapter.relativeToChapters.split('/').join(path.sep);
            const targetPath = path.join(chaptersDir, normalizedRelative);
            await fse.ensureDir(path.dirname(targetPath));
            if (!fs.existsSync(targetPath)) {
                await fse.writeFile(targetPath, chapter.template, 'utf-8');
            }
        }
    }

    async writeMinimalSummary(summaryPath, plan) {
        const sectionsByCategory = plan.sections.reduce((acc, section) => {
            const key = section.category || 'body';
            if (!acc[key]) acc[key] = [];
            acc[key].push(section);
            return acc;
        }, {});

        const labels = {
            front: 'Front Matter',
            body: 'Main Content',
            back: 'Back Matter'
        };

        const lines = [`# ${plan.title || 'Book Outline'}`, ''];
        const categories = ['front', 'body', 'back'];

        for (const category of categories) {
            const bucket = sectionsByCategory[category] || [];
            const shouldRenderChapters = category === 'body' && plan.chapterFiles.length > 0;
            const shouldRenderAppendices = category === 'back' && plan.appendixFiles && plan.appendixFiles.length > 0;
            
            if (!bucket.length && !shouldRenderChapters && !shouldRenderAppendices) continue;
            
            lines.push(`## ${labels[category]}`, '');
            for (const section of bucket) {
                const link = section.relativeProjectPath || `chapters/${section.file.replace(/\\/g, '/')}`;
                lines.push(`- [${section.title}](${link})`);
            }
            if (shouldRenderChapters) {
                for (const chapter of plan.chapterFiles) {
                    lines.push(`- [${chapter.summaryTitle}](${chapter.projectPath})`);
                }
            }
            if (shouldRenderAppendices) {
                lines.push('', '### Appendices', '');
                for (const appendix of plan.appendixFiles) {
                    lines.push(`- [${appendix.summaryTitle}](${appendix.projectPath})`);
                }
            }
            lines.push('');
        }

        const summaryContent = lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
        await fse.writeFile(summaryPath, summaryContent, 'utf-8');
    }

    resolveSectionSelectionForType(bookType, requestedSections) {
        const defaults = DEFAULT_SECTIONS_BY_TYPE[bookType] || DEFAULT_SECTIONS_BY_TYPE.classical;
        const base = Array.isArray(requestedSections) && requestedSections.length ? requestedSections : defaults;
        const ordered = [];
        const seen = new Set();
        const pushUnique = (id) => {
            if (!id || seen.has(id)) return;
            seen.add(id);
            ordered.push(id);
        };

        AUTO_SECTION_IDS.forEach(pushUnique);
        base.forEach(pushUnique);
        return ordered;
    }

    normalizeChapterCount(count) {
        const parsed = Number(count);
        if (Number.isFinite(parsed) && parsed > 0) {
            return Math.min(50, Math.max(1, Math.floor(parsed)));
        }
        return 12;
    }

    formatChapterSlug(index) {
        return String(index).padStart(2, '0');
    }

    async generateWikiTemplate(rootDir, chaptersDir, summaryPath, config) {
        if (!fs.existsSync(summaryPath)) {
            const summaryTemplate = `# ${config.title} Wiki

- [Home](chapters/home.md)
- [Getting Started](chapters/getting-started.md)

## Core Documentation
- [Concepts](chapters/concepts.md)
- [Architecture](chapters/architecture.md)
- [API Reference](chapters/api-reference.md)

## Guides
- [Installation Guide](chapters/installation.md)
- [Configuration Guide](chapters/configuration.md)
- [Troubleshooting](chapters/troubleshooting.md)

## Community
- [Contributing](chapters/contributing.md)
- [FAQ](chapters/faq.md)
`;
            await fse.writeFile(summaryPath, summaryTemplate, 'utf-8');
        }

        const pages = [
            { file: 'home.md', content: `# Welcome to ${config.title}\n\nThis wiki contains comprehensive documentation.\n\n## Quick Navigation\n\n- **[Getting Started](getting-started.md)** - New users start here\n- **[Core Concepts](concepts.md)** - Fundamental principles\n- **[API Reference](api-reference.md)** - Technical documentation\n\n## Recent Updates\n\n- ${new Date().toISOString().split('T')[0]}: Wiki created\n\n## Search\n\nUse the search feature to find specific topics quickly.\n` },
            { file: 'getting-started.md', content: `# Getting Started\n\nQuick start guide for new users.\n\n## Installation\n\n\`\`\`bash\nnpm install package-name\n\`\`\`\n\n## First Steps\n\n1. Create a project\n2. Configure settings\n3. Run your first command\n\n## Next Steps\n\n- [Learn Core Concepts](concepts.md)\n- [Read API Reference](api-reference.md)\n` },
            { file: 'concepts.md', content: `# Core Concepts\n\n## Overview\n\nKey concepts explained.\n\n### Concept 1: Modularity\n\nBreak complex systems into manageable components.\n\n### Concept 2: Reusability\n\nWrite code once, use it many times.\n\n## Related Topics\n\n- [Architecture](architecture.md)\n- [Best Practices](#)\n` },
            { file: 'architecture.md', content: `# Architecture\n\n## System Design\n\n\`\`\`mermaid\ngraph TD\n    A[Client] --> B[API Layer]\n    B --> C[Business Logic]\n    C --> D[Data Storage]\n\`\`\`\n\n## Components\n\n- **Frontend**: User interface\n- **Backend**: Server logic\n- **Database**: Data persistence\n` },
            { file: 'api-reference.md', content: `# API Reference\n\n## Functions\n\n### \`initialize(options)\`\n\nInitializes the system.\n\n**Parameters:**\n- \`options\` (Object): Configuration options\n\n**Returns:** Promise<void>\n\n### \`execute(command)\`\n\nExecutes a command.\n\n**Parameters:**\n- \`command\` (String): Command to execute\n\n**Returns:** Promise<Result>\n` },
            { file: 'installation.md', content: `# Installation Guide\n\n## Prerequisites\n\n- Node.js 14+\n- npm or yarn\n\n## Steps\n\n1. Download the package\n2. Install dependencies\n3. Configure environment\n4. Verify installation\n` },
            { file: 'configuration.md', content: `# Configuration Guide\n\n## Config File\n\n\`\`\`json\n{\n  "name": "my-project",\n  "version": "1.0.0",\n  "options": {}\n}\n\`\`\`\n\n## Environment Variables\n\n- \`NODE_ENV\`: Development or production\n- \`PORT\`: Server port number\n` },
            { file: 'troubleshooting.md', content: `# Troubleshooting\n\n## Common Issues\n\n### Issue: Installation fails\n\n**Solution**: Clear npm cache and retry.\n\n### Issue: Command not found\n\n**Solution**: Ensure package is globally installed.\n\n## Getting Help\n\nIf problems persist, check [FAQ](faq.md).\n` },
            { file: 'contributing.md', content: `# Contributing\n\nWe welcome contributions!\n\n## Guidelines\n\n1. Fork the repository\n2. Create a feature branch\n3. Make changes\n4. Submit pull request\n\n## Code Standards\n\nFollow the existing code style.\n` },
            { file: 'faq.md', content: `# Frequently Asked Questions\n\n## General\n\n**Q: How do I get started?**\nA: See the [Getting Started](getting-started.md) guide.\n\n**Q: Where is the API documentation?**\nA: Check the [API Reference](api-reference.md).\n\n## Technical\n\n**Q: What versions are supported?**\nA: See compatibility matrix in installation guide.\n` }
        ];

        for (const page of pages) {
            const filePath = path.join(chaptersDir, page.file);
            if (!fs.existsSync(filePath)) {
                await fse.writeFile(filePath, page.content, 'utf-8');
            }
        }
    }

    async generateHelpTemplate(rootDir, chaptersDir, summaryPath, config) {
        if (!fs.existsSync(summaryPath)) {
            const summaryTemplate = `# ${config.title} Help

- [Overview](chapters/overview.md)

## Getting Started
- [Installation](chapters/installation.md)
- [Quick Start](chapters/quick-start.md)

## How-To Guides
- [Create a Project](chapters/how-to-create-project.md)
- [Export Content](chapters/how-to-export.md)
- [Customize Settings](chapters/how-to-settings.md)

## Features
- [Editor Features](chapters/features-editor.md)
- [Preview Features](chapters/features-preview.md)
- [Export Options](chapters/features-export.md)

## Troubleshooting
- [Common Problems](chapters/troubleshooting.md)
- [Error Messages](chapters/error-messages.md)

## Reference
- [Keyboard Shortcuts](chapters/shortcuts.md)
- [Markdown Syntax](chapters/markdown-syntax.md)
`;
            await fse.writeFile(summaryPath, summaryTemplate, 'utf-8');
        }

        const helpDocs = [
            { file: 'overview.md', content: `# Overview\n\nWelcome to ${config.title}!\n\n## What is this?\n\nA comprehensive tool for creating and managing content.\n\n## Key Features\n\n- ✓ Markdown editing\n- ✓ Live preview\n- ✓ Export to multiple formats\n\n## Getting Help\n\nUse this documentation to find answers quickly.\n` },
            { file: 'installation.md', content: `# Installation\n\n## System Requirements\n\n- Operating System: Windows, macOS, Linux\n- RAM: 4GB minimum\n- Disk Space: 500MB\n\n## Installation Steps\n\n1. Download installer\n2. Run setup wizard\n3. Complete installation\n4. Launch application\n\n## Next Steps\n\nProceed to [Quick Start](quick-start.md).\n` },
            { file: 'quick-start.md', content: `# Quick Start\n\n## Your First Document\n\n1. Click **New File**\n2. Type your content\n3. See live preview\n4. Save your work\n\n## Basic Editing\n\n- **Bold**: Ctrl+B or \`**text**\`\n- **Italic**: Ctrl+I or \`*text*\`\n- **Heading**: \`# Heading\`\n\n## Saving\n\nPress Ctrl+S to save your document.\n` },
            { file: 'how-to-create-project.md', content: `# How to Create a Project\n\n## Step-by-Step\n\n### Step 1: Choose Project Type\n\nDecide what you want to create:\n- Document\n- Presentation\n- Book\n\n### Step 2: Set Up Structure\n\nCreate folders and files as needed.\n\n### Step 3: Add Content\n\nStart writing in Markdown.\n\n## Tips\n\nOrganize content logically for better management.\n` },
            { file: 'how-to-export.md', content: `# How to Export\n\n## Export to HTML\n\n1. Open document\n2. Click **Export as HTML**\n3. Choose location\n4. Click Save\n\n## Export to PDF\n\n1. Open document\n2. Click **Export as PDF**\n3. Configure options\n4. Generate PDF\n\n## Supported Formats\n\n- HTML\n- PDF\n` },
            { file: 'how-to-settings.md', content: `# Customize Settings\n\n## Opening Settings\n\nClick **Tools** → **Settings** or press Ctrl+,\n\n## Common Settings\n\n### Theme\n\nChoose light or dark theme.\n\n### Font Size\n\nAdjust for comfortable reading.\n\n### Autosave\n\nEnable automatic saving.\n` },
            { file: 'features-editor.md', content: `# Editor Features\n\n## Syntax Highlighting\n\nAutomatic color coding for Markdown syntax.\n\n## Auto-Complete\n\nSmart suggestions as you type.\n\n## Find & Replace\n\nPress Ctrl+F to search, Ctrl+H to replace.\n\n## Multi-Tab Editing\n\nWork on multiple files simultaneously.\n` },
            { file: 'features-preview.md', content: `# Preview Features\n\n## Live Preview\n\nSee rendered output in real-time.\n\n## Math Rendering\n\nKaTeX and MathJax support for equations:\n\n$$E = mc^2$$\n\n## Diagrams\n\nMermaid diagrams:\n\n\`\`\`mermaid\ngraph LR\n    A --> B\n\`\`\`\n` },
            { file: 'features-export.md', content: `# Export Options\n\n## HTML Export\n\nStandalone HTML with embedded styles.\n\n## PDF Export\n\nProfessional PDF output.\n\n## Customization\n\nAdd custom CSS for styling.\n` },
            { file: 'troubleshooting.md', content: `# Common Problems\n\n## Problem: Preview not updating\n\n**Solution**: Check if live preview is enabled in toolbar.\n\n## Problem: Export fails\n\n**Solution**: Verify file permissions and disk space.\n\n## Problem: Slow performance\n\n**Solution**: Close unused tabs, reduce file size.\n` },
            { file: 'error-messages.md', content: `# Error Messages\n\n## "File not found"\n\nThe file may have been moved or deleted.\n\n**Fix**: Check file location or open a different file.\n\n## "Export failed"\n\nExport process encountered an error.\n\n**Fix**: Check error details, ensure output folder is writable.\n` },
            { file: 'shortcuts.md', content: `# Keyboard Shortcuts\n\n## File Operations\n\n- **New File**: Ctrl+N\n- **Open**: Ctrl+O\n- **Save**: Ctrl+S\n- **Save As**: Ctrl+Shift+S\n\n## Editing\n\n- **Bold**: Ctrl+B\n- **Italic**: Ctrl+I\n- **Find**: Ctrl+F\n- **Replace**: Ctrl+H\n\n## View\n\n- **Toggle Preview**: Ctrl+Shift+P\n- **Fullscreen**: F11\n` },
            { file: 'markdown-syntax.md', content: '# Markdown Syntax Reference\n\n## Headings\n\n```markdown\n# H1\n## H2\n### H3\n```\n\n## Emphasis\n\n- **Bold**: `**text**`\n- *Italic*: `*text*`\n- ***Bold Italic***: `***text***`\n\n## Lists\n\n- Unordered: `- item`\n- Ordered: `1. item`\n\n## Links\n\n`[text](url)`\n\n## Images\n\n`![alt](image.png)`\n\n## Code\n\nInline: `` `code` ``\n\nBlock:\n````\n```language\ncode\n```\n````\n' }
        ];

        for (const doc of helpDocs) {
            const filePath = path.join(chaptersDir, doc.file);
            if (!fs.existsSync(filePath)) {
                await fse.writeFile(filePath, doc.content, 'utf-8');
            }
        }
    }

    async generateTechnicalTemplate(rootDir, chaptersDir, summaryPath, config) {
        await fse.ensureDir(chaptersDir);
        await fse.ensureDir(path.dirname(summaryPath));

        const styleKey = (config?.technicalStyle || 'report').toLowerCase();
        const template = TECHNICAL_DOCUMENT_STYLES[styleKey] || TECHNICAL_DOCUMENT_STYLES.report;
        const docContext = {
            title: config.title,
            author: config.author,
            organization: config.organization || config.company || 'Organization',
            generatedOn: new Date().toISOString().split('T')[0]
        };

        // Generate full document content
        const fullContent = typeof template.content === 'function' ? template.content(docContext) : template.content;
        
        // Parse the full content to extract sections
        const lines = fullContent.split('\n');
        const sections = [];
        let currentSection = null;
        let currentContent = [];
        
        for (const line of lines) {
            // Check for section headers with anchors like: ## Section Name {#anchor-id}
            const headerMatch = line.match(/^##\s+(.+?)\s+\{#([^}]+)\}/);
            if (headerMatch) {
                // Save previous section if exists
                if (currentSection) {
                    sections.push({
                        ...currentSection,
                        content: currentContent.join('\n').trim()
                    });
                }
                // Start new section
                currentSection = {
                    title: headerMatch[1],
                    anchor: headerMatch[2],
                    content: []
                };
                currentContent = [`# ${headerMatch[1]}\n`]; // Convert ## to # for standalone file
            } else if (currentSection) {
                currentContent.push(line);
            }
        }
        
        // Save last section
        if (currentSection) {
            sections.push({
                ...currentSection,
                content: currentContent.join('\n').trim()
            });
        }

        // Create overview/introduction file
        const overviewPath = path.join(chaptersDir, template.file);
        if (!fs.existsSync(overviewPath)) {
            const overviewLines = lines.slice(0, lines.findIndex(l => l.match(/^##\s+/)));
            const overviewContent = overviewLines.join('\n').trim() + '\n';
            await fse.writeFile(overviewPath, overviewContent, 'utf-8');
        }

        // Create separate files for each section
        const createdSections = [];
        for (const section of sections) {
            const sectionFileName = `${template.file.replace('.md', '')}-${section.anchor}.md`;
            const sectionPath = path.join(chaptersDir, sectionFileName);
            
            if (!fs.existsSync(sectionPath)) {
                await fse.writeFile(sectionPath, section.content + '\n', 'utf-8');
            }
            
            createdSections.push({
                title: section.title,
                anchor: section.anchor,
                fileName: sectionFileName
            });
        }

        // Build SUMMARY.md with separate file links
        const summaryLines = [
            `# ${config.title || 'Technical Document'}\n`,
            '',
            `- [${template.menuLabel}](chapters/${template.file})`
        ];

        for (const section of createdSections) {
            summaryLines.push(`  - [${section.title}](chapters/${section.fileName})`);
        }

        summaryLines.push('');
        await fse.writeFile(summaryPath, summaryLines.join('\n'), 'utf-8');

        return { style: styleKey, chapter: template.file, sections: createdSections };
    }

    async initProjectLegacy(targetDir, options = {}) {
        const resolvedDir = path.resolve(targetDir);
        const configPath = path.join(resolvedDir, 'book.config.json');
        const summaryPath = path.join(resolvedDir, 'SUMMARY.md');
        const sampleDir = path.join(resolvedDir, 'chapters');

        await fse.ensureDir(resolvedDir);
        await fse.ensureDir(sampleDir);

        const config = {
            ...this.defaultConfig,
            title: options.title || this.defaultConfig.title,
            author: options.author || this.defaultConfig.author,
            description: options.description || this.defaultConfig.description,
            summary: 'SUMMARY.md',
            contentDir: 'chapters',
            outputDir: 'book-dist'
        };

        if (!fs.existsSync(configPath)) {
            await fse.writeJson(configPath, config, { spaces: 2 });
        }

        if (!fs.existsSync(summaryPath)) {
            const summaryTemplate = `# Summary\n\n- [Introduction](chapters/intro.md)\n- [Getting Started](chapters/getting-started.md)\n  - [Installation](chapters/installation.md)\n  - [Workflow](chapters/workflow.md)\n- [Advanced Topics](chapters/advanced.md)\n- [Appendix](chapters/appendix.md)\n`;
            await fse.writeFile(summaryPath, summaryTemplate, 'utf-8');
        }

        const sampleChapters = [
            { file: 'intro.md', title: 'Introduction', content: '# Introduction\n\nWelcome to your new book project. This introduction was generated automatically.\n\n- Write Markdown\n- Add diagrams with Mermaid\n- Render math with KaTeX\n\n```js\nconsole.log("Hello book module");\n```' },
            { file: 'getting-started.md', title: 'Getting Started', content: '# Getting Started\n\nThe getting started chapter explains your workflow.\n\n## Steps\n\n1. Update SUMMARY.md to describe your structure.\n2. Edit files in the chapters/ directory.\n3. Use the Book menu or CLI to build HTML/PDF outputs.\n4. Serve locally for QA.\n' },
            { file: 'installation.md', title: 'Installation', content: '# Installation\n\nExplain how to install dependencies.\n' },
            { file: 'workflow.md', title: 'Workflow', content: '# Workflow\n\nDescribe your preferred workflow.\n' },
            { file: 'advanced.md', title: 'Advanced Topics', content: '# Advanced Topics\n\nCover advanced material here.\n' },
            { file: 'appendix.md', title: 'Appendix', content: '# Appendix\n\nProvide appendices, references, or glossaries.\n' }
        ];

        for (const sample of sampleChapters) {
            const filePath = path.join(sampleDir, sample.file);
            if (!fs.existsSync(filePath)) {
                await fse.writeFile(filePath, sample.content, 'utf-8');
            }
        }

        return { configPath, summaryPath, sampleDir };
    }

    async loadConfig(rootDir) {
        const configPath = path.join(rootDir, 'book.config.json');
        if (!fs.existsSync(configPath)) {
            throw new Error(`book.config.json not found at ${configPath}`);
        }
        const config = await fse.readJson(configPath);
        return { ...this.defaultConfig, ...config };
    }

    async loadSummary(rootDir, config) {
        const summaryPath = path.join(rootDir, config.summary || 'SUMMARY.md');
        if (!fs.existsSync(summaryPath)) {
            throw new Error(`Summary file not found at ${summaryPath}`);
        }
        const raw = await readFileAsync(summaryPath, 'utf-8');
        const tree = this.parseSummary(raw, rootDir);
        return { raw, tree };
    }

    parseSummary(markdown, rootDir) {
        const lines = markdown.split(/\r?\n/);
        const virtualRoot = { level: -1, children: [] };
        const stack = [virtualRoot];
        const nodes = [];
        let sequenceCounter = 0;

        lines.forEach((line) => {
            const match = line.match(/^(\s*)(?:[-*+]|\d+\.)\s+\[(.+?)\]\((.+?)\)/);
            if (!match) return;
            const indent = match[1] || '';
            const normalizedIndent = indent.replace(/\t/g, '    ');
            const depth = Math.floor(normalizedIndent.length / 2);
            const title = match[2].trim();
            const link = match[3].trim();
            const node = {
                title,
                link,
                children: [],
                level: depth,
                sequence: ++sequenceCounter,
                id: this.slugify(title),
                filePath: path.isAbsolute(link) ? link : path.join(rootDir, link)
            };

            while (stack.length && stack[stack.length - 1].level >= depth) {
                stack.pop();
            }
            stack[stack.length - 1].children.push(node);
            stack.push(node);
            nodes.push(node);
        });

        return { root: virtualRoot.children, nodes };
    }

    async build(rootDir, options = {}) {
        const resolvedRoot = path.resolve(rootDir);
        const config = await this.loadConfig(resolvedRoot);
        const { tree } = await this.loadSummary(resolvedRoot, config);
        const styleKey = config.bookStyle
            || (config.type === 'classical' ? 'classic'
                : config.type === 'wiki' ? 'wiki'
                : config.type === 'help' ? 'helpdesk'
                : 'dark');
        const stylePreset = this.resolveBookStyle(styleKey);
        
        // Compile all chapters FIRST
        this.logger.info('[BookEngine] Compiling chapters...');
        const chapters = await this.compileChapters(tree.nodes, config, resolvedRoot);
        
        const outputDir = path.resolve(config.outputDir ? path.join(resolvedRoot, config.outputDir) : path.join(resolvedRoot, 'book-dist'));
        await fse.ensureDir(outputDir);

        // Auto-generate TOC and Index AFTER compilation (with full chapter data)
        this.logger.info('[BookEngine] Generating TOC and Index...');
        await this.autoGenerateTOC(resolvedRoot, tree, chapters);
        await this.autoGenerateIndex(resolvedRoot, tree, chapters);

        const sidebar = this.renderSidebar(tree, chapters);
        const manifest = {
            metadata: this.buildMetadata(config, stylePreset),
            chapters: chapters.map(ch => ({
                title: ch.title,
                slug: ch.slug,
                fileName: ch.fileName,
                headings: ch.headings
            }))
        };

        await fse.writeJson(path.join(outputDir, 'book-manifest.json'), manifest, { spaces: 2 });
        await fse.writeJson(path.join(outputDir, 'search-index.json'), this.buildSearchIndex(chapters));
        await fse.ensureDir(path.join(outputDir, 'assets'));
        await this.writeStyleSheet(outputDir, stylePreset);
        await this.writeClientScript(outputDir, stylePreset);

        const landingHtml = this.renderLandingPage(manifest.metadata, sidebar, chapters);
        await fse.writeFile(path.join(outputDir, 'index.html'), landingHtml, 'utf-8');

        for (const chapter of chapters) {
            const html = this.renderChapterPage(manifest.metadata, sidebar, chapter);
            await fse.writeFile(path.join(outputDir, chapter.fileName), html, 'utf-8');
        }

        this.lastBuildResult = { outputDir, config, chapters, manifest };
        return this.lastBuildResult;
    }

    async autoGenerateTOC(rootDir, tree, chapters) {
        // Check if TOC file exists
        const tocPath = path.join(rootDir, 'front', 'table-of-contents.md');
        if (!fs.existsSync(tocPath)) {
            return;
        }

        this.logger.info('[BookEngine] Auto-generating Table of Contents...');

        // Generate TOC content
        let tocContent = '# Table of Contents\n\n';
        
        // If chapters not yet compiled, just create placeholder structure from tree
        if (!chapters || chapters.length === 0) {
            const generateTOCEntry = (node, indent = 0) => {
                const prefix = '  '.repeat(indent);
                tocContent += `${prefix}- ${node.title}\n`;
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => generateTOCEntry(child, indent + 1));
                }
            };
            tree.root.forEach(node => generateTOCEntry(node));
        } else {
            // Build TOC from tree structure with chapter details
            const generateTOCEntry = (node, indent = 0) => {
                const chapter = chapters.find(ch => ch.slug === node.id);
                if (chapter) {
                    const prefix = '  '.repeat(indent);
                    tocContent += `${prefix}- [${chapter.title}](#chapter-${chapter.number})\n`;
                    
                    // Add headings from the chapter
                    if (chapter.headings && chapter.headings.length > 0) {
                        chapter.headings.forEach(heading => {
                            if (heading.level === 2) { // Only include h2 headings
                                tocContent += `${prefix}  - [${heading.text}](#)\n`;
                            }
                        });
                    }
                }
                
                // Process children
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => generateTOCEntry(child, indent + 1));
                }
            };

            // Process all root nodes
            tree.root.forEach(node => generateTOCEntry(node));
        }

        // Add note about auto-generation
        tocContent += '\n---\n\n*This Table of Contents was automatically generated during the build process.*\n';

        // Write updated TOC
        await fse.writeFile(tocPath, tocContent, 'utf-8');
        this.logger.info('[BookEngine] Table of Contents generated successfully');
    }

    async autoGenerateIndex(rootDir, tree, chapters) {
        const indexNode = tree.nodes.find(node => this.nodeMatches(node, ['index']));
        const indexPath = indexNode?.filePath || path.join(rootDir, 'back', 'index.md');
        if (!indexPath) {
            return;
        }

        await fse.ensureDir(path.dirname(indexPath));

        // Skip if chapters not yet compiled
        if (!chapters || chapters.length === 0) {
            const placeholderContent = '# Index\n\n*Index will be automatically generated during the build process.*\n';
            await fse.writeFile(indexPath, placeholderContent, 'utf-8');
            return;
        }

        this.logger.info('[BookEngine] Auto-generating alphabetical Index...');

        // Collect all terms: headings, bold text, capitalized words (topics, names, places)
        const indexEntries = new Map();
        const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will', 'your', 'what', 'when', 'where', 'which', 'their', 'there', 'about', 'would', 'could', 'should']);

        chapters.forEach(chapter => {
            if (chapter.slug === indexNode?.id) {
                return;
            }

            if (chapter.headings && chapter.headings.length > 0) {
                chapter.headings.forEach(heading => {
                    const headingText = heading?.title || heading?.text || '';
                    if (!headingText) {
                        return;
                    }
                    const words = headingText.split(/[\s,;:]+/);
                    words.forEach(word => {
                        const cleaned = word.replace(/[^a-zA-Z0-9-]/g, '');
                        if (cleaned.length < 3) return;
                        const lower = cleaned.toLowerCase();
                        if (stopWords.has(lower)) return;

                        const term = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                        const key = lower;

                        if (!indexEntries.has(key)) {
                            indexEntries.set(key, {
                                term,
                                references: new Set()
                            });
                        }
                        indexEntries.get(key).references.add(chapter.number);
                    });
                });
            }

            const capitalizedMatches = chapter.html.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*\b/g) || [];
            capitalizedMatches.forEach(match => {
                const cleaned = match.trim();
                if (cleaned.length < 3) return;
                const lower = cleaned.toLowerCase();
                if (stopWords.has(lower)) return;
                if (!indexEntries.has(lower)) {
                    indexEntries.set(lower, {
                        term: cleaned,
                        references: new Set()
                    });
                }
                indexEntries.get(lower).references.add(chapter.number);
            });

            const boldMatches = chapter.html.match(/<strong>(.*?)<\/strong>/g) || [];
            boldMatches.forEach(match => {
                const text = match.replace(/<\/?strong>/g, '').trim();
                const words = text.split(/[\s,;:]+/);
                words.forEach(word => {
                    const cleaned = word.replace(/[^a-zA-Z0-9-]/g, '');
                    if (cleaned.length < 3) return;
                    const lower = cleaned.toLowerCase();
                    if (stopWords.has(lower)) return;
                    const term = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                    if (!indexEntries.has(lower)) {
                        indexEntries.set(lower, {
                            term,
                            references: new Set()
                        });
                    }
                    indexEntries.get(lower).references.add(chapter.number);
                });
            });
        });

        let indexContent = '# Index\n\n';
        indexContent += '*An alphabetical reference of topics, concepts, people, and places discussed in this book.*\n\n';

        const processedEntries = Array.from(indexEntries.entries())
            .map(([key, data]) => ({
                key,
                term: data.term,
                chapters: Array.from(data.references).sort((a, b) => a - b)
            }))
            .filter(entry => entry.chapters.length > 0)
            .sort((a, b) => a.key.localeCompare(b.key));

        let currentLetter = '';
        processedEntries.forEach(entry => {
            const firstLetter = entry.term.charAt(0).toUpperCase();
            if (firstLetter !== currentLetter) {
                currentLetter = firstLetter;
                indexContent += `\n## ${currentLetter}\n\n`;
            }
            const refs = entry.chapters.map(num => `Chapter ${num}`).join(', ');
            indexContent += `**${entry.term}** — ${refs}\n\n`;
        });

        if (processedEntries.length === 0) {
            indexContent += '*No index entries found. Index is generated from headings, emphasis, and named entities in your content.*\n';
        }

        await fse.writeFile(indexPath, indexContent, 'utf-8');
        this.logger.info(`[BookEngine] Index generated with ${processedEntries.length} entries`);

        if (indexNode?.id) {
            this.applyGeneratedChapter(chapters, indexNode.id, indexContent);
        }
    }

    async exportPdf(rootDir, outputPath, options = {}) {
        try {
            this.logger.info('[BookEngine] Starting PDF export...');
            
            // Build the book first if not already built
            let buildResult = this.lastBuildResult;
            if (!buildResult || buildResult.config.rootDir !== rootDir) {
                this.logger.info('[BookEngine] Building book before PDF export...');
                buildResult = await this.build(rootDir, options);
            }

            const { config, chapters, manifest } = buildResult;
            
            // Load TOC and Index content if they exist
            let tocContent = '';
            let indexContent = '';
            
            const tocPath = path.join(rootDir, 'front', 'table-of-contents.md');
            if (fs.existsSync(tocPath)) {
                const tocMd = await readFileAsync(tocPath, 'utf-8');
                tocContent = this.markdown.render(tocMd);
                this.logger.info('[BookEngine] Loaded TOC for PDF');
            }
            
            const indexPath = path.join(rootDir, 'back', 'index.md');
            if (fs.existsSync(indexPath)) {
                const indexMd = await readFileAsync(indexPath, 'utf-8');
                indexContent = this.markdown.render(indexMd);
                this.logger.info('[BookEngine] Loaded Index for PDF');
            }
            
            // Generate a print-optimized single HTML file for the entire book
            this.logger.info('[BookEngine] Generating print-optimized book HTML...');
            const printHtml = this.generatePrintReadyBook(manifest.metadata, chapters, tocContent, indexContent);
            
            // Write temporary print HTML
            const outputDir = path.resolve(config.outputDir ? path.join(rootDir, config.outputDir) : path.join(rootDir, 'book-dist'));
            const printPath = path.join(outputDir, 'book-print.html');
            await fse.writeFile(printPath, printHtml, 'utf-8');
            let pdfExportSuccess = false;

            if (puppeteer) {
                let browser = null;
                try {
                    this.logger.info('[BookEngine] Launching Puppeteer for PDF generation...');
                    browser = await puppeteer.launch({
                        headless: true,
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });

                    const page = await browser.newPage();
                    
                    // Load the print-optimized HTML
                    const fileUrl = `file:///${printPath.replace(/\\/g, '/')}`;
                    this.logger.info(`[BookEngine] Loading print-ready book from ${fileUrl}`);
                    
                    await page.goto(fileUrl, {
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    });

                    // Wait for fonts and rendering
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Generate professional book PDF
                    this.logger.info(`[BookEngine] Generating professional book PDF to ${outputPath}`);
                    await page.pdf({
                        path: outputPath,
                        format: 'A4',
                        printBackground: true,
                        preferCSSPageSize: false,
                        margin: {
                            top: '25mm',
                            right: '20mm',
                            bottom: '25mm',
                            left: '25mm'
                        },
                        displayHeaderFooter: true,
                        headerTemplate: `
                            <div style="width: 100%; font-size: 9pt; padding: 0 20mm; color: #666; border-bottom: 1px solid #ddd;">
                                <span style="float: left;">${this.escapeHtml(manifest.metadata.title)}</span>
                                <span style="float: right;"><span class="pageNumber"></span></span>
                            </div>
                        `,
                        footerTemplate: `
                            <div style="width: 100%; font-size: 8pt; padding: 0 20mm; color: #999; text-align: center;">
                                <span>${this.escapeHtml(manifest.metadata.author)}</span>
                            </div>
                        `
                    });

                    this.logger.info('[BookEngine] PDF export completed successfully via Puppeteer');
                    pdfExportSuccess = true;
                } catch (puppeteerErr) {
                    this.logger.warn('[BookEngine] Puppeteer PDF export failed, will check for Electron BrowserWindow fallback:', puppeteerErr.message);
                } finally {
                    if (browser) {
                        try { await browser.close(); } catch (err) {}
                    }
                }
            }

            if (!pdfExportSuccess) {
                if (process.versions && process.versions.electron) {
                    await this.exportWithElectronBrowserWindow(printPath, outputPath, manifest.metadata);
                } else {
                    throw new Error('Puppeteer is unavailable or failed, and Electron environment is not detected for fallback.');
                }
            }

            return { success: true, outputPath };
        } catch (error) {
            this.logger.error('[BookEngine] PDF export failed:', error);
            throw error;
        } finally {
            // Clean up temporary print file
            try {
                if (fs.existsSync(printPath)) {
                    await fse.remove(printPath);
                }
            } catch (cleanupErr) {
                this.logger.warn('[BookEngine] Failed to remove temporary print file:', cleanupErr.message);
            }
        }
    }

    async exportWithElectronBrowserWindow(printPath, outputPath, metadata) {
        this.logger.info('[BookEngine] Falling back to Electron BrowserWindow printToPDF workflow...');
        const { BrowserWindow } = require('electron');
        const pdfWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                sandbox: false,
                nodeIntegration: false,
                contextIsolation: true,
                zoomFactor: 1.0
            }
        });

        try {
            const fileUrl = `file:///${printPath.replace(/\\/g, '/')}`;
            this.logger.info(`[BookEngine] BrowserWindow loading print-ready book from ${fileUrl}`);
            await pdfWindow.loadURL(fileUrl);
            
            // Wait for rendering to complete (Wait for MathJax / fonts - similar to Puppeteer's timeout)
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const pdfBuffer = await pdfWindow.webContents.printToPDF({
                margins: {
                    top: 0.98,
                    bottom: 0.98,
                    left: 0.98,
                    right: 0.78
                },
                printBackground: true,
                preferCSSPageSize: false,
                pageSize: 'A4',
                displayHeaderFooter: true,
                headerTemplate: `
                    <div style="width: 100%; font-size: 9pt; padding: 0 20mm; color: #666; border-bottom: 1px solid #ddd;">
                        <span style="float: left;">${this.escapeHtml(metadata.title || 'Book')}</span>
                        <span style="float: right;"><span class="pageNumber"></span></span>
                    </div>
                `,
                footerTemplate: `
                    <div style="width: 100%; font-size: 8pt; padding: 0 20mm; color: #999; text-align: center;">
                        <span>${this.escapeHtml(metadata.author || '')}</span>
                    </div>
                `
            });

            await fse.writeFile(outputPath, pdfBuffer);
            this.logger.info('[BookEngine] BrowserWindow PDF export completed successfully');
        } finally {
            if (!pdfWindow.isDestroyed()) {
                pdfWindow.close();
            }
        }
    }

    generatePrintReadyBook(metadata, chapters, tocHtml = '', indexHtml = '') {
        const showNumbers = metadata.showChapterNumbers !== false;
        
        // Generate TOC section if provided
        const tocSection = tocHtml ? `
            <section class="book-toc" style="page-break-before: always; page-break-after: always;">
                ${tocHtml}
            </section>
        ` : '';
        
        // Generate chapter HTML with proper page breaks
        const chaptersHtml = chapters.map(ch => {
            // Content already has first H1 stripped during compilation
            return `
            <section class="book-chapter" style="page-break-before: always; page-break-after: always;">
                <header class="chapter-header">
                    ${showNumbers ? `<p class="chapter-number">Chapter ${ch.number}</p>` : ''}
                    <h1 class="chapter-title">${this.escapeHtml(ch.title)}</h1>
                </header>
                <div class="chapter-content">
                    ${ch.html}
                </div>
            </section>
        `}).join('\n');
        
        // Generate Index section if provided
        const indexSection = indexHtml ? `
            <section class="book-index" style="page-break-before: always;">
                ${indexHtml}
            </section>
        ` : '';

        return `<!DOCTYPE html>
<html lang="${metadata.language || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(metadata.title)}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <style>
        /* Print-optimized book styles */
        @page {
            size: A4;
            margin: 25mm 20mm;
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
        }
        
        /* Title page */
        .book-title-page {
            page-break-after: always;
            text-align: center;
            padding-top: 40%;
        }
        
        .book-title-page h1 {
            font-size: 36pt;
            font-weight: bold;
            margin: 0 0 20pt 0;
            color: #000;
        }
        
        .book-title-page .author {
            font-size: 14pt;
            margin: 20pt 0;
            color: #333;
        }
        
        .book-title-page .description {
            font-size: 11pt;
            font-style: italic;
            margin: 40pt auto;
            max-width: 70%;
            color: #666;
        }
        
        /* TOC styles */
        .book-toc h1 {
            font-size: 24pt;
            margin-bottom: 20pt;
            text-align: center;
        }
        
        .book-toc ul, .book-toc ol {
            list-style: none;
            padding-left: 0;
        }
        
        .book-toc li {
            margin: 8pt 0;
            font-size: 11pt;
        }
        
        /* Chapter styles */
        .book-chapter {
            orphans: 3;
            widows: 3;
        }
        
        .chapter-header {
            margin-bottom: 30pt;
        }
        
        .chapter-number {
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 1pt;
            color: #666;
            margin: 0 0 10pt 0;
        }
        
        .chapter-title {
            font-size: 24pt;
            font-weight: bold;
            margin: 0;
            color: #000;
            line-height: 1.2;
        }
        
        .chapter-content {
            text-align: justify;
        }
        
        /* Typography */
        .chapter-content h2, .book-toc h2, .book-index h2 {
            font-size: 16pt;
            font-weight: bold;
            margin: 20pt 0 10pt 0;
            page-break-after: avoid;
            color: #000;
        }
        
        .chapter-content h3 {
            font-size: 14pt;
            font-weight: bold;
            margin: 16pt 0 8pt 0;
            page-break-after: avoid;
            color: #222;
        }
        
        .chapter-content h4 {
            font-size: 12pt;
            font-weight: bold;
            margin: 12pt 0 6pt 0;
            page-break-after: avoid;
            color: #333;
        }
        
        .chapter-content p, .book-toc p, .book-index p {
            margin: 0 0 10pt 0;
            text-indent: 15pt;
            orphans: 3;
            widows: 3;
        }
        
        .chapter-content p:first-child,
        .chapter-content h2 + p,
        .chapter-content h3 + p,
        .chapter-content h4 + p,
        .book-toc p,
        .book-index p {
            text-indent: 0;
        }
        
        /* Lists */
        .chapter-content ul,
        .chapter-content ol {
            margin: 10pt 0;
            padding-left: 25pt;
            page-break-inside: avoid;
        }
        
        .chapter-content li {
            margin: 4pt 0;
        }
        
        /* GitHub-style task lists */
        .chapter-content ul.task-list,
        .chapter-content ul.contains-task-list {
            list-style: none;
            padding-left: 0;
        }
        
        .chapter-content ul.task-list ul.task-list {
            margin-left: 20pt;
        }
        
        .chapter-content li.task-list-item {
            display: flex;
            align-items: flex-start;
            gap: 6pt;
        }
        
        .chapter-content li.task-list-item input[type="checkbox"] {
            margin-top: 3pt;
        }
        
        .chapter-content li.task-completed {
            text-decoration: line-through;
            color: #666;
        }
        
        /* Code blocks */
        .chapter-content pre {
            background: #f5f5f5;
            border: 1pt solid #ddd;
            border-radius: 3pt;
            padding: 10pt;
            margin: 10pt 0;
            overflow-x: auto;
            page-break-inside: avoid;
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            line-height: 1.4;
        }
        
        .chapter-content code {
            font-family: 'Courier New', monospace;
            font-size: 9pt;
            background: #f0f0f0;
            padding: 1pt 3pt;
            border-radius: 2pt;
        }
        
        .chapter-content pre code {
            background: none;
            padding: 0;
        }
        
        /* Tables */
        .chapter-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 10pt 0;
            page-break-inside: avoid;
            font-size: 10pt;
        }
        
        .chapter-content th,
        .chapter-content td {
            border: 1pt solid #ddd;
            padding: 6pt 8pt;
            text-align: left;
        }
        
        .chapter-content th {
            background: #f5f5f5;
            font-weight: bold;
        }
        
        /* Blockquotes */
        .chapter-content blockquote {
            margin: 10pt 20pt;
            padding: 5pt 15pt;
            border-left: 3pt solid #ddd;
            font-style: italic;
            color: #555;
            page-break-inside: avoid;
        }
        
        /* Images */
        .chapter-content img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 15pt auto;
            page-break-inside: avoid;
        }
        
        /* Links - show URLs for print */
        .chapter-content a {
            color: #000;
            text-decoration: none;
            border-bottom: 1pt dotted #666;
        }
        
        @media print {
            .chapter-content a[href]:after {
                content: " (" attr(href) ")";
                font-size: 8pt;
                color: #666;
            }
            
            .chapter-content a[href^="#"]:after {
                content: "";
            }
        }
        
        /* Math rendering */
        .math-display,
        .katex-display {
            margin: 15pt 0;
            overflow-x: auto;
            page-break-inside: avoid;
        }
        
        /* Mermaid diagrams */
        .mermaid {
            page-break-inside: avoid;
            margin: 15pt 0;
        }
        
        /* Index styles */
        .book-index h1 {
            font-size: 24pt;
            margin-bottom: 20pt;
            text-align: center;
        }
        
        .book-index p {
            margin: 4pt 0;
            font-size: 10pt;
        }
        
        /* Page breaks */
        .page-break {
            page-break-after: always;
        }
        
        /* Prevent breaks */
        .no-break {
            page-break-inside: avoid;
        }
    </style>
</head>
<body>
    <!-- Title Page -->
    <div class="book-title-page">
        <h1>${this.escapeHtml(metadata.title)}</h1>
        <p class="author">by ${this.escapeHtml(metadata.author)}</p>
        ${metadata.description ? `<p class="description">${this.escapeHtml(metadata.description)}</p>` : ''}
    </div>
    
    <!-- Table of Contents -->
    ${tocSection}
    
    <!-- Chapters -->
    ${chaptersHtml}
    
    <!-- Index -->
    ${indexSection}
</body>
</html>`;
    }

    async compileChapters(nodes, config, rootDir) {
        const chapters = [];
        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            if (!node.filePath.endsWith('.md')) continue;
            if (!fs.existsSync(node.filePath)) {
                this.logger.warn(`[BookEngine] Missing chapter file: ${node.filePath}`);
                continue;
            }
            const markdown = await readFileAsync(node.filePath, 'utf-8');
            let html = this.markdown.render(markdown);
            
            // Remove first H1 to avoid duplication with chapter header
            html = html.replace(/<h1[^>]*>.*?<\/h1>/, '');
            
            const headings = this.extractHeadings(html);
            const plainText = this.extractPlainText(html);
            const slug = node.id || this.slugify(node.title);
            const fileName = `${String(index + 1).padStart(2, '0')}-${slug}.html`;
            chapters.push({
                number: index + 1,
                title: node.title,
                html,
                headings,
                slug,
                fileName,
                plainText
            });
        }
        return chapters;
    }

    renderSidebar(tree, chapters) {
        const lookup = new Map(chapters.map(ch => [ch.slug, ch]));
        const renderNode = (node) => {
            const chapter = lookup.get(node.id);
            const href = chapter ? `./${chapter.fileName}` : '#';
            const children = node.children && node.children.length ? `<ol>${node.children.map(renderNode).join('')}</ol>` : '';
            return `<li><a href="${href}">${this.escapeHtml(node.title)}</a>${children}</li>`;
        };
        const roots = Array.isArray(tree.root) ? tree.root : [];
        return `<ol class="book-nav">${roots.map(renderNode).join('')}</ol>`;
    }

    renderLandingPage(metadata, sidebar, chapters) {
        const showNumbers = metadata.showChapterNumbers !== false;
        const chapterCards = chapters.map(ch => `
            <article class="chapter-card">
                <header>
                    ${showNumbers ? `<p>Chapter ${ch.number}</p>` : ''}
                    <h2><a href="./${ch.fileName}">${this.escapeHtml(ch.title)}</a></h2>
                </header>
                <div class="chapter-preview">${ch.plainText.slice(0, 220)}...</div>
            </article>
        `).join('\n');

        return this.wrapDocument(metadata, sidebar, `
            <section class="book-cover">
                <p class="book-tag">Compiled ${new Date().toLocaleDateString()}</p>
                <h1>${this.escapeHtml(metadata.title)}</h1>
                <p class="book-author">${this.escapeHtml(metadata.author)}</p>
                ${metadata.description ? `<p class="book-description">${this.escapeHtml(metadata.description)}</p>` : ''}
            </section>
            <section class="book-summary">
                <h2>Chapters</h2>
                ${chapterCards}
            </section>
        `);
    }

    renderChapterPage(metadata, sidebar, chapter) {
        const showNumbers = metadata.showChapterNumbers !== false;
        return this.wrapDocument(metadata, sidebar, `
            <article class="book-chapter">
                <header>
                    ${showNumbers ? `<p>Chapter ${chapter.number}</p>` : ''}
                    <h1>${this.escapeHtml(chapter.title)}</h1>
                </header>
                <div class="book-chapter-content">
                    ${chapter.html}
                </div>
            </article>
        `);
    }

    wrapDocument(metadata, sidebar, content) {
        const safeStyle = metadata.bookStyle || 'dark';
        const highlightTheme = metadata.highlightTheme || 'github-dark';
        const highlightCss = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/${highlightTheme}.min.css`;
        return `<!DOCTYPE html>
<html lang="${metadata.language}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(metadata.title)}</title>
    <link rel="stylesheet" href="./assets/book.css" />
    <link rel="stylesheet" href="${highlightCss}" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
</head>
<body class="book-shell style-${safeStyle}">
    <aside class="book-sidebar">
        <div class="book-meta">
            <p class="book-tag">${this.escapeHtml(metadata.author)}</p>
            <h1>${this.escapeHtml(metadata.title)}</h1>
            ${metadata.description ? `<p>${this.escapeHtml(metadata.description)}</p>` : ''}
            <div class="book-search">
                <input id="book-search-input" type="search" placeholder="Search..." />
                <div id="book-search-results"></div>
            </div>
        </div>
        <nav>
            ${sidebar}
        </nav>
    </aside>
    <main class="book-main">
        ${content}
    </main>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/lunr@2.3.9/lunr.min.js"></script>
    <script defer src="./assets/book.js"></script>
</body>
</html>`;
    }

    async writeStyleSheet(outputDir, stylePreset = BOOK_STYLE_PRESETS.dark) {
        const css = `${BASE_BOOK_CSS}\n${stylePreset?.css || ''}`;
        const assetsDir = path.join(outputDir, 'assets');
        await fse.ensureDir(assetsDir);
        await fse.writeFile(path.join(assetsDir, 'book.css'), css, 'utf-8');
    }

    async writeClientScript(outputDir, stylePreset = BOOK_STYLE_PRESETS.dark) {
        const mermaidTheme = stylePreset?.mermaidTheme || 'dark';
        const script = `(() => {
const initHighlight = () => { if (window.hljs && typeof window.hljs.highlightAll === 'function') { window.hljs.highlightAll(); } };
const initMath = () => {
    if (window.renderMathInElement) {
        window.renderMathInElement(document.body, { delimiters: [ { left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false } ] });
    }
};
const initMermaid = () => { if (window.mermaid && window.mermaid.initialize) { window.mermaid.initialize({ startOnLoad: true, theme: '${mermaidTheme}' }); } };
const initGraphViz = async () => {
    if (typeof Viz === 'undefined') return;
    const containers = document.querySelectorAll('.graphviz-container:not(.graphviz-rendered)');
    for (const container of containers) {
        const code = decodeURIComponent(container.getAttribute('data-graphviz-code') || '');
        const engine = container.getAttribute('data-graphviz-engine') || 'dot';
        if (!code) continue;
        try {
            let svg = null;
            if (Viz.instance && typeof Viz.instance === 'function') {
                const viz = await Viz.instance();
                if (viz && typeof viz.renderSVGElement === 'function') {
                    svg = await viz.renderSVGElement(code, { engine });
                }
            }
            if (!svg && typeof Viz === 'function') {
                try {
                    const svgText = Viz(code, { format: 'svg', engine: engine });
                    if (svgText && svgText.includes('<svg')) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(svgText, 'image/svg+xml');
                        svg = doc.documentElement;
                    }
                } catch (e) {}
            }
            if (svg) {
                container.innerHTML = '';
                container.appendChild(svg);
                container.classList.add('graphviz-rendered');
            }
        } catch (err) {
            container.innerHTML = '<div class="graphviz-error">Error: ' + err.message + '</div>';
        }
    }
};
const loadSearchIndex = async () => {
    const candidates = ['./search-index.json', '../search-index.json'];
    for (const candidate of candidates) {
        try {
            const res = await fetch(candidate);
            if (res && res.ok) {
                return await res.json();
            }
        } catch (error) {
            // continue to next candidate
        }
    }
    console.warn('[BookEngine] search index unavailable');
    return null;
};
const renderSearch = async () => {
    const input = document.getElementById('book-search-input');
    const target = document.getElementById('book-search-results');
    if (!input || !target) return;
    const data = await loadSearchIndex();
    if (!data || !window.lunr) return;
    const idx = window.lunr.Index.load(data.index);
    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (!query) {
            target.innerHTML = '';
            return;
        }
        const results = idx.search(query).slice(0, 5);
        target.innerHTML = results.map(res => {
            const doc = data.documents.find(d => d.id === res.ref);
            if (!doc) return '';
            return '\\n<div class="search-hit"><a href="' + doc.fileName + '">' + doc.title + '</a><p>' + doc.preview + '</p></div>';
        }).join('');
    });
};
document.addEventListener('DOMContentLoaded', () => {
    initHighlight();
    initMath();
    initMermaid();
    initGraphViz();
    renderSearch();
});
})();`;
        const assetsDir = path.join(outputDir, 'assets');
        await fse.ensureDir(assetsDir);
        await fse.writeFile(path.join(assetsDir, 'book.js'), script, 'utf-8');
    }

    buildMetadata(config, stylePreset = this.resolveBookStyle(config.bookStyle)) {
        return {
            title: config.title,
            author: config.author,
            description: config.description,
            language: config.language || 'en',
            identifier: config.identifier || `urn:uuid:${crypto.randomUUID()}`,
            showChapterNumbers: config.chapterOptions?.showNumbers !== false,
            bookStyle: stylePreset.key,
            bookStyleLabel: stylePreset.label,
            highlightTheme: stylePreset.highlightTheme,
            mermaidTheme: stylePreset.mermaidTheme
        };
    }

    buildSearchIndex(chapters) {
        const documents = chapters.map(ch => ({
            id: ch.slug,
            title: ch.title,
            body: ch.plainText,
            preview: ch.plainText.slice(0, 160),
            fileName: ch.fileName
        }));

        const index = lunr(function() {
            this.ref('id');
            this.field('title');
            this.field('body');
            documents.forEach(doc => this.add(doc));
        });

        return { index: index.toJSON(), documents };
    }

    extractHeadings(html) {
        const headingRegex = /<h([2-4])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h\1>/gi;
        const items = [];
        let match;
        while ((match = headingRegex.exec(html)) !== null) {
            items.push({ level: parseInt(match[1], 10), id: match[2], title: this.stripTags(match[3]) });
        }
        return items;
    }

    extractPlainText(html) {
        return this.stripTags(html)
            .replace(/\s+/g, ' ')
            .trim();
    }

    stripTags(html) {
        return html.replace(/<[^>]+>/g, '');
    }

    resolveBookStyle(styleName) {
        const key = (styleName || '').toString().trim().toLowerCase();
        return BOOK_STYLE_PRESETS[key] || BOOK_STYLE_PRESETS.dark;
    }

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    slugify(text) {
        return text
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 64);
    }

    nodeMatches(node, ids) {
        if (!node || !node.id) return false;
        return ids.includes(node.id);
    }

    async serve(rootDir, options = {}) {
        const buildResult = await this.build(rootDir, options);
        const baseDir = buildResult.outputDir;
        const resolvedBase = path.resolve(baseDir);
        const port = options.port || 4500;

        if (this.server) {
            await this.stopServer();
        }

        this.server = http.createServer((req, res) => {
            const safePath = req.url === '/' ? '/index.html' : req.url;
            // Remove leading slash and normalize path for Windows compatibility
            const normalized = path.normalize(decodeURIComponent(safePath))
                .replace(/^[/\\]+/, '')
                .replace(/^(\.\.[/\\])+/, '');
            const filePath = path.join(resolvedBase, normalized);
            
            // Security check: ensure the resolved path is within the base directory
            const resolvedFilePath = path.resolve(filePath);
            if (!resolvedFilePath.startsWith(resolvedBase)) {
                this.logger.warn(`[BookEngine] Forbidden access attempt: ${req.url} -> ${resolvedFilePath}`);
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }
            
            fs.readFile(resolvedFilePath, (err, data) => {
                if (err) {
                    this.logger.warn(`[BookEngine] File not found: ${resolvedFilePath}`);
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                res.writeHead(200, { 'Content-Type': this.getMimeType(resolvedFilePath) });
                res.end(data);
            });
        });

        await new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(port, () => {
                this.logger.info(`[BookEngine] Serving book at http://localhost:${port}`);
                resolve();
            });
        });

        const watchEnabled = typeof options.watch === 'boolean' ? options.watch : (buildResult.config.watch && buildResult.config.watch.enabled);
        if (watchEnabled) {
            if (this.watcher) {
                await this.watcher.close();
            }
            this.watcher = chokidar.watch([
                path.join(rootDir, 'book.config.json'),
                path.join(rootDir, '**/*.md')
            ], {
                ignoreInitial: true,
                ignored: [path.join(baseDir, '**')]
            });
            this.watcher.on('all', async () => {
                try {
                    this.logger.info('[BookEngine] Change detected, rebuilding...');
                    await this.build(rootDir, options);
                } catch (error) {
                    this.logger.error('[BookEngine] Rebuild failed:', error.message);
                }
            });
        }

        return { port, outputDir: baseDir };
    }

    async stopServer() {
        if (this.server) {
            await new Promise(resolve => this.server.close(resolve));
            this.server = null;
        }
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
    }

    getMimeType(filePath) {
        if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
        if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
        if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
        if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
        return 'text/plain; charset=utf-8';
    }

    async searchContent(rootDir, query) {
        try {
            const config = await this.loadConfig(rootDir);
            const summary = await this.loadSummary(rootDir, config);
            const results = [];
            const searchLower = query.toLowerCase();

            // Recursively search through all chapter nodes
            const searchNode = async (node) => {
                if (!node.link) {
                    // Non-leaf node, search children
                    if (node.children && node.children.length > 0) {
                        for (const child of node.children) {
                            await searchNode(child);
                        }
                    }
                    return;
                }

                // Leaf node with file link - search content
                const filePath = path.join(rootDir, node.link);
                if (!fs.existsSync(filePath)) {
                    return;
                }

                try {
                    const content = await readFileAsync(filePath, 'utf-8');
                    const lines = content.split(/\r?\n/);
                    
                    // Search through lines
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.toLowerCase().includes(searchLower)) {
                            // Found a match - create result with context
                            const startIdx = Math.max(0, i - 1);
                            const endIdx = Math.min(lines.length - 1, i + 1);
                            const snippet = lines.slice(startIdx, endIdx + 1).join(' ').substring(0, 150);
                            
                            results.push({
                                file: node.link,
                                title: node.title,
                                snippet,
                                lineNumber: i + 1
                            });
                            
                            // Limit to first 3 matches per file
                            if (results.filter(r => r.file === node.link).length >= 3) {
                                break;
                            }
                        }
                    }
                } catch (error) {
                    this.logger.warn(`[BookEngine] Failed to search file ${node.link}:`, error.message);
                }
            };

            // Search all nodes
            for (const node of summary.tree) {
                await searchNode(node);
            }

            // Limit total results
            return results.slice(0, 20);
        } catch (error) {
            this.logger.error('[BookEngine] Search failed:', error);
            return [];
        }
    }

    // Chapter Management Functions

    async addChapter(rootDir, title, position = null) {
        try {
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (!fs.existsSync(summaryPath)) {
                throw new Error('SUMMARY.md not found');
            }

            const slug = this.slugify(title);
            const fileName = `${slug}.md`;
            const chaptersDir = path.join(rootDir, 'chapters');
            await fse.ensureDir(chaptersDir);
            const filePath = path.join(chaptersDir, fileName);

            // Create chapter file if it doesn't exist
            if (!fs.existsSync(filePath)) {
                const content = `# ${title}\n\nWrite your chapter content here.\n`;
                await fse.writeFile(filePath, content, 'utf-8');
                this.logger.info(`[BookEngine] Created chapter file: ${fileName}`);
            }

            // Update SUMMARY.md
            const summary = await readFileAsync(summaryPath, 'utf-8');
            const lines = summary.split(/\r?\n/);
            const newEntry = `- [${title}](./chapters/${fileName})`;

            if (position === null || position < 0 || position >= lines.length) {
                // Add at the end
                lines.push(newEntry);
            } else {
                // Insert at specific position
                lines.splice(position, 0, newEntry);
            }

            await fse.writeFile(summaryPath, lines.join('\n'), 'utf-8');
            this.logger.info(`[BookEngine] Added chapter "${title}" to SUMMARY.md`);

            return { success: true, filePath, slug };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to add chapter:', error);
            throw error;
        }
    }

    async removeChapter(rootDir, slug) {
        try {
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (!fs.existsSync(summaryPath)) {
                throw new Error('SUMMARY.md not found');
            }

            // Remove from SUMMARY.md
            const summary = await readFileAsync(summaryPath, 'utf-8');
            const lines = summary.split(/\r?\n/);
            const filteredLines = lines.filter(line => {
                const match = line.match(/\[.*?\]\((.*?)\)/);
                if (!match) return true;
                const link = match[1];
                return !link.includes(slug);
            });

            await fse.writeFile(summaryPath, filteredLines.join('\n'), 'utf-8');
            this.logger.info(`[BookEngine] Removed chapter "${slug}" from SUMMARY.md`);

            // Optionally delete the file (commented out for safety)
            // const filePath = path.join(rootDir, 'chapters', `${slug}.md`);
            // if (fs.existsSync(filePath)) {
            //     await fse.remove(filePath);
            // }

            return { success: true };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to remove chapter:', error);
            throw error;
        }
    }

    async reorderChapters(rootDir, newOrder) {
        try {
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (!fs.existsSync(summaryPath)) {
                throw new Error('SUMMARY.md not found');
            }

            const summary = await readFileAsync(summaryPath, 'utf-8');
            const lines = summary.split(/\r?\n/);
            
            // Extract all chapter entries
            const chapterEntries = [];
            const nonChapterLines = [];
            
            lines.forEach(line => {
                if (line.match(/^\s*[-*+]\s+\[.+\]\(.+\)/)) {
                    chapterEntries.push(line);
                } else {
                    nonChapterLines.push(line);
                }
            });

            // Reorder based on newOrder array (indices)
            const reorderedEntries = newOrder.map(index => chapterEntries[index]).filter(Boolean);

            // Reconstruct SUMMARY.md
            const newLines = [...nonChapterLines.slice(0, 1), '', ...reorderedEntries];
            await fse.writeFile(summaryPath, newLines.join('\n'), 'utf-8');
            
            this.logger.info(`[BookEngine] Reordered chapters in SUMMARY.md`);
            return { success: true };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to reorder chapters:', error);
            throw error;
        }
    }

    async addAppendix(rootDir, title) {
        try {
            const slug = this.slugify(title);
            const fileName = `appendix-${slug}.md`;
            const backDir = path.join(rootDir, 'back');
            await fse.ensureDir(backDir);
            const filePath = path.join(backDir, fileName);

            // Create appendix file
            if (!fs.existsSync(filePath)) {
                const content = `# ${title}\n\nAppendix content here.\n`;
                await fse.writeFile(filePath, content, 'utf-8');
                this.logger.info(`[BookEngine] Created appendix file: ${fileName}`);
            }

            // Update SUMMARY.md
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (fs.existsSync(summaryPath)) {
                const summary = await readFileAsync(summaryPath, 'utf-8');
                const newEntry = `- [${title}](./back/${fileName})`;
                const updated = summary + '\n' + newEntry;
                await fse.writeFile(summaryPath, updated, 'utf-8');
                this.logger.info(`[BookEngine] Added appendix "${title}" to SUMMARY.md`);
            }

            return { success: true, filePath, slug };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to add appendix:', error);
            throw error;
        }
    }

    async removeAppendix(rootDir, slug) {
        try {
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (!fs.existsSync(summaryPath)) {
                throw new Error('SUMMARY.md not found');
            }

            // Remove from SUMMARY.md
            const summary = await readFileAsync(summaryPath, 'utf-8');
            const lines = summary.split(/\r?\n/);
            const filteredLines = lines.filter(line => {
                const match = line.match(/\[.*?\]\((.*?)\)/);
                if (!match) return true;
                const link = match[1];
                return !link.includes(`appendix-${slug}`);
            });

            await fse.writeFile(summaryPath, filteredLines.join('\n'), 'utf-8');
            this.logger.info(`[BookEngine] Removed appendix "${slug}" from SUMMARY.md`);

            return { success: true };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to remove appendix:', error);
            throw error;
        }
    }

    async getBookStructure(rootDir) {
        try {
            const summaryPath = path.join(rootDir, 'SUMMARY.md');
            if (!fs.existsSync(summaryPath)) {
                return { chapters: [], appendices: [] };
            }

            const summary = await readFileAsync(summaryPath, 'utf-8');
            const lines = summary.split(/\r?\n/);
            
            const chapters = [];
            const appendices = [];

            lines.forEach((line, index) => {
                const match = line.match(/\[(.+?)\]\((.+?)\)/);
                if (!match) return;
                
                const title = match[1];
                const link = match[2];
                const isAppendix = link.includes('appendix-') || link.includes('/back/');

                const item = {
                    title,
                    link,
                    index,
                    slug: this.slugify(title)
                };

                if (isAppendix) {
                    appendices.push(item);
                } else {
                    chapters.push(item);
                }
            });

            return { chapters, appendices };
        } catch (error) {
            this.logger.error('[BookEngine] Failed to get book structure:', error);
            return { chapters: [], appendices: [] };
        }
    }
}

module.exports = { BookEngine };

