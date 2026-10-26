"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./JournalBanner.module.css";
import type { Story } from "../types";

const MAX_POSTS = 3;
const ROTATE_MS = 6000;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The newest Journal posts, rotating in a slim band under the hero; renders nothing until one is published. */
export default function JournalBanner({
  stories,
}: {
  stories: Pick<Story, "slug" | "title">[] | null;
}) {
  // Stories arrive newest first
  const posts = (stories ?? []).slice(0, MAX_POSTS);
  const [index, setIndex] = useState(0);
  // Hover and keyboard focus pause separately, so leaving with the mouse
  // doesn't restart rotation under a keyboard user
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;

  useEffect(() => {
    if (paused || posts.length < 2 || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % posts.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, posts.length]);

  if (posts.length === 0) return null;
  const current = posts[index % posts.length];

  return (
    <section className={styles.band} aria-label="New Journal updates">
      <div className="container">
        <div
          className={`glass-card ${styles.banner}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
          }}
        >
          <Link href={`/journal/${current.slug}`} className={styles.link}>
            <span className={styles.dot} aria-hidden="true" />
            <span key={current.slug} className={styles.text}>
              <span className={styles.label}>New Journal update</span>
              <span className={styles.title}>{current.title}</span>
            </span>
            <span className={styles.readMore}>Read post →</span>
          </Link>
          {posts.length > 1 && (
            <div className={styles.pager}>
              {posts.map((post, i) => (
                <button
                  key={post.slug}
                  type="button"
                  className={`${styles.pagerDot} ${i === index % posts.length ? styles.pagerDotActive : ""}`}
                  aria-label={`Show post ${i + 1} of ${posts.length}: ${post.title}`}
                  aria-current={i === index % posts.length}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
