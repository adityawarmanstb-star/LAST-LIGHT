import { getTodayDateKey } from './dailyMissions';
import { addCoins, getSavedCoins } from './metaProgression';
import { addRelicSeals, getRelicSeals } from './relics';
import { saveDataStore } from './saveData';

export interface DailyShopDeal {
  id: string;
  title: string;
  subtitle: string;
  rewardLabel: string;
  currency: 'coins' | 'gems';
  cost: number;
  originalCost?: number;
  discountBadge?: string;
  purchased: boolean;
  icon: 'gem' | 'coins' | 'flame';
}

function hashSeed(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyShopDeals(): DailyShopDeal[] {
  const today = getTodayDateKey();
  const saved = saveDataStore.read();
  const boughtSet = new Set(
    saved.dailyDealsClaimed?.dateKey === today ? saved.dailyDealsClaimed.boughtIds : []
  );

  const seed = hashSeed(`last-light-deals:${today}`);
  const variant = seed % 3;

  const deal1CoinsCost = variant === 0 ? 45 : variant === 1 ? 40 : 50;
  const deal2CoinsReward = variant === 0 ? 90 : variant === 1 ? 105 : 85;
  const deal3CoinsReward = variant === 0 ? 150 : variant === 1 ? 165 : 140;
  const deal3GemsCost = 2;

  return [
    {
      id: `${today}_blood_seal`,
      title: 'Crimson Seal',
      subtitle: 'Rare gem cache for Relic slots',
      rewardLabel: '+1 Gem',
      currency: 'coins',
      cost: deal1CoinsCost,
      originalCost: 65,
      discountBadge: '-30%',
      purchased: boughtSet.has(`${today}_blood_seal`),
      icon: 'gem',
    },
    {
      id: `${today}_ash_hoard`,
      title: 'Ashfen Hoard',
      subtitle: 'Smelted Soul Coins pouch',
      rewardLabel: `+${deal2CoinsReward} Coins`,
      currency: 'gems',
      cost: 1,
      purchased: boughtSet.has(`${today}_ash_hoard`),
      icon: 'coins',
    },
    {
      id: `${today}_warden_tribute`,
      title: 'Iron Vault',
      subtitle: 'Heavy warchest of Soul Coins',
      rewardLabel: `+${deal3CoinsReward} Coins · +1 Gem`,
      currency: 'gems',
      cost: deal3GemsCost,
      originalCost: 3,
      discountBadge: 'BEST',
      purchased: boughtSet.has(`${today}_warden_tribute`),
      icon: 'flame',
    },
  ];
}

export function purchaseDailyShopDeal(dealId: string): {
  success: boolean;
  newCoins: number;
  newGems: number;
  deals: DailyShopDeal[];
} {
  const today = getTodayDateKey();
  const deals = getDailyShopDeals();
  const deal = deals.find((d) => d.id === dealId);

  if (!deal || deal.purchased) {
    return {
      success: false,
      newCoins: getSavedCoins(),
      newGems: getRelicSeals(),
      deals,
    };
  }

  const currentCoins = getSavedCoins();
  const currentGems = getRelicSeals();

  if (deal.currency === 'coins' && currentCoins < deal.cost) {
    return { success: false, newCoins: currentCoins, newGems: currentGems, deals };
  }
  if (deal.currency === 'gems' && currentGems < deal.cost) {
    return { success: false, newCoins: currentCoins, newGems: currentGems, deals };
  }

  // Deduct cost
  if (deal.currency === 'coins') {
    addCoins(-deal.cost);
  } else {
    addRelicSeals(-deal.cost);
  }

  // Grant reward
  if (deal.id.endsWith('_blood_seal')) {
    addRelicSeals(1);
  } else if (deal.id.endsWith('_ash_hoard')) {
    const match = deal.rewardLabel.match(/\+(\d+)/);
    addCoins(match ? Number(match[1]) : 90);
  } else if (deal.id.endsWith('_warden_tribute')) {
    const match = deal.rewardLabel.match(/\+(\d+)/);
    addCoins(match ? Number(match[1]) : 150);
    addRelicSeals(1);
  }

  saveDataStore.update((draft) => {
    const existing =
      draft.dailyDealsClaimed?.dateKey === today ? draft.dailyDealsClaimed.boughtIds : [];
    const nextIds = Array.from(new Set([...existing, deal.id]));
    draft.dailyDealsClaimed = {
      dateKey: today,
      boughtIds: nextIds,
    };
  });

  return {
    success: true,
    newCoins: getSavedCoins(),
    newGems: getRelicSeals(),
    deals: getDailyShopDeals(),
  };
}
