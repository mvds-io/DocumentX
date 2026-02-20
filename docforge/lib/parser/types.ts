export interface DocumentAST {
  metadata: DocumentMetadata;
  elements: DocumentElement[];
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  createdDate?: string;
}

export type DocumentElement =
  | HeadingElement
  | ParagraphElement
  | ListElement
  | TableElement;

export interface HeadingElement {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  numbering?: string;
  children: InlineElement[];
}

export interface ParagraphElement {
  type: "paragraph";
  children: InlineElement[];
}

export interface ListElement {
  type: "list";
  ordered: boolean;
  items: ListItemElement[];
}

export interface ListItemElement {
  type: "list-item";
  children: (InlineElement | ListElement)[];
}

export interface TableElement {
  type: "table";
  headers: TableRow[];
  rows: TableRow[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TableCell {
  content: InlineElement[];
  colspan?: number;
  rowspan?: number;
}

export interface InlineElement {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}
