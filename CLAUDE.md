# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DocForge is a Next.js 16 application that converts `.docx` files to authority-compliant PDFs. The app lives in `docforge/`. It uses a template-driven pipeline: DOCX → Parse → Detect Structure → Transform → Render → PDF.

## Commands

All commands run from `docforge/`:

```bash
npm run dev      # Start Next.js dev server
npm run build    # Production build
npm run lint     # ESLint
```

There are no tests configured yet.

## Architecture

### Conversion Pipeline (4 phases)

1. **Parse** (`lib/parser/docx-parser.ts`) — mammoth extracts HTML from .docx, cheerio parses it into a `DocumentAST` (headings, paragraphs, lists, tables with inline formatting)
2. **Detect Structure** (`lib/structure/detector.ts`) — identifies chapters/appendices from H1 headings, builds section hierarchy (H2→H3→H4), matches against template config
3. **Transform** (`lib/transformer/transformer.ts`) — applies template typography/formatting rules, generates front matter (cover page, TOC placeholders, chapter title pages), applies manual page breaks
4. **Render** (`lib/renderer/pdf.ts`) — Puppeteer renders HTML sections to PDF, pdf-lib merges them and adds page numbers + TOC link annotations

### Two-Pass TOC Rendering

Accurate TOC page numbers require a two-pass approach:
- Pass 1: Render content sections to PDF, extract heading page positions from Chromium's PDF named destinations (`/Dests` dictionary)
- Pass 2: Regenerate TOC HTML with actual page numbers, re-render all sections, merge with pdf-lib, add page numbers and TOC link annotations

### Key Modules

| Module | File | Purpose |
|--------|------|---------|
| HTML Generator | `lib/transformer/html-generator.ts` | Converts parsed elements to styled HTML |
| HTML Builder | `lib/renderer/html-builder.ts` | Builds complete HTML pages with CSS for Puppeteer |
| Template Loader | `lib/templates/loader.ts` | Loads JSON template configs |
| Template Schema | `lib/templates/schema.ts` | TypeScript types for template configuration |

### API Endpoint

`POST /api/convert` (`app/api/convert/route.ts`) accepts FormData with a .docx file and an optional `action` parameter:
- `"parse"` — returns structure summary only
- `"prepare-preview"` — returns heading structure for the preview UI
- (default) — full conversion, returns PDF buffer

### Frontend

- `/` — Upload page with dropzone, conversion progress, download
- `/preview` — Split view: PDF iframe (left) + heading sidebar (right) for toggling manual page breaks; re-renders PDF live on changes
- State managed via React Context (`lib/context/conversion-context.tsx`)

### Template System

Templates are JSON files in `templates/` (currently `airlift-msm-v1.json`). They define page size/margins, typography for each heading level, header/footer content, document structure options (cover page, TOC, chapter title pages), and page numbering schemes (Roman numerals for front matter, chapter-relative like 1-1, 1-2 for content).

## Puppeteer/PDF Pitfalls

These are hard-won lessons — violating any of them causes subtle rendering bugs:

- **Table overflow → page scaling**: If ANY element exceeds viewport width (800px), Puppeteer scales the entire page. Always use `table-layout: fixed; width: 100%` and `overflow-wrap: break-word` on cells.
- **Header/footer template height**: Never set explicit `height` on header/footer template divs — it breaks margin rendering. Use `padding-top` instead.
- **@page CSS margins**: `@page { margin }` overrides `page.pdf({ margin })`. Don't use `@page` margin rules.
- **Named destinations require links**: Chromium only creates PDF named destinations for `id` attributes if an `<a href="#id">` link exists in the document. Add a hidden div with anchor links for all heading IDs.
- **DOM offsetTop vs print layout**: `el.offsetTop` reflects screen layout, not print layout with CSS page breaks. Extract page numbers from the actual PDF's named destinations instead.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4, shadcn/ui (new-york style), Radix UI
- **DOCX Parsing**: mammoth + cheerio
- **PDF**: Puppeteer (headless Chrome rendering) + pdf-lib (merging, page numbers, annotations)
- **Path alias**: `@/*` maps to `docforge/*`
