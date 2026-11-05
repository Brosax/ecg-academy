import type { EcgSignal } from '../../core/ecg';
import type { StdLead } from '../../core/leads';
import { assembleHookup, potentialsFromSignal, type Hookup } from '../../figures/scenes/cable-swap.math';
import { assembleNoisy, noiseSeries, type Electrode, type NoiseType } from '../../figures/scenes/noisy-electrode.math';

/** A real signal window; all derived leads keep the same electrode-potential source. */
export function inspectRecording(sig: EcgSignal, hook: Hookup, noise?: { electrode: Electrode; type: NoiseType; amplitude: number }): EcgSignal {
  const n = Math.min(sig.leads.I.length, Math.round(sig.fs * 2.4));
  const from = Math.min(Math.round(sig.fs * .8), Math.max(0, sig.leads.I.length - n));
  const leads = assembleHookup(potentialsFromSignal(sig), hook, from, n);
  const clean: EcgSignal = { fs: sig.fs, durationMs: n / sig.fs * 1000, leads };
  if (!noise) return clean;
  const series = noiseSeries(noise.type, n, sig.fs, 6135);
  const win = [0, (n - 1) / sig.fs * 1000] as const;
  return { ...clean, leads: assembleNoisy(clean, win, noise.electrode, series, noise.amplitude) };
}

/** Preserve QRS extrema when drawing a small strip (pair order remains chronological). */
export function displaySamples(signal: EcgSignal, lead: StdLead, columns = 180): number[] {
  const values = signal.leads[lead];
  if (values.length <= columns * 2) return Array.from(values);
  const out: number[] = [];
  for (let c = 0; c < columns; c++) {
    const first = Math.floor(c / columns * values.length);
    const end = Math.max(first + 1, Math.floor((c + 1) / columns * values.length));
    let min = first, max = first;
    for (let i = first + 1; i < end; i++) { if (values[i] < values[min]) min = i; if (values[i] > values[max]) max = i; }
    out.push(values[Math.min(min, max)], values[Math.max(min, max)]);
  }
  return out;
}
