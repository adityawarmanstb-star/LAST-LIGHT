import React, { useRef, useState } from 'react';
import { Coins, Skull, Heart, AlertTriangle } from 'lucide-react';
import { BossInfo, DebugStats, EventWarningInfo, WeaponState } from '../game/types';
import { VirtualJoystick } from './VirtualJoystick';
import { ForgedIronFrame } from './ForgedIronFrame';
import { BloodHpBar } from './BloodHpBar';
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
  darknessFallsRemainingSec?: number;
  debugStats: DebugStats;
  eventWarning: EventWarningInfo | null;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onSpawnBossNow: () => void;
}

export const HUD: React.FC<HUDProps> = ({
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
  darknessFallsRemainingSec = 0,
  debugStats,
  eventWarning,
  onSpawnBossNow,
}) => {
  const [showDebug, setShowDebug] = useState(false);
  const debugTapTimestampsRef = useRef<number[]>([]);

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

      {/* Top HUD Row (Respects safe-area insets) */}
      <div
        className="w-full flex items-start justify-between gap-3"
        style={{
          paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 8px)',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
        }}
      >
        {/* Top-Left: Forged-Iron HP Bar Panel (+ Status Badges & Hidden Debug Overlay) */}
        <div className="flex flex-col gap-2">
          <ForgedIronFrame
            seed="hud-hp-panel"
            dripCount={3}
            maxDripLength={18}
            className="min-w-[184px] sm:min-w-[222px]"
            contentClassName="px-3.5 py-2.5 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-[#e5303a] fill-[#b3121a]" />
                <span className="font-mono-numbers font-semibold text-[#d8c9a8]">
                  {Math.round(hp)}
                  <span className="text-[#8e8168]"> / {maxHp}</span>
                </span>
              </div>
              <span className="font-mono-numbers font-semibold text-[#d8c9a8]">
                Lv. {level}
              </span>
            </div>

            <BloodHpBar hp={hp} maxHp={maxHp} />
          </ForgedIronFrame>

          {/* Kill Combo, Pressure & Light Status indicators */}
          {(combo > 1 ||
            isUnderPressure ||
            lightShardRemainingSec > 0 ||
            darknessFallsRemainingSec > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] max-w-[260px]">
              {combo > 1 && (
                <ForgedIronFrame
                  seed="hud-combo-badge"
                  dripCount={2}
                  maxDripLength={8}
                  borderColor="#5de4ff"
                  contentClassName="px-2.5 py-1 flex items-center gap-1.5"
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
                  contentClassName="px-2.5 py-1 flex items-center gap-1 text-[#e5303a]"
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
                  contentClassName="px-2.5 py-1 flex items-center gap-1.5 text-[#5de4ff]"
                >
                  <span className="font-semibold tracking-wide text-[10px] uppercase">
                    Shard +35%
                  </span>
                  <span className="font-mono-numbers font-bold">{lightShardRemainingSec}s</span>
                </ForgedIronFrame>
              )}
              {darknessFallsRemainingSec > 0 && (
                <ForgedIronFrame
                  seed="hud-darkness-badge"
                  dripCount={2}
                  maxDripLength={9}
                  borderColor="#b3121a"
                  contentClassName="px-2.5 py-1 flex items-center gap-1.5 text-[#d8c9a8]"
                >
                  <span className="font-semibold tracking-wide text-[10px] uppercase">
                    Darkness · <span className="text-[#5de4ff]">+50% XP</span>
                  </span>
                  <span className="font-mono-numbers font-bold text-[#e5303a]">
                    {darknessFallsRemainingSec}s
                  </span>
                </ForgedIronFrame>
              )}
            </div>
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
        <div className="flex flex-col items-center">
          <ForgedIronFrame
            seed="hud-timer-panel"
            dripCount={2}
            maxDripLength={14}
            contentClassName="px-4 py-1.5 flex items-center justify-center"
          >
            <span className="font-mono-numbers text-xl sm:text-2xl font-bold tracking-wider text-[#d8c9a8]">
              {timeFormatted}
            </span>
          </ForgedIronFrame>

          {!boss && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-[#9c8e72] pointer-events-auto">
              <span>
                Boss in{' '}
                <span className="font-mono-numbers font-medium text-[#e5303a]">
                  {bossTimeStr}
                </span>
              </span>
              <button
                onPointerDown={() => haptics.tap('light')}
                onClick={onSpawnBossNow}
                className="min-h-[56px] px-2.5 -my-4 inline-flex items-center text-[11px] text-[#d8c9a8] hover:text-[#e5303a] transition-colors cursor-pointer underline underline-offset-2"
                title="Summon Boss now"
              >
                Summon
              </button>
            </div>
          )}
        </div>

        {/* Top-Right: Kill & Coin Counter + 56px Spacer for UIScene Pause Button */}
        <div className="flex items-start gap-2.5">
          <ForgedIronFrame
            seed="hud-kills-coins"
            dripCount={2}
            maxDripLength={14}
            contentClassName="px-3.5 py-2 flex items-center gap-3 text-xs h-[44px]"
          >
            <div className="flex items-center gap-1.5" title="Kills">
              <Skull className="w-3.5 h-3.5 text-[#e5303a]" />
              <span className="font-mono-numbers font-semibold text-[#d8c9a8]">{kills}</span>
            </div>
            <span className="h-3.5 w-px bg-[#3a3f47]" aria-hidden="true" />
            <div className="flex items-center gap-1.5" title="Coins">
              <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
              <span className="font-mono-numbers font-semibold text-[#d8c9a8]">{coins}</span>
            </div>
          </ForgedIronFrame>

          {/* Dedicated 56x56 slot matching UIScene interactive pause button */}
          <div className="w-14 h-14 shrink-0 pointer-events-none" aria-hidden="true" />
        </div>
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

      {/* Boss Health Bar (centered below timer when active) */}
      {boss && (
        <div className="w-full max-w-lg mx-auto px-4 -mt-4">
          <ForgedIronFrame
            seed={`boss-bar-${boss.name}`}
            dripCount={4}
            maxDripLength={18}
            borderColor="#b3121a"
            glowColor="#e5303a"
            glowStrength={8}
            contentClassName="p-3.5"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-display font-bold tracking-wider text-[#e5303a]">
                {boss.name}
              </span>
              <span className="font-mono-numbers text-xs text-[#d8c9a8]">
                {boss.currentHp} / {boss.maxHp}
              </span>
            </div>
            <div
              className="w-full h-3 rounded-full overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #0b0c0e 0%, #14161a 100%)',
                borderTop: '1.5px solid #4a515e',
                borderBottom: '1.5px solid #07080a',
                borderLeft: '1.5px solid #3a3f47',
                borderRight: '1.5px solid #090a0c',
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-150 ease-out"
                style={{
                  width: `${Math.max(0, Math.min(100, (boss.currentHp / Math.max(1, boss.maxHp)) * 100))}%`,
                  background:
                    'linear-gradient(180deg, #e5303a 0%, #b3121a 55%, #3a0a0e 100%)',
                  boxShadow: '0 0 12px rgba(229, 48, 58, 0.6)',
                }}
              />
            </div>
          </ForgedIronFrame>
        </div>
      )}

      {/* Bottom Area: Quiet unboxed weapon levels on bottom-right (keeps bottom-left clear for joystick) */}
      <div
        className="w-full flex items-end justify-end"
        style={{
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
        }}
      >
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[11px] text-[#9c8e72]">
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
