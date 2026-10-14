/** Small seeded random source, so a seed always produces the same customer. */
export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxInclusive: number): number;
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T extends string>(weights: Readonly<Record<T, number>>): T;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, maxInclusive) => min + Math.floor(next() * (maxInclusive - min + 1)),
    chance: (p) => next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[Math.floor(next() * items.length)]!;
    },
    weighted: (weights) => {
      const entries = Object.entries(weights) as [string, number][];
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let roll = next() * total;
      for (const [key, w] of entries) {
        roll -= w;
        if (roll < 0) return key as keyof typeof weights & string;
      }
      return entries[entries.length - 1]![0] as keyof typeof weights & string;
    },
  };
  return rng;
}
