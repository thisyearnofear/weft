"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Zap, Globe, ArrowRight, Check } from "lucide-react";
import { InteractiveDemo } from "./InteractiveDemo";
import { DEMO_FHE_V1_HASH, DEMO_FHE_V2_HASH } from "@/lib/demo-milestones";
import { track } from "@/lib/track";
import styles from "./LiveSandbox.module.css";

type TabKey = "evm" | "fhe-v1" | "fhe-v2";

const TABS: { key: TabKey; label: string; icon: typeof Globe }[] = [
  { key: "evm", label: "Public EVM", icon: Globe },
  { key: "fhe-v1", label: "Confidential v1", icon: Lock },
  { key: "fhe-v2", label: "Confidential v2", icon: Zap },
];

const FHE_CARD = {
  v1: {
    href: `/project/${DEMO_FHE_V1_HASH}?confidential=1`,
    kicker: "v1 · Sealed ballots",
    title: "Boolean quorum",
    body: "Each verifier encrypts a yes/no ballot. The contract checks quorum on encrypted votes and only reveals the final pass/fail result.",
    meta: "FHE.add · FHE.ge · FHE.select",
    checks: ["Boolean ballots encrypted on Sepolia", "Quorum checked on ciphertext", "Only the final result is decrypted"],
  },
  v2: {
    href: `/project/${DEMO_FHE_V2_HASH}?weighted=1`,
    kicker: "v2 · Weighted consensus",
    title: "Confidence-weighted votes",
    body: "Each verifier encrypts a ballot and a confidence score. The contract weights every vote before revealing only the weighted outcome.",
    meta: "FHE.mul · FHE.add · FHE.and",
    checks: ["Ballot × confidence on ciphertext", "Binary + weighted quorum gates", "No individual confidence score exposed"],
  },
} as const;

export function LiveSandbox() {
  const [active, setActive] = useState<TabKey>("evm");

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label="Live sandbox demos">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={styles.tab}
            data-active={active === key}
            onClick={() => {
              setActive(key);
              track("live_sandbox_tab_click", { tab: key });
            }}
          >
            <span className={styles.tabIcon}>
              <Icon size={12} />
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Keep all panels mounted so state (e.g. InteractiveDemo step) is preserved. */}
      <div
        className={styles.panel}
        role="tabpanel"
        data-active={active === "evm"}
        hidden={active !== "evm"}
      >
        <InteractiveDemo />
        <div className={styles.preview}>
          <h4 className={styles.previewTitle}>Public EVM · 0G Testnet</h4>
          <p className={styles.demoBody}>
            Crypto-native wedge for objectively checkable software milestones.
            Step through a real verification — evidence, consensus, release.
          </p>
          <ul className={styles.previewList}>
            {[
              "Escrow capital against a deliverable",
              "Agents collect deployment + usage evidence",
              "Verifiers reach 2-of-3 consensus",
              "Capital releases automatically at quorum",
            ].map((item) => (
              <li key={item} className={styles.previewItem}>
                <Check size={14} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        data-active={active === "fhe-v1"}
        hidden={active !== "fhe-v1"}
      >
        <FheCard variant="v1" />
        <div className={styles.preview}>
          <h4 className={styles.previewTitle}>What you will see</h4>
          <ul className={styles.previewList}>
            {FHE_CARD.v1.checks.map((item) => (
              <li key={item} className={styles.previewItem}>
                <Check size={14} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        data-active={active === "fhe-v2"}
        hidden={active !== "fhe-v2"}
      >
        <FheCard variant="v2" />
        <div className={styles.preview}>
          <h4 className={styles.previewTitle}>What you will see</h4>
          <ul className={styles.previewList}>
            {FHE_CARD.v2.checks.map((item) => (
              <li key={item} className={styles.previewItem}>
                <Check size={14} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function FheCard({ variant }: { variant: "v1" | "v2" }) {
  const card = FHE_CARD[variant];
  return (
    <Link href={card.href} className={styles.demoCard} data-variant="fhe" onClick={() => track(`sandbox_${variant}_click`)}>
      <div className={styles.demoIcon}>
        {variant === "v1" ? <Lock size={20} /> : <Zap size={20} />}
      </div>
      <span className={styles.demoKicker}>{card.kicker}</span>
      <h3 className={styles.demoTitle}>{card.title}</h3>
      <p className={styles.demoBody}>{card.body}</p>
      <span className={styles.demoLink}>
        Open &amp; decrypt <ArrowRight size={14} />
      </span>
    </Link>
  );
}
