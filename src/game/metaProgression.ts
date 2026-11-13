import { MetaUpgrade, PlayerStats } from './types';

const COINS_KEY = 'last_light_coins_v1';
const UPGRADES_KEY = 'last_light_meta_v1';

export const INITIAL_UPGRADES: MetaUpgrade[] = [
  {
    id: 'vitality',
    name: 'Enduring Vessel',
    description: 'Increases maximum health by 15% per rank.',
    cost: [25, 60, 140, 300, 600],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+15% Max HP',
    icon: 'heart',
  },
  {
    id: 'might',
    name: 'Lantern Flare',
    description: 'Empowers all magic weapons to deal 10% more damage.',
    cost: [35, 80, 180, 380, 750],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+10% Damage',
    icon: 'sword',
  },
  {
    id: 'swiftness',
    name: 'Zephyr Steps',
    description: 'Enhances movement speed by 6% per rank.',
    cost: [20, 50, 120, 250, 500],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+6% Move Speed',
    icon: 'wind',
  },
  {
    id: 'magnet',
    name: 'Soul Attractor',
    description: 'Expands the magnetic pull of your lantern for XP and coins.',
    cost: [20, 45, 100, 220, 450],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+25% Pickup Range',
    icon: 'sparkles',
  },
  {
    id: 'cooldown',
    name: 'Rapid Incantation',
    description: 'Accelerates the fire rate of all active weapons by 6%.',
    cost: [40, 95, 220, 450, 900],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '-6% Cooldown',
    icon: 'zap',
  },
  {
    id: 'greed',
    name: 'Soul Hunter',
    description: 'Increases the likelihood of foes yielding precious Soul Coins.',
    cost: [30, 70, 150, 320, 650],
    currentRank: 0,
    maxRank: 5,
    statPerRank: '+20% Coin Gain',
    icon: 'coins',
  },
  {
    id: 'revive',
    name: 'Undying Ember',
    description: 'Defy death once per expedition, returning with 50% health.',
    cost: [350],
    currentRank: 0,
    maxRank: 1,
    statPerRank: '1 Holy Resurrection',
    icon: 'shield',
  },
];

export function getSavedCoins(): number {
  try {
    const val = localStorage.getItem(COINS_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveCoins(coins: number): void {
  try {
    localStorage.setItem(COINS_KEY, String(coins));
  } catch {
    // ignore
  }
}

export function addCoins(amount: number): number {
  const current = getSavedCoins();
  const updated = current + amount;
  saveCoins(updated);
  return updated;
}

export function getSavedUpgrades(): MetaUpgrade[] {
  try {
    const val = localStorage.getItem(UPGRADES_KEY);
    if (!val) return INITIAL_UPGRADES;
    const parsed = JSON.parse(val) as Record<string, number>;
    return INITIAL_UPGRADES.map((u) => ({
      ...u,
      currentRank: parsed[u.id] !== undefined ? Math.min(parsed[u.id], u.maxRank) : 0,
    }));
  } catch {
    return INITIAL_UPGRADES;
  }
}

export function saveUpgrades(upgrades: MetaUpgrade[]): void {
  try {
    const record: Record<string, number> = {};
    upgrades.forEach((u) => {
      record[u.id] = u.currentRank;
    });
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(record));
  } catch {
    // ignore
  }
}

export function purchaseUpgrade(upgradeId: string): { success: boolean; newCoins: number; upgrades: MetaUpgrade[] } {
  const coins = getSavedCoins();
  const upgrades = getSavedUpgrades();
  const target = upgrades.find((u) => u.id === upgradeId);

  if (!target || target.currentRank >= target.maxRank) {
    return { success: false, newCoins: coins, upgrades };
  }

  const cost = target.cost[target.currentRank];
  if (coins < cost) {
    return { success: false, newCoins: coins, upgrades };
  }

  const newCoins = coins - cost;
  target.currentRank += 1;
  saveCoins(newCoins);
  saveUpgrades(upgrades);

  return { success: true, newCoins, upgrades };
}

export function calculateBasePlayerStats(): PlayerStats {
  const upgrades = getSavedUpgrades();
  const rankMap = new Map<string, number>();
  upgrades.forEach((u) => rankMap.set(u.id, u.currentRank));

  const vitRank = rankMap.get('vitality') || 0;
  const mightRank = rankMap.get('might') || 0;
  const swiftRank = rankMap.get('swiftness') || 0;
  const magnetRank = rankMap.get('magnet') || 0;
  const cdRank = rankMap.get('cooldown') || 0;
  const greedRank = rankMap.get('greed') || 0;
  const reviveRank = rankMap.get('revive') || 0;

  const baseHp = 100 * (1 + vitRank * 0.15);
  const moveSpeed = 160 * (1 + swiftRank * 0.06);
  const damageMultiplier = 1 + mightRank * 0.1;
  const cooldownMultiplier = Math.max(0.4, 1 - cdRank * 0.06);
  const magnetRadius = 90 * (1 + magnetRank * 0.25);
  const coinMultiplier = 1 + greedRank * 0.2;
  const hasRevive = reviveRank > 0;

  return {
    maxHp: Math.round(baseHp),
    currentHp: Math.round(baseHp),
    moveSpeed: Math.round(moveSpeed),
    damageMultiplier,
    cooldownMultiplier,
    magnetRadius,
    coinMultiplier,
    critChance: 0.05,
    critMultiplier: 1.5,
    projectilePierce: 1,
    hasRevive,
    usedRevive: false,
  };
}
