import { saveDataStore } from './saveData';
import { BestiaryEnemyId, BestiaryEntry, BestiaryKillsMap } from './types';

export const BESTIARY_ENTRIES: BestiaryEntry[] = [
  {
    id: 'wisp',
    name: 'Shadow Wisp',
    title: 'Drifting Lantern Husk',
    threatClass: 'Swarm · Lesser',
    spriteSrc: './assets/aistudio/enemy_wisp_7d3c48f3.png',
    lore: 'Hollow remnants of travelers whose lanterns guttered out in the Ashfen. Drawn magnetically to living flame, they flock in silent tides to smother the last spark of warmth.',
    tacticalNote: 'Fragile alone, dangerous in packs. Orbiting Blades clear them cleanly.',
    accentColor: '#5de4ff',
  },
  {
    id: 'imp',
    name: 'Cinder Imp',
    title: 'Frenzied Ash-Stalker',
    threatClass: 'Rusher · Fast',
    spriteSrc: './assets/aistudio/enemy_imp_60271be1.png',
    lore: 'Twisted scavengers born inside smoldering battle trenches. They weave between heavier horrors at blistering speed, snapping at Wardens who stop moving without defensive cover.',
    tacticalNote: 'Kite diagonally or anchor inside Radiant Pulse range to thin rushes.',
    accentColor: '#f2a93b',
  },
  {
    id: 'spitter',
    name: 'Blight Spitter',
    title: 'Venomous Bog Herald',
    threatClass: 'Ranged · Artillery',
    spriteSrc: './assets/aistudio/enemy_spitter_51ce3872.png',
    lore: 'Swollen with fermented bog-bile and cursed iron filings, these stalkers linger near the edge of your lantern beam and lob searing globules to break your firing stance.',
    tacticalNote: 'Strafe perpendicular to their volleys and close the gap between shots.',
    accentColor: '#90df63',
  },
  {
    id: 'brute',
    name: 'Ironclad Brute',
    title: 'Siege-Forged Abomination',
    threatClass: 'Juggernaut · Heavy',
    spriteSrc: './assets/aistudio/enemy_brute_01eebbc9.png',
    lore: 'Fused into cracked siege-plate by the Warden-Eater cults, Brutes march relentlessly through gunfire before lowering their horned pauldrons for a crushing bull-charge.',
    tacticalNote: 'Watch for the crimson charge telegraph; bursts drop Soul Coins and Red Shards.',
    accentColor: '#e5303a',
  },
  {
    id: 'boss',
    name: 'Shadow Titan',
    title: 'Harbinger of the Long Night',
    threatClass: 'Apex Boss · Rec. Lv. 60',
    spriteSrc: './assets/aistudio/boss_a9bb7d84.png',
    lore: 'An ancient colossus forged from extinguished sun-iron and drowned souls. Below half vitality its core fractures in fury, unleashing sweeping seven-fold volleys and earth-shattering slams.',
    tacticalNote: 'Respect the shockwave slam radius and prioritize piercing high-DPS builds.',
    accentColor: '#b3121a',
  },
];

type BestiaryListener = (kills: BestiaryKillsMap) => void;

class BestiaryManager {
  private listeners: Set<BestiaryListener> = new Set();
  private pendingWrites = 0;

  public getKills(): BestiaryKillsMap {
    return saveDataStore.read().bestiaryKills;
  }

  public getKillCount(id: BestiaryEnemyId): number {
    return this.getKills()[id] ?? 0;
  }

  public getTotalKills(): number {
    const kills = this.getKills();
    return Object.values(kills).reduce((sum, count) => sum + count, 0);
  }

  public getDiscoveredCount(): number {
    const kills = this.getKills();
    return BESTIARY_ENTRIES.filter((entry) => (kills[entry.id] ?? 0) > 0).length;
  }

  public recordKill(id: BestiaryEnemyId): void {
    this.pendingWrites++;
    // Persist immediately on first discovery, on boss kill, or every 10 kills to keep 60 FPS smooth
    const current = this.getKillCount(id);
    const shouldWriteNow = current === 0 || id === 'boss' || this.pendingWrites >= 10;
    if (shouldWriteNow) {
      this.pendingWrites = 0;
    }

    const updated = saveDataStore.update((draft) => {
      draft.bestiaryKills[id] = (draft.bestiaryKills[id] ?? 0) + 1;
    }, shouldWriteNow);

    this.notify(updated.bestiaryKills);
  }

  public flush(): void {
    this.pendingWrites = 0;
    saveDataStore.flush();
  }

  public subscribe(listener: BestiaryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(kills: BestiaryKillsMap): void {
    this.listeners.forEach((listener) => listener({ ...kills }));
  }
}

export const bestiary = new BestiaryManager();
