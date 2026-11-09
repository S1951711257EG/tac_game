/**
 * AI opponent: heuristic turn planner.
 *
 * For each unit (strongest first, infantry captures last) it enumerates legal
 * stop tiles, scores attack opportunities (damage vs expected counter, kills,
 * terrain safety, artillery stand-off) and movement options (objective grabs,
 * advancing along a BFS distance field). All weights come from the AI profile
 * content file. The plan is simulated step-by-step with the real rules
 * functions, so later units see earlier moves; the UI re-validates each
 * action at execution time and skips any that became illegal.
 */
import { forecastAttack, inRange } from "./combat";
import { key, keyOf, manhattan } from "./grid";
import { pathTo, reachableStops, type TerrainGrid } from "./movement";
import { applyAttack, applyMove } from "./battleActions";
import type { BattleCtx } from "./battleCtx";
import type { AiAction, AiProfileDef, BattleState, Coord, Unit } from "./types";

const CLASS_ORDER: Record<string, number> = {
  artillery: 0,
  armor: 1,
  infantry: 2,
  recon: 3,
};
const classRank = (cls: string): number => CLASS_ORDER[cls] ?? 1;

/** BFS distance field over passable terrain for a class, from goal tiles. */
export function distanceField(
  grid: TerrainGrid,
  width: number,
  height: number,
  unitClass: string,
  costs: (cls: string, x: number, y: number) => number | null,
  goals: Coord[],
): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: Coord[] = [];
  for (const g of goals) {
    dist.set(key(g.x, g.y), 0);
    queue.push(g);
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const d = dist.get(key(cur.x, cur.y))!;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const k = key(nx, ny);
      if (dist.has(k)) continue;
      if (costs(unitClass, nx, ny) === null) continue;
      dist.set(k, d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return dist;
}

interface ScoredPlan {
  score: number;
  path: Coord[] | null;
  attackTargetId?: string;
}

function enemyGoals(state: BattleState, unit: Unit): Coord[] {
  return state.units.filter((u) => u.team !== unit.team).map((u) => ({ x: u.x, y: u.y }));
}

function captureGoals(state: BattleState, unit: Unit): Coord[] {
  return state.objectives
    .filter((o) => o.owner !== unit.team)
    .map((o) => ({ x: o.x, y: o.y }));
}

function planUnit(state: BattleState, ctx: BattleCtx, profile: AiProfileDef, unit: Unit, working: BattleState): { actions: AiAction[]; state: BattleState } {
  const cls = ctx.content.unitClassById[unit.class];
  const reach = reachableStops(ctx.move, unit, working.units, cls.move);
  const enemies = working.units.filter((u) => u.team !== unit.team);
  const goals =
    ctx.content.unitClassById[unit.class].canCapture && captureGoals(working, unit).length
      ? captureGoals(working, unit)
      : enemyGoals(working, unit);
  const field = distanceField(ctx.grid, ctx.width, ctx.height, unit.class, (c, x, y) => {
    const t = ctx.grid[y]?.[x];
    return t ? (t.costs[c] ?? null) : null;
  }, goals);

  let best: ScoredPlan = { score: -Infinity, path: null };
  for (const [k, tile] of reach.tiles) {
    const dest = tile.coord;
    const terrain = ctx.grid[dest.y][dest.x];
    const onObjective = working.objectives.some(
      (o) => o.x === dest.x && o.y === dest.y && o.owner !== unit.team,
    );
    // --- attack options from this tile ----------------------------------
    for (const enemy of enemies) {
      const from: Unit = { ...unit, x: dest.x, y: dest.y };
      if (!inRange(ctx.combat, from, enemy)) continue;
      const fc = forecastAttack(ctx.combat, from, enemy);
      const avgDmg = (fc.minDamage + fc.maxDamage) / 2;
      const avgCounter = fc.canCounter ? (fc.counterMin + fc.counterMax) / 2 : 0;
      let score =
        avgDmg -
        profile.counterWeight * avgCounter +
        profile.terrainSafety * terrain.defense +
        (fc.likelyLethal ? profile.killBonus : 0);
      if (onObjective) score += profile.objectiveScore * 0.5;
      const distToEnemy = manhattan(dest, enemy);
      if (cls.minRange > 1) {
        if (distToEnemy >= profile.standoff.min && distToEnemy <= profile.standoff.max) {
          score += profile.standoffBonus;
        }
      }
      if (score > best.score) best = { score, path: pathTo(reach, dest), attackTargetId: enemy.id };
    }
    // --- pure movement option -------------------------------------------
    if (ctx.content.unitClassById[unit.class].canCapture && onObjective) {
      const score = profile.objectiveScore + profile.terrainSafety * terrain.defense;
      if (score > best.score) best = { score, path: pathTo(reach, dest) };
    } else {
      const d = field.get(keyOf(dest));
      if (d !== undefined) {
        const nearestEnemy = enemies.reduce(
          (min, e) => Math.min(min, manhattan(dest, e)),
          Infinity,
        );
        let score =
          -d * (0.5 + profile.aggression) +
          profile.terrainSafety * terrain.defense;
        if (cls.minRange > 1) {
          if (nearestEnemy >= profile.standoff.min && nearestEnemy <= profile.standoff.max) {
            score += profile.standoffBonus * 0.5;
          } else if (nearestEnemy < profile.standoff.min) {
            score -= profile.standoffBonus;
          }
        }
        if (score > best.score) best = { score, path: pathTo(reach, dest) };
      }
    }
  }

  if (best.score === -Infinity) return { actions: [{ kind: "wait", unitId: unit.id }], state: working };

  const actions: AiAction[] = [];
  let next = working;
  if (best.path && best.path.length > 1) {
    actions.push({ kind: "move", unitId: unit.id, path: best.path });
    const moved = applyMove(next, ctx, unit.id, best.path);
    if (moved.ok) next = moved.state;
  }
  if (best.attackTargetId) {
    actions.push({ kind: "attack", unitId: unit.id, targetId: best.attackTargetId });
    const attacked = applyAttack(next, ctx, unit.id, best.attackTargetId);
    if (attacked.ok) next = attacked.state;
  }
  return { actions, state: next };
}

/** Plan the full enemy turn. Returns ordered actions for the UI to execute. */
export function planAiTurn(state: BattleState, ctx: BattleCtx): AiAction[] {
  const profile = ctx.content.aiProfileById[ctx.scenario.aiProfile];
  const working = state;
  const units = working.units
    .filter((u) => u.team === "enemy" && u.hp > 0)
    .sort((a, b) => classRank(a.class) - classRank(b.class) || b.hp - a.hp);
  const out: AiAction[] = [];
  let sim = working;
  for (const unit of units) {
    const res = planUnit(sim, ctx, profile, unit, sim);
    out.push(...res.actions);
    sim = res.state;
    if (sim.status !== "active") break;
  }
  return out;
}
