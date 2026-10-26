"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./Footer.module.css";

const footerLinks: Record<string, { label: string; href: string }[]> = {
  Platform: [
    { label: "Features", href: "/#features" },
    { label: "Developers", href: "/#developers" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Transparency", href: "/#transparency" },
    { label: "Stats", href: "/#stats" },
    { label: "FAQ", href: "/#faq" },
  ],
  Explore: [
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Journal", href: "/journal" },
  ],
  // Community: [
  //   { label: "Discord", href: "#" },
  //   { label: "Twitter", href: "#" },
  //   { label: "GitHub", href: "#" },
  //   { label: "Forum", href: "#" },
  // ],
};

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.footerLogo}>
              <Image src="/logo-icon.png" alt="PumpBoard" width={36} height={36} />
              <span className={styles.logoText}>PumpBoard</span>
            </Link>
            <p className={styles.footerDesc}>
              Decentralized sponsorship for open-source developers, powered by PumpFun on Solana.
              Supporting open-source developers worldwide.
            </p>
            <div className={styles.socialLinks}>
              <a
                href="https://x.com/pumpboardnu"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label="PumpBoard on X"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className={styles.footerColumn}>
              <h4 className={styles.columnTitle}>{category}</h4>
              <ul className={styles.columnLinks}>
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className={styles.footerLink}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} PumpBoard. Built on Solana. Powered by PumpFun.
          </p>
          <div className={styles.bottomLinks}>
            <Link href="/privacy" className={styles.bottomLink}>Privacy</Link>
            <Link href="/terms" className={styles.bottomLink}>Terms</Link>
            <Link href="/contact" className={styles.bottomLink}>Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
