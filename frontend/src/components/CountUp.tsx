"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 800,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: CountUpProps) {
  const reduced = usePrefersReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (reduced) return;

    // Reset animation lock whenever the value changes, so a late-loaded
    // value (e.g. explorer stats switching from 0 → 3) actually animates.
    hasAnimated.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          startTimeRef.current = null;

          const animate = (timestamp: number) => {
            if (startTimeRef.current === null) {
              startTimeRef.current = timestamp;
            }
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(value * eased);

            if (progress < 1) {
              rafRef.current = requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          rafRef.current = requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    // Observe the element that renders this value
    const target = document.documentElement.querySelector(`[data-countup-target="${value}-${decimals}"]`);
    if (target) {
      observer.observe(target);
    } else {
      // Fallback: just animate immediately
      hasAnimated.current = true;
      const animate = (timestamp: number) => {
        if (startTimeRef.current === null) startTimeRef.current = timestamp;
        const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(value * eased);
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
        else setDisplayValue(value);
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
    };
  }, [value, duration, decimals, reduced]);

  const formatted = (reduced ? value : displayValue).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} data-countup-target={`${value}-${decimals}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
