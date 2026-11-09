"use client";

/**
 * Single battlefield tile: terrain art with token-colored fallback, move/attack
 * overlays, cursor, objective marker. Presentation only — all legality comes
 * precomputed via props from the engine.
 */
import { memo } from "react";
import { IconCrosshair, IconFlag } from "@/components/game/common/GameIcons";
import type { TerrainDef } from "@/game/types";

export const assetUrl = (name: string): string => `/assets/img/${name}.jpg`;

export interface TileOverlay {
  inMoveRange: boolean;
  isPathDest: boolean;
  attackable: boolean;
  isCursor: boolean;
  isSelectedUnitTile: boolean;
}

export interface TileProps {
  x: number;
  y: number;
  size: number;
  terrain: TerrainDef;
  objectiveOwner: "player" | "enemy" | "neutral" | null;
  overlay: TileOverlay;
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number, y: number) => void;
}

function TileInner({ x, y, size, terrain, objectiveOwner, overlay, onTileClick, onTileHover }: TileProps) {
  const bgVar = `var(--im-${terrain.themeRole.replace(/\./g, "-")})`;
  return (
    <div
      role="gridcell"
      aria-label={terrain.nameKey}
      onClick={() => onTileClick(x, y)}
      onMouseEnter={() => onTileHover(x, y)}
      className="relative select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: bgVar,
        backgroundImage: `url(${assetUrl(`terrain-${terrain.id}`)})`,
        backgroundSize: "cover",
        boxShadow: "inset 0 0 0 1px rgba(8,10,12,0.35)",
        cursor: "pointer",
      }}
    >
      {overlay.inMoveRange && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: "var(--im-color-range-move)" }}
          data-testid={`move-${x}-${y}`}
        >
          <div className="rounded-full" style={{ width: size * 0.16, height: size * 0.16, backgroundColor: "var(--im-color-range-moveEdge)" }} />
        </div>
      )}
      {overlay.attackable && (
        <div
          className="absolute inset-0 flex items-start justify-end"
          style={{ boxShadow: "inset 0 0 0 3px var(--im-color-range-attack)" }}
          data-testid={`attack-${x}-${y}`}
        >
          <span style={{ color: "var(--im-color-range-attack)", margin: 2, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.8))" }}>
            <IconCrosshair width={Math.max(12, size * 0.26)} height={Math.max(12, size * 0.26)} />
          </span>
        </div>
      )}
      {objectiveOwner && (
        <div
          key={objectiveOwner}
          className="absolute flex items-center justify-center rounded-sm im-pop"
          style={{
            left: 2,
            top: 2,
            width: size * 0.34,
            height: size * 0.34,
            color:
              objectiveOwner === "player"
                ? "var(--im-color-player)"
                : objectiveOwner === "enemy"
                  ? "var(--im-color-enemy)"
                  : "var(--im-color-neutral)",
            backgroundColor: "var(--im-color-bgOverlay)",
            boxShadow: `inset 0 0 0 1.5px ${
              objectiveOwner === "player"
                ? "var(--im-color-player)"
                : objectiveOwner === "enemy"
                  ? "var(--im-color-enemy)"
                  : "var(--im-color-neutral)"
            }`,
          }}
        >
          <IconFlag width={size * 0.22} height={size * 0.22} />
        </div>
      )}
      {overlay.isPathDest && (
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 3px var(--im-color-range-path)" }} />
      )}
      {overlay.isSelectedUnitTile && (
        <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 2px var(--im-color-range-selected)" }} />
      )}
      {overlay.isCursor && (
        <div className="absolute inset-0 im-cursor" style={{ boxShadow: "inset 0 0 0 2px var(--im-color-range-cursor)" }} />
      )}
    </div>
  );
}

export const Tile = memo(TileInner);
