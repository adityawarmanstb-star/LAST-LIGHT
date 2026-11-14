import Phaser from 'phaser';
import { gameManager } from '../GameManager';
import { soundManager } from '../audio';
import { LOGICAL_WIDTH, performanceRuntime, syncLogicalCamera } from '../PerformanceEngine';

/**
 * Dedicated top-most Phaser UI scene preserving logical camera alignment and
 * touch audio-context unlock without rendering duplicate canvas buttons over React HUD.
 */
export class UIScene extends Phaser.Scene {
  private resizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null;
  private pointerDownHandler: (() => void) | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    gameManager.activeUiScene = this;

    // UI scene stays on top of DarknessScene and MainScene and unlocks WebAudio on canvas touch
    this.input.enabled = true;
    this.input.topOnly = true;
    this.scene.bringToTop('UIScene');

    const activeScale =
      Math.max(1, this.scale.width / LOGICAL_WIDTH) || performanceRuntime.currentRenderScale;
    syncLogicalCamera(this.cameras.main, activeScale, true);

    this.pointerDownHandler = () => {
      soundManager.onUserGesture();
    };
    this.input.on('pointerdown', this.pointerDownHandler);

    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      const nextScale = Math.max(1, gameSize.width / LOGICAL_WIDTH);
      syncLogicalCamera(this.cameras.main, nextScale, true);
    };
    this.scale.on('resize', this.resizeHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.pointerDownHandler) {
        this.input.off('pointerdown', this.pointerDownHandler);
        this.pointerDownHandler = null;
      }
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
        this.resizeHandler = null;
      }
      if (gameManager.activeUiScene === this) {
        gameManager.activeUiScene = null;
      }
    });
  }
}
