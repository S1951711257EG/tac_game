"use client";

/** Title screen: original hero art, campaign entry points, meta screens. */
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/i18n/useT";
import { loadSave } from "@/game/save";
import { useCampaignStore } from "@/state/campaignStore";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AssetImage } from "@/components/game/common/AssetImage";
import { CreditsDialog, HelpDialog, SettingsDialog } from "./Dialogs";
import { assetUrl } from "@/components/game/battle/Tile";

export function MainMenu() {
  const t = useT();
  const startNew = useCampaignStore((s) => s.startNew);
  const continueSaved = useCampaignStore((s) => s.continueSaved);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

  // localStorage is an external store; subscribe properly instead of
  // mirroring it into component state via an effect.
  const hasSave = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => loadSave() !== null,
    () => false,
  );

  const menuBtn = {
    backgroundColor: "var(--im-color-bgPanelRaised)",
    color: "var(--im-color-ink)",
    borderColor: "var(--im-color-lineStrong)",
  } as const;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundColor: "var(--im-color-bg)" }}>
        <AssetImage
          src={assetUrl("menu-hero")}
          alt={t("app.name")}
          fallbackColor="color.bg"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,16,0.55) 0%, rgba(10,13,16,0.78) 60%, rgba(10,13,16,0.95) 100%)" }} />
      </div>
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 px-6 py-12 text-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "var(--im-color-ink)", textShadow: "0 2px 12px rgba(0,0,0,0.8)" }} data-testid="game-title">
            {t("app.name")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--im-color-inkDim)" }}>{t("app.tagline")}</p>
          <div className="mt-3 flex items-center justify-center gap-4">
            <AssetImage src={assetUrl("emblem-astria")} alt={t("side.player")} fallbackColor="color.playerDeep" className="h-14 w-14 rounded-full object-cover" style={{ boxShadow: "0 0 0 2px var(--im-color-player)" }} />
            <span className="font-mono text-xs uppercase tracking-widest" style={{ color: "var(--im-color-inkFaint)" }}>vs</span>
            <AssetImage src={assetUrl("emblem-karsia")} alt={t("side.enemy")} fallbackColor="color.enemyDeep" className="h-14 w-14 rounded-full object-cover" style={{ boxShadow: "0 0 0 2px var(--im-color-enemy)" }} />
          </div>
        </div>
        <div className="flex w-72 flex-col gap-2.5">
          {hasSave ? (
            <>
              <Button size="lg" className="h-12 font-bold" style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }} onClick={continueSaved} data-testid="continue-campaign">
                {t("menu.continue")}
              </Button>
              <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
                <AlertDialogTrigger asChild>
                  <Button size="lg" variant="outline" className="h-12" style={menuBtn} data-testid="new-campaign">
                    {t("menu.newCampaign")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent style={panelStyle}>
                  <AlertDialogHeader>
                    <AlertDialogTitle style={{ color: "var(--im-color-ink)" }}>{t("menu.restartConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription style={{ color: "var(--im-color-inkDim)" }}>{t("menu.restartConfirmBody")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel style={menuBtn}>{t("menu.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      style={{ backgroundColor: "var(--im-color-enemy)", color: "var(--im-color-ink)" }}
                      onClick={() => {
                        startNew();
                      }}
                    >
                      {t("menu.restartConfirmYes")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button size="lg" className="h-12 font-bold" style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }} onClick={startNew} data-testid="new-campaign">
              {t("menu.newCampaign")}
            </Button>
          )}
          <Button size="lg" variant="outline" className="h-11" style={menuBtn} onClick={() => setShowHelp(true)}>{t("menu.help")}</Button>
          <Button size="lg" variant="outline" className="h-11" style={menuBtn} onClick={() => setShowSettings(true)}>{t("menu.settings")}</Button>
          <Button size="lg" variant="outline" className="h-11" style={menuBtn} onClick={() => setShowCredits(true)}>{t("menu.credits")}</Button>
        </div>
        <p className="text-xs" style={{ color: "var(--im-color-inkFaint)" }}>
          {hasSave ? t("menu.hasSaveHint") : t("menu.noSaveHint")} · {t("app.version")}
        </p>
      </div>
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <CreditsDialog open={showCredits} onOpenChange={setShowCredits} />
    </div>
  );
}

const panelStyle = { backgroundColor: "var(--im-color-bgPanel)", borderColor: "var(--im-color-lineStrong)" } as const;
