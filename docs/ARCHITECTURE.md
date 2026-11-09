# Architecture

## Layering (strict, enforced by convention and tests)

```
┌────────────────────────────────────────────────────────────┐
│ UI (React components, src/components/game/**)              │  presentation only
├────────────────────────────────────────────────────────────┤
│ State orchestration (src/state/**, zustand stores)         │  sequencing, no rules
├────────────────────────────────────────────────────────────┤
│ Rules engine (src/game/**, pure TypeScript)                │  ALL game rules
├────────────────────────────────────────────────────────────┤
│ Content (src/content/**/*.json)  ·  i18n  ·  theme tokens  │  data only
└────────────────────────────────────────────────────────────┘
```

- **Rules engine** (`src/game/`): pure functions over plain data. No React,
  no DOM, no colors, no user-facing strings. Everything tunable (damage math,
  movement costs, AI weights, economy prices) comes from validated JSON.
  - `types.ts` — domain types shared everywhere.
  - `schemas.ts` — zod schemas for every content file type.
  - `content.ts` — loads/validates all JSON; `validateContentSet()` returns
    `file: field — message` diagnostics; `ContentError` powers the startup
    diagnostics screen. Cross-file references (map chars → terrain, unit
    classes, AI profiles, campaign nodes) are checked here.
  - `grid.ts`, `movement.ts` — coordinates, Dijkstra reachability with unit
    blocking, path reconstruction.
  - `combat.ts` — damage formula, terrain protection, class modifiers,
    counterattack rules, pre-attack forecasts (used by the UI preview).
  - `battleCtx.ts` — per-battle immutable context (content + terrain grid +
    rule adapters).
  - `battleSetup.ts` / `battleActions.ts` — battle creation and the action
    API (`applyMove`, `applyAttack`, `endTurn`) with legality checks,
    capture, victory/defeat evaluation and localized log keys.
  - `ai.ts` — heuristic AI planner (scores attacks vs counters, terrain
    safety, objective grabs, artillery stand-off; simulates its own plan
    through the real rules functions).
  - `campaignRules.ts` — prestige economy, repairs/training/recruitment,
    node graph progression.
  - `save.ts` — localStorage adapter with injectable storage (tests/SSR safe).
  - `rng.ts` — seeded mulberry32; the seed lives in the battle state so
    battles are reproducible.

- **State orchestration** (`src/state/`): zustand stores. `appStore` (view +
  settings), `campaignStore` (campaign session, between-battle choices),
  `battleStore` + `battleSession`/`battleRunner` (in-battle session, player
  action dispatch shared by mouse/keyboard, AI turn runner with timers and a
  synchronous "Skip" path, tutorial event progression, snapshot persistence).
  Stores sequence rules; they never compute game outcomes themselves.

- **UI** (`src/components/game/**`): reads stores, renders. The battlefield
  is a CSS grid of tiles + an absolutely positioned unit layer (transform
  transitions for movement, keyed overlays for attack flashes and objective
  pops). `Battlefield`/`Tile`/`UnitToken` own no rules — legality comes
  precomputed from the engine (reachable stops, attack ranges, forecasts).

- **i18n** (`src/i18n/`): flat dotted-key catalogs. `en.json` is the source
  of truth; missing keys in another locale fall back to English, then to the
  key itself. Log entries store stable tokens (`classId#ordinal`) resolved to
  localized formation names at render time.

- **Theme** (`src/theme/tokens.json`): the single source of truth for colors,
  spacing, radii, typography and motion. `applyTheme()` writes them as
  `--im-*` CSS custom properties; components only reference tokens. A test
  keeps the small pre-hydration fallback block in `globals.css` in sync.

## Data flow of one player action

```
click/keyboard → battleStore.clickTile() → engine legality (movement/combat)
  → new BattleState + BattleEvent[] → battleRunner.commit()
  → store update → UI re-render + animations + sfx
  → tutorial step advance? → snapshot persisted to localStorage
```

The AI turn follows the same path: `planAiTurn()` produces a list of
`AiAction`s once per turn; the runner executes them step-by-step (re-validating
each with the engine and skipping any that became illegal), then ends the
enemy turn.

## Content pipeline

`src/content/` holds all gameplay content:

| File | Shape |
| --- | --- |
| `terrain.json` | terrain types: map char, defense, per-class move costs, capturability, theme role |
| `unit-classes.json` | unit classes: stats, ranges, capture ability, recruit cost |
| `balance.json` | combat math (spread, counter factor, terrain reduction, veterancy) + class-modifier matrix |
| `ai-profiles.json` | AI weights (aggression, stand-off, objective/kill/terrain scores) |
| `scenarios/*.json` | maps (char grids), units, objectives, victory conditions, rewards, deployment, tutorial script |
| `campaign.json` | node graph, start prestige, force cap, economy prices |

All files are statically imported (a missing file is a build error) and
validated at startup (`loadContent()`); invalid content renders a diagnostics
screen instead of crashing. See `docs/CONTENT-GUIDE.md` to extend it.

## Deliberate boundaries

- The rules engine never reads scenario data for math — the scenario supplies
  structure (maps, units, objectives), the engine supplies meaning.
- UI components never compute legality; they render engine answers and route
  intents back through the store.
- Scenario JSON contains localization keys, never prose; locale files contain
  no balance values.
- `save.ts` is the only module touching storage; it is injectable for tests.
