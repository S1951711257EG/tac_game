/**
 * Battle actions: legal-move validation and state transitions for moving,
 * attacking, capturing and ending turns, plus victory/defeat evaluation.
 * All functions are pure: they return a new BattleState + emitted events.
 *
 * Rules boundary: this module never reads scenario content for balance math;
 * terrain/class/balance values arrive via BattleCtx (content registry).
 */
import { resolveAttack, inRange } from "./combat";
import { manhattan, sameCoord } from "./grid";
import { moveCost } from "./movement";
import { restoreRng } from "./rng";
import type { BattleCtx } from "./battleCtx";
import type { BattleState, Coord, ForceUnit, Team, Unit } from "./types";

export type BattleEvent =
  | { type: "unitMoved"; unitId: string; path: Coord[] }
  | {
      type: "unitAttacked";
      attackerId: string;
      defenderId: string;
      damage: number;
      counter: number;
      destroyed: boolean;
    }
  | { type: "objectiveCaptured"; unitId: string; x: number; y: number; team: Team }
  | { type: "turnStarted"; team: Team; turn: number }
  | { type: "battleEnded"; status: "victory" | "defeat" }
  | { type: "invalid"; reasonKey: string };

export interface ActionResult {
  state: BattleState;
  events: BattleEvent[];
  ok: boolean;
  /** Localization key explaining an illegal action (for toasts). */
  reasonKey?: string;
}

const ok = (state: BattleState, events: BattleEvent[]): ActionResult => ({ state, events, ok: true });
const bad = (state: BattleState, reasonKey: string): ActionResult => ({
  state,
  events: [],
  ok: false,
  reasonKey,
});

function pushLog(state: BattleState, key: string, params?: Record<string, string | number>, team?: Team): BattleState {
  const lastId = state.log.length ? state.log[state.log.length - 1].id : 0;
  return { ...state, log: [...state.log, { id: lastId + 1, key, params, team }] };
}

export const unitById = (state: BattleState, id: string): Unit | undefined =>
  state.units.find((u) => u.id === id);

export const objectiveAt = (state: BattleState, x: number, y: number) =>
  state.objectives.find((o) => o.x === x && o.y === y);

/** A unit still has something to do unless it has attacked this turn. */
export const isReady = (u: Unit): boolean => !u.attacked && u.hp > 0;

export const readyUnits = (state: BattleState, team: Team): Unit[] =>
  state.units.filter((u) => u.team === team && isReady(u));

/** Validate and apply a move along `path` (path[0] is the unit's tile). */
export function applyMove(state: BattleState, ctx: BattleCtx, unitId: string, path: Coord[]): ActionResult {
  if (state.status !== "active") return bad(state, "action.battleOver");
  const unit = unitById(state, unitId);
  if (!unit) return bad(state, "action.noUnit");
  if (unit.team !== state.activeTeam) return bad(state, "action.notYours");
  if (unit.attacked) return bad(state, "action.alreadyActed");
  if (unit.moved) return bad(state, "action.alreadyMoved");
  if (path.length < 2) return bad(state, "action.stayPut");
  if (!sameCoord(path[0], { x: unit.x, y: unit.y })) return bad(state, "action.badPath");

  const cls = ctx.content.unitClassById[unit.class];
  let budget = cls.move;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    if (manhattan(from, to) !== 1) return bad(state, "action.badPath");
    const cost = moveCost(ctx.move, unit.class, to.x, to.y);
    if (cost === null) return bad(state, "action.impassable");
    budget -= cost;
    if (budget < 0) return bad(state, "action.outOfRange");
    const blocker = state.units.find((u) => u.x === to.x && u.y === to.y);
    if (blocker) return bad(state, "action.occupied");
  }
  const dest = path[path.length - 1];

  let next: BattleState = {
    ...state,
    units: state.units.map((u) =>
      u.id === unitId ? { ...u, x: dest.x, y: dest.y, moved: true } : u,
    ),
    eventSeq: state.eventSeq + 1,
  };
  const events: BattleEvent[] = [{ type: "unitMoved", unitId, path }];

  // Capture: a capturing unit ending its move on an enemy/neutral objective.
  const terrain = ctx.combat.terrainAt(dest.x, dest.y);
  const obj = objectiveAt(next, dest.x, dest.y);
  if (obj && terrain.capturable && cls.canCapture && obj.owner !== unit.team) {
    next = {
      ...next,
      objectives: next.objectives.map((o) =>
        o.x === dest.x && o.y === dest.y ? { ...o, owner: unit.team } : o,
      ),
      eventSeq: next.eventSeq + 1,
    };
    events.push({ type: "objectiveCaptured", unitId, x: dest.x, y: dest.y, team: unit.team });
    next = pushLog(next, "log.capture", { unit: unitName(next, unit), x: dest.x, y: dest.y }, unit.team);
    next = checkEndWithEvent(next, ctx, events);
  }
  return ok(next, events);
}

/** Validate and apply an attack, including counterattack and removals. */
export function applyAttack(state: BattleState, ctx: BattleCtx, attackerId: string, defenderId: string): ActionResult {
  if (state.status !== "active") return bad(state, "action.battleOver");
  const attacker = unitById(state, attackerId);
  const defender = unitById(state, defenderId);
  if (!attacker || !defender) return bad(state, "action.noUnit");
  if (attacker.team !== state.activeTeam) return bad(state, "action.notYours");
  if (attacker.attacked) return bad(state, "action.alreadyActed");
  if (attacker.id === defender.id) return bad(state, "action.selfTarget");
  if (defender.team === attacker.team) return bad(state, "action.friendlyTarget");
  if (!inRange(ctx.combat, attacker, defender)) return bad(state, "action.outOfRange");

  const rng = restoreRng(state.rngState);
  const result = resolveAttack(ctx.combat, attacker, defender, rng);

  let units = state.units
    .map((u) => {
      if (u.id === attacker.id) return { ...u, hp: result.attackerHpAfter, attacked: true, moved: true };
      if (u.id === defender.id) return { ...u, hp: result.defenderHpAfter };
      return u;
    })
    .filter((u) => u.hp > 0);

  let next: BattleState = {
    ...state,
    units,
    rngState: rng.state(),
    eventSeq: state.eventSeq + 1,
  };
  const events: BattleEvent[] = [
    {
      type: "unitAttacked",
      attackerId,
      defenderId,
      damage: result.damage,
      counter: result.counterDamage,
      destroyed: result.destroyedDefender,
    },
  ];
  next = pushLog(
    next,
    "log.attack",
    { actor: unitName(next, attacker), target: defenderName(defenderId, state), dmg: result.damage },
    attacker.team,
  );
  if (result.counterDamage > 0) {
    next = pushLog(next, "log.counter", { target: unitName(next, attacker), dmg: result.counterDamage }, defender.team);
  }
  if (result.destroyedDefender) {
    next = pushLog(next, "log.destroyed", { unit: defenderName(defenderId, state) }, attacker.team);
  }
  if (result.destroyedAttacker) {
    next = pushLog(next, "log.destroyed", { unit: unitName(next, attacker) }, defender.team);
  }
  next = checkEndWithEvent(next, ctx, events);
  return ok(next, events);
}

/** End the active side's turn; increments turn when play returns to player. */
export function endTurn(state: BattleState, ctx: BattleCtx): ActionResult {
  if (state.status !== "active") return bad(state, "action.battleOver");
  const nextTeam: Team = state.activeTeam === "player" ? "enemy" : "player";
  const turn = nextTeam === "player" ? state.turn + 1 : state.turn;
  let next: BattleState = {
    ...state,
    activeTeam: nextTeam,
    turn,
    units: state.units.map((u) =>
      u.team === nextTeam ? { ...u, moved: false, attacked: false } : u,
    ),
    eventSeq: state.eventSeq + 1,
  };
  next = pushLog(next, "log.turnStart", { side: nextTeam, turn });
  const events: BattleEvent[] = [{ type: "turnStarted", team: nextTeam, turn }];

  // Turn-limit defeat is judged when a new player turn would begin.
  if (nextTeam === "player" && turn > ctx.scenario.turnLimit) {
    next = { ...next, status: "defeat", eventSeq: next.eventSeq + 1 };
    events.push({ type: "battleEnded", status: "defeat" });
    next = pushLog(next, "log.timeout");
  }
  return ok(next, events);
}

/**
 * Victory/defeat evaluation that also emits the battleEnded event so the UI
 * (result dialog, tutorial, sounds) reacts to capture/annihilate endings.
 */
function checkEndWithEvent(state: BattleState, ctx: BattleCtx, events: BattleEvent[]): BattleState {
  const before = state.status;
  const after = checkBattleEnd(state, ctx);
  if (after.status !== before && after.status !== "active") {
    events.push({ type: "battleEnded", status: after.status });
  }
  return after;
}

export function checkBattleEnd(state: BattleState, ctx: BattleCtx): BattleState {
  if (state.status !== "active") return state;
  const v = ctx.scenario.victory;
  const playerUnits = state.units.filter((u) => u.team === "player");
  const enemyUnits = state.units.filter((u) => u.team === "enemy");
  const allOwned = state.objectives.every((o) => o.owner === "player");
  let status: BattleState["status"] | null = null;
  if (v.captureAll && allOwned) status = "victory";
  else if (v.annihilate && enemyUnits.length === 0) status = "victory";
  else if (playerUnits.length === 0) status = "defeat";
  if (!status) return state;
  return {
    ...state,
    status,
    eventSeq: state.eventSeq + 1,
    log: [
      ...state.log,
      {
        id: (state.log.length ? state.log[state.log.length - 1].id : 0) + 1,
        key: status === "victory" ? "log.victory" : "log.defeat",
      },
    ],
  };
}

/** Surviving player units, for persisting back into the campaign force. */
export function extractForce(state: BattleState): ForceUnit[] {
  return state.units
    .filter((u) => u.team === "player" && u.hp > 0)
    .map((u) => ({
      id: u.forceId ?? u.id,
      class: u.class,
      hp: u.hp,
      vet: u.vet,
      ordinal: u.nameOrdinal ?? 1,
    }));
}

function unitName(state: BattleState, u: Unit): string {
  // Names are localized at render time; the log stores a composite token
  // "classId#ordinal" that the UI resolves. Kept simple and stable.
  return `${u.class}#${u.nameOrdinal ?? 1}`;
}
function defenderName(id: string, state: BattleState): string {
  const u = unitById(state, id);
  return u ? `${u.class}#${u.nameOrdinal ?? 1}` : "?";
}
