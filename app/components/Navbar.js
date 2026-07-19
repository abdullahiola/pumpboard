"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";

const STORE_LINKS = {
  ios: "https://apps.apple.com/us/app/pump-fun-speculate-on-trends/id6717572591",
  android: "https://play.google.com/store/apps/details?id=com.batonresearch.pump&hl=en",
  fallback: "https://pump.fun",
};

function getPumpFunUrl() {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return STORE_LINKS.ios;
  if (/Android/i.test(ua)) return STORE_LINKS.android;
  return null;
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [showStoreMenu, setShowStoreMenu] = useState(false);

  const handleDownload = useCallback((e) => {
    const url = getPumpFunUrl();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      e.preventDefault();
      setShowStoreMenu((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("pb-theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pb-theme", next);
  };

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ""}`}>
      <div className={`container ${styles.navInner}`}>
        <a href="#" className={styles.logo}>
          <Image
            src="/logo-icon.png"
            alt="PumpBoard Logo"
            width={42}
            height={42}
            className={styles.logoImage}
          />
          <span className={styles.logoText}>PumpBoard</span>
        </a>

        <div className={`${styles.navLinks} ${mobileOpen ? styles.open : ""}`}>
          <a href="/#features" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Features
          </a>
          <a href="/#developers" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Developers
          </a>
          <a href="/leaderboard" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Leaderboard
          </a>
          <a href="/#how-it-works" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            How It Works
          </a>
          <a href="/#stats" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Stats
          </a>
          <button
            className={`btn-primary ${styles.mobileCta}`}
            onClick={(e) => { setMobileOpen(false); handleDownload(e); }}
          >
            <img src="https://pump.fun/pump-logomark.svg" alt="" width={18} height={18} className={styles.downloadIcon} />
            Download PumpFun
          </button>
        </div>

        <div className={styles.navActions}>
          <button
            className={styles.themeToggle}
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              document.documentElement.setAttribute("data-theme", next);
            }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <div className={styles.downloadWrap}>
            <button
              className="btn-primary btn-sm"
              onClick={handleDownload}
            >
              <img src="https://pump.fun/pump-logomark.svg" alt="" width={18} height={18} className={styles.downloadIcon} />
              Download PumpFun
            </button>
            {showStoreMenu && (
              <div className={styles.storeDropdown}>
                <a href={STORE_LINKS.ios} target="_blank" rel="noopener noreferrer" className={styles.storeLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  App Store
                </a>
                <a href={STORE_LINKS.android} target="_blank" rel="noopener noreferrer" className={styles.storeLink}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.27l1.443 1.443-2.462 2.462a7.472 7.472 0 011.996 5.075H21v2h-2.5v1.25a7.5 7.5 0 01-13 0V13.25H3v-2h2.5a7.472 7.472 0 011.996-5.075L5.034 3.713l1.443-1.443 2.77 2.77a7.468 7.468 0 015.506 0l2.77-2.77zM12 6a5.5 5.5 0 00-5.5 5.5v2a5.5 5.5 0 0011 0v-2A5.5 5.5 0 0012 6zm-2 5.5a1 1 0 112 0 1 1 0 01-2 0zm4 0a1 1 0 112 0 1 1 0 01-2 0z"/></svg>
                  Google Play
                </a>
              </div>
            )}
          </div>

          <button
            className={`${styles.burger} ${mobileOpen ? styles.burgerActive : ""}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
