"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useConversion } from "@/lib/context/conversion-context";
import { toast } from "sonner";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export function UploadDropzone() {
  const { file, setFile, setParseSummary, setStatus, setError } = useConversion();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const docxFile = acceptedFiles[0];
      setFile(docxFile);
      setStatus("parsing");

      try {
        const formData = new FormData();
        formData.append("file", docxFile);
        formData.append("action", "parse");

        const response = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          setError(err.error || "Failed to parse document");
          toast.error(err.error || "Failed to parse document");
          return;
        }

        const data = await response.json();
        setParseSummary(data.summary);
        toast.success("Document parsed successfully");
      } catch {
        setError("Failed to parse document. Please try again.");
        toast.error("Failed to parse document");
      }
    },
    [setFile, setParseSummary, setStatus, setError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const rejection = rejections[0];
      if (rejection?.errors[0]?.code === "file-too-large") {
        toast.error("File is too large. Maximum size is 50MB.");
      } else if (rejection?.errors[0]?.code === "file-invalid-type") {
        toast.error("Invalid file type. Please upload a .docx file.");
      } else {
        toast.error("File rejected. Please upload a valid .docx file.");
      }
    },
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxSize: 50 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div className="relative rounded-lg">
      <GlowingEffect
        spread={40}
        glow
        disabled={!!file}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          ${file ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}
        `}
      >
        <input {...getInputProps()} />

        {file ? (
          <div className="space-y-2">
            <div className="text-3xl">&#10003;</div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-muted-foreground">
              Drop a new file to replace
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl text-muted-foreground">&#128196;</div>
            {isDragActive ? (
              <p className="text-primary font-medium">Drop your file here</p>
            ) : (
              <>
                <p className="font-medium">
                  Drag and drop your .docx file here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Maximum file size: 50 MB
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center mt-3">
        Your documents are processed locally and deleted after conversion. Nothing is stored.
      </p>
    </div>
  );
}
