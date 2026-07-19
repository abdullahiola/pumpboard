"use client";

import styles from "../components/LegalPage.module.css";

export default function Terms() {
  return (
    <div className={styles.legalPage}>
      <div className="container">
        <a href="/" className={styles.backLink}>← Back to Home</a>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: July 2026</p>

        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using PumpBoard (pumpboard.dev), you agree to be bound by these 
            Terms of Service. If you do not agree, please do not use the platform.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Platform Description</h2>
          <p>
            PumpBoard is a decentralized platform that showcases open-source developers 
            and facilitates donations via PumpFun on the Solana blockchain. We provide 
            a leaderboard and profile system for developers who receive community support.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. Eligibility</h2>
          <p>
            You must be at least 18 years of age to use PumpBoard. By using the platform, 
            you represent that you meet this requirement and have the legal capacity to 
            enter into these terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Donations &amp; Transactions</h2>
          <ul>
            <li>All donations are voluntary and non-refundable.</li>
            <li>Transactions are processed on the Solana blockchain and are final.</li>
            <li>PumpBoard does not custody funds. Donations go directly to developer wallets via PumpFun.</li>
            <li>You are solely responsible for verifying wallet addresses before sending funds.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the platform for any unlawful purpose.</li>
            <li>Attempt to manipulate the leaderboard or donation metrics.</li>
            <li>Impersonate other developers or create fraudulent profiles.</li>
            <li>Interfere with the platform&apos;s operation or security.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>6. Intellectual Property</h2>
          <p>
            The PumpBoard name, logo, and website design are owned by PumpBoard. 
            Developer profiles use publicly available GitHub data and remain the 
            property of their respective owners.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Disclaimer of Warranties</h2>
          <p>
            PumpBoard is provided &quot;as is&quot; without warranties of any kind. We do not 
            guarantee the accuracy of developer profiles, donation amounts, or 
            blockchain transaction data. Use the platform at your own risk.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. Limitation of Liability</h2>
          <p>
            PumpBoard shall not be liable for any direct, indirect, incidental, or 
            consequential damages arising from your use of the platform, including 
            but not limited to loss of funds from blockchain transactions.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of 
            PumpBoard after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:contact@pumpboard.dev">contact@pumpboard.dev</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
