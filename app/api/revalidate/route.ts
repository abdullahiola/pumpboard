import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only the tags lib/api.ts sets; anything else in the body is ignored
const ALLOWED_TAGS = ["stories", "developers"];

/** Called by the backend after a story changes, so the site shows it on the next load. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ error: "Invalid revalidate secret" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const tags: string[] = Array.isArray(body.tags) ? body.tags : [];
  const revalidated = tags.filter((t) => ALLOWED_TAGS.includes(t));
  // Expire immediately: the backend is an external caller, so stale-while-
  // revalidate ("max") would still serve the old data on the next request
  revalidated.forEach((tag) => revalidateTag(tag, { expire: 0 }));

  return NextResponse.json({ revalidated });
}
