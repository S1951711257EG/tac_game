/**
 * Theme runtime: flattens tokens.json into CSS custom properties
 * (--im-*) on :root and exposes a typed accessor for non-CSS consumers.
 * tokens.json is the only place raw color values may live.
 */
import rawTokens from "./tokens.json";

export interface Tokens {
  color: Record<string, string>;
  size: Record<string, string | number>;
  radius: Record<string, string>;
  space: Record<string, string>;
  font: {
    family: string;
    mono: string;
    size: Record<string, string>;
  };
  motion: Record<string, string>;
}

export const tokens = rawTokens as unknown as Tokens;

/** Semantic theme roles referenced by content (e.g. terrain.themeRole). */
export function token(path: string): string {
  const value = tokens.color[path] ?? tokens.motion[path];
  if (typeof value === "string") return value;
  // Unknown roles degrade to ink so bugs are visible, not silent.
  return tokens.color.ink;
}

export function cssVarName(path: string): string {
  return `--im-${path.replace(/\./g, "-")}`;
}

export function applyTheme(root: HTMLElement = document.documentElement): void {
  const set = (path: string, value: string) => {
    root.style.setProperty(cssVarName(path), value);
  };
  for (const [k, v] of Object.entries(tokens.color)) set(`color.${k}`, v);
  for (const [k, v] of Object.entries(tokens.size)) set(`size.${k}`, String(v));
  for (const [k, v] of Object.entries(tokens.radius)) set(`radius.${k}`, v);
  for (const [k, v] of Object.entries(tokens.space)) set(`space.${k}`, v);
  set("font.family", tokens.font.family);
  set("font.mono", tokens.font.mono);
  for (const [k, v] of Object.entries(tokens.font.size)) set(`font.size.${k}`, v);
  for (const [k, v] of Object.entries(tokens.motion)) set(`motion.${k}`, v);
}

/** Tile size in px, responsive variant included. */
export const tilePx = (mobile: boolean): number =>
  Number(mobile ? tokens.size.tileMobile : tokens.size.tile);
