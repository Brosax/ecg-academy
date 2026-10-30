/**
 * In-memory UI state of the atlas: the index filters survive a visit to a finding page and back (not persisted —
 * a fresh visit starts unfiltered).
 */
import { signal } from '@preact/signals';
import { NO_ATLAS_FILTER, type AtlasFilter } from './search';

export const atlasFilter = signal<AtlasFilter>(NO_ATLAS_FILTER);

export function patchFilter(p: Partial<AtlasFilter>): void {
  atlasFilter.value = { ...atlasFilter.value, ...p };
}
