const preloadedImageCache = new Map<string, HTMLImageElement>();

export function normalizeAssetUrl(src: string): string {
  if (!src) return '';
  let clean = src.trim();
  const qIdx = clean.indexOf('?');
  if (qIdx >= 0) clean = clean.slice(0, qIdx);
  if (
    typeof window !== 'undefined' &&
    (clean.startsWith('http://') || clean.startsWith('https://'))
  ) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      // Keep original string if URL parsing fails
    }
  }
  return clean.replace(/^\.\//, '').replace(/^\/+/, '');
}

export function getPreloadedImage(src: string): HTMLImageElement | null {
  const key = normalizeAssetUrl(src);
  if (!key) return null;
  const cached = preloadedImageCache.get(key);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return cached;
  }
  return null;
}

export function registerPreloadedImage(src: string, img: HTMLImageElement): void {
  const key = normalizeAssetUrl(src);
  if (!key || !img) return;
  preloadedImageCache.set(key, img);
}
