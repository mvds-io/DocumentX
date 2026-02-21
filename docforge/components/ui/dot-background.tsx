"use client";

import { cn } from "@/lib/utils";

export function DotBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn("fixed inset-0 -z-10", className)}
      style={{
        backgroundImage:
          "radial-gradient(circle, oklch(0.8 0 0) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        maskImage:
          "radial-gradient(ellipse at center, transparent 20%, black 70%)",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, transparent 20%, black 70%)",
      }}
    />
  );
}
