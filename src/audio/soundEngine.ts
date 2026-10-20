/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Procedural Web Audio API sound & dark-fantasy theme music synthesizer
// + Granular Haptic & Game Settings Manager
// Zero external audio files required, instant feedback, no network latency.

export type ControllerSizeSetting = 'standard' | 'large' | 'xl';
export type ControllerModeSetting = 'joystick' | 'dpad';
export type HapticCategory = 'walk' | 'strike' | 'ui';

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  walkHaptic: boolean;
  strikeHaptic: boolean;
  screenShake: boolean;
  controllerMode: ControllerModeSetting;
  controllerSize: ControllerSizeSetting;
}

const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  musicEnabled: true,
  walkHaptic: true,
  strikeHaptic: true,
  screenShake: true,
  controllerMode: 'joystick',
  controllerSize: 'large',
};

type SettingsListener = (settings: GameSettings) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<SettingsListener> = new Set();

  // Procedural Dark-Fantasy Theme Music state
  private musicIntervalId: number | null = null;
  private musicStep: number = 0;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private isMusicPlaying: boolean = false;

  constructor() {
    this.loadSettings();
    this.setupAutoUnlock();
  }

  public loadSettings() {
    try {
      const raw = localStorage.getItem('abyssal_settings');
      const parsed = raw ? JSON.parse(raw) : {};

      // Backwards compatibility with legacy keys
      const legacyMuted = localStorage.getItem('abyssal_muted');
      const legacyMode = localStorage.getItem('abyssal_ctrl_mode');
      const legacySize = localStorage.getItem('abyssal_ctrl_size');

      this.settings = {
        sfxEnabled:
          typeof parsed.sfxEnabled === 'boolean'
            ? parsed.sfxEnabled
            : legacyMuted !== null
              ? legacyMuted !== 'true'
              : DEFAULT_SETTINGS.sfxEnabled,
        musicEnabled:
          typeof parsed.musicEnabled === 'boolean'
            ? parsed.musicEnabled
            : DEFAULT_SETTINGS.musicEnabled,
        walkHaptic:
          typeof parsed.walkHaptic === 'boolean'
            ? parsed.walkHaptic
            : DEFAULT_SETTINGS.walkHaptic,
        strikeHaptic:
          typeof parsed.strikeHaptic === 'boolean'
            ? parsed.strikeHaptic
            : DEFAULT_SETTINGS.strikeHaptic,
        screenShake:
          typeof parsed.screenShake === 'boolean'
            ? parsed.screenShake
            : DEFAULT_SETTINGS.screenShake,
        controllerMode:
          parsed.controllerMode === 'joystick' || parsed.controllerMode === 'dpad'
            ? parsed.controllerMode
            : legacyMode === 'joystick' || legacyMode === 'dpad'
              ? legacyMode
              : DEFAULT_SETTINGS.controllerMode,
        controllerSize:
          parsed.controllerSize === 'standard' ||
          parsed.controllerSize === 'large' ||
          parsed.controllerSize === 'xl'
            ? parsed.controllerSize
            : legacySize === 'standard' || legacySize === 'large' || legacySize === 'xl'
              ? legacySize
              : DEFAULT_SETTINGS.controllerSize,
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private persistSettings() {
    try {
      localStorage.setItem('abyssal_settings', JSON.stringify(this.settings));
      localStorage.setItem('abyssal_muted', String(!this.settings.sfxEnabled));
      localStorage.setItem('abyssal_ctrl_mode', this.settings.controllerMode);
      localStorage.setItem('abyssal_ctrl_size', this.settings.controllerSize);
    } catch {}
    this.listeners.forEach((listener) => listener({ ...this.settings }));
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<GameSettings>): GameSettings {
    const prevMusic = this.settings.musicEnabled;
    this.settings = { ...this.settings, ...partial };
    this.persistSettings();

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.settings.sfxEnabled ? 0.35 : 0,
        this.ctx.currentTime
      );
    }

    if (this.settings.musicEnabled !== prevMusic) {
      if (this.settings.musicEnabled) {
        this.startThemeMusic();
      } else {
        this.stopThemeMusic();
      }
    }

    return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.initContext();
      if (this.settings.musicEnabled && !this.isMusicPlaying) {
        this.startThemeMusic();
      }
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this.settings.sfxEnabled ? 0.35 : 0,
          this.ctx.currentTime
        );
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(0.14, this.ctx.currentTime);
        this.musicGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMuted(): boolean {
    return !this.settings.sfxEnabled;
  }

  public toggleMute(): boolean {
    const nextSfx = !this.settings.sfxEnabled;
    this.updateSettings({ sfxEnabled: nextSfx });
    return !nextSfx;
  }

  /**
   * Category-aware haptic feedback:
   * - 'walk': only vibrates when walkHaptic is ON
   * - 'strike': only vibrates when strikeHaptic is ON
   * - 'ui': vibrates if either walkHaptic or strikeHaptic is ON
   */
  public haptic(ms: number | number[] = 15, category: HapticCategory = 'ui') {
    try {
      if (category === 'walk' && !this.settings.walkHaptic) return;
      if (category === 'strike' && !this.settings.strikeHaptic) return;
      if (category === 'ui' && !this.settings.walkHaptic && !this.settings.strikeHaptic) return;

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {}
  }

  /**
   * Stranger Things-Inspired Progressive Synth Arpeggio & Mysterious Theme Music
   * - 8-note rising & falling analog sawtooth/triangle arpeggiator (C3-E3-G3-B3-C4-B3-G3-E3)
   *   that shifts into a dark tension chord (A2-E3-G3-B3-C4-B3-G3-E3) every 4 bars
   * - Progressive resonant low-pass filter sweep (340Hz <-> 2400Hz) that breathes over time
   * - Deep analog sub-bass drone + double-thump heartbeat pulse on every bar
   * - Mysterious high detuned eerie pad swells in the background
   */
  public startThemeMusic() {
    if (!this.settings.musicEnabled) return;
    this.initContext();
    if (!this.ctx || !this.musicGain) return;
    if (this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    const t = this.ctx.currentTime;

    // 1. Deep Analog Sub-Bass Drone (C2 = 65.41Hz + G2 = 98.00Hz warm low-passed pad)
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(160, t);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, t);
      this.droneGain.gain.linearRampToValueAtTime(0.24, t + 2.0);

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc2.type = 'triangle';
      this.droneOsc1.frequency.setValueAtTime(65.41, t); // C2
      this.droneOsc1.detune.setValueAtTime(-6, t);
      this.droneOsc2.frequency.setValueAtTime(130.81, t); // C3 warm sub-octave
      this.droneOsc2.detune.setValueAtTime(6, t);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.musicGain);

      this.droneOsc1.start(t);
      this.droneOsc2.start(t);
    } catch {}

    // Classic 8-note Cmaj7 progressive arpeggio: C3 - E3 - G3 - B3 - C4 - B3 - G3 - E3
    const arpPatternCmaj7 = [
      130.81, // C3
      164.81, // E3
      196.00, // G3
      246.94, // B3
      261.63, // C4
      246.94, // B3
      196.00, // G3
      164.81, // E3
    ];

    // Darker mysterious tension variation (Am9 / Fmaj7#11 feel) on bars 5-6
    const arpPatternMystery = [
      110.00, // A2
      164.81, // E3
      196.00, // G3
      246.94, // B3
      293.66, // D4
      246.94, // B3
      196.00, // G3
      164.81, // E3
    ];

    // Eerie high mystery pad notes that slowly swell in the background
    const mysteryPadNotes = [
      493.88, // B4
      659.25, // E5
      587.33, // D5
      392.00, // G4
      369.99, // F#4 (Lydian/Eerie tension)
      493.88, // B4
    ];

    const playArpStep = () => {
      if (!this.settings.musicEnabled || !this.ctx || !this.musicGain) return;
      if (this.ctx.state === 'suspended') return;

      const now = this.ctx.currentTime;
      const step = this.musicStep++;
      const barIndex = Math.floor(step / 8);
      const stepInBar = step % 8;

      // Alternate between 4 bars of iconic Cmaj7 and 2 bars of dark Am9 tension
      const useMysteryChord = barIndex % 6 >= 4;
      const pattern = useMysteryChord ? arpPatternMystery : arpPatternCmaj7;
      const freq = pattern[stepInBar];

      // Shift sub-drone root smoothly between C2 (65.41Hz) and A1 (55.0Hz)
      if (stepInBar === 0 && this.droneOsc1 && this.droneOsc2) {
        const rootFreq = useMysteryChord ? 55.0 : 65.41;
        this.droneOsc1.frequency.setTargetAtTime(rootFreq, now, 0.15);
        this.droneOsc2.frequency.setTargetAtTime(rootFreq * 2, now, 0.15);
      }

      // Progressive Filter Cutoff Sweep (breathes between 340Hz and 2350Hz over 64 steps)
      const sweepPhase = (Math.sin((step / 64) * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
      const cutoff = 340 + sweepPhase * 2010;

      // Dual detuned analog synth oscillators for each arpeggio note
      const oscSaw = this.ctx.createOscillator();
      const oscTri = this.ctx.createOscillator();
      const arpFilter = this.ctx.createBiquadFilter();
      const noteGain = this.ctx.createGain();

      oscSaw.type = 'sawtooth';
      oscTri.type = 'triangle';

      // Subtle octave shimmer on top note of arpeggio (stepInBar === 4) when filter opens up
      const noteFreq = stepInBar === 4 && sweepPhase > 0.65 ? freq * 2 : freq;
      oscSaw.frequency.setValueAtTime(noteFreq, now);
      oscTri.frequency.setValueAtTime(noteFreq, now);
      oscSaw.detune.setValueAtTime(-7, now);
      oscTri.detune.setValueAtTime(7, now);

      arpFilter.type = 'lowpass';
      arpFilter.Q.setValueAtTime(4.2, now); // Resonant analog synth bite
      arpFilter.frequency.setValueAtTime(cutoff, now);
      arpFilter.frequency.exponentialRampToValueAtTime(Math.max(220, cutoff * 0.42), now + 0.16);

      // Plucky analog envelope
      const accent = stepInBar === 0 || stepInBar === 4 ? 0.21 : 0.15;
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(accent, now + 0.014);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.17);

      oscSaw.connect(arpFilter);
      oscTri.connect(arpFilter);
      arpFilter.connect(noteGain);
      noteGain.connect(this.musicGain);

      oscSaw.start(now);
      oscTri.start(now);
      oscSaw.stop(now + 0.18);
      oscTri.stop(now + 0.18);

      // 2. Deep Analog Heartbeat Pulse on beat 0 and beat 1 of each 8-step bar
      if (stepInBar === 0 || stepInBar === 1) {
        const pulseOsc = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();
        pulseOsc.type = 'sine';
        pulseOsc.frequency.setValueAtTime(stepInBar === 0 ? 68 : 54, now);
        pulseOsc.frequency.exponentialRampToValueAtTime(28, now + 0.14);

        pulseGain.gain.setValueAtTime(stepInBar === 0 ? 0.34 : 0.24, now);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        pulseOsc.connect(pulseGain);
        pulseGain.connect(this.musicGain);
        pulseOsc.start(now);
        pulseOsc.stop(now + 0.16);
      }

      // 3. Mysterious Eerie Atmospheric Synth Swell every 16 steps (2 bars)
      if (step % 16 === 0) {
        const padIdx = Math.floor(step / 16) % mysteryPadNotes.length;
        const padFreq = mysteryPadNotes[padIdx];

        const padOsc1 = this.ctx.createOscillator();
        const padOsc2 = this.ctx.createOscillator();
        const padFilter = this.ctx.createBiquadFilter();
        const padGain = this.ctx.createGain();

        padOsc1.type = 'sine';
        padOsc2.type = 'sawtooth';
        padOsc1.frequency.setValueAtTime(padFreq, now);
        padOsc2.frequency.setValueAtTime(padFreq, now);
        padOsc1.detune.setValueAtTime(-11, now);
        padOsc2.detune.setValueAtTime(11, now);

        // Slow eerie pitch drift
        padOsc1.frequency.linearRampToValueAtTime(padFreq * 0.996, now + 2.6);

        padFilter.type = 'lowpass';
        padFilter.frequency.setValueAtTime(520, now);
        padFilter.frequency.linearRampToValueAtTime(1250, now + 1.3);
        padFilter.frequency.linearRampToValueAtTime(420, now + 2.7);

        padGain.gain.setValueAtTime(0.0005, now);
        padGain.gain.linearRampToValueAtTime(0.11, now + 1.1);
        padGain.gain.exponentialRampToValueAtTime(0.0008, now + 2.75);

        padOsc1.connect(padFilter);
        padOsc2.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(this.musicGain);

        padOsc1.start(now);
        padOsc2.start(now);
        padOsc1.stop(now + 2.8);
        padOsc2.stop(now + 2.8);
      }
    };

    playArpStep();
    // 175ms per 16th-note step (~171 BPM 80s analog synth pulse)
    this.musicIntervalId = window.setInterval(playArpStep, 175);
  }

  public stopThemeMusic() {
    this.isMusicPlaying = false;
    if (this.musicIntervalId !== null) {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    try {
      if (this.droneOsc1) {
        this.droneOsc1.stop();
        this.droneOsc1.disconnect();
        this.droneOsc1 = null;
      }
      if (this.droneOsc2) {
        this.droneOsc2.stop();
        this.droneOsc2.disconnect();
        this.droneOsc2 = null;
      }
      if (this.droneGain) {
        this.droneGain.disconnect();
        this.droneGain = null;
      }
    } catch {}
  }

  public playFootstep() {
    this.haptic(8, 'walk');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110 + Math.random() * 20, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.05);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  public playAttack() {
    this.haptic(22, 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // Fast whoosh noise
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playHit(isCrit: boolean = false) {
    this.haptic(isCrit ? [30, 30, 45] : 28, 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Impact punch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 260 : 180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + (isCrit ? 0.2 : 0.12));

    gain.gain.setValueAtTime(isCrit ? 0.35 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isCrit ? 0.22 : 0.13));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + (isCrit ? 0.23 : 0.14));

    // For crit: add high bell ring
    if (isCrit) {
      const bell = this.ctx.createOscillator();
      const bellGain = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(880, t);
      bell.frequency.exponentialRampToValueAtTime(1320, t + 0.25);
      bellGain.gain.setValueAtTime(0.25, t);
      bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      bell.connect(bellGain);
      bellGain.connect(this.masterGain);

      bell.start();
      bell.stop(t + 0.3);
    }
  }

  public playKill() {
    this.haptic(35, 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.25);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.26);
  }

  public playSpell(type: 'fire' | 'frost' | 'shadow' | 'heal' = 'fire') {
    this.haptic(25, 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'fire') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.linearRampToValueAtTime(540, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.25);
    } else if (type === 'frost') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
    } else if (type === 'shadow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
    } else {
      // Heal chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
    }

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.33);
  }

  public playPotion() {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    [320, 480, 640].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      gain.gain.setValueAtTime(0.12, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (idx + 1) * 0.09);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + (idx + 1) * 0.1);
    });
  }

  public playChest() {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Ascending arpeggio
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.07);
      gain.gain.setValueAtTime(0.16, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.22);
    });
  }

  public playLevelUp() {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    // Heroic fanfare: C4, E4, G4, C5
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);
      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        t + i * 0.08 + (i === notes.length - 1 ? 0.6 : 0.25)
      );
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.65);
    });
  }

  public playShrine() {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.exponentialRampToValueAtTime(784, t + 0.4);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.55);
  }

  public playStairs() {
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.4);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.48);
  }

  public playPlayerHurt() {
    this.haptic(35, 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.18);
  }

  public playDeath() {
    this.haptic([50, 40, 80], 'strike');
    if (!this.settings.sfxEnabled) return;
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.8);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(t + 0.95);
  }
}

export const soundEngine = new SoundEngine();
