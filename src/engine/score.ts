import { blendProfile, cosine, facetSum, noteShare, totalDrops } from './blend';
import type { Catalog } from './catalog';
import type { BandId, BandInfo, Blend, NoGo, Profile, Request, Wish } from './types';

export interface WishResult {
  wish: Wish;
  value: number;
  inRange: boolean;
  /** 1 inside the range, falling to 0 with distance. */
  score: number;
  /** Negative: below the minimum. Positive: above the maximum. 0: inside. */
  gap: number;
}

export interface NoGoResult {
  noGo: NoGo;
  value: number;
  broken: boolean;
}

export interface Evaluation {
  score: number;
  band: BandId;
  wishes: WishResult[];
  noGos: NoGoResult[];
  /** Mean wish score, 0..1. */
  wishScore: number;
  cosine: number;
  /** Cosine mapped to 0..1. */
  profileScore: number;
  capped: 'none' | 'wish' | 'nogo';
  profile: Profile;
}

export function wishValue(wish: Wish, blend: Blend, profile: Profile, catalog: Catalog): number {
  if (wish.kind === 'note') return noteShare(blend, catalog, wish.note ?? '');
  return facetSum(profile, wish.facets ?? []);
}

export function evaluateWish(wish: Wish, value: number, catalog: Catalog): WishResult {
  const { twoSidedMin, oneSided } = catalog.scoring.tolerance;
  const hasMin = wish.min !== undefined;
  const hasMax = wish.max !== undefined;
  let gap = 0;
  if (hasMin && value < wish.min!) gap = value - wish.min!;
  else if (hasMax && value > wish.max!) gap = value - wish.max!;
  const tolerance = hasMin && hasMax ? Math.max(twoSidedMin, wish.max! - wish.min!) : oneSided;
  const score = gap === 0 ? 1 : Math.max(0, 1 - Math.abs(gap) / tolerance);
  return { wish, value, inRange: gap === 0, score, gap };
}

export function bandFor(score: number, catalog: Catalog): BandInfo {
  const bands = [...catalog.prices.bands].sort((a, b) => b.min - a.min);
  for (const band of bands) if (score >= band.min) return band;
  return bands[bands.length - 1]!;
}

export function bandInfo(id: BandId, catalog: Catalog): BandInfo {
  const band = catalog.prices.bands.find((b) => b.id === id);
  if (!band) throw new Error(`Unknown band: ${id}`);
  return band;
}

/**
 * Scores a blend against a request.
 * Wishes 60% and profile similarity 30%, rescaled to 100 until structure
 * scoring arrives at rank 7. Any missed wish caps the score below Signature;
 * a broken no-go caps it at Flop.
 */
export function evaluate(blend: Blend, request: Request, catalog: Catalog): Evaluation {
  const profile = blendProfile(blend, catalog);
  const s = catalog.scoring;

  if (totalDrops(blend) === 0) {
    return {
      score: 0, band: 'flop', wishes: request.wishes.map((wish) => evaluateWish(wish, 0, catalog)),
      noGos: request.noGos.map((noGo) => ({ noGo, value: 0, broken: false })),
      wishScore: 0, cosine: 0, profileScore: 0, capped: 'none', profile,
    };
  }

  const wishes = request.wishes.map((wish) => evaluateWish(wish, wishValue(wish, blend, profile, catalog), catalog));
  const noGos = request.noGos.map((noGo) => {
    const value = facetSum(profile, noGo.facets);
    return { noGo, value, broken: value > noGo.max };
  });

  const wishScore = wishes.length ? wishes.reduce((sum, w) => sum + w.score, 0) / wishes.length : 1;
  const cos = cosine(profile, request.idealProfile);
  const profileScore = Math.min(1, Math.max(0, (cos - s.cosineFloor) / (1 - s.cosineFloor)));

  const weightSum = s.weights.wishes + s.weights.profile;
  let score = (100 * (s.weights.wishes * wishScore + s.weights.profile * profileScore)) / weightSum;
  let capped: Evaluation['capped'] = 'none';
  if (wishes.some((w) => !w.inRange) && score > s.capWhenWishMissed) {
    score = s.capWhenWishMissed;
    capped = 'wish';
  }
  if (noGos.some((n) => n.broken)) {
    score = Math.min(score, s.capWhenNoGoBroken);
    capped = 'nogo';
  }
  score = Math.round(score * 10) / 10;
  return {
    score, band: bandFor(score, catalog).id, wishes, noGos, wishScore,
    cosine: cos, profileScore, capped, profile,
  };
}
