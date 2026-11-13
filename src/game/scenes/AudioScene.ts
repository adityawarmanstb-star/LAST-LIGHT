import Phaser from 'phaser';
import { soundManager } from '../audio';

/**
 * Persistent background Audio Scene that owns global Phaser this.sound integration
 * and is never shut down or restarted by MainScene, DarknessScene, or UIScene.
 * If restarted, it re-attaches this.sound and ensures music keeps playing.
 */
export class AudioScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AudioScene' });
  }

  create() {
    this.input.enabled = false;

    // Bind global Phaser this.sound to persistent soundManager and restart/resume music if needed
    soundManager.attachPhaserSound(this.sound);
    soundManager.ensureMusicPlaying();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      soundManager.detachPhaserSound(this.sound);
    });
  }
}
