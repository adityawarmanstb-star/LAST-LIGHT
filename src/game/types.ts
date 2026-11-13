export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  moveSpeed: number;
  damageMultiplier: number;
  cooldownMultiplier: number; // lower is faster
  magnetRadius: number;
  coinMultiplier: number;
  critChance: number;
  critMultiplier: number;
  projectilePierce: number;
  hasRevive: boolean;
  usedRevive: boolean;
}

export interface WeaponState {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  damage: number;
  cooldown: number; // in ms
  lastFired: number;
  unlocked: boolean;
  description: string;
  icon: string;
}

export interface UpgradeOption {
  id: string;
  weaponId?: string;
  title: string;
  description: string;
  category: 'weapon_unlock' | 'weapon_upgrade' | 'stat_upgrade';
  icon: string;
  levelText: string;
  rarity: 'common' | 'rare' | 'epic';
}

export interface MetaUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number[]; // cost per rank
  currentRank: number;
  maxRank: number;
  statPerRank: string;
  icon: string;
}

export interface RunStats {
  timeSurvived: number; // in seconds
  enemiesKilled: number;
  coinsEarned: number;
  levelReached: number;
  damageDealt: number;
  victory: boolean;
}

export interface BossInfo {
  name: string;
  currentHp: number;
  maxHp: number;
  active: boolean;
}

export interface EventWarningInfo {
  title: string;
  subtitle: string;
}

export interface DebugStats {
  fps: number;
  enemyCount: number;
  killsPerMin: number;
  playerDps: number;
  currentMinute: number;
}

