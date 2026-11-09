/** Seeded RNG (mulberry32) so battles and tests are reproducible. */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [minInclusive, maxExclusive). */
  int(min: number, max: number): number;
  /** Range around 1.0 used for damage variance. */
  spread(spread: number): number;
  /** Current internal state, persisted into battle saves. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min)),
    spread: (spread) => 1 - spread + next() * spread * 2,
    state: () => s,
  };
}

export function restoreRng(state: number): Rng {
  return createRng(state);
}

/** Derive a new seed from the current time (used when starting a battle). */
export function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
