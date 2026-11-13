import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { soundManager } from '../game/audio';

export interface CapacitorBridgeCallbacks {
  onBackButton: () => boolean; // Return true if handled internally, false to allow minimize/exit
  onAppBackground: () => void;
  onAppForeground: () => void;
}

export async function hideAndroidSystemBars(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: true });
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();
  } catch {
    // Fail silently if plugin isn't ready
  }
}

export function initCapacitorMobile(callbacks: CapacitorBridgeCallbacks): () => void {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  void hideAndroidSystemBars();

  let appStateHandle: { remove: () => Promise<void> } | null = null;
  let backButtonHandle: { remove: () => Promise<void> } | null = null;
  let disposed = false;

  CapApp.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void hideAndroidSystemBars();
      callbacks.onAppForeground();
    } else {
      callbacks.onAppBackground();
    }
  }).then((handle) => {
    if (disposed) {
      void handle.remove();
    } else {
      appStateHandle = handle;
    }
  }).catch(() => {});

  CapApp.addListener('backButton', () => {
    soundManager.onUserGesture();
    const handled = callbacks.onBackButton();
    if (!handled) {
      void CapApp.minimizeApp();
    }
  }).then((handle) => {
    if (disposed) {
      void handle.remove();
    } else {
      backButtonHandle = handle;
    }
  }).catch(() => {});

  return () => {
    disposed = true;
    if (appStateHandle) {
      void appStateHandle.remove();
      appStateHandle = null;
    }
    if (backButtonHandle) {
      void backButtonHandle.remove();
      backButtonHandle = null;
    }
  };
}
