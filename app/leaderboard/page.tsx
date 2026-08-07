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
  return <LeaderboardClient initialDevelopers={developers} />;
}
