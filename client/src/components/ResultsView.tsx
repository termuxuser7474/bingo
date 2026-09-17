import React, { useState } from 'react';
import {
  Trophy,
  RotateCcw,
  Home,
  PlusCircle,
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { ConfettiEffect } from './ConfettiEffect.js';
import { SoundToggle } from './SoundToggle.js';

interface ResultsViewProps {
  onReturnHome: () => void;
  onNewGame: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ onReturnHome, onNewGame }) => {
  const { room, rematch, leaveRoom } = useGame();
  const [isRematching, setIsRematching] = useState(false);

  if (!room) return null;

  const handlePlayAgain = async () => {
    setIsRematching(true);
    await rematch();
    setIsRematching(false);
  };

  const handleReturnHome = () => {
    leaveRoom();
    onReturnHome();
  };

  const sortedPlayers = [...room.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.bingoCount - a.bingoCount;
  });

  return (
    <>
      <ConfettiEffect />
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
        {/* Top Navbar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <SoundToggle />
        </div>

        {/* Hero Podium Banner */}
        <div
          className="glass-panel"
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
            border: '2px solid rgba(251, 191, 36, 0.5)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 'var(--radius-full)',
              color: '#fbbf24',
              fontSize: '13px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '12px',
            }}
          >
            <Sparkles size={16} /> MATCH CONCLUDED
          </div>

          <h1
            style={{
              fontSize: 'clamp(36px, 7vw, 56px)',
              fontWeight: 900,
              letterSpacing: '2px',
              background: 'linear-gradient(135deg, #ffffff 40%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '8px',
            }}
          >
            BINGO! Game Complete
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', maxWidth: '520px' }}>
            Congratulations to all winners! Check out the final podium rankings and statistics below.
          </p>

          {/* Winner History Podium */}
          {room.winnerHistory.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                gap: '16px',
                marginTop: '36px',
                width: '100%',
                maxWidth: '600px',
                flexWrap: 'wrap',
              }}
            >
              {room.winnerHistory.slice(0, 3).map((winner) => {
                const isFirst = winner.rank === 1;
                const isSecond = winner.rank === 2;
                const height = isFirst ? '140px' : isSecond ? '115px' : '95px';
                const medal = isFirst ? '🥇' : isSecond ? '🥈' : '🥉';
                const color = isFirst ? '#fbbf24' : isSecond ? '#e2e8f0' : '#d97706';

                return (
                  <div
                    key={winner.playerId}
                    style={{
                      flex: '1 1 85px',
                      maxWidth: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ fontSize: '36px', marginBottom: '4px' }}>{winner.avatar}</div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#f8fafc', marginBottom: '2px' }}>
                      {winner.playerName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#34d399', fontWeight: 700, marginBottom: '8px' }}>
                      +{winner.scoreAwarded} pts
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height,
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: `2px solid ${color}`,
                        borderBottom: 'none',
                        borderTopLeftRadius: 'var(--radius-md)',
                        borderTopRightRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 20px ${color}33`,
                      }}
                    >
                      <span style={{ fontSize: '32px' }}>{medal}</span>
                      <span style={{ fontSize: '12px', fontWeight: 800, color, textTransform: 'uppercase', marginTop: '4px' }}>
                        {winner.rank === 1 ? '1st Bingo' : winner.rank === 2 ? '2nd Bingo' : '3rd Bingo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Match Statistics & Final Leaderboard */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={20} color="#fbbf24" /> Final Match Standings
            </h3>

            <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={15} color="#f43f5e" /> Total Numbers Called: <strong>{room.calledNumbers.length}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedPlayers.map((player, idx) => {
              const winnerPos = room.winnerHistory.find((w) => w.playerId === player.id);

              return (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'clamp(10px, 2.5vw, 16px)',
                    background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(15, 23, 42, 0.4)',
                    border: idx === 0 ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2vw, 12px)' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-muted)', width: '20px' }}>
                      #{idx + 1}
                    </div>
                    <div style={{ fontSize: '24px' }}>{player.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{player.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {winnerPos
                          ? `Claimed ${winnerPos.rank === 1 ? '1st' : winnerPos.rank === 2 ? '2nd' : '3rd'} Bingo`
                          : 'No Bingo claimed'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginBottom: '4px' }}>
                        {(['B', 'I', 'N', 'G', 'O'] as const).map((char) => {
                          const earned = (player.letters || []).includes(char);
                          return (
                            <span
                              key={char}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 900,
                                fontFamily: 'var(--font-display)',
                                background: earned ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)',
                                color: earned ? '#ffffff' : 'rgba(255,255,255,0.25)',
                                border: earned ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: earned ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none',
                              }}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {player.bingoProgress ?? player.bingoCount} / 5 Lines Completed
                      </div>
                    </div>

                    <div style={{ minWidth: '70px', textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#fbbf24' }}>
                        {player.score}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Points
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Play Again, New Game, Return Home */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handlePlayAgain}
            disabled={isRematching}
            className="btn btn-success"
            style={{ padding: '16px 28px', fontSize: '16px' }}
          >
            <RotateCcw size={18} /> {isRematching ? 'Resetting Match...' : 'PLAY AGAIN (REMATCH)'}
          </button>

          <button
            onClick={onNewGame}
            className="btn btn-primary"
            style={{ padding: '16px 24px', fontSize: '16px' }}
          >
            <PlusCircle size={18} /> NEW GAME
          </button>

          <button
            onClick={handleReturnHome}
            className="btn btn-secondary"
            style={{ padding: '16px 24px', fontSize: '16px' }}
          >
            <Home size={18} /> RETURN TO HOME
          </button>
        </div>
      </div>
    </>
  );
};
