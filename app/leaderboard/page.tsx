import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";
import { getDevelopers } from "../lib/api";

export const metadata: Metadata = {
  title: "Leaderboard — PumpBoard",
  description:
    "Top developers and creators ranked by total claimed rewards on PumpBoard.",
};

// Render at request time so the HTML always carries real data for crawlers
// and AI fetchers (build-time prerender can't reach the backend, see /).
export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const developers = await getDevelopers();

  const ranked = (developers ?? [])
    .filter((d) => d.totalClaimed > 0)
    .sort((a, b) => b.totalClaimed - a.totalClaimed);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "PumpBoard Leaderboard",
    description:
      "Developers and creators ranked by total claimed sponsorship rewards on PumpBoard.",
    numberOfItems: ranked.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: ranked.map((dev, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Person",
        name: dev.name || dev.github,
        ...(dev.github && { url: `https://github.com/${dev.github}` }),
        description: `Claimed $${dev.totalClaimed.toLocaleString("en-US")} in sponsorship on PumpBoard`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LeaderboardClient initialDevelopers={developers} />
    </>
  );
}
