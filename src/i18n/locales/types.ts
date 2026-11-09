/** A locale is a flat map of dotted keys -> strings. */
export type LocaleMessages = Record<string, string>;

export interface LocaleEntry {
  code: string;
  /** Native name shown in settings. */
  label: string;
  messages: LocaleMessages;
}
