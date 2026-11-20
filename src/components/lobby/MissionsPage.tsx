import React, { useEffect, useState } from 'react';
import { dailyMissions, getTimeUntilReset } from '../../game/dailyMissions';
import { soundManager } from '../../game/audio';
import { DailyMission, DailyMissionsState } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { NineSlice } from '../ui/NineSlice';
import { UiBar } from '../ui/UiBar';
import { UiButton } from '../ui/UiButton';
import { UI_SPRITES } from '../ui/uiConfig';

interface MissionsPageProps {
  onStartGame: () => void;
}

function formatMissionProgress(mission: DailyMission): string {
  if (mission.type === 'survive_seconds') {
    const pMin = Math.floor(mission.progress / 60);
    const pSec = mission.progress % 60;
    const tMin = Math.floor(mission.target / 60);
    const tSec = mission.target % 60;
    return `${pMin}:${String(pSec).padStart(2, '0')} / ${tMin}:${String(tSec).padStart(2, '0')}`;
  }
  return `${mission.progress} / ${mission.target}`;
}

export const MissionsPage: React.FC<MissionsPageProps> = ({ onStartGame }) => {
  const [state, setState] = useState<DailyMissionsState>(() => dailyMissions.getState());
  const [chestClaimed, setChestClaimed] = useState<boolean>(() => dailyMissions.isDailyChestClaimed());
  const [resetIn, setResetIn] = useState(() => getTimeUntilReset());

  useEffect(() => {
    const unsubMissions = dailyMissions.subscribe((next) => {
      setState(next);
      setChestClaimed(dailyMissions.isDailyChestClaimed());
    });
    const timer = window.setInterval(() => {
      setState(dailyMissions.ensureToday());
      setChestClaimed(dailyMissions.isDailyChestClaimed());
      setResetIn(getTimeUntilReset());
    }, 30000);

    return () => {
      unsubMissions();
      window.clearInterval(timer);
    };
  }, []);

  const completedCount = state.missions.filter((m) => m.completed).length;
  const chestPct = Math.min(100, (completedCount / 3) * 100);
  const canClaimChest = completedCount >= 3 && !chestClaimed;
  const unclaimedCount = state.missions.filter((m) => m.completed && !m.claimed).length;

  const handleClaim = (missionId: string) => {
    const res = dailyMissions.claimMission(missionId);
    if (res.claimedCoins > 0 || res.claimedSeals > 0) {
      soundManager.playCoinGain(res.claimedCoins >= 100 ? 'large' : 'medium');
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  const handleClaimChest = () => {
    const res = dailyMissions.claimDailyChest();
    if (res.success) {
      soundManager.playCoinGain('large');
      haptics.tap('heavy');
      setChestClaimed(true);
    }
  };

  const handleClaimAll = () => {
    const res = dailyMissions.claimAllMissions();
    if (res.claimedCoins > 0 || res.claimedSeals > 0) {
      soundManager.playCoinGain(res.claimedCoins >= 150 ? 'jackpot' : 'large');
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  const renderIcon = (mission: DailyMission) => {
    switch (mission.icon) {
      case 'skull':
        return <Icon id="ui_skull" size={24} />;
      case 'clock':
        return <Icon id="ui_clock" size={24} />;
      case 'coins':
        return <Icon id="soul_coin" size={24} />;
      case 'crown':
        return <Icon id="ui_crown" size={24} />;
      case 'sparkles':
        return <Icon id="ui_sparkles" size={24} />;
      case 'flame':
        return <Icon id="ui_day_flame" size={24} />;
      default:
        return <Icon id="ui_scroll" size={24} />;
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 pb-2 overflow-hidden">
      {/* Page Title */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-2">
        <div>
          <h1 className="font-display font-bold text-[clamp(17px,3.5vw,21px)] tracking-[0.14em] text-[#e8dcc2]">
            DAILY MISSIONS
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            Resets in{' '}
            <span className="font-mono-numbers font-bold text-[#e8dcc2]">
              {resetIn.hours}h {String(resetIn.minutes).padStart(2, '0')}m
            </span>{' '}
            · Earn Coins &amp; Gems
          </p>
        </div>

        {unclaimedCount > 0 && (
          <UiButton tone="blood" size="sm" onClick={handleClaimAll}>
            CLAIM ALL ({unclaimedCount})
          </UiButton>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 flex flex-col gap-2.5 pb-2">
        {/* Daily Chest Progress Tracker */}
        <NineSlice
          variant={canClaimChest ? 'cardOrnateGold' : 'panelIronDark'}
          tileTexture="stone"
          highlight={canClaimChest ? 'gold' : 'ember'}
          padding="0px"
          contentClassName="p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
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
                  <Icon id="ui_crown" size={24} />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-sm tracking-wide text-[#f2dfba]">
                    DAILY WAR CHEST
                  </h2>
                  <span className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                    {completedCount} / 3 Quests
                  </span>
                </div>
                <p className="font-body text-xs text-[#b5a589]">
                  Reward: <span className="text-[#f2a93b] font-semibold">+120 Coins</span> ·{' '}
                  <span className="text-[#c084fc] font-semibold">+2 Gems</span>
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {chestClaimed ? (
                <div className="min-h-[40px] px-2.5 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                  <Icon id="ui_check" size={16} />
                  <span>CLAIMED</span>
                </div>
              ) : canClaimChest ? (
                <UiButton tone="blood" size="sm" onClick={handleClaimChest}>
                  CLAIM CHEST
                </UiButton>
              ) : (
                <span className="font-mono-numbers text-xs font-bold text-[#9c8e72] px-2">
                  {Math.round(chestPct)}%
                </span>
              )}
            </div>
          </div>

          <UiBar
            percent={chestPct}
            fill={completedCount >= 3 ? 'gold' : 'crimson'}
            heightClassName="h-[15px]"
          />
        </NineSlice>

        {/* Scrollable Quest Cards */}
        {state.missions.map((mission) => {
          const pct = Math.max(0, Math.min(100, (mission.progress / mission.target) * 100));
          const canClaim = mission.completed && !mission.claimed;

          return (
            <NineSlice
              key={mission.id}
              variant="panelIronDark"
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
                    {renderIcon(mission)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h3 className="font-display font-bold text-sm text-[#e8dcc2]">
                      {mission.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#f2a93b]">
                      <Icon id="soul_coin" size={14} />+{mission.rewardCoins}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#d8b4fe]">
                      <Icon id="crimson_gem" size={14} />+{mission.rewardSeals || 1}
                    </span>
                  </div>

                  <p className="font-body text-xs text-[#b5a589] leading-snug mt-0.5">
                    {mission.description}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <UiBar
                        percent={pct}
                        fill={mission.completed ? 'gold' : 'crimson'}
                        heightClassName="h-[13px]"
                        frameBorderWidth="2px 6px"
                      />
                    </div>
                    <span className="font-mono-numbers text-[11px] font-bold text-[#e8dcc2] shrink-0">
                      {formatMissionProgress(mission)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {mission.claimed ? (
                  <div className="min-h-[40px] px-2 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                    <Icon id="ui_check" size={16} />
                    <span>CLAIMED</span>
                  </div>
                ) : canClaim ? (
                  <UiButton tone="blood" size="sm" onClick={() => handleClaim(mission.id)}>
                    CLAIM
                  </UiButton>
                ) : (
                  <UiButton
                    tone="iron"
                    size="sm"
                    onClick={() => {
                      soundManager.playUiClick();
                      onStartGame();
                    }}
                  >
                    <Icon id="ui_play" size={14} />
                    <span>GO</span>
                  </UiButton>
                )}
              </div>
            </NineSlice>
          );
        })}
      </div>
    </div>
  );
};
