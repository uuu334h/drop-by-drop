import { FACETS, type Profile } from '../engine';
import { facetColor, facetLabel, pct } from './look';

const R = 38;
const W = 15;
const C = 2 * Math.PI * R;

/** The blend's scent profile as a ring, with the biggest facets listed beside it. */
export function Ring({ profile, drops }: { profile: Profile; drops: number }) {
  let offset = 0;
  const segments = FACETS.filter((f) => profile[f] > 0.004).map((f) => {
    const len = profile[f] * C;
    const seg = { f, len, offset };
    offset += len;
    return seg;
  });
  const top = FACETS.filter((f) => profile[f] > 0.004).sort((a, b) => profile[b] - profile[a]).slice(0, 5);
  const label = top.length ? top.map((f) => `${facetLabel(f)} ${pct(profile[f])}`).join(', ') : 'Empty';
  return (
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 100 100" role="img" aria-label={`Scent profile: ${label}`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(46,42,38,0.12)" stroke-width={W} />
        {segments.map((s) => (
          <circle
            key={s.f}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={facetColor(s.f)}
            stroke-width={W}
            transform="rotate(-90 50 50)"
            style={{ strokeDasharray: `${Math.max(0, s.len - (segments.length > 1 ? 1.2 : 0))} ${C}`, strokeDashoffset: -s.offset }}
          />
        ))}
        <text x="50" y="47" text-anchor="middle" class="ring-num">{drops}</text>
        <text x="50" y="61" text-anchor="middle" class="ring-unit">{drops === 1 ? 'drop' : 'drops'}</text>
      </svg>
      <ul class="legend">
        {top.length === 0 && <li class="legend-empty">The profile appears with the first drop.</li>}
        {top.map((f) => (
          <li key={f}>
            <span class="dot" style={{ background: facetColor(f) }} />
            <span class="legend-label">{facetLabel(f)}</span>
            <span class="legend-val">{pct(profile[f])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
