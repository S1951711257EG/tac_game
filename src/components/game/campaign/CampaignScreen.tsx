"use client";

/**
 * Campaign screen: force overview, between-battle choices (repairs, training,
 * recruitment) and objective selection. Rules via game/campaignRules.
 */
import { useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { loadContent } from "@/game/content";
import { campaignFinished, nodeById, repairCost } from "@/game/campaignRules";
import { useCampaignStore } from "@/state/campaignStore";
import { useAppStore } from "@/state/appStore";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { IconCoins, IconFlag, IconGear, IconTimer, IconWrench } from "@/components/game/common/GameIcons";
import { CreditsDialog, HelpDialog, SettingsDialog } from "@/components/game/menu/Dialogs";

export function CampaignScreen() {
  const t = useT();
  const { toast } = useToast();
  const campaign = useCampaignStore((s) => s.campaign);
  const def = useCampaignStore((s) => s.def);
  const afterBattle = useCampaignStore((s) => s.afterBattle);
  const pickNode = useCampaignStore((s) => s.pickNode);
  const launchCurrentNode = useCampaignStore((s) => s.launchCurrentNode);
  const doRepair = useCampaignStore((s) => s.doRepair);
  const doTrain = useCampaignStore((s) => s.doTrain);
  const doRecruit = useCampaignStore((s) => s.doRecruit);
  const restartCampaign = useCampaignStore((s) => s.restartCampaign);
  const setView = useAppStore((s) => s.setView);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const content = loadContent();

  useEffect(() => {
    if (afterBattle) toast({ description: t("choice.subtitle") });
  }, [afterBattle, toast, t]);

  if (!campaign) return null;

  const nodeBtn = { backgroundColor: "var(--im-color-bgPanelRaised)", color: "var(--im-color-ink)", borderColor: "var(--im-color-lineStrong)" } as const;

  if (campaignFinished(campaign, def)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-black" style={{ color: "var(--im-color-player)" }}>{t("campaign.finishedTitle")}</h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--im-color-inkDim)" }}>{t("campaign.finishedBody")}</p>
        <Button style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }} onClick={restartCampaign}>
          {t("menu.newCampaign")}
        </Button>
      </div>
    );
  }

  const repair = repairCost(campaign, def);
  const classes = content.unitClasses;

  return (
    <div className="mx-auto w-full max-w-6xl p-3 lg:p-6">
      <div
        className="relative mb-3 flex min-h-28 items-end overflow-hidden rounded-[var(--im-radius-lg)]"
        style={{
          backgroundColor: "var(--im-color-bgPanel)",
          backgroundImage: "url(/assets/img/campaign-map.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          boxShadow: "0 0 0 1px var(--im-color-lineStrong)",
        }}
        aria-hidden={false}
      >
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,16,0.15), rgba(10,13,16,0.82))" }} />
        <div className="relative p-4">
          <h1 className="text-lg font-black" style={{ color: "var(--im-color-ink)", textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>{t("campaign.title")}</h1>
          <p className="text-xs" style={{ color: "var(--im-color-inkDim)" }}>{t(def.nameKey)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-[var(--im-radius-md)] px-4 py-3" style={{ backgroundColor: "var(--im-color-bgPanel)" }}>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold" style={{ backgroundColor: "var(--im-color-accentDeep)", color: "var(--im-color-ink)" }} data-testid="prestige">
            <IconCoins width={15} height={15} />{campaign.prestige} {t("campaign.prestige")}
          </span>
          <Button variant="ghost" size="sm" aria-label={t("menu.help")} onClick={() => setShowHelp(true)} style={{ color: "var(--im-color-inkDim)" }}>{t("menu.help")}</Button>
          <Button variant="ghost" size="icon" aria-label={t("settings.title")} onClick={() => setShowSettings(true)} style={{ color: "var(--im-color-inkDim)" }}><IconGear /></Button>
          <Button variant="outline" size="sm" style={nodeBtn} onClick={() => setView("menu")}>{t("common.back")}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" style={{ ...nodeBtn, color: "var(--im-color-enemy)" }}>{t("menu.newCampaign")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent style={panelStyle}>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ color: "var(--im-color-ink)" }}>{t("menu.restartConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription style={{ color: "var(--im-color-inkDim)" }}>{t("menu.restartConfirmBody")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={nodeBtn}>{t("menu.cancel")}</AlertDialogCancel>
                <AlertDialogAction style={{ backgroundColor: "var(--im-color-enemy)", color: "var(--im-color-ink)" }} onClick={restartCampaign}>
                  {t("menu.restartConfirmYes")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[380px_1fr]">
        {/* Force + choices */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)" }} data-testid="force-panel">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--im-color-inkFaint)" }}>{t("choice.force")}</h2>
            {campaign.force.length === 0 ? (
              <p className="mt-1 text-xs" style={{ color: "var(--im-color-inkFaint)" }}>{t("campaign.forceEmpty")}</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {campaign.force.map((u) => {
                  const cls = content.unitClassById[u.class];
                  const hpFrac = u.hp / cls.hp;
                  return (
                    <li key={u.id} className="flex items-center gap-2 text-xs">
                      <span className="w-28 truncate" style={{ color: "var(--im-color-ink)" }}>{t(cls.nameKey)} {u.ordinal}</span>
                      <span className="flex-1" />
                      <span className="font-mono" style={{ color: u.vet > 0 ? "var(--im-color-accent)" : "var(--im-color-inkFaint)" }}>{u.vet > 0 ? `V${u.vet}` : "—"}</span>
                      <span className="h-2 w-16 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                        <span className="block h-full" style={{ width: `${hpFrac * 100}%`, backgroundColor: hpFrac > 0.6 ? "var(--im-color-hp-ok)" : hpFrac > 0.3 ? "var(--im-color-hp-mid)" : "var(--im-color-hp-low)" }} />
                      </span>
                      <span className="w-10 text-right font-mono" style={{ color: "var(--im-color-inkDim)" }}>{u.hp}/{cls.hp}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ChoiceButton label={t("choice.repair")} desc={t("choice.repairDesc")} cost={repair} onClick={() => feedback(doRepair(), t, toast)} />
              <ChoiceButton label={t("choice.train")} desc={t("choice.trainDesc", { max: content.balance.veterancyMax })} cost={def.economy.trainingCost} onClick={() => feedback(doTrain(), t, toast)} />
              {classes.map((c) => (
                <ChoiceButton
                  key={c.id}
                  label={t("choice.recruit", { unit: t(c.nameKey) })}
                  desc={t("choice.recruitDesc", { unit: t(c.nameKey) })}
                  cost={def.economy.recruit[c.id] ?? 0}
                  onClick={() => feedback(doRecruit(c.id), t, toast)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Objectives */}
        <div className="rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bgPanel)" }} data-testid="objective-list">
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--im-color-inkFaint)" }}>{t("campaign.selectNext")}</h2>
          <div className="mt-2 grid gap-2.5 md:grid-cols-2">
            {campaign.availableNodes.map((nodeId) => {
              const node = nodeById(def, nodeId);
              if (!node) return null;
              const scenario = content.scenarioById[node.scenarioId];
              if (!scenario) return null;
              return (
                <div key={nodeId} className="flex flex-col rounded-[var(--im-radius-md)] p-3" style={{ backgroundColor: "var(--im-color-bg)", boxShadow: "inset 0 0 0 1px var(--im-color-line)" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--im-color-accent)" }}><IconFlag width={15} height={15} /></span>
                    <h3 className="text-sm font-bold" style={{ color: "var(--im-color-ink)" }}>{t(scenario.nameKey)}</h3>
                  </div>
                  <p className="mt-1 flex-1 text-xs leading-relaxed" style={{ color: "var(--im-color-inkDim)" }}>{t(scenario.briefKey)}</p>
                  <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>
                    <span className="inline-flex items-center gap-1"><IconTimer width={12} height={12} />{t("campaign.turnLimitLabel", { limit: scenario.turnLimit })}</span>
                    <span className="inline-flex items-center gap-1"><IconCoins width={12} height={12} />+{scenario.rewards.prestige}</span>
                  </div>
                  <Button
                    className="mt-2 font-semibold"
                    style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }}
                    data-testid={`launch-${nodeId}`}
                    onClick={() => {
                      pickNode(nodeId);
                      // pickNode is async store update; launch after it lands.
                      setTimeout(() => launchCurrentNode(), 0);
                    }}
                  >
                    {t("campaign.launch")}
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {def.nodes.map((n) => {
              const done = campaign.completedNodes.includes(n.id);
              const available = campaign.availableNodes.includes(n.id);
              if (!done && !available) return null;
              return (
                <span key={n.id} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: done ? "var(--im-color-playerDeep)" : "var(--im-color-accentDeep)", color: "var(--im-color-ink)" }}>
                  {t(content.scenarioById[n.scenarioId]?.nameKey ?? "campaign.title")} · {t(done ? "campaign.nodeDone" : "campaign.nodeAvailable")}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <CreditsDialog open={showCredits} onOpenChange={setShowCredits} />
    </div>
  );
}

const panelStyle = { backgroundColor: "var(--im-color-bgPanel)", borderColor: "var(--im-color-lineStrong)" } as const;

function ChoiceButton({ label, desc, cost, onClick }: { label: string; desc: string; cost: number; onClick: () => void }) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      className="rounded-[var(--im-radius-sm)] p-2 text-left transition-colors hover:brightness-125"
      style={{ backgroundColor: "var(--im-color-bg)", boxShadow: "inset 0 0 0 1px var(--im-color-line)" }}
    >
      <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "var(--im-color-ink)" }}>
        <IconWrench width={12} height={12} style={{ color: "var(--im-color-accent)" }} />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug" style={{ color: "var(--im-color-inkFaint)" }}>{desc}</p>
      <div className="mt-1 font-mono text-[11px] font-bold" style={{ color: cost > 0 ? "var(--im-color-accent)" : "var(--im-color-status-ok)" }}>
        {cost > 0 ? t("choice.cost", { cost }) : t("choice.free")}
      </div>
    </button>
  );
}

function feedback(reason: string | null, t: ReturnType<typeof useT>, toast: ReturnType<typeof useToast>["toast"]): void {
  if (reason) toast({ description: t(reason) });
}
