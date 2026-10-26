import Image from "next/image";
import Link from "next/link";
import styles from "./journal.module.css";
import type { Story } from "../types";
import { formatViews, readingTime, resolveImageUrl } from "../utils";
import { KIND_LABELS, storyAuthor } from "./story";


export function StoryAvatar({ story, size = 40 }: { story: Story; size?: number }) {
  const { name, avatar } = storyAuthor(story);
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {avatar ? (
        <Image src={avatar} alt={name} width={size} height={size} className={styles.avatarImg} />
      ) : (
        <span>{name.substring(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

/** The post's cover, or a brand-green one so every card matches: a milestone's number, else the avatar. */
export function StoryCover({ story, className = "" }: { story: Story; className?: string }) {
  if (story.image) {
    return (
      <Image
        src={resolveImageUrl(story.image)}
        alt=""
        width={1200}
        height={630}
        className={`${styles.cover} ${className}`}
      />
    );
  }
  return (
    <div className={`${styles.cover} ${styles.coverFallback} ${className}`} aria-hidden="true">
      {story.kind === "milestone" && story.stat ? (
        <span className={styles.coverStat}>{story.stat}</span>
      ) : (
        <StoryAvatar story={story} size={64} />
      )}
    </div>
  );
}

/** Reading time and view count, shared by the cards and the post page. */
export function StoryStats({ story }: { story: Story }) {
  return (
    <>
      <span>{readingTime(story.body)}</span>
      <span className={styles.views}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        {formatViews(story.views)}
      </span>
    </>
  );
}

function StoryAuthor({ story }: { story: Story }) {
  const { name, handle } = storyAuthor(story);
  return (
    <div className={styles.author}>
      <StoryAvatar story={story} />
      <div className={styles.authorInfo}>
        <span className={styles.authorName}>{name}</span>
        {handle && <span className={styles.authorMeta}>@{handle}</span>}
      </div>
    </div>
  );
}


// The title sits one level below whatever heading the card is listed under
export default function StoryCard({
  story,
  headingLevel = "h3",
}: {
  story: Story;
  headingLevel?: "h2" | "h3";
}) {
  const Title = headingLevel;
  return (
    <Link href={`/journal/${story.slug}`} className={`glass-card ${styles.card}`}>
      <div className={styles.coverWrap}>
        <StoryCover story={story} />
        <span className={`${styles.kind} ${styles.kindOnCover}`}>{KIND_LABELS[story.kind]}</span>
      </div>
      <StoryAuthor story={story} />
      <Title className={styles.cardTitle}>{story.title}</Title>
      <p className={styles.cardExcerpt}>{story.excerpt}</p>
      <div className={styles.cardFooter}>
        <span className={styles.readMore}>Read post →</span>
        <span className={styles.stats}>
          <StoryStats story={story} />
        </span>
      </div>
    </Link>
  );
}

/** The pinned post, else the newest, shown large across the top of /journal. */
export function FeaturedStoryCard({ story }: { story: Story }) {
  return (
    <Link href={`/journal/${story.slug}`} className={`glass-card ${styles.featured}`}>
      <div className={styles.coverWrap}>
        <StoryCover story={story} />
      </div>
      <div className={styles.featuredBody}>
        <span className={styles.featuredLabel}>
          {story.pinned ? "Featured" : "Latest"} {KIND_LABELS[story.kind].toLowerCase()}
          {story.kind === "milestone" && story.stat && <> · {story.stat}</>}
        </span>
        <h2 className={styles.featuredTitle}>{story.title}</h2>
        <p className={styles.featuredExcerpt}>{story.excerpt}</p>
        <StoryAuthor story={story} />
        <div className={styles.cardFooter}>
          <span className={styles.readMore}>Read post →</span>
          <span className={styles.stats}>
            <StoryStats story={story} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Holds a grid slot until the next spotlight is published; not a link. */
export function ComingSoonCard() {
  return (
    <div className={`glass-card ${styles.card} ${styles.comingSoon}`}>
      <div className={styles.coverWrap}>
        <div className={`${styles.cover} ${styles.coverFallback}`} aria-hidden="true">
          <div className={styles.avatar} style={{ width: 64, height: 64 }}>
            <Image src="/logo-icon.png" alt="" width={64} height={64} className={styles.avatarImg} />
          </div>
        </div>
        <span className={`${styles.kind} ${styles.kindOnCover}`}>Coming soon</span>
      </div>
      <h2 className={styles.cardTitle}>More spotlights on the way</h2>
      <p className={styles.cardExcerpt}>
        We&apos;re writing up the next developers building in the open on PumpBoard.
      </p>
      <div className={styles.cardFooter}>
        <span className={styles.comingSoonNote}>Check back soon</span>
      </div>
    </div>
  );
}
