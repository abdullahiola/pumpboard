"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { resolveImageUrl } from "../utils";
import styles from "./Stats.module.css";
import modal from "./DeveloperCards.module.css";
import type { Developer, PlatformStats } from "../types";
import { useCountUp } from "../lib/useCountUp";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface StatConfig {
  key: keyof PlatformStats;
  prefix: string;
  suffix: string;
  label: string;
  description: string;
  icon: ReactNode;
  /** Clicking the card lists every sponsored project. */
  opensProjects?: boolean;
}

/** What the projects popup shows of each developer with a repo. */
export type ProjectSummary = Pick<
  Developer,
  "github" | "name" | "repo" | "repo_url" | "project_icon" | "totalClaimed"
>;

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
    opensProjects: true,
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

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

interface StatCardProps {
  config: StatConfig;
  value: number;
  index: number;
  isVisible: boolean;
  onOpen?: () => void;
}

function StatCard({ config, value, index, isVisible, onOpen }: StatCardProps) {
  const count = useCountUp(value, 2000 + index * 300, isVisible);
  // A card that opens the projects popup is a button; the rest are plain
  const Card = onOpen ? "button" : "div";

  return (
    <Card
      className={`glass-card ${styles.statCard} ${onOpen ? styles.statCardButton : ""}`}
      {...(onOpen ? { type: "button" as const, onClick: onOpen, "aria-haspopup": "dialog" as const } : {})}
    >
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
      {onOpen && <span className={styles.cardAction}>View all projects →</span>}
    </Card>
  );
}

function ProjectsPopup({ projects, onClose }: { projects: ProjectSummary[]; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape, lock page scroll and focus Close while open, like the profile
  // popup; on close, focus goes back to the card that opened it
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      opener?.focus();
    };
  }, [onClose]);

  const sorted = [...projects].sort((a, b) => b.totalClaimed - a.totalClaimed);

  return (
    <div className={modal.modalOverlay} onClick={onClose}>
      <div
        className={modal.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="projects-popup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} className={modal.modalClose} onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3 id="projects-popup-title" className={styles.popupTitle}>
          Active Projects
        </h3>
        <p className={styles.popupSubtitle}>
          {sorted.length} open-source {sorted.length === 1 ? "project" : "projects"} sponsored through PumpBoard
        </p>
        <ul className={styles.projectList}>
          {sorted.map((p) => {
            const repoName = p.repo?.split("/").pop() || p.repo;
            // The icon set in the admin, else GitHub's: the repo owner's avatar,
            // an org's logo or the developer's own photo
            const repoOwner = p.repo?.split("/")[0];
            const icon = p.project_icon
              ? resolveImageUrl(p.project_icon)
              : repoOwner && `https://avatars.githubusercontent.com/${repoOwner}?s=72`;
            const href = p.repo_url || `https://github.com/${p.repo}`;
            const owner = p.name || p.github;
            return (
              <li key={`${p.github}:${p.repo}`}>
                <a className={styles.projectRow} href={href} target="_blank" rel="noopener noreferrer">
                  <span className={styles.projectAvatar}>
                    {icon ? (
                      <Image
                        src={icon}
                        alt=""
                        width={36}
                        height={36}
                        className={styles.projectAvatarImg}
                      />
                    ) : (
                      <span>{(repoName || "??").substring(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className={styles.projectInfo}>
                    <span className={styles.projectName}>{repoName}</span>
                    <span className={styles.projectOwner}>{owner}</span>
                  </span>
                  <span className={styles.projectClaimed}>{formatUSD(p.totalClaimed)}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function Stats({
  initialStats = null,
  projects = null,
}: {
  initialStats?: PlatformStats | null;
  projects?: ProjectSummary[] | null;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const closeProjects = useCallback(() => setShowProjects(false), []);
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
              onOpen={config.opensProjects && projects?.length ? () => setShowProjects(true) : undefined}
            />
          ))}
        </div>
      </div>

      {showProjects && projects && <ProjectsPopup projects={projects} onClose={closeProjects} />}
    </section>
  );
}
