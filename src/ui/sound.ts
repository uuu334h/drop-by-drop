// Tiny synthesised sounds. Audio starts only after the first tap, as browsers require.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSound(on: boolean): void {
  enabled = on;
}

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, type: OscillatorType, peak: number, seconds: number, delay = 0): void {
  const a = audio();
  if (!a) return;
  try {
    const t = a.currentTime + delay;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + seconds);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  } catch {
    /* ignore */
  }
}

/** A glass plink that rises as the beaker fills (fill 0..1). */
export function plink(fill: number): void {
  tone(880 + fill * 520, 'sine', 0.09, 0.12);
  tone(1760 + fill * 1040, 'sine', 0.02, 0.08);
  try {
    navigator.vibrate?.(6);
  } catch {
    /* ignore */
  }
}

export function chime(good: boolean): void {
  if (good) {
    tone(659, 'sine', 0.12, 0.5);
    tone(988, 'sine', 0.08, 0.6, 0.09);
    tone(1319, 'triangle', 0.05, 0.7, 0.18);
  } else {
    tone(330, 'triangle', 0.1, 0.35);
    tone(247, 'triangle', 0.08, 0.45, 0.12);
  }
}

export function paper(): void {
  tone(420, 'triangle', 0.04, 0.09);
}
