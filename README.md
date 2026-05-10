# Blackline Table Hub (Mobile-only)

A unified offline-first mobile table games hub built with Expo + React Native.

## What is implemented

- Strict black minimal UI with white accents, simplified touch controls, and thumb-friendly layout.
- Shared account identity + shared balance across all games.
- Lifetime net worth metric that only increments when positive outcomes occur.
- Shared progression system (XP, level, tier) across all games.
- Shared quest system with rewards and claiming flow.
- Real-time truthful per-game statistics updated from each resolved round.
- Session tracking for current game run (hands, net, streak, wagered).
- Offline persistence via local storage.
- Included game modes in one ecosystem: Blackjack, Hold'em, Omaha, Baccarat, Roulette, Craps, Plinko, Video Poker, Hi-Lo.

## Run

```bash
npm install
npm run start
```

## Accuracy design notes

- Stats are mutation-driven from one round result source (`simulateRound`) to avoid mismatched counters.
- Balance, XP, lifetime net worth, quests, and game stats update atomically in one reducer-like state transaction.
- UI reads only from central state (`GameContext`) for consistency across screens.

