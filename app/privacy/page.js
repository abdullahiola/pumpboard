"use client";

import styles from "../components/LegalPage.module.css";

export default function Privacy() {
  return (
    <div className={styles.legalPage}>
      <div className="container">
        <a href="/" className={styles.backLink}>← Back to Home</a>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: July 2026</p>

        <section className={styles.section}>
          <h2>1. Introduction</h2>
          <p>
            PumpBoard (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the website pumpboard.dev. 
            This Privacy Policy explains how we collect, use, and protect your information 
            when you use our platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li><strong>GitHub Profile Data:</strong> Public profile information including username, avatar, repositories, and contribution history when you connect your GitHub account.</li>
            <li><strong>Wallet Information:</strong> Solana wallet addresses used for donations and claims.</li>
            <li><strong>Usage Data:</strong> Anonymous analytics about how you interact with our platform.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. Blockchain Transactions</h2>
          <p>
            All donations and claims are processed on the Solana blockchain. Blockchain transactions 
            are public and immutable by nature. We do not control or store private keys.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. 
            Public profile data displayed on PumpBoard is sourced from your GitHub profile, 
            which is already publicly available.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted 
            on this page with an updated revision date.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{" "}
            <a href="mailto:contact@pumpboard.dev">contact@pumpboard.dev</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
