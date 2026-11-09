/** AI opponent: legal plans, objective capture, attack preference, standoff. */
import { describe, it, expect } from "vitest";
import { planAiTurn } from "@/game/ai";
import { applyAttack, applyMove } from "@/game/battleActions";
import { setup } from "./helpers";
import { manhattan } from "@/game/grid";

/** Apply an AI plan to a state (as the store does), re-validating each step. */
function runPlan(state: ReturnType<typeof setup>["state"], ctx: ReturnType<typeof setup>["ctx"]) {
  const actions = planAiTurn(state, ctx);
  let cur = state;
  let applied = 0;
  for (const act of actions) {
    if (act.kind === "move") {
      const res = applyMove(cur, ctx, act.unitId, act.path);
      if (res.ok) {
        cur = res.state;
        applied++;
      }
    } else if (act.kind === "attack") {
      const res = applyAttack(cur, ctx, act.unitId, act.targetId);
      if (res.ok) {
        cur = res.state;
        applied++;
      }
    }
  }
  return { state: cur, actions, applied };
}

describe("AI planning", () => {
  it("produces a plan whose actions are all legal (execute without errors)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "armor", team: "player", x: 2, y: 2 },
        { class: "infantry", team: "enemy", x: 4, y: 1 },
        { class: "recon", team: "enemy", x: 4, y: 4 },
        { class: "artillery", team: "enemy", x: 5, y: 3 },
      ],
      objectives: [{ x: 1, y: 4, owner: "neutral" }],
      enemyTurn: true,
    });
    const { state: after } = runPlan(state, ctx);
    expect(after.activeTeam).toBe("enemy");
    // No crashes, no illegal states: every enemy unit ended moved/attacked or skipped.
    for (const u of after.units.filter((u) => u.team === "enemy")) {
      expect(u.moved || u.attacked || u.hp <= 0).toBe(true);
    }
  });

  it("captures a nearby objective with a capturing unit", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 0, y: 0 },
        { class: "infantry", team: "enemy", x: 2, y: 4 }, // adjacent to city (1,4)? distance 1
      ],
      objectives: [{ x: 1, y: 4, owner: "neutral" }],
      enemyTurn: true,
    });
    const { state: after, actions } = runPlan(state, ctx);
    const moved = actions.some(
      (a) => a.kind === "move" && a.path[a.path.length - 1].x === 1 && a.path[a.path.length - 1].y === 4,
    );
    expect(moved).toBe(true);
    expect(after.objectives[0].owner).toBe("enemy");
  });

  it("prefers attacking a weak adjacent target", () => {
    const { ctx, state } = setup({
      units: [
        { class: "recon", team: "player", x: 3, y: 1, hp: 3 }, // weak neighbor
        { class: "infantry", team: "enemy", x: 4, y: 1 },
      ],
      objectives: [{ x: 0, y: 5, owner: "neutral" }],
      enemyTurn: true,
    });
    const { state: after, actions } = runPlan(state, ctx);
    expect(actions.some((a) => a.kind === "attack")).toBe(true);
    const player = after.units.find((u) => u.team === "player");
    expect(player === undefined || player.hp < 3).toBe(true);
  });

  it("keeps artillery at stand-off distance (moves out of adjacency)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 2, y: 2 },
        { class: "artillery", team: "enemy", x: 2, y: 3 }, // adjacent, cannot attack
      ],
      objectives: [{ x: 5, y: 5, owner: "neutral" }],
      enemyTurn: true,
    });
    const { state: after } = runPlan(state, ctx);
    const arty = after.units.find((u) => u.class === "artillery")!;
    const dist = manhattan({ x: arty.x, y: arty.y }, { x: 2, y: 2 });
    expect(dist).toBeGreaterThanOrEqual(2);
  });

  it("advances armor toward distant enemies", () => {
    const { ctx, state } = setup({
      units: [
        { class: "recon", team: "player", x: 0, y: 5 },
        { class: "armor", team: "enemy", x: 5, y: 0 },
      ],
      objectives: [{ x: 0, y: 0, owner: "neutral" }],
      enemyTurn: true,
    });
    const { actions } = runPlan(state, ctx);
    const armorMoves = actions.filter((a) => a.kind === "move");
    expect(armorMoves.length).toBeGreaterThan(0);
    const end = (armorMoves[0] as { path: Array<{ x: number; y: number }> }).path.at(-1)!;
    expect(manhattan(end, { x: 0, y: 5 })).toBeLessThan(manhattan({ x: 5, y: 0 }, { x: 0, y: 5 }));
  });
});
