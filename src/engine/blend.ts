import { material, type Catalog } from './catalog';
import { FACETS, type Blend, type Facet, type Profile } from './types';

export function emptyProfile(): Profile {
  const p = {} as Profile;
  for (const f of FACETS) p[f] = 0;
  return p;
}

export function totalDrops(blend: Blend): number {
  let total = 0;
  for (const drops of Object.values(blend)) total += drops;
  return total;
}

/** Each material's share of the scent: drops × potency, normalised to 1. */
export function materialShares(blend: Blend, catalog: Catalog): Record<string, number> {
  const loudness: Record<string, number> = {};
  let sum = 0;
  for (const [id, drops] of Object.entries(blend)) {
    if (drops <= 0) continue;
    const l = drops * material(catalog, id).potency;
    loudness[id] = l;
    sum += l;
  }
  const shares: Record<string, number> = {};
  if (sum === 0) return shares;
  for (const [id, l] of Object.entries(loudness)) shares[id] = l / sum;
  return shares;
}

/** The blend's facet profile, hidden facets included. */
export function blendProfile(blend: Blend, catalog: Catalog): Profile {
  const profile = emptyProfile();
  for (const [id, share] of Object.entries(materialShares(blend, catalog))) {
    const m = material(catalog, id);
    for (const [facet, weight] of Object.entries(m.facets)) {
      profile[facet as Facet] += share * (weight ?? 0);
    }
  }
  return profile;
}

/** How much of the scent reads as one note, e.g. "rose". */
export function noteShare(blend: Blend, catalog: Catalog, note: string): number {
  let value = 0;
  for (const [id, share] of Object.entries(materialShares(blend, catalog))) {
    value += share * (material(catalog, id).notes[note] ?? 0);
  }
  return value;
}

export function facetSum(profile: Profile, facets: readonly Facet[]): number {
  let value = 0;
  for (const f of facets) value += profile[f];
  return value;
}

/**
 * The profile as the player sees it: undiscovered hidden facets are left out
 * and the rest renormalised, so the ring never gives a hidden facet away.
 * `discovered` holds keys like "jasmine:animalic".
 */
export function visibleProfile(blend: Blend, catalog: Catalog, discovered: ReadonlySet<string>): Profile {
  const profile = emptyProfile();
  for (const [id, share] of Object.entries(materialShares(blend, catalog))) {
    const m = material(catalog, id);
    for (const [facet, weight] of Object.entries(m.facets)) {
      const f = facet as Facet;
      if (m.hiddenFacets.includes(f) && !discovered.has(`${id}:${f}`)) continue;
      profile[f] += share * (weight ?? 0);
    }
  }
  const sum = facetSum(profile, FACETS);
  if (sum > 0) for (const f of FACETS) profile[f] /= sum;
  return profile;
}

export function cosine(a: Profile, b: Profile): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const f of FACETS) {
    dot += a[f] * b[f];
    na += a[f] * a[f];
    nb += b[f] * b[f];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}
