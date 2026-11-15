import React, { useEffect, useState } from 'react';
import { ACHIEVEMENTS, achievements } from '../../game/achievements';
import { soundManager } from '../../game/audio';
import { AchievementDefinition, AchievementsProgressState } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { IronCard } from '../IronCard';

type AchievementFilter = 'all' | 'ready' | 'locked';

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatStatProgress(ach: AchievementDefinition, rawValue: number): string {
  const clamped = Math.min(ach.target, Math.max(0, rawValue));
  if (ach.statKey === 'longestRunSec') {
    return `${formatDuration(clamped)} / ${formatDuration(ach.target)}`;
  }
  return `${clamped.toLocaleString()} / ${ach.target.toLocaleString()}`;
}

function renderAchievementIcon(icon: AchievementDefinition['icon'], unlocked: boolean) {
  switch (icon) {
    case 'clock':
      return <Icon id="ui_clock" size={24} muted={!unlocked} />;
    case 'crown':
      return <Icon id="ui_crown" size={24} muted={!unlocked} />;
    case 'swords':
      return <Icon id="ui_swords" size={24} muted={!unlocked} />;
    case 'coins':
      return <Icon id="soul_coin" size={24} muted={!unlocked} />;
    case 'flame':
      return <Icon id="ui_flame" size={24} muted={!unlocked} />;
    case 'sparkles':
      return <Icon id="ui_sparkles" size={24} muted={!unlocked} />;
    default:
      return <Icon id="ui_skull" size={24} muted={!unlocked} />;
  }
}

export const AchievementsPage: React.FC = () => {
  const [state, setState] = useState<AchievementsProgressState>(() => achievements.getState());
  const [filter, setFilter] = useState<AchievementFilter>('all');

  useEffect(() => {
    return achievements.subscribe((next) => setState(next));
  }, []);

  const unlockedSet = new Set(state.unlockedIds);
  const claimedSet = new Set(state.claimedIds);
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id)).length;
  const claimableList = ACHIEVEMENTS.filter(
    (a) => unlockedSet.has(a.id) && !claimedSet.has(a.id)
  );
  const unclaimedTotal = claimableList.reduce((sum, a) => sum + a.rewardCoins, 0);

  const visibleAchievements = ACHIEVEMENTS.filter((a) => {
    const isUnlocked = unlockedSet.has(a.id);
    if (filter === 'ready') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  const handleClaim = (achievementId: string) => {
    const res = achievements.claimAchievement(achievementId);
    if (res.claimedCoins > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  const handleClaimAll = () => {
    const res = achievements.claimAllAchievements();
    if (res.claimedCoins > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col px-3 pb-2 overflow-hidden gap-2.5">
      {/* Page Title & Claim All */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display font-bold text-xl tracking-[0.14em] text-[#e8dcc2]">
            ACHIEVEMENTS
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            <span className="font-mono-numbers font-bold text-[#e8dcc2]">
              {unlockedCount}/{ACHIEVEMENTS.length}
            </span>{' '}
            Unlocked ·{' '}
            <span className="font-mono-numbers font-bold text-[#e8dcc2]">
              {state.stats.runsCompleted}
            </span>{' '}
            Runs
          </p>
        </div>

        {unclaimedTotal > 0 && (
          <button
            type="button"
            onClick={handleClaimAll}
            className="min-h-[56px] px-3.5 rounded-[7px] border border-[#f2a93b] bg-gradient-to-b from-[#7a161e] to-[#3c090e] font-display font-bold text-[11px] tracking-wider text-[#f2a93b] cursor-pointer active:scale-95 shrink-0"
          >
            CLAIM ALL (+{unclaimedTotal})
          </button>
        )}
      </div>

      {/* Lifetime Telemetry Summary + Filter Strip */}
      <IronCard className="shrink-0" contentClassName="p-3 flex flex-col gap-2.5">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="font-body text-[11px] text-[#9c8e72]">Kills</div>
            <div className="font-mono-numbers text-sm font-bold text-[#e8dcc2]">
              {state.stats.totalKills.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="font-body text-[11px] text-[#9c8e72]">Best Time</div>
            <div className="font-mono-numbers text-sm font-bold text-[#5de4ff]">
              {formatDuration(state.stats.longestRunSec)}
            </div>
          </div>
          <div>
            <div className="font-body text-[11px] text-[#9c8e72]">Bosses</div>
            <div className="font-mono-numbers text-sm font-bold text-[#f2a93b]">
              {state.stats.bossesDefeated}
            </div>
          </div>
          <div>
            <div className="font-body text-[11px] text-[#9c8e72]">Peak Lv</div>
            <div className="font-mono-numbers text-sm font-bold text-[#e8dcc2]">
              {state.stats.highestLevel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-[#3a3f47]/60">
          {(['all', 'ready', 'locked'] as AchievementFilter[]).map((tab) => {
            const active = filter === tab;
            const label =
              tab === 'all'
                ? `All (${ACHIEVEMENTS.length})`
                : tab === 'ready'
                  ? `Unlocked (${unlockedCount})`
                  : `Active (${ACHIEVEMENTS.length - unlockedCount})`;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  setFilter(tab);
                }}
                className={`min-h-[56px] px-2 rounded-[6px] border font-display font-bold text-[11px] cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#360f14] border-[#b3121a] text-[#f2dfba]'
                    : 'bg-[#121418] border-[#3a3f47] text-[#9c8e72]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </IronCard>

      {/* Scrollable Achievements List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-2.5 pb-2">
        {visibleAchievements.map((ach) => {
          const currentVal = state.stats[ach.statKey] ?? 0;
          const isUnlocked = unlockedSet.has(ach.id);
          const isClaimed = claimedSet.has(ach.id);
          const canClaim = isUnlocked && !isClaimed;
          const pct = Math.max(0, Math.min(100, (currentVal / ach.target) * 100));

          return (
            <IronCard
              key={ach.id}
              highlight={canClaim ? 'gold' : 'none'}
              contentClassName="p-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`w-11 h-11 rounded-[9px] border flex items-center justify-center shrink-0 ${
                    canClaim
                      ? 'bg-[#24190c] border-[#f2a93b]'
                      : isUnlocked
                        ? 'bg-[#17151a] border-[#6b3a2a]'
                        : 'bg-[#101216] border-[#3a3f47] opacity-80'
                  }`}
                >
                  {renderAchievementIcon(ach.icon, isUnlocked)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h2 className="font-display font-bold text-sm text-[#e8dcc2]">
                      {ach.title}
                    </h2>
                    <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#f2a93b]">
                      <Icon id="soul_coin" size={14} />+{ach.rewardCoins}
                    </span>
                  </div>

                  <p className="font-body text-xs text-[#b5a589] leading-snug mt-0.5">
                    {ach.description}
                  </p>

                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex-1 h-2.5 rounded-[4px] bg-[#090a0d] border border-[#3a3f47] overflow-hidden p-[1px]">
                      <div
                        className="h-full rounded-[3px] transition-all duration-200"
                        style={{
                          width: `${pct}%`,
                          background: isUnlocked
                            ? 'linear-gradient(90deg, #b85c14 0%, #f2a93b 100%)'
                            : 'linear-gradient(90deg, #6e0b12 0%, #c91c24 55%, #ef6c28 100%)',
                        }}
                      />
                    </div>
                    <span className="font-mono-numbers text-[11px] font-bold text-[#e8dcc2] shrink-0">
                      {formatStatProgress(ach, currentVal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isClaimed ? (
                  <div className="min-h-[56px] px-2.5 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                    <Icon id="ui_check" size={16} />
                    <span>CLAIMED</span>
                  </div>
                ) : canClaim ? (
                  <button
                    type="button"
                    onClick={() => handleClaim(ach.id)}
                    className="min-h-[56px] min-w-[82px] px-3 rounded-[7px] border border-[#f2a93b] bg-gradient-to-b from-[#7a161e] to-[#3c090e] font-display font-bold text-xs tracking-wider text-[#fae4b0] shadow-[0_0_16px_rgba(242,169,59,0.5)] cursor-pointer active:scale-95"
                  >
                    CLAIM
                  </button>
                ) : (
                  <div className="min-h-[56px] px-2 flex items-center gap-1 font-display font-bold text-[11px] text-[#7c7361]">
                    <Icon id="ui_lock_closed" size={16} muted />
                    <span>LOCKED</span>
                  </div>
                )}
              </div>
            </IronCard>
          );
        })}
      </div>
    </div>
  );
};
