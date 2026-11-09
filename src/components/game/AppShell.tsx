"use client";

/**
 * App shell: hydrates settings, applies theme tokens + motion preference,
 * surfaces content-validation diagnostics, switches top-level views.
 * (The sandbox exposes a single route; views are client-side state.)
 */
import { useEffect } from "react";
import { useAppStore } from "@/state/appStore";
import { useCampaignStore, bootContentError } from "@/state/campaignStore";
import { useBattleStore } from "@/state/battleStore";
import { applyTheme } from "@/theme/theme";
import { useT } from "@/i18n/useT";
import { MainMenu } from "@/components/game/menu/MainMenu";
import { CampaignScreen } from "@/components/game/campaign/CampaignScreen";
import { BattleScreen } from "@/components/game/battle/BattleScreen";
import { Button } from "@/components/ui/button";

function ContentErrorScreen({ issues }: { issues: string[] }) {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-bold" style={{ color: "var(--im-color-enemy)" }}>{t("errors.contentTitle")}</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--im-color-inkDim)" }}>{t("errors.contentBody")}</p>
      <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto rounded-[var(--im-radius-md)] p-3 font-mono text-xs" style={{ backgroundColor: "var(--im-color-bgPanel)", color: "var(--im-color-inkDim)" }}>
        {issues.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
      <Button className="mt-4" style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }} onClick={() => window.location.reload()}>
        {t("errors.reload")}
      </Button>
    </div>
  );
}

export function AppShell() {
  const view = useAppStore((s) => s.view);
  const hydrated = useAppStore((s) => s.hydrated);
  const hydrate = useAppStore((s) => s.hydrate);
  const settings = useAppStore((s) => s.settings);
  const campaign = useCampaignStore((s) => s.campaign);
  const battleSession = useBattleStore((s) => s.session);

  useEffect(() => {
    applyTheme();
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.dataset.motion = settings.reduceMotion ? "reduced" : "full";
  }, [settings.reduceMotion]);

  // Broken content is a first-class state, not a crash.
  if (bootContentError) return <ContentErrorScreen issues={bootContentError} />;

  const canShowCampaign = view === "campaign" && !!campaign;
  const canShowBattle = view === "battle" && !!battleSession;
  const showFallbackMenu = !hydrated || (!canShowCampaign && !canShowBattle);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--im-color-bg)", color: "var(--im-color-ink)" }}>
      {canShowBattle ? (
        <BattleScreen />
      ) : canShowCampaign ? (
        <CampaignScreen />
      ) : showFallbackMenu ? (
        <MainMenu />
      ) : null}
    </div>
  );
}
