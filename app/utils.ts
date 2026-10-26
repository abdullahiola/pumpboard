const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Uploaded avatars are stored as backend-relative paths (/uploads/...),
// which only resolve when the API shares the frontend's origin. Prefix
// them with the API base so they work in local dev and split deployments.
export function resolveImageUrl(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}

// Average adult reading speed; rounded up so a short story still reads "1 min"
const WORDS_PER_MINUTE = 200;

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min read`;
}

export function formatViews(views: number): string {
  const count = new Intl.NumberFormat("en-US", { notation: "compact" }).format(views);
  return `${count} ${views === 1 ? "view" : "views"}`;
}
