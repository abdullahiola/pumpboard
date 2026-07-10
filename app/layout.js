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

export const metadata = {
  title: "PumpBoard — Decentralized GitHub Donations via PumpFun",
  description:
    "Onboard developers and donate to them through PumpFun decentralized GitHub donations. Support open-source builders on Solana.",
  keywords: [
    "PumpFun",
    "Solana",
    "GitHub",
    "donations",
    "developers",
    "decentralized",
    "open-source",
  ],
  openGraph: {
    title: "PumpBoard — Decentralized GitHub Donations via PumpFun",
    description:
      "Support open-source developers through decentralized donations powered by PumpFun on Solana.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
