export type GameId =
  | 'blackjack'
  | 'baccarat'
  | 'roulette'
  | 'craps'
  | 'plinko'
  | 'holdem'
  | 'omaha'
  | 'videoPoker'
  | 'hiLo';

export type GameMeta = {
  id: GameId;
  name: string;
  description: string;
  minBet: number;
  maxBet: number;
};

export type GameSession = {
  id: string;
  gameId: GameId;
  startedAt: number;
  hands: number;
  wins: number;
  losses: number;
  pushes: number;
  totalWagered: number;
  net: number;
  biggestWin: number;
  biggestDrop: number;
  streak: number;
  bestStreak: number;
  worstStreak: number;
};

export type GameStats = {
  rounds: number;
  wins: number;
  losses: number;
  pushes: number;
  wagered: number;
  net: number;
  biggestWin: number;
  bestStreak: number;
  worstStreak: number;
  avgBet: number;
  volatility: number;
  last10: number[];
};

export type Profile = {
  name: string;
  avatar: string;
  border: string;
  badge: string;
  favoriteGame: GameId;
};

export type Quest = {
  id: string;
  title: string;
  gameId?: GameId;
  type: 'wins' | 'rounds' | 'profit';
  target: number;
  rewardXp: number;
  rewardCoins: number;
  progress: number;
  claimable: boolean;
  claimed: boolean;
};

export type HubState = {
  balance: number;
  lifetimeNetWorth: number;
  level: number;
  xp: number;
  tier: string;
  totalPlayTimeMs: number;
  profile: Profile;
  activeSession?: GameSession;
  stats: Record<GameId, GameStats>;
  quests: Quest[];
  lastSeen: number;
};
