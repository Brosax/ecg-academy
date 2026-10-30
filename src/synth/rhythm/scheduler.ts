/**
 * Event scheduler (DECISION §6.7): atrial events → AV junction → ventricular beats, as one discrete-event simulation in
 * absolute time (pre-roll t0 … t1). Every pacemaker is a process on its own rng fork:
 *
 *   sinus node (resettable: HRV, pauses, SA exit block) · ectopic atrial clocks (fixed, wandering, multifocal, atrial
 *   tachycardia) · flutter circuits · AF wavelet streams · junctional pacemaker · ventricular focus (VT, AIVR) ·
 *   escape timer · ectopy plans (PAC / PJC / PVC) · pacemaker device · re-entry loops (AVNRT, AVRT) · renewal rhythms
 *   (polymorphic VT / torsades, VF, ventricular flutter, asystole).
 *
 * Physiology in the event handlers, not in per-lead code: an atrial depolarisation resets the sinus node when it gets
 * there first; its impulse reaches the AV node (decremental, refractory, concealment) and the His–Purkinje system
 * (all-or-none block), the bundles (Ashman aberrancy) and the ventricles (refractory after every beat); a ventricular
 * activation conceals into the node retrogradely (compensatory pause) or crosses it (retrograde P′), resets the escape
 * timer and is sensed by a pacemaker; two fronts that reach the ventricles within the fusion window make one fusion
 * beat. Every decision is recorded (beat kind and source, conducting atrial event, His time, where a blocked impulse
 * stopped, stimuli) for the truth, the laddergram and the 3D view.
 */
import type { AtrialEvent, BeatKind } from '../../core/ecg';
import type { Rng } from '../../core/rng';
import type { AtrialSite, JunctionSpec, PacingSite, RhythmSpec, SourceSpec, Vec3, VentOrigin } from '../api';
import { IDENTITY, rotationMatrix, scale, unit, type Mat3 } from '../frame';
import { activationTiming, type ActivationInput, type RegionTiming } from '../heart/activation';
import { jitterLobe, jitterVector } from '../dials/jitter';
import { lobeArea, lobeKernel, lobeWithArea, plateauKernel, type Kernel, type Lobe } from '../kernel/kernel';
import { render } from '../kernel/render';
import type { AtrialMorph } from '../morph/atrial';
import { ECTOPIC_SITES, patternForBlocks } from '../morph/patterns';
import { buildVentricular, instantiateVent, type VentMorph, type VentPatternInput } from '../morph/ventricular';
import { atrialSite, pathwayAtrialSite, type GenSite, type SiteMorph } from './atrialSites';
import { atrialSiteClock, SinusNode } from './clocks';
import { EctopyPlan, type EctopicFire } from './ectopy';
import { fibrillationCycles, vfCycles, vflutterCycles } from './fibrillation';
import { flutterCycle } from './flutter';
import { BIV_INPUT, fullPreexcitedPattern, fusedPattern, generatedPattern, ORIGIN_INPUT, PACING_INPUT, pathwayFrontInput, PREEXCITED_HP_ENGAGE_MS } from './fronts';
import { aberrancy, AvNode, escapeIntervalMs, HisPurkinje, Pathway } from './junction';
import { failsCapture, LATENCY_MS, myopotentialBursts, PVARP_MS, stimulusKernels, VRP_MS } from './pacing';
import { jtAt, nextEffectiveRr, prematureFactor, rrForJt } from './rate';

export interface AtrialEv {
  readonly index: number;
  /** nominal onset (absolute ms) */
  readonly t: number;
  readonly kind: AtrialEvent['kind'];
  /** 2 % edges of the atrial wave (absolute ms) */
  readonly pOn: number;
  readonly pOff: number;
  /** the event's own atrial kernels (P / F / f lobes, Ta, atrial injury) */
  readonly kernels: readonly Kernel[];
  /** AV-node entry (null: never reached the node) */
  readonly nodeIn: number | null;
  /** index of the beat it conducted to */
  conductedTo: number | null;
  /** atrial chamber activated (3D) and AF stream */
  readonly chambers: 'both' | 'ra' | 'la';
  readonly stream: number | null;
  /** site of the atrial wave (sinus, an ectopic site, retrograde, the pacing lead) */
  readonly site?: string;
  /** part of the dominant atrial mechanism (sinus / ectopic clock / flutter): atrial-rate and PP truth */
  readonly dominant?: boolean;
  /** the interval from the previous dominant event is an undisturbed clock cycle */
  readonly regularCycle?: boolean;
  /** premature ectopic (PAC) */
  readonly premature?: boolean;
  /** laddergram: where an impulse that did not reach the ventricles stopped */
  blockedAt?: 'avn' | 'his' | 'bundles' | 'ventricle' | null;
  /** laddergram: His activation when it crossed the node */
  hisAt?: number | null;
  /** atrial pacing stimulus (absolute ms) */
  readonly stimAt?: number | null;
}

export interface BeatInst {
  readonly index: number;
  readonly kind: BeatKind;
  readonly qrsOn: number;
  readonly qrsOff: number;
  readonly j: number;
  readonly tPeak: number;
  readonly tOff: number;
  readonly uOff: number | null;
  readonly atrialEvent: number | null;
  readonly patternKey: string;
  readonly fraction: number;
  readonly aberrant: boolean;
  readonly rrPrevMs: number;
  readonly timing: RegionTiming;
  /** ventricular kernels of this beat */
  readonly kernels: readonly Kernel[];
  /** His activation (conducted beats) */
  readonly hisAt: number | null;
  /** JT scale of the beat (3D recovery times) */
  readonly jtScale: number;
  /** premature ectopic beat (PVC, PJC, conducted PAC): excluded from the dominant-beat truth */
  readonly ectopic?: boolean;
  /** the beat's own retrograde P′ (index into the atrial events) */
  readonly retroEvent?: number | null;
  /** ventricular pacing stimulus (absolute ms) */
  readonly stimAt?: number | null;
  /** ectopic origin or pacing site */
  readonly origin?: string;
}

export interface Stimulus {
  readonly t: number;
  readonly chamber: 'A' | 'V';
  readonly captured: boolean;
}

export interface Schedule {
  readonly atrial: readonly AtrialEv[];
  readonly beats: readonly BeatInst[];
  readonly kernels: readonly Kernel[];
  /** nominal atrial cycle (ms) of the rhythm (null: none / not regular) */
  readonly atrialCycleMs: number | null;
  /** pacing stimuli */
  readonly stimuli?: readonly Stimulus[];
  /** extra facts of the realised rhythm (conduction ratio, oversensing windows …) */
  readonly notes?: Readonly<Record<string, string>>;
  /** skeletal-muscle (myopotential) bursts the pacemaker sensed (absolute ms): the recording chain shows them as EMG
   *  on the arm electrodes (the same windows, one source) */
  readonly myopotentials?: readonly { readonly from: number; readonly to: number }[];
}

export interface ScheduleInput {
  readonly source: SourceSpec;
  readonly junction: JunctionSpec;
  /** sinus atrial morphology */
  readonly atrial: AtrialMorph;
  /** pattern of supraventricular-conducted beats (normal, BBB, pre-excited) */
  readonly native: VentMorph;
  readonly nativeKind: 'conducted' | 'preexcited';
  readonly ectopic: (origin: VentOrigin) => VentMorph;
  readonly rng: Rng;
  readonly t0: number;
  readonly t1: number;
  readonly mirror: boolean;
  /** natural variability of the morphologies the scheduler builds itself (default true) */
  readonly jitter?: boolean;
  /** strip duration (ms): placement of one-off events (default t1 − 500) */
  readonly durationMs?: number;
}

/**
 * Visible QRS edges of a morphology (ms relative to its kernel edges): the first and last instants at which the
 * spatial QRS magnitude reaches VISIBLE_FRACTION of its peak. A generated (ectopic, paced, fused) complex starts from
 * one small region and fades out slowly, so its 2 % kernel edges lie well outside what a reader (or the oracle) sees;
 * the truth uses the visible edges for those complexes. Authored patterns have crisp edges (shift ≈ 0).
 */
const VISIBLE_FRACTION = 0.02;
const EDGE_CACHE = new WeakMap<VentMorph, { on: number; off: number }>();
/** Visible QRS end of a morphology relative to its activation start (ms). */
export function visibleQrsEnd(m: VentMorph): number {
  return m.qrsOff - m.qrsOn - visibleEdges(m).off;
}

export function visibleEdges(m: VentMorph): { on: number; off: number } {
  let e = EDGE_CACHE.get(m);
  if (!e) {
    const ks = m.qrs.map((l) => lobeKernel(l, 0, -1));
    const lo = Math.floor(m.qrsOn) - 2, hi = Math.ceil(m.qrsOff) + 2;
    const r = render(ks, 1000, hi - lo + 1, lo, 0);
    const mag = Array.from({ length: r.n }, (_, i) => Math.hypot(r.H[0][i], r.H[1][i], r.H[2][i]));
    const peak = Math.max(...mag);
    let a = 0, z = r.n - 1;
    while (a < r.n - 1 && mag[a] < VISIBLE_FRACTION * peak) a++;
    while (z > a && mag[z] < VISIBLE_FRACTION * peak) z--;
    e = { on: Math.max(0, lo + a - m.qrsOn), off: Math.max(0, m.qrsOff - (lo + z)) };
    EDGE_CACHE.set(m, e);
  }
  return e;
}

// ── morphologies the scheduler needs per beat ───────────────────────────────────────────────────────────────────
class Morphs {
  /** morphologies built here from generated (or fused) activation: their truth QRS edges are the visible ones */
  readonly generated = new WeakSet<VentMorph>();
  private readonly cache = new Map<string, VentMorph>();
  private readonly inp: ScheduleInput;
  private readonly refRr: number;
  constructor(inp: ScheduleInput, refRr: number) {
    this.inp = inp;
    this.refRr = refRr;
  }

  private build(p: VentPatternInput, repol: { coupling: number; gScale?: number }, tissue: boolean, generated = false): VentMorph {
    const s = this.inp.source;
    const key = `${p.key}|c${repol.coupling}|g${repol.gScale ?? '-'}|${tissue}`;
    let m = this.cache.get(key);
    if (!m) {
      const jit = this.inp.jitter ?? true;
      const r = this.inp.rng.fork(`jitter:${p.key}`);
      m = buildVentricular({
        pattern: p, substrate: s.substrate, repol: { ...s.repol, coupling: repol.coupling, ...(repol.gScale !== undefined ? { gScale: repol.gScale } : {}) },
        // injury and near-field extras belong to the native activation (solved for it); ectopic beats keep the tissue
        injury: tissue ? s.injury : undefined, nearField: tissue ? s.nearField : undefined, geometry: s.geometry,
        jitterLobe: jit ? jitterLobe(r.fork('qrs')) : undefined, jitterG: jit ? jitterVector(r.fork('G')) : undefined, refRrMs: this.refRr,
      });
      this.cache.set(key, m);
      if (generated) this.generated.add(m);
    }
    return m;
  }

  native(): VentMorph {
    return this.inp.native;
  }

  /** the conducted (Purkinje) pattern of this heart, also when the native one is pre-excited */
  conducted(): VentMorph {
    if (this.inp.nativeKind === 'conducted') return this.inp.native;
    const blocks = this.inp.source.activation.blocks;
    const p = patternForBlocks(blocks);
    if (!p) throw new Error('src/synth: no calibrated conducted pattern for these blocks');
    return this.build({ key: p.id, lobes: p.lobes, activation: p.activation, plateauSlope: p.plateauSlope }, { coupling: this.inp.source.repol?.coupling ?? 0 }, true);
  }

  /** functional bundle-branch block of a conducted beat (aberrancy) */
  aberrant(branch: 'rbb' | 'lbb'): VentMorph {
    const blocks = { ...(this.inp.source.activation.blocks ?? {}), [branch]: 'complete' as const };
    const p = patternForBlocks(blocks);
    if (!p) throw new Error(`src/synth: no calibrated pattern for aberrant conduction with ${JSON.stringify(blocks)}`);
    return this.build({ key: p.id, lobes: p.lobes, activation: p.activation, plateauSlope: p.plateauSlope }, { coupling: this.inp.source.repol?.coupling ?? 0 }, true);
  }

  /** ventricular ectopic origin (authored site set when it exists, else the generated family) */
  ectopic(origin: VentOrigin, sustained: boolean): VentMorph {
    if (origin === 'junctional') return this.inp.native;
    const authored = ECTOPIC_SITES[origin];
    if (authored && sustained && this.inp.source.rhythm.kind === 'ventricular') return this.inp.ectopic(origin);
    const p: VentPatternInput = authored
      ? { key: authored.id, lobes: authored.lobes, activation: authored.activation }
      : generatedPattern(`origin:${origin}`, ORIGIN_INPUT[origin], origin);
    // electrotonic coupling (DECISION §9.4, §11): PVC 0.3, sustained VT 0.7 with a reduced gradient
    return this.build(p, sustained ? { coupling: 0.7, gScale: 0.2 } : { coupling: 0.3 }, false, !authored);
  }

  paced(site: PacingSite | 'biv'): VentMorph {
    if (site === 'his') return this.inp.native;
    if (site === 'ra-appendage') throw new Error('src/synth: ra-appendage is an atrial pacing site');
    const input = site === 'biv' ? BIV_INPUT : PACING_INPUT[site];
    return this.build(generatedPattern(`paced:${site}`, input, `paced ${site}`), { coupling: 0.3 }, false, site !== 'lbb-area');
  }

  /**
   * pre-excited beat: the pathway front leads the AV-nodal one by `nodalOffsetMs` (null: fully pre-excited).
   * `sustained`: the pre-excited beats of a tachycardia (antidromic AVRT, pre-excited AF) take the coupling of a sustained
   * ventricular rhythm (0.7 with a reduced gradient, as VT: DECISION §9.4, §11) — at 150–250 /min with a fully
   * pre-excited QRS the T is secondary and smaller than the QRS, as recorded.
   */
  preexcited(nodalOffsetMs: number | null, sustained = false): VentMorph {
    const a = this.inp.source.activation;
    if (a.kind !== 'preexcited') throw new Error('src/synth: pre-excited beat without a pre-excited activation');
    // an AV-nodal front that reaches the His–Purkinje system no earlier than ≈ 10 ms before the pre-excited front engages
    // it retrogradely (PREEXCITED_HP_ENGAGE_MS; the Purkinje exits fire 0–28 ms after the His) collides in the
    // conduction system and captures almost nothing: the beat is fully pre-excited (the authored maximal pattern, not a
    // fusion dominated by the generated muscle front)
    const q = nodalOffsetMs === null || nodalOffsetMs >= PREEXCITED_HP_ENGAGE_MS - 10 ? null : Math.round(nodalOffsetMs / 10) * 10;
    const conducted = patternForBlocks(a.blocks)!;
    const p = q === null
      ? fullPreexcitedPattern(a.pathway)
      : fusedPattern(`preexcited:${a.pathway}:${q}`, { key: conducted.id, lobes: conducted.lobes, activation: conducted.activation }, pathwayFrontInput(a.pathway), q);
    return this.build(p, sustained ? { coupling: 0.7, gScale: 0.2 } : { coupling: 0.15 }, true, true);
  }

  /** fusion of a ventricular origin (focus at 0) with the conducted front arriving `lagMs` later */
  fusion(origin: VentOrigin | PacingSite | 'biv', focus: ActivationInput, lagMs: number): VentMorph {
    const q = Math.round(lagMs / 10) * 10;
    const c = this.conducted();
    const native = patternForBlocks(this.inp.source.activation.blocks);
    const base = native ? { key: native.id, lobes: native.lobes, activation: native.activation } : { key: c.key, lobes: [], activation: {} };
    return this.build(fusedPattern(`fusion:${origin}:${q}`, base, focus, q), { coupling: 0.3 }, false, true);
  }
}

// ── the event queue ─────────────────────────────────────────────────────────────────────────────────────────────
type VentSrc = 'conducted' | 'pathway' | 'pvc' | 'pjc' | 'junctional' | 'escape-j' | 'escape-v' | 'focus' | 'paced' | 'reentry';

interface VentCand {
  readonly src: VentSrc;
  readonly atrial: number | null;
  readonly his: number | null;
  readonly origin?: VentOrigin | PacingSite | 'biv';
  readonly ectopic?: boolean;
  readonly stimAt?: number | null;
  /** ventricular onset of the conducting front from the node (pathway beats: the competing AV-nodal arrival) */
  readonly aberr?: 'rbb' | 'lbb' | null;
  readonly kind?: BeatKind;
  readonly morph?: VentMorph;
  readonly rot?: Mat3 | null;
  readonly amp?: number;
  /** renewal rhythms (polymorphic VT): the beat is not gated by the refractoriness of the previous one */
  readonly force?: boolean;
  /** junctional rhythm: onset of the beat's own retrograde P′ relative to its QRS onset (ms) */
  readonly retroLag?: number | null;
  /** site of that P′ (default: retrograde from the AV node) */
  readonly retroSite?: GenSite;
}

type Ev =
  | { readonly k: 'sinus'; readonly t: number; readonly gen: number }
  | { readonly k: 'atrial'; readonly t: number; readonly run: () => void }
  | { readonly k: 'node'; readonly t: number; readonly ev: number }
  | { readonly k: 'vent'; readonly t: number; readonly v: VentCand }
  | { readonly k: 'escape'; readonly t: number; readonly gen: number }
  | { readonly k: 'focus'; readonly t: number; readonly gen: number }
  | { readonly k: 'junc'; readonly t: number; readonly gen: number }
  | { readonly k: 'paceA'; readonly t: number; readonly gen: number }
  | { readonly k: 'paceV'; readonly t: number; readonly gen: number };

const ORDER: Readonly<Record<Ev['k'], number>> = { sinus: 0, atrial: 1, paceA: 2, node: 3, junc: 4, escape: 5, focus: 6, paceV: 7, vent: 8 };

class Queue {
  private readonly q: (Ev & { seq: number })[] = [];
  private seq = 0;
  push(e: Ev): void {
    const x = { ...e, seq: this.seq++ };
    let i = this.q.length;
    while (i > 0) {
      const p = this.q[i - 1];
      if (p.t < x.t || (p.t === x.t && (ORDER[p.k] < ORDER[x.k] || (ORDER[p.k] === ORDER[x.k] && p.seq < x.seq)))) break;
      i--;
    }
    this.q.splice(i, 0, x);
  }
  pop(): Ev | undefined {
    return this.q.shift();
  }
  peekVents(until: number): (Ev & { k: 'vent' })[] {
    return this.q.filter((e): e is Ev & { k: 'vent'; seq: number } => e.k === 'vent' && e.t <= until);
  }
  remove(e: Ev): void {
    const i = this.q.indexOf(e as Ev & { seq: number });
    if (i >= 0) this.q.splice(i, 1);
  }
  get size(): number {
    return this.q.length;
  }
}

/** Two fronts reaching the ventricles within this window make one fusion beat (ms). */
const FUSION_MS = 45;
/** AV-nodal and pathway fronts fuse over a wider window (pre-excitation: the delta precedes the nodal QRS). */
const PREEXCITATION_MS = 110;
/** A ventricular impulse reaches the His / AV node retrogradely this long after the QRS onset (ms). */
const RETRO_DELAY = { ventricular: 55, junctional: 0 } as const;
/** After a beat of ventricular origin the His–Purkinje recovers this long after that beat's T end (ms). */
const HP_MARGIN_MS = 10;
/** Pre-excited AF: arrival of a wavelet at a left-sided pathway's atrial insertion relative to the AV node (ms), by the
 *  region of its stream, and the spread of the individual paths (± ms, uniform). */
const PW_LEAD: Readonly<Record<'ra' | 'la', number>> = { la: -22, ra: 18 };
const PW_SPREAD_MS = 30;

// ── simulation ──────────────────────────────────────────────────────────────────────────────────────────────────
class Sim {
  readonly atrial: AtrialEv[] = [];
  readonly beats: BeatInst[] = [];
  readonly kernels: Kernel[] = [];
  readonly stimuli: Stimulus[] = [];
  readonly notes: Record<string, string> = {};
  readonly q = new Queue();
  readonly inp: ScheduleInput;
  readonly J: JunctionSpec;
  readonly M: Morphs;
  readonly node: AvNode;
  readonly hp: HisPurkinje;
  readonly pw: Pathway | null;
  readonly sinus: SinusNode | null;
  readonly ecto: EctopyPlan;
  private lastQrs = NaN;
  private rrEff = NaN;
  /** ventricular refractoriness and the last ventricular activation */
  ventRefUntil = -Infinity;
  /** His–Purkinje refractoriness for supraventricular impulses (absolute ms) */
  hpRefUntil = -Infinity;
  lastV = -Infinity;
  lastBeat: BeatInst | null = null;
  escapeGen = 0;
  /** conducted impulses are allowed to reach the ventricles (false: VT without captures, complete dissociation) */
  avConduction = true;
  /** pacemaker state */
  pace: PaceState | null = null;
  lastNativeP = -Infinity;
  /** the rhythm's own per-beat rotation / amplitude (respiration) */
  private readonly resp: SourceSpec['geometry'];

  constructor(inp: ScheduleInput, J: JunctionSpec, refRr: number, sinusSpec: Extract<RhythmSpec, { kind: 'sinus' }> | null) {
    this.inp = inp;
    this.J = J;
    this.M = new Morphs(inp, refRr);
    const rng = inp.rng;
    this.node = new AvNode(J, rng.fork('avn'));
    this.hp = new HisPurkinje(J, rng.fork('his'));
    this.pw = J.pathway ? new Pathway(J.pathway, inp.source.rhythm.kind === 'fibrillation' ? rng.fork('pathway') : null) : null;
    this.sinus = sinusSpec ? new SinusNode({ rateBpm: sinusSpec.rateBpm, hrv: sinusSpec.hrv ?? 0.02, pauses: sinusSpec.pauses, saBlock: sinusSpec.saBlock }, inp.t0, rng.fork('sinus')) : null;
    const run = sinusSpec?.pauses?.[0]?.afterBeat ?? null;
    this.ecto = new EctopyPlan(inp.source.ectopy ?? [], rng.fork('ectopy'), run);
    this.resp = inp.source.geometry;
  }

  // ── atrial side ──
  addAtrial(e: Omit<AtrialEv, 'index' | 'conductedTo'>): AtrialEv {
    const ev: AtrialEv = { ...e, index: this.atrial.length, conductedTo: null };
    this.atrial.push(ev);
    this.kernels.push(...e.kernels);
    return ev;
  }

  siteMorph(site: GenSite): SiteMorph {
    return site === 'sinus' ? { ...this.inp.atrial, nodeMs: this.J.intraAtrialMs } : atrialSite(site, this.inp.source.atria, this.inp.mirror);
  }

  /** an atrial depolarisation from a site at t (P onset); `toNode`: its impulse descends to the AV node */
  depolarise(t: number, site: GenSite, kind: AtrialEvent['kind'], o: { toNode: boolean; dominant?: boolean; regular?: boolean; premature?: boolean; stimAt?: number | null; chambers?: 'both' | 'ra' | 'la' }): AtrialEv {
    const m = this.siteMorph(site);
    const idx = this.atrial.length;
    const ks: Kernel[] = m.lobes.map((l) => lobeKernel(l, t, idx, true));
    if (m.ta) ks.push(lobeKernel(m.ta, t, idx, true));
    for (const p of m.plateaus) ks.push(plateauKernel(p, t, idx, true));
    const nodeMs = site === 'sinus' ? this.J.intraAtrialMs : this.J.intraAtrialMs + (m.nodeMs - 35);
    const ev = this.addAtrial({
      t, kind, pOn: t + m.pOn, pOff: t + m.pOff, kernels: ks, nodeIn: o.toNode && this.avConduction ? t + nodeMs : null,
      chambers: o.chambers ?? 'both', stream: null, site, dominant: o.dominant ?? false, regularCycle: o.regular ?? false,
      premature: o.premature ?? false, stimAt: o.stimAt ?? null,
    });
    // the sinus node is reset by an atrial activation that reaches it before it fires (≈ 30 ms travel)
    if (kind !== 'sinus' && this.sinus) {
      const reach = t + 30;
      if (reach < this.sinus.peek() - 5) {
        this.sinus.reset(reach);
        this.pushSinus();
      }
    }
    if (o.toNode && this.avConduction) {
      this.q.push({ k: 'node', t: t + nodeMs, ev: ev.index });
      // accessory pathway (antegrade): the delta starts conductionMs after the P onset
      if (this.pw && this.inp.nativeKind === 'preexcited' && this.pw.offer(t + nodeMs, 'antegrade')) {
        this.q.push({ k: 'vent', t: t + this.pw.spec.conductionMs, v: { src: 'pathway', atrial: ev.index, his: null } });
      }
    }
    if (this.pace && kind !== 'paced') this.paceSenseA(t, ev.index);
    if (kind === 'sinus' || (o.dominant && !o.premature)) {
      this.lastNativeP = t;
      if (this.ecto.has('p')) for (const f of this.ecto.after('p', t)) this.fireEctopic(f);
    }
    return ev;
  }

  sinusGen = 0;
  pushSinus(): void {
    if (!this.sinus) return;
    this.sinusGen++;
    this.q.push({ k: 'sinus', t: this.sinus.peek(), gen: this.sinusGen });
  }

  /** AV-node arrival of atrial event `ev` */
  onNode(t: number, evIdx: number): void {
    const ev = this.atrial[evIdx];
    const d = this.node.offer(t);
    if (!d.conducted) {
      ev.blockedAt = 'avn';
      return;
    }
    ev.hisAt = d.hisAt;
    if (!this.hp.conducts()) {
      ev.blockedAt = 'his';
      return;
    }
    this.q.push({ k: 'vent', t: d.hisAt + this.J.hvMs, v: { src: 'conducted', atrial: evIdx, his: d.hisAt } });
  }

  // ── ventricular side ──
  addBeat(m: VentMorph, qrsOn: number, kind: BeatKind, v: VentCand, extra: { fraction?: number; aberrant?: boolean } = {}): BeatInst {
    const hasPrev = Number.isFinite(this.lastQrs);
    const rrPrev = hasPrev ? qrsOn - this.lastQrs : 1000;
    if (hasPrev) this.rrEff = Number.isFinite(this.rrEff) ? nextEffectiveRr(this.rrEff, rrPrev) : rrPrev;
    this.lastQrs = qrsOn;
    let rr = Number.isFinite(this.rrEff) ? this.rrEff : rrPrev;
    // APD restitution of a premature beat: a short diastolic interval after the previous T shortens this beat's JT
    if (this.lastBeat) {
      const steadyDi = rr - (m.qrsOff - m.qrsOn) - jtAt(m.law, rr);
      const f = prematureFactor(qrsOn - this.lastBeat.tOff, steadyDi);
      if (f < 1) rr = rrForJt(m.law, f * jtAt(m.law, rr));
    }
    const index = this.beats.length;
    const r = this.respFor(qrsOn);
    const vb = instantiateVent(m, qrsOn - m.qrsOn, rr, index, { rot: v.rot ?? r.rot, ampFactor: (v.amp ?? 1) * r.amp });
    const ed = this.M.generated.has(m) ? visibleEdges(m) : { on: 0, off: 0 };
    const qOff = vb.qrsOff - ed.off;
    // a paced QRS is measured from its stimulus artefact (clinical convention for the paced QRS duration and the AV
    // interval; the latency to the first visible activation is a few ms and filters smear the spike into it)
    const pacedOn = kind === 'paced-ventricular' && v.stimAt !== undefined && v.stimAt !== null ? v.stimAt : null;
    const b: BeatInst = {
      index, kind, qrsOn: pacedOn ?? vb.qrsOn + ed.on, qrsOff: qOff, j: vb.j === vb.qrsOff ? qOff : vb.j, tPeak: vb.tPeak, tOff: vb.tOff, uOff: vb.uOff, atrialEvent: v.atrial,
      patternKey: m.key, fraction: extra.fraction ?? 0, aberrant: extra.aberrant ?? false, rrPrevMs: rrPrev, timing: m.timing, kernels: vb.kernels,
      hisAt: v.his, jtScale: vb.s, ectopic: v.ectopic ?? false, retroEvent: null, stimAt: v.stimAt ?? null, origin: v.origin,
    };
    this.beats.push(b);
    this.kernels.push(...vb.kernels);
    if (v.atrial !== null) this.atrial[v.atrial].conductedTo = index;
    this.lastV = b.qrsOn;
    this.lastBeat = b;
    // ventricular refractoriness: until shortly before the T peak (an R-on-T impulse can capture after it)
    this.ventRefUntil = b.tPeak - 10;
    // His–Purkinje refractoriness (the longest APD of the heart, Purkinje ≈ QT): after a conducted beat it ends about
    // with the muscle's; after a beat of ventricular origin (ectopic, escape, paced, fully pre-excited) the His–
    // Purkinje is activated retrogradely and late, so a supraventricular impulse cannot cross it before that beat's T
    // has ended (no capture inside the T: captures and post-ectopic conducted beats follow the T)
    this.hpRefUntil = Sim.ventricularOrigin(b) ? b.tOff + HP_MARGIN_MS : this.ventRefUntil;
    return b;
  }

  /** a beat whose activation started in the ventricular muscle (the His–Purkinje is engaged retrogradely) */
  static ventricularOrigin(b: BeatInst): boolean {
    return b.kind === 'ventricular' || b.kind === 'escape-ventricular' || b.kind === 'paced-ventricular' || b.patternKey.endsWith(':full');
  }

  respFor(t: number): { rot: Mat3 | null; amp: number } {
    const rsp = this.resp?.respiration;
    if (!rsp || !this.sinus) return { rot: null, amp: 1 };
    const s = Math.sin(this.sinus.phaseAt(t));
    return { rot: rsp.rotDeg ? rotationMatrix(rsp.rotDeg * s) : IDENTITY, amp: 1 + (rsp.gain ?? 0) * s };
  }

  /** after any ventricular activation: retrograde conduction, escape timer, pacemaker sensing, ectopy coupling */
  afterBeat(b: BeatInst, v: VentCand): void {
    // retrograde into the AV node from below (ventricular origin) or from the junction itself
    // (a fully pre-excited beat conceals into the node through the retrogradely engaged His–Purkinje: in pre-excited AF
    // this is what keeps most beats pre-excited; a fused beat crossed the node antegradely)
    const retroAt = v.src === 'junctional' || v.src === 'escape-j' || v.src === 'pjc' || v.src === 'reentry'
      ? (b.hisAt ?? b.qrsOn - this.J.hvMs)
      : v.src === 'conducted' ? null
        : v.src === 'pathway' ? (b.patternKey.endsWith(':full') ? b.qrsOn + PREEXCITED_HP_ENGAGE_MS : null)
          : b.qrsOn + RETRO_DELAY.ventricular;
    if (retroAt !== null && v.src !== 'reentry') {
      // retrograde concealment: full, except in a VT whose sinus impulses may capture and for pre-excited beats (the
      // impulse is blocked low in the His–Purkinje / lower node and leaves the node partly excitable: captures, and
      // the AV-nodal and fused beats that make the QRS width vary in pre-excited AF)
      const rh = this.inp.source.rhythm;
      const partial = (rh.kind === 'ventricular' && rh.captures && (v.src === 'focus' || v.src === 'escape-v')) || v.src === 'pathway';
      // a fully pre-excited beat engages the His–Purkinje late and retrogradely: it penetrates the lower node only
      // shallowly, so the node keeps conducting wavelets that fuse with the next pathway beats (beat-to-beat changing
      // width of pre-excited AF)
      const depth = partial ? (v.src === 'pathway' ? 0.15 : 0.5) : 1;
      const exit = this.node.retrograde(retroAt, this.J.retrogradeVa ?? false, depth);
      if (exit !== null) {
        const ev = this.depolarise(exit + 10, 'retrograde', 'retrograde', { toNode: false });
        (b as { retroEvent?: number | null }).retroEvent = ev.index;
      }
    }
    // escape timer (reset by every ventricular activation)
    const esc = escapeIntervalMs(this.J);
    if (esc !== null) {
      this.escapeGen++;
      const lvl = this.J.escape!.level;
      this.q.push({ k: 'escape', t: b.qrsOn + esc - (lvl === 'junctional' ? this.J.hvMs : 0), gen: this.escapeGen });
    }
    if (this.pace) this.paceSenseV(b.qrsOn, v.src === 'paced');
    // ectopy coupled to native beats
    const native = !b.ectopic && (v.src === 'conducted' || v.src === 'pathway');
    if (native && this.ecto.has('qrs')) for (const f of this.ecto.after('qrs', b.qrsOn)) this.fireEctopic(f);
  }

  fireEctopic(f: EctopicFire): void {
    if (f.kind === 'pac') {
      const t = f.t;
      this.q.push({ k: 'atrial', t, run: () => this.depolarise(t, f.origin as AtrialSite, 'ectopic', { toNode: true, premature: true }) });
    } else if (f.kind === 'pvc') {
      this.q.push({ k: 'vent', t: f.t, v: { src: 'pvc', atrial: null, his: null, origin: f.origin as VentOrigin, ectopic: true } });
    } else {
      // PJC: the junctional impulse activates the His; the QRS follows after HV
      this.q.push({ k: 'vent', t: f.t, v: { src: 'pjc', atrial: null, his: f.t - this.J.hvMs, ectopic: true } });
    }
  }

  /** Process a ventricular candidate at t (fusion, refractoriness, beat creation). */
  onVent(t: number, v: VentCand): void {
    if (t < this.ventRefUntil && !v.force) {
      if (v.atrial !== null) this.atrial[v.atrial].blockedAt = 'ventricle';
      return;
    }
    if (v.src === 'conducted' && t < this.hpRefUntil) {
      if (v.atrial !== null) this.atrial[v.atrial].blockedAt = 'his';
      return;
    }
    // fusion with a competing front that reaches the ventricles within the window
    const isConducted = (x: VentCand): boolean => x.src === 'conducted';
    const window = v.src === 'pathway' ? PREEXCITATION_MS : FUSION_MS;
    for (const e of this.q.peekVents(t + window)) {
      const w = e.v;
      const pair = (v.src === 'pathway' && isConducted(w)) || (isConducted(v) && (w.src === 'focus' || w.src === 'escape-v' || w.src === 'pvc' || w.src === 'paced'))
        || ((v.src === 'focus' || v.src === 'escape-v' || v.src === 'pvc' || v.src === 'paced') && isConducted(w));
      if (!pair) continue;
      this.q.remove(e);
      this.makeFusion(t, v, e.t, w);
      return;
    }
    this.makeBeat(t, v);
  }

  makeBeat(t: number, v0: VentCand): void {
    let v = v0;
    let m: VentMorph;
    let kind: BeatKind;
    let aberrant = false;
    let fraction = 0;
    switch (v.src) {
      case 'conducted': {
        const ev = this.atrial[v.atrial!];
        // bundle refractoriness (Ashman): coupling = this activation − the last one, preceded by the last cycle
        const prevRr = this.lastBeat ? this.lastBeat.rrPrevMs : 1000;
        const ab = aberrancy(this.J, t - this.lastV, prevRr);
        if (ab.rbb && ab.lbb) {
          ev.blockedAt = 'bundles';
          return;
        }
        if (ab.rbb || ab.lbb) {
          m = this.M.aberrant(ab.rbb ? 'rbb' : 'lbb');
          aberrant = true;
        } else m = this.inp.nativeKind === 'preexcited' ? this.M.conducted() : this.M.native();
        kind = this.inp.source.rhythm.kind === 'ventricular' ? 'capture' : ev.kind === 'sinus' ? 'sinus' : ev.kind === 'paced' ? 'paced-atrial' : 'atrial';
        // a beat conducted from a premature P′ is itself premature (not part of the dominant rhythm)
        if (ev.premature) v = { ...v, ectopic: true };
        break;
      }
      case 'pathway': {
        const ev = this.atrial[v.atrial!];
        // pre-excitation without a competing nodal front: the native (authored) pattern in a regular sinus rhythm,
        // fully pre-excited otherwise
        m = this.inp.source.rhythm.kind === 'sinus' ? this.M.native() : this.M.preexcited(null, true);
        fraction = 1;
        kind = ev.kind === 'sinus' ? 'sinus' : 'atrial';
        break;
      }
      case 'pvc':
        m = this.M.ectopic(v.origin as VentOrigin, false);
        kind = 'ventricular';
        break;
      case 'focus':
        m = v.morph ?? this.M.ectopic(v.origin as VentOrigin, true);
        kind = 'ventricular';
        break;
      case 'escape-v':
        m = this.M.ectopic(v.origin as VentOrigin, false);
        kind = 'escape-ventricular';
        break;
      case 'escape-j':
        m = this.M.native();
        kind = 'escape-junctional';
        break;
      case 'pjc':
      case 'junctional':
        m = this.M.native();
        kind = 'junctional';
        break;
      case 'reentry':
        m = v.morph ?? this.M.native();
        kind = v.kind ?? 'junctional';
        break;
      case 'paced':
        m = this.M.paced(v.origin as PacingSite | 'biv');
        kind = 'paced-ventricular';
        break;
    }
    const b = this.addBeat(m, t, v.kind ?? kind, v, { aberrant, fraction });
    // junctional rhythm: the beat's own retrograde P′ (before, inside or after the QRS)
    if (v.retroLag !== undefined && v.retroLag !== null) {
      const ev = this.depolarise(b.qrsOn + v.retroLag, v.retroSite ?? 'retrograde', 'retrograde', { toNode: false, dominant: true, regular: true });
      (b as { retroEvent?: number | null }).retroEvent = ev.index;
    }
    this.afterBeat(b, v);
  }

  makeFusion(t: number, v: VentCand, t2: number, w: VentCand): void {
    // the conducted (or AV-nodal) front and the competing one; lag = conducted arrival − focus arrival
    const conductedFirst = v.src === 'conducted';
    const cond = conductedFirst ? v : w, other = conductedFirst ? w : v;
    const tc = conductedFirst ? t : t2, to = conductedFirst ? t2 : t;
    if (other.src === 'pathway' || v.src === 'pathway') {
      // pre-excitation: pathway delta at `t` (v), AV-nodal QRS at t2 (w)
      // regular sinus WPW: the authored fused pattern; otherwise (AF, PACs) fused by the offset of the two fronts
      const m = this.inp.source.rhythm.kind === 'sinus' ? this.M.native() : this.M.preexcited(t2 - t, true);
      const ev = this.atrial[v.atrial!];
      const b = this.addBeat(m, t, ev.kind === 'sinus' ? 'sinus' : 'atrial', { ...v, his: w.his }, { fraction: Math.max(0, Math.min(1, 1 - (t2 - t) / PREEXCITATION_MS)) });
      if (w.atrial !== null && w.atrial !== v.atrial) this.atrial[w.atrial].conductedTo = b.index;
      this.afterBeat(b, v);
      return;
    }
    const origin = other.origin as VentOrigin | PacingSite | 'biv';
    const focusInput: ActivationInput = other.src === 'paced'
      ? (origin === 'biv' ? BIV_INPUT : PACING_INPUT[origin as Exclude<PacingSite, 'ra-appendage'>])
      : ORIGIN_INPUT[origin as Exclude<VentOrigin, 'junctional'>];
    const lag = tc - to;
    const m = this.M.fusion(origin, focusInput, lag);
    const start = Math.min(t, t2);
    const b = this.addBeat(m, start, 'fusion', { ...cond, stimAt: other.stimAt ?? null, origin }, { fraction: Math.max(0, Math.min(1, 0.5 + lag / (2 * FUSION_MS))) });
    this.afterBeat(b, other.src === 'paced' ? other : cond);
  }

  // ── pacing ──
  paceSenseA(t: number, ev: number | null = null): void {
    const p = this.pace!;
    if (p.mode === 'VVI' || p.fault === 'undersensing') return;
    if (p.mode === 'DDD' && t < p.lastV + PVARP_MS) return;
    p.lastA = t;
    p.trackedA = ev;
    p.genA++;
    if (p.mode === 'AAI') this.q.push({ k: 'paceA', t: t + p.lri, gen: p.genA });
    if (p.mode === 'DDD') {
      p.genV++;
      this.q.push({ k: 'paceV', t: t + p.avDelay, gen: p.genV });
    }
  }

  paceSenseV(t: number, paced: boolean): void {
    const p = this.pace!;
    if (p.mode === 'AAI') return;
    if (!paced && (p.fault === 'undersensing' || t < p.lastV + VRP_MS)) return;
    p.lastV = t;
    p.genV++;
    if (p.mode === 'VVI') this.q.push({ k: 'paceV', t: t + p.lri, gen: p.genV });
    if (p.mode === 'DDD') {
      p.genA++;
      this.q.push({ k: 'paceA', t: t + p.lri - p.avDelay, gen: p.genA });
    }
  }

  stimulate(chamber: 'A' | 'V', t: number): void {
    const p = this.pace!;
    const k = this.stimuli.filter((s) => s.chamber === chamber && s.t >= 0).length;
    const fails = p.fault === 'no-capture' && t >= 0 && failsCapture(k);
    const site: PacingSite | 'biv' = chamber === 'A' ? 'ra-appendage' : p.site;
    this.kernels.push(...stimulusKernels(site, t, p.bipolar, -1));
    if (chamber === 'A') {
      // atrial capture unless the atrium is refractory (a P in the last 250 ms) or the output fails
      const captured = !fails && t - this.lastAtrialDepol() > 250;
      this.stimuli.push({ t, chamber, captured });
      p.lastA = t;
      if (p.mode === 'AAI') {
        p.genA++;
        this.q.push({ k: 'paceA', t: t + p.lri, gen: p.genA });
      }
      if (p.mode === 'DDD') {
        p.genV++;
        this.q.push({ k: 'paceV', t: t + p.avDelay, gen: p.genV });
      }
      p.trackedA = captured ? this.depolarise(t + LATENCY_MS, 'ra-appendage', 'paced', { toNode: true, stimAt: t, dominant: true, regular: true }).index : null;
      return;
    }
    const captured = !fails && t + LATENCY_MS >= this.ventRefUntil;
    this.stimuli.push({ t, chamber, captured });
    // the device times its next cycle from its own stimulus
    p.lastV = t;
    p.genV++;
    if (p.mode === 'VVI' || p.fault === 'undersensing') this.q.push({ k: 'paceV', t: t + p.lri, gen: p.genV });
    if (p.mode === 'DDD' && p.fault !== 'undersensing') {
      p.genA++;
      this.q.push({ k: 'paceA', t: t + p.lri - p.avDelay, gen: p.genA });
    }
    // dual-chamber: the ventricular output belongs to the atrial event that started the AV delay (laddergram A → V)
    const tracked = p.mode === 'DDD' && p.trackedA !== null && this.atrial[p.trackedA].conductedTo === null ? p.trackedA : null;
    p.trackedA = null;
    if (captured) this.q.push({ k: 'vent', t: t + LATENCY_MS, v: { src: 'paced', atrial: tracked, his: null, origin: p.site, stimAt: t } });
  }

  lastAtrialDepol(): number {
    for (let i = this.atrial.length - 1; i >= 0; i--) if (this.atrial[i].kind !== 'fibrillation') return this.atrial[i].t;
    return -Infinity;
  }

  /** run the queue */
  run(t1: number): void {
    let guard = 0;
    for (let e = this.q.pop(); e && e.t < t1; e = this.q.pop()) {
      if (++guard > 20000) throw new Error('src/synth: scheduler did not converge');
      switch (e.k) {
        case 'sinus': {
          if (e.gen !== this.sinusGen || !this.sinus) break;
          const x = this.sinus.take();
          this.depolarise(x.t, 'sinus', 'sinus', { toNode: true, dominant: true, regular: x.regular });
          this.pushSinus();
          break;
        }
        case 'atrial':
          e.run();
          break;
        case 'node':
          this.onNode(e.t, e.ev);
          break;
        case 'vent':
          this.onVent(e.t, e.v);
          break;
        case 'escape': {
          if (e.gen !== this.escapeGen) break;
          const esc = this.J.escape!;
          if (esc.level === 'junctional') {
            // a junctional escape is a His activation: it crosses the node retrogradely only with VA conduction
            this.q.push({ k: 'vent', t: e.t + this.J.hvMs, v: { src: 'escape-j', atrial: null, his: e.t } });
          } else {
            this.q.push({ k: 'vent', t: e.t, v: { src: 'escape-v', atrial: null, his: null, origin: esc.origin ?? 'lv-apex' } });
          }
          break;
        }
        case 'focus':
        case 'junc':
          this.onClock(e);
          break;
        case 'paceA':
          if (this.pace && e.gen === this.pace.genA) {
            if (this.pace.inhibited(e.t)) {
              this.pace.genA++;
              this.q.push({ k: 'paceA', t: e.t + 80, gen: this.pace.genA });
            } else this.stimulate('A', e.t);
          }
          break;
        case 'paceV':
          if (this.pace && e.gen === this.pace.genV) {
            if (this.pace.inhibited(e.t)) {
              // a sensed myopotential resets the ventricular timer (oversensing)
              this.pace.lastV = e.t;
              this.pace.genV++;
              this.q.push({ k: 'paceV', t: e.t + this.pace.lri, gen: this.pace.genV });
              const burst = this.pace.bursts.find((x) => e.t >= x.from && e.t <= x.to);
              if (burst) {
                this.pace.genV++;
                this.q.push({ k: 'paceV', t: burst.to + this.pace.lri, gen: this.pace.genV });
              }
            } else this.stimulate('V', e.t);
          }
          break;
      }
    }
  }

  clocks: { focus?: () => void; junc?: () => void } = {};
  onClock(e: Ev): void {
    if (e.k === 'focus') this.clocks.focus?.();
    if (e.k === 'junc') this.clocks.junc?.();
  }
}

interface PaceState {
  readonly mode: 'AAI' | 'VVI' | 'DDD';
  readonly site: PacingSite | 'biv';
  readonly lri: number;
  readonly avDelay: number;
  readonly bipolar: boolean;
  readonly fault: 'no-capture' | 'undersensing' | 'oversensing' | null;
  readonly bursts: readonly { from: number; to: number }[];
  lastA: number;
  lastV: number;
  genA: number;
  genV: number;
  /** atrial event that started the running AV delay (DDD) */
  trackedA: number | null;
  inhibited(t: number): boolean;
}

/** Readable flutter circuit and atrial site (truth facts). */
const FLUTTER_CIRCUIT: Readonly<Record<'ccw' | 'cw' | 'la', string>> = {
  ccw: 'typical counter-clockwise (cavotricuspid isthmus)', cw: 'reverse typical clockwise (cavotricuspid isthmus)', la: 'left atrial (atypical)',
};
const ATRIAL_SITE_LABEL: Readonly<Record<AtrialSite, string>> = {
  sinus: 'sinus node', 'high-ra': 'high right atrium', crista: 'crista terminalis', 'ra-septal': 'right atrial septum',
  'low-ra': 'low right atrium', 'cs-ostium': 'coronary sinus ostium', 'la-superior': 'left atrium (superior)',
  'la-inferior': 'left atrium (inferior)', 'left-pv': 'left superior pulmonary vein', 'right-pv': 'right pulmonary vein',
  retrograde: 'AV junction (retrograde)',
};

/** Readable ectopic origin (truth facts). */
const ORIGIN_LABEL: Readonly<Record<VentOrigin, string>> = {
  'rvot-septal': 'right ventricular outflow tract (septal)', 'rvot-free': 'right ventricular outflow tract',
  'rv-free-wall': 'RV free wall', 'rv-apex': 'RV apex', 'lvot-cusp': 'LV outflow tract (aortic cusp)',
  'lv-basal-inferolateral': 'LV basal inferolateral wall', 'lv-lateral': 'LV lateral wall', 'lv-apex': 'LV apex',
  'lv-anterior-scar': 'LV anterior wall (scar)', 'lv-inferior-scar': 'LV inferior wall (scar)',
  'fascicular-posterior': 'left posterior fascicle', 'fascicular-anterior': 'left anterior fascicle', junctional: 'AV junction',
};

/** RR (ms) of the dominant rhythm: the injury solve and the morphologies are built at this rate. */
export function dominantRrOf(r: RhythmSpec): number {
  switch (r.kind) {
    case 'sinus': case 'ventricular': case 'junctional': case 'atrial-ectopic': case 'avnrt': case 'avrt': case 'polymorphic': case 'vflutter':
      return 60000 / r.rateBpm;
    case 'atrial-tachycardia':
      return 60000 / Math.min(r.rateBpm, 150);
    case 'paced':
      return 60000 / r.lowerRateBpm;
    default:
      return 800;
  }
}

export function scheduleRhythm(inp: ScheduleInput): Schedule {
  const { source, junction: J, rng, t0, t1 } = inp;
  const top = source.rhythm;
  const paced = top.kind === 'paced' ? top : null;
  const rh: RhythmSpec = paced ? paced.underlying : top;
  if (rh.kind === 'paced') throw new Error('src/synth: a pacemaker cannot be the underlying rhythm of a pacemaker');
  const S = new Sim(inp, J, dominantRrOf(top), rh.kind === 'sinus' ? rh : null);
  const durationMs = inp.durationMs ?? t1 - 500;
  let atrialCycle: number | null = null;
  if (paced) {
    const lri = 60000 / paced.lowerRateBpm;
    const bursts = paced.fault === 'oversensing' ? myopotentialBursts(rng.fork('myopotential'), durationMs) : [];
    S.pace = {
      mode: paced.mode, site: paced.ventricularSite, lri, avDelay: paced.avDelayMs, bipolar: paced.bipolar, fault: paced.fault ?? null, bursts,
      lastA: -Infinity, lastV: -Infinity, genA: 1, genV: 1, trackedA: null,
      inhibited: (t) => bursts.some((b) => t >= b.from && t <= b.to),
    };
    if (bursts.length) S.notes.oversensedMs = bursts.map((b) => `${Math.round(b.from)}–${Math.round(b.to)}`).join(', ');
    S.notes.pacingMode = paced.mode;
    S.notes.lowerRateBpm = String(paced.lowerRateBpm);
    // the device starts its timers at the start of the pre-roll
    if (paced.mode !== 'VVI') S.q.push({ k: 'paceA', t: t0 + 50, gen: 1 });
    if (paced.mode !== 'AAI') S.q.push({ k: 'paceV', t: t0 + 50 + (paced.mode === 'DDD' ? paced.avDelayMs : 0), gen: 1 });
  }
  // the escape pacemaker runs from the start of the pre-roll (it is reset by every ventricular activation)
  if (J.escape) S.q.push({ k: 'escape', t: t0 + rng.fork('escape').range(0, 60000 / J.escape.rateBpm), gen: 0 });
  switch (rh.kind) {
    case 'sinus': {
      atrialCycle = 60000 / rh.rateBpm;
      // regular WPW: the authored fused pattern replaces the nodal and pathway arrivals (one beat at the delta onset)
      S.pushSinus();
      break;
    }
    case 'atrial-ectopic':
    case 'atrial-tachycardia': {
      const mode = rh.kind === 'atrial-tachycardia' ? 'tachycardia' : rh.mode;
      const sites = rh.kind === 'atrial-tachycardia' ? [rh.site] : rh.sites;
      atrialCycle = rh.kind === 'atrial-tachycardia' || rh.mode === 'fixed' ? 60000 / rh.rateBpm : null;
      for (const a of atrialSiteClock(mode, sites, rh.rateBpm, t0, t1, rng.fork('atrial-clock'))) {
        S.q.push({ k: 'atrial', t: a.t, run: () => S.depolarise(a.t, a.site, 'ectopic', { toNode: true, dominant: true, regular: a.regular }) });
      }
      break;
    }
    case 'flutter': {
      const cyc = flutterCycle(rh.circuit, rh.cycleMs, inp.mirror);
      atrialCycle = rh.cycleMs;
      const r = rng.fork('flutter');
      for (let t = t0 - r.range(0, rh.cycleMs); t < t1; t += rh.cycleMs) {
        const tt = t;
        S.q.push({
          k: 'atrial', t: tt, run: () => {
            const idx = S.atrial.length;
            const ks = cyc.lobes.map((l) => lobeKernel(l, tt, idx, true));
            ks.push(lobeKernel(cyc.ta, tt, idx, true));
            const ev = S.addAtrial({ t: tt, kind: 'flutter', pOn: tt + Math.min(...cyc.lobes.map((l) => l.on)), pOff: tt + rh.cycleMs, kernels: ks, nodeIn: tt + J.intraAtrialMs, chambers: 'both', stream: null, site: `flutter-${rh.circuit}`, dominant: true, regularCycle: true });
            S.q.push({ k: 'node', t: tt + J.intraAtrialMs, ev: ev.index });
          },
        });
      }
      break;
    }
    case 'fibrillation': {
      const cycles = fibrillationCycles(rh.coarseness, rh.cycleMs, t0, t1, rng.fork('af'), inp.mirror);
      const r = rng.fork('af-conduction');
      const rp = rng.fork('af-pathway');
      for (const c of cycles) {
        const arrive = c.t + J.intraAtrialMs + (c.region === 'la' ? 18 : 0) + r.range(-8, 8);
        S.q.push({
          k: 'atrial', t: c.t, run: () => {
            const idx = S.atrial.length;
            const ks = c.lobes.map((l) => lobeKernel(l, c.t, idx, true));
            const ev = S.addAtrial({ t: c.t, kind: 'fibrillation', pOn: c.t, pOff: c.t + c.cycleMs, kernels: ks, nodeIn: arrive, chambers: c.region, stream: c.stream, site: 'fibrillation' });
            S.q.push({ k: 'node', t: arrive, ev: ev.index });
            // pre-excited AF: the wavelet also reaches the pathway's atrial insertion — not at the same time as the node:
            // a left-atrial wavelet reaches a left-sided insertion first, a right-atrial one later, each by its own path
            // (PW_LEAD ± PW_SPREAD_MS), so the lead of the delta over the nodal front, and with it the degree of fusion,
            // changes beat to beat
            if (S.pw && inp.nativeKind === 'preexcited') {
              const atPw = c.t + J.intraAtrialMs + PW_LEAD[c.region] + rp.range(-PW_SPREAD_MS, PW_SPREAD_MS);
              if (S.pw.offer(atPw, 'antegrade')) S.q.push({ k: 'vent', t: atPw + S.pw.spec.conductionMs - J.intraAtrialMs, v: { src: 'pathway', atrial: ev.index, his: null } });
            }
          },
        });
      }
      break;
    }
    case 'junctional': {
      // junctional pacemaker (His activation); retrograde P′ at QRS onset + retroLagMs (null: no VA conduction)
      atrialCycle = rh.retroLagMs !== null ? 60000 / rh.rateBpm : null;
      const rr = 60000 / rh.rateBpm;
      const r = rng.fork('junctional');
      let h = t0 - r.range(0, rr);
      S.clocks.junc = () => {
        const his = h;
        S.q.push({ k: 'vent', t: his + J.hvMs, v: { src: 'junctional', atrial: null, his, retroLag: rh.retroLagMs } });
        h += rr * (1 + 0.006 * r.normal());
        S.q.push({ k: 'junc', t: h, gen: 0 });
      };
      S.q.push({ k: 'junc', t: h, gen: 0 });
      break;
    }
    case 'ventricular': {
      // VT (≥ 100 /min) is re-entrant and keeps its cycle; a slower focus (AIVR, idioventricular) is automatic and is
      // reset by any other ventricular activation. Both are sustained ventricular rhythms: the electrotonic coupling of
      // a sustained rhythm (0.7, small primary gradient) shapes their T (DECISION §9.4, §11)
      const sustained = rh.rateBpm >= 100;
      if (!rh.captures) S.avConduction = false;
      const m = S.M.ectopic(rh.origin, true);
      const rr = 60000 / rh.rateBpm;
      const r = rng.fork('focus');
      let f = t0 - r.range(0, rr);
      let gen = 0;
      // VT (re-entry, ≥ 100/min) keeps its cycle; an idioventricular / accelerated focus (automaticity) is reset by
      // any other ventricular activation (captures)
      S.clocks.focus = () => {
        S.q.push({ k: 'vent', t: f, v: { src: 'focus', atrial: null, his: null, origin: rh.origin, morph: m } });
        f += rr + (sustained ? 1.5 : 6) * r.normal();
        S.q.push({ k: 'focus', t: f, gen: ++gen });
      };
      S.q.push({ k: 'focus', t: f, gen: gen });
      if (!sustained) {
        const orig = S.afterBeat.bind(S);
        S.afterBeat = (b, v) => {
          orig(b, v);
          if (v.src !== 'focus') {
            f = b.qrsOn + rr;
            S.q.push({ k: 'focus', t: f, gen: ++gen });
          }
        };
        const onClock = S.onClock.bind(S);
        S.onClock = (e) => {
          if (e.k === 'focus' && e.gen !== gen) return;
          onClock(e);
        };
      }
      if (rh.sinusBpm !== null) {
        atrialCycle = 60000 / rh.sinusBpm;
        const sn = new SinusNode({ rateBpm: rh.sinusBpm, hrv: sustained ? 0.01 : 0.05 }, t0, rng.fork('sinus'));
        while (sn.peek() < t1) {
          const x = sn.take();
          S.q.push({ k: 'atrial', t: x.t, run: () => S.depolarise(x.t, 'sinus', 'sinus', { toNode: rh.captures ?? false, dominant: true, regular: x.regular }) });
        }
      }
      break;
    }
    case 'avnrt':
    case 'avrt': {
      reentry(S, rh, inp);
      atrialCycle = 60000 / rh.rateBpm;
      break;
    }
    case 'polymorphic':
      polymorphic(S, rh, inp, durationMs);
      break;
    case 'vf':
      for (const w of vfCycles(rh.coarseness, t0, t1, rng.fork('vf'))) for (const l of w.lobes) S.kernels.push(lobeKernel(l, w.t, -1));
      break;
    case 'vflutter': {
      const ref = generatedPattern('origin:lv-apex', ORIGIN_INPUT['lv-apex'], 'lv-apex');
      for (const w of vflutterCycles(rh.rateBpm, t0, t1, rng.fork('vflutter'))) {
        const ks = w.lobes.map((l) => lobeKernel(l, w.t, S.beats.length));
        const on = w.t, off = w.t + 0.56 * (60000 / rh.rateBpm);
        const b: BeatInst = {
          index: S.beats.length, kind: 'ventricular', qrsOn: on, qrsOff: off, j: off, tPeak: w.t + 0.75 * (60000 / rh.rateBpm), tOff: w.t + 1.06 * (60000 / rh.rateBpm), uOff: null,
          atrialEvent: null, patternKey: 'vflutter', fraction: 0, aberrant: false, rrPrevMs: 60000 / rh.rateBpm, timing: activationTiming(ref.activation),
          kernels: ks, hisAt: null, jtScale: 1, ectopic: false, retroEvent: null, stimAt: null, origin: 'vflutter',
        };
        S.beats.push(b);
        S.kernels.push(...ks);
      }
      break;
    }
    case 'asystole': {
      S.avConduction = false;
      if (rh.atrialBpm !== null) {
        atrialCycle = 60000 / rh.atrialBpm;
        const sn = new SinusNode({ rateBpm: rh.atrialBpm, hrv: 0.02 }, t0, rng.fork('sinus'));
        while (sn.peek() < t1) {
          const x = sn.take();
          S.q.push({ k: 'atrial', t: x.t, run: () => S.depolarise(x.t, 'sinus', 'sinus', { toNode: false, dominant: true, regular: x.regular }) });
        }
      }
      break;
    }
    default:
      throw new Error(`src/synth: rhythm '${(rh as RhythmSpec).kind}' is not supported`);
  }
  S.run(t1);
  if (J.infraHis) S.notes.blockLevel = 'infra-His';
  if (J.completeNodal) S.notes.blockLevel = 'AV node';
  // facts of the realised rhythm (they override the scenario's, so a variant cannot keep a stale one): the escape
  // pacemaker that produced beats in the strip (a true escape: slower than the atria), and the PVC origins that fired
  const inStrip = S.beats.filter((b) => b.qrsOn >= 0 && b.qrsOn < durationMs);
  if (J.escape && atrialCycle !== null && J.escape.rateBpm < 60000 / atrialCycle
    && inStrip.some((b) => b.kind === 'escape-junctional' || b.kind === 'escape-ventricular')) {
    S.notes.escape = `${J.escape.level} ${Math.round(J.escape.rateBpm)}/min`;
  }
  if (rh.kind === 'flutter') S.notes.circuit = FLUTTER_CIRCUIT[rh.circuit];
  if (rh.kind === 'avnrt') S.notes.circuit = rh.form === 'typical' ? 'slow pathway antegrade, fast pathway retrograde' : 'fast pathway antegrade, slow pathway retrograde';
  if (rh.kind === 'atrial-ectopic' && rh.mode === 'fixed') S.notes.site = ATRIAL_SITE_LABEL[rh.sites[0]];
  if (source.ectopy?.some((e) => e.kind === 'pvc')) {
    const origins = [...new Set(inStrip.filter((b) => b.ectopic && b.kind === 'ventricular' && b.origin).map((b) => b.origin as VentOrigin))];
    if (origins.length) S.notes.origin = (origins.length > 1 ? 'multifocal: ' : '') + origins.map((o) => ORIGIN_LABEL[o]).join(' + ');
  }
  // atrial events in time order (a junctional beat creates its retrograde P′ before its own QRS onset)
  const order = S.atrial.map((e, i) => i).sort((a, b) => S.atrial[a].t - S.atrial[b].t || a - b);
  const remap = new Map(order.map((old, i) => [old, i]));
  const atrial: AtrialEv[] = order.map((old, i) => ({ ...S.atrial[old], index: i }));
  const beats: BeatInst[] = S.beats.map((b) => ({
    ...b,
    atrialEvent: b.atrialEvent !== null ? (remap.get(b.atrialEvent) ?? null) : null,
    retroEvent: b.retroEvent !== undefined && b.retroEvent !== null ? (remap.get(b.retroEvent) ?? null) : null,
  }));
  const myopotentials = S.pace?.bursts.length ? S.pace.bursts : undefined;
  return { atrial, beats, kernels: S.kernels, atrialCycleMs: atrialCycle, stimuli: S.stimuli, notes: S.notes, ...(myopotentials ? { myopotentials } : {}) };
}

// ── re-entrant SVT ──────────────────────────────────────────────────────────────────────────────────────────────
function reentry(S: Sim, rh: Extract<RhythmSpec, { kind: 'avnrt' | 'avrt' }>, inp: ScheduleInput): void {
  const J = S.J;
  const cyc = 60000 / rh.rateBpm;
  const r = inp.rng.fork('reentry');
  let q = inp.t0 - r.range(0, cyc);
  const antidromic = rh.kind === 'avrt' && rh.form === 'antidromic';
  const pathway = J.pathway;
  if (rh.kind === 'avrt' && !pathway) throw new Error('src/synth: AVRT needs junction.pathway');
  const morph = antidromic ? S.M.preexcited(null, true) : S.M.conducted();
  // retrograde P′: AVNRT typical — via the fast pathway (septal exit, both atria at once: a short P′ positive in V1,
  // negative inferiorly), P′ onset 60 ms after the QRS onset so that its peak lands just after the terminal S of V1 and
  // the terminal R of II (pseudo-r′ in V1, pseudo-S inferiorly; RP′ < 70 ms); atypical — long RP′ (P′ before the next
  // QRS).
  // Orthodromic AVRT — via the accessory pathway, RP′ ≥ 70 ms (P′ in the ST segment, RP′ < P′R); antidromic — via the
  // AV node, the P′ midway.
  // antidromic: retrograde over the AV node after the His–Purkinje is engaged, the P′ buried in the ST–T
  const rp = rh.kind === 'avnrt' ? (rh.form === 'typical' ? 60 : 0.62 * cyc) : rh.form === 'orthodromic' ? Math.max(95, 0.36 * cyc)
    : Math.min(cyc - 120, visibleQrsEnd(morph) + 10);
  const pSite: GenSite = rh.kind === 'avrt' && rh.form === 'orthodromic' ? pathwayAtrialSite(pathway!.site)
    : rh.kind === 'avnrt' && rh.form === 'typical' ? 'fast-pathway' : 'retrograde';
  // long-RP circuit (atypical, fast–slow AVNRT): the retrograde P′ leaves the circuit's upper turnaround, which also
  // sends the impulse down the fast pathway to the NEXT QRS — the P′ belongs to the beat that follows it (a reader
  // reads it as an inverted P′ with a short P′R); short-RP circuits keep their P′ with the QRS before it
  const longRp = rp > cyc / 2;
  while (q < inp.t1) {
    const qq = q;
    // the circuit itself guarantees that the ventricles are excitable when its impulse arrives
    S.q.push({
      k: 'vent', t: qq, v: {
        src: 'reentry', atrial: null, his: antidromic ? null : qq - J.hvMs, morph, kind: rh.kind === 'avnrt' ? 'junctional' : 'atrial', force: true,
        ...(longRp ? { retroLag: rp - cyc, retroSite: pSite } : {}),
      },
    });
    if (!longRp) {
      const pt = qq + rp;
      S.q.push({
        k: 'atrial', t: pt, run: () => {
          const ev = S.depolarise(pt, pSite, 'retrograde', { toNode: false, dominant: true, regular: true });
          const b = S.beats[S.beats.length - 1];
          if (b && Math.abs(b.qrsOn - qq) < 1) (b as { retroEvent?: number | null }).retroEvent = ev.index;
        },
      });
    }
    q += cyc * (1 + 0.003 * r.normal());
  }
}

// ── polymorphic VT / torsades ───────────────────────────────────────────────────────────────────────────────────
/**
 * The complex of a torsades run: one biphasic oscillation per cycle along the focus's mean QRS direction (rising lobe
 * over 0–0.56 cycle, the opposite lobe over 0.44–1.06 cycle, equal areas), as in ventricular flutter: at 200–250 /min a
 * wide QRS and its T merge into a sinusoid. The run turns its direction beat by beat (polymorphic()).
 */
function twistingMorph(base: VentMorph, cycleMs: number, axis: Vec3): VentMorph {
  const c = cycleMs;
  const regions = base.qrs[0]?.regions ?? ([['rv-apical', 1]] as const);
  // the oscillation's direction lies in the plane of the twist (its component along the twist axis would not turn:
  // a constant offset of one polarity in the leads near that axis instead of a twist about the baseline)
  const a0 = unit(base.aQrs);
  const along = a0[0] * axis[0] + a0[1] * axis[1] + a0[2] * axis[2];
  const d = unit([a0[0] - along * axis[0], a0[1] - along * axis[1], a0[2] - along * axis[2]]);
  // pointed apices (q 1.5): the oscillation keeps the sharp QRS peaks of a ventricular complex
  const up: Lobe = { label: 'TdP+', on: 0, peak: 0.25 * c, end: 0.56 * c, endRule: 'edge', q: 1.5, dir: d, dir2: null, amp: 1.5, regions, loc: null, far: 1, wave: 'QRS' };
  const down = lobeWithArea({ label: 'TdP−', on: 0.44 * c, peak: 0.75 * c, end: 1.06 * c, endRule: 'edge', q: 1.5, regions, loc: null, far: 1, wave: 'QRS' }, scale(lobeArea(up), -1));
  return {
    ...base, key: `${base.key}:twist`, qrs: [up, down], qrsOn: 0, qrsOff: 0.56 * c, jEnd: null, post: [], plateaus: [], primaryIdx: [],
    tPrimary: { on: 0, peak: 0.19 * c, end: 0.5 * c }, uEnd: null, alternans: 0, swing: null,
  };
}

/**
 * Lead-in: sinus beats (torsades: bradycardic, with the scenario's long QT) → short–long–short initiation (a PVC, its
 * compensatory pause, one sinus beat, then an R-on-T PVC) → the run. Torsades: the QRS axis turns about a fixed axis
 * by 360° every `twistBeats` beats with the amplitude modulated (waxing and waning about the isoelectric line); PMVT:
 * the origin's orientation random-walks beat to beat. The run self-terminates after ≈ 5 s and sinus rhythm resumes.
 */
/**
 * Twist axis of torsades (Frank, unit): chosen so that every one of the twelve leads has ≥ 78 % of its lead vector in
 * the plane of the twist (II 81 %, V1 87 %, V5 100 %): the waxing, waning and polarity reversal show in the strip lead
 * II as in the chest leads.
 */
const TWIST_AXIS: Vec3 = unit([-0.04, 0.71, 0.71]);

function polymorphic(S: Sim, rh: Extract<RhythmSpec, { kind: 'polymorphic' }>, inp: ScheduleInput, durationMs: number): void {
  const torsades = rh.twistBeats !== null;
  const r = inp.rng.fork('polymorphic');
  const leadInBpm = torsades ? 62 : 78;
  const sn = new SinusNode({ rateBpm: leadInBpm, hrv: 0.01 }, inp.t0, r.fork('sinus'));
  const runStart = 0.38 * durationMs + r.range(-200, 200);
  const runMs = 0.5 * durationMs + r.range(-300, 300);
  const cyc = 60000 / rh.rateBpm;
  // torsades: at 200–250 /min the complexes are one smooth oscillation per cycle (no isoelectric ST, QRS and T
  // indistinguishable — as in ventricular flutter); the run turns its direction. PMVT keeps discrete complexes.
  const axis = torsades ? TWIST_AXIS : ([0, 0, 1] as const);
  const base = torsades ? twistingMorph(S.M.ectopic('rv-apex', true), cyc, TWIST_AXIS) : S.M.ectopic('lv-apex', true);
  // sinus lead-in (and recovery after the run)
  while (sn.peek() < inp.t1) {
    const x = sn.take();
    if (x.t > runStart - 1600 && x.t < runStart + runMs + 300) continue;
    S.q.push({ k: 'atrial', t: x.t, run: () => S.depolarise(x.t, 'sinus', 'sinus', { toNode: true, dominant: true, regular: x.regular }) });
  }
  // short–long–short: PVC 1.6 s before the run, one sinus beat after the pause, then the R-on-T start
  const pvcAt = runStart - 1550;
  S.q.push({ k: 'vent', t: pvcAt, v: { src: 'pvc', atrial: null, his: null, origin: torsades ? 'rv-apex' : 'lv-apex', ectopic: true, force: true } });
  const sinusAfter = runStart - 1550 + 1150;
  S.q.push({ k: 'atrial', t: sinusAfter - 160, run: () => S.depolarise(sinusAfter - 160, 'sinus', 'sinus', { toNode: true, dominant: true }) });
  // the run: per-beat orientation (axis twist or random walk) and amplitude envelope
  // torsades: the QRS vector turns about an oblique axis (TWIST_AXIS: frontal and horizontal components both change),
  // half a turn every `twistBeats` beats, so in every lead the complexes wax, wane to a node where the polarity
  // reverses, and wax again with the other polarity — the twist about the baseline in the limb AND the chest leads
  let ang = r.range(0, 360);
  let walk: [number, number, number] = [0, 0, 0];
  let t = sinusAfter + 360;
  let k = 0;
  while (t < runStart + runMs) {
    let rot: Mat3, amp: number;
    if (torsades) {
      ang += 180 / rh.twistBeats!;
      const deg = ang;
      const c = Math.cos((deg * Math.PI) / 180), s = Math.sin((deg * Math.PI) / 180);
      const [x, y, z] = axis;
      const C = 1 - c;
      rot = [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
      amp = 0.85 * (0.9 + 0.1 * r.next());
    } else {
      walk = [walk[0] + 40 * r.normal(), walk[1] + 40 * r.normal(), walk[2] + 40 * r.normal()];
      rot = rotationMatrix(walk[0], walk[1], walk[2]);
      amp = 0.7 + 0.3 * r.next();
    }
    S.q.push({ k: 'vent', t, v: { src: 'focus', atrial: null, his: null, origin: torsades ? 'rv-apex' : 'lv-apex', morph: base, rot, amp, kind: 'ventricular', force: true } });
    t += cyc * (1 + (torsades ? 0.06 : 0.1) * r.normal());
    k++;
  }
}
