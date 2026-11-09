/**
 * Zod schemas for every content file type.
 *
 * Content files are validated at startup and in tests. Errors must name the
 * file and the invalid field — see formatContentError() in content.ts.
 */
import { z } from "zod";

const locKey = z.string().min(1).regex(/^[a-z0-9]+(\.[a-zA-Z0-9_]+)+$/, {
  message: "must be a dot-separated localization key like 'units.infantry.name'",
});

const coord = z.object({ x: z.number().int().min(0), y: z.number().int().min(0) });

export const terrainDefSchema = z.object({
  id: z.string().min(1),
  mapChar: z.string().length(1),
  nameKey: locKey,
  descKey: locKey,
  defense: z.number().int().min(0).max(6),
  costs: z.record(z.string(), z.number().int().min(1).max(9).nullable()),
  capturable: z.boolean(),
  themeRole: z.string().min(1),
});

export const unitClassSchema = z.object({
  id: z.string().min(1),
  nameKey: locKey,
  roleKey: locKey,
  descKey: locKey,
  icon: z.string().min(1),
  move: z.number().int().min(1).max(12),
  minRange: z.number().int().min(1).max(5),
  maxRange: z.number().int().min(1).max(6),
  attack: z.number().int().min(1).max(20),
  defense: z.number().int().min(1).max(20),
  hp: z.number().int().min(1).max(20),
  canCapture: z.boolean(),
  recruitCost: z.number().int().min(0).max(99),
  themeRole: z.string().min(1),
});

export const balanceSchema = z.object({
  damageRngSpread: z.number().min(0).max(0.4),
  counterFactor: z.number().min(0).max(1.5),
  terrainDefenseReduction: z.number().min(0).max(0.25),
  veterancyAttackBonus: z.number().min(0).max(0.5),
  veterancyMax: z.number().int().min(0).max(5),
  counterBreakThreshold: z.number().int().min(0).max(10),
});

export const aiProfileSchema = z.object({
  id: z.string().min(1),
  nameKey: locKey,
  counterWeight: z.number().min(0).max(3),
  killBonus: z.number().min(0).max(50),
  objectiveScore: z.number().min(0).max(200),
  terrainSafety: z.number().min(0).max(10),
  standoff: z.object({ min: z.number().int().min(0), max: z.number().int().min(0) }),
  standoffBonus: z.number().min(0).max(20),
  aggression: z.number().min(0).max(1),
});

export const classModifierTableSchema = z.record(
  z.string(),
  z.record(z.string(), z.number().min(0.05).max(4)),
);

export const tutorialStepSchema = z.object({
  id: z.string().min(1),
  event: z.enum([
    "start",
    "unitSelected",
    "unitMoved",
    "unitAttacked",
    "objectiveCaptured",
    "turnEnded",
    "battleWon",
  ]),
  textKey: locKey,
  highlightUnitIndex: z.number().int().min(0).optional(),
});

export const scenarioSchema = z.object({
  id: z.string().min(1),
  nameKey: locKey,
  briefKey: locKey,
  introKey: locKey,
  outroKey: locKey,
  aiProfile: z.string().min(1),
  map: z
    .object({
      width: z.number().int().min(4).max(40),
      height: z.number().int().min(4).max(40),
      rows: z.array(z.string()).min(1),
    })
    .refine((m) => m.rows.length === m.height, {
      message: "map.rows must have exactly `height` rows",
    })
    .refine((m) => m.rows.every((r) => r.length === m.width), {
      message: "every map row must be exactly `width` characters long",
    }),
  units: z
    .array(
      z.object({
        class: z.string().min(1),
        team: z.enum(["player", "enemy"]),
        x: z.number().int().min(0),
        y: z.number().int().min(0),
        vet: z.number().int().min(0).optional(),
        hp: z.number().int().min(1).optional(),
      }),
    )
    .min(1),
  objectives: z
    .array(z.object({ x: z.number().int().min(0), y: z.number().int().min(0), owner: z.string().optional() }))
    .min(1),
  victory: z.object({ captureAll: z.boolean(), annihilate: z.boolean() }),
  turnLimit: z.number().int().min(2).max(99),
  deployment: z.array(coord).max(16),
  spawnPlayerFromCampaign: z.boolean(),
  bonusUnits: z.array(z.object({ class: z.string().min(1), x: z.number().int().min(0), y: z.number().int().min(0) })),
  rewards: z.object({
    prestige: z.number().int().min(0).max(200),
    perObjective: z.number().int().min(0).max(50),
    perRemainingTurn: z.number().int().min(0).max(10),
  }),
  tutorial: z.array(tutorialStepSchema).optional(),
});

export const campaignSchema = z.object({
  id: z.string().min(1),
  nameKey: locKey,
  startPrestige: z.number().int().min(0).max(500),
  maxForceSize: z.number().int().min(1).max(16),
  economy: z.object({
    repairCostPerHp: z.number().int().min(0).max(20),
    trainingCost: z.number().int().min(0).max(200),
    recruit: z.record(z.string(), z.number().int().min(0).max(99)),
  }),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        scenarioId: z.string().min(1),
        next: z.array(z.string().min(1)),
        entry: z.boolean().optional(),
        tutorial: z.boolean().optional(),
      }),
    )
    .min(1)
    .refine(
      (nodes) => nodes.some((n) => n.entry),
      { message: "campaign must define at least one entry node" },
    ),
});
