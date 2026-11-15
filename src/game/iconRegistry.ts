export type IconAtlasId = 'icons_atlas' | 'ui_extra_atlas' | 'standalone_chroma';

export type IconRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type RarityFrameId =
  | 'frame_common'
  | 'frame_rare'
  | 'frame_epic'
  | 'frame_legendary';

export interface IconFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IconMapEntry {
  display: string;
  category: 'relic' | 'ui' | 'currency' | 'skill' | 'frame' | 'tutorial' | 'shop';
  atlas: IconAtlasId;
  assetUrl?: string;
}

export interface ResolvedIconSpec {
  id: string;
  display: string;
  category: IconMapEntry['category'];
  atlas: IconAtlasId;
  atlasUrl: string;
  atlasWidth: number;
  atlasHeight: number;
  frame: IconFrameRect;
  assetUrl?: string;
}

export const ICON_ATLAS_URLS: Record<Exclude<IconAtlasId, 'standalone_chroma'>, string> = {
  icons_atlas: './assets/aistudio/icons_atlas_4e461ffb.webp',
  ui_extra_atlas: './assets/aistudio/ui_extra_atlas_121c397f.webp',
};

export const ICON_ATLAS_JSON_URLS: Record<Exclude<IconAtlasId, 'standalone_chroma'>, string> = {
  icons_atlas: './assets/aistudio/icons_atlas_d98a4dc4.json',
  ui_extra_atlas: './assets/aistudio/ui_extra_atlas_14c86c31.json',
};

const ATLAS_DIMENSIONS: Record<Exclude<IconAtlasId, 'standalone_chroma'>, { w: number; h: number }> = {
  icons_atlas: { w: 1152, h: 1152 },
  ui_extra_atlas: { w: 1152, h: 544 },
};

export const ICON_MAP: Record<string, IconMapEntry> = {
  umbral_pact: { display: 'Umbral Pact', category: 'relic', atlas: 'icons_atlas' },
  lodestone_heart: { display: 'Lodestone Heart', category: 'relic', atlas: 'icons_atlas' },
  twin_wind_feather: { display: 'Twin-Wind Feather', category: 'relic', atlas: 'icons_atlas' },
  multishot: { display: 'Multishot', category: 'relic', atlas: 'icons_atlas' },
  bloodied_blade: { display: 'Bloodied Blade', category: 'relic', atlas: 'icons_atlas' },
  quick_hands: { display: 'Quick Hands', category: 'relic', atlas: 'icons_atlas' },
  wraith_boots: { display: 'Wraith Boots', category: 'relic', atlas: 'icons_atlas' },
  iron_heart: { display: 'Iron Heart', category: 'relic', atlas: 'icons_atlas' },
  magnet_horseshoe: { display: 'Magnet Horseshoe', category: 'relic', atlas: 'icons_atlas' },
  blood_chalice: {
    display: 'Crimson Chalice',
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/blood_chalice_3a3b81b6.webp',
  },
  sunforged_lens: {
    display: 'Sunforged Lens',
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/sunforged_lens_de858746.webp',
  },
  iron_spurs: {
    display: 'Quicksilver Spurs',
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/iron_spurs_40c52100.webp',
  },
  executioner_seal: {
    display: "Executioner's Seal",
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/executioner_seal_3f778ae0.webp',
  },
  solar_ignition: {
    display: 'Solar Ignition',
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/solar_ignition_d7407a04.webp',
  },
  eye_of_the_storm: {
    display: 'Eye of the Storm',
    category: 'relic',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/eye_of_the_storm_6cd23746.webp',
  },
  bolt: {
    display: 'Light Bolt',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/bolt_71ac68d8.webp',
  },
  blades: {
    display: 'Spectral Blades',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/blades_26a1aed0.webp',
  },
  ring: {
    display: 'Radiant Nova',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/ring_500d8c8b.webp',
  },
  spark: {
    display: 'Celestial Sparks',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/spark_f849b892.webp',
  },
  shotgun: {
    display: 'Radiant Scatter',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/shotgun_578505c0.webp',
  },
  stat_vitality: {
    display: 'Blessed Vigor',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_vitality_86a307d0.webp',
  },
  stat_speed: {
    display: 'Wings of Dawn',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_speed_e88dad10.webp',
  },
  stat_might: {
    display: 'Inner Radiance',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_might_b187c7b7.webp',
  },
  stat_magnet: {
    display: 'Soul Vortex',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_magnet_466d6ed9.webp',
  },
  stat_cooldown: {
    display: 'Chronos Grace',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_cooldown_2fe51f54.webp',
  },
  stat_crit: {
    display: 'Astral Eye',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/stat_crit_6168bb7b.webp',
  },
  light_burst: {
    display: 'Light Burst',
    category: 'skill',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/light_burst_95f6973e.webp',
  },
  blood_seal: {
    display: 'Crimson Seal',
    category: 'shop',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/blood_seal_bec54a9a.webp',
  },
  ash_hoard: {
    display: 'Ashfen Hoard',
    category: 'shop',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/ash_hoard_d283c510.webp',
  },
  warden_tribute: {
    display: 'Iron Vault',
    category: 'shop',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/warden_tribute_b165309f.webp',
  },
  lantern: {
    display: 'Lantern Brightness',
    category: 'shop',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/lantern_6d635f24.webp',
  },
  vitality: {
    display: 'Soul Vitality',
    category: 'shop',
    atlas: 'standalone_chroma',
    assetUrl: './assets/aistudio/vitality_0e6c8215.webp',
  },
  ui_settings: { display: 'Settings', category: 'ui', atlas: 'icons_atlas' },
  ui_sound_on: { display: 'Sound on', category: 'ui', atlas: 'icons_atlas' },
  ui_sound_off: { display: 'Sound off (muted)', category: 'ui', atlas: 'icons_atlas' },
  ui_music: { display: 'Music', category: 'ui', atlas: 'icons_atlas' },
  ui_sfx: { display: 'Sound effects', category: 'ui', atlas: 'icons_atlas' },
  ui_brightness: { display: 'Lantern brightness', category: 'ui', atlas: 'icons_atlas' },
  ui_haptics: { display: 'Haptic feedback', category: 'ui', atlas: 'icons_atlas' },
  ui_lock_closed: { display: 'Locked', category: 'ui', atlas: 'icons_atlas' },
  ui_lock_open: { display: 'Unlocked', category: 'ui', atlas: 'icons_atlas' },
  ui_dash: { display: 'Dash', category: 'ui', atlas: 'icons_atlas' },
  ui_stand_still: { display: 'Stand still', category: 'ui', atlas: 'icons_atlas' },
  ui_nearest_foes: { display: 'Nearest foes', category: 'ui', atlas: 'icons_atlas' },
  crimson_gem: { display: 'Crimson Gem', category: 'currency', atlas: 'icons_atlas' },
  soul_coin: { display: 'Soul Coin', category: 'currency', atlas: 'icons_atlas' },
  ui_day_flame: { display: 'Day counter flame', category: 'ui', atlas: 'icons_atlas' },
  ui_close: { display: 'Close', category: 'ui', atlas: 'icons_atlas' },
  ui_back: { display: 'Back', category: 'ui', atlas: 'icons_atlas' },
  ui_info: { display: 'Info', category: 'ui', atlas: 'icons_atlas' },
  brighter_lantern: { display: 'Brighter Lantern', category: 'skill', atlas: 'icons_atlas' },
  spinning_blade: { display: 'Spinning Blade', category: 'skill', atlas: 'icons_atlas' },
  chain_lightning: { display: 'Chain Lightning', category: 'skill', atlas: 'icons_atlas' },
  shield_ward: { display: 'Shield Ward', category: 'skill', atlas: 'icons_atlas' },
  critical_fang: { display: 'Critical Fang', category: 'skill', atlas: 'icons_atlas' },
  soul_magnet: { display: 'Soul Magnet', category: 'skill', atlas: 'icons_atlas' },
  cursed_coin: { display: 'Cursed Coin', category: 'skill', atlas: 'icons_atlas' },
  embers: { display: 'Embers', category: 'skill', atlas: 'icons_atlas' },
  night_eyes: { display: 'Night Eyes', category: 'skill', atlas: 'icons_atlas' },
  frame_common: { display: 'Rarity frame: common', category: 'frame', atlas: 'ui_extra_atlas' },
  frame_rare: { display: 'Rarity frame: rare', category: 'frame', atlas: 'ui_extra_atlas' },
  frame_epic: { display: 'Rarity frame: epic', category: 'frame', atlas: 'ui_extra_atlas' },
  frame_legendary: { display: 'Rarity frame: legendary', category: 'frame', atlas: 'ui_extra_atlas' },
  tutorial_drag: { display: 'How to play: drag', category: 'tutorial', atlas: 'ui_extra_atlas' },
  tutorial_dash: { display: 'How to play: dash', category: 'tutorial', atlas: 'ui_extra_atlas' },
  tutorial_stand_still: {
    display: 'How to play: stand_still',
    category: 'tutorial',
    atlas: 'ui_extra_atlas',
  },
};

const ATLAS_FRAMES: Record<Exclude<IconAtlasId, 'standalone_chroma'>, Record<string, IconFrameRect>> = {
  icons_atlas: {
    umbral_pact: { x: 0, y: 0, w: 192, h: 192 },
    lodestone_heart: { x: 192, y: 0, w: 192, h: 192 },
    twin_wind_feather: { x: 384, y: 0, w: 192, h: 192 },
    multishot: { x: 576, y: 0, w: 192, h: 192 },
    bloodied_blade: { x: 768, y: 0, w: 192, h: 192 },
    quick_hands: { x: 960, y: 0, w: 192, h: 192 },
    wraith_boots: { x: 0, y: 192, w: 192, h: 192 },
    iron_heart: { x: 192, y: 192, w: 192, h: 192 },
    magnet_horseshoe: { x: 384, y: 192, w: 192, h: 192 },
    ui_settings: { x: 576, y: 192, w: 192, h: 192 },
    ui_sound_on: { x: 768, y: 192, w: 192, h: 192 },
    ui_sound_off: { x: 960, y: 192, w: 192, h: 192 },
    ui_music: { x: 0, y: 384, w: 192, h: 192 },
    ui_sfx: { x: 192, y: 384, w: 192, h: 192 },
    ui_brightness: { x: 384, y: 384, w: 192, h: 192 },
    ui_haptics: { x: 576, y: 384, w: 192, h: 192 },
    ui_lock_closed: { x: 768, y: 384, w: 192, h: 192 },
    ui_lock_open: { x: 960, y: 384, w: 192, h: 192 },
    ui_dash: { x: 0, y: 576, w: 192, h: 192 },
    ui_stand_still: { x: 192, y: 576, w: 192, h: 192 },
    ui_nearest_foes: { x: 384, y: 576, w: 192, h: 192 },
    crimson_gem: { x: 576, y: 576, w: 192, h: 192 },
    soul_coin: { x: 768, y: 576, w: 192, h: 192 },
    ui_day_flame: { x: 960, y: 576, w: 192, h: 192 },
    ui_close: { x: 0, y: 768, w: 192, h: 192 },
    ui_back: { x: 192, y: 768, w: 192, h: 192 },
    ui_info: { x: 384, y: 768, w: 192, h: 192 },
    brighter_lantern: { x: 576, y: 768, w: 192, h: 192 },
    spinning_blade: { x: 768, y: 768, w: 192, h: 192 },
    chain_lightning: { x: 960, y: 768, w: 192, h: 192 },
    shield_ward: { x: 0, y: 960, w: 192, h: 192 },
    critical_fang: { x: 192, y: 960, w: 192, h: 192 },
    soul_magnet: { x: 384, y: 960, w: 192, h: 192 },
    cursed_coin: { x: 576, y: 960, w: 192, h: 192 },
    embers: { x: 768, y: 960, w: 192, h: 192 },
    night_eyes: { x: 960, y: 960, w: 192, h: 192 },
  },
  ui_extra_atlas: {
    frame_common: { x: 0, y: 0, w: 256, h: 256 },
    frame_rare: { x: 256, y: 0, w: 256, h: 256 },
    frame_epic: { x: 512, y: 0, w: 256, h: 256 },
    frame_legendary: { x: 768, y: 0, w: 256, h: 256 },
    tutorial_drag: { x: 0, y: 256, w: 288, h: 288 },
    tutorial_dash: { x: 288, y: 256, w: 288, h: 288 },
    tutorial_stand_still: { x: 576, y: 256, w: 288, h: 288 },
  },
};

const ID_ALIASES: Record<string, string> = {
  twin_zephyr: 'twin_wind_feather',
  'spectral blade': 'blades',
  blade: 'blades',
  'luminescent might': 'bolt',
  'rapid volley': 'bolt',
  'solar core': 'bolt',
  'revolving edge': 'blades',
  'phantom sharpness': 'blades',
  'expanding horizon': 'ring',
  'holy resonance': 'ring',
  'cluster eruption': 'spark',
  'supernova charge': 'spark',
  'solar barrage': 'shotgun',
  'quick cocking': 'shotgun',
  'lantern flare': 'stat_might',
  might: 'stat_might',
  'zephyr steps': 'stat_speed',
  swiftness: 'stat_speed',
  'soul attractor': 'stat_magnet',
  magnet: 'stat_magnet',
  'rapid incantation': 'stat_cooldown',
  cooldown: 'stat_cooldown',
  'soul hunter': 'cursed_coin',
  greed: 'cursed_coin',
  'undying ember': 'shield_ward',
  revive: 'shield_ward',
};

const DISPLAY_NAME_TO_ID = new Map<string, string>();
const KEY_LOWER_TO_ID = new Map<string, string>();

for (const [id, entry] of Object.entries(ICON_MAP)) {
  KEY_LOWER_TO_ID.set(id.toLowerCase(), id);
  DISPLAY_NAME_TO_ID.set(entry.display.trim().toLowerCase(), id);
}

for (const [alias, targetId] of Object.entries(ID_ALIASES)) {
  KEY_LOWER_TO_ID.set(alias.toLowerCase(), targetId);
}

const loggedMissingIds = new Set<string>();
const preloadedImages = new Map<Exclude<IconAtlasId, 'standalone_chroma'>, HTMLImageElement>();
let atlasesPreloadPromise: Promise<void> | null = null;

export function preloadIconAtlases(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (atlasesPreloadPromise) return atlasesPreloadPromise;

  const atlasKeys = Object.keys(ICON_ATLAS_URLS) as Exclude<IconAtlasId, 'standalone_chroma'>[];
  const imagePromises = atlasKeys.map(
    (atlasId) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (typeof img.decode === 'function') {
            img.decode().catch(() => {}).finally(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = ICON_ATLAS_URLS[atlasId];
        preloadedImages.set(atlasId, img);
      })
  );

  const jsonPromises = Object.values(ICON_ATLAS_JSON_URLS).map((url) =>
    fetch(url)
      .then(() => undefined)
      .catch(() => undefined)
  );

  atlasesPreloadPromise = Promise.all([...imagePromises, ...jsonPromises]).then(() => undefined);
  return atlasesPreloadPromise;
}

if (typeof window !== 'undefined') {
  void preloadIconAtlases();
}

export function getRarityFrameId(rarity: IconRarity): RarityFrameId {
  switch (rarity) {
    case 'rare':
      return 'frame_rare';
    case 'epic':
      return 'frame_epic';
    case 'legendary':
      return 'frame_legendary';
    case 'common':
    default:
      return 'frame_common';
  }
}

export function resolveIconSpec(idOrDisplayName: string): ResolvedIconSpec | null {
  const normalized = idOrDisplayName.trim().toLowerCase();
  if (!normalized) return null;

  const matchedId =
    KEY_LOWER_TO_ID.get(normalized) ?? DISPLAY_NAME_TO_ID.get(normalized) ?? null;

  if (!matchedId) {
    if (!loggedMissingIds.has(normalized)) {
      loggedMissingIds.add(normalized);
      console.warn(`[Icon] Missing icon id: "${idOrDisplayName}"`);
    }
    return null;
  }

  const entry = ICON_MAP[matchedId];
  if (!entry) {
    if (!loggedMissingIds.has(normalized)) {
      loggedMissingIds.add(normalized);
      console.warn(`[Icon] Missing icon entry for id: "${matchedId}"`);
    }
    return null;
  }

  if (entry.atlas === 'standalone_chroma' && entry.assetUrl) {
    return {
      id: matchedId,
      display: entry.display,
      category: entry.category,
      atlas: entry.atlas,
      atlasUrl: entry.assetUrl,
      atlasWidth: 0,
      atlasHeight: 0,
      frame: { x: 0, y: 0, w: 0, h: 0 },
      assetUrl: entry.assetUrl,
    };
  }

  if (entry.atlas === 'standalone_chroma') {
    return null;
  }

  const frame = ATLAS_FRAMES[entry.atlas]?.[matchedId];
  if (!frame) {
    if (!loggedMissingIds.has(normalized)) {
      loggedMissingIds.add(normalized);
      console.warn(`[Icon] Missing atlas frame for id: "${matchedId}"`);
    }
    return null;
  }

  const atlasDims = ATLAS_DIMENSIONS[entry.atlas];
  return {
    id: matchedId,
    display: entry.display,
    category: entry.category,
    atlas: entry.atlas,
    atlasUrl: ICON_ATLAS_URLS[entry.atlas],
    atlasWidth: atlasDims.w,
    atlasHeight: atlasDims.h,
    frame,
  };
}
