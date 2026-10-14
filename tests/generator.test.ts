import { describe, expect, it } from 'vitest';
import { evaluate, generateRequest, loadCatalog, totalDrops, unlockedMaterials } from '../src/engine';

const catalog = loadCatalog();

function check(rank: number, seeds: number) {
  const owned = unlockedMaterials(rank, catalog);
  const archetypes = new Map<string, number>();
  for (let seed = 1; seed <= seeds; seed++) {
    const r = generateRequest(seed, { owned, stars: 3 }, catalog);
    archetypes.set(r.archetype, (archetypes.get(r.archetype) ?? 0) + 1);
    const e = evaluate(r.ideal, r, catalog);
    expect(e.band, `seed ${seed}: ${r.text}`).toBe('signature');
    expect(e.wishes.every((w) => w.inRange), `seed ${seed}`).toBe(true);
    expect(totalDrops(r.ideal), `seed ${seed}`).toBeLessThanOrEqual(catalog.prices.beakerDrops);
    for (const id of Object.keys(r.ideal)) expect(owned, `seed ${seed}`).toContain(id);
    expect(r.text, `seed ${seed}`).not.toMatch(/[{}]|\s\s|\s[,.]/);
    expect(r.text.length).toBeGreaterThan(20);
    expect(r.price, `seed ${seed}`).toBeGreaterThan(0);
  }
  return archetypes;
}

describe('request generator', () => {
  it('builds solvable requests from the starter shelf', () => {
    const archetypes = check(1, 400);
    expect(archetypes.size).toBeGreaterThanOrEqual(5);
  });

  it('builds solvable requests once tier 2 is unlocked', () => {
    check(8, 400);
  });

  it('is deterministic for a seed', () => {
    const owned = unlockedMaterials(1, catalog);
    expect(generateRequest(42, { owned, stars: 3 }, catalog)).toEqual(generateRequest(42, { owned, stars: 3 }, catalog));
  });

  it('prints a few requests for a human to read', () => {
    const owned = unlockedMaterials(1, catalog);
    const lines = [1, 2, 3, 4, 5, 6].map((seed) => {
      const r = generateRequest(seed, { owned, stars: 3 }, catalog);
      return `${r.customer.name} (${r.customer.type}, ${r.format} ${r.sizeMl} ml, ${r.price} coins): ${r.text}  ideal ${JSON.stringify(r.ideal)}`;
    });
    console.log(lines.join('\n'));
    expect(lines).toHaveLength(6);
  });
});
