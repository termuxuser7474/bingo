import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export const triggerBingoConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const interval: NodeJS.Timeout = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleCount = 50 * (timeLeft / duration);
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() - 0.2 },
      colors: ['#8b5cf6', '#06b6d4', '#10b981', '#fbbf24', '#f43f5e'],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() - 0.2 },
      colors: ['#8b5cf6', '#06b6d4', '#10b981', '#fbbf24', '#f43f5e'],
    });
  }, 250);
};

export const ConfettiEffect: React.FC = () => {
  useEffect(() => {
    triggerBingoConfetti();
  }, []);

  return null;
};
