/** Campaign rules: prestige economy, choices, node progression, completion. */
import { describe, it, expect } from "vitest";
import {
  applyRecruit,
  applyRepair,
  applyTraining,
  campaignFinished,
  completeNode,
  grantPrestige,
  mergeSurvivors,
  newCampaignState,
  nodeById,
  repairCost,
  selectNode,
} from "@/game/campaignRules";
import { loadContent } from "@/game/content";

const def = loadContent().campaign;

const stateWith = (force: Array<{ class: string; hp: number; vet: number }>, prestige = 40) => ({
  ...newCampaignState(def),
  prestige,
  force: force.map((u, i) => ({ id: `f${i}`, ordinal: i + 1, ...u })),
});

describe("campaign state", () => {
  it("starts with the entry node available and no force", () => {
    const s = newCampaignState(def);
    expect(s.availableNodes).toContain("bootcamp");
    expect(s.force).toHaveLength(0);
    expect(s.prestige).toBe(def.startPrestige);
  });
});

describe("economy choices", () => {
  it("repairs damaged units at economy cost and restores full HP", () => {
    const s = stateWith([
      { class: "infantry", hp: 5, vet: 0 },
      { class: "armor", hp: 9, vet: 0 },
    ], 40);
    const cost = repairCost(s, def);
    expect(cost).toBe(5 + 1); // 5 missing infantry HP + 1 missing armor HP
    const res = applyRepair(s, def);
    expect(res.ok).toBe(true);
    expect(res.state.prestige).toBe(40 - cost);
    expect(res.state.force.every((u) => u.hp === loadContent().unitClassById[u.class].hp)).toBe(true);
  });

  it("refuses repairs when broke or unhurt", () => {
    const hurt = stateWith([{ class: "infantry", hp: 4, vet: 0 }], 2);
    expect(applyRepair(hurt, def).reasonKey).toBe("choice.cannotAfford");
    const healthy = stateWith([{ class: "infantry", hp: 10, vet: 0 }], 40);
    expect(applyRepair(healthy, def).reasonKey).toBe("choice.noDamage");
  });

  it("trains veterancy up to the balance cap", () => {
    const max = loadContent().balance.veterancyMax;
    const s = stateWith([{ class: "armor", hp: 10, vet: max }, { class: "recon", hp: 8, vet: 1 }], 40);
    const res = applyTraining(s, def);
    expect(res.ok).toBe(true);
    expect(res.state.force[0].vet).toBe(max);
    expect(res.state.force[1].vet).toBe(2);
  });

  it("recruits new formations with cost and class ordinals", () => {
    const s = stateWith([{ class: "infantry", hp: 10, vet: 0 }], 40);
    const res = applyRecruit(s, def, "recon");
    expect(res.ok).toBe(true);
    expect(res.state.force).toHaveLength(2);
    expect(res.state.force[1].class).toBe("recon");
    expect(res.state.force[1].ordinal).toBe(1);
    expect(res.state.prestige).toBe(40 - def.economy.recruit.recon);
  });

  it("enforces the force size cap", () => {
    const full = stateWith(
      Array.from({ length: def.maxForceSize }, () => ({ class: "infantry", hp: 10, vet: 0 })),
      400,
    );
    expect(applyRecruit(full, def, "infantry").reasonKey).toBe("choice.forceFull");
  });
});

describe("objective progression", () => {
  it("allows selecting only available nodes", () => {
    const s = newCampaignState(def);
    expect(selectNode(s, def, "gate").ok).toBe(false);
    const picked = selectNode(s, def, "bootcamp");
    expect(picked.ok).toBe(true);
    expect(picked.state.currentNode).toBe("bootcamp");
  });

  it("unlocks successors after a win and finishes after the last node", () => {
    let s = newCampaignState(def);
    s = selectNode(s, def, "bootcamp").state;
    s = completeNode(s, def, "bootcamp");
    expect(s.completedNodes).toContain("bootcamp");
    expect(s.availableNodes).toEqual(["crossing"]);
    s = completeNode(s, def, "crossing");
    expect(s.availableNodes).toEqual(expect.arrayContaining(["hill214", "rustfields"]));
    s = completeNode(s, def, "hill214");
    s = completeNode(s, def, "rustfields");
    s = completeNode(s, def, "gate");
    expect(campaignFinished(s, def)).toBe(true);
  });

  it("keeps prestige and force through the win path", () => {
    let s = stateWith([{ class: "armor", hp: 6, vet: 1 }], 10);
    s = grantPrestige(s, 25);
    s = mergeSurvivors(s, [{ id: "f0", class: "armor", hp: 8, vet: 1, ordinal: 1 }]);
    expect(s.prestige).toBe(35);
    expect(s.force[0].hp).toBe(8);
  });
});
