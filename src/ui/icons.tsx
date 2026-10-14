// Small inline icons, drawn once so the page needs no image files.

export function Coin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#E8A33D" stroke="#9E6B1F" stroke-width="1.2" />
      <circle cx="8" cy="8" r="4.2" fill="none" stroke="#9E6B1F" stroke-width="1" opacity="0.7" />
    </svg>
  );
}

export function Star({ size = 14, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.2l2 4.3 4.7.5-3.5 3.2 1 4.6L8 11.5l-4.2 2.3 1-4.6L1.3 6l4.7-.5z"
        fill={filled ? '#E8A33D' : 'none'}
        stroke="#9E6B1F"
        stroke-width="1"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function Menu() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  );
}

export function Info() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.3" />
      <path d="M8 7v4.2M8 4.6v.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
    </svg>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span class="stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={size} filled={i <= value} />)}
    </span>
  );
}
