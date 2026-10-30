/**
 * The browser decoding path (DecompressionStream('deflate-raw'), data: URL bytes, the LRU-cached loader) run under Node,
 * which provides the same web APIs, and checked against node:zlib.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildRealEcg } from '../../src/real/decode';
import { dataUrlBytes, inflateRaw } from '../../src/real/inflate';
import { inflateRecord, rawMeta, signalsBin } from './bundle';

describe('browser byte helpers', () => {
  it('reads a base64 data: URL (how the single-file build inlines the bundle)', () => {
    const bin = signalsBin();
    const url = `data:application/octet-stream;base64,${Buffer.from(bin).toString('base64')}`;
    const bytes = dataUrlBytes(url)!;
    expect(bytes.length).toBe(bin.length);
    expect(Buffer.compare(Buffer.from(bytes), Buffer.from(bin))).toBe(0);
    expect(dataUrlBytes('/assets/ptbxl-signals.bin')).toBeNull();
  });

  it('inflates records with DecompressionStream exactly like node:zlib', async () => {
    const bin = signalsBin();
    for (const r of rawMeta.records.filter((_, i) => i % 25 === 0)) {
      const viaStream = await inflateRaw(bin.subarray(r.offset, r.offset + r.length));
      expect(Buffer.compare(Buffer.from(viaStream), Buffer.from(inflateRecord(r))), `record ${r.id}`).toBe(0);
    }
  });
});

describe('loadRealEcg (fetch → slice → inflate → decode, cached)', () => {
  const fetchMock = vi.fn(async () => new Response(new Uint8Array(signalsBin())));
  beforeAll(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('decodes a case, fetches the bundle once and caches decoded records', async () => {
    const { loadRealEcg } = await import('../../src/real/bundle');
    const [r0, r1] = [rawMeta.records[0], rawMeta.records[123]];
    const a = await loadRealEcg(r0.id);
    expect(a).toEqual(buildRealEcg(r0.id, inflateRecord(r0), rawMeta));
    const b = await loadRealEcg(r1.id);
    expect(b.origin).toEqual({ kind: 'real', dataset: 'PTB-XL', ecgId: r1.id });
    expect(await loadRealEcg(r0.id)).toBe(a); // cache hit: same object
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('hands out a decoded record synchronously once it is cached (no placeholder flash on prev / next)', async () => {
    const { loadRealEcg, peekRealEcg } = await import('../../src/real/bundle');
    const r = rawMeta.records[200];
    expect(peekRealEcg(r.id)).toBeNull();
    const pending = loadRealEcg(r.id);
    expect(peekRealEcg(r.id)).toBeNull(); // still decoding
    const ecg = await pending;
    expect(peekRealEcg(r.id)).toBe(ecg);
    expect(peekRealEcg(-5)).toBeNull();
  });

  it('rejects an unknown case id', async () => {
    const { loadRealEcg } = await import('../../src/real/bundle');
    await expect(loadRealEcg(-5)).rejects.toThrow(/unknown case/);
  });

  it('knows whether the platform can decode', async () => {
    const { canDecodeRealEcg } = await import('../../src/real/bundle');
    expect(canDecodeRealEcg()).toBe(true);
    vi.stubGlobal('DecompressionStream', undefined);
    expect(canDecodeRealEcg()).toBe(false);
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', fetchMock);
  });
});
