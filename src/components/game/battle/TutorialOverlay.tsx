"use client";

/** Guided tutorial overlay: one idea per step, event-driven advancement. */
import { useT } from "@/i18n/useT";
import { useBattleStore } from "@/state/battleStore";

export function TutorialOverlay() {
  const t = useT();
  const session = useBattleStore((s) => s.session);
  if (!session || session.tutorialIndex < 0) return null;
  const { tutorialSteps, tutorialIndex, introSeen } = session;
  const step = tutorialSteps[tutorialIndex];
  if (!step || !introSeen || step.event === "battleWon") return null;
  return (
    <div
      className="mx-auto w-full max-w-xl rounded-[var(--im-radius-md)] p-3"
      style={{ backgroundColor: "var(--im-color-bgOverlay)", boxShadow: "inset 0 0 0 1px var(--im-color-accent)" }}
      data-testid="tutorial-overlay"
      role="status"
    >
      <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--im-color-accent)" }}>
        {t("help.title")}
        <span className="font-mono" style={{ color: "var(--im-color-inkFaint)" }}>
          {tutorialIndex + 1}/{tutorialSteps.length - 1}
        </span>
      </div>
      <p className="text-sm leading-snug" style={{ color: "var(--im-color-ink)" }}>
        {t(step.textKey)}
      </p>
    </div>
  );
}
