"use client";

import Link from "next/link";
import { AgentBriefWizard } from "@/components/AgentBriefWizard";
import { AgentHelper } from "@/components/AgentHelper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import styles from "./page.module.css";

const FAQS = [
  { q: "What am I actually creating?", a: "A milestone escrow contract on 0G Testnet. You stake capital behind a deliverable; when the deadline passes, the agent verifies the work and releases funds if the evidence checks out." },
  { q: "Do I need a sponsor?", a: "No. You can create a milestone with zero stake. If the agent verifies your work, you still get a permanent proof tied to your ENS name — useful for reputation even without funding." },
  { q: "What evidence does the agent check?", a: "Three signals: (1) contract code exists at the stated address, (2) unique callers exceeded the threshold in the measurement window, (3) GitHub commits/PRs in the milestone window. The verdict is deterministic, not LLM-judged." },
  { q: "Can I verify non-EVM work?", a: "Yes. Choose a verification template when you create the milestone: EVM deployment + usage, research report, marketing campaign, or data pipeline. Each template tells the agent exactly which evidence to collect." },
  { q: "What does 'sealed-ballot' mean?", a: "When you choose Confidential mode, verifier agents encrypt their votes with Zama FHE before submitting. The contract tallies homomorphically — no individual vote is ever decrypted, only the final consensus result." },
  { q: "Is this real money?", a: "No. This runs on 0G Testnet (public EVM) and Sepolia (FHE). Any ETH staked is testnet ETH. Program officers managing real grants should use program ops instead." },
];

export default function CreateMilestonePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <Breadcrumbs items={[{ label: "Builder create" }]} />
        <div>
          <h1 className={styles.heading}>
            Create a milestone
          </h1>
          <p className={styles.subtitle}>
            Tell the agent what you&apos;ll ship. It watches for evidence,
            reaches quorum, and signs the verdict onchain. You get a portable
            proof of work — with or without a sponsor. Running on 0G Testnet,
            so no real money is at stake.{" "}
            <Link href="/canton">Program offices start here instead.</Link>
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.formCard}>
            <AgentBriefWizard />
          </div>
          <div className={styles.helperCol}>
            <AgentHelper faqs={FAQS} context="create-milestone" />
          </div>
        </div>
      </div>
    </main>
  );
}
