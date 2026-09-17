import React, { useState } from 'react';
import { X, Check, Megaphone, AlertCircle } from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { soundManager } from '../audio/soundManager.js';

interface NumberCallModalProps {
  onClose: () => void;
  initialSelectedNumber?: number | null;
}

export const NumberCallModal: React.FC<NumberCallModalProps> = ({
  onClose,
  initialSelectedNumber = null,
}) => {
  const { room, callNumber } = useGame();
  const [candidate, setCandidate] = useState<number | null>(initialSelectedNumber);
  const [isCalling, setIsCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!room) return null;

  const calledSet = new Set(room.calledNumbers);

  const handleSelect = (num: number) => {
    if (calledSet.has(num)) return;
    soundManager.playClick();
    setCandidate(num);
    setError(null);
  };

  const handleConfirmCall = async () => {
    if (candidate === null) return;
    setIsCalling(true);
    setError(null);

    const success = await callNumber(candidate);
    setIsCalling(false);

    if (success) {
      onClose();
    } else {
      setError(`Failed to call number ${candidate}. It may have already been called or your turn ended.`);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
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
          <Megaphone color="#10b981" size={26} />
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Choose a Number to Call</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          This number will be struck on EVERY player’s board across the entire match!
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#fca5a5',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* 1..25 Number Palette */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            marginBottom: '24px',
          }}
        >
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const isAlreadyCalled = calledSet.has(num);
            const isSelected = candidate === num;

            return (
              <button
                key={num}
                type="button"
                onClick={() => handleSelect(num)}
                disabled={isAlreadyCalled}
                style={{
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  fontWeight: 800,
                  borderRadius: 'var(--radius-sm)',
                  cursor: isAlreadyCalled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  border: isSelected
                    ? '2px solid #10b981'
                    : isAlreadyCalled
                    ? '1px solid rgba(255, 255, 255, 0.05)'
                    : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'rgba(16, 185, 129, 0.25)'
                    : isAlreadyCalled
                    ? 'rgba(15, 23, 42, 0.4)'
                    : 'rgba(28, 38, 59, 0.7)',
                  color: isSelected ? '#34d399' : isAlreadyCalled ? 'rgba(255, 255, 255, 0.25)' : '#ffffff',
                  boxShadow: isSelected ? '0 0 16px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                {num}
                {isAlreadyCalled && <Check size={12} color="#94a3b8" />}
              </button>
            );
          })}
        </div>

        {/* Confirmation Action Area */}
        {candidate !== null ? (
          <div
            style={{
              padding: '18px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#f1f5f9' }}>
              Confirm Call: <span style={{ color: '#34d399', fontSize: '22px' }}>Number {candidate}</span>?
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCall}
                disabled={isCalling}
                className="btn btn-success"
                style={{ flex: 1, padding: '12px' }}
              >
                {isCalling ? 'Calling...' : `CALL ${candidate}`}
              </button>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Click an available number above to confirm your call.
          </p>
        )}
      </div>
    </div>
  );
};
