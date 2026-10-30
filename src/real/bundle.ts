/**
 * Browser side of the real-ECG bundle: the .bin is imported with Vite '?url' (inlined as a data: URL in the single-file
 * build), read into memory once, sliced per record, inflated with DecompressionStream('deflate-raw') and decoded by the
 * pure core (decode.ts). Decoded ECGs are kept in a small LRU cache (the promise is cached, so a fast double click
 * never decodes twice).
 */
import type { Ecg } from '../core/ecg';
import signalsUrl from '../data/real/ptbxl-signals.bin?url';
import { buildRealEcg } from './decode';
import { dataUrlBytes, inflateRaw } from './inflate';
import { getCase, rawMeta } from './library';
import { LruCache } from './lru';

const CACHE_SIZE = 20;
const cache = new LruCache<number, Promise<Ecg>>(CACHE_SIZE);
/** Records already decoded, readable synchronously (a cached case renders its tracing on the first frame). */
const decoded = new LruCache<number, Ecg>(CACHE_SIZE);
let bundle: Promise<Uint8Array> | null = null;

/** The whole signals file, loaded once. A data: URL is decoded directly (no fetch — robust under strict CSPs). */
function loadBundle(): Promise<Uint8Array> {
  if (!bundle) {
    const url: string = signalsUrl;
    bundle = (async () => {
      const inline = dataUrlBytes(url);
      if (inline) return inline;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`real-ecg bundle: HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    })();
    bundle.catch(() => {
      bundle = null; // allow a retry
    });
  }
  return bundle;
}

/** Decode one real case (PTB-XL ecg_id) into an Ecg: 12 leads at 250 Hz, 10 s, truth null, regions null. */
export function loadRealEcg(id: number): Promise<Ecg> {
  const hit = cache.get(id);
  if (hit) return hit;
  const c = getCase(id);
  if (!c) return Promise.reject(new Error(`real-ecg: unknown case ${id}`));
  const p = (async () => {
    const all = await loadBundle();
    const slice = all.subarray(c.offset, c.offset + c.length);
    const inflated = await inflateRaw(slice);
    return buildRealEcg(id, inflated, rawMeta);
  })();
  cache.set(id, p);
  p.then(
    (ecg) => decoded.set(id, ecg),
    () => cache.delete(id),
  );
  return p;
}

/** The decoded Ecg of a case when it is already in the cache (no work, no waiting); null otherwise. */
export function peekRealEcg(id: number): Ecg | null {
  return decoded.get(id) ?? null;
}

/** Can this browser decode the bundle (DecompressionStream with 'deflate-raw')? */
export function canDecodeRealEcg(): boolean {
  return typeof DecompressionStream !== 'undefined';
}

/** Warm the cache for a case the learner is likely to open next (errors are ignored). */
export function prefetchRealEcg(id: number): void {
  loadRealEcg(id).catch(() => undefined);
}
