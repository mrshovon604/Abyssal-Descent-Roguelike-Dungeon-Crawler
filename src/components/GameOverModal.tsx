/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Player, RunHistoryRecord } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface GameOverModalProps {
  player: Player;
  floorNumber: number;
  turnNumber: number;
  monstersKilled: number;
  causeOfDeath: string;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  player,
  floorNumber,
  turnNumber,
  monstersKilled,
  causeOfDeath,
  onRestart,
}) => {
  useEffect(() => {
    soundEngine.playDeath();

    // Record run to history
    try {
      const record: RunHistoryRecord = {
        id: `run_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        characterClass: `Level ${player.stats.level} Adventurer`,
        floorReached: floorNumber,
        level: player.stats.level,
        monstersKilled,
        goldCollected: player.stats.gold,
        turnsSurvived: turnNumber,
        causeOfDeath,
        won: false,
      };

      const existing = JSON.parse(localStorage.getItem('abyssal_history') || '[]');
      existing.unshift(record);
      localStorage.setItem('abyssal_history', JSON.stringify(existing.slice(0, 30)));
    } catch {}
  }, [player, floorNumber, turnNumber, monstersKilled, causeOfDeath]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-red-900/80 rounded-xl shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden text-center p-8">
        {/* Tombstone Icon / Skull */}
        <div className="text-5xl mb-3">⚰️</div>

        <h2 className="font-cinzel text-3xl font-black text-red-500 uppercase tracking-widest">
          YOUR JOURNEY ENDS
        </h2>
        <p className="text-xs text-stone-400 mt-1 uppercase tracking-wider font-mono-stat">
          Perished on Dungeon Depth {floorNumber} · Permanent Death
        </p>

        <div className="my-5 p-3 bg-red-950/30 border border-red-900/50 rounded text-xs text-red-300 font-medium">
          Cause: {causeOfDeath}
        </div>

        {/* Run Chronicle Statistics */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-stone-900/60 border border-stone-800 rounded-lg text-left text-xs font-mono-stat mb-6">
          <div>
            <div className="text-stone-400">Hero Level</div>
            <div className="text-stone-100 font-bold text-base mt-0.5">{player.stats.level}</div>
          </div>
          <div>
            <div className="text-stone-400">Floor Reached</div>
            <div className="text-stone-100 font-bold text-base mt-0.5">Depth {floorNumber}</div>
          </div>
          <div>
            <div className="text-stone-400">Foes Vanquished</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">{monstersKilled}</div>
          </div>
          <div>
            <div className="text-stone-400">Gold Plundered</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">{player.stats.gold} 🪙</div>
          </div>
          <div>
            <div className="text-stone-400">Turns Survived</div>
            <div className="text-stone-300 font-bold text-base mt-0.5">{turnNumber}</div>
          </div>
          <div>
            <div className="text-stone-400">Skills Mastered</div>
            <div className="text-stone-300 font-bold text-base mt-0.5">
              {player.unlockedSkills.length}
            </div>
          </div>
        </div>

        {/* Restart Button (Touch Friendly) */}
        <button
          onClick={() => {
            soundEngine.haptic(35);
            onRestart();
          }}
          className="w-full min-h-[54px] py-4 bg-gradient-to-r from-red-800 via-red-700 to-red-800 hover:from-red-700 hover:to-red-600 active:scale-95 text-stone-100 font-cinzel font-bold text-sm sm:text-base uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] cursor-pointer"
        >
          Descend Again (New Seed)
        </button>
      </div>
    </div>
  );
};
