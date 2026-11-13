import Phaser from 'phaser';

export const BLOOD_IRON_COLORS = {
  iron: '#1a1c20',
  ironDark: '#0e1013',
  ironMid: '#15171b',
  ironLight: '#23272e',
  steel: '#3a3f47',
  steelHighlight: '#555d69',
  steelShadow: '#07080a',
  rust: '#6b3a2a',
  driedBlood: '#3a0a0e',
  freshBlood: '#b3121a',
  bloodGlow: '#e5303a',
  bone: '#d8c9a8',
  boneMuted: '#9c8e72',
  cyan: '#5de4ff',
  amber: '#f2a93b',
} as const;

export const BLOOD_IRON_HEX = {
  iron: 0x1a1c20,
  ironDark: 0x0e1013,
  ironLight: 0x242830,
  steel: 0x3a3f47,
  steelHighlight: 0x555d69,
  steelShadow: 0x07080a,
  rust: 0x6b3a2a,
  driedBlood: 0x3a0a0e,
  freshBlood: 0xb3121a,
  bloodGlow: 0xe5303a,
  bone: 0xd8c9a8,
  cyan: 0x5de4ff,
} as const;

export interface ScratchSpec {
  x1Ratio: number;
  y1Ratio: number;
  dx: number;
  dy: number;
  alpha: number;
  rusty: boolean;
}

export interface CornerStainSpec {
  corner: 0 | 1 | 2 | 3; // 0: TL, 1: TR, 2: BL, 3: BR
  radiusX: number;
  radiusY: number;
  offsetX: number;
  offsetY: number;
  lobes: Array<{ dx: number; dy: number; r: number }>;
}

export interface BloodDripSpec {
  xRatio: number;
  width: number;
  baseLength: number;
  maxExtraLength: number;
  curveOffset: number;
  cycleSec: number;
  phaseOffset: number;
  bulbRadius: number;
}

export interface ForgedFrameSpec {
  seed: number;
  scratches: ScratchSpec[];
  stains: CornerStainSpec[];
  drips: BloodDripSpec[];
}

function makeRng(seed: number): () => number {
  let s = (Math.abs(Math.floor(seed)) || 1337) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) + 1;
}

export function createForgedFrameSpec(
  seedInput: number | string,
  options?: {
    dripCount?: number;
    maxDripLength?: number;
    scratchCount?: number;
    stainCount?: number;
  }
): ForgedFrameSpec {
  const seed = typeof seedInput === 'string' ? hashString(seedInput) : Math.abs(seedInput) || 77;
  const rand = makeRng(seed);

  const scratchCount = options?.scratchCount ?? 4 + Math.floor(rand() * 4);
  const scratches: ScratchSpec[] = [];
  for (let i = 0; i < scratchCount; i++) {
    const angle = (rand() > 0.5 ? 1 : -1) * (0.35 + rand() * 0.8);
    const len = 14 + rand() * 34;
    scratches.push({
      x1Ratio: 0.08 + rand() * 0.84,
      y1Ratio: 0.1 + rand() * 0.8,
      dx: Math.cos(angle) * len,
      dy: Math.sin(angle) * len,
      alpha: 0.18 + rand() * 0.18,
      rusty: rand() < 0.28,
    });
  }

  const stainCount = options?.stainCount ?? 1 + Math.floor(rand() * 2);
  const corners: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3];
  for (let i = corners.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = corners[i];
    corners[i] = corners[j];
    corners[j] = tmp;
  }

  const stains: CornerStainSpec[] = [];
  for (let i = 0; i < Math.min(stainCount, corners.length); i++) {
    const lobes = Array.from({ length: 3 }, () => ({
      dx: (rand() - 0.5) * 18,
      dy: (rand() - 0.5) * 14,
      r: 5 + rand() * 9,
    }));
    stains.push({
      corner: corners[i],
      radiusX: 12 + rand() * 14,
      radiusY: 9 + rand() * 11,
      offsetX: 6 + rand() * 14,
      offsetY: 6 + rand() * 12,
      lobes,
    });
  }

  const dripCount = options?.dripCount ?? 2 + Math.floor(rand() * 3); // 2-4 drips
  const maxDripLength = options?.maxDripLength ?? 22;
  const drips: BloodDripSpec[] = [];

  for (let i = 0; i < dripCount; i++) {
    const baseRatio = (i + 0.35 + rand() * 0.45) / dripCount;
    const xRatio = Math.max(0.09, Math.min(0.91, baseRatio));
    const baseLen = Math.max(6, maxDripLength * (0.35 + rand() * 0.35));
    const extraLen = Math.max(4, maxDripLength * (0.28 + rand() * 0.32));
    const width = 2.6 + rand() * 2.4;
    drips.push({
      xRatio,
      width,
      baseLength: baseLen,
      maxExtraLength: extraLen,
      curveOffset: (rand() - 0.5) * 3.2,
      cycleSec: 10 + rand() * 8,
      phaseOffset: rand() * 12,
      bulbRadius: width * (0.72 + rand() * 0.25),
    });
  }

  return { seed, scratches, stains, drips };
}

/**
 * Computes normalized drip extension [0..1] for slowly lengthening blood drips.
 * Slowly stretches downward over ~85% of the cycle, swells, then smoothly resets.
 */
export function getDripProgress(elapsedSec: number, drip: BloodDripSpec): number {
  const t = ((elapsedSec + drip.phaseOffset) % drip.cycleSec) / drip.cycleSec;
  if (t < 0.82) {
    // Slow viscous creep downward
    const p = t / 0.82;
    return p * p * (3 - 2 * p);
  }
  // Brief swell & retraction fade before next creep
  const tail = (t - 0.82) / 0.18;
  return 1 - tail;
}

/**
 * Draws a forged-iron panel/button frame directly into a Phaser.GameObjects.Graphics instance.
 * Used by UIScene for authentic Phaser Graphics iron plates, bevels, rivets, scratches & drips.
 */
export function drawForgedIronPhaserFrame(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  spec: ForgedFrameSpec,
  elapsedSec: number,
  opts?: {
    radius?: number;
    hovered?: boolean;
    pressed?: boolean;
    borderColor?: number;
    glowColor?: number;
    showDrips?: boolean;
    fillAlpha?: number;
  }
) {
  const r = Math.min(opts?.radius ?? 10, w * 0.25, h * 0.25);
  const hovered = Boolean(opts?.hovered);
  const pressed = Boolean(opts?.pressed);
  const fillAlpha = opts?.fillAlpha ?? 0.94;
  const activeBorder =
    opts?.borderColor ??
    (pressed || hovered ? BLOOD_IRON_HEX.freshBlood : BLOOD_IRON_HEX.steel);
  const glowColor = opts?.glowColor ?? BLOOD_IRON_HEX.bloodGlow;

  g.clear();

  // Outer soft blood-red glow on hover/press or explicit glow
  if (hovered || pressed || opts?.borderColor) {
    const glowAlpha = pressed ? 0.34 : hovered ? 0.22 : 0.14;
    g.lineStyle(5, glowColor, glowAlpha);
    g.strokeRoundedRect(x - 1.5, y - 1.5, w + 3, h + 3, r + 1.5);
  }

  // Drop shadow behind plate
  g.fillStyle(0x040507, 0.72);
  g.fillRoundedRect(x + 1, y + 3, w, h, r);

  // Dark forged-iron gradient fill
  const topLeftCol = pressed ? 0x22181b : hovered ? 0x23252a : 0x202329;
  const bottomRightCol = pressed ? 0x100b0d : 0x0e1013;
  g.fillGradientStyle(topLeftCol, topLeftCol, bottomRightCol, bottomRightCol, fillAlpha);
  g.fillRoundedRect(x, y, w, h, r);

  // Dried-blood stains in corners (#3a0a0e)
  for (const stain of spec.stains) {
    const cx =
      stain.corner === 0 || stain.corner === 2
        ? x + Math.min(w * 0.35, stain.offsetX)
        : x + w - Math.min(w * 0.35, stain.offsetX);
    const cy =
      stain.corner === 0 || stain.corner === 1
        ? y + Math.min(h * 0.35, stain.offsetY)
        : y + h - Math.min(h * 0.35, stain.offsetY);
    g.fillStyle(BLOOD_IRON_HEX.driedBlood, 0.58);
    g.fillEllipse(cx, cy, stain.radiusX * 0.9, stain.radiusY * 0.85);
    for (const lobe of stain.lobes) {
      g.fillCircle(cx + lobe.dx * 0.45, cy + lobe.dy * 0.45, lobe.r * 0.45);
    }
  }

  // Subtle surface scratches
  for (const sc of spec.scratches) {
    const sx = x + sc.x1Ratio * w;
    const sy = y + sc.y1Ratio * h;
    const ex = Phaser.Math.Clamp(sx + sc.dx * 0.55, x + 5, x + w - 5);
    const ey = Phaser.Math.Clamp(sy + sc.dy * 0.55, y + 5, y + h - 5);
    g.lineStyle(1, 0x08090b, sc.alpha * 1.15);
    g.lineBetween(sx, sy, ex, ey);
    g.lineStyle(1, sc.rusty ? BLOOD_IRON_HEX.rust : BLOOD_IRON_HEX.steelHighlight, sc.alpha);
    g.lineBetween(sx + 0.8, sy + 0.8, ex + 0.8, ey + 0.8);
  }

  // 2px steel highlight on top & left edge
  const inset = 2;
  g.lineStyle(2, hovered || pressed ? BLOOD_IRON_HEX.freshBlood : BLOOD_IRON_HEX.steelHighlight, pressed ? 0.65 : 0.72);
  g.beginPath();
  g.moveTo(x + inset, y + h - r);
  g.lineTo(x + inset, y + r);
  g.lineTo(x + r, y + inset);
  g.lineTo(x + w - r, y + inset);
  g.strokePath();

  // 2px dark shadow on bottom & right edge
  g.lineStyle(2, BLOOD_IRON_HEX.steelShadow, 0.92);
  g.beginPath();
  g.moveTo(x + w - inset, y + r);
  g.lineTo(x + w - inset, y + h - r);
  g.lineTo(x + w - r, y + h - inset);
  g.lineTo(x + r, y + h - inset);
  g.strokePath();

  // Outer perimeter border
  g.lineStyle(pressed || hovered ? 1.75 : 1.25, activeBorder, 1);
  g.strokeRoundedRect(x, y, w, h, r);

  // Corner forged rivets
  const rivOffset = Math.min(8.5, w * 0.16, h * 0.16);
  const rivetCoords = [
    [x + rivOffset, y + rivOffset],
    [x + w - rivOffset, y + rivOffset],
    [x + rivOffset, y + h - rivOffset],
    [x + w - rivOffset, y + h - rivOffset],
  ];
  for (const [rx, ry] of rivetCoords) {
    g.fillStyle(0x07080a, 0.95);
    g.fillCircle(rx, ry, 2.6);
    g.fillStyle(BLOOD_IRON_HEX.steel, 1);
    g.fillCircle(rx, ry, 2.0);
    g.fillStyle(0x7c8594, 0.85);
    g.fillCircle(rx - 0.6, ry - 0.6, 0.8);
  }

  // 2-4 blood drips running down from top edge (slowly lengthening)
  if (opts?.showDrips !== false) {
    for (const drip of spec.drips) {
      const progress = getDripProgress(elapsedSec, drip);
      const dripLen = Math.min(h * 0.42, drip.baseLength * 0.55 + drip.maxExtraLength * 0.45 * progress);
      const dx = x + drip.xRatio * w;
      const dy = y + 1.5;
      const neckW = Math.max(1.5, drip.width * 0.48);

      // Pool at top seam
      g.fillStyle(BLOOD_IRON_HEX.driedBlood, 0.92);
      g.fillEllipse(dx, dy + 1, drip.width * 2.1, 3.2);

      // Drip stem
      g.fillStyle(BLOOD_IRON_HEX.freshBlood, 0.9);
      g.fillTriangle(
        dx - neckW,
        dy,
        dx + neckW,
        dy,
        dx + drip.curveOffset * 0.35,
        dy + dripLen
      );

      // Bulbous drop tip
      const tipX = dx + drip.curveOffset * 0.35;
      const tipY = dy + dripLen;
      g.fillStyle(BLOOD_IRON_HEX.freshBlood, 0.96);
      g.fillCircle(tipX, tipY, drip.bulbRadius * 0.72);
      g.fillStyle(BLOOD_IRON_HEX.bloodGlow, 0.8);
      g.fillCircle(tipX - 0.5, tipY - 0.5, Math.max(0.7, drip.bulbRadius * 0.28));
    }
  }
}
