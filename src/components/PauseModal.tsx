/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-md bg-stone-950 border border-stone-800 rounded-xl shadow-2xl p-6 text-center">
        <h2 className="font-cinzel text-xl font-bold text-amber-400 uppercase tracking-widest mb-4">
          Game Paused
        </h2>

        {/* Controls cheat-sheet */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-3 text-left text-xs font-mono-stat space-y-1.5 text-stone-300 mb-6">
          <div className="flex justify-between">
            <span className="text-stone-400">Move / Bump Attack</span>
            <span className="text-amber-400">WASD / Arrow Keys</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Wait a Turn / Rest</span>
            <span className="text-amber-400">Spacebar</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Cast Active Skills</span>
            <span className="text-amber-400">1, 2, 3, 4</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Inventory & Relics</span>
            <span className="text-amber-400">I</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Codex & Skill Tree</span>
            <span className="text-amber-400">K</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Combat Log</span>
            <span className="text-amber-400">L</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-400">Mouse Interaction</span>
            <span className="text-amber-400">Click to Move / Target</span>
          </div>
        </div>

        {/* Action Buttons (Touch Friendly) */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              onResume();
            }}
            className="w-full min-h-[48px] py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 active:scale-95 text-stone-950 font-bold font-cinzel rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg"
          >
            Resume Expedition [Esc]
          </button>

          <button
            onClick={handleToggleMute}
            className="w-full min-h-[44px] py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-95 border border-stone-800 text-stone-200 rounded-xl text-xs transition-all cursor-pointer"
          >
            {isMuted ? '🔇 Unmute Web Audio' : '🔊 Mute Web Audio'}
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(20);
              onRestart();
            }}
            className="w-full min-h-[44px] py-2.5 bg-stone-900 hover:bg-red-950/60 active:bg-red-900 active:scale-95 border border-stone-800 text-stone-300 hover:text-red-400 rounded-xl text-xs transition-all cursor-pointer"
          >
            Restart Run (Permadeath Reset)
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(15);
              onExitToTitle();
            }}
            className="w-full min-h-[44px] py-2.5 bg-transparent hover:bg-stone-900 active:scale-95 text-stone-400 hover:text-stone-200 rounded-xl text-xs transition-all cursor-pointer"
          >
            Exit to Title Menu
          </button>
        </div>
      </div>
    </div>
  );
};
