import React, { useEffect, useRef, useState } from 'react';

export interface ComboMultiplierHudProps {
  combo: number;
  comboKills: number;
  comboTimeRemainingMs: number;
}

interface ComboTextStyle {
  tierLabel: string;
  countColor: string;
  countShadow: string;
  subColor: string;
  subShadow: string;
  countSizeClass: string;
}

function getComboTextStyle(combo: number, comboKills: number): ComboTextStyle {
  const tier = Math.max(1, Math.min(5, Math.floor(combo)));

  if (tier === 1) {
    return {
      tierLabel: 'COMBO',
      countColor: '#f5e4dc',
      countShadow: '0 2px 6px rgba(0, 0, 0, 0.96), 0 0 10px rgba(179, 18, 26, 0.45)',
      subColor: '#d4a39e',
      subShadow: '0 1px 4px rgba(0, 0, 0, 0.95)',
      countSizeClass: 'text-[22px] sm:text-[26px]',
    };
  }

  if (tier === 2) {
    return {
      tierLabel: 'BLOODLUST',
      countColor: '#ff8a8f',
      countShadow:
        '0 2px 8px rgba(0, 0, 0, 0.96), 0 0 12px rgba(229, 48, 58, 0.8), 0 0 22px rgba(179, 18, 26, 0.45)',
      subColor: '#f7999e',
      subShadow: '0 1px 5px rgba(0, 0, 0, 0.95), 0 0 8px rgba(220, 32, 42, 0.5)',
      countSizeClass: 'text-[24px] sm:text-[28px]',
    };
  }

  if (tier === 3) {
    return {
      tierLabel: 'RAMPAGE',
      countColor: '#ff646b',
      countShadow:
        '0 2px 8px rgba(0, 0, 0, 0.98), 0 0 14px rgba(245, 40, 50, 0.92), 0 0 28px rgba(190, 18, 28, 0.65)',
      subColor: '#ff9ea3',
      subShadow: '0 1px 6px rgba(0, 0, 0, 0.96), 0 0 10px rgba(242, 38, 48, 0.65)',
      countSizeClass: 'text-[26px] sm:text-[31px]',
    };
  }

  if (tier === 4) {
    return {
      tierLabel: 'CARNAGE',
      countColor: '#ffb59e',
      countShadow:
        '0 2px 8px rgba(0, 0, 0, 0.98), 0 0 14px rgba(255, 58, 46, 0.98), 0 0 30px rgba(235, 22, 34, 0.82)',
      subColor: '#ffc7b3',
      subShadow: '0 1px 6px rgba(0, 0, 0, 0.96), 0 0 12px rgba(255, 52, 46, 0.78)',
      countSizeClass: 'text-[28px] sm:text-[34px]',
    };
  }

  const overdrive = comboKills >= 60;
  return {
    tierLabel: overdrive ? 'BLOOD GOD' : 'UNSTOPPABLE',
    countColor: overdrive ? '#fff3d6' : '#ffebe6',
    countShadow: overdrive
      ? '0 2px 8px rgba(38, 0, 4, 0.98), 0 0 12px #ff9a3c, 0 0 24px #ff2434, 0 0 42px rgba(255, 20, 32, 0.92)'
      : '0 2px 8px rgba(38, 0, 4, 0.98), 0 0 12px #ff424e, 0 0 26px #ff1a2a, 0 0 40px rgba(240, 16, 28, 0.85)',
    subColor: overdrive ? '#ffd98a' : '#ffd2ca',
    subShadow: '0 1px 6px rgba(0, 0, 0, 0.98), 0 0 14px rgba(255, 42, 52, 0.88)',
    countSizeClass: 'text-[30px] sm:text-[36px]',
  };
}

const ComboMultiplierHudComponent: React.FC<ComboMultiplierHudProps> = ({
  combo,
  comboKills,
  comboTimeRemainingMs,
}) => {
  const isActive = comboKills > 0 && comboTimeRemainingMs > 0;

  const [renderedState, setRenderedState] = useState({
    combo: 1,
    comboKills: 0,
  });
  const [mounted, setMounted] = useState<boolean>(false);
  const [animState, setAnimState] = useState<{
    seq: number;
    kind: 'none' | 'kill' | 'tier';
  }>({ seq: 0, kind: 'none' });

  const prevKillsRef = useRef<number>(comboKills);
  const prevComboRef = useRef<number>(combo);
  const unmountTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isActive) {
      if (unmountTimerRef.current !== null) {
        window.clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
      setMounted(true);
      setRenderedState({ combo, comboKills });

      if (combo > prevComboRef.current && prevKillsRef.current > 0) {
        setAnimState((prev) => ({ seq: prev.seq + 1, kind: 'tier' }));
      } else if (comboKills > prevKillsRef.current) {
        setAnimState((prev) => ({ seq: prev.seq + 1, kind: 'kill' }));
      }
    } else if (mounted) {
      if (unmountTimerRef.current !== null) {
        window.clearTimeout(unmountTimerRef.current);
      }
      unmountTimerRef.current = window.setTimeout(() => {
        unmountTimerRef.current = null;
        setMounted(false);
        setAnimState({ seq: 0, kind: 'none' });
      }, 220);
    }

    prevKillsRef.current = comboKills;
    prevComboRef.current = combo;
  }, [isActive, combo, comboKills, mounted]);

  useEffect(() => {
    return () => {
      if (unmountTimerRef.current !== null) {
        window.clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, []);

  if (!mounted) return null;

  const activeCombo = renderedState.combo;
  const activeKills = renderedState.comboKills;
  const style = getComboTextStyle(activeCombo, activeKills);

  const animClass =
    animState.kind === 'tier'
      ? 'combo-tier-surge'
      : animState.kind === 'kill'
        ? 'combo-kill-bump'
        : '';

  return (
    <div
      role="status"
      aria-live="off"
      aria-label={`${activeKills} kill combo, ${activeCombo}x multiplier`}
      className="pointer-events-none select-none mt-1 pl-1 transition-[opacity,transform] duration-200 ease-out"
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive
          ? 'translate3d(0, 0, 0) scale(1)'
          : 'translate3d(-10px, -2px, 0) scale(0.92)',
      }}
    >
      <div
        key={`combo-text-${animState.seq}`}
        className={`flex flex-col items-start leading-none origin-left ${animClass}`}
      >
        {/* Dynamic Kill Count Text */}
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className={`font-blood font-black tracking-tight tabular-nums leading-none ${style.countSizeClass}`}
            style={{
              color: style.countColor,
              textShadow: style.countShadow,
            }}
          >
            {activeKills}
          </span>
          <span
            className="font-display text-[11px] sm:text-[12px] font-black tracking-[0.14em] uppercase"
            style={{
              color: style.subColor,
              textShadow: style.subShadow,
            }}
          >
            {activeKills === 1 ? 'KILL' : 'KILLS'}
          </span>
        </div>

        {/* Escalating Combo Tier & Multiplier Subtext (no frame, no timer) */}
        <div
          className="mt-0.5 flex items-center gap-1.5 font-display text-[10px] sm:text-[11px] font-black tracking-[0.12em] uppercase whitespace-nowrap tabular-nums"
          style={{
            color: style.subColor,
            textShadow: style.subShadow,
          }}
        >
          <span>{style.tierLabel}</span>
          {activeCombo > 1 && (
            <>
              <span aria-hidden="true">·</span>
              <span style={{ color: style.countColor }}>×{activeCombo}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const ComboMultiplierHud = React.memo(ComboMultiplierHudComponent);
