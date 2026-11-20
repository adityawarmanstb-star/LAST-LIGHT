import React, { useCallback, useEffect, useRef, useState } from 'react';
import { dailyMissions } from '../game/dailyMissions';
import { soundManager } from '../game/audio';
import { DailyMission } from '../game/types';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UI_SPRITES } from './ui/uiConfig';

const TOAST_DURATION_MS = 3600;

function renderMissionIcon(mission: DailyMission) {
  switch (mission.icon) {
    case 'skull':
      return <Icon id="ui_skull" size={22} />;
    case 'clock':
      return <Icon id="ui_clock" size={22} />;
    case 'coins':
      return <Icon id="soul_coin" size={22} />;
    case 'crown':
      return <Icon id="ui_crown" size={22} />;
    case 'sparkles':
      return <Icon id="ui_sparkles" size={22} />;
    case 'flame':
      return <Icon id="ui_day_flame" size={22} />;
    default:
      return <Icon id="ui_scroll" size={22} />;
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
      haptics.onMissionComplete();
      soundManager.playCoinGain('small');

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
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-[540px] pointer-events-none"
      style={{
        top: 'calc(max(16px, env(safe-area-inset-top)) + 96px)',
      }}
    >
      <div key={activeMission.id} className="mission-banner-enter">
        <NineSlice
          variant="plateWideIron"
          tileTexture="row"
          highlight="gold"
          padding="0px"
          className="relative overflow-hidden shadow-[0_12px_28px_rgba(0,0,0,0.9)]"
          contentClassName="relative overflow-hidden px-3 py-2"
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: Mission Icon & Details */}
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
                  {renderMissionIcon(activeMission)}
                </div>
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

          <div
            className="mission-banner-progress absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#b3121a] via-[#f2a93b] to-[#ffe19c]"
            style={{ '--toast-duration': `${TOAST_DURATION_MS}ms` } as React.CSSProperties}
          />
        </NineSlice>
      </div>
    </div>
  );
};
