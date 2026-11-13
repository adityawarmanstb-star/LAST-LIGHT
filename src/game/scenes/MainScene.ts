import Phaser from 'phaser';
import { soundManager } from '../audio';
import { gameManager } from '../GameManager';
import { calculateBasePlayerStats, saveCoins, getSavedCoins } from '../metaProgression';
import { dailyMissions } from '../dailyMissions';
import { haptics } from '../../mobile/haptics';
import { CameraController } from '../CameraController';
import { AtmosphereOverlay } from '../AtmosphereOverlay';
import {
  ActiveDynamicChallenge,
  BossInfo,
  DynamicChallengeOffer,
  PlayerStats,
  RunStats,
  UpgradeOption,
  WeaponState,
} from '../types';
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
    xpGrowthMultiplier: 1.15,       // +15% more XP needed each level
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
export const ORBIT_BLADES_NEED_STANDING = true;

// =========================================================================
// LIMITED-VISION DARKNESS & LIGHTING CONSTANTS
// =========================================================================
export const LIGHT = {
  renderTextureScale: 0.5,         // Half-resolution RenderTexture scaled 2x
  maxLightSources: 12,             // Hard cap on active light sources per frame
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

  // Enemy Projectile & Ghost Trail Pools
  private enemyProjectilePool: Phaser.Physics.Arcade.Sprite[] = [];
  private enemyTrailPool: Phaser.GameObjects.Sprite[] = [];
  private readonly MAX_ENEMY_PROJECTILES = 24;
  private readonly MAX_ENEMY_TRAILS = 64;

  // Skill & Impact Effect Pool (Cap at 40 active effects)
  private effectPool: EffectPoolItem[] = [];
  private readonly MAX_ACTIVE_EFFECTS = 40;

  // Groups
  private enemiesGroup!: Phaser.Physics.Arcade.Group;
  private projectilesGroup!: Phaser.Physics.Arcade.Group;
  private pickupsGroup!: Phaser.Physics.Arcade.Group;

  // Camera & Atmosphere controllers
  private cameraController!: CameraController;
  private atmosphereOverlay: AtmosphereOverlay | null = null;

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
    ESC: Phaser.Input.Keyboard.Key;
  };

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

  // State flags
  private isGamePaused: boolean = false;
  private hitstopTimer: number = 0;
  private levelUpPulseSeq: number = 0;
  private lastMissionSecondRecorded: number = 0;
  private lowFpsDurationMs: number = 0;
  private readonly LOW_FPS_THRESHOLD = 45;
  private readonly LOW_FPS_TRIGGER_MS = 3000;
  private readonly LOW_QUALITY_MAX_PARTICLES = 90;

  constructor() {
    super('MainScene');
  }

  init() {
    this.isDead = false;
    this.isGamePaused = false;
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
    this.floatingTexts = [];
    this.atmosphereOverlay = null;
    this.lastMissionSecondRecorded = 0;
    this.lowFpsDurationMs = 0;
    gameManager.setQualityTier('high');
    dailyMissions.ensureToday();
  }

  preload() {
    // Load player spritesheets (frame size 234x218)
    this.load.spritesheet('player_walk', './assets/aistudio/player_walk_sheet_bb06b026.png', {
      frameWidth: 234,
      frameHeight: 218,
    });
    this.load.spritesheet('player_attack', './assets/aistudio/player_attack_sheet_dd4b205b.png', {
      frameWidth: 234,
      frameHeight: 218,
    });

    // Load monster spritesheets
    this.load.spritesheet('brute_walk_sheet', './assets/aistudio/brute_walk_sheet_1167a56d.png', {
      frameWidth: 300,
      frameHeight: 222,
    });
    this.load.spritesheet('imp_run_sheet', './assets/aistudio/imp_run_sheet_6bc12170.png', {
      frameWidth: 344,
      frameHeight: 197,
    });
    this.load.spritesheet('spitter_walk_sheet', './assets/aistudio/spitter_walk_sheet_be385db7.png', {
      frameWidth: 183,
      frameHeight: 273,
    });
    this.load.spritesheet('boss_idle_sheet', './assets/aistudio/boss_idle_sheet_45eee864.png', {
      frameWidth: 409,
      frameHeight: 253,
    });
    this.load.spritesheet('boss_attack_sheet', './assets/aistudio/boss_attack_sheet_8e2697fa.png', {
      frameWidth: 409,
      frameHeight: 253,
    });

    // Load all actual sprite attachments (keep fx_bolt and fx_ring as static fallbacks)
    this.load.image('player', './assets/aistudio/player_d0a77e5b.png');
    this.load.image('floor', './assets/aistudio/floor_2087ed42.png');
    this.load.image('enemy_wisp', './assets/aistudio/enemy_wisp_7d3c48f3.png');
    this.load.image('enemy_imp', './assets/aistudio/enemy_imp_60271be1.png');
    this.load.image('enemy_spitter', './assets/aistudio/enemy_spitter_51ce3872.png');
    this.load.image('enemy_brute', './assets/aistudio/enemy_brute_01eebbc9.png');
    this.load.image('boss', './assets/aistudio/boss_a9bb7d84.png');
    this.load.image('gem', './assets/aistudio/gem_dc28f9c8.png');
    this.load.image('coin', './assets/aistudio/coin_3bd84bab.png');
    this.load.image('fx_blade', './assets/aistudio/fx_blade_16a5dfcb.png');
    this.load.image('fx_bolt', './assets/aistudio/fx_bolt_be8b486b.png');
    this.load.image('fx_ring', './assets/aistudio/fx_ring_7bdbb43c.png');
    this.load.image('fx_spark', './assets/aistudio/fx_spark_3ee901cb.png');

    // Load Skill / Impact FX Spritesheets (replaced with new sheets)
    this.load.spritesheet('fx_spark_sheet', './assets/aistudio/fx_spark_sheet_cecbd959.png', {
      frameWidth: 192,
      frameHeight: 108,
    });
    this.load.spritesheet('fx_death_sheet', './assets/aistudio/fx_death_sheet_bc303348.png', {
      frameWidth: 384,
      frameHeight: 216,
    });
    this.load.spritesheet('fx_ring_sheet', './assets/aistudio/fx_ring_sheet_84634a3f.png', {
      frameWidth: 512,
      frameHeight: 288,
    });
    this.load.spritesheet('fx_slam_sheet', './assets/aistudio/fx_slam_sheet_61043650.png', {
      frameWidth: 448,
      frameHeight: 252,
    });
    this.load.spritesheet('fx_gem_sheet', './assets/aistudio/fx_gem_sheet_a8e4a0d7.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.spritesheet('fx_blade_sheet', './assets/aistudio/fx_blade_sheet_3e86389b.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('fx_blade_spin_sheet', './assets/aistudio/fx_blade_spin_sheet_46489d73.png', {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet('fx_lightning_sheet', './assets/aistudio/fx_lightning_sheet_03b57c80.png', {
      frameWidth: 384,
      frameHeight: 216,
    });
    this.load.spritesheet('fx_spitter_orb_sheet', './assets/aistudio/fx_spitter_orb_sheet_2e4ec3af.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
  }

  create() {
    gameManager.activeScene = this;

    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Infinite scrolling ground TileSprite (non-interactive to never block inputs)
    this.floor = this.add.tileSprite(0, 0, width, height, 'floor')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(0);
    this.floor.disableInteractive();

    // 2. Groups
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();
    this.pickupsGroup = this.physics.add.group();

    // 3. Object Pools: 200 Particles (ADD blend mode) & Floating Combat Text
    this.initParticlePool();
    this.initFloatingTextPool();

    // 4. Initialize Player Stats from Meta Progression & BALANCE starting HP
    this.playerStats = calculateBasePlayerStats();
    const vitalityScale = this.playerStats.maxHp / 100;
    this.playerStats.maxHp = Math.round(BALANCE.player.startingHp * vitalityScale);
    this.playerStats.currentHp = this.playerStats.maxHp;

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

    // fx_blade_spin_sheet: 256x256, 16 frames, 20 fps, loop, orbiting blade weapon (full 360 rotation baked in sheet)
    this.anims.create({
      key: 'fx_blade_spin_anim',
      frames: this.anims.generateFrameNumbers('fx_blade_spin_sheet', { start: 0, end: 15 }),
      frameRate: 20,
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

    // Camera controller with smooth player follow & damage/boss-proximity shake
    this.cameraController = new CameraController(this.cameras.main);
    this.cameraController.followTarget(this.player, true, 0.1, 0.1);

    // Trigger muzzle effect and camera shake on attack frame 2
    this.player.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
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

    // 7. Light Vignette / Lantern Glow Layer & Dynamic Weather/Time-of-Day Atmosphere Overlay
    this.lightVignette = this.add.graphics().setDepth(15).setScrollFactor(0);
    this.lightVignette.disableInteractive();
    this.atmosphereOverlay = new AtmosphereOverlay(this);

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

    // Clean up activeScene reference and atmosphere graphics on shutdown/restart
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      dailyMissions.flush();
      this.atmosphereOverlay?.destroy();
      this.atmosphereOverlay = null;
      if (gameManager.activeScene === this) {
        gameManager.activeScene = null;
      }
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
        description: 'Ethereal blades that orbit the lantern.',
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
          p.vx *= 0.95;
          p.vy *= 0.95;
          const progress = p.life / p.maxLife;
          p.sprite.setAlpha(1 - progress);
        }
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
    item.sprite.off(Phaser.Animations.Events.ANIMATION_UPDATE);
    item.sprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    item.sprite.anims.stop();
    item.sprite.setVisible(false);
    item.sprite.setActive(false);
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

    const sc = (enemyScale || 0.45) * 2.0;

    item.sprite.setPosition(x, y);
    item.sprite.setOrigin(0.5, 0.5);
    item.sprite.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    item.sprite.setScale(sc);
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
      this.releasePooledEffect(item);
    });
  }

  private triggerChainLightning(source: Phaser.Physics.Arcade.Sprite, chainDamage: number) {
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let target: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDist = 260;

    for (const e of enemies) {
      if (!e.active || e === source) continue;
      const d = Phaser.Math.Distance.Between(source.x, source.y, e.x, e.y);
      if (d < closestDist) {
        closestDist = d;
        target = e;
      }
    }

    if (target) {
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
    if (this.muzzleFiredThisAttack) return;
    this.muzzleFiredThisAttack = true;

    // Small camera shake on attack frame 2
    this.cameraController.triggerShake(90, 0.003);

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
      onComplete: () => flash.destroy(),
    });

    // Particle burst of sparks
    this.spawnParticleBurst(mx, my, 8, 'fx_spark', 90, 220, 0.2, 0.4, 0x66ffff);
  }

  // -------------------------------------------------------------
  // Main Update Loop
  // -------------------------------------------------------------
  update(time: number, rawDelta: number) {
    if (this.isDead || this.isGamePaused) return;

    // Auto-quality monitor: reduce particle density & darkness RT resolution if FPS < 45 for 3s
    const currentFps = this.game?.loop?.actualFps || 0;
    if (currentFps > 0 && currentFps < this.LOW_FPS_THRESHOLD) {
      this.lowFpsDurationMs += rawDelta;
      if (this.lowFpsDurationMs >= this.LOW_FPS_TRIGGER_MS && gameManager.getQualityTier() !== 'low') {
        gameManager.setQualityTier('low');
      }
    } else {
      this.lowFpsDurationMs = 0;
    }

    // Clamp delta time to avoid frame skips
    const delta = Math.min(rawDelta, 50);

    // Hitstop handling
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      return;
    }

    this.runTime += delta / 1000;
    const wholeSec = Math.floor(this.runTime);
    if (wholeSec > this.lastMissionSecondRecorded) {
      this.lastMissionSecondRecorded = wholeSec;
      dailyMissions.recordMax('survive_seconds', wholeSec);
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

    // 1. Update Floor TileSprite to follow camera
    this.floor.tilePositionX = this.cameras.main.scrollX;
    this.floor.tilePositionY = this.cameras.main.scrollY;

    // 2. Handle Player Movement (WASD + Arrows + Virtual Joystick)
    this.updatePlayerMovement(delta);

    // 3. Update Lantern Light Overlay (includes pressure, low-HP heartbeat, and event edge flash)
    this.updateLanternOverlay();

    // 4. Weapons Update & Auto-Fire
    this.updateWeapons(time);

    // 5. Update Orbiting Blades
    this.updateOrbitingBlades(delta);

    // 6. Update Telegraphs (0.5s ground red lines/circles)
    this.updateTelegraphs(delta);

    // 7. Update Projectiles
    this.updateProjectiles(delta);

    // 8. Update Enemies & AI
    this.updateEnemies(time, delta);

    // 9. Update Pickups Magnet & 12s Gem Expiry
    this.updatePickups(delta);

    // 10. Update Particles
    this.updateParticles(delta);

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

    // 13. Enemy Spawning & Timeline Events
    this.handleEnemySpawning(time);

    // 14. Periodic Stats Sync with UI (every ~100ms)
    if (time - this.lastStatsEmitMs >= 100) {
      this.lastStatsEmitMs = time;
      this.emitStatsUpdate();
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

  private updatePlayerMovement(delta: number) {
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
      this.stanceRingAlpha = Phaser.Math.Linear(this.stanceRingAlpha, targetAlpha, 0.25);
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
  }

  // -------------------------------------------------------------
  // Lantern Glow Overlay, Low-HP Heartbeat, Pressure Aura & Edge Flash
  // -------------------------------------------------------------
  private updateLanternOverlay() {
    this.lightVignette.clear();
    const w = this.scale.width;
    const h = this.scale.height;

    // Screen-space position of player
    const px = this.player.x - this.cameras.main.scrollX;
    const py = this.player.y - this.cameras.main.scrollY;

    const pulse = this.lanternPulse.alpha; // 0.6 <-> 1.0
    const lightMult = this.getLightRadiusMultiplier();

    // Soft cyan lantern glow pulses (alpha 0.6 <-> 1.0); global darkness is handled by DarknessScene
    this.lightVignette.fillStyle(0x22d3ee, 0.05 * pulse);
    this.lightVignette.fillCircle(px, py, 280 * lightMult);

    this.lightVignette.fillStyle(0x38bdf8, 0.08 * pulse);
    this.lightVignette.fillCircle(px, py, 190 * lightMult);

    this.lightVignette.fillStyle(0x67e8f9, 0.14 * pulse);
    this.lightVignette.fillCircle(px, py, 100 * lightMult);

    this.lightVignette.fillStyle(0xcffafe, 0.22 * pulse);
    this.lightVignette.fillCircle(px, py, 40 * lightMult);

    // "Pressure" aura when standing still >4s
    const targetPressureAlpha = this.isUnderPressure ? 1 : 0;
    this.pressureAuraAlpha = Phaser.Math.Linear(this.pressureAuraAlpha, targetPressureAlpha, 0.08);
    if (this.pressureAuraAlpha > 0.02) {
      const wave = 0.65 + 0.35 * Math.sin(this.time.now * 0.008);
      const pAlpha = this.pressureAuraAlpha * 0.32 * wave;
      this.lightVignette.lineStyle(22, 0xc44cff, pAlpha * 0.6);
      this.lightVignette.strokeRect(0, 0, w, h);
      this.lightVignette.lineStyle(8, 0xe5484d, pAlpha);
      this.lightVignette.strokeRect(0, 0, w, h);
    }

    // Low-HP (<40%) slowly reddening vignette with heartbeat-like double pulse
    const hpRatio = this.playerStats.currentHp / Math.max(1, this.playerStats.maxHp);
    const targetLowHp =
      hpRatio < SPAWN_TIMELINE.feel.lowHpThreshold
        ? (SPAWN_TIMELINE.feel.lowHpThreshold - hpRatio) / SPAWN_TIMELINE.feel.lowHpThreshold
        : 0;
    this.lowHpVignetteAlpha = Phaser.Math.Linear(this.lowHpVignetteAlpha, targetLowHp, 0.03);
    if (this.lowHpVignetteAlpha > 0.01) {
      const beatPhase = (this.time.now % SPAWN_TIMELINE.feel.heartbeatPeriodMs) / SPAWN_TIMELINE.feel.heartbeatPeriodMs;
      // Double-thump heartbeat envelope (lub-dub)
      const lub = Math.exp(-Math.pow((beatPhase - 0.14) / 0.06, 2));
      const dub = 0.75 * Math.exp(-Math.pow((beatPhase - 0.32) / 0.06, 2));
      const heartbeat = 0.45 + 0.55 * Math.min(1, lub + dub);
      const edgeAlpha = this.lowHpVignetteAlpha * 0.45 * heartbeat;
      this.lightVignette.lineStyle(48, 0x991b1b, edgeAlpha * 0.45);
      this.lightVignette.strokeRect(0, 0, w, h);
      this.lightVignette.lineStyle(18, 0xe5484d, edgeAlpha * 0.8);
      this.lightVignette.strokeRect(0, 0, w, h);
    }

    // Event warning screen-edge red flash
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

    // 2. Radiant Nova: Periodic holy ring pulse
    const ring = this.weapons['ring'];
    if (ring && ring.unlocked) {
      const effectiveCooldown = ring.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextRingPulse) {
        this.fireRadiantRing();
        this.nextRingPulse = time + effectiveCooldown;
      }
    }

    // 3. Spark Burst: Periodic radial spark nova
    const spark = this.weapons['spark'];
    if (spark && spark.unlocked) {
      const effectiveCooldown = spark.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextSparkBurst) {
        this.fireSparkBurst();
        this.nextSparkBurst = time + effectiveCooldown;
      }
    }

    // 4. Radiant Scatter: Shotgun fires 3 cyan fx_bolt projectiles in a narrow spread
    const shotgun = this.weapons['shotgun'];
    if (shotgun && shotgun.unlocked) {
      const effectiveCooldown = shotgun.cooldown * this.playerStats.cooldownMultiplier;
      if (time >= this.nextShotgunBlast) {
        this.fireShotgunCone();
        this.nextShotgunBlast = time + effectiveCooldown;
      }
    }
  }

  // Weapon: Light Bolt
  private fireLightBolt(): boolean {
    const maxRange = this.scale.height * BALANCE.primaryWeapon.rangeScreenHeightRatio;
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

      const proj = this.projectilesGroup.create(this.player.x, this.player.y, 'fx_bolt') as Phaser.Physics.Arcade.Sprite;
      proj.setDepth(22);
      proj.setBlendMode(Phaser.BlendModes.ADD);
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
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }

    return true;
  }

  // Weapon: Radiant Scatter (Fires 3 cyan fx_bolt.png projectiles in a narrow spread)
  private fireShotgunCone() {
    const shotgun = this.weapons['shotgun'];
    if (!shotgun || !shotgun.unlocked) return;

    this.triggerPlayerAttack();
    soundManager.playShoot();

    const range = 300 + shotgun.level * 35;
    const target = this.getNearestEnemy(range + 160);

    const baseAngle = target
      ? Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y)
      : this.player.flipX
        ? Math.PI
        : 0;

    const speed = 480;
    const maxLife = Math.round((range / speed) * 1000) + 150;
    const spreadOffsets = [-0.14, 0, 0.14];

    for (const offset of spreadOffsets) {
      const angle = baseAngle + offset;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.projectilesGroup.create(this.player.x, this.player.y, 'fx_bolt') as Phaser.Physics.Arcade.Sprite;
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
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }
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

    const radius = 95;
    for (let i = 0; i < count; i++) {
      const angle = this.bladeAngle + (i * Math.PI * 2) / count;
      const bx = this.player.x + Math.cos(angle) * radius;
      const by = this.player.y + Math.sin(angle) * radius;

      const blade = this.orbitingBlades[i];
      // Orbit the sprite's POSITION around the player; do not rotate the sprite in code
      blade.setPosition(bx, by);
      blade.setAlpha(canDealDamage ? 1.0 : 0.28);

      if (!canDealDamage) continue;

      // Slicing check on nearby enemies (only while standing still if ORBIT_BLADES_NEED_STANDING)
      const nearby = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      for (const enemy of nearby) {
        if (!enemy.active) continue;
        const dist = Phaser.Math.Distance.Between(bx, by, enemy.x, enemy.y);
        if (dist < 45) {
          const lastHit = enemy.getData('lastBladeHit') || 0;
          const now = this.time.now;
          if (now - lastHit > 280) {
            enemy.setData('lastBladeHit', now);
            const dmg = Math.round(blades.damage * this.playerStats.damageMultiplier);
            this.damageEnemy(enemy, dmg, false, Math.cos(angle) * 120, Math.sin(angle) * 120);
            soundManager.playBladeSlash();
            this.spawnSparkHitEffect(bx, by);
          }
        }
      }
    }
  }

  // Weapon: Radiant Ring
  private fireRadiantRing() {
    const ring = this.weapons['ring'];
    if (!ring || !ring.unlocked) return;

    this.triggerPlayerAttack();
    soundManager.playRingPulse();

    const ringSprite = this.add.sprite(this.player.x, this.player.y, 'fx_ring');
    ringSprite.setBlendMode(Phaser.BlendModes.ADD);
    ringSprite.setDepth(21);
    ringSprite.setScale(0.1);
    ringSprite.setAlpha(0.9);

    const maxScale = 1.8 + ring.level * 0.25;
    const maxRadius = maxScale * 140;

    this.tweens.add({
      targets: ringSprite,
      scaleX: maxScale,
      scaleY: maxScale,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        ringSprite.destroy();
      },
    });

    // Damage all enemies in blast radius
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const dmg = Math.round(ring.damage * this.playerStats.damageMultiplier);

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= maxRadius) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        const kx = Math.cos(angle) * 220;
        const ky = Math.sin(angle) * 220;
        this.damageEnemy(enemy, dmg, false, kx, ky);
      }
    }

    this.spawnParticleBurst(this.player.x, this.player.y, 14, 'fx_ring', 90, 200, 0.2, 0.4);
  }

  // Weapon: Spark Burst
  private fireSparkBurst() {
    const spark = this.weapons['spark'];
    if (!spark || !spark.unlocked) return;

    this.triggerPlayerAttack();
    soundManager.playSparkFire();

    const count = 6 + spark.level * 3;
    const dmg = Math.round(spark.damage * this.playerStats.damageMultiplier);
    const speed = 360;

    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + Phaser.Math.FloatBetween(-0.15, 0.15);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const proj = this.projectilesGroup.create(this.player.x, this.player.y, 'fx_spark') as Phaser.Physics.Arcade.Sprite;
      proj.setDepth(22);
      proj.setBlendMode(Phaser.BlendModes.ADD);
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
        maxLife: 1200,
      };
      proj.setData('data', data);
      proj.setVelocity(vx, vy);
    }
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
    const projs = this.projectilesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    let magentaParticlesThisFrame = 0;

    for (const proj of projs) {
      if (!proj.active) continue;
      const data = proj.getData('data') as ProjectileData;
      if (!data) continue;

      data.life += delta;
      if (data.life >= data.maxLife) {
        if (data.isEnemy) {
          this.releaseEnemyProjectile(proj);
        } else {
          proj.destroy();
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
    const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const pressureSpeedFactor = this.isUnderPressure ? 1 + SPAWN_TIMELINE.pressure.enemySpeedBonus : 1;

    if (this.eliteAuraGraphics) {
      this.eliteAuraGraphics.clear();
    }

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const edata = enemy.getData('data') as EnemyData;
      if (!edata) continue;

      // Elite pulsing red glow aura
      if (edata.isElite && this.eliteAuraGraphics) {
        const auraPulse = 0.65 + 0.35 * Math.sin(time * 0.008);
        this.eliteAuraGraphics.fillStyle(0xe5484d, 0.16 * auraPulse);
        this.eliteAuraGraphics.fillCircle(enemy.x, enemy.y, 52 * enemy.scaleX);
        this.eliteAuraGraphics.lineStyle(3, 0xff4d54, 0.55 * auraPulse);
        this.eliteAuraGraphics.strokeCircle(enemy.x, enemy.y, 58 * enemy.scaleX);
      }

      // Handle knockback decay
      if (Math.abs(edata.knockbackX) > 2 || Math.abs(edata.knockbackY) > 2) {
        enemy.x += (edata.knockbackX * delta) / 1000;
        enemy.y += (edata.knockbackY * delta) / 1000;
        edata.knockbackX *= 0.88;
        edata.knockbackY *= 0.88;
      }

      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const effectiveSpeed = edata.speed * pressureSpeedFactor;

      // Stampede linear charge override
      if (edata.chargeTimerMs && edata.chargeTimerMs > 0) {
        edata.chargeTimerMs -= delta;
        const cvx = (edata.chargeVx ?? Math.cos(angle) * effectiveSpeed) * pressureSpeedFactor;
        const cvy = (edata.chargeVy ?? Math.sin(angle) * effectiveSpeed) * pressureSpeedFactor;
        enemy.setVelocity(cvx, cvy);
        enemy.setFlipX(cvx < 0);
        if (edata.type === 'imp' && (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'imp_run')) {
          enemy.play('imp_run', true);
        }
        continue;
      }

      // All standard enemies flip toward the player
      enemy.setFlipX(this.player.x < enemy.x);

      // Enemy specific behaviors
      switch (edata.type) {
        case 'wisp': {
          const phase = (enemy.getData('phase') as number) || 0;
          const hoverOffset = Math.sin(time * 0.007 + phase) * 35;
          const perpAngle = angle + Math.PI / 2;
          enemy.setVelocity(
            Math.cos(angle) * effectiveSpeed + Math.cos(perpAngle) * hoverOffset,
            Math.sin(angle) * effectiveSpeed + Math.sin(perpAngle) * hoverOffset
          );
          break;
        }

        case 'imp': {
          const phase = (enemy.getData('phase') as number) || 0;
          const zigzag = Math.sin(time * 0.012 + phase) * 45;
          const perpAngle = angle + Math.PI / 2;
          enemy.setVelocity(
            Math.cos(angle) * effectiveSpeed + Math.cos(perpAngle) * zigzag,
            Math.sin(angle) * effectiveSpeed + Math.sin(perpAngle) * zigzag
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
          } else if (dist > 300) {
            enemy.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed);
          } else if (dist < 220) {
            enemy.setVelocity(-Math.cos(angle) * effectiveSpeed * 0.8, -Math.sin(angle) * effectiveSpeed * 0.8);
          } else {
            enemy.setVelocity(0, 0);
          }

          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'spitter_walk') {
            enemy.play('spitter_walk', true);
          }

          // Spitter fires dodgeable orb after a 0.5s ground line telegraph
          if (time - edata.lastAttack > 2600 && dist < 440) {
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
          break;
        }

        case 'boss': {
          const isAttacking = (enemy.getData('isAttacking') as boolean) || false;
          if (!isAttacking) {
            enemy.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed);
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== 'boss_idle') {
              enemy.play('boss_idle', true);
            }
          } else {
            enemy.setVelocity(0, 0);
          }

          // Periodic boss ground slam with >=0.5s red ground circle telegraph
          if (!isAttacking && time - edata.lastAttack > 3600) {
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
              radius: 260,
              durationMs: Math.max(550, SPAWN_TIMELINE.pressure.telegraphDurationMs),
              damage: 0,
              speed: 0,
              tint: 0xe5484d,
            });
          } else if (!isAttacking && dist < 560) {
            // Boss ranged void volley with 0.5s line telegraphs
            const lastVolley = (enemy.getData('lastBossVolley') as number) || 0;
            if (time - lastVolley > 2500) {
              enemy.setData('lastBossVolley', time);
              const offsets = [-0.26, 0, 0.26];
              for (const offset of offsets) {
                this.queueTelegraph({
                  kind: 'line',
                  x: enemy.x,
                  y: enemy.y,
                  angle: angle + offset,
                  length: 560,
                  radius: 0,
                  durationMs: SPAWN_TIMELINE.pressure.telegraphDurationMs,
                  damage: Math.round(edata.damage * 0.65),
                  speed: 280,
                  tint: 0xe5484d,
                  sourceEnemy: enemy,
                });
              }
            }
          }

          // Emit boss update to UI
          const bossTier = (enemy.getData('bossTier') as number) || 1;
          gameManager.emitBossUpdate({
            name: bossTier > 1 ? `The Void Titan Tier ${bossTier}` : 'The Void Titan',
            currentHp: Math.max(0, Math.round(edata.hp)),
            maxHp: edata.maxHp,
            active: true,
          });
          break;
        }
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
    let proj = this.enemyProjectilePool.find((p) => !p.active);
    if (!proj) {
      proj = this.projectilesGroup.create(x, y, 'fx_spitter_orb_sheet', 0) as Phaser.Physics.Arcade.Sprite;
      proj.disableInteractive();
      this.enemyProjectilePool.push(proj);
    }
    this.tweens.killTweensOf(proj);
    proj.anims.stop();
    proj.setTexture('fx_spitter_orb_sheet', 0);
    proj.enableBody(true, x, y, true, true);
    proj.setActive(true);
    proj.setVisible(true);
    return proj;
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
  private getTargetOnScreenCount(timeSec: number): number {
    const pts = SPAWN_TIMELINE.pacingTargets;
    if (timeSec <= pts[0].timeSec) {
      return Math.round((pts[0].minTarget + pts[0].maxTarget) * 0.5);
    }
    for (let i = 1; i < pts.length; i++) {
      if (timeSec <= pts[i].timeSec) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const prevVal = (prev.minTarget + prev.maxTarget) * 0.5;
        const currVal = (curr.minTarget + curr.maxTarget) * 0.5;
        const t = (timeSec - prev.timeSec) / Math.max(1, curr.timeSec - prev.timeSec);
        return Math.round(Phaser.Math.Linear(prevVal, currVal, t));
      }
    }
    return SPAWN_TIMELINE.maxActiveEnemies;
  }

  private getTimelineScaling(): { hpMult: number; speedMult: number; dmgMult: number } {
    const minutes = this.runTime / 60;
    const hpMult = 1 + minutes * SPAWN_TIMELINE.enemyScaling.hpGrowthPerMinute;
    const speedMult = Math.min(
      1 + SPAWN_TIMELINE.enemyScaling.maxSpeedBonus,
      1 + minutes * SPAWN_TIMELINE.enemyScaling.speedGrowthPerMinute
    );
    const diff = getDifficultyConfig(this.runTime);
    return { hpMult, speedMult, dmgMult: diff.damageMultiplier };
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
        'Apex dreadnought awakens at the 5-minute mark',
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
          'A stronger Void Titan rises from the abyss',
          () => {
            this.spawnBoss(tier);
          }
        );
      }
    }
  }

  private handleEnemySpawning(time: number) {
    this.handleTimelineEvents();

    const activeCount = this.enemiesGroup.countActive(true);
    if (activeCount >= SPAWN_TIMELINE.maxActiveEnemies) return;

    const targetOnScreen = this.getTargetOnScreenCount(this.runTime);
    const deficit = targetOnScreen - activeCount;

    if (time >= this.nextSpawnTime) {
      const diff = getDifficultyConfig(this.runTime);
      const { hpMult, speedMult, dmgMult } = this.getTimelineScaling();

      // Dynamic interval keeps crowd pacing tightly aligned to targetOnScreen
      const interval = deficit > 6 ? Math.min(diff.spawnIntervalMs, 380) : diff.spawnIntervalMs;
      this.nextSpawnTime = time + interval;

      if (deficit <= 0) return;

      const batchSize = Math.min(
        SPAWN_TIMELINE.maxActiveEnemies - activeCount,
        deficit > 12 ? 4 : deficit > 5 ? 2 : 1,
        Math.max(1, deficit)
      );

      for (let i = 0; i < batchSize; i++) {
        const type = pickEnemyTypeFromWeights(diff.enemyWeights);
        this.spawnRandomEnemy(type, hpMult, dmgMult, speedMult);
      }
    }
  }

  private spawnRandomEnemy(
    type: 'wisp' | 'imp' | 'spitter' | 'brute',
    hpMultiplier: number = 1,
    dmgMultiplier: number = 1,
    speedMultiplier: number = 1
  ) {
    if (this.enemiesGroup.countActive(true) >= SPAWN_TIMELINE.maxActiveEnemies) return;

    // Spawn off-screen around player
    const angle = Math.random() * Math.PI * 2;
    const distance = Phaser.Math.Between(520, 680);
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

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
      scale *= SPAWN_TIMELINE.events.firstElite.scaleMultiplier;
    }

    const hp = Math.max(1, Math.round(baseHp * hpMultiplier));
    const damage = Math.max(1, Math.round(baseDmg * dmgMultiplier));
    const speed = Math.round(baseSpeed * speedMultiplier);

    const enemy = this.enemiesGroup.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    enemy.setDepth(options?.isElite ? 20 : 18);
    enemy.setScale(scale);

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

    const edata: EnemyData = {
      type,
      hp,
      maxHp: hp,
      speed,
      damage,
      scoreValue: options?.isElite ? 160 : type === 'brute' ? 40 : type === 'spitter' ? 25 : 10,
      gemValue: options?.isElite ? 10 : type === 'brute' ? 5 : type === 'spitter' ? 3 : 1,
      lastAttack: 0,
      knockbackX: 0,
      knockbackY: 0,
      isElite: options?.isElite,
      coinDrops: options?.coinDrops,
      dropsChest: options?.dropsChest,
      chargeVx: options?.chargeVx,
      chargeVy: options?.chargeVy,
      chargeTimerMs: options?.chargeTimerMs,
    };
    enemy.setData('data', edata);

    // Randomize phase per enemy so a crowd doesn't move in sync
    enemy.setData('phase', Math.random() * 1000);

    // Play spritesheet animations and randomize start frame so crowds are not in sync
    if (type === 'imp') {
      enemy.play('imp_run');
      enemy.anims.setProgress(Math.random());
    } else if (type === 'brute') {
      enemy.play('brute_walk');
      enemy.anims.setProgress(Math.random());
      enemy.on(
        Phaser.Animations.Events.ANIMATION_UPDATE,
        (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
          const fIdx =
            typeof frame.textureFrame === 'number'
              ? frame.textureFrame
              : parseInt(String(frame.textureFrame), 10);
          if (fIdx === 4 || fIdx === 13) {
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            if (dist < 450) {
              soundManager.playBruteStomp();
            }
          }
        }
      );
    } else if (type === 'spitter') {
      enemy.play('spitter_walk');
      enemy.anims.setProgress(Math.random());
    }

    // Keep Pass 1-4 tweens only where they don't fight sprite animation (wisp has no spritesheet)
    if (type === 'wisp') {
      this.tweens.add({
        targets: enemy,
        scaleX: scale * 0.85,
        duration: 160,
        yoyo: true,
        repeat: -1,
        ease: 'Quad.easeInOut',
        delay: Math.random() * 160,
      });
      this.tweens.add({
        targets: enemy,
        scaleY: scale * 1.06,
        duration: 220,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 220,
      });
    }
  }

  // Boss Spawn (5:00, recurring every 3 minutes, or Summon button)
  public spawnBoss(tier: number = 1) {
    if (this.activeBoss) return;
    this.bossSpawned = true;

    soundManager.playBossWarning();
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

    const { hpMult, speedMult } = this.getTimelineScaling();
    const bossHp = Math.round(6500 * hpMult * Math.pow(1.65, tier - 1));
    const bossDmg = Math.round(35 * (1 + (tier - 1) * 0.3));

    const edata: EnemyData = {
      type: 'boss',
      hp: bossHp,
      maxHp: bossHp,
      speed: Math.round(78 * speedMult),
      damage: bossDmg,
      scoreValue: 500 * tier,
      gemValue: 30,
      lastAttack: this.time.now,
      knockbackX: 0,
      knockbackY: 0,
      dropsChest: true,
      coinDrops: 12,
    };
    boss.setData('data', edata);
    boss.setData('bossTier', tier);
    boss.setData('isAttacking', false);
    boss.setData('attackShockwaveDone', false);
    this.activeBoss = boss;

    // Start with boss_idle and randomize start frame
    boss.play('boss_idle');
    boss.anims.setProgress(Math.random());

    // On boss_attack frame index 10: deal area damage, add camera shake 0.01, spawn fx_ring shockwave
    boss.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (_anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
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
      if (anim.key === 'boss_attack') {
        boss.setData('isAttacking', false);
        boss.setData('attackShockwaveDone', false);
        boss.play('boss_idle', true);
      }
    });

    gameManager.emitBossUpdate({
      name: tier > 1 ? `The Void Titan Tier ${tier}` : 'The Void Titan',
      currentHp: bossHp,
      maxHp: bossHp,
      active: true,
    });
  }

  // Triggered on boss_attack frame index 10 (Boss ground slam)
  private triggerBossAreaAttack(boss: Phaser.Physics.Arcade.Sprite) {
    if (!boss.active) return;
    const edata = boss.getData('data') as EnemyData | undefined;

    // fx_slam_sheet: 448x252, 14 frames, 14 fps, scaled to damage radius; area damage on frame 8
    this.spawnBossGroundSlam(boss.x, boss.y, 260, edata?.damage ?? 35);

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
        ring.destroy();
      },
    });

    // Particle burst with ADD blend mode
    this.spawnParticleBurst(boss.x, boss.y, 16, 'fx_spark', 100, 260, 0.2, 0.45, 0xff4466);
  }

  // -------------------------------------------------------------
  // Damage & Combat Interactions
  // -------------------------------------------------------------
  private handleProjectileEnemyOverlap(proj: Phaser.Physics.Arcade.Sprite, enemy: Phaser.Physics.Arcade.Sprite) {
    if (!proj.active || !enemy.active) return;
    const pdata = proj.getData('data') as ProjectileData;
    if (!pdata || pdata.isEnemy) return;

    // Knockback vector
    const angle = Math.atan2(pdata.vy, pdata.vx);
    const kx = Math.cos(angle) * 140;
    const ky = Math.sin(angle) * 140;

    this.damageEnemy(enemy, pdata.damage, pdata.isCrit, kx, ky);

    // Hit sparks
    this.spawnParticleBurst(proj.x, proj.y, 6, 'fx_spark', 80, 200, 0.15, 0.35);

    pdata.pierce--;
    if (pdata.pierce <= 0) {
      proj.destroy();
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
    const edata = enemy.getData('data') as EnemyData;
    if (!edata) return;

    edata.hp -= damage;
    this.damageDealt += damage;
    this.recentDamageLog.push({ timeMs: this.time.now, amount: damage });
    soundManager.playEnemyHit(isCrit);

    // fx_spark_sheet: on every enemy hit at hit position, random rotation, scale 0.5-1
    this.spawnSparkHitEffect(enemy.x, enemy.y);

    // fx_lightning_sheet: chain lightning between enemies (stretched in X, 0.25s per hit)
    if (canChain && Math.random() < 0.65) {
      this.triggerChainLightning(enemy, Math.round(damage * 0.7));
    }

    // Apply knockback
    const resist = edata.type === 'boss' ? 0.05 : edata.type === 'brute' || edata.isElite ? 0.25 : 1;
    edata.knockbackX += knockbackX * resist;
    edata.knockbackY += knockbackY * resist;

    // White flash on hit
    enemy.setTint(0xffffff);
    this.time.delayedCall(70, () => {
      if (enemy.active) enemy.clearTint();
    });

    // Spawn floating damage text
    this.showDamageNumber(enemy.x, enemy.y - 20, damage, isCrit);

    // Check death
    if (edata.hp <= 0) {
      this.killEnemy(enemy, edata);
    }
  }

  private killEnemy(enemy: Phaser.Physics.Arcade.Sprite, edata: EnemyData) {
    this.enemiesKilled++;
    dailyMissions.recordIncrement('kill_enemies', 1);
    if (edata.isElite) {
      dailyMissions.recordIncrement('kill_elites', 1);
    }
    if (edata.type === 'boss') {
      dailyMissions.recordIncrement('kill_bosses', 1);
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

    // fx_death_sheet: on enemy death, tinted with enemy accent color, scaled to ~2x enemy size
    this.spawnDeathEffect(enemy.x, enemy.y, edata.type, enemy.scale);

    // Death particle burst
    this.spawnParticleBurst(enemy.x, enemy.y, 10, 'fx_spark', 100, 240, 0.2, 0.4);

    // Drop XP Gem (+50% during Darkness Falls event)
    const xpMult =
      this.darknessFallsTimerMs > 0 ? 1 + LIGHT.progression.darknessFalls.xpDropBonus : 1;
    const gemXp = Math.max(1, Math.round(edata.gemValue * xpMult));
    this.spawnPickup(enemy.x, enemy.y, 'gem', gemXp);

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
    }

    enemy.destroy();
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
    const texture =
      type === 'chest'
        ? 'pickup_chest'
        : type === 'light_shard'
          ? 'pickup_light_shard'
          : type === 'red_shard'
            ? 'pickup_red_shard'
            : type;
    const pickup = this.pickupsGroup.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    pickup.setDepth(
      type === 'chest' || type === 'light_shard' || type === 'red_shard' ? 19 : 17
    );
    pickup.setScale(
      type === 'chest'
        ? 1.0
        : type === 'light_shard' || type === 'red_shard'
          ? 0.95
          : type === 'coin'
            ? 0.38
            : 0.36
    );
    pickup.setData('type', type);
    pickup.setData('value', value);
    pickup.setData('life', 0);

    // Gentle pulse tween
    this.tweens.add({
      targets: pickup,
      scaleX: pickup.scaleX * 1.15,
      scaleY: pickup.scaleY * 1.15,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updatePickups(delta: number) {
    const pickups = this.pickupsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
    const magnetDist = this.playerStats.magnetRadius;

    for (const p of pickups) {
      if (!p.active) continue;
      const type = p.getData('type') as 'gem' | 'coin' | 'chest' | 'light_shard' | 'red_shard';

      // XP gems expire after 12 seconds (blink in final 3s); Red Shards expire after 16s
      if (type === 'gem' || type === 'red_shard') {
        const expireMs = type === 'red_shard' ? 16000 : SPAWN_TIMELINE.pressure.gemExpireMs;
        const life = ((p.getData('life') as number) || 0) + delta;
        if (life >= expireMs) {
          p.destroy();
          continue;
        }
        p.setData('life', life);
        if (life >= expireMs - 3000) {
          p.setAlpha(Math.sin(life * 0.025) > 0 ? 0.9 : 0.25);
        }
      }

      if (type !== 'chest' && type !== 'red_shard') {
        const dist = Phaser.Math.Distance.Between(p.x, p.y, this.player.x, this.player.y);
        if (dist <= magnetDist) {
          const angle = Phaser.Math.Angle.Between(p.x, p.y, this.player.x, this.player.y);
          const spd = Phaser.Math.Linear(300, 750, 1 - dist / magnetDist);
          p.x += (Math.cos(angle) * spd * delta) / 1000;
          p.y += (Math.sin(angle) * spd * delta) / 1000;
        }
      }
    }
  }

  private handlePlayerPickupOverlap(_player: Phaser.Physics.Arcade.Sprite, pickup: Phaser.Physics.Arcade.Sprite) {
    if (!pickup.active) return;
    const type = pickup.getData('type');
    const value = pickup.getData('value') || 1;

    if (type === 'gem') {
      soundManager.playGemCollect();
      this.spawnGemCollectEffect(pickup.x, pickup.y);
      this.addXp(value * this.comboMultiplier);
      this.spawnParticleBurst(pickup.x, pickup.y, 4, 'fx_spark', 50, 120, 0.12, 0.22, 0x00ffff);
    } else if (type === 'coin') {
      soundManager.playCoinCollect();
      this.coinsEarned += value;
      dailyMissions.recordIncrement('collect_coins', value);
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
      pickup.destroy();
      this.triggerLevelUp();
      return;
    }

    pickup.destroy();
  }

  // -------------------------------------------------------------
  // XP & Level Up System
  // -------------------------------------------------------------
  private addXp(amount: number) {
    this.currentXp += Math.max(1, Math.round(amount * (1 + this.xpMultiplierBonus)));
    if (this.currentXp >= this.nextLevelXp) {
      this.currentXp -= this.nextLevelXp;
      this.playerLevel++;
      dailyMissions.recordMax('reach_level', this.playerLevel);
      // +15% more XP needed each level
      this.nextLevelXp = Math.round(this.nextLevelXp * BALANCE.xp.xpGrowthMultiplier);
      this.triggerLevelUp();
    }
  }

  private triggerLevelUp() {
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
        if (!e.active) continue;
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

    // 0.3s slow-mo
    this.time.timeScale = 0.25;
    setTimeout(() => {
      this.time.timeScale = 1.0;
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
          this.nextRingPulse = this.time.now + 1000;
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
          this.nextSparkBurst = this.time.now + 1200;
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
          this.nextShotgunBlast = this.time.now + 800;
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

    // Unpause game completely (restoring timers/tweens/anims/DarknessScene if paused during level-up)
    this.resumeGame();
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
    if (this.isInvulnerable || this.isDead || !enemy.active) return;
    const edata = enemy.getData('data') as EnemyData;
    if (!edata) return;

    this.damagePlayer(edata.damage);
  }

  private damagePlayer(amount: number) {
    if (this.isInvulnerable || this.isDead) return;

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
        if (this.player.active) {
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
    this.isDead = true;
    this.isAttacking = false;
    this.player.anims.stop();

    // Check Undying Ember (Revival meta upgrade)
    if (this.playerStats.hasRevive && !this.playerStats.usedRevive) {
      this.playerStats.usedRevive = true;
      this.playerStats.currentHp = Math.round(this.playerStats.maxHp * 0.5);

      soundManager.playRevival();
      this.cameras.main.flash(500, 255, 255, 255);
      this.spawnParticleBurst(this.player.x, this.player.y, 40, 'fx_ring', 140, 300, 0.3, 0.6);

      // Push all nearby enemies away
      const enemies = this.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      for (const e of enemies) {
        if (!e.active) continue;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
        const edata = e.getData('data') as EnemyData;
        if (edata) {
          edata.knockbackX = Math.cos(angle) * 380;
          edata.knockbackY = Math.sin(angle) * 380;
        }
      }
      return;
    }

    // Run Over
    this.isDead = true;
    this.physics.pause();

    soundManager.playGameOverStinger();

    // Bank earned coins & flush Daily Missions on run completion
    saveCoins(getSavedCoins() + this.coinsEarned);
    dailyMissions.recordIncrement('play_runs', 1);
    dailyMissions.flush();

    this.tweens.add({
      targets: this.player,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 800,
      ease: 'Power2',
      onComplete: () => {
        const stats: RunStats = {
          timeSurvived: Math.floor(this.runTime),
          enemiesKilled: this.enemiesKilled,
          coinsEarned: this.coinsEarned,
          levelReached: this.playerLevel,
          damageDealt: this.damageDealt,
          victory: false,
          challengesCompleted: this.challengesCompletedCount,
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
    let minDist = range;

    for (const e of enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  private initFloatingTextPool() {
    this.floatingTexts = [];
    for (let i = 0; i < this.MAX_FLOATING_TEXTS; i++) {
      const text = this.add.text(0, 0, '', {
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
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
    this.recentDamageLog = this.recentDamageLog.filter((entry) => now - entry.timeMs <= windowMs);
    const recentDamageSum = this.recentDamageLog.reduce((sum, entry) => sum + entry.amount, 0);

    const fps = Math.round(this.game?.loop?.actualFps || 0);
    const enemyCount = this.enemiesGroup ? this.enemiesGroup.countActive(true) : 0;
    const killsPerMin = this.runTime > 1 ? Math.round((this.enemiesKilled / this.runTime) * 60) : 0;
    const playerDps = Math.round(recentDamageSum / (windowMs / 1000));
    const currentMinute = Math.floor(this.runTime / 60);

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
      activeChallenge: this.activeChallenge ? { ...this.activeChallenge } : null,
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
    return lanternMult * shardMult * darknessFallsMult;
  }

  // Comprehensive pause / resume (physics, timers, tweens, animations, darkness, audio)
  public pauseGame() {
    this.isGamePaused = true;
    dailyMissions.flush();
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
      levelUpPulseSeq: this.levelUpPulseSeq,
      lightRadiusMultiplier: this.getLightRadiusMultiplier(),
      hasNightEyes: this.hasNightEyes,
      isDarknessFallsActive: this.darknessFallsTimerMs > 0,
      isGamePaused: this.isGamePaused,
      isDead: this.isDead,
    };
  }
}
