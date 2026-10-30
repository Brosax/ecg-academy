/**
 * Browser-side byte helpers of the real-ECG bundle, free of Vite imports so they run under Node too (Node ≥ 18 has
 * DecompressionStream, atob, Blob and Response): data-URL decoding and deflate-raw inflation.
 */

/** Bytes of a base64 data: URL (the single-file build inlines the .bin this way); null for any other URL. */
export function dataUrlBytes(url: string): Uint8Array | null {
  const m = /^data:[^,]*;base64,/.exec(url);
  if (!m) return null;
  const bin = atob(url.slice(m[0].length));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Inflate one deflate-raw record with the platform DecompressionStream. */
export async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('DecompressionStream is not supported');
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
