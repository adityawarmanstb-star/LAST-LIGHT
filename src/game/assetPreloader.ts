import { soundManager } from './audio';
import { getIconAtlasPreloadCount, preloadIconAtlases } from './iconRegistry';
import {
  UI_ASSETS,
  getChromaKeyPreloadCount,
  preloadAllChromaKeyUiAssets,
} from '../hooks/useChromaKeyImage';
import { UI_KIT_TEXTURES } from '../components/ui/uiConfig';
import { isAndroidOrMobileDevice } from './PerformanceEngine';
import {
  getPreloadedImage,
  normalizeAssetUrl,
  registerPreloadedImage,
} from './imageCache';

export { getPreloadedImage, normalizeAssetUrl, registerPreloadedImage };

const LOADBAR_TEXTURES: readonly string[] = [
  './assets/aistudio/loadbar_track_9e8a26f0.webp',
  './assets/aistudio/loadbar_fill_flow_sheet_6c87cf77.webp',
  './assets/aistudio/loadbar_tip_e613ffa4.webp',
  './assets/aistudio/loadbar_frame_762921f6.webp',
];

const ARENA_SPRITE_ASSETS: readonly string[] = [
  // Player sprites & sheets
  './assets/aistudio/player_d0a77e5b.webp',
  './assets/aistudio/player_walk_sheet_bb06b026.webp',
  './assets/aistudio/player_attack_sheet_dd4b205b.webp',
  // Enemies & boss sprites + animation sheets
  './assets/aistudio/enemy_wisp_7d3c48f3.webp',
  './assets/aistudio/enemy_imp_60271be1.webp',
  './assets/aistudio/enemy_spitter_51ce3872.webp',
  './assets/aistudio/enemy_brute_01eebbc9.webp',
  './assets/aistudio/boss_a9bb7d84.webp',
  './assets/aistudio/imp_run_sheet_6bc12170.webp',
  './assets/aistudio/spitter_walk_sheet_be385db7.webp',
  './assets/aistudio/brute_walk_sheet_1167a56d.webp',
  './assets/aistudio/boss_idle_sheet_45eee864.webp',
  './assets/aistudio/boss_attack_sheet_8e2697fa.webp',
  // Arena floor, pickups & static FX
  './assets/aistudio/floor_2087ed42.webp',
  './assets/aistudio/gem_dc28f9c8.webp',
  './assets/aistudio/coin_3bd84bab.webp',
  './assets/aistudio/fx_bolt_be8b486b.webp',
  './assets/aistudio/fx_ring_7bdbb43c.webp',
  './assets/aistudio/fx_spark_3ee901cb.webp',
  // Skill & impact FX spritesheets
  './assets/aistudio/fx_spark_sheet_cecbd959.webp',
  './assets/aistudio/fx_death_sheet_bc303348.webp',
  './assets/aistudio/fx_ring_sheet_84634a3f.webp',
  './assets/aistudio/fx_slam_sheet_61043650.webp',
  './assets/aistudio/fx_gem_sheet_a8e4a0d7.webp',
  './assets/aistudio/fx_blade_spin_sheet_46489d73.webp',
  './assets/aistudio/fx_lightning_sheet_03b57c80.webp',
  './assets/aistudio/fx_spitter_orb_sheet_2e4ec3af.webp',
  // Enemy death blood pack (animated burst, primary stain & 9-frame decal atlas)
  './assets/aistudio/blood_burst_sheet_71be5646.webp',
  './assets/aistudio/blood_burst_stain_dba05e4d.webp',
  './assets/aistudio/blood_decals_atlas_9700fcd9.webp',
];

function getStaticUiImages(): readonly string[] {
  return Array.from(
    new Set([
      UI_ASSETS.loadingSplash,
      UI_ASSETS.bgDungeon,
      UI_ASSETS.appIcon,
      ...LOADBAR_TEXTURES,
      ...UI_KIT_TEXTURES,
    ])
  );
}

const ASSET_TIMEOUT_MS = 8000;
const BOOT_PRELOAD_FAILSAFE_MS = 14000;

let bootPreloadPromise: Promise<void> | null = null;

function yieldFrame(): Promise<void> {
  if (typeof requestAnimationFrame === 'function') {
    return new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
  return new Promise<void>((r) => window.setTimeout(r, 4));
}

function preloadSingleImage(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const existing = getPreloadedImage(src);
  if (existing) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, ASSET_TIMEOUT_MS);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      registerPreloadedImage(src, img);
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {}).finally(finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = src;
  });
}

async function runImageBatch(
  urls: readonly string[],
  concurrency: number,
  onItemDone: () => void
): Promise<void> {
  const queue = [...urls];
  const worker = async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      await preloadSingleImage(url);
      onItemDone();
      await yieldFrame();
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

export function preloadAllGameAssets(
  onProgress?: (percent: number, phase: string) => void
): Promise<void> {
  if (typeof window === 'undefined') {
    onProgress?.(100, 'Lantern Lit…');
    return Promise.resolve();
  }

  if (bootPreloadPromise) {
    return bootPreloadPromise.then(() => {
      onProgress?.(100, 'Lantern Lit…');
    });
  }

  const staticUiImages = getStaticUiImages();
  const atlasItemCount = getIconAtlasPreloadCount();
  const totalUnits =
    1 + // fonts
    staticUiImages.length +
    atlasItemCount +
    getChromaKeyPreloadCount() +
    ARENA_SPRITE_ASSETS.length +
    soundManager.getPreloadAssetCount();

  let completedUnits = 0;
  let currentPhase = 'Kindling the First Flame…';

  const report = (phase?: string) => {
    if (phase) currentPhase = phase;
    const pct = Math.min(99, Math.round((completedUnits / Math.max(1, totalUnits)) * 100));
    onProgress?.(pct, currentPhase);
  };

  const markUnitDone = (nextPhase?: string) => {
    completedUnits = Math.min(totalUnits, completedUnits + 1);
    report(nextPhase);
  };

  report('Kindling the First Flame…');

  const isMobile = isAndroidOrMobileDevice();
  const uiBatchConcurrency = isMobile ? 3 : 4;
  const arenaBatchConcurrency = isMobile ? 3 : 4;

  const workPromise = (async () => {
    // 1. Fonts, Core UI Kit & Icon Atlases / Direct Icons
    const fontsTask = (document.fonts?.ready ?? Promise.resolve())
      .catch(() => {})
      .finally(() => markUnitDone());

    const staticUiTask = runImageBatch(staticUiImages, uiBatchConcurrency, () =>
      markUnitDone('Preparing Sanctuary Icons…')
    );

    const atlasTask = preloadIconAtlases(() =>
      markUnitDone('Preparing Sanctuary Icons…')
    ).catch(() => {});

    // 2. All Chroma-Keyed Lobby, Relic, Skill, Weapon & Shop Icons
    const chromaTask = preloadAllChromaKeyUiAssets(() =>
      markUnitDone('Preparing Sanctuary Icons…')
    );

    await Promise.all([fontsTask, staticUiTask, atlasTask, chromaTask]);

    // 3. All Arena, Bestiary & FX Spritesheets + All Music & SFX Buffers
    report('Forging Arsenal & Bestiary…');
    const arenaTask = runImageBatch(ARENA_SPRITE_ASSETS, arenaBatchConcurrency, () =>
      markUnitDone('Forging Arsenal & Bestiary…')
    );

    const audioTask = soundManager.preloadAll(() =>
      markUnitDone('Attuning Dark Echoes…')
    );

    await Promise.all([arenaTask, audioTask]);
  })();

  const failsafePromise = new Promise<void>((resolve) => {
    window.setTimeout(resolve, BOOT_PRELOAD_FAILSAFE_MS);
  });

  bootPreloadPromise = Promise.race([workPromise, failsafePromise]).then(() => {
    onProgress?.(100, 'Lantern Lit…');
  });

  return bootPreloadPromise;
}
