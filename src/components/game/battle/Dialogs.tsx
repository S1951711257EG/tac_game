"use client";

/** Battle dialogs: scenario intro and victory/defeat results. */
import { useT } from "@/i18n/useT";
import { useBattleStore } from "@/state/battleStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssetImage } from "@/components/game/common/AssetImage";
import { assetUrl } from "@/components/game/battle/Tile";
import { IconCoins, IconFlag, IconSkull, IconTimer } from "@/components/game/common/GameIcons";

export function IntroDialog() {
  const t = useT();
  const session = useBattleStore((s) => s.session);
  const markIntroSeen = useBattleStore((s) => s.markIntroSeen);
  if (!session || session.introSeen) return null;
  return (
    <Dialog open>
      <DialogContent style={{ backgroundColor: "var(--im-color-bgPanel)", borderColor: "var(--im-color-lineStrong)" }} data-testid="intro-dialog">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--im-color-ink)" }}>{t(session.scenario.nameKey)}</DialogTitle>
          <DialogDescription style={{ color: "var(--im-color-inkDim)" }}>{t(session.scenario.introKey)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--im-color-inkFaint)" }}>
          <span className="inline-flex items-center gap-1.5">
            <IconFlag width={13} height={13} />{session.state.objectives.length} {t("battle.objectives")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconTimer width={13} height={13} />{t("campaign.turnLimitLabel", { limit: session.scenario.turnLimit })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <IconCoins width={13} height={13} />{t("campaign.rewardsLabel", { prestige: session.scenario.rewards.prestige, perObjective: session.scenario.rewards.perObjective })}
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--im-color-inkFaint)" }}>{t(session.scenario.briefKey)}</p>
        <DialogFooter>
          <Button onClick={markIntroSeen} style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }} data-testid="begin-battle">
            {t("battle.playerTurn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ResultDialog() {
  const t = useT();
  const session = useBattleStore((s) => s.session);
  const continueResult = useBattleStore((s) => s.continueResult);
  const retry = useBattleStore((s) => s.retry);
  if (!session || !session.result) return null;
  const { result } = session;
  const won = result.won;
  return (
    <Dialog open>
      <DialogContent style={{ backgroundColor: "var(--im-color-bgPanel)", borderColor: won ? "var(--im-color-player)" : "var(--im-color-enemy)" }} data-testid="result-dialog">
        <div className="flex items-center gap-3">
          <AssetImage
            src={assetUrl(won ? "emblem-astria" : "emblem-karsia")}
            alt={t(won ? "side.player" : "side.enemy")}
            fallbackColor={won ? "color.playerDeep" : "color.enemyDeep"}
            className="h-16 w-16 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 2px ${won ? "var(--im-color-player)" : "var(--im-color-enemy)"}` }}
          />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl" style={{ color: won ? "var(--im-color-player)" : "var(--im-color-enemy)" }}>
              {won ? <IconFlag width={20} height={20} /> : <IconSkull width={20} height={20} />}
              {t(won ? "result.victoryTitle" : "result.defeatTitle")}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--im-color-inkDim)" }}>
              {won ? t(session.scenario.outroKey) : t("result.defeatText")}
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="space-y-1 rounded-[var(--im-radius-md)] p-3 text-sm" style={{ backgroundColor: "var(--im-color-bg)" }}>
          <div className="flex justify-between">
            <span style={{ color: "var(--im-color-inkDim)" }}>{t("result.prestigeEarned", { amount: result.prestige })}</span>
            <span className="font-mono font-bold" style={{ color: "var(--im-color-accent)" }}>+{result.prestige}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--im-color-inkFaint)" }}>
            <span>{t("result.breakdown.objectives", { amount: result.objectiveBonus })}</span>
            <span className="font-mono">+{result.objectiveBonus}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: "var(--im-color-inkFaint)" }}>
            <span>{t("result.breakdown.turns", { amount: result.turnBonus })}</span>
            <span className="font-mono">+{result.turnBonus}</span>
          </div>
          {won && (
            <div className="pt-1 text-xs" style={{ color: "var(--im-color-inkFaint)" }}>
              {t("result.survivors")}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={retry} style={{ borderColor: "var(--im-color-lineStrong)", color: "var(--im-color-ink)" }}>
            {t("result.retry")}
          </Button>
          <Button onClick={continueResult} style={{ backgroundColor: won ? "var(--im-color-player)" : "var(--im-color-neutral)", color: "var(--im-color-bg)" }} data-testid="result-continue">
            {t("result.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
