/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type ItemType = 'weapon' | 'shield' | 'armor' | 'ring' | 'amulet' | 'potion' | 'scroll';

export type WeaponSubtype = 'sword' | 'dagger' | 'axe' | 'staff' | 'bow';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  subtype?: WeaponSubtype;
  rarity: Rarity;
  description: string;
  icon: string;
  level: number;
  // Stats
  attack?: number;
  defense?: number;
  hpBonus?: number;
  manaBonus?: number;
  critChance?: number; // e.g. 0.05 = 5%
  lifeSteal?: number; // e.g. 0.05 = 5%
  dodgeChance?: number; // e.g. 0.05 = 5%
  cooldownReduction?: number;
  // Consumable effects
  healAmount?: number;
  manaAmount?: number;
  permanentAttackBonus?: number;
  permanentMaxHpBonus?: number;
  scrollEffect?: 'teleport' | 'cleansing' | 'fireball' | 'identify';
  goldValue: number;
}

export interface Equipment {
  weapon: Item | null;
  shield: Item | null;
  armor: Item | null;
  ring1: Item | null;
  ring2: Item | null;
  amulet: Item | null;
}

export type SkillBranch = 'warrior' | 'mage' | 'rogue';

export interface SkillNode {
  id: string;
  branch: SkillBranch;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  icon: string;
  isPassive: boolean;
  cost: number; // skill points
  requires?: string[]; // IDs of required nodes
  manaCost?: number;
  cooldown?: number; // turns
  // Effect metadata
  range?: number;
  targetType?: 'self' | 'target' | 'adjacent_all' | 'aoe_circle';
  damageMultiplier?: number;
  statusEffect?: 'stun' | 'freeze' | 'burn' | 'poison' | 'invisibility';
  statusDuration?: number; // turns
}

export interface ActiveSkillState {
  skillId: string;
  currentCooldown: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  critChance: number;
  lifeSteal: number;
  dodgeChance: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  skillPoints: number;
  gold: number;
}

export interface Player {
  x: number;
  y: number;
  facing: 'left' | 'right' | 'up' | 'down';
  stats: PlayerStats;
  inventory: Item[];
  maxInventorySize: number;
  equipment: Equipment;
  unlockedSkills: string[];
  activeSkillCooldowns: Record<string, number>;
  selectedSkillId: string | null;
  statusEffects: ActiveStatusEffect[];
  visionRange: number;
}

export interface ActiveStatusEffect {
  type: 'burn' | 'poison' | 'freeze' | 'stun' | 'invisibility' | 'enrage' | 'shield';
  duration: number; // turns remaining
  power: number; // damage per turn or magnitude
}

export type MonsterArchetype = 
  | 'vermin' 
  | 'skeleton' 
  | 'archer' 
  | 'goblin' 
  | 'cultist' 
  | 'orc_berserker' 
  | 'shadow_demon' 
  | 'golem' 
  | 'boss';

export interface EnemyIntent {
  type: 'attack' | 'ranged_attack' | 'aoe_slam' | 'charge' | 'buff' | 'summon' | 'flee';
  targetX?: number;
  targetY?: number;
  aoeTiles?: { x: number; y: number }[];
  value: number;
  description: string;
}

export interface Enemy {
  id: string;
  name: string;
  archetype: MonsterArchetype;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  color: string;
  symbol: string;
  isBoss: boolean;
  phase?: 1 | 2;
  intent: EnemyIntent | null;
  statusEffects: ActiveStatusEffect[];
  turnsAlive: number;
}

export type TileType = 
  | 'wall' 
  | 'floor' 
  | 'door' 
  | 'door_open' 
  | 'stairs_down' 
  | 'stairs_up' 
  | 'chest' 
  | 'chest_opened' 
  | 'shrine' 
  | 'shrine_used' 
  | 'merchant'
  | 'trap_spike' 
  | 'trap_poison' 
  | 'chasm';

export interface ShrineData {
  type: 'vitality' | 'blacksmith' | 'blood' | 'wisdom';
  name: string;
  description: string;
  used: boolean;
}

export interface ChestData {
  rarity: Rarity;
  opened: boolean;
  loot?: Item[];
}

export interface TrapData {
  type: 'spike' | 'poison' | 'fire';
  revealed: boolean;
  triggered: boolean;
}

export interface MerchantData {
  name: string;
  stock: Item[];
  visited: boolean;
}

export type TileDecal = 'blood' | 'scorch' | 'moss' | 'bones' | 'cracks';

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  explored: boolean;
  visible: boolean;
  shrine?: ShrineData;
  chest?: ChestData;
  trap?: TrapData;
  merchant?: MerchantData;
  decal?: TileDecal;
  hasTorch?: boolean;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type FloorEventType = 'none' | 'blood_moon' | 'gilded_vault' | 'arcane_surge' | 'cursed_mist';

export interface FloorEvent {
  type: FloorEventType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface DungeonFloor {
  dungeonId: number;
  floorNumber: number;
  width: number;
  height: number;
  tiles: Tile[][];
  rooms: Room[];
  enemies: Enemy[];
  stairsDownPos: { x: number; y: number };
  stairsUpPos: { x: number; y: number };
  merchantPos?: { x: number; y: number };
  theme: DungeonTheme;
  floorEvent: FloorEvent;
}

export interface DungeonTheme {
  name: string;
  floorColor: string;
  floorAltColor: string;
  wallColor: string;
  wallTopColor: string;
  ambientLight: string;
  accentColor: string;
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'player_attack' | 'enemy_attack' | 'loot' | 'level_up' | 'skill' | 'system' | 'shrine' | 'danger';
  turn: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  opacity: number;
  vy: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface SlashEffect {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

export interface ProjectileEffect {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  color: string;
  type: 'firebolt' | 'frost_ring' | 'meteor' | 'shadow_trail' | 'arrow';
  radius?: number;
  life: number;
  maxLife: number;
}

export interface RunHistoryRecord {
  id: string;
  date: string;
  characterClass: string;
  floorReached: number;
  level: number;
  monstersKilled: number;
  goldCollected: number;
  turnsSurvived: number;
  causeOfDeath: string;
  won: boolean;
}

export interface SavedRunState {
  version: number;
  savedAt: string;
  dungeonId: number;
  floor: DungeonFloor;
  player: Player;
  turnNumber: number;
  monstersKilled: number;
  combatLog: CombatLogEntry[];
}

export type GameScreen = 'title' | 'dungeon_select' | 'playing' | 'paused' | 'game_over' | 'victory';
