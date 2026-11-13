import Phaser from 'phaser';
import { AudioScene } from './scenes/AudioScene';
import { MainScene } from './scenes/MainScene';
import { DarknessScene } from './scenes/DarknessScene';
import { UIScene } from './scenes/UIScene';
import { gameManager } from './GameManager';
import { soundManager } from './audio';

export const MAX_DEVICE_PIXEL_RATIO = 2;

export function getCappedDpr(): number {
  return Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, MAX_DEVICE_PIXEL_RATIO);
}

export function createPhaserGame(parentContainerId: string): Phaser.Game {
  // If an existing game instance is running, destroy it first cleanly
  if (gameManager.phaserGame) {
    gameManager.phaserGame.destroy(true);
    gameManager.phaserGame = null;
    // WebAudioSoundManager.destroy() suspends a shared context; resume it immediately for the new run
    soundManager.resumeAudio();
  }

  const sharedCtx = soundManager.getOrCreateContext();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentContainerId,
    width: 540,
    height: 960,
    backgroundColor: '#08090d',
    fps: {
      target: 60,
      min: 30,
      smoothStep: true,
    },
    render: {
      powerPreference: 'high-performance',
      antialias: false,
      antialiasGL: false,
      roundPixels: true,
      transparent: false,
      stencil: false,
      batchSize: 4096,
      mipmapRegeneration: false,
      desynchronized: true,
    },
    audio: sharedCtx ? { context: sharedCtx } : undefined,
    loader: {
      imageLoadType: 'HTMLImageElement',
      maxRetries: 2,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 540,
      height: 960,
    },
    // Persistent AudioScene -> MainScene (bottom) -> DarknessScene (middle) -> UIScene (top)
    scene: [AudioScene, MainScene, DarknessScene, UIScene],
  };

  const game = new Phaser.Game(config);
  gameManager.phaserGame = game;

  // Start AudioScene and MainScene; MainScene.create() launches DarknessScene then UIScene and enforces bringToTop('UIScene')
  game.scene.start('AudioScene');
  game.scene.start('MainScene');

  return game;
}
