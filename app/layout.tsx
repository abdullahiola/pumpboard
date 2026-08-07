import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PumpBoard — Decentralized Sponsorship for Open-Source Developers",
  description:
    "Onboard developers from GitHub and sponsor them through PumpFun decentralized sponsorship. Support open-source builders on Solana.",
  keywords: [
    "PumpFun",
    "Solana",
    "GitHub",
    "sponsorship",
    "developers",
    "decentralized",
    "open-source",
  ],
  openGraph: {
    title: "PumpBoard — Decentralized Sponsorship for Open-Source Developers",
    description:
      "Support open-source developers through decentralized sponsorship powered by PumpFun on Solana.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
