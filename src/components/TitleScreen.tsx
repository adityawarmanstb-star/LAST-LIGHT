import React, { useEffect, useRef, useState } from 'react';
import { Flame, Settings, Volume2, VolumeX } from 'lucide-react';
import { achievements } from '../game/achievements';
import { soundManager } from '../game/audio';
import { dailyMissions } from '../game/dailyMissions';
import { dailyStreak } from '../game/dailyStreak';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { getRelicSeals, subscribeRelics } from '../game/relics';
import { DailyStreakState } from '../game/types';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame } from './ForgedIronFrame';
import { ChromaKeyImg, IronCard } from './IronCard';
import { Coin3DIcon, Gem3DIcon } from './LobbyIcons';
import { AchievementsPage } from './lobby/AchievementsPage';
import { BestiaryPage } from './lobby/BestiaryPage';
import { HomePage } from './lobby/HomePage';
import { MissionsPage } from './lobby/MissionsPage';
import { ShopPage, ShopSubTab } from './lobby/ShopPage';

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

const EMBER_PARTICLES = Array.from({ length: 18 }, (_, i) => {
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
    left: `${(i * 5.2 + (seed % 5)) % 98}%`,
    size: 2 + (i % 3),
    duration: `${9 + (i % 5) * 1.4}s`,
    delay: `${-(i * 0.9)}s`,
    drift: `${(i % 2 === 0 ? 1 : -1) * (10 + (seed % 20))}px`,
    opacity: palettePick === 3 ? 0.35 : 0.62,
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

  const { processedSrc: navBarSrc } = useChromaKeyImage(UI_ASSETS.navBarBg);

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
    iconSrc: string;
    badge?: number;
    isHome?: boolean;
  }[] = [
    { id: 'shop', label: 'SHOP', iconSrc: UI_ASSETS.iconShop },
    {
      id: 'missions',
      label: 'MISSIONS',
      iconSrc: UI_ASSETS.iconMissions,
      badge: unclaimedMissions > 0 ? unclaimedMissions : undefined,
    },
    { id: 'home', label: 'HOME', iconSrc: UI_ASSETS.iconHome, isHome: true },
    { id: 'bestiary', label: 'BESTIARY', iconSrc: UI_ASSETS.iconBestiary },
    {
      id: 'achievements',
      label: 'ACHIEVEMENTS',
      iconSrc: UI_ASSETS.iconAchievements,
      badge: unclaimedAchievements > 0 ? unclaimedAchievements : undefined,
    },
  ];

  return (
    <div className="relative w-full h-[100dvh] flex flex-col justify-between items-center overflow-hidden select-none z-30 bg-[#07080a]">
      {/* Full-Screen Atmospheric Dungeon Backdrop (bg_dungeon.png across ALL 5 menu pages) */}
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
            className="w-full h-full object-cover object-center opacity-90 contrast-105 brightness-95"
          />
        )}

        {/* Balanced atmospheric gradient so background stone arches remain readable behind cards */}
        <div
          className="absolute inset-0"
          style={{
            background:
              activeTab === 'home'
                ? 'linear-gradient(180deg, rgba(5,6,8,0.74) 0%, rgba(10,11,14,0.22) 32%, rgba(12,8,9,0.28) 65%, rgba(5,5,7,0.92) 100%)'
                : 'linear-gradient(180deg, rgba(5,6,8,0.84) 0%, rgba(10,11,14,0.58) 45%, rgba(5,5,7,0.94) 100%)',
          }}
        />

        {/* Soft Drifting Dungeon Mist & Embers */}
        <div
          className="absolute -inset-x-10 bottom-16 h-56 blur-2xl dungeon-mist-drift"
          style={{
            background:
              'radial-gradient(ellipse at 50% 60%, rgba(64, 118, 136, 0.16) 0%, rgba(34, 14, 16, 0.22) 48%, transparent 76%)',
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
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                '--ember-duration': p.duration,
                '--ember-delay': p.delay,
                '--ember-drift': p.drift,
                '--ember-opacity': p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
        {/* Radial Dark Vignette Framing Screen Edges */}
        <div
          className="absolute inset-0"
          style={{
            boxShadow: 'inset 0 0 90px rgba(0, 0, 0, 0.85)',
          }}
        />
      </div>

      {/* Portrait Mobile-First Multi-Page Stage */}
      <div className="relative z-10 w-full max-w-[460px] h-full flex flex-col justify-between items-center mx-auto pb-[100px] sm:pb-[104px]">
        {/* PERSISTENT TOP HEADER across all 5 menu pages */}
        <header
          className="w-full shrink-0 px-2.5 sm:px-3 pt-[max(10px,env(safe-area-inset-top))] pb-1.5 flex items-center justify-between gap-1.5"
          aria-label="Persistent Status Header"
        >
          {/* Top-Left Status Badges using panel_iron_card.png */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <IronCard
              asButton
              onClick={() => switchTab('shop', 'market')}
              ariaLabel={`Coins ${bankCoins} and Gems ${relicSeals}. Open Shop`}
              contentClassName="px-2.5 py-1.5 min-h-[44px] flex items-center gap-2"
            >
              <div className="flex items-center gap-1">
                <Coin3DIcon className="w-4 h-4 shrink-0" />
                <span className="font-mono-numbers text-xs font-bold text-[#edd18a] whitespace-nowrap">
                  {bankCoins}
                </span>
              </div>
              <span className="w-px h-4 bg-[#5e382c]" aria-hidden="true" />
              <div className="flex items-center gap-1">
                <Gem3DIcon className="w-4 h-4 shrink-0" />
                <span className="font-mono-numbers text-xs font-bold text-[#f0cad9] whitespace-nowrap">
                  {relicSeals}
                </span>
              </div>
            </IronCard>

            <IronCard
              asButton
              onClick={() => switchTab('missions')}
              highlight="ember"
              ariaLabel={`Day ${Math.max(1, streak.currentStreak)} streak. Open Missions`}
              contentClassName="px-2.5 py-1.5 min-h-[44px] flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5 text-[#f2a93b] shrink-0" />
              <span className="font-mono-numbers text-xs font-bold text-[#f2dfba] whitespace-nowrap">
                Day {Math.max(1, streak.currentStreak)}
              </span>
            </IronCard>
          </div>

          {/* Top-Right Settings Gear & Audio Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            <IronCard
              asButton
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onOpenSettings();
              }}
              ariaLabel="Open Settings"
              contentClassName="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-0"
            >
              <Settings className="w-[18px] h-[18px] text-[#e8dcc2]" />
            </IronCard>

            <IronCard
              asButton
              onClick={() => {
                haptics.tap('light');
                onToggleMute();
              }}
              highlight={isMuted ? 'blood' : 'none'}
              ariaLabel={isMuted ? 'Unmute Sound' : 'Mute Sound'}
              contentClassName="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center p-0"
            >
              {isMuted ? (
                <VolumeX className="w-[18px] h-[18px] text-[#e5303a]" />
              ) : (
                <Volume2 className="w-[18px] h-[18px] text-[#e8dcc2]" />
              )}
            </IronCard>
          </div>
        </header>

        {/* Daily Login Streak Reward Toast */}
        {streakBonusToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm pointer-events-none"
            style={{
              top: 'calc(max(12px, env(safe-area-inset-top)) + 58px)',
            }}
          >
            <div className="mission-banner-enter">
              <ForgedIronFrame
                seed={`daily-streak-toast-${streakBonusToast.streak}`}
                dripCount={3}
                maxDripLength={12}
                borderColor="#b3121a"
                glowColor="#7a0b12"
                glowStrength={8}
                contentClassName="px-3.5 py-2 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="w-4 h-4 text-[#d94826] shrink-0" />
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
                  <Coin3DIcon className="w-4 h-4" />
                  <span>+{streakBonusToast.coins}</span>
                </div>
              </ForgedIronFrame>
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

        {/* PERSISTENT BOTTOM NAVIGATION BAR docked flush to bottom:0, left:0, right:0 */}
        <nav
          aria-label="Lobby Navigation"
          className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-[460px] h-[98px] sm:h-[104px]"
        >
          {!navBarSrc && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[84px] bg-gradient-to-b from-[#23262d] via-[#14161b] to-[#090a0d] border-t-2 border-[#4d3a31]"
            />
          )}
          {navBarSrc && (
            <img
              src={navBarSrc}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none drop-shadow-[0_-10px_24px_rgba(0,0,0,0.95)]"
            />
          )}

          <div className="relative z-10 w-full h-full grid grid-cols-5 items-end px-1.5 pb-1.5 gap-0.5">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => switchTab(tab.id)}
                  className="relative flex flex-col items-center justify-end h-full pb-0.5 px-0 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
                >
                  <div
                    className={`relative flex items-center justify-center transition-transform duration-150 ${
                      isActive ? '-translate-y-2' : ''
                    }`}
                  >
                    <ChromaKeyImg
                      src={tab.iconSrc}
                      alt={tab.label}
                      style={
                        isActive
                          ? {
                              filter: tab.isHome
                                ? 'drop-shadow(0 0 12px rgba(93, 228, 255, 0.72)) drop-shadow(0 0 8px rgba(242, 169, 59, 0.75))'
                                : 'drop-shadow(0 0 12px rgba(242, 169, 59, 0.85)) drop-shadow(0 0 6px rgba(93, 228, 255, 0.45))',
                            }
                          : {
                              filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.92))',
                            }
                      }
                      className={`${
                        isActive
                          ? 'w-[54px] h-[54px]'
                          : 'w-[44px] h-[44px] opacity-85 hover:opacity-100'
                      } object-contain transition-all duration-150`}
                    />

                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        aria-label={`${tab.badge} unclaimed`}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#b3121a] border border-[#f2a93b] font-mono-numbers text-[10px] font-bold text-[#fae8b8] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.95)]"
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`mt-0.5 font-display font-bold text-[10px] uppercase tracking-[-0.02em] whitespace-nowrap leading-none ${
                      isActive
                        ? 'text-[#f2c464] drop-shadow-[0_1px_4px_rgba(0,0,0,1)]'
                        : 'text-[#a6adb8]'
                    }`}
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.98)' }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
