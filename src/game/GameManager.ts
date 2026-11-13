import { BossInfo, DebugStats, EventWarningInfo, RunStats, UpgradeOption, WeaponState } from './types';

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
  darknessFallsRemainingSec?: number;
  debug: DebugStats;
}

type StatsCallback = (data: HudStatsPayload) => void;
type LevelUpCallback = (options: UpgradeOption[]) => void;
type GameOverCallback = (stats: RunStats) => void;
type BossCallback = (boss: BossInfo | null) => void;
type EventWarningCallback = (warning: EventWarningInfo | null) => void;
type PauseToggleCallback = () => void;
type PauseStateCallback = (isPaused: boolean) => void;
type BrightnessCallback = (brightness: number) => void;

const BRIGHTNESS_STORAGE_KEY = 'lastlight_brightness';

class GameManager {
  private statsListeners: StatsCallback[] = [];
  private levelUpListeners: LevelUpCallback[] = [];
  private gameOverListeners: GameOverCallback[] = [];
  private bossListeners: BossCallback[] = [];
  private eventWarningListeners: EventWarningCallback[] = [];
  private pauseToggleListeners: PauseToggleCallback[] = [];
  private pauseStateListeners: PauseStateCallback[] = [];
  private brightnessListeners: BrightnessCallback[] = [];

  public activeScene: Phaser.Scene | null = null;
  public activeUiScene: Phaser.Scene | null = null;
  public phaserGame: Phaser.Game | null = null;

  // Joystick state from touch
  public joystickVector = { x: 0, y: 0 };
  private brightness: number = this.loadBrightness();

  private loadBrightness(): number {
    try {
      const raw = localStorage.getItem(BRIGHTNESS_STORAGE_KEY);
      if (raw !== null) {
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) {
          return Math.max(0.5, Math.min(1.5, parsed));
        }
      }
    } catch {
      // Ignore storage access failures
    }
    return 1.0;
  }

  public getBrightness(): number {
    return this.brightness;
  }

  public setBrightness(val: number) {
    const clamped = Math.max(0.5, Math.min(1.5, val));
    this.brightness = clamped;
    try {
      localStorage.setItem(BRIGHTNESS_STORAGE_KEY, String(clamped));
    } catch {
      // Ignore storage errors
    }
    this.brightnessListeners.forEach((l) => l(clamped));
  }

  public onBrightnessChange(cb: BrightnessCallback) {
    this.brightnessListeners.push(cb);
    return () => {
      this.brightnessListeners = this.brightnessListeners.filter((l) => l !== cb);
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

  public emitLevelUp(options: UpgradeOption[]) {
    this.levelUpListeners.forEach((l) => l(options));
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

  public setJoystick(x: number, y: number) {
    this.joystickVector.x = x;
    this.joystickVector.y = y;
  }
}

export const gameManager = new GameManager();
