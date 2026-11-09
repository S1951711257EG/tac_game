"use client";

import { useMemo } from "react";
import { useAppStore } from "@/state/appStore";
import { LOCALES } from "@/i18n/locales";
import { createTranslator } from "@/i18n/i18n";

/** React hook: translator bound to the selected locale (English fallback). */
export function useT() {
  const locale = useAppStore((s) => s.settings.locale);
  return useMemo(() => {
    const entry = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
    return createTranslator(entry.messages, LOCALES[0].messages);
  }, [locale]);
}
