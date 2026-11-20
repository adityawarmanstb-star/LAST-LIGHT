import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActiveDynamicChallenge,
  Boss2DebugStats,
  BossInfo,
  EventWarningInfo,
  RelicDefinition,
  RelicId,
  RelicSetId,
  StageId,
  TreeDebugStats,
  WeaponState,
} from '../game/types';
import { IconRarity } from '../game/iconRegistry';
import { RELIC_SETS, getRelicById } from '../game/relics';
import { VirtualJoystick } from './VirtualJoystick';
import { Icon } from './Icon';
import { BloodHpBar } from './BloodHpBar';
import { BloodSplatterHit, BloodSplatterOverlay } from './BloodSplatterOverlay';
import { BossHealthOverlay } from './BossHealthOverlay';
import { CoinCounter } from './CoinCounter';
import { ComboMultiplierHud } from './ComboMultiplierHud';
import { EliteSlayerCounter } from './EliteSlayerCounter';
import { CritImpactPayload, gameManager } from '../game/GameManager';
import { haptics } from '../mobile/haptics';
import { NineSlice } from './ui/NineSlice';
import { UiBar } from './ui/UiBar';
import { UiButton, UiRoundButton } from './ui/UiButton';
import { UI_SPRITES } from './ui/uiConfig';

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
  comboKills?: number;
  comboTimeRemainingMs?: number;
  comboDecayMs?: number;
  comboNextThreshold?: number | null;
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
  isBurning?: boolean;
  stageId?: StageId;
  treeDebug?: TreeDebugStats | null;
  bossDebug?: Boss2DebugStats | null;
  eventWarning: EventWarningInfo | null;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onSpawnBossNow: () => void;
  onTriggerDash: () => void;
  onToggleTreeDebug?: () => void;
}

export function getWeaponFrameRarity(weapon: WeaponState): IconRarity {
  if (weapon.level >= weapon.maxLevel) return 'legendary';
  if (weapon.level >= 4) return 'epic';
  if (weapon.level >= 2) return 'rare';
  return 'common';
}

const DASH_RING_RADIUS = 29;
const DASH_RING_CIRCUMFERENCE = 2 * Math.PI * DASH_RING_RADIUS;

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
  comboKills = 0,
  comboTimeRemainingMs = 0,
  comboDecayMs: _comboDecayMs = 3000,
  comboNextThreshold: _comboNextThreshold = 5,
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
  isBurning = false,
  stageId = 'stage_1',
  treeDebug = null,
  bossDebug = null,
  eventWarning,
  isMuted: _isMuted,
  isPaused,
  onToggleMute: _onToggleMute,
  onOpenSettings: _onOpenSettings,
  onTogglePause,
  onSpawnBossNow,
  onTriggerDash,
  onToggleTreeDebug,
}) => {
  const prevLevelRef = useRef<number>(level);
  const prevHpRef = useRef<number>(hp);
  const splatterSeqRef = useRef<number>(0);
  const splatterTimerRef = useRef<number | null>(null);
  const critFlashTimerRef = useRef<number | null>(null);
  const [levelPopSeq, setLevelPopSeq] = useState<number>(0);
  const [splatterHit, setSplatterHit] = useState<BloodSplatterHit | null>(null);
  const [critFlash, setCritFlash] = useState<CritImpactPayload | null>(null);

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

  const unlockedWeapons = useMemo(() => weapons.filter((w) => w.unlocked), [weapons]);
  const equippedRelics = useMemo(
    () =>
      equippedRelicIds
        .map((id) => getRelicById(id))
        .filter((relic): relic is RelicDefinition => relic !== null),
    [equippedRelicIds]
  );
  const activeSynergySet = useMemo(
    () => new Set(activeRelicSynergies),
    [activeRelicSynergies]
  );

  const dashReady = dashCharges > 0;
  const ringProgress = dashReady
    ? 1
    : Math.max(0, Math.min(1, dashCooldownProgress));
  const ringDashOffset = DASH_RING_CIRCUMFERENCE * (1 - ringProgress);

  const hasSubLeftBadges =
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

      {/* Screen-wide Horde Frenzy Blood Fog atmosphere */}
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

      {/* Top HUD Bar */}
      <div
        className="relative z-20 w-full pointer-events-none"
        style={{
          paddingTop: 'max(8px, env(safe-area-inset-top))',
          paddingLeft: 'max(10px, env(safe-area-inset-left))',
          paddingRight: 'max(10px, env(safe-area-inset-right))',
        }}
      >
        {/* Row 1: HP+EXP Plate | Timer+Kills+Coins Plate | Round Pause Button */}
        <div className="w-full grid grid-cols-[minmax(136px,162px)_minmax(0,1fr)_44px] sm:grid-cols-[1fr_auto_1fr] items-center gap-1.5 sm:gap-3">
          {/* Top-Left: HP + EXP Plate + Fixed-Aspect Level Rune Ring */}
          <div className="justify-self-start pointer-events-none flex items-center gap-1">
            {/* Fixed-Aspect Level Badge */}
            <div
              key={`hud-lv-${levelPopSeq}`}
              className={`relative flex items-center justify-center shrink-0 ${
                levelPopSeq > 0 ? 'hud-level-pop' : ''
              }`}
              style={{ width: 'clamp(34px, 4.8vw, 42px)', aspectRatio: '1 / 1' }}
            >
              <img
                src={UI_SPRITES.roundRuneLevel}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ imageRendering: 'auto' }}
                className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
              />
              <span className="relative z-10 font-display font-black text-[10px] text-[#f2c464] leading-none">
                {level}
              </span>
            </div>

            <NineSlice
              variant="plateWideIron"
              tileTexture="row"
              highlight={isBurning ? 'ember' : 'none'}
              borderWidth="clamp(5px, 0.9vw, 8px) clamp(8px, 1.4vw, 12px)"
              padding="0px"
              className="w-[clamp(108px,26vw,148px)] shrink-0 shadow-[0_6px_14px_rgba(0,0,0,0.85)]"
              contentClassName="px-1.5 py-[3px] flex flex-col gap-[2px]"
            >
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none">
                <div className="flex items-center gap-1 min-w-0">
                  <Icon id="ui_heart" size={11} />
                  <span className="font-display font-bold text-[#ede0c4] tabular-nums whitespace-nowrap">
                    {Math.round(hp)}
                    <span className="text-[#9c8e72] font-semibold">/{maxHp}</span>
                  </span>
                </div>
                {isBurning ? (
                  <span
                    className="inline-flex items-center gap-[2px] px-1 py-[1px] rounded-[3px] bg-[#ff6a1a]/25 border border-[#ff8c38]/75 font-display font-black text-[8px] tracking-wider text-[#ffae52] animate-pulse whitespace-nowrap"
                    title="Taking heat burn damage near burning trees"
                  >
                    <Icon id="ui_flame" size={9} />
                    BURN
                  </span>
                ) : (
                  <span className="font-display font-bold text-[9px] text-[#f2c464] whitespace-nowrap">
                    LV.{level}
                  </span>
                )}
              </div>

              <div className="relative">
                <BloodHpBar hp={hp} maxHp={maxHp} compact />
                {isBurning && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-[2px] ring-1 ring-[#ff8c38]/85 shadow-[0_0_8px_rgba(255,118,32,0.75)] animate-pulse"
                  />
                )}
              </div>

              <UiBar
                percent={xpPercent}
                fill="cyan"
                heightClassName="h-[8px]"
                frameBorderWidth="2px 5px"
                ariaLabel={`Experience ${Math.round(xpPercent)}%`}
              />
            </NineSlice>
          </div>

          {/* Top-Center: Timer + Kills + Coins NineSlice MiniPlate */}
          <div className="justify-self-center pointer-events-none min-w-0">
            <NineSlice
              variant="miniPlate"
              tileTexture="row"
              borderWidth="clamp(5px, 0.9vw, 7px) clamp(8px, 1.4vw, 12px)"
              padding="0px"
              className="shadow-[0_4px_12px_rgba(0,0,0,0.75)]"
              contentClassName="px-2 sm:px-3 py-1 flex items-center justify-center gap-1.5 sm:gap-2.5"
            >
              <span className="font-display text-[clamp(10.5px,2.2vw,13px)] font-black tracking-[0.06em] text-[#ede0c4] tabular-nums whitespace-nowrap">
                {timeFormatted}
              </span>

              <span className="w-px h-3 bg-[#4a505c]/75 shrink-0" aria-hidden="true" />

              <div className="flex items-center gap-1 whitespace-nowrap" title="Kills">
                <Icon id="ui_skull" size={13} />
                <span className="font-display text-[clamp(10px,2vw,12px)] font-bold text-[#ede0c4] tabular-nums">
                  {kills}
                </span>
              </div>

              <span className="w-px h-3 bg-[#4a505c]/75 shrink-0" aria-hidden="true" />

              <CoinCounter coins={coins} iconSize={13} />
            </NineSlice>
          </div>

          {/* Top-Right: Fixed-Aspect 44x44 Pause Button + Stage 2 Tree Debug Toggle */}
          <div
            className="justify-self-end pointer-events-auto relative z-30"
            onTouchStart={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <UiRoundButton
              variant="steel"
              sizePx={44}
              haptic="medium"
              aria-label="Pause Game"
              onClick={onTogglePause}
            >
              <div className="flex items-center gap-[3.5px]" aria-hidden="true">
                <span className="w-[4px] h-[14px] rounded-[1.5px] bg-gradient-to-b from-[#fff1c7] via-[#e2d2b0] to-[#9c8459]" />
                <span className="w-[4px] h-[14px] rounded-[1.5px] bg-gradient-to-b from-[#fff1c7] via-[#e2d2b0] to-[#9c8459]" />
              </div>
            </UiRoundButton>

            {stageId === 'stage_2' && onToggleTreeDebug && (
              <button
                type="button"
                aria-label="Toggle Burning Trees Debug Overlay"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTreeDebug();
                }}
                className={`absolute right-0 top-[48px] whitespace-nowrap px-2 py-0.5 rounded-[4px] border font-display text-[9px] font-black tracking-[0.08em] uppercase transition-colors ${
                  treeDebug?.enabled
                    ? 'bg-[#ff6a1a]/30 border-[#ff9442] text-[#ffd49e]'
                    : 'bg-[#12141a]/85 border-[#4b515d] text-[#a79c86] hover:text-[#ede0c4]'
                }`}
              >
                {treeDebug?.enabled ? 'DBG ON' : 'DBG'}
              </button>
            )}
          </div>
        </div>

        {/* Stage 2 Burning Trees Debug Overlay Readout */}
        {stageId === 'stage_2' && treeDebug?.enabled && (
          <div className="fixed right-2.5 top-[92px] z-30 pointer-events-none">
            <div className="w-[178px] rounded-[6px] border border-[#ff8c38]/65 bg-[#0b0d12]/90 px-2.5 py-2 text-[10px] leading-snug text-[#e6dac3] shadow-[0_6px_18px_rgba(0,0,0,0.85)]">
              <div className="flex items-center justify-between border-b border-[#3a3f4a] pb-1 mb-1">
                <span className="font-display font-black tracking-wider uppercase text-[#ff9f4d]">
                  TREES DEBUG
                </span>
                <span className="font-mono text-[9px] text-[#9c8e72]">F3</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-[#9c8e72]">Trees</span>
                <span>
                  {treeDebug.visibleTrees} vis / {treeDebug.activeTrees} act
                </span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-[#9c8e72]">Bodies</span>
                <span>{treeDebug.physicsBodies}</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-[#9c8e72]">Collisions</span>
                <span className="text-[#ffd49e]">{treeDebug.collisions}</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-[#9c8e72]">Real Lights</span>
                <span>{treeDebug.realTreeLights}/4 (&lt;8)</span>
              </div>
              <div className="mt-1 pt-1 border-t border-[#2d323b] flex items-center justify-between text-[9px] font-mono">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border border-[#ff4d57] bg-[#ff4d57]/35 inline-block" />
                  Hit {treeDebug.hitboxRadius}px
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border border-dashed border-[#ff9836] bg-[#ff9836]/20 inline-block" />
                  Heat {treeDebug.heatRadius}px
                </span>
              </div>

              <div className="mt-1.5 pt-1.5 border-t border-[#3a3f4a]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-display font-black tracking-wider uppercase text-[#ff7354]">
                    BOSS DEBUG
                  </span>
                  <span className="font-mono text-[9px] text-[#9c8e72]">
                    {bossDebug?.active ? (bossDebug.flipX ? 'L' : 'R') : 'WAIT'}
                  </span>
                </div>
                {bossDebug?.active ? (
                  <>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-[#9c8e72]">State</span>
                      <span className="text-[#ffd49e]">
                        {bossDebug.attackKind
                          ? `${bossDebug.state} (${bossDebug.attackKind.toUpperCase()})`
                          : bossDebug.state}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums gap-1">
                      <span className="text-[#9c8e72] shrink-0">Anim</span>
                      <span className="truncate text-right">{bossDebug.animKey}</span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-[#9c8e72]">Frame</span>
                      <span>
                        {bossDebug.frameIndex} / {bossDebug.maxFrame}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-[#9c8e72]">Telegraph</span>
                      <span className={bossDebug.telegraphRemainingSec > 0 ? 'text-[#ff6b5c]' : 'text-[#9c8e72]'}>
                        {bossDebug.telegraphRemainingSec > 0
                          ? `${bossDebug.telegraphRemainingSec.toFixed(2)}s`
                          : '--'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="font-mono text-[9px] text-[#9c8e72]">Not spawned yet</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sub-Header Row: Active Buffs & Pact + Top-Left Combo Text + Boss Countdown Strip */}
        <div className="w-full grid grid-cols-[155px_minmax(0,1fr)] sm:grid-cols-[1fr_auto_1fr] items-start gap-1.5 mt-1 pointer-events-none">
          <div className="justify-self-start flex flex-col items-start gap-1 pointer-events-none min-w-0">
              {lightShardRemainingSec > 0 && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight="cyan"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-1.5 py-[2px] flex items-center justify-between gap-1.5 text-[10px] leading-tight whitespace-nowrap"
                >
                  <span className="font-display font-bold uppercase text-[#5de4ff]">
                    SHARD +35%
                  </span>
                  <span className="font-display font-extrabold text-[#ede0c4] tabular-nums">
                    {lightShardRemainingSec}s
                  </span>
                </NineSlice>
              )}

              {redShardRemainingSec > 0 && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight="blood"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-1.5 py-[2px] flex items-center justify-between gap-1.5 text-[10px] leading-tight whitespace-nowrap"
                >
                  <span className="font-display font-bold uppercase text-[#ff7b82]">
                    BLOOD +15%
                  </span>
                  <span className="font-display font-extrabold text-[#ede0c4] tabular-nums">
                    {redShardRemainingSec}s
                  </span>
                </NineSlice>
              )}

              {darknessFallsRemainingSec > 0 && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight="blood"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-1.5 py-[2px] flex items-center justify-between gap-1.5 text-[10px] leading-tight whitespace-nowrap"
                >
                  <span className="font-display font-bold uppercase text-[#ede0c4]">
                    DARKNESS <span className="text-[#5de4ff]">+50% XP</span>
                  </span>
                  <span className="font-display font-extrabold text-[#e5303a] tabular-nums">
                    {darknessFallsRemainingSec}s
                  </span>
                </NineSlice>
              )}

              {bloodFogRemainingSec > 0 && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight="blood"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-1.5 py-[2px] flex items-center justify-between gap-1.5 text-[10px] leading-tight whitespace-nowrap"
                >
                  <span className="font-display font-bold uppercase text-[#ff7077]">
                    {bloodFogTier > 0 ? `BLOOD FOG W${bloodFogTier}` : 'BLOOD FOG'}
                  </span>
                  <span className="font-display font-extrabold text-[#e5303a] tabular-nums">
                    {bloodFogRemainingSec}s
                  </span>
                </NineSlice>
              )}

              {isUnderPressure && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight="blood"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-1.5 py-[2px] flex items-center text-[10px] leading-tight whitespace-nowrap"
                >
                  <span className="font-display font-bold uppercase tracking-wider text-[#e5303a]">
                    PRESSURE
                  </span>
                </NineSlice>
              )}

              {activeChallenge && (
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  highlight={
                    activeChallenge.status === 'failed'
                      ? 'blood'
                      : activeChallenge.status === 'completed'
                        ? 'gold'
                        : 'none'
                  }
                  borderWidth="4px 8px"
                  padding="0px"
                  className="max-w-[165px]"
                  contentClassName="px-1.5 py-[2px] truncate text-[10px] leading-tight"
                >
                  <span className="font-display font-bold uppercase text-[#f2c464]">
                    {activeChallenge.title}
                  </span>
                  <span className="text-[#8e8168]"> · </span>
                  <span className="font-body font-semibold text-[#cbbba0]">
                    {activeChallenge.statusNote}
                  </span>
                </NineSlice>
              )}

              {/* Top-Left Frameless Dynamic Animated Kill Combo Text (stacked cleanly in flow) */}
              <ComboMultiplierHud
                combo={combo}
                comboKills={comboKills}
                comboTimeRemainingMs={comboTimeRemainingMs}
              />
            </div>

            {/* Boss Countdown Strip + Clickable SUMMON Button */}
            {!boss && (
              <div className="justify-self-start sm:justify-self-center pointer-events-none">
                <NineSlice
                  variant="miniPlate"
                  tileTexture="row"
                  borderWidth="4px 8px"
                  padding="0px"
                  contentClassName="px-2 py-0.5 flex items-center gap-1.5 text-[11px] whitespace-nowrap"
                >
                  <span className="font-body font-semibold text-[#cbbba0]">
                    Boss in{' '}
                    <span className="font-display font-bold text-[#e5303a] tabular-nums">
                      {bossTimeStr}
                    </span>
                  </span>

                  <div
                    className="pointer-events-auto relative z-30"
                    onTouchStart={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <UiButton
                      tone="blood"
                      size="xs"
                      aria-label="Summon Boss Now"
                      onClick={onSpawnBossNow}
                      className="min-h-[24px] text-[9px]"
                    >
                      SUMMON
                    </UiButton>
                  </div>
                </NineSlice>
              </div>
            )}
        </div>
      </div>

      {/* Event Warning / Stage Clear Banner */}
      {eventWarning && (
        <div className="fixed left-1/2 -translate-x-1/2 top-24 z-30 w-full max-w-sm px-4 pointer-events-none">
          <NineSlice
            variant="bannerCrimson"
            tileTexture="row"
            highlight={eventWarning.title.includes('COMPLETE') ? 'gold' : 'blood'}
            padding="0px"
            contentClassName="px-3.5 py-2 flex items-center gap-2.5 justify-center text-center"
          >
            <Icon id={eventWarning.title.includes('COMPLETE') ? 'ui_crown' : 'ui_warning'} size={18} />
            <div className="flex flex-col">
              <span
                className={`font-display text-xs font-bold tracking-wider ${
                  eventWarning.title.includes('COMPLETE') ? 'text-[#f2c464]' : 'text-[#e5303a]'
                }`}
              >
                {eventWarning.title}
              </span>
              <span className="font-body text-[11px] font-medium text-[#ede0c4]">
                {eventWarning.subtitle}
              </span>
            </div>
          </NineSlice>
        </div>
      )}

      {/* Persistent Boss Health Overlay */}
      <BossHealthOverlay boss={boss} playerLevel={level} />

      {/* Dynamic Cross-Session Elite Slayer Counter */}
      <EliteSlayerCounter />

      {/* Bottom-Left: Weapon & Relic Icon Slots inside Fixed-Aspect Beveled Sockets */}
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
              style={{ width: 38, aspectRatio: '1 / 1' }}
              className="relative shrink-0 flex items-center justify-center"
            >
              <img
                src={UI_SPRITES.roundSquareSocket}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ imageRendering: 'auto' }}
                className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
              />
              <span className="relative z-10 flex items-center justify-center">
                <Icon id={relic.name} rarity={relic.rarity} size={30} />
              </span>
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
              style={{ width: 34, aspectRatio: '1 / 1', borderColor: synergy.accentColor }}
              className="relative shrink-0 rounded-[6px] border flex items-center justify-center bg-[#12100d]/90"
            >
              <Icon id={synergy.synergyTitle} size={24} alt={synergy.synergyTitle} />
            </div>
          );
        })}

        {unlockedWeapons.map((w) => (
          <div
            key={w.id}
            style={{ width: 38, aspectRatio: '1 / 1' }}
            className="relative shrink-0 flex items-center justify-center"
          >
            <img
              src={UI_SPRITES.roundSquareSocket}
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{ imageRendering: 'auto' }}
              className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
            />
            <span className="relative z-10 flex items-center justify-center">
              <Icon id={w.name} rarity={getWeaponFrameRarity(w)} size={30} />
            </span>
            <span className="absolute bottom-[1px] right-[2px] z-20 font-display font-extrabold text-[8.5px] leading-none text-[#f2c464] bg-[#090b0f]/90 px-[2px] rounded-[2px] tabular-nums">
              Lv.{w.level}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom-Right: Fixed-Aspect 68x68 Circular Dash Button */}
      <div
        className="fixed z-30 pointer-events-auto"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          right: 'max(16px, env(safe-area-inset-right))',
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <UiRoundButton
          variant={dashReady ? 'cyan' : 'steel'}
          sizePx={68}
          disabled={!dashReady}
          aria-label="Dash"
          onPointerDown={(e) => {
            e.stopPropagation();
            if (dashReady) {
              onTriggerDash();
            }
          }}
          className="opacity-95"
        >
          {/* Radial Cooldown Ring */}
          <svg
            aria-hidden="true"
            viewBox="0 0 68 68"
            className="pointer-events-none absolute inset-0 w-full h-full -rotate-90"
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
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={DASH_RING_CIRCUMFERENCE}
              strokeDashoffset={ringDashOffset}
              style={{ transition: 'stroke-dashoffset 75ms linear' }}
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center justify-center">
            <Icon id="ui_dash" size={22} muted={!dashReady} />
            <span
              className={`mt-0.5 font-display text-[9px] font-black tracking-[0.1em] uppercase leading-none ${
                dashReady ? 'text-[#ede0c4]' : 'text-[#6e747e]'
              }`}
            >
              DASH
            </span>
            {maxDashCharges > 1 && (
              <div className="mt-0.5 flex items-center gap-1">
                {Array.from({ length: maxDashCharges }).map((_, idx) => (
                  <img
                    key={idx}
                    src={idx < dashCharges ? UI_SPRITES.knobCrimsonOrb : UI_SPRITES.knobSteelDome}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ width: 7, aspectRatio: '1 / 1', imageRendering: 'auto' }}
                    className="object-contain"
                  />
                ))}
              </div>
            )}
          </div>
        </UiRoundButton>
      </div>
    </div>
  );
};

export const HUD = React.memo(HUDComponent);
