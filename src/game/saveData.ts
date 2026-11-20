import {
  AchievementsProgressState,
  BestiaryKillsMap,
  DailyMissionsState,
  DailyStreakState,
  DifficultyClearRecord,
  GameDifficultyId,
  GoreLevel,
  RelicId,
  StageDifficultyClearsMap,
  StageId,
} from './types';
import { sanitizeDifficultyId } from './difficulty';
import { DEFAULT_STAGE_ID, sanitizeStageId } from './stages';

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
  screenShakeEnabled: boolean;
  targetFps: TargetFpsOption;
  resolutionMode: ResolutionQualityMode;
  upscalerEnabled: boolean;
  frameGenEnabled: boolean;
  gore: GoreLevel;
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
  dailyChestClaimedDateKey: string | null;
  dailyDealsClaimed: { dateKey: string; boughtIds: string[] } | null;
  achievements: AchievementsProgressState;
  difficulty: GameDifficultyId;
  selectedStageId: StageId;
  stage1BossDefeated: boolean;
  stage2BossDefeated: boolean;
  stageBestTimes: Record<StageId, number>;
  difficultyClears: StageDifficultyClearsMap;
  developerMode: boolean;
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const MOBILE_DEFAULTS = isMobileBrowser();
const MOBILE_PERF_MIGRATION_FLAG = 'last_light_mobile_perf_v1';

const DEFAULT_SETTINGS: SaveSettingsData = {
  muted: false,
  masterVolume: 0.75,
  musicVolume: 0.65,
  sfxVolume: 0.8,
  brightness: 1.0,
  hapticsEnabled: true,
  screenShakeEnabled: true,
  targetFps: MOBILE_DEFAULTS ? 60 : 90,
  resolutionMode: 'auto',
  upscalerEnabled: !MOBILE_DEFAULTS,
  frameGenEnabled: true,
  gore: 'normal',
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
    dailyChestClaimedDateKey: null,
    dailyDealsClaimed: null,
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
    difficulty: 'hacker',
    selectedStageId: DEFAULT_STAGE_ID,
    stage1BossDefeated: false,
    stage2BossDefeated: false,
    stageBestTimes: {
      stage_1: 0,
      stage_2: 0,
    },
    difficultyClears: createDefaultDifficultyClears(),
    developerMode: false,
  };
}

function createEmptyDifficultyClearRecord(): DifficultyClearRecord {
  return {
    cleared: false,
    bestClearTimeSec: null,
    clearCount: 0,
  };
}

function createDefaultDifficultyClears(): StageDifficultyClearsMap {
  return {
    stage_1: {
      baby: createEmptyDifficultyClearRecord(),
      pro: createEmptyDifficultyClearRecord(),
      hacker: createEmptyDifficultyClearRecord(),
    },
    stage_2: {
      baby: createEmptyDifficultyClearRecord(),
      pro: createEmptyDifficultyClearRecord(),
      hacker: createEmptyDifficultyClearRecord(),
    },
  };
}

function sanitizeDifficultyClearRecord(raw: unknown): DifficultyClearRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createEmptyDifficultyClearRecord();
  }
  const obj = raw as Record<string, unknown>;
  const rawBest = obj.bestClearTimeSec;
  const parsedBest =
    rawBest === null || rawBest === undefined
      ? null
      : typeof rawBest === 'number' && Number.isFinite(rawBest) && rawBest >= 0
        ? Math.floor(rawBest)
        : typeof rawBest === 'string' && rawBest.trim() !== '' && Number.isFinite(Number(rawBest)) && Number(rawBest) >= 0
          ? Math.floor(Number(rawBest))
          : null;
  const clearCount = safeNonNegativeInt(obj.clearCount, 0);
  const cleared = safeBoolean(obj.cleared, false) || clearCount > 0 || parsedBest !== null;
  return {
    cleared,
    bestClearTimeSec: cleared ? parsedBest : null,
    clearCount: cleared ? Math.max(1, clearCount) : 0,
  };
}

function sanitizeDifficultyClears(raw: unknown): StageDifficultyClearsMap {
  const defaults = createDefaultDifficultyClears();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }
  const obj = raw as Record<string, unknown>;
  const stages: StageId[] = ['stage_1', 'stage_2'];
  const diffs: GameDifficultyId[] = ['baby', 'pro', 'hacker'];
  for (const sId of stages) {
    const rawStage = obj[sId];
    if (!rawStage || typeof rawStage !== 'object' || Array.isArray(rawStage)) continue;
    const stageObj = rawStage as Record<string, unknown>;
    for (const dId of diffs) {
      defaults[sId][dId] = sanitizeDifficultyClearRecord(stageObj[dId]);
    }
  }
  return defaults;
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
  return MOBILE_DEFAULTS ? 60 : 90;
}

function sanitizeResolutionMode(value: unknown): ResolutionQualityMode {
  if (value === 'auto' || value === 'performance' || value === 'fhd' || value === 'ultra_4k') {
    return value;
  }
  return 'auto';
}

function sanitizeGoreLevel(value: unknown): GoreLevel {
  if (value === 'off' || value === 'low' || value === 'normal') {
    return value;
  }
  return 'normal';
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
  const stage1BossDefeated = safeBoolean(obj.stage1BossDefeated, defaults.stage1BossDefeated);
  const stage2BossDefeated = safeBoolean(obj.stage2BossDefeated, defaults.stage2BossDefeated);
  const developerMode = safeBoolean(obj.developerMode, defaults.developerMode);
  const rawStageId = sanitizeStageId(obj.selectedStageId);
  const selectedStageId: StageId =
    rawStageId === 'stage_2' && !stage1BossDefeated && !developerMode
      ? DEFAULT_STAGE_ID
      : rawStageId;
  const rawBestTimes =
    obj.stageBestTimes &&
    typeof obj.stageBestTimes === 'object' &&
    !Array.isArray(obj.stageBestTimes)
      ? (obj.stageBestTimes as Record<string, unknown>)
      : {};
  const stageBestTimes: Record<StageId, number> = {
    stage_1: safeNonNegativeInt(rawBestTimes.stage_1, 0),
    stage_2: safeNonNegativeInt(rawBestTimes.stage_2, 0),
  };

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
      screenShakeEnabled: safeBoolean(
        rawSettings.screenShakeEnabled,
        defaults.settings.screenShakeEnabled
      ),
      targetFps: sanitizeTargetFps(rawSettings.targetFps),
      resolutionMode: sanitizeResolutionMode(rawSettings.resolutionMode),
      upscalerEnabled: safeBoolean(rawSettings.upscalerEnabled, defaults.settings.upscalerEnabled),
      frameGenEnabled: safeBoolean(rawSettings.frameGenEnabled, defaults.settings.frameGenEnabled),
      gore: sanitizeGoreLevel(rawSettings.gore),
    },
    dailyMissions: sanitizeDailyMissions(obj.dailyMissions),
    dailyStreak: sanitizeDailyStreak(obj.dailyStreak),
    hasSeenHowToPlay: safeBoolean(obj.hasSeenHowToPlay, defaults.hasSeenHowToPlay),
    bestiaryKills,
    unlockedRelics,
    equippedRelicIds,
    relicSeals,
    maxRelicSlots,
    dailyChestClaimedDateKey:
      typeof obj.dailyChestClaimedDateKey === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(obj.dailyChestClaimedDateKey)
        ? obj.dailyChestClaimedDateKey
        : null,
    dailyDealsClaimed:
      obj.dailyDealsClaimed &&
      typeof obj.dailyDealsClaimed === 'object' &&
      !Array.isArray(obj.dailyDealsClaimed) &&
      typeof (obj.dailyDealsClaimed as Record<string, unknown>).dateKey === 'string'
        ? {
            dateKey: (obj.dailyDealsClaimed as Record<string, unknown>).dateKey as string,
            boughtIds: sanitizeStringArray(
              (obj.dailyDealsClaimed as Record<string, unknown>).boughtIds
            ),
          }
        : null,
    achievements: sanitizeAchievements(obj.achievements, bestiaryKills),
    difficulty: sanitizeDifficultyId(obj.difficulty),
    selectedStageId,
    stage1BossDefeated,
    stage2BossDefeated,
    stageBestTimes,
    difficultyClears: sanitizeDifficultyClears(obj.difficultyClears),
    developerMode,
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
        if (MOBILE_DEFAULTS && !window.localStorage.getItem(MOBILE_PERF_MIGRATION_FLAG)) {
          sanitized.settings.targetFps = 60;
          sanitized.settings.upscalerEnabled = false;
          window.localStorage.setItem(MOBILE_PERF_MIGRATION_FLAG, '1');
          this.persist(sanitized);
        }
        return sanitized;
      }

      const migrated = migrateLegacyKeys();
      if (migrated) {
        if (MOBILE_DEFAULTS) {
          window.localStorage.setItem(MOBILE_PERF_MIGRATION_FLAG, '1');
        }
        this.persist(migrated);
        return migrated;
      }
      if (MOBILE_DEFAULTS) {
        window.localStorage.setItem(MOBILE_PERF_MIGRATION_FLAG, '1');
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
      dailyChestClaimedDateKey: this.cache.dailyChestClaimedDateKey,
      dailyDealsClaimed: this.cache.dailyDealsClaimed
        ? {
            dateKey: this.cache.dailyDealsClaimed.dateKey,
            boughtIds: [...this.cache.dailyDealsClaimed.boughtIds],
          }
        : null,
      achievements: {
        stats: { ...this.cache.achievements.stats },
        unlockedIds: [...this.cache.achievements.unlockedIds],
        claimedIds: [...this.cache.achievements.claimedIds],
      },
      difficulty: this.cache.difficulty,
      selectedStageId: this.cache.selectedStageId,
      stage1BossDefeated: this.cache.stage1BossDefeated,
      stage2BossDefeated: this.cache.stage2BossDefeated,
      stageBestTimes: { ...this.cache.stageBestTimes },
      difficultyClears: {
        stage_1: {
          baby: { ...this.cache.difficultyClears.stage_1.baby },
          pro: { ...this.cache.difficultyClears.stage_1.pro },
          hacker: { ...this.cache.difficultyClears.stage_1.hacker },
        },
        stage_2: {
          baby: { ...this.cache.difficultyClears.stage_2.baby },
          pro: { ...this.cache.difficultyClears.stage_2.pro },
          hacker: { ...this.cache.difficultyClears.stage_2.hacker },
        },
      },
      developerMode: this.cache.developerMode,
    };
  }

  public readFastRef(): Readonly<SaveDataV1> {
    return this.cache;
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

  public mutateFast(mutator: (cache: SaveDataV1) => void, writeNow = false): Readonly<SaveDataV1> {
    mutator(this.cache);
    if (writeNow) {
      this.cache = sanitizeSaveData(this.cache);
      this.persist(this.cache);
    }
    return this.cache;
  }

  public flush(): void {
    this.cache = sanitizeSaveData(this.cache);
    this.persist(this.cache);
  }
}

export const saveDataStore = new SaveDataStore();
