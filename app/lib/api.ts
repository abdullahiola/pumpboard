/** Server-side data fetching for SSR/ISR pages.
 *
 * Runs on the Next.js server, so the fetched data is baked into the HTML
 * and visible to crawlers and AI fetchers that don't execute JavaScript.
 * Returns null on failure so client components can fall back to fetching
 * in the browser.
 */

import type { Developer, PlatformStats } from "../types";

// Inside docker-compose the frontend reaches the backend via the service
// name; NEXT_PUBLIC_API_URL covers local dev (.env.local).
const API_BASE =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

const REVALIDATE_SECONDS = 3600;

export async function getDevelopers(): Promise<Developer[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/developers`, {
      next: { revalidate: REVALIDATE_SECONDS },
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
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
