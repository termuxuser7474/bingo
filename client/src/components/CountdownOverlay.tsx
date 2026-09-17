import React from 'react';

interface CountdownOverlayProps {
  count: number; // 3, 2, 1, or 0 (0 = "BINGO!")
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ count }) => {
  const text = count === 0 ? 'BINGO!' : String(count);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        key={text}
        style={{
          fontSize: count === 0 ? 'clamp(64px, 15vw, 120px)' : 'clamp(96px, 20vw, 160px)',
          fontWeight: 900,
          fontFamily: 'var(--font-display)',
          letterSpacing: '4px',
          background:
            count === 0
              ? 'linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444)'
              : 'linear-gradient(135deg, #8b5cf6, #38bdf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 60px rgba(139, 92, 246, 0.6)',
          animation: 'scalePulse 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {text}
      </div>

      <div
        style={{
          marginTop: '16px',
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        {count === 0 ? 'Match Starting!' : 'Get Ready'}
      </div>

      <style>{`
        @keyframes scalePulse {
          0% {
            transform: scale(0.4);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
