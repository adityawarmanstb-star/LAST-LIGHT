import { MetaUpgrade, PlayerStats, RelicId, RelicSetId } from './types';
import { saveDataStore } from './saveData';
import {
  UNLIMITED_CURRENCY,
  isDeveloperMode,
  subscribeDeveloperMode,
} from './developerMode';

const RELIC_SET_BY_ID: Record<RelicId, RelicSetId> = {
  lodestone_heart: 'tempest',
  twin_zephyr: 'tempest',
  blood_chalice: 'shadow',
  executioner_seal: 'shadow',
  sunforged_lens: 'fire',
  iron_spurs: 'fire',
};

export const INITIAL_UPGRADES: MetaUpgrade[] = [
  {
    id: 'lantern',
    name: 'Lantern Brightness',
    description: 'Expands your lantern light radius and attack range in the dark by 10% per rank.',
    cost: [300, 800, 1800, 3600, 6500],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+10% Light & Range',
    icon: 'sun',
  },
  {
    id: 'vitality',
    name: 'Soul Vitality',
    description: 'Increases maximum health by 15% per rank.',
    cost: [350, 900, 2000, 4000, 7200],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+15% Max HP',
    icon: 'heart',
  },
  {
    id: 'might',
    name: 'Lantern Flare',
    description: 'Empowers all magic weapons to deal 10% more damage.',
    cost: [450, 1100, 2500, 5000, 8500],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+10% Damage',
    icon: 'sword',
  },
  {
    id: 'swiftness',
    name: 'Zephyr Steps',
    description: 'Enhances movement speed by 6% per rank.',
    cost: [250, 700, 1600, 3200, 5800],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+6% Move Speed',
    icon: 'wind',
  },
  {
    id: 'magnet',
    name: 'Soul Attractor',
    description: 'Expands the magnetic pull of your lantern for XP and coins.',
    cost: [250, 650, 1500, 3000, 5500],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+25% Pickup Range',
    icon: 'sparkles',
  },
  {
    id: 'cooldown',
    name: 'Rapid Incantation',
    description: 'Accelerates the fire rate of all active weapons by 6%.',
    cost: [500, 1250, 2800, 5500, 9500],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '-6% Cooldown',
    icon: 'zap',
  },
  {
    id: 'greed',
    name: 'Soul Hunter',
    description: 'Increases the likelihood of foes yielding precious Soul Coins.',
    cost: [400, 1000, 2200, 4500, 8000],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+20% Coin Gain',
    icon: 'coins',
  },
  {
    id: 'revive',
    name: 'Undying Ember',
    description: 'Defy death once per expedition, returning with 50% health.',
    cost: [6500],
    currentRank: 0,
    maxRank: 1,
    statPerRank: '1 Holy Resurrection',
    icon: 'shield',
  },
];

type CoinsListener = (coins: number) => void;
let coinsListeners: CoinsListener[] = [];

export function subscribeCoins(cb: CoinsListener): () => void {
  coinsListeners.push(cb);
  return () => {
    coinsListeners = coinsListeners.filter((l) => l !== cb);
  };
}

export function getSavedCoins(): number {
  if (isDeveloperMode()) return UNLIMITED_CURRENCY;
  return saveDataStore.read().coins;
}

export function saveCoins(coins: number): void {
  if (isDeveloperMode()) {
    coinsListeners.forEach((l) => l(UNLIMITED_CURRENCY));
    return;
  }
  const safe = Number.isFinite(coins) && coins >= 0 ? Math.floor(coins) : 0;
  const updated = saveDataStore.update((draft) => {
    draft.coins = safe;
  });
  coinsListeners.forEach((l) => l(updated.coins));
}

export function addCoins(amount: number): number {
  if (isDeveloperMode()) {
    coinsListeners.forEach((l) => l(UNLIMITED_CURRENCY));
    return UNLIMITED_CURRENCY;
  }
  const safeDelta = Number.isFinite(amount) ? Math.floor(amount) : 0;
  const updated = Math.max(0, getSavedCoins() + safeDelta);
  saveCoins(updated);
  return updated;
}

subscribeDeveloperMode(() => {
  const current = getSavedCoins();
  coinsListeners.forEach((l) => l(current));
});

export function getSavedUpgrades(): MetaUpgrade[] {
  const saved = saveDataStore.read().upgrades;
  return INITIAL_UPGRADES.map((u) => ({
    ...u,
    currentRank:
      saved[u.id] !== undefined ? Math.max(0, Math.min(saved[u.id], u.maxRank)) : 0,
  }));
}

export function saveUpgrades(upgrades: MetaUpgrade[]): void {
  saveDataStore.update((draft) => {
    const record: Record<string, number> = {};
    upgrades.forEach((u) => {
      record[u.id] = u.currentRank;
    });
    draft.upgrades = record;
  });
}

export function purchaseUpgrade(upgradeId: string): { success: boolean; newCoins: number; upgrades: MetaUpgrade[] } {
  const coins = getSavedCoins();
  const upgrades = getSavedUpgrades();
  const target = upgrades.find((u) => u.id === upgradeId);

  if (!target || target.currentRank >= target.maxRank) {
    return { success: false, newCoins: coins, upgrades };
  }

  const cost = target.cost[target.currentRank];
  const devMode = isDeveloperMode();
  if (!devMode && coins < cost) {
    return { success: false, newCoins: coins, upgrades };
  }

  const newCoins = devMode ? UNLIMITED_CURRENCY : coins - cost;
  target.currentRank += 1;
  if (!devMode) {
    saveCoins(newCoins);
  }
  saveUpgrades(upgrades);

  return { success: true, newCoins, upgrades };
}

export function calculateBasePlayerStats(): PlayerStats {
  const saved = saveDataStore.read();
  const upgrades = getSavedUpgrades();
  const rankMap = new Map<string, number>();
  upgrades.forEach((u) => rankMap.set(u.id, u.currentRank));

  const vitRank = rankMap.get('vitality') || 0;
  const lanternRank = rankMap.get('lantern') || 0;
  const mightRank = rankMap.get('might') || 0;
  const swiftRank = rankMap.get('swiftness') || 0;
  const magnetRank = rankMap.get('magnet') || 0;
  const cdRank = rankMap.get('cooldown') || 0;
  const greedRank = rankMap.get('greed') || 0;
  const reviveRank = rankMap.get('revive') || 0;

  let baseHp = 100 * (1 + vitRank * 0.15);
  let moveSpeed = 160 * (1 + swiftRank * 0.06);
  let damageMultiplier = 1 + mightRank * 0.1;
  let cooldownMultiplier = Math.max(0.4, 1 - cdRank * 0.06);
  let magnetRadius = 90 * (1 + magnetRank * 0.25);
  const coinMultiplier = 1 + greedRank * 0.2;
  let critChance = 0.05;
  let critMultiplier = 1.5;
  let projectilePierce = 1;
  const hasRevive = reviveRank > 0;
  let dashCharges = 1;
  let dashCooldownMs = 3000;
  let lightRadiusMultiplier = 1 + lanternRank * 0.1;
  let eliteKillHeal = 0;

  const equippedRelicIds = [...saved.equippedRelicIds];
  const setCounts: Partial<Record<RelicSetId, number>> = {};

  for (const relicId of equippedRelicIds) {
    const setId = RELIC_SET_BY_ID[relicId];
    if (setId) {
      setCounts[setId] = (setCounts[setId] ?? 0) + 1;
    }

    switch (relicId) {
      case 'lodestone_heart':
        magnetRadius *= 1.85;
        break;
      case 'twin_zephyr':
        dashCharges = Math.max(dashCharges, 2);
        dashCooldownMs = Math.min(dashCooldownMs, 2600);
        break;
      case 'blood_chalice':
        baseHp *= 1.2;
        eliteKillHeal += 15;
        break;
      case 'sunforged_lens':
        lightRadiusMultiplier += 0.25;
        critChance += 0.12;
        break;
      case 'iron_spurs':
        moveSpeed *= 1.15;
        cooldownMultiplier = Math.max(0.35, cooldownMultiplier - 0.12);
        break;
      case 'executioner_seal':
        damageMultiplier += 0.25;
        projectilePierce += 1;
        baseHp = Math.max(40, baseHp * 0.9);
        break;
      default:
        break;
    }
  }

  const activeRelicSynergies: RelicSetId[] = [];
  if ((setCounts.fire ?? 0) >= 2) {
    activeRelicSynergies.push('fire');
    damageMultiplier += 0.15;
    lightRadiusMultiplier += 0.15;
  }
  if ((setCounts.shadow ?? 0) >= 2) {
    activeRelicSynergies.push('shadow');
    critMultiplier += 0.35;
    critChance += 0.08;
  }
  if ((setCounts.tempest ?? 0) >= 2) {
    activeRelicSynergies.push('tempest');
    dashCooldownMs = Math.round(dashCooldownMs * 0.85);
    moveSpeed *= 1.1;
  }

  return {
    maxHp: Math.round(baseHp),
    currentHp: Math.round(baseHp),
    moveSpeed: Math.round(moveSpeed),
    damageMultiplier,
    cooldownMultiplier,
    magnetRadius: Math.round(magnetRadius),
    coinMultiplier,
    critChance,
    critMultiplier,
    projectilePierce,
    hasRevive,
    usedRevive: false,
    dashCharges,
    dashCooldownMs,
    lightRadiusMultiplier,
    eliteKillHeal,
    equippedRelicIds,
    activeRelicSynergies,
  };
}
