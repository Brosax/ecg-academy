/**
 * Screen-reader description of the keyboard of one sheet: only the keys that work with the features this instance
 * offers (click mode and available tools), so `tools: false` never advertises C / A / R / M / X.
 */
import type { Lang } from '../core/l10n';
import { te } from '../i18n/ecg';
import type { CaliperNumbers, ToolAvail } from './interact';

/** What Enter / a click does: report a pick (locate mode), move the shared cursor, or nothing. */
export type ClickMode = 'pick' | 'cursor' | 'none';

export function keyHelp(lang: Lang, avail: ToolAvail, click: ClickMode): string {
  const parts: string[] = [te.in(lang, click === 'cursor' ? 'keysMoveCursor' : 'keysMovePoint')];
  if (click === 'pick') parts.push(te.in(lang, 'keysPick'));
  const keys: string[] = [];
  if (avail.calipers) keys.push(te.in(lang, 'keyC'), te.in(lang, 'keyA'), te.in(lang, 'keyR'));
  if (avail.magnifier) keys.push(te.in(lang, 'keyM'));
  if (avail.crosshair) keys.push(te.in(lang, 'keyX'));
  if (keys.length) parts.push(te.in(lang, 'keysTools', { list: keys.join(te.in(lang, 'listSep')) }));
  if (avail.calipers) parts.push(te.in(lang, 'keysCalipers'));
  return parts.join(te.in(lang, 'sentenceSep'));
}

/** What a screen reader hears after the calipers moved: the interval (and the rate when it is a cycle) or the voltage. */
export function caliperAnnouncement(lang: Lang, n: CaliperNumbers): string {
  const [a = '', b = '', c = ''] = n.values;
  if (n.mode === 'amplitude') return te.in(lang, 'announceAmplitude', { mv: a, mm: b });
  return n.rate ? te.in(lang, 'announceCalipers', { ms: a, sq: b, bpm: c }) : te.in(lang, 'announceCalipersNoRate', { ms: a, sq: b });
}
