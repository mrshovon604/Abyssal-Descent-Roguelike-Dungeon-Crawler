/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CombatLogEntry,
  DungeonFloor,
  Enemy,
  Equipment,
  FloatingText,
  GameScreen,
  Item,
  Particle,
  Player,
  Tile,
} from './types/game';
import { generateDungeonFloor, updateFieldOfView } from './dungeon/dungeonGenerator';
import { createStarterEquipment, generateRandomItem } from './items/itemDatabase';
import { SKILL_TREE_NODES, getActiveSkills } from './skills/skillTreeData';
import {
  awardXpAndCheckLevel,
  computeTotalPlayerStats,
  executeEnemyTurns,
  executePlayerAttack,
} from './combat/combatSystem';
import { DungeonRenderer } from './canvas/DungeonRenderer';
import { soundEngine } from './audio/soundEngine';
import { TitleScreen } from './components/TitleScreen';
import { HUD } from './components/HUD';
import { InventoryModal } from './components/InventoryModal';
import { SkillTreeModal } from './components/SkillTreeModal';
import { CombatLog } from './components/CombatLog';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [isCombatLogOpen, setIsCombatLogOpen] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [causeOfDeath, setCauseOfDeath] = useState('Slain in the Abyss');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DungeonRenderer | null>(null);

  // Core mutable game state references for high-speed simulation & rendering
  const floorRef = useRef<DungeonFloor | null>(null);
  const playerRef = useRef<Player | null>(null);
  const combatLogRef = useRef<CombatLogEntry[]>([]);
  const [combatLogList, setCombatLogList] = useState<CombatLogEntry[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hoveredTileRef = useRef<{ x: number; y: number } | null>(null);

  // Trigger re-render of HUD when needed
  const [, setHudTick] = useState(0);
  const triggerHud = () => setHudTick((t) => t + 1);

  // Helper to log combat messages
  const logCombat = useCallback((text: string, type: CombatLogEntry['type']) => {
    const entry: CombatLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      text,
      type,
      turn: turnNumber,
    };
    combatLogRef.current.push(entry);
    if (combatLogRef.current.length > 80) combatLogRef.current.shift();
    setCombatLogList([...combatLogRef.current]);
  }, [turnNumber]);

  // Helper to spawn floating text
  const addFloatingText = useCallback((text: string, x: number, y: number, color: string) => {
    floatingTextsRef.current.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      scale: 1,
      opacity: 1,
      vy: -0.6,
      life: 0.9,
      maxLife: 0.9,
    });
  }, []);

  // Helper to spawn particles
  const spawnParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.5;
      particlesRef.current.push({
        id: `p_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1.5,
        life: 0.4,
        maxLife: 0.4,
      });
    }
  }, []);

  // Initialize new game run
  const handleStartGame = useCallback((startingClass: 'warrior' | 'mage' | 'rogue') => {
    const starter = createStarterEquipment();
    const newFloor = generateDungeonFloor(1);

    // Initial class skills
    const initialSkills: string[] = [];
    if (startingClass === 'warrior') {
      initialSkills.push('w_heavy_strike');
    } else if (startingClass === 'mage') {
      initialSkills.push('m_firebolt');
    } else {
      initialSkills.push('r_shadow_step');
    }

    const newPlayer: Player = {
      x: newFloor.stairsUpPos.x,
      y: newFloor.stairsUpPos.y,
      facing: 'down',
      stats: {
        hp: startingClass === 'warrior' ? 120 : 90,
        maxHp: startingClass === 'warrior' ? 120 : 90,
        mana: startingClass === 'mage' ? 90 : 50,
        maxMana: startingClass === 'mage' ? 90 : 50,
        attack: 10,
        defense: 4,
        critChance: startingClass === 'rogue' ? 0.15 : 0.05,
        lifeSteal: 0,
        dodgeChance: startingClass === 'rogue' ? 0.12 : 0.05,
        level: 1,
        xp: 0,
        xpToNextLevel: 50,
        skillPoints: 1,
        gold: 30,
      },
      inventory: starter.inventory,
      maxInventorySize: 16,
      equipment: starter.equipment,
      unlockedSkills: initialSkills,
      activeSkillCooldowns: {},
      selectedSkillId: null,
      statusEffects: [],
      visionRange: 7,
    };

    updateFieldOfView(newFloor, newPlayer.x, newPlayer.y, newPlayer.visionRange);

    floorRef.current = newFloor;
    playerRef.current = newPlayer;
    setTurnNumber(1);
    setMonstersKilled(0);
    combatLogRef.current = [];
    setCombatLogList([]);

    logCombat('You descend into the depths of the Forgotten Catacombs...', 'system');
    logCombat(`Armed with ${starter.equipment.weapon.name}. Prepare for battle!`, 'system');

    setScreen('playing');
    setIsInventoryOpen(false);
    setIsSkillTreeOpen(false);
    triggerHud();
  }, [logCombat]);

  // Descend to next dungeon depth
  const handleDescendFloor = useCallback(() => {
    if (!floorRef.current || !playerRef.current) return;
    const nextFloorNum = floorRef.current.floorNumber + 1;

    soundEngine.playStairs();
    const newFloor = generateDungeonFloor(nextFloorNum);
    floorRef.current = newFloor;

    playerRef.current.x = newFloor.stairsUpPos.x;
    playerRef.current.y = newFloor.stairsUpPos.y;
    updateFieldOfView(newFloor, playerRef.current.x, playerRef.current.y, playerRef.current.visionRange);

    addFloatingText(`DEPTH ${nextFloorNum} REACHED`, playerRef.current.x, playerRef.current.y - 1, '#f59e0b');
    logCombat(`You descended to Depth ${nextFloorNum} · ${newFloor.theme.name}.`, 'level_up');

    // Give small exploration XP
    awardXpAndCheckLevel(playerRef.current, 15 * nextFloorNum, addFloatingText, logCombat);
    triggerHud();
  }, [addFloatingText, logCombat]);

  // Complete a turn and advance game state
  const advanceTurn = useCallback(() => {
    if (!playerRef.current || !floorRef.current) return;
    const player = playerRef.current;
    const floor = floorRef.current;

    // 1. Tick cooldowns on active skills
    for (const key of Object.keys(player.activeSkillCooldowns)) {
      if (player.activeSkillCooldowns[key] > 0) {
        player.activeSkillCooldowns[key]--;
      }
    }

    // 2. Tick player status effects
    for (let i = player.statusEffects.length - 1; i >= 0; i--) {
      const s = player.statusEffects[i];
      if (s.type === 'burn' || s.type === 'poison') {
        player.stats.hp -= s.power;
        addFloatingText(`-${s.power}`, player.x, player.y - 0.4, s.type === 'burn' ? '#f97316' : '#22c55e');
        logCombat(`You suffer ${s.power} ${s.type} damage.`, 'danger');
      }
      s.duration--;
      if (s.duration <= 0) {
        player.statusEffects.splice(i, 1);
      }
    }

    // Passive mana regen if arcane flow unlocked
    if (player.unlockedSkills.includes('m_arcane_flow')) {
      const maxM = computeTotalPlayerStats(player).maxMana;
      player.stats.mana = Math.min(maxM, player.stats.mana + 3);
    }

    // 3. Process enemy turns
    const prevEnemyCount = floor.enemies.length;
    executeEnemyTurns(floor, player, turnNumber, addFloatingText, logCombat, spawnParticles);
    const defeatedCount = prevEnemyCount - floor.enemies.length;
    if (defeatedCount > 0) {
      setMonstersKilled((k) => k + defeatedCount);
    }

    // 4. Update Field of View
    updateFieldOfView(floor, player.x, player.y, player.visionRange);

    // 5. Check Player Death
    if (player.stats.hp <= 0) {
      soundEngine.playDeath();
      setCauseOfDeath('Fatal wounds inflicted in combat');
      setScreen('game_over');
      return;
    }

    setTurnNumber((t) => t + 1);
    triggerHud();
  }, [turnNumber, addFloatingText, logCombat, spawnParticles]);

  // Attempt to move player or attack adjacent monster
  const handlePlayerMove = useCallback(
    (dx: number, dy: number) => {
      if (!playerRef.current || !floorRef.current || screen !== 'playing') return;
      if (isInventoryOpen || isSkillTreeOpen) return;

      const player = playerRef.current;
      const floor = floorRef.current;

      const targetX = player.x + dx;
      const targetY = player.y + dy;

      if (dx > 0) player.facing = 'right';
      else if (dx < 0) player.facing = 'left';
      else if (dy > 0) player.facing = 'down';
      else if (dy < 0) player.facing = 'up';

      // Bounds check
      if (targetX < 0 || targetX >= floor.width || targetY < 0 || targetY >= floor.height) return;

      const targetTile = floor.tiles[targetY][targetX];

      // 1. Check if monster is at target tile -> Bump to Attack!
      const enemy = floor.enemies.find((e) => e.x === targetX && e.y === targetY);
      if (enemy) {
        const result = executePlayerAttack(player, enemy, addFloatingText, logCombat, spawnParticles);
        if (rendererRef.current) {
          rendererRef.current.triggerShake(result.isCrit ? 9 : 4);
        }
        if (result.killed) {
          awardXpAndCheckLevel(player, enemy.xpReward, addFloatingText, logCombat);
          setMonstersKilled((k) => k + 1);

          // Check if Boss killed on floor 10
          if (enemy.archetype === 'boss' && floor.floorNumber >= 10) {
            setScreen('victory');
            return;
          }

          // Random loot drop on kill (35% chance)
          if (Math.random() < 0.35) {
            const drop = generateRandomItem(floor.floorNumber);
            if (player.inventory.length < player.maxInventorySize) {
              player.inventory.push(drop);
              logCombat(`✨ Monster dropped: ${drop.name}! Added to pack.`, 'loot');
            }
          }
          // Gold drop
          const gold = Math.round(10 + Math.random() * 15 * floor.floorNumber);
          player.stats.gold += gold;
          addFloatingText(`+${gold} 🪙`, enemy.x, enemy.y - 0.5, '#f59e0b');
        }
        advanceTurn();
        return;
      }

      // 2. Wall check
      if (targetTile.type === 'wall' || targetTile.type === 'chasm') {
        return;
      }

      // 3. Move player
      player.x = targetX;
      player.y = targetY;
      soundEngine.playFootstep();

      // 4. Check special tile interactions:
      // Stairs down
      if (targetTile.type === 'stairs_down') {
        handleDescendFloor();
        return;
      }

      // Chest
      if (targetTile.type === 'chest' && !targetTile.chest?.opened) {
        targetTile.chest!.opened = true;
        soundEngine.playChest();
        const loot = generateRandomItem(floor.floorNumber, targetTile.chest?.rarity);
        const goldLoot = Math.round(25 + Math.random() * 30 * floor.floorNumber);
        player.stats.gold += goldLoot;

        if (player.inventory.length < player.maxInventorySize) {
          player.inventory.push(loot);
          logCombat(`📦 Opened Chest! Discovered: ${loot.name} and ${goldLoot} Gold!`, 'loot');
          addFloatingText(`Found ${loot.name}`, player.x, player.y - 0.7, '#38bdf8');
        } else {
          logCombat(`📦 Opened Chest! Found ${goldLoot} Gold, but pack is full!`, 'loot');
        }
        spawnParticles(targetX, targetY, '#f59e0b', 12);
      }

      // Shrine
      if (targetTile.type === 'shrine' && !targetTile.shrine?.used) {
        targetTile.shrine!.used = true;
        soundEngine.playShrine();
        spawnParticles(targetX, targetY, '#38bdf8', 16);

        const type = targetTile.shrine!.type;
        if (type === 'vitality') {
          const stats = computeTotalPlayerStats(player);
          player.stats.hp = stats.maxHp;
          player.stats.mana = stats.maxMana;
          addFloatingText('FULL RESTORE!', player.x, player.y - 0.5, '#22c55e');
          logCombat('✨ Drank from the Font of Rebirth: Health & Mana fully restored!', 'shrine');
        } else if (type === 'blacksmith') {
          if (player.equipment.weapon) {
            player.equipment.weapon.attack = (player.equipment.weapon.attack || 8) + 3;
            addFloatingText('+3 WEAPON ATK!', player.x, player.y - 0.5, '#f59e0b');
            logCombat(`⚒️ The Forgemaster permanently fortified your ${player.equipment.weapon.name} (+3 ATK)!`, 'shrine');
          }
        } else if (type === 'wisdom') {
          player.stats.skillPoints += 1;
          addFloatingText('+1 SKILL POINT!', player.x, player.y - 0.5, '#c084fc');
          logCombat('🔮 Obelisk of Ancient Lore blessed you with +1 Skill Point!', 'shrine');
        } else if (type === 'blood') {
          const sacrifice = Math.round(player.stats.hp * 0.3);
          player.stats.hp -= sacrifice;
          const relic = generateRandomItem(floor.floorNumber, 'legendary');
          if (player.inventory.length < player.maxInventorySize) {
            player.inventory.push(relic);
          }
          addFloatingText(`Sacrificed ${sacrifice} HP`, player.x, player.y - 0.5, '#ef4444');
          logCombat(`🩸 Blood Altar took ${sacrifice} HP and forged a Legendary Relic: ${relic.name}!`, 'shrine');
        }
      }

      // Traps
      if ((targetTile.type === 'trap_spike' || targetTile.type === 'trap_poison') && !targetTile.trap?.triggered) {
        targetTile.trap!.triggered = true;
        targetTile.trap!.revealed = true;
        const trapDamage = 12 + floor.floorNumber * 3;
        player.stats.hp -= trapDamage;
        soundEngine.playPlayerHurt();
        if (rendererRef.current) rendererRef.current.triggerShake(7);
        addFloatingText(`TRAP! -${trapDamage} HP`, player.x, player.y - 0.5, '#ef4444');
        logCombat(`⚠️ Sprung a hidden trap! Suffered ${trapDamage} damage!`, 'danger');

        if (targetTile.type === 'trap_poison') {
          player.statusEffects.push({ type: 'poison', duration: 3, power: 4 });
        }
      }

      advanceTurn();
    },
    [screen, isInventoryOpen, isSkillTreeOpen, addFloatingText, logCombat, spawnParticles, handleDescendFloor, advanceTurn]
  );

  // Dedicated Action / Attack trigger for mobile big button
  const handleActionAttack = useCallback(() => {
    if (!playerRef.current || !floorRef.current || screen !== 'playing') return;
    const player = playerRef.current;
    const floor = floorRef.current;

    // 1. Check facing direction first
    let targetX = player.x;
    let targetY = player.y;
    if (player.facing === 'up') targetY--;
    else if (player.facing === 'down') targetY++;
    else if (player.facing === 'left') targetX--;
    else if (player.facing === 'right') targetX++;

    let targetEnemy = floor.enemies.find((e) => e.x === targetX && e.y === targetY);

    // 2. If no enemy in facing direction, find closest adjacent enemy
    if (!targetEnemy) {
      targetEnemy = floor.enemies.find(
        (e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) === 1
      );
      if (targetEnemy) {
        if (targetEnemy.x > player.x) player.facing = 'right';
        else if (targetEnemy.x < player.x) player.facing = 'left';
        else if (targetEnemy.y > player.y) player.facing = 'down';
        else if (targetEnemy.y < player.y) player.facing = 'up';
      }
    }

    if (targetEnemy) {
      const result = executePlayerAttack(player, targetEnemy, addFloatingText, logCombat, spawnParticles);
      if (rendererRef.current) {
        rendererRef.current.triggerShake(result.isCrit ? 9 : 4);
      }
      if (result.killed) {
        awardXpAndCheckLevel(player, targetEnemy.xpReward, addFloatingText, logCombat);
        setMonstersKilled((k) => k + 1);

        if (targetEnemy.archetype === 'boss' && floor.floorNumber >= 10) {
          setScreen('victory');
          return;
        }

        if (Math.random() < 0.35) {
          const drop = generateRandomItem(floor.floorNumber);
          if (player.inventory.length < player.maxInventorySize) {
            player.inventory.push(drop);
            logCombat(`✨ Monster dropped: ${drop.name}! Added to pack.`, 'loot');
          }
        }
        const gold = Math.round(10 + Math.random() * 15 * floor.floorNumber);
        player.stats.gold += gold;
        addFloatingText(`+${gold} 🪙`, targetEnemy.x, targetEnemy.y - 0.5, '#f59e0b');
      }
      advanceTurn();
      return;
    }

    // 3. If no enemy, check for adjacent interactive tile (stairs, chest, shrine)
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];
    for (const d of dirs) {
      const tx = player.x + d.x;
      const ty = player.y + d.y;
      if (tx >= 0 && tx < floor.width && ty >= 0 && ty < floor.height) {
        const t = floor.tiles[ty][tx];
        if (t.type === 'stairs_down' || (t.type === 'chest' && !t.chest?.opened) || (t.type === 'shrine' && !t.shrine?.used)) {
          handlePlayerMove(d.x, d.y);
          return;
        }
      }
    }

    // 4. Otherwise, perform a weapon swing whoosh in air
    soundEngine.playAttack();
    spawnParticles(targetX, targetY, '#f59e0b', 5);
    logCombat('You swing your weapon into the gloom.', 'system');
    advanceTurn();
  }, [screen, addFloatingText, logCombat, spawnParticles, advanceTurn, handlePlayerMove]);

  // Cast active skill
  const handleExecuteSkill = useCallback(
    (skillId: string, targetTile?: { x: number; y: number }) => {
      if (!playerRef.current || !floorRef.current) return;
      const player = playerRef.current;
      const floor = floorRef.current;
      const skill = SKILL_TREE_NODES[skillId];
      if (!skill) return;

      const pStats = computeTotalPlayerStats(player);

      // Check mana and cooldown
      if (skill.manaCost && player.stats.mana < skill.manaCost) {
        addFloatingText('Not enough Mana!', player.x, player.y - 0.4, '#38bdf8');
        return;
      }
      if (player.activeSkillCooldowns[skillId] && player.activeSkillCooldowns[skillId] > 0) {
        return;
      }

      // Deduct Mana and set cooldown
      if (skill.manaCost) player.stats.mana -= skill.manaCost;
      if (skill.cooldown) player.activeSkillCooldowns[skillId] = skill.cooldown;

      // Handle specific skill behaviors
      if (skill.id === 'w_heavy_strike') {
        // Target adjacent enemy
        const enemy = floor.enemies.find((e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) === 1);
        if (enemy) {
          const dmg = Math.round(pStats.attack * 1.8);
          enemy.hp -= dmg;
          enemy.statusEffects.push({ type: 'stun', duration: 1, power: 0 });
          soundEngine.playHit(true);
          if (rendererRef.current) rendererRef.current.triggerShake(8);
          addFloatingText(`💥 HEAVY CRUSH -${dmg}`, enemy.x, enemy.y - 0.4, '#f59e0b');
          logCombat(`You execute Heavy Strike on ${enemy.name} for ${dmg} damage and STUN them!`, 'player_attack');
        }
      } else if (skill.id === 'w_cleave' || skill.id === 'w_whirlwind') {
        // AoE adjacent / radius
        const radius = skill.id === 'w_whirlwind' ? 2 : 1;
        let hits = 0;
        floor.enemies.forEach((enemy) => {
          const d = Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y);
          if (d <= radius) {
            const mult = skill.damageMultiplier || 1.4;
            const dmg = Math.round(pStats.attack * mult);
            enemy.hp -= dmg;
            if (skill.statusEffect) {
              enemy.statusEffects.push({ type: skill.statusEffect, duration: skill.statusDuration || 2, power: 5 });
            }
            addFloatingText(`-${dmg}`, enemy.x, enemy.y - 0.3, '#ef4444');
            spawnParticles(enemy.x, enemy.y, '#f59e0b', 8);
            hits++;
          }
        });
        soundEngine.playAttack();
        if (rendererRef.current) rendererRef.current.triggerShake(7);
        logCombat(`You unleashed ${skill.name}, striking ${hits} enemies!`, 'skill');
      } else if (skill.id === 'm_firebolt') {
        // Projectile targeting
        soundEngine.playSpell('fire');
        const target = targetTile
          ? floor.enemies.find((e) => e.x === targetTile.x && e.y === targetTile.y)
          : floor.enemies.find((e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 4);

        if (target) {
          const dmg = Math.round(pStats.attack * 1.5);
          target.hp -= dmg;
          target.statusEffects.push({ type: 'burn', duration: 2, power: 6 });
          addFloatingText(`🔥 -${dmg}`, target.x, target.y - 0.4, '#f97316');
          spawnParticles(target.x, target.y, '#f97316', 12);
          logCombat(`Firebolt incinerated ${target.name} for ${dmg} damage!`, 'skill');
        }
      } else if (skill.id === 'm_frost_nova') {
        soundEngine.playSpell('frost');
        floor.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 2) {
            const dmg = Math.round(pStats.attack * 1.2);
            enemy.hp -= dmg;
            enemy.statusEffects.push({ type: 'freeze', duration: 2, power: 0 });
            addFloatingText(`❄️ FROZEN! -${dmg}`, enemy.x, enemy.y - 0.3, '#38bdf8');
            spawnParticles(enemy.x, enemy.y, '#38bdf8', 8);
          }
        });
        logCombat('Frost Nova froze all surrounding enemies in deep ice!', 'skill');
      } else if (skill.id === 'm_meteor_strike') {
        soundEngine.playSpell('fire');
        if (rendererRef.current) rendererRef.current.triggerShake(14);
        floor.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 3) {
            const dmg = Math.round(pStats.attack * 2.6);
            enemy.hp -= dmg;
            enemy.statusEffects.push({ type: 'burn', duration: 3, power: 10 });
            addFloatingText(`☄️ METEOR -${dmg}`, enemy.x, enemy.y - 0.4, '#f59e0b');
            spawnParticles(enemy.x, enemy.y, '#ef4444', 16);
          }
        });
        logCombat('METEOR CATACLYSM scorched the earth, obliterating foes!', 'skill');
      } else if (skill.id === 'r_shadow_step') {
        soundEngine.playSpell('shadow');
        const target = targetTile
          ? floor.enemies.find((e) => e.x === targetTile.x && e.y === targetTile.y)
          : floor.enemies.find((e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 3);

        if (target) {
          player.x = target.x > player.x ? target.x - 1 : target.x + 1;
          player.y = target.y;
          const dmg = Math.round(pStats.attack * 1.6);
          target.hp -= dmg;
          addFloatingText(`🗡️ SHADOW STRIKE -${dmg}`, target.x, target.y - 0.4, '#c084fc');
          logCombat(`Shadow Step blinked behind ${target.name} for ${dmg} critical damage!`, 'skill');
        }
      } else if (skill.id === 'r_smoke_screen') {
        soundEngine.playSpell('shadow');
        player.statusEffects.push({ type: 'invisibility', duration: 3, power: 0 });
        addFloatingText('💨 INVISIBLE', player.x, player.y - 0.4, '#94a3b8');
        logCombat('You vanished into smoke! Enemies cannot target you for 3 turns.', 'skill');
      } else if (skill.id === 'r_assassinate') {
        const target = floor.enemies.find((e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) === 1);
        if (target) {
          const isLowHp = target.hp < target.maxHp * 0.4;
          const mult = isLowHp ? 5.0 : 3.0;
          const dmg = Math.round(pStats.attack * mult);
          target.hp -= dmg;
          soundEngine.playHit(true);
          if (rendererRef.current) rendererRef.current.triggerShake(10);
          addFloatingText(`☠️ ASSASSINATE -${dmg}`, target.x, target.y - 0.4, '#f43f5e');
          logCombat(`You executed Assassinate on ${target.name} for ${dmg} damage!`, 'skill');
          if (target.hp <= 0) {
            player.activeSkillCooldowns['r_assassinate'] = 0;
            logCombat('Assassinate scored a kill! Cooldown instantly reset!', 'level_up');
          }
        }
      }

      player.selectedSkillId = null;
      advanceTurn();
    },
    [advanceTurn, addFloatingText, logCombat, spawnParticles]
  );

  // Skill Selection from Hotbar
  const handleSelectSkill = useCallback(
    (skillId: string) => {
      if (!playerRef.current) return;
      const player = playerRef.current;
      if (player.selectedSkillId === skillId) {
        player.selectedSkillId = null;
        triggerHud();
        return;
      }
      const skill = SKILL_TREE_NODES[skillId];
      if (!skill) return;

      // If self-targeted skill, execute immediately
      if (skill.targetType === 'self' || skill.targetType === 'adjacent_all') {
        handleExecuteSkill(skillId);
      } else {
        // Needs targeting
        player.selectedSkillId = skillId;
        triggerHud();
      }
    },
    [handleExecuteSkill]
  );

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'title') return;

      if (e.key === 'Escape') {
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
          return;
        }
        if (isSkillTreeOpen) {
          setIsSkillTreeOpen(false);
          return;
        }
        if (isCombatLogOpen) {
          setIsCombatLogOpen(false);
          return;
        }
        setScreen((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s));
        return;
      }

      if (screen !== 'playing') return;

      // Menu toggles
      if (e.key === 'i' || e.key === 'I') {
        setIsInventoryOpen((prev) => !prev);
        setIsSkillTreeOpen(false);
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        setIsSkillTreeOpen((prev) => !prev);
        setIsInventoryOpen(false);
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        setIsCombatLogOpen((prev) => !prev);
        return;
      }

      if (isInventoryOpen || isSkillTreeOpen) return;

      // Movement & Bump Attack
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handlePlayerMove(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handlePlayerMove(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handlePlayerMove(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handlePlayerMove(1, 0);
      } else if (e.key === ' ' || e.key === '5') {
        // Wait a turn
        e.preventDefault();
        soundEngine.playFootstep();
        advanceTurn();
      }

      // Skill hotkeys 1-4
      if (['1', '2', '3', '4'].includes(e.key)) {
        const slotIdx = parseInt(e.key, 10) - 1;
        if (playerRef.current) {
          const actives = getActiveSkills(playerRef.current.unlockedSkills);
          if (actives[slotIdx]) {
            handleSelectSkill(actives[slotIdx].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isInventoryOpen, isSkillTreeOpen, isCombatLogOpen, handlePlayerMove, advanceTurn, handleSelectSkill]);

  // Main 60fps RequestAnimationFrame Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to avoid physics spirals

      // Update floating texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy * dt;
        ft.life -= dt;
        ft.opacity = Math.max(0, ft.life / ft.maxLife);
        if (ft.life <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Render if playing
      if (canvasRef.current && rendererRef.current && floorRef.current && playerRef.current) {
        let validTargets: { x: number; y: number }[] | null = null;
        if (playerRef.current.selectedSkillId) {
          const skill = SKILL_TREE_NODES[playerRef.current.selectedSkillId];
          if (skill && skill.range) {
            validTargets = floorRef.current.enemies
              .filter(
                (e) =>
                  Math.abs(e.x - playerRef.current!.x) + Math.abs(e.y - playerRef.current!.y) <= skill.range!
              )
              .map((e) => ({ x: e.x, y: e.y }));
          }
        }

        rendererRef.current.render(
          dt,
          floorRef.current,
          playerRef.current,
          floatingTextsRef.current,
          particlesRef.current,
          hoveredTileRef.current,
          validTargets
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Initialize Canvas Renderer and Resize handling
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new DungeonRenderer(canvasRef.current);
    }

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Canvas Mouse Click: move towards tile or execute skill on target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !playerRef.current || !floorRef.current || screen !== 'playing') return;
    const tile = rendererRef.current.screenToTile(e.clientX, e.clientY);

    // If currently targeting a skill
    if (playerRef.current.selectedSkillId) {
      handleExecuteSkill(playerRef.current.selectedSkillId, tile);
      return;
    }

    // Otherwise, move 1 step towards clicked tile
    const dx = tile.x - playerRef.current.x;
    const dy = tile.y - playerRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      handlePlayerMove(dx > 0 ? 1 : -1, 0);
    } else if (dy !== 0) {
      handlePlayerMove(0, dy > 0 ? 1 : -1);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    hoveredTileRef.current = rendererRef.current.screenToTile(e.clientX, e.clientY);
  };

  // Inventory Actions
  const handleEquipItem = (item: Item) => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const slotMap: Record<string, keyof Equipment> = {
      weapon: 'weapon',
      shield: 'shield',
      armor: 'armor',
      amulet: 'amulet',
    };

    let targetSlot: keyof Equipment | null = slotMap[item.type] || null;
    if (item.type === 'ring') {
      targetSlot = !player.equipment.ring1 ? 'ring1' : 'ring2';
    }

    if (targetSlot) {
      const currentEquipped = player.equipment[targetSlot];
      // Remove from inventory
      player.inventory = player.inventory.filter((i) => i.id !== item.id);
      // Place existing into inventory
      if (currentEquipped) {
        player.inventory.push(currentEquipped);
      }
      player.equipment[targetSlot] = item;
      soundEngine.playAttack();
      logCombat(`Equipped: ${item.name}`, 'loot');
      triggerHud();
    }
  };

  const handleUnequipItem = (slot: keyof Equipment) => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const item = player.equipment[slot];
    if (item && player.inventory.length < player.maxInventorySize) {
      player.equipment[slot] = null;
      player.inventory.push(item);
      logCombat(`Unequipped: ${item.name}`, 'system');
      triggerHud();
    }
  };

  const handleUseItem = (item: Item) => {
    if (!playerRef.current || !floorRef.current) return;
    const player = playerRef.current;
    const stats = computeTotalPlayerStats(player);

    if (item.type === 'potion') {
      soundEngine.playPotion();
      if (item.healAmount) {
        player.stats.hp = Math.min(stats.maxHp, player.stats.hp + item.healAmount);
        addFloatingText(`+${item.healAmount} HP`, player.x, player.y - 0.4, '#10b981');
        logCombat(`Drank ${item.name}! Healed ${item.healAmount} Health.`, 'loot');
      }
      if (item.manaAmount) {
        player.stats.mana = Math.min(stats.maxMana, player.stats.mana + item.manaAmount);
        addFloatingText(`+${item.manaAmount} MP`, player.x, player.y - 0.4, '#38bdf8');
        logCombat(`Drank ${item.name}! Restored ${item.manaAmount} Mana.`, 'loot');
      }
    } else if (item.type === 'scroll') {
      soundEngine.playSpell('shadow');
      if (item.scrollEffect === 'teleport') {
        const randomRoom = floorRef.current.rooms[Math.floor(Math.random() * floorRef.current.rooms.length)];
        player.x = randomRoom.centerX;
        player.y = randomRoom.centerY;
        updateFieldOfView(floorRef.current, player.x, player.y, player.visionRange);
        addFloatingText('PHASED!', player.x, player.y - 0.5, '#c084fc');
        logCombat('Scroll of Phasing warped you across the dungeon!', 'skill');
      } else if (item.scrollEffect === 'fireball') {
        floorRef.current.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 2) {
            enemy.hp -= 35;
            addFloatingText('-35', enemy.x, enemy.y - 0.4, '#f97316');
          }
        });
        logCombat('Scroll of Hellfire unleashed searing flames on nearby foes!', 'skill');
      }
    }

    // Remove from inventory
    player.inventory = player.inventory.filter((i) => i.id !== item.id);
    advanceTurn();
  };

  const handleDropItem = (item: Item) => {
    if (!playerRef.current) return;
    playerRef.current.inventory = playerRef.current.inventory.filter((i) => i.id !== item.id);
    logCombat(`Discarded ${item.name}.`, 'system');
    triggerHud();
  };

  const handleUnlockSkill = (skillId: string) => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const node = SKILL_TREE_NODES[skillId];
    if (node && player.stats.skillPoints >= node.cost) {
      player.stats.skillPoints -= node.cost;
      player.unlockedSkills.push(skillId);
      logCombat(`✨ Mastered new skill: ${node.name}!`, 'level_up');
      triggerHud();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-stone-950 text-stone-100 select-none">
      {/* Title Screen State */}
      {screen === 'title' && <TitleScreen onStartGame={handleStartGame} />}

      {/* Main Game Canvas (always mounted for zero-glitch state preservation) */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        className={`absolute inset-0 cursor-crosshair ${screen !== 'title' ? 'block' : 'hidden'}`}
      />

      {/* In-Game Heads-Up Display (HUD) */}
      {screen === 'playing' && playerRef.current && floorRef.current && (
        <HUD
          player={playerRef.current}
          floor={floorRef.current}
          turnNumber={turnNumber}
          activeSkills={getActiveSkills(playerRef.current.unlockedSkills)}
          onSkillSelect={handleSelectSkill}
          onWaitTurn={() => {
            soundEngine.playFootstep();
            advanceTurn();
          }}
          onOpenInventory={() => setIsInventoryOpen(true)}
          onOpenSkillTree={() => setIsSkillTreeOpen(true)}
          onOpenCombatLog={() => setIsCombatLogOpen((prev) => !prev)}
          onTogglePause={() => setScreen('paused')}
          onMoveDirection={handlePlayerMove}
          onActionAttack={handleActionAttack}
          isCombatLogOpen={isCombatLogOpen}
        />
      )}

      {/* Inventory & Gear Paperdoll Modal */}
      {isInventoryOpen && playerRef.current && (
        <InventoryModal
          player={playerRef.current}
          onClose={() => setIsInventoryOpen(false)}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onUseItem={handleUseItem}
          onDropItem={handleDropItem}
        />
      )}

      {/* Skill Tree Modal */}
      {isSkillTreeOpen && playerRef.current && (
        <SkillTreeModal
          player={playerRef.current}
          onClose={() => setIsSkillTreeOpen(false)}
          onUnlockSkill={handleUnlockSkill}
        />
      )}

      {/* Combat Log overlay */}
      <CombatLog
        entries={combatLogList}
        isOpen={isCombatLogOpen}
        onClose={() => setIsCombatLogOpen(false)}
      />

      {/* Pause Menu Modal */}
      {screen === 'paused' && (
        <PauseModal
          onResume={() => setScreen('playing')}
          onRestart={() => handleStartGame('warrior')}
          onExitToTitle={() => setScreen('title')}
        />
      )}

      {/* Permadeath Game Over Modal */}
      {screen === 'game_over' && playerRef.current && floorRef.current && (
        <GameOverModal
          player={playerRef.current}
          floorNumber={floorRef.current.floorNumber}
          turnNumber={turnNumber}
          monstersKilled={monstersKilled}
          causeOfDeath={causeOfDeath}
          onRestart={() => handleStartGame('warrior')}
        />
      )}

      {/* Victory Conquest Modal */}
      {screen === 'victory' && playerRef.current && (
        <VictoryModal
          player={playerRef.current}
          turnNumber={turnNumber}
          monstersKilled={monstersKilled}
          onRestart={() => handleStartGame('warrior')}
        />
      )}
    </div>
  );
}
