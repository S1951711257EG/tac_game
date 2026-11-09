"use client";

/** Battle top bar: scenario, turn counter, side indicator, menu actions. */
import { useT } from "@/i18n/useT";
import { useBattleStore } from "@/state/battleStore";
import { useCampaignStore } from "@/state/campaignStore";
import { useAppStore } from "@/state/appStore";
import { Button } from "@/components/ui/button";
import { IconBook, IconFlag, IconGear, IconShield, IconTimer } from "@/components/game/common/GameIcons";

export function TopBar({ onHelp, onSettings }: { onHelp: () => void; onSettings: () => void }) {
  const t = useT();
  const session = useBattleStore((s) => s.session);
  const setView = useAppStore((s) => s.setView);
  const campaign = useCampaignStore((s) => s.campaign);
  if (!session) return null;
  const { state, scenario } = session;
  const playerTurn = state.activeTeam === "player";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--im-radius-md)] px-3 py-2" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold" style={{ color: "var(--im-color-ink)" }}>
          {t(scenario.nameKey)}
        </div>
        <div className="text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>
          {t("campaign.name")}{campaign?.prestige !== undefined ? ` · ${t("campaign.prestige")}: ${campaign.prestige}` : ""}
        </div>
      </div>
      <div
        key={`${state.turn}-${state.activeTeam}`}
        className="im-turnpop inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
        style={{
          backgroundColor: playerTurn ? "var(--im-color-playerDeep)" : "var(--im-color-enemyDeep)",
          color: "var(--im-color-ink)",
        }}
        data-testid="turn-indicator"
      >
        <IconFlag width={13} height={13} />
        {t(playerTurn ? "battle.playerTurn" : "battle.enemyTurn")}
        <span className="font-mono opacity-80">·</span>
        <span className="inline-flex items-center gap-1 font-mono">
          <IconTimer width={12} height={12} />
          {t("battle.turn", { turn: state.turn, limit: scenario.turnLimit })}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label={t("help.title")} onClick={onHelp} style={{ color: "var(--im-color-inkDim)" }}>
          <IconBook />
        </Button>
        <Button variant="ghost" size="icon" aria-label={t("settings.title")} onClick={onSettings} style={{ color: "var(--im-color-inkDim)" }}>
          <IconGear />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView("campaign")}
          style={{ borderColor: "var(--im-color-lineStrong)", color: "var(--im-color-ink)" }}
        >
          <IconShield width={14} height={14} />
          {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
