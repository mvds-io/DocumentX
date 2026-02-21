"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DocumentGuide() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Document Guide</CardTitle>
        <CardDescription>
          How your Word document elements are converted to PDF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="headings">
            <AccordionTrigger>Headings and Document Structure</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Heading 1</span>{" "}
                  becomes a chapter or appendix with its own title page
                </li>
                <li>
                  <span className="font-medium text-foreground">Heading 2</span>{" "}
                  becomes a major section within the chapter (e.g., &quot;1.1
                  Section Title&quot;)
                </li>
                <li>
                  <span className="font-medium text-foreground">Heading 3</span>{" "}
                  becomes a subsection (e.g., &quot;1.1.1 Subsection&quot;)
                </li>
                <li>
                  <span className="font-medium text-foreground">Heading 4</span>{" "}
                  is rendered as a heading but does not appear in the table of
                  contents
                </li>
                <li>
                  Bold paragraphs with section numbering (e.g., &quot;A.1
                  Title&quot;) are automatically promoted to the appropriate
                  heading level
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="text">
            <AccordionTrigger>Text and Formatting</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Paragraphs are preserved with standard document indentation
                </li>
                <li>
                  <span className="font-medium text-foreground">Bold</span>,{" "}
                  <span className="italic text-foreground">italic</span>, and{" "}
                  <span className="underline text-foreground">underline</span>{" "}
                  formatting is preserved
                </li>
                <li>Line breaks within paragraphs are preserved</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="lists">
            <AccordionTrigger>Lists</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>Bullet lists are converted with styled bullet characters</li>
                <li>Numbered lists are automatically numbered</li>
                <li>Nested lists (multiple indent levels) are supported</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tables">
            <AccordionTrigger>Tables and Images</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Tables are preserved with fixed column layout and even width
                  distribution
                </li>
                <li>
                  Cell content wraps automatically to prevent overflow
                </li>
                <li>
                  Images are supported and displayed at a maximum width of
                  approximately 200pt
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="auto-generated">
            <AccordionTrigger>Auto-generated Elements</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">
                    Cover page
                  </span>{" "}
                  is generated automatically from the document title
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Table of Contents
                  </span>{" "}
                  is generated with accurate page numbers (any existing TOC in
                  the Word file is removed)
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Chapter title pages
                  </span>{" "}
                  are inserted before each chapter
                </li>
                <li>
                  <span className="font-medium text-foreground">
                    Headers and footers
                  </span>{" "}
                  are added with company information, revision number, and page
                  numbers
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="page-layout">
            <AccordionTrigger>Page Layout and Numbering</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Front matter (Table of Contents) pages use{" "}
                  <span className="font-medium text-foreground">
                    Roman numerals
                  </span>{" "}
                  (i, ii, iii...)
                </li>
                <li>
                  Content pages use{" "}
                  <span className="font-medium text-foreground">
                    chapter-relative numbering
                  </span>
                  . The prefix is determined by the Heading 1 text in your Word
                  file &mdash; for example, &quot;APPENDIX A: ...&quot; produces
                  pages A-1, A-2, and &quot;CHAPTER 2: ...&quot; produces 2-1,
                  2-2. Each chapter or appendix starts counting from 1
                </li>
                <li>
                  The chapter/appendix prefix is matched from the heading text
                  (e.g., &quot;APPENDIX B: ...&quot; &rarr; B) or from the
                  template configuration if the heading matches a known chapter
                  name
                </li>
                <li>
                  Page breaks from the Word document are{" "}
                  <span className="font-medium text-foreground">
                    not imported
                  </span>{" "}
                  &mdash; use the Preview page to add manual page breaks after
                  conversion
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
