/**
 * Iron Meridian — core domain types.
 *
 * These types are shared by the rules engine, AI, content data and UI.
 * The engine is intentionally free of React / DOM / rendering imports so it
 * stays testable and cannot accidentally become the source of presentation.
 */

export type Team = "player" | "enemy";

export type UnitClassId = string; // stable id, defined in content/unit-classes.json

export type TerrainId = string; // stable id, defined in content/terrain.json

/** Board coordinate. x grows right, y grows down. */
export interface Coord {
  x: number;
  y: number;
}

/** One terrain type (plains, forest, city...). Content-driven. */
export interface TerrainDef {
  id: TerrainId;
  mapChar: string; // single char used in scenario maps
  nameKey: string; // localization key
  descKey: string;
  /** Defense points; each point reduces incoming damage. */
  defense: number;
  /** Move cost per unit class; null = impassable for that class. */
  costs: Record<UnitClassId, number | null>;
  /** Objective tiles can change ownership when captured. */
  capturable: boolean;
  /** Semantic theme role used by the renderer (e.g. "terrain.forest"). */
  themeRole: string;
}

/** One unit class (infantry, armor...). Content-driven; instances hold state. */
export interface UnitClassDef {
  id: UnitClassId;
  nameKey: string;
  roleKey: string; // short "role" line, e.g. "Frontline holder"
  descKey: string; // plain-language explanation
  icon: string; // asset key for the unit token art
  move: number;
  minRange: number;
  maxRange: number;
  attack: number;
  defense: number;
  hp: number;
  canCapture: boolean;
  /** Prestige required to recruit this class (campaign economy). */
  recruitCost: number;
  themeRole: string;
}

/** Combat modifier attacker-class -> defender-class (content/balance.json). */
export type ClassModifierTable = Record<string, Record<string, number>>;

export interface BalanceDef {
  /** RNG spread on damage rolls, e.g. 0.1 = ±10%. */
  damageRngSpread: number;
  /** Damage multiplier for a defender's counterattack. */
  counterFactor: number;
  /** Damage reduction per point of terrain defense (fraction). */
  terrainDefenseReduction: number;
  /** Veterancy: attack bonus per level (fraction) and max level. */
  veterancyAttackBonus: number;
  veterancyMax: number;
  /** Counterattacks are skipped when the attacker dies or breaks this HP. */
  counterBreakThreshold: number;
}

export interface AiProfileDef {
  id: string;
  nameKey: string;
  /** How much a counterattack expectation discourages attacking. */
  counterWeight: number;
  /** Bonus score when an attack is expected to destroy the target. */
  killBonus: number;
  /** Score weight for stepping onto capturable objectives. */
  objectiveScore: number;
  /** Score weight for defensive terrain. */
  terrainSafety: number;
  /** Prefer keeping indirect units at this distance band from enemies. */
  standoff: { min: number; max: number };
  standoffBonus: number;
  /** 0 = timid, 1 = relentless advance when no objective is reachable. */
  aggression: number;
}

export interface Unit {
  id: string;
  class: UnitClassId;
  team: Team;
  x: number;
  y: number;
  hp: number;
  /** Veterancy level 0..veterancyMax (campaign persistence). */
  vet: number;
  moved: boolean;
  attacked: boolean;
  /** Present when this unit belongs to the persistent campaign force. */
  forceId?: string;
  /** 1-based formation number for display ("Rifles 2"). */
  nameOrdinal?: number;
}

export type ObjectiveOwner = Team | "neutral";

export interface Objective {
  x: number;
  y: number;
  owner: ObjectiveOwner;
}

export interface LogEntry {
  id: number;
  /** Localization key, e.g. "log.attack". */
  key: string;
  /** Interpolation params for the localized message. */
  params?: Record<string, string | number>;
  team?: Team;
}

export type BattleStatus = "active" | "victory" | "defeat";

export interface ScenarioVictory {
  /** "own every objective" and/or "destroy every enemy". */
  captureAll: boolean;
  annihilate: boolean;
}

export interface ScenarioUnitSpec {
  class: UnitClassId;
  team: Team;
  x: number;
  y: number;
  vet?: number;
  hp?: number;
}

export interface ScenarioDef {
  id: string;
  nameKey: string;
  briefKey: string;
  introKey: string;
  outroKey: string;
  /** AI profile id from content/ai-profiles.json. */
  aiProfile: string;
  map: {
    width: number;
    height: number;
    /** Rows of map characters; each char maps to a TerrainDef.mapChar. */
    rows: string[];
  };
  units: ScenarioUnitSpec[];
  /** Fixed starting objectives; owner defaults to "neutral". */
  objectives: Array<{ x: number; y: number; owner?: ObjectiveOwner }>;
  victory: ScenarioVictory;
  turnLimit: number;
  /** Where the persistent campaign force deploys (order = force order). */
  deployment: Array<{ x: number; y: number }>;
  /** Use the persistent campaign force instead of `units` for the player. */
  spawnPlayerFromCampaign: boolean;
  /** Extra free units granted on top of the campaign force. */
  bonusUnits: Array<{ class: UnitClassId; x: number; y: number }>;
  rewards: {
    prestige: number;
    perObjective: number;
    perRemainingTurn: number;
  };
  /** Optional guided tutorial script (event-driven steps). */
  tutorial?: TutorialStep[];
}

export interface TutorialStep {
  id: string;
  /** Event that completes the step: start | unitSelected | unitMoved |
   *  unitAttacked | objectiveCaptured | turnEnded | battleWon. */
  event: string;
  textKey: string;
  /** Optional index into the scenario's initial player roster to highlight. */
  highlightUnitIndex?: number;
}

export interface CampaignNode {
  id: string;
  scenarioId: string;
  /** Node ids unlocked after winning this node. */
  next: string[];
  /** Entry nodes are available at campaign start. */
  entry?: boolean;
  /** Tutorial nodes never persist force damage into the campaign force. */
  tutorial?: boolean;
}

export interface CampaignEconomy {
  repairCostPerHp: number;
  trainingCost: number;
  recruit: Record<UnitClassId, number>;
}

export interface CampaignDef {
  id: string;
  nameKey: string;
  startPrestige: number;
  maxForceSize: number;
  economy: CampaignEconomy;
  nodes: CampaignNode[];
}

export interface ForceUnit {
  /** Stable per-campaign id so units persist between battles. */
  id: string;
  class: UnitClassId;
  hp: number;
  vet: number;
  /** 1-based formation number used for display names. */
  ordinal: number;
}

export interface CampaignState {
  campaignId: string;
  prestige: number;
  force: ForceUnit[];
  completedNodes: string[];
  /** Node the player is currently playing / clearing choices for. */
  currentNode: string | null;
  /** Objective nodes unlocked and not yet completed. */
  availableNodes: string[];
}

/** In-battle AI decision, applied sequentially with delays by the UI. */
export type AiAction =
  | { kind: "move"; unitId: string; path: Coord[] }
  | { kind: "attack"; unitId: string; targetId: string }
  | { kind: "wait"; unitId: string };

export interface BattleState {
  scenarioId: string;
  turn: number;
  activeTeam: Team;
  units: Unit[];
  objectives: Objective[];
  width: number;
  height: number;
  status: BattleStatus;
  log: LogEntry[];
  rngState: number;
  /** Increments whenever a rules event occurs, to drive UI animation. */
  eventSeq: number;
}

export interface AttackForecast {
  minDamage: number;
  maxDamage: number;
  counterMin: number;
  counterMax: number;
  canCounter: boolean;
  /** True when average damage would destroy the target. */
  likelyLethal: boolean;
}
