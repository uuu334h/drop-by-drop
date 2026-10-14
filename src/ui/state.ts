import {
  authoredRequest, bottleCost, evaluate, feedback, generateRequest, loadCatalog, materialCost,
  payment, rankFor, reputation, starsFor, totalDrops, unlockedMaterials, xpFor,
  type BandId, type Blend, type Request,
} from '../engine';

export const catalog = loadCatalog();

/** Every tester meets the same customers in the same order, so results compare. */
const BASE_SEED = 20261014;
const STATE_KEY = 'dbd.state.v1';
const ARCHIVE_KEY = 'dbd.archive.v1';
const SOUND_KEY = 'dbd.sound.v1';

declare const __BUILD__: string;
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

export interface Pour {
  id: string;
  drops: number;
}

export interface Reaction {
  line: string;
  kind: string;
  band: BandId;
  score: number;
  pays: number;
}

export interface CustomerSession {
  request: Request;
  blend: Blend;
  pours: Pour[];
  blottersUsed: number;
  extraBlotters: number;
  remakesUsed: number;
  undoUsed: boolean;
  undos: number;
  startedAt: number;
  reaction: Reaction | null;
}

export interface SaleResult {
  band: BandId;
  score: number;
  stars: number;
  quote: string;
  paid: number;
  tip: number;
  cost: number;
  bottle: number;
  profit: number;
  xp: number;
  rankBefore: number;
  rankAfter: number;
  discovered: string[];
  doubledTip: boolean;
}

export interface CustomerLog {
  n: number;
  id: string;
  type: string;
  archetype: string;
  text: string;
  price: number;
  drops: Blend;
  score: number;
  band: BandId | 'declined';
  paid: number;
  tip: number;
  cost: number;
  blotters: number;
  extraBlotters: number;
  remakes: number;
  undos: number;
  doubledTip: boolean;
  seconds: number;
  pours: number;
}

export interface GameState {
  v: 1;
  tester: string;
  startedAt: string;
  begun: boolean;
  brand: string | null;
  coins: number;
  xp: number;
  reviews: number[];
  discovered: string[];
  customerNo: number;
  current: CustomerSession;
  sale: SaleResult | null;
  log: CustomerLog[];
  ads: Record<string, number>;
  unlockSeen: number;
}

export type Action =
  | { t: 'begin' }
  | { t: 'drop'; id: string; newPour: boolean }
  | { t: 'blotter' }
  | { t: 'grantBlotter' }
  | { t: 'undoPour' }
  | { t: 'remake' }
  | { t: 'bottle' }
  | { t: 'doubleTip' }
  | { t: 'next' }
  | { t: 'decline' }
  | { t: 'brand'; name: string }
  | { t: 'ad'; placement: string }
  | { t: 'unlockSeen'; rank: number }
  | { t: 'reset' };

export const rankOf = (s: GameState) => rankFor(s.xp, catalog);
export const ownedOf = (s: Pick<GameState, 'xp'>) => unlockedMaterials(rankFor(s.xp, catalog), catalog);
export const starsOf = (s: Pick<GameState, 'reviews'>) => reputation(s.reviews, catalog);
export const discoveredSet = (s: GameState) => new Set(s.discovered);

export function requestFor(n: number, s: Pick<GameState, 'xp' | 'reviews'>): Request {
  const ctx = { owned: ownedOf(s), stars: starsOf(s) };
  const authored = catalog.tutorial[n - 1];
  if (authored) return authoredRequest(authored, ctx, catalog);
  return generateRequest(BASE_SEED + n * 7919, ctx, catalog);
}

function newSession(request: Request): CustomerSession {
  return {
    request, blend: {}, pours: [], blottersUsed: 0, extraBlotters: 0, remakesUsed: 0,
    undoUsed: false, undos: 0, startedAt: Date.now(), reaction: null,
  };
}

export function freshState(): GameState {
  const base = { xp: 0, reviews: [] as number[] };
  return {
    v: 1,
    tester: Math.random().toString(36).slice(2, 6),
    startedAt: new Date().toISOString(),
    begun: false,
    brand: null,
    coins: 0,
    ...base,
    discovered: [],
    customerNo: 1,
    current: newSession(requestFor(1, base)),
    sale: null,
    log: [],
    ads: {},
    unlockSeen: 1,
  };
}

export function blottersLeft(c: CustomerSession): number {
  return catalog.prices.freeBlotters + c.extraBlotters - c.blottersUsed;
}

export function remakesLeft(c: CustomerSession): number {
  return catalog.prices.remakes - c.remakesUsed;
}

export function canUse(c: CustomerSession, id: string): boolean {
  return !c.request.allowed || c.request.allowed.includes(id);
}

function reactionFor(s: GameState, c: CustomerSession): { reaction: Reaction; discovered: string[] } {
  const e = evaluate(c.blend, c.request, catalog);
  const f = feedback(e, c.request, c.blend, catalog, discoveredSet(s));
  return {
    reaction: { line: f.line, kind: f.kind, band: e.band, score: e.score, pays: payment(c.request.price, e.band, catalog).total },
    discovered: f.discovered,
  };
}

function logEntry(s: GameState, sale: SaleResult | null): CustomerLog {
  const c = s.current;
  return {
    n: s.customerNo,
    id: c.request.id,
    type: c.request.customer.type,
    archetype: c.request.archetype,
    text: c.request.text,
    price: c.request.price,
    drops: c.blend,
    score: sale?.score ?? 0,
    band: sale?.band ?? 'declined',
    paid: sale?.paid ?? 0,
    tip: sale?.tip ?? 0,
    cost: sale?.cost ?? 0,
    blotters: c.blottersUsed,
    extraBlotters: c.extraBlotters,
    remakes: c.remakesUsed,
    undos: c.undos,
    doubledTip: false,
    seconds: Math.round((Date.now() - c.startedAt) / 1000),
    pours: c.pours.length,
  };
}

function nextCustomer(s: GameState): GameState {
  const n = s.customerNo + 1;
  return { ...s, customerNo: n, current: newSession(requestFor(n, s)), sale: null };
}

const pickQuote = (band: BandId, n: number) => {
  const quotes = catalog.customers.reviews[band];
  return quotes[n % quotes.length] ?? '';
};

export function reducer(s: GameState, a: Action): GameState {
  const c = s.current;
  switch (a.t) {
    case 'begin':
      return { ...s, begun: true, current: { ...c, startedAt: Date.now() } };

    case 'drop': {
      if (s.sale || !canUse(c, a.id)) return s;
      if (totalDrops(c.blend) >= catalog.prices.beakerDrops) return s;
      const blend = { ...c.blend, [a.id]: (c.blend[a.id] ?? 0) + 1 };
      const last = c.pours[c.pours.length - 1];
      const pours = !a.newPour && last && last.id === a.id
        ? [...c.pours.slice(0, -1), { id: a.id, drops: last.drops + 1 }]
        : [...c.pours, { id: a.id, drops: 1 }];
      return { ...s, current: { ...c, blend, pours } };
    }

    case 'blotter': {
      if (blottersLeft(c) <= 0 || totalDrops(c.blend) === 0) return s;
      const { reaction, discovered } = reactionFor(s, c);
      return {
        ...s,
        discovered: [...new Set([...s.discovered, ...discovered])],
        current: { ...c, blottersUsed: c.blottersUsed + 1, reaction },
      };
    }

    case 'grantBlotter':
      return { ...s, current: { ...c, extraBlotters: c.extraBlotters + 1 } };

    case 'undoPour': {
      const last = c.pours[c.pours.length - 1];
      if (!last || c.undoUsed) return s;
      const left = (c.blend[last.id] ?? 0) - last.drops;
      const blend = { ...c.blend };
      if (left > 0) blend[last.id] = left;
      else delete blend[last.id];
      return { ...s, current: { ...c, blend, pours: c.pours.slice(0, -1), undoUsed: true, undos: c.undos + 1 } };
    }

    case 'remake':
      if (remakesLeft(c) <= 0) return s;
      return { ...s, current: { ...c, blend: {}, pours: [], remakesUsed: c.remakesUsed + 1, undoUsed: false, reaction: null } };

    case 'bottle': {
      if (s.sale || totalDrops(c.blend) === 0) return s;
      const r = c.request;
      const e = evaluate(c.blend, r, catalog);
      const pay = payment(r.price, e.band, catalog);
      const cost = Math.round(materialCost(c.blend, r.concentrateGrams, catalog));
      const bottle = bottleCost(catalog);
      const xp = xpFor(e.band, catalog);
      const f = feedback(e, r, c.blend, catalog, discoveredSet(s));
      const discovered = f.kind === 'nogo' || f.kind === 'extra' ? f.discovered : [];
      const sale: SaleResult = {
        band: e.band,
        score: e.score,
        stars: starsFor(e.band, e.score, catalog),
        quote: pickQuote(e.band, s.customerNo),
        paid: pay.paid,
        tip: pay.tip,
        cost,
        bottle,
        profit: pay.total - cost - bottle,
        xp,
        rankBefore: rankFor(s.xp, catalog),
        rankAfter: rankFor(s.xp + xp, catalog),
        discovered,
        doubledTip: false,
      };
      return {
        ...s,
        sale,
        coins: s.coins + sale.profit,
        xp: s.xp + xp,
        reviews: [...s.reviews, sale.stars],
        discovered: [...new Set([...s.discovered, ...discovered])],
        log: [...s.log, logEntry(s, sale)],
      };
    }

    case 'doubleTip': {
      if (!s.sale || s.sale.doubledTip || s.sale.tip <= 0) return s;
      const log = s.log.map((l, i) => (i === s.log.length - 1 ? { ...l, doubledTip: true, tip: l.tip * 2 } : l));
      return { ...s, coins: s.coins + s.sale.tip, sale: { ...s.sale, doubledTip: true }, log };
    }

    case 'next':
      return nextCustomer(s);

    case 'decline':
      if (s.sale) return s;
      return nextCustomer({ ...s, log: [...s.log, logEntry(s, null)] });

    case 'brand':
      return { ...s, brand: a.name.trim().slice(0, 28) || null };

    case 'ad':
      return { ...s, ads: { ...s.ads, [a.placement]: (s.ads[a.placement] ?? 0) + 1 } };

    case 'unlockSeen':
      return { ...s, unlockSeen: Math.max(s.unlockSeen, a.rank) };

    case 'reset':
      archive(s);
      return { ...freshState(), begun: true };
  }
}

// Storage: a convenience only. The game runs fine when the browser refuses it.

export function loadState(): GameState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as GameState;
      if (s.v === 1 && s.current?.request) return s;
    }
  } catch {
    /* storage unavailable */
  }
  return freshState();
}

export function saveState(s: GameState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable */
  }
}

function readArchive(): object[] {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? '[]') as object[];
  } catch {
    return [];
  }
}

function archive(s: GameState): void {
  if (!s.log.length) return;
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...readArchive(), summary(s)]));
  } catch {
    /* storage unavailable */
  }
}

export function archivedCount(): number {
  return readArchive().length;
}

export function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSound(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
}

// Results export

export function stats(s: GameState) {
  const served = s.log.filter((l) => l.band !== 'declined');
  const fullOrBetter = served.filter((l) => l.band === 'signature' || l.band === 'full').length;
  const seconds = served.reduce((sum, l) => sum + l.seconds, 0);
  const bands: Record<string, number> = {};
  for (const l of s.log) bands[l.band] = (bands[l.band] ?? 0) + 1;
  return {
    served: served.length,
    fullOrBetter,
    avgSeconds: served.length ? Math.round(seconds / served.length) : 0,
    avgScore: served.length ? Math.round(served.reduce((sum, l) => sum + l.score, 0) / served.length) : 0,
    bands,
  };
}

export function summary(s: GameState) {
  return {
    game: 'drop-by-drop',
    build: BUILD,
    tester: s.tester,
    startedAt: s.startedAt,
    brand: s.brand,
    coins: s.coins,
    rank: rankOf(s),
    ...stats(s),
    ads: s.ads,
    discovered: s.discovered,
    screen: typeof window === 'undefined' ? null : `${window.innerWidth}x${window.innerHeight}`,
    log: s.log,
  };
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export function resultsText(s: GameState, includeArchive: boolean): string {
  const st = stats(s);
  const head = `Drop by Drop playtest · tester ${s.tester} · ${st.served} perfumes · ${st.fullOrBetter} Full or better · ${mmss(st.avgSeconds)} per perfume`;
  const sessions = includeArchive ? [...readArchive(), summary(s)] : [summary(s)];
  return `${head}\n${JSON.stringify(sessions)}`;
}
