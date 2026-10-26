import type { Story, StoryKind } from "../types";
import { resolveImageUrl } from "../utils";

export const KIND_LABELS: Record<StoryKind, string> = {
  milestone: "Milestone",
  spotlight: "Spotlight",
  update: "Update",
};

export const TEAM_NAME = "PumpBoard Team";
const TEAM_AVATAR = "/team-avatar.png";

/** Who a post is by: the admin named on it, else a spotlight's developer
 * (their own words), else the team. */
export function storyAuthor(story: Story): { name: string; avatar: string; handle: string } {
  if (!story.author_name && story.kind === "spotlight" && story.github) {
    return {
      name: story.name || story.github,
      avatar: story.avatar_url ? resolveImageUrl(story.avatar_url) : "",
      handle: story.github,
    };
  }
  const name = story.author_name || TEAM_NAME;
  // Posts by the team carry the logo; a named admin without a photo gets initials
  const fallback = name === TEAM_NAME ? TEAM_AVATAR : "";
  return {
    name,
    avatar: story.author_avatar ? resolveImageUrl(story.author_avatar) : fallback,
    handle: "",
  };
}
