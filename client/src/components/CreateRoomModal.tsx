import React, { useState } from 'react';
import { X, Sparkles, Users, Trophy, Clock, Volume2 } from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';

interface CreateRoomModalProps {
  onClose: () => void;
  defaultName: string;
  defaultAvatar: string;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  onClose,
  defaultName,
  defaultAvatar,
}) => {
  const { createRoom } = useGame();
  const [name, setName] = useState(defaultName || '');
  const [avatar, setAvatar] = useState(defaultAvatar || '🦊');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [maxWinners, setMaxWinners] = useState(3);
  const [turnTimeout, setTurnTimeout] = useState(30);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatars = ['🦊', '🐯', '🐼', '🦁', '🚀', '⚡', '👑', '🎯', '🔥', '💎'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your player name');
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 20) {
      setError('Player name must be 2 to 20 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await createRoom(name.trim(), avatar, {
      maxPlayers,
      maxWinners,
      turnTimeoutSeconds: turnTimeout,
      soundEnabled,
    });

    setIsSubmitting(false);
    if (!success) {
      setError('Could not create game room. Check your connection.');
    }
  };

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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: 'min(90vh, 90dvh)',
          overflowY: 'auto',
          padding: 'clamp(20px, 4vw, 32px)',
          position: 'relative',
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
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Sparkles color="#8b5cf6" size={26} />
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Create Game Room</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Configure your multiplayer match rules and invite friends!
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '14px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Avatar selector */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Choose Avatar
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatar(av)}
                  style={{
                    width: '42px',
                    height: '42px',
                    fontSize: '22px',
                    borderRadius: 'var(--radius-sm)',
                    border: avatar === av ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                    background: avatar === av ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Name input */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Host Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Rahul, Alex, Champion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
          </div>

          {/* Settings Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Users size={14} color="#06b6d4" /> Max Players
              </label>
              <select
                className="input-field"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                style={{ cursor: 'pointer' }}
              >
                {[2, 3, 4, 5, 6, 8, 10].map((num) => (
                  <option key={num} value={num} style={{ background: '#121927' }}>
                    {num} Players
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Trophy size={14} color="#f59e0b" /> Bingo Winners
              </label>
              <select
                className="input-field"
                value={maxWinners}
                onChange={(e) => setMaxWinners(Number(e.target.value))}
                style={{ cursor: 'pointer' }}
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w} style={{ background: '#121927' }}>
                    {w} {w === 1 ? 'Winner' : 'Winners'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Clock size={14} color="#8b5cf6" /> Turn Timer
              </label>
              <select
                className="input-field"
                value={turnTimeout}
                onChange={(e) => setTurnTimeout(Number(e.target.value))}
                style={{ cursor: 'pointer' }}
              >
                <option value={0} style={{ background: '#121927' }}>No Timer</option>
                <option value={15} style={{ background: '#121927' }}>15 seconds</option>
                <option value={30} style={{ background: '#121927' }}>30 seconds (Default)</option>
                <option value={45} style={{ background: '#121927' }}>45 seconds</option>
                <option value={60} style={{ background: '#121927' }}>60 seconds</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <Volume2 size={14} color="#10b981" /> Sound Effects
              </label>
              <select
                className="input-field"
                value={soundEnabled ? 'true' : 'false'}
                onChange={(e) => setSoundEnabled(e.target.value === 'true')}
                style={{ cursor: 'pointer' }}
              >
                <option value="true" style={{ background: '#121927' }}>Enabled</option>
                <option value="false" style={{ background: '#121927' }}>Muted</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
          >
            {isSubmitting ? 'Creating Room...' : 'Create & Enter Room'}
          </button>
        </form>
      </div>
    </div>
  );
};
