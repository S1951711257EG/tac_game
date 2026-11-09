"use client";

/**
 * Sidebar info cards: selected unit, terrain under cursor, combat forecast.
 * Pure presentation over engine data; all strings via localization keys.
 */
import { useT } from "@/i18n/useT";
import { forecastAttack } from "@/game/combat";
import { assetUrl } from "@/components/game/battle/Tile";
import type { BattleCtx } from "@/game/battleCtx";
import type { TerrainDef, Unit } from "@/game/types";
import {
  IconBoot,
  IconCrosshair,
  IconEye,
  IconFlag,
  IconShield,
  IconSword,
  IconTimer,
} from "@/components/game/common/GameIcons";

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[var(--im-radius-sm)] px-2 py-1" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
      <span style={{ color: "var(--im-color-accent)" }}>{icon}</span>
      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--im-color-inkFaint)" }}>{label}</span>
      <span className="ml-auto font-mono text-[13px]" style={{ color: "var(--im-color-ink)" }}>{value}</span>
    </div>
  );
}

export function UnitCard({ unit, ctx, isEnemy }: { unit: Unit | null; ctx: BattleCtx; isEnemy?: boolean }) {
  const t = useT();
  if (!unit) {
    return (
      <div className="rounded-[var(--im-radius-md)] p-3 text-sm" style={{ backgroundColor: "var(--im-color-bgPanel)", color: "var(--im-color-inkFaint)" }}>
        {t("battle.noSelection")}
      </div>
    );
  }
  const cls = ctx.content.unitClassById[unit.class];
  const status = unit.attacked ? t("battle.done") : unit.moved ? t("battle.moved") : t("battle.ready");
  const moveLeft = unit.moved ? 0 : cls.move;
  return (
    <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)", boxShadow: `inset 0 0 0 1px ${isEnemy ? "var(--im-color-enemy)" : "var(--im-color-player)"}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src={assetUrl(cls.icon)} alt="" className="h-9 w-9 rounded-[var(--im-radius-sm)] object-cover" draggable={false} />
          <div className="font-semibold" style={{ color: "var(--im-color-ink)" }}>
            {t(cls.nameKey)} <span className="font-mono text-xs" style={{ color: "var(--im-color-inkFaint)" }}>#{unit.nameOrdinal ?? 1}</span>
          </div>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider" style={{ backgroundColor: isEnemy ? "var(--im-color-enemyDeep)" : "var(--im-color-playerDeep)", color: "var(--im-color-ink)" }}>
          {isEnemy ? t("side.enemy") : t("side.player")}
        </span>
      </div>
      <div className="mt-0.5 text-xs" style={{ color: "var(--im-color-inkDim)" }}>{t(cls.roleKey)}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="h-full rounded-full" style={{ width: `${(unit.hp / cls.hp) * 100}%`, backgroundColor: unit.hp / cls.hp > 0.6 ? "var(--im-color-hp-ok)" : unit.hp / cls.hp > 0.3 ? "var(--im-color-hp-mid)" : "var(--im-color-hp-low)" }} />
        </div>
        <span className="font-mono text-xs" style={{ color: "var(--im-color-inkDim)" }}>{unit.hp}/{cls.hp}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Stat icon={<IconSword />} label={t("battle.attack")} value={String(Math.round(cls.attack * (1 + ctx.content.balance.veterancyAttackBonus * unit.vet)))} />
        <Stat icon={<IconShield />} label={t("battle.defense")} value={String(cls.defense)} />
        <Stat icon={<IconBoot />} label={t("battle.move")} value={String(moveLeft)} />
        <Stat icon={<IconCrosshair />} label={t("battle.range")} value={cls.minRange === cls.maxRange ? String(cls.maxRange) : `${cls.minRange}–${cls.maxRange}`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>
        <span className="inline-flex items-center gap-1"><IconTimer width={12} height={12} />{t("battle.veterancyShort", { level: unit.vet })}</span>
        <span className="inline-flex items-center gap-1" style={{ color: cls.canCapture ? "var(--im-color-status-ok)" : "var(--im-color-inkFaint)" }}>
          <IconFlag width={12} height={12} />{t(cls.canCapture ? "battle.captureCapable" : "battle.cannotCapture")}
        </span>
      </div>
      <div className="mt-1.5 text-[11px] font-medium" style={{ color: unit.attacked ? "var(--im-color-inkFaint)" : "var(--im-color-status-ok)" }}>{status}</div>
      <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--im-color-inkFaint)" }}>{t(cls.descKey)}</p>
    </div>
  );
}

export function TerrainCard({ terrain, ctx }: { terrain: TerrainDef | null; ctx: BattleCtx }) {
  const t = useT();
  if (!terrain) return null;
  return (
    <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
      <div className="flex items-center gap-2">
        <span className="inline-block h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: `var(--im-${terrain.themeRole.replace(/\./g, "-")})` }} />
        <span className="text-sm font-semibold" style={{ color: "var(--im-color-ink)" }}>{t(terrain.nameKey)}</span>
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs" style={{ color: "var(--im-color-accent)" }}>
          <IconShield width={12} height={12} />+{terrain.defense}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--im-color-inkDim)" }}>{t(terrain.descKey)}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>
        {ctx.content.unitClasses.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1">
            <IconBoot width={11} height={11} />
            {t(c.nameKey)}: {terrain.costs[c.id] === null || terrain.costs[c.id] === undefined ? "—" : terrain.costs[c.id]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CombatForecast({ attacker, defender, ctx, inRangeNow }: { attacker: Unit; defender: Unit; ctx: BattleCtx; inRangeNow: boolean }) {
  const t = useT();
  const aCls = ctx.content.unitClassById[attacker.class];
  const dCls = ctx.content.unitClassById[defender.class];
  if (!inRangeNow) {
    return (
      <div className="rounded-[var(--im-radius-md)] p-3 text-xs" style={{ backgroundColor: "var(--im-color-bgPanel)", color: "var(--im-color-inkFaint)" }}>
        {t("action.outOfRange")}
      </div>
    );
  }
  const fc = forecastAttack(ctx.combat, attacker, defender);
  return (
    <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)", boxShadow: "inset 0 0 0 1px var(--im-color-accentDeep)" }}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--im-color-accent)" }}>
        <IconEye width={13} height={13} />{t("battle.forecastTitle")}
      </div>
      <div className="mt-1.5 text-xs" style={{ color: "var(--im-color-inkDim)" }}>
        {t(aCls.nameKey)} <span style={{ color: "var(--im-color-inkFaint)" }}>→</span> {t(dCls.nameKey)}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="font-mono font-semibold" style={{ color: "var(--im-color-status-ok)" }}>
          {t("forecast.damage", { min: fc.minDamage, max: fc.maxDamage })}
        </span>
        <span className="font-mono" style={{ color: fc.canCounter ? "var(--im-color-status-danger)" : "var(--im-color-inkFaint)" }}>
          {fc.canCounter ? t("forecast.counter", { min: fc.counterMin, max: fc.counterMax }) : t("forecast.none")}
        </span>
      </div>
      {fc.likelyLethal && (
        <div className="mt-1 text-[11px] font-bold uppercase" style={{ color: "var(--im-color-status-danger)" }}>
          {t("battle.forecastLethal")}
        </div>
      )}
    </div>
  );
}
