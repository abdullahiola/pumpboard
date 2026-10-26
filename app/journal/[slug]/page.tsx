import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import legal from "../../components/LegalPage.module.css";
import styles from "../journal.module.css";
import StoryCard, { StoryAvatar, StoryCover, StoryStats } from "../StoryCard";
import { storyAuthor } from "../story";
import { resolveImageUrl } from "../../utils";
import ReadingProgress from "../ReadingProgress";
import { getStories, getStory } from "../../lib/api";

// Render at request time so the HTML always carries real data for crawlers
// and AI fetchers (build-time prerender can't reach the backend, see /).
export const dynamic = "force-dynamic";

const BASE = "https://pumpboard.dev";
const MORE_STORIES = 3;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { preview } = await searchParams;
  const story = await getStory((await params).slug, preview);
  if (!story) return { title: "Journal | PumpBoard" };
  const title = `${story.title} | PumpBoard`;
  // The share image itself comes from ./opengraph-image.tsx
  return {
    title,
    description: story.excerpt,
    // A draft opened with its preview link must never be indexed
    ...(!story.published && { robots: { index: false, follow: false } }),
    openGraph: {
      title,
      description: story.excerpt,
      type: "article",
      url: `${BASE}/journal/${story.slug}`,
      ...(story.date && { publishedTime: story.date }),
      ...(story.kind === "spotlight" && story.github && { authors: [`https://github.com/${story.github}`] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: story.excerpt,
    },
  };
}

function formatDate(date: string): string {
  if (!date) return "";
  // Dates are stored as YYYY-MM-DD; read them as UTC so the day never shifts
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Uploaded covers are backend-relative; crawlers need an absolute URL
function absoluteUrl(url: string): string {
  return url.startsWith("/") ? `${BASE}${url}` : url;
}

// A line of just ![alt](url) in the body is an image; only web and upload URLs
const IMAGE_LINE = /^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/;

/** Plain text from the admin: blank lines split paragraphs, "## " starts a
 * subheading and ![alt](url) on its own line is an image. React escapes the
 * text, so no HTML runs. */
function renderBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block, i) => {
      const image = block.match(IMAGE_LINE);
      if (image) {
        const [, alt, src] = image;
        return [
          <figure key={i}>
            {/* Body images come in any size, so they keep their own ratio */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveImageUrl(src)} alt={alt} loading="lazy" />
            {alt && <figcaption>{alt}</figcaption>}
          </figure>,
        ];
      }
      if (!block.startsWith("## ")) return [<p key={i}>{block}</p>];
      // A heading may run straight into its paragraph without a blank line
      const [heading, ...rest] = block.split("\n");
      return [
        <h2 key={`${i}h`}>{heading.slice(3)}</h2>,
        ...(rest.length ? [<p key={i}>{rest.join("\n").trim()}</p>] : []),
      ];
    });
}

export default async function StoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const [story, stories] = await Promise.all([getStory(slug, preview), getStories()]);
  if (story === undefined) notFound();

  const moreStories = (stories ?? []).filter((s) => s.slug !== slug).slice(0, MORE_STORIES);
  const author = story ? storyAuthor(story) : null;

  const jsonLd = story && {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: story.title,
    description: story.excerpt,
    ...(story.date && { datePublished: story.date }),
    ...(story.image && { image: absoluteUrl(story.image) }),
    url: `${BASE}/journal/${story.slug}`,
    author: author?.handle
      ? { "@type": "Person", name: author.name, url: `https://github.com/${author.handle}` }
      : story.author_name
        ? { "@type": "Person", name: story.author_name }
        : { "@id": `${BASE}/#org` },
    publisher: { "@id": `${BASE}/#org` },
  };

  return (
    <>
      {jsonLd && story?.published && (
        <script
          type="application/ld+json"
          // Escape "<" so a title containing </script> can't end the tag early
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      )}
      <Navbar />
      {story && <ReadingProgress targetId="story-article" />}
      <main className={legal.legalPage}>
        <div className="container">
          <div className={styles.article}>
            <Link href="/journal" className={legal.backLink}>← All posts</Link>
          </div>

          {story === null ? (
            <p className={styles.empty}>Couldn&apos;t load this post right now. Try again in a moment.</p>
          ) : (
            <article id="story-article" className={styles.article}>
              {!story.published && (
                <p className={styles.previewNotice}>
                  Draft preview. Only people with this link can see it until it&apos;s published.
                </p>
              )}
              <h1 className={styles.articleTitle}>{story.title}</h1>
              {story.excerpt && <p className={styles.articleExcerpt}>{story.excerpt}</p>}

              <div className={styles.storyMeta}>
                <div className={styles.author}>
                  <StoryAvatar story={story} />
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>{author?.name}</span>
                    {/* The developer the post is about: the author, or named here when the team wrote it */}
                    {story.github && (
                      <span className={styles.authorMeta}>
                        <a href={`https://github.com/${story.github}`} target="_blank" rel="noopener noreferrer">
                          {author?.handle ? "" : "About "}@{story.github}
                        </a>
                        {story.repo && (
                          <a
                            href={story.repo_url || `https://github.com/${story.repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {story.repo}
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <span className={styles.stats}>
                  {story.date && <span>{formatDate(story.date)}</span>}
                  <StoryStats story={story} />
                </span>
              </div>

              {story.x_url && (
                <a href={story.x_url} target="_blank" rel="noopener noreferrer" className={`btn-secondary ${styles.xLink}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  View on X
                </a>
              )}

              {/* Only real covers here; the generated one is for cards */}
              {story.image && (
                <div className={`${styles.coverWrap} ${styles.storyCover}`}>
                  <StoryCover story={story} />
                </div>
              )}

              <section className={styles.storyBody}>{renderBody(story.body)}</section>
            </article>
          )}

          {moreStories.length > 0 && (
            <section className={styles.moreStories}>
              <h2 className={styles.moreTitle}>More from the Journal</h2>
              <div className={styles.grid}>
                {moreStories.map((s) => (
                  <StoryCard key={s.slug} story={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
