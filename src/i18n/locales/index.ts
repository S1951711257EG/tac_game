/**
 * Locale registry. Adding a language:
 * 1. Copy en.json to <code>.json and translate the values (keep keys).
 * 2. Import it below and add an entry to LOCALES.
 * Keys missing from a locale fall back to English automatically.
 */
import type { LocaleEntry } from "./types";
import en from "./en.json";

export const LOCALES: LocaleEntry[] = [
  { code: "en", label: "English", messages: en },
];

export const DEFAULT_LOCALE = "en";
