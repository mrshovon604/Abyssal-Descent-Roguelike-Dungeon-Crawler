/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  soundEngine,
  GameSettings,
  ControllerModeSetting,
  ControllerSizeSetting,
} from '../audio/soundEngine';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(() => soundEngine.getSettings());

  useEffect(() => {
    return soundEngine.subscribe((updated) => {
      setSettings(updated);
    });
  }, []);

  const handleToggle = (key: keyof GameSettings) => {
    const nextVal = !settings[key];
    const updated = soundEngine.updateSettings({ [key]: nextVal });
    setSettings(updated);

    // Provide immediate tactile/audio preview when toggling
    if (key === 'walkHaptic' && nextVal) {
      soundEngine.haptic(12, 'walk');
    } else if (key === 'strikeHaptic' && nextVal) {
      soundEngine.haptic(35, 'strike');
    } else if (key === 'sfxEnabled' && nextVal) {
      soundEngine.playChest();
    } else {
      soundEngine.haptic(15, 'ui');
    }
  };

  const handleSetControllerMode = (mode: ControllerModeSetting) => {
    const updated = soundEngine.updateSettings({ controllerMode: mode });
    setSettings(updated);
    soundEngine.haptic(18, 'ui');
  };

  const handleSetControllerSize = (size: ControllerSizeSetting) => {
    const updated = soundEngine.updateSettings({ controllerSize: size });
    setSettings(updated);
    soundEngine.haptic(18, 'ui');
  };

  const toggleRows: {
    key: 'sfxEnabled' | 'musicEnabled' | 'walkHaptic' | 'strikeHaptic' | 'screenShake';
    icon: string;
    label: string;
    desc: string;
  }[] = [
    {
      key: 'sfxEnabled',
      icon: settings.sfxEnabled ? '🔊' : '🔇',
      label: 'Sound Effects (SFX)',
      desc: 'Footsteps, weapon slashes, spells, potions & chest chimes',
    },
    {
      key: 'musicEnabled',
      icon: settings.musicEnabled ? '🎵' : '🔕',
      label: 'Theme Music (Synth Arp)',
      desc: 'Stranger Things-style progressive synth arpeggio & mysterious pads',
    },
    {
      key: 'walkHaptic',
      icon: '👣',
      label: 'Haptic for Walking',
      desc: 'Subtle vibration pulse on footsteps & joystick movement',
    },
    {
      key: 'strikeHaptic',
      icon: '⚔️',
      label: 'Haptic for Strike',
      desc: 'Heavy tactile vibration on attacks, crits, skills & hits',
    },
    {
      key: 'screenShake',
      icon: '💥',
      label: 'Screen Shake & Hit-Flash',
      desc: 'Camera shake & impact flash overlays during combat',
    },
  ];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4 select-none touch-pan-y"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-stone-950 border border-amber-500/60 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(0,0,0,0.95)] text-left max-h-[90dvh] overflow-y-auto touch-pan-y"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <div>
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-amber-400 tracking-wide uppercase">
                Game Settings
              </h2>
              <p className="text-[10px] font-mono-stat text-stone-400">
                Audio, Haptics, Visuals &amp; Mobile Controls
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.haptic(12, 'ui');
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-100 flex items-center justify-center text-sm cursor-pointer active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Toggle Rows */}
        <div className="space-y-2 mb-4">
          {toggleRows.map((item) => {
            const isOn = settings[item.key];
            return (
              <div
                key={item.key}
                onClick={() => handleToggle(item.key)}
                className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-stone-900/75 border border-stone-800/90 hover:border-stone-700 cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0 w-6 text-center">{item.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-stone-100 leading-tight">
                      {item.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-stone-400 leading-tight mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item.key);
                  }}
                  className={`shrink-0 min-w-[56px] px-2.5 py-1 rounded-lg font-mono-stat text-[11px] font-bold uppercase transition-all cursor-pointer border ${
                    isOn
                      ? 'bg-emerald-500/20 border-emerald-500/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                      : 'bg-stone-950 border-stone-800 text-stone-500'
                  }`}
                >
                  {isOn ? 'ON' : 'OFF'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Default Controller Style & Size Section */}
        <div className="p-3 rounded-xl bg-stone-900/60 border border-stone-800 space-y-3 mb-4">
          <div>
            <div className="text-[11px] font-mono-stat uppercase text-amber-400/90 font-bold mb-1.5">
              🕹️ Left-Thumb Controller Style
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSetControllerMode('joystick')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                  settings.controllerMode === 'joystick'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                    : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                🕹️ Floating Stick
              </button>
              <button
                type="button"
                onClick={() => handleSetControllerMode('dpad')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
                  settings.controllerMode === 'dpad'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold shadow-[0_0_14px_rgba(245,158,11,0.3)]'
                    : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                }`}
              >
                ➕ 8-Way D-Pad
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono-stat uppercase text-amber-400/90 font-bold mb-1.5">
              📐 Controller &amp; Strike Button Size
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['standard', 'large', 'xl'] as ControllerSizeSetting[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSetControllerSize(size)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-mono-stat uppercase font-bold border transition-all cursor-pointer active:scale-95 ${
                    settings.controllerSize === size
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={() => {
            soundEngine.haptic(15, 'ui');
            onClose();
          }}
          className="w-full min-h-[42px] py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-stone-950 font-cinzel font-black text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
        >
          Save &amp; Close
        </button>
      </div>
    </div>
  );
};
