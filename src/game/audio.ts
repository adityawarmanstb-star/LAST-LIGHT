/**
 * Sample-based Web Audio API sound and music manager for "Last Light".
 * Uses ONLY the attached audio files (no synthesized audio).
 *
 * MUSIC (loop-ready .ogg files, no extra loop crossfade):
 * - menu -> music_menu_4ebf239b.ogg
 * - gameplay -> music_gameplay_32515426.ogg (switches to intense after 5:00)
 * - intense -> music_intense_7e7a5d7c.ogg
 * - boss -> music_boss_45df2c32.ogg
 * - stinger_gameover -> stinger_gameover_ea455e6e.ogg (plays once on death)
 * - gameover_full -> music_gameover_full_da1d4eab.ogg (plays on game-over screen)
 * Crossfades 1s between tracks.
 *
 * SFX (10 mapped events, .ogg with .mp3 fallback):
 * - hit_spark, enemy_death, level_up, boss_slam, gem_pickup,
 *   lightning, blade, player_attack, brute_stomp, boss_attack
 * Random detune +-6%, throttled to 1 per 60ms per sound, max 16 simultaneous voices.
 * Missing or failed sounds fail silently.
 */

import { saveDataStore } from './saveData';

export type MusicTrackKey =
  | 'menu'
  | 'gameplay'
  | 'intense'
  | 'boss'
  | 'stinger_gameover'
  | 'gameover_full';

export type SfxKey =
  | 'hit_spark'
  | 'enemy_death'
  | 'level_up'
  | 'boss_slam'
  | 'gem_pickup'
  | 'lightning'
  | 'blade'
  | 'player_attack'
  | 'brute_stomp'
  | 'boss_attack';

const MUSIC_ASSETS: Record<MusicTrackKey, { url: string; loop: boolean }> = {
  menu: { url: './assets/aistudio/music_menu_4ebf239b.ogg', loop: true },
  gameplay: { url: './assets/aistudio/music_gameplay_32515426.ogg', loop: true },
  intense: { url: './assets/aistudio/music_intense_7e7a5d7c.ogg', loop: true },
  boss: { url: './assets/aistudio/music_boss_45df2c32.ogg', loop: true },
  stinger_gameover: { url: './assets/aistudio/stinger_gameover_ea455e6e.ogg', loop: false },
  gameover_full: { url: './assets/aistudio/music_gameover_full_da1d4eab.ogg', loop: true },
};

const SFX_ASSETS: Record<SfxKey, string[]> = {
  hit_spark: [
    './assets/aistudio/sfx_hit_spark_f2b00c4a.ogg',
    './assets/aistudio/sfx_hit_spark_428d2bf5.mp3',
  ],
  enemy_death: [
    './assets/aistudio/sfx_enemy_death_0b385d1d.ogg',
    './assets/aistudio/sfx_enemy_death_97ebef3d.mp3',
  ],
  level_up: [
    './assets/aistudio/sfx_level_up_c4693615.ogg',
    './assets/aistudio/sfx_level_up_f5869cd9.mp3',
  ],
  boss_slam: [
    './assets/aistudio/sfx_boss_slam_b98315c3.ogg',
    './assets/aistudio/sfx_boss_slam_3d583cef.mp3',
  ],
  gem_pickup: [
    './assets/aistudio/sfx_gem_pickup_2c380ba2.ogg',
    './assets/aistudio/sfx_gem_pickup_92932dab.mp3',
  ],
  lightning: [
    './assets/aistudio/sfx_lightning_9c7cafb5.ogg',
    './assets/aistudio/sfx_lightning_d0ad84af.mp3',
  ],
  blade: [
    './assets/aistudio/sfx_blade_de0968e0.ogg',
    './assets/aistudio/sfx_blade_5758eb2a.mp3',
  ],
  player_attack: [
    './assets/aistudio/sfx_player_attack_48ed15ce.ogg',
    './assets/aistudio/sfx_player_attack_aa64bba5.mp3',
  ],
  brute_stomp: [
    './assets/aistudio/sfx_brute_stomp_eb731150.ogg',
    './assets/aistudio/sfx_brute_stomp_0b2a02d4.mp3',
  ],
  boss_attack: [
    './assets/aistudio/sfx_boss_attack_5241beeb.ogg',
    './assets/aistudio/sfx_boss_attack_cf06081d.mp3',
  ],
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private phaserSound: Phaser.Sound.BaseSoundManager | null = null;

  // Persistent Volume Settings (never overwritten by unrelated settings like brightness)
  private masterVolume: number = 0.75;
  private musicVolume: number = 0.65;
  private sfxVolume: number = 0.8;
  private isMuted: boolean = false;

  // Unlock & pause state
  private isUnlocked: boolean = false;
  private isPaused: boolean = false;

  // Decoded AudioBuffers
  private sfxBuffers: Partial<Record<SfxKey, AudioBuffer>> = {};
  private musicBuffers: Partial<Record<MusicTrackKey, AudioBuffer>> = {};
  private preloadStarted: boolean = false;

  // SFX Voice Limiter (max 16 simultaneous) & Throttler (1 per 60ms per sound)
  private activeSfxVoices: Array<{ source: AudioBufferSourceNode; gain: GainNode }> = [];
  private readonly MAX_SIMULTANEOUS_SFX = 16;
  private lastSfxTimes: Partial<Record<SfxKey, number>> = {};
  private readonly THROTTLE_MS = 60;
  private lastDeathKnellMs: number = 0;
  private lastBossSirenMs: number = 0;
  private lastBossWarningMs: number = 0;
  private lastUiClickMs: number = 0;
  private lastBloodSplashMs: number = 0;
  private uiNoiseBuffer: AudioBuffer | null = null;
  private bloodSplashNoiseBuffer: AudioBuffer | null = null;
  private bossTensionNoiseBuffer: AudioBuffer | null = null;
  private brassDriveCurve: Float32Array | null = null;

  // Music Track State (1s crossfade between tracks, loop-ready .ogg)
  private currentTrackKey: MusicTrackKey | null = null;
  private queuedTrackKey: MusicTrackKey | null = null;
  private activeMusicNodes: Array<{
    source: AudioBufferSourceNode;
    gain: GainNode;
    trackKey: MusicTrackKey;
  }> = [];
  private stingerFollowupTimer: number | null = null;
  private readonly TRACK_CROSSFADE_SEC = 1.0;

  constructor() {
    this.loadSettings();
    this.setupUnlockAndFocusListeners();
  }

  // -------------------------------------------------------------
  // Settings Persistence (Master / Music / SFX / Mute)
  // -------------------------------------------------------------
  private loadSettings() {
    const { settings } = saveDataStore.read();
    this.isMuted = settings.muted;
    this.masterVolume = settings.masterVolume;
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    saveDataStore.update((draft) => {
      draft.settings.masterVolume = this.masterVolume;
    });
    this.applyMasterGain();
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setMusicVolume(val: number) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    saveDataStore.update((draft) => {
      draft.settings.musicVolume = this.musicVolume;
    });
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setSfxVolume(val: number) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    saveDataStore.update((draft) => {
      draft.settings.sfxVolume = this.sfxVolume;
    });
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted;
    saveDataStore.update((draft) => {
      draft.settings.muted = this.isMuted;
    });
    this.applyMasterGain();
    return this.isMuted;
  }

  public toggleMute(): boolean {
    return this.setMuted(!this.isMuted);
  }

  private applyMasterGain() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
    if (this.phaserSound) {
      this.phaserSound.mute = this.isMuted;
      this.phaserSound.volume = this.masterVolume;
    }
  }

  // -------------------------------------------------------------
  // Global Phaser this.sound Bridge & Shared AudioContext
  // -------------------------------------------------------------
  public getOrCreateContext(): AudioContext | null {
    this.initCtx(false);
    return this.ctx;
  }

  public attachPhaserSound(sound: Phaser.Sound.BaseSoundManager) {
    if (!sound) return;
    this.phaserSound = sound;

    // Manage pause/resume explicitly so tab blur doesn't permanently mute audio
    sound.pauseOnBlur = false;
    sound.mute = this.isMuted;
    sound.volume = this.masterVolume;

    // Adopt Phaser's WebAudio context if ours doesn't exist yet or was closed
    const webAudioCtx = (sound as unknown as { context?: AudioContext }).context;
    if ((!this.ctx || this.ctx.state === 'closed') && webAudioCtx && webAudioCtx.state !== 'closed') {
      this.setupNodesOnContext(webAudioCtx);
    }

    if (sound.locked) {
      sound.once('unlocked', () => {
        this.onUserGesture();
      });
      this.unlockPhaserSound(sound);
    }

    if (!this.isPaused) {
      this.resumeContext();
      this.ensureMusicPlaying();
    }
  }

  public detachPhaserSound(sound?: Phaser.Sound.BaseSoundManager) {
    if (!sound || this.phaserSound === sound) {
      this.phaserSound = null;
    }
  }

  private unlockPhaserSound(sound: Phaser.Sound.BaseSoundManager | null) {
    if (!sound || !sound.locked) return;
    try {
      const unlockable = sound as unknown as { unlock?: () => void };
      unlockable.unlock?.();
    } catch {
      // ignore
    }
  }

  private setupNodesOnContext(ctx: AudioContext) {
    this.ctx = ctx;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(
      this.isMuted ? 0 : this.masterVolume,
      this.ctx.currentTime
    );
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    if (!this.preloadStarted) {
      this.preloadStarted = true;
      this.preloadAllAudio();
    }
  }

  // -------------------------------------------------------------
  // First-Tap Unlock & Tab Focus / Visibility Audio Recovery
  // -------------------------------------------------------------
  private setupUnlockAndFocusListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.onUserGesture();
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true, capture: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true, capture: true });
    window.addEventListener('keydown', unlockHandler, { passive: true, capture: true });
    window.addEventListener('click', unlockHandler, { passive: true, capture: true });

    const focusResumeHandler = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!this.isPaused) {
        this.resumeContext();
        this.ensureMusicPlaying();
      }
    };

    window.addEventListener('focus', focusResumeHandler);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', focusResumeHandler);
    }
  }

  public onUserGesture() {
    this.initCtx(true);
    this.unlockPhaserSound(this.phaserSound);
    if (!this.isPaused) {
      this.resumeContext();
    }
  }

  public handleFocusReturn() {
    if (!this.isPaused) {
      this.resumeContext();
      this.ensureMusicPlaying();
    }
  }

  private resumeContext() {
    const phaserCtx = (this.phaserSound as unknown as { context?: AudioContext } | null)?.context;
    if (phaserCtx && phaserCtx !== this.ctx && phaserCtx.state === 'suspended') {
      phaserCtx.resume().catch(() => {});
    }

    if (!this.ctx) return;

    if (this.ctx.state === 'running') {
      this.isUnlocked = true;
      this.flushQueuedTrackIfReady();
      return;
    }

    if (this.ctx.state === 'suspended' && !this.isPaused) {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx && this.ctx.state === 'running') {
            this.isUnlocked = true;
            this.flushQueuedTrackIfReady();
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }

  private flushQueuedTrackIfReady() {
    if (this.isPaused || !this.ctx || this.ctx.state !== 'running') return;

    if (this.queuedTrackKey && this.musicBuffers[this.queuedTrackKey]) {
      const track = this.queuedTrackKey;
      this.queuedTrackKey = null;
      this.playTrack(track, true);
    } else if (this.currentTrackKey && this.activeMusicNodes.length === 0) {
      const track = this.currentTrackKey;
      if (this.musicBuffers[track]) {
        this.playTrack(track, true);
      }
    }
  }

  public initCtx(fromUserGesture: boolean = false) {
    if (this.ctx && this.ctx.state === 'closed') {
      this.ctx = null;
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.activeSfxVoices = [];
      this.activeMusicNodes = [];
    }

    if (!this.ctx) {
      const phaserCtx = (this.phaserSound as unknown as { context?: AudioContext } | null)?.context;
      if (phaserCtx && phaserCtx.state !== 'closed') {
        this.setupNodesOnContext(phaserCtx);
      } else {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        this.setupNodesOnContext(new AudioContextClass());
      }
    }

    if (fromUserGesture && this.ctx && this.ctx.state === 'suspended' && !this.isPaused) {
      this.resumeContext();
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
    }
  }

  // -------------------------------------------------------------
  // Preload All Attached Audio Files (Silent on Missing)
  // -------------------------------------------------------------
  private preloadPromise: Promise<void> | null = null;

  private async decodeUrl(url: string): Promise<AudioBuffer | null> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arr = await resp.arrayBuffer();
      if (!this.ctx) return null;
      return await this.ctx.decodeAudioData(arr);
    } catch {
      return null;
    }
  }

  private async preloadAllAudio(onItemDone?: () => void): Promise<void> {
    // Load Music (.ogg)
    const musicKeys = Object.keys(MUSIC_ASSETS) as MusicTrackKey[];
    const musicPromises = musicKeys.map(async (key) => {
      try {
        if (!this.musicBuffers[key]) {
          const buffer = await this.decodeUrl(MUSIC_ASSETS[key].url);
          if (buffer) {
            this.musicBuffers[key] = buffer;
            if (
              this.queuedTrackKey === key &&
              this.ctx &&
              this.ctx.state === 'running' &&
              !this.isPaused
            ) {
              this.queuedTrackKey = null;
              this.playTrack(key, true);
            }
          }
        }
      } finally {
        onItemDone?.();
      }
    });

    // Load SFX (.ogg with .mp3 fallback)
    const sfxKeys = Object.keys(SFX_ASSETS) as SfxKey[];
    const sfxPromises = sfxKeys.map(async (key) => {
      try {
        if (!this.sfxBuffers[key]) {
          for (const url of SFX_ASSETS[key]) {
            const buffer = await this.decodeUrl(url);
            if (buffer) {
              this.sfxBuffers[key] = buffer;
              break;
            }
          }
        }
      } finally {
        onItemDone?.();
      }
    });

    await Promise.allSettled([...musicPromises, ...sfxPromises]);
  }

  public getPreloadAssetCount(): number {
    return Object.keys(MUSIC_ASSETS).length + Object.keys(SFX_ASSETS).length;
  }

  public preloadAll(onItemDone?: () => void): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    this.initCtx(false);
    if (this.preloadPromise) {
      return this.preloadPromise.then(() => {
        if (onItemDone) {
          const total = this.getPreloadAssetCount();
          for (let i = 0; i < total; i++) onItemDone();
        }
      });
    }
    this.preloadStarted = true;
    this.preloadPromise = this.preloadAllAudio(onItemDone);
    return this.preloadPromise;
  }

  // -------------------------------------------------------------
  // SFX Playback (+-6% random detune, 60ms throttle, max 16 voices)
  // -------------------------------------------------------------
  public playSfx(key: SfxKey, volumeScale: number = 1.0) {
    if (this.isMuted || this.isPaused) return;
    this.initCtx(false);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.resumeContext();
      return;
    }

    // Missing or not-yet-loaded sound fails silently
    const buffer = this.sfxBuffers[key];
    if (!buffer) return;

    // Throttle same sound to 1 per 60ms
    const nowMs = performance.now();
    const lastMs = this.lastSfxTimes[key] ?? 0;
    if (nowMs - lastMs < this.THROTTLE_MS) return;
    this.lastSfxTimes[key] = nowMs;

    // Limit to 16 simultaneous voices
    while (this.activeSfxVoices.length >= this.MAX_SIMULTANEOUS_SFX) {
      const oldest = this.activeSfxVoices.shift();
      if (oldest) {
        try {
          oldest.source.stop();
          oldest.source.disconnect();
          oldest.gain.disconnect();
        } catch {
          // ignore
        }
      }
    }

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Random detune +-6% (playbackRate in [0.94, 1.06])
      source.playbackRate.value = 1 + (Math.random() * 0.12 - 0.06);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volumeScale, this.ctx.currentTime);

      source.connect(gain);
      gain.connect(this.sfxGain);

      const voice = { source, gain };
      this.activeSfxVoices.push(voice);

      source.onended = () => {
        const idx = this.activeSfxVoices.indexOf(voice);
        if (idx !== -1) {
          this.activeSfxVoices.splice(idx, 1);
        }
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      };

      source.start(this.ctx.currentTime);
    } catch {
      // fail silently
    }
  }

  // Mapped SFX Event Methods (attached files only)
  public playHitSpark() {
    this.playSfx('hit_spark', 0.85);
  }
  public playEnemyHit(_isCritical: boolean = false) {
    this.playHitSpark();
  }
  public playHit(_isCritical: boolean = false) {
    this.playHitSpark();
  }

  public playEnemyDeath() {
    this.playSfx('enemy_death', 0.9);
  }

  public playLevelUp() {
    this.playSfx('level_up', 1.0);
  }

  public playBossSlam() {
    this.playSfx('boss_slam', 1.0);
  }
  public playExplosion() {
    this.playBossSlam();
  }

  public playGemPickup() {
    this.playSfx('gem_pickup', 0.85);
  }
  public playGemCollect() {
    this.playGemPickup();
  }
  public playCoinCollect() {
    this.playSfx('gem_pickup', 0.75);
  }

  public playLightning() {
    this.playSfx('lightning', 0.85);
  }
  public playRingPulse() {
    this.playSfx('lightning', 0.7);
  }

  public playBladeSlash() {
    this.playSfx('blade', 0.8);
  }
  public playBlade() {
    this.playBladeSlash();
  }

  public playPlayerAttack() {
    this.playSfx('player_attack', 0.65);
  }
  public playShoot() {
    this.playPlayerAttack();
  }
  public playBoltShoot() {
    this.playPlayerAttack();
  }
  public playSparkFire() {
    this.playSfx('player_attack', 0.55);
  }

  public playBruteStomp() {
    this.playSfx('brute_stomp', 0.65);
  }

  public playBossAttack() {
    this.playSfx('boss_attack', 1.0);
  }
  public playBossWarning() {
    this.playBossAttack();
    if (this.isMuted || this.isPaused) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastBossWarningMs < 500) return;
    this.initCtx(false);
    if (!this.ctx || !this.sfxGain || this.ctx.state !== 'running') return;
    this.lastBossWarningMs = nowMs;
    this.triggerBossPreWarningNodes();
  }

  public playPlayerHurt() {
    this.playSfx('hit_spark', 0.95);
  }
  public playRevival() {
    this.playSfx('level_up', 1.0);
  }

  private getBloodSplashNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (
      this.bloodSplashNoiseBuffer &&
      this.bloodSplashNoiseBuffer.sampleRate === ctx.sampleRate
    ) {
      return this.bloodSplashNoiseBuffer;
    }
    const durationSec = 0.19;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      const mainEnv = Math.exp(-t / 0.042);
      // Micro-droplet bursts give a wet splatter grain rather than flat noise
      const splatterPulse = 0.58 + 0.42 * Math.sin(t * 210 + Math.sin(t * 75) * 2.5);
      ch[i] = (Math.random() * 2 - 1) * mainEnv * splatterPulse;
    }
    this.bloodSplashNoiseBuffer = buffer;
    return buffer;
  }

  /**
   * Wet, viscous blood splash SFX scaled dynamically by monster size and crit power.
   */
  public playBloodSplash(sizeScale: number = 1.0, isCrit: boolean = false) {
    if (this.isMuted || this.isPaused) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastBloodSplashMs < 55) return;

    this.initCtx(false);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.resumeContext();
      return;
    }

    this.lastBloodSplashMs = nowMs;
    this.triggerBloodSplashNodes(sizeScale, isCrit);
  }

  private triggerBloodSplashNodes(sizeScale: number, isCrit: boolean) {
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const clampedScale = Math.max(0.65, Math.min(2.9, sizeScale));
    const pitchScale = Math.max(0.62, Math.min(1.18, 1.14 - clampedScale * 0.16));
    const detune = 0.94 + Math.random() * 0.12;
    const freqFactor = pitchScale * detune;
    const gainBoost = Math.min(1.45, 0.85 + clampedScale * 0.22 + (isCrit ? 0.16 : 0));
    const durScale = Math.min(1.45, 0.88 + clampedScale * 0.16 + (isCrit ? 0.1 : 0));

    try {
      const cleanupTargets: AudioNode[] = [];
      const noiseBuf = this.getBloodSplashNoiseBuffer(ctx);

      // 1. Heavy wet flesh impact thump (deeper on larger monsters)
      const thudOsc = ctx.createOscillator();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(165 * freqFactor, now);
      thudOsc.frequency.exponentialRampToValueAtTime(46 * freqFactor, now + 0.068 * durScale);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(0.24 * gainBoost, now + 0.005);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.075 * durScale);

      thudOsc.connect(thudGain);
      thudGain.connect(this.sfxGain);
      thudOsc.start(now);
      thudOsc.stop(now + 0.085 * durScale);
      cleanupTargets.push(thudOsc, thudGain);

      // 2. Resonant downward-swept wet squelch body
      const squelchSrc = ctx.createBufferSource();
      squelchSrc.buffer = noiseBuf;
      squelchSrc.playbackRate.value = Math.max(0.7, Math.min(1.25, freqFactor));

      const squelchFilter = ctx.createBiquadFilter();
      squelchFilter.type = 'bandpass';
      squelchFilter.Q.setValueAtTime(2.9, now);
      squelchFilter.frequency.setValueAtTime(1850 * freqFactor, now);
      squelchFilter.frequency.exponentialRampToValueAtTime(
        320 * freqFactor,
        now + 0.105 * durScale
      );

      const squelchGain = ctx.createGain();
      squelchGain.gain.setValueAtTime(0.001, now);
      squelchGain.gain.linearRampToValueAtTime(0.38 * gainBoost, now + 0.008);
      squelchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.125 * durScale);

      squelchSrc.connect(squelchFilter);
      squelchFilter.connect(squelchGain);
      squelchGain.connect(this.sfxGain);
      squelchSrc.start(now);
      squelchSrc.stop(now + 0.14 * durScale);
      cleanupTargets.push(squelchSrc, squelchFilter, squelchGain);

      // 3. Crisp crimson droplet spray high-mid splatter
      const spraySrc = ctx.createBufferSource();
      spraySrc.buffer = noiseBuf;
      spraySrc.playbackRate.value = Math.max(0.75, Math.min(1.3, freqFactor * 1.08));

      const sprayFilter = ctx.createBiquadFilter();
      sprayFilter.type = 'bandpass';
      sprayFilter.Q.setValueAtTime(1.35, now);
      sprayFilter.frequency.setValueAtTime(3200 * freqFactor, now);
      sprayFilter.frequency.exponentialRampToValueAtTime(
        1150 * freqFactor,
        now + 0.135 * durScale
      );

      const sprayGain = ctx.createGain();
      sprayGain.gain.setValueAtTime(0.001, now + 0.006);
      sprayGain.gain.linearRampToValueAtTime(0.24 * gainBoost, now + 0.018);
      sprayGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.155 * durScale);

      spraySrc.connect(sprayFilter);
      sprayFilter.connect(sprayGain);
      sprayGain.connect(this.sfxGain);
      spraySrc.start(now);
      spraySrc.stop(now + 0.175 * durScale);
      cleanupTargets.push(spraySrc, sprayFilter, sprayGain);

      // 4. Secondary splatter burst for big monsters or critical strikes
      if (isCrit || clampedScale >= 1.25) {
        const tailAt = now + 0.026;
        const tailSrc = ctx.createBufferSource();
        tailSrc.buffer = noiseBuf;
        tailSrc.playbackRate.value = Math.max(0.68, freqFactor * 0.92);

        const tailFilter = ctx.createBiquadFilter();
        tailFilter.type = 'bandpass';
        tailFilter.Q.setValueAtTime(2.2, tailAt);
        tailFilter.frequency.setValueAtTime(1450 * freqFactor, tailAt);
        tailFilter.frequency.exponentialRampToValueAtTime(420 * freqFactor, tailAt + 0.11);

        const tailGain = ctx.createGain();
        tailGain.gain.setValueAtTime(0.001, tailAt);
        tailGain.gain.linearRampToValueAtTime(0.2 * gainBoost, tailAt + 0.012);
        tailGain.gain.exponentialRampToValueAtTime(0.0008, tailAt + 0.12);

        tailSrc.connect(tailFilter);
        tailFilter.connect(tailGain);
        tailGain.connect(this.sfxGain);
        tailSrc.start(tailAt);
        tailSrc.stop(tailAt + 0.14);
        cleanupTargets.push(tailSrc, tailFilter, tailGain);
      }

      window.setTimeout(() => {
        for (const node of cleanupTargets) {
          try {
            node.disconnect();
          } catch {
            // ignore
          }
        }
      }, Math.ceil((0.22 * durScale + 0.08) * 1000));
    } catch {
      // fail silently
    }
  }
  private getUiNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.uiNoiseBuffer && this.uiNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.uiNoiseBuffer;
    }
    const len = Math.max(1, Math.floor(ctx.sampleRate * 0.04));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const env = Math.exp(-i / (ctx.sampleRate * 0.008));
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    this.uiNoiseBuffer = buffer;
    return buffer;
  }

  /**
   * Dark-fantasy forged-iron & rune stone latch click for Beranda & UI buttons.
   */
  public playUiClick() {
    if (this.isMuted) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastUiClickMs < 48) return;
    this.lastUiClickMs = nowMs;

    this.initCtx(true);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx && this.ctx.state === 'running' && !this.isMuted) {
            this.triggerUiClickNodes();
          }
        })
        .catch(() => {});
      return;
    }

    this.triggerUiClickNodes();
  }

  private triggerUiClickNodes() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const detune = 0.96 + Math.random() * 0.08;

    try {
      // 1. Crisp metallic iron latch transient
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getUiNoiseBuffer(ctx);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1650 * detune, now);
      bandpass.Q.setValueAtTime(2.6, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.24, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.04);

      // 2. Heavy dark-iron body thud
      const bodyOsc = ctx.createOscillator();
      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(245 * detune, now);
      bodyOsc.frequency.exponentialRampToValueAtTime(86 * detune, now + 0.065);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.linearRampToValueAtTime(0.26, now + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.072);

      bodyOsc.connect(bodyGain);
      bodyGain.connect(this.sfxGain);
      bodyOsc.start(now);
      bodyOsc.stop(now + 0.08);

      // 3. Subtle cold steel rune shimmer
      const pingOsc = ctx.createOscillator();
      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime(860 * detune, now);
      pingOsc.frequency.exponentialRampToValueAtTime(540 * detune, now + 0.055);

      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.075, now);
      pingGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.06);

      pingOsc.connect(pingGain);
      pingGain.connect(this.sfxGain);
      pingOsc.start(now);
      pingOsc.stop(now + 0.068);
    } catch {
      // fail silently
    }
  }

  /**
   * Deep iron-gate & ember chime SFX when pressing the main PLAY button on Beranda.
   */
  public playUiStartGame() {
    if (this.isMuted) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastUiClickMs < 48) return;
    this.lastUiClickMs = nowMs;

    this.initCtx(true);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx && this.ctx.state === 'running' && !this.isMuted) {
            this.triggerUiStartNodes();
          }
        })
        .catch(() => {});
      return;
    }

    this.triggerUiStartNodes();
  }

  private triggerUiStartNodes() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    try {
      // 1. Iron gate heavy lock transient
      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = this.getUiNoiseBuffer(ctx);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1180, now);
      bandpass.Q.setValueAtTime(1.8, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.045);

      // 2. Deep anvil / dungeon gate impact
      const impactOsc = ctx.createOscillator();
      impactOsc.type = 'triangle';
      impactOsc.frequency.setValueAtTime(155, now);
      impactOsc.frequency.exponentialRampToValueAtTime(48, now + 0.22);

      const impactGain = ctx.createGain();
      impactGain.gain.setValueAtTime(0.001, now);
      impactGain.gain.linearRampToValueAtTime(0.42, now + 0.008);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      impactOsc.connect(impactGain);
      impactGain.connect(this.sfxGain);
      impactOsc.start(now);
      impactOsc.stop(now + 0.26);

      // 3. Dark bronze fifth chord (D3 + A3 + subtle D4 shimmer)
      const notes = [
        { freq: 146.83, peak: 0.16, dur: 0.34 },
        { freq: 220.0, peak: 0.12, dur: 0.3 },
        { freq: 293.66, peak: 0.075, dur: 0.26 },
      ];
      for (const n of notes) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now);
        osc.frequency.exponentialRampToValueAtTime(n.freq * 0.992, now + n.dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(n.peak, now + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, now + n.dur);

        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + n.dur + 0.03);
      }
    } catch {
      // fail silently
    }
  }

  private getBossTensionNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (
      this.bossTensionNoiseBuffer &&
      this.bossTensionNoiseBuffer.sampleRate === ctx.sampleRate
    ) {
      return this.bossTensionNoiseBuffer;
    }
    const durationSec = 1.8;
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = Math.random() * 2 - 1;
    }
    this.bossTensionNoiseBuffer = buffer;
    return buffer;
  }

  private getBrassDriveCurve(): Float32Array<ArrayBuffer> {
    if (this.brassDriveCurve) {
      return this.brassDriveCurve as Float32Array<ArrayBuffer>;
    }
    const samples = 256;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 2.4);
    }
    this.brassDriveCurve = curve;
    return curve;
  }

  private triggerBossPreWarningNodes() {
    if (!this.ctx || !this.sfxGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const dur = 0.88;

    try {
      const cleanupTargets: AudioNode[] = [];
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.001, now);
      bus.gain.linearRampToValueAtTime(0.42, now + 0.06);
      bus.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      bus.connect(this.sfxGain);
      cleanupTargets.push(bus);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.setValueAtTime(2.6, now);
      lp.frequency.setValueAtTime(220, now);
      lp.frequency.exponentialRampToValueAtTime(1150, now + 0.42);
      lp.frequency.exponentialRampToValueAtTime(260, now + dur);
      lp.connect(bus);
      cleanupTargets.push(lp);

      // Ominous tritone pre-alert horn + sub-thud
      const freqs = [98.0, 138.59, 196.0];
      for (const f of freqs) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * 0.94, now);
        osc.frequency.exponentialRampToValueAtTime(f * 1.03, now + 0.44);
        osc.frequency.exponentialRampToValueAtTime(f * 0.88, now + dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.24, now);
        osc.connect(g);
        g.connect(lp);
        osc.start(now);
        osc.stop(now + dur + 0.05);
        cleanupTargets.push(osc, g);
      }

      const thud = ctx.createOscillator();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(92, now);
      thud.frequency.exponentialRampToValueAtTime(34, now + 0.34);
      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.001, now);
      thudGain.gain.linearRampToValueAtTime(0.45, now + 0.01);
      thudGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.38);
      thud.connect(thudGain);
      thudGain.connect(this.sfxGain);
      thud.start(now);
      thud.stop(now + 0.42);
      cleanupTargets.push(thud, thudGain);

      window.setTimeout(() => {
        for (const n of cleanupTargets) {
          try {
            n.disconnect();
          } catch {
            // ignore
          }
        }
      }, 1150);
    } catch {
      // fail silently
    }
  }

  /**
   * Plays a thrilling, heart-pounding, and ominous dark-fantasy warning siren + war-horn + heartbeat
   * sequence when a Boss spawns and wave-spawns pause.
   */
  public playBossSiren() {
    if (this.isMuted || this.isPaused) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastBossSirenMs < 1500) return;

    this.initCtx(false);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx && this.ctx.state === 'running' && !this.isMuted && !this.isPaused) {
            this.lastBossSirenMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.triggerBossSirenNodes();
          }
        })
        .catch(() => {
          // ignore
        });
      return;
    }

    this.lastBossSirenMs = nowMs;
    this.triggerBossSirenNodes();
  }

  private triggerBossSirenNodes() {
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = 2.45;

    try {
      const cleanupTargets: AudioNode[] = [];
      const stoppables: Array<OscillatorNode | AudioBufferSourceNode> = [];

      // Protective compressor/limiter keeps multi-layered impact + siren punchy without clipping
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-12, now);
      limiter.knee.setValueAtTime(14, now);
      limiter.ratio.setValueAtTime(5, now);
      limiter.attack.setValueAtTime(0.004, now);
      limiter.release.setValueAtTime(0.18, now);

      const masterOut = ctx.createGain();
      masterOut.gain.setValueAtTime(0.92, now);
      limiter.connect(masterOut);
      masterOut.connect(this.sfxGain);
      cleanupTargets.push(limiter, masterOut);

      // Cavernous echo return for colossal arena dread
      const echoDelay = ctx.createDelay(1.0);
      echoDelay.delayTime.setValueAtTime(0.23, now);
      const echoLp = ctx.createBiquadFilter();
      echoLp.type = 'lowpass';
      echoLp.frequency.setValueAtTime(920, now);
      const echoFeedback = ctx.createGain();
      echoFeedback.gain.setValueAtTime(0.3, now);
      const echoWet = ctx.createGain();
      echoWet.gain.setValueAtTime(0.34, now);

      echoDelay.connect(echoLp);
      echoLp.connect(echoWet);
      echoWet.connect(limiter);
      echoLp.connect(echoFeedback);
      echoFeedback.connect(echoDelay);
      cleanupTargets.push(echoDelay, echoLp, echoFeedback, echoWet);

      const noiseBuf = this.getBossTensionNoiseBuffer(ctx);

      // 1. Seismic Abyssal Impact Slam (synchronizes with initial camera shake at t=0)
      const impactSub = ctx.createOscillator();
      impactSub.type = 'sine';
      impactSub.frequency.setValueAtTime(122, now);
      impactSub.frequency.exponentialRampToValueAtTime(28, now + 0.45);
      const impactSubGain = ctx.createGain();
      impactSubGain.gain.setValueAtTime(0.001, now);
      impactSubGain.gain.linearRampToValueAtTime(0.68, now + 0.01);
      impactSubGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);
      impactSub.connect(impactSubGain);
      impactSubGain.connect(limiter);
      impactSub.start(now);
      impactSub.stop(now + 0.56);
      stoppables.push(impactSub);
      cleanupTargets.push(impactSub, impactSubGain);

      const impactBlast = ctx.createBufferSource();
      impactBlast.buffer = noiseBuf;
      const impactLp = ctx.createBiquadFilter();
      impactLp.type = 'lowpass';
      impactLp.frequency.setValueAtTime(320, now);
      impactLp.frequency.exponentialRampToValueAtTime(68, now + 0.36);
      const impactBlastGain = ctx.createGain();
      impactBlastGain.gain.setValueAtTime(0.001, now);
      impactBlastGain.gain.linearRampToValueAtTime(0.45, now + 0.008);
      impactBlastGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.4);
      impactBlast.connect(impactLp);
      impactLp.connect(impactBlastGain);
      impactBlastGain.connect(limiter);
      impactBlastGain.connect(echoDelay);
      impactBlast.start(now);
      impactBlast.stop(now + 0.44);
      stoppables.push(impactBlast);
      cleanupTargets.push(impactBlast, impactLp, impactBlastGain);

      // 2. Accelerating Heartbeat / War-Drum Thuds ("lub-DUB ... lub-DUB ... lub-DUB ... SLAM")
      const heartbeatSchedule: Array<{ time: number; pitch: number; gain: number }> = [
        { time: 0.04, pitch: 84, gain: 0.36 },
        { time: 0.23, pitch: 72, gain: 0.42 },
        { time: 0.62, pitch: 86, gain: 0.4 },
        { time: 0.79, pitch: 74, gain: 0.46 },
        { time: 1.16, pitch: 90, gain: 0.44 },
        { time: 1.31, pitch: 76, gain: 0.5 },
        { time: 1.66, pitch: 96, gain: 0.54 },
      ];
      for (const beat of heartbeatSchedule) {
        const t = now + beat.time;
        const drumOsc = ctx.createOscillator();
        drumOsc.type = 'triangle';
        drumOsc.frequency.setValueAtTime(beat.pitch, t);
        drumOsc.frequency.exponentialRampToValueAtTime(32, t + 0.16);

        const drumGain = ctx.createGain();
        drumGain.gain.setValueAtTime(0.001, t);
        drumGain.gain.linearRampToValueAtTime(beat.gain, t + 0.007);
        drumGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);

        drumOsc.connect(drumGain);
        drumGain.connect(limiter);
        drumGain.connect(echoDelay);
        drumOsc.start(t);
        drumOsc.stop(t + 0.21);
        stoppables.push(drumOsc);
        cleanupTargets.push(drumOsc, drumGain);
      }

      // 3. Dissonant Abyssal Brass War-Horn Choir (tritone + minor-2nd horror tension)
      const hornBus = ctx.createGain();
      hornBus.gain.setValueAtTime(0.001, now);
      hornBus.gain.linearRampToValueAtTime(0.36, now + 0.16);
      hornBus.gain.setValueAtTime(0.38, now + 1.68);
      hornBus.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      const hornDrive = ctx.createWaveShaper();
      hornDrive.curve = this.getBrassDriveCurve();
      hornDrive.oversample = '2x';

      const hornLp = ctx.createBiquadFilter();
      hornLp.type = 'lowpass';
      hornLp.Q.setValueAtTime(3.2, now);
      hornLp.frequency.setValueAtTime(220, now);
      hornLp.frequency.exponentialRampToValueAtTime(1250, now + 0.62);
      hornLp.frequency.exponentialRampToValueAtTime(440, now + 1.06);
      hornLp.frequency.exponentialRampToValueAtTime(1780, now + 1.66);
      hornLp.frequency.exponentialRampToValueAtTime(190, now + duration);

      hornDrive.connect(hornLp);
      hornLp.connect(hornBus);
      hornBus.connect(limiter);
      hornBus.connect(echoDelay);
      cleanupTargets.push(hornDrive, hornLp, hornBus);

      const hornVoices: Array<{ type: OscillatorType; baseFreq: number; gainVal: number }> = [
        { type: 'sawtooth', baseFreq: 49.0, gainVal: 0.42 }, // G1 abyssal pedal
        { type: 'sawtooth', baseFreq: 98.0, gainVal: 0.34 }, // G2 root
        { type: 'sawtooth', baseFreq: 138.59, gainVal: 0.26 }, // C#3 ominous tritone
        { type: 'triangle', baseFreq: 146.83, gainVal: 0.24 }, // D3 dissonant clash
      ];
      for (const hv of hornVoices) {
        const osc = ctx.createOscillator();
        osc.type = hv.type;
        osc.frequency.setValueAtTime(hv.baseFreq * 0.96, now);
        osc.frequency.exponentialRampToValueAtTime(hv.baseFreq * 1.04, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(hv.baseFreq * 0.98, now + 1.05);
        osc.frequency.exponentialRampToValueAtTime(hv.baseFreq * 1.07, now + 1.66);
        osc.frequency.exponentialRampToValueAtTime(hv.baseFreq * 0.82, now + duration);

        const g = ctx.createGain();
        g.gain.setValueAtTime(hv.gainVal, now);
        osc.connect(g);
        g.connect(hornDrive);
        osc.start(now);
        osc.stop(now + duration + 0.06);
        stoppables.push(osc);
        cleanupTargets.push(osc, g);
      }

      // 4. Urgent Tremolo Dread Siren (accelerating vibrato + dual rising/falling wail)
      const sirenBus = ctx.createGain();
      sirenBus.gain.setValueAtTime(0.001, now + 0.04);
      sirenBus.gain.linearRampToValueAtTime(0.32, now + 0.18);
      sirenBus.gain.setValueAtTime(0.36, now + 1.66);
      sirenBus.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      const sirenFilter = ctx.createBiquadFilter();
      sirenFilter.type = 'bandpass';
      sirenFilter.Q.setValueAtTime(2.1, now);
      sirenFilter.frequency.setValueAtTime(420, now);
      sirenFilter.frequency.exponentialRampToValueAtTime(1450, now + 0.58);
      sirenFilter.frequency.exponentialRampToValueAtTime(560, now + 1.04);
      sirenFilter.frequency.exponentialRampToValueAtTime(1850, now + 1.64);
      sirenFilter.frequency.exponentialRampToValueAtTime(320, now + duration);

      sirenFilter.connect(sirenBus);
      sirenBus.connect(limiter);
      sirenBus.connect(echoDelay);
      cleanupTargets.push(sirenFilter, sirenBus);

      // Vibrato LFO speeds up from 7.5Hz to 13.5Hz for urgent suspense
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(7.5, now);
      lfo.frequency.linearRampToValueAtTime(13.5, now + 1.66);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(12, now);
      lfoGain.gain.linearRampToValueAtTime(22, now + 1.66);
      lfo.connect(lfoGain);
      lfo.start(now);
      lfo.stop(now + duration + 0.06);
      stoppables.push(lfo);
      cleanupTargets.push(lfo, lfoGain);

      const sirenRatios = [
        { type: 'sawtooth' as OscillatorType, ratio: 1.0, gainVal: 0.45 },
        { type: 'sawtooth' as OscillatorType, ratio: 1.011, gainVal: 0.36 },
      ];
      for (const sv of sirenRatios) {
        const osc = ctx.createOscillator();
        osc.type = sv.type;
        osc.frequency.setValueAtTime(210 * sv.ratio, now);
        osc.frequency.exponentialRampToValueAtTime(495 * sv.ratio, now + 0.58);
        osc.frequency.exponentialRampToValueAtTime(240 * sv.ratio, now + 1.04);
        osc.frequency.exponentialRampToValueAtTime(615 * sv.ratio, now + 1.64);
        osc.frequency.exponentialRampToValueAtTime(145 * sv.ratio, now + duration);

        lfoGain.connect(osc.frequency);

        const g = ctx.createGain();
        g.gain.setValueAtTime(sv.gainVal, now);
        osc.connect(g);
        g.connect(sirenFilter);
        osc.start(now);
        osc.stop(now + duration + 0.06);
        stoppables.push(osc);
        cleanupTargets.push(osc, g);
      }

      // 5. High Metallic Tension Riser culminating at the 1.65s siren climax
      const riserSrc = ctx.createBufferSource();
      riserSrc.buffer = noiseBuf;
      riserSrc.loop = true;

      const riserBp = ctx.createBiquadFilter();
      riserBp.type = 'bandpass';
      riserBp.Q.setValueAtTime(5.5, now);
      riserBp.frequency.setValueAtTime(850, now);
      riserBp.frequency.exponentialRampToValueAtTime(3600, now + 1.64);
      riserBp.frequency.exponentialRampToValueAtTime(650, now + duration);

      const riserGain = ctx.createGain();
      riserGain.gain.setValueAtTime(0.001, now + 0.12);
      riserGain.gain.exponentialRampToValueAtTime(0.16, now + 1.62);
      riserGain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      riserSrc.connect(riserBp);
      riserBp.connect(riserGain);
      riserGain.connect(limiter);
      riserGain.connect(echoDelay);
      riserSrc.start(now);
      riserSrc.stop(now + duration + 0.05);
      stoppables.push(riserSrc);
      cleanupTargets.push(riserSrc, riserBp, riserGain);

      window.setTimeout(() => {
        for (const s of stoppables) {
          try {
            s.disconnect();
          } catch {
            // ignore
          }
        }
        for (const node of cleanupTargets) {
          try {
            node.disconnect();
          } catch {
            // ignore
          }
        }
      }, Math.ceil((duration + 0.75) * 1000));
    } catch {
      // fail silently
    }
  }

  /**
   * Plays a unique, haunting synthesized 'Death Knell' funeral bell + dark void tail
   * through the Web Audio SFX bus when the player's HP reaches zero and Game Over transitions in.
   */
  public playDeathKnell() {
    if (this.isMuted || this.isPaused) return;

    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastDeathKnellMs < 1500) return;

    this.initCtx(false);
    if (!this.ctx || !this.sfxGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx && this.ctx.state === 'running' && !this.isMuted && !this.isPaused) {
            this.lastDeathKnellMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
            this.triggerDeathKnellNodes();
          }
        })
        .catch(() => {
          // ignore
        });
      return;
    }

    this.lastDeathKnellMs = nowMs;
    this.triggerDeathKnellNodes();
  }

  private triggerDeathKnellNodes() {
    if (!this.ctx || !this.sfxGain) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const totalDuration = 3.6;

    try {
      const cleanupTargets: AudioNode[] = [];
      const stoppables: Array<OscillatorNode | AudioBufferSourceNode> = [];

      // Master bus for this knell with gentle headroom so layered partials never clip
      const knellBus = ctx.createGain();
      knellBus.gain.setValueAtTime(0.78, now);
      knellBus.connect(this.sfxGain);
      cleanupTargets.push(knellBus);

      // Subtle cavernous echo return (low-passed slap & tail)
      const echoDelay = ctx.createDelay(1.0);
      echoDelay.delayTime.setValueAtTime(0.27, now);
      const echoFilter = ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.setValueAtTime(520, now);
      const echoFeedback = ctx.createGain();
      echoFeedback.gain.setValueAtTime(0.32, now);
      const echoWet = ctx.createGain();
      echoWet.gain.setValueAtTime(0.42, now);

      knellBus.connect(echoDelay);
      echoDelay.connect(echoFilter);
      echoFilter.connect(echoWet);
      echoWet.connect(this.sfxGain);
      echoFilter.connect(echoFeedback);
      echoFeedback.connect(echoDelay);
      cleanupTargets.push(echoDelay, echoFilter, echoFeedback, echoWet);

      // 1. Heavy Cast-Iron Bell Strike Transient (filtered noise clapper)
      const noiseLength = Math.floor(ctx.sampleRate * 0.14);
      const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLength; i++) {
        const env = Math.exp(-i / (ctx.sampleRate * 0.025));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const strikeNoise = ctx.createBufferSource();
      strikeNoise.buffer = noiseBuffer;

      const strikeFilter = ctx.createBiquadFilter();
      strikeFilter.type = 'bandpass';
      strikeFilter.frequency.setValueAtTime(620, now);
      strikeFilter.Q.setValueAtTime(2.2, now);

      const strikeGain = ctx.createGain();
      strikeGain.gain.setValueAtTime(0.55, now);
      strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      strikeNoise.connect(strikeFilter);
      strikeFilter.connect(strikeGain);
      strikeGain.connect(knellBus);
      strikeNoise.start(now);
      strikeNoise.stop(now + 0.15);
      cleanupTargets.push(strikeNoise, strikeFilter, strikeGain);

      // 2. Sub-bass impact thud (96 Hz -> 34 Hz drop)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(96, now);
      subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.5, now + 0.012);
      subGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);

      subOsc.connect(subGain);
      subGain.connect(knellBus);
      subOsc.start(now);
      subOsc.stop(now + 1.0);
      stoppables.push(subOsc);
      cleanupTargets.push(subOsc, subGain);

      // 3. Haunted Bronze Bell Inharmonic Partials (low D minor + eerie tritone Ab3)
      const bellPartials: Array<{
        freq: number;
        type: OscillatorType;
        peakGain: number;
        decay: number;
        delayOffset?: number;
      }> = [
        { freq: 73.42, type: 'sine', peakGain: 0.42, decay: 3.35 }, // D2 Hum fundamental
        { freq: 146.83, type: 'sine', peakGain: 0.28, decay: 2.75 }, // D3 Prime
        { freq: 147.95, type: 'sine', peakGain: 0.16, decay: 2.45 }, // Detuned beating pair
        { freq: 174.61, type: 'sine', peakGain: 0.2, decay: 2.25 }, // F3 Minor third
        { freq: 207.65, type: 'triangle', peakGain: 0.13, decay: 1.95 }, // Ab3 Haunted tritone
        { freq: 293.66, type: 'sine', peakGain: 0.1, decay: 1.45 }, // D4 Octave shimmer
        { freq: 415.3, type: 'sine', peakGain: 0.06, decay: 0.95 }, // Ab4 Metallic ring
        { freq: 73.42, type: 'sine', peakGain: 0.14, decay: 2.5, delayOffset: 0.62 }, // Faint second phantom resonance
      ];

      for (const p of bellPartials) {
        const startAt = now + (p.delayOffset ?? 0);
        const osc = ctx.createOscillator();
        osc.type = p.type;
        osc.frequency.setValueAtTime(p.freq, startAt);
        // Subtle cold pitch sag as the bell rings into the dark
        osc.frequency.exponentialRampToValueAtTime(p.freq * 0.988, startAt + p.decay);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, startAt);
        g.gain.linearRampToValueAtTime(p.peakGain, startAt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0005, startAt + p.decay);

        osc.connect(g);
        g.connect(knellBus);
        osc.start(startAt);
        osc.stop(startAt + p.decay + 0.05);
        stoppables.push(osc);
        cleanupTargets.push(osc, g);
      }

      // 4. Descending Cold Void Choir / Drone Tail
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.Q.setValueAtTime(3.2, now);
      droneFilter.frequency.setValueAtTime(540, now + 0.08);
      droneFilter.frequency.exponentialRampToValueAtTime(115, now + 3.15);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.14, now + 0.28);
      droneGain.gain.exponentialRampToValueAtTime(0.0005, now + 3.25);

      droneFilter.connect(droneGain);
      droneGain.connect(knellBus);
      cleanupTargets.push(droneFilter, droneGain);

      for (const baseFreq of [110.0, 103.83]) {
        const droneOsc = ctx.createOscillator();
        droneOsc.type = 'sawtooth';
        droneOsc.frequency.setValueAtTime(baseFreq, now + 0.05);
        droneOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.92, now + 3.2);
        droneOsc.connect(droneFilter);
        droneOsc.start(now + 0.05);
        droneOsc.stop(now + 3.3);
        stoppables.push(droneOsc);
        cleanupTargets.push(droneOsc);
      }

      // Schedule node cleanup once the decay and echo tail conclude
      window.setTimeout(() => {
        for (const s of stoppables) {
          try {
            s.disconnect();
          } catch {
            // ignore
          }
        }
        for (const node of cleanupTargets) {
          try {
            node.disconnect();
          } catch {
            // ignore
          }
        }
      }, Math.ceil((totalDuration + 0.6) * 1000));
    } catch {
      // fail silently
    }
  }

  public playGameOver() {
    this.playDeathKnell();
  }

  // -------------------------------------------------------------
  // Music Playback (1s crossfade between tracks, native loop)
  // -------------------------------------------------------------
  private clearStingerTimer() {
    if (this.stingerFollowupTimer !== null) {
      window.clearTimeout(this.stingerFollowupTimer);
      this.stingerFollowupTimer = null;
    }
  }

  public ensureMusicPlaying() {
    if (this.isPaused) return;
    this.initCtx(false);
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.resumeContext();
      return;
    }

    if (this.queuedTrackKey && this.musicBuffers[this.queuedTrackKey]) {
      const next = this.queuedTrackKey;
      this.queuedTrackKey = null;
      this.playTrack(next, true);
      return;
    }

    if (this.currentTrackKey && this.activeMusicNodes.length === 0 && this.musicBuffers[this.currentTrackKey]) {
      this.playTrack(this.currentTrackKey, true);
    }
  }

  public playTrack(trackKey: MusicTrackKey, force: boolean = false) {
    if (
      this.currentTrackKey === trackKey &&
      !force &&
      (this.activeMusicNodes.length > 0 || this.queuedTrackKey === trackKey)
    ) {
      return;
    }

    this.clearStingerTimer();
    this.initCtx(false);

    if (!this.ctx || !this.musicGain) {
      this.queuedTrackKey = trackKey;
      return;
    }

    // Do NOT call source.start() while AudioContext is suspended; queue it so resumeContext() starts it cleanly
    if (this.ctx.state !== 'running') {
      this.queuedTrackKey = trackKey;
      this.currentTrackKey = trackKey;
      if (!this.isPaused) {
        this.resumeContext();
      }
      return;
    }

    const buffer = this.musicBuffers[trackKey];
    if (!buffer) {
      // Queue until buffer finishes loading (fails silently if file is missing)
      this.queuedTrackKey = trackKey;
      this.currentTrackKey = trackKey;
      return;
    }

    this.queuedTrackKey = null;
    this.currentTrackKey = trackKey;

    const now = this.ctx.currentTime;
    const crossfade = this.TRACK_CROSSFADE_SEC;

    // Fade out existing active music tracks over 1s
    const oldNodes = [...this.activeMusicNodes];
    this.activeMusicNodes = [];

    for (const node of oldNodes) {
      try {
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0.0001, now + crossfade);
        node.source.stop(now + crossfade + 0.05);
      } catch {
        // ignore
      }
    }

    try {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = MUSIC_ASSETS[trackKey].loop;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(1.0, now + crossfade);

      source.connect(gain);
      gain.connect(this.musicGain);

      const entry = { source, gain, trackKey };
      this.activeMusicNodes.push(entry);

      source.onended = () => {
        const idx = this.activeMusicNodes.indexOf(entry);
        if (idx !== -1) {
          this.activeMusicNodes.splice(idx, 1);
        }
        try {
          source.disconnect();
          gain.disconnect();
        } catch {
          // ignore
        }
      };

      source.start(now);
      console.log(`music started: ${trackKey}`);

      // If this is the one-shot stinger_gameover, transition to music_gameover_full when done
      if (trackKey === 'stinger_gameover') {
        const leadOutMs = Math.max(250, (buffer.duration - crossfade) * 1000);
        this.stingerFollowupTimer = window.setTimeout(() => {
          if (this.currentTrackKey === 'stinger_gameover') {
            this.playGameOverFull();
          }
        }, leadOutMs);
      }
    } catch {
      // fail silently
    }
  }

  public playMenu() {
    this.playTrack('menu');
  }

  public playGameplay() {
    this.playTrack('gameplay');
  }

  public playIntense() {
    this.playTrack('intense');
  }

  public playBoss() {
    this.playTrack('boss');
  }

  public playGameOverStinger() {
    this.playTrack('stinger_gameover', true);
  }

  public playGameOverFull() {
    this.playTrack('gameover_full');
  }

  // Backward-compatible aliases
  public startBgm() {
    this.playGameplay();
  }

  public playGameOverMusic() {
    this.playGameOverStinger();
  }

  public stopBgm() {
    this.clearStingerTimer();
    this.queuedTrackKey = null;
    this.currentTrackKey = null;
    if (!this.ctx || this.ctx.state === 'closed') return;

    const now = this.ctx.currentTime;
    const nodes = [...this.activeMusicNodes];
    this.activeMusicNodes = [];
    for (const node of nodes) {
      try {
        node.gain.gain.cancelScheduledValues(now);
        node.gain.gain.setValueAtTime(node.gain.gain.value, now);
        node.gain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
        node.source.stop(now + 0.55);
      } catch {
        // ignore
      }
    }
  }

  // -------------------------------------------------------------
  // Pause / Resume Audio with Game Pause
  // -------------------------------------------------------------
  public pauseAudio() {
    this.isPaused = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resumeAudio() {
    this.isPaused = false;
    this.initCtx(true);
    this.unlockPhaserSound(this.phaserSound);
    this.resumeContext();
    this.ensureMusicPlaying();
  }
}

export const soundManager = new AudioManager();
