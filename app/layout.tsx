import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://pumpboard.dev/#org",
      name: "PumpBoard",
      url: "https://pumpboard.dev",
      logo: "https://pumpboard.dev/logo-icon.png",
      description:
        "Decentralized sponsorship for open-source developers, powered by PumpFun on Solana.",
    },
    {
      "@type": "WebSite",
      "@id": "https://pumpboard.dev/#website",
      name: "PumpBoard",
      url: "https://pumpboard.dev",
      publisher: { "@id": "https://pumpboard.dev/#org" },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://pumpboard.dev"),
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
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
