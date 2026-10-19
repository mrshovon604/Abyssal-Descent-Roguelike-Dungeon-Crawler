/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Player, DungeonFloor, SkillNode } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export type ControllerSize = 'standard' | 'large' | 'xl';
export type ControllerMode = 'joystick' | 'dpad';

interface HUDProps {
  player: Player;
  floor: DungeonFloor;
  turnNumber: number;
  activeSkills: SkillNode[];
  onSkillSelect: (skillId: string) => void;
  onWaitTurn: () => void;
  onOpenInventory: () => void;
  onOpenSkillTree: () => void;
  onOpenCombatLog: () => void;
  onOpenMerchant?: () => void;
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
  onOpenInventory,
  onOpenSkillTree,
  onOpenCombatLog,
  onOpenMerchant,
  onTogglePause,
  onMoveDirection,
  onAimDirection,
  onActionAttack,
  onZoomChange,
  isCombatLogOpen,
}) => {
  // Mobile controller size preference
  const [controllerSize, setControllerSize] = useState<ControllerSize>(() => {
    try {
      const saved = localStorage.getItem('abyssal_ctrl_size');
      if (saved === 'standard' || saved === 'large' || saved === 'xl') return saved;
    } catch {}
    return 'large';
  });

  // Controller mode preference: defaults to 'joystick'
  const [controllerMode, setControllerMode] = useState<ControllerMode>(() => {
    try {
      const saved = localStorage.getItem('abyssal_ctrl_mode');
      if (saved === 'joystick' || saved === 'dpad') return saved;
    } catch {}
    return 'joystick';
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isMiniMapExpanded, setIsMiniMapExpanded] = useState(false);

  // Analog Joystick Visual State
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeOctant, setActiveOctant] = useState<{ dx: number; dy: number } | null>(null);
  const [isStrikePressed, setIsStrikePressed] = useState(false);

  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const holdTimerRef = useRef<number | null>(null);
  const activeDirRef = useRef<{ dx: number; dy: number } | null>(null);
  const hasSteppedInitialRef = useRef<boolean>(false);

  const handleSetSize = (size: ControllerSize) => {
    setControllerSize(size);
    try {
      localStorage.setItem('abyssal_ctrl_size', size);
    } catch {}
    soundEngine.haptic(20);
  };

  const handleSetMode = (mode: ControllerMode) => {
    setControllerMode(mode);
    try {
      localStorage.setItem('abyssal_ctrl_mode', mode);
    } catch {}
    soundEngine.haptic(20);
  };

  // Stop any active hold-to-move interval
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
    setKnobPos({ x: 0, y: 0 });
    setActiveOctant(null);
  }, [stopHoldTimerOnly]);

  useEffect(() => {
    return () => stopHoldTimerOnly();
  }, [stopHoldTimerOnly]);

  // Start or update continuous stepping loop while joystick/D-pad is held
  const startStepLoop = useCallback(
    (initialStep: boolean) => {
      stopHoldTimerOnly();

      if (initialStep && activeDirRef.current) {
        onMoveDirection(activeDirRef.current.dx, activeDirRef.current.dy, false);
      }

      holdTimerRef.current = window.setInterval(() => {
        if (!activeDirRef.current) {
          stopHoldTimerOnly();
          return;
        }
        const canContinue = onMoveDirection(
          activeDirRef.current.dx,
          activeDirRef.current.dy,
          true
        );
        if (canContinue) {
          soundEngine.haptic(8);
        }
      }, 165);
    },
    [onMoveDirection, stopHoldTimerOnly]
  );

  // Convert joystick (dx, dy) pixel offset into 8-way dungeon step
  const computeOctant = (dx: number, dy: number, deadzone: number): { dx: number; dy: number } | null => {
    const dist = Math.hypot(dx, dy);
    if (dist < deadzone) return null;

    const angle = Math.atan2(dy, dx); // -PI to PI
    const octantIdx = Math.round((angle / Math.PI) * 4);
    switch (octantIdx) {
      case 0:
        return { dx: 1, dy: 0 }; // Right
      case 1:
        return { dx: 1, dy: 1 }; // Down-Right
      case 2:
        return { dx: 0, dy: 1 }; // Down
      case 3:
        return { dx: -1, dy: 1 }; // Down-Left
      case 4:
      case -4:
        return { dx: -1, dy: 0 }; // Left
      case -3:
        return { dx: -1, dy: -1 }; // Up-Left
      case -2:
        return { dx: 0, dy: -1 }; // Up
      case -1:
        return { dx: 1, dy: -1 }; // Up-Right
      default:
        return null;
    }
  };

  // Get joystick dimensions based on controllerSize
  const getJoystickMetrics = () => {
    switch (controllerSize) {
      case 'xl':
        return { baseSize: 164, knobSize: 66, maxDist: 52, deadzone: 14 };
      case 'standard':
        return { baseSize: 124, knobSize: 50, maxDist: 38, deadzone: 11 };
      case 'large':
      default:
        return { baseSize: 144, knobSize: 58, maxDist: 45, deadzone: 13 };
    }
  };

  const joyMetrics = getJoystickMetrics();

  // Process joystick pointer coordinates
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
      soundEngine.haptic(12);

      // Trigger immediate step on first deflection from center, then continuous loop
      if (!hasSteppedInitialRef.current || isInitialTouch) {
        hasSteppedInitialRef.current = true;
        startStepLoop(true);
      } else if (holdTimerRef.current === null) {
        startStepLoop(false);
      }
    }
  };

  // Multi-touch isolated PointerDown on Joystick Base
  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Lock only this specific thumb pointerId to the joystick
    if (joystickPointerIdRef.current !== null) return;
    joystickPointerIdRef.current = e.pointerId;
    hasSteppedInitialRef.current = false;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    const rect = e.currentTarget.getBoundingClientRect();
    joystickCenterRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    setJoystickActive(true);
    soundEngine.haptic(15);
    updateJoystickFromPointer(e.clientX, e.clientY, true);
  };

  const handleJoystickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== joystickPointerIdRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateJoystickFromPointer(e.clientX, e.clientY, false);
  };

  const handleJoystickPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
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

  // D-Pad fallback hold-to-move handler
  const startDpadHoldMove = (dx: number, dy: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.haptic(18);
    activeDirRef.current = { dx, dy };
    if (onAimDirection) onAimDirection(dx, dy);
    startStepLoop(true);
  };

  // Render Corner Mini-Map Canvas
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

    // Draw visible enemies on mini-map
    floor.enemies.forEach((enemy) => {
      if (floor.tiles[enemy.y]?.[enemy.x]?.visible) {
        ctx.fillStyle = enemy.isBoss ? '#f43f5e' : '#ef4444';
        const s = enemy.isBoss ? scale + 1 : scale;
        ctx.fillRect(enemy.x * scale, enemy.y * scale, s, s);
      }
    });

    // Draw player dot
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

  const getSizeClasses = () => {
    switch (controllerSize) {
      case 'xl':
        return {
          dpadBtn: 'w-15 h-15 sm:w-17 sm:h-17 text-xl',
          dpadDiag: 'w-15 h-15 sm:w-17 sm:h-17 text-base',
          actionBtn: 'w-22 h-22 sm:w-24 sm:h-24 text-3xl',
          subActionBtn: 'w-15 h-15 text-xl',
          skillBtn: 'w-13 h-14 sm:w-14 sm:h-15 text-lg sm:text-xl',
        };
      case 'standard':
        return {
          dpadBtn: 'w-11 h-11 text-base',
          dpadDiag: 'w-11 h-11 text-xs',
          actionBtn: 'w-16 h-16 text-2xl',
          subActionBtn: 'w-12 h-12 text-base',
          skillBtn: 'w-11 h-12 text-base',
        };
      case 'large':
      default:
        return {
          dpadBtn: 'w-13 h-13 sm:w-14 sm:h-14 text-lg',
          dpadDiag: 'w-13 h-13 sm:w-14 sm:h-14 text-sm',
          actionBtn: 'w-20 h-20 text-3xl',
          subActionBtn: 'w-14 h-14 text-lg',
          skillBtn: 'w-12 h-13 sm:w-13 sm:h-14 text-base sm:text-lg',
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const manaCostMultiplier = floor.floorEvent?.type === 'arcane_surge' ? 0.7 : 1.0;

  // Multi-touch Strike handler (fires immediately onPointerDown even while left thumb holds Joystick)
  const handleStrikePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStrikePressed(true);
    soundEngine.haptic(30);
    // Pass current joystick aim direction so player strikes where they are aiming!
    onActionAttack(activeDirRef.current);
  };

  const handleStrikePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStrikePressed(false);
  };

  // Multi-touch Wait handler
  const handleWaitPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    soundEngine.haptic(15);
    onWaitTurn();
  };

  // Direction indicator badges around the joystick rim
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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 sm:p-3 md:p-4 select-none z-20 pb-safe pt-safe overflow-hidden">
      {/* =========================================================================
          TOP PERIMETER BAR: Compact Mobile-Optimized Status & Mini-Map
          ========================================================================= */}
      <div className="w-full flex justify-between items-start gap-1.5">
        {/* Left Status Cluster: Compact on mobile screens to maximize viewport */}
        <div className="flex flex-col gap-1">
          <div className="pointer-events-auto bg-stone-950/90 border border-stone-800/90 rounded-xl p-2 sm:p-2.5 shadow-xl backdrop-blur-sm min-w-[148px] sm:min-w-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className="font-cinzel text-[11px] sm:text-xs font-bold text-amber-400">
                LVL {player.stats.level}
              </span>
              <span className="font-mono-stat text-[9px] sm:text-[10px] text-stone-400 tabular-nums">
                XP {player.stats.xp}/{player.stats.xpToNextLevel}
              </span>
            </div>

            {/* XP Bar */}
            <div className="w-full h-1 bg-stone-900 rounded-full overflow-hidden mb-1.5 border border-stone-800/60">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${xpPercent}%` }}
              />
            </div>

            {/* HP Bar */}
            <div className="mb-1">
              <div className="flex justify-between text-[10px] font-mono-stat text-stone-200 mb-0.5">
                <span className="text-red-400 font-bold">❤️ HP</span>
                <span className="tabular-nums font-bold">
                  {player.stats.hp}/{player.stats.maxHp}
                </span>
              </div>
              <div className="w-full h-2 sm:h-2.5 bg-stone-900 border border-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>

            {/* Mana Bar */}
            <div>
              <div className="flex justify-between text-[10px] font-mono-stat text-stone-200 mb-0.5">
                <span className="text-sky-400 font-bold">💧 MP</span>
                <span className="tabular-nums font-bold">
                  {player.stats.mana}/{player.stats.maxMana}
                </span>
              </div>
              <div className="w-full h-1.5 sm:h-2 bg-stone-900 border border-stone-800 rounded overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-600 to-blue-500 transition-all duration-150"
                  style={{ width: `${manaPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Active Floor Event Pill */}
          {floor.floorEvent && floor.floorEvent.type !== 'none' && (
            <div
              className="pointer-events-auto bg-stone-950/90 border border-stone-800/90 rounded-lg px-2 py-0.5 shadow-lg backdrop-blur-sm flex items-center gap-1.5 max-w-[175px] sm:max-w-[230px]"
              title={floor.floorEvent.description}
            >
              <span className="text-xs shrink-0">{floor.floorEvent.icon}</span>
              <span
                className="font-cinzel text-[9px] sm:text-[10px] font-bold truncate"
                style={{ color: floor.floorEvent.color }}
              >
                {floor.floorEvent.name}
              </span>
            </div>
          )}
        </div>

        {/* Right Status, Mini-Map & Utility Controls */}
        <div className="pointer-events-auto flex items-start gap-1.5">
          {/* Depth, Gold & System Buttons */}
          <div className="bg-stone-950/90 border border-stone-800/90 rounded-xl px-2 py-1.5 text-right shadow-xl backdrop-blur-sm">
            <div className="font-cinzel text-[11px] sm:text-xs font-bold text-amber-400 truncate max-w-[115px] sm:max-w-none">
              {floor.floorNumber}F · {floor.theme.name}
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-mono-stat text-stone-300 mt-0.5">
              <span>
                🪙 <span className="text-amber-300 font-bold tabular-nums">{player.stats.gold}</span>
              </span>
              <span>
                ⏳ <span className="tabular-nums">{turnNumber}</span>
              </span>
            </div>

            <div className="flex items-center justify-end gap-1 mt-1">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.haptic(15);
                  setShowSettings((s) => !s);
                }}
                className="min-h-[28px] px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 hover:border-amber-500 text-stone-300 text-[9px] font-mono-stat font-semibold active:scale-95 cursor-pointer"
                title="Controller Settings"
              >
                🕹️ {controllerSize.toUpperCase()}
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.haptic(15);
                  soundEngine.toggleMute();
                }}
                className="w-7 h-7 rounded bg-stone-900 border border-stone-800 text-stone-300 flex items-center justify-center text-xs active:scale-95 cursor-pointer"
                title="Toggle Audio"
              >
                {soundEngine.getMuted() ? '🔇' : '🔊'}
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.haptic(15);
                  onTogglePause();
                }}
                className="w-7 h-7 rounded bg-stone-900 border border-stone-800 text-stone-300 flex items-center justify-center text-xs active:scale-95 cursor-pointer"
                title="Pause [Esc]"
              >
                ⏸️
              </button>
            </div>
          </div>

          {/* Interactive Corner Mini-Map & Zoom Cluster */}
          <div className="bg-stone-950/95 border border-stone-800 rounded-xl p-1 shadow-2xl backdrop-blur-md flex flex-col items-center">
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
      </div>

      {/* Controller Mode & Size Configuration Popover */}
      {showSettings && (
        <div className="pointer-events-auto mx-auto bg-stone-950/95 border border-amber-500/80 p-3 rounded-2xl shadow-2xl z-30 flex flex-col gap-2.5 max-w-[92vw]">
          <div className="flex items-center justify-between gap-4">
            <span className="font-cinzel text-xs font-bold text-amber-400">Controller Type:</span>
            <div className="flex gap-1.5">
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSetMode('joystick');
                }}
                className={`px-3 py-1 text-xs font-mono-stat font-bold rounded-lg transition-all cursor-pointer ${
                  controllerMode === 'joystick'
                    ? 'bg-amber-500 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-900 border border-stone-800 text-stone-400'
                }`}
              >
                🕹️ Joystick
              </button>
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleSetMode('dpad');
                }}
                className={`px-3 py-1 text-xs font-mono-stat font-bold rounded-lg transition-all cursor-pointer ${
                  controllerMode === 'dpad'
                    ? 'bg-amber-500 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-900 border border-stone-800 text-stone-400'
                }`}
              >
                ➕ D-Pad
              </button>
            </div>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowSettings(false);
              }}
              className="text-stone-400 hover:text-stone-100 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="font-cinzel text-xs font-bold text-amber-400">Controller Size:</span>
            <div className="flex gap-1.5">
              {(['standard', 'large', 'xl'] as ControllerSize[]).map((size) => (
                <button
                  key={size}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleSetSize(size);
                  }}
                  className={`px-3 py-1 text-xs font-mono-stat font-bold rounded-lg uppercase transition-all cursor-pointer ${
                    controllerSize === size
                      ? 'bg-amber-500 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                      : 'bg-stone-900 border border-stone-800 text-stone-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Skill Targeting Banner */}
      {player.selectedSkillId && (
        <div className="mx-auto bg-amber-950/95 border-2 border-amber-500 text-amber-200 px-3.5 py-1.5 rounded-full text-xs font-mono-stat shadow-2xl pointer-events-auto animate-pulse flex items-center gap-2.5">
          <span>🎯 Tap enemy/tile to cast</span>
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              soundEngine.haptic(15);
              onSkillSelect(player.selectedSkillId!);
            }}
            className="text-xs bg-amber-700 hover:bg-amber-600 px-2.5 py-0.5 rounded-full font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* =========================================================================
          BOTTOM PERIMETER: MULTI-TOUCH VIRTUAL JOYSTICK & COMBAT ACTION CLUSTER
          Left Thumb: 360° Analog Joystick (isolated pointerId capture)
          Right Thumb: Simultaneous Multi-Touch Strike, Wait & Skill Hotbar
          ========================================================================= */}
      <div className="w-full flex justify-between items-end gap-2 pt-1">
        {/* LEFT SIDE: QUICK MENU PILLS + ANALOG THUMBSTICK / D-PAD */}
        <div className="flex flex-col items-start gap-2">
          {/* Compact Utility Pills (Gear, Skills, Shop, Log) */}
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                onOpenInventory();
              }}
              className="min-h-[38px] flex items-center gap-1 px-2.5 py-1.5 bg-stone-950/90 border border-stone-800 active:border-amber-500 active:scale-95 text-stone-200 rounded-xl text-xs font-semibold shadow-lg cursor-pointer"
              title="Open Inventory [I]"
            >
              <span>🎒</span>
              <span className="hidden xs:inline">Gear</span>
              <span className="text-[10px] font-mono-stat text-stone-400 tabular-nums">
                {player.inventory.length}/{player.maxInventorySize}
              </span>
            </button>

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                onOpenSkillTree();
              }}
              className={`min-h-[38px] relative flex items-center gap-1 px-2.5 py-1.5 bg-stone-950/90 border rounded-xl text-xs font-semibold shadow-lg active:scale-95 cursor-pointer ${
                player.stats.skillPoints > 0
                  ? 'border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'border-stone-800 text-stone-200'
              }`}
              title="Open Skill Tree [K]"
            >
              <span>✨</span>
              <span>Skills</span>
              {player.stats.skillPoints > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 font-bold rounded-full text-[10px] animate-pulse">
                  +{player.stats.skillPoints}
                </span>
              )}
            </button>

            {isNearMerchant && onOpenMerchant && (
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  soundEngine.haptic(25);
                  onOpenMerchant();
                }}
                className="min-h-[38px] flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/95 border border-emerald-400 text-emerald-300 rounded-xl text-xs font-cinzel font-bold shadow-[0_0_16px_rgba(16,185,129,0.45)] animate-pulse active:scale-95 cursor-pointer"
              >
                <span>⚖️</span>
                <span>Shop</span>
              </button>
            )}

            <button
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                soundEngine.haptic(15);
                onOpenCombatLog();
              }}
              className={`min-h-[38px] min-w-[38px] px-2 py-1.5 bg-stone-950/90 border rounded-xl text-xs shadow-lg active:scale-95 cursor-pointer flex items-center justify-center ${
                isCombatLogOpen ? 'border-amber-500 text-amber-400' : 'border-stone-800 text-stone-300'
              }`}
              title="Toggle Log [L]"
            >
              📜
            </button>
          </div>

          {/* VIRTUAL ANALOG THUMBSTICK (JOYSTICK) OR 8-WAY D-PAD */}
          {controllerMode === 'joystick' ? (
            <div
              ref={joystickBaseRef}
              onPointerDown={handleJoystickPointerDown}
              onPointerMove={handleJoystickPointerMove}
              onPointerUp={handleJoystickPointerUpOrCancel}
              onPointerCancel={handleJoystickPointerUpOrCancel}
              style={{
                width: joyMetrics.baseSize,
                height: joyMetrics.baseSize,
              }}
              className={`pointer-events-auto relative rounded-full bg-stone-950/85 border-2 transition-colors duration-150 shadow-[0_0_30px_rgba(0,0,0,0.85)] backdrop-blur-md flex items-center justify-center touch-none cursor-grab active:cursor-grabbing ml-1 mb-0.5 ${
                joystickActive
                  ? 'border-amber-500/80 shadow-[0_0_24px_rgba(245,158,11,0.3)]'
                  : 'border-stone-700/80'
              }`}
            >
              {/* Inner Concentric Tactical Ring */}
              <div className="absolute inset-3 rounded-full border border-dashed border-stone-800/90 pointer-events-none" />
              <div className="absolute inset-7 rounded-full border border-stone-800/50 bg-stone-900/40 pointer-events-none" />

              {/* 8-Way Rim Directional Markers */}
              {rimDirections.map((dir) => {
                const isOctantActive =
                  activeOctant && activeOctant.dx === dir.dx && activeOctant.dy === dir.dy;
                const rad = (dir.angleDeg * Math.PI) / 180;
                const rimRadius = joyMetrics.baseSize / 2 - 12;
                const lx = Math.cos(rad) * rimRadius;
                const ly = Math.sin(rad) * rimRadius;

                return (
                  <span
                    key={`${dir.dx}_${dir.dy}`}
                    style={{
                      transform: `translate(${lx}px, ${ly}px)`,
                    }}
                    className={`absolute text-[10px] font-bold pointer-events-none transition-all duration-75 ${
                      isOctantActive
                        ? 'text-amber-400 scale-125 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]'
                        : 'text-stone-600'
                    }`}
                  >
                    {dir.label}
                  </span>
                );
              })}

              {/* Draggable Analog Thumbstick Knob */}
              <div
                style={{
                  width: joyMetrics.knobSize,
                  height: joyMetrics.knobSize,
                  transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
                  transition: joystickActive ? 'none' : 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                className={`rounded-full pointer-events-none flex items-center justify-center border-2 shadow-2xl ${
                  joystickActive
                    ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                    : 'bg-gradient-to-b from-stone-700 via-stone-800 to-stone-900 border-stone-500/80'
                }`}
              >
                {/* Inner Grip Texture on Thumbstick */}
                <div
                  className={`w-3/5 h-3/5 rounded-full border flex items-center justify-center ${
                    joystickActive
                      ? 'border-amber-900/50 bg-amber-500/40 text-stone-950'
                      : 'border-stone-600/60 bg-stone-800/80 text-amber-400/80'
                  }`}
                >
                  <span className="text-xs font-black select-none">
                    {activeOctant
                      ? rimDirections.find(
                          (d) => d.dx === activeOctant.dx && d.dy === activeOctant.dy
                        )?.label || '🕹️'
                      : '🕹️'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* 8-Way D-Pad Alternative Mode */
            <div
              onPointerUp={resetJoystick}
              onPointerCancel={resetJoystick}
              onPointerLeave={resetJoystick}
              className="pointer-events-auto grid grid-cols-3 gap-1 bg-stone-950/90 border border-stone-800/90 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md touch-none"
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
                <span className="leading-none text-sm">⏳</span>
                <span className="text-[8px] font-mono-stat uppercase">Rest</span>
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
        </div>

        {/* RIGHT SIDE: MULTI-TOUCH SKILL HOTBAR + WAIT & PRIMARY STRIKE CLUSTER */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 touch-none">
          {/* Active Skills Row (Multi-touch onPointerDown ready) */}
          <div className="flex items-center gap-1.5 bg-stone-950/90 border border-stone-800/90 p-1 rounded-xl shadow-xl backdrop-blur-sm">
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
                  className={`relative flex flex-col items-center justify-center ${sizeClasses.skillBtn} rounded-lg transition-all active:scale-90 cursor-pointer touch-none ${
                    !skill
                      ? 'bg-stone-950/60 border border-dashed border-stone-800/80 opacity-40 cursor-default'
                      : isSelected
                      ? 'bg-amber-950 border-2 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
                      : cooldown > 0 || !hasMana
                      ? 'bg-stone-900/60 border border-stone-800 opacity-50 cursor-not-allowed'
                      : 'bg-stone-900 border border-stone-700 hover:border-amber-500 active:border-amber-400'
                  }`}
                  title={skill ? `${skill.name}: ${skill.description}` : 'Empty Slot'}
                >
                  {skill ? (
                    <>
                      <span className="leading-none">{skill.icon}</span>
                      <span className="text-[9px] font-mono-stat text-sky-400 leading-none mt-0.5 font-bold">
                        {effectiveManaCost ? `${effectiveManaCost}m` : ''}
                      </span>

                      <span className="absolute -top-1.5 left-0.5 bg-stone-950 text-[8px] font-mono-stat px-1 rounded text-stone-300 border border-stone-800">
                        {idx + 1}
                      </span>

                      {cooldown > 0 && (
                        <div className="absolute inset-0 bg-stone-950/85 rounded-lg flex items-center justify-center font-mono-stat font-bold text-sm text-amber-400">
                          {cooldown}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-stone-700 text-xs font-mono-stat">{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Thumb Action Buttons: Wait + Primary Strike */}
          <div className="flex items-end gap-2.5 pr-1 pb-0.5">
            {/* Secondary Wait / Rest Button */}
            <button
              onPointerDown={handleWaitPointerDown}
              className={`${sizeClasses.subActionBtn} rounded-full bg-stone-900/95 border-2 border-stone-700/80 active:border-amber-400 text-stone-300 active:scale-90 active:bg-amber-600/30 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md touch-none`}
              title="Rest 1 Turn [Space]"
            >
              <span className="leading-none">⏳</span>
              <span className="text-[8px] font-mono-stat text-stone-400 font-bold uppercase mt-0.5">
                Wait
              </span>
            </button>

            {/* PRIMARY MULTI-TOUCH STRIKE / INTERACT BUTTON */}
            <button
              onPointerDown={handleStrikePointerDown}
              onPointerUp={handleStrikePointerUp}
              onPointerCancel={handleStrikePointerUp}
              onPointerLeave={handleStrikePointerUp}
              className={`${sizeClasses.actionBtn} rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-red-600 border-3 border-amber-200 text-stone-950 font-black flex flex-col items-center justify-center transition-transform duration-75 cursor-pointer touch-none ${
                isStrikePressed
                  ? 'scale-90 shadow-[0_0_40px_rgba(245,158,11,0.95)] brightness-110'
                  : 'shadow-[0_0_26px_rgba(245,158,11,0.55)]'
              }`}
              title="Strike / Interact (Multi-Touch Ready)"
            >
              <span className="leading-none filter drop-shadow">⚔️</span>
              <span className="text-[10px] font-cinzel font-black tracking-wider uppercase text-stone-950 leading-none mt-1">
                Strike
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
