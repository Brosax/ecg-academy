/**
 * Annotation marks (EcgMark), lead highlights and locate pins resolved onto sheet panels — pure, unit-tested.
 * A mark on lead X appears in every panel that shows X (e.g. the II cell and the II rhythm strip); lead 'all' means
 * every panel. Voltages in marks are true lead voltages; inverted panels (−aVR) draw them negated via yOfMv.
 */
import type { L10n } from '../core/l10n';
import type { Lead } from '../core/leads';
import type { EcgMark, EcgPin, MarkColor } from './api';
import { inPanelTime, type Panel, type Sheet } from './layout';
import type { Token } from './theme';

export const MARK_TOKEN: Readonly<Record<MarkColor, Token>> = {
  atrial: 'c-atrial',
  qrs: 'c-qrs',
  repol: 'c-repol',
  injury: 'c-injury',
  vector: 'c-vector',
  highlight: 'c-highlight',
  ok: 'ok',
  err: 'err',
};

export const PIN_TOKEN: Readonly<Record<EcgPin['tone'], Token>> = {
  answer: 'c-vector',
  correct: 'ok',
  wrong: 'err',
};

export const markToken = (c: MarkColor | undefined): Token => MARK_TOKEN[c ?? 'highlight'];

const overlaps = (p: Panel, t0: number, t1: number): boolean => Math.max(p.t0, Math.min(t0, t1)) <= Math.min(p.t1, Math.max(t0, t1));

/** Does a mark draw anything in this panel? */
export function markInPanel(m: EcgMark, p: Panel): boolean {
  if (m.lead !== 'all' && m.lead !== p.lead) return false;
  switch (m.kind) {
    case 'bracket':
    case 'region':
      return overlaps(p, m.t0, m.t1);
    case 'wave':
    case 'arrow':
      return inPanelTime(p, m.t);
    case 'hline':
      return m.t0 === undefined || m.t1 === undefined ? true : overlaps(p, m.t0, m.t1);
    case 'lead':
      return true;
  }
}

/** Marks to draw in each panel (index = panel index). */
export function marksByPanel(s: Sheet, marks: readonly EcgMark[]): EcgMark[][] {
  return s.panels.map((p) => marks.filter((m) => markInPanel(m, p)));
}

export interface PanelHighlight {
  readonly panel: number;
  readonly color: Token;
  readonly label?: L10n | string;
}

/** Panels to highlight: highlightLeads (highlight colour) plus 'lead' marks (their colour and label). */
export function highlightedPanels(s: Sheet, highlightLeads: readonly Lead[], marks: readonly EcgMark[]): PanelHighlight[] {
  const out: PanelHighlight[] = [];
  for (const p of s.panels) {
    const m = marks.find((x): x is Extract<EcgMark, { kind: 'lead' }> => x.kind === 'lead' && x.lead === p.lead);
    if (m) out.push({ panel: p.index, color: markToken(m.color), label: m.label });
    else if (highlightLeads.includes(p.lead)) out.push({ panel: p.index, color: 'c-highlight' });
  }
  return out;
}

/** Pins located in panels: one entry per panel that shows the pin's lead at its time. */
export function pinsByPanel(s: Sheet, pins: readonly EcgPin[]): { panel: Panel; pin: EcgPin }[] {
  const out: { panel: Panel; pin: EcgPin }[] = [];
  for (const pin of pins) for (const p of s.panels) if (p.lead === pin.lead && inPanelTime(p, pin.tMs)) out.push({ panel: p, pin });
  return out;
}
