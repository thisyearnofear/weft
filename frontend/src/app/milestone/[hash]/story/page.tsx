"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Sparkles } from "lucide-react";
import { useStatusMilestone } from "../../../../hooks/useStatusApi";
import styles from "./page.module.css";

interface Chapter {
  heading: string;
  body: string;
}

interface ChronicleData {
  ok: boolean;
  title: string;
  chapters: Chapter[];
  epilogue: string;
  confidence: number;
  error?: string;
  detail?: string;
}

export default function StoryPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = React.use(params);
  const milestoneHash = hash.startsWith("0x") ? hash : `0x${hash}`;
  const { data: statusData } = useStatusMilestone(milestoneHash as `0x${string}`, true);

  const [chronicle, setChronicle] = useState<ChronicleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage cache on mount
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem(`weft_chronicle_${milestoneHash}`);
      if (cached) setChronicle(JSON.parse(cached));
    } catch { /* ignore */ }
  }, [milestoneHash]);

  const generateChronicle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chronicle/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneHash }),
      });
      const data: ChronicleData = await res.json();
      if (!data.ok) {
        setError(data.error || "Generation failed");
      } else {
        setChronicle(data);
        try { localStorage.setItem(`weft_chronicle_${milestoneHash}`, JSON.stringify(data)); } catch { /* quota */ }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [milestoneHash]);

  const stakedEth = statusData ? (Number(statusData.totalStaked) / 1e18).toFixed(4) : null;
  const isVerified = statusData?.verified;
  const builderEns = statusData?.demo?.tracks?.ens?.builderEns;

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.topNav}>
          <Link href={`/project/${milestoneHash}`} className={styles.backLink}>
            <ArrowLeft size={16} /> Back to milestone
          </Link>
        </div>

        <header className={styles.header}>
          <div className={styles.headerIcon}>
            <BookOpen size={28} />
          </div>
          <h1 className={styles.title}>Builder Journey</h1>
          <p className={styles.subtitle}>
            The story behind milestone <code>{milestoneHash.slice(0, 10)}…{milestoneHash.slice(-6)}</code>
            {builderEns && <> by <strong>{builderEns}</strong></>}
          </p>
          {stakedEth && (
            <div className={styles.meta}>
              <span className={isVerified ? styles.tagVerified : styles.tagPending}>
                {isVerified ? "✓ Verified" : "⏳ Pending"}
              </span>
              <span className={styles.tagStaked}>{stakedEth} ETH staked</span>
            </div>
          )}
        </header>

        {!chronicle && !loading && !error && (
          <section className={styles.generateSection}>
            <div className={styles.generateCard}>
              <Sparkles size={32} className={styles.sparkle} />
              <h2>Generate this milestone&apos;s story</h2>
              <p>
                Kimi will read the onchain evidence — deployment status, unique callers,
                peer consensus — and weave it into a narrative. Technology provides the warp.
                Liberal arts provide the weft.
              </p>
              <button className={styles.generateBtn} onClick={generateChronicle}>
                <Sparkles size={16} />
                Weave the story
              </button>
            </div>
          </section>
        )}

        {loading && (
          <section className={styles.loadingSection}>
            <Loader2 size={32} className={styles.spinner} />
            <p>Kimi is weaving the narrative from onchain evidence…</p>
          </section>
        )}

        {error && (
          <section className={styles.errorSection}>
            <p className={styles.errorText}>⚠ {error}</p>
            <button className={styles.retryBtn} onClick={generateChronicle}>
              Try again
            </button>
          </section>
        )}

        {chronicle && (
          <article className={styles.chronicle}>
            <h2 className={styles.chronicleTitle}>{chronicle.title}</h2>

            {chronicle.chapters.map((ch, i) => (
              <section key={i} className={styles.chapter}>
                <h3 className={styles.chapterHeading}>
                  <span className={styles.chapterNum}>Chapter {i + 1}</span>
                  {ch.heading}
                </h3>
                <div className={styles.chapterBody}>
                  {ch.body.split("\n").map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </section>
            ))}

            {chronicle.epilogue && (
              <section className={styles.epilogue}>
                <h3 className={styles.epilogueHeading}>Epilogue</h3>
                <p>{chronicle.epilogue}</p>
              </section>
            )}

            {chronicle.confidence > 0 && (
              <div className={styles.confidence}>
                Kimi confidence: {(chronicle.confidence * 100).toFixed(0)}%
              </div>
            )}

            <div className={styles.actions}>
              <button className={styles.regenerateBtn} onClick={generateChronicle}>
                <Sparkles size={14} /> Regenerate
              </button>
              <Link href={`/project/${milestoneHash}`} className={styles.backBtn}>
                View milestone details
              </Link>
            </div>

            {/* Manim animation video (if generated by Hermes weft-manim skill) */}
            <section className={styles.manimSection}>
              <h3 className={styles.manimHeading}>🎬 Verification Animation</h3>
              <p className={styles.manimDesc}>
                If the Hermes Agent has generated a Manim animation for this milestone,
                it will appear below.
              </p>
              <video
                className={styles.manimVideo}
                controls
                preload="none"
                poster=""
                onError={(e) => {
                  (e.target as HTMLVideoElement).style.display = "none";
                  const parent = (e.target as HTMLVideoElement).parentElement;
                  if (parent) {
                    const hint = parent.querySelector("[data-manim-hint]");
                    if (hint) (hint as HTMLElement).style.display = "block";
                  }
                }}
              >
                <source src={`/api/status/manim/WeftWeaving`} type="video/mp4" />
              </video>
              <p className={styles.manimHint} data-manim-hint style={{ display: "none" }}>
                No animation yet. Run <code>hermes</code> → <em>&quot;animate the verification&quot;</em> to generate one.
              </p>
            </section>
          </article>
        )}
      </div>
    </div>
  );
}
