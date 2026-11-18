import React from 'react';
import { useChromaKeyImage } from '../hooks/useChromaKeyImage';
import { NineSlice } from './ui/NineSlice';
import { UiSliceKey } from './ui/uiConfig';

interface ChromaKeyImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: React.ReactNode;
}

export const ChromaKeyImg: React.FC<ChromaKeyImgProps> = ({
  src,
  alt = '',
  className = '',
  fallback = null,
  ...rest
}) => {
  const { processedSrc, hasError } = useChromaKeyImage(src);

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={processedSrc ?? src}
      alt={alt}
      referrerPolicy="no-referrer"
      style={{ imageRendering: 'auto' }}
      className={`${className} ${processedSrc ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
      {...rest}
    />
  );
};

interface IronCardProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  highlight?: 'none' | 'gold' | 'blood' | 'cyan' | 'ember';
  variant?: UiSliceKey;
  tileTexture?: 'stone' | 'row' | 'none';
  onClick?: () => void;
  asButton?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Legacy wrapper migrated to use the single reusable NineSlice component
 * with zero object-fill stretching.
 */
export const IronCard: React.FC<IronCardProps> = ({
  children,
  className = '',
  contentClassName = 'p-4',
  highlight = 'none',
  variant = 'panelIronDark',
  tileTexture = 'stone',
  onClick,
  asButton = false,
  ariaLabel,
  disabled = false,
}) => {
  const framedBody = (
    <NineSlice
      variant={variant}
      tileTexture={tileTexture}
      highlight={highlight}
      padding="0px"
      className="w-full h-full shadow-[0_8px_18px_rgba(0,0,0,0.82)]"
      contentClassName={`w-full h-full ${contentClassName}`}
    >
      {children}
    </NineSlice>
  );

  if (asButton || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`relative text-left transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#f2a93b] ${
          disabled ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'
        } ${className}`}
      >
        {framedBody}
      </button>
    );
  }

  return <div className={`relative ${className}`}>{framedBody}</div>;
};
