import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  Gem,
  Play,
  ScrollText,
  Skull,
  Sparkles,
} from 'lucide-react';
import { dailyMissions, getTimeUntilReset } from '../../game/dailyMissions';
import { soundManager } from '../../game/audio';
import { DailyMission, DailyMissionsState } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { IronCard } from '../IronCard';

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
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  const handleClaimChest = () => {
    const res = dailyMissions.claimDailyChest();
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setChestClaimed(true);
    }
  };

  const handleClaimAll = () => {
    const res = dailyMissions.claimAllMissions();
    if (res.claimedCoins > 0 || res.claimedSeals > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
    }
  };

  const renderIcon = (mission: DailyMission) => {
    const cls = 'w-5 h-5';
    switch (mission.icon) {
      case 'skull':
        return <Skull className={`${cls} text-[#e5303a]`} />;
      case 'clock':
        return <Clock className={`${cls} text-[#5de4ff]`} />;
      case 'coins':
        return <Coins className={`${cls} text-[#f2a93b]`} />;
      case 'crown':
        return <Crown className={`${cls} text-[#f2a93b]`} />;
      case 'sparkles':
        return <Sparkles className={`${cls} text-[#5de4ff]`} />;
      case 'flame':
        return <Flame className={`${cls} text-[#e5303a]`} />;
      default:
        return <ScrollText className={`${cls} text-[#d8c9a8]`} />;
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col px-3 pb-2 overflow-hidden">
      {/* Page Title */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-2.5">
        <div>
          <h1 className="font-display font-bold text-xl tracking-[0.14em] text-[#e8dcc2]">
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
          <button
            type="button"
            onClick={handleClaimAll}
            className="min-h-[40px] px-3 rounded-[7px] border border-[#f2a93b] bg-gradient-to-b from-[#6e121a] to-[#34070c] font-display font-bold text-[11px] tracking-wider text-[#f2a93b] cursor-pointer active:scale-95 shrink-0"
          >
            CLAIM ALL ({unclaimedCount})
          </button>
        )}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-3 pb-2">
        {/* Daily Chest Progress Tracker */}
        <IronCard
          highlight={canClaimChest ? 'gold' : 'ember'}
          contentClassName="p-3.5 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-[9px] border flex items-center justify-center shrink-0 ${
                  canClaimChest
                    ? 'bg-[#251a0c] border-[#f2a93b]'
                    : 'bg-[#101216] border-[#4b3c32]'
                }`}
              >
                <Crown className={`w-6 h-6 ${canClaimChest ? 'text-[#f2a93b]' : 'text-[#c98f3a]'}`} />
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
                <div className="min-h-[42px] px-3 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                  <Check className="w-4 h-4" />
                  <span>CLAIMED</span>
                </div>
              ) : canClaimChest ? (
                <button
                  type="button"
                  onClick={handleClaimChest}
                  className="min-h-[44px] px-3.5 rounded-[7px] border border-[#f2a93b] bg-gradient-to-b from-[#7a161e] to-[#3c090e] font-display font-bold text-xs tracking-wider text-[#fae4b0] shadow-[0_0_16px_rgba(242,169,59,0.5)] cursor-pointer active:scale-95"
                >
                  CLAIM CHEST
                </button>
              ) : (
                <span className="font-mono-numbers text-xs font-bold text-[#9c8e72] px-2">
                  {Math.round(chestPct)}%
                </span>
              )}
            </div>
          </div>

          {/* Fiery Chest Progress Bar */}
          <div className="w-full h-3 rounded-[4px] bg-[#090a0d] border border-[#463830] overflow-hidden p-[1px]">
            <div
              className="h-full rounded-[3px] transition-all duration-300"
              style={{
                width: `${chestPct}%`,
                background:
                  completedCount >= 3
                    ? 'linear-gradient(90deg, #b85c14 0%, #f2a93b 55%, #fae4b0 100%)'
                    : 'linear-gradient(90deg, #6b0b12 0%, #b3121a 55%, #ea580c 100%)',
                boxShadow: '0 0 10px rgba(234, 88, 12, 0.55)',
              }}
            />
          </div>
        </IronCard>

        {/* Scrollable Quest Cards */}
        {state.missions.map((mission) => {
          const pct = Math.max(0, Math.min(100, (mission.progress / mission.target) * 100));
          const canClaim = mission.completed && !mission.claimed;

          return (
            <IronCard
              key={mission.id}
              highlight={canClaim ? 'gold' : 'none'}
              contentClassName="p-3.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div
                  className={`w-11 h-11 rounded-[9px] border flex items-center justify-center shrink-0 ${
                    canClaim
                      ? 'bg-[#24190c] border-[#f2a93b]'
                      : 'bg-[#101216] border-[#454c57]'
                  }`}
                >
                  {renderIcon(mission)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h3 className="font-display font-bold text-sm text-[#e8dcc2]">
                      {mission.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#f2a93b]">
                      <Coins className="w-3 h-3" />+{mission.rewardCoins}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#d8b4fe]">
                      <Gem className="w-3 h-3 text-[#c084fc]" />+{mission.rewardSeals || 1}
                    </span>
                  </div>

                  <p className="font-body text-xs text-[#b5a589] leading-snug mt-0.5">
                    {mission.description}
                  </p>

                  {/* Fiery Progress Bar */}
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="flex-1 h-2.5 rounded-[4px] bg-[#090a0d] border border-[#3a3f47] overflow-hidden p-[1px]">
                      <div
                        className="h-full rounded-[3px] transition-all duration-200"
                        style={{
                          width: `${pct}%`,
                          background: mission.completed
                            ? 'linear-gradient(90deg, #b85c14 0%, #f2a93b 100%)'
                            : 'linear-gradient(90deg, #6e0b12 0%, #c91c24 52%, #ef6c28 100%)',
                          boxShadow: canClaim
                            ? '0 0 10px rgba(242, 169, 59, 0.55)'
                            : '0 0 8px rgba(229, 48, 58, 0.4)',
                        }}
                      />
                    </div>
                    <span className="font-mono-numbers text-[11px] font-bold text-[#e8dcc2] shrink-0">
                      {formatMissionProgress(mission)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: GO / CLAIM / CLAIMED */}
              <div className="shrink-0">
                {mission.claimed ? (
                  <div className="min-h-[44px] px-2.5 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                    <Check className="w-4 h-4" />
                    <span>CLAIMED</span>
                  </div>
                ) : canClaim ? (
                  <button
                    type="button"
                    onClick={() => handleClaim(mission.id)}
                    className="min-h-[46px] min-w-[82px] px-3 rounded-[7px] border border-[#f2a93b] bg-gradient-to-b from-[#7a161e] to-[#3c090e] font-display font-bold text-xs tracking-wider text-[#fae4b0] shadow-[0_0_16px_rgba(242,169,59,0.5)] cursor-pointer active:scale-95"
                  >
                    CLAIM
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playUiClick();
                      haptics.tap('medium');
                      onStartGame();
                    }}
                    className="min-h-[46px] min-w-[74px] px-3 rounded-[7px] border border-[#545c6a] bg-gradient-to-b from-[#2b2f38] to-[#13151a] font-display font-bold text-xs tracking-wider text-[#e8dcc2] flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#e5303a] text-[#e5303a]" />
                    <span>GO</span>
                  </button>
                )}
              </div>
            </IronCard>
          );
        })}
      </div>
    </div>
  );
};
