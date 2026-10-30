import { describe, expect, it } from 'vitest';
import { getHub } from '../../../src/lab/ecg/sampler';
import { labelLead, measureBeat, QRS_WAVE_MIN_MV, segSpan } from '../../../src/lab/ecg/waveLabels';
import { StubEngine } from '../../../src/lab/sim/stub/stubEngine';
import type { CycleTruth, LeadName } from '../../../src/lab/sim/types';
import { LEADS } from '../../../src/lab/sim/types';

/** Raised-cosine bump on [a, b] (zero slope at both ends, so the boundaries are well defined). */
const bump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : 0.5 * (1 - Math.cos((2 * Math.PI * (t - a)) / (b - a))));
const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};

/** Synthetic heart vector with known boundaries: P [100,190], QRS [300,390], T [550,750] (ms). */
function synthetic() {
  const n = 1000, H = new Float32Array(3 * n);
  const parts: [number, number, number, number[]][] = [
    [100, 190, 0.15, unit([0.6, 0.8, 0])],
    [300, 330, 0.3, unit([-0.5, 0, -0.5])], // septal, rightward-anterior
    [320, 370, 1.5, unit([0.7, 0.7, 0.2])], // main, leftward-inferior
    [355, 390, 0.5, unit([-0.6, -0.5, 0.4])], // terminal, rightward-superior-posterior
    [550, 750, 0.5, unit([0.6, 0.6, -0.3])],
  ];
  for (let i = 0; i < n; i++)
    for (const [a, b, amp, d] of parts) {
      const s = amp * bump(i, a, b);
      for (let k = 0; k < 3; k++) H[3 * i + k] += s * d[k];
    }
  const truth: CycleTruth = {
    aId: 1, vId: 2,
    segments: [
      { seg: 'P', t0: 100, t1: 190 }, { seg: 'PR', t0: 190, t1: 300 }, { seg: 'QRS', t0: 300, t1: 390 },
      { seg: 'ST', t0: 390, t1: 550 }, { seg: 'T', t0: 550, t1: 750 }, { seg: 'TP', t0: 750, t1: 900 },
    ],
    mech: [], valves: [],
    pOn: 100, pOff: 190, qrsOn: 300, qrsOff: 390, tEnd: 750,
  };
  return { w: { t0: 0, dt: 1, n, H }, truth };
}

describe('global interval measurement (|dH/dt| boundaries, tangent T end)', () => {
  const { w, truth } = synthetic();
  const m = measureBeat(w, truth);
  it('finds P and QRS boundaries within 10 ms', () => {
    expect(Math.abs(m.pOn! - 100)).toBeLessThanOrEqual(10);
    expect(Math.abs(m.pOff! - 190)).toBeLessThanOrEqual(10);
    expect(Math.abs(m.qrsOn! - 300)).toBeLessThanOrEqual(10);
    expect(Math.abs(m.qrsOff! - 390)).toBeLessThanOrEqual(10);
    expect(Math.abs(m.prMs! - 200)).toBeLessThanOrEqual(10);
    expect(Math.abs(m.qrsMs! - 90)).toBeLessThanOrEqual(10);
  });
  it('tangent T end lands just before the true end of a smooth T (method bias < 25 ms)', () => {
    expect(m.tPeak).toBeCloseTo(650, -1);
    expect(m.tEnd!).toBeGreaterThan(750 - 25);
    expect(m.tEnd!).toBeLessThanOrEqual(752);
    expect(m.qtMs).toBeCloseTo(m.tEnd! - m.qrsOn!, 9);
  });
  it('per-lead labels on a synthetic lead: Q before R, S after R, J at the measured QRS end', () => {
    // Lead along (0.63, −0.23, 0.06) ≈ Dower lead I.
    const L = [0.632, -0.235, 0.059];
    const lead = new Float32Array(w.n);
    for (let i = 0; i < w.n; i++) lead[i] = L[0] * w.H[3 * i] + L[1] * w.H[3 * i + 1] + L[2] * w.H[3 * i + 2];
    const { labels, baseline } = labelLead(lead, 0, 1, truth, m);
    expect(baseline).toBeCloseTo(0, 6);
    const kinds = labels.map((l) => l.kind);
    expect(kinds).toEqual(['P', 'Q', 'R', 'S', 'J', 'T']);
    const get = (k: string) => labels.find((l) => l.kind === k)!;
    expect(get('Q').amp).toBeLessThanOrEqual(-QRS_WAVE_MIN_MV);
    expect(get('R').t).toBeGreaterThan(get('Q').t);
    expect(get('S').t).toBeGreaterThan(get('R').t);
    expect(get('J').t).toBe(m.qrsOff);
    expect(get('T').t).toBeGreaterThan(600);
    expect(get('T').t).toBeLessThan(700);
  });
  it('does not label a Q or S that is shallower than 0.03 mV', () => {
    const lead = new Float32Array(w.n);
    for (let i = 0; i < w.n; i++) lead[i] = 0.5 * bump(i, 320, 370) - 0.02 * bump(i, 300, 318) - 0.02 * bump(i, 372, 388);
    const { labels } = labelLead(lead, 0, 1, truth, m);
    expect(labels.some((l) => l.kind === 'Q' || l.kind === 'S')).toBe(false);
    expect(labels.some((l) => l.kind === 'R')).toBe(true);
  });
  it('labels an all-negative complex as QS', () => {
    const lead = new Float32Array(w.n);
    for (let i = 0; i < w.n; i++) lead[i] = -0.8 * bump(i, 310, 380);
    const { labels } = labelLead(lead, 0, 1, truth, m);
    expect(labels.some((l) => l.kind === 'QS')).toBe(true);
    expect(labels.some((l) => l.kind === 'R')).toBe(false);
  });
});

describe('wave labels on StubEngine beats fall inside the model-truth windows', () => {
  const eng = new StubEngine();
  const hub = getHub(eng);
  const cycles = hub.cycles.range(1500, 4000).filter((c) => c.qrsOn !== null && c.tEnd !== null).slice(0, 2);
  // The Sameni stub's QRS starts ≈ 10 ms before its truth onset (stub timing, not the real engine) → small margin.
  const QRS_MARGIN = 15;

  it('measured stub intervals are physiological', () => {
    for (const c of cycles) {
      const m = hub.beat(c).measured;
      expect(m.qrsMs!).toBeGreaterThan(40);
      expect(m.qrsMs!).toBeLessThan(120);
      expect(m.prMs!).toBeGreaterThan(100);
      expect(m.prMs!).toBeLessThan(220);
      expect(m.qtMs!).toBeGreaterThan(280);
      expect(m.qtMs!).toBeLessThan(460);
    }
  });

  it('P, R, T labels in every lead lie inside their truth windows', () => {
    for (const c of cycles) {
      const a = hub.beat(c);
      const T = segSpan(c, 'T')!;
      for (const lead of LEADS) {
        const { labels } = a.labels(lead);
        for (const l of labels) {
          if (l.kind === 'P') {
            expect(l.t).toBeGreaterThanOrEqual(c.pOn!);
            expect(l.t).toBeLessThanOrEqual(c.pOff!);
          } else if (l.kind === 'Q' || l.kind === 'R' || l.kind === 'S' || l.kind === 'QS') {
            expect(l.t).toBeGreaterThanOrEqual(c.qrsOn! - QRS_MARGIN);
            expect(l.t).toBeLessThanOrEqual(c.qrsOff!);
            if (l.kind !== 'R') expect(l.amp).toBeLessThanOrEqual(-QRS_WAVE_MIN_MV);
          } else if (l.kind === 'T') {
            expect(l.t).toBeGreaterThanOrEqual(T.t0);
            expect(l.t).toBeLessThanOrEqual(T.t1);
          }
        }
      }
    }
  });

  it('normal morphology: septal q in I and V6, rS in V1, P and T negative in aVR, upright in II', () => {
    const a = hub.beat(cycles[0]);
    const kinds = (l: LeadName) => a.labels(l).labels.map((x) => x.kind);
    const amp = (l: LeadName, k: string) => a.labels(l).labels.find((x) => x.kind === k)?.amp ?? 0;
    expect(kinds('I')).toContain('Q');
    expect(kinds('V6')).toContain('Q');
    expect(kinds('V1')).not.toContain('Q');
    expect(kinds('V1')).toContain('S');
    expect(Math.abs(amp('V1', 'S'))).toBeGreaterThan(amp('V1', 'R'));
    expect(amp('aVR', 'P')).toBeLessThan(0);
    expect(amp('aVR', 'T')).toBeLessThan(0);
    expect(amp('II', 'P')).toBeGreaterThan(0);
    expect(amp('II', 'T')).toBeGreaterThan(0);
  });
});
