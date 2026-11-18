import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BossIntroInfo } from '../game/types';
import { gameManager } from '../game/GameManager';
import { Icon } from './Icon';
import { haptics } from '../mobile/haptics';
import { NineSlice } from './ui/NineSlice';

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

  // Repeating blood-edge-impact pulse & aftershock shake on the ui_warning banner
  useEffect(() => {
    if (paused) return;
    const intervalId = window.setInterval(() => {
      setPulseBeat((prev) => prev + 1);
      haptics.tap('light');
      const scene = gameManager.activeScene as {
        triggerBossIntroShake?: (durationMs?: number, intensity?: number) => void;
      } | null;
      scene?.triggerBossIntroShake?.(340, 0.014);
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
  const shakeEnabled = gameManager.isScreenShakeEnabled();
  const shakeClass =
    paused || !shakeEnabled
      ? ''
      : pulseBeat === 0
        ? 'boss-intro-camera-shake'
        : 'boss-intro-aftershock';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boss-intro-title"
      onClick={triggerDismiss}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 h-[100dvh] z-[45] flex items-center justify-center safe-area-pad select-none overflow-hidden cursor-pointer"
      style={{
        background: 'rgba(18, 2, 5, 0.28)',
      }}
    >
      {/* Camera shake stage wrapper (initial heavy quake + pulse aftershocks) */}
      <div
        key={`boss-shake-stage-${bossIntro.seq}-${pulseBeat}`}
        className={`relative w-full h-full flex items-center justify-center ${shakeClass}`}
      >
        {/* Oversized screen-edge crimson alert vignette so camera shake never reveals edge gaps */}
        <div
          key={`boss-screen-impact-${bossIntro.seq}-${pulseBeat}`}
          aria-hidden="true"
          className="blood-edge-impact pointer-events-none fixed -inset-5"
          style={
            {
              '--splatter-opacity': '0.78',
              boxShadow: 'inset 0 0 125px rgba(229, 48, 58, 0.72)',
            } as React.CSSProperties
          }
        />

        {/* Forged Crimson Banner Pop-up (NineSlice + linear text, zero CSS filter/blur) */}
        <div className="boss-intro-enter relative z-10 w-full max-w-[540px] px-2">
          <NineSlice
            variant="bannerCrimson"
            tileTexture="row"
            highlight="blood"
            padding="0px"
            borderWidth="clamp(14px, 2.5vw, 22px) clamp(24px, 4.5vw, 38px)"
            className="relative w-full overflow-hidden shadow-[0_0_36px_rgba(229,48,58,0.5)]"
            contentClassName="px-3 py-3.5 sm:px-5 sm:py-4 flex flex-col items-center justify-center text-center gap-1.5"
          >
            {/* Urgent blood-edge-impact pulse overlay */}
            <div
              key={`boss-warning-impact-${bossIntro.seq}-${pulseBeat}`}
              aria-hidden="true"
              className="blood-edge-impact pointer-events-none absolute inset-0"
              style={
                {
                  '--splatter-opacity': '0.88',
                  background:
                    'radial-gradient(ellipse at center, rgba(229, 48, 58, 0.08) 32%, rgba(229, 48, 58, 0.44) 100%)',
                } as React.CSSProperties
              }
            />

            {/* Banner Headline Row with ui_warning icons */}
            <div className="relative z-10 flex items-center justify-center gap-3">
              <Icon id="ui_warning" size={30} className="shrink-0" />
              <h2
                id="boss-intro-title"
                className="font-blood text-[clamp(22px,5.2vw,34px)] font-black tracking-[0.2em] uppercase text-[#ff5862]"
                style={{ textShadow: '0 2px 10px rgba(179, 18, 26, 0.9)' }}
              >
                WARNING!!
              </h2>
              <Icon id="ui_warning" size={30} className="shrink-0" />
            </div>

            {/* Boss name, HP & recommended level line */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-x-2 text-xs sm:text-sm font-display font-bold tracking-[0.08em] text-[#ffe8ea]">
              <span>{bossIntro.name}</span>
              <span aria-hidden="true" className="text-[#ff8a92]">
                ·
              </span>
              <span className="font-mono-numbers tabular-nums text-[#ffd2d5]">
                {safeMaxHp.toLocaleString()} HP
              </span>
              <span aria-hidden="true" className="text-[#ff8a92]">
                ·
              </span>
              <span className="font-mono-numbers tabular-nums text-[#f2c464]">
                Rec. Lv.{bossIntro.recommendedLevel}
              </span>
            </div>
          </NineSlice>
        </div>
      </div>
    </div>
  );
};
