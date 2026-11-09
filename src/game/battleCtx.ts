/**
 * BattleCtx bundles the immutable per-battle rules environment: content,
 * scenario, terrain grid and adapter views used by movement/combat/AI.
 * It is derived once when a battle starts and is never serialized.
 */
import { loadContent, type GameContent } from "./content";
import { buildTerrainGrid, type MoveRules } from "./movement";
import type { CombatContext } from "./combat";
import type { ScenarioDef, TerrainDef } from "./types";

export interface BattleCtx {
  content: GameContent;
  scenario: ScenarioDef;
  grid: TerrainDef[][];
  width: number;
  height: number;
  move: MoveRules;
  combat: CombatContext;
}

export function terrainAt(grid: TerrainDef[][], width: number, height: number) {
  return (x: number, y: number): TerrainDef => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      // Treat out-of-bounds as void: impassable, zero defense.
      return VOID_TERRAIN;
    }
    return grid[y][x];
  };
}

const VOID_TERRAIN: TerrainDef = {
  id: "void",
  mapChar: "?",
  nameKey: "terrain.void.name",
  descKey: "terrain.void.desc",
  defense: 0,
  costs: {},
  capturable: false,
  themeRole: "terrain.void",
};

export function makeBattleCtx(scenario: ScenarioDef, content: GameContent = loadContent()): BattleCtx {
  const grid = buildTerrainGrid(
    scenario.map.width,
    scenario.map.height,
    scenario.map.rows,
    content.terrainByChar,
  );
  const move: MoveRules = {
    grid,
    width: scenario.map.width,
    height: scenario.map.height,
    classDef: (classId) => content.unitClassById[classId],
  };
  const combat: CombatContext = {
    classById: content.unitClassById,
    classModifiers: content.classModifiers,
    balance: content.balance,
    terrainAt: terrainAt(grid, scenario.map.width, scenario.map.height),
  };
  return {
    content,
    scenario,
    grid,
    width: scenario.map.width,
    height: scenario.map.height,
    move,
    combat,
  };
}
