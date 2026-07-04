"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import styles from "./HeroLoom.module.css";

/**
 * Ambient living-loom background for the landing hero.
 *
 * Two Seedance-generated clips are frame-matched (hero_a's last frame is
 * hero_b's first frame and vice versa), so alternating them on `ended`
 * plays as one continuous, never-repeating weave. Falls back to a static
 * poster for reduced-motion users and until the first clip can play.
 */
const CLIP_A = "/delight/hero_a.mp4";
const CLIP_B = "/delight/hero_b.mp4";
const POSTER = "/delight/hero_a_poster.jpg";

export function HeroLoom() {
  const reducedMotion = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<"a" | "b">("a");
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const current = active === "a" ? videoARef.current : videoBRef.current;
    const next = active === "a" ? videoBRef.current : videoARef.current;
    if (!current) return;
    // The inactive element is already loaded and rewound; start the active one.
    const play = current.play();
    if (play) play.catch(() => {/* autoplay blocked — poster remains */});
    if (next) next.currentTime = 0;
  }, [active, reducedMotion]);

  if (reducedMotion) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={POSTER} alt="" aria-hidden className={styles.layer} />;
  }

  return (
    <div className={styles.wrap} aria-hidden>
      {!ready && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={POSTER} alt="" className={styles.layer} />
      )}
      <video
        ref={videoARef}
        src={CLIP_A}
        muted
        playsInline
        preload="auto"
        className={`${styles.layer} ${styles.video} ${active === "a" ? styles.visible : ""}`}
        onCanPlay={() => setReady(true)}
        onEnded={() => setActive("b")}
      />
      <video
        ref={videoBRef}
        src={CLIP_B}
        muted
        playsInline
        preload="auto"
        className={`${styles.layer} ${styles.video} ${active === "b" ? styles.visible : ""}`}
        onEnded={() => setActive("a")}
      />
      <div className={styles.scrim} />
    </div>
  );
}
