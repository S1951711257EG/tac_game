"use client";

/** Shared dialogs: Settings (audio, motion, language), Help, Credits. */
import { useT } from "@/i18n/useT";
import { useAppStore } from "@/state/appStore";
import { LOCALES } from "@/i18n/locales";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { IconBook, IconGear } from "@/components/game/common/GameIcons";

const panelStyle = { backgroundColor: "var(--im-color-bgPanel)", borderColor: "var(--im-color-lineStrong)" } as const;

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={panelStyle}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "var(--im-color-ink)" }}>
            <IconGear width={18} height={18} />{t("settings.title")}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--im-color-inkFaint)" }}>{t("app.name")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-1">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label style={{ color: "var(--im-color-ink)" }}>{t("settings.volume")}</Label>
              <span className="font-mono text-xs" style={{ color: "var(--im-color-inkFaint)" }}>{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(v) => update({ volume: v[0] ?? settings.volume })}
              disabled={settings.muted}
              aria-label={t("settings.volume")}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="mute-switch" style={{ color: "var(--im-color-ink)" }}>{t("settings.mute")}</Label>
            <Switch id="mute-switch" checked={settings.muted} onCheckedChange={(v) => update({ muted: v })} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="motion-switch" style={{ color: "var(--im-color-ink)" }}>{t("settings.reduceMotion")}</Label>
              <Switch id="motion-switch" checked={settings.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} />
            </div>
            <p className="text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>{t("settings.reduceMotionDesc")}</p>
          </div>
          <div>
            <Label style={{ color: "var(--im-color-ink)" }}>{t("settings.language")}</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LOCALES.map((l) => (
                <Button
                  key={l.code}
                  size="sm"
                  variant={settings.locale === l.code ? "default" : "outline"}
                  style={
                    settings.locale === l.code
                      ? { backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }
                      : { borderColor: "var(--im-color-lineStrong)", color: "var(--im-color-ink)" }
                  }
                  onClick={() => update({ locale: l.code })}
                >
                  {l.label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px]" style={{ color: "var(--im-color-inkFaint)" }}>{t("settings.languageHint")}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }}>
            {t("settings.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const sections: Array<{ title: string; body: string }> = [
    { title: t("help.goalTitle"), body: t("help.goalBody") },
    { title: t("help.turnTitle"), body: t("help.turnBody") },
    { title: t("help.combatTitle"), body: t("help.combatBody") },
    { title: t("help.terrainTitle"), body: t("help.terrainBody") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" style={panelStyle}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: "var(--im-color-ink)" }}>
            <IconBook width={18} height={18} />{t("help.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {sections.map((s) => (
            <section key={s.title}>
              <h3 className="text-sm font-bold" style={{ color: "var(--im-color-accent)" }}>{s.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: "var(--im-color-inkDim)" }}>{s.body}</p>
            </section>
          ))}
          <section>
            <h3 className="text-sm font-bold" style={{ color: "var(--im-color-accent)" }}>{t("help.keysTitle")}</h3>
            <ul className="mt-1 space-y-1 text-[13px]" style={{ color: "var(--im-color-inkDim)" }}>
              {["move", "select", "cancel", "next", "end"].map((k) => (
                <li key={k} className="flex gap-2">
                  <kbd className="rounded px-1.5 py-0.5 font-mono text-[11px]" style={{ backgroundColor: "var(--im-color-bg)", color: "var(--im-color-ink)" }}>
                    {t(`help.keys.${k}`)}
                  </kbd>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }}>
            {t("help.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreditsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  const sections: Array<{ title: string; body: string }> = [
    { title: t("credits.conceptTitle"), body: t("credits.conceptBody") },
    { title: t("credits.codeTitle"), body: t("credits.codeBody") },
    { title: t("credits.assetsTitle"), body: t("credits.assetsBody") },
    { title: t("credits.thirdPartyTitle"), body: t("credits.thirdPartyBody") },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" style={panelStyle}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--im-color-ink)" }}>{t("credits.title")}</DialogTitle>
          <DialogDescription style={{ color: "var(--im-color-inkFaint)" }}>
            {t("app.name")} · {t("app.version")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {sections.map((s) => (
            <section key={s.title}>
              <h3 className="text-sm font-bold" style={{ color: "var(--im-color-accent)" }}>{s.title}</h3>
              <p className="mt-0.5 text-[13px] leading-relaxed" style={{ color: "var(--im-color-inkDim)" }}>{s.body}</p>
            </section>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} style={{ backgroundColor: "var(--im-color-player)", color: "var(--im-color-bg)" }}>
            {t("credits.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
