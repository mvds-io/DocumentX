"use client";

import { useConversion } from "@/lib/context/conversion-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DownloadResult() {
  const { status, pdfUrl, error, reset } = useConversion();

  if (status === "error" && error) {
    return (
      <Alert variant="destructive" className="mt-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (status !== "done" || !pdfUrl) return null;

  return (
    <Card className="mt-6">
      <CardContent className="pt-6 text-center space-y-4">
        <div className="text-4xl">&#9989;</div>
        <h3 className="font-semibold text-lg">Conversion Complete</h3>
        <p className="text-sm text-muted-foreground">
          Your document has been formatted and is ready for download.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild size="lg">
            <a href={pdfUrl} download="docforge-output.pdf">
              Download PDF
            </a>
          </Button>
          <Button variant="outline" size="lg" onClick={reset}>
            Convert Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
