import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../../game/audio';
import { DailyShopDeal, getDailyShopDeals, purchaseDailyShopDeal } from '../../game/dailyShop';
import {
  getSavedCoins,
  getSavedUpgrades,
  purchaseUpgrade,
  subscribeCoins,
} from '../../game/metaProgression';
import {
  MAX_RELIC_SLOTS,
  RELICS,
  RELIC_RARITY_META,
  RELIC_SETS,
  getActiveRelicSynergies,
  getEquippedRelicIds,
  getMaxRelicSlots,
  getNextRelicSlotUnlockInfo,
  getRelicById,
  getRelicSeals,
  getUnlockedRelicIds,
  subscribeRelics,
  toggleEquipRelic,
  unequipRelic,
  unlockNextRelicSlot,
  unlockRelic,
} from '../../game/relics';
import { MetaUpgrade, RelicDefinition, RelicId } from '../../game/types';
import { haptics } from '../../mobile/haptics';
import { Icon } from '../Icon';
import { IronCard } from '../IronCard';

export type ShopSubTab = 'market' | 'relics';

interface ShopPageProps {
  initialSubTab?: ShopSubTab;
}

export const ShopPage: React.FC<ShopPageProps> = ({ initialSubTab = 'market' }) => {
  const [subTab, setSubTab] = useState<ShopSubTab>(initialSubTab);
  const [coins, setCoins] = useState<number>(() => getSavedCoins());
  const [gems, setGems] = useState<number>(() => getRelicSeals());
  const [deals, setDeals] = useState<DailyShopDeal[]>(() => getDailyShopDeals());
  const [upgrades, setUpgrades] = useState<MetaUpgrade[]>(() => getSavedUpgrades());
  const [unlockedRelics, setUnlockedRelics] = useState<RelicId[]>(() => getUnlockedRelicIds());
  const [equippedRelicIds, setEquippedRelicIds] = useState<RelicId[]>(() => getEquippedRelicIds());
  const [maxRelicSlots, setMaxRelicSlots] = useState<number>(() => getMaxRelicSlots());
  const [inspectedRelicId, setInspectedRelicId] = useState<RelicId | null>(null);
  const [justEquippedRelic, setJustEquippedRelic] = useState<{ id: RelicId; seq: number } | null>(
    null
  );
  const equipBurstSeqRef = useRef<number>(0);
  const equipBurstTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    const unsubCoins = subscribeCoins(setCoins);
    const unsubRelics = subscribeRelics(
      ({ unlockedRelics: u, equippedRelicIds: eq, relicSeals: seals, maxRelicSlots: slots }) => {
        setUnlockedRelics(u);
        setEquippedRelicIds(eq);
        setGems(seals);
        setMaxRelicSlots(slots);
      }
    );
    return () => {
      unsubCoins();
      unsubRelics();
      if (equipBurstTimerRef.current !== null) {
        window.clearTimeout(equipBurstTimerRef.current);
      }
    };
  }, []);

  const triggerEquipBurst = (relicId: RelicId) => {
    equipBurstSeqRef.current += 1;
    setJustEquippedRelic({ id: relicId, seq: equipBurstSeqRef.current });
    if (equipBurstTimerRef.current !== null) {
      window.clearTimeout(equipBurstTimerRef.current);
    }
    equipBurstTimerRef.current = window.setTimeout(() => {
      equipBurstTimerRef.current = null;
      setJustEquippedRelic(null);
    }, 550);
  };

  const handleBuyDeal = (dealId: string) => {
    const res = purchaseDailyShopDeal(dealId);
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setCoins(res.newCoins);
      setGems(res.newGems);
      setDeals(res.deals);
    }
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const res = purchaseUpgrade(upgradeId);
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('medium');
      setCoins(res.newCoins);
      setUpgrades(res.upgrades);
    }
  };

  const handleUnlockRelic = (relicId: RelicId) => {
    const res = unlockRelic(relicId);
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setCoins(res.newCoins);
      setUnlockedRelics(res.unlockedRelics);
      setEquippedRelicIds(res.equippedRelicIds);
      if (res.equippedRelicIds.includes(relicId)) {
        triggerEquipBurst(relicId);
      }
    }
  };

  const handleToggleEquipRelic = (relicId: RelicId) => {
    soundManager.playUiClick();
    const { equippedRelicIds: updatedIds, wasEquipped } = toggleEquipRelic(relicId);
    haptics.tap(wasEquipped ? 'medium' : 'light');
    setEquippedRelicIds(updatedIds);
    if (wasEquipped) {
      triggerEquipBurst(relicId);
    }
  };

  const handleUnequipRelic = (relicId: RelicId) => {
    soundManager.playUiClick();
    haptics.tap('light');
    setEquippedRelicIds(unequipRelic(relicId));
  };

  const handleUnlockRelicSlot = () => {
    const res = unlockNextRelicSlot();
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setGems(res.newSeals);
      setMaxRelicSlots(res.maxRelicSlots);
    }
  };

  const equippedRelics = equippedRelicIds
    .map((id) => getRelicById(id))
    .filter((r): r is RelicDefinition => r !== null);
  const activeSynergies = getActiveRelicSynergies(equippedRelicIds);
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockNextSlot = Boolean(nextSlotInfo && gems >= nextSlotInfo.costSeals);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col px-3 pb-2 overflow-hidden">
      {/* Page Title & Mode Switch */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-2.5">
        <div>
          <h1 className="font-display font-bold text-xl tracking-[0.14em] text-[#e8dcc2]">
            SANCTUARY SHOP
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            Daily provisions, lantern upgrades &amp; cursed relics
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              haptics.tap('light');
              setSubTab('market');
            }}
            className={`min-h-[56px] px-3.5 rounded-[7px] border font-display font-bold text-[11px] tracking-wider uppercase cursor-pointer transition-colors ${
              subTab === 'market'
                ? 'bg-[#360f14] border-[#b3121a] text-[#f2dfba]'
                : 'bg-[#14161b] border-[#3a3f47] text-[#9c8e72]'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => {
              soundManager.playUiClick();
              haptics.tap('light');
              setSubTab('relics');
            }}
            className={`min-h-[56px] px-3.5 rounded-[7px] border font-display font-bold text-[11px] tracking-wider uppercase cursor-pointer transition-colors ${
              subTab === 'relics'
                ? 'bg-[#360f14] border-[#b3121a] text-[#f2dfba]'
                : 'bg-[#14161b] border-[#3a3f47] text-[#9c8e72]'
            }`}
          >
            Relics ({unlockedRelics.length}/{RELICS.length})
          </button>
        </div>
      </div>

      {/* Scrollable Page Body */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-3.5 pb-2">
        {subTab === 'market' ? (
          <>
            {/* Section 1: Daily Deals (3 Cards) */}
            <section aria-labelledby="daily-deals-heading" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="daily-deals-heading"
                  className="font-display font-bold text-xs tracking-[0.16em] uppercase text-[#f2a93b]"
                >
                  Daily Deals
                </h2>
                <span className="font-body text-xs text-[#9c8e72]">Refreshes every dawn</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {deals.map((deal) => {
                  const canAfford =
                    !deal.purchased &&
                    (deal.currency === 'coins' ? coins >= deal.cost : gems >= deal.cost);

                  return (
                    <IronCard
                      key={deal.id}
                      highlight={deal.purchased ? 'none' : canAfford ? 'gold' : 'none'}
                      contentClassName="p-2.5 flex flex-col items-center justify-between text-center gap-2 min-h-[156px]"
                    >
                      <div className="w-full flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-1">
                          {deal.discountBadge && (
                            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#6b1118] border border-[#b3121a] font-display font-bold text-[9px] text-[#f7e4b2]">
                              {deal.discountBadge}
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 flex items-center justify-center">
                          <Icon
                            id={deal.title}
                            rarity={deal.currency === 'gems' ? 'epic' : 'rare'}
                            size={44}
                          />
                        </div>

                        <div className="font-display font-bold text-[11px] leading-tight text-[#e8dcc2]">
                          {deal.title}
                        </div>
                        <div className="font-mono-numbers font-bold text-[11px] text-[#f2a93b] leading-tight">
                          {deal.rewardLabel}
                        </div>
                        <p className="font-body text-[11px] leading-tight text-[#9c8e72]">
                          {deal.subtitle}
                        </p>
                      </div>

                      {deal.purchased ? (
                        <div className="w-full min-h-[56px] rounded-[6px] border border-[#3a3f47] bg-[#101215] flex items-center justify-center gap-1 font-display font-bold text-[11px] text-[#9c8e72]">
                          <Icon id="ui_check" size={16} />
                          <span>SOLD</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleBuyDeal(deal.id)}
                          className={`w-full min-h-[56px] px-2 rounded-[6px] border font-mono-numbers font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95 ${
                            canAfford
                              ? 'bg-gradient-to-b from-[#6e121a] to-[#34070c] border-[#b3121a] text-[#f7e8cc] cursor-pointer'
                              : 'bg-[#121418] border-[#32363f] text-[#6d6558] cursor-not-allowed'
                          }`}
                        >
                          <Icon
                            id={deal.currency === 'coins' ? 'soul_coin' : 'crimson_gem'}
                            size={16}
                          />
                          <span>{deal.cost}</span>
                        </button>
                      )}
                    </IronCard>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Permanent Upgrades (Lantern Brightness, Soul Vitality & Core Armory) */}
            <section aria-labelledby="perm-upgrades-heading" className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="perm-upgrades-heading"
                  className="font-display font-bold text-xs tracking-[0.16em] uppercase text-[#e8dcc2]"
                >
                  Permanent Upgrades
                </h2>
                <span className="font-body text-xs text-[#9c8e72]">Applies to every run</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {upgrades.map((u) => {
                  const isMaxed = u.currentRank >= u.maxRank;
                  const nextCost = isMaxed ? 0 : u.cost[u.currentRank];
                  const canAfford = !isMaxed && coins >= nextCost;
                  const upgradeRarity = isMaxed
                    ? 'legendary'
                    : u.currentRank > 0
                      ? 'rare'
                      : 'common';

                  return (
                    <IronCard
                      key={u.id}
                      highlight={canAfford ? 'ember' : 'none'}
                      contentClassName="p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="shrink-0 flex items-center justify-center">
                          <Icon id={u.name} rarity={upgradeRarity} size={48} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <h3 className="font-display font-bold text-sm text-[#e8dcc2]">
                              {u.name}
                            </h3>
                            <span className="font-mono-numbers text-xs font-bold text-[#5de4ff]">
                              {u.statPerRank}
                            </span>
                          </div>
                          <p className="font-body text-xs text-[#b5a589] leading-snug mt-0.5">
                            {u.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            {Array.from({ length: u.maxRank }).map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-4 h-1.5 rounded-[2px] ${
                                  idx < u.currentRank
                                    ? 'bg-gradient-to-r from-[#b3121a] to-[#f2a93b]'
                                    : 'bg-[#22252b] border border-[#363b45]'
                                }`}
                              />
                            ))}
                            <span className="ml-1 font-mono-numbers text-[11px] font-bold text-[#9c8e72]">
                              {u.currentRank}/{u.maxRank}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isMaxed ? (
                          <div className="min-h-[56px] px-3 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                            <Icon id="ui_check" size={16} />
                            <span>MAXED</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuyUpgrade(u.id)}
                            className={`min-h-[56px] min-w-[84px] px-3 rounded-[7px] border font-mono-numbers font-bold text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95 ${
                              canAfford
                                ? 'bg-gradient-to-b from-[#6e121a] to-[#34070c] border-[#b3121a] text-[#f7e8cc] cursor-pointer'
                                : 'bg-[#121418] border-[#32363f] text-[#7c7361] cursor-not-allowed'
                            }`}
                          >
                            <Icon id="soul_coin" size={16} />
                            <span>{nextCost}</span>
                          </button>
                        )}
                      </div>
                    </IronCard>
                  );
                })}
              </div>
            </section>
          </>
        ) : (
          /* Relics Forge Section */
          <div className="flex flex-col gap-3">
            <IronCard contentClassName="p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-bold text-xs tracking-wider uppercase text-[#e8dcc2]">
                  Active Relic Loadout ({equippedRelics.length}/{maxRelicSlots})
                </span>
                <span className="font-body text-xs text-[#9c8e72]">Tap slot to unequip</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: MAX_RELIC_SLOTS }).map((_, slotIdx) => {
                  const slotNumber = slotIdx + 1;
                  const isSlotUnlocked = slotIdx < maxRelicSlots;
                  const equippedInSlot = isSlotUnlocked ? equippedRelics[slotIdx] ?? null : null;
                  const isNextLockedSlot =
                    !isSlotUnlocked && nextSlotInfo?.nextSlotNumber === slotNumber;
                  const slotUnlockCost = slotNumber === 3 ? 2 : slotNumber === 4 ? 4 : 0;

                  if (equippedInSlot) {
                    const rarityMeta = RELIC_RARITY_META[equippedInSlot.rarity];
                    return (
                      <button
                        key={`slot-${slotNumber}`}
                        type="button"
                        onClick={() => handleUnequipRelic(equippedInSlot.id)}
                        className="min-h-[60px] p-2.5 rounded-[8px] border text-left flex items-center gap-2.5 cursor-pointer active:scale-[0.98]"
                        style={{
                          backgroundColor: rarityMeta.bgTint,
                          borderColor: rarityMeta.borderColor,
                        }}
                      >
                        <div className="shrink-0 flex items-center justify-center">
                          <Icon id={equippedInSlot.name} rarity={equippedInSlot.rarity} size={38} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono-numbers text-[10px] text-[#9c8e72]">
                            Slot {slotNumber} · Tap to remove
                          </div>
                          <div className="font-display font-bold text-xs text-[#e8dcc2] leading-tight">
                            {equippedInSlot.name}
                          </div>
                        </div>
                      </button>
                    );
                  }

                  if (isSlotUnlocked) {
                    return (
                      <div
                        key={`slot-${slotNumber}`}
                        className="min-h-[60px] p-2.5 rounded-[8px] border border-dashed border-[#464c56] bg-[#111318] flex items-center gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-[6px] border border-[#2f343d] bg-[#0c0e12] flex items-center justify-center font-mono-numbers font-bold text-xs text-[#8e8168]">
                          {slotNumber}
                        </div>
                        <div className="font-body text-xs text-[#9c8e72]">Empty Socket</div>
                      </div>
                    );
                  }

                  if (isNextLockedSlot && nextSlotInfo) {
                    return (
                      <button
                        key={`slot-${slotNumber}`}
                        type="button"
                        disabled={!canUnlockNextSlot}
                        onClick={handleUnlockRelicSlot}
                        className={`min-h-[60px] p-2.5 rounded-[8px] border text-left flex items-center gap-2.5 ${
                          canUnlockNextSlot
                            ? 'bg-[#2a1115] border-[#b3121a] cursor-pointer active:scale-[0.98]'
                            : 'bg-[#0e1014] border-[#2a2e36] opacity-80 cursor-not-allowed'
                        }`}
                      >
                        <Icon
                          id={canUnlockNextSlot ? 'ui_lock_open' : 'ui_lock_closed'}
                          size={20}
                        />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-[11px] text-[#e8dcc2]">
                            {canUnlockNextSlot ? `Unlock Slot ${slotNumber}` : `Slot ${slotNumber} Locked`}
                          </div>
                          <div className="font-mono-numbers text-[11px] text-[#c084fc]">
                            {Math.min(gems, nextSlotInfo.costSeals)}/{nextSlotInfo.costSeals} Gems
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`slot-${slotNumber}`}
                      className="min-h-[60px] p-2.5 rounded-[8px] border border-[#252830] bg-[#0c0e12] opacity-70 flex items-center gap-2.5"
                    >
                      <Icon id="ui_lock_closed" size={20} muted />
                      <div>
                        <div className="font-display font-bold text-[11px] text-[#8e8168]">
                          Slot {slotNumber}
                        </div>
                        <div className="font-mono-numbers text-[10px] text-[#6d6558]">
                          {slotUnlockCost} Gems
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeSynergies.length > 0 && (
                <div className="pt-1 flex flex-col gap-1.5">
                  {activeSynergies.map((synergy) => (
                    <div
                      key={synergy.id}
                      title={`${synergy.synergyTitle}: ${synergy.bonusSummary}`}
                      className="flex items-center gap-2 font-body text-xs text-[#e8dcc2]"
                    >
                      <Icon id={synergy.synergyTitle} size={22} alt={synergy.synergyTitle} />
                      <span>
                        <span className="font-display font-bold" style={{ color: synergy.accentColor }}>
                          {synergy.synergyTitle}
                        </span>{' '}
                        · {synergy.bonusSummary}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </IronCard>

            {RELICS.map((relic) => {
              const isUnlocked = unlockedRelics.includes(relic.id);
              const isEquipped = equippedRelicIds.includes(relic.id);
              const isInspected = inspectedRelicId === relic.id;
              const isJustEquipped = justEquippedRelic?.id === relic.id;
              const canAfford = coins >= relic.cost;
              const rarityMeta = RELIC_RARITY_META[relic.rarity];
              const setMeta = RELIC_SETS[relic.setId];

              return (
                <IronCard
                  key={relic.id}
                  highlight={isEquipped ? 'gold' : 'none'}
                  contentClassName="p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        aria-label={`Inspect ${relic.name}`}
                        onClick={() => {
                          soundManager.playUiClick();
                          setInspectedRelicId((prev) => (prev === relic.id ? null : relic.id));
                        }}
                        className={`w-14 h-14 min-w-[56px] min-h-[56px] flex items-center justify-center shrink-0 cursor-pointer ${
                          isJustEquipped ? 'relic-equip-pop' : ''
                        }`}
                      >
                        <Icon id={relic.name} rarity={relic.rarity} size={52} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <h3 className="font-display font-bold text-sm text-[#e8dcc2]">
                            {relic.name}
                          </h3>
                          <span
                            className="font-display font-bold text-[10px] uppercase"
                            style={{ color: setMeta.accentColor }}
                          >
                            {setMeta.setName}
                          </span>
                        </div>
                        <p className="font-body text-xs font-bold" style={{ color: rarityMeta.textColor }}>
                          {relic.effectSummary}
                        </p>
                        <p className="font-body text-xs text-[#b5a589] leading-snug mt-0.5">
                          {relic.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playUiClick();
                            setInspectedRelicId((prev) => (prev === relic.id ? null : relic.id));
                          }}
                          className="mt-1 min-h-[56px] inline-flex items-center gap-1.5 font-body text-xs font-semibold text-[#5de4ff] cursor-pointer"
                        >
                          <Icon id="ui_info" size={16} />
                          <span>{isInspected ? 'Hide traits' : 'Inspect traits'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleEquipRelic(relic.id)}
                          className={`min-h-[56px] min-w-[96px] px-3 rounded-[7px] border font-display font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            isEquipped
                              ? 'bg-gradient-to-b from-[#6e121a] to-[#34070c] border-[#f2a93b] text-[#f2a93b]'
                              : 'bg-[#171a20] border-[#464c56] text-[#d8c9a8]'
                          }`}
                        >
                          {isEquipped && <Icon id="ui_check" size={16} />}
                          <span>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => handleUnlockRelic(relic.id)}
                          className={`min-h-[56px] min-w-[96px] px-3 rounded-[7px] border font-mono-numbers font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 ${
                            canAfford
                              ? 'bg-gradient-to-b from-[#6e121a] to-[#34070c] border-[#b3121a] text-[#f7e8cc] cursor-pointer'
                              : 'bg-[#121418] border-[#32363f] text-[#7c7361] cursor-not-allowed'
                          }`}
                        >
                          <Icon id="soul_coin" size={16} />
                          <span>{relic.cost}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isInspected && (
                    <div className="rounded-[7px] border border-[#3a3f47] bg-[#0c0e12] px-3 py-2">
                      <ul className="space-y-1 font-body text-xs text-[#d8c9a8]">
                        {relic.traitBenefits.map((trait, idx) => (
                          <li key={idx}>• {trait}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </IronCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
