import { describe, expect, it } from 'vitest';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { STD_LEADS } from '../../src/core/leads';
import { assembleLeads, buildRealEcg, decodeStoredLeads, STORED_LEADS, type SignalFormat } from '../../src/real/decode';
import { inflateRecord, rawMeta, signalsBin } from './bundle';

/** Encoder mirroring scripts/data/build-real-bundle.mjs (zigzag varint of the first sample, then of differences). */
function encode(leads: readonly (readonly number[])[]): Uint8Array {
  const out: number[] = [];
  const push = (v: number) => {
    let u = v >= 0 ? v * 2 : -v * 2 - 1;
    while (u >= 0x80) {
      out.push((u & 0x7f) | 0x80);
      u = Math.floor(u / 128);
    }
    out.push(u);
  };
  for (const q of leads) q.forEach((x, j) => push(j === 0 ? x : x - q[j - 1]));
  return new Uint8Array(out);
}

describe('real-ECG bundle format', () => {
  it('has the documented header', () => {
    expect(rawMeta.fs).toBe(250);
    expect(rawMeta.samples).toBe(2500);
    expect(rawMeta.quantumMv).toBe(0.005);
    expect(rawMeta.leads).toEqual([...STORED_LEADS]);
  });

  it('holds 300 records with unique ids and contiguous byte ranges covering the whole file', () => {
    expect(rawMeta.records).toHaveLength(300);
    expect(new Set(rawMeta.records.map((r) => r.id)).size).toBe(300);
    let offset = 0;
    for (const r of rawMeta.records) {
      expect(r.offset).toBe(offset);
      expect(r.length).toBeGreaterThan(0);
      offset += r.length;
    }
    expect(offset).toBe(signalsBin().length);
  });
});

describe('decodeStoredLeads (pure core)', () => {
  const fmt: SignalFormat = { fs: 250, samples: 4, quantumMv: 0.005, leads: ['A', 'B'] };

  it('round-trips zigzag varints, including negative and multi-byte values', () => {
    const a = [0, 1, -1, 200];
    const b = [-40000, 40000, 63, -64];
    const [da, db] = decodeStoredLeads(encode([a, b]), fmt);
    expect(Array.from(da)).toEqual(a.map((q) => Math.fround(q * 0.005)));
    expect(Array.from(db)).toEqual(b.map((q) => Math.fround(q * 0.005)));
  });

  it('rejects truncated streams and trailing bytes', () => {
    const bytes = encode([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ]);
    expect(() => decodeStoredLeads(bytes.subarray(0, bytes.length - 1), fmt)).toThrow(/ended/);
    const longer = new Uint8Array(bytes.length + 1);
    longer.set(bytes);
    expect(() => decodeStoredLeads(longer, fmt)).toThrow(/trailing/);
  });

  it('assembles 12 leads from a deflate-raw record (stored leads kept, limb leads derived)', () => {
    const fmt3: SignalFormat = { ...fmt, samples: 3, leads: [...STORED_LEADS] };
    const leads = STORED_LEADS.map((_, i) => [i, -i * 3, i * 1000]);
    const packed = deflateRawSync(Buffer.from(encode(leads)));
    const all = assembleLeads(decodeStoredLeads(new Uint8Array(inflateRawSync(packed)), fmt3), fmt3);
    expect(Object.keys(all).sort()).toEqual([...STD_LEADS].sort());
    expect(Array.from(all.V6)).toEqual([7, -21, 7000].map((q) => Math.fround(q * 0.005)));
    expect(Array.from(all.III)).toEqual([0, 1, 2].map((k) => Math.fround(all.II[k] - all.I[k])));
  });

  it('reports a missing stored lead', () => {
    const fmt1: SignalFormat = { ...fmt, samples: 1, leads: ['I', 'II'] };
    expect(() => assembleLeads(decodeStoredLeads(encode([[1], [2]]), fmt1), fmt1)).toThrow(/V1 missing/);
  });
});

describe('every shipped record', () => {
  const ecgs = rawMeta.records.map((r) => ({ r, ecg: buildRealEcg(r.id, inflateRecord(r), rawMeta) }));

  it('decodes all 300 records', () => {
    expect(ecgs).toHaveLength(300);
  });

  it('is a real-origin Ecg with no model truth and no 3D regions', () => {
    for (const { r, ecg } of ecgs) {
      expect(ecg.origin).toEqual({ kind: 'real', dataset: 'PTB-XL', ecgId: r.id });
      expect(ecg.truth).toBeNull();
      expect(ecg.regions).toBeNull();
      expect(ecg.signal.fs).toBe(250);
      expect(ecg.signal.durationMs).toBe(10_000);
    }
  });

  it('has all 12 standard leads, 2500 finite samples each, on the 5 µV grid and within a physiological range', () => {
    for (const { ecg } of ecgs) {
      for (const lead of STD_LEADS) {
        const x = ecg.signal.leads[lead];
        expect(x).toBeInstanceOf(Float32Array);
        expect(x.length).toBe(2500);
        for (let k = 0; k < x.length; k++) {
          if (!Number.isFinite(x[k]) || Math.abs(x[k]) > 25) throw new Error(`${lead}[${k}] = ${x[k]}`);
        }
      }
      for (const lead of STORED_LEADS) {
        const x = ecg.signal.leads[lead];
        for (let k = 0; k < x.length; k += 97) {
          const q = x[k] / 0.005;
          expect(Math.abs(q - Math.round(q))).toBeLessThan(1e-3);
        }
      }
    }
  });

  it('obeys Einthoven and Goldberger exactly (derived limb leads)', () => {
    for (const { ecg } of ecgs) {
      const { I, II, III, aVR, aVL, aVF } = ecg.signal.leads;
      for (let k = 0; k < I.length; k++) {
        const a = I[k], b = II[k];
        if (
          III[k] !== Math.fround(b - a) ||
          aVR[k] !== Math.fround(-(a + b) / 2) ||
          aVL[k] !== Math.fround(a - b / 2) ||
          aVF[k] !== Math.fround(b - a / 2)
        ) {
          throw new Error(`identity broken at sample ${k}`);
        }
        // Einthoven's law and the zero sum of the augmented leads, to float32 precision
        if (Math.abs(I[k] + III[k] - II[k]) > 1e-5 || Math.abs(aVR[k] + aVL[k] + aVF[k]) > 1e-5) throw new Error(`sum broken at ${k}`);
      }
    }
  });

  it('carries a visible signal in every lead (no flat lines)', () => {
    for (const { r, ecg } of ecgs) {
      for (const lead of STD_LEADS) {
        const x = ecg.signal.leads[lead];
        let lo = Infinity, hi = -Infinity;
        for (const v of x) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        if (hi - lo < 0.05) throw new Error(`record ${r.id} lead ${lead} is flat (${(hi - lo).toFixed(3)} mV)`);
      }
    }
  });
});
