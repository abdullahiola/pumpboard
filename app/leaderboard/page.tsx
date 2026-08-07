import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";
import { getDevelopers } from "../lib/api";

export const metadata: Metadata = {
  title: "Leaderboard — PumpBoard",
  description:
    "Top developers and creators ranked by total claimed rewards on PumpBoard.",
};

// Regenerate at most once an hour; rankings are baked into the HTML
// so crawlers and AI fetchers see real content without running JS.
export const revalidate = 3600;

export default async function LeaderboardPage() {
  const developers = await getDevelopers();
  return <LeaderboardClient initialDevelopers={developers} />;
}
