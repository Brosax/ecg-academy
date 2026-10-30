/**
 * Generated atrial family (DECISION §6.6: ectopic, retrograde, wandering and multifocal P waves; the atrial half of
 * frontsynth). Lives in rhythm/ because the scheduler picks the atrial site per event; the authored sinus P
 * (morph/atrial.ts SINUS_P) stays the calibrated base.
 *
 * Model. Two point clouds stand for the right and left atria (24 points each on ellipsoids around the baked atrial
 * centroids). Points of one chamber are linked to their nearest neighbours (atrial muscle, 0.08 cm/ms); the chambers are
 * linked by Bachmann's bundle (anterior-superior, fast), the fossa-ovalis rim (mid septum) and the coronary-sinus
 * musculature (posterior-inferior). Activation spreads from the site's nearest point (Dijkstra). Each chamber gives one
 * P lobe: onset / offset = its first / last activation (+ the front's width), direction = the regression of point
 * position on activation time (the mean propagation velocity of that chamber's activation), amplitude = the chamber's
 * calibrated sinus amplitude. One family calibration (per chamber): a rotation that takes the generated sinus
 * directions onto the authored, PTB-XL-calibrated SINUS_P directions, applied to every site; the P duration, the
 * timing and the AV-node arrival come from the graph. Ta: −ratio × P area, as for the sinus P.
 *
 * Site positions follow the usual electrophysiological landmarks (Kistler PM et al., JACC 2006, P-wave morphology of
 * focal atrial tachycardia by site): crista and high RA → upright inferior P; low RA / CS ostium → negative inferior P;
 * left-sided sites → negative or isoelectric P in I and aVL, positive in V1; retrograde (AV node) → negative inferior P.
 */
import type { AtrialSite, AtrialSpec, Vec3 } from '../api';
import { add, cross, dot, len, rotateAbout, scale, sub, unit } from '../frame';
import { ATRIAL_CENTROIDS, CONDUCTION_CENTROIDS } from '../heart/regionGeom.gen';
import { lobeArea, lobeKernel, lobeWithArea, type Lobe } from '../kernel/kernel';
import { render } from '../kernel/render';
import { buildAtrial, SINUS_P, type AtrialMorph } from '../morph/atrial';
import { ATRIAL_FIELD_LOC, DOWER } from '../leads/leadfield';

/** Atrial wave of a generated site plus the AV-node arrival of its activation. */
export interface SiteMorph extends AtrialMorph {
  /** time (ms after the P onset) at which the activation reaches the AV node (the site's intra-atrial time) */
  readonly nodeMs: number;
}

/** Internal sites beyond the AtrialSite set: pacing lead, pathway atrial insertions and the fast-pathway exit of typical
 *  AVNRT. */
export type GenSite = AtrialSite | 'ra-appendage' | 'pathway-left' | 'pathway-septal' | 'pathway-right' | 'fast-pathway';

const V_MUSCLE = 0.08; // cm/ms
const FRONT_MS = 18; // front width added to the last activation (2 % edge of the lobe)

interface Pt { readonly p: Vec3; readonly ra: boolean }

function ellipsoid(c: Vec3, r: Vec3, n: number, ra: boolean): Pt[] {
  const out: Pt[] = [];
  const g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const rad = Math.sqrt(1 - y * y);
    const th = g * i;
    out.push({ p: [c[0] + r[0] * Math.cos(th) * rad, c[1] + r[1] * y, c[2] + r[2] * Math.sin(th) * rad], ra });
  }
  return out;
}

const RA_C: Vec3 = [ATRIAL_CENTROIDS.ra[0], ATRIAL_CENTROIDS.ra[1], ATRIAL_CENTROIDS.ra[2]];
const LA_C: Vec3 = [ATRIAL_CENTROIDS.la[0], ATRIAL_CENTROIDS.la[1], ATRIAL_CENTROIDS.la[2]];
const PTS: readonly Pt[] = [...ellipsoid(RA_C, [1.5, 2.3, 1.5], 24, true), ...ellipsoid(LA_C, [1.8, 1.5, 1.3], 24, false)];
const nearest = (q: Vec3, filter?: (p: Pt) => boolean): number => {
  let bi = -1, bd = Infinity;
  PTS.forEach((p, i) => {
    if (filter && !filter(p)) return;
    const d = len(sub(p.p, q));
    if (d < bd) {
      bd = d;
      bi = i;
    }
  });
  return bi;
};

/** adjacency with conduction times (ms) */
const ADJ: readonly (readonly [number, number])[][] = (() => {
  const adj: [number, number][][] = PTS.map(() => []);
  const link = (a: number, b: number, ms: number): void => {
    if (a === b || adj[a].some(([x]) => x === b)) return;
    adj[a].push([b, ms]);
    adj[b].push([a, ms]);
  };
  PTS.forEach((p, i) => {
    const same = PTS.map((q, j) => ({ j, d: len(sub(q.p, p.p)) })).filter((x) => x.j !== i && PTS[x.j].ra === p.ra).sort((a, b) => a.d - b.d);
    for (const x of same.slice(0, 4)) link(i, x.j, x.d / V_MUSCLE);
  });
  // interatrial connections (RA end, LA end, conduction time)
  const bridge = (raQ: Vec3, laQ: Vec3, ms: number): void => link(nearest(raQ, (p) => p.ra), nearest(laQ, (p) => !p.ra), ms);
  bridge([-2.0, -4.4, 2.6], [-0.3, -4.6, 4.2], 12); // Bachmann's bundle (anterior-superior)
  bridge([-2.1, -2.6, 4.4], [-0.6, -3.2, 4.8], 26); // fossa-ovalis rim
  bridge([-2.1, -0.9, 4.0], [0.2, -2.2, 5.8], 30); // coronary-sinus musculature
  return adj;
})();

/** Site locations (cm, Frank). */
const SITE_POS: Readonly<Record<GenSite, Vec3>> = {
  sinus: [-3.6, -5.2, 3.3],
  'high-ra': [-2.9, -5.0, 2.5],
  crista: [-4.8, -2.8, 3.6],
  'ra-septal': [-2.0, -3.4, 4.6],
  'low-ra': [-3.8, -0.6, 3.6],
  'cs-ostium': [-2.1, -0.8, 4.1],
  'la-superior': [0.8, -5.1, 5.0],
  'la-inferior': [1.0, -2.3, 6.0],
  'left-pv': [2.7, -4.0, 5.8],
  'right-pv': [-0.5, -3.7, 6.3],
  retrograde: [CONDUCTION_CENTROIDS['av-node'][0], CONDUCTION_CENTROIDS['av-node'][1], CONDUCTION_CENTROIDS['av-node'][2] + 1],
  'fast-pathway': [CONDUCTION_CENTROIDS['av-node'][0], CONDUCTION_CENTROIDS['av-node'][1], CONDUCTION_CENTROIDS['av-node'][2] + 1],
  'ra-appendage': [-2.6, -4.6, 2.0],
  'pathway-left': [2.6, -2.4, 5.4],
  'pathway-septal': [-1.6, -1.0, 4.4],
  'pathway-right': [-4.6, -1.4, 3.0],
};

/** AV-node entry (atrial side) */
const NODE_ENTRY = nearest([-2.1, -1.0, 3.8], (p) => p.ra);

/**
 * Chamber directions that the coarse 48-point graph cannot resolve (Frank, before the mirror). The fast-pathway exit of
 * typical AVNRT: retrograde activation leaves the anterior (superior) septum near the apex of Koch's triangle and spreads
 * superiorly, rightward and anteriorly into the RA free wall and appendage, and superiorly through Bachmann's bundle
 * and the septum into the LA — the published P′ of typical AVNRT: negative in II, III, aVF, positive in aVR and V1 (the
 * pseudo-S and pseudo-r′; Kalbfleisch SJ et al., JACC 1993;21:85; Haghjoo M et al., Europace 2012;14:1624). On the
 * graph the septal exit gives a P′ vector almost orthogonal to V1 (no pseudo-r′); the timing and the depolarisation
 * integral still come from the graph and the family calibration.
 */
const AUTHORED_DIR: Partial<Record<GenSite, { readonly ra: Vec3; readonly la: Vec3 }>> = {
  'fast-pathway': { ra: [-0.45, -0.56, -0.7], la: [0.05, -0.7, -0.71] },
};

/** Extra simultaneous breakthroughs: retrograde conduction from the AV node reaches both atria through the septum
 *  (the RA septal exit and, ≈ 10 ms later, the LA septum), so the retrograde P′ is short (≈ 80 ms). The fast-pathway
 *  exit of typical (slow–fast) AVNRT lies in the septum itself: both atria break through at once, so its P′ is shorter
 *  still (≈ 85 ms between 2 % edges, most of it within 60 ms) and taller for the same depolarisation integral — the
 *  pseudo-r′ in V1 and pseudo-S inferiorly at the end of the QRS. */
const EXTRA_SEEDS: Partial<Record<GenSite, readonly (readonly [Vec3, number, boolean])[]>> = {
  retrograde: [[[-0.6, -2.6, 4.9], 10, false]],
  'fast-pathway': [[[-0.6, -2.6, 4.9], 0, false], [[-2.0, -2.6, 4.4], 0, true]],
};

function activate(seed: number, extra: readonly (readonly [Vec3, number, boolean])[] = []): Float64Array {
  const t = new Float64Array(PTS.length).fill(Infinity);
  const done = new Uint8Array(PTS.length);
  t[seed] = 0;
  for (const [q, ms, ra] of extra) {
    const i = nearest(q, (p) => p.ra === ra);
    t[i] = Math.min(t[i], ms);
  }
  for (;;) {
    let u = -1, b = Infinity;
    for (let i = 0; i < t.length; i++) if (!done[i] && t[i] < b) {
      b = t[i];
      u = i;
    }
    if (u < 0) break;
    done[u] = 1;
    for (const [v, ms] of ADJ[u]) if (t[u] + ms < t[v]) t[v] = t[u] + ms;
  }
  return t;
}

interface Chamber { readonly on: number; readonly end: number; readonly peak: number; readonly dir: Vec3 }

function chamberOf(t: Float64Array, ra: boolean): Chamber {
  const idx = PTS.map((p, i) => i).filter((i) => PTS[i].ra === ra);
  const ts = idx.map((i) => t[i]);
  const tm = ts.reduce((a, b) => a + b, 0) / ts.length;
  const pm = scale(idx.reduce<Vec3>((s, i) => add(s, PTS[i].p), [0, 0, 0]), 1 / idx.length);
  let v: Vec3 = [0, 0, 0];
  let den = 0;
  idx.forEach((i) => {
    const dt = t[i] - tm;
    v = add(v, scale(sub(PTS[i].p, pm), dt));
    den += dt * dt;
  });
  const on = Math.min(...ts), end = Math.max(...ts) + FRONT_MS;
  return { on, end, peak: on + 0.55 * (end - on), dir: unit(scale(v, 1 / Math.max(1e-9, den))) };
}

/** Rotation (axis, degrees) taking unit vector a onto b. */
function rotationBetween(a: Vec3, b: Vec3): { axis: Vec3; deg: number } {
  const c = cross(a, b);
  const s = len(c), d = dot(a, b);
  return { axis: s > 1e-9 ? scale(c, 1 / s) : [0, 0, 1], deg: (Math.atan2(s, d) * 180) / Math.PI };
}

const RAW: Map<GenSite, { ra: Chamber; la: Chamber; nodeMs: number }> = new Map();
function raw(site: GenSite): { ra: Chamber; la: Chamber; nodeMs: number } {
  let r = RAW.get(site);
  if (!r) {
    const t = activate(nearest(SITE_POS[site]), EXTRA_SEEDS[site]);
    r = { ra: chamberOf(t, true), la: chamberOf(t, false), nodeMs: t[NODE_ENTRY] };
    RAW.set(site, r);
  }
  return r;
}

/** Family calibration: per chamber, the rotation generated-sinus → authored SINUS_P, and the timing offsets. */
const CAL = (() => {
  const s = raw('sinus');
  return {
    ra: rotationBetween(s.ra.dir, unit(SINUS_P.ra.dir)),
    la: rotationBetween(s.la.dir, unit(SINUS_P.la.dir)),
    /** the authored sinus P has RA 0–72 ms and LA 32–104 ms; scale graph times onto it */
    timeK: (SINUS_P.la.end - SINUS_P.ra.on) / Math.max(1, Math.max(s.ra.end, s.la.end) - Math.min(s.ra.on, s.la.on)),
    /** graph time of the sinus AV-node arrival (mapped onto DEFAULT_JUNCTION.intraAtrialMs = 35 ms) */
    sinusNode: s.nodeMs,
  };
})();

/**
 * Visible-onset convention of the P waves (truth). A generated P rises more slowly than the authored sinus P (its
 * chamber lobes are longer, and its first chamber may point away from the leads a reader looks at), so its 2 % kernel
 * edge lies earlier than what a reader sees. Its truth onset is moved by t_site − t_sinus, where t is the time from the
 * kernel onset to VISIBLE_P_FRACTION of the peak of the P amplitude in the P leads II, V1 and I (Dower rows; the
 * leads of the truth's P-visibility rule), never negative — the sinus convention, which agrees with the oracle, is kept
 * (same idea as the visible QRS edges of generated ventricular complexes, rhythm/scheduler.ts).
 */
const VISIBLE_P_FRACTION = 0.13;
const P_LEADS = [DOWER.II, DOWER.V1, DOWER.I] as const;
function tToFraction(lobes: readonly Lobe[]): number {
  const ks = lobes.map((l) => lobeKernel(l, 0, -1, true));
  const lo = Math.floor(Math.min(...lobes.map((l) => l.on))) - 2;
  const hi = Math.ceil(Math.max(...lobes.map((l) => l.end))) + 2;
  const r = render(ks, 1000, hi - lo + 1, lo, 0);
  const amp = (i: number): number => Math.hypot(...P_LEADS.map((v) => v[0] * r.H[0][i] + v[1] * r.H[1][i] + v[2] * r.H[2][i]));
  let pk = 0;
  for (let i = 0; i < r.n; i++) pk = Math.max(pk, amp(i));
  for (let i = 0; i < r.n; i++) if (amp(i) >= VISIBLE_P_FRACTION * pk) return lo + i;
  return 0;
}
let SINUS_T10: number | null = null;

const CACHE = new Map<string, SiteMorph>();

/**
 * Atrial morphology of a site (sinus → the authored sinus P with the AtrialSpec modifiers). Generated sites take the
 * AtrialSpec gain (P flattening) and the mirror image of dextrocardia; RA / LA abnormality and interatrial block are
 * modelled for the sinus P only.
 */
export function atrialSite(site: GenSite, spec: AtrialSpec | undefined, mirror: boolean): SiteMorph {
  const key = `${site}|${spec?.gain ?? 1}|${mirror}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  let out: SiteMorph;
  if (site === 'sinus') {
    out = { ...buildAtrial(spec, 'sinus', mirror), nodeMs: 35 };
  } else {
    const r = raw(site);
    const k = CAL.timeK;
    const t0 = Math.min(r.ra.on, r.la.on);
    const mx = (v: Vec3): Vec3 => (mirror ? [-v[0], v[1], v[2]] : v);
    const loc = mx(ATRIAL_FIELD_LOC);
    const gain = spec?.gain ?? 1;
    // family calibration of the magnitude: the chamber activated first carries the depolarisation integral (lobe area)
    // of the sinus RA, the other the sinus LA's — the same muscle depolarised once, whatever the sequence (equal peak
    // amplitudes would inflate the longer generated lobes, and with them their Ta)
    const sinusLobes = buildAtrial(undefined, 'sinus', false).lobes;
    const firstArea = len(lobeArea(sinusLobes[0])), secondArea = len(lobeArea(sinusLobes[1]));
    const raFirst = r.ra.on <= r.la.on;
    const mk = (c: Chamber, which: 'ra' | 'la'): Lobe => {
      const rot = CAL[which];
      const authored = AUTHORED_DIR[site]?.[which];
      const dir = mx(authored ? unit(authored) : unit(rotateAbout(c.dir, rot.axis, rot.deg)));
      const on = (c.on - t0) * k, end = (c.end - t0) * k;
      const shape: Lobe = {
        label: which === 'ra' ? 'RA' : 'LA', on, peak: on + (c.peak - c.on) * k, end, endRule: 'edge', q: 2, dir, dir2: null,
        amp: 1, regions: [[which, 1]], loc, far: 1, wave: 'P',
      };
      const target = (which === 'ra') === raFirst ? firstArea : secondArea;
      return { ...shape, amp: (target / Math.max(1e-9, len(lobeArea(shape)))) * gain };
    };
    const lobes = [mk(r.ra, 'ra'), mk(r.la, 'la')];
    SINUS_T10 ??= tToFraction(buildAtrial(undefined, 'sinus', false).lobes);
    const pOn = Math.min(...lobes.map((l) => l.on)) + Math.max(0, tToFraction(lobes) - SINUS_T10);
    const pOff = Math.max(...lobes.map((l) => l.end));
    const pArea = add(lobeArea(lobes[0]), lobeArea(lobes[1]));
    const ta = lobeWithArea({
      label: 'Ta', on: pOff - 44, peak: pOff + 61, end: pOff + 226, endRule: 'edge', q: 2, regions: [['ra', 1], ['la', 1]], loc, far: 1, wave: 'Ta',
    }, scale(pArea, -SINUS_P.ta.ratio));
    out = { site: site === 'fast-pathway' ? 'retrograde' : site === 'ra-appendage' || site.startsWith('pathway') ? 'high-ra' : (site as AtrialSite), lobes, ta, plateaus: [], pOn, pOff, nodeMs: Math.max(5, 35 + (r.nodeMs - CAL.sinusNode) * k) };
  }
  if (CACHE.size > 64) CACHE.clear();
  CACHE.set(key, out);
  return out;
}

/** Atrial-side pathway insertion used for the retrograde P′ of AVRT, by pathway site. */
export function pathwayAtrialSite(site: string): GenSite {
  if (site.startsWith('left')) return 'pathway-left';
  if (site.startsWith('right')) return 'pathway-right';
  return 'pathway-septal';
}
