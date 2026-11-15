import React from 'react';
import {
  IconRarity,
  ResolvedIconSpec,
  getRarityFrameId,
  resolveIconSpec,
} from '../game/iconRegistry';
import { UI_ASSETS, useChromaKeyImage } from '../hooks/useChromaKeyImage';

export interface IconProps {
  id: string;
  size?: number;
  rarity?: IconRarity;
  alt?: string;
  className?: string;
  muted?: boolean;
}

const CUSTOM_UI_ICON_ASSETS: Record<string, string> = {
  nav_home: UI_ASSETS.iconHome,
  home: UI_ASSETS.iconHome,
  nav_shop: UI_ASSETS.iconShop,
  shop: UI_ASSETS.iconShop,
  nav_missions: UI_ASSETS.iconMissions,
  missions: UI_ASSETS.iconMissions,
  mission: UI_ASSETS.iconMissions,
  nav_bestiary: UI_ASSETS.iconBestiary,
  bestiary: UI_ASSETS.iconBestiary,
  nav_achievements: UI_ASSETS.iconAchievements,
  achievements: UI_ASSETS.iconAchievements,
  achievement: UI_ASSETS.iconAchievements,
};

function resolveCustomAssetUrl(id: string): string | null {
  const normalized = id.trim().toLowerCase();
  return CUSTOM_UI_ICON_ASSETS[normalized] ?? null;
}

const CustomAssetIcon: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const { processedSrc } = useChromaKeyImage(src);

  return (
    <img
      src={processedSrc ?? src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      decoding="async"
      referrerPolicy="no-referrer"
      className={`w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] ${className}`}
    />
  );
};

const AtlasSprite: React.FC<{
  spec: ResolvedIconSpec;
  alt: string;
  className?: string;
}> = ({ spec, alt, className = '' }) => {
  const widthPct = (spec.atlasWidth / spec.frame.w) * 100;
  const heightPct = (spec.atlasHeight / spec.frame.h) * 100;
  const offsetXPct = -(spec.frame.x / spec.atlasWidth) * 100;
  const offsetYPct = -(spec.frame.y / spec.atlasHeight) * 100;

  return (
    <span
      className={`relative block w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
    >
      <img
        src={spec.atlasUrl}
        alt={alt}
        draggable={false}
        decoding="async"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${widthPct}%`,
          height: `${heightPct}%`,
          maxWidth: 'none',
          maxHeight: 'none',
          transform: `translate(${offsetXPct}%, ${offsetYPct}%)`,
          imageRendering: 'auto',
          filter: 'none',
        }}
      />
    </span>
  );
};

/**
 * Single muted bone/steel monochrome fallback icon when an id is not yet in icon_map.json.
 * Uses no CSS filters, drop-shadows, or glow animations.
 */
const FallbackMonochromeIcon: React.FC<{ alt: string }> = ({ alt }) => (
  <svg
    viewBox="0 0 32 32"
    className="w-full h-full block select-none pointer-events-none"
    role={alt ? 'img' : undefined}
    aria-label={alt || undefined}
    aria-hidden={alt ? undefined : true}
  >
    <polygon
      points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5"
      fill="#1b1e24"
      stroke="#5d6470"
      strokeWidth="2"
    />
    <polygon
      points="16,8 22,16 16,24 10,16"
      fill="none"
      stroke="#9b9282"
      strokeWidth="1.75"
    />
    <circle cx="16" cy="16" r="2.2" fill="#9b9282" />
  </svg>
);

export const Icon: React.FC<IconProps> = ({
  id,
  size = 24,
  rarity,
  alt = '',
  className = '',
  muted = false,
}) => {
  const customAssetUrl = resolveCustomAssetUrl(id);
  const spec = customAssetUrl ? null : resolveIconSpec(id);
  const frameSpec = rarity ? resolveIconSpec(getRarityFrameId(rarity)) : null;
  const resolvedChromaUrl = customAssetUrl ?? spec?.assetUrl ?? null;

  const renderGlyph = () => {
    if (resolvedChromaUrl) {
      return <CustomAssetIcon src={resolvedChromaUrl} alt={alt} />;
    }
    if (spec) {
      return <AtlasSprite spec={spec} alt={alt} />;
    }
    return <FallbackMonochromeIcon alt={alt} />;
  };

  if (rarity && frameSpec) {
    return (
      <span
        className={`relative inline-flex items-center justify-center shrink-0 select-none ${
          muted ? 'opacity-50' : ''
        } ${className}`}
        style={{ width: size, height: size }}
      >
        <span
          className="absolute z-0 flex items-center justify-center"
          style={{
            width: '66%',
            height: '66%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {renderGlyph()}
        </span>
        <span className="absolute inset-0 z-10 pointer-events-none">
          <AtlasSprite spec={frameSpec} alt="" />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        muted ? 'opacity-50' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {renderGlyph()}
    </span>
  );
};
