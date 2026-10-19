/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { CombatLogEntry } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface CombatLogProps {
  entries: CombatLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const CombatLog: React.FC<CombatLogProps> = ({ entries, isOpen, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-28 sm:bottom-32 left-2 sm:left-4 z-40 max-w-[calc(100vw-1rem)] w-80 sm:w-96 max-h-56 sm:max-h-64 bg-stone-950/95 border border-stone-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-2 bg-stone-900 border-b border-stone-800 text-stone-200 font-cinzel text-xs font-semibold">
        <span>Combat & Event Chronicle</span>
        <button
          onClick={() => {
            soundEngine.haptic(15);
            onClose();
          }}
          className="min-h-[36px] min-w-[36px] text-stone-400 hover:text-stone-200 active:text-stone-100 flex items-center justify-center text-xs font-mono-stat cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="p-3 overflow-y-auto space-y-1.5 font-mono-stat max-h-52">
        {entries.slice(-50).map((entry) => {
          let color = 'text-stone-300';
          if (entry.type === 'player_attack') color = 'text-amber-300';
          else if (entry.type === 'enemy_attack') color = 'text-red-400';
          else if (entry.type === 'level_up') color = 'text-yellow-400 font-bold';
          else if (entry.type === 'loot') color = 'text-emerald-400';
          else if (entry.type === 'shrine') color = 'text-sky-300';
          else if (entry.type === 'danger') color = 'text-rose-400';

          return (
            <div key={entry.id} className={`${color} leading-relaxed text-[11px]`}>
              <span className="text-stone-600 mr-1.5">[{entry.turn}]</span>
              {entry.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};
