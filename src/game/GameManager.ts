import {
  ActiveDynamicChallenge,
  BossInfo,
  DebugStats,
  DynamicChallengeOffer,
  EventWarningInfo,
  RelicId,
  RelicSetId,
  RunStats,
  UpgradeOption,
  WeaponState,
} from './types';
import { saveDataStore } from './saveData';

export type QualityTier = 'high' | 'low';

export interface HudStatsPayload {
  hp: number;
  maxHp: number;
  xp: number;
  nextXp: number;
  level: number;
  time: number;
  kills: number;
  coins: number;
  weapons: WeaponState[];
  combo: number;
  isUnderPressure: boolean;
  lightShardRemainingSec?: number;
  redShardRemainingSec?: number;
  darknessFallsRemainingSec?: number;
  bloodFogRemainingSec?: number;
  activeChallenge?: ActiveDynamicChallenge | null;
  dashCharges?: number;
  maxDashCharges?: number;
  dashCooldownProgress?: number;
  equippedRelicIds?: RelicId[];
  activeRelicSynergies?: RelicSetId[];
  debug: DebugStats;
}

export interface CritImpactPayload {
  damage: number;
  x: number;
  y: number;
  isEliteOrBoss: boolean;
  shakeDurationMs: number;
  shakeIntensity: number;
  hitstopMs: number;
  flashColorHex: string;
  flashTintNumber: number;
  seq: number;
}

type StatsCallback = (data: HudStatsPayload) => void;
type LevelUpCallback = (
  options: UpgradeOption[],
  challengeOffer: DynamicChallengeOffer | null
) => void;
type GameOverCallback = (stats: RunStats) => void;
type BossCallback = (boss: BossInfo | null) => void;
type EventWarningCallback = (warning: EventWarningInfo | null) => void;
type PauseToggleCallback = () => void;
type PauseStateCallback = (isPaused: boolean) => void;
type BrightnessCallback = (brightness: number) => void;
type QualityCallback = (tier: QualityTier) => void;
type CritImpactCallback = (impact: CritImpactPayload) => void;

class GameManager {
  private statsListeners: StatsCallback[] = [];
  private levelUpListeners: LevelUpCallback[] = [];
  private gameOverListeners: GameOverCallback[] = [];
  private bossListeners: BossCallback[] = [];
  private eventWarningListeners: EventWarningCallback[] = [];
  private pauseToggleListeners: PauseToggleCallback[] = [];
  private pauseStateListeners: PauseStateCallback[] = [];
  private brightnessListeners: BrightnessCallback[] = [];
  private qualityListeners: QualityCallback[] = [];
  private critImpactListeners: CritImpactCallback[] = [];
  private lastCritImpactMs: number = 0;
  private critImpactSeq: number = 0;

  public activeScene: Phaser.Scene | null = null;
  public activeUiScene: Phaser.Scene | null = null;
  public phaserGame: Phaser.Game | null = null;

  // Joystick state from touch
  public joystickVector = { x: 0, y: 0 };
  private brightness: number = saveDataStore.read().settings.brightness;
  private qualityTier: QualityTier = 'high';

  public getBrightness(): number {
    return this.brightness;
  }

  public setBrightness(val: number) {
    const clamped = Math.max(0.5, Math.min(1.5, val));
    this.brightness = clamped;
    saveDataStore.update((draft) => {
      draft.settings.brightness = clamped;
    });
    this.brightnessListeners.forEach((l) => l(clamped));
  }

  public onBrightnessChange(cb: BrightnessCallback) {
    this.brightnessListeners.push(cb);
    return () => {
      this.brightnessListeners = this.brightnessListeners.filter((l) => l !== cb);
    };
  }

  public getQualityTier(): QualityTier {
    return this.qualityTier;
  }

  public setQualityTier(tier: QualityTier) {
    if (this.qualityTier === tier) return;
    this.qualityTier = tier;
    this.qualityListeners.forEach((l) => l(tier));
  }

  public onQualityChange(cb: QualityCallback) {
    this.qualityListeners.push(cb);
    return () => {
      this.qualityListeners = this.qualityListeners.filter((l) => l !== cb);
    };
  }

  public onStatsUpdate(cb: StatsCallback) {
    this.statsListeners.push(cb);
    return () => {
      this.statsListeners = this.statsListeners.filter((l) => l !== cb);
    };
  }

  public emitStats(data: HudStatsPayload) {
    this.statsListeners.forEach((l) => l(data));
  }

  public onLevelUp(cb: LevelUpCallback) {
    this.levelUpListeners.push(cb);
    return () => {
      this.levelUpListeners = this.levelUpListeners.filter((l) => l !== cb);
    };
  }

  public emitLevelUp(
    options: UpgradeOption[],
    challengeOffer: DynamicChallengeOffer | null = null
  ) {
    this.levelUpListeners.forEach((l) => l(options, challengeOffer));
  }

  public onGameOver(cb: GameOverCallback) {
    this.gameOverListeners.push(cb);
    return () => {
      this.gameOverListeners = this.gameOverListeners.filter((l) => l !== cb);
    };
  }

  public emitGameOver(stats: RunStats) {
    this.gameOverListeners.forEach((l) => l(stats));
  }

  public onBossUpdate(cb: BossCallback) {
    this.bossListeners.push(cb);
    return () => {
      this.bossListeners = this.bossListeners.filter((l) => l !== cb);
    };
  }

  public emitBossUpdate(boss: BossInfo | null) {
    this.bossListeners.forEach((l) => l(boss));
  }

  public onEventWarning(cb: EventWarningCallback) {
    this.eventWarningListeners.push(cb);
    return () => {
      this.eventWarningListeners = this.eventWarningListeners.filter((l) => l !== cb);
    };
  }

  public emitEventWarning(warning: EventWarningInfo | null) {
    this.eventWarningListeners.forEach((l) => l(warning));
  }

  public onTogglePause(cb: PauseToggleCallback) {
    this.pauseToggleListeners.push(cb);
    return () => {
      this.pauseToggleListeners = this.pauseToggleListeners.filter((l) => l !== cb);
    };
  }

  public emitTogglePause() {
    this.pauseToggleListeners.forEach((l) => l());
  }

  public onPauseState(cb: PauseStateCallback) {
    this.pauseStateListeners.push(cb);
    return () => {
      this.pauseStateListeners = this.pauseStateListeners.filter((l) => l !== cb);
    };
  }

  public emitPauseState(isPaused: boolean) {
    this.pauseStateListeners.forEach((l) => l(isPaused));
  }

  public onCritImpact(cb: CritImpactCallback) {
    this.critImpactListeners.push(cb);
    return () => {
      this.critImpactListeners = this.critImpactListeners.filter((l) => l !== cb);
    };
  }

  public emitCritImpact(input: {
    damage: number;
    x: number;
    y: number;
    isEliteOrBoss?: boolean;
  }): boolean {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isEliteOrBoss = Boolean(input.isEliteOrBoss);
    const minCooldownMs = isEliteOrBoss ? 65 : 110;
    if (now - this.lastCritImpactMs < minCooldownMs) {
      return false;
    }

    this.lastCritImpactMs = now;
    this.critImpactSeq += 1;

    const isHeavyCrit = isEliteOrBoss || input.damage >= 65;
    const payload: CritImpactPayload = {
      damage: input.damage,
      x: input.x,
      y: input.y,
      isEliteOrBoss,
      shakeDurationMs: isHeavyCrit ? 145 : 95,
      shakeIntensity: isHeavyCrit ? 0.0068 : 0.0038,
      hitstopMs: isHeavyCrit ? 46 : 30,
      flashColorHex: isHeavyCrit ? '#ff4d5a' : '#f2a93b',
      flashTintNumber: isHeavyCrit ? 0xff4d5a : 0xf2a93b,
      seq: this.critImpactSeq,
    };

    this.critImpactListeners.forEach((l) => l(payload));
    return true;
  }

  public setJoystick(x: number, y: number) {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }
}

export const gameManager = new GameManager();
