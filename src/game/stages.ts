import { StageId } from './types';

export interface StageAssetEntry {
  key: string;
  url: string;
  url2x?: string;
}

export interface StageSpritesheetAssetEntry extends StageAssetEntry {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  cols: number;
  fps: number;
}

export interface ResolvedStageAsset {
  key: string;
  url: string;
  resolutionScale: number;
}

export function resolveStageAssetVariant(
  entry: StageAssetEntry,
  isHighQuality: boolean
): ResolvedStageAsset {
  if (isHighQuality && entry.url2x) {
    return {
      key: entry.key,
      url: entry.url2x,
      resolutionScale: 0.5,
    };
  }
  return {
    key: entry.key,
    url: entry.url,
    resolutionScale: 1.0,
  };
}

export const STAGE_CARD_ARTWORKS: Record<StageId, string> = {
  stage_1: './assets/aistudio/stage1_card_a9a9ac8b.jpg',
  stage_2: './assets/aistudio/stage2_card_d26fa375.jpg',
};

// Stage 2 assets are loaded strictly per-stage (when Stage 2 starts or the Stage Select card is shown).
// No "_2x" asset variants exist in the workspace, so url2x is omitted and files are used as given.
export const STAGE_2_ASSETS = {
  floor: {
    key: 'tile_ash_floor',
    url: './assets/aistudio/tile_ash_floor_40d6629d.jpg',
  } as StageAssetEntry,
  scorchDecals: [
    { key: 'scorch_decal_01', url: './assets/aistudio/scorch_decal_01_a1b7eb24.png' },
    { key: 'scorch_decal_02', url: './assets/aistudio/scorch_decal_02_b7639a24.png' },
    { key: 'scorch_decal_03', url: './assets/aistudio/scorch_decal_03_5d8a8d7e.png' },
    { key: 'scorch_decal_04', url: './assets/aistudio/scorch_decal_04_3701d964.png' },
    { key: 'scorch_decal_05', url: './assets/aistudio/scorch_decal_05_ab96eecb.png' },
    { key: 'scorch_decal_06', url: './assets/aistudio/scorch_decal_06_ff7b1429.png' },
    { key: 'scorch_decal_07', url: './assets/aistudio/scorch_decal_07_68ee81a1.png' },
    { key: 'scorch_decal_08', url: './assets/aistudio/scorch_decal_08_ae40c061.png' },
    { key: 'scorch_decal_09', url: './assets/aistudio/scorch_decal_09_4cd45495.png' },
  ] as readonly StageAssetEntry[],
  burntTrees: [
    { key: 'tree_burnt_01', url: './assets/aistudio/tree_burnt_01_7a4f9c30.png' },
    { key: 'tree_burnt_02', url: './assets/aistudio/tree_burnt_02_928cdf89.png' },
    // Note: tree_burnt_03 was not attached by that filename; sprite_004_4a9f91b9.png is the 3rd burnt tree sprite.
    { key: 'tree_burnt_03', url: './assets/aistudio/sprite_004_4a9f91b9.png' },
  ] as readonly StageAssetEntry[],
  // Looping tree flame spritesheet (from ire_tree_loop_meta_ad7719ce.json: 256x256, 12 frames, 12 cols, 20 fps)
  fireTreeSheet: {
    key: 'fire_tree_loop_sheet',
    url: './assets/aistudio/fire_tree_loop_sheet_9dfd636a.png',
    frameWidth: 256,
    frameHeight: 256,
    frames: 12,
    cols: 12,
    fps: 20,
  } as StageSpritesheetAssetEntry,
  // Screen-space falling ash overlay spritesheet (from ash_overlay_meta_9e5adc56.json: 256x256, 12 frames, 12 cols, 20 fps)
  ashOverlaySheet: {
    key: 'ash_overlay_sheet',
    url: './assets/aistudio/ash_overlay_sheet_a6e28de5.png',
    frameWidth: 256,
    frameHeight: 256,
    frames: 12,
    cols: 12,
    fps: 20,
  } as StageSpritesheetAssetEntry,
} as const;

export interface StageBackgroundConfig {
  textureKey: string;
  baseColor: string | null;
  tileOverlayAlpha: number;
  tileScale: number;
}

export interface StageConfig {
  id: StageId;
  stageNumber: number;
  name: string;
  subtitle: string;
  cardArtwork: string;
  background: StageBackgroundConfig;
  obstacleSet: 'hollow_default' | 'ashen_wood_default';
  music: 'gameplay' | 'stage2';
  enemyHpMultiplier: number;
  enemyTint: number | null;
  unlockRequirementText?: string;
}

export const STAGES: Record<StageId, StageConfig> = {
  stage_1: {
    id: 'stage_1',
    stageNumber: 1,
    name: 'The Hollow',
    subtitle: 'Sunken flagstones where the last lantern first ignited.',
    cardArtwork: STAGE_CARD_ARTWORKS.stage_1,
    background: {
      textureKey: 'floor',
      baseColor: null,
      tileOverlayAlpha: 1,
      tileScale: 1,
    },
    obstacleSet: 'hollow_default',
    music: 'gameplay',
    enemyHpMultiplier: 1.0,
    enemyTint: null,
  },
  stage_2: {
    id: 'stage_2',
    stageNumber: 2,
    name: 'The Ashen Wood',
    subtitle: 'Charred canopy & cinder-choked soil. Enemies have +10% HP.',
    cardArtwork: STAGE_CARD_ARTWORKS.stage_2,
    background: {
      textureKey: STAGE_2_ASSETS.floor.key,
      baseColor: '#14100e',
      tileOverlayAlpha: 1,
      tileScale: 0.3125, // 2048px seamless ash tile -> 640 logical px repeat with linear filtering
    },
    obstacleSet: 'ashen_wood_default',
    music: 'stage2',
    enemyHpMultiplier: 1.1,
    enemyTint: null,
    unlockRequirementText: 'Defeat the first boss',
  },
};

export const DEFAULT_STAGE_ID: StageId = 'stage_1';

export const STAGE_IDS: StageId[] = ['stage_1', 'stage_2'];

export const STAGE_LIST: StageConfig[] = [STAGES.stage_1, STAGES.stage_2];

export function sanitizeStageId(value: unknown): StageId {
  if (value === 'stage_1' || value === 'stage_2') {
    return value;
  }
  return DEFAULT_STAGE_ID;
}

export function formatStageTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
