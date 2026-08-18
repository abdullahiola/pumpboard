"use client";

import { useState, useEffect, useMemo } from "react";
import type { ElementType } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import styles from "./leaderboard.module.css";
import type { Developer } from "../types";
import { resolveImageUrl } from "../utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

type FilterKey = "all" | "developer" | "creator";
type SortKey = "totalClaimed" | "solAmount";
type SortDir = "asc" | "desc";

function formatUSD(amount: number): string {
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

const medalEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  if (sortKey !== column) return <span className={styles.sortIcon}>⇅</span>;
  return (
    <span className={styles.sortIconActive}>
      {sortDir === "desc" ? "↓" : "↑"}
    </span>
  );
}

export default function LeaderboardClient({
  initialDevelopers = null,
}: {
  initialDevelopers?: Developer[] | null;
}) {
  const [developers, setDevelopers] = useState<Developer[]>(
    initialDevelopers ? initialDevelopers.filter((d) => d.totalClaimed > 0) : []
  );
  const [loading, setLoading] = useState(initialDevelopers === null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalClaimed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fallback: only fetch in the browser when the server render had no data
  useEffect(() => {
    if (initialDevelopers !== null) return;
    async function fetchData() {
      try {
        const res = await fetch(`${API_URL}/api/developers`);
        const data: Developer[] = await res.json();
        setDevelopers(data.filter((d) => d.totalClaimed > 0));
      } catch {
        setDevelopers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [initialDevelopers]);

  // Fetch live SOL price
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => setSolPrice(data.solana?.usd || null))
      .catch(() => {});
  }, []);

  function usdToSol(usd: number): string | null {
    if (!solPrice || !usd) return null;
    return (usd / solPrice).toFixed(2);
  }

  const sorted = useMemo(() => {
    let list = [...developers];

    if (filter !== "all") {
      list = list.filter((d) => d.type === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.github || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      const aVal = Number(a[sortKey]) || 0;
      const bVal = Number(b[sortKey]) || 0;
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });

    return list;
  }, [developers, filter, search, sortKey, sortDir]);

  const top3 = useMemo(() => {
    return [...developers]
      .sort((a, b) => b.totalClaimed - a.totalClaimed)
      .slice(0, 3);
  }, [developers]);

  const totalPool = useMemo(
    () => developers.reduce((s, d) => s + (d.totalClaimed || 0), 0),
    [developers]
  );

  const totalSol = useMemo(() => {
    if (solPrice) {
      return developers.reduce((s, d) => s + (d.totalClaimed || 0), 0) / solPrice;
    }
    return developers.reduce((s, d) => s + (Number(d.solAmount) || 0), 0);
  }, [developers, solPrice]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.container}>
          {/* Page header */}
          <header className={styles.pageHeader}>
            <Link href="/" className={styles.backLink}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to Home
            </Link>
            <div className={styles.headerContent}>
              <h1 className={styles.pageTitle}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Leaderboard
              </h1>
              <p className={styles.pageSubtitle}>
                Top developers and creators ranked by total claimed rewards on PumpBoard
              </p>
            </div>

            {/* Summary stats */}
            <div className={styles.summaryBar}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>
                  {loading ? "—" : developers.length}
                </span>
                <span className={styles.summaryLabel}>Ranked</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>
                  {loading ? "—" : formatUSD(totalPool)}
                </span>
                <span className={styles.summaryLabel}>Total Pool</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>
                  {loading ? "—" : totalSol.toFixed(2)}
                </span>
                <span className={styles.summaryLabel}>SOL Claimed</span>
              </div>
            </div>
          </header>

          {/* Loading */}
          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.podiumSkeleton}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.podiumSkeletonCard} />
                ))}
              </div>
              <div className={styles.tableSkeleton}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className={styles.skeletonRow} />
                ))}
              </div>
            </div>
          )}

          {!loading && (
            <>
              {/* Top 3 Podium */}
              {top3.length >= 3 && (
                <section className={styles.podiumSection}>
                  <h2 className={styles.sectionLabel}>Top Earners</h2>
                  <div className={styles.podium}>
                    {[top3[1], top3[0], top3[2]].map((dev, i) => {
                      const rank = [2, 1, 3][i];
                      return (
                        <div
                          key={dev.github || dev.name}
                          className={`${styles.podiumCard} ${styles[`podium${rank}`]}`}
                        >
                          <div className={styles.podiumRankBadge}>
                            {medalEmoji[rank]}
                          </div>
                          <div className={styles.podiumAvatar}>
                            {dev.avatar_url ? (
                              <Image
                                src={resolveImageUrl(dev.avatar_url)}
                                alt={dev.name || dev.github}
                                width={rank === 1 ? 80 : 56}
                                height={rank === 1 ? 80 : 56}
                                className={styles.podiumImg}
                              />
                            ) : (
                              <div
                                className={`${styles.podiumInitials} ${rank === 1 ? styles.podiumInitialsLg : ""}`}
                              >
                                {(dev.name || dev.github || "??")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className={styles.podiumName}>
                            {dev.name || dev.github}
                          </span>
                          {dev.github && (
                            <span className={styles.podiumHandle}>
                              @{dev.github}
                            </span>
                          )}
                          <span className={styles.podiumType}>
                            {dev.type === "creator" ? "Creator" : "Developer"}
                          </span>
                          <div className={styles.podiumAmountWrap}>
                            <span className={styles.podiumAmount}>
                              {formatUSD(dev.totalClaimed)}
                            </span>
                            <span className={styles.podiumSol}>
                              {usdToSol(dev.totalClaimed)
                                ? `${usdToSol(dev.totalClaimed)} SOL`
                                : `${dev.solAmount} SOL`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Controls */}
              <section className={styles.controlsSection}>
                <div className={styles.filterTabs}>
                  {(
                    [
                      { key: "all", label: "All" },
                      { key: "developer", label: "Developers" },
                      { key: "creator", label: "Creators" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      className={`${styles.filterBtn} ${filter === tab.key ? styles.filterActive : ""}`}
                      onClick={() => setFilter(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className={styles.searchWrap}>
                  <svg
                    className={styles.searchIcon}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search by name or handle..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </section>

              {/* Rankings Table */}
              <section className={styles.tableSection}>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.thRank}>#</th>
                        <th>Profile</th>
                        <th>Type</th>
                        <th
                          className={styles.thSortable}
                          onClick={() => handleSort("totalClaimed")}
                        >
                          Claimed <SortIcon column="totalClaimed" sortKey={sortKey} sortDir={sortDir} />
                        </th>
                        <th
                          className={styles.thSortable}
                          onClick={() => handleSort("solAmount")}
                        >
                          SOL <SortIcon column="solAmount" sortKey={sortKey} sortDir={sortDir} />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((dev) => {
                        const globalRank =
                          [...developers]
                            .sort((a, b) => b.totalClaimed - a.totalClaimed)
                            .findIndex((d) => d.github === dev.github) + 1;

                        return (
                          <tr
                            key={dev.github || dev.name}
                            className={globalRank <= 3 ? styles.topRow : ""}
                          >
                            <td className={styles.rankCell}>
                              {globalRank <= 3 ? (
                                <span className={styles.medalCell}>
                                  {medalEmoji[globalRank]}
                                </span>
                              ) : (
                                <span className={styles.rankNum}>
                                  {globalRank}
                                </span>
                              )}
                            </td>
                            <td>
                              {(() => {
                                const profileUrl = dev.github
                                  ? `https://github.com/${dev.github}`
                                  : dev.website
                                    ? dev.website.startsWith("http")
                                      ? dev.website
                                      : `https://${dev.website}`
                                    : dev.x
                                      ? `https://x.com/${dev.x}`
                                      : null;
                                const Wrapper: ElementType = profileUrl ? "a" : "div";
                                const linkProps = profileUrl
                                  ? {
                                      href: profileUrl,
                                      target: "_blank",
                                      rel: "noopener noreferrer",
                                    }
                                  : {};
                                return (
                                  <Wrapper
                                    className={`${styles.profileCell} ${profileUrl ? styles.profileCellLink : ""}`}
                                    {...linkProps}
                                  >
                                    {dev.avatar_url ? (
                                      <Image
                                        src={resolveImageUrl(dev.avatar_url)}
                                        alt={dev.name || dev.github}
                                        width={36}
                                        height={36}
                                        className={styles.tableAvatar}
                                      />
                                    ) : (
                                      <div className={styles.tableInitials}>
                                        {(dev.name || dev.github || "??")
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                    <div className={styles.profileInfo}>
                                      <span className={styles.profileName}>
                                        {dev.name || dev.github}
                                      </span>
                                      {dev.github && (
                                        <span className={styles.profileHandle}>
                                          @{dev.github}
                                        </span>
                                      )}
                                    </div>
                                  </Wrapper>
                                );
                              })()}
                            </td>
                            <td>
                              <span
                                className={`${styles.typePill} ${styles[dev.type]}`}
                              >
                                {dev.type}
                              </span>
                            </td>
                            <td className={styles.amountCell}>
                              {formatUSD(dev.totalClaimed)}
                            </td>
                            <td className={styles.solCell}>
                              {usdToSol(dev.totalClaimed) || dev.solAmount}
                            </td>
                          </tr>
                        );
                      })}
                      {sorted.length === 0 && (
                        <tr>
                          <td colSpan={5} className={styles.emptyRow}>
                            No results found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className={styles.tableFooter}>
                  <span className={styles.resultCount}>
                    {sorted.length} of {developers.length} ranked
                  </span>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
