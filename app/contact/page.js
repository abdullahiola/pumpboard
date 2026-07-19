"use client";

import styles from "../components/LegalPage.module.css";

export default function Contact() {
  return (
    <div className={styles.legalPage}>
      <div className="container">
        <a href="/" className={styles.backLink}>← Back to Home</a>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.updated}>We&apos;d love to hear from you</p>

        <section className={styles.section}>
          <h2>Get in Touch</h2>
          <p>
            Have questions, feedback, or want to get your project listed on PumpBoard? 
            Reach out to us through any of the channels below.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Email</h2>
          <p>
            For general inquiries:{" "}
            <a href="mailto:contact@pumpboard.dev">contact@pumpboard.dev</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2>Developer Onboarding</h2>
          <p>
            Want to be featured on PumpBoard? Send us your GitHub username and 
            Solana wallet address, and we&apos;ll get you set up on the platform.
          </p>
          <p>
            Email us at{" "}
            <a href="mailto:developers@pumpboard.dev">developers@pumpboard.dev</a>
          </p>
        </section>

        <section className={styles.section}>
          <h2>Report an Issue</h2>
          <p>
            Found a bug or have a security concern? Please report it to{" "}
            <a href="mailto:security@pumpboard.dev">security@pumpboard.dev</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
