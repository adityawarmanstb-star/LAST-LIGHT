import React, { useEffect, useRef, useState } from 'react';
import { achievements } from '../game/achievements';
import { soundManager } from '../game/audio';
import { dailyMissions } from '../game/dailyMissions';
import { dailyStreak } from '../game/dailyStreak';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { getRelicSeals, subscribeRelics } from '../game/relics';
import { DailyStreakState } from '../game/types';
import { UI_ASSETS, preloadAllChromaKeyUiAssets } from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
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

export const TitleScreen: React.FC<TitleScreenProps> = ({
  isMuted,
  initialTab = 'home',
  initialShopSubTab = 'market',
  onTabChange,
  onStartGame,
  onToggleMute,
  onOpenSettings,
}) => {
  const [activeTab, setActiveTab] = useState<LobbyTabId>(initialTab);
  const [pressedTabId, setPressedTabId] = useState<LobbyTabId | null>(null);
  const [shopSubTab, setShopSubTab] = useState<ShopSubTab>(initialShopSubTab);
  const [bgLoadError, setBgLoadError] = useState(false);
  const [bankCoins, setBankCoins] = useState<number>(() => getSavedCoins());
  const [relicSeals, setRelicSeals] = useState<number>(() => getRelicSeals());
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
      unsubRelics();
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
      {/* Menu Backdrop: cover-fit dungeon backdrop with dark vignette & zero CSS filters */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 44%, #151b22 0%, #101116 44%, #060709 88%)',
          }}
        />
        {!bgLoadError && (
          <img
            src={UI_ASSETS.bgDungeon}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBgLoadError(true)}
            style={{ imageRendering: 'auto' }}
            className="w-full h-full object-cover object-center opacity-90"
          />
        )}

        {/* Dark atmospheric gradient & vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              activeTab === 'home'
                ? 'linear-gradient(180deg, rgba(5,6,8,0.78) 0%, rgba(10,11,14,0.24) 32%, rgba(12,8,9,0.3) 65%, rgba(5,5,7,0.94) 100%)'
                : 'linear-gradient(180deg, rgba(5,6,8,0.88) 0%, rgba(10,11,14,0.68) 45%, rgba(5,5,7,0.96) 100%)',
          }}
        />

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
          paddingBottom: 'calc(clamp(82px, 11vh, 96px) + env(safe-area-inset-bottom, 0px))',
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
              aria-label={`Coins ${bankCoins} and Gems ${relicSeals}. Open Shop`}
              className="cursor-pointer active:scale-95 transition-transform focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              <NineSlice
                variant="miniPlate"
                tileTexture="row"
                padding="0px"
                className="min-h-[44px] flex items-center"
                contentClassName="px-2 py-1 flex items-center gap-1.5 sm:gap-2"
              >
                <div className="flex items-center gap-1">
                  <Icon id="soul_coin" size={16} />
                  <span className="font-mono-numbers text-[clamp(11px,2vw,13px)] font-bold text-[#edd18a] whitespace-nowrap">
                    {bankCoins}
                  </span>
                </div>
                <span className="w-px h-3.5 bg-[#5e382c]" aria-hidden="true" />
                <div className="flex items-center gap-1">
                  <Icon id="crimson_gem" size={16} />
                  <span className="font-mono-numbers text-[clamp(11px,2vw,13px)] font-bold text-[#f0cad9] whitespace-nowrap">
                    {relicSeals}
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
            height: 'calc(clamp(78px, 10.5vh, 92px) + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: 'max(4px, env(safe-area-inset-left))',
            paddingRight: 'max(4px, env(safe-area-inset-right))',
          }}
        >
          <NineSlice
            variant="navPlateSpiked"
            tileTexture="stone"
            padding="0px"
            borderWidth="clamp(10px, 1.8vw, 15px) clamp(14px, 2.8vw, 24px)"
            className="w-full h-full shadow-[0_-8px_22px_rgba(0,0,0,0.9)]"
            contentClassName="w-full h-full grid grid-cols-5 items-center gap-1 px-1"
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
                    className="relative flex items-center justify-center shrink-0"
                    style={{
                      width: tab.isHome ? 'clamp(36px, 5.2vh, 44px)' : 'clamp(30px, 4.4vh, 38px)',
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
                    <span className="relative z-10 flex items-center justify-center w-[62%] h-[62%]">
                      <Icon
                        id={tab.iconId}
                        size={tab.isHome ? 24 : 20}
                        alt={tab.label}
                        className={isActive || isPressed ? 'opacity-100' : 'opacity-85'}
                      />
                    </span>

                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        aria-label={`${tab.badge} unclaimed`}
                        style={{ aspectRatio: '1 / 1' }}
                        className="absolute -top-1 -right-1.5 z-20 min-w-[18px] h-[18px] px-1 flex items-center justify-center"
                      >
                        <img
                          src={UI_SPRITES.knobCrimsonOrb}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ imageRendering: 'auto' }}
                          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                        />
                        <span className="relative z-10 font-mono-numbers text-[9.5px] font-black text-[#fff3d6]">
                          {tab.badge}
                        </span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`relative z-10 mt-0.5 font-display font-bold uppercase whitespace-nowrap leading-none transition-colors duration-150 ${
                      tab.label.length > 7
                        ? 'text-[clamp(8px,1.8vw,9.5px)] tracking-tight'
                        : 'text-[clamp(9px,2vw,10.5px)] tracking-wider'
                    } ${
                      isActive
                        ? 'text-[#fae8b8]'
                        : isPressed
                          ? 'text-[#f2c464]'
                          : 'text-[#a6adb8]'
                    }`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.98)' }}
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
