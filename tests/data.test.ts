import { describe, expect, it } from 'vitest';
import { authoredRequest, evaluate, FACETS, loadCatalog, type Facet } from '../src/engine';

const catalog = loadCatalog();

describe('data files', () => {
  it('every material is complete and consistent', () => {
    for (const m of catalog.materialList) {
      const sum = Object.values(m.facets).reduce((s, w) => s + (w ?? 0), 0);
      expect(sum, `${m.id} facets`).toBeCloseTo(1, 3);
      for (const f of Object.keys(m.facets)) expect(FACETS, `${m.id} facet ${f}`).toContain(f as Facet);
      for (const f of m.hiddenFacets) expect(m.facets[f], `${m.id} hidden ${f}`).toBeGreaterThan(0);
      for (const note of Object.keys(m.notes)) expect(catalog.notes.has(note), `${m.id} note ${note}`).toBe(true);
      expect(m.potency, m.id).toBeGreaterThanOrEqual(1);
      expect(m.potency, m.id).toBeLessThanOrEqual(8);
      expect(['top', 'heart', 'base']).toContain(m.phase);
      expect(m.card.length, m.id).toBeGreaterThan(10);
      if (m.hiddenFacets.length) expect(m.hiddenCard, `${m.id} needs a hiddenCard`).toBeTruthy();
    }
  });

  it('has the ten starter materials', () => {
    expect(catalog.materialList.filter((m) => m.unlockRank === 1)).toHaveLength(10);
  });

  it('every facet has a label and colour', () => {
    expect(catalog.facets.map((f) => f.id)).toEqual([...FACETS]);
  });

  it('every tutorial ideal is a Signature perfume within the beaker', () => {
    for (const t of catalog.tutorial) {
      const r = authoredRequest(t, { owned: [], stars: 3 }, catalog);
      const e = evaluate(r.ideal, r, catalog);
      expect(e.band, t.id).toBe('signature');
      expect(e.wishes.every((w) => w.inRange), t.id).toBe(true);
      const drops = Object.values(r.ideal).reduce((s, d) => s + d, 0);
      expect(drops, t.id).toBeLessThanOrEqual(catalog.prices.beakerDrops);
      for (const id of [...Object.keys(r.ideal), ...(r.allowed ?? [])]) expect(catalog.materials.has(id), id).toBe(true);
    }
  });
});
