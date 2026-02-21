"use client";

import { UploadDropzone } from "@/components/upload/dropzone";
import { ConversionSummary } from "@/components/upload/conversion-summary";
import { ConversionProgress } from "@/components/upload/conversion-progress";
import { DownloadResult } from "@/components/upload/download-result";
import { DocumentGuide } from "@/components/upload/document-guide";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            <TextGenerateEffect words="Convert Document" duration={0.4} />
          </CardTitle>
          <CardDescription>
            Upload a .docx file to convert it into a standardized, formatted PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone />
        </CardContent>
      </Card>

      <DocumentGuide />

      <ConversionProgress />
      <ConversionSummary />
      <DownloadResult />
    </div>
  );
}
