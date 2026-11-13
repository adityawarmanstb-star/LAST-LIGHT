import { addCoins, getSavedCoins } from './metaProgression';
import {
  DailyMission,
  DailyMissionCategory,
  DailyMissionsState,
  DailyMissionType,
} from './types';

const DAILY_MISSIONS_STORAGE_KEY = 'last_light_daily_missions_v1';
const FLUSH_DEBOUNCE_MS = 1000;

interface MissionTemplate {
  id: string;
  title: string;
  description: string;
  type: DailyMissionType;
  category: DailyMissionCategory;
  target: number;
  rewardCoins: number;
  icon: DailyMission['icon'];
}

const MISSION_POOL: MissionTemplate[] = [
  // Combat category
  {
    id: 'kill_50',
    title: 'Blood Initiation',
    description: 'Kill 50 enemies in the dark.',
    type: 'kill_enemies',
    category: 'combat',
    target: 50,
    rewardCoins: 35,
    icon: 'skull',
  },
  {
    id: 'kill_150',
    title: 'Shadow Cull',
    description: 'Kill 150 enemies across runs today.',
    type: 'kill_enemies',
    category: 'combat',
    target: 150,
    rewardCoins: 65,
    icon: 'skull',
  },
  {
    id: 'kill_350',
    title: 'Reaper of Ash',
    description: 'Kill 350 enemies across runs today.',
    type: 'kill_enemies',
    category: 'combat',
    target: 350,
    rewardCoins: 110,
    icon: 'skull',
  },
  {
    id: 'elite_1',
    title: 'Bane of Champions',
    description: 'Slay 1 Elite enemy.',
    type: 'kill_elites',
    category: 'combat',
    target: 1,
    rewardCoins: 55,
    icon: 'crown',
  },
  {
    id: 'elite_2',
    title: 'Bloodline Purge',
    description: 'Slay 2 Elite enemies today.',
    type: 'kill_elites',
    category: 'combat',
    target: 2,
    rewardCoins: 90,
    icon: 'crown',
  },
  {
    id: 'boss_1',
    title: 'Abyssal Slayer',
    description: 'Vanquish a Boss monster.',
    type: 'kill_bosses',
    category: 'combat',
    target: 1,
    rewardCoins: 140,
    icon: 'crown',
  },

  // Survival category
  {
    id: 'survive_120',
    title: 'Hold the Lantern',
    description: 'Survive 2 minutes in a single run.',
    type: 'survive_seconds',
    category: 'survival',
    target: 120,
    rewardCoins: 40,
    icon: 'clock',
  },
  {
    id: 'survive_300',
    title: 'Through the Long Night',
    description: 'Survive 5 minutes in a single run.',
    type: 'survive_seconds',
    category: 'survival',
    target: 300,
    rewardCoins: 95,
    icon: 'clock',
  },
  {
    id: 'survive_480',
    title: 'Last Beacon Standing',
    description: 'Survive 8 minutes in a single run.',
    type: 'survive_seconds',
    category: 'survival',
    target: 480,
    rewardCoins: 160,
    icon: 'clock',
  },
  {
    id: 'level_6',
    title: 'Kindled Arcana',
    description: 'Reach Level 6 in a single run.',
    type: 'reach_level',
    category: 'survival',
    target: 6,
    rewardCoins: 45,
    icon: 'sparkles',
  },
  {
    id: 'level_10',
    title: 'Ascendant Flame',
    description: 'Reach Level 10 in a single run.',
    type: 'reach_level',
    category: 'survival',
    target: 10,
    rewardCoins: 85,
    icon: 'sparkles',
  },

  // Treasure & Persistence category
  {
    id: 'coins_15',
    title: 'Soul Scavenger',
    description: 'Collect 15 Soul Coins in runs today.',
    type: 'collect_coins',
    category: 'treasure',
    target: 15,
    rewardCoins: 30,
    icon: 'coins',
  },
  {
    id: 'coins_40',
    title: 'Iron Hoarder',
    description: 'Collect 40 Soul Coins in runs today.',
    type: 'collect_coins',
    category: 'treasure',
    target: 40,
    rewardCoins: 65,
    icon: 'coins',
  },
  {
    id: 'runs_2',
    title: 'Relentless Warden',
    description: 'Complete 2 expeditions today.',
    type: 'play_runs',
    category: 'treasure',
    target: 2,
    rewardCoins: 40,
    icon: 'flame',
  },
  {
    id: 'runs_3',
    title: 'Oath of Iron',
    description: 'Complete 3 expeditions today.',
    type: 'play_runs',
    category: 'treasure',
    target: 3,
    rewardCoins: 70,
    icon: 'flame',
  },
];

export function getTodayDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTimeUntilReset(now: Date = new Date()): { hours: number; minutes: number } {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0
  );
  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

function hashDateSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMissionsForDate(dateKey: string): DailyMission[] {
  const rng = mulberry32(hashDateSeed(`last-light-daily:${dateKey}`));
  const categories: DailyMissionCategory[] = ['combat', 'survival', 'treasure'];

  const selected: DailyMission[] = [];
  for (const cat of categories) {
    const candidates = MISSION_POOL.filter((m) => m.category === cat);
    const pick = candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];
    selected.push({
      id: `${dateKey}_${pick.id}`,
      title: pick.title,
      description: pick.description,
      type: pick.type,
      category: pick.category,
      target: pick.target,
      progress: 0,
      rewardCoins: pick.rewardCoins,
      completed: false,
      claimed: false,
      icon: pick.icon,
    });
  }

  return selected;
}

function cloneState(state: DailyMissionsState): DailyMissionsState {
  return {
    dateKey: state.dateKey,
    missions: state.missions.map((m) => ({ ...m })),
  };
}

type MissionsSubscriber = (state: DailyMissionsState) => void;
type MissionCompletedSubscriber = (mission: DailyMission) => void;

class DailyMissionsManager {
  private state: DailyMissionsState;
  private subscribers: MissionsSubscriber[] = [];
  private completionSubscribers: MissionCompletedSubscriber[] = [];
  private flushTimer: number | null = null;
  private dirty = false;

  constructor() {
    this.state = this.loadOrCreateForToday();
  }

  private loadOrCreateForToday(): DailyMissionsState {
    const today = getTodayDateKey();
    try {
      const raw = localStorage.getItem(DAILY_MISSIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyMissionsState;
        if (
          parsed &&
          parsed.dateKey === today &&
          Array.isArray(parsed.missions) &&
          parsed.missions.length === 3
        ) {
          return {
            dateKey: parsed.dateKey,
            missions: parsed.missions.map((m) => ({
              ...m,
              progress: Math.min(m.target, Math.max(0, Number(m.progress) || 0)),
              completed: Boolean(m.completed || m.progress >= m.target),
              claimed: Boolean(m.claimed),
            })),
          };
        }
      }
    } catch {
      // Ignore malformed storage and regenerate cleanly
    }

    const fresh: DailyMissionsState = {
      dateKey: today,
      missions: generateMissionsForDate(today),
    };
    this.saveToStorage(fresh);
    return fresh;
  }

  private saveToStorage(state: DailyMissionsState): void {
    try {
      localStorage.setItem(DAILY_MISSIONS_STORAGE_KEY, JSON.stringify(state));
      this.dirty = false;
    } catch {
      // Ignore storage failures
    }
  }

  public ensureToday(): DailyMissionsState {
    const today = getTodayDateKey();
    if (this.state.dateKey !== today) {
      this.state = {
        dateKey: today,
        missions: generateMissionsForDate(today),
      };
      this.saveToStorage(this.state);
      this.notifySubscribers();
    }
    return cloneState(this.state);
  }

  public getState(): DailyMissionsState {
    return this.ensureToday();
  }

  public getUnclaimedCount(): number {
    this.ensureToday();
    return this.state.missions.filter((m) => m.completed && !m.claimed).length;
  }

  public getUnclaimedRewardTotal(): number {
    this.ensureToday();
    return this.state.missions
      .filter((m) => m.completed && !m.claimed)
      .reduce((sum, m) => sum + m.rewardCoins, 0);
  }

  public getCompletedCount(): number {
    this.ensureToday();
    return this.state.missions.filter((m) => m.completed).length;
  }

  public subscribe(cb: MissionsSubscriber): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  public onMissionCompleted(cb: MissionCompletedSubscriber): () => void {
    this.completionSubscribers.push(cb);
    return () => {
      this.completionSubscribers = this.completionSubscribers.filter((s) => s !== cb);
    };
  }

  private notifySubscribers(): void {
    const snapshot = cloneState(this.state);
    this.subscribers.forEach((cb) => cb(snapshot));
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer !== null || typeof window === 'undefined') return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      if (this.dirty) {
        this.saveToStorage(this.state);
      }
    }, FLUSH_DEBOUNCE_MS);
  }

  public flush(): void {
    if (this.flushTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirty) {
      this.saveToStorage(this.state);
    }
  }

  /**
   * Increments cumulative missions matching `type` (e.g. kills, coins, elites, bosses, runs).
   */
  public recordIncrement(type: DailyMissionType, delta: number): void {
    if (delta <= 0) return;
    this.ensureToday();

    let changed = false;
    const newlyCompleted: DailyMission[] = [];

    for (const mission of this.state.missions) {
      if (mission.type !== type || mission.completed) continue;
      const next = Math.min(mission.target, mission.progress + delta);
      if (next !== mission.progress) {
        mission.progress = next;
        changed = true;
        if (next >= mission.target) {
          mission.completed = true;
          newlyCompleted.push({ ...mission });
        }
      }
    }

    if (!changed) return;

    if (newlyCompleted.length > 0) {
      this.saveToStorage(this.state);
      newlyCompleted.forEach((m) => this.completionSubscribers.forEach((cb) => cb(m)));
    } else {
      this.scheduleFlush();
    }
    this.notifySubscribers();
  }

  /**
   * Updates single-run best missions matching `type` (e.g. survive_seconds, reach_level).
   */
  public recordMax(type: DailyMissionType, value: number): void {
    if (value <= 0) return;
    this.ensureToday();

    let changed = false;
    const newlyCompleted: DailyMission[] = [];

    for (const mission of this.state.missions) {
      if (mission.type !== type || mission.completed) continue;
      const clamped = Math.min(mission.target, value);
      if (clamped > mission.progress) {
        mission.progress = clamped;
        changed = true;
        if (clamped >= mission.target) {
          mission.completed = true;
          newlyCompleted.push({ ...mission });
        }
      }
    }

    if (!changed) return;

    if (newlyCompleted.length > 0) {
      this.saveToStorage(this.state);
      newlyCompleted.forEach((m) => this.completionSubscribers.forEach((cb) => cb(m)));
    } else {
      this.scheduleFlush();
    }
    this.notifySubscribers();
  }

  public claimMission(missionId: string): {
    claimedCoins: number;
    newCoins: number;
    state: DailyMissionsState;
  } {
    this.ensureToday();
    const target = this.state.missions.find((m) => m.id === missionId);
    if (!target || !target.completed || target.claimed) {
      return {
        claimedCoins: 0,
        newCoins: getSavedCoins(),
        state: cloneState(this.state),
      };
    }

    target.claimed = true;
    const newCoins = addCoins(target.rewardCoins);
    this.saveToStorage(this.state);
    this.notifySubscribers();

    return {
      claimedCoins: target.rewardCoins,
      newCoins,
      state: cloneState(this.state),
    };
  }

  public claimAllMissions(): {
    claimedCoins: number;
    newCoins: number;
    state: DailyMissionsState;
  } {
    this.ensureToday();
    let total = 0;

    for (const mission of this.state.missions) {
      if (mission.completed && !mission.claimed) {
        mission.claimed = true;
        total += mission.rewardCoins;
      }
    }

    if (total <= 0) {
      return {
        claimedCoins: 0,
        newCoins: getSavedCoins(),
        state: cloneState(this.state),
      };
    }

    const newCoins = addCoins(total);
    this.saveToStorage(this.state);
    this.notifySubscribers();

    return {
      claimedCoins: total,
      newCoins,
      state: cloneState(this.state),
    };
  }
}

export const dailyMissions = new DailyMissionsManager();
