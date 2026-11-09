/**
 * Source-file line limit: no source file may exceed 400 lines (target ≤350).
 * Also verifies the globals.css fallback tokens stay in sync with
 * src/theme/tokens.json (the single source of truth).
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");
const LIMIT = 400;
const SCAN_DIRS = ["src", "scripts"];
const EXTS = new Set([".ts", ".tsx", ".mjs", ".js"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

describe("source file line limit", () => {
  it("keeps every source file at or below 400 lines", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of walk(path.join(ROOT, dir))) {
        const lines = fs.readFileSync(file, "utf8").split("\n").length;
        if (lines > LIMIT) offenders.push(`${path.relative(ROOT, file)}: ${lines} lines`);
      }
    }
    expect(offenders, `Files over ${LIMIT} lines:\n${offenders.join("\n")}`).toEqual([]);
  });
});

describe("theme token sync", () => {
  it("globals.css fallbacks match tokens.json values", () => {
    const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "src/theme/tokens.json"), "utf8"));
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    const fallbacks = new Map<string, string>();
    for (const m of css.matchAll(/--im-([a-z-]+):\s*([^;]+);/g)) {
      fallbacks.set(`color.${m[1].replace(/^color-/, "").replace(/-/g, ".")}`, m[2].trim());
    }
    const mismatches: string[] = [];
    for (const [key, value] of Object.entries(tokens.color as Record<string, string>)) {
      const fallback = fallbacks.get(key);
      if (fallback !== undefined && fallback !== value) {
        mismatches.push(`${key}: tokens.json=${value} globals.css=${fallback}`);
      }
    }
    expect(mismatches).toEqual([]);
    // Critical fallbacks must exist to prevent an unstyled flash.
    for (const key of ["color.bg", "color.ink", "color.player", "color.enemy"]) {
      expect(fallbacks.has(key), `missing fallback for ${key}`).toBe(true);
    }
  });
});
