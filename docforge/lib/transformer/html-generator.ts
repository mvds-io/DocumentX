import type {
  DocumentElement,
  InlineElement,
  ListElement,
  ListItemElement,
  TableElement,
} from "@/lib/parser/types";
import type { TemplateConfig } from "@/lib/templates/schema";

export function elementsToHtml(
  elements: DocumentElement[],
  template: TemplateConfig,
  manualBreaks?: Set<number>,
  revisionHeadings?: Set<number>
): string {
  // Collect heading IDs so we can generate hidden anchor links.
  // Chromium only creates PDF named destinations when <a href="#id"> links
  // exist in the same document — without them, no destinations are created.
  const headingIds: string[] = [];
  for (const el of elements) {
    if (el.type === "heading" && el.numbering) {
      headingIds.push(`toc-${el.numbering}`);
    }
  }

  // Compute which element indices are "revised" by expanding each marked heading
  // to cover all elements until the next heading of same or higher level.
  const revisedElements = computeRevisedElements(elements, revisionHeadings);

  // Build content HTML with revision-section wrappers around consecutive revised elements
  const contentParts: string[] = [];
  let inRevisionBlock = false;

  for (let i = 0; i < elements.length; i++) {
    const isRevised = revisedElements.has(i);

    if (isRevised && !inRevisionBlock) {
      contentParts.push('<div class="revision-section">');
      inRevisionBlock = true;
    } else if (!isRevised && inRevisionBlock) {
      contentParts.push('</div>');
      inRevisionBlock = false;
    }

    contentParts.push(elementToHtml(elements[i], template, i, manualBreaks?.has(i)));
  }

  if (inRevisionBlock) {
    contentParts.push('</div>');
  }

  const contentHtml = contentParts.join("\n");

  if (headingIds.length === 0) return contentHtml;

  // Hidden div with anchor links that trigger Chromium to emit PDF destinations
  const anchors = headingIds
    .map((id) => `<a href="#${escapeHtml(id)}">.</a>`)
    .join("");
  const anchorDiv = `<div style="position:absolute;left:-9999px;height:0;overflow:hidden;">${anchors}</div>`;

  return anchorDiv + "\n" + contentHtml;
}

/**
 * Given a set of heading element indices marked as revised, expand each to
 * cover all child elements until the next heading of same or higher level.
 */
function computeRevisedElements(
  elements: DocumentElement[],
  revisionHeadings?: Set<number>
): Set<number> {
  const result = new Set<number>();
  if (!revisionHeadings || revisionHeadings.size === 0) return result;

  for (const headingIdx of revisionHeadings) {
    const heading = elements[headingIdx];
    if (!heading || heading.type !== "heading") continue;

    const headingLevel = heading.level;
    result.add(headingIdx);

    // Expand forward until we hit a heading of same or higher level
    for (let j = headingIdx + 1; j < elements.length; j++) {
      const el = elements[j];
      if (el.type === "heading" && el.level <= headingLevel) break;
      result.add(j);
    }
  }

  return result;
}

function elementToHtml(
  element: DocumentElement,
  template: TemplateConfig,
  index: number,
  forcePageBreak?: boolean
): string {
  const breakStyle = forcePageBreak ? ' style="page-break-before: always;"' : "";
  const indexAttr = ` data-element-index="${index}"`;

  switch (element.type) {
    case "heading":
      return headingToHtml(
        element.level,
        element.text,
        element.numbering,
        element.children,
        template,
        indexAttr,
        breakStyle
      );
    case "paragraph":
      return `<p${indexAttr}${breakStyle}>${inlinesToHtml(element.children)}</p>`;
    case "list":
      return listToHtml(element, indexAttr, breakStyle);
    case "table":
      return tableToHtml(element, indexAttr, breakStyle);
    default:
      return "";
  }
}

/**
 * Render headings with hanging indent layout matching the reference:
 * Section number on the left, title text on the right, same line.
 */
function headingToHtml(
  level: number,
  text: string,
  numbering: string | undefined,
  children: InlineElement[],
  _template: TemplateConfig,
  indexAttr: string,
  breakStyle: string
): string {
  const tag = `h${level}`;
  const tocAttr = numbering ? ` data-toc-id="${escapeHtml(numbering)}"` : '';
  const idAttr = numbering ? ` id="toc-${escapeHtml(numbering)}"` : '';

  if (numbering && (level === 2 || level === 3)) {
    // Strip the numbering from the beginning of the text for separate rendering
    const titleText = text.replace(/^[A-Z0-9]+(?:\.\d+)*\s*[-–—]?\s*/i, "").trim();
    return `<${tag}${tocAttr}${idAttr}${indexAttr}${breakStyle}>
      <span class="section-number">${numbering}</span>
      <span class="section-title">${escapeHtml(titleText)}</span>
    </${tag}>`;
  }

  return `<${tag}${tocAttr}${idAttr}${indexAttr}${breakStyle}>${inlinesToHtml(children)}</${tag}>`;
}

function inlinesToHtml(inlines: InlineElement[]): string {
  return inlines
    .map((inline) => {
      // Handle line breaks
      if (inline.text === "\n") return "<br/>";

      // Handle image placeholders
      if (inline.text.startsWith("[image:")) {
        const src = inline.text.slice(7, -1);
        if (src.startsWith("data:")) {
          return `<img src="${src}" class="embedded-image" />`;
        }
        return `<img src="${escapeHtml(src)}" class="embedded-image" />`;
      }

      let html = escapeHtml(inline.text);
      if (inline.bold) html = `<strong>${html}</strong>`;
      if (inline.italic) html = `<em>${html}</em>`;
      if (inline.underline) html = `<u>${html}</u>`;
      return html;
    })
    .join("");
}

function listToHtml(list: ListElement, indexAttr: string = "", breakStyle: string = ""): string {
  const tag = list.ordered ? "ol" : "ul";
  const items = list.items.map((item) => listItemToHtml(item)).join("\n");
  return `<${tag}${indexAttr}${breakStyle}>\n${items}\n</${tag}>`;
}

function listItemToHtml(item: ListItemElement): string {
  const content = item.children
    .map((child) => {
      if (child.type === "list") {
        return listToHtml(child);
      }
      return inlinesToHtml([child as InlineElement]);
    })
    .join("");
  return `<li>${content}</li>`;
}

function tableToHtml(table: TableElement, indexAttr: string = "", breakStyle: string = ""): string {
  let html = `<table${indexAttr}${breakStyle}>\n`;

  if (table.headers.length > 0) {
    html += "<thead>\n";
    for (const row of table.headers) {
      html += "<tr>";
      for (const cell of row.cells) {
        const attrs: string[] = [];
        if (cell.colspan && cell.colspan > 1)
          attrs.push(`colspan="${cell.colspan}"`);
        if (cell.rowspan && cell.rowspan > 1)
          attrs.push(`rowspan="${cell.rowspan}"`);
        html += `<th${attrs.length ? " " + attrs.join(" ") : ""}>${inlinesToHtml(cell.content)}</th>`;
      }
      html += "</tr>\n";
    }
    html += "</thead>\n";
  }

  if (table.rows.length > 0) {
    html += "<tbody>\n";
    for (const row of table.rows) {
      html += "<tr>";
      for (const cell of row.cells) {
        const attrs: string[] = [];
        if (cell.colspan && cell.colspan > 1)
          attrs.push(`colspan="${cell.colspan}"`);
        if (cell.rowspan && cell.rowspan > 1)
          attrs.push(`rowspan="${cell.rowspan}"`);
        html += `<td${attrs.length ? " " + attrs.join(" ") : ""}>${inlinesToHtml(cell.content)}</td>`;
      }
      html += "</tr>\n";
    }
    html += "</tbody>\n";
  }

  html += "</table>";
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
