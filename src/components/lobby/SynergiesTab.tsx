import React, { useEffect, useMemo, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';
import { RELICS, RELIC_SETS, getActiveRelicSynergies } from '../../game/relics';
import {
  ARCANE_WEAPONS,
  ArcaneWeaponId,
  ELEMENTAL_SYNERGIES,
  RELIC_SET_INTERACTION_GUIDE,
  getElementalSynergy,
} from '../../game/synergies';
import { RelicId, RelicSetId } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { NineSlice } from '../ui/NineSlice';
import { UiButton } from '../ui/UiButton';
import { UI_SPRITES } from '../ui/uiConfig';

interface SynergiesTabProps {
  unlockedRelics: RelicId[];
  equippedRelicIds: RelicId[];
  onOpenRelicsTab: () => void;
  onRequestScrollTop?: () => void;
}

const SET_ORDER: RelicSetId[] = ['fire', 'shadow', 'tempest'];

const WEAPON_SHORT_LABELS: Record<ArcaneWeaponId, string> = {
  bolt: 'Bolt',
  blades: 'Blades',
  ring: 'Nova',
  spark: 'Sparks',
  shotgun: 'Scatter',
};

const SET_SHORT_LABELS: Record<RelicSetId, string> = {
  fire: 'Fire',
  shadow: 'Shadow',
  tempest: 'Tempest',
};

interface DummyTarget {
  angle: number;
  distRatio: number;
  hitFlash: number;
}

function drawVisualPreviewFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  weaponId: ArcaneWeaponId,
  setId: RelicSetId,
  primaryColor: string,
  secondaryColor: string,
  dummies: DummyTarget[]
) {
  const cx = width * 0.5;
  const cy = height * 0.52;
  const t = timeMs * 0.001;

  ctx.clearRect(0, 0, width, height);
  const bgGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, Math.max(width, height) * 0.72);
  bgGrad.addColorStop(0, '#161b24');
  bgGrad.addColorStop(0.55, '#0d1016');
  bgGrad.addColorStop(1, '#06070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(130, 145, 168, 0.06)';
  ctx.lineWidth = 1;
  const tile = 32;
  for (let gx = (cx % tile) - tile; gx < width; gx += tile) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = (cy % tile) - tile; gy < height; gy += tile) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  const baseRadius = Math.min(width, height) * 0.34;
  const rangeRadius = setId === 'fire' ? baseRadius * 1.24 : baseRadius;
  const pulse = 0.96 + 0.04 * Math.sin(t * 4.2);

  const lightGrad = ctx.createRadialGradient(cx, cy, 6, cx, cy, rangeRadius * pulse);
  if (setId === 'fire') {
    lightGrad.addColorStop(0, 'rgba(255, 184, 102, 0.30)');
    lightGrad.addColorStop(0.55, 'rgba(255, 122, 51, 0.14)');
    lightGrad.addColorStop(1, 'rgba(255, 122, 51, 0)');
  } else if (setId === 'shadow') {
    lightGrad.addColorStop(0, 'rgba(229, 48, 58, 0.24)');
    lightGrad.addColorStop(0.55, 'rgba(147, 51, 234, 0.12)');
    lightGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
  } else {
    lightGrad.addColorStop(0, 'rgba(93, 228, 255, 0.28)');
    lightGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.12)');
    lightGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  }
  ctx.fillStyle = lightGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, rangeRadius * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.lineDashOffset = -t * 18;
  ctx.strokeStyle =
    setId === 'fire'
      ? 'rgba(255, 152, 71, 0.45)'
      : setId === 'shadow'
        ? 'rgba(229, 48, 58, 0.42)'
        : 'rgba(93, 228, 255, 0.45)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(cx, cy, rangeRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (setId === 'fire') {
    for (let i = 0; i < 8; i++) {
      const phase = (t * 0.75 + i * 0.125) % 1;
      const ang = i * ((Math.PI * 2) / 8) + t * 0.45;
      const r = 24 + phase * (rangeRadius * 0.9);
      const ex = cx + Math.cos(ang) * r;
      const ey = cy + Math.sin(ang) * r - phase * 10;
      ctx.fillStyle = `rgba(255, 172, 82, ${(1 - phase) * 0.75})`;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2 * (1 - phase * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (setId === 'shadow') {
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.4 + (i * Math.PI) / 2;
      const sx = cx + Math.cos(ang) * (rangeRadius * 0.52);
      const sy = cy + Math.sin(ang) * (rangeRadius * 0.52);
      ctx.strokeStyle = 'rgba(229, 48, 58, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy);
      ctx.lineTo(sx, sy - 5);
      ctx.lineTo(sx + 4, sy);
      ctx.lineTo(sx, sy + 5);
      ctx.closePath();
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = 'rgba(93, 228, 255, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const startAng = t * 2.8 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(cx, cy, rangeRadius * (0.48 + i * 0.18), startAng, startAng + 0.85);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const pull = (t * 0.9 + i * 0.2) % 1;
      const ang = i * 1.25 + pull * 1.6;
      const r = rangeRadius * 1.15 * (1 - pull);
      ctx.fillStyle = `rgba(125, 249, 255, ${Math.sin(pull * Math.PI) * 0.85})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const foeCoords = dummies.map((d) => ({
    x: cx + Math.cos(d.angle) * (rangeRadius * d.distRatio),
    y: cy + Math.sin(d.angle) * (rangeRadius * d.distRatio),
    hit: false,
  }));

  const cycleSpeed = setId === 'fire' ? 1.15 : setId === 'tempest' ? 1.08 : 1.0;

  if (weaponId === 'bolt') {
    const cycle = (t * 1.25 * cycleSpeed) % 1;
    const targetAng = Math.floor(t * 1.25 * cycleSpeed) * 1.26;
    const spreads = [-0.22, 0, 0.22];
    const maxTravel = rangeRadius * (setId === 'shadow' ? 1.08 : 0.96);

    spreads.forEach((sp, idx) => {
      const ang = targetAng + sp;
      const dist = 16 + cycle * maxTravel;
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;
      const tailDist = Math.max(10, dist - (setId === 'shadow' ? 28 : 20));
      const tx = cx + Math.cos(ang) * tailDist;
      const ty = cy + Math.sin(ang) * tailDist;

      ctx.strokeStyle = idx === 1 ? primaryColor : secondaryColor;
      ctx.lineWidth = setId === 'shadow' ? 3.5 : 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, setId === 'shadow' ? 3.2 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (setId === 'shadow' && cycle > 0.45 && cycle < 0.8) {
        ctx.strokeStyle = 'rgba(229, 48, 58, 0.78)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(px, py, 8 * (cycle - 0.4), 0, Math.PI * 2);
        ctx.stroke();
      }

      foeCoords.forEach((f) => {
        if (Math.hypot(f.x - px, f.y - py) < 20) f.hit = true;
      });
    });
  } else if (weaponId === 'blades') {
    const bladeCount = setId === 'tempest' ? 4 : 3;
    const orbitR = rangeRadius * (setId === 'fire' ? 0.56 : 0.5);
    const rotSpeed = setId === 'tempest' ? 3.6 : 2.4;

    ctx.strokeStyle =
      setId === 'shadow' ? 'rgba(229, 48, 58, 0.28)' : 'rgba(93, 228, 255, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < bladeCount; i++) {
      const ang = t * rotSpeed + (i * Math.PI * 2) / bladeCount;
      const bx = cx + Math.cos(ang) * orbitR;
      const by = cy + Math.sin(ang) * orbitR;

      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, orbitR, ang - 0.36, ang);
      ctx.stroke();

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang + Math.PI * 0.5);
      ctx.fillStyle = secondaryColor;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(9, 0, 0, 10);
      ctx.quadraticCurveTo(3, 0, 0, -10);
      ctx.fill();
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      foeCoords.forEach((f) => {
        if (Math.hypot(f.x - bx, f.y - by) < 24) f.hit = true;
      });
    }
  } else if (weaponId === 'ring') {
    const cycle = (t * 0.85 * cycleSpeed) % 1;
    const waveR = Math.max(12, cycle * rangeRadius);
    const alpha = Math.max(0, 1 - cycle);

    ctx.strokeStyle = primaryColor;
    ctx.globalAlpha = alpha * 0.9;
    ctx.lineWidth = setId === 'fire' ? 4 : 3;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.stroke();

    if (cycle > 0.14) {
      ctx.strokeStyle = secondaryColor;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, waveR * 0.78, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    foeCoords.forEach((f) => {
      const fd = Math.hypot(f.x - cx, f.y - cy);
      if (Math.abs(fd - waveR) < 16) f.hit = true;
    });
  } else if (weaponId === 'spark') {
    const cycle = (t * 1.1 * cycleSpeed) % 1;
    const sparkCount = 9;
    const maxDist = rangeRadius * 0.96;

    for (let i = 0; i < sparkCount; i++) {
      const ang = (i * Math.PI * 2) / sparkCount + Math.floor(t * 1.1 * cycleSpeed) * 0.35;
      const d = 14 + cycle * maxDist;
      const sx = cx + Math.cos(ang) * d;
      const sy = cy + Math.sin(ang) * d;
      const prevD = Math.max(10, d - 16);
      const spin = t * (i % 2 === 0 ? 16 : -16) + i * 0.9;

      ctx.strokeStyle = i % 2 === 0 ? '#34f5ae' : '#3ae8ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * prevD, cy + Math.sin(ang) * prevD);
      ctx.lineTo(sx, sy);
      ctx.stroke();

      // Spinning mint-emerald starburst + aqua-cyan 4-point sparkle
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(spin);

      ctx.fillStyle = '#34f5ae';
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const ka = (k / 10) * Math.PI * 2;
        const kr = k % 2 === 0 ? 8.2 : 3.2;
        const kx = Math.cos(ka) * kr;
        const ky = Math.sin(ka) * kr;
        if (k === 0) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#7bf6ff';
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const ka = (k / 8) * Math.PI * 2;
        const kr = k % 2 === 0 ? 6.4 : 1.9;
        const kx = Math.cos(ka) * kr;
        const ky = Math.sin(ka) * kr;
        if (k === 0) ctx.moveTo(kx, ky);
        else ctx.lineTo(kx, ky);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#f0fffb';
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      foeCoords.forEach((f) => {
        if (Math.hypot(f.x - sx, f.y - sy) < 18) f.hit = true;
      });
    }
  } else {
    const cycle = (t * 1.2 * cycleSpeed) % 1;
    const aimAngle = Math.sin(t * 0.7) * 0.65 - 0.15;
    const fan = [-0.18, 0, 0.18];
    const maxDist = rangeRadius * (setId === 'fire' ? 1.05 : 0.94);

    ctx.fillStyle =
      setId === 'shadow'
        ? 'rgba(229, 48, 58, 0.08)'
        : setId === 'fire'
          ? 'rgba(255, 138, 61, 0.09)'
          : 'rgba(93, 228, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxDist, aimAngle - 0.25, aimAngle + 0.25);
    ctx.closePath();
    ctx.fill();

    fan.forEach((offset, idx) => {
      const ang = aimAngle + offset;
      const d = 16 + cycle * maxDist;
      const px = cx + Math.cos(ang) * d;
      const py = cy + Math.sin(ang) * d;
      const tx = cx + Math.cos(ang) * Math.max(10, d - 24);
      const ty = cy + Math.sin(ang) * Math.max(10, d - 24);

      ctx.strokeStyle = idx === 1 ? primaryColor : secondaryColor;
      ctx.lineWidth = setId === 'shadow' ? 4 : 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.stroke();

      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(px, py, 2.8, 0, Math.PI * 2);
      ctx.fill();

      foeCoords.forEach((f) => {
        if (Math.hypot(f.x - px, f.y - py) < 22) f.hit = true;
      });
    });
  }

  foeCoords.forEach((f) => {
    ctx.fillStyle = f.hit ? primaryColor : 'rgba(28, 24, 36, 0.92)';
    ctx.strokeStyle = f.hit ? '#ffffff' : 'rgba(196, 76, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = f.hit ? '#ffffff' : '#e5303a';
    ctx.fillRect(f.x - 3, f.y - 1.5, 2, 2);
    ctx.fillRect(f.x + 1, f.y - 1.5, 2, 2);
  });

  ctx.fillStyle = '#0c0f15';
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8efd6';
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fill();
}

export const SynergiesTab: React.FC<SynergiesTabProps> = ({
  unlockedRelics,
  equippedRelicIds,
  onOpenRelicsTab,
  onRequestScrollTop,
}) => {
  const activeSynergies = useMemo(
    () => getActiveRelicSynergies(equippedRelicIds),
    [equippedRelicIds]
  );

  const [selectedSetId, setSelectedSetId] = useState<RelicSetId>(
    () => activeSynergies[0]?.id ?? 'fire'
  );
  const [selectedWeaponId, setSelectedWeaponId] = useState<ArcaneWeaponId>(
    () => RELIC_SET_INTERACTION_GUIDE[activeSynergies[0]?.id ?? 'fire'].previewPrimaryWeapon
  );
  const [isPausedFx, setIsPausedFx] = useState<boolean>(false);
  const [comboFilter, setComboFilter] = useState<'core' | 'all'>('core');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedCombo = useMemo(
    () => getElementalSynergy(selectedWeaponId, selectedSetId),
    [selectedWeaponId, selectedSetId]
  );
  const selectedWeaponMeta = useMemo(
    () => ARCANE_WEAPONS.find((w) => w.id === selectedWeaponId) ?? ARCANE_WEAPONS[0],
    [selectedWeaponId]
  );
  const selectedSetMeta = RELIC_SETS[selectedSetId];

  const dummies = useMemo<DummyTarget[]>(
    () => [
      { angle: -0.22, distRatio: 0.72, hitFlash: 0 },
      { angle: 0.42, distRatio: 0.84, hitFlash: 0 },
      { angle: 1.55, distRatio: 0.66, hitFlash: 0 },
      { angle: 2.55, distRatio: 0.82, hitFlash: 0 },
      { angle: -2.15, distRatio: 0.74, hitFlash: 0 },
      { angle: -1.05, distRatio: 0.64, hitFlash: 0 },
    ],
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const targetW = Math.max(240, Math.round(rect.width * dpr));
      const targetH = Math.max(140, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    resize();

    const renderStatic = () => {
      resize();
      ctx.save();
      ctx.scale(dpr, dpr);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      drawVisualPreviewFrame(
        ctx,
        cssW,
        cssH,
        1450,
        selectedWeaponId,
        selectedSetId,
        selectedCombo.primaryColor,
        selectedCombo.secondaryColor,
        dummies
      );
      ctx.restore();
    };

    if (prefersReducedMotion || isPausedFx) {
      renderStatic();
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      resize();
      ctx.save();
      ctx.scale(dpr, dpr);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      drawVisualPreviewFrame(
        ctx,
        cssW,
        cssH,
        now - start + 650,
        selectedWeaponId,
        selectedSetId,
        selectedCombo.primaryColor,
        selectedCombo.secondaryColor,
        dummies
      );
      ctx.restore();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [
    selectedWeaponId,
    selectedSetId,
    selectedCombo.primaryColor,
    selectedCombo.secondaryColor,
    isPausedFx,
    dummies,
  ]);

  const countEquippedInSet = (setId: RelicSetId) =>
    equippedRelicIds.filter((id) => RELICS.find((r) => r.id === id)?.setId === setId).length;

  const handleSelectCombo = (weaponId: ArcaneWeaponId, setId: RelicSetId) => {
    soundManager.playUiClick();
    haptics.tap('light');
    setSelectedWeaponId(weaponId);
    setSelectedSetId(setId);
    onRequestScrollTop?.();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Interactive Elemental Synergy Forge */}
      <NineSlice
        variant="cardOrnateGold"
        tileTexture="stone"
        highlight="gold"
        padding="0px"
        contentClassName="p-3 flex flex-col gap-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xs tracking-[0.14em] uppercase text-[#f2a93b]">
              Elemental Synergy Forge
            </h2>
            <p className="font-body text-xs text-[#b5a589] leading-snug">
              Combine an arcane weapon with a relic set to preview its elemental effect
            </p>
          </div>

          <UiButton
            tone="iron"
            size="xs"
            onClick={() => {
              soundManager.playUiClick();
              setIsPausedFx((prev) => !prev);
            }}
          >
            {isPausedFx ? 'Play FX' : 'Pause FX'}
          </UiButton>
        </div>

        {/* Selector Row A: 5 Arcane Weapons */}
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] font-semibold text-[#9c8e72]">
            Arcane Weapon
          </span>
          <div className="grid grid-cols-5 gap-1">
            {ARCANE_WEAPONS.map((w) => {
              const selected = selectedWeaponId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    soundManager.playUiClick();
                    haptics.tap('light');
                    setSelectedWeaponId(w.id);
                  }}
                  aria-pressed={selected}
                  className="cursor-pointer transition-transform active:scale-95"
                >
                  <NineSlice
                    variant="miniPlate"
                    tileTexture="row"
                    highlight={selected ? 'gold' : 'none'}
                    borderWidth="4px 6px"
                    padding="0px"
                    contentClassName="min-h-[54px] px-1 py-1.5 flex flex-col items-center justify-center gap-1"
                  >
                    <Icon id={w.iconId} size={22} />
                    <span
                      className={`font-display font-bold text-[9.5px] leading-none whitespace-nowrap ${
                        selected ? 'text-[#fae8b8]' : 'text-[#9c8e72]'
                      }`}
                    >
                      {WEAPON_SHORT_LABELS[w.id]}
                    </span>
                  </NineSlice>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selector Row B: 3 Relic Sets */}
        <div className="flex flex-col gap-1">
          <span className="font-body text-[11px] font-semibold text-[#9c8e72]">
            Relic Set Resonance
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {SET_ORDER.map((setId) => {
              const setMeta = RELIC_SETS[setId];
              const equippedCount = countEquippedInSet(setId);
              const selected = selectedSetId === setId;
              return (
                <UiButton
                  key={setId}
                  tone={selected ? 'blood' : 'iron'}
                  active={selected}
                  size="sm"
                  aria-pressed={selected}
                  onClick={() => {
                    soundManager.playUiClick();
                    setSelectedSetId(setId);
                  }}
                >
                  <Icon id={setMeta.synergyTitle} size={18} alt={setMeta.synergyTitle} />
                  <span>
                    {SET_SHORT_LABELS[setId]} ({equippedCount}/2)
                  </span>
                </UiButton>
              );
            })}
          </div>
        </div>

        {/* Live Elemental Visual Preview Stage */}
        <div
          className="relative w-full h-[176px] rounded-[8px] border border-[#3a3f47] overflow-hidden bg-[#07090d]"
          style={{
            boxShadow: `inset 0 0 28px ${selectedCombo.auraColor}`,
          }}
        >
          <canvas
            ref={canvasRef}
            aria-label={`Visual preview of ${selectedCombo.comboName}`}
            className="w-full h-full block"
          />

          <div
            className="pointer-events-none absolute top-2 left-2 right-2 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] border border-[#3a3f47]/80"
            style={{ background: 'rgba(9, 11, 16, 0.88)' }}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon id={selectedWeaponMeta.iconId} size={22} />
              <span className="font-display font-bold text-xs text-[#9c8e72]">+</span>
              <Icon
                id={selectedSetMeta.synergyTitle}
                size={22}
                alt={selectedSetMeta.synergyTitle}
              />
              <span
                className="font-display font-bold text-xs sm:text-[13px] truncate"
                style={{ color: selectedCombo.primaryColor }}
              >
                {selectedCombo.comboName}
              </span>
            </div>
            {selectedCombo.isRecommended && (
              <span className="font-display font-bold text-[10px] tracking-wider uppercase text-[#f2a93b] whitespace-nowrap shrink-0">
                Core Match
              </span>
            )}
          </div>
        </div>

        {/* Resulting Elemental Combination Breakdown */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
            <span className="font-display font-bold text-[#e8dcc2]">
              {selectedWeaponMeta.name} × {selectedSetMeta.synergyTitle}
            </span>
            <span aria-hidden="true" className="text-[#6d6558]">
              ·
            </span>
            <span className="font-body font-semibold" style={{ color: selectedCombo.primaryColor }}>
              {selectedCombo.elementalFusion}
            </span>
          </div>

          <p className="font-body text-xs text-[#d8c9a8] leading-relaxed">
            {selectedCombo.interactionSummary}
          </p>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5 font-mono-numbers text-[11px] font-bold text-[#5de4ff] tabular-nums">
            {selectedCombo.statEffects.map((stat, idx) => (
              <React.Fragment key={stat}>
                {idx > 0 && (
                  <span aria-hidden="true" className="text-[#4a515e]">
                    ·
                  </span>
                )}
                <span>{stat}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </NineSlice>

      {/* Relic Sets & Arsenal Guide */}
      <section aria-labelledby="relic-sets-guide-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2
            id="relic-sets-guide-heading"
            className="font-display font-bold text-xs tracking-[0.15em] uppercase text-[#e8dcc2]"
          >
            Relic Sets &amp; Arsenal Guide
          </h2>
          <span className="font-mono-numbers text-xs text-[#9c8e72] tabular-nums">
            {activeSynergies.length}/3 Active Sets
          </span>
        </div>

        {SET_ORDER.map((setId) => {
          const setMeta = RELIC_SETS[setId];
          const guide = RELIC_SET_INTERACTION_GUIDE[setId];
          const setRelics = RELICS.filter((r) => r.setId === setId);
          const equippedCount = countEquippedInSet(setId);
          const isSetActive = equippedCount >= 2;
          const bestCombo = getElementalSynergy(guide.previewPrimaryWeapon, setId);

          return (
            <NineSlice
              key={setId}
              variant="panelIronDark"
              tileTexture="stone"
              highlight={isSetActive ? 'gold' : 'none'}
              padding="0px"
              contentClassName="p-3 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    id={setMeta.synergyTitle}
                    rarity={isSetActive ? 'legendary' : 'rare'}
                    size={42}
                    alt={setMeta.synergyTitle}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3
                        className="font-display font-bold text-sm"
                        style={{ color: setMeta.accentColor }}
                      >
                        {setMeta.synergyTitle}
                      </h3>
                      <span className="font-mono-numbers text-[11px] font-bold text-[#9c8e72] tabular-nums">
                        {setMeta.setName} Set · {equippedCount}/2
                      </span>
                    </div>
                    <p className="font-mono-numbers text-xs font-bold text-[#e8dcc2] mt-0.5">
                      {setMeta.bonusSummary}
                    </p>
                  </div>
                </div>

                {isSetActive && (
                  <div className="shrink-0 flex items-center gap-1 font-display font-bold text-[11px] text-[#f2a93b]">
                    <Icon id="ui_check" size={14} />
                    <span>ACTIVE</span>
                  </div>
                )}
              </div>

              <p className="font-body text-xs text-[#b5a589] leading-relaxed">
                {guide.coreRule}
              </p>

              <div className="grid grid-cols-2 gap-2">
                {setRelics.map((relic) => {
                  const owned = unlockedRelics.includes(relic.id);
                  const equipped = equippedRelicIds.includes(relic.id);
                  return (
                    <NineSlice
                      key={relic.id}
                      variant="miniPlate"
                      tileTexture="row"
                      padding="0px"
                      contentClassName="p-1.5 flex items-center gap-2 min-w-0"
                    >
                      <div
                        style={{ width: 32, aspectRatio: '1 / 1' }}
                        className="relative flex items-center justify-center shrink-0"
                      >
                        <img
                          src={UI_SPRITES.roundSquareSocket}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ imageRendering: 'auto' }}
                          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                        />
                        <span className="relative z-10 flex items-center justify-center">
                          <Icon id={relic.name} rarity={relic.rarity} size={26} />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display font-bold text-[11px] text-[#e8dcc2] truncate">
                          {relic.name}
                        </div>
                        <div className="font-body text-[10px] text-[#9c8e72] truncate">
                          {equipped ? 'Equipped' : owned ? 'Owned' : `${relic.cost.toLocaleString()} Coins`}
                        </div>
                      </div>
                    </NineSlice>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <UiButton
                  tone="blood"
                  size="sm"
                  onClick={() => handleSelectCombo(guide.previewPrimaryWeapon, setId)}
                  className="flex-1"
                >
                  Preview {bestCombo.comboName}
                </UiButton>
                <UiButton
                  tone="iron"
                  size="sm"
                  onClick={() => {
                    soundManager.playUiClick();
                    onOpenRelicsTab();
                  }}
                >
                  Open Relics
                </UiButton>
              </div>
            </NineSlice>
          );
        })}
      </section>

      {/* Arcane Combinations Index */}
      <section aria-labelledby="combo-index-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2
            id="combo-index-heading"
            className="font-display font-bold text-xs tracking-[0.15em] uppercase text-[#e8dcc2]"
          >
            Arcane Combinations
          </h2>

          <div className="flex items-center gap-1 shrink-0">
            <UiButton
              tone={comboFilter === 'core' ? 'blood' : 'iron'}
              active={comboFilter === 'core'}
              size="xs"
              aria-pressed={comboFilter === 'core'}
              onClick={() => {
                soundManager.playUiClick();
                setComboFilter('core');
              }}
            >
              Core (3)
            </UiButton>
            <UiButton
              tone={comboFilter === 'all' ? 'blood' : 'iron'}
              active={comboFilter === 'all'}
              size="xs"
              aria-pressed={comboFilter === 'all'}
              onClick={() => {
                soundManager.playUiClick();
                setComboFilter('all');
              }}
            >
              All ({ELEMENTAL_SYNERGIES.length})
            </UiButton>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {(comboFilter === 'core'
            ? ELEMENTAL_SYNERGIES.filter((s) => s.isRecommended)
            : ELEMENTAL_SYNERGIES
          ).map((combo) => {
            const wMeta = ARCANE_WEAPONS.find((w) => w.id === combo.weaponId)!;
            const sMeta = RELIC_SETS[combo.setId];
            const isSelected =
              selectedWeaponId === combo.weaponId && selectedSetId === combo.setId;

            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => handleSelectCombo(combo.weaponId, combo.setId)}
                className="w-full text-left cursor-pointer transition-transform active:scale-[0.98]"
              >
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight={isSelected ? 'gold' : 'none'}
                  padding="0px"
                  contentClassName="p-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon id={wMeta.iconId} size={28} />
                    <Icon id={sMeta.synergyTitle} size={26} alt={sMeta.synergyTitle} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="font-display font-bold text-xs leading-tight truncate"
                          style={{ color: combo.primaryColor }}
                        >
                          {combo.comboName}
                        </span>
                        {combo.isRecommended && comboFilter === 'all' && (
                          <span className="font-display font-bold text-[9px] tracking-wider uppercase text-[#f2a93b] whitespace-nowrap shrink-0">
                            Core
                          </span>
                        )}
                      </div>
                      <div className="font-body text-[11px] text-[#b5a589] truncate">
                        {wMeta.name} + {sMeta.synergyTitle} · {combo.statEffects[0]}
                      </div>
                    </div>
                  </div>
                  <span className="font-display font-bold text-[10px] tracking-wider uppercase text-[#f2a93b] whitespace-nowrap shrink-0">
                    {isSelected ? 'Viewing' : 'Preview'}
                  </span>
                </NineSlice>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
