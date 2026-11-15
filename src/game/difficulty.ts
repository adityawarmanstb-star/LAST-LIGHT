import { GameDifficultyId } from './types';

export interface DifficultyPreset {
  id: GameDifficultyId;
  name: string;
  tierLabel: string;
  tagline: string;
  statSummary: string;
  iconId: string;
  rarityFrame: 'common' | 'rare' | 'epic' | 'legendary';
  ironHighlight: 'cyan' | 'gold' | 'blood';
  accentColor: string;
  enemyHpMult: number;
  enemyDmgMult: number;
  enemySpeedMult: number;
  spawnDensityMult: number;
  spawnIntervalMult: number;
  bloodFogScale: number;
  coinMultiplier: number;
}

export const DIFFICULTY_PRESETS: Record<GameDifficultyId, DifficultyPreset> = {
  baby: {
    id: 'baby',
    name: 'BABY',
    tierLabel: 'EASY',
    tagline: 'A forgiving lantern path through the Ashfen.',
    statSummary: 'Enemy HP 55% · Damage 50% · Speed 82% · Milder Swarms',
    iconId: 'difficulty_baby',
    rarityFrame: 'rare',
    ironHighlight: 'cyan',
    accentColor: '#5de4ff',
    enemyHpMult: 0.55,
    enemyDmgMult: 0.5,
    enemySpeedMult: 0.82,
    spawnDensityMult: 0.65,
    spawnIntervalMult: 1.35,
    bloodFogScale: 0.65,
    coinMultiplier: 0.85,
  },
  pro: {
    id: 'pro',
    name: 'PRO',
    tierLabel: 'MEDIUM',
    tagline: 'Balanced steel for seasoned wardens.',
    statSummary: 'Enemy HP 78% · Damage 75% · Speed 90% · Steady Swarms',
    iconId: 'difficulty_pro',
    rarityFrame: 'epic',
    ironHighlight: 'gold',
    accentColor: '#f2c464',
    enemyHpMult: 0.78,
    enemyDmgMult: 0.75,
    enemySpeedMult: 0.9,
    spawnDensityMult: 0.82,
    spawnIntervalMult: 1.15,
    bloodFogScale: 0.82,
    coinMultiplier: 1.0,
  },
  hacker: {
    id: 'hacker',
    name: 'HACKER',
    tierLabel: 'NIGHTMARE',
    tagline: 'The original merciless Ashfen nightmare.',
    statSummary: 'Enemy HP 100% · Damage 100% · Speed 100% · Full Horde',
    iconId: 'difficulty_hacker',
    rarityFrame: 'legendary',
    ironHighlight: 'blood',
    accentColor: '#e5303a',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemySpeedMult: 1.0,
    spawnDensityMult: 1.0,
    spawnIntervalMult: 1.0,
    bloodFogScale: 1.0,
    coinMultiplier: 1.0,
  },
};

export const DIFFICULTY_LIST: DifficultyPreset[] = [
  DIFFICULTY_PRESETS.baby,
  DIFFICULTY_PRESETS.pro,
  DIFFICULTY_PRESETS.hacker,
];

export function sanitizeDifficultyId(value: unknown): GameDifficultyId {
  if (value === 'baby' || value === 'pro' || value === 'hacker') {
    return value;
  }
  return 'hacker';
}
