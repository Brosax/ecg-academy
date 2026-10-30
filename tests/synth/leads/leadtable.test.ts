/**
 * T0 of the baked BEM lead table (DECISION §2.2.1, §8.2): the torso model puts the standard sites exactly on their
 * engine positions; the table reproduces every published Dower row exactly at its site (the nine standard ones by the
 * literal constants, the six chest rows and the six extra rows V3R–V5R / V7–V9 by the anchor blend); it varies smoothly
 * (never faster than the dipole bound 3/|x| per cm); Dower's extra rows were checked against the BEM (§13.1).
 */
import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../../../src/synth/api';
import { DOWER, DOWER_EXTRA } from '../../../src/synth/leads/dower';
import { chestLeadVector, inLeadTable, masonLikarSite, SITE_LEAD_VECTOR } from '../../../src/synth/leads/leadfield';
import { BEM_AT_SITES, LEAD_GRID, LEAD_TABLE_ATRIAL, LEAD_TABLE_VENT } from '../../../src/synth/leads/leadTable.gen';
import { chestSurface, cylinderPos, EXTRA_CHEST_SITES, icsHeight, lineThetaDeg, MASON_LIKAR, STANDARD_CHEST_SITES, STANDARD_POS, surfacePos, TORSO } from '../../../src/synth/leads/torso';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const angle = (a: Vec3, b: Vec3): number => (Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b))))) * 180) / Math.PI;
const CHEST = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

describe('torso surface model', () => {
  it('maps the six standard chest sites exactly onto their engine positions (≤ 1e-9 cm)', () => {
    for (const k of CHEST) {
      const p = surfacePos(chestSurface(STANDARD_CHEST_SITES[k]));
      expect(len(sub(p, STANDARD_POS[k])), k).toBeLessThanOrEqual(1e-9);
    }
  });
  it('the bare cylinder already passes within 0.6 cm of every standard chest site', () => {
    for (const k of CHEST) expect(len(sub(cylinderPos(chestSurface(STANDARD_CHEST_SITES[k])), STANDARD_POS[k])), k).toBeLessThan(0.6);
  });
  it('follows the landmarks: ICS 2.4 cm apart, V5–V9 on the plane of V4, right sites mirror the left ones', () => {
    expect(icsHeight(4, lineThetaDeg('sternal')) - icsHeight(2, lineThetaDeg('sternal'))).toBeCloseTo(4.8, 9);
    for (const k of ['V7', 'V8', 'V9'] as const) expect(chestSurface(EXTRA_CHEST_SITES[k]).y).toBe(STANDARD_POS.V4[1]);
    const v4r = chestSurface(EXTRA_CHEST_SITES.V4R), v4 = chestSurface(STANDARD_CHEST_SITES.V4);
    expect(v4r.thetaDeg).toBeCloseTo(-v4.thetaDeg, 12);
    expect(v4r.y).toBe(v4.y);
    // V9 lies behind the heart, V7 on the left flank, V4R on the anterior right chest
    const pos = (k: keyof typeof EXTRA_CHEST_SITES): Vec3 => surfacePos(chestSurface(EXTRA_CHEST_SITES[k]));
    expect(pos('V9')[2]).toBeGreaterThan(TORSO.zc + 0.9 * TORSO.b);
    expect(pos('V7')[2]).toBeGreaterThan(TORSO.zc);
    expect(pos('V4R')[0]).toBeLessThan(-8);
    expect(pos('V4R')[2]).toBeLessThan(-4);
  });
});

describe('lead table', () => {
  it('has the declared grid size, two columns, finite numbers', () => {
    const n = 3 * LEAD_GRID.nTheta * LEAD_GRID.nY;
    expect(LEAD_TABLE_VENT.length).toBe(n);
    expect(LEAD_TABLE_ATRIAL.length).toBe(n);
    for (const x of [...LEAD_TABLE_VENT, ...LEAD_TABLE_ATRIAL]) expect(Number.isFinite(x)).toBe(true);
  });

  it('reproduces the twelve published chest rows exactly at their sites (≤ 1e-9)', () => {
    for (const k of CHEST) {
      const v = chestLeadVector(chestSurface(STANDARD_CHEST_SITES[k]));
      for (let c = 0; c < 3; c++) expect(Math.abs(v[c] - DOWER[k][c]), `${k}[${c}]`).toBeLessThanOrEqual(1e-9);
    }
    for (const k of Object.keys(DOWER_EXTRA) as (keyof typeof DOWER_EXTRA)[]) {
      const v = chestLeadVector(chestSurface(EXTRA_CHEST_SITES[k]));
      for (let c = 0; c < 3; c++) expect(Math.abs(v[c] - DOWER_EXTRA[k][c]), `${k}[${c}]`).toBeLessThanOrEqual(1e-9);
    }
  });

  it('varies smoothly: relative change per cm never exceeds the dipole bound 3/|x| (x = distance from the heart)', () => {
    let worst = 0, where = '';
    for (let th = LEAD_GRID.theta0; th <= LEAD_GRID.theta0 + (LEAD_GRID.nTheta - 1) * LEAD_GRID.thetaStep - 1; th += 2.5) {
      for (let y = LEAD_GRID.y0; y <= LEAD_GRID.y0 + (LEAD_GRID.nY - 1) * LEAD_GRID.yStep - 0.5; y += 1) {
        const p = { thetaDeg: th, y }, a = chestLeadVector(p), pa = surfacePos(p);
        for (const q of [{ thetaDeg: th + 1, y }, { thetaDeg: th, y: y + 0.5 }]) {
          if (!inLeadTable(q)) continue;
          const b = chestLeadVector(q), pb = surfacePos(q);
          const rate = len(sub(b, a)) / len(a) / len(sub(pb, pa));
          const bound = 3 / len(pa);
          if (rate / bound > worst) {
            worst = rate / bound;
            where = `θ ${th} Y ${y}: ${(100 * rate).toFixed(1)} %/cm vs ${(100 * bound).toFixed(1)}`;
          }
        }
      }
    }
    expect(worst, where).toBeLessThan(1);
  });

  it("validates Dower's extra rows against the BEM: the 15-row map leaves every published row within 30° (recorded in the header)", () => {
    const D: Record<string, Vec3> = {
      ...Object.fromEntries(CHEST.map((k) => [k, DOWER[k]])),
      ...DOWER_EXTRA,
      RA: SITE_LEAD_VECTOR.RA, LA: SITE_LEAD_VECTOR.LA, LL: SITE_LEAD_VECTOR.LL,
    };
    for (const [k, d] of Object.entries(D)) expect(angle(BEM_AT_SITES[k] as Vec3, d), k).toBeLessThan(30);
  });

  it('places the Mason–Likar sites inside the table with lead vectors anchored on the exact limb vectors', () => {
    for (const k of ['RA', 'LA', 'LL', 'RL'] as const) {
      expect(inLeadTable(MASON_LIKAR[k]), k).toBe(true);
      const s = masonLikarSite(k);
      const j = k === 'RL' ? 'LL' : k;
      // closer to the heart than the limb junction, and still on the same side
      expect(len(s.pos)).toBeLessThan(len(STANDARD_POS[j]));
      expect(angle(s.lv, SITE_LEAD_VECTOR[j])).toBeLessThan(35);
    }
  });

  it('rejects sites outside the baked surface', () => {
    expect(inLeadTable({ thetaDeg: -150, y: 2 })).toBe(false);
    expect(() => chestLeadVector({ thetaDeg: -150, y: 2 })).toThrow(/outside the baked lead table/);
  });
});
