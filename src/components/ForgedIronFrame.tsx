import React from 'react';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiSliceKey } from './ui/uiConfig';

export interface ForgedIronFrameProps {
  seed?: string | number;
  variant?: UiSliceKey;
  tileTexture?: 'stone' | 'row' | 'none';
  className?: string;
  contentClassName?: string;
  radius?: number;
  dripCount?: number;
  maxDripLength?: number;
  scratchCount?: number;
  stainCount?: number;
  borderColor?: string;
  glowColor?: string;
  glowStrength?: number;
  hovered?: boolean;
  pressed?: boolean;
  showDrips?: boolean;
  children?: React.ReactNode;
}

/**
 * Legacy ForgedIronFrame refactored to render cleanly via the single reusable NineSlice component.
 */
export const ForgedIronFrame: React.FC<ForgedIronFrameProps> = ({
  variant = 'panelIronDark',
  tileTexture = 'stone',
  className = '',
  contentClassName = '',
  borderColor,
  children,
}) => {
  const highlight: 'none' | 'gold' | 'blood' =
    borderColor === '#f2a93b'
      ? 'gold'
      : borderColor === '#b3121a' || borderColor === '#e5303a'
        ? 'blood'
        : 'none';

  return (
    <NineSlice
      variant={variant}
      tileTexture={tileTexture}
      highlight={highlight}
      padding="0px"
      className={`shadow-[0_12px_26px_rgba(0,0,0,0.86)] ${className}`}
      contentClassName={`relative z-10 ${contentClassName}`}
    >
      {children}
    </NineSlice>
  );
};

interface IronButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  seed?: string | number;
  variant?: 'default' | 'blood';
  radius?: number;
  dripCount?: number;
  borderColor?: string;
  glowColor?: string;
  glowStrength?: number;
}

export const IronButton: React.FC<IronButtonProps> = ({
  variant = 'default',
  className = '',
  children,
  disabled,
  ...rest
}) => (
  <UiButton
    tone={variant === 'blood' ? 'blood' : 'iron'}
    disabled={disabled}
    haptic={variant === 'blood' ? 'medium' : 'light'}
    className={className}
    {...rest}
  >
    {children}
  </UiButton>
);
