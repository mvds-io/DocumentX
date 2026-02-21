import { NextRequest, NextResponse } from "next/server";
import { parseDocx } from "@/lib/parser/docx-parser";
import { detectStructure, getStructureSummary } from "@/lib/structure/detector";
import { transform } from "@/lib/transformer/transformer";
import { renderPdf } from "@/lib/renderer/pdf";
import { loadTemplate } from "@/lib/templates/loader";
import type { ManualPageBreak } from "@/lib/transformer/types";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only .docx files are accepted. Please upload a Word document." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds the 50MB limit." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate ZIP magic number (docx is a ZIP archive)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json(
        { error: "The file does not appear to be a valid .docx document." },
        { status: 400 }
      );
    }

    // Parse the document
    const ast = await parseDocx(buffer);

    // If action is "parse", return just the summary
    if (action === "parse") {
      const summary = getStructureSummary(ast);
      return NextResponse.json({ summary });
    }

    const template = await loadTemplate("airlift-msm-v1");
    const structured = detectStructure(ast, template);
    const metadata = {
      revisionNumber: Number(formData.get("revisionNumber")) || 0,
      date: (formData.get("date") as string) || "",
      companyName: (formData.get("companyName") as string) || "",
      manualAbbreviation: (formData.get("manualAbbreviation") as string) || "",
    };

    // Prepare preview: return heading structure per section (no Puppeteer)
    if (action === "prepare-preview") {
      const allChapters = [...structured.chapters, ...structured.appendices];
      const sections = allChapters.map((chapter) => {
        const headings: { elementIndex: number; level: number; text: string; numbering?: string }[] = [];
        chapter.elements.forEach((el, i) => {
          if (el.type === "heading") {
            headings.push({
              elementIndex: i,
              level: el.level,
              text: el.text,
              numbering: el.numbering,
            });
          }
        });
        return {
          sectionId: `content-${chapter.prefix}`,
          prefix: chapter.prefix,
          title: chapter.title,
          headings,
        };
      });

      return NextResponse.json({ sections });
    }

    // Full conversion pipeline (with optional manual breaks)
    const manualBreaksJson = formData.get("manualBreaks") as string | null;
    const manualBreaks: ManualPageBreak[] = manualBreaksJson
      ? JSON.parse(manualBreaksJson)
      : [];

    const transformed = transform(structured, template, metadata, manualBreaks.length > 0 ? manualBreaks : undefined);
    const { buffer: pdfBuffer, headingPages } = await renderPdf(transformed);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="docforge-output-${Date.now()}.pdf"`,
        "X-Heading-Pages": JSON.stringify(headingPages),
      },
    });
  } catch (error) {
    console.error("Conversion error:", error);
    return NextResponse.json(
      { error: "Conversion failed. Please try again." },
      { status: 500 }
    );
  }
}
