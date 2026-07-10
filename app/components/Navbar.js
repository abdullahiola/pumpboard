"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

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
          <a href="#features" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Features
          </a>
          <a href="#developers" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Developers
          </a>
          <a href="#how-it-works" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            How It Works
          </a>
          <a href="#stats" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Stats
          </a>
          <a
            href="https://pumpfun.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-primary ${styles.mobileCta}`}
            onClick={() => setMobileOpen(false)}
          >
            Download PumpFun
          </a>
        </div>

        <div className={styles.navActions}>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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

          <a
            href="https://pumpfun.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PumpFun
          </a>

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
