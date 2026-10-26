/** Shared data models for the PumpBoard frontend. */

/** A developer or creator profile returned by `GET /api/developers`. */
export interface Developer {
  github: string;
  name?: string;
  type: "developer" | "creator";
  totalClaimed: number;
  solAmount: number | string;
  tags: string[];
  languages?: string[];
  repo?: string;
  repo_url?: string;
  stars?: number;
  followers?: number;
  public_repos?: number;
  avatar_url?: string;
  bio?: string;
  summary?: string;
  website?: string;
  instagram?: string;
  tiktok?: string;
  x?: string;
  /** The repo's logo for the Active Projects list; "" uses the repo owner's GitHub avatar. */
  project_icon?: string;
  /** Slug of the newest published story about this developer, "" if none. */
  story_slug?: string;
}

/** Platform-wide metrics returned by `GET /api/stats`. */
export interface PlatformStats {
  totalDonated: number;
  developers: number;
  transactions: number;
  activeProjects: number;
  /** Human page views of the site, bots excluded. */
  siteVisits: number;
}

/** What a Journal post is about; spotlights are about one listed developer. */
export type StoryKind = "milestone" | "spotlight" | "update";

/** A Journal post returned by `GET /api/stories`. */
export interface Story {
  slug: string;
  kind: StoryKind;
  /** The developer a spotlight is about; "" for posts not about one developer. */
  github: string;
  title: string;
  excerpt: string;
  body: string;
  image?: string;
  /** Milestones: the headline number, e.g. "$200K+". */
  stat?: string;
  /** The post's announcement on X. */
  x_url?: string;
  /** The admin who wrote the post; spotlights fall back to the developer. */
  author_name?: string;
  author_avatar?: string;
  published: boolean;
  /** Takes the big slot at the top of /journal instead of the newest post. */
  pinned?: boolean;
  date: string;
  name?: string;
  avatar_url?: string;
  repo?: string;
  repo_url?: string;
  /** Human page views of the story, bots excluded. */
  views: number;
}
