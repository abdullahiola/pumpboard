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
}

/** Platform-wide metrics returned by `GET /api/stats`. */
export interface PlatformStats {
  totalDonated: number;
  developers: number;
  transactions: number;
  activeProjects: number;
}
