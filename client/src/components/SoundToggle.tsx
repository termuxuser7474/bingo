import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../audio/soundManager.js';

export const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(soundManager.getMuted());

  const handleToggle = () => {
    const isNowMuted = soundManager.toggleMute();
    setMuted(isNowMuted);
  };

  return (
    <button
      onClick={handleToggle}
      className="btn btn-secondary"
      style={{
        padding: '8px 12px',
        fontSize: '14px',
        borderRadius: 'var(--radius-full)',
      }}
      title={muted ? 'Unmute game audio' : 'Mute game audio'}
      aria-label="Toggle Sound"
    >
      {muted ? (
        <>
          <VolumeX size={18} color="#f43f5e" />
          <span style={{ fontSize: '13px', color: '#f43f5e' }}>Muted</span>
        </>
      ) : (
        <>
          <Volume2 size={18} color="#10b981" />
          <span style={{ fontSize: '13px', color: '#10b981' }}>Sound On</span>
        </>
      )}
    </button>
  );
};
