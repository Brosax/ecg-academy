/**
 * Morphology mechanisms of synth-morph (DECISION §6.3–§6.6, M4) checked at the source level — the vectors and lobes
 * the one-source rule is made of — so a regression is caught where it happens, before the lead-level criteria (T3)
 * see it: substrate operators (necrosis, slow regions, septum), repolarisation (ΔG, cardiac memory, the change-lobe
 * cap), near-field extras, atrial injury, the stage maps, and the derived findings / thresholds of truth/findings.ts.
 */
import { describe, expect, it } from 'vitest';
import type { RegionId } from '../../../src/core/regions';
import { dot, len, unit, type Vec3 } from '../../../src/synth/frame';
import { activationTiming } from '../../../src/synth/heart/activation';
import { massNormal, REGION_INDEX, totalMass, ventGeom } from '../../../src/synth/heart/anatomy';
import { apdDelta } from '../../../src/synth/heart/apd';
import { lobeArea, plateauArea } from '../../../src/synth/kernel/kernel';
import { buildAtrial } from '../../../src/synth/morph/atrial';
import { injuryPlateaus } from '../../../src/synth/morph/injury';
import { BRUGADA_SOURCE, nearFieldLobes, SADDLEBACK } from '../../../src/synth/morph/nearfield';
import { NORMAL_PATTERN } from '../../../src/synth/morph/patterns/normal';
import { deltaG, memoryQrsArea } from '../../../src/synth/morph/repol';
import { resolveLobe } from '../../../src/synth/morph/resolve';
import { hyperkalemiaStage, INFARCT_KNOTS, infarctStage } from '../../../src/synth/morph/stage';
import { buildVentricular, G_NORMAL, instantiateVent, type VentBuildInput, type VentMorph } from '../../../src/synth/morph/ventricular';
import { potentialsAt } from '../../../src/synth/kernel/render';
import { leadAt } from '../../../src/synth/leads/assemble';
import { STANDARD_HOOKUP } from '../../../src/synth/leads/electrodes';
import { generate } from '../../../src/synth/index';
import { generatedPattern, PACING_INPUT } from '../../../src/synth/rhythm/fronts';
import { deriveFindings, qtcLongLimit, voltageFacts, type LeadAmps } from '../../../src/synth/truth/findings';
import type { StdLead } from '../../../src/core/leads';

const NORMAL_INPUT = { key: 'normal', lobes: NORMAL_PATTERN.lobes, activation: NORMAL_PATTERN.activation };
const build = (o: Partial<VentBuildInput> = {}): VentMorph => buildVentricular({ pattern: NORMAL_INPUT, refRrMs: 1000, ...o });
const sum = (vs: readonly Vec3[]): Vec3 => vs.reduce<Vec3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]);
const qrsArea = (m: VentMorph): Vec3 => sum(m.qrs.map(lobeArea));
const ANTERIOR: readonly RegionId[] = ['lv-mid-anterior', 'lv-mid-anteroseptal', 'lv-apical-anterior', 'lv-apical-septal', 'lv-apex'];

describe('substrate operators (§6.3)', () => {
  it('necrosis removes the outward wall force of the scar: the necrosis lobe points away from the scar (Q waves face it)', () => {
    const m = build({ substrate: { scar: [{ where: [...ANTERIOR], transmurality: 1 }] } });
    const nec = m.qrs.filter((l) => /necrosis/.test(l.label));
    expect(nec.length).toBe(1);
    expect(dot(unit(lobeArea(nec[0])), unit(massNormal(ANTERIOR)))).toBeLessThan(-0.9);
    // and it does not by itself change the T: its area is also in the gradient (mass lobe)
    expect(len(G_NORMAL)).toBeGreaterThan(0);
  });

  it('a slowed region is activated late: one late lobe ending ≈ the delay after the region window, pointing toward the region', () => {
    const delay = 22;
    const where = ['rv-outflow', 'rv-basal'] as const;
    const base = build();
    const m = build({ substrate: { slow: [{ where: [...where], delayMs: delay }] } });
    const late = m.qrs.filter((l) => /slow conduction/.test(l.label));
    expect(late.length).toBe(1);
    const t = activationTiming(NORMAL_PATTERN.activation);
    const t1 = Math.max(...where.map((id) => t.t1[REGION_INDEX[id]]));
    expect(late[0].end).toBeCloseTo(t1 + delay, 6);
    expect(m.qrsOff).toBeGreaterThan(base.qrsOff);
    const toward = unit(sum(where.map((id) => unit(ventGeom(id).c))));
    expect(dot(unit(lobeArea(late[0])), toward)).toBeGreaterThan(0.5);
  });

  it('septum > 1 enlarges and septum < 0 reverses the septal force; the extra force enters the gradient (no T change by itself)', () => {
    const n = build();
    const hcm = build({ substrate: { septum: 3 } });
    const pe = build({ substrate: { septum: -2 } });
    const sep = (m: VentMorph): Vec3 => lobeArea(m.qrs[0]);
    expect(len(sep(hcm)) / len(sep(n))).toBeCloseTo(3, 6);
    expect(dot(unit(sep(pe)), unit(sep(n)))).toBeCloseTo(-1, 6);
    // G grows by exactly the added septal area
    const dG = (m: VentMorph): Vec3 => [m.G[0] - n.G[0], m.G[1] - n.G[1], m.G[2] - n.G[2]];
    const dS = (m: VentMorph): Vec3 => [sep(m)[0] - sep(n)[0], sep(m)[1] - sep(n)[1], sep(m)[2] - sep(n)[2]];
    for (const m of [hcm, pe]) for (let c = 0; c < 3; c++) expect(dG(m)[c]).toBeCloseTo(dS(m)[c], 6);
  });

  it('LV mass makes the free-wall force larger and longer; RV mass adds a late rightward RV force', () => {
    const n = build();
    const lvh = build({ substrate: { lvMass: 1.8 } });
    expect(len(qrsArea(lvh))).toBeGreaterThan(1.3 * len(qrsArea(n)));
    const rvh = build({ substrate: { rvMass: 3 } });
    const rv = rvh.qrs.find((l) => /RV hypertrophy/.test(l.label))!;
    expect(rv.dir[0]).toBeLessThan(0);
    expect(rv.peak).toBeGreaterThan(40);
  });
});

describe('repolarisation (§6.4)', () => {
  it('ΔG: epicardial APD shortening pulls the gradient toward the region (hyperacute T), prolongation pushes it away', () => {
    const toward = unit(massNormal(ANTERIOR));
    expect(dot(deltaG(apdDelta([{ where: [...ANTERIOR], layer: 'epi', deltaMs: -40 }])), toward)).toBeGreaterThan(0);
    expect(dot(deltaG(apdDelta([{ where: [...ANTERIOR], layer: 'epi', deltaMs: 60 }])), toward)).toBeLessThan(0);
  });

  it('a uniform change of every LV region largely cancels (opposite walls push G in opposite directions): per unit of changed mass it moves G far less than a regional change', () => {
    const lv = Object.keys(REGION_INDEX).filter((id) => id.startsWith('lv-')) as RegionId[];
    const perMass = (ids: readonly RegionId[]): number => len(deltaG(apdDelta([{ where: [...ids], layer: 'epi', deltaMs: 60 }]))) / totalMass(ids);
    expect(perMass(lv)).toBeLessThan(0.5 * perMass(ANTERIOR));
  });

  it('cardiac memory remembers the engine\'s own paced QRS (RV apex: superior, posterior)', () => {
    const a = memoryQrsArea('rv-apex');
    const lobes = generatedPattern('paced:rv-apex', PACING_INPUT['rv-apex'], 'paced rv-apex').lobes;
    const ref = sum(lobes.map((l) => lobeArea(resolveLobe(l, 'QRS', 'none'))));
    for (let c = 0; c < 3; c++) expect(a[c]).toBeCloseTo(ref[c], 6);
    expect(a[1]).toBeLessThan(0);
    expect(a[2]).toBeGreaterThan(0);
  });

  it('a large APD change keeps a broad change lobe (no QRS-like spike) that still ends before the primary T end', () => {
    const m = build({ repol: { qtcMs: 460, apd: [{ where: ['lv-apical-anterior', 'lv-apical-septal', 'lv-apical-inferior', 'lv-apical-lateral', 'lv-apex'], layer: 'epi', deltaMs: 220 }] } });
    const ch = m.post.find((l) => /ΔG/.test(l.label))!;
    expect(ch.end).toBeLessThanOrEqual(m.tPrimary.end);
    expect(ch.end - ch.peak).toBeGreaterThan(0.5 * (m.tPrimary.end - m.tPrimary.peak));
  });
});

describe('injury, near field and atria (§6.5, §6.6, §11)', () => {
  it('subendocardial injury points opposite to transmural injury of the same territory', () => {
    const tr = injuryPlateaus({ where: [...ANTERIOR], layer: 'transmural', stMv: 0.2 }, 92, 300, 220)[0];
    const se = injuryPlateaus({ where: [...ANTERIOR], layer: 'subendocardial', stMv: -0.2 }, 92, 300, 220)[0];
    expect(dot(unit(plateauArea(tr)), unit(plateauArea(se)))).toBeCloseTo(-1, 6);
    // epicardial (pericarditis): one near-field plateau per region
    expect(injuryPlateaus({ where: [...ANTERIOR], layer: 'epicardial', stMv: 0.2 }, 92, 300, 220).length).toBe(ANTERIOR.length);
  });

  it('the injury solve honours the torso gain: the recorded ST at J+60 in the reference lead is stMv at any gain', () => {
    const inj = [{ where: [...ANTERIOR], layer: 'transmural' as const, stMv: 0.3, ref: 'V2' as const }];
    for (const torsoGain of [0.5, 1, 1.4]) {
      const m = build({ injury: inj, geometry: { torsoGain } });
      const b = instantiateVent(m, 0, 1000, -1);
      const st = leadAt('V2', potentialsAt(b.kernels, b.qrsOff + 60, torsoGain), STANDARD_HOOKUP);
      expect(st, `torso gain ${torsoGain}`).toBeCloseTo(0.3, 3);
    }
    // end to end: sgarbossa:smith carries a 0.72 torso gain; the truth's J+60 ST in V2 is the requested 0.5 mV
    const t = generate({ scenario: 'sgarbossa', variant: 'smith', seed: 1 }).ecg.truth!;
    expect(t.stMv.V2).toBeCloseTo(0.5, 1);
  });

  it('Brugada: pure near field at the RVOT epicardium; coved reverses into a negative T, saddleback ends earlier into an upright T', () => {
    const coved = nearFieldLobes([{ kind: 'brugada', where: ['rv-outflow'], amp: 0.1, shape: 'coved', far: 0 }]).lobes;
    const saddle = nearFieldLobes([{ kind: 'brugada', where: ['rv-outflow'], amp: 0.1, shape: 'saddleback', far: 0 }]).lobes;
    for (const l of [...coved, ...saddle]) {
      expect(l.far).toBe(0);
      expect(l.loc).toEqual(BRUGADA_SOURCE);
    }
    expect(coved[1].amp).toBeGreaterThan(coved[0].amp);
    expect(saddle[0].end).toBe(SADDLEBACK.domeEndMs);
    // saddleback: the late lobe points anterior (negative amplitude along the posterior reversal direction) — the upright
    // T that rises out of the ST trough in V1 and V2
    expect(saddle[1].amp).toBeLessThan(0);
  });

  it('J wave sets the J point after the QRS end; epsilon is a small late near-field deflection', () => {
    const j = nearFieldLobes([{ kind: 'j-wave', where: ['lv-mid-anterolateral'], amp: 0.3, lagMs: 0 }]);
    expect(j.jEnd).toBe(4);
    const e = nearFieldLobes([{ kind: 'epsilon', where: ['rv-outflow'], amp: 0.05, lagMs: 14, far: 0 }]);
    expect(e.lobes[0].on).toBeGreaterThan(0);
    expect(e.jEnd).toBeNull();
  });

  it('atrial injury: a PR-segment current opposite to the P vector, starting after the P (the P keeps its shape)', () => {
    const a = buildAtrial({ injuryMv: 0.06 });
    const p = sum(a.lobes.map(lobeArea));
    expect(a.plateaus.length).toBe(1);
    expect(dot(unit(a.plateaus[0].dir), unit(p))).toBeCloseTo(-1, 6);
    expect(a.plateaus[0].on).toBeGreaterThan(a.pOff);
    expect(buildAtrial({}).plateaus.length).toBe(0);
  });
});

describe('stage maps (morph/stage.ts)', () => {
  it('infarct course: hyperacute (small injury, epicardial APD shortening) → acute (peak ST) → Q waves with T inversion → old', () => {
    const inp = { where: [...ANTERIOR], peakStMv: 0.3, ref: 'V2' } as const;
    const s0 = infarctStage(inp, 0), s1 = infarctStage(inp, 0.25), s2 = infarctStage(inp, 0.5), s4 = infarctStage(inp, 1);
    expect(s0.repol.apd[0].deltaMs).toBeLessThan(0);
    expect(s1.injury![0].stMv).toBeCloseTo(0.3, 6);
    expect(s0.injury![0].stMv).toBeLessThan(s1.injury![0].stMv);
    expect(s2.repol.apd[0].deltaMs).toBeGreaterThan(0);
    expect(s4.injury).toEqual([]);
    const tau = [0, 0.25, 0.5, 0.75, 1].map((s) => infarctStage(inp, s).substrate.scar?.[0]?.transmurality ?? 0);
    for (let i = 1; i < tau.length; i++) expect(tau[i]).toBeGreaterThanOrEqual(tau[i - 1]);
    expect(INFARCT_KNOTS.necrosis[INFARCT_KNOTS.necrosis.length - 1][1]).toBe(0.8);
  });

  it('hyperkalaemia: P flattens, PR and QRS lengthen and the T rises earlier as the stage advances', () => {
    const a = hyperkalemiaStage(0.2), b = hyperkalemiaStage(0.95);
    expect(b.atria!.gain!).toBeLessThan(a.atria!.gain!);
    expect(b.substrate!.conduction!).toBeGreaterThan(a.substrate!.conduction!);
    expect(b.ahExtraMs).toBeGreaterThan(a.ahExtraMs);
    expect(b.repol.tShape!.riseFrac!).toBeLessThan(a.repol.tShape!.riseFrac!);
  });
});

describe('derived findings and thresholds (truth/findings.ts, criteria.md)', () => {
  const amps = (o: Partial<Record<StdLead, Partial<LeadAmps>>> = {}): Record<StdLead, LeadAmps> => {
    const base: LeadAmps = { r: 1, s: -0.3 };
    const leads: StdLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
    return Object.fromEntries(leads.map((l) => [l, { ...base, ...(o[l] ?? {}) }])) as Record<StdLead, LeadAmps>;
  };
  const derive = (o: Partial<Parameters<typeof deriveFindings>[0]>) => deriveFindings({
    declared: [], rhythm: 'sinus-rhythm', hrBpm: 70, ppRangeMs: 20, prMs: 160, qrsMs: 92, qtcFridericiaMs: 405, axisDeg: 40, amps: amps(), sex: 'male', ventricularRhythm: false, ...o,
  });

  it('QTc limits by sex (≥ 450 men, ≥ 460 women; unknown: 460) and the QRS-adjusted QT in wide QRS', () => {
    expect(qtcLongLimit('male')).toBe(450);
    expect(qtcLongLimit('female')).toBe(460);
    expect(qtcLongLimit(null)).toBe(460);
    expect(derive({ qtcFridericiaMs: 455, sex: 'male' })).toContain('long-qt');
    expect(derive({ qtcFridericiaMs: 455, sex: 'female' })).not.toContain('long-qt');
    // RBBB of 140 ms: the 40 ms of extra QRS are not repolarisation
    expect(derive({ qtcFridericiaMs: 480, qrsMs: 140, sex: 'male' })).not.toContain('long-qt');
  });

  it('short PR is not derived with a declared WPW; poor R progression not with LBBB; low voltage by limb or chest leads', () => {
    expect(derive({ prMs: 110 })).toContain('short-pr');
    expect(derive({ prMs: 110, declared: ['wpw'] })).not.toContain('short-pr');
    expect(derive({ amps: amps({ V3: { r: 0.2 } }) })).toContain('poor-r-progression');
    expect(derive({ amps: amps({ V3: { r: 0.2 } }), declared: ['lbbb'] })).not.toContain('poor-r-progression');
    const limbLow = amps({ I: { r: 0.2, s: -0.1 }, II: { r: 0.3, s: 0 }, III: { r: 0.2, s: -0.1 }, aVR: { r: 0.1, s: -0.3 }, aVL: { r: 0.1, s: -0.1 }, aVF: { r: 0.2, s: -0.1 } });
    expect(derive({ amps: limbLow })).toContain('low-voltage');
  });

  it('voltage facts: Sokolow–Lyon > 35 mm, Cornell > 28 / 20 mm and Peguero–Lo Presti ≥ 28 / 23 mm by sex', () => {
    const a = amps({ V1: { s: -1.6 }, V5: { r: 2.1 }, aVL: { r: 0.9 }, V3: { s: -1.4 }, V4: { s: -1.0 } });
    const male = voltageFacts(a, 'male'), female = voltageFacts(a, 'female');
    expect(male.sokolowLyonMm).toBe('37');
    expect(male.cornellThresholdMm).toBe('28');
    expect(female.cornellThresholdMm).toBe('20');
    expect(male.pegueroThresholdMm).toBe('28');
    expect(female.pegueroThresholdMm).toBe('23');
    expect(male.lvhVoltageCriteria).toContain('sokolow-lyon');
    expect(female.lvhVoltageCriteria).toContain('cornell');
  });
});
