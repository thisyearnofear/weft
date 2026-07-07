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
 *
 * When `decrypting` is true (the relayer request is in flight), the sealed
 * loop dims slightly and the caption shifts to "decrypting…" — giving the
 * moment weight before the result arrives.
 */
export function SealedReveal({
  revealed,
  decrypting = false,
}: {
  revealed: boolean;
  decrypting?: boolean;
}) {
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

  // The caption reflects three states: sealed, decrypting (relayer in flight),
  // and the final result. The "decrypting…" state bridges the gap between
  // clicking the button and the result arriving — so the moment has weight.
  const caption = phase === "done"
    ? "verified"
    : phase === "revealing"
      ? "decrypting…"
      : decrypting
        ? "asking relayer…"
        : "ballots sealed";

  if (reducedMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={revealed ? "/delight/reveal_end_poster.jpg" : "/delight/sealed_loop_poster.jpg"}
        alt={revealed ? "Completed verified weave" : "Sealed encrypted knot of thread"}
        className={`${styles.frame} ${decrypting && !revealed ? styles.decrypting : ""}`}
      />
    );
  }

  return (
    <div
      className={`${styles.frame} ${decrypting && !revealed ? styles.decrypting : ""}`}
      aria-hidden
    >
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
      <span className={`${styles.caption} ${phase === "done" ? styles.captionVerified : ""} ${decrypting && !revealed ? styles.captionDecrypting : ""}`}>
        {caption}
      </span>
    </div>
  );
}
