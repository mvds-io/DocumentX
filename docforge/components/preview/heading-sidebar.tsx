"use client";

import { Button } from "@/components/ui/button";
import type { PreviewSection } from "@/lib/context/conversion-context";

interface HeadingSidebarProps {
  sections: PreviewSection[];
  activeBreaks: Set<string>; // "sectionId:elementIndex"
  onToggleBreak: (sectionId: string, elementIndex: number) => void;
  onClearAll: () => void;
  isRendering: boolean;
  breakCount: number;
}

export function HeadingSidebar({
  sections,
  activeBreaks,
  onToggleBreak,
  onClearAll,
  isRendering,
  breakCount,
}: HeadingSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <h3 className="font-semibold text-sm">Page Break Controls</h3>
        <p className="text-xs text-muted-foreground">
          Click a heading to add a page break before it. The PDF re-renders
          automatically after each change.
        </p>
        {breakCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {breakCount} break{breakCount !== 1 ? "s" : ""} active
              {isRendering && " — rendering..."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={isRendering}
            >
              Clear All
            </Button>
          </div>
        )}
        {isRendering && breakCount === 0 && (
          <span className="text-xs text-muted-foreground">Rendering...</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sections.map((section) => (
          <div key={section.sectionId} className="mb-3">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1 sticky top-0 bg-background">
              {section.prefix} &mdash; {section.title}
            </div>
            {section.headings.map((h) => {
              const key = `${section.sectionId}:${h.elementIndex}`;
              const isActive = activeBreaks.has(key);
              const indent =
                h.level === 3 ? "pl-4" : h.level >= 4 ? "pl-6" : "";

              return (
                <button
                  key={key}
                  onClick={() =>
                    onToggleBreak(section.sectionId, h.elementIndex)
                  }
                  disabled={isRendering}
                  className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-start gap-2 ${indent} ${
                    isRendering ? "opacity-60 cursor-wait" : ""
                  } ${
                    isActive
                      ? "bg-blue-50 border border-blue-200 text-blue-800"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {isActive ? (
                      <span className="inline-block w-3 h-3 rounded-sm bg-blue-500 text-white text-[8px] leading-3 text-center">
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
