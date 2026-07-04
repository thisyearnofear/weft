"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import styles from "./SealedReveal.module.css";

/**
 * The sealed-ballot visual for confidential milestones.
 *
 * While the result is sealed, a frame-matched Seedance loop of a knotted
 * thread plays. The moment `revealed` flips true (the Zama relayer decrypts
 * the result), playback crosses seamlessly into the reveal clip — the knot
 * unwinds and weaves itself into verified fabric — and holds its final frame.
 * The two clips share their junction frame, so the transition is invisible.
 */
export function SealedReveal({ revealed }: { revealed: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<"sealed" | "revealing" | "done">("sealed");
  const sealedRef = useRef<HTMLVideoElement>(null);
  const revealRef = useRef<HTMLVideoElement>(null);

  // Adjust state during render when the prop flips (React "you might not
  // need an effect" pattern) — the effect below only drives the DOM.
  if (revealed && phase === "sealed") {
    setPhase("revealing");
  }

  // Explicit play() calls: React doesn't render `muted` as an HTML attribute,
  // so Chromium refuses autoplay on these dynamically-mounted videos.
  useEffect(() => {
    if (reducedMotion) return;
    if (phase === "sealed") {
      const sealed = sealedRef.current;
      if (sealed) {
        const p = sealed.play();
        if (p) p.catch(() => {/* poster remains */});
      }
      return;
    }
    if (phase === "revealing") {
      const reveal = revealRef.current;
      if (!reveal) return;
      reveal.currentTime = 0;
      const p = reveal.play();
      if (p) p.catch(() => setPhase("done"));
    }
  }, [phase, reducedMotion]);

  if (reducedMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={revealed ? "/delight/reveal_end_poster.jpg" : "/delight/sealed_loop_poster.jpg"}
        alt={revealed ? "Completed verified weave" : "Sealed encrypted knot of thread"}
        className={styles.frame}
      />
    );
  }

  return (
    <div className={styles.frame} aria-hidden>
      <video
        ref={sealedRef}
        src="/delight/sealed_loop.mp4"
        poster="/delight/sealed_loop_poster.jpg"
        muted
        playsInline
        loop
        preload="auto"
        className={`${styles.layer} ${phase === "sealed" ? styles.visible : ""}`}
      />
      <video
        ref={revealRef}
        src="/delight/reveal.mp4"
        poster="/delight/reveal_poster.jpg"
        muted
        playsInline
        preload="auto"
        className={`${styles.layer} ${phase !== "sealed" ? styles.visible : ""}`}
        onEnded={() => setPhase("done")}
      />
      <span className={`${styles.caption} ${phase === "done" ? styles.captionVerified : ""}`}>
        {phase === "sealed" ? "ballots sealed" : phase === "revealing" ? "decrypting…" : "verified"}
      </span>
    </div>
  );
}
