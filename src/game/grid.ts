import type { Coord } from "./types";

/** Stable tile key "x,y". */
export const key = (x: number, y: number): string => `${x},${y}`;
export const keyOf = (c: Coord): string => key(c.x, c.y);

export const inBounds = (
  x: number,
  y: number,
  width: number,
  height: number,
): boolean => x >= 0 && y >= 0 && x < width && y < height;

/** Manhattan distance (movement uses 4-directional adjacency). */
export const manhattan = (a: Coord, b: Coord): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const sameCoord = (a: Coord, b: Coord): boolean =>
  a.x === b.x && a.y === b.y;

const DIRS: ReadonlyArray<Coord> = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export const neighbors = (c: Coord): Coord[] =>
  DIRS.map((d) => ({ x: c.x + d.x, y: c.y + d.y }));

export const neighborsInBounds = (
  c: Coord,
  width: number,
  height: number,
): Coord[] => neighbors(c).filter((n) => inBounds(n.x, n.y, width, height));

/**
 * Walk a path of coords (as produced by movement.pathTo) into the list of
 * steps actually displayed/animated, including the start tile.
 */
export function expandPath(path: Coord[]): Coord[] {
  return path;
}
