import { RelicSetId } from './types';

export type ArcaneWeaponId = 'bolt' | 'blades' | 'ring' | 'spark' | 'shotgun';

export interface ArcaneWeaponMeta {
  id: ArcaneWeaponId;
  name: string;
  iconId: string;
  element: string;
  baseMechanic: string;
  accentColor: string;
}

export interface ElementalSynergySpec {
  id: string;
  weaponId: ArcaneWeaponId;
  setId: RelicSetId;
  comboName: string;
  elementalFusion: string;
  interactionSummary: string;
  statEffects: string[];
  primaryColor: string;
  secondaryColor: string;
  auraColor: string;
  isRecommended?: boolean;
}

export const ARCANE_WEAPONS: ArcaneWeaponMeta[] = [
  {
    id: 'bolt',
    name: 'Light Bolt',
    iconId: 'bolt',
    element: 'Luminescence',
    baseMechanic: 'Auto-targets nearest foes up to Lantern radius; scales with Multishot & Pierce.',
    accentColor: '#5de4ff',
  },
  {
    id: 'blades',
    name: 'Spectral Blades',
    iconId: 'blades',
    element: 'Astral Steel',
    baseMechanic: 'Orbiting blades circle at Lantern perimeter, slashing continuously even while moving.',
    accentColor: '#38bdf8',
  },
  {
    id: 'ring',
    name: 'Radiant Nova',
    iconId: 'ring',
    element: 'Holy Pulse',
    baseMechanic: 'Periodic shockwave expands outward to your full Lantern edge with knockback.',
    accentColor: '#7df3ff',
  },
  {
    id: 'spark',
    name: 'Celestial Sparks',
    iconId: 'spark',
    element: 'Astral Spark',
    baseMechanic: 'Radial 360-degree spark eruption with innate pierce across your illuminated zone.',
    accentColor: '#34f5ae',
  },
  {
    id: 'shotgun',
    name: 'Radiant Scatter',
    iconId: 'shotgun',
    element: 'Solar Scatter',
    baseMechanic: 'Fires a focused 3-bolt fan with bonus +1 pierce for dense front-line waves.',
    accentColor: '#ffd54f',
  },
];

export const RELIC_SET_INTERACTION_GUIDE: Record<
  RelicSetId,
  {
    elementLabel: string;
    coreRule: string;
    recommendedWeapons: ArcaneWeaponId[];
    previewPrimaryWeapon: ArcaneWeaponId;
  }
> = {
  fire: {
    elementLabel: 'Solar Flame · Range & Tempo',
    coreRule:
      'All five arcane weapons cap their targeting, explosion, and orbit radius to your Lantern Light. Stacking Sunforged Lens (+25% Light) with Solar Ignition (+15% Light, +15% Damage) and Quicksilver Spurs (-12% Cooldowns) stretches every weapon far into the dark.',
    recommendedWeapons: ['ring', 'bolt', 'shotgun'],
    previewPrimaryWeapon: 'ring',
  },
  shadow: {
    elementLabel: 'Blood Shadow · Pierce & Crit',
    coreRule:
      "Executioner's Seal (+25% Damage, +1 Pierce) paired with Umbral Pact (+35% Crit Damage, +8% Crit Chance) turns projectile weapons into armor-piercing lances, while Crimson Chalice restores +15 HP per Elite or Boss kill to offset the -10% Max HP pact.",
    recommendedWeapons: ['shotgun', 'bolt', 'spark'],
    previewPrimaryWeapon: 'shotgun',
  },
  tempest: {
    elementLabel: 'Storm Gale · Orbit & Velocity',
    coreRule:
      'Twin-Wind Feather (2 Dash charges) combined with Eye of the Storm (-15% Dash Cooldown, +10% Move Speed) lets you weave through encirclements so Spectral Blades and radial Sparks shred crowds while Lodestone Heart vacuums XP mid-dash.',
    recommendedWeapons: ['blades', 'spark', 'ring'],
    previewPrimaryWeapon: 'blades',
  },
};

export const ELEMENTAL_SYNERGIES: ElementalSynergySpec[] = [
  // FIRE SET (Solar Ignition)
  {
    id: 'bolt-fire',
    weaponId: 'bolt',
    setId: 'fire',
    comboName: 'Solar Flare Volley',
    elementalFusion: 'Luminescence + Solar Flame',
    interactionSummary:
      'Expanded Lantern range (+40% total with Lens + Set) locks onto Spitters before they cast, while -12% cooldown and +12% crit turn Multishot bolts into rapid searing beams.',
    statEffects: ['+40% Bolt Range', '+15% Damage', '-12% Cast Delay'],
    primaryColor: '#ff944d',
    secondaryColor: '#5de4ff',
    auraColor: 'rgba(255, 122, 51, 0.34)',
  },
  {
    id: 'blades-fire',
    weaponId: 'blades',
    setId: 'fire',
    comboName: 'Blazing Orbit',
    elementalFusion: 'Astral Steel + Solar Flame',
    interactionSummary:
      'Wider Lantern radius pushes your orbiting blades into a larger defensive perimeter, carving incoming Imps earlier while +15% Move Speed helps reposition the ring cleanly.',
    statEffects: ['+40% Orbit Reach', '+15% Blade Damage', '+15% Move Speed'],
    primaryColor: '#ff7a33',
    secondaryColor: '#38bdf8',
    auraColor: 'rgba(255, 136, 61, 0.32)',
  },
  {
    id: 'ring-fire',
    weaponId: 'ring',
    setId: 'fire',
    comboName: 'Sunburst Nova',
    elementalFusion: 'Holy Pulse + Solar Flame',
    interactionSummary:
      'Radiant Nova expands directly to your Lantern radius. Combining Sunforged Lens, Quicksilver Spurs, and Solar Ignition produces massive screen-clearing golden shockwaves.',
    statEffects: ['+40% Nova Radius', '+15% Pulse Damage', '-12% Wave Cooldown'],
    primaryColor: '#ffb347',
    secondaryColor: '#7df3ff',
    auraColor: 'rgba(242, 169, 59, 0.38)',
    isRecommended: true,
  },
  {
    id: 'spark-fire',
    weaponId: 'spark',
    setId: 'fire',
    comboName: 'Supernova Eruption',
    elementalFusion: 'Astral Spark + Solar Flame',
    interactionSummary:
      'Sparks travel farther across the widened light cone before fading and cycle 12% faster, bathing distant hordes in overlapping solar-gold shrapnel.',
    statEffects: ['+40% Spark Travel', '+15% Burst Damage', '+12% Crit Chance'],
    primaryColor: '#fde047',
    secondaryColor: '#ff7a33',
    auraColor: 'rgba(253, 224, 71, 0.32)',
  },
  {
    id: 'shotgun-fire',
    weaponId: 'shotgun',
    setId: 'fire',
    comboName: 'Hellfire Scatter',
    elementalFusion: 'Solar Scatter + Solar Flame',
    interactionSummary:
      'Turns the close-range 3-bolt fan into a mid-range flaming salvo with faster reload cadence and elevated critical burst.',
    statEffects: ['+40% Cone Reach', '-12% Reload Delay', '+15% Volley Damage'],
    primaryColor: '#ff8a3d',
    secondaryColor: '#ffd54f',
    auraColor: 'rgba(255, 122, 51, 0.36)',
  },

  // SHADOW SET (Umbral Pact)
  {
    id: 'bolt-shadow',
    weaponId: 'bolt',
    setId: 'shadow',
    comboName: 'Crimson Lance',
    elementalFusion: 'Luminescence + Blood Shadow',
    interactionSummary:
      "Executioner's Seal adds +1 Pierce and +25% Damage to every bolt, while Umbral Pact (+35% Crit Dmg, +8% Crit) lets Multishot punches trigger chained crimson critical hits.",
    statEffects: ['+1 Pierce', '+25% Base Damage', '+35% Crit Damage'],
    primaryColor: '#e5303a',
    secondaryColor: '#a855f7',
    auraColor: 'rgba(229, 48, 58, 0.34)',
  },
  {
    id: 'blades-shadow',
    weaponId: 'blades',
    setId: 'shadow',
    comboName: 'Bloodreaper Scythes',
    elementalFusion: 'Astral Steel + Blood Shadow',
    interactionSummary:
      'Each orbiting blade slash gains +25% raw damage to shred armored Brutes and Elites, triggering Crimson Chalice (+15 HP) healing on every Elite takedown.',
    statEffects: ['+25% Slash Damage', '+15 HP / Elite Kill', '+20% Base HP Buffer'],
    primaryColor: '#e5303a',
    secondaryColor: '#c084fc',
    auraColor: 'rgba(179, 18, 26, 0.36)',
  },
  {
    id: 'ring-shadow',
    weaponId: 'ring',
    setId: 'shadow',
    comboName: 'Bloodmoon Shockwave',
    elementalFusion: 'Holy Pulse + Blood Shadow',
    interactionSummary:
      'Empowers your defensive pulse with +25% damage to finish weakened Elites inside your ring, sustaining HP through dense Blood Fog swarms.',
    statEffects: ['+25% Nova Damage', '+15 HP / Elite Kill', '+20% Vitality Offset'],
    primaryColor: '#ff4d6d',
    secondaryColor: '#9333ea',
    auraColor: 'rgba(229, 48, 58, 0.32)',
  },
  {
    id: 'spark-shadow',
    weaponId: 'spark',
    setId: 'shadow',
    comboName: 'Umbral Shrapnel',
    elementalFusion: 'Astral Spark + Blood Shadow',
    interactionSummary:
      'Stacks +1 Pierce onto Celestial Sparks (reaching 3 pierce at Lv.3+), cutting straight through stacked columns with amplified shadow damage.',
    statEffects: ['+1 Spark Pierce', '+25% Spark Damage', '+8% Crit Chance'],
    primaryColor: '#c084fc',
    secondaryColor: '#e5303a',
    auraColor: 'rgba(192, 132, 252, 0.34)',
  },
  {
    id: 'shotgun-shadow',
    weaponId: 'shotgun',
    setId: 'shadow',
    comboName: "Executioner's Salvo",
    elementalFusion: 'Solar Scatter + Blood Shadow',
    interactionSummary:
      'Radiant Scatter naturally adds +1 bonus pierce on top of Executioner Seal (+3 total targets pierced per shell). With Umbral Pact crit scaling, every triple blast decimates elite packs.',
    statEffects: ['3+ Total Pierce', '+25% Salvo Damage', '1.85x Crit Multiplier'],
    primaryColor: '#e5303a',
    secondaryColor: '#ffd54f',
    auraColor: 'rgba(229, 48, 58, 0.40)',
    isRecommended: true,
  },

  // TEMPEST SET (Eye of the Storm)
  {
    id: 'bolt-tempest',
    weaponId: 'bolt',
    setId: 'tempest',
    comboName: 'Tempest Bolt Storm',
    elementalFusion: 'Luminescence + Storm Gale',
    interactionSummary:
      'Double Dash and +10% Move Speed let you kite at the edge of danger, pausing briefly to fire disciplined Multishot bursts while Lodestone Heart harvests dropped XP.',
    statEffects: ['2x Dash Charges', '-15% Dash Cooldown', '+85% Gem Pull'],
    primaryColor: '#5de4ff',
    secondaryColor: '#93c5fd',
    auraColor: 'rgba(93, 228, 255, 0.32)',
  },
  {
    id: 'blades-tempest',
    weaponId: 'blades',
    setId: 'tempest',
    comboName: 'Cyclone Blades',
    elementalFusion: 'Astral Steel + Storm Gale',
    interactionSummary:
      'Spectral Blades keep spinning and dealing full contact damage even while moving or dashing. Eye of the Storm speed lets you sweep through crowds like a living whirlwind.',
    statEffects: ['Full Hit During Move', '2x Dash Weave', '+10% Orbit Sweep Speed'],
    primaryColor: '#38bdf8',
    secondaryColor: '#a5f3fc',
    auraColor: 'rgba(56, 189, 248, 0.38)',
    isRecommended: true,
  },
  {
    id: 'ring-tempest',
    weaponId: 'ring',
    setId: 'tempest',
    comboName: 'Thunderclap Ring',
    elementalFusion: 'Holy Pulse + Storm Gale',
    interactionSummary:
      'Dive directly into dense clusters using Twin-Wind Feather, trigger Radiant Nova knockback to scatter them, then dash clear and vacuum every dropped XP gem.',
    statEffects: ['Safe Dive-In Dash', '+85% Post-Blast Pull', '+10% Kite Speed'],
    primaryColor: '#7df3ff',
    secondaryColor: '#5de4ff',
    auraColor: 'rgba(125, 243, 255, 0.32)',
  },
  {
    id: 'spark-tempest',
    weaponId: 'spark',
    setId: 'tempest',
    comboName: 'Stormcaller Sparks',
    elementalFusion: 'Astral Spark + Storm Gale',
    interactionSummary:
      'Dash into the heart of a horde with invulnerability frames so all 360-degree Celestial Sparks strike nearby foes at once, maximizing multi-hit pierce value.',
    statEffects: ['Point-Blank 360 Burst', '2x Dash Escape', '+85% Pick-up Vacuum'],
    primaryColor: '#fde047',
    secondaryColor: '#5de4ff',
    auraColor: 'rgba(93, 228, 255, 0.34)',
  },
  {
    id: 'shotgun-tempest',
    weaponId: 'shotgun',
    setId: 'tempest',
    comboName: 'Gale-Force Buckshot',
    elementalFusion: 'Solar Scatter + Storm Gale',
    interactionSummary:
      'Use Twin-Wind Feather charges to line up straight enemy corridors, then pause briefly for tight 3-bolt piercing blasts before repositioning out of brute slams.',
    statEffects: ['Rapid Flank Angles', '-15% Dash Recovery', '+10% Stride Speed'],
    primaryColor: '#5de4ff',
    secondaryColor: '#ffd54f',
    auraColor: 'rgba(93, 228, 255, 0.30)',
  },
];

export function getElementalSynergy(
  weaponId: ArcaneWeaponId,
  setId: RelicSetId
): ElementalSynergySpec {
  return (
    ELEMENTAL_SYNERGIES.find((s) => s.weaponId === weaponId && s.setId === setId) ??
    ELEMENTAL_SYNERGIES[0]
  );
}
