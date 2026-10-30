/**
 * Structural validation of a decision tree: the root and every option target exist, the graph is acyclic, every node
 * is reachable from the root, questions offer at least two answers, and every text has zh / en / es.
 */
import { LANGS, type L10n } from '../../core/l10n';
import type { DecisionTree } from './types';

function missingLangs(t: L10n | undefined, where: string, out: string[]): void {
  if (!t) return;
  for (const lang of LANGS) if (!t[lang] || !t[lang].trim()) out.push(`${where}: missing ${lang}`);
}

export function validateTree(tree: DecisionTree): string[] {
  const errors: string[] = [];
  const ids = Object.keys(tree.nodes);
  if (!tree.nodes[tree.root]) errors.push(`root "${tree.root}" does not exist`);
  missingLangs(tree.title, 'title', errors);
  missingLangs(tree.intro, 'intro', errors);
  if (!tree.sources.length) errors.push('no sources cited');

  for (const id of ids) {
    const n = tree.nodes[id];
    if (n.kind === 'question') {
      missingLangs(n.text, `${id}.text`, errors);
      missingLangs(n.help, `${id}.help`, errors);
      if (n.options.length < 2) errors.push(`${id}: a question needs at least two options`);
      n.options.forEach((o, i) => {
        missingLangs(o.label, `${id}.options[${i}]`, errors);
        if (!tree.nodes[o.next]) errors.push(`${id}.options[${i}] → unknown node "${o.next}"`);
        if (o.next === id) errors.push(`${id}.options[${i}] points to itself`);
      });
    } else {
      missingLangs(n.title, `${id}.title`, errors);
      missingLangs(n.text, `${id}.text`, errors);
    }
  }

  // cycle detection (iterative DFS with colours) and reachability
  const colour = new Map<string, 0 | 1 | 2>();
  const visit = (start: string) => {
    const stack: Array<{ id: string; i: number }> = [{ id: start, i: 0 }];
    colour.set(start, 1);
    while (stack.length) {
      const top = stack[stack.length - 1];
      const node = tree.nodes[top.id];
      const nexts = node && node.kind === 'question' ? node.options.map((o) => o.next).filter((x) => tree.nodes[x]) : [];
      if (top.i < nexts.length) {
        const nx = nexts[top.i++];
        const c = colour.get(nx) ?? 0;
        if (c === 1) errors.push(`cycle through "${nx}"`);
        else if (c === 0) {
          colour.set(nx, 1);
          stack.push({ id: nx, i: 0 });
        }
      } else {
        colour.set(top.id, 2);
        stack.pop();
      }
    }
  };
  if (tree.nodes[tree.root]) visit(tree.root);
  for (const id of ids) if (!colour.has(id)) errors.push(`node "${id}" is unreachable from the root`);
  return errors;
}

/** Ids of all leaves reachable from the root. */
export function leavesOf(tree: DecisionTree): string[] {
  return Object.keys(tree.nodes).filter((id) => tree.nodes[id].kind === 'leaf');
}

/** Longest root-to-leaf path length (number of questions answered). */
export function depthOf(tree: DecisionTree): number {
  const memo = new Map<string, number>();
  const d = (id: string): number => {
    const m = memo.get(id);
    if (m != null) return m;
    const n = tree.nodes[id];
    const v = !n || n.kind === 'leaf' ? 0 : 1 + Math.max(...n.options.map((o) => d(o.next)));
    memo.set(id, v);
    return v;
  };
  return d(tree.root);
}
