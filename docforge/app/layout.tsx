import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConversionProvider } from "@/lib/context/conversion-context";
import { Toaster } from "@/components/ui/sonner";

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
        <ConversionProvider>
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
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
