import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BLOOD_IRON_COLORS,
  ForgedFrameSpec,
  createForgedFrameSpec,
  getDripProgress,
} from '../game/ui/forgedIronPhaser';
import { haptics } from '../mobile/haptics';

export interface ForgedIronFrameProps {
  seed: string | number;
  className?: string;
  contentClassName?: string;
  radius?: number;
  dripCount?: number;
  maxDripLength?: number;
  scratchCount?: number;
  stainCount?: number;
  borderColor?: string;
  glowColor?: string;
  glowStrength?: number;
  hovered?: boolean;
  pressed?: boolean;
  showDrips?: boolean;
  children?: React.ReactNode;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function renderStaticIronPlate(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: ForgedFrameSpec,
  opts: {
    radius: number;
    borderColor?: string;
    glowColor?: string;
    glowStrength: number;
    hovered: boolean;
    pressed: boolean;
  }
) {
  const { radius, borderColor, glowColor, glowStrength, hovered, pressed } = opts;
  const r = Math.min(radius, w * 0.25, h * 0.25);
  const pad = 2;
  const ix = pad;
  const iy = pad;
  const iw = Math.max(4, w - pad * 2);
  const ih = Math.max(4, h - pad * 2);

  ctx.clearRect(0, 0, w, h);

  // 1. Dark forged-iron gradient fill
  ctx.save();
  drawRoundedRectPath(ctx, ix, iy, iw, ih, r);
  ctx.clip();

  const grad = ctx.createLinearGradient(0, iy, w * 0.25, iy + ih);
  if (pressed) {
    grad.addColorStop(0, '#231619');
    grad.addColorStop(0.45, '#191316');
    grad.addColorStop(1, '#0e0b0d');
  } else if (hovered) {
    grad.addColorStop(0, '#24272d');
    grad.addColorStop(0.45, '#1a1c20');
    grad.addColorStop(1, '#101215');
  } else {
    grad.addColorStop(0, '#21242a');
    grad.addColorStop(0.45, '#1a1c20');
    grad.addColorStop(1, '#0f1013');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(ix, iy, iw, ih);

  // Subtle ambient blood / iron vignette inside frame
  const innerShade = ctx.createRadialGradient(
    w * 0.5,
    h * 0.35,
    Math.min(iw, ih) * 0.1,
    w * 0.5,
    h * 0.5,
    Math.max(iw, ih) * 0.72
  );
  innerShade.addColorStop(0, 'rgba(58, 63, 71, 0.06)');
  innerShade.addColorStop(1, 'rgba(7, 8, 10, 0.42)');
  ctx.fillStyle = innerShade;
  ctx.fillRect(ix, iy, iw, ih);

  // 2. Dried-blood stains in corners (#3a0a0e)
  for (const stain of spec.stains) {
    const cx =
      stain.corner === 0 || stain.corner === 2
        ? ix + Math.min(iw * 0.28, stain.offsetX)
        : ix + iw - Math.min(iw * 0.28, stain.offsetX);
    const cy =
      stain.corner === 0 || stain.corner === 1
        ? iy + Math.min(ih * 0.28, stain.offsetY)
        : iy + ih - Math.min(ih * 0.28, stain.offsetY);

    ctx.fillStyle = 'rgba(58, 10, 14, 0.62)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, stain.radiusX, stain.radiusY, 0.35, 0, Math.PI * 2);
    ctx.fill();

    for (const lobe of stain.lobes) {
      ctx.fillStyle = 'rgba(42, 6, 9, 0.52)';
      ctx.beginPath();
      ctx.arc(cx + lobe.dx, cy + lobe.dy, lobe.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. Subtle surface scratches across iron plate
  for (const sc of spec.scratches) {
    const sx = ix + sc.x1Ratio * iw;
    const sy = iy + sc.y1Ratio * ih;
    const ex = Math.max(ix + 6, Math.min(ix + iw - 6, sx + sc.dx));
    const ey = Math.max(iy + 6, Math.min(iy + ih - 6, sy + sc.dy));

    ctx.strokeStyle = `rgba(7, 8, 10, ${Math.min(0.65, sc.alpha * 1.5)})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.strokeStyle = sc.rusty
      ? `rgba(107, 58, 42, ${sc.alpha * 0.95})`
      : `rgba(85, 93, 105, ${sc.alpha})`;
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(sx + 0.8, sy + 0.8);
    ctx.lineTo(ex + 0.8, ey + 0.8);
    ctx.stroke();
  }

  // 4. 2px steel highlight on top & left edge
  const bevelInset = 2;
  ctx.strokeStyle =
    hovered || pressed
      ? 'rgba(229, 48, 58, 0.45)'
      : 'rgba(85, 93, 105, 0.68)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ix + bevelInset, iy + ih - r);
  ctx.lineTo(ix + bevelInset, iy + r);
  ctx.quadraticCurveTo(ix + bevelInset, iy + bevelInset, ix + r, iy + bevelInset);
  ctx.lineTo(ix + iw - r, iy + bevelInset);
  ctx.stroke();

  // 5. 2px dark shadow on bottom & right edge
  ctx.strokeStyle = 'rgba(7, 8, 10, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ix + iw - bevelInset, iy + r);
  ctx.lineTo(ix + iw - bevelInset, iy + ih - r);
  ctx.quadraticCurveTo(
    ix + iw - bevelInset,
    iy + ih - bevelInset,
    ix + iw - r,
    iy + ih - bevelInset
  );
  ctx.lineTo(ix + r, iy + ih - bevelInset);
  ctx.stroke();

  ctx.restore();

  // 6. Outer forged frame border + blood-red/rarity glow
  const activeBorder =
    borderColor ??
    (pressed
      ? BLOOD_IRON_COLORS.bloodGlow
      : hovered
        ? BLOOD_IRON_COLORS.freshBlood
        : BLOOD_IRON_COLORS.steel);
  const activeGlow =
    glowColor ??
    (pressed || hovered ? BLOOD_IRON_COLORS.bloodGlow : undefined);

  ctx.save();
  drawRoundedRectPath(ctx, ix, iy, iw, ih, r);
  if (activeGlow && (hovered || pressed || glowStrength > 0)) {
    ctx.shadowColor = activeGlow;
    ctx.shadowBlur = pressed ? 14 : hovered ? 10 : glowStrength;
  }
  ctx.strokeStyle = activeBorder;
  ctx.lineWidth = hovered || pressed ? 1.75 : 1.5;
  ctx.stroke();
  ctx.restore();

  // 7. Rivets in the 4 corners
  const rivOffset = Math.min(11, iw * 0.14, ih * 0.22);
  const rivetRadius = iw < 90 || ih < 44 ? 2.1 : 2.7;
  const rivets = [
    [ix + rivOffset, iy + rivOffset],
    [ix + iw - rivOffset, iy + rivOffset],
    [ix + rivOffset, iy + ih - rivOffset],
    [ix + iw - rivOffset, iy + ih - rivOffset],
  ];

  for (const [rx, ry] of rivets) {
    // Dark recessed socket
    ctx.fillStyle = '#07080a';
    ctx.beginPath();
    ctx.arc(rx, ry, rivetRadius + 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Subtle rust rim
    ctx.fillStyle = 'rgba(107, 58, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(rx, ry, rivetRadius + 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Rivet steel dome
    const rGrad = ctx.createRadialGradient(
      rx - rivetRadius * 0.35,
      ry - rivetRadius * 0.35,
      0.3,
      rx,
      ry,
      rivetRadius
    );
    rGrad.addColorStop(0, '#727b89');
    rGrad.addColorStop(0.55, BLOOD_IRON_COLORS.steel);
    rGrad.addColorStop(1, '#141619');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderBloodDrips(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  spec: ForgedFrameSpec,
  elapsedSec: number
) {
  const pad = 2;
  const iw = Math.max(4, w - pad * 2);
  const topY = pad + 1;

  for (const drip of spec.drips) {
    const progress = getDripProgress(elapsedSec, drip);
    const maxAllowed = Math.max(6, h * 0.28);
    const length = Math.min(
      maxAllowed,
      drip.baseLength + drip.maxExtraLength * progress
    );
    const x = pad + drip.xRatio * iw;
    const endX = x + drip.curveOffset * (0.4 + 0.6 * progress);
    const endY = topY + length;
    const halfTopW = drip.width * 0.72;
    const bulbR = drip.bulbRadius * (0.85 + 0.22 * progress);

    // Crusted dried-blood pool at the top iron bevel
    ctx.fillStyle = 'rgba(58, 10, 14, 0.92)';
    ctx.beginPath();
    ctx.ellipse(x, topY + 1, drip.width * 1.45, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tapered viscous drip silhouette
    const dGrad = ctx.createLinearGradient(x, topY, endX, endY);
    dGrad.addColorStop(0, BLOOD_IRON_COLORS.driedBlood);
    dGrad.addColorStop(0.45, '#7c0c13');
    dGrad.addColorStop(1, BLOOD_IRON_COLORS.freshBlood);

    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.moveTo(x - halfTopW, topY);
    ctx.quadraticCurveTo(
      x - halfTopW * 0.45,
      topY + length * 0.52,
      endX - bulbR * 0.55,
      endY - bulbR * 0.45
    );
    ctx.arc(endX, endY, bulbR, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.quadraticCurveTo(
      x + halfTopW * 0.45,
      topY + length * 0.52,
      x + halfTopW,
      topY
    );
    ctx.closePath();
    ctx.fill();

    // Wet fresh-blood specular highlight at the hanging drop bulb
    ctx.fillStyle = 'rgba(229, 48, 58, 0.85)';
    ctx.beginPath();
    ctx.arc(
      endX - bulbR * 0.28,
      endY - bulbR * 0.24,
      Math.max(0.75, bulbR * 0.34),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

export const ForgedIronFrame: React.FC<ForgedIronFrameProps> = ({
  seed,
  className = '',
  contentClassName = '',
  radius = 10,
  dripCount,
  maxDripLength = 22,
  scratchCount,
  stainCount,
  borderColor,
  glowColor,
  glowStrength = 0,
  hovered = false,
  pressed = false,
  showDrips = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticPlateRef = useRef<HTMLCanvasElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });
  const startTimeRef = useRef<number>(performance.now());

  const spec = useMemo(
    () =>
      createForgedFrameSpec(seed, {
        dripCount,
        maxDripLength,
        scratchCount,
        stainCount,
      }),
    [seed, dripCount, maxDripLength, scratchCount, stainCount]
  );

  // Rebuild cached static iron plate on resize or visual state change
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rebuildStatic = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(12, Math.round(rect.width));
      const h = Math.max(12, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w, h, dpr };

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      if (!staticPlateRef.current) {
        staticPlateRef.current = document.createElement('canvas');
      }
      const off = staticPlateRef.current;
      off.width = Math.round(w * dpr);
      off.height = Math.round(h * dpr);
      const offCtx = off.getContext('2d');
      if (offCtx) {
        offCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderStaticIronPlate(offCtx, w, h, spec, {
          radius,
          borderColor,
          glowColor,
          glowStrength,
          hovered,
          pressed,
        });
      }

      const mainCtx = canvas.getContext('2d');
      if (mainCtx && staticPlateRef.current) {
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.clearRect(0, 0, canvas.width, canvas.height);
        mainCtx.drawImage(staticPlateRef.current, 0, 0);
        if (showDrips) {
          mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
          const elapsed = (performance.now() - startTimeRef.current) * 0.001;
          renderBloodDrips(mainCtx, w, h, spec, elapsed);
        }
      }
    };

    rebuildStatic();

    const observer = new ResizeObserver(() => {
      rebuildStatic();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [spec, radius, borderColor, glowColor, glowStrength, hovered, pressed, showDrips]);

  // Subtle throttled drip lengthening loop (~16 fps -> ultra light on CPU)
  useEffect(() => {
    if (!showDrips) return;
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const timer = window.setInterval(() => {
      const canvas = canvasRef.current;
      const off = staticPlateRef.current;
      const { w, h, dpr } = sizeRef.current;
      if (!canvas || !off || w <= 0 || h <= 0) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(off, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const elapsed = (performance.now() - startTimeRef.current) * 0.001;
      renderBloodDrips(ctx, w, h, spec, elapsed);
    }, 65);

    return () => window.clearInterval(timer);
  }, [spec, showDrips]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-0"
      />
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
};

interface IronButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  seed: string | number;
  variant?: 'default' | 'blood';
  radius?: number;
  dripCount?: number;
}

export const IronButton: React.FC<IronButtonProps> = ({
  seed,
  variant = 'default',
  radius = 10,
  dripCount = 2,
  className = '',
  children,
  disabled,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...rest
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const activeBorder =
    disabled
      ? '#2b2e35'
      : pressed
        ? BLOOD_IRON_COLORS.bloodGlow
        : hovered || variant === 'blood'
          ? BLOOD_IRON_COLORS.freshBlood
          : BLOOD_IRON_COLORS.steel;

  const activeGlow =
    disabled
      ? undefined
      : pressed || hovered || variant === 'blood'
        ? BLOOD_IRON_COLORS.bloodGlow
        : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={(e) => {
        if (!disabled) setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        setPressed(false);
        onMouseLeave?.(e);
      }}
      onPointerDown={(e) => {
        if (!disabled) {
          setPressed(true);
          haptics.tap(variant === 'blood' ? 'medium' : 'light');
        }
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        setPressed(false);
        onPointerUp?.(e);
      }}
      onPointerCancel={(e) => {
        setPressed(false);
        onPointerCancel?.(e);
      }}
      className={`group relative overflow-visible transition-transform duration-120 ease-out active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-[#e5303a] focus-visible:outline-offset-2 ${
        disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      {...rest}
    >
      <ForgedIronFrame
        seed={seed}
        radius={radius}
        dripCount={dripCount}
        maxDripLength={12}
        scratchCount={3}
        stainCount={1}
        hovered={hovered && !disabled}
        pressed={pressed && !disabled}
        borderColor={activeBorder}
        glowColor={activeGlow}
        glowStrength={variant === 'blood' && !disabled ? 8 : 0}
        className="w-full h-full"
        contentClassName="w-full h-full flex items-center justify-center gap-2 text-[#d8c9a8]"
      >
        {children}
      </ForgedIronFrame>
    </button>
  );
};
