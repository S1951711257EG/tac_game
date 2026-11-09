/**
 * Battle setup: turn scenario JSON (+ optional persistent campaign force)
 * into an initial BattleState. Pure and content-validated upstream.
 */
import { loadContent, type GameContent } from "./content";
import type { BattleState, ScenarioDef, Unit } from "./types";

export interface SetupOptions {
  scenario: ScenarioDef;
  /** Persistent force for scenarios with spawnPlayerFromCampaign. */
  campaignForce?: ForceUnit[] | null;
  seed: number;
  content?: GameContent;
}

type ForceUnit = { id: string; class: string; hp: number; vet: number; ordinal: number };

let idCounter = 0;
export const resetUnitIdCounter = (): void => {
  idCounter = 0;
};
const nextUnitId = (): string => `u${++idCounter}`;

/** Per-class formation counters for display names ("Rifles 2"). */
function ordinalCounters(): Record<string, number> {
  return {};
}
const bumpOrdinal = (counters: Record<string, number>, cls: string): number => {
  counters[cls] = (counters[cls] ?? 0) + 1;
  return counters[cls];
};

function makeUnit(params: {
  id?: string;
  class: string;
  team: "player" | "enemy";
  x: number;
  y: number;
  hp: number;
  vet: number;
  ordinal: number;
  forceId?: string;
}): Unit {
  return {
    id: params.id ?? nextUnitId(),
    class: params.class,
    team: params.team,
    x: params.x,
    y: params.y,
    hp: params.hp,
    vet: params.vet,
    moved: false,
    attacked: false,
    forceId: params.forceId,
    nameOrdinal: params.ordinal,
  };
}

export function createBattleState(opts: SetupOptions): BattleState {
  const content = opts.content ?? loadContent();
  const { scenario } = opts;
  const classes = content.unitClassById;
  const counters = ordinalCounters();
  const units: Unit[] = [];

  if (scenario.spawnPlayerFromCampaign) {
    // Persistent force deploys onto the scenario's deployment tiles in order.
    const force = opts.campaignForce ?? [];
    scenario.deployment.forEach((tile, i) => {
      const fu = force[i];
      if (!fu) return;
      units.push(
        makeUnit({
          id: fu.id,
          class: fu.class,
          team: "player",
          x: tile.x,
          y: tile.y,
          hp: fu.hp,
          vet: fu.vet,
          ordinal: fu.ordinal,
          forceId: fu.id,
        }),
      );
    });
  } else {
    for (const spec of scenario.units.filter((u) => u.team === "player")) {
      units.push(
        makeUnit({
          class: spec.class,
          team: "player",
          x: spec.x,
          y: spec.y,
          hp: spec.hp ?? classes[spec.class].hp,
          vet: spec.vet ?? 0,
          ordinal: bumpOrdinal(counters, spec.class),
        }),
      );
    }
  }

  for (const spec of scenario.units.filter((u) => u.team === "enemy")) {
    units.push(
      makeUnit({
        class: spec.class,
        team: "enemy",
        x: spec.x,
        y: spec.y,
        hp: spec.hp ?? classes[spec.class].hp,
        vet: spec.vet ?? 0,
        ordinal: bumpOrdinal(counters, spec.class),
      }),
    );
  }
  for (const bonus of scenario.bonusUnits) {
    units.push(
      makeUnit({
        class: bonus.class,
        team: "player",
        x: bonus.x,
        y: bonus.y,
        hp: classes[bonus.class].hp,
        vet: 0,
        ordinal: bumpOrdinal(counters, bonus.class),
      }),
    );
  }

  const objectives = scenario.objectives.map((o) => ({
    x: o.x,
    y: o.y,
    owner: o.owner ?? ("neutral" as const),
  }));

  return {
    scenarioId: scenario.id,
    turn: 1,
    activeTeam: "player",
    units,
    objectives,
    width: scenario.map.width,
    height: scenario.map.height,
    status: "active",
    log: [],
    rngState: opts.seed >>> 0,
    eventSeq: 0,
  };
}
