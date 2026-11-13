export type RelicId =
  | 'lodestone_heart'
  | 'twin_zephyr'
  | 'blood_chalice'
  | 'sunforged_lens'
  | 'iron_spurs'
  | 'executioner_seal';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RelicSetId = 'fire' | 'shadow' | 'tempest';

export interface RelicSynergyDefinition {
  id: RelicSetId;
  setName: string;
  synergyTitle: string;
  bonusSummary: string;
  accentColor: string;
}

export interface RelicDefinition {
  id: RelicId;
  rarity: RelicRarity;
  setId: RelicSetId;
  name: string;
  subtitle: string;
  description: string;
  effectSummary: string;
  traitBenefits: string[];
  cost: number;
  icon: 'magnet' | 'wind' | 'heart' | 'sun' | 'zap' | 'sword';
  accentColor: string;
}

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
  dashCharges: number;
  dashCooldownMs: number;
  lightRadiusMultiplier: number;
  eliteKillHeal: number;
  equippedRelicIds: RelicId[];
  activeRelicSynergies: RelicSetId[];
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
  challengesCompleted?: number;
}

export type DynamicChallengeId =
  | 'no_red_shards'
  | 'no_coin_greed'
  | 'untouchable'
  | 'stand_firm'
  | 'cull_the_horde'
  | 'light_purist';

export interface DynamicChallengeOffer {
  id: DynamicChallengeId;
  title: string;
  description: string;
  constraintLabel: string;
  rewardCoins: number;
  rewardBuffLabel: string;
  targetValue: number;
  timeLimitSec?: number;
  icon: 'shard' | 'coins' | 'shield' | 'flame' | 'skull' | 'sun';
}

export interface ActiveDynamicChallenge extends DynamicChallengeOffer {
  progress: number;
  elapsedSec: number;
  status: 'active' | 'completed' | 'failed';
  statusNote: string;
}

export interface BossInfo {
  name: string;
  currentHp: number;
  maxHp: number;
  active: boolean;
  recommendedLevel?: number;
  enraged?: boolean;
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

export interface DpsSample {
  timeSec: number;
  dps: number;
}

export type DailyMissionType =
  | 'kill_enemies'
  | 'survive_seconds'
  | 'collect_coins'
  | 'kill_elites'
  | 'kill_bosses'
  | 'reach_level'
  | 'play_runs';

export type DailyMissionCategory = 'combat' | 'survival' | 'treasure';

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  type: DailyMissionType;
  category: DailyMissionCategory;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardSeals: number;
  completed: boolean;
  claimed: boolean;
  icon: 'skull' | 'clock' | 'coins' | 'crown' | 'sparkles' | 'flame';
}

export interface DailyMissionsState {
  dateKey: string;
  missions: DailyMission[];
}

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastLoginDateKey: string;
  lastRewardCoins: number;
}

export type BestiaryEnemyId = 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss';

export type BestiaryKillsMap = Record<BestiaryEnemyId, number>;

export interface BestiaryEntry {
  id: BestiaryEnemyId;
  name: string;
  title: string;
  threatClass: string;
  spriteSrc: string;
  lore: string;
  tacticalNote: string;
  accentColor: string;
}

export type AchievementStatKey =
  | 'totalKills'
  | 'longestRunSec'
  | 'bossesDefeated'
  | 'elitesSlain'
  | 'highestLevel'
  | 'totalCoinsEarned'
  | 'runsCompleted';

export type AchievementCategory = 'combat' | 'survival' | 'bosses' | 'mastery';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  statKey: AchievementStatKey;
  target: number;
  rewardCoins: number;
  icon: 'skull' | 'clock' | 'crown' | 'swords' | 'coins' | 'flame' | 'sparkles';
}

export interface LifetimeAchievementStats {
  totalKills: number;
  longestRunSec: number;
  bossesDefeated: number;
  elitesSlain: number;
  highestLevel: number;
  totalCoinsEarned: number;
  runsCompleted: number;
}

export interface AchievementsProgressState {
  stats: LifetimeAchievementStats;
  unlockedIds: string[];
  claimedIds: string[];
}

