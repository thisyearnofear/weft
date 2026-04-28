export default function BuilderLoading() {
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
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-surface-2)" }} />
          <div>
            <div style={{ width: 140, height: 20, background: "var(--c-surface-2)", borderRadius: 4, marginBottom: 8 }} />
            <div style={{ width: 200, height: 12, background: "var(--c-surface-2)", borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ width: "100%", height: 14, background: "var(--c-surface-2)", borderRadius: 4, marginBottom: 8 }} />
        <div style={{ width: "70%", height: 14, background: "var(--c-surface-2)", borderRadius: 4, marginBottom: "1.5rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "1rem 0", borderTop: "1px solid var(--c-border-2)", borderBottom: "1px solid var(--c-border-2)" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: 40, height: 20, background: "var(--c-surface-2)", borderRadius: 4 }} />
              <div style={{ width: 60, height: 12, background: "var(--c-surface-2)", borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
