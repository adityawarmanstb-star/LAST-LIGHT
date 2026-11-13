import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type HapticPulseStyle = 'light' | 'medium' | 'heavy' | 'selection';

const HAPTICS_ENABLED_STORAGE_KEY = 'last_light_haptics_enabled';
const HAPTICS_DURATION_STORAGE_KEY = 'last_light_haptics_duration_ms';
const MIN_PULSE_INTERVAL_MS = 25;

export const HAPTIC_DURATION_MIN_MS = 5;
export const HAPTIC_DURATION_MAX_MS = 50;
export const HAPTIC_DURATION_DEFAULT_MS = 16;

const STYLE_MULTIPLIER: Record<HapticPulseStyle, number> = {
  selection: 0.7,
  light: 1.0,
  medium: 1.35,
  heavy: 1.75,
};

function clampDurationMs(value: number): number {
  if (!Number.isFinite(value)) return HAPTIC_DURATION_DEFAULT_MS;
  return Math.max(HAPTIC_DURATION_MIN_MS, Math.min(HAPTIC_DURATION_MAX_MS, Math.round(value)));
}

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
  private durationMs: number;
  private lastTriggerAtMs = 0;

  constructor() {
    this.enabled = this.loadEnabledState();
    this.durationMs = this.loadDurationMs();
  }

  private loadEnabledState(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return true;
      const saved = window.localStorage.getItem(HAPTICS_ENABLED_STORAGE_KEY);
      if (saved === null) return true;
      return saved === 'true';
    } catch {
      return true;
    }
  }

  private loadDurationMs(): number {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return HAPTIC_DURATION_DEFAULT_MS;
      const saved = window.localStorage.getItem(HAPTICS_DURATION_STORAGE_KEY);
      if (saved === null) return HAPTIC_DURATION_DEFAULT_MS;
      const parsed = Number(saved);
      return Number.isFinite(parsed) ? clampDurationMs(parsed) : HAPTIC_DURATION_DEFAULT_MS;
    } catch {
      return HAPTIC_DURATION_DEFAULT_MS;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(next: boolean): void {
    this.enabled = next;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(HAPTICS_ENABLED_STORAGE_KEY, String(next));
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

  public getDurationMs(): number {
    return this.durationMs;
  }

  public setDurationMs(ms: number): number {
    const clamped = clampDurationMs(ms);
    this.durationMs = clamped;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(HAPTICS_DURATION_STORAGE_KEY, String(clamped));
      }
    } catch {
      // Ignore storage failures
    }
    return clamped;
  }

  /**
   * Triggers a short tactile vibration pulse on Android devices scaled by the user's
   * configured base vibration duration. Safe no-op on non-Android or when disabled.
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

    const scaledDuration = Math.max(
      4,
      Math.min(80, Math.round(this.durationMs * STYLE_MULTIPLIER[style]))
    );

    if (Capacitor.isNativePlatform()) {
      void this.triggerNativePulse(style, scaledDuration);
      return;
    }

    this.triggerWebVibrate(scaledDuration);
  }

  private async triggerNativePulse(style: HapticPulseStyle, durationMs: number): Promise<void> {
    try {
      await Haptics.vibrate({ duration: durationMs });
    } catch {
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
