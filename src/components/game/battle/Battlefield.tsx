"use client";

/**
 * The battlefield: scaled board of terrain tiles + unit tokens + overlays.
 * Computes move/attack highlights from the engine (reachableStops, inRange)
 * but owns no rules itself.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useBattleStore } from "@/state/battleStore";
import { inRange } from "@/game/combat";
import { key as coordKey } from "@/game/grid";
import { reachableStops } from "@/game/movement";
import { tilePx, tokens } from "@/theme/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tile } from "./Tile";
import { UnitToken } from "./UnitToken";

export function Battlefield() {
  const session = useBattleStore((s) => s.session);
  const clickTile = useBattleStore((s) => s.clickTile);
  const setCursor = useBattleStore((s) => s.setCursor);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  const tile = tilePx(isMobile);
  const state = session?.state;
  const ctx = session?.ctx;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moveSet = useMemo(() => {
    if (!session || !ctx || !state || state.activeTeam !== "player") return null;
    const sel = state.units.find((u) => u.id === session.selectedId);
    if (!sel || sel.attacked || sel.moved) return null;
    const cls = ctx.content.unitClassById[sel.class];
    const reach = reachableStops(ctx.move, sel, state.units, cls.move);
    reach.tiles.delete(coordKey(sel.x, sel.y));
    return reach;
  }, [session, ctx, state]);

  const attackableIds = useMemo(() => {
    if (!session || !ctx || !state || state.activeTeam !== "player") return new Set<string>();
    const sel = state.units.find((u) => u.id === session.selectedId);
    if (!sel || sel.attacked) return new Set<string>();
    return new Set(
      state.units.filter((u) => u.team === "enemy" && inRange(ctx.combat, sel, u)).map((u) => u.id),
    );
  }, [session, ctx, state]);

  const objectiveOwnerByTile = useMemo(() => {
    const map = new Map<string, "player" | "enemy" | "neutral">();
    for (const o of state?.objectives ?? []) map.set(coordKey(o.x, o.y), o.owner);
    return map;
  }, [state?.objectives]);

  const ordinals = useMemo(() => {
    // enemy units numbered per class for log clarity
    const counters: Record<string, number> = {};
    const map = new Map<string, number>();
    for (const u of state?.units ?? []) {
      const k = `${u.team}:${u.class}`;
      counters[k] = (counters[k] ?? 0) + 1;
      map.set(u.id, counters[k]);
    }
    return map;
  }, [state?.units]);

  if (!session || !state || !ctx) return null;

  const boardW = state.width * tile;
  const boardH = state.height * tile;
  const scale = containerW > 0 ? Math.min(1, containerW / boardW) : 1;
  const cursor = session.cursor;
  const sel = state.units.find((u) => u.id === session.selectedId) ?? null;

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        role="grid"
        aria-label="Battlefield"
        className="relative rounded-[var(--im-radius-lg)]"
        style={{
          width: boardW * scale,
          height: boardH * scale,
          margin: "0 auto",
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left rounded-[var(--im-radius-lg)]"
          style={{
            width: boardW,
            height: boardH,
            transform: `scale(${scale})`,
            boxShadow: `0 0 0 2px var(--im-color-lineStrong), 0 10px 30px rgba(0,0,0,0.45)`,
            background: "var(--im-color-bg)",
          }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${state.width}, ${tile}px)` }}
          >
            {Array.from({ length: state.width * state.height }).map((_, i) => {
              const x = i % state.width;
              const y = Math.floor(i / state.width);
              const k = coordKey(x, y);
              const inMove = moveSet?.tiles.has(k) ?? false;
              return (
                <Tile
                  key={k}
                  x={x}
                  y={y}
                  size={tile}
                  terrain={ctx.grid[y][x]}
                  objectiveOwner={objectiveOwnerByTile.get(k) ?? null}
                  onTileClick={clickTile}
                  onTileHover={(hx, hy) => {
                    setCursor({ x: hx, y: hy });
                    if (useBattleStore.getState().session?.invalidKey) {
                      useBattleStore.getState().dismissInvalid();
                    }
                  }}
                  overlay={{
                    inMoveRange: inMove,
                    isPathDest: inMove && cursor.x === x && cursor.y === y,
                    attackable: attackableIds.has(state.units.find((u) => u.x === x && u.y === y)?.id ?? ""),
                    isCursor: cursor.x === x && cursor.y === y,
                    isSelectedUnitTile: !!sel && sel.x === x && sel.y === y,
                  }}
                />
              );
            })}
          </div>
          <div className="pointer-events-none absolute inset-0">
            {state.units.map((u) => {
              const cls = ctx.content.unitClassById[u.class];
              return (
                <UnitToken
                  key={u.id}
                  unit={u}
                  cls={cls}
                  size={tile}
                  selected={session.selectedId === u.id}
                  aiHighlighted={session.aiHighlightUnitId === u.id}
                  nameOrdinal={u.nameOrdinal ?? ordinals.get(u.id) ?? 1}
                />
              );
            })}
            {session.lastAttack && (
              <div
                key={session.lastAttack.seq}
                className="im-flash absolute"
                style={{
                  left: session.lastAttack.x * tile,
                  top: session.lastAttack.y * tile,
                  width: tile,
                  height: tile,
                  borderRadius: tokens.radius.unit,
                  backgroundColor: "var(--im-color-range-attack)",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
