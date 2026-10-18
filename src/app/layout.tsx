import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STRATOVANE · Passive Thermal Control for Stratospheric Avionics",
  description:
    "Interactive heat-balance simulator for an anodic-alumina-cooled stratospheric avionics enclosure. Verified against CSIC and DLR literature. Conrad Challenge project.",
  keywords: [
    "STRATOVANE",
    "radiative cooling",
    "anodic alumina",
    "stratospheric",
    "HALE",
    "passive thermal control",
    "Conrad Challenge",
  ],
  authors: [{ name: "STRATOVANE Team" }],
  openGraph: {
    title: "STRATOVANE",
    description:
      "Passive thermal control for stratospheric avionics. Live physics simulator, team roster and open activity log.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "STRATOVANE",
    description: "Passive thermal control for stratospheric avionics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
