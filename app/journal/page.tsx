import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import legal from "../components/LegalPage.module.css";
import styles from "./journal.module.css";
import { getStories } from "../lib/api";
import type { StoryKind } from "../types";
import StoryCard, { ComingSoonCard, FeaturedStoryCard } from "./StoryCard";
import { KIND_LABELS } from "./story";

const DESCRIPTION =
  "Milestones, developer spotlights and updates from the PumpBoard team.";

export const metadata: Metadata = {
  title: "Journal | PumpBoard",
  description: DESCRIPTION,
  alternates: {
    types: { "application/rss+xml": "https://pumpboard.dev/journal/rss.xml" },
  },
  openGraph: {
    title: "Journal | PumpBoard",
    description: DESCRIPTION,
    url: "https://pumpboard.dev/journal",
    type: "website",
  },
};

// Render at request time so the HTML always carries real data for crawlers
// and AI fetchers (build-time prerender can't reach the backend, see /).
export const dynamic = "force-dynamic";

const FILTERS: { key: StoryKind | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "milestone", label: "Milestones" },
  { key: "spotlight", label: "Spotlights" },
  { key: "update", label: "Updates" },
];

type Props = { searchParams: Promise<{ type?: string }> };

export default async function JournalPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const kind = type && type in KIND_LABELS ? (type as StoryKind) : "all";
  const allStories = await getStories();
  const stories = allStories && (kind === "all" ? allStories : allStories.filter((s) => s.kind === kind));
  // The pinned post takes the big slot, else the newest
  const featured = stories?.find((s) => s.pinned) ?? stories?.[0];
  const rest = (stories ?? []).filter((s) => s !== featured);
  // Spotlights are the posts still to come, so only their views hold a slot open
  const showComingSoon = kind === "all" || kind === "spotlight";

  return (
    <>
      <Navbar />
      <main className={legal.legalPage}>
        <div className="container">
          <Link href="/" className={legal.backLink}>← Back to Home</Link>
          <h1 className={legal.title}>Journal</h1>
          <p className={styles.subtitle}>
            Milestones, developer spotlights and updates from the PumpBoard team.
          </p>

          {allStories && allStories.length > 0 && (
            <nav className={styles.filterTabs} aria-label="Filter posts">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/journal" : `/journal?type=${f.key}`}
                  className={`${styles.filterBtn} ${kind === f.key ? styles.filterActive : ""}`}
                  aria-current={kind === f.key ? "page" : undefined}
                  scroll={false}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          )}

          {stories === null && (
            <p className={styles.empty}>Couldn&apos;t load posts right now. Try again in a moment.</p>
          )}

          {stories?.length === 0 && (
            <p className={styles.empty}>
              {kind === "all" ? "No posts yet. Check back soon." : "Nothing here yet. Check back soon."}
            </p>
          )}

          {featured && (
            <>
              <FeaturedStoryCard story={featured} />
              {(rest.length > 0 || showComingSoon) && (
                <div className={styles.grid}>
                  {rest.map((story) => (
                    <StoryCard key={story.slug} story={story} headingLevel="h2" />
                  ))}
                  {showComingSoon && <ComingSoonCard />}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
