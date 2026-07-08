"use client";

import { Bot } from "lucide-react";
import styles from "./AutonomousFlow.module.css";

type Variant = "v1" | "v2";

const STEPS: Record<Variant, { num: string; title: string; body: string }[]> = {
  v1: [
    {
      num: "01",
      title: "Poll",
      body: "The daemon watches the contract for milestones past their deadline. When it finds one, it reads the metadata hash from 0G Storage to learn what to verify — contract address, unique-caller threshold, measurement window.",
    },
    {
      num: "02",
      title: "Collect evidence",
      body: "It checks if the contract is deployed (eth_getCode), counts unique callers in the measurement window, and optionally pulls GitHub commits. The evidence is deterministic — same inputs, same verdict, every time.",
    },
    {
      num: "03",
      title: "Encrypt the verdict",
      body: "The daemon calls the Zama relayer SDK to encrypt its ballot as an euint32. The vote leaves the process as ciphertext — no readable value in the transaction calldata.",
    },
    {
      num: "04",
      title: "Submit sealed ballot",
      body: "The encrypted handle + Zama proof are submitted onchain via submitVerdict. The transaction is visible on Etherscan — but no one can read the vote from the calldata.",
    },
    {
      num: "05",
      title: "Homomorphic tally",
      body: "The contract adds encrypted votes (FHE.add) and checks quorum on ciphertext (FHE.ge, FHE.select). Only the final boolean is made decryptable, and only after all ballots are cast.",
    },
    {
      num: "06",
      title: "Release & earn",
      body: "When quorum is reached, the contract releases ETH to the builder. The agent earns 3% — swept into its Stripe operating balance to pay for its own infrastructure. ENS reputation is updated.",
    },
  ],
  v2: [
    {
      num: "01",
      title: "Poll",
      body: "The daemon watches the contract for milestones past their deadline. When it finds one, it reads the metadata hash from 0G Storage to learn what to verify — contract address, unique-caller threshold, measurement window.",
    },
    {
      num: "02",
      title: "Collect evidence",
      body: "It checks if the contract is deployed (eth_getCode), counts unique callers in the measurement window, and optionally pulls GitHub commits. The evidence is deterministic — same inputs, same verdict, every time.",
    },
    {
      num: "03",
      title: "Encrypt ballot + confidence",
      body: "The daemon encrypts both a boolean ballot AND a confidence score (1–100) derived from evidence strength — deployment confirmed, callers above threshold, margin of victory. Two euint32 values, one Zama proof.",
    },
    {
      num: "04",
      title: "Submit weighted ballot",
      body: "Both encrypted handles are submitted onchain via submitWeightedVerdict. The transaction is visible on Etherscan — but no one can read the vote or the confidence score from the calldata.",
    },
    {
      num: "05",
      title: "Homomorphic tally",
      body: "The contract multiplies ballot × confidence (FHE.mul), accumulates the weighted tally (FHE.add), and checks both binary quorum AND weighted quorum (FHE.ge, FHE.and). All on ciphertext.",
    },
    {
      num: "06",
      title: "Release & earn",
      body: "When both quorum gates pass, the contract releases ETH to the builder. The agent earns 3% — swept into its Stripe operating balance to pay for its own infrastructure. ENS reputation is updated.",
    },
  ],
};

export function AutonomousFlow({ variant = "v1" }: { variant?: Variant }) {
  const steps = STEPS[variant];

  return (
    <article className={styles.flowPanel}>
      <div className={styles.flowHeader}>
        <div>
          <span className={styles.flowKicker}>Autonomous verification</span>
          <h3 className={styles.flowTitle}>No one approves anything</h3>
        </div>
        <Bot size={18} className={styles.flowKicker} />
      </div>
      <p className={styles.flowLede}>
        A Python daemon polls milestones past their deadline, collects evidence
        from onchain signals, encrypts its verdict, and submits a sealed ballot —
        all without human intervention. Here&apos;s what happens inside one
        verification cycle.
      </p>
      <div className={styles.flowGrid}>
        {steps.map((step) => (
          <div key={step.num} className={styles.flowStep}>
            <span className={styles.flowNum}>{step.num}</span>
            <h4 className={styles.flowStepTitle}>{step.title}</h4>
            <p className={styles.flowStepBody}>{step.body}</p>
          </div>
        ))}
      </div>

      <div className={styles.problemSolution}>
        <div className={styles.problemCard}>
          <span className={`${styles.psKicker} ${styles.psKickerProblem}`}>
            Without FHE
          </span>
          <h4 className={styles.psTitle}>Verifier herding</h4>
          <p className={styles.psBody}>
            When votes are public, the third verifier watches the first two
            and free-rides on their judgment instead of independently checking
            the evidence. Late voters are structurally lazy voters. You
            can&apos;t fix this with incentives — only with cryptography.
          </p>
        </div>
        <div className={styles.solutionCard}>
          <span className={`${styles.psKicker} ${styles.psKickerSolution}`}>
            With Zama FHE
          </span>
          <h4 className={styles.psTitle}>Sealed-ballot consensus</h4>
          <p className={styles.psBody}>
            Each agent encrypts its vote in its own process. The contract
            tallies homomorphically — arithmetic, comparison, and{" "}
            {variant === "v2" ? "multiplication" : "addition"} on data it can
            never read. No agent can see another&apos;s vote before quorum.
            Independence isn&apos;t a policy. It&apos;s math.
          </p>
        </div>
      </div>
    </article>
  );
}
