"use client";

import styles from "./CTA.module.css";

export default function CTA() {
  return (
    <section className={styles.cta}>
      <div className={styles.bgGlow}></div>
      <div className={styles.bgGrid}></div>
      <div className={`container ${styles.ctaInner}`}>
        <div className={styles.ctaContent}>
          <span className="section-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Get Started
          </span>
          <h2 className={styles.ctaTitle}>
            Ready to Fund
            <br />
            <span className={styles.gradientText}>Open Source?</span>
          </h2>
          <p className={styles.ctaDescription}>
            Join PumpBoard today and start supporting the developers who build the
            tools you rely on. Every donation is on-chain, transparent, and instant.
          </p>
          <div className={styles.ctaButtons}>
            <a href="#" className="btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Connect GitHub
            </a>
            <a href="#developers" className="btn-secondary">
              Browse Developers
            </a>
          </div>
        </div>

        <div className={styles.ctaVisual}>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeDot} style={{ background: "#ff5f57" }}></span>
              <span className={styles.codeDot} style={{ background: "#febc2e" }}></span>
              <span className={styles.codeDot} style={{ background: "#28c840" }}></span>
              <span className={styles.codeTitle}>donate.sol</span>
            </div>
            <div className={styles.codeBody}>
              <code>
                <span className={styles.codeComment}>{"// PumpBoard Donation"}</span>
                <br />
                <span className={styles.codeKeyword}>const</span>{" "}
                <span className={styles.codeVar}>donation</span> ={" "}
                <span className={styles.codeKeyword}>await</span>{" "}
                <span className={styles.codeFunc}>pumpfun</span>
                <span className={styles.codePunc}>.donate({"{"}</span>
                <br />
                {"  "}
                <span className={styles.codeProp}>developer</span>:{" "}
                <span className={styles.codeString}>&quot;@alexrivera&quot;</span>,
                <br />
                {"  "}
                <span className={styles.codeProp}>amount</span>:{" "}
                <span className={styles.codeNum}>5.0</span>,
                <br />
                {"  "}
                <span className={styles.codeProp}>token</span>:{" "}
                <span className={styles.codeString}>&quot;SOL&quot;</span>,
                <br />
                {"  "}
                <span className={styles.codeProp}>message</span>:{" "}
                <span className={styles.codeString}>&quot;Keep building! 🚀&quot;</span>
                <br />
                <span className={styles.codePunc}>{"})"}</span>;
                <br />
                <br />
                <span className={styles.codeComment}>{"// ✅ Tx confirmed on Solana"}</span>
              </code>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
