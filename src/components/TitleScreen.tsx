import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  ShoppingBag,
  Volume2,
  VolumeX,
  Coins,
  Settings,
  ScrollText,
  Flame,
  BookMarked,
  Gem,
  ChevronRight,
  Magnet,
  Wind,
  Heart,
  Sun,
  Zap,
  Sword,
  Trophy,
} from 'lucide-react';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { dailyMissions } from '../game/dailyMissions';
import { dailyStreak } from '../game/dailyStreak';
import { BESTIARY_ENTRIES, bestiary } from '../game/bestiary';
import { ACHIEVEMENTS, achievements } from '../game/achievements';
import {
  RELICS,
  RELIC_RARITY_META,
  RELIC_SETS,
  getActiveRelicSynergies,
  getEquippedRelicIds,
  getEquippedRelics,
  getMaxRelicSlots,
  getNextRelicSlotUnlockInfo,
  getRelicSeals,
  getUnlockedRelicIds,
  subscribeRelics,
} from '../game/relics';
import { soundManager } from '../game/audio';
import { DailyStreakState, RelicDefinition, RelicId } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface TitleScreenProps {
  isMuted: boolean;
  isModalOpen?: boolean;
  onStartGame: () => void;
  onOpenShop: (initialTab?: 'upgrades' | 'relics') => void;
  onOpenMissions: () => void;
  onOpenBestiary: () => void;
  onOpenAchievements: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

function renderRelicIcon(
  icon: RelicDefinition['icon'] | null | undefined,
  className: string,
  color: string
) {
  switch (icon) {
    case 'magnet':
      return <Magnet className={className} style={{ color }} />;
    case 'wind':
      return <Wind className={className} style={{ color }} />;
    case 'heart':
      return <Heart className={className} style={{ color }} />;
    case 'sun':
      return <Sun className={className} style={{ color }} />;
    case 'zap':
      return <Zap className={className} style={{ color }} />;
    case 'sword':
      return <Sword className={className} style={{ color }} />;
    default:
      return <Gem className={className} style={{ color }} />;
  }
}

const EMBER_PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const seed = (i * 37 + 13) % 100;
  const palettePick = i % 7;
  let color = '#e5303a'; // fresh blood ember
  let opacity = 0.65;
  if (palettePick === 0) {
    color = '#5de4ff'; // rare lantern wisp
    opacity = 0.42;
  } else if (palettePick === 2 || palettePick === 5) {
    color = '#f2a93b'; // forge spark
    opacity = 0.68;
  } else if (palettePick === 4) {
    color = '#b3121a'; // deep crimson ember
    opacity = 0.72;
  }

  return {
    id: i,
    left: `${(i * 4.1 + (seed % 5)) % 98}%`,
    size: 2 + (i % 3) * 1.4,
    duration: `${8 + (i % 7) * 1.6}s`,
    delay: `${-(i * 0.9)}s`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (12 + (seed % 28))}px`,
    opacity,
    color,
  };
});

export const TitleScreen: React.FC<TitleScreenProps> = ({
  isMuted,
  isModalOpen = false,
  onStartGame,
  onOpenShop,
  onOpenMissions,
  onOpenBestiary,
  onOpenAchievements,
  onToggleMute,
  onOpenSettings,
}) => {
  const [bankCoins, setBankCoins] = useState<number>(() => getSavedCoins());
  const [unclaimedMissions, setUnclaimedMissions] = useState<number>(() =>
    dailyMissions.getUnclaimedCount()
  );
  const [discoveredCount, setDiscoveredCount] = useState<number>(() =>
    bestiary.getDiscoveredCount()
  );
  const [unlockedAchievements, setUnlockedAchievements] = useState<number>(() =>
    achievements.getUnlockedCount()
  );
  const [unclaimedAchievements, setUnclaimedAchievements] = useState<number>(() =>
    achievements.getUnclaimedCount()
  );
  const [equippedRelics, setEquippedRelics] = useState<RelicDefinition[]>(() =>
    getEquippedRelics()
  );
  const [unlockedRelicIds, setUnlockedRelicIds] = useState<RelicId[]>(() =>
    getUnlockedRelicIds()
  );
  const [relicSeals, setRelicSeals] = useState<number>(() => getRelicSeals());
  const [maxRelicSlots, setMaxRelicSlots] = useState<number>(() => getMaxRelicSlots());
  const [equipPopSeq, setEquipPopSeq] = useState<number>(0);
  const prevEquippedIdsRef = useRef<RelicId[]>(getEquippedRelicIds());
  const [streak, setStreak] = useState<DailyStreakState>(() => dailyStreak.getState());
  const [streakBonusToast, setStreakBonusToast] = useState<{
    streak: number;
    coins: number;
    streakContinued: boolean;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubCoins = subscribeCoins(setBankCoins);
    const unsubMissions = dailyMissions.subscribe(() => {
      setUnclaimedMissions(dailyMissions.getUnclaimedCount());
    });
    const unsubBestiary = bestiary.subscribe(() => {
      setDiscoveredCount(bestiary.getDiscoveredCount());
    });
    const unsubAchievements = achievements.subscribe(() => {
      setUnlockedAchievements(achievements.getUnlockedCount());
      setUnclaimedAchievements(achievements.getUnclaimedCount());
    });
    const unsubRelics = subscribeRelics(
      ({ unlockedRelics, equippedRelicIds, relicSeals: nextSeals, maxRelicSlots: nextSlots }) => {
        const addedRelic = equippedRelicIds.some(
          (id) => !prevEquippedIdsRef.current.includes(id)
        );
        if (addedRelic) {
          setEquipPopSeq((seq) => seq + 1);
        }
        prevEquippedIdsRef.current = [...equippedRelicIds];
        setEquippedRelics(getEquippedRelics());
        setUnlockedRelicIds(unlockedRelics);
        setRelicSeals(nextSeals);
        setMaxRelicSlots(nextSlots);
      }
    );

    const claimDailyLogin = () => {
      const result = dailyStreak.checkAndClaimDailyLogin();
      setStreak(result.state);
      setBankCoins(getSavedCoins());

      if (result.awardedToday && result.rewardCoins > 0) {
        setStreakBonusToast({
          streak: result.state.currentStreak,
          coins: result.rewardCoins,
          streakContinued: result.streakContinued,
        });
        haptics.tap('medium');
        soundManager.playCoinCollect();

        if (toastTimerRef.current !== null) {
          window.clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = window.setTimeout(() => {
          toastTimerRef.current = null;
          setStreakBonusToast(null);
        }, 4500);
      }
    };

    claimDailyLogin();

    const handleVisibility = () => {
      if (!document.hidden) {
        claimDailyLogin();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubCoins();
      unsubMissions();
      unsubBestiary();
      unsubAchievements();
      unsubRelics();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  // Allow Enter or Space to start when no modal overlay is open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        onStartGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, isModalOpen]);

  const nextDayReward = dailyStreak.getNextDayReward(streak.currentStreak);
  const activeSynergies = getActiveRelicSynergies(equippedRelics.map((r) => r.id));
  const activeSynergy = activeSynergies[0] ?? null;
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockNewSlot = Boolean(nextSlotInfo && relicSeals >= nextSlotInfo.costSeals);
  const primaryRelic = equippedRelics[0] ?? null;

  return (
    <div
      className="relative w-full h-full min-h-screen flex flex-col justify-between items-center safe-area-pad select-none z-30 overflow-y-auto overflow-x-hidden bg-[#121316]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 36%, rgba(58, 10, 14, 0.38) 0%, rgba(26, 28, 32, 0.42) 38%, rgba(12, 13, 16, 0.98) 76%)',
      }}
    >
      {/* Drifting Forge & Blood Ember Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {EMBER_PARTICLES.map((p) => (
          <span
            key={p.id}
            className="ember-particle absolute -bottom-4 rounded-full"
            style={
              {
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                '--ember-duration': p.duration,
                '--ember-delay': p.delay,
                '--ember-drift': p.drift,
                '--ember-opacity': p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Top Bar: Bank Coins, Daily Streak & 56px Iron Mute Button */}
      <div className="relative z-10 w-full max-w-5xl flex items-center justify-between gap-2 pt-1 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <ForgedIronFrame
            seed="title-coins-panel"
            dripCount={2}
            maxDripLength={12}
            contentClassName="px-3 sm:px-4 py-2.5 flex items-center gap-2 sm:gap-2.5 min-h-[56px]"
          >
            <Coins className="w-4 h-4 text-[#f2a93b] shrink-0" />
            <span className="text-[11px] sm:text-xs text-[#9c8e72] font-medium whitespace-nowrap">
              <span className="hidden sm:inline">Soul </span>Coins
            </span>
            <span className="font-mono-numbers font-semibold text-[#d8c9a8] text-sm">
              {bankCoins}
            </span>
          </ForgedIronFrame>

          <ForgedIronFrame
            seed="title-streak-panel"
            dripCount={2}
            maxDripLength={12}
            borderColor={streak.currentStreak > 1 ? '#f2a93b' : undefined}
            contentClassName="px-3 sm:px-4 py-2.5 flex items-center gap-2 min-h-[56px]"
          >
            <Flame
              className="w-4 h-4 text-[#e5303a] shrink-0"
              aria-hidden="true"
            />
            <div
              className="flex items-center gap-1.5 whitespace-nowrap"
              title={`Daily Streak: Day ${streak.currentStreak} · Best: ${streak.bestStreak}d · Tomorrow: +${nextDayReward} Coins`}
            >
              <span className="text-[11px] sm:text-xs text-[#9c8e72] font-medium hidden sm:inline">
                Streak
              </span>
              <span className="font-mono-numbers font-semibold text-[#f2a93b] text-xs sm:text-sm">
                Day {Math.max(1, streak.currentStreak)}
              </span>
              <span className="hidden md:inline text-[11px] text-[#9c8e72]">
                · Next +{nextDayReward}
              </span>
            </div>
          </ForgedIronFrame>
        </div>

        <IronButton
          seed="title-mute-btn"
          dripCount={2}
          onClick={onToggleMute}
          className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
          aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-[#e5303a]" />
          ) : (
            <Volume2 className="w-5 h-5 text-[#d8c9a8]" />
          )}
        </IronButton>
      </div>

      {/* Daily Login Streak Bonus Banner */}
      {streakBonusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
          style={{
            top: 'calc(max(16px, env(safe-area-inset-top)) + 68px)',
          }}
        >
          <div className="mission-banner-enter">
            <ForgedIronFrame
              seed={`daily-streak-toast-${streakBonusToast.streak}`}
              dripCount={3}
              maxDripLength={12}
              borderColor="#f2a93b"
              glowColor="#f2a93b"
              glowStrength={14}
              contentClassName="px-4 py-2.5 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-[8px] bg-[#121417] border border-[#f2a93b]/70 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4 text-[#e5303a]" />
                </div>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="font-display text-xs font-bold tracking-[0.12em] text-[#f2a93b] uppercase">
                    Day {streakBonusToast.streak} Daily Streak
                  </span>
                  <span className="text-[11px] text-[#9c8e72] truncate">
                    {streakBonusToast.streakContinued
                      ? 'Consecutive login bonus awarded'
                      : 'Daily login bonus awarded'}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-[7px] bg-[#121417]/90 border border-[#f2a93b]/55">
                <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                <span className="font-mono-numbers text-xs font-bold text-[#f2a93b]">
                  +{streakBonusToast.coins}
                </span>
              </div>
            </ForgedIronFrame>
          </div>
        </div>
      )}

      {/* Main Centerpiece */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center my-auto px-2">
        {/* LAST LIGHT Logo with soft cyan lantern glow */}
        <div className="relative mb-6">
          <div
            className="absolute -inset-x-10 -inset-y-4 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #5de4ff 0%, transparent 70%)' }}
            aria-hidden="true"
          />
          <h1
            className="font-display font-black tracking-[0.16em] text-4xl sm:text-5xl md:text-6xl text-[#e8dcc2] whitespace-nowrap"
            style={{
              textShadow:
                '0 2px 10px rgba(0, 0, 0, 0.95), 0 0 26px rgba(93, 228, 255, 0.35), 0 0 46px rgba(179, 18, 26, 0.25)',
            }}
          >
            LAST LIGHT
          </h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-10 sm:w-12 bg-gradient-to-r from-transparent via-[#6b3a2a] to-[#b3121a]" />
            <div className="relative inline-flex flex-col items-center">
              <span
                className="font-blood text-xs sm:text-sm tracking-[0.14em] uppercase whitespace-nowrap text-[#e5303a]"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #ff7a82 0%, #e5303a 42%, #9e0b14 78%, #4d0408 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter:
                    'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 12px rgba(229, 48, 58, 0.52))',
                }}
              >
                Hardcore Roguelike
              </span>
              {/* Subtle crimson blood drips hanging beneath the letters */}
              <svg
                aria-hidden="true"
                viewBox="0 0 180 14"
                className="w-40 sm:w-48 h-3 -mt-1 pointer-events-none blood-title-drip"
                fill="none"
              >
                <defs>
                  <linearGradient id="titleBloodDripGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d9141f" />
                    <stop offset="70%" stopColor="#8c0a12" />
                    <stop offset="100%" stopColor="#420408" />
                  </linearGradient>
                </defs>
                <path
                  d="M22 0 C22 4 20 7 22 9 C24 7 22 4 22 0 Z M58 0 C58 5 55.5 9.5 58 12.5 C60.5 9.5 58 5 58 0 Z M96 0 C96 3.5 94.5 6 96 8 C97.5 6 96 3.5 96 0 Z M132 0 C132 5 129.5 10 132 13 C134.5 10 132 5 132 0 Z M160 0 C160 4 158.5 7 160 9.5 C161.5 7 160 4 160 0 Z"
                  fill="url(#titleBloodDripGrad)"
                />
              </svg>
            </div>
            <span className="h-px w-10 sm:w-12 bg-gradient-to-l from-transparent via-[#6b3a2a] to-[#b3121a]" />
          </div>
        </div>

        {/* Hero Preview (Dark Warden with idle breathing, lantern glow, shadow & Equipped Relic icons) */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-3">
            {/* Soft radial lantern aura pulsing gently behind the Dark Warden */}
            <div
              className="absolute inset-1 rounded-full blur-2xl pointer-events-none hero-lantern-breathe"
              style={{
                background: activeSynergy
                  ? `radial-gradient(circle, ${activeSynergy.accentColor}66 0%, #5de4ff44 45%, transparent 74%)`
                  : 'radial-gradient(circle, #5de4ff 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
            {/* Focused lantern glow near the Dark Warden's right-side lantern */}
            <div
              className="absolute right-0 bottom-2 w-12 h-12 rounded-full blur-xl pointer-events-none hero-lantern-breathe"
              style={{
                background: 'radial-gradient(circle, rgba(93, 228, 255, 0.72) 0%, transparent 72%)',
              }}
              aria-hidden="true"
            />
            {/* Ground shadow pulsing in sync with breathing float */}
            <div
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-3 rounded-full blur-[3px] pointer-events-none hero-shadow-breathe"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0, 0, 0, 0.82) 0%, transparent 75%)',
              }}
              aria-hidden="true"
            />
            {/* Subtle drifting lantern wisps */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 bottom-6 w-1.5 h-1.5 rounded-full bg-[#5de4ff] shadow-[0_0_8px_#5de4ff] hero-wisp-drift"
              style={{ '--wisp-dx': '6px', '--wisp-dur': '2.9s', '--wisp-delay': '0s' } as React.CSSProperties}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 bottom-5 w-1 h-1 rounded-full bg-[#f2a93b] shadow-[0_0_6px_#f2a93b] hero-wisp-drift"
              style={{ '--wisp-dx': '-5px', '--wisp-dur': '3.5s', '--wisp-delay': '-1.3s' } as React.CSSProperties}
            />

            <div className="relative w-24 h-24 sm:w-28 sm:h-28 transition-transform duration-200 hover:scale-105">
              <img
                src="./assets/aistudio/player_d0a77e5b.png"
                alt="Dark Warden"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)] hero-idle-float"
              />
            </div>

            {equippedRelics.length > 0 && (
              <div className="absolute -top-1 -right-3 z-20 flex items-center gap-1">
                {equippedRelics.map((relic) => {
                  const rarityMeta = RELIC_RARITY_META[relic.rarity];
                  const badgeBorder = activeSynergy
                    ? activeSynergy.accentColor
                    : rarityMeta.borderColor;
                  const badgeGlow = activeSynergy
                    ? `${activeSynergy.accentColor}99`
                    : rarityMeta.glowColor;
                  return (
                    <div key={relic.id} className="relative">
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-1 rounded-[11px] relic-equipped-halo"
                        style={{
                          boxShadow: `0 0 14px ${badgeGlow}`,
                        }}
                      />
                      {equipPopSeq > 0 && (
                        <span
                          key={`title-badge-ring-${relic.id}-${equipPopSeq}`}
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 rounded-[9px] border-2 relic-equip-ring"
                          style={{ borderColor: badgeBorder }}
                        />
                      )}
                      <button
                        key={`title-badge-btn-${relic.id}-${equipPopSeq}`}
                        type="button"
                        onClick={() => {
                          soundManager.playUiClick();
                          haptics.tap('light');
                          onOpenShop('relics');
                        }}
                        aria-label={`Equipped ${rarityMeta.label} Relic: ${relic.name} (${relic.effectSummary})`}
                        title={`Equipped ${rarityMeta.label} · ${RELIC_SETS[relic.setId].setName} Set: ${relic.name} · ${relic.effectSummary}`}
                        className={`relative w-8 h-8 rounded-[9px] border-2 flex items-center justify-center transition-transform duration-150 hover:scale-110 cursor-pointer ${
                          equipPopSeq > 0 ? 'relic-equip-pop' : ''
                        }`}
                        style={{
                          backgroundColor: rarityMeta.bgTint,
                          borderColor: badgeBorder,
                          boxShadow: `0 4px 12px rgba(0,0,0,0.8), 0 0 12px ${badgeGlow}`,
                        }}
                      >
                        {renderRelicIcon(relic.icon, 'w-3.5 h-3.5', rarityMeta.textColor)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <ForgedIronFrame
            seed="title-hero-nameplate"
            dripCount={2}
            maxDripLength={10}
            contentClassName="px-5 py-2 text-xs font-display font-semibold tracking-wider text-[#d8c9a8]"
          >
            Dark Warden
          </ForgedIronFrame>
        </div>

        {/* Primary Menu Iron Buttons: Relic Slot / Play / Missions / Shop / Bestiary / Settings */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          {/* Prominent Pre-Run Relic & Synergy Selector */}
          {(() => {
            const minRelicCost = Math.min(...RELICS.map((r) => r.cost));
            const hasAvailableAction =
              canUnlockNewSlot ||
              (equippedRelics.length < maxRelicSlots &&
                (unlockedRelicIds.length > equippedRelics.length || bankCoins >= minRelicCost));
            const borderAccent = canUnlockNewSlot
              ? '#c084fc'
              : activeSynergy
                ? activeSynergy.accentColor
                : primaryRelic
                  ? RELIC_RARITY_META[primaryRelic.rarity].borderColor
                  : hasAvailableAction
                    ? '#5de4ff'
                    : undefined;

            return (
              <IronButton
                seed="title-relic-selector-btn"
                dripCount={2}
                borderColor={borderAccent}
                glowColor={borderAccent}
                glowStrength={canUnlockNewSlot || activeSynergy ? 12 : borderAccent ? 8 : 0}
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  onOpenShop('relics');
                }}
                className="w-full min-h-[58px] px-4 py-2 text-left"
              >
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      key={`title-slot-icon-${equipPopSeq}`}
                      className={`relative w-9 h-9 rounded-[8px] bg-[#121417] border flex items-center justify-center shrink-0 ${
                        primaryRelic && equipPopSeq > 0 ? 'relic-equip-pop' : ''
                      }`}
                      style={{
                        backgroundColor: primaryRelic
                          ? RELIC_RARITY_META[primaryRelic.rarity].bgTint
                          : '#121417',
                        borderColor: borderAccent ?? '#3a3f47',
                        boxShadow: activeSynergy
                          ? `0 0 12px ${activeSynergy.accentColor}88`
                          : primaryRelic
                            ? `0 0 10px ${RELIC_RARITY_META[primaryRelic.rarity].glowColor}`
                            : undefined,
                      }}
                    >
                      {renderRelicIcon(
                        primaryRelic?.icon,
                        'w-4 h-4',
                        activeSynergy
                          ? activeSynergy.accentColor
                          : primaryRelic
                            ? RELIC_RARITY_META[primaryRelic.rarity].textColor
                            : '#5de4ff'
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[10px] font-display font-bold tracking-[0.14em] uppercase text-[#9c8e72] font-mono-numbers">
                        {equippedRelics.length > 0
                          ? `Equipped Relics (${equippedRelics.length}/${maxRelicSlots})`
                          : `Pre-Run Relics (0/${maxRelicSlots})`}
                      </span>
                      {canUnlockNewSlot && nextSlotInfo ? (
                        <span className="text-xs sm:text-sm font-semibold text-[#d8b4fe] truncate mt-0.5">
                          Slot {nextSlotInfo.nextSlotNumber} Ready to Unlock ({relicSeals}/{nextSlotInfo.costSeals} Seals)
                        </span>
                      ) : equippedRelics.length > 0 ? (
                        <>
                          <span className="text-xs sm:text-sm font-semibold text-[#e8dcc2] truncate mt-0.5">
                            {equippedRelics.map((r) => r.name).join(' + ')}
                          </span>
                          {activeSynergies.length > 0 ? (
                            <span
                              className="text-[11px] font-semibold truncate"
                              style={{ color: activeSynergy?.accentColor ?? '#5de4ff' }}
                            >
                              {activeSynergies.length === 1
                                ? `Synergy: ${activeSynergies[0].synergyTitle} · ${activeSynergies[0].bonusSummary}`
                                : `Synergies: ${activeSynergies.map((s) => s.synergyTitle).join(' · ')}`}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9c8e72] truncate">
                              {equippedRelics.length === 1
                                ? `Equip another ${RELIC_SETS[equippedRelics[0].setId].setName} relic for Synergy`
                                : equippedRelics[0].effectSummary}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs sm:text-sm font-semibold text-[#5de4ff] truncate mt-0.5">
                          {unlockedRelicIds.length > 0
                            ? 'Tap to Equip Unlocked Relics'
                            : bankCoins >= minRelicCost
                              ? 'Unlock & Pair Relics for Synergy'
                              : 'Choose Passive Relics'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#d8c9a8] shrink-0">
                    {hasAvailableAction && (
                      <span
                        className={`w-2 h-2 rounded-full mr-1 ${
                          canUnlockNewSlot
                            ? 'bg-[#c084fc] shadow-[0_0_8px_rgba(192,132,252,0.95)]'
                            : 'bg-[#5de4ff] shadow-[0_0_8px_rgba(93,228,255,0.9)]'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{canUnlockNewSlot ? 'Unlock' : equippedRelics.length > 0 ? 'Change' : 'Select'}</span>
                    <ChevronRight className="w-4 h-4 text-[#9c8e72]" />
                  </div>
                </div>
              </IronButton>
            );
          })()}

          <IronButton
            seed="title-play-btn"
            variant="blood"
            dripCount={3}
            onClick={onStartGame}
            className="w-full min-h-[60px] font-display font-bold text-base tracking-[0.14em]"
          >
            <Play className="w-4 h-4 fill-[#e5303a] text-[#e5303a]" />
            <span>PLAY</span>
          </IronButton>

          <div className="grid grid-cols-2 gap-3 w-full">
            <IronButton
              seed="title-missions-btn"
              dripCount={2}
              onClick={onOpenMissions}
              className="w-full min-h-[56px] px-4 text-sm font-semibold"
            >
              <ScrollText className="w-4 h-4 text-[#f2a93b]" />
              <span>Missions</span>
              {unclaimedMissions > 0 && (
                <span className="ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#b3121a] border border-[#f2a93b] text-[11px] font-mono-numbers font-bold text-[#f2a93b] inline-flex items-center justify-center shadow-[0_0_8px_rgba(242,169,59,0.55)]">
                  {unclaimedMissions}
                </span>
              )}
            </IronButton>

            <IronButton
              seed="title-shop-btn"
              dripCount={2}
              onClick={() => onOpenShop('upgrades')}
              className="w-full min-h-[56px] px-4 text-sm font-semibold"
            >
              <ShoppingBag className="w-4 h-4 text-[#f2a93b]" />
              <span>Shop</span>
            </IronButton>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <IronButton
              seed="title-bestiary-btn"
              dripCount={2}
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onOpenBestiary();
              }}
              className="w-full min-h-[56px] px-4 text-sm font-semibold"
            >
              <BookMarked className="w-4 h-4 text-[#e5303a]" />
              <span>Bestiary</span>
              <span className="font-mono-numbers text-[11px] text-[#9c8e72]">
                {discoveredCount}/{BESTIARY_ENTRIES.length}
              </span>
            </IronButton>

            <IronButton
              seed="title-achievements-btn"
              dripCount={2}
              borderColor={unclaimedAchievements > 0 ? '#f2a93b' : undefined}
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onOpenAchievements();
              }}
              className="w-full min-h-[56px] px-3 text-sm font-semibold"
            >
              <Trophy className="w-4 h-4 text-[#f2a93b] shrink-0" />
              <span className="truncate">Achievements</span>
              {unclaimedAchievements > 0 ? (
                <span className="ml-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-[#b3121a] border border-[#f2a93b] text-[11px] font-mono-numbers font-bold text-[#f2a93b] inline-flex items-center justify-center shadow-[0_0_8px_rgba(242,169,59,0.55)] shrink-0">
                  {unclaimedAchievements}
                </span>
              ) : (
                <span className="font-mono-numbers text-[11px] text-[#9c8e72] shrink-0">
                  {unlockedAchievements}/{ACHIEVEMENTS.length}
                </span>
              )}
            </IronButton>
          </div>

          <IronButton
            seed="title-settings-btn"
            dripCount={2}
            onClick={onOpenSettings}
            className="w-full min-h-[54px] px-4 text-sm font-semibold"
          >
            <Settings className="w-4 h-4 text-[#d8c9a8]" />
            <span>Settings</span>
          </IronButton>
        </div>
      </div>

      {/* Minimal Bottom Hint */}
      <div className="relative z-10 w-full text-center text-xs text-[#8c7f67] pb-1">
        <span>WASD or Drag to move</span>
        <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">·</span>
        <span>Stand still to fire</span>
        <span className="mx-2 text-[#6b3a2a]" aria-hidden="true">·</span>
        <span>Esc to pause</span>
      </div>
    </div>
  );
};
