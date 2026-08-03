import type { ReactNode } from "react";
import styles from "./Transparency.module.css";

interface Pillar {
  title: string;
  description: string;
  icon: ReactNode;
}

const pillars: Pillar[] = [
  {
    title: "Direct Wallet-to-Wallet",
    description:
      "Donations move straight from the supporter's wallet to the developer's PumpFun address. PumpBoard never holds, routes, or touches funds at any point.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
    ),
  },
  {
    title: "100% Goes to Developers",
    description:
      "PumpBoard takes no cut of donations. Developers keep everything supporters send — the only cost is the Solana network fee, a fraction of a cent.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <line x1="12" y1="6" x2="12" y2="8" />
        <line x1="12" y1="16" x2="12" y2="18" />
      </svg>
    ),
  },
  {
    title: "Fully On-Chain & Auditable",
    description:
      "Every donation and claim is a public transaction on Solana. Anyone can independently verify any amount on a block explorer like Solscan — no trust required.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <path d="M11 8v3l2 2" />
      </svg>
    ),
  },
  {
    title: "Public By Default",
    description:
      "Every developer's claimed total is published on the leaderboard, and our platform stats are computed directly from those same profiles — not marketing numbers.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function Transparency() {
  return (
    <section className={`section ${styles.transparency}`} id="transparency">
      <div className={styles.bgGlow}></div>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Transparency
          </span>
          <h2 className="section-title">
            100% of Donations. Straight to Developers.
          </h2>
          <p className="section-subtitle">
            No middlemen, no hidden fees, no custody. Every SOL moves
            wallet-to-wallet on Solana — in public, where anyone can check.
          </p>
        </div>

        <div className={styles.grid}>
          {pillars.map((pillar, index) => (
            <div key={index} className={`glass-card ${styles.pillarCard}`}>
              <div className={styles.pillarIcon}>{pillar.icon}</div>
              <h3 className={styles.pillarTitle}>{pillar.title}</h3>
              <p className={styles.pillarDescription}>{pillar.description}</p>
            </div>
          ))}
        </div>

        <div className={styles.verifyStrip}>
          <div className={styles.verifyText}>
            <span className={styles.verifyTitle}>Don&apos;t trust — verify.</span>
            <span className={styles.verifyDescription}>
              Pick any developer on the leaderboard and check their claimed
              rewards yourself on a Solana explorer.
            </span>
          </div>
          <div className={styles.verifyActions}>
            <a href="/leaderboard" className="btn-primary">
              View the Leaderboard
            </a>
            <a
              href="https://solscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open Solscan
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
