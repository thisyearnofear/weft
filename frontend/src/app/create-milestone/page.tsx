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
            No sponsor required — verification runs either way, and every verified
            outcome mints portable reputation to your ENS name.
          </p>
        </div>

        <div className={styles.formCard}>
          <CreateMilestoneForm />
        </div>

        <div className={styles.guideCard}>
          <h3 className={styles.guideTitle}>How it works</h3>
          <ol className={styles.guideList}>
            <li>You define the milestone — free, no sponsor needed</li>
            <li>Sponsors can stake ETH behind it any time before the deadline (optional)</li>
            <li>You ship the work before the deadline</li>
            <li>Verifiers check evidence and submit verdicts</li>
            <li>Verified: the proof mints to your ENS reputation — and any staked capital releases to you the same moment</li>
          </ol>
          <p className={styles.guideNote}>
            No sponsor yet? Run it anyway. A verified milestone with zero stake still
            earns you a permanent, portable proof that you shipped — the fastest way
            to make your next milestone worth funding.
          </p>
        </div>
      </div>
    </main>
  );
}
