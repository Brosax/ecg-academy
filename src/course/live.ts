/**
 * Dials of the `live` lesson block (a synthetic ECG the learner changes with sliders). Pure, no DOM — tested in
 * tests/course/live.test.ts.
 *
 * The rule that keeps the block honest: the tracing on screen is always generated WITH the values the sliders show.
 * The first tracing therefore asks for explicit start values — the value the scenario is authored with when its source
 * spec states it (rate, HRV, ST, T amplitude, voltage, QTc, fibrillatory coarseness), else the middle of the scenario's
 * range — so `SynthResult.applied` reports every dial the engine realised, and the read-outs show those applied values.
 * A dial the engine does not realise for this scenario (absent from `applied`) is not offered as a slider.
 */
import type { DialId, DialRange, ScenarioDef } from '../synth/api';

export type DialUnit = 'bpm' | 'ms' | '°' | 'mV' | '×' | ':1' | '';

export interface DialMeta {
  /** slider step (undefined = about 1/100 of the range, rounded to 1-2-5) */
  readonly step?: number;
  readonly digits: number;
  readonly unit: DialUnit;
}

/** Units follow src/synth/dials (voltage is a torso-gain factor ×, noise an amplitude in mV). */
export const DIAL_META: Readonly<Record<DialId, DialMeta>> = {
  rate: { unit: 'bpm', step: 1, digits: 0 },
  pr: { unit: 'ms', step: 5, digits: 0 },
  qrs: { unit: 'ms', step: 5, digits: 0 },
  qtc: { unit: 'ms', step: 5, digits: 0 },
  axis: { unit: '°', step: 5, digits: 0 },
  pAxis: { unit: '°', step: 5, digits: 0 },
  st: { unit: 'mV', step: 0.01, digits: 2 },
  tAmp: { unit: '×', step: 0.05, digits: 2 },
  voltage: { unit: '×', step: 0.05, digits: 2 },
  hrv: { unit: '', digits: 3 },
  conductionRatio: { unit: ':1', step: 1, digits: 0 },
  ventricularResponse: { unit: 'bpm', step: 1, digits: 0 },
  fCoarseness: { unit: '', digits: 2 },
  stage: { unit: '', step: 1, digits: 0 },
  site: { unit: '', step: 1, digits: 0 },
  noise: { unit: 'mV', digits: 2 },
};

export function dialStep(id: DialId, r: DialRange): number {
  const s = DIAL_META[id].step;
  if (s !== undefined) return s;
  const raw = (r.max - r.min) / 100;
  if (!(raw > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((x) => x >= raw - 1e-12) ?? raw;
}

/** A value clamped to the range and put on the slider's step grid (counted from the range minimum). */
export function snapDial(id: DialId, r: DialRange, v: number): number {
  const step = dialStep(id, r);
  const clamped = Math.max(r.min, Math.min(r.max, v));
  const k = Math.round((clamped - r.min) / step);
  const snapped = Math.max(r.min, Math.min(r.max, r.min + k * step));
  return Number(snapped.toFixed(Math.max(DIAL_META[id].digits, 6)));
}

type Loose = Readonly<Record<string, unknown>>;
const obj = (v: unknown): Loose | undefined => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Loose) : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** The source spec field at `path`, the variant's patch winning over the base. */
function specValue(sc: ScenarioDef, variant: string | undefined, path: readonly string[]): unknown {
  const read = (root: unknown): unknown => path.reduce<unknown>((o, k) => (Array.isArray(o) ? o[Number(k)] : obj(o)?.[k]), root);
  const patch = variant ? sc.variants?.[variant]?.patch : undefined;
  const fromPatch = patch ? read(patch) : undefined;
  return fromPatch !== undefined ? fromPatch : read(sc.source);
}

const RATE_RHYTHMS: ReadonlySet<string> = new Set(['sinus', 'ventricular', 'junctional', 'atrial-ectopic', 'atrial-tachycardia']);

/** The value a dial has in the scenario as authored, when its source spec states it. */
export function authoredDialValue(sc: ScenarioDef, variant: string | undefined, id: DialId): number | undefined {
  const at = (...path: string[]) => num(specValue(sc, variant, path));
  const kind = specValue(sc, variant, ['rhythm', 'kind']);
  switch (id) {
    case 'rate':
      return typeof kind === 'string' && RATE_RHYTHMS.has(kind) ? at('rhythm', 'rateBpm') : undefined;
    case 'hrv':
      return kind === 'sinus' ? (at('rhythm', 'hrv') ?? 0) : undefined;
    case 'st':
      return at('injury', '0', 'stMv');
    case 'tAmp':
      return at('repol', 'gScale') ?? 1;
    case 'voltage':
      return at('geometry', 'torsoGain') ?? 1;
    case 'qtc':
      return at('repol', 'qtcMs');
    case 'fCoarseness':
      return kind === 'fibrillation' ? at('rhythm', 'coarseness') : undefined;
    case 'conductionRatio':
      return kind === 'flutter' ? 2 : undefined;
    default:
      return undefined;
  }
}

/**
 * Start values of a live block's dials: only dials the scenario allows (ScenarioDef.dials), each at its authored value
 * or the middle of its range, clamped and on the step grid.
 */
export function startDials(sc: ScenarioDef, variant: string | undefined, ids: readonly DialId[]): Partial<Record<DialId, number>> {
  const out: Partial<Record<DialId, number>> = {};
  for (const id of ids) {
    const r = sc.dials[id];
    if (!r) continue;
    out[id] = snapDial(id, r, authoredDialValue(sc, variant, id) ?? (r.min + r.max) / 2);
  }
  return out;
}

/** The dials the engine realised (present in `applied`), in the block's order. */
export function realisedDials(ids: readonly DialId[], applied: Readonly<Partial<Record<DialId, number>>>): DialId[] {
  return ids.filter((id) => typeof applied[id] === 'number');
}

/** Only the given dials of a value map. */
export function pickDials(vals: Readonly<Partial<Record<DialId, number>>>, ids: readonly DialId[]): Partial<Record<DialId, number>> {
  const out: Partial<Record<DialId, number>> = {};
  for (const id of ids) if (vals[id] !== undefined) out[id] = vals[id];
  return out;
}
