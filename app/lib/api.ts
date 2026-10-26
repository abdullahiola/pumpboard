/** Server-side data fetching for SSR/ISR pages.
 *
 * Runs on the Next.js server, so the fetched data is baked into the HTML
 * and visible to crawlers and AI fetchers that don't execute JavaScript.
 * Returns null on failure so client components can fall back to fetching
 * in the browser.
 */

import type { Developer, PlatformStats, Story } from "../types";

// Inside docker-compose the frontend reaches the backend via the service
// name; NEXT_PUBLIC_API_URL covers local dev (.env.local).
const API_BASE =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

/** Absolute URL for a backend-relative asset such as an uploaded cover, for server-side use. */
export function apiAssetUrl(url: string): string {
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

// Story and profile edits clear these sooner: the backend calls
// /api/revalidate with both tags after each change
const REVALIDATE_SECONDS = 3600;

export async function getDevelopers(): Promise<Developer[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/developers`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["developers"] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getStats(): Promise<PlatformStats | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stats`, {
      // Stats are derived from the developer list, so they clear with it
      next: { revalidate: REVALIDATE_SECONDS, tags: ["developers"] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getStories(): Promise<Story[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/stories`, {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["stories"] },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Resolves to undefined when the story doesn't exist, null when the API failed.
 * A preview token also returns the draft, uncached so edits show on reload. */
export async function getStory(slug: string, preview = ""): Promise<Story | null | undefined> {
  const url = `${API_BASE}/api/stories/${encodeURIComponent(slug)}`;
  try {
    const res = preview
      ? await fetch(`${url}?preview=${encodeURIComponent(preview)}`, { cache: "no-store" })
      : await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: ["stories"] } });
    if (res.status === 404) return undefined;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
