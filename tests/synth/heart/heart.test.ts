/**
 * Heart model (DECISION §2.1, §6.3): baked region geometry, the region activation graph, and the consistency of every
 * authored lobe set with the region timing the graph gives for the same blocks / sources — the lobes and the 3D
 * timeline describe the same activation. Reading of §6.3's "lobe window covers ≥ 70 % of its tagged regions": a lobe
 * that sweeps several regions in sequence is covered by the UNION of their windows (≥ 70 % of the lobe's support), and
 * no tagged region may be silent during the lobe (overlap ≥ 8 ms).
 */
import { describe, expect, it } from 'vitest';
import { activationTiming, timingExtent } from '../../../src/synth/heart/activation';
import { isVentricular, REGION_INDEX, VENT_IDS, ventGeom } from '../../../src/synth/heart/anatomy';
import { NORMAL_APD_MAP } from '../../../src/synth/heart/apd';
import { CONDUCTED_PATTERNS, ECTOPIC_SITES, PREEXCITED_SITES } from '../../../src/synth/morph/patterns';

describe('region geometry (baked)', () => {
  it('has 21 ventricular regions with masses summing to 1 and unit outward normals', () => {
    expect(VENT_IDS.length).toBe(21);
    const total = VENT_IDS.reduce((s, id) => s + ventGeom(id).mass, 0);
    expect(total).toBeCloseTo(1, 3);
    for (const id of VENT_IDS) expect(Math.hypot(...ventGeom(id).n)).toBeCloseTo(1, 2);
  });
});

describe('region activation graph', () => {
  it('normal activation starts at the septum and ends at the posterobasal LV / RVOT within ~100 ms', () => {
    const t = activationTiming({});
    const ext = timingExtent(t);
    expect(ext.first).toBe(0);
    expect(ext.last).toBeGreaterThan(70);
    expect(ext.last).toBeLessThan(110);
    expect(t.t0[REGION_INDEX['lv-mid-anteroseptal']]).toBeLessThanOrEqual(2);
    expect(t.t1[REGION_INDEX['rv-outflow']]).toBeGreaterThan(t.t1[REGION_INDEX['lv-mid-anteroseptal']]);
  });
  it('a right-bundle block delays the RV; a left-bundle block delays the LV free wall', () => {
    const n = activationTiming({}), r = activationTiming({ blocks: { rbb: 'complete' } }), l = activationTiming({ blocks: { lbb: 'complete' } });
    expect(r.t0[REGION_INDEX['rv-mid']]).toBeGreaterThan(n.t0[REGION_INDEX['rv-mid']] + 10);
    expect(l.t0[REGION_INDEX['lv-mid-anterolateral']]).toBeGreaterThan(n.t0[REGION_INDEX['lv-mid-anterolateral']] + 30);
    expect(timingExtent(l).last).toBeGreaterThan(timingExtent(n).last + 30);
  });
  it('carries the normal APD map (endocardium outlasts epicardium in the LV)', () => {
    const i = REGION_INDEX['lv-mid-anterolateral'];
    expect(NORMAL_APD_MAP.endo[i]).toBeGreaterThan(NORMAL_APD_MAP.epi[i]);
  });
});

describe('authored lobes agree with the region graph', () => {
  const patterns = [...CONDUCTED_PATTERNS, ...Object.values(PREEXCITED_SITES), ...Object.values(ECTOPIC_SITES)].filter((p) => p !== undefined);
  for (const p of patterns) {
    it(p.id, () => {
      const t = activationTiming(p.activation);
      const bad: string[] = [];
      for (const l of p.lobes) {
        const tags = l.regions.filter(([id]) => isVentricular(id));
        if (!tags.length) continue;
        let inside = 0, n = 0;
        for (let s = l.on; s <= l.end; s++) {
          n++;
          if (tags.some(([id]) => t.t0[REGION_INDEX[id]] <= s && s <= t.t1[REGION_INDEX[id]])) inside++;
        }
        if (inside / n < 0.7) bad.push(`${l.label}: only ${Math.round((100 * inside) / n)} % of the lobe inside its regions' windows`);
        for (const [id] of tags) {
          const i = REGION_INDEX[id];
          const ov = Math.min(t.t1[i], l.end) - Math.max(t.t0[i], l.on);
          if (!(ov >= 8)) bad.push(`${l.label}: region ${id} (${t.t0[i].toFixed(0)}–${t.t1[i].toFixed(0)} ms) is silent during the lobe`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
