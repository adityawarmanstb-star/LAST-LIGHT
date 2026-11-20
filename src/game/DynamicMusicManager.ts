import { MusicTrackKey, soundManager } from './audio';
import { GameScreenState, gameManager } from './GameManager';
import { BossInfo, RunStats } from './types';

export type DynamicMusicPhase = 'idle' | 'menu' | 'exploration' | 'boss_combat' | 'game_over';

export interface DynamicMusicSnapshot {
  phase: DynamicMusicPhase;
  bossEncounterActive: boolean;
  explorationIntense: boolean;
  activeTrack: MusicTrackKey | null;
}

export const DYNAMIC_MUSIC_CONFIG = {
  tracks: {
    menu: 'menu' as MusicTrackKey,
    exploration: 'gameplay' as MusicTrackKey,
    explorationIntense: 'intense' as MusicTrackKey,
    bossCombat: 'boss' as MusicTrackKey,
  },
  crossfadeSec: {
    toBossCombat: 1.25,
    toExploration: 1.8,
    toIntenseExploration: 1.6,
    toStage2: 1.0,
    toMenu: 1.0,
    toGameOver: 0.85,
  },
} as const;

type DynamicMusicListener = (snapshot: DynamicMusicSnapshot) => void;

/**
 * Dynamic Music Manager that orchestrates smooth equal-power crossfades between
 * 'Exploration' ('gameplay' / 'intense') and 'Boss Combat' ('boss') tracks
 * reactively based on active boss encounter status and game lifecycle events.
 */
class DynamicMusicManager {
  private phase: DynamicMusicPhase = 'idle';
  private bossEncounterActive: boolean = false;
  private explorationIntense: boolean = false;
  private listeners: DynamicMusicListener[] = [];
  private detachFns: Array<() => void> = [];
  private attached: boolean = false;

  public attach(): () => void {
    if (this.attached) {
      return () => this.detach();
    }
    this.attached = true;

    const unsubBoss = gameManager.onBossUpdate((boss: BossInfo | null) => {
      this.handleBossStatusUpdate(boss);
    });

    const unsubState = gameManager.onGameStateChange((state: GameScreenState) => {
      if (state === 'TITLE') {
        this.enterMenu();
      }
    });

    const unsubGameOver = gameManager.onGameOver((stats: RunStats) => {
      if (!stats.victory) {
        this.enterDefeat();
      } else {
        // On boss defeat / stage victory, ensure Boss Combat crossfades back to Exploration
        this.setBossEncounterActive(false);
      }
    });

    this.detachFns = [unsubBoss, unsubState, unsubGameOver];
    return () => this.detach();
  }

  public detach(): void {
    for (const fn of this.detachFns) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
    this.detachFns = [];
    this.attached = false;
  }

  public getSnapshot(): DynamicMusicSnapshot {
    return {
      phase: this.phase,
      bossEncounterActive: this.bossEncounterActive,
      explorationIntense: this.explorationIntense,
      activeTrack: soundManager.getCurrentTrackKey(),
    };
  }

  public subscribe(listener: DynamicMusicListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private getExplorationTrack(): MusicTrackKey {
    if (this.explorationIntense) {
      return DYNAMIC_MUSIC_CONFIG.tracks.explorationIntense;
    }
    return gameManager.getSelectedStage().music ?? DYNAMIC_MUSIC_CONFIG.tracks.exploration;
  }

  /**
   * Transitions to Menu music and clears any active boss encounter state.
   */
  public enterMenu(): void {
    const changed =
      this.phase !== 'menu' || this.bossEncounterActive || this.explorationIntense;
    this.phase = 'menu';
    this.bossEncounterActive = false;
    this.explorationIntense = false;
    soundManager.stopFireLoop();
    soundManager.clearSavedTrackOffset();
    soundManager.playMenu(DYNAMIC_MUSIC_CONFIG.crossfadeSec.toMenu);
    if (changed) this.emit();
  }

  /**
   * Enters Exploration music for a run. When `resetOffsets` is true (new run / restart),
   * resets exploration intensity and saved playback offsets so the run starts fresh.
   */
  public startRunExploration(resetOffsets: boolean = false): void {
    if (resetOffsets) {
      soundManager.clearSavedTrackOffset();
      this.bossEncounterActive = false;
      this.explorationIntense = false;
    }

    const alreadyExploringBase =
      !resetOffsets &&
      this.phase === 'exploration' &&
      !this.bossEncounterActive &&
      soundManager.getCurrentTrackKey() === this.getExplorationTrack();

    this.phase = 'exploration';
    this.bossEncounterActive = false;

    if (!alreadyExploringBase) {
      soundManager.unduckMusic(150);
      soundManager.playTrack(this.getExplorationTrack(), {
        force: resetOffsets,
        crossfadeSec: DYNAMIC_MUSIC_CONFIG.crossfadeSec.toMenu,
        resumeSavedOffset: !resetOffsets,
        rememberOutgoingOffset: !resetOffsets,
        equalPower: true,
      });
    }
    this.emit();
  }

  /**
   * Escalates Exploration music to the late-run intense track.
   * If a boss encounter is currently active, remembers the intense state so that
   * exiting Boss Combat crossfades directly into the intense Exploration track.
   */
  public setExplorationIntense(intense: boolean): void {
    if (this.explorationIntense === intense) return;
    this.explorationIntense = intense;

    if (this.phase === 'exploration' && !this.bossEncounterActive) {
      const nextTrack = this.getExplorationTrack();
      const crossfadeSec =
        soundManager.getCurrentTrackKey() === 'stage2' || nextTrack === 'stage2'
          ? DYNAMIC_MUSIC_CONFIG.crossfadeSec.toStage2
          : DYNAMIC_MUSIC_CONFIG.crossfadeSec.toIntenseExploration;
      soundManager.playTrack(nextTrack, {
        crossfadeSec,
        resumeSavedOffset: false,
        rememberOutgoingOffset: true,
        equalPower: true,
      });
    }
    this.emit();
  }

  /**
   * Crossfades smoothly between 'Exploration' and 'Boss Combat' based on
   * whether a boss encounter is active. Safe to call repeatedly (idempotent).
   */
  public setBossEncounterActive(active: boolean): void {
    // Never interrupt title menu or defeat/game-over stinger
    if (this.phase === 'menu' || this.phase === 'game_over') {
      this.bossEncounterActive = false;
      return;
    }

    if (active) {
      if (this.bossEncounterActive && this.phase === 'boss_combat') {
        return;
      }
      const fromStage2 = soundManager.getCurrentTrackKey() === 'stage2';
      this.bossEncounterActive = true;
      this.phase = 'boss_combat';
      soundManager.unduckMusic(150);
      soundManager.playTrack(DYNAMIC_MUSIC_CONFIG.tracks.bossCombat, {
        crossfadeSec: fromStage2
          ? DYNAMIC_MUSIC_CONFIG.crossfadeSec.toStage2
          : DYNAMIC_MUSIC_CONFIG.crossfadeSec.toBossCombat,
        resumeSavedOffset: false,
        rememberOutgoingOffset: true,
        equalPower: true,
      });
      this.emit();
      return;
    }

    // Returning from Boss Combat -> Exploration (resumes Exploration track seamlessly)
    if (!this.bossEncounterActive && this.phase === 'exploration') {
      return;
    }
    this.bossEncounterActive = false;
    if (this.phase === 'boss_combat') {
      this.phase = 'exploration';
      const nextTrack = this.getExplorationTrack();
      soundManager.unduckMusic(150);
      soundManager.playTrack(nextTrack, {
        crossfadeSec:
          nextTrack === 'stage2'
            ? DYNAMIC_MUSIC_CONFIG.crossfadeSec.toStage2
            : DYNAMIC_MUSIC_CONFIG.crossfadeSec.toExploration,
        resumeSavedOffset: true,
        rememberOutgoingOffset: false,
        equalPower: true,
      });
      this.emit();
    }
  }

  /**
   * Reactive bridge for GameManager boss status updates.
   */
  private handleBossStatusUpdate(boss: BossInfo | null): void {
    if (this.phase === 'menu' || this.phase === 'game_over') return;
    const isActive = Boolean(boss && boss.active && boss.currentHp > 0);
    if (isActive && this.phase === 'idle') {
      this.phase = 'exploration';
    }
    this.setBossEncounterActive(isActive);
  }

  /**
   * Locks dynamic music into defeat / game-over mode and plays the game-over stinger.
   */
  public enterDefeat(): void {
    if (this.phase === 'game_over') return;
    this.phase = 'game_over';
    this.bossEncounterActive = false;
    soundManager.stopFireLoop();
    soundManager.clearSavedTrackOffset();
    soundManager.playGameOverStinger(DYNAMIC_MUSIC_CONFIG.crossfadeSec.toGameOver);
    this.emit();
  }
}

export const dynamicMusicManager = new DynamicMusicManager();
