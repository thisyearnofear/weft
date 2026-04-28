import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      textAlign: "center",
      padding: "2rem",
    }}>
      <h1 style={{
        fontSize: "3rem",
        fontWeight: 800,
        marginBottom: "1rem",
        background: "linear-gradient(135deg, var(--c-accent), #8b5cf6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}>
        404
      </h1>
      <p style={{
        fontSize: "1.125rem",
        color: "var(--c-text-secondary)",
        marginBottom: "2rem",
      }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          padding: "0.75rem 1.5rem",
          background: "var(--c-accent-20)",
          border: "1px solid var(--c-accent)",
          borderRadius: "var(--radius-md)",
          color: "var(--c-text)",
          fontWeight: 600,
          fontSize: "0.875rem",
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
