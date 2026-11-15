import React, { useEffect, useState } from 'react';
import { soundManager } from '../game/audio';
import { dailyMissions } from '../game/dailyMissions';
import { RunStats } from '../game/types';
import {
  UI_ASSETS,
  preloadAllChromaKeyUiAssets,
  useChromaKeyImage,
} from '../hooks/useChromaKeyImage';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { IronCard } from './IronCard';

interface GameOverModalProps {
  stats: RunStats;
  isModalOpen?: boolean;
  onRestart: () => void;
  onQuitToTitle: () => void;
  onOpenShop: (initialTab?: 'upgrades' | 'relics') => void;
  onOpenMissions: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isModalOpen = false,
  onRestart,
  onQuitToTitle,
  onOpenShop,
  onOpenMissions,
}) => {
  const [unclaimedMissions, setUnclaimedMissions] = useState<number>(() =>
    dailyMissions.getUnclaimedCount()
  );
  const { processedSrc: playBtnSrc, hasError: playBtnError } = useChromaKeyImage(UI_ASSETS.btnPlay);

  useEffect(() => {
    preloadAllChromaKeyUiAssets();
    const unsub = dailyMissions.subscribe(() => {
      setUnclaimedMissions(dailyMissions.getUnclaimedCount());
    });
    return unsub;
  }, []);

  const minutes = Math.floor(stats.timeSurvived / 60);
  const seconds = stats.timeSurvived % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart, isModalOpen]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-modal-title"
      className="fixed inset-0 flex flex-col items-center justify-center safe-area-pad z-50 select-none"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(5, 8, 12, 0.85)',
        boxShadow: 'inset 0 0 120px rgba(120, 10, 16, 0.35)',
      }}
    >
      <div className="w-[92%] max-w-[400px] max-h-[92vh] flex flex-col">
        <IronCard
          highlight={stats.victory ? 'gold' : 'blood'}
          className="w-full max-h-[92vh] flex flex-col"
          contentClassName="p-5 sm:p-6 flex flex-col items-center text-center max-h-[92vh] overflow-y-auto"
        >
          {/* Header Typography */}
          <div className="w-full flex flex-col items-center mb-4">
            <span
              className={`font-display text-[11px] font-bold uppercase tracking-[0.26em] mb-1 ${
                stats.victory ? 'text-[#f2a93b]' : 'text-[#e5303a]'
              }`}
              style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)' }}
            >
              {stats.victory ? 'VICTORY' : 'FALLEN IN THE DARK'}
            </span>

            <h2
              id="gameover-modal-title"
              className="font-display font-black text-[26px] sm:text-[28px] tracking-[0.08em] leading-tight uppercase"
              style={{
                backgroundImage: stats.victory
                  ? 'linear-gradient(180deg, #fff3cc 0%, #f2b749 52%, #a86416 100%)'
                  : 'linear-gradient(180deg, #f9f2df 0%, #dfc48e 52%, #9a7438 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter:
                  'drop-shadow(0 2px 0 #140806) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.92))',
              }}
            >
              {stats.victory ? 'THE DAWN AWAKENS' : 'THE LIGHT FADES'}
            </h2>

            {/* Glowing Crimson Divider Line */}
            <div
              aria-hidden="true"
              className="w-4/5 h-[2px] my-2.5 rounded-full"
              style={{
                background: stats.victory
                  ? 'linear-gradient(90deg, transparent 0%, #b87318 20%, #f2c464 50%, #b87318 80%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, #7d0d13 18%, #e5303a 50%, #7d0d13 82%, transparent 100%)',
                boxShadow: stats.victory
                  ? '0 0 12px rgba(242, 169, 59, 0.7)'
                  : '0 0 12px rgba(229, 48, 58, 0.78)',
              }}
            />

            <p className="font-body text-sm font-medium text-[#cbbba0] leading-snug">
              {stats.victory
                ? 'You vanquished the Void Titan and reclaimed the dark.'
                : `Reached Lv. ${stats.levelReached} before the shadows closed in.`}
              {(stats.challengesCompleted ?? 0) > 0 && (
                <span className="block mt-1 text-[#f2a93b] font-semibold">
                  {stats.challengesCompleted} Dynamic{' '}
                  {stats.challengesCompleted === 1 ? 'Pact' : 'Pacts'} Cleared
                </span>
              )}
            </p>
          </div>

          {/* 3 Side-by-Side Stat Cards using panel_iron_card.png */}
          <div className="grid grid-cols-3 gap-2.5 w-full mb-5">
            <IronCard
              className="w-full"
              contentClassName="px-2 py-3 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-xl sm:text-2xl leading-none text-[#f4e7c8] tabular-nums"
                style={{
                  textShadow:
                    '0 0 12px rgba(242, 214, 152, 0.35), 0 2px 3px rgba(0, 0, 0, 0.95)',
                }}
              >
                {timeFormatted}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                TIME
              </div>
            </IronCard>

            <IronCard
              className="w-full"
              contentClassName="px-2 py-3 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-xl sm:text-2xl leading-none text-[#f4e7c8] tabular-nums"
                style={{
                  textShadow:
                    '0 0 12px rgba(229, 48, 58, 0.35), 0 2px 3px rgba(0, 0, 0, 0.95)',
                }}
              >
                {stats.enemiesKilled}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                KILLS
              </div>
            </IronCard>

            <IronCard
              className="w-full"
              contentClassName="px-2 py-3 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-xl sm:text-2xl leading-none text-[#f2c464] tabular-nums"
                style={{
                  textShadow:
                    '0 0 14px rgba(242, 196, 100, 0.45), 0 2px 3px rgba(0, 0, 0, 0.95)',
                }}
              >
                +{stats.coinsEarned}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                COINS
              </div>
            </IronCard>
          </div>

          {/* Tactile Mobile Action Buttons */}
          <div className="flex flex-col gap-2.5 w-full">
            {/* Primary Button: ONE MORE RUN using btn_play.png */}
            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('heavy');
                onRestart();
              }}
              className="group relative w-full h-[68px] flex items-center justify-center gap-2.5 transition-transform duration-150 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#f2a93b]"
            >
              {playBtnSrc ? (
                <img
                  src={playBtnSrc}
                  alt=""
                  aria-hidden="true"
                  referrerPolicy="no-referrer"
                  style={{
                    filter: 'drop-shadow(0 0 16px rgba(220, 38, 38, 0.55))',
                  }}
                  className="pointer-events-none absolute inset-0 w-full h-full object-fill select-none"
                />
              ) : playBtnError ? (
                <div
                  aria-hidden="true"
                  style={{
                    filter: 'drop-shadow(0 0 16px rgba(220, 38, 38, 0.55))',
                  }}
                  className="pointer-events-none absolute inset-0 rounded-[10px] rusted-play-bar border border-[#942027]"
                />
              ) : null}

              <span className="relative z-10 flex items-center justify-center transition-transform duration-150 group-hover:-rotate-45">
                <Icon id="ui_restart" size={20} />
              </span>
              <span
                className="relative z-10 font-display font-black text-[18px] tracking-[0.14em] uppercase whitespace-nowrap"
                style={{
                  backgroundImage:
                    'linear-gradient(180deg, #fff1c7 0%, #eab24e 52%, #a26318 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter:
                    'drop-shadow(0 0 10px rgba(242, 169, 59, 0.6)) drop-shadow(0 2px 0 #1b0705)',
                }}
              >
                ONE MORE RUN
              </span>
            </button>

            {/* Secondary 2-Column Quick-Access Row: MISSIONS & SHOP */}
            <div className="grid grid-cols-2 gap-2.5 w-full">
              <IronCard
                asButton
                highlight={unclaimedMissions > 0 ? 'gold' : 'none'}
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  onOpenMissions();
                }}
                className="w-full h-[56px] active:scale-95"
                contentClassName="h-full px-3 flex items-center justify-center gap-2"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon id="nav_missions" size={24} />
                  {unclaimedMissions > 0 && (
                    <span
                      aria-label={`${unclaimedMissions} unclaimed`}
                      className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#b3121a] border border-[#f2a93b] font-display text-[9px] font-bold text-[#fae8b8] flex items-center justify-center"
                    >
                      {unclaimedMissions}
                    </span>
                  )}
                </div>
                <span className="font-display font-bold text-[13px] tracking-[0.1em] text-[#ede0c4] whitespace-nowrap">
                  MISSIONS
                </span>
              </IronCard>

              <IronCard
                asButton
                onClick={() => {
                  soundManager.playUiClick();
                  haptics.tap('light');
                  onOpenShop('upgrades');
                }}
                className="w-full h-[56px] active:scale-95"
                contentClassName="h-full px-3 flex items-center justify-center gap-2"
              >
                <Icon id="nav_shop" size={24} />
                <span className="font-display font-bold text-[13px] tracking-[0.1em] text-[#ede0c4] whitespace-nowrap">
                  SHOP
                </span>
              </IronCard>
            </div>

            {/* Bottom Button: MAIN MENU */}
            <IronCard
              asButton
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                onQuitToTitle();
              }}
              className="w-full h-[56px] active:scale-95"
              contentClassName="h-full px-4 flex items-center justify-center gap-2.5"
            >
              <Icon id="nav_home" size={24} />
              <span className="font-display font-bold text-[15px] tracking-[0.14em] text-[#ede0c4] whitespace-nowrap">
                MAIN MENU
              </span>
            </IronCard>
          </div>
        </IronCard>
      </div>
    </div>
  );
};
