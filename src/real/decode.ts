/**
 * Pure decoding core of the real-ECG bundle (no browser or Vite APIs — the tests drive it with node:zlib).
 * Format (scripts/data/build-real-bundle.mjs): per record, the stored leads (I, II, V1–V6) one after another; per lead a
 * zigzag varint of the first sample followed by zigzag varints of successive differences, in quanta of `quantumMv`.
 * Each record is deflate-raw compressed on its own; inflating is the caller's job.
 */
import type { Ecg, LeadSignals } from '../core/ecg';
import { deriveLimbLeads } from '../core/leads';

export const STORED_LEADS = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;
export type StoredLead = (typeof STORED_LEADS)[number];

export interface SignalFormat {
  readonly fs: number;
  /** samples per lead */
  readonly samples: number;
  readonly quantumMv: number;
  readonly leads: readonly string[];
}

/**
 * Decode the inflated bytes of one record into one Float32Array (mV) per stored lead.
 * Throws when the stream ends early or leaves trailing bytes (both mean a corrupt or mismatched bundle).
 */
export function decodeStoredLeads(bytes: Uint8Array, fmt: SignalFormat): Float32Array[] {
  const nLeads = fmt.leads.length;
  const n = fmt.samples;
  const out: Float32Array[] = [];
  let p = 0;
  const len = bytes.length;
  for (let li = 0; li < nLeads; li++) {
    const arr = new Float32Array(n);
    let q = 0;
    for (let j = 0; j < n; j++) {
      // unsigned LEB128 varint; arithmetic (not bit ops) so values above 2^31 cannot wrap
      let u = 0;
      let mul = 1;
      let b: number;
      do {
        if (p >= len) throw new Error(`real-ecg decode: stream ended at lead ${li}, sample ${j}`);
        b = bytes[p++];
        u += (b & 0x7f) * mul;
        mul *= 128;
      } while (b & 0x80);
      const v = u % 2 === 0 ? u / 2 : -(u + 1) / 2; // zigzag
      q = j === 0 ? v : q + v;
      arr[j] = q * fmt.quantumMv;
    }
    out.push(arr);
  }
  if (p !== len) throw new Error(`real-ecg decode: ${len - p} trailing bytes`);
  return out;
}

/** All 12 standard leads: stored I, II, V1–V6 plus III, aVR, aVL, aVF derived exactly (Einthoven / Goldberger). */
export function assembleLeads(stored: readonly Float32Array[], fmt: SignalFormat): LeadSignals {
  const get = (name: StoredLead): Float32Array => {
    const i = fmt.leads.indexOf(name);
    if (i < 0 || !stored[i]) throw new Error(`real-ecg decode: lead ${name} missing`);
    return stored[i];
  };
  const I = get('I');
  const II = get('II');
  const { III, aVR, aVL, aVF } = deriveLimbLeads(I, II);
  return { I, II, III, aVR, aVL, aVF, V1: get('V1'), V2: get('V2'), V3: get('V3'), V4: get('V4'), V5: get('V5'), V6: get('V6') };
}

/** The Ecg of a real case: no model truth, no 3D regions. */
export function buildRealEcg(ecgId: number, inflated: Uint8Array, fmt: SignalFormat): Ecg {
  const leads = assembleLeads(decodeStoredLeads(inflated, fmt), fmt);
  return {
    origin: { kind: 'real', dataset: 'PTB-XL', ecgId },
    signal: { fs: fmt.fs, durationMs: (fmt.samples * 1000) / fmt.fs, leads },
    truth: null,
    regions: null,
  };
}
