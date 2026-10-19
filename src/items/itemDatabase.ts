/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Item, ItemType, Rarity, WeaponSubtype } from '../types/game';

interface BaseItemTemplate {
  name: string;
  type: ItemType;
  subtype?: WeaponSubtype;
  icon: string;
  baseAttack?: number;
  baseDefense?: number;
  baseHpBonus?: number;
  baseManaBonus?: number;
  description: string;
}

const BASE_WEAPONS: BaseItemTemplate[] = [
  { name: 'Iron Broadsword', type: 'weapon', subtype: 'sword', icon: '⚔️', baseAttack: 7, description: 'A sturdy double-edged blade forged from tempered iron.' },
  { name: 'Steel Longsword', type: 'weapon', subtype: 'sword', icon: '🗡️', baseAttack: 11, description: 'A finely balanced knightly blade with keen cutting edge.' },
  { name: 'Rogue Kris', type: 'weapon', subtype: 'dagger', icon: '🗡️', baseAttack: 6, description: 'A serrated dagger built for swift backstabs and rapid strikes.' },
  { name: 'Shadow Stiletto', type: 'weapon', subtype: 'dagger', icon: '🔪', baseAttack: 9, description: 'A lethal needle-thin dagger that slips effortlessly between armor joints.' },
  { name: 'Battleaxe', type: 'weapon', subtype: 'axe', icon: '🪓', baseAttack: 13, description: 'A heavy cleaving axe designed to shatter shields and sunder bone.' },
  { name: 'Berserker Greataxe', type: 'weapon', subtype: 'axe', icon: '🪓', baseAttack: 18, description: 'A massive double-headed executioner axe dripping with dread.' },
  { name: 'Apprentice Staff', type: 'weapon', subtype: 'staff', icon: '🪄', baseAttack: 5, baseManaBonus: 20, description: 'An ash wood staff topped with an unpolished mana focus.' },
  { name: 'Archmage Spire', type: 'weapon', subtype: 'staff', icon: '🔮', baseAttack: 10, baseManaBonus: 45, description: 'A crystalline staff humming with raw arcane energy.' },
  { name: 'Recurve Bow', type: 'weapon', subtype: 'bow', icon: '🏹', baseAttack: 8, description: 'A supple yew bow that looses deadly arrows from a distance.' },
];

const BASE_SHIELDS: BaseItemTemplate[] = [
  { name: 'Wooden Buckler', type: 'shield', icon: '🛡️', baseDefense: 3, description: 'A light reinforced shield for deflecting glacing blows.' },
  { name: 'Iron Heater Shield', type: 'shield', icon: '🛡️', baseDefense: 6, baseHpBonus: 15, description: 'Solid iron shield emblazoned with faded heraldry.' },
  { name: 'Tower Bulwark', type: 'shield', icon: '🛡️', baseDefense: 11, baseHpBonus: 35, description: 'An immovable wall of steel capable of halting monstrous blows.' },
  { name: 'Arcane Tome', type: 'shield', icon: '📖', baseDefense: 2, baseManaBonus: 30, description: 'An ancient spellbook providing protective arcane wards.' },
];

const BASE_ARMORS: BaseItemTemplate[] = [
  { name: 'Padded Gambeson', type: 'armor', icon: '🥋', baseDefense: 4, baseHpBonus: 10, description: 'Quilted linen armor offering basic protection.' },
  { name: 'Studded Leather Vest', type: 'armor', icon: '🦺', baseDefense: 7, baseHpBonus: 25, description: 'Toughened leather reinforced with brass rivets.' },
  { name: 'Chainmail Hauberk', type: 'armor', icon: '🛡️', baseDefense: 12, baseHpBonus: 45, description: 'Interlocking steel rings that absorb slash impacts.' },
  { name: 'Full Gothic Plate', type: 'armor', icon: '🦺', baseDefense: 18, baseHpBonus: 75, description: 'Masterwork fluted plate armor fit for abyssal crusaders.' },
  { name: 'Sorcerer Robes', type: 'armor', icon: '👘', baseDefense: 5, baseManaBonus: 50, baseHpBonus: 20, description: 'Enchanted silk woven with threads of protective mana.' },
];

const BASE_RINGS: BaseItemTemplate[] = [
  { name: 'Iron Band', type: 'ring', icon: '💍', baseDefense: 2, description: 'A simple band offering minor warding.' },
  { name: 'Ruby Ring', type: 'ring', icon: '💍', baseAttack: 3, baseHpBonus: 20, description: 'A deep crimson stone glowing with vigor.' },
  { name: 'Sapphire Ring', type: 'ring', icon: '💍', baseManaBonus: 35, description: 'A tranquil blue gem that steadies mana flow.' },
  { name: 'Skull Signet', type: 'ring', icon: '💍', baseAttack: 4, description: 'A macabre ring whispered to siphon life force.' },
];

const BASE_AMULETS: BaseItemTemplate[] = [
  { name: 'Talisman of Vigor', type: 'amulet', icon: '📿', baseHpBonus: 35, description: 'An engraved jade stone that warms against your chest.' },
  { name: 'Pendant of the Mind', type: 'amulet', icon: '📿', baseManaBonus: 40, description: 'A mystic pendant clarifying the wearer\'s focus.' },
  { name: 'Amulet of Strife', type: 'amulet', icon: '📿', baseAttack: 5, baseDefense: 3, description: 'An artifact recovered from the depths of battle.' },
];

// Affixes
const PREFIXES = [
  { name: 'Vampiric', lifeSteal: 0.05, mult: 1.2 },
  { name: 'Flaming', attackBonus: 4, mult: 1.25 },
  { name: 'Frostforged', defenseBonus: 3, manaBonus: 15, mult: 1.2 },
  { name: 'Titan\'s', hpBonus: 40, defenseBonus: 4, mult: 1.35 },
  { name: 'Deft', dodgeChance: 0.06, critChance: 0.04, mult: 1.25 },
  { name: 'Keen', critChance: 0.08, mult: 1.25 },
  { name: 'Celestial', hpBonus: 25, manaBonus: 25, mult: 1.3 },
  { name: 'Abyssal', attackBonus: 6, lifeSteal: 0.03, mult: 1.4 },
];

const SUFFIXES = [
  { name: 'of Carnage', critChance: 0.06, attackBonus: 3 },
  { name: 'of the Juggernaut', hpBonus: 50, defenseBonus: 3 },
  { name: 'of the Leech', lifeSteal: 0.07 },
  { name: 'of the Wind', dodgeChance: 0.07 },
  { name: 'of the Sorcerer', manaBonus: 35 },
  { name: 'of Annihilation', attackBonus: 7, critChance: 0.05 },
];

export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; border: string; bg: string; multiplier: number }> = {
  common: { label: 'Common', color: 'text-stone-300', border: 'border-stone-700', bg: 'bg-stone-900', multiplier: 1.0 },
  uncommon: { label: 'Uncommon', color: 'text-emerald-400', border: 'border-emerald-700/60', bg: 'bg-emerald-950/30', multiplier: 1.25 },
  rare: { label: 'Rare', color: 'text-sky-400', border: 'border-sky-600/60', bg: 'bg-sky-950/30', multiplier: 1.55 },
  epic: { label: 'Epic', color: 'text-purple-400', border: 'border-purple-600/60', bg: 'bg-purple-950/30', multiplier: 1.95 },
  legendary: { label: 'Legendary', color: 'text-amber-400', border: 'border-amber-500/70', bg: 'bg-amber-950/30', multiplier: 2.5 },
  mythic: { label: 'Mythic', color: 'text-rose-500', border: 'border-rose-600', bg: 'bg-rose-950/40', multiplier: 3.2 },
};

export function rollRarity(floorNumber: number, isChestOrBoss: boolean = false): Rarity {
  const roll = Math.random() * 100 + floorNumber * 3 + (isChestOrBoss ? 25 : 0);
  if (roll > 105) return 'mythic';
  if (roll > 85) return 'legendary';
  if (roll > 65) return 'epic';
  if (roll > 42) return 'rare';
  if (roll > 20) return 'uncommon';
  return 'common';
}

export function generateRandomItem(floorNumber: number, forcedRarity?: Rarity): Item {
  const rarity = forcedRarity || rollRarity(floorNumber);
  const typeRoll = Math.random();

  // 25% consumable (potion/scroll)
  if (typeRoll < 0.25) {
    return generateConsumable(floorNumber);
  }

  // 75% equipment
  let templatePool: BaseItemTemplate[];
  if (typeRoll < 0.50) templatePool = BASE_WEAPONS;
  else if (typeRoll < 0.65) templatePool = BASE_ARMORS;
  else if (typeRoll < 0.78) templatePool = BASE_SHIELDS;
  else if (typeRoll < 0.89) templatePool = BASE_RINGS;
  else templatePool = BASE_AMULETS;

  const base = templatePool[Math.floor(Math.random() * templatePool.length)];
  const cfg = RARITY_CONFIG[rarity];

  // Base stat calculations with floor scaling & rarity multiplier
  const floorScale = 1 + (floorNumber - 1) * 0.22;
  let attack = base.baseAttack ? Math.round(base.baseAttack * cfg.multiplier * floorScale) : undefined;
  let defense = base.baseDefense ? Math.round(base.baseDefense * cfg.multiplier * floorScale) : undefined;
  let hpBonus = base.baseHpBonus ? Math.round(base.baseHpBonus * cfg.multiplier * floorScale) : undefined;
  let manaBonus = base.baseManaBonus ? Math.round(base.baseManaBonus * cfg.multiplier * floorScale) : undefined;
  let critChance = (rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') ? 0.05 : 0;
  let lifeSteal = (rarity === 'legendary' || rarity === 'mythic') ? 0.04 : 0;
  let dodgeChance = (rarity === 'mythic') ? 0.05 : 0;

  // Add Affixes for rare+
  let fullName = base.name;
  if (rarity !== 'common') {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
    fullName = `${prefix.name} ${fullName}`;
    if (prefix.attackBonus && attack !== undefined) attack += Math.round(prefix.attackBonus * floorScale);
    if (prefix.defenseBonus && defense !== undefined) defense += Math.round(prefix.defenseBonus * floorScale);
    if (prefix.hpBonus) hpBonus = (hpBonus || 0) + Math.round(prefix.hpBonus * floorScale);
    if (prefix.manaBonus) manaBonus = (manaBonus || 0) + Math.round(prefix.manaBonus * floorScale);
    if (prefix.critChance) critChance += prefix.critChance;
    if (prefix.lifeSteal) lifeSteal += prefix.lifeSteal;
    if (prefix.dodgeChance) dodgeChance += prefix.dodgeChance;
  }

  if (rarity === 'rare' || rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') {
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
    fullName = `${fullName} ${suffix.name}`;
    if (suffix.critChance) critChance += suffix.critChance;
    if (suffix.attackBonus && attack !== undefined) attack += Math.round(suffix.attackBonus * floorScale);
    if (suffix.defenseBonus && defense !== undefined) defense += Math.round(suffix.defenseBonus * floorScale);
    if (suffix.hpBonus) hpBonus = (hpBonus || 0) + Math.round(suffix.hpBonus * floorScale);
    if (suffix.manaBonus) manaBonus = (manaBonus || 0) + Math.round(suffix.manaBonus * floorScale);
    if (suffix.lifeSteal) lifeSteal += suffix.lifeSteal;
    if (suffix.dodgeChance) dodgeChance += suffix.dodgeChance;
  }

  const goldValue = Math.round((18 + floorNumber * 12) * cfg.multiplier);

  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: fullName,
    type: base.type,
    subtype: base.subtype,
    rarity,
    description: base.description,
    icon: base.icon,
    level: floorNumber,
    attack: attack || undefined,
    defense: defense || undefined,
    hpBonus: hpBonus || undefined,
    manaBonus: manaBonus || undefined,
    critChance: critChance > 0 ? parseFloat(critChance.toFixed(2)) : undefined,
    lifeSteal: lifeSteal > 0 ? parseFloat(lifeSteal.toFixed(2)) : undefined,
    dodgeChance: dodgeChance > 0 ? parseFloat(dodgeChance.toFixed(2)) : undefined,
    goldValue,
  };
}

export function generateMerchantStock(floorNumber: number): Item[] {
  const stock: Item[] = [];
  // 1. Rare or Epic equipment
  const r1: Rarity = floorNumber >= 5 ? 'epic' : 'rare';
  stock.push(generateRandomItem(floorNumber, r1));
  // 2. Uncommon/Rare/Legendary equipment
  const r2: Rarity = Math.random() > 0.65 ? 'legendary' : 'rare';
  stock.push(generateRandomItem(floorNumber, r2));
  // 3. Health Potion
  const heal = Math.round(45 + floorNumber * 14);
  stock.push({
    id: `shop_hp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: floorNumber >= 5 ? 'Royal Crimson Draught' : 'Crimson Health Draught',
    type: 'potion',
    rarity: 'uncommon',
    description: `Restores ${heal} Health instantly.`,
    icon: '🧪',
    level: floorNumber,
    healAmount: heal,
    goldValue: 22 + floorNumber * 6,
  });
  // 4. Mana Potion or Hellfire Scroll
  stock.push(generateConsumable(floorNumber));
  // 5. Special Permanent Elixir of Might / Vitality
  const isMight = Math.random() > 0.5;
  stock.push({
    id: `shop_elixir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: isMight ? 'Elixir of Titan Might' : 'Elixir of Eternal Vigor',
    type: 'potion',
    rarity: 'epic',
    description: isMight
      ? 'Permanently increases Base Attack by +3 and restores 25 HP.'
      : 'Permanently increases Max Health by +25 and heals 40 HP.',
    icon: isMight ? '🍷' : '🍯',
    level: floorNumber,
    healAmount: isMight ? 25 : 40,
    permanentAttackBonus: isMight ? 3 : undefined,
    permanentMaxHpBonus: isMight ? undefined : 25,
    goldValue: 65 + floorNumber * 14,
  });

  return stock;
}

export function generateConsumable(floorNumber: number): Item {
  const roll = Math.random();
  if (roll < 0.45) {
    // Health Potion
    const heal = Math.round(35 + floorNumber * 12);
    return {
      id: `item_hp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: floorNumber > 5 ? 'Greater Crimson Elixir' : 'Crimson Health Draught',
      type: 'potion',
      rarity: floorNumber > 5 ? 'rare' : 'uncommon',
      description: `Restores ${heal} Health instantly.`,
      icon: '🧪',
      level: floorNumber,
      healAmount: heal,
      goldValue: 20 + floorNumber * 5,
    };
  } else if (roll < 0.75) {
    // Mana Potion
    const mana = Math.round(30 + floorNumber * 10);
    return {
      id: `item_mp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: floorNumber > 5 ? 'Greater Arcane Draught' : 'Vial of Pure Mana',
      type: 'potion',
      rarity: floorNumber > 5 ? 'rare' : 'uncommon',
      description: `Restores ${mana} Mana points.`,
      icon: '⚗️',
      level: floorNumber,
      manaAmount: mana,
      goldValue: 20 + floorNumber * 5,
    };
  } else if (roll < 0.88) {
    // Scroll of Teleportation
    return {
      id: `item_scroll_tp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Scroll of Phasing',
      type: 'scroll',
      rarity: 'rare',
      description: 'Instantly teleports the user to an explored safe location on this floor.',
      icon: '📜',
      level: floorNumber,
      scrollEffect: 'teleport',
      goldValue: 40 + floorNumber * 8,
    };
  } else {
    // Scroll of Fireball
    return {
      id: `item_scroll_fire_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Scroll of Hellfire',
      type: 'scroll',
      rarity: 'rare',
      description: 'Unleashes an explosive flame wave incinerating all adjacent foes.',
      icon: '📜',
      level: floorNumber,
      scrollEffect: 'fireball',
      goldValue: 50 + floorNumber * 10,
    };
  }
}

// Starter Gear setup
export function createStarterEquipment(): { equipment: { weapon: Item; shield: Item | null; armor: Item; ring1: null; ring2: null; amulet: null }; inventory: Item[] } {
  const starterWeapon: Item = {
    id: 'starter_sword',
    name: 'Adventurer\'s Shortsword',
    type: 'weapon',
    subtype: 'sword',
    rarity: 'common',
    description: 'A trusty blade that has seen better days, but remains sharp.',
    icon: '⚔️',
    level: 1,
    attack: 8,
    critChance: 0.05,
    goldValue: 10,
  };

  const starterArmor: Item = {
    id: 'starter_armor',
    name: 'Worn Leather Tunic',
    type: 'armor',
    rarity: 'common',
    description: 'Thick boiled leather providing basic resistance against claws.',
    icon: '🥋',
    level: 1,
    defense: 4,
    hpBonus: 15,
    goldValue: 10,
  };

  const potion1: Item = {
    id: 'starter_pot_1',
    name: 'Crimson Health Draught',
    type: 'potion',
    rarity: 'common',
    description: 'Restores 35 Health points.',
    icon: '🧪',
    level: 1,
    healAmount: 35,
    goldValue: 15,
  };

  const potion2: Item = {
    id: 'starter_pot_2',
    name: 'Vial of Pure Mana',
    type: 'potion',
    rarity: 'common',
    description: 'Restores 30 Mana points.',
    icon: '⚗️',
    level: 1,
    manaAmount: 30,
    goldValue: 15,
  };

  return {
    equipment: {
      weapon: starterWeapon,
      shield: null,
      armor: starterArmor,
      ring1: null,
      ring2: null,
      amulet: null,
    },
    inventory: [potion1, potion2],
  };
}
