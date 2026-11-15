import React, { useEffect } from 'react';
import { soundManager } from '../game/audio';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
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
      <div className="w-[92%] max-w-[400px] max-h-[86dvh] flex flex-col">
        <IronCard
          highlight="blood"
          className="w-full max-h-[86dvh] flex flex-col"
          contentClassName="flex flex-col max-h-[86dvh] p-4 sm:p-5 overflow-hidden"
        >
          {/* Fixed Header */}
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#3a3f47]/80 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {/* Beveled Dark-Iron Guide Emblem */}
              <div
                className="w-11 h-11 rounded-[9px] flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #252a34 0%, #101318 100%)',
                  border: '2px solid #596475',
                  boxShadow:
                    'inset 0 1px 0 rgba(200, 215, 235, 0.25), 0 4px 10px rgba(0, 0, 0, 0.85)',
                }}
              >
                <Icon id="ui_info" size={26} />
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

            {/* Tactile 56x56 Rusted-Iron Close Button */}
            <IronCard
              asButton
              ariaLabel="Close How to Play"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onClose();
              }}
              className="w-[56px] h-[56px] min-w-[56px] min-h-[56px] shrink-0 active:scale-95"
              contentClassName="w-full h-full p-0 flex items-center justify-center"
            >
              <Icon id="ui_close" size={22} />
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
              className="rounded-[10px] p-3.5 flex flex-col gap-3"
              style={{
                background: 'rgba(10, 12, 16, 0.84)',
                border: '1.5px solid #2e343f',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.85)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon id="ui_dash" size={18} />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    01. MOVE &amp; WEAVE
                  </h3>
                </div>
                <span className="font-body text-[11px] font-semibold text-[#9c8e72] whitespace-nowrap">
                  Drag · Tap Dash
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <Icon
                  id="tutorial_drag"
                  size={120}
                  alt="Touch drag anywhere to move"
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-display font-bold text-xs uppercase tracking-[0.08em] text-[#ede0c4] mb-1">
                    Touch Drag
                  </div>
                  <p className="font-body text-[14px] leading-snug text-[#cbbba0]">
                    <strong className="text-[#ede0c4] font-bold">Drag anywhere</strong> on the
                    screen to weave through shadows and scoop up{' '}
                    <span className="text-[#5de4ff] font-bold">XP Gems</span> and{' '}
                    <span className="text-[#f2c464] font-bold">Soul Coins</span>.
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#262b34] w-full" />

              <div className="flex items-center gap-3.5">
                <Icon
                  id="tutorial_dash"
                  size={120}
                  alt="Tap Dash button to evade swarms"
                />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-[0.08em] text-[#5de4ff] mb-1">
                    <Icon id="ui_dash" size={16} />
                    <span>Tap to Dash</span>
                  </div>
                  <p className="font-body text-[14px] leading-snug text-[#cbbba0]">
                    Tap <strong className="text-[#5de4ff] font-bold">DASH</strong> to surge forward
                    with brief invulnerability and slip past encroaching hordes.
                  </p>
                </div>
              </div>
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
                  <Icon id="ui_stand_still" size={18} />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    02. STAND STILL TO AUTO-FIRE
                  </h3>
                </div>
                <span className="font-body text-[11px] font-bold text-[#5de4ff] whitespace-nowrap">
                  +20% Lantern Sight
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                <Icon
                  id="tutorial_stand_still"
                  size={120}
                  alt="Stand still inside stance ring to auto-fire"
                />
                <div className="flex-1 min-w-0 text-left flex flex-col gap-1.5">
                  <p className="font-body text-[14px] leading-snug text-[#cbbba0]">
                    <strong className="text-[#ede0c4] font-bold">Stop moving</strong> to unleash
                    auto-fire at{' '}
                    <span className="inline-flex items-center gap-1 align-middle text-[#e5303a] font-bold">
                      <Icon id="ui_nearest_foes" size={14} />
                      nearest foes
                    </span>{' '}
                    and widen your lantern by <span className="text-[#5de4ff] font-bold">+20%</span>.
                  </p>
                  <p className="font-body text-[13px] leading-snug text-[#9c8e72]">
                    Holding one spot over <span className="text-[#e5303a] font-bold">4s</span>{' '}
                    triggers <strong className="text-[#f2c464] font-bold">Pressure</strong> (+40%
                    foe rush)—reposition often.
                  </p>
                </div>
              </div>
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
                  <Icon id="brighter_lantern" size={18} />
                  <h3 className="font-display font-bold text-xs tracking-[0.1em] uppercase text-[#f2c464]">
                    03. LANTERN &amp; SHARDS
                  </h3>
                </div>
                <span className="font-body text-[11px] font-semibold text-[#e5303a] whitespace-nowrap">
                  Survive to 5:00 Boss
                </span>
              </div>

              <div className="flex flex-col gap-2 font-body text-[14px] leading-snug text-[#cbbba0] text-left">
                <p className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">
                    <Icon id="crimson_gem" size={18} />
                  </span>
                  <span>
                    Claim <span className="text-[#5de4ff] font-bold">Light Shards</span> to pierce
                    the Ashfen darkness and <span className="text-[#e5303a] font-bold">Blood Shards</span> for burst power.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">
                    <Icon id="soul_coin" size={18} />
                  </span>
                  <span>
                    Spend <span className="text-[#f2c464] font-bold">Soul Coins</span> in the Camp
                    Shop for permanent upgrades and defeat the{' '}
                    <span className="text-[#e5303a] font-bold">5:00 Boss</span> to ascend.
                  </span>
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
