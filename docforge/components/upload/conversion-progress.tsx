"use client";

import { useConversion } from "@/lib/context/conversion-context";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_LABELS: Record<string, { label: string; progress: number }> = {
  uploading: { label: "Uploading document...", progress: 20 },
  parsing: { label: "Analyzing document structure...", progress: 40 },
  converting: { label: "Generating PDF...", progress: 70 },
};

export function ConversionProgress() {
  const { status } = useConversion();

  const info = STATUS_LABELS[status];
  if (!info) return null;

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">{info.label}</p>
          <Progress value={info.progress} />
        </div>
      </CardContent>
    </Card>
  );
}
