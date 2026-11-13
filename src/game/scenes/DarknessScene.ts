import Phaser from 'phaser';
import { gameManager } from '../GameManager';
import { LIGHT, MainScene } from './MainScene';

interface LightSourceSlot {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export class DarknessScene extends Phaser.Scene {
  private darkRT!: Phaser.GameObjects.RenderTexture;
  private bossGlowSprite!: Phaser.GameObjects.Image;
  private fogLayer1!: Phaser.GameObjects.TileSprite;
  private fogLayer2!: Phaser.GameObjects.TileSprite;
  private eyeGraphics!: Phaser.GameObjects.Graphics;
  private edgeArrowGraphics!: Phaser.GameObjects.Graphics;

  private brightness: number = gameManager.getBrightness();
  private currentRtScale: number = LIGHT.renderTextureScale;
  private unsubBrightness: (() => void) | null = null;
  private unsubQuality: (() => void) | null = null;

  // Smooth player light state
  private currentStandBonus: number = 1.2;
  private currentLowHpScale: number = 1.0;
  private currentExternalRadiusMult: number = 1.0;
  private effectTimeMs: number = 0;

  // Level-up expanding reveal pulse
  private lastSeenLevelUpSeq: number = 0;
  private levelUpPulseRemainingMs: number = 0;

  // Pre-allocated fixed pool of light sources (zero per-frame allocations, max 12)
  private lightSources: LightSourceSlot[] = [];

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

  create() {
    // Non-interactive scene strictly below UIScene / HUD so it never steals touches or clicks
    this.input.enabled = false;
    this.input.topOnly = false;

    // Fixed screen-space camera independent of MainScene camera follow/shake/zoom
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    this.lightSources = Array.from({ length: LIGHT.maxLightSources }, () => ({
      x: 0,
      y: 0,
      radius: 0,
      alpha: 1,
    }));

    this.ensureRadialLightTexture();
    this.ensureBossAmberTexture();
    this.ensureProceduralFogTexture();

    const w = Math.max(2, this.scale.width);
    const h = Math.max(2, this.scale.height);

    // 2 slow-drifting procedural cool-blue fog layers inside the dark layer (< 12% opacity)
    this.fogLayer1 = this.add
      .tileSprite(0, 0, w, h, 'fog_procedural')
      .setOrigin(0, 0)
      .setDepth(2)
      .setTint(LIGHT.fog.tint1)
      .setAlpha(LIGHT.fog.layer1Alpha);
    this.stripInteractivity(this.fogLayer1);

    this.fogLayer2 = this.add
      .tileSprite(0, 0, w, h, 'fog_procedural')
      .setOrigin(0, 0)
      .setDepth(3)
      .setTileScale(1.45)
      .setTint(LIGHT.fog.tint2)
      .setAlpha(LIGHT.fog.layer2Alpha);
    this.stripInteractivity(this.fogLayer2);

    // Adaptive RenderTexture resolution scaled up cleanly for mobile performance
    this.currentRtScale =
      gameManager.getQualityTier() === 'low'
        ? LIGHT.renderTextureScale * 0.5
        : LIGHT.renderTextureScale;
    const halfW = Math.max(1, Math.ceil(w * this.currentRtScale));
    const halfH = Math.max(1, Math.ceil(h * this.currentRtScale));
    this.darkRT = this.add
      .renderTexture(0, 0, halfW, halfH)
      .setOrigin(0, 0)
      .setScale(1 / this.currentRtScale)
      .setDepth(5);
    this.stripInteractivity(this.darkRT);

    // Subtle amber glow for the boss so it stays visible from afar
    this.bossGlowSprite = this.add
      .image(0, 0, 'light_amber_glow')
      .setOrigin(0.5, 0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6)
      .setAlpha(LIGHT.sources.bossAmberAlpha)
      .setVisible(false);
    this.stripInteractivity(this.bossGlowSprite);

    // Glowing monster eye/accent dots visible at distance in the dark
    this.eyeGraphics = this.add.graphics().setDepth(7);
    this.stripInteractivity(this.eyeGraphics);

    // Screen-edge directional arrows pointing toward off-screen or dark Boss & Elites
    this.edgeArrowGraphics = this.add.graphics().setDepth(8);
    this.stripInteractivity(this.edgeArrowGraphics);

    this.unsubBrightness = gameManager.onBrightnessChange((val) => {
      this.brightness = val;
    });

    this.unsubQuality = gameManager.onQualityChange((tier) => {
      this.currentRtScale =
        tier === 'low' ? LIGHT.renderTextureScale * 0.5 : LIGHT.renderTextureScale;
      this.resizeDarkRT(this.scale.width, this.scale.height);
    });

    this.scale.on('resize', this.handleResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubBrightness) {
        this.unsubBrightness();
        this.unsubBrightness = null;
      }
      if (this.unsubQuality) {
        this.unsubQuality();
        this.unsubQuality = null;
      }
      this.scale.off('resize', this.handleResize, this);
    });

    // Guarantee UIScene stays strictly above DarknessScene
    if (this.scene.isActive('UIScene') || this.scene.isPaused('UIScene')) {
      this.scene.bringToTop('UIScene');
    }
  }

  private resizeDarkRT(width: number, height: number) {
    if (!this.darkRT) return;
    const w = Math.max(2, width);
    const h = Math.max(2, height);
    const scaledW = Math.max(1, Math.ceil(w * this.currentRtScale));
    const scaledH = Math.max(1, Math.ceil(h * this.currentRtScale));
    this.darkRT.resize(scaledW, scaledH);
    this.darkRT.setScale(1 / this.currentRtScale);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const w = Math.max(2, gameSize.width);
    const h = Math.max(2, gameSize.height);
    if (this.fogLayer1) this.fogLayer1.setSize(w, h);
    if (this.fogLayer2) this.fogLayer2.setSize(w, h);
    this.resizeDarkRT(w, h);
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
      const main = this.scene.get('MainScene') as MainScene | undefined;
      if (!main || !main.scene.isActive()) return;

      const snap = main.getLightingData();
      if (!snap || !snap.player || !snap.player.active) return;

      const delta = snap.isGamePaused ? 0 : Math.min(rawDelta, 50);
      this.effectTimeMs += delta;

      const cam = main.cameras?.main;
      if (!cam) return;
      const scrollX = cam.scrollX;
      const scrollY = cam.scrollY;
      const w = this.scale.width;
      const h = this.scale.height;

      // 1. Update slow-drifting procedural fog layers (freeze drift while paused)
      if (!snap.isGamePaused && this.fogLayer1 && this.fogLayer2) {
        const dtSec = delta / 1000;
        this.fogLayer1.tilePositionX += LIGHT.fog.speed1X * dtSec;
        this.fogLayer1.tilePositionY += LIGHT.fog.speed1Y * dtSec;
        this.fogLayer2.tilePositionX += LIGHT.fog.speed2X * dtSec;
        this.fogLayer2.tilePositionY += LIGHT.fog.speed2Y * dtSec;
      }

      // 2. Player light radius: standing still (+20% over 0.3s), low HP (<30% -> 70% faster flicker)
      if (!snap.isGamePaused) {
        const targetStand = snap.isStandingReady ? 1 + LIGHT.player.standingBonusRatio : 1.0;
        const standStep = Math.min(1, delta / LIGHT.player.transitionDurationMs);
        this.currentStandBonus = Phaser.Math.Linear(this.currentStandBonus, targetStand, standStep);

        const hpRatio = snap.currentHp / Math.max(1, snap.maxHp);
        const isLowHpCheck = hpRatio < LIGHT.lowHp.threshold && !snap.isDead;
        const targetHpScale = isLowHpCheck ? LIGHT.lowHp.minRadiusScale : 1.0;
        this.currentLowHpScale = Phaser.Math.Linear(
          this.currentLowHpScale,
          targetHpScale,
          Math.min(1, delta / 350)
        );

        const targetExternalMult = snap.lightRadiusMultiplier ?? 1.0;
        this.currentExternalRadiusMult = Phaser.Math.Linear(
          this.currentExternalRadiusMult,
          targetExternalMult,
          Math.min(1, delta / 300)
        );
      }

      const hpRatio = snap.currentHp / Math.max(1, snap.maxHp);
      const isLowHp = hpRatio < LIGHT.lowHp.threshold && !snap.isDead;
      const flickerFreq = isLowHp ? LIGHT.lowHp.flickerSpeedHz : LIGHT.player.flickerSpeedHz;
      const flickerAmp = isLowHp ? LIGHT.lowHp.flickerAmplitude : LIGHT.player.flickerAmplitude;
      const tSec = this.effectTimeMs * 0.001;
      const flickerWave =
        Math.sin(tSec * flickerFreq * Math.PI * 2) * 0.65 +
        Math.sin(tSec * flickerFreq * 1.73 * Math.PI * 2) * 0.35;
      const flickerFactor = 1 + flickerWave * flickerAmp;

      // Brightness slightly assists player radius (0.96..1.04) while clamping ambient darkness <= 85%
      const radiusBrightnessMult = 0.92 + this.brightness * 0.08;
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

      // Priority 3.5: All active Enemy Projectiles (50px radius) so they always stay visible in the dark
      if (snap.projectilesGroup && lightCount < LIGHT.maxLightSources) {
        const projs = snap.projectilesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
        for (let i = 0; i < projs.length && lightCount < LIGHT.maxLightSources; i++) {
          const proj = projs[i];
          if (!proj.active) continue;
          const sx = proj.x - scrollX;
          const sy = proj.y - scrollY;
          if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
          const pdata = proj.getData('data') as { isEnemy?: boolean } | undefined;
          if (pdata?.isEnemy) {
            pushLight(proj.x, proj.y, LIGHT.sources.enemyProjRadius, 0.95);
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

    if (snap.projectilesGroup && lightCount < LIGHT.maxLightSources) {
      const projs = snap.projectilesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      for (let i = 0; i < projs.length && lightCount < LIGHT.maxLightSources; i++) {
        const proj = projs[i];
        if (!proj.active) continue;
        const sx = proj.x - scrollX;
        const sy = proj.y - scrollY;
        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
        const pdata = proj.getData('data') as { isEnemy?: boolean } | undefined;
        if (!pdata?.isEnemy) {
          pushLight(proj.x, proj.y, LIGHT.sources.fxRadius, 0.85);
        }
      }
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

    // 4. Render Half-Res Darkness RenderTexture once per frame
    // Never darker than 85% outside lights; brightness slider (50-150%) smoothly lightens
    const darkAlpha = Phaser.Math.Clamp(
      LIGHT.fillAlpha * (1.24 - this.brightness * 0.32),
      0.42,
      LIGHT.maxDarknessOutsideLights
    );

    if (this.darkRT && this.darkRT.scene && this.textures.exists('light_radial_soft')) {
      this.darkRT.clear();
      this.darkRT.fill(LIGHT.darkColor, darkAlpha);

      const rtScale = this.currentRtScale;
      const rtW = this.darkRT.width;
      const rtH = this.darkRT.height;

      for (let i = 0; i < lightCount; i++) {
        const ls = this.lightSources[i];
        const halfX = (ls.x - scrollX) * rtScale;
        const halfY = (ls.y - scrollY) * rtScale;
        const halfR = ls.radius * rtScale;
        if (halfX + halfR < 0 || halfX - halfR > rtW || halfY + halfR < 0 || halfY - halfR > rtH) {
          continue;
        }
        this.darkRT.stamp('light_radial_soft', undefined, halfX, halfY, {
          scale: (ls.radius * rtScale) / 128,
          alpha: ls.alpha,
          blendMode: Phaser.BlendModes.ERASE,
        });
      }
      this.darkRT.render();
    }

    // 5. Update Enemies Alpha (0.12 outside light -> 1.0 in 0.2s), Glowing Eye Dots & Edge Arrows
    this.eyeGraphics.clear();
    this.edgeArrowGraphics.clear();

    if (snap.enemiesGroup) {
      const enemies = snap.enemiesGroup.getChildren() as Phaser.Physics.Arcade.Sprite[];
      const fadeStep = delta / LIGHT.enemies.fadeDurationMs;

      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy.active) continue;
        const edata = enemy.getData('data') as
          | { type: 'wisp' | 'imp' | 'spitter' | 'brute' | 'boss'; isElite?: boolean }
          | undefined;
        if (!edata) continue;

        // Check if enemy is illuminated by any active light source
        let maxLit = 0;
        for (let j = 0; j < lightCount; j++) {
          const ls = this.lightSources[j];
          const dx = enemy.x - ls.x;
          const dy = enemy.y - ls.y;
          const effR = ls.radius * 0.92;
          const distSq = dx * dx + dy * dy;
          if (distSq < effR * effR) {
            const dist = Math.sqrt(distSq);
            const litVal = Math.min(1, ((effR - dist) / (effR * 0.35)) * ls.alpha);
            if (litVal > maxLit) maxLit = litVal;
          }
        }

        const prevVis = (enemy.getData('lightVis') as number) ?? 0;
        const nextVis =
          maxLit > prevVis
            ? Math.min(maxLit, prevVis + fadeStep)
            : Math.max(maxLit, prevVis - fadeStep);
        enemy.setData('lightVis', nextVis);

        // Sprite alpha 0.12 outside light, fading smoothly to 1.0 over 0.2s
        enemy.setAlpha(Phaser.Math.Linear(LIGHT.enemies.darkAlpha, 1.0, nextVis));

        const sx = enemy.x - scrollX;
        const sy = enemy.y - scrollY;
        const onScreen = sx >= 16 && sx <= w - 16 && sy >= 16 && sy <= h - 16;

        // Pair of small glowing eye/accent dots visible at distance in the dark (extended by Night Eyes)
        const eyeRange =
          LIGHT.enemies.baseEyeGlowRange *
          (snap.hasNightEyes ? LIGHT.enemies.nightEyesRangeMultiplier : 1.0);
        const distToPlayer = Phaser.Math.Distance.Between(
          snap.player.x,
          snap.player.y,
          enemy.x,
          enemy.y
        );
        const eyeDistFade =
          distToPlayer <= eyeRange * 0.72
            ? 1
            : Math.max(0, 1 - (distToPlayer - eyeRange * 0.72) / (eyeRange * 0.28));

        if (onScreen && nextVis < 0.9 && eyeDistFade > 0.02) {
          const baseEyeAlpha = (1 - nextVis * 0.85) * eyeDistFade;
          const eyeAlpha = Math.min(
            1,
            baseEyeAlpha * (snap.hasNightEyes ? LIGHT.enemies.nightEyesAlphaBoost : 1.0)
          );
          const eyeSizeMult = snap.hasNightEyes ? LIGHT.enemies.nightEyesSizeBoost : 1.0;
          const eyeColor = LIGHT.enemies.eyeColors[edata.type] ?? 0xc44cff;
          const facingDir = enemy.flipX ? -1 : 1;

          let spreadX = 5;
          let offsetY = 6;
          let eyeRadius = 2.1;

          if (edata.type === 'brute') {
            spreadX = 9;
            offsetY = 14;
            eyeRadius = 2.6;
          } else if (edata.type === 'spitter') {
            spreadX = 5;
            offsetY = 14;
            eyeRadius = 2.2;
          } else if (edata.type === 'boss') {
            spreadX = 12;
            offsetY = 24;
            eyeRadius = 3.2;
          } else if (edata.type === 'wisp') {
            spreadX = 5;
            offsetY = 2;
            eyeRadius = 2.0;
          }

          if (edata.isElite) {
            spreadX *= 1.25;
            offsetY *= 1.25;
            eyeRadius *= 1.2;
          }

          eyeRadius *= eyeSizeMult;

          const eyeCenterX = sx + facingDir * (spreadX * 0.5);
          const eyeY = sy - offsetY;
          const leftEyeX = eyeCenterX - spreadX * 0.7;
          const rightEyeX = eyeCenterX + spreadX * 0.7;

          this.eyeGraphics.fillStyle(eyeColor, eyeAlpha * 0.35);
          this.eyeGraphics.fillCircle(leftEyeX, eyeY, eyeRadius * 2.1);
          this.eyeGraphics.fillCircle(rightEyeX, eyeY, eyeRadius * 2.1);

          this.eyeGraphics.fillStyle(eyeColor, eyeAlpha);
          this.eyeGraphics.fillCircle(leftEyeX, eyeY, eyeRadius);
          this.eyeGraphics.fillCircle(rightEyeX, eyeY, eyeRadius);
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
}
