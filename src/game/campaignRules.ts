/**
 * Campaign flow: prestige economy, force persistence, objective selection.
 * Rules only — UI and storage live elsewhere. All costs come from
 * campaign.json (economy), never from code.
 */
import { loadContent, type GameContent } from "./content";
import type { CampaignDef, CampaignState, ForceUnit, UnitClassId } from "./types";

export interface CampaignActionResult {
  state: CampaignState;
  ok: boolean;
  /** Localization key for the failure reason (shown as a toast). */
  reasonKey?: string;
}

export function newCampaignState(def: CampaignDef): CampaignState {
  const entryNodes = def.nodes.filter((n) => n.entry).map((n) => n.id);
  return {
    campaignId: def.id,
    prestige: def.startPrestige,
    force: [],
    completedNodes: [],
    currentNode: null,
    availableNodes: entryNodes,
  };
}

export const nodeById = (def: CampaignDef, id: string) =>
  def.nodes.find((n) => n.id === id);

/** Prestige granted for a won battle (breakdown computed by the caller). */
export function grantPrestige(state: CampaignState, amount: number): CampaignState {
  return { ...state, prestige: state.prestige + amount };
}

/** Replace the force with battle survivors; destroyed units are gone. */
export function mergeSurvivors(state: CampaignState, survivors: ForceUnit[]): CampaignState {
  return { ...state, force: survivors };
}

/** Grant veterancy +1 to every force unit (bounded by balance.veterancyMax). */
export function applyTraining(state: CampaignState, def: CampaignDef, content: GameContent = loadContent()): CampaignActionResult {
  const cost = def.economy.trainingCost;
  if (state.prestige < cost) return { state, ok: false, reasonKey: "choice.cannotAfford" };
  if (state.force.length === 0) return { state, ok: false, reasonKey: "choice.noForce" };
  const max = content.balance.veterancyMax;
  const force = state.force.map((u) => ({
    ...u,
    vet: Math.min(max, u.vet + 1),
  }));
  return {
    state: { ...state, prestige: state.prestige - cost, force },
    ok: true,
  };
}

/** Field repairs: restore the whole force to full HP for a computed cost. */
export function repairCost(state: CampaignState, def: CampaignDef, content: GameContent = loadContent()): number {
  return state.force.reduce((sum, u) => {
    const full = content.unitClassById[u.class]?.hp ?? u.hp;
    return sum + Math.max(0, full - u.hp) * def.economy.repairCostPerHp;
  }, 0);
}

export function applyRepair(state: CampaignState, def: CampaignDef, content: GameContent = loadContent()): CampaignActionResult {
  const cost = repairCost(state, def, content);
  if (cost === 0) return { state, ok: false, reasonKey: "choice.noDamage" };
  if (state.prestige < cost) return { state, ok: false, reasonKey: "choice.cannotAfford" };
  const force = state.force.map((u) => ({
    ...u,
    hp: content.unitClassById[u.class]?.hp ?? u.hp,
  }));
  return { state: { ...state, prestige: state.prestige - cost, force }, ok: true };
}

export function applyRecruit(
  state: CampaignState,
  def: CampaignDef,
  classId: UnitClassId,
  content: GameContent = loadContent(),
): CampaignActionResult {
  if (state.force.length >= def.maxForceSize) {
    return { state, ok: false, reasonKey: "choice.forceFull" };
  }
  const cost = def.economy.recruit[classId];
  if (cost === undefined) return { state, ok: false, reasonKey: "choice.unknownClass" };
  if (state.prestige < cost) return { state, ok: false, reasonKey: "choice.cannotAfford" };
  if (!content.unitClassById[classId]) return { state, ok: false, reasonKey: "choice.unknownClass" };
  // New formations continue the class ordinal sequence.
  const ordinal = state.force.filter((u) => u.class === classId).length + 1;
  const unit: ForceUnit = {
    id: `f${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    class: classId,
    hp: content.unitClassById[classId].hp,
    vet: 0,
    ordinal,
  };
  return {
    state: { ...state, prestige: state.prestige - cost, force: [...state.force, unit] },
    ok: true,
  };
}

/** Commit a chosen objective node; unlocks stay as-is until it is won. */
export function selectNode(state: CampaignState, def: CampaignDef, nodeId: string): CampaignActionResult {
  if (!state.availableNodes.includes(nodeId)) {
    return { state, ok: false, reasonKey: "choice.lockedNode" };
  }
  if (!nodeById(def, nodeId)) return { state, ok: false, reasonKey: "choice.lockedNode" };
  return { state: { ...state, currentNode: nodeId }, ok: true };
}

/** After a won node: mark complete, unlock successors. */
export function completeNode(state: CampaignState, def: CampaignDef, nodeId: string): CampaignState {
  const node = nodeById(def, nodeId);
  if (!node) return state;
  const completed = state.completedNodes.includes(nodeId)
    ? state.completedNodes
    : [...state.completedNodes, nodeId];
  const unlocked = node.next.filter((n) => !completed.includes(n) && !state.availableNodes.includes(n));
  return {
    ...state,
    completedNodes: completed,
    availableNodes: [...state.availableNodes.filter((n) => n !== nodeId), ...unlocked],
    currentNode: state.currentNode === nodeId ? null : state.currentNode,
  };
}

/** Is the campaign finished (final node won, nothing left)? */
export const campaignFinished = (state: CampaignState, def: CampaignDef): boolean =>
  state.availableNodes.length === 0 && state.currentNode === null;
