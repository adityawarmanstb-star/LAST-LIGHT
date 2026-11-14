import React, { useEffect, useState } from 'react';
import { UI_ASSETS, preloadAllChromaKeyUiAssets } from '../hooks/useChromaKeyImage';
import { IronCard } from './IronCard';

interface LoadingScreenProps {
  visible: boolean;
  progress: number; // 0..100
  phase: string;
  mode: 'boot' | 'arena';
  onTransitionEnd?: () => void;
}

const SURVIVAL_TIPS = [
  'Stand still to unleash automatic arcane fire and widen your lantern aura.',
  'Lure enemies near blazing world torches to shatter the dark with real-time shadows.',
  'Collect XP gems quickly before they fade into the Ashfen.',
  'Pair matching Relics before entering the arena to unlock set synergies.',
  'Use Dash with invulnerability frames to slip out of encirclements.',
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible,
  progress,
  phase,
  mode,
  onTransitionEnd,
}) => {
  const [rendered, setRendered] = useState(visible);
  const [fadedIn, setFadedIn] = useState(visible);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [bgError, setBgError] = useState(false);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * SURVIVAL_TIPS.length)
  );

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
  }, []);

  // Mount/unmount with silky fade-in & fade-out transitions
  useEffect(() => {
    if (visible) {
      setRendered(true);
      const raf = requestAnimationFrame(() => {
        setFadedIn(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setFadedIn(false);
      const timer = window.setTimeout(() => {
        setRendered(false);
        setDisplayProgress(0);
        onTransitionEnd?.();
      }, 480);
      return () => window.clearTimeout(timer);
    }
  }, [visible, onTransitionEnd]);

  // Smoothly interpolate visual progress bar toward target progress
  useEffect(() => {
    if (!rendered) return;
    const clampedTarget = Math.max(0, Math.min(100, progress));
    let rafId = 0;

    const tick = () => {
      setDisplayProgress((prev) => {
        const diff = clampedTarget - prev;
        if (Math.abs(diff) < 0.35) return clampedTarget;
        const step = Math.max(0.6, diff * 0.18);
        return Math.min(clampedTarget, prev + step);
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [progress, rendered]);

  // Rotate atmospheric tip slowly while visible
  useEffect(() => {
    if (!visible) return;
    const interval = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SURVIVAL_TIPS.length);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [visible]);

  if (!rendered) return null;

  const pctRounded = Math.round(displayProgress);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${pctRounded}%`}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center safe-area-pad select-none bg-[#080a0d] transition-all duration-500 ease-out ${
        fadedIn ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[1.02] pointer-events-none'
      }`}
    >
      {/* bg_dungeon.png Backdrop + Moody Dark Radial Vignette */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {!bgError && (
          <img
            src={UI_ASSETS.bgDungeon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBgError(true)}
            className="w-full h-full object-cover object-center opacity-80 brightness-90"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(0, 0, 0, 0.38) 0%, rgba(0, 0, 0, 0.65) 55%, rgba(0, 0, 0, 0.88) 100%)',
          }}
        />
      </div>

      {/* Center Emblem + Brand + Progress */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-5 text-center">
        {/* Enlarged 130x130 Circular Dark Warden Emblem with Pulsing Cyan Lantern Glow */}
        <div
          className="relative w-[130px] h-[130px] mb-5 flex items-center justify-center"
          style={{
            filter: 'drop-shadow(0 0 24px rgba(34, 211, 238, 0.5))',
          }}
        >
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-full blur-2xl hero-lantern-breathe"
            style={{
              background:
                'radial-gradient(circle, rgba(34, 211, 238, 0.42) 0%, rgba(93, 228, 255, 0.14) 55%, transparent 78%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -inset-2 rounded-full border-2 border-[#596475] shadow-[inset_0_1px_0_rgba(200,215,235,0.35),0_0_20px_rgba(0,0,0,0.92)]"
          />
          <div
            aria-hidden="true"
            className="absolute -inset-3.5 rounded-full border border-dashed border-[#22d3ee]/55 animate-[spin_24s_linear_infinite]"
          />
          <img
            src="./app-icon.webp"
            alt="Last Light — Dark Warden"
            referrerPolicy="no-referrer"
            className="relative w-[130px] h-[130px] rounded-full object-cover shadow-[0_12px_34px_rgba(0,0,0,0.95)] ring-2 ring-[#3c4654]"
          />
        </div>

        {/* Title */}
        <h1
          className="font-display font-black tracking-[0.18em] text-3xl sm:text-4xl leading-none uppercase mb-1.5"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #fff1c7 0%, #e6aa45 50%, #9b5d14 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter:
              'drop-shadow(0 3px 0 #170805) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.96))',
          }}
        >
          LAST LIGHT
        </h1>

        <p
          className="font-display font-extrabold text-xs tracking-[0.26em] uppercase mb-6"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #f59a9e 0%, #d4202a 55%, #73080e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.98))',
          }}
        >
          {mode === 'boot' ? 'AWAKENING THE LANTERN' : 'ENTERING THE ASHFEN'}
        </p>

        {/* Progress Header + panel_iron_card.png Progress Bar */}
        <div className="w-[82vw] max-w-[340px] flex flex-col items-center">
          <div className="w-full flex items-center justify-between gap-2 mb-2 px-1">
            <span className="font-display text-xs font-bold text-[#e8dcc2] tracking-wide text-left">
              {phase}
            </span>
            <span className="font-display text-xs font-bold text-[#f2c464] shrink-0 tabular-nums">
              {pctRounded}%
            </span>
          </div>

          <IronCard
            className="w-full h-[36px]"
            contentClassName="h-full px-3 flex items-center"
          >
            <div className="w-full h-3 rounded-[4px] bg-[#08090c] border border-[#3a3f47] overflow-hidden p-[1px]">
              <div
                className="h-full rounded-[3px] transition-[width] duration-150 ease-out"
                style={{
                  width: `${Math.max(4, displayProgress)}%`,
                  background:
                    'linear-gradient(90deg, #8c0e15 0%, #d12832 52%, #f2a93b 100%)',
                  boxShadow:
                    '0 0 12px rgba(242, 169, 59, 0.65), inset 0 1px 0 rgba(255, 225, 175, 0.35)',
                }}
              />
            </div>
          </IronCard>
        </div>

        {/* Atmospheric Survival Tip in Rajdhani */}
        <div className="mt-5 min-h-[40px] px-2 flex items-center justify-center">
          <p className="font-body text-sm font-medium text-[#cbbba0] leading-relaxed max-w-xs">
            “{SURVIVAL_TIPS[tipIndex]}”
          </p>
        </div>
      </div>
    </div>
  );
};
