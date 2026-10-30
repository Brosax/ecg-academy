/**
 * Tools content: the checklist follows the structured reading order (quality first, never-miss screen before the
 * summary, computer statement last); normal values carry sources and the current, sex-specific thresholds; every text
 * has zh / en / es; Spanish decimals use a comma.
 */
import { describe, expect, it } from 'vitest';
import { LANGS, type L10n } from '../../src/core/l10n';
import { LESSON_IDS } from '../../src/atlas/schema';
import { CHECKLIST, STEP_IDS } from '../../src/tools/checklist';
import { ADULT_NORMALS, NORMALS_SOURCES, PAEDIATRIC_NOTES, QTC_BY_SEX, ST_THRESHOLDS } from '../../src/tools/normals';
import { toolTab, TOOL_TABS } from '../../src/tools/tabs';

const filled = (t: L10n) => LANGS.every((l) => t[l].trim().length > 0);

function allTexts(): L10n[] {
  const out: L10n[] = [];
  for (const s of CHECKLIST) out.push(s.title, ...s.check, ...(s.normal ? [s.normal] : []), ...(s.flags ?? []));
  for (const r of ADULT_NORMALS) out.push(r.item, r.normal, r.abnormal);
  for (const r of QTC_BY_SEX) out.push(r.level);
  for (const r of ST_THRESHOLDS) out.push(r.leads, r.menOld, r.menYoung, r.women);
  for (const n of PAEDIATRIC_NOTES) out.push(n.text);
  return out;
}

describe('systematic reading checklist', () => {
  it('lists the steps in the structured reading order', () => {
    expect(CHECKLIST.map((s) => s.id)).toEqual([...STEP_IDS]);
    const order = CHECKLIST.map((s) => s.id);
    expect(order[0]).toBe('quality');
    expect(order.indexOf('rate')).toBeLessThan(order.indexOf('rhythm'));
    expect(order.indexOf('pr')).toBeLessThan(order.indexOf('qrs'));
    expect(order.indexOf('qrs')).toBeLessThan(order.indexOf('qt'));
    expect(order.indexOf('qt')).toBeLessThan(order.indexOf('axis'));
    expect(order.indexOf('never-miss')).toBeLessThan(order.indexOf('summary'));
    expect(order[order.length - 1]).toBe('computer');
  });

  it('every step has something to check and links to PLAN §3 lessons', () => {
    for (const s of CHECKLIST) {
      expect(s.check.length).toBeGreaterThan(0);
      expect(s.lessons.length).toBeGreaterThan(0);
      for (const id of s.lessons) expect(LESSON_IDS as readonly string[]).toContain(id);
    }
  });
});

describe('normal values', () => {
  it('every adult row has a source', () => {
    for (const r of ADULT_NORMALS) expect([r.id, r.source.trim().length > 3]).toEqual([r.id, true]);
    expect(NORMALS_SOURCES.length).toBeGreaterThan(5);
    for (const n of PAEDIATRIC_NOTES) expect(n.source.trim().length).toBeGreaterThan(3);
  });

  it('QTc limits are sex-specific (450 men, 460 women) with the shared high-risk and short limits', () => {
    const prolonged = QTC_BY_SEX.find((r) => r.level.en === 'Prolonged');
    expect(prolonged?.men).toContain('450');
    expect(prolonged?.women).toContain('460');
    expect(QTC_BY_SEX.some((r) => r.men.includes('500') && r.women.includes('500'))).toBe(true);
    expect(QTC_BY_SEX.some((r) => r.men.includes('390'))).toBe(true);
  });

  it('ST-elevation thresholds follow UDMI 2018 by sex and age', () => {
    const v23 = ST_THRESHOLDS[0];
    expect(v23.leads.en).toBe('V2–V3');
    expect(v23.menOld.en).toContain('2 mm');
    expect(v23.menYoung.en).toContain('2.5');
    expect(v23.women.en).toContain('1.5');
    expect(v23.menYoung.es).toContain('2,5');
    const post = ST_THRESHOLDS.find((r) => r.leads.en.startsWith('V7'));
    expect(post?.menOld.en).toContain('0.5');
    expect(post?.menYoung.en).toContain('1 mm');
  });

  it('first-degree AV block in children is not > 200 ms', () => {
    const pr = PAEDIATRIC_NOTES.find((n) => n.text.en.startsWith('PR'));
    expect(pr?.text.en).toMatch(/98th centile/);
  });
});

describe('all tools content', () => {
  it('has zh / en / es everywhere, Chinese text in zh prose', () => {
    for (const t of allTexts()) expect([t.en, filled(t)]).toEqual([t.en, true]);
    for (const s of CHECKLIST) expect(s.title.zh).toMatch(/[一-鿿]/);
  });

  it('Spanish decimals use a comma', () => {
    const bad = allTexts().filter((t) => /\d\.\d/.test(t.es)).map((t) => t.es);
    expect(bad).toEqual([]);
  });
});

describe('tool tabs', () => {
  it('unknown tabs fall back to the checklist', () => {
    expect(toolTab(undefined)).toBe('checklist');
    expect(toolTab('nope')).toBe('checklist');
    for (const t of TOOL_TABS) expect(toolTab(t)).toBe(t);
  });
});
