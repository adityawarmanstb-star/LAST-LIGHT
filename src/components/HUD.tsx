import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveDynamicChallenge,
  BossInfo,
  EventWarningInfo,
  RelicDefinition,
  RelicId,
  RelicSetId,
  WeaponState,
} from '../game/types';
import { IconRarity } from '../game/iconRegistry';
import { RELIC_SETS, getRelicById } from '../game/relics';
import { VirtualJoystick } from './VirtualJoystick';
import { Icon } from './Icon';
import { IronCard } from './IronCard';
import { BloodHpBar } from './BloodHpBar';
import { BloodSplatterHit, BloodSplatterOverlay } from './BloodSplatterOverlay';
import { BossHealthOverlay } from './BossHealthOverlay';
import { CritImpactPayload, gameManager } from '../game/GameManager';
import { preloadAllChromaKeyUiAssets } from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';

interface HUDProps {
  hp: number;
  maxHp: number;
  xp: number;
  nextXp: number;
  level: number;
  time: number;
  kills: number;
  coins: number;
  weapons: WeaponState[];
  boss: BossInfo | null;
  combo: number;
  isUnderPressure: boolean;
  lightShardRemainingSec?: number;
  redShardRemainingSec?: number;
  darknessFallsRemainingSec?: number;
  bloodFogRemainingSec?: number;
  bloodFogTier?: number;
  activeChallenge?: ActiveDynamicChallenge | null;
  dashCharges?: number;
  maxDashCharges?: number;
  dashCooldownProgress?: number;
  equippedRelicIds?: RelicId[];
  activeRelicSynergies?: RelicSetId[];
  eventWarning: EventWarningInfo | null;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onSpawnBossNow: () => void;
  onTriggerDash: () => void;
}

export function getWeaponFrameRarity(weapon: WeaponState): IconRarity {
  if (weapon.level >= weapon.maxLevel) return 'legendary';
  if (weapon.level >= 4) return 'epic';
  if (weapon.level >= 2) return 'rare';
  return 'common';
}

const DASH_RING_RADIUS = 29;
const DASH_RING_CIRCUMFERENCE = 2 * Math.PI * DASH_RING_RADIUS;

const SLIM_BADGE_STYLE: React.CSSProperties = {
  background: 'rgba(10, 14, 20, 0.68)',
  padding: '3px 8px',
  fontSize: '10px',
  maxWidth: '155px',
};

const HUDComponent: React.FC<HUDProps> = ({
  hp,
  maxHp,
  xp,
  nextXp,
  level,
  time,
  kills,
  coins,
  weapons,
  boss,
  combo,
  isUnderPressure,
  lightShardRemainingSec = 0,
  redShardRemainingSec = 0,
  darknessFallsRemainingSec = 0,
  bloodFogRemainingSec = 0,
  bloodFogTier = 0,
  activeChallenge = null,
  dashCharges = 1,
  maxDashCharges = 1,
  dashCooldownProgress = 1,
  equippedRelicIds = [],
  activeRelicSynergies = [],
  eventWarning,
  onTogglePause,
  onSpawnBossNow,
  onTriggerDash,
}) => {
  const prevCoinsRef = useRef<number>(coins);
  const prevLevelRef = useRef<number>(level);
  const prevHpRef = useRef<number>(hp);
  const splatterSeqRef = useRef<number>(0);
  const splatterTimerRef = useRef<number | null>(null);
  const critFlashTimerRef = useRef<number | null>(null);
  const [coinPopSeq, setCoinPopSeq] = useState<number>(0);
  const [levelPopSeq, setLevelPopSeq] = useState<number>(0);
  const [splatterHit, setSplatterHit] = useState<BloodSplatterHit | null>(null);
  const [critFlash, setCritFlash] = useState<CritImpactPayload | null>(null);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
  }, []);

  useEffect(() => {
    if (coins > prevCoinsRef.current) {
      setCoinPopSeq((seq) => seq + 1);
    }
    prevCoinsRef.current = coins;
  }, [coins]);

  useEffect(() => {
    if (level > prevLevelRef.current) {
      setLevelPopSeq((seq) => seq + 1);
    }
    prevLevelRef.current = level;
  }, [level]);

  useEffect(() => {
    const prevHp = prevHpRef.current;
    if (hp < prevHp - 0.01) {
      const dmgFraction = (prevHp - hp) / Math.max(1, maxHp);
      const intensity = Math.max(0.4, Math.min(1, dmgFraction / 0.35));
      splatterSeqRef.current += 1;
      setSplatterHit({ seq: splatterSeqRef.current, intensity });

      if (splatterTimerRef.current !== null) {
        window.clearTimeout(splatterTimerRef.current);
      }
      splatterTimerRef.current = window.setTimeout(() => {
        splatterTimerRef.current = null;
        setSplatterHit(null);
      }, 620);
    }
    prevHpRef.current = hp;
  }, [hp, maxHp]);

  useEffect(() => {
    const unsubCrit = gameManager.onCritImpact((impact) => {
      setCritFlash(impact);
      if (critFlashTimerRef.current !== null) {
        window.clearTimeout(critFlashTimerRef.current);
      }
      critFlashTimerRef.current = window.setTimeout(() => {
        critFlashTimerRef.current = null;
        setCritFlash(null);
      }, 210);
    });

    return () => {
      unsubCrit();
      if (splatterTimerRef.current !== null) {
        window.clearTimeout(splatterTimerRef.current);
        splatterTimerRef.current = null;
      }
      if (critFlashTimerRef.current !== null) {
        window.clearTimeout(critFlashTimerRef.current);
        critFlashTimerRef.current = null;
      }
    };
  }, []);

  const hpRatio = hp / Math.max(1, maxHp);
  const isLowHp = hp > 0 && hpRatio < 0.3;
  const xpPercent = Math.max(0, Math.min(100, (xp / Math.max(1, nextXp)) * 100));

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const bossCountdown = Math.max(0, 300 - time);
  const bossMins = Math.floor(bossCountdown / 60);
  const bossSecs = bossCountdown % 60;
  const bossTimeStr = `${bossMins}:${String(bossSecs).padStart(2, '0')}`;

  const unlockedWeapons = weapons.filter((w) => w.unlocked);
  const equippedRelics = equippedRelicIds
    .map((id) => getRelicById(id))
    .filter((relic): relic is RelicDefinition => relic !== null);
  const activeSynergySet = new Set(activeRelicSynergies);

  const dashReady = dashCharges > 0;
  const ringProgress = dashReady
    ? 1
    : Math.max(0, Math.min(1, dashCooldownProgress));
  const ringDashOffset = DASH_RING_CIRCUMFERENCE * (1 - ringProgress);

  const hasSubLeftBadges =
    combo > 1 ||
    isUnderPressure ||
    lightShardRemainingSec > 0 ||
    redShardRemainingSec > 0 ||
    darknessFallsRemainingSec > 0 ||
    bloodFogRemainingSec > 0 ||
    Boolean(activeChallenge);

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-20 overflow-hidden">
      {/* Full-screen Virtual Joystick underneath HUD controls */}
      <VirtualJoystick />

      {/* Visceral screen-edge blood splatter flash when taking damage */}
      <BloodSplatterOverlay hit={splatterHit} />

      {/* Critical hit color-flashing hit-stop screen pulse */}
      {critFlash && (
        <div
          key={`crit-flash-${critFlash.seq}`}
          aria-hidden="true"
          className="fixed inset-0 z-25 pointer-events-none crit-color-flash"
          style={{
            background: `radial-gradient(ellipse at center, transparent 54%, ${critFlash.flashColorHex}38 86%, ${critFlash.flashColorHex}68 100%)`,
          }}
        />
      )}

      {/* Screen-wide Horde Frenzy Blood Fog atmosphere (30s event) */}
      {bloodFogRemainingSec > 0 && (
        <div aria-hidden="true" className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
          <div
            className="absolute -inset-12 blood-fog-drift-a"
            style={{
              background:
                'radial-gradient(circle at 22% 28%, rgba(179, 18, 26, 0.28) 0%, transparent 48%), radial-gradient(circle at 78% 72%, rgba(229, 48, 58, 0.24) 0%, transparent 50%), radial-gradient(ellipse at center, transparent 42%, rgba(92, 8, 14, 0.56) 84%, rgba(179, 18, 26, 0.78) 100%)',
            }}
          />
        </div>
      )}

      {/* Low HP pulsing blood-red screen edge vignette */}
      {isLowHp && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-25 pointer-events-none low-hp-vignette"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 48%, rgba(58, 10, 14, 0.56) 78%, rgba(179, 18, 26, 0.82) 100%)',
          }}
        />
      )}

      {/* Event warning screen-edge blood flash */}
      {eventWarning && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 pointer-events-none animate-pulse"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 62%, rgba(229, 48, 58, 0.45) 100%)',
          }}
        />
      )}

      {/* Top Slim HUD Bar + Non-Intrusive Sub-Header */}
      <div
        className="relative z-20 w-full pointer-events-none"
        style={{
          paddingTop: 'max(8px, env(safe-area-inset-top))',
          paddingLeft: 'max(10px, env(safe-area-inset-left))',
          paddingRight: 'max(10px, env(safe-area-inset-right))',
        }}
      >
        {/* Row 1: Single Slim Row (44px HP+EXP | 36px Combined Pill | 42px Pause) */}
        <div className="w-full grid grid-cols-[145px_minmax(0,1fr)_42px] sm:grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3">
          {/* Top-Left: Compact 145x44 HP + EXP IronCard */}
          <div className="justify-self-start pointer-events-none">
            <IronCard
              className="w-[145px] h-[44px] shrink-0"
              contentClassName="h-full px-2 py-[4px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-1 text-[10.5px] leading-none">
                <div className="flex items-center gap-1 min-w-0">
                  <Icon id="ui_heart" size={12} />
                  <span className="font-display font-bold text-[#ede0c4] tabular-nums whitespace-nowrap">
                    {Math.round(hp)}
                    <span className="text-[#9c8e72] font-semibold">/{maxHp}</span>
                  </span>
                </div>
                <span
                  key={`hud-lv-${levelPopSeq}`}
                  className={`inline-block font-display font-extrabold text-[10px] tracking-[0.04em] text-[#f2c464] whitespace-nowrap shrink-0 ${
                    levelPopSeq > 0 ? 'hud-level-pop' : ''
                  }`}
                >
                  LV.{level}
                </span>
              </div>

              <BloodHpBar hp={hp} maxHp={maxHp} compact />

              {/* Thin Cyan EXP Progress Bar directly underneath */}
              <div
                aria-label={`Experience ${Math.round(xpPercent)}%`}
                className="relative w-full h-[3.5px] rounded-full overflow-hidden bg-[#0a0c10] border border-[#3a424d]/80"
              >
                <div
                  className="h-full rounded-full transition-[width] duration-150 ease-out"
                  style={{
                    width: `${xpPercent}%`,
                    background:
                      'linear-gradient(90deg, #22d3ee 0%, #5de4ff 60%, #f2c464 100%)',
                    boxShadow: '0 0 6px rgba(93, 228, 255, 0.65)',
                  }}
                />
              </div>
            </IronCard>
          </div>

          {/* Top-Center: Sleek Dark-Translucent 36px Combined Timer + Kills + Coins Pill */}
          <div className="justify-self-center pointer-events-none min-w-0">
            <div
              className="h-[36px] px-2.5 sm:px-3.5 rounded-full flex items-center justify-center gap-1.5 sm:gap-2.5 border border-[#3a424d]/65 shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
              style={{
                background: 'rgba(10, 14, 20, 0.72)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <span className="font-display text-[11.5px] sm:text-[13px] font-black tracking-[0.06em] text-[#ede0c4] tabular-nums whitespace-nowrap">
                {timeFormatted}
              </span>

              <span className="w-px h-3 bg-[#4a505c]/75 shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap" title="Kills">
                <Icon id="ui_skull" size={14} />
                <span className="font-display text-[11px] sm:text-xs font-bold text-[#ede0c4] tabular-nums">
                  {kills}
                </span>
              </div>

              <span className="w-px h-3 bg-[#4a505c]/75 shrink-0" aria-hidden="true" />

              <div
                key={`hud-coin-${coinPopSeq}`}
                className={`flex items-center gap-1 whitespace-nowrap ${
                  coinPopSeq > 0 ? 'hud-coin-pop' : ''
                }`}
                title="Coins"
              >
                <Icon id="soul_coin" size={14} />
                <span className="font-display text-[11px] sm:text-xs font-bold text-[#f2c464] tabular-nums">
                  {coins}
                </span>
              </div>
            </div>
          </div>

          {/* Top-Right: Compact 42x42 Tactile Pause Button */}
          <div
            className="justify-self-end pointer-events-auto relative z-30"
            onTouchStart={(e) => e.stopPropagation()}
          >
            <IronCard
              asButton
              ariaLabel="Pause Game"
              onClick={() => {
                haptics.tap('medium');
                onTogglePause();
              }}
              className="w-[42px] h-[42px] shrink-0 active:scale-95"
              contentClassName="w-full h-full p-0 flex items-center justify-center"
            >
              <div className="flex items-center gap-[3.5px]" aria-hidden="true">
                <span className="w-[4px] h-[14px] rounded-[1.5px] bg-gradient-to-b from-[#fff1c7] via-[#e2d2b0] to-[#9c8459] shadow-[0_1px_2px_rgba(0,0,0,0.95)]" />
                <span className="w-[4px] h-[14px] rounded-[1.5px] bg-gradient-to-b from-[#fff1c7] via-[#e2d2b0] to-[#9c8459] shadow-[0_1px_2px_rgba(0,0,0,0.95)]" />
              </div>
            </IronCard>
          </div>
        </div>

        {/* Sub-Header Row: Active Buffs & Pact (Left, pointer-events-none) + Boss Countdown Strip (Center-aligned under Timer Pill) */}
        {(hasSubLeftBadges || !boss) && (
          <div className="w-full grid grid-cols-[155px_minmax(0,1fr)] sm:grid-cols-[1fr_auto_1fr] items-start gap-1.5 mt-1 pointer-events-none">
            {/* Directly below Top-Left HP bar: Ultra-slim semi-transparent Buff & Pact Badges */}
            <div className="justify-self-start flex flex-col items-start gap-1 pointer-events-none min-w-0">
              {combo > 1 && (
                <div
                  className="rounded-[6px] border border-[#22d3ee]/35 flex items-center gap-1 leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold text-[#9c8e72] uppercase">
                    XP
                  </span>
                  <span className="font-display font-extrabold text-[#5de4ff] tabular-nums">
                    x{combo}
                  </span>
                </div>
              )}

              {lightShardRemainingSec > 0 && (
                <div
                  className="rounded-[6px] border border-[#22d3ee]/35 flex items-center justify-between gap-1.5 leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase text-[#5de4ff] truncate">
                    SHARD +35%
                  </span>
                  <span className="font-display font-extrabold text-[#ede0c4] tabular-nums shrink-0">
                    {lightShardRemainingSec}s
                  </span>
                </div>
              )}

              {redShardRemainingSec > 0 && (
                <div
                  className="rounded-[6px] border border-[#e5303a]/40 flex items-center justify-between gap-1.5 leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase text-[#ff7b82] truncate">
                    BLOOD +15%
                  </span>
                  <span className="font-display font-extrabold text-[#ede0c4] tabular-nums shrink-0">
                    {redShardRemainingSec}s
                  </span>
                </div>
              )}

              {darknessFallsRemainingSec > 0 && (
                <div
                  className="rounded-[6px] border border-[#e5303a]/40 flex items-center justify-between gap-1.5 leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase text-[#ede0c4] truncate">
                    DARKNESS <span className="text-[#5de4ff]">+50% XP</span>
                  </span>
                  <span className="font-display font-extrabold text-[#e5303a] tabular-nums shrink-0">
                    {darknessFallsRemainingSec}s
                  </span>
                </div>
              )}

              {bloodFogRemainingSec > 0 && (
                <div
                  className="rounded-[6px] border border-[#e5303a]/45 flex items-center justify-between gap-1.5 leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase text-[#ff7077] truncate">
                    {bloodFogTier > 0 ? `BLOOD FOG W${bloodFogTier}` : 'BLOOD FOG'}
                  </span>
                  <span className="font-display font-extrabold text-[#e5303a] tabular-nums shrink-0">
                    {bloodFogRemainingSec}s
                  </span>
                </div>
              )}

              {isUnderPressure && (
                <div
                  className="rounded-[6px] border border-[#e5303a]/45 flex items-center leading-tight pointer-events-none whitespace-nowrap"
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase tracking-wider text-[#e5303a]">
                    PRESSURE
                  </span>
                </div>
              )}

              {activeChallenge && (
                <div
                  className={`rounded-[6px] border leading-tight pointer-events-none truncate ${
                    activeChallenge.status === 'failed'
                      ? 'border-[#e5303a]/50 text-[#e5303a]'
                      : activeChallenge.status === 'completed'
                        ? 'border-[#f2a93b]/55 text-[#f2c464]'
                        : 'border-[#4a505c]/60 text-[#d8c9a8]'
                  }`}
                  style={SLIM_BADGE_STYLE}
                >
                  <span className="font-display font-bold uppercase">
                    {activeChallenge.title}
                  </span>
                  <span className="text-[#8e8168]"> · </span>
                  <span className="font-body font-semibold text-[#cbbba0]">
                    {activeChallenge.statusNote}
                  </span>
                </div>
              )}
            </div>

            {/* Directly below Top-Center Timer Pill: Tiny 26px Boss Countdown Strip + Clickable Crimson SUMMON Badge */}
            {!boss && (
              <div className="justify-self-start sm:justify-self-center pointer-events-none">
                <div
                  className="h-[26px] px-2.5 rounded-full flex items-center gap-1.5 border border-[#3a424d]/55 text-[11px] whitespace-nowrap"
                  style={{
                    background: 'rgba(10, 14, 20, 0.68)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  <span className="font-body font-semibold text-[#cbbba0]">
                    Boss in{' '}
                    <span className="font-display font-bold text-[#e5303a] tabular-nums">
                      {bossTimeStr}
                    </span>
                  </span>

                  <button
                    type="button"
                    aria-label="Summon Boss Now"
                    onTouchStart={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      haptics.tap('medium');
                      onSpawnBossNow();
                    }}
                    className="pointer-events-auto relative z-30 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-gradient-to-b from-[#99151d] to-[#5a0b10] border border-[#e5303a]/80 font-display font-extrabold text-[9.5px] tracking-[0.06em] uppercase text-[#ffd7d9] shadow-[0_0_8px_rgba(229,48,58,0.45)] active:scale-95 transition-transform cursor-pointer"
                  >
                    SUMMON
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2s Event Warning Banner */}
      {eventWarning && (
        <div className="fixed left-1/2 -translate-x-1/2 top-24 z-30 w-full max-w-sm px-4 pointer-events-none">
          <IronCard
            highlight="blood"
            contentClassName="px-3.5 py-2 flex items-center gap-2.5 justify-center text-center"
          >
            <Icon id="ui_warning" size={18} />
            <div className="flex flex-col">
              <span className="font-display text-xs font-bold tracking-wider text-[#e5303a]">
                {eventWarning.title}
              </span>
              <span className="font-body text-[11px] font-medium text-[#ede0c4]">
                {eventWarning.subtitle}
              </span>
            </div>
          </IronCard>
        </div>
      )}

      {/* Persistent Boss Health Overlay (fixed top-center when boss is active) */}
      <BossHealthOverlay boss={boss} playerLevel={level} />

      {/* Bottom-Left: Single Horizontal Row of 36x36 Compact Weapon & Relic Icon Slots (pointer-events-none) */}
      <div
        className="fixed z-20 pointer-events-none flex flex-nowrap items-center gap-[6px] max-w-[calc(100vw-104px)] overflow-hidden"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          left: 'max(12px, env(safe-area-inset-left))',
        }}
      >
        {equippedRelics.map((relic) => {
          const hasSynergy = activeSynergySet.has(relic.setId);
          return (
            <div
              key={relic.id}
              title={`${relic.name} — ${relic.effectSummary}`}
              className="relative w-[36px] h-[36px] shrink-0 flex items-center justify-center"
            >
              <Icon id={relic.name} rarity={relic.rarity} size={36} />
              <span
                className="absolute bottom-[1px] right-[2px] z-20 font-display font-extrabold text-[8px] leading-none px-[2px] rounded-[2px] bg-[#090b0f]/90"
                style={{ color: hasSynergy ? '#f2c464' : '#9c8e72' }}
              >
                R
              </span>
            </div>
          );
        })}

        {activeRelicSynergies.map((setId) => {
          const synergy = RELIC_SETS[setId];
          if (!synergy) return null;
          return (
            <div
              key={`synergy-${setId}`}
              title={`${synergy.synergyTitle} — ${synergy.bonusSummary}`}
              className="relative w-[32px] h-[32px] shrink-0 rounded-[6px] border flex items-center justify-center bg-[#12100d]/90"
              style={{ borderColor: synergy.accentColor }}
            >
              <Icon id={synergy.synergyTitle} size={24} alt={synergy.synergyTitle} />
            </div>
          );
        })}

        {unlockedWeapons.map((w) => (
          <div
            key={w.id}
            className="relative w-[36px] h-[36px] shrink-0 flex items-center justify-center"
          >
            <Icon id={w.name} rarity={getWeaponFrameRarity(w)} size={36} />
            <span className="absolute bottom-[1px] right-[2px] z-20 font-display font-extrabold text-[8.5px] leading-none text-[#f2c464] bg-[#090b0f]/90 px-[2px] rounded-[2px] tabular-nums">
              Lv.{w.level}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom-Right: Compact 68x68 Circular Tactile DASH Button (opacity 0.9) */}
      <button
        type="button"
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (dashReady) {
            haptics.tap('light');
            onTriggerDash();
          }
        }}
        disabled={!dashReady}
        aria-label="Dash"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          right: 'max(16px, env(safe-area-inset-right))',
          boxShadow: dashReady
            ? '0 8px 20px rgba(0, 0, 0, 0.88), 0 0 14px rgba(34, 211, 238, 0.3), inset 0 2px 3px rgba(180, 194, 214, 0.28), inset 0 -3px 5px rgba(4, 6, 10, 0.95)'
            : '0 6px 14px rgba(0, 0, 0, 0.8), inset 0 2px 3px rgba(90, 98, 112, 0.18), inset 0 -3px 5px rgba(4, 6, 10, 0.95)',
        }}
        className={`fixed z-30 pointer-events-auto opacity-90 w-[68px] h-[68px] shrink-0 rounded-full flex flex-col items-center justify-center transition-transform duration-150 ${
          dashReady
            ? 'rusted-iron-plate border-[2.5px] border-[#596475] text-[#f4ecda] cursor-pointer active:scale-95'
            : 'bg-[#101318]/90 border-[2.5px] border-[#2e343e] text-[#6d7480] cursor-not-allowed'
        }`}
      >
        {/* Glowing Cyan Radial Cooldown Ring */}
        <svg
          aria-hidden="true"
          viewBox="0 0 68 68"
          className="pointer-events-none absolute -inset-[2.5px] w-[68px] h-[68px] -rotate-90"
        >
          <circle
            cx="34"
            cy="34"
            r={DASH_RING_RADIUS}
            fill="none"
            stroke="rgba(34, 211, 238, 0.16)"
            strokeWidth="3.5"
          />
          <circle
            cx="34"
            cy="34"
            r={DASH_RING_RADIUS}
            fill="none"
            stroke={dashReady ? '#22d3ee' : '#5de4ff'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={DASH_RING_CIRCUMFERENCE}
            strokeDashoffset={ringDashOffset}
            style={{
              filter: dashReady
                ? 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.85))'
                : 'drop-shadow(0 0 3px rgba(93, 228, 255, 0.5))',
              transition: 'stroke-dashoffset 75ms linear',
            }}
          />
        </svg>

        <span className="relative z-10 flex items-center justify-center">
          <Icon id="ui_dash" size={24} muted={!dashReady} />
        </span>
        <span
          className={`relative z-10 mt-0.5 font-display text-[10px] font-black tracking-[0.1em] uppercase leading-none ${
            dashReady ? 'text-[#ede0c4]' : 'text-[#6e747e]'
          }`}
        >
          DASH
        </span>

        {maxDashCharges > 1 && (
          <div className="relative z-10 mt-0.5 flex items-center gap-1">
            {Array.from({ length: maxDashCharges }).map((_, idx) => (
              <span
                key={idx}
                className={`w-1.5 h-1.5 rounded-full ${
                  idx < dashCharges
                    ? 'bg-[#22d3ee] shadow-[0_0_4px_#22d3ee]'
                    : 'bg-[#2a303a]'
                }`}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
};

export const HUD = React.memo(HUDComponent);
