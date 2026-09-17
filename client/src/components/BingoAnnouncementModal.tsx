import React from 'react';
import { Trophy, Sparkles, X } from 'lucide-react';
import { ConfettiEffect } from './ConfettiEffect.js';

interface BingoAnnouncementProps {
  announcement: {
    playerId: string;
    playerName: string;
    avatar: string;
    rank: number;
    totalLines: number;
    newLines: { id: string; type: string }[];
    scoreAwarded: number;
  };
  onClose: () => void;
}

export const BingoAnnouncementModal: React.FC<BingoAnnouncementProps> = ({
  announcement,
  onClose,
}) => {
  const rankSuffix = (r: number) => {
    if (r === 1) return '1st';
    if (r === 2) return '2nd';
    if (r === 3) return '3rd';
    return `${r}th`;
  };

  return (
    <>
      <ConfettiEffect />
      <div
        style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 300,
          width: '90%',
          maxWidth: '560px',
          pointerEvents: 'auto',
          animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '20px 26px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(139, 92, 246, 0.25))',
            border: '2px solid #fbbf24',
            boxShadow: '0 10px 40px rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '38px' }}>{announcement.avatar}</div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '20px',
                  fontWeight: 900,
                  color: '#fbbf24',
                }}
              >
                <Sparkles size={22} />
                <span>🎉 BINGO!</span>
                {announcement.rank > 0 && (
                  <span
                    style={{
                      background: 'rgba(251, 191, 36, 0.2)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#fef08a',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                    }}
                  >
                    {rankSuffix(announcement.rank)} Winner
                  </span>
                )}
              </div>

              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                {announcement.playerName} spelled B-I-N-G-O!
              </div>

              <div style={{ display: 'flex', gap: '4px', margin: '4px 0', alignItems: 'center' }}>
                {(['B', 'I', 'N', 'G', 'O'] as const).map((letter) => (
                  <span
                    key={letter}
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(251, 191, 36, 0.25)',
                      border: '1px solid #fbbf24',
                      borderRadius: '4px',
                      fontFamily: 'var(--font-display)',
                      fontSize: '11px',
                      fontWeight: 900,
                      color: '#fbbf24',
                    }}
                  >
                    {letter} ✓
                  </span>
                ))}
                <span style={{ fontSize: '12px', color: '#fef08a', fontWeight: 700, marginLeft: '4px' }}>
                  5 / 5 LINES
                </span>
              </div>

              <div style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '2px' }}>
                +{announcement.scoreAwarded} points awarded
              </div>

            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translate(-50%, -30px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        `}</style>
      </div>
    </>
  );
};
