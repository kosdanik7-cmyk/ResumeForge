import { GameMeta } from '../types';

export const GAMES: GameMeta[] = [
  { id: 'blackjack', name: 'Blackjack', description: 'Fast multi-hand action.', minBet: 10, maxBet: 1000 },
  { id: 'holdem', name: "Texas Hold'em", description: 'Strategic AI poker tables.', minBet: 50, maxBet: 5000 },
  { id: 'omaha', name: 'Omaha', description: 'Four-card advanced poker.', minBet: 75, maxBet: 7500 },
  { id: 'baccarat', name: 'Baccarat', description: 'Player, Banker, Tie.', minBet: 20, maxBet: 2500 },
  { id: 'roulette', name: 'Roulette', description: 'Smart mobile betting board.', minBet: 10, maxBet: 3000 },
  { id: 'craps', name: 'Craps', description: 'Guided phases + dice action.', minBet: 10, maxBet: 3000 },
  { id: 'plinko', name: 'Plinko', description: 'Smooth premium physics drops.', minBet: 5, maxBet: 1000 },
  { id: 'videoPoker', name: 'Video Poker', description: 'Quick solo card strategy.', minBet: 10, maxBet: 1200 },
  { id: 'hiLo', name: 'Hi-Lo', description: 'Rapid guess-and-risk rounds.', minBet: 5, maxBet: 800 }
];
