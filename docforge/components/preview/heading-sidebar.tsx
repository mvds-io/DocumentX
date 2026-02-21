"use client";

import { Button } from "@/components/ui/button";
import type { PreviewSection } from "@/lib/context/conversion-context";
import type { SidebarMode } from "@/lib/context/conversion-context";

interface HeadingSidebarProps {
  sections: PreviewSection[];
  sidebarMode: SidebarMode;
  onSetSidebarMode: (mode: SidebarMode) => void;
  // Page breaks
  activeBreaks: Set<string>; // "sectionId:elementIndex"
  onToggleBreak: (sectionId: string, elementIndex: number, headingNumbering?: string) => void;
  onClearBreaks: () => void;
  breakCount: number;
  // Revision marks
  activeRevisions: Set<string>; // "sectionId:elementIndex"
  onToggleRevision: (sectionId: string, elementIndex: number, headingNumbering?: string) => void;
  onClearRevisions: () => void;
  revisionCount: number;
  // Page distribution
  headingPageLabels: Record<string, string>;
  sectionPageCounts: Record<string, number>;
  // State
  isRendering: boolean;
}

export function HeadingSidebar({
  sections,
  sidebarMode,
  onSetSidebarMode,
  activeBreaks,
  onToggleBreak,
  onClearBreaks,
  breakCount,
  activeRevisions,
  onToggleRevision,
  onClearRevisions,
  revisionCount,
  headingPageLabels,
  sectionPageCounts,
  isRendering,
}: HeadingSidebarProps) {
  const isBreaksMode = sidebarMode === "breaks";
  const activeSet = isBreaksMode ? activeBreaks : activeRevisions;
  const activeCount = isBreaksMode ? breakCount : revisionCount;
  const onToggle = isBreaksMode ? onToggleBreak : onToggleRevision;
  const onClear = isBreaksMode ? onClearBreaks : onClearRevisions;

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle */}
      <div className="p-2 border-b">
        <div className="flex rounded-md border overflow-hidden text-xs">
          <button
            onClick={() => onSetSidebarMode("breaks")}
            className={`flex-1 px-2 py-1.5 font-medium transition-colors ${
              isBreaksMode
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Page Breaks
            {breakCount > 0 && (
              <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5">
                {breakCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSetSidebarMode("revisions")}
            className={`flex-1 px-2 py-1.5 font-medium transition-colors border-l ${
              !isBreaksMode
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Revisions
            {revisionCount > 0 && (
              <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5">
                {revisionCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Description and clear */}
      <div className="p-3 border-b space-y-2">
        <p className="text-xs text-muted-foreground">
          {isBreaksMode
            ? "Click a heading to add a page break before it. The PDF re-renders automatically."
            : "Click a heading to mark its section as revised. A black bar appears in the left margin."}
        </p>
        {activeCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {activeCount} {isBreaksMode ? "break" : "revision"}{activeCount !== 1 ? "s" : ""} active
              {isRendering && " — rendering..."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={isRendering}
            >
              Clear All
            </Button>
          </div>
        )}
        {isRendering && activeCount === 0 && (
          <span className="text-xs text-muted-foreground">Rendering...</span>
        )}
      </div>

      {/* Heading list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <div key={section.sectionId} className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 sticky top-0 bg-background flex items-center justify-between">
              <span>{section.prefix} &mdash; {section.title}</span>
              {sectionPageCounts[section.prefix] != null && (
                <span className="text-[10px] font-normal text-muted-foreground/70">
                  {sectionPageCounts[section.prefix]} pg{sectionPageCounts[section.prefix] !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {section.headings.map((h) => {
              const key = `${section.sectionId}:${h.elementIndex}`;
              const isActive = activeSet.has(key);
              const indent =
                h.level === 3 ? "pl-4" : h.level >= 4 ? "pl-6" : "";
              const pageLabel = h.numbering ? headingPageLabels[h.numbering] : undefined;

              // Color scheme: blue for breaks, amber for revisions
              const activeClasses = isBreaksMode
                ? "bg-blue-50 border border-blue-200 text-blue-800"
                : "bg-amber-50 border border-amber-200 text-amber-800";
              const checkboxActive = isBreaksMode
                ? "bg-blue-500"
                : "bg-amber-500";

              return (
                <button
                  key={key}
                  onClick={() =>
                    onToggle(section.sectionId, h.elementIndex, h.numbering)
                  }
                  disabled={isRendering}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-start gap-2 ${indent} ${
                    isRendering ? "opacity-60 cursor-wait" : ""
                  } ${
                    isActive
                      ? activeClasses
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {isActive ? (
                      <span className={`inline-block w-3 h-3 rounded-sm ${checkboxActive} text-white text-[8px] leading-3 text-center`}>
                        &#10003;
                      </span>
                    ) : (
                      <span className="inline-block w-3 h-3 rounded-sm border border-gray-300" />
                    )}
                  </span>
                  <span className="flex-1 leading-tight">
                    {h.numbering && (
                      <span className="font-medium">{h.numbering} </span>
                    )}
                    {cleanHeadingText(h.text)}
                  </span>
                  {pageLabel && (
                    <span className="flex-shrink-0 text-[10px] text-muted-foreground/70 mt-0.5">
                      p.{pageLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function cleanHeadingText(text: string): string {
  return text.replace(/^[A-Z0-9]+(?:\.\d+)*\s*[-\u2013\u2014]?\s*/i, "").trim();
}
