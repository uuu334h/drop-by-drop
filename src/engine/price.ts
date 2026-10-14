import { material, type Catalog } from './catalog';
import { totalDrops } from './blend';
import { bandInfo } from './score';
import type { BandId, Blend, FormatId } from './types';

export function concentrateGrams(format: FormatId, sizeMl: number, catalog: Catalog): number {
  return Math.round(sizeMl * catalog.prices.formats[format].concentration * 100) / 100;
}

export function basePrice(format: FormatId, sizeMl: number, catalog: Catalog): number {
  const price = catalog.prices.basePrice[format]?.[String(sizeMl)];
  if (price === undefined) throw new Error(`No base price for ${format} ${sizeMl} ml`);
  return price;
}

/** Reputation in stars, smoothed towards 3 so a single review can't swing prices. */
export function reputation(reviews: readonly number[], catalog: Catalog): number {
  const { stars, weight, window } = catalog.prices.reputationPrior;
  const recent = reviews.slice(-window);
  const sum = recent.reduce((s, r) => s + r, 0) + stars * weight;
  return sum / (recent.length + weight);
}

export interface PriceInput {
  format: FormatId;
  sizeMl: number;
  budget: number;
  /** Wishes plus no-gos. */
  asks: number;
  maxTier: number;
  bottleMultiplier: number;
  stars: number;
}

export function requestPrice(input: PriceInput, catalog: Catalog): number {
  const complexity = 1 + 0.125 * (input.asks - 2);
  const tier = 1 + 0.2 * (input.maxTier - 1);
  const rep = 1 + 0.25 * (input.stars - 3);
  const price = basePrice(input.format, input.sizeMl, catalog) * input.budget * complexity * tier * input.bottleMultiplier * rep;
  return Math.max(1, Math.round(price));
}

export interface Payment {
  paid: number;
  tip: number;
  total: number;
}

export function payment(price: number, band: BandId, catalog: Catalog): Payment {
  const info = bandInfo(band, catalog);
  const paid = Math.round(price * info.pay);
  const tip = Math.round(price * info.tip);
  return { paid, tip, total: paid + tip };
}

/** Coins spent on materials when the trial is scaled up to the order's concentrate. */
export function materialCost(blend: Blend, grams: number, catalog: Catalog): number {
  const drops = totalDrops(blend);
  if (drops === 0) return 0;
  let cost = 0;
  for (const [id, d] of Object.entries(blend)) {
    cost += (d / drops) * grams * material(catalog, id).coinsPerGram;
  }
  return Math.round(cost * 100) / 100;
}

export function bottleCost(catalog: Catalog, bottleId = 'classic'): number {
  return catalog.prices.bottles.find((b) => b.id === bottleId)?.cost ?? 0;
}
