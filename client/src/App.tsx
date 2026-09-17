import React, { useState, useEffect } from 'react';
import { useGame } from './context/GameSocketContext.js';
import { LandingPage } from './components/LandingPage.js';
import { LobbyView } from './components/LobbyView.js';
import { BoardSetupView } from './components/BoardSetupView.js';
import { CountdownOverlay } from './components/CountdownOverlay.js';
import { GameplayView } from './components/GameplayView.js';
import { ResultsView } from './components/ResultsView.js';
import { BingoAnnouncementModal } from './components/BingoAnnouncementModal.js';
import { AlertTriangle, X } from 'lucide-react';

export const AppContent: React.FC = () => {
  const {
    room,
    countdown,
    announcement,
    errorNotification,
    clearError,
    leaveRoom,
  } = useGame();

  const [activeTab, setActiveTab] = useState<'lobby' | 'board_setup'>('lobby');

  // Reset tab when room changes
  useEffect(() => {
    if (room?.status === 'BOARD_SETUP') {
      setActiveTab('board_setup');
    } else if (room?.status === 'LOBBY') {
      setActiveTab('lobby');
    }
  }, [room?.status]);

  if (!room) {
    return <LandingPage />;
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      {/* Global Error Banner */}
      {errorNotification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: 'rgba(244, 63, 94, 0.95)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '420px',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={20} />
          <div style={{ flex: 1 }}>{errorNotification}</div>
          <button
            onClick={clearError}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Countdown Transition Overlay */}
      {countdown !== null && <CountdownOverlay count={countdown} />}

      {/* Bingo Claim Celebration Announcement */}
      {announcement !== null && (
        <BingoAnnouncementModal
          announcement={announcement}
          onClose={() => {
            // Handled automatically or on click
          }}
        />
      )}

      {/* Dynamic Screen View according to room status */}
      {(() => {
        switch (room.status) {
          case 'LOBBY':
          case 'BOARD_SETUP':
            return activeTab === 'board_setup' ? (
              <BoardSetupView onBackToLobby={() => setActiveTab('lobby')} />
            ) : (
              <LobbyView onPrepareBoard={() => setActiveTab('board_setup')} />
            );


          case 'COUNTDOWN':
          case 'PLAYING':
            return <GameplayView />;

          case 'ROUND_COMPLETE':
          case 'GAME_COMPLETE':
          case 'RESULTS':
            return (
              <ResultsView
                onReturnHome={leaveRoom}
                onNewGame={leaveRoom}
              />
            );

          default:
            return <LandingPage />;
        }
      })()}
    </div>
  );
};
