import type { TemplateConfig } from "@/lib/templates/schema";
import type { StructuredDocument } from "@/lib/structure/types";

export interface ConversionMetadata {
  revisionNumber: number;
  date: string;
  companyName: string;
  manualAbbreviation: string;
}

export interface TransformedDocument {
  sections: RenderSection[];
  template: TemplateConfig;
  metadata: ConversionMetadata;
  structuredDoc: StructuredDocument;
}

export type RenderSectionType =
  | "cover"
  | "blank"
  | "toc"
  | "chapter-title"
  | "chapter-content";

export interface RenderSection {
  id: string;
  type: RenderSectionType;
  prefix: string;
  title: string;
  htmlContent: string;
  showHeader: boolean;
  showFooter: boolean;
  pageNumberFormat: "none" | "roman" | "chapter-relative";
}

export interface ManualPageBreak {
  sectionId: string;
  beforeElementIndex: number;
}
