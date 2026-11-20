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
import { NineSlice } from '../ui/NineSlice';
import { UiButton } from '../ui/UiButton';
import { UI_SPRITES } from '../ui/uiConfig';
import { SynergiesTab } from './SynergiesTab';

export type ShopSubTab = 'market' | 'relics' | 'synergies';

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
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);

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
    const deal = deals.find((d) => d.id === dealId);
    const res = purchaseDailyShopDeal(dealId);
    if (res.success) {
      if (deal?.currency === 'coins') {
        soundManager.playCoinSpend(deal.cost);
      } else {
        soundManager.playCoinGain(deal?.id.endsWith('_warden_tribute') ? 'jackpot' : 'large');
      }
      haptics.tap('heavy');
      setCoins(res.newCoins);
      setGems(res.newGems);
      setDeals(res.deals);
    }
  };

  const handleBuyUpgrade = (upgradeId: string) => {
    const res = purchaseUpgrade(upgradeId);
    if (res.success) {
      const spent = Math.max(50, coins - res.newCoins);
      soundManager.playCoinSpend(spent);
      haptics.tap('medium');
      setCoins(res.newCoins);
      setUpgrades(res.upgrades);
    }
  };

  const handleUnlockRelic = (relicId: RelicId) => {
    const res = unlockRelic(relicId);
    if (res.success) {
      const spent = Math.max(100, coins - res.newCoins);
      soundManager.playCoinSpend(spent);
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
      soundManager.playCoinSpend(500);
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
    <div className="w-full flex-1 min-h-0 flex flex-col px-2 sm:px-3 pb-2 overflow-hidden">
      {/* Page Title & 3-Tab Mode Switch */}
      <div className="shrink-0 flex flex-col gap-2 pb-2">
        <div>
          <h1 className="font-display font-bold text-[clamp(17px,3.5vw,21px)] tracking-[0.14em] text-[#e8dcc2]">
            SANCTUARY SHOP
          </h1>
          <p className="font-body text-xs font-medium text-[#b5a589]">
            {subTab === 'synergies'
              ? 'Arcane weapon & relic set elemental combinations'
              : 'Daily provisions, lantern upgrades & cursed relics'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Sanctuary Shop sections"
          className="grid grid-cols-3 gap-1.5"
        >
          <UiButton
            role="tab"
            aria-selected={subTab === 'market'}
            tone={subTab === 'market' ? 'blood' : 'iron'}
            active={subTab === 'market'}
            size="sm"
            onClick={() => {
              soundManager.playUiClick();
              setSubTab('market');
            }}
          >
            Market
          </UiButton>
          <UiButton
            role="tab"
            aria-selected={subTab === 'relics'}
            tone={subTab === 'relics' ? 'blood' : 'iron'}
            active={subTab === 'relics'}
            size="sm"
            onClick={() => {
              soundManager.playUiClick();
              setSubTab('relics');
            }}
            className="tabular-nums"
          >
            Relics ({unlockedRelics.length}/{RELICS.length})
          </UiButton>
          <UiButton
            role="tab"
            aria-selected={subTab === 'synergies'}
            tone={subTab === 'synergies' ? 'blood' : 'iron'}
            active={subTab === 'synergies'}
            size="sm"
            onClick={() => {
              soundManager.playUiClick();
              setSubTab('synergies');
            }}
          >
            Synergies
          </UiButton>
        </div>
      </div>

      {/* Scrollable Page Body */}
      <div
        ref={scrollBodyRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 flex flex-col gap-3 pb-2"
      >
        {subTab === 'market' ? (
          <>
            {/* Section 1: Daily Deals */}
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

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {deals.map((deal) => {
                  const canAfford =
                    !deal.purchased &&
                    (deal.currency === 'coins' ? coins >= deal.cost : gems >= deal.cost);

                  return (
                    <NineSlice
                      key={deal.id}
                      variant={deal.currency === 'gems' ? 'cardOrnateCrimson' : 'cardOrnateGold'}
                      tileTexture="stone"
                      highlight={deal.purchased ? 'none' : canAfford ? 'gold' : 'none'}
                      padding="0px"
                      borderWidth="clamp(10px, 1.8vw, 15px)"
                      contentClassName="p-2 flex flex-col items-center justify-between text-center gap-1.5 min-h-[154px]"
                    >
                      <div className="w-full flex flex-col items-center gap-1">
                        {deal.discountBadge && (
                          <span className="px-1.5 py-0.5 rounded-[4px] bg-[#6b1118] border border-[#b3121a] font-display font-bold text-[9px] text-[#f7e4b2]">
                            {deal.discountBadge}
                          </span>
                        )}

                        <div className="mt-0.5 flex items-center justify-center">
                          <Icon
                            id={deal.title}
                            rarity={deal.currency === 'gems' ? 'epic' : 'rare'}
                            size={40}
                          />
                        </div>

                        <div className="font-display font-bold text-[10.5px] leading-tight text-[#e8dcc2]">
                          {deal.title}
                        </div>
                        <div className="font-mono-numbers font-bold text-[10.5px] text-[#f2a93b] leading-tight">
                          {deal.rewardLabel}
                        </div>
                        <p className="font-body text-[10px] leading-tight text-[#9c8e72]">
                          {deal.subtitle}
                        </p>
                      </div>

                      {deal.purchased ? (
                        <UiButton disabled size="xs" className="w-full">
                          <Icon id="ui_check" size={14} />
                          <span>SOLD</span>
                        </UiButton>
                      ) : (
                        <UiButton
                          tone={canAfford ? 'blood' : 'iron'}
                          disabled={!canAfford}
                          size="xs"
                          onClick={() => handleBuyDeal(deal.id)}
                          className="w-full font-mono-numbers"
                        >
                          <Icon
                            id={deal.currency === 'coins' ? 'soul_coin' : 'crimson_gem'}
                            size={14}
                          />
                          <span>{deal.cost}</span>
                        </UiButton>
                      )}
                    </NineSlice>
                  );
                })}
              </div>
            </section>

            {/* Section 2: Permanent Upgrades */}
            <section aria-labelledby="perm-upgrades-heading" className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h2
                  id="perm-upgrades-heading"
                  className="font-display font-bold text-xs tracking-[0.16em] uppercase text-[#e8dcc2]"
                >
                  Permanent Upgrades
                </h2>
                <span className="font-body text-xs text-[#9c8e72]">Applies to every run</span>
              </div>

              <div className="flex flex-col gap-2">
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
                    <NineSlice
                      key={u.id}
                      variant="panelIronDark"
                      tileTexture="stone"
                      highlight={canAfford ? 'ember' : 'none'}
                      padding="0px"
                      contentClassName="p-2.5 sm:p-3 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div
                          style={{ width: 48, aspectRatio: '1 / 1' }}
                          className="relative shrink-0 flex items-center justify-center"
                        >
                          <img
                            src={UI_SPRITES.roundSquareSocket}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            style={{ imageRendering: 'auto' }}
                            className="pointer-events-none absolute inset-0 w-full h-full object-contain select-none"
                          />
                          <span className="relative z-10 flex items-center justify-center">
                            <Icon id={u.name} rarity={upgradeRarity} size={38} />
                          </span>
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
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {Array.from({ length: u.maxRank }).map((_, idx) => (
                              <img
                                key={idx}
                                src={
                                  idx < u.currentRank
                                    ? UI_SPRITES.knobCrimsonOrb
                                    : UI_SPRITES.knobSteelDome
                                }
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                                style={{ width: 10, aspectRatio: '1 / 1', imageRendering: 'auto' }}
                                className="object-contain select-none"
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
                          <div className="min-h-[44px] px-2.5 flex items-center gap-1 font-display font-bold text-xs text-[#f2a93b]">
                            <Icon id="ui_check" size={16} />
                            <span>MAXED</span>
                          </div>
                        ) : (
                          <UiButton
                            tone={canAfford ? 'blood' : 'iron'}
                            disabled={!canAfford}
                            size="sm"
                            onClick={() => handleBuyUpgrade(u.id)}
                            className="min-w-[84px] font-mono-numbers"
                          >
                            <Icon id="soul_coin" size={15} />
                            <span>{nextCost.toLocaleString()}</span>
                          </UiButton>
                        )}
                      </div>
                    </NineSlice>
                  );
                })}
              </div>
            </section>
          </>
        ) : subTab === 'relics' ? (
          <div className="flex flex-col gap-2.5">
            <NineSlice
              variant="panelIronDark"
              tileTexture="stone"
              padding="0px"
              contentClassName="p-3 flex flex-col gap-2.5"
            >
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
                    return (
                      <button
                        key={`slot-${slotNumber}`}
                        type="button"
                        onClick={() => handleUnequipRelic(equippedInSlot.id)}
                        className="text-left cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <NineSlice
                          variant="miniPlate"
                          tileTexture="row"
                          highlight="gold"
                          padding="0px"
                          contentClassName="min-h-[58px] p-2 flex items-center gap-2"
                        >
                          <Icon id={equippedInSlot.name} rarity={equippedInSlot.rarity} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono-numbers text-[10px] text-[#9c8e72]">
                              Slot {slotNumber} · Tap to remove
                            </div>
                            <div className="font-display font-bold text-xs text-[#e8dcc2] leading-tight truncate">
                              {equippedInSlot.name}
                            </div>
                          </div>
                        </NineSlice>
                      </button>
                    );
                  }

                  if (isSlotUnlocked) {
                    return (
                      <NineSlice
                        key={`slot-${slotNumber}`}
                        variant="miniPlate"
                        tileTexture="row"
                        padding="0px"
                        contentClassName="min-h-[58px] p-2 flex items-center gap-2"
                      >
                        <div
                          style={{ width: 34, aspectRatio: '1 / 1' }}
                          className="relative flex items-center justify-center shrink-0"
                        >
                          <img
                            src={UI_SPRITES.roundSquareSocket}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            style={{ imageRendering: 'auto' }}
                            className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                          />
                          <span className="relative z-10 font-mono-numbers font-bold text-xs text-[#8e8168]">
                            {slotNumber}
                          </span>
                        </div>
                        <div className="font-body text-xs text-[#9c8e72]">Empty Socket</div>
                      </NineSlice>
                    );
                  }

                  if (isNextLockedSlot && nextSlotInfo) {
                    return (
                      <button
                        key={`slot-${slotNumber}`}
                        type="button"
                        disabled={!canUnlockNextSlot}
                        onClick={handleUnlockRelicSlot}
                        className={`text-left ${
                          canUnlockNextSlot ? 'cursor-pointer active:scale-[0.98]' : 'opacity-70 cursor-not-allowed'
                        }`}
                      >
                        <NineSlice
                          variant="miniPlate"
                          tileTexture="row"
                          highlight={canUnlockNextSlot ? 'blood' : 'none'}
                          padding="0px"
                          contentClassName="min-h-[58px] p-2 flex items-center gap-2"
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
                        </NineSlice>
                      </button>
                    );
                  }

                  return (
                    <NineSlice
                      key={`slot-${slotNumber}`}
                      variant="miniPlate"
                      tileTexture="row"
                      padding="0px"
                      className="opacity-65"
                      contentClassName="min-h-[58px] p-2 flex items-center gap-2"
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
                    </NineSlice>
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
            </NineSlice>

            {RELICS.map((relic) => {
              const isUnlocked = unlockedRelics.includes(relic.id);
              const isEquipped = equippedRelicIds.includes(relic.id);
              const isInspected = inspectedRelicId === relic.id;
              const isJustEquipped = justEquippedRelic?.id === relic.id;
              const canAfford = coins >= relic.cost;
              const rarityMeta = RELIC_RARITY_META[relic.rarity];
              const setMeta = RELIC_SETS[relic.setId];

              return (
                <NineSlice
                  key={relic.id}
                  variant="panelIronDark"
                  tileTexture="stone"
                  highlight={isEquipped ? 'gold' : 'none'}
                  padding="0px"
                  contentClassName="p-3 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <button
                        type="button"
                        aria-label={`Inspect ${relic.name}`}
                        onClick={() => {
                          soundManager.playUiClick();
                          setInspectedRelicId((prev) => (prev === relic.id ? null : relic.id));
                        }}
                        style={{ width: 52, aspectRatio: '1 / 1' }}
                        className={`relative flex items-center justify-center shrink-0 cursor-pointer ${
                          isJustEquipped ? 'relic-equip-pop' : ''
                        }`}
                      >
                        <img
                          src={UI_SPRITES.roundSquareSocket}
                          alt=""
                          aria-hidden="true"
                          draggable={false}
                          style={{ imageRendering: 'auto' }}
                          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                        />
                        <span className="relative z-10 flex items-center justify-center">
                          <Icon id={relic.name} rarity={relic.rarity} size={42} />
                        </span>
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
                          className="mt-1 min-h-[36px] inline-flex items-center gap-1.5 font-body text-xs font-semibold text-[#5de4ff] cursor-pointer"
                        >
                          <Icon id="ui_info" size={16} />
                          <span>{isInspected ? 'Hide traits' : 'Inspect traits'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <UiButton
                          tone={isEquipped ? 'blood' : 'iron'}
                          active={isEquipped}
                          size="sm"
                          onClick={() => handleToggleEquipRelic(relic.id)}
                          className="min-w-[92px]"
                        >
                          {isEquipped && <Icon id="ui_check" size={14} />}
                          <span>{isEquipped ? 'EQUIPPED' : 'EQUIP'}</span>
                        </UiButton>
                      ) : (
                        <UiButton
                          tone={canAfford ? 'blood' : 'iron'}
                          disabled={!canAfford}
                          size="sm"
                          onClick={() => handleUnlockRelic(relic.id)}
                          className="min-w-[92px] font-mono-numbers"
                        >
                          <Icon id="soul_coin" size={15} />
                          <span>{relic.cost.toLocaleString()}</span>
                        </UiButton>
                      )}
                    </div>
                  </div>

                  {isInspected && (
                    <NineSlice
                      variant="miniPlate"
                      tileTexture="row"
                      padding="0px"
                      contentClassName="px-3 py-2"
                    >
                      <ul className="space-y-1 font-body text-xs text-[#d8c9a8]">
                        {relic.traitBenefits.map((trait, idx) => (
                          <li key={idx}>• {trait}</li>
                        ))}
                      </ul>
                    </NineSlice>
                  )}
                </NineSlice>
              );
            })}
          </div>
        ) : (
          <SynergiesTab
            unlockedRelics={unlockedRelics}
            equippedRelicIds={equippedRelicIds}
            onOpenRelicsTab={() => setSubTab('relics')}
            onRequestScrollTop={() => scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          />
        )}
      </div>
    </div>
  );
};
