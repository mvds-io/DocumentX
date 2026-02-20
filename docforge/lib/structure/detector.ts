import type {
  DocumentAST,
  DocumentElement,
  HeadingElement,
} from "@/lib/parser/types";
import type { TemplateConfig } from "@/lib/templates/schema";
import type { StructuredDocument, Chapter, Section } from "./types";

export function detectStructure(
  ast: DocumentAST,
  template: TemplateConfig
): StructuredDocument {
  const chapters: Chapter[] = [];
  const appendices: Chapter[] = [];

  const { elements } = ast;
  let currentChapter: Chapter | null = null;

  for (const element of elements) {
    if (element.type === "heading" && element.level === 1) {
      // Save previous chapter
      if (currentChapter) {
        sortChapter(currentChapter, chapters, appendices);
      }
      currentChapter = createChapter(element, template);
    } else {
      if (!currentChapter) {
        // Content before any H1 — create a default chapter
        currentChapter = {
          prefix: "0",
          title: "Introduction",
          isAppendix: false,
          sections: [],
          elements: [],
        };
      }
      currentChapter.elements.push(element);
    }
  }

  // Don't forget the last chapter
  if (currentChapter) {
    sortChapter(currentChapter, chapters, appendices);
  }

  // Build section trees for each chapter
  for (const ch of [...chapters, ...appendices]) {
    ch.sections = buildSectionTree(ch.elements);
  }

  return { chapters, appendices };
}

function sortChapter(
  chapter: Chapter,
  chapters: Chapter[],
  appendices: Chapter[]
) {
  if (chapter.isAppendix) {
    appendices.push(chapter);
  } else {
    chapters.push(chapter);
  }
}

function createChapter(
  heading: HeadingElement,
  template: TemplateConfig
): Chapter {
  const text = heading.text.trim();

  // Try matching "APPENDIX A:" or "APPENDIX A: SOME TITLE"
  const appendixPattern = /^APPENDIX\s+([A-Z])\s*:?\s*(.*)/i;
  let match = text.match(appendixPattern);
  if (match) {
    const prefix = match[1];
    // Look up the appendix name from the template, or use what follows the colon
    const templateAppendix = template.documentStructure.pageNumbering.appendices.find(
      (a) => a.prefix.toUpperCase() === prefix.toUpperCase()
    );
    const title = templateAppendix?.name || match[2].trim() || prefix;
    return {
      prefix,
      title,
      isAppendix: true,
      sections: [],
      elements: [],
    };
  }

  // Try matching against template chapter/appendix definitions
  const templateMatch = matchTemplateChapter(text, template);
  if (templateMatch) {
    return { ...templateMatch, sections: [], elements: [] };
  }

  // Try "CHAPTER N: TITLE"
  const chapterPattern = /^(?:CHAPTER\s+)?(\d+)\s*[:\-–—]\s*(.+)/i;
  match = text.match(chapterPattern);
  if (match) {
    return {
      prefix: match[1],
      title: match[2].trim(),
      isAppendix: false,
      sections: [],
      elements: [],
    };
  }

  // Check if it's a single letter followed by title text (e.g., "A INFORMATION SECURITY...")
  const singleLetterPattern = /^([A-Z])\s+(.+)/;
  match = text.match(singleLetterPattern);
  if (match) {
    const prefix = match[1];
    const templateAppendix = template.documentStructure.pageNumbering.appendices.find(
      (a) => a.prefix === prefix
    );
    if (templateAppendix) {
      return {
        prefix,
        title: templateAppendix.name,
        isAppendix: true,
        sections: [],
        elements: [],
      };
    }
  }

  // Fallback
  return {
    prefix: "0",
    title: text,
    isAppendix: false,
    sections: [],
    elements: [],
  };
}

function matchTemplateChapter(
  text: string,
  template: TemplateConfig
): { prefix: string; title: string; isAppendix: boolean } | null {
  const normalized = text.toUpperCase().replace(/\s+/g, " ").trim();

  for (const ch of template.documentStructure.pageNumbering.chapters) {
    const chapterName = ch.name.toUpperCase().replace(/\s+/g, " ").trim();
    if (
      normalized.includes(chapterName) ||
      normalized.includes(`CHAPTER ${ch.prefix}`)
    ) {
      return { prefix: ch.prefix, title: ch.name, isAppendix: false };
    }
  }

  for (const app of template.documentStructure.pageNumbering.appendices) {
    const appendixName = app.name.toUpperCase().replace(/\s+/g, " ").trim();
    if (
      normalized.includes(appendixName) ||
      normalized.includes(`APPENDIX ${app.prefix}`)
    ) {
      return { prefix: app.prefix, title: app.name, isAppendix: true };
    }
  }

  return null;
}

function buildSectionTree(elements: DocumentElement[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentSubsection: Section | null = null;

  for (const el of elements) {
    if (el.type === "heading" && el.level === 2) {
      if (currentSubsection && currentSection) {
        currentSection.subsections.push(currentSubsection);
        currentSubsection = null;
      }
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: el,
        content: [],
        subsections: [],
      };
    } else if (el.type === "heading" && el.level === 3 && currentSection) {
      if (currentSubsection) {
        currentSection.subsections.push(currentSubsection);
      }
      currentSubsection = {
        heading: el,
        content: [],
        subsections: [],
      };
    } else {
      if (currentSubsection) {
        currentSubsection.content.push(el);
      } else if (currentSection) {
        currentSection.content.push(el);
      }
    }
  }

  if (currentSubsection && currentSection) {
    currentSection.subsections.push(currentSubsection);
  }
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

export function getStructureSummary(ast: DocumentAST) {
  let headingCount = 0;
  let paragraphCount = 0;
  let tableCount = 0;
  let listCount = 0;

  for (const el of ast.elements) {
    switch (el.type) {
      case "heading":
        headingCount++;
        break;
      case "paragraph":
        paragraphCount++;
        break;
      case "table":
        tableCount++;
        break;
      case "list":
        listCount++;
        break;
    }
  }

  return { headingCount, paragraphCount, tableCount, listCount };
}
