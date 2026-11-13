import React, { useState } from 'react';
import { Coins, Heart, Sword, Wind, Sparkles, Zap, Shield, X, Check } from 'lucide-react';
import { getSavedCoins, getSavedUpgrades, purchaseUpgrade } from '../game/metaProgression';
import { MetaUpgrade } from '../game/types';
import { soundManager } from '../game/audio';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

interface CampShopModalProps {
  onClose: () => void;
}

export const CampShopModal: React.FC<CampShopModalProps> = ({ onClose }) => {
  const [coins, setCoins] = useState<number>(getSavedCoins());
  const [upgrades, setUpgrades] = useState<MetaUpgrade[]>(getSavedUpgrades());

  const handlePurchase = (upgradeId: string) => {
    const result = purchaseUpgrade(upgradeId);
    if (result.success) {
      soundManager.playCoinCollect();
      setCoins(result.newCoins);
      setUpgrades(result.upgrades);
    }
  };

  const renderIcon = (iconName: string) => {
    const cls = 'w-5 h-5';
    switch (iconName) {
      case 'heart':
        return <Heart className={`${cls} text-[#e5303a]`} />;
      case 'sword':
        return <Sword className={`${cls} text-[#f2a93b]`} />;
      case 'wind':
        return <Wind className={`${cls} text-[#d8c9a8]`} />;
      case 'sparkles':
        return <Sparkles className={`${cls} text-[#5de4ff]`} />;
      case 'zap':
        return <Zap className={`${cls} text-[#e5303a]`} />;
      case 'coins':
        return <Coins className={`${cls} text-[#f2a93b]`} />;
      case 'shield':
        return <Shield className={`${cls} text-[#d8c9a8]`} />;
      default:
        return <Sparkles className={`${cls} text-[#5de4ff]`} />;
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex flex-col items-center justify-center safe-area-pad z-50"
      style={{
        background:
          'radial-gradient(circle at center, rgba(16, 15, 18, 0.8) 0%, rgba(30, 10, 13, 0.92) 100%)',
      }}
    >
      <ForgedIronFrame
        seed="camp-shop-modal"
        dripCount={4}
        maxDripLength={22}
        className="max-w-2xl w-full flex flex-col max-h-[88vh]"
        contentClassName="flex flex-col max-h-[88vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#3a3f47]/80">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center">
              <Coins className="w-5 h-5 text-[#f2a93b]" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold tracking-wider text-[#d8c9a8]">
                SANCTUARY FORGE
              </h2>
              <p className="text-xs text-[#9c8e72]">Permanent upgrades for every run</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#d8c9a8] px-2">
              <Coins className="w-4 h-4 text-[#f2a93b]" />
              <span>{coins}</span>
            </div>

            <IronButton
              seed="shop-close-btn"
              dripCount={0}
              onClick={onClose}
              className="w-14 h-14 min-h-[56px] min-w-[56px]"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-[#d8c9a8]" />
            </IronButton>
          </div>
        </div>

        {/* Upgrades List */}
        <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-[#3a3f47]/65">
          {upgrades.map((u) => {
            const isMaxed = u.currentRank >= u.maxRank;
            const nextCost = isMaxed ? 0 : u.cost[u.currentRank];
            const canAfford = !isMaxed && coins >= nextCost;

            return (
              <div key={u.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#3a3f47] flex items-center justify-center shrink-0">
                    {renderIcon(u.icon)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <h4 className="font-semibold text-[#d8c9a8] text-sm">{u.name}</h4>
                      <span
                        className={`text-xs font-mono-numbers font-medium ${
                          u.icon === 'sparkles' ? 'text-[#5de4ff]' : 'text-[#e5303a]'
                        }`}
                      >
                        {u.statPerRank}
                      </span>
                    </div>
                    <p className="text-xs text-[#9c8e72] leading-relaxed mt-0.5">
                      {u.description}
                    </p>

                    {/* Rank Progress Pips */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {Array.from({ length: u.maxRank }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-4 h-1.5 rounded-full transition-colors ${
                            idx < u.currentRank
                              ? u.icon === 'sparkles'
                                ? 'bg-[#5de4ff] shadow-[0_0_6px_rgba(93,228,255,0.65)]'
                                : 'bg-[#b3121a] shadow-[0_0_6px_rgba(229,48,58,0.6)]'
                              : 'bg-[#2a2d33]'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-[11px] font-mono-numbers text-[#8e8168]">
                        {u.currentRank}/{u.maxRank}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buy Button (56px touch target) */}
                <div className="shrink-0">
                  {isMaxed ? (
                    <div className="min-h-[56px] px-3.5 flex items-center gap-1.5 text-xs font-semibold text-[#f2a93b]">
                      <Check className="w-4 h-4" />
                      <span>Maxed</span>
                    </div>
                  ) : (
                    <IronButton
                      seed={`shop-buy-${u.id}`}
                      dripCount={0}
                      variant={canAfford ? 'blood' : 'default'}
                      onClick={() => handlePurchase(u.id)}
                      disabled={!canAfford}
                      className="min-h-[56px] min-w-[96px] px-4 font-mono-numbers text-xs font-semibold"
                    >
                      <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                      <span className={canAfford ? 'text-[#d8c9a8]' : 'text-[#7c7361]'}>
                        {nextCost}
                      </span>
                    </IronButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 flex items-center justify-between gap-4">
          <span className="text-xs text-[#9c8e72]">Applies at run start</span>
          <IronButton
            seed="shop-done-btn"
            variant="blood"
            dripCount={2}
            onClick={onClose}
            className="min-h-[56px] px-7 text-sm font-semibold"
          >
            Done
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
