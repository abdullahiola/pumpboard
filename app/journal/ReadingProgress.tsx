"use client";

import { useEffect, useState } from "react";
import styles from "./journal.module.css";

/** Thin bar along the top that fills as the reader moves through the article. */
export default function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      // 0 when the article's top reaches the viewport top, 1 when its end
      // reaches the viewport bottom
      const scrollable = rect.height - window.innerHeight;
      const value = scrollable > 0 ? -rect.top / scrollable : rect.top < 0 ? 1 : 0;
      setProgress(Math.min(1, Math.max(0, value)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetId]);

  return (
    <div className={styles.progress} aria-hidden="true">
      <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
