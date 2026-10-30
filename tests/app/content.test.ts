import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LANGS, type L10n } from '../../src/core/l10n';
import { ABOUT, CITATIONS, LINKS, STAGE_IDS, STAGES } from '../../src/app/content';
import { tsh } from '../../src/i18n/shell';

const filled = (t: L10n) => LANGS.every((l) => t[l].trim().length > 0);

describe('learning-path overview', () => {
  it('lists the eight stages of docs/PLAN.md §3, in order', () => {
    const plan = readFileSync(fileURLToPath(new URL('../../docs/PLAN.md', import.meta.url)), 'utf8');
    const s3 = plan.slice(plan.indexOf('## 3.'), plan.indexOf('## 4.'));
    const planIds = [...s3.matchAll(/^\| \*\*([A-Z])\*\* /gm)].map((m) => m[1]);
    expect(planIds).toEqual([...STAGE_IDS]);
    expect(STAGES.map((s) => s.id)).toEqual([...STAGE_IDS]);
  });

  it('numbers the stages 1 … 8, as the "eight stages" lead promises', () => {
    expect(STAGES.map((s) => s.n)).toEqual(STAGE_IDS.map((_, i) => i + 1));
    expect(tsh.in('en', 'stageLabel', { n: STAGES[0].n })).toBe('Stage 1');
    expect(tsh.in('es', 'stageLabel', { n: STAGES[STAGES.length - 1].n })).toBe('Etapa 8');
    expect(tsh.in('en', 'pathLead')).toMatch(/^Eight stages/);
  });

  it('every stage has a name and a description in zh / en / es', () => {
    for (const s of STAGES) {
      expect(filled(s.name)).toBe(true);
      expect(filled(s.desc)).toBe(true);
      expect(s.desc.zh).toMatch(/[一-鿿]/);
    }
  });

  it('spanish uses Spain terminology (derivación, hemibloqueo, bloqueo de rama)', () => {
    const es = STAGES.map((s) => `${s.name.es} ${s.desc.es}`).join(' ');
    expect(es).toMatch(/derivaci/);
    expect(es).toMatch(/hemibloqueo/);
    expect(es).toMatch(/bloqueos? de rama/);
  });

  it('uses the modern terms of PLAN §3 and the shared finding names (src/core/findings.ts)', () => {
    const h = STAGES.find((s) => s.id === 'H');
    const x = STAGES.find((s) => s.id === 'X');
    if (!h || !x) throw new Error('stages H and X must exist');
    // "atrial abnormality", not "enlargement" (curriculum critic; findings: "Anomalía auricular …")
    expect(h.desc.en).toMatch(/Atrial abnormality/);
    expect(h.desc.es).toMatch(/Anomalía auricular/);
    expect(h.desc.es).not.toMatch(/crecimiento auricular/i);
    expect(h.desc.zh).toContain('心房异常');
    // a pattern is 图形 in the shared taxonomy ("Brugada 1型图形")
    expect(h.desc.zh).toContain('Brugada 图形');
    // triage (Spain: "triaje"), not screening ("cribado")
    expect(x.desc.es).toMatch(/triaje/);
    expect(x.desc.es).not.toMatch(/cribado/);
    expect(tsh.in('es', 'homeLead')).not.toMatch(/crecimientos/);
  });
});

describe('about page content', () => {
  it('every paragraph exists in zh / en / es', () => {
    for (const t of Object.values(ABOUT)) expect(filled(t)).toBe(true);
  });

  it('cites the textbook as a curriculum reference and credits the data and the model', () => {
    expect(CITATIONS.book).toContain('Castellano C, Pérez de Juan MA, Attie F');
    expect(CITATIONS.book).toContain('Elsevier; 2004');
    expect(CITATIONS.book).toContain('2.ª ed.');
    expect(CITATIONS.ptbxl).toMatch(/Wagner P.*Sci Data\. 2020/);
    expect(CITATIONS.ptbxlPlus).toMatch(/Strodthoff N.*Sci Data\. 2023/);
    expect(CITATIONS.hra).toMatch(/Heart, Male.*v1\.3/);
    expect(ABOUT.dataLicence.en).toContain('CC BY 4.0');
    expect(ABOUT.book.en).toMatch(/reference only/);
  });

  it('describes the one-source rule and the disclaimer', () => {
    expect(ABOUT.synth.en).toMatch(/one cardiac source/);
    expect(ABOUT.synth.en).toMatch(/Einthoven/);
    expect(ABOUT.synth.en).toMatch(/Wilson/);
    expect(ABOUT.disclaimer.en).toMatch(/education only/);
  });

  it('links are https', () => {
    for (const u of Object.values(LINKS)) expect(u).toMatch(/^https:\/\//);
  });
});
