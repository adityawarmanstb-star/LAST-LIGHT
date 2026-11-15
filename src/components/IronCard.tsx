import React from 'react';
import { UI_ASSETS, useChromaKeyImage } from '../hooks/useChromaKeyImage';

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
  onClick?: () => void;
  asButton?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

const HIGHLIGHT_STYLES: Record<NonNullable<IronCardProps['highlight']>, string> = {
  none: 'shadow-[0_10px_22px_rgba(0,0,0,0.85)]',
  gold: 'shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-[#c9a24b]/55',
  blood: 'shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-[#b3121a]/65',
  cyan: 'shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-[#5de4ff]/45',
  ember: 'shadow-[0_6px_18px_rgba(0,0,0,0.9)] ring-1 ring-[#c9a24b]/40',
};

export const IronCard: React.FC<IronCardProps> = ({
  children,
  className = '',
  contentClassName = 'p-4',
  highlight = 'none',
  onClick,
  asButton = false,
  ariaLabel,
  disabled = false,
}) => {
  const { processedSrc } = useChromaKeyImage(UI_ASSETS.panelIronCard);

  const inner = (
    <>
      {!processedSrc && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#23262d] via-[#15171c] to-[#0b0c0f] border border-[#3a3f47]/60 ${HIGHLIGHT_STYLES[highlight]}`}
        />
      )}
      {processedSrc && (
        <img
          src={processedSrc}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className={`pointer-events-none absolute inset-0 w-full h-full object-fill select-none ${HIGHLIGHT_STYLES[highlight]}`}
        />
      )}
      <div className={`relative z-10 w-full ${contentClassName}`}>{children}</div>
    </>
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
        {inner}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {inner}
    </div>
  );
};
