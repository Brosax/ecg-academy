/**
 * Clicking a trace freezes the heart at that instant (pause before seek) and highlights the responsible structures;
 * resuming playback clears only the highlight the ECG view set itself (tour / scenario highlights survive).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppCommands } from '../../../src/lab/app/commands';
import { store } from '../../../src/lab/app/store';
import { ClickFocus, pickResponsible } from '../../../src/lab/ecg/clickFocus';
import type { SimEngine, StructureId } from '../../../src/lab/sim/types';

const RESPONSIBLE = [
  { id: 'LV_ANTERIOR', w: 1 }, { id: 'SEPTUM', w: 0.9 }, { id: 'LV_LATERAL', w: 0.8 }, { id: 'RV_FREE', w: 0.7 },
  { id: 'LV_APEX', w: 0.6 }, { id: 'LA', w: 0.2 },
] as const;

function fakeCommands(calls: string[]): AppCommands {
  return {
    pause() { calls.push('pause'); store.playing.value = false; },
    seek(t) { calls.push(`seek:${t}`); store.time.value = t; },
    selectLead(l) { calls.push(`lead:${l}`); store.selectedLead.value = l; },
    highlight(ids) { calls.push(`highlight:${ids.join(',')}`); store.highlight.value = ids; },
    clearHighlight() { calls.push('clear'); store.highlight.value = []; },
  } as Partial<AppCommands> as AppCommands;
}
const engine = { responsible: () => RESPONSIBLE } as unknown as Pick<SimEngine, 'responsible'>;

describe('click on a trace', () => {
  let calls: string[];
  let cf: ClickFocus;
  beforeEach(() => {
    store.playing.value = true;
    store.highlight.value = [];
    calls = [];
    cf = new ClickFocus(fakeCommands(calls), engine);
  });
  afterEach(() => cf.dispose());

  it('picks at most four structures carrying ≥ 50 % of the activity', () => {
    expect(pickResponsible(RESPONSIBLE)).toEqual(['LV_ANTERIOR', 'SEPTUM', 'LV_LATERAL', 'RV_FREE']);
    expect(pickResponsible([{ id: 'LA', w: 0.2 }])).toEqual([]);
  });

  it('pauses before seeking, selects the lead and highlights the responsible structures', () => {
    cf.focus(1234, 'V1');
    expect(calls).toEqual(['pause', 'seek:1234', 'lead:V1', 'highlight:LV_ANTERIOR,SEPTUM,LV_LATERAL,RV_FREE']);
    expect(store.playing.value).toBe(false);
    expect(store.time.value).toBe(1234);
  });

  it('a strip click does not change the selected lead', () => {
    store.selectedLead.value = 'II';
    cf.focus(500);
    expect(calls.some((c) => c.startsWith('lead:'))).toBe(false);
    expect(store.selectedLead.value).toBe('II');
  });

  it('clears its own highlight when playback resumes, and only once', () => {
    cf.focus(1000);
    expect(store.highlight.value).toHaveLength(4);
    store.playing.value = true;
    expect(calls.at(-1)).toBe('clear');
    expect(store.highlight.value).toEqual([]);
    const n = calls.length;
    store.playing.value = false;
    store.playing.value = true;
    expect(calls.length).toBe(n);
  });

  it('never clears a highlight it did not set (tour / scenario)', () => {
    const tour: readonly StructureId[] = ['SA', 'RA'];
    store.playing.value = false;
    store.highlight.value = tour; // tour: highlight, then play — no ECG click in between
    store.playing.value = true;
    expect(store.highlight.value).toBe(tour);

    cf.focus(1000); // ECG click…
    store.highlight.value = tour; // …then the tour takes over the highlight before playback resumes
    store.playing.value = true;
    expect(store.highlight.value).toBe(tour);
    expect(calls).not.toContain('clear');
  });

  it('constructing while playing does not touch an existing highlight (the immediate subscribe call is ignored)', () => {
    const tour: readonly StructureId[] = ['AVN'];
    store.highlight.value = tour;
    const other = new ClickFocus(fakeCommands(calls), engine);
    expect(store.highlight.value).toBe(tour);
    other.dispose();
  });

  it('stops listening after dispose', () => {
    cf.focus(1000);
    const own = store.highlight.value;
    cf.dispose();
    store.playing.value = true;
    expect(store.highlight.value).toBe(own);
    expect(calls).not.toContain('clear');
  });
});
