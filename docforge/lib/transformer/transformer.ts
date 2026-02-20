import type { StructuredDocument, Chapter } from "@/lib/structure/types";
import type { TemplateConfig } from "@/lib/templates/schema";
import type {
  TransformedDocument,
  RenderSection,
  ConversionMetadata,
  ManualPageBreak,
} from "./types";
import { elementsToHtml } from "./html-generator";

export function transform(
  doc: StructuredDocument,
  template: TemplateConfig,
  metadata: ConversionMetadata,
  manualBreaks?: ManualPageBreak[]
): TransformedDocument {
  const sections: RenderSection[] = [];
  const allChapters = [...doc.chapters, ...doc.appendices];
  const isFullDocument = doc.chapters.length > 1 || (doc.chapters.length > 0 && doc.appendices.length > 0);

  // Only generate cover page and blank page for full documents
  if (isFullDocument && template.documentStructure.coverPage.enabled) {
    sections.push({
      id: "cover",
      type: "cover",
      prefix: "",
      title: "",
      htmlContent: generateCoverPageHtml(template),
      showHeader: false,
      showFooter: false,
      pageNumberFormat: "none",
    });

    if (template.documentStructure.blankPages.insertAfterCover) {
      sections.push({
        id: "blank-after-cover",
        type: "blank",
        prefix: "",
        title: "",
        htmlContent: generateBlankPageHtml(template),
        showHeader: false,
        showFooter: false,
        pageNumberFormat: "none",
      });
    }
  }

  // Table of Contents
  if (template.documentStructure.tableOfContents.enabled) {
    sections.push({
      id: "toc",
      type: "toc",
      prefix: "",
      title: template.documentStructure.tableOfContents.headerCenter,
      htmlContent: generateTocHtml(doc, template),
      showHeader: true,
      showFooter: true,
      pageNumberFormat: "roman",
    });
  }

  // Chapters and appendices
  for (const chapter of allChapters) {
    addChapterSections(sections, chapter, template, manualBreaks);
  }

  return { sections, template, metadata, structuredDoc: doc };
}

function addChapterSections(
  sections: RenderSection[],
  chapter: Chapter,
  template: TemplateConfig,
  manualBreaks?: ManualPageBreak[]
) {
  // Chapter title page
  if (template.documentStructure.chapterTitlePages.enabled) {
    sections.push({
      id: `title-${chapter.prefix}`,
      type: "chapter-title",
      prefix: chapter.prefix,
      title: "",
      htmlContent: generateChapterTitlePageHtml(chapter, template),
      showHeader: true,
      showFooter: true,
      pageNumberFormat: "chapter-relative",
    });
  }

  // Chapter content
  const sectionId = `content-${chapter.prefix}`;
  const sectionBreaks = manualBreaks
    ?.filter((b) => b.sectionId === sectionId)
    .map((b) => b.beforeElementIndex);

  sections.push({
    id: sectionId,
    type: "chapter-content",
    prefix: chapter.prefix,
    title: chapter.title,
    htmlContent: elementsToHtml(
      chapter.elements,
      template,
      sectionBreaks?.length ? new Set(sectionBreaks) : undefined
    ),
    showHeader: true,
    showFooter: true,
    pageNumberFormat: "chapter-relative",
  });
}

function generateCoverPageHtml(template: TemplateConfig): string {
  const cover = template.documentStructure.coverPage;
  return `
    <div class="cover-page">
      <div class="cover-logo">
        <div style="width:200px;height:100px;background:#f0f0f0;display:flex;align-items:center;justify-content:center;border:1px solid #ccc;margin:0 auto;">
          <span style="color:#666;font-size:14px;">Logo</span>
        </div>
      </div>
      <div class="cover-title">
        <h1 style="font-family:${cover.titleFont.family},sans-serif;font-size:${cover.titleFont.size}pt;font-weight:${cover.titleFont.bold ? "bold" : "normal"};text-align:center;margin:0;">
          ${cover.title}
        </h1>
        <h2 style="font-family:${cover.titleFont.family},sans-serif;font-size:${cover.titleFont.size}pt;font-weight:${cover.titleFont.bold ? "bold" : "normal"};text-align:center;margin:10pt 0 0 0;">
          ${cover.subtitle}
        </h2>
      </div>
    </div>
  `;
}

function generateBlankPageHtml(template: TemplateConfig): string {
  return `
    <div class="blank-page">
      <p>${template.documentStructure.blankPages.text}</p>
    </div>
  `;
}

function generateChapterTitlePageHtml(
  chapter: Chapter,
  template: TemplateConfig
): string {
  const config = template.documentStructure.chapterTitlePages;
  let titleText: string;

  if (chapter.isAppendix) {
    titleText = config.appendixFormat
      .replace("{letter}", chapter.prefix)
      .replace("{name}", chapter.title.toUpperCase());
  } else {
    titleText = config.format
      .replace("{number}", chapter.prefix)
      .replace("{name}", chapter.title.toUpperCase());
  }

  const lines = titleText
    .split("\n")
    .map((line) => `<div>${line}</div>`)
    .join("\n");

  return `
    <div class="chapter-title-page">
      <div class="chapter-title-content">
        ${lines}
      </div>
    </div>
  `;
}

function generateTocHtml(
  doc: StructuredDocument,
  _template: TemplateConfig,
  pageNumberMap?: Map<string, number>
): string {
  return buildTocHtml(doc, pageNumberMap);
}

/**
 * Generate TOC HTML with optional page number map.
 * Exported so the renderer can regenerate TOC after two-pass rendering.
 */
export function buildTocHtml(
  doc: StructuredDocument,
  pageNumberMap?: Map<string, number>
): string {
  let html = '<div class="toc">\n';
  const allChapters = [...doc.chapters, ...doc.appendices];

  for (const chapter of allChapters) {
    const displayPrefix = chapter.isAppendix ? chapter.prefix : chapter.prefix;
    const chapterPage = pageNumberMap?.get(chapter.prefix) ?? 2;

    // TOC entries use <a> tags with marker URLs so Chromium creates link
    // annotations with correct positions. The URLs are rewritten to GoTo
    // destinations during PDF post-processing (mergeAndAddPageNumbers).
    html += `<a class="toc-entry toc-h1" href="https://docforge.link/${chapter.prefix}@${chapter.prefix}">
      <span class="toc-text">${displayPrefix}&nbsp;&nbsp;&nbsp;${chapter.title.toUpperCase()}</span>
      <span class="toc-dots"></span>
      <span class="toc-page">${chapter.prefix}-${chapterPage}</span>
    </a>\n`;

    // H2 entries
    for (const section of chapter.sections) {
      const sectionNum = section.heading.numbering || "";
      const sectionTitle = cleanHeadingText(section.heading.text);
      const pageNum = sectionNum ? (pageNumberMap?.get(sectionNum) ?? "?") : "?";

      html += `<a class="toc-entry toc-h2" href="https://docforge.link/${sectionNum}@${chapter.prefix}">
        <span class="toc-text">${sectionNum}&nbsp;&nbsp;&nbsp;${sectionTitle.toUpperCase()}</span>
        <span class="toc-dots"></span>
        <span class="toc-page">${chapter.prefix}-${pageNum}</span>
      </a>\n`;

      // H3 entries
      for (const sub of section.subsections) {
        const subNum = sub.heading.numbering || "";
        const subTitle = cleanHeadingText(sub.heading.text);
        const subPageNum = subNum ? (pageNumberMap?.get(subNum) ?? "?") : "?";

        html += `<a class="toc-entry toc-h3" href="https://docforge.link/${subNum}@${chapter.prefix}">
          <span class="toc-text">${subNum}&nbsp;&nbsp;&nbsp;${subTitle.toUpperCase()}</span>
          <span class="toc-dots"></span>
          <span class="toc-page">${chapter.prefix}-${subPageNum}</span>
        </a>\n`;
      }
    }
  }

  html += "</div>";
  return html;
}

/** Remove section numbering prefix from heading text */
function cleanHeadingText(text: string): string {
  return text.replace(/^[A-Z0-9]+(?:\.\d+)*\s*[-–—]?\s*/i, "").trim();
}
