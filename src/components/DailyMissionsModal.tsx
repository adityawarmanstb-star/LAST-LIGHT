import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  KeyRound,
  ScrollText,
  Skull,
  Sparkles,
  X,
} from 'lucide-react';
import { dailyMissions, getTimeUntilReset } from '../game/dailyMissions';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import {
  MAX_RELIC_SLOTS,
  getMaxRelicSlots,
  getNextRelicSlotUnlockInfo,
  getRelicSeals,
  subscribeRelics,
} from '../game/relics';
import { soundManager } from '../game/audio';
import { DailyMission, DailyMissionsState } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface DailyMissionsModalProps {
  onClose: () => void;
  onOpenRelicShop?: () => void;
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

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  onClose,
  onOpenRelicShop,
}) => {
  const [state, setState] = useState<DailyMissionsState>(() => dailyMissions.getState());
  const [coins, setCoins] = useState<number>(() => getSavedCoins());
  const [relicSeals, setRelicSeals] = useState<number>(() => getRelicSeals());
  const [maxRelicSlots, setMaxRelicSlots] = useState<number>(() => getMaxRelicSlots());
  const [resetIn, setResetIn] = useState(() => getTimeUntilReset());

  useEffect(() => {
    const unsubMissions = dailyMissions.subscribe((next) => setState(next));
    const unsubCoins = subscribeCoins((nextCoins) => setCoins(nextCoins));
    const unsubRelics = subscribeRelics(({ relicSeals: nextSeals, maxRelicSlots: nextSlots }) => {
      setRelicSeals(nextSeals);
      setMaxRelicSlots(nextSlots);
    });
    const timer = window.setInterval(() => {
      setState(dailyMissions.ensureToday());
      setResetIn(getTimeUntilReset());
    }, 30000);

    return () => {
      unsubMissions();
      unsubCoins();
      unsubRelics();
      window.clearInterval(timer);
    };
  }, []);

  const unclaimedMissions = state.missions.filter((m) => m.completed && !m.claimed);
  const unclaimedTotal = unclaimedMissions.reduce((sum, m) => sum + m.rewardCoins, 0);
  const unclaimedSeals = unclaimedMissions.reduce(
    (sum, m) => sum + Math.max(1, m.rewardSeals || 1),
    0
  );

  const completedCount = state.missions.filter((m) => m.completed).length;
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockSlotNow = Boolean(nextSlotInfo && relicSeals >= nextSlotInfo.costSeals);

  const handleClaim = (missionId: string) => {
    const res = dailyMissions.claimMission(missionId);
    if (res.claimedCoins > 0 || res.claimedSeals > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
      setCoins(res.newCoins);
      setRelicSeals(res.newSeals);
    }
  };

  const handleClaimAll = () => {
    const res = dailyMissions.claimAllMissions();
    if (res.claimedCoins > 0 || res.claimedSeals > 0) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setState(res.state);
      setCoins(res.newCoins);
      setRelicSeals(res.newSeals);
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
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.82) 0%, rgba(30, 10, 13, 0.92) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="daily-missions-modal"
        dripCount={4}
        maxDripLength={22}
        className="max-w-xl w-full flex flex-col max-h-[88vh]"
        contentClassName="flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-[#3a3f47]/80 gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center shrink-0">
              <ScrollText className="w-5 h-5 text-[#f2a93b]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate">
                DAILY MISSIONS
              </h2>
              <p className="text-xs text-[#9c8e72] truncate">
                {completedCount}/3 completed · Resets in{' '}
                <span className="font-mono-numbers text-[#d8c9a8]">
                  {resetIn.hours}h {String(resetIn.minutes).padStart(2, '0')}m
                </span>
              </p>
            </div>
          </div>

          <IronButton
            seed="missions-close-btn"
            dripCount={0}
            onClick={onClose}
            className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
            aria-label="Close Daily Missions"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Relic Slot Progress & Currencies Banner */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#3a3f47]/65 bg-[#101318] flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex flex-col gap-1 flex-1 min-w-[190px]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-display font-bold tracking-wider uppercase text-[#e3c3c9]">
                <KeyRound className="w-3.5 h-3.5 text-[#c7566b]" />
                <span>
                  {nextSlotInfo
                    ? `Relic Slot ${nextSlotInfo.nextSlotNumber} Progress`
                    : `All ${MAX_RELIC_SLOTS} Relic Slots Unlocked`}
                </span>
              </span>
              {nextSlotInfo ? (
                <span className="font-mono-numbers text-[11px] font-semibold text-[#d8c9a8]">
                  {Math.min(relicSeals, nextSlotInfo.costSeals)} / {nextSlotInfo.costSeals} Seals
                </span>
              ) : (
                <span className="font-mono-numbers text-[11px] font-semibold text-[#f2a93b]">
                  {relicSeals} Seals Held
                </span>
              )}
            </div>
            {nextSlotInfo ? (
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ background: '#0b0c0e', border: '1px solid #454c57' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${Math.min(100, (relicSeals / nextSlotInfo.costSeals) * 100)}%`,
                    background: canUnlockSlotNow
                      ? 'linear-gradient(90deg, #8c121a 0%, #c9861f 100%)'
                      : 'linear-gradient(90deg, #5e0d13 0%, #a61d24 100%)',
                  }}
                />
              </div>
            ) : (
              <p className="text-[11px] text-[#9c8e72]">
                Maximum Relic loadout unlocked in Sanctuary Forge.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1.5 text-xs font-mono-numbers font-bold text-[#d8c9a8]"
              title="Soul Coins"
            >
              <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
              <span>{coins}</span>
            </div>

            {onOpenRelicShop && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  onOpenRelicShop();
                }}
                className={`min-h-[40px] px-3 rounded-[8px] border text-xs font-display font-bold tracking-wider uppercase transition-colors cursor-pointer shrink-0 ${
                  canUnlockSlotNow
                    ? 'bg-[#360b10] border-[#a8242e] text-[#f2dfba] hover:border-[#cfa15c]'
                    : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
                }`}
              >
                {canUnlockSlotNow ? 'Unlock Slot' : 'Relic Forge'}
              </button>
            )}
          </div>
        </div>

        {/* 3 Daily Mission Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-3.5">
          {state.missions.map((mission, idx) => {
            const pct = Math.max(0, Math.min(100, (mission.progress / mission.target) * 100));
            const canClaim = mission.completed && !mission.claimed;

            return (
              <ForgedIronFrame
                key={mission.id}
                seed={`mission-card-${mission.id}-${idx}`}
                dripCount={2}
                maxDripLength={12}
                stainCount={1}
                borderColor={
                  canClaim ? '#f2a93b' : mission.claimed ? '#3a3f47' : '#3a3f47'
                }
                glowColor={canClaim ? '#f2a93b' : undefined}
                glowStrength={canClaim ? 9 : 0}
                contentClassName="p-4 flex items-center justify-between gap-3.5"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-[10px] border flex items-center justify-center shrink-0 ${
                      canClaim
                        ? 'bg-[#1c160c] border-[#f2a93b]/70'
                        : mission.claimed
                          ? 'bg-[#111316] border-[#2e3239] opacity-75'
                          : 'bg-[#121417] border-[#3a3f47]'
                    }`}
                  >
                    {renderIcon(mission)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={`font-display font-bold text-sm tracking-wide ${
                          mission.claimed ? 'text-[#9c8e72]' : 'text-[#d8c9a8]'
                        }`}
                      >
                        {mission.title}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-xs font-mono-numbers font-semibold text-[#f2a93b]">
                        <Coins className="w-3 h-3" />+{mission.rewardCoins}
                      </span>
                      <span className="text-[#6b3a2a] text-xs" aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono-numbers font-semibold text-[#d8b4fe]">
                        <KeyRound className="w-3 h-3 text-[#c084fc]" />+{mission.rewardSeals || 1} Seal
                      </span>
                    </div>

                    <p className="text-xs text-[#9c8e72] mt-0.5 leading-snug">
                      {mission.description}
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
                            background: mission.completed
                              ? 'linear-gradient(90deg, #c9861f 0%, #f2a93b 100%)'
                              : 'linear-gradient(90deg, #7d0c12 0%, #e5303a 100%)',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono-numbers font-semibold text-[#d8c9a8] shrink-0">
                        {formatMissionProgress(mission)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action / Status */}
                <div className="shrink-0">
                  {mission.claimed ? (
                    <div className="min-h-[56px] px-3 flex items-center gap-1.5 text-xs font-semibold text-[#f2a93b]">
                      <Check className="w-4 h-4" />
                      <span>Claimed</span>
                    </div>
                  ) : canClaim ? (
                    <IronButton
                      seed={`mission-claim-${mission.id}`}
                      variant="blood"
                      dripCount={0}
                      onClick={() => handleClaim(mission.id)}
                      className="min-h-[56px] min-w-[92px] px-4 text-xs font-display font-bold tracking-wider"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                      <span className="text-[#f2a93b]">Claim</span>
                    </IronButton>
                  ) : (
                    <div className="min-h-[56px] px-3 flex items-center justify-center text-xs font-medium text-[#7c7361]">
                      Active
                    </div>
                  )}
                </div>
              </ForgedIronFrame>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 flex items-center justify-between gap-4">
          <span className="text-xs text-[#9c8e72] font-mono-numbers">
            {unclaimedTotal > 0
              ? `${unclaimedTotal} Coins · ${unclaimedSeals} ${unclaimedSeals === 1 ? 'Seal' : 'Seals'} ready to claim`
              : 'Each mission awards Soul Coins & 1 Relic Seal'}
          </span>

          {unclaimedTotal > 0 ? (
            <IronButton
              seed="missions-claim-all-btn"
              variant="blood"
              dripCount={2}
              onClick={handleClaimAll}
              className="min-h-[56px] px-6 text-sm font-semibold"
            >
              <Coins className="w-4 h-4 text-[#f2a93b]" />
              <span>
                Claim All (+{unclaimedTotal} · +{unclaimedSeals} {unclaimedSeals === 1 ? 'Seal' : 'Seals'})
              </span>
            </IronButton>
          ) : (
            <IronButton
              seed="missions-done-btn"
              variant="blood"
              dripCount={2}
              onClick={onClose}
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
