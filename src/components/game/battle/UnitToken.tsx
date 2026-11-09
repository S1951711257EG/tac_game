"use client";

/**
 * Unit token: team plate, class art, HP pips, veterancy chevrons, acted
 * state. Absolutely positioned over the board; position changes animate via
 * transform transition.
 */
import { memo } from "react";
import { assetUrl } from "./Tile";
import { IconChevron } from "@/components/game/common/GameIcons";
import type { Unit, UnitClassDef } from "@/game/types";

export interface UnitTokenProps {
  unit: Unit;
  cls: UnitClassDef;
  size: number;
  selected: boolean;
  aiHighlighted: boolean;
  nameOrdinal: number;
}

function UnitTokenInner({ unit, cls, size, selected, aiHighlighted, nameOrdinal }: UnitTokenProps) {
  const isPlayer = unit.team === "player";
  const plate = isPlayer ? "var(--im-color-unit-playerPlate)" : "var(--im-color-unit-enemyPlate)";
  const ring = isPlayer ? "var(--im-color-player)" : "var(--im-color-enemy)";
  const hpFrac = Math.max(0, Math.min(1, unit.hp / cls.hp));
  const hpColor =
    hpFrac > 0.6 ? "var(--im-color-hp-ok)" : hpFrac > 0.3 ? "var(--im-color-hp-mid)" : "var(--im-color-hp-low)";
  const pad = Math.max(2, size * 0.08);
  const done = unit.attacked || unit.hp <= 0;

  return (
    <div
      data-testid={`unit-${unit.id}`}
      className="absolute im-unit"
      style={{
        width: size - pad * 2,
        height: size - pad * 2,
        transform: `translate(${unit.x * size + pad}px, ${unit.y * size + pad}px)`,
        transition: "transform var(--im-motion-base) ease-out",
        zIndex: 10,
      }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center rounded-[var(--im-radius-unit)]"
        style={{
          background: `linear-gradient(160deg, ${plate}, var(--im-color-bgPanelRaised))`,
          boxShadow: selected
            ? `0 0 0 2.5px var(--im-color-range-selected), 0 2px 6px rgba(0,0,0,0.55)`
            : aiHighlighted
              ? `0 0 0 2.5px var(--im-color-accent), 0 2px 6px rgba(0,0,0,0.55)`
              : `0 0 0 2px ${ring}, 0 2px 5px rgba(0,0,0,0.5)`,
          opacity: done ? 0.55 : 1,
          filter: done ? "grayscale(0.85)" : "none",
        }}
      >
<img
          src={assetUrl(cls.icon)}
          alt=""
          draggable={false}
          className="h-[78%] w-[78%] object-contain"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        {/* veterancy chevrons */}
        {unit.vet > 0 && (
          <div className="absolute left-0.5 top-0.5 flex" style={{ color: "var(--im-color-accent)" }}>
            {Array.from({ length: unit.vet }).map((_, i) => (
              <IconChevron key={i} width={size * 0.2} height={size * 0.2} />
            ))}
          </div>
        )}
        {/* HP number badge (team shape + number, never color alone) */}
        <div
          className="absolute -right-1 -top-1 rounded-full font-mono leading-none"
          style={{
            padding: size * 0.04,
            fontSize: Math.max(8, size * 0.19),
            backgroundColor: "var(--im-color-bgOverlay)",
            color: hpColor,
            boxShadow: `0 0 0 1.5px ${hpColor}`,
          }}
        >
          {unit.hp}
        </div>
        {/* HP bar */}
        <div
          className="absolute bottom-0 left-1 right-1 rounded-sm overflow-hidden"
          style={{ height: Math.max(3, size * 0.07), backgroundColor: "rgba(0,0,0,0.55)" }}
        >
          <div style={{ width: `${hpFrac * 100}%`, height: "100%", backgroundColor: hpColor }} />
        </div>
        {/* formation ordinal for readability */}
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-sm px-1 font-mono"
          style={{
            fontSize: Math.max(7, size * 0.16),
            backgroundColor: "var(--im-color-bgOverlay)",
            color: "var(--im-color-inkDim)",
          }}
        >
          {nameOrdinal}
        </div>
      </div>
    </div>
  );
}

export const UnitToken = memo(UnitTokenInner);
