import { DailyMissionsState } from './types';

export const SAVE_STORAGE_KEY = 'last_light_save_v1';
export const CURRENT_SAVE_VERSION = 1;

export interface SaveSettingsData {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  brightness: number;
  hapticsEnabled: boolean;
}

export interface SaveDataV1 {
  version: number;
  coins: number;
  upgrades: Record<string, number>;
  settings: SaveSettingsData;
  dailyMissions: DailyMissionsState | null;
}

const DEFAULT_SETTINGS: SaveSettingsData = {
  muted: false,
  masterVolume: 0.75,
  musicVolume: 0.65,
  sfxVolume: 0.8,
  brightness: 1.0,
  hapticsEnabled: true,
};

function createDefaultSaveData(): SaveDataV1 {
  return {
    version: CURRENT_SAVE_VERSION,
    coins: 0,
    upgrades: {},
    settings: { ...DEFAULT_SETTINGS },
    dailyMissions: null,
  };
}

function clampFinite(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function safeNonNegativeInt(value: unknown, fallback: number = 0): number {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function sanitizeUpgrades(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === 'string' && key.length > 0) {
      result[key] = safeNonNegativeInt(val, 0);
    }
  }
  return result;
}

function sanitizeDailyMissions(raw: unknown): DailyMissionsState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.dateKey !== 'string' || !Array.isArray(obj.missions) || obj.missions.length !== 3) {
    return null;
  }

  const validMissions = obj.missions.every(
    (m) =>
      m &&
      typeof m === 'object' &&
      typeof (m as Record<string, unknown>).id === 'string' &&
      typeof (m as Record<string, unknown>).title === 'string' &&
      typeof (m as Record<string, unknown>).type === 'string' &&
      typeof (m as Record<string, unknown>).target === 'number' &&
      Number.isFinite((m as Record<string, unknown>).target) &&
      ((m as Record<string, unknown>).target as number) > 0
  );

  if (!validMissions) return null;

  return {
    dateKey: obj.dateKey,
    missions: obj.missions.map((m) => {
      const target = Math.max(1, safeNonNegativeInt(m.target, 1));
      const progress = Math.min(target, safeNonNegativeInt(m.progress, 0));
      const completed = Boolean(m.completed || progress >= target);
      return {
        ...m,
        target,
        progress,
        rewardCoins: safeNonNegativeInt(m.rewardCoins, 25),
        completed,
        claimed: Boolean(m.claimed) && completed,
      };
    }),
  };
}

function sanitizeSaveData(raw: unknown): SaveDataV1 {
  const defaults = createDefaultSaveData();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const rawSettings =
    obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)
      ? (obj.settings as Record<string, unknown>)
      : {};

  return {
    version: CURRENT_SAVE_VERSION,
    coins: safeNonNegativeInt(obj.coins, defaults.coins),
    upgrades: sanitizeUpgrades(obj.upgrades),
    settings: {
      muted: safeBoolean(rawSettings.muted, defaults.settings.muted),
      masterVolume: clampFinite(rawSettings.masterVolume, 0, 1, defaults.settings.masterVolume),
      musicVolume: clampFinite(rawSettings.musicVolume, 0, 1, defaults.settings.musicVolume),
      sfxVolume: clampFinite(rawSettings.sfxVolume, 0, 1, defaults.settings.sfxVolume),
      brightness: clampFinite(rawSettings.brightness, 0.5, 1.5, defaults.settings.brightness),
      hapticsEnabled: safeBoolean(rawSettings.hapticsEnabled, defaults.settings.hapticsEnabled),
    },
    dailyMissions: sanitizeDailyMissions(obj.dailyMissions),
  };
}

function migrateLegacyKeys(): SaveDataV1 | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const legacyCoins = window.localStorage.getItem('last_light_coins_v1');
    const legacyUpgrades = window.localStorage.getItem('last_light_meta_v1');
    const legacyMissions = window.localStorage.getItem('last_light_daily_missions_v1');
    const legacyBrightness = window.localStorage.getItem('lastlight_brightness');
    const legacyMuted = window.localStorage.getItem('last_light_muted');
    const legacyMaster = window.localStorage.getItem('last_light_master_volume');
    const legacyMusic = window.localStorage.getItem('last_light_music_volume');
    const legacySfx = window.localStorage.getItem('last_light_sfx_volume');
    const legacyHaptics = window.localStorage.getItem('last_light_haptics_enabled');

    const hasAnyLegacy =
      legacyCoins !== null ||
      legacyUpgrades !== null ||
      legacyMissions !== null ||
      legacyBrightness !== null ||
      legacyMuted !== null ||
      legacyMaster !== null ||
      legacyMusic !== null ||
      legacySfx !== null ||
      legacyHaptics !== null;

    if (!hasAnyLegacy) return null;

    let parsedUpgrades: unknown = {};
    if (legacyUpgrades) {
      try {
        parsedUpgrades = JSON.parse(legacyUpgrades);
      } catch {
        parsedUpgrades = {};
      }
    }

    let parsedMissions: unknown = null;
    if (legacyMissions) {
      try {
        parsedMissions = JSON.parse(legacyMissions);
      } catch {
        parsedMissions = null;
      }
    }

    return sanitizeSaveData({
      version: CURRENT_SAVE_VERSION,
      coins: legacyCoins,
      upgrades: parsedUpgrades,
      settings: {
        muted: legacyMuted,
        masterVolume: legacyMaster,
        musicVolume: legacyMusic,
        sfxVolume: legacySfx,
        brightness: legacyBrightness,
        hapticsEnabled: legacyHaptics,
      },
      dailyMissions: parsedMissions,
    });
  } catch {
    return null;
  }
}

class SaveDataStore {
  private cache: SaveDataV1;

  constructor() {
    this.cache = this.loadInitial();
  }

  private loadInitial(): SaveDataV1 {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return createDefaultSaveData();
      }
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const sanitized = sanitizeSaveData(parsed);
        return sanitized;
      }

      const migrated = migrateLegacyKeys();
      if (migrated) {
        this.persist(migrated);
        return migrated;
      }
    } catch {
      // Corrupted JSON or inaccessible storage -> fall back safely to defaults
    }
    return createDefaultSaveData();
  }

  private persist(data: SaveDataV1): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Ignore quota or private mode storage errors
    }
  }

  public read(): SaveDataV1 {
    return {
      version: this.cache.version,
      coins: this.cache.coins,
      upgrades: { ...this.cache.upgrades },
      settings: { ...this.cache.settings },
      dailyMissions: this.cache.dailyMissions
        ? {
            dateKey: this.cache.dailyMissions.dateKey,
            missions: this.cache.dailyMissions.missions.map((m) => ({ ...m })),
          }
        : null,
    };
  }

  public update(mutator: (draft: SaveDataV1) => void, writeNow = true): SaveDataV1 {
    const draft = this.read();
    mutator(draft);
    this.cache = sanitizeSaveData(draft);
    if (writeNow) {
      this.persist(this.cache);
    }
    return this.read();
  }

  public flush(): void {
    this.persist(this.cache);
  }
}

export const saveDataStore = new SaveDataStore();
