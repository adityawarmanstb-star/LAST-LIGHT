import Phaser from 'phaser';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  getAdaptiveFxBudget,
  getScrollZeroOffset,
} from './PerformanceEngine';

export type WeatherKind = 'embers' | 'rain' | 'storm' | 'ash';

interface TimeOfDayPhase {
  name: string;
  tintColor: number;
  tintAlpha: number;
  horizonColor: number;
  horizonAlpha: number;
}

interface WeatherParticle {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
  phase: number;
  color: number;
}

const TIME_OF_DAY_PHASES: readonly TimeOfDayPhase[] = [
  {
    name: 'Dusk Ember',
    tintColor: 0x331624,
    tintAlpha: 0.14,
    horizonColor: 0x5c231c,
    horizonAlpha: 0.11,
  },
  {
    name: 'Witching Midnight',
    tintColor: 0x0b1830,
    tintAlpha: 0.18,
    horizonColor: 0x162d4f,
    horizonAlpha: 0.12,
  },
  {
    name: 'Blood Moon Vigil',
    tintColor: 0x480910,
    tintAlpha: 0.19,
    horizonColor: 0x7a1019,
    horizonAlpha: 0.14,
  },
  {
    name: 'Ashen Pre-Dawn',
    tintColor: 0x1c2333,
    tintAlpha: 0.13,
    horizonColor: 0x3a4258,
    horizonAlpha: 0.09,
  },
];

const WEATHER_CYCLE: readonly WeatherKind[] = ['embers', 'rain', 'ash', 'storm'];
const TIME_CYCLE_DURATION_SEC = 360;
const WEATHER_DURATION_MS = 55000;
const WEATHER_FADE_MS = 3200;
const MAX_WEATHER_PARTICLES = 44;

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

export class AtmosphereOverlay {
  private scene: Phaser.Scene;
  private floorTintImage: Phaser.GameObjects.Image;
  private horizonTop: Phaser.GameObjects.Image;
  private horizonBottom: Phaser.GameObjects.Image;
  private lightningOverlay: Phaser.GameObjects.Image;
  private particles: WeatherParticle[] = [];

  private currentWeatherIndex: number = 0;
  private nextWeatherIndex: number = 0;
  private weatherElapsedMs: number = 0;
  private weatherAlpha: number = 1;
  private isCrossfading: boolean = false;

  private elapsedMs: number = 0;
  private bossBloodMoonBlend: number = 0;
  private lightningAlpha: number = 0;
  private nextLightningMs: number = 9000;
  private colorUpdateAccumMs: number = 200;
  private lastOffsetX: number = -99999;
  private lastOffsetY: number = -99999;
  private lastTintColor: number = -1;
  private lastTintAlpha: number = -1;
  private lastHorizonColor: number = -1;
  private lastHorizonAlpha: number = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.ensureTextures();

    this.floorTintImage = scene.add
      .image(0, 0, 'atmo_white_pixel')
      .setOrigin(0, 0)
      .setDisplaySize(LOGICAL_WIDTH, LOGICAL_HEIGHT)
      .setDepth(1)
      .setScrollFactor(0)
      .setTint(TIME_OF_DAY_PHASES[0].tintColor)
      .setAlpha(TIME_OF_DAY_PHASES[0].tintAlpha);
    this.floorTintImage.disableInteractive();

    const bandH = Math.round(LOGICAL_HEIGHT * 0.18);
    this.horizonTop = scene.add
      .image(0, 0, 'atmo_horizon_grad')
      .setOrigin(0, 0)
      .setDisplaySize(LOGICAL_WIDTH, bandH)
      .setDepth(33)
      .setScrollFactor(0);
    this.horizonTop.disableInteractive();

    this.horizonBottom = scene.add
      .image(0, LOGICAL_HEIGHT, 'atmo_horizon_grad')
      .setOrigin(0, 0)
      .setDisplaySize(LOGICAL_WIDTH, bandH * 0.55)
      .setFlipY(true)
      .setDepth(33)
      .setScrollFactor(0);
    this.horizonBottom.disableInteractive();

    this.lightningOverlay = scene.add
      .image(0, 0, 'atmo_white_pixel')
      .setOrigin(0, 0)
      .setDisplaySize(LOGICAL_WIDTH, LOGICAL_HEIGHT)
      .setDepth(33)
      .setScrollFactor(0)
      .setTint(0xb9e3ff)
      .setAlpha(0)
      .setVisible(false);
    this.lightningOverlay.disableInteractive();

    this.initParticles();
  }

  private ensureTextures(): void {
    const texMgr = this.scene.textures;

    if (!texMgr.exists('atmo_white_pixel')) {
      const tex = texMgr.createCanvas('atmo_white_pixel', 4, 4);
      if (tex) {
        const ctx = tex.getContext();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
        tex.refresh();
      }
    }

    if (!texMgr.exists('atmo_horizon_grad')) {
      const tex = texMgr.createCanvas('atmo_horizon_grad', 4, 64);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, 'rgba(255,255,255,0.58)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.24)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 4, 64);
        tex.refresh();
      }
    }

    if (!texMgr.exists('atmo_weather_orb')) {
      const tex = texMgr.createCanvas('atmo_weather_orb', 16, 16);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 7.5);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
        tex.refresh();
      }
    }

    if (!texMgr.exists('atmo_weather_streak')) {
      const tex = texMgr.createCanvas('atmo_weather_streak', 6, 32);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createLinearGradient(3, 0, 3, 32);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
        grad.addColorStop(1, 'rgba(255,255,255,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(1.5, 0, 3, 32);
        tex.refresh();
      }
    }
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      const sprite = this.scene.add
        .image(0, 0, 'atmo_weather_orb')
        .setDepth(33)
        .setScrollFactor(0);
      sprite.disableInteractive();

      const p: WeatherParticle = {
        sprite,
        x: Math.random() * LOGICAL_WIDTH,
        y: Math.random() * LOGICAL_HEIGHT,
        vx: 0,
        vy: 0,
        rotation: 0,
        scaleX: 0.4,
        scaleY: 0.4,
        alpha: 0.4,
        phase: Math.random() * Math.PI * 2,
        color: 0xffffff,
      };
      this.configureParticleForWeather(p, this.getActiveWeather(), true);
      this.particles.push(p);
    }
  }

  public getActiveWeather(): WeatherKind {
    return WEATHER_CYCLE[this.currentWeatherIndex];
  }

  private configureParticleForWeather(
    p: WeatherParticle,
    kind: WeatherKind,
    randomY: boolean
  ): void {
    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;
    p.phase = Math.random() * Math.PI * 2;
    const tintVariant = Math.random();

    switch (kind) {
      case 'embers': {
        p.x = Math.random() * w;
        p.y = randomY ? Math.random() * h : h + Math.random() * 24;
        p.vx = Phaser.Math.FloatBetween(-18, 18);
        p.vy = Phaser.Math.FloatBetween(-58, -24);
        const sz = Phaser.Math.FloatBetween(1.4, 2.8);
        p.scaleX = (sz * 2.2) / 16;
        p.scaleY = p.scaleX;
        p.rotation = 0;
        p.alpha = Phaser.Math.FloatBetween(0.28, 0.62);
        p.color = tintVariant < 0.55 ? 0xf2a93b : tintVariant < 0.88 ? 0xe5303a : 0xffd28a;
        if (p.sprite.texture.key !== 'atmo_weather_orb') p.sprite.setTexture('atmo_weather_orb');
        p.sprite.setTint(p.color).setScale(p.scaleX, p.scaleY).setRotation(0);
        break;
      }
      case 'rain': {
        p.x = Math.random() * (w + 120) - 40;
        p.y = randomY ? Math.random() * h : -20 - Math.random() * 60;
        p.vx = Phaser.Math.FloatBetween(-75, -55);
        p.vy = Phaser.Math.FloatBetween(460, 620);
        const len = Phaser.Math.FloatBetween(14, 24);
        p.scaleX = 0.55;
        p.scaleY = len / 32;
        p.rotation = Math.atan2(p.vy, p.vx) - Math.PI * 0.5;
        p.alpha = Phaser.Math.FloatBetween(0.16, 0.34);
        p.color = 0x8db8dc;
        if (p.sprite.texture.key !== 'atmo_weather_streak') p.sprite.setTexture('atmo_weather_streak');
        p.sprite.setTint(p.color).setScale(p.scaleX, p.scaleY).setRotation(p.rotation);
        break;
      }
      case 'storm': {
        p.x = Math.random() * (w + 180) - 40;
        p.y = randomY ? Math.random() * h : -24 - Math.random() * 60;
        p.vx = Phaser.Math.FloatBetween(-145, -110);
        p.vy = Phaser.Math.FloatBetween(640, 820);
        const len = Phaser.Math.FloatBetween(20, 32);
        p.scaleX = 0.65;
        p.scaleY = len / 32;
        p.rotation = Math.atan2(p.vy, p.vx) - Math.PI * 0.5;
        p.alpha = Phaser.Math.FloatBetween(0.22, 0.44);
        p.color = 0xb8dcf8;
        if (p.sprite.texture.key !== 'atmo_weather_streak') p.sprite.setTexture('atmo_weather_streak');
        p.sprite.setTint(p.color).setScale(p.scaleX, p.scaleY).setRotation(p.rotation);
        break;
      }
      case 'ash': {
        p.x = Math.random() * w;
        p.y = randomY ? Math.random() * h : -12 - Math.random() * 24;
        p.vx = Phaser.Math.FloatBetween(-14, 16);
        p.vy = Phaser.Math.FloatBetween(26, 54);
        const sz = Phaser.Math.FloatBetween(1.3, 2.7);
        p.scaleX = (sz * 2.1) / 16;
        p.scaleY = p.scaleX;
        p.rotation = 0;
        p.alpha = Phaser.Math.FloatBetween(0.22, 0.5);
        p.color = tintVariant < 0.65 ? 0xcad6e6 : 0x9aa8bf;
        if (p.sprite.texture.key !== 'atmo_weather_orb') p.sprite.setTexture('atmo_weather_orb');
        p.sprite.setTint(p.color).setScale(p.scaleX, p.scaleY).setRotation(0);
        break;
      }
    }
  }

  public update(
    deltaMs: number,
    runTimeSec: number,
    isBossActive: boolean,
    isDarknessFalls: boolean
  ): void {
    const dtSec = deltaMs * 0.001;
    this.elapsedMs += deltaMs;

    const w = LOGICAL_WIDTH;
    const h = LOGICAL_HEIGHT;
    const offset = getScrollZeroOffset(this.scene.cameras.main);
    const bandH = Math.round(h * 0.18);

    // 1. Time-of-Day Cycle (throttled every ~120ms and dirty-checked to avoid redundant GPU state updates)
    const offsetChanged =
      Math.abs(offset.x - this.lastOffsetX) > 0.01 ||
      Math.abs(offset.y - this.lastOffsetY) > 0.01;
    if (offsetChanged) {
      this.lastOffsetX = offset.x;
      this.lastOffsetY = offset.y;
      this.floorTintImage.setPosition(offset.x, offset.y);
      this.horizonTop.setPosition(offset.x, offset.y);
      this.horizonBottom.setPosition(offset.x, offset.y + h - bandH * 0.55);
    }

    this.colorUpdateAccumMs += deltaMs;
    const targetBloodMoon = isBossActive || isDarknessFalls ? 1 : 0;
    const bloodMoonSettled = Math.abs(this.bossBloodMoonBlend - targetBloodMoon) < 0.005;
    if (this.colorUpdateAccumMs >= 120 || !bloodMoonSettled) {
      const stepMs = this.colorUpdateAccumMs;
      this.colorUpdateAccumMs = 0;

      const cycleRatio = (runTimeSec % TIME_CYCLE_DURATION_SEC) / TIME_CYCLE_DURATION_SEC;
      const phaseScaled = cycleRatio * TIME_OF_DAY_PHASES.length;
      const phaseIdxA = Math.floor(phaseScaled) % TIME_OF_DAY_PHASES.length;
      const phaseIdxB = (phaseIdxA + 1) % TIME_OF_DAY_PHASES.length;
      const phaseT = phaseScaled - Math.floor(phaseScaled);

      const phaseA = TIME_OF_DAY_PHASES[phaseIdxA];
      const phaseB = TIME_OF_DAY_PHASES[phaseIdxB];

      let tintColor = lerpHexColor(phaseA.tintColor, phaseB.tintColor, phaseT);
      let tintAlpha = Phaser.Math.Linear(phaseA.tintAlpha, phaseB.tintAlpha, phaseT);
      let horizonColor = lerpHexColor(phaseA.horizonColor, phaseB.horizonColor, phaseT);
      let horizonAlpha = Phaser.Math.Linear(phaseA.horizonAlpha, phaseB.horizonAlpha, phaseT);

      this.bossBloodMoonBlend = Phaser.Math.Linear(
        this.bossBloodMoonBlend,
        targetBloodMoon,
        Math.min(1, stepMs / 1800)
      );
      if (this.bossBloodMoonBlend > 0.01) {
        const bloodMoon = TIME_OF_DAY_PHASES[2];
        tintColor = lerpHexColor(tintColor, bloodMoon.tintColor, this.bossBloodMoonBlend * 0.72);
        tintAlpha = Phaser.Math.Linear(tintAlpha, bloodMoon.tintAlpha, this.bossBloodMoonBlend * 0.72);
        horizonColor = lerpHexColor(
          horizonColor,
          bloodMoon.horizonColor,
          this.bossBloodMoonBlend * 0.78
        );
        horizonAlpha = Phaser.Math.Linear(
          horizonAlpha,
          bloodMoon.horizonAlpha,
          this.bossBloodMoonBlend * 0.78
        );
      }

      if (tintColor !== this.lastTintColor || Math.abs(tintAlpha - this.lastTintAlpha) > 0.003) {
        this.lastTintColor = tintColor;
        this.lastTintAlpha = tintAlpha;
        this.floorTintImage.setTint(tintColor).setAlpha(tintAlpha);
      }
      if (
        horizonColor !== this.lastHorizonColor ||
        Math.abs(horizonAlpha - this.lastHorizonAlpha) > 0.003
      ) {
        this.lastHorizonColor = horizonColor;
        this.lastHorizonAlpha = horizonAlpha;
        this.horizonTop.setTint(horizonColor).setAlpha(horizonAlpha);
        this.horizonBottom.setTint(horizonColor).setAlpha(horizonAlpha * 0.85);
      }
    }

    // 2. Dynamic Weather Cycle
    this.weatherElapsedMs += deltaMs;
    if (!this.isCrossfading && this.weatherElapsedMs >= WEATHER_DURATION_MS) {
      this.isCrossfading = true;
      this.nextWeatherIndex = (this.currentWeatherIndex + 1) % WEATHER_CYCLE.length;
    }

    if (this.isCrossfading) {
      this.weatherAlpha = Math.max(0, this.weatherAlpha - deltaMs / WEATHER_FADE_MS);
      if (this.weatherAlpha <= 0) {
        this.currentWeatherIndex = this.nextWeatherIndex;
        this.weatherElapsedMs = 0;
        this.isCrossfading = false;
        const nextKind = this.getActiveWeather();
        for (let i = 0; i < this.particles.length; i++) {
          this.configureParticleForWeather(this.particles[i], nextKind, true);
        }
      }
    } else if (this.weatherAlpha < 1) {
      this.weatherAlpha = Math.min(1, this.weatherAlpha + deltaMs / WEATHER_FADE_MS);
    }

    const activeWeather = this.getActiveWeather();
    if (activeWeather === 'storm' && !this.isCrossfading) {
      this.nextLightningMs -= deltaMs;
      if (this.nextLightningMs <= 0) {
        this.lightningAlpha = 0.14;
        this.nextLightningMs = Phaser.Math.Between(6500, 14000);
      }
    }
    if (this.lightningAlpha > 0) {
      this.lightningAlpha = Math.max(0, this.lightningAlpha - dtSec * 0.65);
    }

    if (this.lightningAlpha > 0.005) {
      this.lightningOverlay
        .setPosition(offset.x, offset.y)
        .setAlpha(this.lightningAlpha)
        .setVisible(true);
    } else if (this.lightningOverlay.visible) {
      this.lightningOverlay.setVisible(false);
    }

    const activeCount = Math.min(getAdaptiveFxBudget().weatherParticles, this.particles.length);

    const timeSec = this.elapsedMs * 0.001;
    const isEmberOrAsh = activeWeather === 'embers' || activeWeather === 'ash';
    const isEmber = activeWeather === 'embers';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (i >= activeCount) {
        if (p.sprite.visible) p.sprite.setVisible(false);
        continue;
      }

      const sway = isEmberOrAsh ? Math.sin(timeSec * 1.9 + p.phase) * 18 : 0;
      p.x += (p.vx + sway) * dtSec;
      p.y += p.vy * dtSec;

      const outOfBounds = isEmber
        ? p.y < -16 || p.x < -30 || p.x > w + 30
        : p.y > h + 30 || p.x < -60 || p.x > w + 120;

      if (outOfBounds) {
        this.configureParticleForWeather(p, activeWeather, false);
      }

      let drawAlpha = p.alpha * this.weatherAlpha;
      if (drawAlpha <= 0.01) {
        if (p.sprite.visible) p.sprite.setVisible(false);
        continue;
      }

      if (isEmber) {
        drawAlpha *= 0.7 + 0.3 * Math.sin(timeSec * 6.5 + p.phase);
      }

      p.sprite.x = offset.x + p.x;
      p.sprite.y = offset.y + p.y;
      if (Math.abs(p.sprite.alpha - drawAlpha) > 0.01) {
        p.sprite.setAlpha(drawAlpha);
      }
      if (!p.sprite.visible) p.sprite.setVisible(true);
    }
  }

  public destroy(): void {
    this.floorTintImage.destroy();
    this.horizonTop.destroy();
    this.horizonBottom.destroy();
    this.lightningOverlay.destroy();
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].sprite.destroy();
    }
    this.particles = [];
  }
}
