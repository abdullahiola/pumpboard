"use client";

import type { ElementType, ReactNode } from "react";
import styles from "./Features.module.css";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  tag: string;
  link?: string;
}

const features: Feature[] = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
    ),
    title: "GitHub Integration",
    description:
      "Link your GitHub profile to automatically verify your contributions. Pull requests, commits, and repos, all tracked on-chain.",
    tag: "Verification",
  },
  {
    icon: (
      <img src="/pump-logomark.svg" alt="PumpFun" width={28} height={28} />
    ),
    title: "PumpFun Protocol",
    description:
      "Built on PumpFun's decentralized sponsorship infrastructure on Solana. Every sponsorship is transparent, instant, and trustless.",
    tag: "Solana",
    link: "https://pump.fun",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 21h-1l1-7H7.5c-.88 0-.33-.75-.31-.78C8.48 10.94 10.42 7.54 13.01 3h1l-1 7h3.51c.4 0 .62.19.4.66C12.97 17.55 11 21 11 21z" />
      </svg>
    ),
    title: "Instant Claims",
    description:
      "Developers can claim their sponsorships instantly to any Solana wallet. No middlemen, no delays, no fees beyond gas.",
    tag: "Fast",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
      </svg>
    ),
    title: "On-Chain Security",
    description:
      "All transactions are verified on the Solana blockchain. Audited smart contracts ensure your funds are always secure.",
    tag: "Secure",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
      </svg>
    ),
    title: "Community Driven",
    description:
      "Browse developer profiles, view their contributions, and support the builders making a real impact in open source.",
    tag: "Social",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
      </svg>
    ),
    title: "Live Analytics",
    description:
      "Track sponsorships in real-time. See how your contributions are distributed and monitor the impact of your support.",
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
          {features.map((feature, index) => {
            const CardWrapper: ElementType = feature.link ? "a" : "div";
            const wrapperProps = feature.link
              ? { href: feature.link, target: "_blank", rel: "noopener noreferrer" }
              : {};
            return (
              <CardWrapper
                key={index}
                className={`glass-card ${styles.featureCard}`}
                {...wrapperProps}
              >
                <div className={styles.cardIcon}>{feature.icon}</div>
                <div className={styles.cardTag}>{feature.tag}</div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
                <div className={styles.cardShine}></div>
              </CardWrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}
