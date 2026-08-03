"use client";

import { useState } from "react";
import styles from "./FAQ.module.css";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do donations actually reach a developer?",
    answer:
      "Supporters send SOL directly to the developer's PumpFun donation address — a normal Solana wallet transfer. The funds never pass through PumpBoard: there is no escrow, no pooled account, and no manual payout step. The developer can then claim to any Solana wallet they control.",
  },
  {
    question: "Does PumpBoard take a cut of donations?",
    answer:
      "No. Because donations move wallet-to-wallet, there is no point in the flow where PumpBoard could take a percentage. Developers keep 100% of what supporters send, minus only the Solana network fee (a fraction of a cent per transaction).",
  },
  {
    question: "How are the leaderboard numbers calculated?",
    answer:
      "Each developer profile records their total claimed rewards, and the leaderboard ranks profiles by that amount. The platform-wide stats shown on this site (total donated, developer count, transactions) are computed automatically from those same profiles — they are the sum of what you can see, not separate marketing figures.",
  },
  {
    question: "Can I verify the numbers myself?",
    answer:
      "Yes. Every donation and claim is a public transaction on the Solana blockchain. You can look up any wallet or transaction on an explorer like Solscan and confirm amounts independently — you don't have to take our word for anything.",
  },
  {
    question: "Do I need crypto experience to get onboarded?",
    answer:
      "No. You download the PumpFun app, connect your GitHub account to verify your identity, and PumpBoard creates your profile with a donation address. Receiving SOL and claiming it to a wallet is handled inside PumpFun — no smart-contract knowledge needed.",
  },
  {
    question: "What is PumpFun?",
    answer:
      "PumpFun is one of the most widely used apps on Solana, and it powers the donation rails behind PumpBoard. It gives every onboarded developer a donation address and handles the on-chain plumbing for receiving and claiming SOL.",
  },
  {
    question: "How do I get listed on PumpBoard?",
    answer:
      "Follow the steps in How It Works: get the PumpFun app, connect your GitHub, and complete onboarding. Profiles are reviewed before listing so the directory stays limited to real open-source contributors — your repos and contribution history are what get you in.",
  },
  {
    question: "How much can a developer earn?",
    answer:
      "It depends entirely on community support — there are no guaranteed amounts. The leaderboard shows real claimed totals for every listed developer, so the best answer is to look at what people are actually earning rather than projections.",
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
