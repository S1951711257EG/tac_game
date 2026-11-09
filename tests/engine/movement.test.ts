/** Movement rules: terrain costs, reachability, blocking, paths. */
import { describe, it, expect } from "vitest";
import { buildTerrainGrid, moveCost, reachableTiles, reachableStops, pathTo } from "@/game/movement";
import { setup, tinyScenario } from "./helpers";
import { loadContent } from "@/game/content";
import { key } from "@/game/grid";

describe("terrain move costs", () => {
  const content = loadContent();

  it("plains cost 1 for every class", () => {
    for (const cls of content.unitClasses) {
      expect(moveCost({ grid: buildTerrainGrid(1, 1, ["p"], content.terrainByChar), width: 1, height: 1, classDef: () => cls }, cls.id, 0, 0)).toBe(1);
    }
  });

  it("mountains are impassable for vehicles, cost 4 for infantry", () => {
    const rules = { grid: buildTerrainGrid(1, 1, ["m"], content.terrainByChar), width: 1, height: 1, classDef: (id: string) => content.unitClassById[id] };
    expect(moveCost(rules, "infantry", 0, 0)).toBe(4);
    expect(moveCost(rules, "armor", 0, 0)).toBeNull();
    expect(moveCost(rules, "artillery", 0, 0)).toBeNull();
    expect(moveCost(rules, "recon", 0, 0)).toBeNull();
  });

  it("water is impassable for all classes", () => {
    const rules = { grid: buildTerrainGrid(1, 1, ["w"], content.terrainByChar), width: 1, height: 1, classDef: (id: string) => content.unitClassById[id] };
    for (const cls of content.unitClasses) expect(moveCost(rules, cls.id, 0, 0)).toBeNull();
  });

  it("forest slows vehicles more than infantry", () => {
    const rules = { grid: buildTerrainGrid(1, 1, ["f"], content.terrainByChar), width: 1, height: 1, classDef: (id: string) => content.unitClassById[id] };
    expect(moveCost(rules, "infantry", 0, 0)).toBe(2);
    expect(moveCost(rules, "armor", 0, 0)).toBe(3);
  });
});

describe("reachable tiles", () => {
  const openScenario = () => ({
    ...tinyScenario(),
    map: { width: 6, height: 6, rows: ["pppppp", "pppppp", "pppppp", "pppppp", "pppppp", "pppppp"] },
  });

  it("includes exactly the manhattan diamond on open plains (move 3)", () => {
    const { ctx, state } = setup({
      scenario: openScenario(),
      units: [{ class: "infantry", team: "player", x: 2, y: 1 }],
    });
    const unit = state.units[0];
    const reach = reachableTiles(ctx.move, unit, 3);
    // Open 6x6 board around (2,1): cells within manhattan distance 3.
    let expected = 0;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (Math.abs(x - 2) + Math.abs(y - 1) <= 3) expected++;
    expect(reach.tiles.size).toBe(expected);
  });

  it("respects terrain: infantry cannot cross water but may use the bridge", () => {
    const { ctx, state } = setup({
      units: [{ class: "recon", team: "player", x: 1, y: 3 }],
    });
    const unit = state.units[0];
    const reach = reachableStops(ctx.move, unit, state.units, 6);
    // Water tiles at (2,4),(3,4) must be unreachable.
    expect(reach.tiles.has(key(2, 4))).toBe(false);
    expect(reach.tiles.has(key(3, 4))).toBe(false);
    // Bridge at (4,4) reachable: 3 east along row 3, then 1 south (cost 4).
    expect(reach.tiles.has(key(4, 4))).toBe(true);
  });

  it("blocks paths through other units but allows own start tile", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 2, y: 2 },
        { class: "infantry", team: "enemy", x: 2, y: 3 },
        { class: "infantry", team: "player", x: 1, y: 3 },
      ],
    });
    const unit = state.units.find((u) => u.x === 2 && u.y === 2)!;
    const reach = reachableStops(ctx.move, unit, state.units, 3);
    expect(reach.tiles.has(key(2, 3))).toBe(false); // enemy blocks
    expect(reach.tiles.has(key(1, 3))).toBe(false); // ally blocks
    expect(reach.tiles.has(key(2, 2))).toBe(true); // own tile kept at cost 0
  });

  it("never routes paths through other units (regression)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "recon", team: "player", x: 0, y: 3 },
        { class: "infantry", team: "player", x: 1, y: 3 },
      ],
    });
    const recon = state.units.find((u) => u.class === "recon")!;
    const ally = state.units.find((u) => u.class === "infantry")!;
    const reach = reachableStops(ctx.move, recon, state.units, 6);
    for (const [, tile] of reach.tiles) {
      const path = pathTo(reach, tile.coord);
      expect(path.length, `path to ${tile.coord.x},${tile.coord.y}`).toBeGreaterThan(0);
      for (let i = 1; i < path.length; i++) {
        expect(path[i].x === ally.x && path[i].y === ally.y).toBe(false);
      }
    }
  });

  it("builds a valid step-by-step path", () => {
    const { ctx, state } = setup({
      units: [{ class: "recon", team: "player", x: 0, y: 0 }],
    });
    const unit = state.units[0];
    const reach = reachableStops(ctx.move, unit, state.units, 6);
    const dest = reach.tiles.get(key(3, 2))!;
    const path = pathTo(reach, dest.coord);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 3, y: 2 });
    for (let i = 1; i < path.length; i++) {
      const d = Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y);
      expect(d).toBe(1);
    }
  });
});
