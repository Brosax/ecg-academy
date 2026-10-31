/**
 * Every scene of the spec is registered: its id is in FIGURE_IDS / SCENE_IDS (src/figures/api.ts), <Figure id> resolves
 * to a component (src/figures/index.tsx), the stub module src/figures/scenes/<PascalId>Scene.tsx exports
 * <PascalId>Scene, and the dev harness lists the id. Components are not rendered (node environment, no DOM): a
 * figure's vnode is built by calling Figure() as a plain function, as tests/app/views.test.ts does for pages.
 */
import type { VNode } from 'preact';
import { describe, expect, it } from 'vitest';
import { FIGURE_IDS, SCENE_IDS } from '../../../src/figures/api';
import { Figure, figureComponent, type FigureId } from '../../../src/figures/index';
import { SCENE_SPECS } from './spec';

const stubModules = import.meta.glob('../../../src/figures/scenes/*Scene.tsx', { eager: true }) as Record<string, Record<string, unknown>>;
const harnessSrc = import.meta.glob('../../../src/figures/dev/harness.tsx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

describe('scene registry', () => {
  it('SCENE_IDS is exactly the spec list, in lesson order, and every id is a FigureId', () => {
    expect([...SCENE_IDS]).toEqual(SCENE_SPECS.map((s) => s.id));
    for (const id of SCENE_IDS) expect(FIGURE_IDS).toContain(id);
    expect(new Set(FIGURE_IDS).size).toBe(FIGURE_IDS.length);
  });

  it('the existing figures keep their ids (scenes were appended, nothing renamed)', () => {
    expect(FIGURE_IDS.slice(0, 14)).toEqual([
      'paper',
      'electrodes',
      'hexaxial',
      'horizontal-plane',
      'conduction',
      'laddergram',
      'action-potential',
      'dipole',
      'axis-calculator',
      'rate-ruler',
      'qtc-calculator',
      'territories',
      'decision-tree',
      'vector-loop',
    ]);
  });

  for (const spec of SCENE_SPECS) {
    it(`${spec.id}: <Figure> resolves to ${spec.pascal}Scene and the stub module exports it`, () => {
      const C = figureComponent(spec.id as FigureId);
      expect(typeof C).toBe('function');
      expect(C.name).toBe(`${spec.pascal}Scene`);
      const vnode = Figure({ id: spec.id } as never) as VNode<{ params?: unknown }>;
      expect(vnode.type).toBe(C);
      expect(String(vnode.key)).toBe(`${spec.id}:{}`);
      const path = Object.keys(stubModules).find((k) => k.endsWith(`/${spec.pascal}Scene.tsx`));
      expect(path, `src/figures/scenes/${spec.pascal}Scene.tsx exists`).toBeDefined();
      expect(stubModules[path!][`${spec.pascal}Scene`]).toBe(C);
    });
  }

  it('the stubs folder holds exactly one component module per scene', () => {
    expect(Object.keys(stubModules).length).toBe(SCENE_SPECS.length);
  });

  it('the dev harness lists every scene id once', () => {
    const src = Object.values(harnessSrc)[0];
    expect(typeof src).toBe('string');
    for (const spec of SCENE_SPECS) expect(src.split(`id: '${spec.id}'`).length - 1, spec.id).toBe(1);
  });
});
