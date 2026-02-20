import type { DocumentElement, HeadingElement } from "@/lib/parser/types";

export interface StructuredDocument {
  chapters: Chapter[];
  appendices: Chapter[];
}

export interface Chapter {
  prefix: string;
  title: string;
  isAppendix: boolean;
  sections: Section[];
  /** Flat list of all content elements in this chapter (for rendering) */
  elements: DocumentElement[];
}

export interface Section {
  heading: HeadingElement;
  content: DocumentElement[];
  subsections: Section[];
}
