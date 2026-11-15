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
import {
  ResolutionQualityMode,
  TargetFpsOption,
  saveDataStore,
} from './saveData';
import { soundManager } from './audio';

export type QualityTier = 'high' | 'low';
export type GameScreenState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface GraphicsConfig {
  targetFps: TargetFpsOption;
  resolutionMode: ResolutionQualityMode;
  upscalerEnabled: boolean;
  frameGenEnabled: boolean;
}

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

export interface LoadProgressPayload {
  active: boolean;
  progress: number;
  phase: string;
  ready: boolean;
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
type GraphicsCallback = (config: GraphicsConfig) => void;
type CritImpactCallback = (impact: CritImpactPayload) => void;
type LoadProgressCallback = (payload: LoadProgressPayload) => void;
type GameStateCallback = (state: GameScreenState) => void;

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
  private graphicsListeners: GraphicsCallback[] = [];
  private critImpactListeners: CritImpactCallback[] = [];
  private loadProgressListeners: LoadProgressCallback[] = [];
  private gameStateListeners: GameStateCallback[] = [];
  private lastCritImpactMs: number = 0;
  private critImpactSeq: number = 0;

  private gameState: GameScreenState = 'TITLE';
  private lastObservedHp: number = 100;
  private deathKnellPlayedForRun: boolean = false;

  public activeScene: Phaser.Scene | null = null;
  public activeUiScene: Phaser.Scene | null = null;
  public phaserGame: Phaser.Game | null = null;

  // Joystick state from touch
  public joystickVector = { x: 0, y: 0 };
  private brightness: number = saveDataStore.read().settings.brightness;
  private qualityTier: QualityTier = 'high';
  private graphicsConfig: GraphicsConfig = (() => {
    const s = saveDataStore.read().settings;
    return {
      targetFps: s.targetFps,
      resolutionMode: s.resolutionMode,
      upscalerEnabled: s.upscalerEnabled,
      frameGenEnabled: s.frameGenEnabled,
    };
  })();

  public getGameState(): GameScreenState {
    return this.gameState;
  }

  public onGameStateChange(cb: GameStateCallback) {
    this.gameStateListeners.push(cb);
    return () => {
      this.gameStateListeners = this.gameStateListeners.filter((l) => l !== cb);
    };
  }

  public setGameState(nextState: GameScreenState) {
    const prevState = this.gameState;
    if (prevState === nextState) return;

    if (
      (nextState === 'PLAYING' && (prevState === 'TITLE' || prevState === 'GAME_OVER')) ||
      nextState === 'TITLE'
    ) {
      this.deathKnellPlayedForRun = false;
      this.lastObservedHp = 100;
    }

    this.gameState = nextState;

    if (nextState === 'GAME_OVER' && this.lastObservedHp <= 0) {
      this.triggerDeathKnellOnce();
    }

    this.gameStateListeners.forEach((l) => l(nextState));
  }

  private triggerDeathKnellOnce() {
    if (this.deathKnellPlayedForRun) return;
    this.deathKnellPlayedForRun = true;
    soundManager.playDeathKnell();
  }

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

  public getGraphicsConfig(): GraphicsConfig {
    return { ...this.graphicsConfig };
  }

  public updateGraphicsConfig(partial: Partial<GraphicsConfig>): GraphicsConfig {
    this.graphicsConfig = {
      ...this.graphicsConfig,
      ...partial,
    };
    saveDataStore.update((draft) => {
      draft.settings.targetFps = this.graphicsConfig.targetFps;
      draft.settings.resolutionMode = this.graphicsConfig.resolutionMode;
      draft.settings.upscalerEnabled = this.graphicsConfig.upscalerEnabled;
      draft.settings.frameGenEnabled = this.graphicsConfig.frameGenEnabled;
    });
    const snapshot = { ...this.graphicsConfig };
    this.graphicsListeners.forEach((l) => l(snapshot));
    return snapshot;
  }

  public onGraphicsChange(cb: GraphicsCallback) {
    this.graphicsListeners.push(cb);
    return () => {
      this.graphicsListeners = this.graphicsListeners.filter((l) => l !== cb);
    };
  }

  public onStatsUpdate(cb: StatsCallback) {
    this.statsListeners.push(cb);
    return () => {
      this.statsListeners = this.statsListeners.filter((l) => l !== cb);
    };
  }

  public emitStats(data: HudStatsPayload) {
    this.lastObservedHp = data.hp;
    if (data.hp > 0 && this.gameState === 'GAME_OVER') {
      this.deathKnellPlayedForRun = false;
    }
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
    if (!stats.victory) {
      this.lastObservedHp = 0;
      this.triggerDeathKnellOnce();
    }
    this.setGameState('GAME_OVER');
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
      shakeDurationMs: 0,
      shakeIntensity: 0,
      hitstopMs: isHeavyCrit ? 46 : 30,
      flashColorHex: isHeavyCrit ? '#ff4d5a' : '#f2a93b',
      flashTintNumber: isHeavyCrit ? 0xff4d5a : 0xf2a93b,
      seq: this.critImpactSeq,
    };

    this.critImpactListeners.forEach((l) => l(payload));
    return true;
  }

  public onLoadProgress(cb: LoadProgressCallback) {
    this.loadProgressListeners.push(cb);
    return () => {
      this.loadProgressListeners = this.loadProgressListeners.filter((l) => l !== cb);
    };
  }

  public emitLoadProgress(payload: LoadProgressPayload) {
    this.loadProgressListeners.forEach((l) => l(payload));
  }

  public setJoystick(x: number, y: number) {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }
}

export const gameManager = new GameManager();
