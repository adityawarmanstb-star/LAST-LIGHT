import React, { useEffect, useState } from 'react';
import { ACHIEVEMENTS, achievements } from '../../game/achievements';
import { soundManager } from '../../game/audio';
import { AchievementDefinition, AchievementsProgressState } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { NineSlice } from '../ui/NineSlice';
import { UiBar } from '../ui/UiBar';
import { UiButton } from '../ui/UiButton';
import { UI_SPRITES } from '../ui/uiConfig';

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
    <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 pb-2 overflow-hidden gap-2">
      {/* Page Title & Claim All */}
      <div className="shrink-0 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display font-bold text-[clamp(17px,3.5vw,21px)] tracking-[0.14em] text-[#e8dcc2]">
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
          <UiButton tone="blood" size="sm" onClick={handleClaimAll}>
            CLAIM ALL (+{unclaimedTotal})
          </UiButton>
        )}
      </div>

      {/* Lifetime Summary + Filter Strip */}
      <NineSlice
        variant="panelIronDark"
        tileTexture="stone"
        padding="0px"
        className="shrink-0"
        contentClassName="p-2.5 flex flex-col gap-2"
      >
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
              <UiButton
                key={tab}
                tone={active ? 'blood' : 'iron'}
                active={active}
                size="xs"
                onClick={() => {
                  soundManager.playUiClick();
                  setFilter(tab);
                }}
              >
                {label}
              </UiButton>
            );
          })}
        </div>
      </NineSlice>

      {/* Scrollable Achievements List */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 flex flex-col gap-2 pb-2">
        {visibleAchievements.map((ach) => {
          const currentVal = state.stats[ach.statKey] ?? 0;
          const isUnlocked = unlockedSet.has(ach.id);
          const isClaimed = claimedSet.has(ach.id);
          const canClaim = isUnlocked && !isClaimed;
          const pct = Math.max(0, Math.min(100, (currentVal / ach.target) * 100));

          return (
            <NineSlice
              key={ach.id}
              variant={canClaim ? 'cardOrnateGold' : 'panelIronDark'}
              tileTexture="stone"
              highlight={canClaim ? 'gold' : 'none'}
              padding="0px"
              contentClassName="p-3 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <div
                  style={{ width: 44, aspectRatio: '1 / 1' }}
                  className="relative flex items-center justify-center shrink-0"
                >
                  <img
                    src={UI_SPRITES.roundSquareSocket}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ imageRendering: 'auto' }}
                    className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                  />
                  <span className="relative z-10 flex items-center justify-center">
                    {renderAchievementIcon(ach.icon, isUnlocked)}
                  </span>
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

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <UiBar
                        percent={pct}
                        fill={isUnlocked ? 'gold' : 'crimson'}
                        heightClassName="h-[13px]"
                        frameBorderWidth="2px 6px"
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
                  <div className="min-h-[40px] px-2 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                    <Icon id="ui_check" size={16} />
                    <span>CLAIMED</span>
                  </div>
                ) : canClaim ? (
                  <UiButton tone="blood" size="sm" onClick={() => handleClaim(ach.id)}>
                    CLAIM
                  </UiButton>
                ) : (
                  <div className="min-h-[40px] px-2 flex items-center gap-1 font-display font-bold text-[11px] text-[#7c7361]">
                    <Icon id="ui_lock_closed" size={16} muted />
                    <span>LOCKED</span>
                  </div>
                )}
              </div>
            </NineSlice>
          );
        })}
      </div>
    </div>
  );
};
