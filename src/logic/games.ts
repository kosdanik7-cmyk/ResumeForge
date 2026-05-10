import { GameId } from '../types';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const random = () => Math.random();

export const simulateRound = (gameId: GameId, bet: number) => {
  const b = clamp(bet, 1, 50000);
  switch (gameId) {
    case 'blackjack': {
      const roll = random();
      if (roll < 0.42) return { net: b, detail: 'Win', xp: 10 };
      if (roll < 0.47) return { net: b * 1.5, detail: 'Blackjack', xp: 14 };
      if (roll < 0.55) return { net: 0, detail: 'Push', xp: 6 };
      return { net: -b, detail: 'Loss', xp: 8 };
    }
    case 'baccarat': {
      const r = random();
      if (r < 0.4586) return { net: b * 0.95, detail: 'Banker', xp: 9 };
      if (r < 0.9048) return { net: b, detail: 'Player', xp: 9 };
      if (r < 0.95) return { net: b * 8, detail: 'Tie', xp: 20 };
      return { net: -b, detail: 'Miss', xp: 7 };
    }
    case 'roulette': {
      const r = random();
      if (r < 0.4737) return { net: b, detail: 'Even-money hit', xp: 8 };
      if (r < 0.5) return { net: b * 35, detail: 'Straight-up hit', xp: 28 };
      return { net: -b, detail: 'Spin miss', xp: 8 };
    }
    case 'craps': {
      const r = random();
      if (r < 0.49) return { net: b, detail: 'Pass line win', xp: 9 };
      if (r < 0.53) return { net: b * 3, detail: 'Odds hit', xp: 14 };
      return { net: -b, detail: 'Seven out', xp: 8 };
    }
    case 'plinko': {
      const r = random();
      if (r < 0.02) return { net: b * 16, detail: 'Mega multiplier', xp: 22 };
      if (r < 0.12) return { net: b * 3, detail: 'High multiplier', xp: 16 };
      if (r < 0.62) return { net: b * 0.4, detail: 'Small return', xp: 8 };
      return { net: -b, detail: 'Low slot', xp: 6 };
    }
    case 'holdem': {
      const r = random();
      if (r < 0.45) return { net: b * 1.4, detail: 'Pot won', xp: 14 };
      if (r < 0.5) return { net: b * 3.2, detail: 'Big showdown', xp: 20 };
      return { net: -b, detail: 'Folded/lost', xp: 10 };
    }
    case 'omaha': {
      const r = random();
      if (r < 0.43) return { net: b * 1.6, detail: 'Hand won', xp: 16 };
      if (r < 0.48) return { net: b * 3.8, detail: 'Nut hand', xp: 24 };
      return { net: -b, detail: 'Lost pot', xp: 10 };
    }
    case 'videoPoker': {
      const r = random();
      if (r < 0.38) return { net: b, detail: 'Pair+ payout', xp: 10 };
      if (r < 0.42) return { net: b * 5, detail: 'Strong made hand', xp: 18 };
      return { net: -b, detail: 'No payout', xp: 7 };
    }
    case 'hiLo': {
      const r = random();
      if (r < 0.48) return { net: b, detail: 'Correct guess', xp: 7 };
      if (r < 0.52) return { net: b * 2, detail: 'Streak bonus', xp: 11 };
      return { net: -b, detail: 'Wrong guess', xp: 6 };
    }
  }
};
