"use client";

import { useState } from "react";
import styles from "./DeveloperCards.module.css";

const developers = [
  {
    id: 1,
    name: "Alex Rivera",
    github: "alexrivera",
    avatar: null,
    initials: "AR",
    bio: "Full-stack Solana developer. Building DeFi primitives and open-source tooling for the Solana ecosystem.",
    repos: 47,
    contributions: 1289,
    totalClaimed: 18450,
    currency: "SOL",
    solAmount: 124.5,
    tags: ["Rust", "Solana", "DeFi"],
    status: "active",
    claimedAt: "2 hours ago",
    rank: 1,
  },
  {
    id: 2,
    name: "Sarah Chen",
    github: "sarahchen",
    avatar: null,
    initials: "SC",
    bio: "Smart contract auditor and security researcher. Focused on making Web3 safer for everyone.",
    repos: 32,
    contributions: 856,
    totalClaimed: 14200,
    currency: "SOL",
    solAmount: 96.2,
    tags: ["Security", "Audit", "Rust"],
    status: "active",
    claimedAt: "5 hours ago",
    rank: 2,
  },
  {
    id: 3,
    name: "Marcus Johnson",
    github: "marcusj",
    avatar: null,
    initials: "MJ",
    bio: "Frontend architect specializing in Web3 UX. Making crypto accessible through beautiful interfaces.",
    repos: 64,
    contributions: 2103,
    totalClaimed: 12800,
    currency: "SOL",
    solAmount: 86.7,
    tags: ["React", "TypeScript", "UI/UX"],
    status: "active",
    claimedAt: "1 day ago",
    rank: 3,
  },
  {
    id: 4,
    name: "Yuki Tanaka",
    github: "yukitanaka",
    avatar: null,
    initials: "YT",
    bio: "Protocol engineer building cross-chain bridges. Previously at Wormhole and Jump Crypto.",
    repos: 23,
    contributions: 674,
    totalClaimed: 9750,
    currency: "SOL",
    solAmount: 65.8,
    tags: ["Bridge", "Cross-chain", "Go"],
    status: "active",
    claimedAt: "3 days ago",
    rank: 4,
  },
  {
    id: 5,
    name: "Priya Patel",
    github: "priyapatel",
    avatar: null,
    initials: "PP",
    bio: "DevOps and infrastructure for decentralized apps. Kubernetes, CI/CD, and validator operations.",
    repos: 38,
    contributions: 945,
    totalClaimed: 7600,
    currency: "SOL",
    solAmount: 51.3,
    tags: ["DevOps", "Infra", "Python"],
    status: "active",
    claimedAt: "1 week ago",
    rank: 5,
  },
  {
    id: 6,
    name: "Daniel Osei",
    github: "danielosei",
    avatar: null,
    initials: "DO",
    bio: "Smart contract developer and educator. Building open-source learning resources for Solana devs.",
    repos: 55,
    contributions: 1567,
    totalClaimed: 6200,
    currency: "SOL",
    solAmount: 41.9,
    tags: ["Education", "Anchor", "Docs"],
    status: "active",
    claimedAt: "2 weeks ago",
    rank: 6,
  },
];

function formatUSD(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

const rankColors = {
  1: { bg: "linear-gradient(135deg, #FFD700, #FFA500)", text: "#000" },
  2: { bg: "linear-gradient(135deg, #C0C0C0, #A0A0A0)", text: "#000" },
  3: { bg: "linear-gradient(135deg, #CD7F32, #A0522D)", text: "#fff" },
};

export default function DeveloperCards() {
  const [filter, setFilter] = useState("all");

  const sortedDevs = [...developers].sort((a, b) => b.totalClaimed - a.totalClaimed);

  return (
    <section className={`section ${styles.developers}`} id="developers">
      <div className={styles.bgGlow}></div>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Developers
          </span>
          <h2 className="section-title">Onboarded Developers</h2>
          <p className="section-subtitle">
            Meet the builders who have been onboarded to PumpBoard. See their
            contributions and how much they&apos;ve claimed through decentralized
            donations.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterBar}>
          {["all", "Rust", "React", "Security", "Solana"].map((tag) => (
            <button
              key={tag}
              className={`${styles.filterBtn} ${filter === tag ? styles.filterActive : ""}`}
              onClick={() => setFilter(tag)}
            >
              {tag === "all" ? "All Developers" : tag}
            </button>
          ))}
        </div>

        {/* Leaderboard Summary */}
        <div className={styles.leaderboard}>
          {sortedDevs.slice(0, 3).map((dev, idx) => (
            <div key={dev.id} className={`${styles.leaderItem} ${styles[`leader${idx + 1}`]}`}>
              <div
                className={styles.leaderRank}
                style={{ background: rankColors[idx + 1]?.bg, color: rankColors[idx + 1]?.text }}
              >
                #{idx + 1}
              </div>
              <div className={styles.leaderAvatar}>
                <span>{dev.initials}</span>
              </div>
              <div className={styles.leaderInfo}>
                <span className={styles.leaderName}>{dev.name}</span>
                <span className={styles.leaderAmount}>
                  {formatUSD(dev.totalClaimed)} claimed
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Developer Cards Grid */}
        <div className={styles.grid}>
          {sortedDevs
            .filter(
              (dev) =>
                filter === "all" ||
                dev.tags.some((t) =>
                  t.toLowerCase().includes(filter.toLowerCase())
                )
            )
            .map((dev, index) => (
              <div
                key={dev.id}
                className={`glass-card ${styles.devCard}`}
              >
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.avatarWrap}>
                    <div className={styles.avatar}>
                      <span>{dev.initials}</span>
                    </div>
                    <div className={styles.statusDot}></div>
                  </div>
                  <div className={styles.headerInfo}>
                    <h3 className={styles.devName}>{dev.name}</h3>
                    <a
                      className={styles.githubLink}
                      href={`https://github.com/${dev.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      @{dev.github}
                    </a>
                  </div>
                  {dev.rank <= 3 && (
                    <div
                      className={styles.rankBadge}
                      style={{ background: rankColors[dev.rank]?.bg, color: rankColors[dev.rank]?.text }}
                    >
                      #{dev.rank}
                    </div>
                  )}
                </div>

                {/* Bio */}
                <p className={styles.devBio}>{dev.bio}</p>

                {/* Tags */}
                <div className={styles.tags}>
                  {dev.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats Row */}
                <div className={styles.statsRow}>
                  <div className={styles.stat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>{dev.repos} repos</span>
                  </div>
                  <div className={styles.stat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>{dev.contributions.toLocaleString()} commits</span>
                  </div>
                </div>

                {/* Claimed Section */}
                <div className={styles.claimedSection}>
                  <div className={styles.claimedHeader}>
                    <span className={styles.claimedLabel}>Total Claimed</span>
                    <span className={styles.claimedTime}>{dev.claimedAt}</span>
                  </div>
                  <div className={styles.claimedAmount}>
                    <span className={styles.amountUsd}>{formatUSD(dev.totalClaimed)}</span>
                    <span className={styles.amountSol}>{dev.solAmount} SOL</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${(dev.totalClaimed / 20000) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.cardActions}>
                  <button className={`btn-primary btn-sm ${styles.donateBtn}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Donate
                  </button>
                  <button className={`btn-secondary btn-sm ${styles.profileBtn}`}>
                    View Profile
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Load More */}
        <div className={styles.loadMore}>
          <button className="btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Load More Developers
          </button>
        </div>
      </div>
    </section>
  );
}
