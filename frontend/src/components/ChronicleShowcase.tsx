"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import styles from "./ChronicleShowcase.module.css";

/* A static sample chronicle displayed on the landing page so visitors
   immediately see the creative output without clicking anything. */

const SAMPLE = {
  title: "The Weaving of the Weft Protocol",
  chapters: [
    {
      heading: "The First Thread",
      body: "In the quiet dawn of a new era, the first thread of the Weft Protocol was spun. With 23 commits on GitHub and a contract deployed to 0G Chain, the warp was set — cold, structural, immutable. But a loom without a weaver is just wood and string.",
    },
    {
      heading: "The Tapestry Unfurls",
      body: "As the first deployment was confirmed, the tapestry began to unfurl. 147 unique wallets interacted with the contract — organic adoption that grew 3× from week one to week two. Three verifier nodes reached consensus over Gensyn's AXL mesh, each independently attesting to the same truth.",
    },
  ],
  epilogue:
    "The fabric holds. Technology provided the warp — onchain events, cryptographic proofs, peer consensus. Liberal arts provided the weft — the human story woven through the data. Every verified milestone is a swatch of this tapestry.",
  milestoneHash: "0x516975afcb46acf3ea2265789ea0a64516db9f1d8e6cfb65737fc9cfafb1c16f",
};

export function ChronicleShowcase() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.kicker}>
          <BookOpen size={14} /> Builder Journey
        </span>
        <h2 className={styles.title}>
          Every milestone has a <span className={styles.accent}>story</span>
        </h2>
        <p className={styles.subtitle}>
          Kimi reads the onchain evidence and weaves it into narrative non-fiction.
          Not a dashboard. Not a JSON blob. A story.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Sparkles size={16} className={styles.sparkle} />
          <span className={styles.cardTitle}>{SAMPLE.title}</span>
        </div>

        <div className={styles.chapters}>
          {SAMPLE.chapters.map((ch, i) => (
            <div key={i} className={styles.chapter}>
              <h4 className={styles.chapterHeading}>
                <span className={styles.chapterNum}>Chapter {i + 1}</span>
                {ch.heading}
              </h4>
              <p className={styles.chapterBody}>{ch.body}</p>
            </div>
          ))}
        </div>

        {expanded && (
          <div className={styles.epilogue}>
            <h4 className={styles.epilogueHeading}>Epilogue</h4>
            <p>{SAMPLE.epilogue}</p>
          </div>
        )}

        <div className={styles.cardActions}>
          <button
            className={styles.expandBtn}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : "Read the epilogue"}
          </button>
          <Link
            href={`/milestone/${SAMPLE.milestoneHash}/story`}
            className={styles.storyLink}
          >
            Generate a live story <Sparkles size={14} />
          </Link>
        </div>
      </div>

      <p className={styles.tagline}>
        Technology provides the warp. Liberal arts provide the weft.
      </p>
    </section>
  );
}
