const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Uploaded avatars are stored as backend-relative paths (/uploads/...),
// which only resolve when the API shares the frontend's origin. Prefix
// them with the API base so they work in local dev and split deployments.
export function resolveImageUrl(url: string): string {
  return url.startsWith("/") ? `${API_URL}${url}` : url;
}
