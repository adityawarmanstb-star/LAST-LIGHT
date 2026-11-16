import Phaser from 'phaser';
import { soundManager } from '../audio';
import { gameManager } from '../GameManager';
import { calculateBasePlayerStats, saveCoins, getSavedCoins } from '../metaProgression';
import { dailyMissions } from '../dailyMissions';
import { achievements } from '../achievements';
import { bestiary } from '../bestiary';
import { haptics } from '../../mobile/haptics';
import { CameraController } from '../CameraController';
import { AtmosphereOverlay } from '../AtmosphereOverlay';
import { ShadowCasterSystem } from '../ShadowCasterSystem';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  UpscaleSharpFilterController,
  attachUpscaleSharpFilter,
  getLogicalScrollX,
  getLogicalScrollY,
  getScrollZeroOffset,
  getWebGlMaxTextureSize,
  performanceRuntime,
  resolveRenderScale,
  syncLogicalCamera,
  upgradeTextureFiltering,
} from '../PerformanceEngine';
import {
  ActiveDynamicChallenge,
  BossInfo,
  DynamicChallengeOffer,
  GoreLevel,
  PlayerStats,
  RunStats,
  UpgradeOption,
  WeaponState,
} from '../types';
import { DIFFICULTY_PRESETS, DifficultyPreset } from '../difficulty';
import {
  createActiveDynamicChallenge,
  formatChallengeProgressText,
  pickDynamicChallengeOffer,
} from '../dynamicChallenges';
import { getAvailableUpgrades } from '../upgrades';

// =========================================================================
// STARTING POWER & PROGRESSION BALANCE CONSTANTS
// =========================================================================
export const BALANCE = {
  player: {
    startingHp: 100,
    hpRegenPerSec: 0, // No regeneration
  },
  primaryWeapon: {
    startingProjectiles: 1,         // Start with 1 projectile per shot (not 3)
    baseDamage: 10,                 // Base damage per bolt
    fireRatePerSec: 1.3,            // 1.3 shots/sec (~769ms cooldown)
    projectileSpeed: 420,
    rangeScreenHeightRatio: 0.6,    // Range limited to ~60% of screen height
    baseSpreadRad: 0.18,            // Spread step at 2 projectiles
    spreadWidenPerExtraProj: 0.04,  // Widens spread angle as projectile count grows
  },
  multishot: {
    maxLevel: 4,                    // Max level 4 (+1 projectile/level => up to 5)
    extraProjectilesPerLevel: 1,
    damagePenaltyPerLevel: 0.06,    // -6% damage per projectile per level
  },
  xp: {
    firstLevelXp: 8,                // ~8 kills for first level-up
    xpGrowthMultiplier: 1.03,       // Steady +3% scaling within each 5-level bracket
    xpFlatIncrement: 2,             // +2 XP base step within each 5-level bracket
    milestoneInterval: 5,           // Every 5 levels triggers a hardcore XP wall
    milestoneMultiplier: 1.45,      // +45% XP requirement spike at each 5-level gap
    milestoneFlatPerTier: 16,       // +16 * tier flat XP surge at each 5-level gap (16, 32, 48...)
  },
  levelUp: {
    cardCount: 3,
    minWeaponOrUpgradeCards: 1,     // Always offer at least 1 new weapon or upgrade
  },
  startingKit: {
    shotgunUnlockedAtStart: false,  // Power grows through choices, not starting kit
  },
} as const;

// =========================================================================
// SPAWN_TIMELINE DATA TABLE (Pacing, Scaling, Events, Pressure, Combo, Feel)
// =========================================================================
export const SPAWN_TIMELINE = {
  maxActiveEnemies: 120,
  enemyScaling: {
    hpGrowthPerMinute: 0.12,        // +12% enemy HP per minute
    speedGrowthPerMinute: 0.03,     // +3% enemy speed per minute
    maxSpeedBonus: 0.4,             // Max +40% enemy speed scaling
  },
  pacingTargets: [
    { timeSec: 0, minTarget: 6, maxTarget: 8 },
    { timeSec: 30, minTarget: 7, maxTarget: 9 },
    { timeSec: 60, minTarget: 15, maxTarget: 15 },
    { timeSec: 120, minTarget: 30, maxTarget: 30 },
    { timeSec: 180, minTarget: 50, maxTarget: 50 },
    { timeSec: 300, minTarget: 90, maxTarget: 90 },
    { timeSec: 480, minTarget: 120, maxTarget: 120 },
  ],
  events: {
    warningDurationMs: 2000,        // 2s warning banner + screen-edge red flash
    minEventSpacingSec: 20,         // No more than one event within any 20 seconds
    encirclement: { timeSec: 60, count: 20, radius: 460 },
    stampede: { timeSec: 120, count: 12, speedMultiplier: 1.65, chargeDurationMs: 4500 },
    twinBrutes: { timeSec: 150, count: 2 },
    firstElite: { timeSec: 180, hpMultiplier: 8, scaleMultiplier: 1.45, coinDrops: 3 },
    spitterSquad: { timeSec: 240, count: 5 },
    bossFirstTimeSec: 300,          // 5:00 boss
    recurringCycleSec: 180,         // Every 3 minutes after 5:00 (8:00, 11:00, ...)
  },
  pressure: {
    telegraphDurationMs: 500,       // 0.5s red line or circle telegraph before enemy attacks
    standStillThresholdMs: 4000,    // >4s standing still grants enemies +40% speed
    enemySpeedBonus: 0.4,           // +40% enemy speed while under pressure
    hitInvulnMs: 400,               // 0.4s invulnerability on contact/damage
    gemExpireMs: 12000,             // XP gems expire after 12 seconds
    nearMissOuterRadius: 68,        // Near-miss dodge detection radius
    nearMissInnerRadius: 32,        // Hit radius
    nearMissBonusXp: 2,             // Base bonus XP on near-miss dodge
  },
  combo: {
    decayMs: 3000,                  // Decays if player stops killing for 3s
    maxMultiplier: 5,               // x1 to x5 XP multiplier
    killThresholds: [0, 5, 12, 22, 35], // Streak kills for x1, x2, x3, x4, x5
  },
  feel: {
    intenseMusicTimeSec: 300,       // Switch to music_intense at 5:00
    lowHpThreshold: 0.4,            // Redden vignette slowly below 40% HP
    heartbeatPeriodMs: 850,         // Heartbeat pulse rhythm
  },
} as const;

// =========================================================================
// STAND-STILL COMBAT CONSTANTS
// =========================================================================
export const STAND_STILL_DELAY_MS = 80;
export const ORBIT_BLADES_NEED_STANDING = false;
export const BOSS_RECOMMENDED_LEVEL = 60;

// =========================================================================
// HORDE FRENZY & BLOOD FOG EVENT CONSTANTS
// =========================================================================
export const HORDE_FRENZY = {
  levelInterval: 10,               // Blood Fog triggers every 10 levels (Lv.10, 20, 30...)
  baseDurationMs: 30000,           // Base Blood Fog duration (30s, +3s per wave up to 45s)
  maxDurationMs: 45000,
  enemySpeedMultiplier: 1.35,      // Fallback base speed boost
  spawnDensityMultiplier: 1.65,    // Fallback base density boost
  maxActiveEnemiesOverride: 165,   // Raised enemy cap during Blood Fog
  spawnIntervalScale: 0.52,        // Base faster spawn cadence during Blood Fog
} as const;

// =========================================================================
// OCCASIONAL ELITE ENEMY VARIANTS (Stats, Aura Colors & Bonus XP)
// =========================================================================
export const ELITE_VARIANTS = {
  minRunTimeSec: 25,               // Earliest time roaming Elites can appear
  baseSpawnChance: 0.055,          // 5.5% initial chance per wave spawn after 25s
  chancePerMinute: 0.015,          // +1.5% chance per minute survived
  maxSpawnChance: 0.14,            // Capped at 14%
  spawnCooldownMs: 12000,          // Minimum 12s gap between roaming Elite spawns
  maxActiveElites: 3,              // Maximum concurrent roaming Elites
  hpMultiplier: 3.8,               // +280% higher HP for Elite variants
  speedMultiplier: 1.22,           // +22% faster movement speed
  damageMultiplier: 1.35,          // +35% attack damage
  scaleMultiplier: 1.32,           // Larger silhouette
  xpMultiplier: 4,                 // 4x base enemy XP (min 10)
  bonusXpOrbs: 2,                  // Extra bonus XP orbs scattered on defeat
  chestDropChance: 0.35,           // 35% chance for roaming Elite to drop an Upgrade Chest
} as const;

const ELITE_AURA_STYLE: Record<
  'wisp' | 'imp' | 'spitter' | 'brute' | 'boss',
  { outerColor: number; innerColor: number; spriteTint: number }
> = {
  wisp: { outerColor: 0x5de4ff, innerColor: 0xc44cff, spriteTint: 0xbbeeff },
  imp: { outerColor: 0xe5303a, innerColor: 0xff6b73, spriteTint: 0xff9a9e },
  spitter: { outerColor: 0x90df63, innerColor: 0xd9ff7a, spriteTint: 0xc9ffad },
  brute: { outerColor: 0xf2a93b, innerColor: 0xff4d54, spriteTint: 0xffcca3 },
  boss: { outerColor: 0xf2a93b, innerColor: 0xe5303a, spriteTint: 0xffffff },
};

// =========================================================================
// LIMITED-VISION DARKNESS & LIGHTING CONSTANTS
// =========================================================================
export const LIGHT = {
  renderTextureScale: 0.5,         // Half-resolution RenderTexture scaled 2x
  maxLightSources: 16,             // Hard cap on active light sources per frame (player, torches, boss, FX)
  darkColor: 0x050814,             // Deep blue-black darkness fill
  fillAlpha: 0.88,                 // Base darkness fill opacity (88%)
  maxDarknessOutsideLights: 0.85,  // Minimum visibility: never darker than 85% outside lights
  softFalloffInnerRatio: 0.6,      // Solid core 0..60%, soft falloff over outer 40%
  player: {
    baseRadius: 220,               // Base player lantern radius (px)
    standingBonusRatio: 0.2,       // +20% radius while standing still
    transitionDurationMs: 300,     // Smooth 0.3s grow/shrink transition
    flickerAmplitude: 0.03,        // Subtle +-3% flicker
    flickerSpeedHz: 7.5,           // Normal lantern flicker speed
  },
  lowHp: {
    threshold: 0.3,                // Below 30% HP
    minRadiusScale: 0.7,           // Shrinks smoothly down to 70%
    flickerAmplitude: 0.06,        // Faster/stronger flicker when critical
    flickerSpeedHz: 22.0,
  },
  sources: {
    gemRadius: 60,
    lightShardRadius: 95,
    fxRadius: 80,
    enemyProjRadius: 50,
    bossRadius: 240,
    bossAmberColor: 0xf2a93b,
    bossAmberAlpha: 0.24,
  },
  levelUp: {
    maxRadius: 600,                // Expanding reveal radius (px)
    durationMs: 800,               // 0.8s reveal duration
  },
  enemies: {
    darkAlpha: 0.12,               // Enemy sprite alpha outside light
    fadeDurationMs: 200,           // 0.2s fade-in when entering light
    baseEyeGlowRange: 380,         // Base distance from player where dark enemy eyes glow
    nightEyesRangeMultiplier: 2.0, // Night Eyes card doubles eye-glow detection range
    nightEyesAlphaBoost: 1.35,     // Brighter eye glow with Night Eyes
    nightEyesSizeBoost: 1.25,      // Larger eye glow dots with Night Eyes
    eyeColors: {
      imp: 0xc44cff,               // Magenta
      brute: 0xf2a93b,             // Amber
      spitter: 0xc44cff,           // Magenta
      wisp: 0x5de4ff,              // Cyan
      boss: 0xf2a93b,              // Amber
    },
  },
  progression: {
    brighterLantern: {
      bonusPerLevel: 0.12,         // +12% light radius per level
      maxLevel: 4,                 // Up to 4 levels (+48%)
    },
    lightBurst: {
      radius: 600,                 // Matches level-up reveal pulse radius
      baseDamage: 65,              // Base damage dealt by level-up pulse
      damagePerPlayerLevel: 12,    // Scales with player level
      knockback: 440,              // Strong radial knockback
    },
    lightShard: {
      radiusBonus: 0.35,           // +35% light radius on pickup
      durationMs: 15000,           // Lasts 15 seconds
    },
    darknessFalls: {
      eventTimesSec: [360, 540],   // Minute 6 (360s) and Minute 9 (540s)
      durationMs: 40000,           // Lasts 40 seconds
      radiusPenalty: 0.25,         // -25% light radius during event
      xpDropBonus: 0.5,            // +50% enemy XP drops during event
    },
  },
  fog: {
    layer1Alpha: 0.085,            // Under 12%
    layer2Alpha: 0.065,            // Under 12%
    tint1: 0x5b8bc9,               // Subtle cool-blue tint
    tint2: 0x7cb2e8,
    speed1X: 11,
    speed1Y: 4,
    speed2X: -8,
    speed2Y: 6,
  },
  edgeIndicators: {
    margin: 26,
    topMargin: 74,
    bossColor: 0xf2a93b,
    eliteColor: 0xe5484d,
  },
  brightness: {
    min: 0.5,
    max: 1.5,
    default: 1.0,
  },
} as const;

// =========================================================================
// ENEMY DEATH GORE, BLOOD BURST, DECALS & VARIANT FX CONSTANTS
// =========================================================================
export const GORE = {
  maxDroplets: 150,
  maxDecals: 50,
  lowSettingMultiplier: 0.5,
  dropletDepth: 25,
  decalDepth: 2,
  vignetteDepth: 29,
  bloodBurst: {
    minCount: 10,
    maxCount: 16,
    colors: [0x6b0f15, 0x560c11, 0x470a0f, 0x3a0a0e] as readonly number[],
    spitterColors: [0x5e122b, 0x4d0e26, 0x3d0a1f, 0x33081a] as readonly number[],
    speedMin: 120,
    speedMax: 320,
    gravity: 500,
    lifeMinMs: 350,
    lifeMaxMs: 600,
    stretchBaseX: 0.55,
    stretchVelocityFactor: 0.0022,
    stretchBaseY: 0.42,
    shrinkStartRatio: 0.55,
    minEndScaleFactor: 0.25,
    alpha: 0.94,
  },
  mist: {
    minCount: 1,
    maxCount: 2,
    bloodColor: 0x5c0d13,
    spitterColor: 0x57112c,
    alpha: 0.25,
    durationMs: 400,
    startScale: 0.45,
    endScale: 1.55,
    speedMin: 18,
    speedMax: 52,
  },
  decal: {
    variants: 4,
    textureSize: 96,
    satelliteMin: 6,
    satelliteMax: 10,
    alpha: 0.75,
    fadeDurationMs: 8000,
    bloodTint: 0xffffff,
    spitterTint: 0xd8a8ec,
    baseScale: 0.72,
    eliteScaleMult: 1.28,
    bossScaleMult: 2.1,
  },
  variants: {
    brute: {
      chipMin: 8,
      chipMax: 12,
      chipColors: [0x6b7280, 0x525866, 0x7c8494, 0x444954] as readonly number[],
      chipSpeedMin: 110,
      chipSpeedMax: 280,
      chipGravity: 540,
      chipLifeMinMs: 320,
      chipLifeMaxMs: 560,
      chipScaleMin: 0.65,
      chipScaleMax: 1.15,
      emberMin: 6,
      emberMax: 8,
      emberColors: [0xf2a93b, 0xff8c2a] as readonly number[],
      emberSpeedMin: 120,
      emberSpeedMax: 270,
      emberScaleMin: 0.14,
      emberScaleMax: 0.30,
      emberLifeMs: 420,
      dustCount: 1,
      dustColor: 0x717682,
      dustAlpha: 0.28,
      dustDurationMs: 420,
      dustStartScale: 0.55,
      dustEndScale: 1.75,
    },
    wisp: {
      mistMin: 2,
      mistMax: 3,
      mistColor: 0x5de4ff,
      mistAlpha: 0.32,
      mistDurationMs: 460,
      riseVyMin: -95,
      riseVyMax: -45,
      riseAccelY: -45,
      driftVxRange: 38,
      startScale: 0.42,
      endScale: 1.5,
    },
    boss: {
      dropletMultiplier: 3,
      maxDropletsPerKill: 40,
      mistMin: 4,
      mistMax: 6,
      mistAlpha: 0.36,
      mistDurationMs: 580,
      mistEndScale: 2.3,
      vignetteAlpha: 0.10,
      vignetteDurationMs: 650,
    },
  },
  fxDeathExplosion: {
    alpha: 0.3,
    scaleMultiplier: 0.6,
  },
  hitSplash: {
    dropletMin: 7,
    dropletMax: 11,
    critDropletMin: 11,
    critDropletMax: 15,
    maxDropletsPerHit: 22,
    colors: [0xb81420, 0x8f0d16, 0x6b0810, 0x450509] as readonly number[],
    spitterColors: [0x8c1740, 0x6e1033, 0x520b26, 0x38071b] as readonly number[],
    splashTint: 0xa6101b,
    secondarySplashTint: 0x69070f,
    spitterSplashTint: 0x7d173a,
    secondarySpitterSplashTint: 0x4f0c25,
    mistTint: 0x6e0911,
    spitterMistTint: 0x570d2b,
    mistAlpha: 0.44,
    mistDurationMs: 260,
    mistStartScale: 0.44,
    mistEndScale: 1.48,
    speedMin: 125,
    speedMax: 275,
    gravity: 460,
    lifeMinMs: 220,
    lifeMaxMs: 390,
    dropletThicknessMult: 1.48,
    splashDurationMs: 245,
    splashStartScale: 0.44,
    splashEndScale: 1.12,
    critSplashEndScale: 1.46,
    splashAlpha: 0.96,
    secondarySplashAlpha: 0.86,
    coneSpreadRad: 1.28,
    baselineMonsterSizePx: 115,
    minMonsterScale: 0.65,
    maxMonsterScale: 2.9,
  },
} as const;

const GORE_DECAL_KEYS = [
  'gore_decal_0',
  'gore_decal_1',
  'gore_decal_2',
  'gore_decal_3',
] as const;

// =========================================================================
// TUNABLE DIFFICULTY CURVE DATA TABLE
// Runs are easy until 2:00, ramp up through 5:00, and become very hard around 8:00.
// Easily tune spawn rate, enemy HP multiplier, and enemy types per minute here.
// =========================================================================

export interface MinuteDifficultyConfig {
  minute: number; // Minute mark (0 = 0:00-0:59, 1 = 1:00-1:59, etc.)
  label: string;
  spawnIntervalMs: number; // Spawn delay in ms (lower = faster spawns)
  spawnCountPerWave: number; // Number of enemies spawned each tick
  hpMultiplier: number; // Scales base enemy HP
  damageMultiplier: number; // Scales base enemy attack damage
  // Relative spawn weights for enemy types (any relative numbers)
  enemyWeights: {
    wisp: number;
    imp: number;
    spitter: number;
    brute: number;
  };
}

export const DIFFICULTY_CURVE_TABLE: MinuteDifficultyConfig[] = [
  // Minute 0 (0:00 - 0:59): Very easy intro. Mostly fragile wisps, gentle flow.
  {
    minute: 0,
    label: '0:00 - 0:59 (Calm Void: Easy)',
    spawnIntervalMs: 1500,
    spawnCountPerWave: 1,
    hpMultiplier: 0.85,
    damageMultiplier: 0.8,
    enemyWeights: { wisp: 85, imp: 15, spitter: 0, brute: 0 },
  },
  // Minute 1 (1:00 - 1:59): Easy warm-up. More fast imps, still very manageable.
  {
    minute: 1,
    label: '1:00 - 1:59 (First Shadows: Easy)',
    spawnIntervalMs: 1200,
    spawnCountPerWave: 1,
    hpMultiplier: 1.0,
    damageMultiplier: 0.9,
    enemyWeights: { wisp: 65, imp: 35, spitter: 0, brute: 0 },
  },
  // Minute 2 (2:00 - 2:59): Ramp begins! Ranged spitters start deploying dark orbs.
  {
    minute: 2,
    label: '2:00 - 2:59 (Ramp Begins: Spitters Appear)',
    spawnIntervalMs: 850,
    spawnCountPerWave: 1,
    hpMultiplier: 1.3,
    damageMultiplier: 1.0,
    enemyWeights: { wisp: 45, imp: 35, spitter: 20, brute: 0 },
  },
  // Minute 3 (3:00 - 3:59): Ramp builds! Armored brutes enter the fray.
  {
    minute: 3,
    label: '3:00 - 3:59 (Heavy Vanguard: Brutes Arrive)',
    spawnIntervalMs: 650,
    spawnCountPerWave: 1,
    hpMultiplier: 1.7,
    damageMultiplier: 1.15,
    enemyWeights: { wisp: 30, imp: 35, spitter: 25, brute: 10 },
  },
  // Minute 4 (4:00 - 4:59): Pre-boss surge! Fast dense swarms pushing player.
  {
    minute: 4,
    label: '4:00 - 4:59 (The Gathering Storm)',
    spawnIntervalMs: 480,
    spawnCountPerWave: 2,
    hpMultiplier: 2.2,
    damageMultiplier: 1.3,
    enemyWeights: { wisp: 20, imp: 35, spitter: 25, brute: 20 },
  },
  // Minute 5 (5:00 - 5:59): Void Titan Boss awakening! Relentless pressure.
  {
    minute: 5,
    label: '5:00 - 5:59 (Void Titan Awakens: Intense)',
    spawnIntervalMs: 380,
    spawnCountPerWave: 2,
    hpMultiplier: 2.8,
    damageMultiplier: 1.45,
    enemyWeights: { wisp: 15, imp: 30, spitter: 30, brute: 25 },
  },
  // Minute 6 (6:00 - 6:59): Post-boss escalation: hardened hordes.
  {
    minute: 6,
    label: '6:00 - 6:59 (Abyssal Incursion)',
    spawnIntervalMs: 300,
    spawnCountPerWave: 2,
    hpMultiplier: 3.6,
    damageMultiplier: 1.65,
    enemyWeights: { wisp: 10, imp: 30, spitter: 35, brute: 25 },
  },
  // Minute 7 (7:00 - 7:59): Critical danger: brutes and spitters everywhere.
  {
    minute: 7,
    label: '7:00 - 7:59 (The Event Horizon: Dangerous)',
    spawnIntervalMs: 230,
    spawnCountPerWave: 3,
    hpMultiplier: 4.8,
    damageMultiplier: 1.9,
    enemyWeights: { wisp: 5, imp: 30, spitter: 35, brute: 30 },
  },
  // Minute 8+ (8:00+): VERY HARD endgame survival nightmare!
  {
    minute: 8,
    label: '8:00+ (Extinction Event: Very Hard)',
    spawnIntervalMs: 160,
    spawnCountPerWave: 3,
    hpMultiplier: 6.5,
    damageMultiplier: 2.3,
    enemyWeights: { wisp: 5, imp: 25, spitter: 35, brute: 35 },
  },
];

export function getDifficultyConfig(timeSeconds: number): MinuteDifficultyConfig {
  const minute = Math.floor(timeSeconds / 60);
  if (minute >= DIFFICULTY_CURVE_TABLE.length - 1) {
    const base = DIFFICULTY_CURVE_TABLE[DIFFICULTY_CURVE_TABLE.length - 1];
    const extraMinutes = minute - base.minute;
    return {
      ...base,
      spawnIntervalMs: Math.max(90, base.spawnIntervalMs - extraMinutes * 12),
      spawnCountPerWave: base.spawnCountPerWave + Math.floor(extraMinutes / 2),
      hpMultiplier: base.hpMultiplier + extraMinutes * 1.2,
      damageMultiplier: base.damageMultiplier + extraMinutes * 0.25,
    };
  }
  return DIFFICULTY_CURVE_TABLE[minute];
}

function pickEnemyTypeFromWeights(weights: MinuteDifficultyConfig['enemyWeights']): 'wisp' | 'imp' | 'spitter' | 'brute' {
  const total = weights.wisp + weights.imp + weights.spitter + weights.brute;
  let roll = Math.random() * total;
  if (roll < weights.wisp) return 'wisp';
  roll -= weights.wisp;
  if (roll < weights.imp) return 'imp';
  roll -= weights.imp;
  if (roll < weights.spitter) return 'spitter';
  return 'brute';
}

interface FloatingText {
  text: Phaser.GameObjects.Text;
  inUse: boolean;
  spawnTime: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  gravity: number;
  baseScale: number;
  popScale: number;
}

interface Particle {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  decay: number;
  active: boolean;
}

type GoreParticleKind = 'droplet' | 'mist' | 'chip' | 'wisp_mist' | 'splash';

interface GoreParticle {
  sprite: Phaser.GameObjects.Image;
  kind: GoreParticleKind;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  baseAlpha: number;
  startScaleX: number;
  startScaleY: number;
  endScale: number;
  rotSpeed: number;
  active: boolean;
  seq: number;
}

interface GoreDecal {
  sprite: Phaser.GameObjects.Image;
  life: number;
  maxLife: number;
  baseAlpha: number;
  active: boolean;
  seq: number;
}

interface EnemyData {
  type: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss';
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  scoreValue: number;
  gemValue: number;
  lastAttack: number;
  knockbackX: number;
  knockbackY: number;
  isElite?: boolean;
  coinDrops?: number;
  dropsChest?: boolean;
  chargeVx?: number;
  chargeVy?: number;
  chargeTimerMs?: number;
  telegraphingUntilMs?: number;
  phase?: number;
  lightVis?: number;
  shadowShade?: number;
  baseScale?: number;
  lastStompFrame?: number;
  tintResetAtMs?: number;
}

interface ProjectileData {
  vx: number;
  vy: number;
  damage: number;
  pierce: number;
  isCrit: boolean;
  isEnemy: boolean;
  life: number;
  maxLife: number;
  originX?: number;
  originY?: number;
  maxRangeSq?: number;
}

interface TelegraphEntry {
  kind: 'line' | 'circle';
  x: number;
  y: number;
  angle: number;
  length: number;
  radius: number;
  elapsedMs: number;
  durationMs: number;
  damage: number;
  speed: number;
  tint: number;
  sourceEnemy?: Phaser.Physics.Arcade.Sprite;
}

interface EffectPoolItem {
  sprite: Phaser.GameObjects.Sprite;
  inUse: boolean;
  spawnTime: number;
  timerEvent?: Phaser.Time.TimerEvent;
}

export class MainScene extends Phaser.Scene {
  // World & Floor
  private floor!: Phaser.GameObjects.TileSprite;
  private lightVignette!: Phaser.GameObjects.Graphics;
  private lanternGlowSprite!: Phaser.GameObjects.Image;
  private hadEdgeVignette: boolean = false;

  // Player
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerStats!: PlayerStats;
  private playerBobTween: Phaser.Tweens.Tween | null = null;
  private lanternPulse = { alpha: 0.6 };
  private isMoving: boolean = false;
  private standStillTimerMs: number = STAND_STILL_DELAY_MS;
  private isStandingReady: boolean = true;
  private stanceRing!: Phaser.GameObjects.Graphics;
  private stanceRingAlpha: number = 0.78;
  private isAttacking: boolean = false;
  private muzzleFiredThisAttack: boolean = false;
  private isDead: boolean = false;
  private isInvulnerable: boolean = false;
  private readonly PLAYER_SCALE: number = 100 / 218;

  // Weapons State
  private weapons: Record<string, WeaponState> = {};
  private multishotLevel: number = 0;
  private orbitingBlades: Phaser.GameObjects.Sprite[] = [];
  private bladeAngle: number = 0;
  private nextRingPulse: number = 3000;
  private nextSparkBurst: number = 4000;
  private nextShotgunBlast: number = 1500;

  // Pools
  private particlePool: Particle[] = [];
  private readonly MAX_PARTICLES = 200;
  private goreParticlePool: GoreParticle[] = [];
  private goreDecalPool: GoreDecal[] = [];
  private goreParticleSeq: number = 0;
  private goreDecalSeq: number = 0;
  private goreLowDecalCounter: number = 0;
  private bossVignetteSprite: Phaser.GameObjects.Image | null = null;
  private bossVignetteTimerMs: number = 0;
  private unsubGore: (() => void) | null = null;

  // Enemy Projectile, Player Projectile, Pickup, Enemy & Ghost Trail Pools
  private enemyProjectilePool: Phaser.Physics.Arcade.Sprite[] = [];
  private enemyTrailPool: Phaser.GameObjects.Sprite[] = [];
  private playerProjectilePool: Phaser.Physics.Arcade.Sprite[] = [];
  private pickupPool: Phaser.Physics.Arcade.Sprite[] = [];
  private enemyPool: Phaser.Physics.Arcade.Sprite[] = [];
  private readonly MAX_ENEMY_PROJECTILES = 24;
  private readonly MAX_ENEMY_PROJECTILE_POOL = 64;
  private readonly MAX_PLAYER_PROJECTILES = 140;
  private readonly MAX_ENEMY_TRAILS = 64;
  private readonly MAX_ACTIVE_XP_GEMS = 70;
  private readonly MAX_ACTIVE_COINS = 60;

  // Skill & Impact Effect Pool (Cap at 40 active effects)
  private effectPool: EffectPoolItem[] = [];
  private readonly MAX_ACTIVE_EFFECTS = 40;
  private levelUpSlowMoTimer: number | null = null;

  // Groups
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private projectilesGroup!: Phaser.Physics.Arcade.Group;
  private pickupsGroup!: Phaser.Physics.Arcade.Group;

  // Camera, Atmosphere & Dynamic Shadow-Casting controllers
  private cameraController!: CameraController;
  private atmosphereOverlay: AtmosphereOverlay | null = null;
  private shadowSystem: ShadowCasterSystem | null = null;

  // Floating text pool
  private floatingTexts: FloatingText[] = [];
  private readonly MAX_FLOATING_TEXTS = 64;
  private readonly LOW_QUALITY_MAX_FLOATING_TEXTS = 36;

  // Run Stats
  private runTime: number = 0;
  private enemiesKilled: number = 0;
  private coinsEarned: number = 0;
  private damageDealt: number = 0;
  private playerLevel: number = 1;
  private currentXp: number = 0;
  private nextLevelXp: number = BALANCE.xp.firstLevelXp;

  // Spawning & Boss
  private nextSpawnTime: number = 1000;
  private bossSpawned: boolean = false;
  private activeBoss: Phaser.Physics.Arcade.Sprite | null = null;
  private hasCrossfadedToIntense: boolean = false;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
    SHIFT: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
  };

  // Dash Mechanic (Supports Single Default Dash or Twin-Wind Feather Double Dash)
  private dashChargesRemaining: number = 1;
  private dashRechargeTimerMs: number = 0;
  private dashActiveTimerMs: number = 0;
  private dashDirX: number = 1;
  private dashDirY: number = 0;
  private dashTrailAccumMs: number = 0;

  // Graphics overlays for telegraphs & elite auras
  private telegraphGraphics!: Phaser.GameObjects.Graphics;
  private eliteAuraGraphics!: Phaser.GameObjects.Graphics;
  private telegraphs: TelegraphEntry[] = [];

  // Invulnerability, Pressure, Combo, Feel & Events
  private invulnTimerMs: number = 0;
  private isUnderPressure: boolean = false;
  private pressureAuraAlpha: number = 0;
  private lowHpVignetteAlpha: number = 0;
  private screenEdgeFlashAlpha: number = 0;
  private comboKills: number = 0;
  private comboMultiplier: number = 1;
  private comboTimerMs: number = 0;
  private recentDamageLog: Array<{ timeMs: number; amount: number }> = [];
  private lastStatsEmitMs: number = 0;
  private lastBossEmitMs: number = 0;

  // Timeline Events State
  private triggeredEvents: Set<string> = new Set();
  private lastEventTriggerTimeSec: number = -999;
  private nextRecurringEventTimeSec: number =
    SPAWN_TIMELINE.events.bossFirstTimeSec + SPAWN_TIMELINE.events.recurringCycleSec;
  private recurringCycleCount: number = 0;
  private pendingEvent: { id: string; countdownMs: number; onExecute: () => void } | null = null;

  // Light Progression State
  private brighterLanternLevel: number = 0;
  private hasLightBurst: boolean = false;
  private hasNightEyes: boolean = false;
  private lightShardTimerMs: number = 0;
  private darknessFallsTimerMs: number = 0;
  private visualLightMult: number = 1;
  private visualStandFactor: number = 1 + LIGHT.player.standingBonusRatio;
  private prevTargetLightMult: number = 1;
  private lanternSurgeBoost: number = 0;

  // Horde Frenzy / Blood Fog State (triggers every 10 levels & escalates each wave)
  private difficultyPreset: DifficultyPreset = DIFFICULTY_PRESETS.hacker;
  private bloodFogTimerMs: number = 0;
  private bloodFogBannerTimerMs: number = 0;
  private bloodFogTier: number = 0;
  private lastTriggeredBloodFogTier: number = 0;
  private pendingBloodFogTier: number = 0;
  private lastEliteVariantSpawnMs: number = 0;

  // Red Shard & Dynamic Challenges State
  private redShardsPickedCount: number = 0;
  private redShardTimerMs: number = 0;
  private isRedShardBuffActive: boolean = false;
  private xpMultiplierBonus: number = 0;
  private pendingOfferedChallenge: DynamicChallengeOffer | null = null;
  private activeChallenge: ActiveDynamicChallenge | null = null;
  private challengeBannerTimerMs: number = 0;
  private completedChallengeIds: Set<string> = new Set();
  private challengesCompletedCount: number = 0;

  // State flags & 90Hz/4K Performance Engine hooks
  private isGamePaused: boolean = false;
  private isBossIntroPaused: boolean = false;
  private isWaitingForLoading: boolean = false;
  private hitstopTimer: number = 0;
  private isHitstopPausedPhysics: boolean = false;
  private unsubCritImpact: (() => void) | null = null;
  private unsubGraphics: (() => void) | null = null;
  private mainResizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null;
  private upscaleFilter: UpscaleSharpFilterController | null = null;
  private maxWebGlTexSize: number = 4096;
  private levelUpPulseSeq: number = 0;
  private lastMissionSecondRecorded: number = 0;
  private simTimeMs: number = 0;
  private readonly LOW_QUALITY_MAX_PARTICLES = 90;

  constructor() {
    super('MainScene');
  }

  init() {
    this.isDead = false;
    this.isGamePaused = false;
    this.isBossIntroPaused = false;
    this.isWaitingForLoading = false;
    this.simTimeMs = 0;
    this.nextSpawnTime = 1000;
    this.hitstopTimer = 0;
    this.isHitstopPausedPhysics = false;
    if (this.levelUpSlowMoTimer !== null) {
      window.clearTimeout(this.levelUpSlowMoTimer);
      this.levelUpSlowMoTimer = null;
    }
    this.unsubCritImpact?.();
    this.unsubCritImpact = null;
    this.unsubGore?.();
    this.unsubGore = null;
    this.goreParticlePool = [];
    this.goreDecalPool = [];
    this.goreParticleSeq = 0;
    this.goreDecalSeq = 0;
    this.goreLowDecalCounter = 0;
    this.bossVignetteSprite = null;
    this.bossVignetteTimerMs = 0;
    this.isInvulnerable = false;
    this.invulnTimerMs = 0;
    this.isMoving = false;
    this.standStillTimerMs = STAND_STILL_DELAY_MS;
    this.isStandingReady = true;
    this.isUnderPressure = false;
    this.pressureAuraAlpha = 0;
    this.lowHpVignetteAlpha = 0;
    this.screenEdgeFlashAlpha = 0;
    this.stanceRingAlpha = 0.78;
    this.runTime = 0;
    this.enemiesKilled = 0;
    this.coinsEarned = 0;
    this.damageDealt = 0;
    this.playerLevel = 1;
    this.currentXp = 0;
    this.nextLevelXp = BALANCE.xp.firstLevelXp;
    this.multishotLevel = 0;
    this.comboKills = 0;
    this.comboMultiplier = 1;
    this.comboTimerMs = 0;
    this.recentDamageLog = [];
    this.lastStatsEmitMs = 0;
    this.telegraphs = [];
    this.triggeredEvents = new Set();
    this.lastEventTriggerTimeSec = -999;
    this.nextRecurringEventTimeSec =
      SPAWN_TIMELINE.events.bossFirstTimeSec + SPAWN_TIMELINE.events.recurringCycleSec;
    this.recurringCycleCount = 0;
    this.pendingEvent = null;
    this.bossSpawned = false;
    this.activeBoss = null;
    this.hasCrossfadedToIntense = false;
    this.orbitingBlades = [];
    this.bladeAngle = 0;
    this.nextRingPulse = 3000;
    this.nextSparkBurst = 4000;
    this.levelUpPulseSeq = 0;
    this.brighterLanternLevel = 0;
    this.hasLightBurst = false;
    this.hasNightEyes = false;
    this.lightShardTimerMs = 0;
    this.darknessFallsTimerMs = 0;
    this.visualLightMult = 1;
    this.visualStandFactor = 1 + LIGHT.player.standingBonusRatio;
    this.prevTargetLightMult = 1;
    this.lanternSurgeBoost = 0;
    this.difficultyPreset = gameManager.getDifficultyConfig();
    this.bloodFogTimerMs = 0;
    this.bloodFogBannerTimerMs = 0;
    this.bloodFogTier = 0;
    this.lastTriggeredBloodFogTier = 0;
    this.pendingBloodFogTier = 0;
    this.lastEliteVariantSpawnMs = 0;
    this.redShardsPickedCount = 0;
    this.redShardTimerMs = 0;
    this.isRedShardBuffActive = false;
    this.xpMultiplierBonus = 0;
    this.pendingOfferedChallenge = null;
    this.activeChallenge = null;
    this.challengeBannerTimerMs = 0;
    this.completedChallengeIds = new Set();
    this.challengesCompletedCount = 0;
    this.enemyProjectilePool = [];
    this.enemyTrailPool = [];
    this.playerProjectilePool = [];
    this.pickupPool = [];
    this.enemyPool = [];
    this.lastBossEmitMs = 0;
    this.hadEdgeVignette = false;
    this.floatingTexts = [];
    this.atmosphereOverlay = null;
    this.shadowSystem = null;
    this.lastMissionSecondRecorded = 0;
    gameManager.setQualityTier('high');
    dailyMissions.ensureToday();
  }

  preload() {
    gameManager.emitLoadProgress({
      active: true,
      progress: 0.04,
      phase: 'Summoning the Dark Warden…',
      ready: false,
    });

    const handleProgress = (value: number) => {
      const normalized = Math.min(0.86, Math.max(0.05, value * 0.86));
      let phase = 'Summoning the Dark Warden…';
      if (value >= 0.72) {
        phase = 'Forging Arcane Effects…';
      } else if (value >= 0.42) {
        phase = 'Awakening Ashfen Hordes…';
      } else if (value >= 0.16) {
        phase = 'Carving Stone & Torches…';
      }
      gameManager.emitLoadProgress({
        active: true,
        progress: normalized,
        phase,
        ready: false,
      });
    };

    this.load.on(Phaser.Loader.Events.PROGRESS, handleProgress);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.load.off(Phaser.Loader.Events.PROGRESS, handleProgress);
      gameManager.emitLoadProgress({
        active: true,
        progress: 0.9,
        phase: 'Igniting World Torches…',
        ready: false,
      });
    });

    // Load player spritesheets (frame size 234x218)
    this.load.spritesheet('player_walk', './assets/aistudio/player_walk_sheet_bb06b026.webp', {
      frameWidth: 234,
      frameHeight: 218,
    });
    this.load.spritesheet('player_attack', './assets/aistudio/player_attack_sheet_dd4b205b.webp', {
      frameWidth: 234,
      frameHeight: 218,
    });

    // Load monster spritesheets
    this.load.spritesheet('brute_walk_sheet', './assets/aistudio/brute_walk_sheet_1167a56d.webp', {
      frameWidth: 300,
      frameHeight: 222,
    });
    this.load.spritesheet('imp_run_sheet', './assets/aistudio/imp_run_sheet_6bc12170.webp', {
      frameWidth: 344,
      frameHeight: 197,
    });
    this.load.spritesheet('spitter_walk_sheet', './assets/aistudio/spitter_walk_sheet_be385db7.webp', {
      frameWidth: 183,
      frameHeight: 273,
    });
    this.load.spritesheet('boss_idle_sheet', './assets/aistudio/boss_idle_sheet_45eee864.webp', {
      frameWidth: 409,
      frameHeight: 253,
    });
    this.load.spritesheet('boss_attack_sheet', './assets/aistudio/boss_attack_sheet_8e2697fa.webp', {
      frameWidth: 409,
      frameHeight: 253,
    });

    // Load all actual sprite attachments (keep fx_bolt and fx_ring as static fallbacks)
    this.load.image('player', './assets/aistudio/player_d0a77e5b.webp');
    this.load.image('floor', './assets/aistudio/floor_2087ed42.webp');
    this.load.image('enemy_wisp', './assets/aistudio/enemy_wisp_7d3c48f3.webp');
    this.load.image('enemy_imp', './assets/aistudio/enemy_imp_60271be1.webp');
    this.load.image('enemy_spitter', './assets/aistudio/enemy_spitter_51ce3872.webp');
    this.load.image('enemy_brute', './assets/aistudio/enemy_brute_01eebbc9.webp');
    this.load.image('boss', './assets/aistudio/boss_a9bb7d84.webp');
    this.load.image('gem', './assets/aistudio/gem_dc28f9c8.webp');
    this.load.image('coin', './assets/aistudio/coin_3bd84bab.webp');
    this.load.image('fx_bolt', './assets/aistudio/fx_bolt_be8b486b.webp');
    this.load.image('fx_ring', './assets/aistudio/fx_ring_7bdbb43c.webp');
    this.load.image('fx_spark', './assets/aistudio/fx_spark_3ee901cb.webp');

    // Load Skill / Impact FX Spritesheets
    this.load.spritesheet('fx_spark_sheet', './assets/aistudio/fx_spark_sheet_cecbd959.webp', {
      frameWidth: 192,
      frameHeight: 108,
    });
    this.load.spritesheet('fx_death_sheet', './assets/aistudio/fx_death_sheet_bc303348.webp', {
      frameWidth: 384,
      frameHeight: 216,
    });
    this.load.spritesheet('fx_ring_sheet', './assets/aistudio/fx_ring_sheet_84634a3f.webp', {
      frameWidth: 512,
      frameHeight: 288,
    });
    this.load.spritesheet('fx_slam_sheet', './assets/aistudio/fx_slam_sheet_61043650.webp', {
      frameWidth: 448,
      frameHeight: 252,
    });
    this.load.spritesheet('fx_gem_sheet', './assets/aistudio/fx_gem_sheet_a8e4a0d7.webp', {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('fx_blade_spin_sheet', './assets/aistudio/fx_blade_spin_sheet_46489d73.webp', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('fx_lightning_sheet', './assets/aistudio/fx_lightning_sheet_03b57c80.webp', {
      frameWidth: 384,
      frameHeight: 216,
    });
    this.load.spritesheet('fx_spitter_orb_sheet', './assets/aistudio/fx_spitter_orb_sheet_2e4ec3af.webp', {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  create() {
    gameManager.activeScene = this;

    const width = LOGICAL_WIDTH;
    const height = LOGICAL_HEIGHT;
    const gfx = gameManager.getGraphicsConfig();
    performanceRuntime.currentConfig = { ...gfx };
    this.maxWebGlTexSize = getWebGlMaxTextureSize(this.game);
    const activeScale = Math.max(1, this.scale.width / LOGICAL_WIDTH) || performanceRuntime.currentRenderScale;
    performanceRuntime.currentRenderScale = activeScale;
    performanceRuntime.setTargetFpsOnGame(this.game, gfx.targetFps);

    syncLogicalCamera(this.cameras.main, activeScale, false);
    upgradeTextureFiltering(this);
    this.upscaleFilter = attachUpscaleSharpFilter(
      this,
      this.cameras.main,
      activeScale,
      gfx.upscalerEnabled
    );

    // 1. Infinite scrolling ground TileSprite aligned to zoomed camera center (non-interactive)
    this.floor = this.add.tileSprite(
      this.cameras.main.width * 0.5,
      this.cameras.main.height * 0.5,
      width,
      height,
      'floor'
    )
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(0);
    this.floor.disableInteractive();

    // 1b. Dynamic World Torches, Ruined Pillars & Real-Time Shadow-Casting System
    this.shadowSystem = new ShadowCasterSystem(this, width / 2, height / 2);

    // 2. Groups
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();
    this.pickupsGroup = this.physics.add.group();

    // 3. Object Pools: 200 Particles (ADD blend mode), Gore Pools (NORMAL blend mode) & Floating Combat Text
    this.ensureGoreTextures();
    this.initParticlePool();
    this.initGorePools();
    this.initFloatingTextPool();

    // 4. Initialize Player Stats from Meta Progression & BALANCE starting HP
    this.playerStats = calculateBasePlayerStats();
    const vitalityScale = this.playerStats.maxHp / 100;
    this.playerStats.maxHp = Math.round(BALANCE.player.startingHp * vitalityScale);
    this.playerStats.currentHp = this.playerStats.maxHp;
    this.dashChargesRemaining = this.playerStats.dashCharges;
    this.dashRechargeTimerMs = 0;
    this.dashActiveTimerMs = 0;

    // 5. Initialize Weapons
    this.initWeapons();

    // 6. Create Player Animations
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player_walk', { start: 0, end: 11 }),
      frameRate: 9,
      repeat: -1,
    });

    this.anims.create({
      key: 'attack',
      frames: this.anims.generateFrameNumbers('player_attack', { start: 0, end: 17 }),
      frameRate: 24,
      repeat: 0,
    });

    // 7. Create Monster Animations
    // brute_walk_sheet: 300x222, 18 frames, anim "brute_walk", 12 fps, loop
    this.anims.create({
      key: 'brute_walk',
      frames: this.anims.generateFrameNumbers('brute_walk_sheet', { start: 0, end: 17 }),
      frameRate: 12,
      repeat: -1,
    });

    // imp_run_sheet: 344x197, 10 frames, anim "imp_run", 12 fps, loop
    this.anims.create({
      key: 'imp_run',
      frames: this.anims.generateFrameNumbers('imp_run_sheet', { start: 0, end: 9 }),
      frameRate: 12,
      repeat: -1,
    });

    // spitter_walk_sheet: 183x273, 12 frames, anim "spitter_walk", 6 fps, loop
    this.anims.create({
      key: 'spitter_walk',
      frames: this.anims.generateFrameNumbers('spitter_walk_sheet', { start: 0, end: 11 }),
      frameRate: 6,
      repeat: -1,
    });

    // boss_idle_sheet: 409x253, 12 frames, anim "boss_idle", 8 fps, loop
    this.anims.create({
      key: 'boss_idle',
      frames: this.anims.generateFrameNumbers('boss_idle_sheet', { start: 0, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });

    // boss_attack_sheet: 409x253, 19 frames, anim "boss_attack", 14 fps, no loop
    this.anims.create({
      key: 'boss_attack',
      frames: this.anims.generateFrameNumbers('boss_attack_sheet', { start: 0, end: 18 }),
      frameRate: 14,
      repeat: 0,
    });

    // 8. Create Skill & Impact FX Animations (all ADD blend mode)
    // fx_spark_sheet: 192x108, 10 frames, 20 fps, on every enemy hit at hit position, random rotation, scale 0.5-1
    this.anims.create({
      key: 'fx_spark_anim',
      frames: this.anims.generateFrameNumbers('fx_spark_sheet', { start: 0, end: 9 }),
      frameRate: 20,
      repeat: 0,
    });

    // fx_death_sheet: 384x216, 14 frames, 18 fps, on enemy death, tinted with enemy accent color, 2x size
    this.anims.create({
      key: 'fx_death_anim',
      frames: this.anims.generateFrameNumbers('fx_death_sheet', { start: 0, end: 13 }),
      frameRate: 18,
      repeat: 0,
    });

    // fx_ring_sheet: 512x288, 12 frames, 15 fps, on level up centered on player with screen flash & 0.3s slow-mo
    this.anims.create({
      key: 'fx_ring_anim',
      frames: this.anims.generateFrameNumbers('fx_ring_sheet', { start: 0, end: 11 }),
      frameRate: 15,
      repeat: 0,
    });

    // fx_slam_sheet: 448x252, 14 frames, 14 fps, boss ground slam, scaled to damage radius; area damage on frame 8
    this.anims.create({
      key: 'fx_slam_anim',
      frames: this.anims.generateFrameNumbers('fx_slam_sheet', { start: 0, end: 13 }),
      frameRate: 14,
      repeat: 0,
    });

    // fx_gem_sheet: 128x128, 10 frames, 17 fps, when an XP gem is collected
    this.anims.create({
      key: 'fx_gem_anim',
      frames: this.anims.generateFrameNumbers('fx_gem_sheet', { start: 0, end: 9 }),
      frameRate: 17,
      repeat: 0,
    });

    // fx_blade_spin_sheet: 256x256, 16 frames, 60 fps, loop, orbiting blade weapon (full 360 rotation baked in sheet)
    this.anims.create({
      key: 'fx_blade_spin_anim',
      frames: this.anims.generateFrameNumbers('fx_blade_spin_sheet', { start: 0, end: 15 }),
      frameRate: 60,
      repeat: -1,
    });

    // fx_lightning_sheet: 384x216, 8 frames, 12 fps, loop, chain lightning between enemies
    this.anims.create({
      key: 'fx_lightning_anim',
      frames: this.anims.generateFrameNumbers('fx_lightning_sheet', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });

    // fx_spitter_orb_sheet: 128x128, 30 frames, 24 fps, loop, animated spitter/cultist orb
    this.anims.create({
      key: 'fx_spitter_orb_anim',
      frames: this.anims.generateFrameNumbers('fx_spitter_orb_sheet', { start: 0, end: 29 }),
      frameRate: 24,
      repeat: -1,
    });

    // 9. Initialize Effect, Enemy Projectile & Trail Pools
    this.initEffectPool();
    this.initEnemyProjectilePool();
    this.initEnemyTrailPool();

    // Procedural dark-fantasy treasure chest texture for Elite/Boss drops
    if (!this.textures.exists('pickup_chest')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xf2a93b, 0.25);
      g.fillCircle(22, 20, 20);
      g.fillStyle(0x3a2414, 1);
      g.fillRoundedRect(6, 10, 32, 22, 5);
      g.lineStyle(2, 0xf2a93b, 1);
      g.strokeRoundedRect(6, 10, 32, 22, 5);
      g.fillStyle(0xf2a93b, 1);
      g.fillRect(6, 18, 32, 3);
      g.fillRect(19, 16, 6, 8);
      g.generateTexture('pickup_chest', 44, 40);
      g.destroy();
    }

    // Procedural luminous cyan-gold Light Shard texture for Elite drops
    if (!this.textures.exists('pickup_light_shard')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x5de4ff, 0.22);
      g.fillCircle(20, 20, 19);
      g.fillStyle(0xf2a93b, 0.28);
      g.fillCircle(20, 20, 12);
      // Outer diamond crystal
      g.fillStyle(0x5de4ff, 1);
      g.beginPath();
      g.moveTo(20, 4);
      g.lineTo(31, 20);
      g.lineTo(20, 36);
      g.lineTo(9, 20);
      g.closePath();
      g.fillPath();
      // Inner radiant core
      g.fillStyle(0xeef6ff, 0.95);
      g.beginPath();
      g.moveTo(20, 9);
      g.lineTo(26, 20);
      g.lineTo(20, 31);
      g.lineTo(14, 20);
      g.closePath();
      g.fillPath();
      g.lineStyle(1.5, 0xffffff, 0.9);
      g.strokePath();
      g.generateTexture('pickup_light_shard', 40, 40);
      g.destroy();
    }

    // Procedural crimson Red Shard texture (heals + temporary damage surge)
    if (!this.textures.exists('pickup_red_shard')) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xe5303a, 0.25);
      g.fillCircle(20, 20, 19);
      g.fillStyle(0xb3121a, 0.35);
      g.fillCircle(20, 20, 12);
      g.fillStyle(0xe5303a, 1);
      g.beginPath();
      g.moveTo(20, 4);
      g.lineTo(31, 20);
      g.lineTo(20, 36);
      g.lineTo(9, 20);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xffb4b8, 0.95);
      g.beginPath();
      g.moveTo(20, 9);
      g.lineTo(26, 20);
      g.lineTo(20, 31);
      g.lineTo(14, 20);
      g.closePath();
      g.fillPath();
      g.lineStyle(1.5, 0xffd2d5, 0.9);
      g.strokePath();
      g.generateTexture('pickup_red_shard', 40, 40);
      g.destroy();
    }

    // Ground telegraph & elite red glow aura layers
    this.telegraphGraphics = this.add.graphics().setDepth(16);
    this.telegraphGraphics.disableInteractive();
    this.eliteAuraGraphics = this.add.graphics().setDepth(17);
    this.eliteAuraGraphics.disableInteractive();

    // Create Player Sprite using spritesheet (100px tall on screen)
    this.player = this.physics.add.sprite(width / 2, height / 2, 'player_walk', 0);
    this.player.setDepth(20);
    this.player.setScale(this.PLAYER_SCALE);

    // Hitbox smaller than sprite
    const pBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (pBody) {
      pBody.setSize(80, 130);
      pBody.setOffset(77, 65);
    }
    this.player.setCollideWorldBounds(false);

    // Subtle glowing stance ring under player (glows when standing/weapons active, dims while moving)
    this.stanceRing = this.add.graphics().setDepth(19);
    this.stanceRing.setBlendMode(Phaser.BlendModes.ADD);
    this.stanceRing.disableInteractive();
    this.drawStanceRing();
    this.stanceRing.setPosition(this.player.x, this.player.y + 36);
    this.stanceRing.setAlpha(this.stanceRingAlpha);

    // Camera controller with smooth sub-pixel player follow (delta-time 0.15 lerp, no snapping)
    this.cameraController = new CameraController(this.cameras.main);
    this.cameraController.followTarget(this.player, false, 0.15, 0.15);

    // Trigger muzzle effect on attack frame 2
    this.player.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (this.isDead || !this.sys?.isActive() || !this.player?.active) return;
        if (_anim.key === 'attack') {
          const fIndex =
            typeof frame.textureFrame === 'number'
              ? frame.textureFrame
              : parseInt(String(frame.textureFrame), 10);
          if (fIndex === 2 || frame.index === 3) {
            this.triggerAttackMuzzleEffect();
          }
        }
      }
    );

    // When attack animation completes, return to walk (if moving) or idle frame 0
    this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (this.isDead || !this.sys?.isActive() || !this.player?.active) return;
      if (anim.key === 'attack') {
        this.isAttacking = false;
        this.muzzleFiredThisAttack = false;
        if (this.isMoving) {
          this.player.play('walk', true);
        } else {
          this.player.anims.stop();
          this.player.setTexture('player_walk', 0);
          this.startPlayerBobbing(false);
        }
      }
    });

    // Procedural radial cyan lantern glow texture (renders as 1 GPU quad instead of 4 CPU Graphics circles)
    if (!this.textures.exists('light_cyan_glow')) {
      const size = 256;
      const tex = this.textures.createCanvas('light_cyan_glow', size, size);
      if (tex) {
        const ctx = tex.getContext();
        const half = size / 2;
        const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0.0, 'rgba(207, 250, 254, 0.34)');
        grad.addColorStop(0.18, 'rgba(103, 232, 249, 0.22)');
        grad.addColorStop(0.42, 'rgba(56, 189, 248, 0.12)');
        grad.addColorStop(0.72, 'rgba(34, 211, 238, 0.05)');
        grad.addColorStop(1.0, 'rgba(34, 211, 238, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        tex.refresh();
      }
    }

    // Sync initial visual lantern aura scale with equipped shop upgrades & relics
    const initLightMult = this.getLightRadiusMultiplier();
    this.visualLightMult = initLightMult;
    this.prevTargetLightMult = initLightMult;
    this.visualStandFactor = this.isStandingReady ? 1 + LIGHT.player.standingBonusRatio : 1;

    // 7. Light Vignette / Lantern Glow Layer & Dynamic Weather/Time-of-Day Atmosphere Overlay
    const zeroOffset = getScrollZeroOffset(this.cameras.main);
    this.lanternGlowSprite = this.add
      .image(width / 2 + zeroOffset.x, height / 2 + zeroOffset.y, 'light_cyan_glow')
      .setDepth(15)
      .setScrollFactor(0)
      .setScale(2.1875 * initLightMult)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.lanternGlowSprite.disableInteractive();

    this.lightVignette = this.add
      .graphics({ x: zeroOffset.x, y: zeroOffset.y })
      .setDepth(15)
      .setScrollFactor(0);
    this.lightVignette.disableInteractive();
    this.atmosphereOverlay = new AtmosphereOverlay(this);

    this.bossVignetteSprite = this.add
      .image(width / 2 + zeroOffset.x, height / 2 + zeroOffset.y, 'gore_boss_vignette')
      .setDepth(GORE.vignetteDepth)
      .setScrollFactor(0)
      .setDisplaySize(width, height)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setAlpha(0)
      .setVisible(false);
    this.bossVignetteSprite.disableInteractive();

    // Lantern glow pulse tween (alpha 0.6 <-> 1.0)
    this.tweens.add({
      targets: this.lanternPulse,
      alpha: 1.0,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 8. Initial Idle Breathing
    this.startPlayerBobbing(false);

    // 9. Controls (P / Esc pause handled centrally via App.tsx + UIScene)
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        SHIFT: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        ESC: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
      };
    }

    // 10. Colliders & Overlaps
    this.physics.add.overlap(
      this.projectilesGroup,
      this.enemiesGroup,
      (proj, enemy) => this.handleProjectileEnemyOverlap(proj as Phaser.Physics.Arcade.Sprite, enemy as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.enemiesGroup,
      (player, enemy) => this.handlePlayerEnemyOverlap(player as Phaser.Physics.Arcade.Sprite, enemy as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.pickupsGroup,
      (player, pickup) => this.handlePlayerPickupOverlap(player as Phaser.Physics.Arcade.Sprite, pickup as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

    // Initial stats push to UI
    this.emitStatsUpdate();

    // Start gameplay background music
    soundManager.playGameplay();

    // Ensure persistent AudioScene is running, then launch DarknessScene above world and UIScene always on top
    if (!this.scene.isActive('AudioScene')) {
      this.scene.launch('AudioScene');
    }
    if (!this.scene.isActive('DarknessScene')) {
      this.scene.launch('DarknessScene');
    }
    if (!this.scene.isActive('UIScene')) {
      this.scene.launch('UIScene');
    }
    this.scene.bringToTop('DarknessScene');
    this.scene.bringToTop('UIScene');

    // Pause simulation while the 4s arena loading screen completes its transition
    this.setWaitingForLoading(true);

    // Notify React loading screen that the arena, lighting, and shadow casters are ready
    gameManager.emitLoadProgress({
      active: true,
      progress: 1,
      phase: 'Entering the Ashfen…',
      ready: true,
    });

    // Subscribe to GameManager critical hit impact bus (hitstop + color shockwave)
    this.unsubCritImpact?.();
    this.unsubCritImpact = gameManager.onCritImpact((impact) => {
      if (this.isDead || this.isGamePaused || !this.scene?.isActive()) return;

      this.hitstopTimer = Math.max(this.hitstopTimer, impact.hitstopMs);
      if (!this.isHitstopPausedPhysics) {
        this.isHitstopPausedPhysics = true;
        this.physics.pause();
      }

      if (gameManager.getGoreLevel() === 'off') {
        this.spawnParticleBurst(
          impact.x,
          impact.y,
          impact.isEliteOrBoss ? 14 : 9,
          'fx_ring',
          110,
          280,
          0.14,
          0.28,
          impact.flashTintNumber
        );
      } else {
        this.spawnEnemyHitBloodSplash(
          impact.x,
          impact.y,
          impact.enemyType ?? (impact.isEliteOrBoss ? 'boss' : 'imp'),
          0,
          0,
          true,
          impact.enemyDisplaySize
        );
      }
    });

    // Keep cameras, floor TileSprite, and GPU upscaler synced across Dynamic Resolution / 4K setting changes
    this.mainResizeHandler = (gameSize: Phaser.Structs.Size) => {
      if (!this.sys?.isActive() || !this.cameras?.main) return;
      const nextScale = Math.max(1, gameSize.width / LOGICAL_WIDTH);
      performanceRuntime.currentRenderScale = nextScale;
      syncLogicalCamera(this.cameras.main, nextScale, false);
      if (this.floor && this.floor.scene) {
        this.floor.setPosition(this.cameras.main.width * 0.5, this.cameras.main.height * 0.5);
      }
      if (this.lightVignette && this.lightVignette.scene) {
        const z = getScrollZeroOffset(this.cameras.main);
        this.lightVignette.setPosition(z.x, z.y);
      }
      if (this.bossVignetteSprite && this.bossVignetteSprite.scene) {
        const z = getScrollZeroOffset(this.cameras.main);
        this.bossVignetteSprite.setPosition(LOGICAL_WIDTH / 2 + z.x, LOGICAL_HEIGHT / 2 + z.y);
      }
      this.upscaleFilter = attachUpscaleSharpFilter(
        this,
        this.cameras.main,
        nextScale,
        performanceRuntime.currentConfig.upscalerEnabled
      );
    };
    this.scale.on('resize', this.mainResizeHandler);

    // Live apply Settings -> Graphics & 90Hz/4K toggles immediately mid-run
    this.unsubGraphics?.();
    this.unsubGraphics = gameManager.onGraphicsChange((nextGfx) => {
      if (!this.sys?.isActive() || !this.cameras?.main) return;
      performanceRuntime.currentConfig = { ...nextGfx };
      performanceRuntime.setTargetFpsOnGame(this.game, nextGfx.targetFps);
      const nextScale = resolveRenderScale(nextGfx.resolutionMode, this.maxWebGlTexSize);
      if (Math.abs(nextScale - performanceRuntime.currentRenderScale) > 0.01 && this.game?.scale) {
        performanceRuntime.currentRenderScale = nextScale;
        this.game.scale.setGameSize(
          Math.round(LOGICAL_WIDTH * nextScale),
          Math.round(LOGICAL_HEIGHT * nextScale)
        );
      }
      this.upscaleFilter = attachUpscaleSharpFilter(
        this,
        this.cameras.main,
        nextScale,
        nextGfx.upscalerEnabled
      );
    });

    // Clean up activeScene reference and atmosphere graphics on shutdown/restart
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.levelUpSlowMoTimer !== null) {
        window.clearTimeout(this.levelUpSlowMoTimer);
        this.levelUpSlowMoTimer = null;
      }
      this.pendingEvent = null;
      this.telegraphs = [];
      this.activeBoss = null;
      if (this.player) {
        this.player.off(Phaser.Animations.Events.ANIMATION_UPDATE);
        this.player.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
      }
      for (let i = 0; i < this.effectPool.length; i++) {
        const fx = this.effectPool[i];
        if (fx.timerEvent) {
          fx.timerEvent.destroy();
          fx.timerEvent = undefined;
        }
        if (fx.sprite) {
          fx.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE);
          fx.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
        }
      }
      this.unsubCritImpact?.();
      this.unsubCritImpact = null;
      this.unsubGraphics?.();
      this.unsubGraphics = null;
      this.unsubGore?.();
      this.unsubGore = null;
      this.bossVignetteSprite = null;
      if (this.mainResizeHandler) {
        this.scale.off('resize', this.mainResizeHandler);
        this.mainResizeHandler = null;
      }
      this.upscaleFilter = null;
      this.isHitstopPausedPhysics = false;
      dailyMissions.flush();
      achievements.flush();
      this.atmosphereOverlay?.destroy();
      this.atmosphereOverlay = null;
      this.shadowSystem?.destroy();
      this.shadowSystem = null;
      if (gameManager.activeScene === this) {
        gameManager.activeScene = null;
      }
    });

    this.unsubGore = gameManager.onGoreChange((nextLevel) => {
      this.handleGoreLevelChanged(nextLevel);
    });
  }

  // -------------------------------------------------------------
  // Weapons Initialization
  // -------------------------------------------------------------
  private initWeapons() {
    this.weapons = {
      bolt: {
        id: 'bolt',
        name: 'Light Bolt',
        level: 1,
        maxLevel: 5,
        damage: BALANCE.primaryWeapon.baseDamage,
        cooldown: Math.round(1000 / BALANCE.primaryWeapon.fireRatePerSec),
        lastFired: 0,
        unlocked: true,
        description: 'Auto-targets nearest threat with radiant bolts.',
        icon: 'bolt',
      },
      blades: {
        id: 'blades',
        name: 'Spectral Blade',
        level: 0,
        maxLevel: 4,
        damage: 18,
        cooldown: 300,
        lastFired: 0,
        unlocked: false,
        description: 'Ethereal blades that orbit the lantern and slash enemies even while moving.',
        icon: 'blade',
      },
      ring: {
        id: 'ring',
        name: 'Radiant Nova',
        level: 0,
        maxLevel: 4,
        damage: 45,
        cooldown: 4000,
        lastFired: 0,
        unlocked: false,
        description: 'Pulses expanding holy shockwaves that push enemies.',
        icon: 'ring',
      },
      spark: {
        id: 'spark',
        name: 'Celestial Sparks',
        level: 0,
        maxLevel: 4,
        damage: 32,
        cooldown: 3500,
        lastFired: 0,
        unlocked: false,
        description: 'Piercing bursts of astral sparks.',
        icon: 'spark',
      },
      shotgun: {
        id: 'shotgun',
        name: 'Radiant Scatter',
        level: BALANCE.startingKit.shotgunUnlockedAtStart ? 1 : 0,
        maxLevel: 5,
        damage: 38,
        cooldown: 2200,
        lastFired: 0,
        unlocked: BALANCE.startingKit.shotgunUnlockedAtStart,
        description: 'Blasts a spread of cyan arcane bolts at incoming monsters.',
        icon: 'spark',
      },
    };
  }

  // -------------------------------------------------------------
  // Particle Pooling (Capped at 200, ADD blend mode)
  // -------------------------------------------------------------
  private initParticlePool() {
    this.particlePool = [];
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      const sprite = this.add.sprite(0, 0, 'fx_spark');
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDepth(25);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.disableInteractive();
      this.particlePool.push({
        sprite,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        decay: 1,
        active: false,
      });
    }
  }

  private spawnParticleBurst(
    x: number,
    y: number,
    count: number,
    texture: 'fx_spark' | 'fx_bolt' | 'fx_ring' = 'fx_spark',
    speedMin: number = 80,
    speedMax: number = 220,
    scaleMin: number = 0.15,
    scaleMax: number = 0.35,
    tint?: number,
    maxLifeOverrideMs?: number
  ) {
    const isLowQuality = gameManager.getQualityTier() === 'low';
    const effectiveCount = isLowQuality ? Math.max(1, Math.round(count * 0.5)) : count;
    const poolCap = isLowQuality ? this.LOW_QUALITY_MAX_PARTICLES : this.particlePool.length;
    let spawned = 0;
    for (let i = 0; i < poolCap; i++) {
      const p = this.particlePool[i];
      if (!p.active) {
        p.active = true;
        p.sprite.setTexture(texture);
        p.sprite.setPosition(x, y);
        p.sprite.setVisible(true);
        p.sprite.setActive(true);
        p.sprite.setAlpha(1);

        if (tint !== undefined) {
          p.sprite.setTint(tint);
        } else {
          p.sprite.clearTint();
        }

        const angle = Math.random() * Math.PI * 2;
        const spd = Phaser.Math.Between(speedMin, speedMax);
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = 0;
        p.maxLife = maxLifeOverrideMs ?? Phaser.Math.Between(250, 450);
        p.decay = 1 / p.maxLife;

        const sc = Phaser.Math.FloatBetween(scaleMin, scaleMax);
        p.sprite.setScale(sc);
        p.sprite.setRotation(angle);

        spawned++;
        if (spawned >= effectiveCount) break;
      }
    }
  }

  private updateParticles(delta: number) {
    for (const p of this.particlePool) {
      if (p.active) {
        p.life += delta;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.sprite.setVisible(false);
          p.sprite.setActive(false);
        } else {
          p.sprite.x += (p.vx * delta) / 1000;
          p.sprite.y += (p.vy * delta) / 1000;
          const pDamp = Math.pow(0.95, delta / 16.6667);
          p.vx *= pDamp;
          p.vy *= pDamp;
          const progress = p.life / p.maxLife;
          p.sprite.setAlpha(1 - progress);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Enemy Death Gore System (Pooled, NORMAL Blend, Zero Per-Frame Alloc)
  // -------------------------------------------------------------
  private ensureGoreTextures() {
    // 1. Elongated blood droplet texture pointing along +X
    if (!this.textures.exists('gore_droplet')) {
      const tex = this.textures.createCanvas('gore_droplet', 24, 12);
      if (tex) {
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 24, 12);
        const grad = ctx.createRadialGradient(16, 6, 1, 13, 6, 11);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.6, 'rgba(245, 240, 240, 0.92)');
        grad.addColorStop(1, 'rgba(220, 210, 210, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(22, 6);
        ctx.quadraticCurveTo(18, 1.5, 11, 2.5);
        ctx.quadraticCurveTo(3, 4.2, 1, 6);
        ctx.quadraticCurveTo(3, 7.8, 11, 9.5);
        ctx.quadraticCurveTo(18, 10.5, 22, 6);
        ctx.closePath();
        ctx.fill();
        tex.refresh();
      }
    }

    // 2. Angular stone chip texture for Stone Brute deaths
    if (!this.textures.exists('gore_stone_chip')) {
      const tex = this.textures.createCanvas('gore_stone_chip', 14, 14);
      if (tex) {
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 14, 14);
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(2, 5);
        ctx.lineTo(7, 1);
        ctx.lineTo(12, 4);
        ctx.lineTo(11, 11);
        ctx.lineTo(5, 13);
        ctx.lineTo(1, 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.beginPath();
        ctx.moveTo(2, 5);
        ctx.lineTo(7, 1);
        ctx.lineTo(9, 6);
        ctx.lineTo(4, 7);
        ctx.closePath();
        ctx.fill();
        tex.refresh();
      }
    }

    // 3. Soft mist / dust puff texture
    if (!this.textures.exists('gore_mist_puff')) {
      const tex = this.textures.createCanvas('gore_mist_puff', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, 64, 64);
        const g1 = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
        g1.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
        g1.addColorStop(0.45, 'rgba(255, 255, 255, 0.48)');
        g1.addColorStop(0.8, 'rgba(255, 255, 255, 0.14)');
        g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, 64, 64);
        tex.refresh();
      }
    }

    // 4. Four distinct splat decal textures (irregular dark crimson blob + 6-10 satellite droplets + specular edge)
    const size = GORE.decal.textureSize;
    const half = size * 0.5;
    for (let v = 0; v < GORE.decal.variants; v++) {
      const key = GORE_DECAL_KEYS[v];
      if (this.textures.exists(key)) continue;
      const tex = this.textures.createCanvas(key, size, size);
      if (!tex) continue;
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);

      // Deterministic pseudo-random helper per variant so stains look organic & consistent across boots
      let seed = (v + 1) * 9301 + 49297;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      // Irregular multi-lobe dark crimson central pool
      ctx.fillStyle = '#47090e';
      ctx.beginPath();
      const lobes = 14;
      for (let i = 0; i <= lobes; i++) {
        const a = (i / lobes) * Math.PI * 2;
        const nextA = ((i + 0.5) / lobes) * Math.PI * 2;
        const r = 13 + Math.sin(a * 3 + v * 1.4) * 4.5 + Math.cos(a * 5 - v) * 2.5 + rand() * 3.5;
        const cr = r + 3.2;
        const px = half + Math.cos(a) * r;
        const py = half + Math.sin(a) * r;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          const cpx = half + Math.cos(nextA) * cr;
          const cpy = half + Math.sin(nextA) * cr;
          ctx.quadraticCurveTo(cpx, cpy, px, py);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Deeper dried center core
      ctx.fillStyle = '#36060a';
      ctx.beginPath();
      ctx.ellipse(half + (rand() - 0.5) * 4, half + (rand() - 0.5) * 4, 9.5, 7.5, v * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Fresh wet crimson edge layer
      ctx.fillStyle = 'rgba(107, 15, 21, 0.78)';
      for (let l = 0; l < 4; l++) {
        const la = (l / 4) * Math.PI * 2 + v * 0.6;
        const dist = 7 + rand() * 5;
        ctx.beginPath();
        ctx.ellipse(
          half + Math.cos(la) * dist,
          half + Math.sin(la) * dist,
          5 + rand() * 3.5,
          3.5 + rand() * 2.5,
          la,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // 6-10 satellite droplets radiating from main splat
      const satCount =
        GORE.decal.satelliteMin +
        (v % (GORE.decal.satelliteMax - GORE.decal.satelliteMin + 1));
      for (let s = 0; s < satCount; s++) {
        const sa = (s / satCount) * Math.PI * 2 + rand() * 0.55;
        const sdist = 18 + rand() * 19;
        const sx = half + Math.cos(sa) * sdist;
        const sy = half + Math.sin(sa) * sdist;
        const srX = 2.0 + rand() * 2.8;
        const srY = 1.4 + rand() * 1.8;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sa);
        ctx.fillStyle = s % 2 === 0 ? '#5c0c12' : '#42080d';
        ctx.beginPath();
        ctx.ellipse(0, 0, srX, srY, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tiny lighter specular glints on larger satellite droplets
        if (s < 3) {
          ctx.fillStyle = 'rgba(164, 40, 48, 0.65)';
          ctx.beginPath();
          ctx.arc(-srX * 0.25, -srY * 0.25, 0.85, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Tiny lighter specular edge on upper-left rim of main blob
      ctx.strokeStyle = 'rgba(176, 44, 54, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(half - 1.5, half - 1.5, 11.5, Math.PI * 0.95, Math.PI * 1.48);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(half + 2.5, half - 2.5, 6.2, Math.PI * 1.15, Math.PI * 1.55);
      ctx.stroke();

      tex.refresh();
    }

    // 5. Boss death brief 10% darkening vignette texture
    if (!this.textures.exists('gore_boss_vignette')) {
      const sizeV = 256;
      const tex = this.textures.createCanvas('gore_boss_vignette', sizeV, sizeV);
      if (tex) {
        const ctx = tex.getContext();
        const halfV = sizeV * 0.5;
        const grad = ctx.createRadialGradient(halfV, halfV, halfV * 0.35, halfV, halfV, halfV);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.65, 'rgba(6, 2, 5, 0.55)');
        grad.addColorStop(1, 'rgba(4, 1, 4, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sizeV, sizeV);
        tex.refresh();
      }
    }

    // 6. Thick, viscous on-hit blood splash splatter burst texture
    if (!this.textures.exists('gore_hit_splash')) {
      const sizeS = 96;
      const halfS = sizeS * 0.5;
      const tex = this.textures.createCanvas('gore_hit_splash', sizeS, sizeS);
      if (tex) {
        const ctx = tex.getContext();
        ctx.clearRect(0, 0, sizeS, sizeS);

        let seed = 7919;
        const rand = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };

        // Base thick clotted outer blood splat body (rounded organic lobes)
        ctx.fillStyle = 'rgba(218, 218, 218, 0.96)';
        ctx.beginPath();
        const outerLobes = 28;
        for (let i = 0; i <= outerLobes; i++) {
          const a = (i / outerLobes) * Math.PI * 2;
          const wave = Math.sin(a * 7 + 0.4) * 5.2 + Math.cos(a * 4 - 0.8) * 3.8;
          const r = 19.5 + wave + rand() * 5.2;
          const px = halfS + Math.cos(a) * r;
          const py = halfS + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Heavy radial blood splatter arms & bulbous droplets connected to the core
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + (rand() - 0.5) * 0.28;
          const reach = 21 + rand() * 14;
          const width = 4.6 + rand() * 3.8;
          ctx.save();
          ctx.translate(halfS, halfS);
          ctx.rotate(a);
          ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.98)' : 'rgba(225, 225, 225, 0.94)';
          ctx.beginPath();
          ctx.moveTo(8, -width * 0.65);
          ctx.quadraticCurveTo(reach * 0.65, -width * 0.48, reach, 0);
          ctx.quadraticCurveTo(reach * 0.65, width * 0.48, 8, width * 0.65);
          ctx.closePath();
          ctx.fill();

          // Rounded heavy splash tip glob
          ctx.beginPath();
          ctx.arc(reach, 0, width * 0.58, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Dense bright arterial inner core for thick layered depth
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.beginPath();
        ctx.arc(halfS, halfS, 14.5, 0, Math.PI * 2);
        ctx.fill();
        for (let c = 0; c < 6; c++) {
          const ca = (c / 6) * Math.PI * 2 + rand() * 0.5;
          const cd = 6 + rand() * 7;
          ctx.beginPath();
          ctx.arc(halfS + Math.cos(ca) * cd, halfS + Math.sin(ca) * cd, 5.5 + rand() * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Chunky satellite blood globs & directional streaks around core
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + rand() * 0.35;
          const dist = 25 + rand() * 16;
          const sx = halfS + Math.cos(a) * dist;
          const sy = halfS + Math.sin(a) * dist;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(a);
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(218, 206, 206, 0.88)';
          ctx.beginPath();
          ctx.ellipse(0, 0, 4.4 + rand() * 3.8, 2.2 + rand() * 2.0, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        tex.refresh();
      }
    }
  }

  private initGorePools() {
    this.goreParticlePool = [];
    for (let i = 0; i < GORE.maxDroplets; i++) {
      const sprite = this.add.image(0, 0, 'gore_droplet');
      sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      sprite.setDepth(GORE.dropletDepth);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.disableInteractive();
      this.goreParticlePool.push({
        sprite,
        kind: 'droplet',
        vx: 0,
        vy: 0,
        gravity: 0,
        life: 0,
        maxLife: 1,
        baseAlpha: 1,
        startScaleX: 1,
        startScaleY: 1,
        endScale: 1,
        rotSpeed: 0,
        active: false,
        seq: 0,
      });
    }

    this.goreDecalPool = [];
    for (let i = 0; i < GORE.maxDecals; i++) {
      const sprite = this.add.image(0, 0, GORE_DECAL_KEYS[0]);
      sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      sprite.setDepth(GORE.decalDepth);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.disableInteractive();
      this.goreDecalPool.push({
        sprite,
        life: 0,
        maxLife: GORE.decal.fadeDurationMs,
        baseAlpha: GORE.decal.alpha,
        active: false,
        seq: 0,
      });
    }
  }

  private handleGoreLevelChanged(nextLevel: GoreLevel) {
    if (nextLevel === 'off') {
      for (let i = 0; i < this.goreParticlePool.length; i++) {
        const p = this.goreParticlePool[i];
        p.active = false;
        p.sprite.setVisible(false);
        p.sprite.setActive(false);
      }
      for (let i = 0; i < this.goreDecalPool.length; i++) {
        const d = this.goreDecalPool[i];
        d.active = false;
        d.sprite.setVisible(false);
        d.sprite.setActive(false);
      }
      this.bossVignetteTimerMs = 0;
      if (this.bossVignetteSprite) {
        this.bossVignetteSprite.setAlpha(0).setVisible(false);
      }
      return;
    }

    if (nextLevel === 'low') {
      const maxLowParticles = Math.floor(GORE.maxDroplets * GORE.lowSettingMultiplier);
      let activeParticles = 0;
      for (let i = 0; i < this.goreParticlePool.length; i++) {
        if (this.goreParticlePool[i].active) activeParticles++;
      }
      while (activeParticles > maxLowParticles) {
        let oldestIdx = -1;
        let oldestSeq = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < this.goreParticlePool.length; i++) {
          const p = this.goreParticlePool[i];
          if (p.active && p.seq < oldestSeq) {
            oldestSeq = p.seq;
            oldestIdx = i;
          }
        }
        if (oldestIdx === -1) break;
        const victim = this.goreParticlePool[oldestIdx];
        victim.active = false;
        victim.sprite.setVisible(false);
        victim.sprite.setActive(false);
        activeParticles--;
      }

      const maxLowDecals = Math.floor(GORE.maxDecals * GORE.lowSettingMultiplier);
      let activeDecals = 0;
      for (let i = 0; i < this.goreDecalPool.length; i++) {
        if (this.goreDecalPool[i].active) activeDecals++;
      }
      while (activeDecals > maxLowDecals) {
        let oldestIdx = -1;
        let oldestSeq = Number.MAX_SAFE_INTEGER;
        for (let i = 0; i < this.goreDecalPool.length; i++) {
          const d = this.goreDecalPool[i];
          if (d.active && d.seq < oldestSeq) {
            oldestSeq = d.seq;
            oldestIdx = i;
          }
        }
        if (oldestIdx === -1) break;
        const victim = this.goreDecalPool[oldestIdx];
        victim.active = false;
        victim.sprite.setVisible(false);
        victim.sprite.setActive(false);
        activeDecals--;
      }
    }
  }

  private acquireGoreParticle(maxActiveCap: number): GoreParticle {
    let activeCount = 0;
    let freeSlot: GoreParticle | null = null;
    let oldestSlot = this.goreParticlePool[0];
    let oldestSeq = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < this.goreParticlePool.length; i++) {
      const p = this.goreParticlePool[i];
      if (p.active) {
        activeCount++;
        if (p.seq < oldestSeq) {
          oldestSeq = p.seq;
          oldestSlot = p;
        }
      } else if (!freeSlot) {
        freeSlot = p;
      }
    }

    if (activeCount >= maxActiveCap || !freeSlot) {
      return oldestSlot;
    }
    return freeSlot;
  }

  private acquireGoreDecal(maxActiveCap: number): GoreDecal {
    let activeCount = 0;
    let freeSlot: GoreDecal | null = null;
    let oldestSlot = this.goreDecalPool[0];
    let oldestSeq = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < this.goreDecalPool.length; i++) {
      const d = this.goreDecalPool[i];
      if (d.active) {
        activeCount++;
        if (d.seq < oldestSeq) {
          oldestSeq = d.seq;
          oldestSlot = d;
        }
      } else if (!freeSlot) {
        freeSlot = d;
      }
    }

    if (activeCount >= maxActiveCap || !freeSlot) {
      return oldestSlot;
    }
    return freeSlot;
  }

  private spawnGoreDroplet(
    x: number,
    y: number,
    tint: number,
    speedMin: number,
    speedMax: number,
    gravity: number,
    lifeMinMs: number,
    lifeMaxMs: number,
    maxActiveCap: number
  ) {
    const p = this.acquireGoreParticle(maxActiveCap);
    this.goreParticleSeq += 1;

    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.FloatBetween(speedMin, speedMax);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - Phaser.Math.FloatBetween(20, 75);

    p.kind = 'droplet';
    p.active = true;
    p.seq = this.goreParticleSeq;
    p.vx = vx;
    p.vy = vy;
    p.gravity = gravity;
    p.life = 0;
    p.maxLife = Phaser.Math.Between(lifeMinMs, lifeMaxMs);
    p.baseAlpha = GORE.bloodBurst.alpha;
    p.startScaleX = Phaser.Math.FloatBetween(0.45, 0.72);
    p.startScaleY = Phaser.Math.FloatBetween(0.34, 0.52);
    p.endScale = GORE.bloodBurst.minEndScaleFactor;
    p.rotSpeed = 0;

    const stretchX = p.startScaleX + speed * GORE.bloodBurst.stretchVelocityFactor;
    p.sprite.setTexture('gore_droplet');
    p.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    p.sprite.setDepth(GORE.dropletDepth);
    p.sprite.setPosition(x, y);
    p.sprite.setRotation(Math.atan2(vy, vx));
    p.sprite.setScale(stretchX, p.startScaleY);
    p.sprite.setTint(tint);
    p.sprite.setAlpha(p.baseAlpha);
    p.sprite.setVisible(true);
    p.sprite.setActive(true);
  }

  private spawnGoreStoneChip(
    x: number,
    y: number,
    tint: number,
    maxActiveCap: number
  ) {
    const cfg = GORE.variants.brute;
    const p = this.acquireGoreParticle(maxActiveCap);
    this.goreParticleSeq += 1;

    const angle = Math.random() * Math.PI * 2;
    const speed = Phaser.Math.FloatBetween(cfg.chipSpeedMin, cfg.chipSpeedMax);
    const sc = Phaser.Math.FloatBetween(cfg.chipScaleMin, cfg.chipScaleMax);

    p.kind = 'chip';
    p.active = true;
    p.seq = this.goreParticleSeq;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - Phaser.Math.FloatBetween(40, 110);
    p.gravity = cfg.chipGravity;
    p.life = 0;
    p.maxLife = Phaser.Math.Between(cfg.chipLifeMinMs, cfg.chipLifeMaxMs);
    p.baseAlpha = 0.95;
    p.startScaleX = sc;
    p.startScaleY = sc;
    p.endScale = 0.25;
    p.rotSpeed = Phaser.Math.FloatBetween(-10, 10);

    p.sprite.setTexture('gore_stone_chip');
    p.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    p.sprite.setDepth(GORE.dropletDepth);
    p.sprite.setPosition(x, y);
    p.sprite.setRotation(Math.random() * Math.PI * 2);
    p.sprite.setScale(sc);
    p.sprite.setTint(tint);
    p.sprite.setAlpha(p.baseAlpha);
    p.sprite.setVisible(true);
    p.sprite.setActive(true);
  }

  private spawnGoreMist(
    x: number,
    y: number,
    kind: 'mist' | 'wisp_mist',
    tint: number,
    alpha: number,
    durationMs: number,
    startScale: number,
    endScale: number,
    vx: number,
    vy: number,
    gravity: number,
    maxActiveCap: number
  ) {
    const p = this.acquireGoreParticle(maxActiveCap);
    this.goreParticleSeq += 1;

    p.kind = kind;
    p.active = true;
    p.seq = this.goreParticleSeq;
    p.vx = vx;
    p.vy = vy;
    p.gravity = gravity;
    p.life = 0;
    p.maxLife = durationMs;
    p.baseAlpha = alpha;
    p.startScaleX = startScale;
    p.startScaleY = startScale;
    p.endScale = endScale;
    p.rotSpeed = Phaser.Math.FloatBetween(-1.2, 1.2);

    p.sprite.setTexture('gore_mist_puff');
    p.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    p.sprite.setDepth(GORE.dropletDepth);
    p.sprite.setPosition(x, y);
    p.sprite.setRotation(Math.random() * Math.PI * 2);
    p.sprite.setScale(startScale);
    p.sprite.setTint(tint);
    p.sprite.setAlpha(alpha);
    p.sprite.setVisible(true);
    p.sprite.setActive(true);
  }

  private spawnFloorDecal(
    x: number,
    y: number,
    scale: number,
    tint: number,
    maxActiveDecals: number
  ) {
    const d = this.acquireGoreDecal(maxActiveDecals);
    this.goreDecalSeq += 1;

    const variantKey = GORE_DECAL_KEYS[(Math.random() * GORE_DECAL_KEYS.length) | 0];
    d.active = true;
    d.seq = this.goreDecalSeq;
    d.life = 0;
    d.maxLife = GORE.decal.fadeDurationMs;
    d.baseAlpha = GORE.decal.alpha;

    d.sprite.setTexture(variantKey);
    d.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    d.sprite.setDepth(GORE.decalDepth);
    d.sprite.setPosition(x, y);
    d.sprite.setRotation(Math.random() * Math.PI * 2);
    d.sprite.setScale(scale);
    if (tint === 0xffffff) {
      d.sprite.clearTint();
    } else {
      d.sprite.setTint(tint);
    }
    d.sprite.setAlpha(d.baseAlpha);
    d.sprite.setVisible(true);
    d.sprite.setActive(true);
  }

  private spawnEnemyDeathGore(
    x: number,
    y: number,
    enemyType: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss',
    enemyScale: number,
    isElite: boolean
  ) {
    const goreSetting = gameManager.getGoreLevel();
    if (goreSetting === 'off') return;

    const isLowGore = goreSetting === 'low';
    const countMult = isLowGore ? GORE.lowSettingMultiplier : 1;
    const maxLiveDroplets = isLowGore
      ? Math.floor(GORE.maxDroplets * GORE.lowSettingMultiplier)
      : GORE.maxDroplets;
    const maxLiveDecals = isLowGore
      ? Math.floor(GORE.maxDecals * GORE.lowSettingMultiplier)
      : GORE.maxDecals;

    // 1. Stone Brute variant: gray stone chips + 6-8 amber ember sparks + gray dust puff (no blood)
    if (enemyType === 'brute') {
      const bCfg = GORE.variants.brute;
      const chipCount = Math.max(
        1,
        Math.round(Phaser.Math.Between(bCfg.chipMin, bCfg.chipMax) * countMult)
      );
      for (let i = 0; i < chipCount; i++) {
        const chipColor = bCfg.chipColors[i % bCfg.chipColors.length];
        this.spawnGoreStoneChip(x, y, chipColor, maxLiveDroplets);
      }

      const emberTotal = Math.max(
        1,
        Math.round(Phaser.Math.Between(bCfg.emberMin, bCfg.emberMax) * countMult)
      );
      const halfEmber = Math.ceil(emberTotal * 0.5);
      const restEmber = emberTotal - halfEmber;
      this.spawnParticleBurst(
        x,
        y,
        halfEmber,
        'fx_spark',
        bCfg.emberSpeedMin,
        bCfg.emberSpeedMax,
        bCfg.emberScaleMin,
        bCfg.emberScaleMax,
        bCfg.emberColors[0],
        bCfg.emberLifeMs
      );
      if (restEmber > 0) {
        this.spawnParticleBurst(
          x,
          y,
          restEmber,
          'fx_spark',
          bCfg.emberSpeedMin,
          bCfg.emberSpeedMax,
          bCfg.emberScaleMin,
          bCfg.emberScaleMax,
          bCfg.emberColors[1],
          bCfg.emberLifeMs
        );
      }

      const dustCount = isLowGore ? 1 : bCfg.dustCount;
      for (let i = 0; i < dustCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = Phaser.Math.FloatBetween(10, 32);
        this.spawnGoreMist(
          x + Phaser.Math.FloatBetween(-8, 8),
          y + Phaser.Math.FloatBetween(-6, 6),
          'mist',
          bCfg.dustColor,
          bCfg.dustAlpha,
          bCfg.dustDurationMs,
          bCfg.dustStartScale,
          bCfg.dustEndScale,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          0,
          maxLiveDroplets
        );
      }
      return;
    }

    // 2. Wisp variant: cyan mist that rises and dissolves (no blood)
    if (enemyType === 'wisp') {
      const wCfg = GORE.variants.wisp;
      const mistCount = Math.max(
        1,
        Math.round(Phaser.Math.Between(wCfg.mistMin, wCfg.mistMax) * countMult)
      );
      for (let i = 0; i < mistCount; i++) {
        this.spawnGoreMist(
          x + Phaser.Math.FloatBetween(-10, 10),
          y + Phaser.Math.FloatBetween(-8, 8),
          'wisp_mist',
          wCfg.mistColor,
          wCfg.mistAlpha,
          wCfg.mistDurationMs,
          wCfg.startScale,
          wCfg.endScale,
          Phaser.Math.FloatBetween(-wCfg.driftVxRange, wCfg.driftVxRange),
          Phaser.Math.FloatBetween(wCfg.riseVyMin, wCfg.riseVyMax),
          wCfg.riseAccelY,
          maxLiveDroplets
        );
      }
      return;
    }

    // 3. Blood variants: imp, spitter, elites, boss
    const isBoss = enemyType === 'boss';
    const isSpitter = enemyType === 'spitter';
    const colors = isSpitter ? GORE.bloodBurst.spitterColors : GORE.bloodBurst.colors;

    const baseDrops = Phaser.Math.Between(GORE.bloodBurst.minCount, GORE.bloodBurst.maxCount);
    let dropCount = isBoss
      ? Math.min(GORE.variants.boss.maxDropletsPerKill, baseDrops * GORE.variants.boss.dropletMultiplier)
      : baseDrops;
    dropCount = Math.max(1, Math.round(dropCount * countMult));

    const spawnSpread = isBoss ? 22 : isElite ? 10 : 5;
    for (let i = 0; i < dropCount; i++) {
      const color = colors[(Math.random() * colors.length) | 0];
      const ox = x + Phaser.Math.FloatBetween(-spawnSpread, spawnSpread);
      const oy = y + Phaser.Math.FloatBetween(-spawnSpread, spawnSpread);
      this.spawnGoreDroplet(
        ox,
        oy,
        color,
        GORE.bloodBurst.speedMin,
        isBoss ? GORE.bloodBurst.speedMax * 1.15 : GORE.bloodBurst.speedMax,
        GORE.bloodBurst.gravity,
        GORE.bloodBurst.lifeMinMs,
        GORE.bloodBurst.lifeMaxMs,
        maxLiveDroplets
      );
    }

    // Soft mist puffs
    const mistColor = isSpitter ? GORE.mist.spitterColor : GORE.mist.bloodColor;
    const rawMistCount = isBoss
      ? Phaser.Math.Between(GORE.variants.boss.mistMin, GORE.variants.boss.mistMax)
      : Phaser.Math.Between(GORE.mist.minCount, GORE.mist.maxCount);
    const mistCount = Math.max(1, Math.round(rawMistCount * countMult));
    const mistAlpha = isBoss ? GORE.variants.boss.mistAlpha : GORE.mist.alpha;
    const mistDuration = isBoss ? GORE.variants.boss.mistDurationMs : GORE.mist.durationMs;
    const mistEndScale = isBoss ? GORE.variants.boss.mistEndScale : GORE.mist.endScale;

    for (let i = 0; i < mistCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Phaser.Math.FloatBetween(GORE.mist.speedMin, GORE.mist.speedMax);
      this.spawnGoreMist(
        x + Phaser.Math.FloatBetween(-spawnSpread, spawnSpread),
        y + Phaser.Math.FloatBetween(-spawnSpread, spawnSpread),
        'mist',
        mistColor,
        mistAlpha,
        mistDuration,
        isBoss ? 0.65 : GORE.mist.startScale,
        mistEndScale,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        0,
        maxLiveDroplets
      );
    }

    // Floor stain decal (Low halves decal frequency & cap; Boss always stamps)
    let stampDecal = true;
    if (isLowGore && !isBoss) {
      this.goreLowDecalCounter = (this.goreLowDecalCounter + 1) & 1;
      stampDecal = this.goreLowDecalCounter === 1;
    }
    if (stampDecal) {
      const scaleFactor = enemyScale > 0 ? Math.min(1.4, Math.max(0.75, enemyScale / 0.48)) : 1;
      const variantMult = isBoss
        ? GORE.decal.bossScaleMult
        : isElite
          ? GORE.decal.eliteScaleMult
          : 1;
      const decalScale = GORE.decal.baseScale * scaleFactor * variantMult;
      const decalTint = isSpitter ? GORE.decal.spitterTint : GORE.decal.bloodTint;
      this.spawnFloorDecal(x, y + 6, decalScale, decalTint, maxLiveDecals);
    }

    // Boss death brief 10% darkening vignette
    if (isBoss && this.bossVignetteSprite) {
      this.bossVignetteTimerMs = GORE.variants.boss.vignetteDurationMs;
      this.bossVignetteSprite.setAlpha(GORE.variants.boss.vignetteAlpha);
      this.bossVignetteSprite.setVisible(true);
    }
  }

  private spawnEnemyHitBloodSplash(
    x: number,
    y: number,
    enemyType: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss',
    impactVx: number,
    impactVy: number,
    isCrit: boolean,
    enemyDisplaySize?: number
  ) {
    const goreSetting = gameManager.getGoreLevel();
    if (goreSetting === 'off') {
      this.spawnSparkHitEffect(x, y);
      return;
    }

    const hCfg = GORE.hitSplash;
    const fallbackSize =
      enemyType === 'boss'
        ? 315
        : enemyType === 'brute'
          ? 145
          : enemyType === 'imp'
            ? 120
            : enemyType === 'spitter'
              ? 92
              : 74;
    const resolvedSize =
      enemyDisplaySize && enemyDisplaySize > 0 ? enemyDisplaySize : fallbackSize;
    const sizeScale = Phaser.Math.Clamp(
      resolvedSize / hCfg.baselineMonsterSizePx,
      hCfg.minMonsterScale,
      hCfg.maxMonsterScale
    );

    // Play wet blood splash SFX scaled dynamically with monster size & crit impact
    soundManager.playBloodSplash(sizeScale, isCrit);

    const isLowGore = goreSetting === 'low';
    const maxLiveDroplets = isLowGore
      ? Math.floor(GORE.maxDroplets * GORE.lowSettingMultiplier)
      : GORE.maxDroplets;
    const isSpitter = enemyType === 'spitter';

    const hasDir = impactVx * impactVx + impactVy * impactVy > 4;
    const baseAngle = hasDir ? Math.atan2(impactVy, impactVx) : Math.random() * Math.PI * 2;
    const dirX = Math.cos(baseAngle);
    const dirY = Math.sin(baseAngle);

    // 1. Dense crimson blood cloud mist behind splash for thick volume
    this.spawnGoreMist(
      x + dirX * (6 * sizeScale),
      y + dirY * (6 * sizeScale),
      'mist',
      isSpitter ? hCfg.spitterMistTint : hCfg.mistTint,
      isLowGore ? hCfg.mistAlpha * 0.72 : hCfg.mistAlpha,
      hCfg.mistDurationMs,
      hCfg.mistStartScale * sizeScale,
      hCfg.mistEndScale * sizeScale,
      dirX * (28 * sizeScale),
      dirY * (28 * sizeScale),
      0,
      maxLiveDroplets
    );

    // 2. Primary thick pooled blood splash burst (NORMAL blend, scaled by monster size)
    const splash = this.acquireGoreParticle(maxLiveDroplets);
    this.goreParticleSeq += 1;

    const baseEndScale = isCrit ? hCfg.critSplashEndScale : hCfg.splashEndScale;
    const startScale = hCfg.splashStartScale * sizeScale;
    const endScale = baseEndScale * sizeScale;

    splash.kind = 'splash';
    splash.active = true;
    splash.seq = this.goreParticleSeq;
    splash.vx = hasDir ? dirX * (32 * Math.min(1.8, sizeScale)) : 0;
    splash.vy = hasDir ? dirY * (32 * Math.min(1.8, sizeScale)) : 0;
    splash.gravity = 0;
    splash.life = 0;
    splash.maxLife = Math.round(hCfg.splashDurationMs * (0.92 + Math.min(0.35, sizeScale * 0.1)));
    splash.baseAlpha = hCfg.splashAlpha;
    splash.startScaleX = startScale;
    splash.startScaleY = startScale;
    splash.endScale = endScale;
    splash.rotSpeed = 0;

    splash.sprite.setTexture('gore_hit_splash');
    splash.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
    splash.sprite.setDepth(GORE.dropletDepth);
    splash.sprite.setPosition(x, y);
    splash.sprite.setRotation(baseAngle + Phaser.Math.FloatBetween(-0.55, 0.55));
    splash.sprite.setScale(startScale);
    splash.sprite.setTint(isSpitter ? hCfg.spitterSplashTint : hCfg.splashTint);
    splash.sprite.setAlpha(hCfg.splashAlpha);
    splash.sprite.setVisible(true);
    splash.sprite.setActive(true);

    // 3. Secondary layered clotted crimson splash lobe for thicker 3D volume
    if (!isLowGore || isCrit || sizeScale >= 1.2) {
      const overlay = this.acquireGoreParticle(maxLiveDroplets);
      this.goreParticleSeq += 1;
      const offsetDist = 9 * sizeScale;

      overlay.kind = 'splash';
      overlay.active = true;
      overlay.seq = this.goreParticleSeq;
      overlay.vx = dirX * (58 * Math.min(1.9, sizeScale));
      overlay.vy = dirY * (58 * Math.min(1.9, sizeScale));
      overlay.gravity = 0;
      overlay.life = 0;
      overlay.maxLife = Math.round(hCfg.splashDurationMs * 1.12);
      overlay.baseAlpha = hCfg.secondarySplashAlpha;
      overlay.startScaleX = startScale * 0.85;
      overlay.startScaleY = startScale * 0.85;
      overlay.endScale = endScale * 0.88;
      overlay.rotSpeed = 0;

      overlay.sprite.setTexture('gore_hit_splash');
      overlay.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      overlay.sprite.setDepth(GORE.dropletDepth);
      overlay.sprite.setPosition(x + dirX * offsetDist, y + dirY * offsetDist);
      overlay.sprite.setRotation(baseAngle + Phaser.Math.FloatBetween(0.7, 1.5));
      overlay.sprite.setScale(startScale * 0.85);
      overlay.sprite.setTint(
        isSpitter ? hCfg.secondarySpitterSplashTint : hCfg.secondarySplashTint
      );
      overlay.sprite.setAlpha(hCfg.secondarySplashAlpha);
      overlay.sprite.setVisible(true);
      overlay.sprite.setActive(true);
    }

    // 4. Spray heavier, size-scaled directional crimson droplets outward from hit
    const rawDropCount = isCrit
      ? Phaser.Math.Between(hCfg.critDropletMin, hCfg.critDropletMax)
      : Phaser.Math.Between(hCfg.dropletMin, hCfg.dropletMax);
    const sizeScaledCount = Math.min(
      hCfg.maxDropletsPerHit,
      Math.round(rawDropCount * (0.72 + 0.36 * sizeScale))
    );
    const dropCount = isLowGore
      ? Math.max(2, Math.round(sizeScaledCount * GORE.lowSettingMultiplier))
      : sizeScaledCount;
    const colors = isSpitter ? hCfg.spitterColors : hCfg.colors;
    const dropletScaleFactor = hCfg.dropletThicknessMult * (0.76 + 0.3 * sizeScale);
    const speedScale = 0.84 + 0.18 * sizeScale;

    for (let i = 0; i < dropCount; i++) {
      const p = this.acquireGoreParticle(maxLiveDroplets);
      this.goreParticleSeq += 1;

      const angle = hasDir
        ? baseAngle + Phaser.Math.FloatBetween(-hCfg.coneSpreadRad, hCfg.coneSpreadRad)
        : Math.random() * Math.PI * 2;
      const speed =
        Phaser.Math.FloatBetween(
          hCfg.speedMin,
          isCrit ? hCfg.speedMax * 1.24 : hCfg.speedMax
        ) * speedScale;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      p.kind = 'droplet';
      p.active = true;
      p.seq = this.goreParticleSeq;
      p.vx = vx;
      p.vy = vy;
      p.gravity = hCfg.gravity;
      p.life = 0;
      p.maxLife = Phaser.Math.Between(hCfg.lifeMinMs, hCfg.lifeMaxMs);
      p.baseAlpha = 0.98;
      p.startScaleX = Phaser.Math.FloatBetween(0.46, 0.76) * dropletScaleFactor;
      p.startScaleY = Phaser.Math.FloatBetween(0.36, 0.58) * dropletScaleFactor;
      p.endScale = GORE.bloodBurst.minEndScaleFactor * (0.85 + 0.15 * sizeScale);
      p.rotSpeed = 0;

      const stretchX = p.startScaleX + speed * GORE.bloodBurst.stretchVelocityFactor;
      p.sprite.setTexture('gore_droplet');
      p.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      p.sprite.setDepth(GORE.dropletDepth);
      p.sprite.setPosition(x, y);
      p.sprite.setRotation(Math.atan2(vy, vx));
      p.sprite.setScale(stretchX, p.startScaleY);
      p.sprite.setTint(colors[(Math.random() * colors.length) | 0]);
      p.sprite.setAlpha(p.baseAlpha);
      p.sprite.setVisible(true);
      p.sprite.setActive(true);
    }
  }

  private updateGore(delta: number) {
    const dt = delta * 0.001;

    // 1. Update pooled gore particles (blood droplets, splash bursts, stone chips, mist puffs, wisp mist)
    for (let i = 0; i < this.goreParticlePool.length; i++) {
      const p = this.goreParticlePool[i];
      if (!p.active) continue;

      p.life += delta;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.setVisible(false);
        p.sprite.setActive(false);
        continue;
      }

      const progress = p.life / p.maxLife;
      if (p.kind === 'splash') {
        p.sprite.x += p.vx * dt;
        p.sprite.y += p.vy * dt;
        const easeOut = 1 - (1 - progress) * (1 - progress);
        const sc = p.startScaleX + (p.endScale - p.startScaleX) * easeOut;
        p.sprite.setScale(sc);
        p.sprite.setAlpha(p.baseAlpha * (1 - progress * progress));
      } else if (p.kind === 'droplet') {
        p.vy += p.gravity * dt;
        p.sprite.x += p.vx * dt;
        p.sprite.y += p.vy * dt;

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        p.sprite.rotation = Math.atan2(p.vy, p.vx);

        let shrinkMult = 1;
        if (progress > GORE.bloodBurst.shrinkStartRatio) {
          const shrinkT =
            (progress - GORE.bloodBurst.shrinkStartRatio) /
            (1 - GORE.bloodBurst.shrinkStartRatio);
          shrinkMult = 1 - shrinkT * (1 - GORE.bloodBurst.minEndScaleFactor);
        }
        const stretchX = (p.startScaleX + speed * GORE.bloodBurst.stretchVelocityFactor) * shrinkMult;
        p.sprite.setScale(stretchX, p.startScaleY * shrinkMult);

        const fadeMult = progress > 0.45 ? 1 - (progress - 0.45) / 0.55 : 1;
        p.sprite.setAlpha(p.baseAlpha * fadeMult);
      } else if (p.kind === 'chip') {
        p.vy += p.gravity * dt;
        p.sprite.x += p.vx * dt;
        p.sprite.y += p.vy * dt;
        p.sprite.rotation += p.rotSpeed * dt;
        const shrinkMult = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1;
        p.sprite.setScale(p.startScaleX * shrinkMult);
        p.sprite.setAlpha(p.baseAlpha * (1 - progress * progress));
      } else {
        // 'mist' or 'wisp_mist'
        const damp = Math.pow(0.94, delta / 16.6667);
        p.vx *= damp;
        if (p.kind === 'wisp_mist') {
          p.vy += p.gravity * dt;
        } else {
          p.vy *= damp;
        }
        p.sprite.x += p.vx * dt;
        p.sprite.y += p.vy * dt;
        p.sprite.rotation += p.rotSpeed * dt;
        const sc = p.startScaleX + (p.endScale - p.startScaleX) * progress;
        p.sprite.setScale(sc);
        p.sprite.setAlpha(p.baseAlpha * (1 - progress));
      }
    }

    // 2. Update pooled floor stain decals (fade out over 8 seconds)
    for (let i = 0; i < this.goreDecalPool.length; i++) {
      const d = this.goreDecalPool[i];
      if (!d.active) continue;

      d.life += delta;
      if (d.life >= d.maxLife) {
        d.active = false;
        d.sprite.setVisible(false);
        d.sprite.setActive(false);
        continue;
      }

      const progress = d.life / d.maxLife;
      d.sprite.setAlpha(d.baseAlpha * (1 - progress));
    }

    // 3. Update brief boss death darkening vignette
    if (this.bossVignetteTimerMs > 0 && this.bossVignetteSprite) {
      this.bossVignetteTimerMs -= delta;
      if (this.bossVignetteTimerMs <= 0) {
        this.bossVignetteTimerMs = 0;
        this.bossVignetteSprite.setAlpha(0);
        this.bossVignetteSprite.setVisible(false);
      } else {
        const t = this.bossVignetteTimerMs / GORE.variants.boss.vignetteDurationMs;
        this.bossVignetteSprite.setAlpha(GORE.variants.boss.vignetteAlpha * t);
      }
    }
  }

  // -------------------------------------------------------------
  // Skill & Impact Effect Pool (Capped at 40 active effects, ADD blend mode)
  // -------------------------------------------------------------
  private initEffectPool() {
    this.effectPool = [];
    for (let i = 0; i < this.MAX_ACTIVE_EFFECTS; i++) {
      const sprite = this.add.sprite(0, 0, 'fx_spark_sheet');
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setDepth(26);
      sprite.setVisible(false);
      sprite.setActive(false);
      sprite.disableInteractive();
      this.effectPool.push({
        sprite,
        inUse: false,
        spawnTime: 0,
      });
    }
  }

  private getPooledEffect(): EffectPoolItem | null {
    // 1. Look for an unused sprite
    for (let i = 0; i < this.effectPool.length; i++) {
      if (!this.effectPool[i].inUse) {
        return this.effectPool[i];
      }
    }

    // 2. All 40 are in use: recycle oldest effect to strictly enforce 40 cap
    let oldest = this.effectPool[0];
    for (let i = 1; i < this.effectPool.length; i++) {
      if (this.effectPool[i].spawnTime < oldest.spawnTime) {
        oldest = this.effectPool[i];
      }
    }

    if (oldest) {
      this.releasePooledEffect(oldest);
      return oldest;
    }

    return null;
  }

  private releasePooledEffect(item: EffectPoolItem) {
    if (item.timerEvent) {
      item.timerEvent.destroy();
      item.timerEvent = undefined;
    }
    if (!item.sprite || !item.sprite.scene) {
      item.inUse = false;
      return;
    }
    item.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE);
    item.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    item.sprite.anims.stop();
    item.sprite.setVisible(false);
    item.sprite.setActive(false);
    item.sprite.setAlpha(1);
    item.sprite.clearTint();
    item.inUse = false;
  }

  // fx_spark_sheet: on every enemy hit (or tinted cast/impact), random rotation, scale 0.5-1
  public spawnSparkHitEffect(x: number, y: number, tint?: number, scaleOverride?: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    const rot = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const sc = scaleOverride ?? Phaser.Math.FloatBetween(0.5, 1.0);

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(rot);
    item.sprite.setScale(sc);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(26);
    if (tint !== undefined) {
      item.sprite.setTint(tint);
    } else {
      item.sprite.clearTint();
    }
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_spark_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_death_sheet tinted magenta for cultist/spitter orb impact
  private spawnOrbImpactDeathEffect(x: number, y: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    item.sprite.setScale(0.45);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(27);
    item.sprite.setTint(0xff44ee);
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_death_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_death_sheet: on enemy death, tinted with accent color, scaled to ~2x enemy size
  public spawnDeathEffect(x: number, y: number, enemyType: string, enemyScale: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    let accentColor = 0x38bdf8;
    switch (enemyType) {
      case 'wisp':
        accentColor = 0x38bdf8;
        break;
      case 'imp':
        accentColor = 0xe879f9;
        break;
      case 'spitter':
        accentColor = 0xa855f7;
        break;
      case 'brute':
        accentColor = 0xf97316;
        break;
      case 'boss':
        accentColor = 0xff1144;
        break;
      default:
        accentColor = 0x38bdf8;
        break;
    }

    const sc = (enemyScale || 0.45) * 2.0 * GORE.fxDeathExplosion.scaleMultiplier;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    item.sprite.setScale(sc);
    item.sprite.setAlpha(GORE.fxDeathExplosion.alpha);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(27);
    item.sprite.setTint(accentColor);
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_death_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_ring_sheet: on level up centered on player, with 0.3s slow-mo & screen flash
  public spawnLevelUpRingEffect(x: number, y: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(0);
    item.sprite.setScale(1.4);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(29);
    item.sprite.clearTint();
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_ring_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_slam_sheet: boss ground slam scaled to damage radius; area damage on frame 8
  public spawnBossGroundSlam(x: number, y: number, damageRadius: number = 260, slamDamage: number = 35) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    // Frame is 448 wide (half width 224). Scale to match damage radius
    const sc = (damageRadius * 2) / 448;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(0);
    item.sprite.setScale(sc);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(25);
    item.sprite.clearTint();
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    let areaDamageDone = false;
    item.sprite.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (this.isDead || !this.sys?.isActive() || !this.player?.active) return;
        const fIdx =
          typeof frame.textureFrame === 'number'
            ? frame.textureFrame
            : parseInt(String(frame.textureFrame), 10);
        // Area damage on frame index 8
        if ((fIdx === 8 || frame.index === 9) && !areaDamageDone) {
          areaDamageDone = true;
          this.cameraController.shakeFromBossProximity(
            x,
            y,
            this.player.x,
            this.player.y,
            0.016,
            280,
            750
          );
          soundManager.playBossSlam();

          const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
          if (dist <= damageRadius) {
            this.damagePlayer(slamDamage);
            const pAngle = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
            this.player.x += Math.cos(pAngle) * 35;
            this.player.y += Math.sin(pAngle) * 35;
          }
        }
      }
    );

    item.sprite.play('fx_slam_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_gem_sheet: when an XP gem is collected
  public spawnGemCollectEffect(x: number, y: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(0);
    item.sprite.setScale(0.9);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(26);
    item.sprite.clearTint();
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_gem_anim');
    item.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.releasePooledEffect(item);
    });
  }

  // fx_lightning_sheet: chain lightning between enemies, origin at center, stretched in X, visible 0.25s
  public spawnChainLightningEffect(sourceX: number, sourceY: number, targetX: number, targetY: number) {
    const item = this.getPooledEffect();
    if (!item) return;

    item.inUse = true;
    item.spawnTime = this.time.now;

    const midX = (sourceX + targetX) * 0.5;
    const midY = (sourceY + targetY) * 0.5;
    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, targetX, targetY);
    const dist = Phaser.Math.Distance.Between(sourceX, sourceY, targetX, targetY);

    // Stretched in X to distance (frame width is 384)
    const scaleX = dist / 384;
    const scaleY = 0.65;

    item.sprite.setPosition(midX, midY);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(angle);
    item.sprite.setScale(scaleX, scaleY);
    item.sprite.setBlendMode(Phaser.BlendModes.ADD);
    item.sprite.setDepth(28);
    item.sprite.clearTint();
    item.sprite.setActive(true);
    item.sprite.setVisible(true);

    item.sprite.play('fx_lightning_anim');

    // Visible for 0.25s per hit
    item.timerEvent = this.time.delayedCall(250, () => {
      if (!this.sys?.isActive()) return;
      this.releasePooledEffect(item);
    });
  }

  private triggerChainLightning(source: Phaser.Physics.Arcade.Sprite, chainDamage: number) {
    if (!source || !source.scene || !this.sys?.isActive() || !this.enemiesGroup) return;
    const lanternRadius = this.getPlayerLanternLightRadius();
    const lanternRadiusSq = lanternRadius * lanternRadius;
    const maxChainDist = Math.min(260, lanternRadius);
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let target: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDistSq = maxChainDist * maxChainDist;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || !e.active || !e.scene || e === source) continue;
      const edata = e.getData('data') as EnemyData | undefined;
      if (!edata || edata.hp <= 0) continue;

      // Chain lightning cannot strike enemies outside the lantern's light radius
      const pdx = e.x - this.player.x;
      const pdy = e.y - this.player.y;
      if (pdx * pdx + pdy * pdy > lanternRadiusSq) continue;

      const dx = e.x - source.x;
      const dy = e.y - source.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        target = e;
      }
    }

    if (target && target.active && target.scene) {
      this.spawnChainLightningEffect(source.x, source.y, target.x, target.y);
      soundManager.playLightning();
      this.damageEnemy(target, chainDamage, false, 0, 0, false);
    }
  }

  // -------------------------------------------------------------
  // Player Animation & Attack Blending
  // -------------------------------------------------------------
  private startPlayerBobbing(moving: boolean) {
    if (this.playerBobTween) {
      this.playerBobTween.stop();
      this.playerBobTween = null;
    }

    if (moving) {
      // While moving, play 12-frame 'walk' animation at 9 fps
      this.player.setScale(this.PLAYER_SCALE);
      this.player.rotation = 0;
      if (!this.isAttacking) {
        this.player.play('walk', true);
      }
    } else {
      // When stationary, stop walk and play gentle breathing tween on frame 0
      if (!this.isAttacking) {
        this.player.anims.stop();
        this.player.setTexture('player_walk', 0);
      }
      this.player.rotation = 0;
      this.player.setScale(this.PLAYER_SCALE);

      this.playerBobTween = this.tweens.add({
        targets: this.player,
        scaleY: this.PLAYER_SCALE * 1.04,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private triggerPlayerAttack() {
    if (this.isDead || this.isInvulnerable) return;

    if (this.playerBobTween) {
      this.playerBobTween.stop();
      this.playerBobTween = null;
      this.player.setScale(this.PLAYER_SCALE);
    }

    this.muzzleFiredThisAttack = false;
    this.isAttacking = true;
    this.player.play('attack', true);
    soundManager.playPlayerAttack();
  }

  private triggerAttackMuzzleEffect() {
    if (this.muzzleFiredThisAttack || this.isDead || !this.sys?.isActive() || !this.player?.active) return;
    this.muzzleFiredThisAttack = true;

    // Muzzle flash particle effect at the lantern / hand position
    const offsetX = this.player.flipX ? -28 : 28;
    const mx = this.player.x + offsetX;
    const my = this.player.y - 6;

    // Expanding radiant cyan ring with ADD blend mode
    const flash = this.add.sprite(mx, my, 'fx_ring');
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(23);
    flash.setScale(0.12);
    flash.setTint(0x7df9ff);
    this.tweens.add({
      targets: flash,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 160,
      onComplete: () => {
        if (flash.scene) flash.destroy();
      },
    });

    // Particle burst of sparks
    this.spawnParticleBurst(mx, my, 8, 'fx_spark', 90, 220, 0.2, 0.4, 0x66ffff);
  }

  // -------------------------------------------------------------
  // Main Update Loop
  // -------------------------------------------------------------
  update(time: number, rawDelta: number) {
    if (
      this.isDead ||
      this.isGamePaused ||
      this.isWaitingForLoading ||
      !this.sys?.isActive() ||
      !this.player?.active
    )
      return;

    try {
      // 90Hz/120Hz Dynamic Resolution Scaling & Quality Tier adaptation
      const perfAction = performanceRuntime.sampleFrame(time, rawDelta, this.maxWebGlTexSize);
      if (perfAction.nextQualityTier && perfAction.nextQualityTier !== gameManager.getQualityTier()) {
        gameManager.setQualityTier(perfAction.nextQualityTier);
      }

      // Exact real-time delta in ms (clamped at 50ms) so 60/90/120 FPS run identically
      const delta = performanceRuntime.smoothFrameDelta(rawDelta);

    // Delta-time camera follow lerp (equivalent to 0.15 per 60Hz frame, sub-pixel)
    this.cameraController.updateFollowLerp(delta, 0.15);

    // Hitstop handling (freezes physics & AI briefly while keeping camera shake active)
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - delta);
      this.cameraController.update(delta, this.player.x, this.player.y, this.activeBoss);
      if (this.hitstopTimer <= 0 && this.isHitstopPausedPhysics) {
        this.isHitstopPausedPhysics = false;
        this.physics.resume();
      }
      return;
    } else if (this.isHitstopPausedPhysics) {
      this.isHitstopPausedPhysics = false;
      this.physics.resume();
    }

    this.simTimeMs += delta;
    this.runTime += delta / 1000;
    const wholeSec = Math.floor(this.runTime);
    if (wholeSec > this.lastMissionSecondRecorded) {
      this.lastMissionSecondRecorded = wholeSec;
      dailyMissions.recordMax('survive_seconds', wholeSec);
      achievements.recordMax('longestRunSec', wholeSec);
    }

    if (BALANCE.player.hpRegenPerSec > 0 && this.playerStats.currentHp < this.playerStats.maxHp) {
      this.playerStats.currentHp = Math.min(
        this.playerStats.maxHp,
        this.playerStats.currentHp + BALANCE.player.hpRegenPerSec * (delta / 1000)
      );
    }

    // 0.4s invulnerability timer
    if (this.isInvulnerable) {
      this.invulnTimerMs -= delta;
      if (this.invulnTimerMs <= 0) {
        this.isInvulnerable = false;
        this.invulnTimerMs = 0;
        if (this.player.active) {
          this.player.clearTint();
          this.player.setAlpha(1);
        }
      }
    }

    // Dash input & charge recharge
    if (
      this.wasdKeys &&
      (Phaser.Input.Keyboard.JustDown(this.wasdKeys.SPACE) ||
        Phaser.Input.Keyboard.JustDown(this.wasdKeys.SHIFT))
    ) {
      this.triggerDash();
    }
    if (this.dashChargesRemaining < this.playerStats.dashCharges) {
      this.dashRechargeTimerMs += delta;
      if (this.dashRechargeTimerMs >= this.playerStats.dashCooldownMs) {
        this.dashRechargeTimerMs -= this.playerStats.dashCooldownMs;
        this.dashChargesRemaining = Math.min(
          this.playerStats.dashCharges,
          this.dashChargesRemaining + 1
        );
        if (this.dashChargesRemaining >= this.playerStats.dashCharges) {
          this.dashRechargeTimerMs = 0;
        }
      }
    }

    // Pending event 2s warning countdown
    if (this.pendingEvent) {
      this.pendingEvent.countdownMs -= delta;
      if (this.pendingEvent.countdownMs <= 0) {
        const exec = this.pendingEvent.onExecute;
        this.pendingEvent = null;
        gameManager.emitEventWarning(null);
        exec();
      }
    }

    // Decay screen-edge red flash
    if (this.screenEdgeFlashAlpha > 0) {
      this.screenEdgeFlashAlpha = Math.max(0, this.screenEdgeFlashAlpha - (delta / 1000) * 1.4);
    }

    // Light progression timers (Light Shard +35% buff & Darkness Falls -25% event)
    if (this.lightShardTimerMs > 0) {
      this.lightShardTimerMs = Math.max(0, this.lightShardTimerMs - delta);
    }
    if (this.darknessFallsTimerMs > 0) {
      this.darknessFallsTimerMs = Math.max(0, this.darknessFallsTimerMs - delta);
    }

    // Horde Frenzy Blood Fog active duration & banner auto-dismiss
    if (this.bloodFogTimerMs > 0) {
      this.bloodFogTimerMs = Math.max(0, this.bloodFogTimerMs - delta);
      if (this.bloodFogTimerMs <= 0) {
        this.showFloatingCallout(this.player.x, this.player.y - 48, 'BLOOD FOG CLEARS', '#d8c9a8');
      }
    }

    if (this.bloodFogBannerTimerMs > 0) {
      this.bloodFogBannerTimerMs = Math.max(0, this.bloodFogBannerTimerMs - delta);
      if (this.bloodFogBannerTimerMs <= 0 && !this.pendingEvent) {
        gameManager.emitEventWarning(null);
      }
    }

    // Red Shard temporary damage surge timer
    if (this.redShardTimerMs > 0) {
      this.redShardTimerMs = Math.max(0, this.redShardTimerMs - delta);
      if (this.redShardTimerMs <= 0 && this.isRedShardBuffActive) {
        this.isRedShardBuffActive = false;
        this.playerStats.damageMultiplier = Math.max(0.5, this.playerStats.damageMultiplier - 0.15);
      }
    }

    // Dynamic Challenge progression & expiry
    if (this.activeChallenge) {
      if (this.activeChallenge.status === 'active') {
        this.activeChallenge.elapsedSec += delta / 1000;
        if (
          this.activeChallenge.id === 'no_coin_greed' ||
          this.activeChallenge.id === 'untouchable' ||
          this.activeChallenge.id === 'light_purist'
        ) {
          this.activeChallenge.progress = Math.floor(this.activeChallenge.elapsedSec);
          this.activeChallenge.statusNote = formatChallengeProgressText(this.activeChallenge);
          if (this.activeChallenge.elapsedSec >= this.activeChallenge.targetValue) {
            this.completeDynamicChallenge();
          }
        } else if (
          this.activeChallenge.id === 'cull_the_horde' ||
          this.activeChallenge.id === 'stand_firm'
        ) {
          this.activeChallenge.statusNote = formatChallengeProgressText(this.activeChallenge);
          const limit = this.activeChallenge.timeLimitSec ?? 60;
          if (this.activeChallenge.elapsedSec >= limit) {
            this.failDynamicChallenge('Time expired');
          }
        } else {
          this.activeChallenge.statusNote = formatChallengeProgressText(this.activeChallenge);
        }
      } else {
        this.challengeBannerTimerMs -= delta;
        if (this.challengeBannerTimerMs <= 0) {
          this.activeChallenge = null;
        }
      }
    }

    // Combo decay if player stops killing for 3s
    if (this.comboKills > 0) {
      this.comboTimerMs -= delta;
      if (this.comboTimerMs <= 0) {
        if (this.comboMultiplier > 1) {
          this.comboMultiplier--;
          this.comboKills = SPAWN_TIMELINE.combo.killThresholds[this.comboMultiplier - 1];
          this.comboTimerMs = SPAWN_TIMELINE.combo.decayMs;
        } else {
          this.comboKills = 0;
          this.comboMultiplier = 1;
        }
      }
    }

    // Crossfade to intense music at 5:00 if boss is not active
    if (
      this.runTime >= SPAWN_TIMELINE.feel.intenseMusicTimeSec &&
      !this.hasCrossfadedToIntense &&
      !this.activeBoss
    ) {
      this.hasCrossfadedToIntense = true;
      soundManager.playIntense();
    }

    // 1. Update Floor TileSprite to follow logical camera scroll
    const cam = this.cameras.main;
    const lScrollX = getLogicalScrollX(cam);
    const lScrollY = getLogicalScrollY(cam);
    this.floor.tilePositionX = lScrollX;
    this.floor.tilePositionY = lScrollY;

    // 2. Handle Player Movement (WASD + Arrows + Virtual Joystick)
    this.updatePlayerMovement(delta);

    // 3. Update Lantern Light Overlay (includes pressure, low-HP heartbeat, and event edge flash)
    this.updateLanternOverlay(delta, lScrollX, lScrollY);

    // 4. Weapons Update & Auto-Fire (millisecond simulation clock)
    this.updateWeapons(this.simTimeMs);

    // 5. Update Orbiting Blades
    this.updateOrbitingBlades(delta);

    // 6. Update Telegraphs (0.5s ground red lines/circles)
    this.updateTelegraphs(delta);

    // 7. Update Projectiles
    this.updateProjectiles(delta);

    // 8. Update Enemies & AI
    this.updateEnemies(time, delta);

    // 8b. Update World Torches/Pillars & Cast Real-Time Dynamic Shadows on Terrain & Enemies
    if (this.shadowSystem) {
      const isLowQuality = gameManager.getQualityTier() === 'low';
      this.shadowSystem.updateWorldProps(
        lScrollX,
        lScrollY,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        time * 0.001,
        delta,
        isLowQuality,
        (ex, ey) => {
          this.spawnParticleBurst(ex, ey, 1, 'fx_spark', 14, 38, 0.1, 0.2, 0xff9b3d, 340);
        }
      );

      const playerLightRadius = this.getPlayerLanternLightRadius();
      this.shadowSystem.renderDynamicShadows({
        player: this.player,
        playerLightRadius,
        enemies: this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[],
        boss: this.activeBoss,
        camX: lScrollX,
        camY: lScrollY,
        viewW: LOGICAL_WIDTH,
        viewH: LOGICAL_HEIGHT,
        isLowQuality,
      });
    }

    // 9. Update Pickups Magnet & 12s Gem Expiry
    this.updatePickups(delta);

    // 10. Update Particles & Enemy Death Gore/Decals
    this.updateParticles(delta);
    this.updateGore(delta);

    // 11. Update Floating Combat Text Pool
    this.updateFloatingTexts(delta);

    // 12. Update Dynamic Weather & Time-of-Day Overlay
    this.atmosphereOverlay?.update(
      delta,
      this.runTime,
      Boolean(this.activeBoss && this.activeBoss.active),
      this.darknessFallsTimerMs > 0
    );

    // 13. Update Camera Controller (shake decay & boss proximity tremor)
    this.cameraController.update(delta, this.player.x, this.player.y, this.activeBoss);

    // 13. Enemy Spawning & Timeline Events (millisecond simulation clock)
    this.handleEnemySpawning(this.simTimeMs);

      // 14. Periodic Stats Sync with UI (~115ms)
      if (time - this.lastStatsEmitMs >= 115) {
        this.lastStatsEmitMs = time;
        this.emitStatsUpdate();
      }
    } catch (err) {
      console.error('[MainScene] update error:', err);
    }
  }

  // -------------------------------------------------------------
  // Player Movement & Facing Direction
  // -------------------------------------------------------------
  private drawStanceRing() {
    this.stanceRing.clear();
    // Outer soft aura ellipse
    this.stanceRing.lineStyle(6, 0x22d3ee, 0.22);
    this.stanceRing.strokeEllipse(0, 0, 88, 36);
    // Crisp inner cyan ring
    this.stanceRing.lineStyle(2, 0x67e8f9, 0.75);
    this.stanceRing.strokeEllipse(0, 0, 78, 30);
    // Faint inner fill
    this.stanceRing.fillStyle(0x22d3ee, 0.08);
    this.stanceRing.fillEllipse(0, 0, 78, 30);
  }

  public triggerDash() {
    if (this.isDead || this.isGamePaused) return;
    if (this.dashChargesRemaining <= 0 || this.dashActiveTimerMs > 0) return;

    let dx = 0;
    let dy = 0;
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left?.isDown || this.wasdKeys.A.isDown) dx -= 1;
      if (this.cursors.right?.isDown || this.wasdKeys.D.isDown) dx += 1;
      if (this.cursors.up?.isDown || this.wasdKeys.W.isDown) dy -= 1;
      if (this.cursors.down?.isDown || this.wasdKeys.S.isDown) dy += 1;
    }
    if (gameManager.joystickVector.x !== 0 || gameManager.joystickVector.y !== 0) {
      dx += gameManager.joystickVector.x;
      dy += gameManager.joystickVector.y;
    }

    const len = Math.hypot(dx, dy);
    if (len > 0.05) {
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;
    } else {
      this.dashDirX = this.player?.flipX ? -1 : 1;
      this.dashDirY = 0;
    }

    this.dashChargesRemaining = Math.max(0, this.dashChargesRemaining - 1);
    this.dashActiveTimerMs = 175;
    this.dashTrailAccumMs = 0;
    this.isInvulnerable = true;
    this.invulnTimerMs = Math.max(this.invulnTimerMs, 210);
    this.standStillTimerMs = 0;
    this.isStandingReady = false;
    this.isAttacking = false;
    this.muzzleFiredThisAttack = false;

    this.player.setTint(0x5de4ff);
    const ringFx = this.getPooledEffect();
    if (ringFx) {
      ringFx.inUse = true;
      ringFx.spawnTime = this.time.now;
      ringFx.sprite.setPosition(this.player.x, this.player.y);
      ringFx.sprite.setOrigin(0.5, 0.5);
      ringFx.sprite.setRotation(0);
      ringFx.sprite.setScale(0.75);
      ringFx.sprite.setBlendMode(Phaser.BlendModes.ADD);
      ringFx.sprite.setDepth(26);
      ringFx.sprite.setTint(0x5de4ff);
      ringFx.sprite.setActive(true);
      ringFx.sprite.setVisible(true);
      ringFx.sprite.play('fx_ring_anim');
      ringFx.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.releasePooledEffect(ringFx);
      });
    }
    this.spawnParticleBurst(this.player.x, this.player.y, 12, 'fx_spark', 90, 220, 0.2, 0.45, 0x5de4ff);
    soundManager.playBladeSlash();
    haptics.tap('medium');
    this.emitStatsUpdate();
  }

  private updatePlayerMovement(delta: number) {
    if (this.dashActiveTimerMs > 0) {
      this.dashActiveTimerMs = Math.max(0, this.dashActiveTimerMs - delta);
      const dashSpeed = 580;
      const vx = this.dashDirX * dashSpeed;
      const vy = this.dashDirY * dashSpeed;
      this.player.setVelocity(vx, vy);
      if (this.dashDirX < -0.1) {
        this.player.setFlipX(true);
      } else if (this.dashDirX > 0.1) {
        this.player.setFlipX(false);
      }

      this.dashTrailAccumMs += delta;
      if (this.dashTrailAccumMs >= 32) {
        this.dashTrailAccumMs = 0;
        this.spawnParticleBurst(this.player.x, this.player.y + 8, 3, 'fx_spark', 20, 70, 0.12, 0.25, 0x5de4ff);
      }

      if (this.stanceRing) {
        this.stanceRing.setPosition(this.player.x, this.player.y + 36);
        this.stanceRing.setAlpha(0.16);
      }
      this.shadowSystem?.resolvePillarPushout(this.player, 18);
      return;
    }

    let vx = 0;
    let vy = 0;

    // Keyboard controls
    if (this.cursors && this.wasdKeys) {
      if (this.cursors.left?.isDown || this.wasdKeys.A.isDown) vx -= 1;
      if (this.cursors.right?.isDown || this.wasdKeys.D.isDown) vx += 1;
      if (this.cursors.up?.isDown || this.wasdKeys.W.isDown) vy -= 1;
      if (this.cursors.down?.isDown || this.wasdKeys.S.isDown) vy += 1;
    }

    // Touch / Virtual Joystick input
    if (gameManager.joystickVector.x !== 0 || gameManager.joystickVector.y !== 0) {
      vx += gameManager.joystickVector.x;
      vy += gameManager.joystickVector.y;
    }

    // Normalize diagonal movement
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len > 0) {
      vx = (vx / len) * this.playerStats.moveSpeed;
      vy = (vy / len) * this.playerStats.moveSpeed;
    }

    this.player.setVelocity(vx, vy);

    const movingNow = len > 0.05;
    if (movingNow) {
      this.standStillTimerMs = 0;
      this.isStandingReady = false;
      this.isUnderPressure = false;
      // While moving, player plays "walk" (interrupt attack animation if moving)
      if (this.isAttacking) {
        this.isAttacking = false;
        this.muzzleFiredThisAttack = false;
      }
    } else {
      this.standStillTimerMs += delta;
      this.isStandingReady = this.standStillTimerMs >= STAND_STILL_DELAY_MS;
      this.isUnderPressure = this.standStillTimerMs > SPAWN_TIMELINE.pressure.standStillThresholdMs;
    }

    if (movingNow !== this.isMoving) {
      this.isMoving = movingNow;
      this.startPlayerBobbing(this.isMoving);
    } else if (this.isMoving && (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'walk')) {
      this.player.play('walk', true);
    }

    // Update subtle glowing stance ring under the player
    if (this.stanceRing) {
      this.stanceRing.setPosition(this.player.x, this.player.y + 36);
      const pulse = 0.9 + 0.1 * Math.sin(this.time.now * 0.006);
      const targetAlpha = this.isStandingReady ? 0.78 * pulse : 0.14;
      const ringStep = 1 - Math.pow(0.75, delta / 16.6667);
      this.stanceRingAlpha = Phaser.Math.Linear(this.stanceRingAlpha, targetAlpha, ringStep);
      this.stanceRing.setAlpha(this.stanceRingAlpha);
      const targetScale = this.isStandingReady ? 1.0 : 0.92;
      this.stanceRing.setScale(targetScale);
    }

    // Flip sprite toward movement direction
    if (vx < -5) {
      this.player.setFlipX(true);
    } else if (vx > 5) {
      this.player.setFlipX(false);
    }

    // Smoothly slide player around solid ruined pillars
    this.shadowSystem?.resolvePillarPushout(this.player, 18);
  }

  // -------------------------------------------------------------
  // Lantern Glow Overlay, Low-HP Heartbeat, Pressure Aura & Edge Flash
  // -------------------------------------------------------------
  private updateLanternOverlay(delta: number, lScrollX: number, lScrollY: number) {
    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;
    const zeroOffset = getScrollZeroOffset(this.cameras.main);

    // Screen-space position of player adjusted for zoomed scrollFactor(0) projection
    const px = this.player.x - lScrollX + zeroOffset.x;
    const py = this.player.y - lScrollY + zeroOffset.y;

    const pulse = this.lanternPulse.alpha; // 0.6 <-> 1.0
    const targetLightMult = this.getLightRadiusMultiplier();
    const targetStandFactor = this.isStandingReady ? 1 + LIGHT.player.standingBonusRatio : 1.0;

    if (targetLightMult > this.prevTargetLightMult + 0.01) {
      this.lanternSurgeBoost = Math.min(0.45, this.lanternSurgeBoost + 0.36);
    }
    this.prevTargetLightMult = targetLightMult;

    const multStep = 1 - Math.exp(-delta / 185);
    const standStep = 1 - Math.exp(-delta / 115);
    this.visualLightMult = Phaser.Math.Linear(this.visualLightMult, targetLightMult, multStep);
    this.visualStandFactor = Phaser.Math.Linear(
      this.visualStandFactor,
      targetStandFactor,
      standStep
    );
    this.lanternSurgeBoost = Math.max(0, this.lanternSurgeBoost - (delta / 760) * 0.45);

    // Soft cyan lantern glow rendered via a single GPU quad with smooth expansion bloom
    if (this.lanternGlowSprite) {
      const standScaleRatio = this.visualStandFactor / (1 + LIGHT.player.standingBonusRatio);
      const surgeScale = 1 + this.lanternSurgeBoost * 0.14;
      this.lanternGlowSprite.setPosition(px, py);
      this.lanternGlowSprite.setScale(
        2.1875 * this.visualLightMult * standScaleRatio * surgeScale
      );
      this.lanternGlowSprite.setAlpha(Math.min(1, pulse + this.lanternSurgeBoost * 0.45));
    }

    // "Pressure" aura when standing still >4s (delta-normalized)
    const targetPressureAlpha = this.isUnderPressure ? 1 : 0;
    const pressureStep = 1 - Math.pow(0.92, delta / 16.6667);
    this.pressureAuraAlpha = Phaser.Math.Linear(this.pressureAuraAlpha, targetPressureAlpha, pressureStep);

    // Low-HP (<40%) slowly reddening vignette with heartbeat-like double pulse
    const hpRatio = this.playerStats.currentHp / Math.max(1, this.playerStats.maxHp);
    const targetLowHp =
      hpRatio < SPAWN_TIMELINE.feel.lowHpThreshold
        ? (SPAWN_TIMELINE.feel.lowHpThreshold - hpRatio) / SPAWN_TIMELINE.feel.lowHpThreshold
        : 0;
    const lowHpStep = 1 - Math.pow(0.97, delta / 16.6667);
    this.lowHpVignetteAlpha = Phaser.Math.Linear(this.lowHpVignetteAlpha, targetLowHp, lowHpStep);

    const hasEdge =
      this.pressureAuraAlpha > 0.02 ||
      this.lowHpVignetteAlpha > 0.01 ||
      this.screenEdgeFlashAlpha > 0.01;

    if (!hasEdge) {
      if (this.hadEdgeVignette) {
        this.hadEdgeVignette = false;
        this.lightVignette.clear();
      }
      return;
    }

    this.hadEdgeVignette = true;
    this.lightVignette.setPosition(zeroOffset.x, zeroOffset.y);
    this.lightVignette.clear();

    if (this.pressureAuraAlpha > 0.02) {
      const wave = 0.65 + 0.35 * Math.sin(this.time.now * 0.008);
      const pAlpha = this.pressureAuraAlpha * 0.32 * wave;
      this.lightVignette.lineStyle(22, 0xc44cff, pAlpha * 0.6);
      this.lightVignette.strokeRect(0, 0, w, h);
      this.lightVignette.lineStyle(8, 0xe5484d, pAlpha);
      this.lightVignette.strokeRect(0, 0, w, h);
    }

    if (this.lowHpVignetteAlpha > 0.01) {
      const beatPhase = (this.time.now % SPAWN_TIMELINE.feel.heartbeatPeriodMs) / SPAWN_TIMELINE.feel.heartbeatPeriodMs;
      const lub = Math.exp(-Math.pow((beatPhase - 0.14) / 0.06, 2));
      const dub = 0.75 * Math.exp(-Math.pow((beatPhase - 0.32) / 0.06, 2));
      const heartbeat = 0.45 + 0.55 * Math.min(1, lub + dub);
      const edgeAlpha = this.lowHpVignetteAlpha * 0.45 * heartbeat;
      this.lightVignette.lineStyle(48, 0x991b1b, edgeAlpha * 0.45);
      this.lightVignette.strokeRect(0, 0, w, h);
      this.lightVignette.lineStyle(18, 0xe5484d, edgeAlpha * 0.8);
      this.lightVignette.strokeRect(0, 0, w, h);
    }

    if (this.screenEdgeFlashAlpha > 0.01) {
      this.lightVignette.lineStyle(28, 0xe5484d, this.screenEdgeFlashAlpha * 0.7);
      this.lightVignette.strokeRect(0, 0, w, h);
    }
  }

  // -------------------------------------------------------------
  // Weapons & Auto-Fire Logic (Attack only while standing still)
  // -------------------------------------------------------------
  private updateWeapons(time: number) {
    // Cooldown timers are timestamp-based so they keep advancing while moving;
    // weapons fire immediately once standing still for STAND_STILL_DELAY_MS.
    if (!this.isStandingReady) return;

    // 1. Light Bolt: Auto-fires at nearest enemy
    const bolt = this.weapons['bolt'];
    if (bolt && bolt.unlocked) {
      const effectiveCooldown = bolt.cooldown * this.playerStats.cooldownMultiplier;
      if (time - bolt.lastFired >= effectiveCooldown) {
        if (this.fireLightBolt()) {
          bolt.lastFired = time;
        }
      }
    }

    // 2. Radiant Nova: Periodic holy ring pulse within lantern light radius
    const ring = this.weapons['ring'];
    if (ring && ring.unlocked) {
      const effectiveCooldown = ring.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextRingPulse) {
        if (this.fireRadiantRing()) {
          this.nextRingPulse = time + effectiveCooldown;
        }
      }
    }

    // 3. Spark Burst: Periodic radial spark nova within lantern light radius
    const spark = this.weapons['spark'];
    if (spark && spark.unlocked) {
      const effectiveCooldown = spark.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextSparkBurst) {
        if (this.fireSparkBurst()) {
          this.nextSparkBurst = time + effectiveCooldown;
        }
      }
    }

    // 4. Radiant Scatter: Shotgun fires cyan bolts strictly up to lantern light radius
    const shotgun = this.weapons['shotgun'];
    if (shotgun && shotgun.unlocked) {
      const effectiveCooldown = shotgun.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextShotgunBlast) {
        if (this.fireShotgunCone()) {
          this.nextShotgunBlast = time + effectiveCooldown;
        }
      }
    }
  }

  // Weapon: Light Bolt
  private fireLightBolt(): boolean {
    const maxRange = this.getPlayerLanternLightRadius();
    const target = this.getNearestEnemy(maxRange);
    if (!target) return false;

    // Trigger attack animation
    this.triggerPlayerAttack();

    soundManager.playBoltShoot();

    const bolt = this.weapons['bolt'];
    const count =
      BALANCE.primaryWeapon.startingProjectiles +
      this.multishotLevel * BALANCE.multishot.extraProjectilesPerLevel;
    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const speed = BALANCE.primaryWeapon.projectileSpeed;
    const maxLife = Math.round((maxRange / speed) * 1000);

    // Spread angle widens as projectile count grows
    const stepAngle =
      BALANCE.primaryWeapon.baseSpreadRad +
      Math.max(0, count - 2) * BALANCE.primaryWeapon.spreadWidenPerExtraProj;

    // -6% damage per projectile per Multishot level so extra projectiles remain a tradeoff
    const multishotDmgFactor = Math.max(
      0.1,
      1 - this.multishotLevel * BALANCE.multishot.damagePenaltyPerLevel
    );

    for (let i = 0; i < count; i++) {
      const spread = count > 1 ? (i - (count - 1) / 2) * stepAngle : 0;
      const angle = baseAngle + spread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.acquirePlayerProjectile(this.player.x, this.player.y, 'fx_bolt');
      proj.setDepth(22);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.clearTint();
      proj.setScale(0.42);
      proj.setRotation(angle);

      // Hitbox
      const projBody = proj.body as Phaser.Physics.Arcade.Body;
      if (projBody) {
        projBody.setSize(proj.width * 0.5, proj.height * 0.5);
      }

      const isCrit = Math.random() < this.playerStats.critChance;
      let dmg = bolt.damage * multishotDmgFactor * this.playerStats.damageMultiplier;
      if (isCrit) dmg *= this.playerStats.critMultiplier;

      const pierce = this.playerStats.projectilePierce;

      const data: ProjectileData = {
        vx,
        vy,
        damage: Math.max(1, Math.round(dmg)),
        pierce,
        isCrit,
        isEnemy: false,
        life: 0,
        maxLife,
        originX: this.player.x,
        originY: this.player.y,
        maxRangeSq: maxRange * maxRange,
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }

    return true;
  }

  // Weapon: Radiant Scatter (Fires 3 cyan fx_bolt.png projectiles strictly within lantern light radius)
  private fireShotgunCone(): boolean {
    const shotgun = this.weapons['shotgun'];
    if (!shotgun || !shotgun.unlocked) return false;

    const maxRange = this.getPlayerLanternLightRadius();
    const target = this.getNearestEnemy(maxRange);
    if (!target) return false;

    this.triggerPlayerAttack();
    soundManager.playShoot();

    const baseAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    const speed = 480;
    const maxLife = Math.round((maxRange / speed) * 1000);
    const spreadOffsets = [-0.14, 0, 0.14];

    for (const offset of spreadOffsets) {
      const angle = baseAngle + offset;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.acquirePlayerProjectile(this.player.x, this.player.y, 'fx_bolt');
      proj.setDepth(22);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.setTint(0x22ffff);
      proj.setScale(0.4);
      proj.setRotation(angle);

      const projBody = proj.body as Phaser.Physics.Arcade.Body;
      if (projBody) {
        projBody.setSize(proj.width * 0.5, proj.height * 0.5);
      }

      const isCrit = Math.random() < this.playerStats.critChance;
      let dmg = shotgun.damage * this.playerStats.damageMultiplier;
      if (isCrit) dmg *= this.playerStats.critMultiplier;

      const data: ProjectileData = {
        vx,
        vy,
        damage: Math.round(dmg),
        pierce: 1 + this.playerStats.projectilePierce,
        isCrit,
        isEnemy: false,
        life: 0,
        maxLife,
        originX: this.player.x,
        originY: this.player.y,
        maxRangeSq: maxRange * maxRange,
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }

    return true;
  }

  // Weapon: Spectral Blades (Uses fx_blade_spin_sheet with full 360 rotation baked in)
  public syncSpectralBlades() {
    const blades = this.weapons['blades'];
    if (!blades || !blades.unlocked) return;

    const count = Math.min(4, blades.level);
    while (this.orbitingBlades.length < count) {
      const blade = this.add.sprite(this.player.x, this.player.y, 'fx_blade_spin_sheet');
      blade.setOrigin(0.5, 0.5);
      blade.setBlendMode(Phaser.BlendModes.ADD);
      blade.setDepth(23);
      blade.setScale(0.48);
      blade.play('fx_blade_spin_anim');
      this.orbitingBlades.push(blade);
    }
  }

  private updateOrbitingBlades(delta: number) {
    const blades = this.weapons['blades'];
    if (!blades || !blades.unlocked || this.orbitingBlades.length === 0) return;

    const canDealDamage = !ORBIT_BLADES_NEED_STANDING || this.isStandingReady;
    const count = this.orbitingBlades.length;
    const speed = (0.0035 + blades.level * 0.0008) * delta;
    this.bladeAngle += speed;

    const lanternRadius = this.getPlayerLanternLightRadius();
    const radius = Math.min(
      Math.max(40, lanternRadius - 14),
      Math.max(68, Math.round(lanternRadius * 0.36))
    );
    const hitRadiusSq = 45 * 45;
    const nearby = canDealDamage
      ? [...(this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])]
      : null;
    const now = this.time.now;
    const dmg = canDealDamage ? Math.round(blades.damage * this.playerStats.damageMultiplier) : 0;

    for (let i = 0; i < count; i++) {
      const angle = this.bladeAngle + (i * Math.PI * 2) / count;
      const bx = this.player.x + Math.cos(angle) * radius;
      const by = this.player.y + Math.sin(angle) * radius;

      const blade = this.orbitingBlades[i];
      if (!blade || !blade.scene) continue;
      // Orbit the sprite's POSITION around the player; keep sprite's baked spin animation fast & sharp
      blade.setPosition(bx, by);
      blade.setAlpha(canDealDamage ? 1.0 : 0.28);
      blade.anims.timeScale = canDealDamage ? 1.25 : 0.85;

      if (!nearby) continue;

      // Slicing check on nearby enemies using squared distance (only while standing still if ORBIT_BLADES_NEED_STANDING)
      for (let j = 0; j < nearby.length; j++) {
        const enemy = nearby[j];
        if (!enemy || !enemy.active || !enemy.scene) continue;
        const dx = enemy.x - bx;
        const dy = enemy.y - by;
        if (dx * dx + dy * dy < hitRadiusSq) {
          const lastHit = (enemy.getData('lastBladeHit') as number) || 0;
          if (now - lastHit > 280) {
            enemy.setData('lastBladeHit', now);
            this.damageEnemy(enemy, dmg, false, Math.cos(angle) * 120, Math.sin(angle) * 120);
            soundManager.playBladeSlash();
          }
        }
      }
    }
  }

  // Weapon: Radiant Ring (expands cleanly up to lantern light radius)
  private fireRadiantRing(): boolean {
    const ring = this.weapons['ring'];
    if (!ring || !ring.unlocked) return false;

    const maxRadius = this.getPlayerLanternLightRadius();
    if (!this.getNearestEnemy(maxRadius)) return false;

    this.triggerPlayerAttack();
    soundManager.playRingPulse();

    const ringSprite = this.add.sprite(this.player.x, this.player.y, 'fx_ring');
    ringSprite.setBlendMode(Phaser.BlendModes.ADD);
    ringSprite.setDepth(21);
    ringSprite.setScale(0.1);
    ringSprite.setAlpha(0.9);

    const maxScale = maxRadius / 140;
    const maxRadiusSq = maxRadius * maxRadius;

    this.tweens.add({
      targets: ringSprite,
      scaleX: maxScale,
      scaleY: maxScale,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (ringSprite.scene) ringSprite.destroy();
      },
    });

    // Damage all enemies in blast radius (snapshot children so mid-loop boss destroy cannot shrink array)
    const enemies = [...(this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
    const dmg = Math.round(ring.damage * this.playerStats.damageMultiplier);

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.active || !enemy.scene) continue;
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      if (dx * dx + dy * dy <= maxRadiusSq) {
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * 220;
        const ky = Math.sin(angle) * 220;
        this.damageEnemy(enemy, dmg, false, kx, ky);
      }
    }

    this.spawnParticleBurst(this.player.x, this.player.y, 14, 'fx_ring', 90, 200, 0.2, 0.4);
    return true;
  }

  // Weapon: Spark Burst (travels strictly up to lantern light radius)
  private fireSparkBurst(): boolean {
    const spark = this.weapons['spark'];
    if (!spark || !spark.unlocked) return false;

    const maxRange = this.getPlayerLanternLightRadius();
    if (!this.getNearestEnemy(maxRange)) return false;

    this.triggerPlayerAttack();
    soundManager.playSparkFire();

    const count = 6 + spark.level * 3;
    const dmg = Math.round(spark.damage * this.playerStats.damageMultiplier);
    const speed = 360;
    const maxLife = Math.round((maxRange / speed) * 1000);

    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + Phaser.Math.FloatBetween(-0.15, 0.15);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.acquirePlayerProjectile(this.player.x, this.player.y, 'fx_spark');
      proj.setDepth(22);
      proj.setBlendMode(Phaser.BlendModes.ADD);
      proj.clearTint();
      proj.setScale(0.48);
      proj.setRotation(angle);

      const sparkBody = proj.body as Phaser.Physics.Arcade.Body;
      if (sparkBody) {
        sparkBody.setSize(proj.width * 0.4, proj.height * 0.4);
      }

      const data: ProjectileData = {
        vx,
        vy,
        damage: dmg,
        pierce: 1 + (spark.level >= 3 ? 1 : 0),
        isCrit: false,
        isEnemy: false,
        life: 0,
        maxLife,
        originX: this.player.x,
        originY: this.player.y,
        maxRangeSq: maxRange * maxRange,
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }

    return true;
  }

  // -------------------------------------------------------------
  // Ground Telegraphs (0.5s red line or circle before enemy shots / slam)
  // -------------------------------------------------------------
  private queueTelegraph(entry: Omit<TelegraphEntry, 'elapsedMs'>) {
    this.telegraphs.push({ ...entry, elapsedMs: 0 });
  }

  private updateTelegraphs(delta: number) {
    if (!this.telegraphGraphics) return;
    this.telegraphGraphics.clear();

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.elapsedMs += delta;

      // Cancel projectile telegraph if source enemy died early (circle slams keep telegraphing)
      if (t.kind === 'line' && t.sourceEnemy && !t.sourceEnemy.active) {
        this.telegraphs.splice(i, 1);
        continue;
      }

      if (t.kind === 'line' && t.sourceEnemy && t.sourceEnemy.active) {
        t.x = t.sourceEnemy.x;
        t.y = t.sourceEnemy.y;
      }

      const progress = Math.min(1, t.elapsedMs / Math.max(1, t.durationMs));
      const pulse = 0.55 + 0.45 * Math.sin(progress * Math.PI * 3);

      if (t.kind === 'line') {
        const endX = t.x + Math.cos(t.angle) * t.length;
        const endY = t.y + Math.sin(t.angle) * t.length;
        this.telegraphGraphics.lineStyle(8, 0xe5484d, 0.22 * pulse);
        this.telegraphGraphics.lineBetween(t.x, t.y, endX, endY);
        this.telegraphGraphics.lineStyle(2.5, 0xff6b70, 0.45 + 0.5 * progress);
        this.telegraphGraphics.lineBetween(t.x, t.y, endX, endY);
      } else {
        this.telegraphGraphics.fillStyle(0xe5484d, 0.08 + 0.14 * progress);
        this.telegraphGraphics.fillCircle(t.x, t.y, t.radius);
        this.telegraphGraphics.fillStyle(0xe5484d, 0.14 * pulse);
        this.telegraphGraphics.fillCircle(t.x, t.y, t.radius * progress);
        this.telegraphGraphics.lineStyle(3, 0xff5e64, 0.5 + 0.45 * progress);
        this.telegraphGraphics.strokeCircle(t.x, t.y, t.radius);
      }

      if (t.elapsedMs >= t.durationMs) {
        if (t.kind === 'line' && t.damage > 0) {
          this.fireEnemyProjectile(
            t.x,
            t.y,
            t.angle,
            t.damage,
            t.speed,
            t.tint,
            t.sourceEnemy
          );
        }
        this.telegraphs.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------
  // Projectiles Update (Enemy Orb Pulse/Trail/Particles & Near-Miss Dodge)
  // -------------------------------------------------------------
  private updateProjectiles(delta: number) {
    if (!this.projectilesGroup) return;
    const projs = [...(this.projectilesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
    let magentaParticlesThisFrame = 0;

    for (const proj of projs) {
      if (!proj || !proj.active || !proj.scene) continue;
      const data = proj.getData('data') as ProjectileData;
      if (!data) continue;

      data.life += delta;
      if (
        !data.isEnemy &&
        data.maxRangeSq !== undefined &&
        data.originX !== undefined &&
        data.originY !== undefined
      ) {
        const rdx = proj.x - data.originX;
        const rdy = proj.y - data.originY;
        if (rdx * rdx + rdy * rdy >= data.maxRangeSq) {
          this.releasePlayerProjectile(proj);
          continue;
        }
      }
      if (data.life >= data.maxLife) {
        if (data.isEnemy) {
          this.releaseEnemyProjectile(proj);
        } else {
          this.releasePlayerProjectile(proj);
        }
        continue;
      }

      // Animated enemy orb behavior: continuous rotation, 40ms ghost trail, magenta particles, hit/dodge
      if (data.isEnemy) {
        proj.rotation += (delta / 1000) * 4.5;

        // Spawn a fading ghost copy every 40ms (alpha 0.5 -> 0, scale -> 0 in 250ms, ADD blend)
        let trailTimer = ((proj.getData('trailTimerMs') as number) || 0) + delta;
        while (trailTimer >= 40) {
          trailTimer -= 40;
          this.spawnEnemyOrbTrailGhost(proj);
        }
        proj.setData('trailTimerMs', trailTimer);

        // Emit small magenta particles (max 3 per frame total in high quality, 1 in low quality; 300ms life)
        const maxMagentaParticles = gameManager.getQualityTier() === 'low' ? 1 : 3;
        if (magentaParticlesThisFrame < maxMagentaParticles) {
          const ox = proj.x + Phaser.Math.Between(-10, 10);
          const oy = proj.y + Phaser.Math.Between(-10, 10);
          this.spawnParticleBurst(ox, oy, 1, 'fx_spark', 20, 65, 0.1, 0.2, 0xff44ee, 300);
          magentaParticlesThisFrame++;
        }

        const dist = Phaser.Math.Distance.Between(proj.x, proj.y, this.player.x, this.player.y);
        if (dist < SPAWN_TIMELINE.pressure.nearMissInnerRadius) {
          this.damagePlayer(data.damage);
          this.spawnSparkHitEffect(proj.x, proj.y, 0xff44ee, 0.85);
          this.spawnOrbImpactDeathEffect(proj.x, proj.y);
          this.cameraController.shakeOnDamage(data.damage, this.playerStats.maxHp);
          this.spawnParticleBurst(proj.x, proj.y, 8, 'fx_spark', 60, 150, 0.16, 0.3, 0xff44ee, 300);
          this.releaseEnemyProjectile(proj);
        } else if (
          dist <= SPAWN_TIMELINE.pressure.nearMissOuterRadius &&
          this.isMoving &&
          !proj.getData('nearMissAwarded')
        ) {
          proj.setData('nearMissAwarded', true);
          const bonusXp = SPAWN_TIMELINE.pressure.nearMissBonusXp * this.comboMultiplier;
          this.addXp(bonusXp);
          this.showFloatingCallout(this.player.x, this.player.y - 44, `DODGE +${bonusXp}`, '#5de4ff');
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Enemies AI & Update
  // -------------------------------------------------------------
  private updateEnemies(time: number, delta: number) {
    const enemies = [...(this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
    const pressureSpeedFactor = this.isUnderPressure ? 1 + SPAWN_TIMELINE.pressure.enemySpeedBonus : 1;
    const bloodFogSpeedFactor =
      this.bloodFogTimerMs > 0 ? this.getBloodFogModifiers(this.bloodFogTier).speedMult : 1;
    const globalEnemySpeedFactor = pressureSpeedFactor * bloodFogSpeedFactor;

    if (this.eliteAuraGraphics) {
      this.eliteAuraGraphics.clear();
    }

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy || !enemy.active || !enemy.scene) continue;

      const edata = enemy.getData('data') as EnemyData;
      if (!edata) continue;

      // Zero-allocation hit-flash tint restoration
      if (edata.tintResetAtMs && time >= edata.tintResetAtMs) {
        edata.tintResetAtMs = 0;
        if (enemy.getData('enraged')) {
          enemy.setTint(0xff7a7a);
        } else if (edata.isElite) {
          enemy.setTint((ELITE_AURA_STYLE[edata.type] ?? ELITE_AURA_STYLE.brute).spriteTint);
        } else {
          enemy.clearTint();
        }
      }

      // Elite distinct multi-layered pulsing aura & orbiting sigil nodes
      if (edata.isElite && this.eliteAuraGraphics) {
        const auraStyle = ELITE_AURA_STYLE[edata.type] ?? ELITE_AURA_STYLE.brute;
        const auraPulse = 0.65 + 0.35 * Math.sin(time * 0.008);
        const auraRadius = 54 * enemy.scaleX;

        this.eliteAuraGraphics.fillStyle(auraStyle.outerColor, 0.16 * auraPulse);
        this.eliteAuraGraphics.fillCircle(enemy.x, enemy.y, auraRadius);
        this.eliteAuraGraphics.lineStyle(2.5, auraStyle.outerColor, 0.7 * auraPulse);
        this.eliteAuraGraphics.strokeCircle(enemy.x, enemy.y, auraRadius + 5);
        this.eliteAuraGraphics.lineStyle(1.5, auraStyle.innerColor, 0.6 * auraPulse);
        this.eliteAuraGraphics.strokeCircle(enemy.x, enemy.y, auraRadius * 0.72);

        const spin = time * 0.0032;
        const orbitR = auraRadius + 8;
        this.eliteAuraGraphics.fillStyle(auraStyle.innerColor, 0.9 * auraPulse);
        for (let n = 0; n < 4; n++) {
          const na = spin + (n * Math.PI) / 2;
          this.eliteAuraGraphics.fillCircle(
            enemy.x + Math.cos(na) * orbitR,
            enemy.y + Math.sin(na) * orbitR,
            3.2
          );
        }
      }

      // Handle knockback decay (frame-rate-independent across 60/90/120fps)
      if (Math.abs(edata.knockbackX) > 2 || Math.abs(edata.knockbackY) > 2) {
        enemy.x += (edata.knockbackX * delta) / 1000;
        enemy.y += (edata.knockbackY * delta) / 1000;
        const kbDamp = Math.pow(0.88, delta / 16.6667);
        edata.knockbackX *= kbDamp;
        edata.knockbackY *= kbDamp;
      }

      const dxToPlayer = this.player.x - enemy.x;
      const dyToPlayer = this.player.y - enemy.y;
      const distSq = dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer;
      const angle = Math.atan2(dyToPlayer, dxToPlayer);
      const effectiveSpeed = edata.speed * globalEnemySpeedFactor;

      // Stampede linear charge override
      if (edata.chargeTimerMs && edata.chargeTimerMs > 0) {
        edata.chargeTimerMs -= delta;
        const cvx = (edata.chargeVx ?? Math.cos(angle) * effectiveSpeed) * globalEnemySpeedFactor;
        const cvy = (edata.chargeVy ?? Math.sin(angle) * effectiveSpeed) * globalEnemySpeedFactor;
        enemy.setVelocity(cvx, cvy);
        enemy.setFlipX(cvx < 0);
        if (edata.type === 'imp' && (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'imp_run')) {
          enemy.play('imp_run', true);
        }
        continue;
      }

      // All standard enemies flip toward the player
      enemy.setFlipX(dxToPlayer < 0);

      // Enemy specific behaviors
      switch (edata.type) {
        case 'wisp': {
          const phase = edata.phase ?? 0;
          const hoverOffset = Math.sin(time * 0.007 + phase) * 35;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          enemy.setVelocity(
            cosA * effectiveSpeed - sinA * hoverOffset,
            sinA * effectiveSpeed + cosA * hoverOffset
          );
          const baseScale = edata.baseScale ?? 0.36;
          const wobble = Math.sin(time * 0.015 + phase);
          enemy.setScale(
            baseScale * (0.925 - wobble * 0.075),
            baseScale * (1.03 + wobble * 0.03)
          );
          break;
        }

        case 'imp': {
          const phase = edata.phase ?? 0;
          const zigzag = Math.sin(time * 0.012 + phase) * 45;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          enemy.setVelocity(
            cosA * effectiveSpeed - sinA * zigzag,
            sinA * effectiveSpeed + cosA * zigzag
          );
          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'imp_run') {
            enemy.play('imp_run', true);
          }
          break;
        }

        case 'spitter': {
          const isTelegraphing = (edata.telegraphingUntilMs ?? 0) > time;
          if (isTelegraphing) {
            enemy.setVelocity(0, 0);
          } else if (distSq > 300 * 300) {
            enemy.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed);
          } else if (distSq < 220 * 220) {
            enemy.setVelocity(-Math.cos(angle) * effectiveSpeed * 0.8, -Math.sin(angle) * effectiveSpeed * 0.8);
          } else {
            enemy.setVelocity(0, 0);
          }

          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'spitter_walk') {
            enemy.play('spitter_walk', true);
          }

          // Spitter fires dodgeable orb after a 0.5s ground line telegraph
          if (time - edata.lastAttack > 2600 && distSq < 440 * 440) {
            edata.lastAttack = time;
            edata.telegraphingUntilMs = time + SPAWN_TIMELINE.pressure.telegraphDurationMs;
            this.queueTelegraph({
              kind: 'line',
              x: enemy.x,
              y: enemy.y,
              angle,
              length: 480,
              radius: 0,
              durationMs: SPAWN_TIMELINE.pressure.telegraphDurationMs,
              damage: edata.damage,
              speed: 250,
              tint: 0xc44cff,
              sourceEnemy: enemy,
            });
          }
          break;
        }

        case 'brute': {
          enemy.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed);
          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'brute_walk') {
            enemy.play('brute_walk', true);
          }
          const rawFrame = enemy.anims.currentFrame?.textureFrame;
          const fIdx = typeof rawFrame === 'number' ? rawFrame : -1;
          if ((fIdx === 4 || fIdx === 13) && edata.lastStompFrame !== fIdx) {
            edata.lastStompFrame = fIdx;
            if (distSq < 450 * 450) {
              soundManager.playBruteStomp();
            }
          } else if (fIdx !== 4 && fIdx !== 13) {
            edata.lastStompFrame = fIdx;
          }
          break;
        }

        case 'boss': {
          const bossTier = (enemy.getData('bossTier') as number) || 1;
          const hpRatio = edata.hp / Math.max(1, edata.maxHp);
          const isEnraged = hpRatio <= 0.5;
          const isCritical = hpRatio <= 0.25;
          let forceBossEmit = false;

          if (isEnraged && !enemy.getData('enraged')) {
            enemy.setData('enraged', true);
            enemy.setTint(0xff7a7a);
            forceBossEmit = true;
            soundManager.playBossWarning();
            this.cameraController.shakeFromBossProximity(
              enemy.x,
              enemy.y,
              this.player.x,
              this.player.y,
              0.018,
              550,
              950
            );
            this.showFloatingCallout(enemy.x, enemy.y - 90, 'THE TITAN ENRAGES!', '#e5303a');
          }

          const phaseSpeedBoost = isCritical ? 1.42 : isEnraged ? 1.24 : 1.0;
          const isAttacking = (enemy.getData('isAttacking') as boolean) || false;
          if (!isAttacking) {
            const bossMoveSpeed = effectiveSpeed * phaseSpeedBoost;
            enemy.setVelocity(Math.cos(angle) * bossMoveSpeed, Math.sin(angle) * bossMoveSpeed);
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'boss_idle') {
              enemy.play('boss_idle', true);
            }
          } else {
            enemy.setVelocity(0, 0);
          }

          // Faster periodic boss ground slam with larger 295px radius & >=0.5s red ground telegraph
          const slamCooldown = isCritical ? 1650 : isEnraged ? 1950 : 2600;
          if (!isAttacking && time - edata.lastAttack > slamCooldown) {
            edata.lastAttack = time;
            enemy.setData('isAttacking', true);
            enemy.setData('attackShockwaveDone', false);
            enemy.play('boss_attack');
            soundManager.playBossAttack();

            this.queueTelegraph({
              kind: 'circle',
              x: enemy.x,
              y: enemy.y,
              angle: 0,
              length: 0,
              radius: 295,
              durationMs: Math.max(580, SPAWN_TIMELINE.pressure.telegraphDurationMs),
              damage: 0,
              speed: 0,
              tint: 0xe5484d,
            });
          } else if (!isAttacking && distSq < 640 * 640) {
            // Escalating Void Volley: 5-way normally, 7-way critical burst below 25% HP
            const volleyCooldown = isCritical ? 1250 : isEnraged ? 1450 : 1950;
            const lastVolley = (enemy.getData('lastBossVolley') as number) || 0;
            if (time - lastVolley > volleyCooldown) {
              enemy.setData('lastBossVolley', time);
              const offsets = isCritical
                ? [-0.66, -0.44, -0.22, 0, 0.22, 0.44, 0.66]
                : [-0.44, -0.22, 0, 0.22, 0.44];
              const orbSpeed = isCritical ? 380 : isEnraged ? 355 : 335;
              for (const offset of offsets) {
                this.queueTelegraph({
                  kind: 'line',
                  x: enemy.x,
                  y: enemy.y,
                  angle: angle + offset,
                  length: 620,
                  radius: 0,
                  durationMs: SPAWN_TIMELINE.pressure.telegraphDurationMs,
                  damage: Math.round(edata.damage * (isEnraged ? 0.78 : 0.7)),
                  speed: orbSpeed,
                  tint: 0xe5484d,
                  sourceEnemy: enemy,
                });
              }
            }
          }

          // Periodic Void Minion Summons so kiting remains dangerous
          const summonCooldown = isEnraged ? 6500 : 9000;
          const lastSummon = (enemy.getData('lastBossSummon') as number) || 0;
          if (
            time - lastSummon > summonCooldown &&
            this.enemiesGroup.countActive(true) < SPAWN_TIMELINE.maxActiveEnemies
          ) {
            enemy.setData('lastBossSummon', time);
            const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();
            const minionCount = isEnraged ? 5 : 4;
            for (let s = 0; s < minionCount; s++) {
              const sAngle = angle + (s * Math.PI * 2) / minionCount;
              const sx = enemy.x + Math.cos(sAngle) * 110;
              const sy = enemy.y + Math.sin(sAngle) * 110;
              const minionType = s % 3 === 0 ? 'spitter' : 'imp';
              this.spawnEnemyAt(
                sx,
                sy,
                minionType,
                hpMult * 1.45,
                dmgMult * 1.2,
                speedMult * 1.15
              );
            }
            this.spawnParticleBurst(enemy.x, enemy.y, 18, 'fx_ring', 90, 220, 0.2, 0.4, 0xe5303a);
          }

          // Throttled boss update to UI (max ~10Hz instead of 60Hz React re-renders)
          if (forceBossEmit || time - this.lastBossEmitMs >= 100) {
            this.lastBossEmitMs = time;
            gameManager.emitBossUpdate({
              name: bossTier > 1 ? `The Void Titan Tier ${bossTier}` : 'The Void Titan',
              currentHp: Math.max(0, Math.round(edata.hp)),
              maxHp: edata.maxHp,
              active: true,
              recommendedLevel: BOSS_RECOMMENDED_LEVEL + (bossTier - 1) * 15,
              enraged: isEnraged,
            });
          }
          break;
        }
      }

      if (this.shadowSystem && edata.type !== 'wisp' && edata.type !== 'boss') {
        this.shadowSystem.resolvePillarPushout(enemy, 16);
      }
    }
  }

  // Enemy Projectile & Ghost Trail Object Pools
  private initEnemyProjectilePool() {
    this.enemyProjectilePool = [];
    for (let i = 0; i < this.MAX_ENEMY_PROJECTILES; i++) {
      const proj = this.projectilesGroup.create(0, 0, 'fx_spitter_orb_sheet', 0) as Phaser.Physics.Arcade.Sprite;
      proj.disableBody(true, true);
      proj.setActive(false);
      proj.setVisible(false);
      proj.disableInteractive();
      this.enemyProjectilePool.push(proj);
    }
  }

  private initEnemyTrailPool() {
    this.enemyTrailPool = [];
    for (let i = 0; i < this.MAX_ENEMY_TRAILS; i++) {
      const ghost = this.add.sprite(0, 0, 'fx_spitter_orb_sheet', 0);
      ghost.setBlendMode(Phaser.BlendModes.ADD);
      ghost.setDepth(22);
      ghost.setActive(false);
      ghost.setVisible(false);
      ghost.disableInteractive();
      this.enemyTrailPool.push(ghost);
    }
  }

  private acquireEnemyProjectile(x: number, y: number): Phaser.Physics.Arcade.Sprite {
    let proj = this.enemyProjectilePool.find((p) => !p.active && Boolean(p.scene));
    if (!proj) {
      if (this.enemyProjectilePool.length >= this.MAX_ENEMY_PROJECTILE_POOL) {
        let oldest: Phaser.Physics.Arcade.Sprite | undefined;
        let maxLife = -1;
        for (let i = 0; i < this.enemyProjectilePool.length; i++) {
          const candidate = this.enemyProjectilePool[i];
          if (!candidate.scene) continue;
          const pdata = candidate.getData('data') as ProjectileData | undefined;
          const life = pdata?.life ?? 0;
          if (!oldest || life > maxLife) {
            maxLife = life;
            oldest = candidate;
          }
        }
        if (oldest) {
          this.releaseEnemyProjectile(oldest);
          proj = oldest;
        }
      }
      if (!proj) {
        proj = this.projectilesGroup.create(x, y, 'fx_spitter_orb_sheet', 0) as Phaser.Physics.Arcade.Sprite;
        proj.disableInteractive();
        this.enemyProjectilePool.push(proj);
      }
    }
    this.tweens.killTweensOf(proj);
    proj.anims.stop();
    proj.setTexture('fx_spitter_orb_sheet', 0);
    proj.enableBody(true, x, y, true, true);
    proj.setActive(true);
    proj.setVisible(true);
    return proj;
  }

  private acquirePlayerProjectile(
    x: number,
    y: number,
    texture: string
  ): Phaser.Physics.Arcade.Sprite {
    let proj = this.playerProjectilePool.find((p) => !p.active && Boolean(p.scene));
    if (!proj) {
      if (this.playerProjectilePool.length >= this.MAX_PLAYER_PROJECTILES) {
        let oldest: Phaser.Physics.Arcade.Sprite | undefined;
        let maxLife = -1;
        for (let i = 0; i < this.playerProjectilePool.length; i++) {
          const candidate = this.playerProjectilePool[i];
          if (!candidate.scene) continue;
          const pdata = candidate.getData('data') as ProjectileData | undefined;
          const life = pdata?.life ?? 0;
          if (!oldest || life > maxLife) {
            maxLife = life;
            oldest = candidate;
          }
        }
        if (oldest) {
          this.releasePlayerProjectile(oldest);
          proj = oldest;
        }
      }
      if (!proj) {
        proj = this.projectilesGroup.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
        proj.disableInteractive();
        this.playerProjectilePool.push(proj);
      } else {
        proj.setTexture(texture);
        proj.enableBody(true, x, y, true, true);
        proj.setAlpha(1);
      }
    } else {
      proj.setTexture(texture);
      proj.enableBody(true, x, y, true, true);
      proj.setAlpha(1);
    }
    return proj;
  }

  private releasePlayerProjectile(proj: Phaser.Physics.Arcade.Sprite) {
    if (!proj || !proj.scene) return;
    proj.clearTint();
    proj.disableBody(true, true);
    proj.setActive(false);
    proj.setVisible(false);
  }

  private acquireEnemy(
    x: number,
    y: number,
    texture: string
  ): Phaser.Physics.Arcade.Sprite {
    let enemy = this.enemyPool.find((e) => !e.active && Boolean(e.scene));
    if (!enemy) {
      enemy = this.enemiesGroup.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
      enemy.disableInteractive();
      this.enemyPool.push(enemy);
    } else {
      enemy.anims.stop();
      enemy.clearTint();
      enemy.setAlpha(1);
      enemy.setFlipX(false);
      enemy.setTexture(texture);
      enemy.enableBody(true, x, y, true, true);
    }
    return enemy;
  }

  private releaseEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    if (!enemy || !enemy.scene) return;
    this.tweens.killTweensOf(enemy);
    enemy.anims.stop();
    enemy.clearTint();
    enemy.setAlpha(1);
    enemy.setData('data', null);
    enemy.setData('lastBladeHit', 0);
    enemy.disableBody(true, true);
    enemy.setActive(false);
    enemy.setVisible(false);
  }

  private acquirePickup(
    x: number,
    y: number,
    texture: string
  ): Phaser.Physics.Arcade.Sprite {
    let p = this.pickupPool.find((item) => !item.active && Boolean(item.scene));
    if (!p) {
      p = this.pickupsGroup.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
      p.disableInteractive();
      this.pickupPool.push(p);
    } else {
      p.setTexture(texture);
      p.enableBody(true, x, y, true, true);
      p.setAlpha(1);
      p.clearTint();
    }
    return p;
  }

  private releasePickup(p: Phaser.Physics.Arcade.Sprite) {
    if (!p || !p.scene) return;
    p.setAlpha(1);
    p.disableBody(true, true);
    p.setActive(false);
    p.setVisible(false);
  }

  private releaseEnemyProjectile(proj: Phaser.Physics.Arcade.Sprite) {
    this.tweens.killTweensOf(proj);
    proj.anims.stop();
    proj.setData('pulseTween', null);
    proj.setData('trailTimerMs', 0);
    proj.setData('nearMissAwarded', false);
    proj.setScale(0.42);
    proj.setAlpha(1);
    proj.setRotation(0);
    proj.disableBody(true, true);
    proj.setActive(false);
    proj.setVisible(false);
  }

  private spawnEnemyOrbTrailGhost(sourceProj: Phaser.Physics.Arcade.Sprite) {
    const ghost = this.enemyTrailPool.find((g) => !g.active);
    if (!ghost) return;

    this.tweens.killTweensOf(ghost);
    const frameIndex = sourceProj.anims.currentFrame?.textureFrame ?? 0;
    ghost.setTexture('fx_spitter_orb_sheet', frameIndex);
    ghost.setPosition(sourceProj.x, sourceProj.y);
    ghost.setRotation(sourceProj.rotation);
    ghost.setScale(sourceProj.scaleX);
    ghost.setAlpha(0.5);
    ghost.setBlendMode(Phaser.BlendModes.ADD);
    ghost.setDepth(22);
    ghost.setActive(true);
    ghost.setVisible(true);

    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 250,
      ease: 'Quad.easeOut',
      onComplete: () => {
        ghost.setActive(false);
        ghost.setVisible(false);
      },
    });
  }

  // Enemy Projectile (Spitter / Boss)
  private fireEnemyProjectile(
    x: number,
    y: number,
    angle: number,
    damage: number,
    speed: number = 220,
    _tint: number = 0xcc44ff,
    sourceEnemy?: Phaser.Physics.Arcade.Sprite
  ) {
    // Cast position near cultist/caster's hands
    const castX =
      sourceEnemy && sourceEnemy.active ? sourceEnemy.x + Math.cos(angle) * 20 : x;
    const castY =
      sourceEnemy && sourceEnemy.active ? sourceEnemy.y - 6 + Math.sin(angle) * 14 : y;

    // On cast: play fx_spark_sheet tinted magenta at the cultist's hands
    this.spawnSparkHitEffect(castX, castY, 0xff44ee, 0.72);

    const proj = this.acquireEnemyProjectile(castX, castY);
    const baseScale = 0.42;

    // Reset all visual & trail state cleanly for pooled reuse
    proj.setDepth(23);
    proj.setBlendMode(Phaser.BlendModes.ADD);
    proj.clearTint();
    proj.setAlpha(1);
    proj.setRotation(0);
    proj.setScale(baseScale * 0.9);
    proj.setData('trailTimerMs', 0);
    proj.setData('nearMissAwarded', false);

    // Restart animated orb spritesheet from frame 0
    proj.play({ key: 'fx_spitter_orb_anim', startFrame: 0 });
    proj.anims.restart();

    // Scale pulse 0.9-1.15 at ~6 Hz (~166ms full cycle -> 83ms yoyo half-cycle)
    const pulseTween = this.tweens.add({
      targets: proj,
      scaleX: baseScale * 1.15,
      scaleY: baseScale * 1.15,
      duration: 83,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    proj.setData('pulseTween', pulseTween);

    const epBody = proj.body as Phaser.Physics.Arcade.Body;
    if (epBody) {
      epBody.setSize(44, 44);
      epBody.setOffset(42, 42);
    }

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const data: ProjectileData = {
      vx,
      vy,
      damage,
      pierce: 1,
      isCrit: false,
      isEnemy: true,
      life: 0,
      maxLife: 2800,
    };
    proj.setData('data', data);
    proj.setVelocity(vx, vy);
  }

  // -------------------------------------------------------------
  // Enemy Spawning & SPAWN_TIMELINE Pacing / Events
  // -------------------------------------------------------------
  private getBloodFogModifiers(tier: number): {
    durationMs: number;
    speedMult: number;
    densityMult: number;
    hpMult: number;
    dmgMult: number;
    intervalScale: number;
    eliteBonusChance: number;
  } {
    const t = Math.max(1, tier);
    const scale = this.difficultyPreset.bloodFogScale;
    const speedBonus = Math.min(0.75, (0.28 + (t - 1) * 0.08) * scale);
    const densityBonus = Math.min(1.5, (0.55 + (t - 1) * 0.18) * scale);
    const hpBonus = (0.15 + (t - 1) * 0.22) * scale;
    const dmgBonus = (0.1 + (t - 1) * 0.12) * scale;
    const intervalScale = Math.max(0.3, 0.56 - (t - 1) * 0.055);
    const durationMs = Math.min(
      HORDE_FRENZY.maxDurationMs,
      HORDE_FRENZY.baseDurationMs + (t - 1) * 3000
    );
    const eliteBonusChance = Math.min(0.18, 0.04 * t * scale);

    return {
      durationMs,
      speedMult: 1 + speedBonus,
      densityMult: 1 + densityBonus,
      hpMult: 1 + hpBonus,
      dmgMult: 1 + dmgBonus,
      intervalScale,
      eliteBonusChance,
    };
  }

  private getTargetOnScreenCount(timeSec: number): number {
    const pts = SPAWN_TIMELINE.pacingTargets;
    let baseCount: number = SPAWN_TIMELINE.maxActiveEnemies;
    if (timeSec <= pts[0].timeSec) {
      baseCount = Math.round((pts[0].minTarget + pts[0].maxTarget) * 0.5);
    } else {
      for (let i = 1; i < pts.length; i++) {
        if (timeSec <= pts[i].timeSec) {
          const prev = pts[i - 1];
          const curr = pts[i];
          const prevVal = (prev.minTarget + prev.maxTarget) * 0.5;
          const currVal = (curr.minTarget + curr.maxTarget) * 0.5;
          const t = (timeSec - prev.timeSec) / Math.max(1, curr.timeSec - prev.timeSec);
          baseCount = Math.round(Phaser.Math.Linear(prevVal, currVal, t));
          break;
        }
      }
    }
    // Gradual level-based crowd growth + selected difficulty density
    const levelDensityBonus = 1 + Math.min(0.35, Math.floor(this.playerLevel / 10) * 0.07);
    return Math.max(
      4,
      Math.min(
        SPAWN_TIMELINE.maxActiveEnemies,
        Math.round(baseCount * levelDensityBonus * this.difficultyPreset.spawnDensityMult)
      )
    );
  }

  private getTimelineScaling(): { hpMult: number; speedMult: number; dmgMult: number } {
    const minutes = this.runTime / 60;
    const levelSteps = Math.max(0, this.playerLevel - 1);
    const levelHpBonus = levelSteps * 0.028;
    const levelSpeedBonus = Math.min(0.24, Math.floor(this.playerLevel / 10) * 0.04);
    const levelDmgBonus = Math.floor(this.playerLevel / 10) * 0.08;

    const fogMods =
      this.bloodFogTimerMs > 0 ? this.getBloodFogModifiers(this.bloodFogTier) : null;

    const hpMult =
      (1 + minutes * SPAWN_TIMELINE.enemyScaling.hpGrowthPerMinute + levelHpBonus) *
      this.difficultyPreset.enemyHpMult *
      (fogMods ? fogMods.hpMult : 1);

    const speedMult =
      Math.min(
        1 + SPAWN_TIMELINE.enemyScaling.maxSpeedBonus + levelSpeedBonus,
        1 + minutes * SPAWN_TIMELINE.enemyScaling.speedGrowthPerMinute + levelSpeedBonus * 0.5
      ) * this.difficultyPreset.enemySpeedMult;

    const diff = getDifficultyConfig(this.runTime);
    const dmgMult =
      diff.damageMultiplier *
      (1 + levelDmgBonus) *
      this.difficultyPreset.enemyDmgMult *
      (fogMods ? fogMods.dmgMult : 1);

    return { hpMult, speedMult, dmgMult };
  }

  private scheduleTimelineEvent(
    id: string,
    title: string,
    subtitle: string,
    onExecute: () => void
  ): boolean {
    if (this.triggeredEvents.has(id) || this.pendingEvent) return false;
    if (this.runTime - this.lastEventTriggerTimeSec < SPAWN_TIMELINE.events.minEventSpacingSec) {
      return false;
    }

    this.triggeredEvents.add(id);
    this.lastEventTriggerTimeSec = this.runTime;
    this.screenEdgeFlashAlpha = 0.85;
    soundManager.playBossWarning();
    gameManager.emitEventWarning({ title, subtitle });

    this.pendingEvent = {
      id,
      countdownMs: SPAWN_TIMELINE.events.warningDurationMs,
      onExecute,
    };
    return true;
  }

  private handleTimelineEvents() {
    if (this.pendingEvent) return;
    if (this.runTime - this.lastEventTriggerTimeSec < SPAWN_TIMELINE.events.minEventSpacingSec) {
      return;
    }

    const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();

    // 1:00 Encirclement: 20 wisps spawn in a ring around player and close in
    if (this.runTime >= SPAWN_TIMELINE.events.encirclement.timeSec && !this.triggeredEvents.has('encirclement')) {
      this.scheduleTimelineEvent(
        'encirclement',
        'ENCIRCLEMENT',
        '20 Void Wisps closing in from every side',
        () => {
          const { count, radius } = SPAWN_TIMELINE.events.encirclement;
          for (let i = 0; i < count; i++) {
            if (this.enemiesGroup.countActive(true) >= SPAWN_TIMELINE.maxActiveEnemies) break;
            const ang = (i / count) * Math.PI * 2;
            const sx = this.player.x + Math.cos(ang) * radius;
            const sy = this.player.y + Math.sin(ang) * radius;
            this.spawnEnemyAt(sx, sy, 'wisp', hpMult, dmgMult, speedMult);
          }
        }
      );
      return;
    }

    // 2:00 Stampede: line of 12 imps charging across the screen
    if (this.runTime >= SPAWN_TIMELINE.events.stampede.timeSec && !this.triggeredEvents.has('stampede')) {
      this.scheduleTimelineEvent(
        'stampede',
        'IMP STAMPEDE',
        'A charging pack tears across the lantern light',
        () => {
          const { count, speedMultiplier, chargeDurationMs } = SPAWN_TIMELINE.events.stampede;
          const fromLeft = Math.random() < 0.5;
          const dirX = fromLeft ? 1 : -1;
          const startX = this.player.x + (fromLeft ? -580 : 580);
          const chargeSpeed = 165 * speedMult * speedMultiplier;
          const spacing = 54;
          const topY = this.player.y - ((count - 1) * spacing) / 2;

          for (let i = 0; i < count; i++) {
            if (this.enemiesGroup.countActive(true) >= SPAWN_TIMELINE.maxActiveEnemies) break;
            this.spawnEnemyAt(startX, topY + i * spacing, 'imp', hpMult, dmgMult, speedMult, {
              chargeVx: dirX * chargeSpeed,
              chargeVy: 0,
              chargeTimerMs: chargeDurationMs,
            });
          }
        }
      );
      return;
    }

    // 2:30 Twin Brutes
    if (this.runTime >= SPAWN_TIMELINE.events.twinBrutes.timeSec && !this.triggeredEvents.has('twin_brutes')) {
      this.scheduleTimelineEvent(
        'twin_brutes',
        'TWIN BRUTES',
        'Two armored colossi emerge from the dark',
        () => {
          const baseAng = Math.random() * Math.PI * 2;
          for (let i = 0; i < SPAWN_TIMELINE.events.twinBrutes.count; i++) {
            if (this.enemiesGroup.countActive(true) >= SPAWN_TIMELINE.maxActiveEnemies) break;
            const ang = baseAng + i * 0.45;
            this.spawnEnemyAt(
              this.player.x + Math.cos(ang) * 500,
              this.player.y + Math.sin(ang) * 500,
              'brute',
              hpMult,
              dmgMult,
              speedMult
            );
          }
        }
      );
      return;
    }

    // 3:00 First ELITE (bigger, 8x HP, red glow aura, drops 3 coins + upgrade chest)
    if (this.runTime >= SPAWN_TIMELINE.events.firstElite.timeSec && !this.triggeredEvents.has('first_elite')) {
      this.scheduleTimelineEvent(
        'first_elite',
        'ELITE HUNT',
        'Blood-forged Abomination approaches (Drops Chest)',
        () => {
          const ang = Math.random() * Math.PI * 2;
          this.spawnEnemyAt(
            this.player.x + Math.cos(ang) * 480,
            this.player.y + Math.sin(ang) * 480,
            'brute',
            hpMult * SPAWN_TIMELINE.events.firstElite.hpMultiplier,
            dmgMult * 1.25,
            speedMult * 1.1,
            {
              isElite: true,
              coinDrops: SPAWN_TIMELINE.events.firstElite.coinDrops,
              dropsChest: true,
            }
          );
        }
      );
      return;
    }

    // 4:00 Spitter Squad (5 spitters from one side)
    if (this.runTime >= SPAWN_TIMELINE.events.spitterSquad.timeSec && !this.triggeredEvents.has('spitter_squad')) {
      this.scheduleTimelineEvent(
        'spitter_squad',
        'SPITTER SQUAD',
        '5 ranged spitters flanking from one side',
        () => {
          const sideAngle = Math.random() * Math.PI * 2;
          const count = SPAWN_TIMELINE.events.spitterSquad.count;
          for (let i = 0; i < count; i++) {
            if (this.enemiesGroup.countActive(true) >= SPAWN_TIMELINE.maxActiveEnemies) break;
            const ang = sideAngle + (i - (count - 1) / 2) * 0.2;
            this.spawnEnemyAt(
              this.player.x + Math.cos(ang) * 520,
              this.player.y + Math.sin(ang) * 520,
              'spitter',
              hpMult,
              dmgMult,
              speedMult
            );
          }
        }
      );
      return;
    }

    // 5:00 First Boss
    if (this.runTime >= SPAWN_TIMELINE.events.bossFirstTimeSec && !this.triggeredEvents.has('boss_1')) {
      this.scheduleTimelineEvent(
        'boss_1',
        'THE VOID TITAN',
        `Apex dreadnought awakens · Rec. Lv. ${BOSS_RECOMMENDED_LEVEL}`,
        () => {
          this.spawnBoss(1);
        }
      );
      return;
    }

    // Minute 6 and Minute 9: "Darkness Falls" event (-25% light radius for 40s, +50% enemy XP drops)
    for (const dfSec of LIGHT.progression.darknessFalls.eventTimesSec) {
      const dfId = `darkness_falls_${dfSec}`;
      if (this.runTime >= dfSec && !this.triggeredEvents.has(dfId)) {
        const penaltyPct = Math.round(LIGHT.progression.darknessFalls.radiusPenalty * 100);
        const xpBonusPct = Math.round(LIGHT.progression.darknessFalls.xpDropBonus * 100);
        const durSec = Math.round(LIGHT.progression.darknessFalls.durationMs / 1000);
        this.scheduleTimelineEvent(
          dfId,
          'DARKNESS FALLS',
          `Light radius -${penaltyPct}% for ${durSec}s · Enemy XP +${xpBonusPct}%`,
          () => {
            this.darknessFallsTimerMs = LIGHT.progression.darknessFalls.durationMs;
          }
        );
        return;
      }
    }

    // Recurring every 3 minutes after 5:00 (8:00, 11:00, ...): harder boss or double elite
    if (this.runTime >= this.nextRecurringEventTimeSec) {
      this.recurringCycleCount++;
      const cycleIdx = this.recurringCycleCount;
      this.nextRecurringEventTimeSec += SPAWN_TIMELINE.events.recurringCycleSec;
      const spawnDoubleElite = cycleIdx % 2 === 1 || this.activeBoss !== null;

      if (spawnDoubleElite) {
        this.scheduleTimelineEvent(
          `recurring_${cycleIdx}`,
          'DOUBLE ELITE',
          'Two blood-forged elites descend together',
          () => {
            const baseAng = Math.random() * Math.PI * 2;
            for (let i = 0; i < 2; i++) {
              const ang = baseAng + i * Math.PI;
              this.spawnEnemyAt(
                this.player.x + Math.cos(ang) * 480,
                this.player.y + Math.sin(ang) * 480,
                i === 0 ? 'brute' : 'spitter',
                hpMult * SPAWN_TIMELINE.events.firstElite.hpMultiplier,
                dmgMult * 1.35,
                speedMult * 1.15,
                {
                  isElite: true,
                  coinDrops: SPAWN_TIMELINE.events.firstElite.coinDrops,
                  dropsChest: true,
                }
              );
            }
          }
        );
      } else {
        const tier = 1 + Math.floor(cycleIdx / 2);
        this.scheduleTimelineEvent(
          `recurring_${cycleIdx}`,
          `VOID TITAN TIER ${tier}`,
          `Abyssal juggernaut rises · Rec. Lv. ${BOSS_RECOMMENDED_LEVEL + (tier - 1) * 15}`,
          () => {
            this.spawnBoss(tier);
          }
        );
      }
    }
  }

  private handleEnemySpawning(time: number) {
    this.handleTimelineEvents();

    const isBloodFog = this.bloodFogTimerMs > 0;
    const fogMods = isBloodFog ? this.getBloodFogModifiers(this.bloodFogTier) : null;
    const effectiveMaxActive = isBloodFog
      ? HORDE_FRENZY.maxActiveEnemiesOverride
      : SPAWN_TIMELINE.maxActiveEnemies;

    const activeCount = this.enemiesGroup.countActive(true);
    if (activeCount >= effectiveMaxActive) return;

    const baseTarget = this.getTargetOnScreenCount(this.runTime);
    const targetOnScreen =
      isBloodFog && fogMods
        ? Math.min(
            effectiveMaxActive,
            Math.max(
              Math.round(24 * this.difficultyPreset.spawnDensityMult),
              Math.round(baseTarget * fogMods.densityMult)
            )
          )
        : baseTarget;
    const deficit = targetOnScreen - activeCount;

    if (time >= this.nextSpawnTime) {
      const diff = getDifficultyConfig(this.runTime);
      const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();

      // Dynamic interval keeps crowd pacing tightly aligned to targetOnScreen & difficulty preset
      let interval = deficit > 6 ? Math.min(diff.spawnIntervalMs, 380) : diff.spawnIntervalMs;
      interval = Math.round(interval * this.difficultyPreset.spawnIntervalMult);
      if (isBloodFog && fogMods) {
        interval = Math.max(150, Math.round(interval * fogMods.intervalScale));
      }
      this.nextSpawnTime = time + interval;

      if (deficit <= 0) return;

      const desiredBatch = isBloodFog
        ? deficit > 10
          ? 5
          : deficit > 4
            ? 3
            : 2
        : deficit > 12
          ? 4
          : deficit > 5
            ? 2
            : 1;

      const batchSize = Math.min(
        effectiveMaxActive - activeCount,
        desiredBatch,
        Math.max(1, deficit)
      );

      for (let i = 0; i < batchSize; i++) {
        const type = pickEnemyTypeFromWeights(diff.enemyWeights);
        this.spawnRandomEnemy(type, hpMult, dmgMult, speedMult);
      }
    }
  }

  private countActiveElites(): number {
    if (!this.enemiesGroup) return 0;
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let count = 0;
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const edata = enemy.getData('data') as EnemyData | undefined;
      if (edata?.isElite) {
        count++;
      }
    }
    return count;
  }

  private shouldSpawnEliteVariant(): boolean {
    if (this.runTime < ELITE_VARIANTS.minRunTimeSec) return false;
    if (this.time.now - this.lastEliteVariantSpawnMs < ELITE_VARIANTS.spawnCooldownMs) {
      return false;
    }
    if (this.countActiveElites() >= ELITE_VARIANTS.maxActiveElites) {
      return false;
    }
    const fogBonus =
      this.bloodFogTimerMs > 0 ? this.getBloodFogModifiers(this.bloodFogTier).eliteBonusChance : 0;
    const chance = Math.min(
      ELITE_VARIANTS.maxSpawnChance + fogBonus,
      ELITE_VARIANTS.baseSpawnChance + (this.runTime / 60) * ELITE_VARIANTS.chancePerMinute + fogBonus
    );
    return Math.random() < chance;
  }

  private spawnRandomEnemy(
    type: 'wisp' | 'imp' | 'spitter' | 'brute',
    hpMultiplier: number = 1,
    dmgMultiplier: number = 1,
    speedMultiplier: number = 1
  ) {
    const cap =
      this.bloodFogTimerMs > 0
        ? HORDE_FRENZY.maxActiveEnemiesOverride
        : SPAWN_TIMELINE.maxActiveEnemies;
    if (this.enemiesGroup.countActive(true) >= cap) return;

    // Spawn off-screen around player
    const angle = Math.random() * Math.PI * 2;
    const distance = Phaser.Math.Between(520, 680);
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    if (this.shouldSpawnEliteVariant()) {
      this.lastEliteVariantSpawnMs = this.time.now;
      this.spawnEnemyAt(
        x,
        y,
        type,
        hpMultiplier * ELITE_VARIANTS.hpMultiplier,
        dmgMultiplier * ELITE_VARIANTS.damageMultiplier,
        speedMultiplier * ELITE_VARIANTS.speedMultiplier,
        {
          isElite: true,
          coinDrops: 2,
          dropsChest: Math.random() < ELITE_VARIANTS.chestDropChance,
          scaleMultiplierOverride: ELITE_VARIANTS.scaleMultiplier,
        }
      );
      return;
    }

    this.spawnEnemyAt(x, y, type, hpMultiplier, dmgMultiplier, speedMultiplier);
  }

  public spawnEnemyAt(
    x: number,
    y: number,
    type: 'wisp' | 'imp' | 'spitter' | 'brute',
    hpMultiplier: number = 1,
    dmgMultiplier: number = 1,
    speedMultiplier: number = 1,
    options?: {
      isElite?: boolean;
      coinDrops?: number;
      dropsChest?: boolean;
      chargeVx?: number;
      chargeVy?: number;
      chargeTimerMs?: number;
      scaleMultiplierOverride?: number;
    }
  ) {
    let texture = 'enemy_wisp';
    let baseHp = 25;
    let baseSpeed = 125;
    let baseDmg = 8;
    let scale = 0.38;

    switch (type) {
      case 'wisp':
        texture = 'enemy_wisp';
        baseHp = 24;
        baseSpeed = 125;
        baseDmg = 8;
        scale = 0.36;
        break;
      case 'imp':
        texture = 'imp_run_sheet';
        baseHp = 55;
        baseSpeed = 95;
        baseDmg = 14;
        scale = 0.45;
        break;
      case 'spitter':
        texture = 'spitter_walk_sheet';
        baseHp = 85;
        baseSpeed = 65;
        baseDmg = 18;
        scale = 0.38;
        break;
      case 'brute':
        texture = 'brute_walk_sheet';
        baseHp = 280;
        baseSpeed = 44;
        baseDmg = 28;
        scale = 0.52;
        break;
    }

    if (options?.isElite) {
      scale *=
        options.scaleMultiplierOverride ?? SPAWN_TIMELINE.events.firstElite.scaleMultiplier;
    }

    const hp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const damage = Math.max(1, Math.round(baseDmg * dmgMultiplier));
    const speed = Math.round(baseSpeed * speedMultiplier);

    const enemy = this.acquireEnemy(x, y, texture);
    enemy.setDepth(options?.isElite ? 20 : 18);
    enemy.setScale(scale);
    if (options?.isElite) {
      enemy.setTint((ELITE_AURA_STYLE[type] ?? ELITE_AURA_STYLE.brute).spriteTint);
    } else {
      enemy.clearTint();
    }

    // Hitbox smaller than sprite
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    if (enemyBody) {
      if (type === 'imp') {
        enemyBody.setSize(130, 110);
        enemyBody.setOffset(105, 45);
      } else if (type === 'brute') {
        enemyBody.setSize(160, 140);
        enemyBody.setOffset(70, 42);
      } else if (type === 'spitter') {
        enemyBody.setSize(100, 180);
        enemyBody.setOffset(42, 45);
      } else {
        const eb = enemy.getBounds();
        enemyBody.setSize(eb.width * 0.55, eb.height * 0.6);
        enemyBody.setOffset(eb.width * 0.225, eb.height * 0.25);
      }
    }

    const baseGemValue = type === 'brute' ? 5 : type === 'spitter' ? 3 : 1;
    const eliteGemValue = Math.max(10, baseGemValue * ELITE_VARIANTS.xpMultiplier);
    const phase = Math.random() * 1000;

    const edata: EnemyData = {
      type,
      hp,
      maxHp: hp,
      speed,
      damage,
      scoreValue: options?.isElite ? 160 : type === 'brute' ? 40 : type === 'spitter' ? 25 : 10,
      gemValue: options?.isElite ? eliteGemValue : baseGemValue,
      lastAttack: 0,
      knockbackX: 0,
      knockbackY: 0,
      isElite: options?.isElite,
      coinDrops: options?.coinDrops,
      dropsChest: options?.dropsChest,
      chargeVx: options?.chargeVx,
      chargeVy: options?.chargeVy,
      chargeTimerMs: options?.chargeTimerMs,
      phase,
      lightVis: 0,
      baseScale: scale,
      lastStompFrame: -1,
    };
    enemy.setData('data', edata);
    enemy.setData('lastBladeHit', 0);

    // Play spritesheet animations and randomize start frame so crowds are not in sync
    if (type === 'imp') {
      enemy.play('imp_run');
      enemy.anims.setProgress(Math.random());
    } else if (type === 'brute') {
      enemy.play('brute_walk');
      enemy.anims.setProgress(Math.random());
    } else if (type === 'spitter') {
      enemy.play('spitter_walk');
      enemy.anims.setProgress(Math.random());
    }
  }

  // Boss Spawn (5:00, recurring every 3 minutes, or Summon button)
  public spawnBoss(tier: number = 1) {
    if (this.activeBoss || this.isDead || !this.sys?.isActive() || !this.player?.active) return;
    this.bossSpawned = true;

    soundManager.playBossSiren();
    soundManager.playBoss();

    const angle = Math.random() * Math.PI * 2;
    const x = this.player.x + Math.cos(angle) * 450;
    const y = this.player.y + Math.sin(angle) * 450;

    this.cameraController.shakeFromBossProximity(x, y, this.player.x, this.player.y, 0.018, 600, 900);

    const boss = this.enemiesGroup.create(x, y, 'boss_idle_sheet') as Phaser.Physics.Arcade.Sprite;
    boss.setDepth(24);
    boss.setScale(0.95 + Math.min(0.2, (tier - 1) * 0.08));

    const bossBody = boss.body as Phaser.Physics.Arcade.Body;
    if (bossBody) {
      bossBody.setSize(160, 200);
      bossBody.setOffset(125, 26);
    }

    const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();
    // Raid-scale Boss HP & damage calibrated for Recommended Level 60 builds + difficulty preset
    const bossHp = Math.round(120000 * hpMult * Math.pow(1.85, tier - 1));
    const bossDmg = Math.round(
      48 * (1 + (tier - 1) * 0.35) * this.difficultyPreset.enemyDmgMult
    );
    const recommendedLevel = BOSS_RECOMMENDED_LEVEL + (tier - 1) * 15;

    const edata: EnemyData = {
      type: 'boss',
      hp: bossHp,
      maxHp: bossHp,
      speed: Math.round(105 * speedMult),
      damage: bossDmg,
      scoreValue: 1500 * tier,
      gemValue: 45,
      lastAttack: this.time.now,
      knockbackX: 0,
      knockbackY: 0,
      dropsChest: true,
      coinDrops: 30 * tier,
    };
    boss.setData('data', edata);
    boss.setData('bossTier', tier);
    boss.setData('isAttacking', false);
    boss.setData('attackShockwaveDone', false);
    boss.setData('enraged', false);
    boss.setData('lastBossSummon', this.time.now);
    this.activeBoss = boss;

    // Start with boss_idle and randomize start frame
    boss.play('boss_idle');
    boss.anims.setProgress(Math.random());

    // On boss_attack frame index 10: deal area damage, add camera shake, spawn fx_ring shockwave
    boss.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
        if (!boss.active || !boss.scene || this.isDead || !this.sys?.isActive()) return;
        if (_anim.key === 'boss_attack') {
          const fIndex =
            typeof frame.textureFrame === 'number'
              ? frame.textureFrame
              : parseInt(String(frame.textureFrame), 10);
          if (fIndex === 10 || frame.index === 11) {
            if (!boss.getData('attackShockwaveDone')) {
              boss.setData('attackShockwaveDone', true);
              this.triggerBossAreaAttack(boss);
            }
          }
        }
      }
    );

    // Return to boss_idle when boss_attack completes
    boss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (!boss.active || !boss.scene || this.isDead || !this.sys?.isActive()) return;
      if (anim.key === 'boss_attack') {
        boss.setData('isAttacking', false);
        boss.setData('attackShockwaveDone', false);
        boss.play('boss_idle', true);
      }
    });

    const bossDisplayName = tier > 1 ? `The Void Titan Tier ${tier}` : 'The Void Titan';

    gameManager.emitBossUpdate({
      name: bossDisplayName,
      currentHp: bossHp,
      maxHp: bossHp,
      active: true,
      recommendedLevel,
      enraged: false,
    });

    // Clear any lingering wave banner so BossIntroModal owns the warning moment cleanly
    gameManager.emitEventWarning(null);
    this.beginBossIntroPause();
    gameManager.emitBossIntro({
      name: bossDisplayName,
      tier,
      currentHp: bossHp,
      maxHp: bossHp,
      recommendedLevel,
      damage: bossDmg,
    });
  }

  // Triggered on boss_attack frame index 10 (Boss ground slam)
  private triggerBossAreaAttack(boss: Phaser.Physics.Arcade.Sprite) {
    if (!boss || !boss.active || !boss.scene || this.isDead || !this.sys?.isActive()) return;
    const edata = boss.getData('data') as EnemyData | undefined;

    // fx_slam_sheet: 448x252, 14 frames, 14 fps, scaled to 295px damage radius; area damage on frame 8
    this.spawnBossGroundSlam(boss.x, boss.y, 295, edata?.damage ?? 48);

    // Keep fx_ring shockwave as static fallback with ADD blend mode
    const ring = this.add
      .sprite(boss.x, boss.y, 'fx_ring')
      .setDepth(23)
      .setScale(0.2)
      .setAlpha(0.95)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: ring,
      scale: 2.6,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (ring.scene) ring.destroy();
      },
    });

    // Particle burst with ADD blend mode
    this.spawnParticleBurst(boss.x, boss.y, 16, 'fx_spark', 100, 260, 0.2, 0.45, 0xff4466);
  }

  // -------------------------------------------------------------
  // Damage & Combat Interactions
  // -------------------------------------------------------------
  private handleProjectileEnemyOverlap(proj: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.isDead || this.isGamePaused || !this.sys?.isActive()) return;
    if (!proj || !proj.active || !proj.scene || !enemy || !enemy.active || !enemy.scene) return;
    const pdata = proj.getData('data') as ProjectileData;
    if (!pdata || pdata.isEnemy) return;

    // Knockback vector
    const angle = Math.atan2(pdata.vy, pdata.vx);
    const kx = Math.cos(angle) * 140;
    const ky = Math.sin(angle) * 140;

    this.damageEnemy(enemy, pdata.damage, pdata.isCrit, kx, ky);

    // Light hit sparks only when Gore is Off (otherwise blood splash renders inside damageEnemy)
    if (gameManager.getGoreLevel() === 'off') {
      this.spawnParticleBurst(proj.x, proj.y, 6, 'fx_spark', 80, 200, 0.15, 0.35);
    }

    pdata.pierce--;
    if (pdata.pierce <= 0) {
      this.releasePlayerProjectile(proj);
    }
  }

  private damageEnemy(
    enemy: Phaser.Physics.Arcade.Sprite,
    damage: number,
    isCrit: boolean = false,
    knockbackX: number = 0,
    knockbackY: number = 0,
    canChain: boolean = true
  ) {
    if (!enemy || !enemy.active || !enemy.scene || this.isDead || !this.sys?.isActive()) return;
    const edata = enemy.getData('data') as EnemyData;
    if (!edata || edata.hp <= 0) return;

    edata.hp -= damage;
    this.damageDealt += damage;
    this.recentDamageLog.push({ timeMs: this.time.now, amount: damage });
    soundManager.playEnemyHit(isCrit);

    // Blood splash on enemy hit scaled to monster size (falls back to light sparks if Gore is Off)
    const enemyDisplaySize = (enemy.displayWidth + enemy.displayHeight) * 0.5;
    this.spawnEnemyHitBloodSplash(
      enemy.x,
      enemy.y,
      edata.type,
      knockbackX,
      knockbackY,
      isCrit,
      enemyDisplaySize
    );

    // fx_lightning_sheet: chain lightning between enemies (stretched in X, 0.25s per hit)
    if (canChain && Math.random() < 0.65) {
      this.triggerChainLightning(enemy, Math.round(damage * 0.7));
    }

    // Check that enemy wasn't already killed/destroyed inside chain reaction
    if (!enemy.active || !enemy.scene || edata.hp <= 0) {
      if (edata.hp <= 0 && enemy.active && enemy.scene) {
        this.killEnemy(enemy, edata);
      }
      return;
    }

    // Apply knockback
    const resist = edata.type === 'boss' ? 0.01 : edata.type === 'brute' || edata.isElite ? 0.25 : 1;
    edata.knockbackX += knockbackX * resist;
    edata.knockbackY += knockbackY * resist;

    // Color-flash on hit (golden/crimson burst for critical hits, crisp white flash otherwise)
    const isHeavyEnemy = Boolean(edata.isElite || edata.type === 'boss');
    if (isCrit) {
      enemy.setTint(isHeavyEnemy ? 0xff4d5a : 0xf2a93b);
      gameManager.emitCritImpact({
        damage,
        x: enemy.x,
        y: enemy.y,
        isEliteOrBoss: isHeavyEnemy,
        enemyType: edata.type,
        enemyDisplaySize,
      });
    } else {
      enemy.setTint(0xffffff);
    }

    edata.tintResetAtMs = this.time.now + (isCrit ? 95 : 70);

    // Spawn floating damage text
    this.showDamageNumber(enemy.x, enemy.y - 20, damage, isCrit);
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, edata: EnemyData) {
    this.enemiesKilled++;
    bestiary.recordKill(edata.type);
    dailyMissions.recordIncrement('kill_enemies', 1);
    achievements.recordIncrement('totalKills', 1);
    if (edata.isElite) {
      dailyMissions.recordIncrement('kill_elites', 1);
      achievements.recordIncrement('elitesSlain', 1);
    }
    if (edata.type === 'boss') {
      dailyMissions.recordIncrement('kill_bosses', 1);
      achievements.recordIncrement('bossesDefeated', 1);
    }

    if (this.playerStats.eliteKillHeal > 0 && (edata.isElite || edata.type === 'boss')) {
      const prevHp = this.playerStats.currentHp;
      this.playerStats.currentHp = Math.min(
        this.playerStats.maxHp,
        this.playerStats.currentHp + this.playerStats.eliteKillHeal
      );
      const healed = Math.round(this.playerStats.currentHp - prevHp);
      if (healed > 0) {
        this.showFloatingCallout(this.player.x, this.player.y - 36, `+${healed} HP`, '#6ee7b7');
      }
    }
    soundManager.playEnemyDeath();

    // Update kill combo streak (x1 to x5) and reset 3s decay timer
    this.comboKills++;
    this.comboTimerMs = SPAWN_TIMELINE.combo.decayMs;
    const thresholds = SPAWN_TIMELINE.combo.killThresholds;
    let mult = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (this.comboKills >= thresholds[i]) {
        mult = i + 1;
      }
    }
    this.comboMultiplier = Math.min(SPAWN_TIMELINE.combo.maxMultiplier, mult);

    // fx_death_sheet: faint glow on enemy death (30% alpha, 60% scale)
    this.spawnDeathEffect(enemy.x, enemy.y, edata.type, enemy.scale);

    // Enemy death gore, variant chips/embers/mist & floor stain decals
    this.spawnEnemyDeathGore(enemy.x, enemy.y, edata.type, enemy.scale, Boolean(edata.isElite));

    // Drop XP Gem (+50% during Darkness Falls event; Elites scatter extra bonus XP orbs)
    const xpMult =
      this.darknessFallsTimerMs > 0 ? 1 + LIGHT.progression.darknessFalls.xpDropBonus : 1;
    const gemXp = Math.max(1, Math.round(edata.gemValue * xpMult));
    this.spawnPickup(enemy.x, enemy.y, 'gem', gemXp);
    if (edata.isElite) {
      const bonusOrbXp = Math.max(3, Math.round(gemXp * 0.45));
      for (let i = 0; i < ELITE_VARIANTS.bonusXpOrbs; i++) {
        const angle = (i * Math.PI * 2) / ELITE_VARIANTS.bonusXpOrbs + Math.random() * 0.6;
        this.spawnPickup(
          enemy.x + Math.cos(angle) * 24,
          enemy.y + Math.sin(angle) * 24,
          'gem',
          bonusOrbXp
        );
      }
      const totalEliteXp = gemXp + bonusOrbXp * ELITE_VARIANTS.bonusXpOrbs;
      this.showFloatingCallout(enemy.x, enemy.y - 34, `ELITE +${totalEliteXp} XP`, '#f2a93b');
    }

    // Soul Coins (guaranteed for Elites/Brutes/Bosses or chance roll)
    const coinRoll = Math.random();
    const coinChance = 0.18 * this.playerStats.coinMultiplier;
    if (edata.coinDrops || coinRoll < coinChance || edata.type === 'brute' || edata.type === 'boss') {
      const coinCount =
        edata.coinDrops ?? (edata.type === 'boss' ? 12 : edata.type === 'brute' ? 2 : 1);
      for (let i = 0; i < coinCount; i++) {
        const ox = enemy.x + Phaser.Math.Between(-25, 25);
        const oy = enemy.y + Phaser.Math.Between(-25, 25);
        this.spawnPickup(ox, oy, 'coin', 1);
      }
    }

    // Elite & Boss chest drop (guaranteed upgrade on pickup)
    if (edata.dropsChest) {
      this.spawnPickup(enemy.x + 14, enemy.y - 10, 'chest', 1);
    }

    // Elites drop a Light Shard (+35% light radius for 15s)
    if (edata.isElite) {
      this.spawnPickup(enemy.x - 16, enemy.y - 10, 'light_shard', 1);
    }

    // Red Shards occasionally drop from Brutes, Spitters, and rare Imps (heals + temporary +15% DMG)
    const redShardChance =
      edata.type === 'brute' ? 0.2 : edata.type === 'spitter' ? 0.14 : edata.type === 'imp' ? 0.03 : 0;
    if (redShardChance > 0 && Math.random() < redShardChance) {
      this.spawnPickup(enemy.x + 12, enemy.y + 12, 'red_shard', 1);
    }

    // Dynamic Challenge kill / boss completion checks
    if (this.activeChallenge && this.activeChallenge.status === 'active') {
      if (this.activeChallenge.id === 'cull_the_horde') {
        this.activeChallenge.progress++;
        this.activeChallenge.statusNote = formatChallengeProgressText(this.activeChallenge);
        if (this.activeChallenge.progress >= this.activeChallenge.targetValue) {
          this.completeDynamicChallenge();
        }
      } else if (this.activeChallenge.id === 'stand_firm' && this.isStandingReady) {
        this.activeChallenge.progress++;
        this.activeChallenge.statusNote = formatChallengeProgressText(this.activeChallenge);
        if (this.activeChallenge.progress >= this.activeChallenge.targetValue) {
          this.completeDynamicChallenge();
        }
      } else if (this.activeChallenge.id === 'no_red_shards' && edata.type === 'boss') {
        this.activeChallenge.progress = 1;
        this.completeDynamicChallenge();
      }
    }

    // Boss defeat clears boss HUD & switches back to intense/gameplay music so survival run continues
    if (edata.type === 'boss') {
      this.activeBoss = null;
      gameManager.emitBossUpdate(null);
      soundManager.playLevelUp();
      if (this.runTime >= SPAWN_TIMELINE.feel.intenseMusicTimeSec) {
        this.hasCrossfadedToIntense = true;
        soundManager.playIntense();
      } else {
        soundManager.playGameplay();
      }
      this.tweens.killTweensOf(enemy);
      enemy.off(Phaser.Animations.Events.ANIMATION_UPDATE);
      enemy.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
      enemy.destroy();
      return;
    }

    this.releaseEnemy(enemy);
  }

  private triggerBloodFogWave(tier: number): void {
    const t = Math.max(1, tier);
    this.bloodFogTier = t;
    const mods = this.getBloodFogModifiers(t);
    this.bloodFogTimerMs = mods.durationMs;

    this.screenEdgeFlashAlpha = 0.95;
    soundManager.playBossWarning();
    this.showFloatingCallout(
      this.player.x,
      this.player.y - 54,
      `BLOOD FOG · WAVE ${t} (LV.${t * HORDE_FRENZY.levelInterval})`,
      '#ff4d5a'
    );

    // Spawn an immediate surrounding surge wave scaling up each 10-level Blood Fog cycle
    const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();
    const diff = getDifficultyConfig(this.runTime);
    const surgeCount = Math.min(
      14,
      Math.max(4, Math.round((4 + t * 2) * this.difficultyPreset.spawnDensityMult))
    );
    for (let i = 0; i < surgeCount; i++) {
      if (this.enemiesGroup.countActive(true) >= HORDE_FRENZY.maxActiveEnemiesOverride) break;
      const ang = (i / surgeCount) * Math.PI * 2 + Math.random() * 0.25;
      const dist = Phaser.Math.Between(460, 580);
      const enemyType = pickEnemyTypeFromWeights(diff.enemyWeights);
      this.spawnEnemyAt(
        this.player.x + Math.cos(ang) * dist,
        this.player.y + Math.sin(ang) * dist,
        enemyType,
        hpMult,
        dmgMult,
        speedMult
      );
    }

    if (!this.pendingEvent) {
      const speedPct = Math.round((mods.speedMult - 1) * 100);
      const densityPct = Math.round((mods.densityMult - 1) * 100);
      const hpPct = Math.round((mods.hpMult - 1) * 100);
      const durSec = Math.round(mods.durationMs / 1000);
      gameManager.emitEventWarning({
        title: `BLOOD FOG · WAVE ${t}`,
        subtitle: `Lv.${t * HORDE_FRENZY.levelInterval} Escalation (${durSec}s) — Speed +${speedPct}% · HP +${hpPct}% · Horde +${densityPct}%`,
      });
      this.bloodFogBannerTimerMs = 3200;
    }
  }

  // -------------------------------------------------------------
  // Pickups (XP Gems [12s expiry], Coins, Light Shards, Red Shards & Upgrade Chests)
  // -------------------------------------------------------------
  private spawnPickup(
    x: number,
    y: number,
    type: 'gem' | 'coin' | 'chest' | 'light_shard' | 'red_shard',
    value: number
  ) {
    // Cap active XP gems and Coins to keep overlap physics & memory bounded in long runs
    if ((type === 'gem' || type === 'coin') && this.pickupsGroup) {
      const cap = type === 'gem' ? this.MAX_ACTIVE_XP_GEMS : this.MAX_ACTIVE_COINS;
      const pickups = this.pickupsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      let itemCount = 0;
      let mergeTarget: Phaser.Physics.Arcade.Sprite | null = null;
      let minDistSq = Infinity;
      for (let i = 0; i < pickups.length; i++) {
        const item = pickups[i];
        if (!item || !item.active || !item.scene || item.getData('type') !== type) continue;
        itemCount++;
        const dx = item.x - x;
        const dy = item.y - y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          minDistSq = dSq;
          mergeTarget = item;
        }
      }
      if (itemCount >= cap && mergeTarget) {
        mergeTarget.setData('value', ((mergeTarget.getData('value') as number) || 1) + value);
        mergeTarget.setData('life', 0);
        return;
      }
    }

    const texture =
      type === 'chest'
        ? 'pickup_chest'
        : type === 'light_shard'
          ? 'pickup_light_shard'
          : type === 'red_shard'
            ? 'pickup_red_shard'
            : type;
    const baseScale =
      type === 'chest'
        ? 1.0
        : type === 'light_shard' || type === 'red_shard'
          ? 0.95
          : type === 'coin'
            ? 0.38
            : 0.36;

    const pickup = this.acquirePickup(x, y, texture);
    pickup.setDepth(
      type === 'chest' || type === 'light_shard' || type === 'red_shard' ? 19 : 17
    );
    pickup.setScale(baseScale);
    pickup.setAlpha(1);
    pickup.setData('type', type);
    pickup.setData('value', value);
    pickup.setData('life', 0);
    pickup.setData('baseScale', baseScale);
  }

  private updatePickups(delta: number) {
    if (!this.pickupsGroup) return;
    const pickups = [...(this.pickupsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
    const magnetDist = this.playerStats.magnetRadius;
    const magnetDistSq = magnetDist * magnetDist;
    const dtSec = delta * 0.001;
    const pulseWave = Math.sin(this.time.now * 0.006) * 0.08;

    for (let i = 0; i < pickups.length; i++) {
      const p = pickups[i];
      if (!p || !p.active || !p.scene) continue;
      const type = p.getData('type') as 'gem' | 'coin' | 'chest' | 'light_shard' | 'red_shard';

      // XP gems expire after 12s, Red Shards after 16s, Coins after 45s
      if (type === 'gem' || type === 'red_shard' || type === 'coin') {
        const expireMs =
          type === 'red_shard'
            ? 16000
            : type === 'coin'
              ? 45000
              : SPAWN_TIMELINE.pressure.gemExpireMs;
        const life = ((p.getData('life') as number) || 0) + delta;
        if (life >= expireMs) {
          this.releasePickup(p);
          continue;
        }
        p.setData('life', life);
        if (life >= expireMs - 3000) {
          p.setAlpha(Math.sin(life * 0.025) > 0 ? 0.9 : 0.25);
        }
      }

      if (type === 'chest' || type === 'light_shard' || type === 'red_shard') {
        const baseScale = (p.getData('baseScale') as number) || 0.95;
        p.setScale(baseScale * (1 + pulseWave));
      }

      if (type !== 'chest' && type !== 'red_shard') {
        const dx = this.player.x - p.x;
        const dy = this.player.y - p.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= magnetDistSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const spd = Phaser.Math.Linear(300, 750, 1 - dist / magnetDist);
          const step = (spd * dtSec) / dist;
          p.x += dx * step;
          p.y += dy * step;
        }
      }
    }
  }

  private handlePlayerPickupOverlap(_player: Phaser.Physics.Arcade.Sprite, pickup: Phaser.Physics.Arcade.Sprite) {
    if (this.isDead || this.isGamePaused || !this.sys?.isActive()) return;
    if (!pickup || !pickup.active || !pickup.scene) return;
    const type = pickup.getData('type');
    const value = pickup.getData('value') || 1;

    if (type === 'gem') {
      soundManager.playGemCollect();
      this.spawnGemCollectEffect(pickup.x, pickup.y);
      this.addXp(value * this.comboMultiplier);
      this.spawnParticleBurst(pickup.x, pickup.y, 4, 'fx_spark', 50, 120, 0.12, 0.22, 0x00ffff);
    } else if (type === 'coin') {
      soundManager.playCoinCollect();
      const scaledCoins = Math.max(1, Math.round(value * this.difficultyPreset.coinMultiplier));
      this.coinsEarned += scaledCoins;
      dailyMissions.recordIncrement('collect_coins', scaledCoins);
      achievements.recordIncrement('totalCoinsEarned', scaledCoins);
      this.spawnParticleBurst(pickup.x, pickup.y, 5, 'fx_spark', 60, 140, 0.15, 0.28, 0xffd700);
      if (this.activeChallenge?.status === 'active' && this.activeChallenge.id === 'no_coin_greed') {
        this.failDynamicChallenge('Collected a Soul Coin');
      }
    } else if (type === 'light_shard') {
      soundManager.playGemCollect();
      soundManager.playLightning();
      this.lightShardTimerMs = LIGHT.progression.lightShard.durationMs;
      this.spawnParticleBurst(pickup.x, pickup.y, 18, 'fx_spark', 90, 240, 0.2, 0.42, 0x5de4ff);
      const bonusPct = Math.round(LIGHT.progression.lightShard.radiusBonus * 100);
      this.showFloatingCallout(this.player.x, this.player.y - 44, `+${bonusPct}% LIGHT!`, '#5de4ff');
      if (this.activeChallenge?.status === 'active' && this.activeChallenge.id === 'light_purist') {
        this.failDynamicChallenge('Picked up Light Shard');
      }
      this.emitStatsUpdate();
    } else if (type === 'red_shard') {
      soundManager.playGemCollect();
      this.redShardsPickedCount++;
      this.playerStats.currentHp = Math.min(this.playerStats.maxHp, this.playerStats.currentHp + 18);
      this.redShardTimerMs = 12000;
      if (!this.isRedShardBuffActive) {
        this.isRedShardBuffActive = true;
        this.playerStats.damageMultiplier += 0.15;
      }
      this.spawnParticleBurst(pickup.x, pickup.y, 18, 'fx_spark', 90, 240, 0.2, 0.42, 0xe5303a);
      this.showFloatingCallout(this.player.x, this.player.y - 44, '+18 HP · +15% DMG', '#e5303a');
      if (this.activeChallenge?.status === 'active' && this.activeChallenge.id === 'no_red_shards') {
        this.failDynamicChallenge('Picked up Red Shard');
      }
      this.emitStatsUpdate();
    } else if (type === 'chest') {
      soundManager.playCoinCollect();
      this.spawnParticleBurst(pickup.x, pickup.y, 24, 'fx_ring', 90, 220, 0.25, 0.45, 0xf2a93b);
      this.releasePickup(pickup);
      this.triggerLevelUp();
      return;
    }

    this.releasePickup(pickup);
  }

  // -------------------------------------------------------------
  // XP & Level Up System
  // -------------------------------------------------------------
  private computeNextLevelXp(
    newLevel: number,
    prevRequiredXp: number
  ): { nextXp: number; isMilestoneGap: boolean } {
    const isMilestoneGap =
      newLevel > 0 && newLevel % BALANCE.xp.milestoneInterval === 0;

    if (isMilestoneGap) {
      const tier = Math.floor(newLevel / BALANCE.xp.milestoneInterval);
      const milestoneXp =
        Math.round(prevRequiredXp * BALANCE.xp.milestoneMultiplier) +
        BALANCE.xp.milestoneFlatPerTier * tier;
      return {
        nextXp: Math.max(prevRequiredXp + BALANCE.xp.milestoneFlatPerTier, milestoneXp),
        isMilestoneGap: true,
      };
    }

    const scaledNext =
      Math.round(prevRequiredXp * BALANCE.xp.xpGrowthMultiplier) +
      BALANCE.xp.xpFlatIncrement;
    return {
      nextXp: Math.max(prevRequiredXp + BALANCE.xp.xpFlatIncrement, scaledNext),
      isMilestoneGap: false,
    };
  }

  private addXp(amount: number) {
    this.currentXp += Math.max(1, Math.round(amount * (1 + this.xpMultiplierBonus)));
    if (this.currentXp >= this.nextLevelXp) {
      this.currentXp -= this.nextLevelXp;
      this.playerLevel++;
      dailyMissions.recordMax('reach_level', this.playerLevel);
      achievements.recordMax('highestLevel', this.playerLevel);

      const { nextXp, isMilestoneGap } = this.computeNextLevelXp(
        this.playerLevel,
        this.nextLevelXp
      );
      this.nextLevelXp = nextXp;

      if (isMilestoneGap) {
        this.showFloatingCallout(
          this.player.x,
          this.player.y - 66,
          `LV.${this.playerLevel} · HARDCORE XP SURGE!`,
          '#f2a93b'
        );
      }

      const nextBloodFogTier = Math.floor(this.playerLevel / HORDE_FRENZY.levelInterval);
      if (nextBloodFogTier > this.lastTriggeredBloodFogTier) {
        this.lastTriggeredBloodFogTier = nextBloodFogTier;
        this.pendingBloodFogTier = nextBloodFogTier;
      }

      this.triggerLevelUp();
    }
  }

  private triggerLevelUp() {
    if (this.isDead || this.isGamePaused || !this.sys?.isActive() || !this.player?.active) return;
    this.levelUpPulseSeq++;
    soundManager.playLevelUp();
    haptics.onLevelUp();
    this.spawnLevelUpRingEffect(this.player.x, this.player.y);
    this.cameras.main.flash(300, 255, 255, 255);

    // Light Burst upgrade: level-up pulse also damages and knocks back enemies it touches
    if (this.hasLightBurst) {
      const burstRadius = LIGHT.progression.lightBurst.radius;
      const burstDamage = Math.round(
        (LIGHT.progression.lightBurst.baseDamage +
          this.playerLevel * LIGHT.progression.lightBurst.damagePerPlayerLevel) *
          this.playerStats.damageMultiplier
      );
      const knockbackForce = LIGHT.progression.lightBurst.knockback;
      const enemies = [...(this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
      for (const e of enemies) {
        if (!e || !e.active || !e.scene) continue;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
        if (dist <= burstRadius) {
          const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
          this.damageEnemy(
            e,
            burstDamage,
            false,
            Math.cos(ang) * knockbackForce,
            Math.sin(ang) * knockbackForce,
            false
          );
        }
      }
      this.spawnParticleBurst(this.player.x, this.player.y, 28, 'fx_ring', 180, 380, 0.25, 0.55, 0x5de4ff);
      soundManager.playRingPulse();
    }

    // 0.3s slow-mo (tracked & guarded against scene destruction)
    this.time.timeScale = 0.25;
    if (this.levelUpSlowMoTimer !== null) {
      window.clearTimeout(this.levelUpSlowMoTimer);
    }
    this.levelUpSlowMoTimer = window.setTimeout(() => {
      this.levelUpSlowMoTimer = null;
      if (this.sys?.isActive() && this.time) {
        this.time.timeScale = 1.0;
      }
    }, 300);

    this.spawnParticleBurst(this.player.x, this.player.y, 35, 'fx_spark', 120, 320, 0.25, 0.5);

    // Pause physics and present 3 upgrade cards
    this.isGamePaused = true;
    this.physics.pause();

    const options = getAvailableUpgrades(
      this.weapons,
      this.playerLevel,
      this.multishotLevel,
      {
        multishotMaxLevel: BALANCE.multishot.maxLevel,
        multishotDamagePenaltyPerLevel: BALANCE.multishot.damagePenaltyPerLevel,
        cardCount: BALANCE.levelUp.cardCount,
        minWeaponOrUpgradeCards: BALANCE.levelUp.minWeaponOrUpgradeCards,
        brighterLanternMaxLevel: LIGHT.progression.brighterLantern.maxLevel,
        brighterLanternBonusPerLevel: LIGHT.progression.brighterLantern.bonusPerLevel,
      },
      {
        brighterLanternLevel: this.brighterLanternLevel,
        hasLightBurst: this.hasLightBurst,
        hasNightEyes: this.hasNightEyes,
      }
    );

    const challengeOffer =
      !this.activeChallenge && this.playerLevel >= 2
        ? pickDynamicChallengeOffer({
            playerLevel: this.playerLevel,
            redShardsPicked: this.redShardsPickedCount,
            bossSpawned: this.bossSpawned,
            completedIds: this.completedChallengeIds,
          })
        : null;
    this.pendingOfferedChallenge = challengeOffer;

    gameManager.emitLevelUp(options, challengeOffer);
  }

  // Called when player selects an upgrade card in React UI
  public applyUpgrade(option: UpgradeOption, acceptChallenge: boolean = false) {
    switch (option.id) {
      case 'multishot':
        this.multishotLevel = Math.min(BALANCE.multishot.maxLevel, this.multishotLevel + 1);
        break;
      case 'bolt_damage':
        if (this.weapons['bolt']) {
          this.weapons['bolt'].damage = Math.round(this.weapons['bolt'].damage * 1.25);
          this.weapons['bolt'].level++;
        }
        break;
      case 'bolt_cooldown':
        if (this.weapons['bolt']) {
          this.weapons['bolt'].cooldown = Math.round(this.weapons['bolt'].cooldown * 0.75);
          this.weapons['bolt'].level++;
        }
        break;
      case 'bolt_overcharge':
        if (this.weapons['bolt']) {
          this.weapons['bolt'].damage = Math.round(this.weapons['bolt'].damage * 1.3);
          this.playerStats.projectilePierce += 1;
          this.weapons['bolt'].level++;
        }
        break;

      case 'blades_unlock':
        if (this.weapons['blades']) {
          this.weapons['blades'].unlocked = true;
          this.weapons['blades'].level = 1;
          this.syncSpectralBlades();
        }
        break;
      case 'blades_extra':
        if (this.weapons['blades']) {
          this.weapons['blades'].level++;
          this.syncSpectralBlades();
        }
        break;
      case 'blades_damage':
        if (this.weapons['blades']) {
          this.weapons['blades'].damage = Math.round(this.weapons['blades'].damage * 1.3);
          this.weapons['blades'].level++;
        }
        break;

      case 'ring_unlock':
        if (this.weapons['ring']) {
          this.weapons['ring'].unlocked = true;
          this.weapons['ring'].level = 1;
          this.nextRingPulse = this.simTimeMs + 1000;
        }
        break;
      case 'ring_area':
      case 'ring_cooldown':
        if (this.weapons['ring']) {
          this.weapons['ring'].level++;
          this.weapons['ring'].damage = Math.round(this.weapons['ring'].damage * 1.25);
          this.weapons['ring'].cooldown = Math.round(this.weapons['ring'].cooldown * 0.8);
        }
        break;

      case 'spark_unlock':
        if (this.weapons['spark']) {
          this.weapons['spark'].unlocked = true;
          this.weapons['spark'].level = 1;
          this.nextSparkBurst = this.simTimeMs + 1200;
        }
        break;
      case 'spark_count':
      case 'spark_pierce':
        if (this.weapons['spark']) {
          this.weapons['spark'].level++;
          this.weapons['spark'].damage = Math.round(this.weapons['spark'].damage * 1.25);
        }
        break;

      case 'shotgun_unlock':
        if (this.weapons['shotgun']) {
          this.weapons['shotgun'].unlocked = true;
          this.weapons['shotgun'].level = 1;
          this.nextShotgunBlast = this.simTimeMs + 800;
        }
        break;
      case 'shotgun_damage':
        if (this.weapons['shotgun']) {
          this.weapons['shotgun'].damage = Math.round(this.weapons['shotgun'].damage * 1.25);
          this.weapons['shotgun'].level++;
        }
        break;
      case 'shotgun_cooldown':
        if (this.weapons['shotgun']) {
          this.weapons['shotgun'].cooldown = Math.round(this.weapons['shotgun'].cooldown * 0.8);
          this.weapons['shotgun'].level++;
        }
        break;

      case 'stat_vitality':
        this.playerStats.maxHp += 25;
        this.playerStats.currentHp = Math.min(this.playerStats.maxHp, this.playerStats.currentHp + 35);
        break;
      case 'stat_speed':
        this.playerStats.moveSpeed = Math.round(this.playerStats.moveSpeed * 1.12);
        break;
      case 'stat_might':
        this.playerStats.damageMultiplier += 0.15;
        break;
      case 'stat_magnet':
        this.playerStats.magnetRadius = Math.round(this.playerStats.magnetRadius * 1.4);
        break;
      case 'stat_cooldown':
        this.playerStats.cooldownMultiplier = Math.max(0.35, this.playerStats.cooldownMultiplier - 0.1);
        break;
      case 'stat_crit':
        this.playerStats.critChance += 0.12;
        this.playerStats.critMultiplier += 0.3;
        break;
      case 'light_lantern':
        this.brighterLanternLevel = Math.min(
          LIGHT.progression.brighterLantern.maxLevel,
          this.brighterLanternLevel + 1
        );
        break;
      case 'light_burst':
        this.hasLightBurst = true;
        break;
      case 'light_night_eyes':
        this.hasNightEyes = true;
        break;
    }

    if (acceptChallenge && this.pendingOfferedChallenge && !this.activeChallenge) {
      this.activeChallenge = createActiveDynamicChallenge(this.pendingOfferedChallenge);
      this.showFloatingCallout(
        this.player.x,
        this.player.y - 52,
        `PACT: ${this.activeChallenge.title.toUpperCase()}`,
        '#f2a93b'
      );
    }
    this.pendingOfferedChallenge = null;

    // Unpause game completely unless BossIntroModal is currently holding the dramatic pause
    if (!this.isBossIntroPaused) {
      this.resumeGame();
    }
    if (this.pendingBloodFogTier > 0) {
      const waveTier = this.pendingBloodFogTier;
      this.pendingBloodFogTier = 0;
      this.triggerBloodFogWave(waveTier);
    }
    this.emitStatsUpdate();
  }

  private completeDynamicChallenge() {
    if (!this.activeChallenge || this.activeChallenge.status !== 'active') return;
    const challenge = this.activeChallenge;
    challenge.status = 'completed';
    challenge.statusNote = formatChallengeProgressText(challenge);
    this.challengeBannerTimerMs = 3400;
    this.challengesCompletedCount++;
    this.completedChallengeIds.add(challenge.id);

    this.coinsEarned += challenge.rewardCoins;
    dailyMissions.recordIncrement('collect_coins', challenge.rewardCoins);
    achievements.recordIncrement('totalCoinsEarned', challenge.rewardCoins);

    switch (challenge.id) {
      case 'no_red_shards':
        this.playerStats.damageMultiplier += 0.15;
        break;
      case 'no_coin_greed':
        this.xpMultiplierBonus += 0.15;
        break;
      case 'untouchable':
        this.playerStats.moveSpeed = Math.round(this.playerStats.moveSpeed * 1.12);
        break;
      case 'stand_firm':
        this.playerStats.cooldownMultiplier = Math.max(0.35, this.playerStats.cooldownMultiplier - 0.1);
        break;
      case 'cull_the_horde':
        this.playerStats.critChance += 0.1;
        break;
      case 'light_purist':
        this.playerStats.maxHp += 25;
        this.playerStats.currentHp = Math.min(this.playerStats.maxHp, this.playerStats.currentHp + 25);
        break;
    }

    soundManager.playCoinCollect();
    haptics.onMissionComplete();
    this.showFloatingCallout(
      this.player.x,
      this.player.y - 54,
      `PACT CLEARED! +${challenge.rewardCoins} COINS`,
      '#f2a93b'
    );
    this.emitStatsUpdate();
  }

  private failDynamicChallenge(reason: string) {
    if (!this.activeChallenge || this.activeChallenge.status !== 'active') return;
    this.activeChallenge.status = 'failed';
    this.activeChallenge.statusNote = reason;
    this.challengeBannerTimerMs = 2600;
    haptics.tap('heavy');
    this.showFloatingCallout(this.player.x, this.player.y - 52, `PACT FAILED: ${reason}`, '#e5303a');
    this.emitStatsUpdate();
  }

  // -------------------------------------------------------------
  // Player Damage & Death
  // -------------------------------------------------------------
  private handlePlayerEnemyOverlap(_player: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (this.isInvulnerable || this.isDead || this.isGamePaused || !this.sys?.isActive()) return;
    if (!enemy || !enemy.active || !enemy.scene) return;
    const edata = enemy.getData('data') as EnemyData;
    if (!edata) return;

    this.damagePlayer(edata.damage);
  }

  private damagePlayer(amount: number) {
    if (this.isInvulnerable || this.isDead || this.isGamePaused || !this.sys?.isActive()) return;

    // Blend by playing attack only while the player is not hit, then return to walk
    if (this.isAttacking) {
      this.isAttacking = false;
      this.muzzleFiredThisAttack = false;
      if (this.isMoving) {
        this.player.play('walk', true);
      } else {
        this.player.anims.stop();
        this.player.setTexture('player_walk', 0);
        this.startPlayerBobbing(false);
      }
    }

    this.playerStats.currentHp -= amount;
    soundManager.playPlayerHurt();
    haptics.onPlayerHit();

    if (this.activeChallenge?.status === 'active' && this.activeChallenge.id === 'untouchable') {
      this.failDynamicChallenge('Took damage');
    }

    // Hitstop & Incoming Damage-Scaled Camera Shake
    this.hitstopTimer = 50;
    this.cameraController.shakeOnDamage(amount, this.playerStats.maxHp);

    // Invulnerability period (0.4s managed cleanly by invulnTimerMs in update)
    this.isInvulnerable = true;
    this.invulnTimerMs = SPAWN_TIMELINE.pressure.hitInvulnMs;
    this.player.setTint(0xff3333);

    this.tweens.add({
      targets: this.player,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.player && this.player.active && this.player.scene) {
          this.player.setAlpha(1);
        }
      },
    });

    if (this.playerStats.currentHp <= 0) {
      this.playerStats.currentHp = 0;
      this.handlePlayerDeath();
    }

    this.emitStatsUpdate();
  }

  private handlePlayerDeath() {
    if (this.isDead || !this.sys?.isActive()) return;

    // Check Undying Ember (Revival meta upgrade)
    if (this.playerStats.hasRevive && !this.playerStats.usedRevive) {
      this.playerStats.usedRevive = true;
      this.playerStats.currentHp = Math.max(1, Math.round(this.playerStats.maxHp * 0.5));
      this.isDead = false;
      this.isAttacking = false;
      this.muzzleFiredThisAttack = false;
      this.isInvulnerable = true;
      this.invulnTimerMs = 1800;

      if (this.player && this.player.active && this.player.scene) {
        this.tweens.killTweensOf(this.player);
        this.player.setAlpha(1);
        this.player.setScale(this.PLAYER_SCALE);
        this.player.setTint(0xf2a93b);
        this.startPlayerBobbing(this.isMoving);
      }

      soundManager.playRevival();
      this.cameras.main.flash(500, 255, 255, 255);
      this.spawnParticleBurst(this.player.x, this.player.y, 40, 'fx_ring', 140, 300, 0.3, 0.6);
      this.showFloatingCallout(this.player.x, this.player.y - 54, 'UNDYING EMBER!', '#f2a93b');

      // Push all nearby enemies away
      const enemies = [...(this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[])];
      for (const e of enemies) {
        if (!e || !e.active || !e.scene) continue;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
        const edata = e.getData('data') as EnemyData;
        if (edata) {
          edata.knockbackX = Math.cos(angle) * 380;
          edata.knockbackY = Math.sin(angle) * 380;
        }
      }
      this.emitStatsUpdate();
      return;
    }

    // Run Over
    this.isDead = true;
    this.isAttacking = false;
    if (this.player?.anims) {
      this.player.anims.stop();
    }
    this.physics.pause();

    soundManager.playGameOverStinger();

    // Bank earned coins & flush Daily Missions + Bestiary on run completion
    saveCoins(getSavedCoins() + this.coinsEarned);
    dailyMissions.recordIncrement('play_runs', 1);
    achievements.recordIncrement('runsCompleted', 1);
    dailyMissions.flush();
    achievements.flush();
    bestiary.flush();

    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        if (!this.sys?.isActive()) return;
        const stats: RunStats = {
          timeSurvived: Math.floor(this.runTime),
          enemiesKilled: this.enemiesKilled,
          coinsEarned: this.coinsEarned,
          levelReached: this.playerLevel,
          damageDealt: this.damageDealt,
          victory: false,
          challengesCompleted: this.challengesCompletedCount,
          difficulty: this.difficultyPreset.id,
        };
        gameManager.emitGameOver(stats);
      },
    });
  }

  // -------------------------------------------------------------
  // Helpers & UI Bridge
  // -------------------------------------------------------------
  private getNearestEnemy(range: number): Phaser.Physics.Arcade.Sprite | null {
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let minDistSq = range * range;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearest = e;
      }
    }
    return nearest;
  }

  private initFloatingTextPool() {
    this.floatingTexts = [];
    for (let i = 0; i < this.MAX_FLOATING_TEXTS; i++) {
      const text = this.add.text(0, 0, '', {
        fontFamily: 'Almendra, Spectral, Georgia, serif',
        fontStyle: '700',
        fontSize: '16px',
        color: '#ffffff',
        stroke: '#0b0d12',
        strokeThickness: 4,
      });
      text.setOrigin(0.5, 0.5);
      text.setDepth(30);
      text.setActive(false);
      text.setVisible(false);
      text.disableInteractive();

      this.floatingTexts.push({
        text,
        inUse: false,
        spawnTime: 0,
        life: 0,
        maxLife: 600,
        vx: 0,
        vy: 0,
        gravity: 95,
        baseScale: 1,
        popScale: 1.2,
      });
    }
  }

  private acquireFloatingText(): FloatingText | null {
    if (this.floatingTexts.length === 0) return null;

    const poolCap =
      gameManager.getQualityTier() === 'low'
        ? Math.min(this.LOW_QUALITY_MAX_FLOATING_TEXTS, this.floatingTexts.length)
        : this.floatingTexts.length;

    let oldest = this.floatingTexts[0];
    for (let i = 0; i < poolCap; i++) {
      const slot = this.floatingTexts[i];
      if (!slot.inUse) {
        return slot;
      }
      if (slot.spawnTime < oldest.spawnTime) {
        oldest = slot;
      }
    }

    return oldest;
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean) {
    const slot = this.acquireFloatingText();
    if (!slot) return;

    const rounded = Math.max(1, Math.round(damage));
    slot.inUse = true;
    slot.spawnTime = this.time.now;
    slot.life = 0;
    slot.maxLife = isCrit ? 680 : 560;
    slot.vx = Phaser.Math.FloatBetween(-26, 26);
    slot.vy = isCrit ? -96 : -76;
    slot.gravity = 105;
    slot.baseScale = isCrit ? 1.18 : 0.88;
    slot.popScale = isCrit ? 1.52 : 1.1;

    slot.text.setPosition(x + Phaser.Math.FloatBetween(-8, 8), y);
    slot.text.setText(isCrit ? `${rounded}!` : `${rounded}`);
    slot.text.setColor(isCrit ? '#f2a93b' : '#ffffff');
    slot.text.setDepth(isCrit ? 31 : 30);
    slot.text.setScale(slot.popScale);
    slot.text.setAlpha(1);
    slot.text.setActive(true);
    slot.text.setVisible(true);
  }

  private updateFloatingTexts(delta: number) {
    const dtSec = delta * 0.001;
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const item = this.floatingTexts[i];
      if (!item.inUse) continue;

      item.life += delta;
      if (item.life >= item.maxLife) {
        item.inUse = false;
        item.text.setActive(false);
        item.text.setVisible(false);
        continue;
      }

      item.text.x += item.vx * dtSec;
      item.text.y += item.vy * dtSec;
      item.vy += item.gravity * dtSec;

      const popProgress = Math.min(1, item.life / 110);
      item.text.setScale(Phaser.Math.Linear(item.popScale, item.baseScale, popProgress));

      const lifeProgress = item.life / item.maxLife;
      const alpha = lifeProgress > 0.62 ? Math.max(0, 1 - (lifeProgress - 0.62) / 0.38) : 1;
      item.text.setAlpha(alpha);
    }
  }

  private showFloatingCallout(x: number, y: number, label: string, color: string = '#5de4ff') {
    const slot = this.acquireFloatingText();
    if (!slot) return;

    slot.inUse = true;
    slot.spawnTime = this.time.now;
    slot.life = 0;
    slot.maxLife = 650;
    slot.vx = 0;
    slot.vy = -52;
    slot.gravity = 30;
    slot.baseScale = 0.85;
    slot.popScale = 1.02;

    slot.text.setPosition(x, y);
    slot.text.setText(label);
    slot.text.setColor(color);
    slot.text.setDepth(31);
    slot.text.setScale(slot.popScale);
    slot.text.setAlpha(1);
    slot.text.setActive(true);
    slot.text.setVisible(true);
  }

  private emitStatsUpdate() {
    const now = this.time.now;
    const windowMs = 3000;
    // In-place compaction + sum (zero temporary filter array allocation)
    let writeIdx = 0;
    let recentDamageSum = 0;
    const log = this.recentDamageLog;
    for (let i = 0; i < log.length; i++) {
      const entry = log[i];
      if (now - entry.timeMs <= windowMs) {
        log[writeIdx++] = entry;
        recentDamageSum += entry.amount;
      }
    }
    log.length = writeIdx;

    const fps = Math.round(this.game?.loop?.actualFps || 0);
    const enemyCount = this.enemiesGroup ? this.enemiesGroup.countActive(true) : 0;
    const killsPerMin = this.runTime > 1 ? Math.round((this.enemiesKilled / this.runTime) * 60) : 0;
    const playerDps = Math.round(recentDamageSum / (windowMs / 1000));
    const currentMinute = Math.floor(this.runTime / 60);

    const dashCooldownProgress =
      this.dashChargesRemaining < this.playerStats.dashCharges && this.playerStats.dashCooldownMs > 0
        ? Math.min(1, this.dashRechargeTimerMs / this.playerStats.dashCooldownMs)
        : 1;

    gameManager.emitStats({
      hp: this.playerStats.currentHp,
      maxHp: this.playerStats.maxHp,
      xp: this.currentXp,
      nextXp: this.nextLevelXp,
      level: this.playerLevel,
      time: Math.floor(this.runTime),
      kills: this.enemiesKilled,
      coins: this.coinsEarned,
      weapons: Object.values(this.weapons),
      combo: this.comboMultiplier,
      isUnderPressure: this.isUnderPressure,
      lightShardRemainingSec:
        this.lightShardTimerMs > 0 ? Math.ceil(this.lightShardTimerMs / 1000) : 0,
      redShardRemainingSec:
        this.redShardTimerMs > 0 ? Math.ceil(this.redShardTimerMs / 1000) : 0,
      darknessFallsRemainingSec:
        this.darknessFallsTimerMs > 0 ? Math.ceil(this.darknessFallsTimerMs / 1000) : 0,
      bloodFogRemainingSec:
        this.bloodFogTimerMs > 0 ? Math.ceil(this.bloodFogTimerMs / 1000) : 0,
      bloodFogTier: this.bloodFogTier,
      difficulty: this.difficultyPreset.id,
      activeChallenge: this.activeChallenge ? { ...this.activeChallenge } : null,
      dashCharges: this.dashChargesRemaining,
      maxDashCharges: this.playerStats.dashCharges,
      dashCooldownProgress,
      equippedRelicIds: this.playerStats.equippedRelicIds,
      activeRelicSynergies: this.playerStats.activeRelicSynergies,
      debug: {
        fps,
        enemyCount,
        killsPerMin,
        playerDps,
        currentMinute,
      },
    });
  }

  private getLightRadiusMultiplier(): number {
    const lanternMult =
      1 + this.brighterLanternLevel * LIGHT.progression.brighterLantern.bonusPerLevel;
    const shardMult =
      this.lightShardTimerMs > 0 ? 1 + LIGHT.progression.lightShard.radiusBonus : 1;
    const darknessFallsMult =
      this.darknessFallsTimerMs > 0 ? 1 - LIGHT.progression.darknessFalls.radiusPenalty : 1;
    const relicMult = this.playerStats?.lightRadiusMultiplier ?? 1;
    return lanternMult * shardMult * darknessFallsMult * relicMult;
  }

  private getPlayerLanternLightRadius(): number {
    const standBonus = this.isStandingReady ? 1 + LIGHT.player.standingBonusRatio : 1;
    return LIGHT.player.baseRadius * standBonus * this.getLightRadiusMultiplier();
  }

  public setWaitingForLoading(waiting: boolean) {
    if (!this.sys?.isActive()) return;
    this.isWaitingForLoading = waiting;
    if (waiting) {
      if (this.physics?.world) this.physics.pause();
      if (this.time) this.time.paused = true;
    } else if (!this.isGamePaused && !this.isDead) {
      if (this.physics?.world) this.physics.resume();
      if (this.time) this.time.paused = false;
    }
  }

  // Dramatic brief freeze on boss arrival (keeps boss roar & boss music playing)
  public beginBossIntroPause() {
    if (!this.sys?.isActive() || this.isDead) return;
    if (this.levelUpSlowMoTimer !== null) {
      window.clearTimeout(this.levelUpSlowMoTimer);
      this.levelUpSlowMoTimer = null;
    }
    this.time.timeScale = 1.0;
    this.isBossIntroPaused = true;
    this.isGamePaused = true;
    this.hitstopTimer = 0;
    this.isHitstopPausedPhysics = false;
    this.physics.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
  }

  public endBossIntroPause() {
    this.isBossIntroPaused = false;
    if (!this.sys?.isActive() || this.isDead || this.isWaitingForLoading) return;
    this.resumeGame();
  }

  // Comprehensive pause / resume (physics, timers, tweens, animations, darkness, audio)
  public pauseGame() {
    if (!this.sys?.isActive()) return;
    if (this.levelUpSlowMoTimer !== null) {
      window.clearTimeout(this.levelUpSlowMoTimer);
      this.levelUpSlowMoTimer = null;
    }
    this.time.timeScale = 1.0;
    this.isGamePaused = true;
    this.hitstopTimer = 0;
    this.isHitstopPausedPhysics = false;
    dailyMissions.flush();
    achievements.flush();
    bestiary.flush();
    this.physics.pause();
    this.time.paused = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
    if (this.scene.isActive('DarknessScene')) {
      this.scene.pause('DarknessScene');
    }
    soundManager.pauseAudio();
    gameManager.emitPauseState(true);
  }

  public resumeGame() {
    if (!this.sys?.isActive() || this.isDead) return;
    if (this.levelUpSlowMoTimer !== null) {
      window.clearTimeout(this.levelUpSlowMoTimer);
      this.levelUpSlowMoTimer = null;
    }
    this.isBossIntroPaused = false;
    this.time.timeScale = 1.0;
    this.isGamePaused = false;
    this.physics.resume();
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    if (this.scene.isPaused('DarknessScene')) {
      this.scene.resume('DarknessScene');
    }
    this.scene.bringToTop('DarknessScene');
    this.scene.bringToTop('UIScene');
    soundManager.resumeAudio();
    gameManager.emitPauseState(false);
  }

  // Read-only lighting snapshot consumed once per frame by DarknessScene
  public getLightingData() {
    return {
      player: this.player,
      isStandingReady: this.isStandingReady,
      currentHp: this.playerStats ? this.playerStats.currentHp : BALANCE.player.startingHp,
      maxHp: this.playerStats ? this.playerStats.maxHp : BALANCE.player.startingHp,
      activeBoss: this.activeBoss,
      enemiesGroup: this.enemiesGroup,
      pickupsGroup: this.pickupsGroup,
      projectilesGroup: this.projectilesGroup,
      effectPool: this.effectPool,
      orbitingBlades: this.orbitingBlades,
      torches: this.shadowSystem ? this.shadowSystem.getTorchesSnapshot() : null,
      pillars: this.shadowSystem ? this.shadowSystem.getPillarsSnapshot() : null,
      levelUpPulseSeq: this.levelUpPulseSeq,
      lightRadiusMultiplier: this.getLightRadiusMultiplier(),
      hasNightEyes: this.hasNightEyes,
      isDarknessFallsActive: this.darknessFallsTimerMs > 0,
      isBloodFogActive: this.bloodFogTimerMs > 0,
      isGamePaused: this.isGamePaused,
      isDead: this.isDead,
    };
  }
}
