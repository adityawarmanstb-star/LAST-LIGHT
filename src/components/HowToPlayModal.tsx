import React, { useEffect, useRef } from 'react';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { SpriteCloseButton } from './SettingsSprites';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiScrollbar } from './ui/UiControls';
import { UI_SPRITES } from './ui/uiConfig';

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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleClose = () => {
    soundManager.playUiClick();
    haptics.tap('light');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
      className="fixed inset-0 z-[60] flex items-center justify-center safe-area-pad select-none overflow-x-hidden"
      style={{
        background: 'rgba(4, 5, 8, 0.88)',
      }}
    >
      <div className="w-full max-w-[540px] max-h-[88dvh] flex flex-col px-1">
        <NineSlice
          variant="panelIronDark"
          tileTexture="stone"
          highlight="blood"
          padding="0px"
          className="w-full max-h-[88dvh] flex flex-col shadow-[0_18px_44px_rgba(0,0,0,0.95)]"
          contentClassName="flex flex-col max-h-[88dvh] p-3 sm:p-4 overflow-hidden"
        >
          {/* Fixed Header */}
          <NineSlice
            variant="plateWideIron"
            tileTexture="row"
            padding="0px"
            className="shrink-0 mb-2.5"
            contentClassName="px-2.5 py-2 flex items-center justify-between gap-2.5"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-10 h-10 aspect-square flex items-center justify-center shrink-0">
                <img
                  src={UI_SPRITES.roundSquareSocket}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                  className="absolute inset-0 w-full h-full object-contain select-none"
                />
                <div className="relative z-10 flex items-center justify-center">
                  <Icon id="ui_info" size={22} />
                </div>
              </div>

              <div className="min-w-0 text-left">
                <h2
                  id="how-to-play-title"
                  className="font-display font-black text-[clamp(16px,3.6vw,21px)] tracking-[0.12em] uppercase leading-none text-[#f2c464]"
                  style={{ textShadow: '0 2px 3px #170805' }}
                >
                  HOW TO PLAY
                </h2>
                <p className="font-body font-medium text-[11px] sm:text-xs text-[#cbbba0] leading-snug mt-0.5 truncate">
                  {isFirstLaunch
                    ? 'Master the lantern before entering the dark'
                    : 'Touch controls, stance auto-fire & lantern survival'}
                </p>
              </div>
            </div>

            <SpriteCloseButton onClick={handleClose} ariaLabel="Close How to Play" />
          </NineSlice>

          {/* Scrollable Guide Sections + Custom Sprite Scrollbar */}
          <div className="flex flex-1 min-h-0 gap-1.5 sm:gap-2">
            <div
              ref={scrollRef}
              className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5 flex flex-col gap-2.5"
            >
              {/* Step 01: Move & Weave */}
              <NineSlice
                as="section"
                variant="plateWideIron"
                tileTexture="row"
                padding="0px"
                borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 16px)"
                className="w-full shrink-0"
                contentClassName="px-2.5 py-2.5 flex flex-col gap-2.5"
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

                <div className="flex items-center gap-3">
                  <div className="w-[88px] sm:w-[104px] aspect-square shrink-0 rounded-[8px] bg-[#0d1015]/85 border border-[#3a3f47]/65 flex items-center justify-center p-1">
                    <Icon
                      id="tutorial_drag"
                      size={88}
                      alt="Touch drag anywhere to move"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-display font-bold text-xs uppercase tracking-[0.08em] text-[#ede0c4] mb-1">
                      Touch Drag
                    </div>
                    <p className="font-body text-[13px] leading-snug text-[#cbbba0]">
                      <strong className="text-[#ede0c4] font-bold">Drag anywhere</strong> on the
                      screen to weave through shadows and scoop up{' '}
                      <span className="text-[#5de4ff] font-bold">XP Gems</span> and{' '}
                      <span className="text-[#f2c464] font-bold">Soul Coins</span>.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#2d323b] w-full" />

                <div className="flex items-center gap-3">
                  <div className="w-[88px] sm:w-[104px] aspect-square shrink-0 rounded-[8px] bg-[#0d1015]/85 border border-[#3a3f47]/65 flex items-center justify-center p-1">
                    <Icon
                      id="tutorial_dash"
                      size={88}
                      alt="Tap Dash button to evade swarms"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-[0.08em] text-[#5de4ff] mb-1">
                      <Icon id="ui_dash" size={16} />
                      <span>Tap to Dash</span>
                    </div>
                    <p className="font-body text-[13px] leading-snug text-[#cbbba0]">
                      Tap <strong className="text-[#5de4ff] font-bold">DASH</strong> to surge forward
                      with brief invulnerability and slip past encroaching hordes.
                    </p>
                  </div>
                </div>
              </NineSlice>

              {/* Step 02: Stand Still to Auto-Fire */}
              <NineSlice
                as="section"
                variant="plateWideIron"
                tileTexture="row"
                padding="0px"
                borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 16px)"
                className="w-full shrink-0"
                contentClassName="px-2.5 py-2.5 flex flex-col gap-2.5"
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

                <div className="flex items-center gap-3">
                  <div className="w-[88px] sm:w-[104px] aspect-square shrink-0 rounded-[8px] bg-[#0d1015]/85 border border-[#3a3f47]/65 flex items-center justify-center p-1">
                    <Icon
                      id="tutorial_stand_still"
                      size={88}
                      alt="Stand still inside stance ring to auto-fire"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col gap-1.5">
                    <p className="font-body text-[13px] leading-snug text-[#cbbba0]">
                      <strong className="text-[#ede0c4] font-bold">Stop moving</strong> to unleash
                      auto-fire at{' '}
                      <span className="inline-flex items-center gap-1 align-middle text-[#e5303a] font-bold">
                        <Icon id="ui_nearest_foes" size={14} />
                        nearest foes
                      </span>{' '}
                      and widen your lantern by <span className="text-[#5de4ff] font-bold">+20%</span>.
                    </p>
                    <p className="font-body text-[12px] leading-snug text-[#9c8e72]">
                      Holding one spot over <span className="text-[#e5303a] font-bold">4s</span>{' '}
                      triggers <strong className="text-[#f2c464] font-bold">Pressure</strong> (+40%
                      foe rush)—reposition often.
                    </p>
                  </div>
                </div>
              </NineSlice>

              {/* Step 03: Lantern & Shards */}
              <NineSlice
                as="section"
                variant="plateWideIron"
                tileTexture="row"
                padding="0px"
                borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 16px)"
                className="w-full shrink-0"
                contentClassName="px-2.5 py-2.5 flex flex-col gap-2"
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

                <div className="flex flex-col gap-2 font-body text-[13px] leading-snug text-[#cbbba0] text-left">
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
              </NineSlice>
            </div>

            <UiScrollbar scrollRef={scrollRef} />
          </div>

          {/* Fixed Footer CTA */}
          <div className="pt-3 shrink-0">
            <UiButton
              tone="blood"
              size="lg"
              haptic="medium"
              onClick={() => {
                soundManager.playUiClick();
                onClose();
              }}
              className="w-full"
            >
              GOT IT
            </UiButton>
          </div>
        </NineSlice>
      </div>
    </div>
  );
};
