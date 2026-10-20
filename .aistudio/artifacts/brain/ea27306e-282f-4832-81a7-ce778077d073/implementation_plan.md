# Comprehensive Settings Menu (Audio, Theme Music, Granular Haptics, Visual Effects & Controller)

This update adds a dedicated **⚙️ Settings** option to the **Main Menu**, as well as quick access from the **Pause Menu** and **In-Game HUD Menu (`☰`)**, allowing players to customize audio, procedural dark-fantasy theme music, walking vs. strike haptics, screen shake/hit-flash effects, and controller presets.

> [!IMPORTANT]
> **Confirmed User Choices**
> - **Audio & Haptic Controls**: Independent toggles for **Sound Effects (SFX)**, **Theme Music**, **Walking Haptics**, and **Strike & Combat Haptics**.
> - **Additional Settings**: **Default Controller Style & Size** selector (`Floating Stick` vs `D-Pad`, `Standard / Large / XL`) and **Screen Shake & Hit-Flash Effects** toggle.
> - **Access Points**: Accessible from both the **Main Menu** (`⚙️ Settings` button) and in-game via the **HUD Menu (`☰`)** and **Pause Menu**.

---

## 1. Overview & Core Concept
- **What It Does**: Provides a centralized, persistent game settings system stored in `localStorage` (`abyssal_settings`) with real-time Web Audio synthesizer support for atmospheric dungeon theme music, category-aware haptics (`walk`, `strike`, `ui`), visual impact toggles, and controller preferences.
- **Key Value**: Lets players tailor tactile vibration (e.g., turning off walking vibration while keeping heavy strike vibration), toggle ambient dark-fantasy theme music independently from combat sound effects, and configure their preferred mobile thumbstick setup before or during a run.

---

## 2. User Experience & Settings Breakdown

### 1. Audio & Atmospheric Theme Music
- **🔊 Sound Effects (SFX) (`On / Off`)**: Controls footsteps, sword slashes, elemental spells, potions, and chest chimes.
- **🎵 Dark-Fantasy Theme Music (`On / Off`)**: Drives a new procedural Web Audio dark-fantasy ambient synth loop (deep minor-key dungeon drone and haunting arpeggiated chimes with zero external audio downloads required).

### 2. Granular Haptic Vibration Feedback
- **👣 Haptic for Walking (`On / Off`)**: Controls subtle step vibration when moving with the floating joystick or D-pad.
- **⚔️ Haptic for Strike & Combat (`On / Off`)**: Controls heavier tactile vibration when pressing Strike, landing critical hits, casting skills, or taking damage.

### 3. Visual Effects & Mobile Controller Defaults
- **💥 Screen Shake & Hit-Flash (`On / Off`)**: Enables or disables camera shake and red damage flash overlays during combat impacts.
- **🕹️ Controller Style & Size**: Switch between **Floating Stick** and **D-Pad**, and choose **Standard**, **Large**, or **XL** button sizing directly inside Settings.

---

## 3. Technical Architecture & State Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                   Settings Store (localStorage)                      │
│  sfxEnabled | musicEnabled | walkHaptic | strikeHaptic | screenShake │
│  controllerMode ('joystick' | 'dpad') | controllerSize ('std'|'lg')  │
└───────────────┬──────────────────────────────────────┬───────────────┘
                │                                      │
                ▼                                      ▼
┌───────────────────────────────────┐  ┌───────────────────────────────┐
│        SettingsModal UI           │  │  Runtime Engines & Renderer   │
│  • Main Menu (⚙️ Settings Button) │  │  • soundEngine (SFX, Theme    │
│  • In-Game HUD Menu (☰ -> ⚙️)     │  │    Music Synth, Walk/Strike   │
│  • Pause Modal (⚙️ Settings)      │  │    Haptic filtering)          │
│                                   │  │  • DungeonRenderer (Shake &   │
│                                   │  │    Hit-Flash gating)          │
└───────────────────────────────────┘  └───────────────────────────────┘
```

- **Instant Persistence & Cloud Sync**: All settings persist immediately to `localStorage` and are included when exporting/importing your setup code via the Main Menu **☁️ Sync** modal.
