# Stranger Things-Inspired Progressive Synth Arpeggio & Mysterious Theme Music

This update replaces the dungeon theme song in `src/audio/soundEngine.ts` with a multi-layered, **Stranger Things-inspired analog synth score** featuring the iconic 8-note rising-and-falling progressive arpeggiator, a resonant low-pass filter sweep that evolves over time, a deep heartbeat bass pulse, and mysterious atmospheric synth swells.

---

## 1. Musical Architecture & Sound Layers

1. **Progressive 8-Note Analog Arpeggiator (`C3 – E3 – G3 – B3 – C4 – B3 – G3 – E3`)**
   - Uses dual detuned `sawtooth` + `triangle` oscillators running at ~168 BPM 16th-note pulse (`~178ms` per step).
   - **Progressive Filter Sweep**: A resonant low-pass filter (`BiquadFilterNode` with `Q = 4.5`) slowly opens and closes across a 32-step cycle (`320 Hz` → `2,400 Hz` → `320 Hz`), giving the arpeggio that signature warm, breathing analog synthesizer progression.
   - **Chord Progression Shift**: Alternates between the classic **Cmaj7** (`C-E-G-B-C5-B-G-E`) mystery pattern and a darker **Amin9 / Em/B** tension variation every 4 bars so the loop feels alive and cinematic.

2. **Deep Analog Sub-Bass & Heartbeat Pulse**
   - Every bar (8 arpeggio steps), a deep `C1 / C2` analog bass swell and subtle double-thump heartbeat (`55 Hz` → `32 Hz`) anchors the low end without muddying combat sound effects.

3. **Mysterious High Eerie Pad Swells**
   - Every 16 steps, a slow-attack detuned `sine` + `triangle` mystery pad (`B4`, `E5`, `G4`, `F#4`) fades in and out with a long tail, creating an eerie, otherworldly atmosphere in the background.

---

## 2. Files to Modify
- **`src/audio/soundEngine.ts`**:
  - Upgrade `startThemeMusic()` and `stopThemeMusic()` with the multi-layered progressive analog synth arpeggiator, filter modulation, sub-bass pulse, and eerie mystery pads.
- **`src/components/SettingsModal.tsx`**:
  - Update the Theme Music description to reflect the new *"Stranger Things-style progressive synth arp & mystery pads"* and allow instant live preview when toggled on.
