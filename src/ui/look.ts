import { FACETS, topFacet, type Facet, type Material, type Profile } from '../engine';
import { catalog } from './state';

const FACET_COLOR = new Map(catalog.facets.map((f) => [f.id, f.color]));
const FACET_LABEL = new Map(catalog.facets.map((f) => [f.id, f.label]));

export const facetColor = (f: Facet | string) => FACET_COLOR.get(f as Facet) ?? '#999';
export const facetLabel = (f: Facet | string) => FACET_LABEL.get(f as Facet) ?? f;
export const materialColor = (m: Material) => facetColor(topFacet(m));

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The blend's colour: facet colours weighted by the visible profile, lifted towards amber glass. */
export function liquidColor(profile: Profile): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (const f of FACETS) {
    const share = profile[f];
    if (share <= 0) continue;
    const [cr, cg, cb] = rgb(facetColor(f));
    r += cr * share;
    g += cg * share;
    b += cb * share;
    w += share;
  }
  if (w === 0) return 'rgba(255, 244, 222, 0.5)';
  const mix = (v: number) => Math.round((v / w) * 0.78 + 255 * 0.22);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function potencyWord(p: number): string {
  if (p <= 2) return 'soft';
  if (p <= 4) return 'medium';
  if (p <= 6) return 'loud';
  return 'very loud';
}

export const phaseLabel = { top: 'Top note', heart: 'Heart note', base: 'Base note' } as const;

export const formatShort = { edc: 'EdC', edt: 'EdT', edp: 'EdP', extrait: 'Extrait' } as const;

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

const TYPE_TINT: Record<string, string> = {
  student: '#7A9E7E',
  neighbour: '#B8935A',
  'gym-goer': '#5D8FB3',
  romantic: '#C46B86',
};
export const typeTint = (type: string) => TYPE_TINT[type] ?? '#8a7a6a';
