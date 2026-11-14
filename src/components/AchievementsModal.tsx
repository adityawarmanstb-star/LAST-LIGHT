import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  Lock,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { ACHIEVEMENTS, achievements } from '../game/achievements';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { soundManager } from '../game/audio';
import { AchievementDefinition, AchievementsProgressState } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface AchievementsModalProps {
  onClose: () => void;
}

type AchievementFilter = 'all' | 'unlocked' | 'locked';

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatStatProgress(
  achievement: AchievementDefinition,
  rawValue: number
): string {
  const clamped = Math.min(achievement.target, Math.max(0, rawValue));
  if (achievement.statKey === 'longestRunSec') {
    return `${formatDuration(clamped)} / ${formatDuration(achievement.target)}`;
  }
  return `${clamped.toLocaleString()} / ${achievement.target.toLocaleString()}`;
}

function renderAchievementIcon(icon: AchievementDefinition['icon'], unlocked: boolean) {
  const cls = 'w-5 h-5';
  if (!unlocked) {
    switch (icon) {
      case 'clock':
        return <Clock className={`${cls} text-[#6b7280]`} />;
      case 'crown':
        return <Crown className={`${cls} text-[#6b7280]`} />;
      case 'swords':
        return <Swords className={`${cls} text-[#6b7280]`} />;
      case 'coins':
        return <Coins className={`${cls} text-[#6b7280]`} />;
      case 'flame':
        return <Flame className={`${cls} text-[#6b7280]`} />;
      case 'sparkles':
        return <Sparkles className={`${cls} text-[#6b7280]`} />;
      default:
        return <Skull className={`${cls} text-[#6b7280]`} />;
    }
  }

  switch (icon) {
    case 'clock':
      return <Clock className={`${cls} text-[#5de4ff]`} />;
    case 'crown':
      return <Crown className={`${cls} text-[#f2a93b]`} />;
    case 'swords':
      return <Swords className={`${cls} text-[#e5303a]`} />;
    case 'coins':
      return <Coins className={`${cls} text-[#f2a93b]`} />;
    case 'flame':
      return <Flame className={`${cls} text-[#e5303a]`} />;
    case 'sparkles':
      return <Sparkles className={`${cls} text-[#5de4ff]`} />;
    default:
      return <Skull className={`${cls} text-[#e5303a]`} />;
  }
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ onClose }) => {
  const [state, setState] = useState<AchievementsProgressState>(() => achievements.getState());
  const [coins, setCoins] = useState<number>(() => getSavedCoins());
  const [filter, setFilter] = useState<AchievementFilter>('all');

  useEffect(() => {
    const unsubAchievements = achievements.subscribe((next) => setState(next));
    const unsubCoins = subscribeCoins((nextCoins) => setCoins(nextCoins));
    return () => {
      unsubAchievements();
      unsubCoins();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const unlockedSet = new Set(state.unlockedIds);
  const claimedSet = new Set(state.claimedIds);

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
  const lockedCount = ACHIEVEMENTS.length - unlockedCount;

  const claimableList = ACHIEVEMENTS.filter(
    (a) => unlockedSet.has(a.id) && !claimedSet.has(a.id)
  );
  const unclaimedTotal = claimableList.reduce((sum, a) => sum + a.rewardCoins, 0);

  const visibleAchievements = ACHIEVEMENTS.filter((a) => {
    const isUnlocked = unlockedSet.has(a.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  const handleClose = () => {
    soundManager.playUiClick();
    haptics.tap('light');
    onClose();
  };

  const handleFilterChange = (next: AchievementFilter) => {
    soundManager.playUiClick();
    haptics.tap('light');
    setFilter(next);
  };

  const handleClaim = (achievementId: string) => {
    const res = achievements.claimAchievement(achievementId);
    if (res.claimedCoins > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
      setCoins(res.newCoins);
    }
  };

  const handleClaimAll = () => {
    const res = achievements.claimAllAchievements();
    if (res.claimedCoins > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
      setCoins(res.newCoins);
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.85) 0%, rgba(30, 10, 13, 0.94) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="achievements-modal-frame"
        dripCount={5}
        maxDripLength={22}
        className="max-w-3xl w-full flex flex-col max-h-[90vh]"
        contentClassName="flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-[#3a3f47]/80 gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-[#f2a93b]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate">
                ACHIEVEMENTS
              </h2>
              <p className="text-xs text-[#9c8e72] font-mono-numbers truncate">
                Unlocked {unlockedCount} / {ACHIEVEMENTS.length}
                <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">
                  ·
                </span>
                Runs Completed {state.stats.runsCompleted.toLocaleString()}
              </p>
            </div>
          </div>

          <IronButton
            seed="achievements-close-btn"
            dripCount={0}
            onClick={handleClose}
            className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
            aria-label="Close Achievements"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Lifetime Milestone Telemetry Strip */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-[#3a3f47]/65 bg-[#101318] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-[#8e8168]">
              Total Kills
            </span>
            <span className="font-mono-numbers text-base font-bold text-[#e8dcc2] tabular-nums">
              {state.stats.totalKills.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-[#8e8168]">
              Longest Run
            </span>
            <span className="font-mono-numbers text-base font-bold text-[#5de4ff] tabular-nums">
              {formatDuration(state.stats.longestRunSec)}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-[#8e8168]">
              Bosses Defeated
            </span>
            <span className="font-mono-numbers text-base font-bold text-[#f2a93b] tabular-nums">
              {state.stats.bossesDefeated.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-[#8e8168]">
              Peak Level
            </span>
            <span className="font-mono-numbers text-base font-bold text-[#d8c9a8] tabular-nums">
              Lv. {state.stats.highestLevel}
            </span>
          </div>
        </div>

        {/* Filter Bar + Soul Coins */}
        <div className="px-4 sm:px-6 pt-3 pb-2.5 flex items-center justify-between gap-3 flex-wrap shrink-0 border-b border-[#3a3f47]/40">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleFilterChange('all')}
              className={`min-h-[40px] px-3.5 rounded-[8px] border text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              All ({ACHIEVEMENTS.length})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('unlocked')}
              className={`min-h-[40px] px-3.5 rounded-[8px] border text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                filter === 'unlocked'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              Unlocked ({unlockedCount})
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange('locked')}
              className={`min-h-[40px] px-3.5 rounded-[8px] border text-xs font-semibold tracking-wide transition-colors cursor-pointer ${
                filter === 'locked'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              In Progress ({lockedCount})
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#d8c9a8]"
            title="Soul Coins"
          >
            <Coins className="w-4 h-4 text-[#f2a93b]" />
            <span>{coins}</span>
          </div>
        </div>

        {/* Achievements List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3">
          {visibleAchievements.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-[10px] border border-[#3a3f47]/70 bg-[#14171b]/80">
              <Trophy className="w-9 h-9 text-[#6b3a2a] mx-auto mb-3" />
              <p className="font-display text-sm font-bold tracking-wider text-[#d8c9a8] uppercase mb-1">
                {filter === 'unlocked'
                  ? 'No Achievements Unlocked Yet'
                  : 'Every Milestone Conquered'}
              </p>
              <p className="text-xs text-[#9c8e72] max-w-sm mx-auto">
                {filter === 'unlocked'
                  ? 'Venture into the dark to claim your first combat and survival milestones.'
                  : 'All recorded Warden achievements have been unlocked.'}
              </p>
            </div>
          ) : (
            visibleAchievements.map((ach, idx) => {
              const currentVal = state.stats[ach.statKey] ?? 0;
              const isUnlocked = unlockedSet.has(ach.id);
              const isClaimed = claimedSet.has(ach.id);
              const canClaim = isUnlocked && !isClaimed;
              const pct = Math.max(0, Math.min(100, (currentVal / ach.target) * 100));

              return (
                <ForgedIronFrame
                  key={ach.id}
                  seed={`achievement-card-${ach.id}-${idx}`}
                  dripCount={canClaim ? 2 : 1}
                  maxDripLength={10}
                  borderColor={
                    canClaim ? '#f2a93b' : isUnlocked ? '#6b3a2a' : '#3a3f47'
                  }
                  glowColor={canClaim ? '#f2a93b' : undefined}
                  glowStrength={canClaim ? 9 : 0}
                  contentClassName="p-4 flex items-center justify-between gap-3.5"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-[10px] border flex items-center justify-center shrink-0 ${
                        canClaim
                          ? 'bg-[#1c160c] border-[#f2a93b]/75'
                          : isUnlocked
                            ? 'bg-[#17151a] border-[#6b3a2a]'
                            : 'bg-[#121417] border-[#3a3f47] opacity-75'
                      }`}
                    >
                      {renderAchievementIcon(ach.icon, isUnlocked)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`font-display font-bold text-sm tracking-wide ${
                            isUnlocked ? 'text-[#e8dcc2]' : 'text-[#b5a992]'
                          }`}
                        >
                          {ach.title}
                        </h3>
                        <span className="text-[#6b3a2a] text-xs" aria-hidden="true">
                          ·
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-mono-numbers font-semibold text-[#f2a93b]">
                          <Coins className="w-3 h-3" />+{ach.rewardCoins}
                        </span>
                      </div>

                      <p className="text-xs text-[#9c8e72] mt-0.5 leading-snug">
                        {ach.description}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{
                            background: '#0b0c0e',
                            border: '1px solid #3a3f47',
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${pct}%`,
                              background: isUnlocked
                                ? 'linear-gradient(90deg, #c9861f 0%, #f2a93b 100%)'
                                : 'linear-gradient(90deg, #7d0c12 0%, #e5303a 100%)',
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-mono-numbers font-semibold text-[#d8c9a8] shrink-0 tabular-nums">
                          {formatStatProgress(ach, currentVal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action / Status */}
                  <div className="shrink-0">
                    {isClaimed ? (
                      <div className="min-h-[56px] px-3 flex items-center gap-1.5 text-xs font-semibold text-[#f2a93b]">
                        <Check className="w-4 h-4" />
                        <span>Claimed</span>
                      </div>
                    ) : canClaim ? (
                      <IronButton
                        seed={`achievement-claim-${ach.id}`}
                        variant="blood"
                        dripCount={0}
                        onClick={() => handleClaim(ach.id)}
                        className="min-h-[56px] min-w-[92px] px-4 text-xs font-display font-bold tracking-wider"
                      >
                        <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                        <span className="text-[#f2a93b]">Claim</span>
                      </IronButton>
                    ) : (
                      <div className="min-h-[56px] px-3 flex items-center gap-1.5 text-xs font-medium text-[#7c7361]">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </ForgedIronFrame>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-[#9c8e72] font-mono-numbers">
            {unclaimedTotal > 0
              ? `${claimableList.length} ${claimableList.length === 1 ? 'milestone' : 'milestones'} ready (+${unclaimedTotal} Coins)`
              : 'Lifetime progress updates automatically across every run'}
          </span>

          {unclaimedTotal > 0 ? (
            <IronButton
              seed="achievements-claim-all-btn"
              variant="blood"
              dripCount={2}
              onClick={handleClaimAll}
              className="min-h-[56px] px-6 text-sm font-semibold"
            >
              <Coins className="w-4 h-4 text-[#f2a93b]" />
              <span>Claim All (+{unclaimedTotal})</span>
            </IronButton>
          ) : (
            <IronButton
              seed="achievements-done-btn"
              variant="blood"
              dripCount={2}
              onClick={handleClose}
              className="min-h-[56px] px-7 text-sm font-semibold"
            >
              Done
            </IronButton>
          )}
        </div>
      </ForgedIronFrame>
    </div>
  );
};
