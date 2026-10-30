/**
 * Cross-module integration checks (integrator): the shell slots are filled by the modules that own them; the atlas
 * covers every finding any module can show or link to; lessons validate against the live catalogues; Heart Lab links
 * resolve to routed lab pages; every drill family is available on the real engines; every synthetic scenario gives the
 * 3D heart region states; the real library is complete.
 *
 * Item generation of every family at every difficulty on the real synthetic engine is checked in
 * tests/practice/core/engine.test.ts; the per-route page components in tests/app/views.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { hasEntry } from '../../src/atlas';
import { homeSlots, overallProgress, progressDataSlot } from '../../src/app/slots';
import { parseHash } from '../../src/app/router';
import { FINDING_LIST, isFindingId, type FindingId } from '../../src/core/findings';
import { ContinueLessonCard, LESSONS, liveValidateDeps, validateLesson, wireCourse } from '../../src/course';
import { LAB_SCENARIOS, labHref } from '../../src/lab/links';
import { families, familyAvailable, ProgressDataControls, ReviewsDueCard, CaseReportPanel, wirePractice } from '../../src/practice';
import { caseOfTheDay, caseReadingSlot, getCase, getCases, getLibrary, SCP_LIST } from '../../src/real';
import { generate, scenarios } from '../../src/synth';

const ALL_FINDINGS = FINDING_LIST.map((f) => f.id as FindingId);

describe('shell slots', () => {
  it('course and practice fill their home, settings and case-page slots', () => {
    wireCourse();
    wirePractice();
    expect(homeSlots.continueLesson.value).toBe(ContinueLessonCard);
    expect(homeSlots.reviewsDue.value).toBe(ReviewsDueCard);
    expect(progressDataSlot.value).toBe(ProgressDataControls);
    expect(caseReadingSlot.value).toBe(CaseReportPanel);
    // a fresh learner has no mastery yet: the header shows the chart icon, not a 0 % ring
    expect(overallProgress.value).toBeNull();
  });
});

describe('atlas coverage', () => {
  it('every finding of the taxonomy has an atlas entry', () => {
    expect(ALL_FINDINGS.filter((id) => !hasEntry(id))).toEqual([]);
  });

  it('every finding another module links to opens an atlas entry (real labels, SCP map, synth, lab, lessons)', () => {
    const linked = new Set<FindingId>([
      ...getCases().flatMap((c) => c.findings),
      ...SCP_LIST.flatMap((s) => s.findings),
      ...scenarios().flatMap((s) => s.findings),
      ...(Object.keys(LAB_SCENARIOS) as FindingId[]),
      ...[...LESSONS.values()].flatMap((l) => l.findings),
    ]);
    expect([...linked].filter((id) => !isFindingId(id) || !hasEntry(id))).toEqual([]);
  });

  it('the home hero links to an existing atlas page', () => {
    expect(hasEntry('normal-ecg')).toBe(true);
  });
});

describe('lessons', () => {
  for (const lesson of LESSONS.values()) {
    it(`${lesson.id} validates against the live catalogues`, () => {
      const errors = validateLesson(lesson, liveValidateDeps(lesson.id)).filter((i) => i.level === 'error');
      expect(errors).toEqual([]);
    });
  }
});

describe('Heart Lab links', () => {
  it('every lab link opens a routed lab scenario page', () => {
    for (const f of Object.keys(LAB_SCENARIOS) as FindingId[]) {
      const h = labHref(f);
      expect(h, f).not.toBeNull();
      const r = parseHash(h!);
      expect(r.name, f).toBe('lab');
      if (r.name === 'lab') expect(r.scenario, f).toBe(LAB_SCENARIOS[f]);
    }
  });

  it('findings the lab cannot show get no link', () => {
    const none = ALL_FINDINGS.filter((f) => !(f in LAB_SCENARIOS));
    expect(none.length).toBeGreaterThan(0);
    for (const f of none) expect(labHref(f), f).toBeNull();
  });
});

describe('practice', () => {
  it('every drill family is available on the real engines', () => {
    const fams = families();
    expect(fams.length).toBeGreaterThan(0);
    expect(fams.filter((f) => !familyAvailable(f.id)).map((f) => f.id)).toEqual([]);
  });
});

describe('synthetic ECGs drive the 3D heart', () => {
  const list = scenarios();
  it('the catalogue is not empty', () => expect(list.length).toBeGreaterThan(0));
  const buf = new Float32Array(256);
  // no organised activation to show: asystole is electrically silent, VF has no wavefront the region model tracks
  const STILL = new Set(['vf', 'asystole']);
  for (const s of list) {
    const still = STILL.has(s.source.rhythm.kind);
    it(`${s.id}: region states in [0, 2]${still ? '' : ' that change over the record'}`, () => {
      const ecg = generate({ scenario: s.id, seed: 7, durationS: 4, fs: 250 }).ecg;
      const reg = ecg.regions;
      expect(reg).not.toBeNull();
      if (!reg) return;
      expect(reg.ids.length).toBeGreaterThan(0);
      const out = buf.subarray(0, reg.ids.length);
      let moved = false;
      for (let t = 0; t <= ecg.signal.durationMs; t += 20) {
        out.fill(-1);
        reg.stateAt(t, out);
        for (const v of out) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(2);
          if (v > 0) moved = true;
        }
      }
      if (!still) expect(moved).toBe(true);
    });
  }
});

describe('real library', () => {
  it('has the 300 curated cases, each reachable by its ecg_id, and a case of the day', () => {
    const lib = getLibrary();
    expect(lib.cases.length).toBe(300);
    for (const c of lib.cases) expect(getCase(c.id)?.id).toBe(c.id);
    const today = caseOfTheDay(getCases(), '2026-10-22');
    expect(getCase(today.id)).toBeDefined();
  });
});
