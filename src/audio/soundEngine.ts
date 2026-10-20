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
   * Procedural Dark-Fantasy Dungeon Theme Music
   * Uses a deep D-minor sub-bass drone + haunting Phrygian minor arpeggio chimes
   */
  public startThemeMusic() {
    if (!this.settings.musicEnabled) return;
    this.initContext();
    if (!this.ctx || !this.musicGain) return;
    if (this.isMusicPlaying) return;

    this.isMusicPlaying = true;
    const t = this.ctx.currentTime;

    // Subtle dark dungeon drone (D2 = 73.42Hz + A2 = 110Hz filtered)
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, t);

      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, t);
      this.droneGain.gain.linearRampToValueAtTime(0.28, t + 1.5);

      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc2.type = 'triangle';
      this.droneOsc1.frequency.setValueAtTime(73.42, t); // D2
      this.droneOsc2.frequency.setValueAtTime(110.0, t); // A2

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(this.musicGain);

      this.droneOsc1.start(t);
      this.droneOsc2.start(t);
    } catch {}

    // Haunting D-Minor / Phrygian arpeggio sequence (D4, F4, A4, Bb4, A4, F4, Eb4, D4, C#4, D4, G4, F4)
    const melodyNotes = [
      293.66, // D4
      349.23, // F4
      440.0,  // A4
      466.16, // Bb4
      440.0,  // A4
      349.23, // F4
      311.13, // Eb4
      293.66, // D4
      277.18, // C#4
      293.66, // D4
      392.0,  // G4
      349.23, // F4
    ];

    const playNextNote = () => {
      if (!this.settings.musicEnabled || !this.ctx || !this.musicGain) return;
      if (this.ctx.state === 'suspended') return;

      const now = this.ctx.currentTime;
      const freq = melodyNotes[this.musicStep % melodyNotes.length];
      this.musicStep++;

      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = this.musicStep % 4 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(this.musicGain);

      osc.start(now);
      osc.stop(now + 1.5);
    };

    playNextNote();
    this.musicIntervalId = window.setInterval(playNextNote, 850);
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
