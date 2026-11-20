import Phaser from 'phaser';
import { BurningTreeSystem, TREES } from './BurningTreeSystem';
import { soundManager } from './audio';
import type { Boss2DebugStats } from './types';

// =========================================================================
// STAGE 2 BOSS: CINDER WARDEN CONSTANTS (Single Source of Truth)
// =========================================================================
export type Boss2AnimKey =
  | 'boss2_idle'
  | 'boss2_walk'
  | 'boss2_spawn'
  | 'boss2_attack_slam'
  | 'boss2_attack_swing'
  | 'boss2_attack_cast'
  | 'boss2_death';

export type Boss2AttackKind = 'swing' | 'slam' | 'cast';

export interface Boss2SheetAssetDef {
  readonly key: Boss2AnimKey;
  readonly label: string;
  readonly sheetUrl: string;
  readonly metaUrl: string;
  readonly loop: boolean;
  readonly attackKind?: Boss2AttackKind;
}

export type Boss2FxSheetKey =
  | 'boss2_fx_ash_burst'
  | 'boss2_fx_firering'
  | 'boss2_fx_ember_shot';

export interface Boss2FxSheetAssetDef {
  readonly key: Boss2FxSheetKey;
  readonly url: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: number;
  readonly fps: number;
  readonly loop: boolean;
}

export interface Boss2SheetMeta {
  name: string;
  frame_w: number;
  frame_h: number;
  frames: number;
  cols: number;
  rows: number;
  fps: number;
  loop: boolean;
}

export const BOSS2 = {
  name: 'CINDER WARDEN',
  displayHeight: 340, // logical px applied to each sheet's frame_h
  hitRadius: 70, // circle hitbox radius at body center (never whole sprite)
  origin: {
    x: 0.5,
    y: 0.9, // feet sit on the ground
  },
  bodyCenterYRatio: 0.48, // torso center vertically in frame (0 = top, 1 = bottom)
  minTelegraphDurationSec: 0.5, // ground telegraph = max(0.5s, impactFrame / effectiveFps)
  // Mutable 0-based impact frame indexes aligned to visual impact on each sheet (tunable in Debug Preview)
  impactFrame: {
    slam: 6, // fist slams into ground on frame 6 (~0.75s wind-up at 8 fps)
    swing: 6, // blazing cleave sweeps across on frame 6 (~0.55s wind-up at 11 fps)
    cast: 8, // outstretched hands erupt sparks on frame 8 (~0.69s wind-up at 11.6 fps)
  } as Record<Boss2AttackKind, number>,
  // Playback speed multipliers applied to each sheet's meta.fps so animations feel weighty & never sped-up
  animSpeed: {
    boss2_idle: 0.45, // ~9.0 fps
    boss2_walk: 0.48, // ~9.6 fps
    boss2_spawn: 0.48, // ~9.6 fps
    boss2_attack_slam: 0.40, // ~8.0 fps (deliberately slow & heavy colossal slam)
    boss2_attack_swing: 0.55, // ~11.0 fps (heavy sweeping cleave)
    boss2_attack_cast: 0.58, // ~11.6 fps (deliberate fire barrage cast)
    boss2_death: 0.48, // ~9.6 fps
  } as Record<Boss2AnimKey, number>,
  sheets: {
    boss2_idle: {
      key: 'boss2_idle',
      label: 'Idle',
      sheetUrl: './assets/aistudio/boss2_idle_sheet.png_38d49892.png',
      metaUrl: './assets/aistudio/boss2_idle_meta_0571f910.json',
      loop: true,
    },
    boss2_walk: {
      key: 'boss2_walk',
      label: 'Walk',
      sheetUrl: './assets/aistudio/boss2_walk_sheet_000f6926.png',
      metaUrl: './assets/aistudio/boss2_walk_meta_31326a37.json',
      loop: true,
    },
    boss2_spawn: {
      key: 'boss2_spawn',
      label: 'Spawn',
      sheetUrl: './assets/aistudio/boss2_spawn_sheet_ed5cdfea.png',
      metaUrl: './assets/aistudio/boss2_spawn__meta_a151a8db.json',
      loop: false,
    },
    boss2_attack_slam: {
      key: 'boss2_attack_slam',
      label: 'Attack: Slam',
      sheetUrl: './assets/aistudio/boss2_attack_slam_sheet_f158ee04.png',
      metaUrl: './assets/aistudio/boss2_attack_slam_meta_f1fc69bd.json',
      loop: false,
      attackKind: 'slam',
    },
    boss2_attack_swing: {
      key: 'boss2_attack_swing',
      label: 'Attack: Swing',
      sheetUrl: './assets/aistudio/boss2_attack_swing_sheet_88d01ea1.png',
      metaUrl: './assets/aistudio/boss2_attack_swing_meta_3c2b4101.json',
      loop: false,
      attackKind: 'swing',
    },
    boss2_attack_cast: {
      key: 'boss2_attack_cast',
      label: 'Attack: Cast',
      sheetUrl: './assets/aistudio/boss2_attack_cast_sheet_67ac14f0.png',
      metaUrl: './assets/aistudio/boss2_attack_cast_meta_75d833ad.json',
      loop: false,
      attackKind: 'cast',
    },
    boss2_death: {
      key: 'boss2_death',
      label: 'Death',
      sheetUrl: './assets/aistudio/boss2_death_sheet_555ac715.png',
      metaUrl: './assets/aistudio/boss2_death_meta_b3a0cf15.json',
      loop: false,
    },
  } as Record<Boss2AnimKey, Boss2SheetAssetDef>,
  // Stage 2 Boss Attack VFX Spritesheets (all 3072x256 -> 256x256, 12 frames, 12 cols)
  fxSheets: {
    boss2_fx_ash_burst: {
      key: 'boss2_fx_ash_burst',
      url: './assets/aistudio/fx_ash_burst_sheet_59b0d48f.png',
      frameWidth: 256,
      frameHeight: 256,
      frames: 12,
      fps: 16,
      loop: false,
    },
    boss2_fx_firering: {
      key: 'boss2_fx_firering',
      url: './assets/aistudio/fx_firering_sheet_209bbe5e.png',
      frameWidth: 256,
      frameHeight: 256,
      frames: 12,
      fps: 20,
      loop: false,
    },
    boss2_fx_ember_shot: {
      key: 'boss2_fx_ember_shot',
      url: './assets/aistudio/fx_ember_shot_sheet_30548427.png',
      frameWidth: 256,
      frameHeight: 256,
      frames: 12,
      fps: 20,
      loop: true,
    },
  } as Record<Boss2FxSheetKey, Boss2FxSheetAssetDef>,
  // All attack offsets are relative to BOSS HITBOX CENTER (boss.x, getBoss2BodyCenterY(boss.y))
  // Horizontal offsets are defined for facing RIGHT and mirrored (* -1) when flipX is true
  offsets: {
    swingOriginX: 24,
    swingOriginY: 38,
    slamOffsetX: 22,
    slamOffsetY: 96,
  },
  // Projectile spawn point relative to boss hitbox center (mirrored with flipX)
  castSpawn: {
    x: 54,
    y: 6,
  },
  stats: {
    hpMultiplier: 1.75, // 1.75x Stage 1 boss HP for an endurance Stage 2 showdown
    walkSpeed: 90, // px/s baseline pursuit speed
    phase2WalkSpeed: 120, // px/s Phase 2 pursuit speed
    farPursuitDistPx: 310, // surges faster when player tries to kite far away
    farPursuitSpeedMult: 1.32,
    steeringRadius: 28, // comfortably navigates 106px min tree gaps without wedging
    antiStuckWindowMs: 420,
    antiStuckMinMovePx: 8,
  },
  spawn: {
    fallbackDurationMs: 750, // rise-from-ground fallback if boss2_spawn sheet is missing
    fallbackRisePx: 88,
    dustBurstCount: 18,
    emberBurstCount: 20,
  },
  visuals: {
    placeholderTint: 0xff7a2e, // used ONLY if a real sheet is missing
    placeholderBaseScale: 0.98,
    depth: 24,
    hitFlashTint: 0xffffff, // white tint 80 ms
    hitFlashMs: 80,
    lightRadius: 240,
    glowAlpha: 0.36,
  },
  state: {
    attackIntervalMs: 2100, // tighter Phase 1 attack cadence
    recoverDurationMs: 420, // brisk Phase 1 recovery
    phase2RecoverDurationMs: 260, // relentless Phase 2 recovery
    initialDelayMs: 950,
    impactFallbackGraceMs: 180, // fallback timer grace if ANIMATION_UPDATE skips impact frame
    attackPostImpactTimeoutMs: 1800, // safety cap so slower heavy post-impact follow-through never hangs
    walkVelThresholdSq: 9,
  },
  swing: {
    range: 180, // wide melee cleave cone range (px)
    angleDeg: 115, // 115 degrees sweeping cone
    fallbackTelegraphMs: 600,
    damage: 24,
    phase2Damage: 30,
    knockbackPx: 110,
    knockbackDurationMs: 130,
    lungePx: 22, // subtle forward momentum step on impact
    slashFxDurationMs: 320,
    shakeIntensity: 0.0032,
    shakeDurationMs: 110,
    phase2WaveCount: 3, // Phase 2 swing launches a tight 3-bolt flame wave forward
    phase2WaveSpreadDeg: 28,
    phase2WaveSpeed: 340,
    phase2WaveDamage: 16,
  },
  slam: {
    radius: 210, // Phase 1 telegraph circle & expanding ring radius
    phase2Radius: 235, // Phase 2 expanded shockwave radius
    frontOffsetPx: 82, // placed aggressively toward the player
    fallbackTelegraphMs: 800,
    ringDurationMs: 600, // expanding fire ring over 0.6s
    ringStartRadius: 22,
    ringEdgeHalfWidth: 26, // ring edge only (jumpable with dash i-frames)
    ringDamage: 28,
    phase2RingDamage: 34,
    shakeIntensity: 0.0048,
    shakeDurationMs: 170,
    patchCount: 5, // 5 lingering fire patches in Phase 1
    phase2PatchCount: 7, // 7 lingering fire patches in Phase 2
    patchRadius: 46,
    patchSpawnMinDist: 58,
    patchSpawnMaxDist: 175,
    patchDurationMs: 5000, // 5s area-denial lifetime
    patchDamage: 5, // 5 damage per 0.45s
    patchTickMs: 450,
    maxPooledPatches: 20,
    phase2RadialEmberCount: 6, // Phase 2 slam erupts 6 radial embers outward
    phase2RadialEmberSpeed: 245,
    phase2RadialEmberDamage: 15,
  },
  cast: {
    fallbackTelegraphMs: 500,
    telegraphLength: 580,
    projectileCount: 5, // 5 ember projectiles in a fan
    fanSpreadDeg: 68,
    projectileSpeed: 310, // px/s Phase 1
    phase2ProjectileSpeed: 360, // px/s Phase 2
    projectileDamage: 16,
    phase2ProjectileDamage: 20,
    projectileHitboxRadius: 14, // px
    projectileMaxLifeMs: 3200,
    playerHitRadius: 16,
    leadSec: 0.26, // predictive lead aiming on moving players
    maxLeadPx: 85,
    maxPooledProjectiles: 28,
    phase2SecondVolleyDelayMs: 320, // staggered offset follow-up volley in Phase 2
    phase2SecondVolleyCount: 6,
  },
  phase2: {
    hpThreshold: 0.4, // below 40% HP
    attackIntervalMs: 1400, // relentless Phase 2 cadence
    swingRangeMultiplier: 1.2, // SWING range +20% (216 px)
    castProjectileCount: 7, // CAST fires 7 projectiles + 6 staggered offset bolts
    castFanSpreadDeg: 88,
    placeholderTint: 0xff5a1a, // used ONLY if placeholder sprite is active
    glowScale: 2.15,
    glowAlpha: 0.52, // steady warm orange glow overlay (no flashing)
    glowFadeInMs: 420,
  },
  death: {
    slowMoDurationMs: 300, // 0.3s slow-mo
    slowMoTimeScale: 0.25,
    fadeOutDurationMs: 1500, // holds last frame of boss2_death while fading out over 1.5s
    ashTint: 0x524c49, // used only for code fallback if boss2_death sheet is missing
    emberBurstCount: 28,
    ashBurstCount: 24,
    bonusGemCount: 6,
    bonusGemSpreadPx: 54,
  },
  telegraphs: {
    // High-contrast dark-fantasy crimson-to-molten-amber danger indicators above darkness layer
    fillRgb: '188, 28, 24',
    borderRgb: '255, 86, 46',
    innerFillRgb: '238, 62, 28',
    hotEdgeRgb: '255, 212, 118',
    fillAlpha: 0.36,
    outlineAlpha: 0.94,
    lineAlpha: 0.36,
    maxLineSlots: 7,
    depthInDarkness: 6.2,
    texSize: 384,
    lineTexWidth: 384,
    lineTexHeight: 40,
  },
  textures: {
    swingConeKey: 'boss2_telegraph_cone',
    swingConeFillKey: 'boss2_telegraph_cone_fill',
    swingSlashKey: 'boss2_swing_slash_fx',
    swingShockwaveKey: 'boss2_swing_shockwave_fx',
    slamCircleKey: 'boss2_telegraph_circle',
    slamCircleFillKey: 'boss2_telegraph_circle_fill',
    slamCenterKey: 'boss2_telegraph_slam_center',
    castLineKey: 'boss2_telegraph_line',
    castLinePulseKey: 'boss2_telegraph_line_pulse',
    castMuzzleKey: 'boss2_telegraph_cast_muzzle',
    fireRingKey: 'boss2_fire_ring_fx',
    firePatchKey: 'boss2_fire_patch_fx',
    emberProjKey: 'boss2_ember_proj_fx',
    phase2GlowKey: 'boss2_phase2_orange_glow',
  },
  debugVersionLabel: 'v1.2.0',
} as const;

export const BOSS2_SHEET_KEYS: readonly Boss2AnimKey[] = [
  'boss2_idle',
  'boss2_walk',
  'boss2_spawn',
  'boss2_attack_slam',
  'boss2_attack_swing',
  'boss2_attack_cast',
  'boss2_death',
];

export const BOSS2_FX_SHEET_KEYS: readonly Boss2FxSheetKey[] = [
  'boss2_fx_ash_burst',
  'boss2_fx_firering',
  'boss2_fx_ember_shot',
];

const ATTACK_TO_ANIM_KEY: Record<Boss2AttackKind, Boss2AnimKey> = {
  slam: 'boss2_attack_slam',
  swing: 'boss2_attack_swing',
  cast: 'boss2_attack_cast',
};

export type Boss2State =
  | 'spawning'
  | 'idle'
  | 'walk'
  | 'telegraph'
  | 'attack'
  | 'recover'
  | 'dying';

const SWING_HALF_ANGLE_RAD = (BOSS2.swing.angleDeg * 0.5 * Math.PI) / 180;

// Runtime metadata registry populated dynamically from each *_meta.json when Stage 2 loads
const loadedSheetMeta: Partial<Record<Boss2AnimKey, Boss2SheetMeta>> = {};
const missingSheetsLogged = new Set<string>();

function metaCacheKey(key: Boss2AnimKey): string {
  return `${key}_meta`;
}

export function parseBoss2SheetMeta(raw: unknown, fallbackLoop: boolean): Boss2SheetMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const frameW = typeof obj.frame_w === 'number' && obj.frame_w > 0 ? Math.floor(obj.frame_w) : 0;
  const frameH = typeof obj.frame_h === 'number' && obj.frame_h > 0 ? Math.floor(obj.frame_h) : 0;
  const frames = typeof obj.frames === 'number' && obj.frames > 0 ? Math.floor(obj.frames) : 0;
  const cols = typeof obj.cols === 'number' && obj.cols > 0 ? Math.floor(obj.cols) : frames;
  const rows =
    typeof obj.rows === 'number' && obj.rows > 0
      ? Math.floor(obj.rows)
      : Math.max(1, Math.ceil(frames / Math.max(1, cols)));
  const fps = typeof obj.fps === 'number' && obj.fps > 0 ? obj.fps : 20;
  const loop = typeof obj.loop === 'boolean' ? obj.loop : fallbackLoop;
  const name = typeof obj.name === 'string' ? obj.name : '';
  if (frameW <= 0 || frameH <= 0 || frames <= 0) return null;
  return { name, frame_w: frameW, frame_h: frameH, frames, cols, rows, fps, loop };
}

export function getBoss2SheetMeta(key: Boss2AnimKey): Boss2SheetMeta | null {
  return loadedSheetMeta[key] ?? null;
}

export function getBoss2EffectiveFps(key: Boss2AnimKey, fallbackMetaFps: number = 20): number {
  const baseFps = loadedSheetMeta[key]?.fps ?? fallbackMetaFps;
  return Math.max(1, baseFps * BOSS2.animSpeed[key]);
}

export function hasBoss2Sheet(scene: Phaser.Scene, key: Boss2AnimKey): boolean {
  return Boolean(loadedSheetMeta[key] && scene.textures.exists(key) && scene.anims.exists(key));
}

export function getBoss2BodyCenterY(feetY: number): number {
  return feetY - BOSS2.displayHeight * (BOSS2.origin.y - BOSS2.bodyCenterYRatio);
}

/**
 * Shared pure geometry helpers — all attack origins derive strictly from the boss hitbox
 * body center (bossX, getBoss2BodyCenterY(feetY)), facing (flipX), and BOSS2 constants.
 * Used identically by runtime combat, telegraphs, and the Boss Animation Preview modal.
 */
export function getBoss2SwingOrigin(
  bossX: number,
  feetY: number,
  flipX: boolean,
  out: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } {
  const facingSign = flipX ? -1 : 1;
  out.x = bossX + facingSign * BOSS2.offsets.swingOriginX;
  out.y = getBoss2BodyCenterY(feetY) + BOSS2.offsets.swingOriginY;
  return out;
}

export function getBoss2SlamCenter(
  bossX: number,
  feetY: number,
  flipX: boolean,
  aimAngle: number,
  out: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } {
  const facingSign = flipX ? -1 : 1;
  out.x =
    bossX +
    Math.cos(aimAngle) * BOSS2.slam.frontOffsetPx +
    facingSign * BOSS2.offsets.slamOffsetX;
  out.y =
    getBoss2BodyCenterY(feetY) +
    Math.sin(aimAngle) * BOSS2.slam.frontOffsetPx +
    BOSS2.offsets.slamOffsetY;
  return out;
}

export function getBoss2CastSpawn(
  bossX: number,
  feetY: number,
  flipX: boolean,
  out: { x: number; y: number } = { x: 0, y: 0 }
): { x: number; y: number } {
  const facingSign = flipX ? -1 : 1;
  out.x = bossX + facingSign * BOSS2.castSpawn.x;
  out.y = getBoss2BodyCenterY(feetY) + BOSS2.castSpawn.y;
  return out;
}

/**
 * Loads Stage 2 Cinder Warden *_meta.json files and chains each spritesheet load using
 * frame_w / frame_h / frames read from its JSON (never hardcoded).
 * Call ONLY when Stage 2 starts (inside MainScene.preload).
 */
export function preloadStage2BossAssets(scene: Phaser.Scene): void {
  const onLoadError = (file: Phaser.Loader.File) => {
    const key = file?.key ?? '';
    if (key.startsWith('boss2_') && !missingSheetsLogged.has(key)) {
      missingSheetsLogged.add(key);
      console.warn(`[CinderWarden] Missing or failed to load boss2 asset: ${key} (${file?.src ?? ''})`);
    }
  };
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onLoadError);
  });

  for (let i = 0; i < BOSS2_SHEET_KEYS.length; i++) {
    const key = BOSS2_SHEET_KEYS[i];
    const def = BOSS2.sheets[key];
    const mKey = metaCacheKey(key);

    const queueSheetFromMeta = (rawMeta: unknown) => {
      const meta = parseBoss2SheetMeta(rawMeta, def.loop);
      if (!meta) {
        if (!missingSheetsLogged.has(key)) {
          missingSheetsLogged.add(key);
          console.warn(`[CinderWarden] Invalid meta JSON for ${key}: ${def.metaUrl}`);
        }
        return;
      }
      loadedSheetMeta[key] = meta;
      if (!scene.textures.exists(key)) {
        scene.load.spritesheet(key, def.sheetUrl, {
          frameWidth: meta.frame_w,
          frameHeight: meta.frame_h,
          endFrame: meta.frames - 1,
        });
      }
    };

    if (scene.cache.json.exists(mKey)) {
      queueSheetFromMeta(scene.cache.json.get(mKey));
    } else {
      scene.load.once(`filecomplete-json-${mKey}`, (_k: string, _t: string, data: unknown) => {
        queueSheetFromMeta(data);
      });
      scene.load.json(mKey, def.metaUrl);
    }
  }

  // Load Stage 2 Boss Attack VFX spritesheets (ash burst, fire ring, ember shot)
  for (let i = 0; i < BOSS2_FX_SHEET_KEYS.length; i++) {
    const fxKey = BOSS2_FX_SHEET_KEYS[i];
    const fxDef = BOSS2.fxSheets[fxKey];
    if (!scene.textures.exists(fxKey)) {
      scene.load.spritesheet(fxKey, fxDef.url, {
        frameWidth: fxDef.frameWidth,
        frameHeight: fxDef.frameHeight,
        endFrame: fxDef.frames - 1,
      });
    }
  }
}

/**
 * Registers Phaser animations for every loaded boss2_* spritesheet using its loaded metadata,
 * applies linear texture filtering, and logs any missing sheets.
 */
export function registerCinderWardenAnimations(scene: Phaser.Scene): void {
  for (let i = 0; i < BOSS2_SHEET_KEYS.length; i++) {
    const key = BOSS2_SHEET_KEYS[i];
    const def = BOSS2.sheets[key];
    const mKey = metaCacheKey(key);

    if (!loadedSheetMeta[key] && scene.cache.json.exists(mKey)) {
      const parsed = parseBoss2SheetMeta(scene.cache.json.get(mKey), def.loop);
      if (parsed) loadedSheetMeta[key] = parsed;
    }

    const meta = loadedSheetMeta[key];
    if (!meta || !scene.textures.exists(key)) {
      if (!missingSheetsLogged.has(key)) {
        missingSheetsLogged.add(key);
        console.warn(`[CinderWarden] Sheet not loaded, using fallback for state: ${key}`);
      }
      continue;
    }

    const tex = scene.textures.get(key);
    if (tex && tex.setFilter) {
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    if (scene.anims.exists(key)) {
      scene.anims.remove(key);
    }
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(key, {
        start: 0,
        end: Math.max(0, meta.frames - 1),
      }),
      frameRate: getBoss2EffectiveFps(key, meta.fps),
      repeat: def.loop ? -1 : 0,
      yoyo: false,
    });
  }

  // Register Stage 2 Boss Attack VFX spritesheet animations
  for (let i = 0; i < BOSS2_FX_SHEET_KEYS.length; i++) {
    const fxKey = BOSS2_FX_SHEET_KEYS[i];
    const fxDef = BOSS2.fxSheets[fxKey];
    if (!scene.textures.exists(fxKey)) {
      if (!missingSheetsLogged.has(fxKey)) {
        missingSheetsLogged.add(fxKey);
        console.warn(`[CinderWarden] FX sheet not loaded, using fallback: ${fxKey}`);
      }
      continue;
    }

    const tex = scene.textures.get(fxKey);
    if (tex && tex.setFilter) {
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    }

    if (scene.anims.exists(fxKey)) {
      scene.anims.remove(fxKey);
    }
    scene.anims.create({
      key: fxKey,
      frames: scene.anims.generateFrameNumbers(fxKey, {
        start: 0,
        end: Math.max(0, fxDef.frames - 1),
      }),
      frameRate: fxDef.fps,
      repeat: fxDef.loop ? -1 : 0,
      yoyo: false,
    });
  }
}

/**
 * Unloads all Stage 2 Cinder Warden spritesheets, animations, and metadata when leaving Stage 2.
 */
export function unloadStage2BossAssets(scene: Phaser.Scene): void {
  for (let i = 0; i < BOSS2_SHEET_KEYS.length; i++) {
    const key = BOSS2_SHEET_KEYS[i];
    const mKey = metaCacheKey(key);
    if (scene.anims && scene.anims.exists(key)) {
      scene.anims.remove(key);
    }
    if (scene.textures && scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    if (scene.cache?.json && scene.cache.json.exists(mKey)) {
      scene.cache.json.remove(mKey);
    }
    delete loadedSheetMeta[key];
  }
  for (let i = 0; i < BOSS2_FX_SHEET_KEYS.length; i++) {
    const fxKey = BOSS2_FX_SHEET_KEYS[i];
    if (scene.anims && scene.anims.exists(fxKey)) {
      scene.anims.remove(fxKey);
    }
    if (scene.textures && scene.textures.exists(fxKey)) {
      scene.textures.remove(fxKey);
    }
  }
  missingSheetsLogged.clear();
}

/**
 * Applies origin (0.5, 0.9), displayHeight scale from sheet frame_h, and the exact
 * BOSS2.hitRadius circular hitbox centered at the boss's body center.
 */
export function applyBoss2SpriteLayout(
  boss: Phaser.Physics.Arcade.Sprite,
  animKey: Boss2AnimKey | null,
  usingRealSheet: boolean
): void {
  const meta = animKey ? loadedSheetMeta[animKey] : null;
  boss.setOrigin(BOSS2.origin.x, BOSS2.origin.y);

  let frameW: number;
  let frameH: number;
  let scale: number;

  if (usingRealSheet && meta) {
    frameW = meta.frame_w;
    frameH = meta.frame_h;
    scale = BOSS2.displayHeight / frameH;
    boss.setScale(scale);
  } else {
    // Fallback placeholder sizing
    frameW = boss.frame?.width || 410;
    frameH = boss.frame?.height || 260;
    scale = BOSS2.displayHeight / Math.max(1, frameH);
    boss.setScale(scale);
  }

  const body = boss.body as Phaser.Physics.Arcade.Body | null;
  if (body) {
    const localRadius = BOSS2.hitRadius / Math.max(0.001, scale);
    const offsetX = frameW * 0.5 - localRadius;
    const offsetY = frameH * BOSS2.bodyCenterYRatio - localRadius;
    body.setCircle(localRadius, offsetX, offsetY);
  }
}

export interface CinderWardenTelegraphSnapshot {
  kind: 'none' | 'swing' | 'slam' | 'cast';
  x: number;
  y: number;
  angle: number;
  radius: number;
  length: number;
  progress: number;
  lineCount: number;
  lineAngles: Float64Array;
}

export interface CinderWardenCallbacks {
  damagePlayer: (amount: number) => boolean;
  isPlayerInvulnerable: () => boolean;
  applyPlayerKnockback: (dirX: number, dirY: number, distancePx: number, durationMs: number) => void;
  triggerCameraShake: (durationMs: number, intensity: number) => void;
  spawnEmberPuff: (x: number, y: number, count: number) => void;
  spawnSpawnBursts: (x: number, y: number) => void;
  spawnDeathBursts: (x: number, y: number) => void;
  showCallout: (x: number, y: number, text: string, color: string) => void;
  onPhase2Enter: (boss: Phaser.Physics.Arcade.Sprite) => void;
  onDeathComplete: (boss: Phaser.Physics.Arcade.Sprite) => void;
}

interface FirePatchSlot {
  active: boolean;
  x: number;
  y: number;
  lifeMs: number;
  maxLifeMs: number;
  phase: number;
  sprite: Phaser.GameObjects.Image;
}

interface EmberProjSlot {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  damage: number;
  usingAnimSheet: boolean;
  sprite: Phaser.GameObjects.Sprite;
}

function wrapAngleDiff(a: number, b: number): number {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function setLinear(scene: Phaser.Scene, key: string): void {
  const tex = scene.textures.get(key);
  if (tex && tex.setFilter) {
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/**
 * Generates all pre-baked canvas textures for Cinder Warden telegraphs, attacks, and Phase 2 glow.
 * Executed once on Stage 2 startup so runtime rendering has zero Graphics redraws & zero allocations.
 */
export function ensureCinderWardenTextures(scene: Phaser.Scene): void {
  const size = BOSS2.telegraphs.texSize;
  const half = size * 0.5;
  const maxR = half - 6;

  // 1. SWING cone outline + radial threat shading + range ticks (100 degrees centered along +X)
  if (!scene.textures.exists(BOSS2.textures.swingConeKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.swingConeKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.arc(half, half, maxR, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD, false);
      ctx.closePath();

      // Radial threat fill: lighter near pivot, richer crimson-ember toward blade perimeter
      const fillGrad = ctx.createRadialGradient(half, half, maxR * 0.1, half, half, maxR);
      fillGrad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.fillRgb}, 0.14)`);
      fillGrad.addColorStop(0.62, `rgba(${BOSS2.telegraphs.fillRgb}, 0.28)`);
      fillGrad.addColorStop(0.92, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.44)`);
      fillGrad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.borderRgb}, 0.54)`);
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Inner dashed 55% range guide arc
      ctx.save();
      ctx.setLineDash([10, 9]);
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, 0.42)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(half, half, maxR * 0.55, -SWING_HALF_ANGLE_RAD + 0.04, SWING_HALF_ANGLE_RAD - 0.04);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Subtle cleave-perimeter inward notches along the outer arc
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.58)`;
      ctx.lineWidth = 2.2;
      const tickCount = 7;
      for (let t = 1; t < tickCount; t++) {
        const a = -SWING_HALF_ANGLE_RAD + (t / tickCount) * (SWING_HALF_ANGLE_RAD * 2);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(half + ca * (maxR - 11), half + sa * (maxR - 11));
        ctx.lineTo(half + ca * (maxR - 2), half + sa * (maxR - 2));
        ctx.stroke();
      }

      // Soft outer crimson glow border
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.fillRgb}, 0.55)`;
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.arc(half, half, maxR, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD, false);
      ctx.closePath();
      ctx.stroke();

      // Crisp vivid scarlet-orange primary outline
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, ${BOSS2.telegraphs.outlineAlpha})`;
      ctx.lineWidth = 3.6;
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.arc(half, half, maxR, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD, false);
      ctx.closePath();
      ctx.stroke();

      // Razor-sharp hot amber highlight along the curved outer cleave edge
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.85)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(half, half, maxR - 1.5, -SWING_HALF_ANGLE_RAD + 0.02, SWING_HALF_ANGLE_RAD - 0.02);
      ctx.stroke();

      tex.refresh();
      setLinear(scene, BOSS2.textures.swingConeKey);
    }
  }

  // 2. SWING cone charge-up sweep fill with blazing hot leading-edge arc
  if (!scene.textures.exists(BOSS2.textures.swingConeFillKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.swingConeFillKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.moveTo(half, half);
      ctx.arc(half, half, maxR, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD, false);
      ctx.closePath();

      const grad = ctx.createRadialGradient(half, half, 0, half, half, maxR);
      grad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.16)`);
      grad.addColorStop(0.72, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.42)`);
      grad.addColorStop(0.92, `rgba(${BOSS2.telegraphs.borderRgb}, 0.86)`);
      grad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 1.0)`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Blazing leading sweep rim
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.98)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(half, half, maxR - 2, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD);
      ctx.stroke();

      tex.refresh();
      setLinear(scene, BOSS2.textures.swingConeFillKey);
    }
  }

  // 3. SWING fiery 3-claw cleave wave FX (rich scorching slash with incandescent rim & claw trails)
  if (!scene.textures.exists(BOSS2.textures.swingSlashKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.swingSlashKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);

      // Outer molten flame crescent body
      ctx.beginPath();
      ctx.arc(half, half, maxR - 2, -SWING_HALF_ANGLE_RAD, SWING_HALF_ANGLE_RAD, false);
      ctx.arc(half, half, maxR * 0.42, SWING_HALF_ANGLE_RAD, -SWING_HALF_ANGLE_RAD, true);
      ctx.closePath();

      const grad = ctx.createRadialGradient(half, half, maxR * 0.38, half, half, maxR);
      grad.addColorStop(0.0, 'rgba(180, 32, 10, 0.0)');
      grad.addColorStop(0.32, 'rgba(220, 62, 16, 0.45)');
      grad.addColorStop(0.68, 'rgba(255, 134, 34, 0.88)');
      grad.addColorStop(0.88, 'rgba(255, 232, 158, 0.98)');
      grad.addColorStop(0.96, 'rgba(255, 148, 42, 0.72)');
      grad.addColorStop(1.0, 'rgba(255, 86, 18, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Three fiery gnarled-claw slash streaks across the cone
      const clawRadii = [maxR * 0.88, maxR * 0.72, maxR * 0.56];
      const clawWidths = [6.5, 5.2, 4.0];
      const clawAlphas = [0.96, 0.84, 0.68];
      ctx.lineCap = 'round';
      for (let c = 0; c < clawRadii.length; c++) {
        const span = SWING_HALF_ANGLE_RAD * (0.96 - c * 0.06);
        ctx.strokeStyle = `rgba(255, 238, 178, ${clawAlphas[c]})`;
        ctx.lineWidth = clawWidths[c];
        ctx.beginPath();
        ctx.arc(half, half, clawRadii[c], -span, span, false);
        ctx.stroke();
      }

      // Scattered bright sparks trailing inside the flame sweep
      for (let s = 0; s < 18; s++) {
        const t = (s + 0.5) / 18;
        const ang = -SWING_HALF_ANGLE_RAD * 0.92 + t * (SWING_HALF_ANGLE_RAD * 1.84);
        const rad = maxR * (0.52 + ((s * 37) % 44) * 0.01);
        const px = half + Math.cos(ang) * rad;
        const py = half + Math.sin(ang) * rad;
        const r = 2 + (s % 3) * 1.4;
        ctx.fillStyle = s % 2 === 0 ? 'rgba(255, 246, 206, 0.92)' : 'rgba(255, 148, 42, 0.85)';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      tex.refresh();
      setLinear(scene, BOSS2.textures.swingSlashKey);
    }
  }

  // 3b. SWING secondary outer heat shockwave crescent (surges ahead of main cleave)
  if (!scene.textures.exists(BOSS2.textures.swingShockwaveKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.swingShockwaveKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);

      ctx.beginPath();
      ctx.arc(half, half, maxR, -SWING_HALF_ANGLE_RAD * 1.04, SWING_HALF_ANGLE_RAD * 1.04, false);
      ctx.arc(half, half, maxR * 0.78, SWING_HALF_ANGLE_RAD * 1.04, -SWING_HALF_ANGLE_RAD * 1.04, true);
      ctx.closePath();

      const grad = ctx.createRadialGradient(half, half, maxR * 0.76, half, half, maxR);
      grad.addColorStop(0.0, 'rgba(255, 92, 24, 0.0)');
      grad.addColorStop(0.45, 'rgba(255, 128, 36, 0.65)');
      grad.addColorStop(0.84, 'rgba(255, 224, 148, 0.95)');
      grad.addColorStop(1.0, 'rgba(255, 96, 20, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      tex.refresh();
      setLinear(scene, BOSS2.textures.swingShockwaveKey);
    }
  }

  // 4. SLAM telegraph shockwave circle: double glowing perimeter + hazard ticks + fracture guides
  if (!scene.textures.exists(BOSS2.textures.slamCircleKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.slamCircleKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);

      // Radial danger fill (emphasizing the deadly outer ring zone)
      const fillGrad = ctx.createRadialGradient(half, half, maxR * 0.08, half, half, maxR);
      fillGrad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.34)`);
      fillGrad.addColorStop(0.42, `rgba(${BOSS2.telegraphs.fillRgb}, 0.18)`);
      fillGrad.addColorStop(0.82, `rgba(${BOSS2.telegraphs.fillRgb}, 0.34)`);
      fillGrad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.borderRgb}, 0.52)`);
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.arc(half, half, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Subtle radial shockwave spokes (8 directions)
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, 0.24)`;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI * 2) / 8;
        ctx.beginPath();
        ctx.moveTo(half + Math.cos(a) * (maxR * 0.24), half + Math.sin(a) * (maxR * 0.24));
        ctx.lineTo(half + Math.cos(a) * (maxR * 0.88), half + Math.sin(a) * (maxR * 0.88));
        ctx.stroke();
      }

      // Dashed mid-expansion guide ring
      ctx.save();
      ctx.setLineDash([12, 9]);
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, 0.48)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(half, half, maxR * 0.58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 16 crisp outer perimeter hazard ticks
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.64)`;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16;
        const innerR = i % 4 === 0 ? maxR - 14 : maxR - 8;
        ctx.beginPath();
        ctx.moveTo(half + Math.cos(a) * innerR, half + Math.sin(a) * innerR);
        ctx.lineTo(half + Math.cos(a) * (maxR - 2), half + Math.sin(a) * (maxR - 2));
        ctx.stroke();
      }

      // Outer crimson soft halo
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.fillRgb}, 0.55)`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(half, half, maxR, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp vivid outer danger boundary
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, ${BOSS2.telegraphs.outlineAlpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(half, half, maxR, 0, Math.PI * 2);
      ctx.stroke();

      // Inner razor-hot highlight ring
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.82)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(half, half, maxR - 2, 0, Math.PI * 2);
      ctx.stroke();

      tex.refresh();
      setLinear(scene, BOSS2.textures.slamCircleKey);
    }
  }

  // 5. SLAM telegraph inner expanding shockwave fill with blazing leading edge
  if (!scene.textures.exists(BOSS2.textures.slamCircleFillKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.slamCircleFillKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);
      const grad = ctx.createRadialGradient(half, half, maxR * 0.2, half, half, maxR);
      grad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.14)`);
      grad.addColorStop(0.7, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.36)`);
      grad.addColorStop(0.91, `rgba(${BOSS2.telegraphs.borderRgb}, 0.86)`);
      grad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 1.0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(half, half, maxR, 0, Math.PI * 2);
      ctx.fill();

      // Crisp hot expanding leading ring
      ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.98)`;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(half, half, maxR - 2.2, 0, Math.PI * 2);
      ctx.stroke();

      tex.refresh();
      setLinear(scene, BOSS2.textures.slamCircleFillKey);
    }
  }

  // 5b. SLAM epicenter target sigil (rotates & pulses at slam landing center)
  if (!scene.textures.exists(BOSS2.textures.slamCenterKey)) {
    const cSize = 128;
    const cHalf = cSize * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.slamCenterKey, cSize, cSize);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, cSize, cSize);

      // Molten epicenter glow
      const coreGrad = ctx.createRadialGradient(cHalf, cHalf, 2, cHalf, cHalf, 36);
      coreGrad.addColorStop(0.0, 'rgba(255, 232, 168, 0.95)');
      coreGrad.addColorStop(0.4, 'rgba(255, 118, 36, 0.65)');
      coreGrad.addColorStop(1.0, 'rgba(220, 42, 20, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cHalf, cHalf, 36, 0, Math.PI * 2);
      ctx.fill();

      // Inner rune ring
      ctx.strokeStyle = 'rgba(255, 206, 118, 0.92)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(cHalf, cHalf, 24, 0, Math.PI * 2);
      ctx.stroke();

      // 4 inward-pointing impact chevrons
      ctx.strokeStyle = 'rgba(255, 236, 176, 0.95)';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(cHalf, cHalf);
        ctx.rotate((i * Math.PI) / 2);
        ctx.beginPath();
        ctx.moveTo(44, -8);
        ctx.lineTo(31, 0);
        ctx.lineTo(44, 8);
        ctx.stroke();
        ctx.restore();
      }

      tex.refresh();
      setLinear(scene, BOSS2.textures.slamCenterKey);
    }
  }

  // 6. CAST telegraph actual-width danger corridor with sharp rails & directional chevrons
  if (!scene.textures.exists(BOSS2.textures.castLineKey)) {
    const lw = BOSS2.telegraphs.lineTexWidth;
    const lh = BOSS2.telegraphs.lineTexHeight;
    const midY = lh * 0.5;
    const corridorHalf = 14; // exact match to BOSS2.cast.projectileHitboxRadius (14px)
    const tex = scene.textures.createCanvas(BOSS2.textures.castLineKey, lw, lh);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, lw, lh);

      // Translucent corridor threat fill fading gracefully at far tip
      const fillGrad = ctx.createLinearGradient(0, 0, lw, 0);
      fillGrad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.innerFillRgb}, 0.44)`);
      fillGrad.addColorStop(0.75, `rgba(${BOSS2.telegraphs.fillRgb}, 0.28)`);
      fillGrad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.fillRgb}, 0.0)`);
      ctx.fillStyle = fillGrad;
      ctx.fillRect(0, midY - corridorHalf, lw, corridorHalf * 2);

      // Crisp upper & lower projectile-width corridor rails
      const railGrad = ctx.createLinearGradient(0, 0, lw, 0);
      railGrad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.borderRgb}, 0.92)`);
      railGrad.addColorStop(0.82, `rgba(${BOSS2.telegraphs.borderRgb}, 0.72)`);
      railGrad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.borderRgb}, 0.0)`);
      ctx.fillStyle = railGrad;
      ctx.fillRect(0, midY - corridorHalf, lw, 2);
      ctx.fillRect(0, midY + corridorHalf - 2, lw, 2);

      // Glowing central aim core
      const coreGrad = ctx.createLinearGradient(0, 0, lw, 0);
      coreGrad.addColorStop(0.0, `rgba(${BOSS2.telegraphs.hotEdgeRgb}, 0.95)`);
      coreGrad.addColorStop(0.78, `rgba(${BOSS2.telegraphs.borderRgb}, 0.7)`);
      coreGrad.addColorStop(1.0, `rgba(${BOSS2.telegraphs.borderRgb}, 0.0)`);
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, midY - 1.25, lw, 2.5);

      // Forward-pointing directional chevrons (>>>) along the lane
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let x = 28; x < lw - 34; x += 48) {
        const fade = Math.max(0, 1 - x / lw);
        ctx.strokeStyle = `rgba(${BOSS2.telegraphs.hotEdgeRgb}, ${(0.82 * fade).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(x - 7, midY - 7);
        ctx.lineTo(x + 4, midY);
        ctx.lineTo(x - 7, midY + 7);
        ctx.stroke();
      }

      tex.refresh();
      setLinear(scene, BOSS2.textures.castLineKey);
    }
  }

  // 6b. CAST additive charge sweep beam (shoots down each lane during telegraph wind-up)
  if (!scene.textures.exists(BOSS2.textures.castLinePulseKey)) {
    const lw = BOSS2.telegraphs.lineTexWidth;
    const lh = BOSS2.telegraphs.lineTexHeight;
    const midY = lh * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.castLinePulseKey, lw, lh);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, lw, lh);

      const beamGrad = ctx.createLinearGradient(0, 0, lw, 0);
      beamGrad.addColorStop(0.0, 'rgba(255, 110, 32, 0.15)');
      beamGrad.addColorStop(0.75, 'rgba(255, 148, 48, 0.55)');
      beamGrad.addColorStop(0.95, 'rgba(255, 232, 168, 0.98)');
      beamGrad.addColorStop(1.0, 'rgba(255, 255, 224, 0.0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(0, midY - 6, lw, 12);

      // Hot arrowhead at leading tip
      ctx.fillStyle = 'rgba(255, 240, 188, 0.98)';
      ctx.beginPath();
      ctx.moveTo(lw - 2, midY);
      ctx.lineTo(lw - 18, midY - 8);
      ctx.lineTo(lw - 13, midY);
      ctx.lineTo(lw - 18, midY + 8);
      ctx.closePath();
      ctx.fill();

      tex.refresh();
      setLinear(scene, BOSS2.textures.castLinePulseKey);
    }
  }

  // 6c. CAST muzzle charge focus ring at boss hands (contracts & flares before fireballs launch)
  if (!scene.textures.exists(BOSS2.textures.castMuzzleKey)) {
    const mSize = 96;
    const mHalf = mSize * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.castMuzzleKey, mSize, mSize);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, mSize, mSize);

      const grad = ctx.createRadialGradient(mHalf, mHalf, 3, mHalf, mHalf, mHalf - 4);
      grad.addColorStop(0.0, 'rgba(255, 246, 206, 0.98)');
      grad.addColorStop(0.35, 'rgba(255, 138, 38, 0.72)');
      grad.addColorStop(0.7, 'rgba(220, 48, 18, 0.22)');
      grad.addColorStop(1.0, 'rgba(220, 48, 18, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mHalf, mHalf, mHalf - 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 214, 128, 0.9)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(mHalf, mHalf, 32, 0, Math.PI * 2);
      ctx.stroke();

      tex.refresh();
      setLinear(scene, BOSS2.textures.castMuzzleKey);
    }
  }

  // 7. SLAM expanding fire ring (crisp fiery ring edge)
  if (!scene.textures.exists(BOSS2.textures.fireRingKey)) {
    const tex = scene.textures.createCanvas(BOSS2.textures.fireRingKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);
      const grad = ctx.createRadialGradient(half, half, maxR * 0.72, half, half, maxR + 4);
      grad.addColorStop(0.0, 'rgba(255, 92, 20, 0)');
      grad.addColorStop(0.35, 'rgba(214, 58, 18, 0.55)');
      grad.addColorStop(0.68, 'rgba(255, 138, 38, 0.94)');
      grad.addColorStop(0.84, 'rgba(255, 226, 152, 0.98)');
      grad.addColorStop(1.0, 'rgba(255, 86, 18, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(half, half, maxR + 4, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
      setLinear(scene, BOSS2.textures.fireRingKey);
    }
  }

  // 8. SLAM lingering ground fire patch
  if (!scene.textures.exists(BOSS2.textures.firePatchKey)) {
    const pSize = 128;
    const pHalf = pSize * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.firePatchKey, pSize, pSize);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, pSize, pSize);

      const baseGrad = ctx.createRadialGradient(pHalf, pHalf, 6, pHalf, pHalf, pHalf - 4);
      baseGrad.addColorStop(0.0, 'rgba(255, 168, 56, 0.92)');
      baseGrad.addColorStop(0.42, 'rgba(224, 72, 20, 0.72)');
      baseGrad.addColorStop(0.78, 'rgba(120, 26, 12, 0.36)');
      baseGrad.addColorStop(1.0, 'rgba(60, 14, 8, 0)');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.arc(pHalf, pHalf, pHalf - 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 224, 142, 0.72)';
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 + 0.35;
        const r = 14 + (i % 2) * 11;
        ctx.beginPath();
        ctx.arc(pHalf + Math.cos(a) * r, pHalf + Math.sin(a) * r, 4 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      tex.refresh();
      setLinear(scene, BOSS2.textures.firePatchKey);
    }
  }

  // 9. CAST ember projectile
  if (!scene.textures.exists(BOSS2.textures.emberProjKey)) {
    const eSize = 64;
    const eHalf = eSize * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.emberProjKey, eSize, eSize);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, eSize, eSize);

      const grad = ctx.createRadialGradient(eHalf, eHalf, 2, eHalf, eHalf, eHalf - 2);
      grad.addColorStop(0.0, 'rgba(255, 244, 202, 1)');
      grad.addColorStop(0.32, 'rgba(255, 148, 44, 0.96)');
      grad.addColorStop(0.66, 'rgba(218, 58, 18, 0.56)');
      grad.addColorStop(1.0, 'rgba(180, 34, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(eHalf, eHalf, eHalf - 2, 0, Math.PI * 2);
      ctx.fill();

      tex.refresh();
      setLinear(scene, BOSS2.textures.emberProjKey);
    }
  }

  // 10. Phase 2 steady warm orange glow overlay (no flashing)
  if (!scene.textures.exists(BOSS2.textures.phase2GlowKey)) {
    const gSize = 256;
    const gHalf = gSize * 0.5;
    const tex = scene.textures.createCanvas(BOSS2.textures.phase2GlowKey, gSize, gSize);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, gSize, gSize);
      const grad = ctx.createRadialGradient(gHalf, gHalf, 12, gHalf, gHalf, gHalf);
      grad.addColorStop(0.0, 'rgba(255, 168, 54, 0.88)');
      grad.addColorStop(0.45, 'rgba(242, 96, 24, 0.48)');
      grad.addColorStop(0.8, 'rgba(186, 46, 14, 0.14)');
      grad.addColorStop(1.0, 'rgba(186, 46, 14, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, gSize, gSize);
      tex.refresh();
      setLinear(scene, BOSS2.textures.phase2GlowKey);
    }
  }
}

/**
 * Mounted inside DarknessScene at depth 6.2 (above darkRT) so Cinder Warden telegraphs
 * remain clearly visible even in full darkness, with zero Graphics redraws or per-frame allocations.
 */
export class CinderWardenTelegraphRenderer {
  private swingConeBg: Phaser.GameObjects.Image;
  private swingConeFill: Phaser.GameObjects.Image;
  private slamCircleBg: Phaser.GameObjects.Image;
  private slamCircleFill: Phaser.GameObjects.Image;
  private slamCenterMark: Phaser.GameObjects.Image;
  private castLines: Phaser.GameObjects.Image[] = [];
  private castLinePulses: Phaser.GameObjects.Image[] = [];
  private castMuzzleMark: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    ensureCinderWardenTextures(scene);
    const depth = BOSS2.telegraphs.depthInDarkness;

    this.swingConeBg = scene.add
      .image(0, 0, BOSS2.textures.swingConeKey)
      .setOrigin(0.5, 0.5)
      .setDepth(depth)
      .setVisible(false);
    this.swingConeBg.disableInteractive();

    this.swingConeFill = scene.add
      .image(0, 0, BOSS2.textures.swingConeFillKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 0.01)
      .setVisible(false);
    this.swingConeFill.disableInteractive();

    this.slamCircleBg = scene.add
      .image(0, 0, BOSS2.textures.slamCircleKey)
      .setOrigin(0.5, 0.5)
      .setDepth(depth)
      .setVisible(false);
    this.slamCircleBg.disableInteractive();

    this.slamCircleFill = scene.add
      .image(0, 0, BOSS2.textures.slamCircleFillKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 0.01)
      .setVisible(false);
    this.slamCircleFill.disableInteractive();

    this.slamCenterMark = scene.add
      .image(0, 0, BOSS2.textures.slamCenterKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 0.02)
      .setVisible(false);
    this.slamCenterMark.disableInteractive();

    for (let i = 0; i < BOSS2.telegraphs.maxLineSlots; i++) {
      const line = scene.add
        .image(0, 0, BOSS2.textures.castLineKey)
        .setOrigin(0, 0.5)
        .setDepth(depth)
        .setVisible(false);
      line.disableInteractive();
      this.castLines.push(line);

      const pulse = scene.add
        .image(0, 0, BOSS2.textures.castLinePulseKey)
        .setOrigin(0, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(depth + 0.01)
        .setVisible(false);
      pulse.disableInteractive();
      this.castLinePulses.push(pulse);
    }

    this.castMuzzleMark = scene.add
      .image(0, 0, BOSS2.textures.castMuzzleKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth + 0.02)
      .setVisible(false);
    this.castMuzzleMark.disableInteractive();
  }

  public update(
    snap: CinderWardenTelegraphSnapshot | null,
    scrollX: number,
    scrollY: number
  ): void {
    const kind = snap ? snap.kind : 'none';
    const invRadiusBase = 1 / (BOSS2.telegraphs.texSize * 0.5 - 6);

    if (kind === 'swing' && snap) {
      const sx = snap.x - scrollX;
      const sy = snap.y - scrollY;
      const prog = Math.max(0, Math.min(1, snap.progress));
      const targetScale = snap.radius * invRadiusBase;
      // Smooth ease-out expansion with final-22% lock-in urgency flare
      const fillProg = 0.08 + 0.92 * Math.pow(prog, 0.85);
      const lockIn = prog > 0.78 ? (prog - 0.78) / 0.22 : 0;

      this.swingConeBg
        .setPosition(sx, sy)
        .setRotation(snap.angle)
        .setScale(targetScale)
        .setAlpha(0.86 + 0.14 * prog)
        .setVisible(true);

      this.swingConeFill
        .setPosition(sx, sy)
        .setRotation(snap.angle)
        .setScale(targetScale * fillProg)
        .setAlpha(0.28 + 0.36 * prog + 0.26 * lockIn)
        .setVisible(true);
    } else {
      if (this.swingConeBg.visible) this.swingConeBg.setVisible(false);
      if (this.swingConeFill.visible) this.swingConeFill.setVisible(false);
    }

    if (kind === 'slam' && snap) {
      const sx = snap.x - scrollX;
      const sy = snap.y - scrollY;
      const prog = Math.max(0, Math.min(1, snap.progress));
      const targetScale = snap.radius * invRadiusBase;
      const fillProg = 0.1 + 0.9 * Math.pow(prog, 0.88);
      const lockIn = prog > 0.78 ? (prog - 0.78) / 0.22 : 0;

      this.slamCircleBg
        .setPosition(sx, sy)
        .setScale(targetScale)
        .setAlpha(0.86 + 0.14 * prog)
        .setVisible(true);

      this.slamCircleFill
        .setPosition(sx, sy)
        .setScale(targetScale * fillProg)
        .setAlpha(0.28 + 0.38 * prog + 0.26 * lockIn)
        .setVisible(true);

      // Rotating, tightening epicenter warning sigil
      const centerScale = 1.18 - 0.36 * prog + 0.18 * lockIn;
      this.slamCenterMark
        .setPosition(sx, sy)
        .setRotation(prog * Math.PI * 0.75)
        .setScale(centerScale)
        .setAlpha(0.68 + 0.32 * prog)
        .setVisible(true);
    } else {
      if (this.slamCircleBg.visible) this.slamCircleBg.setVisible(false);
      if (this.slamCircleFill.visible) this.slamCircleFill.setVisible(false);
      if (this.slamCenterMark.visible) this.slamCenterMark.setVisible(false);
    }

    if (kind === 'cast' && snap) {
      const sx = snap.x - scrollX;
      const sy = snap.y - scrollY;
      const prog = Math.max(0, Math.min(1, snap.progress));
      const scaleX = snap.length / BOSS2.telegraphs.lineTexWidth;
      const lockIn = prog > 0.78 ? (prog - 0.78) / 0.22 : 0;
      const baseAlpha = 0.74 + 0.26 * prog;
      const pulseScaleX = Math.max(0.06, scaleX * (0.12 + 0.88 * Math.pow(prog, 0.82)));
      const pulseAlpha = 0.35 + 0.42 * prog + 0.23 * lockIn;
      const count = Math.min(snap.lineCount, this.castLines.length);

      for (let i = 0; i < this.castLines.length; i++) {
        const line = this.castLines[i];
        const pulse = this.castLinePulses[i];
        if (i < count) {
          const ang = snap.lineAngles[i];
          line
            .setPosition(sx, sy)
            .setRotation(ang)
            .setScale(scaleX, 1)
            .setAlpha(baseAlpha)
            .setVisible(true);
          pulse
            .setPosition(sx, sy)
            .setRotation(ang)
            .setScale(pulseScaleX, 0.85 + 0.3 * lockIn)
            .setAlpha(pulseAlpha)
            .setVisible(true);
        } else {
          if (line.visible) line.setVisible(false);
          if (pulse.visible) pulse.setVisible(false);
        }
      }

      // Contracting & brightening muzzle charge ring at projectile origin
      const muzzleScale = 1.25 - 0.55 * prog + 0.22 * lockIn;
      this.castMuzzleMark
        .setPosition(sx, sy)
        .setRotation(-prog * Math.PI * 1.1)
        .setScale(muzzleScale)
        .setAlpha(0.55 + 0.45 * prog)
        .setVisible(true);
    } else {
      for (let i = 0; i < this.castLines.length; i++) {
        if (this.castLines[i].visible) this.castLines[i].setVisible(false);
        if (this.castLinePulses[i].visible) this.castLinePulses[i].setVisible(false);
      }
      if (this.castMuzzleMark.visible) this.castMuzzleMark.setVisible(false);
    }
  }

  public destroy(): void {
    this.swingConeBg.destroy();
    this.swingConeFill.destroy();
    this.slamCircleBg.destroy();
    this.slamCircleFill.destroy();
    this.slamCenterMark.destroy();
    for (let i = 0; i < this.castLines.length; i++) {
      this.castLines[i].destroy();
    }
    this.castLines = [];
    for (let i = 0; i < this.castLinePulses.length; i++) {
      this.castLinePulses[i].destroy();
    }
    this.castLinePulses = [];
    this.castMuzzleMark.destroy();
  }
}

/**
 * Fully pooled, zero-allocation Stage 2 Boss ("Cinder Warden") state machine,
 * animation controller (frame-synced impacts), and combat hazards.
 */
export class CinderWardenController {
  private scene: Phaser.Scene;
  private boss: Phaser.Physics.Arcade.Sprite | null = null;
  private state: Boss2State = 'spawning';
  private activeAttack: Boss2AttackKind | null = null;
  private stateTimerMs: number = 0;
  private attackCooldownMs: number = BOSS2.state.initialDelayMs;
  private lastAttack: Boss2AttackKind | null = null;
  private attackAngle: number = 0;
  private attackLockedFlipX: boolean = false;
  private attackImpactFired: boolean = false;
  private attackUsingRealSheet: boolean = false;
  private attackTargetImpactFrame: number = 0;
  private attackTelegraphMs: number = 500;
  private attackAnimCompleted: boolean = false;
  private swingOriginX: number = 0;
  private swingOriginY: number = 0;
  private slamTargetX: number = 0;
  private slamTargetY: number = 0;
  private castOriginX: number = 0;
  private castOriginY: number = 0;
  // Locked cast projectile angles preserved independently from telegraphSnap so clearTelegraphOnly() never zeroes them
  private lockedCastCount: number = 0;
  private readonly lockedCastAngles = new Float64Array(BOSS2.telegraphs.maxLineSlots);
  private currentAnimKey: Boss2AnimKey | null = null;
  private currentUsingPlaceholder: boolean = false;
  private hitFlashActive: boolean = false;

  // Latest frame context & smoothed player velocity for predictive CAST aiming (zero allocations)
  private latestPlayerX: number = 0;
  private latestPlayerY: number = 0;
  private prevPlayerX: number = 0;
  private prevPlayerY: number = 0;
  private hasPrevPlayerPos: boolean = false;
  private playerVelX: number = 0;
  private playerVelY: number = 0;
  private latestBurningTrees: BurningTreeSystem | null = null;
  private latestCallbacks: CinderWardenCallbacks | null = null;
  private readonly tempPoint = { x: 0, y: 0 };

  // Phase 2 staggered offset second CAST volley (simDeltaMs driven, auto-cancelled on death/clear)
  private pendingSecondVolleyMs: number = 0;
  private pendingSecondVolleyCount: number = 0;
  private pendingSecondVolleyX: number = 0;
  private pendingSecondVolleyY: number = 0;
  private readonly pendingSecondVolleyAngles = new Float64Array(BOSS2.telegraphs.maxLineSlots);

  // Spawn state (boss2_spawn or rise-from-ground fallback)
  private spawnUsingRealSheet: boolean = false;
  private spawnAnimCompleted: boolean = false;
  private spawnTargetY: number = 0;
  private spawnBurstsFired: boolean = false;

  // Phase 2 state (steady warm orange glow overlay, no flashing)
  private isPhase2: boolean = false;
  private phase2GlowElapsedMs: number = 0;

  // Anti-stuck tree steering state
  private steerTieBreaker: number = 250;
  private stuckCheckTimerMs: number = 0;
  private stuckLastX: number = 0;
  private stuckLastY: number = 0;

  // Phase 2 steady orange glow overlay sprite
  private phase2GlowSprite: Phaser.GameObjects.Image;

  // Pooled melee swing slash + outer heat shockwave crescent visuals
  private swingSlashSprite: Phaser.GameObjects.Image;
  private swingShockwaveSprite: Phaser.GameObjects.Image;
  private swingSlashTimerMs: number = 0;
  private swingSlashBaseAngle: number = 0;
  private swingSlashBaseScale: number = 1;
  private swingSlashSweepDir: number = 1;

  // Pooled expanding slam fire ring + animated fx_firering_sheet + fx_ash_burst_sheet
  private fireRingSprite: Phaser.GameObjects.Image;
  private slamFireRingFxSprite: Phaser.GameObjects.Sprite;
  private slamAshBurstFxSprite: Phaser.GameObjects.Sprite;
  private fireRingActive: boolean = false;
  private fireRingUsingSheet: boolean = false;
  private fireRingX: number = 0;
  private fireRingY: number = 0;
  private fireRingMaxRadius: number = BOSS2.slam.radius;
  private fireRingElapsedMs: number = 0;
  private fireRingHitPlayer: boolean = false;

  // Pooled ground fire patches (5 in Phase 1, 7 in Phase 2)
  private firePatchPool: FirePatchSlot[] = [];
  private firePatchTickAccumMs: number = 0;

  // Pooled ember projectiles (5 in Phase 1, 7+6 in Phase 2, absorbed by trees)
  private emberProjPool: EmberProjSlot[] = [];

  // Death sequence state (0.3s slow-mo + boss2_death hold last frame + 1.5s fade out)
  private deathUsingRealSheet: boolean = false;
  private deathAnimFinished: boolean = false;
  private deathElapsedMs: number = 0;
  private deathFadeElapsedMs: number = 0;
  private deathSlowMoDone: boolean = false;
  private deathCompleted: boolean = false;
  private deathStartY: number = 0;

  // Bound animation listeners (cleaned up on destroy / detach)
  private boundAnimUpdate:
    | ((anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => void)
    | null = null;
  private boundAnimComplete: ((anim: Phaser.Animations.Animation) => void) | null = null;

  // Fixed pre-allocated telegraph snapshot shared with DarknessScene
  private readonly telegraphSnap: CinderWardenTelegraphSnapshot = {
    kind: 'none',
    x: 0,
    y: 0,
    angle: 0,
    radius: 0,
    length: 0,
    progress: 0,
    lineCount: 0,
    lineAngles: new Float64Array(BOSS2.telegraphs.maxLineSlots),
  };

  // Fixed pre-allocated debug snapshot shared with HUD overlay
  private readonly debugSnap: Boss2DebugStats = {
    active: false,
    state: 'NONE',
    attackKind: null,
    animKey: '--',
    frameIndex: 0,
    maxFrame: 0,
    telegraphRemainingSec: 0,
    flipX: false,
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    ensureCinderWardenTextures(scene);

    this.phase2GlowSprite = scene.add
      .image(0, 0, BOSS2.textures.phase2GlowKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(BOSS2.visuals.depth - 0.1)
      .setAlpha(0)
      .setVisible(false);
    this.phase2GlowSprite.disableInteractive();

    this.swingSlashSprite = scene.add
      .image(0, 0, BOSS2.textures.swingSlashKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(BOSS2.visuals.depth + 1)
      .setVisible(false);
    this.swingSlashSprite.disableInteractive();

    this.swingShockwaveSprite = scene.add
      .image(0, 0, BOSS2.textures.swingShockwaveKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(BOSS2.visuals.depth + 1.05)
      .setVisible(false);
    this.swingShockwaveSprite.disableInteractive();

    this.fireRingSprite = scene.add
      .image(0, 0, BOSS2.textures.fireRingKey)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(22.4)
      .setVisible(false);
    this.fireRingSprite.disableInteractive();

    const initFireRingKey = scene.textures.exists('boss2_fx_firering')
      ? 'boss2_fx_firering'
      : BOSS2.textures.fireRingKey;
    this.slamFireRingFxSprite = scene.add
      .sprite(0, 0, initFireRingKey, 0)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(22.6)
      .setVisible(false);
    this.slamFireRingFxSprite.disableInteractive();
    this.slamFireRingFxSprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.slamFireRingFxSprite.setVisible(false);
    });

    const initAshBurstKey = scene.textures.exists('boss2_fx_ash_burst')
      ? 'boss2_fx_ash_burst'
      : BOSS2.textures.fireRingKey;
    this.slamAshBurstFxSprite = scene.add
      .sprite(0, 0, initAshBurstKey, 0)
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(22.8)
      .setVisible(false);
    this.slamAshBurstFxSprite.disableInteractive();
    this.slamAshBurstFxSprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.slamAshBurstFxSprite.setVisible(false);
    });

    for (let i = 0; i < BOSS2.slam.maxPooledPatches; i++) {
      const spr = scene.add
        .image(0, 0, BOSS2.textures.firePatchKey)
        .setOrigin(0.5, 0.5)
        .setDepth(5.5)
        .setVisible(false);
      spr.disableInteractive();
      this.firePatchPool.push({
        active: false,
        x: 0,
        y: 0,
        lifeMs: 0,
        maxLifeMs: BOSS2.slam.patchDurationMs,
        phase: i * 1.37,
        sprite: spr,
      });
    }

    const initEmberKey = scene.textures.exists('boss2_fx_ember_shot')
      ? 'boss2_fx_ember_shot'
      : BOSS2.textures.emberProjKey;
    for (let i = 0; i < BOSS2.cast.maxPooledProjectiles; i++) {
      const spr = scene.add
        .sprite(0, 0, initEmberKey, 0)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(23.5)
        .setDisplaySize(
          BOSS2.cast.projectileHitboxRadius * 2.6,
          BOSS2.cast.projectileHitboxRadius * 2.6
        )
        .setVisible(false);
      spr.disableInteractive();
      this.emberProjPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        lifeMs: 0,
        damage: BOSS2.cast.projectileDamage,
        usingAnimSheet: false,
        sprite: spr,
      });
    }
  }

  public attachBoss(boss: Phaser.Physics.Arcade.Sprite): void {
    this.detachBossListeners();
    this.boss = boss;
    this.state = 'spawning';
    this.activeAttack = null;
    this.stateTimerMs = 0;
    this.attackCooldownMs = BOSS2.state.initialDelayMs;
    this.lastAttack = null;
    this.attackImpactFired = false;
    this.attackAnimCompleted = false;
    this.attackLockedFlipX = false;
    this.lockedCastCount = 0;
    this.fireRingMaxRadius = BOSS2.slam.radius;
    this.hasPrevPlayerPos = false;
    this.playerVelX = 0;
    this.playerVelY = 0;
    this.pendingSecondVolleyMs = 0;
    this.pendingSecondVolleyCount = 0;
    this.currentAnimKey = null;
    this.hitFlashActive = false;
    this.isPhase2 = false;
    this.phase2GlowElapsedMs = 0;
    this.stuckCheckTimerMs = 0;
    this.stuckLastX = boss.x;
    this.stuckLastY = boss.y;
    this.deathElapsedMs = 0;
    this.deathFadeElapsedMs = 0;
    this.deathSlowMoDone = false;
    this.deathCompleted = false;
    this.deathAnimFinished = false;
    this.spawnTargetY = boss.y;
    this.spawnBurstsFired = false;
    this.spawnAnimCompleted = false;
    this.clearAllHazardsAndTelegraphs();

    // Frame-event driven impact trigger: fires exactly when the animation hits BOSS2.impactFrame
    this.boundAnimUpdate = (
      anim: Phaser.Animations.Animation,
      frame: Phaser.Animations.AnimationFrame
    ) => {
      if (!this.boss || !this.boss.active || !this.boss.scene) return;
      if (this.state !== 'telegraph' || this.attackImpactFired || !this.activeAttack) return;
      const expectedKey = ATTACK_TO_ANIM_KEY[this.activeAttack];
      if (anim.key !== expectedKey) return;
      const frameIdx = this.extractFrameIndex(frame);
      if (frameIdx >= this.attackTargetImpactFrame) {
        this.fireLockedAttackImpact(this.boss);
      }
    };

    this.boundAnimComplete = (anim: Phaser.Animations.Animation) => {
      if (!this.boss || !this.boss.active || !this.boss.scene) return;
      if (this.state === 'spawning' && anim.key === 'boss2_spawn') {
        this.spawnAnimCompleted = true;
      } else if (
        (this.state === 'telegraph' || this.state === 'attack') &&
        this.activeAttack !== null &&
        (anim.key === ATTACK_TO_ANIM_KEY[this.activeAttack] || anim.key === 'boss_attack')
      ) {
        // If animation completed before frame event fired, ensure impact still triggers cleanly
        if (this.state === 'telegraph' && !this.attackImpactFired) {
          this.fireLockedAttackImpact(this.boss);
        }
        this.attackAnimCompleted = true;
      } else if (this.state === 'dying' && anim.key === 'boss2_death') {
        this.deathAnimFinished = true;
        // Hold last frame cleanly while fading out over 1.5s
        const meta = getBoss2SheetMeta('boss2_death');
        const lastIdx = meta ? Math.max(0, meta.frames - 1) : 0;
        this.boss.anims.stop();
        this.boss.setFrame(lastIdx);
      }
    };

    boss.on(Phaser.Animations.Events.ANIMATION_UPDATE, this.boundAnimUpdate);
    boss.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.boundAnimComplete);

    // Start boss2_spawn animation if available, otherwise code rise-from-ground fallback
    if (hasBoss2Sheet(this.scene, 'boss2_spawn')) {
      this.spawnUsingRealSheet = true;
      this.playStateAnim(boss, 'boss2_spawn', true);
    } else {
      this.spawnUsingRealSheet = false;
      this.playStateAnim(boss, 'boss2_idle', true);
      boss.y = this.spawnTargetY + BOSS2.spawn.fallbackRisePx;
      boss.setAlpha(0.05);
    }
  }

  private detachBossListeners(): void {
    if (this.boss) {
      if (this.boundAnimUpdate) {
        this.boss.off(Phaser.Animations.Events.ANIMATION_UPDATE, this.boundAnimUpdate);
      }
      if (this.boundAnimComplete) {
        this.boss.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this.boundAnimComplete);
      }
    }
    this.boundAnimUpdate = null;
    this.boundAnimComplete = null;
  }

  public isPhase2Active(): boolean {
    return this.isPhase2;
  }

  public isDying(): boolean {
    return this.state === 'dying';
  }

  /**
   * True whenever boss movement (including knockback) must remain strictly locked.
   */
  public isMovementLocked(): boolean {
    return this.state !== 'idle' && this.state !== 'walk';
  }

  public getSlowMoScale(): number {
    if (this.state === 'dying' && !this.deathSlowMoDone) {
      return BOSS2.death.slowMoTimeScale;
    }
    return 1.0;
  }

  public getTelegraphSnapshot(): CinderWardenTelegraphSnapshot {
    return this.telegraphSnap;
  }

  public getDebugSnapshot(): Boss2DebugStats {
    const boss = this.boss;
    if (!boss || !boss.active || !boss.scene) {
      this.debugSnap.active = false;
      this.debugSnap.state = 'INACTIVE';
      this.debugSnap.attackKind = null;
      this.debugSnap.animKey = '--';
      this.debugSnap.frameIndex = 0;
      this.debugSnap.maxFrame = 0;
      this.debugSnap.telegraphRemainingSec = 0;
      this.debugSnap.flipX = false;
      return this.debugSnap;
    }

    const animKey = boss.anims.currentAnim?.key ?? this.currentAnimKey ?? '--';
    const meta = this.currentAnimKey ? getBoss2SheetMeta(this.currentAnimKey) : null;
    const totalFrames = meta
      ? meta.frames
      : boss.anims.currentAnim?.frames?.length ?? 1;

    this.debugSnap.active = true;
    this.debugSnap.state = this.state.toUpperCase();
    this.debugSnap.attackKind = this.activeAttack;
    this.debugSnap.animKey = animKey;
    this.debugSnap.frameIndex = this.getCurrentAnimFrameIndex(boss);
    this.debugSnap.maxFrame = Math.max(0, totalFrames - 1);
    this.debugSnap.telegraphRemainingSec =
      this.state === 'telegraph' && !this.attackImpactFired
        ? Math.max(0, (this.attackTelegraphMs - this.stateTimerMs) * 0.001)
        : 0;
    this.debugSnap.flipX = boss.flipX;
    return this.debugSnap;
  }

  /**
   * Triggers the 80 ms white hit flash on the Stage 2 boss without breaking animation state.
   */
  public triggerHitFlash(boss: Phaser.Physics.Arcade.Sprite): void {
    this.hitFlashActive = true;
    boss.setTint(BOSS2.visuals.hitFlashTint).setTintMode(Phaser.TintModes.FILL);
  }

  /**
   * Restores the proper non-flashing tint after an 80 ms white hit flash.
   * Real Cinder Warden sheets are untinted; placeholder fallback keeps its orange tint.
   */
  public restoreVisualTint(boss: Phaser.Physics.Arcade.Sprite): void {
    this.hitFlashActive = false;
    boss.setTintMode(Phaser.TintModes.MULTIPLY);
    if (this.state === 'dying') {
      if (!this.deathUsingRealSheet) {
        boss.setTint(BOSS2.death.ashTint);
      } else {
        boss.clearTint();
      }
      return;
    }
    if (this.currentUsingPlaceholder) {
      boss.setTint(
        this.isPhase2 ? BOSS2.phase2.placeholderTint : BOSS2.visuals.placeholderTint
      );
    } else {
      boss.clearTint();
    }
  }

  /**
   * Plays a boss2_* animation strictly on state change, using play(key, true) for loops
   * and play(key, false) once when entering one-shot states. Preserves any active hit-flash tint.
   */
  private playStateAnim(
    boss: Phaser.Physics.Arcade.Sprite,
    desiredKey: Boss2AnimKey,
    forceRestart: boolean = false
  ): boolean {
    const hasReal = hasBoss2Sheet(this.scene, desiredKey);
    const keepHitFlash = this.hitFlashActive;

    if (hasReal) {
      this.currentUsingPlaceholder = false;
      if (this.currentAnimKey !== desiredKey || boss.texture.key !== desiredKey) {
        this.currentAnimKey = desiredKey;
        if (boss.texture.key !== desiredKey) {
          boss.setTexture(desiredKey, 0);
        }
        applyBoss2SpriteLayout(boss, desiredKey, true);
        if (!keepHitFlash) {
          boss.clearTint();
        }
      }
      if (forceRestart) {
        boss.play(desiredKey, false);
      } else {
        // ignoreIfPlaying = true so an already-playing loop is NEVER restarted
        boss.play(desiredKey, true);
      }
      return true;
    }

    // Fallback: keep placeholder sprite ONLY for the missing sheet
    this.currentUsingPlaceholder = true;
    this.currentAnimKey = null;
    const isAttackFallback =
      desiredKey === 'boss2_attack_slam' ||
      desiredKey === 'boss2_attack_swing' ||
      desiredKey === 'boss2_attack_cast';
    const fallbackTex = isAttackFallback ? 'boss_attack_sheet' : 'boss_idle_sheet';
    const fallbackAnim = isAttackFallback ? 'boss_attack' : 'boss_idle';
    if (boss.texture.key !== fallbackTex && this.scene.textures.exists(fallbackTex)) {
      boss.setTexture(fallbackTex, 0);
      applyBoss2SpriteLayout(boss, null, false);
    }
    if (!keepHitFlash) {
      boss.setTint(
        this.isPhase2 ? BOSS2.phase2.placeholderTint : BOSS2.visuals.placeholderTint
      );
    }
    if (this.scene.anims.exists(fallbackAnim)) {
      boss.play(fallbackAnim, !forceRestart);
    }
    return false;
  }

  private transitionLocomotionState(
    boss: Phaser.Physics.Arcade.Sprite,
    nextState: 'idle' | 'walk'
  ): void {
    if (this.state === nextState) return;
    this.state = nextState;
    this.stateTimerMs = 0;
    this.activeAttack = null;
    boss.anims.timeScale = 1.0;
    this.playStateAnim(boss, nextState === 'walk' ? 'boss2_walk' : 'boss2_idle', false);
  }

  public startDeathSequence(
    boss: Phaser.Physics.Arcade.Sprite,
    callbacks: CinderWardenCallbacks
  ): void {
    if (this.state === 'dying') return;
    this.boss = boss;
    this.state = 'dying';
    this.activeAttack = null;
    this.attackImpactFired = true; // cancel any pending impact event or fallback timer
    this.attackAnimCompleted = true;
    this.stateTimerMs = 0;
    this.deathElapsedMs = 0;
    this.deathFadeElapsedMs = 0;
    this.deathSlowMoDone = false;
    this.deathCompleted = false;
    this.deathAnimFinished = false;
    this.deathStartY = boss.y;

    this.clearAllHazardsAndTelegraphs();

    // Stop movement & disable contact collision during death sequence
    boss.setVelocity(0, 0);
    const body = boss.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.enable = false;
    }
    boss.anims.timeScale = 1.0;
    this.hitFlashActive = false;
    boss.setTintMode(Phaser.TintModes.MULTIPLY);

    if (hasBoss2Sheet(this.scene, 'boss2_death')) {
      this.deathUsingRealSheet = true;
      boss.clearTint();
      this.playStateAnim(boss, 'boss2_death', true);
    } else {
      this.deathUsingRealSheet = false;
      this.deathAnimFinished = true;
      if (boss.anims) {
        boss.anims.stop();
      }
      boss.setTint(BOSS2.death.ashTint);
    }

    callbacks.spawnDeathBursts(boss.x, getBoss2BodyCenterY(boss.y));
    callbacks.triggerCameraShake(260, 0.008);
    callbacks.showCallout(boss.x, boss.y - BOSS2.displayHeight * 0.82, 'CINDER WARDEN FALLS!', '#ff9c42');
  }

  public update(
    realDeltaMs: number,
    simDeltaMs: number,
    timeSec: number,
    playerX: number,
    playerY: number,
    bossHp: number,
    bossMaxHp: number,
    burningTrees: BurningTreeSystem | null,
    callbacks: CinderWardenCallbacks
  ): void {
    const boss = this.boss;
    if (!boss || !boss.active || !boss.scene) {
      this.clearTelegraphOnly();
      if (this.phase2GlowSprite.visible) this.phase2GlowSprite.setVisible(false);
      return;
    }

    // Keep latest combat context & smoothed player velocity for predictive CAST aiming
    if (this.hasPrevPlayerPos && simDeltaMs > 4) {
      const invDt = 1000 / simDeltaMs;
      const rawVx = Phaser.Math.Clamp((playerX - this.prevPlayerX) * invDt, -420, 420);
      const rawVy = Phaser.Math.Clamp((playerY - this.prevPlayerY) * invDt, -420, 420);
      this.playerVelX = this.playerVelX * 0.72 + rawVx * 0.28;
      this.playerVelY = this.playerVelY * 0.72 + rawVy * 0.28;
    } else {
      this.hasPrevPlayerPos = true;
    }
    this.prevPlayerX = playerX;
    this.prevPlayerY = playerY;
    this.latestPlayerX = playerX;
    this.latestPlayerY = playerY;
    this.latestBurningTrees = burningTrees;
    this.latestCallbacks = callbacks;

    // Y-sort boss depth smoothly with Stage 2 burning trees and enemies
    if (burningTrees) {
      const yDepth = burningTrees.computeYSortDepth(boss.y);
      boss.setDepth(yDepth);
      this.phase2GlowSprite.setDepth(yDepth - 0.05);
      this.swingSlashSprite.setDepth(yDepth + 0.08);
      this.swingShockwaveSprite.setDepth(yDepth + 0.1);
    }

    // Death sequence runs on real-time delta so 0.3s slow-mo, animation & 1.5s fade stay exact
    if (this.state === 'dying') {
      this.updateDeathSequence(realDeltaMs, boss, callbacks);
      return;
    }

    // 0. Spawn sequence (boss2_spawn plays once, or rise-from-ground fallback)
    if (this.state === 'spawning') {
      boss.setVelocity(0, 0);
      boss.setFlipX(playerX < boss.x);
      if (!this.spawnBurstsFired) {
        this.spawnBurstsFired = true;
        callbacks.spawnSpawnBursts(boss.x, boss.y);
      }

      if (this.spawnUsingRealSheet) {
        if (this.spawnAnimCompleted || !boss.anims.isPlaying) {
          this.transitionLocomotionState(boss, 'idle');
        }
      } else {
        this.stateTimerMs += simDeltaMs;
        const t = Math.min(1, this.stateTimerMs / BOSS2.spawn.fallbackDurationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        boss.y = this.spawnTargetY + BOSS2.spawn.fallbackRisePx * (1 - eased);
        boss.setAlpha(Math.min(1, 0.1 + eased * 0.9));
        if (t >= 1) {
          boss.y = this.spawnTargetY;
          boss.setAlpha(1);
          this.transitionLocomotionState(boss, 'idle');
        }
      }
      return;
    }

    // 1. Check Phase 2 transition (< 40% HP)
    if (!this.isPhase2 && bossHp > 0 && bossHp / Math.max(1, bossMaxHp) < BOSS2.phase2.hpThreshold) {
      this.isPhase2 = true;
      this.phase2GlowElapsedMs = 0;
      if (this.currentUsingPlaceholder && !this.hitFlashActive) {
        boss.setTint(BOSS2.phase2.placeholderTint);
      }
      this.attackCooldownMs = Math.min(this.attackCooldownMs, BOSS2.phase2.attackIntervalMs * 0.45);
      soundManager.playBossWarning();
      callbacks.triggerCameraShake(320, 0.008);
      callbacks.showCallout(
        boss.x,
        boss.y - BOSS2.displayHeight * 0.85,
        'CINDER WARDEN IGNITES!',
        '#ff7a2e'
      );
      callbacks.onPhase2Enter(boss);
    }

    // 2. Sync Phase 2 steady warm orange glow overlay (NO flashing)
    if (this.isPhase2) {
      this.phase2GlowElapsedMs = Math.min(
        BOSS2.phase2.glowFadeInMs,
        this.phase2GlowElapsedMs + simDeltaMs
      );
      const fadeIn = this.phase2GlowElapsedMs / BOSS2.phase2.glowFadeInMs;
      this.phase2GlowSprite
        .setPosition(boss.x, getBoss2BodyCenterY(boss.y))
        .setScale(BOSS2.phase2.glowScale)
        .setAlpha(BOSS2.phase2.glowAlpha * fadeIn)
        .setVisible(true);
    } else if (this.phase2GlowSprite.visible) {
      this.phase2GlowSprite.setVisible(false);
    }

    // 2b. Fire staggered Phase 2 offset CAST second volley when ready (auto-cancelled on death)
    if (this.pendingSecondVolleyCount > 0) {
      this.pendingSecondVolleyMs -= simDeltaMs;
      if (this.pendingSecondVolleyMs <= 0) {
        const count = this.pendingSecondVolleyCount;
        this.pendingSecondVolleyCount = 0;
        this.pendingSecondVolleyMs = 0;
        soundManager.playBossAttack();
        for (let i = 0; i < count; i++) {
          this.spawnEmberProjectile(
            this.pendingSecondVolleyX,
            this.pendingSecondVolleyY,
            this.pendingSecondVolleyAngles[i],
            BOSS2.cast.phase2ProjectileSpeed,
            BOSS2.cast.phase2ProjectileDamage
          );
        }
      }
    }

    // 3. Update active combat hazards (swing slash FX, expanding fire ring, fire patches, ember projectiles)
    this.updateSwingSlashFx(simDeltaMs);
    this.updateFireRing(simDeltaMs, playerX, playerY, callbacks);
    this.updateFirePatches(simDeltaMs, timeSec, playerX, playerY, callbacks);
    this.updateEmberProjectiles(simDeltaMs, playerX, playerY, burningTrees, callbacks);

    // 4. Boss AI State Machine (sole driver of behavior & animations)
    const bodyCenterY = getBoss2BodyCenterY(boss.y);
    const dx = playerX - boss.x;
    const dyBody = playerY - bodyCenterY;
    const distToPlayer = Math.sqrt(dx * dx + dyBody * dyBody);
    const angleToPlayer = Math.atan2(dyBody, dx);

    switch (this.state) {
      case 'idle':
      case 'walk': {
        this.clearTelegraphOnly();
        boss.anims.timeScale = 1.0;
        boss.setFlipX(dx < 0);

        const baseSpeed = this.isPhase2 ? BOSS2.stats.phase2WalkSpeed : BOSS2.stats.walkSpeed;
        const moveSpeed =
          distToPlayer > BOSS2.stats.farPursuitDistPx
            ? baseSpeed * BOSS2.stats.farPursuitSpeedMult
            : baseSpeed;

        let vx = Math.cos(angleToPlayer) * moveSpeed;
        let vy = Math.sin(angleToPlayer) * moveSpeed;

        if (burningTrees) {
          // Anti-stuck tie-breaker flip so boss never gets wedged on symmetric tree clusters
          this.stuckCheckTimerMs += simDeltaMs;
          if (this.stuckCheckTimerMs >= BOSS2.stats.antiStuckWindowMs) {
            const movedSq =
              (boss.x - this.stuckLastX) * (boss.x - this.stuckLastX) +
              (boss.y - this.stuckLastY) * (boss.y - this.stuckLastY);
            if (movedSq < BOSS2.stats.antiStuckMinMovePx * BOSS2.stats.antiStuckMinMovePx) {
              this.steerTieBreaker = this.steerTieBreaker > 500 ? 250 : 750;
            }
            this.stuckLastX = boss.x;
            this.stuckLastY = boss.y;
            this.stuckCheckTimerMs = 0;
          }

          burningTrees.steerGroundEnemy(
            boss,
            BOSS2.stats.steeringRadius,
            vx,
            vy,
            this.steerTieBreaker
          );
          vx = burningTrees.steerOut.vx;
          vy = burningTrees.steerOut.vy;
        }

        boss.setVelocity(vx, vy);
        const isMoving = vx * vx + vy * vy > BOSS2.state.walkVelThresholdSq;
        const desiredLocomotion: 'idle' | 'walk' = isMoving ? 'walk' : 'idle';
        if (this.state !== desiredLocomotion) {
          this.transitionLocomotionState(boss, desiredLocomotion);
        }

        this.attackCooldownMs -= simDeltaMs;
        if (this.attackCooldownMs <= 0) {
          this.beginNextAttack(boss, playerX, playerY, bodyCenterY, distToPlayer);
        }
        break;
      }

      case 'telegraph': {
        // Movement and facing remain strictly locked during TELEGRAPH
        boss.setVelocity(0, 0);
        boss.setFlipX(this.attackLockedFlipX);
        this.stateTimerMs += simDeltaMs;

        const prog = Math.min(1, this.stateTimerMs / Math.max(1, this.attackTelegraphMs));
        if (this.activeAttack === 'swing') {
          this.telegraphSnap.kind = 'swing';
          this.telegraphSnap.x = this.swingOriginX;
          this.telegraphSnap.y = this.swingOriginY;
          this.telegraphSnap.angle = this.attackAngle;
          this.telegraphSnap.radius = this.getCurrentSwingRange();
          this.telegraphSnap.progress = prog;
        } else if (this.activeAttack === 'slam') {
          this.telegraphSnap.kind = 'slam';
          this.telegraphSnap.x = this.slamTargetX;
          this.telegraphSnap.y = this.slamTargetY;
          this.telegraphSnap.radius = this.fireRingMaxRadius;
          this.telegraphSnap.progress = prog;
        } else if (this.activeAttack === 'cast') {
          this.telegraphSnap.kind = 'cast';
          this.telegraphSnap.x = this.castOriginX;
          this.telegraphSnap.y = this.castOriginY;
          this.telegraphSnap.length = BOSS2.cast.telegraphLength;
          this.telegraphSnap.progress = prog;
          this.telegraphSnap.lineCount = this.lockedCastCount;
          for (let i = 0; i < this.lockedCastCount; i++) {
            this.telegraphSnap.lineAngles[i] = this.lockedCastAngles[i];
          }
        }

        // Primary trigger is ANIMATION_UPDATE event; this fallback guarantees impact never stalls
        if (!this.attackImpactFired) {
          const hitFallbackTimer = this.attackUsingRealSheet
            ? this.attackAnimCompleted ||
              !boss.anims.isPlaying ||
              this.getCurrentAnimFrameIndex(boss) >= this.attackTargetImpactFrame ||
              this.stateTimerMs >= this.attackTelegraphMs + BOSS2.state.impactFallbackGraceMs
            : this.stateTimerMs >= this.attackTelegraphMs;

          if (hitFallbackTimer) {
            this.fireLockedAttackImpact(boss);
          }
        }
        break;
      }

      case 'attack': {
        // Post-impact follow-through frames; movement and facing stay locked, telegraph stays hidden
        boss.setVelocity(0, 0);
        boss.setFlipX(this.attackLockedFlipX);
        this.clearTelegraphOnly();
        this.stateTimerMs += simDeltaMs;

        if (
          !this.attackUsingRealSheet ||
          this.attackAnimCompleted ||
          !boss.anims.isPlaying ||
          this.stateTimerMs >= BOSS2.state.attackPostImpactTimeoutMs
        ) {
          this.enterRecover(boss);
        }
        break;
      }

      case 'recover': {
        // Movement stays locked during RECOVER; idle anim was already set on transition
        this.clearTelegraphOnly();
        boss.setVelocity(0, 0);
        boss.anims.timeScale = 1.0;
        this.stateTimerMs += simDeltaMs;
        const recoverMs = this.isPhase2
          ? BOSS2.state.phase2RecoverDurationMs
          : BOSS2.state.recoverDurationMs;
        if (this.stateTimerMs >= recoverMs) {
          this.attackCooldownMs = this.isPhase2
            ? BOSS2.phase2.attackIntervalMs
            : BOSS2.state.attackIntervalMs;
          this.transitionLocomotionState(boss, 'idle');
        }
        break;
      }
    }
  }

  private extractFrameIndex(frame: Phaser.Animations.AnimationFrame | null | undefined): number {
    if (!frame) return 0;
    if (typeof frame.textureFrame === 'number') {
      return frame.textureFrame;
    }
    const parsed = parseInt(String(frame.textureFrame), 10);
    if (!Number.isNaN(parsed)) return parsed;
    return Math.max(0, (frame.index || 1) - 1);
  }

  private getCurrentAnimFrameIndex(boss: Phaser.Physics.Arcade.Sprite): number {
    return this.extractFrameIndex(boss.anims.currentFrame);
  }

  /**
   * Executes the active attack's impact ONCE (triggered by ANIMATION_UPDATE at impactFrame
   * or by the fallback timer if the frame event was skipped), transitioning TELEGRAPH -> ATTACK.
   */
  private fireLockedAttackImpact(boss: Phaser.Physics.Arcade.Sprite): void {
    if (this.attackImpactFired || this.state !== 'telegraph' || !this.activeAttack) return;
    const callbacks = this.latestCallbacks;
    if (!callbacks) return;

    this.attackImpactFired = true;
    this.state = 'attack';
    this.stateTimerMs = 0;
    boss.anims.timeScale = 1.0;
    this.clearTelegraphOnly();

    if (this.activeAttack === 'swing') {
      this.executeSwing(
        boss,
        this.latestPlayerX,
        this.latestPlayerY,
        this.getCurrentSwingRange(),
        this.latestBurningTrees,
        callbacks
      );
    } else if (this.activeAttack === 'slam') {
      this.executeSlam(callbacks);
    } else if (this.activeAttack === 'cast') {
      this.executeCast();
    }
  }

  private getCurrentSwingRange(): number {
    return this.isPhase2
      ? BOSS2.swing.range * BOSS2.phase2.swingRangeMultiplier
      : BOSS2.swing.range;
  }

  private getCurrentSlamRadius(): number {
    return this.isPhase2 ? BOSS2.slam.phase2Radius : BOSS2.slam.radius;
  }

  /**
   * Smart distance-aware attack selection:
   * - Never wastes melee SWING when player is far outside cleave reach.
   * - Applies close-range cleave/slam pressure, mid-range slam/cast mixups, and long-range cast volleys.
   */
  private pickNextAttack(distToPlayer: number): Boss2AttackKind {
    const swingReach = this.getCurrentSwingRange();

    // Close range: brutal cleave & ground slam pressure
    if (distToPlayer <= swingReach + 45) {
      if (this.lastAttack === 'swing') return 'slam';
      if (this.lastAttack === 'slam') return 'swing';
      return Math.random() < 0.56 ? 'swing' : 'slam';
    }

    // Mid range: alternate ground slam denial & ember barrage (occasional swing if barely in reach)
    if (distToPlayer <= 340) {
      if (this.lastAttack === 'cast') {
        if (distToPlayer <= swingReach + 65 && Math.random() < 0.35) {
          return 'swing';
        }
        return 'slam';
      }
      if (this.lastAttack === 'slam') return 'cast';
      return Math.random() < 0.55 ? 'cast' : 'slam';
    }

    // Far range: punish kiting with ember barrage; mix in slam only if within moderate reach
    if (this.lastAttack === 'cast' && distToPlayer <= 430) {
      return 'slam';
    }
    return 'cast';
  }

  private beginNextAttack(
    boss: Phaser.Physics.Arcade.Sprite,
    playerX: number,
    playerY: number,
    bodyCenterY: number,
    distToPlayer: number
  ): void {
    const next = this.pickNextAttack(distToPlayer);
    this.lastAttack = next;
    this.activeAttack = next;
    this.state = 'telegraph';
    this.stateTimerMs = 0;
    this.attackImpactFired = false;
    this.attackAnimCompleted = false;

    // Lock facing & attack direction ONCE at telegraph start (sprites face RIGHT; flipX when left)
    const faceLeft = playerX < boss.x;
    this.attackLockedFlipX = faceLeft;
    boss.setFlipX(faceLeft);
    boss.setVelocity(0, 0);

    // Compute exact attack geometry from BOSS HITBOX CENTER + locked facing + BOSS2 constants
    if (next === 'swing') {
      const origin = getBoss2SwingOrigin(boss.x, boss.y, faceLeft, this.tempPoint);
      this.swingOriginX = origin.x;
      this.swingOriginY = origin.y;
      this.attackAngle = Math.atan2(playerY - this.swingOriginY, playerX - this.swingOriginX);
    } else if (next === 'slam') {
      const aimAngle = Math.atan2(playerY - bodyCenterY, playerX - boss.x);
      this.attackAngle = aimAngle;
      this.fireRingMaxRadius = this.getCurrentSlamRadius();
      const slamCenter = getBoss2SlamCenter(boss.x, boss.y, faceLeft, aimAngle, this.tempPoint);
      this.slamTargetX = slamCenter.x;
      this.slamTargetY = slamCenter.y;
    } else {
      const spawn = getBoss2CastSpawn(boss.x, boss.y, faceLeft, this.tempPoint);
      this.castOriginX = spawn.x;
      this.castOriginY = spawn.y;

      // Predictive lead aiming so strafing players must actively dodge the volley
      const rawLeadX = this.playerVelX * BOSS2.cast.leadSec;
      const rawLeadY = this.playerVelY * BOSS2.cast.leadSec;
      const leadMag = Math.sqrt(rawLeadX * rawLeadX + rawLeadY * rawLeadY);
      const leadScale = leadMag > BOSS2.cast.maxLeadPx ? BOSS2.cast.maxLeadPx / leadMag : 1;
      const aimTargetX = playerX + rawLeadX * leadScale;
      const aimTargetY = playerY + rawLeadY * leadScale;

      const castAim = Math.atan2(aimTargetY - this.castOriginY, aimTargetX - this.castOriginX);
      this.attackAngle = castAim;

      const count = this.isPhase2
        ? BOSS2.phase2.castProjectileCount
        : BOSS2.cast.projectileCount;
      const spreadRad =
        ((this.isPhase2 ? BOSS2.phase2.castFanSpreadDeg : BOSS2.cast.fanSpreadDeg) * Math.PI) /
        180;
      const step = count > 1 ? spreadRad / (count - 1) : 0;
      const startAngle = castAim - spreadRad * 0.5;

      // Lock cast angles in dedicated controller buffers (immune to clearTelegraphOnly)
      this.lockedCastCount = count;
      this.telegraphSnap.lineCount = count;
      for (let i = 0; i < count; i++) {
        const ang = startAngle + i * step;
        this.lockedCastAngles[i] = ang;
        this.telegraphSnap.lineAngles[i] = ang;
      }
    }

    // Compute telegraph duration = max(0.5s, impactFrame / fps) BEFORE playing animation
    const animKey = ATTACK_TO_ANIM_KEY[next];
    const meta = getBoss2SheetMeta(animKey);
    const hasReal = hasBoss2Sheet(this.scene, animKey);

    if (hasReal && meta) {
      const maxIdx = Math.max(0, meta.frames - 1);
      const impactIdx = Math.max(0, Math.min(maxIdx, Math.round(BOSS2.impactFrame[next])));
      this.attackTargetImpactFrame = impactIdx;
      const effectiveFps = getBoss2EffectiveFps(animKey, meta.fps);
      const rawImpactSec = impactIdx / effectiveFps;
      const telegraphSec = Math.max(BOSS2.minTelegraphDurationSec, rawImpactSec);
      this.attackTelegraphMs = telegraphSec * 1000;
      // Scale wind-up animation smoothly if impactFrame/effectiveFps < 0.5s so impact frame lands at exact telegraph end
      boss.anims.timeScale =
        rawImpactSec > 0 && rawImpactSec < telegraphSec ? rawImpactSec / telegraphSec : 1.0;
    } else {
      this.attackTargetImpactFrame = BOSS2.impactFrame[next];
      this.attackTelegraphMs =
        next === 'slam'
          ? BOSS2.slam.fallbackTelegraphMs
          : next === 'swing'
            ? BOSS2.swing.fallbackTelegraphMs
            : BOSS2.cast.fallbackTelegraphMs;
      boss.anims.timeScale = 1.0;
    }

    // Start one-shot attack animation ONCE on entering TELEGRAPH
    this.attackUsingRealSheet = this.playStateAnim(boss, animKey, true);
  }

  private enterRecover(boss: Phaser.Physics.Arcade.Sprite): void {
    this.clearTelegraphOnly();
    boss.anims.timeScale = 1.0;
    this.activeAttack = null;
    this.state = 'recover';
    this.stateTimerMs = 0;
    this.playStateAnim(boss, 'boss2_idle', false);
  }

  private executeSwing(
    boss: Phaser.Physics.Arcade.Sprite,
    playerX: number,
    playerY: number,
    range: number,
    burningTrees: BurningTreeSystem | null,
    callbacks: CinderWardenCallbacks
  ): void {
    soundManager.playBossAttack();
    callbacks.triggerCameraShake(BOSS2.swing.shakeDurationMs, BOSS2.swing.shakeIntensity);

    // Subtle forward momentum step on swing impact (only if clear of burning trees)
    const lungeX = boss.x + Math.cos(this.attackAngle) * BOSS2.swing.lungePx;
    const lungeY = boss.y + Math.sin(this.attackAngle) * BOSS2.swing.lungePx;
    if (!burningTrees || !burningTrees.checkCircleHit(lungeX, lungeY, BOSS2.stats.steeringRadius)) {
      boss.setPosition(lungeX, lungeY);
    }

    // Launch sweeping fiery 3-claw cleave wave + outer heat crescent at locked swing origin
    const slashScale = range / (BOSS2.telegraphs.texSize * 0.5 - 6);
    this.swingSlashBaseAngle = this.attackAngle;
    this.swingSlashBaseScale = slashScale;
    this.swingSlashSweepDir = this.attackLockedFlipX ? -1 : 1;
    this.swingSlashTimerMs = BOSS2.swing.slashFxDurationMs;

    this.swingSlashSprite
      .setPosition(this.swingOriginX, this.swingOriginY)
      .setRotation(this.swingSlashBaseAngle - this.swingSlashSweepDir * 0.22)
      .setScale(slashScale * 0.8)
      .setAlpha(0.98)
      .setVisible(true);

    this.swingShockwaveSprite
      .setPosition(this.swingOriginX, this.swingOriginY)
      .setRotation(this.swingSlashBaseAngle - this.swingSlashSweepDir * 0.14)
      .setScale(slashScale * 0.85)
      .setAlpha(0.9)
      .setVisible(true);

    // Spray glowing embers across 3 points along the cleave arc
    for (let i = -1; i <= 1; i++) {
      const arcAng = this.attackAngle + i * (SWING_HALF_ANGLE_RAD * 0.62);
      const arcDist = range * 0.76;
      callbacks.spawnEmberPuff(
        this.swingOriginX + Math.cos(arcAng) * arcDist,
        this.swingOriginY + Math.sin(arcAng) * arcDist,
        4
      );
    }

    // Phase 2 escalation: cleave also unleashes a tight 3-bolt flame wave forward
    if (this.isPhase2) {
      const waveCount = BOSS2.swing.phase2WaveCount;
      const spreadRad = (BOSS2.swing.phase2WaveSpreadDeg * Math.PI) / 180;
      const step = waveCount > 1 ? spreadRad / (waveCount - 1) : 0;
      const startAng = this.attackAngle - spreadRad * 0.5;
      for (let w = 0; w < waveCount; w++) {
        this.spawnEmberProjectile(
          this.swingOriginX,
          this.swingOriginY,
          startAng + w * step,
          BOSS2.swing.phase2WaveSpeed,
          BOSS2.swing.phase2WaveDamage
        );
      }
    }

    const dx = playerX - this.swingOriginX;
    const dy = playerY - this.swingOriginY;
    const distSq = dx * dx + dy * dy;
    if (distSq > range * range) return;

    const angleToPlayer = Math.atan2(dy, dx);
    if (Math.abs(wrapAngleDiff(angleToPlayer, this.attackAngle)) > SWING_HALF_ANGLE_RAD) {
      return;
    }

    // Swing cone stops at Stage 2 burning trees
    if (burningTrees) {
      const blockingTree = burningTrees.isSegmentBlockedByTree(
        this.swingOriginX,
        this.swingOriginY,
        playerX,
        playerY
      );
      if (blockingTree) {
        burningTrees.recordCollision();
        soundManager.playTreeHit();
        callbacks.spawnEmberPuff(
          blockingTree.x,
          blockingTree.y - 12,
          TREES.projectile.emberPuffCount + 2
        );
        return;
      }
    }

    const swingDmg = this.isPhase2 ? BOSS2.swing.phase2Damage : BOSS2.swing.damage;
    if (callbacks.damagePlayer(swingDmg)) {
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.001 ? dx / dist : Math.cos(this.attackAngle);
      const ny = dist > 0.001 ? dy / dist : Math.sin(this.attackAngle);
      callbacks.applyPlayerKnockback(
        nx,
        ny,
        BOSS2.swing.knockbackPx,
        BOSS2.swing.knockbackDurationMs
      );
    }
  }

  private executeSlam(callbacks: CinderWardenCallbacks): void {
    soundManager.playBossSlam();
    callbacks.triggerCameraShake(BOSS2.slam.shakeDurationMs, BOSS2.slam.shakeIntensity);

    const slamRadius = this.fireRingMaxRadius;

    // Launch expanding fire ring (not blocked by trees; edge-only hit jumpable by dash i-frames)
    this.fireRingActive = true;
    this.fireRingX = this.slamTargetX;
    this.fireRingY = this.slamTargetY;
    this.fireRingElapsedMs = 0;
    this.fireRingHitPlayer = false;

    const hasFireRingSheet =
      this.scene.textures.exists('boss2_fx_firering') &&
      this.scene.anims.exists('boss2_fx_firering');
    const hasAshBurstSheet =
      this.scene.textures.exists('boss2_fx_ash_burst') &&
      this.scene.anims.exists('boss2_fx_ash_burst');
    this.fireRingUsingSheet = hasFireRingSheet;

    // Crisp edge-guide under-ring (subtle when animated fire ring sheet is active, full fallback otherwise)
    const startScale = BOSS2.slam.ringStartRadius / (BOSS2.telegraphs.texSize * 0.5 - 6);
    this.fireRingSprite
      .setPosition(this.slamTargetX, this.slamTargetY)
      .setScale(startScale)
      .setAlpha(hasFireRingSheet ? 0.36 : 0.95)
      .setVisible(true);

    // Combined SLAM VFX 1: animated fx_firering_sheet expanding across the slam zone
    if (hasFireRingSheet) {
      if (this.slamFireRingFxSprite.texture.key !== 'boss2_fx_firering') {
        this.slamFireRingFxSprite.setTexture('boss2_fx_firering', 0);
      }
      const ringBaseScale = (slamRadius * 2.15) / BOSS2.fxSheets.boss2_fx_firering.frameWidth;
      this.slamFireRingFxSprite
        .setPosition(this.slamTargetX, this.slamTargetY)
        .setRotation(Math.random() * Math.PI * 2)
        .setScale(ringBaseScale * 0.86)
        .setAlpha(0.98)
        .setVisible(true)
        .play('boss2_fx_firering', false);
    }

    // Combined SLAM VFX 2: animated fx_ash_burst_sheet explosive spark/ash shockwave
    if (hasAshBurstSheet) {
      if (this.slamAshBurstFxSprite.texture.key !== 'boss2_fx_ash_burst') {
        this.slamAshBurstFxSprite.setTexture('boss2_fx_ash_burst', 0);
      }
      const burstScale = (slamRadius * 2.38) / BOSS2.fxSheets.boss2_fx_ash_burst.frameWidth;
      this.slamAshBurstFxSprite
        .setPosition(this.slamTargetX, this.slamTargetY)
        .setRotation(Math.random() * Math.PI * 2)
        .setScale(burstScale)
        .setAlpha(0.95)
        .setVisible(true)
        .play('boss2_fx_ash_burst', false);
    }

    // Spawn lingering fire patches around the slam zone (5 in Phase 1, 7 in Phase 2)
    const patchCount = this.isPhase2 ? BOSS2.slam.phase2PatchCount : BOSS2.slam.patchCount;
    const baseRot = Math.random() * Math.PI * 2;
    for (let p = 0; p < patchCount; p++) {
      const ang = baseRot + (p * Math.PI * 2) / patchCount + (Math.random() - 0.5) * 0.42;
      const dist =
        BOSS2.slam.patchSpawnMinDist +
        Math.random() * (BOSS2.slam.patchSpawnMaxDist - BOSS2.slam.patchSpawnMinDist);
      const px = this.slamTargetX + Math.cos(ang) * dist;
      const py = this.slamTargetY + Math.sin(ang) * dist;
      this.spawnFirePatch(px, py);
    }

    // Phase 2 escalation: slam erupts a radial ring of 6 ember shots outward from the epicenter
    if (this.isPhase2) {
      const radialCount = BOSS2.slam.phase2RadialEmberCount;
      for (let r = 0; r < radialCount; r++) {
        const ang = this.attackAngle + (r * Math.PI * 2) / radialCount;
        this.spawnEmberProjectile(
          this.slamTargetX,
          this.slamTargetY,
          ang,
          BOSS2.slam.phase2RadialEmberSpeed,
          BOSS2.slam.phase2RadialEmberDamage
        );
      }
    }
  }

  private executeCast(): void {
    soundManager.playBossAttack();

    const count = this.lockedCastCount;
    const speed = this.isPhase2 ? BOSS2.cast.phase2ProjectileSpeed : BOSS2.cast.projectileSpeed;
    const dmg = this.isPhase2 ? BOSS2.cast.phase2ProjectileDamage : BOSS2.cast.projectileDamage;

    for (let i = 0; i < count; i++) {
      const ang = this.lockedCastAngles[i];
      this.spawnEmberProjectile(this.castOriginX, this.castOriginY, ang, speed, dmg);
    }

    // Phase 2 escalation: queue a staggered follow-up volley shifted into the safe gaps of the first wave
    if (this.isPhase2 && count > 1) {
      const secondCount = Math.min(BOSS2.cast.phase2SecondVolleyCount, count - 1);
      this.pendingSecondVolleyX = this.castOriginX;
      this.pendingSecondVolleyY = this.castOriginY;
      this.pendingSecondVolleyCount = secondCount;
      this.pendingSecondVolleyMs = BOSS2.cast.phase2SecondVolleyDelayMs;
      for (let i = 0; i < secondCount; i++) {
        this.pendingSecondVolleyAngles[i] =
          (this.lockedCastAngles[i] + this.lockedCastAngles[i + 1]) * 0.5;
      }
    }
  }

  private spawnFirePatch(x: number, y: number): void {
    let slot: FirePatchSlot | null = null;
    let oldestIdx = 0;
    let oldestLife = -1;

    for (let i = 0; i < this.firePatchPool.length; i++) {
      const cand = this.firePatchPool[i];
      if (!cand.active) {
        slot = cand;
        break;
      }
      if (cand.lifeMs > oldestLife) {
        oldestLife = cand.lifeMs;
        oldestIdx = i;
      }
    }
    if (!slot) {
      slot = this.firePatchPool[oldestIdx];
    }

    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.lifeMs = 0;
    slot.maxLifeMs = BOSS2.slam.patchDurationMs;
    const diam = BOSS2.slam.patchRadius * 2.15;
    slot.sprite
      .setPosition(x, y)
      .setDisplaySize(diam, diam)
      .setRotation(Math.random() * Math.PI * 2)
      .setAlpha(0.86)
      .setVisible(true);
  }

  private spawnEmberProjectile(
    x: number,
    y: number,
    angle: number,
    speed: number = BOSS2.cast.projectileSpeed,
    damage: number = BOSS2.cast.projectileDamage
  ): void {
    let slot: EmberProjSlot | null = null;
    let slotIdx = 0;
    let oldestIdx = 0;
    let oldestLife = -1;
    for (let i = 0; i < this.emberProjPool.length; i++) {
      const cand = this.emberProjPool[i];
      if (!cand.active) {
        slot = cand;
        slotIdx = i;
        break;
      }
      if (cand.lifeMs > oldestLife) {
        oldestLife = cand.lifeMs;
        oldestIdx = i;
      }
    }
    if (!slot) {
      slot = this.emberProjPool[oldestIdx];
      slotIdx = oldestIdx;
    }

    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.vx = Math.cos(angle) * speed;
    slot.vy = Math.sin(angle) * speed;
    slot.lifeMs = 0;
    slot.damage = damage;

    const hasEmberSheet =
      this.scene.textures.exists('boss2_fx_ember_shot') &&
      this.scene.anims.exists('boss2_fx_ember_shot');
    slot.usingAnimSheet = hasEmberSheet;

    if (hasEmberSheet) {
      if (slot.sprite.texture.key !== 'boss2_fx_ember_shot') {
        slot.sprite.setTexture('boss2_fx_ember_shot', 0);
      }
      // fx_ember_shot_sheet faces LEFT (round core at x≈0.38, flame tail streaming RIGHT),
      // so origin (0.38, 0.5) + rotation (angle + PI) places the fiery head on the exact hitbox center
      // with the flame tail trailing smoothly behind the flight vector.
      const displaySize = BOSS2.cast.projectileHitboxRadius * 4.4;
      slot.sprite
        .setOrigin(0.38, 0.5)
        .setDisplaySize(displaySize, displaySize)
        .setPosition(x, y)
        .setRotation(angle + Math.PI)
        .setAlpha(1)
        .setVisible(true)
        .play({
          key: 'boss2_fx_ember_shot',
          startFrame: slotIdx % BOSS2.fxSheets.boss2_fx_ember_shot.frames,
        });
    } else {
      if (slot.sprite.texture.key !== BOSS2.textures.emberProjKey) {
        slot.sprite.setTexture(BOSS2.textures.emberProjKey);
      }
      slot.sprite.anims.stop();
      slot.sprite
        .setOrigin(0.5, 0.5)
        .setDisplaySize(
          BOSS2.cast.projectileHitboxRadius * 2.6,
          BOSS2.cast.projectileHitboxRadius * 2.6
        )
        .setPosition(x, y)
        .setRotation(angle)
        .setAlpha(1)
        .setVisible(true);
    }
  }

  private updateSwingSlashFx(deltaMs: number): void {
    if (this.swingSlashTimerMs <= 0) return;
    this.swingSlashTimerMs -= deltaMs;
    if (this.swingSlashTimerMs <= 0) {
      this.swingSlashTimerMs = 0;
      this.swingSlashSprite.setVisible(false);
      this.swingShockwaveSprite.setVisible(false);
    } else {
      const prog = 1 - this.swingSlashTimerMs / BOSS2.swing.slashFxDurationMs;
      const eased = 1 - Math.pow(1 - prog, 3);
      const fade = prog < 0.25 ? 1 : Math.max(0, 1 - (prog - 0.25) / 0.75);

      // Whip cleave arc swiftly across the swing cone while expanding slightly past range
      this.swingSlashSprite
        .setRotation(this.swingSlashBaseAngle + this.swingSlashSweepDir * (-0.22 + 0.34 * eased))
        .setScale(this.swingSlashBaseScale * (0.8 + 0.28 * eased))
        .setAlpha(0.98 * fade);

      // Outer heat crescent surges further outward & dissipates cleanly
      this.swingShockwaveSprite
        .setRotation(this.swingSlashBaseAngle + this.swingSlashSweepDir * (-0.14 + 0.28 * eased))
        .setScale(this.swingSlashBaseScale * (0.85 + 0.36 * prog))
        .setAlpha(0.86 * (1 - prog));
    }
  }

  private updateFireRing(
    deltaMs: number,
    playerX: number,
    playerY: number,
    callbacks: CinderWardenCallbacks
  ): void {
    if (!this.fireRingActive) return;
    this.fireRingElapsedMs += deltaMs;
    const prog = Math.min(1, this.fireRingElapsedMs / BOSS2.slam.ringDurationMs);
    const curRadius =
      BOSS2.slam.ringStartRadius + (this.fireRingMaxRadius - BOSS2.slam.ringStartRadius) * prog;
    const scale = curRadius / (BOSS2.telegraphs.texSize * 0.5 - 6);
    const fadeAlpha = prog > 0.72 ? (1 - prog) / 0.28 : 1;

    this.fireRingSprite
      .setPosition(this.fireRingX, this.fireRingY)
      .setScale(scale)
      .setAlpha((this.fireRingUsingSheet ? 0.36 : 0.95) * fadeAlpha)
      .setVisible(true);

    // Sync animated fx_firering_sheet scale smoothly with the expanding slam ring
    if (this.fireRingUsingSheet && this.slamFireRingFxSprite.visible) {
      const ringBaseScale =
        (this.fireRingMaxRadius * 2.15) / BOSS2.fxSheets.boss2_fx_firering.frameWidth;
      this.slamFireRingFxSprite.setScale(ringBaseScale * (0.86 + 0.24 * prog));
    }

    // Damage on the ring edge only (not blocked by trees, cleanly jumpable with dash i-frames)
    if (!this.fireRingHitPlayer && !callbacks.isPlayerInvulnerable()) {
      const dx = playerX - this.fireRingX;
      const dy = playerY - this.fireRingY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - curRadius) <= BOSS2.slam.ringEdgeHalfWidth) {
        const ringDmg = this.isPhase2 ? BOSS2.slam.phase2RingDamage : BOSS2.slam.ringDamage;
        if (callbacks.damagePlayer(ringDmg)) {
          this.fireRingHitPlayer = true;
        }
      }
    }

    if (this.fireRingElapsedMs >= BOSS2.slam.ringDurationMs) {
      this.fireRingActive = false;
      this.fireRingSprite.setVisible(false);
    }
  }

  private updateFirePatches(
    deltaMs: number,
    timeSec: number,
    playerX: number,
    playerY: number,
    callbacks: CinderWardenCallbacks
  ): void {
    const patchRSq = BOSS2.slam.patchRadius * BOSS2.slam.patchRadius;
    let playerInAnyPatch = false;

    for (let i = 0; i < this.firePatchPool.length; i++) {
      const p = this.firePatchPool[i];
      if (!p.active) continue;
      p.lifeMs += deltaMs;
      if (p.lifeMs >= p.maxLifeMs) {
        p.active = false;
        p.sprite.setVisible(false);
        continue;
      }

      const remainRatio = 1 - p.lifeMs / p.maxLifeMs;
      const fade = remainRatio < 0.22 ? remainRatio / 0.22 : 1;
      const flicker = 0.86 + 0.14 * Math.sin(timeSec * 11 + p.phase);
      p.sprite.setAlpha(0.84 * fade * flicker);

      const dx = playerX - p.x;
      const dy = playerY - p.y;
      if (dx * dx + dy * dy <= patchRSq) {
        playerInAnyPatch = true;
      }
    }

    if (playerInAnyPatch) {
      this.firePatchTickAccumMs += deltaMs;
      if (this.firePatchTickAccumMs >= BOSS2.slam.patchTickMs) {
        this.firePatchTickAccumMs -= BOSS2.slam.patchTickMs;
        callbacks.damagePlayer(BOSS2.slam.patchDamage);
      }
    } else {
      this.firePatchTickAccumMs = 0;
    }
  }

  private updateEmberProjectiles(
    deltaMs: number,
    playerX: number,
    playerY: number,
    burningTrees: BurningTreeSystem | null,
    callbacks: CinderWardenCallbacks
  ): void {
    const dtSec = deltaMs * 0.001;
    const hitR = BOSS2.cast.projectileHitboxRadius + BOSS2.cast.playerHitRadius;
    const hitRSq = hitR * hitR;

    for (let i = 0; i < this.emberProjPool.length; i++) {
      const p = this.emberProjPool[i];
      if (!p.active) continue;
      p.lifeMs += deltaMs;
      if (p.lifeMs >= BOSS2.cast.projectileMaxLifeMs) {
        p.active = false;
        p.sprite.anims.stop();
        p.sprite.setVisible(false);
        continue;
      }

      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.sprite.setPosition(p.x, p.y);
      if (!p.usingAnimSheet) {
        p.sprite.rotation += dtSec * 6.0;
      }

      // Trees absorb ember projectiles (ember puff + sfx_tree_hit)
      if (
        burningTrees &&
        burningTrees.checkCircleHit(p.x, p.y, BOSS2.cast.projectileHitboxRadius)
      ) {
        burningTrees.recordCollision();
        soundManager.playTreeHit();
        callbacks.spawnEmberPuff(p.x, p.y, TREES.projectile.emberPuffCount);
        p.active = false;
        p.sprite.anims.stop();
        p.sprite.setVisible(false);
        continue;
      }

      // Check player hit (radius 14px + player body)
      const dx = p.x - playerX;
      const dy = p.y - playerY;
      if (dx * dx + dy * dy <= hitRSq) {
        if (!callbacks.isPlayerInvulnerable()) {
          callbacks.damagePlayer(p.damage);
          callbacks.spawnEmberPuff(p.x, p.y, 5);
          p.active = false;
          p.sprite.anims.stop();
          p.sprite.setVisible(false);
        }
      }
    }
  }

  private updateDeathSequence(
    realDeltaMs: number,
    boss: Phaser.Physics.Arcade.Sprite,
    callbacks: CinderWardenCallbacks
  ): void {
    if (this.deathCompleted) return;
    this.deathElapsedMs += realDeltaMs;

    if (!this.deathSlowMoDone && this.deathElapsedMs >= BOSS2.death.slowMoDurationMs) {
      this.deathSlowMoDone = true;
    }

    if (this.deathUsingRealSheet) {
      // Wait for boss2_death to finish playing once, then hold its last frame while fading over 1.5s
      if (!this.deathAnimFinished) {
        if (!boss.anims.isPlaying) {
          this.deathAnimFinished = true;
          const meta = getBoss2SheetMeta('boss2_death');
          const lastIdx = meta ? Math.max(0, meta.frames - 1) : 0;
          boss.setFrame(lastIdx);
        }
        return;
      }

      this.deathFadeElapsedMs += realDeltaMs;
      const fadeProgress = Math.min(1, this.deathFadeElapsedMs / BOSS2.death.fadeOutDurationMs);
      boss.setAlpha(Math.max(0, 1 - fadeProgress));

      if (fadeProgress >= 1) {
        this.deathCompleted = true;
        this.deathSlowMoDone = true;
        this.detachBossListeners();
        this.boss = null;
        callbacks.onDeathComplete(boss);
      }
      return;
    }

    // Code fallback if boss2_death sheet is missing: sprite fades into ash particles over 1.5s
    this.deathFadeElapsedMs += realDeltaMs;
    const fadeProgress = Math.min(1, this.deathFadeElapsedMs / BOSS2.death.fadeOutDurationMs);
    boss.setTint(BOSS2.death.ashTint);
    boss.setAlpha(Math.max(0, 1 - fadeProgress));
    boss.y = this.deathStartY - fadeProgress * 18;

    if (fadeProgress >= 1) {
      this.deathCompleted = true;
      this.deathSlowMoDone = true;
      this.detachBossListeners();
      this.boss = null;
      callbacks.onDeathComplete(boss);
    }
  }

  private clearTelegraphOnly(): void {
    this.telegraphSnap.kind = 'none';
    this.telegraphSnap.lineCount = 0;
  }

  public clearAllHazardsAndTelegraphs(): void {
    this.clearTelegraphOnly();
    this.lockedCastCount = 0;
    this.pendingSecondVolleyMs = 0;
    this.pendingSecondVolleyCount = 0;
    this.phase2GlowSprite.setVisible(false);
    this.swingSlashTimerMs = 0;
    this.swingSlashSprite.setVisible(false);
    this.swingShockwaveSprite.setVisible(false);
    this.fireRingActive = false;
    this.fireRingSprite.setVisible(false);
    this.slamFireRingFxSprite.anims.stop();
    this.slamFireRingFxSprite.setVisible(false);
    this.slamAshBurstFxSprite.anims.stop();
    this.slamAshBurstFxSprite.setVisible(false);
    this.firePatchTickAccumMs = 0;
    for (let i = 0; i < this.firePatchPool.length; i++) {
      this.firePatchPool[i].active = false;
      this.firePatchPool[i].sprite.setVisible(false);
    }
    for (let i = 0; i < this.emberProjPool.length; i++) {
      this.emberProjPool[i].active = false;
      this.emberProjPool[i].sprite.anims.stop();
      this.emberProjPool[i].sprite.setVisible(false);
    }
  }

  public destroy(): void {
    this.clearAllHazardsAndTelegraphs();
    this.detachBossListeners();
    this.boss = null;
    this.phase2GlowSprite.destroy();
    this.swingSlashSprite.destroy();
    this.swingShockwaveSprite.destroy();
    this.fireRingSprite.destroy();
    this.slamFireRingFxSprite.destroy();
    this.slamAshBurstFxSprite.destroy();
    for (let i = 0; i < this.firePatchPool.length; i++) {
      this.firePatchPool[i].sprite.destroy();
    }
    this.firePatchPool = [];
    for (let i = 0; i < this.emberProjPool.length; i++) {
      this.emberProjPool[i].sprite.destroy();
    }
    this.emberProjPool = [];
  }
}
