import { ImageResponse } from 'next/og';
import { getWidget } from '@/app/lib/store';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Game on I Need a Distraction';

type RouteParams = { id: string };

export default async function OGImage({ params }: { params: Promise<RouteParams> }) {
  const { id } = await params;
  const widget = await getWidget(id);

  if (!widget) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0612',
            fontSize: 64,
            fontWeight: 700,
            color: '#a855f7',
          }}
        >
          I Need a Distraction
        </div>
      ),
      size,
    );
  }

  const titleLen = widget.title.length;
  const titleSize = titleLen > 28 ? 64 : titleLen > 18 ? 84 : 110;
  const authorText =
    widget.author && widget.type === 'user-created' && widget.author.toLowerCase() !== 'me'
      ? `by ${widget.author}`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #1e0838 0%, #0a0612 50%, #2a0a3a 100%)',
          padding: '60px 72px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Soft purple glow blobs for vibe */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 380,
            height: 380,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(168,85,247,0.35) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(236,72,153,0.30) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Brand — top left */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 24,
            fontWeight: 600,
            color: '#c084fc',
            letterSpacing: '-0.01em',
            zIndex: 10,
          }}
        >
          ⚡ ineedadistraction
        </div>

        {/* Center: emoji + title */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            zIndex: 10,
            padding: '0 40px',
          }}
        >
          <div
            style={{
              fontSize: 180,
              lineHeight: 1,
              marginBottom: 16,
              display: 'flex',
            }}
          >
            {widget.emoji || '🎮'}
          </div>
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              display: 'flex',
              maxWidth: 1000,
              textAlign: 'center',
            }}
          >
            {widget.title}
          </div>
          {authorText && (
            <div
              style={{
                marginTop: 18,
                fontSize: 28,
                color: '#c084fc',
                fontWeight: 500,
                display: 'flex',
              }}
            >
              {authorText}
            </div>
          )}
        </div>

        {/* Footer: play CTA + domain */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              color: '#ffffff',
              padding: '12px 22px',
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 700,
              boxShadow: '0 10px 30px -10px rgba(168,85,247,0.5)',
            }}
          >
            ▶ Play free
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#9ca3af' }}>
            ineedadistraction.com
          </div>
        </div>
      </div>
    ),
    size,
  );
}
