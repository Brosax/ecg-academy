import { describe, expect, it } from 'vitest';
import type { AppCommands } from '../../../src/lab/app/commands';
import { applyShortcut, BODY_TARGET, mapKey } from '../../../src/lab/app/ui/shortcuts';
import type { TargetInfo } from '../../../src/lab/app/ui/shortcuts';

const on = (patch: Partial<TargetInfo>): TargetInfo => ({ ...BODY_TARGET, ...patch });

describe('shortcut mapping', () => {
  it('maps Space, arrows and 1–4 on the page body', () => {
    expect(mapKey({ key: ' ' }, BODY_TARGET)).toEqual({ type: 'togglePlay' });
    expect(mapKey({ key: 'ArrowRight' }, BODY_TARGET)).toEqual({ type: 'step', dir: 1 });
    expect(mapKey({ key: 'ArrowLeft' }, BODY_TARGET)).toEqual({ type: 'step', dir: -1 });
    expect(mapKey({ key: '1' }, BODY_TARGET)).toEqual({ type: 'mode', mode: 'overview' });
    expect(mapKey({ key: '2' }, BODY_TARGET)).toEqual({ type: 'mode', mode: 'leads' });
    expect(mapKey({ key: '3' }, BODY_TARGET)).toEqual({ type: 'mode', mode: 'section' });
    expect(mapKey({ key: '4' }, BODY_TARGET)).toEqual({ type: 'mode', mode: 'disease' });
    expect(mapKey({ key: '5' }, BODY_TARGET)).toBeNull();
    expect(mapKey({ key: 'a' }, BODY_TARGET)).toBeNull();
  });

  it('leaves native keyboard behaviour alone', () => {
    // form controls (range sliders use the arrows, text fields use everything)
    for (const tag of ['INPUT', 'TEXTAREA', 'SELECT'])
      for (const key of [' ', 'ArrowLeft', '1']) expect(mapKey({ key }, on({ tag }))).toBeNull();
    expect(mapKey({ key: ' ' }, on({ contentEditable: true }))).toBeNull();
    // Space already clicks buttons / links / summaries
    for (const tag of ['BUTTON', 'A', 'SUMMARY']) expect(mapKey({ key: ' ' }, on({ tag }))).toBeNull();
    expect(mapKey({ key: ' ' }, on({ tag: 'DIV', role: 'button' }))).toBeNull();
    // …but arrows and digits still work from a focused button
    expect(mapKey({ key: 'ArrowRight' }, on({ tag: 'BUTTON' }))).toEqual({ type: 'step', dir: 1 });
    expect(mapKey({ key: '3' }, on({ tag: 'BUTTON' }))).toEqual({ type: 'mode', mode: 'section' });
    // widgets with their own arrow keys (tour panel, radio groups) and modal dialogs
    expect(mapKey({ key: 'ArrowLeft' }, on({ inLocalKeys: true }))).toBeNull();
    expect(mapKey({ key: ' ' }, on({ inLocalKeys: true }))).toEqual({ type: 'togglePlay' });
    for (const key of [' ', 'ArrowLeft', '2']) expect(mapKey({ key }, on({ inModal: true }))).toBeNull();
  });

  it('ignores modified keys and Space auto-repeat', () => {
    expect(mapKey({ key: '1', ctrlKey: true }, BODY_TARGET)).toBeNull();
    expect(mapKey({ key: 'ArrowLeft', altKey: true }, BODY_TARGET)).toBeNull();
    expect(mapKey({ key: ' ', metaKey: true }, BODY_TARGET)).toBeNull();
    expect(mapKey({ key: ' ', repeat: true }, BODY_TARGET)).toBeNull();
    expect(mapKey({ key: 'ArrowRight', repeat: true }, BODY_TARGET)).toEqual({ type: 'step', dir: 1 });
  });

  it('dispatches through AppCommands', () => {
    const calls: [string, unknown[]][] = [];
    const commands = new Proxy({} as AppCommands, { get: (_t, k) => (...a: unknown[]) => calls.push([String(k), a]) });
    applyShortcut({ type: 'togglePlay' }, commands);
    applyShortcut({ type: 'step', dir: -1 }, commands);
    applyShortcut({ type: 'mode', mode: 'leads' }, commands);
    expect(calls).toEqual([
      ['togglePlay', []],
      ['stepPhase', [-1]],
      ['setMode', ['leads']],
    ]);
  });
});
