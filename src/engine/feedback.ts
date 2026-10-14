import { material, type Catalog } from './catalog';
import type { Evaluation, WishResult } from './score';
import { FACETS, type Blend, type Facet, type Request } from './types';

export type FeedbackKind =
  | 'nogo' | 'note-high' | 'note-low' | 'note-absent' | 'base-low' | 'group-low'
  | 'ceiling-high' | 'extra' | 'signature' | 'full' | 'close' | 'empty';

export interface Feedback {
  line: string;
  kind: FeedbackKind;
  /** The note id or facet the line is about. */
  subject?: string;
  /** Hidden facets this line gave away, as "materialId:facet". */
  discovered: string[];
}

const NOGO_LINES: Partial<Record<Facet, string>> = {
  animalic: "There's something dirty in there. I said nothing animalic.",
  spicy: "That's spicy. I asked for no spice.",
};

const BASE_LOW: Partial<Record<Facet, string>> = {
  musky: 'It needs something soft at the end.',
  woody: 'It needs more wood at the end.',
  gourmand: 'It needs a sweeter, creamier base.',
  ambery: 'It needs more warmth underneath.',
  powdery: 'It needs a softer, powdery finish.',
};

const EXTRA: Record<Facet, string> = {
  citrus: "There's a citrus note I didn't ask for.",
  green: 'Why does it smell like cut stems?',
  aromatic: "It smells a bit herbal. I didn't ask for that.",
  aquatic: 'Why does it smell like the sea?',
  fruity: "It's fruitier than I wanted.",
  floral: "It's more floral than I asked for.",
  spicy: "There's a spicy edge I didn't ask for.",
  gourmand: "It's sweeter than I imagined.",
  powdery: "It's a bit powdery for me.",
  woody: 'Why does it smell like a pencil box?',
  ambery: "It's heavier and warmer than I wanted.",
  musky: "It's muskier than I asked for.",
  animalic: "There's something dirty in there.",
};

const ROLE_ORDER = ['core', 'base', 'accent', 'group', 'ceiling', 'trace'];

function revealed(facet: Facet, blend: Blend, catalog: Catalog, discovered: ReadonlySet<string>): string[] {
  const keys: string[] = [];
  for (const [id, drops] of Object.entries(blend)) {
    if (drops <= 0) continue;
    const m = material(catalog, id);
    const key = `${id}:${facet}`;
    if (m.hiddenFacets.includes(facet) && !discovered.has(key)) keys.push(key);
  }
  return keys;
}

function worstWish(wishes: WishResult[]): WishResult | null {
  const missed = wishes.filter((w) => !w.inRange);
  if (!missed.length) return null;
  missed.sort((a, b) => a.score - b.score || ROLE_ORDER.indexOf(a.wish.role) - ROLE_ORDER.indexOf(b.wish.role));
  return missed[0]!;
}

function wishLine(w: WishResult, catalog: Catalog): Pick<Feedback, 'line' | 'kind' | 'subject'> {
  const { wish } = w;
  const label = wish.label;
  if (wish.kind === 'note') {
    if (w.gap > 0) {
      return wish.role === 'core'
        ? { line: `It's all ${label}. Too much.`, kind: 'note-high', subject: wish.note }
        : { line: `The ${label} is shouting.`, kind: 'note-high', subject: wish.note };
    }
    if (w.value < catalog.scoring.feedback.absentBelow) {
      return { line: `I can't smell any ${label}.`, kind: 'note-absent', subject: wish.note };
    }
    if (wish.role === 'core') return { line: `I want more ${label}. It's the heart of it.`, kind: 'note-low', subject: wish.note };
    if (wish.role === 'trace') return { line: `Where's that hint of ${label}?`, kind: 'note-low', subject: wish.note };
    return { line: `I can barely smell the ${label}.`, kind: 'note-low', subject: wish.note };
  }
  const facet = wish.facets?.[0];
  if (wish.kind === 'ceiling') {
    return { line: facet === 'gourmand' ? "It's too sweet for me." : `There's too much ${label}.`, kind: 'ceiling-high', subject: facet };
  }
  if (wish.kind === 'group') {
    return wish.facets?.includes('citrus')
      ? { line: "It doesn't feel fresh enough.", kind: 'group-low', subject: 'fresh' }
      : { line: 'I wanted it cozier and warmer.', kind: 'group-low', subject: 'cozy' };
  }
  const line = (facet && BASE_LOW[facet]) ?? `It needs more ${label}.`;
  return { line, kind: 'base-low', subject: facet };
}

/** The customer's one-line reaction to a blotter: the biggest problem first, never the fix. */
export function feedback(evaluation: Evaluation, request: Request, blend: Blend, catalog: Catalog, discovered: ReadonlySet<string>): Feedback {
  if (evaluation.score === 0 && Object.values(blend).every((d) => d <= 0)) {
    return { line: 'The blotter is dry. Add some drops first.', kind: 'empty', discovered: [] };
  }

  const broken = evaluation.noGos.find((n) => n.broken);
  if (broken) {
    const facet = broken.noGo.facets[0]!;
    return {
      line: NOGO_LINES[facet] ?? `There's ${broken.noGo.label} in there. I said none.`,
      kind: 'nogo', subject: facet,
      discovered: revealed(facet, blend, catalog, discovered),
    };
  }

  const worst = worstWish(evaluation.wishes);
  if (worst) return { ...wishLine(worst, catalog), discovered: [] };

  if (evaluation.profileScore < catalog.scoring.feedback.profileGoodEnough) {
    let extra: Facet | null = null;
    let most = 0.04;
    for (const f of FACETS) {
      const diff = evaluation.profile[f] - request.idealProfile[f];
      if (diff > most) {
        most = diff;
        extra = f;
      }
    }
    if (extra) {
      return { line: EXTRA[extra], kind: 'extra', subject: extra, discovered: revealed(extra, blend, catalog, discovered) };
    }
    return { line: "It's close, but something feels a little off.", kind: 'close', discovered: [] };
  }

  if (evaluation.band === 'signature') return { line: "That's exactly it!", kind: 'signature', discovered: [] };
  return { line: 'Lovely. Very close to what I imagined.', kind: 'full', discovered: [] };
}
