import { describe, expect, it } from 'vitest';
import { FINDINGS } from '../../src/core/findings';
import { LANGS } from '../../src/core/l10n';
import { depthOf, leavesOf, TREE_IDS, TREES, validateTree, type DecisionTree } from '../../src/figures/trees/index';

describe('decision trees', () => {
  it('covers every tree id of the figure contract', () => {
    expect(TREE_IDS.sort()).toEqual(['brady-av-block', 'bundle-branch', 'narrow-tachy', 'st-elevation', 'wide-tachy']);
    for (const id of TREE_IDS) expect(TREES[id].id).toBe(id);
  });

  for (const id of TREE_IDS) {
    describe(id, () => {
      const tree = TREES[id];

      it('is a valid DAG: root and targets exist, no cycles, every node reachable', () => {
        expect(validateTree(tree)).toEqual([]);
      });

      it('every leaf has a title and an explanation in zh / en / es', () => {
        const leaves = leavesOf(tree);
        expect(leaves.length).toBeGreaterThanOrEqual(4);
        for (const leafId of leaves) {
          const n = tree.nodes[leafId];
          if (n.kind !== 'leaf') throw new Error('not a leaf');
          for (const lang of LANGS) {
            expect(n.title[lang].trim().length, `${leafId}.title.${lang}`).toBeGreaterThan(0);
            expect(n.text[lang].trim().length, `${leafId}.text.${lang}`).toBeGreaterThan(20);
          }
          for (const f of n.findings ?? []) expect(FINDINGS[f], `${leafId} finding ${f}`).toBeDefined();
        }
      });

      it('is reasonably shallow and branches at every question', () => {
        expect(depthOf(tree)).toBeGreaterThanOrEqual(2);
        expect(depthOf(tree)).toBeLessThanOrEqual(8);
      });

      it('uses Spanish (Spain) terminology, not Latin-American variants', () => {
        const es: string[] = [tree.title.es, tree.intro.es];
        for (const n of Object.values(tree.nodes)) {
          if (n.kind === 'leaf') es.push(n.title.es, n.text.es);
          else es.push(n.text.es, n.help?.es ?? '', ...n.options.map((o) => o.label.es));
        }
        // "derivación" (not "derivada"), "aurícula/auricular" (not "atrio/atrial"), "bloqueo de rama" (not "de ramo")
        const bad = es.filter((s) => /\bderivadas?\b|\batri(o|os|al|ales)\b|bloqueo de ramo/i.test(s));
        expect(bad).toEqual([]);
      });
    });
  }

  it('bundle-branch: a fascicular block with QRS 110–119 ms is reachable (not forced into IVCD)', () => {
    const tree = TREES['bundle-branch'];
    const reach = (from: string): Set<string> => {
      const seen = new Set<string>();
      const stack = [from];
      while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        const n = tree.nodes[id];
        if (n.kind === 'question') for (const o of n.options) stack.push(o.next);
      }
      return seen;
    };
    const width = tree.nodes.width;
    if (width.kind !== 'question') throw new Error('width is a question');
    const inc = width.options.find((o) => o.label.en.startsWith('110'))!.next;
    const fromInc = reach(inc);
    expect(fromInc.has('lafb')).toBe(true);
    expect(fromInc.has('lpfb')).toBe(true);
    expect(fromInc.has('ivcd')).toBe(true);
  });

  it('st-elevation: the early-repolarization leaf follows the cited definition (inferior/lateral, V1–V3 excluded)', () => {
    const leaf = TREES['st-elevation'].nodes.earlyRepol;
    if (leaf.kind !== 'leaf') throw new Error('earlyRepol is a leaf');
    for (const lang of LANGS) expect(leaf.text[lang]).toContain('V1–V3');
  });

  it('the validator catches cycles, dangling targets and missing translations', () => {
    const bad: DecisionTree = {
      id: 'narrow-tachy',
      title: { zh: '测试', en: 'Test', es: 'Prueba' },
      intro: { zh: '介绍', en: 'Intro', es: '' },
      root: 'a',
      sources: ['x'],
      nodes: {
        a: { kind: 'question', text: { zh: 'a', en: 'a', es: 'a' }, options: [{ label: { zh: '1', en: '1', es: '1' }, next: 'b' }, { label: { zh: '2', en: '2', es: '2' }, next: 'zz' }] },
        b: { kind: 'question', text: { zh: 'b', en: 'b', es: 'b' }, options: [{ label: { zh: '1', en: '1', es: '1' }, next: 'a' }, { label: { zh: '2', en: '2', es: '2' }, next: 'c' }] },
        c: { kind: 'leaf', tone: 'minor', title: { zh: 'c', en: 'c', es: 'c' }, text: { zh: 'c', en: 'c', es: 'c' } },
        orphan: { kind: 'leaf', tone: 'minor', title: { zh: 'o', en: 'o', es: 'o' }, text: { zh: 'o', en: 'o', es: 'o' } },
      },
    };
    const errs = validateTree(bad);
    expect(errs.some((e) => e.includes('cycle'))).toBe(true);
    expect(errs.some((e) => e.includes('"zz"'))).toBe(true);
    expect(errs.some((e) => e.includes('intro: missing es'))).toBe(true);
    expect(errs.some((e) => e.includes('"orphan" is unreachable'))).toBe(true);
  });
});
