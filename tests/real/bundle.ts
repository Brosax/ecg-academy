/** Test helpers: the shipped bundle read from disk and inflated with node:zlib (the browser uses DecompressionStream). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';
import { rawMeta, type RawRecord } from '../../src/real/library';

const BIN = fileURLToPath(new URL('../../src/data/real/ptbxl-signals.bin', import.meta.url));

let bin: Uint8Array | null = null;

export function signalsBin(): Uint8Array {
  if (!bin) bin = new Uint8Array(readFileSync(BIN));
  return bin;
}

export function inflateRecord(r: Pick<RawRecord, 'offset' | 'length'>): Uint8Array {
  const all = signalsBin();
  return new Uint8Array(inflateRawSync(all.subarray(r.offset, r.offset + r.length)));
}

export { rawMeta };
