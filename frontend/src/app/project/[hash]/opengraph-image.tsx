import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          background: "linear-gradient(135deg, #07070f 0%, #1a1a2e 100%)",
          color: "#e8e8f2",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <span style={{ fontSize: "32px", color: "#60a5fa" }}>&#x2B21;</span>
          <span style={{ fontSize: "24px", fontWeight: 700, background: "linear-gradient(135deg, #60a5fa, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Weft
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div style={{ padding: "6px 16px", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: "999px", color: "#22c55e", fontSize: "14px", fontWeight: 600 }}>
            VERIFIED
          </div>
        </div>

        <div style={{ fontSize: "48px", fontWeight: 700, lineHeight: 1.2, marginBottom: "16px" }}>
          Milestone Verification
        </div>

        <div style={{ fontSize: "20px", color: "#a0aec0", marginBottom: "32px", fontFamily: "monospace" }}>
          {id.length > 20 ? `${id.slice(0, 10)}...${id.slice(-8)}` : id}
        </div>

        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verified on</span>
            <span style={{ fontSize: "16px", color: "#e8e8f2" }}>0G Chain</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.05em" }}>Powered by</span>
            <span style={{ fontSize: "16px", color: "#e8e8f2" }}>Hermes Agent</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
