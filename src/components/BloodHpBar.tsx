import React, { useEffect, useRef, useState } from 'react';

interface BloodHpBarProps {
  hp: number;
  maxHp: number;
}

interface FallingDrop {
  id: number;
  leftPercent: number;
  delayMs: number;
  size: number;
  driftX: number;
}

export const BloodHpBar: React.FC<BloodHpBarProps> = ({ hp, maxHp }) => {
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
      // Hold lighter-red damage trail briefly before draining smoothly behind the fresh blood level
      setTrailPercent((curr) => Math.max(curr, prevPct));
      if (trailTimeoutRef.current !== null) {
        window.clearTimeout(trailTimeoutRef.current);
      }
      trailTimeoutRef.current = window.setTimeout(() => {
        setTrailPercent(hpPercent);
        trailTimeoutRef.current = null;
      }, 170);

      // Spawn 3-4 crimson blood drops falling from the wound edge
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
    } else if (hpPercent >= trailPercent || hp > prevHp) {
      if (trailTimeoutRef.current !== null) {
        window.clearTimeout(trailTimeoutRef.current);
        trailTimeoutRef.current = null;
      }
      setTrailPercent(hpPercent);
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
      {/* Forged-iron tube housing */}
      <div
        className="relative w-full h-3.5 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0b0c0e 0%, #14161a 55%, #090a0c 100%)',
          borderTop: '2px solid #4a515e',
          borderLeft: '2px solid #3a3f47',
          borderBottom: '2px solid #07080a',
          borderRight: '2px solid #090a0c',
          boxShadow:
            'inset 0 2px 4px rgba(0, 0, 0, 0.85), 0 1px 0 rgba(58, 63, 71, 0.45)',
        }}
      >
        {/* Lighter-red draining damage trail */}
        <div
          className="absolute inset-y-0 left-0 rounded-l-full transition-[width] duration-700 ease-out"
          style={{
            width: `${trailPercent}%`,
            background:
              'linear-gradient(180deg, #ff8b91 0%, #e5303a 55%, #9c141b 100%)',
            boxShadow: '0 0 8px rgba(229, 48, 58, 0.55)',
          }}
        />

        {/* Fresh blood fill with slow liquid wave & glossy highlight */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-l-full transition-[width] duration-150 ease-out"
          style={{
            width: `${hpPercent}%`,
            background:
              'linear-gradient(180deg, #e5303a 0%, #b3121a 38%, #6d0b10 82%, #3a0a0e 100%)',
            boxShadow: '0 0 12px rgba(179, 18, 26, 0.75)',
          }}
        >
          {/* Slow animated blood wave surface */}
          <svg
            aria-hidden="true"
            viewBox="0 0 120 12"
            preserveAspectRatio="none"
            className="blood-wave-svg absolute top-0 left-0 h-[55%] w-[200%] opacity-65 pointer-events-none"
          >
            <path
              d="M0,4 C15,1 30,7 45,4 C60,1 75,7 90,4 C105,1 120,7 120,4 L120,0 L0,0 Z"
              fill="#e5303a"
            />
          </svg>

          {/* Glossy liquid specular highlight along upper tube */}
          <div
            className="absolute inset-x-0 top-[1px] h-[3px] rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,220,220,0.18) 0%, rgba(255,235,235,0.42) 50%, rgba(255,205,205,0.22) 100%)',
            }}
          />

          {/* Glowing leading meniscus */}
          {hpPercent > 1 && hpPercent < 100 && (
            <div
              className="absolute right-0 inset-y-0 w-[3px] pointer-events-none"
              style={{
                background: 'rgba(229, 48, 58, 0.9)',
                boxShadow: '0 0 6px #e5303a',
              }}
            />
          )}
        </div>

        {/* Iron tube end-cap collars with tiny rivets */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-[#3a3f47] to-[#1a1c20] border-r border-[#07080a] flex items-center justify-center pointer-events-none"
        >
          <span className="w-1 h-1 rounded-full bg-[#6b7482]" />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-[#3a3f47] to-[#1a1c20] border-l border-[#07080a] flex items-center justify-center pointer-events-none"
        >
          <span className="w-1 h-1 rounded-full bg-[#6b7482]" />
        </div>
      </div>

      {/* Falling crimson blood droplets when damaged */}
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
                  background: 'radial-gradient(circle at 35% 30%, #e5303a 0%, #b3121a 55%, #3a0a0e 100%)',
                  boxShadow: '0 0 5px rgba(229, 48, 58, 0.65)',
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
};
