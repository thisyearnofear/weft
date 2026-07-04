"use client";

import { useState } from "react";
import { Check, Copy, PartyPopper, Share2 } from "lucide-react";
import { track } from "../lib/track";
import styles from "./ProofShareCard.module.css";

interface ProofShareCardProps {
  hash: string;
  url: string;
  builderName: string;
  stakedEth: string;
  verifiedVotes: number;
  verifierCount: number;
}

/**
 * ProofShareCard — the payoff of the whole product.
 *
 * When a milestone verifies, the builder walks away with something they *want*
 * to broadcast: cryptographic proof that they shipped and got paid. This card
 * makes that share a one-click, ego-flattering moment — the viral loop. Each
 * share recruits the next builder and signals sponsors that outcomes are real.
 */
export function ProofShareCard({
  hash,
  url,
  builderName,
  stakedEth,
  verifiedVotes,
  verifierCount,
}: ProofShareCardProps) {
  const [copied, setCopied] = useState<"link" | "badge" | null>(null);

  // Reputation-only milestones verify with zero stake — the proof is the payout.
  const unfunded = Number(stakedEth) === 0;
  const shareText = unfunded
    ? `I shipped it. ✅ Verified onchain by ${verifiedVotes} of ${verifierCount} autonomous agents on @weft — no sponsor, no invoice, just portable proof for ${builderName}:`
    : `I shipped it. ✅ Verified onchain by ${verifiedVotes} of ${verifierCount} autonomous agents on @weft — ${stakedEth} ETH released, no invoice, no chasing. Portable proof for ${builderName}:`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;

  const badgeMarkdown = `[![Verified on Weft](${origin()}/api/badge/${hash})](${url})`;

  const copy = (kind: "link" | "badge", value: string) => {
    track("share_click", { kind });
    navigator.clipboard.writeText(value).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800);
    });
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Verified on Weft", text: shareText, url });
        return;
      } catch {
        /* user dismissed — fall through */
      }
    }
    copy("link", url);
  };

  return (
    <section className={styles.card}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.head}>
        <span className={styles.badge}>
          <PartyPopper size={14} /> Proof minted
        </span>
        <h2 className={styles.title}>You shipped it. Now show it off.</h2>
        <p className={styles.sub}>
          {unfunded ? (
            <>
              <strong>{builderName}</strong> shipped this with no sponsor — verified by{" "}
              {verifiedVotes} of {verifierCount} independent agents. This proof is
              portable, permanent, and yours — put it where the world can see it.
            </>
          ) : (
            <>
              <strong>{stakedEth} ETH</strong> released to <strong>{builderName}</strong>,
              verified by {verifiedVotes} of {verifierCount} independent agents. This proof
              is portable, permanent, and yours — put it where the world can see it.
            </>
          )}
        </p>
      </div>

      <div className={styles.actions}>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.primaryShare}
          onClick={() => track("share_click", { kind: "x" })}
        >
          <Share2 size={16} /> Share on X
        </a>
        <button className={styles.action} onClick={nativeShare}>
          {copied === "link" ? <Check size={16} /> : <Copy size={16} />}
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className={styles.badgeBlock}>
        <div className={styles.badgeBlockHead}>
          <span>Add a live proof badge to your README or bio</span>
          <button className={styles.badgeCopy} onClick={() => copy("badge", badgeMarkdown)}>
            {copied === "badge" ? <Check size={13} /> : <Copy size={13} />}
            {copied === "badge" ? "Copied" : "Copy"}
          </button>
        </div>
        <code className={styles.badgeCode}>{badgeMarkdown}</code>
      </div>
    </section>
  );
}

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://weft.thisyearnofear.com";
}
