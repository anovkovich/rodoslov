import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  Great_Vibes,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const greatVibes = Great_Vibes({
  variable: "--font-great-vibes",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Family Tree Builder",
  description:
    "Build your family tree interactively — flat and circular (Ahnentafel) views with HD PDF export.",
  openGraph: {
    title: "Family Tree Builder",
    description:
      "Build your family tree interactively — flat and circular (Ahnentafel) views with HD PDF export.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" data-theme="corporate">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${greatVibes.variable} antialiased min-h-screen bg-base-200`}
      >
        {children}
      </body>
    </html>
  );
}
