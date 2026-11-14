import React, { useEffect, useRef, useState } from 'react';
import { Activity, Coins, Skull, Heart, AlertTriangle, Shield, Wind, Gem } from 'lucide-react';
import {
  ActiveDynamicChallenge,
  BossInfo,
  DebugStats,
  DpsSample,
  EventWarningInfo,
  RelicDefinition,
  RelicId,
  RelicSetId,
  WeaponState,
} from '../game/types';
import { RELIC_SETS, getRelicById } from '../game/relics';
import { VirtualJoystick } from './VirtualJoystick';
import { ForgedIronFrame } from './ForgedIronFrame';
import { BloodHpBar } from './BloodHpBar';
import { BloodSplatterHit, BloodSplatterOverlay } from './BloodSplatterOverlay';
import { BossHealthOverlay } from './BossHealthOverlay';
import { PerformanceChart } from './PerformanceChart';
import { CritImpactPayload, gameManager } from '../game/GameManager';
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
  activeChallenge?: ActiveDynamicChallenge | null;
  dashCharges?: number;
  maxDashCharges?: number;
  dashCooldownProgress?: number;
  equippedRelicIds?: RelicId[];
  activeRelicSynergies?: RelicSetId[];
  debugStats: DebugStats;
  dpsHistory?: DpsSample[];
  eventWarning: EventWarningInfo | null;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onSpawnBossNow: () => void;
  onTriggerDash: () => void;
}

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
  activeChallenge = null,
  dashCharges = 1,
  maxDashCharges = 1,
  dashCooldownProgress = 1,
  equippedRelicIds = [],
  activeRelicSynergies = [],
  debugStats,
  dpsHistory = [],
  eventWarning,
  onSpawnBossNow,
  onTriggerDash,
}) => {
  const [activeHudTab, setActiveHudTab] = useState<'status' | 'performance'>('status');
  const [showDebug, setShowDebug] = useState(false);
  const debugTapTimestampsRef = useRef<number[]>([]);
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

  const handleDebugHotspotTap = () => {
    const now = Date.now();
    const recent = debugTapTimestampsRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    if (recent.length >= 5) {
      debugTapTimestampsRef.current = [];
      setShowDebug((prev) => !prev);
    } else {
      debugTapTimestampsRef.current = recent;
    }
  };

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
  const activeSynergyMetas = activeRelicSynergies
    .map((id) => RELIC_SETS[id])
    .filter((meta): meta is NonNullable<typeof meta> => Boolean(meta));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden">
      {/* Virtual Joystick for touch */}
      <VirtualJoystick />

      {/* Hidden top-left debug hotspot (tap 5 times to toggle debug overlay) */}
      <button
        type="button"
        onClick={handleDebugHotspotTap}
        aria-label="Toggle debug overlay"
        className="fixed top-0 left-0 w-16 h-16 z-40 pointer-events-auto bg-transparent opacity-0 cursor-default"
      />

      {/* Visceral screen-edge blood splatter flash when taking damage */}
      <BloodSplatterOverlay hit={splatterHit} />

      {/* Critical hit color-flashing hit-stop screen pulse */}
      {critFlash && (
        <div
          key={`crit-flash-${critFlash.seq}`}
          aria-hidden="true"
          className="fixed inset-0 z-25 pointer-events-none crit-color-flash"
          style={{
            background: `radial-gradient(ellipse at center, transparent 52%, ${critFlash.flashColorHex}2e 85%, ${critFlash.flashColorHex}55 100%)`,
            boxShadow: `inset 0 0 ${critFlash.isEliteOrBoss ? 110 : 75}px ${critFlash.flashColorHex}66`,
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
                'radial-gradient(circle at 22% 28%, rgba(179, 18, 26, 0.28) 0%, transparent 48%), radial-gradient(circle at 78% 72%, rgba(229, 48, 58, 0.24) 0%, transparent 50%), radial-gradient(ellipse at center, transparent 42%, rgba(92, 8, 14, 0.52) 84%, rgba(179, 18, 26, 0.7) 100%)',
            }}
          />
          <div
            className="absolute -inset-16 blood-fog-drift-b"
            style={{
              background:
                'radial-gradient(circle at 74% 24%, rgba(179, 18, 26, 0.24) 0%, transparent 46%), radial-gradient(circle at 26% 76%, rgba(145, 12, 20, 0.3) 0%, transparent 52%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              boxShadow: 'inset 0 0 110px rgba(179, 18, 26, 0.58)',
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
              'radial-gradient(ellipse at center, transparent 48%, rgba(58, 10, 14, 0.56) 78%, rgba(179, 18, 26, 0.78) 100%)',
            boxShadow: 'inset 0 0 95px rgba(229, 48, 58, 0.5)',
          }}
        />
      )}

      {/* Event warning screen-edge blood flash */}
      {eventWarning && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 pointer-events-none animate-pulse"
          style={{
            boxShadow: 'inset 0 0 80px rgba(229, 48, 58, 0.65)',
          }}
        />
      )}

      {/* Thin Forged-Iron XP Bar across the top edge with cyan light fill */}
      <div
        className="fixed top-0 left-0 right-0 z-30 h-[7px] pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, #0d0e11 0%, #1a1c20 100%)',
          borderBottom: '1.5px solid #3a3f47',
          boxShadow: 'inset 0 1px 0 rgba(85, 93, 105, 0.45), 0 2px 6px rgba(0, 0, 0, 0.7)',
        }}
      >
        <div
          className="h-full transition-all duration-150 ease-out"
          style={{
            width: `${xpPercent}%`,
            background: 'linear-gradient(90deg, #2fb8d9 0%, #5de4ff 78%, #b8f5ff 100%)',
            boxShadow: '0 0 12px rgba(93, 228, 255, 0.72)',
          }}
        />
      </div>

      {/* Top HUD Row (Respects safe-area insets; 3-column grid prevents mobile collisions) */}
      <div
        className="w-full flex flex-col gap-1.5"
        style={{
          paddingTop: 'calc(max(12px, env(safe-area-inset-top)) + 6px)',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
        }}
      >
        <div className="w-full grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 sm:gap-3">
          {/* Top-Left: Forged-Iron HP Bar Panel + Status / Performance Tabs */}
          <div className="justify-self-start flex flex-col gap-1.5 sm:gap-2 min-w-0 max-w-full">
            <ForgedIronFrame
              seed="hud-hp-panel"
              dripCount={3}
              maxDripLength={16}
              className="w-[126px] sm:w-[216px] max-w-full"
              contentClassName="px-2.5 py-2 sm:px-3.5 sm:py-2.5 flex flex-col gap-1.5 sm:gap-2"
            >
              <div className="flex items-center justify-between gap-1.5 text-[11px] sm:text-xs">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e5303a] fill-[#b3121a] shrink-0" />
                  <span className="font-mono-numbers font-semibold text-[#d8c9a8] truncate tabular-nums">
                    {Math.round(hp)}
                    <span className="text-[#8e8168]">/{maxHp}</span>
                  </span>
                </div>
                <span
                  key={`hud-lv-${levelPopSeq}`}
                  className={`inline-block font-mono-numbers font-semibold text-[#d8c9a8] whitespace-nowrap shrink-0 ${
                    levelPopSeq > 0 ? 'hud-level-pop' : ''
                  }`}
                >
                  Lv.{level}
                </span>
              </div>

              <BloodHpBar hp={hp} maxHp={maxHp} />
            </ForgedIronFrame>

            {/* Compact HUD Tab Switcher: Status / Performance */}
            <div
              role="tablist"
              aria-label="HUD Panels"
              className="pointer-events-auto inline-flex items-center self-start rounded-[8px] border border-[#3a3f47] bg-[#121418]/92 p-0.5 shadow-[0_6px_16px_rgba(0,0,0,0.65)]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeHudTab === 'status'}
                onPointerDown={() => haptics.tap('light')}
                onClick={() => setActiveHudTab('status')}
                className={`px-2 sm:px-2.5 py-1 rounded-[6px] text-[9px] sm:text-[10px] font-display font-bold tracking-wider uppercase flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                  activeHudTab === 'status'
                    ? 'bg-[#2a1216] text-[#d8c9a8] border border-[#b3121a]/80 shadow-[0_0_8px_rgba(229,48,58,0.28)]'
                    : 'text-[#8e8168] hover:text-[#d8c9a8] border border-transparent'
                }`}
              >
                <Shield className="w-3 h-3 text-[#e5303a] shrink-0" />
                <span>Status</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeHudTab === 'performance'}
                onPointerDown={() => haptics.tap('light')}
                onClick={() => setActiveHudTab('performance')}
                className={`px-2 sm:px-2.5 py-1 rounded-[6px] text-[9px] sm:text-[10px] font-display font-bold tracking-wider uppercase flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                  activeHudTab === 'performance'
                    ? 'bg-[#2a1216] text-[#d8c9a8] border border-[#b3121a]/80 shadow-[0_0_8px_rgba(229,48,58,0.28)]'
                    : 'text-[#8e8168] hover:text-[#d8c9a8] border border-transparent'
                }`}
              >
                <Activity className="w-3 h-3 text-[#5de4ff] shrink-0" />
                <span>DPS</span>
              </button>
            </div>

            {activeHudTab === 'performance' && (
              <ForgedIronFrame
                seed="hud-performance-panel"
                dripCount={2}
                maxDripLength={12}
                borderColor="#3a3f47"
                className="pointer-events-auto w-[min(284px,calc(100vw-24px))]"
                contentClassName="px-3 py-2.5 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[11px] font-bold tracking-wider uppercase text-[#d8c9a8] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#e5303a]" />
                    Run DPS Curve
                  </span>
                  <span className="text-[10px] font-mono-numbers text-[#8e8168]">
                    {debugStats.killsPerMin} kills/m
                  </span>
                </div>
                <PerformanceChart
                  samples={dpsHistory}
                  currentDps={debugStats.playerDps}
                  width={256}
                  height={124}
                />
              </ForgedIronFrame>
            )}

            {/* Kill Combo, Pressure & Light Status indicators */}
            {activeHudTab === 'status' &&
              (combo > 1 ||
                isUnderPressure ||
                lightShardRemainingSec > 0 ||
                redShardRemainingSec > 0 ||
                darknessFallsRemainingSec > 0 ||
                bloodFogRemainingSec > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] max-w-[min(256px,calc(100vw-24px))]">
                {combo > 1 && (
                  <ForgedIronFrame
                    seed="hud-combo-badge"
                    dripCount={2}
                    maxDripLength={8}
                    borderColor="#5de4ff"
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1.5"
                  >
                    <span className="text-[#9c8e72]">XP</span>
                    <span className="font-mono-numbers font-bold text-[#5de4ff]">x{combo}</span>
                  </ForgedIronFrame>
                )}
                {isUnderPressure && (
                  <ForgedIronFrame
                    seed="hud-pressure-badge"
                    dripCount={2}
                    maxDripLength={9}
                    borderColor="#b3121a"
                    glowColor="#e5303a"
                    glowStrength={6}
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1 text-[#e5303a]"
                  >
                    <span className="font-semibold tracking-wider uppercase text-[10px]">
                      Pressure
                    </span>
                  </ForgedIronFrame>
                )}
                {lightShardRemainingSec > 0 && (
                  <ForgedIronFrame
                    seed="hud-shard-badge"
                    dripCount={2}
                    maxDripLength={8}
                    borderColor="#5de4ff"
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1.5 text-[#5de4ff]"
                  >
                    <span className="font-semibold tracking-wide text-[10px] uppercase">
                      Shard +35%
                    </span>
                    <span className="font-mono-numbers font-bold">{lightShardRemainingSec}s</span>
                  </ForgedIronFrame>
                )}
                {redShardRemainingSec > 0 && (
                  <ForgedIronFrame
                    seed="hud-red-shard-badge"
                    dripCount={2}
                    maxDripLength={8}
                    borderColor="#e5303a"
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1.5 text-[#e5303a]"
                  >
                    <span className="font-semibold tracking-wide text-[10px] uppercase">
                      Blood +15% DMG
                    </span>
                    <span className="font-mono-numbers font-bold">{redShardRemainingSec}s</span>
                  </ForgedIronFrame>
                )}
                {darknessFallsRemainingSec > 0 && (
                  <ForgedIronFrame
                    seed="hud-darkness-badge"
                    dripCount={2}
                    maxDripLength={9}
                    borderColor="#b3121a"
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1.5 text-[#d8c9a8]"
                  >
                    <span className="font-semibold tracking-wide text-[10px] uppercase">
                      Darkness · <span className="text-[#5de4ff]">+50% XP</span>
                    </span>
                    <span className="font-mono-numbers font-bold text-[#e5303a]">
                      {darknessFallsRemainingSec}s
                    </span>
                  </ForgedIronFrame>
                )}
                {bloodFogRemainingSec > 0 && (
                  <ForgedIronFrame
                    seed="hud-blood-fog-badge"
                    dripCount={3}
                    maxDripLength={12}
                    borderColor="#e5303a"
                    glowColor="#e5303a"
                    glowStrength={10}
                    contentClassName="px-2 sm:px-2.5 py-1 flex items-center gap-1.5 text-[#f7e7e2]"
                  >
                    <span className="font-semibold tracking-wide text-[10px] uppercase text-[#ff7077]">
                      Blood Fog · <span className="text-[#f2a93b]">+35% SPD · +65% Horde</span>
                    </span>
                    <span className="font-mono-numbers font-bold text-[#e5303a]">
                      {bloodFogRemainingSec}s
                    </span>
                  </ForgedIronFrame>
                )}
              </div>
            )}

            {/* Active Dynamic Challenge Pact Tracker */}
            {activeHudTab === 'status' && activeChallenge && (
              <ForgedIronFrame
                seed={`hud-challenge-${activeChallenge.id}`}
                dripCount={2}
                maxDripLength={10}
                borderColor={
                  activeChallenge.status === 'completed'
                    ? '#f2a93b'
                    : activeChallenge.status === 'failed'
                      ? '#b3121a'
                      : '#f2a93b'
                }
                glowColor={
                  activeChallenge.status === 'failed' ? '#e5303a' : '#f2a93b'
                }
                glowStrength={activeChallenge.status === 'active' ? 5 : 10}
                className="max-w-[232px]"
                contentClassName="px-2.5 py-1.5 flex flex-col gap-0.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#d8c9a8] truncate">
                    {activeChallenge.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      activeChallenge.status === 'completed'
                        ? 'text-[#f2a93b]'
                        : activeChallenge.status === 'failed'
                          ? 'text-[#e5303a]'
                          : 'text-[#5de4ff]'
                    }`}
                  >
                    {activeChallenge.status === 'completed'
                      ? 'Cleared'
                      : activeChallenge.status === 'failed'
                        ? 'Failed'
                        : 'Pact'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-numbers">
                  <span
                    className={
                      activeChallenge.status === 'failed'
                        ? 'text-[#e5303a]'
                        : activeChallenge.status === 'completed'
                          ? 'text-[#f2a93b]'
                          : 'text-[#9c8e72]'
                    }
                  >
                    {activeChallenge.statusNote}
                  </span>
                  {activeChallenge.status === 'active' && (
                    <span className="text-[#f2a93b] font-semibold shrink-0">
                      +{activeChallenge.rewardCoins}c
                    </span>
                  )}
                </div>
              </ForgedIronFrame>
            )}

            {/* Hidden Debug Overlay (toggled via 5 taps in top-left corner) */}
            {showDebug && (
              <ForgedIronFrame
                seed="hud-debug-panel"
                dripCount={2}
                maxDripLength={12}
                className="max-w-[208px]"
                contentClassName="px-3 py-2 text-[11px] font-mono-numbers text-[#d8c9a8] flex flex-col gap-0.5"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#e5303a] mb-0.5">
                  Debug Telemetry
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c8e72]">FPS</span>
                  <span>{debugStats.fps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c8e72]">Enemies</span>
                  <span>{debugStats.enemyCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c8e72]">Kills/min</span>
                  <span>{debugStats.killsPerMin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c8e72]">Player DPS</span>
                  <span>{debugStats.playerDps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9c8e72]">Minute</span>
                  <span>{debugStats.currentMinute}</span>
                </div>
              </ForgedIronFrame>
            )}
          </div>

          {/* Top-Center: Centered Forged-Iron Run Timer */}
          <div className="justify-self-center flex flex-col items-center shrink-0">
            <ForgedIronFrame
              seed="hud-timer-panel"
              dripCount={2}
              maxDripLength={12}
              contentClassName="px-2.5 sm:px-4 py-1.5 flex items-center justify-center min-h-[40px] sm:min-h-[44px]"
            >
              <span className="font-mono-numbers text-base sm:text-2xl font-bold tracking-wider text-[#d8c9a8] tabular-nums whitespace-nowrap">
                {timeFormatted}
              </span>
            </ForgedIronFrame>
          </div>

          {/* Top-Right: Kill & Coin Counter + 56px Spacer for UIScene Pause Button */}
          <div className="justify-self-end flex items-start gap-1.5 sm:gap-2.5 min-w-0">
            <ForgedIronFrame
              seed="hud-kills-coins"
              dripCount={2}
              maxDripLength={12}
              contentClassName="px-2 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs h-[40px] sm:h-[44px]"
            >
              <div className="flex items-center gap-1 whitespace-nowrap" title="Kills">
                <Skull className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#e5303a] shrink-0" />
                <span className="font-mono-numbers font-semibold text-[#d8c9a8] tabular-nums">
                  {kills}
                </span>
              </div>
              <span className="h-3.5 w-px bg-[#3a3f47] shrink-0" aria-hidden="true" />
              <div
                key={`hud-coin-${coinPopSeq}`}
                className={`flex items-center gap-1 whitespace-nowrap ${coinPopSeq > 0 ? 'hud-coin-pop' : ''}`}
                title="Coins"
              >
                <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#f2a93b] shrink-0" />
                <span className="font-mono-numbers font-semibold text-[#d8c9a8] tabular-nums">
                  {coins}
                </span>
              </div>
            </ForgedIronFrame>

            {/* Dedicated 56x56 slot matching UIScene interactive pause button */}
            <div className="w-14 h-14 shrink-0 pointer-events-none" aria-hidden="true" />
          </div>
        </div>

        {/* Dedicated Centered Boss Countdown Strip (cleanly below top HUD row, zero horizontal overlap) */}
        {!boss && (
          <div className="w-full flex justify-center pointer-events-none">
            <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#0e1014]/75 border border-[#3a3f47]/65 text-[10px] sm:text-[11px] text-[#9c8e72] whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.45)]">
              <span>
                Boss in{' '}
                <span className="font-mono-numbers font-semibold text-[#e5303a] tabular-nums">
                  {bossTimeStr}
                </span>
              </span>
              <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
              <span className="font-mono-numbers text-[#f2a93b]">Rec. Lv. 60</span>
              <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
              <button
                type="button"
                onPointerDown={() => haptics.tap('light')}
                onClick={onSpawnBossNow}
                className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-[#d8c9a8] hover:text-[#e5303a] transition-colors cursor-pointer underline underline-offset-2"
                title="Summon Boss now (Recommended Level 60)"
              >
                Summon
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2s Event Warning Banner */}
      {eventWarning && (
        <div className="w-full max-w-md mx-auto px-4">
          <ForgedIronFrame
            seed={`event-warning-${eventWarning.title}`}
            dripCount={3}
            maxDripLength={18}
            borderColor="#b3121a"
            glowColor="#e5303a"
            glowStrength={12}
            contentClassName="px-4 py-2.5 flex items-center gap-3 justify-center text-center"
          >
            <AlertTriangle className="w-5 h-5 text-[#e5303a] shrink-0" />
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold tracking-wider text-[#e5303a]">
                {eventWarning.title}
              </span>
              <span className="text-[11px] text-[#d8c9a8]">{eventWarning.subtitle}</span>
            </div>
          </ForgedIronFrame>
        </div>
      )}

      {/* Persistent Boss Health Overlay (fixed top-center when boss is active) */}
      <BossHealthOverlay boss={boss} playerLevel={level} />

      {/* Bottom Area: Dash charge control + quiet unboxed weapon levels on bottom-right (keeps bottom-left clear for joystick) */}
      <div
        className="w-full flex flex-col items-end gap-2.5"
        style={{
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
        }}
      >
        <button
          type="button"
          onPointerDown={() => {
            if (dashCharges > 0) {
              haptics.tap('light');
              onTriggerDash();
            }
          }}
          disabled={dashCharges <= 0}
          aria-label="Dash (Space or Shift)"
          className={`pointer-events-auto min-h-[56px] min-w-[106px] px-3.5 py-2 rounded-[10px] border flex items-center justify-between gap-2.5 transition-all cursor-pointer active:scale-95 ${
            dashCharges > 0
              ? 'bg-[#151a20]/90 border-[#5de4ff]/70 text-[#e8dcc2] shadow-[0_0_14px_rgba(93,228,255,0.22)] hover:border-[#5de4ff]'
              : 'bg-[#121417]/80 border-[#3a3f47] text-[#7c7361] cursor-not-allowed'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wind
              className={`w-4 h-4 ${dashCharges > 0 ? 'text-[#5de4ff]' : 'text-[#5a606b]'}`}
            />
            <div className="flex flex-col items-start leading-tight">
              <span className="font-display text-[11px] font-bold tracking-wider uppercase">
                Dash
              </span>
              <span className="text-[9px] text-[#9c8e72] font-mono-numbers">Space</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: maxDashCharges }).map((_, idx) => {
                const ready = idx < dashCharges;
                return (
                  <span
                    key={idx}
                    className={`w-2.5 h-2.5 rounded-full border transition-all ${
                      ready
                        ? 'bg-[#5de4ff] border-[#b8f5ff] shadow-[0_0_6px_rgba(93,228,255,0.85)]'
                        : 'bg-[#1c2026] border-[#3a3f47]'
                    }`}
                  />
                );
              })}
            </div>
            {dashCharges < maxDashCharges && (
              <div className="w-8 h-1 rounded-full bg-[#1f2329] overflow-hidden">
                <div
                  className="h-full bg-[#5de4ff]/80 transition-all duration-75"
                  style={{ width: `${Math.round(dashCooldownProgress * 100)}%` }}
                />
              </div>
            )}
          </div>
        </button>

        <div className="max-w-[58vw] sm:max-w-[54vw] flex flex-wrap items-center justify-end gap-x-2.5 gap-y-1 text-[10px] sm:text-[11px] text-[#9c8e72] text-right">
          {activeSynergyMetas.map((synergyMeta, idx) => (
            <React.Fragment key={synergyMeta.id}>
              {idx > 0 && (
                <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
              )}
              <span
                className="flex items-center gap-1 font-semibold"
                style={{ color: synergyMeta.accentColor }}
                title={synergyMeta.bonusSummary}
              >
                <span>★ {synergyMeta.synergyTitle}</span>
              </span>
            </React.Fragment>
          ))}
          {activeSynergyMetas.length > 0 &&
            (equippedRelics.length > 0 || unlockedWeapons.length > 0) && (
              <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
            )}
          {equippedRelics.map((relic, idx) => (
            <React.Fragment key={relic.id}>
              {idx > 0 && (
                <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
              )}
              <span className="flex items-center gap-1 text-[#d8c9a8]">
                <Gem className="w-3 h-3" style={{ color: relic.accentColor }} />
                <span className="font-medium">{relic.name}</span>
              </span>
            </React.Fragment>
          ))}
          {equippedRelics.length > 0 && unlockedWeapons.length > 0 && (
            <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
          )}
          {unlockedWeapons.map((w, idx) => (
            <React.Fragment key={w.id}>
              {idx > 0 && (
                <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
              )}
              <span className="flex items-center gap-1">
                <span className="text-[#d8c9a8] font-medium">{w.name}</span>
                <span className="font-mono-numbers text-[#e5303a] font-semibold">
                  {w.level}
                </span>
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export const HUD = React.memo(HUDComponent);
