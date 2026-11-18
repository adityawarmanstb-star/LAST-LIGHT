import React, { useState } from 'react';
import { haptics } from '../../mobile/haptics';
import { NineSlice } from './NineSlice';
import { UI_SLICE, UI_SPRITES, UiSliceKey } from './uiConfig';

export interface UiButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'iron' | 'blood' | 'cyan';
  active?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  haptic?: 'light' | 'medium';
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<UiButtonProps['size']>, string> = {
  xs: 'min-h-[30px] text-[10px] tracking-[0.08em]',
  sm: 'min-h-[38px] text-[11px] tracking-[0.08em]',
  md: 'min-h-[clamp(44px,6vh,52px)] text-[clamp(12px,2vw,14px)] tracking-[0.1em]',
  lg: 'min-h-[clamp(50px,7vh,60px)] text-[clamp(14px,2.5vw,17px)] tracking-[0.12em]',
};

const CAP_BORDER_WIDTH: Record<NonNullable<UiButtonProps['size']>, string> = {
  xs: '0px 10px',
  sm: '0px 14px',
  md: '0px clamp(14px, 2.8vw, 20px)',
  lg: '0px clamp(18px, 3.4vw, 26px)',
};

const SLICE_CONTENT_PAD: Record<NonNullable<UiButtonProps['size']>, string> = {
  xs: '3px 6px',
  sm: '5px 10px',
  md: '7px 14px',
  lg: '9px 18px',
};

/**
 * Horizontal 3-slice dark-fantasy button with 3 states swapped by state class
 * (.ui-btn--normal / .ui-btn--pressed / .ui-btn--disabled) at identical dimensions.
 */
export const UiButton: React.FC<UiButtonProps> = ({
  tone = 'iron',
  active = false,
  size = 'md',
  haptic = 'light',
  disabled = false,
  className = '',
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  ...rest
}) => {
  const [pressed, setPressed] = useState(false);

  const isPressed = !disabled && (pressed || (active && tone === 'blood'));

  const sliceKey: UiSliceKey = disabled
    ? 'btnWideNormal'
    : isPressed
      ? 'btnWidePressed'
      : active && tone === 'cyan'
        ? 'btnWideCyan'
        : tone === 'blood'
          ? 'btnWidePressed'
          : 'btnWideNormal';

  const stateClass = disabled
    ? 'ui-btn--disabled opacity-45 cursor-not-allowed text-[#7f838c]'
    : isPressed
      ? 'ui-btn--pressed cursor-pointer text-[#fff1dc]'
      : active
        ? 'ui-btn--active cursor-pointer text-[#f2c464]'
        : 'ui-btn--normal cursor-pointer text-[#e6d5b2] hover:text-[#fff3d6]';

  const spec = UI_SLICE[sliceKey];

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (!disabled) {
          setPressed(true);
          haptics.tap(haptic);
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      onPointerLeave={(e) => {
        setPressed(false);
        onPointerLeave?.(e);
      }}
      className={`ui-btn ${stateClass} relative inline-flex items-center justify-center select-none font-display font-extrabold uppercase leading-none transition-transform duration-120 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-[#f2a93b] focus-visible:outline-offset-2 ${SIZE_CLASSES[size]} ${className}`}
      style={{
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: CAP_BORDER_WIDTH[size],
        borderImageSource: `url("${spec.src}")`,
        borderImageSlice: `${spec.slice.top} ${spec.slice.right} ${spec.slice.bottom} ${spec.slice.left} fill`,
        borderImageWidth: CAP_BORDER_WIDTH[size],
        borderImageRepeat: spec.edgeRepeat,
        imageRendering: 'auto',
      }}
      {...rest}
    >
      <span
        className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap w-full text-center"
        style={{
          padding: SLICE_CONTENT_PAD[size],
          textShadow: '0 2px 3px rgba(0, 0, 0, 0.96)',
        }}
      >
        {children}
      </span>
    </button>
  );
};

export interface UiRoundButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'steel' | 'crimson' | 'cyan' | 'rune' | 'skull' | 'socket';
  active?: boolean;
  sizePx?: number;
  haptic?: 'light' | 'medium';
  children: React.ReactNode;
}

const ROUND_SPRITE_MAP: Record<NonNullable<UiRoundButtonProps['variant']>, string> = {
  steel: UI_SPRITES.roundSteel,
  crimson: UI_SPRITES.roundCrimson,
  cyan: UI_SPRITES.roundCyan,
  rune: UI_SPRITES.roundRuneLevel,
  skull: UI_SPRITES.roundSkullBadge,
  socket: UI_SPRITES.roundSquareSocket,
};

/**
 * Fixed-aspect circular/square icon button (always aspect-square + object-contain, never stretched).
 */
export const UiRoundButton: React.FC<UiRoundButtonProps> = ({
  variant = 'steel',
  active = false,
  sizePx,
  haptic = 'light',
  disabled = false,
  className = '',
  style,
  children,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  ...rest
}) => {
  const [pressed, setPressed] = useState(false);

  const spriteSrc =
    !disabled && (pressed || active) && variant === 'steel'
      ? UI_SPRITES.roundCrimson
      : ROUND_SPRITE_MAP[variant];

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={(e) => {
        if (!disabled) {
          setPressed(true);
          haptics.tap(haptic);
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      onPointerLeave={(e) => {
        setPressed(false);
        onPointerLeave?.(e);
      }}
      style={{
        aspectRatio: '1 / 1',
        ...(sizePx ? { width: sizePx, height: sizePx } : {}),
        ...style,
      }}
      className={`relative aspect-square inline-flex items-center justify-center shrink-0 select-none transition-transform duration-120 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#f2a93b] focus-visible:outline-offset-2 ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...rest}
    >
      <img
        src={spriteSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ imageRendering: 'auto' }}
        className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
      />
      <span className="relative z-10 flex items-center justify-center w-full h-full">
        {children}
      </span>
    </button>
  );
};

export interface UiPlateProps {
  variant?: UiSliceKey;
  tileTexture?: 'stone' | 'row' | 'none';
  highlight?: 'none' | 'gold' | 'blood' | 'cyan' | 'ember';
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export const UiPlate: React.FC<UiPlateProps> = ({
  variant = 'miniPlate',
  tileTexture = 'none',
  highlight = 'none',
  className = '',
  contentClassName = '',
  children,
}) => (
  <NineSlice
    variant={variant}
    tileTexture={tileTexture}
    highlight={highlight}
    className={className}
    contentClassName={contentClassName}
  >
    {children}
  </NineSlice>
);
