import Phaser from 'phaser';
import { AudioScene } from './scenes/AudioScene';
import { MainScene } from './scenes/MainScene';
import { DarknessScene } from './scenes/DarknessScene';
import { UIScene } from './scenes/UIScene';
import { gameManager } from './GameManager';
import { soundManager } from './audio';
import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  getWebGlMaxTextureSize,
  performanceRuntime,
  resolveRenderScale,
} from './PerformanceEngine';

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
  const gfx = gameManager.getGraphicsConfig();
  const initialScale = resolveRenderScale(gfx.resolutionMode, 4096);
  performanceRuntime.currentConfig = { ...gfx };
  performanceRuntime.currentRenderScale = initialScale;

  const bufferW = Math.round(LOGICAL_WIDTH * initialScale);
  const bufferH = Math.round(LOGICAL_HEIGHT * initialScale);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentContainerId,
    width: bufferW,
    height: bufferH,
    backgroundColor: '#08090d',
    fps: {
      target: gfx.targetFps,
      min: 30,
      smoothStep: false,
      deltaHistory: 0,
    },
    render: {
      powerPreference: 'high-performance',
      antialias: true,
      antialiasGL: false,
      roundPixels: false,
      pixelArt: false,
      transparent: false,
      stencil: false,
      batchSize: 4096,
      maxTextures: -1,
      autoMobileTextures: false,
      mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
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
        fps: 120,
        fixedStep: false,
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: bufferW,
      height: bufferH,
    },
    // Persistent AudioScene -> MainScene (bottom) -> DarknessScene (middle) -> UIScene (top)
    scene: [AudioScene, MainScene, DarknessScene, UIScene],
  };

  const game = new Phaser.Game(config);
  gameManager.phaserGame = game;

  game.events.once(Phaser.Core.Events.READY, () => {
    const maxTex = getWebGlMaxTextureSize(game);
    const verifiedScale = resolveRenderScale(gfx.resolutionMode, maxTex);
    if (Math.abs(verifiedScale - performanceRuntime.currentRenderScale) > 0.01) {
      performanceRuntime.currentRenderScale = verifiedScale;
      game.scale.setGameSize(
        Math.round(LOGICAL_WIDTH * verifiedScale),
        Math.round(LOGICAL_HEIGHT * verifiedScale)
      );
    }
    performanceRuntime.setTargetFpsOnGame(game, gfx.targetFps);
  });

  // Start AudioScene and MainScene; MainScene.create() launches DarknessScene then UIScene and enforces bringToTop('UIScene')
  game.scene.start('AudioScene');
  game.scene.start('MainScene');

  return game;
}
