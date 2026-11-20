import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FlipHorizontal2,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  BOSS2,
  BOSS2_SHEET_KEYS,
  Boss2AnimKey,
  Boss2AttackKind,
  Boss2SheetMeta,
  getBoss2BodyCenterY,
  getBoss2CastSpawn,
  getBoss2EffectiveFps,
  getBoss2SlamCenter,
  getBoss2SwingOrigin,
  parseBoss2SheetMeta,
} from '../game/CinderWardenBoss';

interface BossAnimPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LoadedSheetEntry {
  image: HTMLImageElement;
  meta: Boss2SheetMeta;
}

const ATTACK_KINDS: readonly { kind: Boss2AttackKind; label: string; animKey: Boss2AnimKey }[] = [
  { kind: 'slam', label: 'Slam', animKey: 'boss2_attack_slam' },
  { kind: 'swing', label: 'Swing', animKey: 'boss2_attack_swing' },
  { kind: 'cast', label: 'Cast', animKey: 'boss2_attack_cast' },
];

export const BossAnimPreviewModal: React.FC<BossAnimPreviewModalProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sheetsRef = useRef<Partial<Record<Boss2AnimKey, LoadedSheetEntry>>>({});

  const [selectedAnim, setSelectedAnim] = useState<Boss2AnimKey>('boss2_attack_slam');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [flipX, setFlipX] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [missingSheets, setMissingSheets] = useState<Boss2AnimKey[]>([]);
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  // Local mirror of BOSS2.impactFrame so React UI updates live when mutated
  const [impactFrames, setImpactFrames] = useState<Record<Boss2AttackKind, number>>({
    slam: BOSS2.impactFrame.slam,
    swing: BOSS2.impactFrame.swing,
    cast: BOSS2.impactFrame.cast,
  });

  // Refs synced for the requestAnimationFrame render loop (zero per-frame React state churn when paused)
  const animStateRef = useRef({
    selectedAnim,
    isPlaying,
    flipX,
    showGuides,
    frameIndex: 0,
    accumMs: 0,
  });

  useEffect(() => {
    animStateRef.current.selectedAnim = selectedAnim;
    animStateRef.current.frameIndex = 0;
    animStateRef.current.accumMs = 0;
    setFrameIndex(0);
  }, [selectedAnim]);

  useEffect(() => {
    animStateRef.current.isPlaying = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    animStateRef.current.flipX = flipX;
  }, [flipX]);

  useEffect(() => {
    animStateRef.current.showGuides = showGuides;
  }, [showGuides]);

  // Load all 7 Cinder Warden sheets & metadata dynamically when modal opens; release on close
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadedCount(0);
    setMissingSheets([]);
    setImpactFrames({
      slam: BOSS2.impactFrame.slam,
      swing: BOSS2.impactFrame.swing,
      cast: BOSS2.impactFrame.cast,
    });

    const loadAll = async () => {
      const missing: Boss2AnimKey[] = [];
      let ok = 0;

      await Promise.all(
        BOSS2_SHEET_KEYS.map(async (key) => {
          const def = BOSS2.sheets[key];
          try {
            const res = await fetch(def.metaUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const rawJson = await res.json();
            const meta = parseBoss2SheetMeta(rawJson, def.loop);
            if (!meta) throw new Error('Invalid metadata JSON');

            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const el = new Image();
              el.decoding = 'async';
              el.onload = () => resolve(el);
              el.onerror = () => reject(new Error(`Failed to load ${def.sheetUrl}`));
              el.src = def.sheetUrl;
            });

            if (!cancelled) {
              sheetsRef.current[key] = { image: img, meta };
              ok++;
              setLoadedCount(ok);
            }
          } catch (err) {
            console.warn(`[BossAnimPreview] Missing or unreadable sheet "${key}":`, err);
            missing.push(key);
          }
        })
      );

      if (!cancelled) {
        setMissingSheets(missing);
      }
    };

    void loadAll();

    return () => {
      cancelled = true;
      // Release image references cleanly when leaving debug preview
      sheetsRef.current = {};
    };
  }, [isOpen]);

  // Escape key closes only this debug overlay
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        const entry = sheetsRef.current[animStateRef.current.selectedAnim];
        const total = entry ? entry.meta.frames : 1;
        const next = (animStateRef.current.frameIndex - 1 + total) % total;
        animStateRef.current.frameIndex = next;
        animStateRef.current.accumMs = 0;
        setFrameIndex(next);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        const entry = sheetsRef.current[animStateRef.current.selectedAnim];
        const total = entry ? entry.meta.frames : 1;
        const next = (animStateRef.current.frameIndex + 1) % total;
        animStateRef.current.frameIndex = next;
        animStateRef.current.accumMs = 0;
        setFrameIndex(next);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, onClose]);

  // Animation & Canvas draw loop
  useEffect(() => {
    if (!isOpen) return;

    let rafId = 0;
    let lastTs = performance.now();

    const renderFrame = (now: number) => {
      const dtMs = Math.min(100, Math.max(0, now - lastTs));
      lastTs = now;

      const state = animStateRef.current;
      const entry = sheetsRef.current[state.selectedAnim];

      if (entry && state.isPlaying && entry.meta.frames > 1) {
        const effectiveFps = getBoss2EffectiveFps(state.selectedAnim, entry.meta.fps);
        const frameDurationMs = 1000 / effectiveFps;
        state.accumMs += dtMs;
        if (state.accumMs >= frameDurationMs) {
          const steps = Math.floor(state.accumMs / frameDurationMs);
          state.accumMs -= steps * frameDurationMs;
          const nextIdx = (state.frameIndex + steps) % entry.meta.frames;
          if (nextIdx !== state.frameIndex) {
            state.frameIndex = nextIdx;
            setFrameIndex(nextIdx);
          }
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const cw = canvas.width;
          const ch = canvas.height;
          ctx.clearRect(0, 0, cw, ch);

          // Deep charcoal dark background
          ctx.fillStyle = '#0c0a0d';
          ctx.fillRect(0, 0, cw, ch);

          // Subtle ground baseline aligned to origin (0.5, 0.9)
          const groundY = Math.round(ch * 0.87);
          const drawGroundY = state.showGuides ? Math.round(ch * 0.72) : groundY;
          const centerX = Math.round(cw * 0.5);

          if (state.showGuides) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, drawGroundY);
            ctx.lineTo(cw, drawGroundY);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(centerX, 0);
            ctx.lineTo(centerX, ch);
            ctx.stroke();
          }

          if (entry) {
            const { image, meta } = entry;
            const idx = Math.max(0, Math.min(meta.frames - 1, state.frameIndex));
            const col = idx % meta.cols;
            const row = Math.floor(idx / meta.cols);
            const sx = col * meta.frame_w;
            const sy = row * meta.frame_h;

            // Render boss scaled cleanly so surrounding swing cone / slam circle / cast rays fit nicely
            const previewDisplayH = state.showGuides
              ? Math.min(BOSS2.displayHeight * 0.56, ch * 0.54)
              : Math.min(BOSS2.displayHeight, ch * 0.86);
            const scale = previewDisplayH / meta.frame_h;
            const drawW = meta.frame_w * scale;
            const drawH = meta.frame_h * scale;
            const logicalToPreview = previewDisplayH / BOSS2.displayHeight;
            const facingSign = state.flipX ? -1 : 1;
            const aimAngle = state.flipX ? Math.PI : 0;
            const activeAttackKind = BOSS2.sheets[state.selectedAnim].attackKind;

            // Helper converting logical boss-relative coords (boss feet at 0,0) into preview canvas pixels
            const toCanvasX = (lx: number) => centerX + lx * logicalToPreview;
            const toCanvasY = (ly: number) => drawGroundY + ly * logicalToPreview;

            // Draw ground attack shapes BEHIND the boss sprite (exact same math as runtime combat)
            if (state.showGuides) {
              const showAllShapes = !activeAttackKind;

              // 1. SLAM circle (BOSS2.slam.radius at getBoss2SlamCenter)
              if (showAllShapes || activeAttackKind === 'slam') {
                const slamPt = getBoss2SlamCenter(0, 0, state.flipX, aimAngle);
                const sx = toCanvasX(slamPt.x);
                const sy = toCanvasY(slamPt.y);
                const sr = BOSS2.slam.radius * logicalToPreview;
                ctx.save();
                ctx.fillStyle = `rgba(${BOSS2.telegraphs.fillRgb}, ${BOSS2.telegraphs.fillAlpha})`;
                ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, ${BOSS2.telegraphs.outlineAlpha})`;
                ctx.lineWidth = activeAttackKind === 'slam' ? 2 : 1.25;
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Center dot
                ctx.fillStyle = '#f87171';
                ctx.beginPath();
                ctx.arc(sx, sy, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }

              // 2. SWING cone (BOSS2.swing.range & BOSS2.swing.angleDeg from getBoss2SwingOrigin)
              if (showAllShapes || activeAttackKind === 'swing') {
                const swingPt = getBoss2SwingOrigin(0, 0, state.flipX);
                const sx = toCanvasX(swingPt.x);
                const sy = toCanvasY(swingPt.y);
                const sr = BOSS2.swing.range * logicalToPreview;
                const halfRad = (BOSS2.swing.angleDeg * 0.5 * Math.PI) / 180;
                ctx.save();
                ctx.fillStyle = `rgba(249, 115, 22, ${BOSS2.telegraphs.fillAlpha})`;
                ctx.strokeStyle = 'rgba(251, 146, 60, 0.9)';
                ctx.lineWidth = activeAttackKind === 'swing' ? 2 : 1.25;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.arc(sx, sy, sr, aimAngle - halfRad, aimAngle + halfRad, false);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              }
            }

            // Feet sit on drawGroundY because origin is (0.5, 0.9)
            const originOffsetX = drawW * BOSS2.origin.x;
            const originOffsetY = drawH * BOSS2.origin.y;

            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.translate(centerX, drawGroundY);
            if (state.flipX) {
              ctx.scale(-1, 1);
            }
            ctx.drawImage(
              image,
              sx,
              sy,
              meta.frame_w,
              meta.frame_h,
              -originOffsetX,
              -originOffsetY,
              drawW,
              drawH
            );
            ctx.restore();

            if (state.showGuides) {
              const showAllShapes = !activeAttackKind;
              const hitR = BOSS2.hitRadius * logicalToPreview;
              const bodyCenterY = toCanvasY(getBoss2BodyCenterY(0));

              ctx.save();
              // 3. Body hitbox circle (BOSS2.hitRadius at body center)
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
              ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
              ctx.lineWidth = 1.75;
              ctx.setLineDash([6, 4]);
              ctx.beginPath();
              ctx.arc(centerX, bodyCenterY, hitR, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.setLineDash([]);

              // Body center crosshair
              ctx.fillStyle = '#38bdf8';
              ctx.beginPath();
              ctx.arc(centerX, bodyCenterY, 3, 0, Math.PI * 2);
              ctx.fill();

              // Feet origin marker (0.5, 0.9)
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.arc(centerX, drawGroundY, 3.5, 0, Math.PI * 2);
              ctx.fill();

              // 4. CAST projectile spawn point (BOSS2.castSpawn) + fan rays
              if (showAllShapes || activeAttackKind === 'cast') {
                const castPt = getBoss2CastSpawn(0, 0, state.flipX);
                const cx = toCanvasX(castPt.x);
                const cy = toCanvasY(castPt.y);
                const count = BOSS2.cast.projectileCount;
                const spreadRad = (BOSS2.cast.fanSpreadDeg * Math.PI) / 180;
                const step = count > 1 ? spreadRad / (count - 1) : 0;
                const startAngle = aimAngle - spreadRad * 0.5;
                const rayLen = 190 * logicalToPreview;

                ctx.strokeStyle = `rgba(${BOSS2.telegraphs.borderRgb}, 0.8)`;
                ctx.lineWidth = activeAttackKind === 'cast' ? 1.75 : 1.1;
                for (let i = 0; i < count; i++) {
                  const ang = startAngle + i * step;
                  ctx.beginPath();
                  ctx.moveTo(cx, cy);
                  ctx.lineTo(cx + Math.cos(ang) * rayLen, cy + Math.sin(ang) * rayLen);
                  ctx.stroke();
                }

                // Projectile hitbox circle preview at spawn point
                const projR = BOSS2.cast.projectileHitboxRadius * logicalToPreview;
                ctx.fillStyle = 'rgba(250, 204, 21, 0.32)';
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 1.75;
                ctx.beginPath();
                ctx.arc(cx, cy, projR, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Facing arrow hint from body center
                ctx.fillStyle = '#facc15';
                ctx.font = 'bold 10px monospace';
                ctx.fillText(
                  `castSpawn (${facingSign * BOSS2.castSpawn.x}, ${BOSS2.castSpawn.y})`,
                  Math.max(8, Math.min(cw - 140, cx + facingSign * 10 - (state.flipX ? 118 : 0))),
                  cy - 10
                );
              }
              ctx.restore();
            }

            // Flash border highlight if current frame matches active attack's impactFrame
            if (activeAttackKind && idx === BOSS2.impactFrame[activeAttackKind]) {
              ctx.save();
              ctx.strokeStyle = 'rgba(248, 113, 113, 0.92)';
              ctx.lineWidth = 4;
              ctx.strokeRect(2, 2, cw - 4, ch - 4);
              ctx.restore();
            }
          }
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  const stepFrame = useCallback((delta: number) => {
    setIsPlaying(false);
    const entry = sheetsRef.current[animStateRef.current.selectedAnim];
    const total = entry ? entry.meta.frames : 1;
    const next = (animStateRef.current.frameIndex + delta + total) % total;
    animStateRef.current.frameIndex = next;
    animStateRef.current.accumMs = 0;
    setFrameIndex(next);
  }, []);

  const resetFrame = useCallback(() => {
    animStateRef.current.frameIndex = 0;
    animStateRef.current.accumMs = 0;
    setFrameIndex(0);
  }, []);

  const adjustImpactFrame = useCallback((kind: Boss2AttackKind, delta: number) => {
    const animKey: Boss2AnimKey =
      kind === 'slam'
        ? 'boss2_attack_slam'
        : kind === 'swing'
          ? 'boss2_attack_swing'
          : 'boss2_attack_cast';
    const entry = sheetsRef.current[animKey];
    const maxFrame = entry ? Math.max(0, entry.meta.frames - 1) : 24;
    const nextVal = Math.max(0, Math.min(maxFrame, BOSS2.impactFrame[kind] + delta));

    // Live-update BOSS2.impactFrame directly so Stage 2 boss reads it immediately
    BOSS2.impactFrame[kind] = nextVal;
    setImpactFrames({
      slam: BOSS2.impactFrame.slam,
      swing: BOSS2.impactFrame.swing,
      cast: BOSS2.impactFrame.cast,
    });
  }, []);

  const handleCopyValues = useCallback(() => {
    const snapshot = {
      slam: BOSS2.impactFrame.slam,
      swing: BOSS2.impactFrame.swing,
      cast: BOSS2.impactFrame.cast,
    };
    const formatted = `BOSS2.impactFrame = { slam: ${snapshot.slam}, swing: ${snapshot.swing}, cast: ${snapshot.cast} };`;

    // Always print to console per requirement
    console.log('[BOSS2.impactFrame]', snapshot, '\n' + formatted);

    const copyFallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = formatted;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // Ignore clipboard fallback errors
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(formatted).catch(copyFallback);
    } else {
      copyFallback();
    }

    setCopiedNotice(true);
    window.setTimeout(() => setCopiedNotice(false), 1800);
  }, []);

  if (!isOpen) return null;

  const activeEntry = sheetsRef.current[selectedAnim];
  const activeMeta = activeEntry?.meta ?? null;
  const totalFrames = activeMeta?.frames ?? 0;
  const activeAttackKind = BOSS2.sheets[selectedAnim].attackKind;
  const isAtImpactFrame =
    Boolean(activeAttackKind) && frameIndex === BOSS2.impactFrame[activeAttackKind!];
  const activeTelegraphSec =
    activeAttackKind && activeMeta
      ? Math.max(
          BOSS2.minTelegraphDurationSec,
          BOSS2.impactFrame[activeAttackKind] /
            getBoss2EffectiveFps(selectedAnim, activeMeta.fps)
        )
      : null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/88 backdrop-blur-sm p-3 sm:p-5 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] max-h-[94dvh] flex flex-col rounded-lg border border-amber-500/35 bg-[#121014] text-zinc-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#18141b]">
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-wider uppercase text-amber-300">
              Boss Animation Preview
            </h2>
            <p className="text-[11px] text-zinc-400">
              Cinder Warden Debug &amp; Impact Frame Tuner ({loadedCount}/{BOSS2_SHEET_KEYS.length}{' '}
              sheets loaded)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Boss Animation Preview"
            className="p-1.5 rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5">
          {/* Canvas Viewport */}
          <div className="relative rounded-md overflow-hidden border border-zinc-800 bg-[#0c0a0d] flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={560}
              height={340}
              className="w-full max-w-[560px] h-[240px] sm:h-[300px] object-contain block"
            />

            {/* Always-visible 0-based frame readout */}
            <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-1 rounded bg-black/80 border border-amber-400/40 font-mono text-xs sm:text-sm font-bold text-amber-300">
                FRAME {frameIndex} / {Math.max(0, totalFrames - 1)}
              </span>
              {activeMeta && (
                <span className="px-2 py-1 rounded bg-black/75 border border-zinc-700 font-mono text-[11px] text-zinc-300">
                  {activeMeta.frame_w}×{activeMeta.frame_h} · {activeMeta.fps} fps
                </span>
              )}
              {activeTelegraphSec !== null && (
                <span className="px-2 py-1 rounded bg-black/75 border border-red-500/40 font-mono text-[11px] text-red-300">
                  telegraph {activeTelegraphSec.toFixed(2)}s
                </span>
              )}
            </div>

            {isAtImpactFrame && (
              <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-red-600/90 border border-red-300/60 font-mono text-xs font-bold tracking-wider text-white">
                IMPACT FRAME
              </div>
            )}

            <div className="absolute bottom-2 left-2.5 text-[10px] font-mono text-zinc-400 bg-black/65 px-2 py-0.5 rounded">
              origin ({BOSS2.origin.x}, {BOSS2.origin.y}) · displayHeight {BOSS2.displayHeight}px ·
              hitRadius {BOSS2.hitRadius}px · {flipX ? 'LEFT (flipX)' : 'RIGHT'}
            </div>
          </div>

          {missingSheets.length > 0 && (
            <div className="px-3 py-2 rounded border border-red-500/40 bg-red-950/40 text-xs text-red-200">
              Missing sheets: {missingSheets.join(', ')}
            </div>
          )}

          {/* Playback Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#18141c] border border-zinc-800 rounded-md px-3 py-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold text-xs cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                onClick={() => stepFrame(-1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono cursor-pointer"
                title="Previous frame (Left Arrow)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                -1
              </button>
              <button
                type="button"
                onClick={() => stepFrame(1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono cursor-pointer"
                title="Next frame (Right Arrow)"
              >
                +1
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetFrame}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs cursor-pointer"
                title="Reset to frame 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFlipX((f) => !f)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded border text-xs cursor-pointer ${
                  flipX
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <FlipHorizontal2 className="w-3.5 h-3.5" />
                Flip X
              </button>
              <button
                type="button"
                onClick={() => setShowGuides((g) => !g)}
                className={`px-2.5 py-1.5 rounded border text-xs cursor-pointer ${
                  showGuides
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Show hitboxes &amp; attack shapes
              </button>
            </div>
          </div>

          {/* Animation Selector */}
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1.5">
              Animations
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {BOSS2_SHEET_KEYS.map((key) => {
                const def = BOSS2.sheets[key];
                const isSelected = selectedAnim === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedAnim(key);
                      setIsPlaying(true);
                    }}
                    className={`px-2.5 py-2 rounded border text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-xs font-semibold truncate">{def.label}</div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">{key}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Impact Frame Live Tuner */}
          <div className="rounded-md border border-zinc-800 bg-[#18141c] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  BOSS2.impactFrame (Live Tuning)
                </div>
                <div className="text-[11px] text-zinc-400">
                  0-based frame index when damage, shake, fire ring &amp; projectiles fire
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyValues}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs cursor-pointer shrink-0"
              >
                {copiedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy values
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ATTACK_KINDS.map(({ kind, label, animKey }) => {
                const entry = sheetsRef.current[animKey];
                const fps = getBoss2EffectiveFps(animKey, entry?.meta.fps ?? 20);
                const val = impactFrames[kind];
                const telSec = Math.max(BOSS2.minTelegraphDurationSec, val / Math.max(1, fps));
                const isActive = selectedAnim === animKey;

                return (
                  <div
                    key={kind}
                    className={`rounded border px-3 py-2 flex flex-col gap-1.5 ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-500/10'
                        : 'border-zinc-800 bg-zinc-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnim(animKey);
                          setIsPlaying(false);
                          animStateRef.current.frameIndex = val;
                          animStateRef.current.accumMs = 0;
                          setFrameIndex(val);
                        }}
                        className="text-xs font-bold text-zinc-200 hover:text-amber-300 cursor-pointer"
                        title={`Jump to ${label} impact frame`}
                      >
                        {label}
                      </button>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {telSec.toFixed(2)}s tel
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => adjustImpactFrame(kind, -1)}
                        className="w-8 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-mono font-bold text-sm cursor-pointer"
                        aria-label={`Decrease ${label} impact frame`}
                      >
                        -
                      </button>
                      <span className="font-mono text-base font-bold text-amber-300 tabular-nums">
                        {val}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustImpactFrame(kind, 1)}
                        className="w-8 h-7 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-mono font-bold text-sm cursor-pointer"
                        aria-label={`Increase ${label} impact frame`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
