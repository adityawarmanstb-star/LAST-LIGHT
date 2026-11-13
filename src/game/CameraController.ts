import Phaser from 'phaser';

export const CAMERA_SHAKE_CONFIG = {
  damage: {
    minIntensity: 0.005,
    maxIntensity: 0.022,
    minDurationMs: 120,
    maxDurationMs: 320,
    referenceDamage: 35,
  },
  bossProximity: {
    tremorMaxDistance: 460,
    tremorMinDistance: 100,
    tremorMaxIntensity: 0.0036,
    tremorDurationMs: 140,
    tremorIntervalMs: 180,
    eventMinScale: 0.25,
  },
} as const;

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private activeShakeIntensity: number = 0;
  private activeShakeRemainingMs: number = 0;
  private bossTremorCooldownMs: number = 0;

  constructor(camera: Phaser.Cameras.Scene2D.Camera) {
    this.camera = camera;
  }

  public followTarget(
    target: Phaser.GameObjects.GameObject | { x: number; y: number },
    roundPixels: boolean = true,
    lerpX: number = 0.1,
    lerpY: number = 0.1
  ): void {
    this.camera.startFollow(target, roundPixels, lerpX, lerpY);
  }

  public reset(): void {
    this.activeShakeIntensity = 0;
    this.activeShakeRemainingMs = 0;
    this.bossTremorCooldownMs = 0;
    this.camera.resetFX();
  }

  /**
   * Triggers a camera shake unless a significantly stronger shake is already active.
   */
  public triggerShake(durationMs: number, intensity: number, force: boolean = false): void {
    if (intensity <= 0 || durationMs <= 0) return;

    const clampedIntensity = Phaser.Math.Clamp(intensity, 0.0004, 0.03);
    const clampedDuration = Math.round(Phaser.Math.Clamp(durationMs, 50, 800));

    if (
      !force &&
      this.activeShakeRemainingMs > 0 &&
      clampedIntensity < this.activeShakeIntensity * 0.9
    ) {
      return;
    }

    this.activeShakeIntensity = clampedIntensity;
    this.activeShakeRemainingMs = clampedDuration;
    this.camera.shake(clampedDuration, clampedIntensity);
  }

  /**
   * Scales camera shake intensity and duration based on incoming damage amount and HP fraction.
   */
  public shakeOnDamage(damageAmount: number, maxHp: number): void {
    const cfg = CAMERA_SHAKE_CONFIG.damage;
    const safeMaxHp = Math.max(1, maxHp);
    const rawRatio = Math.max(
      damageAmount / cfg.referenceDamage,
      (damageAmount / safeMaxHp) * 2.4
    );
    const factor = Phaser.Math.Clamp(rawRatio, 0.1, 1.5);
    const normalized = factor / 1.5;

    const intensity = Phaser.Math.Linear(cfg.minIntensity, cfg.maxIntensity, normalized);
    const durationMs = Phaser.Math.Linear(cfg.minDurationMs, cfg.maxDurationMs, normalized);

    this.triggerShake(durationMs, intensity, true);
  }

  /**
   * Scales boss attack / slam / spawn shake intensity by proximity to the boss entity.
   */
  public shakeFromBossProximity(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number,
    baseIntensity: number,
    durationMs: number,
    maxRadius: number = 780
  ): void {
    const dist = Phaser.Math.Distance.Between(bossX, bossY, playerX, playerY);
    const linearProximity = 1 - Phaser.Math.Clamp(dist / Math.max(1, maxRadius), 0, 1);
    const falloff = linearProximity * linearProximity;
    const scale = Phaser.Math.Linear(
      CAMERA_SHAKE_CONFIG.bossProximity.eventMinScale,
      1.0,
      falloff
    );

    this.triggerShake(durationMs, baseIntensity * scale);
  }

  /**
   * Updates active shake decay and applies subtle proximity tremor when near an active boss.
   */
  public update(
    deltaMs: number,
    playerX: number,
    playerY: number,
    activeBoss: { active: boolean; x: number; y: number } | null
  ): void {
    if (this.activeShakeRemainingMs > 0) {
      this.activeShakeRemainingMs = Math.max(0, this.activeShakeRemainingMs - deltaMs);
      if (this.activeShakeRemainingMs === 0) {
        this.activeShakeIntensity = 0;
      }
    }

    if (this.bossTremorCooldownMs > 0) {
      this.bossTremorCooldownMs = Math.max(0, this.bossTremorCooldownMs - deltaMs);
    }

    if (!activeBoss || !activeBoss.active) {
      return;
    }

    const cfg = CAMERA_SHAKE_CONFIG.bossProximity;
    const dist = Phaser.Math.Distance.Between(playerX, playerY, activeBoss.x, activeBoss.y);
    if (dist >= cfg.tremorMaxDistance || this.bossTremorCooldownMs > 0) {
      return;
    }

    // Do not interrupt stronger combat shakes with subtle boss proximity tremor
    if (this.activeShakeRemainingMs > 0 && this.activeShakeIntensity > cfg.tremorMaxIntensity) {
      return;
    }

    const t = Phaser.Math.Clamp(
      (cfg.tremorMaxDistance - dist) / (cfg.tremorMaxDistance - cfg.tremorMinDistance),
      0,
      1
    );
    const intensity = cfg.tremorMaxIntensity * (t * t);
    if (intensity >= 0.0005) {
      this.triggerShake(cfg.tremorDurationMs, intensity);
      this.bossTremorCooldownMs = cfg.tremorIntervalMs;
    }
  }
}
