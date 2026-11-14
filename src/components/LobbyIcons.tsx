import React from 'react';

export const IronChainStrip: React.FC<{
  className?: string;
  links?: number;
}> = ({ className = 'w-full h-3', links = 18 }) => {
  const width = links * 20;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} 12`}
      preserveAspectRatio="none"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="chainIronLink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8d95a3" />
          <stop offset="45%" stopColor="#464c57" />
          <stop offset="100%" stopColor="#16181c" />
        </linearGradient>
      </defs>
      {Array.from({ length: links }).map((_, i) => {
        const x = i * 20;
        return (
          <g key={i}>
            {/* Horizontal connecting link */}
            <rect
              x={x + 1}
              y="2.5"
              width="14"
              height="7"
              rx="3.5"
              fill="none"
              stroke="url(#chainIronLink)"
              strokeWidth="2.4"
            />
            <rect
              x={x + 2}
              y="3.2"
              width="12"
              height="5.6"
              rx="2.8"
              fill="none"
              stroke="#0a0b0e"
              strokeWidth="0.8"
            />
            {/* Interlocking vertical pin link */}
            {i < links - 1 && (
              <rect
                x={x + 12}
                y="4"
                width="10"
                height="4"
                rx="2"
                fill="#59606d"
                stroke="#0c0d11"
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
};

export const IronShackleCorner: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="7.5" stroke="#5b6370" strokeWidth="3.2" />
    <circle cx="12" cy="12" r="7.5" stroke="#101216" strokeWidth="1" />
    <circle cx="12" cy="12" r="3" fill="#2c3038" stroke="#0c0d11" strokeWidth="1.2" />
  </svg>
);

export const BloodDripEdge: React.FC<{
  className?: string;
  variant?: 'wide' | 'compact';
}> = ({ className = 'w-full h-3.5', variant = 'wide' }) => (
  <svg
    aria-hidden="true"
    viewBox={variant === 'wide' ? '0 0 320 18' : '0 0 160 14'}
    preserveAspectRatio="none"
    className={className}
    fill="none"
  >
    <defs>
      <linearGradient id="viscousBloodGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#45060a" />
        <stop offset="55%" stopColor="#990f17" />
        <stop offset="100%" stopColor="#d4222c" />
      </linearGradient>
    </defs>
    {variant === 'wide' ? (
      <path
        d="M14 0 C22 0 28 3 34 0 H78 C81 5 79 11 82 14 C85 11 83 5 86 0 H142 C144 4 143 8 145 10 C147 8 146 4 148 0 H212 C215 6 213 13 216 16.5 C219 13 217 6 220 0 H268 C270 4 269 9 271 11 C273 9 272 4 274 0 H308 C309 3 308 6 310 7.5 C312 6 311 3 312 0 Z"
        fill="url(#viscousBloodGrad)"
      />
    ) : (
      <path
        d="M16 0 C18 4 17 9 19 11.5 C21 9 20 4 22 0 H68 C70 5 69 10 71 13 C73 10 72 5 74 0 H122 C124 3.5 123 7.5 125 9.5 C127 7.5 126 3.5 128 0 Z"
        fill="url(#viscousBloodGrad)"
      />
    )}
  </svg>
);

export const Coin3DIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="coinGoldRim" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#f8e3a1" />
        <stop offset="40%" stopColor="#d49635" />
        <stop offset="80%" stopColor="#8c5414" />
        <stop offset="100%" stopColor="#4a2907" />
      </radialGradient>
      <radialGradient id="coinGoldFace" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#efd07b" />
        <stop offset="60%" stopColor="#b87822" />
        <stop offset="100%" stopColor="#693e0c" />
      </radialGradient>
    </defs>
    <ellipse cx="16" cy="27.5" rx="9" ry="2.2" fill="rgba(0,0,0,0.7)" />
    <circle cx="16" cy="16" r="12" fill="url(#coinGoldRim)" stroke="#2e1803" strokeWidth="1.3" />
    <circle cx="16" cy="16" r="8.6" fill="url(#coinGoldFace)" stroke="#f6dfa0" strokeOpacity="0.35" strokeWidth="0.9" />
    <path
      d="M16 10.2 L19.2 16 L16 21.8 L12.8 16 Z"
      fill="#f5dc93"
      fillOpacity="0.82"
      stroke="#593207"
      strokeWidth="0.9"
    />
  </svg>
);

export const Gem3DIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="gemGarnetMain" x1="20%" y1="10%" x2="80%" y2="90%">
        <stop offset="0%" stopColor="#e5a6c0" />
        <stop offset="35%" stopColor="#a63664" />
        <stop offset="75%" stopColor="#631336" />
        <stop offset="100%" stopColor="#2e0617" />
      </linearGradient>
    </defs>
    <ellipse cx="16" cy="28" rx="7.5" ry="2" fill="rgba(0,0,0,0.7)" />
    <polygon
      points="16,4 25,11 22.5,24.5 16,28 9.5,24.5 7,11"
      fill="url(#gemGarnetMain)"
      stroke="#230512"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <polygon points="16,4 21,11.5 16,15 11,11.5" fill="#f0bfd4" fillOpacity="0.58" />
    <polygon points="11,11.5 16,15 16,28 9.5,24.5" fill="#7a1b42" fillOpacity="0.6" />
    <polygon points="21,11.5 25,11 22.5,24.5 16,28 16,15" fill="#470c24" fillOpacity="0.7" />
    <line x1="16" y1="4" x2="16" y2="28" stroke="#f0bfd4" strokeOpacity="0.32" strokeWidth="0.8" />
  </svg>
);

export const SkullTrimEmblem: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="skullMetalGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#aeb5c2" />
        <stop offset="50%" stopColor="#5e6673" />
        <stop offset="100%" stopColor="#1e2228" />
      </linearGradient>
    </defs>
    <path
      d="M14 3.5 C8.8 3.5 5.5 7.2 5.5 12 C5.5 15 6.8 17 8.4 18.4 L8.8 22.8 C8.8 23.6 9.4 24.2 10.2 24.2 H17.8 C18.6 24.2 19.2 23.6 19.2 22.8 L19.6 18.4 C21.2 17 22.5 15 22.5 12 C22.5 7.2 19.2 3.5 14 3.5 Z"
      fill="url(#skullMetalGrad)"
      stroke="#090a0d"
      strokeWidth="1.4"
    />
    <ellipse cx="10.4" cy="13" rx="2.1" ry="2.3" fill="#07080a" />
    <ellipse cx="17.6" cy="13" rx="2.1" ry="2.3" fill="#07080a" />
    <circle cx="10.4" cy="13" r="0.75" fill="#b3121a" />
    <circle cx="17.6" cy="13" r="0.75" fill="#b3121a" />
    <path d="M13.2 16.5 L14 14.8 L14.8 16.5 Z" fill="#07080a" />
    <line x1="11.5" y1="20.5" x2="11.5" y2="23.5" stroke="#090a0d" strokeWidth="1.1" />
    <line x1="14" y1="20.5" x2="14" y2="23.5" stroke="#090a0d" strokeWidth="1.1" />
    <line x1="16.5" y1="20.5" x2="16.5" y2="23.5" stroke="#090a0d" strokeWidth="1.1" />
  </svg>
);

export const PlayTriangle3DIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="playBloodSteelGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e54d42" />
        <stop offset="50%" stopColor="#a6121b" />
        <stop offset="100%" stopColor="#4f060a" />
      </linearGradient>
    </defs>
    <path
      d="M7 4.8 L23.5 14 L7 23.2 Z"
      fill="url(#playBloodSteelGrad)"
      stroke="#c79e65"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <path d="M9.4 8.5 L19.2 14 L9.4 19.5 Z" fill="#d92b34" fillOpacity="0.45" />
  </svg>
);

export const ShopPouch3DIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="pouchBody" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0%" stopColor="#9e6d39" />
        <stop offset="55%" stopColor="#5e3a19" />
        <stop offset="100%" stopColor="#2a1708" />
      </linearGradient>
      <linearGradient id="pouchGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e6c373" />
        <stop offset="100%" stopColor="#8f5812" />
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="31" rx="9" ry="2.2" fill="rgba(0,0,0,0.7)" />
    <path
      d="M13.5 11.5 C10.5 14.5 7.5 19 8.5 25 C9.3 29.2 13.4 30.8 18 30.8 C22.6 30.8 26.7 29.2 27.5 25 C28.5 19 25.5 14.5 22.5 11.5 L24 7.5 C21 8.5 15 8.5 12 7.5 Z"
      fill="url(#pouchBody)"
      stroke="#140b03"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <rect x="12.5" y="10.8" width="11" height="2.6" rx="1.2" fill="url(#pouchGold)" stroke="#382005" strokeWidth="0.9" />
    <polygon points="18,15.5 21.5,19 18,23.5 14.5,19" fill="#d49635" stroke="#472a06" strokeWidth="1" />
    <circle cx="24" cy="24.5" r="3.4" fill="url(#pouchGold)" stroke="#382005" strokeWidth="0.9" />
  </svg>
);

export const MissionsScroll3DIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="scrollParchment" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#d9c6a0" />
        <stop offset="55%" stopColor="#a18861" />
        <stop offset="100%" stopColor="#59462d" />
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="31" rx="9" ry="2.1" fill="rgba(0,0,0,0.7)" />
    <path
      d="M11 8 H25 C26.6 8 27.8 9.2 27.8 10.8 V24.5 C27.8 26.2 26.5 27.5 24.8 27.5 H11.2 C9.5 27.5 8.2 26.2 8.2 24.5 V10.8 C8.2 9.2 9.4 8 11 8 Z"
      fill="url(#scrollParchment)"
      stroke="#1f170e"
      strokeWidth="1.3"
    />
    <rect x="7" y="7" width="22" height="4.2" rx="2.1" fill="#bda376" stroke="#241a10" strokeWidth="1.1" />
    <rect x="7" y="24.8" width="22" height="4.2" rx="2.1" fill="#967c52" stroke="#241a10" strokeWidth="1.1" />
    <line x1="12.5" y1="15" x2="23.5" y2="15" stroke="#453320" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="12.5" y1="18.6" x2="21.5" y2="18.6" stroke="#453320" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="12.5" y1="22.1" x2="18.5" y2="22.1" stroke="#453320" strokeWidth="1.4" strokeLinecap="round" />
    <circle cx="24" cy="23.2" r="3.6" fill="#8f0e16" stroke="#2e0407" strokeWidth="1" />
    <circle cx="23.4" cy="22.6" r="1.2" fill="#e55a60" fillOpacity="0.55" />
  </svg>
);

export const HomeGate3DIcon: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 44 44" className={className} fill="none" aria-hidden="true">
    <defs>
      <radialGradient id="gateCrimsonIronGlow" cx="50%" cy="48%" r="55%">
        <stop offset="0%" stopColor="#b3121a" stopOpacity="0.68" />
        <stop offset="60%" stopColor="#4f8fa6" stopOpacity="0.22" />
        <stop offset="100%" stopColor="rgba(18,19,22,0)" />
      </radialGradient>
      <linearGradient id="shieldMetal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#8d96a6" />
        <stop offset="50%" stopColor="#3d434f" />
        <stop offset="100%" stopColor="#16191f" />
      </linearGradient>
      <linearGradient id="swordBlade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d7dee8" />
        <stop offset="55%" stopColor="#7a8494" />
        <stop offset="100%" stopColor="#2c313b" />
      </linearGradient>
    </defs>
    <circle cx="22" cy="22" r="20" fill="url(#gateCrimsonIronGlow)" />
    {/* Crossed Steel Broadswords */}
    <path d="M10 33 L33 10" stroke="url(#swordBlade)" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M34 33 L11 10" stroke="url(#swordBlade)" strokeWidth="2.8" strokeLinecap="round" />
    {/* Forged Iron Shield Gate */}
    <path
      d="M22 7.5 L33 11.5 V21.5 C33 28.5 28 33.8 22 36.5 C16 33.8 11 28.5 11 21.5 V11.5 Z"
      fill="url(#shieldMetal)"
      stroke="#a61720"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M22 10.5 L30 13.5 V21.2 C30 26.6 26.3 30.8 22 33 C17.7 30.8 14 26.6 14 21.2 V13.5 Z"
      fill="#101217"
      stroke="#586170"
      strokeWidth="1"
    />
    {/* Blood & Lantern Crest */}
    <path
      d="M22 14.2 C24.6 17.6 25.5 20.6 24.4 23.6 C23.6 25.7 22.6 27 22 27.6 C21.4 27 20.4 25.7 19.6 23.6 C18.5 20.6 19.4 17.6 22 14.2 Z"
      fill="#b3121a"
    />
    <path
      d="M22 17.8 C23.1 19.8 23.4 21.6 22.7 23.3 C22.4 24.1 22.2 24.7 22 25 C21.8 24.7 21.6 24.1 21.3 23.3 C20.6 21.6 20.9 19.8 22 17.8 Z"
      fill="#6aaac2"
    />
  </svg>
);

export const BestiaryTome3DIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="tomeLeather" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#631b21" />
        <stop offset="55%" stopColor="#330d11" />
        <stop offset="100%" stopColor="#160608" />
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="31" rx="9.5" ry="2.1" fill="rgba(0,0,0,0.7)" />
    <rect x="8.5" y="6.5" width="19" height="23" rx="2.5" fill="url(#tomeLeather)" stroke="#0f0708" strokeWidth="1.3" />
    <rect x="8.5" y="6.5" width="4" height="23" rx="1.5" fill="#1e080b" stroke="#4f5663" strokeWidth="0.9" />
    <line x1="10" y1="12" x2="27.5" y2="23.5" stroke="#7c8594" strokeWidth="2.2" strokeDasharray="3 1.5" />
    <line x1="10" y1="23.5" x2="27.5" y2="12" stroke="#7c8594" strokeWidth="2.2" strokeDasharray="3 1.5" />
    <circle cx="19" cy="18" r="3.8" fill="#13151a" stroke="#8f98a6" strokeWidth="1.1" />
    <ellipse cx="19" cy="18" rx="2.2" ry="1.3" fill="#b3121a" />
    <circle cx="19" cy="18" r="0.6" fill="#e8c384" />
  </svg>
);

export const AchievementsTrophy3DIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 36 36" className={className} fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f2dc9b" />
        <stop offset="45%" stopColor="#c48a29" />
        <stop offset="100%" stopColor="#5e3407" />
      </linearGradient>
    </defs>
    <ellipse cx="18" cy="31" rx="8.5" ry="2" fill="rgba(0,0,0,0.7)" />
    <path d="M11.5 9.5 H7.8 C6.8 9.5 6.4 10.6 6.8 12.2 C7.3 14.5 9 16.5 11.8 17" stroke="#9e691a" strokeWidth="2" strokeLinecap="round" />
    <path d="M24.5 9.5 H28.2 C29.2 9.5 29.6 10.6 29.2 12.2 C28.7 14.5 27 16.5 24.2 17" stroke="#9e691a" strokeWidth="2" strokeLinecap="round" />
    <path
      d="M11 7.5 H25 V14 C25 18.6 21.8 21.5 18 21.5 C14.2 21.5 11 18.6 11 14 Z"
      fill="url(#trophyGold)"
      stroke="#3b2003"
      strokeWidth="1.2"
    />
    <rect x="16.2" y="21.5" width="3.6" height="4.5" fill="#965d12" stroke="#3b2003" strokeWidth="1" />
    <path d="M12.5 26 H23.5 L25 29.5 H11 Z" fill="url(#trophyGold)" stroke="#3b2003" strokeWidth="1.1" />
    <ellipse cx="15" cy="11.8" rx="1.6" ry="3.2" fill="rgba(255,245,215,0.32)" />
  </svg>
);
