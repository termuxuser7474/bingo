import React, { useState } from 'react';
import { PlusCircle, LogIn, HelpCircle, Gamepad2, Zap, Trophy, Grid } from 'lucide-react';
import { CreateRoomModal } from './CreateRoomModal.js';
import { JoinRoomModal } from './JoinRoomModal.js';
import { HowToPlayModal } from './HowToPlayModal.js';
import { SoundToggle } from './SoundToggle.js';

export const LandingPage: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('bingo_player_name') || '';
    } catch {
      return '';
    }
  });

  const [avatar, setAvatar] = useState(() => {
    try {
      return localStorage.getItem('bingo_avatar') || '🦊';
    } catch {
      return '🦊';
    }
  });

  const handleNameChange = (val: string) => {
    setPlayerName(val);
    try {
      localStorage.setItem('bingo_player_name', val);
    } catch {
      // ignore
    }
  };

  const handleAvatarChange = (val: string) => {
    setAvatar(val);
    try {
      localStorage.setItem('bingo_avatar', val);
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 20px',
        position: 'relative',
      }}
    >
      {/* Top Navbar */}
      <header
        style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-purple)',
            }}
          >
            <Gamepad2 size={24} color="#ffffff" />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}>BINGO</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '14px', borderRadius: 'var(--radius-full)' }}
          >
            <HelpCircle size={16} /> How to Play
          </button>
          <SoundToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main
        style={{
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          margin: 'auto 0',
        }}
      >
        {/* Animated Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 700,
            color: '#c4b5fd',
            marginBottom: '20px',
          }}
        >
          <Zap size={15} color="#8b5cf6" /> REAL-TIME MULTIPLAYER
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(52px, 9vw, 84px)',
            fontWeight: 900,
            letterSpacing: '3px',
            lineHeight: 1,
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ffffff 30%, #a78bfa 70%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
          }}
        >
          BINGO
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(18px, 3.5vw, 24px)',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '1px',
            marginBottom: '36px',
          }}
        >
          “Fill. Call. Strike. BINGO.”
        </p>

        {/* Main Action Glass Card */}
        <div
          className="glass-panel"
          style={{
            width: '100%',
            padding: 'clamp(20px, 5vw, 36px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Quick player identity bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '26px' }}>{avatar}</div>
            <input
              type="text"
              placeholder="Your Player Name"
              value={playerName}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={20}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-main)',
                fontSize: '16px',
                fontWeight: 600,
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
            }}
          >
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary"
              style={{ minHeight: '48px', padding: '14px', fontSize: '15px', borderRadius: 'var(--radius-md)' }}
            >
              <PlusCircle size={18} /> CREATE GAME
            </button>

            <button
              onClick={() => setShowJoin(true)}
              className="btn btn-secondary"
              style={{ padding: '16px', fontSize: '16px', borderRadius: 'var(--radius-md)' }}
            >
              <LogIn size={20} /> JOIN GAME
            </button>
          </div>
        </div>

        {/* Feature Pill Highlights */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '32px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
            <Grid size={16} color="#06b6d4" /> 5×5 Custom Board
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
            <Zap size={16} color="#8b5cf6" /> Live Simultaneous Strike
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
            <Trophy size={16} color="#f59e0b" /> Multi-Winner Podium
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ marginTop: '24px', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
        Production-quality multiplayer BINGO • Real-time Socket.IO Engine
      </footer>

      {/* Modals */}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          defaultName={playerName}
          defaultAvatar={avatar}
        />
      )}

      {showJoin && (
        <JoinRoomModal
          onClose={() => setShowJoin(false)}
          defaultName={playerName}
          defaultAvatar={avatar}
        />
      )}

      {showHowToPlay && <HowToPlayModal onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
};
