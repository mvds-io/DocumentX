import mammoth from "mammoth";
import { load, type CheerioAPI, type Cheerio } from "cheerio";
import type { Element as DomElement, Text as DomText, AnyNode } from "domhandler";
import type {
  DocumentAST,
  DocumentElement,
  HeadingElement,
  ParagraphElement,
  ListElement,
  ListItemElement,
  TableElement,
  TableRow,
  InlineElement,
} from "./types";

const STYLE_MAP = [
  // Norwegian style names
  "p[style-name='Overskrift 1'] => h1:fresh",
  "p[style-name='Overskrift 2'] => h2:fresh",
  "p[style-name='Overskrift 3'] => h3:fresh",
  "p[style-name='Overskrift 4'] => h4:fresh",
  // English style names
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  // Body text styles (including Norwegian Brdtekst)
  "p[style-name='Body'] => p:fresh",
  "p[style-name='Body Text'] => p:fresh",
  "p[style-name='paragraph'] => p:fresh",
];

// Pattern to detect section numbering like A.1, A.5.2, 0.3, 3.2.1
const SECTION_NUMBER_RE = /^([A-Z]\.\d+(?:\.\d+)*|\d+(?:\.\d+)+)\s+/;
// Pattern to detect top-level section numbers like A.1, A.2 (H2 level)
const H2_SECTION_RE = /^[A-Z]\.\d+\s+/;
// Pattern to detect sub-section numbers like A.5.1, A.8.3 (H3 level)
const H3_SECTION_RE = /^[A-Z]\.\d+\.\d+\s+/;

export async function parseDocx(buffer: Buffer): Promise<DocumentAST> {
  const result = await mammoth.convertToHtml(
    { buffer },
    { styleMap: STYLE_MAP }
  );

  if (result.messages.length > 0) {
    const uniqueWarnings = new Set(result.messages.map((m) => m.message));
    console.warn("Mammoth warnings:", [...uniqueWarnings]);
  }

  const $ = load(result.value);
  const rawElements: DocumentElement[] = [];

  $("body")
    .children()
    .each((_, el) => {
      const node = $(el);
      const domEl = el as DomElement;
      const tagName = domEl.tagName?.toLowerCase();

      if (!tagName) return;

      if (/^h[1-6]$/.test(tagName)) {
        const level = parseInt(tagName[1]) as 1 | 2 | 3 | 4 | 5 | 6;
        const text = node.text().trim();
        const numbering = extractNumbering(text);
        rawElements.push({
          type: "heading",
          level,
          text,
          numbering: numbering ?? undefined,
          children: extractInlineElements(node, $),
        } satisfies HeadingElement);
      } else if (tagName === "p") {
        const text = node.text().trim();
        const hasImage = node.find("img").length > 0;
        if (text.length === 0 && !hasImage) return;

        // Check if this bold paragraph is actually a heading
        const promoted = tryPromoteToHeading(node, $, text);
        if (promoted) {
          rawElements.push(promoted);
        } else {
          rawElements.push({
            type: "paragraph",
            children: extractInlineElements(node, $),
          } satisfies ParagraphElement);
        }
      } else if (tagName === "ul" || tagName === "ol") {
        rawElements.push(parseList(node, $, tagName === "ol"));
      } else if (tagName === "table") {
        rawElements.push(parseTable(node, $));
      }
    });

  // Post-process: normalize heading levels and strip the TOC section
  const elements = postProcess(rawElements);

  return { metadata: {}, elements };
}

/**
 * Detect bold paragraphs that match section numbering patterns
 * and promote them to heading elements.
 */
function tryPromoteToHeading(
  node: Cheerio<AnyNode>,
  $: CheerioAPI,
  text: string
): HeadingElement | null {
  // Check if the paragraph is entirely or mostly bold
  const strongChildren = node.find("strong, b");
  if (strongChildren.length === 0) return null;

  const strongText = strongChildren.text().trim();
  const fullText = text;

  // The bold content should be at least 80% of the text
  if (strongText.length < fullText.length * 0.7) return null;

  // Check against section numbering patterns
  if (H3_SECTION_RE.test(fullText)) {
    return {
      type: "heading",
      level: 3,
      text: fullText,
      numbering: extractNumbering(fullText) ?? undefined,
      children: extractInlineElements(node, $),
    };
  }

  if (H2_SECTION_RE.test(fullText)) {
    return {
      type: "heading",
      level: 2,
      text: fullText,
      numbering: extractNumbering(fullText) ?? undefined,
      children: extractInlineElements(node, $),
    };
  }

  // Check for appendix/chapter title patterns
  if (/^APPENDIX\s+[A-Z]\s*:/i.test(fullText)) {
    return {
      type: "heading",
      level: 1,
      text: fullText,
      numbering: undefined,
      children: extractInlineElements(node, $),
    };
  }

  // Check for standalone section references like "A INFORMATION SECURITY..."
  if (/^[A-Z]\s+[A-Z]/i.test(fullText) && fullText === fullText.toUpperCase()) {
    return {
      type: "heading",
      level: 1,
      text: fullText,
      numbering: undefined,
      children: extractInlineElements(node, $),
    };
  }

  return null;
}

/**
 * Post-process elements to:
 * 1. Keep the first H1 (appendix/chapter title)
 * 2. Strip everything between the H1 title and the first numbered section (H2)
 *    — this removes the in-document TOC, forms list, and subtitle
 * 3. Normalize heading levels based on section numbering depth
 */
function postProcess(elements: DocumentElement[]): DocumentElement[] {
  const result: DocumentElement[] = [];
  let state: "before-title" | "skipping-toc" | "content" = "before-title";

  for (const el of elements) {
    switch (state) {
      case "before-title":
        // Look for the first H1 heading (appendix/chapter title)
        if (el.type === "heading" && el.level === 1) {
          result.push(el);
          state = "skipping-toc";
        }
        // Skip everything before the first heading
        break;

      case "skipping-toc":
        // Skip all content between the title heading and the first numbered
        // section heading (H2). This strips the in-document TOC and forms list.
        if (el.type === "heading" && el.level !== 1) {
          // Found the first section heading — start keeping content
          result.push(el);
          state = "content";
        }
        // Also check for H1s that are actually numbered sections (A.1 etc.)
        // which were already normalized
        if (el.type === "heading" && el.level === 1 && el.numbering) {
          result.push(el);
          state = "content";
        }
        break;

      case "content":
        result.push(el);
        break;
    }
  }

  return normalizeHeadingLevels(result);
}

/**
 * Normalize heading levels based on section numbering depth.
 * A.1 -> H2, A.5.1 -> H3, standalone titles -> H1
 */
function normalizeHeadingLevels(elements: DocumentElement[]): DocumentElement[] {
  return elements.map((el) => {
    if (el.type !== "heading") return el;

    const text = el.text.trim();
    const numbering = el.numbering;

    if (numbering) {
      const depth = numbering.split(".").length;
      // A.5.1 = depth 3 -> H3
      // A.5 = depth 2 -> H2
      if (depth >= 3) {
        return { ...el, level: 3 as const };
      }
      if (depth === 2) {
        return { ...el, level: 2 as const };
      }
    }

    // Non-numbered headings or single-depth stay as H1
    // (e.g., "APPENDIX A: ...", section titles)
    if (/^[A-Z]\s+/i.test(text) && !numbering) {
      return { ...el, level: 1 as const };
    }

    return el;
  });
}

function getElementText(el: DocumentElement): string {
  if (el.type === "heading") {
    return el.text;
  }
  if (el.type === "paragraph") {
    return el.children.map((c) => c.text).join("");
  }
  return "";
}

function extractNumbering(text: string): string | null {
  const match = text.match(SECTION_NUMBER_RE);
  return match ? match[1] : null;
}

function extractInlineElements(
  node: Cheerio<AnyNode>,
  $: CheerioAPI
): InlineElement[] {
  const inlines: InlineElement[] = [];

  node.contents().each((_, child) => {
    if (child.type === "text") {
      const text = (child as DomText).data;
      if (text && text.trim().length > 0) {
        inlines.push({ type: "text", text });
      }
    } else if (child.type === "tag") {
      const tag = child as DomElement;
      const tagName = tag.tagName.toLowerCase();
      const childNode = $(child);
      // Handle self-closing tags before the empty-text guard
      if (tagName === "img") {
        const src = childNode.attr("src") || "";
        inlines.push({ type: "text", text: `[image:${src}]` });
        return;
      }
      if (tagName === "br") {
        inlines.push({ type: "text", text: "\n" });
        return;
      }

      const text = childNode.text();

      if (text.trim().length === 0) return;

      if (tagName === "strong" || tagName === "b") {
        inlines.push({ type: "text", text, bold: true });
      } else if (tagName === "em" || tagName === "i") {
        inlines.push({ type: "text", text, italic: true });
      } else if (tagName === "u") {
        inlines.push({ type: "text", text, underline: true });
      } else {
        const nested = extractInlineElements(childNode, $);
        if (nested.length > 0) {
          for (const n of nested) {
            if (tagName === "strong" || tagName === "b") n.bold = true;
            if (tagName === "em" || tagName === "i") n.italic = true;
            if (tagName === "u") n.underline = true;
          }
          inlines.push(...nested);
        } else {
          inlines.push({ type: "text", text });
        }
      }
    }
  });

  return inlines;
}

function parseList(
  node: Cheerio<AnyNode>,
  $: CheerioAPI,
  ordered: boolean
): ListElement {
  const items: ListItemElement[] = [];

  node.children("li").each((_, li) => {
    const liNode = $(li);
    const children: (InlineElement | ListElement)[] = [];

    liNode.contents().each((_, child) => {
      if (child.type === "text") {
        const text = (child as DomText).data;
        if (text && text.trim().length > 0) {
          children.push({ type: "text", text });
        }
      } else if (child.type === "tag") {
        const tag = child as DomElement;
        const tagName = tag.tagName.toLowerCase();
        if (tagName === "ul" || tagName === "ol") {
          children.push(parseList($(child), $, tagName === "ol"));
        } else {
          const inlines = extractInlineElements($(child), $);
          children.push(...inlines);
        }
      }
    });

    items.push({ type: "list-item", children });
  });

  return { type: "list", ordered, items };
}

function parseTable(
  node: Cheerio<AnyNode>,
  $: CheerioAPI
): TableElement {
  const headers: TableRow[] = [];
  const rows: TableRow[] = [];

  node.find("thead tr").each((_, tr) => {
    headers.push(parseTableRow($(tr), $));
  });

  const tbodyRows = node.find("tbody tr");
  const directRows = tbodyRows.length > 0 ? tbodyRows : node.find("tr");

  directRows.each((i, tr) => {
    if (headers.length === 0 && i === 0) {
      headers.push(parseTableRow($(tr), $));
    } else {
      rows.push(parseTableRow($(tr), $));
    }
  });

  return { type: "table", headers, rows };
}

function parseTableRow(
  row: Cheerio<AnyNode>,
  $: CheerioAPI
): TableRow {
  const cells: {
    content: InlineElement[];
    colspan?: number;
    rowspan?: number;
  }[] = [];

  row.find("td, th").each((_, cell) => {
    const cellNode = $(cell);
    const colspan = parseInt(cellNode.attr("colspan") || "1");
    const rowspan = parseInt(cellNode.attr("rowspan") || "1");

    cells.push({
      content: extractInlineElements(cellNode, $),
      colspan: colspan > 1 ? colspan : undefined,
      rowspan: rowspan > 1 ? rowspan : undefined,
    });
  });

  return { cells };
}
