/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SkillNode, SkillBranch } from '../types/game';

export interface BranchInfo {
  id: SkillBranch;
  name: string;
  title: string;
  description: string;
  color: string;
  accent: string;
  icon: string;
}

export const SKILL_BRANCHES: BranchInfo[] = [
  {
    id: 'warrior',
    name: 'Warmaster',
    title: 'Path of the Iron Vanguard',
    description: 'Mastery of brute force, heavy armor, crushing strikes, and frontline endurance.',
    color: 'from-amber-600/30 to-red-900/40',
    accent: 'text-amber-400',
    icon: '🛡️',
  },
  {
    id: 'mage',
    name: 'Elementalist',
    title: 'Path of Arcane Dominion',
    description: 'Harness primal elements, unleash devastating ranged spells, and wield mana shields.',
    color: 'from-sky-600/30 to-indigo-900/40',
    accent: 'text-sky-400',
    icon: '🔮',
  },
  {
    id: 'rogue',
    name: 'Shadowblade',
    title: 'Path of the Phantom Stalker',
    description: 'Swift stealth, lethal backstabs, poison coatings, and untraceable shadow steps.',
    color: 'from-emerald-600/30 to-teal-900/40',
    accent: 'text-emerald-400',
    icon: '🗡️',
  },
];

export const SKILL_TREE_NODES: Record<string, SkillNode> = {
  // === WARRIOR BRANCH ===
  w_iron_skin: {
    id: 'w_iron_skin',
    branch: 'warrior',
    tier: 1,
    name: 'Iron Skin',
    description: 'Hardens your resolve. Grants +5 Defense and +30 Max HP permanently.',
    icon: '🛡️',
    isPassive: true,
    cost: 1,
  },
  w_heavy_strike: {
    id: 'w_heavy_strike',
    branch: 'warrior',
    tier: 1,
    name: 'Heavy Strike',
    description: 'A crushing blow dealing 180% weapon damage and stunning the target for 1 turn.',
    icon: '🔨',
    isPassive: false,
    cost: 1,
    manaCost: 12,
    cooldown: 3,
    range: 1,
    targetType: 'target',
    damageMultiplier: 1.8,
    statusEffect: 'stun',
    statusDuration: 1,
  },
  w_cleave: {
    id: 'w_cleave',
    branch: 'warrior',
    tier: 2,
    name: 'Cleaving Sweep',
    description: 'Sweeps your blade in a wide circle, striking all adjacent enemies for 140% damage.',
    icon: '⚔️',
    isPassive: false,
    cost: 2,
    requires: ['w_heavy_strike'],
    manaCost: 16,
    cooldown: 4,
    range: 1,
    targetType: 'adjacent_all',
    damageMultiplier: 1.4,
  },
  w_bloodthirst: {
    id: 'w_bloodthirst',
    branch: 'warrior',
    tier: 2,
    name: 'Bloodthirst',
    description: 'Thirst for carnage grants +8% Life Steal on all attacks and +5% Crit Chance.',
    icon: '🩸',
    isPassive: true,
    cost: 2,
    requires: ['w_iron_skin'],
  },
  w_whirlwind: {
    id: 'w_whirlwind',
    branch: 'warrior',
    tier: 3,
    name: 'Whirlwind of Doom',
    description: 'Unleashes a ferocious hurricane of steel hitting all enemies within 2 tiles for 200% damage and applying Bleed.',
    icon: '🌪️',
    isPassive: false,
    cost: 3,
    requires: ['w_cleave', 'w_bloodthirst'],
    manaCost: 26,
    cooldown: 6,
    range: 2,
    targetType: 'aoe_circle',
    damageMultiplier: 2.0,
    statusEffect: 'poison',
    statusDuration: 3,
  },
  w_juggernaut: {
    id: 'w_juggernaut',
    branch: 'warrior',
    tier: 3,
    name: 'Juggernaut Bastion',
    description: 'When HP falls below 35%, instantly gain +14 Defense and become immune to Stun and Freeze.',
    icon: '🏰',
    isPassive: true,
    cost: 3,
    requires: ['w_bloodthirst'],
  },

  // === MAGE BRANCH ===
  m_mana_shield: {
    id: 'm_mana_shield',
    branch: 'mage',
    tier: 1,
    name: 'Mana Barrier',
    description: 'Expands your arcane reservoir by +45 Max Mana and grants +3 Armor.',
    icon: '✨',
    isPassive: true,
    cost: 1,
  },
  m_firebolt: {
    id: 'm_firebolt',
    branch: 'mage',
    tier: 1,
    name: 'Firebolt',
    description: 'Hurls a crackling sphere of flame up to 5 tiles away, dealing 150% damage and igniting the target.',
    icon: '🔥',
    isPassive: false,
    cost: 1,
    manaCost: 14,
    cooldown: 2,
    range: 5,
    targetType: 'target',
    damageMultiplier: 1.5,
    statusEffect: 'burn',
    statusDuration: 2,
  },
  m_frost_nova: {
    id: 'm_frost_nova',
    branch: 'mage',
    tier: 2,
    name: 'Frost Nova',
    description: 'Unleashes a glacial shockwave freezing all adjacent foes for 2 turns and dealing 120% cold damage.',
    icon: '❄️',
    isPassive: false,
    cost: 2,
    requires: ['m_firebolt'],
    manaCost: 20,
    cooldown: 4,
    range: 1,
    targetType: 'adjacent_all',
    damageMultiplier: 1.2,
    statusEffect: 'freeze',
    statusDuration: 2,
  },
  m_arcane_flow: {
    id: 'm_arcane_flow',
    branch: 'mage',
    tier: 2,
    name: 'Arcane Flow',
    description: 'Passive mana surge restores +3 Mana on every turn, and increases spell critical strike damage.',
    icon: '🌀',
    isPassive: true,
    cost: 2,
    requires: ['m_mana_shield'],
  },
  m_meteor_strike: {
    id: 'm_meteor_strike',
    branch: 'mage',
    tier: 3,
    name: 'Meteor Cataclysm',
    description: 'Calls down a colossal astral meteor upon target area within 6 tiles, obliterating enemies for 260% damage.',
    icon: '☄️',
    isPassive: false,
    cost: 3,
    requires: ['m_frost_nova', 'm_arcane_flow'],
    manaCost: 32,
    cooldown: 7,
    range: 6,
    targetType: 'aoe_circle',
    damageMultiplier: 2.6,
    statusEffect: 'burn',
    statusDuration: 3,
  },
  m_overcharge: {
    id: 'm_overcharge',
    branch: 'mage',
    tier: 3,
    name: 'Archmage Overcharge',
    description: 'Empowers all skills. Reduces all skill cooldowns by 1 turn and grants +15% spell power.',
    icon: '⚡',
    isPassive: true,
    cost: 3,
    requires: ['m_arcane_flow'],
  },

  // === ROGUE BRANCH ===
  r_shadow_step: {
    id: 'r_shadow_step',
    branch: 'rogue',
    tier: 1,
    name: 'Shadow Step',
    description: 'Step through shadow dimensions up to 3 tiles towards an enemy, striking for 160% critical damage.',
    icon: '👤',
    isPassive: false,
    cost: 1,
    manaCost: 12,
    cooldown: 3,
    range: 3,
    targetType: 'target',
    damageMultiplier: 1.6,
  },
  r_nimble_feet: {
    id: 'r_nimble_feet',
    branch: 'rogue',
    tier: 1,
    name: 'Nimble Instincts',
    description: 'Hones agility to supernatural heights. Grants +10% Dodge Chance and +1 Vision Range.',
    icon: '👟',
    isPassive: true,
    cost: 1,
  },
  r_poison_blade: {
    id: 'r_poison_blade',
    branch: 'rogue',
    tier: 2,
    name: 'Venom Coating',
    description: 'Coats weapons in virulent viper toxin. Every melee attack poisons enemies for 3 turns.',
    icon: '🧪',
    isPassive: true,
    cost: 2,
    requires: ['r_nimble_feet'],
  },
  r_smoke_screen: {
    id: 'r_smoke_screen',
    branch: 'rogue',
    tier: 2,
    name: 'Smoke Veil',
    description: 'Tosses an alchemical smoke bomb, granting Invisibility for 3 turns. Enemies lose sight of you.',
    icon: '💨',
    isPassive: false,
    cost: 2,
    requires: ['r_shadow_step'],
    manaCost: 18,
    cooldown: 5,
    range: 0,
    targetType: 'self',
    statusEffect: 'invisibility',
    statusDuration: 3,
  },
  r_assassinate: {
    id: 'r_assassinate',
    branch: 'rogue',
    tier: 3,
    name: 'Death Mark: Assassinate',
    description: 'Delivers a lethal execution strike dealing 300% damage (500% to enemies below 40% HP). Resets cooldown on kill.',
    icon: '☠️',
    isPassive: false,
    cost: 3,
    requires: ['r_smoke_screen', 'r_poison_blade'],
    manaCost: 24,
    cooldown: 6,
    range: 1,
    targetType: 'target',
    damageMultiplier: 3.0,
  },
  r_phantom_dance: {
    id: 'r_phantom_dance',
    branch: 'rogue',
    tier: 3,
    name: 'Phantom Reflexes',
    description: 'Gain +12% Dodge Chance and +10% Crit Chance. Dodging an attack restores 10 Mana.',
    icon: '⚡',
    isPassive: true,
    cost: 3,
    requires: ['r_poison_blade'],
  },
};

export function canUnlockSkill(nodeId: string, unlockedSkills: string[], skillPoints: number): { canUnlock: boolean; reason?: string } {
  const node = SKILL_TREE_NODES[nodeId];
  if (!node) return { canUnlock: false, reason: 'Skill not found' };
  if (unlockedSkills.includes(nodeId)) return { canUnlock: false, reason: 'Already learned' };
  if (skillPoints < node.cost) return { canUnlock: false, reason: `Requires ${node.cost} skill point${node.cost > 1 ? 's' : ''}` };

  if (node.requires && node.requires.length > 0) {
    const hasRequirements = node.requires.some(reqId => unlockedSkills.includes(reqId));
    if (!hasRequirements) {
      const reqNames = node.requires.map(id => SKILL_TREE_NODES[id]?.name || id).join(' or ');
      return { canUnlock: false, reason: `Requires: ${reqNames}` };
    }
  }

  return { canUnlock: true };
}

export function getActiveSkills(unlockedSkills: string[]): SkillNode[] {
  return unlockedSkills
    .map(id => SKILL_TREE_NODES[id])
    .filter((n): n is SkillNode => Boolean(n && !n.isPassive));
}
