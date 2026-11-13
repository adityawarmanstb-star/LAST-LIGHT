import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Coins, Trophy } from 'lucide-react';
import { achievements } from '../game/achievements';
import { soundManager } from '../game/audio';
import { AchievementDefinition } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame } from './ForgedIronFrame';

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
      className="fixed left-1/2 -translate-x-1/2 z-[59] w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{
        top: 'calc(max(16px, env(safe-area-inset-top)) + 16px)',
      }}
    >
      <div key={active.id} className="mission-banner-enter">
        <ForgedIronFrame
          seed={`achievement-unlock-toast-${active.id}`}
          dripCount={3}
          maxDripLength={14}
          borderColor="#f2a93b"
          glowColor="#f2a93b"
          glowStrength={14}
          contentClassName="relative overflow-hidden px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[9px] bg-[#121417] border border-[#f2a93b]/75 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(242,169,59,0.28)]">
                <Trophy className="w-5 h-5 text-[#f2a93b]" />
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
              <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
              <span className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                +{active.rewardCoins}
              </span>
            </div>
          </div>

          <div
            className="mission-banner-progress absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#b3121a] via-[#f2a93b] to-[#ffe19c]"
            style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
          />
        </ForgedIronFrame>
      </div>
    </div>
  );
};
