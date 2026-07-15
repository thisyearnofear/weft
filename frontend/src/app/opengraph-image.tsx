import { ImageResponse } from 'next/og';

export const alt = 'Weft — Milestone release for program offices';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const ACCENT = '#6c6cf5';
const ACCENT_2 = '#8b8ef5';

// A small woven lattice (warp × weft) — the Weft mark, built from divs so
// it renders reliably under Satori (which doesn't draw <svg>).
function WeaveLattice() {
  const N = 7;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const on = (r + c) % 2 === 0;
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: on ? ACCENT : 'rgba(255,255,255,0.08)',
            border: on ? 'none' : '1px solid rgba(255,255,255,0.12)',
          }}
        />
      );
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', width: 7 * 24 + 6 * 8, gap: 8, opacity: 0.92 }}>
      {cells}
    </div>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#181a30',
          color: '#e8e8f2',
          fontFamily: 'sans-serif',
          padding: 80,
          position: 'relative',
        }}
      >
        {/* soft accent glows (solid translucent circles — Satori-safe) */}
        <div
          style={{
            position: 'absolute',
            top: -220,
            left: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'rgba(108,108,245,0.30)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -260,
            right: -200,
            width: 720,
            height: 720,
            borderRadius: 9999,
            background: 'rgba(108,108,245,0.16)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 44 }}>
          <WeaveLattice />
        </div>

        <div
          style={{
            fontSize: 28,
            letterSpacing: 6,
            color: ACCENT_2,
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: 16,
          }}
        >
          Milestone release for program offices
        </div>

        <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>Weft</div>

        <div style={{ fontSize: 38, color: '#e8e8f2', marginTop: 22, fontWeight: 500 }}>
          Fund milestones. Release on evidence.
        </div>

        <div
          style={{
            fontSize: 24,
            color: 'rgba(232,232,242,0.7)',
            marginTop: 18,
            maxWidth: 840,
            textAlign: 'center',
            lineHeight: 1.45,
          }}
        >
          Agents verify checkable deliverables. Canton settles privately for issuers and funders.
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 20,
            color: '#b6c2d4',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 9999,
            padding: '10px 22px',
          }}
        >
          weft.thisyearnofear.com
        </div>
      </div>
    ),
    { ...size }
  );
}
