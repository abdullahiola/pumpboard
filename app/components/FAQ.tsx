"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./FAQ.module.css";

interface FAQItem {
  question: string;
  answer: ReactNode;
}

const faqs: FAQItem[] = [
  {
    question: "How does a developer earn on PumpBoard?",
    answer:
      "We launch a token for your work on PumpFun and redirect 100% of the trading fees it generates to you, tied to your GitHub identity. Every time your token trades, fees accumulate for you to claim. Your earnings come from real trading activity, not from a pool we control.",
  },
  {
    question: "Do I need to actively manage anything?",
    answer:
      "No. Join the community we create for your token, make one post about what you built, and claim your fees. From that point forward, fees flow to you automatically on every trade, permanently.",
  },
  {
    question: "Do I need to know anything about crypto?",
    answer:
      "No. We handle token creation, fee routing, and all on-chain setup. You just connect your GitHub and share a wallet address, or we'll help you set one up.",
  },
  {
    question: "How much will I earn?",
    answer:
      "Earnings depend on day to day trading volume and how much mindshare you currently have. Our team can always give a rough estimate.",
  },
  {
    question: "What is pump.fun?",
    answer:
      "The leading token launchpad on Solana, run by attention, with hundreds of millions in daily trading volume. Creator fees are paid automatically on every trade.",
  },
  {
    question: "What does PumpBoard get out of helping developers claim what they're owed?",
    answer:
      "We launch the coin and buy supply, which covers listing costs. We generally make around 15–20% of how much the developer makes in fees. Your trading fees are never touched: 100% of them go to you.",
  },
  {
    question: "How are the leaderboard numbers calculated?",
    answer:
      "Each developer profile records their total claimed fees, and the leaderboard ranks profiles by that amount. The platform-wide stats shown on this site (total sponsored, developer count, transactions) are computed automatically from those same profiles. They are the sum of what you can see, not separate marketing figures.",
  },
  {
    question: "Can I verify the numbers myself?",
    answer:
      "Yes. Fee routing and every claim are public transactions on the Solana blockchain. You can look up any wallet or transaction on an explorer like Solscan and confirm amounts independently. You don't have to take our word for anything.",
  },
  {
    question: "How do I get listed on PumpBoard?",
    answer: (
      <>
        Our team actively scouts open-source developers and will reach out to
        you directly. Prefer not to wait?{" "}
        <Link href="/contact#apply" className={styles.answerLink}>
          Fill out the application form
        </Link>{" "}
        and we&apos;ll get back to you.
      </>
    ),
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
