import React, { useEffect, useState } from 'react';
import { Sparkles, Sword, Wind, Zap, Heart, Crosshair, Magnet, Disc, CircleDot, Flame, Sun, Eye } from 'lucide-react';
import { UpgradeOption } from '../game/types';
import { ForgedIronFrame } from './ForgedIronFrame';
import { BLOOD_IRON_COLORS } from '../game/ui/forgedIronPhaser';
import { haptics } from '../mobile/haptics';

interface LevelUpModalProps {
  options: UpgradeOption[];
  onSelectUpgrade: (option: UpgradeOption) => void;
}

type RarityTheme = {
  label: string;
  borderColor: string;
  glowColor: string;
  accentText: string;
  iconBg: string;
};

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ options, onSelectUpgrade }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pressedIdx, setPressedIdx] = useState<number | null>(null);

  // Allow keyboard 1, 2, 3 selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1' && options[0]) {
        onSelectUpgrade(options[0]);
      } else if (e.key === '2' && options[1]) {
        onSelectUpgrade(options[1]);
      } else if (e.key === '3' && options[2]) {
        onSelectUpgrade(options[2]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelectUpgrade]);

  const getRarityTheme = (option: UpgradeOption): RarityTheme => {
    if (option.rarity === 'epic') {
      return {
        label: 'Epic',
        borderColor: '#f2a93b',
        glowColor: '#f2a93b',
        accentText: 'text-[#f2a93b]',
        iconBg: 'border-[#f2a93b]/55 bg-[#1b150c]',
      };
    }
    if (option.category === 'weapon_unlock') {
      return {
        label: 'Relic',
        borderColor: '#5de4ff',
        glowColor: '#5de4ff',
        accentText: 'text-[#5de4ff]',
        iconBg: 'border-[#5de4ff]/55 bg-[#0f1a20]',
      };
    }
    if (option.rarity === 'rare') {
      return {
        label: 'Rare',
        borderColor: BLOOD_IRON_COLORS.freshBlood,
        glowColor: BLOOD_IRON_COLORS.bloodGlow,
        accentText: 'text-[#e5303a]',
        iconBg: 'border-[#b3121a]/65 bg-[#240a0d]',
      };
    }
    return {
      label: 'Common',
      borderColor: '#666e7b',
      glowColor: '#848e9c',
      accentText: 'text-[#b9b09a]',
      iconBg: 'border-[#3a3f47] bg-[#14161a]',
    };
  };

  const renderIcon = (iconName: string, accentClass: string) => {
    const cls = `w-7 h-7 ${accentClass}`;
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

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-40"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.8) 0%, rgba(22, 8, 11, 0.9) 100%)',
      }}
    >
      <div className="max-w-4xl w-full flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs font-medium tracking-[0.22em] uppercase text-[#e5303a] mb-1.5">
            Level Up
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-bold tracking-wider text-[#d8c9a8]">
            CHOOSE A BLESSING
          </h2>
        </div>

        {/* 3 Staggered Slide-Up Forged-Iron Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          {options.map((option, index) => {
            const theme = getRarityTheme(option);
            const isHovered = hoveredIdx === index;
            const isPressed = pressedIdx === index;

            return (
              <button
                key={option.id}
                onClick={() => onSelectUpgrade(option)}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => {
                  setHoveredIdx(null);
                  setPressedIdx(null);
                }}
                onPointerDown={() => {
                  setPressedIdx(index);
                  haptics.tap('medium');
                }}
                onPointerUp={() => setPressedIdx(null)}
                onPointerCancel={() => setPressedIdx(null)}
                style={{
                  animationDelay: `${index * 85}ms`,
                }}
                className="animate-card-slide-up group relative text-center transition-transform duration-150 cursor-pointer hover:-translate-y-1 active:scale-[0.96] min-h-[220px] md:min-h-[268px] flex focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2"
              >
                <ForgedIronFrame
                  seed={`lvlcard-${option.id}-${index}`}
                  dripCount={3}
                  maxDripLength={20}
                  borderColor={theme.borderColor}
                  glowColor={theme.glowColor}
                  glowStrength={isHovered || isPressed ? 14 : 7}
                  hovered={isHovered}
                  pressed={isPressed}
                  className="w-full h-full"
                  contentClassName="w-full h-full p-5 sm:p-6 flex flex-col items-center justify-between"
                >
                  {/* Icon on top */}
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`w-14 h-14 rounded-[10px] border flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105 ${theme.iconBg}`}
                    >
                      {renderIcon(option.icon, theme.accentText)}
                    </div>

                    {/* Unboxed Rarity & Level metadata */}
                    <div className="flex items-center justify-center gap-2 text-xs mb-1.5">
                      <span className={`font-semibold ${theme.accentText}`}>
                        {theme.label}
                      </span>
                      <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
                      <span className="font-mono-numbers text-[#9c8e72]">{option.levelText}</span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-bold text-[#d8c9a8] text-lg leading-snug mb-2">
                      {option.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-[13px] text-[#b0a287] leading-relaxed">
                      {option.description}
                    </p>
                  </div>

                  {/* Quiet Footer Hotkey */}
                  <div className="w-full pt-3 mt-4 border-t border-[#3a3f47]/70 flex items-center justify-between text-xs text-[#8e8168] group-hover:text-[#e5303a] transition-colors">
                    <span className="font-medium">Select</span>
                    <span className="font-mono-numbers font-semibold">[{index + 1}]</span>
                  </div>
                </ForgedIronFrame>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
