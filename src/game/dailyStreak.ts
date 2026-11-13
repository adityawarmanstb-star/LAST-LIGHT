import { getTodayDateKey } from './dailyMissions';
import { addCoins } from './metaProgression';
import { saveDataStore } from './saveData';
import { DailyStreakState } from './types';

export const STREAK_REWARD_SCHEDULE = [15, 25, 35, 50, 70, 95, 130] as const;

export interface DailyStreakClaimResult {
  state: DailyStreakState;
  awardedToday: boolean;
  rewardCoins: number;
  streakContinued: boolean;
}

function parseDateKeyUtcMs(dateKey: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return Date.UTC(year, month - 1, day);
}

function diffCalendarDays(fromKey: string, toKey: string): number | null {
  const fromMs = parseDateKeyUtcMs(fromKey);
  const toMs = parseDateKeyUtcMs(toKey);
  if (fromMs === null || toMs === null) return null;
  return Math.round((toMs - fromMs) / 86400000);
}

export function getRewardForStreakDay(streakDay: number): number {
  const index = Math.max(0, Math.min(STREAK_REWARD_SCHEDULE.length - 1, streakDay - 1));
  return STREAK_REWARD_SCHEDULE[index];
}

class DailyStreakManager {
  public getState(): DailyStreakState {
    const saved = saveDataStore.read().dailyStreak;
    if (saved) {
      return { ...saved };
    }
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastLoginDateKey: '',
      lastRewardCoins: 0,
    };
  }

  public getNextDayReward(currentStreak: number): number {
    return getRewardForStreakDay(Math.max(1, currentStreak + 1));
  }

  /**
   * Checks today's date against the saved login date.
   * Grants bonus coins automatically once per calendar day, incrementing the streak on consecutive days
   * and resetting to Day 1 if a day was missed.
   */
  public checkAndClaimDailyLogin(now: Date = new Date()): DailyStreakClaimResult {
    const todayKey = getTodayDateKey(now);
    const saved = saveDataStore.read().dailyStreak;

    // Already checked in today
    if (saved && saved.lastLoginDateKey === todayKey) {
      return {
        state: { ...saved },
        awardedToday: false,
        rewardCoins: 0,
        streakContinued: false,
      };
    }

    let nextStreak = 1;
    let streakContinued = false;
    let bestStreak = saved ? saved.bestStreak : 1;

    if (saved) {
      const dayDiff = diffCalendarDays(saved.lastLoginDateKey, todayKey);
      if (dayDiff === 1) {
        nextStreak = saved.currentStreak + 1;
        streakContinued = true;
      } else if (dayDiff !== null && dayDiff < 0) {
        // Guard against backward system-clock skew: keep current streak without extra reward
        return {
          state: { ...saved },
          awardedToday: false,
          rewardCoins: 0,
          streakContinued: false,
        };
      } else {
        // Missed 1+ days or invalid date -> reset consecutive streak back to Day 1
        nextStreak = 1;
      }
      bestStreak = Math.max(bestStreak, nextStreak);
    }

    const rewardCoins = getRewardForStreakDay(nextStreak);
    const nextState: DailyStreakState = {
      currentStreak: nextStreak,
      bestStreak,
      lastLoginDateKey: todayKey,
      lastRewardCoins: rewardCoins,
    };

    saveDataStore.update((draft) => {
      draft.dailyStreak = { ...nextState };
    });
    addCoins(rewardCoins);

    return {
      state: nextState,
      awardedToday: true,
      rewardCoins,
      streakContinued,
    };
  }
}

export const dailyStreak = new DailyStreakManager();
