import React, { useEffect, useState } from 'react';
import { IconRarity } from '../game/iconRegistry';
import { DynamicChallengeOffer, UpgradeOption } from '../game/types';
import { Icon } from './Icon';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiCheckbox } from './ui/UiControls';
import { UI_SPRITES, UiSliceKey } from './ui/uiConfig';

interface LevelUpModalProps {
  options: UpgradeOption[];
  challengeOffer?: DynamicChallengeOffer | null;
  onSelectUpgrade: (option: UpgradeOption, acceptChallenge: boolean) => void;
}

type RarityTheme = {
  label: string;
  frameRarity: IconRarity;
  highlight: 'gold' | 'blood' | 'ember' | 'cyan' | 'none';
  sliceVariant: UiSliceKey;
  tagColor: string;
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  options,
  challengeOffer = null,
  onSelectUpgrade,
}) => {
  const [acceptChallenge, setAcceptChallenge] = useState<boolean>(false);

  // Reset pact selection whenever a new level-up offer arrives
  useEffect(() => {
    setAcceptChallenge(false);
  }, [options, challengeOffer?.id]);

  // Allow keyboard 1, 2, 3 selection and C to toggle Dynamic Challenge pact
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'c' || e.key === 'C') && challengeOffer) {
        soundManager.playUiClick();
        setAcceptChallenge((prev) => !prev);
        return;
      }
      if (e.key === '1' && options[0]) {
        onSelectUpgrade(options[0], acceptChallenge);
      } else if (e.key === '2' && options[1]) {
        onSelectUpgrade(options[1], acceptChallenge);
      } else if (e.key === '3' && options[2]) {
        onSelectUpgrade(options[2], acceptChallenge);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, challengeOffer, acceptChallenge, onSelectUpgrade]);

  const getRarityTheme = (option: UpgradeOption): RarityTheme => {
    if (option.rarity === 'epic') {
      return {
        label: 'EPIC',
        frameRarity: 'epic',
        highlight: 'gold',
        sliceVariant: 'cardOrnateGold',
        tagColor: 'text-[#f2c464]',
      };
    }
    if (option.category === 'weapon_unlock') {
      return {
        label: 'RELIC',
        frameRarity: 'rare',
        highlight: 'cyan',
        sliceVariant: 'cardOrnateCyan',
        tagColor: 'text-[#5de4ff]',
      };
    }
    if (option.rarity === 'rare') {
      return {
        label: 'RARE',
        frameRarity: 'rare',
        highlight: 'blood',
        sliceVariant: 'cardOrnateCrimson',
        tagColor: 'text-[#f2a93b]',
      };
    }
    return {
      label: 'COMMON',
      frameRarity: 'common',
      highlight: 'none',
      sliceVariant: 'plateWideIron',
      tagColor: 'text-[#5de4ff]',
    };
  };

  const renderChallengeIcon = (icon: DynamicChallengeOffer['icon']) => {
    switch (icon) {
      case 'shard':
        return <Icon id="crimson_gem" size={26} />;
      case 'coins':
        return <Icon id="soul_coin" size={26} />;
      case 'shield':
        return <Icon id="ui_shield" size={26} />;
      case 'flame':
        return <Icon id="ui_flame" size={26} />;
      case 'skull':
        return <Icon id="ui_skull" size={26} />;
      case 'sun':
        return <Icon id="ui_brightness" size={26} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-modal-title"
      className="fixed inset-0 h-[100dvh] z-40 flex flex-col items-center justify-center select-none overflow-y-auto overflow-x-hidden no-scrollbar"
      style={{
        background: 'rgba(4, 5, 8, 0.88)',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-[540px] my-auto flex flex-col items-center justify-center gap-2 sm:gap-2.5">
        {/* Header */}
        <div className="text-center shrink-0">
          <div
            className="font-display text-[11px] font-extrabold tracking-[0.26em] uppercase text-[#e5303a]"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.95)' }}
          >
            LEVEL UP
          </div>
          <h2
            id="level-up-modal-title"
            className="font-display font-black text-[clamp(20px,4.6vw,28px)] tracking-[0.12em] uppercase leading-tight mt-0.5 text-[#f2c464]"
            style={{ textShadow: '0 2px 3px #170805' }}
          >
            CHOOSE A BLESSING
          </h2>
        </div>

        {/* Dynamic Challenge / Pact Card */}
        {challengeOffer && (
          <NineSlice
            variant="bannerCrimson"
            tileTexture="row"
            highlight={acceptChallenge ? 'gold' : 'blood'}
            padding="0px"
            borderWidth="clamp(10px, 1.8vw, 15px) clamp(16px, 3vw, 26px)"
            className="w-full shrink-0"
            contentClassName="px-2 py-2 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-11 h-11 aspect-square flex items-center justify-center shrink-0">
                <img
                  src={UI_SPRITES.roundSquareSocket}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                  className="absolute inset-0 w-full h-full object-contain select-none"
                />
                <div className="relative z-10 flex items-center justify-center">
                  {renderChallengeIcon(challengeOffer.icon)}
                </div>
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h3 className="font-display font-black text-xs sm:text-sm tracking-[0.08em] uppercase text-[#f2c464] leading-none">
                    {challengeOffer.title}
                  </h3>
                  <span className="font-display font-extrabold text-[10px] tracking-[0.06em] uppercase text-[#ffd98e] bg-[#2a1216]/90 border border-[#9e2833] px-1.5 py-0.5 rounded-[4px] whitespace-nowrap">
                    +{challengeOffer.rewardCoins} COINS · {challengeOffer.rewardBuffLabel}
                  </span>
                </div>
                <p className="font-body font-medium text-[12px] sm:text-[13px] text-[#cbbba0] leading-tight mt-1 line-clamp-2">
                  {challengeOffer.description}
                </p>
              </div>
            </div>

            <UiButton
              tone={acceptChallenge ? 'blood' : 'iron'}
              active={acceptChallenge}
              size="sm"
              haptic="medium"
              onClick={() => {
                soundManager.playUiClick();
                setAcceptChallenge((prev) => !prev);
              }}
              className="w-full"
            >
              <UiCheckbox checked={acceptChallenge} interactive={false} size={18} />
              <span>{acceptChallenge ? 'PACT ACCEPTED' : 'ACCEPT PACT'}</span>
            </UiButton>
          </NineSlice>
        )}

        {/* 3 Blessing Cards cleanly centered within max 540px column */}
        <div className="grid grid-cols-1 gap-2 sm:gap-2.5 w-full">
          {options.map((option, index) => {
            const theme = getRarityTheme(option);

            return (
              <div
                key={option.id}
                className="animate-card-slide-up w-full"
                style={{
                  animationDelay: `${index * 60}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap('medium');
                    onSelectUpgrade(option, acceptChallenge);
                  }}
                  aria-label={`${option.title} (${theme.label})`}
                  className="w-full text-left cursor-pointer active:scale-[0.98] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
                >
                  <NineSlice
                    variant={theme.sliceVariant}
                    tileTexture="row"
                    highlight={theme.highlight}
                    padding="0px"
                    borderWidth={
                      theme.sliceVariant === 'plateWideIron'
                        ? 'clamp(9px, 1.6vw, 13px) clamp(14px, 2.4vw, 20px)'
                        : 'clamp(12px, 2vw, 16px)'
                    }
                    className="w-full"
                    contentClassName="px-2.5 py-2 flex flex-row items-center gap-3 text-left min-h-[76px]"
                  >
                    {/* Left: Fixed-aspect square socket + hand-painted skill icon */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 aspect-square shrink-0 flex items-center justify-center">
                      <img
                        src={UI_SPRITES.roundSquareSocket}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        style={{ aspectRatio: '1 / 1', imageRendering: 'auto' }}
                        className="absolute inset-0 w-full h-full object-contain select-none"
                      />
                      <div className="relative z-10 flex items-center justify-center">
                        <Icon id={option.title} rarity={theme.frameRarity} size={38} />
                      </div>
                    </div>

                    {/* Right: Rarity Tag + Display Title + Concise Description */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 text-[10px] mb-0.5 flex-wrap">
                        <span
                          className={`font-display font-extrabold tracking-[0.12em] uppercase ${theme.tagColor}`}
                        >
                          {theme.label}
                        </span>
                        <span className="text-[#6b3a2a]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-display font-bold text-[#9c8e72] uppercase">
                          {option.levelText}
                        </span>
                        {acceptChallenge && (
                          <>
                            <span className="text-[#6b3a2a]" aria-hidden="true">
                              ·
                            </span>
                            <span className="font-display font-bold text-[#f2c464] uppercase">
                              +PACT
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-display font-black text-[14px] sm:text-base text-[#f2e4c7] leading-tight tracking-[0.04em]">
                        {option.title}
                      </h3>

                      <p className="font-body font-medium text-[12.5px] sm:text-[13px] text-[#cbbba0] leading-snug mt-0.5 line-clamp-2">
                        {option.description}
                      </p>
                    </div>
                  </NineSlice>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
