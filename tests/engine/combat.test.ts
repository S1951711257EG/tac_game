/** Combat rules: damage math, terrain protection, counters, lethality. */
import { describe, it, expect } from "vitest";
import { forecastAttack, resolveAttack, terrainProtection } from "@/game/combat";
import { createRng } from "@/game/rng";
import { setup } from "./helpers";

describe("damage math", () => {
  it("armor hits infantry hard in the open (7 atk, 1.25 mod)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 2, y: 1 },
      ],
    });
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    // base = 7 * 1.25 = 8.75 -> ±10% -> [round(7.875), round(9.625)] = [8, 10]
    expect(fc.minDamage).toBe(8);
    expect(fc.maxDamage).toBe(10);
  });

  it("terrain protection reduces damage (city def 3 = 21%)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 0, y: 3 },
        { class: "infantry", team: "enemy", x: 1, y: 4 }, // city tile
      ],
    });
    expect(terrainProtection(ctx.combat, ctx.combat.terrainAt(1, 4))).toBeCloseTo(0.21);
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    // 8.75 * 0.79 = 6.9125 -> [round(6.22), round(7.6)] = [6, 8]
    expect(fc.minDamage).toBe(6);
    expect(fc.maxDamage).toBe(8);
  });

  it("counterattack uses counterFactor and defender's attack", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 2, y: 1 },
      ],
    });
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    expect(fc.canCounter).toBe(true);
    // counter base = 4 * 0.5 * 0.55 = 1.1 -> min round(0.99)=1, max round(1.21)=1
    expect(fc.counterMin).toBe(1);
    expect(fc.counterMax).toBe(1);
  });

  it("artillery cannot counter adjacent attackers (min range 2)", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "artillery", team: "enemy", x: 2, y: 1 },
      ],
    });
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    expect(fc.canCounter).toBe(false);
    expect(fc.counterMin).toBe(0);
    expect(fc.counterMax).toBe(0);
  });

  it("flags likely-lethal attacks", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "recon", team: "enemy", x: 2, y: 1, hp: 5 },
      ],
    });
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    expect(fc.likelyLethal).toBe(true);
  });
});

describe("resolveAttack", () => {
  it("applies damage within forecast bounds and rolls the RNG state", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 2, y: 1 },
      ],
    });
    const fc = forecastAttack(ctx.combat, state.units[0], state.units[1]);
    const rng = createRng(123);
    const res = resolveAttack(ctx.combat, state.units[0], state.units[1], rng);
    expect(res.damage).toBeGreaterThanOrEqual(fc.minDamage);
    expect(res.damage).toBeLessThanOrEqual(fc.maxDamage);
    expect(res.defenderHpAfter).toBe(10 - res.damage);
    expect(res.destroyedDefender).toBe(false);
  });

  it("destroys the defender at 0 hp and suppresses the counter", () => {
    const { ctx, state } = setup({
      units: [
        { class: "armor", team: "player", x: 1, y: 1 },
        { class: "recon", team: "enemy", x: 2, y: 1, hp: 3 },
      ],
    });
    const rng = createRng(7);
    const res = resolveAttack(ctx.combat, state.units[0], state.units[1], rng);
    expect(res.destroyedDefender).toBe(true);
    expect(res.defenderHpAfter).toBe(0);
    expect(res.counterDamage).toBe(0);
  });

  it("suppresses counters from defenders broken to <= 2 hp", () => {
    const { ctx, state } = setup({
      units: [
        { class: "infantry", team: "player", x: 1, y: 1 },
        { class: "infantry", team: "enemy", x: 2, y: 1, hp: 4 },
      ],
    });
    // damage will be 3-5 vs hp 4 -> survivor likely <= 2 -> no counter.
    const rng = createRng(2024);
    const res = resolveAttack(ctx.combat, state.units[0], state.units[1], rng);
    if (res.defenderHpAfter <= 2) {
      expect(res.counterDamage).toBe(0);
    } else {
      expect(res.counterDamage).toBeGreaterThan(0);
    }
  });
});
