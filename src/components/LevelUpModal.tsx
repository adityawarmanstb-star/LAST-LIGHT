import React, { useEffect, useState } from 'react';
import {
  Check,
  CircleDot,
  Coins,
  Crosshair,
  Disc,
  Eye,
  Flame,
  Gem,
  Heart,
  Magnet,
  ShieldAlert,
  Skull,
  Sparkles,
  Sun,
  Sword,
  Wind,
  Zap,
} from 'lucide-react';
import { DynamicChallengeOffer, UpgradeOption } from '../game/types';
import { IronCard } from './IronCard';
import { preloadAllChromaKeyUiAssets } from '../hooks/useChromaKeyImage';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';

interface LevelUpModalProps {
  options: UpgradeOption[];
  challengeOffer?: DynamicChallengeOffer | null;
  onSelectUpgrade: (option: UpgradeOption, acceptChallenge: boolean) => void;
}

type RarityTheme = {
  label: string;
  outerShadow: string;
  accentText: string;
  frameBorder: string;
  frameBg: string;
  tagColor: string;
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  options,
  challengeOffer = null,
  onSelectUpgrade,
}) => {
  const [acceptChallenge, setAcceptChallenge] = useState<boolean>(false);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
  }, []);

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
        outerShadow:
          'drop-shadow(0 0 14px rgba(242, 169, 59, 0.58)) drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9))',
        accentText: 'text-[#f2c464]',
        frameBorder: '#d99a32',
        frameBg: 'linear-gradient(180deg, #2b2110 0%, #14100a 100%)',
        tagColor: 'text-[#f2c464]',
      };
    }
    if (option.category === 'weapon_unlock') {
      return {
        label: 'RELIC',
        outerShadow:
          'drop-shadow(0 0 12px rgba(34, 211, 238, 0.5)) drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9))',
        accentText: 'text-[#5de4ff]',
        frameBorder: '#22d3ee',
        frameBg: 'linear-gradient(180deg, #10242c 0%, #091216 100%)',
        tagColor: 'text-[#5de4ff]',
      };
    }
    if (option.rarity === 'rare') {
      return {
        label: 'RARE',
        outerShadow:
          'drop-shadow(0 0 12px rgba(229, 48, 58, 0.52)) drop-shadow(0 0 8px rgba(242, 169, 59, 0.32)) drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9))',
        accentText: 'text-[#ff6b72]',
        frameBorder: '#c4242d',
        frameBg: 'linear-gradient(180deg, #2d1115 0%, #16090b 100%)',
        tagColor: 'text-[#f2a93b]',
      };
    }
    return {
      label: 'COMMON',
      outerShadow:
        'drop-shadow(0 0 10px rgba(34, 211, 238, 0.36)) drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9))',
      accentText: 'text-[#5de4ff]',
      frameBorder: '#3f7688',
      frameBg: 'linear-gradient(180deg, #172128 0%, #0c1115 100%)',
      tagColor: 'text-[#5de4ff]',
    };
  };

  const renderIcon = (iconName: string, accentClass: string) => {
    const cls = `w-6 h-6 sm:w-7 sm:h-7 ${accentClass}`;
    switch (iconName) {
      case 'bolt':
        return <Zap className={cls} />;
      case 'blade':
        return <Disc className={cls} />;
      case 'ring':
        return <CircleDot className={cls} />;
      case 'spark':
        return <Sparkles className={cls} />;
      case 'heart':
        return <Heart className={cls} />;
      case 'wind':
        return <Wind className={cls} />;
      case 'sword':
        return <Sword className={cls} />;
      case 'magnet':
        return <Magnet className={cls} />;
      case 'crosshair':
        return <Crosshair className={cls} />;
      case 'lantern':
        return <Flame className={cls} />;
      case 'sun':
        return <Sun className={cls} />;
      case 'eye':
        return <Eye className={cls} />;
      default:
        return <Sparkles className={cls} />;
    }
  };

  const renderChallengeIcon = (icon: DynamicChallengeOffer['icon']) => {
    const cls = 'w-5 h-5';
    switch (icon) {
      case 'shard':
        return <Gem className={`${cls} text-[#e5303a]`} />;
      case 'coins':
        return <Coins className={`${cls} text-[#f2c464]`} />;
      case 'shield':
        return <ShieldAlert className={`${cls} text-[#5de4ff]`} />;
      case 'flame':
        return <Flame className={`${cls} text-[#f2c464]`} />;
      case 'skull':
        return <Skull className={`${cls} text-[#e5303a]`} />;
      case 'sun':
        return <Sun className={`${cls} text-[#5de4ff]`} />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-modal-title"
      className="fixed inset-0 h-[100dvh] z-40 flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(5, 8, 12, 0.85)',
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-[440px] md:max-w-4xl flex flex-col items-center justify-center gap-2.5 sm:gap-3">
        {/* Header */}
        <div className="text-center shrink-0">
          <div className="font-display text-[11px] font-extrabold tracking-[0.26em] uppercase text-[#e5303a] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            LEVEL UP
          </div>
          <h2
            id="level-up-modal-title"
            className="font-display font-black text-[22px] sm:text-3xl tracking-[0.12em] uppercase leading-tight mt-0.5"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter:
                'drop-shadow(0 2px 0 #170805) drop-shadow(0 0 12px rgba(242, 169, 59, 0.35))',
            }}
          >
            CHOOSE A BLESSING
          </h2>
        </div>

        {/* Dynamic Challenge / Pact Card using panel_iron_card.png */}
        {challengeOffer && (
          <div
            className="w-full shrink-0"
            style={{
              filter: acceptChallenge
                ? 'drop-shadow(0 0 14px rgba(242, 169, 59, 0.6)) drop-shadow(0 0 12px rgba(220, 38, 38, 0.5))'
                : 'drop-shadow(0 0 12px rgba(220, 38, 38, 0.5)) drop-shadow(0 0 16px rgba(147, 51, 234, 0.32))',
            }}
          >
            <IronCard
              className="w-full"
              contentClassName="px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Metallic Icon Frame */}
                <div
                  className="w-11 h-11 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{
                    background: acceptChallenge
                      ? 'linear-gradient(180deg, #2d2010 0%, #140e07 100%)'
                      : 'linear-gradient(180deg, #29111a 0%, #13080d 100%)',
                    border: acceptChallenge
                      ? '2px solid #eab24e'
                      : '2px solid #a8243b',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.16), 0 4px 10px rgba(0,0,0,0.85)',
                  }}
                >
                  {renderChallengeIcon(challengeOffer.icon)}
                </div>

                {/* Title, Reward Badge & Concise Description */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h3 className="font-display font-black text-sm tracking-[0.08em] uppercase text-[#f2c464] leading-none">
                      {challengeOffer.title}
                    </h3>
                    <span className="font-display font-extrabold text-[10px] tracking-[0.06em] uppercase text-[#ffd98e] bg-[#2a1216]/90 border border-[#9e2833] px-1.5 py-0.5 rounded-[4px] whitespace-nowrap">
                      +{challengeOffer.rewardCoins} COINS · {challengeOffer.rewardBuffLabel}
                    </span>
                  </div>
                  <p className="font-body font-medium text-[12.5px] sm:text-[13px] text-[#cbbba0] leading-tight mt-1 line-clamp-2">
                    {challengeOffer.description}
                  </p>
                </div>
              </div>

              {/* Prominent Beveled Crimson-Gold ACCEPT PACT Button */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('medium');
                  setAcceptChallenge((prev) => !prev);
                }}
                className="w-full h-[36px] rounded-[7px] flex items-center justify-center gap-2 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
                style={{
                  background: acceptChallenge
                    ? 'linear-gradient(180deg, #8f2222 0%, #5c1014 55%, #36080a 100%)'
                    : 'linear-gradient(180deg, #52141a 0%, #310b0f 55%, #1d0608 100%)',
                  border: acceptChallenge
                    ? '1.5px solid #f2c464'
                    : '1.5px solid #b55d29',
                  boxShadow: acceptChallenge
                    ? 'inset 0 1px 0 rgba(255, 226, 156, 0.35), 0 0 12px rgba(242, 169, 59, 0.45)'
                    : 'inset 0 1px 0 rgba(242, 169, 59, 0.22), 0 4px 10px rgba(0, 0, 0, 0.8)',
                }}
              >
                {acceptChallenge && (
                  <Check className="w-4 h-4 text-[#f2c464] shrink-0" />
                )}
                <span className="font-display font-black text-[11px] tracking-[0.14em] uppercase text-[#f6dfa0]">
                  {acceptChallenge ? 'PACT ACCEPTED' : 'ACCEPT PACT'}
                </span>
              </button>
            </IronCard>
          </div>
        )}

        {/* 3 Compact Horizontal-Split Blessing Cards (Fit cleanly in 100dvh without scroll) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 w-full">
          {options.map((option, index) => {
            const theme = getRarityTheme(option);

            return (
              <div
                key={option.id}
                className="animate-card-slide-up w-full"
                style={{
                  animationDelay: `${index * 70}ms`,
                  filter: theme.outerShadow,
                }}
              >
                <IronCard
                  asButton
                  onClick={() => {
                    haptics.tap('medium');
                    onSelectUpgrade(option, acceptChallenge);
                  }}
                  ariaLabel={`${option.title} (${theme.label})`}
                  className="w-full active:scale-[0.97] hover:-translate-y-0.5 transition-transform duration-150"
                  contentClassName="px-3.5 py-3 md:p-5 flex flex-row md:flex-col items-center gap-3.5 md:gap-3 text-left md:text-center min-h-[100px] md:min-h-[210px]"
                >
                  {/* Left: Beveled Dark-Iron Metallic Icon Frame */}
                  <div
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{
                      background: theme.frameBg,
                      border: `2px solid ${theme.frameBorder}`,
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.85), 0 4px 12px rgba(0,0,0,0.85)',
                    }}
                  >
                    {renderIcon(option.icon, theme.accentText)}
                  </div>

                  {/* Right: Rarity Tag + Cinzel Title + 2-Line Rajdhani Description */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center md:items-center">
                    <div className="flex items-center md:justify-center gap-1.5 text-[10px] mb-0.5">
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

                    <h3 className="font-display font-black text-[15px] sm:text-base text-[#f2e4c7] leading-tight tracking-[0.04em]">
                      {option.title}
                    </h3>

                    <p className="font-body font-medium text-[13px] text-[#cbbba0] leading-snug mt-0.5 line-clamp-2">
                      {option.description}
                    </p>
                  </div>
                </IronCard>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
