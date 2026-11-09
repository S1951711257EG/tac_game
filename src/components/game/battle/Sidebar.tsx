"use client";

/**
 * Battle sidebar: unit/terrain/forecast/objectives/log cards + turn actions.
 * Desktop: stacked column. Mobile: tabbed panel. Data straight from stores.
 */
import { useT } from "@/i18n/useT";
import { inRange } from "@/game/combat";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBattleStore } from "@/state/battleStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CombatForecast, TerrainCard, UnitCard } from "./InfoCards";
import { LogPanel, ObjectivesPanel } from "./LogPanel";

export function Sidebar() {
  const t = useT();
  const isMobile = useIsMobile();
  const session = useBattleStore((s) => s.session);
  const playerEndTurn = useBattleStore((s) => s.playerEndTurn);
  const cycleUnit = useBattleStore((s) => s.cycleUnit);
  const skipAi = useBattleStore((s) => s.skipAi);
  if (!session) return null;
  const { state, ctx } = session;

  const selected = state.units.find((u) => u.id === session.selectedId) ?? null;
  const enemyAtCursor = state.units.find(
    (u) => u.team === "enemy" && u.x === session.cursor.x && u.y === session.cursor.y,
  );
  const terrain = ctx.grid[session.cursor.y]?.[session.cursor.x] ?? null;
  const isPlayerTurn = state.activeTeam === "player" && state.status === "active";

  const actions = (
    <div className="flex gap-2">
      <Button
        className="flex-1 font-semibold"
        style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }}
        disabled={!isPlayerTurn}
        onClick={playerEndTurn}
        data-testid="end-turn"
      >
        {t("battle.endTurn")}
      </Button>
      <Button
        variant="outline"
        style={{ borderColor: "var(--im-color-lineStrong)", color: "var(--im-color-ink)" }}
        disabled={!isPlayerTurn}
        onClick={cycleUnit}
      >
        {t("battle.nextUnit")}
      </Button>
    </div>
  );

  const unitCard = <UnitCard unit={selected} ctx={ctx} />;
  const terrainCard = <TerrainCard terrain={terrain} ctx={ctx} />;
  const objectives = <ObjectivesPanel state={state} />;
  const log = <LogPanel state={state} />;

  const forecast =
    selected && enemyAtCursor && !selected.attacked ? (
      <CombatForecast
        attacker={selected}
        defender={enemyAtCursor}
        ctx={ctx}
        inRangeNow={inRange(ctx.combat, selected, enemyAtCursor)}
      />
    ) : null;

  return (
    <SidebarBody isMobile={isMobile} actions={actions} unitCard={unitCard} forecast={forecast} terrainCard={terrainCard} objectives={objectives} log={log} t={t} />
  );
}

function SidebarBody({ isMobile, actions, unitCard, forecast, terrainCard, objectives, log, t }: {
  isMobile: boolean;
  actions: React.ReactNode;
  unitCard: React.ReactNode;
  forecast: React.ReactNode;
  terrainCard: React.ReactNode;
  objectives: React.ReactNode;
  log: React.ReactNode;
  t: (k: string) => string;
}) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2">
        {actions}
        <Tabs defaultValue="unit">
          <TabsList className="w-full" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
            <TabsTrigger value="unit" className="flex-1">{t("battle.selected")}</TabsTrigger>
            <TabsTrigger value="terrain" className="flex-1">{t("battle.terrain")}</TabsTrigger>
            <TabsTrigger value="objectives" className="flex-1">{t("battle.objectives")}</TabsTrigger>
            <TabsTrigger value="log" className="flex-1">{t("battle.log")}</TabsTrigger>
          </TabsList>
          <TabsContent value="unit" className="mt-2">{unitCard}{forecast}</TabsContent>
          <TabsContent value="terrain" className="mt-2">{terrainCard}</TabsContent>
          <TabsContent value="objectives" className="mt-2">{objectives}</TabsContent>
          <TabsContent value="log" className="mt-2 max-h-56 overflow-y-auto">{log}</TabsContent>
        </Tabs>
      </div>
    );
  }
  return (
    <div className="flex w-[320px] shrink-0 flex-col gap-2.5">
      {unitCard}
      {forecast}
      {terrainCard}
      {objectives}
      <div className="flex min-h-0 flex-1 flex-col">{log}</div>
      {actions}
    </div>
  );
}
