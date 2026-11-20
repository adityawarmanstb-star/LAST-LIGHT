import React, { useEffect, useRef, useState } from 'react';
import { achievements } from '../game/achievements';
import { soundManager } from '../game/audio';
import { dailyMissions } from '../game/dailyMissions';
import { dailyStreak } from '../game/dailyStreak';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { getRelicSeals, subscribeRelics } from '../game/relics';
import { isDeveloperMode, subscribeDeveloperMode } from '../game/developerMode';
import { STAGE_CARD_ARTWORKS } from '../game/stages';
import { DailyStreakState, StageId } from '../game/types';
import { UI_ASSETS, preloadAllChromaKeyUiAssets } from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { CoinCounter } from './CoinCounter';
import { Icon } from './Icon';
import { AchievementsPage } from './lobby/AchievementsPage';
import { BestiaryPage } from './lobby/BestiaryPage';
import { HomePage } from './lobby/HomePage';
import { MissionsPage } from './lobby/MissionsPage';
import { ShopPage, ShopSubTab } from './lobby/ShopPage';
import { NineSlice } from './ui/NineSlice';
import { UiRoundButton } from './ui/UiButton';
import { UiToggle } from './ui/UiControls';
import { UI_SPRITES } from './ui/uiConfig';

export type LobbyTabId = 'shop' | 'missions' | 'home' | 'bestiary' | 'achievements';

interface TitleScreenProps {
  isMuted: boolean;
  selectedStageId?: StageId;
  isModalOpen?: boolean;
  initialTab?: LobbyTabId;
  initialShopSubTab?: ShopSubTab;
  onTabChange?: (tab: LobbyTabId, shopSubTab?: ShopSubTab) => void;
  onStartGame: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
}

const EMBER_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const seed = (i * 37 + 13) % 100;
  const palettePick = i % 4;
  const color =
    palettePick === 0
      ? '#d9532f'
      : palettePick === 1
        ? '#b3121a'
        : palettePick === 2
          ? '#c77c28'
          : '#5de4ff';
  return {
    id: i,
    left: `${(i * 9.4 + (seed % 6)) % 96}%`,
    size: 4 + (i % 3) * 2,
    duration: `${9.5 + (i % 4) * 1.6}s`,
    delay: `${-(i * 1.4)}s`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (seed % 20))}px`,
    opacity: palettePick === 3 ? 0.42 : 0.68,
    color,
  };
});

// Stage 2 (The Ashen Wood): blazing forest rising embers & sparks
const ASHEN_EMBER_PARTICLES = Array.from({ length: 18 }, (_, i) => {
  const seed = (i * 43 + 19) % 100;
  const palettePick = i % 4;
  const color =
    palettePick === 0
      ? '#ffd275'
      : palettePick === 1
        ? '#ff8c24'
        : palettePick === 2
          ? '#ff5a14'
          : '#e63917';
  const size = palettePick === 0 ? 3 + (i % 2) : 4 + (i % 3) * 1.5;
  return {
    id: i,
    left: `${(i * 5.6 + (seed % 5)) % 98}%`,
    size,
    duration: `${5.6 + (i % 5) * 1.25}s`,
    delay: `${-(i * 0.72)}s`,
    drift: `${(i % 3 === 0 ? -1 : 1) * (16 + (seed % 34))}px`,
    opacity: palettePick === 0 ? 0.92 : 0.78,
    color,
  };
});

// Stage 2 (The Ashen Wood): drifting charred ash flakes falling through smoky canopy
const ASHEN_ASH_FLAKES = Array.from({ length: 22 }, (_, i) => {
  const seed = (i * 59 + 29) % 100;
  const tonePick = i % 4;
  const color =
    tonePick === 0
      ? '#d6cac0'
      : tonePick === 1
        ? '#a3978e'
        : tonePick === 2
          ? '#756a62'
          : '#c2b4a8';
  const width = 3 + (i % 4);
  const height = Math.max(2, width - (i % 2 === 0 ? 1 : 2));
  return {
    id: i,
    left: `${(i * 4.7 + (seed % 7)) % 98}%`,
    width,
    height,
    duration: `${9.2 + (i % 5) * 1.75}s`,
    delay: `${-(i * 0.85)}s`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (20 + (seed % 32))}px`,
    rot: `${(i % 2 === 0 ? 1 : -1) * (140 + (seed % 200))}deg`,
    opacity: tonePick === 0 ? 0.48 : 0.36,
    color,
  };
});

export const TitleScreen: React.FC<TitleScreenProps> = ({
  isMuted,
  selectedStageId = 'stage_1',
  initialTab = 'home',
  initialShopSubTab = 'market',
  onTabChange,
  onStartGame,
  onToggleMute,
  onOpenSettings,
}) => {
  const isAshenWood = selectedStageId === 'stage_2';
  const [activeTab, setActiveTab] = useState<LobbyTabId>(initialTab);
  const [pressedTabId, setPressedTabId] = useState<LobbyTabId | null>(null);
  const [shopSubTab, setShopSubTab] = useState<ShopSubTab>(initialShopSubTab);
  const [bgLoadError, setBgLoadError] = useState(false);
  const [ashenBgLoadError, setAshenBgLoadError] = useState(false);
  const [bankCoins, setBankCoins] = useState<number>(() => getSavedCoins());
  const [relicSeals, setRelicSeals] = useState<number>(() => getRelicSeals());
  const [devMode, setDevMode] = useState<boolean>(() => isDeveloperMode());
  const [unclaimedMissions, setUnclaimedMissions] = useState<number>(() =>
    dailyMissions.getUnclaimedCount()
  );
  const [unclaimedAchievements, setUnclaimedAchievements] = useState<number>(() =>
    achievements.getUnclaimedCount()
  );
  const [streak, setStreak] = useState<DailyStreakState>(() => dailyStreak.getState());
  const [streakBonusToast, setStreakBonusToast] = useState<{
    streak: number;
    coins: number;
    streakContinued: boolean;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setShopSubTab(initialShopSubTab);
  }, [initialShopSubTab]);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();

    const unsubCoins = subscribeCoins(setBankCoins);
    const unsubRelics = subscribeRelics(({ relicSeals: nextSeals }) => {
      setRelicSeals(nextSeals);
    });
    const unsubDevMode = subscribeDeveloperMode(setDevMode);
    const unsubMissions = dailyMissions.subscribe(() => {
      setUnclaimedMissions(dailyMissions.getUnclaimedCount());
    });
    const unsubAchievements = achievements.subscribe(() => {
      setUnclaimedAchievements(achievements.getUnclaimedCount());
    });

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
        soundManager.playCoinGain(result.rewardCoins >= 100 ? 'large' : 'medium');

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
      unsubRelics();
      unsubDevMode();
      unsubMissions();
      unsubAchievements();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const switchTab = (tab: LobbyTabId, nextShopSubTab?: ShopSubTab) => {
    soundManager.playUiClick();
    haptics.tap('light');
    if (nextShopSubTab) {
      setShopSubTab(nextShopSubTab);
    }
    setActiveTab(tab);
    onTabChange?.(tab, nextShopSubTab);
  };

  const navTabs: {
    id: LobbyTabId;
    label: string;
    iconId: string;
    badge?: number;
    isHome?: boolean;
  }[] = [
    { id: 'shop', label: 'SHOP', iconId: 'nav_shop' },
    {
      id: 'missions',
      label: 'MISSIONS',
      iconId: 'nav_missions',
      badge: unclaimedMissions > 0 ? unclaimedMissions : undefined,
    },
    { id: 'home', label: 'HOME', iconId: 'nav_home', isHome: true },
    { id: 'bestiary', label: 'BESTIARY', iconId: 'nav_bestiary' },
    {
      id: 'achievements',
      label: 'TROPHY',
      iconId: 'nav_achievements',
      badge: unclaimedAchievements > 0 ? unclaimedAchievements : undefined,
    },
  ];

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between items-center overflow-hidden overflow-x-hidden select-none z-30 bg-[#07080a]">
      {/* Menu Backdrop: cover-fit stage backdrop with smooth crossfade, atmospheric particles & zero CSS filters */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            background: isAshenWood
              ? 'radial-gradient(circle at 50% 52%, #2a140c 0%, #140b08 48%, #070505 90%)'
              : 'radial-gradient(circle at 50% 44%, #151b22 0%, #101116 44%, #060709 88%)',
          }}
        />
        {!bgLoadError && (
          <img
            src={UI_ASSETS.bgDungeon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBgLoadError(true)}
            style={{ imageRendering: 'auto' }}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-out ${
              isAshenWood ? 'opacity-0' : 'opacity-90'
            }`}
          />
        )}
        {!ashenBgLoadError && (
          <img
            src={STAGE_CARD_ARTWORKS.stage_2}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setAshenBgLoadError(true)}
            style={{ imageRendering: 'auto' }}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-out ${
              isAshenWood ? 'opacity-95' : 'opacity-0'
            }`}
          />
        )}

        {/* Dark atmospheric gradient & vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: isAshenWood
              ? activeTab === 'home'
                ? 'linear-gradient(180deg, rgba(8,5,4,0.74) 0%, rgba(18,9,6,0.18) 32%, rgba(22,9,5,0.24) 64%, rgba(6,4,4,0.92) 100%)'
                : 'linear-gradient(180deg, rgba(8,5,4,0.86) 0%, rgba(16,9,6,0.64) 45%, rgba(6,4,4,0.95) 100%)'
              : activeTab === 'home'
                ? 'linear-gradient(180deg, rgba(5,6,8,0.78) 0%, rgba(10,11,14,0.24) 32%, rgba(12,8,9,0.3) 65%, rgba(5,5,7,0.94) 100%)'
                : 'linear-gradient(180deg, rgba(5,6,8,0.88) 0%, rgba(10,11,14,0.68) 45%, rgba(5,5,7,0.96) 100%)',
          }}
        />

        {isAshenWood ? (
          <>
            {/* Smoldering wildfire underglow & warm soot mist */}
            <div
              className="absolute -inset-x-8 bottom-0 h-72 ashen-fire-glow"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 85%, rgba(255, 108, 28, 0.28) 0%, rgba(214, 58, 18, 0.16) 42%, rgba(92, 22, 10, 0.06) 68%, transparent 86%)',
              }}
            />
            <div
              className="absolute -inset-x-10 bottom-16 h-60 ashen-smoke-drift"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 58%, rgba(196, 82, 28, 0.15) 0%, rgba(56, 26, 18, 0.18) 46%, rgba(18, 10, 8, 0.06) 70%, transparent 84%)',
              }}
            />

            {/* Falling charred ash flakes */}
            {ASHEN_ASH_FLAKES.map((flake) => (
              <span
                key={`ash-${flake.id}`}
                className="ashen-ash-flake absolute -top-4"
                style={
                  {
                    left: flake.left,
                    width: `${flake.width}px`,
                    height: `${flake.height}px`,
                    borderRadius: '42% 58% 52% 48%',
                    backgroundColor: flake.color,
                    '--ash-duration': flake.duration,
                    '--ash-delay': flake.delay,
                    '--ash-drift': flake.drift,
                    '--ash-rot': flake.rot,
                    '--ash-opacity': flake.opacity,
                  } as React.CSSProperties
                }
              />
            ))}

            {/* Rising fiery embers & glowing sparks */}
            {ASHEN_EMBER_PARTICLES.map((p) => (
              <span
                key={`ashen-ember-${p.id}`}
                className="ashen-ember-particle absolute -bottom-4 rounded-full"
                style={
                  {
                    left: p.left,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: `radial-gradient(circle, #fff3c4 0%, ${p.color} 42%, ${p.color}66 72%, transparent 100%)`,
                    '--ember-duration': p.duration,
                    '--ember-delay': p.delay,
                    '--ember-drift': p.drift,
                    '--ember-opacity': p.opacity,
                  } as React.CSSProperties
                }
              />
            ))}
          </>
        ) : (
          <>
            <div
              className="absolute -inset-x-10 bottom-16 h-56 dungeon-mist-drift"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 60%, rgba(64, 118, 136, 0.14) 0%, rgba(34, 14, 16, 0.16) 44%, rgba(16, 12, 14, 0.05) 66%, transparent 82%)',
              }}
            />
            {EMBER_PARTICLES.map((p) => (
              <span
                key={p.id}
                className="ember-particle absolute -bottom-4 rounded-full"
                style={
                  {
                    left: p.left,
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                    background: `radial-gradient(circle, ${p.color} 0%, ${p.color}88 45%, transparent 100%)`,
                    '--ember-duration': p.duration,
                    '--ember-delay': p.delay,
                    '--ember-drift': p.drift,
                    '--ember-opacity': p.opacity,
                  } as React.CSSProperties
                }
              />
            ))}
          </>
        )}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 96px rgba(0, 0, 0, 0.9)',
          }}
        />
      </div>

      {/* Centered Responsive Column (max 540px, safe-area inset respected, zero horizontal overflow) */}
      <div
        className="relative z-10 w-full max-w-[540px] h-full flex flex-col justify-between items-center mx-auto"
        style={{
          paddingLeft: 'max(8px, env(safe-area-inset-left))',
          paddingRight: 'max(8px, env(safe-area-inset-right))',
          paddingBottom: 'calc(clamp(98px, 12.6vh, 114px) + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* PERSISTENT TOP HEADER */}
        <header
          className="w-full shrink-0 px-1 sm:px-2 pt-[max(10px,env(safe-area-inset-top))] pb-1.5 flex items-center justify-between gap-1.5"
          aria-label="Persistent Status Header"
        >
          {/* Left Currency & Day Streak Plates */}
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => switchTab('shop', 'market')}
              aria-label={`Coins ${devMode ? 'Unlimited' : bankCoins} and Gems ${devMode ? 'Unlimited' : relicSeals}. Open Shop`}
              className="cursor-pointer active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              <NineSlice
                variant="miniPlate"
                tileTexture="row"
                padding="0px"
                className="min-h-[44px] flex items-center"
                contentClassName="px-2 py-1 flex items-center gap-1.5 sm:gap-2"
              >
                <CoinCounter
                  coins={bankCoins}
                  isUnlimited={devMode}
                  iconSize={16}
                  textClassName="font-mono-numbers text-[clamp(11px,2vw,13px)] font-bold text-[#edd18a] whitespace-nowrap"
                />
                <span className="w-px h-3.5 bg-[#5e382c]" aria-hidden="true" />
                <div className="flex items-center gap-1">
                  <Icon id="crimson_gem" size={16} />
                  <span className="font-mono-numbers text-[clamp(11px,2vw,13px)] font-bold text-[#f0cad9] whitespace-nowrap">
                    {devMode ? '∞' : relicSeals}
                  </span>
                </div>
              </NineSlice>
            </button>

            <button
              type="button"
              onClick={() => switchTab('missions')}
              aria-label={`Day ${Math.max(1, streak.currentStreak)} streak. Open Missions`}
              className="cursor-pointer active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              <NineSlice
                variant="miniPlate"
                tileTexture="row"
                highlight="ember"
                padding="0px"
                className="min-h-[44px] flex items-center"
                contentClassName="px-2 py-1 flex items-center gap-1"
              >
                <Icon id="ui_day_flame" size={15} />
                <span className="font-mono-numbers text-[clamp(11px,2vw,13px)] font-bold text-[#f2dfba] whitespace-nowrap">
                  Day {Math.max(1, streak.currentStreak)}
                </span>
              </NineSlice>
            </button>
          </div>

          {/* Top-Right: Audio Mute Switch (track + knob, zero MUTE/ON text) & Settings Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-0.5">
              <Icon id={isMuted ? 'ui_sound_off' : 'ui_sound_on'} size={18} />
              <UiToggle
                checked={!isMuted}
                ariaLabel={isMuted ? 'Unmute Sound' : 'Mute Sound'}
                onToggle={() => {
                  const wasMuted = isMuted;
                  onToggleMute();
                  if (wasMuted) {
                    window.setTimeout(() => soundManager.playUiClick(), 0);
                  }
                }}
              />
            </div>

            <UiRoundButton
              variant="steel"
              sizePx={46}
              onClick={() => {
                soundManager.playUiClick();
                onOpenSettings();
              }}
              aria-label="Open Settings"
            >
              <Icon id="ui_settings" size={22} />
            </UiRoundButton>
          </div>
        </header>

        {/* Daily Login Streak Reward Toast */}
        {streakBonusToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[440px] pointer-events-none"
            style={{
              top: 'calc(max(12px, env(safe-area-inset-top)) + 64px)',
            }}
          >
            <div className="mission-banner-enter">
              <NineSlice
                variant="bannerCrimson"
                tileTexture="row"
                highlight="blood"
                padding="0px"
                contentClassName="px-3 py-2 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon id="ui_day_flame" size={18} />
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="font-display text-[11px] font-bold tracking-[0.1em] text-[#e6c38d] uppercase">
                      Day {streakBonusToast.streak} Daily Streak
                    </span>
                    <span className="font-body text-xs text-[#b5a589]">
                      {streakBonusToast.streakContinued
                        ? 'Consecutive login bonus awarded'
                        : 'Daily login bonus awarded'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1 font-mono-numbers text-xs font-bold text-[#edd18a]">
                  <Icon id="soul_coin" size={18} />
                  <span>+{streakBonusToast.coins}</span>
                </div>
              </NineSlice>
            </div>
          </div>
        )}

        {/* ACTIVE FULL-SCREEN PAGE */}
        {activeTab === 'home' && (
          <HomePage
            onStartGame={onStartGame}
            onOpenRelicsShop={() => switchTab('shop', 'relics')}
          />
        )}
        {activeTab === 'shop' && <ShopPage initialSubTab={shopSubTab} />}
        {activeTab === 'missions' && <MissionsPage onStartGame={onStartGame} />}
        {activeTab === 'bestiary' && <BestiaryPage />}
        {activeTab === 'achievements' && <AchievementsPage />}

        {/* PERSISTENT BOTTOM NAVIGATION BAR (NineSlice spiked plate + fixed-aspect circular tabs) */}
        <nav
          aria-label="Lobby Navigation"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-30 w-full max-w-[540px]"
          style={{
            height: 'calc(clamp(92px, 11.8vh, 108px) + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'max(4px, env(safe-area-inset-left))',
            paddingRight: 'max(4px, env(safe-area-inset-right))',
          }}
        >
          <NineSlice
            variant="navPlateSpiked"
            tileTexture="stone"
            padding="0px"
            borderWidth="clamp(7px, 1.3vw, 11px) clamp(10px, 2vw, 18px)"
            className="w-full h-full shadow-[0_-8px_22px_rgba(0,0,0,0.9)]"
            contentClassName="w-full h-full grid grid-cols-5 items-center gap-0.5 px-0.5"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isPressed = pressedTabId === tab.id;
              const badgeRingSrc =
                isActive || isPressed ? UI_SPRITES.roundCrimson : UI_SPRITES.roundSteel;

              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onPointerDown={() => setPressedTabId(tab.id)}
                  onPointerUp={() => setPressedTabId(null)}
                  onPointerLeave={() => setPressedTabId(null)}
                  onPointerCancel={() => setPressedTabId(null)}
                  onClick={() => {
                    setPressedTabId(null);
                    switchTab(tab.id);
                  }}
                  className={`relative flex flex-col items-center justify-center h-full w-full px-0.5 touch-manipulation transition-transform duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b] ${
                    isPressed
                      ? '-translate-y-1.5 scale-[1.05]'
                      : isActive
                        ? '-translate-y-0.5 scale-100'
                        : 'translate-y-0 scale-100'
                  }`}
                >
                  {/* Fixed-aspect 1:1 medallion badge housing the tab icon */}
                  <div
                    className={`relative flex items-center justify-center shrink-0 ${
                      tab.isHome ? '-mt-2' : ''
                    }`}
                    style={{
                      width: tab.isHome
                        ? 'clamp(54px, 7.2vh, 64px)'
                        : 'clamp(46px, 6.2vh, 56px)',
                      aspectRatio: '1 / 1',
                    }}
                  >
                    <img
                      src={badgeRingSrc}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      style={{ imageRendering: 'auto' }}
                      className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
                    />
                    <span
                      className={`relative z-10 flex items-center justify-center ${
                        tab.isHome ? 'w-[78%] h-[78%]' : 'w-[74%] h-[74%]'
                      }`}
                    >
                      <Icon
                        id={tab.iconId}
                        size="100%"
                        alt={tab.label}
                        className={isActive || isPressed ? 'opacity-100' : 'opacity-95'}
                      />
                    </span>

                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        aria-label={`${tab.badge} unclaimed`}
                        style={{ aspectRatio: '1 / 1' }}
                        className="absolute -top-1 -right-1 z-20 min-w-[20px] h-[20px] px-1 flex items-center justify-center"
                      >
                        <img
                          src={UI_SPRITES.knobCrimsonOrb}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ imageRendering: 'auto' }}
                          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                        />
                        <span className="relative z-10 font-mono-numbers text-[10.5px] font-black text-[#fff3d6]">
                          {tab.badge}
                        </span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`relative z-10 mt-1 font-display font-bold uppercase whitespace-nowrap leading-none transition-colors duration-150 ${
                      tab.label.length > 7
                        ? 'text-[clamp(10px,2.5vw,12px)] tracking-[0.02em]'
                        : 'text-[clamp(11px,2.7vw,12.5px)] tracking-[0.06em]'
                    } ${
                      isActive
                        ? 'text-[#fae8b8]'
                        : isPressed
                          ? 'text-[#f2c464]'
                          : 'text-[#c8cfd9]'
                    }`}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.98)' }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </NineSlice>
        </nav>
      </div>
    </div>
  );
};
