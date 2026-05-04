"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Send } from "lucide-react";
import styles from "./AskWeft.module.css";

/**
 * Lightweight "Ask the Weft Agent" input on the landing page.
 * Supports two actions:
 *  - If the user types a milestone hash (0x…), navigate to its story page.
 *  - Otherwise, generate a chronicle for the demo milestone.
 */

const DEMO_HASH = "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f";

interface ChronicleResult {
  ok: boolean;
  title?: string;
  chapters?: { heading: string; body: string }[];
  epilogue?: string;
  error?: string;
}

export function AskWeft() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChronicleResult | null>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      // If it looks like a milestone hash, navigate to its story page
      if (/^0x[a-fA-F0-9]{10,}$/.test(trimmed)) {
        router.push(`/milestone/${trimmed}/story`);
        return;
      }

      // Otherwise generate a chronicle for the demo milestone
      setLoading(true);
      setResult(null);
      try {
        const res = await fetch("/api/chronicle/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ milestoneHash: DEMO_HASH }),
        });
        const data: ChronicleResult = await res.json();
        setResult(data);
      } catch {
        setResult({ ok: false, error: "Could not reach the Weft agent." });
      } finally {
        setLoading(false);
      }
    },
    [query, router]
  );

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <MessageCircle size={16} />
        <span>Ask the Weft Agent</span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Paste a milestone hash or ask &quot;tell me the story&quot;…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <button className={styles.sendBtn} type="submit" disabled={loading} aria-label="Send">
          {loading ? <Loader2 size={16} className={styles.spinner} /> : <Send size={16} />}
        </button>
      </form>

      {result && (
        <div className={styles.result}>
          {result.ok && result.title ? (
            <>
              <strong className={styles.resultTitle}>{result.title}</strong>
              {result.chapters?.slice(0, 1).map((ch, i) => (
                <p key={i} className={styles.resultBody}>
                  <em>{ch.heading}</em> — {ch.body.slice(0, 200)}…
                </p>
              ))}
              <a
                className={styles.readMore}
                href={`/milestone/${DEMO_HASH}/story`}
              >
                Read the full story →
              </a>
            </>
          ) : (
            <p className={styles.resultError}>{result.error || "Generation failed."}</p>
          )}
        </div>
      )}
    </section>
  );
}
