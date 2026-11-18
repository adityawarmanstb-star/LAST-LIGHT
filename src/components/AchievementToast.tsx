import React, { useCallback, useEffect, useRef, useState } from 'react';
import { achievements } from '../game/achievements';
import { soundManager } from '../game/audio';
import { AchievementDefinition } from '../game/types';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UI_SPRITES } from './ui/uiConfig';

const TOAST_DURATION_MS = 3800;

export const AchievementToast: React.FC = () => {
  const [active, setActive] = useState<AchievementDefinition | null>(null);
  const queueRef = useRef<AchievementDefinition[]>([]);
  const activeRef = useRef<AchievementDefinition | null>(null);
  const timerRef = useRef<number | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActive(next);

    if (next) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        showNext();
      }, TOAST_DURATION_MS);
    }
  }, []);

  useEffect(() => {
    const unsub = achievements.onAchievementUnlocked((ach) => {
      haptics.onMissionComplete();
      soundManager.playLevelUp();

      if (!activeRef.current) {
        queueRef.current.push(ach);
        showNext();
      } else {
        queueRef.current.push(ach);
      }
    });

    return () => {
      unsub();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showNext]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[59] w-[calc(100%-2rem)] max-w-[540px] pointer-events-none"
      style={{
        top: 'calc(max(16px, env(safe-area-inset-top)) + 16px)',
      }}
    >
      <div key={active.id} className="mission-banner-enter">
        <NineSlice
          variant="plateWideIron"
          tileTexture="row"
          highlight="gold"
          padding="0px"
          className="relative overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.9)]"
          contentClassName="relative overflow-hidden px-3 py-2"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-10 h-10 aspect-square flex items-center justify-center shrink-0">
                <img
                  src={UI_SPRITES.roundSquareSocket}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                  className="absolute inset-0 w-full h-full object-contain select-none"
                />
                <div className="relative z-10 flex items-center justify-center">
                  <Icon id="ui_trophy" size={22} />
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-display text-xs font-bold tracking-[0.14em] text-[#f2a93b] uppercase">
                  Achievement Unlocked
                </span>
                <span className="text-sm font-semibold text-[#e8dcc2] truncate">
                  {active.title}
                </span>
                <span className="text-[11px] text-[#9c8e72] truncate">
                  {active.description}
                </span>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-[#121417]/90 border border-[#f2a93b]/55">
              <Icon id="soul_coin" size={16} />
              <span className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                +{active.rewardCoins}
              </span>
            </div>
          </div>

          <div
            className="mission-banner-progress absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#b3121a] via-[#f2a93b] to-[#ffe19c]"
            style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
          />
        </NineSlice>
      </div>
    </div>
  );
};
