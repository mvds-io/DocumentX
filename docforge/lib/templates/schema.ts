export interface TemplateConfig {
  id: string;
  name: string;
  version: string;
  page: PageConfig;
  typography: TypographyConfig;
  header: HeaderFooterConfig;
  footer: HeaderFooterConfig;
  documentStructure: DocumentStructureConfig;
  revisionManagement: RevisionManagementConfig;
  bullets: BulletConfig;
}

export interface PageConfig {
  size: string;
  orientation: "portrait" | "landscape";
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  headerOffset: number;
  footerOffset: number;
}

export interface TypographyStyle {
  font: string;
  size: number;
  bold?: boolean;
  uppercase?: boolean;
  lineHeight?: number;
  color?: string;
  paragraphGap?: number;
  pageBreakBefore?: boolean;
  spaceBefore?: number;
}

export interface TypographyConfig {
  body: TypographyStyle;
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  [key: string]: TypographyStyle;
}

export interface HeaderFooterFont {
  family: string;
  size: number;
  uppercase?: boolean;
}

export interface SeparatorLine {
  width: number;
  color: string;
}

export interface HeaderFooterConfig {
  enabled: boolean;
  font: HeaderFooterFont;
  left: string;
  center: string;
  right: string;
  separatorLine: SeparatorLine;
}

export interface CoverPageConfig {
  enabled: boolean;
  logo: string;
  title: string;
  subtitle: string;
  titleFont: {
    family: string;
    size: number;
    bold: boolean;
  };
}

export interface BlankPageConfig {
  text: string;
  insertAfterCover: boolean;
  insertAfterTOC: boolean;
}

export interface TocConfig {
  enabled: boolean;
  dotLeaders: boolean;
  depth: number;
  headerCenter: string;
  pageNumbering: string;
}

export interface ChapterTitlePageConfig {
  enabled: boolean;
  titlePosition: string;
  format: string;
  appendixFormat: string;
}

export interface ChapterDefinition {
  prefix: string;
  name: string;
}

export interface PageNumberingConfig {
  scheme: string;
  tocFormat: string;
  chapterFormat: string;
  chapters: ChapterDefinition[];
  appendices: ChapterDefinition[];
}

export interface DocumentStructureConfig {
  coverPage: CoverPageConfig;
  blankPages: BlankPageConfig;
  tableOfContents: TocConfig;
  chapterTitlePages: ChapterTitlePageConfig;
  pageNumbering: PageNumberingConfig;
}

export interface RevisionBarConfig {
  enabled: boolean;
  width: number;
  color: string;
  offsetFromTextMargin: number;
  sourceMarker: string;
}

export interface RevisionManagementConfig {
  enabled: boolean;
  indexOfRevisions: boolean;
  listOfEffectiveChapters: boolean;
  revisionHighlights: boolean;
  revisionBars: RevisionBarConfig;
}

export interface BulletConfig {
  character: string;
  indentFromMargin: number;
  textIndentFromMargin: number;
}
