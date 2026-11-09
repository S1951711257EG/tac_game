/**
 * App-level store: current view, settings, content-error surface.
 * Settings persist to localStorage; content errors show a diagnostics screen.
 */
import { create } from "zustand";
import { createMemoryStorage, type SaveStorage } from "@/game/save";
import { DEFAULT_LOCALE } from "@/i18n/locales";

export type View = "menu" | "campaign" | "battle";

export interface Settings {
  locale: string;
  volume: number; // 0..1
  muted: boolean;
  reduceMotion: boolean;
}

const SETTINGS_KEY = "iron-meridian:settings:v1";

const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  volume: 0.6,
  muted: false,
  reduceMotion: false,
};

function loadSettings(storage: SaveStorage): Settings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: Settings, storage: SaveStorage): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // non-fatal
  }
}

interface AppStore {
  view: View;
  settings: Settings;
  contentError: string[] | null;
  hydrated: boolean;
  setView: (view: View) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setContentError: (issues: string[] | null) => void;
  hydrate: () => void;
}

let storageRef: SaveStorage | null = null;
export const settingsStorage = (): SaveStorage => {
  if (!storageRef) {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        storageRef = window.localStorage;
      } else {
        storageRef = createMemoryStorage();
      }
    } catch {
      storageRef = createMemoryStorage();
    }
  }
  return storageRef;
};

export const useAppStore = create<AppStore>()((set, get) => ({
  view: "menu",
  settings: DEFAULT_SETTINGS,
  contentError: null,
  hydrated: false,
  setView: (view) => set({ view }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    persistSettings(settings, settingsStorage());
    set({ settings });
  },
  setContentError: (contentError) => set({ contentError }),
  hydrate: () => {
    const settings = loadSettings(settingsStorage());
    set({ settings, hydrated: true });
  },
}));
