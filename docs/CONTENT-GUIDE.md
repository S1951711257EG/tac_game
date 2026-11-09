# Content guide

All gameplay content lives in `src/content/` as JSON and is validated at
startup (and by `bun run check:content`). You never need to touch engine code
to add scenarios, units, terrain, campaign nodes, text or themes.

## Add a scenario

1. Create `src/content/scenarios/my-battle.json`:

```json
{
  "id": "sc_my_battle",
  "nameKey": "scenarios.my_battle.name",
  "briefKey": "scenarios.my_battle.brief",
  "introKey": "scenarios.my_battle.intro",
  "outroKey": "scenarios.my_battle.outro",
  "aiProfile": "standard",
  "map": {
    "width": 12, "height": 9,
    "rows": [
      "mmppppppppmm",
      "mppphhpppppm",
      "ppppcppppppp",
      "pwwwwwwwwppp",
      "pwwbwwwwpppp",
      "pppppppppppp",
      "ppphhppppppp",
      "ppcppppppppp",
      "pppppppppppp"
    ]
  },
  "units": [
    { "class": "infantry", "team": "player", "x": 2, "y": 7 },
    { "class": "infantry", "team": "enemy",  "x": 7, "y": 2 }
  ],
  "objectives": [ { "x": 4, "y": 2, "owner": "enemy" } ],
  "victory": { "captureAll": true, "annihilate": false },
  "turnLimit": 14,
  "deployment": [ { "x": 2, "y": 7 } ],
  "spawnPlayerFromCampaign": false,
  "bonusUnits": [],
  "rewards": { "prestige": 12, "perObjective": 4, "perRemainingTurn": 1 }
}
```

Map characters come from `terrain.json` (`mapChar`): `p` plains, `f` forest,
`h` hills, `m` mountains, `c` city, `b` bridge, `w` water. Every row must be
exactly `width` characters; objectives must sit on capturable terrain (`c`).

2. Register it in `src/game/content.ts`:
   `import scenarioMyBattle from "@/content/scenarios/my-battle.json";` and
   add it to `SCENARIO_FILES`.

3. Add the four text keys to `src/i18n/locales/en.json`.

4. Add a campaign node (see below) or reference it directly.

Validation will name the exact file and field if anything is wrong — e.g.
`scenarios[5] (sc_my_battle): map row 3 is 11 characters, expected 12`.

**Force battles:** set `"spawnPlayerFromCampaign": true` and list at least as
many `deployment` tiles as the campaign force can hold; survivors of the
previous battle deploy there in order. Non-tutorial victories replace the
persistent force with the survivors (`tutorial: true` on the campaign node
keeps the force untouched).

## Add a unit class

Append to `src/content/unit-classes.json`:

```json
{
  "id": "engineer",
  "nameKey": "units.engineer.name",
  "roleKey": "units.engineer.role",
  "descKey": "units.engineer.desc",
  "icon": "unit-engineer",
  "move": 3, "minRange": 1, "maxRange": 1,
  "attack": 3, "defense": 4, "hp": 9,
  "canCapture": true,
  "recruitCost": 9,
  "themeRole": "unit.engineer"
}
```

Then: add the three locale keys; add a column/row for the new class to **every**
attacker/defender pair in `balance.json` → `classModifiers` (validation
requires a full matrix); add move costs for it to **every** terrain in
`terrain.json` (`null` = impassable); add a recruit price to `campaign.json`
→ `economy.recruit`; optionally generate `public/assets/img/unit-engineer.jpg`
(see `scripts/gen-assets.mjs`). If `minRange > 1` the unit fires indirectly
and never receives adjacent counterattacks.

## Add a terrain type

Append to `src/content/terrain.json` with a unique single-character
`mapChar`, per-class `costs`, `defense` (0–6), `capturable`, and a
`themeRole`. Then: add the locale keys; add a color token under
`color` in `src/theme/tokens.json` using the theme role's dotted path
(e.g. `"terrain.swamp": "#5a6b4a"`); optionally drop a matching tile texture
at `public/assets/img/terrain-swamp.jpg` (the token color is the automatic
fallback). Use the new char in scenario maps.

## Add a campaign node / branch

Edit `src/content/campaign.json` → `nodes`. Each node has `id`,
`scenarioId`, `next` (node ids unlocked on victory) and optional
`entry` / `tutorial` flags. The graph may branch: list two ids in `next` and
the between-battle screen offers both objectives. Validation checks that all
referenced scenarios/nodes exist and at least one entry node exists.

## Add a locale

1. Copy `src/i18n/locales/en.json` to `de.json` and translate the values
   (keys stay identical; the flat `{name}` placeholders are interpolated).
2. Register it in `src/i18n/locales/index.ts`:
   `{ code: "de", label: "Deutsch", messages: de }`.
Missing keys fall back to English automatically. It then appears in Settings.

## Change look & feel

Everything visual is in `src/theme/tokens.json` (colors, tile size, radii,
spacing, font sizes, animation durations, AI pacing). Components reference
tokens as `var(--im-…)`; there are no raw colors in UI code. Motion-sensitive
players can disable animations in Settings (`data-motion="reduced"`).

## AI profiles

`src/content/ai-profiles.json` — per profile: `counterWeight` (fear of
counters), `killBonus`, `objectiveScore`, `terrainSafety`, `standoff`
(artillery distance band), `aggression`. Reference a profile by `id` from any
scenario (`aiProfile`). Two shipped profiles: `standard`, `aggressive`.

## Content tests

`bun run check:content` validates everything and prints actionable errors.
The Vitest suite also feeds deliberately broken content to the validators and
asserts the diagnostics name the file and field.
