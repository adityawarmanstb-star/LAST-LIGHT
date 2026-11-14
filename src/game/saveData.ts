import {
  AchievementsProgressState,
  BestiaryKillsMap,
  DailyMissionsState,
  DailyStreakState,
  RelicId,
} from './types';

const VALID_RELIC_IDS: RelicId[] = [
  'lodestone_heart',
  'twin_zephyr',
  'blood_chalice',
  'sunforged_lens',
  'iron_spurs',
  'executioner_seal',
];

export const SAVE_STORAGE_KEY = 'last_light_save_v1';
export const CURRENT_SAVE_VERSION = 1;

export type TargetFpsOption = 60 | 90 | 120;
export type ResolutionQualityMode = 'auto' | 'performance' | 'fhd' | 'ultra_4k';

export interface SaveSettingsData {
  muted: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  brightness: number;
  hapticsEnabled: boolean;
  targetFps: TargetFpsOption;
  resolutionMode: ResolutionQualityMode;
  upscalerEnabled: boolean;
  frameGenEnabled: boolean;
}

export interface SaveDataV1 {
  version: number;
  coins: number;
  upgrades: Record<string, number>;
  settings: SaveSettingsData;
  dailyMissions: DailyMissionsState | null;
  dailyStreak: DailyStreakState | null;
  hasSeenHowToPlay: boolean;
  bestiaryKills: BestiaryKillsMap;
  unlockedRelics: RelicId[];
  equippedRelicIds: RelicId[];
  relicSeals: number;
  maxRelicSlots: number;
  achievements: AchievementsProgressState;
}

const DEFAULT_SETTINGS: SaveSettingsData = {
  muted: false,
  masterVolume: 0.75,
  musicVolume: 0.65,
  sfxVolume: 0.8,
  brightness: 1.0,
  hapticsEnabled: true,
  targetFps: 90,
  resolutionMode: 'auto',
  upscalerEnabled: true,
  frameGenEnabled: true,
};

function createDefaultSaveData(): SaveDataV1 {
  return {
    version: CURRENT_SAVE_VERSION,
    coins: 0,
    upgrades: {},
    settings: { ...DEFAULT_SETTINGS },
    dailyMissions: null,
    dailyStreak: null,
    hasSeenHowToPlay: false,
    bestiaryKills: {
      wisp: 0,
      imp: 0,
      spitter: 0,
      brute: 0,
      boss: 0,
    },
    unlockedRelics: [],
    equippedRelicIds: [],
    relicSeals: 0,
    maxRelicSlots: 2,
    achievements: {
      stats: {
        totalKills: 0,
        longestRunSec: 0,
        bossesDefeated: 0,
        elitesSlain: 0,
        highestLevel: 1,
        totalCoinsEarned: 0,
        runsCompleted: 0,
      },
      unlockedIds: [],
      claimedIds: [],
    },
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

function sanitizeTargetFps(value: unknown): TargetFpsOption {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (num === 60 || num === 90 || num === 120) return num;
  return 90;
}

function sanitizeResolutionMode(value: unknown): ResolutionQualityMode {
  if (value === 'auto' || value === 'performance' || value === 'fhd' || value === 'ultra_4k') {
    return value;
  }
  return 'auto';
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
        rewardSeals: safeNonNegativeInt(m.rewardSeals, 1) || 1,
        completed,
        claimed: Boolean(m.claimed) && completed,
      };
    }),
  };
}

function sanitizeDailyStreak(raw: unknown): DailyStreakState | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.lastLoginDateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.lastLoginDateKey)) {
    return null;
  }

  const currentStreak = Math.max(1, safeNonNegativeInt(obj.currentStreak, 1));
  const bestStreak = Math.max(currentStreak, safeNonNegativeInt(obj.bestStreak, currentStreak));
  const lastRewardCoins = safeNonNegativeInt(obj.lastRewardCoins, 0);

  return {
    currentStreak,
    bestStreak,
    lastLoginDateKey: obj.lastLoginDateKey,
    lastRewardCoins,
  };
}

function sanitizeBestiaryKills(raw: unknown): BestiaryKillsMap {
  const defaults: BestiaryKillsMap = {
    wisp: 0,
    imp: 0,
    spitter: 0,
    brute: 0,
    boss: 0,
  };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const obj = raw as Record<string, unknown>;
  return {
    wisp: safeNonNegativeInt(obj.wisp, 0),
    imp: safeNonNegativeInt(obj.imp, 0),
    spitter: safeNonNegativeInt(obj.spitter, 0),
    brute: safeNonNegativeInt(obj.brute, 0),
    boss: safeNonNegativeInt(obj.boss, 0),
  };
}

function sanitizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && item.length > 0) {
      seen.add(item);
    }
  }
  return Array.from(seen);
}

function sanitizeAchievements(
  raw: unknown,
  bestiaryKills: BestiaryKillsMap
): AchievementsProgressState {
  const bestiaryTotal =
    bestiaryKills.wisp +
    bestiaryKills.imp +
    bestiaryKills.spitter +
    bestiaryKills.brute +
    bestiaryKills.boss;

  const defaults: AchievementsProgressState = {
    stats: {
      totalKills: bestiaryTotal,
      longestRunSec: 0,
      bossesDefeated: bestiaryKills.boss,
      elitesSlain: 0,
      highestLevel: 1,
      totalCoinsEarned: 0,
      runsCompleted: 0,
    },
    unlockedIds: [],
    claimedIds: [],
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }

  const obj = raw as Record<string, unknown>;
  const rawStats =
    obj.stats && typeof obj.stats === 'object' && !Array.isArray(obj.stats)
      ? (obj.stats as Record<string, unknown>)
      : {};

  const unlockedIds = sanitizeStringArray(obj.unlockedIds);
  const unlockedSet = new Set(unlockedIds);
  const claimedIds = sanitizeStringArray(obj.claimedIds).filter((id) => unlockedSet.has(id));

  return {
    stats: {
      totalKills: Math.max(bestiaryTotal, safeNonNegativeInt(rawStats.totalKills, 0)),
      longestRunSec: safeNonNegativeInt(rawStats.longestRunSec, 0),
      bossesDefeated: Math.max(
        bestiaryKills.boss,
        safeNonNegativeInt(rawStats.bossesDefeated, 0)
      ),
      elitesSlain: safeNonNegativeInt(rawStats.elitesSlain, 0),
      highestLevel: Math.max(1, safeNonNegativeInt(rawStats.highestLevel, 1)),
      totalCoinsEarned: safeNonNegativeInt(rawStats.totalCoinsEarned, 0),
      runsCompleted: safeNonNegativeInt(rawStats.runsCompleted, 0),
    },
    unlockedIds,
    claimedIds,
  };
}

function sanitizeUnlockedRelics(raw: unknown): RelicId[] {
  if (!Array.isArray(raw)) return [];
  const validSet = new Set<string>(VALID_RELIC_IDS);
  const seen = new Set<RelicId>();
  for (const item of raw) {
    if (typeof item === 'string' && validSet.has(item)) {
      seen.add(item as RelicId);
    }
  }
  return Array.from(seen);
}

function sanitizeEquippedRelics(
  rawList: unknown,
  legacySingle: unknown,
  unlocked: RelicId[],
  maxSlots: number
): RelicId[] {
  const result: RelicId[] = [];
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (
        typeof item === 'string' &&
        unlocked.includes(item as RelicId) &&
        !result.includes(item as RelicId)
      ) {
        result.push(item as RelicId);
        if (result.length >= maxSlots) break;
      }
    }
  } else if (typeof legacySingle === 'string' && unlocked.includes(legacySingle as RelicId)) {
    result.push(legacySingle as RelicId);
  }
  return result;
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

  const unlockedRelics = sanitizeUnlockedRelics(obj.unlockedRelics);
  const maxRelicSlots = Math.max(2, Math.min(4, safeNonNegativeInt(obj.maxRelicSlots, defaults.maxRelicSlots)));
  const relicSeals = safeNonNegativeInt(obj.relicSeals, defaults.relicSeals);
  const equippedRelicIds = sanitizeEquippedRelics(
    obj.equippedRelicIds,
    obj.equippedRelicId,
    unlockedRelics,
    maxRelicSlots
  );

  const bestiaryKills = sanitizeBestiaryKills(obj.bestiaryKills);

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
      targetFps: sanitizeTargetFps(rawSettings.targetFps),
      resolutionMode: sanitizeResolutionMode(rawSettings.resolutionMode),
      upscalerEnabled: safeBoolean(rawSettings.upscalerEnabled, defaults.settings.upscalerEnabled),
      frameGenEnabled: safeBoolean(rawSettings.frameGenEnabled, defaults.settings.frameGenEnabled),
    },
    dailyMissions: sanitizeDailyMissions(obj.dailyMissions),
    dailyStreak: sanitizeDailyStreak(obj.dailyStreak),
    hasSeenHowToPlay: safeBoolean(obj.hasSeenHowToPlay, defaults.hasSeenHowToPlay),
    bestiaryKills,
    unlockedRelics,
    equippedRelicIds,
    relicSeals,
    maxRelicSlots,
    achievements: sanitizeAchievements(obj.achievements, bestiaryKills),
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
      dailyStreak: this.cache.dailyStreak ? { ...this.cache.dailyStreak } : null,
      hasSeenHowToPlay: this.cache.hasSeenHowToPlay,
      bestiaryKills: { ...this.cache.bestiaryKills },
      unlockedRelics: [...this.cache.unlockedRelics],
      equippedRelicIds: [...this.cache.equippedRelicIds],
      relicSeals: this.cache.relicSeals,
      maxRelicSlots: this.cache.maxRelicSlots,
      achievements: {
        stats: { ...this.cache.achievements.stats },
        unlockedIds: [...this.cache.achievements.unlockedIds],
        claimedIds: [...this.cache.achievements.claimedIds],
      },
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
