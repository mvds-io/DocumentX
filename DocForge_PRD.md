# DocForge — Product Requirements Document

**Automated Document Format Conversion System**

| Field   | Value          |
|---------|----------------|
| Version | 1.0            |
| Date    | February 2026  |
| Status  | Draft          |
| Author  | [Your Name]    |

---

## 1. Executive Summary

DocForge is an internal web application that automates the conversion of loosely formatted Word documents into standardized, authority-compliant PDF (or Word) outputs. Authors write content freely, then run it through DocForge, which applies the organization's predefined formatting rules — fonts, margins, headers, footers, cover pages, classification markings, and more — producing a polished, submission-ready document in seconds.

---

## 2. Problem Statement

Currently, employees spend significant time manually reformatting documents to comply with authority submission requirements. This leads to:

- Inconsistent formatting across documents
- Wasted labor on non-value-add work
- Risk of rejection by authorities due to formatting errors
- Version control issues when multiple people apply formatting manually

---

## 3. Goals and Success Metrics

### 3.1 Goals

1. Reduce document formatting time from hours to seconds.
2. Ensure 100% format compliance for all converted documents.
3. Provide an intuitive, self-service web interface that non-technical users can operate without training.
4. Support multiple output format templates for different authorities or document types.

### 3.2 Success Metrics

| Metric                  | Target                                    | Measurement               |
|-------------------------|-------------------------------------------|---------------------------|
| Conversion time         | < 30 seconds per document                 | Application logs          |
| Format compliance rate  | 100% on predefined rules                  | QA spot checks            |
| User adoption           | > 80% of document authors within 3 months | Usage analytics           |
| Error rate              | < 2% require manual correction            | User feedback / tickets   |

---

## 4. Solution Overview

### 4.1 High-Level Architecture

DocForge is a full-stack web application built on the Next.js framework (React). It consists of three main layers:

- **Frontend (React / Next.js):** Upload UI, template selection, preview, and download.
- **API Layer (Next.js API Routes / Route Handlers):** Orchestrates document parsing, transformation, and rendering.
- **Processing Engine (server-side):** Reads `.docx` files, extracts structured content, applies format templates, and generates output files.

### 4.2 Technology Stack

| Layer          | Technology                              | Purpose                        |
|----------------|-----------------------------------------|--------------------------------|
| Frontend       | React 18+ / Next.js 14+ (App Router)   | UI, upload flow, preview       |
| Styling        | Tailwind CSS                            | Responsive, clean UI           |
| UI Components  | shadcn/ui                               | Accessible, composable component library |
| State Mgmt     | React Context / Zustand                 | Client-side state              |
| DOCX Parsing   | mammoth.js / custom XML parser          | Extract content from .docx     |
| PDF Generation | Puppeteer or @react-pdf/renderer        | Render formatted PDF output    |
| DOCX Generation| docx (npm) / docx-js                   | Render formatted .docx output  |
| File Storage   | Local filesystem / S3 (temp)            | Temporary file handling        |
| Database (future) | Supabase (PostgreSQL + Auth + Storage) | Revision history, template storage, user auth, file storage, conversion logs |
| Auth (optional)| NextAuth.js / Supabase Auth / Azure AD  | SSO for internal users         |
| Deployment     | Docker / Vercel / internal infra        | Hosting and CI/CD              |

### 4.3 Core Processing Pipeline

The document conversion follows a structured pipeline:

1. **Upload:** User uploads a `.docx` file (full document or individual chapter) through the web interface.
2. **Parse:** The server extracts structured content from the document — headings, paragraphs, tables, lists, images, and metadata. It also detects chapter boundaries, heading hierarchy, and any tracked changes or revision markers.
3. **Revision Setup:** User provides revision metadata — revision number, date, author(s), per-chapter revision status, and change descriptions for the Revision Highlights section.
4. **Transform:** The extracted content is mapped against the selected format template. Each content element is assigned its target style. The system generates front matter (cover page, TOC, Index of Revisions, List of Effective Chapters, Revision Highlights) and inserts chapter title pages.
5. **Render:** The transformed content is rendered into the output format (PDF or DOCX) with all formatting rules applied, including revision bars on changed content, chapter-relative page numbering, and auto-generated TOC with correct page references.
6. **Preview & Download:** The user previews the output in-browser and downloads the final file.

---

## 5. Detailed Requirements

### 5.1 Document Upload and Validation

- Accept `.docx` files (reject `.doc`, `.pdf`, and other formats with a helpful error message).
- Maximum file size: 50 MB (configurable).
- Validate that the file is a well-formed `.docx` (ZIP archive with expected XML structure).
- Display upload progress and a summary of extracted content (heading count, page estimate, image count) before conversion.

### 5.2 Content Extraction

The parser must reliably extract the following content types from source documents:

| Content Type | Details                                                    | Priority   |
|--------------|------------------------------------------------------------|------------|
| Headings     | H1–H6 with hierarchy preserved                            | P0 (Must)  |
| Body text    | Paragraphs with inline formatting (bold, italic, underline)| P0 (Must)  |
| Lists        | Ordered and unordered, including nested lists              | P0 (Must)  |
| Tables       | With merged cells, borders, and header rows                | P0 (Must)  |
| Images       | Embedded images with position context                      | P1 (Should)|
| Footnotes    | Footnote references and content                            | P1 (Should)|
| Metadata     | Title, author, date, custom properties                     | P1 (Should)|
| Page breaks  | Explicit page breaks from source                           | P2 (Nice)  |

### 5.3 Format Template System

Format templates are the core of DocForge. Each template defines the complete visual specification for an output document. Templates are stored as JSON configuration files and managed by administrators.

#### 5.3.1 Template Configuration Schema

Each template defines the following properties:

- **Page setup:** Paper size, orientation, margins (top, bottom, left, right, gutter).
- **Typography:** Font family, size, line height, and color for each content level (body, H1–H6, caption, footer, header).
- **Header and footer:** Content, positioning, logos, page numbering format and placement, classification markings.
- **Cover page:** Layout definition including title placement, metadata fields, logos, borders.
- **Spacing rules:** Paragraph spacing (before/after), section spacing, list indentation.
- **Table styling:** Border style, header row shading, cell padding, font rules.
- **Image handling:** Max width, alignment, caption formatting.

#### 5.3.2 Template Management (Admin)

- CRUD interface for templates in an admin panel.
- Template versioning: Keep history of template changes.
- Template preview: Show a sample document rendered with the template before saving.
- Import/export templates as JSON for sharing between environments.

### 5.4 Output Generation

#### 5.4.1 PDF Output

- Pixel-perfect rendering matching the template specification.
- Embedded fonts to ensure consistent rendering on any device.
- Bookmarks / table of contents in the PDF matching the heading structure.
- Correct page numbering, headers, and footers on every page.
- **Recommended approach:** Use Puppeteer (headless Chrome) to render an HTML intermediate to PDF for maximum layout fidelity, or `@react-pdf/renderer` for a pure-JS solution.

#### 5.4.2 Word Output (Optional)

- Generate a new `.docx` with all template styles applied.
- Useful when the recipient needs an editable version.
- Use the `docx` npm library to construct the output programmatically.

### 5.5 Preview and Download

- In-browser PDF preview using an embedded viewer (e.g., react-pdf or iframe).
- Side-by-side comparison: Show source content alongside formatted output.
- Download button for the final file.
- Option to regenerate with a different template without re-uploading.

### 5.6 Font Detection and Management

Since many users will not know the exact fonts used in their target format, DocForge includes a **Font Detection** utility:

- Upload a reference PDF (the target format example), and the system extracts embedded font names, sizes, and usage patterns.
- The extracted font information is presented in a readable summary and can be auto-populated into a new template configuration.
- **Server-side implementation:** Use a PDF parsing library (e.g., pdf-lib, pdf.js, or a Python helper like PyMuPDF/fitz) to read font metadata from the reference PDF.

### 5.7 Revision Management

DocForge must support the full revision lifecycle for controlled documents like the MSM:

- **Revision metadata input:** When converting a new revision, the user provides: revision number, date, author(s), and a list of changes (section references + descriptions).
- **Index of Revisions:** Auto-generated and appended with each new revision entry.
- **List of Effective Chapters:** Auto-generated table showing current revision status per chapter. Not all chapters update every revision — only affected chapters get the new revision number.
- **Revision Highlights:** The changelog for the current revision is appended to the existing Revision Highlights section.
- **Revision bars:** Changed/new content is marked with a vertical bar in the left margin of the PDF output (see Section 11.7 for specification).
- **Diff support (future):** Optionally, DocForge could compare the current `.docx` against the previous version to auto-detect changes and suggest revision bar placement. This is a Phase 3+ feature.

---

## 6. User Interface

### 6.1 Pages and Navigation

| Page              | Purpose                    | Key Elements                                                    |
|-------------------|----------------------------|-----------------------------------------------------------------|
| Home / Upload     | Entry point, file upload   | Drag-and-drop zone, template selector, convert button           |
| Revision Setup    | Configure revision metadata| Revision number, date, author(s), chapter updates, change descriptions |
| Preview           | Review output before download | PDF viewer, side-by-side toggle, download button, re-template |
| Templates (Admin) | Manage format templates    | Template list, editor, preview, import/export                   |
| Font Analyzer     | Extract fonts from ref PDF | Upload zone, font report, auto-populate to template             |
| History           | Past conversions           | List of converted files, re-download, re-convert                |

### 6.2 UX Principles

- **Consistent components:** Use shadcn/ui primitives (Button, Dialog, Card, DropdownMenu, DataTable, Tabs, etc.) for a cohesive look and accessible interactions out of the box.
- **Minimal clicks:** Upload → Select template → Set revision info → Convert → Download in 5 steps or fewer.
- **Clear feedback:** Progress indicators during conversion, clear error messages with remediation hints.
- **Non-technical language:** Avoid jargon. Use terms like "Format style" instead of "Template schema."
- **Responsive:** Must work on desktop browsers (mobile is low priority for internal tools).

---

## 7. Proposed Project Structure

```
docforge/
├─ app/
│  ├─ layout.tsx                (root layout, navigation)
│  ├─ page.tsx                  (home / upload page)
│  ├─ revision/page.tsx         (revision metadata setup)
│  ├─ preview/page.tsx          (preview converted output)
│  ├─ admin/
│  │  ├─ templates/page.tsx     (template management)
│  │  └─ fonts/page.tsx         (font analyzer)
│  ├─ history/page.tsx          (conversion history)
│  └─ api/
│     ├─ convert/route.ts       (POST: upload + convert)
│     ├─ templates/route.ts     (CRUD for templates)
│     ├─ revisions/route.ts     (revision metadata CRUD)
│     └─ analyze-font/route.ts  (POST: font extraction)
├─ lib/
│  ├─ parser/                   (docx parsing logic)
│  ├─ transformer/              (content → template mapping)
│  ├─ renderer/
│  │  ├─ pdf.ts                 (PDF generation)
│  │  └─ docx.ts                (DOCX generation)
│  ├─ revision/                 (revision tracking, diff, change bars)
│  ├─ structure/                (TOC generation, page numbering, front matter)
│  ├─ templates/                (template schema, defaults)
│  └─ fonts/                    (font analysis utilities)
├─ components/
│  ├─ ui/                       (shadcn/ui components)
│  └─ ...                       (app-specific React components)
├─ public/                      (static assets, logos)
├─ templates/                   (JSON template files)
├─ revisions/                   (revision history data per document)
└─ uploads/                     (temp file storage)
```

---

## 8. Template Configuration Schema (Example)

Below is an example JSON structure for a format template. This would be stored in the `/templates` directory and editable through the admin UI:

```json
{
  "id": "airlift-msm-v1",
  "name": "Airlift MSM Standard Format",
  "version": "1.0",
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margins": {
      "top": 17,
      "bottom": 16,
      "left": 28,
      "right": 28
    },
    "headerOffset": 12.5,
    "footerOffset": 12.5
  },
  "typography": {
    "body": {
      "font": "Arial",
      "size": 10.6,
      "lineHeight": 12.5,
      "color": "#000000",
      "paragraphGap": 16.3
    },
    "h1": {
      "font": "Arial",
      "size": 17.3,
      "bold": true,
      "uppercase": true,
      "pageBreakBefore": true
    },
    "h2": {
      "font": "Arial",
      "size": 13.4,
      "bold": true,
      "uppercase": true,
      "spaceBefore": 20
    },
    "h3": {
      "font": "Arial",
      "size": 11.5,
      "bold": true,
      "uppercase": true,
      "spaceBefore": 16
    }
  },
  "header": {
    "enabled": true,
    "font": { "family": "Arial", "size": 9.6, "uppercase": true },
    "left": "{companyName}",
    "center": "{chapterTitle}",
    "right": "{manualAbbreviation}",
    "separatorLine": { "width": 0.48, "color": "#000000" }
  },
  "footer": {
    "enabled": true,
    "font": { "family": "Arial", "size": 9.6 },
    "left": "{date:DD.MM.YY}",
    "center": "REVISION {revisionNumber}",
    "right": "PAGE {sectionPrefix}-{pageNumber}",
    "separatorLine": { "width": 0.48, "color": "#000000" }
  },
  "documentStructure": {
    "coverPage": {
      "enabled": true,
      "logo": "/templates/assets/airlift-logo.png",
      "title": "Management System Manual",
      "subtitle": "(MSM)",
      "titleFont": { "family": "Arial", "size": 27.6, "bold": true }
    },
    "blankPages": {
      "text": "Intentionally left blank.",
      "insertAfterCover": true,
      "insertAfterTOC": true
    },
    "tableOfContents": {
      "enabled": true,
      "dotLeaders": true,
      "depth": 3,
      "headerCenter": "TABLE OF CONTENTS",
      "pageNumbering": "roman"
    },
    "chapterTitlePages": {
      "enabled": true,
      "titlePosition": "44%",
      "format": "CHAPTER {number}: \n{name}",
      "appendixFormat": "APPENDIX {letter}:\n{name}"
    },
    "pageNumbering": {
      "scheme": "chapter-relative",
      "tocFormat": "roman",
      "chapterFormat": "{prefix}-{page}",
      "chapters": [
        { "prefix": "0", "name": "Introduction" },
        { "prefix": "1", "name": "Management System Objectives & Policy" },
        { "prefix": "2", "name": "Safety Risk Management" },
        { "prefix": "3", "name": "Compliance Monitoring Program" },
        { "prefix": "4", "name": "Safety Promotion" },
        { "prefix": "5", "name": "Management Qualifications, Training & Assessment" }
      ],
      "appendices": [
        { "prefix": "A", "name": "Information Security Management System (ISMS)" },
        { "prefix": "B", "name": "Safety Performance Indicators and Targets" },
        { "prefix": "C", "name": "Occurrences Classification" },
        { "prefix": "D", "name": "Helicopter Flight Data Monitoring (HFDM) Program" },
        { "prefix": "E", "name": "Quality Module" },
        { "prefix": "F", "name": "The OpsCom System" },
        { "prefix": "G", "name": "Forms" },
        { "prefix": "H", "name": "ISIRP" }
      ]
    }
  },
  "revisionManagement": {
    "enabled": true,
    "indexOfRevisions": true,
    "listOfEffectiveChapters": true,
    "revisionHighlights": true,
    "revisionBars": {
      "enabled": true,
      "width": 1.8,
      "color": "#000000",
      "offsetFromTextMargin": -18,
      "sourceMarker": "trackedChanges"
    }
  },
  "bullets": {
    "character": "•",
    "indentFromMargin": 54,
    "textIndentFromMargin": 68
  }
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1–4)

- Set up Next.js project with TypeScript, Tailwind CSS, shadcn/ui, and ESLint.
- Build the upload UI with drag-and-drop and file validation.
- Implement DOCX parser to extract headings, paragraphs, lists, and tables.
- Implement document structure awareness: detect chapters, appendices, and heading hierarchy from the source `.docx`.
- Create the Airlift MSM template as the first hardcoded format and apply it to generate PDF output with correct headers, footers, and chapter-relative page numbering.
- Basic download functionality.

### Phase 2: Document Structure & Revision Management (Weeks 5–8)

- Implement cover page, chapter title pages, and "intentionally left blank" pages.
- Build auto-generated Table of Contents with dot leaders and correct page references.
- Build the revision metadata UI (revision number, date, author, per-chapter changes).
- Implement Index of Revisions table generation.
- Implement List of Effective Chapters table generation (track which chapters are at which revision).
- Implement Revision Highlights section generation from structured input.
- Implement revision bars (vertical change indicators in left margin) based on tracked changes or manual markers.
- Add in-browser PDF preview.

### Phase 3: Template System & Polish (Weeks 9–12)

- Design and implement the JSON template schema for other document formats.
- Build the admin template editor (form-based UI to create/edit templates).
- Add template selector to the upload flow.
- Implement the font analyzer (upload reference PDF, extract font info).
- Image extraction and embedding in output (including signatures).
- Table and footnote support.
- Conversion history with re-download and re-convert.
- Optional DOCX output generation.
- Error handling, logging, and edge case coverage.
- Authentication integration (if required).
- Docker packaging and deployment.

---

## 10. Risks and Mitigations

| Risk                                              | Impact                                    | Mitigation                                                                                              |
|---------------------------------------------------|-------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Complex source documents with unusual formatting  | Parser fails or produces garbled output   | Build robust error handling; allow manual override of extraction; iterate parser with real test files    |
| Font licensing restrictions                       | Fonts may not be embeddable in PDFs       | Use Puppeteer (renders with system fonts); ensure target fonts are installed on the server              |
| PDF layout fidelity                               | Output doesn't match pixel-for-pixel     | Use HTML/CSS intermediate with Puppeteer for precise control; iterative QA against reference PDFs       |
| Large file processing                             | Timeouts or memory issues                 | Stream processing; set file size limits; use worker threads for conversion                              |
| Template complexity                               | Difficult to configure without tech skills| Build a visual template editor; provide sensible defaults; use the font analyzer to auto-detect settings|

---

## 11. Format Specification (Extracted from Test Files)

The following specification was reverse-engineered from the uploaded source `.docx` (MSM_AppA_Rev_30.docx) and target PDF (innh_appA__Merged_.pdf). This is the "Airlift MSM" template — the first template to implement.

### 11.1 Page Setup

| Property       | Value                                      |
|----------------|--------------------------------------------|
| Paper size     | A4 (210 × 297 mm / 595 × 842 pts)         |
| Orientation    | Portrait                                   |
| Left margin    | ~28 mm (80 pts)                            |
| Right margin   | ~28 mm (80 pts)                            |
| Top margin     | ~17 mm (49 pts) — from page edge to header text |
| Bottom margin  | ~16 mm (46 pts) — from footer text to page edge |
| Header offset  | ~12.5 mm (708 DXA / ~36 pts from page edge) |
| Footer offset  | ~12.5 mm (708 DXA / ~36 pts from page edge) |

### 11.2 Typography

The source Word document uses **Arial** for headers and a custom "Body" style with **Arial 11pt**. The PDF rendering shows the following measured sizes:

| Element         | Font   | Size     | Weight | Style     | Notes                        |
|-----------------|--------|----------|--------|-----------|------------------------------|
| Body text       | Arial  | 10.6 pt  | Normal | Roman     | Black (#000000)              |
| H1 (Chapter)    | Arial  | 17.3 pt  | Bold   | UPPERCASE | e.g., "A.1 INTRODUCTION"    |
| H2 (Section)    | Arial  | 13.4 pt  | Bold   | UPPERCASE | e.g., "A.2 INFORMATION SECURITY POLICY" |
| H3 (Subsection) | Arial  | 11.5 pt  | Bold   | UPPERCASE | e.g., "A.2.1 INFORMATION SECURITY OBJECTIVES" |
| Header text     | Arial  | 9.6 pt   | Normal | UPPERCASE | Company, chapter title, manual abbr. |
| Footer text     | Arial  | 9.6 pt   | Normal | Roman     | Date, revision, page number  |
| TOC entries     | Arial  | 10.6 pt  | Normal | Roman     | Dot leaders to page numbers  |
| Bullet text     | Arial  | 10.6 pt  | Normal | Roman     | Same as body                 |
| Table label     | Arial  | 10.6 pt  | Normal | Roman     | e.g., "Table 14: Likelihood" |

### 11.3 Line Spacing and Paragraph Spacing

| Property                  | Value      |
|---------------------------|------------|
| Body line height          | ~12.5 pt   |
| Paragraph gap (body)      | ~16.3 pt (between paragraphs) |
| Bullet line spacing       | ~13.4 pt   |
| Space before H1           | Page break (each H1 starts new content area below header) |
| Space before H2           | ~20 pt     |
| Space before H3           | ~16 pt     |

### 11.4 Header Layout

A three-column header appears on every page, separated from body content by a horizontal black line:

```
[Airlift AS]          [CHAPTER TITLE IN CAPS]          [MSM]
————————————————————————————————————————————————————————————
```

- **Left:** Company name ("Airlift AS") — 9.6pt, normal weight
- **Center:** Current chapter/section title in UPPERCASE — 9.6pt, normal weight
- **Right:** Manual abbreviation ("MSM") — 9.6pt, normal weight
- **Separator:** Black horizontal line, ~0.48pt width, spanning full content width

### 11.5 Footer Layout

A three-column footer appears on every page, separated from body content by a horizontal black line:

```
————————————————————————————————————————————————————————————
[22.02.26]              [REVISION 30]              [PAGE A-2]
```

- **Left:** Date in DD.MM.YY format — 9.6pt
- **Center:** "REVISION {n}" — 9.6pt
- **Right:** "PAGE {section}-{page}" — 9.6pt
- **Separator:** Black horizontal line above footer, ~0.48pt width

### 11.6 Section Title Pages

Certain sections (e.g., appendices) have a dedicated title page with:
- Header and footer as normal
- No section title in the header center area (only company name left, manual abbreviation right)
- Section title centered vertically on page (~44% down)
- Title in 17.3pt bold, UPPERCASE
- Multiple lines if needed (e.g., "APPENDIX A:" / "INFORMATION SECURITY MANAGEMENT" / "SYSTEM (ISMS)")

### 11.7 Revision Bars (Change Indicators)

This is a critical feature. A thin black vertical bar is drawn in the left margin to indicate text that is new or changed compared to the previous revision:

| Property       | Value                                      |
|----------------|--------------------------------------------|
| Position       | ~62 pts from left page edge (about 22mm)   |
| Width          | ~1.8 pts                                   |
| Color          | Black, solid fill                          |
| Vertical span  | From the top of the first changed line to the bottom of the last changed line |
| Margin offset  | ~18 pts to the left of the text content area |

**Implementation approach:** The source Word document should include a way to mark changed sections (e.g., custom styles, bookmarks, tracked changes, or a simple marker convention like a custom paragraph property). During conversion, DocForge detects these markers and renders the corresponding revision bars in the PDF output.

### 11.8 Document Structure

The MSM is a multi-chapter document with a strict structural hierarchy. DocForge must understand and produce this structure:

#### 11.8.1 Document Sections (in order)

| Section | Description | Page Numbering |
|---------|-------------|----------------|
| Cover page | Airlift logo + "Management System Manual (MSM)" centered | None |
| Blank page | "Intentionally left blank." centered vertically | None |
| Table of Contents | Full TOC with dot leaders, spanning multiple pages | Roman numerals (i, ii, iii...) |
| Chapter title page | "CHAPTER 0: INTRODUCTION" centered vertically (~44% down page) | Chapter-relative (0-1) |
| Chapter content | Body content with headings, tables, lists | Chapter-relative (0-2, 0-3...) |
| Additional chapters | Chapters 1–5 with same pattern | 1-1, 1-2... through 5-1, 5-2... |
| Appendices | Appendix A–H with same pattern | A-1, A-2... through H-1, H-2... |

#### 11.8.2 Page Numbering Scheme

Pages use **chapter-relative numbering**: `{chapter prefix}-{page number within chapter}`. Examples: `0-4`, `1-12`, `A-3`, `H-22`. The TOC pages use lowercase Roman numerals (i, ii, iii...). The cover page and "intentionally blank" page have no page numbers.

#### 11.8.3 Cover Page

- Airlift logo image centered horizontally, positioned in upper third
- Title "Management System Manual" in ~27.6pt bold, centered
- Subtitle "(MSM)" in ~27.6pt bold, centered below
- No header or footer

#### 11.8.4 "Intentionally Left Blank" Pages

- Text "Intentionally left blank." in 10.6pt body font, centered both horizontally and vertically
- No header or footer (or standard header/footer depending on position in document)

#### 11.8.5 Chapter Title Pages

- Standard header and footer present
- Chapter title centered vertically at ~44% down the page
- Title in 17.3pt bold, UPPERCASE
- Format: "CHAPTER {n}:" on first line, chapter name on subsequent line(s)
- For appendices: "APPENDIX {letter}:" followed by appendix name

### 11.9 Revision Management (Front Matter)

The MSM includes several revision tracking sections in Chapter 0 (Introduction). DocForge must support generating and maintaining these:

#### 11.9.1 Index of Revisions

A table tracking every revision ever made to the document:

| Column | Description |
|--------|-------------|
| Rev. | Revision number (0, 1, 2... 30) |
| Issue date | Date in DD.MM.YYYY format |
| Insert date | Date inserted (often left blank) |
| Inserted by | Name(s) of person(s) who made the revision |

This table is labeled (e.g., "Table 3: Index of Revisions") and grows with each revision. It can span multiple pages.

#### 11.9.2 List of Effective Chapters

A table showing the current state of each chapter:

| Column | Description |
|--------|-------------|
| Chapter | Chapter name (e.g., "Chapter 0", "Appendix A") |
| Pages | Page range (e.g., "Page 1 to page 32") |
| Revision | Current revision of that chapter (e.g., "Revision 30") |
| Date | Date of that revision (DD.MM.YY) |

Not all chapters are necessarily at the same revision — some may be at older revisions if unchanged.

#### 11.9.3 Revision Highlights

A detailed changelog for every revision, written in prose/bullet form. Each revision section includes:

- Revision number as heading (e.g., "Revision 30")
- List of specific changes by section reference (e.g., "1.3.4 Added Information Security Manager in management structure")
- Can span many pages for major revisions

**Implementation approach:** DocForge should allow authors to input revision metadata (revision number, date, author, chapter-level changes) either through a structured form in the UI or by reading a dedicated revision metadata section from the source Word document. The system then auto-generates the Index of Revisions table, updates the List of Effective Chapters, and appends new Revision Highlights.

### 11.10 Bullet Points

| Property        | Value                                     |
|-----------------|-------------------------------------------|
| Bullet char     | • (filled circle)                         |
| Bullet indent   | ~54 pts from left margin (x ≈ 134pt)      |
| Text indent     | ~68 pts from left margin (x ≈ 148pt)      |
| Spacing          | Same as body text line height (~13.4pt)   |

### 11.11 Tables

Tables in the document use:
- Labeled headers (e.g., "Table 14: Likelihood")
- Header rows with distinct styling
- Standard border lines
- Cell content in body text size (10.6pt)

### 11.12 Table of Contents Generation

The TOC uses a specific format with dot leaders and chapter-relative page numbers:

```
0   INTRODUCTION.............................................................................0-2
0.1 DISTRIBUTION LIST .........................................................................................0-2
0.1.1 REVISIONS TO THE MANUAL.......................................................................... 0-2
```

- H1 entries: Number + title in UPPERCASE, left-aligned, dot leaders to page number
- H2 entries: Indented, UPPERCASE, dot leaders
- H3 entries: Further indented, UPPERCASE, dot leaders
- TOC header uses "TABLE OF CONTENTS" as the center header text
- TOC pages use lowercase Roman numeral page numbering (i, ii, iii...)
- DocForge must auto-generate the TOC from the document heading structure

---

## 11.14 Future: Supabase Integration

Supabase is planned as a future backend layer to unlock persistent storage, multi-user collaboration, and richer functionality. The initial Phase 1–3 implementation will work with local filesystem and in-memory state, keeping the architecture Supabase-ready so the migration is straightforward.

### Planned Supabase Use Cases

| Feature | Supabase Service | Description |
|---------|-----------------|-------------|
| Revision history | PostgreSQL | Store every revision's metadata (number, date, author, change list, per-chapter status) as structured data. Enables auto-populating Index of Revisions and List of Effective Chapters from the database rather than parsing previous documents. |
| Template storage | PostgreSQL + Storage | Store template JSON configs in the database and associated assets (logos, fonts) in Supabase Storage. |
| Conversion history | PostgreSQL + Storage | Log every conversion (who, when, which template, source hash) and store output PDFs in Storage for re-download. |
| User authentication | Supabase Auth | Replace NextAuth.js with Supabase Auth for email/password or SSO (Azure AD via SAML). Row-level security (RLS) can restrict template management to admins. |
| File uploads | Supabase Storage | Store source `.docx` files and generated PDFs with signed URLs for secure download. Replaces local filesystem. |
| Document versioning | PostgreSQL | Track document versions over time, enabling automatic diff-based revision bar generation by comparing current and previous content in the database. |
| Multi-user collaboration | PostgreSQL + Realtime | Multiple authors could work on different chapters, with Supabase tracking chapter-level locks and merge status. |

### Migration Strategy

- **Phase 1–3:** Build with local filesystem and JSON files. Template configs live in `/templates/*.json`. Revision metadata is provided per-conversion via the UI.
- **Phase 4 (Supabase):** Introduce Supabase. Migrate template configs to PostgreSQL, file storage to Supabase Storage, and add auth. The `lib/` layer abstracts data access, so swapping from filesystem to Supabase requires updating the data layer without changing the parser, transformer, or renderer.

---

### 11.15 Source Word Document Conventions

The source `.docx` uses the following fonts (from fontTable.xml): Arial, Times New Roman, Aptos, Poppins Medium, Courier New, Calibri, and Segoe UI. The Word document's page setup is A4 with 25mm (1417 DXA) margins on all sides.

Notable styles in the source document:
- "Body" style: Arial 11pt, black, with 80 DXA spacing before and 20 DXA after
- "paragraph" style: Times New Roman with 100 DXA spacing before/after
- Standard heading styles (Overskrift 1–9) using default Aptos theme colors

---

## 12. Remaining Open Questions

1. **Revision bar source data:** How are changed sections currently marked in the source Word document? Options include: (a) Word tracked changes (most automatable — DocForge reads the diff), (b) a custom Word style or highlight applied to new/changed paragraphs, (c) the author manually specifies changed section numbers in the revision metadata form. Which approach fits your workflow best?
2. **Chapter-level uploads vs. full document:** The MSM is a large multi-chapter document where not all chapters change every revision. Should DocForge handle the entire MSM as one `.docx`, or should authors upload individual chapter `.docx` files that get assembled into the full document?
3. **Previous revision storage:** To auto-generate revision bars and "List of Effective Chapters," DocForge needs access to the previous revision's data. Should the system store revision history in a database, or will the user provide the previous PDF/DOCX alongside the new one?
4. **Labeled tables:** Tables in the MSM are labeled sequentially within each chapter (e.g., "Table 3: Index of Revisions"). Should DocForge auto-number tables, or does the author provide the labels?
5. **Logos and images:** The cover page uses the Airlift logo. Should this be part of the template configuration (uploaded once to the admin panel), or embedded in each source document?
6. **Authentication:** Is SSO/AD integration required, or is this an open internal tool?
7. **Deployment target:** Cloud (Vercel, AWS), on-premises Docker, or hybrid?
8. **Concurrent authorship:** Do multiple people ever work on different chapters simultaneously, requiring a merge/assembly step?

---

## 13. Next Steps

1. **~~Upload test files~~** ✅ — Source `.docx` and reference PDF analyzed. Format specification captured in Section 11.
2. **Resolve open questions:** Clarify revision bar source data, deployment target, and authentication requirements (Section 12).
3. **Review and approve this PRD:** Align on scope, priorities, and timeline with stakeholders.
4. **Set up the development environment:** Initialize the Next.js project with TypeScript, Tailwind CSS, shadcn/ui, and install dependencies.
5. **Build Phase 1 prototype:** Implement the "Airlift MSM" template as the first hardcoded format and get a working upload-to-PDF pipeline.
6. **Iterate with real documents:** Test against actual business documents and refine the parser, renderer, and revision bar detection.

---

## Appendix A: Key Library References

| Library              | Use Case                                   | Link                        |
|----------------------|--------------------------------------------|-----------------------------|
| shadcn/ui            | Accessible UI component library            | ui.shadcn.com               |
| mammoth.js           | DOCX to HTML/structured content extraction | npmjs.com/package/mammoth   |
| docx (npm)           | Programmatic DOCX creation                 | npmjs.com/package/docx      |
| @react-pdf/renderer  | React-based PDF generation                 | react-pdf.org               |
| Puppeteer            | Headless Chrome PDF rendering              | pptr.dev                    |
| pdf-lib              | PDF manipulation and font extraction       | pdf-lib.js.org              |
| PyMuPDF (fitz)       | Advanced PDF font/metadata extraction      | pymupdf.readthedocs.io      |
| NextAuth.js          | Authentication for Next.js                 | next-auth.js.org            |
| Supabase             | PostgreSQL, Auth, Storage, Realtime (future)| supabase.com                |
