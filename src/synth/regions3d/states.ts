/**
 * RegionStates for the small 3D heart (DECISION §6.11). ids = REGION_LIST order. stateAt(t) writes per region:
 * 0 at rest; (0, 1) depolarising (smoothstep over its activation window); 1 on the plateau; (1, 2) repolarising
 * (smoothstep over a phase-3 window centred at activation midpoint + APD, rate-adapted with the beat's JT scale);
 * 2 recovered until the region's next activation, which restarts at 0.
 * Conduction system: sa-node before each sinus P; av-node from AV-node entry to His; his, bundles, fascicles and
 * Purkinje over the HV interval of conducted beats; a blocked branch stays 0 (and carries the 'block' highlight).
 * Atria follow the atrial events (flutter: per cycle; AF: per stream and chamber).
 * Cost: one binary search per region over precomputed episodes (< 0.05 ms per frame for 31 regions).
 */
import type { RegionStates } from '../../core/ecg';
import type { RegionId } from '../../core/regions';
import type { Blocks, RegionHighlight } from '../api';
import { REGION_IDS, REGION_INDEX, VENT_IDS } from '../heart/anatomy';
import { NORMAL_APD } from '../heart/apd';
import type { Schedule } from '../rhythm/scheduler';

interface Episode {
  /** activation window and repolarisation window (absolute ms) */
  readonly a0: number;
  readonly a1: number;
  readonly r0: number;
  readonly r1: number;
}

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** phase-3 window width (ms) */
const W3 = 70;

function stateOf(e: Episode, t: number): number {
  if (t < e.a0) return 0;
  if (t < e.a1) return Math.min(0.999, Math.max(0.001, smooth((t - e.a0) / Math.max(1, e.a1 - e.a0))));
  if (t < e.r0) return 1;
  if (t < e.r1) return 1 + Math.min(0.999, Math.max(0.001, smooth((t - e.r0) / Math.max(1, e.r1 - e.r0))));
  return 2;
}

export interface StatesInput {
  readonly schedule: Schedule;
  readonly blocks: Blocks | undefined;
  readonly hvMs: number;
  readonly highlights: Readonly<Partial<Record<RegionId, RegionHighlight>>>;
}

export function buildRegionStates(inp: StatesInput): RegionStates {
  const S = inp.schedule;
  const eps: Episode[][] = REGION_IDS.map(() => []);
  const push = (id: RegionId, e: Episode): void => {
    eps[REGION_INDEX[id]].push(e);
  };
  const blocked = new Set<RegionId>();
  if (inp.blocks?.rbb === 'complete') blocked.add('rbb');
  if (inp.blocks?.lbb === 'complete') ['lbb', 'laf', 'lpf'].forEach((r) => blocked.add(r as RegionId));
  if (inp.blocks?.laf === 'complete') blocked.add('laf');
  if (inp.blocks?.lpf === 'complete') blocked.add('lpf');
  // ventricles: the region graph's windows are scaled to the beat's QRS (conduction stretch, pre-excitation), so the 3D
  // depolarisation ends with the QRS the learner sees
  for (const b of S.beats) {
    let last = 0;
    for (const id of VENT_IDS) {
      const v = b.timing.t1[REGION_INDEX[id]];
      if (Number.isFinite(v)) last = Math.max(last, v);
    }
    const k = last > 0 ? (b.qrsOff - b.qrsOn) / last : 1;
    for (const id of VENT_IDS) {
      const i = REGION_INDEX[id];
      const t0 = b.timing.t0[i] * k, t1 = b.timing.t1[i] * k;
      if (!Number.isFinite(t0)) continue;
      const a0 = b.qrsOn + t0, a1 = b.qrsOn + t1;
      const apd = 0.5 * (b.timing.apdEndo[i] + b.timing.apdEpi[i]) * b.jtScale;
      // recovery centred at activation midpoint + APD, never later than the T end (all recovered by T end + 60 ms)
      const c = Math.min(0.5 * (a0 + a1) + apd, b.tOff + 20 - W3 / 2);
      push(id, { a0, a1, r0: Math.max(a1 + 5, c - W3 / 2), r1: Math.max(a1 + 6, c + W3 / 2) });
    }
    if (b.hisAt !== null) {
      const his = b.hisAt;
      const q = b.qrsOn;
      const rec = (a0: number, a1: number): Episode => ({ a0, a1, r0: a1 + 220, r1: a1 + 300 });
      push('his', rec(his, his + 10));
      for (const [id, a, z] of [['rbb', 6, 0], ['lbb', 6, -4], ['laf', 14, 4], ['lpf', 14, 4], ['purkinje', inp.hvMs - 15, inp.hvMs + 15]] as const) {
        if (blocked.has(id)) continue;
        push(id, rec(his + a, Math.max(his + a + 5, (id === 'purkinje' ? his : q) + z)));
      }
    }
  }
  // atria and nodes
  for (const e of S.atrial) {
    if (e.kind === 'fibrillation') {
      const half = 0.5 * (e.pOff - e.pOn);
      push(e.chambers === 'la' ? 'la' : 'ra', { a0: e.pOn, a1: e.pOn + 0.45 * half * 2, r0: e.pOn + 1.1 * half, r1: e.pOff - 1 });
      continue;
    }
    const dur = e.pOff - e.pOn;
    const apd = e.kind === 'flutter' ? Math.min(NORMAL_APD.atrial, 0.7 * dur) : NORMAL_APD.atrial;
    const raEnd = e.pOn + 0.7 * dur, laOn = e.pOn + 0.3 * dur;
    push('ra', { a0: e.pOn, a1: raEnd, r0: e.pOn + apd - 40, r1: e.pOn + apd + 40 });
    push('la', { a0: laOn, a1: e.pOff, r0: laOn + apd - 40, r1: laOn + apd + 40 });
    if (e.kind === 'sinus') push('sa-node', { a0: e.pOn - 25, a1: e.pOn, r0: e.pOn + 80, r1: e.pOn + 240 });
    if (e.nodeIn !== null) {
      const beat = e.conductedTo !== null ? S.beats[e.conductedTo] : null;
      const exit = beat?.hisAt ?? e.nodeIn + 60;
      push('av-node', { a0: e.nodeIn, a1: Math.max(e.nodeIn + 10, exit), r0: exit + 180, r1: exit + 260 });
    }
  }
  for (const list of eps) list.sort((a, b) => a.a0 - b.a0);
  const highlights: Partial<Record<RegionId, RegionHighlight>> = {};
  for (const id of blocked) highlights[id] = 'block';
  Object.assign(highlights, inp.highlights);
  return {
    ids: REGION_IDS,
    highlights,
    stateAt(t: number, out: Float32Array): void {
      for (let r = 0; r < eps.length; r++) {
        const list = eps[r];
        let lo = 0, hi = list.length - 1, k = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (list[mid].a0 <= t) {
            k = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        out[r] = k < 0 ? 0 : stateOf(list[k], t);
      }
    },
  };
}
