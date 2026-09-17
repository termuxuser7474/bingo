import React, { useState, useCallback } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Shuffle,
  Lock,
  Unlock,
  ArrowLeft,
  MousePointerClick,
  Sparkles,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { useGame } from '../context/GameSocketContext.js';
import { soundManager } from '../audio/soundManager.js';
import { SoundToggle } from './SoundToggle.js';

interface BoardSetupViewProps {
  onBackToLobby: () => void;
}

export const BoardSetupView: React.FC<BoardSetupViewProps> = ({ onBackToLobby }) => {
  const { room, myPlayer, lockBoard, unlockBoard } = useGame();

  // 25 cells (indices 0..24)
  const [cells, setCells] = useState<(number | null)[]>(() => {
    if (myPlayer?.board && myPlayer.board.length === 25) {
      return [...myPlayer.board];
    }
    return Array(25).fill(null);
  });

  const [history, setHistory] = useState<(number | null)[][]>([]);
  const [redoStack, setRedoStack] = useState<(number | null)[][]>([]);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [selectedCellIndex, setSelectedCellIndex] = useState<number | null>(null);
  const [draggedNumber, setDraggedNumber] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [randomizedToast, setRandomizedToast] = useState(false);

  const isLocked = myPlayer?.isReady ?? false;

  // Track numbers currently placed
  const placedNumbers = new Set<number>();
  cells.forEach((num) => {
    if (num !== null) placedNumbers.add(num);
  });

  // Calculate next sequential number (lowest available number from 1..25)
  let nextSequentialNumber: number | null = null;
  for (let i = 1; i <= 25; i++) {
    if (!placedNumbers.has(i)) {
      nextSequentialNumber = i;
      break;
    }
  }

  const isComplete = placedNumbers.size === 25 && cells.every((c) => c !== null);

  // Push to undo history
  const pushHistory = useCallback(
    (newCells: (number | null)[]) => {
      setHistory((prev) => [...prev.slice(-30), [...cells]]);
      setRedoStack([]);
      setCells(newCells);
    },
    [cells]
  );

  // Method 1: Sequential Placement OR Method 2: Selected Number Placement
  const handleCellClick = (index: number) => {
    if (isLocked) return;

    const currentCellVal = cells[index];

    // If a number from bank is selected (Method 2)
    if (selectedNumber !== null) {
      if (currentCellVal === null) {
        const next = [...cells];
        next[index] = selectedNumber;
        pushHistory(next);
        soundManager.playDrop();
        setSelectedNumber(null);
        setSelectedCellIndex(null);
      }
      return;
    }

    // If cell already has a number: select it for deletion/return
    if (currentCellVal !== null) {
      soundManager.playClick();
      setSelectedCellIndex(index === selectedCellIndex ? null : index);
      return;
    }

    // Method 1: Sequential placement on empty cell
    if (currentCellVal === null && nextSequentialNumber !== null) {
      const next = [...cells];
      next[index] = nextSequentialNumber;
      pushHistory(next);
      soundManager.playDrop();
      setSelectedCellIndex(null);
    }
  };

  // Delete selected cell number
  const handleDeleteSelectedCell = () => {
    if (selectedCellIndex === null || isLocked) return;
    const next = [...cells];
    next[selectedCellIndex] = null;
    pushHistory(next);
    soundManager.playClick();
    setSelectedCellIndex(null);
  };

  // Method 2: Selecting number from bank
  const handleBankNumberClick = (num: number) => {
    if (isLocked || placedNumbers.has(num)) return;
    soundManager.playClick();
    setSelectedNumber(selectedNumber === num ? null : num);
    setSelectedCellIndex(null);
  };

  // Drag and Drop (Method 3)
  const handleDragStart = (e: React.DragEvent, num: number) => {
    if (isLocked || placedNumbers.has(num)) return;
    setDraggedNumber(num);
    e.dataTransfer.setData('text/plain', String(num));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!isLocked && cells[index] === null) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (isLocked || cells[index] !== null) return;

    const numStr = e.dataTransfer.getData('text/plain');
    const num = parseInt(numStr, 10);
    if (!isNaN(num) && !placedNumbers.has(num)) {
      const next = [...cells];
      next[index] = num;
      pushHistory(next);
      soundManager.playDrop();
      setDraggedNumber(null);
    }
  };

  // Undo
  const handleUndo = () => {
    if (history.length === 0 || isLocked) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, [...cells]]);
    setHistory((h) => h.slice(0, -1));
    setCells(prev);
    soundManager.playClick();
    setSelectedCellIndex(null);
    setSelectedNumber(null);
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0 || isLocked) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, [...cells]]);
    setRedoStack((r) => r.slice(0, -1));
    setCells(next);
    soundManager.playClick();
    setSelectedCellIndex(null);
    setSelectedNumber(null);
  };

  // Clear Board
  const handleResetBoard = () => {
    if (isLocked) return;
    pushHistory(Array(25).fill(null));
    soundManager.playClick();
    setSelectedCellIndex(null);
    setSelectedNumber(null);
  };

  // Randomize Board (Fisher-Yates)
  const handleRandomize = () => {
    if (isLocked) return;
    const nums = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = nums[i];
      nums[i] = nums[j];
      nums[j] = temp;
    }
    pushHistory(nums);
    soundManager.playDrop();
    setSelectedCellIndex(null);
    setSelectedNumber(null);

    // Brief confirmation toast
    setRandomizedToast(true);
    setTimeout(() => setRandomizedToast(false), 1500);
  };

  // Lock board
  const handleLockBoard = async () => {
    if (!isComplete) return;
    setIsLocking(true);
    const validBoard = cells as number[];
    const success = await lockBoard(validBoard);
    setIsLocking(false);
    if (success) {
      soundManager.playClick();
    }
  };

  // Unlock board
  const handleUnlockBoard = async () => {
    await unlockBoard();
    soundManager.playClick();
  };

  const readyCount = room?.players.filter((p) => p.isReady).length || 0;
  const totalCount = room?.players.length || 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        padding: '12px 14px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {/* Top Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <button
          onClick={onBackToLobby}
          className="btn btn-secondary"
          style={{ minHeight: '38px', height: '38px', padding: '6px 12px', fontSize: '13px' }}
        >
          <ArrowLeft size={15} /> Lobby
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              background: isComplete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              border: `1px solid ${isComplete ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`,
              color: isComplete ? '#34d399' : '#c4b5fd',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            {placedNumbers.size}/25 Placed
          </div>
          <SoundToggle />
        </div>
      </div>

      {/* Randomized Toast Feedback */}
      {randomizedToast && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(6, 182, 212, 0.9))',
            color: '#ffffff',
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
            animation: 'slideUp 0.2s ease-out',
          }}
        >
          <Sparkles size={16} /> Board Randomized!
        </div>
      )}

      {/* 5x5 Bingo Board (Primary UI Component) */}
      <div
        className="glass-panel"
        style={{
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            YOUR 5×5 BOARD
          </span>

          {selectedCellIndex !== null && !isLocked && (
            <button
              onClick={handleDeleteSelectedCell}
              className="btn btn-danger"
              style={{ minHeight: '32px', height: '32px', padding: '4px 10px', fontSize: '12px' }}
            >
              <Trash2 size={13} /> Remove {cells[selectedCellIndex]}
            </button>
          )}
        </div>

        {/* 5x5 Interactive Board Grid */}
        <div className="bingo-grid" role="grid" aria-label="5x5 Board Setup Grid">
          {cells.map((num, idx) => {
            const isSelected = selectedCellIndex === idx;
            const isDragTarget = dragOverIndex === idx;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleCellClick(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                className={`bingo-cell ${isSelected ? 'selected' : ''} ${isDragTarget ? 'drag-target-hover' : ''} ${
                  isLocked ? 'locked' : ''
                }`}
                style={{
                  borderStyle: num === null ? 'dashed' : 'solid',
                  borderColor: isSelected
                    ? 'var(--accent-cyan)'
                    : num === null
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(139, 92, 246, 0.4)',
                  background: num === null ? 'rgba(15, 23, 42, 0.5)' : 'rgba(30, 41, 64, 0.85)',
                  cursor: isLocked ? 'default' : 'pointer',
                }}
                disabled={isLocked}
                aria-label={`Cell ${idx + 1}, ${num !== null ? `number ${num}` : 'empty'}`}
              >
                {num !== null ? (
                  <span style={{ color: '#ffffff', fontWeight: 900 }}>{num}</span>
                ) : (
                  <span style={{ color: 'rgba(255, 255, 255, 0.15)', fontSize: '12px' }}>+</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Next Number Indicator (Method 1) */}
      {!isLocked && nextSequentialNumber !== null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontWeight: 800 }}>
            <MousePointerClick size={16} />
            <span>Tap any empty cell to place NEXT number:</span>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              background: '#06b6d4',
              color: '#ffffff',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
            }}
          >
            {nextSequentialNumber}
          </span>
        </div>
      )}

      {/* Number Bank (1–25) */}
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
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>
            NUMBER BANK (TAP NUMBER → TAP CELL)
          </span>
          {selectedNumber !== null && (
            <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 800 }}>
              Placing: [{selectedNumber}]
            </span>
          )}
        </div>

        <div className="number-bank-grid">
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const isPlaced = placedNumbers.has(num);
            const isSelected = selectedNumber === num;

            return (
              <button
                key={num}
                type="button"
                draggable={!isLocked && !isPlaced}
                onDragStart={(e) => handleDragStart(e, num)}
                onClick={() => handleBankNumberClick(num)}
                disabled={isLocked || isPlaced}
                className={`number-bank-item ${isSelected ? 'selected' : ''} ${isPlaced ? 'placed' : ''}`}
                style={{
                  textDecoration: isPlaced ? 'line-through' : 'none',
                }}
                aria-label={`Bank number ${num}${isPlaced ? ', placed' : ''}`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit Controls: Randomize, Undo, Redo, Clear */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, 2fr) 1fr 1fr 1fr',
          gap: 'clamp(4px, 1.5vw, 8px)',
        }}
      >
        <button
          onClick={handleRandomize}
          disabled={isLocked}
          className="btn btn-primary"
          style={{ minHeight: '42px', padding: '6px 10px', fontSize: 'clamp(11px, 3vw, 13px)', fontWeight: 800 }}
        >
          <Shuffle size={14} /> RANDOMIZE
        </button>

        <button
          onClick={handleUndo}
          disabled={history.length === 0 || isLocked}
          className="btn btn-secondary"
          style={{ minHeight: '42px', padding: '6px', fontSize: '12px' }}
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={16} />
        </button>

        <button
          onClick={handleRedo}
          disabled={redoStack.length === 0 || isLocked}
          className="btn btn-secondary"
          style={{ minHeight: '42px', padding: '6px', fontSize: '12px' }}
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 size={16} />
        </button>

        <button
          onClick={handleResetBoard}
          disabled={placedNumbers.size === 0 || isLocked}
          className="btn btn-danger"
          style={{ minHeight: '42px', padding: '6px', fontSize: '12px' }}
          title="Clear Board"
          aria-label="Clear Board"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div
        className="sticky-bottom-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px calc(10px + var(--sab))',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: isComplete ? '#34d399' : '#fbbf24' }}>
            {isComplete ? 'Board Complete!' : `Place ${25 - placedNumbers.size} more`}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {readyCount}/{totalCount} Ready
          </span>
        </div>

        {isLocked ? (
          <button
            onClick={handleUnlockBoard}
            className="btn btn-secondary"
            style={{ minHeight: '44px', padding: '6px clamp(12px, 3vw, 20px)', fontSize: '13px', fontWeight: 800 }}
          >
            <Unlock size={15} /> UNLOCK
          </button>
        ) : (
          <button
            onClick={handleLockBoard}
            disabled={!isComplete || isLocking}
            className="btn btn-success"
            style={{
              minHeight: '44px',
              padding: '6px clamp(14px, 4vw, 24px)',
              fontSize: '14px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              boxShadow: isComplete ? '0 0 20px rgba(16, 185, 129, 0.5)' : 'none',
            }}
          >
            <Lock size={15} /> {isLocking ? 'Locking...' : 'LOCK BOARD'}
          </button>
        )}
      </div>
    </div>
  );
};
