/**
 * Timeline geometry — pure. One cardiac cycle from model truth: electrical segments (P, PR, QRS, ST, T, TP) and
 * mechanical phases, plus valve events and heart sounds. Colours follow the global colour language (theme.css):
 * P amber, QRS magenta, repolarization teal, conduction (PR = AV-node delay) gold.
 */
import type { CycleTruth, MechPhase, ValveId, WaveSegment } from '../sim/types';
import type { ThemeToken } from '../app/theme';

export const SEG_COLOR: Readonly<Record<WaveSegment, { token: ThemeToken; alpha: number }>> = {
  P: { token: 'c-atrial', alpha: 0.85 },
  PR: { token: 'c-conduction', alpha: 0.45 },
  QRS: { token: 'c-qrs', alpha: 0.85 },
  ST: { token: 'c-repol', alpha: 0.35 },
  T: { token: 'c-repol', alpha: 0.85 },
  TP: { token: 'fg-muted', alpha: 0.18 },
};

/** Mechanical phases: atrial work amber, ventricular systole magenta→blue family, relaxation/filling teal family. */
export const MECH_COLOR: Readonly<Record<MechPhase, { token: ThemeToken; alpha: number }>> = {
  atrialSystole: { token: 'c-atrial', alpha: 0.55 },
  isovolumicContraction: { token: 'c-qrs', alpha: 0.45 },
  ejection: { token: 'c-vector', alpha: 0.45 },
  isovolumicRelaxation: { token: 'c-repol', alpha: 0.45 },
  filling: { token: 'c-repol', alpha: 0.2 },
};

/** Segment band colours used on the ECG traces (only P, QRS and ST/T are tinted). */
export const ECG_BAND: Partial<Record<WaveSegment, { token: ThemeToken; alpha: number }>> = {
  P: { token: 'c-atrial', alpha: 0.16 },
  QRS: { token: 'c-qrs', alpha: 0.16 },
  ST: { token: 'c-repol', alpha: 0.08 },
  T: { token: 'c-repol', alpha: 0.16 },
};

export interface TimelineBand<K extends string> {
  readonly key: K;
  readonly t0: number;
  readonly t1: number;
}

export interface TimelineModel {
  /** Displayed range (ms): cycle start → end of the last segment or phase. */
  readonly t0: number;
  readonly t1: number;
  readonly segments: readonly TimelineBand<WaveSegment>[];
  readonly mech: readonly TimelineBand<MechPhase>[];
  readonly valves: readonly { readonly id: ValveId; readonly kind: 'open' | 'close'; readonly t: number }[];
  /** S1 ≈ mitral/tricuspid closure, S2 ≈ aortic/pulmonary closure (left-sided events). */
  readonly sounds: readonly { readonly id: 'S1' | 'S2'; readonly t: number }[];
}

export function timelineModel(c: CycleTruth): TimelineModel {
  const segs = c.segments.map((s) => ({ key: s.seg, t0: s.t0, t1: s.t1 }));
  const mech = c.mech.map((m) => ({ key: m.phase, t0: m.t0, t1: m.t1 }));
  let t0 = Infinity, t1 = -Infinity;
  for (const b of [...segs, ...mech]) {
    t0 = Math.min(t0, b.t0);
    t1 = Math.max(t1, b.t1);
  }
  if (!Number.isFinite(t0)) {
    t0 = 0;
    t1 = 1;
  }
  const valves: { id: ValveId; kind: 'open' | 'close'; t: number }[] = [];
  for (const v of c.valves) {
    if (v.id !== 'MITRAL' && v.id !== 'AORTIC') continue;
    valves.push({ id: v.id, kind: 'open', t: v.openMs }, { id: v.id, kind: 'close', t: v.closeMs });
  }
  valves.sort((a, b) => a.t - b.t);
  const mit = c.valves.find((v) => v.id === 'MITRAL');
  const ao = c.valves.find((v) => v.id === 'AORTIC');
  const sounds: { id: 'S1' | 'S2'; t: number }[] = [];
  if (mit) sounds.push({ id: 'S1', t: mit.closeMs });
  if (ao) sounds.push({ id: 'S2', t: ao.closeMs });
  return { t0, t1, segments: segs, mech, valves, sounds };
}

/** x (px) of time t in a bar of width w showing [t0, t1]. */
export const timeToX = (t: number, t0: number, t1: number, w: number): number => ((t - t0) / Math.max(1e-9, t1 - t0)) * w;
/** Time at x, clamped to the range. */
export const xToTime = (x: number, t0: number, t1: number, w: number): number => t0 + Math.min(1, Math.max(0, x / Math.max(1e-9, w))) * (t1 - t0);
