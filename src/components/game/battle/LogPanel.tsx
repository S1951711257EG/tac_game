"use client";

/** Battle log (localized, unit tokens resolved) + objectives tracker. */
import { useT } from "@/i18n/useT";
import { resolveUnitToken } from "@/i18n/i18n";
import { IconFlag } from "@/components/game/common/GameIcons";
import type { BattleState } from "@/game/types";

export function LogPanel({ state }: { state: BattleState }) {
  const t = useT();
  const entries = [...state.log].slice(-12).reverse();
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[var(--im-radius-md)]" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--im-color-inkFaint)" }}>
        {t("battle.log")}
      </div>
      <div className="im-scroll min-h-24 flex-1 overflow-y-auto p-2 text-xs leading-relaxed" data-testid="battle-log">
        {entries.length === 0 && (
          <div style={{ color: "var(--im-color-inkFaint)" }}>—</div>
        )}
        {entries.map((e) => {
          const params = e.params ? { ...e.params } : undefined;
          const actor = params && typeof params.actor === "string" ? resolveUnitToken(params.actor, t) : params?.actor;
          const target = params && typeof params.target === "string" ? resolveUnitToken(params.target, t) : params?.target;
          const unit = params && typeof params.unit === "string" ? resolveUnitToken(params.unit, t) : params?.unit;
          const resolved: Record<string, string | number> = { ...(params ?? {}) };
          if (actor !== undefined) resolved.actor = actor;
          if (target !== undefined) resolved.target = target;
          if (unit !== undefined) resolved.unit = unit;
          return (
            <div
              key={e.id}
              className="mb-1 rounded-sm border-l-2 px-2 py-1"
              style={{
                borderColor: e.team === "player" ? "var(--im-color-player)" : e.team === "enemy" ? "var(--im-color-enemy)" : "var(--im-color-line)",
                color: "var(--im-color-inkDim)",
                backgroundColor: "rgba(0,0,0,0.18)",
              }}
            >
              {t(e.key, resolved)}
              {e.team ? <span className="sr-only"> ({t(e.team === "player" ? "side.player" : "side.enemy")})</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ObjectivesPanel({ state }: { state: BattleState }) {
  const t = useT();
  const held = state.objectives.filter((o) => o.owner === "player").length;
  return (
    <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--im-color-inkFaint)" }}>
        <span>{t("battle.objectives")}</span>
        <span className="font-mono" style={{ color: "var(--im-color-accent)" }}>{held}/{state.objectives.length}</span>
      </div>
      <ul className="mt-1.5 space-y-1">
        {state.objectives.map((o) => (
          <li key={`${o.x},${o.y}`} className="flex items-center gap-2 text-xs">
            <span
              style={{
                color:
                  o.owner === "player" ? "var(--im-color-player)" : o.owner === "enemy" ? "var(--im-color-enemy)" : "var(--im-color-neutral)",
              }}
            >
              <IconFlag width={12} height={12} />
            </span>
            <span className="font-mono" style={{ color: "var(--im-color-inkDim)" }}>{o.x},{o.y}</span>
            <span style={{ color: "var(--im-color-ink)" }}>
              {t(o.owner === "player" ? "objective.owner.player" : o.owner === "enemy" ? "objective.owner.enemy" : "objective.owner.neutral")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
