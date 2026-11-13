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
  const [hoveredRelicId, setHoveredRelicId] = useState<RelicId | null>(null);
  const [pinnedRelicId, setPinnedRelicId] = useState<RelicId | null>(null);
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
    setHoveredRelicId(null);
    setPinnedRelicId(null);
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
  const inspectedRelic = getRelicById(hoveredRelicId ?? pinnedRelicId);

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
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#3a3f47]/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#6b3a2a] flex items-center justify-center shrink-0">
              {activeTab === 'relics' ? (
                <Gem className="w-5 h-5 text-[#5de4ff]" />
              ) : (
                <Coins className="w-5 h-5 text-[#f2a93b]" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-display font-bold tracking-wider text-[#d8c9a8] truncate">
                SANCTUARY FORGE
              </h2>
              <p className="text-xs text-[#9c8e72]">
                {activeTab === 'relics'
                  ? `Equip up to ${maxRelicSlots} Relics — unlock Slots 3 & 4 with Relic Seals`
                  : 'Permanent upgrades for every run'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#d8b4fe] px-1.5"
              title="Relic Seals from Daily Missions"
            >
              <KeyRound className="w-4 h-4 text-[#c084fc]" />
              <span>{relicSeals}</span>
            </div>

            <div
              className="flex items-center gap-1.5 text-sm font-mono-numbers font-bold text-[#d8c9a8] px-1.5"
              title="Soul Coins"
            >
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

        {/* Navigation Tabs: Upgrades / Relics */}
        <div className="px-5 sm:px-6 pt-3.5 pb-3 border-b border-[#3a3f47]/65 bg-[#121418]/75 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playUiClick();
                haptics.tap('light');
                setActiveTab('upgrades');
              }}
              className={`min-h-[48px] px-4 rounded-[9px] border text-xs sm:text-sm font-display font-bold tracking-wider uppercase flex items-center gap-2 transition-colors ${
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
              className={`min-h-[48px] px-4 rounded-[9px] border text-xs sm:text-sm font-display font-bold tracking-wider uppercase flex items-center gap-2 transition-colors ${
                activeTab === 'relics'
                  ? 'bg-[#172129] border-[#5de4ff] text-[#e8dcc2]'
                  : 'bg-[#15181d] border-[#5de4ff]/45 text-[#d8c9a8] hover:border-[#5de4ff]'
              }`}
            >
              <Gem className="w-4 h-4 text-[#5de4ff]" />
              <span>Relics</span>
              <span className="font-mono-numbers text-[11px] text-[#9c8e72]">
                {unlockedRelics.length}/{RELICS.length}
              </span>
              {(canUnlockNextSlot ||
                (equippedRelicIds.length === 0 &&
                  (unlockedRelics.length > 0 || coins >= Math.min(...RELICS.map((r) => r.cost))))) &&
                activeTab !== 'relics' && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      canUnlockNextSlot
                        ? 'bg-[#c084fc] shadow-[0_0_8px_rgba(192,132,252,0.95)]'
                        : 'bg-[#5de4ff] shadow-[0_0_8px_rgba(93,228,255,0.9)]'
                    }`}
                    aria-hidden="true"
                  />
                )}
            </button>
          </div>

          <span className="hidden sm:inline text-[11px] text-[#9c8e72]">
            {activeTab === 'relics' ? 'Passive Loadout' : 'Stat Ranks'}
          </span>
        </div>

        {/* Tab 1: Upgrades List */}
        {activeTab === 'upgrades' && (
          <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-[#3a3f47]/65">
            {upgrades.map((u) => {
              const isMaxed = u.currentRank >= u.maxRank;
              const nextCost = isMaxed ? 0 : u.cost[u.currentRank];
              const canAfford = !isMaxed && coins >= nextCost;

              return (
                <div key={u.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-[10px] bg-[#121417] border border-[#3a3f47] flex items-center justify-center shrink-0">
                      {renderUpgradeIcon(u.icon)}
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
        )}

        {/* Tab 2: Relics Armory */}
        {activeTab === 'relics' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Active Equipped Relics, Slot Expansion & Synergy Banner */}
            <div className="px-5 sm:px-6 py-3 border-b border-[#3a3f47]/65 bg-[#101318] flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="text-[11px] font-display font-bold tracking-wider uppercase text-[#8e8168] font-mono-numbers shrink-0">
                    Equipped ({equippedRelics.length}/{maxRelicSlots})
                  </span>
                  {equippedRelics.length > 0 ? (
                    equippedRelics.map((relic, idx) => {
                      const setMeta = RELIC_SETS[relic.setId];
                      return (
                        <React.Fragment key={relic.id}>
                          {idx > 0 && (
                            <span className="text-[#6b3a2a]" aria-hidden="true">
                              ·
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleUnequipRelic(relic.id)}
                            title={`Unequip ${relic.name} (${setMeta.setName} Set)`}
                            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#e8dcc2] hover:text-[#e5303a] transition-colors cursor-pointer"
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: setMeta.accentColor }}
                              aria-hidden="true"
                            />
                            <span>{relic.name}</span>
                            <span className="text-[11px] text-[#8e8168] hover:text-[#e5303a]">
                              ×
                            </span>
                          </button>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <span className="text-xs text-[#9c8e72]">
                      None equipped — equip up to {maxRelicSlots} Relics below
                    </span>
                  )}
                </div>

                {/* Slot Capacity Pips (1..4) */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  title={`${maxRelicSlots} of ${MAX_RELIC_SLOTS} Relic Slots Unlocked`}
                >
                  {Array.from({ length: MAX_RELIC_SLOTS }).map((_, idx) => {
                    const isSlotUnlocked = idx < maxRelicSlots;
                    const isFilled = idx < equippedRelics.length;
                    return (
                      <span
                        key={idx}
                        className={`w-5 h-5 rounded-[5px] border flex items-center justify-center text-[10px] font-mono-numbers ${
                          !isSlotUnlocked
                            ? 'bg-[#0e1014] border-[#3a3f47] text-[#6a6253]'
                            : isFilled
                              ? 'bg-[#172129] border-[#5de4ff] text-[#5de4ff]'
                              : 'bg-[#14171d] border-[#4b515c] text-[#8e8168]'
                        }`}
                      >
                        {isSlotUnlocked ? idx + 1 : <Lock className="w-2.5 h-2.5" />}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Next Relic Slot Unlock Bar */}
              {nextSlotInfo ? (
                <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-[#3a3f47]/40 flex-wrap">
                  <div className="flex items-center gap-2 text-xs min-w-0">
                    <KeyRound className="w-3.5 h-3.5 text-[#c084fc] shrink-0" />
                    <span className="text-[#d8c9a8] font-medium">
                      Unlock Relic Slot {nextSlotInfo.nextSlotNumber}
                    </span>
                    <span className="text-[#6b3a2a]" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`font-mono-numbers font-semibold ${
                        canUnlockNextSlot ? 'text-[#5de4ff]' : 'text-[#d8b4fe]'
                      }`}
                    >
                      {Math.min(relicSeals, nextSlotInfo.costSeals)}/{nextSlotInfo.costSeals} Relic Seals
                    </span>
                    {!canUnlockNextSlot && (
                      <span className="hidden sm:inline text-[11px] text-[#8e8168]">
                        (Earn Seals via Daily Missions)
                      </span>
                    )}
                  </div>

                  <IronButton
                    seed={`unlock-relic-slot-${nextSlotInfo.nextSlotNumber}`}
                    dripCount={0}
                    variant={canUnlockNextSlot ? 'blood' : 'default'}
                    borderColor={canUnlockNextSlot ? '#c084fc' : undefined}
                    glowColor={canUnlockNextSlot ? '#c084fc' : undefined}
                    glowStrength={canUnlockNextSlot ? 8 : 0}
                    disabled={!canUnlockNextSlot}
                    onClick={handleUnlockRelicSlot}
                    className="min-h-[44px] px-3.5 text-xs font-display font-bold tracking-wider"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#c084fc]" />
                    <span className={canUnlockNextSlot ? 'text-[#e8dcc2]' : 'text-[#7c7361]'}>
                      Unlock Slot {nextSlotInfo.nextSlotNumber} ({nextSlotInfo.costSeals})
                    </span>
                  </IronButton>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-[#f2a93b] pt-1 border-t border-[#3a3f47]/40">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>All {MAX_RELIC_SLOTS} Relic Slots Unlocked — pair 2 Set Synergies at once</span>
                </div>
              )}

              {activeSynergies.length > 0 ? (
                <div className="flex flex-col gap-1">
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
                        Synergy: {synergy.synergyTitle} ({synergy.setName} 2/2)
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
                  Set Synergy: Equip 2{' '}
                  <span style={{ color: RELIC_SETS.fire.accentColor }}>Fire</span>,{' '}
                  <span style={{ color: RELIC_SETS.shadow.accentColor }}>Shadow</span>, or{' '}
                  <span style={{ color: RELIC_SETS.tempest.accentColor }}>Tempest</span>{' '}
                  relics together for a bonus trait.
                </p>
              )}
            </div>

            {/* Relics List */}
            <div className="p-5 sm:p-6 overflow-y-auto divide-y divide-[#3a3f47]/65 flex-1">
              {RELICS.map((relic) => {
                const isUnlocked = unlockedRelics.includes(relic.id);
                const isEquipped = equippedRelicIds.includes(relic.id);
                const isInspected = inspectedRelic?.id === relic.id;
                const isJustEquipped = justEquippedRelic?.id === relic.id;
                const canAfford = coins >= relic.cost;
                const rarityMeta = RELIC_RARITY_META[relic.rarity];
                const setMeta = RELIC_SETS[relic.setId];
                const isSetSynergyActive = activeSynergies.some((s) => s.id === relic.setId);

                return (
                  <div
                    key={relic.id}
                    className={`py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 transition-colors ${
                      isEquipped ? 'bg-[#161c22]/45 -mx-2 px-2 rounded-[8px]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        {isEquipped && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute -inset-1 rounded-[12px] relic-equipped-halo"
                            style={{
                              boxShadow: `0 0 16px ${rarityMeta.glowColor}`,
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
                          onMouseEnter={() => setHoveredRelicId(relic.id)}
                          onMouseLeave={() =>
                            setHoveredRelicId((prev) => (prev === relic.id ? null : prev))
                          }
                          onFocus={() => setHoveredRelicId(relic.id)}
                          onBlur={() =>
                            setHoveredRelicId((prev) => (prev === relic.id ? null : prev))
                          }
                          onClick={() => {
                            soundManager.playUiClick();
                            haptics.tap('light');
                            setPinnedRelicId((prev) => (prev === relic.id ? null : relic.id));
                          }}
                          aria-expanded={isInspected}
                          aria-label={`Inspect ${rarityMeta.label} ${relic.name} trait details`}
                          title={`${rarityMeta.label} · ${relic.name}: ${relic.effectSummary}`}
                          className={`relative w-12 h-12 rounded-[10px] border-2 flex items-center justify-center cursor-help transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-[#5de4ff] ${
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
                          <span
                            className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#121417] border flex items-center justify-center"
                            style={{ borderColor: rarityMeta.borderColor }}
                            aria-hidden="true"
                          >
                            <Info className="w-2.5 h-2.5" style={{ color: rarityMeta.textColor }} />
                          </span>
                        </button>
                      </div>

                      <div className="min-w-0">
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
                          <span className="text-[#6b3a2a] text-[11px]" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-[11px] text-[#8e8168]">{relic.subtitle}</span>
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
                      </div>
                    </div>

                    {/* Unlock / Equip Button (56px touch target) */}
                    <div className="shrink-0">
                      {isUnlocked ? (
                        <IronButton
                          seed={`relic-equip-${relic.id}`}
                          dripCount={isEquipped ? 1 : 0}
                          variant={isEquipped ? 'blood' : 'default'}
                          onClick={() => handleToggleEquipRelic(relic.id)}
                          className="min-h-[56px] min-w-[104px] px-4 text-xs font-semibold"
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
                          className="min-h-[56px] min-w-[104px] px-4 font-mono-numbers text-xs font-semibold"
                        >
                          <Coins className="w-3.5 h-3.5 text-[#f2a93b]" />
                          <span className={canAfford ? 'text-[#d8c9a8]' : 'text-[#7c7361]'}>
                            {relic.cost}
                          </span>
                        </IronButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Informative Passive Trait Description Panel (updates on hover or tap of any relic icon) */}
            <div
              role="region"
              aria-live="polite"
              className="px-5 sm:px-6 py-3 border-t border-[#3a3f47]/80 bg-[#0f1217] shrink-0"
            >
              {inspectedRelic ? (
                (() => {
                  const rarityMeta = RELIC_RARITY_META[inspectedRelic.rarity];
                  const setMeta = RELIC_SETS[inspectedRelic.setId];
                  return (
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-[8px] border-2 flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: rarityMeta.bgTint,
                          borderColor: rarityMeta.borderColor,
                          boxShadow: `0 0 10px ${rarityMeta.glowColor}`,
                        }}
                      >
                        {renderRelicIcon(inspectedRelic.icon)}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                            <span className="font-display text-xs font-bold tracking-wider uppercase text-[#e8dcc2] truncate">
                              {inspectedRelic.name}
                            </span>
                            <span
                              className="text-[10px] font-display font-bold tracking-wider uppercase"
                              style={{ color: rarityMeta.textColor }}
                            >
                              {rarityMeta.label}
                            </span>
                            <span className="text-[#6b3a2a]" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className="text-[10px] font-display font-bold tracking-wider uppercase"
                              style={{ color: setMeta.accentColor }}
                            >
                              {setMeta.setName} Set
                            </span>
                            <span className="text-[#6b3a2a]" aria-hidden="true">
                              ·
                            </span>
                            <span
                              className="text-[11px] font-semibold truncate"
                              style={{ color: rarityMeta.textColor }}
                            >
                              {inspectedRelic.effectSummary}
                            </span>
                          </div>

                          {pinnedRelicId === inspectedRelic.id && (
                            <button
                              type="button"
                              onClick={() => {
                                soundManager.playUiClick();
                                setPinnedRelicId(null);
                              }}
                              className="text-[11px] text-[#8e8168] hover:text-[#d8c9a8] shrink-0 px-1.5 py-0.5"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>

                        <ul className="space-y-0.5 text-[11px] sm:text-xs text-[#c6b898]">
                          {inspectedRelic.traitBenefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-snug">
                              <span
                                className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                                style={{ backgroundColor: rarityMeta.borderColor }}
                                aria-hidden="true"
                              />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-[#8e8168]">
                  <div className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-[#5de4ff] shrink-0" />
                    <span>
                      Hover or tap any relic icon to inspect exact passive trait bonuses.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-display uppercase tracking-wider">
                    <span style={{ color: RELIC_RARITY_META.common.textColor }}>Common</span>
                    <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
                    <span style={{ color: RELIC_RARITY_META.rare.textColor }}>Rare</span>
                    <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
                    <span style={{ color: RELIC_RARITY_META.epic.textColor }}>Epic</span>
                    <span className="text-[#6b3a2a]" aria-hidden="true">·</span>
                    <span style={{ color: RELIC_RARITY_META.legendary.textColor }}>Legendary</span>
                  </div>
                </div>
              )}
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
            className="min-h-[56px] px-7 text-sm font-semibold"
          >
            Done
          </IronButton>
        </div>
      </ForgedIronFrame>
    </div>
  );
};
