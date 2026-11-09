"use client";

/** Keyboard controls for the battle screen (arrows/WASD, Enter, Esc, Tab, E). */
import { useEffect } from "react";
import { useBattleStore } from "@/state/battleStore";
import type { Coord } from "@/game/types";

const KEY_DIRS: Record<string, Coord> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
};

export function useBattleKeyboard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const store = useBattleStore.getState();
      const sess = store.session;
      if (!sess || sess.result || !sess.introSeen) return;
      const dir = KEY_DIRS[e.key] ?? (e.key === "W" ? KEY_DIRS.w : e.key === "S" ? KEY_DIRS.s : e.key === "A" ? KEY_DIRS.a : e.key === "D" ? KEY_DIRS.d : null);
      if (dir) {
        e.preventDefault();
        const x = Math.min(sess.state.width - 1, Math.max(0, sess.cursor.x + dir.x));
        const y = Math.min(sess.state.height - 1, Math.max(0, sess.cursor.y + dir.y));
        store.setCursor({ x, y });
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        store.clickTile(sess.cursor.x, sess.cursor.y);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        store.select(null);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        store.cycleUnit();
        return;
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (sess.aiActive) store.skipAi();
        else store.playerEndTurn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
