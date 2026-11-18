import React, { useEffect, useRef, useState } from 'react';
import {
  ELITE_SLAYER_MILESTONE_STEP,
  achievements,
} from '../game/achievements';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UiBar } from './ui/UiBar';

const MILESTONE_BANNER_DURATION_MS = 4600;

function formatCompactTarget(value: number): string {
  if (value >= 1000 && value % 1000 === 0) {
    return `${value / 1000}K`;
  }
  return value.toLocaleString();
}

export const EliteSlayerCounter: React.FC = () => {
  const [totalKills, setTotalKills] = useState<number>(
    () => achievements.getState().stats.totalKills
  );
  const [activeMilestone, setActiveMilestone] = useState<number | null>(null);
  const [milestoneBannerSeq, setMilestoneBannerSeq] = useState<number>(0);
  const [killPopSeq, setKillPopSeq] = useState<number>(0);

  const prevKillsRef = useRef<number>(totalKills);
  const lastPopAtRef = useRef<number>(0);
  const prevTierRef = useRef<number>(
    Math.floor(totalKills / ELITE_SLAYER_MILESTONE_STEP)
  );
  const bannerTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = achievements.subscribe((state) => {
      const nextKills = state.stats.totalKills;
      const prevKills = prevKillsRef.current;

      if (nextKills !== prevKills) {
        prevKillsRef.current = nextKills;
        setTotalKills(nextKills);
        if (nextKills > prevKills) {
          const now = performance.now();
          if (now - lastPopAtRef.current >= 450) {
            lastPopAtRef.current = now;
            setKillPopSeq((seq) => seq + 1);
          }
        }
      }

      const nextTier = Math.floor(nextKills / ELITE_SLAYER_MILESTONE_STEP);
      if (nextTier > prevTierRef.current) {
        prevTierRef.current = nextTier;
        const milestoneValue = nextTier * ELITE_SLAYER_MILESTONE_STEP;
        setActiveMilestone(milestoneValue);
        setMilestoneBannerSeq((seq) => seq + 1);

        soundManager.playLevelUp();
        haptics.onMissionComplete();

        if (bannerTimerRef.current !== null) {
          window.clearTimeout(bannerTimerRef.current);
        }
        bannerTimerRef.current = window.setTimeout(() => {
          bannerTimerRef.current = null;
          setActiveMilestone(null);
        }, MILESTONE_BANNER_DURATION_MS);
      } else if (nextTier < prevTierRef.current) {
        prevTierRef.current = nextTier;
      }
    });

    return () => {
      unsub();
      if (bannerTimerRef.current !== null) {
        window.clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = null;
      }
    };
  }, []);

  const milestoneTier = Math.floor(totalKills / ELITE_SLAYER_MILESTONE_STEP);
  const nextMilestone = (milestoneTier + 1) * ELITE_SLAYER_MILESTONE_STEP;
  const progressWithinTier = totalKills % ELITE_SLAYER_MILESTONE_STEP;
  const progressPct = Math.max(
    0,
    Math.min(100, (progressWithinTier / ELITE_SLAYER_MILESTONE_STEP) * 100)
  );
  const isNearMilestone = progressPct >= 95;
  const isHighlighted = activeMilestone !== null || isNearMilestone;

  const activeMilestoneTier =
    activeMilestone !== null
      ? Math.round(activeMilestone / ELITE_SLAYER_MILESTONE_STEP)
      : 0;

  return (
    <>
      {/* Compact Dynamic Lifetime Counter above Bottom-Left Weapon Row */}
      <div
        aria-label={`Elite Slayer lifetime kills: ${totalKills.toLocaleString()} of ${nextMilestone.toLocaleString()}`}
        className="fixed z-20 pointer-events-none"
        style={{
          bottom: 'calc(max(16px, env(safe-area-inset-bottom)) + 44px)',
          left: 'max(12px, env(safe-area-inset-left))',
        }}
      >
        <NineSlice
          variant="miniPlate"
          tileTexture="row"
          highlight={isHighlighted ? 'gold' : milestoneTier > 0 ? 'ember' : 'none'}
          borderWidth="5px 9px"
          padding="0px"
          className="min-w-[144px] max-w-[186px] shadow-[0_6px_14px_rgba(0,0,0,0.82)]"
          contentClassName="px-2 py-1"
        >
          <div className="flex items-center justify-between gap-2 leading-none">
            <div className="flex items-center gap-1 min-w-0">
              <Icon
                id={milestoneTier > 0 ? 'ui_trophy' : 'ui_swords'}
                size={12}
                className="shrink-0"
              />
              <span
                className={`font-display text-[9px] font-extrabold tracking-[0.12em] uppercase truncate ${
                  isHighlighted ? 'text-[#ffd978]' : 'text-[#f2a93b]'
                }`}
              >
                ELITE SLAYER
              </span>
            </div>

            {milestoneTier > 0 && (
              <span className="shrink-0 px-1 py-[1px] rounded bg-[#2d1e08] border border-[#f2a93b]/55 font-display text-[8px] font-black tracking-[0.08em] text-[#f2c464] leading-none">
                T{milestoneTier}
              </span>
            )}
          </div>

          <div className="mt-1 flex items-baseline justify-between gap-2 leading-none">
            <span
              key={`elite-slayer-val-${killPopSeq}`}
              className={`font-display text-[12px] font-black tabular-nums ${
                isHighlighted ? 'text-[#fff3cc] hud-coin-pop' : 'text-[#ede0c4]'
              }`}
              style={
                isHighlighted
                  ? { textShadow: '0 0 8px rgba(242, 196, 100, 0.55)' }
                  : undefined
              }
            >
              {totalKills.toLocaleString()}
            </span>
            <span className="font-mono-numbers text-[9px] font-semibold text-[#8e8168] tabular-nums">
              / {formatCompactTarget(nextMilestone)}
            </span>
          </div>

          <div className="mt-1">
            <UiBar
              percent={progressPct}
              fill="gold"
              heightClassName="h-[7px]"
              frameBorderWidth="2px 4px"
            />
          </div>
        </NineSlice>
      </div>

      {/* Prominent Milestone Celebration Banner (every 10,000 lifetime kills) */}
      {activeMilestone !== null && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-2rem)] max-w-[440px] pointer-events-none"
          style={{
            top: 'calc(max(8px, env(safe-area-inset-top)) + 54px)',
          }}
        >
          <div key={`elite-milestone-${milestoneBannerSeq}`} className="mission-banner-enter">
            <NineSlice
              variant="bannerCrimson"
              tileTexture="stone"
              highlight="gold"
              padding="0px"
              contentClassName="relative overflow-hidden px-3.5 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[8px] bg-[#1c1409] border border-[#f2a93b]/80 flex items-center justify-center shrink-0">
                    <Icon id="ui_trophy" size={24} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Icon id="ui_swords" size={14} />
                      <span className="font-display text-[11px] font-black tracking-[0.16em] text-[#f2c464] uppercase">
                        ELITE SLAYER MILESTONE
                      </span>
                    </div>
                    <span className="font-display text-sm font-black text-[#fff3cc] tracking-[0.06em] tabular-nums">
                      {activeMilestone.toLocaleString()} ENEMIES VANQUISHED
                    </span>
                    <span className="font-body text-[11px] text-[#cbbba0] truncate">
                      Lifetime total · Next milestone:{' '}
                      {(activeMilestone + ELITE_SLAYER_MILESTONE_STEP).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 px-2.5 py-1.5 rounded-[8px] bg-[#1b1307]/95 border border-[#f2a93b]/65 flex flex-col items-center justify-center">
                  <span className="font-display text-[9px] font-bold tracking-[0.12em] text-[#a89a7e] uppercase leading-none">
                    TIER
                  </span>
                  <span className="font-display text-sm font-black text-[#f2c464] tabular-nums mt-0.5 leading-none">
                    {activeMilestoneTier}
                  </span>
                </div>
              </div>

              <div
                className="mission-banner-progress absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#b3121a] via-[#f2a93b] to-[#ffe19c]"
                style={
                  {
                    '--toast-duration': `${MILESTONE_BANNER_DURATION_MS}ms`,
                  } as React.CSSProperties
                }
              />
            </NineSlice>
          </div>
        </div>
      )}
    </>
  );
};
