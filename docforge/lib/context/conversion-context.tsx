"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ManualPageBreak } from "@/lib/transformer/types";

interface ParseSummary {
  headingCount: number;
  paragraphCount: number;
  tableCount: number;
  listCount: number;
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
  reset: () => void;
}

const initialState: ConversionState = {
  file: null,
  parseSummary: null,
  status: "idle",
  pdfUrl: null,
  error: null,
  previewData: null,
  manualBreaks: [],
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
