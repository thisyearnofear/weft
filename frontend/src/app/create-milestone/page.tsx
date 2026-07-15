import Link from "next/link";
import { AgentBriefWizard } from "@/components/AgentBriefWizard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import styles from "./page.module.css";

export default function CreateMilestonePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <Breadcrumbs items={[{ label: "Builder create" }]} />
        <div>
          <h1 className={styles.heading}>
            Builder wedge · 0G Testnet
          </h1>
          <p className={styles.subtitle}>
            Crypto-native demo path: brief the agent on a checkable software
            milestone (deployment + usage). Agents collect evidence and reach
            quorum on 0G Testnet — not production money. Program offices should
            start on the{" "}
            <Link href="/canton">program ops</Link> instead.
          </p>
        </div>

        <div className={styles.formCard}>
          <AgentBriefWizard />
        </div>
      </div>
    </main>
  );
}
