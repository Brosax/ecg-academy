/**
 * STUB SimEngine — lets the ECG, 3D and app workstreams run before the real simulator exists.
 * Source = Sameni Gaussian VCG (one vector, every lead a projection); activation fields = Euclidean distance maps on
 * the stub geometry, timed to roughly match the Sameni P / QRS / T.
 */
import { localToFrankMatrix, mat3Transpose } from '../frame';
import { dowerElectrodeField } from '../leads/electrodes';
import { makeProjector } from '../leads/projector';
import { responsibleFromWindows } from '../measure/responsible';
import type { StructureWindow } from '../measure/responsible';
import { buildCycleTruth, MECH, ventricularTimes } from '../measure/truth';
import { SinusRhythm } from '../rhythm/sinus';
import { TemplateStream } from '../rhythm/stream';
import type {
  ActivationField, ActiveBeat, ApdField, BeatEvent, BeatSnapshot, BeatTemplate, CycleTruth, ElectrodeField,
  EngineFields, GeometryBundle, LeadProjector, Pose, SimEngine, StructureId, Vec3,
} from '../types';
import { COMP, TISSUE } from '../types';
import { SAMENI_NORMAL, sameniAxis } from './sameni';
import { buildStubGeometry } from './stubGeometry';

type AEvent = Extract<BeatEvent, { kind: 'A' }>;
type VEvent = Extract<BeatEvent, { kind: 'V' }>;

const FS = 1000;
/** R peak relative to the V (His) event, ms. */
const R_AFTER_V = 45;
/** P-wave Gaussian centre (θ ≈ −1.0 rad) placed this long after the A (SA) event, ms. */
const P_CENTER_AFTER_A = 55;
const MS_PER_RAD = 1000 / (2 * Math.PI); // morphology fixed at 60 bpm timing (stub)

function distanceField(geo: GeometryBundle, comp: number, seeds: { p: Vec3; t: number }[], mmPerMs: number, id: string): ActivationField {
  const g = geo.grid;
  const [nx, ny] = g.dims;
  const tAct = new Float32Array(g.tissue.length).fill(Infinity);
  let tMin = Infinity, tMax = -Infinity;
  for (let v = 0; v < tAct.length; v++) {
    const t = g.tissue[v];
    const isA = t === TISSUE.LA || t === TISSUE.RA;
    const isV = t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum;
    if ((comp === COMP.Atrial && !isA) || (comp === COMP.Ventricular && !isV)) continue;
    const i = v % nx, j = Math.floor(v / nx) % ny, k = Math.floor(v / (nx * ny));
    const x = g.originMm[0] + i * g.hMm, y = g.originMm[1] + j * g.hMm, z = g.originMm[2] + k * g.hMm;
    let best = Infinity;
    for (const s of seeds) best = Math.min(best, s.t + Math.hypot(x - s.p[0], y - s.p[1], z - s.p[2]) / mmPerMs);
    tAct[v] = best;
    tMin = Math.min(tMin, best);
    tMax = Math.max(tMax, best);
  }
  return { id, comp: comp as 1 | 2, tAct, tMinMs: tMin, tMaxMs: tMax };
}

export class StubEngine implements SimEngine {
  geometry: GeometryBundle;
  fields: EngineFields;
  readonly fsHz = FS;
  projector: LeadProjector;
  electrodes: ElectrodeField;
  readonly rhythm: SinusRhythm;
  private stream: TemplateStream;
  private aTpl: BeatTemplate;
  private vTpl: BeatTemplate;
  private listeners = new Set<() => void>();
  private windowsA: StructureWindow[];
  private windowsV: StructureWindow[];

  constructor() {
    this.geometry = buildStubGeometry();
    const geo = this.geometry;
    const atrial = distanceField(geo, COMP.Atrial, [{ p: geo.landmarks.SA!, t: 5 }], 0.75, 'sinus');
    const ventricular = distanceField(
      geo,
      COMP.Ventricular,
      [
        { p: [-2, 6, -2], t: 20 },
        { p: [4, -6, 10], t: 22 },
        { p: [4, -8, -14], t: 22 },
        { p: [-14, -14, 14], t: 28 },
      ],
      0.9,
      'normal',
    );
    const g = geo.grid;
    const apdRefMs = new Float32Array(g.tissue.length);
    for (let v = 0; v < apdRefMs.length; v++) {
      const t = g.tissue[v];
      if (t === TISSUE.LA || t === TISSUE.RA) apdRefMs[v] = 200;
      else if (t === TISSUE.LV || t === TISSUE.RV || t === TISSUE.Septum)
        apdRefMs[v] = 245 + 50 * (g.apexBase[v] - 0.5) - 25 * (g.wallDepth[v] - 0.5);
    }
    const apd: ApdField = { apdRefMs, rrRefMs: 800, rateExp: 1 / 3 };
    this.fields = {
      atrial: [atrial, null],
      ventricular: [ventricular, null],
      apd,
      apAtrial: { tauUpMs: 3, tauRepMs: 40, plateauSlope: 0.3, lowpassHz: 150 },
      apVentricular: { tauUpMs: 2.5, tauRepMs: 15, plateauSlope: 0.1, lowpassHz: 150 },
    };
    this.electrodes = dowerElectrodeField();
    this.projector = makeProjector(this.electrodes);
    this.rhythm = new SinusRhythm();
    const Minv = mat3Transpose(localToFrankMatrix(geo.pose));
    this.aTpl = this.buildTemplate('A', Minv);
    this.vTpl = this.buildTemplate('V', Minv);
    this.stream = new TemplateStream(this.rhythm, (ev) => (ev.kind === 'A' ? this.aTpl : this.vTpl), geo.pose, FS);
    this.windowsA = [
      { id: 'SA', t0: 0, t1: 8 },
      { id: 'RA', t0: 8, t1: 70 },
      { id: 'BACHMANN', t0: 20, t1: 45 },
      { id: 'LA', t0: 35, t1: 100 },
      { id: 'LAA', t0: 80, t1: 100 },
      { id: 'AVN', t0: 50, t1: 125 },
    ];
    this.windowsV = [
      { id: 'HIS', t0: 0, t1: 6 },
      { id: 'LBB', t0: 4, t1: 14 },
      { id: 'RBB', t0: 4, t1: 18 },
      { id: 'PURKINJE_LV', t0: 10, t1: 22 },
      { id: 'PURKINJE_RV', t0: 14, t1: 28 },
      { id: 'SEPTUM', t0: 20, t1: 55, r0: 250, r1: 330 },
      { id: 'LV_APEX', t0: 28, t1: 60, r0: 230, r1: 300 },
      { id: 'RV_FREE', t0: 30, t1: 60, r0: 240, r1: 320 },
      { id: 'LV_ANTERIOR', t0: 35, t1: 75, r0: 240, r1: 330 },
      { id: 'LV_LATERAL', t0: 40, t1: 85, r0: 245, r1: 340 },
      { id: 'LV_INFERIOR', t0: 40, t1: 85, r0: 245, r1: 340 },
      { id: 'LV_POSTEROBASAL', t0: 75, t1: 105, r0: 280, r1: 380 },
      { id: 'RVOT', t0: 80, t1: 108, r0: 280, r1: 370 },
    ];
  }

  private buildTemplate(part: 'A' | 'V', Minv: readonly number[]): BeatTemplate {
    const [t0, t1] = part === 'A' ? [-20, 380] : [-60, 480];
    const n = t1 - t0;
    const H = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {
      const t = t0 + i;
      const theta = part === 'A' ? -1.0 + (t - P_CENTER_AFTER_A) / MS_PER_RAD : (t - R_AFTER_V) / MS_PER_RAD;
      const X = sameniAxis(SAMENI_NORMAL.x, theta, part), Y = sameniAxis(SAMENI_NORMAL.y, theta, part), Z = sameniAxis(SAMENI_NORMAL.z, theta, part);
      // Frank → local (M is orthonormal, so M⁻¹ = Mᵀ)
      H[3 * i] = Minv[0] * X + Minv[1] * Y + Minv[2] * Z;
      H[3 * i + 1] = Minv[3] * X + Minv[4] * Y + Minv[5] * Z;
      H[3 * i + 2] = Minv[6] * X + Minv[7] * Y + Minv[8] * Z;
    }
    const truth = part === 'A' ? { onMs: 12, offMs: 100, repolOnMs: 110, repolEndMs: 330 } : { onMs: 20, offMs: 108, repolOnMs: 235, repolEndMs: 392 };
    return { key: `stub-${part}`, comp: part === 'A' ? COMP.Atrial : COMP.Ventricular, fsHz: FS, t0Ms: t0, n, H, truth };
  }

  sampleH(t0Ms: number, n: number, outA: Float32Array, outV: Float32Array): void {
    this.stream.sample(t0Ms, n, outA, outV);
  }

  sampleLeads(t0Ms: number, n: number, out: Float32Array): void {
    const a = new Float32Array(3 * n), v = new Float32Array(3 * n);
    this.stream.sample(t0Ms, n, a, v);
    this.projector.project(a, v, n, out);
  }

  private lastTwo<K extends 'A' | 'V'>(kind: K, tMs: number): Extract<BeatEvent, { kind: K }>[] {
    const evs = this.rhythm.eventsUntil(tMs);
    const out: Extract<BeatEvent, { kind: K }>[] = [];
    for (let i = evs.length - 1; i >= 0 && out.length < 2; i--) {
      const e = evs[i];
      if (e.kind === kind && e.tMs <= tMs) out.push(e as Extract<BeatEvent, { kind: K }>);
    }
    return out;
  }

  activeBeats(tMs: number): BeatSnapshot {
    const mk = (e: AEvent | VEvent | undefined): ActiveBeat | null =>
      e ? { eventId: e.id, slot: 0, sinceMs: tMs - e.tMs, apdScale: e.kind === 'V' ? e.apdScale : 1 } : null;
    const a = this.lastTwo('A', tMs), v = this.lastTwo('V', tMs);
    return { atrial: [mk(a[0]), mk(a[1])], ventricular: [mk(v[0]), mk(v[1])] };
  }

  cycleAt(tMs: number): CycleTruth | null {
    const evs = this.rhythm.eventsUntil(tMs + 2000);
    const as = evs.filter((e): e is AEvent => e.kind === 'A');
    let idx = -1;
    for (let i = 0; i < as.length; i++) if (as[i].tMs + this.aTpl.truth.onMs <= tMs) idx = i;
    if (idx < 0) return null;
    const a = as[idx];
    const vOf = (x: AEvent | undefined) => (x ? (evs.find((e): e is VEvent => e.kind === 'V' && e.fromA === x.id) ?? null) : null);
    const v = vOf(a);
    const next = as[idx + 1];
    const times = (x: VEvent | null) =>
      x ? ventricularTimes(x.tMs + this.vTpl.truth.onMs, x.tMs + this.vTpl.truth.repolEndMs, x.rrPrevMs) : null;
    const nextPOn = next ? next.tMs + this.aTpl.truth.onMs : null;
    return buildCycleTruth({
      a, aTpl: this.aTpl, v, vTpl: v ? this.vTpl : null,
      nextStartMs: nextPOn,
      nextMvCloseMs: times(vOf(next))?.mvClose ?? null,
      nextAtrialStartMs: nextPOn !== null ? nextPOn + MECH.atrialEmdMs : null,
      prevMvOpenMs: times(vOf(as[idx - 1]))?.mvOpen ?? null,
      rrMs: 60000 / this.rhythm.heartRate,
    });
  }

  responsible(tMs: number): readonly { id: StructureId; w: number }[] {
    const a = this.lastTwo('A', tMs)[0], v = this.lastTwo('V', tMs)[0];
    const out = [
      ...(a ? responsibleFromWindows(this.windowsA, tMs - a.tMs) : []),
      ...(v ? responsibleFromWindows(this.windowsV, tMs - v.tMs, v.apdScale) : []),
    ];
    return out.sort((x, y) => y.w - x.w);
  }

  afFrame(): number {
    return 0;
  }

  setHeartRate(bpm: number): void {
    this.rhythm.setHeartRate(bpm, 0);
  }

  setPose(pose: Pose): void {
    this.geometry = { ...this.geometry, pose };
    this.stream.setPose(pose);
    this.listeners.forEach((cb) => cb());
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
