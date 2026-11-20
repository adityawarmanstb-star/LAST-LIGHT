import Phaser from 'phaser';
import { gameManager } from './GameManager';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, getHardwareTier } from './PerformanceEngine';

export type Stage2VfxQuality = 'low' | 'medium' | 'high';

export function resolveStage2VfxQuality(): Stage2VfxQuality {
  const tier = gameManager.getQualityTier();
  const mode = gameManager.getGraphicsConfig().resolutionMode;
  if (tier === 'low' || mode === 'performance') {
    return 'low';
  }
  if (mode === 'fhd' || (mode === 'auto' && getHardwareTier() === 'mid_end')) {
    return 'medium';
  }
  return 'high';
}

// =========================================================================
// STAGE 2 BURNING TREES, FLAMES & ASH CONSTANTS (Single Source of Truth)
// =========================================================================
export const TREES = {
  textures: {
    treeKey: 'burning_tree_placeholder',
    burntTreeKeys: ['tree_burnt_01', 'tree_burnt_02', 'tree_burnt_03'] as const,
    scorchDecalKeys: [
      'scorch_decal_01',
      'scorch_decal_02',
      'scorch_decal_03',
      'scorch_decal_04',
      'scorch_decal_05',
      'scorch_decal_06',
      'scorch_decal_07',
      'scorch_decal_08',
      'scorch_decal_09',
    ] as const,
    fireSheetKey: 'fire_tree_loop_sheet',
    ashOverlaySheetKey: 'ash_overlay_sheet',
    ashFlakeKey: 'stage2_ash_flake',
    emberFlakeKey: 'stage2_ember_flake',
    glowKey: 'burning_tree_glow_baked',
    enemyBurnGlowKey: 'burning_tree_enemy_burn_glow',
    colliderKey: 'burning_tree_collider_44',
    debugHitboxKey: 'burning_tree_debug_hitbox',
    debugHeatKey: 'burning_tree_debug_heat',
  },
  // Tunable trunk & branch flame overlay offsets relative to tree base (origin 0.5, 0.92)
  flameOffsets: [
    { dx: -4, dy: -56, scaleMult: 0.92 },
    { dx: 12, dy: -118, scaleMult: 1.0 },
    { dx: -14, dy: -178, scaleMult: 0.88 },
  ] as readonly { dx: number; dy: number; scaleMult: number }[],
  flames: {
    frameWidth: 256,
    frameHeight: 256,
    frames: 12,
    cols: 12,
    fps: 20,
    alpha: 0.75,
    minScale: 0.7,
    maxScale: 1.1,
    baseDisplaySize: 78,
    minPerTree: 2,
    maxPerTree: 3,
    originX: 0.5,
    originY: 0.85,
    lowQualityMaxTrees: 8,
  },
  ash: {
    highFlakeCount: 50,
    mediumFlakeCount: 30,
    lowFlakeCount: 0,
    emberCount: 10, // ~10 orange embers (ADD) + ~40 gray ash flakes (NORMAL) at 50 total
    ashAlpha: 0.35,
    emberAlphaMin: 0.72,
    emberAlphaMax: 0.95,
    overlayAlpha: 0.30,
    overlayFrameWidth: 256,
    overlayFrameHeight: 256,
    overlayFrames: 12,
    overlayFps: 20,
    depth: 6.5,
  },
  visuals: {
    originX: 0.5,
    originY: 0.92,
    displayHeight: 260, // Logical px display height for burnt tree sprites
    cullMarginX: 140,
    cullMarginTop: 96,
    cullMarginBottom: 290, // Extra bottom margin so tall 260px canopies never pop out
  },
  decals: {
    seedSalt: 0x3c91d4a7,
    minPerChunk: 3,
    maxPerChunk: 6,
    minScale: 0.6,
    maxScale: 1.2,
    minAlpha: 0.7,
    maxAlpha: 0.9,
    depth: 1, // Drawn right above floor (0) and below everything else (gore 2, glow 4, entities 19+)
    maxPooledDecals: 96,
    cullMargin: 156,
  },
  placement: {
    chunkSize: 540,
    minSpacing: 150,
    minPerChunk: 2,
    maxPerChunk: 5,
    playerStartClearRadius: 220,
    borderPadding: 76, // 76 + 76 = 152 >= 150 px guarantees deterministic cross-chunk spacing
    corridorWidth: 116, // Guaranteed open lane per chunk so routes are never fully blocked
    poissonAttempts: 24,
    worldSeed: 0x51a7e2b9,
  },
  collision: {
    hitboxRadius: 22,
    playerRadius: 18,
    steerLookahead: 28,
    enemyRadii: {
      imp: 15,
      spitter: 16,
      brute: 26,
    },
  },
  projectile: {
    playerBoltRadius: 8,
    enemyOrbRadius: 11,
    emberPuffCount: 4,
    emberPuffColor: 0xff7b29,
  },
  heat: {
    radius: 60,
    damage: 3,
    tickMs: 500,
    enemyGlowSize: 78,
    enemyGlowAlpha: 0.62,
  },
  lighting: {
    maxRealTreeLights: 4,
    maxTotalRealLights: 7, // Keeps total real lights in darkness layer strictly under 8
    realLightRadius: 140,
    flickerAmplitude: 0.085,
    flickerSpeedA: 8.6,
    flickerSpeedB: 15.3,
    nearGlowAlpha: 0.3,
    farGlowRadius: 126,
    farGlowAlpha: 0.34,
    groundGlowSize: 210,
    groundGlowAlpha: 0.42,
  },
  performance: {
    maxPooledTrees: 48,
    maxPhysicsBodies: 36,
    maxEnemyBurnGlows: 48,
    cullMargin: 96,
    physicsMargin: 200,
    chunkLoadMargin: 260,
    spatialCellSize: 135, // 540 / 4
    spatialGridDim: 16, // 16x16 = 256 buckets
    spatialBucketCap: 6,
    depthMin: 19.0,
    depthSpan: 2.6,
    maxCachedChunks: 96,
  },
} as const;

export interface TreeNode {
  x: number;
  y: number;
  phase: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  variantIndex: number;
  flameCount: number;
  flameScales: [number, number, number];
  flameStartFrames: [number, number, number];
  flamePhaseOffsets: [number, number, number];
}

interface ScorchDecalNode {
  x: number;
  y: number;
  variantIndex: number;
  rotation: number;
  scale: number;
  alpha: number;
}

export interface BurningTreeLightSlot {
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

export interface BurningTreeGlowSlot {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface BurningTreeDebugSnapshot {
  enabled: boolean;
  activeTrees: number;
  visibleTrees: number;
  physicsBodies: number;
  realTreeLights: number;
  collisions: number;
  hitboxRadius: number;
  heatRadius: number;
  playerBurning: boolean;
}

interface TreeVisualSlot {
  inUse: boolean;
  textureKey: string;
  tree: Phaser.GameObjects.Image;
  flames: Phaser.GameObjects.Sprite[];
  flameLastFrames: number[];
  groundGlow: Phaser.GameObjects.Image;
  debugHitbox: Phaser.GameObjects.Image;
  debugHeat: Phaser.GameObjects.Image;
}

interface ScorchDecalSlot {
  inUse: boolean;
  textureKey: string;
  sprite: Phaser.GameObjects.Image;
}

interface StaticBodySlot {
  sprite: Phaser.Physics.Arcade.Image;
  enabled: boolean;
  wx: number;
  wy: number;
}

function hashChunkSeed(cx: number, cy: number, worldSeed: number): number {
  let h = (worldSeed ^ Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}

function chunkNumericKey(cx: number, cy: number): number {
  return (cx + 32768) * 65536 + (cy + 32768);
}

/**
 * Generates all placeholder Burning Tree textures once at boot (idempotent).
 * Dark brown charred trunk + fiery orange crown glow + baked additive glow + pre-baked debug rings.
 */
export function ensureBurningTreeTextures(scene: Phaser.Scene): void {
  const texMgr = scene.textures;

  if (!texMgr.exists(TREES.textures.treeKey)) {
    const w = 96;
    const h = 128;
    const tex = texMgr.createCanvas(TREES.textures.treeKey, w, h);
    if (tex) {
      const ctx = tex.getContext();
      const baseX = 48;
      const baseY = 108;

      // Ground soot scorch ring beneath trunk base
      const ashGrad = ctx.createRadialGradient(baseX, baseY + 2, 4, baseX, baseY + 2, 34);
      ashGrad.addColorStop(0, 'rgba(6, 4, 3, 0.88)');
      ashGrad.addColorStop(0.55, 'rgba(20, 10, 6, 0.48)');
      ashGrad.addColorStop(1, 'rgba(20, 10, 6, 0)');
      ctx.fillStyle = ashGrad;
      ctx.beginPath();
      ctx.ellipse(baseX, baseY + 2, 34, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fiery orange canopy backlight aura
      const auraGrad = ctx.createRadialGradient(baseX, 46, 4, baseX, 46, 44);
      auraGrad.addColorStop(0, 'rgba(255, 224, 128, 0.92)');
      auraGrad.addColorStop(0.32, 'rgba(255, 124, 30, 0.78)');
      auraGrad.addColorStop(0.68, 'rgba(204, 46, 12, 0.34)');
      auraGrad.addColorStop(1, 'rgba(140, 20, 4, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(baseX, 46, 44, 0, Math.PI * 2);
      ctx.fill();

      // Dark brown gnarled trunk & flared roots (hitbox base centered at y=108)
      const trunkGrad = ctx.createLinearGradient(baseX - 18, 42, baseX + 18, baseY);
      trunkGrad.addColorStop(0, '#4a2b18');
      trunkGrad.addColorStop(0.45, '#2e190e');
      trunkGrad.addColorStop(1, '#190d07');
      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      ctx.moveTo(baseX - 24, baseY + 6);
      ctx.quadraticCurveTo(baseX - 15, baseY - 10, baseX - 12, 62);
      ctx.lineTo(baseX - 24, 36);
      ctx.lineTo(baseX - 16, 32);
      ctx.lineTo(baseX - 6, 52);
      ctx.lineTo(baseX - 3, 22);
      ctx.lineTo(baseX + 5, 22);
      ctx.lineTo(baseX + 8, 50);
      ctx.lineTo(baseX + 20, 34);
      ctx.lineTo(baseX + 26, 40);
      ctx.lineTo(baseX + 13, 66);
      ctx.quadraticCurveTo(baseX + 16, baseY - 8, baseX + 24, baseY + 6);
      ctx.quadraticCurveTo(baseX, baseY + 13, baseX - 24, baseY + 6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#5c361e';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Glowing ember bark cracks on trunk
      ctx.strokeStyle = '#ff7b24';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(baseX - 4, 58);
      ctx.lineTo(baseX - 1, 78);
      ctx.lineTo(baseX - 5, 96);
      ctx.moveTo(baseX + 5, 64);
      ctx.lineTo(baseX + 3, 86);
      ctx.stroke();

      // Burning crown flames (stylized layered flame tongues)
      const drawFlame = (cx: number, cy: number, rx: number, ry: number, core: string, edge: string) => {
        const g = ctx.createRadialGradient(cx, cy + ry * 0.2, 2, cx, cy, ry);
        g.addColorStop(0, core);
        g.addColorStop(0.55, edge);
        g.addColorStop(1, 'rgba(180, 32, 8, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      drawFlame(baseX - 16, 36, 15, 19, 'rgba(255, 224, 130, 0.92)', 'rgba(255, 102, 20, 0.72)');
      drawFlame(baseX + 16, 38, 14, 18, 'rgba(255, 215, 118, 0.88)', 'rgba(255, 92, 16, 0.68)');
      drawFlame(baseX, 28, 19, 24, 'rgba(255, 244, 186, 0.96)', 'rgba(255, 128, 28, 0.82)');

      // Hot ember embers dot cluster
      ctx.fillStyle = '#fff0b3';
      ctx.beginPath();
      ctx.arc(baseX - 10, 14, 2.2, 0, Math.PI * 2);
      ctx.arc(baseX + 13, 18, 1.8, 0, Math.PI * 2);
      ctx.arc(baseX + 2, 10, 2.4, 0, Math.PI * 2);
      ctx.fill();

      tex.refresh();
    }
  }

  if (!texMgr.exists(TREES.textures.glowKey)) {
    const size = 192;
    const tex = texMgr.createCanvas(TREES.textures.glowKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const half = size * 0.5;
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0.0, 'rgba(255, 178, 84, 0.94)');
      grad.addColorStop(0.32, 'rgba(255, 118, 32, 0.54)');
      grad.addColorStop(0.68, 'rgba(208, 48, 14, 0.18)');
      grad.addColorStop(1.0, 'rgba(160, 24, 6, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }

  if (!texMgr.exists(TREES.textures.enemyBurnGlowKey)) {
    const size = 64;
    const tex = texMgr.createCanvas(TREES.textures.enemyBurnGlowKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const half = size * 0.5;
      const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
      grad.addColorStop(0.0, 'rgba(255, 200, 96, 0.95)');
      grad.addColorStop(0.45, 'rgba(255, 102, 24, 0.55)');
      grad.addColorStop(1.0, 'rgba(210, 38, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }

  if (!texMgr.exists(TREES.textures.colliderKey)) {
    const d = TREES.collision.hitboxRadius * 2;
    const tex = texMgr.createCanvas(TREES.textures.colliderKey, d, d);
    if (tex) {
      tex.refresh();
    }
  }

  // Pre-baked debug hitbox & heat radius textures (zero per-frame Graphics redraw!)
  if (!texMgr.exists(TREES.textures.debugHitboxKey)) {
    const r = TREES.collision.hitboxRadius;
    const size = r * 2 + 4;
    const tex = texMgr.createCanvas(TREES.textures.debugHitboxKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const c = size * 0.5;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 59, 71, 0.22)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff4d57';
      ctx.stroke();
      tex.refresh();
    }
  }

  if (!texMgr.exists(TREES.textures.debugHeatKey)) {
    const r = TREES.heat.radius;
    const size = r * 2 + 4;
    const tex = texMgr.createCanvas(TREES.textures.debugHeatKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const c = size * 0.5;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 148, 46, 0.08)';
      ctx.fill();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(255, 152, 54, 0.85)';
      ctx.stroke();
      tex.refresh();
    }
  }

  ensureStage2AshTextures(scene);
}

/**
 * Generates tiny ash flake and glowing orange ember textures once at boot (idempotent, cheap).
 */
export function ensureStage2AshTextures(scene: Phaser.Scene): void {
  const texMgr = scene.textures;

  if (!texMgr.exists(TREES.textures.ashFlakeKey)) {
    const size = 8;
    const tex = texMgr.createCanvas(TREES.textures.ashFlakeKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = 'rgba(188, 192, 200, 0.92)';
      ctx.beginPath();
      ctx.ellipse(4, 4, 3.2, 2.0, 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(142, 148, 158, 0.65)';
      ctx.beginPath();
      ctx.arc(3.4, 3.8, 1.4, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    }
  }

  if (!texMgr.exists(TREES.textures.emberFlakeKey)) {
    const size = 12;
    const tex = texMgr.createCanvas(TREES.textures.emberFlakeKey, size, size);
    if (tex) {
      const ctx = tex.getContext();
      const half = size * 0.5;
      const grad = ctx.createRadialGradient(half, half, 0.5, half, half, half);
      grad.addColorStop(0.0, 'rgba(255, 236, 168, 1.0)');
      grad.addColorStop(0.4, 'rgba(255, 134, 38, 0.88)');
      grad.addColorStop(0.8, 'rgba(218, 56, 12, 0.32)');
      grad.addColorStop(1.0, 'rgba(180, 28, 6, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }
}

interface AshParticleSlot {
  sprite: Phaser.GameObjects.Image;
  isEmber: boolean;
  x: number;
  y: number;
  vy: number;
  vxDrift: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  rotSpeed: number;
  baseAlpha: number;
}

/**
 * Screen-space Stage 2 atmospheric ash & embers particle layer + cover-fit looping ash_overlay_sheet.
 * Zero per-frame allocations; strictly Stage 2 only; obeys Low (off) / Medium (30) / High (50).
 */
export class Stage2AshLayer {
  private particles: AshParticleSlot[] = [];
  private overlaySprite: Phaser.GameObjects.Sprite | null = null;
  private overlayLastFrame: number = -1;
  private lastAppliedCount: number = -1;
  private lastOverlayEnabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    ensureStage2AshTextures(scene);

    const total = TREES.ash.highFlakeCount;
    const emberCount = Math.min(total, TREES.ash.emberCount);
    let seed = 0x7f4a7c15;
    const nextRand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Interleave embers evenly so Medium (first 30 flakes) keeps the same gray-ash + orange-ember ratio
    const emberInterval = emberCount > 0 ? Math.max(2, Math.floor(total / emberCount)) : total + 1;
    let embersCreated = 0;

    for (let i = 0; i < total; i++) {
      const isEmber = embersCreated < emberCount && i % emberInterval === 1;
      if (isEmber) embersCreated++;

      const x = nextRand() * LOGICAL_WIDTH;
      const y = nextRand() * LOGICAL_HEIGHT;
      const scale = isEmber ? 0.48 + nextRand() * 0.58 : 0.5 + nextRand() * 0.72;
      const baseAlpha = isEmber
        ? TREES.ash.emberAlphaMin +
          nextRand() * (TREES.ash.emberAlphaMax - TREES.ash.emberAlphaMin)
        : TREES.ash.ashAlpha;

      const spr = scene.add
        .image(x, y, isEmber ? TREES.textures.emberFlakeKey : TREES.textures.ashFlakeKey)
        .setOrigin(0.5, 0.5)
        .setDepth(TREES.ash.depth)
        .setScale(scale)
        .setAlpha(baseAlpha)
        .setRotation(nextRand() * Math.PI * 2)
        .setVisible(false);

      if (isEmber) {
        spr.setBlendMode(Phaser.BlendModes.ADD);
      }
      spr.disableInteractive();

      this.particles.push({
        sprite: spr,
        isEmber,
        x,
        y,
        vy: isEmber ? 20 + nextRand() * 26 : 22 + nextRand() * 32,
        vxDrift: -6 + nextRand() * 14,
        swayAmp: isEmber ? 12 + nextRand() * 16 : 10 + nextRand() * 18,
        swayFreq: 0.7 + nextRand() * 1.15,
        phase: nextRand() * Math.PI * 2,
        rotSpeed: isEmber ? 0 : (-1.1 + nextRand() * 2.2),
        baseAlpha,
      });
    }

    // Cover-fit full-screen ash_overlay_sheet (alpha 0.30, ADD blend, looped) when attached
    if (scene.textures.exists(TREES.textures.ashOverlaySheetKey)) {
      const tex = scene.textures.get(TREES.textures.ashOverlaySheetKey);
      if (tex && tex.setFilter) {
        tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      const coverScale = Math.max(
        LOGICAL_WIDTH / TREES.ash.overlayFrameWidth,
        LOGICAL_HEIGHT / TREES.ash.overlayFrameHeight
      );
      this.overlaySprite = scene.add
        .sprite(
          LOGICAL_WIDTH * 0.5,
          LOGICAL_HEIGHT * 0.5,
          TREES.textures.ashOverlaySheetKey,
          0
        )
        .setOrigin(0.5, 0.5)
        .setScale(coverScale)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(TREES.ash.overlayAlpha)
        .setDepth(TREES.ash.depth - 0.1)
        .setVisible(false);
      this.overlaySprite.disableInteractive();
    }
  }

  public update(
    deltaMs: number,
    timeSec: number,
    isPaused: boolean,
    quality: Stage2VfxQuality
  ): void {
    const activeCount =
      quality === 'low'
        ? TREES.ash.lowFlakeCount
        : quality === 'medium'
          ? TREES.ash.mediumFlakeCount
          : TREES.ash.highFlakeCount;
    const overlayEnabled = quality !== 'low';

    if (activeCount !== this.lastAppliedCount) {
      this.lastAppliedCount = activeCount;
      for (let i = 0; i < this.particles.length; i++) {
        const shouldShow = i < activeCount;
        if (this.particles[i].sprite.visible !== shouldShow) {
          this.particles[i].sprite.setVisible(shouldShow);
        }
      }
    }

    if (this.overlaySprite) {
      if (overlayEnabled !== this.lastOverlayEnabled) {
        this.lastOverlayEnabled = overlayEnabled;
        this.overlaySprite.setVisible(overlayEnabled);
      }
      if (overlayEnabled && !isPaused) {
        const frameIdx =
          Math.floor(timeSec * TREES.ash.overlayFps) % TREES.ash.overlayFrames;
        if (frameIdx !== this.overlayLastFrame) {
          this.overlayLastFrame = frameIdx;
          this.overlaySprite.setFrame(frameIdx);
        }
      }
    }

    if (activeCount === 0 || isPaused) return;

    const dtSec = Math.min(0.05, deltaMs * 0.001);
    const pad = 16;
    const wrapW = LOGICAL_WIDTH + pad * 2;
    const wrapH = LOGICAL_HEIGHT + pad * 2;

    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];
      const swayVel = Math.cos(timeSec * p.swayFreq + p.phase) * p.swayAmp;
      p.x += (p.vxDrift + swayVel) * dtSec;
      p.y += p.vy * dtSec;

      if (p.y > LOGICAL_HEIGHT + pad) {
        p.y -= wrapH;
      }
      if (p.x < -pad) {
        p.x += wrapW;
      } else if (p.x > LOGICAL_WIDTH + pad) {
        p.x -= wrapW;
      }

      p.sprite.x = p.x;
      p.sprite.y = p.y;
      if (p.isEmber) {
        p.sprite.alpha = p.baseAlpha * (0.76 + 0.24 * Math.sin(timeSec * 6.5 + p.phase));
      } else {
        p.sprite.rotation += p.rotSpeed * dtSec;
      }
    }
  }

  public destroy(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].sprite.destroy();
    }
    this.particles = [];
    this.overlaySprite?.destroy();
    this.overlaySprite = null;
  }
}

export class BurningTreeSystem {
  private scene: Phaser.Scene;
  private startX: number;
  private startY: number;

  // Deterministic chunk cache (numeric key -> TreeNode[] / ScorchDecalNode[])
  private chunkCache: Map<number, TreeNode[]> = new Map();
  private decalChunkCache: Map<number, ScorchDecalNode[]> = new Map();

  // Pre-allocated active lists for loaded chunks (zero per-frame allocations)
  private activeTrees: TreeNode[] = [];
  private activeTreeCount: number = 0;
  private activeDecals: ScorchDecalNode[] = [];
  private activeDecalCount: number = 0;

  // Resolved burnt tree textures & cached scale factors (to display ~260 logical px height)
  private treeVariantKeys: string[] = [];
  private treeVariantBaseScales: number[] = [];
  private scorchDecalKeys: string[] = [];
  private decalResolutionScale: number = 1.0;

  // Pre-allocated visual sprite pools
  private visualPool: TreeVisualSlot[] = [];
  private decalPool: ScorchDecalSlot[] = [];

  // Pre-allocated static physics body pool (enabled only for trees within screen + 200 px)
  private staticBodyGroup: Phaser.Physics.Arcade.StaticGroup;
  private staticBodyPool: StaticBodySlot[] = [];
  private activePhysicsBodyCount: number = 0;

  // Pre-allocated pooled orange glow sprites for enemies inside heat zones
  private enemyBurnGlowPool: Phaser.GameObjects.Image[] = [];
  private usedEnemyBurnGlows: number = 0;
  private prevUsedEnemyBurnGlows: number = 0;

  // Zero-allocation spatial grid rebuilt only when active chunks change
  private readonly gridDim = TREES.performance.spatialGridDim;
  private readonly bucketCap = TREES.performance.spatialBucketCap;
  private spatialBuckets: Int16Array;
  private spatialCounts: Uint8Array;
  private gridOriginX: number = 0;
  private gridOriginY: number = 0;

  // Chunk window tracking
  private lastMinCx: number = Number.NaN;
  private lastMaxCx: number = Number.NaN;
  private lastMinCy: number = Number.NaN;
  private lastMaxCy: number = Number.NaN;

  // Zero-allocation top-4 nearest real lights + top-8 nearest Low-quality flame trees + far glows
  private nearestLights: BurningTreeLightSlot[] = [];
  private nearestLightCount: number = 0;
  private nearestTreeIndices: Int16Array = new Int16Array(TREES.lighting.maxRealTreeLights);
  private nearestDistSq: Float64Array = new Float64Array(TREES.lighting.maxRealTreeLights);

  private nearestFlameTreeIndices: Int16Array = new Int16Array(TREES.flames.lowQualityMaxTrees);
  private nearestFlameDistSq: Float64Array = new Float64Array(TREES.flames.lowQualityMaxTrees);
  private hasFlameSheet: boolean = false;
  private flameBaseScale: number = 1.0;

  private farGlows: BurningTreeGlowSlot[] = [];
  private farGlowCount: number = 0;
  private nearestTreeDistancePx: number = Number.POSITIVE_INFINITY;

  // Debug state & telemetry counters
  private debugEnabled: boolean = false;
  private visibleTreeCount: number = 0;
  private collisionCount: number = 0;
  private playerBurning: boolean = false;

  // Cached camera bounds for Y-sorting depth computation
  private lastCamY: number = 0;
  private lastViewH: number = 960;

  // Pre-allocated scratch output for enemy obstacle steering
  public readonly steerOut = { vx: 0, vy: 0, collided: false };

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    decalResolutionScale: number = 1.0
  ) {
    this.scene = scene;
    this.startX = startX;
    this.startY = startY;
    this.decalResolutionScale = decalResolutionScale;

    ensureBurningTreeTextures(scene);

    // Resolve loaded burnt tree variants (tree_burnt_01..03) and cache scale factors for ~260 logical px height
    for (let i = 0; i < TREES.textures.burntTreeKeys.length; i++) {
      const key = TREES.textures.burntTreeKeys[i];
      if (scene.textures.exists(key)) {
        const tex = scene.textures.get(key);
        if (tex && tex.setFilter) {
          tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        const src = tex?.getSourceImage() as { height?: number } | undefined;
        const texH = src && typeof src.height === 'number' && src.height > 0 ? src.height : 260;
        this.treeVariantKeys.push(key);
        this.treeVariantBaseScales.push(TREES.visuals.displayHeight / texH);
      }
    }
    if (this.treeVariantKeys.length === 0) {
      // Fallback to placeholder canvas texture if real burnt tree sprites were not loaded
      const fallbackTex = scene.textures.get(TREES.textures.treeKey);
      const src = fallbackTex?.getSourceImage() as { height?: number } | undefined;
      const texH = src && typeof src.height === 'number' && src.height > 0 ? src.height : 128;
      this.treeVariantKeys.push(TREES.textures.treeKey);
      this.treeVariantBaseScales.push(TREES.visuals.displayHeight / texH);
    }

    // Resolve loaded scorch decal textures (scorch_decal_01..09) with linear filtering
    for (let i = 0; i < TREES.textures.scorchDecalKeys.length; i++) {
      const key = TREES.textures.scorchDecalKeys[i];
      if (scene.textures.exists(key)) {
        const tex = scene.textures.get(key);
        if (tex && tex.setFilter) {
          tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
        this.scorchDecalKeys.push(key);
      }
    }

    // Resolve loaded tree flame spritesheet (fire_tree_loop_sheet) with linear filtering
    if (scene.textures.exists(TREES.textures.fireSheetKey)) {
      const fireTex = scene.textures.get(TREES.textures.fireSheetKey);
      if (fireTex && fireTex.setFilter) {
        fireTex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      this.hasFlameSheet = true;
      this.flameBaseScale = TREES.flames.baseDisplaySize / TREES.flames.frameHeight;
    }

    const totalBuckets = this.gridDim * this.gridDim;
    this.spatialBuckets = new Int16Array(totalBuckets * this.bucketCap);
    this.spatialCounts = new Uint8Array(totalBuckets);

    const initialTreeKey = this.treeVariantKeys[0];
    const maxFlamesPerTree = TREES.flameOffsets.length;

    // Pre-allocate visual sprite pool for burnt trees + pooled flame overlays (never affect collision)
    for (let i = 0; i < TREES.performance.maxPooledTrees; i++) {
      const groundGlow = scene.add
        .image(0, 0, TREES.textures.glowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(4)
        .setDisplaySize(TREES.lighting.groundGlowSize, TREES.lighting.groundGlowSize)
        .setAlpha(TREES.lighting.groundGlowAlpha)
        .setVisible(false);
      groundGlow.disableInteractive();

      const tree = scene.add
        .image(0, 0, initialTreeKey)
        .setOrigin(TREES.visuals.originX, TREES.visuals.originY)
        .setDepth(TREES.performance.depthMin)
        .setVisible(false);
      tree.disableInteractive();

      const flames: Phaser.GameObjects.Sprite[] = [];
      const flameLastFrames: number[] = [];
      if (this.hasFlameSheet) {
        for (let f = 0; f < maxFlamesPerTree; f++) {
          const flame = scene.add
            .sprite(0, 0, TREES.textures.fireSheetKey, 0)
            .setOrigin(TREES.flames.originX, TREES.flames.originY)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(TREES.flames.alpha)
            .setDepth(TREES.performance.depthMin + 0.01)
            .setVisible(false);
          flame.disableInteractive();
          flames.push(flame);
          flameLastFrames.push(0);
        }
      }

      const debugHeat = scene.add
        .image(0, 0, TREES.textures.debugHeatKey)
        .setOrigin(0.5, 0.5)
        .setDepth(28)
        .setVisible(false);
      debugHeat.disableInteractive();

      const debugHitbox = scene.add
        .image(0, 0, TREES.textures.debugHitboxKey)
        .setOrigin(0.5, 0.5)
        .setDepth(29)
        .setVisible(false);
      debugHitbox.disableInteractive();

      this.visualPool.push({
        inUse: false,
        textureKey: initialTreeKey,
        tree,
        flames,
        flameLastFrames,
        groundGlow,
        debugHitbox,
        debugHeat,
      });

      this.farGlows.push({ x: 0, y: 0, radius: TREES.lighting.farGlowRadius, alpha: TREES.lighting.farGlowAlpha });
    }

    // Pre-allocate cosmetic scorch decal pool (drawn at depth 1, below everything above the floor)
    if (this.scorchDecalKeys.length > 0) {
      const initialDecalKey = this.scorchDecalKeys[0];
      for (let i = 0; i < TREES.decals.maxPooledDecals; i++) {
        const sprite = scene.add
          .image(0, 0, initialDecalKey)
          .setOrigin(0.5, 0.5)
          .setDepth(TREES.decals.depth)
          .setVisible(false);
        sprite.disableInteractive();
        this.decalPool.push({
          inUse: false,
          textureKey: initialDecalKey,
          sprite,
        });
      }
    }

    for (let i = 0; i < TREES.lighting.maxRealTreeLights; i++) {
      this.nearestLights.push({
        x: 0,
        y: 0,
        radius: TREES.lighting.realLightRadius,
        intensity: 1,
      });
    }

    // Pre-allocate static Arcade physics circle body pool (enabled only within screen + 200 px)
    this.staticBodyGroup = scene.physics.add.staticGroup();
    for (let i = 0; i < TREES.performance.maxPhysicsBodies; i++) {
      const img = this.staticBodyGroup.create(
        -99999,
        -99999,
        TREES.textures.colliderKey
      ) as Phaser.Physics.Arcade.Image;
      img.setOrigin(0.5, 0.5).setVisible(false).setActive(false);
      img.disableInteractive();
      const body = img.body as Phaser.Physics.Arcade.StaticBody | null;
      if (body) {
        body.setCircle(TREES.collision.hitboxRadius);
        body.enable = false;
      }
      this.staticBodyPool.push({
        sprite: img,
        enabled: false,
        wx: -99999,
        wy: -99999,
      });
    }

    // Pre-allocate pooled orange glow sprites for burning enemies
    for (let i = 0; i < TREES.performance.maxEnemyBurnGlows; i++) {
      const glow = scene.add
        .image(0, 0, TREES.textures.enemyBurnGlowKey)
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(17.5)
        .setDisplaySize(TREES.heat.enemyGlowSize, TREES.heat.enemyGlowSize)
        .setAlpha(TREES.heat.enemyGlowAlpha)
        .setVisible(false);
      glow.disableInteractive();
      this.enemyBurnGlowPool.push(glow);
    }
  }

  public getStaticBodyGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.staticBodyGroup;
  }

  public setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (!enabled) {
      for (let i = 0; i < this.visualPool.length; i++) {
        const slot = this.visualPool[i];
        if (slot.debugHitbox.visible) slot.debugHitbox.setVisible(false);
        if (slot.debugHeat.visible) slot.debugHeat.setVisible(false);
      }
    }
  }

  public isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  public recordCollision(): void {
    this.collisionCount++;
  }

  public setPlayerBurning(burning: boolean): void {
    this.playerBurning = burning;
  }

  public getDebugSnapshot(): BurningTreeDebugSnapshot {
    return {
      enabled: this.debugEnabled,
      activeTrees: this.activeTreeCount,
      visibleTrees: this.visibleTreeCount,
      physicsBodies: this.activePhysicsBodyCount,
      realTreeLights: this.nearestLightCount,
      collisions: this.collisionCount,
      hitboxRadius: TREES.collision.hitboxRadius,
      heatRadius: TREES.heat.radius,
      playerBurning: this.playerBurning,
    };
  }

  public getNearestLightsSnapshot(): { items: readonly BurningTreeLightSlot[]; count: number } {
    return { items: this.nearestLights, count: this.nearestLightCount };
  }

  public getFarGlowsSnapshot(): { items: readonly BurningTreeGlowSlot[]; count: number } {
    return { items: this.farGlows, count: this.farGlowCount };
  }

  public getNearestTreeDistance(): number {
    return this.nearestTreeDistancePx;
  }

  public computeYSortDepth(worldY: number): number {
    const minY = this.lastCamY - 120;
    const spanY = this.lastViewH + 240;
    let t = (worldY - minY) / spanY;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    return TREES.performance.depthMin + t * TREES.performance.depthSpan;
  }

  // -------------------------------------------------------------------------
  // Seeded Chunk Generation (Poisson-disc minSpacing 150px, 2-5 per chunk,
  // >= 220px from player start, guaranteed open corridor gap)
  // -------------------------------------------------------------------------
  private getOrGenerateChunk(cx: number, cy: number): TreeNode[] {
    const key = chunkNumericKey(cx, cy);
    const cached = this.chunkCache.get(key);
    if (cached) return cached;

    if (this.chunkCache.size >= TREES.performance.maxCachedChunks) {
      // Evict oldest chunk; deterministic seed restores identical trees upon return
      const firstKey = this.chunkCache.keys().next().value;
      if (firstKey !== undefined) {
        this.chunkCache.delete(firstKey);
      }
    }

    const nodes = this.generateChunkTrees(cx, cy);
    this.chunkCache.set(key, nodes);
    return nodes;
  }

  private generateChunkTrees(cx: number, cy: number): TreeNode[] {
    let seed = hashChunkSeed(cx, cy, TREES.placement.worldSeed);
    const nextRand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const chunkSize = TREES.placement.chunkSize;
    const pad = TREES.placement.borderPadding;
    const innerSpan = chunkSize - pad * 2;
    const minDist = TREES.placement.minSpacing;
    const minDistSq = minDist * minDist;
    const startClearSq =
      TREES.placement.playerStartClearRadius * TREES.placement.playerStartClearRadius;

    const targetCount =
      TREES.placement.minPerChunk +
      Math.floor(
        nextRand() * (TREES.placement.maxPerChunk - TREES.placement.minPerChunk + 1)
      );

    // Deterministic guaranteed open corridor across each chunk so routes are never blocked
    const corridorVertical = nextRand() < 0.5;
    const halfCorridor = TREES.placement.corridorWidth * 0.5;
    const corridorCenter =
      pad + halfCorridor + nextRand() * Math.max(1, innerSpan - TREES.placement.corridorWidth);

    const originX = cx * chunkSize;
    const originY = cy * chunkSize;
    const result: TreeNode[] = [];

    const canPlace = (lx: number, ly: number): boolean => {
      // Enforce open route corridor
      if (corridorVertical) {
        if (Math.abs(lx - corridorCenter) < halfCorridor) return false;
      } else {
        if (Math.abs(ly - corridorCenter) < halfCorridor) return false;
      }

      const wx = originX + lx;
      const wy = originY + ly;

      // Keep 220px clear around player start
      const sdx = wx - this.startX;
      const sdy = wy - this.startY;
      if (sdx * sdx + sdy * sdy < startClearSq) return false;

      // Enforce 150px minimum Poisson-disc spacing
      for (let i = 0; i < result.length; i++) {
        const dx = wx - result[i].x;
        const dy = wy - result[i].y;
        if (dx * dx + dy * dy < minDistSq) return false;
      }
      return true;
    };

    const pushNode = (lx: number, ly: number) => {
      const scale = 0.92 + nextRand() * 0.16;
      const scaleY = scale * (0.96 + nextRand() * 0.08);
      const flipX = nextRand() < 0.5;
      const variantIndex = Math.floor(nextRand() * TREES.textures.burntTreeKeys.length);
      const flameCount =
        TREES.flames.minPerTree +
        Math.floor(nextRand() * (TREES.flames.maxPerTree - TREES.flames.minPerTree + 1));
      const fScaleSpan = TREES.flames.maxScale - TREES.flames.minScale;
      const flameScales: [number, number, number] = [
        TREES.flames.minScale + nextRand() * fScaleSpan,
        TREES.flames.minScale + nextRand() * fScaleSpan,
        TREES.flames.minScale + nextRand() * fScaleSpan,
      ];
      const flameStartFrames: [number, number, number] = [
        Math.floor(nextRand() * TREES.flames.frames),
        Math.floor(nextRand() * TREES.flames.frames),
        Math.floor(nextRand() * TREES.flames.frames),
      ];
      const flamePhaseOffsets: [number, number, number] = [
        nextRand(),
        nextRand(),
        nextRand(),
      ];
      result.push({
        x: originX + lx,
        y: originY + ly,
        phase: nextRand() * Math.PI * 2,
        scaleX: scale,
        scaleY,
        flipX,
        variantIndex,
        flameCount,
        flameScales,
        flameStartFrames,
        flamePhaseOffsets,
      });
    };

    // Bridson-style seeded Poisson-disc sampling
    const maxTotalAttempts = targetCount * TREES.placement.poissonAttempts;
    for (let attempt = 0; attempt < maxTotalAttempts && result.length < targetCount; attempt++) {
      let lx: number;
      let ly: number;
      if (result.length > 0 && attempt % 2 === 1) {
        const anchor = result[attempt % result.length];
        const ang = nextRand() * Math.PI * 2;
        const rad = minDist + nextRand() * minDist * 0.85;
        lx = anchor.x - originX + Math.cos(ang) * rad;
        ly = anchor.y - originY + Math.sin(ang) * rad;
        if (lx < pad || lx > chunkSize - pad || ly < pad || ly > chunkSize - pad) {
          continue;
        }
      } else {
        lx = pad + nextRand() * innerSpan;
        ly = pad + nextRand() * innerSpan;
      }

      if (canPlace(lx, ly)) {
        pushNode(lx, ly);
      }
    }

    // Deterministic fallback grid pass if spawn-clear zone constrained random darts below minPerChunk
    if (result.length < TREES.placement.minPerChunk) {
      const step = 64;
      for (let ly = pad; ly <= chunkSize - pad && result.length < TREES.placement.minPerChunk; ly += step) {
        for (let lx = pad; lx <= chunkSize - pad && result.length < TREES.placement.minPerChunk; lx += step) {
          if (canPlace(lx, ly)) {
            pushNode(lx, ly);
          }
        }
      }
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Seeded Chunk Generation for Cosmetic Scorch Decals (3-6 per chunk,
  // random rotation 0-360, scale 0.6-1.2, alpha 0.7-0.9, no collision)
  // -------------------------------------------------------------------------
  private getOrGenerateDecalChunk(cx: number, cy: number): ScorchDecalNode[] {
    const key = chunkNumericKey(cx, cy);
    const cached = this.decalChunkCache.get(key);
    if (cached) return cached;

    if (this.decalChunkCache.size >= TREES.performance.maxCachedChunks) {
      const firstKey = this.decalChunkCache.keys().next().value;
      if (firstKey !== undefined) {
        this.decalChunkCache.delete(firstKey);
      }
    }

    let seed = hashChunkSeed(cx, cy, TREES.placement.worldSeed ^ TREES.decals.seedSalt);
    const nextRand = (): number => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const chunkSize = TREES.placement.chunkSize;
    const originX = cx * chunkSize;
    const originY = cy * chunkSize;
    const margin = 36;
    const span = chunkSize - margin * 2;
    const count =
      TREES.decals.minPerChunk +
      Math.floor(nextRand() * (TREES.decals.maxPerChunk - TREES.decals.minPerChunk + 1));

    const nodes: ScorchDecalNode[] = [];
    const variantCount = Math.max(1, TREES.textures.scorchDecalKeys.length);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: originX + margin + nextRand() * span,
        y: originY + margin + nextRand() * span,
        variantIndex: Math.floor(nextRand() * variantCount),
        rotation: nextRand() * Math.PI * 2,
        scale:
          TREES.decals.minScale +
          nextRand() * (TREES.decals.maxScale - TREES.decals.minScale),
        alpha:
          TREES.decals.minAlpha +
          nextRand() * (TREES.decals.maxAlpha - TREES.decals.minAlpha),
      });
    }

    this.decalChunkCache.set(key, nodes);
    return nodes;
  }

  private rebuildActiveTreesAndGrid(minCx: number, maxCx: number, minCy: number, maxCy: number): void {
    this.activeTreeCount = 0;
    this.activeDecalCount = 0;
    const cap = TREES.performance.maxPooledTrees;
    const decalCap = TREES.decals.maxPooledDecals;

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const nodes = this.getOrGenerateChunk(cx, cy);
        for (let i = 0; i < nodes.length && this.activeTreeCount < cap; i++) {
          this.activeTrees[this.activeTreeCount++] = nodes[i];
        }
        if (this.scorchDecalKeys.length > 0) {
          const dNodes = this.getOrGenerateDecalChunk(cx, cy);
          for (let i = 0; i < dNodes.length && this.activeDecalCount < decalCap; i++) {
            this.activeDecals[this.activeDecalCount++] = dNodes[i];
          }
        }
      }
    }

    // Rebuild zero-allocation spatial hash grid
    this.gridOriginX = minCx * TREES.placement.chunkSize;
    this.gridOriginY = minCy * TREES.placement.chunkSize;
    this.spatialCounts.fill(0);

    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    for (let i = 0; i < this.activeTreeCount; i++) {
      const t = this.activeTrees[i];
      const gx = Math.floor((t.x - this.gridOriginX) / cellSize);
      const gy = Math.floor((t.y - this.gridOriginY) / cellSize);
      if (gx < 0 || gx >= dim || gy < 0 || gy >= dim) continue;
      const bucketIdx = gy * dim + gx;
      const count = this.spatialCounts[bucketIdx];
      if (count < bCap) {
        this.spatialBuckets[bucketIdx * bCap + count] = i;
        this.spatialCounts[bucketIdx] = count + 1;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Per-Frame Update: Chunk Streaming, Off-Screen Culling, Y-Sorting,
  // Static Bodies (screen + 200px), Top-4 Nearest Real Lights, Far Glows
  // -------------------------------------------------------------------------
  public update(
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    playerX: number,
    playerY: number,
    timeSec: number,
    quality: Stage2VfxQuality = 'high'
  ): void {
    this.lastCamY = camY;
    this.lastViewH = viewH;

    const loadMargin = TREES.performance.chunkLoadMargin;
    const chunkSize = TREES.placement.chunkSize;
    const minCx = Math.floor((camX - loadMargin) / chunkSize);
    const maxCx = Math.floor((camX + viewW + loadMargin) / chunkSize);
    const minCy = Math.floor((camY - loadMargin) / chunkSize);
    const maxCy = Math.floor((camY + viewH + loadMargin) / chunkSize);

    if (
      minCx !== this.lastMinCx ||
      maxCx !== this.lastMaxCx ||
      minCy !== this.lastMinCy ||
      maxCy !== this.lastMaxCy
    ) {
      this.lastMinCx = minCx;
      this.lastMaxCx = maxCx;
      this.lastMinCy = minCy;
      this.lastMaxCy = maxCy;
      this.rebuildActiveTreesAndGrid(minCx, maxCx, minCy, maxCy);
    }

    const visMinX = camX - TREES.visuals.cullMarginX;
    const visMaxX = camX + viewW + TREES.visuals.cullMarginX;
    const visMinY = camY - TREES.visuals.cullMarginTop;
    const visMaxY = camY + viewH + TREES.visuals.cullMarginBottom;

    const physMargin = TREES.performance.physicsMargin;
    const physMinX = camX - physMargin;
    const physMaxX = camX + viewW + physMargin;
    const physMinY = camY - physMargin;
    const physMaxY = camY + viewH + physMargin;

    const lightMargin = TREES.lighting.realLightRadius + 40;
    const lightMinX = camX - lightMargin;
    const lightMaxX = camX + viewW + lightMargin;
    const lightMinY = camY - lightMargin;
    const lightMaxY = camY + viewH + lightMargin;

    // Reset top-4 nearest light tracking (zero allocation)
    const maxReal = TREES.lighting.maxRealTreeLights;
    for (let k = 0; k < maxReal; k++) {
      this.nearestTreeIndices[k] = -1;
      this.nearestDistSq[k] = 1e18;
    }

    // In Low quality, flames only render on the 8 nearest visible trees to the player
    const limitFlamesToNearest = quality === 'low' && this.hasFlameSheet;
    const maxLowFlameTrees = TREES.flames.lowQualityMaxTrees;
    if (limitFlamesToNearest) {
      for (let k = 0; k < maxLowFlameTrees; k++) {
        this.nearestFlameTreeIndices[k] = -1;
        this.nearestFlameDistSq[k] = 1e18;
      }
      for (let i = 0; i < this.activeTreeCount; i++) {
        const t = this.activeTrees[i];
        if (t.x < visMinX || t.x > visMaxX || t.y < visMinY || t.y > visMaxY) continue;
        const dxp = t.x - playerX;
        const dyp = t.y - playerY;
        const dSq = dxp * dxp + dyp * dyp;
        if (dSq < this.nearestFlameDistSq[maxLowFlameTrees - 1]) {
          let insertAt = maxLowFlameTrees - 1;
          while (insertAt > 0 && dSq < this.nearestFlameDistSq[insertAt - 1]) {
            this.nearestFlameDistSq[insertAt] = this.nearestFlameDistSq[insertAt - 1];
            this.nearestFlameTreeIndices[insertAt] = this.nearestFlameTreeIndices[insertAt - 1];
            insertAt--;
          }
          this.nearestFlameDistSq[insertAt] = dSq;
          this.nearestFlameTreeIndices[insertAt] = i;
        }
      }
    }

    let visualIdx = 0;
    let bodyIdx = 0;
    let minTreeDistSq = 1e18;
    const maxBodies = this.staticBodyPool.length;
    const showDebug = this.debugEnabled;
    const treeVariantCount = this.treeVariantKeys.length;
    const flameOffsets = TREES.flameOffsets;
    const flameFps = TREES.flames.fps;
    const flameFrames = TREES.flames.frames;
    const flameBaseScale = this.flameBaseScale;

    for (let i = 0; i < this.activeTreeCount; i++) {
      const t = this.activeTrees[i];
      const tx = t.x;
      const ty = t.y;

      const dxp = tx - playerX;
      const dyp = ty - playerY;
      const dSq = dxp * dxp + dyp * dyp;
      if (dSq < minTreeDistSq) {
        minTreeDistSq = dSq;
      }

      // 1. Static physics bodies ONLY for trees within screen + 200 px
      if (
        bodyIdx < maxBodies &&
        tx >= physMinX &&
        tx <= physMaxX &&
        ty >= physMinY &&
        ty <= physMaxY
      ) {
        const bSlot = this.staticBodyPool[bodyIdx++];
        const body = bSlot.sprite.body as Phaser.Physics.Arcade.StaticBody | null;
        if (!bSlot.enabled || bSlot.wx !== tx || bSlot.wy !== ty) {
          bSlot.wx = tx;
          bSlot.wy = ty;
          bSlot.enabled = true;
          bSlot.sprite.setPosition(tx, ty);
          bSlot.sprite.setActive(true);
          if (body) {
            body.enable = true;
            body.updateFromGameObject();
          }
        }
      }

      // 2. Candidate for top-4 nearest real lights in darkness layer
      if (tx >= lightMinX && tx <= lightMaxX && ty >= lightMinY && ty <= lightMaxY) {
        if (dSq < this.nearestDistSq[maxReal - 1]) {
          let insertAt = maxReal - 1;
          while (insertAt > 0 && dSq < this.nearestDistSq[insertAt - 1]) {
            this.nearestDistSq[insertAt] = this.nearestDistSq[insertAt - 1];
            this.nearestTreeIndices[insertAt] = this.nearestTreeIndices[insertAt - 1];
            insertAt--;
          }
          this.nearestDistSq[insertAt] = dSq;
          this.nearestTreeIndices[insertAt] = i;
        }
      }

      // 3. Cull off-screen visuals & Y-sort visible pooled sprites
      if (tx < visMinX || tx > visMaxX || ty < visMinY || ty > visMaxY) {
        continue;
      }

      if (visualIdx < this.visualPool.length) {
        const slot = this.visualPool[visualIdx++];
        slot.inUse = true;

        const flicker =
          Math.sin(timeSec * TREES.lighting.flickerSpeedA + t.phase) * 0.6 +
          Math.sin(timeSec * TREES.lighting.flickerSpeedB + t.phase * 1.37) * 0.4;

        const vIdx = t.variantIndex % treeVariantCount;
        const texKey = this.treeVariantKeys[vIdx];
        if (slot.textureKey !== texKey) {
          slot.textureKey = texKey;
          slot.tree.setTexture(texKey);
          slot.tree.setOrigin(TREES.visuals.originX, TREES.visuals.originY);
        }

        const displayScale = this.treeVariantBaseScales[vIdx] * t.scaleY;
        const depth = this.computeYSortDepth(ty);
        slot.tree
          .setPosition(tx, ty)
          .setScale(displayScale, displayScale)
          .setFlipX(t.flipX)
          .setDepth(depth)
          .setVisible(true);

        // 3a. Pooled looping flame overlays along trunk & branches (ADD blend, alpha 0.75, desynced frames)
        if (this.hasFlameSheet && slot.flames.length > 0) {
          let showTreeFlames = true;
          if (limitFlamesToNearest) {
            showTreeFlames = false;
            for (let k = 0; k < maxLowFlameTrees; k++) {
              if (this.nearestFlameTreeIndices[k] === i) {
                showTreeFlames = true;
                break;
              }
            }
          }

          const activeFlames = showTreeFlames
            ? Math.min(t.flameCount, slot.flames.length, flameOffsets.length)
            : 0;
          const flipSign = t.flipX ? -1 : 1;

          for (let f = 0; f < slot.flames.length; f++) {
            const flameSpr = slot.flames[f];
            if (f < activeFlames) {
              const off = flameOffsets[f];
              const frameIdx =
                (t.flameStartFrames[f] + Math.floor(timeSec * flameFps + t.flamePhaseOffsets[f])) %
                flameFrames;
              if (slot.flameLastFrames[f] !== frameIdx) {
                slot.flameLastFrames[f] = frameIdx;
                flameSpr.setFrame(frameIdx);
              }
              const fScale = flameBaseScale * t.flameScales[f] * off.scaleMult * t.scaleY;
              flameSpr
                .setPosition(tx + off.dx * flipSign * t.scaleX, ty + off.dy * t.scaleY)
                .setScale(fScale, fScale)
                .setFlipX(t.flipX && f % 2 === 1)
                .setDepth(depth + 0.01)
                .setVisible(true);
            } else if (flameSpr.visible) {
              flameSpr.setVisible(false);
            }
          }
        }

        const gSize = TREES.lighting.groundGlowSize * (1 + flicker * 0.06);
        slot.groundGlow
          .setPosition(tx, ty - 14)
          .setDisplaySize(gSize, gSize)
          .setAlpha(TREES.lighting.groundGlowAlpha * (0.9 + flicker * 0.1))
          .setVisible(true);

        if (showDebug) {
          slot.debugHitbox.setPosition(tx, ty).setVisible(true);
          slot.debugHeat.setPosition(tx, ty).setVisible(true);
        } else {
          if (slot.debugHitbox.visible) slot.debugHitbox.setVisible(false);
          if (slot.debugHeat.visible) slot.debugHeat.setVisible(false);
        }
      }
    }

    this.visibleTreeCount = visualIdx;
    this.activePhysicsBodyCount = bodyIdx;
    this.nearestTreeDistancePx = minTreeDistSq < 1e17 ? Math.sqrt(minTreeDistSq) : Number.POSITIVE_INFINITY;

    // Hide leftover visual pool slots
    for (let i = visualIdx; i < this.visualPool.length; i++) {
      const slot = this.visualPool[i];
      if (slot.inUse) {
        slot.inUse = false;
        slot.tree.setVisible(false);
        for (let f = 0; f < slot.flames.length; f++) {
          if (slot.flames[f].visible) slot.flames[f].setVisible(false);
        }
        slot.groundGlow.setVisible(false);
        slot.debugHitbox.setVisible(false);
        slot.debugHeat.setVisible(false);
      }
    }

    // 3b. Render pooled cosmetic scorch decals culled off-screen (drawn at depth 1, below everything)
    if (this.decalPool.length > 0 && this.scorchDecalKeys.length > 0) {
      const decalMargin = TREES.decals.cullMargin;
      const dMinX = camX - decalMargin;
      const dMaxX = camX + viewW + decalMargin;
      const dMinY = camY - decalMargin;
      const dMaxY = camY + viewH + decalMargin;
      const decalVariantCount = this.scorchDecalKeys.length;
      const resScale = this.decalResolutionScale;

      let decalIdx = 0;
      for (let i = 0; i < this.activeDecalCount && decalIdx < this.decalPool.length; i++) {
        const d = this.activeDecals[i];
        if (d.x < dMinX || d.x > dMaxX || d.y < dMinY || d.y > dMaxY) {
          continue;
        }
        const slot = this.decalPool[decalIdx++];
        slot.inUse = true;
        const dKey = this.scorchDecalKeys[d.variantIndex % decalVariantCount];
        if (slot.textureKey !== dKey) {
          slot.textureKey = dKey;
          slot.sprite.setTexture(dKey);
        }
        const s = d.scale * resScale;
        slot.sprite
          .setPosition(d.x, d.y)
          .setRotation(d.rotation)
          .setScale(s, s)
          .setAlpha(d.alpha)
          .setVisible(true);
      }

      for (let i = decalIdx; i < this.decalPool.length; i++) {
        const slot = this.decalPool[i];
        if (slot.inUse) {
          slot.inUse = false;
          slot.sprite.setVisible(false);
        }
      }
    }

    // Disable leftover static physics body slots
    for (let i = bodyIdx; i < maxBodies; i++) {
      const bSlot = this.staticBodyPool[i];
      if (bSlot.enabled) {
        bSlot.enabled = false;
        bSlot.sprite.setActive(false);
        const body = bSlot.sprite.body as Phaser.Physics.Arcade.StaticBody | null;
        if (body) {
          body.enable = false;
        }
      }
    }

    // 4. Populate nearest 4 real light slots (140 px radius with flicker) & far baked glow slots
    let realCount = 0;
    for (let k = 0; k < maxReal; k++) {
      const tIdx = this.nearestTreeIndices[k];
      if (tIdx < 0) continue;
      const t = this.activeTrees[tIdx];
      const flicker =
        Math.sin(timeSec * TREES.lighting.flickerSpeedA + t.phase) * 0.6 +
        Math.sin(timeSec * TREES.lighting.flickerSpeedB + t.phase * 1.37) * 0.4;
      const out = this.nearestLights[realCount++];
      out.x = t.x;
      out.y = t.y - 26;
      out.radius = TREES.lighting.realLightRadius * (1 + flicker * TREES.lighting.flickerAmplitude);
      out.intensity = 0.88 + flicker * 0.12;
    }
    this.nearestLightCount = realCount;

    let farCount = 0;
    for (let i = 0; i < this.activeTreeCount && farCount < this.farGlows.length; i++) {
      const t = this.activeTrees[i];
      if (t.x < lightMinX || t.x > lightMaxX || t.y < lightMinY || t.y > lightMaxY) {
        continue;
      }
      let isReal = false;
      for (let k = 0; k < maxReal; k++) {
        if (this.nearestTreeIndices[k] === i) {
          isReal = true;
          break;
        }
      }
      if (isReal) continue;

      const flicker = Math.sin(timeSec * 6.2 + t.phase) * 0.08;
      const out = this.farGlows[farCount++];
      out.x = t.x;
      out.y = t.y - 24;
      out.radius = TREES.lighting.farGlowRadius * (1 + flicker);
      out.alpha = TREES.lighting.farGlowAlpha * (0.92 + flicker);
    }
    this.farGlowCount = farCount;
  }

  // -------------------------------------------------------------------------
  // Pooled Enemy Heat-Burn Glow Frame Lifecycle (zero allocation)
  // -------------------------------------------------------------------------
  public beginEnemyBurnGlowFrame(): void {
    this.prevUsedEnemyBurnGlows = this.usedEnemyBurnGlows;
    this.usedEnemyBurnGlows = 0;
  }

  public markEnemyBurnGlow(x: number, y: number, timeSec: number, phase: number): void {
    if (this.usedEnemyBurnGlows >= this.enemyBurnGlowPool.length) return;
    const spr = this.enemyBurnGlowPool[this.usedEnemyBurnGlows++];
    const pulse = 0.88 + 0.12 * Math.sin(timeSec * 12 + phase);
    const size = TREES.heat.enemyGlowSize * pulse;
    spr
      .setPosition(x, y)
      .setDisplaySize(size, size)
      .setAlpha(TREES.heat.enemyGlowAlpha * pulse);
    if (!spr.visible) spr.setVisible(true);
  }

  public endEnemyBurnGlowFrame(): void {
    for (let i = this.usedEnemyBurnGlows; i < this.prevUsedEnemyBurnGlows; i++) {
      const spr = this.enemyBurnGlowPool[i];
      if (spr.visible) spr.setVisible(false);
    }
  }

  // -------------------------------------------------------------------------
  // Spatial Grid Queries (Zero Allocations)
  // -------------------------------------------------------------------------
  public checkCircleHit(x: number, y: number, radius: number): TreeNode | null {
    if (this.activeTreeCount === 0) return null;
    const hitR = TREES.collision.hitboxRadius + radius;
    const hitRSq = hitR * hitR;
    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    let minGx = Math.floor((x - hitR - this.gridOriginX) / cellSize);
    let maxGx = Math.floor((x + hitR - this.gridOriginX) / cellSize);
    let minGy = Math.floor((y - hitR - this.gridOriginY) / cellSize);
    let maxGy = Math.floor((y + hitR - this.gridOriginY) / cellSize);

    if (maxGx < 0 || minGx >= dim || maxGy < 0 || minGy >= dim) return null;
    if (minGx < 0) minGx = 0;
    if (maxGx >= dim) maxGx = dim - 1;
    if (minGy < 0) minGy = 0;
    if (maxGy >= dim) maxGy = dim - 1;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffset = gy * dim;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const bIdx = rowOffset + gx;
        const count = this.spatialCounts[bIdx];
        if (count === 0) continue;
        const base = bIdx * bCap;
        for (let k = 0; k < count; k++) {
          const t = this.activeTrees[this.spatialBuckets[base + k]];
          const dx = x - t.x;
          const dy = y - t.y;
          if (dx * dx + dy * dy <= hitRSq) {
            return t;
          }
        }
      }
    }
    return null;
  }

  /**
   * Zero-allocation segment vs tree-trunk circle intersection query using the spatial grid.
   * Used so Stage 2 trees block Cinder Warden's SWING cone.
   */
  public isSegmentBlockedByTree(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    extraRadius: number = 0
  ): TreeNode | null {
    if (this.activeTreeCount === 0) return null;
    const hitR = TREES.collision.hitboxRadius + extraRadius;
    const hitRSq = hitR * hitR;
    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    const minX = (x1 < x2 ? x1 : x2) - hitR;
    const maxX = (x1 > x2 ? x1 : x2) + hitR;
    const minY = (y1 < y2 ? y1 : y2) - hitR;
    const maxY = (y1 > y2 ? y1 : y2) + hitR;

    let minGx = Math.floor((minX - this.gridOriginX) / cellSize);
    let maxGx = Math.floor((maxX - this.gridOriginX) / cellSize);
    let minGy = Math.floor((minY - this.gridOriginY) / cellSize);
    let maxGy = Math.floor((maxY - this.gridOriginY) / cellSize);

    if (maxGx < 0 || minGx >= dim || maxGy < 0 || minGy >= dim) return null;
    if (minGx < 0) minGx = 0;
    if (maxGx >= dim) maxGx = dim - 1;
    if (minGy < 0) minGy = 0;
    if (maxGy >= dim) maxGy = dim - 1;

    const segDx = x2 - x1;
    const segDy = y2 - y1;
    const segLenSq = segDx * segDx + segDy * segDy;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffset = gy * dim;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const bIdx = rowOffset + gx;
        const count = this.spatialCounts[bIdx];
        if (count === 0) continue;
        const base = bIdx * bCap;
        for (let k = 0; k < count; k++) {
          const t = this.activeTrees[this.spatialBuckets[base + k]];
          let closestX = x1;
          let closestY = y1;
          if (segLenSq > 0.0001) {
            let proj = ((t.x - x1) * segDx + (t.y - y1) * segDy) / segLenSq;
            if (proj < 0) proj = 0;
            else if (proj > 1) proj = 1;
            closestX = x1 + segDx * proj;
            closestY = y1 + segDy * proj;
          }
          const dx = t.x - closestX;
          const dy = t.y - closestY;
          if (dx * dx + dy * dy <= hitRSq) {
            return t;
          }
        }
      }
    }
    return null;
  }

  public isPointInHeatZone(x: number, y: number): boolean {
    if (this.activeTreeCount === 0) return false;
    const heatR = TREES.heat.radius;
    const heatRSq = heatR * heatR;
    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    let minGx = Math.floor((x - heatR - this.gridOriginX) / cellSize);
    let maxGx = Math.floor((x + heatR - this.gridOriginX) / cellSize);
    let minGy = Math.floor((y - heatR - this.gridOriginY) / cellSize);
    let maxGy = Math.floor((y + heatR - this.gridOriginY) / cellSize);

    if (maxGx < 0 || minGx >= dim || maxGy < 0 || minGy >= dim) return false;
    if (minGx < 0) minGx = 0;
    if (maxGx >= dim) maxGx = dim - 1;
    if (minGy < 0) minGy = 0;
    if (maxGy >= dim) maxGy = dim - 1;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffset = gy * dim;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const bIdx = rowOffset + gx;
        const count = this.spatialCounts[bIdx];
        if (count === 0) continue;
        const base = bIdx * bCap;
        for (let k = 0; k < count; k++) {
          const t = this.activeTrees[this.spatialBuckets[base + k]];
          const dx = x - t.x;
          const dy = y - t.y;
          if (dx * dx + dy * dy <= heatRSq) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Resolves hard trunk circle pushout for player (e.g. during Dash) via spatial grid.
   */
  public resolveCirclePushout(sprite: Phaser.Physics.Arcade.Sprite, entityRadius: number): boolean {
    if (this.activeTreeCount === 0) return false;
    const minDist = TREES.collision.hitboxRadius + entityRadius;
    const minDistSq = minDist * minDist;
    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    let minGx = Math.floor((sprite.x - minDist - this.gridOriginX) / cellSize);
    let maxGx = Math.floor((sprite.x + minDist - this.gridOriginX) / cellSize);
    let minGy = Math.floor((sprite.y - minDist - this.gridOriginY) / cellSize);
    let maxGy = Math.floor((sprite.y + minDist - this.gridOriginY) / cellSize);

    if (maxGx < 0 || minGx >= dim || maxGy < 0 || minGy >= dim) return false;
    if (minGx < 0) minGx = 0;
    if (maxGx >= dim) maxGx = dim - 1;
    if (minGy < 0) minGy = 0;
    if (maxGy >= dim) maxGy = dim - 1;

    let pushed = false;
    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffset = gy * dim;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const bIdx = rowOffset + gx;
        const count = this.spatialCounts[bIdx];
        if (count === 0) continue;
        const base = bIdx * bCap;
        for (let k = 0; k < count; k++) {
          const t = this.activeTrees[this.spatialBuckets[base + k]];
          const dx = sprite.x - t.x;
          const dy = sprite.y - t.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            pushed = true;
            if (distSq < 0.001) {
              sprite.x += minDist;
            } else {
              const dist = Math.sqrt(distSq);
              const push = minDist - dist;
              sprite.x += (dx / dist) * push;
              sprite.y += (dy / dist) * push;
            }
          }
        }
      }
    }
    if (pushed) {
      this.collisionCount++;
    }
    return pushed;
  }

  /**
   * Simple tangent-slide obstacle steering + circle separation for ground enemies
   * (imp, brute, spitter). Flying wisps ignore trees completely.
   */
  public steerGroundEnemy(
    enemy: Phaser.Physics.Arcade.Sprite,
    enemyRadius: number,
    vx: number,
    vy: number,
    phaseTieBreaker: number
  ): void {
    const out = this.steerOut;
    out.vx = vx;
    out.vy = vy;
    out.collided = false;

    if (this.activeTreeCount === 0) return;

    const hardR = TREES.collision.hitboxRadius + enemyRadius;
    const hardRSq = hardR * hardR;
    const steerR = hardR + TREES.collision.steerLookahead;
    const steerRSq = steerR * steerR;

    const cellSize = TREES.performance.spatialCellSize;
    const dim = this.gridDim;
    const bCap = this.bucketCap;

    let minGx = Math.floor((enemy.x - steerR - this.gridOriginX) / cellSize);
    let maxGx = Math.floor((enemy.x + steerR - this.gridOriginX) / cellSize);
    let minGy = Math.floor((enemy.y - steerR - this.gridOriginY) / cellSize);
    let maxGy = Math.floor((enemy.y + steerR - this.gridOriginY) / cellSize);

    if (maxGx < 0 || minGx >= dim || maxGy < 0 || minGy >= dim) return;
    if (minGx < 0) minGx = 0;
    if (maxGx >= dim) maxGx = dim - 1;
    if (minGy < 0) minGy = 0;
    if (maxGy >= dim) maxGy = dim - 1;

    const speed = Math.hypot(vx, vy);
    let curVx = vx;
    let curVy = vy;

    for (let gy = minGy; gy <= maxGy; gy++) {
      const rowOffset = gy * dim;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const bIdx = rowOffset + gx;
        const count = this.spatialCounts[bIdx];
        if (count === 0) continue;
        const base = bIdx * bCap;
        for (let k = 0; k < count; k++) {
          const t = this.activeTrees[this.spatialBuckets[base + k]];
          let dx = enemy.x - t.x;
          let dy = enemy.y - t.y;
          let distSq = dx * dx + dy * dy;
          if (distSq >= steerRSq) continue;

          let dist = Math.sqrt(distSq);
          if (dist < 0.001) {
            dx = 1;
            dy = 0;
            dist = 1;
          }
          const nx = dx / dist;
          const ny = dy / dist;

          // Hard circular trunk collision pushout
          if (distSq < hardRSq) {
            const push = hardR - dist;
            enemy.x += nx * push;
            enemy.y += ny * push;
            out.collided = true;
          }

          // Tangent slide steering when velocity points into trunk
          if (speed > 1) {
            const vn = curVx * nx + curVy * ny;
            if (vn < 0) {
              const proximity = Math.min(1, (steerR - dist) / TREES.collision.steerLookahead);
              const tangX = -ny;
              const tangY = nx;
              let vt = curVx * tangX + curVy * tangY;
              if (Math.abs(vt) < speed * 0.18) {
                vt = (phaseTieBreaker > 500 ? 1 : -1) * speed;
              }
              const sign = vt >= 0 ? 1 : -1;
              const slideVx = tangX * sign * speed;
              const slideVy = tangY * sign * speed;
              curVx = curVx + (slideVx - curVx) * proximity;
              curVy = curVy + (slideVy - curVy) * proximity;
            }
          }
        }
      }
    }

    if (out.collided) {
      this.collisionCount++;
    }

    // Preserve intended speed after tangent slide
    if (speed > 1) {
      const newSpeed = Math.hypot(curVx, curVy);
      if (newSpeed > 0.001) {
        const scale = speed / newSpeed;
        out.vx = curVx * scale;
        out.vy = curVy * scale;
      }
    } else {
      out.vx = curVx;
      out.vy = curVy;
    }
  }

  public destroy(): void {
    for (let i = 0; i < this.visualPool.length; i++) {
      const slot = this.visualPool[i];
      slot.tree.destroy();
      for (let f = 0; f < slot.flames.length; f++) {
        slot.flames[f].destroy();
      }
      slot.groundGlow.destroy();
      slot.debugHitbox.destroy();
      slot.debugHeat.destroy();
    }
    this.visualPool = [];

    for (let i = 0; i < this.decalPool.length; i++) {
      this.decalPool[i].sprite.destroy();
    }
    this.decalPool = [];

    for (let i = 0; i < this.enemyBurnGlowPool.length; i++) {
      this.enemyBurnGlowPool[i].destroy();
    }
    this.enemyBurnGlowPool = [];

    this.staticBodyPool = [];
    this.staticBodyGroup?.clear(true, true);
    this.chunkCache.clear();
    this.decalChunkCache.clear();
  }
}
