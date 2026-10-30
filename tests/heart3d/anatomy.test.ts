import { describe, expect, it } from 'vitest';
import { REGION_LIST, type RegionId } from '../../src/core/regions';
import type { Vec3 } from '../../src/heart3d/format';
import { computeNormals, labelCentroids, polylineLength, regionAnchors } from '../../src/heart3d/model';
import { heart } from './asset';

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);

describe('every region is present', () => {
  it('myocardial RegionIds have vertices, conduction RegionIds have polylines', () => {
    const a = heart();
    const counts = new Map<string, number>();
    for (const l of a.labels) counts.set(a.labelIds[l], (counts.get(a.labelIds[l]) ?? 0) + 1);
    for (const r of REGION_LIST) {
      if (r.group === 'conduction') {
        const pls = a.polylines.filter((p) => p.label === r.id && p.kind === 'conduction');
        expect(pls.length, r.id).toBeGreaterThan(0);
        for (const p of pls) {
          expect(p.points.length / 3, r.id).toBeGreaterThanOrEqual(2);
          expect(polylineLength(p.points), r.id).toBeGreaterThan(3);
        }
      } else {
        expect(counts.get(r.id) ?? 0, r.id).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('has a sparse Purkinje fan and anchors for every conduction id', () => {
    const a = heart();
    const purk = a.polylines.filter((p) => p.label === 'purkinje');
    expect(purk.length).toBeGreaterThanOrEqual(8);
    expect(purk.length).toBeLessThanOrEqual(40);
    for (const r of REGION_LIST) if (r.group === 'conduction') expect(a.header.anchors[r.id], r.id).toBeDefined();
  });
});

describe('heart frame orientation (app frame: +x patient left, +y superior, +z anterior)', () => {
  const { frame } = heart().header;

  it('apex lies below, to the left of and anterior to the base', () => {
    expect(frame.apex[1]).toBeLessThan(frame.base[1] - 20);
    expect(frame.apex[0]).toBeGreaterThan(frame.base[0]);
    expect(frame.apex[2]).toBeGreaterThan(frame.base[2]);
    // long axis apex → base points up, to the right and back
    expect(frame.longAxis[1]).toBeGreaterThan(0.2);
    expect(frame.lengthMm).toBeGreaterThan(70);
    expect(frame.lengthMm).toBeLessThan(130);
  });

  it('has an orthonormal long axis / septal / anterior triad', () => {
    for (const v of [frame.longAxis, frame.septal, frame.anterior]) expect(len(v)).toBeCloseTo(1, 2);
    expect(Math.abs(dot(frame.longAxis, frame.septal))).toBeLessThan(0.02);
    expect(Math.abs(dot(frame.longAxis, frame.anterior))).toBeLessThan(0.02);
    expect(Math.abs(dot(frame.septal, frame.anterior))).toBeLessThan(0.02);
    // the septum is to the patient's right of the LV, the anterior wall faces up (the inferior wall lies on the diaphragm)
    expect(frame.septal[0]).toBeLessThan(0);
    expect(frame.anterior[1]).toBeGreaterThan(0);
  });

  it('the apical cap sits at the apex and the mitral annulus at the base', () => {
    const c = labelCentroids(heart());
    const apex = c['lv-apex']!;
    expect(len(sub(apex, frame.apex))).toBeLessThan(25);
    expect(len(sub(heart().header.valves.mitral.center, frame.base))).toBeLessThan(1);
  });
});

describe('region labelling is anatomically consistent', () => {
  const c = labelCentroids(heart()) as Record<RegionId, Vec3>;
  const { frame } = heart().header;
  const level = (id: RegionId) => dot(sub(c[id], frame.apex), frame.longAxis);
  const avg = (ids: RegionId[]): Vec3 => {
    const s = ids.reduce<[number, number, number]>((acc, id) => [acc[0] + c[id][0], acc[1] + c[id][1], acc[2] + c[id][2]], [0, 0, 0]);
    return [s[0] / ids.length, s[1] / ids.length, s[2] / ids.length];
  };

  it('LV levels run apex → apical → mid → basal along the long axis', () => {
    const apical = (['anterior', 'septal', 'inferior', 'lateral'] as const).map((w) => level(`lv-apical-${w}`));
    const mid = (['anterior', 'anteroseptal', 'inferoseptal', 'inferior', 'inferolateral', 'anterolateral'] as const).map((w) => level(`lv-mid-${w}`));
    const basal = (['anterior', 'anteroseptal', 'inferoseptal', 'inferior', 'inferolateral', 'anterolateral'] as const).map((w) => level(`lv-basal-${w}`));
    const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
    expect(level('lv-apex')).toBeLessThan(Math.min(...apical));
    expect(mean(apical)).toBeLessThan(mean(mid));
    expect(mean(mid)).toBeLessThan(mean(basal));
  });

  it('anterior segments are superior to inferior ones; lateral segments left of septal ones', () => {
    const anterior = avg(['lv-basal-anterior', 'lv-mid-anterior', 'lv-apical-anterior']);
    const inferior = avg(['lv-basal-inferior', 'lv-mid-inferior', 'lv-apical-inferior']);
    expect(anterior[1]).toBeGreaterThan(inferior[1] + 15);
    const lateral = avg(['lv-basal-anterolateral', 'lv-basal-inferolateral', 'lv-mid-anterolateral', 'lv-mid-inferolateral', 'lv-apical-lateral']);
    const septal = avg(['lv-basal-anteroseptal', 'lv-basal-inferoseptal', 'lv-mid-anteroseptal', 'lv-mid-inferoseptal', 'lv-apical-septal']);
    expect(lateral[0]).toBeGreaterThan(septal[0] + 15);
  });

  it('right heart is to the right, atria at the base, RVOT superior', () => {
    expect(c.ra[0]).toBeLessThan(c.la[0]);
    expect(c.la[2]).toBeLessThan(c['lv-mid-anterior'][2]); // left atrium is the most posterior chamber
    expect(level('ra')).toBeGreaterThan(level('lv-mid-anterior'));
    expect(c['rv-outflow'][1]).toBeGreaterThan(c['rv-apical'][1] + 20);
    const rv = avg(['rv-basal', 'rv-mid', 'rv-apical']);
    const lvFree = avg(['lv-mid-anterolateral', 'lv-mid-inferolateral']);
    expect(rv[0]).toBeLessThan(lvFree[0]);
  });

  it('places the conduction system where it belongs', () => {
    const a = heart();
    const first = (id: string) => a.polylines.find((p) => p.label === id)!.points;
    const startOf = (id: string): Vec3 => {
      const p = first(id);
      return [p[0], p[1], p[2]];
    };
    const endOf = (id: string): Vec3 => {
      const p = first(id);
      const n = p.length;
      return [p[n - 3], p[n - 2], p[n - 1]];
    };
    // sinus node high in the right atrium (near the SVC), the AV node lower and medial
    expect(len(sub(startOf('sa-node'), c.ra))).toBeLessThan(45);
    expect(startOf('sa-node')[1]).toBeGreaterThan(endOf('av-node')[1]);
    expect(startOf('sa-node')[0]).toBeLessThan(endOf('av-node')[0]);
    // continuity AV node → His → bundle branches → fascicles
    expect(len(sub(endOf('av-node'), startOf('his')))).toBeLessThan(3);
    expect(len(sub(endOf('his'), startOf('lbb')))).toBeLessThan(3);
    expect(len(sub(endOf('his'), startOf('rbb')))).toBeLessThan(3);
    expect(len(sub(endOf('lbb'), startOf('laf')))).toBeLessThan(3);
    expect(len(sub(endOf('lbb'), startOf('lpf')))).toBeLessThan(3);
    // anterior fascicle ends superior to the posterior fascicle; the right bundle runs toward the RV apex/anterior wall
    expect(endOf('laf')[1]).toBeGreaterThan(endOf('lpf')[1]);
    expect(endOf('rbb')[2]).toBeGreaterThan(startOf('rbb')[2]);
    expect(endOf('rbb')[1]).toBeLessThan(startOf('rbb')[1]);
  });

  it('anchors of free walls and atria lie on outward-facing surface', () => {
    const a = heart();
    const anchors = regionAnchors(a, computeNormals(a.positions, a.indices));
    for (const id of ['ra', 'la', 'lv-mid-anterior', 'lv-mid-inferior', 'lv-mid-anterolateral', 'lv-apex', 'rv-mid', 'rv-outflow'] as const) {
      const an = anchors[id]!;
      expect(dot(an.n, an.out), id).toBeGreaterThan(0.3);
    }
  });
});
