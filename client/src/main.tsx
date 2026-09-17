import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameSocketProvider } from './context/GameSocketContext.js';
import { AppContent } from './App.js';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameSocketProvider>
      <AppContent />
    </GameSocketProvider>
  </React.StrictMode>
);
