import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { bandInfo, material, noteLabel, type BandId, type Material, type Request } from '../engine';
import { Coin, Stars } from './icons';
import { facetColor, facetLabel, formatShort, initials, materialColor, phaseLabel, potencyWord, typeTint } from './look';
import { BUILD, catalog, type Reaction, type SaleResult } from './state';

function Sheet(props: { title: string; eyebrow?: string; onClose?: () => void; children: ComponentChildren; wide?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const first = panel.current?.querySelector<HTMLElement>('[data-autofocus], button:not([disabled]), input');
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.onClose) props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div class="sheet-backdrop" onClick={(e) => { if (e.target === e.currentTarget) props.onClose?.(); }}>
      <div class={`sheet${props.wide ? ' sheet-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={panel}>
        {props.eyebrow && <div class="eyebrow">{props.eyebrow}</div>}
        <h2 id="sheet-title" class="sheet-title">{props.title}</h2>
        {props.children}
      </div>
    </div>
  );
}

export function Welcome({ onBegin }: { onBegin: () => void }) {
  return (
    <div class="welcome">
      <div class="welcome-card">
        <div class="eyebrow">A perfume workshop</div>
        <h1 class="welcome-title">Drop by Drop</h1>
        <div class="letter">
          <p>My dear,</p>
          <p>The workshop is yours now. There are only ten bottles left on the shelf, but ten is plenty to begin.</p>
          <p>Listen to what people ask for, count your drops, and trust the blotter. Some materials shout. Some whisper. A few hide secrets.</p>
          <p class="sign">Odile</p>
        </div>
        <button type="button" class="btn btn-main btn-wide" onClick={onBegin} data-autofocus>Open the workshop</button>
        <p class="fine">Playtest build {BUILD}. Ads in this test are pretend.</p>
      </div>
    </div>
  );
}

function BandChip({ band }: { band: BandId }) {
  return <span class={`band band-${band}`}>{bandInfo(band, catalog).label}</span>;
}

function Discovery({ keys }: { keys: string[] }) {
  if (!keys.length) return null;
  return (
    <>
      {keys.map((k) => {
        const [id] = k.split(':');
        const m = material(catalog, id!);
        return (
          <p key={k} class="discovery">
            <strong>New in your notebook.</strong> {m.hiddenCard ?? `${m.name} has a hidden side.`}
          </p>
        );
      })}
    </>
  );
}

export function BlotterSheet(props: { request: Request; reaction: Reaction; discovered: string[]; blottersLeft: number; onKeep: () => void; onBottle: () => void }) {
  const { request, reaction } = props;
  return (
    <Sheet eyebrow="Blotter test" title={`${request.customer.name} smells the blotter`} onClose={props.onKeep}>
      <div class="reaction">
        <span class="avatar" style={{ background: typeTint(request.customer.type) }} aria-hidden="true">{initials(request.customer.name)}</span>
        <p class="reaction-line">“{reaction.line}”</p>
      </div>
      <p class="would-sell">Would sell as <BandChip band={reaction.band} /> for <Coin size={14} /> {reaction.pays}</p>
      <Discovery keys={props.discovered} />
      <p class="fine">{props.blottersLeft > 0 ? `${props.blottersLeft} free blotter${props.blottersLeft === 1 ? '' : 's'} left for this customer.` : 'No free blotters left. More cost an ad.'}</p>
      <div class="sheet-actions">
        <button type="button" class="btn btn-quiet" onClick={props.onBottle}>Bottle it now</button>
        <button type="button" class="btn btn-main" onClick={props.onKeep} data-autofocus>Keep working</button>
      </div>
    </Sheet>
  );
}

export function BottleArt({ brand, color, line }: { brand: string; color: string; line: string }) {
  return (
    <svg class="bottle-art" viewBox="0 0 160 190" role="img" aria-label={`A bottle labelled ${brand}`}>
      <rect x="62" y="8" width="36" height="26" rx="4" fill="#3b3128" />
      <rect x="70" y="32" width="20" height="14" fill="#c9b48e" />
      <path d="M28 64 Q28 46 46 46 L114 46 Q132 46 132 64 L132 166 Q132 182 116 182 L44 182 Q28 182 28 166 Z" fill="rgba(255,250,240,0.55)" stroke="#8a6a40" stroke-width="2" />
      <path d="M34 92 L126 92 L126 164 Q126 176 114 176 L46 176 Q34 176 34 164 Z" fill={color} opacity="0.85" />
      <rect x="38" y="102" width="84" height="52" rx="3" fill="#F3EADB" stroke="#B8935A" stroke-width="1.2" />
      <text x="80" y="124" text-anchor="middle" class="label-brand">{brand.length > 16 ? `${brand.slice(0, 15)}…` : brand}</text>
      <text x="80" y="140" text-anchor="middle" class="label-line">{line}</text>
      <path d="M40 58 Q44 52 52 52" stroke="rgba(255,255,255,0.8)" stroke-width="3" fill="none" stroke-linecap="round" />
    </svg>
  );
}

export function SaleSheet(props: {
  request: Request;
  sale: SaleResult;
  brand: string;
  color: string;
  onDoubleTip: () => void;
  onNext: () => void;
}) {
  const { sale, request } = props;
  const format = catalog.prices.formats[request.format].label;
  const good = sale.band === 'signature' || sale.band === 'full';
  return (
    <Sheet eyebrow="Sold" title={bandInfo(sale.band, catalog).label}>
      <div class="sale-head">
        <Stars value={sale.stars} size={18} />
        <span class="score">score {Math.round(sale.score)}</span>
      </div>
      <p class="quote">“{sale.quote}” <span class="quote-by">{request.customer.name}</span></p>
      <div class="sale-body">
        <BottleArt brand={props.brand} color={props.color} line={`${formatShort[request.format]} ${request.sizeMl} ml`} />
        <dl class="money">
          <dt>Paid</dt><dd>{sale.paid}</dd>
          <dt>Tip</dt><dd>{sale.tip > 0 ? `+${sale.tip * (sale.doubledTip ? 2 : 1)}` : '0'}</dd>
          <dt>Materials</dt><dd>−{sale.cost}</dd>
          <dt>Bottle</dt><dd>−{sale.bottle}</dd>
          <dt class="total">Profit</dt>
          <dd class={`total ${sale.profit + (sale.doubledTip ? sale.tip : 0) >= 0 ? 'up' : 'down'}`}>
            {sale.profit + (sale.doubledTip ? sale.tip : 0) >= 0 ? '+' : '−'}{Math.abs(sale.profit + (sale.doubledTip ? sale.tip : 0))}
          </dd>
        </dl>
      </div>
      <p class="xp">+{sale.xp} XP{sale.rankAfter > sale.rankBefore ? ` · Rank ${sale.rankAfter}!` : ''}</p>
      <Discovery keys={sale.discovered} />
      {!good && <p class="fine">Tip: test on a blotter before you bottle. The customer tells you what’s missing.</p>}
      <div class="sheet-actions">
        {sale.tip > 0 && !sale.doubledTip && (
          <button type="button" class="btn btn-quiet" onClick={props.onDoubleTip}>Double the tip · ad</button>
        )}
        <button type="button" class="btn btn-main" onClick={props.onNext} data-autofocus>Next customer</button>
      </div>
    </Sheet>
  );
}

export function BrandSheet({ onSave, onLater, color }: { onSave: (name: string) => void; onLater: () => void; color: string }) {
  const [name, setName] = useState('');
  return (
    <Sheet eyebrow="Your first sale" title="Every house needs a name">
      <p>It goes on every label you sell. You can change it later, for a price.</p>
      <form
        class="brand-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name);
        }}
      >
        <label for="brand-name" class="field-label">House name</label>
        <input
          id="brand-name"
          class="field"
          maxLength={28}
          autoComplete="off"
          placeholder="Maison Clara"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          data-autofocus
        />
        <BottleArt brand={name.trim() || 'Your house'} color={color} line="EdP 50 ml" />
        <div class="sheet-actions">
          <button type="button" class="btn btn-quiet" onClick={onLater}>Later</button>
          <button type="submit" class="btn btn-main" disabled={!name.trim()}>Name my house</button>
        </div>
      </form>
    </Sheet>
  );
}

export function CardSheet({ id, discovered, drops, onClose }: { id: string; discovered: ReadonlySet<string>; drops: number; onClose: () => void }) {
  const m: Material = material(catalog, id);
  const facets = Object.entries(m.facets).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const notes = Object.entries(m.notes).map(([n, w]) => (w < 1 ? `${noteLabel(catalog, n)} (partly)` : noteLabel(catalog, n))).join(', ');
  return (
    <Sheet eyebrow={phaseLabel[m.phase]} title={m.name} onClose={onClose}>
      <div class="card-top">
        <span class="flacon flacon-big" aria-hidden="true"><span class="flacon-liquid" style={{ background: materialColor(m) }} /></span>
        <div>
          <p class="card-text">{m.card}</p>
          <p class="fine">Customers call it {notes}.</p>
        </div>
      </div>
      <div class="potency-row" aria-label={`Potency ${m.potency} of 8, ${potencyWord(m.potency)}`}>
        <span class="field-label">Potency</span>
        <span class="pips">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <span key={i} class={`pip${i <= m.potency ? ' on' : ''}${i <= m.potency && m.potency >= 5 ? ' loud' : ''}`} />)}</span>
        <span class="pip-word">{m.potency} · {potencyWord(m.potency)}</span>
      </div>
      <ul class="bars">
        {facets
          .filter(([f]) => !m.hiddenFacets.includes(f as never) || discovered.has(`${m.id}:${f}`))
          .map(([f, w]) => (
            <li key={f}>
              <span class="bar-label">{facetLabel(f)}</span>
              <span class="bar-track"><span class="bar-fill" style={{ width: `${Math.round((w ?? 0) * 100)}%`, background: facetColor(f) }} /></span>
              <span class="bar-val">{Math.round((w ?? 0) * 100)}</span>
            </li>
          ))}
      </ul>
      {m.hiddenCard && m.hiddenFacets.some((f) => discovered.has(`${m.id}:${f}`)) && <p class="discovery"><strong>Discovered.</strong> {m.hiddenCard}</p>}
      <p class="fine">{m.coinsPerGram} coins per gram{drops ? ` · ${drops} drops in the beaker now` : ''}</p>
      <div class="sheet-actions">
        <button type="button" class="btn btn-main" onClick={onClose} data-autofocus>Back to the bench</button>
      </div>
    </Sheet>
  );
}

export function AdSheet({ placement, onDone }: { placement: string; onDone: () => void }) {
  const [left, setLeft] = useState(3);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  const reward = { blotter: 'One more blotter', undo: 'Undo your last pour', tip: 'Double the tip' }[placement] ?? 'A reward';
  return (
    <Sheet eyebrow="Rewarded ad" title={reward}>
      <p>A real game shows a short video here. In this playtest it takes three seconds.</p>
      <div class="ad-count" aria-live="polite">{left > 0 ? left : '✓'}</div>
    </Sheet>
  );
}

export function UnlockSheet({ ids, rank, onClose }: { ids: string[]; rank: number; onClose: () => void }) {
  return (
    <Sheet eyebrow={`Rank ${rank}`} title="New bottles on your shelf" onClose={onClose}>
      <ul class="unlocks">
        {ids.map((id) => {
          const m = material(catalog, id);
          return (
            <li key={id}>
              <span class="flacon" aria-hidden="true"><span class="flacon-liquid" style={{ background: materialColor(m) }} /></span>
              <div>
                <strong>{m.name}</strong> <span class="fine">potency {m.potency}, {potencyWord(m.potency)}</span>
                <p class="card-text">{m.card}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div class="sheet-actions">
        <button type="button" class="btn btn-main" onClick={onClose} data-autofocus>Back to the bench</button>
      </div>
    </Sheet>
  );
}

export interface MenuProps {
  stats: { served: number; fullOrBetter: number; avgSeconds: number; avgScore: number; bands: Record<string, number> };
  archived: number;
  owned: string[];
  sound: boolean;
  onCopy: (all: boolean) => Promise<string | null>;
  onSound: () => void;
  onCard: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function MenuSheet(props: MenuProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const s = props.stats;
  const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const copy = async (all: boolean) => {
    const failedText = await props.onCopy(all);
    if (failedText) setFallback(failedText);
    else setCopied(all ? 'All saved results copied.' : 'Results copied. Paste them into a message to Diego.');
  };
  return (
    <Sheet eyebrow="Workshop" title="This playtest" onClose={props.onClose} wide>
      <dl class="stats">
        <div><dt>Perfumes sold</dt><dd>{s.served}</dd></div>
        <div><dt>Full or better</dt><dd>{s.fullOrBetter}</dd></div>
        <div><dt>Time per perfume</dt><dd>{mmss(s.avgSeconds)}</dd></div>
        <div><dt>Average score</dt><dd>{s.avgScore}</dd></div>
      </dl>
      <p class="band-row">
        {(['signature', 'full', 'close', 'off', 'flop', 'declined'] as const).filter((b) => s.bands[b]).map((b) => (
          <span key={b} class={`band band-${b}`}>{b === 'declined' ? 'Declined' : bandInfo(b, catalog).label} {s.bands[b]}</span>
        ))}
      </p>
      <div class="menu-actions">
        <button type="button" class="btn btn-main btn-wide" onClick={() => void copy(false)} data-autofocus>Copy my results</button>
        {props.archived > 0 && (
          <button type="button" class="btn btn-quiet btn-wide" onClick={() => void copy(true)}>
            Copy all saved results ({props.archived + 1} testers)
          </button>
        )}
        {copied && <p class="ok" role="status">{copied}</p>}
        {fallback && (
          <>
            <p class="fine">Copying isn’t allowed here. Select the text below and copy it yourself.</p>
            <textarea class="field results" readOnly value={fallback} onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
          </>
        )}
      </div>
      <h3 class="sub">Notebook</h3>
      <div class="notebook">
        {props.owned.map((id) => {
          const m = material(catalog, id);
          return (
            <button key={id} type="button" class="note-row" onClick={() => props.onCard(id)}>
              <span class="dot" style={{ background: materialColor(m) }} />{m.name}
            </button>
          );
        })}
      </div>
      <div class="menu-footer">
        <button type="button" class="btn btn-quiet" onClick={props.onSound}>Sound {props.sound ? 'on' : 'off'}</button>
        <button
          type="button"
          class={`btn btn-quiet${confirmReset ? ' is-warn' : ''}`}
          onClick={() => (confirmReset ? props.onReset() : setConfirmReset(true))}
        >
          {confirmReset ? 'Tap again: clear for the next tester' : 'New tester'}
        </button>
      </div>
      {confirmReset && <p class="fine">This clears the game for the next person. Their results stay saved on this phone for “Copy all”.</p>}
      <p class="fine">Build {BUILD}</p>
    </Sheet>
  );
}

export function Toast({ text }: { text: string }) {
  return <div class="toast" role="status">{text}</div>;
}
