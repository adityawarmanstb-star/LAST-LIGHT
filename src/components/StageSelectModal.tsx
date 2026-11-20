import React, { useEffect } from 'react';
import { preloadStageAssets, preloadStageCardArtworks } from '../game/assetPreloader';
import { gameManager } from '../game/GameManager';
import { STAGE_LIST, StageConfig, formatStageTime } from '../game/stages';
import { StageDifficultyClearsMap, StageId } from '../game/types';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { SpriteCloseButton } from './SettingsSprites';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiCheckbox } from './ui/UiControls';
import { UI_SPRITES } from './ui/uiConfig';

interface StageSelectModalProps {
  isOpen: boolean;
  selectedStageId: StageId;
  unlockedStageIds: Record<StageId, boolean>;
  bestTimes: Record<StageId, number>;
  difficultyClears?: StageDifficultyClearsMap;
  onSelectStage: (id: StageId) => void;
  onConfirmStage: () => void;
  onClose: () => void;
}

export const StageSelectModal: React.FC<StageSelectModalProps> = ({
  isOpen,
  selectedStageId,
  unlockedStageIds,
  bestTimes,
  difficultyClears,
  onSelectStage,
  onConfirmStage,
  onClose,
}) => {
  // Per-stage lazy preloading: Stage 2 assets only warm up once the Stage Select cards are shown.
  useEffect(() => {
    if (!isOpen) return;
    const isHighQuality = gameManager.getQualityTier() === 'high';
    void preloadStageCardArtworks();
    void preloadStageAssets('stage_2', isHighQuality);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (stage: StageConfig, unlocked: boolean) => {
    if (!unlocked) {
      haptics.tap('light');
      return;
    }
    haptics.tap('medium');
    onSelectStage(stage.id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stage-select-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center safe-area-pad select-none overflow-x-hidden"
      style={{
        background:
          selectedStageId === 'stage_2'
            ? 'radial-gradient(circle at center, rgba(16, 8, 5, 0.56) 0%, rgba(14, 5, 4, 0.78) 100%)'
            : 'radial-gradient(circle at center, rgba(10, 9, 13, 0.78) 0%, rgba(20, 5, 8, 0.88) 100%)',
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
                <Icon id="ui_flame" size={22} />
              </div>
            </div>
            <div className="min-w-0">
              <h2
                id="stage-select-modal-title"
                className="text-[clamp(15px,3.6vw,20px)] font-display font-bold tracking-[0.1em] text-[#e8dcc2] truncate"
              >
                SELECT STAGE
              </h2>
              <p className="font-body text-[11px] sm:text-xs text-[#b5a589] truncate">
                Choose your battleground in the Ashfen
              </p>
            </div>
          </div>

          <SpriteCloseButton onClick={onClose} ariaLabel="Close Stage Selection" />
        </NineSlice>

        {/* Two Stage Cards with Cover-Fit Artwork Inside the Existing Iron / Blood Frame */}
        <div className="overflow-y-auto overflow-x-hidden no-scrollbar flex-1 flex flex-col gap-3 pr-0.5">
          {STAGE_LIST.map((stage) => {
            const isUnlocked = Boolean(unlockedStageIds[stage.id]);
            const isSelected = isUnlocked && selectedStageId === stage.id;
            const bestTimeSec = bestTimes[stage.id] ?? 0;
            const hasBestTime = bestTimeSec > 0;
            const hpPctBonus = Math.round((stage.enemyHpMultiplier - 1) * 100);
            const stageClears = difficultyClears?.[stage.id];
            const clearedTierCount = stageClears
              ? Number(Boolean(stageClears.baby?.cleared)) +
                Number(Boolean(stageClears.pro?.cleared)) +
                Number(Boolean(stageClears.hacker?.cleared))
              : 0;

            return (
              <button
                key={stage.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => handleSelect(stage, isUnlocked)}
                aria-label={
                  isUnlocked
                    ? `Stage ${stage.stageNumber} ${stage.name}`
                    : `Stage ${stage.stageNumber} ${stage.name} locked. ${stage.unlockRequirementText ?? 'Defeat the first boss'}`
                }
                className={`w-full text-left transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-[#f2a93b] ${
                  isUnlocked
                    ? 'cursor-pointer active:scale-[0.985]'
                    : 'cursor-not-allowed'
                }`}
              >
                <NineSlice
                  variant={isSelected ? 'cardOrnateCrimson' : 'plateWideIron'}
                  tileTexture="none"
                  highlight={isSelected ? 'blood' : 'none'}
                  padding="0px"
                  borderWidth="clamp(10px, 1.8vw, 15px)"
                  className="w-full"
                  contentClassName="relative overflow-hidden rounded-[2px] min-h-[164px] sm:min-h-[184px] flex flex-col justify-between bg-[#0c0a0d]"
                >
                  {/* Cover-fit stage card artwork (crop to fit, no stretch) */}
                  <img
                    src={stage.cardArtwork}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
                  />

                  {/* Bottom dark gradient scrim for crisp title & stats contrast */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to bottom, rgba(7, 6, 10, 0.34) 0%, rgba(8, 6, 10, 0.18) 34%, rgba(7, 5, 8, 0.78) 66%, rgba(5, 4, 6, 0.96) 100%)',
                    }}
                  />

                  {/* Locked dark overlay (no CSS filters) */}
                  {!isUnlocked && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-[#050408]/68"
                    />
                  )}

                  {/* Top Row: Stage Badge, Clear Progress & Selection Checkbox */}
                  <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-[3px] rounded-[4px] border border-[#e5303a]/65 bg-[#1f070b]/92 font-display font-bold text-[10px] tracking-[0.14em] text-[#ff9fa5] uppercase leading-none">
                        STAGE {stage.stageNumber}
                      </span>
                      {isUnlocked && clearedTierCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[4px] border border-[#6ee7b7]/60 bg-[#0b2419]/92 font-display font-bold text-[9.5px] tracking-[0.1em] text-[#86efac] uppercase leading-none">
                          <span>✓ {clearedTierCount}/3</span>
                        </span>
                      )}
                      {isUnlocked && hpPctBonus > 0 && (
                        <span className="px-1.5 py-[3px] rounded-[4px] border border-[#e5303a]/55 bg-[#26090d]/90 font-mono-numbers text-[10px] font-bold text-[#ff9ca2] leading-none">
                          ENEMY HP ×{stage.enemyHpMultiplier.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      {isUnlocked ? (
                        <UiCheckbox checked={isSelected} interactive={false} size={24} />
                      ) : (
                        <div className="px-2 py-0.5 rounded-[4px] border border-[#736456]/55 bg-[#120e12]/90 inline-flex items-center gap-1 text-[#d4c3aa]">
                          <Icon id="ui_lock_closed" size={13} alt="Locked" />
                          <span className="font-display font-bold text-[9.5px] tracking-[0.12em] uppercase">
                            LOCKED
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Centered Padlock Emblem on Locked Card */}
                  {!isUnlocked && (
                    <div className="relative z-10 flex items-center justify-center py-1">
                      <div className="relative w-12 h-12 aspect-square flex items-center justify-center">
                        <img
                          src={UI_SPRITES.roundSquareSocket}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                          className="absolute inset-0 w-full h-full object-contain select-none"
                        />
                        <div className="relative z-10 flex items-center justify-center">
                          <Icon id="ui_lock_closed" size={26} alt="Locked" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bottom Title, Subtitle & Best Time over Dark Gradient */}
                  <div className="relative z-10 px-3 pb-2.5 pt-2 flex flex-col gap-1 text-left">
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span
                        className="font-display font-black text-base sm:text-lg tracking-[0.08em] uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
                        style={{
                          color: !isUnlocked
                            ? '#b0a391'
                            : isSelected
                              ? '#ffd978'
                              : '#f2e6cc',
                        }}
                      >
                        {stage.name}
                      </span>

                      {isUnlocked && (
                        <span className="inline-flex items-center gap-1 font-mono-numbers text-[11px] font-bold text-[#f2c464] drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                          <Icon id="ui_clock" size={13} />
                          <span>
                            {hasBestTime
                              ? `BEST ${formatStageTime(bestTimeSec)}`
                              : 'BEST --:--'}
                          </span>
                        </span>
                      )}
                    </div>

                    {isUnlocked ? (
                      <p className="font-body text-xs text-[#d6c8b0] leading-snug drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        {stage.subtitle}
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 text-[#ff969c]">
                          <Icon id="ui_lock_closed" size={14} />
                          <span className="font-display font-bold text-xs tracking-[0.06em]">
                            {stage.unlockRequirementText ?? 'Defeat the first boss'}
                          </span>
                        </div>
                        <span className="font-body text-[11px] text-[#a79884]">
                          Slay The Void Titan in Stage 1
                        </span>
                      </div>
                    )}
                  </div>
                </NineSlice>
              </button>
            );
          })}
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
              onConfirmStage();
            }}
            className="w-full max-w-[340px]"
          >
            <Icon id="ui_play" size={18} />
            <span>CONTINUE</span>
          </UiButton>
        </div>
      </NineSlice>
    </div>
  );
};
