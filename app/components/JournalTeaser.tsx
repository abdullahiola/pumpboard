import Link from "next/link";
import StoryCard from "../journal/StoryCard";
import styles from "./JournalTeaser.module.css";
import type { Story } from "../types";

const TEASER_COUNT = 3;

/** Latest Journal posts on the home page; renders nothing until one is published. */
export default function JournalTeaser({ stories }: { stories: Story[] | null }) {
  if (!stories?.length) return null;

  return (
    <section className="section" id="journal">
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Journal
          </span>
          <h2 className="section-title">What&apos;s Happening on PumpBoard</h2>
          <p className="section-subtitle">
            Milestones, developer spotlights and updates from the PumpBoard team.
          </p>
        </div>

        <div className={styles.grid}>
          {stories.slice(0, TEASER_COUNT).map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>

        <div className={styles.seeMoreWrap}>
          <Link href="/journal" className="btn-secondary">
            Read the Journal
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
