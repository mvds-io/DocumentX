"use client";

import { UploadDropzone } from "@/components/upload/dropzone";
import { ConversionSummary } from "@/components/upload/conversion-summary";
import { ConversionProgress } from "@/components/upload/conversion-progress";
import { DownloadResult } from "@/components/upload/download-result";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Convert Document</CardTitle>
          <CardDescription>
            Upload a .docx file to convert it into a standardized, formatted PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadDropzone />
        </CardContent>
      </Card>

      <ConversionProgress />
      <ConversionSummary />
      <DownloadResult />
    </div>
  );
}
