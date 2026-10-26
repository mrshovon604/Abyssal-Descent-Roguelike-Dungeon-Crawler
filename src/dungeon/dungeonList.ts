/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DungeonThemeKey = 'catacombs' | 'sunken' | 'inferno' | 'abyss';

export interface DungeonDefinition {
  id: number;
  name: string;
  icon: string;
  description: string;
  themeKey: DungeonThemeKey;
  tier: number; // 1..5
  bossName: string;
  accent: string;
}

const CATACOMB_NAMES = [
  'Crypt of the First King',
  'Whispering Ossuary',
  'Bonehallow Vaults',
  'Sepulcher of the Damned',
  'Ossuary of Silent Screams',
  'Vault of the Pale Sovereign',
  'Charnelhouse Depths',
  'Tomb of the Wailing Choir',
  'Sarcophagus Labyrinth',
  'Mausoleum of a Thousand Cries',
  'Catacombs of the Candle King',
  'Graven Halls of Ash',
  'The Last Requiem',
];

const SUNKEN_NAMES = [
  'Drowned Harbor',
  'Abyssal Shallows',
  'Sunken Temple of Tides',
  'The Brine Catacombs',
  'Chasm of the Mourning Sea',
  'Kelp-Wreathen Ruins',
  'The Flooded Vault',
  'Depths of the Siren Queen',
  'Saltwash Sepulchers',
  "The Leviathan's Gutter",
  'Tide-Crown Bastion',
  'The Silken Deeps',
  "Maelstrom's Hollow",
];

const INFERNO_NAMES = [
  'Emberforge Foundry',
  'Cinder Catacombs',
  'The Ashen Crucible',
  'Pyre of the Wailing Veins',
  "Blacksmith's Doom",
  'Furnace of the Damned',
  'The Smoldering Reach',
  'Molten Maw',
  'Crucible of the First Flame',
  'The Blazing Catacomb',
  'Phoenix-Gutter Foundry',
  'Hellforge Depths',
];

const ABYSS_NAMES = [
  'The Sunken Void',
  'Basalt Abyss',
  'The Umbral Rift',
  'Void-Gate Labyrinth',
  'The Whisperless Deep',
  'Cathedral of the Starless',
  'The Unending Pit',
  'Charnel of Black Stars',
  'The Hollowed End',
  'Throne of the Hollow God',
  'The Final Descent',
  "Malakor's Sanctum",
];

const THEME_META: Record<
  DungeonThemeKey,
  { icon: string; accent: string; bossName: string; description: string }
> = {
  catacombs: {
    icon: '🦴',
    accent: '#f59e0b',
    bossName: 'The Bone Sovereign',
    description: 'Skeletal legions guard ancient ossuaries.',
  },
  sunken: {
    icon: '🌊',
    accent: '#38bdf8',
    bossName: 'The Drowned Leviathan',
    description: 'Brine-filled tombs of a forgotten sea kingdom.',
  },
  inferno: {
    icon: '🔥',
    accent: '#ef4444',
    bossName: 'The Ash Tyrant',
    description: 'Furnace realms of magma and soot.',
  },
  abyss: {
    icon: '🌑',
    accent: '#c084fc',
    bossName: 'Malakor, the Hollow Lord',
    description: 'Void-choked lands beyond all light.',
  },
};

export const THEME_ORDER: DungeonThemeKey[] = ['catacombs', 'sunken', 'inferno', 'abyss'];

function pickName(id: number): string {
  const themeKey = THEME_ORDER[(id - 1) % 4];
  const seq = Math.floor((id - 1) / 4);
  const lists: Record<DungeonThemeKey, string[]> = {
    catacombs: CATACOMB_NAMES,
    sunken: SUNKEN_NAMES,
    inferno: INFERNO_NAMES,
    abyss: ABYSS_NAMES,
  };
  const arr = lists[themeKey];
  return arr[Math.min(seq, arr.length - 1)];
}

export const DUNGEON_LIST: DungeonDefinition[] = Array.from({ length: 50 }, (_, i) => {
  const id = i + 1;
  const themeKey = THEME_ORDER[(id - 1) % 4];
  const meta = THEME_META[themeKey];
  const tier = Math.min(5, Math.ceil(id / 10));
  return {
    id,
    name: pickName(id),
    icon: meta.icon,
    description: meta.description,
    themeKey,
    tier,
    bossName: meta.bossName,
    accent: meta.accent,
  };
});

export function getDungeonById(id: number): DungeonDefinition {
  return DUNGEON_LIST[Math.max(0, Math.min(DUNGEON_LIST.length - 1, id - 1))];
}

/** Global level across all 50 dungeons: floors 1..500 (dungeon 1 floor 1 = global 1). */
export function getGlobalLevel(dungeonId: number, floorNumber: number): number {
  return (dungeonId - 1) * 10 + floorNumber;
}

/** Difficulty multiplier: 1.0 at global floor 1, ~6.0 at global floor 500.
 *  Every single level is slightly harder than the previous one. */
export function getDifficultyScale(dungeonId: number, floorNumber: number): number {
  const gl = getGlobalLevel(dungeonId, floorNumber);
  return 1 + (gl - 1) * 0.01;
}

export function getRecommendedLevel(dungeonId: number): number {
  return Math.max(1, Math.round(((dungeonId - 1) / 49) * 98) + 1);
}
