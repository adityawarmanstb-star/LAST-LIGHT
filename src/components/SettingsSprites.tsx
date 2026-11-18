import React, { useState } from 'react';
import { haptics } from '../mobile/haptics';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiScrollbar, UiSlider, UiToggle } from './ui/UiControls';
import { UI_SPRITES } from './ui/uiConfig';

export const SETTINGS_SPRITES = {
  panelStone: UI_SPRITES.tileStone,
  rowBg: UI_SPRITES.tileRow,
  headerSpeakerBox: UI_SPRITES.headerSpeakerBox,
  closeDefault: UI_SPRITES.closeDefault,
  closeHover: UI_SPRITES.closeHover,
  closePressed: UI_SPRITES.closePressed,
  iconMusicRed: UI_SPRITES.iconMusicRed,
  iconSfxGold: UI_SPRITES.iconSfxGold,
  iconMuteWave: UI_SPRITES.iconMuteWave,
  iconGorePower: UI_SPRITES.iconGorePower,
  sliderTrackLeft: UI_SPRITES.sliderTrackLeft,
  sliderTrackMid: UI_SPRITES.sliderTrackMid,
  sliderTrackRight: UI_SPRITES.sliderTrackRight,
  sliderKnobDefault: UI_SPRITES.sliderKnobDefault,
  sliderKnobActive: UI_SPRITES.sliderKnobActive,
  scrollTrack: UI_SPRITES.scrollTrack,
  scrollThumbTop: UI_SPRITES.scrollThumbTop,
  scrollThumbMid: UI_SPRITES.scrollThumbMid,
  scrollThumbBottom: UI_SPRITES.scrollThumbBottom,
  scrollArrowUp: UI_SPRITES.scrollArrowUp,
  scrollArrowDown: UI_SPRITES.scrollArrowDown,
} as const;

type ButtonVariant = 'done' | 'attack' | 'cast' | 'iron';

/**
 * Main Settings Panel powered by the single reusable NineSlice + tiled stone interior.
 */
export const GothicPanel9Slice: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <NineSlice
    variant="panelIronDark"
    tileTexture="stone"
    padding="0px"
    className={`shadow-[0_18px_40px_rgba(0,0,0,0.92)] ${className}`}
    contentClassName="flex flex-col flex-1 min-h-0 h-full px-3 sm:px-4 pt-3 pb-3.5"
  >
    {children}
  </NineSlice>
);

/**
 * Settings Row card using NineSlice miniPlate / plateWideIron + tiled row_bg texture.
 */
export const GothicRow9Slice: React.FC<{
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}> = ({ children, className = '', contentClassName = 'px-3 py-2.5' }) => (
  <NineSlice
    variant="plateWideIron"
    tileTexture="row"
    padding="0px"
    borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 18px)"
    className={className}
    contentClassName={contentClassName}
  >
    {children}
  </NineSlice>
);

/**
 * 3-Slice horizontal button delegating to UiButton (normal / pressed / disabled states).
 */
interface Sprite3SliceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant;
  active?: boolean;
  iconInsetPadding?: boolean;
  children: React.ReactNode;
}

export const Sprite3SliceButton: React.FC<Sprite3SliceButtonProps> = ({
  variant,
  active = false,
  className = '',
  disabled = false,
  children,
  ...rest
}) => (
  <UiButton
    tone={variant === 'done' ? 'blood' : variant === 'cast' ? 'cyan' : 'iron'}
    active={active}
    size="sm"
    disabled={disabled}
    className={className}
    {...rest}
  >
    {children}
  </UiButton>
);

/**
 * Square Sprite Close Button (1:1 aspect ratio, 3 states, object-fit: contain).
 */
export const SpriteCloseButton: React.FC<{
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}> = ({ onClick, ariaLabel = 'Close Settings', className = '' }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const src = pressed
    ? SETTINGS_SPRITES.closePressed
    : hovered
      ? SETTINGS_SPRITES.closeHover
      : SETTINGS_SPRITES.closeDefault;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={() => {
        setPressed(true);
        haptics.tap('light');
      }}
      onPointerUp={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{ aspectRatio: '1 / 1' }}
      className={`relative shrink-0 w-10 sm:w-11 min-w-[40px] min-h-[40px] aspect-square flex items-center justify-center transition-transform duration-150 ease-out active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${className}`}
    >
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ imageRendering: 'auto' }}
        className="w-full h-full object-contain select-none"
      />
    </button>
  );
};

export const SpriteVolumeSlider: React.FC<{
  value: number;
  disabled?: boolean;
  ariaLabel: string;
  onChange: (val: number) => void;
}> = (props) => <UiSlider {...props} />;

/**
 * Pure Sprite Toggle Switch (track + knob, zero MUTE/ON/OFF text labels).
 */
export const SpriteToggleSwitch: React.FC<{
  checked: boolean;
  variant?: 'standard' | 'mute';
  onLabel?: string;
  offLabel?: string;
  ariaLabel: string;
  onToggle: () => void;
}> = ({ checked, variant = 'standard', ariaLabel, onToggle }) => (
  <UiToggle checked={checked} variant={variant} ariaLabel={ariaLabel} onToggle={onToggle} />
);

export const SpriteScrollbar: React.FC<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
}> = ({ scrollRef }) => <UiScrollbar scrollRef={scrollRef} />;
