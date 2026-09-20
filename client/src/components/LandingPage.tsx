import React, { useState } from 'react';
import { PlusCircle, LogIn, HelpCircle, Gamepad2, Zap, Trophy, Grid, Wifi, WifiOff } from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { CreateRoomModal } from './CreateRoomModal.js';
import { JoinRoomModal } from './JoinRoomModal.js';
import { HowToPlayModal } from './HowToPlayModal.js';
import { SoundToggle } from './SoundToggle.js';

export const LandingPage: React.FC = () => {
  const { isConnected, connectionDiagnostic } = useGame();
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
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-purple)',
            }}
          >
            <Gamepad2 size={22} color="#ffffff" />
          </div>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '1px' }}>BINGO</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '5px 10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${isConnected ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: isConnected ? '#4ade80' : '#f87171',
              transition: 'all 0.3s ease',
            }}
            title={isConnected ? 'Connected to game server' : 'Backend server offline or unreachable'}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                boxShadow: isConnected ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                display: 'inline-block',
              }}
            />
            {isConnected ? 'Online' : 'Offline'}
          </div>

          <button
            onClick={() => setShowHowToPlay(true)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: 'var(--radius-full)', minHeight: '36px' }}
          >
            <HelpCircle size={15} /> Guide
          </button>
          <SoundToggle />
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isConnected && (
        <div
          role="alert"
          style={{
            width: '100%',
            maxWidth: '680px',
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor:
              connectionDiagnostic?.status === 'failed'
                ? 'rgba(245, 158, 11, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              connectionDiagnostic?.status === 'failed'
                ? 'rgba(245, 158, 11, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'
            }`,
            borderRadius: 'var(--radius-md)',
            color: connectionDiagnostic?.status === 'failed' ? '#fcd34d' : '#fca5a5',
            fontSize: '13px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <WifiOff
              size={18}
              style={{
                flexShrink: 0,
                color: connectionDiagnostic?.status === 'failed' ? '#f59e0b' : '#ef4444',
              }}
            />
            <div style={{ fontWeight: 700 }}>Backend Server Not Connected!</div>
            <span
              style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                backgroundColor:
                  connectionDiagnostic?.status === 'failed'
                    ? 'rgba(245, 158, 11, 0.25)'
                    : 'rgba(239, 68, 68, 0.25)',
                color: connectionDiagnostic?.status === 'failed' ? '#fbbf24' : '#f87171',
              }}
            >
              {connectionDiagnostic?.status === 'unreachable'
                ? 'BACKEND UNREACHABLE'
                : connectionDiagnostic?.status === 'failed'
                ? 'SOCKET.IO CONNECTION FAILED'
                : 'CONNECTING...'}
            </span>
          </div>
          <div style={{ fontSize: '12px', opacity: 0.95, lineHeight: 1.5 }}>
            {connectionDiagnostic?.detail || 'Connecting to multiplayer backend server...'}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8, fontFamily: 'monospace' }}>
            Target URL: {connectionDiagnostic?.serverUrl || '(same origin / local proxy)'}
          </div>
        </div>
      )}

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
