# Fix Right-Side Strike & Quick-Potion Buttons Shifting Left During Joystick Touch

When touching the left half of the screen, the floating joystick switches from standard layout flow to `position: fixed` at your left thumb's coordinates. Because the bottom HUD row used `flex justify-between`, removing the joystick from normal document flow caused the right-side **Strike (`⚔️`)**, **Quick-Potion (`🧪`)**, **Wait (`⏳`)**, and **Skill (`1–4`)** buttons to become the first flex item and snap over to the left edge of the screen.

> [!IMPORTANT]
> **Key Fix**: Both the resting left-thumb guide and the right-thumb combat cluster will now be independently anchored to their respective corners (`fixed bottom-8 left-6` and `fixed bottom-8 right-5`) so activating the floating joystick on the left never shifts or moves any right-side buttons.

---

## 1. Overview & Core Concept
- **What It Fixes**: Prevents the right-side combat buttons (**Strike**, **Quick-Potion**, **Wait**, and **Active Skills**) from jumping to the left side of the screen whenever the user touches the left half to move with the floating joystick.
- **Key Value**: Rock-solid, independent multi-touch ergonomics—your left thumb spawns and drags the floating joystick anywhere on the left half while the right-side combat arc stays completely stationary under your right thumb.

---

## 2. User Experience & Layout Stability
- **Left Half (Floating Joystick & Resting Guide)**:
  - The resting joystick indicator stays anchored at a comfortable raised left-thumb position (`fixed bottom-8 left-6`) and fades smoothly when your thumb touches down.
  - The active floating joystick spawns at your exact `(clientX, clientY)` touch point (`position: fixed`) without affecting any other element on screen.
- **Right Half (Locked Right-Thumb Combat Arc)**:
  - The right-side action cluster (**Active Skills `1–4`**, **Wait `⏳`**, **Quick-Potion `🧪`**, and **Strike `⚔️`**) is anchored directly to the bottom-right viewport (`fixed bottom-8 right-5 sm:bottom-10 sm:right-8`) with `ml-auto`, guaranteeing zero horizontal or vertical layout shift regardless of joystick state.

---

## 3. Technical Architecture & Layout Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│ Top-Left Minimal HUD + [☰]                 Top-Right Mini-Map   │
├─────────────────────────────────┬───────────────────────────────┤
│                                 │                               │
│   LEFT THUMB CAPTURE ZONE       │     RIGHT THUMB COMBAT ARC    │
│   (fixed left-0 bottom-0        │     (fixed right-5 bottom-8)  │
│    w-[48vw] h-[68dvh])          │                               │
│                                 │        [1] [2] [3] [4]        │
│      ( 🕹️ Floating Origin )     │      (⏳)   (🧪)   ( ⚔️ )     │
│                                 │     Wait  Potion  Strike      │
└─────────────────────────────────┴───────────────────────────────┘
```

- **Decoupled Positioning**: By changing the right-side combat container and the left-side resting guide from shared flexbox siblings to independent `fixed` containers pinned to `left` and `right`, DOM state changes on the left joystick have zero layout impact on the right combat cluster.
