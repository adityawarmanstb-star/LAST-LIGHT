import React, { useEffect } from 'react';
import { BookOpen, Compass, Crosshair, Flame, Sparkles, X } from 'lucide-react';
import { soundManager } from '../game/audio';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { IronCard } from './IronCard';

interface HowToPlayModalProps {
  isOpen: boolean;
  isFirstLaunch?: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({
  isOpen,
  isFirstLaunch = false,
  onClose,
}) => {
  const { processedSrc: playBtnSrc, hasError: playBtnError } = useChromaKeyImage(UI_ASSETS.btnPlay);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-[60] flex items-center justify-center safe-area-pad select-none"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(5, 8, 12, 0.85)',
      }}
    >
      <div
        className="w-[92%] max-w-[400px] max-h-[86dvh] flex flex-col"
        style={{
          filter:
            'drop-shadow(0 22px 44px rgba(0, 0, 0, 0.96)) drop-shadow(0 0 22px rgba(153, 15, 23, 0.34))',
        }}
      >
        <IronCard
          className="w-full max-h-[86dvh] flex flex-col"
          contentClassName="flex flex-col max-h-[86dvh] p-4 sm:p-5 overflow-hidden"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#3a3f47]/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Beveled Dark-Iron Book Emblem */}
              <div
                className="w-11 h-11 rounded-[9px] flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #252a34 0%, #101318 100%)',
                  border: '2px solid #596475',
                  boxShadow:
                    'inset 0 1px 0 rgba(200, 215, 235, 0.25), 0 4px 10px rgba(0, 0, 0, 0.85)',
                }}
              >
                <BookOpen className="w-5 h-5 text-[#5de4ff]" />
              </div>

              <div className="min-w-0 text-left">
                <h2
                  id="how-to-play-title"
                  className="font-display font-black text-lg sm:text-xl tracking-[0.12em] uppercase leading-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 0 #170805)',
                  }}
                >
                  HOW TO PLAY
                </h2>
                <p className="font-body font-medium text-[12.5px] text-[#cbbba0] leading-snug mt-1">
                  {isFirstLaunch
                    ? 'Master the lantern before entering the dark'
                    : 'Touch controls, stance auto-fire & lantern survival'}
                </p>
              </div>
            </div>

            {/* Tactile 42x42 Rusted-Iron Close Button */}
            <IronCard
              asButton
              ariaLabel="Close How to Play"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onClose();
              }}
              className="w-[42px] h-[42px] shrink-0 active:scale-95"
              contentClassName="w-full h-full p-0 flex items-center justify-center"
            >
              <X className="w-4.5 h-4.5 text-[#ede0c4]" />
            </IronCard>
          </div>

          {/* Scrollable Guide Sections with Clean Bottom Fade Mask */}
          <div
            className="flex-1 min-h-0 overflow-y-auto py-3.5 pr-0.5 flex flex-col gap-3"
            style={{
              maskImage:
                'linear-gradient(to bottom, black 0%, black calc(100% - 22px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black calc(100% - 22px), transparent 100%)',
            }}
          >
            {/* Step 01: Move & Weave */}
            <section
              className="rounded-[10px] p-3.5 flex flex-col gap-2.5"
              style={{
                background: 'rgba(10, 12, 16, 0.84)',
                border: '1.5px solid #2e343f',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#5de4ff] shrink-0" />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    01. MOVE &amp; WEAVE
                  </h3>
                </div>
                <span className="font-body text-[11px] font-semibold text-[#9c8e72] whitespace-nowrap">
                  Drag · Tap Dash
                </span>
              </div>

              {/* Visual Diagram SVG: Virtual Joystick + Circular Glowing Cyan Tactile Dash Button */}
              <div className="rounded-[8px] bg-[#0d1015] border border-[#262b34] p-2 overflow-hidden">
                <svg
                  viewBox="0 0 320 132"
                  className="w-full h-auto block"
                  role="img"
                  aria-label="Diagram showing touch drag virtual joystick on the left and circular glowing cyan Dash button on the right"
                >
                  <defs>
                    <radialGradient id="htpMoveGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#5de4ff" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#5de4ff" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="htpDashAura" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
                      <stop offset="70%" stopColor="#22d3ee" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="htpDashIron" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2c313b" />
                      <stop offset="55%" stopColor="#181b21" />
                      <stop offset="100%" stopColor="#0c0e12" />
                    </linearGradient>
                  </defs>

                  {/* Left Half: Touch Joystick */}
                  <rect x="6" y="6" width="148" height="120" rx="8" fill="#13161c" stroke="#282d35" />
                  <text
                    x="80"
                    y="23"
                    textAnchor="middle"
                    fill="#9c8e72"
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.06em"
                  >
                    TOUCH DRAG
                  </text>

                  <circle cx="62" cy="74" r="30" fill="#0d0f13" stroke="#3a3f47" strokeWidth="1.5" strokeDasharray="4 3" />
                  <line x1="62" y1="74" x2="88" y2="56" stroke="#5de4ff" strokeWidth="2" strokeLinecap="round" />
                  <polygon points="92,53 83,54 88,61" fill="#5de4ff" />
                  <circle cx="80" cy="62" r="13" fill="#1f252d" stroke="#5de4ff" strokeWidth="2" />
                  <circle cx="80" cy="62" r="4.5" fill="#5de4ff" opacity="0.9" />

                  <circle cx="122" cy="72" r="18" fill="url(#htpMoveGlow)" />
                  <path d="M104 82 Q113 78 120 72" fill="none" stroke="#5de4ff" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                  <circle cx="124" cy="70" r="8" fill="#1b2129" stroke="#d8c9a8" strokeWidth="1.8" />
                  <circle cx="127" cy="67" r="2.6" fill="#5de4ff" />

                  {/* Right Half: Circular Glowing Cyan Tactile Dash Button */}
                  <rect x="166" y="6" width="148" height="120" rx="8" fill="#13161c" stroke="#282d35" />
                  <text
                    x="240"
                    y="23"
                    textAnchor="middle"
                    fill="#9c8e72"
                    fontSize="10"
                    fontWeight="700"
                    letterSpacing="0.06em"
                  >
                    TAP TO DASH
                  </text>

                  <circle cx="240" cy="64" r="34" fill="url(#htpDashAura)" />
                  <circle cx="240" cy="64" r="25" fill="url(#htpDashIron)" stroke="#596475" strokeWidth="2.5" />
                  <circle cx="240" cy="64" r="22.5" fill="none" stroke="#22d3ee" strokeWidth="2.6" opacity="0.95" />
                  {/* Small Wind/Dash glyph + DASH label inside circle */}
                  <path
                    d="M231 57 H245 C247.5 57 248.5 54 246 53.5 M229 61 H248 C250.5 61 251 64 248.5 64.5"
                    fill="none"
                    stroke="#5de4ff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <text
                    x="240"
                    y="75.5"
                    textAnchor="middle"
                    fill="#ede0c4"
                    fontSize="8.5"
                    fontWeight="800"
                    letterSpacing="0.08em"
                  >
                    DASH
                  </text>

                  <text x="240" y="109" textAnchor="middle" fill="#9c8e72" fontSize="9.5">
                    Evade swarms with i-frames
                  </text>
                </svg>
              </div>

              <p className="font-body text-[14px] leading-snug text-[#cbbba0] text-left">
                <strong className="text-[#ede0c4] font-bold">Drag anywhere</strong> to weave
                through shadows, and tap{' '}
                <strong className="text-[#5de4ff] font-bold">DASH</strong> to slip past hordes
                while scooping up{' '}
                <span className="text-[#5de4ff] font-bold">XP Gems</span> and{' '}
                <span className="text-[#f2c464] font-bold">Soul Coins</span>.
              </p>
            </section>

            {/* Step 02: Stand Still to Auto-Fire */}
            <section
              className="rounded-[10px] p-3.5 flex flex-col gap-2.5"
              style={{
                background: 'rgba(10, 12, 16, 0.84)',
                border: '1.5px solid #2e343f',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-[#f2c464] shrink-0" />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    02. STAND STILL TO AUTO-FIRE
                  </h3>
                </div>
                <span className="font-body text-[11px] font-bold text-[#5de4ff] whitespace-nowrap">
                  +20% Lantern Sight
                </span>
              </div>

              {/* Visual Diagram SVG */}
              <div className="rounded-[8px] bg-[#0d1015] border border-[#262b34] p-2 overflow-hidden">
                <svg
                  viewBox="0 0 320 134"
                  className="w-full h-auto block"
                  role="img"
                  aria-label="Diagram showing the player standing still inside a glowing cyan stance ring, auto-firing bolts at enemies"
                >
                  <defs>
                    <radialGradient id="htpLanternAura" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#5de4ff" stopOpacity="0.28" />
                      <stop offset="65%" stopColor="#5de4ff" stopOpacity="0.09" />
                      <stop offset="100%" stopColor="#5de4ff" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect x="6" y="6" width="308" height="122" rx="8" fill="#13161c" stroke="#282d35" />

                  <circle cx="106" cy="70" r="54" fill="url(#htpLanternAura)" />
                  <circle cx="106" cy="70" r="48" fill="none" stroke="#5de4ff" strokeWidth="1" strokeDasharray="4 4" opacity="0.45" />
                  <circle cx="106" cy="72" r="24" fill="none" stroke="#5de4ff" strokeWidth="2" opacity="0.85" />
                  <circle cx="106" cy="48" r="3.8" fill="#f2a93b" />
                  <circle cx="85" cy="84" r="3.8" fill="#f2a93b" />

                  <circle cx="106" cy="70" r="9.5" fill="#1e242d" stroke="#d8c9a8" strokeWidth="2" />
                  <circle cx="111" cy="67" r="2.8" fill="#5de4ff" />

                  <line x1="122" y1="68" x2="184" y2="54" stroke="#5de4ff" strokeWidth="2" strokeDasharray="5 3" />
                  <ellipse cx="188" cy="53" rx="6" ry="2.8" transform="rotate(-13 188 53)" fill="#cffafe" />
                  <line x1="122" y1="73" x2="186" y2="86" stroke="#5de4ff" strokeWidth="2" strokeDasharray="5 3" />
                  <ellipse cx="190" cy="87" rx="6" ry="2.8" transform="rotate(12 190 87)" fill="#cffafe" />

                  <g transform="translate(210, 48)">
                    <circle cx="0" cy="0" r="9.5" fill="#2b1216" stroke="#e5303a" strokeWidth="1.8" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#e5303a" fontSize="11" fontWeight="900">
                      !
                    </text>
                  </g>
                  <g transform="translate(212, 90)">
                    <circle cx="0" cy="0" r="9.5" fill="#2b1216" stroke="#e5303a" strokeWidth="1.8" />
                    <text x="0" y="3.5" textAnchor="middle" fill="#e5303a" fontSize="11" fontWeight="900">
                      !
                    </text>
                  </g>

                  <text x="106" y="21" textAnchor="middle" fill="#5de4ff" fontSize="9.5" fontWeight="700">
                    STANCE LIT · AUTO-FIRE
                  </text>
                  <text x="211" y="21" textAnchor="middle" fill="#e5303a" fontSize="9.5" fontWeight="700">
                    NEAREST FOES
                  </text>

                  <rect x="242" y="33" width="62" height="72" rx="6" fill="#1a1216" stroke="#b3121a" strokeWidth="1" opacity="0.95" />
                  <text x="273" y="53" textAnchor="middle" fill="#e5303a" fontSize="11" fontWeight="800">
                    &gt; 4s
                  </text>
                  <text x="273" y="68" textAnchor="middle" fill="#d8c9a8" fontSize="8.5" fontWeight="600">
                    PRESSURE
                  </text>
                  <text x="273" y="81" textAnchor="middle" fill="#9c8e72" fontSize="8">
                    Foes +40%
                  </text>
                  <text x="273" y="94" textAnchor="middle" fill="#f2a93b" fontSize="8" fontWeight="600">
                    Reposition!
                  </text>
                </svg>
              </div>

              <p className="font-body text-[14px] leading-snug text-[#cbbba0] text-left">
                <strong className="text-[#ede0c4] font-bold">Stop moving</strong> to unleash
                auto-fire and widen your lantern by{' '}
                <span className="text-[#5de4ff] font-bold">+20%</span>. Holding one spot over{' '}
                <span className="text-[#e5303a] font-bold">4 seconds</span> triggers{' '}
                <strong className="text-[#f2c464] font-bold">Pressure</strong>—reposition often.
              </p>
            </section>

            {/* Step 03: Lantern & Shards */}
            <section
              className="rounded-[10px] p-3.5 pb-5 flex flex-col gap-2"
              style={{
                background: 'rgba(10, 12, 16, 0.84)',
                border: '1.5px solid #2e343f',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#f2c464] shrink-0" />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    03. LANTERN &amp; SHARDS
                  </h3>
                </div>
                <span className="font-body text-[11px] font-semibold text-[#e5303a] whitespace-nowrap">
                  Survive to 5:00 Boss
                </span>
              </div>

              <div className="flex flex-col gap-1.5 font-body text-[14px] leading-snug text-[#cbbba0] text-left">
                <p className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#5de4ff] shrink-0 mt-0.5" />
                  <span>
                    Claim <span className="text-[#5de4ff] font-bold">Light Shards</span> to pierce
                    the Ashfen darkness and <span className="text-[#e5303a] font-bold">Blood Shards</span> for burst power.
                  </span>
                </p>
                <p>
                  Spend <span className="text-[#f2c464] font-bold">Soul Coins</span> in the Camp
                  Shop for permanent upgrades and defeat the{' '}
                  <span className="text-[#e5303a] font-bold">5:00 Boss</span> to ascend.
                </p>
              </div>
            </section>
          </div>

          {/* Fixed Footer: GOT IT Button using btn_play.png */}
          <div className="pt-3 border-t border-[#3a3f47]/75 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('medium');
                onClose();
              }}
              style={{
                filter: 'drop-shadow(0 0 14px rgba(220, 38, 38, 0.5))',
              }}
              className="group relative w-full h-[58px] flex items-center justify-center transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              {playBtnSrc ? (
                <img
                  src={playBtnSrc}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
                />
              ) : playBtnError ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[10px] rusted-play-bar border border-[#942027]"
                />
              ) : null}

              <span
                className="relative z-10 font-display font-black text-[17px] tracking-[0.16em] uppercase whitespace-nowrap"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter:
                    'drop-shadow(0 0 10px rgba(242, 169, 59, 0.55)) drop-shadow(0 2px 0 #1b0705)',
                }}
              >
                GOT IT
              </span>
            </button>
          </div>
        </IronCard>
      </div>
    </div>
  );
};
