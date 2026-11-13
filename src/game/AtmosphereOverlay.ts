import Phaser from 'phaser';
import { gameManager } from './GameManager';

export type WeatherKind = 'embers' | 'rain' | 'storm' | 'ash';

interface TimeOfDayPhase {
  name: string;
  tintColor: number;
  tintAlpha: number;
  horizonColor: number;
  horizonAlpha: number;
}

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  length: number;
  alpha: number;
  phase: number;
  tintVariant: number;
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
const TIME_CYCLE_DURATION_SEC = 360; // Full 4-phase night cycle every 6 minutes
const WEATHER_DURATION_MS = 55000;
const WEATHER_FADE_MS = 3200;
const MAX_WEATHER_PARTICLES = 68;
const LOW_QUALITY_WEATHER_PARTICLES = 32;

function lerpHexColor(c1: number, c2: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
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
  private floorTintGraphics: Phaser.GameObjects.Graphics;
  private weatherGraphics: Phaser.GameObjects.Graphics;
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Subtle ground atmospheric color-grade right above the floor tiles
    this.floorTintGraphics = scene.add
      .graphics()
      .setDepth(1)
      .setScrollFactor(0);
    this.floorTintGraphics.disableInteractive();

    // Screen-space weather streaks, embers, ash & horizon atmospheric wash
    this.weatherGraphics = scene.add
      .graphics()
      .setDepth(33)
      .setScrollFactor(0);
    this.weatherGraphics.disableInteractive();

    this.initParticles();
  }

  private initParticles(): void {
    const w = Math.max(2, this.scene.scale.width);
    const h = Math.max(2, this.scene.scale.height);
    this.particles = [];

    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      const p: WeatherParticle = {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: 0,
        vy: 0,
        size: 1.5,
        length: 12,
        alpha: 0.4,
        phase: Math.random() * Math.PI * 2,
        tintVariant: Math.random(),
      };
      this.configureParticleForWeather(p, this.getActiveWeather(), w, h, true);
      this.particles.push(p);
    }
  }

  public getActiveWeather(): WeatherKind {
    return WEATHER_CYCLE[this.currentWeatherIndex];
  }

  private configureParticleForWeather(
    p: WeatherParticle,
    kind: WeatherKind,
    w: number,
    h: number,
    randomY: boolean
  ): void {
    p.phase = Math.random() * Math.PI * 2;
    p.tintVariant = Math.random();

    switch (kind) {
      case 'embers': {
        p.x = Math.random() * w;
        p.y = randomY ? Math.random() * h : h + Math.random() * 24;
        p.vx = Phaser.Math.FloatBetween(-18, 18);
        p.vy = Phaser.Math.FloatBetween(-58, -24);
        p.size = Phaser.Math.FloatBetween(1.4, 2.8);
        p.length = 0;
        p.alpha = Phaser.Math.FloatBetween(0.28, 0.62);
        break;
      }
      case 'rain': {
        p.x = Math.random() * (w + 120) - 40;
        p.y = randomY ? Math.random() * h : -20 - Math.random() * 60;
        p.vx = Phaser.Math.FloatBetween(-75, -55);
        p.vy = Phaser.Math.FloatBetween(460, 620);
        p.size = 1.1;
        p.length = Phaser.Math.FloatBetween(14, 24);
        p.alpha = Phaser.Math.FloatBetween(0.16, 0.34);
        break;
      }
      case 'storm': {
        p.x = Math.random() * (w + 180) - 40;
        p.y = randomY ? Math.random() * h : -24 - Math.random() * 60;
        p.vx = Phaser.Math.FloatBetween(-145, -110);
        p.vy = Phaser.Math.FloatBetween(640, 820);
        p.size = 1.3;
        p.length = Phaser.Math.FloatBetween(20, 32);
        p.alpha = Phaser.Math.FloatBetween(0.22, 0.44);
        break;
      }
      case 'ash': {
        p.x = Math.random() * w;
        p.y = randomY ? Math.random() * h : -12 - Math.random() * 24;
        p.vx = Phaser.Math.FloatBetween(-14, 16);
        p.vy = Phaser.Math.FloatBetween(26, 54);
        p.size = Phaser.Math.FloatBetween(1.3, 2.7);
        p.length = 0;
        p.alpha = Phaser.Math.FloatBetween(0.22, 0.5);
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

    const w = Math.max(2, this.scene.scale.width);
    const h = Math.max(2, this.scene.scale.height);

    // 1. Time-of-Day Cycle: smoothly blend across 4 atmospheric phases + Blood Moon during Boss / Darkness Falls
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

    // Smoothly shift toward Blood Moon mood when Boss or Darkness Falls event is active
    const targetBloodMoon = isBossActive || isDarknessFalls ? 1 : 0;
    this.bossBloodMoonBlend = Phaser.Math.Linear(
      this.bossBloodMoonBlend,
      targetBloodMoon,
      Math.min(1, deltaMs / 1800)
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

    this.floorTintGraphics.clear();
    this.floorTintGraphics.fillStyle(tintColor, tintAlpha);
    this.floorTintGraphics.fillRect(0, 0, w, h);

    // 2. Dynamic Weather Cycle (fade out -> switch -> fade in)
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
          this.configureParticleForWeather(this.particles[i], nextKind, w, h, true);
        }
      }
    } else if (this.weatherAlpha < 1) {
      this.weatherAlpha = Math.min(1, this.weatherAlpha + deltaMs / WEATHER_FADE_MS);
    }

    // Occasional distant lightning flash during storm weather
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

    // 3. Draw Weather & Horizon Vignette Wash in a single batched Graphics pass
    this.weatherGraphics.clear();

    // Subtle top/bottom atmospheric gradient bands to set time-of-day mood
    const bandH = Math.round(h * 0.18);
    this.weatherGraphics.fillStyle(horizonColor, horizonAlpha * 0.55);
    this.weatherGraphics.fillRect(0, 0, w, bandH * 0.55);
    this.weatherGraphics.fillStyle(horizonColor, horizonAlpha * 0.25);
    this.weatherGraphics.fillRect(0, bandH * 0.55, w, bandH * 0.45);

    this.weatherGraphics.fillStyle(horizonColor, horizonAlpha * 0.45);
    this.weatherGraphics.fillRect(0, h - bandH * 0.5, w, bandH * 0.5);

    if (this.lightningAlpha > 0.005) {
      this.weatherGraphics.fillStyle(0xb9e3ff, this.lightningAlpha);
      this.weatherGraphics.fillRect(0, 0, w, h);
    }

    const activeCount =
      gameManager.getQualityTier() === 'low'
        ? Math.min(LOW_QUALITY_WEATHER_PARTICLES, this.particles.length)
        : this.particles.length;

    const timeSec = this.elapsedMs * 0.001;

    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];
      const sway =
        activeWeather === 'embers' || activeWeather === 'ash'
          ? Math.sin(timeSec * 1.9 + p.phase) * 18
          : 0;

      p.x += (p.vx + sway) * dtSec;
      p.y += p.vy * dtSec;

      const outOfBounds =
        activeWeather === 'embers'
          ? p.y < -16 || p.x < -30 || p.x > w + 30
          : p.y > h + 30 || p.x < -60 || p.x > w + 120;

      if (outOfBounds) {
        this.configureParticleForWeather(p, activeWeather, w, h, false);
      }

      const drawAlpha = p.alpha * this.weatherAlpha;
      if (drawAlpha <= 0.01) continue;

      if (activeWeather === 'rain' || activeWeather === 'storm') {
        const speedMag = Math.max(1, Math.hypot(p.vx, p.vy));
        const dx = (p.vx / speedMag) * p.length;
        const dy = (p.vy / speedMag) * p.length;
        const color = activeWeather === 'storm' ? 0xb8dcf8 : 0x8db8dc;
        this.weatherGraphics.lineStyle(p.size, color, drawAlpha);
        this.weatherGraphics.beginPath();
        this.weatherGraphics.moveTo(p.x, p.y);
        this.weatherGraphics.lineTo(p.x - dx, p.y - dy);
        this.weatherGraphics.strokePath();
      } else if (activeWeather === 'embers') {
        const emberColor =
          p.tintVariant < 0.55 ? 0xf2a93b : p.tintVariant < 0.88 ? 0xe5303a : 0xffd28a;
        const flicker = 0.7 + 0.3 * Math.sin(timeSec * 6.5 + p.phase);
        this.weatherGraphics.fillStyle(emberColor, drawAlpha * flicker);
        this.weatherGraphics.fillCircle(p.x, p.y, p.size);
      } else {
        // Frost Ash / Snowfall
        const ashColor = p.tintVariant < 0.65 ? 0xcad6e6 : 0x9aa8bf;
        this.weatherGraphics.fillStyle(ashColor, drawAlpha);
        this.weatherGraphics.fillCircle(p.x, p.y, p.size);
      }
    }
  }

  public destroy(): void {
    this.floorTintGraphics.destroy();
    this.weatherGraphics.destroy();
    this.particles = [];
  }
}
