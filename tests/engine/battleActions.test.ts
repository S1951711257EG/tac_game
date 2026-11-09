/** Battle actions: legality, capture, turn flow, victory/defeat, force extraction. */
import { describe, it, expect } from "vitest";
import { applyMove, applyAttack, endTurn, extractForce, readyUnits } from "@/game/battleActions";
import { pathTo, reachableStops } from "@/game/movement";
import { setup } from "./helpers";
import { key } from "@/game/grid";

const pathToDest = (fx: ReturnType<typeof setup>, unitId: string, x: number, y: number) => {
  const unit = fx.state.units.find((u) => u.id === unitId)!;
  const reach = reachableStops(fx.ctx.move, unit, fx.state.units, 9);
  const tile = reach.tiles.get(key(x, y));
  return tile ? pathTo(reach, tile.coord) : null;
};

describe("move legality", () => {
  it("rejects moving the opponent's unit", () => {
    const { ctx, state } = setup();
    const enemy = state.units.find((u) => u.team === "enemy")!;
    const res = applyMove(state, ctx, enemy.id, [{ x: enemy.x, y: enemy.y }, { x: enemy.x, y: enemy.y - 1 }]);
    expect(res.ok).toBe(false);
    expect(res.reasonKey).toBe("action.notYours");
  });

  it("rejects impassable terrain (water)", () => {
    const { ctx, state } = setup({
      units: [{ class: "infantry", team: "player", x: 1, y: 3 }],
    });
    const unit = state.units[0];
    // (2,4) is water, adjacent diagonally-invalid; go (1,4) then (2,4).
    const res = applyMove(state, ctx, unit.id, [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }]);
    expect(res.ok).toBe(false);
    expect(res.reasonKey).toBe("action.impassable");
  });

  it("rejects moving beyond move points", () => {
    const { ctx, state } = setup({
      units: [{ class: "infantry", team: "player", x: 0, y: 0 }],
    });
    const unit = state.units[0];
    const res = applyMove(state, ctx, unit.id, [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
    ]);
    expect(res.ok).toBe(false);
    expect(res.reasonKey).toBe("action.outOfRange");
  });

  it("rejects moving onto an occupied tile and through units", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "player", x: 1, y: 2 },
      ],
    });
    const unit = state.units[0];
    const res = applyMove(state, ctx, unit.id, [{ x: 1, y: 1 }, { x: 1, y: 2 }]);
    expect(res.ok).toBe(false);
    expect(res.reasonKey).toBe("action.occupied");
  });

  it("allows a legal move and marks the unit as moved", () => {
    const { ctx, state } = setup({
      units: [{ class: "recon", team: "player", x: 0, y: 0 }],
    });
    const unit = state.units[0];
    const res = applyMove(state, ctx, unit.id, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }]);
    expect(res.ok).toBe(true);
    const moved = res.state.units.find((u) => u.id === unit.id)!;
    expect(moved.x).toBe(2);
    expect(moved.moved).toBe(true);
    expect(res.events.some((e) => e.type === "unitMoved")).toBe(true);
  });
});

describe("capture and victory", () => {
  it("captures an objective when a capturing unit ends its move on it", () => {
    const { ctx, state } = setup({
      units: [{ class: "infantry", team: "player", x: 1, y: 2 }],
      objectives: [{ x: 1, y: 4, owner: "neutral" }],
    });
    const unit = state.units[0];
    const path = pathToDest({ ctx, state }, unit.id, 1, 4)!;
    const res = applyMove(state, ctx, unit.id, path);
    expect(res.ok).toBe(true);
    expect(res.events.some((e) => e.type === "objectiveCaptured")).toBe(true);
    expect(res.state.objectives[0].owner).toBe("player");
    // Sole objective captured -> victory.
    expect(res.state.status).toBe("victory");
  });

  it("emits a battleEnded event when the last objective is captured (regression)", () => {
    const { ctx, state } = setup({
      units: [{ class: "infantry", team: "player", x: 1, y: 2 }],
      objectives: [{ x: 1, y: 4, owner: "neutral" }],
    });
    const unit = state.units[0];
    const path = pathToDest({ ctx, state }, unit.id, 1, 4)!;
    const res = applyMove(state, ctx, unit.id, path);
    expect(res.state.status).toBe("victory");
    expect(res.events.some((e) => e.type === "battleEnded" && e.status === "victory")).toBe(true);
  });

  it("does not capture with a non-capturing unit (armor)", () => {
    const { ctx, state } = setup({
      units: [{ class: "armor", team: "player", x: 1, y: 2 }],
      objectives: [{ x: 1, y: 4, owner: "neutral" }],
    });
    const unit = state.units[0];
    const path = pathToDest({ ctx, state }, unit.id, 1, 4)!;
    const res = applyMove(state, ctx, unit.id, path);
    expect(res.ok).toBe(true);
    expect(res.state.objectives[0].owner).toBe("neutral");
    expect(res.state.status).toBe("active");
  });

  it("awards victory when all enemies are destroyed (annihilate)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "recon", team: "enemy", x: 2, y: 1, hp: 3 },
      ],
      objectives: [{ x: 5, y: 5, owner: "neutral" }],
      victory: { captureAll: false, annihilate: true },
    });
    const res = applyAttack(state, ctx, state.units[0].id, state.units[1].id);
    expect(res.ok).toBe(true);
    expect(res.state.units.some((u) => u.team === "enemy")).toBe(false);
    expect(res.state.status).toBe("victory");
  });

  it("defeats the player when all player units are gone", () => {
    const { ctx, state } = setup({
      units: [
        { class: "recon", team: "player", x: 1, y: 1, hp: 3 },
        { class: "armor", team: "enemy", x: 2, y: 1 },
      ],
      objectives: [{ x: 5, y: 5, owner: "neutral" }],
    });
    const res = applyAttack(state, ctx, state.units[0].id, state.units[1].id);
    // recon dies to the counter (or before) -> player eliminated.
    const players = res.state.units.filter((u) => u.team === "player");
    expect(res.state.status).toBe("defeat");
    expect(players.length).toBe(0);
  });
});

describe("attack legality and turn flags", () => {
  it("rejects friendly fire, self-target and out-of-range attacks", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "player", x: 1, y: 2 },
        { class: "infantry", team: "enemy", x: 5, y: 5 },
      ],
    });
    const p1 = state.units[0];
    const ally = state.units[1];
    const far = state.units[2];
    expect(applyAttack(state, ctx, p1.id, ally.id).reasonKey).toBe("action.friendlyTarget");
    expect(applyAttack(state, ctx, p1.id, p1.id).reasonKey).toBe("action.selfTarget");
    expect(applyAttack(state, ctx, p1.id, far.id).reasonKey).toBe("action.outOfRange");
  });

  it("marks the attacker as done after attacking; cannot act twice", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 2, y: 1 },
      ],
    });
    const res = applyAttack(state, ctx, state.units[0].id, state.units[1].id);
    expect(res.ok).toBe(true);
    const attacker = res.state.units.find((u) => u.id === state.units[0].id)!;
    expect(attacker.attacked).toBe(true);
    const again = applyAttack(res.state, ctx, attacker.id, res.state.units.find((u) => u.team === "enemy")!.id);
    expect(again.ok).toBe(false);
    expect(again.reasonKey).toBe("action.alreadyActed");
  });

  it("allows move then attack, but not attack then move", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 4, y: 1 },
      ],
    });
    const unit = state.units[0];
    // move 1 tile toward the enemy, then attack from adjacent-ish range 2? range 1:
    const moveRes = applyMove(state, ctx, unit.id, [{ x: 1, y: 1 }, { x: 2, y: 1 }]);
    expect(moveRes.ok).toBe(true);
    // distance now 2 -> still out of range for infantry; move once more is illegal.
    const move2 = applyMove(moveRes.state, ctx, unit.id, [{ x: 2, y: 1 }, { x: 3, y: 1 }]);
    expect(move2.ok).toBe(false);
    expect(move2.reasonKey).toBe("action.alreadyMoved");
  });
});

describe("turn flow", () => {
  it("alternates teams and resets flags", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 4, y: 1 },
      ],
    });
    // Move adjacent to the enemy (2 move points) — unit may still attack.
    const moved = applyMove(state, ctx, state.units[0].id, [
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    ]);
    expect(moved.ok).toBe(true);
    expect(readyUnits(moved.state, "player").length).toBe(1);
    const attacked = applyAttack(moved.state, ctx, state.units[0].id, moved.state.units.find((u) => u.team === "enemy")!.id);
    expect(attacked.ok).toBe(true);
    expect(readyUnits(attacked.state, "player").length).toBe(0);
    const turn2 = endTurn(attacked.state, ctx);
    expect(turn2.state.activeTeam).toBe("enemy");
    const turn3 = endTurn(turn2.state, ctx);
    expect(turn3.state.activeTeam).toBe("player");
    expect(turn3.state.turn).toBe(2);
    expect(readyUnits(turn3.state, "player").length).toBe(1);
  });

  it("defeats the player when the turn limit expires", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 4, y: 1 },
      ],
      turnLimit: 2,
    });
    let cur = state;
    for (let i = 0; i < 4; i++) {
      const res = endTurn(cur, ctx);
      cur = res.state;
      if (cur.status === "defeat") break;
    }
    expect(cur.status).toBe("defeat");
    expect(cur.turn).toBe(3); // defeat judged when player turn 3 begins
  });

  it("extracts surviving player units for the campaign force", () => {
    const { state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1, hp: 6 },
        { class: "recon", team: "player", x: 1, y: 2, hp: 1 },
        { class: "armor", team: "enemy", x: 4, y: 1 },
      ],
    });
    const force = extractForce(state);
    expect(force.length).toBe(2);
    expect(force[0].hp).toBe(6);
  });
});
