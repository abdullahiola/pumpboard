"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./Navbar.module.css";

const STORE_LINKS = {
  ios: "https://apps.apple.com/us/app/pump-fun-speculate-on-trends/id6717572591",
  android: "https://play.google.com/store/apps/details?id=com.batonresearch.pump&hl=en",
  fallback: "https://pump.fun",
};

function getPumpFunUrl(): string | null {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return STORE_LINKS.ios;
  if (/Android/i.test(ua)) return STORE_LINKS.android;
  return null;
}

type Theme = "dark" | "light";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const downloadRef = useRef<HTMLDivElement | null>(null);

  // Close the store dropdown on outside click or Escape
  useEffect(() => {
    if (!showStoreMenu) return;
    const handlePointer = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setShowStoreMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowStoreMenu(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showStoreMenu]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const saved: Theme = localStorage.getItem("pb-theme") === "light" ? "light" : "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe theme init: reading localStorage in a lazy initializer would cause a hydration mismatch
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
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

        {/* Backdrop — closes menu on tap */}
        {mobileOpen && (
          <div
            className={styles.backdrop}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className={`${styles.navLinks} ${mobileOpen ? styles.open : ""}`}>
          <Link href="/#features" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Features
          </Link>
          <Link href="/#developers" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Developers
          </Link>
          <Link href="/leaderboard" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Leaderboard
          </Link>
          <Link href="/#how-it-works" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            How It Works
          </Link>
          <Link href="/#transparency" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            Transparency
          </Link>
          <Link href="/#faq" className={styles.navLink} onClick={() => setMobileOpen(false)}>
            FAQ
          </Link>
          <button
            className={`btn-primary ${styles.mobileCta}`}
            onClick={(e) => { setMobileOpen(false); handleDownload(e); }}
          >
            <img src="/pump-logomark.svg" alt="" width={18} height={18} className={styles.downloadIcon} />
            Download PumpFun
          </button>
        </div>

        <div className={styles.navActions}>
          <button
            className={styles.themeToggle}
            onClick={toggleTheme}
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

          <div className={styles.downloadWrap} ref={downloadRef}>
            <button
              className="btn-primary btn-sm"
              onClick={handleDownload}
            >
              <img src="/pump-logomark.svg" alt="" width={18} height={18} className={styles.downloadIcon} />
              Download PumpFun
            </button>
            {showStoreMenu && (
              <div className={styles.storeDropdown}>
                <a href={STORE_LINKS.ios} target="_blank" rel="noopener noreferrer" className={styles.storeLink}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                    <path d="M8 16l1.106 -1.99m1.4 -2.522l2.494 -4.488" />
                    <path d="M7 14h5m2.9 0h2.1" />
                    <path d="M16 16l-2.51 -4.518m-1.487 -2.677l-1 -1.805" />
                  </svg>
                  App Store
                </a>
                <a href={STORE_LINKS.android} target="_blank" rel="noopener noreferrer" className={styles.storeLink}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 3.71v16.58a.7 .7 0 0 0 1.05 .606l14.622 -8.42a.55 .55 0 0 0 0 -.953l-14.622 -8.419a.7 .7 0 0 0 -1.05 .607l0 -.001" />
                    <path d="M15 9l-10.5 11.5" />
                    <path d="M4.5 3.5l10.5 11.5" />
                  </svg>
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
