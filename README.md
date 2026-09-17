# 🎮 BINGO — Multiplayer Web Application

> **“Fill. Call. Strike. BINGO.”**

A production-quality, real-time multiplayer web application inspired by Skribbl.io. Built with React, TypeScript, Express, and Socket.IO.

---

## 🌟 Core Gameplay Concept (Custom Strategic Bingo)

This application is **NOT** traditional 75/90-ball machine lottery Bingo:
1. **5×5 Custom Grid**: Each player independently arranges the numbers **1–25** into their 25 cells before the game starts.
2. **Three Placement Methods**:
   - **Method 1 — Sequential Click Placement**: Place 1, 2, 3... 25 in order with next-number guidance.
   - **Method 2 — Number Bank Selection**: Click a number from the 1–25 bank, then click any empty grid cell.
   - **Method 3 — Drag & Drop**: Drag numbers from the bank directly onto empty cells.
   - **Editing**: Undo, Redo, Delete (returns number to bank), Reset, and Fisher-Yates Randomize / Randomize Again.
3. **Lock & Ready**: Players lock their boards when all 25 numbers are placed without duplicates.
4. **Global Simultaneous Strike**:
   - Players take turns calling **one** number.
   - When called, that number is **struck across every player's board at the same time**.
   - Numbers remain visible with an animated strike line and checkmark.
5. **12 Bingo Lines**: Any completed horizontal row (5), vertical column (5), or diagonal (2).
6. **Server-Authoritative Claims**:
   - Claiming BINGO is validated server-side (anti-cheat).
7. **Multiple Winners & Continuation**:
   - The match does **not** abruptly end on the 1st winner. It continues to determine 2nd and 3rd Bingo winners.
8. **Rematch (Play Again)**:
   - Players can start a rematch without needing to re-create the room or enter a new code.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Canvas Confetti.
- **Styling**: Vanilla CSS design system with glassmorphism, responsive grid, animated strikes, and dark-mode aesthetics.
- **Audio**: Native Web Audio API synthesizer for zero-lag offline sound effects (with Mute toggle).
- **Backend**: Node.js, Express, Socket.IO, TypeScript.
- **Database**: Persistent JSON/Relational schema with indexed room codes and player states for crash recovery and reconnections.
- **Testing**: Vitest + End-to-End multi-client automated Socket.IO simulation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Run in Development Mode
```bash
npm run dev
```
- Client runs on: `http://localhost:5173`
- Server runs on: `http://localhost:3001`

### 3. Build & Run Production Bundle
```bash
npm run build
npm start
```
Open `http://localhost:3001` in your browser.

---

## 🧪 Automated Testing

### Unit Tests (All 20 Core Mechanics)
```bash
npm test
```
Tests:
1. Random board contains exactly 1–25.
2. No duplicate numbers in random board.
3. Sequential placement works accurately.
4. Number selection placement works.
5. Delete works and restores number to bank.
6. Undo restores prior board state.
7. Locked boards cannot be edited once game starts.
8. Called number marks all players' boards simultaneously.
9. Duplicate number calls are rejected.
10. Turn rotation rotates in circular order.
11. Horizontal Bingo detection works for all rows.
12. Vertical Bingo detection works for all columns.
13. Diagonal Bingo detection works for both diagonals.
14. Multiple simultaneous Bingo lines from a single call are detected.
15. Invalid Bingo claims are rejected by server validation.
16. Valid Bingo claims are accepted and awarded points.
17. Winner order (1st, 2nd, 3rd) is strictly maintained.
18. Game continues after first Bingo according to match settings.
19. Reconnection restores player state and board.
20. Unauthorized clients cannot call numbers or change turns.

### End-to-End Multiplayer Simulation Test
```bash
npm run test:e2e
```
Connects multiple concurrent Socket.IO clients to verify room creation, joining, board locking, countdown, turn rotations, anti-cheat validation, global strikes, 1st & 2nd winner claims, podium results, and rematch transitions.
