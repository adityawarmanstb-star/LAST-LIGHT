import React, { useEffect, useRef } from 'react';
import { soundManager } from '../game/audio';

interface DarkFantasyTouchFxProps {
  active: boolean;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  size: number;
  palette: 0 | 1 | 2; // 0: gold ember, 1: blood crimson, 2: arcane cyan
}

interface RuneRingBurst {
  active: boolean;
  x: number;
  y: number;
  ageMs: number;
  lifeMs: number;
  maxRadius: number;
  rotation: number;
  rotSpeed: number;
  isPlay: boolean;
}

const MAX_SPARKS = 96;
const MAX_RINGS = 12;

function createGlowSprite(inner: string, mid: string, outer: string): HTMLCanvasElement {
  const size = 24;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    const h = size * 0.5;
    const g = ctx.createRadialGradient(h, h, 0.4, h, h, h);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, mid);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

export const DarkFantasyTouchFx: React.FC<DarkFantasyTouchFxProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const sprites: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] = [
      createGlowSprite('rgba(255, 246, 208, 1)', 'rgba(235, 168, 62, 0.85)', 'rgba(217, 83, 47, 0)'),
      createGlowSprite('rgba(255, 214, 210, 0.95)', 'rgba(196, 26, 36, 0.82)', 'rgba(110, 8, 14, 0)'),
      createGlowSprite('rgba(225, 252, 255, 0.95)', 'rgba(93, 228, 255, 0.72)', 'rgba(30, 120, 155, 0)'),
    ];

    const sparks: SparkParticle[] = Array.from({ length: MAX_SPARKS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      ageMs: 0,
      lifeMs: 360,
      size: 7,
      palette: 0,
    }));
    const rings: RuneRingBurst[] = Array.from({ length: MAX_RINGS }, () => ({
      active: false,
      x: 0,
      y: 0,
      ageMs: 0,
      lifeMs: 340,
      maxRadius: 38,
      rotation: 0,
      rotSpeed: 1.2,
      isPlay: false,
    }));

    let sparkCursor = 0;
    let ringCursor = 0;
    let rafId = 0;
    let lastNowMs = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = Math.max(1, Math.round(viewW * dpr));
      canvas.height = Math.max(1, Math.round(viewH * dpr));
    };
    resizeCanvas();

    const spawnBurst = (x: number, y: number, isPlay: boolean) => {
      // Spawn runic shockwave ring
      for (let i = 0; i < MAX_RINGS; i++) {
        const idx = (ringCursor + i) % MAX_RINGS;
        const r = rings[idx];
        if (!r.active || i === MAX_RINGS - 1) {
          ringCursor = (idx + 1) % MAX_RINGS;
          r.active = true;
          r.x = x;
          r.y = y;
          r.ageMs = 0;
          r.lifeMs = isPlay ? 430 : 320;
          r.maxRadius = isPlay ? 66 : 38;
          r.rotation = Math.random() * Math.PI * 0.5;
          r.rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (isPlay ? 1.8 : 1.3);
          r.isPlay = isPlay;
          break;
        }
      }

      if (prefersReducedMotion) {
        startLoop();
        return;
      }

      // Spawn forged ember & runic sparks
      const count = isPlay ? 18 : 10;
      for (let s = 0; s < count; s++) {
        for (let p = 0; p < MAX_SPARKS; p++) {
          const idx = (sparkCursor + p) % MAX_SPARKS;
          const sp = sparks[idx];
          if (!sp.active || p === MAX_SPARKS - 1) {
            sparkCursor = (idx + 1) % MAX_SPARKS;
            const angle = (Math.PI * 2 * s) / count + (Math.random() - 0.5) * 0.5;
            const speed = (isPlay ? 95 : 64) + Math.random() * (isPlay ? 140 : 92);
            sp.active = true;
            sp.x = x + (Math.random() - 0.5) * 6;
            sp.y = y + (Math.random() - 0.5) * 6;
            sp.vx = Math.cos(angle) * speed;
            sp.vy = Math.sin(angle) * speed - (isPlay ? 28 : 16);
            sp.ageMs = 0;
            sp.lifeMs = (isPlay ? 360 : 280) + Math.random() * 140;
            sp.size = (isPlay ? 6 : 4.5) + Math.random() * (isPlay ? 6.5 : 4.5);
            const roll = Math.random();
            sp.palette = roll < 0.56 ? 0 : roll < 0.88 ? 1 : 2;
            break;
          }
        }
      }

      startLoop();
    };

    const tick = (nowMs: number) => {
      const dtMs = Math.min(48, Math.max(0.5, nowMs - lastNowMs));
      const dtSec = dtMs / 1000;
      lastNowMs = nowMs;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewW, viewH);

      let anyAlive = false;

      // 1. Etched Runic Ring & Sigil Star Flash
      for (let i = 0; i < MAX_RINGS; i++) {
        const r = rings[i];
        if (!r.active) continue;
        r.ageMs += dtMs;
        if (r.ageMs >= r.lifeMs) {
          r.active = false;
          continue;
        }
        anyAlive = true;

        const t = r.ageMs / r.lifeMs;
        const easeOut = 1 - Math.pow(1 - t, 2.3);
        const radius = 8 + easeOut * r.maxRadius;
        const alpha = (1 - t) * (1 - t);
        const angle = r.rotation + r.rotSpeed * t;

        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.globalCompositeOperation = 'lighter';

        // Outer forged gold ring
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.isPlay
          ? `rgba(242, 196, 100, ${0.78 * alpha})`
          : `rgba(230, 170, 69, ${0.65 * alpha})`;
        ctx.lineWidth = r.isPlay ? 2.1 : 1.5;
        ctx.stroke();

        // Inner blood-crimson echo ring
        if (radius > 12) {
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(196, 28, 38, ${0.58 * alpha})`;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }

        // 4 Rotating cardinal rune ticks around the ring
        ctx.rotate(angle);
        const tickLen = r.isPlay ? 6.5 : 4.5;
        ctx.strokeStyle = `rgba(255, 232, 178, ${0.82 * alpha})`;
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          ctx.beginPath();
          ctx.moveTo(cos * (radius - tickLen * 0.5), sin * (radius - tickLen * 0.5));
          ctx.lineTo(cos * (radius + tickLen * 0.8), sin * (radius + tickLen * 0.8));
          ctx.stroke();
        }

        // Brief central 4-point sigil diamond flash
        if (t < 0.42) {
          const starT = 1 - t / 0.42;
          const starR = (r.isPlay ? 20 : 12) * (0.45 + 0.55 * (1 - starT));
          ctx.fillStyle = `rgba(255, 238, 195, ${0.85 * starT})`;
          ctx.beginPath();
          ctx.moveTo(0, -starR);
          ctx.lineTo(starR * 0.22, -starR * 0.22);
          ctx.lineTo(starR, 0);
          ctx.lineTo(starR * 0.22, starR * 0.22);
          ctx.lineTo(0, starR);
          ctx.lineTo(-starR * 0.22, starR * 0.22);
          ctx.lineTo(-starR, 0);
          ctx.lineTo(-starR * 0.22, -starR * 0.22);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // 2. Forged Sparks & Embers
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < MAX_SPARKS; i++) {
        const sp = sparks[i];
        if (!sp.active) continue;
        sp.ageMs += dtMs;
        if (sp.ageMs >= sp.lifeMs) {
          sp.active = false;
          continue;
        }
        anyAlive = true;

        sp.x += sp.vx * dtSec;
        sp.y += sp.vy * dtSec;
        sp.vx *= 1 - 3.6 * dtSec;
        sp.vy = sp.vy * (1 - 3.2 * dtSec) - 36 * dtSec;

        const lifeRatio = 1 - sp.ageMs / sp.lifeMs;
        const drawSize = sp.size * (0.4 + 0.6 * lifeRatio);
        ctx.globalAlpha = lifeRatio * lifeRatio;
        ctx.drawImage(
          sprites[sp.palette],
          sp.x - drawSize * 0.5,
          sp.y - drawSize * 0.5,
          drawSize,
          drawSize
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      if (anyAlive) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const startLoop = () => {
      if (rafId !== 0) return;
      lastNowMs = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const pulseButtonElement = (btn: HTMLElement, isPlay: boolean) => {
      const cls = isPlay ? 'df-btn-hit-play' : 'df-btn-hit';
      btn.classList.remove('df-btn-hit', 'df-btn-hit-play');
      void btn.offsetWidth;
      btn.classList.add(cls);
      const prevTimer = Number(btn.dataset.dfHitTimer || 0);
      if (prevTimer) {
        window.clearTimeout(prevTimer);
      }
      const nextTimer = window.setTimeout(() => {
        btn.classList.remove('df-btn-hit', 'df-btn-hit-play');
        delete btn.dataset.dfHitTimer;
      }, 280);
      btn.dataset.dfHitTimer = String(nextTimer);
    };

    const triggerFromTarget = (
      target: EventTarget | null,
      clientX: number,
      clientY: number,
      hasCoords: boolean
    ) => {
      if (!activeRef.current) return;
      if (!(target instanceof Element)) return;
      if (target.closest('input[type="range"]')) return;

      const btn = target.closest('button, [role="button"]') as HTMLElement | null;
      if (!btn) return;
      if ((btn as HTMLButtonElement).disabled || btn.getAttribute('aria-disabled') === 'true') {
        return;
      }

      const isPlay = btn.dataset.sfx === 'play';
      if (isPlay) {
        soundManager.playUiStartGame();
      } else {
        soundManager.playUiClick();
      }

      pulseButtonElement(btn, isPlay);

      let fxX = clientX;
      let fxY = clientY;
      if (!hasCoords) {
        const rect = btn.getBoundingClientRect();
        fxX = rect.left + rect.width * 0.5;
        fxY = rect.top + rect.height * 0.5;
      }
      spawnBurst(fxX, fxY, isPlay);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      triggerFromTarget(e.target, e.clientX, e.clientY, true);
    };

    const handleClick = (e: MouseEvent) => {
      // Keyboard activation (Enter/Space) fires click with detail === 0 and no pointerdown
      if (e.detail === 0) {
        triggerFromTarget(e.target, 0, 0, false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('click', handleClick, { capture: true, passive: true });
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('resize', resizeCanvas);
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-[120]"
    />
  );
};
