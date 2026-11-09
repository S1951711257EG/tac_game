/**
 * Battle turn runner: applies committed state changes, executes the AI plan
 * step-by-step (timers) or instantly (skip), tutorial progression, results
 * and snapshot persistence. Sequencing only — rules live in src/game.
 */
import { applyAttack, applyMove, endTurn, type BattleEvent } from "@/game/battleActions";
import { planAiTurn } from "@/game/ai";
import { playSfx } from "@/audio/sfx";
import { loadSave, writeSave } from "@/game/save";
import { newCampaignState } from "@/game/campaignRules";
import { loadContent } from "@/game/content";
import { useAppStore } from "./appStore";
import { useCampaignStore } from "./campaignStore";
import type { BattleSession, BattleResult, SessionIo } from "./battleSession";
import type { BattleState, ScenarioDef } from "@/game/types";

let aiTimer: ReturnType<typeof setTimeout> | null = null;
export const cancelAi = (): void => {
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = null;
};

export function commit(io: SessionIo, state: BattleState, events: BattleEvent[]): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess) return;
  let next: BattleSession = { ...sess, state };
  for (const ev of events) {
    if (ev.type === "unitMoved") {
      next = { ...next, lastMove: { unitId: ev.unitId, path: ev.path, seq: state.eventSeq } };
      playSfx("move");
    } else if (ev.type === "unitAttacked") {
      const def = state.units.find((u) => u.id === ev.defenderId);
      next = { ...next, lastAttack: { x: def?.x ?? -1, y: def?.y ?? -1, seq: state.eventSeq } };
      playSfx("attack");
    } else if (ev.type === "objectiveCaptured") {
      playSfx("capture");
    } else if (ev.type === "battleEnded") {
      next = { ...next, result: computeResult(state, sess.scenario) };
      playSfx(ev.status === "victory" ? "victory" : "defeat");
    }
  }
  io.set({ session: next });
  if (next.result) tutorialEvent(io, "battleWon");
  persistSnapshot(next);
}

export function tutorialEvent(io: SessionIo, event: string): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess || sess.tutorialIndex < 0) return;
  const step = sess.tutorialSteps[sess.tutorialIndex];
  if (step && step.event === event) {
    io.set({ session: { ...sess, tutorialIndex: sess.tutorialIndex + 1 } });
  }
}

export function computeResult(state: BattleState, scenario: ScenarioDef): BattleResult {
  const owned = state.objectives.filter((o) => o.owner === "player").length;
  const objectiveBonus = owned * scenario.rewards.perObjective;
  const turnBonus =
    Math.max(0, scenario.turnLimit - state.turn + 1) * scenario.rewards.perRemainingTurn;
  return {
    won: state.status === "victory",
    prestige: scenario.rewards.prestige + objectiveBonus + turnBonus,
    objectiveBonus,
    turnBonus,
  };
}

export function persistSnapshot(sess: BattleSession | null): void {
  if (!sess) return;
  const existing = loadSave();
  const campaign =
    existing?.campaign ??
    useCampaignStore.getState().campaign ??
    newCampaignState(loadContent().campaign);
  writeSave({
    version: 1,
    savedAt: Date.now(),
    campaign,
    battle: sess.state.status === "active" ? sess.state : null,
  });
}

// --- AI turn execution -----------------------------------------------------

export function beginAiTurn(io: SessionIo): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess || sess.state.status !== "active" || sess.state.activeTeam !== "enemy") return;
  const plan = planAiTurn(sess.state, sess.ctx);
  io.set({ session: { ...sess, aiActive: true, aiPlan: plan, aiPlanIndex: 0, selectedId: null } });
  scheduleAiStep(io);
}

function scheduleAiStep(io: SessionIo): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess || sess.state.status !== "active") {
    finishAiTurn(io);
    return;
  }
  const wait = useAppStore.getState().settings.reduceMotion ? 90 : 550;
  aiTimer = setTimeout(() => aiStep(io), wait);
}

function executeAiAction(io: SessionIo, sess: BattleSession, index: number): BattleSession | null {
  const act = sess.aiPlan[index];
  if (act.kind === "move") {
    const res = applyMove(sess.state, sess.ctx, act.unitId, act.path);
    if (res.ok) {
      commit(io, res.state, res.events);
      const cur = io.get().session as BattleSession | null;
      return cur ? { ...cur, aiHighlightUnitId: act.unitId } : null;
    }
  } else if (act.kind === "attack") {
    const res = applyAttack(sess.state, sess.ctx, act.unitId, act.targetId);
    if (res.ok) {
      commit(io, res.state, res.events);
      const cur = io.get().session as BattleSession | null;
      return cur ? { ...cur, aiHighlightUnitId: act.unitId } : null;
    }
  }
  return null; // action became illegal (target died, etc.) — skip it
}

function aiStep(io: SessionIo): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess || sess.state.status !== "active" || sess.state.activeTeam !== "enemy") {
    finishAiTurn(io);
    return;
  }
  if (sess.aiPlanIndex >= sess.aiPlan.length) {
    finishAiTurn(io);
    return;
  }
  const updated = executeAiAction(io, sess, sess.aiPlanIndex);
  const cur = io.get().session as BattleSession | null;
  if (!cur) return;
  const advanced: BattleSession = updated
    ? { ...cur, aiPlanIndex: sess.aiPlanIndex + 1 }
    : { ...cur, aiPlanIndex: sess.aiPlanIndex + 1 };
  io.set({ session: advanced });
  if (advanced.state.status !== "active") return; // battle decided mid-turn
  scheduleAiStep(io);
}

export function skipAi(io: SessionIo): void {
  let sess = io.get().session as BattleSession | null;
  if (!sess || !sess.aiActive || sess.state.status !== "active") return;
  while (sess.aiPlanIndex < sess.aiPlan.length && sess.state.status === "active") {
    const updated = executeAiAction(io, sess, sess.aiPlanIndex);
    const cur = io.get().session as BattleSession | null;
    if (!cur) return;
    sess = { ...cur, aiPlanIndex: sess.aiPlanIndex + 1 };
    io.set({ session: sess });
  }
  cancelAi();
  finishAiTurn(io);
}

export function finishAiTurn(io: SessionIo): void {
  const sess = io.get().session as BattleSession | null;
  if (!sess) return;
  if (sess.state.status !== "active" || sess.state.activeTeam !== "enemy") {
    io.set({ session: { ...sess, aiActive: false, aiHighlightUnitId: null } });
    return;
  }
  const res = endTurn(sess.state, sess.ctx);
  if (!res.ok) {
    io.set({ session: { ...sess, aiActive: false } });
    return;
  }
  commit(io, res.state, res.events);
  const cur = io.get().session as BattleSession | null;
  if (cur) io.set({ session: { ...cur, aiActive: false, aiHighlightUnitId: null } });
}
