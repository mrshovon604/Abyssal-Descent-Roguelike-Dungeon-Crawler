/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Player, RunHistoryRecord } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface VictoryModalProps {
  player: Player;
  turnNumber: number;
  monstersKilled: number;
  onRestart: () => void;
  onReturnToSelect?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  player,
  turnNumber,
  monstersKilled,
  onRestart,
  onReturnToSelect,
}) => {
  useEffect(() => {
    soundEngine.playLevelUp();

    try {
      const record: RunHistoryRecord = {
        id: `run_vic_${Date.now()}`,
        date: new Date().toLocaleDateString(),
        characterClass: `Abyssal Conqueror (Lvl ${player.stats.level})`,
        floorReached: 10,
        level: player.stats.level,
        monstersKilled,
        goldCollected: player.stats.gold,
        turnsSurvived: turnNumber,
        causeOfDeath: 'VICTORIOUS: Slew the Abyssal Lord Malakor',
        won: true,
      };

      const existing = JSON.parse(localStorage.getItem('abyssal_history') || '[]');
      existing.unshift(record);
      localStorage.setItem('abyssal_history', JSON.stringify(existing.slice(0, 30)));
    } catch {}
  }, [player, turnNumber, monstersKilled]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-lg bg-stone-950 border border-amber-500/80 rounded-xl shadow-[0_0_60px_rgba(245,158,11,0.35)] overflow-hidden text-center p-8">
        <div className="text-6xl mb-3 animate-bounce">👑</div>

        <h2 className="font-cinzel text-3xl font-black text-amber-400 uppercase tracking-widest">
          ABYSSAL CONQUEST
        </h2>
        <p className="text-xs text-amber-200 mt-1 uppercase tracking-wider font-mono-stat">
          Malakor has fallen · The Abyssal Heart is claimed
        </p>

        <div className="my-5 p-4 bg-amber-950/40 border border-amber-600/40 rounded-lg text-xs text-amber-300 leading-relaxed">
          Through sheer skill, strategy, and steel, you conquered the 10 depths of the Abyss and emerged an immortal legend.
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 bg-stone-900/60 border border-stone-800 rounded-lg text-left text-xs font-mono-stat mb-6">
          <div>
            <div className="text-stone-400">Final Level</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">{player.stats.level}</div>
          </div>
          <div>
            <div className="text-stone-400">Depths Cleared</div>
            <div className="text-stone-100 font-bold text-base mt-0.5">10 / 10</div>
          </div>
          <div>
            <div className="text-stone-400">Total Kills</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">{monstersKilled}</div>
          </div>
          <div>
            <div className="text-stone-400">Treasury Gold</div>
            <div className="text-amber-400 font-bold text-base mt-0.5">{player.stats.gold} 🪙</div>
          </div>
        </div>

        <button
          onClick={() => {
            soundEngine.haptic(35);
            onRestart();
          }}
          className="w-full min-h-[54px] py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-cinzel font-bold text-sm sm:text-base uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] cursor-pointer"
        >
          Embark on a New Legend
        </button>

        {onReturnToSelect && (
          <button
            onClick={() => {
              soundEngine.haptic(25);
              onReturnToSelect();
            }}
            className="w-full mt-2 min-h-[44px] py-3 bg-stone-900 border border-stone-700 hover:border-amber-500/60 active:scale-95 text-stone-300 hover:text-amber-400 font-cinzel font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Choose Another Dungeon
          </button>
        )}
      </div>
    </div>
  );
};
