import type { ReactNode } from "react";
import styles from "./Transparency.module.css";

interface Pillar {
  title: string;
  description: string;
  icon: ReactNode;
}

const pillars: Pillar[] = [
  {
    title: "We Launch It For You",
    description:
      "PumpBoard launches a token for you on PumpFun and sets up an official community around it. Token creation, fee routing, and all on-chain setup are handled — tied to your GitHub.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    ),
  },
  {
    title: "100% of Fees. Always Yours.",
    description:
      "Every trading fee your token generates is redirected to you. PumpBoard doesn't skim a percentage — what the token earns is what you claim.",
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
      "Fee routing and every claim are public transactions on Solana. Anyone can independently verify any amount on a block explorer like Solscan — no trust required.",
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

const yourPart = [
  {
    step: "01",
    title: "Join your community",
    description: "We create an official community for your token when it launches — join it and meet your supporters.",
  },
  {
    step: "02",
    title: "Post about what you built",
    description: "Share your work with the community. Show supporters exactly what they're backing.",
  },
  {
    step: "03",
    title: "Claim your fees",
    description: "100% of the trading fees are yours — claim them to any Solana wallet, whenever you want.",
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
            We Launch Your Token. You Keep 100% of the Fees.
          </h2>
          <p className="section-subtitle">
            No hidden fees, no fine print. We launch a token for your work,
            redirect every trading fee it generates to you, and put it all on
            Solana — in public, where anyone can check.
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

        <div className={styles.yourPart}>
          <h3 className={styles.yourPartTitle}>Your part is simple</h3>
          <div className={styles.yourPartGrid}>
            {yourPart.map((item) => (
              <div key={item.step} className={styles.yourPartItem}>
                <span className={styles.yourPartStep}>{item.step}</span>
                <div className={styles.yourPartInfo}>
                  <span className={styles.yourPartLabel}>{item.title}</span>
                  <span className={styles.yourPartDescription}>
                    {item.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
