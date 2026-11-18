export interface SliceInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface UiSliceSpec {
  readonly key: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly defaultSlice16: SliceInsets;
  readonly slice: SliceInsets;
  readonly edgeRepeat: 'round' | 'repeat';
  readonly defaultBorderWidth: string;
  readonly defaultContentPadding: string;
  readonly sliceMode: '9slice' | 'horizontal3';
  readonly tuned: boolean;
  readonly tuneNote: string;
}

export const DEFAULT_SLICE_RATIO = 0.16;

export function defaultSlice16(width: number, height: number): SliceInsets {
  return {
    top: Math.round(height * DEFAULT_SLICE_RATIO),
    right: Math.round(width * DEFAULT_SLICE_RATIO),
    bottom: Math.round(height * DEFAULT_SLICE_RATIO),
    left: Math.round(width * DEFAULT_SLICE_RATIO),
  };
}

/**
 * Centralized 9-slice / 3-slice configuration for the Dark-Fantasy UI kit.
 * Default slice = 16% on all sides; corners with larger rivets, spikes, or ornaments
 * are manually tuned here so ornaments never warp or tile inside edge strips.
 */
export const UI_SLICE = {
  panelIronDark: {
    key: 'panelIronDark',
    src: './assets/aistudio/sprite_003_5__147a2062.webp',
    width: 225,
    height: 228,
    defaultSlice16: defaultSlice16(225, 228),
    slice: { top: 52, right: 52, bottom: 52, left: 52 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 2.8vw, 24px)',
    defaultContentPadding: 'clamp(10px, 2vw, 16px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Corner rivets + blood drips span ~23% (52px vs 16% = 36px)',
  },
  panelIronSteel: {
    key: 'panelIronSteel',
    src: './assets/aistudio/sprite_002_5__9994a213.webp',
    width: 225,
    height: 224,
    defaultSlice16: defaultSlice16(225, 224),
    slice: { top: 52, right: 52, bottom: 52, left: 52 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 2.8vw, 24px)',
    defaultContentPadding: 'clamp(10px, 2vw, 16px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Cyan corner brackets span 52px; avoid on bright scrims due to minor rail cutout',
  },
  bannerCrimson: {
    key: 'bannerCrimson',
    src: './assets/aistudio/sprite_001_5__aa23517f.webp',
    width: 989,
    height: 342,
    defaultSlice16: defaultSlice16(989, 342),
    slice: { top: 72, right: 176, bottom: 72, left: 176 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 3vw, 26px) clamp(26px, 5vw, 44px)',
    defaultContentPadding: 'clamp(8px, 1.5vw, 14px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Side iron spikes protrude ~17.8% horizontally (176px) & 21% vertically (72px)',
  },
  plateWideIron: {
    key: 'plateWideIron',
    src: './assets/aistudio/sprite_004_5__77eaebb8.webp',
    width: 946,
    height: 165,
    defaultSlice16: defaultSlice16(946, 165),
    slice: { top: 34, right: 64, bottom: 34, left: 64 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(8px, 1.4vw, 14px) clamp(14px, 2.4vw, 22px)',
    defaultContentPadding: 'clamp(4px, 1vw, 8px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Vertical height is 165px so top/bottom bevel needs 34px (~20.6%) & 64px corner tabs',
  },
  plateWideBlood: {
    key: 'plateWideBlood',
    src: './assets/aistudio/sprite_001_3__683f57be.webp',
    width: 992,
    height: 223,
    defaultSlice16: defaultSlice16(992, 223),
    slice: { top: 38, right: 68, bottom: 38, left: 68 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(10px, 1.8vw, 16px) clamp(16px, 2.8vw, 24px)',
    defaultContentPadding: 'clamp(6px, 1.2vw, 10px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Clean wide plate w/ corner blood splatters (38px V / 68px H)',
  },
  navPlateSpiked: {
    key: 'navPlateSpiked',
    src: './assets/aistudio/sprite_005_3__1f957940.webp',
    width: 1023,
    height: 257,
    defaultSlice16: defaultSlice16(1023, 257),
    slice: { top: 44, right: 92, bottom: 44, left: 92 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(12px, 2vw, 18px) clamp(18px, 3.2vw, 28px)',
    defaultContentPadding: '0px',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Spiked side flanges occupy ~9% horizontal (92px) and 44px top/bottom bevel',
  },
  miniPlate: {
    key: 'miniPlate',
    src: './assets/aistudio/sprite_008_1__4cb3c641.webp',
    width: 310,
    height: 133,
    defaultSlice16: defaultSlice16(310, 133),
    slice: { top: 28, right: 44, bottom: 28, left: 44 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(7px, 1.2vw, 10px) clamp(10px, 1.8vw, 15px)',
    defaultContentPadding: 'clamp(2px, 0.5vw, 5px) clamp(4px, 1vw, 8px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: '133px short plate needs 28px V slice (~21%) so corner rivets remain intact',
  },
  cardOrnateCrimson: {
    key: 'cardOrnateCrimson',
    src: './assets/aistudio/sprite_003_2__46f32301.webp',
    width: 439,
    height: 482,
    defaultSlice16: defaultSlice16(439, 482),
    slice: { top: 78, right: 78, bottom: 78, left: 78 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 3vw, 24px)',
    defaultContentPadding: 'clamp(8px, 1.6vw, 14px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Ornate spiked filigree corners span 78px (~17.8%)',
  },
  cardOrnateGold: {
    key: 'cardOrnateGold',
    src: './assets/aistudio/sprite_004_2__2cc44b62.webp',
    width: 438,
    height: 482,
    defaultSlice16: defaultSlice16(438, 482),
    slice: { top: 78, right: 78, bottom: 78, left: 78 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 3vw, 24px)',
    defaultContentPadding: 'clamp(8px, 1.6vw, 14px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Ornate gold filigree corners span 78px (~17.8%)',
  },
  cardOrnateCyan: {
    key: 'cardOrnateCyan',
    src: './assets/aistudio/sprite_002_2__4c0bdcec.webp',
    width: 436,
    height: 487,
    defaultSlice16: defaultSlice16(436, 487),
    slice: { top: 78, right: 78, bottom: 78, left: 78 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(16px, 3vw, 24px)',
    defaultContentPadding: 'clamp(8px, 1.6vw, 14px)',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: 'Cyan rune corners span 78px (~17.9%)',
  },
  barFrame: {
    key: 'barFrame',
    src: './assets/aistudio/sprite_003_3__02cae687.webp',
    width: 992,
    height: 115,
    defaultSlice16: defaultSlice16(992, 115),
    slice: { top: 28, right: 72, bottom: 28, left: 72 },
    edgeRepeat: 'round',
    defaultBorderWidth: 'clamp(4px, 0.8vw, 7px) clamp(10px, 1.8vw, 16px)',
    defaultContentPadding: '0px',
    sliceMode: '9slice',
    tuned: true,
    tuneNote: '115px height frame requires 28px V slice (~24.3%) to clear riveted frame rail cleanly',
  },
  btnWideNormal: {
    key: 'btnWideNormal',
    src: './assets/aistudio/sprite_006_4__dbd5f00a.webp',
    width: 648,
    height: 279,
    defaultSlice16: defaultSlice16(648, 279),
    slice: { top: 0, right: 98, bottom: 0, left: 98 },
    edgeRepeat: 'round',
    defaultBorderWidth: '0px clamp(14px, 3vw, 22px)',
    defaultContentPadding: 'clamp(6px, 1vw, 10px) clamp(12px, 2.5vw, 20px)',
    sliceMode: 'horizontal3',
    tuned: true,
    tuneNote: 'Horizontal 3-slice (0 98 0 98 fill) keeps riveted iron caps unstretched at any width',
  },
  btnWidePressed: {
    key: 'btnWidePressed',
    src: './assets/aistudio/sprite_004_4__198f58cd.webp',
    width: 648,
    height: 279,
    defaultSlice16: defaultSlice16(648, 279),
    slice: { top: 0, right: 98, bottom: 0, left: 98 },
    edgeRepeat: 'round',
    defaultBorderWidth: '0px clamp(14px, 3vw, 22px)',
    defaultContentPadding: 'clamp(6px, 1vw, 10px) clamp(12px, 2.5vw, 20px)',
    sliceMode: 'horizontal3',
    tuned: true,
    tuneNote: 'Crimson pressed wide button matching normal 648x279 geometry',
  },
  btnWideCyan: {
    key: 'btnWideCyan',
    src: './assets/aistudio/sprite_002_4__0d218f96.webp',
    width: 648,
    height: 279,
    defaultSlice16: defaultSlice16(648, 279),
    slice: { top: 0, right: 98, bottom: 0, left: 98 },
    edgeRepeat: 'round',
    defaultBorderWidth: '0px clamp(14px, 3vw, 22px)',
    defaultContentPadding: 'clamp(6px, 1vw, 10px) clamp(12px, 2.5vw, 20px)',
    sliceMode: 'horizontal3',
    tuned: true,
    tuneNote: 'Cyan alternate plate matching normal 648x279 geometry',
  },
} as const satisfies Record<string, UiSliceSpec>;

export type UiSliceKey = keyof typeof UI_SLICE;

/**
 * Fixed-aspect sprite references (must ALWAYS render with natural aspectRatio + object-fit: contain).
 */
export const UI_SPRITES = {
  // Fixed-aspect circular buttons & rings
  roundSteel: './assets/aistudio/sprite_005_4__f4c4e4d0.webp',
  roundCrimson: './assets/aistudio/sprite_003_4__113fabeb.webp',
  roundCyan: './assets/aistudio/sprite_001_4__83985690.webp',
  roundRuneLevel: './assets/aistudio/sprite_004_1__19c6aa36.webp',
  roundSkullBadge: './assets/aistudio/sprite_002_1__9b9193c1.webp',
  roundSquareSocket: './assets/aistudio/sprite_001_1__20e94fd9.webp',

  // Knobs, dots & checkmarks
  knobCrimsonOrb: './assets/aistudio/sprite_009_1__23f1f4d1.webp',
  knobSteelDome: './assets/aistudio/sprite_003_1__192af43f.webp',
  checkboxEmpty: './assets/aistudio/sprite_007_38b11ef9.webp',
  checkboxChecked: './assets/aistudio/sprite_008_abd65486.webp',

  // Toggle track pills (clean unlabelled)
  toggleTrackSteel: './assets/aistudio/sprite_006_1__a756d8b5.webp',
  toggleTrackCrimson: './assets/aistudio/sprite_005_1__9ccd8d80.webp',

  // Bar fills & groove backing (used with clip-path inset, NEVER width-scaled)
  barBackingTrack: './assets/aistudio/sprite_006_3__8f8fb9e3.webp',
  barFillCrimson: './assets/aistudio/sprite_002_3__bcc5b45d.webp',
  barFillCyan: './assets/aistudio/sprite_004_3__61554c54.webp',

  // Dividers & scrollbar
  chainDivider: './assets/aistudio/sprite_005_5__c967abb7.webp',
  scrollThumbTall: './assets/aistudio/sprite_009_c87f72c5.webp',

  // Tiled background textures (2 seamless textures)
  tileStone: './assets/ui/settings/panel_stone.webp',
  tileRow: './assets/ui/settings/row_bg.webp',

  // Settings fine control pieces
  closeDefault: './assets/ui/settings/close_default.webp',
  closeHover: './assets/ui/settings/close_hover.webp',
  closePressed: './assets/ui/settings/close_pressed.webp',
  sliderTrackLeft: './assets/ui/settings/slider_track_left.webp',
  sliderTrackMid: './assets/ui/settings/slider_track_mid.webp',
  sliderTrackRight: './assets/ui/settings/slider_track_right.webp',
  sliderKnobDefault: './assets/ui/settings/slider_knob_default.webp',
  sliderKnobActive: './assets/ui/settings/slider_knob_active.webp',
  scrollTrack: './assets/ui/settings/scroll_track.webp',
  scrollThumbTop: './assets/ui/settings/scroll_thumb_top.webp',
  scrollThumbMid: './assets/ui/settings/scroll_thumb_mid.webp',
  scrollThumbBottom: './assets/ui/settings/scroll_thumb_bottom.webp',
  scrollArrowUp: './assets/ui/settings/scroll_arrow_up.webp',
  scrollArrowDown: './assets/ui/settings/scroll_arrow_down.webp',
  iconMusicRed: './assets/ui/settings/icon_music_red.webp',
  iconSfxGold: './assets/ui/settings/icon_sfx_gold.webp',
  iconMuteWave: './assets/ui/settings/icon_mute_wave.webp',
  iconGorePower: './assets/ui/settings/icon_gore_power.webp',
  headerSpeakerBox: './assets/ui/settings/header_speaker_box.webp',
} as const;

/**
 * Deduplicated list of every UI sprite & tile texture so assetPreloader preloads all of them once.
 */
export const UI_KIT_TEXTURES: readonly string[] = Array.from(
  new Set([
    ...Object.values(UI_SLICE).map((spec) => spec.src),
    ...Object.values(UI_SPRITES),
  ])
);
