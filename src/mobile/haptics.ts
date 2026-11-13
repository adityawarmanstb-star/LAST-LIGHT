import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type HapticPulseStyle = 'light' | 'medium' | 'heavy' | 'selection';

const HAPTICS_STORAGE_KEY = 'last_light_haptics_enabled';
const MIN_PULSE_INTERVAL_MS = 25;

const PULSE_DURATION_MS: Record<HapticPulseStyle, number> = {
  selection: 10,
  light: 14,
  medium: 22,
  heavy: 32,
};

function isAndroidPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  if (Capacitor.getPlatform() === 'android') return true;
  if (typeof navigator !== 'undefined') {
    return /android/i.test(navigator.userAgent);
  }
  return false;
}

class HapticFeedbackManager {
  private enabled: boolean;
  private lastTriggerAtMs = 0;

  constructor() {
    this.enabled = this.loadEnabledState();
  }

  private loadEnabledState(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return true;
      const saved = window.localStorage.getItem(HAPTICS_STORAGE_KEY);
      if (saved === null) return true;
      return saved === 'true';
    } catch {
      return true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(HAPTICS_STORAGE_KEY, String(next));
      }
    } catch {
      // Ignore storage failures
    }
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
   * Triggers a short tactile vibration pulse on Android devices.
   * Safe no-op on desktop/non-Android environments or when disabled.
   */
  public tap(style: HapticPulseStyle = 'light'): void {
    if (!this.enabled || !isAndroidPlatform()) {
      return;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastTriggerAtMs < MIN_PULSE_INTERVAL_MS) {
      return;
    }
    this.lastTriggerAtMs = now;

    const durationMs = PULSE_DURATION_MS[style];

    if (Capacitor.isNativePlatform()) {
      void this.triggerNativePulse(style, durationMs);
      return;
    }

    this.triggerWebVibrate(durationMs);
  }

  private async triggerNativePulse(style: HapticPulseStyle, durationMs: number): Promise<void> {
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
        await Haptics.vibrate({ duration: durationMs });
      } catch {
        this.triggerWebVibrate(durationMs);
      }
    }
  }

  private triggerWebVibrate(durationMs: number): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(durationMs);
      }
    } catch {
      // Silently ignore if vibration is blocked or unsupported
    }
  }
}

export const haptics = new HapticFeedbackManager();

export function triggerUiHaptic(style: HapticPulseStyle = 'light'): void {
  haptics.tap(style);
}
