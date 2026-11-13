import React, { useEffect } from 'react';
import { RotateCcw, Coins, Skull, Clock, ShoppingBag } from 'lucide-react';
import { RunStats } from '../game/types';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface GameOverModalProps {
  stats: RunStats;
  onRestart: () => void;
  onOpenShop: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart, onOpenShop }) => {
  const minutes = Math.floor(stats.timeSurvived / 60);
  const seconds = stats.timeSurvived % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Allow Enter or Space for instant restart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        onRestart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestart]);

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
      style={{
        background:
          'radial-gradient(circle at center, rgba(18, 12, 14, 0.72) 0%, rgba(58, 10, 14, 0.88) 66%, rgba(24, 3, 6, 0.97) 100%)',
        boxShadow: 'inset 0 0 140px rgba(179, 18, 26, 0.45)',
      }}
    >
      <ForgedIronFrame
        seed={stats.victory ? 'victory-summary-panel' : 'gameover-summary-panel'}
        dripCount={4}
        maxDripLength={24}
        borderColor={stats.victory ? '#f2a93b' : '#b3121a'}
        glowColor={stats.victory ? '#f2a93b' : '#e5303a'}
        glowStrength={12}
        className="max-w-md w-full"
        contentClassName="p-6 sm:p-8 flex flex-col items-center text-center"
      >
        {/* Status & Title */}
        <div className="mb-6 w-full flex flex-col items-center">
          <div
            className={`text-xs font-semibold uppercase tracking-[0.24em] mb-2 ${
              stats.victory ? 'text-[#f2a93b]' : 'text-[#e5303a]'
            }`}
          >
            {stats.victory ? 'Victory' : 'Fallen in the Dark'}
          </div>
          <h2 className="text-3xl font-display font-bold text-[#d8c9a8] tracking-wide">
            {stats.victory ? 'THE DAWN AWAKENS' : 'THE LIGHT FADES'}
          </h2>

          {/* Blood-drip underline under title */}
          <svg
            aria-hidden="true"
            viewBox="0 0 260 22"
            className="w-60 h-5 mt-1.5 overflow-visible"
          >
            <defs>
              <linearGradient id="bloodUnderlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3a0a0e" stopOpacity="0.1" />
                <stop offset="18%" stopColor="#b3121a" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#e5303a" stopOpacity="1" />
                <stop offset="82%" stopColor="#b3121a" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#3a0a0e" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M8,3 L252,3 L244,5.5 L16,5.5 Z"
              fill="url(#bloodUnderlineGrad)"
            />
            <path d="M52,5 Q55,14 53,18 Q51,20 49,18 Q48,13 50,5 Z" fill="#b3121a" />
            <path d="M104,5 Q107,11 105,14 Q103.5,16 102,14 Q101,10 102.5,5 Z" fill="#980f16" />
            <path d="M138,5 Q141.5,16 139,21 Q136.5,23 134.5,20.5 Q133.5,15 135.5,5 Z" fill="#e5303a" />
            <path d="M196,5 Q199,12 197,16 Q195.5,17.5 194,15.5 Q193,11 194.5,5 Z" fill="#b3121a" />
          </svg>

          <p className="text-xs text-[#9c8e72] mt-2">
            {stats.victory
              ? 'You vanquished the Void Titan and reclaimed the dark.'
              : `Reached Lv. ${stats.levelReached} before the shadows closed in.`}
          </p>
        </div>

        {/* Summary Panel: Time, Kills, Coins */}
        <div className="grid grid-cols-3 gap-2.5 w-full mb-6">
          <ForgedIronFrame
            seed="gameover-stat-time"
            dripCount={0}
            showDrips={false}
            stainCount={0}
            contentClassName="p-3.5 flex flex-col items-center"
          >
            <Clock className="w-4 h-4 text-[#d8c9a8] mb-1.5" />
            <div className="font-mono-numbers text-lg font-bold text-[#d8c9a8]">
              {timeFormatted}
            </div>
            <div className="text-[11px] text-[#9c8e72]">Time</div>
          </ForgedIronFrame>

          <ForgedIronFrame
            seed="gameover-stat-kills"
            dripCount={0}
            showDrips={false}
            stainCount={1}
            contentClassName="p-3.5 flex flex-col items-center"
          >
            <Skull className="w-4 h-4 text-[#e5303a] mb-1.5" />
            <div className="font-mono-numbers text-lg font-bold text-[#d8c9a8]">
              {stats.enemiesKilled}
            </div>
            <div className="text-[11px] text-[#9c8e72]">Kills</div>
          </ForgedIronFrame>

          <ForgedIronFrame
            seed="gameover-stat-coins"
            dripCount={0}
            showDrips={false}
            stainCount={0}
            contentClassName="p-3.5 flex flex-col items-center"
          >
            <Coins className="w-4 h-4 text-[#f2a93b] mb-1.5" />
            <div className="font-mono-numbers text-lg font-bold text-[#d8c9a8]">
              +{stats.coinsEarned}
            </div>
            <div className="text-[11px] text-[#9c8e72]">Coins</div>
          </ForgedIronFrame>
        </div>

        {/* Big "One more run" Iron Button & Secondary Shop Iron Button */}
        <div className="flex flex-col gap-3 w-full">
          <IronButton
            seed="gameover-restart-btn"
            variant="blood"
            dripCount={3}
            onClick={onRestart}
            className="w-full min-h-[60px] px-6 font-display font-bold text-base tracking-wider"
          >
            <RotateCcw className="w-4 h-4 text-[#e5303a]" />
            <span>One more run</span>
          </IronButton>

          <IronButton
            seed="gameover-shop-btn"
            dripCount={2}
            onClick={onOpenShop}
            className="w-full min-h-[56px] px-6 text-sm font-semibold"
          >
            <ShoppingBag className="w-4 h-4 text-[#f2a93b]" />
            <span>Shop</span>
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
