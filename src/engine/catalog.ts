import facetsJson from '../../data/facets.json';
import notesJson from '../../data/notes.json';
import materialsJson from '../../data/materials.json';
import requestsJson from '../../data/requests.json';
import customersJson from '../../data/customers.json';
import pricesJson from '../../data/prices.json';
import scoringJson from '../../data/scoring.json';
import tutorialJson from '../../data/tutorial.json';
import type {
  CustomerData, FacetInfo, Material, NoteInfo, PriceData, ScoringData,
  TutorialRequest, Vocabulary,
} from './types';

/** Everything the rules read, loaded from `data/`. Pass it into every engine call. */
export interface Catalog {
  facets: FacetInfo[];
  notes: Map<string, NoteInfo>;
  materials: Map<string, Material>;
  materialList: Material[];
  vocab: Vocabulary;
  customers: CustomerData;
  prices: PriceData;
  scoring: ScoringData;
  tutorial: TutorialRequest[];
}

export function loadCatalog(): Catalog {
  const materialList = materialsJson as unknown as Material[];
  const notes = notesJson as unknown as NoteInfo[];
  return {
    facets: facetsJson as unknown as FacetInfo[],
    notes: new Map(notes.map((n) => [n.id, n])),
    materials: new Map(materialList.map((m) => [m.id, m])),
    materialList,
    vocab: requestsJson as unknown as Vocabulary,
    customers: customersJson as unknown as CustomerData,
    prices: pricesJson as unknown as PriceData,
    scoring: scoringJson as unknown as ScoringData,
    tutorial: tutorialJson as unknown as TutorialRequest[],
  };
}

export function material(catalog: Catalog, id: string): Material {
  const m = catalog.materials.get(id);
  if (!m) throw new Error(`Unknown material: ${id}`);
  return m;
}

/** The material's strongest note: what a customer would call it. */
export function mainNote(m: Material): string {
  let best = '';
  let bestWeight = -1;
  for (const [note, weight] of Object.entries(m.notes)) {
    if (weight > bestWeight) {
      best = note;
      bestWeight = weight;
    }
  }
  return best;
}

/** The material's strongest facet. */
export function topFacet(m: Material): string {
  let best = '';
  let bestWeight = -1;
  for (const [facet, weight] of Object.entries(m.facets)) {
    if ((weight ?? 0) > bestWeight) {
      best = facet;
      bestWeight = weight ?? 0;
    }
  }
  return best;
}

export function noteLabel(catalog: Catalog, noteId: string): string {
  return catalog.notes.get(noteId)?.label ?? noteId;
}
