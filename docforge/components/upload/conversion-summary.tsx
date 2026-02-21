"use client";

import { useConversion } from "@/lib/context/conversion-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { useRouter } from "next/navigation";

export function ConversionSummary() {
  const { parseSummary, file, metadata, setMetadataField, setStatus, setPreviewData, setPdfUrl, setError } =
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
      if (metadata.revisionNumber) pdfForm.append("revisionNumber", metadata.revisionNumber);
      if (metadata.date) pdfForm.append("date", metadata.date);
      if (metadata.companyName) pdfForm.append("companyName", metadata.companyName);
      if (metadata.manualAbbreviation) pdfForm.append("manualAbbreviation", metadata.manualAbbreviation);

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
        <h3 className="font-semibold mb-4">Document Details</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={metadata.companyName}
              onChange={(e) => setMetadataField("companyName", e.target.value)}
              placeholder="e.g. Airlift AS"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualAbbreviation">Manual Abbreviation</Label>
            <Input
              id="manualAbbreviation"
              value={metadata.manualAbbreviation}
              onChange={(e) => setMetadataField("manualAbbreviation", e.target.value)}
              placeholder="e.g. MSM"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="revisionNumber">Revision Number</Label>
            <Input
              id="revisionNumber"
              type="number"
              value={metadata.revisionNumber}
              onChange={(e) => setMetadataField("revisionNumber", e.target.value)}
              placeholder="e.g. 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Revision Date</Label>
            <Input
              id="date"
              value={metadata.date}
              onChange={(e) => setMetadataField("date", e.target.value)}
              placeholder="DD.MM.YY"
            />
          </div>
        </div>
        <BackgroundGradient className="rounded-lg" containerClassName="rounded-lg">
          <Button onClick={handleConvert} className="w-full rounded-lg" size="lg">
            Convert to PDF
          </Button>
        </BackgroundGradient>
      </CardContent>
    </Card>
  );
}
