import React, { useCallback, useEffect, useRef, useState } from 'react';
import { dailyMissions } from '../game/dailyMissions';
import { soundManager } from '../game/audio';
import { DailyMission } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame } from './ForgedIronFrame';
import { Icon } from './Icon';

const TOAST_DURATION_MS = 3600;

function renderMissionIcon(mission: DailyMission) {
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
}

export const MissionCompleteToast: React.FC = () => {
  const [activeMission, setActiveMission] = useState<DailyMission | null>(null);
  const queueRef = useRef<DailyMission[]>([]);
  const activeRef = useRef<DailyMission | null>(null);
  const timerRef = useRef<number | null>(null);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    activeRef.current = next;
    setActiveMission(next);

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
    const unsub = dailyMissions.onMissionCompleted((mission) => {
      // Trigger haptic feedback & celebratory chime immediately when requirement is met
      haptics.onMissionComplete();
      soundManager.playCoinCollect();

      if (!activeRef.current) {
        queueRef.current.push(mission);
        showNext();
      } else {
        queueRef.current.push(mission);
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

  if (!activeMission) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm pointer-events-none"
      style={{
        top: 'calc(max(16px, env(safe-area-inset-top)) + 96px)',
      }}
    >
      <div key={activeMission.id} className="mission-banner-enter">
        <ForgedIronFrame
          seed={`mission-complete-toast-${activeMission.id}`}
          dripCount={3}
          maxDripLength={14}
          borderColor="#f2a93b"
          glowColor="#f2a93b"
          glowStrength={14}
          contentClassName="relative overflow-hidden px-4 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: Mission Icon & Details */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[9px] bg-[#121417] border border-[#f2a93b]/70 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(242,169,59,0.28)]">
                {renderMissionIcon(activeMission)}
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <Icon id="ui_check" size={16} />
                  <span className="font-display text-xs font-bold tracking-[0.14em] text-[#f2a93b] uppercase">
                    Mission Complete
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#d8c9a8] truncate">
                  {activeMission.title}
                </span>
                <span className="text-[11px] text-[#9c8e72] truncate">
                  {activeMission.description}
                </span>
              </div>
            </div>

            {/* Right: Reward Coin & Seal Banner Badge */}
            <div className="shrink-0 flex flex-col items-end justify-center px-2.5 py-1.5 rounded-[8px] bg-[#121417]/90 border border-[#f2a93b]/55">
              <div className="flex items-center gap-1">
                <Icon id="soul_coin" size={16} />
                <span className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                  +{activeMission.rewardCoins}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Icon id="crimson_gem" size={14} />
                <span className="font-mono-numbers text-[10px] font-bold text-[#d8b4fe]">
                  +{activeMission.rewardSeals || 1} Seal
                </span>
              </div>
            </div>
          </div>

          {/* Forge-gold auto-dismiss timer bar */}
          <div
            className="mission-banner-progress absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#b3121a] via-[#f2a93b] to-[#ffe19c]"
            style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
          />
        </ForgedIronFrame>
      </div>
    </div>
  );
};
