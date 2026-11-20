import React from 'react';
import { DIFFICULTY_LIST, DifficultyPreset } from '../game/difficulty';
import { formatStageTime } from '../game/stages';
import { DifficultyClearRecord, GameDifficultyId } from '../game/types';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { SpriteCloseButton } from './SettingsSprites';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiCheckbox } from './ui/UiControls';
import { UI_SPRITES, UiSliceKey } from './ui/uiConfig';

interface DifficultyModalProps {
  isOpen: boolean;
  selectedDifficulty: GameDifficultyId;
  stageNumber?: number;
  stageName?: string;
  difficultyClears?: Record<GameDifficultyId, DifficultyClearRecord>;
  onSelectDifficulty: (id: GameDifficultyId) => void;
  onConfirmPlay: () => void;
  onClose: () => void;
}

const TIER_BADGE_STYLES: Record<GameDifficultyId, string> = {
  baby: 'border-[#5de4ff]/45 bg-[#0c2029]/85 text-[#8eeeff]',
  pro: 'border-[#f2c464]/50 bg-[#261c0c]/85 text-[#f7d88a]',
  hacker: 'border-[#e5303a]/60 bg-[#2b090d]/90 text-[#ff8f95]',
};

const PRESET_CARD_VARIANT: Record<GameDifficultyId, UiSliceKey> = {
  baby: 'cardOrnateCyan',
  pro: 'cardOrnateGold',
  hacker: 'cardOrnateCrimson',
};

export const DifficultyModal: React.FC<DifficultyModalProps> = ({
  isOpen,
  selectedDifficulty,
  stageNumber,
  stageName,
  difficultyClears,
  onSelectDifficulty,
  onConfirmPlay,
  onClose,
}) => {
  if (!isOpen) return null;

  const clearedCount = difficultyClears
    ? DIFFICULTY_LIST.reduce((acc, p) => acc + (difficultyClears[p.id]?.cleared ? 1 : 0), 0)
    : 0;
  const selectedIsCleared = Boolean(difficultyClears?.[selectedDifficulty]?.cleared);

  const handleSelect = (preset: DifficultyPreset) => {
    haptics.tap(preset.id === 'hacker' ? 'heavy' : 'medium');
    onSelectDifficulty(preset.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="difficulty-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad select-none overflow-x-hidden"
      style={{
        background:
          'radial-gradient(circle at center, rgba(10, 9, 13, 0.88) 0%, rgba(20, 5, 8, 0.96) 100%)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <NineSlice
        variant="panelIronDark"
        tileTexture="stone"
        highlight="blood"
        padding="0px"
        className="w-full max-w-[540px] max-h-[90dvh] flex flex-col shadow-[0_18px_44px_rgba(0,0,0,0.95)]"
        contentClassName="flex flex-col max-h-[90dvh] overflow-hidden p-3 sm:p-4"
      >
        {/* Header */}
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
                <Icon id="ui_skull" size={22} />
              </div>
            </div>
            <div className="min-w-0">
              <h2
                id="difficulty-modal-title"
                className="text-[clamp(15px,3.6vw,20px)] font-display font-bold tracking-[0.1em] text-[#e8dcc2] truncate"
              >
                SELECT DIFFICULTY
              </h2>
              <p className="font-body text-[11px] sm:text-xs text-[#b5a589] truncate">
                {stageName
                  ? `Stage ${stageNumber ?? 1} · ${stageName} · Cleared ${clearedCount}/${DIFFICULTY_LIST.length}`
                  : `Cleared ${clearedCount}/${DIFFICULTY_LIST.length} · Replay any tier to farm gold`}
              </p>
            </div>
          </div>

          <SpriteCloseButton onClick={onClose} ariaLabel="Close Difficulty Selection" />
        </NineSlice>

        {/* Difficulty Options (all remain replayable even after completion for coin grinding) */}
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 flex flex-col gap-2 pr-0.5">
          {DIFFICULTY_LIST.map((preset) => {
            const isSelected = selectedDifficulty === preset.id;
            const clearRecord = difficultyClears?.[preset.id];
            const isCleared = Boolean(clearRecord?.cleared);
            const bestClearTimeSec = clearRecord?.bestClearTimeSec ?? null;
            const bestClearStr =
              isCleared && bestClearTimeSec !== null
                ? formatStageTime(bestClearTimeSec)
                : '--:--';

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelect(preset)}
                aria-label={`${preset.name} ${preset.tierLabel}${isCleared ? `, Cleared, Best Clear ${bestClearStr}` : ''}: ${preset.statSummary}`}
                className={`w-full text-left cursor-pointer transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#f2a93b] ${
                  isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                }`}
              >
                <NineSlice
                  variant={isSelected ? PRESET_CARD_VARIANT[preset.id] : 'plateWideIron'}
                  tileTexture="row"
                  highlight={isSelected ? preset.ironHighlight : isCleared ? 'gold' : 'none'}
                  padding="0px"
                  borderWidth="clamp(10px, 1.8vw, 15px)"
                  className="w-full"
                  contentClassName="px-2.5 py-2 flex items-center gap-3"
                >
                  {/* Fixed-aspect square socket + difficulty badge + cleared crown seal */}
                  <div className="relative w-12 h-12 aspect-square shrink-0 flex items-center justify-center">
                    <img
                      src={UI_SPRITES.roundSquareSocket}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                      className="absolute inset-0 w-full h-full object-contain select-none"
                    />
                    <div className="relative z-10 flex items-center justify-center">
                      <Icon
                        id={preset.iconId}
                        rarity={preset.rarityFrame}
                        size={36}
                        alt={preset.name}
                      />
                    </div>
                    {isCleared && (
                      <span
                        title="Completed"
                        className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-[#152414] border border-[#f2c464] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                      >
                        <Icon id="ui_crown" size={12} />
                      </span>
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="font-display font-black text-sm sm:text-base tracking-[0.08em]"
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
                      {isCleared && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-[4px] border border-[#6ee7b7]/60 bg-[#0d261b]/90 font-display font-black text-[9.5px] tracking-[0.1em] text-[#86efac] uppercase leading-none">
                          <span aria-hidden="true">✓</span>
                          <span>CLEARED</span>
                        </span>
                      )}
                    </div>

                    <p className="font-body text-xs text-[#cbbba0] leading-snug">
                      {preset.tagline}
                    </p>
                    <p className="font-mono-numbers text-[11px] font-semibold text-[#9c8e72] leading-snug mt-0.5">
                      {preset.statSummary}
                    </p>

                    {/* Best Clear Time + Replayable Clear Gold Reward Strip */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 pt-1 border-t border-[#3b352c]/65">
                      <span
                        className={`inline-flex items-center gap-1 font-mono-numbers text-[11px] font-bold ${
                          isCleared ? 'text-[#ffd978]' : 'text-[#7e7463]'
                        }`}
                      >
                        <Icon id="ui_clock" size={12} />
                        <span>BEST CLEAR {bestClearStr}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-numbers text-[11px] font-bold text-[#f2c464]">
                        <Icon id="soul_coin" size={12} />
                        <span>+{preset.stageClearRewardGold.toLocaleString()} GOLD</span>
                      </span>
                      {isCleared && (clearRecord?.clearCount ?? 0) > 1 && (
                        <span className="font-mono-numbers text-[10px] font-semibold text-[#93c5a6]">
                          ×{clearRecord?.clearCount} CLEARS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fixed-aspect Sprite Checkbox */}
                  <UiCheckbox checked={isSelected} interactive={false} size={24} />
                </NineSlice>
              </button>
            );
          })}

          <NineSlice
            variant="miniPlate"
            tileTexture="row"
            highlight="blood"
            padding="0px"
            className="w-full mt-0.5"
            contentClassName="px-2 py-1.5 flex items-center justify-center gap-2 text-center"
          >
            <Icon id="ui_warning" size={15} />
            <span className="font-body text-[11.5px] text-[#d6b7b2]">
              Blood Fog rises every <strong className="text-[#ff8f95]">10 levels</strong> · Cleared difficulties stay open for <strong className="text-[#f2c464]">gold farming</strong>
            </span>
          </NineSlice>
        </div>

        {/* Footer CTA */}
        <div className="pt-3 flex flex-col items-center shrink-0">
          <UiButton
            tone="blood"
            size="lg"
            haptic="medium"
            data-sfx="play"
            onClick={() => {
              haptics.tap('heavy');
              onConfirmPlay();
            }}
            className="w-full max-w-[340px]"
          >
            <Icon id="ui_play" size={18} />
            <span>{selectedIsCleared ? 'REPLAY ARENA' : 'ENTER ARENA'}</span>
          </UiButton>
        </div>
      </NineSlice>
    </div>
  );
};
