/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CombatLogEntry,
  DungeonFloor,
  Equipment,
  FloatingText,
  GameScreen,
  Item,
  Particle,
  Player,
  ProjectileEffect,
  SlashEffect,
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
import { MerchantModal } from './components/MerchantModal';
import { CombatLog } from './components/CombatLog';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { PauseModal } from './components/PauseModal';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('title');
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSkillTreeOpen, setIsSkillTreeOpen] = useState(false);
  const [isMerchantOpen, setIsMerchantOpen] = useState(false);
  const [isCombatLogOpen, setIsCombatLogOpen] = useState(false);
  const [turnNumber, setTurnNumber] = useState(1);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [causeOfDeath, setCauseOfDeath] = useState('Slain in the Abyss');
  const [floorBanner, setFloorBanner] = useState<{
    title: string;
    eventIcon: string;
    eventName: string;
    eventDesc: string;
    eventColor: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DungeonRenderer | null>(null);

  // Core mutable game state references for high-speed simulation & rendering
  const floorRef = useRef<DungeonFloor | null>(null);
  const playerRef = useRef<Player | null>(null);
  const combatLogRef = useRef<CombatLogEntry[]>([]);
  const [combatLogList, setCombatLogList] = useState<CombatLogEntry[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const slashesRef = useRef<SlashEffect[]>([]);
  const projectilesRef = useRef<ProjectileEffect[]>([]);
  const hoveredTileRef = useRef<{ x: number; y: number } | null>(null);
  const pinchDistRef = useRef<number | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

  // Trigger re-render of HUD when needed
  const [, setHudTick] = useState(0);
  const triggerHud = () => setHudTick((t) => t + 1);

  const showFloorArrivalBanner = useCallback((floor: DungeonFloor) => {
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    setFloorBanner({
      title: `Depth ${floor.floorNumber}F · ${floor.theme.name}`,
      eventIcon: floor.floorEvent.icon,
      eventName: floor.floorEvent.name,
      eventDesc: floor.floorEvent.description,
      eventColor: floor.floorEvent.color,
    });
    bannerTimeoutRef.current = window.setTimeout(() => {
      setFloorBanner(null);
    }, 3400);
  }, []);

  // Helper to log combat messages
  const logCombat = useCallback(
    (text: string, type: CombatLogEntry['type']) => {
      const entry: CombatLogEntry = {
        id: `log_${Date.now()}_${Math.random()}`,
        text,
        type,
        turn: turnNumber,
      };
      combatLogRef.current.push(entry);
      if (combatLogRef.current.length > 80) combatLogRef.current.shift();
      setCombatLogList([...combatLogRef.current]);
    },
    [turnNumber]
  );

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

  // Helper to spawn weapon slash arc animation
  const spawnSlash = useCallback((x: number, y: number, angle: number, color: string) => {
    slashesRef.current.push({
      id: `slash_${Date.now()}_${Math.random()}`,
      x,
      y,
      angle,
      color,
      radius: 1,
      life: 0.18,
      maxLife: 0.18,
    });
  }, []);

  // Helper to spawn spell projectile or ring animation
  const spawnProjectile = useCallback(
    (
      startX: number,
      startY: number,
      targetX: number,
      targetY: number,
      color: string,
      type: ProjectileEffect['type'],
      radius?: number
    ) => {
      projectilesRef.current.push({
        id: `proj_${Date.now()}_${Math.random()}`,
        startX,
        startY,
        targetX,
        targetY,
        color,
        type,
        radius,
        life: type === 'frost_ring' || type === 'meteor' ? 0.32 : 0.22,
        maxLife: type === 'frost_ring' || type === 'meteor' ? 0.32 : 0.22,
      });
    },
    []
  );

  // Initialize new game run
  const handleStartGame = useCallback(
    (startingClass: 'warrior' | 'mage' | 'rogue') => {
      const starter = createStarterEquipment();
      const newFloor = generateDungeonFloor(1);

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
          gold: 45,
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
      slashesRef.current = [];
      projectilesRef.current = [];
      setTurnNumber(1);
      setMonstersKilled(0);
      combatLogRef.current = [];
      setCombatLogList([]);

      logCombat('You descend into the depths of the Forgotten Catacombs...', 'system');
      if (newFloor.floorEvent.type !== 'none') {
        logCombat(
          `${newFloor.floorEvent.icon} Floor Event — ${newFloor.floorEvent.name}: ${newFloor.floorEvent.description}`,
          'shrine'
        );
      }

      setScreen('playing');
      setIsInventoryOpen(false);
      setIsSkillTreeOpen(false);
      setIsMerchantOpen(false);
      showFloorArrivalBanner(newFloor);
      triggerHud();
    },
    [logCombat, showFloorArrivalBanner]
  );

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
    if (newFloor.floorEvent.type !== 'none') {
      logCombat(
        `${newFloor.floorEvent.icon} Floor Event — ${newFloor.floorEvent.name}: ${newFloor.floorEvent.description}`,
        'shrine'
      );
    }

    awardXpAndCheckLevel(playerRef.current, 15 * nextFloorNum, addFloatingText, logCombat);
    showFloorArrivalBanner(newFloor);
    triggerHud();
  }, [addFloatingText, logCombat, showFloorArrivalBanner]);

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

    // Passive mana regen if arcane flow unlocked or Arcane Surge floor event active
    const maxM = computeTotalPlayerStats(player).maxMana;
    let manaRegen = 0;
    if (player.unlockedSkills.includes('m_arcane_flow')) manaRegen += 3;
    if (floor.floorEvent.type === 'arcane_surge') manaRegen += 2;
    if (manaRegen > 0) {
      player.stats.mana = Math.min(maxM, player.stats.mana + manaRegen);
    }

    // 3. Process enemy turns
    const prevEnemyCount = floor.enemies.length;
    executeEnemyTurns(
      floor,
      player,
      turnNumber,
      addFloatingText,
      logCombat,
      spawnParticles,
      spawnSlash,
      spawnProjectile
    );
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
  }, [turnNumber, addFloatingText, logCombat, spawnParticles, spawnSlash, spawnProjectile]);

  // Attempt to move player or attack adjacent monster
  // Returns true if hold-to-move can safely continue, false if it should halt
  const handlePlayerMove = useCallback(
    (dx: number, dy: number, isHoldRepeat: boolean = false): boolean => {
      if (!playerRef.current || !floorRef.current || screen !== 'playing') return false;
      if (isInventoryOpen || isSkillTreeOpen || isMerchantOpen) return false;

      const player = playerRef.current;
      const floor = floorRef.current;

      const targetX = player.x + dx;
      const targetY = player.y + dy;

      if (dx > 0) player.facing = 'right';
      else if (dx < 0) player.facing = 'left';
      else if (dy > 0) player.facing = 'down';
      else if (dy < 0) player.facing = 'up';

      // Bounds check
      if (targetX < 0 || targetX >= floor.width || targetY < 0 || targetY >= floor.height) return false;

      const targetTile = floor.tiles[targetY][targetX];

      // 1. Check if monster is at target tile -> Bump to Attack!
      const enemy = floor.enemies.find((e) => e.x === targetX && e.y === targetY);
      if (enemy) {
        // Safety cutoff: do not auto-mash into enemies during continuous hold-to-move
        if (isHoldRepeat) return false;

        const result = executePlayerAttack(
          player,
          enemy,
          addFloatingText,
          logCombat,
          spawnParticles,
          floor,
          spawnSlash
        );
        if (rendererRef.current) {
          rendererRef.current.triggerShake(result.triggeredBossPhase2 ? 14 : result.isCrit ? 9 : 4);
        }
        if (result.killed) {
          awardXpAndCheckLevel(player, enemy.xpReward, addFloatingText, logCombat);
          setMonstersKilled((k) => k + 1);

          // Check if Boss killed on floor 10
          if (enemy.archetype === 'boss' && floor.floorNumber >= 10) {
            setScreen('victory');
            return false;
          }

          // Random loot drop on kill
          const dropChance = floor.floorEvent.type === 'cursed_mist' ? 0.5 : 0.35;
          if (Math.random() < dropChance) {
            const drop = generateRandomItem(floor.floorNumber);
            if (player.inventory.length < player.maxInventorySize) {
              player.inventory.push(drop);
              logCombat(`✨ Monster dropped: ${drop.name}! Added to pack.`, 'loot');
            }
          }
          // Gold drop
          const goldMult = floor.floorEvent.type === 'gilded_vault' ? 1.4 : 1.0;
          const gold = Math.round((10 + Math.random() * 15 * floor.floorNumber) * goldMult);
          player.stats.gold += gold;
          addFloatingText(`+${gold} 🪙`, enemy.x, enemy.y - 0.5, '#f59e0b');
        }
        advanceTurn();
        return false;
      }

      // 2. Wall check
      if (targetTile.type === 'wall' || targetTile.type === 'chasm') {
        return false;
      }

      // 3. Move player
      player.x = targetX;
      player.y = targetY;
      soundEngine.playFootstep();

      // 4. Check special tile interactions:
      // Stairs down
      if (targetTile.type === 'stairs_down') {
        handleDescendFloor();
        return false;
      }

      // Wandering Merchant
      if (targetTile.type === 'merchant' && targetTile.merchant) {
        targetTile.merchant.visited = true;
        soundEngine.playChest();
        setIsMerchantOpen(true);
        logCombat(`⚖️ You encounter ${targetTile.merchant.name}.`, 'loot');
        triggerHud();
        return false;
      }

      // Chest
      if (targetTile.type === 'chest' && !targetTile.chest?.opened) {
        targetTile.chest!.opened = true;
        soundEngine.playChest();
        const loot = generateRandomItem(floor.floorNumber, targetTile.chest?.rarity);
        const goldMult = floor.floorEvent.type === 'gilded_vault' ? 1.4 : 1.0;
        const goldLoot = Math.round((25 + Math.random() * 30 * floor.floorNumber) * goldMult);
        player.stats.gold += goldLoot;

        if (player.inventory.length < player.maxInventorySize) {
          player.inventory.push(loot);
          logCombat(`📦 Opened Chest! Discovered: ${loot.name} and ${goldLoot} Gold!`, 'loot');
          addFloatingText(`Found ${loot.name}`, player.x, player.y - 0.7, '#38bdf8');
        } else {
          logCombat(`📦 Opened Chest! Found ${goldLoot} Gold, but pack is full!`, 'loot');
        }
        spawnParticles(targetX, targetY, '#f59e0b', 12);
        advanceTurn();
        return false;
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
        advanceTurn();
        return false;
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
        advanceTurn();
        return false;
      }

      advanceTurn();

      // Safety check after turn advances: if any enemy is now within 1 tile of player, halt hold-to-move
      const enemyAdjacentNow = floor.enemies.some(
        (e) => e.hp > 0 && Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
      );
      return !enemyAdjacentNow;
    },
    [
      screen,
      isInventoryOpen,
      isSkillTreeOpen,
      isMerchantOpen,
      addFloatingText,
      logCombat,
      spawnParticles,
      spawnSlash,
      handleDescendFloor,
      advanceTurn,
    ]
  );

  // Update player facing direction immediately while dragging analog joystick
  const handleAimDirection = useCallback((dx: number, dy: number) => {
    if (!playerRef.current) return;
    if (dx > 0) playerRef.current.facing = 'right';
    else if (dx < 0) playerRef.current.facing = 'left';
    else if (dy > 0) playerRef.current.facing = 'down';
    else if (dy < 0) playerRef.current.facing = 'up';
  }, []);

  // Dedicated Action / Attack trigger for mobile multi-touch Strike button
  const handleActionAttack = useCallback(
    (aimDir?: { dx: number; dy: number } | null) => {
      if (!playerRef.current || !floorRef.current || screen !== 'playing') return;
      const player = playerRef.current;
      const floor = floorRef.current;

      // 1. If user is actively aiming with the Joystick while pressing Strike, check that exact direction first!
      let targetX = player.x;
      let targetY = player.y;
      if (aimDir && (aimDir.dx !== 0 || aimDir.dy !== 0)) {
        targetX = player.x + aimDir.dx;
        targetY = player.y + aimDir.dy;
        if (aimDir.dx > 0) player.facing = 'right';
        else if (aimDir.dx < 0) player.facing = 'left';
        else if (aimDir.dy > 0) player.facing = 'down';
        else if (aimDir.dy < 0) player.facing = 'up';
      } else {
        if (player.facing === 'up') targetY--;
        else if (player.facing === 'down') targetY++;
        else if (player.facing === 'left') targetX--;
        else if (player.facing === 'right') targetX++;
      }

      let targetEnemy = floor.enemies.find((e) => e.x === targetX && e.y === targetY);

      // 2. If no enemy in aimed/facing direction, find closest adjacent enemy (including diagonals)
      if (!targetEnemy) {
        targetEnemy = floor.enemies.find(
          (e) => Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
        );
        if (targetEnemy) {
          if (targetEnemy.x > player.x) player.facing = 'right';
          else if (targetEnemy.x < player.x) player.facing = 'left';
          else if (targetEnemy.y > player.y) player.facing = 'down';
          else if (targetEnemy.y < player.y) player.facing = 'up';
        }
      }

    if (targetEnemy) {
      const result = executePlayerAttack(
        player,
        targetEnemy,
        addFloatingText,
        logCombat,
        spawnParticles,
        floor,
        spawnSlash
      );
      if (rendererRef.current) {
        rendererRef.current.triggerShake(result.triggeredBossPhase2 ? 14 : result.isCrit ? 9 : 4);
      }
      if (result.killed) {
        awardXpAndCheckLevel(player, targetEnemy.xpReward, addFloatingText, logCombat);
        setMonstersKilled((k) => k + 1);

        if (targetEnemy.archetype === 'boss' && floor.floorNumber >= 10) {
          setScreen('victory');
          return;
        }

        const dropChance = floor.floorEvent.type === 'cursed_mist' ? 0.5 : 0.35;
        if (Math.random() < dropChance) {
          const drop = generateRandomItem(floor.floorNumber);
          if (player.inventory.length < player.maxInventorySize) {
            player.inventory.push(drop);
            logCombat(`✨ Monster dropped: ${drop.name}! Added to pack.`, 'loot');
          }
        }
        const goldMult = floor.floorEvent.type === 'gilded_vault' ? 1.4 : 1.0;
        const gold = Math.round((10 + Math.random() * 15 * floor.floorNumber) * goldMult);
        player.stats.gold += gold;
        addFloatingText(`+${gold} 🪙`, targetEnemy.x, targetEnemy.y - 0.5, '#f59e0b');
      }
      advanceTurn();
      return;
    }

    // 3. Check if standing on or adjacent to Merchant, stairs, chest, or shrine
    if (floor.tiles[player.y]?.[player.x]?.type === 'merchant') {
      setIsMerchantOpen(true);
      return;
    }

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
        if (
          t.type === 'stairs_down' ||
          t.type === 'merchant' ||
          (t.type === 'chest' && !t.chest?.opened) ||
          (t.type === 'shrine' && !t.shrine?.used)
        ) {
          handlePlayerMove(d.x, d.y, false);
          return;
        }
      }
    }

    // 4. Otherwise, perform a weapon swing whoosh in air
    soundEngine.playAttack();
    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    spawnSlash(targetX, targetY, angle, '#f59e0b');
    spawnParticles(targetX, targetY, '#f59e0b', 5);
    logCombat('You swing your weapon into the gloom.', 'system');
    advanceTurn();
  }, [screen, addFloatingText, logCombat, spawnParticles, spawnSlash, advanceTurn, handlePlayerMove]);

  // Cast active skill
  const handleExecuteSkill = useCallback(
    (skillId: string, targetTile?: { x: number; y: number }) => {
      if (!playerRef.current || !floorRef.current) return;
      const player = playerRef.current;
      const floor = floorRef.current;
      const skill = SKILL_TREE_NODES[skillId];
      if (!skill) return;

      const pStats = computeTotalPlayerStats(player);
      const manaMult = floor.floorEvent.type === 'arcane_surge' ? 0.7 : 1.0;
      const effectiveManaCost = skill.manaCost ? Math.max(1, Math.round(skill.manaCost * manaMult)) : 0;

      // Check mana and cooldown
      if (effectiveManaCost && player.stats.mana < effectiveManaCost) {
        addFloatingText('Not enough Mana!', player.x, player.y - 0.4, '#38bdf8');
        return;
      }
      if (player.activeSkillCooldowns[skillId] && player.activeSkillCooldowns[skillId] > 0) {
        return;
      }

      // Deduct Mana and set cooldown
      if (effectiveManaCost) player.stats.mana -= effectiveManaCost;
      if (skill.cooldown) player.activeSkillCooldowns[skillId] = skill.cooldown;

      // Handle specific skill behaviors
      if (skill.id === 'w_heavy_strike') {
        const enemy = floor.enemies.find(
          (e) => Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
        );
        if (enemy) {
          const dmg = Math.round(pStats.attack * 1.8);
          enemy.hp -= dmg;
          enemy.statusEffects.push({ type: 'stun', duration: 1, power: 0 });
          soundEngine.playHit(true);
          spawnSlash(enemy.x, enemy.y, Math.atan2(enemy.y - player.y, enemy.x - player.x), '#f59e0b');
          if (rendererRef.current) rendererRef.current.triggerShake(8);
          addFloatingText(`💥 HEAVY CRUSH -${dmg}`, enemy.x, enemy.y - 0.4, '#f59e0b');
          logCombat(`You execute Heavy Strike on ${enemy.name} for ${dmg} damage and STUN them!`, 'player_attack');
        }
      } else if (skill.id === 'w_cleave' || skill.id === 'w_whirlwind') {
        const radius = skill.id === 'w_whirlwind' ? 2 : 1;
        let hits = 0;
        for (let a = 0; a < 4; a++) {
          spawnSlash(player.x, player.y, (a * Math.PI) / 2, '#fbbf24');
        }
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
        soundEngine.playSpell('fire');
        const target = targetTile
          ? floor.enemies.find((e) => e.x === targetTile.x && e.y === targetTile.y)
          : floor.enemies.find((e) => Math.abs(e.x - player.x) + Math.abs(e.y - player.y) <= 4);

        if (target) {
          spawnProjectile(player.x, player.y, target.x, target.y, '#f97316', 'firebolt');
          if (floor.tiles[target.y]?.[target.x]) {
            floor.tiles[target.y][target.x].decal = 'scorch';
          }
          const dmg = Math.round(pStats.attack * 1.5);
          target.hp -= dmg;
          target.statusEffects.push({ type: 'burn', duration: 2, power: 6 });
          addFloatingText(`🔥 -${dmg}`, target.x, target.y - 0.4, '#f97316');
          spawnParticles(target.x, target.y, '#f97316', 12);
          logCombat(`Firebolt incinerated ${target.name} for ${dmg} damage!`, 'skill');
        }
      } else if (skill.id === 'm_frost_nova') {
        soundEngine.playSpell('frost');
        spawnProjectile(player.x, player.y, player.x, player.y, '#38bdf8', 'frost_ring', 2.2);
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
        spawnProjectile(player.x, player.y, player.x, player.y, '#ef4444', 'meteor', 3.2);
        if (rendererRef.current) rendererRef.current.triggerShake(14);
        floor.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 3) {
            const dmg = Math.round(pStats.attack * 2.6);
            enemy.hp -= dmg;
            enemy.statusEffects.push({ type: 'burn', duration: 3, power: 10 });
            if (floor.tiles[enemy.y]?.[enemy.x]) {
              floor.tiles[enemy.y][enemy.x].decal = 'scorch';
            }
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
          spawnProjectile(player.x, player.y, target.x, target.y, '#c084fc', 'shadow_trail');
          player.x = target.x > player.x ? target.x - 1 : target.x + 1;
          player.y = target.y;
          const dmg = Math.round(pStats.attack * 1.6);
          target.hp -= dmg;
          spawnSlash(target.x, target.y, 0, '#c084fc');
          addFloatingText(`🗡️ SHADOW STRIKE -${dmg}`, target.x, target.y - 0.4, '#c084fc');
          logCombat(`Shadow Step blinked behind ${target.name} for ${dmg} critical damage!`, 'skill');
        }
      } else if (skill.id === 'r_smoke_screen') {
        soundEngine.playSpell('shadow');
        player.statusEffects.push({ type: 'invisibility', duration: 3, power: 0 });
        addFloatingText('💨 INVISIBLE', player.x, player.y - 0.4, '#94a3b8');
        logCombat('You vanished into smoke! Enemies cannot target you for 3 turns.', 'skill');
      } else if (skill.id === 'r_assassinate') {
        const target = floor.enemies.find(
          (e) => Math.abs(e.x - player.x) <= 1 && Math.abs(e.y - player.y) <= 1
        );
        if (target) {
          const isLowHp = target.hp < target.maxHp * 0.4;
          const mult = isLowHp ? 5.0 : 3.0;
          const dmg = Math.round(pStats.attack * mult);
          target.hp -= dmg;
          soundEngine.playHit(true);
          spawnSlash(target.x, target.y, Math.atan2(target.y - player.y, target.x - player.x), '#f43f5e');
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
    [advanceTurn, addFloatingText, logCombat, spawnParticles, spawnSlash, spawnProjectile]
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

      if (skill.targetType === 'self' || skill.targetType === 'adjacent_all') {
        handleExecuteSkill(skillId);
      } else {
        player.selectedSkillId = skillId;
        triggerHud();
      }
    },
    [handleExecuteSkill]
  );

  // Keyboard controls listener (including diagonal keys Q/E/Z/C and Numpad)
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
        if (isMerchantOpen) {
          setIsMerchantOpen(false);
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
        setIsMerchantOpen(false);
        return;
      }
      if (e.key === 'k' || e.key === 'K') {
        setIsSkillTreeOpen((prev) => !prev);
        setIsInventoryOpen(false);
        setIsMerchantOpen(false);
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        setIsCombatLogOpen((prev) => !prev);
        return;
      }

      if (isInventoryOpen || isSkillTreeOpen || isMerchantOpen) return;

      // 8-Way Movement & Bump Attack
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === '8') {
        e.preventDefault();
        handlePlayerMove(0, -1, false);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === '2') {
        e.preventDefault();
        handlePlayerMove(0, 1, false);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === '4') {
        e.preventDefault();
        handlePlayerMove(-1, 0, false);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === '6') {
        e.preventDefault();
        handlePlayerMove(1, 0, false);
      } else if (e.key === 'q' || e.key === 'Q' || e.key === '7') {
        e.preventDefault();
        handlePlayerMove(-1, -1, false);
      } else if (e.key === 'e' || e.key === 'E' || e.key === '9') {
        e.preventDefault();
        handlePlayerMove(1, -1, false);
      } else if (e.key === 'z' || e.key === 'Z' || e.key === '1') {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          handlePlayerMove(-1, 1, false);
          return;
        }
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handlePlayerMove(1, 1, false);
      } else if (e.key === ' ' || e.key === '5') {
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
  }, [
    screen,
    isInventoryOpen,
    isSkillTreeOpen,
    isMerchantOpen,
    isCombatLogOpen,
    handlePlayerMove,
    advanceTurn,
    handleSelectSkill,
  ]);

  // Main 60fps RequestAnimationFrame Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(rawDt, 0.05);

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

      // Update weapon slash arcs
      for (let i = slashesRef.current.length - 1; i >= 0; i--) {
        const s = slashesRef.current[i];
        s.life -= dt;
        if (s.life <= 0) {
          slashesRef.current.splice(i, 1);
        }
      }

      // Update spell projectiles
      for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const pr = projectilesRef.current[i];
        pr.life -= dt;
        if (pr.life <= 0) {
          projectilesRef.current.splice(i, 1);
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
                  Math.abs(e.x - playerRef.current!.x) + Math.abs(e.y - playerRef.current!.y) <=
                  skill.range!
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
          validTargets,
          slashesRef.current,
          projectilesRef.current
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

  // Pinch-to-Zoom & Camera Scale Handlers
  const handleZoomChange = useCallback((delta: number) => {
    if (!rendererRef.current) return;
    rendererRef.current.setTileSize(rendererRef.current.tileSize + delta);
  }, []);

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null && rendererRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const diff = newDist - pinchDistRef.current;
      if (Math.abs(diff) > 6) {
        rendererRef.current.setTileSize(rendererRef.current.tileSize + (diff > 0 ? 2 : -2));
        pinchDistRef.current = newDist;
      }
    }
  };

  const handleCanvasTouchEnd = () => {
    pinchDistRef.current = null;
  };

  // Canvas Mouse Click: move towards tile or execute skill on target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current || !playerRef.current || !floorRef.current || screen !== 'playing') return;
    const tile = rendererRef.current.screenToTile(e.clientX, e.clientY);

    if (playerRef.current.selectedSkillId) {
      handleExecuteSkill(playerRef.current.selectedSkillId, tile);
      return;
    }

    const dx = tile.x - playerRef.current.x;
    const dy = tile.y - playerRef.current.y;
    if (dx === 0 && dy === 0) return;

    const stepX = dx === 0 ? 0 : dx > 0 ? 1 : -1;
    const stepY = dy === 0 ? 0 : dy > 0 ? 1 : -1;
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      handlePlayerMove(stepX, 0, false);
    } else if (Math.abs(dy) > Math.abs(dx) * 1.5) {
      handlePlayerMove(0, stepY, false);
    } else {
      handlePlayerMove(stepX, stepY, false);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!rendererRef.current) return;
    hoveredTileRef.current = rendererRef.current.screenToTile(e.clientX, e.clientY);
  };

  // Inventory & Merchant Actions
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
      player.inventory = player.inventory.filter((i) => i.id !== item.id);
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

    if (item.type === 'potion') {
      soundEngine.playPotion();
      if (item.permanentAttackBonus) {
        player.stats.attack += item.permanentAttackBonus;
        addFloatingText(`+${item.permanentAttackBonus} PERMANENT ATK!`, player.x, player.y - 0.6, '#fbbf24');
        logCombat(`Drank ${item.name}! Base Attack permanently increased by +${item.permanentAttackBonus}!`, 'level_up');
      }
      if (item.permanentMaxHpBonus) {
        player.stats.maxHp += item.permanentMaxHpBonus;
        addFloatingText(`+${item.permanentMaxHpBonus} MAX HP!`, player.x, player.y - 0.6, '#10b981');
        logCombat(`Drank ${item.name}! Max Health permanently increased by +${item.permanentMaxHpBonus}!`, 'level_up');
      }
      const stats = computeTotalPlayerStats(player);
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
        spawnProjectile(player.x, player.y, player.x, player.y, '#f97316', 'meteor', 2.4);
        floorRef.current.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - player.x) + Math.abs(enemy.y - player.y) <= 2) {
            enemy.hp -= 35;
            addFloatingText('-35', enemy.x, enemy.y - 0.4, '#f97316');
          }
        });
        logCombat('Scroll of Hellfire unleashed searing flames on nearby foes!', 'skill');
      }
    }

    player.inventory = player.inventory.filter((i) => i.id !== item.id);
    advanceTurn();
  };

  const handleDropItem = (item: Item) => {
    if (!playerRef.current) return;
    playerRef.current.inventory = playerRef.current.inventory.filter((i) => i.id !== item.id);
    logCombat(`Discarded ${item.name}.`, 'system');
    triggerHud();
  };

  const handleBuyItem = (item: Item) => {
    if (!playerRef.current || !floorRef.current?.merchantPos) return;
    const player = playerRef.current;
    const mPos = floorRef.current.merchantPos;
    const merchant = floorRef.current.tiles[mPos.y]?.[mPos.x]?.merchant;
    if (!merchant) return;

    if (player.stats.gold < item.goldValue || player.inventory.length >= player.maxInventorySize) {
      return;
    }

    player.stats.gold -= item.goldValue;
    player.inventory.push(item);
    merchant.stock = merchant.stock.filter((i) => i.id !== item.id);
    soundEngine.playChest();
    addFloatingText(`Bought ${item.name}`, player.x, player.y - 0.5, '#10b981');
    logCombat(`🛒 Purchased ${item.name} from the Peddler for ${item.goldValue} Gold.`, 'loot');
    triggerHud();
  };

  const handleSellItem = (item: Item) => {
    if (!playerRef.current) return;
    const player = playerRef.current;
    const value = Math.max(5, Math.round(item.goldValue * 0.5));
    player.inventory = player.inventory.filter((i) => i.id !== item.id);
    player.stats.gold += value;
    soundEngine.playChest();
    addFloatingText(`+${value} 🪙`, player.x, player.y - 0.5, '#fbbf24');
    logCombat(`🪙 Sold ${item.name} for ${value} Gold.`, 'loot');
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

  const currentMerchant =
    floorRef.current?.merchantPos &&
    floorRef.current.tiles[floorRef.current.merchantPos.y]?.[floorRef.current.merchantPos.x]?.merchant;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-stone-950 text-stone-100 select-none touch-none">
      {/* Title Screen State */}
      {screen === 'title' && <TitleScreen onStartGame={handleStartGame} />}

      {/* Main Game Canvas (always mounted for zero-glitch state preservation) */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        className={`absolute inset-0 cursor-crosshair ${screen !== 'title' ? 'block' : 'hidden'}`}
      />

      {/* Floor Arrival & Special Event Atmospheric Banner */}
      {screen === 'playing' && floorBanner && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center bg-stone-950/95 border border-amber-500/60 px-5 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.85)] backdrop-blur-md text-center max-w-[90vw]">
          <div className="font-cinzel text-sm sm:text-base font-bold text-amber-400 tracking-wide">
            {floorBanner.title}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <span>{floorBanner.eventIcon}</span>
            <span className="font-cinzel font-bold" style={{ color: floorBanner.eventColor }}>
              {floorBanner.eventName}:
            </span>
            <span className="text-stone-300">{floorBanner.eventDesc}</span>
          </div>
        </div>
      )}

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
          onOpenMerchant={() => setIsMerchantOpen(true)}
          onTogglePause={() => setScreen('paused')}
          onMoveDirection={handlePlayerMove}
          onAimDirection={handleAimDirection}
          onActionAttack={handleActionAttack}
          onZoomChange={handleZoomChange}
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
          onSellItem={handleSellItem}
        />
      )}

      {/* Wandering Merchant Shop Modal */}
      {isMerchantOpen && playerRef.current && currentMerchant && (
        <MerchantModal
          player={playerRef.current}
          merchant={currentMerchant}
          onClose={() => setIsMerchantOpen(false)}
          onBuyItem={handleBuyItem}
          onSellItem={handleSellItem}
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
