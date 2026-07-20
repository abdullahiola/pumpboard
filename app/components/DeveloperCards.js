"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./DeveloperCards.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function formatUSD(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatStars(count) {
  if (!count) return "0";
  if (count >= 1000) return (count / 1000).toFixed(2) + "k";
  return count.toString();
}

const rankColors = {
  1: { bg: "linear-gradient(135deg, #FFD700, #FFA500)", text: "#000" },
  2: { bg: "linear-gradient(135deg, #C0C0C0, #A0A0A0)", text: "#000" },
  3: { bg: "linear-gradient(135deg, #CD7F32, #A0522D)", text: "#fff" },
};

export default function DeveloperCards() {
  const [filter, setFilter] = useState("developer");
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [solPrice, setSolPrice] = useState(null);

  useEffect(() => {
    async function fetchDevelopers() {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/developers`);
        if (!res.ok) throw new Error("Failed to fetch developers");
        const data = await res.json();
        setDevelopers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDevelopers();
  }, []);

  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => setSolPrice(data.solana?.usd || null))
      .catch(() => {});
  }, []);

  function usdToSol(usd) {
    if (!solPrice || !usd) return null;
    return (usd / solPrice).toFixed(2);
  }

  const sortedDevs = [...developers].sort((a, b) => b.totalClaimed - a.totalClaimed);

  const filteredDevs = sortedDevs.filter(
    (dev) => filter === "all" || dev.type === filter
  );

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
          {[
            { key: "all", label: "All" },
            { key: "developer", label: "Developers" },
            { key: "creator", label: "Creators" },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`${styles.filterBtn} ${filter === tab.key ? styles.filterActive : ""}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`glass-card ${styles.skeletonCard}`}>
                <div className={styles.skeletonAvatar}></div>
                <div className={styles.skeletonLine} style={{ width: "60%" }}></div>
                <div className={styles.skeletonLine} style={{ width: "80%" }}></div>
                <div className={styles.skeletonLine} style={{ width: "40%" }}></div>
              </div>
            ))}
          </div>
        )}


        {/* Leaderboard Summary */}
        {!loading && !error && (
          <div className={styles.leaderboard}>
            {sortedDevs.slice(0, 3).map((dev, idx) => (
              <div key={dev.github} className={`${styles.leaderItem} ${styles[`leader${idx + 1}`]}`}>
                <div
                  className={styles.leaderRank}
                  style={{ background: rankColors[idx + 1]?.bg, color: rankColors[idx + 1]?.text }}
                >
                  #{idx + 1}
                </div>
                <div className={styles.leaderAvatar}>
                  {dev.avatar_url ? (
                    <Image
                      src={dev.avatar_url}
                      alt={dev.name || dev.github}
                      width={32}
                      height={32}
                      className={styles.leaderAvatarImg}
                    />
                  ) : (
                    <span>{dev.github.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.leaderInfo}>
                  <span className={styles.leaderName}>{dev.name || dev.github}</span>
                  <span className={styles.leaderAmount}>
                    {formatUSD(dev.totalClaimed)} claimed
                    {usdToSol(dev.totalClaimed) && (
                      <> · {usdToSol(dev.totalClaimed)} SOL</>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Developer Cards Grid */}
        {!loading && !error && (
          <div className={styles.grid}>
            {filteredDevs.slice(0, 5).map((dev, index) => (
              <div
                key={dev.github || dev.name}
                className={`glass-card ${styles.devCard}`}
              >
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.avatarWrap}>
                    <div className={styles.avatar}>
                      {dev.avatar_url ? (
                        <Image
                          src={dev.avatar_url}
                          alt={dev.name || dev.github}
                          width={48}
                          height={48}
                          className={styles.avatarImg}
                        />
                      ) : (
                        <span>{(dev.name || dev.github || "??").substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.statusDot}></div>
                  </div>
                  <div className={styles.headerInfo}>
                    <h3 className={styles.devName}>{dev.name || dev.github}</h3>
                    {dev.type === "creator" ? (
                      <div className={styles.socialLinks}>
                        {dev.instagram && (
                          <a
                            className={styles.socialLink}
                            href={`https://instagram.com/${dev.instagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`@${dev.instagram}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                          </a>
                        )}
                        {dev.tiktok && (
                          <a
                            className={styles.socialLink}
                            href={`https://tiktok.com/@${dev.tiktok}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`@${dev.tiktok}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.26 8.26 0 0 0 4.85 1.56V6.84a4.85 4.85 0 0 1-1.09-.15z" />
                            </svg>
                          </a>
                        )}
                        {dev.x && (
                          <a
                            className={styles.socialLink}
                            href={`https://x.com/${dev.x}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`@${dev.x}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className={styles.socialLinks}>
                        <a
                          className={styles.githubLink}
                          href={`https://github.com/${dev.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        </a>
                        {dev.x && (
                          <a
                            className={styles.socialLink}
                            href={`https://x.com/${dev.x}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`@${dev.x}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {index < 3 && (
                    <div
                      className={styles.rankBadge}
                      style={{ background: rankColors[index + 1]?.bg, color: rankColors[index + 1]?.text }}
                    >
                      #{index + 1}
                    </div>
                  )}
                </div>

                {/* Bio */}
                {dev.bio && <p className={styles.devBio}>{dev.bio}</p>}

                {/* Tags — use languages from GitHub, fall back to stored tags */}
                <div className={styles.tags}>
                  {(dev.languages?.length > 0 ? dev.languages : dev.tags).map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Repo + Stars Row */}
                {dev.repo_url && (
                  <a
                    className={styles.repoRow}
                    href={dev.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className={styles.repoName}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                      </svg>
                      <span>{dev.repo ? dev.repo.split("/")[1] : "Repository"}</span>
                    </div>
                    <div className={styles.starBadge}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>{formatStars(dev.stars)}</span>
                    </div>
                  </a>
                )}

                {/* Claimed Section */}
                <div className={styles.claimedSection}>
                  <div className={styles.claimedHeader}>
                    <span className={styles.claimedLabel}>Total Claimed</span>
                  </div>
                  <div className={styles.claimedAmount}>
                    <span className={styles.amountUsd}>{formatUSD(dev.totalClaimed)}</span>
                    <span className={styles.amountSol}>
                      {usdToSol(dev.totalClaimed)
                        ? `${usdToSol(dev.totalClaimed)} SOL`
                        : `${dev.solAmount} SOL`}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
