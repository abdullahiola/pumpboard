import { getStories } from "../../lib/api";
import { storyAuthor } from "../story";

const BASE = "https://pumpboard.dev";

// Built per request from the cached stories fetch, like the pages
export const dynamic = "force-dynamic";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of published Journal posts, newest first. */
export async function GET() {
  const stories = (await getStories()) ?? [];

  const items = stories
    .map((s) => {
      const url = `${BASE}/journal/${s.slug}`;
      return `    <item>
      <title>${escapeXml(s.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(s.excerpt)}</description>
      <dc:creator>${escapeXml(storyAuthor(s).name)}</dc:creator>
      ${s.date ? `<pubDate>${new Date(`${s.date}T00:00:00Z`).toUTCString()}</pubDate>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>PumpBoard Journal</title>
    <link>${BASE}/journal</link>
    <atom:link href="${BASE}/journal/rss.xml" rel="self" type="application/rss+xml" />
    <description>Milestones, developer spotlights and updates from the PumpBoard team.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
