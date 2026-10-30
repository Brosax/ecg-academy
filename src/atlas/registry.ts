/**
 * The atlas registry: every entry file in ./entries (each exports `entries: readonly AtlasEntry[]`, see schema.ts) is
 * collected at build time with import.meta.glob, so other workstreams add a category by adding a file. Pure (no DOM).
 */
import { FINDING_LIST, type FindingId } from '../core/findings';
import type { AtlasEntry } from './schema';

type EntryModule = { readonly entries?: readonly AtlasEntry[] };

const modules = import.meta.glob<EntryModule>('./entries/*.ts', { eager: true });

const ORDER = new Map<string, number>(FINDING_LIST.map((d, i) => [d.id, i]));

function collect(): { list: AtlasEntry[]; byId: Map<FindingId, AtlasEntry>; duplicates: string[] } {
  const byId = new Map<FindingId, AtlasEntry>();
  const duplicates: string[] = [];
  for (const path of Object.keys(modules).sort()) {
    for (const e of modules[path].entries ?? []) {
      if (byId.has(e.id)) duplicates.push(`${e.id} (${path})`);
      else byId.set(e.id, e);
    }
  }
  const list = [...byId.values()].sort((a, b) => (ORDER.get(a.id) ?? 1e9) - (ORDER.get(b.id) ?? 1e9));
  return { list, byId, duplicates };
}

const REG = collect();

/** All entries in taxonomy order. */
export function allEntries(): readonly AtlasEntry[] {
  return REG.list;
}

/** The entry of a finding, or undefined while its category's entries are not written yet. */
export function entryOf(id: FindingId): AtlasEntry | undefined {
  return REG.byId.get(id);
}

export function hasEntry(id: FindingId): boolean {
  return REG.byId.has(id);
}

/** Entry ids defined in more than one file (must be empty; checked by tests). */
export function duplicateEntries(): readonly string[] {
  return REG.duplicates;
}

/** Which entry file each id comes from (tests: an entry lives in the file of its category). */
export function entrySources(): ReadonlyMap<FindingId, string> {
  const m = new Map<FindingId, string>();
  for (const path of Object.keys(modules).sort()) {
    for (const e of modules[path].entries ?? []) if (!m.has(e.id)) m.set(e.id, path);
  }
  return m;
}
