/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DUNGEON_LIST, DungeonDefinition, getRecommendedLevel } from '../dungeon/dungeonList';
import { soundEngine } from '../audio/soundEngine';

interface DungeonSelectScreenProps {
  onSelectDungeon: (dungeonId: number) => void;
  onBack: () => void;
  /** Highest dungeon the player has ever cleared (1-based). 0 = none cleared. */
  highestCleared: number;
}

const TIER_LABELS = ['Tier I — Novice', 'Tier II — Adept', 'Tier III — Veteran', 'Tier IV — Master', 'Tier V — Legend'];
const TIER_COLORS = ['#a8a29e', '#38bdf8', '#f59e0b', '#ef4444', '#c084fc'];

export const DungeonSelectScreen: React.FC<DungeonSelectScreenProps> = ({
  onSelectDungeon,
  onBack,
  highestCleared,
}) => {
  const [selectedTier, setSelectedTier] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const tiers = useMemo(() => {
    const m = new Map<number, DungeonDefinition[]>();
    DUNGEON_LIST.forEach((d) => {
      if (!m.has(d.tier)) m.set(d.tier, []);
      m.get(d.tier)!.push(d);
    });
    return m;
  }, []);

  const dungeons = tiers.get(selectedTier) ?? [];

  // Scroll list to top when tier changes
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedTier]);

  const isUnlocked = (d: DungeonDefinition) => {
    // First dungeon always unlocked; others require previous dungeon cleared
    return d.id === 1 || d.id <= highestCleared + 1;
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-stone-950 text-stone-100 select-none">
      {/* Header */}
      <div className="shrink-0 px-3 pt-safe">
        <div className="flex items-center justify-between py-2.5">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              onBack();
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-cinzel font-bold uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="font-cinzel text-base sm:text-lg font-black text-amber-400 uppercase tracking-widest text-center">
            Choose Your Descent
          </h1>
          <div className="w-16" />
        </div>

        {/* Tier Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {[1, 2, 3, 4, 5].map((tier) => {
            const active = tier === selectedTier;
            return (
              <button
                key={tier}
                onClick={() => {
                  soundEngine.haptic(10);
                  setSelectedTier(tier);
                }}
                className={`shrink-0 min-h-[36px] px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-cinzel font-bold uppercase tracking-wide transition-all active:scale-95 cursor-pointer border ${
                  active
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-stone-900/80 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
                style={active ? { borderColor: TIER_COLORS[tier - 1] + '80' } : {}}
              >
                {TIER_LABELS[tier - 1]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dungeon List */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-safe space-y-2 touch-pan-y">
        {dungeons.map((d) => {
          const unlocked = isUnlocked(d);
          const cleared = d.id <= highestCleared;
          const recLvl = getRecommendedLevel(d.id);

          return (
            <button
              key={d.id}
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return;
                soundEngine.haptic(25);
                onSelectDungeon(d.id);
              }}
              className={`w-full text-left rounded-xl border p-3 sm:p-4 transition-all active:scale-[0.98] cursor-pointer ${
                unlocked
                  ? 'bg-stone-900/80 border-stone-700/80 hover:border-amber-500/60 hover:bg-stone-900'
                  : 'bg-stone-950/60 border-stone-800/40 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border"
                  style={{
                    backgroundColor: d.accent + '18',
                    borderColor: d.accent + '40',
                  }}
                >
                  {unlocked ? d.icon : '🔒'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel text-sm sm:text-base font-bold text-stone-100 truncate">
                      {unlocked ? d.name : '???'}
                    </span>
                    {cleared && (
                      <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 font-mono-stat">
                        ✓ Cleared
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                    {unlocked ? d.description : 'Clear the previous dungeon to unlock.'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono-stat text-stone-500">
                    <span>
                      Dungeon <span className="text-stone-300">{d.id}</span>/50
                    </span>
                    <span>
                      10 Floors
                    </span>
                    <span>
                      Rec. Lv <span style={{ color: d.accent }}>{recLvl}</span>
                    </span>
                    <span>
                      Boss: <span className="text-stone-300">{unlocked ? d.bossName : '???'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
