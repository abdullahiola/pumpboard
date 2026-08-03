"use client";

import { useState } from "react";
import styles from "./FAQ.module.css";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does a developer earn on PumpBoard?",
    answer:
      "We launch a token for your work on PumpFun and redirect 100% of the trading fees it generates to you, tied to your GitHub identity. Every time your token trades, fees accumulate for you to claim — your earnings come from real trading activity, not from a pool we control.",
  },
  {
    question: "What does the developer actually have to do?",
    answer:
      "Three things. Join the official community we create for your token, make a post about what you built so supporters know exactly what they're backing, and claim your fees. Token creation, launch, and fee routing are all handled by PumpBoard — you focus on building.",
  },
  {
    question: "Does PumpBoard take a cut of the fees?",
    answer:
      "No. 100% of the trading fees your token generates are redirected to you. What the token earns is what you can claim — there is no percentage skimmed along the way.",
  },
  {
    question: "How are the leaderboard numbers calculated?",
    answer:
      "Each developer profile records their total claimed fees, and the leaderboard ranks profiles by that amount. The platform-wide stats shown on this site (total donated, developer count, transactions) are computed automatically from those same profiles — they are the sum of what you can see, not separate marketing figures.",
  },
  {
    question: "Can I verify the numbers myself?",
    answer:
      "Yes. Fee routing and every claim are public transactions on the Solana blockchain. You can look up any wallet or transaction on an explorer like Solscan and confirm amounts independently — you don't have to take our word for anything.",
  },
  {
    question: "Do I need crypto experience?",
    answer:
      "No. We handle token creation, fee routing, and all the on-chain setup. You download the PumpFun app, connect your GitHub account to verify your identity, and we take it from there — no smart-contract knowledge needed.",
  },
  {
    question: "What is PumpFun?",
    answer:
      "PumpFun is the leading token launchpad on Solana, with hundreds of millions in daily trading volume. It powers the rails behind PumpBoard: your token is launched there, and its trading fees are what you claim.",
  },
  {
    question: "How do I get listed on PumpBoard?",
    answer:
      "Follow the steps in How It Works: get the PumpFun app, connect your GitHub, and complete onboarding. Profiles are reviewed before a token is launched so the directory stays limited to real open-source contributors — your repos and contribution history are what get you in.",
  },
  {
    question: "How much can a developer earn?",
    answer:
      "It depends on your token's trading volume and how much attention your work attracts — there are no guaranteed amounts. The leaderboard shows real claimed totals for every listed developer, so the best answer is to look at what people are actually earning rather than projections.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className={`section ${styles.faq}`} id="faq">
      <div className="container">
        <div className={styles.header}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            FAQ
          </span>
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Straight answers about how PumpBoard works, where the money goes,
            and how to check it yourself.
          </p>
        </div>

        <div className={styles.list}>
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}
              >
                <button
                  className={styles.question}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <svg
                    className={styles.chevron}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className={styles.answerWrap}>
                  <p className={styles.answer}>{item.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
