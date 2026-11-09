/**
 * Battle session store: owns the in-progress battle session, player action
 * dispatch (shared by mouse & keyboard) and lifecycle. AI turn execution and
 * commit/persistence live in battleRunner.ts; all rules live in src/game.
 */
import { create } from "zustand";
import { loadContent } from "@/game/content";
import { makeBattleCtx } from "@/game/battleCtx";
import { createBattleState } from "@/game/battleSetup";
import { applyAttack, applyMove, endTurn, extractForce, readyUnits } from "@/game/battleActions";
import { pathTo, reachableStops } from "@/game/movement";
import { inRange } from "@/game/combat";
import { key as coordKey } from "@/game/grid";
import { randomSeed } from "@/game/rng";
import { playSfx } from "@/audio/sfx";
import { useAppStore } from "./appStore";
import { useCampaignStore } from "./campaignStore";
import {
  beginAiTurn,
  cancelAi,
  commit,
  persistSnapshot,
  skipAi as runnerSkipAi,
  tutorialEvent,
} from "./battleRunner";
import type { BattleSession, SessionIo } from "./battleSession";
import type { Coord, ForceUnit } from "@/game/types";

interface BattleStore {
  session: BattleSession | null;
  start: (nodeId: string, scenarioId: string, force: ForceUnit[]) => void;
  resume: (saved: BattleSession["state"]) => void;
  reset: () => void;
  select: (unitId: string | null) => void;
  setCursor: (coord: Coord) => void;
  clickTile: (x: number, y: number) => void;
  cycleUnit: () => void;
  playerEndTurn: () => void;
  skipAi: () => void;
  dismissInvalid: () => void;
  markIntroSeen: () => void;
  continueResult: () => void;
  retry: () => void;
}

export const useBattleStore = create<BattleStore>()((set, get) => {
  const io = (): SessionIo => ({ set: (partial) => set(partial), get: () => get() });

  return {
    session: null,

    start: (nodeId, scenarioId, force) => {
      cancelAi();
      const content = loadContent();
      const scenario = content.scenarioById[scenarioId];
      if (!scenario) {
        useAppStore.getState().setContentError([
          `campaign: unknown scenario '${scenarioId}' for node '${nodeId}'`,
        ]);
        return;
      }
      const state = createBattleState({
        scenario,
        campaignForce: scenario.spawnPlayerFromCampaign ? force : null,
        seed: randomSeed(),
        content,
      });
      const first = state.units.find((u) => u.team === "player");
      set({
        session: {
          nodeId,
          scenario,
          state,
          ctx: makeBattleCtx(scenario, content),
          selectedId: null,
          cursor: first ? { x: first.x, y: first.y } : { x: 0, y: 0 },
          aiActive: false,
          aiPlan: [],
          aiPlanIndex: 0,
          aiHighlightUnitId: null,
          introSeen: false,
          result: null,
          invalidKey: null,
          tutorialSteps: scenario.tutorial ?? [],
          tutorialIndex: scenario.tutorial ? 0 : -1,
          lastMove: null,
          lastAttack: null,
        },
      });
      playSfx("select");
      persistSnapshot(get().session);
    },

    resume: (saved) => {
      cancelAi();
      const content = loadContent();
      const scenario = content.scenarioById[saved.scenarioId];
      if (!scenario) return;
      set({
        session: {
          nodeId: null,
          scenario,
          state: saved,
          ctx: makeBattleCtx(scenario, content),
          selectedId: null,
          cursor: { x: 0, y: 0 },
          aiActive: false,
          aiPlan: [],
          aiPlanIndex: 0,
          aiHighlightUnitId: null,
          introSeen: true,
          result: null,
          invalidKey: null,
          tutorialSteps: [],
          tutorialIndex: -1,
          lastMove: null,
          lastAttack: null,
        },
      });
    },

    reset: () => {
      cancelAi();
      set({ session: null });
    },

    select: (unitId) => {
      const sess = get().session;
      if (!sess || sess.state.status !== "active") return;
      const unit = unitId ? sess.state.units.find((u) => u.id === unitId) : null;
      if (unit && unit.team === "player" && sess.state.activeTeam === "player") {
        set({
          session: { ...sess, selectedId: unit.id, cursor: { x: unit.x, y: unit.y }, invalidKey: null },
        });
        tutorialEvent(io(), "unitSelected");
      } else {
        set({ session: { ...sess, selectedId: null } });
      }
    },

    setCursor: (coord) => {
      const sess = get().session;
      if (sess) set({ session: { ...sess, cursor: coord } });
    },

    clickTile: (x, y) => {
      const sess = get().session;
      if (!sess || sess.state.status !== "active" || sess.state.activeTeam !== "player") return;
      const target = sess.state.units.find((u) => u.x === x && u.y === y);
      const sel = sess.selectedId ? sess.state.units.find((u) => u.id === sess.selectedId) : null;

      if (sel) {
        if (target && target.team === "enemy" && inRange(sess.ctx.combat, sel, target)) {
          applyPlayerAttack(set, get, target.id);
          return;
        }
        if (!target && !sel.attacked && !sel.moved) {
          const cls = sess.ctx.content.unitClassById[sel.class];
          const reach = reachableStops(sess.ctx.move, sel, sess.state.units, cls.move);
          const tile = reach.tiles.get(coordKey(x, y));
          if (tile) {
            applyPlayerMove(set, get, pathTo(reach, tile.coord));
            return;
          }
        }
      }
      if (target && target.team === "player") {
        get().select(target.id);
        return;
      }
      // Nothing legal matched: explain why (and move the cursor there).
      let reason = "action.noUnit";
      if (sel && !sel.attacked) {
        if (sel.moved) reason = "action.alreadyMoved";
        else if (target && target.team === "enemy") reason = "action.outOfRange";
        else {
          const cost = sess.ctx.grid[y]?.[x]?.costs[sel.class];
          reason = cost === null || cost === undefined ? "action.impassable" : "action.outOfRange";
        }
      }
      set({
        session: { ...sess, cursor: { x, y }, invalidKey: sel ? reason : null },
      });
    },

    cycleUnit: () => {
      const sess = get().session;
      if (!sess || sess.state.activeTeam !== "player") return;
      const ready = readyUnits(sess.state, "player");
      if (!ready.length) return;
      const idx = ready.findIndex((u) => u.id === sess.selectedId);
      const next = ready[(idx + 1) % ready.length];
      get().select(next.id);
    },

    playerEndTurn: () => {
      const sess = get().session;
      if (!sess || sess.state.status !== "active" || sess.state.activeTeam !== "player") return;
      const res = endTurn(sess.state, sess.ctx);
      if (!res.ok) return;
      tutorialEvent(io(), "turnEnded");
      commit(io(), res.state, res.events);
      beginAiTurn(io());
    },

    skipAi: () => runnerSkipAi(io()),

    dismissInvalid: () => {
      const sess = get().session;
      if (sess && sess.invalidKey) set({ session: { ...sess, invalidKey: null } });
    },

    markIntroSeen: () => {
      const sess = get().session;
      if (sess) {
        set({ session: { ...sess, introSeen: true } });
        tutorialEvent(io(), "start");
      }
    },

    continueResult: () => {
      const sess = get().session;
      if (!sess || !sess.result) return;
      const survivors = extractForce(sess.state);
      useCampaignStore.getState().finishBattle(sess.result.won, sess.result.prestige, survivors);
      cancelAi();
      set({ session: null });
    },

    retry: () => {
      const sess = get().session;
      if (!sess) return;
      const cs = useCampaignStore.getState().campaign;
      get().start(sess.nodeId ?? cs?.currentNode ?? "", sess.scenario.id, cs?.force ?? []);
    },
  };
});

function applyPlayerMove(
  set: (partial: { session: BattleSession | null }) => void,
  get: () => BattleStore,
  path: Coord[],
): void {
  const sess = get().session;
  if (!sess || !sess.selectedId) return;
  const res = applyMove(sess.state, sess.ctx, sess.selectedId, path);
  const io: SessionIo = { set: (partial) => set(partial), get: () => get() };
  if (!res.ok) {
    set({ session: { ...sess, invalidKey: res.reasonKey ?? "action.badPath" } });
    playSfx("error");
    return;
  }
  tutorialEvent(io, "unitMoved");
  commit(io, res.state, res.events);
}

function applyPlayerAttack(
  set: (partial: { session: BattleSession | null }) => void,
  get: () => BattleStore,
  targetId: string,
): void {
  const sess = get().session;
  if (!sess || !sess.selectedId) return;
  const res = applyAttack(sess.state, sess.ctx, sess.selectedId, targetId);
  const io: SessionIo = { set: (partial) => set(partial), get: () => get() };
  if (!res.ok) {
    set({ session: { ...sess, invalidKey: res.reasonKey ?? "action.outOfRange" } });
    playSfx("error");
    return;
  }
  tutorialEvent(io, "unitAttacked");
  commit(io, res.state, res.events);
  // Quality of life: hop to the next unit when the attacker is spent.
  const attacker = res.state.units.find((u) => u.id === sess.selectedId);
  if (!attacker || attacker.attacked) {
    const nextReady = readyUnits(res.state, "player")[0];
    const cur = get().session;
    if (cur) {
      set({
        session: nextReady
          ? { ...cur, selectedId: nextReady.id, cursor: { x: nextReady.x, y: nextReady.y } }
          : { ...cur, selectedId: null },
      });
    }
  }
}
