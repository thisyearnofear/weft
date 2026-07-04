import { CreateMilestoneForm } from "@/components/CreateMilestoneForm";
import styles from "./page.module.css";

export default function CreateMilestonePage() {
  return (
    <main className={styles.main}>
      <div className={styles.shell}>
        <div>
          <h1 className={styles.heading}>
            Create a milestone
          </h1>
          <p className={styles.subtitle}>
            Define what you will ship, set a deadline, and let verifiers handle the rest.
            When the evidence checks out, the verified release path opens.
          </p>
        </div>

        <div className={styles.formCard}>
          <CreateMilestoneForm />
        </div>

        <div className={styles.guideCard}>
          <h3 className={styles.guideTitle}>How it works</h3>
          <ol className={styles.guideList}>
            <li>You define the milestone and stake your reputation</li>
            <li>Sponsors stake ETH behind your milestone</li>
            <li>You ship the work before the deadline</li>
            <li>Verifiers check evidence and submit verdicts</li>
            <li>Capital releases when the outcome is confirmed</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
