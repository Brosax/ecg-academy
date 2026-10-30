/**
 * Runtime loader of the baked HRA heart (src/assets/heart-hra.bin = gzip of the codec.ts layout). The browser build
 * inlines the asset as a base64 data URL (Vite `?url&inline`: plain `?inline` needs a known asset extension and
 * vite.config is frozen; single-file build) and inflates it with
 * DecompressionStream('gzip'); Node tests pass the file bytes instead (DecompressionStream exists in Node too).
 * Fields are stored quantized, so loading is decode only (no field derivation at runtime).
 */
import type { GeometryBundle } from '../../types';
import { decodeHraBundle } from './codec';

export type GeometryProgress = (progress: number, label: string) => void;

async function gunzip(gz: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([gz as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Decodes the inlined base64 data URL directly. No fetch(): a published Artifact's CSP blocks fetch/XHR, including
 * data: URLs, which would silently drop the app to the stub geometry.
 */
async function assetBytes(): Promise<Uint8Array> {
  const { default: url } = await import('../../../assets/heart-hra.bin?url&inline');
  const comma = url.indexOf(',');
  if (!url.startsWith('data:') || comma < 0 || !url.slice(0, comma).endsWith(';base64')) {
    throw new Error('heart asset is not an inlined base64 data URL');
  }
  const bin = atob(url.slice(comma + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Loads the realistic heart. `gz` (the asset file bytes) skips the inlined asset — Node tests and tools.
 * Progress labels: 'geometry'.
 */
export async function loadHraGeometry(onProgress?: GeometryProgress, gz?: Uint8Array): Promise<GeometryBundle> {
  onProgress?.(0, 'geometry');
  const packed = gz ?? (await assetBytes());
  onProgress?.(0.3, 'geometry');
  const raw = await gunzip(packed);
  onProgress?.(0.6, 'geometry');
  const bundle = decodeHraBundle(raw);
  onProgress?.(1, 'geometry');
  return bundle;
}
