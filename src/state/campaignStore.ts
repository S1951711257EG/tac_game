/**
 * Campaign session store: owns the CampaignState, the between-battle choice
 * screen actions (repair / train / recruit / pick objective) and handoff to
 * the battle store. All rules live in game/campaignRules.ts.
 */
import { create } from "zustand";
import { loadContent } from "@/game/content";
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
  selectNode,
} from "@/game/campaignRules";
import { clearSave, loadSave, writeSave } from "@/game/save";
import { ContentError } from "@/game/content";
import { useAppStore } from "./appStore";
import { useBattleStore } from "./battleStore";
import type { CampaignDef, CampaignState, UnitClassId } from "@/game/types";

// Content is validated at boot; a failure is captured here (instead of
// crashing the module import) so AppShell can render a diagnostics screen.
let bootDef: CampaignDef | null = null;
export let bootContentError: string[] | null = null;
try {
  bootDef = loadContent().campaign;
} catch (err) {
  bootContentError = err instanceof ContentError ? err.issues : [String(err)];
}

export interface CampaignStore {
  def: CampaignDef;
  campaign: CampaignState | null;
  /** True right after returning from a won battle (highlights the choice panel). */
  afterBattle: boolean;
  startNew: () => void;
  continueSaved: () => void;
  pickNode: (nodeId: string) => void;
  launchCurrentNode: () => void;
  doRepair: () => string | null;
  doTrain: () => string | null;
  doRecruit: (classId: UnitClassId) => string | null;
  /** Called by the battle store when a battle ends and the player continues. */
  finishBattle: (won: boolean, earnedPrestige: number, survivors: CampaignState["force"]) => void;
  restartCampaign: () => void;
  quitToMenu: () => void;
  dismissAfterBattleFlag: () => void;
}

export const useCampaignStore = create<CampaignStore>()((set, get) => ({
  def: bootDef as CampaignDef,
  campaign: null,
  afterBattle: false,

  startNew: () => {
    const campaign = newCampaignState(get().def);
    set({ campaign, afterBattle: false });
    writeSave({ version: 1, savedAt: Date.now(), campaign, battle: null });
    useAppStore.getState().setView("campaign");
  },

  continueSaved: () => {
    const save = loadSave();
    if (!save) return;
    set({ campaign: save.campaign, afterBattle: false });
    if (save.battle) {
      useBattleStore.getState().resume(save.battle);
      useAppStore.getState().setView("battle");
    } else {
      useAppStore.getState().setView("campaign");
    }
  },

  pickNode: (nodeId) => {
    const { campaign, def } = get();
    if (!campaign) return;
    const res = selectNode(campaign, def, nodeId);
    if (res.ok) set({ campaign: res.state });
    persist(get());
  },

  launchCurrentNode: () => {
    const { campaign, def } = get();
    if (!campaign || !campaign.currentNode) return;
    const node = nodeById(def, campaign.currentNode);
    if (!node) return;
    useBattleStore.getState().start(node.id, node.scenarioId, campaign.force);
    useAppStore.getState().setView("battle");
  },

  doRepair: () => {
    const { campaign, def } = get();
    if (!campaign) return null;
    const res = applyRepair(campaign, def);
    if (res.ok) set({ campaign: res.state });
    persist(get());
    return res.ok ? null : (res.reasonKey ?? null);
  },

  doTrain: () => {
    const { campaign, def } = get();
    if (!campaign) return null;
    const res = applyTraining(campaign, def);
    if (res.ok) set({ campaign: res.state });
    persist(get());
    return res.ok ? null : (res.reasonKey ?? null);
  },

  doRecruit: (classId) => {
    const { campaign, def } = get();
    if (!campaign) return null;
    const res = applyRecruit(campaign, def, classId);
    if (res.ok) set({ campaign: res.state });
    persist(get());
    return res.ok ? null : (res.reasonKey ?? null);
  },

  finishBattle: (won, earnedPrestige, survivors) => {
    const { campaign, def } = get();
    if (!campaign || !campaign.currentNode) {
      set({ afterBattle: false });
      useAppStore.getState().setView("campaign");
      return;
    }
    const node = nodeById(def, campaign.currentNode);
    let next = campaign;
    if (won) {
      next = grantPrestige(next, earnedPrestige);
      if (node && !node.tutorial) next = mergeSurvivors(next, survivors);
      next = completeNode(next, def, campaign.currentNode);
      set({ campaign: next, afterBattle: true });
    } else {
      set({ campaign: next, afterBattle: false });
    }
    persist(get());
    useAppStore.getState().setView("campaign");
  },

  restartCampaign: () => {
    clearSave();
    set({ campaign: null, afterBattle: false });
    useBattleStore.getState().reset();
    useAppStore.getState().setView("menu");
  },

  quitToMenu: () => {
    persist(get());
    useAppStore.getState().setView("menu");
  },

  dismissAfterBattleFlag: () => set({ afterBattle: false }),
}));

function persist(store: { campaign: CampaignState | null }): void {
  const { campaign } = store;
  if (!campaign) return;
  const existing = loadSave();
  writeSave({
    version: 1,
    savedAt: Date.now(),
    campaign,
    battle: existing?.battle ?? null,
  });
}

export { campaignFinished };
