import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Megaphone,
  Sparkles,
  Clock,
  LogOut,
  Users,
  Wifi,
  WifiOff,
  Bell,
  CheckCircle2,
  X,
  ChevronDown,
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
    isHost,
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
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // "YOUR TURN" notification banner state
  const [showTurnNotification, setShowTurnNotification] = useState(false);
  const lastNotifiedTurnPlayerRef = useRef<string | null>(null);

  // Authoritative remaining seconds countdown
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!room?.turnExpiresAt) return null;
    return Math.max(0, Math.ceil((room.turnExpiresAt - Date.now()) / 1000));
  });

  // Track window resize
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Synchronized authoritative timer
  useEffect(() => {
    if (!room?.turnExpiresAt || room.status !== 'PLAYING') {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((room.turnExpiresAt! - now) / 1000));
      setRemainingSeconds(left);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 250);
    return () => clearInterval(timerInterval);
  }, [room?.turnExpiresAt, room?.status]);

  // Handle turn transition notification
  useEffect(() => {
    if (!room || room.status !== 'PLAYING' || !playerId) return;

    const currentTurnId = room.currentTurnPlayerId;

    if (currentTurnId === playerId && lastNotifiedTurnPlayerRef.current !== playerId) {
      lastNotifiedTurnPlayerRef.current = playerId;
      setShowTurnNotification(true);
      soundManager.playTurnChime();
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      } catch {
        // ignore
      }

      const timer = setTimeout(() => {
        setShowTurnNotification(false);
      }, 4000);
      return () => clearTimeout(timer);
    } else if (currentTurnId !== playerId) {
      lastNotifiedTurnPlayerRef.current = currentTurnId;
      setShowTurnNotification(false);
    }
  }, [room?.currentTurnPlayerId, room?.status, playerId]);

  if (!room || !myPlayer || !myPlayer.board) return null;

  const isDesktop = windowWidth >= 1024;
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

  // Uncalled numbers on player's board
  const uncalledBoardNumbers = myPlayer.board.filter((num) => !calledSet.has(num));

  // Determine active call target number
  const activeCallNumber = candidateNumber !== null && !calledSet.has(candidateNumber)
    ? candidateNumber
    : uncalledBoardNumbers.length > 0
    ? uncalledBoardNumbers[0]
    : Array.from({ length: 25 }, (_, i) => i + 1).find((n) => !calledSet.has(n)) ?? null;

  // Handle cell tap on player's 5x5 board
  const handleCellClick = (num: number) => {
    if (!isMyTurn) return;
    if (calledSet.has(num)) return; // already called
    soundManager.playClick();
    setCandidateNumber(candidateNumber === num ? null : num);
    setShowNumberPicker(false);
  };

  // Confirm and call number
  const handlePerformCall = async (numToCall?: number | null) => {
    const targetNum = numToCall ?? activeCallNumber;
    if (!isMyTurn || targetNum === null || calledSet.has(targetNum) || isCallingNumber) return;

    setIsCallingNumber(true);
    soundManager.playStrike();
    await callNumber(targetNum);
    setCandidateNumber(null);
    setShowNumberPicker(false);
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
     COMPONENTS
     ---------------------------------------------------- */

  // 1. Top Bar
  const renderTopBar = () => (
    <div
      className="glass-panel"
      style={{
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
        borderRadius: 'var(--radius-md)',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexShrink: 1 }}>
        <button
          onClick={leaveRoom}
          className="btn btn-secondary"
          style={{ minHeight: '34px', height: '34px', padding: '4px 8px', fontSize: '12px', flexShrink: 0 }}
          title="Leave Match"
        >
          <LogOut size={13} />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{room.roomCode}</span>
        </button>

        <h1
          style={{
            fontSize: windowWidth < 380 ? '15px' : '17px',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.5px',
            background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            whiteSpace: 'nowrap',
          }}
        >
          BINGO
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            color: isConnected ? '#34d399' : '#f43f5e',
            background: isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.15)',
            padding: '4px 7px',
            borderRadius: 'var(--radius-full)',
            border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.3)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span style={{ display: windowWidth < 420 ? 'none' : 'inline' }}>
            {isConnected ? 'Live' : 'Reconnecting...'}
          </span>
        </div>

        {!isDesktop && (
          <button
            onClick={() => setPlayersSheetOpen(true)}
            className="btn btn-secondary"
            style={{ minHeight: '34px', height: '34px', padding: '4px 8px', fontSize: '12px', gap: '4px', flexShrink: 0 }}
            title="View Players"
          >
            <Users size={13} color="#38bdf8" />
            <span>{room.players.length}</span>
          </button>
        )}

        <SoundToggle compact={windowWidth < 540} />
      </div>
    </div>
  );

  // 2. Turn Status Banner
  const renderTurnBanner = () => {
    const isUrgent = remainingSeconds !== null && remainingSeconds <= 5;

    return (
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 'var(--radius-md)',
          background: isMyTurn
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(6, 182, 212, 0.18))'
            : 'rgba(22, 31, 48, 0.85)',
          border: isMyTurn ? '1.5px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
          boxShadow: isMyTurn ? '0 0 18px rgba(16, 185, 129, 0.28)' : undefined,
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              background: isMyTurn ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
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
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
              {isMyTurn ? 'Call a number!' : `${currentTurnPlayer?.name || 'Opponent'}'s Turn`}
            </div>
          </div>
        </div>

        {/* Authoritative 30s Countdown Timer */}
        {remainingSeconds !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              background: isUrgent ? 'rgba(244, 63, 94, 0.2)' : 'rgba(15, 23, 42, 0.7)',
              border: `1px solid ${isUrgent ? '#f43f5e' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-full)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 800,
              color: isUrgent ? '#f43f5e' : '#f59e0b',
              animation: isUrgent ? 'pulseAlert 0.8s infinite' : 'none',
            }}
          >
            <Clock size={13} />
            <span>{remainingSeconds}s</span>
          </div>
        )}
      </div>
    );
  };

  // 3. ONE Primary Call Control Box (Directly visible, no scrolling!)
  const renderCallControlBox = () => {
    return (
      <div
        className="glass-panel"
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          borderRadius: 'var(--radius-md)',
          background: isMyTurn
            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(139, 92, 246, 0.16))'
            : 'rgba(22, 31, 48, 0.7)',
          border: isMyTurn ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
          boxShadow: isMyTurn ? '0 0 20px rgba(6, 182, 212, 0.25)' : 'none',
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              color: isMyTurn ? '#38bdf8' : 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}
          >
            {isMyTurn ? 'CALL NUMBER' : 'CURRENT / LAST CALLED NUMBER'}
          </span>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {25 - calledSet.size} remaining
          </span>
        </div>

        {/* Center Display: Number to Call OR Last Called Number */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '4px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              background: isMyTurn
                ? activeCallNumber !== null
                  ? 'linear-gradient(135deg, #06b6d4, #38bdf8)'
                  : 'rgba(255, 255, 255, 0.08)'
                : lastCalledNumber !== null
                ? 'linear-gradient(135deg, #f43f5e, #fb7185)'
                : 'rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              color: '#ffffff',
              boxShadow: isMyTurn && activeCallNumber !== null
                ? '0 0 20px rgba(6, 182, 212, 0.6)'
                : lastCalledNumber !== null
                ? '0 0 16px rgba(244, 63, 94, 0.5)'
                : 'none',
            }}
          >
            {isMyTurn ? activeCallNumber ?? '—' : lastCalledNumber ?? '—'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
              {isMyTurn
                ? candidateNumber !== null
                  ? `Selected from your board`
                  : `Next available number`
                : lastCalledNumber !== null
                ? `Called by match players`
                : `Waiting for first number...`}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {isMyTurn
                ? 'Tap any cell below to change or click call'
                : `Turn: ${currentTurnPlayer?.name ?? 'Waiting...'}`}
            </span>
          </div>
        </div>

        {/* Primary Action Button (Enabled when it is player's turn) */}
        {isMyTurn ? (
          <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handlePerformCall()}
              disabled={isCallingNumber || activeCallNumber === null}
              className="btn btn-success"
              style={{
                flex: 1,
                minHeight: '44px',
                padding: '10px 16px',
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.4)',
              }}
            >
              <Megaphone size={16} />
              {isCallingNumber
                ? 'Calling...'
                : activeCallNumber !== null
                ? `CALL NUMBER ${activeCallNumber}`
                : 'CALL NEXT NUMBER'}
            </button>

            {/* Quick Picker Dropdown Toggle */}
            <button
              onClick={() => setShowNumberPicker(!showNumberPicker)}
              className="btn btn-secondary"
              style={{ minHeight: '44px', padding: '0 12px', fontSize: '12px' }}
              title="Pick any uncalled number (1-25)"
            >
              <span>1–25</span>
              <ChevronDown size={14} />
            </button>
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}
          >
            Waiting for <strong style={{ color: '#ffffff' }}>{currentTurnPlayer?.name ?? 'opponent'}</strong> to call next number...
          </div>
        )}

        {/* Quick Uncalled Number Selector Popover */}
        {isMyTurn && showNumberPicker && (
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              zIndex: 100,
              padding: '10px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '6px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)',
            }}
          >
            {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
              const isCalled = calledSet.has(num);
              const isSelected = activeCallNumber === num;

              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setCandidateNumber(num);
                    setShowNumberPicker(false);
                  }}
                  disabled={isCalled}
                  style={{
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected
                      ? '#06b6d4'
                      : isCalled
                      ? 'rgba(15, 23, 42, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid var(--border-subtle)',
                    color: isCalled ? 'rgba(255, 255, 255, 0.2)' : '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isCalled ? 'not-allowed' : 'pointer',
                    textDecoration: isCalled ? 'line-through' : 'none',
                  }}
                >
                  {num}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // 4. B-I-N-G-O Progression Bar
  const renderBingoProgress = () => (
    <div
      className="glass-panel"
      style={{
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
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
            fontSize: '11px',
            fontWeight: 800,
            color: myPlayer.bingoProgress >= 5 ? '#fbbf24' : '#38bdf8',
          }}
        >
          {myPlayer.bingoProgress} / 5 LINES {myPlayer.bingoRank ? `(Rank #${myPlayer.bingoRank})` : ''}
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
                height: 'clamp(34px, 8vw, 44px)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.8vw, 18px)',
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
                boxShadow: isUnlocked && isLatest ? '0 0 14px rgba(56, 189, 248, 0.4)' : 'none',
              }}
            >
              <span>{letter}</span>
              <span style={{ fontSize: '8px', fontWeight: 800, marginTop: '-2px', color: isUnlocked ? '#34d399' : 'rgba(255,255,255,0.2)' }}>
                {isUnlocked ? '✓' : '○'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 5. Unclaimed Bingo Banner
  const renderClaimBanner = () => {
    if (!hasUnclaimedBingo) return null;

    return (
      <div
        className="glass-panel bingo-claim-pulse"
        style={{
          padding: '10px 14px',
          background: myPlayer.bingoProgress >= 4
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(16, 185, 129, 0.35))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(6, 182, 212, 0.35))',
          border: myPlayer.bingoProgress >= 4 ? '2px solid #fbbf24' : '1.5px solid var(--accent-cyan)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-sm)',
              background: myPlayer.bingoProgress >= 4
                ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(135deg, #38bdf8, #8b5cf6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
            }}
          >
            {nextLetter}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, color: myPlayer.bingoProgress >= 4 ? '#fbbf24' : '#38bdf8' }}>
              {myPlayer.bingoProgress >= 4 ? '🎉 5TH LINE READY!' : `✨ NEW LINE! [ ${nextLetter} ]`}
            </div>
            <div style={{ fontSize: '11px', color: '#f1f5f9' }}>
              Tap button to claim letter {nextLetter}
            </div>
          </div>
        </div>

        <button
          onClick={handleClaimBingo}
          disabled={isClaiming}
          className={myPlayer.bingoProgress >= 4 ? 'btn btn-success' : 'btn btn-primary'}
          style={{
            minHeight: '38px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}
        >
          <Trophy size={14} /> {isClaiming ? 'Claiming...' : 'CLAIM BINGO'}
        </button>
      </div>
    );
  };

  // 6. 5x5 Bingo Board (Fixed 25 cells with immutable slot keys)
  const renderBingoBoard = () => (
    <div
      className="glass-panel"
      style={{
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
      }}
    >
      <div
        className="bingo-grid"
        role="grid"
        aria-label="5 by 5 Bingo Board"
      >
        {Array.from({ length: 25 }, (_, idx) => {
          const num = myPlayer.board![idx];
          const isStruck = calledSet.has(num);
          const isWinning = winningCellIndices.has(idx);
          const isSelected = candidateNumber === num;

          return (
            <button
              key={`cell-${idx}`}
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

  // 7. Compact Called Numbers Ribbon
  const renderCalledNumbersBar = () => {
    const reversedRecent = [...room.calledNumbers].reverse();

    return (
      <div
        className="glass-panel"
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            CALLED ({room.calledNumbers.length})
          </span>
        </div>

        {/* Horizontally scrollable recent calls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            overflowX: 'auto',
            padding: '2px 0',
            maxWidth: 'calc(100% - 90px)',
          }}
        >
          {reversedRecent.slice(0, 10).map((num) => (
            <span
              key={num}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '26px',
                height: '26px',
                padding: '0 4px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              {num}
            </span>
          ))}
          {room.calledNumbers.length === 0 && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No numbers called yet
            </span>
          )}
        </div>
      </div>
    );
  };

  // 8. Players List with Real-time Status
  const renderPlayersList = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {room.players.map((p) => {
        const isCurrentTurn = p.id === room.currentTurnPlayerId;
        const winnerRecord = room.winnerHistory.find((w) => w.playerId === p.id);
        const isMe = p.id === playerId;
        const isPlayerHost = p.id === room.hostId;

        return (
          <div
            key={p.id}
            style={{
              padding: '8px 12px',
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
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '20px' }}>{p.avatar}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>{p.name}</span>
                  {isMe && (
                    <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 800 }}>YOU</span>
                  )}
                  {isPlayerHost && (
                    <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 800 }}>HOST</span>
                  )}
                </div>

                {/* Letters Won */}
                <div style={{ display: 'flex', gap: '2px', marginTop: '2px', alignItems: 'center' }}>
                  {(['B', 'I', 'N', 'G', 'O'] as const).map((ch) => {
                    const isEarned = (p.letters || []).includes(ch);
                    return (
                      <span
                        key={ch}
                        style={{
                          fontSize: '9px',
                          fontWeight: 900,
                          padding: '1px 3px',
                          borderRadius: '2px',
                          background: isEarned ? '#10b981' : 'rgba(255,255,255,0.06)',
                          color: isEarned ? '#ffffff' : '#64748b',
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '3px' }}>
                    ({p.bingoProgress}/5)
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              {winnerRecord ? (
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24' }}>
                  <span>{winnerRecord.rank === 1 ? '🥇 Bingo #1' : winnerRecord.rank === 2 ? '🥈 Bingo #2' : `🏆 Bingo #${winnerRecord.rank}`}</span>
                  <div style={{ fontSize: '9px', color: '#34d399' }}>Still playing</div>
                </div>
              ) : isCurrentTurn ? (
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#34d399' }}>
                  ● Calling
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  🟢 Playing
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ----------------------------------------------------
     MAIN RENDER
     ---------------------------------------------------- */

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
      }}
    >
      {/* "YOUR TURN" Animated Notification Toast */}
      {showTurnNotification && (
        <div
          className="turn-notification-toast"
          role="alert"
          aria-live="assertive"
        >
          <div
            className="glass-panel"
            style={{
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 182, 212, 0.95))',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.5)',
              border: '2px solid #ffffff',
            }}
          >
            <Bell size={24} color="#ffffff" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px' }}>
                🔔 YOUR TURN!
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.95 }}>
                It's your turn! Make your move now.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      {renderTopBar()}

      {/* DESKTOP 3-COLUMN LAYOUT (>= 1024px) */}
      {isDesktop ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '270px 1fr 310px',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          {/* LEFT: Players List & In-Match Status */}
          <div className="glass-panel" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
              <Users size={15} color="#8b5cf6" />
              <span>PLAYERS IN MATCH ({room.players.length})</span>
            </div>
            {renderPlayersList()}
          </div>

          {/* CENTER: Turn Banner, Progression, Claim Banner, 5x5 Board */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderTurnBanner()}
            {renderBingoProgress()}
            {renderClaimBanner()}
            {renderBingoBoard()}
          </div>

          {/* RIGHT: ONE Call Control Box & Compact Called Numbers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {renderCallControlBox()}
            {renderCalledNumbersBar()}
          </div>
        </div>
      ) : (
        /* MOBILE / TABLET SINGLE-COLUMN VIEW (Optimized per Section 13) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {renderTurnBanner()}
          {renderCallControlBox()}
          {renderBingoProgress()}
          {renderClaimBanner()}
          {renderBingoBoard()}
          {renderCalledNumbersBar()}
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
                marginBottom: '14px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#8b5cf6" />
                Players in Match ({room.players.length})
              </h3>
              <button
                onClick={() => setPlayersSheetOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {renderPlayersList()}
          </div>
        </div>
      )}
    </div>
  );
};
