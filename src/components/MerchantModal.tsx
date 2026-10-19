/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Item, MerchantData, Player } from '../types/game';
import { RARITY_CONFIG } from '../items/itemDatabase';
import { soundEngine } from '../audio/soundEngine';

interface MerchantModalProps {
  player: Player;
  merchant: MerchantData;
  onClose: () => void;
  onBuyItem: (item: Item) => void;
  onSellItem: (item: Item) => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  player,
  merchant,
  onClose,
  onBuyItem,
  onSellItem,
}) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [selectedItem, setSelectedItem] = useState<Item | null>(
    merchant.stock[0] || player.inventory[0] || null
  );

  const handleTabChange = (tab: 'buy' | 'sell') => {
    soundEngine.haptic(15);
    setActiveTab(tab);
    if (tab === 'buy') {
      setSelectedItem(merchant.stock[0] || null);
    } else {
      setSelectedItem(player.inventory[0] || null);
    }
  };

  const sellPrice = (item: Item) => Math.max(5, Math.round(item.goldValue * 0.5));

  const canAfford = (item: Item) => player.stats.gold >= item.goldValue;
  const hasSpace = player.inventory.length < player.maxInventorySize;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none pb-safe pt-safe">
      <div className="relative w-full max-w-4xl bg-stone-950 border border-emerald-800/70 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-800 bg-gradient-to-r from-emerald-950/50 via-stone-900 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-center text-2xl shadow-inner">
              ⚖️
            </div>
            <div>
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-emerald-300">
                {merchant.name}
              </h2>
              <p className="text-[11px] text-stone-400">
                &ldquo;Gold weighs heavy in the dark, traveler. Trade while your heart still beats.&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-stone-900 border border-amber-500/40 font-mono-stat text-xs sm:text-sm text-amber-400 font-bold flex items-center gap-1.5 shadow-inner">
              <span>🪙</span>
              <span className="tabular-nums">{player.stats.gold}</span>
            </div>
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] text-stone-400 hover:text-stone-100 text-sm font-mono-stat rounded-xl hover:bg-stone-800 active:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close [Esc]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Buy / Sell Mode Tabs */}
        <div className="flex border-b border-stone-800 bg-stone-900/50">
          <button
            onClick={() => handleTabChange('buy')}
            className={`flex-1 py-3 text-xs sm:text-sm font-cinzel font-bold text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'buy'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/25'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🛒 Buy Wares ({merchant.stock.length})
          </button>
          <button
            onClick={() => handleTabChange('sell')}
            className={`flex-1 py-3 text-xs sm:text-sm font-cinzel font-bold text-center transition-all cursor-pointer border-b-2 ${
              activeTab === 'sell'
                ? 'border-amber-400 text-amber-300 bg-amber-950/25'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🪙 Sell Backpack Loot ({player.inventory.length}/{player.maxInventorySize})
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-6 overflow-y-auto">
          {/* Left 7 Cols: Item List */}
          <div className="md:col-span-7 flex flex-col gap-2.5">
            {activeTab === 'buy' ? (
              merchant.stock.length === 0 ? (
                <div className="border border-dashed border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs font-mono-stat">
                  You have purchased all of the Peddler&apos;s wares on this floor.
                </div>
              ) : (
                merchant.stock.map((item) => {
                  const rCfg = RARITY_CONFIG[item.rarity];
                  const isSelected = selectedItem?.id === item.id;
                  const affordable = canAfford(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        soundEngine.haptic(12);
                        setSelectedItem(item);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? `${rCfg.bg} border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]`
                          : `${rCfg.bg} ${rCfg.border} hover:border-stone-500`
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl sm:text-3xl shrink-0">{item.icon}</span>
                        <div className="min-w-0">
                          <div className={`font-cinzel font-bold text-xs sm:text-sm truncate ${rCfg.color}`}>
                            {item.name}
                          </div>
                          <div className="text-[11px] text-stone-400 truncate">{item.description}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono-stat text-xs font-bold px-2.5 py-1 rounded-lg border tabular-nums ${
                            affordable
                              ? 'bg-stone-950/90 border-amber-500/50 text-amber-300'
                              : 'bg-stone-950/90 border-red-800/60 text-red-400'
                          }`}
                        >
                          🪙 {item.goldValue}
                        </span>
                        <button
                          disabled={!affordable || !hasSpace}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!affordable || !hasSpace) return;
                            soundEngine.haptic(30);
                            onBuyItem(item);
                            const remaining = merchant.stock.filter((i) => i.id !== item.id);
                            setSelectedItem(remaining[0] || null);
                          }}
                          className={`min-h-[40px] px-3 py-1.5 rounded-lg font-cinzel font-bold text-xs uppercase transition-all cursor-pointer ${
                            affordable && hasSpace
                              ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950 shadow-md'
                              : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                          }`}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : player.inventory.length === 0 ? (
              <div className="border border-dashed border-stone-800 rounded-xl p-8 text-center text-stone-500 text-xs font-mono-stat">
                Your backpack is empty. Explore the dungeon to plunder relics to sell!
              </div>
            ) : (
              player.inventory.map((item) => {
                const rCfg = RARITY_CONFIG[item.rarity];
                const isSelected = selectedItem?.id === item.id;
                const price = sellPrice(item);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      soundEngine.haptic(12);
                      setSelectedItem(item);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? `${rCfg.bg} border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]`
                        : `${rCfg.bg} ${rCfg.border} hover:border-stone-500`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl sm:text-3xl shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className={`font-cinzel font-bold text-xs sm:text-sm truncate ${rCfg.color}`}>
                          {item.name}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">{item.description}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-stat text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-950/90 border border-amber-500/40 text-amber-300 tabular-nums">
                        +{price} 🪙
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundEngine.haptic(25);
                          onSellItem(item);
                          const remaining = player.inventory.filter((i) => i.id !== item.id);
                          setSelectedItem(remaining[0] || null);
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-cinzel font-bold text-xs uppercase transition-all cursor-pointer shadow-md"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 5 Cols: Item Inspector */}
          <div className="md:col-span-5 flex flex-col">
            {selectedItem ? (
              <div
                className={`flex-1 p-4 rounded-xl border flex flex-col justify-between ${
                  RARITY_CONFIG[selectedItem.rarity].bg
                } ${RARITY_CONFIG[selectedItem.rarity].border}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-4xl">{selectedItem.icon}</span>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                        RARITY_CONFIG[selectedItem.rarity].color
                      } ${RARITY_CONFIG[selectedItem.rarity].border}`}
                    >
                      {RARITY_CONFIG[selectedItem.rarity].label}
                    </span>
                  </div>

                  <h3 className="font-cinzel font-bold text-stone-100 text-base mt-2">
                    {selectedItem.name}
                  </h3>
                  <div className="text-[11px] text-stone-400 uppercase tracking-wider mt-0.5">
                    {selectedItem.type} {selectedItem.subtype ? `· ${selectedItem.subtype}` : ''}
                  </div>

                  <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                    {selectedItem.description}
                  </p>

                  {/* Stats Breakdown */}
                  <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-1 text-xs font-mono-stat">
                    {selectedItem.attack && (
                      <div className="text-amber-400 font-bold">+{selectedItem.attack} Attack Damage</div>
                    )}
                    {selectedItem.defense && (
                      <div className="text-sky-400 font-bold">+{selectedItem.defense} Armor Defense</div>
                    )}
                    {selectedItem.hpBonus && (
                      <div className="text-emerald-400">+{selectedItem.hpBonus} Max Health</div>
                    )}
                    {selectedItem.manaBonus && (
                      <div className="text-indigo-400">+{selectedItem.manaBonus} Max Mana</div>
                    )}
                    {selectedItem.critChance && (
                      <div className="text-amber-300">
                        +{Math.round(selectedItem.critChance * 100)}% Critical Strike
                      </div>
                    )}
                    {selectedItem.lifeSteal && (
                      <div className="text-rose-400">
                        +{Math.round(selectedItem.lifeSteal * 100)}% Life Steal
                      </div>
                    )}
                    {selectedItem.dodgeChance && (
                      <div className="text-cyan-400">
                        +{Math.round(selectedItem.dodgeChance * 100)}% Dodge Chance
                      </div>
                    )}
                    {selectedItem.healAmount && (
                      <div className="text-emerald-400 font-bold">Restores +{selectedItem.healAmount} HP</div>
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
                </div>

                {/* Primary Action Button */}
                <div className="mt-4 pt-3 border-t border-stone-800/80">
                  {activeTab === 'buy' ? (
                    <button
                      disabled={!canAfford(selectedItem) || !hasSpace}
                      onClick={() => {
                        if (!canAfford(selectedItem) || !hasSpace) return;
                        soundEngine.haptic(30);
                        onBuyItem(selectedItem);
                        const remaining = merchant.stock.filter((i) => i.id !== selectedItem.id);
                        setSelectedItem(remaining[0] || null);
                      }}
                      className={`min-h-[48px] w-full py-3 rounded-xl font-cinzel font-bold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                        canAfford(selectedItem) && hasSpace
                          ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-stone-950'
                          : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {!hasSpace
                        ? 'Backpack Full'
                        : !canAfford(selectedItem)
                        ? `Need ${selectedItem.goldValue} Gold`
                        : `Purchase for ${selectedItem.goldValue} 🪙`}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        soundEngine.haptic(25);
                        onSellItem(selectedItem);
                        const remaining = player.inventory.filter((i) => i.id !== selectedItem.id);
                        setSelectedItem(remaining[0] || null);
                      }}
                      className="min-h-[48px] w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-cinzel font-bold text-sm uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                    >
                      Sell for +{sellPrice(selectedItem)} 🪙
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-stone-800 rounded-xl flex items-center justify-center p-6 text-center text-xs text-stone-500 font-mono-stat">
                Select an item to inspect its properties and trade value.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
