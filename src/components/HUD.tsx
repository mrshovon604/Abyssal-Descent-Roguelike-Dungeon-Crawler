/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, DungeonFloor, SkillNode } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

export type ControllerSize = 'standard' | 'large' | 'xl';

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
  onTogglePause: () => void;
  onMoveDirection: (dx: number, dy: number) => void;
  onActionAttack: () => void;
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
  onTogglePause,
  onMoveDirection,
  onActionAttack,
  isCombatLogOpen,
}) => {
  // Mobile controller size preference (saved in localStorage)
  const [controllerSize, setControllerSize] = useState<ControllerSize>(() => {
    try {
      const saved = localStorage.getItem('abyssal_ctrl_size');
      if (saved === 'standard' || saved === 'large' || saved === 'xl') return saved;
    } catch {}
    // Default to 'large' for mobile devices
    return 'large';
  });

  const [showSettings, setShowSettings] = useState(false);

  const handleSetSize = (size: ControllerSize) => {
    setControllerSize(size);
    try {
      localStorage.setItem('abyssal_ctrl_size', size);
    } catch {}
    soundEngine.haptic(25);
  };

  const hpPercent = Math.max(0, Math.min(100, (player.stats.hp / player.stats.maxHp) * 100));
  const manaPercent = Math.max(0, Math.min(100, (player.stats.mana / player.stats.maxMana) * 100));
  const xpPercent = Math.max(0, Math.min(100, (player.stats.xp / player.stats.xpToNextLevel) * 100));

  // Determine button sizing based on selected controllerSize
  const getDpadSizeClasses = () => {
    switch (controllerSize) {
      case 'xl':
        return {
          btn: 'w-18 h-18 text-2xl',
          center: 'w-18 h-18 text-xl',
          actionBtn: 'w-20 h-20 text-3xl',
          subActionBtn: 'w-14 h-14 text-xl',
          skillBtn: 'w-15 h-16 text-xl',
          container: 'p-3',
        };
      case 'standard':
        return {
          btn: 'w-12 h-12 text-lg',
          center: 'w-12 h-12 text-base',
          actionBtn: 'w-14 h-14 text-2xl',
          subActionBtn: 'w-11 h-11 text-base',
          skillBtn: 'w-12 h-13 text-base',
          container: 'p-1.5',
        };
      case 'large':
      default:
        return {
          btn: 'w-15 h-15 text-xl',
          center: 'w-15 h-15 text-lg',
          actionBtn: 'w-17 h-17 text-2xl',
          subActionBtn: 'w-12 h-12 text-lg',
          skillBtn: 'w-13 h-14 text-lg',
          container: 'p-2',
        };
    }
  };

  const sizeClasses = getDpadSizeClasses();

  const handleDirectionPress = (dx: number, dy: number) => {
    soundEngine.haptic(20);
    onMoveDirection(dx, dy);
  };

  const handleAttackPress = () => {
    soundEngine.haptic(30);
    onActionAttack();
  };

  const handleWaitPress = () => {
    soundEngine.haptic(15);
    onWaitTurn();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-5 select-none z-20 pb-safe pt-safe overflow-hidden">
      {/* =========================================================================
          TOP PERIMETER BAR: Mobile Notch Friendly, Compact & High Contrast
          ========================================================================= */}
      <div className="w-full flex justify-between items-start gap-2">
        {/* Left Status: HP, MP, XP, Level (Optimized for Android Screens) */}
        <div className="pointer-events-auto bg-stone-950/90 border border-stone-800 rounded-xl p-2 md:p-3 shadow-xl backdrop-blur-sm min-w-[170px] sm:min-w-[210px] md:min-w-[240px]">
          <div className="flex items-center justify-between mb-1">
            <span className="font-cinzel text-xs font-bold text-amber-400">
              LVL {player.stats.level}
            </span>
            <span className="font-mono-stat text-[10px] sm:text-[11px] text-stone-400">
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
            <div className="flex justify-between text-[10px] sm:text-[11px] font-mono-stat text-stone-200 mb-0.5">
              <span className="flex items-center gap-1 text-red-400 font-bold">
                <span>❤️</span> HP
              </span>
              <span className="tabular-nums font-bold">
                {player.stats.hp} / {player.stats.maxHp}
              </span>
            </div>
            <div className="w-full h-2.5 sm:h-3 bg-stone-900 border border-stone-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Mana Bar */}
          <div>
            <div className="flex justify-between text-[10px] sm:text-[11px] font-mono-stat text-stone-200 mb-0.5">
              <span className="flex items-center gap-1 text-sky-400 font-bold">
                <span>💧</span> MP
              </span>
              <span className="tabular-nums font-bold">
                {player.stats.mana} / {player.stats.maxMana}
              </span>
            </div>
            <div className="w-full h-2 bg-stone-900 border border-stone-800 rounded-md overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-blue-500 transition-all duration-150"
                style={{ width: `${manaPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Status & Quick Utilities */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          {/* Depth & Gold Capsule */}
          <div className="bg-stone-950/90 border border-stone-800 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 text-right shadow-xl backdrop-blur-sm">
            <div className="font-cinzel text-xs font-bold text-amber-400 truncate max-w-[140px] sm:max-w-none">
              Depth {floor.floorNumber}F · {floor.theme.name}
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] sm:text-[11px] font-mono-stat text-stone-300 mt-0.5">
              <span>🪙 <span className="text-amber-300 font-bold tabular-nums">{player.stats.gold}</span></span>
              <span>⏳ <span className="tabular-nums">{turnNumber}</span></span>
            </div>
          </div>

          {/* Top Control Utility Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Controller Size Config Button */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                setShowSettings((s) => !s);
              }}
              className="min-w-[36px] min-h-[36px] px-2 py-1 rounded-lg bg-stone-900/90 border border-stone-800 hover:border-amber-500 text-stone-300 hover:text-amber-400 flex items-center justify-center text-xs font-mono-stat font-semibold transition-all active:scale-95 cursor-pointer shadow-md"
              title="Change Controller Size"
            >
              🎮 {controllerSize.toUpperCase()}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                soundEngine.toggleMute();
              }}
              className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-lg bg-stone-900/90 border border-stone-800 hover:border-amber-500 text-stone-300 hover:text-amber-400 flex items-center justify-center text-xs transition-all active:scale-95 cursor-pointer shadow-md"
              title="Toggle Audio"
            >
              {soundEngine.getMuted() ? '🔇' : '🔊'}
            </button>

            {/* Pause [Esc] */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onTogglePause();
              }}
              className="min-w-[36px] min-h-[36px] w-9 h-9 rounded-lg bg-stone-900/90 border border-stone-800 hover:border-amber-500 text-stone-300 hover:text-amber-400 flex items-center justify-center text-xs font-mono-stat font-bold transition-all active:scale-95 cursor-pointer shadow-md"
              title="Pause [Esc]"
            >
              ⏸️
            </button>
          </div>
        </div>
      </div>

      {/* Controller Size Selector Dropdown (When triggered) */}
      {showSettings && (
        <div className="pointer-events-auto mx-auto bg-stone-950/95 border border-amber-600/80 p-3 rounded-xl shadow-2xl z-30 flex items-center gap-3 animate-in fade-in zoom-in-95">
          <span className="font-cinzel text-xs font-bold text-amber-400">Pad Size:</span>
          <div className="flex gap-1.5">
            {(['standard', 'large', 'xl'] as ControllerSize[]).map((size) => (
              <button
                key={size}
                onClick={() => handleSetSize(size)}
                className={`px-3 py-1.5 text-xs font-mono-stat font-bold rounded-lg uppercase transition-all cursor-pointer ${
                  controllerSize === size
                    ? 'bg-amber-500 text-stone-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings(false)}
            className="text-stone-500 hover:text-stone-300 text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Skill Targeting Banner */}
      {player.selectedSkillId && (
        <div className="mx-auto bg-amber-950/95 border-2 border-amber-500 text-amber-200 px-4 py-2 rounded-full text-xs font-mono-stat shadow-2xl pointer-events-auto animate-pulse flex items-center gap-3">
          <span>🎯 Tap target enemy or tile to cast</span>
          <button
            onClick={() => {
              soundEngine.haptic(15);
              onSkillSelect(player.selectedSkillId!);
            }}
            className="text-xs bg-amber-700 hover:bg-amber-600 px-2.5 py-1 rounded-full font-bold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* =========================================================================
          BOTTOM PERIMETER: Big Mobile Gamepad & Tactical Action Clusters
          Optimized for Android thumbs with large physical touch targets
          ========================================================================= */}
      <div className="w-full flex flex-col gap-2">
        {/* Quick Menu Bar: Gear, Skills, Log */}
        <div className="w-full flex justify-between items-center px-1">
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Inventory [I] */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onOpenInventory();
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 bg-stone-950/90 border border-stone-800 active:border-amber-500 active:scale-95 hover:bg-stone-900 text-stone-200 rounded-xl text-xs font-semibold shadow-lg transition-all cursor-pointer"
              title="Open Inventory [I]"
            >
              <span className="text-base">🎒</span>
              <span>Gear</span>
              <span className="text-[10px] font-mono-stat text-stone-400 tabular-nums">
                ({player.inventory.length}/{player.maxInventorySize})
              </span>
            </button>

            {/* Skill Tree [K] */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onOpenSkillTree();
              }}
              className={`min-h-[44px] relative flex items-center gap-1.5 px-3 py-2 bg-stone-950/90 border rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95 cursor-pointer ${
                player.stats.skillPoints > 0
                  ? 'border-amber-500 text-amber-300 hover:bg-amber-950/40 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                  : 'border-stone-800 active:border-stone-600 text-stone-200 hover:bg-stone-900'
              }`}
              title="Open Skill Tree [K]"
            >
              <span className="text-base">✨</span>
              <span>Skills</span>
              {player.stats.skillPoints > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-stone-950 font-bold rounded-full text-[10px] animate-pulse">
                  +{player.stats.skillPoints}
                </span>
              )}
            </button>

            {/* Combat Log [L] */}
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onOpenCombatLog();
              }}
              className={`min-h-[44px] min-w-[44px] px-2.5 py-2 bg-stone-950/90 border rounded-xl text-xs font-medium shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center ${
                isCombatLogOpen ? 'border-amber-500 text-amber-400' : 'border-stone-800 text-stone-300'
              }`}
              title="Toggle Log [L]"
            >
              📜
            </button>
          </div>

          {/* Active Skills Hotbar (Centered above controller or top right) */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-stone-950/90 border border-stone-800/90 p-1 rounded-xl shadow-xl backdrop-blur-sm">
            {[0, 1, 2, 3].map((idx) => {
              const skill = activeSkills[idx];
              const cooldown = skill ? (player.activeSkillCooldowns[skill.id] || 0) : 0;
              const hasMana = skill && skill.manaCost ? player.stats.mana >= skill.manaCost : true;
              const isSelected = skill && player.selectedSkillId === skill.id;

              return (
                <button
                  key={idx}
                  disabled={!skill || cooldown > 0 || !hasMana}
                  onClick={() => {
                    soundEngine.haptic(20);
                    skill && onSkillSelect(skill.id);
                  }}
                  className={`relative flex flex-col items-center justify-center ${sizeClasses.skillBtn} rounded-lg transition-all active:scale-90 cursor-pointer ${
                    !skill
                      ? 'bg-stone-950/60 border border-dashed border-stone-800/80 opacity-40 cursor-default'
                      : isSelected
                      ? 'bg-amber-950 border-2 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
                      : cooldown > 0 || !hasMana
                      ? 'bg-stone-900/60 border border-stone-800 opacity-50 cursor-not-allowed'
                      : 'bg-stone-900 border border-stone-700 hover:border-amber-500 active:border-amber-400 hover:bg-stone-800'
                  }`}
                  title={skill ? `${skill.name}: ${skill.description}` : 'Empty Slot'}
                >
                  {skill ? (
                    <>
                      <span className="leading-none">{skill.icon}</span>
                      <span className="text-[9px] font-mono-stat text-sky-400 leading-none mt-0.5 font-bold">
                        {skill.manaCost ? `${skill.manaCost}m` : ''}
                      </span>

                      {/* Hotkey number */}
                      <span className="absolute -top-1.5 left-0.5 bg-stone-950 text-[8px] font-mono-stat px-1 rounded text-stone-300 border border-stone-800">
                        {idx + 1}
                      </span>

                      {/* Cooldown Overlay */}
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
        </div>

        {/* =========================================================================
            BIG D-PAD & ACTION CONTROLLER (SPLIT DUAL THUMB PAD FOR ANDROID)
            ========================================================================= */}
        <div className="w-full flex justify-between items-end gap-2 pt-1">
          {/* LEFT THUMB ZONE: BIG TACTILE VIRTUAL D-PAD */}
          <div
            className={`pointer-events-auto grid grid-cols-3 gap-1 bg-stone-950/90 border border-stone-800/90 ${sizeClasses.container} rounded-2xl shadow-2xl backdrop-blur-md`}
          >
            {/* Top Row */}
            <div />
            <button
              onClick={() => handleDirectionPress(0, -1)}
              className={`${sizeClasses.btn} rounded-xl bg-gradient-to-b from-stone-800 to-stone-900 border-t border-stone-700 border-b-2 border-b-stone-950 active:scale-90 active:from-amber-600/40 active:to-amber-700/60 active:border-amber-500 text-amber-400 flex items-center justify-center font-black transition-all cursor-pointer shadow-lg`}
              title="Move Up"
            >
              ▲
            </button>
            <div />

            {/* Middle Row */}
            <button
              onClick={() => handleDirectionPress(-1, 0)}
              className={`${sizeClasses.btn} rounded-xl bg-gradient-to-r from-stone-800 to-stone-900 border-l border-stone-700 border-b-2 border-b-stone-950 active:scale-90 active:from-amber-600/40 active:to-amber-700/60 active:border-amber-500 text-amber-400 flex items-center justify-center font-black transition-all cursor-pointer shadow-lg`}
              title="Move Left"
            >
              ◀
            </button>

            {/* Center: Wait / Rest 1 Turn */}
            <button
              onClick={handleWaitPress}
              className={`${sizeClasses.center} rounded-xl bg-stone-900 border border-stone-800 active:scale-90 active:bg-amber-600/40 active:border-amber-500 text-stone-300 hover:text-amber-400 flex flex-col items-center justify-center transition-all cursor-pointer shadow-inner`}
              title="Wait a Turn [Space]"
            >
              <span className="leading-none">⏳</span>
              <span className="text-[8px] font-mono-stat text-stone-400 uppercase font-semibold mt-0.5">
                Rest
              </span>
            </button>

            <button
              onClick={() => handleDirectionPress(1, 0)}
              className={`${sizeClasses.btn} rounded-xl bg-gradient-to-l from-stone-800 to-stone-900 border-r border-stone-700 border-b-2 border-b-stone-950 active:scale-90 active:from-amber-600/40 active:to-amber-700/60 active:border-amber-500 text-amber-400 flex items-center justify-center font-black transition-all cursor-pointer shadow-lg`}
              title="Move Right"
            >
              ▶
            </button>

            {/* Bottom Row */}
            <div />
            <button
              onClick={() => handleDirectionPress(0, 1)}
              className={`${sizeClasses.btn} rounded-xl bg-gradient-to-t from-stone-800 to-stone-900 border-b-2 border-b-stone-950 active:scale-90 active:from-amber-600/40 active:to-amber-700/60 active:border-amber-500 text-amber-400 flex items-center justify-center font-black transition-all cursor-pointer shadow-lg`}
              title="Move Down"
            >
              ▼
            </button>
            <div />
          </div>

          {/* RIGHT THUMB ZONE: BIG ACTION & ATTACK CLUSTER */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Secondary Wait / Rest button */}
            <button
              onClick={handleWaitPress}
              className={`${sizeClasses.subActionBtn} rounded-2xl bg-stone-900/95 border border-stone-700/80 hover:border-amber-500 text-stone-300 active:scale-90 active:bg-amber-600/30 active:border-amber-400 flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl backdrop-blur-md`}
              title="Rest 1 Turn [Space]"
            >
              <span className="leading-none">⏳</span>
              <span className="text-[9px] font-mono-stat text-stone-400 font-bold uppercase mt-0.5">
                Wait
              </span>
            </button>

            {/* PRIMARY BIG ATTACK / INTERACT BUTTON */}
            <button
              onClick={handleAttackPress}
              className={`${sizeClasses.actionBtn} rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-red-600 border-2 border-amber-400 text-stone-950 font-black shadow-[0_0_24px_rgba(245,158,11,0.5)] active:scale-90 active:shadow-[0_0_35px_rgba(245,158,11,0.9)] flex flex-col items-center justify-center transition-all cursor-pointer`}
              title="Attack / Interact [Action]"
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
