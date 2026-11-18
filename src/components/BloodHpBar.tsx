import React, { useEffect, useRef, useState } from 'react';
import { UiBar } from './ui/UiBar';

interface BloodHpBarProps {
  hp: number;
  maxHp: number;
  compact?: boolean;
}

interface FallingDrop {
  id: number;
  leftPercent: number;
  delayMs: number;
  size: number;
  driftX: number;
}

export const BloodHpBar: React.FC<BloodHpBarProps> = React.memo(
  ({ hp, maxHp, compact = false }) => {
    const hpPercent = Math.max(0, Math.min(100, (hp / Math.max(1, maxHp)) * 100));
    const [trailPercent, setTrailPercent] = useState<number>(hpPercent);
    const [drops, setDrops] = useState<FallingDrop[]>([]);

    const prevHpRef = useRef<number>(hp);
    const prevPercentRef = useRef<number>(hpPercent);
    const trailTimeoutRef = useRef<number | null>(null);
    const dropIdRef = useRef<number>(1);

    useEffect(() => {
      const prevHp = prevHpRef.current;
      const prevPct = prevPercentRef.current;

      if (hp < prevHp - 0.01 && prevPct > hpPercent) {
        setTrailPercent((curr) => Math.max(curr, prevPct));
        if (trailTimeoutRef.current !== null) {
          window.clearTimeout(trailTimeoutRef.current);
        }
        trailTimeoutRef.current = window.setTimeout(() => {
          setTrailPercent(hpPercent);
          trailTimeoutRef.current = null;
        }, 170);

        const count = 3 + (Math.floor(hp) % 2);
        const newDrops: FallingDrop[] = Array.from({ length: count }, (_, idx) => {
          const id = dropIdRef.current++;
          const offset = (idx - (count - 1) / 2) * 3.2;
          return {
            id,
            leftPercent: Math.max(4, Math.min(96, hpPercent + offset)),
            delayMs: idx * 55,
            size: 4 + (idx % 2) * 1.5,
            driftX: (idx % 2 === 0 ? -1 : 1) * (1 + idx),
          };
        });

        setDrops((prev) => [...prev.slice(-10), ...newDrops]);
        const createdIds = new Set(newDrops.map((d) => d.id));
        window.setTimeout(() => {
          setDrops((prev) => prev.filter((d) => !createdIds.has(d.id)));
        }, 780);
      } else if (hp > prevHp) {
        if (trailTimeoutRef.current !== null) {
          window.clearTimeout(trailTimeoutRef.current);
          trailTimeoutRef.current = null;
        }
        setTrailPercent(hpPercent);
      } else {
        setTrailPercent((curr) => (hpPercent >= curr ? hpPercent : curr));
      }

      prevHpRef.current = hp;
      prevPercentRef.current = hpPercent;
    }, [hp, hpPercent]);

    useEffect(() => {
      return () => {
        if (trailTimeoutRef.current !== null) {
          window.clearTimeout(trailTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="relative w-full">
        <UiBar
          percent={hpPercent}
          trailPercent={trailPercent}
          fill="crimson"
          heightClassName={compact ? 'h-[11px]' : 'h-[16px]'}
          frameBorderWidth={compact ? '2px 5px' : '3px 8px'}
          ariaLabel={`Health ${Math.round(hp)} of ${maxHp}`}
        />

        {drops.length > 0 && (
          <div className="absolute left-0 right-0 top-full h-7 pointer-events-none overflow-visible">
            {drops.map((d) => (
              <span
                key={d.id}
                className="blood-drop-fall absolute top-0 rounded-full"
                style={
                  {
                    left: `${d.leftPercent}%`,
                    width: `${d.size}px`,
                    height: `${d.size * 1.45}px`,
                    background:
                      'radial-gradient(circle at 35% 30%, #e5303a 0%, #b3121a 55%, #3a0a0e 100%)',
                    animationDelay: `${d.delayMs}ms`,
                    '--drop-drift': `${d.driftX}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
