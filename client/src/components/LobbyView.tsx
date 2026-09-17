import React, { useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  Play,
  Grid,
  Crown,
  CheckCircle2,
  Clock,
  LogOut,
  Users,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { SoundToggle } from './SoundToggle.js';

interface LobbyViewProps {
  onPrepareBoard: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({ onPrepareBoard }) => {
  const { room, playerId, isHost, startGame, leaveRoom } = useGame();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  if (!room) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join my BINGO match!',
      text: `Join my real-time BINGO game using room code: ${room.roomCode}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        handleCopyCode();
      }
    } else {
      handleCopyCode();
    }
  };

  const players = room.players;
  const readyCount = players.filter((p) => p.isReady).length;
  const totalPlayers = players.length;
  const canStart = isHost && totalPlayers >= 2 && readyCount === totalPlayers;

  const handleStartGame = async () => {
    setIsStarting(true);
    await startGame();
    setIsStarting(false);
  };

  const myPlayer = players.find((p) => p.id === playerId);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={leaveRoom}
          className="btn btn-secondary"
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          <LogOut size={16} /> Leave Room
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SoundToggle />
        </div>
      </div>

      {/* Room Code Showcase Hero Card */}
      <div
        className="glass-panel"
        style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #10b981)',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '1px',
            marginBottom: '8px',
          }}
        >
          MULTIPLAYER GAME ROOM
        </div>

        {/* Room Code Display */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '10px 0 20px',
          }}
        >
          <div
            style={{
              padding: '8px clamp(12px, 4vw, 24px)',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '2px dashed var(--accent-purple)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(24px, 7.5vw, 36px)',
              fontWeight: 800,
              letterSpacing: 'clamp(3px, 1.5vw, 6px)',
              color: '#ffffff',
              textShadow: '0 0 16px rgba(139, 92, 246, 0.5)',
            }}
          >
            {room.roomCode}
          </div>

          <button
            onClick={handleCopyCode}
            className="btn btn-secondary"
            title="Copy Room Code"
            style={{ padding: '12px', minHeight: '44px', borderRadius: 'var(--radius-md)' }}
          >
            {copied ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
          </button>

          <button
            onClick={handleShare}
            className="btn btn-secondary"
            title="Share Room"
            style={{ padding: '12px', minHeight: '44px', borderRadius: 'var(--radius-md)' }}
          >
            <Share2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
            <Users size={15} color="#06b6d4" /> {totalPlayers} / {room.settings.maxPlayers} Players
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
            <Clock size={15} color="#f59e0b" /> {room.settings.turnTimeoutSeconds > 0 ? `${room.settings.turnTimeoutSeconds}s Timer` : 'No Turn Timer'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8' }}>
            <SettingsIcon size={15} color="#8b5cf6" /> {room.settings.maxWinners} Bingo Winners
          </div>
        </div>
      </div>

      {/* Main Action Banner: Prepare Board */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          background: myPlayer?.isReady
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.15))',
          border: myPlayer?.isReady
            ? '1px solid rgba(16, 185, 129, 0.3)'
            : '1px solid rgba(139, 92, 246, 0.3)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>
            {myPlayer?.isReady ? '🎉 Board Complete & Locked!' : '📋 Step 1: Arrange Your 5×5 Board'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {myPlayer?.isReady
              ? 'You are ready! Waiting for other players before the host starts the countdown.'
              : 'Place numbers 1–25 into your custom grid before the game can begin.'}
          </p>
        </div>

        <button
          onClick={onPrepareBoard}
          className={myPlayer?.isReady ? 'btn btn-secondary' : 'btn btn-primary'}
          style={{ padding: '14px 28px', fontSize: '15px' }}
        >
          <Grid size={18} /> {myPlayer?.isReady ? 'Modify Board' : 'PREPARE BOARD'}
        </button>
      </div>

      {/* Players List & Status */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#8b5cf6" /> Players in Lobby
          </h3>

          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: readyCount === totalPlayers && totalPlayers >= 2
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
              color: readyCount === totalPlayers && totalPlayers >= 2 ? '#34d399' : '#fbbf24',
              border: `1px solid ${readyCount === totalPlayers && totalPlayers >= 2 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            {readyCount} / {totalPlayers} Players Ready
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
          {players.map((p) => {
            const isMe = p.id === playerId;
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: isMe ? 'rgba(139, 92, 246, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                  border: isMe ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px' }}>{p.avatar}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {p.name}
                      {isMe && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(You)</span>}
                    </div>
                    {p.isHost && (
                      <span className="badge badge-host" style={{ marginTop: '4px' }}>
                        <Crown size={11} /> HOST
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  {p.isReady ? (
                    <span className="badge badge-ready">
                      <CheckCircle2 size={12} /> READY
                    </span>
                  ) : (
                    <span className="badge badge-waiting">Setting Board</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Host Start Control Banner */}
        {isHost && (
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className="btn btn-success"
              style={{
                width: '100%',
                maxWidth: '360px',
                padding: '16px',
                fontSize: '17px',
              }}
            >
              <Play size={20} fill="#ffffff" />
              {isStarting ? 'Starting...' : 'START GAME'}
            </button>

            {!canStart && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>
                {totalPlayers < 2
                  ? 'Waiting for at least 1 more player to join...'
                  : 'Waiting for all players to complete and lock their boards...'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
