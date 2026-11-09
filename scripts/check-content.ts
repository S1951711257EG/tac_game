/** Quick content sanity check: map row widths + full content validation. */
import { validateContentSet, SCENARIO_FILES } from "../src/game/content";

const terrain = (await import("../src/content/terrain.json")).default;
const unitClasses = (await import("../src/content/unit-classes.json")).default;
const balance = (await import("../src/content/balance.json")).default;
const aiProfiles = (await import("../src/content/ai-profiles.json")).default;
const campaign = (await import("../src/content/campaign.json")).default;

const issues = validateContentSet({
  terrain,
  unitClasses,
  balance: balance.balance,
  classModifiers: balance.classModifiers,
  aiProfiles,
  scenarios: [...SCENARIO_FILES],
  campaign,
});

if (issues.length) {
  console.error(`CONTENT INVALID — ${issues.length} issue(s):`);
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}
console.log("Content validation passed:");
console.log(`  terrain: ${(terrain as unknown[]).length}, classes: ${(unitClasses as unknown[]).length}, ai: ${(aiProfiles as unknown[]).length}, scenarios: ${SCENARIO_FILES.length}`);
for (const s of SCENARIO_FILES) {
  console.log(`  ${s.id}: ${s.map.width}x${s.map.height}, ${s.units.length} units, ${s.objectives.length} objectives, limit ${s.turnLimit}`);
}
