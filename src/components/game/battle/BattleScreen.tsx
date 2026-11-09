"use client";

/**
 * Battle screen composition: top bar, battlefield + tutorial, sidebar,
 * dialogs, keyboard handling and invalid-action feedback.
 */
import { useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { useBattleStore } from "@/state/battleStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Battlefield } from "./Battlefield";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { IntroDialog, ResultDialog } from "./Dialogs";
import { TutorialOverlay } from "./TutorialOverlay";
import { HelpDialog, SettingsDialog } from "@/components/game/menu/Dialogs";
import { useBattleKeyboard } from "./useBattleKeyboard";

function AiBanner() {
  const t = useT();
  const skipAi = useBattleStore((s) => s.skipAi);
  return (
    <div
      className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-[var(--im-radius-md)] px-3 py-2"
      style={{ backgroundColor: "var(--im-color-enemyDeep)", color: "var(--im-color-ink)" }}
      role="status"
      data-testid="ai-banner"
    >
      <span className="text-sm font-semibold">{t("battle.enemyActing")}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={skipAi}
        style={{ borderColor: "var(--im-color-ink)", color: "var(--im-color-ink)", backgroundColor: "transparent" }}
      >
        {t("battle.skipAnimations")}
      </Button>
    </div>
  );
}

export function BattleScreen() {
  const t = useT();
  const session = useBattleStore((s) => s.session);
  const invalidKey = useBattleStore((s) => s.session?.invalidKey ?? null);
  const { toast } = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const keyboardActive = !!session && session.introSeen && !session.result;
  useBattleKeyboard(keyboardActive);

  useEffect(() => {
    if (!invalidKey) return;
    toast({ description: t(invalidKey) });
    const timer = setTimeout(() => useBattleStore.getState().dismissInvalid(), 2600);
    return () => clearTimeout(timer);
  }, [invalidKey, t, toast]);

  if (!session) return null;

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-2.5 p-2.5 lg:h-screen">
      <TopBar onHelp={() => setShowHelp(true)} onSettings={() => setShowSettings(true)} />
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <Battlefield />
          {session.aiActive && <AiBanner />}
          <TutorialOverlay />
        </div>
        <Sidebar />
      </div>
      <IntroDialog />
      <ResultDialog />
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
