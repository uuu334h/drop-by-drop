import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

interface BeakerProps {
  drops: number;
  capacity: number;
  color: string;
  label: string;
  disabled: boolean;
  /** Called for every drop; `newPour` is true for the first drop of a press. */
  onDrop: (newPour: boolean) => void;
  onBlocked: () => void;
  /** Shown under the drop count, e.g. the undo offer. */
  children?: ComponentChildren;
}

const reduceMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Tap for one drop, hold to pour faster and faster. */
export function Beaker({ drops, capacity, color, label, disabled, onDrop, onBlocked, children }: BeakerProps) {
  const timer = useRef<number | null>(null);
  const holdStart = useRef<number | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    holdStart.current = null;
  };
  useEffect(() => stop, []);

  const pourStep = (count: number) => {
    const delay = Math.max(65, 230 - count * 22);
    timer.current = window.setTimeout(() => {
      dropRef.current(false);
      pourStep(count + 1);
    }, delay);
  };

  const press = (e: PointerEvent) => {
    e.preventDefault();
    if (disabled) {
      onBlocked();
      return;
    }
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    stop();
    holdStart.current = Date.now();
    dropRef.current(true);
    timer.current = window.setTimeout(() => pourStep(0), 360);
  };

  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (disabled) onBlocked();
    else dropRef.current(true);
  };

  const fill = Math.min(1, drops / capacity);
  const innerTop = 22;
  const innerBottom = 112;
  const level = innerBottom - fill * (innerBottom - innerTop);

  return (
    <div class="beaker-col">
      <div class="beaker-label">{label}</div>
      <button
        type="button"
        class={`beaker${disabled ? ' is-off' : ''}`}
        aria-label={disabled ? 'Beaker: pick a bottle first' : `Add a drop of ${label}. Hold to pour.`}
        onPointerDown={press}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={key}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 100 124" aria-hidden="true">
          <defs>
            <clipPath id="beaker-inside">
              <path d="M24 20 L24 108 Q24 116 32 116 L68 116 Q76 116 76 108 L76 20 Z" />
            </clipPath>
          </defs>
          {drops > 0 && (
            <g clip-path="url(#beaker-inside)">
              <rect x="0" y={level} width="100" height={124 - level} fill={color} class={reduceMotion() ? '' : 'liquid'} />
              <rect x="0" y={level} width="100" height="3" fill="rgba(255,255,255,0.45)" class={reduceMotion() ? '' : 'liquid'} />
            </g>
          )}
          <path class="glass" d="M18 12 L24 18 L24 108 Q24 118 34 118 L66 118 Q76 118 76 108 L76 18 L82 12" />
          {[10, 20, 30].map((d) => {
            const y = innerBottom - (d / capacity) * (innerBottom - innerTop);
            return <path key={d} d={`M62 ${y} L74 ${y}`} class="grad" />;
          })}
          {drops > 0 && !reduceMotion() && <circle key={drops} class="falling" cx="50" cy="4" r="3.2" fill={color} />}
        </svg>
      </button>
      <div class="beaker-count" aria-live="polite">
        <strong>{drops}</strong> / {capacity} drops
      </div>
      {children}
    </div>
  );
}
