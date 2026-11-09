/**
 * Minimal, typed i18n: flat dotted-key message catalogs + interpolation.
 *
 * Adding a locale: create `src/i18n/locales/<code>.json` with the same flat
 * keys and register it in locales/index.ts. Missing keys fall back to the key
 * itself (always visible in QA), then to English.
 */
import type { LocaleMessages } from "./locales/types";

export type Translate = (key: string, params?: Record<string, string | number>) => string;

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m,
  );
}

export function lookup(messages: LocaleMessages, key: string): string {
  return messages[key] ?? "";
}

/** Build a translate function for one locale (with English fallback). */
export function createTranslator(messages: LocaleMessages, fallback: LocaleMessages): Translate {
  return (key, params) => {
    const raw = lookup(messages, key) || lookup(fallback, key) || key;
    return interpolate(raw, params);
  };
}

/**
 * Log entries store unit identity as "classId#ordinal" so the locale file can
 * render formation names ("Rifle Squad 2"). This resolves such tokens.
 */
export function unitTokenKey(token: string): { classId: string; ordinal: number } | null {
  const m = /^([a-z0-9_-]+)#(\d+)$/.exec(token);
  if (!m) return null;
  return { classId: m[1], ordinal: Number(m[2]) };
}

export function resolveUnitToken(
  token: string,
  t: Translate,
): string {
  const parsed = unitTokenKey(token);
  if (!parsed) return token;
  return `${t(`units.${parsed.classId}.name`)} ${parsed.ordinal}`;
}
