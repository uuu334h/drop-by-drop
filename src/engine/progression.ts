import type { Catalog } from './catalog';
import { bandInfo } from './score';
import type { BandId } from './types';

export function xpFor(band: BandId, catalog: Catalog): number {
  return Math.round(bandInfo(band, catalog).xp * catalog.prices.xpPerBandPoint);
}

/** Rank 1 at 0 XP; each threshold in `rankXp` starts the next rank. */
export function rankFor(xp: number, catalog: Catalog): number {
  const thresholds = catalog.prices.rankXp;
  let rank = 1;
  for (let i = 1; i < thresholds.length; i++) if (xp >= thresholds[i]!) rank = i + 1;
  return rank;
}

/** XP needed for the next rank, or null at the top of the table. */
export function nextRankXp(xp: number, catalog: Catalog): number | null {
  const rank = rankFor(xp, catalog);
  return catalog.prices.rankXp[rank] ?? null;
}

export function starsFor(band: BandId, score: number, catalog: Catalog): number {
  const info = bandInfo(band, catalog);
  if (band === 'full' && score >= catalog.prices.fullFiveStarScore) return 5;
  return info.stars;
}

/** Materials a player owns at a rank, in catalog order. */
export function unlockedMaterials(rank: number, catalog: Catalog): string[] {
  return catalog.materialList.filter((m) => m.unlockRank <= rank).map((m) => m.id);
}
