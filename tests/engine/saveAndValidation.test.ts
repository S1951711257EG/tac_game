/** Save persistence + content validation diagnostics (file & field names). */
import { describe, it, expect } from "vitest";
import { clearSave, createMemoryStorage, loadSave, writeSave } from "@/game/save";
import { validateContentSet } from "@/game/content";
import { loadContent } from "@/game/content";
import { createBattleState } from "@/game/battleSetup";
import { newCampaignState } from "@/game/campaignRules";

describe("save storage", () => {
  it("round-trips a save through memory storage", () => {
    const storage = createMemoryStorage();
    const content = loadContent();
    const campaign = newCampaignState(content.campaign);
    writeSave({ version: 1, savedAt: 1, campaign, battle: null }, storage);
    const loaded = loadSave(storage);
    expect(loaded?.campaign.campaignId).toBe(campaign.campaignId);
    expect(loaded?.campaign.availableNodes).toEqual(campaign.availableNodes);
  });

  it("treats corrupt or wrong-version saves as absent", () => {
    const storage = createMemoryStorage();
    storage.setItem("iron-meridian:save:v1", "{not json");
    expect(loadSave(storage)).toBeNull();
    storage.setItem("iron-meridian:save:v1", JSON.stringify({ version: 99 }));
    expect(loadSave(storage)).toBeNull();
    clearSave(storage);
    expect(loadSave(storage)).toBeNull();
  });

  it("round-trips a battle snapshot", () => {
    const storage = createMemoryStorage();
    const content = loadContent();
    const battle = createBattleState({ scenario: content.scenarioById["sc_bootcamp"], seed: 5, content });
    const campaign = newCampaignState(content.campaign);
    writeSave({ version: 1, savedAt: 2, campaign, battle }, storage);
    const loaded = loadSave(storage);
    expect(loaded?.battle?.scenarioId).toBe("sc_bootcamp");
    expect(loaded?.battle?.units.length).toBe(battle.units.length);
  });
});

/** Base set = the real (valid) content; each test breaks one copy. */
function baseSet() {
  const content = loadContent();
  return {
    terrain: JSON.parse(JSON.stringify(content.terrain)),
    unitClasses: JSON.parse(JSON.stringify(content.unitClasses)),
    balance: JSON.parse(JSON.stringify(content.balance)),
    classModifiers: JSON.parse(JSON.stringify(content.classModifiers)),
    aiProfiles: JSON.parse(JSON.stringify(content.aiProfiles)),
    scenarios: JSON.parse(JSON.stringify(content.scenarios)),
    campaign: JSON.parse(JSON.stringify(content.campaign)),
  };
}

describe("content validation diagnostics", () => {
  it("accepts the shipped content", () => {
    expect(validateContentSet(baseSet())).toEqual([]);
  });

  it("reports bad localization keys with file and field", () => {
    const set = baseSet();
    (set.terrain[0] as { nameKey: string }).nameKey = "not a key";
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("terrain.json[0]") && i.includes("nameKey"))).toBe(true);
  });

  it("reports unknown unit-class references in terrain costs", () => {
    const set = baseSet();
    (set.terrain[0].costs as Record<string, number>)["hovercraft"] = 1;
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("unknown unit class 'hovercraft'"))).toBe(true);
  });

  it("reports duplicate map characters", () => {
    const set = baseSet();
    (set.terrain[1] as { mapChar: string }).mapChar = "p";
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("mapChar 'p' used by both"))).toBe(true);
  });

  it("reports scenario map rows of the wrong width", () => {
    const set = baseSet();
    set.scenarios[0].map.rows[0] = "pp";
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("width"))).toBe(true);
  });

  it("reports objectives on non-capturable terrain", () => {
    const set = baseSet();
    set.scenarios[0].objectives = [{ x: 0, y: 0, owner: "neutral" }]; // plains
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("non-capturable terrain"))).toBe(true);
  });

  it("reports unknown AI profiles", () => {
    const set = baseSet();
    set.scenarios[0].aiProfile = "sleepy";
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("unknown aiProfile 'sleepy'"))).toBe(true);
  });

  it("reports missing class modifier pairs", () => {
    const set = baseSet();
    delete set.classModifiers.armor.infantry;
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("classModifiers['armor']['infantry']"))).toBe(true);
  });

  it("reports campaign nodes pointing at unknown scenarios", () => {
    const set = baseSet();
    set.campaign.nodes[0].scenarioId = "sc_missing";
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("unknown scenario 'sc_missing'"))).toBe(true);
  });

  it("reports campaigns without an entry node", () => {
    const set = baseSet();
    delete set.campaign.nodes[0].entry;
    const issues = validateContentSet(set);
    expect(issues.some((i) => i.includes("entry node"))).toBe(true);
  });
});

describe("shipped content sanity", () => {
  it("spawns units for every scenario (campaign force or fixed)", () => {
    const content = loadContent();
    for (const scenario of content.scenarios) {
      const force = scenario.spawnPlayerFromCampaign
        ? Array.from({ length: Math.min(5, scenario.deployment.length) }, (_, i) => ({
            id: `f${i}`,
            class: ["infantry", "infantry", "recon", "armor", "artillery"][i % 5],
            hp: 10,
            vet: 0,
            ordinal: i + 1,
          }))
        : null;
      const state = createBattleState({ scenario, campaignForce: force, seed: 1, content });
      expect(state.units.length, scenario.id).toBeGreaterThan(0);
      expect(state.units.some((u) => u.team === "enemy"), scenario.id).toBe(true);
      expect(state.objectives.length, scenario.id).toBeGreaterThan(0);
    }
  });
});
