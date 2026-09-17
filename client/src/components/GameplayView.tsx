import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Megaphone,
  Sparkles,
  Clock,
  LogOut,
  Users,
  Flame,
  X,
  Wifi,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { SoundToggle } from './SoundToggle.js';
import { BINGO_LINE_DEFINITIONS } from '../types/game.js';
import { soundManager } from '../audio/soundManager.js';

export const GameplayView: React.FC = () => {
  const {
    room,
    playerId,
    myPlayer,
    isMyTurn,
    isConnected,
    callNumber,
    claimBingo,
    leaveRoom,
  } = useGame();

  const [candidateNumber, setCandidateNumber] = useState<number | null>(null);
  const [isCallingNumber, setIsCallingNumber] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [playersSheetOpen, setPlayersSheetOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!room || !myPlayer || !myPlayer.board) return null;

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  const calledSet = new Set(room.calledNumbers);
  const currentTurnPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId) || null;
  const lastCalledNumber = room.calledNumbers.length > 0
    ? room.calledNumbers[room.calledNumbers.length - 1]
    : null;

  // Calculate completed lines for current player
  const myCompletedLineIds = new Set<string>();
  const winningCellIndices = new Set<number>();

  for (const def of BINGO_LINE_DEFINITIONS) {
    const isCompleted = def.cellIndices.every((idx: number) => calledSet.has(myPlayer.board![idx]));
    if (isCompleted) {
      myCompletedLineIds.add(def.id);
      def.cellIndices.forEach((idx: number) => winningCellIndices.add(idx));
    }
  }

  // Check if player has unclaimed lines
  const claimedCount = myPlayer.bingoCount;
  const hasUnclaimedBingo = myCompletedLineIds.size > claimedCount;

  // Handle cell tap on player's 5x5 board
  const handleCellClick = (num: number) => {
    if (!isMyTurn) return;
    if (calledSet.has(num)) return; // already called
    soundManager.playClick();
    setCandidateNumber(num === candidateNumber ? null : num);
  };

  // Handle number tap in the 1-25 call bank
  const handleBankNumberSelect = (num: number) => {
    if (!isMyTurn || calledSet.has(num)) return;
    soundManager.playClick();
    setCandidateNumber(candidateNumber === num ? null : num);
  };

  // Confirm and call selected number
  const handleConfirmCall = async () => {
    if (!isMyTurn || candidateNumber === null || calledSet.has(candidateNumber) || isCallingNumber) return;
    setIsCallingNumber(true);
    soundManager.playStrike();
    await callNumber(candidateNumber);
    setCandidateNumber(null);
    setIsCallingNumber(false);
  };

  // Claim Bingo
  const handleClaimBingo = async () => {
    setIsClaiming(true);
    await claimBingo();
    setIsClaiming(false);
  };

  const nextLetter = (['B', 'I', 'N', 'G', 'O'] as const)[Math.min(4, myPlayer.bingoProgress)];

  /* ----------------------------------------------------
     COMPONENTS REUSABLE ACROSS MOBILE / TABLET / DESKTOP
     ---------------------------------------------------- */

  // Top Bar
  const renderTopBar = () => (
    <div
      className="glass-panel"
      style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={leaveRoom}
          className="btn btn-secondary"
          style={{ minHeight: '38px', height: '38px', padding: '6px 10px', fontSize: '12px' }}
          title="Leave Match"
        >
          <LogOut size={15} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{room.roomCode}</span>
        </button>

        <h1
          style={{
            fontSize: '18px',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            letterSpacing: '1.5px',
            background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          BINGO
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Connection Status Indicator */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: isConnected ? '#34d399' : '#f43f5e',
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.3)'}`,
          }}
        >
          {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span style={{ display: windowWidth < 380 ? 'none' : 'inline' }}>
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        {/* Players Bottom Sheet Toggle Button (Mobile/Tablet) */}
        {!isDesktop && (
          <button
            onClick={() => setPlayersSheetOpen(true)}
            className="btn btn-secondary"
            style={{ minHeight: '38px', height: '38px', padding: '6px 12px', fontSize: '12px', gap: '6px' }}
          >
            <Users size={15} color="#38bdf8" />
            <span>{room.players.length}</span>
          </button>
        )}

        <SoundToggle />
      </div>
    </div>
  );

  // Turn Status Banner
  const renderTurnBanner = () => (
    <div
      className="glass-panel"
      style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 'var(--radius-md)',
        background: isMyTurn
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(6, 182, 212, 0.18))'
          : 'rgba(22, 31, 48, 0.85)',
        border: isMyTurn ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
        boxShadow: isMyTurn ? '0 0 20px rgba(16, 185, 129, 0.3)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-sm)',
            background: isMyTurn ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0,
          }}
        >
          {isMyTurn ? '🎯' : currentTurnPlayer?.avatar || '⏳'}
        </div>

        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: isMyTurn ? '#34d399' : 'var(--text-secondary)',
            }}
          >
            {isMyTurn ? 'YOUR TURN' : 'WAITING FOR TURN'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
            {isMyTurn ? 'Select a number to call!' : currentTurnPlayer?.name || 'Opponent'}
          </div>
        </div>
      </div>

      {/* Turn Countdown Timer */}
      {room.settings.turnTimeoutSeconds > 0 && room.turnTimeRemaining !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 10px',
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            fontWeight: 800,
            color: room.turnTimeRemaining <= 5 ? '#f43f5e' : '#f59e0b',
          }}
        >
          <Clock size={14} />
          {room.turnTimeRemaining}s
        </div>
      )}
    </div>
  );

  // Progressive B-I-N-G-O Tracker Bar
  const renderBingoProgress = () => (
    <div
      className="glass-panel"
      style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        borderRadius: 'var(--radius-md)',
        background: myPlayer.bingoProgress >= 5
          ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(16, 185, 129, 0.25))'
          : 'rgba(22, 31, 48, 0.85)',
        border: myPlayer.bingoProgress >= 5 ? '2px solid #fbbf24' : '1px solid var(--border-subtle)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          BINGO PROGRESSION
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 800,
            color: myPlayer.bingoProgress >= 5 ? '#fbbf24' : '#38bdf8',
          }}
        >
          {myPlayer.bingoProgress} / 5 LINES
        </span>
      </div>

      <div style={{ display: 'flex', gap: 'clamp(4px, 1.5vw, 8px)', justifyContent: 'center', width: '100%' }}>
        {(['B', 'I', 'N', 'G', 'O'] as const).map((letter, idx) => {
          const isUnlocked = idx < myPlayer.bingoProgress;
          const isLatest = idx === myPlayer.bingoProgress - 1;

          return (
            <div
              key={letter}
              style={{
                flex: '1 1 0',
                maxWidth: '68px',
                height: 'clamp(38px, 9vw, 48px)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(15px, 4vw, 19px)',
                fontWeight: 900,
                transition: 'all 0.25s ease',
                background: isUnlocked
                  ? isLatest
                    ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.4), rgba(139, 92, 246, 0.4))'
                    : 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.25))'
                  : 'rgba(15, 23, 42, 0.5)',
                border: isUnlocked
                  ? isLatest
                    ? '2px solid #38bdf8'
                    : '1.5px solid var(--accent-purple)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                color: isUnlocked ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                boxShadow: isUnlocked && isLatest ? '0 0 16px rgba(56, 189, 248, 0.5)' : 'none',
              }}
            >
              <span>{letter}</span>
              <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '-2px', color: isUnlocked ? '#34d399' : 'rgba(255,255,255,0.2)' }}>
                {isUnlocked ? '✓' : '○'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // New Line Claim Alert Banner
  const renderClaimBanner = () => {
    if (!hasUnclaimedBingo) return null;

    return (
      <div
        className="glass-panel bingo-claim-pulse"
        style={{
          padding: '12px 16px',
          background: myPlayer.bingoProgress >= 4
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(16, 185, 129, 0.35))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(6, 182, 212, 0.35))',
          border: myPlayer.bingoProgress >= 4 ? '2px solid #fbbf24' : '1.5px solid var(--accent-cyan)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: myPlayer.bingoProgress >= 4
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
            }}
          >
            {nextLetter}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: myPlayer.bingoProgress >= 4 ? '#fbbf24' : '#38bdf8' }}>
              {myPlayer.bingoProgress >= 4 ? '🎉 5TH LINE READY!' : `✨ NEW LINE! [ ${nextLetter} ]`}
            </div>
            <div style={{ fontSize: '12px', color: '#f1f5f9' }}>
              Tap button to claim letter {nextLetter}
            </div>
          </div>
        </div>

        <button
          onClick={handleClaimBingo}
          disabled={isClaiming}
          className={myPlayer.bingoProgress >= 4 ? 'btn btn-success' : 'btn btn-primary'}
          style={{
            minHeight: '42px',
            padding: '8px 18px',
            fontSize: '15px',
            fontWeight: 900,
            letterSpacing: '1px',
            flexShrink: 0,
          }}
        >
          <Trophy size={16} /> {isClaiming ? 'Claiming...' : '[ BINGO! ]'}
        </button>
      </div>
    );
  };

  // 5x5 Bingo Board (Most Important Component)
  const renderBingoBoard = () => (
    <div
      className="glass-panel"
      style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
      }}
    >
      <div
        className="bingo-grid"
        role="grid"
        aria-label="5 by 5 Bingo Board"
      >
        {myPlayer.board!.map((num, idx) => {
          const isStruck = calledSet.has(num);
          const isWinning = winningCellIndices.has(idx);
          const isSelected = candidateNumber === num;

          return (
            <button
              key={`${idx}-${num}`}
              type="button"
              onClick={() => handleCellClick(num)}
              className={`bingo-cell ${isStruck ? 'struck' : ''} ${isWinning ? 'winning-line' : ''} ${
                isSelected ? 'selected' : ''
              }`}
              disabled={!isMyTurn || isStruck}
              aria-label={`Number ${num}${isStruck ? ', marked' : ''}${isWinning ? ', winning line' : ''}`}
              role="gridcell"
            >
              <span>{num}</span>
              {isStruck && <span className="strike-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Last Called Number & Recent Called Ribbon
  const renderCalledNumbersBar = () => {
    const reversedRecent = [...room.calledNumbers].reverse();

    return (
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            LAST CALLED
          </span>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: lastCalledNumber ? 'linear-gradient(135deg, #f43f5e, #fb7185)' : 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              boxShadow: lastCalledNumber ? '0 0 14px rgba(244, 63, 94, 0.5)' : 'none',
            }}
          >
            {lastCalledNumber ?? '—'}
          </div>
        </div>

        {/* Horizontally scrollable recent calls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            padding: '2px 0',
            maxWidth: 'calc(100% - 130px)',
          }}
        >
          {reversedRecent.slice(1, 12).map((num) => (
            <span
              key={num}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
                height: '28px',
                padding: '0 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {num}
            </span>
          ))}
          {room.calledNumbers.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No numbers called yet
            </span>
          )}
        </div>
      </div>
    );
  };

  // 1-25 Number Calling Grid (Primary Calling Component)
  const renderNumberCallingGrid = () => (
    <div
      className="glass-panel"
      style={{
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          NUMBER CALLING (1–25)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {25 - calledSet.size} remaining
        </span>
      </div>

      {/* 5x5 Number Selection Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '6px',
        }}
      >
        {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
          const isCalled = calledSet.has(num);
          const isSelected = candidateNumber === num;

          return (
            <button
              key={num}
              type="button"
              onClick={() => handleBankNumberSelect(num)}
              disabled={!isMyTurn || isCalled}
              style={{
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-display)',
                fontSize: '15px',
                fontWeight: 800,
                cursor: !isMyTurn || isCalled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                background: isSelected
                  ? 'rgba(6, 182, 212, 0.3)'
                  : isCalled
                  ? 'rgba(15, 23, 42, 0.4)'
                  : 'rgba(28, 38, 59, 0.75)',
                border: isSelected
                  ? '2px solid #38bdf8'
                  : isCalled
                  ? '1px solid transparent'
                  : '1px solid var(--border-subtle)',
                color: isSelected ? '#ffffff' : isCalled ? 'rgba(255, 255, 255, 0.2)' : 'var(--text-primary)',
                boxShadow: isSelected ? '0 0 12px var(--accent-cyan-glow)' : 'none',
                textDecoration: isCalled ? 'line-through' : 'none',
              }}
            >
              {num}
            </button>
          );
        })}
      </div>

      {/* Confirmation Area When Number Is Selected */}
      {isMyTurn && candidateNumber !== null && !calledSet.has(candidateNumber) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(6, 182, 212, 0.15)',
            border: '1.5px solid #06b6d4',
            borderRadius: 'var(--radius-md)',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
            Call number <strong>{candidateNumber}</strong>?
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCandidateNumber(null)}
              className="btn btn-secondary"
              style={{ minHeight: '38px', height: '38px', padding: '6px 12px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCall}
              disabled={isCallingNumber}
              className="btn btn-success"
              style={{ minHeight: '38px', height: '38px', padding: '6px 18px', fontSize: '13px', fontWeight: 800 }}
            >
              <Megaphone size={14} /> {isCallingNumber ? 'Calling...' : `CALL ${candidateNumber}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Players List Content
  const renderPlayersList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {room.players.map((p) => {
        const isCurrentTurn = p.id === room.currentTurnPlayerId;
        const winnerRecord = room.winnerHistory.find((w) => w.playerId === p.id);
        const isMe = p.id === playerId;

        return (
          <div
            key={p.id}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: isCurrentTurn
                ? 'rgba(16, 185, 129, 0.12)'
                : isMe
                ? 'rgba(139, 92, 246, 0.1)'
                : 'rgba(15, 23, 42, 0.6)',
              border: isCurrentTurn
                ? '1px solid rgba(16, 185, 129, 0.4)'
                : isMe
                ? '1px solid rgba(139, 92, 246, 0.3)'
                : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontSize: '22px' }}>{p.avatar}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#ffffff' }}>{p.name}</span>
                  {isMe && (
                    <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 800 }}>YOU</span>
                  )}
                  {p.isHost && (
                    <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 800 }}>HOST</span>
                  )}
                </div>

                {/* Letters Won */}
                <div style={{ display: 'flex', gap: '3px', marginTop: '3px', alignItems: 'center' }}>
                  {(['B', 'I', 'N', 'G', 'O'] as const).map((ch) => {
                    const isEarned = (p.letters || []).includes(ch);
                    return (
                      <span
                        key={ch}
                        style={{
                          fontSize: '10px',
                          fontWeight: 900,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background: isEarned ? '#10b981' : 'rgba(255,255,255,0.06)',
                          color: isEarned ? '#ffffff' : '#64748b',
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    ({p.bingoProgress}/5)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fbbf24' }}>
                {winnerRecord ? (
                  <span>{winnerRecord.rank === 1 ? '🥇 1st' : winnerRecord.rank === 2 ? '🥈 2nd' : '🥉 3rd'}</span>
                ) : isCurrentTurn ? (
                  <span style={{ color: '#34d399' }}>● Calling</span>
                ) : (
                  `${p.score} pts`
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ----------------------------------------------------
     LAYOUT RENDERERS
     ---------------------------------------------------- */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Top Bar for all screens */}
      {renderTopBar()}

      {/* DESKTOP 3-COLUMN LAYOUT (>= 1024px) */}
      {isDesktop ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '270px 1fr 310px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Players List & Match Info */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 800 }}>
              <Users size={16} color="#8b5cf6" />
              <span>PLAYERS ({room.players.length})</span>
            </div>
            {renderPlayersList()}
          </div>

          {/* CENTER: Bingo Board & Progression */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderTurnBanner()}
            {renderBingoProgress()}
            {renderClaimBanner()}
            {renderBingoBoard()}
          </div>

          {/* RIGHT: Calling Grid & Called Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderCalledNumbersBar()}
            {renderNumberCallingGrid()}
          </div>
        </div>
      ) : (
        /* MOBILE PORTRAIT & TABLET SINGLE-COLUMN LAYOUT */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {renderTurnBanner()}
          {renderBingoProgress()}
          {renderClaimBanner()}
          {renderBingoBoard()}
          {renderCalledNumbersBar()}
          {renderNumberCallingGrid()}
        </div>
      )}

      {/* MOBILE STICKY CALL ACTION BAR (Pops up above safe area when number is chosen) */}
      {!isDesktop && isMyTurn && candidateNumber !== null && !calledSet.has(candidateNumber) && (
        <div
          className="sticky-bottom-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            borderTop: '1.5px solid var(--accent-cyan)',
            boxShadow: '0 -8px 24px rgba(6, 182, 212, 0.25)',
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Selected:</span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 900,
                color: '#38bdf8',
                fontFamily: 'var(--font-display)',
                padding: '2px 8px',
                background: 'rgba(6, 182, 212, 0.2)',
                borderRadius: '6px',
              }}
            >
              {candidateNumber}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCandidateNumber(null)}
              className="btn btn-secondary"
              style={{ minHeight: '40px', padding: '6px 12px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCall}
              disabled={isCallingNumber}
              className="btn btn-success"
              style={{
                minHeight: '40px',
                padding: '6px 18px',
                fontSize: '14px',
                fontWeight: 800,
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Megaphone size={15} /> {isCallingNumber ? 'Calling...' : `CALL ${candidateNumber}`}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE PLAYERS BOTTOM SHEET */}
      {playersSheetOpen && (
        <div
          className="bottom-sheet-overlay"
          onClick={() => setPlayersSheetOpen(false)}
        >
          <div
            className="bottom-sheet-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bottom-sheet-handle" />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h3 style={{ fontSize: '17px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="#8b5cf6" />
                Players in Match ({room.players.length})
              </h3>
              <button
                onClick={() => setPlayersSheetOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {renderPlayersList()}
          </div>
        </div>
      )}
    </div>
  );
};
