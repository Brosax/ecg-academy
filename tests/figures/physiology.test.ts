import { describe, expect, it } from 'vitest';
import { REGION_LIST, type RegionId } from '../../src/core/regions';
import { AP_CELLS, AP_WINDOW, apPhaseAt, apPhases, apValue, beatZero, ecgPartAt, mapFromSchematic, mapToSchematic } from '../../src/figures/math/ap';
import { beatValue, NORMAL_BEAT, periodicValue } from '../../src/figures/math/beat';
import { beatTimeline, CONDUCTION_NODES, schematicTimeline, stateAt, statesFromRegions, timelineAt } from '../../src/figures/math/conduction';
import { demoTruth } from '../../src/figures/math/demo';
import { classifyDeflection, DIPOLE_ELECTRODES, dipoleTrace } from '../../src/figures/math/dipole';
import { calibrationPulse, mmFromMs, mmFromMv, squareValues } from '../../src/figures/math/paper';

describe('paper arithmetic', () => {
  it('1 mm = 0.04 s / 0.1 mV and 5 mm = 0.2 s / 0.5 mV at standard settings', () => {
    const v = squareValues(25, 10);
    expect(v.smallS).toBeCloseTo(0.04);
    expect(v.smallMv).toBeCloseTo(0.1);
    expect(v.largeS).toBeCloseTo(0.2);
    expect(v.largeMv).toBeCloseTo(0.5);
  });

  it('speed and gain rescale the squares and the calibration pulse', () => {
    expect(squareValues(50, 10).smallS).toBeCloseTo(0.02);
    expect(squareValues(25, 20).smallMv).toBeCloseTo(0.05);
    expect(squareValues(25, 5).largeMv).toBeCloseTo(1);
    expect(calibrationPulse(25, 10)).toEqual({ widthMm: 5, heightMm: 10 });
    expect(calibrationPulse(50, 20)).toEqual({ widthMm: 10, heightMm: 20 });
    expect(mmFromMs(800, 25)).toBe(20);
    expect(mmFromMv(1.5, 10)).toBe(15);
  });
});

describe('schematic beat', () => {
  it('has its R peak inside the QRS marks and a flat TP segment', () => {
    let best = 0, tBest = 0;
    for (let t = 0; t < 600; t++) {
      const v = beatValue(NORMAL_BEAT, t);
      if (v > best) {
        best = v;
        tBest = t;
      }
    }
    expect(tBest).toBeGreaterThan(NORMAL_BEAT.marks.qrsOn);
    expect(tBest).toBeLessThan(NORMAL_BEAT.marks.qrsOff);
    expect(Math.abs(beatValue(NORMAL_BEAT, 650))).toBeLessThan(0.01);
    expect(Math.abs(beatValue(NORMAL_BEAT, 130))).toBeLessThan(0.02); // PR segment
  });

  it('repeats every RR', () => {
    expect(periodicValue(NORMAL_BEAT, 194, 800)).toBeCloseTo(periodicValue(NORMAL_BEAT, 994, 800), 9);
  });
});

describe('action potentials vs the surface ECG', () => {
  it('ventricular: phase 0 in the QRS, phase 2 over the ST segment, phase 3 during the T wave', () => {
    const ph = apPhases('ventricular');
    const p0 = ph.find((s) => s.phase === 0)!;
    const p2 = ph.find((s) => s.phase === 2)!;
    const p3 = ph.find((s) => s.phase === 3)!;
    expect(ecgPartAt(p0.t0)).toBe('qrs');
    expect(ecgPartAt((p0.t0 + p0.t1) / 2)).toBe('qrs');
    // the plateau covers the whole ST segment
    expect(p2.t0).toBeLessThanOrEqual(245);
    expect(p2.t1).toBeGreaterThanOrEqual(290);
    // repolarization ends near the end of the T wave
    expect(ecgPartAt((p3.t0 + p3.t1) / 2)).toBe('t');
    expect(Math.abs(p3.t1 - NORMAL_BEAT.marks.tOff)).toBeLessThanOrEqual(40);
    expect(apValue('ventricular', 100)).toBeLessThan(-80);
    expect(apValue('ventricular', 175)).toBeGreaterThan(0);
    expect(apValue('ventricular', 260)).toBeGreaterThan(-20);
  });

  it('atrial: upstroke at the start of the P wave, recovery hidden in the QRS', () => {
    const p0 = apPhases('atrial').find((s) => s.phase === 0)!;
    expect(ecgPartAt(p0.t0)).toBe('p');
    const p3 = apPhases('atrial').find((s) => s.phase === 3)!;
    expect(ecgPartAt(p3.t1)).toBe('qrs');
  });

  it('nodal: no resting potential, slow diastolic depolarization, fires just before the P wave, no phases 1–2', () => {
    expect(apPhaseAt('nodal', -40)).toBe(4);
    expect(apPhaseAt('nodal', -10)).toBe(0);
    expect(apValue('nodal', 400)).toBeGreaterThan(apValue('nodal', 200)); // depolarizing during diastole
    expect(apPhases('nodal').some((s) => s.phase === 1 || s.phase === 2)).toBe(false);
    for (const c of AP_CELLS) for (let t = -100; t <= 700; t += 5) expect(Number.isFinite(apValue(c, t))).toBe(true);
  });
});

describe('action potential following an ECG cursor', () => {
  it('maps a record time onto the beat under it (P onset = 0) and back', () => {
    const { beats } = demoTruth('sinus'); // P every 800 ms from 200 ms
    expect(mapToSchematic(beats, null)).toBeNull();
    expect(mapToSchematic([], 300)).toBeNull();
    expect(mapToSchematic(beats, 250)).toEqual({ start: 200, t: 50 });
    // 90 ms before the next P onset belongs to the next beat (its window starts 100 ms early)
    expect(mapToSchematic(beats, 910)).toEqual({ start: 1000, t: -90 });
    for (let t = 100; t < 900; t += 7) {
      const m = mapToSchematic(beats, t)!;
      expect(m.start).toBe(200);
      expect(mapFromSchematic(m.start, m.t)).toBe(t);
    }
  });

  it('anchors a beat without a P wave 160 ms before its QRS, clamps to the window and never returns negative times', () => {
    const escape = demoTruth('complete').beats[0];
    expect(escape.pOn).toBeNull();
    expect(beatZero(escape)).toBe(escape.qrsOn - 160);
    const { beats } = demoTruth('sinus');
    expect(mapToSchematic(beats, 5000 + 20000)!.t).toBe(AP_WINDOW.t1);
    expect(mapFromSchematic(50, -100)).toBe(0);
    expect(mapFromSchematic(200, 5000)).toBe(200 + AP_WINDOW.t1);
  });
});

describe('dipole model', () => {
  it('front towards the electrode → positive, away → negative, passing by → biphasic', () => {
    const by = Object.fromEntries(DIPOLE_ELECTRODES.map((e) => [e.id, classifyDeflection(dipoleTrace(e))]));
    expect(by.A).toBe('positive');
    expect(by.D).toBe('negative');
    expect(by.C).toBe('biphasic-pos-neg');
  });

  it('repolarization in the same direction inverts every deflection', () => {
    for (const e of DIPOLE_ELECTRODES) {
      const d = dipoleTrace(e, 41, 'depolarization');
      const r = dipoleTrace(e, 41, 'repolarization');
      d.forEach((v, i) => expect(r[i]).toBeCloseTo(-v, 12));
    }
    expect(classifyDeflection(dipoleTrace(DIPOLE_ELECTRODES[0], 121, 'repolarization'))).toBe('negative');
  });
});

describe('conduction timeline', () => {
  it('normal beat: SA → atria → AV → His → bundles → myocardium in order', () => {
    const tl = schematicTimeline('none');
    const order = ['sa', 'atria', 'av', 'his', 'rbb', 'purkinje', 'septum'] as const;
    for (let i = 1; i < order.length; i++) expect(tl.act[order[i]]!.t0).toBeGreaterThanOrEqual(tl.act[order[i - 1]]!.t0);
    const s = stateAt(tl, 400);
    expect(s.rv.act).toBe(1);
    expect(s.lvAnt.act).toBe(1);
    expect(stateAt(tl, -100).atria.act).toBe(0);
  });

  it('RBBB: the right bundle is blocked and the RV is activated last', () => {
    const tl = schematicTimeline('rbb');
    expect(tl.blocked.rbb).toBeDefined();
    expect(tl.act.rbb).toBeUndefined();
    expect(tl.act.rv!.t0).toBeGreaterThan(tl.act.lvAnt!.t0);
    const lbbb = schematicTimeline('lbb');
    expect(lbbb.act.lvAnt!.t0).toBeGreaterThan(lbbb.act.rv!.t0);
  });

  it('AV block: atria activate, nothing reaches the ventricles', () => {
    const tl = schematicTimeline('av');
    const s = stateAt(tl, 400);
    expect(s.atria.act).toBe(1);
    expect(s.av.blockedAt).not.toBeNull();
    for (const id of ['his', 'rbb', 'lbb', 'septum', 'rv', 'lvAnt', 'lvPost'] as const) expect(s[id].act).toBe(0);
  });

  it('pre-excitation: the accessory pathway activates part of the LV before the His bundle', () => {
    const tl = schematicTimeline('accessory');
    expect(tl.act.ap).toBeDefined();
    expect(tl.act.lvPost!.t0).toBeLessThan(tl.act.his!.t0);
  });

  it('pre-excitation: the pre-excited wall starts exactly at QRS onset (the delta wave), the pathway just before', () => {
    const b = { kind: 'sinus', pOn: 1000, pOff: 1090, qrsOn: 1110, qrsOff: 1230, tPeak: 1400, tOff: 1500, aberrant: false } as const;
    const tl = beatTimeline(b, 'accessory');
    expect(tl.act.lvPost!.t0).toBe(b.qrsOn);
    expect(tl.act.ap!.t1).toBe(b.qrsOn);
    expect(tl.act.ap!.t0).toBeGreaterThanOrEqual(b.pOn);
    expect(stateAt(tl, b.qrsOn - 1).lvPost.act).toBe(0);
    expect(stateAt(tl, b.qrsOn + 20).lvPost.act).toBeGreaterThan(0);
    const schem = schematicTimeline('accessory');
    expect(schem.act.lvPost!.t0).toBe(100); // the schematic pre-excited beat has PR 100 ms
  });

  it('follows the truth: a blocked P in Wenckebach dies in the AV node', () => {
    const truth = demoTruth('wenckebach');
    const blocked = truth.atrial.find((a) => a.conductedTo == null)!;
    const tl = timelineAt(truth, blocked.t + 150)!;
    expect(tl.blocked.av).toBeDefined();
    const s = stateAt(tl, blocked.t + 150);
    expect(s.atria.act).toBe(1);
    // the previous beat's ventricles are still shown (recovering)
    expect(s.septum.act).toBe(1);
    // during a conducted beat the AV node is not blocked
    const b = truth.beats[1];
    const tl2 = timelineAt(truth, b.qrsOn + 20)!;
    expect(tl2.blocked.av).toBeUndefined();
    expect(stateAt(tl2, b.qrsOn + 20).his.act).toBe(1);
    expect(timelineAt(truth, -500)).toBeNull();
  });

  it('a PVC starts in the myocardium, without His activation', () => {
    const truth = demoTruth('pvc');
    const pvc = truth.beats.find((b) => b.kind === 'ventricular')!;
    const tl = beatTimeline(pvc);
    expect(tl.act.his).toBeUndefined();
    expect(tl.act.lvPost!.t0).toBe(pvc.qrsOn);
  });

  it('maps engine regions onto diagram elements', () => {
    const ids = REGION_LIST.map((r) => r.id) as RegionId[];
    const codes = ids.map((id) => (id === 'rbb' ? 0 : id.startsWith('rv') ? 0.5 : 1));
    const s = statesFromRegions(ids, codes, { rbb: 'block' });
    expect(s.his.act).toBe(1);
    expect(s.rbb.blockedAt).not.toBeNull();
    expect(s.rv.act).toBeCloseTo(0.5);
    expect(s.ap.act).toBe(0);
    expect(Object.keys(s).sort()).toEqual([...CONDUCTION_NODES].sort());
  });
});
