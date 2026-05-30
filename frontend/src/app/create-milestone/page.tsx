import { CreateMilestoneForm } from "@/components/CreateMilestoneForm";

export default function CreateMilestonePage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at top, rgba(99,102,241,0.14), transparent 28%), radial-gradient(circle at 85% 12%, rgba(34,197,94,0.08), transparent 24%), var(--c-bg)",
      padding: "3rem 1.25rem 5rem",
    }}>
      <div style={{ maxWidth: "540px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1, marginBottom: "0.75rem" }}>
            Create a Milestone
          </h1>
          <p style={{ color: "var(--c-text-secondary)", lineHeight: 1.7, maxWidth: "48ch" }}>
            Define what you will ship, set a deadline, and let verifiers handle the rest.
            When the evidence checks out, the verified release path opens.
          </p>
        </div>

        <div style={{
          background: "rgba(17,17,24,0.9)",
          border: "1px solid var(--c-border)",
          borderRadius: "28px",
          padding: "1.5rem",
          boxShadow: "var(--shadow-lg)",
        }}>
          <CreateMilestoneForm />
        </div>

        <div style={{
          background: "rgba(17,17,24,0.9)",
          border: "1px solid var(--c-border)",
          borderRadius: "28px",
          padding: "1.25rem 1.5rem",
        }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>How it works</h3>
          <ol style={{ color: "var(--c-text-secondary)", lineHeight: 1.8, paddingLeft: "1.25rem", fontSize: "0.9rem" }}>
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
