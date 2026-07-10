"use client";

import styles from "./Features.module.css";

const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
    title: "GitHub Integration",
    description:
      "Link your GitHub profile to automatically verify your contributions. Pull requests, commits, and repos — all tracked on-chain.",
    tag: "Verification",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="30" y="10" width="40" height="80" rx="20" ry="20" stroke="currentColor" strokeWidth="6" fill="none" />
        <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="6" />
        <circle cx="50" cy="30" r="4" fill="currentColor" />
      </svg>
    ),
    title: "PumpFun Protocol",
    description:
      "Built on PumpFun's decentralized donation infrastructure on Solana. Every donation is transparent, instant, and trustless.",
    tag: "Solana",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: "Instant Claims",
    description:
      "Developers can claim their donations instantly to any Solana wallet. No middlemen, no delays, no fees beyond gas.",
    tag: "Fast",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "On-Chain Security",
    description:
      "All transactions are verified on the Solana blockchain. Audited smart contracts ensure your funds are always secure.",
    tag: "Secure",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Community Driven",
    description:
      "Browse developer profiles, view their contributions, and support the builders making a real impact in open source.",
    tag: "Social",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Live Analytics",
    description:
      "Track donations in real-time. See how your contributions are distributed and monitor the impact of your support.",
    tag: "Data",
  },
];

export default function Features() {
  return (
    <section className={`section ${styles.features}`} id="features">
      <div className={styles.bgGlow}></div>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Features
          </span>
          <h2 className="section-title">Why PumpBoard?</h2>
          <p className="section-subtitle">
            A complete platform for decentralized developer funding, powered by
            Solana and PumpFun.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`glass-card ${styles.featureCard}`}
            >
              <div className={styles.cardIcon}>{feature.icon}</div>
              <div className={styles.cardTag}>{feature.tag}</div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDescription}>{feature.description}</p>
              <div className={styles.cardShine}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
