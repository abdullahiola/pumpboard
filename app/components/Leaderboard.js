"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Leaderboard.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function formatUSD(amount) {
  if (!amount) return "$0";
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

const medalEmoji = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_URL}/api/developers`);
        const data = await res.json();
        const sorted = data
          .filter((d) => d.totalClaimed > 0)
          .sort((a, b) => b.totalClaimed - a.totalClaimed);
        setDevelopers(sorted);
      } catch {
        setDevelopers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h2 className={styles.title}>Leaderboard</h2>
            <p className={styles.subtitle}>Loading rankings...</p>
          </div>
          <div className={styles.skeleton}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonRow} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (developers.length === 0) return null;

  return (
    <section className={styles.section} id="leaderboard">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              Leaderboard
            </h2>
            <span className={styles.badge}>{developers.length} ranked</span>
          </div>
          <p className={styles.subtitle}>
            Top developers and creators by total claimed rewards
          </p>
        </div>

        {/* Top 3 Podium */}
        {developers.length >= 3 && (
          <div className={styles.podium}>
            {[developers[1], developers[0], developers[2]].map((dev, i) => {
              const rank = [2, 1, 3][i];
              return (
                <div
                  key={dev.github || dev.name}
                  className={`${styles.podiumCard} ${styles[`podium${rank}`]}`}
                >
                  <span className={styles.podiumMedal}>{medalEmoji[rank]}</span>
                  <div className={styles.podiumAvatar}>
                    {dev.avatar_url ? (
                      <Image
                        src={dev.avatar_url}
                        alt={dev.name || dev.github}
                        width={rank === 1 ? 64 : 48}
                        height={rank === 1 ? 64 : 48}
                        className={styles.podiumImg}
                      />
                    ) : (
                      <div className={`${styles.podiumInitials} ${rank === 1 ? styles.podiumInitialsLg : ""}`}>
                        {(dev.name || dev.github || "??").substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className={styles.podiumName}>
                    {dev.name || dev.github}
                  </span>
                  <span className={styles.podiumType}>
                    {dev.type === "creator" ? "Creator" : "Developer"}
                  </span>
                  <span className={styles.podiumAmount}>
                    {formatUSD(dev.totalClaimed)}
                  </span>
                  <span className={styles.podiumSol}>
                    {dev.solAmount} SOL
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Full Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thRank}>#</th>
                <th>Profile</th>
                <th>Type</th>
                <th className={styles.thRight}>Claimed</th>
                <th className={styles.thRight}>SOL</th>
              </tr>
            </thead>
            <tbody>
              {developers.map((dev, index) => (
                <tr
                  key={dev.github || dev.name}
                  className={index < 3 ? styles.topRow : ""}
                >
                  <td className={styles.rank}>
                    {index < 3 ? (
                      <span className={styles.medalCell}>{medalEmoji[index + 1]}</span>
                    ) : (
                      <span className={styles.rankNum}>{index + 1}</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.profileCell}>
                      {dev.avatar_url ? (
                        <Image
                          src={dev.avatar_url}
                          alt={dev.name || dev.github}
                          width={28}
                          height={28}
                          className={styles.tableAvatar}
                        />
                      ) : (
                        <div className={styles.tableInitials}>
                          {(dev.name || dev.github || "??").substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className={styles.profileInfo}>
                        <span className={styles.profileName}>
                          {dev.name || dev.github}
                        </span>
                        {dev.github && (
                          <span className={styles.profileHandle}>@{dev.github}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.typePill} ${styles[dev.type]}`}>
                      {dev.type}
                    </span>
                  </td>
                  <td className={styles.amountCell}>
                    {formatUSD(dev.totalClaimed)}
                  </td>
                  <td className={styles.solCell}>
                    {dev.solAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
