import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import { material, nextRankXp, totalDrops, visibleProfile } from '../engine';
import { Beaker } from './Beaker';
import { Actions, CustomerCard, Hint, MaterialStrip, Organ, TopBar } from './Bench';
import { liquidColor } from './look';
import { AdSheet, BlotterSheet, BrandSheet, CardSheet, MenuSheet, SaleSheet, Toast, UnlockSheet, Welcome } from './Overlays';
import { Ring } from './Ring';
import { chime, paper, plink, setSound } from './sound';
import {
  archivedCount, blottersLeft, canUse, catalog, discoveredSet, loadSound, loadState, ownedOf, rankOf,
  reducer, remakesLeft, resultsText, saveSound, saveState, starsOf, stats,
} from './state';

type AdPlacement = 'blotter' | 'undo' | 'tip';
type Overlay =
  | { kind: 'blotter'; before: string[] }
  | { kind: 'brand' }
  | { kind: 'card'; id: string }
  | { kind: 'menu' }
  | { kind: 'ad'; placement: AdPlacement }
  | { kind: 'unlock'; ids: string[]; rank: number };

export function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmRemake, setConfirmRemake] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [sound, setSoundState] = useState(loadSound);
  const [brandAsked, setBrandAsked] = useState(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => saveState(state), [state]);
  useEffect(() => setSound(sound), [sound]);

  const c = state.current;
  const request = c.request;
  const owned = ownedOf(state);
  const discovered = discoveredSet(state);
  const drops = totalDrops(c.blend);
  const capacity = catalog.prices.beakerDrops;
  const profile = visibleProfile(c.blend, catalog, discovered);
  const color = liquidColor(profile);
  const rank = rankOf(state);

  // A new rank brings new bottles: show them once the bench is quiet.
  useEffect(() => {
    if (!state.begun || overlay || state.sale || rank <= state.unlockSeen) return;
    const ids = catalog.materialList.filter((m) => m.unlockRank > state.unlockSeen && m.unlockRank <= rank).map((m) => m.id);
    if (ids.length) setOverlay({ kind: 'unlock', ids, rank });
    else dispatch({ t: 'unlockSeen', rank });
  }, [state.begun, overlay, state.sale, rank, state.unlockSeen]);

  useEffect(() => {
    if (selected && !owned.includes(selected)) setSelected(null);
  }, [owned.join(), selected]);

  useEffect(() => {
    if (state.sale) chime(state.sale.band === 'signature' || state.sale.band === 'full');
  }, [state.sale?.band, state.customerNo]);

  const say = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  if (!state.begun) return <Welcome onBegin={() => dispatch({ t: 'begin' })} />;

  const pick = (id: string) => {
    if (!canUse(c, id)) {
      say(`Not this one. ${request.customer.name}'s order only needs the glowing bottles.`);
      return;
    }
    setSelected(id);
  };

  const onDrop = (newPour: boolean) => {
    if (!selected) return;
    if (totalDrops(state.current.blend) >= capacity) {
      say('The beaker is full. Bottle it, or pour it away and remake.');
      return;
    }
    dispatch({ t: 'drop', id: selected, newPour });
    plink((totalDrops(state.current.blend) + 1) / capacity);
  };

  const openBlotter = () => {
    if (blottersLeft(c) > 0) {
      paper();
      setOverlay({ kind: 'blotter', before: state.discovered });
      dispatch({ t: 'blotter' });
    } else {
      setOverlay({ kind: 'ad', placement: 'blotter' });
    }
  };

  const adDone = (placement: AdPlacement) => {
    dispatch({ t: 'ad', placement });
    if (placement === 'blotter') {
      dispatch({ t: 'grantBlotter' });
      dispatch({ t: 'blotter' });
      paper();
      setOverlay({ kind: 'blotter', before: state.discovered });
    } else if (placement === 'undo') {
      dispatch({ t: 'undoPour' });
      setOverlay(null);
    } else {
      dispatch({ t: 'doubleTip' });
      setOverlay(null);
    }
  };

  const bottle = () => {
    setOverlay(null);
    dispatch({ t: 'bottle' });
  };

  const nextCustomer = () => {
    if (!state.brand && !brandAsked) {
      setBrandAsked(true);
      setOverlay({ kind: 'brand' });
      return;
    }
    setOverlay(null);
    setSelected(null);
    dispatch({ t: 'next' });
  };

  const remake = () => {
    if (!confirmRemake) {
      setConfirmRemake(true);
      window.setTimeout(() => setConfirmRemake(false), 3000);
      return;
    }
    setConfirmRemake(false);
    dispatch({ t: 'remake' });
    say('Poured away. A clean beaker.');
  };

  const decline = () => {
    if (!confirmDecline) {
      setConfirmDecline(true);
      window.setTimeout(() => setConfirmDecline(false), 3000);
      return;
    }
    setConfirmDecline(false);
    setSelected(null);
    dispatch({ t: 'decline' });
  };

  const copy = async (all: boolean): Promise<string | null> => {
    const text = resultsText(state, all);
    try {
      await navigator.clipboard.writeText(text);
      return null;
    } catch {
      return text;
    }
  };

  const hints = request.hints;
  let hint: string | null = null;
  if (hints) {
    if (selected && hints[selected]) hint = hints[selected]!;
    else if (drops >= 12 && c.blottersUsed === 0 && hints.blotter) hint = hints.blotter;
    else hint = hints.start ?? null;
  }

  const rankStart = catalog.prices.rankXp[rank - 1] ?? 0;
  const rankNext = nextRankXp(state.xp, catalog);
  const rankProgress = rankNext ? (state.xp - rankStart) / (rankNext - rankStart) : 1;
  const lastPour = c.pours[c.pours.length - 1];
  const selectedMaterial = selected ? material(catalog, selected) : null;

  return (
    <div class="app">
      <div class="wall">
        <div class="wall-inner">
          <TopBar
            house={state.brand ?? 'Odile’s workshop'}
            coins={state.coins}
            stars={starsOf(state)}
            rank={rank}
            rankProgress={rankProgress}
            onMenu={() => setOverlay({ kind: 'menu' })}
          />
          <CustomerCard request={request} onDecline={decline} />
          {confirmDecline && <p class="warn-line">Tap Decline again to send {request.customer.name} away. It costs nothing.</p>}
          {hint && <Hint text={hint} />}
        </div>
      </div>
      <main class="bench">
        <div class="bench-inner">
          <div class="work">
            <Beaker
              drops={drops}
              capacity={capacity}
              color={color}
              label={selectedMaterial ? `${selectedMaterial.short} · ${selectedMaterial.potency}` : 'Pick a bottle'}
              disabled={!selected}
              onDrop={onDrop}
              onBlocked={() => say('Pick a bottle from the shelf first.')}
            >
              {lastPour && !c.undoUsed && !state.sale && (
                <button
                  type="button"
                  class="link-btn undo"
                  aria-label={`Undo the last pour: ${lastPour.drops} drops of ${material(catalog, lastPour.id).name}. Watch an ad.`}
                  onClick={() => setOverlay({ kind: 'ad', placement: 'undo' })}
                >
                  Undo last pour · ad
                </button>
              )}
            </Beaker>
            <Ring profile={profile} drops={drops} />
          </div>
          <Actions
            blotters={blottersLeft(c)}
            remakes={remakesLeft(c)}
            hasDrops={drops > 0}
            confirmRemake={confirmRemake}
            onBlotter={openBlotter}
            onRemake={remake}
            onBottle={bottle}
          />
          <MaterialStrip id={selected} discovered={discovered} onCard={() => selected && setOverlay({ kind: 'card', id: selected })} />
          <Organ owned={owned} blendDrops={c.blend} selected={selected} allowed={request.allowed} onPick={pick} />
        </div>
      </main>

      {overlay?.kind === 'blotter' && c.reaction && (
        <BlotterSheet
          request={request}
          reaction={c.reaction}
          discovered={state.discovered.filter((k) => !overlay.before.includes(k))}
          blottersLeft={blottersLeft(c)}
          onKeep={() => setOverlay(null)}
          onBottle={bottle}
        />
      )}
      {state.sale && !overlay && (
        <SaleSheet
          request={request}
          sale={state.sale}
          brand={state.brand ?? 'Odile’s workshop'}
          color={color}
          onDoubleTip={() => setOverlay({ kind: 'ad', placement: 'tip' })}
          onNext={nextCustomer}
        />
      )}
      {overlay?.kind === 'brand' && (
        <BrandSheet
          color={color}
          onSave={(name) => {
            dispatch({ t: 'brand', name });
            setOverlay(null);
            setSelected(null);
            dispatch({ t: 'next' });
          }}
          onLater={() => {
            setOverlay(null);
            setSelected(null);
            dispatch({ t: 'next' });
          }}
        />
      )}
      {overlay?.kind === 'card' && (
        <CardSheet id={overlay.id} discovered={discovered} drops={c.blend[overlay.id] ?? 0} onClose={() => setOverlay(null)} />
      )}
      {overlay?.kind === 'ad' && <AdSheet placement={overlay.placement} onDone={() => adDone(overlay.placement)} />}
      {overlay?.kind === 'unlock' && (
        <UnlockSheet
          ids={overlay.ids}
          rank={overlay.rank}
          onClose={() => {
            dispatch({ t: 'unlockSeen', rank: overlay.rank });
            setOverlay(null);
          }}
        />
      )}
      {overlay?.kind === 'menu' && (
        <MenuSheet
          stats={stats(state)}
          archived={archivedCount()}
          owned={owned}
          sound={sound}
          onCopy={copy}
          onSound={() => {
            saveSound(!sound);
            setSoundState(!sound);
          }}
          onCard={(id) => setOverlay({ kind: 'card', id })}
          onReset={() => {
            dispatch({ t: 'reset' });
            setSelected(null);
            setBrandAsked(false);
            setOverlay(null);
          }}
          onClose={() => setOverlay(null)}
        />
      )}
      {toast && <Toast text={toast} />}
    </div>
  );
}
