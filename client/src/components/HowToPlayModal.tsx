import React from 'react';
import { X, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const steps = [
    {
      num: 1,
      title: 'Arrange Numbers 1–25',
      desc: 'Each player receives a 5×5 grid. Fill all 25 cells using numbers 1–25 via sequential clicks, number bank picks, drag-and-drop, or the instant Randomize button.',
    },
    {
      num: 2,
      title: 'Lock Your Board',
      desc: 'Once your 25 numbers are placed with no duplicates, click [LOCK BOARD] to mark yourself ready.',
    },
    {
      num: 3,
      title: 'Turn-Based Calling',
      desc: 'Players take turns calling ONE uncalled number from 1–25. Turns rotate clockwise among all players.',
    },
    {
      num: 4,
      title: 'Global Simultaneous Strike',
      desc: 'When an active player calls a number, that number is instantly struck on EVERY player’s board at the same time!',
    },
    {
      num: 5,
      title: '12 Possible Bingo Lines',
      desc: 'A line is completed when 5 numbers are struck horizontally, vertically, or diagonally (5 rows + 5 columns + 2 diagonals = 12 total lines).',
    },
    {
      num: 6,
      title: 'Spell B → I → N → G → O (5 Lines To Win)',
      desc: 'Single lines do NOT win! Each UNIQUE line unlocks the next letter: 1st line = B (1/5), 2nd = I (2/5), 3rd = N (3/5), 4th = G (4/5), and 5th = O (5/5). The first player to complete 5 unique lines spells BINGO and wins!',
    },
    {
      num: 7,
      title: 'Multiple Winners Continue',
      desc: 'After the 1st winner, gameplay continues so remaining players can finish spelling B-I-N-G-O for 2nd and 3rd place podium spots!',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: 'min(88vh, 88dvh)',
          overflowY: 'auto',
          padding: '24px 20px calc(24px + var(--sab))',
          position: 'relative',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          borderBottomLeftRadius: '0',
          borderBottomRightRadius: '0',
          border: '1px solid var(--border-active)',
          borderBottom: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Close Rules"
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Sparkles color="#8b5cf6" size={26} />
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>How to Play BINGO</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
          Real-time strategic multiplayer Bingo. Not traditional ball-draw Bingo!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {steps.map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  flexShrink: 0,
                }}
              >
                {s.num}
              </div>
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: '#f1f5f9' }}>
                  {s.title}
                </h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            marginBottom: '24px',
          }}
        >
          <ShieldAlert color="#fbbf24" size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', color: '#fef3c7', lineHeight: 1.5 }}>
            <strong>Golden Rule:</strong> Every player arranges a unique 5×5 permutation of numbers 1–25. When any active player calls a number, it strikes across EVERYONE’s card!
          </p>
        </div>

        <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
          <CheckCircle2 size={18} /> Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
