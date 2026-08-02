import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'I Need a Distraction — AI brain games you can build and remix in seconds';

// Site-wide default OG image (homepage / dashboard / any page without its own).
export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e0838 0%, #0a0612 50%, #2a0a3a 100%)',
          padding: '72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute', top: -140, right: -120, width: 420, height: 420, borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(168,85,247,0.38) 0%, transparent 70%)', display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: -120, left: -100, width: 360, height: 360, borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(251,146,60,0.28) 0%, transparent 70%)', display: 'flex',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', fontSize: 26, fontWeight: 600, color: '#c084fc', zIndex: 10 }}>
          ⚡ ineedadistraction
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
          <div
            style={{
              fontSize: 92, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em',
              lineHeight: 1.02, display: 'flex', flexWrap: 'wrap', maxWidth: 1040,
            }}
          >
            Brain games you build & remix.
          </div>
          <div style={{ marginTop: 26, fontSize: 38, color: '#e9d5ff', fontWeight: 500, display: 'flex', maxWidth: 960 }}>
            Describe a clever little game — AI builds it in 60 seconds. Play, remix, share.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', color: '#ffffff',
              padding: '14px 26px', borderRadius: 999, fontSize: 27, fontWeight: 700,
              boxShadow: '0 10px 30px -10px rgba(168,85,247,0.5)',
            }}
          >
            ✨ Create a game
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#9ca3af' }}>ineedadistraction.com</div>
        </div>
      </div>
    ),
    size,
  );
}
