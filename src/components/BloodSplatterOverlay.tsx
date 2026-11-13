import React from 'react';

export interface BloodSplatterHit {
  seq: number;
  intensity: number; // 0..1 scaled by damage taken relative to maxHp
}

interface BloodSplatterOverlayProps {
  hit: BloodSplatterHit | null;
}

export const BloodSplatterOverlay: React.FC<BloodSplatterOverlayProps> = ({ hit }) => {
  if (!hit || hit.seq <= 0) return null;

  const clampedIntensity = Math.max(0.35, Math.min(1, hit.intensity));
  const variant = hit.seq % 3;
  const edgeOpacity = (0.58 + clampedIntensity * 0.34).toFixed(2);
  const splatterOpacity = (0.64 + clampedIntensity * 0.32).toFixed(2);

  return (
    <div
      key={`blood-splatter-${hit.seq}`}
      aria-hidden="true"
      className="fixed inset-0 z-25 pointer-events-none overflow-hidden"
    >
      {/* Sharp crimson edge impact flash */}
      <div
        className="blood-edge-impact absolute inset-0"
        style={
          {
            '--splatter-opacity': edgeOpacity,
            background:
              'radial-gradient(ellipse at center, transparent 54%, rgba(120, 12, 18, 0.42) 80%, rgba(179, 18, 26, 0.82) 100%)',
            boxShadow: `inset 0 0 ${Math.round(70 + clampedIntensity * 75)}px rgba(229, 48, 58, 0.65)`,
          } as React.CSSProperties
        }
      />

      {/* Organic corner/edge SVG blood splatters (keeps screen center unobstructed) */}
      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        className="blood-splatter-flash absolute inset-0 w-full h-full"
        style={{ '--splatter-opacity': splatterOpacity } as React.CSSProperties}
      >
        <defs>
          <radialGradient id={`splatGradA-${hit.seq}`} cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#e5303a" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#b3121a" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#4a080c" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Top-Left Splat Cluster */}
        <g opacity={variant === 1 ? 0.72 : 0.95} fill={`url(#splatGradA-${hit.seq})`}>
          <path d="M-10,-10 L185,-10 C150,42 118,52 94,86 C72,118 82,148 44,162 C18,172 18,210 -10,235 Z" />
          <circle cx="152" cy="72" r="14" />
          <circle cx="195" cy="36" r="8" />
          <circle cx="96" cy="142" r="11" />
          <circle cx="52" cy="208" r="9" />
          <ellipse cx="122" cy="108" rx="18" ry="8" transform="rotate(-32 122 108)" />
        </g>

        {/* Top-Right Splat Cluster */}
        <g opacity={variant === 2 ? 0.75 : 0.96} fill={`url(#splatGradA-${hit.seq})`}>
          <path d="M1010,-10 L800,-10 C838,38 872,56 896,95 C914,126 902,158 946,184 C972,200 980,232 1010,260 Z" />
          <circle cx="845" cy="78" r="16" />
          <circle cx="792" cy="44" r="7" />
          <circle cx="888" cy="154" r="11" />
          <circle cx="944" cy="222" r="8" />
          <ellipse cx="868" cy="118" rx="19" ry="8" transform="rotate(35 868 118)" />
        </g>

        {/* Bottom-Left Splat Cluster */}
        <g opacity={variant === 0 ? 0.95 : 0.78} fill={`url(#splatGradA-${hit.seq})`}>
          <path d="M-10,1010 L210,1010 C172,958 134,946 108,906 C88,874 96,836 52,812 C24,796 18,760 -10,730 Z" />
          <circle cx="174" cy="918" r="15" />
          <circle cx="232" cy="962" r="9" />
          <circle cx="110" cy="842" r="12" />
          <circle cx="48" cy="770" r="8" />
          <ellipse cx="142" cy="884" rx="20" ry="8" transform="rotate(28 142 884)" />
        </g>

        {/* Bottom-Right Splat Cluster */}
        <g opacity={variant === 1 ? 0.96 : 0.8} fill={`url(#splatGradA-${hit.seq})`}>
          <path d="M1010,1010 L785,1010 C826,954 868,944 892,904 C912,870 906,832 952,806 C978,790 982,756 1010,722 Z" />
          <circle cx="832" cy="916" r="16" />
          <circle cx="776" cy="960" r="8" />
          <circle cx="892" cy="846" r="11" />
          <circle cx="954" cy="768" r="9" />
          <ellipse cx="862" cy="882" rx="18" ry="8" transform="rotate(-34 862 882)" />
        </g>

        {/* Side Edge Streaks (appear stronger on heavier hits) */}
        {clampedIntensity > 0.45 && (
          <g opacity="0.88" fill="#b3121a">
            <ellipse cx="16" cy="465" rx="22" ry="64" />
            <circle cx="48" cy="435" r="7" />
            <circle cx="42" cy="510" r="5.5" />
            <ellipse cx="984" cy="520" rx="22" ry="68" />
            <circle cx="950" cy="488" r="7.5" />
            <circle cx="958" cy="566" r="6" />
          </g>
        )}
      </svg>
    </div>
  );
};
