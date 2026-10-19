/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DungeonFloor, DungeonTheme, Enemy, Room, Tile, TileType, MonsterArchetype } from '../types/game';

export const DUNGEON_THEMES: Record<string, DungeonTheme> = {
  catacombs: {
    name: 'Forgotten Catacombs',
    floorColor: '#1c1917',
    floorAltColor: '#292524',
    wallColor: '#44403c',
    wallTopColor: '#57534e',
    ambientLight: 'rgba(217, 119, 6, 0.15)',
    accentColor: '#f59e0b',
  },
  sunken: {
    name: 'Sunken Chasm',
    floorColor: '#0f172a',
    floorAltColor: '#1e293b',
    wallColor: '#334155',
    wallTopColor: '#475569',
    ambientLight: 'rgba(14, 165, 233, 0.18)',
    accentColor: '#38bdf8',
  },
  inferno: {
    name: 'Infernal Sanctum',
    floorColor: '#261214',
    floorAltColor: '#381619',
    wallColor: '#5c1d24',
    wallTopColor: '#7f1d1d',
    ambientLight: 'rgba(239, 68, 68, 0.2)',
    accentColor: '#ef4444',
  },
  abyss: {
    name: 'The Abyssal Heart',
    floorColor: '#110b1e',
    floorAltColor: '#1b1130',
    wallColor: '#381b5c',
    wallTopColor: '#581c87',
    ambientLight: 'rgba(168, 85, 247, 0.22)',
    accentColor: '#c084fc',
  },
};

export function getThemeForFloor(floor: number): DungeonTheme {
  if (floor >= 10) return DUNGEON_THEMES.abyss;
  if (floor >= 7) return DUNGEON_THEMES.inferno;
  if (floor >= 4) return DUNGEON_THEMES.sunken;
  return DUNGEON_THEMES.catacombs;
}

export function generateDungeonFloor(floorNumber: number): DungeonFloor {
  const width = 44;
  const height = 44;
  const theme = getThemeForFloor(floorNumber);

  // Initialize tile grid filled with walls
  const tiles: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      tiles[y][x] = {
        x,
        y,
        type: 'wall',
        explored: false,
        visible: false,
      };
    }
  }

  // Room generation
  const rooms: Room[] = [];
  const maxRooms = 10;
  const minRoomSize = 5;
  const maxRoomSize = 9;

  for (let i = 0; i < 40; i++) {
    if (rooms.length >= maxRooms) break;
    const w = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const h = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
    const rx = Math.floor(Math.random() * (width - w - 4)) + 2;
    const ry = Math.floor(Math.random() * (height - h - 4)) + 2;

    const newRoom: Room = {
      x: rx,
      y: ry,
      width: w,
      height: h,
      centerX: Math.floor(rx + w / 2),
      centerY: Math.floor(ry + h / 2),
    };

    // Check collision with existing rooms (keep 1 tile buffer)
    let overlaps = false;
    for (const r of rooms) {
      if (
        newRoom.x <= r.x + r.width + 1 &&
        newRoom.x + newRoom.width + 1 >= r.x &&
        newRoom.y <= r.y + r.height + 1 &&
        newRoom.y + newRoom.height + 1 >= r.y
      ) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      // Carve room into floor
      for (let cy = newRoom.y; cy < newRoom.y + newRoom.height; cy++) {
        for (let cx = newRoom.x; cx < newRoom.x + newRoom.width; cx++) {
          tiles[cy][cx].type = 'floor';
        }
      }

      // Connect to previous room via corridor
      if (rooms.length > 0) {
        const prev = rooms[rooms.length - 1];
        carveCorridor(tiles, prev.centerX, prev.centerY, newRoom.centerX, newRoom.centerY);
      }

      rooms.push(newRoom);
    }
  }

  // Add loop corridors between random rooms for tactical non-linear routing
  if (rooms.length >= 4) {
    const r1 = rooms[0];
    const rLast = rooms[rooms.length - 1];
    carveCorridor(tiles, r1.centerX, r1.centerY, rLast.centerX, rLast.centerY);
  }

  // Player starts in room 0
  const startRoom = rooms[0];
  const stairsUpPos = { x: startRoom.centerX, y: startRoom.centerY };
  tiles[stairsUpPos.y][stairsUpPos.x].type = 'stairs_up';

  // Stairs down placed in the farthest room
  const endRoom = rooms[rooms.length - 1];
  const stairsDownPos = { x: endRoom.centerX, y: endRoom.centerY };
  tiles[stairsDownPos.y][stairsDownPos.x].type = 'stairs_down';

  // Place Chests (2 to 4 chests per floor)
  const chestCount = Math.floor(Math.random() * 3) + 2;
  for (let c = 0; c < chestCount; c++) {
    const targetRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
    const cx = targetRoom.x + Math.floor(Math.random() * (targetRoom.width - 2)) + 1;
    const cy = targetRoom.y + Math.floor(Math.random() * (targetRoom.height - 2)) + 1;
    if (tiles[cy][cx].type === 'floor') {
      const rarityRoll = Math.random();
      const rarity = rarityRoll > 0.85 ? 'epic' : rarityRoll > 0.5 ? 'rare' : 'uncommon';
      tiles[cy][cx].type = 'chest';
      tiles[cy][cx].chest = { rarity, opened: false };
    }
  }

  // Place Shrines (1 to 2 shrines)
  const shrineCount = Math.floor(Math.random() * 2) + 1;
  const shrineTypes: ('vitality' | 'blacksmith' | 'wisdom' | 'blood')[] = ['vitality', 'blacksmith', 'wisdom', 'blood'];
  for (let s = 0; s < shrineCount; s++) {
    const targetRoom = rooms[Math.floor(Math.random() * (rooms.length - 1)) + 1];
    const sx = targetRoom.x + Math.floor(Math.random() * (targetRoom.width - 2)) + 1;
    const sy = targetRoom.y + Math.floor(Math.random() * (targetRoom.height - 2)) + 1;
    if (tiles[sy][sx].type === 'floor') {
      const type = shrineTypes[Math.floor(Math.random() * shrineTypes.length)];
      tiles[sy][sx].type = 'shrine';
      tiles[sy][sx].shrine = {
        type,
        name: getShrineName(type),
        description: getShrineDescription(type),
        used: false,
      };
    }
  }

  // Place Traps (3 to 6 traps)
  const trapCount = Math.floor(Math.random() * 4) + 3;
  for (let t = 0; t < trapCount; t++) {
    const targetRoom = rooms[Math.floor(Math.random() * rooms.length)];
    const tx = targetRoom.x + Math.floor(Math.random() * targetRoom.width);
    const ty = targetRoom.y + Math.floor(Math.random() * targetRoom.height);
    if (tiles[ty][tx].type === 'floor' && (tx !== stairsUpPos.x || ty !== stairsUpPos.y)) {
      const isPoison = Math.random() > 0.5;
      tiles[ty][tx].type = isPoison ? 'trap_poison' : 'trap_spike';
      tiles[ty][tx].trap = {
        type: isPoison ? 'poison' : 'spike',
        revealed: false,
        triggered: false,
      };
    }
  }

  // Spawn Monsters
  const enemies: Enemy[] = [];
  const isFinalFloor = floorNumber >= 10;

  if (isFinalFloor) {
    // Boss Room
    enemies.push(createBoss(endRoom.centerX, endRoom.centerY - 1, floorNumber));
    // Elite guards
    enemies.push(createEnemy('shadow_demon', endRoom.centerX - 2, endRoom.centerY + 1, floorNumber));
    enemies.push(createEnemy('shadow_demon', endRoom.centerX + 2, endRoom.centerY + 1, floorNumber));
  } else if (floorNumber % 3 === 0) {
    // Mini-boss floor (Floor 3, 6, 9)
    enemies.push(createBoss(endRoom.centerX, endRoom.centerY, floorNumber));
  }

  // Standard monsters across rooms
  rooms.forEach((room, idx) => {
    if (idx === 0) return; // Don't spawn on player's head in room 0
    const monsterDensity = Math.floor(Math.random() * 2) + 2; // 2 to 3 enemies per room
    for (let m = 0; m < monsterDensity; m++) {
      const ex = room.x + Math.floor(Math.random() * (room.width - 2)) + 1;
      const ey = room.y + Math.floor(Math.random() * (room.height - 2)) + 1;
      if (tiles[ey][ex].type === 'floor' && !enemies.some(e => e.x === ex && e.y === ey)) {
        const archetype = pickMonsterArchetype(floorNumber);
        enemies.push(createEnemy(archetype, ex, ey, floorNumber));
      }
    }
  });

  return {
    floorNumber,
    width,
    height,
    tiles,
    rooms,
    enemies,
    stairsDownPos,
    stairsUpPos,
    theme,
  };
}

function carveCorridor(tiles: Tile[][], x1: number, y1: number, x2: number, y2: number) {
  // 50% chance horizontal first, then vertical
  if (Math.random() > 0.5) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      tiles[y1][x].type = 'floor';
    }
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      tiles[y][x2].type = 'floor';
    }
  } else {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      tiles[y][x1].type = 'floor';
    }
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
      tiles[y2][x].type = 'floor';
    }
  }
}

function getShrineName(type: 'vitality' | 'blacksmith' | 'wisdom' | 'blood'): string {
  switch (type) {
    case 'vitality': return 'Font of Rebirth';
    case 'blacksmith': return 'Anvil of the Forgemaster';
    case 'wisdom': return 'Obelisk of Ancient Lore';
    case 'blood': return 'Sacrificial Blood Altar';
  }
}

function getShrineDescription(type: 'vitality' | 'blacksmith' | 'wisdom' | 'blood'): string {
  switch (type) {
    case 'vitality': return 'Drink to fully restore Health and Mana.';
    case 'blacksmith': return 'Imbues your equipped weapon with +3 permanent attack.';
    case 'wisdom': return 'Imparts ancient insight, granting +1 free Skill Point.';
    case 'blood': return 'Sacrifice 30% of current HP to acquire a legendary relic.';
  }
}

function pickMonsterArchetype(floor: number): MonsterArchetype {
  const roll = Math.random();
  if (floor <= 2) {
    if (roll < 0.45) return 'vermin';
    if (roll < 0.8) return 'skeleton';
    return 'goblin';
  } else if (floor <= 5) {
    if (roll < 0.25) return 'skeleton';
    if (roll < 0.5) return 'archer';
    if (roll < 0.75) return 'goblin';
    return 'cultist';
  } else if (floor <= 8) {
    if (roll < 0.25) return 'archer';
    if (roll < 0.5) return 'orc_berserker';
    if (roll < 0.75) return 'cultist';
    return 'shadow_demon';
  } else {
    if (roll < 0.3) return 'golem';
    if (roll < 0.6) return 'shadow_demon';
    if (roll < 0.85) return 'orc_berserker';
    return 'cultist';
  }
}

export function createEnemy(archetype: MonsterArchetype, x: number, y: number, floor: number): Enemy {
  const scale = 1 + (floor - 1) * 0.25;
  const id = `enemy_${archetype}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  switch (archetype) {
    case 'vermin':
      return {
        id,
        name: 'Plague Rat',
        archetype,
        x,
        y,
        hp: Math.round(18 * scale),
        maxHp: Math.round(18 * scale),
        attack: Math.round(6 * scale),
        defense: 1,
        xpReward: Math.round(15 * scale),
        color: '#a8a29e',
        symbol: '🐀',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'skeleton':
      return {
        id,
        name: 'Crypt Skeleton',
        archetype,
        x,
        y,
        hp: Math.round(32 * scale),
        maxHp: Math.round(32 * scale),
        attack: Math.round(10 * scale),
        defense: 3,
        xpReward: Math.round(25 * scale),
        color: '#e2e8f0',
        symbol: '💀',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'archer':
      return {
        id,
        name: 'Bone Marksman',
        archetype,
        x,
        y,
        hp: Math.round(26 * scale),
        maxHp: Math.round(26 * scale),
        attack: Math.round(13 * scale),
        defense: 2,
        xpReward: Math.round(35 * scale),
        color: '#94a3b8',
        symbol: '🏹',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'goblin':
      return {
        id,
        name: 'Goblin Prowler',
        archetype,
        x,
        y,
        hp: Math.round(28 * scale),
        maxHp: Math.round(28 * scale),
        attack: Math.round(9 * scale),
        defense: 2,
        xpReward: Math.round(30 * scale),
        color: '#4ade80',
        symbol: '👺',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'cultist':
      return {
        id,
        name: 'Necrotic Cultist',
        archetype,
        x,
        y,
        hp: Math.round(42 * scale),
        maxHp: Math.round(42 * scale),
        attack: Math.round(16 * scale),
        defense: 4,
        xpReward: Math.round(55 * scale),
        color: '#c084fc',
        symbol: '🧙',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'orc_berserker':
      return {
        id,
        name: 'Orc Berserker',
        archetype,
        x,
        y,
        hp: Math.round(65 * scale),
        maxHp: Math.round(65 * scale),
        attack: Math.round(20 * scale),
        defense: 6,
        xpReward: Math.round(80 * scale),
        color: '#ef4444',
        symbol: '👹',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'shadow_demon':
      return {
        id,
        name: 'Void Fiend',
        archetype,
        x,
        y,
        hp: Math.round(55 * scale),
        maxHp: Math.round(55 * scale),
        attack: Math.round(22 * scale),
        defense: 5,
        xpReward: Math.round(95 * scale),
        color: '#818cf8',
        symbol: '👿',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    case 'golem':
      return {
        id,
        name: 'Obsidian Golem',
        archetype,
        x,
        y,
        hp: Math.round(110 * scale),
        maxHp: Math.round(110 * scale),
        attack: Math.round(24 * scale),
        defense: 12,
        xpReward: Math.round(120 * scale),
        color: '#64748b',
        symbol: '🗿',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
    default:
      return {
        id,
        name: 'Lesser Imp',
        archetype: 'vermin',
        x,
        y,
        hp: Math.round(20 * scale),
        maxHp: Math.round(20 * scale),
        attack: Math.round(8 * scale),
        defense: 2,
        xpReward: 20,
        color: '#f87171',
        symbol: '👾',
        isBoss: false,
        intent: null,
        statusEffects: [],
        turnsAlive: 0,
      };
  }
}

export function createBoss(x: number, y: number, floor: number): Enemy {
  const id = `boss_floor_${floor}_${Date.now()}`;
  if (floor >= 10) {
    return {
      id,
      name: 'Malakor, Abyssal Lord',
      archetype: 'boss',
      x,
      y,
      hp: 420,
      maxHp: 420,
      attack: 38,
      defense: 16,
      xpReward: 1000,
      color: '#f43f5e',
      symbol: '👑',
      isBoss: true,
      intent: null,
      statusEffects: [],
      turnsAlive: 0,
    };
  } else if (floor >= 6) {
    return {
      id,
      name: 'Hydra of the Sunken Crypt',
      archetype: 'boss',
      x,
      y,
      hp: 240,
      maxHp: 240,
      attack: 28,
      defense: 10,
      xpReward: 450,
      color: '#06b6d4',
      symbol: '🐉',
      isBoss: true,
      intent: null,
      statusEffects: [],
      turnsAlive: 0,
    };
  } else {
    return {
      id,
      name: 'Gorgon the Bone Sovereign',
      archetype: 'boss',
      x,
      y,
      hp: 140,
      maxHp: 140,
      attack: 19,
      defense: 7,
      xpReward: 220,
      color: '#eab308',
      symbol: '💀',
      isBoss: true,
      intent: null,
      statusEffects: [],
      turnsAlive: 0,
    };
  }
}

// Raycasted Field of View (FOV) calculation
export function updateFieldOfView(floor: DungeonFloor, px: number, py: number, radius: number = 7) {
  // First clear visible state
  for (let y = 0; y < floor.height; y++) {
    for (let x = 0; x < floor.width; x++) {
      floor.tiles[y][x].visible = false;
    }
  }

  // Cast rays in 360 degrees
  const stepCount = 360;
  for (let i = 0; i < stepCount; i++) {
    const angle = (i * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let r = 0; r <= radius; r += 0.5) {
      const tx = Math.round(px + cos * r);
      const ty = Math.round(py + sin * r);

      if (tx < 0 || tx >= floor.width || ty < 0 || ty >= floor.height) break;

      floor.tiles[ty][tx].visible = true;
      floor.tiles[ty][tx].explored = true;

      // Stop ray if blocked by wall
      if (floor.tiles[ty][tx].type === 'wall') {
        break;
      }
    }
  }
}

// A* pathfinding step towards target
export function getNextStepTowards(
  floor: DungeonFloor,
  startX: number,
  startY: number,
  targetX: number,
  targetY: number,
  enemies: Enemy[]
): { x: number; y: number } | null {
  // Manhattan distance check
  const dx = targetX - startX;
  const dy = targetY - startY;

  // Directions sorted by proximity
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  dirs.sort((a, b) => {
    const distA = Math.abs(startX + a.x - targetX) + Math.abs(startY + a.y - targetY);
    const distB = Math.abs(startX + b.x - targetX) + Math.abs(startY + b.y - targetY);
    return distA - distB;
  });

  for (const dir of dirs) {
    const nx = startX + dir.x;
    const ny = startY + dir.y;

    if (nx >= 0 && nx < floor.width && ny >= 0 && ny < floor.height) {
      const tile = floor.tiles[ny][nx];
      const isBlockedByWall = tile.type === 'wall' || tile.type === 'chasm';
      const isBlockedByOtherEnemy = enemies.some(e => e.x === nx && e.y === ny);

      if (!isBlockedByWall && !isBlockedByOtherEnemy) {
        return { x: nx, y: ny };
      }
    }
  }

  return null;
}
