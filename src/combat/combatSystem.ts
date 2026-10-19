/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { soundEngine } from '../audio/soundEngine';
import { SKILL_TREE_NODES } from '../skills/skillTreeData';
import { CombatLogEntry, DungeonFloor, Enemy, FloatingText, Item, Particle, Player, PlayerStats } from '../types/game';
import { getNextStepTowards } from '../dungeon/dungeonGenerator';

export function computeTotalPlayerStats(player: Player): PlayerStats {
  const base = { ...player.stats };

  // Calculate equipment bonuses
  const items: (Item | null)[] = [
    player.equipment.weapon,
    player.equipment.shield,
    player.equipment.armor,
    player.equipment.ring1,
    player.equipment.ring2,
    player.equipment.amulet,
  ];

  let equipAttack = 0;
  let equipDefense = 0;
  let equipHp = 0;
  let equipMana = 0;
  let equipCrit = 0;
  let equipLifeSteal = 0;
  let equipDodge = 0;

  for (const item of items) {
    if (!item) continue;
    if (item.attack) equipAttack += item.attack;
    if (item.defense) equipDefense += item.defense;
    if (item.hpBonus) equipHp += item.hpBonus;
    if (item.manaBonus) equipMana += item.manaBonus;
    if (item.critChance) equipCrit += item.critChance;
    if (item.lifeSteal) equipLifeSteal += item.lifeSteal;
    if (item.dodgeChance) equipDodge += item.dodgeChance;
  }

  // Calculate passive skill bonuses
  let skillDefense = 0;
  let skillHp = 0;
  let skillMana = 0;
  let skillCrit = 0;
  let skillLifeSteal = 0;
  let skillDodge = 0;

  if (player.unlockedSkills.includes('w_iron_skin')) {
    skillDefense += 5;
    skillHp += 30;
  }
  if (player.unlockedSkills.includes('w_bloodthirst')) {
    skillLifeSteal += 0.08;
    skillCrit += 0.05;
  }
  if (player.unlockedSkills.includes('w_juggernaut') && base.hp < (base.maxHp * 0.35)) {
    skillDefense += 14;
  }
  if (player.unlockedSkills.includes('m_mana_shield')) {
    skillMana += 45;
    skillDefense += 3;
  }
  if (player.unlockedSkills.includes('r_nimble_feet')) {
    skillDodge += 0.10;
  }
  if (player.unlockedSkills.includes('r_phantom_dance')) {
    skillDodge += 0.12;
    skillCrit += 0.10;
  }

  return {
    ...base,
    maxHp: base.maxHp + equipHp + skillHp,
    maxMana: base.maxMana + equipMana + skillMana,
    attack: base.attack + equipAttack,
    defense: base.defense + equipDefense + skillDefense,
    critChance: parseFloat(Math.min(0.75, base.critChance + equipCrit + skillCrit).toFixed(2)),
    lifeSteal: parseFloat(Math.min(0.60, base.lifeSteal + equipLifeSteal + skillLifeSteal).toFixed(2)),
    dodgeChance: parseFloat(Math.min(0.60, base.dodgeChance + equipDodge + skillDodge).toFixed(2)),
  };
}

export interface AttackResult {
  damage: number;
  isCrit: boolean;
  killed: boolean;
  leechAmount: number;
}

export function executePlayerAttack(
  player: Player,
  enemy: Enemy,
  addFloatingText: (text: string, x: number, y: number, color: string) => void,
  logCombat: (text: string, type: CombatLogEntry['type']) => void,
  spawnParticles: (x: number, y: number, color: string, count: number) => void
): AttackResult {
  const stats = computeTotalPlayerStats(player);
  soundEngine.playAttack();

  // Crit roll
  const isCrit = Math.random() < stats.critChance;
  const variance = 1 + (Math.random() * 0.2 - 0.1);
  const rawDmg = stats.attack * variance * (isCrit ? 1.75 : 1.0);
  const damage = Math.max(1, Math.round(rawDmg - enemy.defense));

  enemy.hp -= damage;
  soundEngine.playHit(isCrit);
  spawnParticles(enemy.x, enemy.y, isCrit ? '#f59e0b' : '#ef4444', isCrit ? 14 : 7);

  addFloatingText(
    isCrit ? `💥 ${damage} CRIT!` : `-${damage}`,
    enemy.x,
    enemy.y - 0.3,
    isCrit ? '#f59e0b' : '#f87171'
  );

  let leechAmount = 0;
  if (stats.lifeSteal > 0) {
    leechAmount = Math.max(1, Math.round(damage * stats.lifeSteal));
    player.stats.hp = Math.min(stats.maxHp, player.stats.hp + leechAmount);
    addFloatingText(`+${leechAmount} HP`, player.x, player.y - 0.4, '#10b981');
  }

  // Check rogue poison blade passive
  if (player.unlockedSkills.includes('r_poison_blade')) {
    if (!enemy.statusEffects.some(s => s.type === 'poison')) {
      enemy.statusEffects.push({ type: 'poison', duration: 3, power: Math.max(2, Math.round(stats.attack * 0.25)) });
    }
  }

  logCombat(
    `You strike ${enemy.name} for ${damage} damage${isCrit ? ' (CRITICAL STRIKE!)' : ''}.`,
    'player_attack'
  );

  const killed = enemy.hp <= 0;
  if (killed) {
    soundEngine.playKill();
    logCombat(`💀 You defeated ${enemy.name}! Gained ${enemy.xpReward} XP.`, 'level_up');
  }

  return { damage, isCrit, killed, leechAmount };
}

export function executeEnemyTurns(
  floor: DungeonFloor,
  player: Player,
  turnNumber: number,
  addFloatingText: (text: string, x: number, y: number, color: string) => void,
  logCombat: (text: string, type: CombatLogEntry['type']) => void,
  spawnParticles: (x: number, y: number, color: string, count: number) => void
) {
  const pStats = computeTotalPlayerStats(player);
  const isInvisible = player.statusEffects.some(s => s.type === 'invisibility');

  // Process alive enemies
  floor.enemies.forEach(enemy => {
    if (enemy.hp <= 0) return;
    enemy.turnsAlive++;

    // 1. Tick enemy status effects
    for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
      const effect = enemy.statusEffects[i];
      if (effect.type === 'burn' || effect.type === 'poison') {
        enemy.hp -= effect.power;
        addFloatingText(`-${effect.power}`, enemy.x, enemy.y - 0.3, effect.type === 'burn' ? '#f97316' : '#22c55e');
        logCombat(`${enemy.name} suffers ${effect.power} ${effect.type} damage.`, 'danger');
      }
      effect.duration--;
      if (effect.duration <= 0) {
        enemy.statusEffects.splice(i, 1);
      }
    }

    if (enemy.hp <= 0) {
      logCombat(`💀 ${enemy.name} succumbed to status afflictions.`, 'level_up');
      return;
    }

    // Skip turn if stunned or frozen
    if (enemy.statusEffects.some(s => s.type === 'stun' || s.type === 'freeze')) {
      return;
    }

    const dist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);

    // If player is invisible or out of aggro range (10 tiles), don't hunt
    if (isInvisible || dist > 10) {
      enemy.intent = null;
      return;
    }

    // Ranged Archer logic
    if (enemy.archetype === 'archer' && dist <= 4 && dist >= 2) {
      // Archer shoots
      handleEnemyAttack(enemy, player, pStats, addFloatingText, logCombat, spawnParticles, true);
      return;
    }

    // Melee attack if adjacent
    if (dist === 1) {
      handleEnemyAttack(enemy, player, pStats, addFloatingText, logCombat, spawnParticles, false);
      return;
    }

    // Move closer via pathfinding
    const nextStep = getNextStepTowards(floor, enemy.x, enemy.y, player.x, player.y, floor.enemies);
    if (nextStep) {
      enemy.x = nextStep.x;
      enemy.y = nextStep.y;

      // Update intent telegraph for next turn
      const nextDist = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
      if (nextDist === 1) {
        enemy.intent = {
          type: 'attack',
          value: enemy.attack,
          description: `Strikes for ~${enemy.attack} DMG`,
        };
      } else if (enemy.archetype === 'archer' && nextDist <= 4) {
        enemy.intent = {
          type: 'ranged_attack',
          value: enemy.attack,
          description: `Aims arrow for ~${enemy.attack} DMG`,
        };
      } else {
        enemy.intent = null;
      }
    }
  });

  // Remove dead enemies
  floor.enemies = floor.enemies.filter(e => e.hp > 0);
}

function handleEnemyAttack(
  enemy: Enemy,
  player: Player,
  pStats: PlayerStats,
  addFloatingText: (text: string, x: number, y: number, color: string) => void,
  logCombat: (text: string, type: CombatLogEntry['type']) => void,
  spawnParticles: (x: number, y: number, color: string, count: number) => void,
  isRanged: boolean
) {
  // Dodge check
  if (Math.random() < pStats.dodgeChance) {
    addFloatingText('💨 DODGE!', player.x, player.y - 0.4, '#38bdf8');
    logCombat(`You gracefully dodged ${enemy.name}'s attack!`, 'player_attack');

    // Phantom dance bonus
    if (player.unlockedSkills.includes('r_phantom_dance')) {
      player.stats.mana = Math.min(pStats.maxMana, player.stats.mana + 10);
      addFloatingText('+10 MP', player.x, player.y - 0.6, '#38bdf8');
    }
    return;
  }

  // Calculate damage
  let rawDmg = Math.max(1, enemy.attack - pStats.defense);

  // Mana shield absorption
  if (player.unlockedSkills.includes('m_mana_shield') && player.stats.mana > 5) {
    const absorb = Math.min(player.stats.mana, Math.round(rawDmg * 0.25));
    player.stats.mana -= absorb;
    rawDmg = Math.max(1, rawDmg - absorb);
    addFloatingText(`-${absorb} MP Absorbed`, player.x, player.y - 0.6, '#818cf8');
  }

  player.stats.hp -= rawDmg;
  soundEngine.playPlayerHurt();
  spawnParticles(player.x, player.y, '#ef4444', 8);

  addFloatingText(`-${rawDmg}`, player.x, player.y - 0.3, '#f87171');
  logCombat(
    `${enemy.name} hits you with ${isRanged ? 'a piercing arrow' : 'a brutal blow'} for ${rawDmg} damage!`,
    'enemy_attack'
  );
}

export function awardXpAndCheckLevel(
  player: Player,
  xpEarned: number,
  addFloatingText: (text: string, x: number, y: number, color: string) => void,
  logCombat: (text: string, type: CombatLogEntry['type']) => void
) {
  player.stats.xp += xpEarned;

  while (player.stats.xp >= player.stats.xpToNextLevel) {
    player.stats.xp -= player.stats.xpToNextLevel;
    player.stats.level += 1;
    player.stats.skillPoints += 1;

    // Stat increases
    player.stats.maxHp += 20;
    player.stats.hp = player.stats.maxHp; // Full heal on level up
    player.stats.maxMana += 15;
    player.stats.mana = player.stats.maxMana; // Full mana restore
    player.stats.attack += 2;
    player.stats.defense += 1;

    // Next XP threshold curve
    player.stats.xpToNextLevel = Math.round(player.stats.xpToNextLevel * 1.5);

    soundEngine.playLevelUp();
    addFloatingText(`🎉 LEVEL ${player.stats.level}! +1 Skill Point`, player.x, player.y - 0.8, '#fbbf24');
    logCombat(`⭐ LEVEL UP! Reached Level ${player.stats.level}. Health & Mana restored, +1 Skill Point gained!`, 'level_up');
  }
}
