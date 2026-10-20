/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RunHistoryRecord, SavedRunState } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { PWAInstallButton } from './PWAInstallButton';
import { SettingsModal } from './SettingsModal';

interface TitleScreenProps {
  onStartGame: (startingClass: 'warrior' | 'mage' | 'rogue') => void;
  onContinueGame?: (savedRun: SavedRunState) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStartGame, onContinueGame }) => {
  const [selectedClass, setSelectedClass] = useState<'warrior' | 'mage' | 'rogue'>('warrior');
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [history, setHistory] = useState<RunHistoryRecord[]>([]);
  const [savedRun, setSavedRun] = useState<SavedRunState | null>(null);
  const [isMuted, setIsMuted] = useState(soundEngine.getMuted());
  const [importCode, setImportCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadLocalData = useCallback(() => {
    try {
      const savedHist = localStorage.getItem('abyssal_history');
      if (savedHist) {
        setHistory(JSON.parse(savedHist));
      }
      const rawRun = localStorage.getItem('abyssal_saved_run');
      if (rawRun) {
        const parsed: SavedRunState = JSON.parse(rawRun);
        if (parsed && parsed.player && parsed.floor && parsed.player.stats.hp > 0) {
          setSavedRun(parsed);
        } else {
          setSavedRun(null);
        }
      } else {
        setSavedRun(null);
      }
    } catch {
      setSavedRun(null);
    }
  }, []);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  useEffect(() => {
    return soundEngine.subscribe((s) => {
      setIsMuted(!s.sfxEnabled);
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSyncModal || showSettingsModal) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        soundEngine.haptic(25);
        if (savedRun && onContinueGame) {
          onContinueGame(savedRun);
        } else {
          onStartGame(selectedClass);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClass, onStartGame, onContinueGame, savedRun, showSyncModal, showSettingsModal]);

  const handleToggleMute = () => {
    soundEngine.haptic(15);
    const next = soundEngine.toggleMute();
    setIsMuted(next);
  };

  const handleStart = () => {
    soundEngine.haptic(35, 'strike');
    soundEngine.startThemeMusic();
    onStartGame(selectedClass);
  };

  const handleContinue = () => {
    if (!savedRun || !onContinueGame) return;
    soundEngine.haptic(35, 'strike');
    soundEngine.startThemeMusic();
    onContinueGame(savedRun);
  };

  const handleLaunchAppPlay = () => {
    soundEngine.startThemeMusic();
    if (savedRun && onContinueGame) {
      onContinueGame(savedRun);
    } else {
      onStartGame(selectedClass);
    }
  };

  const handleExportSetup = async () => {
    try {
      const payload = {
        run: localStorage.getItem('abyssal_saved_run'),
        history: localStorage.getItem('abyssal_history'),
        settings: localStorage.getItem('abyssal_settings'),
        ctrlMode: localStorage.getItem('abyssal_ctrl_mode'),
        ctrlSize: localStorage.getItem('abyssal_ctrl_size'),
      };
      const code = btoa(encodeURIComponent(JSON.stringify(payload)));
      await navigator.clipboard.writeText(code);
      setSyncStatus('✅ Save & Controller Setup copied to clipboard!');
    } catch {
      setSyncStatus('⚠️ Could not copy automatically.');
    }
  };

  const handleImportSetup = () => {
    if (!importCode.trim()) return;
    try {
      const json = decodeURIComponent(atob(importCode.trim()));
      const payload = JSON.parse(json);
      if (payload.run) localStorage.setItem('abyssal_saved_run', payload.run);
      if (payload.history) localStorage.setItem('abyssal_history', payload.history);
      if (payload.settings) localStorage.setItem('abyssal_settings', payload.settings);
      if (payload.ctrlMode) localStorage.setItem('abyssal_ctrl_mode', payload.ctrlMode);
      if (payload.ctrlSize) localStorage.setItem('abyssal_ctrl_size', payload.ctrlSize);
      soundEngine.loadSettings();
      loadLocalData();
      setSyncStatus('✅ Save & Controller Setup restored! Ready to play.');
      setImportCode('');
    } catch {
      setSyncStatus('❌ Invalid Save Code. Please check and try again.');
    }
  };

  const classes = [
    {
      id: 'warrior' as const,
      name: 'Iron Vanguard',
      role: 'Warrior',
      icon: '🛡️',
      weapon: 'Broadsword & Shield',
      desc: 'High resilience, devastating melee cleaves, and armor fortifications.',
      bonus: '+30 Max HP, +5 Defense',
    },
    {
      id: 'mage' as const,
      name: 'Arcane Arcanist',
      role: 'Elementalist',
      icon: '🔮',
      weapon: 'Runic Staff & Tome',
      desc: 'Elemental firebolts, freezing novas, and celestial meteors.',
      bonus: '+45 Max Mana, +3 Spell Power',
    },
    {
      id: 'rogue' as const,
      name: 'Shadow Stalker',
      role: 'Assassin',
      icon: '🗡️',
      weapon: 'Dual Kris & Venom',
      desc: 'Extreme critical strike chance, poison coatings, and smoke veils.',
      bonus: '+12% Dodge, +10% Crit',
    },
  ];

  return (
    <div className="relative w-full h-[100dvh] flex flex-col bg-stone-950 text-stone-100 overflow-y-auto touch-pan-y select-none px-3 py-3 sm:p-6 md:p-8 pb-safe pt-safe">
      {/* Dark fantasy ambient background glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/25 via-stone-950 to-stone-950 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_black_90%)] pointer-events-none" />
      <div className="fixed inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:32px_32px]" />

      {/* Top Navigation Bar — Non-overlapping flex layout */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs tracking-wider uppercase text-stone-400 shrink-0 pb-2 border-b border-stone-900/80">
        <div className="flex items-center gap-2">
          <PWAInstallButton compact onLaunchAppPlay={handleLaunchAppPlay} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 text-[11px] sm:text-xs">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              setShowSettingsModal(true);
            }}
            className="min-h-[34px] px-2.5 py-1 rounded-lg bg-stone-900/90 border border-amber-500/50 text-amber-300 flex items-center gap-1 hover:bg-stone-800 active:scale-95 transition-all cursor-pointer normal-case font-semibold"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(15);
              setSyncStatus(null);
              setShowSyncModal(true);
            }}
            className="min-h-[34px] px-2 py-1 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center gap-1 hover:text-amber-400 active:text-amber-300 transition-colors cursor-pointer normal-case"
          >
            <span>☁️</span>
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              soundEngine.haptic(15);
              setShowHallOfFame(!showHallOfFame);
            }}
            className="min-h-[34px] px-2 py-1 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center gap-1 hover:text-amber-400 active:text-amber-300 transition-colors cursor-pointer normal-case"
          >
            <span>⚰️</span>
            <span>{showHallOfFame ? 'Back' : 'Graveyard'}</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="min-h-[34px] px-2 py-1 rounded-lg bg-stone-900/80 border border-stone-800 flex items-center gap-1 hover:text-amber-400 active:text-amber-300 transition-colors cursor-pointer normal-case"
            title="Toggle Sound"
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center text-center py-2 sm:py-4 gap-3 sm:gap-4">
        {!showHallOfFame ? (
          <>
            {/* Bespoke inline SVG Title Lockup */}
            <div className="shrink-0">
              <svg
                className="w-56 h-11 sm:w-80 sm:h-16 md:w-96 md:h-20 mx-auto"
                viewBox="0 0 400 90"
                fill="none"
              >
                <path
                  d="M40 75 L200 15 L360 75"
                  stroke="#78350f"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
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
              <p className="text-[10px] sm:text-xs tracking-widest text-amber-500/90 uppercase font-medium">
                Multi-Touch Joystick Roguelike · Play Anywhere Offline
              </p>
            </div>

            {/* Active Auto-Saved Run Resume Banner */}
            {savedRun && onContinueGame && (
              <div className="w-full max-w-xl p-3 rounded-2xl bg-gradient-to-r from-emerald-950/85 via-stone-900 to-stone-900 border border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
                <div className="text-left w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono-stat uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      Saved Run Ready
                    </span>
                    <span className="text-[11px] font-mono-stat text-stone-400">
                      Turn {savedRun.turnNumber}
                    </span>
                  </div>
                  <div className="font-cinzel font-bold text-xs sm:text-sm text-stone-100 mt-0.5">
                    Depth {savedRun.floor.floorNumber}F · {savedRun.floor.theme.name}
                  </div>
                  <div className="text-[11px] font-mono-stat text-stone-300">
                    LVL {savedRun.player.stats.level} · ❤️ {savedRun.player.stats.hp}/
                    {savedRun.player.stats.maxHp} · 🪙 {savedRun.player.stats.gold}g
                  </div>
                </div>
                <button
                  onClick={handleContinue}
                  className="w-full sm:w-auto min-h-[42px] px-5 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 font-cinzel font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer shrink-0"
                >
                  ⚡ Continue Run
                </button>
              </div>
            )}

            {/* Class Cards — Compact on mobile so they never overlap */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3.5 shrink-0">
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
                    className={`relative p-3 sm:p-4 text-left rounded-2xl transition-all active:scale-[0.99] cursor-pointer border ${
                      isSelected
                        ? 'bg-stone-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                        : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">{cls.icon}</span>
                        <div>
                          <h3 className="font-cinzel font-bold text-xs sm:text-base text-stone-100 leading-tight">
                            {cls.name}
                          </h3>
                          <span className="text-[10px] uppercase tracking-wider text-amber-500/90 font-bold">
                            {cls.role} · {cls.weapon}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono-stat text-amber-400 font-semibold shrink-0 md:hidden">
                        {cls.bonus}
                      </span>
                    </div>

                    <p className="text-[11px] sm:text-xs text-stone-400 mt-1.5 leading-snug">
                      {cls.desc}
                    </p>

                    <div className="hidden md:block mt-2 pt-2 border-t border-stone-800/80 text-[11px] text-amber-400/90 font-semibold">
                      {cls.bonus}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Start CTA Button */}
            <div className="flex flex-col items-center gap-1.5 w-full sm:w-auto shrink-0 pt-1">
              <button
                onClick={handleStart}
                className="w-full sm:w-auto min-h-[48px] px-8 sm:px-12 py-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-black font-cinzel tracking-wider rounded-xl transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer text-xs sm:text-base uppercase"
              >
                {savedRun ? 'Start New Expedition' : 'Descend Into The Abyss'}
              </button>
              <span className="text-[10px] sm:text-[11px] text-stone-400 font-mono-stat">
                Auto-saves every turn · Works 100% offline
              </span>
            </div>
          </>
        ) : (
          /* Graveyard / Hall of Fame view */
          <div className="w-full max-w-2xl bg-stone-900/90 border border-stone-800 rounded-2xl p-4 sm:p-6 text-left">
            <h2 className="font-cinzel text-base sm:text-xl text-amber-400 font-bold mb-1.5 flex items-center gap-2">
              <span>⚰️</span> Graveyard of Fallen Heroes
            </h2>
            <p className="text-xs text-stone-400 mb-3">
              Permanent death leaves records in the abyssal archives.
            </p>

            {history.length === 0 ? (
              <div className="py-8 text-center text-xs sm:text-sm text-stone-500 font-mono-stat">
                No past expeditions recorded yet. Enter the dungeon and forge your legacy!
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto touch-pan-y space-y-2 pr-1">
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

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  soundEngine.haptic(15);
                  setShowHallOfFame(false);
                }}
                className="min-h-[42px] px-6 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 rounded-xl transition-all cursor-pointer"
              >
                Return to Class Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Device Save & Controller Setup Transfer Modal */}
      {showSyncModal && (
        <div
          onClick={() => setShowSyncModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 touch-pan-y"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-2xl text-left max-h-[88dvh] overflow-y-auto touch-pan-y"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-cinzel text-sm sm:text-base font-bold text-amber-400">
                ☁️ Transfer Save &amp; Setup
              </h3>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-stone-400 hover:text-stone-100 text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-400 mb-3">
              Export your current dungeon run, Graveyard history, and Joystick preferences to carry them to any phone or browser.
            </p>

            <button
              onClick={handleExportSetup}
              className="w-full min-h-[42px] py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-cinzel font-bold text-xs uppercase rounded-xl mb-3 cursor-pointer"
            >
              📋 Copy Save &amp; Setup Code
            </button>

            <div className="border-t border-stone-800 pt-3 mt-1">
              <label className="block text-xs font-mono-stat text-stone-300 mb-1.5">
                Paste Save Code from another device:
              </label>
              <input
                type="text"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="Paste exported code here..."
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono-stat text-stone-200 focus:outline-none focus:border-amber-500 mb-2"
              />
              <button
                onClick={handleImportSetup}
                className="w-full min-h-[40px] py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-cinzel font-bold text-xs uppercase rounded-xl cursor-pointer"
              >
                📥 Restore Save &amp; Setup
              </button>
            </div>

            {syncStatus && (
              <div className="mt-3 text-xs font-mono-stat text-emerald-400 text-center">
                {syncStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Menu Settings Modal */}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
};
