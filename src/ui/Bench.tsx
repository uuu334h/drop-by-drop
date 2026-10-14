import { material, type Material, type Request } from '../engine';
import { Coin, Info, Menu, Star } from './icons';
import { facetColor, facetLabel, initials, materialColor, phaseLabel, potencyWord, typeTint } from './look';
import { catalog } from './state';

export function TopBar(props: { house: string; coins: number; stars: number; rank: number; rankProgress: number; onMenu: () => void }) {
  return (
    <header class="topbar">
      <div class="house">
        <span class="house-name">{props.house}</span>
        <span class="rank" aria-label={`Rank ${props.rank}`}>
          Rank {props.rank}
          <span class="rank-bar" aria-hidden="true"><span style={{ width: `${Math.round(props.rankProgress * 100)}%` }} /></span>
        </span>
      </div>
      <div class="meters">
        <span class="meter" aria-label={`${props.coins} coins`}><Coin /> {props.coins}</span>
        <span class="meter" aria-label={`Reputation ${props.stars.toFixed(1)} stars`}><Star /> {props.stars.toFixed(1)}</span>
        <button type="button" class="icon-btn" aria-label="Menu and results" onClick={props.onMenu}><Menu /></button>
      </div>
    </header>
  );
}

export function CustomerCard({ request, onDecline }: { request: Request; onDecline: () => void }) {
  const type = catalog.customers.types.find((t) => t.id === request.customer.type);
  const format = catalog.prices.formats[request.format].label;
  return (
    <section class="customer" aria-label="Customer order">
      <div class="customer-head">
        <span class="avatar" style={{ background: typeTint(request.customer.type) }} aria-hidden="true">
          {initials(request.customer.name)}
        </span>
        <div class="who">
          <span class="who-name">{request.customer.name}</span>
          <span class="who-type">{type?.label ?? request.customer.type}</span>
        </div>
        <div class="offer">
          <span class="offer-num"><Coin size={15} /> {request.price}</span>
          <span class="offer-label">offered</span>
        </div>
      </div>
      <p class="request">“{request.text}”</p>
      <div class="ticket-foot">
        <span>{format} · {request.sizeMl} ml · {request.concentrateGrams} g of concentrate</span>
        <button type="button" class="link-btn" onClick={onDecline}>Decline</button>
      </div>
    </section>
  );
}

export function Hint({ text }: { text: string }) {
  return (
    <div class="hint" role="note">
      <span class="hint-from">Odile’s note</span>
      <span class="hint-text">{text}</span>
    </div>
  );
}

function visibleFacets(m: Material, discovered: ReadonlySet<string>) {
  return Object.entries(m.facets)
    .filter(([f]) => !m.hiddenFacets.includes(f as never) || discovered.has(`${m.id}:${f}`))
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
}

export function Organ(props: {
  owned: string[];
  blendDrops: Record<string, number>;
  selected: string | null;
  allowed?: string[];
  onPick: (id: string) => void;
}) {
  return (
    <section class="organ" aria-label="Your materials">
      {props.owned.map((id) => {
        const m = material(catalog, id);
        const off = props.allowed ? !props.allowed.includes(id) : false;
        const drops = props.blendDrops[id] ?? 0;
        const loud = m.potency >= 5;
        return (
          <button
            key={id}
            type="button"
            class={`bottle${props.selected === id ? ' is-selected' : ''}${off ? ' is-off' : ''}`}
            aria-pressed={props.selected === id}
            aria-label={`${m.name}, potency ${m.potency}${drops ? `, ${drops} drops in the beaker` : ''}`}
            onClick={() => props.onPick(id)}
          >
            <span class="flacon" aria-hidden="true">
              <span class="flacon-liquid" style={{ background: materialColor(m) }} />
            </span>
            <span class={`potency${loud ? ' is-loud' : ''}`} aria-hidden="true">{m.potency}</span>
            {drops > 0 && <span class="in-beaker" aria-hidden="true">{drops}</span>}
            <span class="bottle-name">{m.short}</span>
          </button>
        );
      })}
    </section>
  );
}

export function MaterialStrip({ id, discovered, onCard }: { id: string | null; discovered: ReadonlySet<string>; onCard: () => void }) {
  if (!id) return <div class="strip strip-empty">Tap a bottle to pick it, then tap the beaker.</div>;
  const m = material(catalog, id);
  return (
    <div class="strip">
      <div class="strip-main">
        <span class="strip-name">{m.name}</span>
        <span class="strip-meta">{phaseLabel[m.phase]} · potency {m.potency}, {potencyWord(m.potency)}</span>
        <span class="chips">
          {visibleFacets(m, discovered).map(([f, w]) => (
            <span key={f} class="chip">
              <span class="dot" style={{ background: facetColor(f) }} />{facetLabel(f)} {Math.round((w ?? 0) * 100)}
            </span>
          ))}
        </span>
      </div>
      <button type="button" class="icon-btn card-btn" onClick={onCard} aria-label={`Open the card for ${m.name}`}><Info /> Card</button>
    </div>
  );
}

export function Actions(props: {
  blotters: number;
  remakes: number;
  hasDrops: boolean;
  confirmRemake: boolean;
  onBlotter: () => void;
  onRemake: () => void;
  onBottle: () => void;
}) {
  return (
    <div class="actions">
      <button type="button" class="btn btn-quiet" disabled={!props.hasDrops} onClick={props.onBlotter}>
        Blotter <span class="count">{props.blotters > 0 ? props.blotters : 'ad'}</span>
      </button>
      <button
        type="button"
        class={`btn btn-quiet${props.confirmRemake ? ' is-warn' : ''}`}
        disabled={!props.hasDrops || props.remakes <= 0}
        onClick={props.onRemake}
      >
        {props.confirmRemake ? 'Tap to pour away' : <>Remake <span class="count">{props.remakes}</span></>}
      </button>
      <button type="button" class="btn btn-main" disabled={!props.hasDrops} onClick={props.onBottle}>
        Bottle it
      </button>
    </div>
  );
}
