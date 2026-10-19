/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RunHistoryRecord } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface TitleScreenProps {
  onStartGame: (startingClass: 'warrior' | 'mage' | 'rogue') => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame }) => {
  const [selectedClass, setSelectedClass] = useState<'warrior' | 'mage' | 'rogue'>('warrior');
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [history, setHistory] = useState<RunHistoryRecord[]>([]);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());

  useEffect(() => {
    try {
      const saved = localStorage.getItem('abyssal_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundEngine.haptic(25);
        onStartGame(selectedClass);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass, onStartGame]);

  const handleToggleMute = () => {
    soundEngine.haptic(15);
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleStart = () => {
    soundEngine.haptic(35);
    onStartGame(selectedClass);
  };

  const classes = [
    {
      id: 'warrior' as const,
      name: 'Iron Vanguard',
      role: 'Warrior',
      icon: '🛡️',
      weapon: 'Iron Broadsword & Shield',
      desc: 'High resilience, devastating melee cleaves, and armor fortifications.',
      bonus: '+30 Max HP, +5 Defense',
    },
    {
      id: 'mage' as const,
      name: 'Arcane Arcanist',
      role: 'Elementalist',
      icon: '🔮',
      weapon: 'Runic Staff & Spell Tome',
      desc: 'Elemental firebolts, freezing novas, and celestial meteors.',
      bonus: '+45 Max Mana, +3 Spell Power',
    },
    {
      id: 'rogue' as const,
      name: 'Shadow Stalker',
      role: 'Assassin',
      icon: '🗡️',
      weapon: 'Dual Kris & Venom Vials',
      desc: 'Extreme critical strike chance, poison coatings, and smoke veils.',
      bonus: '+12% Dodge, +10% Crit Chance',
    },
  ];

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between items-center bg-stone-950 text-stone-100 overflow-y-auto select-none p-4 sm:p-6 md:p-12 pb-safe pt-safe">
      {/* Dark fantasy ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/25 via-stone-950 to-stone-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_black_90%)] pointer-events-none" />

      {/* Atmospheric torchlight particles simulation in CSS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Top bar with audio & hall of fame toggles */}
      <div className="relative z-10 w-full max-w-5xl flex justify-between items-center text-xs tracking-wider uppercase text-stone-400 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500/80" />
          <span className="hidden sm:inline">Roguelike Engine</span>
          <span>v1.0</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              setShowHallOfFame(!showHallOfFame);
            }}
            className="min-h-[44px] flex items-center hover:text-amber-400 active:text-amber-300 transition-colors cursor-pointer"
          >
            {showHallOfFame ? 'Back to Selection' : 'Graveyard [Hall of Fame]'}
          </button>
          <span>·</span>
          <button
            onClick={handleToggleMute}
            className="min-h-[44px] flex items-center hover:text-amber-400 active:text-amber-300 transition-colors cursor-pointer"
            title="Toggle Sound"
          >
            {isMuted ? '🔇 Audio Off' : '🔊 Sound On'}
          </button>
        </div>
      </div>

      {/* Center Section: Bespoke SVG Title Lockup & Class Selection */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center my-auto py-2">
        {!showHallOfFame ? (
          <>
            {/* Bespoke inline SVG Title Lockup */}
            <div className="mb-3 sm:mb-4">
              <svg className="w-64 h-14 sm:w-80 sm:h-18 md:w-96 md:h-20 mx-auto" viewBox="0 0 400 90" fill="none">
                <path d="M40 75 L200 15 L360 75" stroke="#78350f" strokeWidth="2" strokeDasharray="4 4" />
                <path d="M100 80 L200 25 L300 80" stroke="#b45309" strokeWidth="1.5" />
                <circle cx="200" cy="25" r="4" fill="#f59e0b" />
                <text
                  x="200"
                  y="62"
                  textAnchor="middle"
                  className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-black fill-stone-100 tracking-widest uppercase"
                  style={{ filter: 'drop-shadow(0 4px 12px rgba(245, 158, 11, 0.35))' }}
                >
                  ABYSSAL DESCENT
                </text>
              </svg>
              <p className="text-[11px] sm:text-xs md:text-sm tracking-widest text-amber-500/90 uppercase font-medium mt-1">
                A Procedural Roguelike Dungeon Crawler · Permadeath · Rare Artifacts
              </p>
            </div>

            {/* Class Cards (Responsive for Android Phones) */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 my-3 sm:my-6">
              {classes.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <div
                    key={cls.id}
                    onClick={() => {
                      soundEngine.haptic(20);
                      soundEngine.playFootstep();
                      setSelectedClass(cls.id);
                    }}
                    className={`relative p-4 sm:p-5 text-left rounded-2xl transition-all active:scale-[0.98] cursor-pointer border ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xl sm:text-3xl">{cls.icon}</span>
                      <span className="text-xs uppercase tracking-wider text-amber-500/90 font-bold">
                        {cls.role}
                      </span>
                    </div>

                    <h3 className="font-cinzel font-bold text-base sm:text-lg text-stone-100">{cls.name}</h3>
                    <p className="text-xs text-stone-400 mt-1 min-h-[32px] sm:min-h-[36px]">{cls.desc}</p>

                    <div className="mt-3 pt-2 sm:mt-4 sm:pt-3 border-t border-stone-800/80 text-[11px] text-stone-300">
                      <div className="text-stone-400">Weapon: {cls.weapon}</div>
                      <div className="text-amber-400/90 font-semibold mt-0.5">{cls.bonus}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start CTA Button (Big, finger friendly for Android) */}
            <div className="flex flex-col items-center gap-2.5 mt-2 w-full sm:w-auto">
              <button
                onClick={handleStart}
                className="w-full sm:w-auto min-h-[54px] sm:min-h-[58px] px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-bold font-cinzel tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] active:shadow-[0_0_35px_rgba(245,158,11,0.7)] cursor-pointer text-base uppercase"
              >
                Descend Into The Abyss
              </button>
              <span className="text-xs text-stone-400 font-mono-stat tracking-wider">
                Tap Button or Press [Space / Enter] to Start
              </span>
            </div>
          </>
        ) : (
          /* Graveyard / Hall of Fame view */
          <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-6 text-left">
            <h2 className="font-cinzel text-lg sm:text-xl text-amber-400 font-bold mb-2 sm:mb-3 flex items-center gap-2">
              <span>⚰️</span> Graveyard of Fallen Heroes
            </h2>
            <p className="text-xs text-stone-400 mb-4">
              Permanent death leaves records in the abyssal archives. Each fallen adventurer paved the way.
            </p>

            {history.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-500 font-mono-stat">
                No past expeditions recorded yet. Enter the dungeon and forge your legacy!
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-stone-950/80 border border-stone-800 rounded-xl text-xs flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-stone-200">
                        {record.characterClass} · Level {record.level}
                      </div>
                      <div className="text-stone-400 text-[11px] mt-0.5">
                        Floor {record.floorReached} · Killed by: {record.causeOfDeath}
                      </div>
                    </div>
                    <div className="text-right font-mono-stat text-[11px]">
                      <div className="text-amber-400 font-bold">{record.goldCollected} Gold</div>
                      <div className="text-stone-500">{record.turnsSurvived} Turns</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 text-center">
              <button
                onClick={() => {
                  soundEngine.haptic(15);
                  setShowHallOfFame(false);
                }}
                className="min-h-[44px] px-6 py-2.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded-xl transition-all cursor-pointer"
              >
                Return to Class Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flat Control Hint Line */}
      <div className="relative z-10 w-full text-center text-[11px] sm:text-xs font-mono-stat text-stone-400 tracking-wide border-t border-stone-900 pt-3">
        On-Screen Virtual Gamepad / Touch Floor to Move · WASD / Arrows · 1-4 Skills · Gear [I] · Skills [K]
      </div>
    </div>
  );
};
