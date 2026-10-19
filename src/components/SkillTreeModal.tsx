/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, SkillBranch, SkillNode } from '../types/game';
import { SKILL_BRANCHES, SKILL_TREE_NODES, canUnlockSkill } from '../skills/skillTreeData';
import { soundEngine } from '../audio/soundEngine';

interface SkillTreeModalProps {
  player: Player;
  onClose: () => void;
  onUnlockSkill: (skillId: string) => void;
}

export const SkillTreeModal: React.FC<SkillTreeModalProps> = ({
  player,
  onClose,
  onUnlockSkill,
}) => {
  const [activeBranch, setActiveBranch] = useState<SkillBranch>('warrior');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('w_heavy_strike');

  const branchData = SKILL_BRANCHES.find((b) => b.id === activeBranch)!;
  const branchNodes = Object.values(SKILL_TREE_NODES).filter((n) => n.branch === activeBranch);

  const tier1 = branchNodes.filter((n) => n.tier === 1);
  const tier2 = branchNodes.filter((n) => n.tier === 2);
  const tier3 = branchNodes.filter((n) => n.tier === 3);

  const selectedNode = SKILL_TREE_NODES[selectedNodeId];
  const isUnlocked = player.unlockedSkills.includes(selectedNodeId);
  const unlockStatus = canUnlockSkill(selectedNodeId, player.unlockedSkills, player.stats.skillPoints);

  const handleLearnSkill = () => {
    if (unlockStatus.canUnlock) {
      soundEngine.haptic(35);
      soundEngine.playLevelUp();
      onUnlockSkill(selectedNodeId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 select-none pb-safe pt-safe">
      <div className="relative w-full max-w-5xl bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-stone-800 bg-stone-900/70">
          <div className="flex items-center gap-2.5">
            <span className="text-xl sm:text-2xl">✨</span>
            <div>
              <h2 className="font-cinzel text-base sm:text-lg font-bold text-stone-100">Ability Codex & Skills</h2>
              <div className="text-[11px] sm:text-xs text-stone-400 hidden sm:block">
                Customize abilities, master martial arts & forbidden arcana
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-amber-950/80 border border-amber-600/60 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg flex items-center gap-1.5 sm:gap-2 shadow-sm">
              <span className="text-amber-400 text-sm">⭐</span>
              <span className="font-cinzel text-xs font-bold text-amber-300">
                {player.stats.skillPoints} SP
              </span>
            </div>
            <button
              onClick={() => {
                soundEngine.haptic(15);
                onClose();
              }}
              className="min-h-[44px] min-w-[44px] text-stone-400 hover:text-stone-100 text-sm font-mono-stat rounded-lg hover:bg-stone-800 active:bg-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Close [Esc / K]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Branch Selector Tabs (Large touch targets for phones) */}
        <div className="flex border-b border-stone-800 bg-stone-950">
          {SKILL_BRANCHES.map((branch) => {
            const isActive = activeBranch === branch.id;
            const branchUnlockedCount = Object.values(SKILL_TREE_NODES).filter(
              (n) => n.branch === branch.id && player.unlockedSkills.includes(n.id)
            ).length;

            return (
              <button
                key={branch.id}
                onClick={() => {
                  soundEngine.haptic(15);
                  soundEngine.playFootstep();
                  setActiveBranch(branch.id);
                  const firstNode = Object.values(SKILL_TREE_NODES).find((n) => n.branch === branch.id);
                  if (firstNode) setSelectedNodeId(firstNode.id);
                }}
                className={`flex-1 min-h-[48px] py-2.5 sm:py-3 px-2 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs font-cinzel font-bold transition-all cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-stone-900/50'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <span className="text-base sm:text-lg">{branch.icon}</span>
                <span className="truncate">{branch.name}</span>
                <span className="text-[10px] font-mono-stat text-stone-500 ml-0.5">
                  ({branchUnlockedCount}/6)
                </span>
              </button>
            );
          })}
        </div>

        {/* Tree Content Area & Inspector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto">
          {/* Left Tree Node Graph (8 cols) */}
          <div className="md:col-span-8 flex flex-col justify-between min-h-[360px] bg-stone-900/30 p-3 sm:p-5 rounded-xl border border-stone-800/80 relative">
            {/* Branch Header */}
            <div className="relative z-10 mb-3">
              <h3 className="font-cinzel text-sm font-bold text-stone-200">{branchData.title}</h3>
              <p className="text-xs text-stone-400 mt-0.5">{branchData.description}</p>
            </div>

            {/* Skill Tiers */}
            <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
              {/* Tier 1 */}
              <div>
                <div className="text-[10px] font-mono-stat text-stone-400 tracking-wider uppercase mb-1.5">
                  Tier I · Initiation
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  {tier1.map((node) => renderNodeButton(node))}
                </div>
              </div>

              <div className="flex justify-around text-stone-700 text-xs py-0.5">
                <span>↓</span>
                <span>↓</span>
              </div>

              {/* Tier 2 */}
              <div>
                <div className="text-[10px] font-mono-stat text-stone-400 tracking-wider uppercase mb-1.5">
                  Tier II · Mastery (Requires Tier I)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  {tier2.map((node) => renderNodeButton(node))}
                </div>
              </div>

              <div className="flex justify-around text-stone-700 text-xs py-0.5">
                <span>↓</span>
                <span>↓</span>
              </div>

              {/* Tier 3 */}
              <div>
                <div className="text-[10px] font-mono-stat text-stone-400 tracking-wider uppercase mb-1.5">
                  Tier III · Capstone Supremacy
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  {tier3.map((node) => renderNodeButton(node))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Selected Skill Inspector & Unlock Action (4 cols) */}
          <div className="md:col-span-4 flex flex-col justify-between bg-stone-900/50 p-4 sm:p-5 rounded-xl border border-stone-800/80">
            {selectedNode ? (
              <div className="flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl sm:text-4xl p-2 bg-stone-950 rounded-xl border border-stone-800">
                      {selectedNode.icon}
                    </span>
                    <span
                      className={`text-[10px] font-mono-stat uppercase px-2 py-0.5 rounded-full font-bold ${
                        selectedNode.isPassive
                          ? 'bg-sky-950/80 text-sky-400 border border-sky-800/50'
                          : 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                      }`}
                    >
                      {selectedNode.isPassive ? 'Passive Perk' : 'Active Skill'}
                    </span>
                  </div>

                  <h3 className="font-cinzel font-bold text-stone-100 text-base mt-3">
                    {selectedNode.name}
                  </h3>
                  <div className="text-[11px] font-mono-stat text-amber-500/90 mt-0.5">
                    Tier {selectedNode.tier} {selectedNode.branch.toUpperCase()}
                  </div>

                  <p className="text-xs text-stone-300 mt-2.5 leading-relaxed">
                    {selectedNode.description}
                  </p>

                  {/* Active Skill Specifics */}
                  {!selectedNode.isPassive && (
                    <div className="mt-3 pt-3 border-t border-stone-800/80 space-y-1.5 text-xs font-mono-stat">
                      {selectedNode.manaCost && (
                        <div className="flex justify-between text-stone-300">
                          <span>Mana Cost:</span>
                          <span className="text-sky-400 font-bold">{selectedNode.manaCost} MP</span>
                        </div>
                      )}
                      {selectedNode.cooldown && (
                        <div className="flex justify-between text-stone-300">
                          <span>Cooldown:</span>
                          <span className="text-amber-400 font-bold">{selectedNode.cooldown} Turns</span>
                        </div>
                      )}
                      {selectedNode.range !== undefined && (
                        <div className="flex justify-between text-stone-300">
                          <span>Range:</span>
                          <span className="text-stone-200">
                            {selectedNode.range === 0 ? 'Self' : `${selectedNode.range} Tiles`}
                          </span>
                        </div>
                      )}
                      {selectedNode.damageMultiplier && (
                        <div className="flex justify-between text-stone-300">
                          <span>Damage Scale:</span>
                          <span className="text-red-400 font-bold">
                            {Math.round(selectedNode.damageMultiplier * 100)}% Attack
                          </span>
                        </div>
                      )}
                      {selectedNode.statusEffect && (
                        <div className="flex justify-between text-stone-300">
                          <span>Inflicts:</span>
                          <span className="text-amber-400 uppercase font-semibold">
                            {selectedNode.statusEffect} ({selectedNode.statusDuration} turns)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedNode.requires && selectedNode.requires.length > 0 && (
                    <div className="mt-2.5 text-[11px] font-mono-stat text-stone-400">
                      <span>Requires: </span>
                      <span className="text-stone-300">
                        {selectedNode.requires.map((id) => SKILL_TREE_NODES[id]?.name || id).join(' or ')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Big Thumb Unlock CTA Button */}
                <div className="mt-5 pt-3 border-t border-stone-800/80">
                  {isUnlocked ? (
                    <div className="w-full min-h-[48px] flex items-center justify-center font-cinzel text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-600/40 rounded-xl">
                      ✓ Mastered & Active
                    </div>
                  ) : (
                    <button
                      disabled={!unlockStatus.canUnlock}
                      onClick={handleLearnSkill}
                      className={`w-full min-h-[48px] py-3 rounded-xl font-cinzel text-xs sm:text-sm font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-lg ${
                        unlockStatus.canUnlock
                          ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                          : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      {unlockStatus.canUnlock
                        ? `Learn Skill (${selectedNode.cost} SP)`
                        : unlockStatus.reason || 'Cannot Learn'}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  function renderNodeButton(node: SkillNode) {
    const isNodeUnlocked = player.unlockedSkills.includes(node.id);
    const isSelected = selectedNodeId === node.id;
    const canUnlock = canUnlockSkill(node.id, player.unlockedSkills, player.stats.skillPoints).canUnlock;

    return (
      <button
        key={node.id}
        onClick={() => {
          soundEngine.haptic(15);
          soundEngine.playFootstep();
          setSelectedNodeId(node.id);
        }}
        className={`min-h-[56px] p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 sm:gap-3 transition-all text-left active:scale-95 cursor-pointer ${
          isSelected
            ? 'border-amber-400 bg-stone-900 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
            : isNodeUnlocked
            ? 'border-amber-600/70 bg-amber-950/20 text-stone-200'
            : canUnlock
            ? 'border-sky-500/60 bg-sky-950/20 text-stone-300 hover:border-sky-400'
            : 'border-stone-800 bg-stone-950/40 opacity-50 text-stone-500'
        }`}
      >
        <span className="text-2xl sm:text-3xl">{node.icon}</span>
        <div className="truncate flex-1">
          <div className="font-cinzel font-bold text-xs sm:text-sm truncate text-stone-100">{node.name}</div>
          <div className="text-[10px] font-mono-stat text-stone-400 truncate">
            {node.isPassive ? 'Passive' : `${node.manaCost || 0} Mana`}
          </div>
        </div>

        {isNodeUnlocked && (
          <span className="ml-auto text-amber-400 text-sm font-bold" title="Mastered">
            ✓
          </span>
        )}
      </button>
    );
  }
};
