/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 select-none touch-pan-y">
      <div className="relative w-full max-w-md bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl p-4 sm:p-6 text-center max-h-[88dvh] overflow-y-auto touch-pan-y">
        <h2 className="font-cinzel text-lg sm:text-xl font-bold text-amber-400 uppercase tracking-widest mb-0.5">
          Game Paused
        </h2>
        <p className="text-[11px] font-mono-stat text-emerald-400 mb-3">
          ✓ Expedition Auto-Saved Locally (Offline Ready)
        </p>

        {/* Controls cheat-sheet */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-2.5 sm:p-3 text-left text-[11px] sm:text-xs font-mono-stat space-y-1 text-stone-300 mb-3.5">
          <div className="flex justify-between gap-2">
            <span className="text-stone-400">Left Thumb (Mobile)</span>
            <span className="text-amber-400">360° Analog Joystick</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-stone-400">Right Thumb (Multi-Touch)</span>
            <span className="text-amber-400">Strike / Wait / Skills</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-stone-400">Keyboard Move</span>
            <span className="text-amber-400">WASD / Arrows / QEZC</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-stone-400">Gear / Skills / Log</span>
            <span className="text-amber-400">I / K / L</span>
          </div>
        </div>

        {/* PWA Install Prompt inside Pause Menu */}
        <div className="flex justify-center mb-3">
          <PWAInstallButton onLaunchAppPlay={onResume} />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              onResume();
            }}
            className="w-full min-h-[44px] py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 active:scale-95 text-stone-950 font-bold font-cinzel rounded-xl text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg"
          >
            Resume Expedition [Esc]
          </button>

          <button
            onClick={handleToggleMute}
            className="w-full min-h-[40px] py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 border border-stone-800 text-stone-200 rounded-xl text-xs transition-all cursor-pointer"
          >
            {isMuted ? '🔇 Unmute Web Audio' : '🔊 Mute Web Audio'}
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(20);
              onRestart();
            }}
            className="w-full min-h-[40px] py-2 bg-stone-900 hover:bg-red-950/60 active:bg-red-900 active:scale-95 border border-stone-800 text-stone-300 hover:text-red-400 rounded-xl text-xs transition-all cursor-pointer"
          >
            Restart Run (Permadeath Reset)
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(15);
              onExitToTitle();
            }}
            className="w-full min-h-[40px] py-2 bg-transparent hover:bg-stone-900 active:scale-95 text-stone-400 hover:text-stone-200 rounded-xl text-xs transition-all cursor-pointer"
          >
            Save &amp; Exit to Title Menu
          </button>
        </div>
      </div>
    </div>
  );
};
