// synth.ts — public entry point: generate(conditionId, {fs, durationS, seed}) -> 12 leads + truth + region activity.
// Every lead comes from one source description (activation/repolarisation of the node field) through one lead system
// (BEM torso, electrode potentials RA/LA/LL/V1..V6); limb leads are formed from RA, LA, LL; V leads against Wilson's CT.
import { buildModel, simulate } from './model.ts';
import type { Model, Params } from './model.ts';
import { defaultTorso, leadSystem, nodeWeights, ELECTRODES, SIGMA } from './torso.ts';
import type { LeadSystem } from './torso.ts';
import { synthesize, CLASSES } from './ecg.ts';
import { CONDITIONS } from './conditions.ts';
import { CH, SF, DOM } from './geom.ts';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type LeadName = typeof LEADS[number];

export interface Beat { pOnMs: number | null; qrsOnMs: number; qrsOffMs: number; tOffMs: number; }
export interface Truth { hrBpm: number; prMs: number | null; qrsMs: number; qtMs: number; qrsAxisDeg: number; rhythm: string; beats: Beat[]; }
export interface Result {
  leads: Record<LeadName, Float32Array>;
  truth: Truth;
  regions: { names: string[]; activityAt(tMs: number): Float32Array };
}

const CACHE_DIR = new URL('./cache/', import.meta.url);
let LS: LeadSystem | null = null;
const W_CACHE = new Map<string, Float64Array[]>();

function hash(s: string): string { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); }

function leads(): LeadSystem {
  if (LS) return LS;
  const tp = defaultTorso();
  const key = hash(JSON.stringify(tp) + 'v1');
  const f = new URL('leads_' + key + '.json', CACHE_DIR);
  if (existsSync(f)) {
    const d = JSON.parse(readFileSync(f, 'utf8'));
    const cen = Float64Array.from(d.cen as number[]);
    const coef = (d.coef as number[][]).map((c) => Float64Array.from(c));
    const n = cen.length / 3; const k = 1 / (2 * Math.PI * SIGMA) * 1000;
    LS = {
      mesh: { tris: [], cen, area: new Float64Array(n), nrm: new Float64Array(3 * n), n }, coef,
      Z(e: number, x: number, y: number, z: number): number { const c = coef[e]; let s = 0; for (let i = 0; i < n; i++) { const dx = cen[3 * i] - x, dy = cen[3 * i + 1] - y, dz = cen[3 * i + 2] - z; s += c[i] / Math.sqrt(dx * dx + dy * dy + dz * dz); } return s * k; },
    };
    return LS;
  }
  LS = leadSystem(tp);
  try { mkdirSync(CACHE_DIR, { recursive: true }); writeFileSync(f, JSON.stringify({ cen: Array.from(LS.mesh.cen), coef: LS.coef.map((c) => Array.from(c)) })); } catch { /* cache is optional */ }
  return LS;
}

export function weightsFor(m: Model): Float64Array[] {
  const key = hash(JSON.stringify(m.p.geom) + m.g.n + 'v3');
  const hit = W_CACHE.get(key); if (hit) return hit;
  const f = new URL('w_' + key + '.bin', CACHE_DIR);
  if (existsSync(f)) {
    const buf = readFileSync(f); const all = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength / 8);
    if (all.length === ELECTRODES.length * m.g.n) {
      const W = ELECTRODES.map((_, e) => all.slice(e * m.g.n, (e + 1) * m.g.n));
      W_CACHE.set(key, W); return W;
    }
  }
  const W = nodeWeights(m.g, leads());
  W_CACHE.set(key, W);
  if (!(typeof process !== 'undefined' && process.env.FIELD_NOCACHE)) { try { const all = new Float64Array(ELECTRODES.length * m.g.n); W.forEach((w, e) => all.set(w, e * m.g.n)); writeFileSync(f, new Uint8Array(all.buffer)); } catch { /* optional */ } }
  return W;
}

function quantile(a: number[], q: number): number { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))]; }

export interface Internals { model: Model; phi: Float64Array[]; t0: number; dt: number; }
export let lastInternals: Internals | null = null;

export function generate(conditionId: string, opts: { fs: number; durationS: number; seed: number }): Result {
  const cond = CONDITIONS[conditionId];
  if (!cond) throw new Error('unknown condition ' + conditionId);
  const p: Params = cond.params(opts.seed);
  // dev-only hook used while tuning one condition: FIELD_COVR (same format as FIELD_OVR) is merged after the condition
  const covr = typeof process !== 'undefined' ? process.env.FIELD_COVR : undefined;
  if (covr) { const o = JSON.parse(covr) as Record<string, unknown>; const t = p as unknown as Record<string, unknown>; for (const k of Object.keys(o)) { const v = o[k]; const cur = t[k]; t[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? { ...(cur as object), ...(v as object) } : v; } }
  const model = buildModel(p, opts.seed);
  const durMs = opts.durationS * 1000;
  const acts = simulate(model, durMs, opts.seed);
  const W = weightsFor(model);
  const dt = Math.min(1, 1000 / opts.fs / 2);
  const t0 = -p.preMs;
  const T = Math.ceil((durMs + 2 - t0) / dt) + 2;
  const tpl = { amp: model.amp, rest: model.rest, notch: model.notch, slope: model.slope, cls: model.cls };
  const phi = synthesize(acts, model.nMyo, W, tpl, t0, T, dt, 1000 * p.gain);
  lastInternals = { model, phi, t0, dt };
  // resample to fs (box average over one output period, centred)
  const N = Math.round(opts.durationS * opts.fs);
  const ns = Math.max(1, Math.round(1000 / opts.fs / dt));
  const el = (name: string) => phi[ELECTRODES.indexOf(name as typeof ELECTRODES[number])];
  const sample = (x: Float64Array) => {
    const o = new Float64Array(N);
    for (let k = 0; k < N; k++) {
      const c = Math.round((k * 1000 / opts.fs - t0) / dt);
      let s = 0, m = 0;
      for (let q = -Math.floor(ns / 2); q < ns - Math.floor(ns / 2); q++) { const i = c + q; if (i >= 0 && i < x.length) { s += x[i]; m++; } }
      o[k] = m ? s / m : 0;
    }
    return o;
  };
  const RA = sample(el('RA')), LA = sample(el('LA')), LL = sample(el('LL'));
  const out = {} as Record<LeadName, Float32Array>;
  const mk = (f: (k: number) => number) => { const a = new Float32Array(N); for (let k = 0; k < N; k++) a[k] = f(k); return a; };
  out.I = mk((k) => LA[k] - RA[k]);
  out.II = mk((k) => LL[k] - RA[k]);
  out.III = mk((k) => LL[k] - LA[k]);
  out.aVR = mk((k) => RA[k] - 0.5 * (LA[k] + LL[k]));
  out.aVL = mk((k) => LA[k] - 0.5 * (RA[k] + LL[k]));
  out.aVF = mk((k) => LL[k] - 0.5 * (RA[k] + LA[k]));
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) { const V = sample(el(v)); out[v] = mk((k) => V[k] - (RA[k] + LA[k] + LL[k]) / 3); }
  // the QRS axis is a property of ventricular depolarisation: the truth axis is taken from the ventricular part of
  // the same source (atrial weights masked out), so flutter/fibrillation waves superimposed on the QRS do not move it
  const g = model.g, li = ['RA', 'LA', 'LL'].map((nm) => ELECTRODES.indexOf(nm as typeof ELECTRODES[number]));
  const Wv = li.map((e) => W[e].map((w, i) => (g.dom[i] === DOM.V ? w : 0)));
  const pv = synthesize(acts, model.nMyo, Wv, tpl, t0, T, dt, 1000 * p.gain).map(sample);
  const vent = { I: mk((k) => pv[1][k] - pv[0][k]), aVF: mk((k) => pv[2][k] - 0.5 * (pv[0][k] + pv[1][k])) };
  const truth = computeTruth(model, vent, opts.fs, durMs, cond.rhythm);
  return { leads: out, truth, regions: regionActivity(model) };
}

// L: leads I and aVF of the ventricular source only (used for the axis)
function computeTruth(m: Model, L: { I: Float32Array; aVF: Float32Array }, fs: number, durMs: number, rhythm: string): Truth {
  const a = m.acts!; const g = m.g;
  // ventricular beats: cluster ventricular myocardial activations in time
  const vt: number[] = [], vrt: number[] = [];
  const at: number[] = [];
  const order: number[] = [];
  for (let k = 0; k < a.count; k++) { const i = a.node[k]; if (i < m.nMyo && g.dom[i] === DOM.V) order.push(k); else if (i < m.nMyo) at.push(a.t[k]); }
  order.sort((x, y) => a.t[x] - a.t[y]);
  const clusters: number[][] = [];
  let cur: number[] = [];
  for (const k of order) { if (cur.length && a.t[k] - a.t[cur[cur.length - 1]] > 60) { clusters.push(cur); cur = []; } cur.push(k); }
  if (cur.length) clusters.push(cur);
  void vt; void vrt;
  at.sort((x, y) => x - y);
  // atrial wave onsets (sinus/ectopic P waves): clusters of atrial activations
  const aOn: number[] = []; let prev = -1e9;
  for (const t of at) { if (t - prev > 120) aOn.push(t); prev = t; }
  const nV = g.dom.reduce((s, d) => s + (d === DOM.V ? 1 : 0), 0);
  const beats: Beat[] = [];
  const conducted = m.avnLog.filter((e) => e.conducted).map((e) => e.t);
  const hasP = m.p.rhythm.kind === 'sinus';
  for (const c of clusters) {
    if (c.length < 0.5 * nV) continue; // partial wave (should not happen)
    const ts = c.map((k) => a.t[k]);
    // end of T: 90% of the myocardium has passed the midpoint of phase 3, plus 1.5 phase-3 widths (the remaining
    // tail is too small to see on paper; calibrated against tangent-method T-end measurements in check.ts)
    const rts = c.map((k) => a.t[k] + a.apd[k] + 1.5 * CLASSES[m.cls[a.node[k]]].w3);
    const on = ts[0];
    const off = quantile(ts, 0.995) + 3 * CLASSES[0].wu; // + upstroke kernel tail
    const tOff = quantile(rts, 0.9);
    let pOn: number | null = null;
    if (hasP) {
      // the AV-node conduction that produced this beat, then the atrial wave that reached the AV node
      const cand = conducted.filter((t) => t < on && on - t < 350);
      if (cand.length) { const tav = cand[cand.length - 1]; const ps = aOn.filter((t) => t <= tav && tav - t < 250); if (ps.length) pOn = ps[ps.length - 1]; }
    }
    if (on < 0 || tOff > durMs) continue;
    beats.push({ pOnMs: pOn, qrsOnMs: on, qrsOffMs: off, tOffMs: tOff });
  }
  const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / Math.max(1, x.length);
  const allOn = clusters.filter((c) => c.length >= 0.5 * nV).map((c) => a.t[c[0]]).filter((t) => t >= -2000 && t <= durMs);
  const rr: number[] = []; for (let k = 1; k < allOn.length; k++) rr.push(allOn[k] - allOn[k - 1]);
  const prs = beats.filter((b) => b.pOnMs !== null).map((b) => b.qrsOnMs - (b.pOnMs as number));
  // frontal QRS axis from the net QRS deflections (largest positive + largest negative deflection, R - |S|) in I and
  // aVF within the model's QRS windows, as a reader determines it (baseline: 20..4 ms before QRS onset). The net QRS
  // AREA is not used: in balanced complexes (RBBB, pre-excitation) it is close to zero and its sign is decided by
  // the ST injury current or the atrial T wave rather than by the QRS deflections a reader sees.
  let sI = 0, sF = 0;
  for (const b of beats) {
    const k0 = Math.floor(b.qrsOnMs * fs / 1000), k1 = Math.ceil(b.qrsOffMs * fs / 1000);
    const kb0 = Math.max(0, k0 - Math.round(0.02 * fs)), kb1 = Math.max(1, k0 - Math.round(0.004 * fs));
    let bI = 0, bF = 0; for (let k = kb0; k < kb1; k++) { bI += L.I[k]; bF += L.aVF[k]; } bI /= kb1 - kb0; bF /= kb1 - kb0;
    let xI = 0, nI = 0, xF = 0, nF = 0;
    for (let k = k0; k <= k1 && k < L.I.length; k++) { const a = L.I[k] - bI, c = L.aVF[k] - bF; xI = Math.max(xI, a); nI = Math.min(nI, a); xF = Math.max(xF, c); nF = Math.min(nF, c); }
    sI += xI + nI; sF += xF + nF;
  }
  const axis = Math.atan2(2 * sF / Math.sqrt(3), sI) * 180 / Math.PI;
  return {
    hrBpm: rr.length ? 60000 / mean(rr) : 0,
    prMs: prs.length && hasP ? mean(prs) : null,
    qrsMs: mean(beats.map((b) => b.qrsOffMs - b.qrsOnMs)),
    qtMs: mean(beats.map((b) => b.tOffMs - b.qrsOnMs)),
    qrsAxisDeg: axis,
    rhythm,
    beats,
  };
}

export const REGION_NAMES = ['RA', 'LA', 'AV node', 'His-Purkinje', 'Septum', 'LV anterior', 'LV lateral', 'LV inferior', 'LV apex', 'RV', 'RVOT'];

function regionActivity(m: Model) {
  const g = m.g, a = m.acts!;
  const NR = REGION_NAMES.length;
  const reg = new Int8Array(m.graph.n).fill(-1);
  for (let i = 0; i < g.n; i++) {
    if (g.ch[i] === CH.RA) reg[i] = 0; else if (g.ch[i] === CH.LA) reg[i] = 1;
    else if (g.ch[i] === CH.RV) reg[i] = g.sf[i] & SF.RVOT ? 10 : 9;
    else if (g.sf[i] & SF.SEPTAL) reg[i] = 4;
    else if (g.ab[i] < 0.25) reg[i] = 8;
    else { const th = g.th[i]; reg[i] = th >= 45 && th < 180 ? 5 : th >= -45 && th < 45 ? 6 : 7; }
  }
  for (let i = 0; i < g.n; i++) if (m.purkOf[i] >= 0) reg[m.purkOf[i]] = 3;
  for (const s of ['HIS', 'LBB', 'RBB', 'LSF', 'LAF', 'LPF']) reg[m.spec[s]] = 3;
  const cnt = new Float32Array(NR); for (let i = 0; i < reg.length; i++) if (reg[i] >= 0) cnt[reg[i]]++;
  const avnCond = m.avnLog.filter((e) => e.conducted).map((e) => e.t);
  const ahMin = m.p.avn.ahMin;
  return {
    names: REGION_NAMES,
    activityAt(tMs: number): Float32Array {
      const out = new Float32Array(NR);
      for (let i = 0; i < reg.length; i++) {
        const r = reg[i]; if (r < 0) continue;
        let k = a.first[i], best = -1;
        while (k >= 0 && a.t[k] <= tMs) { best = k; k = a.next[k]; }
        if (best < 0) continue;
        const tau = tMs - a.t[best], apd = a.apd[best];
        const v = Math.min(1, tau / 4) * (1 - 1 / (1 + Math.exp(-(tau - apd) / 12)));
        out[r] += v;
      }
      for (let r = 0; r < NR; r++) out[r] = cnt[r] ? out[r] / cnt[r] : 0;
      out[2] = avnCond.some((t) => tMs >= t && tMs <= t + ahMin + 20) ? 1 : 0;
      return out;
    },
  };
}
