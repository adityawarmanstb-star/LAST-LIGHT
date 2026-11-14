import React, { useEffect, useState } from 'react';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
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
  onTransitionEnd,
}) => {
  const [rendered, setRendered] = useState(visible);
  const [fadedIn, setFadedIn] = useState(visible);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * SURVIVAL_TIPS.length)
  );

  const { processedSrc: titleLogoSrc, hasError: titleLogoError } = useChromaKeyImage(
    UI_ASSETS.gameTitleLogo
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
      className={`fixed inset-0 h-[100dvh] z-[100] flex flex-col justify-between items-center select-none bg-[#06070a] transition-all duration-500 ease-out overflow-hidden ${
        fadedIn ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[1.02] pointer-events-none'
      }`}
      style={{
        backgroundImage: `url(${UI_ASSETS.loadingSplash})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Subtle lower-half vignette scrim so upper Dark Warden artwork remains unobstructed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,10,0.08) 0%, rgba(6,7,10,0) 38%, rgba(5,6,9,0.72) 58%, rgba(4,5,8,0.95) 82%, rgba(4,5,8,0.98) 100%)',
        }}
      />

      {/* Upper Spacer: keeps Dark Warden character illustration completely unobstructed */}
      <div className="relative z-10 flex-1 min-h-[38dvh] w-full pointer-events-none" aria-hidden="true" />

      {/* Lower-Middle Logo, Subtitle & panel_iron_card.png Progress Bar */}
      <div className="relative z-10 w-full max-w-[440px] px-5 flex flex-col items-center text-center">
        {!titleLogoError ? (
          <img
            src={titleLogoSrc ?? UI_ASSETS.gameTitleLogo}
            alt="LAST LIGHT"
            referrerPolicy="no-referrer"
            className={`w-[82%] max-w-[320px] h-auto object-contain select-none transition-opacity duration-150 ${
              titleLogoSrc ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              filter:
                'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.98)) drop-shadow(0 0 14px rgba(242, 169, 59, 0.36)) drop-shadow(0 0 18px rgba(179, 18, 26, 0.45))',
            }}
          />
        ) : (
          <h1
            className="font-display font-black tracking-[0.16em] text-3xl sm:text-4xl leading-none uppercase"
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
        )}

        <p
          className="mt-1.5 mb-5 font-display font-extrabold text-[11px] tracking-[0.28em] uppercase"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #f59a9e 0%, #d4202a 55%, #73080e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.98))',
          }}
        >
          ENTERING THE ASHFEN
        </p>

        {/* Progress Bar directly below Title Logo framed by panel_iron_card.png */}
        <div className="w-[84%] max-w-[340px] flex flex-col items-center">
          <div className="w-full flex items-center justify-between gap-2 mb-1.5 px-1">
            <span className="font-display text-[11px] font-bold text-[#e8dcc2] tracking-wide truncate text-left">
              {phase}
            </span>
            <span className="font-display text-xs font-extrabold text-[#f2c464] shrink-0 tabular-nums">
              {pctRounded}%
            </span>
          </div>

          <IronCard
            className="w-full h-[34px]"
            contentClassName="h-full px-2.5 flex items-center"
          >
            <div className="w-full h-[11px] rounded-[4px] bg-[#08090c] border border-[#3a3f47] overflow-hidden p-[1px]">
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
      </div>

      {/* Bottom Survival Tip in Rajdhani */}
      <div
        className="relative z-10 w-full max-w-[400px] px-6 pt-4 text-center flex items-center justify-center"
        style={{
          paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
        }}
      >
        <p className="font-body text-[13px] font-medium text-[#cbbba0] leading-snug">
          “{SURVIVAL_TIPS[tipIndex]}”
        </p>
      </div>
    </div>
  );
};
