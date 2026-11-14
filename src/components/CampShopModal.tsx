import React, { useEffect, useRef, useState } from 'react';
import {
  Coins,
  Heart,
  Sword,
  Wind,
  Sparkles,
  Zap,
  Shield,
  X,
  Check,
  Magnet,
  Sun,
  Gem,
  Info,
  KeyRound,
  Lock,
} from 'lucide-react';
import { getSavedCoins, getSavedUpgrades, purchaseUpgrade } from '../game/metaProgression';
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
} from '../game/relics';
import { MetaUpgrade, RelicDefinition, RelicId } from '../game/types';
import { soundManager } from '../game/audio';
import { haptics } from '../mobile/haptics';
import { ForgedIronFrame, IronButton } from './ForgedIronFrame';

export type CampShopTab = 'upgrades' | 'relics';

interface CampShopModalProps {
  onClose: () => void;
  initialTab?: CampShopTab;
}

export const CampShopModal: React.FC<CampShopModalProps> = ({
  onClose,
  initialTab = 'upgrades',
}) => {
  const [activeTab, setActiveTab] = useState<CampShopTab>(initialTab);
  const [coins, setCoins] = useState<number>(getSavedCoins());
  const [upgrades, setUpgrades] = useState<MetaUpgrade[]>(getSavedUpgrades());
  const [unlockedRelics, setUnlockedRelics] = useState<RelicId[]>(getUnlockedRelicIds());
  const [equippedRelicIds, setEquippedRelicIds] = useState<RelicId[]>(getEquippedRelicIds());
  const [relicSeals, setRelicSeals] = useState<number>(getRelicSeals());
  const [maxRelicSlots, setMaxRelicSlots] = useState<number>(getMaxRelicSlots());
  const [inspectedRelicId, setInspectedRelicId] = useState<RelicId | null>(null);
  const [justEquippedRelic, setJustEquippedRelic] = useState<{ id: RelicId; seq: number } | null>(
    null
  );
  const equipBurstSeqRef = useRef<number>(0);
  const equipBurstTimerRef = useRef<number | null>(null);

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

  useEffect(() => {
    setActiveTab(initialTab);
    setInspectedRelicId(null);
  }, [initialTab]);

  useEffect(() => {
    return subscribeRelics(
      ({ unlockedRelics: u, equippedRelicIds: eq, relicSeals: seals, maxRelicSlots: slots }) => {
        setUnlockedRelics(u);
        setEquippedRelicIds(eq);
        setRelicSeals(seals);
        setMaxRelicSlots(slots);
      }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (equipBurstTimerRef.current !== null) {
        window.clearTimeout(equipBurstTimerRef.current);
        equipBurstTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        soundManager.playUiClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePurchase = (upgradeId: string) => {
    const result = purchaseUpgrade(upgradeId);
    if (result.success) {
      soundManager.playCoinCollect();
      haptics.tap('medium');
      setCoins(result.newCoins);
      setUpgrades(result.upgrades);
    }
  };

  const handleUnlockRelic = (relicId: RelicId) => {
    const result = unlockRelic(relicId);
    if (result.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setCoins(result.newCoins);
      setUnlockedRelics(result.unlockedRelics);
      setEquippedRelicIds(result.equippedRelicIds);
      if (result.equippedRelicIds.includes(relicId)) {
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
    const updatedIds = unequipRelic(relicId);
    setEquippedRelicIds(updatedIds);
  };

  const handleUnlockRelicSlot = () => {
    const res = unlockNextRelicSlot();
    if (res.success) {
      soundManager.playCoinCollect();
      haptics.tap('heavy');
      setRelicSeals(res.newSeals);
      setMaxRelicSlots(res.maxRelicSlots);
    }
  };

  const renderUpgradeIcon = (iconName: string) => {
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

  const renderRelicIcon = (iconName: RelicDefinition['icon']) => {
    const cls = 'w-5 h-5';
    switch (iconName) {
      case 'magnet':
        return <Magnet className={`${cls} text-[#5de4ff]`} />;
      case 'wind':
        return <Wind className={`${cls} text-[#5de4ff]`} />;
      case 'heart':
        return <Heart className={`${cls} text-[#e5303a]`} />;
      case 'sun':
        return <Sun className={`${cls} text-[#f2a93b]`} />;
      case 'zap':
        return <Zap className={`${cls} text-[#f2a93b]`} />;
      case 'sword':
        return <Sword className={`${cls} text-[#e5303a]`} />;
      default:
        return <Gem className={`${cls} text-[#5de4ff]`} />;
    }
  };

  const equippedRelics = equippedRelicIds
    .map((id) => getRelicById(id))
    .filter((relic): relic is RelicDefinition => relic !== null);
  const activeSynergies = getActiveRelicSynergies(equippedRelicIds);
  const nextSlotInfo = getNextRelicSlotUnlockInfo(maxRelicSlots);
  const canUnlockNextSlot = Boolean(nextSlotInfo && relicSeals >= nextSlotInfo.costSeals);

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
        className="max-w-2xl w-full flex flex-col max-h-[90vh]"
        contentClassName="flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Clean Header: Title on left, single unobstructed Close button on right */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 border-b border-[#3a3f47]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center shrink-0">
              {activeTab === 'relics' ? (
                <Gem className="w-5 h-5 text-[#5de4ff]" />
              ) : (
                <Coins className="w-5 h-5 text-[#f2a93b]" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate">
                SANCTUARY FORGE
              </h2>
              <p className="text-xs text-[#9c8e72] truncate">
                {activeTab === 'relics'
                  ? `Loadout (${equippedRelics.length}/${maxRelicSlots} active) · Unlock slots with Relic Seals`
                  : 'Permanent upgrades for every run'}
              </p>
            </div>
          </div>

          <IronButton
            seed="shop-close-btn"
            dripCount={0}
            onClick={onClose}
            className="w-14 h-14 min-h-[56px] min-w-[56px] shrink-0"
            aria-label="Close Sanctuary Forge"
          >
            <X className="w-4 h-4 text-[#d8c9a8]" />
          </IronButton>
        </div>

        {/* Navigation Tabs + Dedicated Currency Strip */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#3a3f47]/65 bg-[#121418]/85 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                setActiveTab('upgrades');
              }}
              className={`min-h-[44px] px-3.5 sm:px-4 rounded-[9px] border text-xs sm:text-sm font-display font-bold tracking-wider uppercase flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'upgrades'
                  ? 'bg-[#2a1519] border-[#b3121a] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#3a3f47] text-[#9c8e72] hover:text-[#d8c9a8]'
              }`}
            >
              <Coins className="w-4 h-4 text-[#f2a93b]" />
              <span>Upgrades</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                setActiveTab('relics');
              }}
              className={`min-h-[44px] px-3.5 sm:px-4 rounded-[9px] border text-xs sm:text-sm font-display font-bold tracking-wider uppercase flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'relics'
                  ? 'bg-[#281216] border-[#a8242e] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#454c57] text-[#d8c9a8] hover:border-[#8c322b]'
              }`}
            >
              <Gem className="w-4 h-4 text-[#c7566b]" />
              <span>Relics</span>
              <span className="font-mono-numbers text-[11px] text-[#9c8e72]">
                {unlockedRelics.length}/{RELICS.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3.5 shrink-0">
            <div
              className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#e3c3c9]"
              title="Relic Seals from Daily Missions"
            >
              <KeyRound className="w-4 h-4 text-[#c7566b]" />
              <span>{relicSeals}</span>
              <span className="text-[11px] font-sans font-normal text-[#8e8168] hidden sm:inline">
                Seals
              </span>
            </div>
            <span className="h-3.5 w-px bg-[#3a3f47]" aria-hidden="true" />
            <div
              className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#d8c9a8]"
              title="Soul Coins"
            >
              <Coins className="w-4 h-4 text-[#f2a93b]" />
              <span>{coins}</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Upgrades List */}
        {activeTab === 'upgrades' && (
          <div className="p-4 sm:p-6 overflow-y-auto divide-y divide-[#3a3f47]/65 flex-1">
            {upgrades.map((u) => {
              const isMaxed = u.currentRank >= u.maxRank;
              const nextCost = isMaxed ? 0 : u.cost[u.currentRank];
              const canAfford = !isMaxed && coins >= nextCost;

              return (
                <div
                  key={u.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#3a3f47] flex items-center justify-center shrink-0">
                      {renderUpgradeIcon(u.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
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
                                  ? 'bg-[#b5873a] border border-[#d6b267]/50'
                                  : 'bg-[#9c151c] border border-[#d13b43]/50'
                                : 'bg-[#23262c] border border-[#32363f]'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[11px] font-mono-numbers text-[#8e8168]">
                          {u.currentRank}/{u.maxRank}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <div className="shrink-0 self-end sm:self-center">
                    {isMaxed ? (
                      <div className="min-h-[48px] sm:min-h-[56px] px-3.5 flex items-center gap-1.5 text-xs font-semibold text-[#f2a93b]">
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
                        className="min-h-[52px] min-w-[100px] px-4 font-mono-numbers text-xs font-semibold"
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
        )}

        {/* Tab 2: Relics Armory & Visual 4-Slot Equipment Loadout (Unified Scroll Area) */}
        {activeTab === 'relics' && (
          <div className="overflow-y-auto flex-1 min-h-0">
            {/* Visual 4-Slot Equipment Loadout Grid */}
            <div className="px-4 sm:px-6 py-4 border-b border-[#3a3f47]/65 bg-[#101318] flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-display font-bold tracking-wider uppercase text-[#d8c9a8]">
                  Active Relic Loadout ({equippedRelics.length}/{maxRelicSlots})
                </span>
                <span className="text-[#8e8168]">
                  Tap equipped slot to unequip
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                {Array.from({ length: MAX_RELIC_SLOTS }).map((_, slotIdx) => {
                  const slotNumber = slotIdx + 1;
                  const isSlotUnlocked = slotIdx < maxRelicSlots;
                  const equippedInSlot = isSlotUnlocked ? equippedRelics[slotIdx] ?? null : null;
                  const isNextLockedSlot = !isSlotUnlocked && nextSlotInfo?.nextSlotNumber === slotNumber;
                  const slotUnlockCost = slotNumber === 3 ? 3 : slotNumber === 4 ? 5 : 0;

                  if (equippedInSlot) {
                    const rarityMeta = RELIC_RARITY_META[equippedInSlot.rarity];
                    const setMeta = RELIC_SETS[equippedInSlot.setId];
                    return (
                      <button
                        key={`slot-${slotNumber}`}
                        type="button"
                        onClick={() => handleUnequipRelic(equippedInSlot.id)}
                        title={`Unequip ${equippedInSlot.name}`}
                        className="group min-h-[68px] p-2.5 rounded-[10px] border text-left flex items-center gap-2.5 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
                        style={{
                          backgroundColor: rarityMeta.bgTint,
                          borderColor: rarityMeta.borderColor,
                          boxShadow: `0 0 12px ${rarityMeta.glowColor.replace(/[\d.]+\)$/, '0.24)')}`,
                        }}
                      >
                        <div
                          className="w-9 h-9 rounded-[8px] border flex items-center justify-center shrink-0 bg-[#121417]/85"
                          style={{ borderColor: rarityMeta.borderColor }}
                        >
                          {renderRelicIcon(equippedInSlot.icon)}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1 text-[9px] font-mono-numbers uppercase tracking-wider text-[#9c8e72]">
                            <span>Slot {slotNumber}</span>
                            <span className="group-hover:text-[#e5303a] transition-colors">
                              Unequip
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#e8dcc2] truncate leading-tight">
                            {equippedInSlot.name}
                          </div>
                          <div
                            className="text-[10px] font-display font-bold uppercase tracking-wider truncate leading-tight"
                            style={{ color: setMeta.accentColor }}
                          >
                            {setMeta.setName}
                          </div>
                        </div>
                      </button>
                    );
                  }

                  if (isSlotUnlocked) {
                    return (
                      <div
                        key={`slot-${slotNumber}`}
                        className="min-h-[68px] p-2.5 rounded-[10px] border border-dashed border-[#3a3f47] bg-[#13161c]/85 flex items-center gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-[8px] border border-[#2d323b] bg-[#0e1014] flex items-center justify-center text-xs font-mono-numbers font-bold text-[#7c7361] shrink-0">
                          {slotNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-[#9c8e72] leading-tight">
                            Slot {slotNumber}
                          </div>
                          <div className="text-[10px] text-[#6d6556] leading-tight mt-0.5">
                            Empty Socket
                          </div>
                        </div>
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
                        className={`min-h-[68px] p-2.5 rounded-[10px] border text-left flex items-center gap-2.5 transition-all ${
                          canUnlockNextSlot
                            ? 'bg-[#2a1115] border-[#a8242e] hover:border-[#cfa15c] cursor-pointer active:scale-[0.98]'
                            : 'bg-[#0e1014] border-[#2a2e36] opacity-80 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-[8px] border flex items-center justify-center shrink-0 ${
                            canUnlockNextSlot
                              ? 'bg-[#3d1117] border-[#b8323c] text-[#f0cad9]'
                              : 'bg-[#121418] border-[#2f343d] text-[#6a6253]'
                          }`}
                        >
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-[11px] font-semibold leading-tight truncate ${
                              canUnlockNextSlot ? 'text-[#e8dcc2]' : 'text-[#8e8168]'
                            }`}
                          >
                            {canUnlockNextSlot ? `Unlock Slot ${slotNumber}` : `Slot ${slotNumber} Locked`}
                          </div>
                          <div
                            className={`text-[10px] font-mono-numbers mt-0.5 leading-tight ${
                              canUnlockNextSlot ? 'text-[#f2a93b] font-semibold' : 'text-[#b56778]'
                            }`}
                          >
                            {Math.min(relicSeals, nextSlotInfo.costSeals)}/{nextSlotInfo.costSeals} Seals
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <div
                      key={`slot-${slotNumber}`}
                      className="min-h-[68px] p-2.5 rounded-[10px] border border-[#24272e] bg-[#0d0f13] opacity-65 flex items-center gap-2.5"
                    >
                      <div className="w-9 h-9 rounded-[8px] border border-[#2a2e36] bg-[#121418] flex items-center justify-center text-[#5c5549] shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-[#7c7361] leading-tight">
                          Slot {slotNumber}
                        </div>
                        <div className="text-[10px] font-mono-numbers text-[#6a6253] leading-tight mt-0.5">
                          {slotUnlockCost} Seals
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Synergy Status */}
              {activeSynergies.length > 0 ? (
                <div className="flex flex-col gap-1 pt-0.5">
                  {activeSynergies.map((synergy) => (
                    <div key={synergy.id} className="flex items-center gap-2 text-xs flex-wrap">
                      <Sparkles
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: synergy.accentColor }}
                      />
                      <span
                        className="font-display font-bold tracking-wider uppercase text-[11px]"
                        style={{ color: synergy.accentColor }}
                      >
                        {synergy.synergyTitle} ({synergy.setName} 2/2)
                      </span>
                      <span className="text-[#6b3a2a]" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-[#e8dcc2] font-medium">
                        {synergy.bonusSummary}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#8e8168]">
                  Pair 2{' '}
                  <span style={{ color: RELIC_SETS.fire.accentColor }}>Fire</span>,{' '}
                  <span style={{ color: RELIC_SETS.shadow.accentColor }}>Shadow</span>, or{' '}
                  <span style={{ color: RELIC_SETS.tempest.accentColor }}>Tempest</span>{' '}
                  relics to unlock a Set Synergy bonus.
                </p>
              )}
            </div>

            {/* Relics Catalog List */}
            <div className="p-4 sm:p-6 divide-y divide-[#3a3f47]/65">
              {RELICS.map((relic) => {
                const isUnlocked = unlockedRelics.includes(relic.id);
                const isEquipped = equippedRelicIds.includes(relic.id);
                const isInspected = inspectedRelicId === relic.id;
                const isJustEquipped = justEquippedRelic?.id === relic.id;
                const canAfford = coins >= relic.cost;
                const rarityMeta = RELIC_RARITY_META[relic.rarity];
                const setMeta = RELIC_SETS[relic.setId];
                const isSetSynergyActive = activeSynergies.some((s) => s.id === relic.setId);

                return (
                  <div
                    key={relic.id}
                    className={`py-4 first:pt-0 last:pb-0 flex flex-col gap-2.5 transition-colors ${
                      isEquipped ? 'bg-[#161d24]/55 -mx-2 px-2.5 rounded-[10px]' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="relative shrink-0 mt-0.5">
                          {isEquipped && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute -inset-1 rounded-[12px] relic-equipped-halo"
                              style={{
                                boxShadow: `0 0 14px ${rarityMeta.glowColor}`,
                              }}
                            />
                          )}
                          {isJustEquipped && (
                            <span
                              key={`relic-ring-${relic.id}-${justEquippedRelic.seq}`}
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 rounded-[10px] border-2 relic-equip-ring"
                              style={{ borderColor: rarityMeta.borderColor }}
                            />
                          )}
                          <button
                            key={
                              isJustEquipped
                                ? `relic-icon-${relic.id}-${justEquippedRelic.seq}`
                                : `relic-icon-${relic.id}`
                            }
                            type="button"
                            onClick={() => {
                              soundManager.playUiClick();
                              haptics.tap('light');
                              setInspectedRelicId((prev) => (prev === relic.id ? null : relic.id));
                            }}
                            aria-expanded={isInspected}
                            aria-label={`Inspect ${rarityMeta.label} ${relic.name} trait details`}
                            title={`${rarityMeta.label} · ${relic.name}: ${relic.effectSummary}`}
                            className={`relative w-12 h-12 rounded-[10px] border-2 flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#5de4ff] ${
                              isJustEquipped ? 'relic-equip-pop' : ''
                            }`}
                            style={{
                              backgroundColor: rarityMeta.bgTint,
                              borderColor: rarityMeta.borderColor,
                              boxShadow:
                                isInspected || isEquipped
                                  ? `0 0 14px ${rarityMeta.glowColor}`
                                  : `0 0 6px ${rarityMeta.glowColor.replace(/[\d.]+\)$/, '0.24)')}`,
                            }}
                          >
                            {renderRelicIcon(relic.icon)}
                          </button>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h4 className="font-semibold text-[#e8dcc2] text-sm">{relic.name}</h4>
                            <span
                              className="text-[10px] font-display font-bold tracking-wider uppercase"
                              style={{ color: rarityMeta.textColor }}
                            >
                              {rarityMeta.label}
                            </span>
                            <span className="text-[#6b3a2a] text-[11px]" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className="text-[10px] font-display font-bold tracking-wider uppercase"
                              style={{ color: setMeta.accentColor }}
                            >
                              {setMeta.setName} Set{isSetSynergyActive ? ' ★' : ''}
                            </span>
                          </div>
                          <p
                            className="text-xs font-semibold mt-0.5"
                            style={{ color: rarityMeta.textColor }}
                          >
                            {relic.effectSummary}
                          </p>
                          <p className="text-xs text-[#9c8e72] leading-relaxed mt-1">
                            {relic.description}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              soundManager.playUiClick();
                              haptics.tap('light');
                              setInspectedRelicId((prev) => (prev === relic.id ? null : relic.id));
                            }}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#5de4ff]/90 hover:text-[#5de4ff] cursor-pointer"
                          >
                            <Info className="w-3 h-3" />
                            <span>{isInspected ? 'Hide stats' : 'Inspect stats'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Unlock / Equip Button */}
                      <div className="shrink-0 self-end sm:self-center">
                        {isUnlocked ? (
                          <IronButton
                            seed={`relic-equip-${relic.id}`}
                            dripCount={isEquipped ? 1 : 0}
                            variant={isEquipped ? 'blood' : 'default'}
                            onClick={() => handleToggleEquipRelic(relic.id)}
                            className="min-h-[52px] min-w-[108px] px-4 text-xs font-semibold"
                          >
                            {isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#f2a93b]" />
                                <span className="text-[#e8dcc2]">Equipped</span>
                              </>
                            ) : (
                              <span className="text-[#d8c9a8]">Equip</span>
                            )}
                          </IronButton>
                        ) : (
                          <IronButton
                            seed={`relic-buy-${relic.id}`}
                            dripCount={0}
                            variant={canAfford ? 'blood' : 'default'}
                            onClick={() => handleUnlockRelic(relic.id)}
                            disabled={!canAfford}
                            className="min-h-[52px] min-w-[108px] px-4 font-mono-numbers text-xs font-semibold"
                          >
                            <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                            <span className={canAfford ? 'text-[#d8c9a8]' : 'text-[#7c7361]'}>
                              {relic.cost}
                            </span>
                          </IronButton>
                        )}
                      </div>
                    </div>

                    {/* Clean Inline Expandable Trait Breakdown */}
                    {isInspected && (
                      <div
                        className="rounded-[9px] border bg-[#0d1015]/90 px-3.5 py-2.5 ml-0 sm:ml-[62px]"
                        style={{ borderColor: `${rarityMeta.borderColor}66` }}
                      >
                        <div className="text-[10px] font-display font-bold tracking-wider uppercase text-[#9c8e72] mb-1">
                          Exact Relic Traits
                        </div>
                        <ul className="space-y-1 text-[11px] sm:text-xs text-[#d8c9a8]">
                          {relic.traitBenefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-snug">
                              <span
                                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: rarityMeta.borderColor }}
                                aria-hidden="true"
                              />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-[#3a3f47]/80 bg-[#0d0e11]/70 flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-[#9c8e72]">
            {activeTab === 'relics'
              ? `Up to ${maxRelicSlots} Relics active per run`
              : 'Applies at run start'}
          </span>
          <IronButton
            seed="shop-done-btn"
            variant="blood"
            dripCount={2}
            onClick={onClose}
            className="min-h-[52px] px-7 text-sm font-semibold"
          >
            Done
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
