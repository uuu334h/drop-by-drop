export const FACETS = [
  'citrus', 'green', 'aromatic', 'aquatic', 'fruity', 'floral', 'spicy',
  'gourmand', 'powdery', 'woody', 'ambery', 'musky', 'animalic',
] as const;

export type Facet = (typeof FACETS)[number];
export type Phase = 'top' | 'heart' | 'base';
export type FacetWeights = Partial<Record<Facet, number>>;
/** Share of the scent per facet. Sums to 1 for a non-empty blend. */
export type Profile = Record<Facet, number>;

export interface FacetInfo {
  id: Facet;
  label: string;
  color: string;
}

export interface NoteInfo {
  id: string;
  label: string;
  adjective?: string;
}

export interface Material {
  id: string;
  name: string;
  /** Short label for the bottle on the organ. */
  short: string;
  tier: number;
  unlockRank: number;
  /** Note id -> how much of the material counts as that note (0..1). */
  notes: Record<string, number>;
  /** Facet weights, summing to 1. */
  facets: FacetWeights;
  /** Facets that score from the start but stay off the card until discovered. */
  hiddenFacets: Facet[];
  phase: Phase;
  /** How loud one drop is, 1..8. */
  potency: number;
  coinsPerGram: number;
  packGrams: number;
  deliverySeconds: number;
  card: string;
  hiddenCard?: string;
}

/** Material id -> drops in the beaker. */
export type Blend = Record<string, number>;

export type WishKind = 'note' | 'facet' | 'group' | 'ceiling';
export type WishRole = 'core' | 'accent' | 'trace' | 'base' | 'group' | 'ceiling';

export interface Wish {
  kind: WishKind;
  role: WishRole;
  /** For note wishes. */
  note?: string;
  /** For facet, group and ceiling wishes: the facets summed together. */
  facets?: Facet[];
  min?: number;
  max?: number;
  label: string;
}

export interface NoGo {
  facets: Facet[];
  max: number;
  label: string;
}

export type FormatId = 'edc' | 'edt' | 'edp' | 'extrait';
export type BandId = 'signature' | 'full' | 'close' | 'off' | 'flop';

export interface Customer {
  name: string;
  type: string;
}

export interface Request {
  id: string;
  customer: Customer;
  text: string;
  archetype: string;
  format: FormatId;
  sizeMl: number;
  concentrateGrams: number;
  wishes: Wish[];
  noGos: NoGo[];
  /** The hidden formula the generator (or a designer) had in mind. */
  ideal: Blend;
  idealProfile: Profile;
  price: number;
  /** Tutorial only: the bottles the player may use. */
  allowed?: string[];
  /** Tutorial only: Odile's notes, keyed by moment or material id. */
  hints?: Record<string, string>;
}

export interface RoleRange {
  min: number;
  max: number;
  target: [number, number];
}

export interface Archetype {
  id: string;
  core: Facet[];
  accent: Facet[];
  base: Facet[];
  group: string | null;
  ceiling: string | null;
  noGos: Facet[];
}

export interface Vocabulary {
  roles: Record<'core' | 'accent' | 'trace', RoleRange>;
  baseWishes: Record<string, { min: number; label: string; phrases: string[] }>;
  groups: Record<string, { facets: Facet[]; min: number; label: string; opener: string }>;
  ceilings: Record<string, { max: number; label: string; phrase: string }>;
  noGos: Record<string, { max: number; label: string; phrase: string }>;
  archetypes: Archetype[];
  templates: { plain: string[]; group: string[]; trace: string };
}

export interface CustomerType {
  id: string;
  label: string;
  budget: number;
  /** [format, size in ml, weight] */
  formats: [FormatId, number, number][];
  /** archetype id -> weight */
  archetypes: Record<string, number>;
}

export interface CustomerData {
  types: CustomerType[];
  names: string[];
  reviews: Record<BandId, string[]>;
}

export interface BandInfo {
  id: BandId;
  label: string;
  min: number;
  pay: number;
  tip: number;
  stars: number;
  xp: number;
}

export interface PriceData {
  formats: Record<FormatId, { label: string; concentration: number }>;
  basePrice: Record<FormatId, Record<string, number>>;
  bands: BandInfo[];
  fullFiveStarScore: number;
  bottles: { id: string; label: string; cost: number; multiplier: number }[];
  dropGrams: number;
  beakerDrops: number;
  freeBlotters: number;
  remakes: number;
  reputationPrior: { stars: number; weight: number; window: number };
  xpPerBandPoint: number;
  rankXp: number[];
}

export interface ScoringData {
  weights: { wishes: number; profile: number; structure: number };
  structureFromRank: number;
  tolerance: { twoSidedMin: number; oneSided: number };
  cosineFloor: number;
  capWhenWishMissed: number;
  capWhenNoGoBroken: number;
  generator: {
    dropTotals: [number, number];
    dropTotalPenalty: number;
    rangeMargin: number;
    traceChance: number;
    groupChance: number;
    ceilingChance: number;
    noGoChance: number;
    attempts: number;
  };
  feedback: { profileGoodEnough: number; absentBelow: number };
}

export interface TutorialWish {
  kind: WishKind;
  role: WishRole;
  note?: string;
  facets?: Facet[];
  min?: number;
  max?: number;
  label?: string;
}

export interface TutorialRequest {
  id: string;
  customer: Customer;
  text: string;
  format: FormatId;
  sizeMl: number;
  wishes: TutorialWish[];
  noGos: NoGo[];
  ideal: Blend;
  allowed?: string[];
  hints?: Record<string, string>;
}
