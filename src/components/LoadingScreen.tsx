import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  UI_ASSETS,
  preloadCriticalLoadingLogo,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';

interface LoadingScreenProps {
  visible: boolean;
  progress: number; // 0..100
  phase: string;
  mode: 'boot' | 'arena';
  onTransitionEnd?: () => void;
}

const SURVIVAL_TIPS = [
  'Stand still to unleash automatic arcane fire and widen your lantern aura.',
  'Lure enemies near blazing world torches to shatter the dark with real-time shadows.',
  'Collect XP gems quickly before they fade into the Ashfen.',
  'Pair matching Relics before entering the arena to unlock set synergies.',
  'Use Dash with invulnerability frames to slip out of encirclements.',
];

// Exact asset paths & loadbar_meta geometry (measured from 488x115 frame & 386x57 track/fill)
const LOADBAR_TRACK_SRC = './assets/aistudio/loadbar_track_9e8a26f0.webp';
const LOADBAR_FILL_SHEET_SRC = './assets/aistudio/loadbar_fill_flow_sheet_6c87cf77.webp';
const LOADBAR_TIP_SRC = './assets/aistudio/loadbar_tip_e613ffa4.webp';
const LOADBAR_FRAME_SRC = './assets/aistudio/loadbar_frame_762921f6.webp';

const FRAME_W = 488;
const FRAME_H = 115;
const SLOT_X = 63;
const SLOT_Y = 29;
const SLOT_W = 386;
const SLOT_H = 57;

const FILL_FRAME_W = 386;
const FILL_FRAME_H = 57;
const FILL_TOTAL_FRAMES = 32;
const FILL_COLS = 8;
const FILL_FPS = 20;

// Canvas padding around the 488x115 bar so heat pulse, tip glow & rising embers never clip
const PAD_X = 36;
const PAD_TOP = 54;
const PAD_BOTTOM = 26;
const CANVAS_W = FRAME_W + PAD_X * 2; // 560
const CANVAS_H = FRAME_H + PAD_TOP + PAD_BOTTOM; // 195
const BAR_CENTER_X = PAD_X + FRAME_W * 0.5;
const BAR_CENTER_Y = PAD_TOP + FRAME_H * 0.5;

// 4-second smooth loading lifecycle (3.5s smooth fill + 0.1s completion flash + 0.4s fade-out = 4.0s)
const FADE_IN_MS = 260;
const MIN_DISPLAY_TIME_MS = 3500;
const FLASH_HOLD_MS = 100;
const FADE_OUT_MS = 400; // 0.4s
const EMBER_LIFE_MS = 400; // 400ms
const EMBER_POOL_SIZE = 160;
const VISUAL_PRELOAD_FAILSAFE_MS = 650;

interface EmberParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  size: number;
  peakAlpha: number;
}

interface LoadedBarAssets {
  track: HTMLImageElement;
  fill: HTMLImageElement;
  tip: HTMLImageElement;
  frame: HTMLCanvasElement | HTMLImageElement;
  emberSprite: HTMLCanvasElement;
}

let cachedAssetsPromise: Promise<LoadedBarAssets> | null = null;
let cachedAssetsReady: LoadedBarAssets | null = null;
let cachedSplashPromise: Promise<boolean> | null = null;
let cachedSplashReady = false;

function loadImage(src: string, highPriority = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    if (highPriority && 'fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = 'high';
    }
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {}).finally(() => resolve(img));
      } else {
        resolve(img);
      }
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function ensureSplashReady(): Promise<boolean> {
  if (cachedSplashReady) return Promise.resolve(true);
  if (cachedSplashPromise) return cachedSplashPromise;
  if (typeof window === 'undefined') return Promise.resolve(true);

  cachedSplashPromise = loadImage(UI_ASSETS.loadingSplash, true)
    .then(() => {
      cachedSplashReady = true;
      return true;
    })
    .catch(() => {
      cachedSplashReady = true;
      return false;
    });

  return cachedSplashPromise;
}

function createDespilledFrame(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  if (typeof document === 'undefined') return img;
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0, FRAME_W, FRAME_H);
  try {
    const imageData = ctx.getImageData(0, 0, FRAME_W, FRAME_H);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const maxRB = r > b ? r : b;
      const greenExcess = g - maxRB;

      if (greenExcess > 56 && g > 105) {
        data[i + 3] = 0;
        continue;
      }
      if (greenExcess > 14 && g > 44) {
        const strength = Math.min(1, (greenExcess - 14) / 42);
        data[i + 3] = Math.round(a * (1 - strength * 0.88));
        data[i + 1] = Math.min(g, maxRB + 4);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } catch {
    // Fallback if canvas pixel readback is restricted
  }
  return canvas;
}

function createEmberSprite(): HTMLCanvasElement {
  const size = 24;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const half = size * 0.5;
    const grad = ctx.createRadialGradient(half, half, 0.5, half, half, half);
    grad.addColorStop(0, 'rgba(255, 248, 220, 1)');
    grad.addColorStop(0.28, 'rgba(255, 180, 68, 0.95)');
    grad.addColorStop(0.62, 'rgba(255, 102, 18, 0.55)');
    grad.addColorStop(1, 'rgba(255, 64, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

function ensureLoadBarAssets(): Promise<LoadedBarAssets> {
  if (cachedAssetsReady) return Promise.resolve(cachedAssetsReady);
  if (cachedAssetsPromise) return cachedAssetsPromise;

  cachedAssetsPromise = Promise.all([
    loadImage(LOADBAR_TRACK_SRC, true),
    loadImage(LOADBAR_FILL_SHEET_SRC, true),
    loadImage(LOADBAR_TIP_SRC, true),
    loadImage(LOADBAR_FRAME_SRC, true),
  ]).then(([track, fill, tip, rawFrame]) => {
    const bundle: LoadedBarAssets = {
      track,
      fill,
      tip,
      frame: createDespilledFrame(rawFrame),
      emberSprite: createEmberSprite(),
    };
    cachedAssetsReady = bundle;
    return bundle;
  });

  return cachedAssetsPromise;
}

// Kick off all critical loading screen visuals immediately when module loads
if (typeof window !== 'undefined') {
  void preloadCriticalLoadingLogo();
  ensureSplashReady().catch(() => {});
  ensureLoadBarAssets().catch(() => {});
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible,
  progress,
  phase,
  mode,
  onTransitionEnd,
}) => {
  const [rendered, setRendered] = useState(visible);
  const [pctRounded, setPctRounded] = useState(0);
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * SURVIVAL_TIPS.length)
  );
  const [splashReady, setSplashReady] = useState(() => cachedSplashReady);
  const [barAssetsReady, setBarAssetsReady] = useState(() => cachedAssetsReady !== null);
  const [preloadFailsafeElapsed, setPreloadFailsafeElapsed] = useState(false);

  const { processedSrc: titleLogoSrc, hasError: titleLogoError } = useChromaKeyImage(
    UI_ASSETS.gameTitleLogo
  );

  // Do not reveal the loading logo/bar until splash, title logo, and forged bar are ALL decoded
  // so every element fades in together cleanly with zero late logo pop-in.
  const visualsReady =
    (splashReady && barAssetsReady && (titleLogoSrc !== null || titleLogoError)) ||
    (preloadFailsafeElapsed && (titleLogoSrc !== null || titleLogoError || barAssetsReady));

  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleRef = useRef(visible);
  const progressRef = useRef(progress);
  const modeRef = useRef(mode);
  const visualsReadyRef = useRef(visualsReady);
  const onTransitionEndRef = useRef(onTransitionEnd);
  const lastPctRef = useRef(-1);
  const sessionIdRef = useRef(0);
  const prevVisibleRef = useRef(visible);

  visibleRef.current = visible;
  progressRef.current = progress;
  modeRef.current = mode;
  visualsReadyRef.current = visualsReady;
  onTransitionEndRef.current = onTransitionEnd;

  useEffect(() => {
    if (!splashReady) {
      ensureSplashReady()
        .then(() => setSplashReady(true))
        .catch(() => setSplashReady(true));
    }
    if (!barAssetsReady) {
      ensureLoadBarAssets()
        .then(() => setBarAssetsReady(true))
        .catch(() => setBarAssetsReady(true));
    }
    const timer = window.setTimeout(() => {
      setPreloadFailsafeElapsed(true);
    }, VISUAL_PRELOAD_FAILSAFE_MS);

    return () => window.clearTimeout(timer);
  }, [splashReady, barAssetsReady]);

  // In boot mode, root MUST stay opaque (1) from frame 0 so Beranda never flashes underneath.
  // Only arena-entry transitions fade the overlay in from 0 -> 1.
  useLayoutEffect(() => {
    if (rendered && rootRef.current && lastPctRef.current <= 0) {
      rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : '0';
    }
    if (rendered && contentRef.current && lastPctRef.current <= 0) {
      contentRef.current.style.opacity = visualsReadyRef.current ? '1' : '0';
    }
  }, [rendered]);

  // Detect new loading session start
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      sessionIdRef.current += 1;
      lastPctRef.current = -1;
      setPctRounded(0);
      setRendered(true);
      if (rootRef.current) {
        rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : '0';
      }
      if (contentRef.current) {
        contentRef.current.style.opacity = visualsReadyRef.current ? '1' : '0';
      }
    } else if (visible && !rendered) {
      sessionIdRef.current += 1;
      lastPctRef.current = -1;
      setPctRounded(0);
      setRendered(true);
    }
    prevVisibleRef.current = visible;
  }, [visible, rendered]);

  // Rotate atmospheric tip slowly while rendered
  useEffect(() => {
    if (!rendered) return;
    const interval = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SURVIVAL_TIPS.length);
    }, 3600);
    return () => window.clearInterval(interval);
  }, [rendered]);

  // 60 FPS Canvas Animation, Progress Tweening, Pooled Embers & 4s Lifecycle
  useEffect(() => {
    if (!rendered) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let cancelled = false;
    let assets: LoadedBarAssets | null = cachedAssetsReady;
    if (!assets) {
      ensureLoadBarAssets()
        .then((loaded) => {
          if (!cancelled) assets = loaded;
        })
        .catch(() => {});
    }

    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
    canvas.width = Math.round(CANVAS_W * dpr);
    canvas.height = Math.round(CANVAS_H * dpr);

    // Pre-allocate fixed ember particle pool (zero GC during 60 fps loop)
    const pool: EmberParticle[] = new Array(EMBER_POOL_SIZE);
    for (let i = 0; i < EMBER_POOL_SIZE; i++) {
      pool[i] = {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ageMs: 0,
        lifeMs: EMBER_LIFE_MS,
        size: 8,
        peakAlpha: 0.9,
      };
    }
    let poolCursor = 0;

    const spawnEmber = (x: number, y: number, isBurst: boolean) => {
      for (let probe = 0; probe < EMBER_POOL_SIZE; probe++) {
        const idx = (poolCursor + probe) % EMBER_POOL_SIZE;
        const p = pool[idx];
        if (!p.active || probe === EMBER_POOL_SIZE - 1) {
          poolCursor = (idx + 1) % EMBER_POOL_SIZE;
          p.active = true;
          p.x = x + (Math.random() - 0.5) * (isBurst ? 10 : 5);
          p.y = y + (Math.random() - 0.5) * (isBurst ? SLOT_H * 0.65 : SLOT_H * 0.62);
          if (isBurst) {
            p.vx = 18 + Math.random() * 88;
            p.vy = -(48 + Math.random() * 125);
            p.size = 7 + Math.random() * 9;
            p.peakAlpha = 0.88 + Math.random() * 0.12;
          } else {
            p.vx = 14 + Math.random() * 28; // drifting slightly right
            p.vy = -(46 + Math.random() * 58); // drifting up
            p.size = 5 + Math.random() * 6;
            p.peakAlpha = 0.72 + Math.random() * 0.28;
          }
          p.ageMs = 0;
          p.lifeMs = EMBER_LIFE_MS;
          return;
        }
      }
    };

    let activeSessionId = sessionIdRef.current;
    let clockStartedAtMs: number | null = visualsReadyRef.current ? performance.now() : null;
    let displayProgress = 0;
    let completionState: 'loading' | 'flashing' | 'fading' | 'done' = 'loading';
    let completionAtMs = 0;
    let fadeStartMs = 0;
    let flashIntensity = 0;
    let spawnFrameAccum = 0;
    let lastNowMs = performance.now();
    let rafId = 0;

    if (rootRef.current) {
      rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : '0';
    }
    if (contentRef.current) {
      contentRef.current.style.opacity = visualsReadyRef.current ? '1' : '0';
    }

    const tick = (nowMs: number) => {
      if (cancelled) return;

      const dtMs = Math.min(50, Math.max(0.5, nowMs - lastNowMs));
      const dtSec = dtMs / 1000;
      lastNowMs = nowMs;

      if (sessionIdRef.current !== activeSessionId) {
        activeSessionId = sessionIdRef.current;
        clockStartedAtMs = visualsReadyRef.current ? nowMs : null;
        displayProgress = 0;
        completionState = 'loading';
        flashIntensity = 0;
        spawnFrameAccum = 0;
        for (let i = 0; i < EMBER_POOL_SIZE; i++) {
          pool[i].active = false;
        }
        if (rootRef.current) {
          rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : '0';
        }
        if (contentRef.current) {
          contentRef.current.style.opacity = visualsReadyRef.current ? '1' : '0';
        }
      }

      // Hold the 4-second clock & foreground logo/bar until splash, logo, and bar are decoded
      // In boot mode keep the outer backdrop opaque (opacity 1) so Beranda can never appear first
      if (!visualsReadyRef.current) {
        if (rootRef.current) {
          rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : '0';
        }
        if (contentRef.current) {
          contentRef.current.style.opacity = '0';
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (clockStartedAtMs === null) {
        clockStartedAtMs = nowMs;
      }

      const elapsedMs = Math.max(0, nowMs - clockStartedAtMs);
      const elapsedSec = elapsedMs / 1000;
      const realProgress = Math.max(0, Math.min(1, progressRef.current / 100));
      const loaderFinished = !visibleRef.current || realProgress >= 0.999;

      // Reset completion state if parent re-triggered visible=true before fade finished
      if (visibleRef.current && realProgress < 0.95 && completionState !== 'loading') {
        completionState = 'loading';
        clockStartedAtMs = nowMs;
        displayProgress = 0;
        flashIntensity = 0;
      }

      // Smooth fade-in across the first 260ms once all visuals are decoded
      if (completionState !== 'fading') {
        const fadeInAlpha = Math.min(1, elapsedMs / FADE_IN_MS);
        if (rootRef.current) {
          rootRef.current.style.opacity = modeRef.current === 'boot' ? '1' : String(fadeInAlpha);
        }
        if (contentRef.current) {
          contentRef.current.style.opacity = String(fadeInAlpha);
        }
      }

      // 1. Smoothly tween displayed progress toward real loader progress across 3.5s (+0.5s flash/fade = 4.0s)
      if (completionState === 'loading') {
        let visualTarget: number;
        if (elapsedMs < MIN_DISPLAY_TIME_MS) {
          const t = Math.max(0, Math.min(1, elapsedMs / MIN_DISPLAY_TIME_MS));
          // Gentle, continuous curve with zero sudden jumps or end-stall
          const smoothCurve = 0.4 * t + 0.6 * (1 - Math.pow(1 - t, 1.45));
          const minWindowPace = Math.max(0.03, smoothCurve * 0.985);
          visualTarget = Math.min(realProgress, minWindowPace);
        } else {
          visualTarget = loaderFinished ? 1.0 : realProgress;
        }

        const tweenAlpha = 1 - Math.exp(-7.5 * dtSec);
        displayProgress += (visualTarget - displayProgress) * tweenAlpha;
        if (loaderFinished && elapsedMs >= MIN_DISPLAY_TIME_MS) {
          displayProgress = Math.min(1, displayProgress + 0.25 * dtSec);
        }

        if (elapsedMs >= MIN_DISPLAY_TIME_MS && loaderFinished && displayProgress >= 0.992) {
          displayProgress = 1.0;
          completionState = 'flashing';
          completionAtMs = nowMs;
          flashIntensity = 1.0;
          for (let b = 0; b < 20; b++) {
            spawnEmber(SLOT_X + SLOT_W, SLOT_Y + SLOT_H * 0.5, true);
          }
        }
      } else if (completionState === 'flashing') {
        displayProgress = 1.0;
        flashIntensity = Math.max(0, 1 - (nowMs - completionAtMs) / 260);
        if (nowMs - completionAtMs >= FLASH_HOLD_MS) {
          completionState = 'fading';
          fadeStartMs = nowMs;
        }
      } else if (completionState === 'fading') {
        displayProgress = 1.0;
        flashIntensity = Math.max(0, 1 - (nowMs - completionAtMs) / 260);
        const fadeT = Math.min(1, (nowMs - fadeStartMs) / FADE_OUT_MS);
        if (rootRef.current) {
          rootRef.current.style.opacity = String(1 - fadeT);
        }
        if (fadeT >= 1) {
          completionState = 'done';
          setRendered(false);
          onTransitionEndRef.current?.();
          return;
        }
      }

      const clampedProgress = Math.max(0, Math.min(1, displayProgress));
      const nextPct = Math.round(clampedProgress * 100);
      if (nextPct !== lastPctRef.current) {
        lastPctRef.current = nextPct;
        setPctRounded(nextPct);
      }

      // 2. Spawn 2-3 orange ember particles per 60fps frame at leading edge
      const leadingX = SLOT_X + clampedProgress * SLOT_W;
      const leadingY = SLOT_Y + SLOT_H * 0.5;
      if (completionState === 'loading' && clampedProgress > 0.015) {
        spawnFrameAccum += dtMs / 16.6667;
        const framesElapsed = Math.min(3, Math.floor(spawnFrameAccum));
        if (framesElapsed > 0) {
          spawnFrameAccum -= framesElapsed;
          for (let f = 0; f < framesElapsed; f++) {
            const countThisFrame = 2 + (Math.random() < 0.5 ? 1 : 0); // 2-3 per frame
            for (let e = 0; e < countThisFrame; e++) {
              spawnEmber(leadingX, leadingY, false);
            }
          }
        }
      }

      // 3. Advance pooled ember particles
      for (let i = 0; i < EMBER_POOL_SIZE; i++) {
        const p = pool[i];
        if (!p.active) continue;
        p.ageMs += dtMs;
        if (p.ageMs >= p.lifeMs) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy -= 22 * dtSec; // gentle upward heat buoyancy
        p.vx *= 1 - 0.8 * dtSec;
      }

      // 4. Render Loading Bar Layers (60 FPS)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Subtle heat pulse on the whole bar: scale 1.0 - 1.015 at 1.5 Hz
      const heatPulse = 1.0 + 0.0075 * (1 + Math.sin(elapsedSec * Math.PI * 2 * 1.5));

      ctx.save();
      ctx.translate(BAR_CENTER_X, BAR_CENTER_Y);
      ctx.scale(heatPulse, heatPulse);
      ctx.translate(-FRAME_W * 0.5, -FRAME_H * 0.5);

      if (assets) {
        // Layer 1 (Bottom): loadbar_track at (slot_x, slot_y)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(assets.track, SLOT_X, SLOT_Y, SLOT_W, SLOT_H);

        // Layer 2: ANIMATED fill (frame 386x57, 32 frames, 8 columns, 20 fps, loop)
        // at (slot_x, slot_y) with display WIDTH = progress * slot_w (stretch)
        const fillDisplayW = clampedProgress * SLOT_W;
        if (fillDisplayW > 0.5) {
          const frameIdx = Math.floor(elapsedSec * FILL_FPS) % FILL_TOTAL_FRAMES;
          const col = frameIdx % FILL_COLS;
          const row = Math.floor(frameIdx / FILL_COLS);
          ctx.drawImage(
            assets.fill,
            col * FILL_FRAME_W,
            row * FILL_FRAME_H,
            FILL_FRAME_W,
            FILL_FRAME_H,
            SLOT_X,
            SLOT_Y,
            fillDisplayW,
            SLOT_H
          );
        }

        // Layer 3: loadbar_tip.webp with ADD blend centered on leading edge with flicker
        // (alpha 0.8-1.0, scale 0.95-1.1 at ~8 Hz)
        if (clampedProgress > 0.01) {
          const flickerWave = Math.sin(elapsedSec * Math.PI * 2 * 8.0);
          const harmonicWave = Math.cos(elapsedSec * Math.PI * 2 * 13.3);
          const tipAlpha = Math.max(
            0.8,
            Math.min(1.0, 0.9 + 0.1 * flickerWave * (0.75 + 0.25 * harmonicWave))
          );
          const tipScale = 1.025 + 0.075 * Math.sin(elapsedSec * Math.PI * 2 * 8.1 + 0.8);
          const tipSize = 72 * tipScale;
          const edgeFadeIn = Math.min(1, clampedProgress / 0.04);

          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = tipAlpha * edgeFadeIn;
          ctx.drawImage(
            assets.tip,
            leadingX - tipSize * 0.5,
            leadingY - tipSize * 0.5,
            tipSize,
            tipSize
          );
        }

        // Layer 4 (Top): loadbar_frame at (0, 0)
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.drawImage(assets.frame, 0, 0, FRAME_W, FRAME_H);

        // Quick bright flash on 100% completion (ADD blend)
        if (flashIntensity > 0.005) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = flashIntensity * 0.85;
          const flashGrad = ctx.createLinearGradient(SLOT_X, SLOT_Y, SLOT_X + SLOT_W, SLOT_Y);
          flashGrad.addColorStop(0, 'rgba(93, 228, 255, 0.25)');
          flashGrad.addColorStop(0.55, 'rgba(255, 200, 110, 0.72)');
          flashGrad.addColorStop(1, 'rgba(255, 248, 225, 1)');
          ctx.fillStyle = flashGrad;
          ctx.fillRect(SLOT_X, SLOT_Y + 6, SLOT_W, SLOT_H - 12);

          const burstSize = 150 * (1 + (1 - flashIntensity) * 0.45);
          ctx.globalAlpha = flashIntensity;
          ctx.drawImage(
            assets.tip,
            SLOT_X + SLOT_W - burstSize * 0.5,
            leadingY - burstSize * 0.5,
            burstSize,
            burstSize
          );
        }

        // Pooled orange ember particles (ADD blend)
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < EMBER_POOL_SIZE; i++) {
          const p = pool[i];
          if (!p.active) continue;
          const lifeRatio = 1 - p.ageMs / p.lifeMs;
          const drawSize = p.size * (0.45 + 0.55 * lifeRatio);
          ctx.globalAlpha = p.peakAlpha * lifeRatio * lifeRatio;
          ctx.drawImage(
            assets.emberSprite,
            p.x - drawSize * 0.5,
            p.y - drawSize * 0.5,
            drawSize,
            drawSize
          );
        }
      }

      ctx.restore();

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [rendered]);

  if (!rendered) return null;

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label={`Loading ${pctRounded}%`}
      className="fixed inset-0 h-[100dvh] z-[100] flex flex-col justify-between items-center select-none bg-[#06070a] overflow-hidden pointer-events-auto"
      style={{
        backgroundImage: `url(${UI_ASSETS.loadingSplash})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        willChange: 'opacity',
      }}
    >
      {/* Subtle lower-half vignette scrim so upper Dark Warden artwork remains unobstructed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,7,10,0.08) 0%, rgba(6,7,10,0) 38%, rgba(5,6,9,0.72) 58%, rgba(4,5,8,0.95) 82%, rgba(4,5,8,0.98) 100%)',
        }}
      />

      {/* Upper Spacer: keeps Dark Warden character illustration completely unobstructed */}
      <div className="relative z-10 flex-1 min-h-[36dvh] w-full pointer-events-none" aria-hidden="true" />

      {/* Lower-Middle Logo, Subtitle & Animated Forged Runic Progress Bar */}
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-[460px] px-4 flex flex-col items-center text-center"
        style={{ willChange: 'opacity' }}
      >
        {titleLogoSrc && !titleLogoError ? (
          <img
            src={titleLogoSrc}
            alt="LAST LIGHT"
            referrerPolicy="no-referrer"
            className="w-[80%] max-w-[310px] h-auto object-contain select-none"
            style={{
              filter:
                'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.98)) drop-shadow(0 0 14px rgba(242, 169, 59, 0.36)) drop-shadow(0 0 18px rgba(179, 18, 26, 0.45))',
            }}
          />
        ) : (
          <h1
            className="font-display font-black tracking-[0.16em] text-3xl sm:text-4xl leading-none uppercase"
            style={{
              backgroundImage:
                'linear-gradient(180deg, #fff1c7 0%, #e6aa45 50%, #9b5d14 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter:
                'drop-shadow(0 3px 0 #170805) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.96))',
            }}
          >
            LAST LIGHT
          </h1>
        )}

        <p
          className="mt-1.5 mb-2 font-display font-extrabold text-[11px] tracking-[0.28em] uppercase"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #f59a9e 0%, #d4202a 55%, #73080e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.98))',
          }}
        >
          ENTERING THE ASHFEN
        </p>

        {/* Animated Runic Loading Bar Canvas + Phase/Percent Labels */}
        <div className="w-full max-w-[420px] flex flex-col items-center">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block pointer-events-none"
            style={{
              aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
              filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.9))',
            }}
          />

          <div className="w-[82%] flex items-center justify-between gap-2 -mt-2 px-1">
            <span className="font-display text-[11px] font-bold text-[#e8dcc2] tracking-wide truncate text-left">
              {phase}
            </span>
            <span className="font-display text-xs font-extrabold text-[#f2c464] shrink-0 tabular-nums">
              {pctRounded}%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Survival Tip in Rajdhani */}
      <div
        className="relative z-10 w-full max-w-[400px] px-6 pt-3 text-center flex items-center justify-center"
        style={{
          paddingBottom: 'max(22px, env(safe-area-inset-bottom))',
        }}
      >
        <p className="font-body text-[13px] font-medium text-[#cbbba0] leading-snug">
          “{SURVIVAL_TIPS[tipIndex]}”
        </p>
      </div>
    </div>
  );
};
