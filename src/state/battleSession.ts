/**
 * Battle session types shared by the store and the AI runner.
 */
import type { AiAction, BattleState, Coord, ScenarioDef, TutorialStep } from "@/game/types";
import type { BattleCtx } from "@/game/battleCtx";

export interface BattleResult {
  won: boolean;
  prestige: number;
  objectiveBonus: number;
  turnBonus: number;
}

export interface BattleSession {
  nodeId: string | null;
  scenario: ScenarioDef;
  state: BattleState;
  ctx: BattleCtx;
  selectedId: string | null;
  cursor: Coord;
  aiActive: boolean;
  aiPlan: AiAction[];
  aiPlanIndex: number;
  aiHighlightUnitId: string | null;
  introSeen: boolean;
  result: BattleResult | null;
  invalidKey: string | null;
  tutorialSteps: TutorialStep[];
  tutorialIndex: number;
  lastMove: { unitId: string; path: Coord[]; seq: number } | null;
  lastAttack: { x: number; y: number; seq: number } | null;
}

/** Narrow setter/getter pair passed to runner helpers. */
export interface SessionIo {
  set: (partial: { session: BattleSession | null }) => void;
  get: () => { session: BattleSession | null };
}
