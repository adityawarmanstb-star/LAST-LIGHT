import React from 'react';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';

interface LeverToggleProps {
  checked: boolean;
  onToggle: () => void;
  ariaLabel: string;
}

export const LeverToggle: React.FC<LeverToggleProps> = ({
  checked,
  onToggle,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => {
        soundManager.playUiClick();
        haptics.tap('light');
        onToggle();
      }}
      className="min-w-[68px] min-h-[56px] px-1.5 flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#c9a24b]"
    >
      {/* Forged-iron lever slot */}
      <span
        className="relative w-[58px] h-[30px] rounded-full border flex items-center px-[3px] transition-colors duration-150"
        style={{
          background: checked
            ? 'linear-gradient(180deg, #0d161b 0%, #152128 100%)'
            : 'linear-gradient(180deg, #1b0a0c 0%, #2c0d11 100%)',
          borderColor: checked ? '#3a4f59' : '#b3121a',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Inner red indicator dot when OFF */}
        {!checked && (
          <span
            aria-hidden="true"
            className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-[#b3121a]"
          />
        )}

        {/* Brushed steel knob: red border when OFF, cyan glow on knob ONLY when ON */}
        <span
          aria-hidden="true"
          className={`w-[22px] h-[22px] rounded-full border transition-transform duration-150 ${
            checked ? 'translate-x-[28px]' : 'translate-x-0'
          }`}
          style={{
            background:
              'radial-gradient(circle at 35% 30%, #9ca4b0 0%, #4b525e 58%, #1a1d24 100%)',
            borderColor: checked ? '#5de4ff' : '#b3121a',
            boxShadow: checked
              ? '0 0 8px rgba(93, 228, 255, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.45)'
              : '0 1px 3px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.28)',
          }}
        />
      </span>
    </button>
  );
};
