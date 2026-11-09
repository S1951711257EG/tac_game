/** Shared fixtures for engine tests: a deterministic 6x6 test scenario. */
import { createBattleState } from "@/game/battleSetup";
import { makeBattleCtx } from "@/game/battleCtx";
import { loadContent } from "@/game/content";
import type { ScenarioDef, Unit } from "@/game/types";

export function tinyScenario(): ScenarioDef {
  return {
    id: "sc_test",
    nameKey: "scenarios.bootcamp.name",
    briefKey: "scenarios.bootcamp.brief",
    introKey: "scenarios.bootcamp.intro",
    outroKey: "scenarios.bootcamp.outro",
    aiProfile: "standard",
    map: {
      width: 6,
      height: 6,
      rows: [
        "pppppp",
        "ppphhp",
        "ppphhp",
        "pppppp",
        "pcwwbp",
        "pppppp",
      ],
    },
    units: [
      { class: "infantry", team: "player", x: 1, y: 1 },
      { class: "infantry", team: "enemy", x: 4, y: 1 },
    ],
    objectives: [{ x: 1, y: 4, owner: "neutral" }],
    victory: { captureAll: true, annihilate: false },
    turnLimit: 6,
    deployment: [{ x: 1, y: 1 }],
    spawnPlayerFromCampaign: false,
    bonusUnits: [],
    rewards: { prestige: 5, perObjective: 1, perRemainingTurn: 0 },
  };
}

export interface Fixture {
  ctx: ReturnType<typeof makeBattleCtx>;
  state: ReturnType<typeof createBattleState>;
}

export function setup(opts?: {
  scenario?: ScenarioDef;
  units?: Array<{ class: string; team: "player" | "enemy"; x: number; y: number; hp?: number }>;
  objectives?: Array<{ x: number; y: number; owner?: "player" | "enemy" | "neutral" }>;
  turnLimit?: number;
  victory?: { captureAll: boolean; annihilate: boolean };
  enemyTurn?: boolean;
  seed?: number;
}): Fixture {
  const scenario = opts?.scenario ?? tinyScenario();
  if (opts?.units) scenario.units = opts.units;
  if (opts?.objectives) scenario.objectives = opts.objectives;
  if (opts?.turnLimit) scenario.turnLimit = opts.turnLimit;
  if (opts?.victory) scenario.victory = opts.victory;
  const content = loadContent();
  const state = createBattleState({ scenario, seed: opts?.seed ?? 42, content });
  if (opts?.enemyTurn) {
    // Hand the turn to the AI side for planning tests.
    Object.assign(state, { activeTeam: "enemy" as const });
  }
  return { ctx: makeBattleCtx(scenario, content), state };
}

/** Rebuild the scenario from a fixture's live state (for victory checks). */
export const scenarioOf = (fx: Fixture): ScenarioDef => {
  void fx;
  return tinyScenario();
};

export const unitAtPos = (state: { units: Unit[] }, x: number, y: number): Unit | undefined =>
  state.units.find((u) => u.x === x && u.y === y);

export const FORCE_5 = () => [
  { id: "f1", class: "infantry", hp: 10, vet: 0, ordinal: 1 },
  { id: "f2", class: "infantry", hp: 7, vet: 1, ordinal: 2 },
  { id: "f3", class: "recon", hp: 8, vet: 0, ordinal: 1 },
  { id: "f4", class: "armor", hp: 10, vet: 0, ordinal: 1 },
  { id: "f5", class: "artillery", hp: 8, vet: 0, ordinal: 1 },
];
