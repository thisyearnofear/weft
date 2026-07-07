import { AgentBriefWizard } from "@/components/AgentBriefWizard";
import styles from "./page.module.css";

export default function CreateMilestonePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <div>
          <h1 className={styles.heading}>
            Brief the agent
          </h1>
          <p className={styles.subtitle}>
            Tell the Weft agent what you&apos;ll ship. It will watch for your work,
            collect evidence, reach consensus with two other verifier nodes, and
            mint a proof to your ENS name — autonomously.
          </p>
        </div>

        <div className={styles.formCard}>
          <AgentBriefWizard />
        </div>
      </div>
    </main>
  );
}
