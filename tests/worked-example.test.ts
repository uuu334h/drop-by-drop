// Replays the worked example from the game plan doc (Formulating > Worked example).
// If a balance change breaks this file, update the plan doc in the same change.
import { describe, expect, it } from 'vitest';
import {
  authoredRequest, blendProfile, evaluate, feedback, loadCatalog, materialCost,
  materialShares, payment, totalDrops, type Blend,
} from '../src/engine';

const catalog = loadCatalog();
const clara = authoredRequest(catalog.tutorial[0]!, { owned: [], stars: 3 }, catalog);
const pct = (x: number) => Math.round(x * 1000) / 10;

const spotOn: Blend = { peach: 2, rose: 10, ambrette: 16 };
const heavyPeach: Blend = { peach: 5, rose: 10, ambrette: 16 };
const fixedUp: Blend = { peach: 5, rose: 15, ambrette: 24 };
const jasmine: Blend = { peach: 2, rose: 10, ambrette: 16, jasmine: 3 };

describe('worked example: Clara, peach-rose-musk, EDP 50 ml', () => {
  it('asks 45 coins for 10 g of concentrate', () => {
    expect(clara.price).toBe(45);
    expect(clara.concentrateGrams).toBe(10);
  });

  it('spot on: 18% / 45% / 36%, Signature, pays 45 + 23 tip', () => {
    const shares = materialShares(spotOn, catalog);
    expect(pct(shares.peach!)).toBe(18.2);
    expect(pct(shares.rose!)).toBe(45.5);
    expect(pct(shares.ambrette!)).toBe(36.4);
    const e = evaluate(spotOn, clara, catalog);
    expect(e.band).toBe('signature');
    expect(payment(clara.price, e.band, catalog)).toEqual({ paid: 45, tip: 23, total: 68 });
  });

  it('heavy hand on peach: 36% / 36% / 29%, Close, pays 34', () => {
    const shares = materialShares(heavyPeach, catalog);
    expect(Math.round(shares.peach! * 100)).toBe(36);
    expect(Math.round(shares.rose! * 100)).toBe(36);
    expect(Math.round(shares.ambrette! * 100)).toBe(29);
    const e = evaluate(heavyPeach, clara, catalog);
    expect(e.band).toBe('close');
    expect(payment(clara.price, e.band, catalog).total).toBe(34);
    const f = feedback(e, clara, heavyPeach, catalog, new Set());
    expect(f.kind).toBe('note-high');
    expect(f.subject).toBe('peach');
  });

  it('fixing it by adding rose and ambrette would be Full, but needs 44 drops', () => {
    expect(totalDrops(fixedUp)).toBe(44);
    expect(totalDrops(fixedUp)).toBeGreaterThan(catalog.prices.beakerDrops);
    const e = evaluate(fixedUp, clara, catalog);
    expect(e.band).toBe('full');
  });

  it('three drops of jasmine break the no-go: animalic 3.8%, Flop, pays 9', () => {
    expect(pct(blendProfile(jasmine, catalog).animalic)).toBe(3.8);
    const e = evaluate(jasmine, clara, catalog);
    expect(e.band).toBe('flop');
    expect(payment(clara.price, e.band, catalog).total).toBe(9);
    const f = feedback(e, clara, jasmine, catalog, new Set());
    expect(f.kind).toBe('nogo');
    expect(f.discovered).toEqual(['jasmine:animalic']);
  });

  it('costs about 21 coins of materials, so a Full sale clears about 27 and a Signature about 45', () => {
    const cost = materialCost(spotOn, clara.concentrateGrams, catalog);
    expect(cost).toBeCloseTo(21.2, 1);
    const bottle = 2;
    expect(Math.round(payment(45, 'full', catalog).total - cost - bottle)).toBe(27);
    expect(Math.round(payment(45, 'signature', catalog).total - cost - bottle)).toBe(45);
  });
});
