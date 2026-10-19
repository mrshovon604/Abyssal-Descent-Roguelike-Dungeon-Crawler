/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Equipment, Item, Player, PlayerStats } from '../types/game';
import { RARITY_CONFIG } from '../items/itemDatabase';
import { computeTotalPlayerStats } from '../combat/combatSystem';
import { soundEngine } from '../audio/soundEngine';

interface InventoryModalProps {
  player: Player;
  onClose: () => void;
  onEquipItem: (item: Item) => void;
  onUnequipItem: (slot: keyof Equipment) => void;
  onUseItem: (item: Item) => void;
  onDropItem: (item: Item) => void;
  onSellItem?: (item: Item) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onEquipItem,
  onUnequipItem,
  onUseItem,
  onDropItem,
  onSellItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(player.inventory[0] || null);
  const [mobileTab, setMobileTab] = useState<'backpack' | 'equipment' | 'inspect'>('backpack');
  const totalStats: PlayerStats = computeTotalPlayerStats(player);

  const getEquippedInSameSlot = (item: Item | null): Item | null => {
    if (!item) return null;
    if (item.type === 'weapon') return player.equipment.weapon;
    if (item.type === 'shield') return player.equipment.shield;
    if (item.type === 'armor') return player.equipment.armor;
    if (item.type === 'ring') return player.equipment.ring1 || player.equipment.ring2;
    if (item.type === 'amulet') return player.equipment.amulet;
    return null;
  };

  const equippedInSlot = getEquippedInSameSlot(selectedItem);

  const handleSelectItem = (item: Item) => {
    soundEngine.haptic(15);
    setSelectedItem(item);
    setMobileTab('inspect');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none pb-safe pt-safe">
      <div className="relative w-full max-w-4xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-900/70">
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl">🎒</span>
            <h2 className="font-cinzel text-base sm:text-lg font-bold text-stone-100">Equipment & Gear</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono-stat text-xs sm:text-sm text-amber-400 font-bold flex items-center gap-1.5">
              <span>🪙</span> {player.stats.gold} Gold
            </div>
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] text-stone-400 hover:text-stone-100 text-sm font-mono-stat rounded-lg hover:bg-stone-800 active:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close [Esc]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher (Visible on Phones) */}
        <div className="flex md:hidden border-b border-stone-800 bg-stone-900/40">
          <button
            onClick={() => {
              soundEngine.haptic(15);
              setMobileTab('backpack');
            }}
            className={`flex-1 py-3 text-xs font-cinzel font-bold text-center transition-all cursor-pointer border-b-2 ${
              mobileTab === 'backpack'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60'
                : 'border-transparent text-stone-400'
            }`}
          >
            🎒 Backpack ({player.inventory.length}/{player.maxInventorySize})
          </button>
          <button
            onClick={() => {
              soundEngine.haptic(15);
              setMobileTab('equipment');
            }}
            className={`flex-1 py-3 text-xs font-cinzel font-bold text-center transition-all cursor-pointer border-b-2 ${
              mobileTab === 'equipment'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60'
                : 'border-transparent text-stone-400'
            }`}
          >
            🛡️ Equipped & Stats
          </button>
          <button
            onClick={() => {
              soundEngine.haptic(15);
              setMobileTab('inspect');
            }}
            className={`flex-1 py-3 text-xs font-cinzel font-bold text-center transition-all cursor-pointer border-b-2 ${
              mobileTab === 'inspect'
                ? 'border-amber-500 text-amber-400 bg-stone-900/60'
                : 'border-transparent text-stone-400'
            }`}
          >
            🔍 Details {selectedItem ? `(${selectedItem.name.slice(0, 8)}...)` : ''}
          </button>
        </div>

        {/* Modal Body: Responsive on Mobile, 3 Columns on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 p-4 sm:p-6 overflow-y-auto">
          {/* Left Column: Equipment Paperdoll & Stats (4 cols) */}
          <div
            className={`md:col-span-4 flex flex-col gap-4 ${
              mobileTab === 'equipment' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-3">
              <h3 className="font-cinzel text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5">
                Equipped Relics
              </h3>

              {/* Equipment Slots */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Main Weapon */}
                <div
                  onClick={() => player.equipment.weapon && handleSelectItem(player.equipment.weapon)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.weapon
                      ? `${RARITY_CONFIG[player.equipment.weapon.rarity].bg} ${RARITY_CONFIG[player.equipment.weapon.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Weapon</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.weapon ? player.equipment.weapon.name : 'Empty'}
                    </span>
                    {player.equipment.weapon && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('weapon');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Offhand / Shield */}
                <div
                  onClick={() => player.equipment.shield && handleSelectItem(player.equipment.shield)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.shield
                      ? `${RARITY_CONFIG[player.equipment.shield.rarity].bg} ${RARITY_CONFIG[player.equipment.shield.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Offhand</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.shield ? player.equipment.shield.name : 'Empty'}
                    </span>
                    {player.equipment.shield && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('shield');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Armor */}
                <div
                  onClick={() => player.equipment.armor && handleSelectItem(player.equipment.armor)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.armor
                      ? `${RARITY_CONFIG[player.equipment.armor.rarity].bg} ${RARITY_CONFIG[player.equipment.armor.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Armor</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.armor ? player.equipment.armor.name : 'Empty'}
                    </span>
                    {player.equipment.armor && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('armor');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Amulet */}
                <div
                  onClick={() => player.equipment.amulet && handleSelectItem(player.equipment.amulet)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.amulet
                      ? `${RARITY_CONFIG[player.equipment.amulet.rarity].bg} ${RARITY_CONFIG[player.equipment.amulet.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Amulet</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.amulet ? player.equipment.amulet.name : 'Empty'}
                    </span>
                    {player.equipment.amulet && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('amulet');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Ring 1 */}
                <div
                  onClick={() => player.equipment.ring1 && handleSelectItem(player.equipment.ring1)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.ring1
                      ? `${RARITY_CONFIG[player.equipment.ring1.rarity].bg} ${RARITY_CONFIG[player.equipment.ring1.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Ring I</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.ring1 ? player.equipment.ring1.name : 'Empty'}
                    </span>
                    {player.equipment.ring1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('ring1');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Ring 2 */}
                <div
                  onClick={() => player.equipment.ring2 && handleSelectItem(player.equipment.ring2)}
                  className={`min-h-[56px] p-2 rounded-lg border transition-all active:scale-95 cursor-pointer flex flex-col justify-between ${
                    player.equipment.ring2
                      ? `${RARITY_CONFIG[player.equipment.ring2.rarity].bg} ${RARITY_CONFIG[player.equipment.ring2.rarity].border}`
                      : 'border-dashed border-stone-800 bg-stone-950/40 text-stone-600'
                  }`}
                >
                  <div className="text-[10px] text-stone-400 font-semibold uppercase">Ring II</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="truncate font-medium text-stone-200">
                      {player.equipment.ring2 ? player.equipment.ring2.name : 'Empty'}
                    </span>
                    {player.equipment.ring2 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(15);
                          onUnequipItem('ring2');
                        }}
                        className="min-w-[24px] min-h-[24px] text-red-400 hover:text-red-300 ml-1 flex items-center justify-center cursor-pointer"
                        title="Unequip"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Combat Attributes Panel */}
            <div className="bg-stone-900/50 border border-stone-800/80 rounded-xl p-3 text-xs">
              <h3 className="font-cinzel text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                Hero Combat Stats
              </h3>
              <div className="space-y-1 font-mono-stat">
                <div className="flex justify-between text-stone-300">
                  <span>Attack Rating</span>
                  <span className="text-amber-400 font-bold tabular-nums">{totalStats.attack}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Armor Defense</span>
                  <span className="text-sky-400 font-bold tabular-nums">{totalStats.defense}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Critical Strike</span>
                  <span className="text-amber-400 font-bold tabular-nums">
                    {Math.round(totalStats.critChance * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Life Steal</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {Math.round(totalStats.lifeSteal * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Evasion / Dodge</span>
                  <span className="text-cyan-400 font-bold tabular-nums">
                    {Math.round(totalStats.dodgeChance * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column: Backpack Grid (5 cols) */}
          <div
            className={`md:col-span-5 flex flex-col ${
              mobileTab === 'backpack' ? 'flex' : 'hidden md:flex'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-cinzel text-xs font-bold text-stone-300 uppercase tracking-wider">
                Backpack ({player.inventory.length} / {player.maxInventorySize})
              </h3>
              <span className="text-[11px] font-mono-stat text-amber-500">Tap item to inspect/equip</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-2.5 bg-stone-900/30 p-2.5 sm:p-3 rounded-xl border border-stone-800/80 min-h-[260px]">
              {Array.from({ length: player.maxInventorySize }).map((_, index) => {
                const item = player.inventory[index];
                const isSelected = selectedItem && item && selectedItem.id === item.id;
                const rCfg = item ? RARITY_CONFIG[item.rarity] : null;

                return (
                  <button
                    key={index}
                    onClick={() => item && handleSelectItem(item)}
                    className={`min-h-[56px] min-w-[56px] aspect-square rounded-xl flex flex-col items-center justify-center p-1 relative border transition-all active:scale-95 cursor-pointer ${
                      item
                        ? isSelected
                          ? `${rCfg?.bg} border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]`
                          : `${rCfg?.bg} ${rCfg?.border} hover:border-stone-500`
                        : 'border-dashed border-stone-800/60 bg-stone-950/40 cursor-default'
                    }`}
                  >
                    {item ? (
                      <>
                        <span className="text-2xl sm:text-3xl">{item.icon}</span>
                        <span
                          className={`text-[9px] font-semibold truncate w-full text-center mt-1 leading-none ${rCfg?.color}`}
                        >
                          {item.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-stone-800 text-xs font-mono-stat">{index + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Item Inspection & Actions (3 cols) */}
          <div
            className={`md:col-span-3 flex flex-col ${
              mobileTab === 'inspect' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {selectedItem ? (
              <div
                className={`flex-1 p-4 rounded-xl border flex flex-col justify-between ${
                  RARITY_CONFIG[selectedItem.rarity].bg
                } ${RARITY_CONFIG[selectedItem.rarity].border}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl sm:text-4xl">{selectedItem.icon}</span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        RARITY_CONFIG[selectedItem.rarity].color
                      }`}
                    >
                      {RARITY_CONFIG[selectedItem.rarity].label}
                    </span>
                  </div>

                  <h4 className="font-cinzel font-bold text-stone-100 text-sm sm:text-base mt-2">
                    {selectedItem.name}
                  </h4>
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider mt-0.5">
                    {selectedItem.type} {selectedItem.subtype ? `· ${selectedItem.subtype}` : ''}
                  </div>

                  <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                    {selectedItem.description}
                  </p>

                  {/* Item Stats */}
                  <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-1 text-xs font-mono-stat">
                    {selectedItem.attack && (
                      <div className="text-amber-400 font-bold">+{selectedItem.attack} Attack Damage</div>
                    )}
                    {selectedItem.defense && (
                      <div className="text-sky-400 font-bold">+{selectedItem.defense} Defense</div>
                    )}
                    {selectedItem.hpBonus && (
                      <div className="text-emerald-400">+{selectedItem.hpBonus} Max Health</div>
                    )}
                    {selectedItem.manaBonus && (
                      <div className="text-indigo-400">+{selectedItem.manaBonus} Max Mana</div>
                    )}
                    {selectedItem.critChance && (
                      <div className="text-amber-300">
                        +{Math.round(selectedItem.critChance * 100)}% Crit Chance
                      </div>
                    )}
                    {selectedItem.lifeSteal && (
                      <div className="text-red-400">
                        +{Math.round(selectedItem.lifeSteal * 100)}% Life Steal
                      </div>
                    )}
                    {selectedItem.dodgeChance && (
                      <div className="text-cyan-400">
                        +{Math.round(selectedItem.dodgeChance * 100)}% Dodge
                      </div>
                    )}
                    {selectedItem.healAmount && (
                      <div className="text-emerald-400 font-bold">Heals +{selectedItem.healAmount} HP</div>
                    )}
                    {selectedItem.manaAmount && (
                      <div className="text-sky-400 font-bold">Restores +{selectedItem.manaAmount} MP</div>
                    )}
                    {selectedItem.permanentAttackBonus && (
                      <div className="text-amber-300 font-bold">
                        ⭐ Permanent +{selectedItem.permanentAttackBonus} Base Attack
                      </div>
                    )}
                    {selectedItem.permanentMaxHpBonus && (
                      <div className="text-emerald-300 font-bold">
                        ⭐ Permanent +{selectedItem.permanentMaxHpBonus} Max HP
                      </div>
                    )}
                  </div>

                  {/* Comparison with equipped */}
                  {equippedInSlot && (
                    <div className="mt-2 text-[10px] font-mono-stat text-stone-400 bg-stone-950/80 p-2 rounded-lg">
                      <div>Vs Equipped ({equippedInSlot.name}):</div>
                      {selectedItem.attack && (
                        <div
                          className={
                            (selectedItem.attack || 0) >= (equippedInSlot.attack || 0)
                              ? 'text-emerald-400 font-bold'
                              : 'text-red-400'
                          }
                        >
                          Attack:{' '}
                          {(selectedItem.attack || 0) - (equippedInSlot.attack || 0) >= 0 ? '+' : ''}
                          {(selectedItem.attack || 0) - (equippedInSlot.attack || 0)}
                        </div>
                      )}
                      {selectedItem.defense && (
                        <div
                          className={
                            (selectedItem.defense || 0) >= (equippedInSlot.defense || 0)
                              ? 'text-emerald-400 font-bold'
                              : 'text-red-400'
                          }
                        >
                          Defense:{' '}
                          {(selectedItem.defense || 0) - (equippedInSlot.defense || 0) >= 0 ? '+' : ''}
                          {(selectedItem.defense || 0) - (equippedInSlot.defense || 0)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Big Thumb-Friendly Touch Action Buttons */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-col gap-2">
                  {selectedItem.type === 'potion' || selectedItem.type === 'scroll' ? (
                    <button
                      onClick={() => {
                        soundEngine.haptic(25);
                        onUseItem(selectedItem);
                        setSelectedItem(null);
                        setMobileTab('backpack');
                      }}
                      className="min-h-[48px] w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-95 text-stone-950 font-bold rounded-xl text-sm transition-all cursor-pointer shadow-lg"
                    >
                      Consume / Use
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundEngine.haptic(25);
                        onEquipItem(selectedItem);
                        setMobileTab('equipment');
                      }}
                      className="min-h-[48px] w-full py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 active:scale-95 text-stone-950 font-bold font-cinzel rounded-xl text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                    >
                      Equip Relic
                    </button>
                  )}

                  {onSellItem && player.inventory.some((i) => i.id === selectedItem.id) && (
                    <button
                      onClick={() => {
                        soundEngine.haptic(20);
                        onSellItem(selectedItem);
                        setSelectedItem(null);
                        setMobileTab('backpack');
                      }}
                      className="min-h-[40px] w-full py-2 bg-stone-900 hover:bg-amber-950/60 active:bg-amber-900 border border-amber-700/50 text-amber-300 rounded-xl text-xs font-mono-stat font-bold transition-colors cursor-pointer"
                    >
                      🪙 Salvage for +{Math.max(5, Math.round(selectedItem.goldValue * 0.5))} Gold
                    </button>
                  )}

                  <button
                    onClick={() => {
                      soundEngine.haptic(15);
                      onDropItem(selectedItem);
                      setSelectedItem(null);
                      setMobileTab('backpack');
                    }}
                    className="min-h-[40px] w-full py-2 bg-stone-900 hover:bg-red-950/60 active:bg-red-900 border border-stone-800 text-stone-400 hover:text-red-300 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Drop to Floor
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-stone-800 rounded-xl flex items-center justify-center p-6 text-center text-xs text-stone-500 font-mono-stat min-h-[160px]">
                Tap an item in your backpack or equipped gear to inspect stats and equip.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
