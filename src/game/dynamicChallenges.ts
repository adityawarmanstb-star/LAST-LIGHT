import { ActiveDynamicChallenge, DynamicChallengeOffer } from './types';

export const DYNAMIC_CHALLENGES: DynamicChallengeOffer[] = [
  {
    id: 'no_red_shards',
    title: 'Crimson Abstinence',
    description: 'Clear this run (defeat the Boss) without picking up any Red Shards.',
    constraintLabel: 'Avoid Red Shards',
    rewardCoins: 90,
    rewardBuffLabel: '+15% Damage',
    targetValue: 1,
    icon: 'shard',
  },
  {
    id: 'no_coin_greed',
    title: 'Vow of Poverty',
    description: 'Survive 60 seconds without collecting any Soul Coins.',
    constraintLabel: 'Avoid Coins (60s)',
    rewardCoins: 65,
    rewardBuffLabel: '+15% XP Gain',
    targetValue: 60,
    icon: 'coins',
  },
  {
    id: 'untouchable',
    title: 'Shadow Dancer',
    description: 'Survive 45 seconds without taking a single hit.',
    constraintLabel: 'No Damage (45s)',
    rewardCoins: 55,
    rewardBuffLabel: '+12% Move Speed',
    targetValue: 45,
    icon: 'shield',
  },
  {
    id: 'stand_firm',
    title: 'Lantern Anchor',
    description: 'Slay 25 enemies while standing still in Stance within 60 seconds.',
    constraintLabel: 'Stand-Still Kills',
    rewardCoins: 50,
    rewardBuffLabel: '-10% Cooldown',
    targetValue: 25,
    timeLimitSec: 60,
    icon: 'flame',
  },
  {
    id: 'cull_the_horde',
    title: 'Blood Tithe',
    description: 'Slay 45 enemies within 40 seconds.',
    constraintLabel: 'Timed Cull (40s)',
    rewardCoins: 55,
    rewardBuffLabel: '+10% Crit Chance',
    targetValue: 45,
    timeLimitSec: 40,
    icon: 'skull',
  },
  {
    id: 'light_purist',
    title: 'Dimmed Vigil',
    description: 'Survive 60 seconds without picking up Cyan Light Shards.',
    constraintLabel: 'Avoid Light Shards (60s)',
    rewardCoins: 60,
    rewardBuffLabel: '+25 Max HP',
    targetValue: 60,
    icon: 'sun',
  },
];

export interface DynamicChallengeContext {
  playerLevel: number;
  redShardsPicked: number;
  bossSpawned: boolean;
  completedIds: Set<string>;
}

export function pickDynamicChallengeOffer(
  ctx: DynamicChallengeContext
): DynamicChallengeOffer | null {
  const candidates = DYNAMIC_CHALLENGES.filter((challenge) => {
    if (ctx.completedIds.has(challenge.id)) return false;
    if (challenge.id === 'no_red_shards') {
      // Only offer if the player hasn't picked up a Red Shard yet this run and hasn't passed Boss #1
      return ctx.redShardsPicked === 0 && !ctx.bossSpawned;
    }
    return true;
  });

  if (candidates.length === 0) return null;

  // On first eligible offer (Level 2), give Crimson Abstinence high prominence when eligible
  if (ctx.playerLevel <= 2) {
    const abstinence = candidates.find((c) => c.id === 'no_red_shards');
    if (abstinence && Math.random() < 0.65) {
      return { ...abstinence };
    }
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  return { ...picked };
}

export function createActiveDynamicChallenge(
  offer: DynamicChallengeOffer
): ActiveDynamicChallenge {
  return {
    ...offer,
    progress: 0,
    elapsedSec: 0,
    status: 'active',
    statusNote: formatChallengeProgressText({
      ...offer,
      progress: 0,
      elapsedSec: 0,
      status: 'active',
      statusNote: '',
    }),
  };
}

export function formatChallengeProgressText(challenge: ActiveDynamicChallenge): string {
  if (challenge.status === 'completed') {
    return `Cleared · +${challenge.rewardCoins} Coins`;
  }
  if (challenge.status === 'failed') {
    return challenge.statusNote || 'Failed';
  }

  switch (challenge.id) {
    case 'no_red_shards':
      return 'Defeat Boss · 0 Red Shards';
    case 'no_coin_greed':
    case 'untouchable':
    case 'light_purist': {
      const done = Math.min(challenge.targetValue, Math.floor(challenge.elapsedSec));
      return `${done}s / ${challenge.targetValue}s`;
    }
    case 'stand_firm':
    case 'cull_the_horde': {
      const timeLeft = Math.max(
        0,
        Math.ceil((challenge.timeLimitSec ?? 60) - challenge.elapsedSec)
      );
      return `${challenge.progress}/${challenge.targetValue} Kills · ${timeLeft}s`;
    }
    default:
      return `${challenge.progress}/${challenge.targetValue}`;
  }
}
