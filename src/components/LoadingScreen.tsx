import React, { useEffect, useState } from 'react';

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
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * SURVIVAL_TIPS.length)
  );

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
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center safe-area-pad select-none bg-[#0d0e11] transition-all duration-500 ease-out ${
        fadedIn ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[1.02] pointer-events-none'
      }`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 42%, rgba(93, 228, 255, 0.08) 0%, rgba(179, 18, 26, 0.14) 26%, rgba(11, 12, 15, 0.98) 72%)',
      }}
    >
      {/* Subtle drifting atmospheric glow rings */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full blur-3xl opacity-35 animate-pulse"
          style={{
            background:
              'radial-gradient(circle, rgba(93,228,255,0.28) 0%, rgba(229,48,58,0.12) 48%, transparent 74%)',
          }}
        />
      </div>

      {/* Center Emblem + Brand + Progress */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-6 text-center">
        {/* Character Head Emblem with Rotating Runic Rim & Cyan Halo */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6 flex items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-full blur-xl opacity-65 animate-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(93,228,255,0.45) 0%, rgba(229,48,58,0.18) 55%, transparent 75%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-full border border-[#5de4ff]/35 shadow-[0_0_24px_rgba(93,228,255,0.28)]"
          />
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-full border border-dashed border-[#f2a93b]/25 animate-[spin_18s_linear_infinite]"
          />
          <img
            src="./app-icon.webp"
            alt="Last Light — Dark Warden"
            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover shadow-[0_10px_32px_rgba(0,0,0,0.92)] ring-2 ring-[#2a313c]"
          />
        </div>

        {/* Title */}
        <h1
          className="font-display font-black tracking-[0.2em] text-2xl sm:text-3xl text-[#e8dcc2] mb-1"
          style={{
            textShadow:
              '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 22px rgba(93, 228, 255, 0.28)',
          }}
        >
          LAST LIGHT
        </h1>
        <p className="text-[11px] font-display tracking-[0.22em] uppercase text-[#9c8e72] mb-5 sm:mb-7">
          {mode === 'boot' ? 'Awakening the Lantern' : 'Entering the Ashfen'}
        </p>

        {/* Forged-Iron Smooth Progress Bar */}
        <div className="w-full max-w-[300px]">
          <div className="flex items-center justify-between text-xs mb-2 px-0.5">
            <span className="text-[#d8c9a8]/90 font-medium tracking-wide truncate pr-2">
              {phase}
            </span>
            <span className="font-mono-numbers font-bold text-[#5de4ff] shrink-0">
              {pctRounded}%
            </span>
          </div>

          <div className="relative w-full h-3 rounded-full bg-[#16181d] border border-[#323741] overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.85)]">
            <div
              className="h-full rounded-full transition-[width] duration-150 ease-out relative"
              style={{
                width: `${Math.max(3, displayProgress)}%`,
                background:
                  'linear-gradient(90deg, #8c0a12 0%, #e5303a 42%, #f2a93b 78%, #5de4ff 100%)',
                boxShadow:
                  '0 0 14px rgba(93, 228, 255, 0.55), 0 0 8px rgba(229, 48, 58, 0.45)',
              }}
            >
              {/* Leading lantern tip spark */}
              <span
                aria-hidden="true"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#eefbff] shadow-[0_0_10px_#5de4ff]"
              />
            </div>
          </div>
        </div>

        {/* Atmospheric Survival Tip */}
        <div className="mt-5 sm:mt-7 min-h-[38px] px-3 flex items-center justify-center">
          <p className="text-[11px] sm:text-xs text-[#8f836c] leading-relaxed italic max-w-xs">
            “{SURVIVAL_TIPS[tipIndex]}”
          </p>
        </div>
      </div>
    </div>
  );
};
