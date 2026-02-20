"use client";

import { useConversion } from "@/lib/context/conversion-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeadingSidebar } from "@/components/preview/heading-sidebar";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useMemo } from "react";

export default function PreviewPage() {
  const {
    pdfUrl,
    previewData,
    manualBreaks,
    metadata,
    file,
    status,
    reset,
    toggleManualBreak,
    clearManualBreaks,
    setStatus,
    setPdfUrl,
    setError,
  } = useConversion();
  const router = useRouter();

  // Track the breaks that are already reflected in the current PDF
  const renderedBreaksRef = useRef<string>("[]");
  const isRenderingRef = useRef(false);

  const activeBreakKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of manualBreaks) {
      set.add(`${b.sectionId}:${b.beforeElementIndex}`);
    }
    return set;
  }, [manualBreaks]);

  const renderPdf = useCallback(
    async (breaks: typeof manualBreaks) => {
      if (!file || isRenderingRef.current) return;
      isRenderingRef.current = true;
      setStatus("converting");

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (breaks.length > 0) {
          formData.append("manualBreaks", JSON.stringify(breaks));
        }
        if (metadata.revisionNumber) formData.append("revisionNumber", metadata.revisionNumber);
        if (metadata.date) formData.append("date", metadata.date);
        if (metadata.companyName) formData.append("companyName", metadata.companyName);
        if (metadata.manualAbbreviation) formData.append("manualAbbreviation", metadata.manualAbbreviation);

        const response = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          setError(err.error || "Conversion failed");
          return;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        renderedBreaksRef.current = JSON.stringify(breaks);
        setPdfUrl(url);
      } catch {
        setError("Conversion failed. Please try again.");
      } finally {
        isRenderingRef.current = false;
      }
    },
    [file, metadata, setStatus, setPdfUrl, setError]
  );

  // Auto re-render when manualBreaks change
  useEffect(() => {
    const currentBreaksJson = JSON.stringify(manualBreaks);
    if (currentBreaksJson !== renderedBreaksRef.current && !isRenderingRef.current) {
      renderPdf(manualBreaks);
    }
  }, [manualBreaks, renderPdf]);

  // If a render just finished but breaks changed while it was in progress, re-render again
  useEffect(() => {
    if (status === "done") {
      const currentBreaksJson = JSON.stringify(manualBreaks);
      if (currentBreaksJson !== renderedBreaksRef.current) {
        renderPdf(manualBreaks);
      }
    }
  }, [status, manualBreaks, renderPdf]);

  const handleClearAndRerender = useCallback(() => {
    clearManualBreaks();
    // The useEffect will pick up the empty breaks and trigger a re-render
  }, [clearManualBreaks]);

  const handleConvertAnother = () => {
    reset();
    router.push("/");
  };

  const isRendering = status === "converting";
  const pdfOutOfDate =
    JSON.stringify(manualBreaks) !== renderedBreaksRef.current;

  // No data at all
  if (!pdfUrl && !previewData) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              No document has been converted yet.
            </p>
            <Button onClick={() => router.push("/")}>Go to Upload</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: "1200px" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Document Preview</h2>
        <div className="flex gap-3">
          {pdfUrl && !isRendering && !pdfOutOfDate && (
            <Button asChild>
              <a href={pdfUrl} download="docforge-output.pdf">
                Download PDF
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={handleConvertAnother}>
            Convert Another
          </Button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
        {/* PDF viewer with loading overlay */}
        <div className="flex-1 min-w-0 relative">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border rounded bg-white"
              title="PDF Preview"
            />
          ) : (
            <div className="w-full h-full border rounded bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Generating PDF...</p>
            </div>
          )}
          {/* Overlay while re-rendering */}
          {(isRendering || pdfOutOfDate) && pdfUrl && (
            <div className="absolute inset-0 bg-white/60 border rounded flex items-center justify-center">
              <div className="bg-background border rounded-lg px-4 py-3 shadow-sm text-sm text-muted-foreground">
                Re-rendering PDF...
              </div>
            </div>
          )}
        </div>

        {/* Heading sidebar */}
        {previewData && (
          <div className="w-72 flex-shrink-0 border rounded bg-background overflow-hidden">
            <HeadingSidebar
              sections={previewData.sections}
              activeBreaks={activeBreakKeys}
              onToggleBreak={toggleManualBreak}
              onClearAll={handleClearAndRerender}
              isRendering={isRendering}
              breakCount={manualBreaks.length}
            />
          </div>
        )}
      </div>
    </div>
  );
}
