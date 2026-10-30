/**
 * The curated PTB-XL records shipped in src/data/real (300 records, 500 Hz, 10 s) with their GE 12SL reference
 * measurements (PTB-XL+), for validating the oracle on real ECGs (DECISION §8.1). Node-only (tests and dev scripts).
 * Data: PTB-XL v1.0.3 (Wagner P et al., Sci Data 2020) and PTB-XL+ v1.0.1 (Strodthoff N et al., Sci Data 2023),
 * PhysioNet, CC BY 4.0.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import type { LeadSignals } from '../../../src/core/ecg';
import { assembleLeads, decodeStoredLeads, type SignalFormat } from '../../../src/real/decode';

export interface RealRef {
  readonly hrBpm: number | null;
  readonly prMs: number | null;
  readonly qrsMs: number | null;
  readonly qtMs: number | null;
  readonly qrsAxisDeg: number | null;
  readonly pAxisDeg: number | null;
  readonly tAxisDeg: number | null;
}

export interface RealRecord {
  readonly id: number;
  readonly cls: string;
  readonly codes: Readonly<Record<string, number>>;
  readonly ref: RealRef;
}

interface Meta extends SignalFormat {
  readonly records: readonly (RealRecord & { readonly offset: number; readonly length: number })[];
}

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
let meta: Meta | null = null;
let bin: Uint8Array | null = null;

export function realMeta(): Meta {
  meta ??= JSON.parse(readFileSync(`${ROOT}src/data/real/ptbxl-meta.json`, 'utf8')) as Meta;
  return meta;
}

export function realRecords(): readonly RealRecord[] {
  return realMeta().records;
}

export function realLeads(id: number): { fs: number; leads: LeadSignals } {
  const m = realMeta();
  bin ??= new Uint8Array(readFileSync(`${ROOT}src/data/real/ptbxl-signals.bin`));
  const r = m.records.find((x) => x.id === id);
  if (!r) throw new Error(`no real record ${id}`);
  const stored = decodeStoredLeads(new Uint8Array(inflateRawSync(bin.subarray(r.offset, r.offset + r.length))), m);
  return { fs: m.fs, leads: assembleLeads(stored, m) };
}

/** First real record of a teaching class (gallery comparisons). */
export function realOfClass(cls: string): RealRecord | null {
  return realMeta().records.find((r) => r.cls === cls) ?? null;
}
