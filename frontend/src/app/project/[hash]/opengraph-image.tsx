import { ImageResponse } from "next/og";
import { resolveMilestoneMeta, shortHash } from "../../../lib/milestone-meta";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const meta = resolveMilestoneMeta(hash);

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
          background: "linear-gradient(135deg, #07070f 0%, #14142d 100%)",
          color: "#e8e8f2",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <span style={{ fontSize: "32px", color: "#818cf8" }}>&#x2B21;</span>
          <span style={{ fontSize: "24px", fontWeight: 700, color: "#818cf8" }}>Weft</span>
          <span style={{ fontSize: "16px", color: "#8892a4", marginLeft: "8px" }}>
            escrow that releases itself
          </span>
        </div>

        <div
          style={{
            fontSize: "58px",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "18px",
            letterSpacing: "-0.02em",
          }}
        >
          {meta.name}
        </div>

        {meta.promise ? (
          <div style={{ display: "flex", fontSize: "22px", color: "#a0aec0", marginBottom: "28px", maxWidth: "900px" }}>
            &ldquo;{meta.promise}&rdquo;
          </div>
        ) : (
          <div style={{ fontSize: "20px", color: "#a0aec0", marginBottom: "28px" }}>
            Capital locked behind a deliverable — released by autonomous verifier consensus.
          </div>
        )}

        <div style={{ display: "flex", gap: "36px", alignItems: "center" }}>
          <div
            style={{
              padding: "8px 18px",
              background: "rgba(99, 102, 241, 0.14)",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "999px",
              color: "#a5b4fc",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            Sealed-ballot verification · Zama FHE
          </div>
          <span style={{ fontSize: "16px", color: "#8892a4", fontFamily: "monospace" }}>
            {shortHash(hash, 10, 8)}
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
