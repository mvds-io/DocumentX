import type { RenderSection } from "@/lib/transformer/types";
import type { TemplateConfig } from "@/lib/templates/schema";

export function buildFullHtmlPage(
  section: RenderSection,
  template: TemplateConfig
): string {
  const css = buildCss(section, template);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  ${section.htmlContent}
</body>
</html>`;
}

function buildCss(section: RenderSection, template: TemplateConfig): string {
  const t = template.typography;
  const bullets = template.bullets;
  const margins = template.page.margins;

  // Do NOT set @page margins — Puppeteer's page.pdf() margin option
  // controls both the content area and header/footer placement.
  // Using @page margin causes conflicts with Puppeteer's rendering.
  const baseCss = `

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: ${t.body.font}, sans-serif;
      font-size: ${t.body.size}pt;
      line-height: ${t.body.lineHeight || 14}pt;
      color: ${t.body.color || "#000000"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      orphans: 3;
      widows: 3;
    }

    /* Heading styles with hanging indent for section numbers */
    h1 {
      font-family: ${t.h1.font}, sans-serif;
      font-size: ${t.h1.size}pt;
      font-weight: ${t.h1.bold ? "bold" : "normal"};
      ${t.h1.uppercase ? "text-transform: uppercase;" : ""}
      ${t.h1.pageBreakBefore ? "page-break-before: always;" : ""}
      break-after: avoid;
      page-break-after: avoid;
      margin-top: 0;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
    }

    h1:first-child {
      page-break-before: avoid;
    }

    h2 {
      font-family: ${t.h2.font}, sans-serif;
      font-size: ${t.h2.size}pt;
      font-weight: ${t.h2.bold ? "bold" : "normal"};
      ${t.h2.uppercase ? "text-transform: uppercase;" : ""}
      break-after: avoid;
      page-break-after: avoid;
      margin-top: ${t.h2.spaceBefore || 20}pt;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
      display: flex;
      gap: 24pt;
    }

    h3 {
      font-family: ${t.h3.font}, sans-serif;
      font-size: ${t.h3.size}pt;
      font-weight: ${t.h3.bold ? "bold" : "normal"};
      ${t.h3.uppercase ? "text-transform: uppercase;" : ""}
      break-after: avoid;
      page-break-after: avoid;
      margin-top: ${t.h3.spaceBefore || 16}pt;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
      padding-left: 72pt;
      display: flex;
      gap: 16pt;
    }

    .section-number {
      flex-shrink: 0;
      min-width: 40pt;
    }

    h3 .section-number {
      min-width: 48pt;
    }

    .section-title {
      flex: 1;
    }

    p {
      margin-bottom: ${t.body.paragraphGap || 16}pt;
      padding-left: 72pt;
    }

    ul {
      list-style: none;
      padding-left: ${72 + (bullets.indentFromMargin - 54)}pt;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
    }

    ul li {
      padding-left: ${bullets.textIndentFromMargin - bullets.indentFromMargin}pt;
      position: relative;
      line-height: 13.4pt;
      margin-bottom: 2pt;
    }

    ul li::before {
      content: "${bullets.character}";
      position: absolute;
      left: 0;
    }

    ol {
      padding-left: 72pt;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
      counter-reset: item;
      list-style: none;
    }

    ol li {
      counter-increment: item;
      padding-left: 20pt;
      position: relative;
      line-height: 13.4pt;
      margin-bottom: 4pt;
    }

    ol li::before {
      content: counter(item) ".";
      position: absolute;
      left: 0;
    }

    table {
      border-collapse: collapse;
      width: calc(100% - 1pt);
      table-layout: fixed;
      margin-bottom: ${t.body.paragraphGap || 16}pt;
      font-size: ${t.body.size}pt;
      margin-left: 0;
    }

    th, td {
      border: 1px solid #000;
      padding: 4pt 6pt;
      text-align: left;
      vertical-align: top;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    th {
      font-weight: bold;
      background-color: #f0f0f0;
    }

    strong { font-weight: bold; }
    em { font-style: italic; }
    u { text-decoration: underline; }

    .embedded-image {
      max-width: 200pt;
      height: auto;
      display: block;
      margin: 8pt 0;
      margin-left: 72pt;
    }

    img {
      max-width: 100%;
    }
  `;

  // Section-type specific CSS
  if (section.type === "cover") {
    return (
      baseCss +
      `
      body {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        height: 100vh;
        padding: 80pt 60pt;
      }
      .cover-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 120pt;
        padding-top: 100pt;
      }
      .cover-title { text-align: center; }
      p { padding-left: 0; }
    `
    );
  }

  if (section.type === "blank") {
    return (
      baseCss +
      `
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      }
      .blank-page { text-align: center; }
      p { padding-left: 0; }
    `
    );
  }

  if (section.type === "chapter-title") {
    return (
      baseCss +
      `
      body {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        height: 100vh;
        padding-top: 44vh;
      }
      .chapter-title-page {
        text-align: center;
        width: 100%;
      }
      .chapter-title-content {
        font-family: ${t.h1.font}, sans-serif;
        font-size: ${t.h1.size}pt;
        font-weight: bold;
        text-transform: uppercase;
        line-height: 1.4;
      }
      p { padding-left: 0; }
    `
    );
  }

  if (section.type === "toc") {
    return (
      baseCss +
      `
      .toc { padding: 0; }
      a.toc-entry {
        text-decoration: none;
        color: inherit;
      }
      .toc-entry {
        display: flex;
        align-items: baseline;
        margin-bottom: 4pt;
        font-size: ${t.body.size}pt;
        line-height: 16pt;
      }
      .toc-h1 { font-weight: bold; }
      .toc-h2 { padding-left: 0; }
      .toc-h3 { padding-left: 24pt; }
      .toc-text {
        white-space: nowrap;
        text-transform: uppercase;
      }
      .toc-dots {
        flex: 1;
        border-bottom: 1pt dotted #000;
        margin: 0 4pt;
        min-width: 20pt;
      }
      .toc-page { white-space: nowrap; }
      p { padding-left: 0; }
    `
    );
  }

  // Default: chapter-content
  return baseCss + `
    .revision-section {
      border-left: 2pt solid #000000;
    }
  `;
}
