import React from 'react';
import { X } from 'lucide-react';
import { DIFFICULTY_LIST, DifficultyPreset } from '../game/difficulty';
import { GameDifficultyId } from '../game/types';
import { UI_ASSETS, useChromaKeyImage } from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { IronButton } from './ForgedIronFrame';
import { Icon } from './Icon';
import { IronCard } from './IronCard';

interface DifficultyModalProps {
  isOpen: boolean;
  selectedDifficulty: GameDifficultyId;
  onSelectDifficulty: (id: GameDifficultyId) => void;
  onConfirmPlay: () => void;
  onClose: () => void;
}

const TIER_BADGE_STYLES: Record<GameDifficultyId, string> = {
  baby: 'border-[#5de4ff]/45 bg-[#0c2029]/85 text-[#8eeeff]',
  pro: 'border-[#f2c464]/50 bg-[#261c0c]/85 text-[#f7d88a]',
  hacker: 'border-[#e5303a]/60 bg-[#2b090d]/90 text-[#ff8f95]',
};

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  isOpen,
  selectedDifficulty,
  onSelectDifficulty,
  onConfirmPlay,
  onClose,
}) => {
  const { processedSrc: playBtnSrc, hasError: playBtnError } = useChromaKeyImage(UI_ASSETS.btnPlay);

  if (!isOpen) return null;

  const handleSelect = (preset: DifficultyPreset) => {
    haptics.tap(preset.id === 'hacker' ? 'heavy' : 'medium');
    onSelectDifficulty(preset.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="difficulty-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad backdrop-blur-md select-none"
      style={{
        background:
          'radial-gradient(circle at center, rgba(14, 13, 17, 0.86) 0%, rgba(30, 8, 12, 0.95) 100%)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <IronCard
        highlight="blood"
        className="w-full max-w-[440px] max-h-[90dvh] flex flex-col"
        contentClassName="flex flex-col max-h-[90dvh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-[#3a3f47]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#4a4f59] flex items-center justify-center shrink-0">
              <Icon id="ui_skull" size={24} />
            </div>
            <div className="min-w-0">
              <h2
                id="difficulty-modal-title"
                className="text-lg sm:text-xl font-display font-bold tracking-[0.1em] text-[#e8dcc2]"
              >
                SELECT DIFFICULTY
              </h2>
              <p className="font-body text-xs text-[#b5a589]">
                Choose your Ashfen torment before entering
              </p>
            </div>
          </div>

          <IronButton
            seed="difficulty-close-btn"
            dripCount={0}
            onClick={onClose}
            className="w-12 h-12 min-h-[48px] min-w-[48px] shrink-0"
            aria-label="Close Difficulty Selection"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Difficulty Options */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 flex flex-col gap-2.5">
          {DIFFICULTY_LIST.map((preset) => {
            const isSelected = selectedDifficulty === preset.id;
            return (
              <IronCard
                key={preset.id}
                asButton
                highlight={isSelected ? preset.ironHighlight : 'none'}
                onClick={() => handleSelect(preset)}
                ariaLabel={`${preset.name} ${preset.tierLabel}: ${preset.statSummary}`}
                className={`w-full transition-all duration-150 ${
                  isSelected ? 'scale-[1.01]' : 'opacity-85 hover:opacity-100'
                }`}
                contentClassName="px-3.5 py-3 flex items-center gap-3"
              >
                {/* Rarity-Framed Custom Dark-Fantasy Icon */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    id={preset.iconId}
                    rarity={preset.rarityFrame}
                    size={52}
                    alt={preset.name}
                  />
                </div>

                {/* Info Column */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-display font-black text-base tracking-[0.08em]"
                      style={{
                        color: isSelected ? preset.accentColor : '#efe3c8',
                      }}
                    >
                      {preset.name}
                    </span>
                    <span
                      className={`px-2 py-[2px] rounded-[4px] border font-display font-bold text-[10px] tracking-[0.12em] uppercase leading-none ${TIER_BADGE_STYLES[preset.id]}`}
                    >
                      {preset.tierLabel}
                    </span>
                  </div>

                  <p className="font-body text-xs text-[#cbbba0] leading-snug">
                    {preset.tagline}
                  </p>
                  <p className="font-mono-numbers text-[11px] font-semibold text-[#9c8e72] leading-snug mt-0.5">
                    {preset.statSummary}
                  </p>
                </div>

                {/* Selected Rune Indicator */}
                <div
                  className={`w-7 h-7 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#1a1513] border-[#f2c464]'
                      : 'bg-[#0b0d11]/80 border-[#3c434f]'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && <Icon id="ui_check" size={16} />}
                </div>
              </IronCard>
            );
          })}

          <div className="mt-0.5 px-2 py-2 rounded-[6px] border border-[#4a2226]/70 bg-[#14090b]/75 flex items-center justify-center gap-2 text-center">
            <Icon id="ui_warning" size={15} />
            <span className="font-body text-[11.5px] text-[#d6b7b2]">
              Blood Fog rises every <strong className="text-[#ff8f95]">10 levels</strong> &amp; scales harder each wave
            </span>
          </div>
        </div>

        {/* Footer CTA using existing btn_play asset */}
        <div className="px-4 pt-2 pb-3.5 border-t border-[#3a3f47]/80 bg-[#0d0e11]/80 flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            data-sfx="play"
            onClick={() => {
              haptics.tap('heavy');
              onConfirmPlay();
            }}
            className="group relative w-full max-w-[320px] h-[66px] flex items-center justify-center gap-2.5 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
          >
            {playBtnSrc ? (
              <img
                src={playBtnSrc}
                alt=""
                aria-hidden="true"
                referrerPolicy="no-referrer"
                style={{
                  filter: 'drop-shadow(0 0 14px rgba(220, 38, 38, 0.5))',
                }}
                className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
              />
            ) : playBtnError ? (
              <div
                aria-hidden="true"
                style={{
                  filter: 'drop-shadow(0 0 14px rgba(220, 38, 38, 0.5))',
                }}
                className="pointer-events-none absolute inset-0 rounded-[10px] rusted-play-bar border border-[#942027]"
              />
            ) : null}

            <span className="relative z-10 inline-flex items-center justify-center transition-transform duration-150 group-hover:scale-110">
              <Icon id="ui_play" size={22} />
            </span>
            <span
              className="relative z-10 font-display font-black text-[22px] tracking-[0.18em] whitespace-nowrap"
              style={{
                backgroundImage:
                  'linear-gradient(180deg, #fff0c2 0%, #e6aa45 50%, #9b5d14 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter:
                  'drop-shadow(0 0 10px rgba(242, 169, 59, 0.6)) drop-shadow(0 2px 0 #1b0705)',
              }}
            >
              ENTER ARENA
            </span>
          </button>
        </div>
      </IronCard>
    </div>
  );
};
