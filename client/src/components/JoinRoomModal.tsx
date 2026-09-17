import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';

interface JoinRoomModalProps {
  onClose: () => void;
  defaultName: string;
  defaultAvatar: string;
  initialRoomCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  onClose,
  defaultName,
  defaultAvatar,
  initialRoomCode = '',
}) => {
  const { joinRoom, isConnected, errorNotification } = useGame();
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [name, setName] = useState(defaultName || '');
  const [avatar, setAvatar] = useState(defaultAvatar || '🐼');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatars = ['🦊', '🐯', '🐼', '🦁', '🚀', '⚡', '👑', '🎯', '🔥', '💎'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Game server is currently offline or unreachable. Please verify backend is running.');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter the 5-character room code');
      return;
    }
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

    const success = await joinRoom(roomCode.trim().toUpperCase(), name.trim(), avatar);

    setIsSubmitting(false);
    if (!success) {
      setError(errorNotification || 'Could not join room. Verify the code and that the game has not started.');
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
          maxWidth: '460px',
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
          <LogIn color="#06b6d4" size={26} />
          <h2 style={{ fontSize: '26px', fontWeight: 800 }}>Join Game Room</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Enter room code shared by the host to jump into the lobby.
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
          {/* Room Code */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Room Code
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. AB7K9"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              maxLength={5}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '22px',
                fontWeight: 700,
                letterSpacing: '4px',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
              autoFocus
            />
          </div>

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
                    width: '38px',
                    height: '38px',
                    fontSize: '20px',
                    borderRadius: 'var(--radius-sm)',
                    border: avatar === av ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: avatar === av ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.05)',
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
              Your Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Priya, Arun, Sam"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            className="btn btn-success"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '8px', padding: '14px' }}
          >
            {isSubmitting ? 'Joining Room...' : 'Enter Lobby'}
          </button>
        </form>
      </div>
    </div>
  );
};
