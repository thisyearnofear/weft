export default function ProjectLoading() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      minHeight: "100vh",
      padding: "4rem 1rem",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "var(--c-bg-elevated)",
        border: "1px solid var(--c-border-2)",
        borderRadius: "var(--radius-lg)",
        padding: "2rem",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ width: 80, height: 24, background: "var(--c-surface-2)", borderRadius: "var(--radius-xl)", position: "relative", overflow: "hidden" }} />
          <div style={{ width: 120, height: 16, background: "var(--c-surface-2)", borderRadius: 4, position: "relative", overflow: "hidden" }} />
        </div>
        <div style={{ width: "60%", height: 16, background: "var(--c-surface-2)", borderRadius: 4, marginBottom: "1rem" }} />
        <div style={{ width: "100%", height: 16, background: "var(--c-surface-2)", borderRadius: 4, marginBottom: "1rem" }} />
        <div style={{ width: "80%", height: 16, background: "var(--c-surface-2)", borderRadius: 4 }} />
      </div>
    </div>
  );
}
