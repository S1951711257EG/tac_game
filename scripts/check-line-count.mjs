/**
 * Standalone line-count check (also run as a vitest test in
 * tests/limits/limits.test.ts). Exit code 1 if any source file exceeds 400
 * meaningful lines. Usage: node scripts/check-line-count.mjs
 */
import fs from "fs";
import path from "path";
import url from "url";

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");
const LIMIT = 400;
const SCAN_DIRS = ["src", "scripts"];
const EXTS = new Set([".ts", ".tsx", ".mjs", ".js"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

let offenders = 0;
for (const dir of SCAN_DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const lines = fs.readFileSync(file, "utf8").split("\n").length;
    const rel = path.relative(ROOT, file);
    if (lines > LIMIT) {
      console.error(`OVER LIMIT (${lines} > ${LIMIT}): ${rel}`);
      offenders++;
    }
  }
}
if (offenders > 0) {
  console.error(`${offenders} file(s) exceed the ${LIMIT}-line limit.`);
  process.exit(1);
}
console.log(`Line-count check passed: all source files are within ${LIMIT} lines.`);
