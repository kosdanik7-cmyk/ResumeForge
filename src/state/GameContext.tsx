import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { GAMES } from '../data/games';
import { simulateRound } from '../logic/games';
import { GameId, GameSession, GameStats, HubState, Quest } from '../types';

const emptyStats = (): GameStats => ({
  rounds: 0,
  wins: 0,
  losses: 0,
  pushes: 0,
  wagered: 0,
  net: 0,
  biggestWin: 0,
  bestStreak: 0,
  worstStreak: 0,
  avgBet: 0,
  volatility: 0,
  last10: []
});

const buildInitial = (): HubState => {
  const stats = Object.fromEntries(GAMES.map((g) => [g.id, emptyStats()])) as Record<GameId, GameStats>;
  const quests: Quest[] = [
    { id: 'q1', title: 'Win 5 rounds anywhere', type: 'wins', target: 5, progress: 0, rewardXp: 60, rewardCoins: 600, claimable: false, claimed: false },
    { id: 'q2', title: 'Play 20 total rounds', type: 'rounds', target: 20, progress: 0, rewardXp: 80, rewardCoins: 800, claimable: false, claimed: false },
    { id: 'q3', title: 'Earn 1500 net profit', type: 'profit', target: 1500, progress: 0, rewardXp: 120, rewardCoins: 900, claimable: false, claimed: false }
  ];
  return {
    balance: 10000,
    lifetimeNetWorth: 10000,
    level: 1,
    xp: 0,
    tier: 'Bronze I',
    totalPlayTimeMs: 0,
    profile: {
      name: 'Player One',
      avatar: '♠',
      border: 'Clean White',
      badge: 'Rookie',
      favoriteGame: 'blackjack'
    },
    stats,
    quests,
    lastSeen: Date.now()
  };
};

const STORAGE_KEY = 'blackline_hub_state_v1';

type Ctx = {
  state: HubState;
  enterSession: (gameId: GameId) => void;
  playRound: (bet: number) => { net: number; detail: string } | null;
  leaveSession: () => void;
  claimQuest: (id: string) => void;
};

const GameContext = createContext<Ctx | null>(null);

const nextTier = (level: number) => {
  if (level >= 40) return 'Onyx';
  if (level >= 25) return 'Diamond';
  if (level >= 15) return 'Platinum';
  if (level >= 8) return 'Gold';
  return 'Bronze';
};

export const GameProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<HubState>(buildInitial());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setState(JSON.parse(raw) as HubState);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const enterSession = (gameId: GameId) => {
    setState((s) => ({
      ...s,
      activeSession: {
        id: `${gameId}-${Date.now()}`,
        gameId,
        startedAt: Date.now(),
        hands: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        totalWagered: 0,
        net: 0,
        biggestWin: 0,
        biggestDrop: 0,
        streak: 0,
        bestStreak: 0,
        worstStreak: 0
      }
    }));
  };

  const claimQuest = (id: string) => {
    setState((s) => {
      const quest = s.quests.find((q) => q.id === id);
      if (!quest || !quest.claimable || quest.claimed) return s;
      const xp = s.xp + quest.rewardXp;
      const gainedLevels = Math.floor(xp / 100);
      return {
        ...s,
        xp: xp % 100,
        level: s.level + gainedLevels,
        tier: nextTier(s.level + gainedLevels),
        balance: s.balance + quest.rewardCoins,
        lifetimeNetWorth: s.lifetimeNetWorth + quest.rewardCoins,
        quests: s.quests.map((q) => (q.id === id ? { ...q, claimed: true, claimable: false } : q))
      };
    });
  };

  const playRound = (bet: number) => {
    if (!state.activeSession || state.balance < bet || bet <= 0) return null;
    const result = simulateRound(state.activeSession.gameId, bet);
    setState((s) => {
      if (!s.activeSession) return s;
      const prev = s.stats[s.activeSession.gameId];
      const won = result.net > 0;
      const push = result.net === 0;
      const loss = result.net < 0;
      const streak = won ? Math.max(1, s.activeSession.streak + 1) : loss ? Math.min(-1, s.activeSession.streak - 1) : s.activeSession.streak;
      const updatedNetWorth = result.net > 0 ? s.lifetimeNetWorth + result.net : s.lifetimeNetWorth;
      const roundDelta = result.net;
      const xpTotal = s.xp + result.xp;
      const gainedLevels = Math.floor(xpTotal / 100);

      const updatedStats: GameStats = {
        ...prev,
        rounds: prev.rounds + 1,
        wins: prev.wins + (won ? 1 : 0),
        losses: prev.losses + (loss ? 1 : 0),
        pushes: prev.pushes + (push ? 1 : 0),
        wagered: prev.wagered + bet,
        net: prev.net + roundDelta,
        biggestWin: Math.max(prev.biggestWin, roundDelta),
        bestStreak: Math.max(prev.bestStreak, streak),
        worstStreak: Math.min(prev.worstStreak, streak),
        avgBet: (prev.wagered + bet) / (prev.rounds + 1),
        volatility: Math.abs(prev.net + roundDelta) / Math.max(1, prev.rounds + 1),
        last10: [...prev.last10.slice(-9), roundDelta]
      };

      const updatedQuests = s.quests.map((q) => {
        if (q.claimed) return q;
        const progress =
          q.type === 'wins'
            ? q.progress + (won ? 1 : 0)
            : q.type === 'rounds'
              ? q.progress + 1
              : q.progress + Math.max(0, roundDelta);
        return {
          ...q,
          progress,
          claimable: progress >= q.target
        };
      });

      return {
        ...s,
        balance: s.balance + roundDelta,
        lifetimeNetWorth: updatedNetWorth,
        xp: xpTotal % 100,
        level: s.level + gainedLevels,
        tier: nextTier(s.level + gainedLevels),
        stats: { ...s.stats, [s.activeSession.gameId]: updatedStats },
        quests: updatedQuests,
        activeSession: {
          ...s.activeSession,
          hands: s.activeSession.hands + 1,
          wins: s.activeSession.wins + (won ? 1 : 0),
          losses: s.activeSession.losses + (loss ? 1 : 0),
          pushes: s.activeSession.pushes + (push ? 1 : 0),
          totalWagered: s.activeSession.totalWagered + bet,
          net: s.activeSession.net + roundDelta,
          biggestWin: Math.max(s.activeSession.biggestWin, roundDelta),
          biggestDrop: Math.min(s.activeSession.biggestDrop, s.activeSession.net + roundDelta),
          streak,
          bestStreak: Math.max(s.activeSession.bestStreak, streak),
          worstStreak: Math.min(s.activeSession.worstStreak, streak)
        }
      };
    });
    return { net: result.net, detail: result.detail };
  };

  const leaveSession = () => {
    setState((s) => {
      if (!s.activeSession) return s;
      return {
        ...s,
        totalPlayTimeMs: s.totalPlayTimeMs + (Date.now() - s.activeSession.startedAt),
        activeSession: undefined,
        lastSeen: Date.now()
      };
    });
  };

  const value = useMemo(() => ({ state, enterSession, playRound, leaveSession, claimQuest }), [state]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useHub = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useHub must be used in GameProvider');
  return ctx;
};
