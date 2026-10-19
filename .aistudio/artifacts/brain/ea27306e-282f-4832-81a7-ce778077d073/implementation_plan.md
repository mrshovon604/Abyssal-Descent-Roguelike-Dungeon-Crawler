# Abyssal Descent: Gameplay, Visual & Mobile Controller Expansion

This upgrade enriches **Abyssal Descent** with a full gold economy via a Wandering Merchant, an interactive dungeon mini-map, multi-phase boss encounters and floor events, canvas-rendered weapon slash and spell projectile animations, atmospheric dungeon decals and torchlight, and upgraded Android touch ergonomics featuring an 8-way press-and-hold D-pad and pinch-to-zoom camera control.

### User Review & Critical Decisions

> [!IMPORTANT]
> All core feature priorities have been locked in based on your selections. Please review the architectural and design details below and click **Proceed** when ready to build.

- **Confirmed Decision 1 (Gameplay & Economy)**: Add a **Wandering Merchant** encounter on dungeon floors to spend plundered gold, an **Interactive Corner Mini-Map** with expandable view, and **Boss Phase Transitions & Special Floor Events**.
- **Confirmed Decision 2 (Visuals & Combat Feel)**: Retain crisp symbol readability while adding **Animated Weapon Swings & Spell Projectiles** alongside **Dynamic Wall Torches & Floor Decals** (blood splatters, scorch marks, moss, and cracked flagstones).
- **Confirmed Decision 3 (Android & Touch Controls)**: Upgrade the virtual gamepad to support **8-Way Diagonal Movement** (`↖ ↗ ↙ ↘`) with **Press-and-Hold Continuous Stepping**, plus **Two-Finger Pinch-to-Zoom** (and quick zoom buttons) on the dungeon viewport.

---

### 1. Overview & Core Concept

- **What It Does**: Transforms the dungeon crawler from a pure combat loop into a deeper tactical roguelike where gold has meaningful purchasing power, exploration is aided by a live mini-map and pinch-to-zoom inspection, bosses evolve mid-fight, and every melee strike or spell cast produces kinetic visual feedback.
- **Target Audience / Persona**: Mobile and desktop roguelike players looking for tactile, responsive turn-based dungeon crawling optimized for one- or two-thumb Android play.
- **Key Value**: Gives players strategic agency over their gold, clearer spatial awareness across large 44x44 procedural floors, heightened combat juice, and effortless continuous movement on mobile touchscreens.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Floor Arrival & Event Banner**: Entering a new floor announces any active **Special Floor Event** (e.g., *Blood Moon: +25% Monster XP & Attack*, *Gilded Vault: Extra Chests & Merchant Guaranteed*, *Arcane Surge: -30% Spell Mana Cost*) via an atmospheric banner.
  2. **Mini-Map & Pinch-to-Zoom Navigation**: Players glance at the top-right **Mini-Map** to spot explored corridors, stairs (purple), unopened chests (gold), shrines (cyan), and the Merchant (emerald). Tapping the mini-map toggles an expanded overview; pinching two fingers on the main canvas smoothly zooms the camera in or out (`28px` to `68px` tile scale).
  3. **Wandering Merchant Trading**: Stepping onto a Merchant tile (`⚖️`) opens the **Abyssal Peddler Modal**, where players can buy curated weapons, armor, potions, and permanent stat elixirs using gold, or sell unwanted gear from their backpack for 50% gold value.
  4. **Animated Combat & Boss Phases**: Attacking triggers a directional melee slash arc (`sword`/`axe`/`dagger`) or a traveling spell projectile (`Firebolt`, `Frost Nova` ring, `Meteor` descent) that leaves persistent blood or scorch decals on the floor. When a Boss drops below 50% HP, it triggers an **Enraged Phase 2 Transition** with a screen tremor, aura glow, and new multi-tile AoE attack telegraphs.
  5. **8-Way Hold-to-Move Gamepad**: Holding any of the 8 directional D-pad buttons repeats movement steps smoothly every `160ms` (automatically pausing if an enemy steps into melee range to prevent accidental deaths).

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Dark-fantasy tactical dungeon HUD with low-occlusion perimeter framing (`>85%` unobstructed viewport).
  - *Color Palette & Mood*: Deep obsidian canvas (`--background: #09080b`), warm torchlight amber (`--primary: #f59e0b`), merchant emerald (`--accent: #10b981`), arcane sky (`#38bdf8`), and blood crimson (`#ef4444`).
  - *Typography & Hierarchy*: `Cinzel` serif for floor banners, boss phase alerts, and modal titles; `Plus Jakarta Sans` for descriptions; `JetBrains Mono` (`tabular-nums`) for gold prices, stat comparisons, and damage readouts.
  - *Component Styling & Layout*: Touch hitboxes $\ge 48\text{px}$ across all mobile controls, tactile 3D beveled gamepad buttons, and responsive bottom-sheet/tabbed modals for phone viewports.

- **Interactive Feedback & Motion**:
  - Directional weapon slash arcs (`150ms` sweep), projectile interpolation (`200ms` flight), persistent tile decals, wall torch flame particles, and Android haptic pulses (`navigator.vibrate`) on steps, purchases, and boss phase shifts.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Safety Cutoff on Hold-to-Move**
  - *Chosen Approach*: When holding a D-pad direction to walk down corridors, auto-repeat automatically halts the moment an enemy enters adjacent melee range or the player steps onto a trap/shrine.
  - *Why*: In turn-based roguelikes with permadeath, unthrottled hold-to-move can cause players to accidentally mash into a strong monster and die in under a second.
  - *Alternatives Considered*: Pure unthrottled key-repeat, which is too risky for permadeath combat.
- **Decision 2: Canvas-Rendered Mini-Map vs. DOM Grid**
  - *Chosen Approach*: Render the 44x44 mini-map onto a dedicated lightweight `<canvas>` element in the HUD.
  - *Why*: Drawing 1,936 tiles on a mini `<canvas>` takes `<0.2ms` per turn, whereas 1,936 DOM `<div>` nodes would degrade mobile scrolling and frame pacing.
- **Decision 3: Buy & Sell Economy Balance**
  - *Chosen Approach*: Spawn 1 Wandering Merchant on each floor (with 5 stocked items scaled to floor depth) and allow selling backpack items directly from the Merchant modal or Inventory for 50% of their `goldValue`.
  - *Why*: Turns unwanted lower-tier loot drops into liquid gold for potions or high-tier upgrades.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Main Game Loop & State                           │
│  (Turn Engine, Floor Event Modifiers, Pinch-Zoom & Hold-Move Handlers)  │
└───────────────┬─────────────────────────────────────────┬───────────────┘
                │                                         │
                ▼                                         ▼
┌───────────────────────────────────────┐ ┌───────────────────────────────┐
│        Canvas Rendering Engine        │ │     Low-Occlusion UI Shell    │
│ ┌───────────────────────────────────┐ │ │ ┌───────────────────────────┐ │
│ │ Tile & Decal Pass                 │ │ │ │ Corner Mini-Map Canvas    │ │
│ │ (Cracks, Moss, Blood, Scorch,     │ │ │ │ (Compact & Expanded Mode) │ │
│ │  Wall Torches & Flicker Glow)     │ │ │ └───────────────────────────┘ │
│ └───────────────────────────────────┘ │ │ ┌───────────────────────────┐ │
│ ┌───────────────────────────────────┐ │ │ │ 8-Way Hold-to-Move D-Pad  │ │
│ │ Entity & Boss Phase Pass          │ │ │ │ & Zoom / Action Cluster   │ │
│ │ (Boss Enrage Aura, AoE Telegraphs)│ │ │ └───────────────────────────┘ │
│ └───────────────────────────────────┘ │ │ ┌───────────────────────────┐ │
│ ┌───────────────────────────────────┐ │ │ │ Wandering Merchant Modal  │ │
│ │ Combat VFX Pass                   │ │ │ │ (Buy Stock / Sell Loot)   │ │
│ │ (Slash Arcs & Spell Projectiles)  │ │ │ └───────────────────────────┘ │
│ └───────────────────────────────────┘ │ └───────────────────────────────┘
└───────────────────────────────────────┘
```

- **Data Model & State**:
  - **Floor Events (`FloorEvent`)**: Attached to `DungeonFloor`, defining `type` (`'blood_moon' | 'gilded_vault' | 'arcane_surge' | 'cursed_mist'`), name, description, and active multipliers.
  - **Merchant (`MerchantData`)**: Tile entity (`type: 'merchant'`) storing an array of 5 generated `Item` wares and a boolean `visited`.
  - **Tile Decals & Torches**: Extend `Tile` with optional `decal?: 'blood' | 'scorch' | 'moss' | 'bones'` and `hasTorch?: boolean` for dynamic wall light emitters.
  - **Visual Effects (`SlashEffect`, `ProjectileEffect`)**: Short-lived animation records rendered on the canvas with start/end coordinates, angle, color, and progress timer.
  - **Boss Phase State**: Extend `Enemy` with `phase?: 1 | 2` and `aoeTargetTiles?: { x: number; y: number }[]` for multi-tile boss slam telegraphs.

- **Interactive Component & State Mapping**:
  - **8-Way D-Pad**: `onPointerDown` triggers an immediate step in `(dx, dy)` (including diagonals `(-1, -1)`, `(1, -1)`, `(-1, 1)`, `(1, 1)`) and starts a `160ms` interval timer; `onPointerUp` / `onPointerLeave` / `onPointerCancel` clears the interval immediately.
  - **Pinch-to-Zoom Viewport**: Tracks two-touch distance (`Math.hypot(t1.x - t2.x, t1.y - t2.y)`) on the canvas to adjust tile scale clamped between `28` and `68`, paired with `+` / `-` zoom buttons on the mini-map widget.
  - **Wandering Merchant Modal**: Displays the Merchant's 5 wares with Buy buttons (validating `player.stats.gold >= item.goldValue` and inventory capacity) alongside a Sell tab listing player backpack items with 1-tap sell for `+50%` gold.
