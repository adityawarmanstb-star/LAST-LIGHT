import React from 'react';
import { BossInfo } from '../game/types';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UiBar } from './ui/UiBar';
import { UI_SPRITES } from './ui/uiConfig';

interface BossHealthOverlayProps {
  boss: BossInfo | null;
  playerLevel?: number;
}

const BossHealthOverlayComponent: React.FC<BossHealthOverlayProps> = ({
  boss,
  playerLevel = 1,
}) => {
  if (!boss || !boss.active) return null;

  const safeMaxHp = Math.max(1, boss.maxHp);
  const clampedHp = Math.max(0, Math.min(safeMaxHp, Math.round(boss.currentHp)));
  const hpPercent = (clampedHp / safeMaxHp) * 100;
  const isDangerLow = hpPercent > 0 && hpPercent < 25;
  const recLevel = boss.recommendedLevel ?? 30;
  const isUnderLeveled = playerLevel < recLevel;

  return (
    <div
      role="status"
      aria-label={`${boss.name} health ${clampedHp} of ${safeMaxHp}`}
      className="fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[460px] pointer-events-none"
      style={{
        top: 'calc(max(8px, env(safe-area-inset-top)) + 54px)',
      }}
    >
      <div className={isDangerLow ? 'boss-danger-pulse' : ''}>
        <NineSlice
          variant="plateWideBlood"
          tileTexture="row"
          highlight="blood"
          padding="0px"
          className="shadow-[0_12px_26px_rgba(0,0,0,0.92)]"
          contentClassName="px-3 py-2 sm:px-3.5 sm:py-2.5"
        >
          {/* Header Row: Skull/Crown Badge, Boss Name, Rec Level, Numeric & % HP */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                style={{ width: 22, aspectRatio: '1 / 1' }}
                className="relative flex items-center justify-center shrink-0"
              >
                <img
                  src={UI_SPRITES.roundSkullBadge}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ imageRendering: 'auto' }}
                  className="w-full h-full object-contain select-none"
                />
              </div>
              <span className="font-display text-xs sm:text-sm font-bold tracking-wider text-[#e5303a] truncate">
                {boss.name}
              </span>
              <span
                className={`font-mono-numbers text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                  isUnderLeveled ? 'text-[#e5303a]' : 'text-[#f2a93b]'
                }`}
                title={`Recommended Player Level: ${recLevel}`}
              >
                Rec. Lv.{recLevel}
              </span>
              {(isDangerLow || boss.enraged) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3a0a0e]/90 border border-[#e5303a]/75 text-[9px] font-bold uppercase tracking-widest text-[#ff6b73] shrink-0">
                  <Icon id="ui_flame" size={12} />
                  <span>{isDangerLow ? 'Danger' : 'Enraged'}</span>
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1 shrink-0 font-mono-numbers text-[11px] sm:text-xs ml-auto">
              <span className="font-semibold text-[#d8c9a8] tabular-nums">
                {clampedHp.toLocaleString()}
              </span>
              <span className="text-[#8e8168] tabular-nums">/ {safeMaxHp.toLocaleString()}</span>
              <span
                className={`ml-0.5 text-[10px] sm:text-[11px] font-bold tabular-nums ${
                  isDangerLow ? 'text-[#e5303a]' : 'text-[#9c8e72]'
                }`}
              >
                ({Math.ceil(hpPercent)}%)
              </span>
            </div>
          </div>

          {/* Boss Bar: clip-path dark purple fill drawn BEHIND NineSlice barFrame */}
          <UiBar
            percent={hpPercent}
            trailPercent={hpPercent}
            fill="darkPurple"
            heightClassName="h-[18px]"
            frameBorderWidth="clamp(3px, 0.7vw, 5px) clamp(8px, 1.5vw, 14px)"
          >
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[25%] w-[1.5px] bg-[#f2a93b]/70"
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[50%] w-px bg-[#0b0c0e]/75"
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[75%] w-px bg-[#0b0c0e]/75"
            />
          </UiBar>
        </NineSlice>
      </div>
    </div>
  );
};

export const BossHealthOverlay = React.memo(BossHealthOverlayComponent);
