"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./Stats.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const statConfig = [
  {
    key: "totalDonated",
    prefix: "$",
    suffix: "+",
    label: "Total Donated",
    description: "Through PumpFun protocol",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    key: "developers",
    prefix: "",
    suffix: "",
    label: "Developers Onboarded",
    description: "And growing every day",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: "transactions",
    prefix: "",
    suffix: "+",
    label: "Transactions",
    description: "On-chain and verified",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    key: "activeProjects",
    prefix: "",
    suffix: "+",
    label: "Active Projects",
    description: "Open-source repositories",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
  }
  return num.toString();
}

function useCountUp(target, duration = 2000, shouldStart = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart || !target) return;

    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, shouldStart]);

  return count;
}

function StatCard({ config, value, index, isVisible }) {
  const count = useCountUp(value, 2000 + index * 300, isVisible);

  return (
    <div className={`glass-card ${styles.statCard}`}>
      <div className={styles.cardIcon}>{config.icon}</div>
      <div className={styles.cardValue}>
        <span className={styles.prefix}>{config.prefix}</span>
        <span className={styles.number}>{formatNumber(count)}</span>
        <span className={styles.suffix}>{config.suffix}</span>
      </div>
      <span className={styles.cardLabel}>{config.label}</span>
      <span className={styles.cardDesc}>{config.description}</span>
      <div className={styles.cardGlow}></div>
    </div>
  );
}

export default function Stats() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className={`section ${styles.stats}`} id="stats" ref={sectionRef}>
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            Platform Stats
          </span>
          <h2 className="section-title">The Numbers Speak</h2>
          <p className="section-subtitle">
            Real-time metrics from the PumpBoard ecosystem. Every number backed
            by on-chain data.
          </p>
        </div>

        <div className={styles.grid}>
          {statConfig.map((config, index) => (
            <StatCard
              key={config.key}
              config={config}
              value={stats ? stats[config.key] : 0}
              index={index}
              isVisible={isVisible && !!stats}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
