import { ImageResponse } from "next/og";
import { apiAssetUrl, getStory } from "../../lib/api";
import { KIND_LABELS, storyAuthor } from "../story";

// Share card for X, Telegram and the like. CSS variables don't reach the
// image renderer, so these are the dark theme's values from globals.css
const BG = "#0e1011"; // --pb-bg-primary
const ACCENT = "#2fbe98"; // --pb-accent
const PRIMARY = "#0b7d61"; // --pb-primary
const TEXT = "#e9ecee"; // --pb-text-primary
const TEXT_SECONDARY = "#a1aaaf"; // --pb-text-secondary

export const alt = "A post from the PumpBoard Journal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og can't decode WebP, and a dead link fails the whole image, so
// images are fetched here and only formats it renders are passed through
const RENDERABLE_TYPES = ["image/png", "image/jpeg", "image/gif"];

async function loadImage(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(apiAssetUrl(url));
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !RENDERABLE_TYPES.includes(type)) return null;
    const data = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${type};base64,${data}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const story = await getStory((await params).slug);
  const title = story?.title || "Journal";
  const name = story ? storyAuthor(story).name : "PumpBoard";
  const label = story ? `PumpBoard ${KIND_LABELS[story.kind]}` : "PumpBoard Journal";
  // A milestone without a cover leads with its number instead
  const stat = !story?.image && story?.kind === "milestone" ? story.stat : "";
  const [cover, avatar] = await Promise.all([
    loadImage(story?.image),
    // Same person storyAuthor names; the team logo is a frontend file, so it's left out
    loadImage(story && !story.author_name && story.kind === "spotlight" ? story.avatar_url : story?.author_avatar),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(135deg, ${BG} 40%, ${PRIMARY})`,
          fontFamily: "sans-serif",
        }}
      >
        {cover && (
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {/* Darken the lower part so the title reads over any cover */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `linear-gradient(to bottom, rgba(14,16,17,0.15), rgba(14,16,17,0.92) 70%)`,
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            width: "100%",
            padding: "64px 72px",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: ACCENT }}>
            {label}
          </div>
          {stat && (
            <div style={{ display: "flex", fontSize: 120, fontWeight: 800, lineHeight: 1, color: ACCENT }}>
              {stat}
            </div>
          )}
          {/* Long titles step down so they never push the label off the top */}
          <div
            style={{
              display: "flex",
              fontSize: title.length > 70 ? 48 : 64,
              fontWeight: 700,
              lineHeight: 1.15,
              color: TEXT,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {avatar && (
              <img
                src={avatar}
                alt=""
                width={56}
                height={56}
                style={{ borderRadius: 28 }}
              />
            )}
            <div style={{ display: "flex", fontSize: 30, color: TEXT_SECONDARY }}>{name}</div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
