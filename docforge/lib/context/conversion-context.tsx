"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ManualPageBreak, RevisionMark } from "@/lib/transformer/types";

export type SidebarMode = "breaks" | "revisions";

interface ParseSummary {
  headingCount: number;
  paragraphCount: number;
  tableCount: number;
  listCount: number;
}

export interface DocumentMetadata {
  revisionNumber: string;
  date: string;
  companyName: string;
  manualAbbreviation: string;
}

export interface HeadingInfo {
  elementIndex: number;
  level: number;
  text: string;
  numbering?: string;
}

export interface PreviewSection {
  sectionId: string;
  prefix: string;
  title: string;
  headings: HeadingInfo[];
}

export interface PreviewData {
  sections: PreviewSection[];
}

type ConversionStatus =
  | "idle"
  | "uploading"
  | "parsing"
  | "converting"
  | "done"
  | "error";

interface ConversionState {
  file: File | null;
  parseSummary: ParseSummary | null;
  status: ConversionStatus;
  pdfUrl: string | null;
  error: string | null;
  previewData: PreviewData | null;
  manualBreaks: ManualPageBreak[];
  revisionMarks: RevisionMark[];
  sidebarMode: SidebarMode;
  headingPageLabels: Record<string, string>;
  sectionPageCounts: Record<string, number>;
  metadata: DocumentMetadata;
}

interface ConversionActions {
  setFile: (file: File | null) => void;
  setParseSummary: (summary: ParseSummary) => void;
  setStatus: (status: ConversionStatus) => void;
  setPdfUrl: (url: string) => void;
  setError: (error: string) => void;
  setPreviewData: (data: PreviewData) => void;
  toggleManualBreak: (sectionId: string, elementIndex: number) => void;
  clearManualBreaks: () => void;
  toggleRevisionMark: (sectionId: string, headingElementIndex: number) => void;
  clearRevisionMarks: () => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setHeadingPageLabels: (labels: Record<string, string>) => void;
  setSectionPageCounts: (counts: Record<string, number>) => void;
  setMetadataField: (field: keyof DocumentMetadata, value: string) => void;
  reset: () => void;
}

const defaultMetadata: DocumentMetadata = {
  revisionNumber: "",
  date: "",
  companyName: "",
  manualAbbreviation: "",
};

const initialState: ConversionState = {
  file: null,
  parseSummary: null,
  status: "idle",
  pdfUrl: null,
  error: null,
  previewData: null,
  manualBreaks: [],
  revisionMarks: [],
  sidebarMode: "breaks",
  headingPageLabels: {},
  sectionPageCounts: {},
  metadata: defaultMetadata,
};

const ConversionContext = createContext<
  (ConversionState & ConversionActions) | null
>(null);

export function ConversionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConversionState>(initialState);

  const setFile = useCallback((file: File | null) => {
    setState((prev) => ({
      ...prev,
      file,
      parseSummary: null,
      status: file ? "idle" : "idle",
      pdfUrl: null,
      error: null,
      previewData: null,
      manualBreaks: [],
      revisionMarks: [],
      headingPageLabels: {},
      sectionPageCounts: {},
    }));
  }, []);

  const setParseSummary = useCallback((summary: ParseSummary) => {
    setState((prev) => ({ ...prev, parseSummary: summary, status: "idle" }));
  }, []);

  const setStatus = useCallback((status: ConversionStatus) => {
    setState((prev) => ({ ...prev, status, error: null }));
  }, []);

  const setPdfUrl = useCallback((url: string) => {
    setState((prev) => ({ ...prev, pdfUrl: url, status: "done" }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error, status: "error" }));
  }, []);

  const setPreviewData = useCallback((data: PreviewData) => {
    setState((prev) => ({ ...prev, previewData: data }));
  }, []);

  const toggleManualBreak = useCallback(
    (sectionId: string, elementIndex: number) => {
      setState((prev) => {
        const exists = prev.manualBreaks.find(
          (b) => b.sectionId === sectionId && b.beforeElementIndex === elementIndex
        );
        if (exists) {
          return {
            ...prev,
            manualBreaks: prev.manualBreaks.filter((b) => b !== exists),
          };
        }
        return {
          ...prev,
          manualBreaks: [
            ...prev.manualBreaks,
            { sectionId, beforeElementIndex: elementIndex },
          ],
        };
      });
    },
    []
  );

  const clearManualBreaks = useCallback(() => {
    setState((prev) => ({ ...prev, manualBreaks: [] }));
  }, []);

  const toggleRevisionMark = useCallback(
    (sectionId: string, headingElementIndex: number) => {
      setState((prev) => {
        const exists = prev.revisionMarks.find(
          (r) => r.sectionId === sectionId && r.headingElementIndex === headingElementIndex
        );
        if (exists) {
          return {
            ...prev,
            revisionMarks: prev.revisionMarks.filter((r) => r !== exists),
          };
        }
        return {
          ...prev,
          revisionMarks: [
            ...prev.revisionMarks,
            { sectionId, headingElementIndex },
          ],
        };
      });
    },
    []
  );

  const clearRevisionMarks = useCallback(() => {
    setState((prev) => ({ ...prev, revisionMarks: [] }));
  }, []);

  const setSidebarMode = useCallback((mode: SidebarMode) => {
    setState((prev) => ({ ...prev, sidebarMode: mode }));
  }, []);

  const setHeadingPageLabels = useCallback((labels: Record<string, string>) => {
    setState((prev) => ({ ...prev, headingPageLabels: labels }));
  }, []);

  const setSectionPageCounts = useCallback((counts: Record<string, number>) => {
    setState((prev) => ({ ...prev, sectionPageCounts: counts }));
  }, []);

  const setMetadataField = useCallback(
    (field: keyof DocumentMetadata, value: string) => {
      setState((prev) => ({
        ...prev,
        metadata: { ...prev.metadata, [field]: value },
      }));
    },
    []
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <ConversionContext.Provider
      value={{
        ...state,
        setFile,
        setParseSummary,
        setStatus,
        setPdfUrl,
        setError,
        setPreviewData,
        toggleManualBreak,
        clearManualBreaks,
        toggleRevisionMark,
        clearRevisionMarks,
        setSidebarMode,
        setHeadingPageLabels,
        setSectionPageCounts,
        setMetadataField,
        reset,
      }}
    >
      {children}
    </ConversionContext.Provider>
  );
}

export function useConversion() {
  const context = useContext(ConversionContext);
  if (!context) {
    throw new Error("useConversion must be used within a ConversionProvider");
  }
  return context;
}
