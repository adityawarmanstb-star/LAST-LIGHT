import React, { useEffect, useState } from 'react';
import { soundManager } from '../game/audio';
import { dailyMissions } from '../game/dailyMissions';
import { STAGES, formatStageTime } from '../game/stages';
import { RunStats } from '../game/types';
import { haptics } from '../mobile/haptics';
import { Icon } from './Icon';
import { NineSlice } from './ui/NineSlice';
import { UiButton } from './ui/UiButton';
import { UiChainDivider } from './ui/UiControls';

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

  useEffect(() => {
    const unsub = dailyMissions.subscribe(() => {
      setUnclaimedMissions(dailyMissions.getUnclaimedCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (stats.victory && stats.coinsEarned > 0) {
      soundManager.playCoinGain('jackpot');
    }
  }, [stats.victory, stats.coinsEarned]);

  const timeFormatted = formatStageTime(stats.timeSurvived);
  const stageConfig = stats.stageId ? STAGES[stats.stageId] : STAGES.stage_1;
  const stageNumber = stats.stageCleared ?? stageConfig.stageNumber;
  const stageName = stats.stageName ?? stageConfig.name;
  const stageBestTime = stats.stageBestTime ?? stats.timeSurvived;
  const bestTimeFormatted = formatStageTime(stageBestTime);
  const difficultyBestClearFormatted =
    stats.difficultyBestClearTime !== undefined
      ? formatStageTime(stats.difficultyBestClearTime)
      : timeFormatted;
  const difficultyLabel =
    stats.difficulty === 'baby'
      ? 'BABY MODE'
      : stats.difficulty === 'pro'
        ? 'PRO MODE'
        : stats.difficulty === 'hacker'
          ? 'HACKER MODE'
          : '';
  const stageRewardGold =
    stats.stageRewardGold ??
    (stats.victory
      ? stats.difficulty === 'baby'
        ? 1000
        : stats.difficulty === 'pro'
          ? 3000
          : 10000
      : 0);
  const runCoinsCollected =
    stats.runCoinsCollected ?? Math.max(0, stats.coinsEarned - stageRewardGold);

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
      className="fixed inset-0 flex flex-col items-center justify-center safe-area-pad z-50 select-none overflow-x-hidden"
      style={{
        background: 'rgba(4, 5, 8, 0.90)',
        boxShadow: stats.victory
          ? 'inset 0 0 120px rgba(212, 148, 36, 0.25)'
          : 'inset 0 0 120px rgba(120, 10, 16, 0.34)',
      }}
    >
      <div className="w-full max-w-[540px] max-h-[92dvh] flex flex-col px-1">
        <NineSlice
          variant="panelIronDark"
          tileTexture="stone"
          highlight={stats.victory ? 'gold' : 'blood'}
          className="w-full max-h-[92dvh] flex flex-col shadow-[0_18px_44px_rgba(0,0,0,0.95)]"
          contentClassName="p-3.5 sm:p-4 flex flex-col items-center text-center max-h-[92dvh] overflow-y-auto overflow-x-hidden no-scrollbar"
        >
          {/* Stage Completion Notification Banner */}
          {stats.victory && (
            <NineSlice
              variant="bannerCrimson"
              tileTexture="row"
              highlight="gold"
              padding="0px"
              borderWidth="clamp(10px, 1.8vw, 14px) clamp(18px, 3.4vw, 28px)"
              className="w-full mb-3"
              contentClassName="px-2 py-1.5 flex items-center justify-between gap-2"
            >
              <div role="status" aria-live="polite" className="flex items-center gap-2 min-w-0 text-left">
                <Icon id="ui_crown" size={20} className="shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-display text-[11px] font-black tracking-[0.14em] text-[#f2c464] uppercase leading-tight">
                    STAGE {stageNumber} COMPLETE!
                  </span>
                  <span className="font-body text-[11px] text-[#e6d5b2] truncate">
                    {stageName} · Boss defeated
                  </span>
                </div>
              </div>
              {difficultyLabel && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0d261b] border border-[#6ee7b7]/60 font-display text-[9px] font-bold tracking-[0.12em] text-[#86efac] uppercase">
                  <span aria-hidden="true">✓</span>
                  <span>{difficultyLabel} CLEARED</span>
                </span>
              )}
            </NineSlice>
          )}

          {/* Header Typography */}
          <div className="w-full flex flex-col items-center mb-3">
            <span
              className={`font-display text-[11px] font-bold uppercase tracking-[0.22em] mb-1 ${
                stats.victory ? 'text-[#f2a93b]' : 'text-[#e5303a]'
              }`}
              style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.95)' }}
            >
              {stats.victory
                ? `VICTORY · STAGE ${stageNumber} · ${stageName}`
                : `STAGE ${stageNumber} · ${stageName}`}
            </span>

            <h2
              id="gameover-modal-title"
              className={`font-display font-black text-[clamp(22px,5vw,28px)] tracking-[0.08em] leading-tight uppercase ${
                stats.victory ? 'text-[#ffd978]' : 'text-[#efe2c2]'
              }`}
              style={{ textShadow: '0 2px 3px #140806' }}
            >
              {stats.victory ? `STAGE ${stageNumber} COMPLETE` : 'THE LIGHT FADES'}
            </h2>

            <UiChainDivider className="my-2" />

            <p className="font-body text-sm font-medium text-[#cbbba0] leading-snug">
              {stats.victory
                ? `You vanquished the Void Titan and reclaimed ${stageName}.`
                : `Reached Lv. ${stats.levelReached} in ${stageName} before the shadows closed in.`}
              {(stats.challengesCompleted ?? 0) > 0 && (
                <span className="block mt-1 text-[#f2a93b] font-semibold">
                  {stats.challengesCompleted} Dynamic{' '}
                  {stats.challengesCompleted === 1 ? 'Pact' : 'Pacts'} Cleared
                </span>
              )}
            </p>
          </div>

          {/* Dedicated Stage Clear Gold Reward Callout */}
          {stats.victory && stageRewardGold > 0 && (
            <NineSlice
              variant="plateWideIron"
              tileTexture="row"
              highlight="gold"
              padding="0px"
              borderWidth="clamp(8px, 1.4vw, 12px) clamp(12px, 2vw, 18px)"
              className="w-full mb-3"
              contentClassName="px-2.5 py-2 flex items-center justify-between gap-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0 text-left">
                <Icon id="soul_coin" size={24} className="shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-display text-[11px] font-bold tracking-[0.12em] text-[#f2c464] uppercase">
                    Stage {stageNumber} Clear Reward
                  </span>
                  <span className="font-body text-[11px] text-[#cbbba0]">
                    {difficultyLabel || 'Difficulty Bonus'}
                    {runCoinsCollected > 0
                      ? ` (+${runCoinsCollected.toLocaleString()} from arena)`
                      : ''}
                  </span>
                </div>
              </div>
              <span
                className="font-display font-black text-base sm:text-lg text-[#ffd978] tabular-nums shrink-0"
                style={{ textShadow: '0 2px 3px rgba(0, 0, 0, 0.95)' }}
              >
                +{stageRewardGold.toLocaleString()} GOLD
              </span>
            </NineSlice>
          )}

          {/* 3 Side-by-Side Stat Cards */}
          <div className="grid grid-cols-3 gap-2 w-full mb-4">
            <NineSlice
              variant="miniPlate"
              tileTexture="row"
              padding="0px"
              className="w-full"
              contentClassName="px-1.5 py-2.5 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-[clamp(17px,4vw,22px)] leading-none text-[#f4e7c8] tabular-nums"
                style={{ textShadow: '0 2px 3px rgba(0, 0, 0, 0.95)' }}
              >
                {timeFormatted}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                TIME
              </div>
              <div
                className={`font-mono-numbers text-[10px] font-bold tracking-wider mt-0.5 ${
                  stats.victory
                    ? stats.isNewDifficultyBestClearTime
                      ? 'text-[#ffd978]'
                      : 'text-[#86efac]'
                    : stats.isNewStageBestTime
                      ? 'text-[#ffd978]'
                      : 'text-[#8e826b]'
                }`}
              >
                {stats.victory
                  ? stats.isNewDifficultyBestClearTime
                    ? 'NEW CLEAR BEST!'
                    : `BEST CLEAR ${difficultyBestClearFormatted}`
                  : stats.isNewStageBestTime
                    ? 'NEW BEST!'
                    : `BEST ${bestTimeFormatted}`}
              </div>
            </NineSlice>

            <NineSlice
              variant="miniPlate"
              tileTexture="row"
              padding="0px"
              className="w-full"
              contentClassName="px-1.5 py-2.5 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-[clamp(17px,4vw,22px)] leading-none text-[#f4e7c8] tabular-nums"
                style={{ textShadow: '0 2px 3px rgba(0, 0, 0, 0.95)' }}
              >
                {stats.enemiesKilled}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                KILLS
              </div>
            </NineSlice>

            <NineSlice
              variant="miniPlate"
              tileTexture="row"
              padding="0px"
              className="w-full"
              contentClassName="px-1.5 py-2.5 flex flex-col items-center justify-center gap-0.5"
            >
              <div
                className="font-display font-bold text-[clamp(17px,4vw,22px)] leading-none text-[#f2c464] tabular-nums"
                style={{ textShadow: '0 2px 3px rgba(0, 0, 0, 0.95)' }}
              >
                +{stats.coinsEarned.toLocaleString()}
              </div>
              <div className="font-display text-[10px] font-bold uppercase tracking-[0.14em] text-[#a89a7e] mt-1">
                GOLD
              </div>
            </NineSlice>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            <UiButton
              tone="blood"
              size="lg"
              haptic="medium"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('heavy');
                onRestart();
              }}
              className="w-full"
            >
              <Icon id="ui_restart" size={18} />
              <span>ONE MORE RUN</span>
            </UiButton>

            <div className="grid grid-cols-2 gap-2 w-full">
              <UiButton
                tone="iron"
                size="md"
                active={unclaimedMissions > 0}
                onClick={() => {
                  soundManager.playUiClick();
                  onOpenMissions();
                }}
                className="w-full"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon id="nav_missions" size={20} />
                  {unclaimedMissions > 0 && (
                    <span
                      aria-label={`${unclaimedMissions} unclaimed`}
                      className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#b3121a] border border-[#f2a93b] font-display text-[9px] font-bold text-[#fae8b8] flex items-center justify-center"
                    >
                      {unclaimedMissions}
                    </span>
                  )}
                </div>
                <span>MISSIONS</span>
              </UiButton>

              <UiButton
                tone="iron"
                size="md"
                onClick={() => {
                  soundManager.playUiClick();
                  onOpenShop('upgrades');
                }}
                className="w-full"
              >
                <Icon id="nav_shop" size={20} />
                <span>SHOP</span>
              </UiButton>
            </div>

            <UiButton
              tone="iron"
              size="md"
              onClick={() => {
                soundManager.playUiClick();
                onQuitToTitle();
              }}
              className="w-full"
            >
              <Icon id="nav_home" size={20} />
              <span>MAIN MENU</span>
            </UiButton>
          </div>
        </NineSlice>
      </div>
    </div>
  );
};
