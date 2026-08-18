"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import styles from "./Stats.module.css";
import type { PlatformStats } from "../types";
import { useCountUp } from "../lib/useCountUp";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface StatConfig {
  key: keyof PlatformStats;
  prefix: string;
  suffix: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const statConfig: StatConfig[] = [
  {
    key: "totalDonated",
    prefix: "$",
    suffix: "+",
    label: "Total Sponsored",
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

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
  }
  return num.toString();
}

interface StatCardProps {
  config: StatConfig;
  value: number;
  index: number;
  isVisible: boolean;
}

function StatCard({ config, value, index, isVisible }: StatCardProps) {
  const count = useCountUp(value, 2000 + index * 300, isVisible);

  return (
    <div className={`glass-card ${styles.statCard}`}>
      <div className={styles.cardIcon}>{config.icon}</div>
      <div className={styles.cardValue}>
        <span className={styles.prefix}>{config.prefix}</span>
        {/* Show the real value until the count-up starts, so server-rendered
            HTML carries actual numbers for crawlers instead of zeros */}
        <span className={styles.number}>{formatNumber(isVisible ? count : value)}</span>
        <span className={styles.suffix}>{config.suffix}</span>
      </div>
      <span className={styles.cardLabel}>{config.label}</span>
      <span className={styles.cardDesc}>{config.description}</span>
    </div>
  );
}

export default function Stats({
  initialStats = null,
}: {
  initialStats?: PlatformStats | null;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(initialStats);
  const sectionRef = useRef<HTMLElement | null>(null);

  // Fallback: only fetch in the browser when the server render had no data
  useEffect(() => {
    if (initialStats) return;
    fetch(`${API_URL}/api/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [initialStats]);

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
