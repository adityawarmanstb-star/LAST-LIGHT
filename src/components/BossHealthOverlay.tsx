import React from 'react';
import { Crown, Flame } from 'lucide-react';
import { BossInfo } from '../game/types';
import { ForgedIronFrame } from './ForgedIronFrame';

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
  const recLevel = boss.recommendedLevel ?? 60;
  const isUnderLeveled = playerLevel < recLevel;

  return (
    <div
      role="status"
      aria-label={`${boss.name} health ${clampedHp} of ${safeMaxHp}`}
      className="fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-none"
      style={{
        top: 'calc(max(16px, env(safe-area-inset-top)) + 68px)',
      }}
    >
      <div className="relative">
        {/* Subtle crimson danger aura pulse when boss is below 25% HP */}
        {isDangerLow && (
          <div
            aria-hidden="true"
            className="boss-danger-pulse absolute -inset-1 rounded-[14px] pointer-events-none"
            style={{
              boxShadow:
                '0 0 22px rgba(229, 48, 58, 0.55), inset 0 0 14px rgba(229, 48, 58, 0.35)',
              border: '1px solid rgba(229, 48, 58, 0.65)',
            }}
          />
        )}

        <ForgedIronFrame
          seed={`boss-overlay-${boss.name}-${isDangerLow ? 'danger' : 'normal'}`}
          dripCount={4}
          maxDripLength={18}
          borderColor={isDangerLow ? '#e5303a' : '#b3121a'}
          glowColor="#e5303a"
          glowStrength={isDangerLow ? 14 : 8}
          contentClassName="px-3.5 py-2.5 sm:px-4 sm:py-3"
        >
          {/* Header Row: Boss Name, Danger Indicator (<25%), Numeric & % Health */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Crown
                className={`w-4 h-4 shrink-0 ${
                  isDangerLow ? 'text-[#e5303a] animate-pulse' : 'text-[#f2a93b]'
                }`}
              />
              <span className="font-display text-xs sm:text-sm font-bold tracking-wider text-[#e5303a] truncate">
                {boss.name}
              </span>
              <span
                className={`font-mono-numbers text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                  isUnderLeveled ? 'text-[#e5303a]' : 'text-[#f2a93b]'
                }`}
                title={`Recommended Player Level: ${recLevel}`}
              >
                Rec. Lv. {recLevel}
              </span>
              {(isDangerLow || boss.enraged) && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3a0a0e]/90 border border-[#e5303a]/75 text-[9px] font-bold uppercase tracking-widest text-[#ff6b73] shrink-0 boss-danger-pulse">
                  <Flame className="w-2.5 h-2.5 text-[#e5303a]" />
                  <span>{isDangerLow ? 'Danger' : 'Enraged'}</span>
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 shrink-0 font-mono-numbers text-xs">
              <span className="font-semibold text-[#d8c9a8]">
                {clampedHp.toLocaleString()}
              </span>
              <span className="text-[#8e8168]">/ {safeMaxHp.toLocaleString()}</span>
              <span
                className={`ml-1 text-[11px] font-bold ${
                  isDangerLow ? 'text-[#e5303a]' : 'text-[#9c8e72]'
                }`}
              >
                ({Math.ceil(hpPercent)}%)
              </span>
            </div>
          </div>

          {/* Forged-Iron Health Tube with Delayed Damage Trail & 25% Threshold Tick */}
          <div
            className="relative w-full h-3.5 rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #090a0d 0%, #14161a 100%)',
              borderTop: '1.5px solid #4a515e',
              borderBottom: '1.5px solid #07080a',
              borderLeft: '1.5px solid #3a3f47',
              borderRight: '1.5px solid #090a0c',
              boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.85)',
            }}
          >
            {/* Delayed lighter-red damage trail */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out opacity-70"
              style={{
                width: `${hpPercent}%`,
                background: 'linear-gradient(180deg, #ff7a82 0%, #e5303a 100%)',
              }}
            />

            {/* Primary blood-red active health bar */}
            <div
              className={`relative h-full rounded-full transition-all duration-150 ease-out ${
                isDangerLow ? 'boss-danger-pulse' : ''
              }`}
              style={{
                width: `${hpPercent}%`,
                background: isDangerLow
                  ? 'linear-gradient(180deg, #ff4b55 0%, #c9141d 55%, #4a0b10 100%)'
                  : 'linear-gradient(180deg, #e5303a 0%, #b3121a 55%, #3a0a0e 100%)',
                boxShadow: isDangerLow
                  ? '0 0 16px rgba(229, 48, 58, 0.85)'
                  : '0 0 12px rgba(229, 48, 58, 0.6)',
              }}
            >
              {/* Glossy top liquid sheen */}
              <div
                className="absolute top-[1px] left-1 right-1 h-[3px] rounded-full opacity-45"
                style={{
                  background: 'linear-gradient(90deg, transparent, #ffd2d5 40%, transparent)',
                }}
              />
            </div>

            {/* Segment ticks: highlight 25% danger threshold */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[25%] w-[1.5px] bg-[#f2a93b]/55"
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[50%] w-px bg-[#0b0c0e]/70"
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 left-[75%] w-px bg-[#0b0c0e]/70"
            />
          </div>
        </ForgedIronFrame>
      </div>
    </div>
  );
};

export const BossHealthOverlay = React.memo(BossHealthOverlayComponent);
