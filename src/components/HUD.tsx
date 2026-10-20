/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, DungeonFloor, SkillNode } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';

export type ControllerSize = 'standard' | 'large' | 'xl';
export type ControllerMode = 'joystick' | 'dpad';

interface HUDProps {
  player: Player;
  floor: DungeonFloor;
  turnNumber: number;
  activeSkills: SkillNode[];
  onSkillSelect: (skillId: string) => void;
  onWaitTurn: () => void;
  onQuickPotion: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenCombatLog: () => void;
  onOpenMerchant?: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onMoveDirection: (dx: number, dy: number, isHoldRepeat?: boolean) => boolean;
  onAimDirection?: (dx: number, dy: number) => void;
  onActionAttack: (aimDir?: { dx: number; dy: number } | null) => void;
  onZoomChange: (delta: number) => void;
  isCombatLogOpen: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  floor,
  turnNumber,
  activeSkills,
  onSkillSelect,
  onWaitTurn,
  onQuickPotion,
  onOpenInventory,
  onOpenSkillTree,
  onOpenCombatLog,
  onOpenMerchant,
  onOpenSettings,
  onTogglePause,
  onMoveDirection,
  onAimDirection,
  onActionAttack,
  onZoomChange,
  isCombatLogOpen,
}) => {
  const [controllerSize, setControllerSize] = useState<ControllerSize>(
    () => soundEngine.getSettings().controllerSize
  );

  const [controllerMode, setControllerMode] = useState<ControllerMode>(
    () => soundEngine.getSettings().controllerMode
  );

  useEffect(() => {
    return soundEngine.subscribe((s) => {
      setControllerSize(s.controllerSize);
      setControllerMode(s.controllerMode);
    });
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMiniMapExpanded, setIsMiniMapExpanded] = useState(false);

  // Floating Analog Joystick Visual State
  const [joystickActive, setJoystickActive] = useState(false);
  const [floatingOrigin, setFloatingOrigin] = useState<{ x: number; y: number } | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeOctant, setActiveOctant] = useState<{ dx: number; dy: number } | null>(null);
  const [isStrikePressed, setIsStrikePressed] = useState(false);

  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const joystickZoneRef = useRef<HTMLDivElement>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const holdTimerRef = useRef<number | null>(null);
  const activeDirRef = useRef<{ dx: number; dy: number } | null>(null);
  const hasSteppedInitialRef = useRef<boolean>(false);

  // Keep latest onMoveDirection in ref so hold interval never resets on HUD re-render
  const onMoveDirectionRef = useRef(onMoveDirection);
  useEffect(() => {
    onMoveDirectionRef.current = onMoveDirection;
  }, [onMoveDirection]);

  const handleSetSize = (size: ControllerSize) => {
    setControllerSize(size);
    soundEngine.updateSettings({ controllerSize: size });
    soundEngine.haptic(20, 'ui');
  };

  const handleSetMode = (mode: ControllerMode) => {
    setControllerMode(mode);
    soundEngine.updateSettings({ controllerMode: mode });
    soundEngine.haptic(20, 'ui');
  };

  const stopHoldTimerOnly = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const resetJoystick = useCallback(() => {
    stopHoldTimerOnly();
    joystickPointerIdRef.current = null;
    activeDirRef.current = null;
    hasSteppedInitialRef.current = false;
    setJoystickActive(false);
    setFloatingOrigin(null);
    setKnobPos({ x: 0, y: 0 });
    setActiveOctant(null);
  }, [stopHoldTimerOnly]);

  useEffect(() => {
    return () => stopHoldTimerOnly();
  }, [stopHoldTimerOnly]);

  const startStepLoop = useCallback(
    (initialStep: boolean) => {
      stopHoldTimerOnly();

      if (initialStep && activeDirRef.current) {
        onMoveDirectionRef.current(activeDirRef.current.dx, activeDirRef.current.dy, false);
      }

      holdTimerRef.current = window.setInterval(() => {
        if (!activeDirRef.current) {
          stopHoldTimerOnly();
          return;
        }
        const canContinue = onMoveDirectionRef.current(
          activeDirRef.current.dx,
          activeDirRef.current.dy,
          true
        );
        if (canContinue) {
          soundEngine.haptic(8, 'walk');
        }
      }, 165);
    },
    [stopHoldTimerOnly]
  );

  const computeOctant = (
    dx: number,
    dy: number,
    deadzone: number
  ): { dx: number; dy: number } | null => {
    const dist = Math.hypot(dx, dy);
    if (dist < deadzone) return null;

    const angle = Math.atan2(dy, dx);
    const octantIdx = Math.round((angle / Math.PI) * 4);
    switch (octantIdx) {
      case 0:
        return { dx: 1, dy: 0 };
      case 1:
        return { dx: 1, dy: 1 };
      case 2:
        return { dx: 0, dy: 1 };
      case 3:
        return { dx: -1, dy: 1 };
      case 4:
      case -4:
        return { dx: -1, dy: 0 };
      case -3:
        return { dx: -1, dy: -1 };
      case -2:
        return { dx: 0, dy: -1 };
      case -1:
        return { dx: 1, dy: -1 };
      default:
        return null;
    }
  };

  const getJoystickMetrics = () => {
    switch (controllerSize) {
      case 'xl':
        return { baseSize: 146, knobSize: 58, maxDist: 46, deadzone: 12 };
      case 'standard':
        return { baseSize: 112, knobSize: 44, maxDist: 34, deadzone: 10 };
      case 'large':
      default:
        return { baseSize: 128, knobSize: 50, maxDist: 40, deadzone: 11 };
    }
  };

  const joyMetrics = getJoystickMetrics();

  const updateJoystickFromPointer = (clientX: number, clientY: number, isInitialTouch: boolean) => {
    const rawDx = clientX - joystickCenterRef.current.x;
    const rawDy = clientY - joystickCenterRef.current.y;
    const dist = Math.hypot(rawDx, rawDy);
    const maxDist = joyMetrics.maxDist;

    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(rawDy, rawDx);
    const visualX = dist > 0 ? Math.cos(angle) * clampedDist : 0;
    const visualY = dist > 0 ? Math.sin(angle) * clampedDist : 0;

    setKnobPos({ x: visualX, y: visualY });

    const newOctant = computeOctant(rawDx, rawDy, joyMetrics.deadzone);
    const prevOctant = activeDirRef.current;

    if (!newOctant) {
      activeDirRef.current = null;
      setActiveOctant(null);
      stopHoldTimerOnly();
      return;
    }

    const changedDirection =
      !prevOctant || prevOctant.dx !== newOctant.dx || prevOctant.dy !== newOctant.dy;

    activeDirRef.current = newOctant;
    setActiveOctant(newOctant);

    if (changedDirection) {
      if (onAimDirection) {
        onAimDirection(newOctant.dx, newOctant.dy);
      }
      soundEngine.haptic(10, 'walk');

      if (!hasSteppedInitialRef.current || isInitialTouch) {
        hasSteppedInitialRef.current = true;
        startStepLoop(true);
      } else if (holdTimerRef.current === null) {
        startStepLoop(false);
      }
    }
  };

  // Floating Left-Half Touch Zone: Spawns Joystick Base wherever the left thumb touches!
  const handleFloatingZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (joystickPointerIdRef.current !== null) return;
    joystickPointerIdRef.current = e.pointerId;
    hasSteppedInitialRef.current = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const halfBase = joyMetrics.baseSize / 2 + 8;
    const clampedX = Math.max(
      halfBase,
      Math.min(window.innerWidth * 0.48 - halfBase / 2, e.clientX)
    );
    const clampedY = Math.max(
      110 + halfBase,
      Math.min(window.innerHeight - halfBase - 12, e.clientY)
    );

    joystickCenterRef.current = { x: clampedX, y: clampedY };
    setFloatingOrigin({ x: clampedX, y: clampedY });
    setJoystickActive(true);
    setKnobPos({ x: 0, y: 0 });
    soundEngine.haptic(12, 'walk');
  };

  const handleFloatingZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickPointerIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY, false);
  };

  const handleFloatingZonePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickPointerIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}
    resetJoystick();
  };

  const startDpadHoldMove = (dx: number, dy: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.haptic(14, 'walk');
    activeDirRef.current = { dx, dy };
    if (onAimDirection) onAimDirection(dx, dy);
    startStepLoop(true);
  };

  // Render Corner Mini-Map Canvas (Kept As Is in Top-Right)
  useEffect(() => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = isMiniMapExpanded ? 4 : 2;
    canvas.width = floor.width * scale;
    canvas.height = floor.height * scale;

    ctx.fillStyle = '#09080b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const tile = floor.tiles[y][x];
        if (!tile.explored) continue;

        if (tile.type === 'wall') {
          ctx.fillStyle = tile.visible ? '#44403c' : '#292524';
        } else if (tile.type === 'stairs_down') {
          ctx.fillStyle = '#c084fc';
        } else if (tile.type === 'merchant') {
          ctx.fillStyle = '#10b981';
        } else if (tile.type === 'chest' && !tile.chest?.opened) {
          ctx.fillStyle = '#fbbf24';
        } else if (tile.type === 'shrine' && !tile.shrine?.used) {
          ctx.fillStyle = '#38bdf8';
        } else {
          ctx.fillStyle = tile.visible ? '#57534e' : '#1c1917';
        }

        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    floor.enemies.forEach((enemy) => {
      if (floor.tiles[enemy.y]?.[enemy.x]?.visible) {
        ctx.fillStyle = enemy.isBoss ? '#f43f5e' : '#ef4444';
        const s = enemy.isBoss ? scale + 1 : scale;
        ctx.fillRect(enemy.x * scale, enemy.y * scale, s, s);
      }
    });

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.x * scale - 0.5, player.y * scale - 0.5, scale + 1, scale + 1);
  }, [floor, player.x, player.y, turnNumber, isMiniMapExpanded]);

  const hpPercent = Math.max(0, Math.min(100, (player.stats.hp / player.stats.maxHp) * 100));
  const manaPercent = Math.max(0, Math.min(100, (player.stats.mana / player.stats.maxMana) * 100));
  const xpPercent = Math.max(0, Math.min(100, (player.stats.xp / player.stats.xpToNextLevel) * 100));

  const isNearMerchant =
    floor.merchantPos &&
    Math.abs(player.x - floor.merchantPos.x) <= 1 &&
    Math.abs(player.y - floor.merchantPos.y) <= 1;

  // Count available potions in backpack for the Quick-Potion button
  const potionCount = player.inventory.filter((i) => i.type === 'potion').length;

  const getSizeClasses = () => {
    switch (controllerSize) {
      case 'xl':
        return {
          dpadBtn: 'w-12 h-12 sm:w-14 sm:h-14 text-base',
          dpadDiag: 'w-12 h-12 sm:w-14 sm:h-14 text-xs',
          actionBtn: 'w-24 h-24 sm:w-27 sm:h-27 text-4xl',
          subActionBtn: 'w-11 h-11 sm:w-12 sm:h-12 text-base',
          skillBtn: 'w-9 h-9 sm:w-10 sm:h-10 text-sm',
        };
      case 'standard':
        return {
          dpadBtn: 'w-9.5 h-9.5 text-xs',
          dpadDiag: 'w-9.5 h-9.5 text-[10px]',
          actionBtn: 'w-[78px] h-[78px] text-2xl',
          subActionBtn: 'w-9.5 h-9.5 text-xs',
          skillBtn: 'w-8 h-8 sm:w-9 sm:h-9 text-xs',
        };
      case 'large':
      default:
        return {
          dpadBtn: 'w-11 h-11 sm:w-12 sm:h-12 text-sm',
          dpadDiag: 'w-11 h-11 sm:w-12 sm:h-12 text-xs',
          actionBtn: 'w-[90px] h-[90px] sm:w-24 sm:h-24 text-3xl sm:text-4xl',
          subActionBtn: 'w-10 h-10 sm:w-11 sm:h-11 text-sm',
          skillBtn: 'w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 text-xs sm:text-sm',
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const manaCostMultiplier = floor.floorEvent?.type === 'arcane_surge' ? 0.7 : 1.0;

  const handleStrikePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStrikePressed(true);
    soundEngine.haptic(30, 'strike');
    onActionAttack(activeDirRef.current);
  };

  const handleStrikePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStrikePressed(false);
  };

  const handleWaitPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.haptic(12, 'walk');
    onWaitTurn();
  };

  const handleQuickPotionPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.haptic(25, 'strike');
    onQuickPotion();
  };

  const rimDirections: { dx: number; dy: number; label: string; angleDeg: number }[] = [
    { dx: 0, dy: -1, label: '▲', angleDeg: -90 },
    { dx: 1, dy: -1, label: '↗', angleDeg: -45 },
    { dx: 1, dy: 0, label: '▶', angleDeg: 0 },
    { dx: 1, dy: 1, label: '↘', angleDeg: 45 },
    { dx: 0, dy: 1, label: '▼', angleDeg: 90 },
    { dx: -1, dy: 1, label: '↙', angleDeg: 135 },
    { dx: -1, dy: 0, label: '◀', angleDeg: 180 },
    { dx: -1, dy: -1, label: '↖', angleDeg: -135 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3.5 select-none z-20 pb-safe pt-safe overflow-hidden">
      {/* =========================================================================
          TOP BAR: Minimal HP/Mana Bars + Single Menu Button (Left) | Mini-Map As Is (Right)
          ========================================================================= */}
      <div className="w-full flex justify-between items-start gap-2 relative z-30">
        {/* Top-Left: Minimalist HP/Mana Bars + Single Unified Menu Button */}
        <div className="flex items-start gap-1.5">
          {/* Ultra-Clean Minimal HP & Mana Pill */}
          <div className="pointer-events-auto bg-stone-950/85 border border-stone-800/80 rounded-xl px-2.5 py-1.5 shadow-lg backdrop-blur-md w-[132px] sm:w-[164px]">
            <div className="flex items-center justify-between text-[10px] font-mono-stat mb-1">
              <span className="font-cinzel font-bold text-amber-400">Lv.{player.stats.level}</span>
              <span className="text-stone-400">{floor.floorNumber}F</span>
              <span className="text-amber-300 font-bold tabular-nums">🪙{player.stats.gold}</span>
            </div>

            {/* Minimal HP Bar */}
            <div className="relative w-full h-2.5 bg-stone-900 rounded-full overflow-hidden mb-1 border border-stone-800/80">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono-stat font-bold text-white/90 drop-shadow">
                {player.stats.hp}/{player.stats.maxHp}
              </span>
            </div>

            {/* Minimal Mana Bar */}
            <div className="relative w-full h-2 bg-stone-900 rounded-full overflow-hidden border border-stone-800/80">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-blue-400 transition-all duration-150"
                style={{ width: `${manaPercent}%` }}
              />
            </div>

            {/* Thin XP Underline */}
            <div className="w-full h-0.5 bg-stone-900 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-amber-400 transition-all duration-200"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Single Unified Menu Toggle Button */}
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.haptic(15);
              setIsMenuOpen((prev) => !prev);
            }}
            className={`pointer-events-auto relative h-10 px-3 rounded-xl bg-stone-950/85 border backdrop-blur-md shadow-lg flex items-center gap-1.5 text-xs font-cinzel font-bold active:scale-95 transition-all cursor-pointer ${
              isMenuOpen
                ? 'border-amber-400 text-amber-300'
                : 'border-stone-800/80 text-stone-200 hover:border-stone-700'
            }`}
            title="Open Quick Menu"
          >
            <span className="text-sm leading-none">{isMenuOpen ? '✕' : '☰'}</span>
            <span className="hidden xs:inline">Menu</span>
            {player.stats.skillPoints > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
            )}
            {player.stats.skillPoints > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute -top-1 -right-1" />
            )}
          </button>

          {/* Contextual Shop Pill (Only visible when standing next to Merchant) */}
          {isNearMerchant && onOpenMerchant && (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(25);
                onOpenMerchant();
              }}
              className="pointer-events-auto h-10 px-3 bg-emerald-950/90 border border-emerald-400 text-emerald-300 rounded-xl text-xs font-cinzel font-bold shadow-[0_0_14px_rgba(16,185,129,0.4)] animate-pulse active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              <span>⚖️</span>
              <span>Shop</span>
            </button>
          )}
        </div>

        {/* Top-Right: Interactive Corner Mini-Map & Zoom Cluster (Kept As Is) */}
        <div className="pointer-events-auto bg-stone-950/95 border border-stone-800 rounded-xl p-1 shadow-2xl backdrop-blur-md flex flex-col items-center">
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.haptic(15);
              setIsMiniMapExpanded((prev) => !prev);
            }}
            className="relative rounded-lg overflow-hidden border border-stone-800 cursor-pointer"
            title="Tap to expand/collapse Mini-Map"
          >
            <canvas
              ref={miniMapCanvasRef}
              className="block"
              style={{
                width: isMiniMapExpanded ? 160 : 72,
                height: isMiniMapExpanded ? 160 : 72,
              }}
            />
            <span className="absolute bottom-0.5 right-0.5 text-[8px] font-mono-stat text-stone-400 bg-black/75 px-1 rounded">
              {isMiniMapExpanded ? '✕' : '🗺️'}
            </span>
          </div>

          <div className="flex items-center justify-between w-full gap-1 mt-1">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(12);
                onZoomChange(-6);
              }}
              className="flex-1 py-0.5 rounded bg-stone-900 border border-stone-800 text-[9px] font-mono-stat text-stone-300 active:scale-95 cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(12);
                onZoomChange(6);
              }}
              className="flex-1 py-0.5 rounded bg-stone-900 border border-stone-800 text-[9px] font-mono-stat text-stone-300 active:scale-95 cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Unified Quick Menu Popover Drawer (Opened via ☰ Menu button) */}
      {isMenuOpen && (
        <div className="pointer-events-auto absolute top-15 left-2 sm:left-3.5 z-40 w-64 bg-stone-950/95 border border-amber-500/70 rounded-2xl p-3 shadow-[0_12px_40px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                setIsMenuOpen(false);
                onOpenInventory();
              }}
              className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-95"
            >
              <span>🎒 Gear</span>
              <span className="text-[10px] font-mono-stat text-stone-400">
                {player.inventory.length}/{player.maxInventorySize}
              </span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                setIsMenuOpen(false);
                onOpenSkillTree();
              }}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer active:scale-95 ${
                player.stats.skillPoints > 0
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-200'
              }`}
            >
              <span>✨ Skills</span>
              {player.stats.skillPoints > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 font-bold rounded-full text-[10px]">
                  +{player.stats.skillPoints}
                </span>
              )}
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                setIsMenuOpen(false);
                onOpenCombatLog();
              }}
              className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isCombatLogOpen
                  ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-300'
              }`}
            >
              <span>📜</span>
              <span>Combat Log</span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                setIsMenuOpen(false);
                onTogglePause();
              }}
              className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>⏸️</span>
              <span>Pause</span>
            </button>
          </div>

          {/* Controller Mode & Size Switcher inside Unified Menu */}
          <div className="border-t border-stone-800/90 pt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-stat uppercase text-stone-400">Control</span>
              <div className="flex gap-1">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSetMode('joystick');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono-stat font-bold rounded-md cursor-pointer ${
                    controllerMode === 'joystick'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-900 border border-stone-800 text-stone-400'
                  }`}
                >
                  🕹️ Floating Stick
                </button>
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSetMode('dpad');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-mono-stat font-bold rounded-md cursor-pointer ${
                    controllerMode === 'dpad'
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-900 border border-stone-800 text-stone-400'
                  }`}
                >
                  ➕ D-Pad
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-stat uppercase text-stone-400">Size</span>
              <div className="flex gap-1">
                {(['standard', 'large', 'xl'] as ControllerSize[]).map((size) => (
                  <button
                    key={size}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleSetSize(size);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-mono-stat font-bold rounded-md uppercase cursor-pointer ${
                      controllerSize === size
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-900 border border-stone-800 text-stone-400'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.haptic(15, 'ui');
                  setIsMenuOpen(false);
                  onOpenSettings();
                }}
                className="flex-1 min-h-[34px] px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-amber-500/50 text-[11px] font-semibold text-amber-300 flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <span>⚙️</span>
                <span>Settings</span>
              </button>
              <PWAInstallButton compact onLaunchAppPlay={() => setIsMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Active Skill Targeting Banner */}
      {player.selectedSkillId && (
        <div className="mx-auto bg-amber-950/95 border border-amber-500 text-amber-200 px-3 py-1 rounded-full text-xs font-mono-stat shadow-2xl pointer-events-auto animate-pulse flex items-center gap-2 z-30">
          <span>🎯 Tap target to cast</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.haptic(15);
              onSkillSelect(player.selectedSkillId!);
            }}
            className="text-[11px] bg-amber-700 px-2 py-0.5 rounded-full font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* =========================================================================
          LOWER PLAYFIELD: FLOATING LEFT-HALF JOYSTICK & LOCKED RIGHT-THUMB ARC
          ========================================================================= */}
      <div className="w-full relative pointer-events-none">
        {/* LEFT HALF: FLOATING ANALOG JOYSTICK ZONE (Spawns wherever left thumb touches!) */}
        {controllerMode === 'joystick' ? (
          <>
            {/* Invisible Multi-Touch Left-Half Capture Zone (Safe below top-left HUD in both portrait & landscape) */}
            <div
              ref={joystickZoneRef}
              onPointerDown={handleFloatingZonePointerDown}
              onPointerMove={handleFloatingZonePointerMove}
              onPointerUp={handleFloatingZonePointerUpOrCancel}
              onPointerCancel={handleFloatingZonePointerUpOrCancel}
              className="pointer-events-auto fixed left-0 bottom-0 w-[48vw] h-[calc(100dvh-86px)] z-20 touch-none cursor-grab active:cursor-grabbing"
            />

            {/* Joystick Base: Always fixed so it never alters document flow or shifts right-side buttons */}
            <div
              style={
                joystickActive && floatingOrigin
                  ? {
                      position: 'fixed',
                      left: floatingOrigin.x - joyMetrics.baseSize / 2,
                      top: floatingOrigin.y - joyMetrics.baseSize / 2,
                      width: joyMetrics.baseSize,
                      height: joyMetrics.baseSize,
                    }
                  : {
                      width: joyMetrics.baseSize,
                      height: joyMetrics.baseSize,
                    }
              }
              className={`pointer-events-none rounded-full bg-stone-950/75 border-2 transition-opacity duration-150 backdrop-blur-sm flex items-center justify-center z-25 ${
                joystickActive
                  ? 'opacity-100 border-amber-500/85 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
                  : 'fixed left-5 sm:left-8 top-[64dvh] -translate-y-1/2 opacity-60 border-stone-700/70 shadow-xl'
              }`}
            >
              {/* Subtle Inner Ring */}
              <div className="absolute inset-3 rounded-full border border-dashed border-stone-800/80 pointer-events-none" />

              {/* 8-Way Rim Directional Markers */}
              {rimDirections.map((dir) => {
                const isOctantActive =
                  activeOctant && activeOctant.dx === dir.dx && activeOctant.dy === dir.dy;
                const rad = (dir.angleDeg * Math.PI) / 180;
                const rimRadius = joyMetrics.baseSize / 2 - 10;
                const lx = Math.cos(rad) * rimRadius;
                const ly = Math.sin(rad) * rimRadius;

                return (
                  <span
                    key={`${dir.dx}_${dir.dy}`}
                    style={{
                      transform: `translate(${lx}px, ${ly}px)`,
                    }}
                    className={`absolute text-[8px] font-bold pointer-events-none transition-all duration-75 ${
                      isOctantActive
                        ? 'text-amber-400 scale-125 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]'
                        : 'text-stone-600/80'
                    }`}
                  >
                    {dir.label}
                  </span>
                );
              })}

              {/* Thumbstick Knob */}
              <div
                style={{
                  width: joyMetrics.knobSize,
                  height: joyMetrics.knobSize,
                  transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
                  transition: joystickActive
                    ? 'none'
                    : 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className={`rounded-full pointer-events-none flex items-center justify-center border-2 shadow-xl ${
                  joystickActive
                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.7)]'
                    : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-stone-500/70'
                }`}
              >
                <span className="text-xs font-black select-none text-stone-950">
                  {activeOctant
                    ? rimDirections.find(
                        (d) => d.dx === activeOctant.dx && d.dy === activeOctant.dy
                      )?.label || '🕹️'
                    : '🕹️'}
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Raised Ergonomic D-Pad Mode (Slightly lower than vertical middle) */
          <div
            onPointerUp={resetJoystick}
            onPointerCancel={resetJoystick}
            onPointerLeave={resetJoystick}
            className="pointer-events-auto fixed left-4 sm:left-7 top-[64dvh] -translate-y-1/2 grid grid-cols-3 gap-1 bg-stone-950/85 border border-stone-800/80 p-1 rounded-2xl shadow-2xl backdrop-blur-md touch-none z-30"
          >
            <button
              onPointerDown={(e) => startDpadHoldMove(-1, -1, e)}
              className={`${sizeClasses.dpadDiag} rounded-xl bg-stone-900 border border-stone-800 active:bg-amber-600/40 text-stone-400 flex items-center justify-center font-bold cursor-pointer`}
            >
              ↖
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(0, -1, e)}
              className={`${sizeClasses.dpadBtn} rounded-xl bg-stone-800 border border-stone-700 active:bg-amber-600/40 text-amber-400 flex items-center justify-center font-black cursor-pointer`}
            >
              ▲
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(1, -1, e)}
              className={`${sizeClasses.dpadDiag} rounded-xl bg-stone-900 border border-stone-800 active:bg-amber-600/40 text-stone-400 flex items-center justify-center font-bold cursor-pointer`}
            >
              ↗
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(-1, 0, e)}
              className={`${sizeClasses.dpadBtn} rounded-xl bg-stone-800 border border-stone-700 active:bg-amber-600/40 text-amber-400 flex items-center justify-center font-black cursor-pointer`}
            >
              ◀
            </button>
            <button
              onPointerDown={handleWaitPointerDown}
              className={`${sizeClasses.dpadBtn} rounded-xl bg-stone-900 border border-stone-800 active:bg-amber-600/40 text-stone-300 flex flex-col items-center justify-center cursor-pointer`}
            >
              <span className="leading-none text-xs">⏳</span>
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(1, 0, e)}
              className={`${sizeClasses.dpadBtn} rounded-xl bg-stone-800 border border-stone-700 active:bg-amber-600/40 text-amber-400 flex items-center justify-center font-black cursor-pointer`}
            >
              ▶
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(-1, 1, e)}
              className={`${sizeClasses.dpadDiag} rounded-xl bg-stone-900 border border-stone-800 active:bg-amber-600/40 text-stone-400 flex items-center justify-center font-bold cursor-pointer`}
            >
              ↙
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(0, 1, e)}
              className={`${sizeClasses.dpadBtn} rounded-xl bg-stone-800 border border-stone-700 active:bg-amber-600/40 text-amber-400 flex items-center justify-center font-black cursor-pointer`}
            >
              ▼
            </button>
            <button
              onPointerDown={(e) => startDpadHoldMove(1, 1, e)}
              className={`${sizeClasses.dpadDiag} rounded-xl bg-stone-900 border border-stone-800 active:bg-amber-600/40 text-stone-400 flex items-center justify-center font-bold cursor-pointer`}
            >
              ↘
            </button>
          </div>
        )}

        {/* RIGHT SIDE: ERGONOMIC THUMB ARC (Slightly lower than vertical middle + Landscape Overlap-Safe) */}
        <div className="pointer-events-auto fixed right-3 sm:right-6 top-[62dvh] landscape:top-auto landscape:bottom-3 sm:landscape:top-[64dvh] sm:landscape:bottom-auto -translate-y-1/2 landscape:translate-y-0 sm:landscape:-translate-y-1/2 flex flex-col landscape:flex-row sm:landscape:flex-col items-end gap-2 touch-none shrink-0 z-30">
          {/* Streamlined Icon-Only Active Skills Row */}
          <div className="flex items-center gap-1 bg-stone-950/80 border border-stone-800/80 p-1 rounded-xl shadow-lg backdrop-blur-sm">
            {[0, 1, 2, 3].map((idx) => {
              const skill = activeSkills[idx];
              const cooldown = skill ? player.activeSkillCooldowns[skill.id] || 0 : 0;
              const effectiveManaCost =
                skill && skill.manaCost
                  ? Math.max(1, Math.round(skill.manaCost * manaCostMultiplier))
                  : 0;
              const hasMana =
                skill && effectiveManaCost ? player.stats.mana >= effectiveManaCost : true;
              const isSelected = skill && player.selectedSkillId === skill.id;

              return (
                <button
                  key={idx}
                  disabled={!skill || cooldown > 0 || !hasMana}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!skill || cooldown > 0 || !hasMana) return;
                    soundEngine.haptic(20);
                    onSkillSelect(skill.id);
                  }}
                  className={`relative flex items-center justify-center ${sizeClasses.skillBtn} rounded-lg transition-all active:scale-90 cursor-pointer touch-none ${
                    !skill
                      ? 'bg-stone-950/40 border border-dashed border-stone-800/60 opacity-35 cursor-default'
                      : isSelected
                      ? 'bg-amber-950 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : cooldown > 0 || !hasMana
                      ? 'bg-stone-900/60 border border-stone-800 opacity-45 cursor-not-allowed'
                      : 'bg-stone-900 border border-stone-700 hover:border-amber-500 active:border-amber-400'
                  }`}
                  title={skill ? `${skill.name} (${effectiveManaCost} MP)` : 'Empty Slot'}
                >
                  {skill ? (
                    <>
                      <span className="leading-none">{skill.icon}</span>
                      {cooldown > 0 && (
                        <div className="absolute inset-0 bg-stone-950/85 rounded-lg flex items-center justify-center font-mono-stat font-bold text-xs text-amber-400">
                          {cooldown}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-stone-700 text-[9px] font-mono-stat">{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ergonomic Right-Thumb Combat Arc: Wait + Quick-Potion + Primary Strike */}
          <div className="flex items-end gap-2">
            {/* Wait / Rest Button */}
            <button
              onPointerDown={handleWaitPointerDown}
              className={`${sizeClasses.subActionBtn} rounded-full bg-stone-900/90 border-2 border-stone-700/80 active:border-amber-400 text-stone-300 active:scale-90 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md touch-none mb-0.5`}
              title="Rest 1 Turn [Space]"
            >
              <span className="leading-none">⏳</span>
              <span className="text-[7px] font-mono-stat text-stone-400 font-bold uppercase mt-0.5">
                Wait
              </span>
            </button>

            {/* Quick-Potion Heal Button (Right next to Strike) */}
            <button
              onPointerDown={handleQuickPotionPointerDown}
              className={`${sizeClasses.subActionBtn} relative rounded-full border-2 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md touch-none mb-1.5 ${
                potionCount > 0
                  ? 'bg-emerald-950/90 border-emerald-500/80 active:border-emerald-300 text-emerald-300 active:scale-90 shadow-[0_0_14px_rgba(16,185,129,0.3)]'
                  : 'bg-stone-900/60 border-stone-800 text-stone-500 opacity-55'
              }`}
              title="Quick-Use Potion [H]"
            >
              <span className="leading-none">🧪</span>
              <span className="text-[8px] font-mono-stat font-bold leading-none mt-0.5">
                ×{potionCount}
              </span>
            </button>

            {/* PRIMARY MULTI-TOUCH STRIKE / INTERACT BUTTON (Sized smaller than Joystick) */}
            <button
              onPointerDown={handleStrikePointerDown}
              onPointerUp={handleStrikePointerUp}
              onPointerCancel={handleStrikePointerUp}
              onPointerLeave={handleStrikePointerUp}
              className={`${sizeClasses.actionBtn} rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 border-2 border-amber-200 text-stone-950 font-black flex flex-col items-center justify-center transition-transform duration-75 cursor-pointer touch-none ${
                isStrikePressed
                  ? 'scale-90 shadow-[0_0_40px_rgba(245,158,11,0.95)] brightness-110'
                  : 'shadow-[0_0_22px_rgba(245,158,11,0.5)]'
              }`}
              title="Strike / Interact (Multi-Touch Ready)"
            >
              <span className="leading-none filter drop-shadow">⚔️</span>
              <span className="text-[8px] font-cinzel font-black tracking-wider uppercase text-stone-950 leading-none mt-0.5">
                Strike
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
