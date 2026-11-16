import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BossIntroInfo } from '../game/types';
import { Icon } from './Icon';
import { haptics } from '../mobile/haptics';

interface BossIntroModalProps {
  bossIntro: BossIntroInfo;
  paused?: boolean;
  onDismiss: () => void;
}

const BOSS_INTRO_DURATION_MS = 2200;
const WARNING_PULSE_INTERVAL_MS = 620;

export const BossIntroModal: React.FC<BossIntroModalProps> = ({
  bossIntro,
  paused = false,
  onDismiss,
}) => {
  const [pulseBeat, setPulseBeat] = useState<number>(0);

  const dismissedRef = useRef<boolean>(false);
  const remainingRef = useRef<number>(BOSS_INTRO_DURATION_MS);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const triggerDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismissRef.current();
  }, []);

  // Reset countdown whenever a fresh boss spawn sequence arrives
  useEffect(() => {
    dismissedRef.current = false;
    remainingRef.current = BOSS_INTRO_DURATION_MS;
    setPulseBeat(0);
    haptics.tap('heavy');
  }, [bossIntro.seq]);

  // Brief dramatic auto-pause countdown (suspends cleanly if Pause or LevelUp opens)
  useEffect(() => {
    if (paused) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - lastTs));
      lastTs = now;

      remainingRef.current = Math.max(0, remainingRef.current - dt);
      if (remainingRef.current <= 0) {
        triggerDismiss();
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [paused, bossIntro.seq, triggerDismiss]);

  // Repeating blood-edge-impact pulse beat on the ui_warning banner
  useEffect(() => {
    if (paused) return;
    const intervalId = window.setInterval(() => {
      setPulseBeat((prev) => prev + 1);
    }, WARNING_PULSE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [paused, bossIntro.seq]);

  // Allow Enter / Space to dismiss immediately
  useEffect(() => {
    if (paused) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        triggerDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paused, triggerDismiss]);

  const safeMaxHp = Math.max(1, Math.round(bossIntro.maxHp));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-intro-title"
      onClick={triggerDismiss}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 h-[100dvh] z-[45] flex items-center justify-center safe-area-pad select-none overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(18, 2, 5, 0.24)',
      }}
    >
      {/* Screen-edge crimson alert vignette */}
      <div
        key={`boss-screen-impact-${bossIntro.seq}-${pulseBeat}`}
        aria-hidden="true"
        className="blood-edge-impact pointer-events-none fixed inset-0"
        style={
          {
            '--splatter-opacity': '0.72',
            boxShadow: 'inset 0 0 115px rgba(229, 48, 58, 0.68)',
          } as React.CSSProperties
        }
      />

      {/* Transparent Red WARNING!! Pop-up Banner */}
      <div className="boss-intro-enter relative z-10 w-full max-w-xl px-2">
        <div
          className="relative w-full overflow-hidden rounded-xl border-y-2 border-[#ff3b47]/85 px-5 py-4 sm:px-8 sm:py-5 flex flex-col items-center justify-center text-center gap-1.5"
          style={{
            background:
              'linear-gradient(90deg, rgba(110, 10, 18, 0.28) 0%, rgba(185, 16, 26, 0.52) 50%, rgba(110, 10, 18, 0.28) 100%)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            boxShadow:
              '0 0 36px rgba(229, 48, 58, 0.55), inset 0 0 26px rgba(229, 48, 58, 0.36)',
          }}
        >
          {/* Pulsing crimson outer glow */}
          <div
            aria-hidden="true"
            className="boss-danger-pulse pointer-events-none absolute inset-0 rounded-xl"
            style={{
              boxShadow: 'inset 0 0 30px rgba(255, 62, 74, 0.65)',
            }}
          />

          {/* Urgent blood-edge-impact pulse overlay on the UI_WARNING banner */}
          <div
            key={`boss-warning-impact-${bossIntro.seq}-${pulseBeat}`}
            aria-hidden="true"
            className="blood-edge-impact pointer-events-none absolute inset-0 rounded-xl"
            style={
              {
                '--splatter-opacity': '0.94',
                background:
                  'radial-gradient(ellipse at center, rgba(229, 48, 58, 0.12) 32%, rgba(229, 48, 58, 0.54) 100%)',
                boxShadow: 'inset 0 0 34px rgba(255, 52, 66, 0.9)',
              } as React.CSSProperties
            }
          />

          {/* Banner Headline Row with ui_warning icons */}
          <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
            <Icon id="ui_warning" size={32} className="shrink-0 drop-shadow-[0_0_10px_rgba(255,60,70,0.85)]" />
            <h2
              id="boss-intro-title"
              className="font-blood text-2xl sm:text-4xl font-black tracking-[0.22em] uppercase text-[#ff4d57] drop-shadow-[0_2px_12px_rgba(229,48,58,0.95)]"
            >
              WARNING!!
            </h2>
            <Icon id="ui_warning" size={32} className="shrink-0 drop-shadow-[0_0_10px_rgba(255,60,70,0.85)]" />
          </div>

          {/* Slim unboxed boss name & HP line */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-2 text-xs sm:text-sm font-display font-bold tracking-[0.08em] text-[#ffe8ea]">
            <span>{bossIntro.name}</span>
            <span aria-hidden="true" className="text-[#ff8a92]">
              ·
            </span>
            <span className="font-mono-numbers tabular-nums text-[#ffd2d5]">
              {safeMaxHp.toLocaleString()} HP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
