import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FINDING_LIST, isFindingId, type FindingId } from '../../src/core/findings';
import { rawMeta } from '../../src/real/library';
import {
  CASE_CATEGORIES,
  caseStatements,
  categoriesOf,
  COMPATIBLE,
  compatibleFindings,
  confidentCodes,
  DIAGNOSTIC_AND_FORM,
  infarctAge,
  isConfident,
  likelihoodWord,
  mapScpToFindings,
  relatedFindings,
  SCP,
  SCP_LIST,
  scpContributions,
  scpStatements,
} from '../../src/real/scp';

const CSV = fileURLToPath(new URL('../../data-raw/ptbxl/scp_statements.csv', import.meta.url));

/** code → kind flags from scp_statements.csv (read-only; data-raw is not shipped, so the test skips without it). */
function csvKinds(): Map<string, { d: boolean; f: boolean; r: boolean }> {
  const lines = readFileSync(CSV, 'utf8').trim().split(/\r?\n/).slice(1);
  const out = new Map<string, { d: boolean; f: boolean; r: boolean }>();
  for (const line of lines) {
    const cells = line.match(/("[^"]*"|[^,]*)(,|$)/g)!.map((s) => s.replace(/,$/, ''));
    out.set(cells[0], { d: cells[2] === '1.0', f: cells[3] === '1.0', r: cells[4] === '1.0' });
  }
  return out;
}

const ORDER = new Map(FINDING_LIST.map((d, i) => [d.id as string, i]));
const sorted = (ids: readonly FindingId[]) => ids.every((id, i) => i === 0 || ORDER.get(ids[i - 1])! < ORDER.get(id)!);

describe('SCP statement table', () => {
  it('has the 71 PTB-XL statements with unique codes', () => {
    expect(SCP_LIST).toHaveLength(71);
    expect(new Set(SCP_LIST.map((d) => d.code)).size).toBe(71);
    expect(scpStatements).toHaveLength(71);
  });

  it.skipIf(!existsSync(CSV))('matches scp_statements.csv (codes and kinds; diagnostic wins over form)', () => {
    const csv = csvKinds();
    expect([...csv.keys()].sort()).toEqual(SCP_LIST.map((d) => d.code).sort());
    for (const d of SCP_LIST) {
      const k = csv.get(d.code)!;
      expect(d.kind, d.code).toBe(k.d ? 'diagnostic' : k.f ? 'form' : 'rhythm');
    }
    // the statements whose likelihood 0 means "used as a form statement" (rule 2)
    const both = [...csv].filter(([, k]) => k.d && k.f).map(([c]) => c);
    expect(both.sort()).toEqual([...DIAGNOSTIC_AND_FORM].sort());
  });

  it('covers every code present in the shipped meta', () => {
    for (const r of rawMeta.records) for (const code of Object.keys(r.codes)) expect(SCP[code], `${r.id}: ${code}`).toBeDefined();
    // and every teaching class
    for (const r of rawMeta.records) expect(SCP[r.cls], r.cls).toBeDefined();
  });

  it('names every statement in zh, en and es', () => {
    for (const d of SCP_LIST) {
      for (const lang of ['zh', 'en', 'es'] as const) expect(d.name[lang].trim().length, `${d.code} ${lang}`).toBeGreaterThan(1);
      expect(d.name.zh).toMatch(/[一-鿿]/);
      expect(d.name.es).not.toBe(d.name.en);
    }
    // Spain usage in the Spanish names
    expect(SCP['CLBBB'].name.es).toContain('rama');
    expect(SCP['LAO/LAE'].name.es).toContain('auricular');
    expect(SCP['LAFB'].name.es).toBe('Hemibloqueo anterior izquierdo');
  });

  it('only references valid finding ids', () => {
    for (const d of SCP_LIST) {
      for (const id of [...d.findings, ...d.related, ...(d.mi?.acute ?? []), ...(d.mi?.old ?? [])]) {
        expect(isFindingId(id), `${d.code}: ${id}`).toBe(true);
      }
    }
  });

  it('maps the core rhythm and form statements', () => {
    const one = (code: string, p = 0) => mapScpToFindings({ [code]: p }, null);
    expect(one('SR')).toEqual(['sinus-rhythm']);
    expect(one('AFIB')).toEqual(['atrial-fibrillation']);
    expect(one('AFLT', 100)).toEqual(['atrial-flutter']);
    expect(one('PACE', 100)).toEqual(['paced-rhythm']);
    expect(one('SBRAD')).toEqual(['sinus-bradycardia']);
    expect(one('STACH')).toEqual(['sinus-tachycardia']);
    expect(one('SARRH')).toEqual(['sinus-arrhythmia']);
    expect(one('LVOLT')).toEqual(['low-voltage']);
    expect(one('PVC')).toEqual(['pvc']);
    expect(one('PAC')).toEqual(['pac']);
    expect(one('LPR')).toEqual(['av-block-1']);
    expect(one('CLBBB', 100)).toEqual(['lbbb']);
    expect(one('CRBBB', 100)).toEqual(['rbbb']);
    expect(one('3AVB', 100)).toEqual(['av-block-3']);
    expect(one('WPW', 100)).toEqual(['wpw']);
    expect(one('NORM', 100)).toEqual(['normal-ecg']);
  });

  it('leaves statements broader than any finding unmapped', () => {
    for (const code of ['2AVB', 'ABQRS', 'PRC(S)', 'QWAVE', 'VCLVH', 'HVOLT', 'SEHYP', 'EL', 'SVARR', 'TRIGU', 'STE_', 'INVT']) {
      expect(mapScpToFindings({ [code]: code === '2AVB' || code === 'SEHYP' || code === 'EL' ? 100 : 0 }, null), code).toEqual([]);
    }
  });
});

describe('likelihood (rule 2)', () => {
  it('counts diagnostic statements at ≥ 80 % or 0 (not stated); form and rhythm always', () => {
    expect(isConfident('LVH', 100)).toBe(true);
    expect(isConfident('LVH', 80)).toBe(true);
    expect(isConfident('LVH', 50)).toBe(false);
    expect(isConfident('ASMI', 15)).toBe(false);
    expect(isConfident('NDT', 0)).toBe(true);
    expect(isConfident('NST_', 0)).toBe(true);
    // a purely diagnostic statement without a stated likelihood is not a confident label
    expect(isConfident('LVH', 0)).toBe(false);
    expect(isConfident('IMI', 0)).toBe(false);
    expect(isConfident('PVC', 0)).toBe(true);
    expect(isConfident('AFIB', 100)).toBe(true);
    expect(isConfident('NOPE', 100)).toBe(false);
    expect(mapScpToFindings({ LVH: 50, SR: 0 }, null)).toEqual(['sinus-rhythm']);
    expect(confidentCodes({ ASMI: 15, IRBBB: 100, SR: 0 }).sort()).toEqual(['IRBBB', 'SR']);
  });

  it('sees likelihood 0 on diagnostic statements only where it means "form statement" in the shipped data', () => {
    for (const r of rawMeta.records) {
      for (const [code, p] of Object.entries(r.codes)) {
        if (SCP[code]?.kind === 'diagnostic' && p === 0) expect(DIAGNOSTIC_AND_FORM.has(code), `record ${r.id}: ${code}`).toBe(true);
      }
    }
  });

  it('reads likelihoods as words', () => {
    expect(likelihoodWord(0)).toBeNull();
    expect(likelihoodWord(15)).toBe('unlikely');
    expect(likelihoodWord(35)).toBe('possible');
    expect(likelihoodWord(50)).toBe('possible');
    expect(likelihoodWord(80)).toBe('probable');
    expect(likelihoodWord(100)).toBe('definite');
  });
});

describe('infarction statements (rule 4)', () => {
  it('classifies the PTB-XL stadium', () => {
    expect(infarctAge('Stadium I')).toBe('acute');
    expect(infarctAge('Stadium I-II')).toBe('acute');
    expect(infarctAge('Stadium II')).toBe('evolving');
    expect(infarctAge('Stadium II-III')).toBe('old');
    expect(infarctAge('Stadium III')).toBe('old');
    expect(infarctAge('unknown')).toBe('unknown');
    expect(infarctAge(null)).toBe('unknown');
  });

  it('maps acute, old and undetermined infarcts differently', () => {
    expect(mapScpToFindings({ IMI: 100 }, 'Stadium I')).toEqual(['stemi-inferior']);
    expect(mapScpToFindings({ IMI: 100 }, 'Stadium III')).toEqual(['pathological-q', 'old-mi-inferior']);
    expect(mapScpToFindings({ IMI: 100 }, 'Stadium II')).toEqual(['pathological-q']);
    expect(mapScpToFindings({ IMI: 100 }, 'unknown')).toEqual(['pathological-q']);
    expect(mapScpToFindings({ IMI: 100 }, null)).toEqual(['pathological-q']);
    expect(mapScpToFindings({ ALMI: 100 }, 'Stadium II-III')).toEqual(['pathological-q', 'old-mi-anterior', 'old-mi-lateral']);
    expect(mapScpToFindings({ IPMI: 100 }, 'Stadium I')).toEqual(['stemi-inferior', 'stemi-posterior']);
    // posterior-only MI has no Q waves in the 12 standard leads
    expect(mapScpToFindings({ PMI: 100 }, 'unknown')).toEqual([]);
    expect(mapScpToFindings({ PMI: 100 }, 'Stadium I')).toEqual(['stemi-posterior']);
  });

  it('never claims an acute STEMI or an old MI unless the stadium says so', () => {
    for (const r of rawMeta.records) {
      const f = mapScpToFindings(r.codes, r.infarctionStadium);
      const age = infarctAge(r.infarctionStadium);
      const stemi = f.filter((id) => id.startsWith('stemi-'));
      const old = f.filter((id) => id.startsWith('old-mi-'));
      if (age !== 'acute') expect(stemi, `record ${r.id}`).toEqual([]);
      if (age !== 'old') expect(old, `record ${r.id}`).toEqual([]);
    }
  });
});

describe('normal ECG (rule 8)', () => {
  it('keeps "normal ECG" only beside sinus rhythm', () => {
    expect(mapScpToFindings({ NORM: 100, SR: 0 }, null)).toEqual(['normal-ecg', 'sinus-rhythm']);
    expect(mapScpToFindings({ NORM: 100, SBRAD: 0 }, null)).toEqual(['normal-ecg', 'sinus-bradycardia']);
    expect(mapScpToFindings({ NORM: 100, SARRH: 0 }, null)).toEqual(['normal-ecg', 'sinus-arrhythmia']);
    expect(mapScpToFindings({ NORM: 100, SR: 0, LPR: 0 }, null)).toEqual(['sinus-rhythm', 'av-block-1']);
    expect(mapScpToFindings({ NORM: 100, SR: 0, PAC: 0 }, null)).toEqual(['sinus-rhythm', 'pac']);
    expect(mapScpToFindings({ NORM: 100, SR: 0, LVOLT: 0 }, null)).toEqual(['sinus-rhythm', 'low-voltage']);
    expect(mapScpToFindings({ NORM: 100, SR: 0, NST_: 0 }, null)).toEqual(['sinus-rhythm', 'nonspecific-st-t']);
    // statements that map to nothing do not undo it
    expect(mapScpToFindings({ NORM: 100, SR: 0, ABQRS: 0 }, null)).toEqual(['normal-ecg', 'sinus-rhythm']);
  });

  it('files a superseded NORM under the category of the other findings only', () => {
    expect(categoriesOf({ NORM: 100, SR: 0, LPR: 0 }, 'LPR')).toEqual(['conduction']);
    expect(categoriesOf({ NORM: 100, SR: 0 }, 'NORM')).toEqual(['normal']);
  });

  it('marks a superseded NORM on the reveal', () => {
    const s = caseStatements({ NORM: 100, SR: 0, LPR: 0 }, null);
    expect(s.find((x) => x.code === 'NORM')).toMatchObject({ counted: true, superseded: true, findings: [] });
    expect(s.find((x) => x.code === 'LPR')).toMatchObject({ superseded: false, findings: ['av-block-1'] });
    expect(caseStatements({ NORM: 100, SR: 0 }, null).find((x) => x.code === 'NORM')!.superseded).toBe(false);
  });

  it('uses only normal tracings as "normal ECG" examples in the shipped library', () => {
    const ok = new Set<FindingId>(['normal-ecg', 'sinus-rhythm', 'sinus-bradycardia', 'sinus-tachycardia', 'sinus-arrhythmia']);
    let n = 0;
    for (const r of rawMeta.records) {
      const f = mapScpToFindings(r.codes, r.infarctionStadium);
      if (!f.includes('normal-ecg')) continue;
      n++;
      for (const id of f) expect(ok.has(id), `record ${r.id}: ${id}`).toBe(true);
    }
    expect(n).toBeGreaterThanOrEqual(30);
  });
});

describe('context rules (5, 7)', () => {
  it('makes ST depression and T inversion ischaemic only with an ischaemic territory statement', () => {
    expect(mapScpToFindings({ STD_: 0 }, null)).toEqual(['nonspecific-st-t']);
    expect(mapScpToFindings({ STD_: 0, ISCAL: 100 }, null)).toEqual(['st-depression-ischemic']);
    expect(mapScpToFindings({ STD_: 0, INJIN: 100 }, null)).toEqual(['st-depression-ischemic']);
    expect(mapScpToFindings({ INVT: 0 }, null)).toEqual([]);
    expect(mapScpToFindings({ INVT: 0, ISC_: 100 }, null)).toEqual(['t-inversion-ischemic']);
    // an ischaemic statement below 80 % does not make the morphology ischaemic
    expect(mapScpToFindings({ STD_: 0, ISCAL: 50 }, null)).toEqual(['nonspecific-st-t']);
  });

  it('calls bigeminy ventricular only when PVCs (and no PACs) are labelled', () => {
    expect(mapScpToFindings({ BIGU: 0, PVC: 100 }, null)).toEqual(['pvc', 'ventricular-bigeminy']);
    expect(mapScpToFindings({ BIGU: 0 }, null)).toEqual([]);
    expect(mapScpToFindings({ BIGU: 0, PVC: 100, PAC: 0 }, null)).toEqual(['pac', 'pvc']);
  });

  it('attributes every mapped finding to the statement that produced it', () => {
    const m = scpContributions({ ASMI: 100, INJLA: 100, QWAVE: 0, INVT: 0, STD_: 0, SR: 0 }, 'unknown');
    expect(m.get('ASMI')).toEqual(['pathological-q']);
    expect(m.get('STD_')).toEqual(['st-depression-ischemic']);
    expect(m.get('INVT')).toEqual(['t-inversion-ischemic']);
    expect(m.get('SR')).toEqual(['sinus-rhythm']);
    expect(m.has('QWAVE')).toBe(false);
    expect(m.has('INJLA')).toBe(false);
  });
});

describe('compatible findings (rule 11)', () => {
  it('allows the morphology behind an ischaemic territory statement that names none', () => {
    expect(compatibleFindings({ ISCAL: 100, SR: 0 }, null)).toEqual(['st-depression-ischemic', 't-inversion-ischemic']);
    // once STD_ makes the depression explicit it is asserted, not merely allowed
    expect(compatibleFindings({ INJIN: 100, STD_: 0, SR: 0 }, null)).toEqual(['t-inversion-ischemic']);
    // INVT made ischaemic by the territory statement: a secondary or non-specific reading contradicts it
    expect(compatibleFindings({ ISCAL: 100, INVT: 0, SR: 0 }, null)).toEqual(['st-depression-ischemic']);
    // INVT alone is descriptive: any reading of the inversion is consistent with it
    expect(compatibleFindings({ INVT: 0, SR: 0 }, null)).toEqual(['t-inversion-ischemic', 'nonspecific-st-t', 'secondary-st-t']);
  });

  it('allows both ages of an infarct of undetermined stage, and only the stated age otherwise', () => {
    expect(compatibleFindings({ IMI: 100 }, 'unknown')).toEqual(['stemi-inferior', 'old-mi-inferior']);
    expect(compatibleFindings({ IMI: 100 }, null)).toEqual(['stemi-inferior', 'old-mi-inferior']);
    expect(compatibleFindings({ IMI: 100 }, 'Stadium II')).toEqual(['stemi-inferior', 'old-mi-inferior']);
    expect(compatibleFindings({ IMI: 100 }, 'Stadium III')).toEqual([]);
    expect(compatibleFindings({ IMI: 100 }, 'Stadium I')).toEqual([]);
    expect(compatibleFindings({ PMI: 100 }, 'unknown')).toEqual(['stemi-posterior']);
    expect(compatibleFindings({ PMI: 100 }, 'Stadium III')).toEqual([]);
  });

  it('allows the specific type behind a broad statement', () => {
    expect(compatibleFindings({ '2AVB': 100 }, null)).toEqual(['av-block-2-mobitz1', 'av-block-2-mobitz2', 'av-block-2-2to1', 'av-block-high-grade']);
    expect(compatibleFindings({ PSVT: 100, SVTAC: 0 }, null)).toEqual(['atrial-tachycardia', 'avnrt', 'avrt']);
    expect(compatibleFindings({ BIGU: 0, PVC: 100, PAC: 0 }, null)).toEqual(['ventricular-bigeminy']);
    expect(compatibleFindings({ BIGU: 0, PVC: 100 }, null)).toEqual([]); // already asserted (rule 7)
    expect(compatibleFindings({ VCLVH: 0, SR: 0 }, null)).toEqual(['lvh']);
  });

  it('lets a "possible" diagnostic statement allow what it would map to, but not an "unlikely" one', () => {
    expect(compatibleFindings({ LVH: 50, SR: 0 }, null)).toEqual(['lvh']);
    expect(compatibleFindings({ LVH: 15, SR: 0 }, null)).toEqual([]);
  });

  it('allows "LVH with strain" only beside a labelled ST–T change', () => {
    expect(compatibleFindings({ LVH: 100, SR: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ LVH: 100, STD_: 0, SR: 0 }, null)).toEqual(['lvh-strain']);
    expect(compatibleFindings({ LVH: 100, ISCAL: 100, SR: 0 }, null)).toEqual(['lvh-strain', 'st-depression-ischemic', 't-inversion-ischemic']);
  });

  it('never allows differentials or anything on a normal tracing', () => {
    expect(compatibleFindings({ NORM: 100, SR: 0 }, null)).toEqual([]);
    // a superseded NORM (rule 8): calling the tracing normal stays "not in the labels"
    expect(compatibleFindings({ NORM: 100, SR: 0, LPR: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ NORM: 100, SR: 0, PAC: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ LVOLT: 0, SR: 0 }, null)).not.toContain('pericardial-effusion');
    expect(compatibleFindings({ STE_: 0, SR: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ CLBBB: 100 }, null)).toEqual([]);
    // "non-specific" ST depression never allows an ischaemic reading (e.g. the scooped ST of digitalis)
    expect(compatibleFindings({ DIG: 100, STD_: 0, AFIB: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ NST_: 100, STD_: 0, SR: 0 }, null)).toEqual([]);
    // voltage or Q waves on a tracing labelled normal: not LVH, not infarct Q waves
    expect(compatibleFindings({ NORM: 100, QWAVE: 0, SR: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ NORM: 100, HVOLT: 0, SR: 0 }, null)).toEqual([]);
    expect(compatibleFindings({ NDT: 100, QWAVE: 0, SR: 0 }, null)).toEqual(['pathological-q']);
  });

  it('only names valid findings and never repeats a mapped one, in every shipped record', () => {
    for (const code of Object.keys(COMPATIBLE)) expect(SCP[code], code).toBeDefined();
    for (const ids of Object.values(COMPATIBLE)) for (const id of ids) expect(isFindingId(id), id).toBe(true);
    let some = 0;
    for (const r of rawMeta.records) {
      const mapped = new Set(mapScpToFindings(r.codes, r.infarctionStadium));
      const allowed = compatibleFindings(r.codes, r.infarctionStadium);
      expect(new Set(allowed).size, `record ${r.id}`).toBe(allowed.length);
      expect(sorted(allowed), `record ${r.id}`).toBe(true);
      for (const id of allowed) expect(mapped.has(id), `record ${r.id}: ${id}`).toBe(false);
      if (allowed.length > 0) some++;
    }
    expect(some).toBeGreaterThan(30);
  });
});

describe('mapping of every shipped record', () => {
  it('produces only valid, unique finding ids in taxonomy order', () => {
    for (const r of rawMeta.records) {
      const f = mapScpToFindings(r.codes, r.infarctionStadium);
      for (const id of f) expect(isFindingId(id), `${r.id}: ${id}`).toBe(true);
      expect(new Set(f).size).toBe(f.length);
      expect(sorted(f), `${r.id}: ${f.join(',')}`).toBe(true);
      const rel = relatedFindings(r.codes, f);
      for (const id of rel) {
        expect(isFindingId(id)).toBe(true);
        expect(f).not.toContain(id);
      }
    }
  });

  it('maps most records to at least one finding, and the classic teaching classes always', () => {
    const empty = rawMeta.records.filter((r) => mapScpToFindings(r.codes, r.infarctionStadium).length === 0);
    expect(empty.length).toBeLessThan(10);
    const must: Record<string, FindingId> = {
      NORM: 'normal-ecg',
      AFIB: 'atrial-fibrillation',
      AFLT: 'atrial-flutter',
      CLBBB: 'lbbb',
      CRBBB: 'rbbb',
      '1AVB': 'av-block-1',
      '3AVB': 'av-block-3',
      WPW: 'wpw',
      PACE: 'paced-rhythm',
      LAFB: 'lafb',
      LPFB: 'lpfb',
      LVH: 'lvh',
      RVH: 'rvh',
      LNGQT: 'long-qt',
      DIG: 'digoxin-effect',
    };
    for (const r of rawMeta.records) {
      const want = must[r.cls];
      if (want) expect(mapScpToFindings(r.codes, r.infarctionStadium), `record ${r.id} (${r.cls})`).toContain(want);
    }
  });

  it('files every record under the category of its teaching class', () => {
    for (const r of rawMeta.records) {
      const cats = categoriesOf(r.codes, r.cls);
      expect(cats.length).toBeGreaterThan(0);
      for (const c of cats) expect(CASE_CATEGORIES).toContain(c);
      const primary = SCP[r.cls].category;
      if (primary) expect(cats, `record ${r.id}`).toContain(primary);
    }
  });

  it('does not file a case under a category on an unmapped descriptive statement alone', () => {
    // a normal ECG with septal Q waves is not an infarction case
    expect(categoriesOf({ NORM: 100, QWAVE: 0, SR: 0 }, 'NORM')).toEqual(['normal']);
    // …unless that statement is the teaching class
    expect(categoriesOf({ NORM: 100, QWAVE: 0, SR: 0 }, 'QWAVE')).toEqual(['normal', 'infarction']);
    // diagnostic statements file a case even without a finding
    expect(categoriesOf({ ISCIN: 100 }, 'ISCIN')).toEqual(['ischemia']);
    expect(categoriesOf({}, undefined)).toEqual(['other']);
  });
});

describe('caseStatements (reveal order)', () => {
  it('lists diagnostic statements first (most likely first), then form, then rhythm', () => {
    const s = caseStatements({ SR: 0, STD_: 0, ASMI: 15, IRBBB: 100, '3AVB': 80 }, 'unknown');
    expect(s.map((x) => x.code)).toEqual(['IRBBB', '3AVB', 'ASMI', 'STD_', 'SR']);
    expect(s.find((x) => x.code === 'ASMI')!.counted).toBe(false);
    expect(s.find((x) => x.code === 'ASMI')!.findings).toEqual([]);
    expect(s.find((x) => x.code === 'IRBBB')!.findings).toEqual(['irbbb']);
    expect(s.find((x) => x.code === 'STD_')!.findings).toEqual(['nonspecific-st-t']);
  });

  it('keeps unknown codes visible instead of dropping them', () => {
    const s = caseStatements({ XYZ: 0, SR: 0 }, null);
    expect(s.map((x) => x.code)).toEqual(['SR', 'XYZ']);
    expect(s[1].def).toBeNull();
    expect(s[1].counted).toBe(false);
  });

  it('covers every statement of every shipped record with findings summing to the record mapping', () => {
    for (const r of rawMeta.records) {
      const s = caseStatements(r.codes, r.infarctionStadium);
      expect(s).toHaveLength(Object.keys(r.codes).length);
      const union = new Set(s.flatMap((x) => x.findings));
      expect([...union].sort()).toEqual([...mapScpToFindings(r.codes, r.infarctionStadium)].sort());
      for (const x of s) expect(x.def, x.code).not.toBeNull();
    }
  });
});

describe('likelihood 0 on rhythm statements (review 2026-10-29, item C13)', () => {
  // PTB-XL convention (Wagner et al., Sci Data 2020; scp_statements.csv): likelihoods 15–100 are graded only for
  // diagnostic statements; rhythm and form statements carry 0 ("no likelihood given"), e.g. SR is 0 in every record and
  // AFIB is 0 in ~97 % of AF records. 0 on a rhythm statement therefore means "present", not "unconfirmed".
  it('AFIB: 0 is a stated rhythm (rhythm statement, not diagnostic) and maps to atrial fibrillation', () => {
    expect(SCP.AFIB?.kind).toBe('rhythm');
    expect(isConfident('AFIB', 0)).toBe(true);
    expect(isConfident('SR', 0)).toBe(true);
    expect(mapScpToFindings({ AFIB: 0 }, null)).toEqual(['atrial-fibrillation']);
  });

  it('case 18159 (report: "atrial fibrillation", no P wave found by 12SL) stays atrial fibrillation', () => {
    const r = rawMeta.records.find((x) => x.id === 18159);
    if (!r) return; // not in the shipped selection
    expect(r.codes).toEqual({ INJIN: 100, NT_: 0, AFIB: 0 });
    expect(mapScpToFindings(r.codes, r.infarctionStadium)).toContain('atrial-fibrillation');
    expect(r.ref.prMs).toBeNull();
  });

  it('a purely diagnostic statement at likelihood 0 is still not mapped', () => {
    expect(mapScpToFindings({ IMI: 0, LVH: 0, SR: 0 }, 'Stadium I')).toEqual(['sinus-rhythm']);
  });

  it('in scp_statements.csv, AFIB / SR are rhythm-only statements (skipped without data-raw)', (ctx) => {
    if (!existsSync(CSV)) ctx.skip();
    const k = csvKinds();
    expect(k.get('AFIB')).toEqual({ d: false, f: false, r: true });
    expect(k.get('SR')).toEqual({ d: false, f: false, r: true });
  });
});
