import { useEffect, useState } from 'react';

export const UI_ASSETS = {
  bgDungeon: './assets/ui/bg_dungeon.webp',
  btnPlay: './assets/ui/btn_play.webp',
  panelIronCard: './assets/ui/panel_iron_card.webp',
  navBarBg: './assets/ui/nav_bar_bg.webp',
  gameTitleLogo: './assets/ui/game_title_logo.webp',
  loadingSplash: './assets/ui/loading_splash.webp',
  appIcon: './assets/ui/app_icon.png',
  iconHome: './assets/ui/icon_home.webp',
  iconMissions: './assets/ui/icon_missions.webp',
  iconBestiary: './assets/ui/icon_bestiary.webp',
  iconShop: './assets/ui/icon_shop.webp',
  iconAchievements: './assets/ui/icon_achievements.webp',
  relicBloodChalice: './assets/aistudio/blood_chalice_3a3b81b6.webp',
  relicSunforgedLens: './assets/aistudio/sunforged_lens_de858746.webp',
  relicIronSpurs: './assets/aistudio/iron_spurs_40c52100.webp',
  relicExecutionerSeal: './assets/aistudio/executioner_seal_3f778ae0.webp',
  synergySolarIgnition: './assets/aistudio/solar_ignition_d7407a04.webp',
  synergyEyeOfTheStorm: './assets/aistudio/eye_of_the_storm_6cd23746.webp',
  weaponBolt: './assets/aistudio/bolt_71ac68d8.webp',
  weaponBlades: './assets/aistudio/blades_26a1aed0.webp',
  weaponRing: './assets/aistudio/ring_500d8c8b.webp',
  weaponSpark: './assets/aistudio/spark_f849b892.webp',
  weaponShotgun: './assets/aistudio/shotgun_578505c0.webp',
  statVitality: './assets/aistudio/stat_vitality_86a307d0.webp',
  statSpeed: './assets/aistudio/stat_speed_e88dad10.webp',
  statMight: './assets/aistudio/stat_might_b187c7b7.webp',
  statMagnet: './assets/aistudio/stat_magnet_466d6ed9.webp',
  statCooldown: './assets/aistudio/stat_cooldown_2fe51f54.webp',
  statCrit: './assets/aistudio/stat_crit_6168bb7b.webp',
  skillLightBurst: './assets/aistudio/light_burst_95f6973e.webp',
  dealBloodSeal: './assets/aistudio/blood_seal_bec54a9a.webp',
  dealAshHoard: './assets/aistudio/ash_hoard_d283c510.webp',
  dealWardenTribute: './assets/aistudio/warden_tribute_b165309f.webp',
  upgradeLantern: './assets/aistudio/lantern_6d635f24.webp',
  upgradeVitality: './assets/aistudio/vitality_0e6c8215.webp',
  diffBaby: './assets/aistudio/baby_2a82300e.png',
  diffPro: './assets/aistudio/pro_61caf01c.png',
  diffHacker: './assets/aistudio/hacker_98e53967.png',
} as const;

const resolvedDataUrlCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string>>();
let lobbyPreloadPromise: Promise<void> | null = null;

const MAX_PROCESSED_DIMENSION = 1024;

function canvasToFastUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
            resolve(URL.createObjectURL(webpBlob));
            return;
          }
          canvas.toBlob(
            (pngBlob) => {
              if (pngBlob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                resolve(URL.createObjectURL(pngBlob));
                return;
              }
              resolve(canvas.toDataURL('image/png'));
            },
            'image/png'
          );
        },
        'image/webp',
        0.95
      );
      return;
    }
    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Strips bright #00FF00 chroma-key green pixels and anti-aliased green fringe/spill
 * from an image via an offscreen HTML5 Canvas, returning a cached transparent object/data URL.
 * Preserves cyan/blue highlights (where blue channel is near green) and warm gold/crimson tones.
 */
export function processChromaKeyImage(
  src: string,
  priority: 'high' | 'low' = 'low'
): Promise<string> {
  const existing = resolvedDataUrlCache.get(src);
  if (existing) {
    return Promise.resolve(existing);
  }

  const pending = inFlightCache.get(src);
  if (pending) {
    return pending;
  }

  const job = new Promise<string>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = priority;
    }

    const processLoadedImage = async () => {
      try {
        if (typeof img.decode === 'function') {
          await img.decode().catch(() => {});
        }

        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (!rawW || !rawH) {
          resolvedDataUrlCache.set(src, src);
          resolve(src);
          return;
        }

        // Scale oversized 2K/3K source graphics down to retina-sharp 1024px cap
        // so pixel chroma-keying & encoding finish ~6-8x faster without jank.
        const maxSide = Math.max(rawW, rawH);
        const scale = maxSide > MAX_PROCESSED_DIMENSION ? MAX_PROCESSED_DIMENSION / maxSide : 1;
        const w = Math.max(1, Math.round(rawW * scale));
        const h = Math.max(1, Math.round(rawH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolvedDataUrlCache.set(src, src);
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a === 0) continue;

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const maxRB = r > b ? r : b;
          const greenExcess = g - maxRB;

          // Pure or strong #00FF00 chroma background
          if (greenExcess > 56 && g > 105) {
            data[i + 3] = 0;
            continue;
          }

          // Anti-aliased edge & green-smoke despill while preserving true cyan/aqua magic glow
          if (greenExcess > 14 && g > 44) {
            const isCyanGlow = b >= g * 0.72 && b > r + 15;
            if (isCyanGlow) {
              data[i + 1] = Math.min(g, maxRB + 6);
            } else {
              const strength = Math.min(1, (greenExcess - 14) / 36);
              const nextAlpha = Math.round(a * (1 - strength));
              data[i + 3] = nextAlpha;
              // Clamp green spill back toward neutral metallic/dark tone
              data[i + 1] = Math.min(g, maxRB + 2);
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        // Auto-trim transparent outer margins so buttons, panels, nav bar, and icons render edge-to-edge
        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;

        for (let y = 0; y < h; y++) {
          const rowOffset = y * w * 4;
          for (let x = 0; x < w; x++) {
            const alpha = data[rowOffset + x * 4 + 3];
            if (alpha > 16) {
              if (x < minX) minX = x;
              if (y < minY) minY = y;
              if (x > maxX) maxX = x;
              if (y > maxY) maxY = y;
            }
          }
        }

        let outputCanvas = canvas;
        if (maxX >= minX && maxY >= minY) {
          const cropW = maxX - minX + 1;
          const cropH = maxY - minY + 1;
          if (cropW < w || cropH < h) {
            const trimmed = document.createElement('canvas');
            trimmed.width = cropW;
            trimmed.height = cropH;
            const trimmedCtx = trimmed.getContext('2d');
            if (trimmedCtx) {
              trimmedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
              outputCanvas = trimmed;
            }
          }
        }

        const fastUrl = await canvasToFastUrl(outputCanvas);
        resolvedDataUrlCache.set(src, fastUrl);
        resolve(fastUrl);
      } catch (err) {
        reject(err);
      } finally {
        inFlightCache.delete(src);
      }
    };

    img.onload = () => {
      void processLoadedImage();
    };

    img.onerror = (err) => {
      inFlightCache.delete(src);
      reject(err);
    };

    img.src = src;
  });

  inFlightCache.set(src, job);
  return job;
}

export function getCachedChromaKeyImage(src: string): string | null {
  return resolvedDataUrlCache.get(src) ?? null;
}

/**
 * Immediately starts high-priority chroma-keying for the main title logo,
 * then sequentially warms the remaining lobby assets in the background so
 * the initial loading animation never stutters or fights for bandwidth.
 */
export function preloadCriticalLoadingLogo(): Promise<string | null> {
  return processChromaKeyImage(UI_ASSETS.gameTitleLogo, 'high').catch(() => null);
}

const SECONDARY_CHROMA_ASSETS: readonly string[] = [
  UI_ASSETS.btnPlay,
  UI_ASSETS.panelIronCard,
  UI_ASSETS.navBarBg,
  UI_ASSETS.iconHome,
  UI_ASSETS.iconMissions,
  UI_ASSETS.iconBestiary,
  UI_ASSETS.iconShop,
  UI_ASSETS.iconAchievements,
  UI_ASSETS.relicBloodChalice,
  UI_ASSETS.relicSunforgedLens,
  UI_ASSETS.relicIronSpurs,
  UI_ASSETS.relicExecutionerSeal,
  UI_ASSETS.synergySolarIgnition,
  UI_ASSETS.synergyEyeOfTheStorm,
  UI_ASSETS.weaponBolt,
  UI_ASSETS.weaponBlades,
  UI_ASSETS.weaponRing,
  UI_ASSETS.weaponSpark,
  UI_ASSETS.weaponShotgun,
  UI_ASSETS.statVitality,
  UI_ASSETS.statSpeed,
  UI_ASSETS.statMight,
  UI_ASSETS.statMagnet,
  UI_ASSETS.statCooldown,
  UI_ASSETS.statCrit,
  UI_ASSETS.skillLightBurst,
  UI_ASSETS.dealBloodSeal,
  UI_ASSETS.dealAshHoard,
  UI_ASSETS.dealWardenTribute,
  UI_ASSETS.upgradeLantern,
  UI_ASSETS.upgradeVitality,
  UI_ASSETS.diffBaby,
  UI_ASSETS.diffPro,
  UI_ASSETS.diffHacker,
];

export function getChromaKeyPreloadCount(): number {
  return 1 + SECONDARY_CHROMA_ASSETS.length;
}

export function preloadAllChromaKeyUiAssets(onItemDone?: () => void): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (lobbyPreloadPromise) {
    return lobbyPreloadPromise.then(() => {
      if (onItemDone) {
        const total = getChromaKeyPreloadCount();
        for (let i = 0; i < total; i++) onItemDone();
      }
    });
  }

  lobbyPreloadPromise = preloadCriticalLoadingLogo()
    .finally(() => {
      onItemDone?.();
    })
    .then(async () => {
      const queue = [...SECONDARY_CHROMA_ASSETS];
      const concurrency = 4;
      const runWorker = async () => {
        while (queue.length > 0) {
          const asset = queue.shift();
          if (!asset) break;
          await processChromaKeyImage(asset, 'low').catch(() => {});
          onItemDone?.();
          await new Promise<void>((r) => window.setTimeout(r, 4));
        }
      };
      await Promise.all(Array.from({ length: concurrency }, () => runWorker()));
    });

  return lobbyPreloadPromise;
}

// Kick off title logo chroma-key processing as soon as module loads
if (typeof window !== 'undefined') {
  void preloadCriticalLoadingLogo();
}

export function useChromaKeyImage(src: string): {
  processedSrc: string | null;
  isReady: boolean;
  hasError: boolean;
} {
  const [processedSrc, setProcessedSrc] = useState<string | null>(() =>
    resolvedDataUrlCache.get(src) ?? null
  );
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const cached = resolvedDataUrlCache.get(src);
    if (cached) {
      setProcessedSrc(cached);
      setHasError(false);
      return;
    }

    let cancelled = false;
    setHasError(false);

    const priority = src === UI_ASSETS.gameTitleLogo ? 'high' : 'low';
    processChromaKeyImage(src, priority)
      .then((url) => {
        if (!cancelled) {
          setProcessedSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return {
    processedSrc,
    isReady: processedSrc !== null,
    hasError,
  };
}
