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
  none: 'drop-shadow-[0_10px_22px_rgba(0,0,0,0.85)]',
  gold: 'drop-shadow-[0_0_14px_rgba(242,169,59,0.45)]',
  blood: 'drop-shadow-[0_0_14px_rgba(179,18,26,0.55)]',
  cyan: 'drop-shadow-[0_0_12px_rgba(93,228,255,0.38)]',
  ember: 'drop-shadow-[0_0_14px_rgba(217,72,38,0.5)]',
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
          className="pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-b from-[#23262d] via-[#15171c] to-[#0b0c0f] border border-[#3a3f47]/60"
        />
      )}
      {processedSrc && (
        <img
          src={processedSrc}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
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
        } ${HIGHLIGHT_STYLES[highlight]} ${className}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`relative ${HIGHLIGHT_STYLES[highlight]} ${className}`}>
      {inner}
    </div>
  );
};
