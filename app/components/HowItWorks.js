"use client";

import styles from "./HowItWorks.module.css";

const steps = [
  {
    step: "01",
    title: "Download PumpFun",
    description:
      "Get the PumpFun app from the App Store or Google Play Store to start your decentralized donation journey.",
    icon: (
      <img src="https://pump.fun/pump-logomark.svg" alt="PumpFun" width={32} height={32} style={{ opacity: 0.9 }} />
    ),
  },
  {
    step: "02",
    title: "Connect GitHub",
    description:
      "Link your GitHub account to verify your identity and showcase your open-source contributions.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
      </svg>
    ),
  },
  {
    step: "03",
    title: "Get Onboarded",
    description:
      "Your profile is created on PumpBoard with your repos, contributions, and a unique donation address powered by PumpFun.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    step: "04",
    title: "Receive Donations",
    description:
      "Supporters donate SOL directly to your PumpFun wallet. Every transaction is recorded on the Solana blockchain.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    step: "05",
    title: "Claim & Build",
    description:
      "Claim your donations instantly to any Solana wallet. Keep building, keep earning — the cycle of open-source funding.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className={`section ${styles.howItWorks}`} id="how-it-works">
      <div className={styles.bgGlow}></div>
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Process
          </span>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Four simple steps to start receiving decentralized donations for your
            open-source work.
          </p>
        </div>

        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <div key={index} className={styles.timelineItem}>
              <div className={styles.timelineConnector}>
                <div className={styles.timelineDot}>
                  <span>{step.step}</span>
                </div>
                {index < steps.length - 1 && <div className={styles.timelineLine}></div>}
              </div>
              <div className={`glass-card ${styles.stepCard}`}>
                <div className={styles.stepIcon}>{step.icon}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
