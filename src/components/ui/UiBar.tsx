import React from 'react';
import { NineSlice } from './NineSlice';
import { UI_SPRITES } from './uiConfig';

export interface UiBarProps {
  percent: number;
  trailPercent?: number;
  fill?: 'crimson' | 'cyan' | 'gold' | 'green' | 'darkPurple';
  heightClassName?: string;
  ariaLabel?: string;
  className?: string;
  frameBorderWidth?: string;
  children?: React.ReactNode;
}

const TRAIL_GRADIENTS: Record<NonNullable<UiBarProps['fill']>, string> = {
  crimson: 'linear-gradient(180deg, #ff9b9f 0%, #e5303a 60%, #99131a 100%)',
  cyan: 'linear-gradient(180deg, #c2f6ff 0%, #5de4ff 60%, #1c7c96 100%)',
  gold: 'linear-gradient(180deg, #fff0c2 0%, #f2a93b 60%, #9a6016 100%)',
  green: 'linear-gradient(180deg, #d7ffe0 0%, #74eb95 55%, #2b944c 100%)',
  darkPurple: 'linear-gradient(180deg, #d8b4fe 0%, #9333ea 58%, #4c1d95 100%)',
};

/**
 * Framed progress/HP/XP bar:
 * - Fill sprites sit at 100% unscaled size BEHIND (z-10) the NineSlice bar frame (z-20)
 * - Percentage is revealed purely via CSS clip-path inset(...) so fill texture is NEVER scaled.
 */
export const UiBar: React.FC<UiBarProps> = ({
  percent,
  trailPercent,
  fill = 'crimson',
  heightClassName = 'h-[14px]',
  ariaLabel,
  className = '',
  frameBorderWidth = 'clamp(3px, 0.7vw, 5px) clamp(8px, 1.5vw, 13px)',
  children,
}) => {
  const clampedPct = Math.max(0, Math.min(100, percent));
  const clampedTrailPct =
    trailPercent !== undefined ? Math.max(clampedPct, Math.min(100, trailPercent)) : undefined;

  const clipRightPct = Math.max(0, Math.min(100, 100 - clampedPct));
  const trailClipRightPct =
    clampedTrailPct !== undefined ? Math.max(0, Math.min(100, 100 - clampedTrailPct)) : 100;

  return (
    <div
      role={ariaLabel ? 'progressbar' : undefined}
      aria-label={ariaLabel}
      aria-valuenow={ariaLabel ? Math.round(clampedPct) : undefined}
      aria-valuemin={ariaLabel ? 0 : undefined}
      aria-valuemax={ariaLabel ? 100 : undefined}
      className={`relative w-full ${heightClassName} overflow-hidden select-none ${className}`}
    >
      {/* Layer 0: Groove Backing behind fill & frame */}
      <img
        src={UI_SPRITES.barBackingTrack}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ imageRendering: 'auto' }}
        className="pointer-events-none absolute inset-[2px] w-[calc(100%-4px)] h-[calc(100%-4px)] object-cover z-0 select-none"
      />

      {/* Layer 1: Delayed damage trail clipped cleanly (never width-scaled) */}
      {clampedTrailPct !== undefined && clampedTrailPct > clampedPct && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] z-[5] transition-[clip-path] duration-500 ease-out"
          style={{
            clipPath: `inset(0 ${trailClipRightPct}% 0 0)`,
            background: TRAIL_GRADIENTS[fill],
          }}
        />
      )}

      {/* Layer 2: Primary textured fill clipped via clip-path BEHIND the 9-slice frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] z-10 transition-[clip-path] duration-150 ease-out"
        style={{
          clipPath: `inset(0 ${clipRightPct}% 0 0)`,
        }}
      >
        {fill === 'gold' ? (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(180deg, #ffe294 0%, #f2a93b 52%, #9a6016 100%)',
            }}
          />
        ) : fill === 'green' ? (
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(180deg, #7ef29a 0%, #2fd162 28%, #169c42 70%, #0b5a26 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(215, 255, 224, 0.5), inset 0 -1px 2px rgba(4, 34, 15, 0.78)',
            }}
          />
        ) : fill === 'darkPurple' ? (
          <div
            className="w-full h-full"
            style={{
              background:
                'linear-gradient(180deg, #9d5cff 0%, #5b21b6 30%, #3b0d78 72%, #1d053d 100%)',
              boxShadow:
                'inset 0 1px 0 rgba(216, 180, 254, 0.4), inset 0 -1px 2px rgba(15, 3, 30, 0.85)',
            }}
          />
        ) : (
          <img
            src={fill === 'cyan' ? UI_SPRITES.barFillCyan : UI_SPRITES.barFillCrimson}
            alt=""
            draggable={false}
            style={{ imageRendering: 'auto' }}
            className="w-full h-full object-cover select-none"
          />
        )}
      </div>

      {/* Layer 3: NineSlice outer bar frame drawn IN FRONT of fills */}
      <NineSlice
        variant="barFrame"
        borderWidth={frameBorderWidth}
        padding="0px"
        className="pointer-events-none absolute inset-0 z-20"
      />

      {/* Optional overlay slot (segment ticks / shine) */}
      {children && <div className="pointer-events-none absolute inset-0 z-30">{children}</div>}
    </div>
  );
};
