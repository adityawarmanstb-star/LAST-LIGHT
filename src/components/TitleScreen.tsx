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
} from 'lucide-react';
import { getSavedCoins, subscribeCoins } from '../game/metaProgression';
import { dailyMissions } from '../game/dailyMissions';
import { dailyStreak } from '../game/dailyStreak';
import { soundManager } from '../game/audio';
import { DailyStreakState } from '../game/types';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface TitleScreenProps {
  isMuted: boolean;
  isModalOpen?: boolean;
  onStartGame: () => void;
  onOpenShop: () => void;
  onOpenMissions: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
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
  onToggleMute,
  onOpenSettings,
}) => {
  const [bankCoins, setBankCoins] = useState<number>(() => getSavedCoins());
  const [unclaimedMissions, setUnclaimedMissions] = useState<number>(() =>
    dailyMissions.getUnclaimedCount()
  );
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

  return (
    <div
      className="relative w-full h-full min-h-screen flex flex-col justify-between items-center safe-area-pad select-none z-30 overflow-hidden bg-[#121316]"
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
            <span className="h-px w-14 bg-gradient-to-r from-transparent via-[#6b3a2a] to-[#b3121a]" />
            <span className="text-[11px] font-medium tracking-[0.26em] uppercase text-[#9c8e72]">
              Blood &amp; Iron
            </span>
            <span className="h-px w-14 bg-gradient-to-l from-transparent via-[#6b3a2a] to-[#b3121a]" />
          </div>
        </div>

        {/* Hero Preview (Dark Warden with lantern glow) */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-3">
            <div
              className="absolute inset-2 rounded-full blur-2xl opacity-35 pointer-events-none"
              style={{
                background: 'radial-gradient(circle, #5de4ff 0%, transparent 70%)',
              }}
              aria-hidden="true"
            />
            <img
              src="./assets/aistudio/player_d0a77e5b.png"
              alt="Dark Warden"
              referrerPolicy="no-referrer"
              className="relative w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.85)] transition-transform duration-200 hover:scale-105"
            />
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

        {/* Primary Menu Iron Buttons: Play / Shop / Settings */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
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
              onClick={onOpenShop}
              className="w-full min-h-[56px] px-4 text-sm font-semibold"
            >
              <ShoppingBag className="w-4 h-4 text-[#f2a93b]" />
              <span>Shop</span>
            </IronButton>
          </div>

          <IronButton
            seed="title-settings-btn"
            dripCount={2}
            onClick={onOpenSettings}
            className="w-full min-h-[56px] px-4 text-sm font-semibold"
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
