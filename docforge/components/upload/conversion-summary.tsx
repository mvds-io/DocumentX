"use client";

import { useConversion } from "@/lib/context/conversion-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function ConversionSummary() {
  const { parseSummary, file, setStatus, setPreviewData, setPdfUrl, setError } =
    useConversion();
  const router = useRouter();

  if (!parseSummary || !file) return null;

  const handleConvert = async () => {
    setStatus("converting");

    try {
      // Run both requests in parallel: heading data (fast) + PDF render
      const previewForm = new FormData();
      previewForm.append("file", file);
      previewForm.append("action", "prepare-preview");

      const pdfForm = new FormData();
      pdfForm.append("file", file);

      const [previewRes, pdfRes] = await Promise.all([
        fetch("/api/convert", { method: "POST", body: previewForm }),
        fetch("/api/convert", { method: "POST", body: pdfForm }),
      ]);

      if (!previewRes.ok) {
        const err = await previewRes.json();
        setError(err.error || "Conversion failed");
        return;
      }

      if (!pdfRes.ok) {
        const err = await pdfRes.json();
        setError(err.error || "Conversion failed");
        return;
      }

      const previewData = await previewRes.json();
      setPreviewData(previewData);

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      router.push("/preview");
    } catch {
      setError("Conversion failed. Please try again.");
    }
  };

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">Document Summary</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{parseSummary.headingCount}</div>
            <div className="text-sm text-muted-foreground">Headings</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{parseSummary.paragraphCount}</div>
            <div className="text-sm text-muted-foreground">Paragraphs</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{parseSummary.tableCount}</div>
            <div className="text-sm text-muted-foreground">Tables</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{parseSummary.listCount}</div>
            <div className="text-sm text-muted-foreground">Lists</div>
          </div>
        </div>
        <Button onClick={handleConvert} className="w-full" size="lg">
          Convert to PDF
        </Button>
      </CardContent>
    </Card>
  );
}
