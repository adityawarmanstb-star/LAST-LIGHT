import React from 'react';
import { UI_SLICE, UI_SPRITES, UiSliceKey } from './uiConfig';

export interface NineSliceProps extends React.HTMLAttributes<HTMLElement> {
  variant?: UiSliceKey;
  as?: 'div' | 'section' | 'header' | 'nav' | 'span' | 'article';
  tileTexture?: 'stone' | 'row' | 'none';
  borderWidth?: string;
  padding?: string;
  highlight?: 'none' | 'gold' | 'blood' | 'cyan' | 'ember';
  contentClassName?: string;
  children?: React.ReactNode;
}

const HIGHLIGHT_RING_STYLE: Record<NonNullable<NineSliceProps['highlight']>, string> = {
  none: '',
  gold: 'ring-1 ring-[#f2a93b]/70',
  blood: 'ring-1 ring-[#e5303a]/75',
  cyan: 'ring-1 ring-[#5de4ff]/65',
  ember: 'ring-1 ring-[#f2a93b]/45',
};

/**
 * Universal NineSlice component backed by CSS border-image (with tileable edge repeat 'round'
 * and optional tiled inner stone/row backing). Zero filter or backdrop-filter usage.
 */
export const NineSlice: React.FC<NineSliceProps> = ({
  variant = 'panelIronDark',
  as = 'div',
  tileTexture = 'none',
  borderWidth,
  padding,
  highlight = 'none',
  className = '',
  contentClassName = '',
  style,
  children,
  ...rest
}) => {
  const spec = UI_SLICE[variant];
  const { top, right, bottom, left } = spec.slice;
  const resolvedBorderWidth = borderWidth ?? spec.defaultBorderWidth;
  const resolvedPadding = padding ?? spec.defaultContentPadding;

  const Component = as;

  const tileBackgroundStyle: React.CSSProperties | undefined =
    tileTexture === 'stone'
      ? {
          backgroundImage: `url("${UI_SPRITES.tileStone}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '346px 560px',
          backgroundPosition: 'top left',
        }
      : tileTexture === 'row'
        ? {
            backgroundImage: `url("${UI_SPRITES.tileRow}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '80px 40px',
            backgroundPosition: 'top left',
          }
        : undefined;

  return (
    <Component
      data-nineslice={variant}
      className={`relative box-border ${HIGHLIGHT_RING_STYLE[highlight]} ${className}`}
      style={{
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: resolvedBorderWidth,
        borderImageSource: `url("${spec.src}")`,
        borderImageSlice: `${top} ${right} ${bottom} ${left} fill`,
        borderImageWidth: resolvedBorderWidth,
        borderImageRepeat: spec.edgeRepeat,
        imageRendering: 'auto',
        ...style,
      }}
      {...rest}
    >
      {tileBackgroundStyle && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-45"
          style={tileBackgroundStyle}
        />
      )}
      {contentClassName ? (
        <div className={`relative z-10 ${contentClassName}`} style={{ padding: resolvedPadding }}>
          {children}
        </div>
      ) : resolvedPadding !== '0px' ? (
        <div className="relative z-10 w-full h-full" style={{ padding: resolvedPadding }}>
          {children}
        </div>
      ) : (
        children
      )}
    </Component>
  );
};
