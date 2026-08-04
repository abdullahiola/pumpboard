"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../components/LegalPage.module.css";
import formStyles from "./contact.module.css";

export default function Contact() {
  const [name, setName] = useState("");
  const [github, setGithub] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [project, setProject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `PumpBoard listing application: ${github || name}`;
    const body = [
      `Name: ${name}`,
      `GitHub: ${github}`,
      `X / Twitter: ${xHandle || "-"}`,
      `Project / repo: ${project}`,
      "",
      message,
    ].join("\n");
    window.location.href = `mailto:contact@pumpboard.dev?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className={styles.legalPage}>
      <div className="container">
        <Link href="/" className={styles.backLink}>← Back to Home</Link>
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

        <section className={styles.section} id="apply">
          <h2>Apply to Get Listed</h2>
          <p>
            Our team actively scouts open-source developers and reaches out
            directly, but you can also apply here. Tell us who you are and
            what you build, and we&apos;ll get back to you.
          </p>
          <form className={formStyles.form} onSubmit={handleSubmit}>
            <div className={formStyles.row}>
              <label className={formStyles.field}>
                <span className={formStyles.label}>Name</span>
                <input
                  type="text"
                  className={formStyles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </label>
              <label className={formStyles.field}>
                <span className={formStyles.label}>GitHub username</span>
                <input
                  type="text"
                  className={formStyles.input}
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="octocat"
                  required
                />
              </label>
            </div>
            <div className={formStyles.row}>
              <label className={formStyles.field}>
                <span className={formStyles.label}>X / Twitter (optional)</span>
                <input
                  type="text"
                  className={formStyles.input}
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="@handle"
                />
              </label>
              <label className={formStyles.field}>
                <span className={formStyles.label}>Project or main repo</span>
                <input
                  type="text"
                  className={formStyles.input}
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="github.com/you/project"
                  required
                />
              </label>
            </div>
            <label className={formStyles.field}>
              <span className={formStyles.label}>Tell us about what you built</span>
              <textarea
                className={formStyles.textarea}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What does your project do? Who uses it?"
                rows={5}
                required
              />
            </label>
            <button type="submit" className={`btn-primary ${formStyles.submit}`}>
              Send Application
            </button>
            <p className={formStyles.hint}>
              Submitting opens your email app with the application pre-filled,
              addressed to contact@pumpboard.dev.
            </p>
          </form>
        </section>

      </div>
    </div>
  );
}
