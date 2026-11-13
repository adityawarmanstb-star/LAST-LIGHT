import Phaser from 'phaser';
import { gameManager } from '../GameManager';
import { soundManager } from '../audio';
import { haptics } from '../../mobile/haptics';
import {
  BLOOD_IRON_HEX,
  ForgedFrameSpec,
  createForgedFrameSpec,
  drawForgedIronPhaserFrame,
} from '../ui/forgedIronPhaser';

/**
 * Dedicated UI Scene running in parallel on top of MainScene and DarknessScene.
 * Its camera is fixed (0, 0, zoom 1.0) and completely unaffected by MainScene
 * camera follow, shake, zoom, or world scroll.
 */
export class UIScene extends Phaser.Scene {
  private pauseBtn!: Phaser.GameObjects.Container;
  private btnBg!: Phaser.GameObjects.Graphics;
  private iconGraphics!: Phaser.GameObjects.Graphics;
  private frameSpec!: ForgedFrameSpec;
  private isHovered: boolean = false;
  private isPressed: boolean = false;
  private elapsedSec: number = 0;
  private lastDripRedrawMs: number = 0;
  private unsubPauseState: (() => void) | null = null;
  private resizeHandler: ((gameSize: Phaser.Structs.Size) => void) | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  private getSafeInsets(): { top: number; right: number } {
    try {
      const styles = getComputedStyle(document.documentElement);
      const top = parseFloat(styles.getPropertyValue('--sat')) || 0;
      const right = parseFloat(styles.getPropertyValue('--sar')) || 0;
      return { top, right };
    } catch {
      return { top: 0, right: 0 };
    }
  }

  private getPausePosition(width: number): { x: number; y: number } {
    const { top, right } = this.getSafeInsets();
    const padRight = Math.max(16, right);
    const padTop = Math.max(16, top) + 8; // below thin top XP bar
    return {
      x: width - padRight - 28,
      y: padTop + 28,
    };
  }

  create() {
    gameManager.activeUiScene = this;

    // UI scene always receives input first and stays on top of DarknessScene and MainScene
    this.input.enabled = true;
    this.input.topOnly = true;
    this.scene.bringToTop('UIScene');

    // Camera ignores all world scroll/zoom from MainScene
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1);

    this.frameSpec = createForgedFrameSpec('ui_pause_plate', {
      dripCount: 2,
      maxDripLength: 14,
      scratchCount: 4,
      stainCount: 2,
    });
    this.isHovered = false;
    this.isPressed = false;
    this.elapsedSec = 0;
    this.lastDripRedrawMs = 0;

    // 56x56 pause button positioned top-right respecting safe-area insets
    const pos = this.getPausePosition(this.scale.width);
    this.pauseBtn = this.add.container(pos.x, pos.y);
    this.pauseBtn.setSize(68, 68);

    // Visual forged-iron button background (56x56 drawn with Phaser Graphics)
    this.btnBg = this.add.graphics();
    this.btnBg.disableInteractive();
    this.drawButtonBg();
    this.pauseBtn.add(this.btnBg);

    // Icon (Pause bars || or Play triangle >)
    this.iconGraphics = this.add.graphics();
    this.iconGraphics.disableInteractive();
    this.drawIcon(false);
    this.pauseBtn.add(this.iconGraphics);

    // Explicit rectangle hit area >= 64x64 px (Container displayOrigin is 34,34 after setSize(68, 68))
    this.pauseBtn.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, 68, 68),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    // Set depth above every other object, including effects, HUD, and virtual joystick
    this.pauseBtn.setDepth(10000);

    this.pauseBtn.on('pointerover', () => {
      this.isHovered = true;
      this.drawButtonBg();
    });

    // Forged-iron press feedback: scale 0.96 & blood-red glowing border
    this.pauseBtn.on('pointerdown', () => {
      console.log('pause pressed');
      soundManager.onUserGesture();
      haptics.tap('medium');
      this.isPressed = true;
      this.pauseBtn.setScale(0.96);
      this.drawButtonBg();
      gameManager.emitTogglePause();
    });

    this.pauseBtn.on('pointerup', () => {
      this.isPressed = false;
      this.pauseBtn.setScale(1.0);
      this.drawButtonBg();
    });

    this.pauseBtn.on('pointerout', () => {
      this.isHovered = false;
      this.isPressed = false;
      this.pauseBtn.setScale(1.0);
      this.drawButtonBg();
    });

    // Ensure AudioContext/sound unlocks on first pointerdown anywhere on canvas
    this.input.on('pointerdown', () => {
      soundManager.onUserGesture();
    });

    // Sync button visual state with GameManager pause updates
    this.unsubPauseState = gameManager.onPauseState((paused) => {
      this.drawIcon(paused);
    });

    // Handle responsive window resize
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      if (this.pauseBtn) {
        const nextPos = this.getPausePosition(gameSize.width);
        this.pauseBtn.setPosition(nextPos.x, nextPos.y);
      }
    };
    this.scale.on('resize', this.resizeHandler);

    // Cleanup on scene shutdown
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.unsubPauseState) {
        this.unsubPauseState();
        this.unsubPauseState = null;
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

  update(_time: number, delta: number) {
    this.elapsedSec += Math.min(delta, 100) * 0.001;
    // Redraw slow lengthening blood drips cleanly every ~120ms
    if (_time - this.lastDripRedrawMs >= 120) {
      this.lastDripRedrawMs = _time;
      this.drawButtonBg();
    }
  }

  private drawButtonBg() {
    drawForgedIronPhaserFrame(this.btnBg, -28, -28, 56, 56, this.frameSpec, this.elapsedSec, {
      radius: 10,
      hovered: this.isHovered,
      pressed: this.isPressed,
      fillAlpha: 0.94,
    });
  }

  private drawIcon(isPaused: boolean) {
    this.iconGraphics.clear();
    if (!isPaused) {
      // Crisp bone-colored pause bars with dark iron drop shadow
      this.iconGraphics.fillStyle(0x07080a, 0.8);
      this.iconGraphics.fillRoundedRect(-7, -8, 5, 18, 2);
      this.iconGraphics.fillRoundedRect(4, -8, 5, 18, 2);

      this.iconGraphics.fillStyle(BLOOD_IRON_HEX.bone, 1);
      this.iconGraphics.fillRoundedRect(-8, -9, 5, 18, 2);
      this.iconGraphics.fillRoundedRect(3, -9, 5, 18, 2);
    } else {
      // Fresh blood / bone play triangle when paused
      this.iconGraphics.fillStyle(0x07080a, 0.8);
      this.iconGraphics.fillTriangle(-5, -9, 11, 1, -5, 11);

      this.iconGraphics.fillStyle(BLOOD_IRON_HEX.bloodGlow, 1);
      this.iconGraphics.fillTriangle(-6, -10, 10, 0, -6, 10);
    }
  }
}
