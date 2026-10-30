/**
 * Morphology model: atrial and ventricular "templates" made of kernels, plus the ventricular-gradient rule for T.
 *
 * Ventricular gradient (Wilson 1934; Burger 1957; Waks & Tereshchenko 2016): G = ∫QRST H dt depends on the
 * action-potential-duration map, not on the activation sequence. We therefore store G (mV·ms) as the condition's
 * repolarization parameter and derive the T-wave area vector as  A_T = G − A_QRS.  A purely activation change
 * (bundle-branch block, pre-excitation, ventricular ectopy, paced beats) therefore produces the correct secondary,
 * discordant T automatically; primary repolarization changes (strain, hyperkalaemia, ischaemia) edit G or the T shape.
 */
import {
  areaVector, bump, plateau, shapeArea, norm,
  type BumpSpec, type Kernel, type PlateauSpec, type RegionName, type RegionTag, type Vec3,
} from './kernels.ts';

export type Timing3 = { on: number; peak: number; end: number };
/** T timing plus an optional peakedness exponent (kernels.ts: q = 2 smooth dome, q < 2 tented apex) */
export type TTiming = Timing3 & { q?: number };

export type AtrialMorph = {
  /** depolarization lobes, times relative to P onset (ms) */
  lobes: readonly BumpSpec[];
  /** atrial repolarization (Ta): area = −ratio × P area vector (Holmqvist 2009: opposite polarity, 2–3× P duration) */
  ta: (Timing3 & { ratio: number }) | null;
  /** atrial centroid (cm, Frank, origin = ventricular centroid). When set, every atrial kernel of this morphology
   *  (P lobes and Ta) carries it as a near-field location with far = 1: the Dower rows (fitted to the ventricular
   *  source) plus the proximity correction for a source that sits posterior-superior to the ventricles, i.e. an
   *  atrial lead field. A lobe's own `loc` takes precedence. */
  loc?: Vec3;
};

export type VentMorph = {
  /** depolarization lobes relative to QRS onset (ms) */
  qrs: readonly BumpSpec[];
  /** ventricular gradient (mV·ms, Frank) */
  G: Vec3;
  /** T timing relative to QRS onset at rrRef; `end` is the tangent-method end */
  t: TTiming;
  /** electrotonic coupling c (0..1, default 0): the effective gradient is G + c·A_QRS, i.e. late-activated muscle
   *  repolarises relatively earlier, so the secondary T is (1 − c)·A_QRS instead of the full A_QRS. Used for
   *  ectopic/paced rhythms where the T is smaller than the QRS. */
  coupling?: number;
  /** U wave: same direction as T, amplitude ratio to T */
  u: (Timing3 & { ratio: number }) | null;
  /** injury currents (relative to QRS onset; times after QRS end scale with QT) */
  st: readonly PlateauSpec[];
  /** additional repolarization lobes (e.g. localised RVOT near-field source in Brugada), relative to QRS onset */
  repolExtra: readonly BumpSpec[];
  /** RR (ms) at which the T timing above applies; QT adapts with Fridericia's cube-root law */
  rrRef: number;
};

export const VENT_REGIONS: readonly RegionName[] = ['IVS', 'RV', 'RVOT', 'LV_ANT', 'LV_LAT', 'LV_INF', 'LV_APEX', 'LV_BASE'];
const T_TAGS: readonly RegionTag[] = VENT_REGIONS.map((r) => [r, 1] as const);

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addv = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export function qrsArea(m: Pick<VentMorph, 'qrs'>): Vec3 {
  let a: Vec3 = [0, 0, 0];
  for (const s of m.qrs) a = addv(a, areaVector(bump(s, 0, 'QRS', 'depol')));
  return a;
}

export function qrsEnd(m: Pick<VentMorph, 'qrs'>): number {
  return Math.max(...m.qrs.map((s) => s.end));
}
export function qrsStart(m: Pick<VentMorph, 'qrs'>): number {
  return Math.min(...m.qrs.map((s) => s.on));
}

/** G that makes this activation sequence produce a T with the given direction/amplitude (used to calibrate normal). */
export function gradientFor(m: Pick<VentMorph, 'qrs' | 't'>, tDir: Vec3, tAmp: number): Vec3 {
  const tk = bump({ ...m.t, dir: tDir, amp: tAmp, label: 'T', endRule: 'tangent' }, 0, 'T', 'repol');
  return addv(qrsArea(m), scale(norm(tDir), tAmp * shapeArea(tk)));
}

/** T direction and amplitude implied by G − A_QRS */
export function tVector(m: VentMorph): { dir: Vec3; amp: number; area: Vec3 } {
  const aq = qrsArea(m);
  const area = sub(addv(m.G, scale(aq, m.coupling ?? 0)), aq);
  const tk = bump({ ...m.t, dir: [1, 0, 0], amp: 1, label: 'T', endRule: 'tangent' }, 0, 'T', 'repol');
  return { dir: norm(area), amp: len(area) / shapeArea(tk), area };
}

const cache = new WeakMap<VentMorph, { dir: Vec3; amp: number }>();

/** Instantiate one ventricular beat. `rrPrev` sets the QT (Fridericia). `pOn` (if conducted) adds the silent
 *  AV-node / His–Purkinje kernels that drive the 3D conduction-system state. */
export function ventricularKernels(m: VentMorph, qrsOn: number, rrPrev: number, pOn: number | null): {
  kernels: Kernel[];
  qrsOn: number;
  qrsOff: number;
  tOff: number;
} {
  let tv = cache.get(m);
  if (!tv) {
    tv = tVector(m);
    cache.set(m, tv);
  }
  const s = Math.cbrt(Math.max(250, rrPrev) / m.rrRef);
  const qEnd = qrsEnd(m);
  const sc = (t: number): number => (t > qEnd ? qEnd + (t - qEnd) * s : t);
  const ks: Kernel[] = [];
  for (const q of m.qrs) ks.push(bump(q, qrsOn, 'QRS', 'depol'));
  const tSpec: BumpSpec = {
    on: sc(m.t.on), peak: sc(m.t.peak), end: sc(m.t.end), dir: tv.dir, amp: tv.amp, label: 'T', endRule: 'tangent',
    regions: T_TAGS, q: m.t.q,
  };
  const tk = bump(tSpec, qrsOn, 'T', 'repol');
  ks.push(tk);
  if (m.u) {
    ks.push(bump({ on: sc(m.u.on), peak: sc(m.u.peak), end: sc(m.u.end), dir: tv.dir, amp: tv.amp * m.u.ratio, label: 'U', regions: T_TAGS }, qrsOn, 'U', 'none'));
  }
  for (const p of m.st) {
    ks.push(plateau({ ...p, fallStart: sc(p.fallStart), end: sc(p.end) }, qrsOn, 'ST', 'none'));
  }
  for (const r of m.repolExtra) {
    ks.push(bump({ ...r, on: sc(r.on), peak: sc(r.peak), end: sc(r.end) }, qrsOn, 'T', 'none'));
  }
  // conduction system (silent: amp 0 — the His–Purkinje mass is too small to show on the surface ECG)
  if (pOn !== null) {
    const avOn = pOn + 30;
    const hisOn = qrsOn - 45;
    if (hisOn - avOn > 10) {
      ks.push(bump({ on: avOn, peak: (avOn + hisOn) / 2, end: hisOn, dir: [1, 0, 0], amp: 0, regions: [['AVN', 1]], label: 'AVN' }, 0, 'silent', 'depol'));
      ks.push(bump({ on: qrsOn + 40, peak: qrsOn + 120, end: qrsOn + 200, dir: [1, 0, 0], amp: 0, regions: [['AVN', 1]], label: 'AVN rec' }, 0, 'silent', 'repol'));
    }
  }
  const hisStart = qrsOn - (pOn !== null ? 45 : 0);
  if (pOn !== null) {
    ks.push(bump({ on: hisStart, peak: qrsOn - 15, end: qrsOn + 10, dir: [1, 0, 0], amp: 0, regions: [['HIS_BB', 1]], label: 'His-BB' }, 0, 'silent', 'depol'));
    ks.push(bump({ on: qrsOn + 150, peak: qrsOn + 260, end: qrsOn + 340, dir: [1, 0, 0], amp: 0, regions: [['HIS_BB', 1]], label: 'His rec' }, 0, 'silent', 'repol'));
  }
  return { kernels: ks, qrsOn: qrsOn + qrsStart(m), qrsOff: qrsOn + qEnd, tOff: tk.end };
}

/** Instantiate one atrial depolarization (P) with its Ta and the silent sinus-node kernels. */
export function atrialKernels(m: AtrialMorph, pOn: number, sinus: boolean): { kernels: Kernel[]; pOn: number; pOff: number } {
  const ks: Kernel[] = [];
  let area: Vec3 = [0, 0, 0];
  const nf = m.loc ? { loc: m.loc, far: 1 } : {};
  for (const l of m.lobes) {
    const k = bump({ ...nf, ...l }, pOn, 'P', 'depol');
    ks.push(k);
    area = addv(area, areaVector(k));
  }
  const pOff = pOn + Math.max(...m.lobes.map((l) => l.end));
  if (m.ta) {
    const unit = bump({ ...m.ta, dir: [1, 0, 0], amp: 1, label: 'Ta' }, pOn, 'Ta', 'repol');
    const a = len(area) * m.ta.ratio;
    ks.push(bump({ ...m.ta, ...nf, dir: scale(area, -1), amp: a / shapeArea(unit), label: 'Ta', regions: [['RA', 1], ['LA', 1]] }, pOn, 'Ta', 'repol'));
  } else {
    ks.push(bump({ on: 150, peak: 250, end: 350, dir: [1, 0, 0], amp: 0, label: 'atrial rec', regions: [['RA', 1], ['LA', 1]] }, pOn, 'silent', 'repol'));
  }
  if (sinus) {
    ks.push(bump({ on: -25, peak: -12, end: 0, dir: [1, 0, 0], amp: 0, regions: [['SAN', 1]], label: 'SAN' }, pOn, 'silent', 'depol'));
    ks.push(bump({ on: 80, peak: 160, end: 240, dir: [1, 0, 0], amp: 0, regions: [['SAN', 1]], label: 'SAN rec' }, pOn, 'silent', 'repol'));
  }
  return { kernels: ks, pOn: pOn + Math.min(...m.lobes.map((l) => l.on)), pOff };
}
