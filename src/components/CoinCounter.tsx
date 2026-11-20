import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

interface CoinFloatItem {
  id: number;
  delta: number;
  offsetX: number;
}

interface CoinCounterProps {
  coins: number;
  iconSize?: number;
  textClassName?: string;
  floatTextClassName?: string;
  formatTotal?: boolean;
  isUnlimited?: boolean;
  title?: string;
}

const FLOAT_OFFSETS_PX = [-5, 5, -2, 8, -8, 2];
const MAX_ACTIVE_FLOATS = 6;
const FLOAT_LIFETIME_MS = 820;

/**
 * HUD coin counter with a subtle scale-up animation on coin increase
 * and staggered floating "+N" gain badges anchored near the coin icon.
 */
export const CoinCounter: React.FC<CoinCounterProps> = ({
  coins,
  iconSize = 13,
  textClassName = 'font-display text-[clamp(10px,2vw,12px)] font-bold text-[#f2c464] tabular-nums',
  floatTextClassName = 'font-display text-[11px] sm:text-[12px] font-black tracking-[0.03em] text-[#ffe285] tabular-nums',
  formatTotal = false,
  isUnlimited = false,
  title = 'Coins',
}) => {
  const prevCoinsRef = useRef<number>(coins);
  const floatIdRef = useRef<number>(0);
  const timersRef = useRef<Map<number, number>>(new Map());
  const [popSeq, setPopSeq] = useState<number>(0);
  const [floats, setFloats] = useState<CoinFloatItem[]>([]);

  useEffect(() => {
    const prev = prevCoinsRef.current;
    prevCoinsRef.current = coins;

    if (isUnlimited) {
      setFloats([]);
      return;
    }

    if (coins > prev) {
      const delta = coins - prev;
      setPopSeq((seq) => seq + 1);

      floatIdRef.current += 1;
      const id = floatIdRef.current;
      const offsetX = FLOAT_OFFSETS_PX[id % FLOAT_OFFSETS_PX.length];

      setFloats((current) => {
        const next = [...current, { id, delta, offsetX }];
        return next.length > MAX_ACTIVE_FLOATS ? next.slice(next.length - MAX_ACTIVE_FLOATS) : next;
      });

      const timer = window.setTimeout(() => {
        timersRef.current.delete(id);
        setFloats((current) => current.filter((item) => item.id !== id));
      }, FLOAT_LIFETIME_MS);
      timersRef.current.set(id, timer);
    }
  }, [coins, isUnlimited]);

  useEffect(() => {
    const activeTimers = timersRef.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const handleFloatAnimationEnd = (id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setFloats((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="relative flex items-center gap-1 whitespace-nowrap" title={title}>
      <span
        key={`coin-icon-${popSeq}`}
        className={`inline-flex items-center shrink-0 ${popSeq > 0 ? 'hud-coin-pop' : ''}`}
      >
        <Icon id="soul_coin" size={iconSize} />
      </span>

      <span
        key={`coin-val-${popSeq}`}
        className={`${textClassName} ${!isUnlimited && popSeq > 0 ? 'hud-coin-number-pop' : ''}`}
      >
        {isUnlimited ? '∞' : formatTotal ? coins.toLocaleString() : coins}
      </span>

      {floats.length > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-full z-40 h-0 w-0 overflow-visible"
        >
          {floats.map((item) => (
            <span
              key={item.id}
              onAnimationEnd={() => handleFloatAnimationEnd(item.id)}
              className={`hud-coin-float absolute left-0 top-0 whitespace-nowrap select-none ${floatTextClassName}`}
              style={
                {
                  '--coin-float-x': `${item.offsetX}px`,
                  textShadow:
                    '0 1px 3px rgba(0, 0, 0, 0.96), 0 0 8px rgba(242, 169, 59, 0.62)',
                } as React.CSSProperties
              }
            >
              +{item.delta.toLocaleString()}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};
