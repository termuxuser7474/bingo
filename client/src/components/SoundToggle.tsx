import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager.js';

interface SoundToggleProps {
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ compact = false, className = '', style }) => {
  const [muted, setMuted] = useState(soundManager.getMuted());

  const handleToggle = () => {
    const isNowMuted = soundManager.toggleMute();
    setMuted(isNowMuted);
  };

  return (
    <button
      onClick={handleToggle}
      className={`btn btn-secondary ${className}`}
      style={{
        padding: compact ? '0 8px' : '0 10px',
        fontSize: '12px',
        borderRadius: 'var(--radius-full)',
        minHeight: '34px',
        height: '34px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        flexShrink: 0,
        boxSizing: 'border-box',
        ...style,
      }}
      title={muted ? 'Unmute game audio' : 'Mute game audio'}
      aria-label={muted ? 'Unmute game audio' : 'Mute game audio'}
    >
      {muted ? (
        <>
          <VolumeX size={16} color="#f43f5e" />
          {!compact && (
            <span className="sound-toggle-label" style={{ fontSize: '12px', color: '#f43f5e', fontWeight: 600 }}>
              Muted
            </span>
          )}
        </>
      ) : (
        <>
          <Volume2 size={16} color="#10b981" />
          {!compact && (
            <span className="sound-toggle-label" style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              Sound On
            </span>
          )}
        </>
      )}
    </button>
  );
};
