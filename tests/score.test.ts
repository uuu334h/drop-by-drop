import { describe, expect, it } from 'vitest';
import {
  authoredRequest, evaluate, feedback, loadCatalog, reputation, rankFor, requestPrice,
  visibleProfile, xpFor,
} from '../src/engine';

const catalog = loadCatalog();
const clara = authoredRequest(catalog.tutorial[0]!, { owned: [], stars: 3 }, catalog);

describe('scoring', () => {
  it('an empty beaker is a Flop scoring 0', () => {
    const e = evaluate({}, clara, catalog);
    expect(e.score).toBe(0);
    expect(e.band).toBe('flop');
  });

  it('more and more peach lowers the score step by step', () => {
    let last = Infinity;
    for (const peach of [2, 3, 4, 5, 6, 8]) {
      const e = evaluate({ peach, rose: 10, ambrette: 16 }, clara, catalog);
      expect(e.score).toBeLessThanOrEqual(last);
      last = e.score;
    }
  });

  it('forgetting the musk entirely can not sell well', () => {
    const e = evaluate({ peach: 2, rose: 10 }, clara, catalog);
    expect(['off', 'flop']).toContain(e.band);
    expect(feedback(e, clara, { peach: 2, rose: 10 }, catalog, new Set()).kind).toBe('base-low');
  });

  it('a little cedar the customer never asked for still sells', () => {
    const e = evaluate({ peach: 2, rose: 10, ambrette: 16, cedarwood: 3 }, clara, catalog);
    expect(['signature', 'full']).toContain(e.band);
  });

  it('two drops of jasmine stay under the animalic limit', () => {
    const e = evaluate({ peach: 2, rose: 10, ambrette: 16, jasmine: 2 }, clara, catalog);
    expect(e.noGos.every((n) => !n.broken)).toBe(true);
  });

  it('hides undiscovered facets from the ring and shows them once found', () => {
    const blend = { rose: 10, jasmine: 4 };
    expect(visibleProfile(blend, catalog, new Set()).animalic).toBe(0);
    expect(visibleProfile(blend, catalog, new Set(['jasmine:animalic'])).animalic).toBeGreaterThan(0);
  });
});

describe('prices and progression', () => {
  it('reputation starts at 3 stars and moves slowly', () => {
    expect(reputation([], catalog)).toBe(3);
    expect(reputation([5], catalog)).toBeCloseTo(3.33, 2);
  });

  it('better reputation raises prices', () => {
    const base = { format: 'edp' as const, sizeMl: 50, budget: 1, asks: 4, maxTier: 1, bottleMultiplier: 1 };
    expect(requestPrice({ ...base, stars: 3 }, catalog)).toBe(45);
    expect(requestPrice({ ...base, stars: 4.6 }, catalog)).toBe(63);
  });

  it('ranks rise with XP', () => {
    expect(rankFor(0, catalog)).toBe(1);
    expect(rankFor(xpFor('full', catalog), catalog)).toBe(2);
    expect(rankFor(75, catalog)).toBe(4);
  });
});
