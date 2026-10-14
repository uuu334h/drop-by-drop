import { blendProfile, facetSum, noteShare, totalDrops } from './blend';
import { mainNote, material, noteLabel, topFacet, type Catalog } from './catalog';
import { concentrateGrams, requestPrice } from './price';
import { createRng, type Rng } from './rng';
import { evaluateWish } from './score';
import type {
  Archetype, Blend, CustomerType, Facet, FormatId, Material, NoGo, Request,
  TutorialRequest, TutorialWish, Wish,
} from './types';

export interface RequestContext {
  /** Material ids the player owns. */
  owned: readonly string[];
  /** Current reputation in stars, for pricing. */
  stars: number;
}

export function customerType(id: string, catalog: Catalog): CustomerType {
  const type = catalog.customers.types.find((t) => t.id === id);
  if (!type) throw new Error(`Unknown customer type: ${id}`);
  return type;
}

export function maxTier(blend: Blend, catalog: Catalog): number {
  let tier = 1;
  for (const id of Object.keys(blend)) tier = Math.max(tier, material(catalog, id).tier);
  return tier;
}

/** Turns a wish written in data (role only, no numbers) into a full wish. */
export function fillWish(w: TutorialWish, catalog: Catalog): Wish {
  if (w.kind === 'note') {
    const role = catalog.vocab.roles[w.role as 'core' | 'accent' | 'trace'];
    if (!role) throw new Error(`Note wishes need a core, accent or trace role, got ${w.role}`);
    return {
      kind: 'note', role: w.role, note: w.note,
      min: w.min ?? role.min, max: w.max ?? role.max,
      label: w.label ?? noteLabel(catalog, w.note ?? ''),
    };
  }
  return {
    kind: w.kind, role: w.role, facets: w.facets, min: w.min, max: w.max,
    label: w.label ?? (w.facets ?? []).join(' and '),
  };
}

/** A hand-written request, such as the tutorial customers. */
export function authoredRequest(t: TutorialRequest, ctx: RequestContext, catalog: Catalog): Request {
  const type = customerType(t.customer.type, catalog);
  const wishes = t.wishes.map((w) => fillWish(w, catalog));
  return {
    id: t.id,
    customer: t.customer,
    text: t.text,
    archetype: 'authored',
    format: t.format,
    sizeMl: t.sizeMl,
    concentrateGrams: concentrateGrams(t.format, t.sizeMl, catalog),
    wishes,
    noGos: t.noGos,
    ideal: t.ideal,
    idealProfile: blendProfile(t.ideal, catalog),
    price: requestPrice({
      format: t.format, sizeMl: t.sizeMl, budget: type.budget,
      asks: wishes.length + t.noGos.length, maxTier: maxTier(t.ideal, catalog),
      bottleMultiplier: 1, stars: ctx.stars,
    }, catalog),
    allowed: t.allowed,
    hints: t.hints,
  };
}

function wishValueFor(wish: Wish, blend: Blend, catalog: Catalog): number {
  if (wish.kind === 'note') return noteShare(blend, catalog, wish.note ?? '');
  return facetSum(blendProfile(blend, catalog), wish.facets ?? []);
}

/** Inside the range with a safety margin, so the ideal never sits on an edge. */
function comfortablyInRange(wish: Wish, value: number, margin: number): boolean {
  if (wish.min !== undefined && value < wish.min + margin) return false;
  if (wish.max !== undefined && value > wish.max - margin) return false;
  return true;
}

/**
 * Finds whole drop counts whose shares land closest to the targets while
 * every wish sits comfortably inside its range.
 */
export function fitDrops(targets: [Material, number][], wishes: Wish[], catalog: Catalog): Blend | null {
  const g = catalog.scoring.generator;
  const raw = targets.map(([m, share]) => share / m.potency);
  const rawSum = raw.reduce((s, r) => s + r, 0);
  let best: { blend: Blend; cost: number } | null = null;
  for (let total = g.dropTotals[0]; total <= g.dropTotals[1]; total++) {
    const blend: Blend = {};
    targets.forEach(([m], i) => {
      blend[m.id] = Math.max(1, Math.round((raw[i]! / rawSum) * total));
    });
    if (totalDrops(blend) > catalog.prices.beakerDrops) continue;
    if (!wishes.every((w) => comfortablyInRange(w, wishValueFor(w, blend, catalog), g.rangeMargin))) continue;
    const loud = targets.map(([m]) => blend[m.id]! * m.potency);
    const loudSum = loud.reduce((s, l) => s + l, 0);
    let err = 0;
    targets.forEach(([, share], i) => {
      err += (loud[i]! / loudSum - share) ** 2;
    });
    const cost = err + g.dropTotalPenalty * totalDrops(blend);
    if (!best || cost < best.cost) best = { blend, cost };
  }
  return best?.blend ?? null;
}

function pickFormat(rng: Rng, type: CustomerType): [FormatId, number] {
  const total = type.formats.reduce((s, [, , w]) => s + w, 0);
  let roll = rng.next() * total;
  for (const [format, size, weight] of type.formats) {
    roll -= weight;
    if (roll < 0) return [format, size];
  }
  const last = type.formats[type.formats.length - 1]!;
  return [last[0], last[1]];
}

interface TextParts {
  core: string;
  accent: string;
  basePhrase: string;
  trace?: string;
  opener?: string;
  extras: string[];
}

function composeText(rng: Rng, parts: TextParts, catalog: Catalog): string {
  const t = catalog.vocab.templates;
  const coreAdj = catalog.notes.get(parts.core)?.adjective;
  const accentAdj = catalog.notes.get(parts.accent)?.adjective;
  const pool = (parts.opener ? t.group : t.plain).filter(
    (tpl) => (!tpl.includes('{coreAdj}') || coreAdj) && (!tpl.includes('{accentAdj}') || accentAdj),
  );
  const tpl = rng.pick(pool.length ? pool : t.plain.filter((p) => !p.includes('Adj}')));
  const fill = (s: string) => s
    .replaceAll('{core}', noteLabel(catalog, parts.core))
    .replaceAll('{accent}', noteLabel(catalog, parts.accent))
    .replaceAll('{coreAdj}', coreAdj ?? '')
    .replaceAll('{accentAdj}', accentAdj ?? '')
    .replaceAll('{base}', parts.basePhrase)
    .replaceAll('{opener}', parts.opener ?? '')
    .replaceAll('{trace}', parts.trace ? noteLabel(catalog, parts.trace) : '');
  const sentences = [fill(tpl)];
  if (parts.trace) sentences.push(fill(t.trace));
  sentences.push(...parts.extras);
  const text = sentences.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function tryBuild(rng: Rng, archetype: Archetype, type: CustomerType, owned: Material[], ctx: RequestContext, catalog: Catalog): Omit<Request, 'id'> | null {
  const v = catalog.vocab;
  const g = catalog.scoring.generator;
  const facetOf = (m: Material) => topFacet(m) as Facet;

  const coreOptions = owned.filter((m) => archetype.core.includes(facetOf(m)));
  if (!coreOptions.length) return null;
  const core = rng.pick(coreOptions);
  const coreNote = mainNote(core);

  const accentOptions = owned.filter((m) => m.id !== core.id && archetype.accent.includes(facetOf(m)) && mainNote(m) !== coreNote);
  if (!accentOptions.length) return null;
  const accent = rng.pick(accentOptions);
  const accentNote = mainNote(accent);

  const baseOptions = owned.filter((m) => m.phase === 'base' && m.id !== core.id && m.id !== accent.id
    && archetype.base.includes(facetOf(m)) && facetOf(m) !== facetOf(core) && v.baseWishes[facetOf(m)]
    && mainNote(m) !== coreNote && mainNote(m) !== accentNote);
  if (!baseOptions.length) return null;
  const base = rng.pick(baseOptions);
  const baseFacet = facetOf(base);
  const baseVocab = v.baseWishes[baseFacet]!;

  let trace: Material | null = null;
  if (rng.chance(g.traceChance)) {
    const usedNotes = new Set([coreNote, accentNote, mainNote(base)]);
    const options = owned.filter((m) => ![core.id, accent.id, base.id].includes(m.id) && !usedNotes.has(mainNote(m)));
    if (options.length) trace = rng.pick(options);
  }

  const wishes: Wish[] = [
    { kind: 'note', role: 'core', note: coreNote, min: v.roles.core.min, max: v.roles.core.max, label: noteLabel(catalog, coreNote) },
    { kind: 'note', role: 'accent', note: accentNote, min: v.roles.accent.min, max: v.roles.accent.max, label: noteLabel(catalog, accentNote) },
    { kind: 'facet', role: 'base', facets: [baseFacet], min: baseVocab.min, label: baseVocab.label },
  ];
  if (trace) {
    const traceNote = mainNote(trace);
    wishes.push({ kind: 'note', role: 'trace', note: traceNote, min: v.roles.trace.min, max: v.roles.trace.max, label: noteLabel(catalog, traceNote) });
  }
  const group = archetype.group && rng.chance(g.groupChance) ? v.groups[archetype.group] : undefined;
  if (group) wishes.push({ kind: 'group', role: 'group', facets: group.facets, min: group.min, label: group.label });
  const ceilingFacet = archetype.ceiling && rng.chance(g.ceilingChance) ? archetype.ceiling : null;
  const ceiling = ceilingFacet ? v.ceilings[ceilingFacet] : undefined;
  if (ceilingFacet && ceiling) wishes.push({ kind: 'ceiling', role: 'ceiling', facets: [ceilingFacet as Facet], max: ceiling.max, label: ceiling.label });

  // Target shares, leaving the base enough room to meet its wish.
  let c = rng.range(...v.roles.core.target);
  let a = rng.range(...v.roles.accent.target);
  const t = trace ? rng.range(...v.roles.trace.target) : 0;
  const neededBase = (baseVocab.min + 2 * g.rangeMargin) / (base.facets[baseFacet] ?? 1);
  let b = 1 - c - a - t;
  if (b < neededBase) {
    let deficit = neededBase - b;
    const takeC = Math.min(deficit, Math.max(0, c - (v.roles.core.min + 0.04)));
    c -= takeC;
    deficit -= takeC;
    const takeA = Math.min(deficit, Math.max(0, a - (v.roles.accent.min + 0.025)));
    a -= takeA;
    b = 1 - c - a - t;
    if (b < neededBase - 1e-9) return null;
  }
  const targets: [Material, number][] = [[core, c], [accent, a], [base, b]];
  if (trace) targets.push([trace, t]);

  const ideal = fitDrops(targets, wishes, catalog);
  if (!ideal) return null;
  const idealProfile = blendProfile(ideal, catalog);
  if (!wishes.every((w) => evaluateWish(w, wishValueFor(w, ideal, catalog), catalog).inRange)) return null;

  const noGos: NoGo[] = [];
  if (rng.chance(g.noGoChance)) {
    const options = archetype.noGos.filter((f) => idealProfile[f] <= 0.005 && v.noGos[f]);
    if (options.length) {
      const f = rng.pick(options);
      const ng = v.noGos[f]!;
      noGos.push({ facets: [f], max: ng.max, label: ng.label });
    }
  }

  const extras: string[] = [];
  if (ceiling) extras.push(ceiling.phrase);
  for (const ng of noGos) extras.push(v.noGos[ng.facets[0]!]!.phrase);
  const text = composeText(rng, {
    core: coreNote, accent: accentNote, basePhrase: rng.pick(baseVocab.phrases),
    trace: trace ? mainNote(trace) : undefined, opener: group?.opener, extras,
  }, catalog);

  const [format, sizeMl] = pickFormat(rng, type);
  const name = rng.pick(catalog.customers.names);
  return {
    customer: { name, type: type.id },
    text,
    archetype: archetype.id,
    format,
    sizeMl,
    concentrateGrams: concentrateGrams(format, sizeMl, catalog),
    wishes,
    noGos,
    ideal,
    idealProfile,
    price: requestPrice({
      format, sizeMl, budget: type.budget, asks: wishes.length + noGos.length,
      maxTier: maxTier(ideal, catalog), bottleMultiplier: 1, stars: ctx.stars,
    }, catalog),
  };
}

/** A customer and request built from the player's own shelf, so it can always be solved. */
export function generateRequest(seed: number, ctx: RequestContext, catalog: Catalog): Request {
  const rng = createRng(seed);
  const owned = ctx.owned.map((id) => material(catalog, id));
  for (let attempt = 0; attempt < catalog.scoring.generator.attempts; attempt++) {
    const type = rng.pick(catalog.customers.types);
    const archetypeId = rng.weighted(type.archetypes);
    const archetype = catalog.vocab.archetypes.find((a) => a.id === archetypeId);
    if (!archetype) continue;
    const built = tryBuild(rng, archetype, type, owned, ctx, catalog);
    if (built) return { id: `gen-${seed}`, ...built };
  }
  throw new Error(`Could not generate a request for seed ${seed}`);
}
