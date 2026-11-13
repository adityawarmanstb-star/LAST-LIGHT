import { addCoins, getSavedCoins } from './metaProgression';
import { saveDataStore } from './saveData';
import {
  AchievementDefinition,
  AchievementStatKey,
  AchievementsProgressState,
} from './types';

const FLUSH_DEBOUNCE_MS = 1000;

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Total Kills milestones
  {
    id: 'kills_50',
    title: 'First Blood',
    description: 'Slay 50 enemies in the dark across all runs.',
    category: 'combat',
    statKey: 'totalKills',
    target: 50,
    rewardCoins: 25,
    icon: 'skull',
  },
  {
    id: 'kills_500',
    title: 'Ashfen Butcher',
    description: 'Slay 500 total enemies across all runs.',
    category: 'combat',
    statKey: 'totalKills',
    target: 500,
    rewardCoins: 60,
    icon: 'swords',
  },
  {
    id: 'kills_2500',
    title: 'Reaper of the Void',
    description: 'Slay 2,500 total enemies across all runs.',
    category: 'combat',
    statKey: 'totalKills',
    target: 2500,
    rewardCoins: 150,
    icon: 'swords',
  },

  // Longest Run milestones
  {
    id: 'run_180',
    title: 'Lantern Bearer',
    description: 'Survive 3 minutes (3:00) in a single run.',
    category: 'survival',
    statKey: 'longestRunSec',
    target: 180,
    rewardCoins: 40,
    icon: 'clock',
  },
  {
    id: 'run_300',
    title: 'Dawnbreaker',
    description: 'Survive 5 minutes (5:00) in a single run.',
    category: 'survival',
    statKey: 'longestRunSec',
    target: 300,
    rewardCoins: 80,
    icon: 'clock',
  },
  {
    id: 'run_480',
    title: 'Undying Vigil',
    description: 'Survive 8 minutes (8:00) in a single run.',
    category: 'survival',
    statKey: 'longestRunSec',
    target: 480,
    rewardCoins: 160,
    icon: 'flame',
  },

  // Bosses Defeated milestones
  {
    id: 'boss_1',
    title: 'Titan Slayer',
    description: 'Defeat 1 Shadow Titan Boss.',
    category: 'bosses',
    statKey: 'bossesDefeated',
    target: 1,
    rewardCoins: 90,
    icon: 'crown',
  },
  {
    id: 'boss_5',
    title: 'Bane of Giants',
    description: 'Defeat 5 Shadow Titan Bosses across all runs.',
    category: 'bosses',
    statKey: 'bossesDefeated',
    target: 5,
    rewardCoins: 180,
    icon: 'crown',
  },

  // Additional Mastery milestones
  {
    id: 'elites_10',
    title: 'Champion Hunter',
    description: 'Slay 10 Elite monsters.',
    category: 'mastery',
    statKey: 'elitesSlain',
    target: 10,
    rewardCoins: 75,
    icon: 'skull',
  },
  {
    id: 'level_15',
    title: 'Hardcore Ascendant',
    description: 'Reach Level 15 in a single expedition.',
    category: 'mastery',
    statKey: 'highestLevel',
    target: 15,
    rewardCoins: 85,
    icon: 'sparkles',
  },
  {
    id: 'coins_500',
    title: 'Soul Collector',
    description: 'Gather 500 total Soul Coins in runs.',
    category: 'mastery',
    statKey: 'totalCoinsEarned',
    target: 500,
    rewardCoins: 70,
    icon: 'coins',
  },
  {
    id: 'runs_5',
    title: 'Oathbound Veteran',
    description: 'Complete 5 expeditions into the dark.',
    category: 'mastery',
    statKey: 'runsCompleted',
    target: 5,
    rewardCoins: 65,
    icon: 'flame',
  },
];

type AchievementsSubscriber = (state: AchievementsProgressState) => void;
type AchievementUnlockedSubscriber = (achievement: AchievementDefinition) => void;

class AchievementsManager {
  private subscribers: AchievementsSubscriber[] = [];
  private unlockSubscribers: AchievementUnlockedSubscriber[] = [];
  private flushTimer: number | null = null;
  private dirty = false;

  constructor() {
    this.reconcileUnlocks(false);
  }

  public getState(): AchievementsProgressState {
    return saveDataStore.read().achievements;
  }

  public getUnlockedCount(): number {
    return this.getState().unlockedIds.length;
  }

  public getUnclaimedCount(): number {
    const state = this.getState();
    const claimedSet = new Set(state.claimedIds);
    return state.unlockedIds.filter((id) => !claimedSet.has(id)).length;
  }

  public getUnclaimedRewardTotal(): number {
    const state = this.getState();
    const unlockedSet = new Set(state.unlockedIds);
    const claimedSet = new Set(state.claimedIds);
    return ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id) && !claimedSet.has(a.id)).reduce(
      (sum, a) => sum + a.rewardCoins,
      0
    );
  }

  public subscribe(cb: AchievementsSubscriber): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  public onAchievementUnlocked(cb: AchievementUnlockedSubscriber): () => void {
    this.unlockSubscribers.push(cb);
    return () => {
      this.unlockSubscribers = this.unlockSubscribers.filter((s) => s !== cb);
    };
  }

  private notifySubscribers(state: AchievementsProgressState): void {
    this.subscribers.forEach((cb) => cb(state));
  }

  private scheduleFlush(): void {
    this.dirty = true;
    if (this.flushTimer !== null || typeof window === 'undefined') return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      if (this.dirty) {
        this.dirty = false;
        saveDataStore.flush();
      }
    }, FLUSH_DEBOUNCE_MS);
  }

  public flush(): void {
    if (this.flushTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.dirty) {
      this.dirty = false;
      saveDataStore.flush();
    }
  }

  private reconcileUnlocks(emitEvents: boolean): void {
    const newlyUnlocked: AchievementDefinition[] = [];
    const current = this.getState();
    const unlockedSet = new Set(current.unlockedIds);

    for (const ach of ACHIEVEMENTS) {
      if (!unlockedSet.has(ach.id) && current.stats[ach.statKey] >= ach.target) {
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length === 0) return;

    const updated = saveDataStore.update((draft) => {
      const nextSet = new Set(draft.achievements.unlockedIds);
      for (const ach of newlyUnlocked) {
        nextSet.add(ach.id);
      }
      draft.achievements.unlockedIds = Array.from(nextSet);
    }, true);

    if (emitEvents) {
      newlyUnlocked.forEach((ach) => this.unlockSubscribers.forEach((cb) => cb(ach)));
    }
    this.notifySubscribers(updated.achievements);
  }

  public recordIncrement(statKey: AchievementStatKey, delta: number): void {
    if (delta <= 0) return;

    const current = this.getState();
    const nextValue = current.stats[statKey] + Math.floor(delta);
    const unlockedSet = new Set(current.unlockedIds);
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (ach) => ach.statKey === statKey && !unlockedSet.has(ach.id) && nextValue >= ach.target
    );

    const writeNow = newlyUnlocked.length > 0;
    const updated = saveDataStore.update((draft) => {
      draft.achievements.stats[statKey] = nextValue;
      if (newlyUnlocked.length > 0) {
        const set = new Set(draft.achievements.unlockedIds);
        newlyUnlocked.forEach((ach) => set.add(ach.id));
        draft.achievements.unlockedIds = Array.from(set);
      }
    }, writeNow);

    if (writeNow) {
      this.dirty = false;
      newlyUnlocked.forEach((ach) => this.unlockSubscribers.forEach((cb) => cb(ach)));
    } else {
      this.scheduleFlush();
    }

    this.notifySubscribers(updated.achievements);
  }

  public recordMax(statKey: AchievementStatKey, value: number): void {
    if (value <= 0) return;

    const cleanValue = Math.floor(value);
    const current = this.getState();
    if (cleanValue <= current.stats[statKey]) return;

    const unlockedSet = new Set(current.unlockedIds);
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (ach) => ach.statKey === statKey && !unlockedSet.has(ach.id) && cleanValue >= ach.target
    );

    const writeNow = newlyUnlocked.length > 0;
    const updated = saveDataStore.update((draft) => {
      draft.achievements.stats[statKey] = Math.max(draft.achievements.stats[statKey], cleanValue);
      if (newlyUnlocked.length > 0) {
        const set = new Set(draft.achievements.unlockedIds);
        newlyUnlocked.forEach((ach) => set.add(ach.id));
        draft.achievements.unlockedIds = Array.from(set);
      }
    }, writeNow);

    if (writeNow) {
      this.dirty = false;
      newlyUnlocked.forEach((ach) => this.unlockSubscribers.forEach((cb) => cb(ach)));
    } else {
      this.scheduleFlush();
    }

    this.notifySubscribers(updated.achievements);
  }

  public claimAchievement(achievementId: string): {
    claimedCoins: number;
    newCoins: number;
    state: AchievementsProgressState;
  } {
    const target = ACHIEVEMENTS.find((a) => a.id === achievementId);
    const current = this.getState();
    if (
      !target ||
      !current.unlockedIds.includes(achievementId) ||
      current.claimedIds.includes(achievementId)
    ) {
      return {
        claimedCoins: 0,
        newCoins: getSavedCoins(),
        state: current,
      };
    }

    const newCoins = addCoins(target.rewardCoins);
    const updated = saveDataStore.update((draft) => {
      const set = new Set(draft.achievements.claimedIds);
      set.add(achievementId);
      draft.achievements.claimedIds = Array.from(set);
    }, true);

    this.notifySubscribers(updated.achievements);
    return {
      claimedCoins: target.rewardCoins,
      newCoins,
      state: updated.achievements,
    };
  }

  public claimAllAchievements(): {
    claimedCoins: number;
    newCoins: number;
    state: AchievementsProgressState;
  } {
    const current = this.getState();
    const unlockedSet = new Set(current.unlockedIds);
    const claimedSet = new Set(current.claimedIds);
    const claimable = ACHIEVEMENTS.filter(
      (a) => unlockedSet.has(a.id) && !claimedSet.has(a.id)
    );

    if (claimable.length === 0) {
      return {
        claimedCoins: 0,
        newCoins: getSavedCoins(),
        state: current,
      };
    }

    const totalCoins = claimable.reduce((sum, a) => sum + a.rewardCoins, 0);
    const newCoins = addCoins(totalCoins);

    const updated = saveDataStore.update((draft) => {
      const set = new Set(draft.achievements.claimedIds);
      claimable.forEach((a) => set.add(a.id));
      draft.achievements.claimedIds = Array.from(set);
    }, true);

    this.notifySubscribers(updated.achievements);
    return {
      claimedCoins: totalCoins,
      newCoins,
      state: updated.achievements,
    };
  }
}

export const achievements = new AchievementsManager();
