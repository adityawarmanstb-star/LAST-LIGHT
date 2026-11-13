import { getSavedCoins, saveCoins } from './metaProgression';
import { saveDataStore } from './saveData';
import {
  RelicDefinition,
  RelicId,
  RelicRarity,
  RelicSetId,
  RelicSynergyDefinition,
} from './types';

export const BASE_RELIC_SLOTS = 2;
export const MAX_RELIC_SLOTS = 4;

export const RELIC_SLOT_UNLOCK_COSTS: Record<number, number> = {
  3: 2,
  4: 4,
};

export interface RelicRarityMeta {
  label: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  bgTint: string;
}

export const RELIC_RARITY_META: Record<RelicRarity, RelicRarityMeta> = {
  common: {
    label: 'Common',
    borderColor: '#8892a0',
    textColor: '#b9b09a',
    glowColor: 'rgba(136, 146, 160, 0.45)',
    bgTint: '#14171c',
  },
  rare: {
    label: 'Rare',
    borderColor: '#5de4ff',
    textColor: '#5de4ff',
    glowColor: 'rgba(93, 228, 255, 0.55)',
    bgTint: '#0e1b22',
  },
  epic: {
    label: 'Epic',
    borderColor: '#c084fc',
    textColor: '#d8b4fe',
    glowColor: 'rgba(192, 132, 252, 0.55)',
    bgTint: '#1a1324',
  },
  legendary: {
    label: 'Legendary',
    borderColor: '#f2a93b',
    textColor: '#f2a93b',
    glowColor: 'rgba(242, 169, 59, 0.65)',
    bgTint: '#21180c',
  },
};

export const RELIC_SETS: Record<RelicSetId, RelicSynergyDefinition> = {
  fire: {
    id: 'fire',
    setName: 'Fire',
    synergyTitle: 'Solar Ignition',
    bonusSummary: '+15% Weapon Damage · +15% Light Radius',
    accentColor: '#ff7a33',
  },
  shadow: {
    id: 'shadow',
    setName: 'Shadow',
    synergyTitle: 'Umbral Pact',
    bonusSummary: '+35% Crit Damage · +8% Crit Chance',
    accentColor: '#e5303a',
  },
  tempest: {
    id: 'tempest',
    setName: 'Tempest',
    synergyTitle: 'Eye of the Storm',
    bonusSummary: '-15% Dash Cooldown · +10% Move Speed',
    accentColor: '#5de4ff',
  },
};

export const RELICS: RelicDefinition[] = [
  {
    id: 'lodestone_heart',
    rarity: 'common',
    setId: 'tempest',
    name: 'Lodestone Heart',
    subtitle: 'Magnetized Storm Core',
    description:
      'Pulls distant XP gems, Soul Coins, and shards straight toward your lantern without breaking formation.',
    effectSummary: '+85% Pick-up Radius',
    traitBenefits: [
      '+85% magnet pick-up radius for XP gems, Soul Coins, chests & shards',
      'Stacks multiplicatively with Soul Attractor shop upgrades & Magnet Pull',
      'Tempest Set (2/2): -15% Dash Cooldown & +10% Move Speed',
    ],
    cost: 75,
    icon: 'magnet',
    accentColor: '#8892a0',
  },
  {
    id: 'twin_zephyr',
    rarity: 'rare',
    setId: 'tempest',
    name: 'Twin-Wind Feather',
    subtitle: 'Gale-Forged Talons',
    description:
      'Grants a second consecutive Dash charge and hastens Dash recovery to slip cleanly out of encirclements.',
    effectSummary: 'Double Dash Count · Faster Recharge',
    traitBenefits: [
      'Doubles maximum Dash charges from 1 to 2 consecutive charges',
      'Reduces Dash recharge cooldown from 3.0s down to 2.6s per charge',
      'Tempest Set (2/2): -15% Dash Cooldown & +10% Move Speed',
    ],
    cost: 95,
    icon: 'wind',
    accentColor: '#5de4ff',
  },
  {
    id: 'blood_chalice',
    rarity: 'rare',
    setId: 'shadow',
    name: 'Crimson Chalice',
    subtitle: 'Vampiric Shadow Vessel',
    description:
      'Reinforces your vitality before battle and siphons 15 HP whenever you slay an Elite or Boss.',
    effectSummary: '+20% Max HP · +15 HP on Elite/Boss Kill',
    traitBenefits: [
      '+20% starting Max HP (stacks with Enduring Vessel upgrades)',
      'Restores +15 HP instantly upon slaying any Elite or Boss enemy',
      'Shadow Set (2/2): +35% Crit Damage & +8% Crit Chance',
    ],
    cost: 115,
    icon: 'heart',
    accentColor: '#5de4ff',
  },
  {
    id: 'sunforged_lens',
    rarity: 'epic',
    setId: 'fire',
    name: 'Sunforged Lens',
    subtitle: 'Solar Focal Prism',
    description:
      'Projects a wider lantern beam through the gloom and sharpens every bolt toward fatal strikes.',
    effectSummary: '+25% Light Radius · +12% Crit Chance',
    traitBenefits: [
      '+25% Lantern light radius across normal and Darkness Falls waves',
      '+12% Critical Hit Chance (total 17% base crit for 1.5x damage)',
      'Fire Set (2/2): +15% Weapon Damage & +15% Light Radius',
    ],
    cost: 140,
    icon: 'sun',
    accentColor: '#c084fc',
  },
  {
    id: 'iron_spurs',
    rarity: 'epic',
    setId: 'fire',
    name: 'Quicksilver Spurs',
    subtitle: 'Ember-Forged Greaves',
    description:
      'Accelerates stride speed and incantation tempo, letting you kite hordes while keeping weapons cycling.',
    effectSummary: '+15% Move Speed · -12% Weapon Cooldowns',
    traitBenefits: [
      '+15% base Movement Speed to outrun Cinder Imps and Brute charges',
      '-12% global weapon cooldowns for faster bolts, rings, sparks & shells',
      'Fire Set (2/2): +15% Weapon Damage & +15% Light Radius',
    ],
    cost: 160,
    icon: 'zap',
    accentColor: '#c084fc',
  },
  {
    id: 'executioner_seal',
    rarity: 'legendary',
    setId: 'shadow',
    name: "Executioner's Seal",
    subtitle: 'Cursed Shadow Signet',
    description:
      'Trades a fraction of your life vessel for devastating, armor-piercing firepower across every weapon.',
    effectSummary: '+25% Damage · +1 Pierce · -10% Max HP',
    traitBenefits: [
      '+25% bonus Damage across all active weapons and spells',
      '+1 Projectile Pierce so shots punch through extra enemies per volley',
      'Shadow Set (2/2): +35% Crit Damage & +8% Crit Chance (-10% Max HP base)',
    ],
    cost: 200,
    icon: 'sword',
    accentColor: '#f2a93b',
  },
];

export type RelicsListener = (state: {
  unlockedRelics: RelicId[];
  equippedRelicIds: RelicId[];
  relicSeals: number;
  maxRelicSlots: number;
}) => void;

const relicListeners = new Set<RelicsListener>();

function notifyRelics(): void {
  const data = saveDataStore.read();
  const payload = {
    unlockedRelics: [...data.unlockedRelics],
    equippedRelicIds: [...data.equippedRelicIds],
    relicSeals: data.relicSeals,
    maxRelicSlots: data.maxRelicSlots,
  };
  relicListeners.forEach((listener) => listener(payload));
}

export function getRelicById(id: RelicId | null | undefined): RelicDefinition | null {
  if (!id) return null;
  return RELICS.find((relic) => relic.id === id) ?? null;
}

export function getUnlockedRelicIds(): RelicId[] {
  return saveDataStore.read().unlockedRelics;
}

export function getEquippedRelicIds(): RelicId[] {
  return saveDataStore.read().equippedRelicIds;
}

export function getEquippedRelics(): RelicDefinition[] {
  return getEquippedRelicIds()
    .map((id) => getRelicById(id))
    .filter((relic): relic is RelicDefinition => relic !== null);
}

export function getRelicSeals(): number {
  return saveDataStore.read().relicSeals;
}

export function addRelicSeals(amount: number): number {
  const delta = Number.isFinite(amount) ? Math.floor(amount) : 0;
  if (delta === 0) return getRelicSeals();
  const updated = saveDataStore.update((draft) => {
    draft.relicSeals = Math.max(0, draft.relicSeals + delta);
  });
  notifyRelics();
  return updated.relicSeals;
}

export function getMaxRelicSlots(): number {
  return saveDataStore.read().maxRelicSlots;
}

export function getNextRelicSlotUnlockInfo(
  currentSlots: number = getMaxRelicSlots()
): { nextSlotNumber: number; costSeals: number } | null {
  if (currentSlots >= MAX_RELIC_SLOTS) return null;
  const nextSlotNumber = currentSlots + 1;
  const costSeals = RELIC_SLOT_UNLOCK_COSTS[nextSlotNumber];
  if (!costSeals) return null;
  return { nextSlotNumber, costSeals };
}

export function unlockNextRelicSlot(): {
  success: boolean;
  newSeals: number;
  maxRelicSlots: number;
} {
  const current = saveDataStore.read();
  const nextInfo = getNextRelicSlotUnlockInfo(current.maxRelicSlots);
  if (!nextInfo || current.relicSeals < nextInfo.costSeals) {
    return {
      success: false,
      newSeals: current.relicSeals,
      maxRelicSlots: current.maxRelicSlots,
    };
  }

  const updated = saveDataStore.update((draft) => {
    draft.relicSeals = Math.max(0, draft.relicSeals - nextInfo.costSeals);
    draft.maxRelicSlots = Math.min(MAX_RELIC_SLOTS, draft.maxRelicSlots + 1);
  });
  notifyRelics();

  return {
    success: true,
    newSeals: updated.relicSeals,
    maxRelicSlots: updated.maxRelicSlots,
  };
}

export function getActiveRelicSynergies(
  ids: RelicId[] = getEquippedRelicIds()
): RelicSynergyDefinition[] {
  if (ids.length < 2) return [];
  const counts: Partial<Record<RelicSetId, number>> = {};
  for (const id of ids) {
    const relic = getRelicById(id);
    if (!relic) continue;
    counts[relic.setId] = (counts[relic.setId] ?? 0) + 1;
  }

  const active: RelicSynergyDefinition[] = [];
  (['fire', 'shadow', 'tempest'] as RelicSetId[]).forEach((setId) => {
    if ((counts[setId] ?? 0) >= 2) {
      active.push(RELIC_SETS[setId]);
    }
  });
  return active;
}

export function getActiveRelicSynergy(
  ids: RelicId[] = getEquippedRelicIds()
): RelicSynergyDefinition | null {
  return getActiveRelicSynergies(ids)[0] ?? null;
}

export function unlockRelic(id: RelicId): {
  success: boolean;
  newCoins: number;
  unlockedRelics: RelicId[];
  equippedRelicIds: RelicId[];
} {
  const relic = getRelicById(id);
  const currentCoins = getSavedCoins();
  const currentUnlocked = getUnlockedRelicIds();
  const currentEquipped = getEquippedRelicIds();

  if (!relic || currentUnlocked.includes(id) || currentCoins < relic.cost) {
    return {
      success: false,
      newCoins: currentCoins,
      unlockedRelics: currentUnlocked,
      equippedRelicIds: currentEquipped,
    };
  }

  const newCoins = currentCoins - relic.cost;
  saveCoins(newCoins);

  const updated = saveDataStore.update((draft) => {
    if (!draft.unlockedRelics.includes(id)) {
      draft.unlockedRelics.push(id);
    }
    if (!draft.equippedRelicIds.includes(id)) {
      if (draft.equippedRelicIds.length < draft.maxRelicSlots) {
        draft.equippedRelicIds = [...draft.equippedRelicIds, id];
      } else {
        draft.equippedRelicIds = [...draft.equippedRelicIds.slice(1), id];
      }
    }
  });

  notifyRelics();

  return {
    success: true,
    newCoins,
    unlockedRelics: updated.unlockedRelics,
    equippedRelicIds: updated.equippedRelicIds,
  };
}

export function toggleEquipRelic(id: RelicId): {
  equippedRelicIds: RelicId[];
  wasEquipped: boolean;
} {
  let wasEquipped = false;
  const updated = saveDataStore.update((draft) => {
    if (!draft.unlockedRelics.includes(id)) return;
    if (draft.equippedRelicIds.includes(id)) {
      draft.equippedRelicIds = draft.equippedRelicIds.filter((item) => item !== id);
      wasEquipped = false;
    } else if (draft.equippedRelicIds.length < draft.maxRelicSlots) {
      draft.equippedRelicIds = [...draft.equippedRelicIds, id];
      wasEquipped = true;
    } else {
      draft.equippedRelicIds = [...draft.equippedRelicIds.slice(1), id];
      wasEquipped = true;
    }
  });

  notifyRelics();
  return {
    equippedRelicIds: updated.equippedRelicIds,
    wasEquipped,
  };
}

export function unequipRelic(id: RelicId): RelicId[] {
  const updated = saveDataStore.update((draft) => {
    draft.equippedRelicIds = draft.equippedRelicIds.filter((item) => item !== id);
  });
  notifyRelics();
  return updated.equippedRelicIds;
}

export function subscribeRelics(listener: RelicsListener): () => void {
  relicListeners.add(listener);
  return () => {
    relicListeners.delete(listener);
  };
}
