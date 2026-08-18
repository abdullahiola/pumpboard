"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease a number up to `target` once `shouldStart` flips true.
 *
 * Animates from wherever the counter currently sits rather than snapping
 * back to zero, so a target that arrives late (a price lookup resolving
 * after first paint) continues from the number already on screen.
 *
 * `decimals` keeps fractional targets — SOL amounts — from truncating.
 * Callers should render the real value until they start the animation, so
 * server-rendered HTML carries actual numbers instead of zeros.
 */
export function useCountUp(
  target: number,
  duration = 2000,
  shouldStart = false,
  decimals = 0
): number {
  const [count, setCount] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!shouldStart || !target) return;

    const from = fromRef.current;
    const delta = target - from;
    const factor = 10 ** decimals;
    let startTime: number | null = null;
    let animationFrame: number;

    if (prefersReducedMotion()) {
      animationFrame = requestAnimationFrame(() => {
        fromRef.current = target;
        setCount(target);
      });
      return () => cancelAnimationFrame(animationFrame);
    }

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = from + delta * eased;

      const rounded = Math.round(value * factor) / factor;
      fromRef.current = rounded;
      setCount(rounded);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, shouldStart, decimals]);

  return count;
}
