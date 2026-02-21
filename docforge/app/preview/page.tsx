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
    revisionMarks,
    sidebarMode,
    headingPageLabels,
    sectionPageCounts,
    metadata,
    file,
    status,
    reset,
    toggleManualBreak,
    clearManualBreaks,
    toggleRevisionMark,
    clearRevisionMarks,
    setSidebarMode,
    setHeadingPageLabels,
    setSectionPageCounts,
    setStatus,
    setPdfUrl,
    setError,
  } = useConversion();
  const router = useRouter();

  // Track the breaks + revisions that are already reflected in the current PDF
  const renderedBreaksRef = useRef<string>("[]");
  const renderedRevisionsRef = useRef<string>("[]");
  const isRenderingRef = useRef(false);
  const scrollTargetRef = useRef<string | null>(null);

  const activeBreakKeys = useMemo(() => {
    const set = new Set<string>();
    for (const b of manualBreaks) {
      set.add(`${b.sectionId}:${b.beforeElementIndex}`);
    }
    return set;
  }, [manualBreaks]);

  const activeRevisionKeys = useMemo(() => {
    const set = new Set<string>();
    for (const r of revisionMarks) {
      set.add(`${r.sectionId}:${r.headingElementIndex}`);
    }
    return set;
  }, [revisionMarks]);

  const renderPdf = useCallback(
    async (breaks: typeof manualBreaks, revisions: typeof revisionMarks) => {
      if (!file || isRenderingRef.current) return;
      isRenderingRef.current = true;
      setStatus("converting");

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (breaks.length > 0) {
          formData.append("manualBreaks", JSON.stringify(breaks));
        }
        if (revisions.length > 0) {
          formData.append("revisionMarks", JSON.stringify(revisions));
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

        // Read heading page map for scroll-to-page
        const headingPagesHeader = response.headers.get("X-Heading-Pages");
        let scrollPage: number | null = null;
        if (headingPagesHeader && scrollTargetRef.current) {
          try {
            const headingPages: Record<string, number> = JSON.parse(headingPagesHeader);
            const page = headingPages[scrollTargetRef.current];
            if (page) scrollPage = page;
          } catch { /* ignore parse errors */ }
        }
        scrollTargetRef.current = null;

        // Parse page labels and section counts
        const labelsHeader = response.headers.get("X-Heading-Page-Labels");
        if (labelsHeader) {
          try {
            setHeadingPageLabels(JSON.parse(labelsHeader));
          } catch { /* ignore */ }
        }
        const countsHeader = response.headers.get("X-Section-Page-Counts");
        if (countsHeader) {
          try {
            setSectionPageCounts(JSON.parse(countsHeader));
          } catch { /* ignore */ }
        }

        const blob = await response.blob();
        let url = URL.createObjectURL(blob);
        if (scrollPage !== null) {
          url += `#page=${scrollPage}`;
        }
        renderedBreaksRef.current = JSON.stringify(breaks);
        renderedRevisionsRef.current = JSON.stringify(revisions);
        setPdfUrl(url);
      } catch {
        setError("Conversion failed. Please try again.");
      } finally {
        isRenderingRef.current = false;
      }
    },
    [file, metadata, setStatus, setPdfUrl, setError, setHeadingPageLabels, setSectionPageCounts]
  );

  // Serialize current state for change detection
  const currentBreaksJson = JSON.stringify(manualBreaks);
  const currentRevisionsJson = JSON.stringify(revisionMarks);

  // Auto re-render when manualBreaks or revisionMarks change
  useEffect(() => {
    const breaksChanged = currentBreaksJson !== renderedBreaksRef.current;
    const revisionsChanged = currentRevisionsJson !== renderedRevisionsRef.current;
    if ((breaksChanged || revisionsChanged) && !isRenderingRef.current) {
      renderPdf(manualBreaks, revisionMarks);
    }
  }, [currentBreaksJson, currentRevisionsJson, manualBreaks, revisionMarks, renderPdf]);

  // If a render just finished but state changed while it was in progress, re-render again
  useEffect(() => {
    if (status === "done") {
      const breaksChanged = currentBreaksJson !== renderedBreaksRef.current;
      const revisionsChanged = currentRevisionsJson !== renderedRevisionsRef.current;
      if (breaksChanged || revisionsChanged) {
        renderPdf(manualBreaks, revisionMarks);
      }
    }
  }, [status, currentBreaksJson, currentRevisionsJson, manualBreaks, revisionMarks, renderPdf]);

  const handleToggleBreak = useCallback(
    (sectionId: string, elementIndex: number, headingNumbering?: string) => {
      if (headingNumbering) {
        scrollTargetRef.current = headingNumbering;
      }
      toggleManualBreak(sectionId, elementIndex);
    },
    [toggleManualBreak]
  );

  const handleToggleRevision = useCallback(
    (sectionId: string, elementIndex: number, headingNumbering?: string) => {
      if (headingNumbering) {
        scrollTargetRef.current = headingNumbering;
      }
      toggleRevisionMark(sectionId, elementIndex);
    },
    [toggleRevisionMark]
  );

  const handleClearBreaks = useCallback(() => {
    scrollTargetRef.current = null;
    clearManualBreaks();
  }, [clearManualBreaks]);

  const handleClearRevisions = useCallback(() => {
    scrollTargetRef.current = null;
    clearRevisionMarks();
  }, [clearRevisionMarks]);

  const handleConvertAnother = () => {
    reset();
    router.push("/");
  };

  const isRendering = status === "converting";
  const pdfOutOfDate =
    currentBreaksJson !== renderedBreaksRef.current ||
    currentRevisionsJson !== renderedRevisionsRef.current;

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
              sidebarMode={sidebarMode}
              onSetSidebarMode={setSidebarMode}
              activeBreaks={activeBreakKeys}
              onToggleBreak={handleToggleBreak}
              onClearBreaks={handleClearBreaks}
              breakCount={manualBreaks.length}
              activeRevisions={activeRevisionKeys}
              onToggleRevision={handleToggleRevision}
              onClearRevisions={handleClearRevisions}
              revisionCount={revisionMarks.length}
              headingPageLabels={headingPageLabels}
              sectionPageCounts={sectionPageCounts}
              isRendering={isRendering}
            />
          </div>
        )}
      </div>
    </div>
  );
}
