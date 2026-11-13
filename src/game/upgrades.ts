import { UpgradeOption, WeaponState } from './types';

export interface UpgradePoolConfig {
  multishotMaxLevel: number;
  multishotDamagePenaltyPerLevel: number;
  cardCount: number;
  minWeaponOrUpgradeCards: number;
  brighterLanternMaxLevel?: number;
  brighterLanternBonusPerLevel?: number;
}

export interface LightUpgradeState {
  brighterLanternLevel: number;
  hasLightBurst: boolean;
  hasNightEyes: boolean;
}

const DEFAULT_POOL_CONFIG: UpgradePoolConfig = {
  multishotMaxLevel: 4,
  multishotDamagePenaltyPerLevel: 0.06,
  cardCount: 3,
  minWeaponOrUpgradeCards: 1,
  brighterLanternMaxLevel: 4,
  brighterLanternBonusPerLevel: 0.12,
};

export function getAvailableUpgrades(
  weapons: Record<string, WeaponState>,
  _level: number,
  multishotLevel: number = 0,
  config: UpgradePoolConfig = DEFAULT_POOL_CONFIG,
  lightState: LightUpgradeState = {
    brighterLanternLevel: 0,
    hasLightBurst: false,
    hasNightEyes: false,
  }
): UpgradeOption[] {
  const pool: UpgradeOption[] = [];

  // Multishot Upgrade (+1 projectile per level up to maxLevel, -6% damage per projectile per level)
  if (multishotLevel < config.multishotMaxLevel) {
    const nextLevel = multishotLevel + 1;
    const penaltyPct = Math.round(config.multishotDamagePenaltyPerLevel * 100);
    pool.push({
      id: 'multishot',
      weaponId: 'bolt',
      title: 'Multishot',
      description: `+1 projectile per shot (total ${1 + nextLevel}), -${penaltyPct}% damage per projectile, wider spread.`,
      category: 'weapon_upgrade',
      icon: 'bolt',
      levelText: `Lv. ${nextLevel}/${config.multishotMaxLevel}`,
      rarity: 'rare',
    });
  }

  // Weapon: Light Bolt (always unlocked)
  const bolt = weapons['bolt'];
  if (bolt && bolt.level < bolt.maxLevel) {
    pool.push({
      id: 'bolt_damage',
      weaponId: 'bolt',
      title: 'Luminescent Might',
      description: 'Empowers Light Bolts with +25% damage.',
      category: 'weapon_upgrade',
      icon: 'bolt',
      levelText: `Lv. ${bolt.level + 1}`,
      rarity: 'common',
    });
    pool.push({
      id: 'bolt_cooldown',
      weaponId: 'bolt',
      title: 'Rapid Volley',
      description: 'Reduces Light Bolt cast delay by 25%.',
      category: 'weapon_upgrade',
      icon: 'bolt',
      levelText: `Lv. ${bolt.level + 1}`,
      rarity: 'common',
    });
    if (bolt.level >= 2) {
      pool.push({
        id: 'bolt_overcharge',
        weaponId: 'bolt',
        title: 'Solar Core',
        description: 'Light Bolts pierce +1 additional enemy with +30% damage.',
        category: 'weapon_upgrade',
        icon: 'bolt',
        levelText: `Lv. ${bolt.level + 1}`,
        rarity: 'epic',
      });
    }
  }

  // Weapon: Spectral Blades
  const blades = weapons['blades'];
  if (blades) {
    if (!blades.unlocked) {
      pool.push({
        id: 'blades_unlock',
        weaponId: 'blades',
        title: 'Spectral Blade',
        description: 'Conjure an ethereal spinning blade that circles your lantern and slashes foes.',
        category: 'weapon_unlock',
        icon: 'blade',
        levelText: 'New Weapon',
        rarity: 'rare',
      });
    } else if (blades.level < blades.maxLevel) {
      pool.push({
        id: 'blades_extra',
        weaponId: 'blades',
        title: 'Revolving Edge',
        description: 'Adds +1 orbiting blade and increases rotational speed.',
        category: 'weapon_upgrade',
        icon: 'blade',
        levelText: `Lv. ${blades.level + 1}`,
        rarity: 'rare',
      });
      pool.push({
        id: 'blades_damage',
        weaponId: 'blades',
        title: 'Phantom Sharpness',
        description: 'Increases blade damage by 30% and hit knockback.',
        category: 'weapon_upgrade',
        icon: 'blade',
        levelText: `Lv. ${blades.level + 1}`,
        rarity: 'common',
      });
    }
  }

  // Weapon: Radiant Ring
  const ring = weapons['ring'];
  if (ring) {
    if (!ring.unlocked) {
      pool.push({
        id: 'ring_unlock',
        weaponId: 'ring',
        title: 'Radiant Nova',
        description: 'Release periodic holy shockwaves that expand outward, damaging and knocking back all surrounding monsters.',
        category: 'weapon_unlock',
        icon: 'ring',
        levelText: 'New Weapon',
        rarity: 'rare',
      });
    } else if (ring.level < ring.maxLevel) {
      pool.push({
        id: 'ring_area',
        weaponId: 'ring',
        title: 'Expanding Horizon',
        description: 'Expands shockwave blast radius by 35% and increases pushback.',
        category: 'weapon_upgrade',
        icon: 'ring',
        levelText: `Lv. ${ring.level + 1}`,
        rarity: 'common',
      });
      pool.push({
        id: 'ring_cooldown',
        weaponId: 'ring',
        title: 'Holy Resonance',
        description: 'Shockwave pulses 25% faster with +20% damage.',
        category: 'weapon_upgrade',
        icon: 'ring',
        levelText: `Lv. ${ring.level + 1}`,
        rarity: 'rare',
      });
    }
  }

  // Weapon: Spark Burst
  const spark = weapons['spark'];
  if (spark) {
    if (!spark.unlocked) {
      pool.push({
        id: 'spark_unlock',
        weaponId: 'spark',
        title: 'Celestial Sparks',
        description: 'Unleash violent directional bursts of astral sparks with high piercing power.',
        category: 'weapon_unlock',
        icon: 'spark',
        levelText: 'New Weapon',
        rarity: 'rare',
      });
    } else if (spark.level < spark.maxLevel) {
      pool.push({
        id: 'spark_count',
        weaponId: 'spark',
        title: 'Cluster Eruption',
        description: 'Adds +3 sparks to each burst and increases burst frequency.',
        category: 'weapon_upgrade',
        icon: 'spark',
        levelText: `Lv. ${spark.level + 1}`,
        rarity: 'common',
      });
      pool.push({
        id: 'spark_pierce',
        weaponId: 'spark',
        title: 'Supernova Charge',
        description: 'Sparks gain +1 pierce and explode into mini-shards on hit.',
        category: 'weapon_upgrade',
        icon: 'spark',
        levelText: `Lv. ${spark.level + 1}`,
        rarity: 'epic',
      });
    }
  }

  // Weapon: Radiant Scatter (Shotgun)
  const shotgun = weapons['shotgun'];
  if (shotgun) {
    if (!shotgun.unlocked) {
      pool.push({
        id: 'shotgun_unlock',
        weaponId: 'shotgun',
        title: 'Radiant Scatter',
        description: 'Unleash a spread of cyan arcane bolts blasting enemies in front.',
        category: 'weapon_unlock',
        icon: 'spark',
        levelText: 'New Weapon',
        rarity: 'rare',
      });
    } else if (shotgun.level < shotgun.maxLevel) {
      pool.push({
        id: 'shotgun_damage',
        weaponId: 'shotgun',
        title: 'Solar Barrage',
        description: 'Increases scatter range by +35px and damage by 25%.',
        category: 'weapon_upgrade',
        icon: 'spark',
        levelText: `Lv. ${shotgun.level + 1}`,
        rarity: 'rare',
      });
      pool.push({
        id: 'shotgun_cooldown',
        weaponId: 'shotgun',
        title: 'Quick Cocking',
        description: 'Scatter reloads and fires 20% faster.',
        category: 'weapon_upgrade',
        icon: 'spark',
        levelText: `Lv. ${shotgun.level + 1}`,
        rarity: 'common',
      });
    }
  }

  // General Stat Passives
  pool.push({
    id: 'stat_vitality',
    title: 'Blessed Vigor',
    description: 'Increases Max HP by 25 and restores 35 Health immediately.',
    category: 'stat_upgrade',
    icon: 'heart',
    levelText: 'Passive',
    rarity: 'common',
  });

  pool.push({
    id: 'stat_speed',
    title: 'Wings of Dawn',
    description: 'Increases movement speed by 12%.',
    category: 'stat_upgrade',
    icon: 'wind',
    levelText: 'Passive',
    rarity: 'common',
  });

  pool.push({
    id: 'stat_might',
    title: 'Inner Radiance',
    description: 'Increases all weapon damage by 15%.',
    category: 'stat_upgrade',
    icon: 'sword',
    levelText: 'Passive',
    rarity: 'common',
  });

  pool.push({
    id: 'stat_magnet',
    title: 'Soul Vortex',
    description: 'Increases gem and coin pickup radius by 40%.',
    category: 'stat_upgrade',
    icon: 'magnet',
    levelText: 'Passive',
    rarity: 'common',
  });

  pool.push({
    id: 'stat_cooldown',
    title: 'Chronos Grace',
    description: 'Reduces cooldowns across all weapons by 10%.',
    category: 'stat_upgrade',
    icon: 'zap',
    levelText: 'Passive',
    rarity: 'rare',
  });

  pool.push({
    id: 'stat_crit',
    title: 'Astral Eye',
    description: '+12% Critical Hit Chance and +30% Critical Damage.',
    category: 'stat_upgrade',
    icon: 'crosshair',
    levelText: 'Passive',
    rarity: 'rare',
  });

  // Light Progression Upgrades
  const lanternMax = config.brighterLanternMaxLevel ?? 4;
  const lanternBonusPct = Math.round((config.brighterLanternBonusPerLevel ?? 0.12) * 100);
  if (lightState.brighterLanternLevel < lanternMax) {
    const nextLv = lightState.brighterLanternLevel + 1;
    pool.push({
      id: 'light_lantern',
      title: 'Brighter Lantern',
      description: `Expands your lantern light radius by +${lanternBonusPct}% to reveal more of the dark.`,
      category: 'stat_upgrade',
      icon: 'lantern',
      levelText: `Lv. ${nextLv}/${lanternMax}`,
      rarity: 'rare',
    });
  }

  if (!lightState.hasLightBurst) {
    pool.push({
      id: 'light_burst',
      title: 'Light Burst',
      description: 'Your level-up light pulse also damages and knocks back enemies it touches.',
      category: 'weapon_upgrade',
      icon: 'sun',
      levelText: 'Light Relic',
      rarity: 'epic',
    });
  }

  if (!lightState.hasNightEyes) {
    pool.push({
      id: 'light_night_eyes',
      title: 'Night Eyes',
      description: 'Enemies lurking in the dark reveal their glowing eyes from much farther away.',
      category: 'stat_upgrade',
      icon: 'eye',
      levelText: 'Passive',
      rarity: 'rare',
    });
  }

  const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

  const weaponOrUpgradePool = shuffle(
    pool.filter((u) => u.category === 'weapon_unlock' || u.category === 'weapon_upgrade')
  );
  const statPool = pool.filter((u) => u.category === 'stat_upgrade');

  const picked: UpgradeOption[] = [];
  const guaranteedCount = Math.min(
    config.minWeaponOrUpgradeCards,
    weaponOrUpgradePool.length,
    config.cardCount
  );

  for (let i = 0; i < guaranteedCount; i++) {
    picked.push(weaponOrUpgradePool[i]);
  }

  const remainingPool = shuffle([...weaponOrUpgradePool.slice(guaranteedCount), ...statPool]);
  for (const item of remainingPool) {
    if (picked.length >= config.cardCount) break;
    picked.push(item);
  }

  return shuffle(picked);
}
