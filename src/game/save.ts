/**
 * Persistence: local browser save data with an injectable storage backend so
 * tests (and SSR) never touch window.localStorage. Data is JSON-safe.
 */
import type { BattleState, CampaignState } from "./types";

export interface SaveData {
  version: 1;
  savedAt: number;
  campaign: CampaignState;
  /** Snapshot of an in-progress battle, if any. */
  battle: BattleState | null;
}

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = "iron-meridian:save:v1";

/** In-memory storage fallback (SSR, tests, private-mode failures). */
export function createMemoryStorage(): SaveStorage {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function browserStorage(): SaveStorage {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // localStorage can throw in some privacy modes; fall through.
  }
  return createMemoryStorage();
}

export function loadSave(storage: SaveStorage = browserStorage()): SaveData | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1 || !data.campaign) return null;
    return data;
  } catch {
    return null; // Corrupt save behaves like no save.
  }
}

export function writeSave(data: SaveData, storage: SaveStorage = browserStorage()): void {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Quota errors are non-fatal for gameplay; the session continues.
  }
}

export function clearSave(storage: SaveStorage = browserStorage()): void {
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
