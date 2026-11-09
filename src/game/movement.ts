/**
 * Movement rules: terrain move costs, reachable-tile search (Dijkstra) and
 * path reconstruction. Pure functions over BattleState + content defs.
 */
import { inBounds, key, keyOf, neighborsInBounds } from "./grid";
import type { Coord, TerrainDef, Unit, UnitClassDef } from "./types";

export interface TerrainLookup {
  terrainAt(x: number, y: number): TerrainDef;
}

export type TerrainGrid = TerrainDef[][]; // [y][x]

export function buildTerrainGrid(
  width: number,
  height: number,
  rows: string[],
  terrainByChar: Record<string, TerrainDef>,
): TerrainGrid {
  const grid: TerrainGrid = [];
  for (let y = 0; y < height; y++) {
    const row: TerrainDef[] = [];
    for (let x = 0; x < width; x++) {
      const def = terrainByChar[rows[y][x]];
      row.push(def);
    }
    grid.push(row);
  }
  return grid;
}

export interface MoveRules {
  grid: TerrainGrid;
  width: number;
  height: number;
  classDef: (classId: string) => UnitClassDef;
}

export function moveCost(rules: MoveRules, unitClass: string, x: number, y: number): number | null {
  if (!inBounds(x, y, rules.width, rules.height)) return null;
  const terrain = rules.grid[y][x];
  const cost = terrain.costs[unitClass];
  return cost === null || cost === undefined ? null : cost;
}

export function isPassable(rules: MoveRules, unitClass: string, x: number, y: number): boolean {
  return moveCost(rules, unitClass, x, y) !== null;
}

export interface ReachableTile {
  coord: Coord;
  cost: number;
  /** Predecessor tile key for path reconstruction. */
  prev: string | null;
}

export interface ReachResult {
  tiles: Map<string, ReachableTile>;
}

/**
 * All tiles the unit could reach with its remaining move points, ignoring
 * other units (blocking is checked by the caller). Destination tile itself
 * must be passable; the starting tile is always included at cost 0.
 */
export function reachableTiles(rules: MoveRules, unit: Unit, movePoints: number): ReachResult {
  const start = { x: unit.x, y: unit.y };
  const tiles = new Map<string, ReachableTile>();
  tiles.set(keyOf(start), { coord: start, cost: 0, prev: null });
  // Simple Dijkstra with a priority queue implemented via array (small maps).
  const frontier: Array<{ k: string; cost: number }> = [{ k: keyOf(start), cost: 0 }];
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    const curTile = tiles.get(cur.k)!;
    if (cur.cost > curTile.cost) continue; // stale entry
    for (const n of neighborsInBounds(curTile.coord, rules.width, rules.height)) {
      const step = moveCost(rules, unit.class, n.x, n.y);
      if (step === null) continue;
      const nextCost = curTile.cost + step;
      if (nextCost > movePoints) continue;
      const k = keyOf(n);
      const existing = tiles.get(k);
      if (!existing || nextCost < existing.cost) {
        tiles.set(k, { coord: n, cost: nextCost, prev: cur.k });
        frontier.push({ k, cost: nextCost });
      }
    }
  }
  return { tiles };
}

/** Reconstruct the path (inclusive of start and destination) for a tile. */
export function pathTo(reach: ReachResult, dest: Coord): Coord[] {
  const path: Coord[] = [];
  let k: string | null = keyOf(dest);
  while (k) {
    const tile = reach.tiles.get(k);
    if (!tile) return [];
    path.unshift(tile.coord);
    k = tile.prev;
  }
  return path;
}

/** Is `coord` occupied by any unit in `units` (excluding `exceptId`)? */
export function isOccupied(
  units: Unit[],
  coord: Coord,
  exceptId?: string,
): Unit | undefined {
  return units.find((u) => u.id !== exceptId && u.x === coord.x && u.y === coord.y);
}

/**
 * Reachable tiles filtered by unit blocking: no unit may be passed through
 * or stopped on (classic wargame convention). Occupancy is excluded during
 * the search itself so predecessor chains (used for path reconstruction)
 * never reference blocked tiles.
 */
export function reachableStops(
  rules: MoveRules,
  unit: Unit,
  units: Unit[],
  movePoints: number,
): ReachResult {
  const start = { x: unit.x, y: unit.y };
  const tiles = new Map<string, ReachableTile>();
  tiles.set(keyOf(start), { coord: start, cost: 0, prev: null });
  const frontier: Array<{ k: string; cost: number }> = [{ k: keyOf(start), cost: 0 }];
  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    const curTile = tiles.get(cur.k)!;
    if (cur.cost > curTile.cost) continue; // stale entry
    for (const n of neighborsInBounds(curTile.coord, rules.width, rules.height)) {
      const blocker = units.find((u) => u.id !== unit.id && u.x === n.x && u.y === n.y);
      if (blocker) continue;
      const step = moveCost(rules, unit.class, n.x, n.y);
      if (step === null) continue;
      const nextCost = curTile.cost + step;
      if (nextCost > movePoints) continue;
      const k = keyOf(n);
      const existing = tiles.get(k);
      if (!existing || nextCost < existing.cost) {
        tiles.set(k, { coord: n, cost: nextCost, prev: cur.k });
        frontier.push({ k, cost: nextCost });
      }
    }
  }
  return { tiles };
}
