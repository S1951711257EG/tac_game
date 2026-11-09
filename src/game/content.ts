/**
 * Content registry: loads all JSON content, validates it (startup + tests),
 * and exposes typed accessors. Content is imported statically so a missing
 * file is a build error; malformed data is a validated runtime error with
 * file/field diagnostics rather than a crash.
 */
import terrainJson from "@/content/terrain.json";
import unitClassesJson from "@/content/unit-classes.json";
import balanceJson from "@/content/balance.json";
import aiProfilesJson from "@/content/ai-profiles.json";
import campaignJson from "@/content/campaign.json";
import scenarioTutorial from "@/content/scenarios/bootcamp.json";
import scenarioCrossing from "@/content/scenarios/crossing.json";
import scenarioHill214 from "@/content/scenarios/hill214.json";
import scenarioRustfields from "@/content/scenarios/rustfields.json";
import scenarioVelmoraGate from "@/content/scenarios/velmora-gate.json";
import {
  terrainDefSchema,
  unitClassSchema,
  balanceSchema,
  classModifierTableSchema,
  aiProfileSchema,
  campaignSchema,
  scenarioSchema,
} from "./schemas";
import type {
  AiProfileDef,
  BalanceDef,
  CampaignDef,
  ScenarioDef,
  TerrainDef,
  UnitClassDef,
  ClassModifierTable,
} from "./types";
import type { ZodType } from "zod";

/** All scenario files, in campaign order. Add a file here + in campaign.json. */
export const SCENARIO_FILES: ReadonlyArray<ScenarioDef> = [
  scenarioTutorial,
  scenarioCrossing,
  scenarioHill214,
  scenarioRustfields,
  scenarioVelmoraGate,
] as unknown as ScenarioDef[];

export class ContentError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Invalid game content (${issues.length} issue(s)):\n- ${issues.join("\n- ")}`);
    this.name = "ContentError";
    this.issues = issues;
  }
}

/** Format a zod failure as "file: path — message" diagnostic lines. */
export function formatZodIssues(
  file: string,
  error: { issues: Array<{ path: PropertyKey[]; message: string }> },
): string[] {
  return error.issues.map((iss) => {
    const path = iss.path.length ? iss.path.map(String).join(".") : "(root)";
    return `${file}: ${path} — ${iss.message}`;
  });
}

/** Parse without throwing; returns issues so validation can accumulate. */
function parseSoft<T>(file: string, schema: ZodType<T>, data: unknown): { data: T | null; issues: string[] } {
  const res = schema.safeParse(data);
  if (!res.success) return { data: null, issues: formatZodIssues(file, res.error) };
  return { data: res.data, issues: [] };
}

export interface GameContent {
  terrain: TerrainDef[];
  terrainByChar: Record<string, TerrainDef>;
  terrainById: Record<string, TerrainDef>;
  unitClasses: UnitClassDef[];
  unitClassById: Record<string, UnitClassDef>;
  balance: BalanceDef;
  classModifiers: ClassModifierTable;
  aiProfiles: AiProfileDef[];
  aiProfileById: Record<string, AiProfileDef>;
  scenarios: ScenarioDef[];
  scenarioById: Record<string, ScenarioDef>;
  campaign: CampaignDef;
}

/**
 * Pure validation of a full content set. Returns a list of diagnostics;
 * empty list means the content is valid. Used by loadContent() and tests.
 */
export function validateContentSet(input: {
  terrain: unknown[];
  unitClasses: unknown[];
  balance: unknown;
  classModifiers: unknown;
  aiProfiles: unknown[];
  scenarios: unknown[];
  campaign: unknown;
}): string[] {
  const issues: string[] = [];

  // Phase 1: schema validation per item, accumulating diagnostics.
  const terrain = input.terrain.map((t, i) => parseSoft(`terrain.json[${i}]`, terrainDefSchema, t));
  const unitClasses = input.unitClasses.map((u, i) => parseSoft(`unit-classes.json[${i}]`, unitClassSchema, u));
  const balance = parseSoft("balance.json", balanceSchema, input.balance);
  const classModifiers = parseSoft("balance.json#classModifiers", classModifierTableSchema, input.classModifiers);
  const aiProfiles = input.aiProfiles.map((a, i) => parseSoft(`ai-profiles.json[${i}]`, aiProfileSchema, a));
  const scenarios = input.scenarios.map((s, i) => parseSoft(`scenarios[${i}]`, scenarioSchema, s));
  const campaign = parseSoft("campaign.json", campaignSchema, input.campaign);

  const schemaIssues = [
    ...terrain.flatMap((r) => r.issues),
    ...unitClasses.flatMap((r) => r.issues),
    ...balance.issues,
    ...classModifiers.issues,
    ...aiProfiles.flatMap((r) => r.issues),
    ...scenarios.flatMap((r) => r.issues),
    ...campaign.issues,
  ];
  if (schemaIssues.length > 0) {
    // Cross-file checks need valid items; report schema problems first.
    return [...issues, ...schemaIssues];
  }

  const terrainOk = terrain.map((r) => r.data!) as TerrainDef[];
  const unitClassesOk = unitClasses.map((r) => r.data!) as UnitClassDef[];
  const balanceOk = balance.data as BalanceDef;
  const classModifiersOk = classModifiers.data as ClassModifierTable;
  const aiProfilesOk = aiProfiles.map((r) => r.data!) as AiProfileDef[];
  const scenariosOk = scenarios.map((r) => r.data!) as ScenarioDef[];
  const campaignOk = campaign.data as CampaignDef;

  // --- cross-file references --------------------------------------------
  const classIds = new Set(unitClassesOk.map((c) => c.id));
  if (classIds.size !== unitClassesOk.length) issues.push("unit-classes.json: duplicate class ids");

  const charsSeen = new Map<string, string>();
  for (const t of terrainOk) {
    const prev = charsSeen.get(t.mapChar);
    if (prev) issues.push(`terrain.json: mapChar '${t.mapChar}' used by both '${prev}' and '${t.id}'`);
    charsSeen.set(t.mapChar, t.id);
    for (const cls of Object.keys(t.costs)) {
      if (!classIds.has(cls)) issues.push(`terrain.json: terrain '${t.id}' references unknown unit class '${cls}'`);
    }
  }
  if (!charsSeen.has("p")) issues.push("terrain.json: no terrain defines mapChar 'p' (plains expected)");

  const charToId = (ch: string) => charsSeen.get(ch) ?? null;

  for (const a of aiProfilesOk) {
    if (a.standoff.min > a.standoff.max) issues.push(`ai-profiles.json: profile '${a.id}' standoff.min > max`);
  }
  const profileIds = new Set(aiProfilesOk.map((a) => a.id));

  for (const cls of unitClassesOk) {
    if (cls.minRange > cls.maxRange) issues.push(`unit-classes.json: class '${cls.id}' minRange > maxRange`);
    if (!classModifiersOk[cls.id]) issues.push(`balance.json: classModifiers missing attacker column '${cls.id}'`);
    for (const def of unitClassesOk) {
      const mod = classModifiersOk[cls.id]?.[def.id];
      if (mod === undefined) issues.push(`balance.json: classModifiers['${cls.id}']['${def.id}'] missing`);
    }
  }

  const scenarioIds = new Set<string>();
  scenariosOk.forEach((s, i) => {
    const file = `scenarios[${i}] (${s.id})`;
    scenarioIds.add(s.id);
    if (!profileIds.has(s.aiProfile)) issues.push(`${file}: unknown aiProfile '${s.aiProfile}'`);
    for (const u of s.units) {
      if (!classIds.has(u.class)) issues.push(`${file}: unknown unit class '${u.class}'`);
    }
    for (const row of s.map.rows) {
      for (const ch of row) {
        if (!charToId(ch)) issues.push(`${file}: map character '${ch}' has no terrain definition`);
      }
    }
    const height = s.map.height;
    const width = s.map.width;
    for (const u of [...s.units, ...s.bonusUnits]) {
      if (u.x >= width || u.y >= height) issues.push(`${file}: unit at ${u.x},${u.y} is outside the map`);
    }
    for (const o of s.objectives) {
      if (o.x >= width || o.y >= height) issues.push(`${file}: objective at ${o.x},${o.y} is outside the map`);
      const t = charToId(s.map.rows[o.y]?.[o.x] ?? "?");
      const capturable = t ? terrainOk.find((tt) => tt.id === t)?.capturable : false;
      if (t && !capturable) issues.push(`${file}: objective at ${o.x},${o.y} sits on non-capturable terrain '${t}'`);
    }
    for (const d of s.deployment) {
      if (d.x >= width || d.y >= height) issues.push(`${file}: deployment tile ${d.x},${d.y} outside the map`);
    }
    if (s.spawnPlayerFromCampaign && s.deployment.length === 0) {
      issues.push(`${file}: spawnPlayerFromCampaign=true but deployment list is empty`);
    }
  });

  const nodeIds = new Set(campaignOk.nodes.map((n) => n.id));
  if (nodeIds.size !== campaignOk.nodes.length) issues.push("campaign.json: duplicate node ids");
  for (const n of campaignOk.nodes) {
    if (!scenarioIds.has(n.scenarioId)) issues.push(`campaign.json: node '${n.id}' references unknown scenario '${n.scenarioId}'`);
    for (const nxt of n.next) if (!nodeIds.has(nxt)) issues.push(`campaign.json: node '${n.id}' links to unknown node '${nxt}'`);
  }
  for (const cls of Object.keys(campaignOk.economy.recruit)) {
    if (!classIds.has(cls)) issues.push(`campaign.json: economy.recruit references unknown class '${cls}'`);
  }

  return issues;
}

function buildContent(): GameContent {
  const raw = {
    terrain: terrainJson as unknown[],
    unitClasses: unitClassesJson as unknown[],
    balance: (balanceJson as { balance: unknown }).balance,
    classModifiers: (balanceJson as { classModifiers: unknown }).classModifiers,
    aiProfiles: aiProfilesJson as unknown[],
    scenarios: SCENARIO_FILES as unknown[],
    campaign: campaignJson,
  };
  const issues = validateContentSet(raw);
  if (issues.length) throw new ContentError(issues);

  const terrain = raw.terrain as unknown as TerrainDef[];
  const unitClasses = raw.unitClasses as unknown as UnitClassDef[];
  const terrainByChar: Record<string, TerrainDef> = {};
  for (const t of terrain) terrainByChar[t.mapChar] = t;
  const terrainById: Record<string, TerrainDef> = {};
  for (const t of terrain) terrainById[t.id] = t;
  const unitClassById: Record<string, UnitClassDef> = {};
  for (const c of unitClasses) unitClassById[c.id] = c;
  const aiProfiles = raw.aiProfiles as unknown as AiProfileDef[];
  const aiProfileById: Record<string, AiProfileDef> = {};
  for (const a of aiProfiles) aiProfileById[a.id] = a;
  const scenarios = raw.scenarios as unknown as ScenarioDef[];
  const scenarioById: Record<string, ScenarioDef> = {};
  for (const s of scenarios) scenarioById[s.id] = s;

  return {
    terrain,
    terrainByChar,
    terrainById,
    unitClasses,
    unitClassById,
    balance: raw.balance as unknown as BalanceDef,
    classModifiers: raw.classModifiers as unknown as ClassModifierTable,
    aiProfiles,
    aiProfileById,
    scenarios,
    scenarioById,
    campaign: raw.campaign as unknown as CampaignDef,
  };
}

let cached: GameContent | null = null;

/** Validated, frozen content. Throws ContentError with diagnostics on bad data. */
export function loadContent(): GameContent {
  if (!cached) {
    cached = buildContent();
    Object.freeze(cached);
  }
  return cached;
}

/** Test hook: reset the cached content registry. */
export function resetContentCache(): void {
  cached = null;
}
