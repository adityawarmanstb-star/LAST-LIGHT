import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { saveDataStore } from '../game/saveData';

export type HapticPulseStyle = 'light' | 'medium' | 'heavy' | 'selection';

const MIN_PULSE_INTERVAL_MS = 25;

class HapticFeedbackManager {
  private enabled: boolean;
  private lastTriggerAtMs = 0;

  constructor() {
    this.enabled = saveDataStore.read().settings.hapticsEnabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    saveDataStore.update((draft) => {
      draft.settings.hapticsEnabled = next;
    });
  }

  public toggle(): boolean {
    const next = !this.enabled;
    this.setEnabled(next);
    if (next) {
      this.tap('light');
    }
    return next;
  }

  /**
   * Triggers a short tactile vibration pulse using @capacitor/haptics on native mobile.
   * Strict no-op in browsers or when disabled.
   */
  public tap(style: HapticPulseStyle = 'light'): void {
    if (!this.enabled || !Capacitor.isNativePlatform()) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastTriggerAtMs < MIN_PULSE_INTERVAL_MS) {
      return;
    }
    this.lastTriggerAtMs = now;

    void this.triggerNativePulse(style);
  }

  /**
   * Haptic feedback pulse when the player takes damage.
   */
  public onPlayerHit(): void {
    this.tap('medium');
  }

  /**
   * Haptic feedback pulse when the player levels up.
   */
  public onLevelUp(): void {
    if (!this.enabled || !Capacitor.isNativePlatform()) {
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastTriggerAtMs < MIN_PULSE_INTERVAL_MS) {
      return;
    }
    this.lastTriggerAtMs = now;

    void Haptics.notification({ type: NotificationType.Success }).catch(() => {
      void this.triggerNativePulse('heavy');
    });
  }

  /**
   * Haptic feedback pulse when a daily mission requirement is met.
   */
  public onMissionComplete(): void {
    if (!this.enabled || !Capacitor.isNativePlatform()) {
      return;
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastTriggerAtMs < MIN_PULSE_INTERVAL_MS) {
      return;
    }
    this.lastTriggerAtMs = now;

    void Haptics.notification({ type: NotificationType.Success }).catch(() => {
      void this.triggerNativePulse('heavy');
    });
  }

  private async triggerNativePulse(style: HapticPulseStyle): Promise<void> {
    try {
      if (style === 'selection') {
        await Haptics.selectionChanged();
      } else {
        const impactStyle =
          style === 'heavy'
            ? ImpactStyle.Heavy
            : style === 'medium'
              ? ImpactStyle.Medium
              : ImpactStyle.Light;
        await Haptics.impact({ style: impactStyle });
      }
    } catch {
      try {
        await Haptics.vibrate({ duration: style === 'heavy' ? 30 : style === 'medium' ? 20 : 12 });
      } catch {
        // Silently ignore if unavailable
      }
    }
  }
}

export const haptics = new HapticFeedbackManager();

export function triggerUiHaptic(style: HapticPulseStyle = 'light'): void {
  haptics.tap(style);
}
