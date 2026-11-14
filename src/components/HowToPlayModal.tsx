import React, { useEffect } from 'react';
import { BookOpen, Compass, Crosshair, Sparkles, X } from 'lucide-react';
import { soundManager } from '../game/audio';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

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
      className="fixed inset-0 z-[60] flex items-center justify-center safe-area-pad backdrop-blur-md select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.86) 0%, rgba(30, 10, 13, 0.94) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="how-to-play-modal-panel"
        dripCount={3}
        maxDripLength={20}
        className="w-full max-w-xl max-h-[90vh] flex flex-col"
        contentClassName="flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-[#3a3f47]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#3a3f47] flex items-center justify-center text-[#5de4ff] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="how-to-play-title"
                className="text-lg sm:text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate"
              >
                HOW TO PLAY
              </h2>
              <p className="text-xs text-[#9c8e72] truncate">
                {isFirstLaunch
                  ? 'Welcome, Warden · Master the lantern before entering the dark'
                  : 'Movement controls, stance auto-fire & lantern survival'}
              </p>
            </div>
          </div>

          <IronButton
            seed="how-to-play-close-btn"
            dripCount={0}
            onClick={() => {
              soundManager.playUiClick();
              onClose();
            }}
            className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
            aria-label="Close How to Play"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Scrollable Visual Diagrams Section */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Diagram 1: Movement Controls */}
          <div className="flex flex-col gap-3 pb-5 border-b border-[#3a3f47]/65">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#5de4ff] shrink-0" />
                <h3 className="text-sm font-display font-bold tracking-wide text-[#d8c9a8]">
                  01. Move &amp; Weave
                </h3>
              </div>
              <span className="text-[11px] text-[#9c8e72] whitespace-nowrap">
                Touch Drag · WASD / Arrows
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
              {/* Visual Diagram SVG: Virtual Joystick + WASD */}
              <div className="sm:col-span-7 rounded-[10px] bg-[#101215] border border-[#2d323a] p-2.5 overflow-hidden">
                <svg
                  viewBox="0 0 320 132"
                  className="w-full h-auto block"
                  role="img"
                  aria-label="Diagram showing touch drag virtual joystick on the left and WASD or arrow keys on the right"
                >
                  <defs>
                    <radialGradient id="htpMoveGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#5de4ff" stopOpacity="0.24" />
                      <stop offset="100%" stopColor="#5de4ff" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Left Half: Touch Joystick */}
                  <rect x="6" y="6" width="148" height="120" rx="8" fill="#15181d" stroke="#282d35" />
                  <text
                    x="80"
                    y="23"
                    textAnchor="middle"
                    fill="#9c8e72"
                    fontSize="10"
                    fontWeight="600"
                    letterSpacing="0.06em"
                  >
                    TOUCH DRAG
                  </text>

                  {/* Joystick Base */}
                  <circle cx="62" cy="74" r="32" fill="#0f1114" stroke="#3a3f47" strokeWidth="1.5" strokeDasharray="4 3" />
                  {/* Directional Arrow */}
                  <line x1="62" y1="74" x2="88" y2="56" stroke="#5de4ff" strokeWidth="2" strokeLinecap="round" />
                  <polygon points="92,53 83,54 88,61" fill="#5de4ff" />
                  {/* Thumb Knob */}
                  <circle cx="80" cy="62" r="14" fill="#1f252d" stroke="#5de4ff" strokeWidth="2" />
                  <circle cx="80" cy="62" r="5" fill="#5de4ff" opacity="0.85" />

                  {/* Warden Motion Trail */}
                  <circle cx="122" cy="72" r="18" fill="url(#htpMoveGlow)" />
                  <path d="M104 82 Q113 78 120 72" fill="none" stroke="#5de4ff" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
                  <circle cx="124" cy="70" r="8" fill="#1b2129" stroke="#d8c9a8" strokeWidth="1.8" />
                  <circle cx="127" cy="67" r="2.6" fill="#5de4ff" />

                  {/* Divider */}
                  <text
                    x="160"
                    y="72"
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize="10"
                    fontWeight="700"
                  >
                    OR
                  </text>

                  {/* Right Half: Keyboard WASD */}
                  <rect x="166" y="6" width="148" height="120" rx="8" fill="#15181d" stroke="#282d35" />
                  <text
                    x="240"
                    y="23"
                    textAnchor="middle"
                    fill="#9c8e72"
                    fontSize="10"
                    fontWeight="600"
                    letterSpacing="0.06em"
                  >
                    KEYBOARD
                  </text>

                  {/* Keycaps W, A, S, D */}
                  <g transform="translate(202, 36)">
                    {/* W */}
                    <rect x="26" y="0" width="24" height="24" rx="5" fill="#1d2128" stroke="#4a515d" strokeWidth="1.4" />
                    <text x="38" y="16" textAnchor="middle" fill="#d8c9a8" fontSize="11" fontWeight="700">W</text>
                    {/* A */}
                    <rect x="0" y="28" width="24" height="24" rx="5" fill="#1d2128" stroke="#4a515d" strokeWidth="1.4" />
                    <text x="12" y="44" textAnchor="middle" fill="#d8c9a8" fontSize="11" fontWeight="700">A</text>
                    {/* S */}
                    <rect x="26" y="28" width="24" height="24" rx="5" fill="#1d2128" stroke="#4a515d" strokeWidth="1.4" />
                    <text x="38" y="44" textAnchor="middle" fill="#d8c9a8" fontSize="11" fontWeight="700">S</text>
                    {/* D */}
                    <rect x="52" y="28" width="24" height="24" rx="5" fill="#1d2128" stroke="#5de4ff" strokeWidth="1.6" />
                    <text x="64" y="44" textAnchor="middle" fill="#5de4ff" fontSize="11" fontWeight="700">D</text>
                  </g>

                  <text
                    x="240"
                    y="108"
                    textAnchor="middle"
                    fill="#9c8e72"
                    fontSize="9.5"
                  >
                    WASD or Arrow Keys
                  </text>
                </svg>
              </div>

              {/* Concise Explanation */}
              <div className="sm:col-span-5 flex flex-col gap-2 text-xs leading-relaxed text-[#b8ab90]">
                <p>
                  <strong className="text-[#d8c9a8] font-semibold">Drag anywhere</strong> on mobile
                  or use <strong className="text-[#d8c9a8] font-semibold">WASD / Arrows</strong>{' '}
                  to steer through the dark.
                </p>
                <p className="text-[#9c8e72]">
                  While moving, your weapons hold fire so you can dodge attacks and scoop up{' '}
                  <span className="text-[#5de4ff] font-medium">XP Gems</span> and{' '}
                  <span className="text-[#f2a93b] font-medium">Soul Coins</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Diagram 2: Auto-Fire While Standing Still */}
          <div className="flex flex-col gap-3 pb-5 border-b border-[#3a3f47]/65">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#f2a93b] shrink-0" />
                <h3 className="text-sm font-display font-bold tracking-wide text-[#d8c9a8]">
                  02. Stand Still to Auto-Fire
                </h3>
              </div>
              <span className="text-[11px] text-[#5de4ff] whitespace-nowrap">
                +20% Lantern Sight
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
              {/* Visual Diagram SVG: Stance Ring, Auto-Fire & Pressure Warning */}
              <div className="sm:col-span-7 rounded-[10px] bg-[#101215] border border-[#2d323a] p-2.5 overflow-hidden">
                <svg
                  viewBox="0 0 320 138"
                  className="w-full h-auto block"
                  role="img"
                  aria-label="Diagram showing the player standing still inside a glowing cyan stance ring, auto-firing bolts and orbiting blades at enemies"
                >
                  <defs>
                    <radialGradient id="htpLanternAura" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#5de4ff" stopOpacity="0.28" />
                      <stop offset="65%" stopColor="#5de4ff" stopOpacity="0.09" />
                      <stop offset="100%" stopColor="#5de4ff" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <rect x="6" y="6" width="308" height="126" rx="8" fill="#13161b" stroke="#282d35" />

                  {/* Expanded Lantern Light Circle */}
                  <circle cx="110" cy="70" r="56" fill="url(#htpLanternAura)" />
                  <circle
                    cx="110"
                    cy="70"
                    r="50"
                    fill="none"
                    stroke="#5de4ff"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />

                  {/* Stance Ring + Orbiting Blade */}
                  <circle cx="110" cy="74" r="26" fill="none" stroke="#5de4ff" strokeWidth="2" opacity="0.85" />
                  <circle cx="110" cy="48" r="4" fill="#f2a93b" />
                  <circle cx="88" cy="86" r="4" fill="#f2a93b" />

                  {/* Warden Standing */}
                  <circle cx="110" cy="70" r="10" fill="#1e242d" stroke="#d8c9a8" strokeWidth="2" />
                  <circle cx="115" cy="67" r="3" fill="#5de4ff" />

                  {/* Auto-Fired Bolts */}
                  <line x1="126" y1="68" x2="188" y2="54" stroke="#5de4ff" strokeWidth="2" strokeDasharray="5 3" />
                  <ellipse cx="192" cy="53" rx="6" ry="2.8" transform="rotate(-13 192 53)" fill="#cffafe" />

                  <line x1="126" y1="73" x2="190" y2="86" stroke="#5de4ff" strokeWidth="2" strokeDasharray="5 3" />
                  <ellipse cx="194" cy="87" rx="6" ry="2.8" transform="rotate(12 194 87)" fill="#cffafe" />

                  {/* Target Enemies */}
                  <g transform="translate(214, 48)">
                    <circle cx="0" cy="0" r="10" fill="#2b1216" stroke="#e5303a" strokeWidth="1.8" />
                    <circle cx="-3" cy="-1" r="1.6" fill="#e5303a" />
                    <circle cx="3" cy="-1" r="1.6" fill="#e5303a" />
                  </g>
                  <g transform="translate(216, 90)">
                    <circle cx="0" cy="0" r="10" fill="#2b1216" stroke="#e5303a" strokeWidth="1.8" />
                    <circle cx="-3" cy="-1" r="1.6" fill="#e5303a" />
                    <circle cx="3" cy="-1" r="1.6" fill="#e5303a" />
                  </g>

                  {/* Callout Labels */}
                  <text x="110" y="21" textAnchor="middle" fill="#5de4ff" fontSize="9.5" fontWeight="700">
                    STANCE LIT · AUTO-FIRE
                  </text>
                  <text x="215" y="21" textAnchor="middle" fill="#e5303a" fontSize="9.5" fontWeight="700">
                    NEAREST FOES
                  </text>

                  {/* Pressure Timer Tip */}
                  <rect x="242" y="34" width="62" height="72" rx="6" fill="#1a1216" stroke="#b3121a" strokeWidth="1" opacity="0.92" />
                  <text x="273" y="54" textAnchor="middle" fill="#e5303a" fontSize="11" fontWeight="800">
                    &gt; 4s
                  </text>
                  <text x="273" y="69" textAnchor="middle" fill="#d8c9a8" fontSize="8.5" fontWeight="600">
                    PRESSURE
                  </text>
                  <text x="273" y="83" textAnchor="middle" fill="#9c8e72" fontSize="8">
                    Foes +40%
                  </text>
                  <text x="273" y="95" textAnchor="middle" fill="#f2a93b" fontSize="8" fontWeight="600">
                    Reposition!
                  </text>
                </svg>
              </div>

              {/* Concise Explanation */}
              <div className="sm:col-span-5 flex flex-col gap-2 text-xs leading-relaxed text-[#b8ab90]">
                <p>
                  <strong className="text-[#d8c9a8] font-semibold">Stop moving</strong> to lock
                  your stance ring: weapons aim &amp; fire automatically and your lantern widens by{' '}
                  <span className="text-[#5de4ff] font-medium">+20%</span>.
                </p>
                <p className="text-[#9c8e72]">
                  Don&apos;t camp too long—holding one spot over{' '}
                  <span className="text-[#e5303a] font-medium">4 seconds</span> triggers{' '}
                  <strong className="text-[#d8c9a8] font-medium">Pressure</strong>, speeding up the
                  horde.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Core Loop Strip (Clean typographic columns, no nested boxes) */}
          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#5de4ff] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Level Up</span>
              </span>
              <p className="text-[11px] leading-snug text-[#9c8e72]">
                Gather gems to draft new weapons &amp; relics.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#f2a93b]">Soul Coins</span>
              <p className="text-[11px] leading-snug text-[#9c8e72]">
                Spend coins in the Camp Shop for permanent power.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-[#e5303a]">5:00 Boss</span>
              <p className="text-[11px] leading-snug text-[#9c8e72]">
                Survive 5 minutes to challenge the arena Boss.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-4 sm:px-6 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 shrink-0">
          <IronButton
            seed="how-to-play-got-it-btn"
            variant="blood"
            dripCount={2}
            onClick={() => {
              soundManager.playUiClick();
              onClose();
            }}
            className="w-full min-h-[56px] font-display font-bold text-sm tracking-[0.12em]"
          >
            <span>Got It</span>
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
