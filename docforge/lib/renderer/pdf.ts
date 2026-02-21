import puppeteer from "puppeteer";
import {
  PDFDocument,
  StandardFonts,
  PDFName,
  PDFArray,
  PDFDict,
  PDFString,
  PDFHexString,
  PDFRef,
} from "pdf-lib";
import type {
  TransformedDocument,
  RenderSection,
} from "@/lib/transformer/types";
import type { StructuredDocument } from "@/lib/structure/types";
import { buildFullHtmlPage } from "./html-builder";
import { buildTocHtml } from "@/lib/transformer/transformer";

/** Marker URL prefix used in TOC <a> tags. Parsed during PDF post-processing. */
const TOC_LINK_PREFIX = "https://docforge.link/";

export async function renderPdf(doc: TransformedDocument): Promise<{ buffer: Buffer; headingPages: Record<string, number> }> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
    ],
  });

  try {
    // Phase 1: Render chapter content sections to get heading page positions
    const contentSections = doc.sections.filter(
      (s) => s.type === "chapter-content"
    );
    const pageNumberMap: Map<string, number> = new Map();
    const renderedBuffers: Map<string, Buffer> = new Map();

    for (const section of contentSections) {
      const page = await browser.newPage();
      const fullHtml = buildFullHtmlPage(section, doc.template);
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      const pdfOptions = buildPdfOptions(section, doc);
      const pdfBuffer = await page.pdf(pdfOptions);
      const buffer = Buffer.from(pdfBuffer);
      renderedBuffers.set(section.id, buffer);

      // Extract heading page numbers from the actual PDF named destinations.
      // Chromium creates destinations for elements with id attributes,
      // which correctly accounts for CSS page breaks.
      const pdfDoc = await PDFDocument.load(buffer);
      const pageCount = pdfDoc.getPageCount();

      const hasTitlePage = doc.sections.some(
        (s) => s.type === "chapter-title" && s.prefix === section.prefix
      );
      const pageOffset = hasTitlePage ? 1 : 0;

      const destinations = extractNamedDestinations(pdfDoc);

      if (destinations.size > 0) {
        // Use accurate PDF destinations
        for (const [name, pageIndex] of destinations) {
          if (name.startsWith("toc-")) {
            const headingId = name.slice(4); // strip "toc-" prefix
            const pageInSection = pageIndex + 1; // 0-based to 1-based
            pageNumberMap.set(headingId, pageInSection + pageOffset);
          }
        }
      } else {
        // Fallback: DOM-based calculation (less accurate with manual page breaks)
        const headingData = await page.evaluate(() => {
          const headings = document.querySelectorAll("[data-toc-id]");
          const bodyHeight = document.body.scrollHeight;
          return {
            headings: Array.from(headings).map((h) => ({
              id: h.getAttribute("data-toc-id") || "",
              offsetTop: (h as HTMLElement).offsetTop,
            })),
            bodyHeight,
          };
        });

        if (headingData.bodyHeight > 0 && pageCount > 0) {
          for (const h of headingData.headings) {
            const pageInSection = Math.min(
              Math.floor(
                (h.offsetTop / headingData.bodyHeight) * pageCount
              ) + 1,
              pageCount
            );
            pageNumberMap.set(h.id, pageInSection + pageOffset);
          }
        }
      }

      await page.close();
    }

    // Phase 2: Regenerate TOC with actual page numbers
    const tocSectionIndex = doc.sections.findIndex((s) => s.type === "toc");
    if (tocSectionIndex >= 0) {
      doc.sections[tocSectionIndex].htmlContent = buildTocHtml(
        doc.structuredDoc,
        pageNumberMap
      );
    }

    // Phase 3: Render all sections
    const sectionBuffers: { buffer: Buffer; section: RenderSection }[] = [];

    for (const section of doc.sections) {
      if (renderedBuffers.has(section.id)) {
        sectionBuffers.push({
          buffer: renderedBuffers.get(section.id)!,
          section,
        });
      } else {
        const page = await browser.newPage();
        const fullHtml = buildFullHtmlPage(section, doc.template);
        await page.setContent(fullHtml, { waitUntil: "networkidle0" });

        const pdfOptions = buildPdfOptions(section, doc);
        const pdfBuffer = await page.pdf(pdfOptions);
        const buffer = Buffer.from(pdfBuffer);

        sectionBuffers.push({ buffer, section });
        await page.close();
      }
    }

    // Phase 4: Merge all PDFs, add page numbers and rewrite TOC links
    const { buffer, headingPages } = await mergeAndAddPageNumbers(sectionBuffers, pageNumberMap, doc.structuredDoc);
    return { buffer, headingPages };
  } finally {
    await browser.close();
  }
}

/**
 * Extract named destinations from a PDF.
 * Chromium creates these for HTML elements with id attributes.
 * Returns a map of destination name → 0-based page index.
 */
function extractNamedDestinations(pdfDoc: PDFDocument): Map<string, number> {
  const result = new Map<string, number>();

  // Build page ref → page index mapping
  const pages = pdfDoc.getPages();
  const pageRefToIndex = new Map<string, number>();
  for (let i = 0; i < pages.length; i++) {
    pageRefToIndex.set(pages[i].ref.toString(), i);
  }

  try {
    const { context } = pdfDoc;
    const catalogRef = context.trailerInfo.Root;
    const catalog = context.lookup(catalogRef, PDFDict);

    // Modern PDF format: /Catalog → /Names → /Dests (name tree)
    const names = catalog.lookup(PDFName.of("Names"));
    if (names instanceof PDFDict) {
      const destsTree = names.lookup(PDFName.of("Dests"));
      if (destsTree instanceof PDFDict) {
        collectFromNameTree(destsTree, result, pageRefToIndex);
      }
    }

    // Older PDF format: /Catalog → /Dests (direct dictionary)
    // Chromium uses this format when <a href="#id"> links exist in the HTML.
    if (result.size === 0) {
      const dests = catalog.lookup(PDFName.of("Dests"));
      if (dests instanceof PDFDict) {
        for (const [key] of dests.entries()) {
          const name = key.toString().slice(1); // PDFName toString is "/name", strip "/"
          const value = dests.lookup(key); // resolve refs if needed
          resolveDestination(name, value, result, pageRefToIndex);
        }
      }
    }
  } catch {
    // If extraction fails, return empty map (triggers DOM fallback)
  }

  return result;
}

function collectFromNameTree(
  node: PDFDict,
  result: Map<string, number>,
  pageRefToIndex: Map<string, number>
): void {
  // Leaf node: has /Names array [key1, val1, key2, val2, ...]
  const namesArray = node.lookup(PDFName.of("Names"));
  if (namesArray instanceof PDFArray) {
    for (let i = 0; i + 1 < namesArray.size(); i += 2) {
      const key = namesArray.lookup(i);
      const val = namesArray.lookup(i + 1);

      let name: string | undefined;
      if (key instanceof PDFString) name = key.decodeText();
      else if (key instanceof PDFHexString) name = key.decodeText();

      if (name) {
        resolveDestination(name, val, result, pageRefToIndex);
      }
    }
  }

  // Interior node: has /Kids array of child nodes
  const kids = node.lookup(PDFName.of("Kids"));
  if (kids instanceof PDFArray) {
    for (let i = 0; i < kids.size(); i++) {
      const kid = kids.lookup(i);
      if (kid instanceof PDFDict) {
        collectFromNameTree(kid, result, pageRefToIndex);
      }
    }
  }
}

function resolveDestination(
  name: string,
  value: PDFDict | PDFArray | unknown,
  result: Map<string, number>,
  pageRefToIndex: Map<string, number>
): void {
  // Destination can be an array [pageRef, /type, ...] or a dict with /D key
  let destArray: PDFArray | undefined;

  if (value instanceof PDFArray) {
    destArray = value;
  } else if (value instanceof PDFDict) {
    const d = value.lookup(PDFName.of("D"));
    if (d instanceof PDFArray) destArray = d;
  }

  if (destArray && destArray.size() >= 2) {
    // First element is the page reference (get raw, not resolved)
    const pageRef = destArray.get(0);
    if (pageRef instanceof PDFRef) {
      const pageIndex = pageRefToIndex.get(pageRef.toString());
      if (pageIndex !== undefined) {
        result.set(name, pageIndex);
      }
    }
  }
}

function buildPdfOptions(
  section: RenderSection,
  doc: TransformedDocument
): Parameters<import("puppeteer").Page["pdf"]>[0] {
  const margins = doc.template.page.margins;
  const base = {
    format: "A4" as const,
    printBackground: true,
  };

  if (!section.showHeader && !section.showFooter) {
    return {
      ...base,
      displayHeaderFooter: false,
      margin: {
        top: `${margins.top}mm`,
        bottom: `${margins.bottom}mm`,
        left: `${margins.left}mm`,
        right: `${margins.right}mm`,
      },
    };
  }

  return {
    ...base,
    displayHeaderFooter: true,
    headerTemplate: buildHeaderHtml(section, doc),
    footerTemplate: buildFooterHtml(section, doc),
    margin: {
      top: "24mm",
      bottom: "20mm",
      left: `${margins.left}mm`,
      right: `${margins.right}mm`,
    },
  };
}

function buildHeaderHtml(
  section: RenderSection,
  doc: TransformedDocument
): string {
  const font = doc.template.header.font;
  const sep = doc.template.header.separatorLine;
  const margins = doc.template.page.margins;

  let centerText = "";
  if (section.type === "toc") {
    centerText = doc.template.documentStructure.tableOfContents.headerCenter;
  } else if (section.type === "chapter-content") {
    centerText = (section.title || "").toUpperCase();
  }

  // Use padding-top to position header within the margin area.
  // NOTE: Setting explicit height (e.g. height:24mm) on the header template
  // breaks Puppeteer's margin rendering. Use padding instead.
  return `<div style="
    width: 100%;
    font-family: ${font.family}, sans-serif;
    font-size: ${font.size}pt;
    padding: 10mm ${margins.left}mm 0 ${margins.left}mm;
    box-sizing: border-box;
    color: #000;
  ">
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 2mm;
      border-bottom: ${sep.width}pt solid ${sep.color};
      white-space: nowrap;
      overflow: hidden;
    ">
      <span style="text-align:left;min-width:60pt;">${doc.metadata.companyName}</span>
      <span style="text-align:center;flex:1;overflow:hidden;text-overflow:ellipsis;text-transform:uppercase;padding:0 8pt;">${centerText}</span>
      <span style="text-align:right;min-width:30pt;">${doc.metadata.manualAbbreviation}</span>
    </div>
  </div>`;
}

function buildFooterHtml(
  section: RenderSection,
  doc: TransformedDocument
): string {
  const font = doc.template.footer.font;
  const sep = doc.template.footer.separatorLine;
  const margins = doc.template.page.margins;

  // Simple footer template without explicit height.
  // Page numbers are added by pdf-lib post-processing for correct numbering.
  return `<div style="
    width: 100%;
    font-family: ${font.family}, sans-serif;
    font-size: ${font.size}pt;
    padding: 0 ${margins.left}mm;
    box-sizing: border-box;
    color: #000;
  ">
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-top: 2mm;
      border-top: ${sep.width}pt solid ${sep.color};
    ">
      <span style="flex:1;text-align:left;">${doc.metadata.date}</span>
      <span style="flex:1;text-align:center;">REVISION ${doc.metadata.revisionNumber}</span>
      <span style="flex:1;text-align:right;"></span>
    </div>
  </div>`;
}

/**
 * Merge all section PDFs, add correct page numbers, and rewrite TOC links.
 *
 * TOC link annotations are created by Chromium (from <a href> tags in the TOC HTML).
 * Chromium places the annotation rectangles accurately matching the visual text.
 * We rewrite the URI actions to GoTo destinations pointing to the correct pages.
 */
async function mergeAndAddPageNumbers(
  sectionBuffers: { buffer: Buffer; section: RenderSection }[],
  pageNumberMap: Map<string, number>,
  structuredDoc: StructuredDocument
): Promise<{ buffer: Buffer; headingPages: Record<string, number> }> {
  const mergedPdf = await PDFDocument.create();
  const pageInfo: { section: RenderSection; pageInSection: number }[] = [];
  const sectionStartPages: Map<string, number> = new Map();
  let absolutePageIndex = 0;

  for (const { buffer, section } of sectionBuffers) {
    sectionStartPages.set(section.id, absolutePageIndex);
    const sourcePdf = await PDFDocument.load(buffer);
    const pages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );
    for (let i = 0; i < pages.length; i++) {
      mergedPdf.addPage(pages[i]);
      pageInfo.push({ section, pageInSection: i + 1 });
      absolutePageIndex++;
    }
  }

  // Add page numbers to all pages
  const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 9.6;
  let tocPageCounter = 0;
  const chapterPageCounters: Map<string, number> = new Map();

  for (let i = 0; i < mergedPdf.getPageCount(); i++) {
    const page = mergedPdf.getPage(i);
    const { section } = pageInfo[i];
    const { width } = page.getSize();

    let pageNumText = "";

    if (section.pageNumberFormat === "roman") {
      tocPageCounter++;
      pageNumText = `PAGE ${toRoman(tocPageCounter)}`;
    } else if (section.pageNumberFormat === "chapter-relative") {
      const current = (chapterPageCounters.get(section.prefix) || 0) + 1;
      chapterPageCounters.set(section.prefix, current);
      pageNumText = `PAGE ${section.prefix}-${current}`;
    }

    if (pageNumText) {
      const textWidth = font.widthOfTextAtSize(pageNumText, fontSize);
      const rightMarginPt = 28 * 2.835;
      const yPos = 12;

      page.drawText(pageNumText, {
        x: width - rightMarginPt - textWidth,
        y: yPos,
        size: fontSize,
        font,
      });
    }
  }

  // Rewrite TOC link annotations: replace Chromium's URI actions with GoTo destinations
  rewriteTocLinks(mergedPdf, pageInfo, pageNumberMap, sectionStartPages);

  // Build absolute page map for each heading (for scroll-to-page in preview)
  const headingPages: Record<string, number> = {};
  for (const [headingId, pageInChapter] of pageNumberMap) {
    // Find the chapter prefix from the heading ID (e.g. "1.1" → prefix "1")
    const chapterPrefix = headingId.split(".")[0];
    const absPage = resolveDestinationPage(headingId, chapterPrefix, pageNumberMap, sectionStartPages);
    if (absPage !== null) {
      // Store as 1-based page number for PDF viewer compatibility
      headingPages[headingId] = absPage + 1;
    }
  }

  // Add PDF bookmarks (outlines) for the Acrobat navigation panel
  const bookmarks = buildBookmarkTree(structuredDoc, pageNumberMap, sectionStartPages);
  addOutlinesToPdf(mergedPdf, bookmarks);

  return { buffer: Buffer.from(await mergedPdf.save()), headingPages };
}

/**
 * Find all URI link annotations on TOC pages and replace them with GoTo
 * destinations pointing to the correct content pages.
 *
 * Chromium creates URI annotations for the <a href="https://docforge.link/...">
 * links in the TOC HTML. The URL encodes the heading ID and chapter prefix as:
 *   https://docforge.link/{headingId}@{chapterPrefix}
 */
function rewriteTocLinks(
  mergedPdf: PDFDocument,
  pageInfo: { section: RenderSection; pageInSection: number }[],
  pageNumberMap: Map<string, number>,
  sectionStartPages: Map<string, number>
): void {
  const totalPages = mergedPdf.getPageCount();

  for (let i = 0; i < totalPages; i++) {
    const { section } = pageInfo[i];
    if (section.type !== "toc") continue;

    const page = mergedPdf.getPage(i);
    const annotsRaw = page.node.get(PDFName.of("Annots"));
    if (!annotsRaw) continue;

    // Resolve the Annots array (may be an indirect reference)
    const annots =
      annotsRaw instanceof PDFRef
        ? mergedPdf.context.lookup(annotsRaw)
        : annotsRaw;
    if (!(annots instanceof PDFArray)) continue;

    for (let j = 0; j < annots.size(); j++) {
      const annotObj = annots.lookup(j);
      if (!(annotObj instanceof PDFDict)) continue;

      // Check for URI action
      const action = annotObj.lookup(PDFName.of("A"));
      if (!(action instanceof PDFDict)) continue;

      const actionType = action.get(PDFName.of("S"));
      if (!actionType || actionType.toString() !== "/URI") continue;

      const uriObj = action.get(PDFName.of("URI"));
      let uri = "";
      if (uriObj instanceof PDFString) uri = uriObj.decodeText();
      else if (uriObj instanceof PDFHexString) uri = uriObj.decodeText();
      else continue;

      if (!uri.startsWith(TOC_LINK_PREFIX)) continue;

      // Parse heading ID and chapter prefix from URL
      // Format: https://docforge.link/{headingId}@{chapterPrefix}
      const path = uri.slice(TOC_LINK_PREFIX.length);
      const atIdx = path.lastIndexOf("@");
      if (atIdx < 0) continue;

      const headingId = decodeURIComponent(path.slice(0, atIdx));
      const chapterPrefix = decodeURIComponent(path.slice(atIdx + 1));

      // Resolve destination page
      const destAbsPage = resolveDestinationPage(
        headingId,
        chapterPrefix,
        pageNumberMap,
        sectionStartPages
      );
      if (destAbsPage === null || destAbsPage >= totalPages) continue;

      // Replace URI action with GoTo destination
      const destPage = mergedPdf.getPage(destAbsPage);
      const destArray = mergedPdf.context.obj([
        destPage.ref,
        PDFName.of("Fit"),
      ]);

      // Remove the URI action, set a direct destination
      annotObj.delete(PDFName.of("A"));
      annotObj.set(PDFName.of("Dest"), destArray);

      // Ensure no visible border
      annotObj.set(PDFName.of("Border"), mergedPdf.context.obj([0, 0, 0]));
    }
  }
}

/**
 * Resolve a TOC entry's link ID to an absolute page index in the merged PDF.
 */
function resolveDestinationPage(
  linkId: string,
  chapterPrefix: string,
  pageNumberMap: Map<string, number>,
  sectionStartPages: Map<string, number>
): number | null {
  // Find the chapter's starting page in the merged PDF
  const titleStart = sectionStartPages.get(`title-${chapterPrefix}`);
  const contentStart = sectionStartPages.get(`content-${chapterPrefix}`);
  const chapterStart = titleStart ?? contentStart;

  if (chapterStart === undefined) return null;

  // Use pageNumberMap which gives 1-based page from chapter start
  const pageInChapter = pageNumberMap.get(linkId);
  if (pageInChapter !== undefined) {
    return chapterStart + pageInChapter - 1;
  }

  // Fallback: link to the chapter's first page
  return chapterStart;
}

// ─── PDF Bookmarks / Outlines ───────────────────────────────────────────────

interface BookmarkItem {
  title: string;
  /** Absolute 0-based page index in the merged PDF */
  absolutePage: number;
  children: BookmarkItem[];
}

/** Remove section numbering prefix from heading text */
function cleanHeadingText(text: string): string {
  return text.replace(/^[A-Z0-9]+(?:\.\d+)*\s*[-–—]?\s*/i, "").trim();
}

/**
 * Build a hierarchical bookmark tree from the structured document.
 * Each chapter becomes a top-level bookmark, with sections and subsections nested underneath.
 */
function buildBookmarkTree(
  structuredDoc: StructuredDocument,
  pageNumberMap: Map<string, number>,
  sectionStartPages: Map<string, number>,
): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  const allChapters = [...structuredDoc.chapters, ...structuredDoc.appendices];

  for (const chapter of allChapters) {
    const titleStart = sectionStartPages.get(`title-${chapter.prefix}`);
    const contentStart = sectionStartPages.get(`content-${chapter.prefix}`);
    const chapterPage = titleStart ?? contentStart;
    if (chapterPage === undefined) continue;

    const chapterLabel = chapter.isAppendix
      ? `Appendix ${chapter.prefix} - ${chapter.title}`
      : `Chapter ${chapter.prefix} - ${chapter.title}`;

    const chapterItem: BookmarkItem = {
      title: chapterLabel,
      absolutePage: chapterPage,
      children: [],
    };

    for (const section of chapter.sections) {
      const sectionNum = section.heading.numbering || "";
      const sectionTitle = cleanHeadingText(section.heading.text);
      const sectionAbsPage = resolveDestinationPage(
        sectionNum, chapter.prefix, pageNumberMap, sectionStartPages,
      );
      if (sectionAbsPage === null) continue;

      const sectionItem: BookmarkItem = {
        title: `${sectionNum} ${sectionTitle}`,
        absolutePage: sectionAbsPage,
        children: [],
      };

      for (const sub of section.subsections) {
        const subNum = sub.heading.numbering || "";
        const subTitle = cleanHeadingText(sub.heading.text);
        const subAbsPage = resolveDestinationPage(
          subNum, chapter.prefix, pageNumberMap, sectionStartPages,
        );
        if (subAbsPage === null) continue;

        sectionItem.children.push({
          title: `${subNum} ${subTitle}`,
          absolutePage: subAbsPage,
          children: [],
        });
      }

      chapterItem.children.push(sectionItem);
    }

    items.push(chapterItem);
  }

  return items;
}

/**
 * Add PDF outline (bookmark) dictionaries to the document catalog.
 * Creates the /Outlines tree structure per ISO 32000.
 */
function addOutlinesToPdf(
  pdfDoc: PDFDocument,
  bookmarks: BookmarkItem[],
): void {
  if (bookmarks.length === 0) return;

  const context = pdfDoc.context;

  // Create root outline dictionary
  const outlinesDict = context.obj({});
  outlinesDict.set(PDFName.of("Type"), PDFName.of("Outlines"));
  const outlinesRef = context.register(outlinesDict);

  // Recursively create outline items
  const totalCount = createOutlineItems(context, pdfDoc, outlinesRef, bookmarks, outlinesDict);
  outlinesDict.set(PDFName.of("Count"), context.obj(totalCount));

  // Register in the PDF catalog
  const catalogRef = context.trailerInfo.Root;
  const catalog = context.lookup(catalogRef, PDFDict);
  catalog.set(PDFName.of("Outlines"), outlinesRef);
  catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

/**
 * Recursively create outline item dictionaries for a list of sibling bookmarks.
 * Links them with /Prev and /Next, sets /First and /Last on the parent.
 * Returns the total number of outline items created (for parent /Count).
 */
function createOutlineItems(
  context: PDFDocument["context"],
  pdfDoc: PDFDocument,
  parentRef: PDFRef,
  items: BookmarkItem[],
  parentDict: PDFDict,
): number {
  if (items.length === 0) return 0;

  const itemRefs: PDFRef[] = [];
  const itemDicts: PDFDict[] = [];

  // First pass: create and register all dictionaries
  for (const _item of items) {
    const dict = context.obj({});
    const ref = context.register(dict);
    itemRefs.push(ref);
    itemDicts.push(dict);
  }

  let totalCount = items.length;

  // Second pass: populate each dictionary
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dict = itemDicts[i];

    // Title (use PDFHexString for Unicode safety)
    dict.set(PDFName.of("Title"), PDFHexString.fromText(item.title));

    // Destination: [pageRef /Fit]
    const destPage = pdfDoc.getPage(item.absolutePage);
    dict.set(PDFName.of("Dest"), context.obj([destPage.ref, PDFName.of("Fit")]));

    // Parent
    dict.set(PDFName.of("Parent"), parentRef);

    // Sibling links
    if (i > 0) {
      dict.set(PDFName.of("Prev"), itemRefs[i - 1]);
    }
    if (i < items.length - 1) {
      dict.set(PDFName.of("Next"), itemRefs[i + 1]);
    }

    // Children
    if (item.children.length > 0) {
      const childCount = createOutlineItems(context, pdfDoc, itemRefs[i], item.children, dict);
      dict.set(PDFName.of("Count"), context.obj(childCount));
      totalCount += childCount;
    }
  }

  // Set /First and /Last on parent
  parentDict.set(PDFName.of("First"), itemRefs[0]);
  parentDict.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);

  return totalCount;
}

function toRoman(num: number): string {
  const numerals: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];

  let result = "";
  for (const [value, symbol] of numerals) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }
  return result;
}
