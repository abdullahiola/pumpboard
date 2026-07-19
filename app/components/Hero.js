"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Hero.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatShort(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
  return num.toString();
}

export default function Hero() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <section className={styles.hero} id="hero">
      {/* Background Effects */}
      <div className={styles.bgGrid}></div>
      <div className={styles.glowOrb1}></div>
      <div className={styles.glowOrb2}></div>
      <div className={styles.floatingParticles}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`${styles.particle} ${styles[`particle${i + 1}`]}`}></div>
        ))}
      </div>

      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroContent}>
          <div className={`${styles.badge} animate-fade-in-up delay-1`}>
            <span className={styles.badgeDot}></span>
            Powered by PumpFun on Solana
          </div>

          <h1 className={`${styles.heroTitle} animate-fade-in-up delay-2`}>
            Decentralized
            <br />
            <span className={styles.gradientText}>GitHub Donations</span>
            <br />
            for Developers
          </h1>

          <p className={`${styles.heroDescription} animate-fade-in-up delay-3`}>
            PumpBoard connects open-source developers with supporters through
            PumpFun&apos;s decentralized donation protocol. Onboard, build, and get
            funded — all on-chain.
          </p>

          <div className={`${styles.heroButtons} animate-fade-in-up delay-4`}>
            <a href="#developers" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Explore Developers
            </a>
            <a href="#how-it-works" className="btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16 10 8" />
              </svg>
              How It Works
            </a>
          </div>

          <div className={`${styles.heroStats} animate-fade-in-up delay-5`}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                ${stats ? formatShort(stats.totalDonated) : "—"}+
              </span>
              <span className={styles.statLabel}>Total Donated</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {stats ? formatShort(stats.developers) : "—"}
              </span>
              <span className={styles.statLabel}>Developers</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {stats ? formatShort(stats.transactions) : "—"}+
              </span>
              <span className={styles.statLabel}>Transactions</span>
            </div>
          </div>
        </div>

        <div className={`${styles.heroBanner} animate-slide-right delay-3`}>
          <div className={styles.bannerGlow}></div>
          <Image
            src="/banner.png"
            alt="PumpBoard Banner"
            width={600}
            height={400}
            className={styles.bannerImage}
            priority
          />
          <div className={styles.orbitRing}>
            <div className={styles.orbitParticle1}></div>
            <div className={styles.orbitParticle2}></div>
          </div>
          <div className={styles.orbitRingOuter}>
            <div className={styles.orbitParticle3}></div>
          </div>
        </div>
      </div>

      <div className={styles.scrollIndicator}>
        <div className={styles.scrollMouse}>
          <div className={styles.scrollWheel}></div>
        </div>
        <span>Scroll to explore</span>
      </div>
    </section>
  );
}
