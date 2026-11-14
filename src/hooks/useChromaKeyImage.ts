import { useEffect, useState } from 'react';

export const UI_ASSETS = {
  bgDungeon: './assets/ui/bg_dungeon.png',
  btnPlay: './assets/ui/btn_play.png',
  panelIronCard: './assets/ui/panel_iron_card.png',
  navBarBg: './assets/ui/nav_bar_bg.png',
  iconShop: './assets/ui/icon_shop.png',
  iconMissions: './assets/ui/icon_missions.png',
  iconHome: './assets/ui/icon_home.png',
  iconBestiary: './assets/ui/icon_bestiary.png',
  iconAchievements: './assets/ui/icon_achievements.png',
} as const;

const resolvedDataUrlCache = new Map<string, string>();
const inFlightCache = new Map<string, Promise<string>>();

/**
 * Strips bright #00FF00 chroma-key green pixels and anti-aliased green fringe/spill
 * from an image via an offscreen HTML5 Canvas, returning a cached transparent PNG data URL.
 * Preserves cyan/blue highlights (where blue channel is near green) and warm gold/crimson tones.
 */
export function processChromaKeyImage(src: string): Promise<string> {
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

    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolvedDataUrlCache.set(src, src);
          resolve(src);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolvedDataUrlCache.set(src, src);
          resolve(src);
          return;
        }

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

          // Anti-aliased edge despill where green channel clearly dominates R and B
          if (greenExcess > 14 && g > 44) {
            const strength = Math.min(1, (greenExcess - 14) / 42);
            const nextAlpha = Math.round(a * (1 - strength * 0.88));
            data[i + 3] = nextAlpha;
            // Clamp green spill back toward neutral metallic/dark tone
            data[i + 1] = Math.min(g, maxRB + 6);
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

        const dataUrl = outputCanvas.toDataURL('image/png');
        resolvedDataUrlCache.set(src, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        inFlightCache.delete(src);
      }
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

export function preloadAllChromaKeyUiAssets(): void {
  const chromaSources = [
    UI_ASSETS.btnPlay,
    UI_ASSETS.panelIronCard,
    UI_ASSETS.navBarBg,
    UI_ASSETS.iconShop,
    UI_ASSETS.iconMissions,
    UI_ASSETS.iconHome,
    UI_ASSETS.iconBestiary,
    UI_ASSETS.iconAchievements,
  ];
  chromaSources.forEach((asset) => {
    processChromaKeyImage(asset).catch(() => {
      // Fallback handled gracefully per-component
    });
  });
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

    processChromaKeyImage(src)
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
