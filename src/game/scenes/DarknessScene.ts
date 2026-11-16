import Phaser from 'phaser';
import { gameManager } from '../GameManager';
import { LIGHT, MainScene } from './MainScene';
import { computePointShadowOcclusion, WorldPillarData } from '../ShadowCasterSystem';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  getLogicalScrollX,
  getLogicalScrollY,
  isAndroidOrMobileDevice,
  performanceRuntime,
  syncLogicalCamera,
  upgradeTextureFiltering,
} from '../PerformanceEngine';

const RT_OVERSCAN = 48;

interface LightSourceSlot {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

function lerpHexColor(c1: number, c2: number, t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return (r << 16) | (g << 8) | b;
}

export class DarknessScene extends Phaser.Scene {
  private darkRT!: Phaser.GameObjects.RenderTexture;
  private shadowMaskGraphics!: Phaser.GameObjects.Graphics;
  private bossGlowSprite!: Phaser.GameObjects.Image;
  private torchGlowPool: Phaser.GameObjects.Image[] = [];
  private fogLayer1!: Phaser.GameObjects.TileSprite;
  private fogLayer2!: Phaser.GameObjects.TileSprite;
  private auraSurgeGraphics!: Phaser.GameObjects.Graphics;
  private eyeGraphics!: Phaser.GameObjects.Graphics;
  private edgeArrowGraphics!: Phaser.GameObjects.Graphics;

  private brightness: number = gameManager.getBrightness();
  private currentRtScale: number = LIGHT.renderTextureScale;
  private unsubBrightness: (() => void) | null = null;
  private unsubQuality: (() => void) | null = null;
  private unsubGraphics: (() => void) | null = null;
  private contextRestoredHandler: (() => void) | null = null;

  // Temporal RenderTexture scroll compensation for 90-120fps frame pacing
  private lastRtScrollX: number = 0;
  private lastRtScrollY: number = 0;
  private forceRtRedraw: boolean = true;
  private prevPausedState: boolean = false;

  // Smooth player light state & eased expansion animations
  private hasInitializedLightState: boolean = false;
  private currentStandBonus: number = 1.2;
  private standEaseStart: number = 1.2;
  private standEaseTarget: number = 1.2;
  private standEaseElapsedMs: number = 0;
  private standEaseDurationMs: number = 0;
  private currentLowHpScale: number = 1.0;
  private currentExternalRadiusMult: number = 1.0;
  private radiusEaseStartMult: number = 1.0;
  private radiusEaseTargetMult: number = 1.0;
  private radiusEaseElapsedMs: number = 0;
  private radiusEaseDurationMs: number = 0;
  private radiusEaseIsGrowth: boolean = false;

  // Expanding safe-zone aura wavefront ring on light radius increase
  private auraSurgeElapsedMs: number = 0;
  private auraSurgeDurationMs: number = 0;
  private auraSurgeStartRadius: number = 0;
  private auraSurgeEndRadius: number = 0;
  private auraSurgeIsMajor: boolean = false;

  private bloodFogBlend: number = 0;
  private wasBloodFogTinted: boolean = false;
  private effectTimeMs: number = 0;

  // Level-up expanding reveal pulse
  private lastSeenLevelUpSeq: number = 0;
  private levelUpPulseRemainingMs: number = 0;

  // Pre-allocated fixed pool of light sources & player projectile scratch buffer (zero per-frame allocations)
  private lightSources: LightSourceSlot[] = [];
  private playerProjScratch: Phaser.Physics.Arcade.Sprite[] = [];

  constructor() {
    super({ key: 'DarknessScene' });
  }

  private stripInteractivity(obj: Phaser.GameObjects.GameObject | undefined | null) {
    if (!obj) return;
    obj.disableInteractive();
    if (obj.input) {
      obj.input.enabled = false;
      obj.input.hitArea = null;
    }
  }

  private computeDesiredRtScale(tier: 'high' | 'low'): number {
    const isMobile = isAndroidOrMobileDevice();
    if (tier === 'low') {
      return isMobile ? 0.34 : LIGHT.renderTextureScale * 0.56;
    }
    if (isMobile) {
      return 0.42;
    }
    const mode = performanceRuntime.currentConfig.resolutionMode;
    if (mode === 'ultra_4k') {
      return 0.72;
    }
    return LIGHT.renderTextureScale;
  }

  create() {
    // Non-interactive scene strictly below UIScene / HUD so it never steals touches or clicks
    this.input.enabled = false;
    this.input.topOnly = false;
    this.hasInitializedLightState = false;
    this.radiusEaseElapsedMs = 0;
    this.radiusEaseDurationMs = 0;
    this.standEaseElapsedMs = 0;
    this.standEaseDurationMs = 0;
    this.auraSurgeElapsedMs = 0;
    this.auraSurgeDurationMs = 0;

    // Sync screen-space darkness overlay to logical 540x960 grid over high-DPI / 4K buffer
    const activeScale = Math.max(1, this.scale.width / LOGICAL_WIDTH) || performanceRuntime.currentRenderScale;
    syncLogicalCamera(this.cameras.main, activeScale, true);

    this.lightSources = Array.from({ length: LIGHT.maxLightSources }, () => ({
      x: 0,
      y: 0,
      radius: 0,
      alpha: 1,
    }));

    this.ensureRadialLightTexture();
    this.ensureBossAmberTexture();
    this.ensureProceduralFogTexture();
    upgradeTextureFiltering(this);

    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;

    const isMobile = isAndroidOrMobileDevice();
    // Slow-drifting procedural cool-blue fog inside the dark layer (single layer on mobile to halve overdraw)
    this.fogLayer1 = this.add
      .tileSprite(0, 0, w, h, 'fog_procedural')
      .setOrigin(0, 0)
      .setDepth(2)
      .setTint(LIGHT.fog.tint1)
      .setAlpha(isMobile ? LIGHT.fog.layer1Alpha * 1.25 : LIGHT.fog.layer1Alpha);
    this.stripInteractivity(this.fogLayer1);

    this.fogLayer2 = this.add
      .tileSprite(0, 0, w, h, 'fog_procedural')
      .setOrigin(0, 0)
      .setDepth(3)
      .setTileScale(1.45)
      .setTint(LIGHT.fog.tint2)
      .setAlpha(LIGHT.fog.layer2Alpha)
      .setVisible(!isMobile);
    this.stripInteractivity(this.fogLayer2);

    // Adaptive RenderTexture resolution with 20px overscan border for glitch-free temporal scroll compensation
    this.currentRtScale = this.computeDesiredRtScale(gameManager.getQualityTier());
    const rtW = Math.max(1, Math.ceil((w + RT_OVERSCAN * 2) * this.currentRtScale));
    const rtH = Math.max(1, Math.ceil((h + RT_OVERSCAN * 2) * this.currentRtScale));
    this.darkRT = this.add
      .renderTexture(-RT_OVERSCAN, -RT_OVERSCAN, rtW, rtH)
      .setOrigin(0, 0)
      .setScale(1 / this.currentRtScale)
      .setDepth(5);
    this.stripInteractivity(this.darkRT);
    this.forceRtRedraw = true;

    // Off-display Graphics buffer used to cast real-time shadow cones into darkRT
    this.shadowMaskGraphics = this.make.graphics({ x: 0, y: 0 }, false);

    // Pooled warm amber glows for world torches in darkness
    this.torchGlowPool = [];
    for (let i = 0; i < 8; i++) {
      const tg = this.add
        .image(0, 0, 'light_amber_glow')
        .setOrigin(0.5, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(6)
        .setAlpha(0.28)
        .setVisible(false);
      this.stripInteractivity(tg);
      this.torchGlowPool.push(tg);
    }

    // Subtle amber glow for the boss so it stays visible from afar
    this.bossGlowSprite = this.add
      .image(0, 0, 'light_amber_glow')
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6)
      .setAlpha(LIGHT.sources.bossAmberAlpha)
      .setVisible(false);
    this.stripInteractivity(this.bossGlowSprite);

    // Luminous safe-zone expansion wavefront rendered just above darkRT
    this.auraSurgeGraphics = this.add.graphics().setDepth(6);
    this.stripInteractivity(this.auraSurgeGraphics);

    // Glowing monster eye/accent dots visible at distance in the dark
    this.eyeGraphics = this.add.graphics().setDepth(7);
    this.stripInteractivity(this.eyeGraphics);

    // Screen-edge directional arrows pointing toward off-screen or dark Boss & Elites
    this.edgeArrowGraphics = this.add.graphics().setDepth(8);
    this.stripInteractivity(this.edgeArrowGraphics);

    this.unsubBrightness = gameManager.onBrightnessChange((val) => {
      if (!this.sys?.isActive()) return;
      this.brightness = val;
      this.forceRtRedraw = true;
    });

    this.unsubQuality = gameManager.onQualityChange((tier) => {
      if (!this.sys?.isActive() || !this.darkRT || !this.darkRT.scene) return;
      this.currentRtScale = this.computeDesiredRtScale(tier);
      this.resizeDarkRT();
      this.forceRtRedraw = true;
    });

    this.unsubGraphics = gameManager.onGraphicsChange(() => {
      if (!this.sys?.isActive() || !this.darkRT || !this.darkRT.scene) return;
      const desired = this.computeDesiredRtScale(gameManager.getQualityTier());
      if (Math.abs(desired - this.currentRtScale) > 0.02) {
        this.currentRtScale = desired;
        this.resizeDarkRT();
      }
      this.forceRtRedraw = true;
    });

    this.scale.on('resize', this.handleResize, this);

    if (this.game?.canvas) {
      this.contextRestoredHandler = () => {
        if (this.sys?.isActive()) {
          this.forceRtRedraw = true;
        }
      };
      this.game.canvas.addEventListener('webglcontextrestored', this.contextRestoredHandler, false);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.contextRestoredHandler && this.game?.canvas) {
        this.game.canvas.removeEventListener('webglcontextrestored', this.contextRestoredHandler, false);
      }
      this.contextRestoredHandler = null;
      if (this.unsubBrightness) {
        this.unsubBrightness();
        this.unsubBrightness = null;
      }
      if (this.unsubQuality) {
        this.unsubQuality();
        this.unsubQuality = null;
      }
      if (this.unsubGraphics) {
        this.unsubGraphics();
        this.unsubGraphics = null;
      }
      this.scale.off('resize', this.handleResize, this);
      this.auraSurgeGraphics?.destroy();
      this.shadowMaskGraphics?.destroy();
      for (let i = 0; i < this.torchGlowPool.length; i++) {
        this.torchGlowPool[i].destroy();
      }
      this.torchGlowPool = [];
    });

    // Guarantee UIScene stays strictly above DarknessScene
    if (this.scene.isActive('UIScene') || this.scene.isPaused('UIScene')) {
      this.scene.bringToTop('UIScene');
    }
  }

  private resizeDarkRT() {
    if (!this.sys?.isActive() || !this.darkRT || !this.darkRT.scene) return;
    const scaledW = Math.max(1, Math.ceil((LOGICAL_WIDTH + RT_OVERSCAN * 2) * this.currentRtScale));
    const scaledH = Math.max(1, Math.ceil((LOGICAL_HEIGHT + RT_OVERSCAN * 2) * this.currentRtScale));
    this.darkRT.resize(scaledW, scaledH);
    this.darkRT.setScale(1 / this.currentRtScale);
    this.darkRT.setPosition(-RT_OVERSCAN, -RT_OVERSCAN);
    this.forceRtRedraw = true;
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    if (!this.sys?.isActive() || !this.cameras?.main) return;
    const nextScale = Math.max(1, gameSize.width / LOGICAL_WIDTH);
    syncLogicalCamera(this.cameras.main, nextScale, true);
    this.forceRtRedraw = true;
  }

  private ensureRadialLightTexture() {
    if (this.textures.exists('light_radial_soft')) return;
    const size = 256;
    const tex = this.textures.createCanvas('light_radial_soft', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    // Full illumination inner 60%, soft falloff over the outer 40%
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(LIGHT.softFalloffInnerRatio, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.76, 'rgba(255, 255, 255, 0.58)');
    grad.addColorStop(0.9, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  private ensureBossAmberTexture() {
    if (this.textures.exists('light_amber_glow')) return;
    const size = 256;
    const tex = this.textures.createCanvas('light_amber_glow', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(242, 169, 59, 0.95)');
    grad.addColorStop(0.45, 'rgba(242, 169, 59, 0.45)');
    grad.addColorStop(0.8, 'rgba(229, 72, 77, 0.14)');
    grad.addColorStop(1.0, 'rgba(242, 169, 59, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  private ensureProceduralFogTexture() {
    if (this.textures.exists('fog_procedural')) return;
    const size = 512;
    const tex = this.textures.createCanvas('fog_procedural', size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, size, size);

    // Deterministic seeded wisps wrapped seamlessly at 512x512 boundaries
    let seed = 1337;
    const nextRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 42; i++) {
      const cx = nextRand() * size;
      const cy = nextRand() * size;
      const r = 70 + nextRand() * 130;
      const a = 0.08 + nextRand() * 0.14;

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const px = cx + ox * size;
          const py = cy + oy * size;
          if (px + r < 0 || px - r > size || py + r < 0 || py - r > size) continue;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
          grad.addColorStop(0, `rgba(170, 210, 255, ${a})`);
          grad.addColorStop(0.55, `rgba(130, 175, 235, ${a * 0.45})`);
          grad.addColorStop(1, 'rgba(130, 175, 235, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    tex.refresh();
  }

  update(_time: number, rawDelta: number) {
    try {
      if (!this.sys?.isActive() || !this.darkRT || !this.darkRT.scene) return;
      const main = this.scene.get('MainScene') as MainScene | undefined;
      if (!main || !main.scene?.isActive()) return;

      const snap = main.getLightingData();
      if (
        !snap ||
        !snap.player ||
        !snap.player.active ||
        !Number.isFinite(snap.player.x) ||
        !Number.isFinite(snap.player.y)
      ) {
        return;
      }

      const delta = snap.isGamePaused ? 0 : performanceRuntime.smoothFrameDelta(rawDelta);
      this.effectTimeMs += delta;

      const cam = main.cameras?.main;
      if (!cam) return;
      const scrollX = getLogicalScrollX(cam);
      const scrollY = getLogicalScrollY(cam);
      const w = LOGICAL_WIDTH;
      const h = LOGICAL_HEIGHT;

      if (snap.isGamePaused !== this.prevPausedState) {
        this.prevPausedState = snap.isGamePaused;
        this.forceRtRedraw = true;
      }

      // 1. Update procedural fog layers (smoothly shift into dense crimson Blood Fog during Horde Frenzy)
      if (!snap.isGamePaused) {
        const targetBloodFog = snap.isBloodFogActive ? 1 : 0;
        this.bloodFogBlend = Phaser.Math.Linear(
          this.bloodFogBlend,
          targetBloodFog,
          Math.min(1, delta / 550)
        );
      }

      const isMobile = isAndroidOrMobileDevice();
      if (this.fogLayer1 && this.fogLayer2) {
        if (!snap.isGamePaused) {
          const dtSec = delta / 1000;
          const speedBoost = 1 + this.bloodFogBlend * 1.45;
          this.fogLayer1.tilePositionX += LIGHT.fog.speed1X * speedBoost * dtSec;
          this.fogLayer1.tilePositionY += LIGHT.fog.speed1Y * speedBoost * dtSec;
          if (!isMobile) {
            this.fogLayer2.tilePositionX += LIGHT.fog.speed2X * speedBoost * dtSec;
            this.fogLayer2.tilePositionY += LIGHT.fog.speed2Y * speedBoost * dtSec;
          }
        }

        const baseFog1Alpha = isMobile ? LIGHT.fog.layer1Alpha * 1.25 : LIGHT.fog.layer1Alpha;
        if (this.bloodFogBlend > 0.01) {
          this.wasBloodFogTinted = true;
          this.fogLayer1.setTint(lerpHexColor(LIGHT.fog.tint1, 0xc81622, this.bloodFogBlend));
          this.fogLayer1.setAlpha(
            Phaser.Math.Linear(baseFog1Alpha, isMobile ? 0.28 : 0.22, this.bloodFogBlend)
          );
          if (!isMobile) {
            this.fogLayer2.setTint(lerpHexColor(LIGHT.fog.tint2, 0xe5303a, this.bloodFogBlend));
            this.fogLayer2.setAlpha(
              Phaser.Math.Linear(LIGHT.fog.layer2Alpha, 0.16, this.bloodFogBlend)
            );
          }
        } else if (this.wasBloodFogTinted) {
          this.wasBloodFogTinted = false;
          this.fogLayer1.setTint(LIGHT.fog.tint1);
          this.fogLayer1.setAlpha(baseFog1Alpha);
          if (!isMobile) {
            this.fogLayer2.setTint(LIGHT.fog.tint2);
            this.fogLayer2.setAlpha(LIGHT.fog.layer2Alpha);
          }
        }
      }

      // 2. Player light radius: smooth eased expansion/contraction + safe-zone aura surge
      const targetStand = snap.isStandingReady ? 1 + LIGHT.player.standingBonusRatio : 1.0;
      const targetExternalMult = snap.lightRadiusMultiplier ?? 1.0;
      const radiusBrightnessMult = 0.92 + this.brightness * 0.08;

      if (!this.hasInitializedLightState) {
        this.hasInitializedLightState = true;
        this.currentStandBonus = targetStand;
        this.standEaseStart = targetStand;
        this.standEaseTarget = targetStand;
        this.standEaseElapsedMs = 0;
        this.standEaseDurationMs = 0;

        this.currentExternalRadiusMult = targetExternalMult;
        this.radiusEaseStartMult = targetExternalMult;
        this.radiusEaseTargetMult = targetExternalMult;
        this.radiusEaseElapsedMs = 0;
        this.radiusEaseDurationMs = 0;
        this.radiusEaseIsGrowth = false;
      }

      if (!snap.isGamePaused) {
        if (Math.abs(targetStand - this.standEaseTarget) > 0.002) {
          const isGrowingStand = targetStand > this.currentStandBonus + 0.01;
          this.standEaseStart = this.currentStandBonus;
          this.standEaseTarget = targetStand;
          this.standEaseElapsedMs = 0;
          this.standEaseDurationMs = isGrowingStand ? 340 : 280;

          // Subtle edge shimmer when standing still expands the safe zone, if no major surge is active
          if (
            isGrowingStand &&
            (this.auraSurgeElapsedMs >= this.auraSurgeDurationMs || !this.auraSurgeIsMajor)
          ) {
            const baseVisualMult =
              LIGHT.player.baseRadius *
              this.currentLowHpScale *
              this.currentExternalRadiusMult *
              radiusBrightnessMult;
            this.auraSurgeStartRadius = baseVisualMult * this.currentStandBonus * 0.94;
            this.auraSurgeEndRadius = baseVisualMult * targetStand * 1.02;
            this.auraSurgeElapsedMs = 0;
            this.auraSurgeDurationMs = 420;
            this.auraSurgeIsMajor = false;
          }
        }

        if (this.standEaseDurationMs > 0 && this.standEaseElapsedMs < this.standEaseDurationMs) {
          this.standEaseElapsedMs = Math.min(
            this.standEaseDurationMs,
            this.standEaseElapsedMs + delta
          );
          const p = this.standEaseElapsedMs / this.standEaseDurationMs;
          // Smooth cubic ease-out for responsive stand-still focus
          const eased = 1 - Math.pow(1 - p, 3);
          this.currentStandBonus = Phaser.Math.Linear(
            this.standEaseStart,
            this.standEaseTarget,
            eased
          );
        } else {
          this.currentStandBonus = this.standEaseTarget;
        }

        const hpRatio = snap.currentHp / Math.max(1, snap.maxHp);
        const isLowHpCheck = hpRatio < LIGHT.lowHp.threshold && !snap.isDead;
        const targetHpScale = isLowHpCheck ? LIGHT.lowHp.minRadiusScale : 1.0;
        this.currentLowHpScale = Phaser.Math.Linear(
          this.currentLowHpScale,
          targetHpScale,
          Math.min(1, delta / 350)
        );

        if (Math.abs(targetExternalMult - this.radiusEaseTargetMult) > 0.002) {
          const isGrowth = targetExternalMult > this.currentExternalRadiusMult + 0.004;
          const prevRadius =
            LIGHT.player.baseRadius *
            this.currentStandBonus *
            this.currentLowHpScale *
            this.currentExternalRadiusMult *
            radiusBrightnessMult;
          const nextRadius =
            LIGHT.player.baseRadius *
            this.currentStandBonus *
            this.currentLowHpScale *
            targetExternalMult *
            radiusBrightnessMult;

          this.radiusEaseStartMult = this.currentExternalRadiusMult;
          this.radiusEaseTargetMult = targetExternalMult;
          this.radiusEaseElapsedMs = 0;
          this.radiusEaseDurationMs = isGrowth ? 720 : 520;
          this.radiusEaseIsGrowth = isGrowth;

          if (isGrowth) {
            this.auraSurgeStartRadius = prevRadius * 0.9;
            this.auraSurgeEndRadius = nextRadius * 1.06;
            this.auraSurgeElapsedMs = 0;
            this.auraSurgeDurationMs = 780;
            this.auraSurgeIsMajor = true;
          }
        }

        if (this.radiusEaseDurationMs > 0 && this.radiusEaseElapsedMs < this.radiusEaseDurationMs) {
          this.radiusEaseElapsedMs = Math.min(
            this.radiusEaseDurationMs,
            this.radiusEaseElapsedMs + delta
          );
          const p = this.radiusEaseElapsedMs / this.radiusEaseDurationMs;
          if (this.radiusEaseIsGrowth) {
            // Smooth cubic ease-out with gentle +4% luminous bloom overshoot before settling
            const cubicOut = 1 - Math.pow(1 - p, 3);
            const bloomBump = Math.sin(p * Math.PI) * (1 - p) * 0.09;
            this.currentExternalRadiusMult = Phaser.Math.Linear(
              this.radiusEaseStartMult,
              this.radiusEaseTargetMult,
              cubicOut + bloomBump
            );
          } else {
            const sineOut = Math.sin((p * Math.PI) / 2);
            this.currentExternalRadiusMult = Phaser.Math.Linear(
              this.radiusEaseStartMult,
              this.radiusEaseTargetMult,
              sineOut
            );
          }
        } else {
          this.currentExternalRadiusMult = this.radiusEaseTargetMult;
        }

        if (this.auraSurgeDurationMs > 0 && this.auraSurgeElapsedMs < this.auraSurgeDurationMs) {
          this.auraSurgeElapsedMs = Math.min(
            this.auraSurgeDurationMs,
            this.auraSurgeElapsedMs + delta
          );
        }
      }

      const isAnimatingRadius =
        (this.radiusEaseDurationMs > 0 && this.radiusEaseElapsedMs < this.radiusEaseDurationMs) ||
        (this.standEaseDurationMs > 0 && this.standEaseElapsedMs < this.standEaseDurationMs) ||
        (this.auraSurgeDurationMs > 0 && this.auraSurgeElapsedMs < this.auraSurgeDurationMs);

      const hpRatio = snap.currentHp / Math.max(1, snap.maxHp);
      const isLowHp = hpRatio < LIGHT.lowHp.threshold && !snap.isDead;
      const flickerFreq = isLowHp ? LIGHT.lowHp.flickerSpeedHz : LIGHT.player.flickerSpeedHz;
      const flickerAmp = isLowHp ? LIGHT.lowHp.flickerAmplitude : LIGHT.player.flickerAmplitude;
      const tSec = this.effectTimeMs * 0.001;
      const flickerWave =
        Math.sin(tSec * flickerFreq * Math.PI * 2) * 0.65 +
        Math.sin(tSec * flickerFreq * 1.73 * Math.PI * 2) * 0.35;
      const flickerFactor = 1 + flickerWave * flickerAmp;

      const playerRadius =
        LIGHT.player.baseRadius *
        this.currentStandBonus *
        this.currentLowHpScale *
        this.currentExternalRadiusMult *
        flickerFactor *
        radiusBrightnessMult;

      // 3. Gather up to 12 prioritized light sources
      let lightCount = 0;
      const pushLight = (wx: number, wy: number, radius: number, alpha: number = 1) => {
        if (lightCount >= LIGHT.maxLightSources) return;
        const slot = this.lightSources[lightCount++];
        slot.x = wx;
        slot.y = wy;
        slot.radius = radius;
        slot.alpha = alpha;
      };

      // Priority 1: Player Lantern
      pushLight(snap.player.x, snap.player.y, playerRadius, 1);

      // Priority 2: Level-up expanding reveal light (600px over 0.8s)
      if (snap.levelUpPulseSeq !== this.lastSeenLevelUpSeq) {
        this.lastSeenLevelUpSeq = snap.levelUpPulseSeq;
        this.levelUpPulseRemainingMs = LIGHT.levelUp.durationMs;
      }
      if (this.levelUpPulseRemainingMs > 0) {
        if (!snap.isGamePaused) {
          this.levelUpPulseRemainingMs = Math.max(0, this.levelUpPulseRemainingMs - delta);
        }
        const elapsedRatio = 1 - this.levelUpPulseRemainingMs / LIGHT.levelUp.durationMs;
        const expandEase = Math.min(1, elapsedRatio * 2.5); // rapidly expands to 600px
        const fadeAlpha = elapsedRatio > 0.65 ? (1 - elapsedRatio) / 0.35 : 1;
        pushLight(
          snap.player.x,
          snap.player.y,
          LIGHT.levelUp.maxRadius * (0.25 + 0.75 * expandEase),
          Math.max(0.15, fadeAlpha)
        );
      }

      // Priority 2.5: World Torches (warm flickering pools cutting through darkness & shadows)
      let torchGlowIdx = 0;
      if (snap.torches && snap.torches.count > 0) {
        const torches = snap.torches.items;
        const tCount = snap.torches.count;
        for (let i = 0; i < tCount; i++) {
          const t = torches[i];
          const tsx = t.x - scrollX;
          const tsy = t.y - scrollY;
          if (tsx < -t.radius || tsx > w + t.radius || tsy < -t.radius || tsy > h + t.radius) {
            continue;
          }
          pushLight(t.x, t.y, t.radius, 0.94 * t.intensity);
          if (torchGlowIdx < this.torchGlowPool.length) {
            const tg = this.torchGlowPool[torchGlowIdx++];
            const diam = t.radius * 2.05;
            tg.setPosition(tsx, tsy)
              .setDisplaySize(diam, diam)
              .setAlpha(0.24 * t.intensity)
              .setVisible(true);
          }
        }
      }
      for (let i = torchGlowIdx; i < this.torchGlowPool.length; i++) {
        this.torchGlowPool[i].setVisible(false);
      }

      // Priority 3: Active Boss (240px amber, visible from afar)
      if (snap.activeBoss && snap.activeBoss.active) {
        pushLight(snap.activeBoss.x, snap.activeBoss.y, LIGHT.sources.bossRadius, 1);
        const bsx = snap.activeBoss.x - scrollX;
        const bsy = snap.activeBoss.y - scrollY;
        this.bossGlowSprite.setPosition(bsx, bsy);
        const bossDiameter = LIGHT.sources.bossRadius * 2.1;
        this.bossGlowSprite.setDisplaySize(bossDiameter, bossDiameter);
        this.bossGlowSprite.setAlpha(
          LIGHT.sources.bossAmberAlpha * (0.9 + 0.1 * Math.sin(this.effectTimeMs * 0.005))
        );
        this.bossGlowSprite.setVisible(true);
      } else {
        this.bossGlowSprite.setVisible(false);
      }

      // Priority 3.25: Active Elite variants radiate an unmistakable aura through darkness
      if (snap.enemiesGroup && lightCount < LIGHT.maxLightSources) {
        const enemies = snap.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
        let eliteLightsAdded = 0;
        for (let i = 0; i < enemies.length && lightCount < LIGHT.maxLightSources && eliteLightsAdded < 3; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;
          const edata = enemy.getData('data') as { isElite?: boolean } | undefined;
          if (!edata?.isElite) continue;
          const sx = enemy.x - scrollX;
          const sy = enemy.y - scrollY;
          if (sx < -100 || sx > w + 100 || sy < -100 || sy > h + 100) continue;
          pushLight(enemy.x, enemy.y, 85, 0.85);
          eliteLightsAdded++;
        }
      }

      // Single scan over projectilesGroup: emit Enemy Projectiles immediately (Priority 3.5),
      // and stash up to maxLightSources player projectiles for Priority 4 without re-iterating.
      this.playerProjScratch.length = 0;
      if (snap.projectilesGroup && lightCount < LIGHT.maxLightSources) {
        const projs = snap.projectilesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
        const remainingSlots = LIGHT.maxLightSources - lightCount;
        for (let i = 0; i < projs.length && lightCount < LIGHT.maxLightSources; i++) {
          const proj = projs[i];
          if (!proj.active) continue;
          const sx = proj.x - scrollX;
          const sy = proj.y - scrollY;
          if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
          const pdata = proj.getData('data') as { isEnemy?: boolean } | undefined;
          if (pdata?.isEnemy) {
            pushLight(proj.x, proj.y, LIGHT.sources.enemyProjRadius, 0.95);
          } else if (this.playerProjScratch.length < remainingSlots) {
            this.playerProjScratch.push(proj);
          }
        }
      }

      // Priority 4: Orbiting Blades & Active FX / Player Projectiles (80px for FX)
      for (let i = 0; i < snap.orbitingBlades.length && lightCount < LIGHT.maxLightSources; i++) {
        const b = snap.orbitingBlades[i];
        if (b && b.active && b.visible) {
          pushLight(b.x, b.y, LIGHT.sources.fxRadius, 0.85);
        }
      }

      if (snap.effectPool && lightCount < LIGHT.maxLightSources) {
        for (let i = 0; i < snap.effectPool.length && lightCount < LIGHT.maxLightSources; i++) {
          const fx = snap.effectPool[i];
          if (fx.inUse && fx.sprite.active && fx.sprite.visible) {
            const sx = fx.sprite.x - scrollX;
            const sy = fx.sprite.y - scrollY;
            if (sx >= -100 && sx <= w + 100 && sy >= -100 && sy <= h + 100) {
              pushLight(fx.sprite.x, fx.sprite.y, LIGHT.sources.fxRadius, 0.9);
            }
          }
        }
      }

      for (let i = 0; i < this.playerProjScratch.length && lightCount < LIGHT.maxLightSources; i++) {
        const proj = this.playerProjScratch[i];
        pushLight(proj.x, proj.y, LIGHT.sources.fxRadius, 0.85);
      }

    // Priority 5: XP Gems, Light Shards & Chests within screen bounds
    if (snap.pickupsGroup && lightCount < LIGHT.maxLightSources) {
      const pickups = snap.pickupsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      for (let i = 0; i < pickups.length && lightCount < LIGHT.maxLightSources; i++) {
        const p = pickups[i];
        if (!p.active) continue;
        const sx = p.x - scrollX;
        const sy = p.y - scrollY;
        if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
        const pType = p.getData('type');
        if (
          pType === 'gem' ||
          pType === 'chest' ||
          pType === 'light_shard' ||
          pType === 'red_shard'
        ) {
          const r =
            pType === 'light_shard' || pType === 'red_shard'
              ? LIGHT.sources.lightShardRadius
              : pType === 'chest'
                ? LIGHT.sources.fxRadius
                : LIGHT.sources.gemRadius;
          pushLight(
            p.x,
            p.y,
            r,
            pType === 'light_shard' ? 0.95 : pType === 'red_shard' ? 0.9 : 0.85
          );
        }
      }
    }

    // 4. Render Darkness RenderTexture with Temporal Frame-Gen Reprojection at 90/120fps
    // Never darker than 85% outside lights; brightness slider (50-150%) smoothly lightens
    const darkAlpha = Phaser.Math.Clamp(
      LIGHT.fillAlpha * (1.24 - this.brightness * 0.32),
      0.42,
      LIGHT.maxDarknessOutsideLights
    );

    if (this.darkRT && this.darkRT.scene && this.textures.exists('light_radial_soft')) {
      const scrollDeltaX = this.lastRtScrollX - scrollX;
      const scrollDeltaY = this.lastRtScrollY - scrollY;
      const exceededOverscan =
        Math.abs(scrollDeltaX) > RT_OVERSCAN * 0.72 || Math.abs(scrollDeltaY) > RT_OVERSCAN * 0.72;
      const shouldRedrawRt =
        this.forceRtRedraw ||
        exceededOverscan ||
        isAnimatingRadius ||
        this.levelUpPulseRemainingMs > 0 ||
        performanceRuntime.shouldRunTemporalHeavyPass(delta, false);

      if (shouldRedrawRt) {
        this.forceRtRedraw = false;
        this.lastRtScrollX = scrollX;
        this.lastRtScrollY = scrollY;
        this.darkRT.setPosition(-RT_OVERSCAN, -RT_OVERSCAN);
        this.darkRT.clear();

        const fillColor =
          this.bloodFogBlend > 0.01
            ? lerpHexColor(LIGHT.darkColor, 0x280409, this.bloodFogBlend)
            : LIGHT.darkColor;
        this.darkRT.fill(fillColor, darkAlpha);

        const rtScale = this.currentRtScale;
        const rtW = this.darkRT.width;
        const rtH = this.darkRT.height;

        for (let i = 0; i < lightCount; i++) {
          const ls = this.lightSources[i];
          const halfX = (ls.x - scrollX + RT_OVERSCAN) * rtScale;
          const halfY = (ls.y - scrollY + RT_OVERSCAN) * rtScale;
          const halfR = ls.radius * rtScale;
          if (halfX + halfR < 0 || halfX - halfR > rtW || halfY + halfR < 0 || halfY - halfR > rtH) {
            continue;
          }
          this.darkRT.stamp('light_radial_soft', undefined, halfX, halfY, {
            scale: (ls.radius * rtScale) / 128,
            alpha: ls.alpha,
            blendMode: Phaser.BlendModes.ERASE,
          });

          // Right after carving the Player Lantern pool (index 0), project real-time shadow cones
          // cast by terrain pillars & boss into darkRT; subsequent torches/lights naturally cut through them.
          if (i === 0 && this.shadowMaskGraphics) {
            this.drawPlayerShadowMaskCones(
              ls.x,
              ls.y,
              ls.radius,
              scrollX,
              scrollY,
              rtScale,
              fillColor,
              darkAlpha * 0.82,
              snap.pillars?.items ?? null,
              snap.pillars?.count ?? 0,
              snap.activeBoss && snap.activeBoss.active ? snap.activeBoss : null
            );
          }
        }
        this.darkRT.render();
      } else {
        // Inter-frame temporal scroll compensation: locks cached lightmap to world at zero RT cost
        this.darkRT.setPosition(scrollDeltaX - RT_OVERSCAN, scrollDeltaY - RT_OVERSCAN);
      }
    }

    // 4.5 Render smooth expanding Safe-Zone Aura Wavefront above darkRT when light grows
    this.auraSurgeGraphics.clear();
    if (this.auraSurgeDurationMs > 0 && this.auraSurgeElapsedMs < this.auraSurgeDurationMs) {
      const p = this.auraSurgeElapsedMs / this.auraSurgeDurationMs;
      const eased = 1 - Math.pow(1 - p, 3);
      const ringR = Phaser.Math.Linear(this.auraSurgeStartRadius, this.auraSurgeEndRadius, eased);
      const fadeAlpha = p < 0.18 ? p / 0.18 : Math.pow(1 - (p - 0.18) / 0.82, 1.35);
      const psx = snap.player.x - scrollX;
      const psy = snap.player.y - scrollY;

      if (this.auraSurgeIsMajor) {
        this.auraSurgeGraphics.fillStyle(0x5de4ff, 0.055 * fadeAlpha);
        this.auraSurgeGraphics.fillCircle(psx, psy, ringR * 0.97);
        this.auraSurgeGraphics.lineStyle(18, 0x22d3ee, 0.14 * fadeAlpha);
        this.auraSurgeGraphics.strokeCircle(psx, psy, ringR);
        this.auraSurgeGraphics.lineStyle(6, 0x7df3ff, 0.34 * fadeAlpha);
        this.auraSurgeGraphics.strokeCircle(psx, psy, ringR);
        this.auraSurgeGraphics.lineStyle(2, 0xe8fdff, 0.56 * fadeAlpha);
        this.auraSurgeGraphics.strokeCircle(psx, psy, ringR);
      } else {
        this.auraSurgeGraphics.lineStyle(10, 0x22d3ee, 0.08 * fadeAlpha);
        this.auraSurgeGraphics.strokeCircle(psx, psy, ringR);
        this.auraSurgeGraphics.lineStyle(2.5, 0x8ef5ff, 0.22 * fadeAlpha);
        this.auraSurgeGraphics.strokeCircle(psx, psy, ringR);
      }
    }

    // 5. Update Enemies Alpha (0.12 outside light -> 1.0 in 0.2s), Glowing Eye Dots & Edge Arrows
    this.eyeGraphics.clear();
    this.edgeArrowGraphics.clear();

    const pillarItems = snap.pillars?.items ?? [];
    const pillarCount = snap.pillars?.count ?? 0;
    const hasActiveBoss = Boolean(snap.activeBoss && snap.activeBoss.active);
    const bossX = hasActiveBoss ? snap.activeBoss!.x : 0;
    const bossY = hasActiveBoss ? snap.activeBoss!.y : 0;

    if (snap.enemiesGroup) {
      const enemies = snap.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      const fadeStep = delta / LIGHT.enemies.fadeDurationMs;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.active) continue;
        const edata = enemy.getData('data') as
          | { type: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss'; isElite?: boolean; lightVis?: number }
          | undefined;
        if (!edata) continue;

        const isBossEnemy = edata.type === 'boss';
        const sx = enemy.x - scrollX;
        const sy = enemy.y - scrollY;
        const nearView = sx >= -110 && sx <= w + 110 && sy >= -110 && sy <= h + 110;

        // Early frustum cull: skip light-source & shadow-cone occlusion loops for far off-screen enemies
        let maxLit = 0;
        if (nearView) {
          for (let j = 0; j < lightCount; j++) {
            const ls = this.lightSources[j];
            const dx = enemy.x - ls.x;
            const dy = enemy.y - ls.y;
            const effR = ls.radius * 0.92;
            const distSq = dx * dx + dy * dy;
            if (distSq < effR * effR) {
              const dist = Math.sqrt(distSq);
              let litVal = Math.min(1, ((effR - dist) / (effR * 0.35)) * ls.alpha);
              if (!isMobile && (pillarCount > 0 || (hasActiveBoss && !isBossEnemy))) {
                const occ = computePointShadowOcclusion(
                  ls.x,
                  ls.y,
                  enemy.x,
                  enemy.y,
                  pillarItems,
                  pillarCount,
                  isBossEnemy ? undefined : bossX,
                  isBossEnemy ? undefined : bossY,
                  isBossEnemy ? 0 : 48
                );
                litVal *= 1 - occ * 0.78;
              }
              if (litVal > maxLit) maxLit = litVal;
            }
          }
        }

        const prevVis = edata.lightVis ?? 0;
        const nextVis =
          maxLit > prevVis
            ? Math.min(maxLit, prevVis + fadeStep)
            : Math.max(maxLit, prevVis - fadeStep);
        edata.lightVis = nextVis;

        // Sprite alpha 0.12 outside light, fading smoothly to 1.0 over 0.2s
        const targetAlpha = Phaser.Math.Linear(LIGHT.enemies.darkAlpha, 1.0, nextVis);
        if (Math.abs(enemy.alpha - targetAlpha) > 0.004) {
          enemy.setAlpha(targetAlpha);
        }

        const onScreen = nearView && sx >= 16 && sx <= w - 16 && sy >= 16 && sy <= h - 16;

        if (onScreen && nextVis < 0.9) {
          // Glowing "!" alert indicator visible on enemies lurking in the dark (extended by Night Eyes)
          const alertRange =
            LIGHT.enemies.baseEyeGlowRange *
            (snap.hasNightEyes ? LIGHT.enemies.nightEyesRangeMultiplier : 1.0);
          const dxP = enemy.x - snap.player.x;
          const dyP = enemy.y - snap.player.y;
          const distToPlayerSq = dxP * dxP + dyP * dyP;
          if (distToPlayerSq < alertRange * alertRange) {
            const distToPlayer = Math.sqrt(distToPlayerSq);
            const alertDistFade =
              distToPlayer <= alertRange * 0.72
                ? 1
                : Math.max(0, 1 - (distToPlayer - alertRange * 0.72) / (alertRange * 0.28));
            if (alertDistFade > 0.02) {
              const baseAlertAlpha = (1 - nextVis * 0.85) * alertDistFade;
              const alertAlpha = Math.min(
                1,
                baseAlertAlpha * (snap.hasNightEyes ? LIGHT.enemies.nightEyesAlphaBoost : 1.0)
              );
              const sizeBoost = snap.hasNightEyes ? LIGHT.enemies.nightEyesSizeBoost : 1.0;
              const alertColor = LIGHT.enemies.eyeColors[edata.type] ?? 0xc44cff;

              let offsetY = 22;
              let markScale = 1.0;

              if (edata.type === 'brute') {
                offsetY = 52;
                markScale = 1.4;
              } else if (edata.type === 'spitter') {
                offsetY = 30;
                markScale = 1.08;
              } else if (edata.type === 'boss') {
                offsetY = 56;
                markScale = 1.55;
              } else if (edata.type === 'wisp') {
                offsetY = 18;
                markScale = 0.95;
              }

              if (edata.isElite) {
                offsetY *= 1.18;
                markScale *= 1.2;
              }

              markScale *= sizeBoost;

              const bobY = Math.sin(this.effectTimeMs * 0.0085 + i * 0.7) * 1.6;
              const ix = sx;
              const iy = Math.max(24, sy - offsetY + bobY);

              const barW = 3.4 * markScale;
              const barH = 8.8 * markScale;
              const barTop = iy - 13.0 * markScale;
              const dotY = iy - 1.4 * markScale;
              const dotR = 1.9 * markScale;

              // Outer soft colored glow aura
              this.eyeGraphics.fillStyle(alertColor, alertAlpha * 0.24);
              this.eyeGraphics.fillCircle(ix, iy - 6.8 * markScale, 9.5 * markScale);

              // Dark iron drop-shadow for crisp contrast against fog & background
              this.eyeGraphics.fillStyle(0x07080d, alertAlpha * 0.75);
              this.eyeGraphics.fillRoundedRect(
                ix - barW * 0.5 + 0.8,
                barTop + 1.0,
                barW,
                barH,
                1.5 * markScale
              );
              this.eyeGraphics.fillCircle(ix + 0.8, dotY + 1.0, dotR);

              // Main glowing "!" exclamation glyph (stem + dot)
              this.eyeGraphics.fillStyle(alertColor, alertAlpha);
              this.eyeGraphics.fillRoundedRect(
                ix - barW * 0.5,
                barTop,
                barW,
                barH,
                1.5 * markScale
              );
              this.eyeGraphics.fillCircle(ix, dotY, dotR);

              // Subtle bright core highlight for sharpness in the dark
              this.eyeGraphics.fillStyle(0xfff7e6, alertAlpha * 0.45);
              this.eyeGraphics.fillRoundedRect(
                ix - barW * 0.22,
                barTop + 1.1 * markScale,
                barW * 0.44,
                barH * 0.68,
                0.8 * markScale
              );
              this.eyeGraphics.fillCircle(ix, dotY, dotR * 0.45);
            }
          }
        }

        // Screen-edge directional arrows for Boss & Elites when off-screen or in the dark
        if ((edata.type === 'boss' || edata.isElite) && (!onScreen || nextVis < 0.45)) {
          this.drawEdgeIndicator(
            sx,
            sy,
            w,
            h,
            edata.type === 'boss' ? LIGHT.edgeIndicators.bossColor : LIGHT.edgeIndicators.eliteColor,
            edata.type === 'boss' ? 12 : 9.5,
            this.effectTimeMs
          );
        }
      }
    }
    } catch (err) {
      console.error('[DarknessScene] update error:', err);
    }
  }

  private drawEdgeIndicator(
    targetScreenX: number,
    targetScreenY: number,
    w: number,
    h: number,
    color: number,
    size: number,
    time: number
  ) {
    if (!Number.isFinite(targetScreenX) || !Number.isFinite(targetScreenY)) return;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const dx = targetScreenX - cx;
    const dy = targetScreenY - cy;
    const angle = Math.atan2(dy, dx);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const minX = LIGHT.edgeIndicators.margin;
    const maxX = w - LIGHT.edgeIndicators.margin;
    const minY = LIGHT.edgeIndicators.topMargin;
    const maxY = h - LIGHT.edgeIndicators.margin;

    let tMin = Infinity;
    if (cos > 0.0001) tMin = Math.min(tMin, (maxX - cx) / cos);
    else if (cos < -0.0001) tMin = Math.min(tMin, (minX - cx) / cos);

    if (sin > 0.0001) tMin = Math.min(tMin, (maxY - cy) / sin);
    else if (sin < -0.0001) tMin = Math.min(tMin, (minY - cy) / sin);

    const ix = Phaser.Math.Clamp(cx + cos * tMin, minX, maxX);
    const iy = Phaser.Math.Clamp(cy + sin * tMin, minY, maxY);

    const pulse = 0.72 + 0.28 * Math.sin(time * 0.008);
    const tipX = ix + cos * size;
    const tipY = iy + sin * size;
    const perpX = -sin;
    const perpY = cos;
    const backX = ix - cos * (size * 0.65);
    const backY = iy - sin * (size * 0.65);
    const wing = size * 0.75;

    this.edgeArrowGraphics.fillStyle(color, 0.25 * pulse);
    this.edgeArrowGraphics.fillCircle(ix, iy, size * 1.15);

    this.edgeArrowGraphics.fillStyle(color, 0.92 * pulse);
    this.edgeArrowGraphics.fillTriangle(
      tipX,
      tipY,
      backX + perpX * wing,
      backY + perpY * wing,
      backX - perpX * wing,
      backY - perpY * wing
    );
    this.edgeArrowGraphics.lineStyle(1.5, 0x0b0d12, 0.9);
    this.edgeArrowGraphics.strokeTriangle(
      tipX,
      tipY,
      backX + perpX * wing,
      backY + perpY * wing,
      backX - perpX * wing,
      backY - perpY * wing
    );
  }

  private drawPlayerShadowMaskCones(
    lightWorldX: number,
    lightWorldY: number,
    lightRadius: number,
    scrollX: number,
    scrollY: number,
    rtScale: number,
    fillColor: number,
    shadowAlpha: number,
    pillars: readonly WorldPillarData[] | null,
    pillarCount: number,
    boss: Phaser.Physics.Arcade.Sprite | null
  ) {
    let hasShadows = false;
    this.shadowMaskGraphics.clear();
    this.shadowMaskGraphics.fillStyle(fillColor, shadowAlpha);

    if (pillars && pillarCount > 0) {
      for (let i = 0; i < pillarCount; i++) {
        const p = pillars[i];
        if (this.appendOccluderShadowQuad(lightWorldX, lightWorldY, lightRadius, p.x, p.y, p.radius * 0.92, scrollX, scrollY, rtScale)) {
          hasShadows = true;
        }
      }
    }

    if (boss && boss.active) {
      if (this.appendOccluderShadowQuad(lightWorldX, lightWorldY, lightRadius, boss.x, boss.y + 12, 46, scrollX, scrollY, rtScale)) {
        hasShadows = true;
      }
    }

    if (hasShadows) {
      this.darkRT.draw(this.shadowMaskGraphics);
    }
  }

  private appendOccluderShadowQuad(
    lx: number,
    ly: number,
    lightRadius: number,
    ox: number,
    oy: number,
    radius: number,
    scrollX: number,
    scrollY: number,
    rtScale: number
  ): boolean {
    const dx = ox - lx;
    const dy = oy - ly;
    const distSq = dx * dx + dy * dy;
    const maxReach = lightRadius + radius;
    if (distSq >= maxReach * maxReach || distSq <= (radius + 4) * (radius + 4)) {
      return false;
    }

    const dist = Math.sqrt(distSq);
    const angle = Math.atan2(dy, dx);
    const halfSpread = Math.asin(Math.min(0.92, radius / dist));
    const shadowReach = Math.max(80, lightRadius * 1.05 - dist);

    const perp1 = angle - Math.PI * 0.5;
    const perp2 = angle + Math.PI * 0.5;
    const n1x = (ox + Math.cos(perp1) * radius - scrollX + RT_OVERSCAN) * rtScale;
    const n1y = (oy + Math.sin(perp1) * radius - scrollY + RT_OVERSCAN) * rtScale;
    const n2x = (ox + Math.cos(perp2) * radius - scrollX + RT_OVERSCAN) * rtScale;
    const n2y = (oy + Math.sin(perp2) * radius - scrollY + RT_OVERSCAN) * rtScale;

    const farLen = shadowReach * rtScale;
    const a1 = angle - halfSpread;
    const a2 = angle + halfSpread;
    const f1x = n1x + Math.cos(a1) * farLen;
    const f1y = n1y + Math.sin(a1) * farLen;
    const f2x = n2x + Math.cos(a2) * farLen;
    const f2y = n2y + Math.sin(a2) * farLen;

    this.shadowMaskGraphics.beginPath();
    this.shadowMaskGraphics.moveTo(n1x, n1y);
    this.shadowMaskGraphics.lineTo(f1x, f1y);
    this.shadowMaskGraphics.lineTo(f2x, f2y);
    this.shadowMaskGraphics.lineTo(n2x, n2y);
    this.shadowMaskGraphics.closePath();
    this.shadowMaskGraphics.fillPath();
    return true;
  }
}
