import { saveDataStore } from './saveData';

export const DEVELOPER_MODE_CODE = '465477';
export const UNLIMITED_CURRENCY = 999_999_999;

type DeveloperModeListener = (enabled: boolean) => void;
const listeners = new Set<DeveloperModeListener>();

export function isDeveloperMode(): boolean {
  return Boolean(saveDataStore.readFastRef().developerMode);
}

export function verifyDeveloperModeCode(input: string): boolean {
  return input.trim() === DEVELOPER_MODE_CODE;
}

export function subscribeDeveloperMode(listener: DeveloperModeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setDeveloperMode(enabled: boolean): boolean {
  const next = Boolean(enabled);
  const updated = saveDataStore.update((draft) => {
    draft.developerMode = next;
  });
  listeners.forEach((cb) => cb(updated.developerMode));
  return updated.developerMode;
}

export function activateDeveloperModeWithCode(input: string): boolean {
  if (!verifyDeveloperModeCode(input)) {
    return false;
  }
  setDeveloperMode(true);
  return true;
}
