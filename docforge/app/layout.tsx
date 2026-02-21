import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConversionProvider } from "@/lib/context/conversion-context";
import { Toaster } from "@/components/ui/sonner";
import { DotBackground } from "@/components/ui/dot-background";
import { Spotlight } from "@/components/ui/spotlight";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocForge",
  description: "Automated document format conversion system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DotBackground />
        <ConversionProvider>
          <header className="border-b relative overflow-hidden">
            <Spotlight
              className="-top-40 left-0 md:left-60 md:-top-20"
              fill="oklch(0.7 0.02 260)"
            />
            <div className="container mx-auto px-4 py-4 relative z-10">
              <h1 className="text-xl font-bold">DocForge</h1>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </ConversionProvider>
        <Toaster />
      </body>
    </html>
  );
}
